-- EDUNIXO R2.5.45 — FREE Phase 1 push FK index hardening
-- ADDITIVE ONLY. Matches production migration free_phase1_push_fk_indexes.

create index if not exists idx_edunixo_push_deliveries_subscription
  on public.edunixo_push_deliveries(subscription_id);

create index if not exists idx_edunixo_push_subscriptions_user_id
  on public.edunixo_push_subscriptions(user_id);
