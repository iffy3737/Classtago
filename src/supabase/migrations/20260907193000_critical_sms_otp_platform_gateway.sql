-- EDUNIXO R2.5.65 — Critical SMS Policy + OTP Engine + Platform Super Admin Gateway
-- SMS is deliberately reserved for authentication/security/critical emergencies.
-- Routine notices, homework, attendance, results, timetable and other ordinary
-- communications stay on In-App/WhatsApp/Email unless a future audited policy
-- explicitly elevates a workflow to a critical SMS category.

-- ---------------------------------------------------------------------------
-- 1) School gateway: add an explicit critical-message classification.
-- ---------------------------------------------------------------------------
alter table public.edunixo_sms_gateway_queue
  add column if not exists message_kind text not null default 'legacy';

alter table public.edunixo_sms_gateway_queue
  add column if not exists expires_at timestamptz;

-- Public school-account OTP is queued by the trusted server before the user has
-- an authenticated account, so created_by must allow NULL for those jobs.
alter table public.edunixo_sms_gateway_queue alter column created_by drop not null;

create index if not exists edunixo_sms_gateway_queue_kind_idx
  on public.edunixo_sms_gateway_queue(school_id,message_kind,status,created_at);
create index if not exists edunixo_sms_gateway_queue_expiry_idx
  on public.edunixo_sms_gateway_queue(school_id,status,expires_at) where expires_at is not null;

-- Normalize any R2.5.64 pending jobs into the new policy before Android clients
-- begin claiming them. Routine legacy jobs are stopped instead of silently using
-- the school's SIM allowance.
update public.edunixo_sms_gateway_queue
   set message_kind = case
     when lower(coalesce(source_kind,'')) in ('gateway-test','sms-gateway-test') then 'gateway_test'
     when lower(coalesce(source_kind,'')) like 'otp%' or lower(coalesce(source_kind,'')) like '%-otp%' then 'otp'
     when lower(coalesce(source_kind,'')) like 'security%' then 'security'
     when (lower(coalesce(source_kind,'')) like 'emergency%' or (lower(coalesce(source_kind,''))='communication-message' and lower(coalesce(priority,''))='urgent')) then 'emergency'
     when lower(coalesce(source_kind,'')) like 'critical-confirmation%' then 'critical_confirmation'
     else message_kind
   end
 where message_kind='legacy';

update public.edunixo_sms_gateway_queue
   set status='cancelled',last_error='Cancelled by R2.5.65 critical-SMS policy. Routine communication must use In-App/WhatsApp/Email.',updated_at=now()
 where status='queued' and message_kind='legacy';

