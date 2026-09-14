# Classtago R2.5.65 — Scope / Regression Safety Audit

Base: **R2.5.64 Inbuilt SMS Gateway Phase 1**

## Change strategy
R2.5.65 is an additive/scoped communication-security release. It does not replace the existing ERP architecture, authentication database, academic modules, result engine, attendance engine, timetable engine, school finder, public school website, Supabase project, or R2 storage design.

## Files intentionally changed from R2.5.64
- `server.ts` — OTP security engine, multi-channel OTP delivery, critical-SMS policy enforcement, Platform Demo lead follow-up API.
- `src/App.tsx` — Platform SMS runtime integration already required by the R2.5.65 Platform OTP gateway.
- `src/components/AdmissionApplicationWizard.tsx` — guardian contact OTP before public admission submission.
- `src/components/EdunixoPlatformLanding.tsx` — registration/live-demo contact OTP; demo lead is saved before demo opens.
- `src/components/ProcessDemoHub.tsx` — demo-to-school-setup OTP.
- `src/components/PlatformAdminPortal.tsx` — Demo Follow-up desk + SMS/OTP Gateway tab.
- `src/components/PlatformSmsGatewayControlPanel.tsx` / `PlatformSmsGatewayRuntime.tsx` — Platform critical SMS gateway and Super Admin OTP.
- `src/components/HeadmasterCommunicationCloudWorkspace.tsx` — SMS available only for Urgent critical/emergency messages.
- `src/components/SmartCommunicationHub.tsx`, `ClerkCommunicationOffice.tsx`, `SmartLeaveManager.tsx`, Teacher communication files — routine SMS removed/policy-blocked.
- `src/components/SmsGatewayControlPanel.tsx` — critical-only policy wording/control.
- `src/lib/otpClient.ts`, `src/lib/platformSmsGateway.ts` — scoped OTP/platform-gateway client helpers.
- R2.5.65 Supabase migrations — additive tables/columns/RPC replacements for OTP, critical SMS and Demo Follow-up.
- Version/config/release documentation files.

## Preserved behavior
- Routine communications remain on Website/In-App/WhatsApp/Email.
- Existing logins are not converted to mandatory OTP login in this release; this avoids locking users out if a new transport is not configured.
- Existing Headmaster/Clerk/Teacher/Student/Parent modules remain structurally unchanged outside the scoped communication surfaces above.
- R2.5.65 migrations do not drop ERP tables or columns.
- Existing R2.5.64 Android SIM gateway remains compatible; its queue policy is tightened to critical categories.

## OTP failover rule
- SMS and WhatsApp are attempted independently.
- Email is optional and attempted only when an email address is present and Email OTP is configured.
- OTP request succeeds when at least one configured channel accepts the OTP.
- Therefore an offline/depleted SIM is not a single point of failure when WhatsApp or optional Email is operational.

## Static validation completed in packaging environment
- Parsed **253 TypeScript/TSX files** using the TypeScript parser: **0 syntax errors**.
- `package.json` and `metadata.json` JSON validity checked.
- No R2.5.65 migration contains table-drop/column-drop/truncate statements.
- Full Vite production build could not be executed in this packaging environment because npm registry dependency installation was unavailable; run `npm install` then `npm run build` in AI Studio/Codespaces/CI before production deployment.
