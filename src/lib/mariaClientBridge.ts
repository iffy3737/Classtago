export type MariaMarkEntryCommand = {
  type: 'maria_mark_entry';
  statusMessage?: string;
  commandId?: string;
  command: 'open'|'start_vertical'|'start_horizontal'|'start_here'|'enter_values'|'set_direction'|'next'|'previous'|'correct_previous'|'pause'|'stop';
  moduleId?: string;
  featureId?: string;
  assignmentId?: string;
  subjectName?: string;
  className?: string;
  division?: string;
  term?: 'first_term'|'second_term';
  headLabel?: string;
  studentName?: string;
  rollNumber?: string;
  direction?: 'vertical'|'horizontal';
  values?: string[];
  value?: string;
};

export type MariaHomeworkCommand = {
  type: 'maria_homework';
  statusMessage?: string;
  commandId?: string;
  command: 'generate';
  moduleId?: string;
  featureId?: string;
  assignmentId?: string;
  subjectName?: string;
  className?: string;
  division?: string;
  chapters?: string[];
  difficulty?: string;
  targetMinutes?: number;
  languageCode?: string;
  instruction?: string;
};

export type MariaQuestionPaperCommand = {
  type: 'maria_question_paper';
  statusMessage?: string;
  commandId?: string;
  command: 'generate';
  moduleId?: string;
  featureId?: string;
  assignmentId?: string;
  subjectName?: string;
  className?: string;
  division?: string;
  exam?: 'first_unit_test'|'first_term_examination'|'second_unit_test'|'second_term_examination';
  totalMarks?: number;
  durationMinutes?: number;
  chapters?: string[];
  instruction?: string;
};


export type MariaAcademicGenerateCommand = {
  type: 'maria_academic_generate';
  statusMessage?: string;
  commandId?: string;
  command: 'generate';
  moduleId?: string;
  featureId?: string;
  assignmentId?: string;
  subjectName?: string;
  className?: string;
  division?: string;
  taskType: 'year-plan'|'daily-teaching-plan'|'lesson-plan'|'teaching-diary-assist'|'classwork-assignment';
  chapters?: string[];
  instruction?: string;
  structuredInputs?: Record<string,string|number>;
};

export type MariaAttendanceCommand = {
  type: 'maria_attendance';
  statusMessage?: string;
  commandId?: string;
  command: 'open'|'mark_all_present'|'mark_absent'|'mark_present'|'enter_sequence'|'clear';
  moduleId?: string;
  featureId?: string;
  className?: string;
  division?: string;
  studentNames?: string[];
  rollNumbers?: string[];
  statuses?: Array<'P'|'A'>;
};

export type MariaParentPortalCommand = {
  type: 'maria_parent_portal';
  statusMessage?: string;
  commandId?: string;
  command: 'open_child'|'prefill_service_request'|'prefill_leave';
  moduleId?: string;
  featureId?: string;
  studentId?: string;
  studentName?: string;
  requestType?: 'certificate'|'library'|'profile_correction'|'support';
  title?: string;
  details?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
};

export type MariaDynamicClientCommand = MariaMarkEntryCommand | MariaHomeworkCommand | MariaQuestionPaperCommand | MariaAcademicGenerateCommand | MariaAttendanceCommand | MariaParentPortalCommand;

type QueuedCommand = MariaDynamicClientCommand & { __queuedAt: number; __commandId: string };
const QUEUE_KEY = '__EDUNIXO_MARIA_DYNAMIC_QUEUE__';
const EVENT_NAME = 'edunixo_maria_dynamic_action';
const TTL_MS = 60_000;

