# Classtago R2.5.65 — Critical SMS / Multi-channel OTP / Demo Follow-up Test Checklist

## A. Regression / scope
- [ ] Existing public platform landing renders normally.
- [ ] School Finder and school public site still open normally.
- [ ] Existing Headmaster, Clerk, Teacher, Student and Parent login flows remain usable.
- [ ] Existing Supabase-backed ERP modules load without SMS/OTP migration errors outside the new features.
- [ ] Routine Teacher communication has no SMS channel.
- [ ] Routine holiday reminder has no SMS channel.
- [ ] Headmaster routine SMS is rejected/skipped unless message priority is Urgent.

## B. Platform multi-channel OTP
- [ ] Configure EDUNIXO_OTP_PEPPER.
- [ ] Activate Platform Android SMS gateway and request Institution Registration OTP.
- [ ] Confirm OTP SMS job is queued with message_kind=otp and expires_at.
- [ ] Configure WhatsApp OTP webhook; confirm the same OTP challenge is also delivered through WhatsApp.
- [ ] With Platform Android SMS gateway OFF, confirm OTP can still be requested when WhatsApp is healthy.
- [ ] Optional: configure RESEND_API_KEY + OTP_EMAIL_FROM and confirm Email OTP delivery when email is supplied.
- [ ] With Email config absent, confirm registration/demo OTP still works through SMS/WhatsApp.
- [ ] Confirm wrong OTP decrements attempts and valid OTP verifies once.
- [ ] Confirm consumed OTP cannot be reused.
- [ ] Confirm expired OTP cannot be verified or delivered later by Android queue.

## C. Demo Follow-up
- [ ] Try Live Demo from public landing.
- [ ] Verify OTP and submit demo request.
- [ ] Confirm demo opens only after the verified lead is saved.
- [ ] Platform Admin > Demo Follow-up shows the new lead.
- [ ] Save Contacted / Follow Up / Qualified / Converted / Closed status.
- [ ] Save internal note and next follow-up date/time.
- [ ] Delete a completed test lead after confirmation; confirm it disappears.

## D. School Admission OTP
- [ ] Open a published school admission portal.
- [ ] Enter guardian mobile and request OTP.
- [ ] Confirm school SMS gateway job is queued if school gateway is online.
- [ ] Confirm WhatsApp is independently attempted when configured.
- [ ] If guardian email exists and Email OTP is configured, confirm Email backup is sent.
- [ ] Turn school SMS gateway off and confirm OTP still works through WhatsApp if configured.
- [ ] Verify OTP and submit admission application.

## E. Super Admin security OTP
- [ ] Open Platform Admin > SMS / OTP Gateway.
- [ ] Request security OTP while SIM gateway is online.
- [ ] Request security OTP while SIM gateway is offline but WhatsApp is configured; request must not be blocked by the UI.
- [ ] Verify and consume OTP.

## F. Native SMS gateway
- [ ] Real Android SIM device has SEND_SMS permission.
- [ ] Gateway test SMS succeeds.
- [ ] OTP SMS sends before lower priority critical jobs.
- [ ] SIM/operator failure records a failed/retry state without invalidating the OTP challenge when another channel already delivered it.

## G. Security
- [ ] OTP value is not stored as plaintext in edunixo_otp_challenges.
- [ ] Public client never receives the OTP value in API JSON.
- [ ] OTP requests are rate-limited by connection + destination/purpose.
- [ ] Platform security OTP destination cannot be supplied by the browser.
- [ ] Demo lead table is not directly readable/writable by anon/authenticated browser roles.
