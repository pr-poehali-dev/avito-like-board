CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.user_custom_field_values (
  user_id INTEGER NOT NULL,
  field_id INTEGER NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, field_id)
);