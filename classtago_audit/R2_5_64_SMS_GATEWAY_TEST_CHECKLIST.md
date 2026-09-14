# Classtago R2.5.64 SMS Gateway Test Checklist

1. Existing login, Dashboard, Attendance, Results, Admissions and non-SMS Communication still open normally.
2. Apply the R2.5.64 SMS gateway Supabase migration.
3. Build/sync the Android app and install on a real Android phone with an active SIM.
4. Login as Headmaster or Clerk for the intended school.
5. Open Communication → Inbuilt SMS Gateway.
6. Confirm the app asks for SMS permission only after `Authorize & Start Gateway`.
7. Confirm device shows Online and permission Granted.
8. Enter the tester's own mobile number and send the real-SIM test.
9. Confirm queue transitions Queued/Processing → Sent; on failure, retry count increments and error remains visible.
10. From Headmaster → Audience-targeted Messages select SMS, send to a small verified audience and confirm jobs appear in the same gateway queue.
11. Confirm the same destination is not duplicated within one audience dispatch.
12. Stop Gateway and confirm queued messages remain queued rather than being silently marked delivered.
13. Login as Teacher/Student/Parent and confirm no gateway-control permission surface appears.
14. Verify school A cannot read/control school B gateway devices or queue rows.

Source validation completed in this workspace:
- TypeScript/TSX syntax parse: no TS1xxx syntax diagnostics in modified files.
- Java source parse: no Java syntax markers; Android SDK classpath was not available for a full Gradle compile in this environment.
- Full Vite/Android dependency build was not claimed because the extracted source ZIP did not contain node_modules or the Gradle wrapper.
