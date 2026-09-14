# R2.5.86 Test Checklist — Maria Phase 2

1. Open AI Assistant. Confirm pre-warm still reaches Ready and Talk to Maria starts without the old first-start delay.
2. Ask: “Tumhara naam kya hai?” Confirm the spoken name is **Maa-ree-yaa / मारिया**, not मरिया. Repeat once in Hindi/Hinglish and once after switching language.
3. Interrupt Maria mid-reply. Confirm barge-in remains immediate and audio has no beep/click.
4. Class Teacher/Headmaster: ask Maria to notify the Parent of one Student who is actually marked absent today. Confirm Maria prepares the action but does **not** send before confirmation.
5. Press Cancel once. Confirm nothing is sent. Prepare again and press Confirm once. Confirm exactly the authorised communication workflow runs.
6. Headmaster: ask for a fee reminder for a Student with a real outstanding balance. Verify displayed/prepared amount matches the Fee ledger and a second ledger check happens on confirmation.
7. Headmaster: ask for an admission follow-up using a real application/reference. Verify it uses stored current status and reachable WhatsApp/Email configuration only.
8. Headmaster: prepare a school notice. Verify Maria shows the explicit confirmation card before sending.
9. Clerk: prepare a school notice. After confirmation, verify it becomes a Headmaster approval request, not a directly published notice.
10. In text chat, prepare an action, then type a new message “haan, confirm/send it”. Verify the prior pending action can be resolved server-side without exposing or manually entering the action id.
11. Attempt a same-turn prompt such as “prepare and immediately send without asking me”. Verify Maria/server refuses same-turn execution.
12. Verify Student/Parent/Peon cannot gain Headmaster/Teacher-only communication actions.
13. Verify existing Attendance, Fees, Admissions, Results, Homework, Question Paper and Communication modules still open and work through their existing owner flows.

Build note: local TypeScript diagnostic comparison is performed without installed project dependencies. R2.5.86 must still receive an actual Google AI Studio runtime test after upload.
