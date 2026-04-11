CREATE TABLE t_p72465170_avito_like_board.ads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  condition VARCHAR(50) DEFAULT 'Хорошее',
  status VARCHAR(20) DEFAULT 'active',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);