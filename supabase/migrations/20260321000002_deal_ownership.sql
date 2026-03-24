-- =============================================
-- T5: Deal Ownership & Anti-Conflict
-- =============================================
-- Adds phone normalization, conflict tracking fields,
-- and indexes for duplicate detection.

-- ─── Normalized phone for dedup ──────────────

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

-- Backfill: strip non-digits, replace leading 8 with 7 (RU)
UPDATE leads
SET phone_normalized = CASE
  WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
       AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '8%'
  THEN '7' || substring(regexp_replace(phone, '[^0-9]', '', 'g') FROM 2)
  ELSE regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone IS NOT NULL AND phone_normalized IS NULL;

-- ─── Conflict tracking fields ────────────────

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS conflict_status TEXT CHECK (conflict_status IN ('open', 'resolved')),
  ADD COLUMN IF NOT EXISTS conflict_with_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conflict_resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conflict_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conflict_resolution TEXT CHECK (conflict_resolution IN (
    'confirmed_duplicate', 'kept_existing', 'overridden', 'kept_separate'
  ));

-- ─── Indexes for dedup and conflict queries ──

CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized
  ON leads(phone_normalized) WHERE phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_lower
  ON leads(lower(email)) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_conflict_status
  ON leads(conflict_status) WHERE conflict_status IS NOT NULL;
