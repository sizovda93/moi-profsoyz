-- =============================================
-- Agent-Manager Binding & Auto-Assignment
-- =============================================
-- Permanent agent → manager relationship.
-- Leads created by agent auto-inherit manager_id.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_manager
  ON agents(manager_id) WHERE manager_id IS NOT NULL;
