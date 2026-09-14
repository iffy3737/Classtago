# Classtago Bulk Batch 05 — Maria Live Navigation Fix

## Root cause found
Maria was successfully returning `clientAction.type = navigate`, but the server was emitting old `*-main` catalogue/container IDs such as `teacher-question-paper-main`. DashboardOverview only opens canonical visible module IDs such as `tr-question-paper-first-term`, so the navigation event was safely ignored and the old screen remained visible.

## Fix
- Maria teacher routes now emit canonical production module IDs.
- Question Paper now opens `tr-question-paper-first-term`.
- Attendance, timetable, academic, homework, results, students, communication, notices, leave and profile routes were aligned to the existing visible modules.
- Headmaster Maria routes were aligned to canonical visible modules; Headmaster's teaching-owned academic/question-paper routes use the existing teacher workspace modules already exposed to the Headmaster teaching identity.
- No Maria permission model, write workflow, Question Paper generation logic, or existing module implementation was changed.

## Expected runtime
When Maria says she opened a module, the visible ERP workspace should actually switch to that module. The same navigation path is still role/entitlement checked by DashboardOverview.
