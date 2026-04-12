-- Настройки автоответа пользователя (вкл/выкл + приветствие)
CREATE TABLE t_p72465170_avito_like_board.auto_reply_settings (
    user_id INTEGER PRIMARY KEY REFERENCES t_p72465170_avito_like_board.users(id),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    greeting TEXT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Правила автоответа: вопрос -> ответ
CREATE TABLE t_p72465170_avito_like_board.auto_reply_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    match_type VARCHAR(10) NOT NULL DEFAULT 'partial',
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auto_reply_rules_user ON t_p72465170_avito_like_board.auto_reply_rules(user_id);
