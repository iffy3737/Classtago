import { supabase } from '../../lib/supabase';
import { loadAttendanceRoster } from '../teacherFresh/teacherFreshService';
import type { AttendanceStudent, TeacherCloudContext, TeacherScopeAssignment } from '../teacherFresh/types';
import { calculateComputed } from '../teacherResultFresh/resultTemplateConfig';
import { resolveResultTemplate } from '../teacherResultFresh/teacherResultService';
import type { ResultTemplateDefinition, ResultTerm } from '../teacherResultFresh/types';
import type {
  HeadmasterRecognitionRow,
  RecognitionPeriodType,
  RecognitionRating,
  RecognitionScores,
  StudentSubjectPerformance,
} from './types';
import { aggregateRecognitionRatings, clampStar, round1, scoreTotal } from './recognitionMath';

const missingTable = (e: any) => /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(e?.message || ''));
const clean = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff]+/g, ' ');
const isHindi = (value: unknown) => /hindi|हिंदी|ہندی/.test(clean(value));
const isMarathi = (value: unknown) => /marathi|मराठी|مراٹھی/.test(clean(value));
export const EMPTY_RECOGNITION_SCORES: RecognitionScores = {
  academicPerformance: 0,
  improvement: 0,
  consistency: 0,
  participation: 0,
  homework: 0,
};

export async function loadAssignedStudents(assignment: TeacherScopeAssignment): Promise<AttendanceStudent[]> {
  return loadAttendanceRoster(assignment);
}


function pickPerformanceHead(template: ResultTemplateDefinition, subjectName: string) {
  const section = isHindi(subjectName) ? 'hindi' : isMarathi(subjectName) ? 'marathi' : null;
  const heads = section ? template.heads.filter(head => head.ownerSection === section) : template.heads.filter(head => !head.ownerSection || head.ownerSection === 'subject');
  const directKey = section ? `${section}_total` : template.totalHeadKey;
  const direct = directKey ? heads.find(head => head.key === directKey) : undefined;
  if (direct) return direct;
  const calculatedTotals = heads.filter(head => head.kind === 'calculated' && head.formula === 'sum' && Number(head.maxMarks || 0) > 0);
  if (calculatedTotals.length) return [...calculatedTotals].sort((a, b) => Number(b.maxMarks || 0) - Number(a.maxMarks || 0))[0];
  const assessment = heads.find(head => head.key === 'assessment' || head.kind === 'mark');
  return assessment;
}

function pickGrade(template: ResultTemplateDefinition, subjectName: string, values: Record<string, string | number>) {
  const section = isHindi(subjectName) ? 'hindi' : isMarathi(subjectName) ? 'marathi' : null;
  const gradeHead = template.heads.find(head => head.kind === 'grade' && (!section || head.ownerSection === section))
    || (template.gradeHeadKey ? template.heads.find(head => head.key === template.gradeHeadKey) : undefined);
  return gradeHead ? String(values[gradeHead.key] ?? '') || null : null;
}

