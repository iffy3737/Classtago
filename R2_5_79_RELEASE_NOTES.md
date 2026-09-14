# Classtago R2.5.79 — Realtime Broker Handshake Hotfix

- Removes Pipecat client internal REST parsing from the Classtago live-start path.
- Uses Classtago authenticated `fetch` for `/api/realtime-voice/start`, validates content-type/body, then calls documented `PipecatClient.connect({ url, token })`.
- Prevents AI Studio SPA HTML (`<!doctype ...>`) from being blindly parsed as JSON.
- Adds authenticated `/api/realtime-voice/status` diagnostics without exposing secrets.
- Keeps Pipecat + Gemini Live realtime architecture, school/role auth, and existing ERP flows unchanged.
- package.json/dependency versions intentionally unchanged from R2.5.78 to avoid unnecessary dependency refresh in AI Studio.
