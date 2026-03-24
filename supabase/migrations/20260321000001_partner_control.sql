-- =============================================
-- T4: Partner Control & Certification
-- =============================================
-- Adds server-side learning progress tracking
-- and required-module flags for agent activation.

-- ─── Learning progress (server-side) ─────────

CREATE TABLE IF NOT EXISTS public.learning_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_slug  TEXT NOT NULL REFERENCES public.learning_lessons(slug) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, lesson_slug)
);

CREATE INDEX idx_lp_profile ON learning_progress(profile_id);

-- ─── Required-module flag ────────────────────

ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false;

-- Mark mandatory agent modules
UPDATE learning_modules SET is_required = true
WHERE id IN ('agent-start', 'agent-comms', 'agent-finance');

-- ─── RLS (dev) ───────────────────────────────

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for dev" ON public.learning_progress
  FOR ALL USING (true) WITH CHECK (true);
