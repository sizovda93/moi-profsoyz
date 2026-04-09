-- MAX messenger bindings (аналог telegram_bindings)
CREATE TABLE IF NOT EXISTS max_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_user_id BIGINT NOT NULL,
  max_chat_id BIGINT NOT NULL,
  max_username TEXT,
  max_first_name TEXT,
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_conversation_id UUID
);

CREATE TABLE IF NOT EXISTS max_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_bindings_profile ON max_bindings(profile_id);
CREATE INDEX IF NOT EXISTS idx_max_bindings_user ON max_bindings(max_user_id);
CREATE INDEX IF NOT EXISTS idx_max_link_tokens_token ON max_link_tokens(token);
