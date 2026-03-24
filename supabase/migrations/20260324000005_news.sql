-- ============================================================
-- Migration: News module
-- ============================================================

CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'none')) DEFAULT 'none',
  media_url TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')) NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_status_published ON news(status, published_at DESC);

GRANT ALL ON news TO profsoyz_app;
