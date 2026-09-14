-- EDUNIXO R2.5.64 — Inbuilt Android SMS Gateway
-- No third-party SMS gateway is required. Authorized school Android devices send
-- queued school communications through the device SIM using the native app.

create table if not exists public.edunixo_sms_gateway_devices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  device_key text not null,
  device_name text not null default 'EDUNIXO Android Gateway',
  platform text not null default 'android',
  app_version text,
  is_enabled boolean not null default false,
  permission_granted boolean not null default false,
  last_seen_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, device_key)
);

create table if not exists public.edunixo_sms_gateway_queue (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  destination text not null,
  message_body text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  gateway_device_id uuid references public.edunixo_sms_gateway_devices(id) on delete set null,
  native_reference text,
  source_kind text,
  source_id text,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists edunixo_sms_gateway_queue_school_status_idx
  on public.edunixo_sms_gateway_queue(school_id,status,priority,created_at);
create index if not exists edunixo_sms_gateway_devices_school_idx
  on public.edunixo_sms_gateway_devices(school_id,is_enabled,last_seen_at desc);

alter table public.edunixo_sms_gateway_devices enable row level security;
alter table public.edunixo_sms_gateway_queue enable row level security;

create or replace function public.edunixo_sms_gateway_authorized(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.user_school_memberships m
    join public.users u on u.id=m.user_id
    left join public.roles r on r.id=u.role_id
    where m.user_id=(select auth.uid())
      and m.school_id=p_school_id
      and coalesce(m.is_active,true)=true
      and coalesce(u.is_active,true)=true
      and lower(coalesce(u.status,'Active'))='active'
      and lower(coalesce(r.role_name,'')) in ('headmaster','clerk','super_admin','super admin')
  );
$$;

revoke all on function public.edunixo_sms_gateway_authorized(uuid) from public,anon;
grant execute on function public.edunixo_sms_gateway_authorized(uuid) to authenticated,service_role;

-- Direct table reads are intentionally narrow; mutation goes through RPCs.
drop policy if exists edunixo_sms_gateway_devices_read on public.edunixo_sms_gateway_devices;
create policy edunixo_sms_gateway_devices_read on public.edunixo_sms_gateway_devices
for select to authenticated
using (public.edunixo_sms_gateway_authorized(school_id));

drop policy if exists edunixo_sms_gateway_queue_read on public.edunixo_sms_gateway_queue;
create policy edunixo_sms_gateway_queue_read on public.edunixo_sms_gateway_queue
for select to authenticated
using (public.edunixo_sms_gateway_authorized(school_id));

create or replace function public.edunixo_sms_gateway_register_device(
  p_school_id uuid,
  p_device_key text,
  p_device_name text,
  p_app_version text,
  p_permission_granted boolean default false
)
returns public.edunixo_sms_gateway_devices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.edunixo_sms_gateway_devices;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway access denied for this school.';
  end if;
  if nullif(trim(p_device_key),'') is null then raise exception 'Device key is required.'; end if;

  insert into public.edunixo_sms_gateway_devices(
    school_id,device_key,device_name,app_version,permission_granted,last_seen_at,created_by,updated_at
  ) values (
    p_school_id,trim(p_device_key),coalesce(nullif(trim(p_device_name),''),'EDUNIXO Android Gateway'),
    nullif(trim(p_app_version),''),coalesce(p_permission_granted,false),now(),(select auth.uid()),now()
  )
  on conflict (school_id,device_key) do update set
    device_name=excluded.device_name,
    app_version=excluded.app_version,
    permission_granted=excluded.permission_granted,
    last_seen_at=now(),
    updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.edunixo_sms_gateway_set_enabled(
  p_school_id uuid,
  p_device_key text,
  p_enabled boolean,
  p_permission_granted boolean default false
)
returns public.edunixo_sms_gateway_devices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.edunixo_sms_gateway_devices;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway access denied for this school.';
  end if;
  update public.edunixo_sms_gateway_devices
     set is_enabled=coalesce(p_enabled,false),
         permission_granted=coalesce(p_permission_granted,false),
         last_seen_at=now(),
         last_error=null,
         updated_at=now()
   where school_id=p_school_id and device_key=trim(p_device_key)
   returning * into v_row;
  if v_row.id is null then raise exception 'Register this Android device before enabling the SMS gateway.'; end if;
  return v_row;
end;
$$;

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
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway send access denied for this school.';
  end if;
  if nullif(trim(p_message_body),'') is null then raise exception 'SMS message is required.'; end if;
  if v_priority not in ('low','normal','high','urgent') then v_priority:='normal'; end if;

  insert into public.edunixo_sms_gateway_queue(
    school_id,destination,message_body,priority,status,source_kind,source_id,created_by
  )
  select p_school_id, d.destination, left(p_message_body,4000),v_priority,'queued',p_source_kind,p_source_id,(select auth.uid())
  from (
    select distinct regexp_replace(raw,'[^0-9+]','','g') as destination
    from unnest(coalesce(p_destinations,array[]::text[])) raw
  ) d
  where length(regexp_replace(d.destination,'\D','','g')) between 10 and 15;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

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
declare
  v_device public.edunixo_sms_gateway_devices;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway access denied for this school.';
  end if;
  select * into v_device from public.edunixo_sms_gateway_devices
    where school_id=p_school_id and device_key=trim(p_device_key) for update;
  if v_device.id is null then raise exception 'Gateway device is not registered.'; end if;
  if not v_device.is_enabled then return; end if;
  if not v_device.permission_granted then raise exception 'Android SMS permission is not granted.'; end if;

  update public.edunixo_sms_gateway_devices
     set last_seen_at=now(),updated_at=now(),last_error=null
   where id=v_device.id;

  return query
  with picked as (
    select q.id
    from public.edunixo_sms_gateway_queue q
    where q.school_id=p_school_id
      and q.status='queued'
      and q.attempts < 3
    order by
      case q.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
      q.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),20))
  )
  update public.edunixo_sms_gateway_queue q
     set status='processing',gateway_device_id=v_device.id,claimed_at=now(),attempts=q.attempts+1,updated_at=now()
    from picked
   where q.id=picked.id
  returning q.*;
