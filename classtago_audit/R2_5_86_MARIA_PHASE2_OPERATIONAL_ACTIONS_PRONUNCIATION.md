# Classtago R2.5.86 — Maria Phase 2 Operational Actions + Pronunciation

R2.5.86 continues Phase 2 on top of the confirmed R2.5.85 Maria build. Existing ERP owner modules, Supabase authentication, school/role scope and the proven Gemini Live transport are preserved.

## Maria pronunciation
- Visible product name remains **Maria**.
- Live voice system instruction hard-locks the spoken name to **Maa-ree-yaa / मारिया** (three syllables, long Maa), not मरिया/Mariya/Mar-ya.
- Gemini server TTS receives the same pronunciation direction.
- Browser/device speech fallback substitutes a pronunciation-safe spoken form while keeping the visible UI text as Maria.

## Confirmation-gated operational actions
Maria can now prepare selected operational communications but cannot silently send them. The preparation is persisted in the existing `audit_logs` trail, bound to the authenticated user + current school, and expires after 10 minutes.

Enabled actions:
- Class Teacher / Headmaster: prepare absence Parent/Guardian follow-up from canonical same-day attendance.
- Headmaster: prepare fee reminder from the canonical current fee ledger; balance is re-checked immediately before send.
- Headmaster: prepare admission follow-up from the current admission application status/contact; status is re-checked before send.
- Headmaster: prepare a school notice for authorised audiences/channels.
- Clerk: prepare a notice draft and, after explicit confirmation, submit it into the existing Headmaster approval workflow; it is not directly published by the Clerk.
- Signed-in roles: current-school phone dialer handoff where a valid School Profile number exists. Existing Headmaster staff dialer remains available.

## Explicit confirmation boundary
- `prepare_*` creates only a pending action and returns a Confirm UI action.
- Confirmation can occur from the explicit Confirm button or from a later clear user turn (for example “haan, send it”).
- Text chat reloads the latest still-pending action into server context so a later confirmation turn can resolve its action id without trusting the browser.
- Server-side same-turn guards prevent Gemini from preparing and confirming a sensitive action in one model turn, even if the model attempts it.
- Confirm and Cancel REST bridges accept only the opaque action id; user, school and role are re-resolved from the Supabase bearer session.
- Cancelled, completed and expired actions cannot be silently reused.

## Safety / scope
No Maria action can directly change attendance records, approve/reject admissions, change fee ledger values, publish results, or bypass existing academic/result workflows. Those remain inside their proven Classtago modules. Direct Maria writes in this checkpoint are limited to the confirmation-gated communication workflows listed above.

## Phase status
This is a Phase 2 checkpoint, not a new macro phase. Public unauthenticated School Receptionist exposure and remaining broader Parent/Receptionist action surfaces are intentionally not declared complete in R2.5.86.
