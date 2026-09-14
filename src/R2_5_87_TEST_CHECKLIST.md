# R2.5.87 Test Checklist

## Regression guard
- [ ] Existing manual Subject Marks List opens and edits exactly as before with Maria unused.
- [ ] Save Draft / Send to Class Teacher / returned-list correction / accepted-list lock still work.
- [ ] Existing Homework manual and AI flows still work without Maria.
- [ ] Existing Question Paper manual flow, saved pattern, Preview/Edit/Replace/Save/Print/PDF still work without Maria.

## Maria mark entry
- [ ] "Maria, Urdu First Term open karo" opens only the authorised assigned Urdu First Term Mark List.
- [ ] "Start se Oral ke mark bharenge" selects the first editable Oral cell and vertical mode.
- [ ] Dictating "5, 8, absent, 6, 13" fills consecutive editable rows in that exact order; absent becomes AB.
- [ ] Common spoken variants such as panch/aath/aanth/chhe/tera are accepted as 5/8/8/6/13.
- [ ] "Roll no. 3 ke mark bharenge" starts horizontal mode on that Student row.
- [ ] Dictating "4, 3, 7, 12" fills consecutive editable heads left-to-right.
- [ ] Tap any editable cell, then "Maria, yahan se niche" starts at that exact cell vertically.
- [ ] Tap any editable cell, then "Maria, yahan se side me" starts at that exact cell horizontally.
- [ ] Out-of-range mark is rejected and cursor stays on the same cell.
- [ ] Locked/calculated/other-teacher cells are never changed.
- [ ] Maria does not auto-save or auto-submit.

## Maria Homework / Question Paper
- [ ] Maria Homework request uses only authorised assignment + existing Textbook and stops at Preview.
- [ ] Maria Question Paper request uses existing pattern/source rules and stops at Preview.
- [ ] Incompatible saved paper pattern causes a safe stop instead of changing the pattern.

## Maria core
- [ ] Spoken name remains "Maariya / मारिया".
- [ ] Gemini Live interruption remains immediate and audio remains click/beep free.
- [ ] First-session pre-warm remains active.
