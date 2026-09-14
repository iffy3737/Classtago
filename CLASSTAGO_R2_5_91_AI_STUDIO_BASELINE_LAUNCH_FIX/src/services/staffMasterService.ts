import { supabase } from '../lib/supabase';

export type CloudStaffMasterRecord = {
  id: string;
  userId: string | null;
  fullName: string;
  employeeId: string;
  shalarthId: string;
  designation: string;
  mobileNumber: string;
  qualification: string;
  joiningDate: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type StaffMasterInput = {
  fullName: string;
  employeeId?: string;
  shalarthId?: string;
  designation: string;
  mobileNumber?: string;
  qualification?: string;
  joiningDate?: string;
};

const token = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw error || new Error('Secure session unavailable. Please sign in again.');
  return session.access_token;
};

const map = (row: any): CloudStaffMasterRecord => ({
  id: String(row.id || ''),
  userId: row.user_id ? String(row.user_id) : null,
  fullName: String(row.full_name || ''),
  employeeId: String(row.employee_id || ''),
  shalarthId: String(row.shalarth_id || ''),
  designation: String(row.designation || ''),
  mobileNumber: String(row.mobile_number || ''),
  qualification: String(row.qualification || ''),
  joiningDate: String(row.joining_date || ''),
  isActive: row.is_active !== false,
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const api = async (url: string, options: RequestInit = {}) => {
  const accessToken = await token();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
};

export const StaffMasterService = {
  async list(): Promise<CloudStaffMasterRecord[]> {
    const payload = await api('/api/admin/staff-master');
    return (payload.records || []).map(map);
  },
  async create(input: StaffMasterInput): Promise<CloudStaffMasterRecord> {
    const payload = await api('/api/admin/staff-master', { method: 'POST', body: JSON.stringify(input) });
    return map(payload.record);
  },
  async update(id: string, input: StaffMasterInput): Promise<CloudStaffMasterRecord> {
    const payload = await api(`/api/admin/staff-master/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
    return map(payload.record);
  },
  async setActive(id: string, isActive: boolean): Promise<CloudStaffMasterRecord> {
    const payload = await api(`/api/admin/staff-master/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ isActive }) });
    return map(payload.record);
  },
  async remove(id: string): Promise<void> {
    await api(`/api/admin/staff-master/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
};
