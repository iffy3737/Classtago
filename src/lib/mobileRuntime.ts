/**
 * Classtago application runtime adapter.
 *
 * One React/Vite ERP codebase now serves three surfaces:
 *  - public website (www/root host)
 *  - responsive ERP web app (app.* / erp.* / explicit app runtime)
 *  - packaged native/mobile shell
 *
 * Only packaged/native builds rewrite /api requests to an external API base.
 * Browser app deployments keep same-origin /api routing.
 */

const env = (import.meta as any).env || {};

function envFlag(name: string): boolean {
  return String(env?.[name] || '').trim().toLowerCase() === 'true';
}

function browserRequestsAppRuntime(): boolean {
  if (typeof window === 'undefined') return false;

  // R2.5.98 URL mode: once the app runtime flag has been seen, remember it in
  // localStorage so subsequent URL rewrites (login, navigation) don't lose it.
  try {
    if (localStorage.getItem('edunixo.app.runtimeFlag') === '1') return true;
  } catch {}

  const host = String(window.location.hostname || '').trim().toLowerCase();
  const path = String(window.location.pathname || '/').toLowerCase();
  const params = new URLSearchParams(window.location.search || '');

  const detected = host.startsWith('app.')
    || host.startsWith('erp.')
    || path === '/app'
    || path.startsWith('/app/')
    || params.get('edunixoApp') === '1'
    || params.get('app') === '1';

  if (detected) {
    try { localStorage.setItem('edunixo.app.runtimeFlag', '1'); } catch {}
  }
  return detected;
}

/** Native/packaged mobile build flag kept separate for API routing. */
export const IS_EDUNIXO_NATIVE_APP = envFlag('VITE_EDUNIXO_MOBILE_APP');

/**
 * Dedicated browser ERP flag. Public web roots must never become the app merely
 * because a hosting/preview environment leaked an app flag. Browser ERP mode is
 * therefore explicit in the URL/host; native packaging still uses its own flag.
 */
export const IS_EDUNIXO_WEB_APP = browserRequestsAppRuntime();

/** Shared presentation/runtime flag used by the responsive ERP on every device. */
export const IS_EDUNIXO_APP_RUNTIME = IS_EDUNIXO_NATIVE_APP || IS_EDUNIXO_WEB_APP;

/** Backward-compatible name: historically meant the packaged mobile build. */
export const IS_EDUNIXO_MOBILE_APP = IS_EDUNIXO_NATIVE_APP;

export const EDUNIXO_MOBILE_API_BASE_URL = String(env.VITE_EDUNIXO_API_BASE_URL || '').trim().replace(/\/$/, '');
export const EDUNIXO_MOBILE_SCHOOL_CODE = String(env.VITE_EDUNIXO_MOBILE_SCHOOL_CODE || '').trim();
export const EDUNIXO_MOBILE_SCHOOL_NAME = String(env.VITE_EDUNIXO_MOBILE_SCHOOL_NAME || 'Classtago School').trim();

export type EdunixoRuntimeSurface = 'public-web' | 'web-app' | 'native-app';
export const EDUNIXO_RUNTIME_SURFACE: EdunixoRuntimeSurface = IS_EDUNIXO_NATIVE_APP
  ? 'native-app'
  : IS_EDUNIXO_APP_RUNTIME
    ? 'web-app'
    : 'public-web';

let installed = false;

function apiPathFromInput(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') return input.startsWith('/api/') ? input : null;
  if (input instanceof URL) return input.pathname.startsWith('/api/') ? `${input.pathname}${input.search}${input.hash}` : null;
  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      const url = new URL(input.url);
      return url.pathname.startsWith('/api/') ? `${url.pathname}${url.search}${url.hash}` : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function resolveEdunixoApiUrl(path: string): string {
  if (!IS_EDUNIXO_NATIVE_APP || !path.startsWith('/api/') || !EDUNIXO_MOBILE_API_BASE_URL) return path;
  return `${EDUNIXO_MOBILE_API_BASE_URL}${path}`;
}

/** Resolve the realtime Classtago WebSocket endpoint without exposing provider keys. */
export function resolveEdunixoWebSocketUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const apiUrl = resolveEdunixoApiUrl(path);
  if (/^https?:\/\//i.test(apiUrl)) {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${apiUrl.startsWith('/') ? apiUrl : `/${apiUrl}`}`;
}

export function installMobileRuntime(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  if (!IS_EDUNIXO_APP_RUNTIME) return;

  // The same premium responsive application class is used by PC browser,
  // mobile browser and native packaging. CSS media queries decide the layout.
  document.documentElement.classList.add('edunixo-app-runtime');
  if (IS_EDUNIXO_NATIVE_APP) document.documentElement.classList.add('edunixo-mobile-app');
  document.documentElement.dataset.edunixoRuntime = EDUNIXO_RUNTIME_SURFACE;
  document.documentElement.dataset.edunixoTheme = 'light';
  document.documentElement.style.colorScheme = 'light';

  // Web app deployments deliberately keep same-origin /api routing. The rewrite
  // exists only for a packaged native build whose origin differs from the API.
  if (!IS_EDUNIXO_NATIVE_APP || !EDUNIXO_MOBILE_API_BASE_URL) {
    if (IS_EDUNIXO_NATIVE_APP) console.info('[Classtago app] Using same-origin /api routing.');
    return;
  }

  const originalFetch = window.fetch.bind(window);
  const routedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const apiPath = apiPathFromInput(input);
    if (!apiPath) return originalFetch(input, init);

    const target = resolveEdunixoApiUrl(apiPath);
    if (typeof Request !== 'undefined' && input instanceof Request) {
      return originalFetch(new Request(target, input), init);
    }
    return originalFetch(target, init);
  }) as typeof window.fetch;

  try {
    const ownDescriptor = Object.getOwnPropertyDescriptor(window, 'fetch');

    if (!ownDescriptor || ownDescriptor.writable || ownDescriptor.set) {
      window.fetch = routedFetch;
      return;
    }

    if (ownDescriptor.configurable) {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: ownDescriptor.enumerable ?? true,
        writable: true,
        value: routedFetch,
      });
      return;
    }

    console.warn('[Classtago app] fetch is read-only in this runtime; API URL rewriting was skipped.');
  } catch (error) {
    console.warn('[Classtago app] Could not install API URL rewriting; keeping native fetch.', error);
  }
}
