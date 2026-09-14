import { supabase } from './supabase';

export interface AppSchoolContext {
  id: string;
  schoolCode?: string;
  schoolName?: string;
  tagline?: string | null;
}

const APP_SCHOOL_KEY = 'edunixo.app.recentSchool';
const LEGACY_SCHOOL_KEY = 'edunixo.mobile.recentSchool';

export function readAppSchoolContext(): AppSchoolContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(APP_SCHOOL_KEY) || window.localStorage.getItem(LEGACY_SCHOOL_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value?.id) return null;
    return {
      id: String(value.id),
      schoolCode: value.schoolCode ? String(value.schoolCode) : undefined,
      schoolName: value.schoolName ? String(value.schoolName) : undefined,
      tagline: value.tagline || null,
    };
  } catch {
    return null;
  }
}

export function writeAppSchoolContext(school: AppSchoolContext): void {
  if (typeof window === 'undefined' || !school?.id) return;
  try {
    window.localStorage.setItem(APP_SCHOOL_KEY, JSON.stringify(school));
    window.localStorage.removeItem(LEGACY_SCHOOL_KEY);
  } catch {
    // The authenticated cloud membership remains authoritative if browser storage is unavailable.
  }
}

export function clearAppSchoolContext(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(APP_SCHOOL_KEY);
    window.localStorage.removeItem(LEGACY_SCHOOL_KEY);
  } catch {
    // Ignore optional browser storage cleanup failures.
  }
}

/**
 * Resolve the active school without trusting local storage alone. If a selected
 * school is stored, it is validated against the authenticated user's active
 * membership. A single active membership is accepted as a safe fallback.
 */
export async function resolveActiveAppSchoolId(): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const selected = readAppSchoolContext();
  let query = supabase
    .from('user_school_memberships')
    .select('school_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (selected?.id) query = query.eq('school_id', selected.id);
  const { data, error } = await query.limit(2);
  if (error) throw error;

  if (selected?.id && data?.some((row: any) => String(row.school_id) === selected.id)) return selected.id;
  if (data?.length === 1 && data[0]?.school_id) return String(data[0].school_id);
  return null;
}
