-- =============================================
-- T6: Finance & Incentive Upgrade
-- =============================================
-- Adds payout-lead link, calculation snapshot,
-- partner tiers, and per-tier commission rates.

-- ─── Payout snapshot fields ──────────────────

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_name TEXT,
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_at_creation TEXT;

-- Dedup: one payout per agent per lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_agent_lead
  ON payouts(agent_id, lead_id) WHERE lead_id IS NOT NULL;

-- ─── Partner tier on agents ──────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'base'
    CHECK (tier IN ('base', 'silver', 'gold'));

-- ─── Per-tier commission rates in settings ───

INSERT INTO settings (key, value) VALUES
  ('commission_rate_base',   '0.25'),
  ('commission_rate_silver', '0.30'),
  ('commission_rate_gold',   '0.35')
ON CONFLICT (key) DO NOTHING;
