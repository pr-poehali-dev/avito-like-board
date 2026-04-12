INSERT INTO t_p72465170_avito_like_board.settings (key, value) VALUES
  ('site_name', 'Моя домашняя страница'),
  ('site_url', 'http://yoursite.com/'),
  ('force_https', 'false'),
  ('redirect_www', 'false'),
  ('meta_description', ''),
  ('meta_keywords', ''),
  ('site_short_name', ''),
  ('timezone', 'UTC'),
  ('use_custom_404', 'false'),
  ('site_offline', 'false')
ON CONFLICT (key) DO NOTHING;