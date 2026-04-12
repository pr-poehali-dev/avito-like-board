"""
Авторизация: регистрация с подтверждением email, вход, выход, проверка сессии.
update_profile — изменение имени, города, описания.
upload_photo — загрузка аватара или обложки в S3.
"""
import json
import os
import hashlib
import secrets
import random
import smtplib
import base64
import uuid
from email.mime.text import MIMEText
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p72465170_avito_like_board")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_session_id() -> str:
    return secrets.token_hex(32)


def make_code() -> str:
    return str(random.randint(100000, 999999))


def send_email(to: str, code: str):
    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]

    msg = MIMEText(
        f"Ваш код подтверждения: {code}\n\nКод действителен 10 минут.",
        "plain", "utf-8"
    )
    msg["Subject"] = f"Код подтверждения: {code}"
    msg["From"] = user
    msg["To"] = to

    if port == 465:
        with smtplib.SMTP_SSL(host, port) as smtp:
            smtp.login(user, password)
            smtp.sendmail(user, [to], msg.as_string())
    else:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(user, [to], msg.as_string())


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action") or body.get("action") or ""

    # send_code — шаг 1 регистрации: отправляем 6-значный код на email
    if action == "send_code":
        email = (body.get("email") or "").strip().lower()
        if not email or "@" not in email:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите корректный email"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Email уже зарегистрирован"})}

        code = make_code()
        cur.execute(
            f"INSERT INTO {SCHEMA}.email_codes (email, code) VALUES (%s, %s)",
            (email, code)
        )
        conn.commit()
        conn.close()

        send_email(email, code)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # register — шаг 2: проверяем код и создаём аккаунт
    if action == "register":
        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        code = (body.get("code") or "").strip()

        if not name or not email or not password or not code:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}
        if len(password) < 6:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пароль минимум 6 символов"})}

        conn = get_conn()
        cur = conn.cursor()

        # Проверяем код
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.email_codes
                WHERE email = %s AND code = %s AND used = FALSE AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1""",
            (email, code)
        )
        code_row = cur.fetchone()
        if not code_row:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный или просроченный код"})}

        # Помечаем код как использованный
        cur.execute(f"UPDATE {SCHEMA}.email_codes SET used = TRUE WHERE id = %s", (code_row[0],))

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Email уже зарегистрирован"})}

        pw_hash = hash_password(password)
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
            (name, email, pw_hash)
        )
        user_id = cur.fetchone()[0]
        session_id = make_session_id()
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)",
            (session_id, user_id)
        )
        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "session_id": session_id, "user": {"id": user_id, "name": name, "email": email}})
        }

    # login
    if action == "login":
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not email or not password:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите email и пароль"})}

        pw_hash = hash_password(password)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, email FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s",
            (email, pw_hash)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}

        user_id, name, user_email = row
        session_id = make_session_id()
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)",
            (session_id, user_id)
        )
        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "session_id": session_id, "user": {
                "id": user_id, "name": name, "email": user_email,
                "avatar_url": None, "cover_url": None, "city": None, "about": None
            }})
        }

    # me — проверка текущей сессии
    if action == "me" or (method == "GET" and not action):
        session_id = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
        if not session_id:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет сессии"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT u.id, u.name, u.email FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.id = %s AND s.expires_at > NOW()""",
            (session_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия не найдена"})}

        cur.execute(
            f"SELECT id, name, email, avatar_url, cover_url, city, about FROM {SCHEMA}.users WHERE id = %s",
            (row[0],)
        )
        u = cur.fetchone()
        conn.close()
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "user": {
                "id": u[0], "name": u[1], "email": u[2],
                "avatar_url": u[3], "cover_url": u[4], "city": u[5], "about": u[6]
            }})
        }

    # logout
    if action == "logout":
        session_id = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
        if session_id:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
            conn.commit()
            conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # update_profile — обновление имени, города, описания
    if action == "update_profile":
        session_id = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
        if not session_id:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет сессии"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.id = %s AND s.expires_at > NOW()""",
            (session_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия не найдена"})}

        user_id = row[0]
        name = (body.get("name") or "").strip()
        city = (body.get("city") or "").strip()
        about = (body.get("about") or "").strip()

        if name:
            cur.execute(f"UPDATE {SCHEMA}.users SET name = %s WHERE id = %s", (name, user_id))
        cur.execute(f"UPDATE {SCHEMA}.users SET city = %s, about = %s WHERE id = %s", (city or None, about or None, user_id))
        conn.commit()

        cur.execute(f"SELECT id, name, email, avatar_url, cover_url, city, about FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "user": {
                "id": u[0], "name": u[1], "email": u[2],
                "avatar_url": u[3], "cover_url": u[4], "city": u[5], "about": u[6]
            }})
        }

    # upload_photo — загрузка аватара или обложки в S3
    if action == "upload_photo":
        session_id = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
        if not session_id:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет сессии"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.id = %s AND s.expires_at > NOW()""",
            (session_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия не найдена"})}

        user_id = row[0]
        photo_type = body.get("type", "avatar")  # "avatar" или "cover"
        data_url = body.get("data", "")

        if not data_url:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет данных фото"})}

        if "," in data_url:
            header, b64 = data_url.split(",", 1)
            ext = "jpg"
            if "png" in header:
                ext = "png"
            elif "webp" in header:
                ext = "webp"
        else:
            b64, ext = data_url, "jpg"

        img_bytes = base64.b64decode(b64)
        key = f"profiles/{user_id}/{photo_type}_{uuid.uuid4().hex[:8]}.{ext}"

        s3 = boto3.client(
            "s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        s3.put_object(Bucket="files", Key=key, Body=img_bytes, ContentType=f"image/{ext}")

        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        col = "avatar_url" if photo_type == "avatar" else "cover_url"
        cur.execute(f"UPDATE {SCHEMA}.users SET {col} = %s WHERE id = %s", (cdn_url, user_id))
        conn.commit()
        conn.close()

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "url": cdn_url})}

    # profile_get — публичный профиль пользователя по id
    if action == "profile_get":
        profile_id = qs.get("user_id") or body.get("user_id")
        if not profile_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите user_id"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, avatar_url, cover_url, city, about, created_at FROM {SCHEMA}.users WHERE id = %s",
            (int(profile_id),)
        )
        u = cur.fetchone()
        if not u:
            conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Пользователь не найден"})}
        cur.execute(
            f"SELECT COUNT(*) FROM {SCHEMA}.ads WHERE user_id = %s AND status = 'active'",
            (int(profile_id),)
        )
        ads_count = cur.fetchone()[0]
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "user": {
            "id": u[0], "name": u[1], "avatar_url": u[2], "cover_url": u[3],
            "city": u[4], "about": u[5],
            "created_at": u[6].strftime("%d.%m.%Y") if u[6] else None,
            "ads_count": ads_count,
        }})}

    # unread_count — количество непрочитанных сообщений
    if action == "unread_count":
        sid = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
        if not sid:
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "count": 0})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()",
            (sid,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "count": 0})}
        user_id = row[0]
        cur.execute(
            f"""SELECT COUNT(*) FROM t_p72465170_avito_like_board.messages m
                JOIN t_p72465170_avito_like_board.chats c ON c.id = m.chat_id
                WHERE (c.user1_id = %s OR c.user2_id = %s)
                  AND m.sender_id != %s AND m.is_read = FALSE""",
            (user_id, user_id, user_id)
        )
        count = cur.fetchone()[0]
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "count": count})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите action"})}