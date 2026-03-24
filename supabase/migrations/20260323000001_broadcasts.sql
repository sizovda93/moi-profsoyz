-- Broadcasts: manager → agents mass messaging
-- sender_id (not manager_id) for future extensibility (admin broadcasts)

CREATE TABLE broadcasts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         UUID NOT NULL REFERENCES profiles(id),
  title             VARCHAR(255),
  text              TEXT NOT NULL,
  channel           VARCHAR(20) NOT NULL DEFAULT 'both'
                      CHECK (channel IN ('web', 'telegram', 'both')),
  audience_type     VARCHAR(30) NOT NULL DEFAULT 'all'
                      CHECK (audience_type IN ('all', 'active', 'activated', 'learning', 'sleeping', 'no_telegram', 'manual')),
  total_recipients  INT NOT NULL DEFAULT 0,
  delivered_count   INT NOT NULL DEFAULT 0,
  failed_count      INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE broadcast_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id  UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id),
  profile_id    UUID NOT NULL REFERENCES profiles(id),
  agent_name    VARCHAR(255),
  channel_web   VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (channel_web IN ('pending', 'sent', 'skipped')),
  channel_tg    VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (channel_tg IN ('pending', 'sent', 'failed', 'skipped')),
  error_details TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_sender ON broadcasts(sender_id, created_at DESC);
CREATE INDEX idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
