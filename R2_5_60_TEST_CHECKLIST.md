# Classtago R2.5.60 — Demo QA Checklist

## A. Instant Demo Pass
- Try Live Demo opens the Instant Demo Pass before curriculum setup.
- Premium hero shows: No approval / No waiting / Instant access.
- Name and School/Institution are required; Contact is optional.
- No OTP, password or approval step exists.
- Selecting an instruction language on the pass carries into Start Process/review/action guidance.
- Curriculum setup shows the chosen instruction language as locked from the Demo Pass, with a Change action.

## B. Process Hub session identity
- Visitor name and institution appear in the Process Demo header.
- Session changes begins at 0 and increments after workflow decisions.
- A process card indicates session activity after that process has been used.

## C. Cross-role completion quality
For any multi-role process:
1. Start step 1 and complete the user action.
2. Continue to the next role.
3. A Connected Hand-off panel must appear before Start Process.
4. It must show the previous role → current role, previous action and effects.
5. It must identify the current production module receiving the handoff.
6. Complete all steps.
7. Final System-wide Impact must show roles connected, workflow changes recorded and all performed actions/effects.

Recommended high-value checks:
- Admission: Clerk send → Headmaster queue → Confirm Student Master → Teacher → Student signup approval → Parent link.
- Attendance: Teacher mark → Catalogue → Student → Parent.
- Homework: Generate/publish → Student → Parent.
- Result: Teacher → Class Teacher → Result Book → Clerk Print Center → Headmaster publish → Parent Progress Card.
- Assignment: Headmaster assignments → Teacher dashboard scope.
- Timetable/Substitute: publish/allocate → Teacher view.
- Communication: Clerk draft → Headmaster publish → Parent receive.

## D. Control-faithful interaction regression
- Text fields type naturally only where actual text entry exists.
- Dropdown/radio/checkbox/date/file controls use matching interaction behavior.
- Review/approval pages never fake typing.
- Student/Parent/read-only pages remain read-only.
- Every new step still waits for Start Process.

## E. Mobile / language
- No horizontal viewport overflow.
- Connected Hand-off card stacks cleanly on phone widths.
- Final Impact map is readable on phone widths.
- Urdu instruction flow uses RTL direction; other supported languages remain LTR.

## F. Production safety
- No Supabase migration required.
- Existing production school records are untouched.
- Demo state is temporary/local and resettable.
