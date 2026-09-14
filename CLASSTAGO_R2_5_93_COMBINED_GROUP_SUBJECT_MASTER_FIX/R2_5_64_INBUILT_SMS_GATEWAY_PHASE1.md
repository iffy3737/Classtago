# Classtago R2.5.64 — Inbuilt Android SMS Gateway (Phase 1)

## Goal
Classtago now contains its own school-SIM SMS gateway path. The system does not require httpSMS or another paid SMS gateway for this route.

## Implemented in this build
- Added native Capacitor Android plugin `EdunixoSmsGateway`.
- Added Android `SEND_SMS` runtime permission; permission is requested only after an authorized Headmaster/Clerk explicitly starts the gateway.
- Added stable native device identity and telephony-capability checks.
- Added multipart SIM SMS sending with Android carrier-send confirmation and timeout handling.
- Added Supabase device registry and durable SMS queue migration with RLS and authorized RPCs.
- Added atomic queue claiming, retry (max 3 attempts), priority ordering and duplicate-safe server dispatch behavior.
- Added `Inbuilt SMS Gateway` feature to Headmaster Communication Hub and Clerk Communication Office.
- Added gateway status, permission state, online/offline status, queued/sent/failed counts, recent queue history and real-SIM test UI.
- Added app-level native queue runner for Headmaster/Clerk Android sessions so queue processing is not tied to the Communication page being open.
- Headmaster audience-targeted SMS is routed to the inbuilt Android SIM queue when the gateway is enabled.
- Existing Website/In-App, WhatsApp and Email routes are left intact.
- Existing non-SMS communication remains usable even before the new migration is installed.

## Security / isolation
- Gateway control is limited to active school Headmaster/Clerk membership.
- Device registration is school-scoped.
- Queue rows are school-scoped with RLS.
- Browser cannot send directly through the SIM; only the native authorized Android plugin can do so.
- SMS permission is not requested for Students, Parents, Teachers or Peon users.
- No third-party SMS API token is stored in the frontend.

## Cost boundary
Classtago itself imposes no software-plan SMS quota in this gateway. The SIM/operator recharge, Android/telecom limits and applicable Indian messaging rules remain outside Classtago.

## Phase 1 operating boundary
The native queue runner operates while the installed Classtago app is active/visible. A persistent background/boot-resume gateway worker is intentionally left for Phase 2 because it requires a secure long-lived device credential design; this build does not store Supabase refresh credentials in an unsafe background service.

## Deployment prerequisite
Apply `supabase/migrations/20260907170000_inbuilt_android_sms_gateway.sql` to the target Supabase project before enabling the gateway in production.
