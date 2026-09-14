# R2.5.63 Go-Live Security Status

## Live Supabase status checked during release preparation
- Project: National
- Project ref: lrjtfoosbubcfbthqbyu
- Region: ap-south-1
- Status observed: ACTIVE_HEALTHY

## Security advisor status
The live project currently reports pre-existing advisory findings, including:
- RLS-enabled tables with no client policies (many are intentionally server/service-role managed and require architecture-aware review before changing).
- SECURITY DEFINER functions exposed to anon/authenticated roles that require dependency-by-dependency review.
- Some functions with mutable `search_path`.
- Supabase Auth leaked-password protection is disabled.

R2.5.63 deliberately does **not** mass-revoke privileges, rewrite functions, or add blanket RLS policies. Those changes can break established admissions, assignments, results, fees, communication, and other ERP flows if applied without an RPC/call-site dependency audit.

## Release boundary
This release introduces no new destructive database change. Existing Supabase security advisories remain a separate production-hardening backlog and should be resolved with dry-run dependency analysis, role-by-role regression testing, and rollback planning.
