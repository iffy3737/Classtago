# R2.5.78 Realtime Conversation Test Checklist

## Static / build
- [ ] `package.json` installs `@pipecat-ai/client-js` and `@pipecat-ai/daily-transport`.
- [ ] Vite/TypeScript frontend build passes.
- [ ] Express server bundle passes.
- [ ] `voice-agent/bot.py` imports under Python 3.11+ after `uv sync`.

## Agent deployment
- [ ] `GOOGLE_API_KEY` is present in Pipecat Cloud secret set.
- [ ] `edunixo-realtime-voice` agent is deployed and healthy.
- [ ] Pipecat public start key created.
- [ ] Classtago Node has `PIPECAT_AGENT_NAME=edunixo-realtime-voice`.
- [ ] Classtago Node has `PIPECAT_PUBLIC_API_KEY`.

## Realtime UX
- [ ] Login to existing Headmaster account.
- [ ] Open AI Assistant -> Realtime Conversation.
- [ ] Tap Start Live Conversation; browser prompts/uses mic.
- [ ] Bot greeting is heard from remote WebRTC audio (not Android TTS).
- [ ] Speak Roman/Hinglish naturally: “Haan ji, tum kya-kya kaam kar sakte ho?”
- [ ] Reply begins quickly and remains in natural Hinglish/Hindi style.
- [ ] Switch to English mid-sentence; context remains intact.
- [ ] Switch to Urdu/Marathi; agent follows without UI language selection.
- [ ] Interrupt the bot mid-sentence; bot stops and handles the new utterance.
- [ ] Mute/unmute works.
- [ ] End Conversation disconnects the room cleanly.

## Security regression
- [ ] Without login, `/api/realtime-voice/start` returns 401.
- [ ] Browser source/network does not expose `PIPECAT_PUBLIC_API_KEY` or `GOOGLE_API_KEY`.
- [ ] Asking for marks/fees/attendance that are not connected does not produce invented facts.
- [ ] Existing text assistant still works as fallback.
- [ ] Existing login, Headmaster, Clerk, Teacher, Student, attendance, result, timetable and admission flows are unchanged.

## Acceptance gate before Phase 2
Do not add parent outbound calling until: median response feel is acceptable, barge-in works, Hindi/Hinglish code-switching feels natural, and no device/browser TTS is involved in realtime mode.
