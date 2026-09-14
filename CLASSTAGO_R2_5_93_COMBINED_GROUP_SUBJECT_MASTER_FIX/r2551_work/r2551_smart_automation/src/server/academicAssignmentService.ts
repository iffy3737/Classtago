import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const text = (value: unknown) => String(value ?? '').trim();
const norm = (value: unknown) => text(value).toLowerCase().replace(/\s+/g, ' ');
const personNorm = (value: unknown) => norm(value)
  .replace(/[.,'’`]/g, ' ')
  .replace(/\b(mr|mrs|miss|ms|dr|prof|shri|smt|sir|madam)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const yearKey = (value: unknown) => {
  const digits = text(value).replace(/\D/g, '');
  return digits.length >= 8 ? `${digits.slice(0, 4)}${digits.slice(-2)}` : digits;
};
const active = (row: any) => row?.isActive !== false && row?.is_active !== false && row?.active !== false;

async function rows(db: SupabaseClient, table: string, schoolId: string, columns = '*') {
  const { data, error } = await db.from(table).select(columns).eq('school_id', schoolId);
  if (error) throw new Error(error.message || `${table} could not be loaded.`);
  return (data || []) as any[];
}

async function currentYears(db: SupabaseClient, schoolId: string) {
  const schoolYears = await rows(db, 'school_academic_years', schoolId, '*');
  const current = schoolYears.find((row: any) => row.is_active === true) || schoolYears[0] || null;
  if (!current) throw new Error('No active Academic Year exists in Academic Setup.');
  return { rows: schoolYears, current };
}

function resolveYear(yearRows: any[], requested: unknown, fallback: any) {
  const key = yearKey(requested);
  if (!key) return fallback;
  return yearRows.find((row: any) => yearKey(row.year_code || row.year_name || row.name) === key) || fallback;
}

function resolveTeacher(teachers: any[], teacherId: unknown, teacherName: unknown) {
  const id = text(teacherId);
  const name = personNorm(teacherName);
  return teachers.find((row: any) => id && (String(row.id) === id || String(row.user_id || '') === id || String(row.employee_id || '') === id || String(row.shalarth_id || '') === id))
    || teachers.find((row: any) => name && personNorm(row.full_name) === name)
    || null;
}

function resolveNamed(source: any[], name: unknown, keys: string[]) {
  const wanted = norm(name);
  if (!wanted) return null;
  return source.find((row: any) => keys.some(key => norm(row[key]) === wanted)) || null;
}

function isNoDivision(value: unknown) {
  const n = norm(value);
  return !n || n === 'all' || n === 'none' || n === 'no division' || n === 'no-div' || n === '-';
}

function setupSubjectRow(row: any, maps: { teachers: Map<string, any>; classes: Map<string, any>; divisions: Map<string, any>; subjects: Map<string, any>; years: Map<string, any> }) {
  const teacher = maps.teachers.get(String(row.teacher_id));
  const cls = maps.classes.get(String(row.class_id));
  const div = row.division_id ? maps.divisions.get(String(row.division_id)) : null;
  const subject = maps.subjects.get(String(row.subject_id));
  const year = maps.years.get(String(row.academic_year_id));
  return {
    id: row.legacy_source_id || row.id,
    cloudId: row.id,
    academicYear: year?.year_code || 'Current Academic Year',
    teacherId: teacher?.user_id || teacher?.id || row.teacher_id,
    teacherRecordId: teacher?.id || row.teacher_id,
    teacherName: teacher?.full_name || 'Teacher',
    className: cls?.class_name || 'Assigned Class',
    divisionName: div?.division_name || 'No Division',
    subjectName: subject?.subject_name || 'Assigned Subject',
    weeklyPeriods: Number(row.weekly_periods || 0),
    isActive: row.is_active !== false,
    source: 'cloud',
  };
}

function setupClassTeacherRow(row: any, maps: { teachers: Map<string, any>; classes: Map<string, any>; divisions: Map<string, any>; years: Map<string, any> }) {
  const teacher = maps.teachers.get(String(row.teacher_id));
  const cls = maps.classes.get(String(row.class_id));
  const div = row.division_id ? maps.divisions.get(String(row.division_id)) : null;
  const year = maps.years.get(String(row.academic_year_id));
  return {
    id: row.legacy_source_id || row.id,
    cloudId: row.id,
    academicYear: year?.year_code || 'Current Academic Year',
    teacherId: teacher?.user_id || teacher?.id || row.teacher_id,
    teacherRecordId: teacher?.id || row.teacher_id,
    teacherName: teacher?.full_name || 'Teacher',
    className: cls?.class_name || 'Assigned Class',
    divisionName: div?.division_name || 'No Division',
    isActive: row.is_active !== false,
    source: 'cloud',
  };
}

export async function loadAcademicAssignmentCloud(db: SupabaseClient, schoolId: string) {
  const [teachers, classes, divisions, subjects, yearsInfo, subjectRows, classRows, syncStateRows] = await Promise.all([
    rows(db, 'teachers', schoolId, 'id,user_id,full_name,employee_id,shalarth_id,is_active'),
    rows(db, 'school_classes', schoolId, 'id,class_name,is_active'),
    rows(db, 'school_divisions', schoolId, 'id,division_name,is_active'),
    rows(db, 'subjects', schoolId, 'id,subject_name,subject_code,is_active'),
    currentYears(db, schoolId),
    rows(db, 'school_subject_teacher_assignments', schoolId, '*'),
    rows(db, 'school_class_teacher_assignments', schoolId, '*'),
    rows(db, 'school_academic_assignment_sync_state', schoolId, '*'),
  ]);

  const maps = {
    teachers: new Map(teachers.map(row => [String(row.id), row])),
    classes: new Map(classes.map(row => [String(row.id), row])),
    divisions: new Map(divisions.map(row => [String(row.id), row])),
    subjects: new Map(subjects.map(row => [String(row.id), row])),
    years: new Map(yearsInfo.rows.map(row => [String(row.id), row])),
  };
  const currentYearId = String(yearsInfo.current.id);
  const relevantSubjects = subjectRows.filter(row => String(row.academic_year_id) === currentYearId);
  const relevantClasses = classRows.filter(row => String(row.academic_year_id) === currentYearId);

  const initialized = syncStateRows.some(row => String(row.academic_year_id) === currentYearId);
  return {
    initialized,
    academicYearId: currentYearId,
    academicYear: yearsInfo.current.year_code || '',
    subjectAllocations: relevantSubjects.map(row => setupSubjectRow(row, maps)),
    classTeacherAssignments: relevantClasses.map(row => setupClassTeacherRow(row, maps)),
  };
}

export async function syncAcademicAssignmentCloud(
  db: SupabaseClient,
  schoolId: string,
  actorUserId: string,
  input: { subjectAllocations?: any[]; classTeacherAssignments?: any[] }
) {
  const [teachers, classes, divisions, subjects, yearsInfo, existingSubjects, existingClasses] = await Promise.all([
    rows(db, 'teachers', schoolId, 'id,user_id,full_name,employee_id,shalarth_id,is_active'),
    rows(db, 'school_classes', schoolId, 'id,class_name,is_active'),
    rows(db, 'school_divisions', schoolId, 'id,division_name,is_active'),
    rows(db, 'subjects', schoolId, 'id,subject_name,subject_code,is_active'),
    currentYears(db, schoolId),
    rows(db, 'school_subject_teacher_assignments', schoolId, '*'),
    rows(db, 'school_class_teacher_assignments', schoolId, '*'),
  ]);

  const incomingSubjects = Array.isArray(input.subjectAllocations) ? input.subjectAllocations : [];
  const incomingClasses = Array.isArray(input.classTeacherAssignments) ? input.classTeacherAssignments : [];

  // Validate the full incoming snapshot before the first database write. This makes the
  // one-time browser-to-cloud migration fail fast on unresolved Teacher/Class/Division/Subject
  // labels instead of leaving an avoidable partial import. Database-level failures remain
  // safely retryable because the sync-state marker is written only after full completion.
  const preflightClassScopes = new Set<string>();
  for (const item of incomingClasses) {
    const teacher = resolveTeacher(teachers, item.teacherRecordId || item.teacherId, item.teacherName);
    const cls = resolveNamed(classes, item.className, ['class_name']);
    const div = isNoDivision(item.divisionName) ? null : resolveNamed(divisions, item.divisionName, ['division_name']);
    const year = resolveYear(yearsInfo.rows, item.academicYear, yearsInfo.current);
    if (!teacher) throw new Error(`Class Teacher mapping could not resolve Teacher: ${text(item.teacherName) || text(item.teacherId)}`);
    if (!cls) throw new Error(`Class Teacher mapping could not resolve Class: ${text(item.className)}`);
    if (!isNoDivision(item.divisionName) && !div) throw new Error(`Class Teacher mapping could not resolve Division: ${text(item.divisionName)}`);
    const scopeKey = `${year.id}|${cls.id}|${div?.id || ''}`;
    if (active(item)) {
      if (preflightClassScopes.has(scopeKey)) throw new Error(`Only one active Class Teacher can be assigned to ${text(item.className)} ${text(item.divisionName)}.`);
      preflightClassScopes.add(scopeKey);
    }
  }
  for (const item of incomingSubjects) {
    const teacher = resolveTeacher(teachers, item.teacherRecordId || item.teacherId, item.teacherName);
    const cls = resolveNamed(classes, item.className, ['class_name']);
    const div = isNoDivision(item.divisionName) ? null : resolveNamed(divisions, item.divisionName, ['division_name']);
    const subject = resolveNamed(subjects, item.subjectName, ['subject_name']);
    if (!teacher) throw new Error(`Subject Allocation could not resolve Teacher: ${text(item.teacherName) || text(item.teacherId)}`);
    if (!cls) throw new Error(`Subject Allocation could not resolve Class: ${text(item.className)}`);
    if (!isNoDivision(item.divisionName) && !div) throw new Error(`Subject Allocation could not resolve Division: ${text(item.divisionName)}`);
    if (!subject) throw new Error(`Subject Allocation could not resolve Subject: ${text(item.subjectName)}`);
  }

  const touchedSubjectIds = new Set<string>();
  const touchedClassIds = new Set<string>();
  const activeClassScopes = new Set<string>();
  const syncYearIds = new Set<string>([String(yearsInfo.current.id)]);

  for (const item of incomingClasses) {
    const teacher = resolveTeacher(teachers, item.teacherRecordId || item.teacherId, item.teacherName);
    const cls = resolveNamed(classes, item.className, ['class_name']);
    const div = isNoDivision(item.divisionName) ? null : resolveNamed(divisions, item.divisionName, ['division_name']);
    const year = resolveYear(yearsInfo.rows, item.academicYear, yearsInfo.current);
    syncYearIds.add(String(year.id));
    if (!teacher) throw new Error(`Class Teacher mapping could not resolve Teacher: ${text(item.teacherName) || text(item.teacherId)}`);
    if (!cls) throw new Error(`Class Teacher mapping could not resolve Class: ${text(item.className)}`);
    if (!isNoDivision(item.divisionName) && !div) throw new Error(`Class Teacher mapping could not resolve Division: ${text(item.divisionName)}`);
    const scopeKey = `${year.id}|${cls.id}|${div?.id || ''}`;
    if (active(item)) {
      if (activeClassScopes.has(scopeKey)) throw new Error(`Only one active Class Teacher can be assigned to ${text(item.className)} ${text(item.divisionName)}.`);
      activeClassScopes.add(scopeKey);
    }

    const legacyId = text(item.id) || null;
    const match = existingClasses.find(row => legacyId && row.legacy_source_id === legacyId)
      || existingClasses.find(row => String(row.academic_year_id) === String(year.id)
        && String(row.class_id) === String(cls.id)
        && String(row.division_id || '') === String(div?.id || ''));
    const payload: any = {
      school_id: schoolId,
      academic_year_id: year.id,
      class_id: cls.id,
      division_id: div?.id || null,
      teacher_id: teacher.id,
      legacy_source_id: legacyId,
      is_active: active(item),
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    };
    if (match?.id) {
      const { data, error } = await db.from('school_class_teacher_assignments').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (error) throw new Error(error.message || 'Class Teacher assignment could not be updated.');
      touchedClassIds.add(String(data.id));
    } else {
      const { data, error } = await db.from('school_class_teacher_assignments').insert({ ...payload, created_by: actorUserId }).select('id').single();
      if (error) throw new Error(error.message || 'Class Teacher assignment could not be created.');
      touchedClassIds.add(String(data.id));
    }
  }

  for (const item of incomingSubjects) {
    const teacher = resolveTeacher(teachers, item.teacherRecordId || item.teacherId, item.teacherName);
    const cls = resolveNamed(classes, item.className, ['class_name']);
    const div = isNoDivision(item.divisionName) ? null : resolveNamed(divisions, item.divisionName, ['division_name']);
    const subject = resolveNamed(subjects, item.subjectName, ['subject_name']);
    const year = resolveYear(yearsInfo.rows, item.academicYear, yearsInfo.current);
    syncYearIds.add(String(year.id));
    if (!teacher) throw new Error(`Subject Allocation could not resolve Teacher: ${text(item.teacherName) || text(item.teacherId)}`);
    if (!cls) throw new Error(`Subject Allocation could not resolve Class: ${text(item.className)}`);
    if (!isNoDivision(item.divisionName) && !div) throw new Error(`Subject Allocation could not resolve Division: ${text(item.divisionName)}`);
    if (!subject) throw new Error(`Subject Allocation could not resolve Subject: ${text(item.subjectName)}`);

    const legacyId = text(item.id) || null;
    const match = existingSubjects.find(row => legacyId && row.legacy_source_id === legacyId)
      || existingSubjects.find(row => String(row.academic_year_id) === String(year.id)
        && String(row.class_id) === String(cls.id)
        && String(row.division_id || '') === String(div?.id || '')
        && String(row.subject_id) === String(subject.id)
        && String(row.teacher_id) === String(teacher.id));
    const payload: any = {
      school_id: schoolId,
      academic_year_id: year.id,
      class_id: cls.id,
      division_id: div?.id || null,
      subject_id: subject.id,
      teacher_id: teacher.id,
      weekly_periods: Math.max(0, Math.min(100, Number(item.weeklyPeriods || 0))),
      legacy_source_id: legacyId,
      is_active: active(item),
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    };
    if (match?.id) {
      const { data, error } = await db.from('school_subject_teacher_assignments').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (error) throw new Error(error.message || 'Subject Allocation could not be updated.');
      touchedSubjectIds.add(String(data.id));
    } else {
      const { data, error } = await db.from('school_subject_teacher_assignments').insert({ ...payload, created_by: actorUserId }).select('id').single();
      if (error) throw new Error(error.message || 'Subject Allocation could not be created.');
      touchedSubjectIds.add(String(data.id));
    }
  }

  const staleClasses = existingClasses.filter(row => syncYearIds.has(String(row.academic_year_id)) && !touchedClassIds.has(String(row.id)) && row.is_active !== false);
  const staleSubjects = existingSubjects.filter(row => syncYearIds.has(String(row.academic_year_id)) && !touchedSubjectIds.has(String(row.id)) && row.is_active !== false);
  if (staleClasses.length) {
    const { error } = await db.from('school_class_teacher_assignments').update({ is_active: false, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('school_id', schoolId).in('id', staleClasses.map(row => row.id));
    if (error) throw new Error(error.message || 'Stale Class Teacher assignments could not be deactivated.');
  }
  if (staleSubjects.length) {
    const { error } = await db.from('school_subject_teacher_assignments').update({ is_active: false, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('school_id', schoolId).in('id', staleSubjects.map(row => row.id));
    if (error) throw new Error(error.message || 'Stale Subject Allocations could not be deactivated.');
  }

  // Mark each synchronized academic year initialized only after all assignment writes/deactivations
  // have completed. If a transient database error occurs earlier, bootstrap safely retries later.
  for (const academicYearId of syncYearIds) {
    const { error } = await db.from('school_academic_assignment_sync_state').upsert({
      school_id: schoolId,
      academic_year_id: academicYearId,
      initialized_at: new Date().toISOString(),
      updated_by: actorUserId,
    }, { onConflict: 'school_id,academic_year_id' });
    if (error) throw new Error(error.message || 'Academic Assignment sync state could not be finalized.');
  }

  try {
    await db.from('audit_logs').insert({
      school_id: schoolId,
      actor_user_id: actorUserId,
      actor_kind: 'school_user',
      action: 'ACADEMIC_ASSIGNMENTS_CLOUD_SYNC',
      entity_type: 'academic_assignments',
      entity_id: schoolId,
      summary: `Synchronized ${incomingSubjects.length} Subject Allocation(s) and ${incomingClasses.length} Class Teacher Assignment(s) to canonical cloud tables.`,
      metadata: { subjectAllocations: incomingSubjects.length, classTeacherAssignments: incomingClasses.length },
    });
  } catch {
    // Assignment persistence remains authoritative even if audit logging is unavailable.
  }

  return loadAcademicAssignmentCloud(db, schoolId);
}
