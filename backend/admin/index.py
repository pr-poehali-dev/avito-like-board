"""
Административная панель API.
Поддерживаемые action:
  login         — вход администратора (возвращает admin_token)
  me            — данные текущего администратора
  stats         — статистика (users, ads, online)
  quick_links   — список быстрых ссылок
  ql_create     — создать ссылку
  ql_update     — обновить ссылку
  ql_delete     — удалить ссылку
  ql_reorder    — изменить порядок
  settings_get  — получить настройки (group=general|security или все)
  settings_save — сохранить настройки (объект ключ-значение)
  server_time   — текущее время сервера в заданном часовом поясе
  my_ip         — IP-адрес текущего клиента
  logs          — список логов (limit, offset, level)
  logout        — выход
"""
import json
import os
import hashlib
import secrets
import psycopg2
from datetime import datetime, timedelta
import pytz

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p72465170_avito_like_board")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data: dict):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}


def err(msg: str, code: int = 400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}


def get_admin(headers: dict, conn):
    token = headers.get("X-Admin-Token") or headers.get("x-admin-token") or ""
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"""SELECT u.id, u.name, u.email, u.is_admin, u.full_name
            FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.id = %s AND s.expires_at > NOW() AND u.is_admin = TRUE""",
        (token,)
    )
    return cur.fetchone()


