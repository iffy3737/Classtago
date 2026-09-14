# Classtago R2.5.73 — Secure Multilingual Voice Assistant Foundation

## Added
- Upgraded the existing authenticated AI Assistant into a microphone-enabled Voice Assistant.
- Voice input uses the browser/device speech recognition engine when available.
- AI replies can be spoken aloud using the device speech synthesis engine.
- Language-aware speech locale mapping includes English, Hindi, Urdu, Marathi and additional Indian-language fallbacks.
- Added mute/unmute control, microphone state, permission/error fallback and safe text fallback.
- Added a new authenticated `POST /api/assistant/chat` endpoint.

## Security
- Voice Assistant school ID and role are resolved only from the authenticated Supabase session.
- Browser-provided school/role values are not trusted.
- Assistant is READ-ONLY in this phase and cannot claim to perform ERP mutations.
- Teacher context is limited to current assignment scopes.
- Student context is limited to the logged-in student's own Student Master row.
- Latest notifications are limited to the logged-in user.
- Cross-school/private data disclosure is explicitly blocked by the server instruction.
- Per-user request throttling added.
- Audit trail records usage metadata without storing raw prompts or AI replies.

## Compatibility
- Existing `/api/gemini/chat` route remains unchanged to avoid breaking existing AI/Result flows.
- No existing admission, result, timetable, authentication, SMS, communication or Supabase workflow was removed or rewritten.
- Voice gracefully falls back to typed chat if speech recognition is unavailable on a browser/device.

## Next Voice Phases
- Provider-grade audio streaming / native Android speech layer.
- Incoming AI School Receptionist via telephony/SIP.
- Controlled ERP voice actions with confirmation and permission gates.
- Outbound attendance, fee, exam and admission calls.
