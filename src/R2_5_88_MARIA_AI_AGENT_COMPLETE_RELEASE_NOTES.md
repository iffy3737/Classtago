# Classtago R2.5.88 — Maria AI Agent Complete Integration

This cumulative build consolidates the Maria AI work completed after R2.5.87 while preserving existing ERP workflows.

## Included
- Maria realtime Gemini Live voice + text assistant with role/school scoped tools.
- Visible name Maria with spoken pronunciation guidance “Maariya / मारिया”.
- Secure pre-warm, interruption/barge-in, reconnect/session handling, multilingual/code-switching and selectable voice/persona.
- Dynamic academic action bridge on top of existing Classtago modules.
- Voice mark-entry control layer with:
  - vertical column entry,
  - horizontal student/roll entry,
  - manual cursor anchor (“start from here”),
  - spoken number / Absent normalization,
  - existing marks validation and existing Save/Submit authority preserved.
- Homework and Question Paper handoff/generation via existing module flows; current Study Material, preview/edit/save/publish/print/PDF behavior remains authoritative.
- Academic generation handoffs for Year Plan, Daily Teaching Plan, Lesson Plan, Teaching Diary and Classwork/Assignments.
- Attendance draft assistance layered over the existing attendance workflow.
- Parent Portal action support for linked-child workflows.
- Confirmation-gated fee reminder, absent-parent follow-up, admission follow-up and school notice actions.
- Public school website Maria Receptionist with public-only school scope.
- Staff/parent/school-number device dialer handoff where authorised.
- Tool timeout/session/security controls and server-side Gemini credentials.

## Preservation rule
Maria is an optional AI control layer. R2.5.88 does not replace the Mark System, Homework module, Question Paper module, their existing UI/data models, or their Save/Submit/approval workflows.

## Android calling limitation
Normal carrier/SIM-call audio injection is not claimed by this build. Authorised dialer handoff is included; in-app AI voice remains the supported conversational path.
