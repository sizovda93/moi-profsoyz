-- =============================================
-- T9: Beta / Scale Operations
-- =============================================
-- Adds activity tracking, manager contact log,
-- and agent feedback system.

-- ─── Activity tracking on agents ─────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_contacted_at TIMESTAMPTZ;

-- Backfill last_activity_at from existing data
UPDATE agents a SET last_activity_at = GREATEST(
  COALESCE((SELECT MAX(created_at) FROM leads WHERE assigned_agent_id = a.id), a.created_at),
  COALESCE((SELECT MAX(completed_at) FROM learning_progress WHERE profile_id = a.user_id), a.created_at),
  a.created_at
);

CREATE INDEX IF NOT EXISTS idx_agents_last_activity
  ON agents(last_activity_at) WHERE last_activity_at IS NOT NULL;

-- ─── Feedback table ──────────────────────────

CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('onboarding', 'platform', 'suggestion', 'problem')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at  TIMESTAMPTZ,
  handled_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_profile ON feedback(profile_id);
CREATE INDEX idx_feedback_unhandled ON feedback(created_at) WHERE handled_at IS NULL;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dev" ON public.feedback
  FOR ALL USING (true) WITH CHECK (true);
