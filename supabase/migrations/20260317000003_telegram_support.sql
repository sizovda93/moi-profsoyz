-- =============================================
-- T1: Telegram Transport Layer
-- =============================================

-- Enum канала сообщений
CREATE TYPE message_channel AS ENUM ('web', 'telegram');

-- =============================================
-- Привязка Telegram ↔ профиль платформы
-- =============================================

CREATE TABLE public.telegram_bindings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_user_id      BIGINT NOT NULL UNIQUE,
  telegram_chat_id      BIGINT NOT NULL,
  telegram_username     TEXT,
  telegram_first_name   TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_conversation_id  UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  linked_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Один активный binding на профиль
CREATE UNIQUE INDEX idx_tg_bind_profile_active
  ON telegram_bindings(profile_id) WHERE is_active = true;
CREATE INDEX idx_tg_bind_chat
  ON telegram_bindings(telegram_chat_id);
CREATE INDEX idx_tg_bind_user
  ON telegram_bindings(telegram_user_id);

-- =============================================
-- Одноразовые токены привязки
-- =============================================

CREATE TABLE public.telegram_link_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tg_link_token ON telegram_link_tokens(token);

-- =============================================
-- Расширение messages: канал и внешний ID
-- =============================================

ALTER TABLE public.messages
  ADD COLUMN channel message_channel NOT NULL DEFAULT 'web';

ALTER TABLE public.messages
  ADD COLUMN external_id TEXT;

CREATE INDEX idx_messages_external_id
  ON messages(external_id) WHERE external_id IS NOT NULL;

-- =============================================
-- Расширение conversations: канал
-- =============================================

ALTER TABLE public.conversations
  ADD COLUMN channel message_channel NOT NULL DEFAULT 'web';

-- =============================================
-- RLS (dev)
-- =============================================

ALTER TABLE public.telegram_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for dev" ON public.telegram_bindings
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for dev" ON public.telegram_link_tokens
  FOR ALL USING (true) WITH CHECK (true);
