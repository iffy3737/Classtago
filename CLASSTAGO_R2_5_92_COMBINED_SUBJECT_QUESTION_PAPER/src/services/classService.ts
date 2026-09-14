/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { handleSupabaseError, ERPError } from '../lib/errorHandler';

export interface ClassRecord {
  id: string;
  className: string;
  classNumeric: number;
  isActive: boolean;
}

export interface DivisionRecord {
  id: string;
  divisionName: string;
  isActive: boolean;
}

export class ClassService {
  /**
   * Get list of classes
   */
  static async getClasses(): Promise<{ data: ClassRecord[]; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('class_numeric', { ascending: true });

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: ClassRecord[] = (data || []).map((c: any) => ({
        id: c.id,
        className: c.class_name,
        classNumeric: c.class_numeric,
        isActive: c.is_active || true
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }

  /**
   * Get list of divisions
   */
  static async getDivisions(): Promise<{ data: DivisionRecord[]; error: ERPError | null }> {
    try {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('division_name', { ascending: true });

      if (error) {
        return { data: [], error: handleSupabaseError(error) };
      }

      const formatted: DivisionRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        divisionName: d.division_name,
        isActive: d.is_active || true
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: handleSupabaseError(err) };
    }
  }
}
