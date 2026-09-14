# EDUNIXO R2.5.49 Smart Technology Test Checklist

## Web Preview
1. Login and open **Smart Tools**.
2. Confirm Realtime Presence card appears.
3. Confirm Secure Offline Queue still loads; if a pending conflict exists, attempts/error are visible.
4. Confirm Web QR/Document fallbacks remain present.
5. Smart Command Search: type a command and verify role-safe destination.
6. Existing Attendance, Result, Homework, Question Paper and Admissions smoke test once.

## Android APK / Native Test
1. Build/sync Android project after dependencies are installed.
2. Smart Tools → **Native ML Kit Scan**: scan QR/barcode.
3. Smart Tools → **ML Kit Auto Scan & PDF**: scan multipage document, crop/adjust, save PDF; verify Downloads/EDUNIXO.
4. Smart Tools → **Verify device owner**: fingerprint/face/device PIN prompt succeeds.
5. Smart Command Search → **Speak**: capture device speech and verify the result is not auto-executed; user taps destination.
6. On-device Translator + Lecture Voice Notes regression test.

## Native FCM activation (later/final app activation)
1. Add the approved Firebase Android `google-services.json` to `android/app/` (never paste credentials into chat or commit private server credentials).
2. Set server-only `EDUNIXO_FIREBASE_PROJECT_ID`, `EDUNIXO_FIREBASE_CLIENT_EMAIL`, `EDUNIXO_FIREBASE_PRIVATE_KEY`.
3. Rebuild APK. Smart Tools should change Native Android Push from pending to ready.
4. Enable native push, create one EDUNIXO notification for that user, verify background notification delivery and deduplication.

## Passkey activation (later)
Keep `VITE_EDUNIXO_PASSKEY_ENABLED=false` until final custom domain/RP ID is locked and Supabase passkey configuration is finalized.

No Phase 5 SQL needs to be run manually; the production migration is already applied.
