"""
Авторизация: регистрация с подтверждением email, вход, выход, проверка сессии.
Роутинг через поле action в теле запроса или query-параметр action.
"""
import json
import os
import hashlib
import secrets
import random
import smtplib
from email.mime.text import MIMEText
import psycopg2

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
            "body": json.dumps({"ok": True, "session_id": session_id, "user": {"id": user_id, "name": name, "email": user_email}})
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
        conn.close()
        if not row:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия не найдена"})}

        user_id, name, email = row
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"ok": True, "user": {"id": user_id, "name": name, "email": email}})
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


    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите action"})}