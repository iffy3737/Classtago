import React, { useEffect, useRef } from 'react';
import { IS_EDUNIXO_NATIVE_APP } from '../lib/mobileRuntime';
import { loadSmsGatewaySnapshot, processSmsGatewayQueue } from '../lib/smsGateway';

/**
 * Native school-office queue runner. It never asks for SMS permission by itself;
 * an authorized Headmaster/Clerk must explicitly enable the gateway first.
 */
export default function SmsGatewayRuntime({ enabledForRole }: { enabledForRole: boolean }) {
  const busyRef = useRef(false);

  useEffect(() => {
    if (!IS_EDUNIXO_NATIVE_APP || !enabledForRole) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || busyRef.current || document.visibilityState === 'hidden') return;
      busyRef.current = true;
      try {
        const snapshot = await loadSmsGatewaySnapshot();
        if (snapshot.device?.is_enabled && snapshot.permissionGranted && snapshot.telephonyAvailable) {
          await processSmsGatewayQueue(5);
        }
      } catch (error) {
        // Schema may not be installed yet during rollout; keep this background
        // runtime silent and expose actionable errors in the Gateway control UI.
        console.warn('[Classtago SMS Gateway] queue cycle skipped.', error);
      } finally {
        busyRef.current = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 15_000);
    const visibility = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabledForRole]);

  return null;
}
