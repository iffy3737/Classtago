# R2.5.58 — Demo Process Audit 01: Admission

## Source-of-truth audited
The Admission demo was compared against the current production source surfaces:
- Clerk `New Student Admission` / Admission Desk
- Headmaster `Admissions Review & Confirmation`
- Class Teacher `My Students` and `Student Signup Approvals`
- School login `Student Portal Signup`
- School login `Parent Portal Signup`
- Headmaster `Parent Accounts & Child Links`
- Student and Parent portal role views

## Canonical chain now represented
1. Clerk — Student Demographics
2. Clerk — Parents & Contacts
3. Clerk — Address & School History
4. Clerk — Medical, Documents & Office Setup
5. Clerk — Save Intake & Send to Headmaster
6. Headmaster — Final Verification
7. Headmaster — Approve Application
8. Headmaster — GR & Academic Allocation
9. Headmaster — Confirm Admission & Create Student Master
10. Class Teacher — New Admission notification / roster visibility
11. Student — GR-based Student Portal signup
12. Class Teacher — Student Signup Approval
13. Student — Active Student Portal view
14. Parent — GR/PEN-based Parent Portal signup
15. Headmaster — Parent Account & Child Link approval
16. Parent — Linked Child view

## Important correction from R2.5.57
The Clerk does **not** create or activate the Student login. Final admission confirmation creates the canonical Student Master and makes the assigned GR eligible for Student registration. The Student submits the GR-based signup, and the authorized Class Teacher approves the pending Student Portal account. Parent signup is a separate GR/PEN + registered-mobile flow and remains Headmaster-approved.

## Control fidelity locked for audited Admission screens
- Text/textarea/number inputs: natural typed sample entry only where the production screen has an input.
- Date inputs: date selection behavior, not character typing.
- Select controls: dropdown selection.
- Radio controls: radio choice.
- Checkbox controls: checked/unchecked state.
- File inputs: sample file selection/upload simulation.
- Review/approval screens: submitted data is pre-visible; no fake typing.
- Read-only Student/Parent views: existing canonical data only.

No production database, Supabase schema, authentication, or role permissions are changed by this demo audit.
