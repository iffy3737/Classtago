# R2.5.70 Test Checklist

1. Run `20260907235900_platform_admin_security_email.sql` in Supabase SQL Editor; expect Success / no rows returned.
2. Upload/import R2.5.70.
3. Login as Platform Super Admin -> SMS / OTP Gateway Setup.
4. Enter a valid mobile and optional OTP fallback email.
5. Confirm **Save Mobile & OTP Email** is clearly visible on mobile and desktop.
6. Save and confirm Step 1 becomes Configured and a green success message appears.
7. Refresh; confirm mobile and optional OTP fallback email persist.
8. Change the fallback email, save, refresh, and confirm the new value persists.
9. Clear the fallback email, save, refresh, and confirm it remains blank while the login email shown below remains unchanged.
10. Confirm browser preview still blocks native SIM registration as expected.
11. Do not perform final SMS/WhatsApp/email fallback test until Android gateway installation stage.
