/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface SubjectResultRecord {
  id?: string;
  studentId: string;
  subjectId: string;
  examTermId: string;
  academicYearId: string;
  formativeMarks?: number | null;
  summativeMarks?: number | null;
  totalMarks?: number | null;
  maxMarks?: number | null;
  grade?: string | null;
  gradePoints?: number | null;
  status?: string | null;
}

export interface OverallResultRecord {
  id?: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  divisionId?: string | null;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string;
  passStatus: string;
  rankInClass?: number | null;
}

export class ResultService {
  /**
   * Fetch subject results for a student in an academic year
   */
  static async getStudentSubjectResults(
    studentId: string,
    academicYearId: string,
    examTermId?: string
  ): Promise<{ data: SubjectResultRecord[]; error: ERPError | null }> {
    try {
      let query = supabase
        .from('student_subject_results')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId);

      if (examTermId) {
        query = query.eq('exam_term_id', examTermId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: SubjectResultRecord[] = (data || []).map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        subjectId: r.subject_id,
        examTermId: r.exam_term_id,
        academicYearId: r.academic_year_id,
        formativeMarks: r.formative_marks,
        summativeMarks: r.summative_marks,
        totalMarks: r.total_marks,
        maxMarks: r.max_marks,
        grade: r.grade,
        gradePoints: r.grade_points,
        status: r.status
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Save or update subject results batch
   */
  static async upsertSubjectResults(results: SubjectResultRecord[]): Promise<{ success: boolean; error: ERPError | null }> {
    try {
      const payload = results.map(r => ({
        ...(r.id ? { id: r.id } : {}),
        student_id: r.studentId,
        subject_id: r.subjectId,
        exam_term_id: r.examTermId,
        academic_year_id: r.academicYearId,
        formative_marks: r.formativeMarks,
        summative_marks: r.summativeMarks,
        total_marks: r.totalMarks,
        max_marks: r.maxMarks,
        grade: r.grade,
        grade_points: r.gradePoints,
        status: r.status || 'Draft'
      }));

      const { error } = await supabase
        .from('student_subject_results')
        .upsert(payload, { onConflict: 'student_id,subject_id,exam_term_id,academic_year_id' });

      if (error) {
        return { success: false, error: handleSupabaseError(error) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: handleSupabaseError(err) };
    }
  }

  /**
   * Get Overall Result for a student
   */
  static async getStudentOverallResult(
    studentId: string,
    academicYearId: string
  ): Promise<{ data: OverallResultRecord | null; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('student_overall_results')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .single();

      if (error) {
        return { data: null, error: handleSupabaseError(error) };
      }

      const formatted: OverallResultRecord = {
        id: data.id,
        studentId: data.student_id,
        academicYearId: data.academic_year_id,
        classId: data.class_id,
        divisionId: data.division_id,
        totalMarksObtained: data.total_marks_obtained,
        totalMaxMarks: data.total_max_marks,
        percentage: data.percentage,
        overallGrade: data.overall_grade,
        passStatus: data.pass_status,
        rankInClass: data.rank_in_class
      };

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }
}
