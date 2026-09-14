# Classtago R2.5.102 — Cross-Module Data Integrity + Academic Session Hardening

- SmartMarkListA now resolves Academic Session from configured academic-year data instead of hardcoded 2026-27/2025-26 options.
- Initial mark-list session selection respects an explicitly supplied session, otherwise the active configured academic year, otherwise the first configured year.
- ContinuousResultBook now uses the configured active academic year for lock/result-book identity and filtering.
- ContinuousResultBook no longer invents a four-subject completion total when no real subject allocations exist.
- ContinuousResultBook print/export identity now reflects the configured academic session.
- Existing National High School result workflows and Maria are untouched.
- No Supabase schema changes.

Validation: touched TSX files have balanced braces; release metadata parses as JSON; ZIP integrity checked after packaging. Full TypeScript build not claimed because project dependencies are not installed in the supplied source environment.
