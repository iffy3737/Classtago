/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface AcademicYearRecord {
  id: string;
  yearCode: string;
  isActive: boolean;
  isLocked: boolean;
}

export class AcademicYearService {
  /**
   * Get all academic years
   */
  static async getAcademicYears(): Promise<{ data: AcademicYearRecord[]; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('year_code', { ascending: false });

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: AcademicYearRecord[] = (data || []).map((ay: any) => ({
        id: ay.id,
        yearCode: ay.year_code,
        isActive: ay.is_active || false,
        isLocked: ay.is_locked || false
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Get active academic year
   */
  static async getActiveAcademicYear(): Promise<{ data: AcademicYearRecord | null; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        return { data: null, error: handleSupabaseError(error) };
      }

      if (!data) {
        return { data: null, error: null };
      }

      const formatted: AcademicYearRecord = {
        id: data.id,
        yearCode: data.year_code,
        isActive: data.is_active || false,
        isLocked: data.is_locked || false
      };

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: handleSupabaseError(err) };
    }
  }
}
