import { IS_EDUNIXO_NATIVE_APP } from './mobileRuntime';

let installed = false;

function normalizedWebAppOrigin(): string {
  const raw = String((import.meta as any).env?.VITE_EDUNIXO_WEB_APP_URL || '').trim();
  if (!raw) return '';
  try { return new URL(raw).origin; } catch { return ''; }
}

function isInternalUrl(raw: string): boolean {
  if (!raw) return true;
  if (raw.startsWith('/') || raw.startsWith('#')) return true;
  try {
    const url = new URL(raw, window.location.href);
    const canonical = normalizedWebAppOrigin();
    if (url.origin === window.location.origin) return true;
    if (canonical && url.origin === canonical) return true;
    return false;
  } catch {
    return true;
  }
}

function routeDeepLink(raw: string): void {
  try {
    const url = new URL(raw);
    const canonical = normalizedWebAppOrigin();

    // Native scheme works before a public app domain is configured.
    if (url.protocol === 'edunixo:') {
      const hostPart = url.hostname && url.hostname.toLowerCase() !== 'app' ? `/${url.hostname}` : '';
      const pathPart = url.pathname && url.pathname !== '/' ? url.pathname : '/';
      const next = `${hostPart}${pathPart}${url.search || ''}${url.hash || ''}`.replace(/\/{2,}/g, '/');
      window.history.pushState({}, '', next || '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    const currentHost = String(window.location.hostname || '').toLowerCase();
    const allowed = !canonical
      ? url.hostname.toLowerCase() === currentHost || url.hostname.toLowerCase().startsWith('app.')
      : url.origin === canonical;
    if (!allowed) return;

    const next = `${url.pathname || '/'}${url.search || ''}${url.hash || ''}`;
    window.history.pushState({}, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    // Ignore malformed external app-link payloads.
  }
}

/**
 * Native-only Capacitor behavior. The React application remains identical on
 * desktop/mobile web; this adapter only activates inside the installed app.
 */
export async function installNativeAppRuntime(): Promise<void> {
  if (installed || !IS_EDUNIXO_NATIVE_APP || typeof window === 'undefined') return;
  installed = true;

  document.documentElement.classList.add('edunixo-native-shell');
  document.documentElement.dataset.edunixoNative = 'android';

  try {
    const [appModule, statusModule, splashModule, keyboardModule, browserModule, networkModule] = await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/keyboard'),
      import('@capacitor/browser'),
      import('@capacitor/network'),
    ]);

    const { App } = appModule;
    const { StatusBar, Style } = statusModule;
    const { SplashScreen } = splashModule;
    const { Keyboard, KeyboardResize } = keyboardModule;
    const { Browser } = browserModule;
    const { Network } = networkModule;

    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#F7F9FF' });
    } catch (error) {
      console.warn('[EDUNIXO native] Status bar setup skipped.', error);
    }

    try {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    } catch (error) {
      console.warn('[EDUNIXO native] Keyboard resize setup skipped.', error);
    }

    App.addListener('backButton', () => {
      const nativeBack = new CustomEvent('edunixo:native-back', { cancelable: true });
      const shouldContinue = window.dispatchEvent(nativeBack);
      if (!shouldContinue) return;

      const modal = document.querySelector('[role="dialog"], [data-edunixo-modal="true"]');
      if (modal) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }

      if (window.history.length > 1) {
        window.history.back();
      } else {
        void App.minimizeApp();
      }
    });

    App.addListener('appUrlOpen', ({ url }) => routeDeepLink(url));

    const nativeOpen = async (raw: string) => {
      if (!raw) return;
      if (isInternalUrl(raw)) {
        try {
          const url = new URL(raw, window.location.href);
          window.location.assign(`${url.pathname}${url.search}${url.hash}`);
        } catch {
          window.location.assign(raw);
        }
        return;
      }
      try {
        await Browser.open({ url: raw, presentationStyle: 'popover' });
      } catch {
        window.location.assign(raw);
      }
    };

    // Existing ERP modules use window.open for documents, WhatsApp and external
    // resources. Keep internal routes inside EDUNIXO and hand external URLs to
    // the native browser layer instead of creating broken WebView tabs.
    const originalOpen = window.open.bind(window);
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const raw = url == null ? '' : String(url);
      if (!raw || isInternalUrl(raw)) return originalOpen(url as any, target, features);
      void nativeOpen(raw);
      return null;
    }) as typeof window.open;

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const raw = anchor.getAttribute('href') || '';
      if (!raw || isInternalUrl(raw)) return;
      event.preventDefault();
      void nativeOpen(anchor.href || raw);
    }, true);

    const applyNetworkState = (connected: boolean) => {
      document.documentElement.dataset.edunixoOnline = connected ? 'true' : 'false';
      window.dispatchEvent(new CustomEvent('edunixo:network-status', { detail: { connected } }));
    };

    try {
      const initial = await Network.getStatus();
      applyNetworkState(Boolean(initial.connected));
      Network.addListener('networkStatusChange', status => applyNetworkState(Boolean(status.connected)));
    } catch (error) {
      console.warn('[EDUNIXO native] Network status listener skipped.', error);
    }

    // Let React paint the secure launcher before dismissing the native splash.
    window.setTimeout(() => { void SplashScreen.hide(); }, 250);
  } catch (error) {
    console.error('[EDUNIXO native] Native bridge could not initialize.', error);
  }
}
