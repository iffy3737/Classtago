/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// BCP-47 compatible language code. The live catalogue is database-driven.
export type Language = string;

export type UserRole = 'super_admin' | 'headmaster' | 'clerk' | 'teacher' | 'class_teacher' | 'student' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  phone?: string;
  designation?: string;
  classId?: string; // Optional reference to class if role is student or classteacher
  division?: string;
  admissionNo?: string;
  rollNo?: number;
  
  // Custom NHS security and credential rules
  username: string; // SHALARTH ID for teachers, GR Number for students, Employee Code/custom for Clerk, custom for Headmaster
  password?: string; // Legacy browser-only credential used once during migration, then removed.
  mustChangePassword?: boolean;
  authUserId?: string;
  cloudProvisioned?: boolean;
  cloudSyncedAt?: string;
  shalarthId?: string;
  grNumber?: string;
  penNumber?: string;
  employeeCode?: string;
  isActive?: boolean; // For soft delete / inactive account status
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Disabled' | 'Inactive' | 'Active' | 'CorrectionRequired';
  rejectionReason?: string;
  correctionReason?: string;
  fatherName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  qualification?: string;
  joiningDate?: string;
  address?: string;
  documents?: { name: string; url: string; category?: string }[];
  parentMobile?: string;
}

export interface ClassStructure {
  id: string;
  className: string; // "Class 1" to "Class 12"
  division?: string; // Optional: "A", "B", "C", or custom, or empty
}

export interface NoticeTranslation {
  languageCode: string;
  languageName: string;
  nativeName?: string;
  direction?: 'ltr' | 'rtl';
  title: string;
  content: string;
}

export interface Notice {
  id: string;
  title: string;
  titleHi?: string;
  titleUr?: string;
  content: string;
  contentHi?: string;
  contentUr?: string;
  primaryLanguageCode?: string;
  primaryLanguageName?: string;
  translations?: NoticeTranslation[];
  date: string;
  category: 'General' | 'Academics' | 'Exam' | 'Fee' | 'Sports';
  targetRoles: UserRole[];
  publishedBy: string;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  subject: string;
  subjectHi?: string;
  subjectUr?: string;
  teacherName: string;
  startTime: string;
  endTime: string;
}

export interface HomeworkEntry {
  id: string;
  classId: string;
  subject: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  teacherName: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  amount: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  dueDate: string;
  academicYear: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  module: string;
  details: string;
}