-- Replace the authenticated enqueue RPC with a policy-locked version. The
-- signature is intentionally unchanged so R2.5.64 clients remain compatible.
create or replace function public.edunixo_sms_gateway_enqueue_bulk(
  p_school_id uuid,
  p_destinations text[],
  p_message_body text,
  p_priority text default 'normal',
  p_source_kind text default 'communication',
  p_source_id text default null
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer:=0;
  v_priority text:=lower(coalesce(p_priority,'normal'));
  v_source text:=lower(coalesce(nullif(trim(p_source_kind),''),'communication'));
  v_kind text;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway send access denied for this school.';
  end if;
  if nullif(trim(p_message_body),'') is null then raise exception 'SMS message is required.'; end if;
  if v_priority not in ('low','normal','high','urgent') then v_priority:='normal'; end if;

  v_kind := case
    when v_source in ('gateway-test','sms-gateway-test') then 'gateway_test'
    when v_source like 'otp%' or v_source like '%-otp%' then 'otp'
    when v_source like 'security%' or v_source like 'account-security%' then 'security'
    when v_source like 'emergency%' or v_source like 'critical-emergency%' then 'emergency'
    when v_source like 'critical-confirmation%' then 'critical_confirmation'
    else null
  end;

  if v_kind is null then
    raise exception 'SMS is reserved for OTP, security, emergency and explicitly critical confirmation flows. Use In-App/WhatsApp/Email for routine communication.';
  end if;

  insert into public.edunixo_sms_gateway_queue(
    school_id,destination,message_body,priority,status,source_kind,source_id,message_kind,created_by
  )
  select p_school_id, d.destination, left(p_message_body,4000),v_priority,'queued',v_source,p_source_id,v_kind,(select auth.uid())
  from (
    select distinct regexp_replace(raw,'[^0-9+]','','g') as destination
    from unnest(coalesce(p_destinations,array[]::text[])) raw
  ) d
  where length(regexp_replace(d.destination,'\D','','g')) between 10 and 15;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

-- OTP jobs must never be delivered after the OTP has expired. Keep the same
-- R2.5.64 claim signature so the Android client remains backward compatible.
create or replace function public.edunixo_sms_gateway_claim_batch(
  p_school_id uuid,
  p_device_key text,
  p_limit integer default 5
)
returns setof public.edunixo_sms_gateway_queue
language plpgsql
security definer
set search_path=public
as $$
declare v_device public.edunixo_sms_gateway_devices;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then raise exception 'SMS gateway access denied for this school.'; end if;
  select * into v_device from public.edunixo_sms_gateway_devices where school_id=p_school_id and device_key=trim(p_device_key) for update;
  if v_device.id is null then raise exception 'Gateway device is not registered.'; end if;
  if not v_device.is_enabled then return; end if;
  if not v_device.permission_granted then raise exception 'Android SMS permission is not granted.'; end if;

  update public.edunixo_sms_gateway_queue
     set status='cancelled',last_error='OTP expired before SMS delivery.',updated_at=now()
   where school_id=p_school_id and status='queued' and message_kind='otp' and expires_at is not null and expires_at <= now();

  update public.edunixo_sms_gateway_devices set last_seen_at=now(),updated_at=now(),last_error=null where id=v_device.id;
  return query
  with picked as (
    select q.id from public.edunixo_sms_gateway_queue q
    where q.school_id=p_school_id and q.status='queued' and q.attempts < 3
      and (q.expires_at is null or q.expires_at > now())
    order by case q.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,q.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),20))
  )
  update public.edunixo_sms_gateway_queue q
     set status='processing',gateway_device_id=v_device.id,claimed_at=now(),attempts=q.attempts+1,updated_at=now()
    from picked where q.id=picked.id returning q.*;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Platform Super Admin gateway. This is independent of any school and is
