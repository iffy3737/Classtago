/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// NATIONAL HIGH SCHOOL, TALODA - ERP DATABASE TYPES (TYPESCRIPT REPRESENTATION)
// ============================================================================
// Description: Strongly-typed mirror representation of the PostgreSQL database schemas.
// Used for: Database responses, state synchronization, client filters, and RLS mappings.
// ============================================================================

export interface DBBaseModel {
  id: string; // UUID primary key
  created_at?: string; // ISO DateTime string
  updated_at?: string; // ISO DateTime string
  created_by?: string | null; // UUID of creator user
  updated_by?: string | null; // UUID of updater user
  is_deleted?: boolean; // Soft delete indicator
  deleted_at?: string | null; // Soft delete timestamp
}

// 1. Academic Year Master
export interface DBAcademicYear extends DBBaseModel {
  year_code: string; // e.g., "2026-27" (pattern: '^\d{4}-\d{2}$')
  is_active: boolean;
  is_locked: boolean; // locked status prevents marks alterations
}

// 2. School Information Master
export interface DBSchoolInformation {
  id: string;
  school_name_en: string;
  school_name_hi: string;
  school_name_ur: string;
  u_dise_code: string;
  board_affiliation: string;
  contact_number_1: string;
  contact_number_2?: string | null;
  email_address: string;
  website_url?: string | null;
  office_address: string;
  principal_name_en: string;
  principal_name_hi?: string | null;
  principal_name_ur?: string | null;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

// 3. Class Master
export interface DBClass extends DBBaseModel {
  class_name: string; // e.g., "Class 1", "Class 9"
  class_numeric: number; // e.g., 1, 9, 12
  is_active: boolean;
}

// 4. Division Master
export interface DBDivision extends DBBaseModel {
  division_name: string; // e.g., "A", "Urdu Medium", "Science"
  is_active: boolean;
}

// 5. Demographics Masters
export interface DBReligion {
  id: string;
  name: string;
  is_active: boolean;
}

export interface DBCategory {
  id: string;
  name: string;
  is_active: boolean;
}

export interface DBCaste {
  id: string;
  name: string;
  is_active: boolean;
}

export interface DBNationality {
  id: string;
  name: string;
  is_active: boolean;
}

export interface DBBloodGroup {
  id: string;
  name: string;
}

export interface DBHouse {
  id: string;
  name: string;
  color_hex?: string | null;
}

// 6. Subjects Master
export interface DBSubject extends DBBaseModel {
  subject_code: string; // e.g., "URD-LIT-10"
  name_en: string;
  name_hi?: string | null;
  name_ur?: string | null;
  is_active: boolean;
}

// 7. Subject Group Master
export interface DBSubjectGroup {
  id: string;
  group_name: string;
  description?: string | null;
}

// 8. Academic Calendar & Timetabling Masters
export interface DBHolidayMaster {
  id: string;
  academic_year_id: string; // UUID
  holiday_date: string; // YYYY-MM-DD
  name_en: string;
  name_hi?: string | null;
  name_ur?: string | null;
  is_national_holiday: boolean;
  created_at: string;
}

export interface DBMonthlyWorkingDays {
  id: string;
  academic_year_id: string; // UUID
  month_index: number; // 1 to 12
  working_days_count: number;
  created_at: string;
}

export interface DBTimetablePeriodSettings {
  id: string;
  period_number: number;
  start_time: string; // e.g., "08:00:00"
  end_time: string; // e.g., "08:45:00"
  is_break: boolean;
  description?: string | null;
}

// 9. Co-Scholastic Evaluators
export interface DBObservationIndicator {
  id: string;
  category: string; // e.g., "Personal Traits"
  indicator_text_en: string;
  indicator_text_hi?: string | null;
  indicator_text_ur?: string | null;
}

export interface DBUrduRemarksMaster {
  id: string;
  remark_text_ur: string; // Urdu Nastaleeq remark
  remark_text_en: string; // English meaning
  remark_text_hi?: string | null;
  performance_band?: string | null; // Excellent, Good, etc.
}

// 10. Role and Permission definitions
export interface DBRole {
  id: string;
  role_name: 'headmaster' | 'clerk' | 'teacher' | 'student' | 'parent';
  description?: string | null;
  created_at: string;
}

export interface DBUser {
  id: string; // UUID references auth.users.id
  email: string;
  full_name: string;
  role_id: string; // UUID
  is_active: boolean;
  phone_number?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBPermission {
  id: string;
  permission_key: string; // e.g., "fees:collect"
  module: string; // e.g., "Fees"
  description?: string | null;
}

export interface DBRolePermission {
  role_id: string;
  permission_id: string;
}

// Logs and Session Tracking Models
export interface DBLoginHistory {
  id: string;
  user_id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  logged_in_at: string;
}

export interface DBUserSessionLog {
  id: string;
  user_id: string;
  session_started_at: string;
  session_ended_at?: string | null;
  duration_seconds?: number | null;
}

// 11. Student Record Structure
export interface DBStudent extends DBBaseModel {
  user_id?: string | null; // UUID linking to auth/user profile
  gr_number: string; // Unique general register code
  admission_number: string; // intake code
  roll_number?: number | null; // Class roll index
  shalarth_id?: string | null; // SHALARTH code of Maharashtra Education Dept
  name_en: string;
  name_hi?: string | null;
  name_ur?: string | null;
  father_name: string;
  mother_name: string;
  gender: string;
  date_of_birth: string; // YYYY-MM-DD
  aadhaar_number: string;
  
