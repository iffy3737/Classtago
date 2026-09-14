# Classtago R2.5.76 — Human Voice Engine

## Priority change
The Voice roadmap now prioritizes school-operational use cases over generic device-control commands. The next operational sequence is: Attendance absent-parent calls → AI School Receptionist → Admission enquiry/follow-up → Homework/Exam assistant → Fee reminders → Parent voice assistant → multilingual call analytics.

## What changed now
- Replaced browser-only robotic speech as the primary reply path.
- Added authenticated server-side Natural Human Voice rendering.
- Uses the existing server GEMINI_API_KEY with Gemini TTS by default, so no browser key is exposed.
- Optional Fish Audio integration is supported through server secrets and is preferred when configured, including a school-approved voice reference.
- Added voice direction profiles for normal assistant, absence notice, fee reminder, exam reminder and admission calls.
- Sensitive calls are explicitly directed to sound calm, caring and teacher-like rather than cheerful/robotic.
- Browser speechSynthesis remains only a fallback if natural TTS is unavailable.
- Assistant response prompt now avoids robotic boilerplate and speaks like capable school staff.
- No existing Attendance, Result, Admission, Timetable, Supabase auth or legacy Gemini route was removed or rewritten.

## Important production rule
Do not clone or imitate a real teacher's identifiable voice without that person's clear permission. A natural school-approved synthetic voice can still sound teacher-like without impersonating a specific staff member.

## Next build target
R2.5.77: Attendance Absent Parent Calling Engine — event trigger after attendance save, parent-language resolution, safe call queue, human teacher-style script, retry/answer status and audit trail. Actual PSTN dialing will be enabled only through a configured telephony provider; the ERP must never pretend a call was placed when no provider exists.
