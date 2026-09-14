# R2.5.57 Test Checklist

## A. Instruction language
- Open Demo Setup.
- Select **English** under Demo Instruction Language.
- Open any process.
- Confirm Start Process guidance, waiting/progress text, Pause/Resume, Your Action and What Just Happened headings are English (no Hinglish guidance copy).
- Repeat with Urdu / Marathi / Hindi and confirm the guidance panel changes language.

## B. Admission control fidelity
1. Admission → Clerk intake
   - Before Start Process: no automatic action.
   - Start Process.
   - Student/guardian/mobile/free-text fields type naturally.
   - Class/Medium/Board controls are selected, not typed.
   - Generated/status-style values are not fake-typed.
2. Continue to Headmaster Approval
   - Submitted values must already be visible before Start Process.
   - Start Process only guides/highlights review fields.
   - No typing animation on approval screen.
   - Approve Admission becomes available after review.
3. Student / Parent steps
   - Data already visible.
   - No typing.
   - Start Process runs a read-only walkthrough/highlight.

## C. Other interaction types
- Teacher Assignment: dropdown/selection behavior, not character typing.
- AI Lesson Plan: selections reveal one by one; no fake typing for Topic/Duration/Outcomes where the demo models them as prepared selections.
- Result Management → Subject Marks: numeric mark-entry fields use form-style entry; review/publish steps do not type.
- Timetable publish / Headmaster approvals: review mode only.

## D. Number-card consistency
- Open Process Demo Hub.
- Confirm process cards 1–25 all use the same cyan number box, including previously dark cards such as 11 and 13.
- Desktop step tracker number boxes use the same cyan styling.

## E. Mobile
- Test at phone width.
- No right-side blank overflow.
- Cards and controls fit within viewport.
- Start Process, Pause/Resume and action buttons remain reachable.

## F. Regression
- Role Explorer still opens.
- National/production school flows are unchanged.
- Demo reset still works.
- No production Supabase write is introduced by Process Demo.
