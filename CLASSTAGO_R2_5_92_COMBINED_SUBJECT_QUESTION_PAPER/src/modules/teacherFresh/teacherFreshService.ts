import { supabase } from '../../lib/supabase';
import { dateKeysInclusive, nextMonthStartKey, schoolTodayKey } from '../../lib/schoolDate';
import type {
  AttendanceCorrectionRequest,
  AttendanceEntry,
  AttendanceStudent,
  CalendarDay,
  SwiftChatStatus,
  TeacherCloudContext,
  TeacherScopeAssignment,
} from './types';

const asText = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;

async function maybeSchool(schoolId: string) {
  const { data } = await supabase.from('schools').select('school_name, school_code').eq('id', schoolId).maybeSingle();
  return data as any;
}

export async function loadTeacherCloudContext(identity: { userId: string; appUserId?: string; employeeCode?: string; shalarthId?: string; name?: string }): Promise<TeacherCloudContext> {
  const userId = identity.userId;
  const teacherSelect = 'id, user_id, school_id, full_name, designation, employee_id, shalarth_id, is_active';
  let teacher: any = null;
  let teacherError: any = null;
  const byUser = await supabase.from('teachers').select(teacherSelect).eq('user_id', userId).eq('is_active', true).maybeSingle();
  teacher = byUser.data; teacherError = byUser.error;
  if (!teacher && !teacherError && identity.employeeCode) {
    const r = await supabase.from('teachers').select(teacherSelect).eq('employee_id', identity.employeeCode).eq('is_active', true).maybeSingle();
    teacher = r.data; teacherError = r.error;
  }
  if (!teacher && !teacherError && identity.shalarthId) {
    const r = await supabase.from('teachers').select(teacherSelect).eq('shalarth_id', identity.shalarthId).eq('is_active', true).maybeSingle();
    teacher = r.data; teacherError = r.error;
  }
  if (!teacher && !teacherError && identity.name) {
    const r = await supabase.from('teachers').select(teacherSelect).ilike('full_name', identity.name.trim()).eq('is_active', true).limit(2);
    if (!r.error && (r.data || []).length === 1) teacher = r.data?.[0];
    teacherError = r.error;
  }
  if (teacherError) throw teacherError;
  if (!teacher) throw new Error('Teacher cloud profile is not linked to this login. Verify Teacher Master user/employee/SHALARTH linkage.');

  const teacherRow = teacher as any;
  const school = await maybeSchool(teacherRow.school_id);
  // Resolve both academic-year systems explicitly. The legacy assignment tables use
  // academic_years, while the canonical R8 Academic Mapping tables use school_academic_years.
  // Never apply one table's year UUID to the other table.
  const legacyYearResult = await supabase
    .from('academic_years')
    .select('id, year_name')
    .eq('school_id', teacherRow.school_id)
    .eq('is_current', true)
    .maybeSingle();
  const schoolYearResult = await supabase
    .from('school_academic_years')
    .select('id, year_code, is_active')
    .eq('school_id', teacherRow.school_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const legacyActiveYear: any = (!legacyYearResult.error && legacyYearResult.data) ? legacyYearResult.data : null;
  const schoolActiveYear: any = (!schoolYearResult.error && schoolYearResult.data)
    ? { id: (schoolYearResult.data as any).id, year_name: (schoolYearResult.data as any).year_code }
    : null;
  const activeYear: any = legacyActiveYear || schoolActiveYear;
  const activeYearId = activeYear?.id as string | undefined;
  const legacyActiveYearId = legacyActiveYear?.id as string | undefined;
  const schoolActiveYearId = schoolActiveYear?.id as string | undefined;
  const missingSchema = (error: any) => /does not exist|schema cache|could not find/i.test(String(error?.message || ''));
  let canonicalAssignmentsInitialized = false;
  if (schoolActiveYearId) {
    const syncState = await supabase.from('school_academic_assignment_sync_state')
      .select('academic_year_id')
      .eq('school_id', teacherRow.school_id)
      .eq('academic_year_id', schoolActiveYearId)
      .maybeSingle();
    if (!syncState.error && syncState.data) canonicalAssignmentsInitialized = true;
    else if (syncState.error && !missingSchema(syncState.error)) throw syncState.error;
  }

  // Canonical source-of-truth rule: after the successful current-year sync marker exists,
  // an empty canonical assignment set is intentional. Never resurrect stale legacy rows.
  // Before initialization only, legacy cloud tables remain a migration compatibility source.
  const readSubjectAssignments = async () => {
    let canonicalQuery: any = supabase.from('school_subject_teacher_assignments').select('*').eq('teacher_id', teacherRow.id).eq('school_id', teacherRow.school_id);
    if (schoolActiveYearId) canonicalQuery = canonicalQuery.eq('academic_year_id', schoolActiveYearId);
    const canonical = await canonicalQuery;
    if (canonical.error && !missingSchema(canonical.error)) return { rows: [], error: canonical.error };
    if (!canonical.error && (canonicalAssignmentsInitialized || (canonical.data || []).length > 0)) return { rows: canonical.data || [], error: null };

    let legacyQuery: any = supabase.from('subject_teachers').select('*').eq('teacher_id', teacherRow.id).eq('school_id', teacherRow.school_id);
    if (legacyActiveYearId) legacyQuery = legacyQuery.eq('academic_year_id', legacyActiveYearId);
    const legacy = await legacyQuery;
    if (legacy.error && !missingSchema(legacy.error)) return { rows: [], error: legacy.error };
    return { rows: legacy.data || [], error: null };
  };

  const readClassTeacherAssignments = async () => {
    let canonicalQuery: any = supabase.from('school_class_teacher_assignments').select('*').eq('teacher_id', teacherRow.id).eq('school_id', teacherRow.school_id);
    if (schoolActiveYearId) canonicalQuery = canonicalQuery.eq('academic_year_id', schoolActiveYearId);
    const canonical = await canonicalQuery;
    if (canonical.error && !missingSchema(canonical.error)) return { rows: [], error: canonical.error };
    if (!canonical.error && (canonicalAssignmentsInitialized || (canonical.data || []).length > 0)) return { rows: canonical.data || [], error: null };

    let legacyQuery: any = supabase.from('class_teachers').select('*').eq('teacher_id', teacherRow.id).eq('school_id', teacherRow.school_id);
    if (legacyActiveYearId) legacyQuery = legacyQuery.eq('academic_year_id', legacyActiveYearId);
    const legacy = await legacyQuery;
    if (legacy.error && !missingSchema(legacy.error)) return { rows: [], error: legacy.error };
    return { rows: legacy.data || [], error: null };
  };

  const [subjectRead, classTeacherRead] = await Promise.all([readSubjectAssignments(), readClassTeacherAssignments()]);
  if (subjectRead.error) throw subjectRead.error;
  if (classTeacherRead.error) throw classTeacherRead.error;

  let rows = ((subjectRead.rows || []) as any[]).filter((row:any) => row.is_active !== false && row.active !== false);
  const initialCloudSubjectRowCount = rows.length;
  const classTeacherRows = ((classTeacherRead.rows || []) as any[]).filter((row:any) => row.is_active !== false && row.active !== false);
  // R8 production access is cloud-only. Browser Academic Setup is no longer an authority.
  const academicSetupSubjectRowCount = 0;
  const matchedAcademicSetupSubjectRowCount = 0;
  const matchedTeacherProfileCount = 0;

  // Integrated projection is a cloud compatibility source, never a frontend/local mock.
  if (rows.length === 0 && !canonicalAssignmentsInitialized) {
    const projection = await supabase.from('edunixo_teacher_assignments').select('*').eq('teacher_id', userId).eq('active', true);
    if (!projection.error && (projection.data || []).length) {
      rows = (projection.data || []).map((x: any) => ({
        id: x.id, school_id: x.school_id, academic_year_id: x.academic_year_id,
        class_id: x.class_id, division_id: x.division_id, subject_id: x.subject_id,
        teacher_id: x.teacher_record_id || teacherRow.id,
        _projection: x,
      }));
    }
  }

  const classIds = [...new Set([...rows.map(x => x.class_id), ...classTeacherRows.map(x => x.class_id)].filter(Boolean))];
  const divisionIds = [...new Set([...rows.map(x => x.division_id), ...classTeacherRows.map(x => x.division_id)].filter(Boolean))];
  const subjectIds = [...new Set(rows.map(x => x.subject_id).filter(Boolean))];

  const safeRows = async (table: string, ids: string[], columns = '*') => {
    if (!ids.length) return [] as any[];
    // Academic Setup compatibility rows may carry legacy/local IDs (cl9, sub_*, label-*).
    // UUID-backed cloud tables reject those values before projection fallbacks can render.
    // Query only identifiers that look like UUIDs; all other labels are resolved from the
    // allocation projection below.
    const uuidIds = ids.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id)));
    if (!uuidIds.length) return [] as any[];
    const result = await supabase.from(table).select(columns).in('id', uuidIds);
    if (result.error) {
      if (/does not exist|schema cache|could not find|invalid input syntax for type uuid/i.test(String((result.error as any).message || ''))) return [] as any[];
      throw result.error;
    }
    return (result.data || []) as any[];
  };

  const [legacyClasses, setupClasses, legacyDivisions, setupDivisions, subjectRows] = await Promise.all([
    safeRows('classes', classIds, 'id, class_name'),
    safeRows('school_classes', classIds, 'id, class_name'),
    safeRows('divisions', divisionIds, 'id, division_name, medium'),
    safeRows('school_divisions', divisionIds, 'id, division_name, medium_id'),
    safeRows('subjects', subjectIds, 'id, subject_name, subject_code'),
  ]);

  const classMap = new Map([...legacyClasses, ...setupClasses].map((x: any) => [x.id, x]));
  const divisionMap = new Map([...legacyDivisions, ...setupDivisions].map((x: any) => [x.id, x]));
  const subjectMap = new Map(subjectRows.map((x: any) => [x.id, x]));
  const isCtScope = (classId: string, divisionId?: string | null) => classTeacherRows.some(x => x.class_id === classId && (x.division_id || null) === (divisionId || null));

  const subjectAssignments: TeacherScopeAssignment[] = rows.map((row) => {
    const cls: any = classMap.get(row.class_id) || {};
    const div: any = divisionMap.get(row.division_id) || {};
    const sub: any = subjectMap.get(row.subject_id) || {};
    return {
      id: row.id,
      scopeType: 'subject',
      schoolId: row.school_id,
      teacherRecordId: row.teacher_id,
      academicYearId: row.academic_year_id,
      academicYear: asText((activeYear as any)?.year_name, 'Current Academic Year'),
      classId: row.class_id,
      className: asText(cls.class_name, asText(row._projection?.class_name, asText(row._legacyAllocation?.className, 'Assigned Class'))),
      divisionId: row.division_id || undefined,
      division: asText(div.division_name, asText(row._projection?.division, row.division_id ? 'Assigned Division' : 'All')),
      subjectId: row.subject_id,
      subjectName: asText(sub.subject_name, asText(row._projection?.subject_name, 'Assigned Subject')),
      subjectCode: asText(sub.subject_code, asText(row._projection?.subject_code)) || undefined,
      medium: asText(div.medium, asText(row._projection?.medium, 'School Medium')),
      isClassTeacher: isCtScope(row.class_id, row.division_id),
      resultTemplateKey: asText(row.result_template_key, asText(row.template_key, asText(row.template_id, asText(row.assigned_template, asText(row._projection?.result_template_key)))) ) || undefined,
      resultTemplateCategory: asText(row.template_category, asText(row._projection?.template_category)) || undefined,
    };
  });

  // A genuine Class Teacher assignment must grant the class attendance/dashboard scope even
  // when that class has no separate subject_teachers row for this teacher. It is intentionally
  // NOT an AI subject assignment and is filtered out before Academic/Question Paper screens.
  const classTeacherOnlyAssignments: TeacherScopeAssignment[] = classTeacherRows
    .filter(ct => !rows.some(row => row.class_id === ct.class_id && (row.division_id || null) === (ct.division_id || null)))
    .map(ct => {
      const cls: any = classMap.get(ct.class_id) || {};
      const div: any = divisionMap.get(ct.division_id) || {};
      return {
        id: `class-teacher:${ct.id}`,
        scopeType: 'class_teacher',
        schoolId: ct.school_id,
        teacherRecordId: ct.teacher_id,
        academicYearId: ct.academic_year_id,
        academicYear: asText((activeYear as any)?.year_name, 'Current Academic Year'),
        classId: ct.class_id,
        className: asText(cls.class_name, asText(ct._legacyAssignment?.className, 'Assigned Class')),
        divisionId: ct.division_id || undefined,
        division: asText(div.division_name, asText(ct._legacyAssignment?.divisionName, ct.division_id ? 'Assigned Division' : 'All')),
        subjectId: '',
        subjectName: 'Class Teacher Roster',
        medium: asText(div.medium, 'School Medium'),
        isClassTeacher: true,
      };
    });

  return {
    teacherRecordId: teacherRow.id,
    userId,
    schoolId: teacherRow.school_id,
    schoolName: asText((school as any)?.school_name, 'Classtago School'),
    schoolCode: asText((school as any)?.school_code) || undefined,
    teacherName: asText(teacherRow.full_name, 'Teacher'),
    designation: asText(teacherRow.designation) || undefined,
    academicYearId: activeYearId,
    academicYear: asText((activeYear as any)?.year_name, 'Current Academic Year'),
    assignments: [...subjectAssignments, ...classTeacherOnlyAssignments],
    assignmentDiagnostics: {
      cloudSubjectRows: initialCloudSubjectRowCount,
      academicSetupSubjectRows: academicSetupSubjectRowCount,
      matchedAcademicSetupSubjectRows: matchedAcademicSetupSubjectRowCount,
      matchedTeacherProfiles: matchedTeacherProfileCount,
    },
  };
}

