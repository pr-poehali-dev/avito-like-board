-- Назначаем первого пользователя администратором
UPDATE t_p72465170_avito_like_board.users
SET is_admin = TRUE, full_name = name
WHERE id = 1;