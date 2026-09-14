Classtago Bulk Batch 03

Scope completed:
- Added secure cloud-backed /api/role/timetable feed for Student, Parent, Teacher and Class Teacher roles.
- Reworked RoleScopedTimetable to consume authenticated cloud timetable data instead of exposing teacher timetable from stale local browser data; parent child selection is passed as a scoped server request.
- Preserved existing local timetable fallback only for unsupported roles; teacher/class-teacher do not fall back to local timetable on cloud failure.
- Updated Role Self-Service timetable surface to use the same cloud feed.
- Removed the dark hero treatment from RoleSelfServiceWorkspace and aligned it with the premium light-theme direction.
- No database schema changes introduced.

Validation:
- Source-level inspection completed.
- Full TypeScript build not completed because project dependencies are not installed in the container; an npx TypeScript attempt timed out.
- No runtime Google AI Studio test claimed; upload/test is required in AI Studio.
