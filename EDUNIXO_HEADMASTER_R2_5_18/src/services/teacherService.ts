/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface TeacherRecord {
  id: string;
  userId?: string | null;
  shalarthId?: string | null;
  fullName: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  classTeacherClassId?: string | null;
  status: string;
}

export interface SubjectAllocationRecord {
  id: string;
  teacherId: string;
  classId: string;
  divisionId?: string | null;
  subjectId: string;
  academicYearId: string;
  subjectName?: string | null;
  className?: string | null;
  divisionName?: string | null;
}

export class TeacherService {
  /**
   * Get list of teachers
   */
  static async getTeachers(schoolId?: string): Promise<{ data: TeacherRecord[]; error: ERPError | null }> {
    try {
      let query = supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          shalarth_id,
          full_name,
          designation,
          email,
          mobile_number,
          status
        `);

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: TeacherRecord[] = (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        shalarthId: t.shalarth_id,
        fullName: t.full_name || 'Teacher',
        designation: t.designation || 'Assistant Teacher',
        email: t.email,
        phone: t.mobile_number,
        status: t.status || 'Active'
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Get subject allocations for a specific teacher
   */
  static async getSubjectAllocations(teacherId: string, academicYearId?: string): Promise<{ data: SubjectAllocationRecord[]; error: ERPError | null }> {
    try {
      let query = supabase
        .from('subject_teachers')
        .select(`
          id,
          teacher_id,
          class_id,
          division_id,
          subject_id,
          academic_year_id,
          subjects:subject_id (name_en),
          classes:class_id (class_name),
          divisions:division_id (division_name)
        `)
        .eq('teacher_id', teacherId);

      if (academicYearId) {
        query = query.eq('academic_year_id', academicYearId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: SubjectAllocationRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        teacherId: item.teacher_id,
        classId: item.class_id,
        divisionId: item.division_id,
        subjectId: item.subject_id,
        academicYearId: item.academic_year_id,
        subjectName: item.subjects?.name_en || 'Subject',
        className: item.classes?.class_name || '',
        divisionName: item.divisions?.division_name || ''
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Get Class Teacher Assignment
   */
  static async getClassTeacherAssignment(teacherId: string, academicYearId?: string): Promise<{ classId: string | null; divisionId: string | null; error: ERPError | null }> {
    try {
      let query = supabase
        .from('class_teachers')
        .select('class_id, division_id')
        .eq('teacher_id', teacherId)
        .limit(1);

      if (academicYearId) {
        query = query.eq('academic_year_id', academicYearId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return { classId: null, divisionId: null, error: error ? handleSupabaseError(error) : null };
      }

      return { classId: data[0].class_id, divisionId: data[0].division_id, error: null };
    } catch (err: any) {
      return { classId: null, divisionId: null, error: handleSupabaseError(err) };
    }
  }
}
