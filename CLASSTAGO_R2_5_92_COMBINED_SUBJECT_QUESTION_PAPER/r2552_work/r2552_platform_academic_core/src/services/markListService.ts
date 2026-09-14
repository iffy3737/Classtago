/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface StudentMarkEntryRecord {
  id?: string;
  studentId: string;
  subjectId: string;
  classId: string;
  divisionId?: string | null;
  academicYearId: string;
  examTermId: string;
  formativeMarks?: number | null;
  summativeMarks?: number | null;
  totalMarks?: number | null;
  grade?: string | null;
  isAbsent?: boolean;
}

export interface SubjectLockStateRecord {
  id?: string;
  classId: string;
  divisionId?: string | null;
  subjectId: string;
  academicYearId: string;
  examTermId: string;
  isLocked: boolean;
  lockedByUserId?: string | null;
  lockedAt?: string | null;
}

export class MarkListService {
  /**
   * Fetch mark entries for a class, division, subject, and exam term
   */
  static async getMarkEntries(
    classId: string,
    subjectId: string,
    academicYearId: string,
    examTermId: string,
    divisionId?: string
  ): Promise<{ data: StudentMarkEntryRecord[]; error: ERPError | null }> {
    try {
      let query = supabase
        .from('student_mark_entries')
        .select('*')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('academic_year_id', academicYearId)
        .eq('exam_term_id', examTermId);

      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: StudentMarkEntryRecord[] = (data || []).map((m: any) => ({
        id: m.id,
        studentId: m.student_id,
        subjectId: m.subject_id,
        classId: m.class_id,
        divisionId: m.division_id,
        academicYearId: m.academic_year_id,
        examTermId: m.exam_term_id,
        formativeMarks: m.formative_marks,
        summativeMarks: m.summative_marks,
        totalMarks: m.total_marks,
        grade: m.grade,
        isAbsent: m.is_absent || false
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Save mark entries
   */
  static async saveMarkEntries(entries: StudentMarkEntryRecord[]): Promise<{ success: boolean; error: ERPError | null }> {
    try {
      const payload = entries.map(e => ({
        ...(e.id ? { id: e.id } : {}),
        student_id: e.studentId,
        subject_id: e.subjectId,
        class_id: e.classId,
        division_id: e.divisionId,
        academic_year_id: e.academicYearId,
        exam_term_id: e.examTermId,
        formative_marks: e.formativeMarks,
        summative_marks: e.summativeMarks,
        total_marks: e.totalMarks,
        grade: e.grade,
        is_absent: e.isAbsent || false
      }));

      const { error } = await supabase
        .from('student_mark_entries')
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
   * Get subject lock state
   */
  static async getSubjectLockState(
    classId: string,
    subjectId: string,
    academicYearId: string,
    examTermId: string,
    divisionId?: string
  ): Promise<{ isLocked: boolean; lockRecord: SubjectLockStateRecord | null; error: ERPError | null }> {
    try {
      let query = supabase
        .from('subject_lock_states')
        .select('*')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('academic_year_id', academicYearId)
        .eq('exam_term_id', examTermId);

      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return { isLocked: false, lockRecord: null, error: handleSupabaseError(error) };
      }

      if (!data) {
        return { isLocked: false, lockRecord: null, error: null };
      }

      const lockRecord: SubjectLockStateRecord = {
        id: data.id,
        classId: data.class_id,
        divisionId: data.division_id,
        subjectId: data.subject_id,
        academicYearId: data.academic_year_id,
        examTermId: data.exam_term_id,
        isLocked: data.is_locked || false,
        lockedByUserId: data.locked_by_user_id,
        lockedAt: data.locked_at
      };

      return { isLocked: lockRecord.isLocked, lockRecord, error: null };
    } catch (err: any) {
      return { isLocked: false, lockRecord: null, error: handleSupabaseError(err) };
    }
  }

  /**
   * Lock/Unlock subject marks entry
   */
  static async setSubjectLockState(
    classId: string,
    subjectId: string,
    academicYearId: string,
    examTermId: string,
    isLocked: boolean,
    userId: string,
    divisionId?: string
  ): Promise<{ success: boolean; error: ERPError | null }> {
    try {
      const payload = {
        class_id: classId,
        division_id: divisionId,
        subject_id: subjectId,
        academic_year_id: academicYearId,
        exam_term_id: examTermId,
        is_locked: isLocked,
        locked_by_user_id: userId,
        locked_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('subject_lock_states')
        .upsert(payload, { onConflict: 'class_id,subject_id,exam_term_id,academic_year_id' });

      if (error) {
        return { success: false, error: handleSupabaseError(error) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: handleSupabaseError(err) };
    }
  }
}