async function loadTermPerformance(
  context: TeacherCloudContext,
  assignment: TeacherScopeAssignment,
  term: ResultTerm,
): Promise<{ rows: Map<string, { percent?: number | null; grade?: string | null }>; backendReady: boolean }> {
  let q: any = supabase.from('edunixo_result_subject_lists').select('*')
    .eq('school_id', context.schoolId)
    .eq('academic_year_id', assignment.academicYearId)
    .eq('class_id', assignment.classId)
    .eq('teacher_user_id', context.userId)
    .eq('term', term);
  if (assignment.divisionId) q = q.eq('division_id', assignment.divisionId); else q = q.is('division_id', null);
  const lists = await q.order('updated_at', { ascending: false });
  if (lists.error) {
    if (missingTable(lists.error)) return { rows: new Map(), backendReady: false };
    throw lists.error;
  }
  const candidates = (lists.data || []).filter((row: any) => {
    const subjectMatches = String(row.subject_id || '') === String(assignment.subjectId)
      || clean(row.subject_name) === clean(assignment.subjectName);
    const combinedLanguage = row.section_key === 'hindi_marathi' && (isHindi(assignment.subjectName) || isMarathi(assignment.subjectName));
    return subjectMatches || combinedLanguage;
  });
  const list: any = candidates[0];
  if (!list) return { rows: new Map(), backendReady: true };

  const marks = await supabase.from('edunixo_result_subject_marks').select('student_id, marks, computed').eq('list_id', list.id);
  if (marks.error) {
    if (missingTable(marks.error)) return { rows: new Map(), backendReady: false };
    throw marks.error;
  }

  const resolved = list.template_snapshot && Array.isArray(list.template_snapshot?.heads)
    ? { template: list.template_snapshot as ResultTemplateDefinition }
    : await resolveResultTemplate({ ...assignment, term, ownedSections: ['subject'] });
  const template = resolved.template;
  const performanceHead = pickPerformanceHead(template, assignment.subjectName);
  const result = new Map<string, { percent?: number | null; grade?: string | null }>();
  for (const row of marks.data || []) {
    const computed = { ...(row.computed || {}), ...calculateComputed(template, row.marks || {}) };
    const values = { ...(row.marks || {}), ...computed };
    const raw = performanceHead ? Number(values[performanceHead.key]) : NaN;
    const max = Number(performanceHead?.maxMarks || 0);
    result.set(String(row.student_id), {
      percent: Number.isFinite(raw) && max > 0 ? round1((raw / max) * 100) : null,
      grade: pickGrade(template, assignment.subjectName, values),
    });
  }
  return { rows: result, backendReady: true };
}

export async function loadStudentSubjectPerformance(
  context: TeacherCloudContext,
  assignment: TeacherScopeAssignment,
  students: AttendanceStudent[],
): Promise<{ rows: StudentSubjectPerformance[]; backendReady: boolean }> {
  const [first, second] = await Promise.all([
    loadTermPerformance(context, assignment, 'first_term'),
    loadTermPerformance(context, assignment, 'second_term'),
  ]);
  return {
    backendReady: first.backendReady && second.backendReady,
    rows: students.map(student => ({
      studentId: student.id,
      firstTermPercent: first.rows.get(student.id)?.percent ?? null,
      firstTermGrade: first.rows.get(student.id)?.grade ?? null,
      secondTermPercent: second.rows.get(student.id)?.percent ?? null,
      secondTermGrade: second.rows.get(student.id)?.grade ?? null,
    })),
  };
}

function ratingFromRow(row: any): RecognitionRating {
  return {
    id: row.id,
    schoolId: String(row.school_id),
    academicYearId: String(row.academic_year_id),
    academicYear: String(row.academic_year || ''),
    classId: String(row.class_id),
    className: String(row.class_name || 'Class'),
    divisionId: row.division_id || undefined,
    division: String(row.division_name || 'No Division'),
    subjectId: String(row.subject_id),
    subjectName: String(row.subject_name || 'Subject'),
    teacherUserId: String(row.teacher_user_id),
    teacherRecordId: String(row.teacher_record_id || ''),
    teacherName: String(row.teacher_name || 'Teacher'),
    studentId: String(row.student_id),
    studentName: String(row.student_name || 'Student'),
    grNumber: row.gr_number || undefined,
    periodType: row.period_type,
    periodKey: String(row.period_key),
    academicPerformance: Number(row.academic_performance || 0),
    improvement: Number(row.improvement || 0),
    consistency: Number(row.consistency || 0),
    participation: Number(row.participation || 0),
    homework: Number(row.homework || 0),
    totalPoints: Number(row.total_points || 0),
    updatedAt: row.updated_at || undefined,
  };
}

