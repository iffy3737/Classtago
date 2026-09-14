# R2.5.89 — Classtago Brand Migration

## Purpose
Final pre-launch product-brand migration from **Classtago** to **Classtago**.

## Changed user-facing surfaces
- Browser/page title and primary platform branding
- Platform landing/admin/login labels
- Top bar and footer branding
- Public school website “Powered by” / verified-platform wording
- Android display app name and activity title
- Capacitor display app name
- Smart Print / generated-document branding and footers
- Communication, notifications, Maria-facing platform copy, OTP labels and other visible runtime text
- Package display metadata/version updated to R2.5.89

## Compatibility rule
The pre-launch Android identity is migrated to `com.classtago.app` and the app deep-link scheme is migrated to `classtago://` so the public Android identity matches the final brand before Play Store launch.

Compatibility-critical legacy identifiers that are already embedded in app data/infrastructure are intentionally preserved where renaming could break existing sessions or backend integrations. Examples include `EDUNIXO_*` environment-variable names, `edunixo.*` local-storage/cache keys, selected internal event/header names, existing worker filenames and historical database/migration identifiers. These are not user-facing product branding.