end;
$$;

create or replace function public.edunixo_sms_gateway_complete_job(
  p_school_id uuid,
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
declare
  v_device_id uuid;
  v_attempts integer;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway access denied for this school.';
  end if;
  select id into v_device_id from public.edunixo_sms_gateway_devices
    where school_id=p_school_id and device_key=trim(p_device_key);
  if v_device_id is null then raise exception 'Gateway device is not registered.'; end if;

  select attempts into v_attempts from public.edunixo_sms_gateway_queue
   where id=p_job_id and school_id=p_school_id and gateway_device_id=v_device_id;
  if v_attempts is null then raise exception 'SMS queue job does not belong to this gateway.'; end if;

  if coalesce(p_success,false) then
    update public.edunixo_sms_gateway_queue
       set status='sent',native_reference=nullif(trim(p_native_reference),''),last_error=null,sent_at=now(),updated_at=now()
     where id=p_job_id and school_id=p_school_id and gateway_device_id=v_device_id;
  elsif v_attempts < 3 then
    update public.edunixo_sms_gateway_queue
       set status='queued',gateway_device_id=null,claimed_at=null,last_error=left(coalesce(p_error,'Native SMS send failed.'),1000),updated_at=now()
     where id=p_job_id and school_id=p_school_id and gateway_device_id=v_device_id;
  else
    update public.edunixo_sms_gateway_queue
       set status='failed',last_error=left(coalesce(p_error,'Native SMS send failed.'),1000),updated_at=now()
     where id=p_job_id and school_id=p_school_id and gateway_device_id=v_device_id;
  end if;

  -- Keep the canonical Communication message status aligned with native SMS jobs.
  -- This only applies when the queue row was created from the Headmaster Communication Hub.
  update public.edunixo_communication_messages m
     set status = case
       when exists (select 1 from public.edunixo_sms_gateway_queue q where q.school_id=p_school_id and q.source_kind='communication-message' and q.source_id=m.id::text and q.status in ('queued','processing')) then 'queued'
       when exists (select 1 from public.edunixo_communication_deliveries d where d.school_id=p_school_id and d.message_id=m.id and d.status in ('queued','processing')) then 'queued'
       when exists (select 1 from public.edunixo_sms_gateway_queue q where q.school_id=p_school_id and q.source_kind='communication-message' and q.source_id=m.id::text and q.status='failed')
            or exists (select 1 from public.edunixo_communication_deliveries d where d.school_id=p_school_id and d.message_id=m.id and d.status='failed') then 'partial'
       else 'completed'
     end, updated_at=now()
   where m.school_id=p_school_id
     and m.id::text=(select source_id from public.edunixo_sms_gateway_queue where id=p_job_id and source_kind='communication-message' limit 1);
end;
$$;

create or replace function public.edunixo_sms_gateway_heartbeat(
  p_school_id uuid,
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
  if not public.edunixo_sms_gateway_authorized(p_school_id) then return; end if;
  update public.edunixo_sms_gateway_devices
     set last_seen_at=now(),permission_granted=coalesce(p_permission_granted,false),last_error=nullif(left(coalesce(p_last_error,''),1000),''),updated_at=now()
   where school_id=p_school_id and device_key=trim(p_device_key);
end;
$$;

grant execute on function public.edunixo_sms_gateway_register_device(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.edunixo_sms_gateway_set_enabled(uuid,text,boolean,boolean) to authenticated;
grant execute on function public.edunixo_sms_gateway_enqueue_bulk(uuid,text[],text,text,text,text) to authenticated;
grant execute on function public.edunixo_sms_gateway_claim_batch(uuid,text,integer) to authenticated;
grant execute on function public.edunixo_sms_gateway_complete_job(uuid,text,uuid,boolean,text,text) to authenticated;
grant execute on function public.edunixo_sms_gateway_heartbeat(uuid,text,boolean,text) to authenticated;

revoke insert,update,delete on public.edunixo_sms_gateway_devices from anon,authenticated;
revoke insert,update,delete on public.edunixo_sms_gateway_queue from anon,authenticated;
grant select on public.edunixo_sms_gateway_devices to authenticated;
grant select on public.edunixo_sms_gateway_queue to authenticated;
