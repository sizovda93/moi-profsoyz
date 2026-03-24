-- ============================================================
-- Migration: About Union — Events + Union Documents
-- ============================================================

-- Мероприятия профсоюза
CREATE TABLE IF NOT EXISTS union_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  event_date DATE,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'none')) DEFAULT 'none',
  media_url TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_union_events_status ON union_events(status, event_date DESC);

-- Документы профсоюза (отдельно от пользовательских documents)
CREATE TABLE IF NOT EXISTS union_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_union_documents_status ON union_documents(status);

GRANT ALL ON union_events TO profsoyz_app;
GRANT ALL ON union_documents TO profsoyz_app;
