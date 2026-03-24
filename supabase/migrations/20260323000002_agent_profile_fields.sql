-- Extended agent profile: gender, birth_year, profession, preferred_messenger

ALTER TABLE agents
  ADD COLUMN gender VARCHAR(20) NOT NULL DEFAULT 'not_specified'
    CHECK (gender IN ('male', 'female', 'not_specified')),
  ADD COLUMN birth_year INT
    CHECK (birth_year IS NULL OR (birth_year >= 1940 AND birth_year <= 2010)),
  ADD COLUMN profession VARCHAR(255),
  ADD COLUMN preferred_messenger VARCHAR(20) NOT NULL DEFAULT 'telegram'
    CHECK (preferred_messenger IN ('telegram', 'max', 'vk'));
