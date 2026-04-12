CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER,
  name VARCHAR(255) NOT NULL,
  alt_name VARCHAR(255),
  slug VARCHAR(255) NOT NULL,
  meta_title VARCHAR(255),
  meta_description TEXT,
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon VARCHAR(255),
  show_in_menu BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON t_p72465170_avito_like_board.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON t_p72465170_avito_like_board.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON t_p72465170_avito_like_board.categories(sort_order);