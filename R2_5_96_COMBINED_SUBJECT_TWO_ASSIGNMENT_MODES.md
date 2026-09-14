# Classtago R2.5.96 — Combined Subject Two Assignment Modes Fix

## Required modes verified at source level

1. **Different teachers:** each Combined Subject component remains a normal single-subject teaching assignment. The current Subject Teacher prepares only their component; once every component is submitted, the existing Clerk Combined Question Paper Desk assembles the complete paper.
2. **Same teacher:** when the same Teacher owns every component Subject in the group, the builder recognizes all component assignments and generates one complete Combined Question Paper directly from the separate subject sections.

## Corrections
- Combined Subject assignment resolution now prefers the current Teacher's canonical assignment when duplicate active allocations exist for the same Subject.
- Class-wide canonical assignments (`division_id` NULL) now participate in Division-specific Combined Subject Groups.
- Clerk Combined Queue now uses the actual submitted paper total for a component instead of stale expected-component marks.
- No Supabase schema change.
- Existing Subject Group Master remains unrelated faculty/curriculum grouping.
- Teaching assignments remain Subject-by-Subject; Combined Subject Group itself is never assigned as a teaching assignment.
