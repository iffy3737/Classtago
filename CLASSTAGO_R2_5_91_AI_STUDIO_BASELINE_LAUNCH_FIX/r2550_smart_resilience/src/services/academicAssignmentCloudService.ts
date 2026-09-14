import { LocalERPDatabase, supabase } from '../lib/supabase';
import type { MasterAcademicSetup } from '../types';

type AssignmentCloudPayload = {
  initialized: boolean;
  academicYearId?: string;
  academicYear?: string;
  subjectAllocations: any[];
  classTeacherAssignments: any[];
};

function normalizePayload(payload: any): AssignmentCloudPayload {
  const value = payload && typeof payload === 'object' ? payload : {};
  return {
    initialized: value.initialized === true,
    academicYearId: value.academicYearId ? String(value.academicYearId) : undefined,
    academicYear: value.academicYear ? String(value.academicYear) : undefined,
    subjectAllocations: Array.isArray(value.subjectAllocations) ? value.subjectAllocations : [],
    classTeacherAssignments: Array.isArray(value.classTeacherAssignments) ? value.classTeacherAssignments : [],
  };
}

async function loadRpc(): Promise<AssignmentCloudPayload> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.id) throw new Error('Academic Assignment cloud sync requires an active login session.');
  const { data, error } = await supabase.rpc('edunixo_academic_assignments_load_r81');
  if (error) throw new Error(error.message || 'Academic Assignment cloud mapping could not be loaded.');
  return normalizePayload(data);
}

const identityNorm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

function enrichTeacherIdentity(setup: MasterAcademicSetup, assignment: any) {
  const localUsers = LocalERPDatabase.getUsers();
  const profiles = setup.teacherProfiles || [];
  const teacherId = String(assignment?.teacherId || '').trim();
  const teacherName = identityNorm(assignment?.teacherName);

  const directUser = localUsers.find((user: any) =>
    [user?.id, user?.authUserId].some((id) => id && String(id) === teacherId)
  );
  const uniqueNameUsers = localUsers.filter((user: any) => teacherName && identityNorm(user?.name) === teacherName);
  const nameUser = uniqueNameUsers.length === 1 ? uniqueNameUsers[0] : undefined;
  const user = directUser || nameUser;

  const directProfile = profiles.find((profile: any) => profile?.id && String(profile.id) === teacherId);
  const linkedProfile = profiles.find((profile: any) =>
    (user?.shalarthId && profile?.shalarthId === user.shalarthId) ||
    (user?.employeeCode && profile?.employeeId === user.employeeCode)
  );
  const uniqueNameProfiles = profiles.filter((profile: any) => teacherName && identityNorm(profile?.fullName) === teacherName);
  const nameProfile = uniqueNameProfiles.length === 1 ? uniqueNameProfiles[0] : undefined;
  const profile = directProfile || linkedProfile || nameProfile;

  return {
    ...assignment,
    teacherAuthUserId: user?.authUserId || (user?.cloudProvisioned ? user?.id : undefined),
    teacherUsername: user?.username || undefined,
    teacherShalarthId: user?.shalarthId || profile?.shalarthId || undefined,
    teacherEmployeeId: user?.employeeCode || profile?.employeeId || undefined,
    teacherProfileId: profile?.id || undefined,
    teacherProfileName: profile?.fullName || undefined,
  };
}

async function syncRpc(setup: MasterAcademicSetup): Promise<AssignmentCloudPayload> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.id) throw new Error('Headmaster login session is not available for Academic Assignment sync.');
  const subjectAllocations = (setup.subjectAllocations || []).map((row: any) => enrichTeacherIdentity(setup, row));
  const classTeacherAssignments = (setup.classTeacherAssignments || []).map((row: any) => enrichTeacherIdentity(setup, row));
  const { data, error } = await supabase.rpc('edunixo_academic_assignments_sync_r82', {
    p_subject_allocations: subjectAllocations,
    p_class_teacher_assignments: classTeacherAssignments,
  });
  if (error) throw new Error(error.message || 'Academic Assignment cloud synchronization failed.');
  return normalizePayload(data);
}

export const AcademicAssignmentCloudService = {
  // R8.1 deliberately uses authenticated Supabase RPC instead of the Express service-role
  // route. This works in AI Studio Preview and the deployed site with the same Headmaster
  // login session and removes environment-specific service-role dependency.
  load: loadRpc,
  sync: syncRpc,

  // One-time Headmaster migration: only upload the existing browser snapshot when the
  // canonical current-year cloud mapping has not been initialized yet. Once initialized,
  // cloud is authoritative in every browser/origin.
  async bootstrap(localSetup: MasterAcademicSetup): Promise<AssignmentCloudPayload> {
    const cloud = await loadRpc();
    const localSubjects = localSetup.subjectAllocations || [];
    const localClasses = localSetup.classTeacherAssignments || [];

    // R15.2 persistence rule: once the server has written the successful sync marker,
    // Supabase is authoritative even when the current mapping is intentionally empty.
    // Never repopulate a deliberately deleted cloud assignment from a stale browser cache.
    if (cloud.initialized) return cloud;
    if (!localSubjects.length && !localClasses.length) return cloud;
    return syncRpc(localSetup);
  },

  async deleteAssignment(kind: 'subject' | 'class_teacher', assignment: any): Promise<AssignmentCloudPayload> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.id) throw new Error('Headmaster login session is required to delete an Academic Assignment.');
    const cloudId = String(assignment?.cloudId || '').trim();
    const legacySourceId = String(assignment?.id || '').trim();
    if (!cloudId && !legacySourceId) throw new Error('The selected Academic Assignment has no stable cloud identity. Reload the mapping and try again.');

    const { data, error } = await supabase.rpc('edunixo_academic_assignment_delete_r152', {
      p_assignment_kind: kind,
      p_assignment_id: cloudId || null,
      p_legacy_source_id: legacySourceId || null,
    });
    if (error) throw new Error(error.message || 'Academic Assignment could not be permanently deleted from the cloud.');
    return normalizePayload(data);
  },
};
