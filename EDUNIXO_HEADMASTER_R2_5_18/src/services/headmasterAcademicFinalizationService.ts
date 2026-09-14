import { supabase } from '../lib/supabase';

export type AcademicRef = { id: string; name: string; classId?: string | null; academicYearId?: string | null; isActive?: boolean };

export type ExamScheduleRow = {
  id: string; academicYearId: string; examKey: string; examName: string; term?: string | null;
  classId: string; className: string; divisionId?: string | null; divisionName?: string | null;
  subjectId: string; subjectName: string; examDate: string; startTime?: string | null; endTime?: string | null;
  durationMinutes?: number | null; totalMarks?: number | null; room?: string | null; instructions?: string | null;
  status: 'draft' | 'published' | 'cancelled'; updatedAt?: string | null; publishedAt?: string | null;
};

export type ResultWorkflowSnapshot = {
  academicYears: AcademicRef[]; classes: AcademicRef[]; divisions: AcademicRef[];
  subjectLists: any[]; resultBooks: any[]; progressBatches: any[];
  summary: { subjectLists: Record<string, number>; resultBooks: Record<string, number>; progressBatches: Record<string, number> };
};

export type ResultAnalyticsSnapshot = {
  generatedAt: string;
  academicYears: AcademicRef[]; classes: AcademicRef[]; divisions: AcademicRef[];
  overview: { finalBatches: number; students: number; averagePercent: number | null; passRate: number | null };
  classAnalysis: any[]; subjectAnalysis: any[]; teacherAnalysis: any[]; toppers: any[]; students: any[]; history: any[];
  promotionCandidates: any[]; promotionDecisions: any[];
};

async function secureFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${session.access_token}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Headmaster Academic service request failed.');
  return payload as T;
}

export const loadHeadmasterExamSchedule = () => secureFetch<{ rows: ExamScheduleRow[]; academicYears: AcademicRef[]; classes: AcademicRef[]; divisions: AcademicRef[]; subjects: AcademicRef[] }>('/api/headmaster/exam-schedule-r33-29');
export const saveHeadmasterExamSchedule = (payload: any, id?: string) => secureFetch<{ success: boolean; row: ExamScheduleRow }>(id ? `/api/headmaster/exam-schedule-r33-29/${encodeURIComponent(id)}` : '/api/headmaster/exam-schedule-r33-29', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
export const setHeadmasterExamScheduleStatus = (id: string, action: 'publish' | 'cancel' | 'draft') => secureFetch<{ success: boolean; row: ExamScheduleRow }>(`/api/headmaster/exam-schedule-r33-29/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ action }) });

export const loadHeadmasterCombinedQuestionPapers = () => secureFetch<{ groups: any[] }>('/api/headmaster/combined-question-papers-r33-29');
export const finalizeHeadmasterCombinedQuestionPaper = (collaborationKey: string) => secureFetch<{ success: boolean }>('/api/headmaster/combined-question-papers-r33-29/finalize', { method: 'POST', body: JSON.stringify({ collaborationKey }) });

export const loadHeadmasterResultWorkflow = () => secureFetch<ResultWorkflowSnapshot>('/api/headmaster/result-control-r33-29');
export const loadHeadmasterResultAnalytics = () => secureFetch<ResultAnalyticsSnapshot>('/api/headmaster/result-analytics-r33-29');
export const proposePromotionDecision = (payload: any) => secureFetch<{ success: boolean; decision: any }>('/api/headmaster/promotion-decisions-r33-29', { method: 'POST', body: JSON.stringify(payload) });
export const executePromotionDecision = (decisionId: string) => secureFetch<{ success: boolean; decision: any; student: any }>(`/api/headmaster/promotion-decisions-r33-29/${encodeURIComponent(decisionId)}/execute`, { method: 'POST' });
export const cancelPromotionDecision = (decisionId: string) => secureFetch<{ success: boolean; decision: any }>(`/api/headmaster/promotion-decisions-r33-29/${encodeURIComponent(decisionId)}/cancel`, { method: 'POST' });
