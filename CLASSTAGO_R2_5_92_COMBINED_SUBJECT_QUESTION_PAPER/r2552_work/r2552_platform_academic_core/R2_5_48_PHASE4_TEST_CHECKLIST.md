# EDUNIXO R2.5.48 — Phase 4 Preview Checklist

1. Open the global Language selector. Confirm English + all 22 Scheduled Indian Languages appear when school language policy allows all.
2. Open Smart Tools → On-device Translator. Confirm all Scheduled Indian Languages are visible; unsupported ML Kit translation languages are marked UI-only/disabled for translation.
3. Login Headmaster → Student Master. Open Profile, Guardian, Placement, Status/History and Documents. With a real student later, verify profile/guardian edits persist after reload.
4. Headmaster → Student Lifecycle. Confirm module root opens the Lifecycle workspace. Transfer/Pass-out/Leaving/Archive must require an office reason and an explicit confirmation.
5. Clerk lifecycle request flow: Clerk sends request → Headmaster sees Pending Clerk lifecycle requests → Approve/Reject. Promotion remains handed to Promotion Engine.
6. Headmaster → Admissions Review & Confirmation → Admission Confirmation. Approved application only; enter unique GR/class and confirm. Verify Student Master is created and profile details survive reload.
7. Headmaster → Teacher & Academic Assignments. Confirm Class Teacher Assignment, Teaching Assignment and Academic-year validity still open canonical assignment workspaces.
8. Headmaster → Result Management → Result Publication & Final Lock. Prepared batch must be reviewed before Publish & Lock. Missing Result Book or zero-student batch must remain blocked.
9. Re-test Teacher Attendance, Teacher Result, Clerk, login/logout and existing Admission flow for regression.
10. Confirm AI Studio logs no longer show the old "Legacy class/division lookup unavailable" warnings during signup reconciliation.
