-- EDUNIXO R2.5.67 — Smart SMS Gateway Assignment + Automatic Fallback
--
-- Critical-SMS policy remains unchanged. This migration does NOT enable routine
-- SMS. It makes the existing R2.5.64 gateway deterministic: an Android device
-- is owned by the authenticated role that registers it, is assigned Primary or
-- Backup, and the queue is claimed only by the highest-ranked healthy device.
-- If the Primary device is stale/offline or reaches its configured daily soft
-- limit, the Backup device becomes eligible automatically.

-- ---------------------------------------------------------------------------
-- 1) School gateway device assignment metadata.
-- ---------------------------------------------------------------------------
alter table public.edunixo_sms_gateway_devices
  add column if not exists owner_user_id uuid;
alter table public.edunixo_sms_gateway_devices
  add column if not exists owner_role text not null default 'unknown';
alter table public.edunixo_sms_gateway_devices
  add column if not exists gateway_assignment text not null default 'backup'
    check (gateway_assignment in ('primary','backup'));
alter table public.edunixo_sms_gateway_devices
  add column if not exists routing_priority integer not null default 100
    check (routing_priority between 1 and 999);
alter table public.edunixo_sms_gateway_devices
  add column if not exists daily_sms_soft_limit integer not null default 80
    check (daily_sms_soft_limit between 10 and 1000);

alter table public.edunixo_sms_gateway_queue
  add column if not exists sms_parts integer not null default 1
    check (sms_parts between 1 and 100);

update public.edunixo_sms_gateway_devices d
   set owner_user_id=coalesce(d.owner_user_id,d.created_by),
       owner_role=case
         when coalesce(nullif(d.owner_role,''),'unknown') <> 'unknown' then d.owner_role
         else coalesce((
           select lower(coalesce(r.role_name,'unknown'))
           from public.users u
           left join public.roles r on r.id=u.role_id
           where u.id=d.created_by
           limit 1
         ),'unknown')
       end;

-- Preserve existing installations: choose one already-enabled device per school
-- as Primary. All other devices become Backup until an authorized manager changes
-- the assignment in the UI.
with ranked as (
  select id, row_number() over (
    partition by school_id
    order by case when is_enabled and permission_granted then 0 else 1 end,
             last_seen_at desc nulls last,
             created_at asc
  ) as rn
  from public.edunixo_sms_gateway_devices
)
update public.edunixo_sms_gateway_devices d
   set gateway_assignment=case when ranked.rn=1 then 'primary' else 'backup' end,
       routing_priority=case when ranked.rn=1 then 10 else greatest(20,d.routing_priority) end,
       updated_at=now()
  from ranked where ranked.id=d.id;

create index if not exists edunixo_sms_gateway_devices_routing_idx
  on public.edunixo_sms_gateway_devices(school_id,gateway_assignment,routing_priority,is_enabled,last_seen_at desc);

