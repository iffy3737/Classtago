# Classtago R2.5.62 — Production Go-Live Readiness Audit

## Web deployment pipeline
Current Render configuration is structurally ready for a production validation deployment:
- Build: `npm install --legacy-peer-deps --no-audit --no-fund && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- `npm run build:full` creates frontend assets, bundles the Express server, writes `dist/server.js`, and runs the production build verifier.

This specifically protects against the earlier `Cannot find module /workspace/dist/server.js` class of startup failure because `tools/write-cloudrun-entry.mjs` creates `dist/server.js -> dist/server.cjs`, and `tools/verify-production-build.mjs` fails the build if `dist/index.html`, `dist/server.cjs`, or `dist/server.js` is missing/empty.

## Required production secrets/config
Render/build environment must have the real values for:
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `GEMINI_API_KEY`
- Cloudflare R2 values if large textbook storage is enabled

The repository examples contain placeholders only.

## Domain-dependent items
- Keep `VITE_EDUNIXO_PASSKEY_ENABLED=false` until the final HTTPS custom domain/WebAuthn RP ID is locked.
- After the final domain is active, validate school-site routes, `/demo`, authenticated ERP routes and browser refresh/deep-link behavior on that domain.

## Android readiness
The Android packaging foundation is present, but `.env.mobile` intentionally leaves `VITE_EDUNIXO_API_BASE_URL` blank. Before producing a real APK/AAB, set it to the final live HTTPS API origin and run the existing Android prepare/doctor/build flow.

## Demo readiness
- `/demo` is wired in `src/App.tsx` and lazy-loads `DemoExperience`.
- Demo state is session-isolated and auto-expires.
- 25 process demos and the premium entry/tour/conversion layers are retained.
- Selected-language process narrative now has a dedicated server translation path.

## Pre-launch verification checklist
1. Deploy this exact cumulative source to the chosen host.
2. Confirm the host build completes `npm run build:full` successfully.
3. Confirm `/api/health` returns healthy.
4. Open `/demo` in mobile + desktop and verify Instant Demo Pass, setup, process hub and at least Admission/Attendance/Homework/Result end-to-end.
5. Change Demo Instruction Language and confirm both previously leaked areas translate.
6. Submit one consented test Setup request and confirm it reaches Platform Admin Leads.
7. Test Headmaster, Clerk, Teacher, Student and Parent production logins separately from demo.
8. Validate Supabase/R2 operations with production secrets and no demo cross-write.
9. Validate custom-domain HTTPS/deep links.
10. Only after the web origin is final, set the mobile API base and build the signed Android release.

## Readiness conclusion
Source architecture is ready for a production deployment validation pass, but it should not be called fully live until the host completes the real full build, environment secrets are confirmed, `/api/health` passes, and the production role-login smoke test succeeds on the final domain.
