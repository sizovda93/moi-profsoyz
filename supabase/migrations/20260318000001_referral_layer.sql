-- T3: Referral / Social Sharing Layer

-- 1. Add ref_code to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ref_code VARCHAR(8) UNIQUE;

-- Generate ref codes for existing agents (uppercase alphanumeric, 8 chars)
UPDATE agents SET ref_code = upper(substr(md5(id::text || now()::text), 1, 8))
WHERE ref_code IS NULL;

-- Make ref_code NOT NULL after backfill
ALTER TABLE agents ALTER COLUMN ref_code SET NOT NULL;
ALTER TABLE agents ALTER COLUMN ref_code SET DEFAULT upper(substr(md5(random()::text), 1, 8));

-- 2. Add ref_code to leads for attribution
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ref_code VARCHAR(8);

-- 3. Referral clicks tracking
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code VARCHAR(8) NOT NULL,
  ip_hash VARCHAR(64),
  user_agent TEXT,
  referrer TEXT,
  is_unique BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_ref ON referral_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created ON referral_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_ref_code ON leads(ref_code);

-- Grant permissions
GRANT ALL ON referral_clicks TO pravotech;
