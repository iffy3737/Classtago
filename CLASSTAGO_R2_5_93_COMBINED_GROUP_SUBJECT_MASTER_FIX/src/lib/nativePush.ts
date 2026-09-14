import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from './supabase';

interface NativePushContract {
  getState(): Promise<{ native:boolean; firebaseConfigured:boolean; notificationPermission:boolean }>;
  getToken(): Promise<{ token:string; notificationPermission:boolean }>;
}
const EdunixoPush = registerPlugin<NativePushContract>('EdunixoPush');

async function bearerHeaders(extra: Record<string,string> = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your Classtago session expired. Sign in again.');
  return { Authorization:`Bearer ${data.session.access_token}`, ...extra };
}

export async function getNativePushState() {
  if (!Capacitor.isNativePlatform()) return { native:false, firebaseConfigured:false, notificationPermission:false, serverConfigured:false, registered:false };
  const local = await EdunixoPush.getState().catch(() => ({ native:true, firebaseConfigured:false, notificationPermission:false }));
  let serverConfigured = false;
  try {
    const response = await fetch('/api/push/native/config', { headers: await bearerHeaders(), cache:'no-store' });
    const payload = await response.json().catch(() => ({}));
    serverConfigured = Boolean(response.ok && payload.configured);
  } catch {}
  return { ...local, serverConfigured, registered:false };
}

export async function enableNativePush() {
  if (!Capacitor.isNativePlatform()) throw new Error('Native Android push is only available inside the Classtago Android app.');
  const local = await EdunixoPush.getToken();
  if (!local.token) throw new Error('Android push token was empty.');
  const response = await fetch('/api/push/native/tokens', {
    method:'PUT',
    headers: await bearerHeaders({ 'Content-Type':'application/json' }),
    body: JSON.stringify({ token:local.token, platform:'android', deviceModel:navigator.userAgent })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Native Android push could not be registered.');
  return { token:local.token, registered:true };
}

export async function disableNativePush(token?: string) {
  if (!Capacitor.isNativePlatform()) return;
  let current = token || '';
  if (!current) {
    try { current = (await EdunixoPush.getToken()).token || ''; } catch {}
  }
  if (!current) return;
  await fetch('/api/push/native/tokens', {
    method:'DELETE',
    headers: await bearerHeaders({ 'Content-Type':'application/json' }),
    body:JSON.stringify({ token:current })
  }).catch(() => undefined);
}
