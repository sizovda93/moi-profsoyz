-- ============================================================
-- Migration: Add section field to union_documents for activity subsections
-- ============================================================

ALTER TABLE union_documents ADD COLUMN IF NOT EXISTS section TEXT;

-- Seed documents for activity subsections
-- Section: social_partnership
INSERT INTO union_documents (title, description, category, file_name, file_url, file_size, status, section, published_at) VALUES
('Соглашение МРОТ на 2026 год Саратов', 'Соглашение о минимальном размере оплаты труда на 2026 год', 'agreements', 'mrot-2026.pdf', '/docs/activity/mrot-2026.pdf', '', 'published', 'social_partnership', now()),
('Методические рекомендации по заключению коллективного договора', 'Рекомендации для профсоюзных организаций', 'regulations', 'metod-kd.pdf', '/docs/activity/metod-kd.pdf', '', 'published', 'social_partnership', now()),
('Соглашение МРОТ на 2025 год', 'Соглашение о МРОТ на 2025 год', 'agreements', 'mrot-2025.pdf', '/docs/activity/mrot-2025.pdf', '', 'published', 'social_partnership', now()),
('Распоряжение Губернатора области о взаимодействии с профсоюзами', 'Распоряжение о взаимодействии органов власти с профсоюзами', 'regulations', 'gubernator-profsoyz.pdf', '/docs/activity/gubernator-profsoyz.pdf', '', 'published', 'social_partnership', now()),
('Форма КДК-1', 'Форма уведомительной регистрации коллективного договора', 'templates', 'kdk-1.pdf', '/docs/activity/kdk-1.pdf', '', 'published', 'social_partnership', now()),
('Порядок предоставления формы КДК', 'Инструкция по заполнению и подаче формы КДК', 'regulations', 'kdk-poryadok.pdf', '/docs/activity/kdk-poryadok.pdf', '', 'published', 'social_partnership', now()),
('Разъяснение по формам КДК', 'Разъяснения по заполнению форм КДК', 'regulations', 'kdk-razyasnenie.pdf', '/docs/activity/kdk-razyasnenie.pdf', '', 'published', 'social_partnership', now()),
('Отраслевое тарифное соглашение в электроэнергетике на 2025–2027 годы', 'ОТС в электроэнергетике', 'agreements', 'ots-2025-2027.pdf', '/docs/activity/ots-2025-2027.pdf', '', 'published', 'social_partnership', now()),
('Саратовское областное трехстороннее соглашение на 2025–2027 годы', 'Трёхстороннее соглашение между правительством, работодателями и профсоюзами', 'agreements', 'trekhstoronnee-2025-2027.pdf', '/docs/activity/trekhstoronnee-2025-2027.pdf', '', 'published', 'social_partnership', now());

-- Section: finance
INSERT INTO union_documents (title, description, category, file_name, file_url, file_size, status, section, published_at) VALUES
('Положение о контрольно-ревизионном органе', 'Положение о КРО профсоюзной организации', 'regulations', 'kro-polozhenie.pdf', '/docs/activity/kro-polozhenie.pdf', '', 'published', 'finance', now()),
('Положение о порядке уплаты и учёта членских профсоюзных взносов', 'Порядок уплаты, распределения, учёта и контроля за поступлением взносов в ВЭП', 'regulations', 'vznosy-poryadok.pdf', '/docs/activity/vznosy-poryadok.pdf', '', 'published', 'finance', now()),
('Типовое Положение о централизованной бухгалтерии', 'Типовое положение для профсоюзных организаций', 'regulations', 'buhgalteria-tipovoe.pdf', '/docs/activity/buhgalteria-tipovoe.pdf', '', 'published', 'finance', now());

-- Section: youth
INSERT INTO union_documents (title, description, category, file_name, file_url, file_size, status, section, published_at) VALUES
('Положение о конкурсе «Молодой профсоюзный лидер года»', 'Конкурс для молодых профсоюзных активистов', 'regulations', 'molodoy-lider.pdf', '/docs/activity/molodoy-lider.pdf', '', 'published', 'youth', now()),
('Положение о конкурсе «Лучшая ППО по работе с молодёжью»', 'Конкурс первичных организаций по молодёжной работе', 'regulations', 'luchshaya-ppo-molodezh.pdf', '/docs/activity/luchshaya-ppo-molodezh.pdf', '', 'published', 'youth', now()),
('Положение о Молодежном совете областной организации ВЭП', 'Положение и состав Молодёжного совета', 'regulations', 'molodezhny-sovet.pdf', '/docs/activity/molodezhny-sovet.pdf', '', 'published', 'youth', now());
