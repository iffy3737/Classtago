# R2.5.68 Platform Admin Gateway Setup — Test Checklist

## Browser / AI Studio
- [ ] Login as Platform Super Admin.
- [ ] Open **SMS / OTP Gateway Setup**.
- [ ] Step 1 loads the Super Admin's current mobile/email.
- [ ] Save a valid 10-digit India mobile or +91 mobile.
- [ ] Refresh page; saved mobile remains visible.
- [ ] Confirm browser shows that Android app is required for SIM gateway activation.
- [ ] Confirm no other Platform Admin tabs/regression issues.

## Android stage (next planned test)
- [ ] Install/open Classtago Android app on Super Admin phone.
- [ ] Login as Platform Super Admin.
- [ ] Open **SMS / OTP Gateway Setup**.
- [ ] Tap **Register / Start This Phone**.
- [ ] Grant SEND_SMS permission.
- [ ] Confirm device appears in Primary/Backup list.
- [ ] Confirm intended phone SIM is set as Android default SMS SIM.

## OTP stage (after Android registration)
- [ ] Send Super Admin Security OTP.
- [ ] Confirm SMS queue claims job through Primary gateway.
- [ ] Verify OTP and confirm one-time consumption.
- [ ] Later test WhatsApp and optional email fallback independently.
