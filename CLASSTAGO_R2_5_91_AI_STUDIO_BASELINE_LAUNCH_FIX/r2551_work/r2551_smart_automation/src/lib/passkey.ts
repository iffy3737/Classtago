import { supabase } from './supabase';

export const passkeyFeatureEnabled = String((import.meta as any).env?.VITE_EDUNIXO_PASSKEY_ENABLED || '').toLowerCase() === 'true';

export function passkeySupportedOnDevice() {
  return typeof window !== 'undefined' && window.isSecureContext && typeof PublicKeyCredential !== 'undefined';
}

export async function registerCurrentUserPasskey() {
  if (!passkeyFeatureEnabled) throw new Error('Passkey enrollment will be enabled after the final EDUNIXO custom domain is locked.');
  if (!passkeySupportedOnDevice()) throw new Error('This browser/device does not support secure passkeys.');
  const auth: any = supabase.auth as any;
  if (typeof auth.registerPasskey !== 'function') throw new Error('Passkey support is unavailable in this Supabase client.');
  const { data, error } = await auth.registerPasskey();
  if (error) throw error;
  return data;
}

export async function signInWithPasskey() {
  if (!passkeyFeatureEnabled) throw new Error('Passkey sign-in will be enabled after the final EDUNIXO custom domain is locked.');
  if (!passkeySupportedOnDevice()) throw new Error('This browser/device does not support secure passkeys.');
  const auth: any = supabase.auth as any;
  if (typeof auth.signInWithPasskey !== 'function') throw new Error('Passkey support is unavailable in this Supabase client.');
  const { data, error } = await auth.signInWithPasskey();
  if (error) throw error;
  return data;
}
