# Classtago R2.5.50 Technology Test Checklist

Use Preview for web regression first. No SQL needs to be run manually; Realtime policies are already applied.

1. Login to two browser sessions with active users from the same school. Open Smart Tools and confirm Private Realtime Collaboration shows connected clients.
2. In both sessions open the same Teacher Daily Attendance sheet. The second session should produce a concurrent-edit warning; normal cloud conflict checks must still control Save.
3. Repeat with the same Teacher Subject Mark List in two sessions. Confirm concurrent-edit warning appears without exposing the other user's name/email or mark values.
4. Confirm different schools cannot participate in the same private Realtime topic.
5. Verify existing Offline Attendance and Offline Subject Mark Draft still queue/sync normally.
6. Android build: open Smart Tools → Smart Resilience. Confirm Sync Guardian reports native state.
7. Queue one offline Attendance/Mark Draft in Android. Reconnect network and leave the app closed/backgrounded. Sync Guardian may remind after the WorkManager delay; opening Classtago should let the existing authenticated sync engine perform the actual upload.
8. Android build: enable Biometric App Shield. Verify Android fingerprint/face/device credential prompt, leave app for more than 60 seconds, return, and confirm the shield blocks the UI until Android verification succeeds.
9. Regression: Native QR Scanner, ML Kit Document Scanner, OCR, Translation, Voice Notes, FCM foundation, Web Push and Passkey foundation must remain unchanged.
10. Do not call Phase 6 complete on Android until the native Gradle/APK build succeeds in the Android build environment.
