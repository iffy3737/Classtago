import { supabase } from '../../../lib/supabase';

// Parent ERP owns the Supabase connection. This module never creates a second
// client and never stores operational data in browser persistence.
export const isSupabaseConfigured = true;

export function requireSupabase() {
  if (!supabase) throw new Error('Classtago cloud connection is unavailable.');
  return supabase;
}
