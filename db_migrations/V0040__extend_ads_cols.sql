ALTER TABLE t_p72465170_avito_like_board.ads
  ADD COLUMN IF NOT EXISTS category_id INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE;

UPDATE t_p72465170_avito_like_board.ads SET updated_at = created_at WHERE updated_at IS NULL;