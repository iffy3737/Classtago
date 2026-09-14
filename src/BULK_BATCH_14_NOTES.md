# CLASSTAGO BULK BATCH 14

## Security / role fail-closed hardening
- Strengthened `verifyActiveUserAuth` in `src/server.ts`.
- Active school membership role is now normalized and validated against Classtago's supported application roles before any active-user route is entered.
- Unknown/arbitrary legacy role strings now fail closed with HTTP 403 instead of being propagated as an authenticated application role.
- Supported roles: super_admin, headmaster, clerk, teacher, class_teacher, student, parent, peon.
- Existing authentication, school membership lookup, module access evaluator, Supabase schema, and role workflows were not rewritten.
- No dummy data.
- Maria untouched.