  religion_id?: string | null;
  category_id?: string | null;
  caste_id?: string | null;
  nationality_id?: string | null;
  blood_group_id?: string | null;
  house_id?: string | null;
  
  primary_contact_number: string;
  secondary_contact_number?: string | null;
  residential_address: string;
  previous_school_name?: string | null;
  admission_date: string; // YYYY-MM-DD
  
  current_class_id: string; // UUID Class Master
  current_division_id?: string | null; // UUID Division Master
  current_academic_year_id: string; // UUID Academic Year Master
  
  student_photo_url?: string | null;
  document_attachment_urls?: Record<string, string> | null; // dictionary of category documents
  status: 'Active' | 'Promoted' | 'TC_Issued' | 'Archived' | 'Suspended';
}

export interface DBParent {
  id: string;
  user_id?: string | null;
  father_profession?: string | null;
  mother_profession?: string | null;
  guardian_name?: string | null;
  relationship_to_student?: string | null;
  email_address?: string | null;
  emergency_contact_phone: string;
  created_at: string;
}

export interface DBParentStudentMapping {
  parent_id: string;
  student_id: string;
}

// 12. Teacher Profile Structure
export interface DBTeacher extends DBBaseModel {
  user_id: string; // UUID
  employee_code: string; // unique EMIS/biometric code
  qualification: string; // degrees
  appointment_date: string; // YYYY-MM-DD
  joining_date: string; // YYYY-MM-DD
  designation: string; // e.g. "PGT Science"
  salary_reference_scale?: string | null;
  teacher_photo_url?: string | null;
  certified_documents?: Record<string, string> | null;
  is_active: boolean;
}

// 13. Relationship mappings (junctions)
export interface DBClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  subject_group_id?: string | null;
  academic_year_id: string;
  is_compulsory: boolean;
  created_at: string;
}

export interface DBSubjectTeacher {
  id: string;
  teacher_id: string;
  class_id: string;
  division_id?: string | null;
  subject_id: string;
  academic_year_id: string;
  created_at: string;
  created_by?: string | null;
}

export interface DBClassTeacher {
  id: string;
  teacher_id: string;
  class_id: string;
  division_id: string;
  academic_year_id: string;
  is_active: boolean;
  assigned_at: string;
  created_by?: string | null;
}

// 14. Daily Transactions & Registers
export interface DBClassTimetable {
  id: string;
  class_id: string;
  division_id?: string | null;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  period_setting_id: string; // Period slot UUID
  subject_teacher_id: string; // Subject Teacher mapping UUID
  academic_year_id: string;
  is_active: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface DBStudentAttendance {
  id: string;
  student_id: string;
  attendance_date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'HalfDay' | 'OnLeave';
  remarks_en?: string | null;
  remarks_hi?: string | null;
  remarks_ur?: string | null;
  academic_year_id: string;
  recorded_by_teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface DBHomework {
  id: string;
  subject_teacher_id: string;
  title_en: string;
  title_ur?: string | null;
  title_hi?: string | null;
  description_en: string;
  description_ur?: string | null;
  description_hi?: string | null;
  assigned_date: string;
  due_date: string;
  attachment_urls?: string[] | null;
  academic_year_id: string;
  created_at: string;
  is_deleted: boolean;
}

export interface DBHomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_date: string;
  submission_text?: string | null;
  file_attachment_urls?: string[] | null;
  obtained_marks?: number | null;
  teacher_remarks?: string | null;
  status: 'Submitted' | 'Evaluated' | 'Late_Submission';
  created_at: string;
}

// 15. Financial structures and clearances
export interface DBFeeCategory {
  id: string;
  category_name: string;
  description?: string | null;
  is_active: boolean;
}

export interface DBClassFeeStructure {
  id: string;
  class_id: string;
  fee_category_id: string;
  amount_rupees: number;
  academic_year_id: string;
  created_at: string;
  created_by?: string | null;
}

export interface DBStudentFeeDue {
  id: string;
  student_id: string;
  fee_structure_id: string;
  total_amount: number;
  paid_amount: number;
  waiver_amount: number;
  due_date: string;
  status: 'Unpaid' | 'Partial' | 'Paid';
  academic_year_id: string;
  created_at: string;
  updated_at: string;
}

export interface DBFeeReceipt {
  id: string;
  receipt_no: string;
  due_record_id: string;
  amount_paid: number;
  payment_mode: 'Cash' | 'Cheque' | 'UPI' | 'NetBanking';
  transaction_reference_no?: string | null;
  payment_date: string;
  collected_by_clerk_user_id: string;
  created_at: string;
}

// 16. Academic examinations and grading
export interface DBExamType {
  id: string;
  exam_type_name: string; // e.g. "Unit Test I"
  exam_code: string; // e.g. "UT1"
  is_active: boolean;
}

export interface DBExam {
  id: string;
  exam_type_id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  exam_date: string;
  max_marks: number;
  passing_marks: number;
  is_marks_locked: boolean;
  created_by_teacher_id: string;
  created_at: string;
}

export interface DBMarkListEntry {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained?: number | null; // Null if absent
  is_absent: boolean;
  obtained_grade?: string | null;
  teacher_remarks?: string | null;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface DBStudentProgressCard {
  id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string;
  attendance_percentage: number;
  scholastic_total_percentage: number;
  overall_grade: string;
  promotion_status: 'Awaiting_Evaluation' | 'Promoted' | 'Retained' | 'TC_Demanded';
  class_teacher_remarks_en?: string | null;
  class_teacher_remarks_ur?: string | null;
  class_teacher_remarks_hi?: string | null;
  is_finalized: boolean;
  is_approved_by_headmaster: boolean;
  created_at: string;
  updated_at: string;
}

// 17. Legal documents generation SNAPSHOTS
export interface DBCertificateType {
  id: string;
  certificate_name: string; // "Bonafide Certificate", "Leaving Certificate"
  template_content_en: string;
  template_content_hi?: string | null;
  template_content_ur?: string | null;
}

export interface DBIssuedCertificate {
  id: string;
  certificate_type_id: string;
  student_id: string;
  gr_number: string;
  certificate_serial_no: string;
  issued_date: string;
  issued_by_clerk_user_id: string;
  historical_json_snapshot: Record<string, any>; // immutable snapshot
  pdf_attachment_storage_path?: string | null;
  created_at: string;
}

// 18. System Logging & Audit Trail
export interface DBAuditLog {
  id: string;
  timestamp: string;
  user_id?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  details_summary: string;
}
