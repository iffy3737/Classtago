/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface ProgressCardRecord {
  id: string;
  studentId: string;
  classId: string;
  divisionId?: string | null;
  academicYearId: string;
  templateId?: string | null;
  attendancePercentage?: number | null;
  workingDaysCount?: number | null;
  presentDaysCount?: number | null;
  classTeacherRemarks?: string | null;
  headmasterRemarks?: string | null;
  approvalStatus: 'Draft' | 'Submitted_By_Teacher' | 'Verified_By_Clerk' | 'Approved_By_HM' | 'Published';
  issueDate?: string | null;
  pdfStoragePath?: string | null;
}

export class ProgressCardService {
  /**
   * Get progress card for a student
   */
  static async getStudentProgressCard(
    studentId: string,
    academicYearId: string
  ): Promise<{ data: ProgressCardRecord | null; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('progress_cards')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .single();

      if (error) {
        return { data: null, error: handleSupabaseError(error) };
      }

      const formatted: ProgressCardRecord = {
        id: data.id,
        studentId: data.student_id,
        classId: data.class_id,
        divisionId: data.division_id,
        academicYearId: data.academic_year_id,
        templateId: data.template_id,
        attendancePercentage: data.attendance_percentage,
        workingDaysCount: data.working_days_count,
        presentDaysCount: data.present_days_count,
        classTeacherRemarks: data.class_teacher_remarks,
        headmasterRemarks: data.headmaster_remarks,
        approvalStatus: data.approval_status || 'Draft',
        issueDate: data.issue_date,
        pdfStoragePath: data.pdf_storage_path
      };

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }

  /**
   * Save or update progress card
   */
  static async upsertProgressCard(card: Partial<ProgressCardRecord> & { studentId: string; classId: string; academicYearId: string }): Promise<{ data: ProgressCardRecord | null; error: ERPError | null }> {
    try {
      const payload = {
        ...(card.id ? { id: card.id } : {}),
        student_id: card.studentId,
        class_id: card.classId,
        division_id: card.divisionId,
        academic_year_id: card.academicYearId,
        template_id: card.templateId,
        attendance_percentage: card.attendancePercentage,
        working_days_count: card.workingDaysCount,
        present_days_count: card.presentDaysCount,
        class_teacher_remarks: card.classTeacherRemarks,
        headmaster_remarks: card.headmasterRemarks,
        approval_status: card.approvalStatus || 'Draft',
        issue_date: card.issueDate,
        pdf_storage_path: card.pdfStoragePath
      };

      const { data, error } = await supabase
        .from('progress_cards')
        .upsert(payload, { onConflict: 'student_id,academic_year_id' })
        .select()
        .single();

      if (error) {
        return { data: null, error: handleSupabaseError(error) };
      }

      const formatted: ProgressCardRecord = {
        id: data.id,
        studentId: data.student_id,
        classId: data.class_id,
        divisionId: data.division_id,
        academicYearId: data.academic_year_id,
        templateId: data.template_id,
        attendancePercentage: data.attendance_percentage,
        workingDaysCount: data.working_days_count,
        presentDaysCount: data.present_days_count,
        classTeacherRemarks: data.class_teacher_remarks,
        headmasterRemarks: data.headmaster_remarks,
        approvalStatus: data.approval_status || 'Draft',
        issueDate: data.issue_date,
        pdfStoragePath: data.pdf_storage_path
      };

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }
}
