# Classtago R2.5.82 — Phase 1 Universal Gemini Live AI Core

## Locked production direction

Classtago now uses its own authenticated WebSocket gateway to Gemini Live as the default realtime voice path. The browser/native client never receives the permanent Gemini API key. Pipecat, Daily, Soniox and Fish Audio are not part of the default realtime path.

## Included in this cumulative build

- Direct Gemini Live native-audio gateway at `/api/assistant/live` on the existing Classtago Express origin.
- Supabase access-token verification before a Live session can start.
- School and active-role scope resolved on the server; the client cannot supply its own role or school id.
- Server-owned system instruction and tool declarations; the client cannot inject tools or change security instructions.
- Role-aware first tool set: current school context, latest notifications, teaching assignments for teaching roles, and Headmaster staff-call preparation.
- Headmaster staff-call handoff resolves active staff only inside the current school and only prepares a `tel:` action for the user to initiate.
- Gapless PCM AudioWorklet playback based on the standalone R2 proof that removed audible chunk beeps/clicks.
- Automatic VAD/barge-in handling and immediate playback flush on interruption.
- 16 kHz microphone PCM input and 24 kHz Gemini audio output resampled for the device.
- Gemini session resumption and sliding-window context compression with controlled reconnect attempts.
- Voice selector and persona selector.
- Natural multilingual instruction covering English and India's scheduled-language set, including natural code-switching.
- Server-side audit events for session lifecycle and tool use without saving raw voice transcript content in the audit event.
- Free-first policy: Gemini is first; legacy Pipecat/Daily and optional paid/credit voice provider paths are disabled by default.
- Existing secure text assistant remains available as the non-live fallback.

## Not Phase 2 yet

This build establishes the secure AI core and tool gateway. The complete previously locked Classtago AI feature list (Receptionist, Admissions, Parent AI, complete Teacher academic actions, absence/fee follow-up, communication automation, broader ERP write actions, call analytics, etc.) will attach to this gateway in Phase 2 without replacing the voice engine.

## Provider abstraction rule

Application features must call Classtago tool contracts rather than Gemini-specific code. Gemini Live is the approved primary engine, but the architecture must remain replaceable if a future provider becomes materially better.
