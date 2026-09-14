import { LocalERPDatabase, supabase } from '../../lib/supabase';
import type { TeacherCloudContext } from '../teacherFresh/types';
import type { PublishedTimetableRow, SubstituteDutyRow, TeacherTimetableData } from './types';

const norm = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const personNorm = (value: unknown) => norm(value).replace(/\b(mr|mrs|ms|miss|sir|madam|teacher|shri|smt)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const missingRelation = (error: any) => /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(error?.message || ''));

function periodTimes(period: number) {
  const setup = LocalERPDatabase.getAcademicSetup();
  const p = (setup.periods || []).find((x: any) => Number(x.periodNumber) === Number(period) && x.type !== 'Break');
  return { startTime: p?.startTime || undefined, endTime: p?.endTime || undefined };
}

function localRows(): PublishedTimetableRow[] {
  try {
    const raw = JSON.parse(localStorage.getItem('nhs_v2_generated_grid') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((row: any, index: number) => ({
      id: String(row.id || `local-tt-${index}`),
      day: String(row.day || ''),
      period: Number(row.period || 0),
      ...periodTimes(Number(row.period || 0)),
      className: String(row.className || ''),
      division: String(row.division || ''),
      subjectName: String(row.subjectName || ''),
      teacherName: String(row.teacherName || ''),
      isLocked: Boolean(row.isLocked),
    })).filter((row: PublishedTimetableRow) => row.day && row.period > 0);
  } catch { return []; }
}

function localSubstituteRows(): SubstituteDutyRow[] {
  try {
    const raw = JSON.parse(localStorage.getItem('nhs_v2_substitute_adjustments') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((adj: any) => adj.status === 'Approved').flatMap((adj: any) =>
      (adj.items || []).map((item: any, index: number) => ({
        id: String(item.id || `${adj.id}-${index}`),
        date: String(adj.date || ''),
        day: String(adj.day || ''),
        period: Number(item.period || 0),
        className: String(item.className || ''),
        division: String(item.division || ''),
        subjectName: String(item.subjectName || ''),
        originalTeacher: String(item.originalTeacher || adj.originalTeacher || ''),
        substituteTeacher: String(item.substituteTeacher || ''),
        status: String(adj.status || ''),
      }))
    );
  } catch { return []; }
}

function classTeacherScopes(context: TeacherCloudContext) {
  const out: Array<{ className: string; division: string }> = [];
  const seen = new Set<string>();
  for (const a of context.assignments.filter(a => a.isClassTeacher || a.scopeType === 'class_teacher')) {
    const key = `${norm(a.className)}|${norm(a.division)}`;
    if (!seen.has(key)) { seen.add(key); out.push({ className: a.className, division: a.division || '' }); }
  }
  return out;
}

function ownTeacher(row: PublishedTimetableRow, context: TeacherCloudContext) {
  if (row.teacherUserId && row.teacherUserId === context.userId) return true;
  if (row.teacherRecordId && row.teacherRecordId === context.teacherRecordId) return true;
  return personNorm(row.teacherName) === personNorm(context.teacherName);
}

export async function loadTeacherTimetableData(context: TeacherCloudContext): Promise<TeacherTimetableData> {
  const ctScopes = classTeacherScopes(context);
  let cloudRows: PublishedTimetableRow[] = [];
  let cloudSubs: SubstituteDutyRow[] = [];
  let cloudAvailable = false;

  const tt = await supabase.from('edunixo_published_timetable_entries').select('*').eq('school_id', context.schoolId).eq('academic_year', context.academicYear).limit(5000);
  if (!tt.error) {
    cloudAvailable = true;
    cloudRows = (tt.data || []).map((row: any) => ({
      id: String(row.id), day: String(row.day_name || row.day || ''), period: Number(row.period_no || row.period || 0),
      startTime: String(row.start_time || '') || undefined, endTime: String(row.end_time || '') || undefined,
      className: String(row.class_name || ''), division: String(row.division_name || row.division || ''),
      subjectName: String(row.subject_name || ''), teacherName: String(row.teacher_name || ''),
      teacherUserId: String(row.teacher_user_id || '') || undefined, teacherRecordId: String(row.teacher_record_id || '') || undefined,
      isLocked: Boolean(row.is_locked),
    }));
  } else if (!missingRelation(tt.error)) {
    throw tt.error;
  }

  const sub = await supabase.from('edunixo_substitute_duty_items').select('*').eq('school_id', context.schoolId).eq('status', 'Approved').limit(3000);
  if (!sub.error) {
    cloudSubs = (sub.data || []).map((row: any) => ({
      id: String(row.id), date: String(row.duty_date || ''), day: String(row.day_name || ''), period: Number(row.period_no || 0),
      className: String(row.class_name || ''), division: String(row.division_name || ''), subjectName: String(row.subject_name || ''),
      originalTeacher: String(row.original_teacher_name || ''), substituteTeacher: String(row.substitute_teacher_name || ''), status: String(row.status || ''),
    }));
  } else if (!missingRelation(sub.error)) {
    throw sub.error;
  }

  const rows = cloudAvailable && cloudRows.length ? cloudRows : localRows();
  const subs = cloudSubs.length ? cloudSubs : localSubstituteRows();
  const regularRows = rows.filter(row => ownTeacher(row, context));
  const classRows = rows.filter(row => ctScopes.some(scope => norm(scope.className) === norm(row.className) && (!scope.division || norm(scope.division) === norm(row.division))));
  const substituteRows = subs.filter(row => personNorm(row.substituteTeacher) === personNorm(context.teacherName));

  return {
    source: cloudAvailable && cloudRows.length ? 'cloud' : 'compatibility',
    regularRows, classRows, substituteRows, classTeacherScopes: ctScopes,
    message: cloudAvailable && cloudRows.length ? undefined : 'Using current Smart AI Timetable compatibility feed until the Headmaster publishes the timetable to the R6 cloud tables.',
  };
}

async function resolveHeadmasterSchoolId() {
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id;
  if (!uid) throw new Error('Headmaster login session is not available.');
  const membership = await supabase.from('user_school_memberships').select('*').eq('user_id', uid).limit(20);
  if (membership.error) throw membership.error;
  const row = (membership.data || []).find((m: any) => m.membership_active !== false && m.active !== false && m.is_active !== false && norm(m.role_in_school || m.role) === 'headmaster');
  if (!row?.school_id) throw new Error('An active Headmaster school membership is required to publish timetable data.');
  return { schoolId: String(row.school_id), userId: uid };
}

async function teacherDirectory(schoolId: string) {
  const result = await supabase.from('teachers').select('id,user_id,full_name,employee_id,shalarth_id,is_active').eq('school_id', schoolId);
  if (result.error) throw result.error;
  return (result.data || []).filter((row: any) => row.is_active !== false);
}

function matchTeacher(directory: any[], teacherName: string) {
  return directory.find((row: any) => personNorm(row.full_name) === personNorm(teacherName));
}

export async function publishHeadmasterTimetable(input: { academicYear: string; timetable: any[] }) {
  const { schoolId, userId } = await resolveHeadmasterSchoolId();
  const directory = await teacherDirectory(schoolId);
  const years = await supabase.from('school_academic_years').select('id,year_code,is_active').eq('school_id', schoolId);
  if (years.error) throw years.error;
  const yearDigits = (value: unknown) => String(value || '').replace(/\D/g, '');
  const activeYear = (years.data || []).find((row: any) => yearDigits(row.year_code) === yearDigits(input.academicYear))
    || (years.data || []).find((row: any) => row.is_active)
    || (years.data || [])[0];

  const previous = await supabase.from('edunixo_published_timetable_entries').select('*').eq('school_id', schoolId).eq('academic_year', input.academicYear).limit(5000);
  if (previous.error && !missingRelation(previous.error)) throw previous.error;
  const del = await supabase.from('edunixo_published_timetable_entries').delete().eq('school_id', schoolId).eq('academic_year', input.academicYear);
  if (del.error) throw del.error;
  const payload = (input.timetable || []).filter((row: any) => row.teacherName && row.teacherName !== 'Assigned Duty').map((row: any) => {
    const teacher = matchTeacher(directory, row.teacherName);
    const times = periodTimes(Number(row.period || 0));
    return {
      school_id: schoolId,
      academic_year_id: activeYear?.id || null,
      academic_year: input.academicYear,
      class_name: row.className,
      division_name: row.division || '',
      day_name: row.day,
      period_no: Number(row.period || 0),
      start_time: times.startTime || null,
      end_time: times.endTime || null,
      subject_name: row.subjectName,
      teacher_user_id: teacher?.user_id || null,
      teacher_record_id: teacher?.id || null,
      teacher_name: row.teacherName,
      is_locked: Boolean(row.isLocked),
      published_by: userId,
      published_at: new Date().toISOString(),
    };
  });
  if (payload.length) {
    const ins = await supabase.from('edunixo_published_timetable_entries').insert(payload);
    if (ins.error) {
      // Best-effort rollback: never leave Teacher accounts with an empty timetable
      // just because a replacement publish failed midway.
      if (previous.data?.length) {
        const restore = await supabase.from('edunixo_published_timetable_entries').insert(previous.data);
        if (restore.error) console.error('Timetable rollback failed after publish error.', restore.error);
      }
      throw ins.error;
    }
  }
  return payload.length;
}

export async function publishSubstituteAdjustment(adj: any) {
  const { schoolId, userId } = await resolveHeadmasterSchoolId();
  const directory = await teacherDirectory(schoolId);
  const sourceId = String(adj.id || `${adj.date}-${adj.originalTeacher}`);
  const previous = await supabase.from('edunixo_substitute_duty_items').select('*').eq('school_id', schoolId).eq('source_adjustment_id', sourceId).limit(500);
  if (previous.error && !missingRelation(previous.error)) throw previous.error;
  const del = await supabase.from('edunixo_substitute_duty_items').delete().eq('school_id', schoolId).eq('source_adjustment_id', sourceId);
  if (del.error) throw del.error;
  const payload = (adj.items || []).map((item: any) => {
    const teacher = matchTeacher(directory, item.substituteTeacher);
    return {
      school_id: schoolId,
      source_adjustment_id: sourceId,
      duty_date: adj.date,
      day_name: adj.day,
      period_no: Number(item.period || 0),
      class_name: item.className,
      division_name: item.division || '',
      subject_name: item.subjectName,
      original_teacher_name: item.originalTeacher || adj.originalTeacher,
      substitute_teacher_user_id: teacher?.user_id || null,
      substitute_teacher_record_id: teacher?.id || null,
      substitute_teacher_name: item.substituteTeacher,
      status: adj.status,
      published_by: userId,
      published_at: new Date().toISOString(),
    };
  });
  if (payload.length) {
    const ins = await supabase.from('edunixo_substitute_duty_items').insert(payload);
    if (ins.error) {
      if (previous.data?.length) {
        const restore = await supabase.from('edunixo_substitute_duty_items').insert(previous.data);
        if (restore.error) console.error('Substitute rollback failed after publish error.', restore.error);
      }
      throw ins.error;
    }

    // R7 native website/dashboard alert: a final Approved substitute duty should be visible
    // immediately to the concerned Teacher. External WhatsApp period notifications are
    // dispatched separately at the exact period start time by the server scheduler.
    if (String(adj.status || '') === 'Approved') {
      const notificationRows = payload.filter((row: any) => Boolean(row.substitute_teacher_user_id)).map((row: any) => ({
        school_id: schoolId,
        recipient_user_id: row.substitute_teacher_user_id,
        recipient_teacher_record_id: row.substitute_teacher_record_id || null,
        title: 'Substitute Duty Assigned',
        body: `Period ${row.period_no} · ${row.class_name}${row.division_name ? `-${row.division_name}` : ''} · ${row.subject_name} · Absent: ${row.original_teacher_name}`,
        notification_type: 'substitute_assignment',
        source_key: `substitute-assignment:${row.source_adjustment_id}:${row.period_no}:${row.substitute_teacher_user_id}`,
        is_read: false,
      }));
      if (notificationRows.length) {
        const notice = await supabase.from('edunixo_user_notifications').upsert(notificationRows, { onConflict: 'source_key' });
        if (notice.error && !missingRelation(notice.error)) throw notice.error;
      }
    }
  }
  return payload.length;
}
