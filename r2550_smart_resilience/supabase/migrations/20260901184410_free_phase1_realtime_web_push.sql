-- EDUNIXO R2.5.45 — FREE Phase 1 foundation
-- ADDITIVE ONLY: no existing business records are deleted or rewritten.
-- Adds server-managed Web Push subscription/delivery tables and enables
-- selected existing RLS-protected tables for Supabase Realtime.

begin;

create table if not exists public.edunixo_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  endpoint_hash text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_edunixo_push_subscriptions_user
  on public.edunixo_push_subscriptions(school_id,user_id,active);

alter table public.edunixo_push_subscriptions enable row level security;
revoke all on public.edunixo_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.edunixo_push_subscriptions to service_role;

create table if not exists public.edunixo_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.edunixo_user_notifications(id) on delete cascade,
  subscription_id uuid not null references public.edunixo_push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id,subscription_id)
);

create index if not exists idx_edunixo_push_deliveries_status
  on public.edunixo_push_deliveries(status,updated_at);

alter table public.edunixo_push_deliveries enable row level security;
revoke all on public.edunixo_push_deliveries from anon, authenticated;
grant select, insert, update, delete on public.edunixo_push_deliveries to service_role;

-- Never drop/recreate the publication. Add only the selected existing tables
-- if they are not already members. Existing RLS remains the authorization gate.
do $$
declare
  t text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array[
      'edunixo_attendance_entries',
      'edunixo_result_subject_lists',
      'edunixo_result_books',
      'edunixo_progress_card_batches',
      'edunixo_user_notifications'
    ] loop
      if to_regclass('public.' || t) is not null
         and not exists(
           select 1 from pg_publication_tables
           where pubname='supabase_realtime' and schemaname='public' and tablename=t
         ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

commit;