export interface SystemNotification {
  id: string;
  recipientId: string; // user ID or role or 'all'
  title: string;
  content: string;
  date: string;
  isRead: boolean;
  type?: string;
  sourceKey?: string;
  metadata?: {
    subjectName: string;
    className: string;
    divisionName: string;
    examName: string;
    returnedBy: string;
    reason: string;
    lockId: string;
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

// ==================================================
// SCHOOL CONFIGURATION & ACADEMIC SETUP MASTER SCHEMAS
// ==================================================

export interface SchoolProfile {
  schoolName: string;
  managementName: string;
  udiseCode: string;
  schoolCode: string;
  address: string;
  villageCity: string;
  taluka: string;
  district: string;
  state: string;
  pinCode: string;
  phoneNumbers: string;
  whatsAppNumber: string;
  email: string;
  website: string;
  principalName: string;
  schoolLogo: string; // Base64 or URL
  schoolSeal: string;  // Base64 or URL
  principalSignature: string; // Base64 or URL
  headmasterSignature: string; // Base64 or URL
  clerkSignature?: string; // Base64 or URL
  schoolBuildingPhoto?: string; // Base64 or URL
  primaryMedium?: string;
  secondaryMedium?: string;
  regNumber?: string;
}

export interface AcademicYear {
  id: string;
  year: string; // e.g. "2024-25"
  isActive: boolean;
  isLocked: boolean;
}

export interface ClassMasterItem {
  id: string;
  className: string; // "Class 1" to "Class 12"
  isEnabled: boolean;
}

export interface DivisionMasterItem {
  id: string;
  divisionName: string; // "A", "B", "C", "Urdu Medium", etc.
  isEnabled: boolean;
}

export interface MediumMasterItem {
  id: string;
  mediumName: string; // "Urdu" | "Marathi" | "English" | "Hindi"
  isEnabled: boolean;
}

export interface SubjectMasterItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string; // "Language" | "Core" | "Elective" | "Vocational"
  language: string; // "English" | "Hindi" | "Urdu" | "Marathi" | "None"
  isScholastic: boolean; // Scholastic or Co-Scholastic
  boardMapping: string[]; // Board IDs
  classMapping: string[]; // Class numbers (e.g. ["Class 1", "Class 2"])
  maxMarks: number;
  passingMarks: number;
  printOrder: number;
  isActive: boolean;
}

export interface SubjectGroup {
  id: string;
  groupName: string; // e.g., "Languages", "Science Group"
  subjectIds: string[];
}

export interface BoardConfig {
  id: string;
  boardName: string; // "State Board" | "CBSE" | "ICSE" | "Custom"
  isDefault: boolean;
  isEnabled: boolean;
}

export interface ExamTerm {
  id: string;
  termName: string; // "FA-1" | "SA-1" | "Semester-I" etc.
  maxMarksWeightage: number;
  isActive: boolean;
}

export interface GradeScaleItem {
  id: string;
  gradeName: string; // "A1", "A2", "B1" etc.
  minPercentage: number;
  maxPercentage: number;
  gradePoints: number;
  remarks: string;
  systemGroup?: 'primary' | 'secondary' | 'future_ready';
}

export interface SchoolTimingDayOverride {
  classification: string;
  isWorkingDay?: boolean;
  openingTime: string;
  closingTime: string;
  prayerTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  shortBreakStart?: string;
  shortBreakEnd?: string;
  notes?: string;
}

export interface SchoolTiming {
  openingTime: string;
  closingTime: string;
  prayerTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  shortBreakStart: string;
  shortBreakEnd: string;
  workingDays: string[]; // ["Monday", "Tuesday", ...]
  holidayRules: string;
  dayOverrides?: Record<string, SchoolTimingDayOverride>;
}

export interface PeriodConfig {
  id: string;
  periodName: string; // "Period 1", "Recess", "Assembly"
  periodNumber: number; // 0 for breaks, 1, 2, 3...
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'Lecture' | 'Break' | 'Assembly' | 'Sports' | 'Library' | 'Lab';
}

export interface HolidayItem {
  id: string;
  holidayName: string; // "Ramzan", "Bakrid", "Diwali", etc.
  startDate: string;
  endDate: string;
  holidayType: 'National' | 'State' | 'School' | 'Religious' | 'Other';
  description?: string;
}

export interface DocumentConfig {
  id: string;
  documentName: string; // "Birth Certificate", "Aadhaar", etc.
  isRequired: boolean;
  description?: string;
}

export interface PrintConfig {
  paperSize: 'A4' | 'A3' | 'Letter';
  orientation: 'Portrait' | 'Landscape';
  marginTop: number; // mm
  marginBottom: number; // mm
  marginLeft: number; // mm
  marginRight: number; // mm
  showHeader: boolean;
  showFooter: boolean;
  logoPosition: 'Left' | 'Center' | 'Right' | 'None';
  watermarkText: string;
  enableQRCode: boolean;
}

export interface GlobalERPSettings {
  defaultLanguage: Language;
  defaultAcademicYearId: string;
  defaultBoardId: string;
  defaultMediumId: string;
  defaultClassId: string;
  defaultTimeZone: string;
  dateFormat: string; // "YYYY-MM-DD" | "DD/MM/YYYY" etc.
  timeFormat: '12h' | '24h';
  currency: string; // "INR" etc.
  registrationMode?: 'self_approval' | 'admin_only' | 'both_allowed';
  parentApprovalRequired?: boolean;
}

export interface MasterDataItem {
  id: string;
  name: string;
  isActive: boolean;
  isSystem?: boolean;
}

export interface MasterLocationItem {
  id: string;
  state: string;
  district: string;
  taluka: string;
  village: string;
  isActive: boolean;
}

export interface MasterAcademicSetup {
  schoolProfile: SchoolProfile;
  academicYears: AcademicYear[];
  classes: ClassMasterItem[];
  divisions: DivisionMasterItem[];
  mediums: MediumMasterItem[];
  subjects: SubjectMasterItem[];
  subjectGroups: SubjectGroup[];
  boards: BoardConfig[];
  examTerms: ExamTerm[];
  gradeScales: GradeScaleItem[];
  schoolTiming: SchoolTiming;
  periods: PeriodConfig[];
  holidays: HolidayItem[];
  documents: DocumentConfig[];
  printSettings: PrintConfig;
  globalSettings: GlobalERPSettings;

  // Centralized ERP Sub-Masters
  religions?: MasterDataItem[];
  categories?: MasterDataItem[];
  castes?: MasterDataItem[];
  nationalities?: MasterDataItem[];
  motherTongues?: MasterDataItem[];
  bloodGroups?: MasterDataItem[];
  admissionTypes?: MasterDataItem[];
  houses?: MasterDataItem[];
  mediumList?: MasterDataItem[]; // and mediums
  genders?: MasterDataItem[];

