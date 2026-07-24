-- =============================================================================
-- Verifact — Migration 0006: subscriptions table (stub for future Stripe)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier                    TEXT NOT NULL CHECK (tier IN ('pro', 'business')),
  status                  TEXT NOT NULL DEFAULT 'pending_manual' CHECK (status IN ('pending_manual', 'active', 'past_due', 'canceled')),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
