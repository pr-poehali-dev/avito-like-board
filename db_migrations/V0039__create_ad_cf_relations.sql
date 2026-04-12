CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.ad_custom_field_categories (
  field_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (field_id, category_id)
);

CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.ad_custom_field_add_groups (
  field_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (field_id, group_id)
);

CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.ad_custom_field_view_groups (
  field_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (field_id, group_id)
);

CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.ad_custom_field_values (
  ad_id INTEGER NOT NULL,
  field_id INTEGER NOT NULL,
  value TEXT,
  PRIMARY KEY (ad_id, field_id)
);