-- Registration now records the authenticated school role. No phone number is
-- needed for routing: EDUNIXO routes to a registered Android device/SIM.
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
  v_role text:='unknown';
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway access denied for this school.';
  end if;
  if nullif(trim(p_device_key),'') is null then raise exception 'Device key is required.'; end if;

  select lower(coalesce(r.role_name,'unknown')) into v_role
  from public.user_school_memberships m
  join public.users u on u.id=m.user_id
  left join public.roles r on r.id=u.role_id
  where m.user_id=(select auth.uid()) and m.school_id=p_school_id
  order by coalesce(m.is_active,true) desc
  limit 1;
  v_role:=coalesce(nullif(v_role,''),'unknown');

  insert into public.edunixo_sms_gateway_devices(
    school_id,device_key,device_name,app_version,permission_granted,last_seen_at,
    created_by,owner_user_id,owner_role,updated_at
  ) values (
    p_school_id,trim(p_device_key),coalesce(nullif(trim(p_device_name),''),'EDUNIXO Android Gateway'),
    nullif(trim(p_app_version),''),coalesce(p_permission_granted,false),now(),
    (select auth.uid()),(select auth.uid()),v_role,now()
  )
  on conflict (school_id,device_key) do update set
    device_name=excluded.device_name,
    app_version=excluded.app_version,
    permission_granted=excluded.permission_granted,
    last_seen_at=now(),
    owner_user_id=(select auth.uid()),
    owner_role=v_role,
    updated_at=now()
  returning * into v_row;

  if not exists (
    select 1 from public.edunixo_sms_gateway_devices d
    where d.school_id=p_school_id and d.gateway_assignment='primary' and d.id<>v_row.id
  ) then
    update public.edunixo_sms_gateway_devices
       set gateway_assignment='primary',routing_priority=10,updated_at=now()
     where id=v_row.id returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.edunixo_sms_gateway_set_assignment(
  p_school_id uuid,
  p_device_key text,
  p_assignment text,
  p_routing_priority integer default 100,
  p_daily_sms_soft_limit integer default 80
)
returns public.edunixo_sms_gateway_devices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.edunixo_sms_gateway_devices;
  v_assignment text:=lower(coalesce(p_assignment,'backup'));
  v_priority integer:=greatest(1,least(coalesce(p_routing_priority,100),999));
  v_limit integer:=greatest(10,least(coalesce(p_daily_sms_soft_limit,80),1000));
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then
    raise exception 'SMS gateway assignment access denied for this school.';
  end if;
  if v_assignment not in ('primary','backup') then raise exception 'Gateway assignment must be primary or backup.'; end if;

  if v_assignment='primary' then
    update public.edunixo_sms_gateway_devices
       set gateway_assignment='backup',routing_priority=greatest(20,routing_priority),updated_at=now()
     where school_id=p_school_id and device_key<>trim(p_device_key) and gateway_assignment='primary';
  end if;

  update public.edunixo_sms_gateway_devices
     set gateway_assignment=v_assignment,
         routing_priority=case when v_assignment='primary' then least(v_priority,19) else greatest(v_priority,20) end,
         daily_sms_soft_limit=v_limit,
         updated_at=now()
   where school_id=p_school_id and device_key=trim(p_device_key)
   returning * into v_row;
  if v_row.id is null then raise exception 'Gateway device is not registered.'; end if;
  return v_row;
end;
$$;

-- Highest-ranked healthy device only. A device is considered healthy when it
-- has heartbeated within 75 seconds. The current runner heartbeats on each queue
-- cycle, so Backup takes over automatically when Primary stops running.
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
  v_best_id uuid;
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then raise exception 'SMS gateway access denied for this school.'; end if;
  select * into v_device from public.edunixo_sms_gateway_devices
   where school_id=p_school_id and device_key=trim(p_device_key) for update;
  if v_device.id is null then raise exception 'Gateway device is not registered.'; end if;
  if not v_device.is_enabled then return; end if;
  if not v_device.permission_granted then raise exception 'Android SMS permission is not granted.'; end if;

  update public.edunixo_sms_gateway_devices
     set last_seen_at=now(),updated_at=now(),last_error=null
   where id=v_device.id;

  update public.edunixo_sms_gateway_queue
     set status='cancelled',last_error='OTP expired before SMS delivery.',updated_at=now()
   where school_id=p_school_id and status='queued' and message_kind='otp'
     and expires_at is not null and expires_at <= now();

  select d.id into v_best_id
  from public.edunixo_sms_gateway_devices d
  where d.school_id=p_school_id
    and d.is_enabled=true
    and d.permission_granted=true
    and d.last_seen_at >= now()-interval '75 seconds'
    and coalesce((
      select sum(coalesce(q.sms_parts,1))
      from public.edunixo_sms_gateway_queue q
      where q.gateway_device_id=d.id and q.status='sent'
        and timezone('Asia/Kolkata',q.sent_at)::date=timezone('Asia/Kolkata',now())::date
    ),0) < d.daily_sms_soft_limit
  order by case d.gateway_assignment when 'primary' then 0 else 1 end,
           d.routing_priority asc,d.last_seen_at desc,d.created_at asc
  limit 1;

  if v_best_id is null or v_best_id<>v_device.id then return; end if;

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

