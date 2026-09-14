import { useCallback, useEffect, useRef, useState } from 'react';

export type ErpAutosavePhase = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error';

export interface ErpAutosaveState {
  phase: ErpAutosavePhase;
  lastSavedAt: Date | null;
  error: string | null;
  pending: boolean;
}

interface StoredRoutineJob<T, C> {
  version: 1;
  value: T;
  context: C;
  queuedAt: string;
  fingerprint: string;
}

interface QueueJob<T, C> {
  value: T;
  context: C;
  fingerprint: string;
  queuedAt: number;
}

interface ActionQueueJob<T, C> extends QueueJob<T, C> {
  resolve: (result: ErpAutosaveCommitResult) => void;
}

export interface ErpAutosaveCommitResult {
  ok: boolean;
  error?: string;
}

export interface UseErpAutosaveQueueOptions<T, C, R> {
  enabled: boolean;
  storageKey: string;
  debounceMs?: number;
  validate?: (value: T) => string | null;
  persist: (value: T, context: C) => Promise<R>;
  onSuccess?: (result: R, value: T, context: C) => void;
  onError?: (message: string, value: T, context: C, mode: 'routine' | 'action') => void;
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableNormalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function erpAutosaveFingerprint(value: unknown): string {
  const json = JSON.stringify(stableNormalize(value));
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${json.length}:${(hash >>> 0).toString(16)}`;
}

function safeReadStoredJob<T, C>(storageKey: string): StoredRoutineJob<T, C> | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRoutineJob<T, C>;
    if (parsed?.version !== 1 || !parsed.fingerprint || !parsed.queuedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteStoredJob<T, C>(storageKey: string, job: QueueJob<T, C>): void {
  try {
    const stored: StoredRoutineJob<T, C> = {
      version: 1,
      value: job.value,
      context: job.context,
      queuedAt: new Date(job.queuedAt).toISOString(),
      fingerprint: job.fingerprint
    };
    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    // The normal compatibility cache still holds the latest draft if browser quota is unavailable.
  }
}

function safeClearStoredJob(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore browser storage cleanup failures.
  }
}

export function useErpAutosaveQueue<T, C, R>(options: UseErpAutosaveQueueOptions<T, C, R>) {
  const debounceMs = options.debounceMs ?? 1200;
  const persistRef = useRef(options.persist);
  const validateRef = useRef(options.validate);
  const successRef = useRef(options.onSuccess);
  const errorRef = useRef(options.onError);
  const enabledRef = useRef(options.enabled);
  const storageKeyRef = useRef(options.storageKey);

  persistRef.current = options.persist;
  validateRef.current = options.validate;
  successRef.current = options.onSuccess;
  errorRef.current = options.onError;
  enabledRef.current = options.enabled;
  storageKeyRef.current = options.storageKey;

  const [state, setState] = useState<ErpAutosaveState>({
    phase: 'idle',
    lastSavedAt: null,
    error: null,
    pending: false
  });

  const routineRef = useRef<QueueJob<T, C> | null>(null);
  const actionQueueRef = useRef<ActionQueueJob<T, C>[]>([]);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFingerprintRef = useRef<string | null>(null);
  const processRef = useRef<() => Promise<void>>(async () => undefined);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  };

  const updatePendingState = (phase?: ErpAutosavePhase, error: string | null = null) => {
    const pending = Boolean(routineRef.current || actionQueueRef.current.length || inFlightRef.current);
    setState(previous => ({
      ...previous,
      phase: phase ?? (pending ? 'dirty' : previous.phase),
      error,
      pending
    }));
  };

  processRef.current = async () => {
    if (!enabledRef.current || inFlightRef.current) return;

    let mode: 'routine' | 'action' = 'routine';
    let actionJob: ActionQueueJob<T, C> | null = null;
    let job: QueueJob<T, C> | null = null;

    if (actionQueueRef.current.length) {
      mode = 'action';
      actionJob = actionQueueRef.current.shift() || null;
      job = actionJob;
    } else if (routineRef.current) {
      job = routineRef.current;
      routineRef.current = null;
    }

    if (!job) {
      setState(previous => ({
        ...previous,
        phase: previous.phase === 'saving' ? 'saved' : previous.phase,
        pending: false
      }));
      return;
    }

    if (job.fingerprint === savedFingerprintRef.current) {
      if (mode === 'routine') safeClearStoredJob(storageKeyRef.current);
      actionJob?.resolve({ ok: true });
      updatePendingState('saved');
      queueMicrotask(() => void processRef.current());
      return;
    }

    const validationError = validateRef.current?.(job.value) || null;
    if (validationError) {
      if (mode === 'routine') {
        routineRef.current = job;
        safeWriteStoredJob(storageKeyRef.current, job);
      }
      actionJob?.resolve({ ok: false, error: validationError });
      errorRef.current?.(validationError, job.value, job.context, mode);
      updatePendingState('error', validationError);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const message = mode === 'routine'
        ? 'Offline — changes are queued and will sync automatically.'
        : 'This action needs an internet connection. Routine edits remain queued safely.';
      if (mode === 'routine') {
        routineRef.current = job;
        safeWriteStoredJob(storageKeyRef.current, job);
      } else {
        actionJob?.resolve({ ok: false, error: message });
        errorRef.current?.(message, job.value, job.context, mode);
      }
      updatePendingState('offline', message);
      return;
    }

    inFlightRef.current = true;
    updatePendingState('saving');

    try {
      const result = await persistRef.current(job.value, job.context);
      savedFingerprintRef.current = job.fingerprint;
      successRef.current?.(result, job.value, job.context);
      if (mode === 'routine') safeClearStoredJob(storageKeyRef.current);
      actionJob?.resolve({ ok: true });
      setState(previous => ({
        phase: routineRef.current || actionQueueRef.current.length ? 'dirty' : 'saved',
        lastSavedAt: new Date(),
        error: null,
        pending: Boolean(routineRef.current || actionQueueRef.current.length)
      }));
    } catch (error: any) {
      const message = error?.message || 'Automatic cloud save failed.';
      if (mode === 'routine') {
        routineRef.current = job;
        safeWriteStoredJob(storageKeyRef.current, job);
        clearRetryTimer();
        retryTimerRef.current = setTimeout(() => void processRef.current(), 5000);
      }
      actionJob?.resolve({ ok: false, error: message });
      errorRef.current?.(message, job.value, job.context, mode);
      updatePendingState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error', message);
    } finally {
      inFlightRef.current = false;
      if (actionQueueRef.current.length || (routineRef.current && !retryTimerRef.current)) {
        queueMicrotask(() => void processRef.current());
      } else {
        setState(previous => ({ ...previous, pending: Boolean(routineRef.current) }));
      }
    }
  };

  const schedule = useCallback((value: T, context: C) => {
    const job: QueueJob<T, C> = {
      value,
      context,
      fingerprint: erpAutosaveFingerprint(value),
      queuedAt: Date.now()
    };
    routineRef.current = job;
    safeWriteStoredJob(storageKeyRef.current, job);
    clearTimer();
    clearRetryTimer();
    setState(previous => ({ ...previous, phase: 'dirty', error: null, pending: true }));
    timerRef.current = setTimeout(() => void processRef.current(), debounceMs);
  }, [debounceMs]);

  const commit = useCallback((value: T, context: C): Promise<ErpAutosaveCommitResult> => {
    clearTimer();
    routineRef.current = null;
    safeClearStoredJob(storageKeyRef.current);
    const job: QueueJob<T, C> = {
      value,
      context,
      fingerprint: erpAutosaveFingerprint(value),
      queuedAt: Date.now()
    };
    setState(previous => ({ ...previous, phase: 'dirty', error: null, pending: true }));
    return new Promise(resolve => {
      actionQueueRef.current.push({ ...job, resolve });
      void processRef.current();
    });
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    void processRef.current();
  }, []);

  const retry = useCallback(() => {
    clearRetryTimer();
    setState(previous => ({ ...previous, phase: 'dirty', error: null, pending: true }));
    void processRef.current();
  }, []);

  const markSaved = useCallback((value: T) => {
    clearTimer();
    clearRetryTimer();
    routineRef.current = null;
    actionQueueRef.current.splice(0).forEach(job => job.resolve({ ok: true }));
    savedFingerprintRef.current = erpAutosaveFingerprint(value);
    safeClearStoredJob(storageKeyRef.current);
    setState({ phase: 'saved', lastSavedAt: new Date(), error: null, pending: false });
  }, []);

  const restoreStored = useCallback((): { value: T; context: C } | null => {
    const stored = safeReadStoredJob<T, C>(storageKeyRef.current);
    if (!stored) return null;
    const job: QueueJob<T, C> = {
      value: stored.value,
      context: stored.context,
      fingerprint: stored.fingerprint,
      queuedAt: new Date(stored.queuedAt).getTime() || Date.now()
    };
    routineRef.current = job;
    setState(previous => ({ ...previous, phase: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'dirty', pending: true }));
    return { value: stored.value, context: stored.context };
  }, []);

  useEffect(() => {
    if (!options.enabled) return;
    if (routineRef.current || actionQueueRef.current.length) void processRef.current();
  }, [options.enabled]);

  useEffect(() => {
    const handleOnline = () => retry();
    const handleOffline = () => updatePendingState('offline', 'Offline — changes are queued and will sync automatically.');
    const handlePageExit = () => flush();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePageExit);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePageExit);
      clearTimer();
      clearRetryTimer();
    };
  }, [flush, retry]);

  return { state, schedule, commit, flush, retry, markSaved, restoreStored };
}