--    used for public EDUNIXO registration/demo OTP and platform security OTP.
-- ---------------------------------------------------------------------------
create table if not exists public.edunixo_platform_sms_gateway_devices (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  device_name text not null default 'EDUNIXO Platform Android Gateway',
  platform text not null default 'android',
  app_version text,
  is_enabled boolean not null default false,
  permission_granted boolean not null default false,
  last_seen_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.edunixo_platform_sms_gateway_queue (
  id uuid primary key default gen_random_uuid(),
  destination text not null,
  message_body text not null,
  message_kind text not null default 'otp' check (message_kind in ('otp','security','emergency','critical_confirmation','gateway_test')),
  priority text not null default 'urgent' check (priority in ('low','normal','high','urgent')),
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  gateway_device_id uuid references public.edunixo_platform_sms_gateway_devices(id) on delete set null,
  native_reference text,
  source_kind text,
  source_id text,
  expires_at timestamptz,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.edunixo_platform_sms_gateway_queue add column if not exists expires_at timestamptz;

create index if not exists edunixo_platform_sms_gateway_queue_status_idx
  on public.edunixo_platform_sms_gateway_queue(status,priority,created_at);
create index if not exists edunixo_platform_sms_gateway_devices_health_idx
  on public.edunixo_platform_sms_gateway_devices(is_enabled,last_seen_at desc);

alter table public.edunixo_platform_sms_gateway_devices enable row level security;
alter table public.edunixo_platform_sms_gateway_queue enable row level security;

create or replace function public.edunixo_platform_admin_authorized()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1 from public.platform_admins p
    where p.user_id=(select auth.uid()) and coalesce(p.is_active,true)=true
  );
$$;

revoke all on function public.edunixo_platform_admin_authorized() from public,anon;
grant execute on function public.edunixo_platform_admin_authorized() to authenticated,service_role;

drop policy if exists edunixo_platform_sms_gateway_devices_read on public.edunixo_platform_sms_gateway_devices;
create policy edunixo_platform_sms_gateway_devices_read on public.edunixo_platform_sms_gateway_devices
for select to authenticated using (public.edunixo_platform_admin_authorized());

drop policy if exists edunixo_platform_sms_gateway_queue_read on public.edunixo_platform_sms_gateway_queue;
create policy edunixo_platform_sms_gateway_queue_read on public.edunixo_platform_sms_gateway_queue
for select to authenticated using (public.edunixo_platform_admin_authorized());

create or replace function public.edunixo_platform_sms_gateway_register_device(
  p_device_key text,
  p_device_name text,
  p_app_version text,
  p_permission_granted boolean default false
)
returns public.edunixo_platform_sms_gateway_devices
language plpgsql
security definer
set search_path=public
as $$
declare v_row public.edunixo_platform_sms_gateway_devices;
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway access denied.'; end if;
  if nullif(trim(p_device_key),'') is null then raise exception 'Device key is required.'; end if;
  insert into public.edunixo_platform_sms_gateway_devices(device_key,device_name,app_version,permission_granted,last_seen_at,created_by,updated_at)
  values(trim(p_device_key),coalesce(nullif(trim(p_device_name),''),'EDUNIXO Platform Android Gateway'),nullif(trim(p_app_version),''),coalesce(p_permission_granted,false),now(),(select auth.uid()),now())
  on conflict(device_key) do update set device_name=excluded.device_name,app_version=excluded.app_version,permission_granted=excluded.permission_granted,last_seen_at=now(),updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.edunixo_platform_sms_gateway_set_enabled(
  p_device_key text,
  p_enabled boolean,
  p_permission_granted boolean default false
)
returns public.edunixo_platform_sms_gateway_devices
language plpgsql
security definer
set search_path=public
as $$
declare v_row public.edunixo_platform_sms_gateway_devices;
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway access denied.'; end if;
  update public.edunixo_platform_sms_gateway_devices
     set is_enabled=coalesce(p_enabled,false),permission_granted=coalesce(p_permission_granted,false),last_seen_at=now(),last_error=null,updated_at=now()
   where device_key=trim(p_device_key) returning * into v_row;
  if v_row.id is null then raise exception 'Register this Android device before enabling the Platform SMS gateway.'; end if;
  return v_row;
end;
$$;

create or replace function public.edunixo_platform_sms_gateway_claim_batch(
  p_device_key text,
  p_limit integer default 5
)
returns setof public.edunixo_platform_sms_gateway_queue
language plpgsql
security definer
set search_path=public
as $$
declare v_device public.edunixo_platform_sms_gateway_devices;
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway access denied.'; end if;
  select * into v_device from public.edunixo_platform_sms_gateway_devices where device_key=trim(p_device_key) for update;
  if v_device.id is null then raise exception 'Platform gateway device is not registered.'; end if;
  if not v_device.is_enabled then return; end if;
  if not v_device.permission_granted then raise exception 'Android SMS permission is not granted.'; end if;
  update public.edunixo_platform_sms_gateway_queue set status='cancelled',last_error='OTP expired before SMS delivery.',updated_at=now()
    where status='queued' and message_kind='otp' and expires_at is not null and expires_at <= now();
  update public.edunixo_platform_sms_gateway_devices set last_seen_at=now(),updated_at=now(),last_error=null where id=v_device.id;
  return query
  with picked as (
    select q.id from public.edunixo_platform_sms_gateway_queue q
    where q.status='queued' and q.attempts < 3 and (q.expires_at is null or q.expires_at > now())
    order by case q.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,q.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),20))
  )
  update public.edunixo_platform_sms_gateway_queue q
     set status='processing',gateway_device_id=v_device.id,claimed_at=now(),attempts=q.attempts+1,updated_at=now()
    from picked where q.id=picked.id returning q.*;
