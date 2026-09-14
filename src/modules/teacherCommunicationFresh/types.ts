export type TeacherCommunicationView = 'school_notices' | 'announcements' | 'homework_notifications' | 'parent_student';
export type CommunicationChannel = 'website' | 'whatsapp' | 'sms' | 'email';
export type CommunicationAudience = 'students' | 'parents' | 'students_and_parents';
export type CommunicationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TeacherCommunicationScope {
  id: string;
  assignmentId: string;
  scopeType: 'class_teacher' | 'subject';
  academicYearId?: string;
  academicYear?: string;
  classId: string;
  className: string;
  divisionId?: string;
  division: string;
  subjectId?: string;
  subjectName?: string;
  label: string;
  isClassTeacherScope: boolean;
}


export interface TeacherCommunicationSenderIdentity {
  teacherName: string;
  mobile?: string;
  email?: string;
  mobileLinked: boolean;
  emailLinked: boolean;
}

export interface CommunicationChannelReadiness {
  website: boolean;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface CommunicationRecipient {
  studentId: string;
  studentUserId?: string;
  studentName: string;
  grNumber?: string;
  studentMobile?: string;
  studentEmail?: string;
  parentName?: string;
  parentMobile?: string;
  parentEmail?: string;
  preferredLanguage?: string;
  portalStatus?: string;
}

export interface CommunicationNotice {
  id: string;
  title: string;
  body?: string;
  category?: string;
  publishedAt?: string;
  isPinned?: boolean;
  attachmentUrl?: string;
}

export interface HomeworkNotificationAttachment {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
}

export interface HomeworkNotificationItem {
  id: string;
  assignmentId: string;
  title: string;
  content: string;
  dueDate?: string;
  className: string;
  division: string;
  subjectName: string;
  updatedAt?: string;
  attachments?: HomeworkNotificationAttachment[];
}

export interface CommunicationHistoryItem {
  id: string;
  title: string;
  body: string;
  messageType: string;
  className?: string;
  division?: string;
  subjectName?: string;
  channels: CommunicationChannel[];
  recipientCount: number;
  createdAt: string;
  queued: number;
  delivered: number;
  read: number;
  failed: number;
  skipped: number;
  languageName?: string;
  audience?: string;
}

export interface CommunicationSendResult {
  messageId: string;
  recipientCount: number;
  studentCount: number;
  websiteCreated: number;
  externalQueued: number;
  externalSkipped: number;
  dispatchWarning?: string;
}
