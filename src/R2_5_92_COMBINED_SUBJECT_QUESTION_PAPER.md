# Classtago R2.5.92 — Combined Subject Question Paper Completion

## Scope
This release is an additive launch correction on the tested R2.5.91 baseline. Existing single-subject Question Paper, Attendance, Result, Homework, Admissions, Maria, Supabase and role permissions are preserved.

## Implemented
- Headmaster-only Combined Question Paper Group creation in Academic Setup.
- Group creation now requires selecting the member Subjects; Combined Paper groups require at least two Subjects.
- Combined Paper groups are explicitly tagged (`CQP_`) so general curriculum groups such as Languages/Science do not automatically appear as combined papers.
- Teaching assignments remain subject-by-subject. A complete group is never assigned to a Teacher.
- In multi-teacher combined papers, each assigned Subject Teacher can decide their own section marks.
- Each Subject Teacher selects only their own Textbook chapters and source scope.
- The first Teacher no longer locks or guesses the other Teachers' mark allocation.
- Final combined total for collaborative papers is calculated from the actual submitted Subject sections.
- Saved school paper patterns remain available, but a Subject Teacher may choose different section marks and continue with an editable pattern.
- Clerk continues to assemble/review collaborative Subject sections.
- Headmaster Combined Paper finalization UI was removed from the Combined workflow; Headmaster's Combined Subject responsibility is group configuration.

## Version
- Web/package: 0.2.92
- Android versionName: 0.2.92
- Android versionCode: 2592
