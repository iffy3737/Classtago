/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface StudentRecord {
  id: string;
  userId?: string | null;
  schoolId?: string | null;
  grNumber: string;
  rollNo?: number | null;
  fullName: string;
  gender?: string | null;
  classId?: string | null;
  divisionId?: string | null;
  academicYearId?: string | null;
  className?: string | null;
  divisionName?: string | null;
  dob?: string | null;
  aadhaarNumber?: string | null;
  religion?: string | null;
  caste?: string | null;
  category?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  mobileNumber?: string | null;
  status: string;
}

export class StudentService {
  /**
   * Fetch all students for current school scope
   */
  static async getStudents(schoolId?: string, classId?: string, divisionId?: string): Promise<{ data: StudentRecord[]; error: ERPError | null }> {
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          user_id,
          school_id,
          gr_number,
          roll_number,
          first_name,
          middle_name,
          last_name,
          gender,
          class_id,
          division_id,
          academic_year_id,
          date_of_birth,
          aadhaar_number,
          father_name,
          mother_name,
          mobile_number,
          status,
          classes:class_id (class_name),
          divisions:division_id (division_name)
        `);

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      if (classId) {
        query = query.eq('class_id', classId);
      }
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: StudentRecord[] = (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        schoolId: s.school_id,
        grNumber: s.gr_number,
        rollNo: s.roll_number,
        fullName: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
        gender: s.gender,
        classId: s.class_id,
        divisionId: s.division_id,
        academicYearId: s.academic_year_id,
        className: s.classes?.class_name || 'Unassigned',
        divisionName: s.divisions?.division_name || '',
        dob: s.date_of_birth,
        aadhaarNumber: s.aadhaar_number,
        fatherName: s.father_name,
        motherName: s.mother_name,
        mobileNumber: s.mobile_number,
        status: s.status || 'Active'
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Fetch single student by ID
   */
  static async getStudentById(studentId: string): Promise<{ data: StudentRecord | null; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          school_id,
          gr_number,
          roll_number,
          first_name,
          middle_name,
          last_name,
          gender,
          class_id,
          division_id,
          academic_year_id,
          date_of_birth,
          aadhaar_number,
          father_name,
          mother_name,
          mobile_number,
          status,
          classes:class_id (class_name),
          divisions:division_id (division_name)
        `)
        .eq('id', studentId)
        .single();

      if (error) {
        return { data: null, error: handleSupabaseError(error) };
      }

      const formatted: StudentRecord = {
        id: data.id,
        userId: data.user_id,
        schoolId: data.school_id,
        grNumber: data.gr_number,
        rollNo: data.roll_number,
        fullName: [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' '),
        gender: data.gender,
        classId: data.class_id,
        divisionId: data.division_id,
        academicYearId: data.academic_year_id,
        className: (data.classes as any)?.class_name || 'Unassigned',
        divisionName: (data.divisions as any)?.division_name || '',
        dob: data.date_of_birth,
        aadhaarNumber: data.aadhaar_number,
        fatherName: data.father_name,
        motherName: data.mother_name,
        mobileNumber: data.mobile_number,
        status: data.status || 'Active'
      };

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }
}