export async function loadRecognitionRatings(
  context: TeacherCloudContext,
  assignment: TeacherScopeAssignment,
  periodType: RecognitionPeriodType,
  periodKey: string,
): Promise<{ ratings: RecognitionRating[]; backendReady: boolean }> {
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const query = new URLSearchParams({
    classId: assignment.classId,
    className: assignment.className || '',
    divisionName: assignment.division || '',
    subjectId: assignment.subjectId || '',
    subjectName: assignment.subjectName || '',
    academicYearId: assignment.academicYearId || '',
    periodType,
    periodKey,
  });
  if (assignment.divisionId) query.set('divisionId', assignment.divisionId);
  const response = await fetch(`/api/teacher/recognition?${query.toString()}`, {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Recognition ratings could not be loaded.');
  return {
    ratings: (Array.isArray(payload.rows) ? payload.rows : []).map(ratingFromRow),
    backendReady: payload.backendReady !== false,
  };
}

export async function saveRecognitionRating(input: {
  context: TeacherCloudContext;
  assignment: TeacherScopeAssignment;
  student: AttendanceStudent;
  periodType: RecognitionPeriodType;
  periodKey: string;
  scores: RecognitionScores;
}) {
  const scores: RecognitionScores = {
    academicPerformance: clampStar(input.scores.academicPerformance),
    improvement: clampStar(input.scores.improvement),
    consistency: clampStar(input.scores.consistency),
    participation: clampStar(input.scores.participation),
    homework: clampStar(input.scores.homework),
  };
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  const response = await fetch('/api/teacher/recognition', {
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
      subjectName: input.assignment.subjectName || '',
      academicYearId: input.assignment.academicYearId || null,
      academicYear: input.assignment.academicYear || input.context.academicYear,
      studentId: input.student.id,
      periodType: input.periodType,
      periodKey: input.periodKey,
      scores,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Recognition rating could not be saved.');
  if (!payload.row) throw new Error('Recognition rating was saved without a returned cloud row. Refresh and retry.');
  return ratingFromRow(payload.row);
}

export async function resolveHeadmasterRecognitionContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Secure Headmaster session unavailable.');
  let membership = await supabase.from('user_school_memberships').select('school_id, role_in_school').eq('user_id', user.id).eq('membership_active', true).limit(1).maybeSingle();
  if (membership.error && /membership_active/i.test(String(membership.error.message || ''))) {
    membership = await supabase.from('user_school_memberships').select('school_id, role_in_school').eq('user_id', user.id).limit(1).maybeSingle();
  }
  if (membership.error) throw membership.error;
  const schoolId = String((membership.data as any)?.school_id || '');
  if (!schoolId) throw new Error('Headmaster school membership is not linked.');

  let year: any = null;
  const current = await supabase.from('school_academic_years').select('id, year_code').eq('school_id', schoolId).eq('is_active', true).limit(1).maybeSingle();
  if (!current.error && current.data) year = current.data;
  if (!year) {
    const legacy = await supabase.from('academic_years').select('id, year_name').eq('school_id', schoolId).eq('is_current', true).limit(1).maybeSingle();
    if (!legacy.error && legacy.data) year = { id: (legacy.data as any).id, year_code: (legacy.data as any).year_name };
  }
  return { schoolId, academicYearId: String(year?.id || ''), academicYear: String(year?.year_code || 'Current Academic Year') };
}

export async function loadHeadmasterRecognitionRankings(input: {
  schoolId: string;
  academicYearId?: string;
  periodType: RecognitionPeriodType;
  periodKey: string;
}): Promise<{ rows: HeadmasterRecognitionRow[]; backendReady: boolean }> {
  let q: any = supabase.from('edunixo_student_recognition_ratings').select('*')
    .eq('school_id', input.schoolId)
    .eq('period_type', input.periodType)
    .eq('period_key', input.periodKey);
  if (input.academicYearId) q = q.eq('academic_year_id', input.academicYearId);
  const response = await q.order('updated_at', { ascending: false });
  if (response.error) {
    if (missingTable(response.error)) return { rows: [], backendReady: false };
    throw response.error;
  }
  const ratings = (response.data || []).map(ratingFromRow);
  return { rows: aggregateRecognitionRatings(ratings), backendReady: true };
}
