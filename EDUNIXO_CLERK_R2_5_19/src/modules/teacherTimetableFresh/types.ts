export type TeacherTimetableView = 'my_timetable' | 'class_timetable' | 'workload' | 'substitute';

export interface PublishedTimetableRow {
  id: string;
  day: string;
  period: number;
  startTime?: string;
  endTime?: string;
  className: string;
  division: string;
  subjectName: string;
  teacherName: string;
  teacherUserId?: string;
  teacherRecordId?: string;
  isLocked?: boolean;
}

export interface SubstituteDutyRow {
  id: string;
  date: string;
  day: string;
  period: number;
  className: string;
  division: string;
  subjectName: string;
  originalTeacher: string;
  substituteTeacher: string;
  status: string;
}

export interface TeacherTimetableData {
  source: 'cloud' | 'compatibility';
  regularRows: PublishedTimetableRow[];
  classRows: PublishedTimetableRow[];
  substituteRows: SubstituteDutyRow[];
  classTeacherScopes: Array<{ className: string; division: string }>;
  message?: string;
}
