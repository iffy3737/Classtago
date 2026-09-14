# Classtago R2.5.93 — Combined Group Subject Master Fix

## Purpose
Corrects the R2.5.92 placement of Combined Question Paper group configuration.

## Final architecture
- Existing Academic Setup → Subject Group Master remains faculty/curriculum classification only (Science, Commerce, Arts, Languages, etc.).
- Combined Question Paper Groups are configured inside Master Data → Subject Master, using the canonical live Subject Master list.
- Headmaster creates/edits/deletes the combined group only.
- Teaching assignments remain strictly subject-by-subject; a combined group is never assigned to a Teacher.
- Marks, Textbook and chapter selection remain with the assigned Subject Teacher(s).
- Teacher Question Paper engine continues to read only explicitly tagged `CQP_` groups.

## Subject Group Master repair
- Restored its original faculty/curriculum purpose.
- Add Group now includes subject membership selection so a new faculty/curriculum group can actually be created with members.
- Combined Question Paper groups are hidden from this screen.

## Subject Master combined-paper controls
- Create group from canonical active Subject list.
- Minimum 2 Subjects.
- Edit existing combined group.
- Delete combined group without deleting historical Question Papers.
- Dedicated server CRUD endpoints with Headmaster-only writes and audit entries.

## Safety
- No change to Subject Teacher assignment semantics.
- No change to Supabase Subject identities.
- No change to single-subject Question Paper generation.
- No change to Maria, Attendance, Result, Admissions or other established workflows.

## Verification
- Modified TS/TSX syntax: PASS
- Deployment Doctor: PASS
- Go-Live Preflight: PASS
- Package version: 0.2.93
- Android versionName: 0.2.93
- Android versionCode: 2593
