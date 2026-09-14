drop policy if exists edunixo_school_realtime_read on realtime.messages;
drop policy if exists edunixo_school_realtime_write on realtime.messages;

create policy edunixo_school_realtime_read
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('presence','broadcast')
  and (select realtime.topic()) like 'edunixo:school:%'
  and exists (
    select 1
    from public.user_school_memberships membership
    join public.users profile on profile.id = membership.user_id
    where membership.user_id = (select auth.uid())
      and membership.is_active = true
      and profile.is_active = true
      and profile.status = 'Active'
      and membership.school_id::text = split_part((select realtime.topic()), ':', 3)
  )
);

create policy edunixo_school_realtime_write
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('presence','broadcast')
  and (select realtime.topic()) like 'edunixo:school:%'
  and exists (
    select 1
    from public.user_school_memberships membership
    join public.users profile on profile.id = membership.user_id
    where membership.user_id = (select auth.uid())
      and membership.is_active = true
      and profile.is_active = true
      and profile.status = 'Active'
      and membership.school_id::text = split_part((select realtime.topic()), ':', 3)
  )
);
