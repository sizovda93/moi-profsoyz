-- Добавляем rejection_reason к payouts
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Создаём таблицу settings если не существует
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Дефолтные настройки
INSERT INTO settings (key, value) VALUES
  ('commission_rate', '0.30'),
  ('platform_name', 'Агентум Про'),
  ('support_email', 'support@legaltech.ru'),
  ('support_phone', '+7 (800) 100-00-00')
ON CONFLICT (key) DO NOTHING;
