-- Глобальное включение автоответов на уровне пользователя
ALTER TABLE t_p72465170_avito_like_board.users
  ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Основная таблица правил автоответов
CREATE TABLE t_p72465170_avito_like_board.user_auto_reply_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    conditions JSONB NOT NULL DEFAULT '[]',
    conditions_operator VARCHAR(3) NOT NULL DEFAULT 'AND',
    reply_text TEXT NOT NULL,
    delay_seconds INTEGER NOT NULL DEFAULT 0,
    once_per_dialog BOOLEAN NOT NULL DEFAULT TRUE,
    skip_if_user_replied BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_uar_rules_user_id ON t_p72465170_avito_like_board.user_auto_reply_rules(user_id);
CREATE INDEX idx_uar_rules_active ON t_p72465170_avito_like_board.user_auto_reply_rules(is_active);

-- Журнал срабатываний
CREATE TABLE t_p72465170_avito_like_board.user_auto_reply_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES t_p72465170_avito_like_board.user_auto_reply_rules(id),
    user_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.users(id),
    dialog_id INTEGER,
    incoming_message TEXT,
    reply_text TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_uar_logs_user_id ON t_p72465170_avito_like_board.user_auto_reply_logs(user_id);
CREATE INDEX idx_uar_logs_rule_id ON t_p72465170_avito_like_board.user_auto_reply_logs(rule_id);
