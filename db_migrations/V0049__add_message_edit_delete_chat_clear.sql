-- Мягкое удаление и флаг редактирования для сообщений
ALTER TABLE t_p72465170_avito_like_board.messages
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS original_content TEXT NULL;

-- Мягкое удаление для чатов (по каждому участнику)
ALTER TABLE t_p72465170_avito_like_board.chats
  ADD COLUMN IF NOT EXISTS cleared_at_user1 TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS cleared_at_user2 TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS removed_by_user1 BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS removed_by_user2 BOOLEAN NOT NULL DEFAULT FALSE;
