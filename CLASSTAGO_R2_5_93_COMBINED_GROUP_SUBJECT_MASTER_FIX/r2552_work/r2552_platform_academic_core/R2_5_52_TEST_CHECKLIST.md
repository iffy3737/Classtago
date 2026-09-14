# EDUNIXO R2.5.52 — Academic Core Verification Checklist

## Super Admin
- [ ] Login as Platform/Super Admin.
- [ ] Confirm **Academic Core** appears as a separate tab.
- [ ] Confirm Overview loads family/jurisdiction/board/rules/template/language counts.
- [ ] Open **Boards & States** and verify State Board can be filtered by State/UT.
- [ ] Open **Rules & Versions**, create a Review ruleset with official source notes.
- [ ] Verify publish requires explicit official-verification confirmation.
- [ ] Confirm a published ruleset changes the board status to verified/ready.
- [ ] Create a draft template and confirm board/ruleset/report/language metadata is retained.
- [ ] Edit a Feature Language policy and confirm it persists after reload.

## New-school Academic Setup / Curriculum Import
- [ ] Login to an unconfigured test school as Clerk/Academic Admin.
- [ ] Select curriculum family.
- [ ] When **State Board** is selected, confirm State/UT selection becomes mandatory.
- [ ] Select board and confirm verified/pending status is visible.
- [ ] Verify AI analysis is disabled until the board selection is complete.
- [ ] Analyze a sample and confirm Country/State/Board/Curriculum are locked fields.
- [ ] Confirm detected conflicts appear as warnings rather than silently changing the selected board.
- [ ] Submit curriculum pack.
- [ ] As Headmaster, confirm activation is blocked when the board has no verified published ruleset.
- [ ] After publishing a verified ruleset, approve the pack and confirm school_academic_profiles becomes active + locked.

## Existing National High School Regression
- [ ] Existing Headmaster login/dashboard works.
- [ ] Existing Clerk login/workspaces work.
- [ ] Existing Teacher login/assignments work.
- [ ] Existing Student/Parent portals work.
- [ ] Existing Result Management records remain available.
- [ ] Existing school board records are unchanged unless a controlled Academic Core activation is deliberately performed.
- [ ] Existing language preferences/document-language controls remain available.

## Deployment
- [ ] Run `npm run lint` in an environment with dependencies installed.
- [ ] Run `npm run build:full`.
- [ ] Run existing deployment doctor/production verification.
- [ ] Do not publish a new board ruleset until its official rules have been manually verified.
