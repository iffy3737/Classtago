# Classtago R2.5.62 — Final Demo Regression & Security Audit

## Scope
This audit covers the cumulative process-based demo built through R2.5.61 plus the R2.5.62 language-leak and session-isolation hardening.

## Regression results
- 25/25 demo processes preserved.
- 100/100 guided process steps preserved.
- Every step has an explicit interaction mode: 32 form, 16 selection, 24 review, 28 read-only/view.
- Control model remains production-faithful: text/textarea/number/password, dropdown/select, multiselect, radio/choice, checkbox, date/time/datetime, file, status and read-only controls are represented explicitly.
- Admission canonical chain remains intact.
- Result, Attendance, Teacher Assignment, Timetable, Substitute, Homework, Question Paper and other audited workflows remain in the cumulative catalog.
- 23/23 supported demo instruction languages are present.

## R2.5.62 language-leak fix
The two mixed-language areas reported from mobile screenshots are fixed at the process-runner layer:
1. System-wide Impact action/effect narrative now uses process narrative translation instead of permanently rendering canonical English strings.
2. Actual Module Context / Automated for Demo / User Decides cards now use the selected instruction language for their guidance labels and user-decision narrative.

A server-only, rate-limited endpoint `/api/public/demo-process/translate` translates only Classtago demo action/effect/guidance copy. It does not accept tenant records and preserves template tokens such as `{student}`, `{teacher}`, `{class}` and `{subject}`. Translations are cached server-side and in the browser session.

## Demo isolation/security checks
PASS — Demo components do not directly call Supabase or write production school tables.

PASS — Demo network calls are restricted to these public/safe routes:
- `/api/public/demo-catalog`
- `/api/public/demo-manual/translate`
- `/api/public/demo-process/translate`
- `/api/public/institution-interest` only after explicit conversion consent

PASS — Demo translation endpoints keep Gemini credentials server-side.

PASS — No `dangerouslySetInnerHTML`, direct `innerHTML`, cookie manipulation or direct external navigation was found in the main DemoExperience / ProcessDemoHub surfaces.

PASS — No hard-coded Supabase secret/service-role key, Gemini key or other obvious private credential was found in the source tree. References in `.env.example` and comments are placeholders/documentation only.

PASS — Institution conversion endpoint already includes server-side sanitization, valid email/mobile checks, explicit consent requirement, honeypot handling and per-IP rate limiting before writing to `platform_institution_leads`.

PASS — Visitor name/institution/contact and demo workflow state are now stored in `sessionStorage`, not persistent `localStorage`. Closing the browser tab/session removes the temporary visitor state. The 6-hour expiry/reset is retained.

PASS — Known legacy R2.5.60/R2.5.61 demo localStorage keys are cleaned without touching production ERP storage namespaces.

PASS — RTL direction is retained for Urdu, Kashmiri and Sindhi instruction flows, including completion/impact and bottom context cards.

## Build validation
PASS — TypeScript syntax-level transpile check succeeded for:
- `src/components/DemoExperience.tsx`
- `src/components/ProcessDemoHub.tsx`
- `server.ts`

PASS — Process catalog static audit: 25 unique processes / 100 steps / 100 explicit interaction modes.

PASS — Language catalog static audit: 23 unique instruction languages.

LIMITATION — Full dependency install/build could not be completed in this execution environment because `npm install` timed out and no `node_modules` directory was created. The deployment environment must still run the existing full build pipeline.

## Final demo security status
The demo layer is ready for deployment validation. It remains intentionally isolated from production school data; the only persistent server write reachable from the demo is the explicit, consent-gated school-setup lead submission.
