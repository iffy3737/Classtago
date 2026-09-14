# R2.5.56 Demo Test Checklist

## Mobile layout
- Open Admission process on a narrow/mobile preview.
- No white strip should appear on the right side.
- No page-level horizontal scrollbar should appear.
- Current step summary should fit within the screen.
- Current role/module card should fit without clipped module tabs.
- Fields and action buttons should stay inside the viewport.

## User-controlled start
- Open any process step.
- Verify no auto-typing starts by itself.
- Read/inspect the page.
- Press `Start Process`.
- Verify typing begins only after that click.
- Continue to the next role/page.
- Verify that page again waits for `Start Process`.

## Natural typing
- Verify characters appear one-by-one at human-readable speed.
- Verify a small natural pause occurs between fields.
- Pause while typing and confirm filling stops.
- Resume and confirm filling continues from the same point.

## Workflow action
- Main action remains disabled until filling is complete.
- After filling, Submit/Approve/Assign/etc. becomes available.
- Click it and verify `What just happened` appears.
- Continue to the next role and repeat.

## Regression
- Process Hub still lists all 25 processes.
- Role Explorer still opens.
- Board / State / Medium context remains unchanged.
- No production database writes are introduced by this build.
