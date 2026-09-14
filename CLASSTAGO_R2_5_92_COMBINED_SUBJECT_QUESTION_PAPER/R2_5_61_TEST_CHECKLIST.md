# R2.5.61 Test Checklist

## Instant Demo Pass
- [ ] Language selector exposes 23 options (English + 22 Scheduled Indian languages).
- [ ] English keeps English guidance; Urdu/Kashmiri/Sindhi use RTL direction.
- [ ] No OTP/password/approval is required to enter the demo.

## Demo Home / Sales Hub
- [ ] Four experience cards appear: Executive Tour, Connected School Tour, Explore 25 Processes, Explore by Role.
- [ ] Process browser still lists all 25 process cards.
- [ ] Session analytics show explored/completed/action counts.

## Tours
- [ ] 3-minute Executive Tour opens and advances through five highlight cards.
- [ ] Final Executive Tour card can jump into Result Management.
- [ ] 10-minute Connected Tour runs Teacher Assignment → Attendance → Homework → Result Management.
- [ ] Completing each tour process offers `Continue Connected Tour`.

## Process behavior
- [ ] Actual control-type rules from R2.5.59/R2.5.60 remain intact.
- [ ] Cross-role Connected Hand-off and System-wide Impact remain visible.
- [ ] Set Up My School appears at process completion.

## Conversion
- [ ] Conversion modal prefills Instant Demo Pass contact when possible.
- [ ] Mobile + email + consent are required before submission.
- [ ] Completed process interests are attached to the existing institution-interest request.
- [ ] Successful request shows a reference code.

## Isolation / reset
- [ ] Two browser tabs receive different private demo storage session IDs.
- [ ] Demo state does not use the old global `edunixo.live-demo.r260` key.
- [ ] Six-hour expiry resets the private session.
- [ ] Production school data remains unchanged.

## Responsive
- [ ] 360–430px phone widths have no horizontal page overflow.
- [ ] Tour/conversion modal is usable on phone.
- [ ] RTL guidance/layout is readable.
