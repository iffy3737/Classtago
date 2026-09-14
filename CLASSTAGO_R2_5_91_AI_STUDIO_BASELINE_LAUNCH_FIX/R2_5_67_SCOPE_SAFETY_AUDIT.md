# R2.5.67 Scope Safety Audit

- Base project: R2.5.66.
- No ERP module, role, route or existing public Live Demo field was removed by this patch.
- Existing R2.5.64 SMS gateway transport is extended, not replaced.
- New functionality is scoped to SMS gateway assignment/routing, OTP SMS route selection, gateway UI, version metadata and one additive migration.
- SMS critical-only policy remains enforced server/database-side.
- Existing WhatsApp and optional Email OTP paths are preserved.
- Existing login is not converted into SMS-only authentication.
- No third-party SMS subscription dependency was introduced.
