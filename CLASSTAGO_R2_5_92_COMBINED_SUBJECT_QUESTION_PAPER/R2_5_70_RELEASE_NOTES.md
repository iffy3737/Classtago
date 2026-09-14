# Classtago R2.5.70 — Platform Admin Contact Actions + Optional OTP Email

## Base
Exact R2.5.69 Platform Admin Gateway Fix package.

## Changes
- Makes the Step 1 save action explicit and full-width on mobile: **Save Mobile & OTP Email**.
- Adds an editable **OTP fallback email (optional)** for the Platform/Super Admin.
- Keeps the Supabase Auth/login email separate and read-only on this gateway page.
- Clearing the OTP fallback email disables email as a Platform Security OTP fallback; it does not change login credentials.
- Mobile remains required for the Platform Admin security contact and WhatsApp-base contact.
- Sender SIM selection remains device-based through the installed Android gateway; no sender SIM number is typed here.
- No Headmaster/Clerk/Teacher/admission/result/academic flows were changed.

## Database
Apply `supabase/migrations/20260907235900_platform_admin_security_email.sql` once after the previously completed R2.5.67/R2.5.69 SQL chain.
