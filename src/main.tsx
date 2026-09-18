if (typeof window !== 'undefined') {
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = { env: {} };
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary';
import {installMobileRuntime} from './lib/mobileRuntime';
import {installNativeAppRuntime} from './lib/nativeAppRuntime';
import './index.css';

installMobileRuntime();
void installNativeAppRuntime();

// R2.5.98 keyboard guard: mobile WebView auto-focuses some inputs when the
// user taps navigation/menu items, which pops up the on-screen keyboard even
// though the user did not intend to type. This guard blurs any focused input
// on route change and on non-input taps so the keyboard only appears when the
// user explicitly taps into a field.
(() => {
  if (typeof window === 'undefined') return;
  const isTextField = (el: Element | null): boolean => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  };
  const blurIfTextField = () => {
    const active = document.activeElement;
    if (isTextField(active) && active instanceof HTMLElement) {
      try { active.blur(); } catch {}
    }
  };
  // 1) Route/hash change — the app re-renders into a new page.
  window.addEventListener('hashchange', () => setTimeout(blurIfTextField, 0));
  window.addEventListener('popstate', () => setTimeout(blurIfTextField, 0));
  // 2) Any pointerdown NOT on an input/text field will blur active input.
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (isTextField(target)) return;
    blurIfTextField();
  }, true);
  // 3) Any click on a button, link or menu item will blur active input.
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (isTextField(target)) return;
    const clickable = target?.closest('button, a, [role="menuitem"], [role="tab"], [data-nav]');
    if (clickable) blurIfTextField();
  }, true);
  // 4) Global watcher: if any input autofocuses on mount without a real user
  // intent (no recent tap on that field), immediately blur it once.
  let lastPointerOnFieldAt = 0;
  document.addEventListener('pointerdown', (event) => {
    if (isTextField(event.target as Element | null)) lastPointerOnFieldAt = Date.now();
  }, true);
  const observer = new MutationObserver(() => {
    const active = document.activeElement;
    if (isTextField(active) && Date.now() - lastPointerOnFieldAt > 350) {
      try { (active as HTMLElement).blur(); } catch {}
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['autofocus'] });
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
