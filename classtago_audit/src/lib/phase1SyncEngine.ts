import { listPhase1Queue, removePhase1QueueItem, markPhase1QueueError, dispatchPhase1Sync, type Phase1Scope, type Phase1QueueItem } from './phase1Offline';
import { saveDailyAttendance } from '../modules/teacherFresh/teacherFreshService';
import { saveSubjectDraft } from '../modules/teacherResultFresh/teacherResultService';

let running = false;
let installed = false;
let timer: ReturnType<typeof setInterval> | null = null;
let activeScope: Phase1Scope | null = null;

async function execute(item: Phase1QueueItem) {
  if (item.kind === 'attendance_save') {
    const payload: any = item.payload;
    await saveDailyAttendance({
      ...payload,
      offline: { capturedAt: item.capturedAt, deviceId: item.deviceId, queueId: item.id },
    });
    return;
  }
  if (item.kind === 'result_subject_draft') {
    const payload: any = item.payload;
    await saveSubjectDraft({
      ...payload,
      offline: {
        capturedAt: item.capturedAt,
        deviceId: item.deviceId,
        queueId: item.id,
        baseRevision: payload.baseRevision ?? null,
        baseUpdatedAt: payload.baseUpdatedAt ?? null,
      },
    });
    return;
  }
  throw new Error(`Unsupported offline action: ${String((item as any).kind)}`);
}

export async function flushPhase1Queue(scope = activeScope): Promise<{ synced: number; failed: number; pending: number }> {
  if (!scope || running || typeof navigator === 'undefined' || !navigator.onLine) {
    const pending = scope ? (await listPhase1Queue(scope)).length : 0;
    return { synced: 0, failed: 0, pending };
  }
  running = true;
  let synced = 0;
  let failed = 0;
  try {
    const items = await listPhase1Queue(scope);
    for (const item of items) {
      try {
        await execute(item);
        await removePhase1QueueItem(item.id);
        synced += 1;
        dispatchPhase1Sync({ kind: item.kind, recordKey: item.recordKey, ok: true });
      } catch (error: any) {
        const message = error?.message || 'Offline sync failed.';
        await markPhase1QueueError(item.id, message);
        failed += 1;
        dispatchPhase1Sync({ kind: item.kind, recordKey: item.recordKey, ok: false, error: message });
        // Authorization/conflict errors need human review; transient errors can retry later.
        if (/conflict|changed on another|locked|submitted|accepted|assignment|expired|historical/i.test(message)) continue;
        if (!navigator.onLine) break;
      }
    }
  } finally {
    running = false;
  }
  const pending = (await listPhase1Queue(scope)).length;
  return { synced, failed, pending };
}

export function installPhase1SyncEngine(scope: Phase1Scope): () => void {
  activeScope = scope;
  if (!installed && typeof window !== 'undefined') {
    installed = true;
    const online = () => void flushPhase1Queue();
    window.addEventListener('online', online);
    timer = setInterval(() => { if (navigator.onLine) void flushPhase1Queue(); }, 30_000);
    queueMicrotask(() => { if (navigator.onLine) void flushPhase1Queue(); });
    return () => {
      window.removeEventListener('online', online);
      if (timer) clearInterval(timer);
      timer = null;
      installed = false;
      activeScope = null;
    };
  }
  queueMicrotask(() => { if (typeof navigator !== 'undefined' && navigator.onLine) void flushPhase1Queue(scope); });
  return () => { if (activeScope?.schoolId === scope.schoolId && activeScope?.userId === scope.userId) activeScope = null; };
}
