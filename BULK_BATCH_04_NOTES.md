Classtago Bulk Batch 04

Maria microphone permission hardening:
- Added an explicit native RECORD_AUDIO permission request bridge for the Capacitor Android shell before Maria calls browser getUserMedia().
- Added precise handling for NotAllowedError/PermissionDeniedError/SecurityError instead of exposing only generic “Permission denied”.
- Web/AI Studio path keeps the normal browser permission flow and now explains when site/preview microphone permission is blocked.
- Added a clear Android recovery path: Settings → Apps → Classtago → Permissions → Microphone.
- No Gemini Live server auth, Supabase schema, Maria tools, or existing ERP write workflows changed.

Validation: source-level inspection only; full dependency build/runtime AI Studio test not claimed.
