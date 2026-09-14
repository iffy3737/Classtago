/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function validateSupabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleaned = rawUrl.trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned === 'undefined' || cleaned === 'null') return null;
  
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      new URL(cleaned);
      return cleaned;
    } catch {
      return null;
    }
  }
  if (cleaned.includes('.')) {
    try {
      const prefixed = `https://${cleaned}`;
      new URL(prefixed);
      return prefixed;
    } catch {
      return null;
    }
  }
  return null;
}

const rawUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL;
// Prefer Supabase's current server-side secret key (sb_secret_...).
// Keep the legacy service_role variable as a backward-compatible fallback.
const rawServiceKey = process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ROLE_KEY;

const validUrl = validateSupabaseUrl(rawUrl);
const validKey = rawServiceKey && rawServiceKey.trim().length > 20 ? rawServiceKey.trim().replace(/^["']|["']$/g, '') : null;

export const isServiceRoleAvailable = Boolean(validUrl && validKey);

export const supabaseAdmin: SupabaseClient | null = isServiceRoleAvailable
  ? createClient(validUrl!, validKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;


