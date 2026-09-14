/**
 * Classtago Phase 1 — encrypted offline cache + durable action queue.
 * No operational cloud source-of-truth is replaced. This layer only stores
 * device-local drafts/cache until the existing authorized online APIs succeed.
 */

export type Phase1QueueKind = 'attendance_save' | 'result_subject_draft';

export interface Phase1Scope {
  schoolId: string;
  userId: string;
}

export interface Phase1QueueItem<T = unknown> {
  id: string;
  kind: Phase1QueueKind;
  scope: Phase1Scope;
  recordKey: string;
  capturedAt: string;
  deviceId: string;
  attempts: number;
  lastError?: string;
  payload: T;
}

type EncryptedEnvelope = {
  version: 1;
  iv: number[];
  ciphertext: ArrayBuffer;
  updatedAt: string;
};

type StoredQueue = {
  id: string;
  kind: Phase1QueueKind;
  schoolId: string;
  userId: string;
  recordKey: string;
  capturedAt: string;
  deviceId: string;
  attempts: number;
  lastError?: string;
  envelope: EncryptedEnvelope;
};

const DB_NAME = 'edunixo-phase1-secure';
const DB_VERSION = 1;
const CACHE_STORE = 'cache';
const QUEUE_STORE = 'queue';
const META_STORE = 'meta';
const KEY_ID = 'phase1-aes-gcm-key';
const DEVICE_ID_KEY = 'edunixo.phase1.deviceId';

let dbPromise: Promise<IDBDatabase> | null = null;
let cryptoKeyPromise: Promise<CryptoKey> | null = null;

function assertBrowser() {
  if (typeof window === 'undefined' || !('indexedDB' in window) || !window.crypto?.subtle) {
    throw new Error('Secure offline storage is not available on this device/browser.');
  }
}

function openDb(): Promise<IDBDatabase> {
  assertBrowser();
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Offline database could not be opened.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('scope', ['schoolId', 'userId'], { unique: false });
        store.createIndex('kind', 'kind', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline database request failed.'));
  });
}

async function getCryptoKey(): Promise<CryptoKey> {
  assertBrowser();
  if (cryptoKeyPromise) return cryptoKeyPromise;
  cryptoKeyPromise = (async () => {
    const db = await openDb();
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(KEY_ID);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => reject(req.error);
    }).catch(() => undefined);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(key, KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return key;
  })();
  return cryptoKeyPromise;
}

async function encrypt(value: unknown): Promise<EncryptedEnvelope> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { version: 1, iv: Array.from(iv), ciphertext, updatedAt: new Date().toISOString() };
}

async function decrypt<T>(envelope: EncryptedEnvelope): Promise<T> {
  const key = await getCryptoKey();
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(envelope.iv) }, key, envelope.ciphertext);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function cacheId(scope: Phase1Scope, namespace: string, recordKey: string) {
  return `${scope.schoolId}:${scope.userId}:${namespace}:${recordKey}`;
}

export function phase1DeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const current = localStorage.getItem(DEVICE_ID_KEY);
    if (current) return current;
    const created = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return `device-${Date.now()}`;
  }
}

