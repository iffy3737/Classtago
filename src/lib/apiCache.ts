/**
 * R2.5.98 instant-load cache layer.
 * Wraps GET requests with a stale-while-revalidate pattern:
 *  - Returns cached data instantly when fresh (< TTL)
 *  - Returns stale cache instantly + refreshes silently in background
 *  - Falls through to network when nothing is cached
 * Only GET requests are cached. All mutations (POST/PUT/PATCH/DELETE) always
 * hit the network, so saving, AI generation and uploads keep working online.
 */

const CACHE_PREFIX = 'edunixo.api.cache.';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CachedEntry = {
  data: unknown;
  at: number;
};

function readCache(key: string): CachedEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed || typeof parsed.at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    // localStorage full — silently skip
  }
}

export function clearApiCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export type CachedFetchOptions = RequestInit & {
  /** Override cache time-to-live in milliseconds. Default 5 minutes. */
  cacheTtlMs?: number;
  /** Skip cache entirely (always fetch fresh). */
  cacheBypass?: boolean;
};

/**
 * Fetch wrapper that returns cached data instantly and refreshes in background.
 *
 * Return shape (superset of Response-like object):
 *   { ok, status, data, json(), text(), fromCache }
 */
export async function cachedFetch(input: string, options: CachedFetchOptions = {}): Promise<any> {
  const method = String(options.method || 'GET').toUpperCase();
  const url = String(input);
  const ttl = Number.isFinite(options.cacheTtlMs as any) ? Number(options.cacheTtlMs) : DEFAULT_TTL_MS;
  const bypass = options.cacheBypass === true;

  // Only GET requests are cached. Mutations always go straight to network.
  if (method !== 'GET' || bypass) {
    const response = await fetch(input, options as RequestInit);
    const data = await response.clone().json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      data,
      json: async () => data,
      text: () => response.clone().text(),
      fromCache: false,
    };
  }

  const key = `${url}|${options.headers ? JSON.stringify(options.headers) : ''}`;
  const cached = readCache(key);
  const now = Date.now();

  const fetchFresh = async () => {
    const response = await fetch(input, options as RequestInit);
    const data = await response.clone().json().catch(() => ({}));
    if (response.ok) writeCache(key, data);
    return data;
  };

  if (cached && now - cached.at < ttl) {
    // Fresh cache hit — return instantly, no network.
    return {
      ok: true,
      status: 200,
      data: cached.data,
      json: async () => cached.data,
      text: async () => JSON.stringify(cached.data),
      fromCache: true,
    };
  }

  if (cached) {
    // Stale cache — return instantly, refresh silently in the background.
    void fetchFresh().catch(() => undefined);
    return {
      ok: true,
      status: 200,
      data: cached.data,
      json: async () => cached.data,
      text: async () => JSON.stringify(cached.data),
      fromCache: true,
    };
  }

  // No cache — must hit network.
  try {
    const data = await fetchFresh();
    return {
      ok: true,
      status: 200,
      data,
      json: async () => data,
      text: async () => JSON.stringify(data),
      fromCache: false,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {},
      json: async () => ({}),
      text: async () => '',
      fromCache: false,
    };
  }
}
