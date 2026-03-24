-- =============================================
-- AI-1: Message Classification Layer
-- =============================================

-- ─── Classification fields on messages ───────

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS classification TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attention_reason TEXT,
  ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_needs_attention
  ON messages(conversation_id) WHERE needs_attention = true;

-- ─── Attention fields on conversations ───────

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS has_attention BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_classification TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_has_attention
  ON conversations(has_attention) WHERE has_attention = true;
