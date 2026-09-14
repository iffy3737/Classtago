# Classtago R2.5.97 — Combined Subject Full-Flow Audit

## Scope audited
- Headmaster → Subject Master → Combined Question Paper Group.
- Existing Subject Group Master remains faculty/curriculum grouping and is not used for CQP.
- Teacher → individual Subject assignment.
- Same-teacher mode: one teacher owns every component subject and generates one complete paper.
- Multi-teacher mode: each teacher generates only their own subject section; Clerk assembles/approves the final combined paper.
- 2+ component subjects are supported; no History/Civics hard-coding.

## Corrections in R2.5.97
1. Combined-paper assignment lookup now tolerates canonical assignment IDs and cloud compatibility IDs in the teacher UI.
2. Combined save validates that the group still exists, is a CQP group, and the collaboration key matches the current Class/Division/Exam scope.
3. Same-teacher combined saves are server-validated to contain every configured group subject section.
4. Existing separate Subject Teacher assignments remain unchanged; Headmaster does not allocate component marks.
5. Materials remain teacher-owned and are selected by subject, so each component uses only its own Textbook source.

## Important verification status
This source tree has been statically audited and patched. A clean full TypeScript/build verification is not claimed because the source ZIP does not contain an installed dependency tree in the working environment. Runtime AI generation still requires the Google AI Studio/Preview environment with the project's configured backend and database.
