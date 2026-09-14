# Classtago R2.5.68 — Platform Admin Gateway Setup Completion

Base: **R2.5.67 Smart Gateway Role Assignment**.

## Scope
This release only completes the **Platform/Super Admin SMS / OTP Gateway setup UX**. It does not change school academic, admission, result, attendance, teacher, student, clerk, headmaster, authentication, or other established ERP workflows.

## Added / improved
- Platform Admin tab renamed to **SMS / OTP Gateway Setup** for clarity.
- New **Step 1 — Super Admin Security / WhatsApp Mobile** setup.
  - Authenticated Super Admin can save the canonical security mobile directly from Platform Admin.
  - The same mobile is the WhatsApp-base security contact.
  - Account email is displayed as an optional OTP fallback contact.
- New authenticated Platform endpoints:
  - `GET /api/platform/security/contact`
  - `PUT /api/platform/security/contact`
- Clear separation between:
  - **Recipient/security mobile** (saved in the Super Admin profile), and
  - **Sender SIM** (the default SMS SIM on the registered Android gateway phone).
- Step-by-step Platform setup UI:
  1. Save Admin mobile.
  2. Install/open Android app and register the sender phone.
  3. Assign Primary/Backup gateway routing.
  4. Run Security OTP verification.
- Browser/AI Studio preview now explicitly explains that SIM activation requires the installed Android app.
- No sender SIM number field is added because the native gateway sends through Android's selected/default SMS SIM.

## Database
**No new SQL migration is required for R2.5.68.**
The previously applied R2.5.67 SMS/OTP prerequisite SQL remains sufficient.