  // Teacher Sub-Masters
  designations?: MasterDataItem[];
  qualifications?: MasterDataItem[];
  departments?: MasterDataItem[];
  employmentTypes?: MasterDataItem[];
  staffCategories?: MasterDataItem[];

  // Location Sub-Master
  locations?: MasterLocationItem[];

  // Certificates & Layout Templates Sub-Masters
  certificates?: MasterDataItem[];
  observationCategories?: MasterDataItem[];
  urduRemarks?: MasterDataItem[];
  progressCardTemplates?: MasterDataItem[];
  markListTemplates?: MasterDataItem[];
  specialPeriods?: MasterDataItem[];
  teacherProfiles?: TeacherProfile[];
  subjectAllocations?: SubjectAllocation[];
  classTeacherAssignments?: ClassTeacherAssignment[];
  subjectWeeklyRequirements?: SubjectWeeklyRequirement[];
  weeklyPeriodSettings?: WeeklyPeriodSettings;
}

export interface WeeklyPeriodSettings {
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
  Friday: number;
  Saturday: number;
}

export interface SubjectWeeklyRequirement {
  id: string;
  academicYear: string;
  className: string;
  divisionName: string;
  subjectName: string;
  requiredWeeklyPeriods: number;
  priority: 'High' | 'Medium' | 'Low';
  doublePeriodAllowed: boolean;
  lastPeriodAllowed: boolean;
  maxPeriodsPerDay: number;
}

export interface TeacherProfile {
  id: string;
  employeeId: string;
  shalarthId: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  gender: string;
  dob: string;
  dobInWords?: string;
  qualification: string;
  designation: string;
  joiningDate: string;
  appointmentDate: string;
  mobileNumber: string;
  email: string;
  address: string;
  bloodGroup: string;
  photoUrl?: string;
  documents?: { id: string; name: string; url: string; category?: string }[];
  status: 'Pending' | 'Active' | 'Transferred' | 'Retired' | 'Resigned' | 'Inactive';
  isActive?: boolean;
}

export interface SubjectAllocation {
  id: string;
  academicYear: string;
  teacherId: string;
  teacherName: string;
  className: string;
  divisionName: string;
  subjectName: string;
  weeklyPeriods: number;
  isActive?: boolean;
}

export interface ClassTeacherAssignment {
  id: string;
  academicYear: string;
  className: string;
  divisionName: string;
  teacherId: string;
  teacherName: string;
  isActive?: boolean;
}

export interface ReservedPeriod {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  label: string; // e.g. "Assembly", "Examination", "School Functions", "Events", "Custom"
  classId: string; // "All" or specific classId
}

export interface TimetableVersion {
  id: string;
  versionNumber: number;
  generatedAt: string;
  generatedBy: string;
  changeSummary: string;
  timetable: TimetableEntry[];
}

// ==================================================
// EXAMINATION & TERM MANAGEMENT SYSTEM SCHEMAS
// ==================================================

export interface Examination {
  id: string;
  academicYear: string;
  name: string;
  shortName: string;
  term: string; // e.g. "Term 1", "Semester 1", etc.
  displayOrder: number;
  status: 'Active' | 'Inactive';
}

export interface ExamTermItem {
  id: string;
  name: string;
  academicYear: string;
  isActive: boolean;
}

export interface ExamTypeItem {
  id: string;
  name: string;
  isActive: boolean;
}

export interface MappedSubjectMarkStructure {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  minPassingMarks: number;
  theoryMarks: number;
  practicalMarks: number;
  internalMarks: number;
  projectMarks: number;
  oralMarks: number;
  customComponents: { name: string; marks: number }[];
  totalMarks: number;
  passingRule: 'Total Based' | 'Theory Based' | 'Component Based';
}

export interface ClassExamMapping {
  id: string;
  academicYear: string;
  examId: string; // reference to Examination
  classId: string; // e.g. "Class 9"
  division: string; // Optional, e.g. "All", "A", "B", etc.
  subjects: MappedSubjectMarkStructure[];
  term: string;
}

export interface GradeSystemConfig {
  id: string;
  classId: string; // "All" or specific class
  gradingType: 'Marks' | 'Grades' | 'Mixed';
  scaleId: string; // GradeScaleItem ID
}

export interface ExamScheduleEntry {
  id: string;
  examId: string;
  examName: string;
  academicYear: string;
  date: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  division: string; // e.g. "All", "A", "B"
  durationMinutes: number;
  startTime: string; // e.g. "10:30 AM"
  room: string;
  supervisor: string; // supervisor name
  remarks: string;
}

// ==================================================
// QUESTION PAPER & QUESTION BANK SYSTEM SCHEMAS
// ==================================================

export type QuestionType =
  | 'MCQ'
  | 'Fill in the Blanks'
  | 'True / False'
  | 'One Word Answer'
  | 'Short Answer'
  | 'Long Answer'
  | 'Match the Following'
  | 'Practical Question'
  | 'Diagram Based'
  | 'Essay'
  | 'Custom Question Type';

export interface QuestionBankItem {
  id: string;
  subjectId: string;
  subjectName: string;
  chapter: string;
  topic: string;
  questionType: QuestionType;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  question: string;
  answerKey?: string;
  tags?: string[];
}

export interface QuestionPaperQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  displayOrder: number;
  answerKey?: string;
  chapter?: string;
  topic?: string;
}

