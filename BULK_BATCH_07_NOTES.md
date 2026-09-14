# Classtago Bulk Batch 07 — Maria operational action layer

## Why this batch exists
Batch 06 made generic Maria navigation auto-dispatch, but the navigation event could still be lost during Dashboard mounting/re-rendering. More importantly, several Maria capabilities were only informational/preparatory adapters rather than complete ERP actions.

## Changes
1. **Reliable Maria navigation queue**
   - Added a short-lived browser navigation queue in `mariaClientBridge.ts`.
   - Maria navigation requests are dispatched immediately and retained briefly so Dashboard can consume them if it mounts/re-renders after the event.
   - Realtime voice navigation and dynamic-command navigation now use the same bridge.
   - Dashboard consumes queued requests using the same role/entitlement route resolver as normal menus.

2. **Teacher/Class Teacher/Headmaster own leave application**
   - Added `prepare_teacher_leave_application` to Maria's authenticated ERP tool set.
   - Maria resolves/validates the requested date range, leave type and factual reason.
   - The existing Leave & Personal HR workflow remains canonical.
   - Maria prepares the application first; explicit confirmation is required before submission.
   - `confirm_maria_action` now actually creates the canonical `leave.application.requested` audit record, notifies active Headmaster accounts, and opens `tr-leave-apply` after successful submission.
   - No fake leave records and no bypass of the existing approval workflow.

3. **Prompt/tool routing**
   - Universal Maria instructions explicitly direct own-leave requests to the new operational tool and confirmation workflow.

## Safety / scope
- No Supabase schema changes.
- No replacement of existing Leave, Communication, Question Paper, Homework, Result or Attendance workflows.
- Phone calls remain device-dialer handoffs; Maria does not silently impersonate the user or inject itself into a carrier call.
- Communication/send actions remain confirmation-gated.

## Verification
- Source-level inspection performed.
- Full dependency/build/runtime verification is not claimed because the cumulative workspace has no installed `node_modules`.