function withIdentity(command: MariaDynamicClientCommand): QueuedCommand {
  const id = String(command.commandId || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`);
  return { ...command, commandId:id, __commandId:id, __queuedAt:Date.now() } as QueuedCommand;
}

function currentQueue(): QueuedCommand[] {
  if (typeof window === 'undefined') return [];
  const root = window as any;
  const now = Date.now();
  const raw = Array.isArray(root[QUEUE_KEY]) ? root[QUEUE_KEY] : [];
  const live = raw.filter((item:any) => item && Number(item.__queuedAt || 0) > now - TTL_MS).slice(-20);
  root[QUEUE_KEY] = live;
  return live;
}

const NAV_QUEUE_KEY = '__classtago_maria_navigation_queue_v1';

function currentNavigationQueue() {
  if (typeof window === 'undefined') return [];
  const root = window as any;
  const now = Date.now();
  const raw = Array.isArray(root[NAV_QUEUE_KEY]) ? root[NAV_QUEUE_KEY] : [];
  const live = raw.filter((item:any) => item && Number(item.queuedAt || 0) > now - TTL_MS).slice(-12);
  root[NAV_QUEUE_KEY] = live;
  return live;
}

const MARIA_MODULE_TAB_HINTS: Record<string, string> = {
  'tr-attendance-daily':'attendance','tr-attendance-catalogue':'attendance','tr-attendance-history':'attendance','tr-attendance-correction':'attendance',
  'tr-swiftchat-sync':'attendance','tr-result-subject-marks':'result_management','tr-result-class-mark-list':'result_management','tr-result-book':'result_management','tr-result-progress-card':'result_management',
  'tr-my-timetable':'timetable_v2','tr-class-timetable':'timetable_v2','tr-my-workload':'timetable_v2','tr-substitute-duties':'timetable_v2',
  'tr-class-subject-announcements':'communication','tr-homework-notifications':'communication','tr-parent-student-communication':'communication','tr-school-notices':'communication',
  'tr-leave-apply':'leave_management','tr-leave-status':'leave_management','tr-leave-history':'leave_management','tr-personal-hr-summary':'leave_management',
  'hm-student-attendance':'attendance','hm-smart-timetable':'timetable_v2','hm-result-management':'result_management','hm-communication':'communication','hm-leave-management':'leave_management',
  'hm-admission-campaigns':'admission_desk','hm-smart-fees-desk':'fees','cl-student-attendance-registers':'attendance','cl-result-management':'result_management','cl-communication':'communication','cl-fees-management':'fees'
};

function mariaNavigationTab(moduleId: string): string {
  return MARIA_MODULE_TAB_HINTS[moduleId] || 'overview';
}

export function requestMariaNavigation(moduleId: string, featureId?: string) {
  if (typeof window === 'undefined' || !moduleId) return false;
  const root = window as any;
  const item = { moduleId:String(moduleId), featureId:featureId ? String(featureId) : undefined, queuedAt:Date.now() };
  root[NAV_QUEUE_KEY] = [...currentNavigationQueue(), item].slice(-12);

  // Primary path: call the live Dashboard opener directly. This is the exact
  // same guarded opener used by the visible role menu.
  let opened = false;
  try {
    const opener = root.__classtago_maria_open_role_module;
    if (typeof opener === 'function') opened = opener(item.moduleId, item.featureId) === true;
  } catch (error) {
    console.warn('Classtago Maria direct navigation handoff failed; fallback paths will continue.', error);
  }

  // Secondary path: URL route. Unlike an in-memory event, this survives React
  // lifecycle timing and also works when DashboardOverview is lazy-mounted.
  // DashboardOverview already owns and validates this route on mount/hashchange.
  try {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set('module', mariaNavigationTab(item.moduleId));
    params.set('view', item.moduleId);
    if (item.featureId) params.set('feature', item.featureId);
    const nextHash = `#${params.toString()}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  } catch (error) {
    console.warn('Classtago Maria URL navigation fallback failed.', error);
  }

  // Compatibility path for existing listeners.
  window.dispatchEvent(new CustomEvent('edunixo_smart_navigate', { detail:{ moduleId:item.moduleId, featureId:item.featureId } }));
  return opened;
}

export function takePendingMariaNavigations() {
  if (typeof window === 'undefined') return [];
  const root = window as any;
  const items = currentNavigationQueue();
  root[NAV_QUEUE_KEY] = [];
  return items;
}

export function publishMariaDynamicCommand(command: MariaDynamicClientCommand) {
  if (typeof window === 'undefined') return;
  const item = withIdentity(command);
  const root = window as any;
  root[QUEUE_KEY] = [...currentQueue(), item].slice(-20);
  if (item.moduleId) requestMariaNavigation(item.moduleId, item.featureId);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail:item }));
}

export function acknowledgeMariaDynamicCommand(commandId?: string) {
  if (typeof window === 'undefined' || !commandId) return;
  const root = window as any;
  root[QUEUE_KEY] = currentQueue().filter(item => item.__commandId !== commandId && item.commandId !== commandId);
}

export function takePendingMariaDynamicCommands(type: MariaDynamicClientCommand['type']) {
  if (typeof window === 'undefined') return [] as MariaDynamicClientCommand[];
  const root = window as any;
  const queue = currentQueue();
  const selected = queue.filter(item => item.type === type);
  const selectedIds = new Set(selected.map(item => item.__commandId));
  root[QUEUE_KEY] = queue.filter(item => !selectedIds.has(item.__commandId));
  return selected as MariaDynamicClientCommand[];
}

export function subscribeMariaDynamicCommands(handler:(command:MariaDynamicClientCommand)=>void) {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (event:Event) => {
    const detail = (event as CustomEvent<MariaDynamicClientCommand>).detail;
    if (!detail?.type) return;
    handler(detail);
    acknowledgeMariaDynamicCommand(String(detail.commandId || (detail as any).__commandId || ''));
  };
  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener);
}
