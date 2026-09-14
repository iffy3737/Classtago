# Classtago R2.5.61 — Batched Demo Sales Experience

This cumulative build continues from R2.5.60 and deliberately batches several demo-roadmap orders into one release.

## Included in this batch
1. **23/23 demo instruction languages** — English plus all 22 Scheduled Indian languages are available in the Instant Demo Pass. The frontend merges the live platform language catalogue with the complete fallback catalogue so missing backend rows cannot silently hide an option.
2. **Premium Process Demo Home / Sales Hub** — visitors can choose Executive Tour, Connected School Tour, Explore 25 Processes, or Explore by Role.
3. **3-minute Executive Tour** — management-level highlight deck covering governance, human-in-the-loop automation, cross-role effects, AI academic workflows and Student/Parent outcomes.
4. **10-minute Connected School Tour** — interactive playlist: Teacher Assignment → Attendance → Homework → Result Management. Process completion carries directly into the next tour process.
5. **Multilingual manuals strengthened** — all 23 languages remain selectable; translated manuals are cached for the current browser session to avoid repeated AI translation requests.
6. **Private demo analytics** — Process Hub visibly tracks processes explored, processes completed and decisions/hand-offs in the current isolated session.
7. **Conversion layer** — process completion includes `Set Up My School`. It reuses the existing secure `/api/public/institution-interest` lead endpoint and attaches completed demo interests automatically. Mobile, email and explicit consent are required before a lead is sent.
8. **Per-visitor isolation + automatic reset** — demo state now uses a per-browser-tab session ID and a versioned R2.5.61 storage key. Each private session expires/reset safely after six hours.
9. **Mobile / RTL polish** — demo surfaces use the selected instruction direction; tour and conversion overlays are phone-friendly; the native 23-language picker is fully scrollable on mobile.

## Production safety
- No production school records are written by demo interactions.
- No Supabase migration is included in this release.
- Existing production authentication/ERP role permissions are unchanged.
- Lead submission uses the already-existing platform lead API and only runs after explicit user consent.
