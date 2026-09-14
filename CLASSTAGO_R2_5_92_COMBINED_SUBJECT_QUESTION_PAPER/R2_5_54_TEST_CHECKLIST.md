# Classtago R2.5.54 Test Checklist

## Demo setup
- Open Try Live Demo.
- Select State Board -> Maharashtra (or another State/UT).
- Choose medium and feature languages.
- Open Demo School.

## Role separation
- Enter Headmaster, Clerk, Teacher, Student and Parent demos.
- Confirm each role shows different production module names.
- Confirm Teacher contains Class Teacher additional-duty items where applicable.

## Demo depth
- Confirm module cards show Live / Guided / Tour badges.
- Filter module list by each depth.
- Open a Tour feature and verify full manual is available.

## Dynamic chain
- Teacher -> Attendance: change Zoya Khan status and save.
- Student/Parent -> Attendance: confirm same status appears.
- Teacher -> AI Homework/Teaching & Academic Work: publish homework.
- Student/Parent -> Homework: confirm it appears.
- Teacher -> Result Management: submit marks.
- Headmaster -> Result Management: publish result.
- Student/Parent -> Results: confirm published result appears.
- Clerk -> Admission Desk: create/submit sample application.
- Headmaster -> Admissions Review: approve latest application.

## Manuals
- Open any module manual.
- Open a specific feature manual from the feature chips.
- Switch manual language (Urdu/Marathi/Hindi/etc.).
- If Gemini is configured, confirm translated manual returns.
- If Gemini is unavailable, confirm English master manual remains readable with a non-destructive warning.

## Regression
- Exit Demo and confirm public website still works.
- Confirm Super Admin Academic Core remains available.
- Confirm National High School production login/data is unchanged.
