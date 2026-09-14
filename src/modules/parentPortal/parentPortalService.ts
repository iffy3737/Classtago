import { supabase } from '../../lib/supabase';
import type { StudentPortalSnapshot, StudentServiceRequest } from '../studentPortal/studentPortalService';

export type ParentLinkedChild = {
  id: string;
  fullName: string;
  grNumber?: string | null;
  className?: string | null;
  divisionName?: string | null;
  status?: string | null;
};

export type ParentChildLinkState = {
  children: ParentLinkedChild[];
  pending: Array<{ id: string; studentId: string; studentName: string; grNumber?: string | null; requestCode?: string | null; requestedAt?: string | null }>;
};

async function authToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your Parent Portal session expired. Sign in again.');
  return data.session.access_token;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await authToken();
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Parent Portal request failed (${response.status}).`);
  return payload as T;
}

export const loadParentChildLinks = () => apiJson<ParentChildLinkState>('/api/parent/child-links');

export const loadParentPortalSnapshot = (studentId?: string | null) => {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return apiJson<StudentPortalSnapshot>(`/api/parent/portal/snapshot${query}`);
};

export async function openParentMaterial(materialId: string, studentId: string): Promise<string> {
  const payload = await apiJson<{ url: string }>(`/api/parent/portal/materials/${encodeURIComponent(materialId)}/access-url?studentId=${encodeURIComponent(studentId)}`);
  if (!payload.url) throw new Error('Study Material link is unavailable.');
  return payload.url;
}

export async function openParentDocument(documentId: string, studentId: string): Promise<string> {
  const payload = await apiJson<{ url: string }>(`/api/parent/portal/documents/${encodeURIComponent(documentId)}/access-url?studentId=${encodeURIComponent(studentId)}`);
  if (!payload.url) throw new Error('Child document link is unavailable.');
  return payload.url;
}

export const markParentNotificationRead = (notificationId: string) => apiJson<{ success: boolean }>(
  `/api/parent/portal/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' }
);

export async function loadParentServiceRequests(studentId: string) {
  const payload = await apiJson<{ requests: StudentServiceRequest[] }>(`/api/parent/portal/service-requests?studentId=${encodeURIComponent(studentId)}`);
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export const submitParentServiceRequest = (studentId: string, input: { type: 'certificate'|'library'|'profile_correction'|'support'; title: string; details: string }) => apiJson<{ success: boolean; request: StudentServiceRequest }>(
  '/api/parent/portal/service-requests', { method: 'POST', body: JSON.stringify({ studentId, ...input }) }
);

export async function loadParentLeaveApplications(studentId: string) {
  const payload = await apiJson<{ applications: any[] }>(`/api/parent/portal/leave-applications?studentId=${encodeURIComponent(studentId)}`);
  return Array.isArray(payload.applications) ? payload.applications : [];
}

export const submitParentLeaveApplication = (studentId: string, application: Record<string, unknown>) => apiJson<{ success: boolean; application?: any }>(
  '/api/parent/portal/leave-applications', { method: 'POST', body: JSON.stringify({ studentId, application }) }
);

export const requestAdditionalChildLink = (input: { childIdentifier: string; childDob?: string | null }) => apiJson<{ success: boolean; requestId: string; requestCode?: string; status: string; message?: string }>(
  '/api/parent/child-links', { method: 'POST', body: JSON.stringify(input) }
);
