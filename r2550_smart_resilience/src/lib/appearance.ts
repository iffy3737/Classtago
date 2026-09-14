export type EdunixoAppearance = 'light' | 'dark' | 'aurora';

export const APPEARANCE_STORAGE_KEY = 'edunixo.appearance';

export function normalizeAppearance(value: unknown): EdunixoAppearance {
  return value === 'dark' || value === 'aurora' || value === 'light' ? value : 'light';
}

export function readStoredAppearance(): EdunixoAppearance {
  if (typeof window === 'undefined') return 'light';
  return normalizeAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));
}

export function persistAppearance(value: EdunixoAppearance): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, value);
}
