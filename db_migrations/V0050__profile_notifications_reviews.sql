-- Расширяем таблицу users новыми полями
ALTER TABLE t_p72465170_avito_like_board.users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS vk_url VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS tg_username VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS show_phone BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NULL;

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link_url VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON t_p72465170_avito_like_board.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON t_p72465170_avito_like_board.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.reviews (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
  target_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(author_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON t_p72465170_avito_like_board.reviews(target_id);
