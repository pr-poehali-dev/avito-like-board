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
                "admin_logs_retention_days",
            },
        }

        BOOL_KEYS = {
            "force_https", "redirect_www", "use_custom_404", "site_offline",
            "display_php_errors", "block_iframe", "reset_auth_key_on_login",
        }
        INT_KEYS = {
            "max_login_attempts", "login_block_timeout",
            "admin_inactivity_timeout", "admin_logs_retention_days",
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
            "admin_logs_retention_days",
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

    return err("Укажите action")