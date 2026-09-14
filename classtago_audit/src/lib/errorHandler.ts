/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ERPError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  isOffline?: boolean;
  isPermissionDenied?: boolean;
}

export function handleSupabaseError(error: any): ERPError {
  if (!error) {
    return { message: 'An unknown error occurred.' };
  }

  // Check offline / network error
  if (!navigator.onLine || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return {
      message: 'Network error or offline mode detected. Please check your internet connection.',
      isOffline: true,
      hint: 'Your local changes will sync when your internet connection is restored.'
    };
  }

  const code = error.code || error.status || '';
  const message = error.message || 'Database operation failed.';
  const details = error.details || '';
  const hint = error.hint || '';

  // Permission denied (RLS failure or SQL privilege restriction)
  if (code === '42501' || error.status === 403 || message?.toLowerCase().includes('permission denied') || message?.toLowerCase().includes('row-level security')) {
    return {
      message: 'Access Denied: You do not have permission to perform this action.',
      code: '42501',
      details,
      hint: 'Ensure your user account is assigned the appropriate role and school membership.',
      isPermissionDenied: true
    };
  }

  // Unique constraint violation
  if (code === '23505') {
    return {
      message: 'Duplicate Record: A record with this unique value already exists.',
      code,
      details,
      hint: 'Please check for existing entries before submitting.'
    };
  }

  // Foreign key constraint violation
  if (code === '23503') {
    return {
      message: 'Invalid Reference: The related record could not be found or has dependent references.',
      code,
      details,
      hint
    };
  }

  return {
    message,
    code,
    details,
    hint
  };
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt > retries) {
        throw handleSupabaseError(err);
      }
      await new Promise(res => setTimeout(res, delayMs * attempt));
    }
  }
  throw new Error('Operation failed after retries.');
}
