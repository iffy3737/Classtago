# CLASSTAGO BULK BATCH 13

Production-integrity fix for Examination Master.
- Removed hardcoded academic-year defaults (2026-27/2025-26/2024-25).
- Academic years now derive from configured Academic Setup/existing examination records.
- Active academic year is resolved from configured active year or real existing data.
- Previous-year copy now uses a real configured previous year instead of hardcoded 2025-26.
- Removed fabricated/mock examination fallback when previous-year records do not exist; the operation now stops with a clear message.
- No database schema changes.
- No Maria changes.
- Existing examination save/edit/delete workflows preserved.
