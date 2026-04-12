CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.user_custom_field_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE t_p72465170_avito_like_board.user_custom_fields
  ADD COLUMN IF NOT EXISTS folder_id INTEGER;