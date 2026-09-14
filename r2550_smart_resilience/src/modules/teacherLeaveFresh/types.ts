export type TeacherLeaveView = 'apply' | 'status' | 'history' | 'summary';

export interface TeacherLeaveApplication {
  id: string;
  cloudRequestId?: string;
  applicantId?: string;
  applicantName?: string;
  applicantRole?: 'teacher' | 'staff' | 'student';
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayOption?: 'Morning Session' | 'Afternoon Session' | null;
  leaveType: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | string;
  remarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  appliedAt?: string;
  shalarthId?: string | null;
  employeeCode?: string | null;
}

export interface TeacherLeaveSettings {
  leaveRule: 'Rule A' | 'Rule B' | 'Rule C';
  activeAcademicYear?: { id: string; year: string } | null;
  holidays: Array<{
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    remarks?: string;
  }>;
}
