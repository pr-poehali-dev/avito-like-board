"""
Административная панель API.
Поддерживаемые action:
  login, me, logout, stats, quick_links, ql_create/update/delete/reorder
  settings_get, settings_save, server_time, my_ip, logs
  user_groups, group_create/update/remove, users_list, users_bulk
  cf_list/create/update/remove, cf_folder_list/create/update/remove
  cat_list/create/update/remove/reorder
  acf_folder_list/create/update/remove, acf_list/create/update/remove
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

    # ── USER GROUPS LIST ───────────────────────────────────────────────────────
    if action == "user_groups":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"""SELECT id, name, short_name, description, account_deletion_policy,
                               can_view_offline, is_temporary, default_group_id,
                               can_access_admin, can_edit_all_news
                        FROM {SCHEMA}.user_groups ORDER BY id""")
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [
            {"id": r[0], "name": r[1], "short_name": r[2], "description": r[3],
             "account_deletion_policy": r[4], "can_view_offline": r[5],
             "is_temporary": r[6], "default_group_id": r[7],
             "can_access_admin": r[8], "can_edit_all_news": r[9]}
            for r in rows
        ]})

    # ── USER GROUPS CREATE ─────────────────────────────────────────────────────
    if action == "group_create":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название группы обязательно")
        short_name = str(body.get("short_name") or "")[:20] or None
        adp = int(body.get("account_deletion_policy") or 1)
        cvo = bool(body.get("can_view_offline"))
        it = bool(body.get("is_temporary"))
        dgid = body.get("default_group_id")
        dgid = int(dgid) if dgid else None
        caa = bool(body.get("can_access_admin"))
        cean = bool(body.get("can_edit_all_news"))
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.user_groups
                (name, short_name, account_deletion_policy, can_view_offline, is_temporary,
                 default_group_id, can_access_admin, can_edit_all_news, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW()) RETURNING id""",
            (name, short_name, adp, cvo, it, dgid, caa, cean)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── USER GROUPS UPDATE ─────────────────────────────────────────────────────
    if action == "group_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        gid = body.get("id")
        if not gid:
            conn.close()
            return err("Не указан id группы")
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название группы обязательно")
        short_name = str(body.get("short_name") or "")[:20] or None
        adp = int(body.get("account_deletion_policy") or 1)
        cvo = bool(body.get("can_view_offline"))
        it = bool(body.get("is_temporary"))
        dgid = body.get("default_group_id")
        dgid = int(dgid) if dgid else None
        caa = bool(body.get("can_access_admin"))
        cean = bool(body.get("can_edit_all_news"))
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.user_groups SET name=%s, short_name=%s,
                account_deletion_policy=%s, can_view_offline=%s, is_temporary=%s,
                default_group_id=%s, can_access_admin=%s, can_edit_all_news=%s, updated_at=NOW()
                WHERE id=%s""",
            (name, short_name, adp, cvo, it, dgid, caa, cean, int(gid))
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── USER GROUPS REMOVE ─────────────────────────────────────────────────────
    if action == "group_remove":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        gid = body.get("id")
        if not gid:
            conn.close()
            return err("Не указан id группы")
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE group_id=%s", (int(gid),))
        cnt = cur.fetchone()[0]
        if cnt > 0:
            conn.close()
            return err(f"В группе {cnt} пользователей. Переведите их в другую группу перед удалением.")
        cur.execute(f"UPDATE {SCHEMA}.user_groups SET default_group_id=NULL WHERE default_group_id=%s", (int(gid),))
        cur.execute(f"UPDATE {SCHEMA}.users SET group_id=NULL WHERE group_id=%s", (int(gid),))
        cur.execute(f"UPDATE {SCHEMA}.user_groups SET updated_at=NOW() WHERE id=%s", (int(gid),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── USERS LIST ─────────────────────────────────────────────────────────────
    if action == "users_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        search = str(body.get("search") or qs.get("search") or "").strip()
        exact_match = body.get("exact_match") or qs.get("exact_match")
        post_banned = body.get("post_banned")
        banned = body.get("banned")
        comment_banned = body.get("comment_banned")
        reg_from = body.get("reg_date_from") or qs.get("reg_date_from")
        reg_to = body.get("reg_date_to") or qs.get("reg_date_to")
        visit_from = body.get("last_visit_from") or qs.get("last_visit_from")
        visit_to = body.get("last_visit_to") or qs.get("last_visit_to")
        posts_min = body.get("posts_min")
        posts_max = body.get("posts_max")
        sort_by = str(body.get("sort_by") or qs.get("sort_by") or "id")
        sort_order = "ASC" if str(body.get("sort_order") or qs.get("sort_order") or "asc").lower() == "asc" else "DESC"
        page = max(1, int(body.get("page") or qs.get("page") or 1))
        per_page = min(int(body.get("per_page") or qs.get("per_page") or 25), 100)

        SORT_MAP = {"username": "u.username", "reg_date": "u.created_at", "last_visit": "u.last_visit", "posts_count": "posts_count"}
        sort_col = SORT_MAP.get(sort_by, "u.id")

        conditions = []
        params = []
        if search:
            if exact_match in (True, "true", "1"):
                conditions.append("(u.username = %s OR u.email = %s)")
                params += [search, search]
            else:
                conditions.append("(u.username ILIKE %s OR u.email ILIKE %s)")
                params += [f"%{search}%", f"%{search}%"]
        if post_banned is not None and post_banned != "":
            conditions.append("u.can_post = %s")
            params.append(post_banned in (False, "false", "0"))
        if banned is not None and banned != "":
            conditions.append("u.is_banned = %s")
            params.append(banned in (True, "true", "1"))
        if comment_banned is not None and comment_banned != "":
            conditions.append("u.can_comment = %s")
            params.append(comment_banned in (False, "false", "0"))
        if reg_from:
            conditions.append("u.created_at >= %s")
            params.append(reg_from)
        if reg_to:
            conditions.append("u.created_at <= %s")
            params.append(reg_to)
        if visit_from:
            conditions.append("u.last_visit >= %s")
            params.append(visit_from)
        if visit_to:
            conditions.append("u.last_visit <= %s")
            params.append(visit_to)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        posts_subq = f"(SELECT COUNT(*) FROM {SCHEMA}.ads a WHERE a.user_id=u.id) AS posts_count"
        having_parts = []
        having_params = []
        if posts_min is not None and posts_min != "":
            having_parts.append(f"(SELECT COUNT(*) FROM {SCHEMA}.ads a WHERE a.user_id=u.id) >= %s")
            having_params.append(int(posts_min))
        if posts_max is not None and posts_max != "":
            having_parts.append(f"(SELECT COUNT(*) FROM {SCHEMA}.ads a WHERE a.user_id=u.id) <= %s")
            having_params.append(int(posts_max))
        having = ("AND " + " AND ".join(having_parts)) if having_parts else ""

        cur = conn.cursor()
        cur.execute(
            f"""SELECT u.id, COALESCE(u.username, u.name) as username, u.email,
                       u.created_at, u.last_visit, {posts_subq},
                       COALESCE(u.is_banned,false), COALESCE(u.can_post,true), COALESCE(u.can_comment,true),
                       u.group_id, g.name
                FROM {SCHEMA}.users u
                LEFT JOIN {SCHEMA}.user_groups g ON g.id = u.group_id
                {where}
                {having}
                ORDER BY {sort_col} {sort_order}
                LIMIT %s OFFSET %s""",
            params + having_params + [per_page, (page - 1) * per_page]
        )
        rows = cur.fetchall()
        cur.execute(
            f"""SELECT COUNT(*) FROM {SCHEMA}.users u {where} {having}""",
            params + having_params
        )
        total = cur.fetchone()[0]
        conn.close()
        return ok({
            "items": [
                {"id": r[0], "username": r[1], "email": r[2],
                 "reg_date": str(r[3]) if r[3] else None,
                 "last_visit": str(r[4]) if r[4] else None,
                 "posts_count": r[5], "is_banned": r[6],
                 "can_post": r[7], "can_comment": r[8],
                 "group_id": r[9], "group_name": r[10]}
                for r in rows
            ],
            "total": total, "page": page, "per_page": per_page
        })

    # ── USERS BULK ACTION ──────────────────────────────────────────────────────
    if action == "users_bulk":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        user_ids = body.get("user_ids") or []
        bulk_action = str(body.get("bulk_action") or "")
        params_data = body.get("params") or {}
        if not user_ids or not bulk_action:
            conn.close()
            return err("user_ids и bulk_action обязательны")
        ids_ph = ", ".join(["%s"] * len(user_ids))
        cur = conn.cursor()
        if bulk_action == "ban":
            cur.execute(f"UPDATE {SCHEMA}.users SET is_banned=true WHERE id IN ({ids_ph})", user_ids)
        elif bulk_action == "unban":
            cur.execute(f"UPDATE {SCHEMA}.users SET is_banned=false WHERE id IN ({ids_ph})", user_ids)
        elif bulk_action == "change_group":
            gid = params_data.get("group_id")
            if not gid:
                conn.close()
                return err("Не указан group_id")
            cur.execute(f"UPDATE {SCHEMA}.users SET group_id=%s WHERE id IN ({ids_ph})", [int(gid)] + user_ids)
        elif bulk_action == "allow_post":
            cur.execute(f"UPDATE {SCHEMA}.users SET can_post=true WHERE id IN ({ids_ph})", user_ids)
        elif bulk_action == "deny_post":
            cur.execute(f"UPDATE {SCHEMA}.users SET can_post=false WHERE id IN ({ids_ph})", user_ids)
        else:
            conn.close()
            return err(f"Неизвестное действие: {bulk_action}")
        affected = cur.rowcount
        conn.commit()
        conn.close()
        return ok({"ok": True, "affected": affected})

    # ── CUSTOM FIELDS LIST ─────────────────────────────────────────────────────
    if action == "cf_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"""SELECT id, name, description, field_type, options,
                               show_on_registration, user_editable, is_private, sort_order, folder_id
                        FROM {SCHEMA}.user_custom_fields ORDER BY sort_order, id""")
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [
            {"id": r[0], "name": r[1], "description": r[2], "field_type": r[3],
             "options": r[4], "show_on_registration": r[5], "user_editable": r[6],
             "is_private": r[7], "sort_order": r[8], "folder_id": r[9]}
            for r in rows
        ]})

    # ── CUSTOM FIELDS CREATE ───────────────────────────────────────────────────
    if action == "cf_create":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название поля обязательно")
        ft = str(body.get("field_type") or "text")
        if ft not in ("text", "textarea", "select", "boolean", "datetime"):
            conn.close()
            return err("Неверный тип поля")
        cur = conn.cursor()
        folder_id = body.get("folder_id")
        folder_id = int(folder_id) if folder_id else None
        cur.execute(
            f"""INSERT INTO {SCHEMA}.user_custom_fields
                (name, description, field_type, options, show_on_registration,
                 user_editable, is_private, sort_order, folder_id, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) RETURNING id""",
            (name, body.get("description") or "", ft,
             body.get("options") or None,
             bool(body.get("show_on_registration")),
             body.get("user_editable") is not False,
             bool(body.get("is_private")),
             int(body.get("sort_order") or 0), folder_id)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── CUSTOM FIELDS UPDATE ───────────────────────────────────────────────────
    if action == "cf_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cfid = body.get("id")
        if not cfid:
            conn.close()
            return err("Не указан id поля")
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название поля обязательно")
        ft = str(body.get("field_type") or "text")
        if ft not in ("text", "textarea", "select", "boolean", "datetime"):
            conn.close()
            return err("Неверный тип поля")
        cur = conn.cursor()
        folder_id = body.get("folder_id")
        folder_id = int(folder_id) if folder_id else None
        cur.execute(
            f"""UPDATE {SCHEMA}.user_custom_fields SET name=%s, description=%s,
                field_type=%s, options=%s, show_on_registration=%s,
                user_editable=%s, is_private=%s, sort_order=%s, folder_id=%s, updated_at=NOW()
                WHERE id=%s""",
            (name, body.get("description") or "", ft,
             body.get("options") or None,
             bool(body.get("show_on_registration")),
             body.get("user_editable") is not False,
             bool(body.get("is_private")),
             int(body.get("sort_order") or 0), folder_id, int(cfid))
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── CUSTOM FIELDS REMOVE ───────────────────────────────────────────────────
    if action == "cf_remove":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cfid = body.get("id")
        if not cfid:
            conn.close()
            return err("Не указан id поля")
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.user_custom_fields SET updated_at=NOW() WHERE id=%s", (int(cfid),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── CF FOLDERS LIST ────────────────────────────────────────────────────────
    if action == "cf_folder_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, sort_order FROM {SCHEMA}.user_custom_field_folders ORDER BY sort_order, id")
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [{"id": r[0], "name": r[1], "sort_order": r[2]} for r in rows]})

    # ── CF FOLDERS CREATE ──────────────────────────────────────────────────────
    if action == "cf_folder_create":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название папки обязательно")
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.user_custom_field_folders (name, sort_order) VALUES (%s, %s) RETURNING id",
            (name, int(body.get("sort_order") or 0))
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── CF FOLDERS UPDATE ──────────────────────────────────────────────────────
    if action == "cf_folder_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        fid = body.get("id")
        if not fid:
            conn.close()
            return err("Не указан id папки")
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название папки обязательно")
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.user_custom_field_folders SET name=%s, sort_order=%s WHERE id=%s",
            (name, int(body.get("sort_order") or 0), int(fid))
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── CF FOLDERS REMOVE ──────────────────────────────────────────────────────
    if action == "cf_folder_remove":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        fid = body.get("id")
        if not fid:
            conn.close()
            return err("Не указан id папки")
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.user_custom_fields SET folder_id=NULL WHERE folder_id=%s",
            (int(fid),)
        )
        cur.execute(f"UPDATE {SCHEMA}.user_custom_field_folders SET sort_order=sort_order WHERE id=%s", (int(fid),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── ADS GET (одно объявление) ──────────────────────────────────────────────
    if action == "ads_get":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        ad_id = body.get("id") or qs.get("id")
        if not ad_id:
            conn.close()
            return err("Не указан id")
        cur = conn.cursor()
        cur.execute(f"""
            SELECT a.id, a.title, a.description, a.price, a.status, a.views,
                   a.created_at, a.updated_at, a.category, a.category_id, a.city,
                   a.condition, a.photos,
                   COALESCE(u.username, u.name) AS uname, u.email, u.id AS uid, u.full_name
            FROM {SCHEMA}.ads a
            LEFT JOIN {SCHEMA}.users u ON u.id = a.user_id
            WHERE a.id = %s
        """, (int(ad_id),))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Объявление не найдено", 404)
        cur.execute(f"""
            SELECT cv.field_id, f.name, f.field_type, cv.value
            FROM {SCHEMA}.ad_custom_field_values cv
            JOIN {SCHEMA}.ad_custom_fields f ON f.id = cv.field_id
            WHERE cv.ad_id = %s
        """, (int(ad_id),))
        cf_vals = [{"field_id": r[0], "name": r[1], "field_type": r[2], "value": r[3]} for r in cur.fetchall()]
        conn.close()
        return ok({
            "id": row[0], "title": row[1], "description": row[2], "price": row[3],
            "status": row[4], "views": row[5],
            "created_at": str(row[6]) if row[6] else None,
            "updated_at": str(row[7]) if row[7] else None,
            "category": row[8], "category_id": row[9], "city": row[10],
            "condition": row[11], "photos": list(row[12] or []),
            "author_name": row[13], "author_email": row[14], "author_id": row[15],
            "author_full_name": row[16],
            "custom_fields": cf_vals,
        })

    # ── ADS UPDATE (редактирование) ────────────────────────────────────────────
    if action == "ads_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        ad_id = body.get("id")
        if not ad_id:
            conn.close()
            return err("Не указан id")
        title = str(body.get("title") or "").strip()
        if not title:
            conn.close()
            return err("Заголовок обязателен")
        cur = conn.cursor()
        cur.execute(f"""
            UPDATE {SCHEMA}.ads SET
                title=%s, description=%s, price=%s, status=%s,
                city=%s, category=%s, condition=%s, updated_at=NOW()
            WHERE id=%s
        """, (
            title,
            body.get("description") or "",
            int(body.get("price") or 0),
            str(body.get("status") or "active"),
            str(body.get("city") or ""),
            str(body.get("category") or ""),
            str(body.get("condition") or ""),
            int(ad_id),
        ))
        cf_values = body.get("custom_fields") or {}
        for field_id_str, value in cf_values.items():
            cur.execute(f"""
                INSERT INTO {SCHEMA}.ad_custom_field_values (ad_id, field_id, value)
                VALUES (%s, %s, %s)
                ON CONFLICT (ad_id, field_id) DO UPDATE SET value=EXCLUDED.value
            """, (int(ad_id), int(field_id_str), str(value)))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── ADS LIST ───────────────────────────────────────────────────────────────
    if action == "ads_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)

        search       = str(body.get("search") or qs.get("search") or "").strip()
        status_f     = body.get("status") or qs.get("status") or ""
        user_search  = str(body.get("user_search") or qs.get("user_search") or "").strip()
        category_id  = body.get("category_id") or qs.get("category_id")
        date_from    = body.get("date_from") or qs.get("date_from")
        date_to      = body.get("date_to") or qs.get("date_to")
        sort_by      = str(body.get("sort_by") or qs.get("sort_by") or "created_at")
        sort_order   = "ASC" if str(body.get("sort_order") or qs.get("sort_order") or "desc").lower() == "asc" else "DESC"
        page         = max(1, int(body.get("page") or qs.get("page") or 1))
        per_page     = min(int(body.get("per_page") or qs.get("per_page") or 25), 100)
        cf_filters   = body.get("custom_fields") or {}

        SORT_MAP = {"created_at": "a.created_at", "title": "a.title", "price": "a.price", "views": "a.views"}
        sort_col = SORT_MAP.get(sort_by, "a.created_at")

        conditions = []
        params = []

        if search:
            conditions.append("(a.title ILIKE %s OR a.description ILIKE %s)")
            params += [f"%{search}%", f"%{search}%"]
        if status_f:
            conditions.append("a.status = %s")
            params.append(status_f)
        if user_search:
            conditions.append("(u.username ILIKE %s OR u.email ILIKE %s OR u.name ILIKE %s)")
            params += [f"%{user_search}%", f"%{user_search}%", f"%{user_search}%"]
        if category_id:
            conditions.append("(a.category_id = %s OR a.category = %s)")
            params += [int(category_id), str(category_id)]
        if date_from:
            conditions.append("a.created_at >= %s")
            params.append(date_from)
        if date_to:
            conditions.append("a.created_at <= %s")
            params.append(date_to + " 23:59:59")

        for field_id_str, field_val in cf_filters.items():
            if not field_val:
                continue
            conditions.append(
                f"EXISTS (SELECT 1 FROM {SCHEMA}.ad_custom_field_values cv WHERE cv.ad_id=a.id AND cv.field_id=%s AND cv.value ILIKE %s)"
            )
            params += [int(field_id_str), f"%{field_val}%"]

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        cur = conn.cursor()
        cur.execute(f"""
            SELECT a.id, a.title, a.price, a.status, a.views, a.created_at,
                   a.category, a.category_id, a.city,
                   COALESCE(u.username, u.name) AS uname, u.email, u.id AS uid
            FROM {SCHEMA}.ads a
            LEFT JOIN {SCHEMA}.users u ON u.id = a.user_id
            {where}
            ORDER BY {sort_col} {sort_order}
            LIMIT %s OFFSET %s
        """, params + [per_page, (page - 1) * per_page])
        rows = cur.fetchall()

        cur.execute(f"""
            SELECT COUNT(*) FROM {SCHEMA}.ads a
            LEFT JOIN {SCHEMA}.users u ON u.id = a.user_id
            {where}
        """, params)
        total = cur.fetchone()[0]
        conn.close()

        return ok({
            "items": [
                {"id": r[0], "title": r[1], "price": r[2], "status": r[3],
                 "views": r[4], "created_at": str(r[5]) if r[5] else None,
                 "category": r[6], "category_id": r[7], "city": r[8],
                 "author_name": r[9], "author_email": r[10], "author_id": r[11]}
                for r in rows
            ],
            "total": total, "page": page, "per_page": per_page
        })

    if action == "ads_set_status":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        ad_ids = body.get("ad_ids") or []
        new_status = str(body.get("status") or "")
        if not ad_ids or not new_status:
            conn.close()
            return err("Нужны ad_ids и status")
        allowed = {"active", "pending", "rejected", "closed", "archived"}
        if new_status not in allowed:
            conn.close()
            return err(f"Статус должен быть одним из: {', '.join(allowed)}")
        ids_ph = ", ".join(["%s"] * len(ad_ids))
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.ads SET status=%s, updated_at=NOW() WHERE id IN ({ids_ph})",
            [new_status] + [int(i) for i in ad_ids]
        )
        affected = cur.rowcount
        conn.commit()
        conn.close()
        return ok({"ok": True, "affected": affected})

    if action == "ads_get_cf":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"""
            SELECT f.id, f.name, f.field_type, fld.name AS folder_name
            FROM {SCHEMA}.ad_custom_fields f
            LEFT JOIN {SCHEMA}.ad_custom_field_folders fld ON fld.id=f.folder_id
            ORDER BY f.sort_order, f.id
        """)
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [{"id": r[0], "name": r[1], "field_type": r[2], "folder_name": r[3]} for r in rows]})

    # ── CATEGORIES ─────────────────────────────────────────────────────────────
    if action == "cat_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"""
            SELECT c.id, c.parent_id, c.name, c.alt_name, c.slug, c.meta_title,
                   c.meta_description, c.short_description, c.sort_order, c.icon,
                   c.show_in_menu,
                   (SELECT COUNT(*) FROM {SCHEMA}.ads a WHERE a.category_id = c.id) AS ads_count
            FROM {SCHEMA}.categories c ORDER BY c.sort_order, c.name
        """)
        rows = cur.fetchall()
        conn.close()
        cats = [{"id": r[0], "parent_id": r[1], "name": r[2], "alt_name": r[3],
                 "slug": r[4], "meta_title": r[5], "meta_description": r[6],
                 "short_description": r[7], "sort_order": r[8], "icon": r[9],
                 "show_in_menu": r[10], "ads_count": r[11], "children": []}
                for r in rows]
        cat_map = {c["id"]: c for c in cats}
        tree = []
        for c in cats:
            if c["parent_id"] and c["parent_id"] in cat_map:
                cat_map[c["parent_id"]]["children"].append(c)
            else:
                tree.append(c)
        return ok({"items": tree, "flat": cats})

    if action == "cat_create":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название категории обязательно")
        import re as _re
        slug = str(body.get("slug") or "").strip()
        if not slug:
            slug = _re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or f"cat-{int(datetime.now().timestamp())}"
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM {SCHEMA}.categories WHERE slug=%s", (slug,))
        if cur.fetchone():
            slug = f"{slug}-{int(datetime.now().timestamp())}"
        parent_id = body.get("parent_id")
        parent_id = int(parent_id) if parent_id else None
        cur.execute(
            f"""INSERT INTO {SCHEMA}.categories
                (parent_id, name, alt_name, slug, meta_title, meta_description,
                 short_description, sort_order, icon, show_in_menu, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) RETURNING id""",
            (parent_id, name,
             body.get("alt_name") or None, slug,
             body.get("meta_title") or None,
             body.get("meta_description") or None,
             body.get("short_description") or None,
             int(body.get("sort_order") or 0),
             body.get("icon") or None,
             body.get("show_in_menu") is not False)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id, "slug": slug})

    if action == "cat_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cid = body.get("id")
        if not cid:
            conn.close()
            return err("Не указан id категории")
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название категории обязательно")
        import re as _re
        slug = str(body.get("slug") or "").strip()
        if not slug:
            slug = _re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or f"cat-{int(cid)}"
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM {SCHEMA}.categories WHERE slug=%s AND id!=%s", (slug, int(cid)))
        if cur.fetchone():
            slug = f"{slug}-{int(cid)}"
        parent_id = body.get("parent_id")
        parent_id = int(parent_id) if parent_id else None
        if parent_id == int(cid):
            parent_id = None
        cur.execute(
            f"""UPDATE {SCHEMA}.categories SET parent_id=%s, name=%s, alt_name=%s, slug=%s,
                meta_title=%s, meta_description=%s, short_description=%s,
                sort_order=%s, icon=%s, show_in_menu=%s, updated_at=NOW() WHERE id=%s""",
            (parent_id, name,
             body.get("alt_name") or None, slug,
             body.get("meta_title") or None,
             body.get("meta_description") or None,
             body.get("short_description") or None,
             int(body.get("sort_order") or 0),
             body.get("icon") or None,
             body.get("show_in_menu") is not False,
             int(cid))
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    if action == "cat_remove":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cid = body.get("id")
        if not cid:
            conn.close()
            return err("Не указан id категории")
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.categories WHERE parent_id=%s", (int(cid),))
        child_cnt = cur.fetchone()[0]
        if child_cnt > 0:
            conn.close()
            return err(f"Нельзя удалить: в категории {child_cnt} подкатегорий. Сначала удалите их.")
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.ads WHERE category_id=%s", (int(cid),))
        ads_cnt = cur.fetchone()[0]
        if ads_cnt > 0:
            conn.close()
            return err(f"Нельзя удалить: в категории {ads_cnt} объявлений.")
        cur.execute(f"UPDATE {SCHEMA}.categories SET updated_at=NOW() WHERE parent_id=%s", (int(cid),))
        cur.execute(f"UPDATE {SCHEMA}.ad_custom_field_categories SET category_id=NULL WHERE category_id=%s", (int(cid),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    if action == "cat_reorder":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        items = body.get("items") or []
        cur = conn.cursor()
        for item in items:
            pid = item.get("parent_id")
            pid = int(pid) if pid else None
            cur.execute(
                f"UPDATE {SCHEMA}.categories SET parent_id=%s, sort_order=%s, updated_at=NOW() WHERE id=%s",
                (pid, int(item.get("sort_order") or 0), int(item["id"]))
            )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── AD CUSTOM FIELD FOLDERS ────────────────────────────────────────────────
    if action == "acf_folder_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, sort_order FROM {SCHEMA}.ad_custom_field_folders ORDER BY sort_order, id")
        rows = cur.fetchall()
        conn.close()
        return ok({"items": [{"id": r[0], "name": r[1], "sort_order": r[2]} for r in rows]})

    if action == "acf_folder_create":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название папки обязательно")
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.ad_custom_field_folders (name, sort_order) VALUES (%s,%s) RETURNING id",
            (name, int(body.get("sort_order") or 0))
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    if action == "acf_folder_update":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        fid = body.get("id")
        name = str(body.get("name") or "").strip()
        if not fid or not name:
            conn.close()
            return err("Требуются id и name")
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.ad_custom_field_folders SET name=%s, sort_order=%s WHERE id=%s",
            (name, int(body.get("sort_order") or 0), int(fid))
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    if action == "acf_folder_remove":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        fid = body.get("id")
        if not fid:
            conn.close()
            return err("Не указан id папки")
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.ad_custom_fields SET folder_id=NULL WHERE folder_id=%s", (int(fid),))
        cur.execute(f"UPDATE {SCHEMA}.ad_custom_field_folders SET sort_order=sort_order WHERE id=%s", (int(fid),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── AD CUSTOM FIELDS ───────────────────────────────────────────────────────
    if action == "acf_list":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        folder_filter = body.get("folder_id") or qs.get("folder_id")
        cur = conn.cursor()
        where = ""
        params = []
        if folder_filter is not None and folder_filter != "":
            if str(folder_filter) == "0":
                where = "WHERE f.folder_id IS NULL"
            else:
                where = "WHERE f.folder_id=%s"
                params.append(int(folder_filter))
        cur.execute(f"""
            SELECT f.id, f.folder_id, fld.name AS folder_name, f.name, f.description,
                   f.placeholder, f.field_type, f.options, f.is_optional, f.default_value, f.sort_order
            FROM {SCHEMA}.ad_custom_fields f
            LEFT JOIN {SCHEMA}.ad_custom_field_folders fld ON fld.id=f.folder_id
            {where}
            ORDER BY f.sort_order, f.id
        """, params)
        rows = cur.fetchall()
        field_ids = [r[0] for r in rows]
        cats_map = {}
        add_groups_map = {}
        view_groups_map = {}
        if field_ids:
            ph = ",".join(["%s"] * len(field_ids))
            cur.execute(f"""SELECT fc.field_id, c.id, c.name
                FROM {SCHEMA}.ad_custom_field_categories fc
                JOIN {SCHEMA}.categories c ON c.id=fc.category_id
                WHERE fc.field_id IN ({ph})""", field_ids)
            for r in cur.fetchall():
                cats_map.setdefault(r[0], []).append({"id": r[1], "name": r[2]})
            cur.execute(f"""SELECT fg.field_id, g.id, g.name
                FROM {SCHEMA}.ad_custom_field_add_groups fg
                JOIN {SCHEMA}.user_groups g ON g.id=fg.group_id
                WHERE fg.field_id IN ({ph})""", field_ids)
            for r in cur.fetchall():
                add_groups_map.setdefault(r[0], []).append({"id": r[1], "name": r[2]})
            cur.execute(f"""SELECT fg.field_id, g.id, g.name
                FROM {SCHEMA}.ad_custom_field_view_groups fg
                JOIN {SCHEMA}.user_groups g ON g.id=fg.group_id
                WHERE fg.field_id IN ({ph})""", field_ids)
            for r in cur.fetchall():
                view_groups_map.setdefault(r[0], []).append({"id": r[1], "name": r[2]})
        conn.close()
        return ok({"items": [
            {"id": r[0], "folder_id": r[1], "folder_name": r[2], "name": r[3],
             "description": r[4], "placeholder": r[5], "field_type": r[6],
             "options": r[7], "is_optional": r[8], "default_value": r[9], "sort_order": r[10],
             "categories": cats_map.get(r[0], []),
             "add_groups": add_groups_map.get(r[0], []),
             "view_groups": view_groups_map.get(r[0], [])}
            for r in rows
        ], "total": len(rows)})

    if action in ("acf_create", "acf_update"):
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        name = str(body.get("name") or "").strip()
        if not name:
            conn.close()
            return err("Название поля обязательно")
        ft = str(body.get("field_type") or "text")
        if ft not in ("text", "textarea", "select", "boolean", "datetime"):
            conn.close()
            return err("Неверный тип поля")
        folder_id = body.get("folder_id")
        folder_id = int(folder_id) if folder_id else None
        cur = conn.cursor()

        if action == "acf_create":
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ad_custom_fields
                    (folder_id, name, description, placeholder, field_type, options,
                     is_optional, default_value, sort_order, updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) RETURNING id""",
                (folder_id, name, body.get("description") or None,
                 body.get("placeholder") or None, ft,
                 body.get("options") or None,
                 bool(body.get("is_optional")),
                 body.get("default_value") or None,
                 int(body.get("sort_order") or 0))
            )
            field_id = cur.fetchone()[0]
        else:
            field_id = body.get("id")
            if not field_id:
                conn.close()
                return err("Не указан id поля")
            field_id = int(field_id)
            cur.execute(
                f"""UPDATE {SCHEMA}.ad_custom_fields SET folder_id=%s, name=%s, description=%s,
                    placeholder=%s, field_type=%s, options=%s, is_optional=%s,
                    default_value=%s, sort_order=%s, updated_at=NOW() WHERE id=%s""",
                (folder_id, name, body.get("description") or None,
                 body.get("placeholder") or None, ft,
                 body.get("options") or None,
                 bool(body.get("is_optional")),
                 body.get("default_value") or None,
                 int(body.get("sort_order") or 0), field_id)
            )
            cur.execute(f"UPDATE {SCHEMA}.ad_custom_field_categories SET field_id=field_id WHERE field_id=%s", (field_id,))
            cur.execute(f"UPDATE {SCHEMA}.ad_custom_field_add_groups SET field_id=field_id WHERE field_id=%s", (field_id,))
            cur.execute(f"UPDATE {SCHEMA}.ad_custom_field_view_groups SET field_id=field_id WHERE field_id=%s", (field_id,))

        category_ids = body.get("category_ids") or []
        add_group_ids = body.get("add_group_ids") or []
        view_group_ids = body.get("view_group_ids") or []

        for cid in category_ids:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ad_custom_field_categories (field_id, category_id)
                    VALUES (%s,%s) ON CONFLICT DO NOTHING""", (field_id, int(cid))
            )
        for gid in add_group_ids:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ad_custom_field_add_groups (field_id, group_id)
                    VALUES (%s,%s) ON CONFLICT DO NOTHING""", (field_id, int(gid))
            )
        for gid in view_group_ids:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ad_custom_field_view_groups (field_id, group_id)
                    VALUES (%s,%s) ON CONFLICT DO NOTHING""", (field_id, int(gid))
            )
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": field_id})

    if action == "acf_remove":
        conn = get_conn()
        admin = get_admin(headers, conn)
        if not admin:
            conn.close()
            return err("Нет доступа", 401)
        fid = body.get("id")
        if not fid:
            conn.close()
            return err("Не указан id поля")
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.ad_custom_fields SET updated_at=NOW() WHERE id=%s", (int(fid),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

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