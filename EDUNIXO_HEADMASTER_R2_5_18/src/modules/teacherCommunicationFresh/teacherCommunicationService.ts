import { supabase } from '../../lib/supabase';
import type { TeacherCloudContext } from '../teacherFresh/types';
import type {
  CommunicationAudience,
  CommunicationChannel,
  CommunicationChannelReadiness,
  CommunicationHistoryItem,
  CommunicationNotice,
  CommunicationPriority,
  CommunicationRecipient,
  CommunicationSendResult,
  HomeworkNotificationItem,
  TeacherCommunicationScope,
  TeacherCommunicationSenderIdentity,
} from './types';

const norm = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const missingTable = (e: any) => /does not exist|schema cache|could not find|relation .* does not exist/i.test(String(e?.message || ''));

async function authToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your Teacher session expired. Sign in again.');
  return data.session.access_token;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await authToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Communication request failed (${response.status}).`);
  return payload as T;
}

export async function loadTeacherCommunicationScopes(_context: TeacherCloudContext): Promise<{
  scopes: TeacherCommunicationScope[];
  channelReadiness: CommunicationChannelReadiness;
  academicYear?: string;
  senderIdentity?: TeacherCommunicationSenderIdentity;
}> {
  const payload = await apiJson<any>('/api/teacher/communication/scopes');
  return {
    scopes: Array.isArray(payload.scopes) ? payload.scopes : [],
    channelReadiness: payload.channelReadiness || { website: true, whatsapp: false, sms: false, email: false },
    academicYear: payload.academicYear || undefined,
    senderIdentity: payload.senderIdentity || undefined,
  };
}

export async function loadCommunicationRecipients(scope: TeacherCommunicationScope): Promise<CommunicationRecipient[]> {
  const payload = await apiJson<any>(`/api/teacher/communication/recipients?scopeId=${encodeURIComponent(scope.id)}`);
  return Array.isArray(payload.recipients) ? payload.recipients : [];
}

async function firstReadableSchoolTable(tableNames: string[], schoolId: string) {
  for (const table of tableNames) {
    const response = await supabase.from(table).select('*').eq('school_id', schoolId).limit(300);
    if (!response.error) return { table, rows: response.data || [] };
    if (!missingTable(response.error)) return { table, rows: [] };
  }
  return { table: undefined as string | undefined, rows: [] as any[] };
}

export async function loadTeacherSchoolNotices(context: TeacherCloudContext): Promise<{ notices: CommunicationNotice[]; sourceAvailable: boolean }> {
  const source = await firstReadableSchoolTable(['school_notices', 'notices', 'announcements'], context.schoolId);
  const notices = source.rows
    .filter((row: any) => row.is_active !== false && !['archived','deleted','draft'].includes(norm(row.status)))
    .filter((row: any) => {
      const target = norm(row.target_role || row.audience || row.target_audience || row.role);
      return !target || target.includes('all') || target.includes('staff') || target.includes('teacher');
    })
    .map((row: any, index: number) => ({
      id: String(row.id || `notice-${index}`),
      title: String(row.title || row.notice_title || row.subject || 'School Notice'),
      body: String(row.body || row.content || row.message || row.description || '') || undefined,
      category: String(row.category || row.notice_type || row.type || '') || undefined,
      publishedAt: String(row.published_at || row.notice_date || row.created_at || '') || undefined,
      isPinned: Boolean(row.is_pinned || row.pinned),
      attachmentUrl: String(row.attachment_url || row.file_url || '') || undefined,
    }));
  return { notices, sourceAvailable: Boolean(source.table) };
}

export async function loadPublishedHomework(_context: TeacherCloudContext, scope: TeacherCommunicationScope): Promise<{ items: HomeworkNotificationItem[]; backendReady: boolean }> {
  const payload = await apiJson<any>(`/api/teacher/communication/homework?scopeId=${encodeURIComponent(scope.id)}`);
  return { items: Array.isArray(payload.items) ? payload.items : [], backendReady: payload.backendReady !== false };
}

export async function sendTeacherCommunication(input: {
  context: TeacherCloudContext;
  scope: TeacherCommunicationScope;
  recipients: CommunicationRecipient[];
  title: string;
  body: string;
  messageType: 'announcement' | 'homework' | 'direct';
  channels: CommunicationChannel[];
  audience: CommunicationAudience;
  languageCode: string;
  languageName: string;
  priority?: CommunicationPriority;
  sourceRecordId?: string;
}): Promise<CommunicationSendResult> {
  return apiJson<CommunicationSendResult>('/api/teacher/communication/send', {
    method: 'POST',
    body: JSON.stringify({
      scopeId: input.scope.id,
      recipientStudentIds: input.recipients.map(r => r.studentId),
      teacherName: input.context.teacherName,
      title: input.title,
      body: input.body,
      messageType: input.messageType,
      channels: input.channels,
      audience: input.audience,
      languageCode: input.languageCode,
      languageName: input.languageName,
      priority: input.priority || 'normal',
      sourceRecordId: input.sourceRecordId || null,
    }),
  });
}

export async function loadTeacherCommunicationHistory(_context: TeacherCloudContext): Promise<{ rows: CommunicationHistoryItem[]; backendReady: boolean }> {
  const payload = await apiJson<any>('/api/teacher/communication/history');
  return { rows: Array.isArray(payload.rows) ? payload.rows : [], backendReady: payload.backendReady !== false };
}
