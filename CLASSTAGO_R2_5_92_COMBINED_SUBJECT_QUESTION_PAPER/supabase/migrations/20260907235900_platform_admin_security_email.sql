-- EDUNIXO R2.5.70 — Platform Admin Optional OTP Fallback Email
-- Additive-only. This email is only for OTP/security fallback delivery.
-- It does NOT change the Supabase Auth/login email.

begin;

do $$
begin
  if to_regclass('public.platform_admins') is null then
    raise exception 'public.platform_admins does not exist. Apply the platform-admin base schema first.';
  end if;
end
$$;

alter table public.platform_admins
  add column if not exists security_email text;

comment on column public.platform_admins.security_email is
  'Optional Platform/Super Admin OTP/security fallback email. Separate from the Supabase Auth/login email.';

-- Preserve the current auth/user profile email only as an initial fallback where
-- a matching public.users row exists. The API can still fall back to the Auth
-- email when security_email remains empty, so no school user row is required.
update public.platform_admins p
   set security_email = nullif(trim(u.email), '')
  from public.users u
 where p.user_id = u.id
   and nullif(trim(coalesce(p.security_email, '')), '') is null
   and nullif(trim(coalesce(u.email, '')), '') is not null;

commit;
