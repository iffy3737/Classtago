export type ProfileCompletionSnapshot = {
  fullName?: unknown;
  phone?: unknown;
  photoUrl?: unknown;
  gender?: unknown;
  dob?: unknown;
  address?: unknown;
  motherTongue?: unknown;
  designation?: unknown;
  qualification?: unknown;
  joiningDate?: unknown;
};

const clean = (value: unknown) => String(value ?? '').trim();

export const TEACHER_REQUIRED_PROFILE_FIELDS: Array<{ key: keyof ProfileCompletionSnapshot; label: string }> = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'phone', label: 'Mobile Number' },
  { key: 'photoUrl', label: 'Profile Photo' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'address', label: 'Residential Address' },
  { key: 'motherTongue', label: 'Mother Tongue' },
  { key: 'designation', label: 'Designation' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'joiningDate', label: 'Joining Date' },
];

export function teacherProfileMissingFields(profile: ProfileCompletionSnapshot | null | undefined): string[] {
  if (!profile) return TEACHER_REQUIRED_PROFILE_FIELDS.map(item => item.label);
  return TEACHER_REQUIRED_PROFILE_FIELDS.filter(item => !clean(profile[item.key])).map(item => item.label);
}

export function isTeacherProfileComplete(profile: ProfileCompletionSnapshot | null | undefined): boolean {
  return teacherProfileMissingFields(profile).length === 0;
}
