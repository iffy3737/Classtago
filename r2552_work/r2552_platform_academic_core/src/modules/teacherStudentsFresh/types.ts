import type { AttendanceStudent, TeacherScopeAssignment } from '../teacherFresh/types';

export type RecognitionPeriodType = 'month' | 'year';

export interface StudentSubjectPerformance {
  studentId: string;
  firstTermPercent?: number | null;
  firstTermGrade?: string | null;
  secondTermPercent?: number | null;
  secondTermGrade?: string | null;
}

export interface RecognitionScores {
  academicPerformance: number;
  improvement: number;
  consistency: number;
  participation: number;
  homework: number;
}

export interface RecognitionRating extends RecognitionScores {
  id?: string;
  schoolId: string;
  academicYearId: string;
  academicYear: string;
  classId: string;
  className: string;
  divisionId?: string;
  division: string;
  subjectId: string;
  subjectName: string;
  teacherUserId: string;
  teacherRecordId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  grNumber?: string;
  periodType: RecognitionPeriodType;
  periodKey: string;
  totalPoints: number;
  updatedAt?: string;
}

export interface StudentRosterBundle {
  assignment: TeacherScopeAssignment;
  students: AttendanceStudent[];
}

export interface HeadmasterRecognitionRow {
  studentId: string;
  studentName: string;
  grNumber?: string;
  classId: string;
  className: string;
  divisionId?: string;
  division: string;
  averagePoints: number;
  normalizedScore: number;
  ratedSubjects: number;
  ratings: RecognitionRating[];
}
