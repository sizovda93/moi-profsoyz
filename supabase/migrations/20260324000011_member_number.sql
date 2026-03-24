-- ============================================================
-- Migration: Member number (unique ID for each union member)
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS member_number TEXT UNIQUE;

-- Backfill existing members with sequential numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM agents
  WHERE member_number IS NULL
)
UPDATE agents SET member_number = 'MP-' || LPAD(numbered.rn::TEXT, 6, '0')
FROM numbered WHERE agents.id = numbered.id;
