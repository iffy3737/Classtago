# Classtago R2.5.108

- Corrected the cumulative project package/build layout: application files are under `src/`, while root `package.json` now explicitly runs Vite, server, preflight, deployment and Capacitor commands from the application root.
- Updated go-live preflight to validate the actual packaged layout instead of expecting runtime files at the wrong root level.
- Preserved existing application source and database architecture; no Supabase schema changes. Maria untouched.
- Version synchronized to 0.2.108.
