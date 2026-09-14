import type { RoleVisibleModule, RoleModuleFeature } from './roleModuleBlueprint';

export type TeacherWorkspaceModule =
  | 'dashboard'
  | 'tr-my-assignments'
  | 'tr-attendance-daily'
  | 'tr-attendance-catalogue'
  | 'tr-attendance-history'
  | 'tr-attendance-correction'
  | 'tr-swiftchat-sync'
  | 'tr-study-material'
  | 'tr-ai-year-plan'
  | 'tr-ai-daily-plan'
  | 'tr-ai-lesson-plan'
  | 'tr-ai-homework'
  | 'tr-ai-teaching-diary'
  | 'tr-ai-classwork'
  | 'tr-result-subject-marks'
  | 'tr-result-class-mark-list'
  | 'tr-result-book'
  | 'tr-result-progress-card'
  | 'tr-my-timetable'
  | 'tr-class-timetable'
  | 'tr-my-workload'
  | 'tr-substitute-duties'
  | 'tr-my-students-list'
  | 'tr-my-students-performance'
  | 'tr-student-signup-approvals'
  | 'tr-school-notices'
  | 'tr-class-subject-announcements'
  | 'tr-homework-notifications'
  | 'tr-parent-student-communication'
  | 'tr-question-paper-first-term'
  | 'tr-question-paper-second-term'
  | 'tr-leave-apply'
  | 'tr-leave-status'
  | 'tr-leave-history'
  | 'tr-personal-hr-summary';

const teacherModuleMap: Record<string, TeacherWorkspaceModule> = {
  'tr-home': 'dashboard',
  'tr-dashboard': 'dashboard',
  'tr-my-assignments': 'tr-my-assignments',
  'tr-attendance-daily': 'tr-attendance-daily',
  'tr-attendance-catalogue': 'tr-attendance-catalogue',
  'tr-attendance-history': 'tr-attendance-history',
  'tr-attendance-correction': 'tr-attendance-correction',
  'tr-swiftchat-sync': 'tr-swiftchat-sync',
  'tr-study-material': 'tr-study-material',
  'tr-ai-year-plan': 'tr-ai-year-plan',
  'tr-ai-daily-plan': 'tr-ai-daily-plan',
  'tr-ai-lesson-plan': 'tr-ai-lesson-plan',
  'tr-ai-homework': 'tr-ai-homework',
  'tr-ai-teaching-diary': 'tr-ai-teaching-diary',
  'tr-ai-classwork': 'tr-ai-classwork',
  'tr-result-subject-marks': 'tr-result-subject-marks',
  'tr-result-class-mark-list': 'tr-result-class-mark-list',
  'tr-result-book': 'tr-result-book',
  'tr-result-progress-card': 'tr-result-progress-card',
  'tr-my-timetable': 'tr-my-timetable',
  'tr-class-timetable': 'tr-class-timetable',
  'tr-my-workload': 'tr-my-workload',
  'tr-substitute-duties': 'tr-substitute-duties',
  'tr-my-students-list': 'tr-my-students-list',
  'tr-my-students-performance': 'tr-my-students-performance',
  'tr-student-signup-approvals': 'tr-student-signup-approvals',
  'tr-school-notices': 'tr-school-notices',
  'tr-class-subject-announcements': 'tr-class-subject-announcements',
  'tr-homework-notifications': 'tr-homework-notifications',
  'tr-parent-student-communication': 'tr-parent-student-communication',
  'tr-question-paper-first-term': 'tr-question-paper-first-term',
  'tr-question-paper-second-term': 'tr-question-paper-second-term',
  'tr-leave-apply': 'tr-leave-apply',
  'tr-leave-status': 'tr-leave-status',
  'tr-leave-history': 'tr-leave-history',
  'tr-personal-hr-summary': 'tr-personal-hr-summary'
};

export function getTeacherWorkspaceModule(moduleId?: string | null): TeacherWorkspaceModule | null {
  if (!moduleId) return null;
  return teacherModuleMap[moduleId] || null;
}

export type ClerkWorkspaceTab =
  | 'dashboard'
  | 'admissions'
  | 'student_records'
  | 'certificates'
  | 'documents'
  | 'reports'
  | 'fees'
  | 'accounting'
  | 'registers'
  | 'attendance'
  | 'leaves'
  | 'profile';

const clerkTabMap: Record<string, ClerkWorkspaceTab> = {
  'cl-office-dashboard': 'dashboard',
  'cl-new-admission': 'admissions',
  'cl-leave-management': 'leaves'
};

export function getClerkWorkspaceTab(moduleId?: string | null): ClerkWorkspaceTab | null {
  if (!moduleId) return null;
  return clerkTabMap[moduleId] || null;
}

export type AcademicSetupCategory =
  | 'profile'
  | 'academic_year'
  | 'school_info'
  | 'classes_divisions'
  | 'subjects'
  | 'grading'
  | 'timing'
  | 'docs'
  | 'print'
  | 'erp_settings';

