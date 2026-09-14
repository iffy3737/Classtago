# R2.5.84 — Gemini Live opaque-origin fix

## What changed

Google AI Studio may host the preview inside a sandboxed iframe whose WebSocket `Origin` can be `null` or a transient preview host. Enumerating only known AI Studio host suffixes therefore still rejected some legitimate preview sessions.

For `/api/assistant/live` only, the WebSocket handshake no longer treats `Origin` as an authentication factor. The socket is still locked until the first `start` message carries a valid Supabase access token. The server resolves that token to an active Classtago user, school membership and role before opening Gemini Live or exposing any ERP tool.

Existing safeguards remain:
- 12-second authentication timeout.
- Valid Supabase access token required.
- Active school membership + role resolution required.
- Two realtime sessions maximum per account.
- WebSocket max payload 512 KiB.
- Audio/text payload sanitization and size limits.
- School/role authorization on every exposed Classtago tool.
- Gemini provider key remains server-side.
- Existing REST CORS/origin rules remain unchanged.

This avoids depending on unstable AI Studio iframe origins while preserving token-based authorization.