export async function markTeacherNotificationRead(notificationId: string): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) throw sessionError ?? new Error('Your Teacher session expired. Sign in again.');
  const response = await fetch(`/api/teacher/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionData.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Notification could not be marked as read.');
}

export async function loadAttendanceRoster(assignment: TeacherScopeAssignment): Promise<AttendanceStudent[]> {
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');

  const query = new URLSearchParams({
    classId: assignment.classId,
    className: assignment.className || '',
    divisionName: assignment.division || '',
    academicYearId: assignment.academicYearId || '',
  });
  if (assignment.divisionId) query.set('divisionId', assignment.divisionId);
  if (assignment.subjectId) query.set('subjectId', assignment.subjectId);

  const response = await fetch(`/api/teacher/assigned-roster?${query.toString()}`, {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Assigned Student roster could not be loaded.');

  return (Array.isArray(payload.students) ? payload.students : []).map((row: any) => ({
    id: String(row.studentId || ''),
    grNumber: String(row.grNumber || '—'),
    rollNumber: row.rollNumber == null ? undefined : String(row.rollNumber),
    fullName: String(row.studentName || 'Student'),
    gender: row.gender || undefined,
    dateOfBirth: row.dateOfBirth || undefined,
    contactNumber: row.contactNumber || undefined,
    admissionDate: row.admissionDate || undefined,
    leavingDate: row.leavingDate || undefined,
    leavingReason: row.leavingReason || undefined,
    childUid: row.childUid || undefined,
    examSeatNo: row.examSeatNo || undefined,
    aadhaarNumber: row.aadhaarNumber || undefined,
    status: String(row.status || 'Active'),
  })).filter((row: AttendanceStudent) => Boolean(row.id));
}

export async function getCalendarDay(schoolId: string, date: string): Promise<CalendarDay> {
  const { data, error } = await supabase
    .from('edunixo_academic_calendar_days')
    .select('calendar_date, is_working_day, locked, label, day_type')
    .eq('school_id', schoolId)
    .eq('calendar_date', date)
    .maybeSingle();
  if (error || !data) {
    // Compatibility with the current Academic Setup cloud calendar.
    const holiday = await supabase.from('school_holidays').select('holiday_name, starts_on, ends_on').eq('school_id', schoolId).lte('starts_on', date).gte('ends_on', date).limit(1).maybeSingle();
    if (!holiday.error && holiday.data) return { date, isWorkingDay: false, locked: true, label: (holiday.data as any).holiday_name || 'Holiday', dayType: 'holiday' };
    // Never fabricate a holiday when no configured calendar source exists.
    return { date, isWorkingDay: true, locked: false };
  }
  return {
    date,
    isWorkingDay: Boolean((data as any).is_working_day),
    locked: Boolean((data as any).locked),
    label: (data as any).label || undefined,
    dayType: (data as any).day_type || undefined,
  };
}

export async function loadAttendanceForDate(assignment: TeacherScopeAssignment, date: string): Promise<AttendanceEntry[]> {
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const query = new URLSearchParams({
    classId: assignment.classId,
    className: assignment.className || '',
    divisionName: assignment.division || '',
    academicYearId: assignment.academicYearId || '',
    date,
  });
  if (assignment.divisionId) query.set('divisionId', assignment.divisionId);
  if (assignment.subjectId) query.set('subjectId', assignment.subjectId);
  const response = await fetch(`/api/teacher/attendance/entries?${query.toString()}`, {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Attendance could not be loaded.');
  return (Array.isArray(payload.entries) ? payload.entries : []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    attendanceDate: row.attendance_date,
    status: row.status,
    source: row.source || 'manual',
    updatedAt: row.updated_at,
  }));
}

export async function saveDailyAttendance(input: {
  context: TeacherCloudContext;
  assignment: TeacherScopeAssignment;
  date: string;
  values: Record<string, 'P' | 'A'>;
  calendarDay: CalendarDay;
  offline?: { capturedAt: string; deviceId: string; queueId: string };
}) {
  if (!input.calendarDay.isWorkingDay || input.calendarDay.locked) throw new Error('This calendar day is locked/holiday. Teacher marking is disabled.');
  const today = schoolTodayKey();
  if (input.date !== today && !input.offline) throw new Error('Past attendance cannot be silently edited. Use Attendance Correction Request.');
  const roster = await loadAttendanceRoster(input.assignment);
  const activeRows = roster.filter(student => {
    if (student.admissionDate && input.date < student.admissionDate) return false;
    if (student.leavingDate && input.date > student.leavingDate) return false;
    return true;
  });
  const unmarked = activeRows.filter(student => !input.values[student.id]);
  if (unmarked.length) throw new Error(`Mark every active student before Save. ${unmarked.length} student(s) are still unmarked.`);
  if (!activeRows.length) throw new Error('No active students are available for this date.');

  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const response = await fetch('/api/teacher/attendance/save', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      classId: input.assignment.classId,
      className: input.assignment.className || '',
      divisionId: input.assignment.divisionId || null,
      divisionName: input.assignment.division || '',
      subjectId: input.assignment.subjectId || null,
      academicYearId: input.assignment.academicYearId || null,
      date: input.date,
      values: input.values,
      offlineCapturedAt: input.offline?.capturedAt || null,
      offlineDeviceId: input.offline?.deviceId || null,
      offlineQueueId: input.offline?.queueId || null,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Attendance could not be saved.');
}

export async function loadAttendanceMonth(assignment: TeacherScopeAssignment, month: string) {
  const startDate = `${month}-01`;
  const end = nextMonthStartKey(month);
  const roster = await loadAttendanceRoster(assignment);
  let entries: any[] = [];
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const query = new URLSearchParams({
    classId: assignment.classId,
    className: assignment.className || '',
    divisionName: assignment.division || '',
    academicYearId: assignment.academicYearId || '',
    month,
  });
  if (assignment.divisionId) query.set('divisionId', assignment.divisionId);
  if (assignment.subjectId) query.set('subjectId', assignment.subjectId);
  const attendanceResponse = await fetch(`/api/teacher/attendance/entries?${query.toString()}`, {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
    cache: 'no-store',
  });
  const attendancePayload = await attendanceResponse.json().catch(() => ({}));
  if (!attendanceResponse.ok) throw new Error(attendancePayload.error || 'Monthly attendance could not be loaded.');
  entries = Array.isArray(attendancePayload.entries) ? attendancePayload.entries : [];

  let calendar: any[] = [];
  const calendarResult = await supabase.from('edunixo_academic_calendar_days')
    .select('calendar_date, is_working_day, locked, label, day_type')
    .eq('school_id', assignment.schoolId).gte('calendar_date', startDate).lt('calendar_date', end);
  if (!calendarResult.error) calendar = calendarResult.data || [];
  else {
    const holidays = await supabase.from('school_holidays').select('holiday_name, starts_on, ends_on').eq('school_id', assignment.schoolId).lt('starts_on', end).gte('ends_on', startDate);
    if (!holidays.error) {
      for (const h of holidays.data || []) {
        for (const d of dateKeysInclusive(String(h.starts_on || ''), String(h.ends_on || ''))) {
          if (d >= startDate && d < end) calendar.push({ calendar_date: d, is_working_day: false, locked: true, label: h.holiday_name, day_type: 'holiday' });
        }
      }
    }
  }
  return { roster, entries, calendar };
}

export async function createAttendanceCorrectionRequest(input: {
  context: TeacherCloudContext;
  assignment: TeacherScopeAssignment;
  studentId: string;
  date: string;
  currentStatus: 'P' | 'A';
  requestedStatus: 'P' | 'A';
  reason: string;
}) {
  if (input.currentStatus === input.requestedStatus) throw new Error('Requested status must be different from current attendance.');
  if (!input.reason.trim()) throw new Error('Correction reason is required.');
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const response = await fetch('/api/teacher/attendance/corrections', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      classId: input.assignment.classId,
      className: input.assignment.className || '',
      divisionId: input.assignment.divisionId || null,
      divisionName: input.assignment.division || '',
      subjectId: input.assignment.subjectId || null,
      academicYearId: input.assignment.academicYearId || null,
      studentId: input.studentId,
      date: input.date,
      currentStatus: input.currentStatus,
      requestedStatus: input.requestedStatus,
      reason: input.reason.trim(),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Attendance Correction request could not be saved.');
}

export async function listMyAttendanceCorrectionRequests(_userId: string): Promise<AttendanceCorrectionRequest[]> {
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const response = await fetch('/api/teacher/attendance/corrections', {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Attendance Correction requests could not be loaded.');
  return (Array.isArray(payload.rows) ? payload.rows : []).map((x: any) => ({
    id: x.id,
    studentId: x.student_id,
    attendanceDate: x.attendance_date,
    currentStatus: x.current_status,
    requestedStatus: x.requested_status,
    reason: x.reason,
    status: x.status,
    createdAt: x.created_at,
  }));
}

export async function loadSwiftChatStatus(schoolId: string): Promise<SwiftChatStatus> {
  const { data, error } = await supabase.from('edunixo_swiftchat_connector_status')
    .select('connector_enabled, official_api_configured, last_sync_at, last_status, last_message')
    .eq('school_id', schoolId).maybeSingle();
  if (error || !data) return { connectorEnabled: false, officialApiConfigured: false };
  return {
    connectorEnabled: Boolean((data as any).connector_enabled),
    officialApiConfigured: Boolean((data as any).official_api_configured),
    lastSyncAt: (data as any).last_sync_at || undefined,
    lastStatus: (data as any).last_status || undefined,
    lastMessage: (data as any).last_message || undefined,
  };
}

function isMissingRelation(error: any) {
  return /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(error?.message || ''));
}

async function firstReadableSchoolTable(tableNames: string[], schoolId: string): Promise<{ table?: string; rows: any[] }> {
  for (const table of tableNames) {
    const result = await supabase.from(table).select('*').eq('school_id', schoolId).limit(1500);
    if (!result.error) return { table, rows: result.data || [] };
    if (!isMissingRelation(result.error)) {
      // A configured table that is forbidden by RLS is not silently replaced with browser data.
      return { table, rows: [] };
    }
  }
  return { rows: [] };
}

export async function loadTeacherDashboardCloudFeed(context: TeacherCloudContext, date: string): Promise<import('./types').TeacherDashboardCloudFeed> {
  const assignmentIds = new Set(context.assignments.map(x => String(x.id)));
  const classById = new Map(context.assignments.map(x => [String(x.classId), x.className]));
  const divisionById = new Map(context.assignments.filter(x => x.divisionId).map(x => [String(x.divisionId), x.division]));
  const subjectById = new Map(context.assignments.filter(x => x.subjectId).map(x => [String(x.subjectId), x.subjectName]));
  const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  let scopedTimetablePayload: any = null;
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (token) {
      const response = await fetch('/api/teacher/timetable', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.ok) scopedTimetablePayload = await response.json().catch(() => null);
    }
  } catch {
    scopedTimetablePayload = null;
  }
  const timetableSource = {
    table: scopedTimetablePayload ? 'teacher_scoped_timetable' : undefined,
    rows: (Array.isArray(scopedTimetablePayload?.regularRows) ? scopedTimetablePayload.regularRows : []).map((row: any) => ({
      id: row.id, day_name: row.day, period_no: row.period, start_time: row.startTime, end_time: row.endTime,
      class_name: row.className, division_name: row.division, subject_name: row.subjectName,
      teacher_user_id: row.teacherUserId, teacher_record_id: row.teacherRecordId, status: 'scheduled',
    })),
  };
  const timetableRows = timetableSource.rows.filter((row: any) => {
    // `/api/teacher/timetable` already returns only the authenticated Teacher's rows.
    // Keep only date/day filtering here so legacy published rows without teacher IDs
    // are not accidentally hidden after the server has safely resolved them by identity.
    const rowDate = String(row.schedule_date || row.timetable_date || row.date || '').slice(0, 10);
    if (rowDate && rowDate !== date) return false;
    const rowDay = String(row.day_name || row.day_of_week || row.weekday || row.day || '').toLowerCase();
    return !rowDay || rowDay === dayName || rowDay.startsWith(dayName.slice(0, 3));
  });

  const now = new Date();
  const toMinutes = (value: unknown) => {
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = date === schoolTodayKey();
  const timetable = timetableRows.map((row: any, index: number) => {
    const startTime = String(row.start_time || row.period_start || row.start || '').slice(0, 5) || undefined;
    const endTime = String(row.end_time || row.period_end || row.end || '').slice(0, 5) || undefined;
    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    let status: import('./types').TeacherTimetableItem['status'] = String(row.status || '').toLowerCase().includes('substitut')
      ? 'substitute'
      : String(row.status || '').toLowerCase().includes('free') ? 'free' : 'scheduled';
    if (isToday && startM != null && endM != null) {
      if (currentMinutes >= startM && currentMinutes <= endM) status = 'current';
      else if (currentMinutes > endM) status = 'completed';
      else status = 'upcoming';
    }
    const assignment = context.assignments.find(a =>
      String(row.class_id || '') === a.classId
      && (!row.division_id || String(row.division_id) === String(a.divisionId || ''))
      && (!row.subject_id || String(row.subject_id) === a.subjectId)
    );
    return {
      id: String(row.id || `${date}-${index}`),
      periodNo: Number(row.period_number || row.period_no || row.period || index + 1) || undefined,
      startTime,
      endTime,
      className: String(row.class_name || classById.get(String(row.class_id || '')) || assignment?.className || 'Assigned Class'),
      division: String(row.division_name || row.division || divisionById.get(String(row.division_id || '')) || assignment?.division || '') || undefined,
      subjectName: String(row.subject_name || subjectById.get(String(row.subject_id || '')) || assignment?.subjectName || (status === 'free' ? 'Free Period' : 'Assigned Subject')),
      room: String(row.room_name || row.room || row.classroom || '') || undefined,
      status,
    } as import('./types').TeacherTimetableItem;
  }).sort((a, b) => Number(a.periodNo || 999) - Number(b.periodNo || 999));

  // R6 final approved Substitute Management duties are delivered into the same Today’s Timetable feed.
  const substituteSource = {
    rows: (Array.isArray(scopedTimetablePayload?.substituteRows) ? scopedTimetablePayload.substituteRows : []).map((row: any) => ({
      id: row.id, duty_date: row.date, day_name: row.day, period_no: row.period, class_name: row.className, division_name: row.division,
      subject_name: row.subjectName, original_teacher_name: row.originalTeacher, substitute_teacher_name: row.substituteTeacher,
      substitute_teacher_user_id: row.substituteTeacherUserId, substitute_teacher_record_id: row.substituteTeacherRecordId, status: row.status,
    })),
  };
  if (substituteSource.rows.length) {
    const substituteRows = substituteSource.rows.filter((row: any) => {
      if (String(row.status || '') !== 'Approved') return false;
      if (String(row.duty_date || '').slice(0,10) !== date) return false;
      return true;
    });
    for (const row of substituteRows) {
      timetable.push({
        id: String(row.id || `sub-${date}-${row.period_no}`),
        periodNo: Number(row.period_no || 0) || undefined,
        className: String(row.class_name || 'Assigned Class'),
        division: String(row.division_name || '') || undefined,
        subjectName: String(row.subject_name || 'Substitute Duty'),
        status: 'substitute',
      });
    }
    timetable.sort((a,b) => Number(a.periodNo || 999)-Number(b.periodNo || 999));
  }

  const noticeSource = await firstReadableSchoolTable(['school_notices', 'notices', 'announcements'], context.schoolId);
  const schoolNotices = noticeSource.rows
    .filter((row: any) => row.is_active !== false && !['archived', 'deleted'].includes(String(row.status || '').toLowerCase()))
    .filter((row: any) => {
      const target = String(row.target_role || row.audience || row.target_audience || row.role || '').toLowerCase();
      return !target || target.includes('all') || target.includes('staff') || target.includes('teacher');
    })
    .slice(0, 20)
    .map((row: any, index: number) => ({
      id: String(row.id || `notice-${index}`),
      title: String(row.title || row.notice_title || row.subject || 'School Notice'),
      body: String(row.body || row.content || row.message || row.description || '') || undefined,
      category: String(row.category || row.notice_type || row.type || '') || undefined,
      publishedAt: String(row.published_at || row.notice_date || row.created_at || '') || undefined,
      isPinned: Boolean(row.is_pinned || row.pinned),
      isRead: Boolean(row.is_read || false),
      canMarkRead: false,
      attachmentUrl: String(row.attachment_url || row.file_url || '') || undefined,
    } as import('./types').TeacherNoticeItem));

  // R7 native user notifications include substitute assignment alerts, exact period-start
  // events and other centralized Communication Engine notifications. They are merged into
  // the existing Teacher Dashboard Notices & Alerts feed instead of creating a duplicate UI.
  const personalNoticeResponse = await supabase.from('edunixo_user_notifications')
    .select('id,title,body,notification_type,is_read,created_at')
    .eq('school_id', context.schoolId)
    .eq('recipient_user_id', context.userId)
    .order('created_at', { ascending: false })
    .limit(30);
  const personalNotices = personalNoticeResponse.error
    ? []
    : (personalNoticeResponse.data || []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || 'Notification'),
      body: String(row.body || '') || undefined,
      category: String(row.notification_type || 'Notification'),
      publishedAt: String(row.created_at || '') || undefined,
      isPinned: false,
      isRead: Boolean(row.is_read),
      canMarkRead: true,
    } as import('./types').TeacherNoticeItem));
  const notices = [...personalNotices, ...schoolNotices]
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, 30);

  let pendingAcademic = { homeworkDrafts: null as number | null, lessonPlanOpen: null as number | null, teachingDiaryOpen: null as number | null };
  const academic = await supabase.from('edunixo_academic_records').select('kind,status,metadata,updated_at').eq('school_id', context.schoolId).eq('owner_teacher_id', context.userId).limit(500);
  if (!academic.error) {
    const rows = academic.data || [];
    const isOpen = (row: any) => !['completed', 'published', 'final', 'archived'].includes(String(row.status || '').toLowerCase());
    pendingAcademic = {
      homeworkDrafts: rows.filter((r: any) => r.kind === 'homework' && isOpen(r)).length,
      lessonPlanOpen: rows.filter((r: any) => r.kind === 'lesson-plan' && isOpen(r)).length,
      teachingDiaryOpen: rows.filter((r: any) => r.kind === 'teaching-diary-assist' && isOpen(r)).length,
    };
  }

  return {
    timetableAvailable: Boolean(timetableSource.table),
    timetable,
    noticesAvailable: Boolean(noticeSource.table) || !personalNoticeResponse.error,
    notices,
    pendingAcademic,
  };
}
