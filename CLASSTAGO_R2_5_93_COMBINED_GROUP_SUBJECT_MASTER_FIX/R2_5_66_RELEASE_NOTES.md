# Classtago R2.5.66 — Simplified Instant Live Demo

Base: Classtago R2.5.65 Critical SMS + Multi-Channel OTP + Demo Follow-up.

## Live Demo form simplified
The public Live Demo form now contains only:
- School Name (required)
- Role (Headmaster / Clerk / Teacher / Student / Parent / Super Admin)
- Mobile Number (WhatsApp) (required)
- Email (optional)
- Send OTP / Verify OTP
- Start Live Demo

Removed from the Live Demo flow only: school website, platform, address, contact name, designation, student/staff counts, module selection, additional requirements and consent checkbox. Institution Registration remains unchanged.

## Instant demo access
OTP verification is the access gate. There is no manual approval or waiting step. After the verified lead is recorded, Start Live Demo opens the selected role directly in the isolated demo workspace. The entered School Name is used in the demo context.

## Multi-channel OTP retained
The existing R2.5.65 OTP policy remains intact: SMS and WhatsApp are attempted when configured, Email is optional, and one unavailable SMS gateway must not become the only path to OTP delivery.

## Platform Admin follow-up retained
Every OTP-verified Live Demo request is still saved in Platform Admin -> Demo Follow-up. The selected demo role, mobile/WhatsApp number, optional email, reference, status and follow-up data remain available for follow-up and deletion after completion.

## Scope safety
No existing ERP role/module was removed. No existing database migration was rewritten. R2.5.66 adds no new migration; the R2.5.65 OTP and Demo Follow-up migrations are still required for those features.
