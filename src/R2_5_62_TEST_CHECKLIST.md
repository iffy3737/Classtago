# R2.5.62 Test Checklist

## Language leak regression
- [ ] Hindi: System-wide Impact actions/effects are not stuck in English.
- [ ] Hindi: Actual Module Context / Automated for Demo / User Decides headings follow Hindi.
- [ ] Hindi: User decision/action narrative follows Hindi.
- [ ] Marathi/Urdu: repeat the same check.
- [ ] Urdu/Kashmiri/Sindhi: RTL alignment remains usable.
- [ ] If AI translation is unavailable, the demo remains functional and does not expose any API key.

## Process regression
- [ ] Admission completes canonical Clerk → Headmaster → Class Teacher → Student → Parent chain.
- [ ] Attendance reaches Student/Parent effect view.
- [ ] Homework publish reaches Student/Parent effect view.
- [ ] Result marks/review/publish reaches Progress Card effect view.
- [ ] Teacher Assignment updates Teacher-facing result.
- [ ] Timetable/Substitute cross-role hand-off remains intact.
- [ ] All 25 process cards open.

## Interaction fidelity
- [ ] Text fields type naturally only where the actual workflow has text input.
- [ ] Dropdowns/selects do not fake typing.
- [ ] Checkbox/radio/date/file controls use their corresponding demo behavior.
- [ ] Review/approval screens do not run unnecessary data-entry animation.
- [ ] Read-only Student/Parent screens stay read-only.

## Privacy/session
- [ ] Demo pass/session data is isolated to the current browser tab/session.
- [ ] Closing the tab removes temporary visitor session state.
- [ ] Reset Demo clears the current temporary state.
- [ ] 6-hour expiry resets safely.
- [ ] No production school record changes after demo actions.

## Conversion
- [ ] Setup request requires mobile + email + consent.
- [ ] Completed demo interests are attached.
- [ ] Lead appears in Platform Admin Leads.

## Deployment
- [ ] Host full build passes.
- [ ] `dist/index.html`, `dist/server.cjs`, `dist/server.js` are created.
- [ ] `/api/health` passes.
- [ ] `/demo` deep link and refresh work.
- [ ] Production role login smoke tests pass.
