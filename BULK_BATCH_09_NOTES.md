# Classtago Bulk Batch 09 — Maria Navigation Root-Cause Fix

## Root cause identified
Previous fixes still relied primarily on an in-memory React CustomEvent/global opener handoff. The voice path was improved, but the text path still rendered a navigation action as a button, and neither path had a durable URL-route fallback. Question Paper modules also use the `overview` dashboard tab while rendering the focused TeacherWorkspace, so navigation must target the module/view context rather than only an event.

## Fix
1. Added a single Maria navigation bridge with three layers:
   - direct call to the existing guarded DashboardOverview module opener;
   - URL hash navigation consumed by the existing DashboardOverview direct-route resolver;
   - existing `edunixo_smart_navigate` event compatibility fallback.
2. Added canonical module→tab hints for Teacher, Headmaster and Clerk operational modules.
3. Text Maria now immediately executes a `navigate` clientAction through the same bridge instead of requiring a second button tap.
4. Server navigation action carries an explicit status message; frontend performs the actual navigation.
5. Existing role/plan/feature permission checks remain authoritative. No direct rendering bypass was added.

## Expected result
- Text: "Question Paper wala module open karo" -> actual Question Paper workspace opens immediately.
- Voice: same request -> actual Question Paper workspace opens immediately.
- If a module is not permitted/visible, the existing Dashboard permission guard prevents opening instead of silently claiming success.

## Scope
No database schema changes. No replacement of existing Question Paper, Homework, Result, Attendance or Leave workflows. No dummy data.
