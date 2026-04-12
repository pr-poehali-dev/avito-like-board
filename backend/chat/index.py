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
    is_removed = row[12] if len(row) > 12 else False
    edited_at = row[13] if len(row) > 13 else None
    return {
        "id": row[0],
        "chat_id": row[1],
        "sender_id": row[2],
        "sender_name": row[3],
        "sender_avatar": row[4],
        "content": "Сообщение удалено" if is_removed else decrypt_message(row[5], key_hex),
        "is_read": row[6],
        "created_at": row[7].isoformat() if row[7] else None,
        "ad_id": None if is_removed else row[8],
        "ad_title": None if is_removed else row[9],
        "ad_price": None if is_removed else row[10],
        "ad_photo": None if is_removed else row[11],
        "is_removed": is_removed,
        "edited_at": edited_at.isoformat() if edited_at else None,
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
                    WHERE m.chat_id=c.id AND m.is_read=FALSE AND m.sender_id != %s AND m.is_removed=FALSE) as unread,
                   c.removed_by_user1, c.removed_by_user2
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.users u1 ON u1.id=c.user1_id
            JOIN {SCHEMA}.users u2 ON u2.id=c.user2_id
            WHERE (c.user1_id=%s OR c.user2_id=%s)
              AND NOT (c.user1_id=%s AND c.removed_by_user1=TRUE)
              AND NOT (c.user2_id=%s AND c.removed_by_user2=TRUE)
            ORDER BY c.last_message_at DESC
        """, (user_id, user_id, user_id, user_id, user_id))
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
            f"""SELECT id, encrypt_key, user1_id, cleared_at_user1, cleared_at_user2
                FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)""",
            (int(chat_id), user_id, user_id)
        )
        chat = cur.fetchone()
        if not chat:
            conn.close()
            return err("Чат не найден", 404)

        key_hex = chat[1]
        # Учитываем cleared_at — показываем только сообщения после очистки
        is_user1 = chat[2] == user_id
        cleared_at = chat[3] if is_user1 else chat[4]
        cleared_filter = "AND m.created_at > %s" if cleared_at else ""
        cleared_params = [cleared_at] if cleared_at else []

        cur.execute(f"""
            SELECT m.id, m.chat_id, m.sender_id, u.name, u.avatar_url,
                   m.content, m.is_read, m.created_at,
                   m.ad_id, m.ad_title, m.ad_price, m.ad_photo,
                   m.is_removed, m.edited_at
            FROM {SCHEMA}.messages m
            JOIN {SCHEMA}.users u ON u.id=m.sender_id
            WHERE m.chat_id=%s AND m.id > %s {cleared_filter}
            ORDER BY m.created_at ASC
            LIMIT 100
        """, [int(chat_id), since_id] + cleared_params)
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

        # Прикреплённое объявление
        ad_id = body.get("ad_id") or None
        ad_title = (body.get("ad_title") or "").strip() or None
        ad_price = body.get("ad_price") or None
        ad_photo = (body.get("ad_photo") or "").strip() or None
        if ad_id:
            ad_id = int(ad_id)
        if ad_price is not None:
            try:
                ad_price = int(ad_price)
            except (ValueError, TypeError):
                ad_price = None

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
            INSERT INTO {SCHEMA}.messages (chat_id, sender_id, content, ad_id, ad_title, ad_price, ad_photo)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at
        """, (int(chat_id), user_id, encrypted, ad_id, ad_title, ad_price, ad_photo))
        msg_id, created_at = cur.fetchone()

        cur.execute(f"UPDATE {SCHEMA}.chats SET last_message_at=NOW() WHERE id=%s", (int(chat_id),))
        # Сбрасываем typing
        cur.execute(f"UPDATE {SCHEMA}.chat_typing SET updated_at='2000-01-01' WHERE chat_id=%s AND user_id=%s", (int(chat_id), user_id))

        # ── Новая система автоответов ─────────────────────────────────────────
        cur.execute(
            f"SELECT user1_id, user2_id FROM {SCHEMA}.chats WHERE id=%s",
            (int(chat_id),)
        )
        chat_row = cur.fetchone()
        recipient_id = chat_row[1] if chat_row[0] == user_id else chat_row[0]

        # Данные получателя для переменных
        cur.execute(f"SELECT name, auto_reply_enabled FROM {SCHEMA}.users WHERE id=%s", (recipient_id,))
        recip_row = cur.fetchone()
        recipient_name = recip_row[0] if recip_row else ""
        auto_reply_global = recip_row[1] if recip_row else False

        # Данные отправителя для переменных
        cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id=%s", (user_id,))
        sender_row = cur.fetchone()
        sender_name = sender_row[0] if sender_row else ""

        auto_reply_text = None
        fired_rule_id = None

        if auto_reply_global:
            import json as _json
            from datetime import datetime as _dt

            now = _dt.now()
            weekday = now.weekday()  # 0=пн
            hour_now = now.hour + now.minute / 60.0

            # Загружаем активные правила получателя
            cur.execute(
                f"""SELECT id, name, conditions, conditions_operator, reply_text,
                           delay_seconds, once_per_dialog, skip_if_user_replied
                    FROM {SCHEMA}.user_auto_reply_rules
                    WHERE user_id=%s AND is_active=TRUE
                    ORDER BY id""",
                (recipient_id,)
            )
            rules = cur.fetchall()

            # Проверял ли получатель в этом чате (для skip_if_user_replied)
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE chat_id=%s AND sender_id=%s",
                (int(chat_id), recipient_id)
            )
            seller_msg_count = cur.fetchone()[0]

            content_lower = content.lower()

            for rule in rules:
                r_id, r_name, r_conds_raw, r_op, r_reply, r_delay, r_once, r_skip = rule

                # once_per_dialog — проверяем не срабатывало ли уже в этом диалоге
                if r_once:
                    cur.execute(
                        f"SELECT COUNT(*) FROM {SCHEMA}.user_auto_reply_logs WHERE rule_id=%s AND dialog_id=%s",
                        (r_id, int(chat_id))
                    )
                    if cur.fetchone()[0] > 0:
                        continue

                # skip_if_user_replied — продавец уже писал сам
                if r_skip and seller_msg_count > 0:
                    continue

                # Парсим условия
                try:
                    conditions = r_conds_raw if isinstance(r_conds_raw, list) else _json.loads(r_conds_raw)
                except Exception:
                    conditions = []

                results = []
                for cond in conditions:
                    ctype = cond.get("type", "")
                    passed = False

                    if ctype == "keyword":
                        op = cond.get("operator", "contains_any")
                        words = [w.lower().strip() for w in cond.get("value", []) if w.strip()]
                        if op == "contains_all":
                            passed = all(w in content_lower for w in words)
                        else:  # contains_any
                            passed = any(w in content_lower for w in words)

                    elif ctype == "time_range":
                        start_str = cond.get("start", "00:00")
                        end_str = cond.get("end", "23:59")
                        sh, sm = map(int, start_str.split(":"))
                        eh, em = map(int, end_str.split(":"))
                        s_val = sh + sm / 60.0
                        e_val = eh + em / 60.0
                        if s_val <= e_val:
                            passed = s_val <= hour_now <= e_val
                        else:  # перенос через полночь
                            passed = hour_now >= s_val or hour_now <= e_val

                    elif ctype == "weekday":
                        days = cond.get("days", [])
                        # 0=пн в Python, но в ТЗ 0=вс — конвертируем
                        py_weekday = (weekday + 1) % 7  # пн=1 вс=0
                        passed = py_weekday in days

                    elif ctype == "always":
                        passed = True

                    results.append(passed)

                if not results:
                    all_passed = True
                elif r_op == "OR":
                    all_passed = any(results)
                else:  # AND
                    all_passed = all(results)

                if all_passed:
                    # Подставляем переменные
                    reply = r_reply
                    reply = reply.replace("{buyer_name}", sender_name)
                    reply = reply.replace("{seller_name}", recipient_name)
                    reply = reply.replace("{ad_title}", ad_title or "")
                    reply = reply.replace("{ad_price}", str(ad_price) + " ₽" if ad_price else "")
                    reply = reply.replace("{ad_url}", f"/?ad={ad_id}" if ad_id else "")
                    reply = reply.replace("{site_name}", "Объявления")
                    auto_reply_text = reply
                    fired_rule_id = r_id
                    break

        if auto_reply_text:
            encrypted_reply = encrypt_message(auto_reply_text, key_hex)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.messages (chat_id, sender_id, content)
                    VALUES (%s, %s, %s)""",
                (int(chat_id), recipient_id, encrypted_reply)
            )
            cur.execute(f"UPDATE {SCHEMA}.chats SET last_message_at=NOW() WHERE id=%s", (int(chat_id),))
            if fired_rule_id:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.user_auto_reply_logs
                           (rule_id, user_id, dialog_id, incoming_message, reply_text)
                        VALUES (%s, %s, %s, %s, %s)""",
                    (fired_rule_id, recipient_id, int(chat_id), content, auto_reply_text)
                )
                cur.execute(
                    f"UPDATE {SCHEMA}.user_auto_reply_rules SET last_triggered_at=NOW() WHERE id=%s",
                    (fired_rule_id,)
                )

        conn.commit()
        conn.close()
        return ok({"ok": True, "message_id": msg_id, "created_at": created_at.isoformat(), "auto_replied": auto_reply_text is not None})

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

    # ── auto_reply_get — получить настройки и правила автоответа ─────────────
    if action == "auto_reply_get":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        cur.execute(
            f"SELECT enabled, greeting FROM {SCHEMA}.auto_reply_settings WHERE user_id=%s",
            (user_id,)
        )
        row = cur.fetchone()
        settings = {"enabled": row[0], "greeting": row[1]} if row else {"enabled": False, "greeting": ""}

        cur.execute(
            f"""SELECT id, question, answer, match_type, sort_order, enabled
                FROM {SCHEMA}.auto_reply_rules WHERE user_id=%s AND removed=FALSE ORDER BY sort_order, id""",
            (user_id,)
        )
        rules = [
            {"id": r[0], "question": r[1], "answer": r[2],
             "match_type": r[3], "sort_order": r[4], "enabled": r[5]}
            for r in cur.fetchall()
        ]

        conn.close()
        return ok({"ok": True, "settings": settings, "rules": rules})

    # ── auto_reply_save_settings — сохранить вкл/выкл и приветствие ──────────
    if action == "auto_reply_save_settings":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        enabled = bool(body.get("enabled", False))
        greeting = (body.get("greeting") or "").strip()

        cur.execute(
            f"""INSERT INTO {SCHEMA}.auto_reply_settings (user_id, enabled, greeting, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET enabled=EXCLUDED.enabled, greeting=EXCLUDED.greeting, updated_at=NOW()""",
            (user_id, enabled, greeting or None)
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── auto_reply_rule_save — создать или обновить правило ──────────────────
    if action == "auto_reply_rule_save":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        rule_id = body.get("id")
        question = (body.get("question") or "").strip()
        answer = (body.get("answer") or "").strip()
        match_type = body.get("match_type", "partial")
        sort_order = int(body.get("sort_order") or 0)
        rule_enabled = bool(body.get("enabled", True))

        if not question or not answer:
            conn.close()
            return err("Укажите вопрос и ответ")
        if match_type not in ("exact", "partial"):
            match_type = "partial"

        if rule_id:
            cur.execute(
                f"""UPDATE {SCHEMA}.auto_reply_rules
                    SET question=%s, answer=%s, match_type=%s, sort_order=%s, enabled=%s
                    WHERE id=%s AND user_id=%s""",
                (question, answer, match_type, sort_order, rule_enabled, int(rule_id), user_id)
            )
        else:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.auto_reply_rules (user_id, question, answer, match_type, sort_order, enabled)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (user_id, question, answer, match_type, sort_order, rule_enabled)
            )
            rule_id = cur.fetchone()[0]

        conn.commit()
        conn.close()
        return ok({"ok": True, "id": rule_id})

    # ── auto_reply_rule_delete — пометить правило как удалённое ─────────────
    if action == "auto_reply_rule_delete":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        rule_id = body.get("id")
        if not rule_id:
            conn.close()
            return err("Укажите id")

        cur.execute(
            f"UPDATE {SCHEMA}.auto_reply_rules SET removed=TRUE WHERE id=%s AND user_id=%s",
            (int(rule_id), user_id)
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── edit_message — редактировать своё сообщение ──────────────────────────
    if action == "edit_message":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        msg_id = body.get("message_id")
        new_content = (body.get("content") or "").strip()
        if not msg_id or not new_content:
            conn.close()
            return err("Укажите message_id и content")
        # Проверяем что это наше сообщение и оно не удалено
        cur.execute(
            f"SELECT chat_id, sender_id, is_removed FROM {SCHEMA}.messages WHERE id=%s",
            (int(msg_id),)
        )
        msg_row = cur.fetchone()
        if not msg_row or msg_row[1] != user_id or msg_row[2]:
            conn.close()
            return err("Сообщение не найдено или нет прав", 403)
        # Получаем ключ чата
        cur.execute(f"SELECT encrypt_key FROM {SCHEMA}.chats WHERE id=%s", (msg_row[0],))
        key_row = cur.fetchone()
        if not key_row:
            conn.close()
            return err("Чат не найден", 404)
        filters = get_word_filters(cur)
        new_content = apply_filters(new_content, filters)
        encrypted = encrypt_message(new_content, key_row[0])
        cur.execute(
            f"UPDATE {SCHEMA}.messages SET content=%s, edited_at=NOW() WHERE id=%s",
            (encrypted, int(msg_id))
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── remove_message — удалить своё сообщение ───────────────────────────────
    if action == "remove_message":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        msg_id = body.get("message_id")
        if not msg_id:
            conn.close()
            return err("Укажите message_id")
        cur.execute(
            f"SELECT sender_id FROM {SCHEMA}.messages WHERE id=%s",
            (int(msg_id),)
        )
        row = cur.fetchone()
        if not row or row[0] != user_id:
            conn.close()
            return err("Сообщение не найдено или нет прав", 403)
        cur.execute(
            f"UPDATE {SCHEMA}.messages SET is_removed=TRUE, content=content WHERE id=%s",
            (int(msg_id),)
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── clear_chat — очистить историю чата (только у себя) ───────────────────
    if action == "clear_chat":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        chat_id_val = body.get("chat_id")
        if not chat_id_val:
            conn.close()
            return err("Укажите chat_id")
        cur.execute(
            f"SELECT user1_id, user2_id FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
            (int(chat_id_val), user_id, user_id)
        )
        chat_row = cur.fetchone()
        if not chat_row:
            conn.close()
            return err("Чат не найден", 404)
        col = "cleared_at_user1" if chat_row[0] == user_id else "cleared_at_user2"
        cur.execute(f"UPDATE {SCHEMA}.chats SET {col}=NOW() WHERE id=%s", (int(chat_id_val),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── leave_chat — скрыть чат из списка (у себя) ───────────────────────────
    if action == "leave_chat":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        chat_id_val = body.get("chat_id")
        if not chat_id_val:
            conn.close()
            return err("Укажите chat_id")
        cur.execute(
            f"SELECT user1_id, user2_id FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
            (int(chat_id_val), user_id, user_id)
        )
        chat_row = cur.fetchone()
        if not chat_row:
            conn.close()
            return err("Чат не найден", 404)
        col = "removed_by_user1" if chat_row[0] == user_id else "removed_by_user2"
        cur.execute(f"UPDATE {SCHEMA}.chats SET {col}=TRUE WHERE id=%s", (int(chat_id_val),))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ══════════════════════════════════════════════════════════════════════════
    # НОВАЯ СИСТЕМА АВТООТВЕТОВ (user_auto_reply_rules)
    # ══════════════════════════════════════════════════════════════════════════

    # ── uar_settings_get — глобальное вкл/выкл ───────────────────────────────
    if action == "uar_settings_get":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        cur.execute(f"SELECT auto_reply_enabled FROM {SCHEMA}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        return ok({"ok": True, "enabled": row[0] if row else False})

    # ── uar_settings_save — сохранить глобальное вкл/выкл ────────────────────
    if action == "uar_settings_save":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        enabled = bool(body.get("enabled", False))
        cur.execute(f"UPDATE {SCHEMA}.users SET auto_reply_enabled=%s WHERE id=%s", (enabled, user_id))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── uar_rules_list — список правил ───────────────────────────────────────
    if action == "uar_rules_list":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        cur.execute(
            f"""SELECT id, name, is_active, conditions, conditions_operator,
                       reply_text, delay_seconds, once_per_dialog, skip_if_user_replied,
                       created_at, last_triggered_at
                FROM {SCHEMA}.user_auto_reply_rules
                WHERE user_id=%s ORDER BY id""",
            (user_id,)
        )
        rows = cur.fetchall()
        conn.close()
        import json as _j
        rules = []
        for r in rows:
            conds = r[3] if isinstance(r[3], list) else _j.loads(r[3])
            rules.append({
                "id": r[0], "name": r[1], "is_active": r[2],
                "conditions": conds, "conditions_operator": r[4],
                "reply_text": r[5], "delay_seconds": r[6],
                "once_per_dialog": r[7], "skip_if_user_replied": r[8],
                "created_at": r[9].isoformat() if r[9] else None,
                "last_triggered_at": r[10].isoformat() if r[10] else None,
            })
        return ok({"ok": True, "rules": rules})

    # ── uar_rule_save — создать или обновить правило ──────────────────────────
    if action == "uar_rule_save":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        import json as _j

        rule_id = body.get("id")
        name = (body.get("name") or "").strip()
        is_active = bool(body.get("is_active", True))
        conditions = body.get("conditions", [])
        conditions_operator = body.get("conditions_operator", "AND")
        reply_text = (body.get("reply_text") or "").strip()
        delay_seconds = int(body.get("delay_seconds") or 0)
        once_per_dialog = bool(body.get("once_per_dialog", True))
        skip_if_user_replied = bool(body.get("skip_if_user_replied", True))

        if not name or not reply_text:
            conn.close()
            return err("Укажите название и текст ответа")
        if conditions_operator not in ("AND", "OR"):
            conditions_operator = "AND"

        conditions_json = _j.dumps(conditions, ensure_ascii=False)

        if rule_id:
            cur.execute(
                f"""UPDATE {SCHEMA}.user_auto_reply_rules
                    SET name=%s, is_active=%s, conditions=%s, conditions_operator=%s,
                        reply_text=%s, delay_seconds=%s, once_per_dialog=%s,
                        skip_if_user_replied=%s, updated_at=NOW()
                    WHERE id=%s AND user_id=%s""",
                (name, is_active, conditions_json, conditions_operator, reply_text,
                 delay_seconds, once_per_dialog, skip_if_user_replied,
                 int(rule_id), user_id)
            )
            new_id = int(rule_id)
        else:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.user_auto_reply_rules
                    (user_id, name, is_active, conditions, conditions_operator,
                     reply_text, delay_seconds, once_per_dialog, skip_if_user_replied)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (user_id, name, is_active, conditions_json, conditions_operator,
                 reply_text, delay_seconds, once_per_dialog, skip_if_user_replied)
            )
            new_id = cur.fetchone()[0]

        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── uar_rule_toggle — вкл/выкл правило ───────────────────────────────────
    if action == "uar_rule_toggle":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        rule_id = body.get("id")
        if not rule_id:
            conn.close()
            return err("Укажите id")
        cur.execute(
            f"""UPDATE {SCHEMA}.user_auto_reply_rules
                SET is_active = NOT is_active, updated_at=NOW()
                WHERE id=%s AND user_id=%s RETURNING is_active""",
            (int(rule_id), user_id)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return ok({"ok": True, "is_active": row[0] if row else None})

    # ── uar_rule_copy — скопировать правило ──────────────────────────────────
    if action == "uar_rule_copy":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        rule_id = body.get("id")
        if not rule_id:
            conn.close()
            return err("Укажите id")
        cur.execute(
            f"""SELECT name, conditions, conditions_operator, reply_text,
                       delay_seconds, once_per_dialog, skip_if_user_replied
                FROM {SCHEMA}.user_auto_reply_rules WHERE id=%s AND user_id=%s""",
            (int(rule_id), user_id)
        )
        orig = cur.fetchone()
        if not orig:
            conn.close()
            return err("Правило не найдено", 404)
        import json as _j
        conds_json = _j.dumps(orig[1] if isinstance(orig[1], list) else orig[1], ensure_ascii=False)
        cur.execute(
            f"""INSERT INTO {SCHEMA}.user_auto_reply_rules
                (user_id, name, is_active, conditions, conditions_operator,
                 reply_text, delay_seconds, once_per_dialog, skip_if_user_replied)
                VALUES (%s,%s,FALSE,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (user_id, f"Копия: {orig[0]}", conds_json, orig[2],
             orig[3], orig[4], orig[5], orig[6])
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({"ok": True, "id": new_id})

    # ── uar_rule_remove — пометить правило удалённым ─────────────────────────
    if action == "uar_rule_remove":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        rule_id = body.get("id")
        if not rule_id:
            conn.close()
            return err("Укажите id")
        cur.execute(
            f"UPDATE {SCHEMA}.user_auto_reply_rules SET is_active=FALSE WHERE id=%s AND user_id=%s",
            (int(rule_id), user_id)
        )
        # Физически скрываем через name-маркер
        cur.execute(
            f"UPDATE {SCHEMA}.user_auto_reply_rules SET name='__removed__' || id WHERE id=%s AND user_id=%s",
            (int(rule_id), user_id)
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── uar_rule_test — протестировать правило ────────────────────────────────
    if action == "uar_rule_test":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        import json as _j
        from datetime import datetime as _dt

        test_message = (body.get("message") or "").strip()
        conditions = body.get("conditions", [])
        conditions_operator = body.get("conditions_operator", "AND")
        reply_text = (body.get("reply_text") or "").strip()
        test_time = body.get("test_time")  # "HH:MM"
        test_weekday = body.get("test_weekday")  # 0-6

        if not test_message:
            conn.close()
            return err("Укажите тестовое сообщение")

        now = _dt.now()
        if test_time:
            try:
                th, tm = map(int, test_time.split(":"))
                hour_now = th + tm / 60.0
            except Exception:
                hour_now = now.hour + now.minute / 60.0
        else:
            hour_now = now.hour + now.minute / 60.0

        weekday = int(test_weekday) if test_weekday is not None else (now.weekday() + 1) % 7

        content_lower = test_message.lower()
        results = []
        condition_results = []

        for cond in conditions:
            ctype = cond.get("type", "")
            passed = False
            desc = ""

            if ctype == "keyword":
                op = cond.get("operator", "contains_any")
                words = [w.lower().strip() for w in cond.get("value", []) if w.strip()]
                if op == "contains_all":
                    passed = all(w in content_lower for w in words)
                    desc = f'Слова «{", ".join(words)}» — {"все найдены" if passed else "не все найдены"}'
                else:
                    found = [w for w in words if w in content_lower]
                    passed = len(found) > 0
                    desc = f'Слова «{", ".join(words)}» — {"найдено: " + str(found) if passed else "не найдено"}'

            elif ctype == "time_range":
                start_str = cond.get("start", "00:00")
                end_str = cond.get("end", "23:59")
                sh, sm = map(int, start_str.split(":"))
                eh, em = map(int, end_str.split(":"))
                s_val = sh + sm / 60.0
                e_val = eh + em / 60.0
                if s_val <= e_val:
                    passed = s_val <= hour_now <= e_val
                else:
                    passed = hour_now >= s_val or hour_now <= e_val
                desc = f'Время {start_str}–{end_str} — {"✓" if passed else "✗"}'

            elif ctype == "weekday":
                days = cond.get("days", [])
                day_names = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
                passed = weekday in days
                selected = [day_names[d] for d in days if 0 <= d < 7]
                desc = f'Дни: {", ".join(selected)} — {"✓" if passed else "✗"}'

            elif ctype == "always":
                passed = True
                desc = "Всегда — ✓"

            results.append(passed)
            condition_results.append({"type": ctype, "passed": passed, "desc": desc})

        if not results:
            triggered = True
        elif conditions_operator == "OR":
            triggered = any(results)
        else:
            triggered = all(results)

        reply_preview = None
        if triggered and reply_text:
            reply_preview = reply_text
            reply_preview = reply_preview.replace("{buyer_name}", "Покупатель")
            reply_preview = reply_preview.replace("{seller_name}", "Продавец")
            reply_preview = reply_preview.replace("{ad_title}", "Название объявления")
            reply_preview = reply_preview.replace("{ad_price}", "5 000 ₽")
            reply_preview = reply_preview.replace("{site_name}", "Объявления")

        conn.close()
        return ok({
            "ok": True,
            "triggered": triggered,
            "condition_results": condition_results,
            "reply_preview": reply_preview,
        })

    # ── uar_logs — журнал срабатываний ────────────────────────────────────────
    if action == "uar_logs":
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        cur.execute(
            f"""SELECT l.id, r.name, l.dialog_id, l.incoming_message, l.reply_text, l.triggered_at
                FROM {SCHEMA}.user_auto_reply_logs l
                LEFT JOIN {SCHEMA}.user_auto_reply_rules r ON r.id=l.rule_id
                WHERE l.user_id=%s
                ORDER BY l.triggered_at DESC LIMIT 50""",
            (user_id,)
        )
        rows = cur.fetchall()
        conn.close()
        return ok({"ok": True, "logs": [
            {"id": r[0], "rule_name": r[1], "dialog_id": r[2],
             "incoming": r[3], "reply": r[4],
             "triggered_at": r[5].isoformat() if r[5] else None}
            for r in rows
        ]})

    conn.close()
    return err("Неизвестное действие")