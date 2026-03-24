-- =============================================
-- AI-3: Knowledge-Assisted Replies
-- =============================================
-- Track which knowledge sources were used for draft grounding.
-- Format: array of "module_id:lesson_slug" strings.

ALTER TABLE public.message_drafts
  ADD COLUMN IF NOT EXISTS knowledge_snippets_used TEXT[];