end;
$$;

create or replace function public.edunixo_platform_sms_gateway_complete_job(
  p_device_key text,
  p_job_id uuid,
  p_success boolean,
  p_native_reference text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_device_id uuid; v_attempts integer;
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway access denied.'; end if;
  select id into v_device_id from public.edunixo_platform_sms_gateway_devices where device_key=trim(p_device_key);
  if v_device_id is null then raise exception 'Platform gateway device is not registered.'; end if;
  select attempts into v_attempts from public.edunixo_platform_sms_gateway_queue where id=p_job_id and gateway_device_id=v_device_id;
  if v_attempts is null then raise exception 'Platform SMS queue job does not belong to this gateway.'; end if;
  if coalesce(p_success,false) then
    update public.edunixo_platform_sms_gateway_queue set status='sent',native_reference=nullif(trim(p_native_reference),''),last_error=null,sent_at=now(),updated_at=now() where id=p_job_id;
  elsif v_attempts < 3 then
    update public.edunixo_platform_sms_gateway_queue set status='queued',gateway_device_id=null,claimed_at=null,last_error=left(coalesce(nullif(trim(p_error),''),'Native SMS send failed.'),1000),updated_at=now() where id=p_job_id;
  else
    update public.edunixo_platform_sms_gateway_queue set status='failed',last_error=left(coalesce(nullif(trim(p_error),''),'Native SMS send failed.'),1000),updated_at=now() where id=p_job_id;
  end if;
end;
$$;

create or replace function public.edunixo_platform_sms_gateway_heartbeat(
  p_device_key text,
  p_permission_granted boolean,
  p_last_error text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.edunixo_platform_admin_authorized() then return; end if;
  update public.edunixo_platform_sms_gateway_devices
     set permission_granted=coalesce(p_permission_granted,false),last_seen_at=now(),last_error=nullif(trim(p_last_error),''),updated_at=now()
   where device_key=trim(p_device_key);
end;
$$;

grant execute on function public.edunixo_platform_sms_gateway_register_device(text,text,text,boolean) to authenticated;
grant execute on function public.edunixo_platform_sms_gateway_set_enabled(text,boolean,boolean) to authenticated;
grant execute on function public.edunixo_platform_sms_gateway_claim_batch(text,integer) to authenticated;
grant execute on function public.edunixo_platform_sms_gateway_complete_job(text,uuid,boolean,text,text) to authenticated;
grant execute on function public.edunixo_platform_sms_gateway_heartbeat(text,boolean,text) to authenticated;
revoke insert,update,delete on public.edunixo_platform_sms_gateway_devices from anon,authenticated;
revoke insert,update,delete on public.edunixo_platform_sms_gateway_queue from anon,authenticated;
grant select on public.edunixo_platform_sms_gateway_devices to authenticated;
grant select on public.edunixo_platform_sms_gateway_queue to authenticated;

-- ---------------------------------------------------------------------------
-- 3) OTP challenges. Public clients can never read this table directly; only
--    the server service role creates/verifies/consumes challenges.
-- ---------------------------------------------------------------------------
create table if not exists public.edunixo_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  scope_kind text not null check (scope_kind in ('platform','school')),
  school_id uuid references public.schools(id) on delete cascade,
  purpose text not null,
  destination text not null,
  otp_hash text not null,
  context jsonb not null default '{}'::jsonb,
  attempts_remaining integer not null default 5,
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  request_ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists edunixo_otp_challenges_destination_idx
  on public.edunixo_otp_challenges(scope_kind,school_id,purpose,destination,created_at desc);
create index if not exists edunixo_otp_challenges_expiry_idx
  on public.edunixo_otp_challenges(expires_at,consumed_at);

alter table public.edunixo_otp_challenges enable row level security;
revoke all on public.edunixo_otp_challenges from anon,authenticated;
-- service_role bypasses RLS; no public/authenticated policy is intentionally created.
