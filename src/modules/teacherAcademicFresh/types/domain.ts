export type UUID = string;

export type TeacherAssignment = {
  id: UUID;
  teacherId: UUID;
  teacherName?: string;
  schoolId: UUID;
  schoolName: string;
  schoolCode?: string;
  academicYear: string;
  className: string;
  division: string;
  subjectId: UUID;
  subjectName: string;
  subjectCode?: string;
  medium: string;
  isClassTeacher: boolean;
};

export type StudyMaterial = {
  id: UUID;
  ownerTeacherId: UUID;
  schoolId: UUID;
  academicYear: string;
  className: string;
  division?: string;
  subjectId: UUID;
  subjectName: string;
  chapter?: string;
  unit?: string;
  medium: string;
  title: string;
  kind: 'pdf' | 'image' | 'worksheet' | 'document' | 'link' | 'notes';
  category: 'textbook' | 'video' | 'image' | 'pdf_material' | 'notes_docs' | 'worksheet' | 'link_other';
  sourceUrl?: string;
  storagePath?: string;
  publishedToStudents: boolean;
  archived: boolean;
  extractionStatus: 'pending' | 'processing' | 'ready' | 'failed';
  extractionError?: string;
  createdAt: string;
};

export type YearPlanMonthCell = {
  month: 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December' | 'January' | 'February' | 'March' | 'April';
  content: string;
  kind: 'teaching' | 'revision' | 'exam' | 'practice' | 'holiday';
};

export type YearPlanSubjectDraft = {
  assignmentId: UUID;
  subjectId: UUID;
  subjectName: string;
  className: string;
  academicYear: string;
  months: YearPlanMonthCell[];
  warnings: string[];
  generationMethod: string;
};

export type AcademicTaskType =
  | 'year-plan'
  | 'daily-teaching-plan'
  | 'lesson-plan'
  | 'homework'
  | 'teaching-diary-assist'
  | 'classwork-assignment'
  | 'question-paper';

export type GenerationRequest = {
  taskType: AcademicTaskType;
  assignmentId: UUID;
  materialIds: UUID[];
  chapterScope: string[];
  prompt: string;
  structuredInputs: Record<string, unknown>;
};

export type GenerationResult = {
  jobId: UUID;
  content: string;
  warnings: string[];
  citations: Array<{
    materialId: UUID;
    materialTitle: string;
    chapter?: string;
    excerpt?: string;
  }>;
  scopeValidated: boolean;
};

export type SavedAcademicRecord = {
  id: UUID;
  kind: Exclude<AcademicTaskType, 'question-paper'>;
  assignmentId: UUID;
  title: string;
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'published';
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type QuestionPaperExam =
  | 'first_unit_test'
  | 'first_term_examination'
  | 'second_unit_test'
  | 'second_term_examination';

export type CombinedSubjectComponentMeta = {
  subjectId: UUID;
  subjectName: string;
  assignmentId?: UUID;
  teacherName?: string;
  marks?: number;
};

export type CombinedSubjectGroup = {
  id: UUID;
  groupName: string;
  collaborationKey: string;
  className: string;
  division: string;
  academicYear: string;
  currentTeacherHasAll: boolean;
  configuredTotalMarks?: number;
  hasSubmittedComponents?: boolean;
  members: Array<CombinedSubjectComponentMeta & {
    subjectCode?: string;
    assigned: boolean;
    assignedToCurrentTeacher: boolean;
    suggestedMarks?: number;
    savedPattern?: QuestionPatternRow[];
    latestSubmission?: { paperId: UUID; status: 'submitted' | 'returned' | 'approved'; marks?: number; reason?: string; updatedAt?: string };
  }>;
};

export type QuestionPatternRow = {
  type: string;
  count: number;
  marksEach: number;
  // R33.13: native-language section instruction used when the student paper
  // renders this pattern row as one main Question/Sawal section.
  displayTitle?: string;
  // R33.19: hidden collaboration metadata. These fields are stored inside the
  // existing pattern JSON, so combined papers need no new database migration.
  combinedGroupId?: string;
  combinedGroupName?: string;
  collaborationKey?: string;
  combinedWorkflow?: 'single_teacher_combined' | 'collaborative_component';
  componentSubjectId?: string;
  componentSubjectName?: string;
  componentAssignmentId?: string;
  componentIndex?: number;
  componentTotalMarks?: number;
  combinedTotalMarks?: number;
  expectedComponents?: CombinedSubjectComponentMeta[];
  componentInstructions?: string[];
};

export type QuestionPaperSourceMode = 'whole_chapter' | 'exercise' | 'both';
export type QuestionPaperAnswerLayout = 'mcq' | 'fill_blanks' | 'true_false' | 'match' | 'very_short' | 'short' | 'long' | 'working' | 'diagram' | 'default';

export type QuestionPaperQuestion = {
  id: UUID;
  text: string;
  marks: number;
  type: string;
  sectionIndex?: number;
  orderNo: number;
  sourceKind?: 'whole_chapter' | 'exercise';
  answerLayout?: QuestionPaperAnswerLayout;
  answerLines?: number;
  options?: string[];
  matchLeft?: string[];
  matchRight?: string[];
  modelAnswer?: string;
  internalSources: Array<{ materialId: UUID; chapter?: string }>;
};

export type QuestionPaperDraft = {
  id?: UUID;
  exam: QuestionPaperExam;
  assignmentId: UUID;
  materialIds: UUID[];
  chapters: string[];
  questionSource?: QuestionPaperSourceMode;
  totalMarks: number;
  durationMinutes: number;
  medium: string;
  title: string;
  instructions: string[];
  pattern: QuestionPatternRow[];
  questions: QuestionPaperQuestion[];
  reviewStatus: 'ai_draft' | 'teacher_reviewed' | 'final';
  combinedMeta?: {
    groupId: string;
    groupName: string;
    collaborationKey: string;
    workflow: 'single_teacher_combined' | 'collaborative_component';
    componentSubjectId?: string;
    componentSubjectName?: string;
    combinedTotalMarks: number;
  };
};

export type PrintSettings = {
  paper: 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Folio' | 'Custom';
  orientation: 'portrait' | 'landscape';
  marginMm: number;
  scalePercent: number;
  customWidthMm?: number;
  customHeightMm?: number;
  showSchoolHeader: boolean;
  showPageNumbers: boolean;
};


export type HomeworkAttachment = {
  id: UUID;
  academicRecordId: UUID;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
};

export type AcademicRecordListItem = SavedAcademicRecord & {
  className?: string;
  division?: string;
  subjectName?: string;
};

export type AssignmentSubmission = {
  id: UUID;
  academicRecordId: UUID;
  studentId: UUID;
  studentName: string;
  status: 'pending' | 'submitted' | 'checked';
  submittedAt?: string;
  remarks?: string;
  marks?: number;
  grade?: string;
};
