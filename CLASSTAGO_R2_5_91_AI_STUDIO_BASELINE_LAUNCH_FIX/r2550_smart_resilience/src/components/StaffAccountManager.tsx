import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  KeyRound,
  Edit2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X
} from 'lucide-react';
import { User, UserRole } from '../types';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { requestActionConfirm } from '../lib/actionConfirm';

type StaffRole = 'teacher' | 'class_teacher' | 'clerk' | 'peon';

type PasswordDialog = {
  mode: 'migrate' | 'reset';
  staff: User;
};

type StaffMasterOption = {
  id: string;
  userId?: string | null;
  fullName: string;
  shalarthId?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  phone?: string | null;
  isActive?: boolean;
};

const STAFF_ROLES: StaffRole[] = ['teacher', 'class_teacher', 'clerk', 'peon'];

function isStaffRole(role: UserRole): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

function normalizeUsername(value?: string): string {
  const cleaned = (value || '').trim();
  return cleaned.includes('@') ? cleaned.toLowerCase() : cleaned.toUpperCase();
}

function isValidLoginId(value: string): boolean {
  if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return /^[A-Z0-9._-]+$/.test(value);
}

interface StaffAccountManagerProps {
  activeFeatureId?: string | null;
}

const STAFF_FEATURE_COPY: Record<string, { title: string; description: string }> = {
  'staff-account-create': {
    title: 'Create New Staff Login',
    description: 'Create one permanent staff login from Staff Master or enter a genuinely new staff account.'
  },
  'staff-account-pending': {
    title: 'Review Pending Staff Accounts',
    description: 'Review only pending requests, then connect the approved login or reject the request.'
  },
  'link-staff-login': {
    title: 'Link Existing Staff Login',
    description: 'Show only local staff login records that still need a permanent Supabase Auth connection.'
  },
  'staff-account-edit': {
    title: 'Edit Staff Account Details',
    description: 'Edit staff name, role, designation or mobile number without changing the permanent login ID or password.'
  },
  'activate-deactivate-staff-login': {
    title: 'Activate or Deactivate Login',
    description: 'Show only permanent cloud accounts and control their login status.'
  },
  'staff-password-support': {
    title: 'Controlled Password Reset',
    description: 'Show only permanent cloud accounts and securely set a new password.'
  },
  'staff-login-delete': {
    title: 'Delete Login Account Only',
    description: 'Delete only the login account. The Staff Master profile and employment record remain preserved.'
  },
  'staff-role-access': {
    title: 'Role & Access Assignment',
    description: 'Review staff role assignment and edit the role without changing the permanent login ID. Effective permissions still pass through school plan and role-module controls.'
  },
  'staff-account-repair': {
    title: 'Repair / Reconnect Staff Account',
    description: 'Focus on interrupted, local-only or legacy staff accounts that need a verified Supabase Auth connection. Existing working accounts are never replaced automatically.'
  },
  'staff-effective-access': {
    title: 'Effective Access Summary',
    description: 'Read-only access summary combining login status, base role defaults, live role-permission overrides and the school module entitlement boundary.'
  }
};

