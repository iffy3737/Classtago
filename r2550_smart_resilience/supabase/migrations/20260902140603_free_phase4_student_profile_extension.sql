create table if not exists public.edunixo_student_profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  gender text null,
  date_of_birth date null,
  address text null,
  father_name text null,
  mother_name text null,
  guardian_name text null,
  guardian_relation text null,
  mobile_number text null,
  alternate_mobile text null,
  source_application_id uuid null references public.school_admission_applications(id) on delete set null,
  updated_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edunixo_student_profiles_school_student_key unique (school_id, student_id)
);

create index if not exists idx_edunixo_student_profiles_student_id on public.edunixo_student_profiles(student_id);
create index if not exists idx_edunixo_student_profiles_source_application on public.edunixo_student_profiles(source_application_id);
create index if not exists idx_edunixo_student_profiles_updated_by on public.edunixo_student_profiles(updated_by_user_id);

alter table public.edunixo_student_profiles enable row level security;
revoke all on table public.edunixo_student_profiles from anon, authenticated;
grant select, insert, update, delete on table public.edunixo_student_profiles to service_role;

comment on table public.edunixo_student_profiles is 'Server-only Phase 4 extension for Student Master profile and guardian fields; students remains the canonical identity/placement record.';