export async function putPhase1Cache<T>(scope: Phase1Scope, namespace: string, recordKey: string, payload: T): Promise<void> {
  const db = await openDb();
  const id = cacheId(scope, namespace, recordKey);
  const envelope = await encrypt(payload);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    tx.objectStore(CACHE_STORE).put({ id, schoolId: scope.schoolId, userId: scope.userId, namespace, recordKey, envelope }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getPhase1Cache<T>(scope: Phase1Scope, namespace: string, recordKey: string): Promise<T | null> {
  try {
    const db = await openDb();
    const id = cacheId(scope, namespace, recordKey);
    const stored = await requestResult<any>(db.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).get(id));
    if (!stored?.envelope) return null;
    return await decrypt<T>(stored.envelope);
  } catch (error) {
    console.warn('[Classtago offline] cache read failed', error);
    return null;
  }
}

export async function removePhase1Cache(scope: Phase1Scope, namespace: string, recordKey: string): Promise<void> {
  const db = await openDb();
  const id = cacheId(scope, namespace, recordKey);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    tx.objectStore(CACHE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queuePhase1Action<T>(input: Omit<Phase1QueueItem<T>, 'id' | 'attempts' | 'deviceId'> & { id?: string; deviceId?: string }): Promise<Phase1QueueItem<T>> {
  const db = await openDb();
  // One pending action per user + feature record. Re-saving offline replaces the
  // older pending draft so reconnect never replays stale attendance/marks first.
  const deterministicId = `phase1:${input.kind}:${input.scope.schoolId}:${input.scope.userId}:${input.recordKey}`;
  const item: Phase1QueueItem<T> = {
    id: input.id || deterministicId,
    kind: input.kind,
    scope: input.scope,
    recordKey: input.recordKey,
    capturedAt: input.capturedAt,
    deviceId: input.deviceId || phase1DeviceId(),
    attempts: 0,
    payload: input.payload,
  };
  const envelope = await encrypt(item.payload);
  const stored: StoredQueue = {
    id: item.id,
    kind: item.kind,
    schoolId: item.scope.schoolId,
    userId: item.scope.userId,
    recordKey: item.recordKey,
    capturedAt: item.capturedAt,
    deviceId: item.deviceId,
    attempts: 0,
    envelope,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  dispatchQueueChanged();
  return item;
}

export async function listPhase1Queue(scope?: Phase1Scope): Promise<Phase1QueueItem[]> {
  try {
    const db = await openDb();
    const store = db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE);
    const rows: StoredQueue[] = scope
      ? await requestResult(store.index('scope').getAll([scope.schoolId, scope.userId]))
      : await requestResult(store.getAll());
    const items: Phase1QueueItem[] = [];
    for (const row of rows) {
      try {
        items.push({
          id: row.id,
          kind: row.kind,
          scope: { schoolId: row.schoolId, userId: row.userId },
          recordKey: row.recordKey,
          capturedAt: row.capturedAt,
          deviceId: row.deviceId,
          attempts: row.attempts || 0,
          lastError: row.lastError,
          payload: await decrypt(row.envelope),
        });
      } catch (error) {
        console.warn('[Classtago offline] queued item could not be decrypted', row.id, error);
      }
    }
    return items.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  } catch {
    return [];
  }
}

export async function removePhase1QueueItem(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  dispatchQueueChanged();
}

export async function markPhase1QueueError(id: string, message: string): Promise<void> {
  const db = await openDb();
  const txRead = db.transaction(QUEUE_STORE, 'readonly');
  const existing = await requestResult<StoredQueue | undefined>(txRead.objectStore(QUEUE_STORE).get(id));
  if (!existing) return;
  const updated: StoredQueue = { ...existing, attempts: (existing.attempts || 0) + 1, lastError: message.slice(0, 600) };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  dispatchQueueChanged();
}

export async function clearPhase1Scope(scope: Phase1Scope): Promise<void> {
  try {
    const db = await openDb();
    const cacheRows = await requestResult<any[]>(db.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).getAll());
    const queueRows = await requestResult<StoredQueue[]>(db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll());

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([CACHE_STORE, QUEUE_STORE], 'readwrite');
      const cacheStore = tx.objectStore(CACHE_STORE);
      const queueStore = tx.objectStore(QUEUE_STORE);
      for (const row of cacheRows) if (row?.schoolId === scope.schoolId && row?.userId === scope.userId) cacheStore.delete(row.id);
      for (const row of queueRows) if (row.schoolId === scope.schoolId && row.userId === scope.userId) queueStore.delete(row.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    dispatchQueueChanged();
  } catch (error) {
    console.warn('[Classtago offline] scope cleanup failed', error);
  }
}

function dispatchQueueChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('edunixo_phase1_queue_changed'));
}

export function dispatchPhase1Sync(detail: { kind: Phase1QueueKind; recordKey: string; ok: boolean; error?: string }) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('edunixo_phase1_sync', { detail }));
}
