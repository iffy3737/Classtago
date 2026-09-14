# R2.5.58 Test Checklist — Process Audit 01: Admission

1. Open Demo → School Processes → Admission.
2. Verify Admission shows 16 connected stages.
3. Clerk Student screen: text inputs type naturally; DOB behaves as date selection; Gender behaves as radio; Mother Tongue/Religion behave as dropdowns.
4. Clerk Parent screen: names/mobile type; occupation uses dropdown.
5. Clerk History screen: address types; Same Address uses checkbox; Previous Class uses dropdown.
6. Clerk Verify screen: class/division/medium/blood group use dropdowns; LC/Aadhaar/Photo use file-selection simulation; remarks types.
7. Clerk Final Review: no typing. Click `Save Intake & Send to Headmaster`.
8. Headmaster Final Verification and Decision: no typing. Approve Application manually.
9. GR & Allocation: GR/roll input only where appropriate; admission date uses date control; class/division use dropdowns.
10. Confirm Admission: no typing. Confirm creates the demo Student Master state and Class Teacher handoff.
11. Class Teacher receives New Admission in My Students without recreating the student.
12. Student Signup: GR + password form; click `Sign Up and Await Class Teacher Approval`.
13. Class Teacher Signup Approval: review-only; click `Approve Student Account`.
14. Student Home shows Active account.
15. Parent Signup: GR/PEN + registered mobile + date/password controls.
16. Headmaster Parent Accounts & Child Links: review-only; approve Parent Account.
17. Parent Home shows the same linked student.
18. Test on mobile: no horizontal page overflow and action buttons remain reachable.
19. Test instruction language selected at Demo Setup.
20. Verify National High School production roles/data remain unchanged.
