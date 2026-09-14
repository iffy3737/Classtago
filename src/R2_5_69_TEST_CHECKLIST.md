# R2.5.69 Test Checklist

1. Apply `20260907235500_platform_admin_security_contact.sql` in Supabase SQL Editor.
2. Upload/import R2.5.69 and open Platform Admin -> SMS / OTP Gateway Setup.
3. Confirm the old `Platform Super Admin user profile was not found` error is absent.
4. Save a valid Super Admin mobile number.
5. Refresh the page and confirm the saved mobile reloads.
6. Browser preview: Android registration remains unavailable by design.
7. Installed Android app: register the platform gateway and grant SEND_SMS permission.
8. Confirm there is no `EdunixoSmsGateway already registered` browser/native console warning from duplicate JS registration.
9. Send Platform Security OTP and verify it uses the saved platform security mobile.
10. Later perform SMS -> WhatsApp -> optional Email fallback testing as planned.
