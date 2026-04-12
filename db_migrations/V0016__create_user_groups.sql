CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.user_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);