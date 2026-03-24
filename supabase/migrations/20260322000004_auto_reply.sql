-- =============================================
-- AI-4: Safe Auto-Replies & Relationship Messaging
-- =============================================

-- ─── Auto-reply flag on messages ─────────────

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_auto_reply BOOLEAN NOT NULL DEFAULT false;

-- ─── Relationship messages log ───────────────

CREATE TABLE IF NOT EXISTS public.relationship_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  scenario     TEXT NOT NULL,
  message_text TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'web',
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rel_msg_agent ON relationship_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_rel_msg_sent ON relationship_messages(sent_at);

ALTER TABLE public.relationship_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dev" ON public.relationship_messages
  FOR ALL USING (true) WITH CHECK (true);

-- ─── Auto-reply settings ─────────────────────

INSERT INTO settings (key, value) VALUES
  ('auto_reply_enabled', 'true'),
  ('relationship_messages_enabled', 'true'),
  ('auto_reply_topics', 'nav_telegram,nav_referral,nav_materials,nav_documents,nav_finance,nav_learning,nav_profile,lead_status,tier_info,bfl_general,platform_how'),
  ('relationship_cooldown_days', '7')
ON CONFLICT (key) DO NOTHING;
