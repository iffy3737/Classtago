# Classtago R2.5.78 — Pipecat + Gemini Live Realtime Conversation Engine (Phase 1)

## Why this release exists
R2.5.73–77 proved secure microphone access, scoped text AI and natural server TTS, but that architecture still completed speech recognition, text generation and TTS in separate turns. It could not reproduce the fluid reference-video experience. R2.5.78 introduces a separate true realtime path instead of further patching browser speech APIs.

## Added
- Pipecat JS client + Daily WebRTC transport in the Classtago web/mobile UI.
- New **Realtime Conversation** panel with one-tap live session start/end and mic mute.
- Direct remote audio track playback; no browser `speechSynthesis` in realtime mode.
- Realtime user transcript and bot output surfaces when emitted by the Pipecat/Gemini Live session.
- Authenticated `/api/realtime-voice/start` broker: Supabase session is verified and school/role are resolved server-side.
- Pipecat Cloud key remains server-only; browser receives only short-lived Daily room credentials.
- Session start rate limiting, timeout handling and non-content audit event.
- `voice-agent/` Python service using Pipecat 1.8.1 + Gemini Live native audio.
- Current low-latency model default is configurable by environment (`GEMINI_LIVE_MODEL`).
- Human school-staff conversational system prompt with short turns, code-switching and interruption-first behaviour.
- `min_agents = 1` deployment setting to reduce cold-start latency.

## Language behaviour
No conversation language selector is required. The realtime agent is instructed to follow spoken Hindi, Hinglish, Urdu, Marathi or English and to follow natural code-switching during the same session.

## Security scope
Phase 1 sends only minimal authenticated context: school ID/name/code, user ID/name, role, UI language hint and session mode. Attendance, marks, fees, contacts, admissions and other operational data are **not** sent. The realtime agent is read-only until explicit server-side ERP tools are added.

## Existing flows preserved
The existing `/api/assistant/chat`, `/api/assistant/tts`, Gemini feature routes, Supabase authentication and all ERP modules remain in place. The old text assistant is shown as a fallback below the new realtime panel.

## Deployment requirement
The ZIP contains the complete integration and Pipecat agent source, but a Python Pipecat agent must be deployed separately (recommended: Pipecat Cloud). The Classtago Node server then needs `PIPECAT_AGENT_NAME` + `PIPECAT_PUBLIC_API_KEY`. `GOOGLE_API_KEY` is stored in the Pipecat agent's secret set, not in the browser.
