-- ============================================================
-- Migration: Legal requests module ("Вопрос юристу")
-- ============================================================

CREATE TABLE IF NOT EXISTS legal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id),
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting', 'answered', 'closed')),
  answer_text TEXT,
  answered_by UUID REFERENCES profiles(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES legal_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_requests_author ON legal_requests(author_id);
CREATE INDEX idx_legal_requests_status ON legal_requests(status);
CREATE INDEX idx_legal_attachments_request ON legal_request_attachments(request_id);

GRANT ALL ON legal_requests TO profsoyz_app;
GRANT ALL ON legal_request_attachments TO profsoyz_app;
