# Classtago Bulk Batch 06 — Maria Voice Navigation Auto-Open

## Root cause confirmed
Maria's realtime voice path received a valid `clientAction` of type `navigate`, but `RealtimeVoiceAssistant.handleClientAction()` only stored it in `clientAction`. The actual `edunixo_smart_navigate` event was emitted only after the user pressed the secondary "Open in Classtago" button. Maria therefore verbally reported that the module was opened while the screen remained unchanged.

## Fix
`src/components/RealtimeVoiceAssistant.tsx`
- Realtime Maria `navigate` actions now dispatch `edunixo_smart_navigate` immediately.
- The temporary action button is cleared after dispatch.
- A status message confirms the navigation request.
- Existing DashboardOverview role/entitlement resolution remains the final authority; no permission bypass was introduced.

## Scope
- No Supabase schema changes.
- No Question Paper generation/save/approval changes.
- No Maria server permission changes.
- No existing ERP module workflow rewritten.
- Text-chat navigation button behavior remains unchanged.

## Expected result
When a signed-in user says, for example, "Question Paper wala module open karo", Maria should actually switch to the authorised Question Paper module instead of only saying that it opened.