export default function StaffAccountManager({ activeFeatureId = null }: StaffAccountManagerProps) {
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [staffMasterOptions, setStaffMasterOptions] = useState<StaffMasterOption[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Local' | 'Active' | 'Inactive' | 'Pending' | 'Rejected'>('All');
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<PasswordDialog | null>(null);
  const [dialogPassword, setDialogPassword] = useState('');
  const [dialogConfirmPassword, setDialogConfirmPassword] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('teacher');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');

  const [editStaff, setEditStaff] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('teacher');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Array<{ roleName: string; moduleKey: string; allowed: boolean }>>([]);
  const [entitlementSnapshot, setEntitlementSnapshot] = useState<{ enforced: boolean; accessState: string; moduleKeys: string[] }>({ enforced: false, accessState: 'legacy', moduleKeys: [] });
  const [effectiveAccessByUser, setEffectiveAccessByUser] = useState<Record<string, { available: boolean; role?: string; allowedModuleKeys: string[]; accessState?: string; restrictionReason?: string | null }>>({});

  const getAccessToken = async (): Promise<string> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      throw new Error('Headmaster session expired. Please log in again.');
    }
    return session.access_token;
  };

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    const localStaff = LocalERPDatabase.getUsers().filter((user) => isStaffRole(user.role));

    try {
      const token = await getAccessToken();
      const [accountsResponse, masterResponse, permissionsResponse, entitlementResponse, effectiveAccessResponse] = await Promise.all([
        fetch('/api/admin/staff-accounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/staff-master-options', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/role-permissions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/me/module-entitlements', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/staff-effective-access', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      ]);
      const [data, masterData, permissionsData, entitlementData, effectiveAccessData] = await Promise.all([
        accountsResponse.json(), masterResponse.json(), permissionsResponse.json().catch(() => ({})), entitlementResponse.json().catch(() => ({})), effectiveAccessResponse.json().catch(() => ({}))
      ]);
      if (!accountsResponse.ok || !data.success) {
        throw new Error(data.error || 'Unable to load Supabase staff accounts.');
      }
      if (masterResponse.ok && masterData.success) {
        setStaffMasterOptions((masterData.staffMaster || []) as StaffMasterOption[]);
      } else {
        setStaffMasterOptions([]);
      }
      if (permissionsResponse.ok && permissionsData.success) {
        setRolePermissions((permissionsData.permissions || []).map((row: any) => ({
          roleName: String(row.role_name || row.roleName || '').toLowerCase(),
          moduleKey: String(row.module_key || row.moduleKey || '').toLowerCase(),
          allowed: row.allowed === true
        })));
      } else setRolePermissions([]);
      if (entitlementResponse.ok) {
        setEntitlementSnapshot({
          enforced: entitlementData.enforced === true,
          accessState: String(entitlementData.accessState || (entitlementData.enforced === true ? 'restricted' : 'legacy')),
          moduleKeys: Array.isArray(entitlementData.moduleKeys) ? entitlementData.moduleKeys.map((value: unknown) => String(value).toLowerCase()) : []
        });
      } else setEntitlementSnapshot({ enforced: false, accessState: 'legacy', moduleKeys: [] });

      if (effectiveAccessResponse.ok && effectiveAccessData.success) {
        const matrix: Record<string, { available: boolean; role?: string; allowedModuleKeys: string[]; accessState?: string; restrictionReason?: string | null }> = {};
        for (const row of (effectiveAccessData.access || [])) {
          const userId = String(row.userId || '');
          if (!userId) continue;
          matrix[userId] = {
            available: row.available === true,
            role: row.role ? String(row.role) : undefined,
            allowedModuleKeys: Array.isArray(row.allowedModuleKeys) ? row.allowedModuleKeys.map((value: unknown) => String(value).toLowerCase()) : [],
            accessState: row.accessState ? String(row.accessState) : undefined,
            restrictionReason: row.restrictionReason || null
          };
        }
        setEffectiveAccessByUser(matrix);
      } else setEffectiveAccessByUser({});

      const combined = new Map<string, User>();
      for (const localUser of localStaff) {
        const key = normalizeUsername(localUser.username) || localUser.id;
        combined.set(key, { ...localUser, cloudProvisioned: localUser.cloudProvisioned === true });
      }
      for (const cloudUser of (data.staff || []) as User[]) {
        const key = normalizeUsername(cloudUser.username);
        const localUser = combined.get(key);
        combined.set(key, {
          ...localUser,
          ...cloudUser,
          id: cloudUser.id,
          authUserId: cloudUser.id,
          cloudProvisioned: true,
          cloudSyncedAt: new Date().toISOString(),
          password: undefined
        });
      }

      setStaffUsers(Array.from(combined.values()));
    } catch (error: any) {
      // Local records remain visible so the Headmaster can see what still needs migration.
      setStaffUsers(localStaff.map((user) => ({ ...user, cloudProvisioned: user.cloudProvisioned === true })));
      const localProfiles = LocalERPDatabase.getAcademicSetup().teacherProfiles || [];
      setRolePermissions([]);
      setEntitlementSnapshot({ enforced: false, accessState: 'legacy', moduleKeys: [] });
      setEffectiveAccessByUser({});
      setStaffMasterOptions(localProfiles.map((profile: any) => ({
        id: profile.id,
        userId: null,
        fullName: profile.fullName,
        shalarthId: profile.shalarthId,
        employeeCode: profile.employeeId,
        designation: profile.designation,
        phone: profile.mobileNumber,
        isActive: profile.isActive !== false
      })));
      setMessage({ type: 'error', text: error.message || 'Cloud staff list could not be loaded.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (!activeFeatureId) {
      setShowCreateForm(false);
      setFilterStatus('All');
      return;
    }

    setShowCreateForm(activeFeatureId === 'staff-account-create');
    if (activeFeatureId === 'staff-account-pending') setFilterStatus('Pending');
    else if (activeFeatureId === 'link-staff-login') setFilterStatus('Local');
    else if (activeFeatureId === 'staff-account-repair') setFilterStatus('All');
    else setFilterStatus('All');
  }, [activeFeatureId]);

  const updateLocalAfterProvision = (sourceUser: User, cloudUser: User) => {
    const allUsers = LocalERPDatabase.getUsers();
    const sourceUsername = normalizeUsername(sourceUser.username);
    const index = allUsers.findIndex((item) =>
      item.id === sourceUser.id || normalizeUsername(item.username) === sourceUsername
    );

    const savedUser: User = {
      ...(index >= 0 ? allUsers[index] : sourceUser),
      ...cloudUser,
      id: cloudUser.id,
      authUserId: cloudUser.id,
      email: cloudUser.email,
      username: normalizeUsername(cloudUser.username),
      status: 'Active',
      isActive: true,
      mustChangePassword: false,
      cloudProvisioned: true,
      cloudSyncedAt: new Date().toISOString()
    };
    delete savedUser.password;

    if (index >= 0) allUsers[index] = savedUser;
    else allUsers.push(savedUser);
    LocalERPDatabase.saveUsers(allUsers);
  };

  const callProvision = async (staff: User, password: string) => {
    const token = await getAccessToken();
    const username = normalizeUsername(staff.username || staff.shalarthId || staff.employeeCode);
    const response = await fetch('/api/admin/provision-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: staff.name,
        username,
        password,
        role: staff.role,
        designation: staff.designation,
        phone: staff.phone,
        shalarthId: ['clerk','peon'].includes(staff.role) ? undefined : (staff.shalarthId || username),
        employeeCode: ['clerk','peon'].includes(staff.role) ? (staff.employeeCode || username) : staff.employeeCode
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.error || 'Staff account could not be connected.');
    }

    updateLocalAfterProvision(staff, {
      ...staff,
      ...data.user,
      name: data.user.fullName || staff.name,
      role: data.user.role,
      username: data.user.username,
      email: data.user.email
    });
  };

  const openMigrationDialog = (staff: User) => {
    setMessage(null);
    setPasswordDialog({ mode: 'migrate', staff });
    setDialogPassword(staff.password || '');
    setDialogConfirmPassword(staff.password || '');
  };

  const openResetDialog = (staff: User) => {
    setMessage(null);
    setPasswordDialog({ mode: 'reset', staff });
    setDialogPassword('');
    setDialogConfirmPassword('');
  };

  const submitPasswordDialog = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordDialog) return;
    if (dialogPassword.length < 6 || dialogPassword.length > 72) {
      setMessage({ type: 'error', text: 'Password must contain 6 to 72 characters.' });
      return;
    }
    if (dialogPassword !== dialogConfirmPassword) {
      setMessage({ type: 'error', text: 'Password confirmation does not match.' });
      return;
    }

    const staff = passwordDialog.staff;
    const key = `${passwordDialog.mode}:${staff.id}`;
    setActionKey(key);
    setMessage(null);

    try {
      if (passwordDialog.mode === 'migrate') {
        await callProvision(staff, dialogPassword);
        setMessage({
          type: 'success',
          text: `${staff.name} is now connected to Supabase with the same User ID and password.`
        });
      } else {
        const token = await getAccessToken();
        const response = await fetch('/api/admin/reset-staff-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ staffUserId: staff.authUserId || staff.id, newPassword: dialogPassword })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Password reset failed.');
        setMessage({ type: 'success', text: `Password updated for ${staff.name}.` });
      }

      setPasswordDialog(null);
      setDialogPassword('');
      setDialogConfirmPassword('');
      await loadStaff();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'The account action failed.' });
    } finally {
      setActionKey(null);
    }
  };

  const applyStaffMasterSelection = (masterId: string) => {
    setSelectedMasterId(masterId);
    const selected = staffMasterOptions.find((item) => item.id === masterId);
    if (!selected) return;

    const loginId = normalizeUsername(selected.shalarthId || selected.employeeCode || '');
    const designation = selected.designation || 'Assistant Teacher';
    const inferredRole: StaffRole = /peon|attendant|helper|support\s*staff|office\s*boy/i.test(designation) ? 'peon' : /clerk|office|administrative/i.test(designation) ? 'clerk' : 'teacher';

    setNewName(selected.fullName || '');
    setNewUsername(loginId);
    setNewDesignation(designation);
    setNewPhone(selected.phone || '');
    setNewRole(inferredRole);

    if (selected.userId) {
      setMessage({ type: 'error', text: 'This Staff Master record is already connected to a login account. Use Edit in the staff list instead.' });
    } else {
      setMessage(null);
    }
  };

  const openEditStaff = (staff: User) => {
    setEditStaff(staff);
    setEditName(staff.name || '');
    setEditRole(isStaffRole(staff.role) ? staff.role : 'teacher');
    setEditDesignation(staff.designation || '');
    setEditPhone(staff.phone || '');
    setMessage(null);
  };

  const submitEditStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editStaff) return;
    if (!editName.trim() || !editDesignation.trim()) {
      setMessage({ type: 'error', text: 'Full name and designation are required.' });
      return;
    }

    setActionKey(`edit:${editStaff.id}`);
    setMessage(null);
    try {
      if (editStaff.cloudProvisioned) {
        const token = await getAccessToken();
        const response = await fetch('/api/admin/update-staff-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            staffUserId: editStaff.authUserId || editStaff.id,
            fullName: editName.trim(),
            role: editRole,
            designation: editDesignation.trim(),
            phone: editPhone.trim()
          })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Staff profile update failed.');
      }

      const users = LocalERPDatabase.getUsers();
      const idx = users.findIndex((item) => item.id === editStaff.id || normalizeUsername(item.username) === normalizeUsername(editStaff.username));
      if (idx >= 0) {
        users[idx] = {
          ...users[idx],
          name: editName.trim(),
          role: editRole,
          designation: editDesignation.trim(),
          phone: editPhone.trim() || undefined
        };
        LocalERPDatabase.saveUsers(users);
      }

      const academic = LocalERPDatabase.getAcademicSetup();
      if (academic.teacherProfiles) {
        academic.teacherProfiles = academic.teacherProfiles.map((profile: any) => {
          const matches =
            (editStaff.shalarthId && profile.shalarthId === editStaff.shalarthId) ||
            (editStaff.employeeCode && profile.employeeId === editStaff.employeeCode) ||
            profile.id === editStaff.id;
          return matches ? {
            ...profile,
            fullName: editName.trim(),
            designation: editDesignation.trim(),
            mobileNumber: editPhone.trim()
          } : profile;
        });
        LocalERPDatabase.saveAcademicSetup(academic);
      }

      setEditStaff(null);
      setMessage({ type: 'success', text: `${editName.trim()}'s staff profile was updated. Login ID and password were preserved.` });
      await loadStaff();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Staff profile update failed.' });
    } finally {
      setActionKey(null);
    }
  };

  const createStaffAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    const username = normalizeUsername(newUsername);
    if (!newName.trim() || !username || !newDesignation.trim()) {
      setMessage({ type: 'error', text: 'Name, User ID and designation are required.' });
      return;
    }
    if (!isValidLoginId(username)) {
      setMessage({ type: 'error', text: 'User ID format is invalid.' });
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      setMessage({ type: 'error', text: 'Password must contain 6 to 72 characters.' });
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setMessage({ type: 'error', text: 'Password confirmation does not match.' });
      return;
    }

    const localUser: User = {
      id: `local_staff_${Date.now()}`,
      name: newName.trim(),
      email: `${username.toLowerCase()}@school.local`,
      role: newRole,
      username,
      designation: newDesignation.trim(),
      phone: newPhone.trim() || undefined,
      shalarthId: newRole === 'clerk'
        ? undefined
        : (staffMasterOptions.find((item) => item.id === selectedMasterId)?.shalarthId || username),
      employeeCode: newRole === 'clerk'
        ? (staffMasterOptions.find((item) => item.id === selectedMasterId)?.employeeCode || username)
        : staffMasterOptions.find((item) => item.id === selectedMasterId)?.employeeCode || undefined,
      status: 'Pending',
      isActive: false,
      mustChangePassword: false
    };

    setActionKey('create');
    setMessage(null);
    try {
      await callProvision(localUser, newPassword);
      setMessage({ type: 'success', text: `${newName.trim()} can now log in with User ID ${username} and the password you entered.` });
      setNewName('');
      setNewUsername('');
      setNewDesignation('');
      setNewPhone('');
      setNewPassword('');
      setNewConfirmPassword('');
      setSelectedMasterId('');
      setShowCreateForm(false);
      await loadStaff();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Staff account creation failed.' });
    } finally {
      setActionKey(null);
    }
  };

  const rejectLocalRequest = (staff: User) => {
    const allUsers = LocalERPDatabase.getUsers();
    const index = allUsers.findIndex((item) => item.id === staff.id);
    if (index >= 0) {
      allUsers[index] = { ...allUsers[index], status: 'Rejected', isActive: false };
      LocalERPDatabase.saveUsers(allUsers);
      setMessage({ type: 'success', text: `${staff.name}'s local registration request was rejected.` });
      void loadStaff();
    }
  };

  const setCloudStatus = async (staff: User, active: boolean) => {
    setActionKey(`status:${staff.id}`);
    setMessage(null);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/admin/set-staff-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ staffUserId: staff.authUserId || staff.id, active })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Status update failed.');

      const users = LocalERPDatabase.getUsers();
      const index = users.findIndex((item) => normalizeUsername(item.username) === normalizeUsername(staff.username));
      if (index >= 0) {
        users[index] = { ...users[index], status: data.status, isActive: data.isActive };
        LocalERPDatabase.saveUsers(users);
      }
      setMessage({ type: 'success', text: `${staff.name} is now ${active ? 'active' : 'inactive'}.` });
      await loadStaff();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Status update failed.' });
    } finally {
      setActionKey(null);
    }
  };

  const deleteCloudAccount = async (staff: User) => {
    if (!(await requestActionConfirm({ title: 'Delete login account?', message: `Delete the login account for ${staff.name}? The Staff Master record will be retained.`, confirmLabel: 'Delete Login', tone: 'danger' }))) return;
    setActionKey(`delete:${staff.id}`);
    setMessage(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/staff-account/${encodeURIComponent(staff.authUserId || staff.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Account deletion failed.');

      const remaining = LocalERPDatabase.getUsers().filter(
        (item) => normalizeUsername(item.username) !== normalizeUsername(staff.username)
      );
      LocalERPDatabase.saveUsers(remaining);
      setMessage({ type: 'success', text: `${staff.name}'s login account was deleted.` });
      await loadStaff();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Account deletion failed.' });
    } finally {
      setActionKey(null);
    }
  };

  const deleteLocalAccount = async (staff: User) => {
    if (!(await requestActionConfirm({ title: 'Delete local login record?', message: `Delete the local-only login record for ${staff.name}? This will not delete the Staff Master/profile record.`, confirmLabel: 'Delete Local Record', tone: 'danger' }))) return;

    const remaining = LocalERPDatabase.getUsers().filter((item) =>
      item.id !== staff.id && normalizeUsername(item.username) !== normalizeUsername(staff.username)
    );
    LocalERPDatabase.saveUsers(remaining);
    setMessage({ type: 'success', text: `${staff.name}'s local-only login record was deleted.` });
    void loadStaff();
  };

  const filteredStaff = useMemo(() => staffUsers.filter((staff) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [staff.name, staff.username, staff.shalarthId, staff.employeeCode]
      .some((value) => value?.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    if (activeFeatureId === 'link-staff-login' && staff.cloudProvisioned) return false;
    if (activeFeatureId === 'activate-deactivate-staff-login' && !staff.cloudProvisioned) return false;
    if (activeFeatureId === 'staff-password-support' && !staff.cloudProvisioned) return false;

    if (filterStatus === 'Local') return !staff.cloudProvisioned;
    if (filterStatus === 'Active') return staff.cloudProvisioned && staff.isActive !== false && staff.status === 'Active';
    if (filterStatus === 'Inactive') return staff.cloudProvisioned && staff.isActive === false;
    if (filterStatus === 'Pending') return staff.status === 'Pending';
    if (filterStatus === 'Rejected') return staff.status === 'Rejected';
    return true;
  }), [staffUsers, searchTerm, filterStatus, activeFeatureId]);

  const focusedCopy = activeFeatureId ? STAFF_FEATURE_COPY[activeFeatureId] : null;
  const emptyAccountMessage = filterStatus === 'Pending'
    ? 'No pending staff account requests. Choose All Accounts to review existing linked, active or inactive staff logins.'
    : filterStatus === 'Local'
      ? 'No local-only staff login records matched this search.'
      : 'No staff accounts matched the selected filter or search.';
  const showAccountList = activeFeatureId !== 'staff-account-create' && activeFeatureId !== 'staff-effective-access';
  const showAllActions = !activeFeatureId;
  const accessModuleKeys = ['dashboard','admissions','attendance','fees','results','exams','timetable','library','certificates','communication','payroll','master_data','administration'];
  const defaultRoleAccess: Record<string, string[]> = {
    teacher: ['dashboard','attendance','results','exams','timetable','communication','library','certificates'],
    class_teacher: ['dashboard','admissions','attendance','results','exams','timetable','certificates','communication','library','master_data'],
    clerk: ['dashboard','admissions','attendance','fees','results','certificates','communication','master_data','administration'],
    peon: ['dashboard','attendance','timetable','communication','administration']
  };
  const entitlementKeys = new Set(entitlementSnapshot.moduleKeys);
  const canonicalAccessFor = (staff: User) => effectiveAccessByUser[String(staff.authUserId || staff.id)] || null;
  const effectiveModulesFor = (staff: User) => {
    const canonical = canonicalAccessFor(staff);
    if (canonical?.available) return [...new Set(canonical.allowedModuleKeys)].sort();
    return accessModuleKeys.filter(moduleKey => {
      const role = String(staff.role || 'teacher').toLowerCase();
      const explicit = rolePermissions.find(row => row.roleName === role && row.moduleKey === moduleKey);
      const roleAllowed = explicit ? explicit.allowed : Boolean(defaultRoleAccess[role]?.includes(moduleKey));
      const planAllowed = !entitlementSnapshot.enforced || entitlementSnapshot.accessState === 'legacy' || entitlementKeys.has(moduleKey)
        || (moduleKey === 'master_data' && entitlementKeys.has('staff_management'));
      return staff.cloudProvisioned === true && staff.isActive !== false && staff.status !== 'Rejected' && roleAllowed && planAllowed;
    });
  };

  return (
    <div className="space-y-5 font-sans text-left">
      <section className="erp-feature-panel bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="erp-feature-hero p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">{focusedCopy?.title || 'Manage Staff Accounts'}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">{focusedCopy?.description || 'Create, review, connect, edit, activate, reset or remove staff login accounts without deleting Staff Master records.'}</p>
          </div>
          {!activeFeatureId && (
            <button
              type="button"
              onClick={() => setShowCreateForm((value) => !value)}
              className="erp-primary-action px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Close Form' : 'Create New Staff Login'}
            </button>
          )}
        </div>

        {message && (
          <div className={`m-4 p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={createStaffAccount} className="p-5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Select Existing Staff Master Record
              <select
                value={selectedMasterId}
                onChange={(event) => applyStaffMasterSelection(event.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-normal"
              >
                <option value="">-- Select staff to auto-fill name, ID, role and designation --</option>
                {staffMasterOptions.filter((item) => item.isActive !== false).map((item) => (
                  <option key={item.id} value={item.id} disabled={Boolean(item.userId)}>
                    {item.fullName} — {item.shalarthId || item.employeeCode || 'No ID'} — {item.designation || 'Staff'}{item.userId ? ' (Already connected)' : ''}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] font-normal text-slate-400">Staff Master is the source of truth. You may still enter a genuinely new staff member manually.</span>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Full Name *
              <input value={newName} onChange={(event) => setNewName(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Existing / New User ID *
              <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-normal" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Role *
              <select value={newRole} onChange={(event) => setNewRole(event.target.value as StaffRole)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-normal">
                <option value="teacher">Teacher</option>
                <option value="class_teacher">Class Teacher</option>
                <option value="clerk">Clerk</option>
                <option value="peon">Peon / Support Staff</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Designation *
              <input value={newDesignation} onChange={(event) => setNewDesignation(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Mobile Number
              <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <div />
            <label className="text-xs font-bold text-slate-600">
              Password *
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Confirm Password *
              <input type="password" value={newConfirmPassword} onChange={(event) => setNewConfirmPassword(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button disabled={actionKey === 'create'} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2">
                {actionKey === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create Account
              </button>
            </div>
          </form>
        )}

        {activeFeatureId === 'staff-effective-access' && (
          <div className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-400">School access state</div><div className="mt-1 text-sm font-black capitalize text-slate-900">{entitlementSnapshot.accessState.replaceAll('_',' ')}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-400">Canonical matrices</div><div className="mt-1 text-2xl font-black text-slate-900">{Object.values(effectiveAccessByUser).filter(row=>row.available).length}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-400">Cloud staff accounts</div><div className="mt-1 text-2xl font-black text-slate-900">{staffUsers.filter(row=>row.cloudProvisioned===true).length}</div></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Staff</th><th className="p-3">Role</th><th className="p-3">Login state</th><th className="p-3">Access source</th><th className="p-3">Effective modules</th><th className="p-3">Allowed module keys</th></tr></thead><tbody className="divide-y divide-slate-100">{staffUsers.map(staff=>{const allowed=effectiveModulesFor(staff);const canonical=canonicalAccessFor(staff);return <tr key={`access:${staff.id}`}><td className="p-3"><div className="font-black text-slate-900">{staff.name}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{staff.username||'—'}</div></td><td className="p-3 font-bold capitalize text-slate-700">{String(canonical?.role||staff.role||'teacher').replaceAll('_',' ')}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${staff.cloudProvisioned===true&&staff.isActive!==false?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{staff.cloudProvisioned!==true?'Local only':staff.isActive===false?'Inactive':'Active cloud'}</span></td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${canonical?.available?'bg-indigo-50 text-indigo-700':'bg-slate-100 text-slate-600'}`}>{canonical?.available?'Canonical matrix':'Fallback view'}</span>{canonical?.restrictionReason&&<div className="mt-1 max-w-52 text-[9px] text-amber-700">{canonical.restrictionReason}</div>}</td><td className="p-3"><b className="text-slate-950">{allowed.length}</b></td><td className="p-3 text-[10px] leading-5 text-slate-600">{allowed.length?allowed.join(' · '):'No operational module currently resolves as allowed.'}</td></tr>})}{!staffUsers.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-400">No staff accounts are available.</td></tr>}</tbody></table></div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-950"><ShieldCheck className="mr-2 inline h-4 w-4"/><b>Effective-access rule:</b> cloud accounts use the canonical server-side <span className="font-mono">platform_user_module_access_matrix</span> used by runtime guards. Local-only/fallback rows are clearly labelled and are not presented as canonical access. Feature-level academic assignment scope is still enforced inside the destination module.</div>
          </div>
        )}

        {showAccountList && (<>
        <div className="erp-feature-filters p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search staff name or ID" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs" />
          </div>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
            <option value="All">All Accounts</option>
            <option value="Local">Local Only — Needs Connection</option>
            <option value="Pending">Pending</option>
            <option value="Active">Cloud Active</option>
            <option value="Inactive">Cloud Inactive</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="erp-table-wrap overflow-x-auto">
          <table className="erp-responsive-table w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Staff</th>
                <th className="p-4">Role / ID</th>
                <th className="p-4">Connection</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading staff accounts…</td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">{emptyAccountMessage}</td></tr>
              ) : filteredStaff.map((staff) => {
                const cloud = staff.cloudProvisioned === true;
                const busy = actionKey?.endsWith(staff.id) || false;
                return (
                  <tr key={`${staff.id}:${staff.username}`} className="hover:bg-slate-50/60">
                    <td data-label="Staff" className="p-4">
                      <div className="font-bold text-slate-800">{staff.name}</div>
                      <div className="text-[10px] text-slate-500">{staff.designation || '-'}</div>
                    </td>
                    <td data-label="Role / ID" className="p-4">
                      <div className="font-bold capitalize text-slate-700">{staff.role.replace('_', ' ')}</div>
                      <div className="font-mono text-[10px] mt-1">{staff.username}</div>
                    </td>
                    <td data-label="Connection" className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${cloud ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                        {cloud ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                        {cloud ? 'Supabase Connected' : 'Local Only'}
                      </span>
                    </td>
                    <td data-label="Status" className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        staff.status === 'Active' && staff.isActive !== false ? 'bg-emerald-100 text-emerald-700' :
                        staff.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        staff.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>{staff.status || (staff.isActive === false ? 'Inactive' : 'Active')}</span>
                    </td>
                    <td data-label="Actions" className="p-4">
                      <div className="erp-row-actions flex flex-wrap justify-end gap-2">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : !cloud ? (
                          <>
                            {(showAllActions || activeFeatureId === 'staff-account-edit' || activeFeatureId === 'staff-role-access') && (
                              <button type="button" onClick={() => openEditStaff(staff)} className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Edit2 className="w-3 h-3" />Edit</button>
                            )}
                            {(showAllActions || activeFeatureId === 'staff-account-pending' || activeFeatureId === 'link-staff-login' || activeFeatureId === 'staff-account-repair') && (
                              <button type="button" onClick={() => openMigrationDialog(staff)} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <Cloud className="w-3 h-3" /> Connect Same ID & Password / Repair
                              </button>
                            )}
                            {(showAllActions || activeFeatureId === 'staff-account-pending') && staff.status === 'Pending' && (
                              <button type="button" onClick={() => rejectLocalRequest(staff)} className="px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-bold">Reject</button>
                            )}
                            {(showAllActions || activeFeatureId === 'staff-login-delete') && (
                              <button type="button" onClick={() => deleteLocalAccount(staff)} className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />Delete Local Record
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {(showAllActions || activeFeatureId === 'staff-account-repair') && (
                              <button type="button" onClick={() => openMigrationDialog(staff)} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Cloud className="w-3 h-3" />Repair Link</button>
                            )}
                            {(showAllActions || activeFeatureId === 'staff-account-edit' || activeFeatureId === 'staff-role-access') && (
                              <button type="button" onClick={() => openEditStaff(staff)} className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Edit2 className="w-3 h-3" />Edit</button>
                            )}
                            {(showAllActions || activeFeatureId === 'staff-password-support') && (
                              <button type="button" onClick={() => openResetDialog(staff)} className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><KeyRound className="w-3 h-3" />Password</button>
                            )}
                            {(showAllActions || activeFeatureId === 'activate-deactivate-staff-login') && (staff.isActive === false ? (
                              <button type="button" onClick={() => void setCloudStatus(staff, true)} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Power className="w-3 h-3" />Activate</button>
                            ) : (
                              <button type="button" onClick={() => void setCloudStatus(staff, false)} className="px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><PowerOff className="w-3 h-3" />Deactivate</button>
                            ))}
                            {(showAllActions || activeFeatureId === 'staff-login-delete') && (
                              <button type="button" onClick={() => void deleteCloudAccount(staff)} className="px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete Login</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>)}
      </section>

      {editStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitEditStaff} className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-900">Edit Staff Profile</h4>
                <p className="text-xs text-slate-500 mt-1">User ID {editStaff.username} and the existing password will not change.</p>
              </div>
              <button type="button" onClick={() => setEditStaff(null)} className="p-1.5 bg-white border border-slate-200 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                Full Name *
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Role *
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as StaffRole)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-normal">
                  <option value="teacher">Teacher</option>
                  <option value="class_teacher">Class Teacher</option>
                  <option value="clerk">Clerk</option>
                  <option value="peon">Peon / Support Staff</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Designation *
                <input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                Mobile Number
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button type="button" onClick={() => setEditStaff(null)} className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-bold">Cancel</button>
              <button disabled={actionKey === `edit:${editStaff.id}`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2">
                {actionKey === `edit:${editStaff.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitPasswordDialog} className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-900">
                  {passwordDialog.mode === 'migrate' ? 'Connect Existing Login' : 'Set New Password'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {passwordDialog.mode === 'migrate'
                    ? `Enter the existing password for ${passwordDialog.staff.username}. The same ID and password will be used in Supabase.`
                    : `Set the new password for ${passwordDialog.staff.username}.`}
                </p>
              </div>
              <button type="button" onClick={() => setPasswordDialog(null)} className="p-1.5 bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-xs font-bold text-slate-600">
              Password
              <input type="password" autoComplete="new-password" value={dialogPassword} onChange={(event) => setDialogPassword(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Confirm Password
              <input type="password" autoComplete="new-password" value={dialogConfirmPassword} onChange={(event) => setDialogConfirmPassword(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-normal" />
            </label>
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              The password is transmitted only to the protected server and Supabase Auth. It is not saved in public database tables or audit logs.
            </p>
            <button disabled={actionKey !== null} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {actionKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {passwordDialog.mode === 'migrate' ? 'Connect Account Permanently' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
