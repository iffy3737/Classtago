# Classtago R2.5.59 — Demo QA Checklist

## Build identity
- Package version must be `0.2.59`.
- Process Demo Hub must show all 25 processes.

## Core interaction checks
- A data-entry screen types only actual text/number fields.
- Dropdowns/selects do not appear as typed text.
- Checkbox/radio/choice/date/time/file controls use their matching interaction.
- Review/approval screens contain no fake typing.
- Read-only Student/Parent screens contain no entry animation.
- Each new guided step waits for the user's Start Process action where applicable.

## High-value end-to-end checks
1. Admission: Clerk → Headmaster → Student Master/GR → Class Teacher → Student signup approval → Parent link approval.
2. Result: Subject Teacher → Class Teacher → Result Book → Clerk Print Center → Headmaster publish → Parent.
3. Assignment: Headmaster assignment → Teacher scope update.
4. Attendance: Teacher P/A → monthly register → Student/Parent status.
5. Timetable/Substitute: Headmaster publish/allocate → Teacher view.
6. Homework: Teacher source/scope → generate/review/publish → Student/Parent.
7. Question Paper: Teacher generate/review → Headmaster finalization → Smart Print preview.
8. Communication: Clerk draft → Headmaster publish → Parent receive.
9. Library: Student request → Headmaster Digital Library issue → Student/Parent.
10. Inventory: Headmaster asset/write-off workflow; Clerk register remains generated support only.

## Responsive / language regression
- No horizontal page overflow on mobile.
- Step/action controls remain reachable on phone widths.
- Instruction language follows the demo language chosen during setup.
- Urdu/RTL guidance renders in the correct direction where supported.

## Production regression
- National High School login and established role modules remain unchanged.
- No production database migration is required for this build.
