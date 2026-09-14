export interface TeacherCloudContext {
  teacherRecordId: string;
  userId: string;
  schoolId: string;
  schoolName: string;
  schoolCode?: string;
  teacherName: string;
  designation?: string;
  academicYearId?: string;
  academicYear: string;
  assignments: TeacherScopeAssignment[];
  assignmentDiagnostics?: {
    cloudSubjectRows: number;
    academicSetupSubjectRows: number;
    matchedAcademicSetupSubjectRows: number;
    matchedTeacherProfiles: number;
  };
}

export interface TeacherScopeAssignment {
  id: string;
  scopeType: 'subject' | 'class_teacher';
  schoolId: string;
  teacherRecordId: string;
  academicYearId: string;
  academicYear: string;
  classId: string;
  className: string;
  divisionId?: string;
  division: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  medium: string;
  isClassTeacher: boolean;
  studentCount?: number;
  resultTemplateKey?: string;
  resultTemplateCategory?: string;
}

export interface AttendanceStudent {
  id: string;
  grNumber: string;
  rollNumber?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  admissionDate?: string;
  leavingDate?: string;
  leavingReason?: string;
  childUid?: string;
  examSeatNo?: string;
  aadhaarNumber?: string;
  status: string;
}

export interface AttendanceEntry {
  id?: string;
  studentId: string;
  attendanceDate: string;
  status: 'P' | 'A';
  source?: 'manual' | 'swiftchat';
  updatedAt?: string;
}

export interface CalendarDay {
  date: string;
  isWorkingDay: boolean;
  locked: boolean;
  label?: string;
  dayType?: 'working' | 'holiday' | 'vacation' | 'exam' | 'other';
}

export interface AttendanceCorrectionRequest {
  id: string;
  studentId: string;
  studentName?: string;
  attendanceDate: string;
  currentStatus: string;
  requestedStatus: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SwiftChatStatus {
  connectorEnabled: boolean;
  officialApiConfigured: boolean;
  lastSyncAt?: string;
  lastStatus?: string;
  lastMessage?: string;
}

export interface TeacherTimetableItem {
  id: string;
  periodNo?: number;
  startTime?: string;
  endTime?: string;
  className: string;
  division?: string;
  subjectName: string;
  room?: string;
  status: 'scheduled' | 'free' | 'substitute' | 'completed' | 'current' | 'upcoming';
}

export interface TeacherNoticeItem {
  id: string;
  title: string;
  body?: string;
  category?: string;
  publishedAt?: string;
  isPinned?: boolean;
  isRead?: boolean;
  attachmentUrl?: string;
}

export interface TeacherDashboardCloudFeed {
  timetableAvailable: boolean;
  timetable: TeacherTimetableItem[];
  noticesAvailable: boolean;
  notices: TeacherNoticeItem[];
  pendingAcademic: {
    homeworkDrafts: number | null;
    lessonPlanOpen: number | null;
    teachingDiaryOpen: number | null;
  };
}
