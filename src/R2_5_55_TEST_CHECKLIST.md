# Classtago R2.5.55 Process Demo Test Checklist

## 1. Entry
- Open Try Live Demo.
- Select Board / State / Medium.
- Open Demo School.
- Confirm **Explore School Processes** is the primary CTA.
- Confirm **Explore by Role** remains available as a secondary path.

## 2. Process Hub
- Confirm 25 process cards are visible/searchable.
- Test category tabs: Admissions & Student Journey, Academic Setup & Staffing, Daily School Operations, Teaching & AI, Exams & Results, Communication & School Services, Platform & Documents.
- Confirm core cards show Interactive Process and supporting cards show Guided Process.

## 3. Admission reference flow
- Open Admission.
- Clerk form should auto-type field values.
- Submit Application must remain disabled until auto-fill completes.
- Click Submit Application.
- Confirm “What just happened” appears.
- Continue as Headmaster.
- Approve Admission.
- Continue through Class Teacher receive, Student login creation, Student view and Parent view.
- Confirm applicant and guardian names remain consistent.

## 4. Production module context
- At every process step, confirm left-side Actual Role Navigation changes with role.
- Confirm relevant production module is highlighted (examples: New Student Admission, Admissions Review & Confirmation, Academic Year & Class Setup, Teacher & Academic Assignments, Smart AI Timetable, Daily Attendance, AI Homework, Subject Marks List, Class Mark List, Result Management).

## 5. Dynamic shared effects
- Attendance process: Mark Absent & Save. Then Role Explorer Student/Parent attendance should reflect the shared demo status.
- Homework process: Publish Homework. Student/Parent demo should show published homework.
- Result process: submit marks then Headmaster publish; Student/Parent result should show published state.
- Timetable process: publish; demo timetable version should increment.
- Admission process: submit then approve; demo admission counts should update.

## 6. Locale-aware data
- State Board -> Maharashtra -> Marathi: confirm Maharashtra/Marathi-context fictional school/persona names.
- State Board -> Gujarat -> Gujarati: confirm Gujarati-context fictional school/persona names.
- CBSE -> English: confirm broad pan-India mixed sample names.
- State Board -> Maharashtra -> Urdu: confirm Urdu-medium regional context.
- Confirm role/process data does not stay stuck on one community/name set across curricula.

## 7. Supporting feature depth
- Open Fees, Library, Staff & Accounts, Payroll/HR, Inventory/Registers guided processes.
- Confirm these remain safe/lightweight rather than pretending to perform real payment or destructive writes.
- Open Role Explorer and confirm Feature Tour + multilingual manual remains available for secondary modules.

## 8. Safety / regression
- Reset demo and confirm temporary demo state resets.
- Exit demo and confirm public website remains normal.
- Confirm Super Admin Academic Core remains available.
- Confirm National High School production logins/data are unchanged.
- Confirm no real WhatsApp/SMS/email/payment is sent by the public demo.
