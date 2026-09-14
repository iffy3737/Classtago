# R2.5.67 Test Checklist

## Regression / scope
- [ ] Landing page opens normally.
- [ ] School login flows unchanged.
- [ ] Headmaster dashboard opens normally.
- [ ] Clerk dashboard opens normally.
- [ ] Platform/Super Admin dashboard opens normally.
- [ ] Live Demo simplified R2.5.66 flow is unchanged.
- [ ] Routine SMS remains blocked by the R2.5.65 critical-SMS policy.

## School gateway assignment
- [ ] Open Classtago Android as Headmaster/Clerk on intended sender phone.
- [ ] Register / Start This Device and grant SEND_SMS permission.
- [ ] Device appears in Automatic Gateway Assignment with correct owner role.
- [ ] Set one device Primary and another Backup.
- [ ] Setting a new Primary automatically demotes the previous Primary to Backup.
- [ ] Daily safety limit saves and reloads.
- [ ] Primary sends a gateway-test/critical job while healthy.
- [ ] Stop/close Primary long enough to become stale; Backup becomes eligible.
- [ ] When Primary reaches its configured daily soft limit, Backup becomes eligible.

## Platform gateway assignment
- [ ] Register Platform/Super Admin Android gateway.
- [ ] Mark one Platform device Primary and another Backup.
- [ ] Live Demo / Registration OTP queues through healthy Platform route.
- [ ] Platform Primary stale/offline => Backup can claim OTP queue.
- [ ] WhatsApp OTP remains independent if SMS route unavailable.
- [ ] Email remains optional.

## SIM / quota behavior
- [ ] Android default SMS SIM is the intended sender SIM on dual-SIM devices.
- [ ] Long/multipart SMS records returned part count as SMS units.
- [ ] Daily usage shown in control panel approximately matches Classtago-sent units.
