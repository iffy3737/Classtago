# Classtago R2.5.95 — Combined Subject Question Paper Final Fix

- Combined Question Paper Groups are created from the canonical Subject Master.
- Existing Subject Group Master remains reserved for faculty/curriculum grouping such as Science, Commerce, Arts and Languages.
- Combined groups use a reserved `CQP_` group code and are excluded from the faculty Subject Group Master.
- Headmaster creates/deletes combined paper groups; teaching assignments remain single-subject.
- Teacher marks, textbook and chapter selection remain subject-wise.
- Existing Combined Question Paper teacher/Clerk workflow is preserved.
- Teacher combined-group loader now reads only dedicated CQP groups.
- No database migration is required when `school_subject_groups` and `school_subject_group_members` already exist (the app's existing academic setup depends on them).
