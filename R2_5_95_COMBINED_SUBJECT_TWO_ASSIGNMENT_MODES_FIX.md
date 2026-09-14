# Classtago R2.5.95 — Combined Subject Two Assignment Modes Fix

## Purpose
Ensure Combined Question Paper correctly recognizes both supported assignment arrangements:

1. **Different Teachers:** History → Teacher A, Civics → Teacher B. Each Teacher prepares only their own Subject component; the Clerk combines the submitted components into the final combined paper.
2. **Same Teacher:** History → Teacher A, Civics → Teacher A. The same Teacher prepares both Subject components and Classtago generates one complete combined paper directly.

## Root cause
The Combined Subject group loader selected the **first active teacher assignment** found for each Subject. If more than one active assignment existed for a Subject, that first row could belong to another Teacher. As a result, a Teacher who actually owned every Subject in the Combined Group could be incorrectly detected as not owning all components, forcing the collaborative workflow.

## Fix
For every Combined Group component Subject, the loader now:
- first selects an active assignment belonging to the currently signed-in Teacher when one exists;
- otherwise selects the first active assignment for that Subject in the Class/Division;
- keeps the existing subject-by-subject assignment model unchanged;
- keeps different-Teacher collaboration and Clerk assembly unchanged;
- keeps same-Teacher direct combined generation unchanged once ownership is correctly detected.

## Safety
No database schema change. No change to Subject Master group semantics, Subject Teacher assignment semantics, Question Paper generation rules, Textbook source rules, Clerk approval, Results, Attendance, Admissions, Maria, Timetable or Communication.

## Version
0.2.95 / Android versionCode 2595.
