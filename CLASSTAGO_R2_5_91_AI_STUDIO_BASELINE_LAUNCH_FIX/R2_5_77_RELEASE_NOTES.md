# Classtago R2.5.77 — Voice Language + Warm Conversation Fix

- Fixes Unicode language-detection regex escaping that could misclassify Roman Hindi text as Urdu.
- Roman Hindi/Hinglish now responds in Roman/Latin script by default, independent of global UI language.
- Native Urdu script still receives Urdu; Devanagari Hindi receives Hindi.
- Tightens conversational response length to avoid long robotic paragraphs in voice mode.
- Changes default Gemini TTS voice from `Kore` (firm) to `Sulafat` (warm) unless `EDUNIXO_TTS_VOICE` is explicitly configured.
- Strengthens TTS performance direction for natural one-to-one school-teacher delivery.
- Existing ERP modules, Supabase schema, auth, admissions, attendance, results, timetable and dependency manifest are unchanged.