const academicSetupFeatureMap: Record<string, AcademicSetupCategory> = {
  'cl-academic-school-profile': 'profile',
  'cl-academic-year': 'academic_year',
  'cl-academic-school-info': 'school_info',
  'cl-academic-classes-divisions': 'classes_divisions',
  'cl-academic-subject-management': 'subjects',
  'cl-academic-grading-system': 'grading',
  'cl-academic-school-timing': 'timing',
  'cl-academic-document-settings': 'docs',
  'cl-academic-print-settings': 'print',
  'cl-academic-erp-settings': 'erp_settings',
  'school-profile': 'profile',
  'academic-years': 'academic_year',
  'classes-divisions': 'classes_divisions',
  'school-timings': 'timing',
  'academic-term-calendar': 'grading',
  'close-academic-year': 'academic_year',
  'erp-defaults': 'erp_settings',
  'subject-class-mapping': 'subjects',
  'subject-groups': 'subjects',
  'medium-language-settings': 'school_info',
  'grading-passing-rules': 'grading'
};

export function getAcademicSetupInitialCategory(featureId?: string | null): AcademicSetupCategory {
  if (!featureId) return 'profile';
  return academicSetupFeatureMap[featureId] || 'profile';
}

export type MasterDataCategory =
  | 'academic'
  | 'location'
  | 'student'
  | 'teacher'
  | 'subject'
  | 'document'
  | 'certificate'
  | 'result'
  | 'timetable';

const masterDataFeatureMap: Record<string, MasterDataCategory> = {
  'cl-master-academic-config': 'academic',
  'cl-master-location': 'location',
  'cl-master-student': 'student',
  'cl-master-teacher': 'teacher',
  'cl-master-subject': 'subject',
  'cl-master-document': 'document',
  'cl-master-certificate': 'certificate',
  'cl-master-result': 'result',
  'cl-master-timetable-config': 'timetable',
  'class-teacher-duty': 'teacher',
  'subject-teacher-assignment': 'teacher',
  'subject-master': 'subject'
};

export function getMasterDataInitialCategory(featureId?: string | null): MasterDataCategory | null {
  if (!featureId) return null;
  return masterDataFeatureMap[featureId] || null;
}

const masterDataSubListFeatureMap: Record<string, string> = {
  'class-teacher-duty': 'classTeacherAssignments',
  'subject-teacher-assignment': 'subjectAllocations',
  'subject-master': 'subjects'
};

export function getMasterDataInitialSubList(featureId?: string | null): string | null {
  if (!featureId) return null;
  return masterDataSubListFeatureMap[featureId] || null;
}

export type WebsiteStudioTab =
  | 'identity'
  | 'media'
  | 'content'
  | 'admissions'
  | 'contact'
  | 'design'
  | 'preview'
  | 'applications'
  | 'confirmation';

const studioModuleMap: Record<string, WebsiteStudioTab[]> = {
  'hm-admission-campaigns': ['admissions', 'applications', 'confirmation'],
  'cl-admission-campaigns': ['admissions'],
  'cl-website-content': ['media', 'content', 'contact', 'design', 'preview']
};

export function getWebsiteStudioTabs(moduleId?: string | null): WebsiteStudioTab[] | null {
  if (!moduleId) return null;
  return studioModuleMap[moduleId] || null;
}

export function isStudentOrParentRole(role: string): boolean {
  return role === 'student' || role === 'parent';
}

export function findModuleFeature(
  module: RoleVisibleModule | null,
  featureId?: string | null
): RoleModuleFeature | null {
  if (!module || !featureId) return null;
  return module.features.find(feature => feature.id === featureId) || null;
}

export function getWebsiteStudioInitialTab(
  moduleId?: string | null,
  featureId?: string | null
): WebsiteStudioTab {
  const allowed = getWebsiteStudioTabs(moduleId) || ['identity'];
  const value = String(featureId || '').toLowerCase();
  const candidate: WebsiteStudioTab = value === 'campaign-workspace'
    ? 'admissions'
    : value === 'application-review-queue'
      ? 'applications'
      : value === 'final-admission-verification'
        ? 'confirmation'
      : value.includes('media') || value.includes('gallery') || value.includes('logo') || value.includes('banner')
        ? 'media'
        : value.includes('confirmation')
          ? 'confirmation'
          : value.includes('application') || value.includes('document-check') || value.includes('prepare-admission')
            ? 'applications'
          : value.includes('campaign') || value.includes('prospectus') || value.includes('eligible') || value.includes('close-admission')
            ? 'admissions'
        : value.includes('contact') || value.includes('map')
          ? 'contact'
          : value.includes('design') || value.includes('theme')
            ? 'design'
            : value.includes('preview') || value.includes('publish')
              ? 'preview'
              : value.includes('content') || value.includes('page') || value.includes('section')
                ? 'content'
                : 'identity';
  return allowed.includes(candidate) ? candidate : allowed[0] || 'identity';
}

export type TimetableWorkspaceTab =
  | 'setup'
  | 'workload'
  | 'generate'
  | 'view'
  | 'reports'
  | 'substitute';

export function getTimetableInitialTab(featureId?: string | null): TimetableWorkspaceTab {
  switch (featureId) {
    case 'teacher-workload':
      return 'workload';
    case 'timetable-generation':
      return 'generate';
    case 'timetable-conflicts':
      return 'view';
    case 'substitute-management':
      return 'substitute';
    case 'publish-lock-timetable':
      return 'view';
    default:
      return 'setup';
  }
}
