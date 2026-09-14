# Classtago R2.5.74 — AI Studio Microphone Permission Hotfix

- Base: R2.5.73 Secure Voice Assistant Foundation
- Adds `microphone` to `metadata.json -> requestFramePermissions`.
- Required by Google AI Studio Build/Preview for microphone Navigator APIs.
- No ERP workflow, Supabase, auth, result, attendance, admission, timetable, or AI endpoint behavior changed.
- Existing secure school/role scoped Voice Assistant remains intact.

## Test
1. Import/upload this full ZIP in AI Studio.
2. Restart Preview.
3. Open AI Assistant.
4. Tap microphone. AI Studio should show its permission acknowledgement / browser microphone prompt.
5. Allow it and speak a short question.
