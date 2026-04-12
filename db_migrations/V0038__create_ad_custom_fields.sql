CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.ad_custom_fields (
  id SERIAL PRIMARY KEY,
  folder_id INTEGER,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  placeholder VARCHAR(255),
  field_type VARCHAR(20) NOT NULL DEFAULT 'text',
  options TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);