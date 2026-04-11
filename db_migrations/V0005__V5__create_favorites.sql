CREATE TABLE t_p72465170_avito_like_board.favorite_folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p72465170_avito_like_board.favorite_items (
  id SERIAL PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.favorite_folders(id),
  ad_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.ads(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(folder_id, ad_id)
);