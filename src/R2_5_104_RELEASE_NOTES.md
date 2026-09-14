# Classtago R2.5.104 — Production Truth Hardening

- Removed remaining fabricated academic-year fallbacks from legacy Library, Attendance, and Statutory Register paths.
- Removed fabricated examination result counts from Statutory Registers; empty source data now remains empty.
- Library new-book form no longer seeds fake class/location/vendor/purchase values.
- Attendance exports/print surfaces no longer fall back to a fixed UDISE code or National High School/Taloda identity.
- Statutory Register print/header identity now reads configured school profile and academic years.
- Clerk and public website placeholder contact/address values are now neutral and do not expose demo phone/email details.
- No Supabase schema changes. No Maria changes.
