-- Настройка чатов
INSERT INTO t_p72465170_avito_like_board.settings (key, value)
VALUES ('chat_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Таблица чатов (диалоги между двумя пользователями)
CREATE TABLE t_p72465170_avito_like_board.chats (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    user2_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    encrypt_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Таблица сообщений
CREATE TABLE t_p72465170_avito_like_board.messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.chats(id),
    sender_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON t_p72465170_avito_like_board.messages(chat_id);
CREATE INDEX idx_messages_created_at ON t_p72465170_avito_like_board.messages(created_at);

-- Typing-индикатор
CREATE TABLE t_p72465170_avito_like_board.chat_typing (
    chat_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.chats(id),
    user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- Фильтрация слов
CREATE TABLE t_p72465170_avito_like_board.word_filters (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL UNIQUE,
    replacement VARCHAR(100) NOT NULL DEFAULT '***',
    created_at TIMESTAMP DEFAULT NOW()
);
