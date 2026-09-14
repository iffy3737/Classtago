export const normalizeAssignmentIdentity = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
export const normalizePersonName = (value: unknown) => normalizeAssignmentIdentity(value)
  .replace(/[.,'’`]/g, ' ')
  .replace(/\b(mr|mrs|miss|ms|dr|prof|shri|smt)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const academicYearKey = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 8 ? `${digits.slice(0, 4)}${digits.slice(-2)}` : digits;
};

export function resolveTeacherAssignmentAliases(input: {
  identity: { userId: string; appUserId?: string; employeeCode?: string; shalarthId?: string; name?: string };
  teacherRow: any;
  localUsers: any[];
  teacherProfiles: any[];
}) {
  const { identity, teacherRow, localUsers, teacherProfiles } = input;
  const normalize = normalizeAssignmentIdentity;
  const normalizeName = normalizePersonName;

  const aliasUsers = (localUsers || []).filter((u:any) => {
    const idMatch = [identity.userId, identity.appUserId, teacherRow.id].filter(Boolean)
      .some(id => String(u.id) === String(id) || String(u.authUserId || '') === String(id));
    const employeeMatch = [identity.employeeCode, teacherRow.employee_id].filter(Boolean)
      .some(v => [u.employeeCode, u.employeeId, u.username].filter(Boolean).some(x => normalize(x) === normalize(v)));
    const shalarthMatch = [identity.shalarthId, teacherRow.shalarth_id].filter(Boolean)
      .some(v => [u.shalarthId, u.username].filter(Boolean).some(x => normalize(x) === normalize(v)));
    const nameMatch = [identity.name, teacherRow.full_name].filter(Boolean).some(v => normalizeName(u.name) === normalizeName(v));
    return Boolean(idMatch || employeeMatch || shalarthMatch || nameMatch);
  });

  const aliasProfiles = (teacherProfiles || []).filter((profile:any) => {
    const idMatch = [identity.userId, identity.appUserId, teacherRow.id].filter(Boolean).some(id => String(profile.id) === String(id));
    const employeeMatch = [identity.employeeCode, teacherRow.employee_id].filter(Boolean).some(v => normalize(profile.employeeId) === normalize(v));
    const shalarthMatch = [identity.shalarthId, teacherRow.shalarth_id].filter(Boolean).some(v => normalize(profile.shalarthId) === normalize(v));
    const nameMatch = [identity.name, teacherRow.full_name].filter(Boolean).some(v => normalizeName(profile.fullName) === normalizeName(v));
    return Boolean(idMatch || employeeMatch || shalarthMatch || nameMatch);
  });

  const acceptedIds = new Set([
    identity.userId, identity.appUserId, teacherRow.id, identity.employeeCode, identity.shalarthId,
    teacherRow.employee_id, teacherRow.shalarth_id,
    ...aliasUsers.flatMap((u:any) => [u.id, u.authUserId, u.employeeCode, u.employeeId, u.shalarthId, u.username]),
    ...aliasProfiles.flatMap((p:any) => [p.id, p.employeeId, p.shalarthId]),
  ].filter(Boolean).map(String));

  const acceptedNames = new Set([
    identity.name, teacherRow.full_name,
    ...aliasUsers.map((u:any) => u.name),
    ...aliasProfiles.map((p:any) => p.fullName),
  ].filter(Boolean).map(normalizeName));

  return { acceptedIds, acceptedNames, aliasUsers, aliasProfiles };
}

export function allocationBelongsToTeacher(row: any, aliases: { acceptedIds: Set<string>; acceptedNames: Set<string> }) {
  const idMatch = row?.teacherId && aliases.acceptedIds.has(String(row.teacherId));
  const nameMatch = row?.teacherName && aliases.acceptedNames.has(normalizePersonName(row.teacherName));
  return Boolean(idMatch || nameMatch);
}

export function allocationIsInCurrentYear(row: any, activeYearKeys: Set<string>) {
  const rowYear = academicYearKey(row?.academicYear);
  return !rowYear || activeYearKeys.size === 0 || activeYearKeys.has(rowYear);
}
