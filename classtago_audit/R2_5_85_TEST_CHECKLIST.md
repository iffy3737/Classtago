# R2.5.85 Test Checklist — Maria Phase 2

## A. Startup / voice
1. Login to any school role and open AI Assistant.
2. Confirm header says **Maria AI Assistant** and CTA says **Talk to Maria**.
3. Wait about 1–3 seconds. Confirm **Pre-warmed** / “Maria is ready for an instant start” appears when provider is ready.
4. Tap Talk to Maria. Mic must start only after this tap and conversation should start materially faster than the first cold R2.5.84 start.
5. Interrupt Maria mid-reply; playback must stop immediately and follow the new turn.
6. Confirm no beep/click regression.

## B. Tool tests by role
Teacher/Class Teacher:
- “Maria, meri aaj ki attendance ka summary batao.”
- “Maria, mera aaj ka timetable batao.”
- “Maria, mere Homework ka summary batao.”
- “Maria, Homework module kholo.”
- “Maria, Question Paper kholo.”

Headmaster:
- “Maria, aaj ki school attendance batao.”
- “Maria, admission applications ka summary batao.”
- “Maria, fees collection ka summary batao.”
- “Maria, communication module kholo.”
- “Maria, <active staff name> ko call karna hai.” (must only prepare/open device dialer; no silent call)

Clerk:
- “Maria, admission desk kholo.”
- “Maria, attendance register kholo.”
- “Maria, fees module kholo.”

Student:
- “Maria, meri attendance batao.”
- “Maria, mera timetable/result/homework kholo.”

Parent:
- “Maria, mere linked children dikhao.”
- “Maria, mere bacche ki attendance/result/homework batao.”

Peon:
- “Maria, bell timing kholo.”
- “Maria, notices kholo.”

## C. Security regression
- No role should open a module absent from its own visible role blueprint.
- Teacher must not read another teacher’s scoped academic records.
- Parent must not read an unapproved/unlinked child.
- Student must not read another student.
- Maria must not invent fee dues, marks, attendance or admission status if the canonical source is unavailable.
- Browser must never receive the permanent Gemini key.
