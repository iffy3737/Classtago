# Classtago R2.5.98 — Combined Subject Full-Flow Audit

## Root cause found
The live Supabase project uses `school_subject_teacher_assignments` as the canonical teaching-assignment source, but the Combined Question Paper implementation was still depending on the retired `edunixo_teacher_assignments` projection and on Question Paper tables that were not present in the live database.

This caused failures before a real Combined Paper could be completed. In particular:
- Combined-group loading could hit the missing Question Paper Pattern / legacy projection tables.
- Combined save required a legacy assignment projection that does not exist in the live project.
- Clerk/Headmaster Combined Paper queues depended on the legacy assignment projection.

## R2.5.98 correction
- Combined Question Paper access and persistence now use the canonical `school_subject_teacher_assignments` IDs directly.
- Same-teacher and different-teacher flows use the same canonical assignment identity.
- Clerk collaboration queue resolves Class / Division / Subject / Academic Year from canonical assignment tables.
- Section-return validation uses canonical assignments.
- Headmaster Question Paper review/finalization uses canonical assignments.
- Missing optional saved Question Paper Pattern storage is treated as unavailable rather than crashing Combined Group discovery.
- Added the required Question Paper persistence tables through `supabase/migrations/20260912090000_combined_question_paper_canonical_storage.sql`.
- No dummy data was added.

## Supported Combined Subject model
- Any active canonical Subjects can form a CQP group.
- Minimum: 2 Subjects.
- No hard-coded History/Civics logic.
- 3, 4, 5 or more component Subjects remain supported.
- Headmaster configures the group only; no Teacher or marks allocation is stored in the group.
- Teaching assignments remain one Teacher ↔ one Subject.
- Same Teacher owning all component Subjects generates one complete paper.
- Different Teachers generate their own component sections; Clerk combines all submitted sections.
- Each Subject section keeps its own Textbook, chapter selection and marks.

## Live database verification performed
The configured Supabase project was checked before the correction:
- 3 active CQP groups existed, with 6 group-member rows.
- Active canonical Subject Teacher assignments existed.
- The live database had no `edunixo_teacher_assignments`, `edunixo_question_papers`, `edunixo_question_paper_questions`, or `edunixo_question_paper_patterns` tables.
- The live data included a real same-teacher CQP case: EVS-I + EVS-II for Class 5, both assigned to the same teacher, with one ready Textbook for each Subject.

The missing persistence tables were then installed in the live Supabase project and verified by schema query.

## Verification status
- Database prerequisite: verified after migration.
- Canonical assignment identity: patched.
- Generic 2+ Subject design: verified statically.
- Same-teacher EVS-I + EVS-II data path: structurally verified against live assignments/materials.
- Different-teacher path: code-path audited; no dummy Teacher/assignment data was inserted into production for testing.
- Full TypeScript/Vite build: not claimed as passed because this archive does not contain an installed dependency tree and the environment's `npm install` timed out.

## Important
This ZIP is R2.5.98 and supersedes the earlier R2.5.97 Combined Subject package. After importing the cumulative ZIP into Google AI Studio, restart the Preview so the updated server bundle/routes are active.
