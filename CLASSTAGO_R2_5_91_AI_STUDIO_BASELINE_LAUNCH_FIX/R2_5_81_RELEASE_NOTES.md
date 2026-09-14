# Classtago R2.5.81 — AI Studio Full-Stack Realtime Route Fix

## Root cause confirmed
R2.5.78-R2.5.80 ran Vite on port 3000 and the Express API as a separate private sidecar on 3001. In the current Google AI Studio full-stack preview, the realtime broker request could fall through to the SPA document instead of the sidecar route, producing `text/html` / `<!doctype html>` where JSON session data was required.

## Fix
- AI Studio development now runs one Node full-stack process on port 3000.
- Express owns the public preview port and embeds Vite as middleware.
- `/api/realtime-voice/start`, `/api/assistant/chat`, and the rest of the Classtago API therefore share the exact same public origin and server process.
- No Pipecat, Supabase, ERP, attendance, result, admission, timetable, or role logic was removed.
- No dependency versions were changed.

## Expected next result
Once this build is loaded, the old "website page instead of session data" error should disappear. If Pipecat Cloud has not yet been deployed/configured, the UI should then receive a proper JSON configuration error such as `PIPECAT_AGENT_NOT_CONFIGURED` or `PIPECAT_KEY_NOT_CONFIGURED`. That is the expected next setup stage, not a routing failure.

## Required external realtime setup
The realtime engine still requires a deployed Pipecat agent and server-side values:
- `PIPECAT_AGENT_NAME=edunixo-realtime-voice`
- `PIPECAT_PUBLIC_API_KEY=<Pipecat Cloud public API key>`
The Pipecat agent itself needs its Google/Gemini key in its Pipecat Cloud secret set.
