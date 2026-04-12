INSERT INTO t_p72465170_avito_like_board.settings (key, value) VALUES
('caching_enabled', 'true'),
('cache_type', 'file'),
('cache_server', ''),
('redis_username', ''),
('redis_password', ''),
('cache_forced_clear_interval', '0'),
('cache_pages_count', '10'),
('cache_full_ad_days', '30'),
('track_last_viewed', 'true'),
('view_count_min_time', '5'),
('cache_view_counter', 'true'),
('count_ads_in_categories', 'true'),
('tag_cloud_enabled', 'true')
ON CONFLICT (key) DO NOTHING;