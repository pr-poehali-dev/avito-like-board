-- Добавляем индексы для быстрого поиска полей по категории
CREATE INDEX IF NOT EXISTS idx_acf_categories_category_id ON t_p72465170_avito_like_board.ad_custom_field_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_acf_categories_field_id ON t_p72465170_avito_like_board.ad_custom_field_categories(field_id);
CREATE INDEX IF NOT EXISTS idx_acf_values_ad_id ON t_p72465170_avito_like_board.ad_custom_field_values(ad_id);

-- Таблица для пользовательских полей, которые сам пользователь добавляет при создании объявления
CREATE TABLE IF NOT EXISTS t_p72465170_avito_like_board.ad_user_custom_fields (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL REFERENCES t_p72465170_avito_like_board.ads(id),
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_user_custom_fields_ad_id ON t_p72465170_avito_like_board.ad_user_custom_fields(ad_id);
