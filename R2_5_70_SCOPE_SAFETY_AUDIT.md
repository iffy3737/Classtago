# R2.5.70 Scope Safety Audit

- Base: R2.5.69.
- Existing feature files removed: 0.
- Functional scope: Platform Admin SMS/OTP Gateway Step 1 contact configuration only.
- Database change: additive nullable `platform_admins.security_email` column only.
- Login email is not modified by this release.
- School user profiles, role permissions, admissions, attendance, results, academic setup, Supabase auth flows, and Android SMS routing rules are unchanged.
- Email remains optional and separate from SMS/WhatsApp routing.
