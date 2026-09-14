# Classtago R2.5.73 Voice Assistant Test Checklist

## Regression safety
- [ ] Existing Headmaster, Clerk, Teacher, Student, Parent and Peon logins still open normally.
- [ ] Existing `/api/gemini/chat` consumers still work unchanged.
- [ ] Admission, Result, Timetable, Communication, SMS/OTP and Supabase flows remain unchanged.

## Voice Assistant UI
- [ ] Open Voice Assistant from authenticated ERP shell.
- [ ] Type a question and confirm a text answer is returned.
- [ ] Tap microphone, grant permission and speak a question.
- [ ] Confirm recognized speech is submitted automatically.
- [ ] Confirm AI answer is spoken when Voice Replies is enabled.
- [ ] Confirm Volume button mutes/unmutes spoken replies.
- [ ] Confirm Clear resets the conversation and stops active speech.
- [ ] Deny microphone permission and confirm typed chat remains usable.

## Language checks
- [ ] English recognition/reply.
- [ ] Hindi recognition/reply.
- [ ] Urdu recognition/reply/RTL display.
- [ ] Marathi recognition/reply when device voice pack supports it.

## Security checks
- [ ] Call `/api/assistant/chat` without Bearer token -> 401.
- [ ] Inactive user -> 403.
- [ ] Logged-in school A user cannot retrieve school B data.
- [ ] Teacher receives only current assignment-scoped context.
- [ ] Student receives only own Student Master context.
- [ ] Assistant refuses to claim write actions in this phase.
- [ ] Audit event `ai.voice_assistant.queried` contains metadata only, not raw prompt/reply.
- [ ] Excessive requests trigger per-user throttling.

## Deployment prerequisites
- [ ] Server has `GEMINI_API_KEY` or `GOOGLE_API_KEY` configured.
- [ ] Supabase service role/server configuration is present for authenticated scope resolution.
- [ ] HTTPS is enabled so browser microphone permissions can operate normally.
