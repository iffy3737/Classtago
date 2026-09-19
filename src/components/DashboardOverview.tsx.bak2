/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { takePendingMariaNavigations } from '../lib/mariaClientBridge';
import { 
  Users, BookOpen, AlertCircle, FileText, Calendar, Plus, 
  Landmark, CheckCircle, Clock, CheckCircle2, CircleDollarSign,
  KeyRound, ShieldAlert, ShieldCheck, Lock, Unlock, Search, UserCheck, RefreshCw, Eye, Award, Info, Edit, X, Key
} from 'lucide-react';
import { 
  Language, User, ClassStructure, Notice, 
  TimetableEntry, HomeworkEntry, FeeRecord, AuditLogEntry, UserRole, SystemNotification 
} from '../types';
import { translations } from '../lib/translations';
import UrduWrapper from './UrduWrapper';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { AuthService } from '../lib/authService';
import { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
// import SmartExamManager from './SmartExamManager';
import RoleModuleMenu from './RoleModuleMenu';
import RoleModuleLanding from './RoleModuleLanding';
import RoleFeatureContextHeader from './RoleFeatureContextHeader';
import { loadStudentSignupApprovalQueue } from '../modules/teacherStudentsFresh/TeacherStudentSignupApprovals';
import type { CanonicalDashboardTab, RoleModuleFeature, RoleVisibleModule } from '../lib/roleModuleBlueprint';
import { getRoleModuleCatalogue } from '../lib/roleModuleBlueprint';
import { getAcademicSetupInitialCategory, getClerkWorkspaceTab, getMasterDataInitialCategory, getMasterDataInitialSubList, getTeacherWorkspaceModule, getTimetableInitialTab, getWebsiteStudioInitialTab, getWebsiteStudioTabs, isStudentOrParentRole } from '../lib/roleModuleFocus';
import { Package, Bell } from 'lucide-react';
import { requestActionConfirm } from '../lib/actionConfirm';
import { FALLBACK_LANGUAGE_CATALOGUE, getLanguageOption, languageDisplayName, resolvedDirection } from '../lib/languageCatalog';

// R33.16 performance: role modules are code-split. Opening the ERP dashboard no
// longer parses Result Management, Timetable, Leave, Payroll, Library, Inventory,
// Website Studio and every other role surface up front on mobile devices.
const AcademicSetupModule = React.lazy(() => import('./AcademicSetupModule'));
const TeacherWorkspace = React.lazy(() => import('./TeacherWorkspace'));
const ClerkWorkspace = React.lazy(() => import('./ClerkWorkspace'));
const MasterDataDashboard = React.lazy(() => import('./MasterDataDashboard'));
const StudentDirectoryWorkspace = React.lazy(() => import('./StudentDirectoryWorkspace'));
const HeadmasterStudentRecognition = React.lazy(() => import('../modules/teacherStudentsFresh/HeadmasterStudentRecognition'));
const SmartTimetableV2 = React.lazy(() => import('./SmartTimetableV2'));
const SmartAttendanceManager = React.lazy(() => import('./SmartAttendanceManager'));
const HeadmasterAttendanceCloudWorkspace = React.lazy(() => import('./HeadmasterAttendanceCloudWorkspace'));
const HeadmasterCertificateCloudWorkspace = React.lazy(() => import('./HeadmasterCertificateCloudWorkspace'));
const HeadmasterCommunicationCloudWorkspace = React.lazy(() => import('./HeadmasterCommunicationCloudWorkspace'));
const ClerkAttendanceReportsRegisters = React.lazy(() => import('./ClerkAttendanceReportsRegisters'));
const SmartLeaveManager = React.lazy(() => import('./SmartLeaveManager'));
const HeadmasterLeaveApplication = React.lazy(() => import('./HeadmasterLeaveApplication'));
const CertificateDocumentSystem = React.lazy(() => import('./CertificateDocumentSystem'));
const CertificateStudioHub = React.lazy(() => import('./CertificateStudioHub'));
const ResultAnalyticsDashboard = React.lazy(() => import('./ResultAnalyticsDashboard'));
const SmartFeeManager = React.lazy(() => import('./SmartFeeManager'));
const HeadmasterCloudFeeWorkspace = React.lazy(() => import('./HeadmasterCloudFeeWorkspace'));
const ClerkCloudFeeWorkspace = React.lazy(() => import('./ClerkCloudFeeWorkspace'));
const SmartAccountingManager = React.lazy(() => import('./SmartAccountingManager'));
const SmartPayrollManager = React.lazy(() => import('./SmartPayrollManager'));
const HeadmasterFinanceCloudWorkspace = React.lazy(() => import('./HeadmasterFinanceCloudWorkspace'));
const HeadmasterPayrollHRCloudWorkspace = React.lazy(() => import('./HeadmasterPayrollHRCloudWorkspace'));
const HeadmasterLibraryCloudWorkspace = React.lazy(() => import('./HeadmasterLibraryCloudWorkspace'));
const HeadmasterInventoryCloudWorkspace = React.lazy(() => import('./HeadmasterInventoryCloudWorkspace'));
const HeadmasterSecurityCloudWorkspace = React.lazy(() => import('./HeadmasterSecurityCloudWorkspace'));
const HeadmasterSystemAuditCloudWorkspace = React.lazy(() => import('./HeadmasterSystemAuditCloudWorkspace'));
const SmartLibraryManager = React.lazy(() => import('./SmartLibraryManager'));
const SmartInventoryManager = React.lazy(() => import('./SmartInventoryManager'));
const SmartCommunicationHub = React.lazy(() => import('./SmartCommunicationHub'));
const CloudNotificationCenter = React.lazy(() => import('./CloudNotificationCenter'));
const ClerkCommunicationOffice = React.lazy(() => import('./ClerkCommunicationOffice'));
const SmartSecurityManager = React.lazy(() => import('./SmartSecurityManager'));
const SmartAdminControl = React.lazy(() => import('./SmartAdminControl'));
const StatutoryRegistersManager = React.lazy(() => import('./StatutoryRegistersManager'));
const ClerkCloudStatutoryRegisters = React.lazy(() => import('./ClerkCloudStatutoryRegisters'));
const StaffMaster = React.lazy(() => import('./StaffMaster'));
const StaffAccountManager = React.lazy(() => import('./StaffAccountManager'));
const AcademicAssignmentValidity = React.lazy(() => import('./AcademicAssignmentValidity'));
const ExecutiveDashboard = React.lazy(() => import('./ExecutiveDashboard'));
const SchoolCommandCenter = React.lazy(() => import('./SchoolCommandCenter'));
const HeadmasterLiveOverviewMetrics = React.lazy(() => import('./HeadmasterLiveOverviewMetrics'));
const HeadmasterApprovalInbox = React.lazy(() => import('./HeadmasterApprovalInbox'));
const StudentServiceRequestDesk = React.lazy(() => import('./StudentServiceRequestDesk'));
const HeadmasterResultPublicationDesk = React.lazy(() => import('./HeadmasterResultPublicationDesk'));
const SchoolLanguageSettings = React.lazy(() => import('./SchoolLanguageSettings'));
const ResultManagement = React.lazy(() => import('./ResultManagement'));
const ClerkResultPrintCenter = React.lazy(() => import('./ClerkResultPrintCenter'));
const ClerkCombinedQuestionPaperDesk = React.lazy(() => import('./ClerkCombinedQuestionPaperDesk'));
const CurriculumResultImportStudio = React.lazy(() => import('./CurriculumResultImportStudio'));
const HeadmasterQuestionPaperReview = React.lazy(() => import('./HeadmasterQuestionPaperReview'));
const HeadmasterExamControlWorkspace = React.lazy(() => import('./HeadmasterExamControlWorkspace'));
const HeadmasterResultControlWorkspace = React.lazy(() => import('./HeadmasterResultControlWorkspace'));
const HeadmasterResultAnalyticsWorkspace = React.lazy(() => import('./HeadmasterResultAnalyticsWorkspace'));
const SchoolWebsiteStudio = React.lazy(() => import('./SchoolWebsiteStudio'));
const RoleSelfServiceWorkspace = React.lazy(() => import('./RoleSelfServiceWorkspace'));
const StudentPortalWorkspace = React.lazy(() => import('../modules/studentPortal/StudentPortalWorkspace'));
const ParentPortalWorkspace = React.lazy(() => import('../modules/parentPortal/ParentPortalWorkspace'));
const PeonPortalWorkspace = React.lazy(() => import('../modules/peonPortal/PeonPortalWorkspace'));
const BellTimingManager = React.lazy(() => import('./BellTimingManager'));
const ParentAccountApprovalDesk = React.lazy(() => import('./ParentAccountApprovalDesk'));
const RoleScopedTimetable = React.lazy(() => import('./RoleScopedTimetable'));
const CompleteProfileWorkspace = React.lazy(() => import('./CompleteProfileWorkspace'));

interface DashboardOverviewProps {
  lang: Language;
  user: User;
  onRefreshData: () => void;
}

type DashboardTab = CanonicalDashboardTab;

const LEGACY_HEADMASTER_WEBSITE_ROUTES: Record<string, { moduleId: string; featureId?: string }> = {
  'hm-media-gallery': { moduleId: 'hm-website-studio', featureId: 'media-gallery' },
  'hm-admission-applications': { moduleId: 'hm-admission-campaigns', featureId: 'application-review-queue' },
  'hm-admission-confirmation': { moduleId: 'hm-admission-campaigns', featureId: 'final-admission-verification' }
};

export default function DashboardOverview({ lang, user, onRefreshData }: DashboardOverviewProps) {
  const isUrdu = lang === 'ur';
  // State from local storage/database
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [homework, setHomework] = useState<HomeworkEntry[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedLoginAlert, setDismissedLoginAlert] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Inline profile editor (name/photo/phone). Login ID and role remain immutable.
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileName, setProfileName] = useState(user.name || '');
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState('');
  const [profilePhotoFileName, setProfilePhotoFileName] = useState('');
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // R14 global profile sync: the authenticated App shell can refresh the User object
  // without remounting this dashboard. Keep the visible avatar/name/contact aligned
  // with that authoritative user prop for every school role.
  useEffect(() => {
    setProfilePhotoUrl(user.photoUrl || '');
    setProfileName(user.name || '');
    setProfilePhone(user.phone || '');
  }, [user.id, user.photoUrl, user.name, user.phone]);

  // Flexible multilingual notice composer. English is the default primary language,
  // but Headmaster can switch it to any supported Indian language and add as many
  // additional language versions as required without hard-coded Hindi/Urdu fields.
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticePrimaryLanguage, setNewNoticePrimaryLanguage] = useState('en');
  const [newNoticeTranslations, setNewNoticeTranslations] = useState<Array<{ id: string; languageCode: string; title: string; content: string }>>([]);
  const [newNoticeCategory, setNewNoticeCategory] = useState<'General' | 'Academics' | 'Exam' | 'Fee' | 'Sports'>('General');

  // Student registration states (Clerk form)
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [studentAdmissionNo, setStudentAdmissionNo] = useState('');

  // Homework states
  const [homeworkSubject, setHomeworkSubject] = useState('');
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [homeworkDesc, setHomeworkDesc] = useState('');
  const [homeworkClassId, setHomeworkClassId] = useState('');
  const [homeworkDueDate, setHomeworkDueDate] = useState('');

  // Active view tabs
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);

  // Change Password States (For ALL logged-in users)
  const [currentPasswordOwn, setCurrentPasswordOwn] = useState('');
  const [newEmailOwn, setNewEmailOwn] = useState(user.email || '');
  const [newPasswordOwn, setNewPasswordOwn] = useState('');
  const [confirmPasswordOwn, setConfirmPasswordOwn] = useState('');
  const [passwordOwnError, setPasswordOwnError] = useState('');
  const [passwordOwnSuccess, setPasswordOwnSuccess] = useState('');

  // Class Teacher Student Account Creation States
  const [newStudentGR, setNewStudentGR] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [studentError, setStudentError] = useState('');
  const [studentSuccess, setStudentSuccess] = useState('');
  const [createdStudentCreds, setCreatedStudentCreds] = useState<{username: string, password: string} | null>(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all_staff' | 'approved_staff' | 'pending'>('approved_staff');

  const t = translations[lang];
  const setup = useMemo(() => LocalERPDatabase.getAcademicSetup(), []);
  // Class Teacher privileges must come from the live Headmaster assignment, never
  // from cached/local academic setup or a teacher's name/static role label.
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const resolveClassTeacherDuty = async () => {
      const teacherRole = user.role === 'teacher' || user.role === 'class_teacher';
      if (!teacherRole) {
        if (!cancelled) setIsClassTeacher(false);
        return;
      }
      try {
        const userId = user.authUserId || user.id;
        const { data: membership, error: membershipError } = await supabase
          .from('user_school_memberships')
          .select('school_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        if (membershipError || !membership?.school_id) {
          if (!cancelled) setIsClassTeacher(false);
          return;
        }

        let teacherRow: any = null;
        let teacherError: any = null;
        const byUser = await supabase
          .from('teachers')
          .select('id, school_id, full_name, employee_id, shalarth_id')
          .eq('school_id', membership.school_id)
          .eq('user_id', userId)
          .maybeSingle();
        teacherRow = byUser.data; teacherError = byUser.error;
        if (!teacherRow && !teacherError && user.employeeCode) {
          const byEmployee = await supabase.from('teachers').select('id, school_id, full_name, employee_id, shalarth_id').eq('school_id', membership.school_id).eq('employee_id', user.employeeCode).maybeSingle();
          teacherRow = byEmployee.data; teacherError = byEmployee.error;
        }
        if (!teacherRow && !teacherError && user.shalarthId) {
          const byShalarth = await supabase.from('teachers').select('id, school_id, full_name, employee_id, shalarth_id').eq('school_id', membership.school_id).eq('shalarth_id', user.shalarthId).maybeSingle();
          teacherRow = byShalarth.data; teacherError = byShalarth.error;
        }
        if (!teacherRow && !teacherError && user.name) {
          const byName = await supabase.from('teachers').select('id, school_id, full_name, employee_id, shalarth_id').eq('school_id', membership.school_id).ilike('full_name', user.name.trim()).limit(2);
          if (!byName.error && (byName.data || []).length === 1) teacherRow = byName.data?.[0];
          teacherError = byName.error;
        }
        if (teacherError || !teacherRow?.id) {
          if (!cancelled) setIsClassTeacher(false);
          return;
        }

        const currentYear = await supabase
          .from('school_academic_years')
          .select('id')
          .eq('school_id', membership.school_id)
          .eq('is_active', true)
          .limit(1);
        const activeYearId = !currentYear.error && currentYear.data?.[0]?.id
          ? String(currentYear.data[0].id)
          : null;
        if (!activeYearId) {
          if (!cancelled) setIsClassTeacher(false);
          return;
        }

        // R8 canonical source: Class Teacher access is decided only by the current
        // school_academic_years assignment table. Legacy/browser state cannot add access.
        let query: any = supabase
          .from('school_class_teacher_assignments')
          .select('id,is_active')
          .eq('school_id', membership.school_id)
          .eq('teacher_id', teacherRow.id)
          .eq('is_active', true);
        if (activeYearId) query = query.eq('academic_year_id', activeYearId);
        const result = await query.limit(1);
        const assigned = !result.error && Boolean((result.data || []).length);

        // Browser localStorage is never consulted for role/module visibility, preventing
        // AI Studio Preview-vs-Live divergence for the same Teacher account.
        if (!cancelled) setIsClassTeacher(assigned);
      } catch (error) {
        console.warn('Class Teacher duty could not be verified from cloud; keeping normal Teacher access.', error);
        if (!cancelled) setIsClassTeacher(false);
      }
    };
    void resolveClassTeacherDuty();
    const reload = () => { void resolveClassTeacherDuty(); };
    window.addEventListener('academic_setup_updated', reload);
    window.addEventListener('class_teacher_assignments_updated', reload);
    return () => {
      cancelled = true;
      window.removeEventListener('academic_setup_updated', reload);
      window.removeEventListener('class_teacher_assignments_updated', reload);
    };
  }, [user.id, user.authUserId, user.role]);

  const [clerkResultImportAllowed, setClerkResultImportAllowed] = useState(user.role !== 'clerk');
  useEffect(() => {
    if (user.role !== 'clerk') {
      setClerkResultImportAllowed(true);
      return;
    }
    let cancelled = false;
    const verifyResultOnboardingState = async () => {
      // Fail closed: an existing school must never see a second-curriculum onboarding
      // control simply because status verification is temporarily unavailable.
      if (!cancelled) setClerkResultImportAllowed(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Clerk session unavailable.');
        const response = await fetch('/api/admin/result-system-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store'
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Result System status verification failed.');
        if (!cancelled) setClerkResultImportAllowed(body.importAllowed === true && body.configured !== true);
      } catch (error) {
        console.warn('Result System onboarding visibility is locked until cloud status can be verified.', error);
        if (!cancelled) setClerkResultImportAllowed(false);
      }
    };
    void verifyResultOnboardingState();
    const refresh = () => { void verifyResultOnboardingState(); };
    window.addEventListener('result_system_status_updated', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('result_system_status_updated', refresh);
    };
  }, [user.id, user.authUserId, user.role]);

  const roleModuleCatalogue = useMemo(() => {
    const base = getRoleModuleCatalogue(user.role, isClassTeacher);
    if (user.role !== 'clerk' || clerkResultImportAllowed) return base;
    return base.map(category => ({
      ...category,
      modules: category.modules.map(module => ({
        ...module,
        features: module.features.filter(feature => feature.id !== 'cl-result-import-existing-system')
      }))
    }));
  }, [user.role, isClassTeacher, clerkResultImportAllowed]);
  const allRoleModules = useMemo(
    () => roleModuleCatalogue.flatMap(category => category.modules),
    [roleModuleCatalogue]
  );
  const activeRoleModule = useMemo(
    () => allRoleModules.find(module => module.id === activeModuleId) || null,
    [allRoleModules, activeModuleId]
  );
  const activeRoleFeature = useMemo(
    () => activeRoleModule?.features.find(feature => feature.id === activeFeatureId) || null,
    [activeRoleModule, activeFeatureId]
  );
  const showShortcutHub = useMemo(
    () => Boolean(
      activeRoleModule
        && activeRoleModule.features.length > 0
        && activeRoleModule.id !== 'hm-approval-inbox'
        && activeRoleModule.features.every(feature => feature.shortcut === true)
    ),
    [activeRoleModule]
  );
  const defaultSelfServiceHomeModule = useMemo(
    () => allRoleModules.find(module => module.id === (user.role === 'parent' ? 'pa-home' : 'st-home')) || null,
    [allRoleModules, user.role]
  );
  const selfServiceModule = useMemo(() => {
    if (!isStudentOrParentRole(user.role)) return null;
    return activeRoleModule
      || allRoleModules.find(module => module.tab === activeTab)
      || allRoleModules.find(module => module.features.some(feature => (feature.targetTab || module.tab) === activeTab))
      || defaultSelfServiceHomeModule;
  }, [user.role, activeRoleModule, allRoleModules, activeTab, defaultSelfServiceHomeModule]);
  const teacherWorkspaceModule = useMemo(
    () => getTeacherWorkspaceModule(activeModuleId),
    [activeModuleId]
  );
  const clerkWorkspaceTab = useMemo(
    () => getClerkWorkspaceTab(activeModuleId),
    [activeModuleId]
  );
  const websiteStudioTabs = useMemo(
    () => getWebsiteStudioTabs(activeModuleId),
    [activeModuleId]
  );
  const websiteStudioInitialTab = useMemo(
    () => getWebsiteStudioInitialTab(activeModuleId, activeFeatureId),
    [activeModuleId, activeFeatureId]
  );
  const timetableInitialTab = useMemo(
    () => getTimetableInitialTab(activeFeatureId),
    [activeFeatureId]
  );
  const academicSetupInitialCategory = useMemo(
    () => getAcademicSetupInitialCategory(activeFeatureId),
    [activeFeatureId]
  );
  const masterDataInitialCategory = useMemo(
    () => getMasterDataInitialCategory(activeFeatureId),
    [activeFeatureId]
  );
  const masterDataInitialSubList = useMemo(
    () => getMasterDataInitialSubList(activeFeatureId),
    [activeFeatureId]
  );


  const defaultRoleModules = useMemo<Record<string, boolean>>(() => {
    const defaults: Record<string, string[]> = {
      clerk: ['dashboard', 'admissions', 'attendance', 'fees', 'results', 'certificates', 'communication', 'master_data', 'administration'],
      teacher: ['dashboard', 'attendance', 'results', 'exams', 'timetable', 'communication', 'library', 'certificates'],
      class_teacher: ['dashboard', 'admissions', 'attendance', 'results', 'exams', 'timetable', 'certificates', 'communication', 'library', 'master_data'],
      student: ['dashboard', 'attendance', 'results', 'timetable', 'library', 'certificates', 'communication', 'fees'],
      parent: ['dashboard', 'attendance', 'results', 'timetable', 'library', 'certificates', 'communication', 'fees', 'admissions'],
      peon: ['dashboard', 'attendance', 'timetable', 'communication', 'administration']
    };
    const allowed = new Set(user.role === 'headmaster' ? [
      'dashboard', 'admissions', 'attendance', 'fees', 'results', 'exams', 'timetable', 'library',
      'certificates', 'communication', 'payroll', 'master_data', 'administration'
    ] : (defaults[user.role] || defaults.teacher));
    return Object.fromEntries(Array.from(allowed).map(moduleKey => [moduleKey, true]));
  }, [user.role]);
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean>>(defaultRoleModules);
  const [entitlementEnforced, setEntitlementEnforced] = useState(true);
  const [entitlementLoading, setEntitlementLoading] = useState(true);
  const [entitlementError, setEntitlementError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<'loading' | 'legacy' | 'active' | 'grace' | 'restricted' | 'error'>('loading');
  const [subscriptionContext, setSubscriptionContext] = useState<{ status?: string; planName?: string | null; endsAt?: string | null } | null>(null);
  const [restrictionReason, setRestrictionReason] = useState<string | null>(null);
  const [moduleEntitlements, setModuleEntitlements] = useState<Record<string, boolean>>({ dashboard: true });

  useEffect(() => {
    let cancelled = false;
    const loadModuleEntitlements = async () => {
      if (!cancelled) {
        setEntitlementLoading(true);
        setEntitlementError(null);
        setAccessState('loading');
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Your secure session is unavailable. Please sign in again.');
        const response = await fetch('/api/me/module-entitlements', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Module entitlement lookup failed.');
        if (cancelled) return;

        const state = ['legacy', 'active', 'grace', 'restricted'].includes(body.accessState) ? body.accessState : (body.enforced === true ? 'restricted' : 'legacy');
        setEntitlementEnforced(body.enforced === true);
        setAccessState(state);
        setRestrictionReason(body.restrictionReason || null);
        setSubscriptionContext(body.subscription || null);
        const entitlementKeys = new Set<string>(['dashboard', ...((body.moduleKeys || []).map((key: unknown) => String(key)))]);
        // Backward-compatible visibility for schools whose existing plan predates
        // the dedicated staff_management key. Server-side guards apply the same
        // two-entitlement rule, so this never turns a hidden UI item into an
        // unauthorized API surface.
        if (!entitlementKeys.has('staff_management') && entitlementKeys.has('user_access') && entitlementKeys.has('master_data')) {
          entitlementKeys.add('staff_management');
        }
        // Attendance & Leave is one core operational area in the Headmaster roadmap.
        // Older school plans often contain only the historical `attendance` key,
        // so keep the new dedicated Leave workspace visible under that same paid
        // entitlement instead of silently hiding it. This is a UI compatibility
        // alias only; API/role guards remain authoritative.
        if (!entitlementKeys.has('leave_management') && entitlementKeys.has('attendance')) {
          entitlementKeys.add('leave_management');
        }
        setModuleEntitlements(Object.fromEntries(Array.from(entitlementKeys).map(key => [key, true])));
      } catch (error: any) {
        console.warn('Backend entitlement endpoint was unavailable; trying authenticated Supabase fallback.', error);
        try {
          const { data: fallbackMatrix, error: fallbackError } = await supabase.rpc('edunixo_current_user_module_access_matrix');
          if (fallbackError) throw fallbackError;
          if (cancelled) return;

          const matrix: any = fallbackMatrix || {};
          const subscriptionContext: any = matrix.subscription || {};
          const subscription: any = subscriptionContext.subscription || null;
          const state = ['legacy', 'active', 'grace', 'restricted'].includes(subscriptionContext.access_state)
            ? subscriptionContext.access_state
            : 'restricted';
          const entitlementKeys = new Set<string>(['dashboard', ...((matrix.allowed_module_keys || []).map((key: unknown) => String(key)))]);
          if (!entitlementKeys.has('staff_management') && entitlementKeys.has('user_access') && entitlementKeys.has('master_data')) {
            entitlementKeys.add('staff_management');
          }
          if (!entitlementKeys.has('leave_management') && entitlementKeys.has('attendance')) {
            entitlementKeys.add('leave_management');
          }
          setEntitlementEnforced(true);
          setAccessState(state);
          setRestrictionReason(subscriptionContext.restriction_reason || null);
          setSubscriptionContext(subscription ? {
            status: subscription.status,
            planName: subscription.plan_name || null,
            endsAt: subscription.ends_at || null
          } : null);
          setModuleEntitlements(Object.fromEntries(Array.from(entitlementKeys).map(key => [key, true])));
          setEntitlementError(null);
        } catch (fallbackError: any) {
          console.error('Plan entitlements could not be loaded from backend or authenticated fallback.', fallbackError);
          if (!cancelled) {
            // Fail closed: never reveal paid or role-restricted modules when both
            // authoritative entitlement checks fail.
            setEntitlementEnforced(true);
            setAccessState('error');
            setEntitlementError(fallbackError?.message || error?.message || 'Plan access could not be verified.');
            setRestrictionReason('entitlement_verification_failed');
            setSubscriptionContext(null);
            setModuleEntitlements({ dashboard: true });
          }
        }
      } finally {
        if (!cancelled) setEntitlementLoading(false);
      }
    };
    void loadModuleEntitlements();
    const reloadEntitlements = () => { void loadModuleEntitlements(); };
    window.addEventListener('school_entitlements_updated', reloadEntitlements);
    return () => {
      cancelled = true;
      window.removeEventListener('school_entitlements_updated', reloadEntitlements);
    };
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;
    const loadRolePermissions = async () => {
      if (user.role === 'headmaster') {
        if (!cancelled) setModulePermissions(defaultRoleModules);
        return;
      }
      try {
        const { data: membership, error: membershipError } = await supabase
          .from('user_school_memberships')
          .select('school_id, role_in_school')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (membershipError || !membership?.school_id) return;
        const roleName = String(membership.role_in_school || user.role).toLowerCase();
        const { data, error } = await supabase
          .from('role_permissions')
          .select('module_key, allowed')
          .eq('school_id', membership.school_id)
          .eq('role_name', roleName);
        if (error || cancelled || !data?.length) return;
        // Treat live rows as explicit overrides, not as a complete permission catalogue.
        // Older schools can have sparse role_permissions rows; replacing defaults with only
        // those rows made newly introduced Teacher menus disappear even when their role
        // should have the core module. Explicit false still wins.
        const next: Record<string, boolean> = { ...defaultRoleModules };
        data.forEach((entry: any) => { next[entry.module_key] = entry.allowed === true; });
        if (!cancelled) setModulePermissions(next);
      } catch (error) {
        console.warn('Live role permissions could not be loaded; using safe role defaults.', error);
      }
    };
    setModulePermissions(defaultRoleModules);
    void loadRolePermissions();
    const reloadPermissions = () => { void loadRolePermissions(); };
    window.addEventListener('role_permissions_updated', reloadPermissions);
    return () => {
      cancelled = true;
      window.removeEventListener('role_permissions_updated', reloadPermissions);
    };
  }, [user.id, user.role, defaultRoleModules]);

  const tabPermissionKey = (tab: DashboardTab): string => {
    const map: Record<DashboardTab, string> = {
      overview: 'dashboard',
      admission_desk: 'admissions',
      accounts: 'admissions',
      security: 'dashboard',
      academic_setup: 'master_data',
      language_settings: 'master_data',
      website_studio: 'master_data',
      master_data: 'master_data',
      timetable_v2: 'timetable',
      attendance: 'attendance',
      leave_management: 'attendance',
      exams: 'exams',
      result_management: 'results',
      analytics: 'results',
      fees: 'fees',
      accounting: 'fees',
      payroll: 'payroll',
      library: 'library',
      inventory: 'master_data',
      communication: 'communication',
      gatekeeper_security: 'administration',
      erp_admin: 'administration',
      gov_registers: 'administration',
      executive_dss: 'dashboard',
      staff_master: 'master_data'
    };
    return map[tab];
  };

  const tabEntitlementKey = (tab: DashboardTab): string => {
    const map: Record<DashboardTab, string> = {
      overview: 'dashboard',
      admission_desk: 'admissions',
      accounts: user.role === 'headmaster' ? 'user_access' : 'student_management',
      security: 'dashboard',
      academic_setup: 'master_data',
      language_settings: 'school_setup',
      website_studio: user.role === 'clerk' ? 'master_data' : 'school_setup',
      master_data: 'master_data',
      timetable_v2: 'timetable',
      attendance: 'attendance',
      leave_management: 'attendance',
      exams: 'exams',
      result_management: 'results',
      analytics: 'results',
      fees: 'fees',
      accounting: 'fees',
      payroll: 'payroll',
      library: 'library',
      inventory: 'inventory',
      communication: 'communication',
      gatekeeper_security: 'front_office',
      erp_admin: 'administration',
      gov_registers: 'administration',
      executive_dss: 'analytics_reports',
      staff_master: 'staff_management'
    };
    return map[tab];
  };

  const canAccessTab = (tab: DashboardTab) => {
    const permissionKey = tabPermissionKey(tab);
    const entitlementKey = tabEntitlementKey(tab);
    const isLeaveWorkspace = tab === 'leave_management';
    const roleAllowed = user.role === 'headmaster'
      || tab === 'security'
      || modulePermissions[permissionKey] === true
      || (isLeaveWorkspace && modulePermissions.attendance === true);
    const isSafeAccountSurface = entitlementKey === 'dashboard' || tab === 'security';
    const hasPlanEntitlement = moduleEntitlements[entitlementKey] === true
      || (isLeaveWorkspace && (moduleEntitlements.leave_management === true || moduleEntitlements.attendance === true));
    const commerciallyAllowed = isSafeAccountSurface
      || (!entitlementLoading && accessState === 'legacy')
      || (!entitlementLoading && ['active', 'grace'].includes(accessState) && hasPlanEntitlement);
    return roleAllowed && commerciallyAllowed;
  };

  useEffect(() => {
    if (!canAccessTab(activeTab)) setActiveTab('overview');
  }, [activeTab, accessState, entitlementLoading, moduleEntitlements, modulePermissions]);

  const writeWorkspaceRoute = (
    tab: DashboardTab,
    moduleId?: string | null,
    featureId?: string | null
  ) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('module');
    const hash = new URLSearchParams();
    hash.set('module', tab);
    if (moduleId) hash.set('view', moduleId);
    if (featureId) hash.set('feature', featureId);
    url.hash = hash.toString();
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const requestTab = (tab: DashboardTab) => {
    if (!canAccessTab(tab)) {
      alert(accessState === 'restricted'
        ? 'The school subscription is not currently active. School data is preserved, but operational modules are locked.'
        : accessState === 'error' || entitlementLoading
          ? 'Plan access could not be verified yet. Please refresh after the secure connection is restored.'
          : entitlementEnforced
            ? 'This feature is not included in the school’s active plan or is not permitted for your role.'
            : 'Access denied by the Headmaster role-permission matrix.');
      return;
    }
    setActiveModuleId(null);
    setActiveFeatureId(null);
    setActiveTab(tab);
    writeWorkspaceRoute(tab);
  };

  const resolveModuleRoute = (module: RoleVisibleModule): DashboardTab | null => {
    // Leave Management is a separate focused workspace but commercially belongs
    // to the Attendance & Leave entitlement. Keep legacy schools compatible even
    // if their plan has not yet been migrated to a dedicated leave key.
    if (module.id === 'hm-leave-management' && canAccessTab('attendance')) return 'leave_management';
    if (canAccessTab(module.tab)) return module.tab;
    return module.features
      .map(feature => feature.targetTab || module.tab)
      .find(tab => canAccessTab(tab)) || null;
  };

  const openRoleModule = (module: RoleVisibleModule) => {
    const target = resolveModuleRoute(module);
    if (!target) {
      alert('This module is not included in the active plan or is not permitted for this account.');
      return;
    }
    const defaultFeatureId = user.role === 'clerk' && module.features.length > 0 && !module.features.every(feature => feature.shortcut === true)
      ? module.features[0].id
      : null;
    setActiveTab(target);
    setActiveModuleId(module.id);
    setActiveFeatureId(defaultFeatureId);
    writeWorkspaceRoute(target, module.id, defaultFeatureId);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const openRoleFeature = (module: RoleVisibleModule, feature: RoleModuleFeature) => {
    if (feature.shortcut && feature.ownerModuleId) {
      const ownerModule = allRoleModules.find(item => item.id === feature.ownerModuleId);
      if (ownerModule) {
        const ownerFeature = feature.ownerFeatureId
          ? ownerModule.features.find(item => item.id === feature.ownerFeatureId)
          : null;
        if (ownerFeature) {
          openRoleFeature(ownerModule, ownerFeature);
        } else {
          openRoleModule(ownerModule);
        }
        return;
      }
    }
    const target = feature.targetTab || module.tab;
    if (!canAccessTab(target)) {
      alert('This feature is not included in the active plan or is not permitted for this account.');
      return;
    }
    setActiveTab(target);
    setActiveModuleId(module.id);
    setActiveFeatureId(feature.id);
    writeWorkspaceRoute(target, module.id, feature.id);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };


  const openRoleModuleById = (moduleId: string, featureId?: string): boolean => {
    // Canonicalize legacy/notification route aliases before looking in the visible
    // role catalogue. This keeps notification buttons and normal menu navigation
    // on the same route resolver instead of silently no-oping on an alias id.
    const legacyRoute = LEGACY_HEADMASTER_WEBSITE_ROUTES[moduleId];
    if (legacyRoute) {
      return openRoleModuleById(legacyRoute.moduleId, featureId || legacyRoute.featureId);
    }
    const module = allRoleModules.find(item => item.id === moduleId);
    if (!module) {
      console.warn(`Classtago route is not visible for this account: ${moduleId}${featureId ? ` / ${featureId}` : ''}`);
      return false;
    }
    const feature = featureId ? module.features.find(item => item.id === featureId) : null;
    if (featureId && !feature) {
      console.warn(`Classtago feature route is not visible for this account: ${moduleId} / ${featureId}`);
      return false;
    }
    if (feature) openRoleFeature(module, feature);
    else openRoleModule(module);
    return true;
  };

  // R2.5.96 Maria direct navigation bridge: expose the exact same guarded opener
  // used by the visible role menu. Maria never gets a second routing authority.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window as any;
    root.__classtago_maria_open_role_module = openRoleModuleById;
    return () => {
      if (root.__classtago_maria_open_role_module === openRoleModuleById) {
        delete root.__classtago_maria_open_role_module;
      }
    };
  }, [openRoleModuleById]);

  // R2.5.46 free Smart Command Search uses the exact same visible-module
  // opener as the normal menu. It cannot bypass role, plan or feature gates.
  useEffect(() => {
    const handleSmartNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ moduleId?: string; featureId?: string }>).detail || {};
      if (!detail.moduleId) return;
      openRoleModuleById(String(detail.moduleId), detail.featureId ? String(detail.featureId) : undefined);
    };
    window.addEventListener('edunixo_smart_navigate', handleSmartNavigate as EventListener);
    for (const pending of takePendingMariaNavigations()) {
      if (pending?.moduleId) openRoleModuleById(String(pending.moduleId), pending.featureId ? String(pending.featureId) : undefined);
    }
    return () => window.removeEventListener('edunixo_smart_navigate', handleSmartNavigate as EventListener);
  }, [allRoleModules, accessState, entitlementLoading, moduleEntitlements, modulePermissions]);

  // R20.2: Use the exact same module opener as the visible Teacher menu.
  // Notification navigation must never maintain a second routing implementation.
  const openStudentSignupApprovalQueue = () => {
    const module = allRoleModules.find(item => item.id === 'tr-student-signup-approvals');
    if (!module) {
      console.warn('Student Signup Approvals module is not currently visible for this account.');
      return;
    }
    openRoleModule(module);
  };


  const openCompleteProfile = () => {
    if (user.role === 'headmaster') return openRoleModuleById('hm-complete-profile');
    if (user.role === 'clerk') return openRoleModuleById('cl-complete-profile');
    if (user.role === 'teacher' || user.role === 'class_teacher') return openRoleModuleById('tr-complete-profile');
    if (user.role === 'student') return openRoleModuleById('st-profile', 'st-complete-profile');
    if (user.role === 'parent') return openRoleModuleById('pa-profile', 'pa-complete-profile');
    if (user.role === 'peon') return openRoleModuleById('pn-profile', 'pn-complete-profile');
  };


  const returnToActiveModuleRoot = () => {
    if (!activeRoleModule) return;
    const target = resolveModuleRoute(activeRoleModule);
    if (!target) return;
    setActiveFeatureId(null);
    setActiveTab(target);
    writeWorkspaceRoute(target, activeRoleModule.id, null);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const returnToDashboard = () => {
    if (!canAccessTab('overview')) return;
    setActiveModuleId(null);
    setActiveFeatureId(null);
    setActiveTab('overview');
    writeWorkspaceRoute('overview');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };


  useEffect(() => {
    if (entitlementLoading || typeof window === 'undefined') return;
    let cancelled = false;
    const validTabs: DashboardTab[] = [
      'overview', 'admission_desk', 'accounts', 'security', 'academic_setup', 'language_settings', 'website_studio',
      'master_data', 'timetable_v2', 'attendance', 'leave_management', 'exams', 'result_management', 'analytics', 'fees',
      'accounting', 'payroll', 'library', 'inventory', 'communication', 'gatekeeper_security',
      'erp_admin', 'gov_registers', 'executive_dss', 'staff_master'
    ];

    const resolveDirectModule = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const legacyHashMatch = url.hash.match(/^#?module=([a-z0-9_]+)$/i);
      const requested = String(
        hashParams.get('module') || legacyHashMatch?.[1] || url.searchParams.get('module') || ''
      ).toLowerCase() as DashboardTab;
      let requestedModuleId = String(hashParams.get('view') || '').trim();
      let requestedFeatureId = String(hashParams.get('feature') || '').trim();
      const legacyRoute = LEGACY_HEADMASTER_WEBSITE_ROUTES[requestedModuleId];
      if (legacyRoute) {
        requestedModuleId = legacyRoute.moduleId;
        requestedFeatureId = legacyRoute.featureId || requestedFeatureId;
      }
      if (!requested || !validTabs.includes(requested)) return;

      if (canAccessTab(requested)) {
        const requestedModule = allRoleModules.find(module => module.id === requestedModuleId) || null;
        const requestedFeature = requestedModule?.features.find(feature => feature.id === requestedFeatureId) || null;
        const moduleRoutes = requestedModule
          ? new Set<DashboardTab>([requestedModule.tab, ...requestedModule.features.map(feature => feature.targetTab || requestedModule.tab)])
          : null;
        const validContext = requestedModule && moduleRoutes?.has(requested);

        if (!cancelled) {
          setActiveTab(requested);
          setActiveModuleId(validContext ? requestedModule.id : null);
          setActiveFeatureId(validContext && requestedFeature ? requestedFeature.id : null);
        }
        writeWorkspaceRoute(
          requested,
          validContext ? requestedModule.id : null,
          validContext && requestedFeature ? requestedFeature.id : null
        );
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`/api/me/access-check/${encodeURIComponent(tabEntitlementKey(requested))}`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
        }
      } catch (error) {
        console.warn('Denied direct module route could not be reported.', error);
      }

      if (!cancelled) {
        alert(accessState === 'restricted'
          ? 'This school subscription is not active. School data is safe, but this module is locked.'
          : 'This module is not included in the active plan or is not permitted for your role.');
        setActiveTab('overview');
        setActiveModuleId(null);
        setActiveFeatureId(null);
      }
      writeWorkspaceRoute('overview');
    };

    void resolveDirectModule();
    const handleHashChange = () => { void resolveDirectModule(); };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [entitlementLoading, accessState, moduleEntitlements, modulePermissions, allRoleModules]);

  const localNotificationsForUser = () => {
    const allNotifs = LocalERPDatabase.getNotifications();
    return allNotifs.filter(n =>
      n.recipientId === user.id ||
      n.recipientId === user.role ||
      n.recipientId === 'all'
    );
  };

  const loadNotifications = async () => {
    const localNotifs = localNotificationsForUser();
    setNotifications(localNotifs);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData.session?.user?.id;
      const authToken = sessionData.session?.access_token;
      if (!authUserId || !authToken) return;

      // R2.5.98 performance: cloud notifications and role-specific synthetic
      // queues run in parallel instead of one-after-another. Previously this
      // serial chain alone took 5-9 seconds on every dashboard load.
      const cloudPromise = supabase
        .from('edunixo_user_notifications')
        .select('id,title,body,notification_type,source_key,is_read,created_at')
        .eq('recipient_user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(60);

      const admissionPromise = user.role === 'headmaster'
        ? fetch('/api/school-website/admission-applications?status=verified', {
            headers: { Authorization: `Bearer ${authToken}` }
          }).then(r => r.ok ? r.json().catch(() => ({})) : {}).catch(() => ({}))
        : Promise.resolve({});

      const signupPromise = (user.role === 'teacher' || user.role === 'class_teacher')
        ? loadStudentSignupApprovalQueue().catch(() => ({ requests: [], recentAdmissions: [] }))
        : Promise.resolve({ requests: [], recentAdmissions: [] });

      const [cloudResponse, admissionPayload, queue] = await Promise.all([
        cloudPromise,
        admissionPromise,
        signupPromise
      ]);

      const cloudRows = cloudResponse.error ? [] : (cloudResponse.data || []);
      const cloudNotifs: SystemNotification[] = cloudRows.map((row: any) => ({
        id: `cloud:${row.id}`,
        recipientId: authUserId,
        title: String(row.title || 'Notification'),
        content: String(row.body || ''),
        date: String(row.created_at || ''),
        isRead: Boolean(row.is_read),
        type: String(row.notification_type || 'general'),
        sourceKey: String(row.source_key || '')
      }));

      const synthetic: SystemNotification[] = [];
      if (user.role === 'headmaster') {
        const applications = Array.isArray((admissionPayload as any)?.applications) ? (admissionPayload as any).applications : [];
        const sourceKeys = new Set<string>((cloudRows as any[]).map((row: any) => String(row.source_key || '')));
        const readIds = new Set<string>(JSON.parse(localStorage.getItem('edunixo_admission_notification_reads') || '[]'));
        for (const application of applications) {
          const applicationId = String(application?.id || '');
          if (!applicationId) continue;
          const hasCloud = Array.from(sourceKeys).some(key => key.includes(`admission-intake:`) && key.includes(`:${applicationId}:`));
          if (hasCloud) continue;
          const id = `admission:${applicationId}`;
          synthetic.push({
            id,
            recipientId: authUserId,
            title: 'Admission Intake Ready for Review',
            content: `${String(application?.studentName || 'Student')} (${String(application?.referenceCode || 'Admission application')}) is verified and waiting for Headmaster decision.`,
            date: String(application?.createdAt || new Date().toISOString()),
            isRead: readIds.has(id),
            type: 'admission_intake_ready'
          });
        }
      }
      if (user.role === 'teacher' || user.role === 'class_teacher') {
        const sourceKeys = new Set<string>((cloudRows as any[]).map((row: any) => String(row.source_key || '')));
        const readIds = new Set<string>(JSON.parse(localStorage.getItem('edunixo_signup_notification_reads') || '[]'));
        for (const request of (queue as any).requests || []) {
          const hasCloud = Array.from(sourceKeys).some(key =>
            (request.requestId && key.endsWith(`:${request.requestId}`) && key.includes('student-signup-request:')) ||
            (key.endsWith(`:${request.accountUserId}`) && key.includes('student-account-signup:'))
          );
          if (hasCloud) continue;
          const id = `signup:${request.accountUserId}`;
          synthetic.push({
            id,
            recipientId: authUserId,
            title: 'Student Signup Approval Required',
            content: `${request.studentName} (${request.grNumber}) signed up for the Student Portal and is waiting for your Class Teacher approval.${request.requestCode ? ` Request ${request.requestCode}.` : ''}`,
            date: request.requestedAt || new Date().toISOString(),
            isRead: readIds.has(id),
            type: 'student_account_signup'
          });
        }
        const admissionReadIds = new Set<string>(JSON.parse(localStorage.getItem('edunixo_new_admission_notification_reads') || '[]'));
        for (const admission of (queue as any).recentAdmissions || []) {
          const hasCloud = Array.from(sourceKeys).some(key => key.includes('student-new-admission:') && key.endsWith(`:${admission.studentId}`));
          if (hasCloud) continue;
          const id = `new-admission:${admission.studentId}`;
          synthetic.push({
            id,
            recipientId: authUserId,
            title: 'New Admission Added to Your Class',
            content: `${admission.studentName} (GR ${admission.grNumber}) has been admitted to ${admission.className}${admission.divisionName ? ` · ${admission.divisionName}` : ''}.`,
            date: admission.admittedAt || new Date().toISOString(),
            isRead: admissionReadIds.has(id),
            type: 'student_new_admission'
          });
        }
      }

      const merged = [...cloudNotifs, ...synthetic, ...localNotifs]
        .filter((item, index, list) => list.findIndex(other => other.id === item.id) === index)
        .sort((a, b) => {
          const at = Date.parse(a.date || '') || 0;
          const bt = Date.parse(b.date || '') || 0;
          return bt - at;
        });
      setNotifications(merged);
    } catch {
      setNotifications(localNotifs);
    }
  };

  const loadData = () => {
    setClasses(LocalERPDatabase.getClasses());
    setNotices(LocalERPDatabase.getNotices());
    setTimetable(LocalERPDatabase.getTimetable());
    setHomework(LocalERPDatabase.getHomework());
    setFees(LocalERPDatabase.getFees());
    setAuditLogs(LocalERPDatabase.getAuditLogs());
    setAllUsersList(LocalERPDatabase.getUsers());
    void loadNotifications();
  };

  const handleMarkNotifAsRead = async (id: string) => {
    if (id.startsWith('cloud:')) {
      const cloudId = id.slice('cloud:'.length);
      await supabase.from('edunixo_user_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', cloudId);
      await loadNotifications();
      return;
    }
    if (id.startsWith('signup:')) {
      const existing = new Set<string>(JSON.parse(localStorage.getItem('edunixo_signup_notification_reads') || '[]'));
      existing.add(id);
      localStorage.setItem('edunixo_signup_notification_reads', JSON.stringify(Array.from(existing)));
      await loadNotifications();
      return;
    }
    if (id.startsWith('admission:')) {
      const existing = new Set<string>(JSON.parse(localStorage.getItem('edunixo_admission_notification_reads') || '[]'));
      existing.add(id);
      localStorage.setItem('edunixo_admission_notification_reads', JSON.stringify(Array.from(existing)));
      await loadNotifications();
      return;
    }
    if (id.startsWith('new-admission:')) {
      const existing = new Set<string>(JSON.parse(localStorage.getItem('edunixo_new_admission_notification_reads') || '[]'));
      existing.add(id);
      localStorage.setItem('edunixo_new_admission_notification_reads', JSON.stringify(Array.from(existing)));
      await loadNotifications();
      return;
    }
    LocalERPDatabase.markNotificationAsRead(id);
    await loadNotifications();
  };

  const getNotificationPrimaryAction = (notification: SystemNotification): 'signup' | 'new_admission' | 'admission_intake' | null => {
    const type = String(notification.type || '').trim().toLowerCase();
    const title = String(notification.title || '').trim().toLowerCase();
    if ((user.role === 'teacher' || user.role === 'class_teacher') && (
      type === 'student_account_signup' || title.includes('student signup approval') || title.includes('signup approval required')
    )) return 'signup';
    if ((user.role === 'teacher' || user.role === 'class_teacher') && (
      type === 'student_new_admission' || title.includes('new admission')
    )) return 'new_admission';
    if (user.role === 'headmaster' && (
      type === 'admission_intake_ready' || title.includes('admission intake ready')
    )) return 'admission_intake';
    return null;
  };

  const openNotificationPrimaryAction = (notification: SystemNotification) => {
    const action = getNotificationPrimaryAction(notification);
    if (!action) return;
    setShowNotifications(false);
    void handleMarkNotifAsRead(notification.id);
    if (action === 'signup') {
      openStudentSignupApprovalQueue();
      return;
    }
    if (action === 'new_admission') {
      const sourceKey = String(notification.sourceKey || '');
      const sourceStudentId = sourceKey.startsWith('student-new-admission:') ? sourceKey.split(':').pop() || '' : '';
      const syntheticStudentId = notification.id.startsWith('new-admission:') ? notification.id.slice('new-admission:'.length) : '';
      const studentId = sourceStudentId || syntheticStudentId;
      if (studentId) {
        sessionStorage.setItem('edunixo.teacher.roster.focus', JSON.stringify({ studentId, reason: 'new_admission', at: Date.now() }));
      }
      openRoleModuleById('tr-my-students-list');
      return;
    }
    if (action === 'admission_intake') {
      openRoleModuleById('hm-admission-applications');
    }
  };

  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      loadData();
    };

    // R33.16 performance: background notification refresh must not keep issuing
    // cloud/synthetic queue work while the tab is hidden or on every rapid
    // focus transition. Local data still refreshes immediately on explicit app
    // events; cloud polling is visible-tab only and throttled.
    let lastFocusRefreshAt = Date.now();
    const refreshCloudOnFocus = () => {
      const now = Date.now();
      if (document.visibilityState !== 'visible' || now - lastFocusRefreshAt < 15000) return;
      lastFocusRefreshAt = now;
      void loadNotifications();
    };
    const cloudNotificationTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadNotifications();
    }, 60000);

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('refresh_notifications', handleRefresh);
    window.addEventListener('focus', refreshCloudOnFocus);

    return () => {
      window.clearInterval(cloudNotificationTimer);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('refresh_notifications', handleRefresh);
      window.removeEventListener('focus', refreshCloudOnFocus);
    };
  }, []);

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Choose a JPG, PNG or WEBP photo.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Profile photo must be 2 MB or smaller.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const photoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Photo could not be read.'));
        reader.readAsDataURL(file);
      });
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Your session has expired. Please log in again.');
      const response = await fetch('/api/profile/photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ photoDataUrl })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Profile photo could not be saved.');
      const savedPhotoUrl = String(payload.photoUrl || photoDataUrl);
      setProfilePhotoUrl(savedPhotoUrl);
      const updatedUser: User = { ...user, photoUrl: savedPhotoUrl };
      LocalERPDatabase.saveUser(updatedUser);
      window.dispatchEvent(new CustomEvent('edunixo_profile_updated', { detail: { user: updatedUser, changedAt: Date.now() } }));
      onRefreshData();
      alert('Profile photo updated successfully.');
    } catch (error: any) {
      alert(error?.message || 'Profile photo could not be updated.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const usedNoticeLanguages = useMemo(() => new Set([newNoticePrimaryLanguage, ...newNoticeTranslations.map(item => item.languageCode)]), [newNoticePrimaryLanguage, newNoticeTranslations]);

  const addNoticeLanguage = () => {
    const next = FALLBACK_LANGUAGE_CATALOGUE.find(option => !usedNoticeLanguages.has(String(option.code)));
    if (!next) {
      alert('All available Indian languages are already added to this notice.');
      return;
    }
    setNewNoticeTranslations(current => [...current, { id: `notice-lang-${Date.now()}-${current.length}`, languageCode: String(next.code), title: '', content: '' }]);
  };

  const changePrimaryNoticeLanguage = (languageCode: string) => {
    if (newNoticeTranslations.some(item => item.languageCode === languageCode)) {
      alert('That language is already added as another notice language. Remove it there first.');
      return;
    }
    setNewNoticePrimaryLanguage(languageCode);
  };

  const updateNoticeTranslation = (id: string, patch: Partial<{ languageCode: string; title: string; content: string }>) => {
    if (patch.languageCode) {
      const duplicate = patch.languageCode === newNoticePrimaryLanguage || newNoticeTranslations.some(item => item.id !== id && item.languageCode === patch.languageCode);
      if (duplicate) {
        alert('Each notice language can be selected only once.');
        return;
      }
    }
    setNewNoticeTranslations(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
      alert('Primary notice title and content are required.');
      return;
    }
    const incomplete = newNoticeTranslations.find(item => !item.title.trim() || !item.content.trim());
    if (incomplete) {
      const language = getLanguageOption(incomplete.languageCode);
      alert(`Complete both Title and Notice Body for ${language.englishName}, or remove that language.`);
      return;
    }

    const primaryLanguage = getLanguageOption(newNoticePrimaryLanguage);
    const allTranslations = [
      {
        languageCode: String(primaryLanguage.code),
        languageName: primaryLanguage.englishName,
        nativeName: primaryLanguage.nativeName,
        direction: resolvedDirection(primaryLanguage),
        title: newNoticeTitle.trim(),
        content: newNoticeContent.trim(),
      },
      ...newNoticeTranslations.map(entry => {
        const language = getLanguageOption(entry.languageCode);
        return {
          languageCode: String(language.code),
          languageName: language.englishName,
          nativeName: language.nativeName,
          direction: resolvedDirection(language),
          title: entry.title.trim(),
          content: entry.content.trim(),
        };
      }),
    ];
    const hindi = allTranslations.find(entry => entry.languageCode === 'hi');
    const urdu = allTranslations.find(entry => entry.languageCode === 'ur');

    const item: Notice = {
      id: `notice_${Date.now()}`,
      title: newNoticeTitle.trim(),
      titleHi: hindi?.title,
      titleUr: urdu?.title,
      content: newNoticeContent.trim(),
      contentHi: hindi?.content,
      contentUr: urdu?.content,
      primaryLanguageCode: String(primaryLanguage.code),
      primaryLanguageName: primaryLanguage.englishName,
      translations: allTranslations,
      date: new Date().toISOString().substring(0, 10),
      category: newNoticeCategory,
      targetRoles: ['headmaster', 'clerk', 'teacher', 'student', 'parent'],
      publishedBy: user.name
    };

    LocalERPDatabase.saveNotice(item, user);
    loadData();
    onRefreshData();
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setNewNoticePrimaryLanguage('en');
    setNewNoticeTranslations([]);
    alert(lang === 'ur' ? 'نوٹس کامیابی سے شائع ہو گیا!' : lang === 'hi' ? 'सूचना सफलतापूर्वक प्रकाशित की गई!' : 'Notice published successfully!');
  };

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentEmail || !studentClassId || !studentAdmissionNo) {
      alert("All registration fields are required.");
      return;
    }

    const studentUser: User = {
      id: `user_${Date.now()}`,
      name: studentName,
      email: studentEmail,
      role: 'student',
      classId: studentClassId,
      admissionNo: studentAdmissionNo,
      rollNo: Math.floor(Math.random() * 50) + 1,
      phone: '+91 99999 00000',
      designation: 'Student',
      username: studentAdmissionNo, // Clerk maps Admission No as user ID
      mustChangePassword: false,
      isActive: true
    };

    LocalERPDatabase.saveUser(studentUser);

    // Auto-create initial blank fee record for student
    const selectedClass = classes.find(c => c.id === studentClassId);
    const feeItem: FeeRecord = {
      id: `fee_${Date.now()}`,
      studentId: studentUser.id,
      studentName: studentName,
      className: selectedClass ? `${selectedClass.className} ${selectedClass.division || ''}` : 'Class Unknown',
      amount: 15000,
      paidAmount: 0,
      status: 'Unpaid',
      dueDate: '2026-09-30',
      academicYear: '2026-27'
    };

    LocalERPDatabase.saveFeeRecord(feeItem);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'REGISTER_STUDENT', 'Admission', `Registered new student: ${studentName}`);
    loadData();

    setStudentName('');
    setStudentEmail('');
    setStudentClassId('');
    setStudentAdmissionNo('');

    alert(lang === 'ur' ? 'طالب علم کا داخلہ کامیابی سے مکمل ہوا!' : lang === 'hi' ? 'छात्र पंजीकरण सफलतापूर्वक संपन्न हुआ!' : 'Student registered and admission record created!');
  };

  const handleCreateHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkSubject || !homeworkTitle || !homeworkDesc || !homeworkClassId || !homeworkDueDate) {
      alert("All fields are required to assign homework.");
      return;
    }

    const homeworkItem: HomeworkEntry = {
      id: `hw_${Date.now()}`,
      classId: homeworkClassId,
      subject: homeworkSubject,
      title: homeworkTitle,
      description: homeworkDesc,
      assignedDate: new Date().toISOString().substring(0, 10),
      dueDate: homeworkDueDate,
      teacherName: user.name
    };

    LocalERPDatabase.saveHomeworkEntry(homeworkItem);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'ASSIGN_HOMEWORK', 'Homework', `Assigned ${homeworkSubject} task: ${homeworkTitle}`);
    loadData();

    setHomeworkSubject('');
    setHomeworkTitle('');
    setHomeworkDesc('');
    setHomeworkClassId('');
    setHomeworkDueDate('');

    alert(lang === 'ur' ? 'ہوم ورک کامیابی سے تفویض ہو گیا!' : lang === 'hi' ? 'गृहकार्य सफलतापूर्वक सहेजा गया!' : 'Homework assigned and published to students portal!');
  };

  const handleCollectFee = (feeId: string) => {
    const matched = fees.find(f => f.id === feeId);
    if (matched) {
      const updated: FeeRecord = {
        ...matched,
        paidAmount: matched.amount,
        status: 'Paid'
      };
      LocalERPDatabase.saveFeeRecord(updated);
      LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'COLLECT_FEE', 'Fees', `Cleared outstanding dues for student ID: ${matched.studentName}`);
      loadData();
      alert(lang === 'ur' ? 'فیس کی ادائیگی کامیابی سے درج ہو گئی!' : lang === 'hi' ? 'शुल्क भुगतान सफलतापूर्वक प्राप्त हुआ!' : 'Fees cleared and paid status set to Paid!');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (await requestActionConfirm({ title: 'Delete notice?', message: 'Delete this notice?', confirmLabel: 'Delete Notice', tone: 'danger' })) {
      LocalERPDatabase.deleteNotice(id);
      loadData();
      onRefreshData();
    }
  };

  // CHANGE PASSWORD HANDLER
  const handleChangePasswordOwn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordOwnError('');
    setPasswordOwnSuccess('');

    if (newPasswordOwn && newPasswordOwn.length < 6) {
      setPasswordOwnError('New password must be at least 6 characters.');
      return;
    }
    if (newPasswordOwn && newPasswordOwn !== confirmPasswordOwn) {
      setPasswordOwnError('New passwords do not match.');
      return;
    }

    const emailToUpdate = undefined; // Login email is derived from the permanent User ID.
    const passToUpdate = newPasswordOwn.trim() ? newPasswordOwn.trim() : undefined;

    if (!emailToUpdate && !passToUpdate) {
      setPasswordOwnError('Please enter a new password to update.');
      return;
    }

    // Call AuthService.updateCredentials to update Supabase Auth
    const authRes = await AuthService.updateCredentials(emailToUpdate, passToUpdate);
    if (authRes.error) {
      setPasswordOwnError(authRes.error.message || 'Failed to update credentials in Supabase Auth');
      return;
    }

    const updatedUser: User = {
      ...user,
      email: user.email,
      mustChangePassword: false
    };
    delete updatedUser.password;

    LocalERPDatabase.saveUser(updatedUser);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'CREDENTIALS_CHANGED_SELF',
      'Security',
      `User ${user.username} updated their Supabase Auth credentials`
    );

    setPasswordOwnSuccess('Your credentials have been changed successfully!');
    setCurrentPasswordOwn('');
    setNewPasswordOwn('');
    setConfirmPasswordOwn('');
    loadData();
  };

  // CLASS TEACHER STUDENT ACCOUNT CREATION HANDLER
  const handleCreateStudentAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setStudentSuccess('');
    setCreatedStudentCreds(null);

    if (!newStudentName || !newStudentEmail || !newStudentGR) {
      setStudentError('Student Name, Email, and GR Number are required.');
      return;
    }

    const cleanedGR = newStudentGR.trim();

    // Validate unique GR Number
    const grConflict = allUsersList.find(u => u.username?.toLowerCase() === cleanedGR.toLowerCase());
    if (grConflict) {
      setStudentError(`GR Number "${cleanedGR}" is already in use by another student profile.`);
      return;
    }

    const tempPassword = `stud_${Math.floor(Math.random() * 90000) + 10000}`;

    const newStudentObj: User = {
      id: `user_${Date.now()}`,
      name: newStudentName,
      email: newStudentEmail,
      role: 'student',
      username: cleanedGR,
      password: tempPassword,
      phone: newStudentPhone || '+91 99999 00000',
      designation: 'Student',
      mustChangePassword: true,
      isActive: true,
      classId: user.classId, // Locks automatically to class teacher's class
      grNumber: cleanedGR,
      rollNo: newStudentRoll ? parseInt(newStudentRoll) : Math.floor(Math.random() * 50) + 1
    };

    LocalERPDatabase.saveUser(newStudentObj);

    // Auto-create initial blank fee record for student
    const selectedClass = classes.find(c => c.id === user.classId);
    const feeItem: FeeRecord = {
      id: `fee_${Date.now()}`,
      studentId: newStudentObj.id,
      studentName: newStudentName,
      className: selectedClass ? `${selectedClass.className} ${selectedClass.division || ''}` : 'Class Division',
      amount: 15000,
      paidAmount: 0,
      status: 'Unpaid',
      dueDate: '2026-09-30',
      academicYear: '2026-27'
    };
    LocalERPDatabase.saveFeeRecord(feeItem);

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'CREATE_STUDENT_ACCOUNT',
      'Account Management',
      `Class Teacher generated student account for ${newStudentName} (GR Number: ${cleanedGR})`
    );

    setCreatedStudentCreds({ username: cleanedGR, password: tempPassword });
    setStudentSuccess(`Student account created successfully! Please record credentials.`);

    // Clear inputs
    setNewStudentGR('');
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setNewStudentRoll('');
    loadData();
  };

  // STUDENT PASSWORD RESET (student cloud migration will be handled in its own module)
  const handleResetUserPassword = (targetUser: User) => {
    if (targetUser.role !== 'student') {
      alert('Staff passwords are managed securely from Staff Login Management.');
      return;
    }

    const tempPassword = `stud_reset_${Math.floor(Math.random() * 9000) + 1000}`;
    const updated: User = {
      ...targetUser,
      password: tempPassword,
      mustChangePassword: true
    };

    LocalERPDatabase.saveUser(updated);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'RESET_STUDENT_PASSWORD',
      'Student Account Management',
      `Reset local student password for ${targetUser.username}`
    );

    alert(`Temporary Password Reset Successfully!\n\nStudent: ${targetUser.name}\nUsername: ${targetUser.username}\nTemporary Password: ${tempPassword}`);
    loadData();
  };

  // SOFT DELETE (Active/Inactive toggle)
  const handleToggleUserActiveState = (targetUser: User) => {
    const nextState = targetUser.isActive === false ? true : false;
    const updated: User = {
      ...targetUser,
      isActive: nextState
    };

    LocalERPDatabase.saveUser(updated);
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      nextState ? 'ACTIVATE_ACCOUNT' : 'DEACTIVATE_ACCOUNT',
      'Account Management',
      `Toggled active status of user ${targetUser.username} to ${nextState ? 'ACTIVE' : 'INACTIVE'}`
    );

    alert(`Account status updated! ${targetUser.name} has been set to ${nextState ? 'ACTIVE' : 'INACTIVE'}.`);
    loadData();
  };

  // R17: Student signup approval is cloud-only. The legacy LocalERPDatabase approval
  // handlers were removed so there is a single canonical Class Teacher workflow.
  const openLiveStudentSignupApprovals = () => {
    openRoleModuleById('tr-student-signup-approvals');
  };

  const handleDisableStudent = (targetUser: User) => {
    const updated: User = { ...targetUser, status: 'Disabled', isActive: false };
    LocalERPDatabase.saveUser(updated);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'DISABLE_STUDENT', 'Student Management', `Disabled student login: ${targetUser.username}`);
    alert(`Student account for ${targetUser.name} has been disabled.`);
    loadData();
  };

  const handleEnableStudent = (targetUser: User) => {
    const updated: User = { ...targetUser, status: 'Active', isActive: true };
    LocalERPDatabase.saveUser(updated);
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role, 'ENABLE_STUDENT', 'Student Management', `Enabled student login: ${targetUser.username}`);
    alert(`Student account for ${targetUser.name} has been activated.`);
    loadData();
  };

  const handleApproveParent = (targetUser: User) => {
    const updated: User = { ...targetUser, status: 'Active', isActive: true };
    LocalERPDatabase.saveUser(updated);

    LocalERPDatabase.addSystemNotification(
      targetUser.id,
      'Parent Account Approved',
      'Your parent portal login has been approved by the Headmaster. You can now track your child\'s details.'
    );

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'APPROVE_PARENT',
      'Account Management',
      `Approved parent registration: ${targetUser.name} (${targetUser.username})`
    );
    alert(`Parent account for ${targetUser.name} has been approved!`);
    loadData();
  };

  const handleRejectParent = (targetUser: User) => {
    const reason = prompt('Please specify a rejection reason for this parent registration:', 'Verification mismatch');
    if (reason === null) return;

    const updated: User = { ...targetUser, status: 'Rejected', rejectionReason: reason };
    LocalERPDatabase.saveUser(updated);

    LocalERPDatabase.addSystemNotification(
      targetUser.id,
      'Parent Registration Rejected',
      `Your parent account registration has been rejected. Reason: ${reason}`
    );

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'REJECT_PARENT',
      'Account Management',
      `Rejected parent registration for: ${targetUser.name}. Reason: ${reason}`
    );
    alert(`Parent registration has been rejected.`);
    loadData();
  };

  const handleRequestCorrectionParent = (targetUser: User) => {
    const reason = prompt('Please specify correction details needed for this parent account:', 'Verify Student DOB or Mobile');
    if (reason === null) return;

    const updated: User = { ...targetUser, status: 'CorrectionRequired', correctionReason: reason };
    LocalERPDatabase.saveUser(updated);

    LocalERPDatabase.addSystemNotification(
      targetUser.id,
      'Parent Correction Requested',
      `Your parent registration requires correction: ${reason}`
    );

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'REQUEST_CORRECTION_PARENT',
      'Account Management',
      `Requested correction for parent of student GR: ${targetUser.grNumber}. Details: ${reason}`
    );
    alert(`Correction request sent successfully.`);
    loadData();
  };

  const handleProfilePhotoFile = (file: File | null) => {
    setProfileMessage(null);
    if (!file) {
      setProfilePhotoDataUrl('');
      setProfilePhotoFileName('');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setProfileMessage('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage('Profile photo must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setProfileMessage('The selected photo could not be read.');
        return;
      }
      setProfilePhotoDataUrl(result);
      setProfilePhotoFileName(file.name);
    };
    reader.onerror = () => setProfileMessage('The selected photo could not be read.');
    reader.readAsDataURL(file);
  };

  const handleSaveOwnProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const fullName = profileName.trim();
    if (!fullName) {
      setProfileMessage('Full name is required.');
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Cloud session was not found. Please log in again.');
      const response = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName,
          phone: profilePhone.trim(),
          photoUrl: profilePhotoUrl.trim(),
          profilePhotoDataUrl: profilePhotoDataUrl || null
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Profile update failed.');

      const savedPhotoUrl = String(payload?.profile?.photoUrl || profilePhotoUrl.trim() || '');
      const savedUser: User = {
        ...user,
        name: fullName,
        phone: profilePhone.trim() || undefined,
        photoUrl: savedPhotoUrl || undefined
      };
      LocalERPDatabase.saveUser(savedUser);
      setProfilePhotoUrl(savedPhotoUrl);
      setProfilePhotoDataUrl('');
      setProfilePhotoFileName('');
      window.dispatchEvent(new CustomEvent('edunixo_profile_updated', { detail: { user: savedUser, changedAt: Date.now() } }));
      LocalERPDatabase.addAuditLog(
        user.id,
        fullName,
        user.role,
        'UPDATE_OWN_PROFILE',
        'Account Management',
        'Updated profile name, contact number or profile photo.'
      );
      setProfileMessage('Profile updated successfully. The new profile is now active everywhere.');
      window.setTimeout(() => setShowProfileEditor(false), 650);
    } catch (error: any) {
      setProfileMessage(error?.message || 'Profile update failed.');
    } finally {
      setProfileSaving(false);
    }
  };

  const isTeacherAccount = user.role === 'teacher' || user.role === 'class_teacher' || isClassTeacher;
  const isHeadmasterTeachingModule = Boolean(
    user.role === 'headmaster'
      && activeModuleId
      && activeModuleId.startsWith('tr-')
      && teacherWorkspaceModule
  );
  const showStudentSelfService = Boolean(
    selfServiceModule
      && user.role === 'student'
      && activeFeatureId !== 'st-complete-profile'
      && activeFeatureId !== 'st-password-security'
  );
  const showParentSelfService = Boolean(
    selfServiceModule
      && user.role === 'parent'
      && activeFeatureId !== 'pa-complete-profile'
      && activeFeatureId !== 'pa-password-security'
  );
  const showStudentParentSelfService = showStudentSelfService || showParentSelfService;
  const showTeacherScopedTimetable = Boolean(
    activeRoleModule && isTeacherAccount && activeModuleId === 'tr-timetable'
  );
  const showTeacherFocusedWorkspace = Boolean(
    activeRoleModule
      && (isTeacherAccount || isHeadmasterTeachingModule)
      && teacherWorkspaceModule
      && !showTeacherScopedTimetable
      && !(activeModuleId === 'tr-profile' && activeFeatureId !== 'tr-profile-update')
  );
  const showClerkFocusedWorkspace = Boolean(
    activeRoleModule && user.role === 'clerk' && clerkWorkspaceTab
  );
  const showAcademicSetupFocusedWorkspace = Boolean(
    activeRoleModule && activeTab === 'academic_setup' && activeFeatureId
  );
  const showMasterDataFocusedWorkspace = Boolean(
    activeRoleModule
      && activeTab === 'master_data'
      && activeFeatureId
      && masterDataInitialCategory
      && ((user.role === 'clerk' && activeModuleId === 'cl-master-data-management')
        || (user.role === 'headmaster' && activeModuleId === 'hm-duty-assignments')
        || (user.role === 'headmaster' && activeModuleId === 'hm-subjects-curriculum' && activeFeatureId === 'subject-master'))
  );
  const showStaffMasterFocusedWorkspace = Boolean(
    activeRoleModule
      && activeTab === 'staff_master'
      && activeFeatureId
      && ((user.role === 'clerk' && activeModuleId === 'cl-master-data-management' && activeFeatureId === 'cl-master-staff-master')
        || (user.role === 'headmaster' && activeModuleId === 'hm-staff-master'))
  );
  const showAssignmentValidityFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-duty-assignments'
      && activeFeatureId === 'assignment-validity'
  );
  const showClerkResultManagementFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-result-management'
      && activeTab === 'result_management'
  );
  const showClerkStudentDirectoryFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && (activeModuleId === 'cl-student-master' || activeModuleId === 'cl-student-lifecycle')
      && activeTab === 'master_data'
  );
  const showClerkCertificatesFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-certificates-documents'
      && activeTab === 'gov_registers'
  );
  const showClerkAttendanceFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-student-attendance-registers'
      && activeTab === 'attendance'
  );
  const showClerkFeesFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-fees-management'
      && activeTab === 'fees'
  );
  const showClerkCommunicationFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-communication'
      && activeTab === 'communication'
  );
  const showClerkAccountingFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-accounting-finance'
      && activeTab === 'accounting'
      && activeFeatureId
  );
  const showClerkLibraryFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-digital-library'
      && activeTab === 'library'
      && activeFeatureId
  );
  const showClerkInventoryFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-inventory-assets'
      && activeTab === 'inventory'
      && activeFeatureId
  );
  const showClerkSecurityFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-campus-security'
      && activeTab === 'gatekeeper_security'
      && activeFeatureId
  );
  const showClerkStatutoryRegistersFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'clerk'
      && activeModuleId === 'cl-statutory-registers-focused'
      && activeTab === 'gov_registers'
      && activeFeatureId
  );
  const showHeadmasterStudentLifecycleFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-student-lifecycle'
      && activeTab === 'master_data'
  );
  const showHeadmasterStudentServiceRequestsFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-student-service-requests'
      && activeTab === 'master_data'
  );
  const showHeadmasterParentAccountsFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-parent-accounts'
      && activeTab === 'master_data'
  );

  const showHeadmasterResultPublicationFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-result-management'
      && activeFeatureId === 'result-publication-lock'
      && activeTab === 'result_management'
  );
  const showHeadmasterLeaveFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-leave-management'
      && activeTab === 'leave_management'
      && activeFeatureId
  );
  const showHeadmasterLibraryFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-library'
      && activeTab === 'library'
      && activeFeatureId
  );
  const showHeadmasterInventoryFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-inventory'
      && activeTab === 'inventory'
      && activeFeatureId
  );
  const showHeadmasterCommunicationFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-communication'
      && activeTab === 'communication'
      && activeFeatureId
  );
  const showHeadmasterCertificatesFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-certificates'
      && activeTab === 'gov_registers'
      && activeFeatureId
  );
  const showHeadmasterSecurityFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-campus-security'
      && activeTab === 'gatekeeper_security'
      && activeFeatureId
  );
  const showHeadmasterStatutoryRegistersFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-statutory-registers'
      && activeTab === 'gov_registers'
      && activeFeatureId
  );
  const showHeadmasterAuditFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'headmaster'
      && activeModuleId === 'hm-audit-compliance'
      && activeTab === 'erp_admin'
      && activeFeatureId
  );
  const showPeonFocusedWorkspace = Boolean(
    activeRoleModule
      && user.role === 'peon'
      && String(activeModuleId || '').startsWith('pn-')
      && activeModuleId !== 'pn-profile'
  );
  const showHeadmasterBellTimingFocusedWorkspace = Boolean(
    activeRoleModule && user.role === 'headmaster' && activeModuleId === 'hm-bell-timing'
  );
  const showCompleteProfileFocusedWorkspace = Boolean(
    activeRoleModule
      && (activeModuleId === 'hm-complete-profile'
        || activeModuleId === 'cl-complete-profile'
        || activeModuleId === 'tr-complete-profile'
        || activeFeatureId === 'st-complete-profile'
        || activeFeatureId === 'pa-complete-profile'
        || activeFeatureId === 'pn-complete-profile')
  );
  const showSecurityPasswordFocusedWorkspace = Boolean(
    activeRoleModule
      && activeTab === 'security'
      && activeFeatureId
      && !showCompleteProfileFocusedWorkspace
      && (user.role === 'student'
        ? activeFeatureId === 'st-password-security'
        : user.role === 'parent'
          ? activeFeatureId === 'pa-password-security'
          : true)
  );
  const showCommandCenterFocusedWorkspace = Boolean(user.role === 'headmaster' && activeModuleId === 'hm-command-center');
  const showExecutiveFocusedWorkspace = Boolean(user.role === 'headmaster' && activeModuleId === 'hm-executive-analytics');
  const showApprovalInboxFocusedWorkspace = Boolean(user.role === 'headmaster' && activeModuleId === 'hm-approval-inbox');
  const showWebsiteStudioFocusedWorkspace = Boolean(
    activeRoleModule
      && websiteStudioTabs
      && (user.role === 'headmaster' || user.role === 'clerk')
  );
  const hasFocusedWorkspace = showStudentParentSelfService
    || showPeonFocusedWorkspace
    || showHeadmasterBellTimingFocusedWorkspace
    || showTeacherScopedTimetable
    || showTeacherFocusedWorkspace
    || showClerkFocusedWorkspace
    || showAcademicSetupFocusedWorkspace
    || showMasterDataFocusedWorkspace
    || showStaffMasterFocusedWorkspace
    || showAssignmentValidityFocusedWorkspace
    || showClerkResultManagementFocusedWorkspace
    || showClerkStudentDirectoryFocusedWorkspace
    || showClerkCertificatesFocusedWorkspace
    || showClerkAttendanceFocusedWorkspace
    || showClerkFeesFocusedWorkspace
    || showClerkCommunicationFocusedWorkspace
    || showClerkAccountingFocusedWorkspace
    || showClerkLibraryFocusedWorkspace
    || showClerkInventoryFocusedWorkspace
    || showClerkSecurityFocusedWorkspace
    || showClerkStatutoryRegistersFocusedWorkspace
    || showHeadmasterStudentLifecycleFocusedWorkspace
    || showHeadmasterStudentServiceRequestsFocusedWorkspace
    || showHeadmasterParentAccountsFocusedWorkspace
    || showHeadmasterResultPublicationFocusedWorkspace
    || showHeadmasterLeaveFocusedWorkspace
    || showHeadmasterLibraryFocusedWorkspace
    || showHeadmasterInventoryFocusedWorkspace
    || showHeadmasterCommunicationFocusedWorkspace
    || showHeadmasterCertificatesFocusedWorkspace
    || showHeadmasterSecurityFocusedWorkspace
    || showHeadmasterStatutoryRegistersFocusedWorkspace
    || showHeadmasterAuditFocusedWorkspace
    || showCompleteProfileFocusedWorkspace
    || showSecurityPasswordFocusedWorkspace
    || showCommandCenterFocusedWorkspace
    || showExecutiveFocusedWorkspace
    || showApprovalInboxFocusedWorkspace
    || showWebsiteStudioFocusedWorkspace;

  const securityAccountLabel = user.role === 'headmaster'
    ? 'Headmaster'
    : user.role === 'clerk'
      ? 'Clerk'
      : user.role === 'class_teacher'
        ? 'Class Teacher'
        : user.role.charAt(0).toUpperCase() + user.role.slice(1).replaceAll('_', ' ');

  const renderSecurityPasswordPage = () => (
    <div className="mx-auto max-w-2xl animate-fade-in text-left" data-security-feature={activeFeatureId || 'security-change-password'}>
      <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white shadow-[0_30px_90px_rgba(15,23,42,.16)]">
        <header className="edx-dark-contrast-surface relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.22),transparent_36%),radial-gradient(circle_at_92%_0%,rgba(139,92,246,.24),transparent_38%),linear-gradient(135deg,#07172d,#080b1c_56%,#17112e)] px-6 py-7 text-white sm:px-8">
          <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Security & Password</div>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">Change Password</h3>
              <p className="mt-2 max-w-xl text-xs leading-6 text-slate-300">This page updates only the logged-in {securityAccountLabel} account in Supabase Auth. The permanent User ID, role, school membership and existing school records remain unchanged.</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleChangePasswordOwn} className="space-y-5 p-6 sm:p-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Permanent Login Account</label>
            <input
              type="text"
              placeholder={user.email || user.username || 'School account'}
              value={newEmailOwn || user.username || ''}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-500"
            />
            <p className="mt-2 text-[10px] font-semibold text-slate-400">Read-only. Password change does not alter the login ID.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">
              New Password
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                value={newPasswordOwn}
                onChange={(e) => setNewPasswordOwn(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <label className="block text-xs font-bold text-slate-600">
              Confirm New Password
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repeat the new password"
                value={confirmPasswordOwn}
                onChange={(e) => setConfirmPasswordOwn(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>
          </div>

          {passwordOwnError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-bold text-rose-700">
              {passwordOwnError}
            </p>
          )}

          {passwordOwnSuccess && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
              {passwordOwnSuccess}
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800 active:scale-[.99]"
          >
            <Lock className="h-4 w-4" />
            Securely Update Password
          </button>
        </form>
      </section>
    </div>
  );

  return (
    <div
      className="erp-dashboard-root edx-global-page-shell edx-contrast-guard space-y-8 print:bg-white print:p-0"
      data-active-module={activeTab}
    >
      {/* Printable Paper Header (A4) */}
      <PrintLetterhead lang={lang} subtitle={`${user.role.toUpperCase()} REPORT SUMMARY`} />

      {/* Profile Overview Header Card (No-Print) */}
      {(!activeModuleId || (isTeacherAccount && (activeModuleId === 'tr-dashboard' || activeModuleId === 'tr-home'))) && <div className="erp-profile-hero relative z-30 overflow-visible rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(139,92,246,.19),transparent_35%),linear-gradient(135deg,#0b1730,#080b1c_55%,#15112d)] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.32)] sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="relative shrink-0">
            <img
              src={profilePhotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
              alt={user.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
            />
            <label
              className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow cursor-pointer hover:bg-blue-700 ${isUploadingPhoto ? 'opacity-60 pointer-events-none' : ''}`}
              title={t.updateProfilePhoto}
            >
              {isUploadingPhoto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit className="w-3.5 h-3.5" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhotoChange} disabled={isUploadingPhoto} />
            </label>
          </div>
          <div>
            <span className="inline-block rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-300">
              {t[user.role] || user.role}
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
              <h2 className="text-xl font-black tracking-tight text-white">{user.name}</h2>
              <button
                type="button"
                onClick={() => {
                  setProfileName(user.name || '');
                  setProfilePhotoUrl(user.photoUrl || '');
                  setProfilePhotoDataUrl('');
                  setProfilePhotoFileName('');
                  setProfilePhone(user.phone || '');
                  setProfileMessage(null);
                  setShowProfileEditor(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-cyan-200 hover:bg-white/10"
                title={t.editProfilePictureAndName}
              >
                <Edit className="w-3 h-3" /> {t.edit}
              </button>
              <button
                type="button"
                onClick={openCompleteProfile}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-100 hover:bg-cyan-300/20"
                title="Open complete profile"
              >
                <UserCheck className="w-3 h-3" /> Complete Profile
              </button>
            </div>
            <p className="mt-1 text-[10px] font-mono text-slate-400">{user.email} | ID: {user.username}</p>
          </div>
        </div>

        {/* Right side controls: Notification Bell and Print Button */}
        <div className="relative z-[170] flex items-center gap-4">
          {/* System Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); void loadNotifications(); }}
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="View system notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-ping" />
              )}
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute left-1/2 z-[180] mt-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl sm:left-auto sm:right-0 sm:w-80 sm:translate-x-0 max-h-96">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase">{t.systemNotifications}</span>
                  {notifications.some(n => !n.isRead) && (
                    <button 
                      onClick={() => {
                        notifications.forEach(n => {
                          if (!n.isRead) handleMarkNotifAsRead(n.id);
                        });
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      {t.markAllRead}
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 space-y-2.5">
                    {notifications.map((n) => {
                      const primaryAction = getNotificationPrimaryAction(n);
                      return (
                      <div
                        key={n.id}
                        role={primaryAction ? 'button' : undefined}
                        tabIndex={primaryAction ? 0 : undefined}
                        onClick={primaryAction ? () => openNotificationPrimaryAction(n) : undefined}
                        onKeyDown={primaryAction ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openNotificationPrimaryAction(n); } } : undefined}
                        className={`pt-2.5 first:pt-0 text-left space-y-1 ${primaryAction ? 'cursor-pointer rounded-xl px-2 py-2 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-200' : ''}`}
                        title={primaryAction === 'signup' ? 'Open Student Signup Approvals' : primaryAction === 'new_admission' ? 'Open Full Class Roster' : primaryAction === 'admission_intake' ? 'Open Admission Applications' : undefined}
                      >
                        {primaryAction && <div className="text-[8px] font-black uppercase tracking-[.12em] text-cyan-700">{primaryAction === 'signup' ? 'Signup Approval' : primaryAction === 'new_admission' ? 'New Admission' : 'Admission Review'}</div>}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${n.isRead ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</span>
                          {!n.isRead ? (
                            <button
                              onClick={(event) => { event.stopPropagation(); void handleMarkNotifAsRead(n.id); }}
                              className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold hover:bg-blue-100 transition-colors"
                            >
                              Mark read
                            </button>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Read</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal">{n.content}</p>
                        {primaryAction === 'signup' && (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); openNotificationPrimaryAction(n); }}
                            className="mt-1 rounded-lg bg-cyan-50 px-2.5 py-1.5 text-[10px] font-black text-cyan-800 hover:bg-cyan-100"
                          >
                            Open Signup Approval
                          </button>
                        )}
                        {primaryAction === 'new_admission' && (
                          <button
                            type="button"
                            aria-label="View My Students - Open Full Class Roster"
                            onClick={(event) => { event.stopPropagation(); openNotificationPrimaryAction(n); }}
                            className="mt-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-800 hover:bg-emerald-100"
                          >
                            Open Full Class Roster
                          </button>
                        )}
                        {primaryAction === 'admission_intake' && (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); openNotificationPrimaryAction(n); }}
                            className="mt-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-800 hover:bg-emerald-100"
                          >
                            Review Admission Intake
                          </button>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono block">{n.date}</span>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>}

      {showProfileEditor && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <form onSubmit={handleSaveOwnProfile} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-left">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Edit Profile</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Your role, User ID and login password are not changed here.</p>
              </div>
              <button type="button" onClick={() => setShowProfileEditor(false)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block text-xs font-bold text-slate-600">
                Full Name *
                <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
              </label>
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  <img
                    src={profilePhotoDataUrl || profilePhotoUrl || user.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center justify-center px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                      Choose Profile Photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => handleProfilePhotoFile(event.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">JPG, PNG or WEBP · maximum 2 MB</p>
                    {profilePhotoFileName && <p className="text-[10px] text-emerald-700 font-semibold truncate mt-1">Selected: {profilePhotoFileName}</p>}
                  </div>
                </div>
                <label className="block text-[10px] font-bold text-slate-500 mt-3">
                  Or paste a photo URL (optional)
                  <input value={profilePhotoUrl} onChange={(e) => setProfilePhotoUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal text-xs bg-white" />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-600">
                Mobile Number
                <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
              </label>
              {profileMessage && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-semibold">{profileMessage}</div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button type="button" onClick={() => setShowProfileEditor(false)} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600">Cancel</button>
              <button disabled={profileSaving} className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50">
                {profileSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Login Alert Modal for Returned Subject Marklists */}
      {(() => {
        const unreadReturnedNotifs = notifications.filter(
          n => n.type === 'returned_mark_list' && !n.isRead
        );
        if (unreadReturnedNotifs.length === 0 || dismissedLoginAlert) return null;

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in no-print">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-rose-200 overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-rose-100 flex items-center justify-between bg-rose-50/80 text-rose-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight font-sans">
                      {isUrdu ? "اصلاح کے لیے واپس کردہ شیٹس" : "Returned for Correction Alerts"}
                    </h3>
                    <p className="text-[11px] text-rose-700 font-sans font-medium">
                      {isUrdu 
                        ? `آپ کے پاس ${unreadReturnedNotifs.length} مارک شیٹ(س) اصلاح کے لیے واپس آئی ہیں۔`
                        : `You have ${unreadReturnedNotifs.length} subject mark list(s) that require correction.`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedLoginAlert(true)}
                  className="p-1.5 hover:bg-rose-100/60 rounded-lg text-rose-800 transition-all cursor-pointer font-bold text-xs"
                >
                  {isUrdu ? "بند کریں ×" : "Dismiss ×"}
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {unreadReturnedNotifs.map((notif) => {
                  const m = notif.metadata || {
                    subjectName: "Unknown Subject",
                    className: "Class",
                    divisionName: "A",
                    examName: "Exam",
                    returnedBy: "Class Teacher",
                    reason: "No details provided",
                    lockId: ""
                  };
                  
                  return (
                    <div key={notif.id} className="p-5 bg-white border border-rose-100 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all relative">
                      <div className="flex items-center justify-between border-b border-rose-50 pb-3">
                        <span className="text-xs font-black text-rose-700 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                          <span>{isUrdu ? "🔴 اصلاح کے لیے واپس" : "🔴 Returned for Correction"}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{notif.date}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <div className="flex justify-between md:justify-start gap-2">
                            <span className="text-slate-500 min-w-[120px] font-sans font-bold">{isUrdu ? "مضمون:" : "Subject:"}</span>
                            <span className="font-extrabold text-slate-800 text-left">{m.subjectName}</span>
                          </div>
                          <div className="flex justify-between md:justify-start gap-2">
                            <span className="text-slate-500 min-w-[120px] font-sans font-bold">{isUrdu ? "کلاس:" : "Class:"}</span>
                            <span className="font-extrabold text-slate-800 text-left">{m.className}-{m.divisionName}</span>
                          </div>
                          <div className="flex justify-between md:justify-start gap-2">
                            <span className="text-slate-500 min-w-[120px] font-sans font-bold">{isUrdu ? "امتحان:" : "Exam:"}</span>
                            <span className="font-extrabold text-slate-800 text-left">{m.examName}</span>
                          </div>
                        </div>

                        <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                          <div className="flex justify-between md:justify-start gap-2">
                            <span className="text-slate-500 min-w-[120px] font-sans font-bold">{isUrdu ? "واپس کنندہ:" : "Returned By:"}</span>
                            <span className="font-bold text-slate-800 text-left">{m.returnedBy}</span>
                          </div>
                          <div className="flex justify-between md:justify-start gap-2">
                            <span className="text-slate-500 min-w-[120px] font-sans font-bold">{isUrdu ? "واپسی کا وقت:" : "Returned At:"}</span>
                            <span className="font-mono text-slate-600 text-left">{notif.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/40 text-xs">
                        <span className="font-extrabold text-rose-800 block mb-1 font-sans">{isUrdu ? "واپسی کی وجہ:" : "Reason for Return:"}</span>
                        <p className="text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">{m.reason}</p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            LocalERPDatabase.markNotificationAsRead(notif.id);
                            localStorage.setItem('auto_open_lock_id', m.lockId);
                            requestTab('result_management');
                            loadData();
                            window.dispatchEvent(new Event('refresh_notifications'));
                            window.dispatchEvent(new Event('open_returned_sheet'));
                            setDismissedLoginAlert(true);
                          }}
                          className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <BookOpen className="w-4 h-4 text-white" />
                          <span>{isUrdu ? "مضمون کی مارک لسٹ کھولیں" : "Open Subject Mark List"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setDismissedLoginAlert(true)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {isUrdu ? "ڈیش بورڈ پر جائیں" : "Go to Dashboard"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dashboard Alert Banner */}
      {(() => {
        const unreadReturnedNotifs = notifications.filter(
          n => n.type === 'returned_mark_list' && !n.isRead
        );
        if (unreadReturnedNotifs.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black uppercase tracking-wide">
                  {isUrdu 
                    ? `🔔 ${unreadReturnedNotifs.length} مارک لسٹ اصلاح کے لیے واپس کی گئی`
                    : `🔔 ${unreadReturnedNotifs.length} Mark List${unreadReturnedNotifs.length > 1 ? 's' : ''} Returned for Correction`
                  }
                </h4>
                <p className="text-xs text-white/90 font-sans font-medium mt-0.5">
                  {isUrdu 
                    ? "کلاس ٹیچر نے کچھ مضمون وار نمبرات کی شیٹس اصلاح کے لیے واپس کی ہیں۔ برائے مہربانی ان کی اصلاح کریں۔"
                    : "The Class Teacher has returned evaluating sheet records for correction. Please click to open and resolve."
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                requestTab('result_management');
              }}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-wide rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            >
              {isUrdu ? "اصلاح کا پینل کھولیں" : "View Returned Mark Lists"}
            </button>
          </div>
        );
      })()}

      {entitlementLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800 no-print">
          <RefreshCw className="h-4 w-4 animate-spin" /> {t.verifyingPlanAccess}
        </div>
      )}

      {!entitlementLoading && accessState === 'active' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 no-print">
          {t.planAccessActive}{subscriptionContext?.planName ? <>: <bdi>{subscriptionContext.planName}</bdi></> : ''}. {t.onlyEntitledModulesShown}
        </div>
      )}

      {!entitlementLoading && accessState === 'grace' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 no-print">
          {t.billingGraceMessage}
        </div>
      )}

      {!entitlementLoading && accessState === 'legacy' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 no-print">
          {t.legacyAccessMessage}
        </div>
      )}

      {!entitlementLoading && accessState === 'restricted' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900 no-print">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-extrabold">{t.operationalModulesLocked}</p>
              <p className="mt-1 text-xs text-rose-700">{t.schoolRecordsPreserved}</p>
              {restrictionReason && <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-rose-600">{t.reason}: {restrictionReason.replaceAll('_', ' ')}</p>}
            </div>
          </div>
        </div>
      )}

      {!entitlementLoading && accessState === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900 no-print">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="font-extrabold">{t.planVerificationFailed}</p><p className="mt-1 text-xs text-rose-700">{t.planVerificationHidden} {entitlementError}</p></div>
            </div>
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800">{t.retryVerification}</button>
          </div>
        </div>
      )}

      {/* ROLE-WISE HAMBURGER MODULE MENU (No-Print) */}
      <RoleModuleMenu
        role={user.role}
        lang={lang}
        isClassTeacher={isClassTeacher}
        activeTab={activeTab}
        activeModuleId={activeModuleId}
        canAccess={canAccessTab}
        onOpenModule={openRoleModule}
        onOpenFeature={openRoleFeature}
        hiddenFeatureIds={user.role === 'clerk' && !clerkResultImportAllowed ? ['cl-result-import-existing-system'] : []}
      />

      {showShortcutHub && activeRoleModule && (
        <RoleModuleLanding
          module={activeRoleModule}
          role={user.role}
          onBack={returnToDashboard}
          onOpenFeature={feature => openRoleFeature(activeRoleModule, feature)}
        />
      )}

      {!showShortcutHub && hasFocusedWorkspace && (
        <div className="edx-operational-canvas edx-theme-safe space-y-5">
          {activeRoleModule && (
            <RoleFeatureContextHeader
              module={activeRoleModule}
              feature={activeRoleFeature}
              onBack={activeRoleFeature ? returnToActiveModuleRoot : returnToDashboard}
              backLabel={activeRoleFeature ? 'Module home' : 'Dashboard'}
            />
          )}
          {showCommandCenterFocusedWorkspace && (
            <SchoolCommandCenter user={user} activeFeatureId={activeFeatureId} onOpenModule={openRoleModuleById} />
          )}
          {showExecutiveFocusedWorkspace && (
            <ExecutiveDashboard lang={lang} user={user} activeFeatureId={activeFeatureId} />
          )}
          {showApprovalInboxFocusedWorkspace && activeRoleModule && (
            <HeadmasterApprovalInbox module={activeRoleModule} onOpenFeature={feature => openRoleFeature(activeRoleModule, feature)} />
          )}
          {showStudentSelfService && selfServiceModule && (
            <StudentPortalWorkspace
              lang={lang}
              user={user}
              module={selfServiceModule}
              feature={activeRoleFeature}
              onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)}
            />
          )}
          {showParentSelfService && selfServiceModule && (
            <ParentPortalWorkspace
              lang={lang}
              user={user}
              module={selfServiceModule}
              feature={activeRoleFeature}
              onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)}
            />
          )}
          {showPeonFocusedWorkspace && (
            <PeonPortalWorkspace user={user} activeModuleId={activeModuleId} activeFeatureId={activeFeatureId} onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)} />
          )}
          {showHeadmasterBellTimingFocusedWorkspace && <BellTimingManager user={user} />}
          {showTeacherScopedTimetable && <RoleScopedTimetable lang={lang} user={user} />}
          {showTeacherFocusedWorkspace && teacherWorkspaceModule && (
            <TeacherWorkspace
              lang={lang as any}
              user={user}
              initialModule={teacherWorkspaceModule}
              initialFeature={activeFeatureId}
              focusedMode
              focusedTitle={activeRoleModule?.label || 'Focused Workspace'}
              onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)}
            />
          )}
          {showAcademicSetupFocusedWorkspace && (
            <AcademicSetupModule
              lang={lang}
              userRole={user.role}
              userName={user.name}
              userId={user.id}
              initialCategory={academicSetupInitialCategory}
              focusedMode
              focusedTitle={activeRoleFeature?.label || activeRoleModule?.label || 'Academic Setup & Config'}
              focusedFeatureId={activeFeatureId}
            />
          )}
          {showMasterDataFocusedWorkspace && masterDataInitialCategory && (
            <MasterDataDashboard
              lang={lang}
              userRole={user.role}
              userName={user.name}
              userId={user.id}
              initialCategory={masterDataInitialCategory}
              initialSubList={masterDataInitialSubList}
              focusedMode
              focusedTitle={activeRoleFeature?.label || activeRoleModule?.label || 'Master Data Management'}
            />
          )}
          {showStaffMasterFocusedWorkspace && (
            <StaffMaster
              lang={lang}
              userRole={user.role}
              userId={user.id}
              userName={user.name}
              focusedMode
              focusedTitle={activeRoleFeature?.label || 'Staff Master'}
              focusedFeatureId={activeFeatureId}
            />
          )}
          {showAssignmentValidityFocusedWorkspace && <AcademicAssignmentValidity />}
          {showClerkResultManagementFocusedWorkspace && (
            activeFeatureId === 'cl-combined-question-papers' ? (
              <ClerkCombinedQuestionPaperDesk user={user} />
            ) : activeFeatureId === 'cl-result-import-existing-system' ? (
              <CurriculumResultImportStudio />
            ) : (activeFeatureId === 'cl-result-master-result-book' || activeFeatureId === 'cl-result-mark-list-templates' || activeFeatureId === 'cl-result-progress-card-templates') ? (
              <ResultManagement
                lang={lang}
                user={user}
                activeFeatureId={activeFeatureId}
                focusedMode
                focusedTitle={activeRoleFeature?.label || (activeFeatureId === 'cl-result-mark-list-templates' ? 'Master Mark List Templates' : activeFeatureId === 'cl-result-progress-card-templates' ? 'Master Progress Card Templates' : 'Master Result Book')}
              />
            ) : (
              <ClerkResultPrintCenter user={user} activeFeatureId={activeFeatureId} />
            )
          )}
          {showClerkStudentDirectoryFocusedWorkspace && (
            <StudentDirectoryWorkspace user={user} activeFeatureId={activeFeatureId} />
          )}
          {showClerkCertificatesFocusedWorkspace && (
            <CertificateStudioHub
              lang={lang}
              user={user}
              onRefreshData={onRefreshData}
              activeFeatureId={activeFeatureId}
              focusedTitle={activeRoleFeature?.label || 'Certificate Studio & Management'}
            />
          )}
          {showClerkAttendanceFocusedWorkspace && (
            <ClerkAttendanceReportsRegisters
              lang={lang}
              user={user}
              activeFeatureId={activeFeatureId}
            />
          )}
          {showClerkFeesFocusedWorkspace && (
            <ClerkCloudFeeWorkspace
              lang={lang}
              user={user}
              onRefreshData={onRefreshData}
              activeFeatureId={activeFeatureId}
            />
          )}
          {showClerkCommunicationFocusedWorkspace && (
            <ClerkCommunicationOffice
              lang={lang}
              user={user}
              onRefreshData={onRefreshData}
              activeFeatureId={activeFeatureId}
              focusedMode
              focusedTitle={activeRoleFeature?.label || 'Communication Drafts & Office Dispatch'}
            />
          )}
          {showClerkAccountingFocusedWorkspace && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <SmartAccountingManager
                lang={lang}
                user={user}
                onRefreshData={onRefreshData}
                activeFeatureId={activeFeatureId}
              />
            </div>
          )}
          {showClerkLibraryFocusedWorkspace && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <SmartLibraryManager
                lang={lang}
                user={user}
                onRefreshData={onRefreshData}
                activeFeatureId={activeFeatureId}
                focusedMode
                focusedTitle={activeRoleFeature?.label || 'Digital Library'}
              />
            </div>
          )}
          {showClerkInventoryFocusedWorkspace && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <SmartInventoryManager
                lang={lang}
                user={user}
                onRefreshData={onRefreshData}
                activeFeatureId={activeFeatureId}
                focusedMode
                focusedTitle={activeRoleFeature?.label || 'Inventory & Assets'}
              />
            </div>
          )}
          {showClerkSecurityFocusedWorkspace && (
            <SmartSecurityManager
              lang={lang}
              user={user}
              activeFeatureId={activeFeatureId}
              focusedMode
              focusedTitle={activeRoleFeature?.label || 'Campus Security & Gate Pass'}
            />
          )}
          {showClerkStatutoryRegistersFocusedWorkspace && (
            <ClerkCloudStatutoryRegisters
              lang={lang}
              user={user}
              activeFeatureId={activeFeatureId}
              focusedMode
              focusedTitle={activeRoleFeature?.label || 'Statutory Registers'}
            />
          )}
          {showHeadmasterStudentLifecycleFocusedWorkspace && (
            <StudentDirectoryWorkspace user={user} activeFeatureId={activeFeatureId || 'student-lifecycle-requests'} />
          )}
          {showHeadmasterStudentServiceRequestsFocusedWorkspace && (
            <StudentServiceRequestDesk activeFeatureId={activeFeatureId} />
          )}
          {showHeadmasterParentAccountsFocusedWorkspace && <ParentAccountApprovalDesk />}
          {showHeadmasterResultPublicationFocusedWorkspace && (
            <HeadmasterResultPublicationDesk />
          )}
          {showHeadmasterLeaveFocusedWorkspace && (
            activeFeatureId === 'headmaster-my-leave-application'
              ? <HeadmasterLeaveApplication lang={lang} user={user} />
              : <SmartLeaveManager lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId={activeFeatureId} focusedMode focusedTitle={activeRoleFeature?.label || 'Leave Management'} />
          )}
          {showHeadmasterLibraryFocusedWorkspace && (
            <HeadmasterLibraryCloudWorkspace lang={lang} user={user} activeFeatureId={activeFeatureId} />
          )}
          {showHeadmasterInventoryFocusedWorkspace && (
            <HeadmasterInventoryCloudWorkspace lang={lang} user={user} activeFeatureId={activeFeatureId} />
          )}
          {showHeadmasterCommunicationFocusedWorkspace && (
            <HeadmasterCommunicationCloudWorkspace user={user} activeFeatureId={activeFeatureId} />
          )}
          {showHeadmasterCertificatesFocusedWorkspace && (
            <HeadmasterCertificateCloudWorkspace user={user} activeFeatureId={activeFeatureId} />
          )}
          {showHeadmasterSecurityFocusedWorkspace && (
            <HeadmasterSecurityCloudWorkspace lang={lang} user={user} activeFeatureId={activeFeatureId} />
          )}
          {showHeadmasterStatutoryRegistersFocusedWorkspace && (
            <StatutoryRegistersManager lang={lang} user={user} activeFeatureId={activeFeatureId} focusedMode focusedTitle={activeRoleFeature?.label || 'Statutory Registers'} />
          )}
          {showHeadmasterAuditFocusedWorkspace && (
            <HeadmasterSystemAuditCloudWorkspace lang={lang} user={user} activeFeatureId={activeFeatureId} mode="audit" />
          )}
          {showCompleteProfileFocusedWorkspace && <CompleteProfileWorkspace user={user} />}
          {showSecurityPasswordFocusedWorkspace && renderSecurityPasswordPage()}
          {showClerkFocusedWorkspace && clerkWorkspaceTab && (
            <ClerkWorkspace
              lang={lang}
              user={user}
              classes={classes}
              onRefreshData={loadData}
              initialTab={clerkWorkspaceTab}
              focusedMode
              focusedTitle={activeRoleModule?.label || 'Focused Workspace'}
              activeFeatureId={activeFeatureId}
              hideAdmissionNavigation
            />
          )}
          {showWebsiteStudioFocusedWorkspace && websiteStudioTabs && (
            <SchoolWebsiteStudio
              userRole={user.role}
              userName={user.name}
              initialTab={websiteStudioInitialTab}
              allowedTabs={websiteStudioTabs}
              focusedMode
              focusedTitle={activeRoleModule?.label || 'Focused Workspace'}
              activeFeatureId={activeFeatureId}
            />
          )}
        </div>
      )}

      {!showShortcutHub && !hasFocusedWorkspace && <div className={activeRoleModule ? 'edx-operational-canvas edx-theme-safe space-y-5' : ''}>
      {activeRoleModule && activeRoleModule.id !== 'hm-student-master' && (
        <RoleFeatureContextHeader
          module={activeRoleModule}
          feature={activeRoleFeature}
          onBack={activeRoleFeature ? returnToActiveModuleRoot : returnToDashboard}
          backLabel={activeRoleFeature ? 'Module home' : 'Dashboard'}
        />
      )}
      {/* TAB 1: OVERVIEW BLOCK (Preserving all original dashboard modules) */}
      {/* ========================================================= */}
      {!showTeacherFocusedWorkspace && activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Headmaster Overview Tab */}
          {user.role === 'headmaster' && (
            <div className="space-y-8">
              {/* Live Cloud Metrics — no demo/fabricated KPIs */}
              <HeadmasterLiveOverviewMetrics />

              {/* Sub Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Publish Notice Module */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
                  <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4">
                    <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Publish Notice</span>
                    </h3>
                  </div>

                  <form onSubmit={handleCreateNotice} className="p-5 space-y-4">
                    {/* Categorizations */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 font-sans">Notice Category</label>
                      <select
                        value={newNoticeCategory}
                        onChange={(e: any) => setNewNoticeCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
                      >
                        <option value="General">General Announcement</option>
                        <option value="Academics">Academics / Syllabus</option>
                        <option value="Exam">Exam Schedule</option>
                        <option value="Fee">Fees Reminders</option>
                        <option value="Sports">Sports & Extra Activities</option>
                      </select>
                    </div>

                    {/* Primary language notice */}
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Notice Language</label>
                          <select
                            value={newNoticePrimaryLanguage}
                            onChange={(e) => changePrimaryNoticeLanguage(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            {FALLBACK_LANGUAGE_CATALOGUE.map(option => (
                              <option key={String(option.code)} value={String(option.code)} disabled={newNoticeTranslations.some(item => item.languageCode === String(option.code))}>
                                {languageDisplayName(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">
                          {1 + newNoticeTranslations.length} language{newNoticeTranslations.length ? 's' : ''}
                        </span>
                      </div>

                      {(() => {
                        const primary = getLanguageOption(newNoticePrimaryLanguage);
                        return (
                          <div dir={resolvedDirection(primary)} className={resolvedDirection(primary) === 'rtl' ? 'text-right' : 'text-left'}>
                            <input
                              type="text"
                              placeholder={`Notice Title (${primary.englishName})`}
                              required
                              value={newNoticeTitle}
                              onChange={(e) => setNewNoticeTitle(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                            />
                            <textarea
                              placeholder={`Notice body text (${primary.englishName})...`}
                              required
                              rows={3}
                              value={newNoticeContent}
                              onChange={(e) => setNewNoticeContent(e.target.value)}
                              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Optional additional languages */}
                    {newNoticeTranslations.map((entry, index) => {
                      const selectedLanguage = getLanguageOption(entry.languageCode);
                      const direction = resolvedDirection(selectedLanguage);
                      return (
                        <div key={entry.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Additional Language {index + 1}</label>
                              <select
                                value={entry.languageCode}
                                onChange={(e) => updateNoticeTranslation(entry.id, { languageCode: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                              >
                                {FALLBACK_LANGUAGE_CATALOGUE.map(option => {
                                  const code = String(option.code);
                                  const usedElsewhere = code !== entry.languageCode && usedNoticeLanguages.has(code);
                                  return <option key={code} value={code} disabled={usedElsewhere}>{languageDisplayName(option)}</option>;
                                })}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewNoticeTranslations(current => current.filter(item => item.id !== entry.id))}
                              className="mt-4 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                              aria-label={`Remove ${selectedLanguage.englishName} notice`}
                              title="Remove language"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div dir={direction} className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                            <input
                              type="text"
                              placeholder={`Notice Title (${selectedLanguage.englishName})`}
                              value={entry.title}
                              onChange={(e) => updateNoticeTranslation(entry.id, { title: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                            />
                            <textarea
                              placeholder={`Notice body text (${selectedLanguage.englishName})...`}
                              rows={3}
                              value={entry.content}
                              onChange={(e) => updateNoticeTranslation(entry.id, { content: e.target.value })}
                              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={addNoticeLanguage}
                      disabled={usedNoticeLanguages.size >= FALLBACK_LANGUAGE_CATALOGUE.length}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> Add Other Language
                    </button>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-98 transition-all cursor-pointer"
                    >
                      Publish to School Board & Website
                    </button>
                  </form>
                </div>

                {/* Audit Logs and Current Notices List */}
                <div className="space-y-6">
                  {/* Audit logs list */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span>Real-time Audit Logs</span>
                      </h3>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold uppercase">SECURED</span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-4 space-y-1 hover:bg-slate-50/30 transition-colors text-left">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>{log.timestamp}</span>
                            <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{log.module}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{log.action}</p>
                          <p className="text-[11px] text-slate-500">{log.details}</p>
                          <p className="text-[10px] font-medium text-slate-400 font-mono">Operator: {log.userName} ({log.role})</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clerk Workspace Module */}
          {user.role === 'clerk' && (
            <ClerkWorkspace lang={lang} user={user} classes={classes} onRefreshData={loadData} initialTab="dashboard" focusedMode focusedTitle="Office Dashboard" hideAdmissionNavigation onOpenAdmissionDesk={() => requestTab('admission_desk')} />
          )}

          {/* Teacher and Class Teacher Overview Tab */}
          {(isClassTeacher || user.role === 'teacher' || user.role === 'class_teacher') && (
            <TeacherWorkspace lang={lang as any} user={user} initialModule="dashboard" focusedMode focusedTitle={isClassTeacher ? 'Class Teacher Dashboard' : 'Teacher Home'} onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)} />
          )}

          {/* Student canonical cloud overview; Parent retains the existing linked-child workspace. */}
          {user.role === 'student' && defaultSelfServiceHomeModule && (
            <StudentPortalWorkspace
              lang={lang}
              user={user}
              module={defaultSelfServiceHomeModule}
              onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)}
            />
          )}
          {user.role === 'parent' && defaultSelfServiceHomeModule && (
            <ParentPortalWorkspace
              lang={lang}
              user={user}
              module={defaultSelfServiceHomeModule}
              onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)}
            />
          )}
          {user.role === 'peon' && (
            <PeonPortalWorkspace user={user} activeModuleId="pn-home" onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)} />
          )}

          {/* Legacy student overview retained in source but no longer rendered. */}
          {false && user.role === 'student' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
              {/* Homework Assignments board */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>My Assigned Tasks & Homework</span>
                  </h3>
                  <span className="text-[9px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">NHS-Student</span>
                </div>

                <div className="divide-y divide-slate-100 p-4 space-y-4">
                  {homework.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No pending tasks assigned.</p>
                  ) : (
                    homework.map((hw) => (
                      <div key={hw.id} className="space-y-2 pb-4 border-b border-slate-100 last:border-none">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                            {hw.subject}
                          </span>
                          <span className="text-[10px] font-mono text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                            Due: {hw.dueDate}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800">{hw.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{hw.description}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Assigned by: {hw.teacherName} on {hw.assignedDate}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Student Class Timetable */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4">
                  <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Weekly Lecture Timetable</span>
                  </h3>
                </div>

                <div className="p-4">
                  <div className="divide-y divide-slate-100">
                    {timetable.map((entry) => (
                      <div key={entry.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <UrduWrapper lang={lang}>
                            <p className="font-bold text-slate-700">
                              {lang === 'ur' && entry.subjectUr ? entry.subjectUr : lang === 'hi' && entry.subjectHi ? entry.subjectHi : entry.subject}
                            </p>
                          </UrduWrapper>
                          <p className="text-[10px] text-slate-400">Instructor: {entry.teacherName}</p>
                        </div>

                        <div className="text-right text-[10px] font-mono text-slate-500">
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{entry.day}</span>
                          <div className="mt-1">{entry.startTime} - {entry.endTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Bilingual Attendance & Leaves Desk */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden col-span-1 lg:col-span-2">
                <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4">
                  <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>My Smart Attendance & Leave Control Center</span>
                  </h3>
                </div>
                <div className="p-6">
                  <SmartAttendanceManager lang={lang} user={user} onRefreshData={onRefreshData} />
                </div>
              </div>

              {/* Student Digital Library & Book Desk */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden col-span-1 lg:col-span-2 text-left">
                <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4">
                  <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span>My Digital Library Desk</span>
                  </h3>
                </div>
                <div className="p-6">
                  <SmartLibraryManager lang={lang} user={user} onRefreshData={onRefreshData} />
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STAFF & STUDENT ACCOUNT MANAGEMENT (ADMIN ONLY) */}
      {/* ========================================================= */}
      {activeTab === 'admission_desk' && user.role === 'clerk' && (
        <ClerkWorkspace
          lang={lang}
          user={user}
          classes={classes}
          onRefreshData={loadData}
          initialTab="admissions"
          onBackToOverview={() => requestTab('overview')}
        />
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          {/* HEADMASTER VIEW: Clerk & Teacher Management */}
          {user.role === 'headmaster' && (
            <StaffAccountManager activeFeatureId={activeModuleId === 'hm-staff-accounts' ? activeFeatureId : null} />
          )}

          {/* CLASS TEACHER VIEW: Student Account Management */}
          {(isClassTeacher || user.role === 'class_teacher') && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Left Column: Student Login Creation Form */}
              <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4">
                  <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Create Class Student Account</span>
                  </h3>
                </div>

                <form onSubmit={handleCreateStudentAccount} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Target Class Room</label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                      {classes.find(c => c.id === user.classId)?.className || 'Assigned Class'} - 
                      Division ({classes.find(c => c.id === user.classId)?.division || 'A'})
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Full name"
                      required
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">GR Number (Unique Student User ID) *</label>
                    <input
                      type="text"
                      placeholder="e.g. GR2026110"
                      required
                      value={newStudentGR}
                      onChange={(e) => setNewStudentGR(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Parent Contact Email *</label>
                    <input
                      type="email"
                      placeholder="parent@nhs.edu"
                      required
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Roll Number</label>
                      <input
                        type="number"
                        placeholder="24"
                        value={newStudentRoll}
                        onChange={(e) => setNewStudentRoll(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                      <input
                        type="text"
                        placeholder="+91 99999 00000"
                        value={newStudentPhone}
                        onChange={(e) => setNewStudentPhone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {studentError && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
                      {studentError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    Generate Student Login
                  </button>
                </form>

                {/* CREATED STUDENT CREDENTIALS VIEW PANEL */}
                {createdStudentCreds && (
                  <div className="p-5 border-t border-slate-200 bg-blue-50/50 space-y-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-extrabold uppercase tracking-wide">Student Handover Cards</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-lg font-mono text-xs space-y-1">
                      <div><strong className="text-slate-500">Student Username:</strong> {createdStudentCreds.username}</div>
                      <div><strong className="text-slate-500">Temp Password:</strong> {createdStudentCreds.password}</div>
                    </div>
                    <p className="text-[10px] text-rose-500 font-semibold italic">
                      ⚠️ Student must update credentials on their first login.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Search & Class Student List */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm font-sans">
                      My Class Division Students
                    </h3>
                    <p className="text-xs text-slate-500">
                      View and reset passwords for students of your assigned class division.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search class students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-150 overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="p-4">Roll No</th>
                        <th className="p-4">Student Name & Parent Info</th>
                        <th className="p-4">GR Number (Username)</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsersList
                        .filter(u => u.role === 'student' && u.classId === user.classId) // STRICT restriction: Only students of assigned class division
                        .filter(u => {
                          const query = searchQuery.toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(query) ||
                            (u.username || '').toLowerCase().includes(query) ||
                            (u.email || '').toLowerCase().includes(query)
                          );
                        })
                        .sort((a, b) => {
                          const statusA = a.status || 'Active';
                          const statusB = b.status || 'Active';
                          if (statusA === 'Pending' && statusB !== 'Pending') return -1;
                          if (statusA !== 'Pending' && statusB === 'Pending') return 1;
                          return 0;
                        })
                        .map((stud) => {
                          const isPending = stud.status === 'Pending';
                          const isRejected = stud.status === 'Rejected';
                          const isDisabled = stud.status === 'Disabled';

                          return (
                            <tr key={stud.id} className={`hover:bg-slate-50/50 transition-colors ${isPending ? 'bg-amber-50/40 animate-pulse-slow border-l-2 border-amber-500' : ''}`}>
                              <td className="p-4 font-mono font-bold text-slate-700">
                                #{stud.rollNo || '-'}
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-slate-800">{stud.name}</div>
                                <div className="text-[10px] text-slate-400">Parent contact: {stud.phone}</div>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-700">
                                {stud.username}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  {isPending ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                      Pending Approval
                                    </span>
                                  ) : isRejected ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase bg-red-100 text-red-800 border border-red-200">
                                      Rejected
                                    </span>
                                  ) : isDisabled ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase bg-slate-150 text-slate-700 border border-slate-300">
                                      Disabled
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Active
                                    </span>
                                  )}
                                  
                                  {stud.isActive === false && (
                                    <span className="text-[8px] font-semibold text-rose-500 uppercase">Soft Deleted</span>
                                  )}
                                  {stud.mustChangePassword && (
                                    <span className="text-[9px] text-amber-600 font-semibold">⚠️ Temp Password Active</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isPending ? (
                                    <button
                                      type="button"
                                      onClick={openLiveStudentSignupApprovals}
                                      className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
                                      title="Open the canonical cloud Class Teacher approval queue"
                                    >
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>Open Live Approval Queue</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleResetUserPassword(stud)}
                                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
                                        title="Reset student password"
                                      >
                                        <KeyRound className="w-3 h-3" />
                                        <span>Reset Password</span>
                                      </button>
                                      
                                      {isDisabled || stud.isActive === false ? (
                                        <button
                                          onClick={() => handleEnableStudent(stud)}
                                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                          <Unlock className="w-3 h-3" />
                                          <span>Enable</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleDisableStudent(stud)}
                                          className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                          <Lock className="w-3 h-3" />
                                          <span>Disable</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SECURITY & PASSWORD CHANGE (FOR EVERYONE) */}
      {/* ========================================================= */}
      {activeTab === 'security' && renderSecurityPasswordPage()}

      {/* ========================================================= */}
      {/* TAB 4: ACADEMIC SETUP & CONFIGURATION */}
      {/* ========================================================= */}
      {activeTab === 'academic_setup' && (
        <div className="animate-fade-in text-left">
          <AcademicSetupModule
            lang={lang}
            userRole={user.role}
            userName={user.name}
            userId={user.id}
          />
        </div>
      )}

      {activeTab === 'language_settings' && user.role === 'headmaster' && (
        <div className="animate-fade-in">
          <SchoolLanguageSettings lang={lang} user={user} />
        </div>
      )}

      {activeTab === 'website_studio' && (user.role === 'headmaster' || user.role === 'clerk') && (
        <div className="animate-fade-in text-left">
          <SchoolWebsiteStudio
            userRole={user.role}
            userName={user.name}
            initialTab={user.role === 'headmaster' ? 'applications' : 'identity'}
            allowedTabs={user.role === 'headmaster' ? ['applications', 'confirmation'] : ['identity', 'media', 'content', 'contact', 'design', 'preview', 'admissions']}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: SMART AI TIMETABLE ENGINE V2 (BETA) */}
      {/* ========================================================= */}
      {!showTeacherScopedTimetable && activeTab === 'timetable_v2' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster'
            ? <SmartTimetableV2 lang={lang} user={user} initialTab={timetableInitialTab} />
            : <RoleScopedTimetable lang={lang} user={user} />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: STAFF MASTER (SHALARTH ID MASTER) */}
      {/* ========================================================= */}
      {!showStaffMasterFocusedWorkspace && activeTab === 'staff_master' && (
        <div className="animate-fade-in text-left">
          <StaffMaster lang={lang} userRole={user.role} userId={user.id} userName={user.name} />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CENTRALIZED MASTER DATA MANAGEMENT */}
      {/* ========================================================= */}
      {!showMasterDataFocusedWorkspace && !showAssignmentValidityFocusedWorkspace && !showHeadmasterStudentLifecycleFocusedWorkspace && !showHeadmasterStudentServiceRequestsFocusedWorkspace && activeTab === 'master_data' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster' && activeRoleModule?.id === 'hm-student-master'
            ? (activeFeatureId === 'student-recognition-rankings'
              ? <HeadmasterStudentRecognition user={user} />
              : <StudentDirectoryWorkspace user={user} activeFeatureId={activeFeatureId} />)
            : <MasterDataDashboard
                lang={lang}
                userRole={user.role}
                userName={user.name}
                userId={user.id}
              />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5.5: HEADMASTER SMART ATTENDANCE AUDITOR */}
      {/* ========================================================= */}
      {!showTeacherFocusedWorkspace && activeTab === 'attendance' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster'
            ? <HeadmasterAttendanceCloudWorkspace user={user} activeFeatureId={activeModuleId === 'hm-student-attendance' ? activeFeatureId : 'attendance-dashboard'} />
            : <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><SmartAttendanceManager lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId={null} /></div>}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5.6: HEADMASTER LEAVE MANAGEMENT */}
      {/* ========================================================= */}
      {!showHeadmasterLeaveFocusedWorkspace && activeTab === 'leave_management' && (
        <div className="animate-fade-in text-left">
          <SmartLeaveManager lang={lang} user={user} onRefreshData={onRefreshData} />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: HEADMASTER EXAMS & QUESTION PAPER REVIEW */}
      {/* ========================================================= */}
      {activeTab === 'exams' && user.role === 'headmaster' && (
        <div className="animate-fade-in text-left">
          <HeadmasterExamControlWorkspace lang={lang} user={user} activeFeatureId={activeModuleId === 'hm-exam-control' ? activeFeatureId : null} />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6.5: RESULT MANAGEMENT (NEW OUT-OF-THE-BOX WORKSPACE) */}
      {/* ========================================================= */}
      {!showHeadmasterResultPublicationFocusedWorkspace && activeTab === 'result_management' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster'
            ? <HeadmasterResultControlWorkspace lang={lang} user={user} activeFeatureId={activeModuleId === 'hm-result-management' ? activeFeatureId : null} />
            : <ResultManagement lang={lang} user={user} activeFeatureId={activeModuleId === 'cl-result-management' ? activeFeatureId : null} />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: RESULT ANALYTICS & PROMOTIONS DESK */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster'
            ? <HeadmasterResultAnalyticsWorkspace lang={lang} user={user} activeFeatureId={activeModuleId === 'hm-result-analytics-promotions' ? activeFeatureId : null} />
            : <ResultAnalyticsDashboard lang={lang} user={user} onRefreshData={onRefreshData} activeFeatureId={activeModuleId === 'hm-result-analytics-promotions' ? activeFeatureId : null} />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: SMART FEES COUNTER & LEDGER DESK */}
      {/* ========================================================= */}
      {activeTab === 'fees' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster' && activeModuleId === 'hm-smart-fees-desk'
            ? <HeadmasterCloudFeeWorkspace lang={lang} user={user} activeFeatureId={activeFeatureId} />
            : <SmartFeeManager
                lang={lang}
                user={user}
                onRefreshData={onRefreshData}
                activeFeatureId={activeModuleId === 'hm-smart-fees-desk' ? activeFeatureId : null}
              />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 9: SMART ACCOUNTING & CASH BOOK */}
      {/* ========================================================= */}
      {activeTab === 'accounting' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster'
            ? <HeadmasterFinanceCloudWorkspace lang={lang} user={user} activeFeatureId={activeModuleId === 'hm-accounting' ? activeFeatureId : null} />
            : <SmartAccountingManager
                lang={lang}
                user={user}
                onRefreshData={onRefreshData}
                activeFeatureId={activeModuleId === 'cl-accounting-finance' ? activeFeatureId : null}
              />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 10: PAYROLL & HRMS SYSTEM */}
      {/* ========================================================= */}
      {activeTab === 'payroll' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster'
            ? <HeadmasterPayrollHRCloudWorkspace lang={lang} user={user} activeFeatureId={activeModuleId === 'hm-payroll' ? activeFeatureId : null} />
            : <SmartPayrollManager
                lang={lang}
                user={{ ...user, username: user.name }}
                onRefreshData={onRefreshData}
                activeFeatureId={null}
              />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 11: DIGITAL LIBRARY MANAGER (HEADMASTER WORKSPACE) */}
      {/* ========================================================= */}
      {!showHeadmasterLibraryFocusedWorkspace && activeTab === 'library' && (
        <div className="animate-fade-in text-left bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {user.role === 'headmaster' ? <HeadmasterLibraryCloudWorkspace lang={lang} user={user} /> : <SmartLibraryManager lang={lang} user={user} onRefreshData={onRefreshData} />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 12: DIGITAL INVENTORY MANAGER (HEADMASTER WORKSPACE) */}
      {/* ========================================================= */}
      {!showHeadmasterInventoryFocusedWorkspace && activeTab === 'inventory' && (
        <div className="animate-fade-in text-left bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {user.role === 'headmaster' ? <HeadmasterInventoryCloudWorkspace lang={lang} user={user} /> : <SmartInventoryManager lang={lang} user={user} onRefreshData={onRefreshData} />}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 13: SMART COMMUNICATION HUB (HEADMASTER WORKSPACE) */}
      {/* ========================================================= */}
      {!showHeadmasterCommunicationFocusedWorkspace && activeTab === 'communication' && (
        user.role === 'headmaster'
          ? <HeadmasterCommunicationCloudWorkspace user={user} activeFeatureId="school-notices" />
          : user.role === 'clerk'
            ? <ClerkCommunicationOffice lang={lang} user={user} onRefreshData={onRefreshData} />
            : (user.role === 'teacher' || user.role === 'class_teacher')
              ? <TeacherWorkspace
                  lang={lang as any}
                  user={user}
                  initialModule={
                    activeFeatureId === 'tr-class-subject-announcements' ? 'tr-class-subject-announcements'
                    : activeFeatureId === 'tr-homework-notifications' ? 'tr-homework-notifications'
                    : activeFeatureId === 'tr-parent-student-communication' ? 'tr-parent-student-communication'
                    : 'tr-school-notices'
                  }
                  focusedMode
                  focusedTitle={activeRoleFeature?.label || 'Teacher Communication'}
                  onNavigate={(moduleId, featureId) => openRoleModuleById(moduleId, featureId)}
                />
              : (user.role === 'student' || user.role === 'parent' || user.role === 'peon')
                ? <CloudNotificationCenter lang={lang} user={user} />
                : <div className="animate-fade-in text-left bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><SmartCommunicationHub lang={lang} user={user} onRefreshData={onRefreshData} /></div>
      )}

      {!showHeadmasterSecurityFocusedWorkspace && activeTab === 'gatekeeper_security' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster' ? <HeadmasterSecurityCloudWorkspace lang={lang} user={user} /> : <SmartSecurityManager lang={lang} user={user} />}
        </div>
      )}

      {!showHeadmasterAuditFocusedWorkspace && activeTab === 'erp_admin' && (
        <div className="animate-fade-in text-left">
          {user.role === 'headmaster' && activeModuleId === 'hm-system-admin' ? <HeadmasterSystemAuditCloudWorkspace lang={lang} user={user} activeFeatureId={activeFeatureId} mode="system" /> : <SmartAdminControl lang={lang} user={user} activeFeatureId={null} />}
        </div>
      )}

      {!showHeadmasterCertificatesFocusedWorkspace && !showHeadmasterStatutoryRegistersFocusedWorkspace && activeTab === 'gov_registers' && (
        <div className="animate-fade-in text-left">
          <StatutoryRegistersManager lang={lang} user={user} />
        </div>
      )}

      {activeTab === 'executive_dss' && (
        <div className="animate-fade-in text-left bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <ExecutiveDashboard lang={lang} user={user} activeFeatureId={activeFeatureId} />
        </div>
      )}

      </div>}

      {/* Printable Paper Footer (A4) */}
      <PrintSignatureArea lang={lang} />
    </div>
  );
}
