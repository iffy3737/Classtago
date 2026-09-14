# Classtago R2.5.107

- Final production hardening pass: removed fabricated accounting opening balances/bank identifiers and fixed financial-year carry-forward to the configured next year.
- School brand/seal fallback is now generic and dynamically renders the configured school identity instead of embedding a specific institution.
- Removed remaining production UDISE and school-identity fallbacks from touched operational surfaces.
- Genericized the unauthenticated AI academic prompt so it does not assume a particular school; active school facts must come from current cloud context.
- Added production marker checks to the final go-live preflight.
- No Supabase schema changes. Maria untouched.
