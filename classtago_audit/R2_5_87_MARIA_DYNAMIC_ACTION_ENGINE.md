# Classtago R2.5.87 — Maria Dynamic Action Engine

## Scope
This release adds an optional Maria control layer over existing Classtago academic workflows. It does not replace or rewrite the existing Result/Mark List, Homework, or Question Paper engines.

## Voice Mark Entry
- Open an assigned Subject Marks List by subject + term through Maria.
- Vertical mode: select a mark head/column (for example Oral) and fill top-to-bottom in spoken order.
- Horizontal mode: select a Student by name or roll number and fill left-to-right in spoken order.
- Manual cursor mode: Teacher taps any existing editable mark cell and says to start from here; Maria uses that exact cell as the anchor and can continue vertical or horizontal.
- Supports next, previous, pause, stop and correct-previous controls.
- Absent is normalized to the existing AB code; common Hindi/Hinglish/Urdu number words and Devanagari/Arabic digits are normalized before entry.
- Existing maximum-mark validation, special-code rules, ownership/locked-cell rules, Save Draft and Send to Class Teacher remain authoritative.
- Maria never saves or submits the Mark List automatically.

## Homework
- Maria can resolve only a Headmaster-assigned teaching scope and hand the request into the existing Homework builder.
- Existing Textbook/Study Material source policy, chapter matching, generation, preview/edit/save/publish/history logic remain authoritative.
- Maria generation stops at preview; no automatic save/publish.

## Question Paper
- Maria can resolve only an assigned subject/exam scope and hand the request into the existing Question Paper builder.
- Existing Textbook source, saved school/manual pattern, marks validation, Preview/Edit/Replace/Save/Print/PDF flow remain authoritative.
- Maria does not rewrite the existing school/manual question-paper pattern to satisfy a spoken request; incompatible requests stop safely for manual review.

## Safety / compatibility
- Existing manual workflows remain usable with Maria off.
- Existing role, school, assignment and locked-cell restrictions remain in force.
- Dynamic commands are short-lived client handoffs and do not bypass server-side authorisation.
- R2.5.86 Maria pronunciation and confirmation-gated operational actions are preserved.
