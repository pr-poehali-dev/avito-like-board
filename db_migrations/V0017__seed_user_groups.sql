INSERT INTO t_p72465170_avito_like_board.user_groups (name, description)
SELECT name, description FROM (VALUES
  ('Администраторы', 'Полный доступ к системе'),
  ('Пользователи', 'Стандартные пользователи сайта'),
  ('Модераторы', 'Модерация объявлений')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM t_p72465170_avito_like_board.user_groups LIMIT 1);