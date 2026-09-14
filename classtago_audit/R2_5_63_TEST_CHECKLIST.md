# R2.5.63 Test Checklist

## A. Language blocker regression
1. Open Instant Demo Pass and choose Hindi.
2. Run Result Management through completion.
3. Verify System-wide Impact action/effect lines are Hindi (not raw English).
4. Verify Connected Hand-off narrative is Hindi.
5. Verify Actual Module Context / Automated for Demo / User Decides guidance is Hindi.
6. Verify Continue-as role labels use localized role names.
7. Repeat a representative flow in Marathi and Urdu; verify Urdu RTL.
8. Switch back to English; verify normal English copy.

## B. Demo regression
1. 25 Process Explorer entries remain available.
2. Admission canonical workflow remains intact.
3. Result chain remains intact.
4. 3-minute and 10-minute tours open valid process IDs.
5. Per-tab private demo state and 6-hour reset remain active.
6. Lead conversion still requires explicit consent before sending.
7. No demo process writes directly to production school tables.

## C. Mobile / tablet / desktop
1. No horizontal page overflow at common phone widths.
2. Sticky actions remain reachable.
3. Language selector is scrollable and all 23 languages are reachable.
4. RTL does not clip cards/buttons.
5. Step tracker remains readable on phone and desktop.

## D. Go-live preflight
Run:

    npm run deployment:doctor
    npm run go-live:preflight

Expected:
- package version 0.2.63
- Android versionName 0.2.63
- Android versionCode 2563
- Render build/start/health wiring OK
- strict language fallback detected

For a real live origin:

    EDUNIXO_LIVE_ORIGIN=https://<your-live-host> npm run go-live:preflight:live

Before Android production APK/AAB, set `VITE_EDUNIXO_API_BASE_URL` to the same clean HTTPS production origin in the native build environment.

## E. Host smoke test after deployment
1. GET `/api/health` returns healthy response.
2. Main platform website loads over HTTPS.
3. School Finder opens a school public website.
4. School website login routes to ERP and preserves tenant context.
5. Super Admin login works.
6. Headmaster / Clerk / Teacher / Student / Parent representative logins work.
7. `/demo` loads and remains isolated from production school data.
8. Lead CTA reaches Super Admin Leads only after consent.
9. Android app points to the live HTTPS API origin and passes login/API smoke tests.
