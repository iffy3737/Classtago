# Classtago R2.5.96 — Combined Paper + Compact A4 + Page Customization

## Included
- Combined Subject Question Paper generation keeps the existing Subject Teacher / Clerk workflow.
- Visible generation progress now paints before the first AI request and updates per Subject component.
- Generate button changes to `Generating…` and is disabled during generation.
- Default question-paper print target is A4-oriented and compact.
- Default answer-writing spaces are OFF because the student-paper workflow is copy-based; they can be enabled from Smart Print.
- Removed the three generic Urdu boilerplate instructions from generated output and server-side normalization:
  - تمام سوالات حل کرنا لازمی ہیں۔
  - ہر سوال کے سامنے اس کے نمبر درج ہیں۔
  - جوابات اپنی کاپی میں صاف اور واضح لکھیں۔
- AI prompt explicitly requests no generic boilerplate instructions.
- Smart Print Question Paper Layout controls:
  - paper size / custom size
  - portrait / landscape
  - margins
  - font size
  - line spacing
  - question spacing
  - school/exam header show/hide
  - instructions show/hide
  - custom instructions (one per line)
  - marks show/hide
  - student Name / Roll / Date show/hide
  - answer writing space show/hide
  - section numbering style
  - scaling
  - live preview and PDF/Print

## Safety
No database migration is added. Question generation, mark validation, teacher assignment, combined-group ownership, save/approval, and existing module APIs remain intact.

## Validation performed
- Static TypeScript parser check completed for changed TS/TSX files; no syntax errors were reported.
- Full dependency/build validation could not be completed because the project dependency installation timed out in the execution environment.
