ALTER TABLE t_p72465170_avito_like_board.favorite_folders
  ADD COLUMN IF NOT EXISTS folder_type VARCHAR(20) NOT NULL DEFAULT 'favorites';

UPDATE t_p72465170_avito_like_board.favorite_folders SET folder_type = 'favorites' WHERE folder_type IS NULL;