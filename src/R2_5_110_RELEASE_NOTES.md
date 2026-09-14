# Classtago R2.5.110 — Final Go-Live Hardening

- Fixed root `build:app` and `preview:app` scripts for the cumulative `src/` application layout.
- Removed remaining fabricated Master Data teacher/class/division defaults; new records now start from configured school data or blank.
- Clerk master result templates now resolve the active configured academic year at runtime.
- Added a cloud-backed current-user notification feed. Student, Parent and Peon Communication views no longer depend on the legacy localStorage communication hub.
- Preserved existing role-specific notification read endpoints and all canonical communication workflows.
- No Supabase schema changes. Maria remains paused.
- Removed remaining active-year UI literals from Leave and Timetable configuration; both now use configured academic years.
- Default Clerk templates no longer carry a fixed academic year; Result Management injects the configured year at runtime.
