# Classtago R2.5.91 — AI Studio Baseline Launch Fix

## Baseline
This patch is derived directly from the user-confirmed ZIP currently representing the latest app uploaded to Google AI Studio.

## Scoped launch fixes
- Synchronized package version and Android version to 0.2.91 / versionCode 2591.
- Removed three historical full-project copies that are not imported by the root runtime and caused Deployment Doctor failure.
- Removed zero-byte stale package lock files that caused Deployment Doctor failure.
- Corrected the native mobile fallback display label from EDUNIXO to Classtago while preserving compatibility-critical legacy environment variable names.
- Corrected remaining user-facing EDUNIXO brand text in public school portal translations (English/Hindi/Urdu/Marathi and other entries in the same translation registry) to Classtago.
- Corrected one user-facing academic cloud error message to Classtago.

## Explicitly not changed
- Supabase table/schema identifiers
- localStorage/cache/event keys
- VITE_EDUNIXO_* / EDUNIXO_* compatibility environment-variable names
- Maria AI behavior or tool permissions
- Attendance, Admissions, Result, Mark System, Homework, Question Paper, Timetable, Communication or role workflows
- Render service identity or live API origin

## Remaining launch dependency
`VITE_EDUNIXO_API_BASE_URL` intentionally remains blank until the final live HTTPS backend origin is confirmed. Release APK/AAB signing and Firebase configuration are separate launch steps.
