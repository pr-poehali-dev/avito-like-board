CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.admin_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip VARCHAR(50),
  status_code INTEGER DEFAULT 200,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p72465170_avito_like_board.settings (key, value)
VALUES ('admin_path', '/admin')
ON CONFLICT (key) DO NOTHING;