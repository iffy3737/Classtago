# Classtago R2.5.94 — Clean AI Studio Combined Subject Fix

## Root cause fixed
R2.5.93 contained multiple historical full-project copies, each with its own package.json. Google AI Studio could resolve/import an older nested project instead of the active root application, so the new Combined Question Paper Group UI did not appear even though it existed in the root source.

## Changes
- Removed unused historical nested full-project directories: r2550_smart_resilience, r2551_work, r2552_work.
- Removed the obsolete packaged tgz snapshot.
- ZIP now contains one active application root and one package.json only.
- Combined Question Paper Groups remain inside the canonical Subject Master.
- Added a visible Subject Master header badge showing the number of Combined Paper Groups.
- Existing Subject Group Master remains reserved for faculty/curriculum grouping (Science, Commerce, Arts, Languages).
- Teacher assignments remain single-subject only.
- Marks, textbook and chapter selection remain with Subject Teachers.
- No Supabase schema, role-permission, admission, attendance, result, Maria, timetable or communication workflow was redesigned.

Version: 0.2.94 / Android versionCode 2594.
