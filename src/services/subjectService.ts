/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface SubjectRecord {
  id: string;
  schoolId: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  isActive: boolean;
}

const mapSubject = (row: any): SubjectRecord => ({
  id: String(row.id),
  schoolId: String(row.school_id || ''),
  subjectCode: String(row.subject_code || ''),
  subjectName: String(row.subject_name || ''),
  subjectType: String(row.subject_type || 'Core'),
  isActive: row.is_active ?? true
});

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw error || new Error('Your login session has expired. Please sign in again.');
  }
  return session.access_token;
}

async function parseApiResponse(response: Response): Promise<any> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

export class SubjectService {
  /** Read access is shared by Teacher Master, Timetable and other role dashboards under Supabase RLS. */
  static async getSubjects(activeOnly = false): Promise<{ data: SubjectRecord[]; error: ERPError | null }> {
    try {
      let query = supabase
        .from('subjects')
        .select('id, school_id, subject_name, subject_code, subject_type, is_active')
        .order('subject_name', { ascending: true });
      if (activeOnly) query = query.eq('is_active', true);

      const { data, error } = await query;
      if (error) return { data: [], error: handleSupabaseError(error) };
      return { data: (data || []).map(mapSubject), error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /** All destructive or administrative writes go through authenticated server routes. */
  static async createSubject(input: { subjectName: string; subjectCode?: string; subjectType?: string }) {
    try {
      if (!input.subjectName?.trim()) throw new Error('Subject name is required.');
      if (input.subjectCode !== undefined && input.subjectCode !== null && input.subjectCode.trim() === '') throw new Error('Subject code cannot be blank.');
      const token = await getAccessToken();
      const response = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subjectName: input.subjectName.trim(),
          subjectCode: input.subjectCode?.trim() || undefined,
          subjectType: input.subjectType || 'Core'
        })
      });
      const payload = await parseApiResponse(response);
      return { data: mapSubject(payload.subject), error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }

  static async updateSubject(id: string, input: Partial<{ subjectName: string; subjectCode: string; subjectType: string; isActive: boolean }>) {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/subjects/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input)
      });
      const payload = await parseApiResponse(response);
      return { data: mapSubject(payload.subject), error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }

  static async bulkSetActive(ids: string[], isActive: boolean) {
    try {
      const cleanIds = [...new Set((ids || []).map(String).map(v => v.trim()).filter(Boolean))];
      if (!cleanIds.length) throw new Error('Select at least one subject.');
      const token = await getAccessToken();
      const response = await fetch('/api/admin/subjects/bulk-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: cleanIds, isActive })
      });
      const payload = await parseApiResponse(response);
      return { data: payload.subjects || [], error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }

  static async deleteSubject(id: string) {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/subjects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await parseApiResponse(response);
      return { error: null };
    } catch (err: any) {
      return { error: handleSupabaseError(err) };
    }
  }
}
