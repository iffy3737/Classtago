# R2.5.77 Voice Language + Warm Conversation Test

## Language routing
1. Type: `Tum kya-kya kam kar sakte ho`
   - Expected: reply in Roman Hindi/Hindustani, Latin script only. No Urdu or Devanagari script.
2. Type: `تم کیا کام کر سکتے ہو؟`
   - Expected: Urdu script reply.
3. Type: `मुझे आज की जानकारी बताओ`
   - Expected: Hindi/Devanagari reply.
4. Type: `What can you do?`
   - Expected: English reply even if another UI language was previously selected.

## Voice quality
- After a spoken reply, footer should show `Human voice engine: Gemini warm teacher voice.` or `Human voice engine: Fish Audio.`
- If footer says `Device fallback is active`, the natural server TTS failed and the audible voice may sound robotic; capture the server error instead of judging the fallback as the final voice.
- Default Gemini TTS voice is now Sulafat (warm) unless EDUNIXO_TTS_VOICE is explicitly overridden.

## Regression
- Login, Supabase school/role scoping, attendance, admissions, results, timetable and existing AI endpoints must remain unchanged.
- Microphone permission remains declared in metadata.json.
