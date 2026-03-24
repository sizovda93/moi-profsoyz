-- ============================================================
-- Migration: Direct messages between members (P2P within division)
-- ============================================================

CREATE TABLE IF NOT EXISTS direct_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id),
  user2_id UUID NOT NULL REFERENCES profiles(id),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_chats_users ON direct_chats(user1_id, user2_id);
CREATE INDEX idx_direct_messages_chat ON direct_messages(chat_id, created_at);

GRANT ALL ON direct_chats TO profsoyz_app;
GRANT ALL ON direct_messages TO profsoyz_app;
