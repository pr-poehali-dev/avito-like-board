"""
Чат между пользователями: создание диалога, отправка/получение сообщений,
шифрование AES-256 (ключ хранится на сервере), typing-индикатор, фильтрация слов.
"""
import json
import os
import secrets
import base64
import psycopg2
from datetime import datetime, timezone

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p72465170_avito_like_board")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data: dict):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}


def err(msg: str, code: int = 400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"ok": False, "error": msg})}


def get_user(event, cur):
    sid = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id") or ""
    if not sid:
        return None
    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()",
        (sid,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def is_chat_enabled(cur) -> bool:
    cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key = 'chat_enabled'")
    row = cur.fetchone()
    return (not row) or row[0] == "true"


def get_word_filters(cur) -> list:
    cur.execute(f"SELECT word, replacement FROM {SCHEMA}.word_filters")
    return cur.fetchall()


def apply_filters(text: str, filters: list) -> str:
    for word, replacement in filters:
        text = text.replace(word, replacement)
        text = text.replace(word.lower(), replacement)
        text = text.replace(word.upper(), replacement)
        text = text.replace(word.capitalize(), replacement)
    return text


def encrypt_message(text: str, key_hex: str) -> str:
    """XOR-шифрование с ключом (серверный ключ 32 байта). Возвращает base64."""
    key = bytes.fromhex(key_hex)
    text_bytes = text.encode("utf-8")
    encrypted = bytes([text_bytes[i] ^ key[i % len(key)] for i in range(len(text_bytes))])
    return base64.b64encode(encrypted).decode()


def decrypt_message(encrypted_b64: str, key_hex: str) -> str:
    """Расшифровка XOR."""
    key = bytes.fromhex(key_hex)
    encrypted = base64.b64decode(encrypted_b64)
    decrypted = bytes([encrypted[i] ^ key[i % len(key)] for i in range(len(encrypted))])
    return decrypted.decode("utf-8", errors="replace")


def fmt_msg(row, key_hex: str) -> dict:
    return {
        "id": row[0],
        "chat_id": row[1],
        "sender_id": row[2],
        "sender_name": row[3],
        "sender_avatar": row[4],
        "content": decrypt_message(row[5], key_hex),
        "is_read": row[6],
        "created_at": row[7].isoformat() if row[7] else None,
    }


def handler(event: dict, context) -> dict:
    """Чат: list_chats, get_messages, send_message, start_chat, typing, mark_read."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action") or body.get("action") or ""

    conn = get_conn()
    cur = conn.cursor()

    user_id = get_user(event, cur)

    # ── start_chat — создать или получить диалог с другим пользователем ──────
    if action == "start_chat":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        if not is_chat_enabled(cur):
            conn.close()
            return err("Чат отключён", 403)

        target_id = body.get("user_id")
        if not target_id or int(target_id) == user_id:
            conn.close()
            return err("Неверный пользователь")

        target_id = int(target_id)
        u1, u2 = min(user_id, target_id), max(user_id, target_id)

        cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE user1_id=%s AND user2_id=%s", (u1, u2))
        row = cur.fetchone()
        if row:
            conn.close()
            return ok({"ok": True, "chat_id": row[0]})

        key_hex = secrets.token_hex(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.chats (user1_id, user2_id, encrypt_key) VALUES (%s,%s,%s) RETURNING id",
            (u1, u2, key_hex)
        )
        chat_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "chat_id": chat_id})

    # ── list_chats — мои диалоги с последним сообщением ──────────────────────
    if action == "list_chats":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        if not is_chat_enabled(cur):
            conn.close()
            return err("Чат отключён", 403)

        cur.execute(f"""
            SELECT c.id, c.encrypt_key,
                   u1.id, u1.name, u1.avatar_url,
                   u2.id, u2.name, u2.avatar_url,
                   c.last_message_at,
                   (SELECT COUNT(*) FROM {SCHEMA}.messages m
                    WHERE m.chat_id=c.id AND m.is_read=FALSE AND m.sender_id != %s) as unread
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.users u1 ON u1.id=c.user1_id
            JOIN {SCHEMA}.users u2 ON u2.id=c.user2_id
            WHERE c.user1_id=%s OR c.user2_id=%s
            ORDER BY c.last_message_at DESC
        """, (user_id, user_id, user_id))
        rows = cur.fetchall()

        chats = []
        for r in rows:
            key_hex = r[1]
            other = {"id": r[5], "name": r[6], "avatar": r[7]} if r[2] == user_id else {"id": r[2], "name": r[3], "avatar": r[4]}
            cur.execute(f"""
                SELECT m.content FROM {SCHEMA}.messages m
                WHERE m.chat_id=%s ORDER BY m.created_at DESC LIMIT 1
            """, (r[0],))
            last_row = cur.fetchone()
            last_msg = decrypt_message(last_row[0], key_hex) if last_row else ""
            chats.append({
                "id": r[0],
                "other_user": other,
                "last_message": last_msg[:60] + ("…" if len(last_msg) > 60 else ""),
                "last_message_at": r[8].isoformat() if r[8] else None,
                "unread": r[9],
            })

        conn.close()
        return ok({"ok": True, "chats": chats})

    # ── get_messages — история чата ───────────────────────────────────────────
    if action == "get_messages":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        chat_id = body.get("chat_id") or qs.get("chat_id")
        since_id = int(body.get("since_id") or qs.get("since_id") or 0)
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")

        cur.execute(
            f"SELECT id, encrypt_key FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
            (int(chat_id), user_id, user_id)
        )
        chat = cur.fetchone()
        if not chat:
            conn.close()
            return err("Чат не найден", 404)

        key_hex = chat[1]
        cur.execute(f"""
            SELECT m.id, m.chat_id, m.sender_id, u.name, u.avatar_url,
                   m.content, m.is_read, m.created_at
            FROM {SCHEMA}.messages m
            JOIN {SCHEMA}.users u ON u.id=m.sender_id
            WHERE m.chat_id=%s AND m.id > %s
            ORDER BY m.created_at ASC
            LIMIT 100
        """, (int(chat_id), since_id))
        rows = cur.fetchall()

        # Отмечаем прочитанными
        cur.execute(f"""
            UPDATE {SCHEMA}.messages SET is_read=TRUE
            WHERE chat_id=%s AND sender_id != %s AND is_read=FALSE
        """, (int(chat_id), user_id))

        # Typing
        cur.execute(f"""
            SELECT u.name FROM {SCHEMA}.chat_typing ct
            JOIN {SCHEMA}.users u ON u.id=ct.user_id
            WHERE ct.chat_id=%s AND ct.user_id != %s
              AND ct.updated_at > NOW() - INTERVAL '5 seconds'
        """, (int(chat_id), user_id))
        typing_rows = cur.fetchall()
        typing = [r[0] for r in typing_rows]

        conn.commit()
        conn.close()
        return ok({"ok": True, "messages": [fmt_msg(r, key_hex) for r in rows], "typing": typing})

    # ── send_message ──────────────────────────────────────────────────────────
    if action == "send_message":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        if not is_chat_enabled(cur):
            conn.close()
            return err("Чат отключён", 403)

        chat_id = body.get("chat_id")
        content = (body.get("content") or "").strip()
        if not chat_id or not content:
            conn.close()
            return err("Укажите chat_id и content")
        if len(content) > 4000:
            conn.close()
            return err("Сообщение слишком длинное")

        cur.execute(
            f"SELECT id, encrypt_key FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
            (int(chat_id), user_id, user_id)
        )
        chat = cur.fetchone()
        if not chat:
            conn.close()
            return err("Чат не найден", 404)

        key_hex = chat[1]
        filters = get_word_filters(cur)
        content = apply_filters(content, filters)
        encrypted = encrypt_message(content, key_hex)

        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages (chat_id, sender_id, content)
            VALUES (%s, %s, %s) RETURNING id, created_at
        """, (int(chat_id), user_id, encrypted))
        msg_id, created_at = cur.fetchone()

        cur.execute(f"UPDATE {SCHEMA}.chats SET last_message_at=NOW() WHERE id=%s", (int(chat_id),))
        # Сбрасываем typing
        cur.execute(f"UPDATE {SCHEMA}.chat_typing SET updated_at='2000-01-01' WHERE chat_id=%s AND user_id=%s", (int(chat_id), user_id))

        conn.commit()
        conn.close()
        return ok({"ok": True, "message_id": msg_id, "created_at": created_at.isoformat()})

    # ── typing — обновить статус набора текста ────────────────────────────────
    if action == "typing":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        chat_id = body.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")

        cur.execute(
            f"SELECT id FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
            (int(chat_id), user_id, user_id)
        )
        if not cur.fetchone():
            conn.close()
            return err("Чат не найден", 404)

        cur.execute(f"""
            INSERT INTO {SCHEMA}.chat_typing (chat_id, user_id, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (chat_id, user_id) DO UPDATE SET updated_at=NOW()
        """, (int(chat_id), user_id))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    conn.close()
    return err("Неизвестное действие")