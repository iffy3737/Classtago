import { supabase } from '../../lib/supabase';
import type { TeacherLeaveApplication, TeacherLeaveSettings } from './types';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your Teacher login session has expired. Sign in again.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Teacher Leave & Personal HR request failed.');
  return payload as T;
}

export async function loadTeacherLeaveApplications(): Promise<TeacherLeaveApplication[]> {
  const payload = await request<{ applications?: TeacherLeaveApplication[] }>('/api/leave-management/applications');
  return Array.isArray(payload.applications) ? payload.applications : [];
}

export async function loadTeacherLeaveSettings(): Promise<TeacherLeaveSettings> {
  return request<TeacherLeaveSettings>('/api/leave-management/settings');
}

export async function submitTeacherLeaveApplication(application: Record<string, unknown>): Promise<TeacherLeaveApplication> {
  const payload = await request<{ application: TeacherLeaveApplication }>('/api/leave-management/applications', {
    method: 'POST',
    body: JSON.stringify({ application }),
  });
  return payload.application;
}

export async function cancelTeacherLeaveApplication(requestId: string): Promise<void> {
  await request(`/api/leave-management/applications/${encodeURIComponent(requestId)}/cancel`, { method: 'POST', body: '{}' });
}
