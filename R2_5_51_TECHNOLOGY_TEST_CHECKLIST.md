# Classtago R2.5.51 — Smart Automation & Predictive Intelligence Test

1. Upload the cumulative ZIP to AI Studio and open Preview.
2. Login as Headmaster.
3. Open **Smart Tools**.
4. Locate **Smart Automation & Predictive Intelligence**.
5. Confirm the cards show Attendance Risk, Result Readiness, Workload Pressure and Operational Anomalies.
6. Current production has insufficient Student/Attendance data, so Attendance Risk should explain that at least 5 marked days are required instead of inventing a score.
7. Result Readiness must not create missing-result alerts until a Result cycle has actually started.
8. Teacher workload should read current Subject Teacher weekly-period assignments.
9. Confirm all three automation rules start **OFF**.
10. Click **Preview** on a rule. It must calculate findings and create an audit run, but send no notification.
11. Click **Alert now** only for a deliberate test. A Headmaster notification is created only if current findings exist.
12. Enable one rule and confirm its state becomes ON. Disable it again after testing if you do not want scheduled alerts yet.
13. Confirm Automation audit shows recent preview/run status, finding count and alert count.
14. Regression test Login, Attendance, Result, Staff, Admissions once. This release does not modify those workflows.
15. Do not manually rerun migration SQL; the production migration is already applied.

Runtime note: full Vite production build was not available in the packaging sandbox because project node dependencies were not installed. AI Studio install/Preview is the runtime gate.
