# Classtago R2.5.85 — Maria Phase 2 Functional AI

## Purpose
R2.5.85 starts Phase 2 on top of the confirmed R2.5.84 Gemini Live handshake build. It keeps the proven realtime audio path and adds the first role-aware functional ERP tool layer without rewriting existing owner modules.

## Maria identity + faster first start
- Human-facing assistant name is now **Maria** while Gemini Live remains the underlying provider.
- Live CTA is **Talk to Maria** and text chat is **Maria AI Assistant**.
- Secure Live pre-warm begins shortly after the Assistant screen opens.
- Pre-warm authenticates the Supabase session and school/role before Gemini connects, but does **not** open the microphone until the user explicitly taps Talk to Maria.
- Idle pre-warm expires after 90 seconds; ending a conversation schedules a fresh pre-warm.
- Existing gapless PCM playback, interruption flush, session resumption and context compression remain in place.

## Role-aware functional tools
Maria can now use the same server-side tool layer from realtime voice and typed chat to:
- read current authenticated school/role context and own notifications;
- read role-safe summaries for attendance, timetable, Study Material, academic plans, Homework, Question Paper, Results, My Students, communication/notices, leave, admissions, fees and Parent Portal;
- provide a verified school/receptionist context without inventing missing fees, timings or policies;
- read current Headmaster-assigned teaching scope for Teacher/Class Teacher/teaching Headmaster;
- prepare a Headmaster-only active-staff device dialer handoff;
- open the correct existing Classtago owner module for the signed-in role when a workflow must be completed there.

## Safety / preservation
- Permanent Gemini key remains server-side.
- School ID and role are derived from authenticated active membership; browser-supplied role/school is not trusted.
- Parent/Student summaries stay limited to own/approved linked student context.
- Teacher summaries stay inside teaching/class-teacher assignment scope.
- Existing write workflows (attendance save, AI Homework, Question Paper, Result submission, communication send, admission decision and fee operations) remain in their proven owner modules. Maria can navigate to them but does not falsely claim a write succeeded.
- No existing Admission, Result, Timetable, Supabase, SMS, Communication or authentication flow is removed.

## Phase 2 continuation after this checkpoint
After R2.5.85 runtime verification, Phase 2 continues with confirmation-gated Maria actions/drafts for the previously locked operational workflows (absence follow-up, fee reminder, admission follow-up, receptionist/parent workflows and other approved feature actions). This is a checkpoint inside Phase 2, not an additional phase.
