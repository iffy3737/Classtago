# Classtago R2.5.103 — Production Data Integrity Hardening

## Scope
- Removed unused fabricated fee-head seed definitions from Smart Fee Manager.
- Fine-rule fallback is now inert until configured by the school; no synthetic fine policy is created.
- Smart Inventory no longer falls back to a fabricated academic year when setup has none.
- Timetable weekly-requirement forms now derive academic year/class/division from configured real data instead of fixed sample values.
- New fee receipt numbers use the Classtago-neutral `CLST-REC` prefix; existing stored receipt numbers are not rewritten.

## Safety
- No Supabase schema changes.
- No Maria/voice changes.
- Existing stored/local records are preserved.
- No demo data is added.
