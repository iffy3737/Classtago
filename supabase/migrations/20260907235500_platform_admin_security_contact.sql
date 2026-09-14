-- EDUNIXO R2.5.69 — Platform Admin Security Contact
-- Additive-only migration. Platform administrators are platform identities and
-- are not required to have a school-level public.users profile.

begin;

do $$
begin
  if to_regclass('public.platform_admins') is null then
    raise exception 'public.platform_admins does not exist. Apply the platform-admin base schema first.';
  end if;
end
$$;

alter table public.platform_admins
  add column if not exists security_mobile text;

comment on column public.platform_admins.security_mobile is
  'Platform/Super Admin security and WhatsApp-base contact used for platform OTP delivery. This is not the outbound sender SIM number.';

-- Preserve any previously configured number when the same auth user also has a
-- legacy school/public.users row. No users row is created for platform admins.
update public.platform_admins p
   set security_mobile = u.phone_number
  from public.users u
 where p.user_id = u.id
   and nullif(trim(coalesce(p.security_mobile, '')), '') is null
   and nullif(trim(coalesce(u.phone_number, '')), '') is not null;

commit;
