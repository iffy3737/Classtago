# Classtago R2.5.83 — AI Studio Gemini Live Origin Fix

- Fixes `Origin not allowed` when Universal Gemini Live is opened inside Google AI Studio Build/Preview.
- Keeps same-origin web, packaged Capacitor origins, and explicit `EDUNIXO_ALLOWED_APP_ORIGINS` behavior unchanged.
- Adds a narrow trusted preview-origin rule only for HTTPS `aistudio.google.com` / `*.aistudio.google.com` and `scf.usercontent.goog` / `*.scf.usercontent.goog`.
- The Gemini provider key remains server-side. Supabase authentication, active membership, school scope, role scope and per-tool authorization still run independently after the WebSocket origin check.
- No existing ERP module, role permission, Supabase table, admissions/result/timetable/communication workflow, or native app routing was removed.
