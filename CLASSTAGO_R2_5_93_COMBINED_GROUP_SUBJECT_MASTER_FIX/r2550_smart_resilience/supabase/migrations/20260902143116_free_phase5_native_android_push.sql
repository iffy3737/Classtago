create table if not exists public.edunixo_native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null default 'android' check (platform in ('android')),
  token text not null,
  token_hash text not null unique,
  device_model text null,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_edunixo_native_push_tokens_user on public.edunixo_native_push_tokens(school_id,user_id,active);
create index if not exists idx_edunixo_native_push_tokens_user_id on public.edunixo_native_push_tokens(user_id);
alter table public.edunixo_native_push_tokens enable row level security;
revoke all on table public.edunixo_native_push_tokens from anon, authenticated;
grant select, insert, update, delete on table public.edunixo_native_push_tokens to service_role;

create table if not exists public.edunixo_native_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.edunixo_user_notifications(id) on delete cascade,
  token_id uuid not null references public.edunixo_native_push_tokens(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edunixo_native_push_deliveries_notification_token_key unique(notification_id,token_id)
);
create index if not exists idx_edunixo_native_push_deliveries_status on public.edunixo_native_push_deliveries(status,updated_at);
create index if not exists idx_edunixo_native_push_deliveries_token on public.edunixo_native_push_deliveries(token_id);
alter table public.edunixo_native_push_deliveries enable row level security;
revoke all on table public.edunixo_native_push_deliveries from anon, authenticated;
grant select, insert, update, delete on table public.edunixo_native_push_deliveries to service_role;

comment on table public.edunixo_native_push_tokens is 'Server-only FCM Android device tokens for free native EDUNIXO push.';
comment on table public.edunixo_native_push_deliveries is 'Server-only native FCM delivery deduplication and retry audit.';
