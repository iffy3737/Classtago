# Classtago R2.5.69 — Platform Admin Gateway Contact Reliability Fix

Base: Classtago R2.5.68 Platform Admin Gateway Setup.

Changes are narrowly scoped to the Platform/Super Admin SMS/OTP gateway setup:

- Platform Super Admin security mobile is now stored on `platform_admins.security_mobile`.
- A Platform Admin no longer requires a school-level `public.users` profile in order to save a mobile number or receive a platform security OTP.
- Existing `users.phone_number` is retained only as a backward-compatible read/sync fallback when such a row already exists.
- Live Demo / School Registration platform OTP routing continues to use the existing Platform Gateway queue.
- Capacitor native `EdunixoSmsGateway` is now registered once through a shared singleton module, removing the duplicate-plugin registration warning caused by the school and platform gateway modules registering the same bridge separately.
- No school academic, admission, result, attendance, auth, timetable, communication, or other existing workflow was removed or redesigned.

Database action required once:
`supabase/migrations/20260907235500_platform_admin_security_contact.sql`
