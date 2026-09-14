import React, { useEffect, useRef } from 'react';
import { IS_EDUNIXO_NATIVE_APP } from '../lib/mobileRuntime';
import { loadPlatformSmsGatewaySnapshot, processPlatformSmsGatewayQueue } from '../lib/platformSmsGateway';

export default function PlatformSmsGatewayRuntime({ enabledForRole }: { enabledForRole: boolean }) {
  const busyRef = useRef(false);
  useEffect(() => {
    if (!IS_EDUNIXO_NATIVE_APP || !enabledForRole) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || busyRef.current || document.visibilityState === 'hidden') return;
      busyRef.current = true;
      try {
        const snapshot = await loadPlatformSmsGatewaySnapshot();
        if (snapshot.device?.is_enabled && snapshot.permissionGranted && snapshot.telephonyAvailable) {
          await processPlatformSmsGatewayQueue(6);
        }
      } catch (error) {
        console.warn('[Classtago Platform SMS/OTP Gateway] cycle skipped.', error);
      } finally { busyRef.current = false; }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 8_000);
    const visibility = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [enabledForRole]);
  return null;
}
