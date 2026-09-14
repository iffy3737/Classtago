-- EDUNIXO R2.5.65 — Platform Demo Lead Follow-up Desk
-- Every verified platform registration/demo request is retained for Super Admin
-- follow-up. Public users never receive read/update/delete access to this table.

create table if not exists public.platform_institution_leads (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  interest_type text not null check (interest_type in ('registration','demo')),
  lead_source_kind text not null default 'institution_registration',
  institution_name text not null,
  institution_type text not null default 'School',
  city text,
  state text,
  country text not null default 'India',
  contact_name text not null,
  designation text,
  mobile text not null,
  email text not null,
  student_count integer,
  staff_count integer,
  preferred_language_code text not null default 'en',
  requested_modules text[] not null default array[]::text[],
  message text,
  consent_confirmed boolean not null default false,
  source_page text,
  user_agent text,
  status text not null default 'new',
  last_follow_up_note text,
  last_follow_up_at timestamptz,
  next_follow_up_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing deployments may already have the Batch-6 lead table. Add only the
-- new follow-up fields in that case.
alter table public.platform_institution_leads add column if not exists lead_source_kind text not null default 'institution_registration';
alter table public.platform_institution_leads add column if not exists last_follow_up_note text;
alter table public.platform_institution_leads add column if not exists last_follow_up_at timestamptz;
alter table public.platform_institution_leads add column if not exists next_follow_up_at timestamptz;
alter table public.platform_institution_leads add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.platform_institution_leads add column if not exists updated_at timestamptz not null default now();

create index if not exists platform_institution_leads_demo_idx
  on public.platform_institution_leads(lead_source_kind,status,created_at desc);
create index if not exists platform_institution_leads_mobile_idx
  on public.platform_institution_leads(mobile,created_at desc);
create index if not exists platform_institution_leads_followup_idx
  on public.platform_institution_leads(next_follow_up_at) where next_follow_up_at is not null;

alter table public.platform_institution_leads enable row level security;

-- Server-side public intake writes through the service role. Platform Admin UI
-- also goes through authenticated server endpoints. Do not expose the CRM table
-- directly to anon/authenticated browser clients.
revoke all on table public.platform_institution_leads from anon, authenticated;
grant all on table public.platform_institution_leads to service_role;
