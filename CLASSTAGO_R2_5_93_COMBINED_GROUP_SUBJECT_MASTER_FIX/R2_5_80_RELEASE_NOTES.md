# Classtago R2.5.80 — Realtime Broker Routing Fix

- Realtime voice now tries same-origin `/api/realtime-voice/start` first, matching the working text assistant API routing in AI Studio/web.
- Native/mobile API-base rewriting is used only as a fallback when the same-origin route cannot serve session data.
- HTML/SPA responses are never accepted as Pipecat session data.
- AI Studio development API sidecar now runs through `tsx watch` so future `server.ts` changes restart automatically without leaving stale API code behind.
- No production ERP flow, Supabase schema, authentication rule, attendance/result/admission flow, or dependency manifest was changed.
