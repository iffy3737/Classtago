import type { TeacherScopeAssignment } from '../teacherFresh/types';

export type ResultTerm = 'first_term' | 'second_term';
export type ResultTemplateKey =
  | 'class_1_8_regular'
  | 'class_1_8_hindi_marathi'
  | 'class_9_10_single'
  | 'class_9_10_dual_paper'
  | 'class_9_10_dual_language'
  | 'class_11_12_subject'
  | 'grade_subject';

export type ResultListStatus = 'draft' | 'submitted' | 'returned' | 'accepted';
export type ResultBookStatus = 'building' | 'complete' | 'sent_to_progress_card';

export interface ResultHead {
  key: string;
  label: string;
  maxMarks?: number;
  kind: 'mark' | 'grade' | 'calculated';
  formula?: 'sum' | 'average' | 'grade';
  sources?: string[];
  group?: string;
  ownerSection?: 'hindi' | 'marathi' | 'subject';
}

export interface ResultTemplateDefinition {
  key: ResultTemplateKey;
  name: string;
  description: string;
  category: string;
  heads: ResultHead[];
  totalHeadKey?: string;
  gradeHeadKey?: string;
  source: 'clerk_cloud_master' | 'legacy_clerk_master_bridge' | 'built_in_reference';
  legacyMaster?: any; // exact Clerk Master Mark List layout used for Teacher rendering
}

export interface ResultScope extends TeacherScopeAssignment {
  term: ResultTerm;
  pairedSubjectIds?: string[];
  pairedSubjectNames?: string[];
  ownedSections?: Array<'hindi' | 'marathi' | 'subject'>;
}

export interface ResultStudent {
  id: string;
  name: string;
  rollNumber?: string;
  grNumber?: string;
  examSeatNo?: string;
}

export interface ResultSubjectList {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  divisionId?: string;
  subjectId: string;
  subjectName: string;
  teacherUserId: string;
  teacherRecordId?: string;
  term: ResultTerm;
  templateKey: ResultTemplateKey;
  sectionKey: string;
  status: ResultListStatus;
  returnReason?: string;
  submittedAt?: string;
  acceptedAt?: string;
  reviewedByUserId?: string;
  revision: number;
  templateSnapshot?: ResultTemplateDefinition;
}

export interface ResultMarkRow {
  studentId: string;
  marks: Record<string, string | number>;
  computed: Record<string, string | number>;
}

export interface ClassSubjectStatus {
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  list?: ResultSubjectList;
}

export interface ResultBookColumn {
  key: string;
  subjectName: string;
  headKey: string;
  label: string;
  group?: string;
  maxMarks?: number;
  kind: 'mark' | 'grade' | 'calculated';
  templateKey: ResultTemplateKey;
  sectionKey: string;
  scholastic: boolean;
}

export interface ResultBookRecord {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  divisionId?: string;
  term: ResultTerm;
  status: ResultBookStatus;
  consolidated: Record<string, Record<string, number | string>>;
  columns: ResultBookColumn[];
  subjectListIds: string[];
  createdAt?: string;
  sentAt?: string;
}
