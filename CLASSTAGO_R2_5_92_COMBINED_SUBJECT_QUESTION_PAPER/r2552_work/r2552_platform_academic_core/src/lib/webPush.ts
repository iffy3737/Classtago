import { supabase } from './supabase';

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)));
}

async function bearerHeaders(extra: Record<string,string> = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your EDUNIXO session expired. Sign in again.');
  return { Authorization: `Bearer ${data.session.access_token}`, ...extra };
}

export function webPushSupported() {
  return typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getWebPushState() {
  if (!webPushSupported()) return { supported:false, configured:false, permission:'unsupported', subscribed:false } as const;
  const registration = await navigator.serviceWorker.register('/edunixo-sw.js', { scope:'/' });
  const subscription = await registration.pushManager.getSubscription();
  const response = await fetch('/api/push/config', { headers: await bearerHeaders(), cache:'no-store' });
  const payload = await response.json().catch(()=>({}));
  return { supported:true, configured:Boolean(response.ok && payload.configured), permission:Notification.permission, subscribed:Boolean(subscription), publicKey:payload.publicKey || '' };
}

export async function enableWebPush() {
  if (!webPushSupported()) throw new Error('Push notifications are not supported by this browser/device.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  const registration = await navigator.serviceWorker.register('/edunixo-sw.js', { scope:'/' });
  const configResponse = await fetch('/api/push/config', { headers: await bearerHeaders(), cache:'no-store' });
  const config = await configResponse.json().catch(()=>({}));
  if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error || 'Free Web Push keys are not configured on the server yet.');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:base64UrlToUint8Array(config.publicKey) });
  const response = await fetch('/api/push/subscriptions', {
    method:'PUT', headers: await bearerHeaders({'Content-Type':'application/json'}), body:JSON.stringify({ subscription: subscription.toJSON(), userAgent:navigator.userAgent })
  });
  const payload = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(payload.error || 'Push subscription could not be saved.');
  return true;
}

export async function disableWebPush() {
  if (!webPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    try { await fetch('/api/push/subscriptions', { method:'DELETE', headers: await bearerHeaders({'Content-Type':'application/json'}), body:JSON.stringify({ endpoint:subscription.endpoint }) }); } catch {}
    await subscription.unsubscribe().catch(()=>false);
  }
}
