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

export function publishMariaDynamicCommand(command: MariaDynamicClientCommand) {
  if (typeof window === 'undefined') return;
  const item = withIdentity(command);
  const root = window as any;
  root[QUEUE_KEY] = [...currentQueue(), item].slice(-20);
  if (item.moduleId) {
    window.dispatchEvent(new CustomEvent('edunixo_smart_navigate', { detail:{ moduleId:item.moduleId, featureId:item.featureId } }));
  }
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