export interface QuestionPaper {
  id: string;
  academicYear: string;
  examId: string;
  examName: string;
  term: string;
  examType: string;
  classId: string;
  division?: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  paperCode: string; // e.g., QP-2026-ENG-01
  maxMarks: number;
  passingMarks: number;
  durationMinutes: number;
  instructions: string;
  status: 'Draft' | 'Approved' | 'Final';
  questions: QuestionPaperQuestion[];
  createdAt: string;
}

// ==================================================
// DIGITAL MARK LIST A FOUNDATION & ASSESSMENT SCHEMAS
// ==================================================

export interface FormativeHead {
  id: string;
  displayName: string;
  maxMarks: number;
  weightage: number;
  displayOrder: number;
  isEnabled: boolean;
  isMandatory: boolean;
  remarks?: string;
}

export interface SummativeHead {
  id: string;
  displayName: string;
  maxMarks: number;
  weightage: number;
  displayOrder: number;
  isMandatory: boolean;
}

export interface RowDefinition {
  key: string;
  label: string;
  type: 'editable' | 'calculated';
  calculationType?: 'vertical_sum' | 'vertical_average' | 'horizontal_sum' | 'custom';
}

export interface CalculationRule {
  targetRowKey: string;
  sourceRowKeys: string[];
  operation: 'sum' | 'average' | 'weighted_sum';
}

export interface AssessmentPattern {
  id: string;
  name: string;
  academicYear: string;
  classId: string; // e.g. "Class 5", "Class 9", "All"
  division?: string; // e.g. "A", "B", "All" or empty
  subjectType: 'Urdu' | 'English' | 'Hindi_Marathi' | 'Mathematics' | 'Science' | 'SocialScience' | 'Art_PE_WorkExp' | 'Custom';
  subjectId: string; // "All" or specific subjectId
  examId: string; // Reference to exam ID
  formativeHeads: FormativeHead[];
  summativeHeads: SummativeHead[];
  totalFormula: 'sum' | 'weighted_sum' | 'custom';
  passingMarks: number;
  isActive: boolean;
  rowsPerStudent?: number; // default 1
  rowDefinitions?: RowDefinition[];
  calculationRules?: CalculationRule[];
  mergeRules?: string[]; // e.g., ['rollNumber', 'grNumber', 'studentName', 'remarks']
}

export interface MarkListTemplate {
  id: string;
  templateType: 'Urdu' | 'English' | 'Hindi_Marathi' | 'Mathematics' | 'Science' | 'SocialScience' | 'Art_PE_WorkExp' | 'Custom';
  templateName: string;
  description: string;
  language: 'en' | 'hi' | 'ur';
  isRTL: boolean;
  defaultFormativeHeads: {
    displayName: string;
    maxMarks: number;
    weightage: number;
    displayOrder: number;
    isEnabled: boolean;
    isMandatory: boolean;
  }[];
  defaultSummativeHeads: {
    displayName: string;
    maxMarks: number;
    weightage: number;
    displayOrder: number;
    isMandatory: boolean;
  }[];
  rowsPerStudent?: number; // default 1
  rowDefinitions?: RowDefinition[];
  calculationRules?: CalculationRule[];
  mergeRules?: string[]; // e.g., ['rollNumber', 'grNumber', 'studentName', 'remarks']
  hasVerticalTotals?: boolean;
  rowLabels?: string[];
}

// ==================================================
// EXCEL-LIKE MARK ENTRY SYSTEM SCHEMAS
// ==================================================

