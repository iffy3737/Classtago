# Classtago R2.5.75 — Voice Language + Staff Dial Action

- Keeps the R2.5.74 AI Studio microphone permission hotfix.
- Adds server-side language detection independent of the UI language.
- Roman Hindi/Hinglish input now requests a Roman Hindi reply instead of defaulting to English.
- Native-script Hindi/Urdu/Marathi and other supported Indian scripts are detected server-side.
- Spoken replies now use the server-detected response language instead of the global UI language.
- Adds a deterministic Headmaster-only staff dial handoff: voice/text commands such as "Irfan Sir ko call karo" resolve the active Staff Master record server-side and hand off only the verified number to the device dialer.
- The browser/Android dialer controls final call confirmation; Classtago does not silently place a PSTN call.
- Ambiguous staff names require clarification. Missing numbers are not invented.
- Dial requests are audited without storing the user's raw prompt.
- All other Gemini assistant operations remain read-only unless separately implemented as explicit server-validated actions.
