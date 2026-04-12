CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.user_custom_fields (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  field_type VARCHAR(20) NOT NULL DEFAULT 'text',
  options TEXT,
  show_on_registration BOOLEAN NOT NULL DEFAULT false,
  user_editable BOOLEAN NOT NULL DEFAULT true,
  is_private BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);