import { supabase } from '../../lib/supabase';

export type StudentPortalProfile = {
  id: string;
  fullName: string;
  grNumber?: string | null;
  rollNo?: string | number | null;
  classId?: string | null;
  className: string;
  divisionId?: string | null;
  divisionName: string;
  academicYearId?: string | null;
  academicYear: string;
  gender?: string | null;
  dob?: string | null;
  mobileNumber?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  address?: string | null;
  admissionDate?: string | null;
  childUid?: string | null;
  examSeatNo?: string | null;
  aadhaarNumber?: string | null;
  accountEmail?: string | null;
  accountPhone?: string | null;
  accountStatus?: string | null;
};

export type StudentPortalSnapshot = {
  profile: StudentPortalProfile;
  access: Record<string, boolean>;
  attendance: { available: boolean; rows: any[]; present: number; absent: number; total: number; rate: number | null };
  timetable: { available: boolean; rows: any[]; substitutions: any[] };
  subjects: { available: boolean; rows: any[] };
  calendar: { available: boolean; terms: any[]; holidays: any[] };
  homework: { available: boolean; rows: any[] };
  materials: { available: boolean; rows: any[] };
  exams: { available: boolean; source?: string | null; rows: any[] };
  results: { available: boolean; rows: any[] };
  progressCards: { available: boolean; rows: any[] };
  recognition: { available: boolean; rows: any[] };
  notices: { available: boolean; rows: any[] };
  fees: { available: boolean; source?: string | null; rows: any[] };
  library: { available: boolean; source?: string | null; rows: any[] };
  documents: { available: boolean; rows: any[] };
  generatedAt: string;
};

async function authToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your Student Portal session expired. Sign in again.');
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
  if (!response.ok) throw new Error(payload?.error || `Student Portal request failed (${response.status}).`);
  return payload as T;
}

export const loadStudentPortalSnapshot = () => apiJson<StudentPortalSnapshot>('/api/student/portal/snapshot');

export async function openStudentMaterial(materialId: string): Promise<string> {
  const payload = await apiJson<{ url: string }>(`/api/student/portal/materials/${encodeURIComponent(materialId)}/access-url`);
  if (!payload.url) throw new Error('Study Material link is unavailable.');
  return payload.url;
}

export async function openStudentDocument(documentId: string): Promise<string> {
  const payload = await apiJson<{ url: string }>(`/api/student/portal/documents/${encodeURIComponent(documentId)}/access-url`);
  if (!payload.url) throw new Error('Student document link is unavailable.');
  return payload.url;
}

export async function markStudentNotificationRead(notificationId: string) {
  return apiJson<{ success: boolean }>(`/api/student/portal/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' });
}

export type StudentServiceRequest = {
  id: string;
  type: 'certificate' | 'library' | 'profile_correction' | 'support' | string;
  title: string;
  details: string;
  status: string;
  createdAt?: string | null;
  resolution?: string | null;
  decidedAt?: string | null;
};

export async function loadStudentServiceRequests() {
  const payload = await apiJson<{ requests: StudentServiceRequest[] }>('/api/student/portal/service-requests');
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export async function submitStudentServiceRequest(input: { type: 'certificate' | 'library' | 'profile_correction' | 'support'; title: string; details: string }) {
  return apiJson<{ success: boolean; request: StudentServiceRequest }>('/api/student/portal/service-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loadStudentLeaveApplications() {
  const payload = await apiJson<{ applications: any[] }>('/api/leave-management/applications');
  return Array.isArray(payload.applications) ? payload.applications.filter(item => String(item.applicantRole || '').toLowerCase() === 'student') : [];
}

export async function submitStudentLeaveApplication(input: Record<string, unknown>) {
  return apiJson<{ success: boolean; application?: any }>('/api/leave-management/applications', {
    method: 'POST',
    body: JSON.stringify({ application: input }),
  });
}
