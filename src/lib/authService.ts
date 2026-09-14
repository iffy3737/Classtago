/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseClientConfigured, LocalERPDatabase } from './supabase';
import { handleSupabaseError, ERPError } from './errorHandler';
import { User, UserRole } from '../types';
import { readAppSchoolContext, writeAppSchoolContext } from './appSchoolContext';

export interface AuthSessionState {
  user: User | null;
  schoolId: string | null;
  loading: boolean;
  error: ERPError | null;
}

const CLOUD_ROLES: UserRole[] = ['headmaster', 'clerk', 'teacher', 'class_teacher', 'student', 'parent', 'peon'];

export class AuthService {
  static normalizeIdentifierToEmail(identifier: string): string {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) return trimmed.toLowerCase();

    const key = trimmed.toLowerCase();
    if (key === 'hm001' || key === 'headmaster') return 'headmaster@school.local';
    return `${key}@school.local`;
  }

  private static async rejectSession(message: string): Promise<{ user: null; schoolId: null; error: ERPError }> {
    await supabase.auth.signOut().catch(() => undefined);
    return { user: null, schoolId: null, error: { message } };
  }

  static async loadUserProfileAndSchool(
    userId: string,
    authEmail?: string,
    expectedSchoolId?: string
  ): Promise<{ user: User | null; schoolId: string | null; error: ERPError | null }> {
    try {
      // Platform Super Admins are global identities. They intentionally do not
      // require a public.users profile or a school membership. Check this
      // mapping before resolving ordinary school users.
      const { data: platformAdmin, error: platformAdminError } = await supabase
        .from('platform_admins')
        .select('user_id, display_name, admin_level, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (platformAdminError && !['42P01', 'PGRST205'].includes(String((platformAdminError as any).code || ''))) {
        return await this.rejectSession(`Platform administrator verification failed: ${platformAdminError.message}`);
      }

      if (platformAdmin?.user_id) {
        if (expectedSchoolId) {
          return await this.rejectSession('Platform Administrator accounts must use the Classtago Platform Admin entrance.');
        }
        const email = authEmail || '';
        const platformUser: User = {
          id: platformAdmin.user_id,
          authUserId: platformAdmin.user_id,
          cloudProvisioned: true,
          name: platformAdmin.display_name || 'Platform Super Admin',
          email,
          role: 'super_admin',
          username: email || platformAdmin.user_id,
          designation: platformAdmin.admin_level || 'super_admin',
          isActive: true,
          status: 'Active',
          mustChangePassword: false
        };

        const safeLocalUser = { ...platformUser };
        delete safeLocalUser.password;
        LocalERPDatabase.saveUser(safeLocalUser);
        return { user: platformUser, schoolId: null, error: null };
      }

      const { data: rpcProfile, error: profileError } = await supabase.rpc(
        'edunixo_current_school_login_profile',
        { p_expected_school_id: expectedSchoolId || null }
      );

      if (profileError) {
        return await this.rejectSession(`Secure ERP profile query failed: ${profileError.message}`);
      }

      const profile = rpcProfile && typeof rpcProfile === 'object' ? rpcProfile as any : null;
      if (!profile?.id) {
        return await this.rejectSession(expectedSchoolId
          ? 'This account does not belong to the selected school. Choose the correct school and try again.'
          : 'Login account exists, but its active ERP school profile is not configured. Contact the Headmaster.');
      }
      if (!profile.is_active || profile.status !== 'Active' || profile.membership_active === false) {
        return await this.rejectSession(`Access denied. Account status is ${profile.status || 'Inactive'}.`);
      }

      const schoolId = String(profile.school_id || '');
      if (!schoolId) {
        return await this.rejectSession('Active school membership was not found. Contact the Headmaster.');
      }

      const existingSchoolContext = readAppSchoolContext();
      writeAppSchoolContext({
        id: schoolId,
        schoolCode: existingSchoolContext?.id === schoolId ? existingSchoolContext.schoolCode : undefined,
        schoolName: existingSchoolContext?.id === schoolId ? existingSchoolContext.schoolName : undefined,
        tagline: existingSchoolContext?.id === schoolId ? existingSchoolContext.tagline : null,
      });

      const profileRole = String(profile.role_name || '').toLowerCase() as UserRole;
      const membershipRole = String(profile.role_in_school || '').toLowerCase() as UserRole;
      if (!CLOUD_ROLES.includes(profileRole) || profileRole !== membershipRole) {
        return await this.rejectSession('The account role and school membership do not match. Contact the Headmaster.');
      }

      const user: User = {
        id: profile.id,
        authUserId: profile.id,
        cloudProvisioned: true,
        name: profile.full_name,
        email: profile.email || authEmail || '',
        role: profileRole,
        phone: profile.phone_number || undefined,
        photoUrl: profile.photo_url || undefined,
        username: profile.username,
        isActive: true,
        status: 'Active',
        mustChangePassword: Boolean(profile.must_change_password),
        shalarthId: profile.shalarth_id || undefined,
        employeeCode: profile.employee_code || undefined,
        grNumber: profile.gr_number || undefined
      };

      // Teachers/Class Teachers must have a canonical Teacher Master row.
      // Clerk is an administrative role and must never require or create a Teacher Master row.
      if (profileRole === 'teacher' || profileRole === 'class_teacher') {
        const staffProfile = profile.staff_profile as any;
        if (!staffProfile?.id || !staffProfile.is_active) {
          return await this.rejectSession('The teacher login is not linked to an active Teacher Master record. Contact the Headmaster.');
        }
        user.shalarthId = staffProfile.shalarth_id || user.shalarthId;
        user.employeeCode = staffProfile.employee_id || user.employeeCode;
        user.designation = staffProfile.designation || undefined;
        user.phone = staffProfile.mobile_number || user.phone;
      }

      if (profileRole === 'student') {
        const studentProfile = profile.student_profile as any;
        if (!studentProfile?.id || !studentProfile.is_active) {
          return await this.rejectSession('The student login is not linked to an active student record.');
        }
        user.grNumber = studentProfile.gr_number;
        user.classId = studentProfile.class_id || undefined;
        user.division = studentProfile.division || undefined;
        user.rollNo = studentProfile.roll_number || undefined;
      }

      // Keep non-sensitive metadata available for the existing offline UI.
      const safeLocalUser = { ...user };
      delete safeLocalUser.password;
      LocalERPDatabase.saveUser(safeLocalUser);

      return { user, schoolId, error: null };
    } catch (error: any) {
      await supabase.auth.signOut().catch(() => undefined);
      return { user: null, schoolId: null, error: handleSupabaseError(error) };
    }
  }

  static async login(
    identifier: string,
    password: string,
    expectedSchoolId?: string
  ): Promise<{ user: User | null; schoolId: string | null; error: ERPError | null }> {
    if (!isSupabaseClientConfigured) {
      return {
        user: null,
        schoolId: null,
        error: { message: 'Supabase is not configured in this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }
      };
    }

    try {
      const email = this.normalizeIdentifierToEmail(identifier);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        return {
          user: null,
          schoolId: null,
          error: { message: 'Invalid User ID or password.' }
        };
      }

      return await this.loadUserProfileAndSchool(data.user.id, data.user.email || email, expectedSchoolId);
    } catch (error: any) {
      return { user: null, schoolId: null, error: handleSupabaseError(error) };
    }
  }

  static async changePasswordSelf(newPassword: string): Promise<{ success: boolean; error: ERPError | null }> {
    try {
      if (newPassword.length < 6 || newPassword.length > 72) {
        return { success: false, error: { message: 'Password must contain 6 to 72 characters.' } };
      }

      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) return { success: false, error: handleSupabaseError(passwordError) };

      const { error: flagError } = await supabase.rpc('complete_password_change');
      if (flagError) return { success: false, error: handleSupabaseError(flagError) };

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: handleSupabaseError(error) };
    }
  }

  static async updateCredentials(
    newEmail?: string,
    newPassword?: string
  ): Promise<{ success: boolean; error: ERPError | null }> {
    if (newEmail) {
      return {
        success: false,
        error: { message: 'Login email is system-managed from the User ID and cannot be changed manually.' }
      };
    }
    if (!newPassword) return { success: true, error: null };
    return await this.changePasswordSelf(newPassword);
  }

  static async restoreSession(): Promise<{ user: User | null; schoolId: string | null; error: ERPError | null }> {
    if (!isSupabaseClientConfigured) return { user: null, schoolId: null, error: null };

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return { user: null, schoolId: null, error: handleSupabaseError(error) };
      if (!session?.user) return { user: null, schoolId: null, error: null };
      const selectedSchoolId = readAppSchoolContext()?.id;
      return await this.loadUserProfileAndSchool(session.user.id, session.user.email || undefined, selectedSchoolId);
    } catch (error: any) {
      return { user: null, schoolId: null, error: handleSupabaseError(error) };
    }
  }

  static async logout(): Promise<{ success: boolean; error: ERPError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return error
        ? { success: false, error: handleSupabaseError(error) }
        : { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: handleSupabaseError(error) };
    }
  }

  static onAuthStateChange(callback: (user: User | null, schoolId: string | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        callback(null, null);
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        const result = await AuthService.loadUserProfileAndSchool(session.user.id, session.user.email || undefined);
        callback(result.user, result.schoolId);
      }
    });
  }
}