export interface StudentMarkSubRow {
  rowKey: string;
  rowLabel: string;
  formativeMarks: Record<string, number | string>;
  summativeMarks: Record<string, number | string>;
  formativeTotal: number | '';
  summativeTotal: number | '';
  subjectTotal: number | '';
  grade?: string;
}

export interface LanguageSubRow {
  formativeMarks: Record<string, number | string>;
  summativeMarks: Record<string, number | string>;
  formativeTotal: number | '';
  summativeTotal: number | '';
  subjectTotal: number | '';
  grade?: string;
}

export interface StudentMarkEntry {
  id: string; // mark_${academicYear}_${examId}_${classId}_${division}_${subjectId}_${studentId}
  academicYear: string;
  examId: string;
  classId: string;
  division: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  rollNumber?: string;
  grNumber?: string;
  marks?: Record<string, number | string>; // headId -> numeric score or special code (AB, ML, EX, etc)
  formativeMarks: Record<string, number | string>; // headId -> numeric score or special code (AB, ML, EX, etc)
  summativeMarks: Record<string, number | string>; // headId -> numeric score or special code (AB, ML, EX, etc)
  formativeTotal: number;
  summativeTotal: number;
  subjectTotal: number;
  remarks: string;
  status: 'Draft' | 'Submitted' | 'Deleted';
  lastSavedAt: string;
  updatedBy: string;
  grade?: string;
  approvedBy?: string;
  approvalDate?: string;
  approvalTime?: string;
  languageRows?: {
    hindi: LanguageSubRow;
    marathi: LanguageSubRow;
    total: LanguageSubRow;
  };
  multiRows?: Record<string, LanguageSubRow>;
  markRows?: StudentMarkSubRow[];
}

export interface SubjectLockState {
  id: string; // lock_${academicYear}_${examId}_${classId}_${division}_${subjectId}
  academicYear: string;
  examId: string;
  classId: string;
  division: string;
  subjectId: string;
  isLocked: boolean;
  status?: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Pending Review' | 'Returned for Correction' | 'Resubmitted' | 'Deleted';
  lockedAt?: string;
  lockedBy?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
  returnReason?: string;
  returnedBy?: string;
  returnedAt?: string;
  approvedBy?: string;
  approvalDate?: string;
  approvalTime?: string;
  sourceTeacher?: string;
  versionNumber?: number;
  history?: any[];
}

// SECURITY & GATEKEEPER SYSTEM SCHEMAS
export interface VisitorRecord {
  id: string;
  visitorId: string; // e.g. VIS-2026-0001
  photoUrl?: string;
  name: string;
  mobile: string;
  idType?: string;
  idNumber?: string;
  address?: string;
  purpose: string;
  meetPerson: string;
  department: string;
  entryTime: string;
  exitTime?: string;
  remarks?: string;
  isParentVisit: boolean;
  studentGr?: string;
  studentName?: string;
  studentClass?: string;
  studentDivision?: string;
}

export interface StudentGatePass {
  id: string;
  passNumber: string; // e.g. SGP-2026-0001
  studentId: string;
  studentName: string;
  grNumber: string;
  classId: string;
  className: string;
  division: string;
  parentName: string;
  parentMobile: string;
  reason: 'Medical Emergency' | 'Family Emergency' | 'Early Leave' | 'Competition' | 'Official Work' | 'Other';
  reasonDetails?: string;
  timeOut: string;
  expectedReturn?: string;
  actualReturn?: string;
  approvedBy: string;
  status: 'Approved' | 'Out' | 'Returned' | 'Cancelled';
}

export interface StaffGatePass {
  id: string;
  passNumber: string; // e.g. STGP-2026-0001
  staffId: string;
  staffName: string;
  employeeCode?: string;
  reason: 'Official Duty' | 'Personal Work' | 'Medical' | 'Bank Work' | 'Government Office' | 'Other';
  reasonDetails?: string;
  timeOut: string;
  expectedReturn?: string;
  actualReturn?: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'Pending' | 'Approved' | 'Out' | 'Returned' | 'Rejected' | 'Cancelled';
  rejectionReason?: string;
}

export interface StaffMasterRecord {
  id: string;
  shalarthId: string;
  designation: string;
  isActive?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

export interface VehicleRecord {
  id: string;
  vehicleNumber: string;
  ownerName: string;
  vehicleType: 'Two Wheeler' | 'Four Wheeler' | 'School Bus' | 'Commercial/Delivery' | 'Other';
  purpose: string;
  entryTime: string;
  exitTime?: string;
}






