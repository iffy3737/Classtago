# Classtago R2.5.90 — Safe Visible Brand Purge

## Goal
Complete the public/user-facing product rename to **Classtago** without breaking existing data, sessions, Supabase schemas, native plugin bridges, cached settings, or existing integrations.

## User-visible changes
- Browser/app metadata now identifies the product as Classtago.
- Android app name/deep-link scheme remain Classtago (`com.classtago.app`, `classtago://`).
- Push notification default titles and Android notification/channel labels now say Classtago.
- Android scanner saves new scans under `Downloads/Classtago` with Classtago filenames.
- Staff Master, Master Data, Timetable, Blank Mark List, Certificate Bulk Template, Bulk Admission Template, generic Excel exports, and scanned PDF filenames now use Classtago.
- Tamil public landing translation no longer contains the old public brand.
- Public request/reference fallback now uses `CLASSTAGO-REQUEST`.
- Maria/print/public UI branding remains Classtago.
- Developer/go-live console prefixes were rebranded to Classtago where they are presentation-only.
- New `classtago:` native deep links are accepted, while the legacy scheme is retained as a compatibility fallback.

## Compatibility policy
Legacy internal identifiers are intentionally retained where changing them could break a working system. These include selected database/table names, environment-variable names, CSS hooks, local-storage/cache/event keys, HTTP compatibility headers, service-worker/worklet filenames, and Capacitor native plugin/class names. They are implementation identifiers, not user-visible branding.

## Safety rule
No Mark System, Homework, Question Paper, Result, Attendance, Admissions, Maria AI, authentication, Supabase data model, or permission workflow was redesigned in this release. This is a scoped branding/safe-compatibility release.
