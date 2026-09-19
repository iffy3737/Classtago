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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
