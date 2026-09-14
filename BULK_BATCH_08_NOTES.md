# Classtago Bulk Batch 08 — Maria root-cause navigation bridge

## Root cause found
The previous batches fixed route IDs and added an event/queue, but Maria navigation still depended on a browser `CustomEvent` reaching `DashboardOverview` at exactly the right React lifecycle moment. That is not a reliable command transport for a realtime voice agent. Maria could receive a successful server `clientAction`, say that the module was opened, while the UI command was not consumed by the active Dashboard instance.

A second source-level gap was found in dynamic academic actions: Mark List and Daily Attendance still emitted old `teacher-result-main` / `teacher-attendance-main` container IDs. Those could also be ignored by the visible role-module resolver.

## Fixes
1. `mariaClientBridge.requestMariaNavigation()` now calls a globally registered Dashboard opener directly when available, while retaining the queue + CustomEvent fallback.
2. `DashboardOverview` exposes the exact existing `openRoleModuleById()` function as the Maria navigation handoff. It remains the single authority for role, subscription and feature permissions.
3. Navigation returns success/failure internally instead of silently pretending that an invisible route was opened.
4. Maria Mark List dynamic commands now use canonical `tr-result-subject-marks`.
5. Maria Daily Attendance dynamic commands now use canonical `tr-attendance-daily`.
6. Generic Maria navigation wording now reflects that the authorised module is being opened, rather than claiming completion before the client handoff.
7. Existing leave confirmation, Question Paper/Homework builders, Result/Attendance workflows and security gates are preserved.

## Important phone-call limitation
The existing Maria phone tools are only device-dialer handoffs (`tel:`). A normal carrier/SIM call cannot be programmatically joined by browser/Capacitor Maria to speak a leave message. An actual automated outbound voice call requires a telephony provider and configured school-approved credentials. This batch does not fake that capability.

## Verification
- Source-level root-cause inspection completed against Batch 07.
- Full TypeScript build could not be completed because dependencies are not installed in the workspace; `npm install` timed out. `npm run lint` therefore reports missing dependency/type packages rather than a verified clean build.
