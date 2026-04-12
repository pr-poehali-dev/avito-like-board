INSERT INTO t_p72465170_avito_like_board.settings (key, value) VALUES
  ('admin_filename', 'admin.php'),
  ('display_php_errors', 'false'),
  ('block_iframe', 'false'),
  ('allowed_admin_ips', ''),
  ('max_login_attempts', '5'),
  ('login_block_timeout', '20'),
  ('admin_inactivity_timeout', '30'),
  ('reset_auth_key_on_login', 'false'),
  ('admin_logs_retention_days', '30')
ON CONFLICT (key) DO NOTHING;