-- V2 completion stores multipart SMS units for daily soft-limit accounting.
create or replace function public.edunixo_sms_gateway_complete_job_v2(
  p_school_id uuid,
  p_device_key text,
  p_job_id uuid,
  p_success boolean,
  p_native_reference text,
  p_error text,
  p_parts integer
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_device_id uuid; v_attempts integer; v_parts integer:=greatest(1,least(coalesce(p_parts,1),100));
begin
  if not public.edunixo_sms_gateway_authorized(p_school_id) then raise exception 'SMS gateway access denied for this school.'; end if;
  select id into v_device_id from public.edunixo_sms_gateway_devices where school_id=p_school_id and device_key=trim(p_device_key);
  if v_device_id is null then raise exception 'Gateway device is not registered.'; end if;
  select attempts into v_attempts from public.edunixo_sms_gateway_queue where id=p_job_id and school_id=p_school_id and gateway_device_id=v_device_id;
  if v_attempts is null then raise exception 'SMS queue job does not belong to this gateway.'; end if;
  if coalesce(p_success,false) then
    update public.edunixo_sms_gateway_queue set status='sent',native_reference=nullif(trim(p_native_reference),''),last_error=null,sms_parts=v_parts,sent_at=now(),updated_at=now() where id=p_job_id;
  elsif v_attempts < 3 then
    update public.edunixo_sms_gateway_queue set status='queued',gateway_device_id=null,claimed_at=null,last_error=left(coalesce(nullif(trim(p_error),''),'Native SMS send failed.'),1000),updated_at=now() where id=p_job_id;
  else
    update public.edunixo_sms_gateway_queue set status='failed',last_error=left(coalesce(nullif(trim(p_error),''),'Native SMS send failed.'),1000),updated_at=now() where id=p_job_id;
  end if;
end;
$$;

grant execute on function public.edunixo_sms_gateway_set_assignment(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.edunixo_sms_gateway_complete_job_v2(uuid,text,uuid,boolean,text,text,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Platform/Super Admin gateway assignment metadata.
-- ---------------------------------------------------------------------------
alter table public.edunixo_platform_sms_gateway_devices
  add column if not exists gateway_assignment text not null default 'backup'
    check (gateway_assignment in ('primary','backup'));
alter table public.edunixo_platform_sms_gateway_devices
  add column if not exists routing_priority integer not null default 100
    check (routing_priority between 1 and 999);
alter table public.edunixo_platform_sms_gateway_devices
  add column if not exists daily_sms_soft_limit integer not null default 80
    check (daily_sms_soft_limit between 10 and 1000);
alter table public.edunixo_platform_sms_gateway_queue
  add column if not exists sms_parts integer not null default 1
    check (sms_parts between 1 and 100);

with ranked as (
  select id,row_number() over (
    order by case when is_enabled and permission_granted then 0 else 1 end,
             last_seen_at desc nulls last,created_at asc
  ) as rn
  from public.edunixo_platform_sms_gateway_devices
)
update public.edunixo_platform_sms_gateway_devices d
   set gateway_assignment=case when ranked.rn=1 then 'primary' else 'backup' end,
       routing_priority=case when ranked.rn=1 then 10 else greatest(20,d.routing_priority) end,
       updated_at=now()
  from ranked where ranked.id=d.id;

create index if not exists edunixo_platform_sms_gateway_devices_routing_idx
  on public.edunixo_platform_sms_gateway_devices(gateway_assignment,routing_priority,is_enabled,last_seen_at desc);

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
  on conflict(device_key) do update set
    device_name=excluded.device_name,app_version=excluded.app_version,permission_granted=excluded.permission_granted,last_seen_at=now(),updated_at=now()
  returning * into v_row;
  if not exists (
    select 1 from public.edunixo_platform_sms_gateway_devices d
    where d.gateway_assignment='primary' and d.id<>v_row.id
  ) then
    update public.edunixo_platform_sms_gateway_devices
       set gateway_assignment='primary',routing_priority=10,updated_at=now()
     where id=v_row.id returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.edunixo_platform_sms_gateway_set_assignment(
  p_device_key text,
  p_assignment text,
  p_routing_priority integer default 100,
  p_daily_sms_soft_limit integer default 80
)
returns public.edunixo_platform_sms_gateway_devices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.edunixo_platform_sms_gateway_devices;
  v_assignment text:=lower(coalesce(p_assignment,'backup'));
  v_priority integer:=greatest(1,least(coalesce(p_routing_priority,100),999));
  v_limit integer:=greatest(10,least(coalesce(p_daily_sms_soft_limit,80),1000));
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway assignment access denied.'; end if;
  if v_assignment not in ('primary','backup') then raise exception 'Gateway assignment must be primary or backup.'; end if;
  if v_assignment='primary' then
    update public.edunixo_platform_sms_gateway_devices
       set gateway_assignment='backup',routing_priority=greatest(20,routing_priority),updated_at=now()
     where device_key<>trim(p_device_key) and gateway_assignment='primary';
  end if;
  update public.edunixo_platform_sms_gateway_devices
     set gateway_assignment=v_assignment,
         routing_priority=case when v_assignment='primary' then least(v_priority,19) else greatest(v_priority,20) end,
         daily_sms_soft_limit=v_limit,
         updated_at=now()
   where device_key=trim(p_device_key)
   returning * into v_row;
  if v_row.id is null then raise exception 'Platform gateway device is not registered.'; end if;
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
declare v_device public.edunixo_platform_sms_gateway_devices; v_best_id uuid;
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway access denied.'; end if;
  select * into v_device from public.edunixo_platform_sms_gateway_devices where device_key=trim(p_device_key) for update;
  if v_device.id is null then raise exception 'Platform gateway device is not registered.'; end if;
  if not v_device.is_enabled then return; end if;
  if not v_device.permission_granted then raise exception 'Android SMS permission is not granted.'; end if;

  update public.edunixo_platform_sms_gateway_devices set last_seen_at=now(),updated_at=now(),last_error=null where id=v_device.id;
  update public.edunixo_platform_sms_gateway_queue set status='cancelled',last_error='OTP expired before SMS delivery.',updated_at=now()
    where status='queued' and message_kind='otp' and expires_at is not null and expires_at <= now();

  select d.id into v_best_id
  from public.edunixo_platform_sms_gateway_devices d
  where d.is_enabled=true and d.permission_granted=true
    and d.last_seen_at >= now()-interval '75 seconds'
    and coalesce((
      select sum(coalesce(q.sms_parts,1)) from public.edunixo_platform_sms_gateway_queue q
      where q.gateway_device_id=d.id and q.status='sent'
        and timezone('Asia/Kolkata',q.sent_at)::date=timezone('Asia/Kolkata',now())::date
    ),0) < d.daily_sms_soft_limit
  order by case d.gateway_assignment when 'primary' then 0 else 1 end,
           d.routing_priority asc,d.last_seen_at desc,d.created_at asc
  limit 1;

  if v_best_id is null or v_best_id<>v_device.id then return; end if;

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

create or replace function public.edunixo_platform_sms_gateway_complete_job_v2(
  p_device_key text,
  p_job_id uuid,
  p_success boolean,
  p_native_reference text,
  p_error text,
  p_parts integer
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_device_id uuid; v_attempts integer; v_parts integer:=greatest(1,least(coalesce(p_parts,1),100));
begin
  if not public.edunixo_platform_admin_authorized() then raise exception 'Platform SMS gateway access denied.'; end if;
  select id into v_device_id from public.edunixo_platform_sms_gateway_devices where device_key=trim(p_device_key);
  if v_device_id is null then raise exception 'Platform gateway device is not registered.'; end if;
  select attempts into v_attempts from public.edunixo_platform_sms_gateway_queue where id=p_job_id and gateway_device_id=v_device_id;
  if v_attempts is null then raise exception 'Platform SMS queue job does not belong to this gateway.'; end if;
  if coalesce(p_success,false) then
    update public.edunixo_platform_sms_gateway_queue set status='sent',native_reference=nullif(trim(p_native_reference),''),last_error=null,sms_parts=v_parts,sent_at=now(),updated_at=now() where id=p_job_id;
  elsif v_attempts < 3 then
    update public.edunixo_platform_sms_gateway_queue set status='queued',gateway_device_id=null,claimed_at=null,last_error=left(coalesce(nullif(trim(p_error),''),'Native SMS send failed.'),1000),updated_at=now() where id=p_job_id;
  else
    update public.edunixo_platform_sms_gateway_queue set status='failed',last_error=left(coalesce(nullif(trim(p_error),''),'Native SMS send failed.'),1000),updated_at=now() where id=p_job_id;
  end if;
end;
$$;

grant execute on function public.edunixo_platform_sms_gateway_set_assignment(text,text,integer,integer) to authenticated;
grant execute on function public.edunixo_platform_sms_gateway_complete_job_v2(text,uuid,boolean,text,text,integer) to authenticated;
