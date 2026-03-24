-- =============================================
-- AI-2: Draft Reply Suggestions
-- =============================================
-- Stores AI-generated draft replies for manager.
-- Draft is a text suggestion only — never auto-sent.
-- Status semantics:
--   suggested — AI generated, not yet acted on
--   accepted  — manager chose to use this draft (inserted into input)
--   edited    — manager modified and used the draft
--   rejected  — manager dismissed or regenerated

CREATE TABLE IF NOT EXISTS public.message_drafts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  draft_text        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'suggested'
                    CHECK (status IN ('suggested', 'accepted', 'edited', 'rejected')),
  classification    TEXT,
  model_name        TEXT,
  generated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drafts_conversation ON message_drafts(conversation_id);
CREATE INDEX idx_drafts_status ON message_drafts(status) WHERE status = 'suggested';

ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dev" ON public.message_drafts
  FOR ALL USING (true) WITH CHECK (true);
