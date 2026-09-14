# Classtago R2.5.67 — Smart Gateway Role Assignment

Base: **R2.5.66 Simplified Instant Live Demo**.

## What changed

- Existing R2.5.64 inbuilt Android SIM SMS Gateway is retained; no second SMS gateway was created.
- School gateway devices now record the authenticated owner role (Headmaster/Clerk/etc.) at registration.
- One school device can be assigned **Primary** and additional devices **Backup**.
- Platform/Super Admin gateway supports the same Primary/Backup assignment.
- OTP SMS routing is automatic; users never choose or type the sender SIM number during an OTP request.
- Router uses device health/heartbeat and routing assignment. If Primary becomes stale/offline, Backup can take over automatically.
- Configurable **daily SMS soft limit** (default 80 units) prevents Classtago from consuming an entire regular SIM plan.
- Multipart SMS parts are counted as SMS units for daily soft-limit accounting.
- Platform OTP server checks for a healthy Primary/Backup route before reporting SMS as available; WhatsApp remains an independent OTP route and Email remains optional.
- Dual-SIM devices use the Android **default SMS SIM** in this release. The desired school/role SIM should be set as the phone's default SMS SIM.

## Policy unchanged

SMS remains restricted to OTP, account/security verification, gateway testing and genuine critical/emergency workflows. Routine homework, attendance information, results, timetable and normal notices are not re-enabled on SIM SMS.

## Database

Apply migrations in order, including the new:

`supabase/migrations/20260907230000_smart_sms_gateway_role_assignment.sql`

The R2.5.65 migration file also contains a fresh-install correction removing a duplicate `claimed_at` declaration from the Platform queue table definition. This changes no live table when that migration has already been applied.
