create table if not exists public.edunixo_smart_automation_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  rule_key text not null,
  enabled boolean not null default false,
  cadence_minutes integer not null default 1440 check (cadence_minutes between 15 and 10080),
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz null,
  last_status text null,
  created_by_user_id uuid null references public.users(id) on delete set null,
  updated_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edunixo_smart_automation_rules_school_rule_key unique (school_id, rule_key)
);
create index if not exists idx_edunixo_smart_automation_rules_due on public.edunixo_smart_automation_rules(enabled, last_run_at);
create index if not exists idx_edunixo_smart_automation_rules_school on public.edunixo_smart_automation_rules(school_id, enabled);
alter table public.edunixo_smart_automation_rules enable row level security;
revoke all on table public.edunixo_smart_automation_rules from anon, authenticated;
grant select, insert, update, delete on table public.edunixo_smart_automation_rules to service_role;

create table if not exists public.edunixo_smart_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.edunixo_smart_automation_rules(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  run_key text not null,
  trigger_kind text not null default 'scheduled' check (trigger_kind in ('scheduled','manual_preview','manual_notify')),
  status text not null default 'running' check (status in ('running','completed','failed','skipped')),
  findings_count integer not null default 0 check (findings_count >= 0),
  notifications_created integer not null default 0 check (notifications_created >= 0),
  summary jsonb not null default '{}'::jsonb,
  error_message text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint edunixo_smart_automation_runs_rule_run_key unique (rule_id, run_key)
);
create index if not exists idx_edunixo_smart_automation_runs_school_started on public.edunixo_smart_automation_runs(school_id, started_at desc);
create index if not exists idx_edunixo_smart_automation_runs_rule_started on public.edunixo_smart_automation_runs(rule_id, started_at desc);
alter table public.edunixo_smart_automation_runs enable row level security;
revoke all on table public.edunixo_smart_automation_runs from anon, authenticated;
grant select, insert, update, delete on table public.edunixo_smart_automation_runs to service_role;

comment on table public.edunixo_smart_automation_rules is 'Server-only opt-in deterministic smart automation rules. Rules are disabled by default.';
comment on table public.edunixo_smart_automation_runs is 'Server-only deduplicated execution/audit history for smart automation rules.';