def write_log(conn, user_id, action: str, details: str, ip: str, status_code: int = 200):
    try:
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.admin_logs (user_id, action, details, ip, status_code)
                VALUES (%s, %s, %s, %s, %s)""",
            (user_id, action, details, ip, status_code)
        )
    except Exception:
        pass


def get_client_ip(event: dict) -> str:
    headers = event.get("headers") or {}
    return (
        (event.get("requestContext") or {}).get("identity", {}).get("sourceIp")
        or headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or headers.get("x-forwarded-for", "").split(",")[0].strip()
        or "unknown"
    )


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = event.get("headers") or {}
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action") or body.get("action") or ""

    # ── LOGIN ──────────────────────────────────────────────────────────────────
    if action == "login":
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        if not email or not password:
            return err("Введите email и пароль")

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, name, email, full_name, is_admin
                FROM {SCHEMA}.users
                WHERE email = %s AND password_hash = %s""",
            (email, pw_hash)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Неверный email или пароль", 401)
        if not row[4]:
            conn.close()
            return err("Нет доступа к административной панели", 403)

        user_id = row[0]
        token = secrets.token_hex(32)
        expires = datetime.now() + timedelta(days=7)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (id, user_id, expires_at) VALUES (%s, %s, %s)",
            (token, user_id, expires)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.users SET last_login = NOW() WHERE id = %s",
            (user_id,)
        )
        write_log(conn, user_id, "login", f"Вход: {email}", get_client_ip(event), 200)
        conn.commit()
        conn.close()

        return ok({
            "ok": True,
            "token": token,
            "user": {"id": row[0], "name": row[1], "email": row[2], "full_name": row[3]}
        })

    # ── ME ─────────────────────────────────────────────────────────────────────
    if action == "me":
        conn = get_conn()
        admin = get_admin(headers, conn)
        conn.close()
        if not admin:
            return err("Нет доступа", 401)
        return ok({"ok": True, "user": {
            "id": admin[0], "name": admin[1], "email": admin[2],
            "is_admin": admin[3], "full_name": admin[4]
        }})

    # ── STATS ──────────────────────────────────────────────────────────────────
    if action == "stats":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
        users_count = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.ads")
        ads_count = cur.fetchone()[0]

        online_threshold = datetime.now() - timedelta(minutes=5)
        cur.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.sessions WHERE expires_at > NOW() AND created_at > %s",
            (online_threshold,)
        )
        online_count = cur.fetchone()[0]

        conn.close()
        return ok({"users_count": users_count, "ads_count": ads_count, "online_count": online_count})

    # ── QUICK LINKS LIST ───────────────────────────────────────────────────────
    if action == "quick_links":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        cur = conn.cursor()
        cur.execute(
            f"SELECT id, title, url, icon, sort_order FROM {SCHEMA}.quick_links ORDER BY sort_order ASC"
        )
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [
            {"id": r[0], "title": r[1], "url": r[2], "icon": r[3], "sort_order": r[4]}
            for r in rows
        ]})

    # ── QUICK LINK CREATE ──────────────────────────────────────────────────────
    if action == "ql_create":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        title = (body.get("title") or "").strip()
        url = (body.get("url") or "").strip()
        icon = (body.get("icon") or "Link").strip()
        sort_order = int(body.get("sort_order") or 0)

        if not title or not url:
            conn.close()
            return err("Укажите название и URL")

        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.quick_links (title, url, icon, sort_order, created_by)
                VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (title, url, icon, sort_order, admin[0])
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── QUICK LINK UPDATE ──────────────────────────────────────────────────────
    if action == "ql_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        ql_id = body.get("id")
        title = (body.get("title") or "").strip()
        url = (body.get("url") or "").strip()
        icon = (body.get("icon") or "Link").strip()
        sort_order = int(body.get("sort_order") or 0)

        if not ql_id or not title or not url:
            conn.close()
            return err("Укажите id, название и URL")

        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.quick_links
                SET title=%s, url=%s, icon=%s, sort_order=%s, updated_at=NOW()
                WHERE id=%s""",
            (title, url, icon, sort_order, ql_id)
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── QUICK LINK DELETE ──────────────────────────────────────────────────────
    if action == "ql_delete":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        ql_id = body.get("id")
        if not ql_id:
            conn.close()
            return err("Укажите id")

        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.quick_links WHERE id = %s", (ql_id,))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── QUICK LINKS REORDER ────────────────────────────────────────────────────
    if action == "ql_reorder":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        items = body.get("items") or []
        cur = conn.cursor()
        for item in items:
            cur.execute(
                f"UPDATE {SCHEMA}.quick_links SET sort_order=%s WHERE id=%s",
                (item.get("sort_order", 0), item.get("id"))
            )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── LOGOUT ─────────────────────────────────────────────────────────────────
    if action == "logout":
        token = headers.get("X-Admin-Token") or headers.get("x-admin-token") or ""
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE id = %s", (token,))
            conn.commit()
            conn.close()
        return ok({"ok": True})

    # ── SETTINGS GET ───────────────────────────────────────────────────────────
    if action == "settings_get":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        group = qs.get("group") or body.get("group") or ""

        GROUP_KEYS = {
            "general": {
                "site_name", "site_url", "force_https", "redirect_www",
                "meta_description", "meta_keywords", "site_short_name",
                "timezone", "use_custom_404", "site_offline",
            },
            "security": {
                "admin_filename", "display_php_errors", "block_iframe",
                "allowed_admin_ips", "max_login_attempts", "login_block_timeout",
                "admin_inactivity_timeout", "reset_auth_key_on_login",
                "admin_logs_retention_days", "admin_path",
            },
            "ads": {
                "ads_per_page", "ads_per_page_search", "max_search_results",
                "min_search_chars", "quick_search_limit", "related_ads_count",
                "related_same_category_only", "popular_ads_count", "tag_cloud_limit",
                "max_pending_ads", "new_ad_hours", "updated_ad_hours",
                "category_separator", "tag_separator", "speedbar_separator",
                "ad_date_format", "ad_sort_by", "ad_sort_order",
                "catalog_sort_by", "catalog_sort_order", "indexnow_enabled",
                "indexnow_provider", "decline_dates", "auto_generate_meta",
                "notify_new_ads", "allow_user_tags", "warn_concurrent_edit",
                "rating_type",
            },
            "optimization": {
                "caching_enabled", "cache_type", "cache_server",
                "redis_username", "redis_password", "cache_forced_clear_interval",
                "cache_pages_count", "cache_full_ad_days", "track_last_viewed",
                "view_count_min_time", "cache_view_counter",
                "count_ads_in_categories", "tag_cloud_enabled",
            },
            "storage": {
                "storage_ad_images", "storage_avatars", "storage_backups",
            },
            "email": {
                "admin_email", "mail_from_name", "mail_method",
                "smtp_host", "smtp_port", "smtp_username", "smtp_password",
                "smtp_encryption", "smtp_auth_email",
            },
            "users": {
                "auth_method", "allow_2fa", "default_user_group",
                "stopforumspam_enabled", "stopforumspam_api_key",
                "show_pending_ads_in_profile", "allow_multi_registration_per_ip",
                "notify_pm", "default_feedback_groups",
            },
            "images": {
                "image_driver", "image_convert_format", "image_unique_prefix",
                "image_min_size", "image_max_size", "image_resize_by",
                "image_max_weight_kb", "image_auto_remove_days",
                "avatar_max_weight_kb", "image_align",
            },
        }

        BOOL_KEYS = {
            "force_https", "redirect_www", "use_custom_404", "site_offline",
            "display_php_errors", "block_iframe", "reset_auth_key_on_login",
            "related_same_category_only", "indexnow_enabled", "decline_dates",
            "auto_generate_meta", "notify_new_ads", "allow_user_tags",
            "warn_concurrent_edit",
            "caching_enabled", "track_last_viewed", "cache_view_counter",
            "count_ads_in_categories", "tag_cloud_enabled",
            "allow_2fa", "stopforumspam_enabled", "show_pending_ads_in_profile",
            "allow_multi_registration_per_ip", "notify_pm",
            "image_unique_prefix",
        }
        INT_KEYS = {
            "max_login_attempts", "login_block_timeout",
            "admin_inactivity_timeout", "admin_logs_retention_days",
            "ads_per_page", "ads_per_page_search", "max_search_results",
            "min_search_chars", "quick_search_limit", "related_ads_count",
            "popular_ads_count", "tag_cloud_limit", "max_pending_ads",
            "new_ad_hours", "updated_ad_hours",
            "cache_forced_clear_interval", "cache_pages_count",
            "cache_full_ad_days", "view_count_min_time",
            "smtp_port", "image_max_weight_kb", "image_auto_remove_days",
            "avatar_max_weight_kb",
        }

        cur = conn.cursor()
        if group in GROUP_KEYS:
            keys_list = list(GROUP_KEYS[group])
            placeholders = ", ".join(["%s"] * len(keys_list))
            cur.execute(
                f"SELECT key, value FROM {SCHEMA}.settings WHERE key IN ({placeholders})",
                keys_list
            )
        else:
            cur.execute(f"SELECT key, value FROM {SCHEMA}.settings")

        rows = cur.fetchall()
        conn.close()

        result = {}
        for k, v in rows:
            if k in BOOL_KEYS:
                result[k] = v == "true"
            elif k in INT_KEYS:
                result[k] = int(v) if v and v.isdigit() else 0
            else:
                result[k] = v or ""
        return ok(result)

    # ── SETTINGS SAVE ──────────────────────────────────────────────────────────
    if action == "settings_save":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        data = body.get("data") or {}
        if not data:
            conn.close()
            return err("Нет данных для сохранения")

        VALID_KEYS = {
            # general
            "site_name", "site_url", "force_https", "redirect_www",
            "meta_description", "meta_keywords", "site_short_name",
            "timezone", "use_custom_404", "site_offline",
            # security
            "admin_filename", "display_php_errors", "block_iframe",
            "allowed_admin_ips", "max_login_attempts", "login_block_timeout",
            "admin_inactivity_timeout", "reset_auth_key_on_login",
            "admin_logs_retention_days", "admin_path",
            # ads
            "ads_per_page", "ads_per_page_search", "max_search_results",
            "min_search_chars", "quick_search_limit", "related_ads_count",
            "related_same_category_only", "popular_ads_count", "tag_cloud_limit",
            "max_pending_ads", "new_ad_hours", "updated_ad_hours",
            "category_separator", "tag_separator", "speedbar_separator",
            "ad_date_format", "ad_sort_by", "ad_sort_order",
            "catalog_sort_by", "catalog_sort_order", "indexnow_enabled",
            "indexnow_provider", "decline_dates", "auto_generate_meta",
            "notify_new_ads", "allow_user_tags", "warn_concurrent_edit",
            "rating_type",
            # optimization
            "caching_enabled", "cache_type", "cache_server",
            "redis_username", "redis_password", "cache_forced_clear_interval",
            "cache_pages_count", "cache_full_ad_days", "track_last_viewed",
            "view_count_min_time", "cache_view_counter",
            "count_ads_in_categories", "tag_cloud_enabled",
            # storage
            "storage_ad_images", "storage_avatars", "storage_backups",
            # email
            "admin_email", "mail_from_name", "mail_method",
            "smtp_host", "smtp_port", "smtp_username", "smtp_password",
            "smtp_encryption", "smtp_auth_email",
            # users
            "auth_method", "allow_2fa", "default_user_group",
            "stopforumspam_enabled", "stopforumspam_api_key",
            "show_pending_ads_in_profile", "allow_multi_registration_per_ip",
            "notify_pm", "default_feedback_groups",
            # images
            "image_driver", "image_convert_format", "image_unique_prefix",
            "image_min_size", "image_max_size", "image_resize_by",
            "image_max_weight_kb", "image_auto_remove_days",
            "avatar_max_weight_kb", "image_align",
        }
        validation_errors = {}

        # ── Валидация general ──────────────────────────────────────────────────
        if "site_url" in data:
            url_val = str(data["site_url"]).strip()
            if not (url_val.startswith("http://") or url_val.startswith("https://")):
                validation_errors["site_url"] = "URL должен начинаться с http:// или https://"
            elif not url_val.endswith("/"):
                validation_errors["site_url"] = "URL должен заканчиваться на /"

        if "meta_description" in data:
            if len(str(data.get("meta_description") or "")) > 200:
                validation_errors["meta_description"] = "Не более 200 символов"

        if "timezone" in data:
            tz_val = str(data["timezone"]).strip()
            if tz_val not in pytz.all_timezones_set:
                validation_errors["timezone"] = "Неверный часовой пояс"

        # ── Валидация security ─────────────────────────────────────────────────
        import re
        if "admin_filename" in data:
            fn = str(data["admin_filename"]).strip()
            if not fn:
                validation_errors["admin_filename"] = "Имя файла не может быть пустым"
            elif not re.match(r'^[\w\-\.]+$', fn) or len(fn) > 100:
                validation_errors["admin_filename"] = "Допустимы только буквы, цифры, -_. (макс. 100)"

        for int_key, min_val in [
            ("max_login_attempts", 0), ("login_block_timeout", 1),
            ("admin_inactivity_timeout", 0), ("admin_logs_retention_days", 30),
        ]:
            if int_key in data:
                try:
                    v = int(data[int_key])
                    if v < min_val:
                        validation_errors[int_key] = f"Минимальное значение: {min_val}"
                except (ValueError, TypeError):
                    validation_errors[int_key] = "Должно быть целым числом"

        if "allowed_admin_ips" in data:
            raw_ips = str(data.get("allowed_admin_ips") or "").strip()
            if raw_ips:
                ip_pattern = re.compile(
                    r'^(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)$'
                )
                for line in raw_ips.splitlines():
                    line = line.strip()
                    if line and not ip_pattern.match(line):
                        validation_errors["allowed_admin_ips"] = f"Неверный формат IP: {line}"
                        break

        if "admin_path" in data:
            path_val = str(data["admin_path"]).strip()
            if not path_val.startswith("/"):
                validation_errors["admin_path"] = "Путь должен начинаться с /"
            elif not re.match(r'^/[\w\-/]+$', path_val):
                validation_errors["admin_path"] = "Допустимы только буквы, цифры, - и /"
            elif len(path_val) > 100:
                validation_errors["admin_path"] = "Максимум 100 символов"

        # ── Валидация ads ──────────────────────────────────────────────────────
        ADS_INT_MIN1 = {
            "ads_per_page", "ads_per_page_search", "min_search_chars",
            "quick_search_limit", "popular_ads_count", "tag_cloud_limit",
        }
        ADS_INT_MIN0 = {
            "max_search_results", "related_ads_count", "max_pending_ads",
            "new_ad_hours", "updated_ad_hours",
        }
        for k in ADS_INT_MIN1:
            if k in data:
                try:
                    v = int(data[k])
                    if v < 1:
                        validation_errors[k] = "Минимальное значение: 1"
                except (ValueError, TypeError):
                    validation_errors[k] = "Должно быть целым числом"
        for k in ADS_INT_MIN0:
            if k in data:
                try:
                    v = int(data[k])
                    if v < 0:
                        validation_errors[k] = "Минимальное значение: 0"
                except (ValueError, TypeError):
                    validation_errors[k] = "Должно быть целым числом"

        VALID_SORT_BY = {"date", "edit_date", "rating", "views", "title"}
        VALID_SORT_ORDER = {"asc", "desc"}
        for sort_key in ("ad_sort_by", "catalog_sort_by"):
            if sort_key in data and str(data[sort_key]) not in VALID_SORT_BY:
                validation_errors[sort_key] = f"Допустимые значения: {', '.join(VALID_SORT_BY)}"
        for ord_key in ("ad_sort_order", "catalog_sort_order"):
            if ord_key in data and str(data[ord_key]) not in VALID_SORT_ORDER:
                validation_errors[ord_key] = "Допустимые значения: asc, desc"

        VALID_PROVIDERS = {"indexnow", "yandex", "bing", "naver", "seznam"}
        if "indexnow_provider" in data and str(data["indexnow_provider"]) not in VALID_PROVIDERS:
            validation_errors["indexnow_provider"] = f"Допустимые значения: {', '.join(VALID_PROVIDERS)}"

        VALID_RATING = {"stars", "likes"}
        if "rating_type" in data and str(data["rating_type"]) not in VALID_RATING:
            validation_errors["rating_type"] = "Допустимые значения: stars, likes"

        for sep_key in ("category_separator", "tag_separator", "speedbar_separator", "ad_date_format"):
            if sep_key in data and len(str(data.get(sep_key) or "")) > 255:
                validation_errors[sep_key] = "Максимум 255 символов"

        if "ad_date_format" in data and not str(data.get("ad_date_format") or "").strip():
            validation_errors["ad_date_format"] = "Формат даты не может быть пустым"

        # ── Валидация optimization ─────────────────────────────────────────────
        VALID_CACHE_TYPES = {"file", "memcache", "redis"}
        if "cache_type" in data and str(data["cache_type"]) not in VALID_CACHE_TYPES:
            validation_errors["cache_type"] = "Допустимые значения: file, memcache, redis"

        if "cache_server" in data:
            ct = str(data.get("cache_type") or "file")
            srv = str(data.get("cache_server") or "").strip()
            if ct != "file" and srv and ":" not in srv:
                validation_errors["cache_server"] = "Формат: хост:порт (например localhost:11211)"

        for opt_int_key, opt_min in [
            ("cache_forced_clear_interval", 0), ("cache_pages_count", 0),
            ("cache_full_ad_days", 0), ("view_count_min_time", 1),
        ]:
            if opt_int_key in data:
                try:
                    v = int(data[opt_int_key])
                    if v < opt_min:
                        validation_errors[opt_int_key] = f"Минимальное значение: {opt_min}"
                except (ValueError, TypeError):
                    validation_errors[opt_int_key] = "Должно быть целым числом"

        # ── Валидация storage ──────────────────────────────────────────────────
        VALID_STORAGE = {"local", "s3", "ftp"}
        for sk in ("storage_ad_images", "storage_avatars", "storage_backups"):
            if sk in data and str(data[sk]) not in VALID_STORAGE:
                validation_errors[sk] = "Допустимые значения: local, s3, ftp"

        # ── Валидация email ────────────────────────────────────────────────────
        import re as _re
        EMAIL_RE = _re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
        for ek in ("admin_email", "smtp_auth_email"):
            if ek in data:
                v = str(data[ek] or "").strip()
                if v and not EMAIL_RE.match(v):
                    validation_errors[ek] = "Неверный формат email"
        if "mail_method" in data and str(data["mail_method"]) not in {"mail", "smtp"}:
            validation_errors["mail_method"] = "Допустимые значения: mail, smtp"
        if "smtp_encryption" in data and str(data["smtp_encryption"]) not in {"none", "ssl", "tls"}:
            validation_errors["smtp_encryption"] = "Допустимые значения: none, ssl, tls"
        if "smtp_port" in data:
            try:
                v = int(data["smtp_port"])
                if v < 1 or v > 65535:
                    validation_errors["smtp_port"] = "Порт: 1–65535"
            except (ValueError, TypeError):
                validation_errors["smtp_port"] = "Должно быть целым числом"

        # ── Валидация users ────────────────────────────────────────────────────
        if "auth_method" in data and str(data["auth_method"]) not in {"login", "email"}:
            validation_errors["auth_method"] = "Допустимые значения: login, email"
        if "default_feedback_groups" in data:
            try:
                import json as _json
                groups = _json.loads(str(data["default_feedback_groups"]))
                if not isinstance(groups, list):
                    raise ValueError
            except (ValueError, TypeError):
                validation_errors["default_feedback_groups"] = "Должен быть массив ID групп"

        # ── Валидация images ───────────────────────────────────────────────────
        if "image_driver" in data and str(data["image_driver"]) not in {"auto", "imagick", "gd"}:
            validation_errors["image_driver"] = "Допустимые значения: auto, imagick, gd"
        if "image_convert_format" in data and str(data["image_convert_format"]) not in {"off", "png", "jpg", "webp", "avif"}:
            validation_errors["image_convert_format"] = "Допустимые значения: off, png, jpg, webp, avif"
        if "image_resize_by" in data and str(data["image_resize_by"]) not in {"longest", "width", "height"}:
            validation_errors["image_resize_by"] = "Допустимые значения: longest, width, height"
        if "image_align" in data and str(data["image_align"]) not in {"none", "left", "center", "right"}:
            validation_errors["image_align"] = "Допустимые значения: none, left, center, right"
        for img_int_key in ("image_max_weight_kb", "image_auto_remove_days"):
            if img_int_key in data:
                try:
                    v = int(data[img_int_key])
                    if v < 0:
                        validation_errors[img_int_key] = "Минимум 0"
                except (ValueError, TypeError):
                    validation_errors[img_int_key] = "Должно быть целым числом"
        if "avatar_max_weight_kb" in data:
            try:
                v = int(data["avatar_max_weight_kb"])
                if v < -1:
                    validation_errors["avatar_max_weight_kb"] = "Минимум -1 (запрет загрузки)"
            except (ValueError, TypeError):
                validation_errors["avatar_max_weight_kb"] = "Должно быть целым числом или -1"

        if validation_errors:
            conn.close()
            return {"statusCode": 422, "headers": CORS, "body": json.dumps({"errors": validation_errors})}

        cur = conn.cursor()
        for key, value in data.items():
            if key not in VALID_KEYS:
                continue
            str_val = str(value).lower() if isinstance(value, bool) else str(value)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.settings (key, value, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()""",
                (key, str_val)
            )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── SERVER TIME ────────────────────────────────────────────────────────────
    if action == "server_time":
        tz_name = qs.get("timezone") or body.get("timezone") or "UTC"
        try:
            tz = pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            return err("Неверный часовой пояс")

        now = datetime.now(pytz.utc).astimezone(tz)
        return ok({"datetime": now.strftime("%Y-%m-%d %H:%M:%S"), "timezone": tz_name})

    # ── MY IP ──────────────────────────────────────────────────────────────────
    if action == "my_ip":
        ip = (
            (event.get("requestContext") or {}).get("identity", {}).get("sourceIp")
            or headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or headers.get("x-forwarded-for", "").split(",")[0].strip()
            or "unknown"
        )
        return ok({"ip": ip})

    # ── USER GROUPS ────────────────────────────────────────────────────────────
    if action == "user_groups":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, description FROM {SCHEMA}.user_groups ORDER BY id")
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [{"id": r[0], "name": r[1], "description": r[2]} for r in rows]})

    # ── LOGS ───────────────────────────────────────────────────────────────────
    if action == "logs":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        limit = min(int(qs.get("limit") or body.get("limit") or 100), 500)
        offset = int(qs.get("offset") or body.get("offset") or 0)
        level = qs.get("level") or body.get("level") or "all"

        cur = conn.cursor()
        where = ""
        if level == "error":
            where = "WHERE l.status_code >= 400"
        elif level == "ok":
            where = "WHERE l.status_code < 400"

        cur.execute(
            f"""SELECT l.id, l.action, l.details, l.ip, l.status_code, l.created_at,
                       u.name, u.email
                FROM {SCHEMA}.admin_logs l
                LEFT JOIN {SCHEMA}.users u ON u.id = l.user_id
                {where}
                ORDER BY l.created_at DESC
                LIMIT %s OFFSET %s""",
            (limit, offset)
        )
        rows = cur.fetchall()

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.admin_logs {where}")
        total = cur.fetchone()[0]
        conn.close()

        return ok({
            "total": total,
            "items": [
                {
                    "id": r[0], "action": r[1], "details": r[2],
                    "ip": r[3], "status_code": r[4],
                    "created_at": str(r[5]),
                    "user_name": r[6], "user_email": r[7],
                }
                for r in rows
            ]
        })

    return err("Укажите action")