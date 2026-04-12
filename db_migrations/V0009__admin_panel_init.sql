-- Флаг is_admin в users
ALTER TABLE t_p72465170_avito_like_board.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS username VARCHAR(50),
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Таблица quick_links
CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.quick_links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL,
  icon VARCHAR(50) DEFAULT 'Link',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES t_p72465170_avito_like_board.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица settings
CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Начальные quick_links
INSERT INTO t_p72465170_avito_like_board.quick_links (title, url, icon, sort_order)
VALUES
  ('Добавить объявление', '/admin/ads/new', 'Plus', 1),
  ('Пользователи', '/admin/users', 'Users', 2),
  ('Настройки сайта', '/admin/settings', 'Settings', 3)
ON CONFLICT DO NOTHING;