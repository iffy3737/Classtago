# Classtago R2.5.63 — Language Hard Lock + Go-Live Closure

## Scope
This cumulative release is based on R2.5.62 and closes the two remaining demo/go-live readiness items without changing production school data or applying destructive Supabase migrations.

## 1) Demo instruction-language hard lock
The previous asynchronous translation path could fall back to raw English when a translation response was unavailable or late. R2.5.63 prevents that failure mode for guided demo narrative.

### Hardened surfaces
- Process action / decision labels
- Connected hand-off narrative
- What happened / system effects
- System-wide Impact cards
- Actual Module Context
- Automated for Demo
- User Decides
- Role transition / Continue-as labels
- Completion / replay / another-process controls
- Common demo field labels and statuses
- Mobile and desktop step trackers

### Hindi / Marathi / Urdu
Hindi, Marathi and Urdu now have strict local runtime fallback copy. Hindi additionally includes exact action/effect translations for the Result Management chain and other high-value demo actions. Urdu remains RTL-aware. The server translation service may still improve copy when available, but raw English narrative is no longer the runtime fallback for these selected languages.

### Other supported demo languages
All 23 configured demo instruction languages remain available. When server translation is available, translated narrative is cached per session. Non-English mode no longer intentionally uses raw English as the narrative fallback path.

## 2) Go-live source-package closure
- Web package bumped to 0.2.63.
- Android native project synchronized to versionName 0.2.63 / versionCode 2563.
- `tools/deployment-doctor.mjs` passes.
- Added `tools/final-go-live-preflight.mjs`.
- Added npm commands:
  - `npm run go-live:preflight`
  - `npm run go-live:preflight:live`
- Render Blueprint wiring verified at source level: install/build, start, and `/api/health`.
- Native Android production build remains guarded: a real HTTPS API origin must be supplied before APK/AAB production packaging.

## 3) Production safety
- No production school records changed.
- No destructive SQL/migration added.
- No Supabase RLS / SECURITY DEFINER permissions changed in this release.
- Existing security-advisor findings are treated as a separate hardening backlog because changing them without dependency testing could break established ERP workflows.

## 4) External deployment boundary
This package is deployment-ready at source/configuration level, but an actual Render publish and live Android API-origin binding require the target hosting account/origin. They are not represented as completed until the deployed host is built and health-checked.
