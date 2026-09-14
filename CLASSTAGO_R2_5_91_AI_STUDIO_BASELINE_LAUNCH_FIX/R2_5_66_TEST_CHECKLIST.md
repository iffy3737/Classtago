# R2.5.66 Test Checklist

1. Platform landing opens normally.
2. Register Institution still shows the existing full registration form.
3. Start Live Demo opens the simplified form with only School Name, Role, Mobile/WhatsApp, optional Email and OTP controls.
4. Email can be left blank.
5. Send OTP works with the existing multi-channel OTP engine.
6. Start Live Demo remains disabled until OTP is verified.
7. After verification, Start Live Demo records the lead and opens the chosen role immediately with no approval/pending screen.
8. Entered School Name is visible in the demo context.
9. Demo role can still be switched inside the isolated demo if desired.
10. Platform Admin -> Demo Follow-up shows the saved demo lead and role, permits follow-up notes/status and deletion.
11. Existing Headmaster, Clerk, Teacher, Student, Parent, Super Admin and school public website flows remain unchanged.
12. Existing R2.5.65 migrations are applied before testing OTP/follow-up on a live backend.
