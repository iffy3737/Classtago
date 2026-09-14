# R2.5.82 Phase 1 Test Checklist

Test against a normal signed-in Classtago account. Never place a permanent Gemini key in frontend/VITE variables.

1. Open AI Assistant and start Live Conversation; microphone permission should be requested only by the browser/app.
2. Confirm clean continuous audio with no PCM chunk beep/click.
3. Interrupt Gemini while it is speaking; playback should stop immediately and the new user turn should take control.
4. Change Agent and Voice before a new session and confirm the selected profile is used.
5. Speak Hindi/Hinglish, Marathi, Urdu, Punjabi, Gujarati, Bengali, Tamil and Telugu, including code-switching inside one conversation.
6. Leave the session running 10–15 minutes and confirm session reconnect/resumption does not kill the UI.
7. Teacher/Class Teacher/Headmaster: ask "What are my teaching assignments?" and confirm only the signed-in user's scoped assignments are returned.
8. Ask for latest notifications and confirm only the current school/user context is exposed.
9. Headmaster only: ask to call a current teacher by name. AI may prepare a Call button; it must not auto-dial and must not resolve staff from another school.
10. Non-Headmaster: request the same staff-call action and confirm it is refused safely.
11. Confirm Text Assistant fallback still works.
12. Confirm `/api/realtime-voice/start` reports the legacy Pipecat route disabled unless `EDUNIXO_ENABLE_LEGACY_PIPECAT=true` is explicitly set server-side.

A failure in role/school isolation, unauthorized write/action, exposed provider key, or cross-school result is a release blocker.
