-- ============================================================
-- Migration: Request types for appeals (leads)
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'consultation';

COMMENT ON COLUMN leads.request_type IS 'Type of appeal: complaint, request, initiative, consultation';
