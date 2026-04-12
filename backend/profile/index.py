"""
Профиль пользователя: публичный просмотр, редактирование, отзывы, уведомления.
"""
import json
import os
import base64
import uuid
from datetime import datetime

import psycopg2
import boto3

SCHEMA = "t_p72465170_avito_like_board"
DSN = os.environ["DATABASE_URL"]

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id, X-User-Id, X-Auth-Token",
}


def ok(data: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"ok": False, "error": msg}, ensure_ascii=False)}


def get_user_id(conn, session_id: str):
    if not session_id:
        return None
    cur = conn.cursor()
    cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE id=%s AND expires_at > NOW()", (session_id,))
    row = cur.fetchone()
    cur.close()
    return row[0] if row else None


def fmt_date(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.strftime("%d.%m.%Y")


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass
    qs = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}
    session_id = headers.get("X-Session-Id") or headers.get("x-session-id") or ""
    action = body.get("action") or qs.get("action") or ""

    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    # ── get_profile — публичный профиль по user_id ────────────────────────────
    if action == "get_profile":
        target_id = body.get("user_id") or qs.get("user_id")
        if not target_id:
            conn.close()
            return err("Укажите user_id")

        viewer_id = get_user_id(conn, session_id)
        is_owner = viewer_id and int(viewer_id) == int(target_id)

        cur.execute(f"""
            SELECT id, name, avatar_url, cover_url, city, about, created_at,
                   phone, website, vk_url, tg_username,
                   show_phone, show_email, email, is_public, last_seen_at
            FROM {SCHEMA}.users WHERE id=%s
        """, (int(target_id),))
        u = cur.fetchone()
        if not u:
            conn.close()
            return err("Пользователь не найден", 404)

        # Считаем объявления
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.ads WHERE user_id=%s AND status='active'", (int(target_id),))
        ads_count = cur.fetchone()[0]

        # Считаем средний рейтинг
        cur.execute(f"SELECT AVG(rating), COUNT(*) FROM {SCHEMA}.reviews WHERE target_id=%s", (int(target_id),))
        rev = cur.fetchone()
        avg_rating = round(float(rev[0]), 1) if rev[0] else None
        reviews_count = int(rev[1])

        profile = {
            "id": u[0],
            "name": u[1],
            "avatar_url": u[2],
            "cover_url": u[3],
            "city": u[4],
            "about": u[5],
            "created_at": fmt_date(u[6]),
            "ads_count": ads_count,
            "avg_rating": avg_rating,
            "reviews_count": reviews_count,
            "is_owner": bool(is_owner),
            "last_seen_at": u[15].isoformat() if u[15] else None,
        }

        if is_owner or u[11]:  # show_phone
            profile["phone"] = u[7]
        if is_owner or u[12]:  # show_email
            profile["email"] = u[13]
        if is_owner:
            profile["website"] = u[8]
            profile["vk_url"] = u[9]
            profile["tg_username"] = u[10]
            profile["show_phone"] = u[11]
            profile["show_email"] = u[12]
            profile["is_public"] = u[14]
        else:
            profile["website"] = u[8]
            profile["vk_url"] = u[9]
            profile["tg_username"] = u[10]

        conn.close()
        return ok({"ok": True, "profile": profile})

    # ── update_profile — обновление профиля ──────────────────────────────────
    if action == "update_profile":
        user_id = get_user_id(conn, session_id)
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        allowed = ["name", "city", "about", "phone", "website", "vk_url", "tg_username", "show_phone", "show_email", "is_public"]
        sets, vals = [], []
        for field in allowed:
            if field in body:
                sets.append(f"{field}=%s")
                vals.append(body[field])
        if not sets:
            conn.close()
            return err("Нет данных для обновления")
        vals.append(user_id)
        cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(sets)} WHERE id=%s", vals)
        conn.commit()

        # Возвращаем обновлённый профиль
        cur.execute(f"SELECT id, name, avatar_url, cover_url, city, about, phone, website, vk_url, tg_username, show_phone, show_email, email, is_public FROM {SCHEMA}.users WHERE id=%s", (user_id,))
        u = cur.fetchone()
        conn.close()
        return ok({"ok": True, "user": {
            "id": u[0], "name": u[1], "avatar_url": u[2], "cover_url": u[3],
            "city": u[4], "about": u[5], "phone": u[6], "website": u[7],
            "vk_url": u[8], "tg_username": u[9], "show_phone": u[10],
            "show_email": u[11], "email": u[12], "is_public": u[13],
        }})

    # ── upload_photo — загрузка аватара или обложки ──────────────────────────
    if action == "upload_photo":
        user_id = get_user_id(conn, session_id)
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        photo_type = body.get("photo_type", "avatar")  # avatar | cover
        data_b64 = body.get("data") or ""
        if not data_b64:
            conn.close()
            return err("Нет данных изображения")

        if "," in data_b64:
            data_b64 = data_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(data_b64)

        ext = "jpg"
        key = f"profiles/{user_id}/{photo_type}_{uuid.uuid4().hex[:8]}.{ext}"

        s3 = boto3.client("s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        s3.put_object(Bucket="files", Key=key, Body=img_bytes, ContentType="image/jpeg")
        url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        col = "avatar_url" if photo_type == "avatar" else "cover_url"
        cur.execute(f"UPDATE {SCHEMA}.users SET {col}=%s WHERE id=%s", (url, user_id))
        conn.commit()
        conn.close()
        return ok({"ok": True, "url": url})

    # ── get_ads — объявления пользователя ────────────────────────────────────
    if action == "get_ads":
        target_id = body.get("user_id") or qs.get("user_id")
        if not target_id:
            conn.close()
            return err("Укажите user_id")

        viewer_id = get_user_id(conn, session_id)
        is_owner = viewer_id and int(viewer_id) == int(target_id)
        status_filter = body.get("status", "active")

        if is_owner:
            if status_filter == "all":
                cur.execute(f"""
                    SELECT id, title, price, photos, status, created_at, views_count
                    FROM {SCHEMA}.ads WHERE user_id=%s ORDER BY created_at DESC LIMIT 50
                """, (int(target_id),))
            else:
                cur.execute(f"""
                    SELECT id, title, price, photos, status, created_at, views_count
                    FROM {SCHEMA}.ads WHERE user_id=%s AND status=%s ORDER BY created_at DESC LIMIT 50
                """, (int(target_id), status_filter))
        else:
            cur.execute(f"""
                SELECT id, title, price, photos, status, created_at, views_count
                FROM {SCHEMA}.ads WHERE user_id=%s AND status='active' ORDER BY created_at DESC LIMIT 50
            """, (int(target_id),))

        rows = cur.fetchall()
        ads = []
        for r in rows:
            photos = r[3] if r[3] else []
            ads.append({
                "id": r[0], "title": r[1], "price": r[2],
                "photos": photos, "status": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
                "views_count": r[6] or 0,
            })
        conn.close()
        return ok({"ok": True, "ads": ads})

    # ── get_reviews — отзывы о пользователе ─────────────────────────────────
    if action == "get_reviews":
        target_id = body.get("user_id") or qs.get("user_id")
        if not target_id:
            conn.close()
            return err("Укажите user_id")

        cur.execute(f"""
            SELECT r.id, r.rating, r.text, r.created_at,
                   u.id, u.name, u.avatar_url
            FROM {SCHEMA}.reviews r
            JOIN {SCHEMA}.users u ON u.id = r.author_id
            WHERE r.target_id=%s
            ORDER BY r.created_at DESC
        """, (int(target_id),))
        rows = cur.fetchall()

        cur.execute(f"""
            SELECT rating, COUNT(*) FROM {SCHEMA}.reviews WHERE target_id=%s GROUP BY rating ORDER BY rating DESC
        """, (int(target_id),))
        dist = {r[0]: r[1] for r in cur.fetchall()}

        reviews = [{
            "id": r[0], "rating": r[1], "text": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
            "author": {"id": r[4], "name": r[5], "avatar_url": r[6]},
        } for r in rows]

        conn.close()
        return ok({"ok": True, "reviews": reviews, "distribution": dist})

    # ── add_review — написать отзыв ──────────────────────────────────────────
    if action == "add_review":
        user_id = get_user_id(conn, session_id)
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)
        target_id = body.get("target_id")
        rating = body.get("rating")
        text = (body.get("text") or "").strip()
        if not target_id or not rating or int(rating) not in range(1, 6):
            conn.close()
            return err("Укажите target_id и rating (1-5)")
        if int(target_id) == user_id:
            conn.close()
            return err("Нельзя оставить отзыв себе")

        cur.execute(f"""
            INSERT INTO {SCHEMA}.reviews (author_id, target_id, rating, text)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (author_id, target_id)
            DO UPDATE SET rating=EXCLUDED.rating, text=EXCLUDED.text, created_at=NOW()
        """, (user_id, int(target_id), int(rating), text or None))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── get_notifications — уведомления текущего пользователя ───────────────
    if action == "get_notifications":
        user_id = get_user_id(conn, session_id)
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        cur.execute(f"""
            SELECT id, type, title, content, link_url, is_read, created_at
            FROM {SCHEMA}.notifications WHERE user_id=%s
            ORDER BY created_at DESC LIMIT 50
        """, (user_id,))
        rows = cur.fetchall()
        notifs = [{
            "id": r[0], "type": r[1], "title": r[2], "content": r[3],
            "link_url": r[4], "is_read": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
        } for r in rows]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.notifications WHERE user_id=%s AND is_read=FALSE", (user_id,))
        unread = cur.fetchone()[0]

        conn.close()
        return ok({"ok": True, "notifications": notifs, "unread_count": unread})

    # ── mark_notifications_read — прочитать уведомления ─────────────────────
    if action == "mark_notifications_read":
        user_id = get_user_id(conn, session_id)
        if not user_id:
            conn.close()
            return err("Необходима авторизация", 401)

        notif_id = body.get("notification_id")
        if notif_id:
            cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE id=%s AND user_id=%s", (int(notif_id), user_id))
        else:
            cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE user_id=%s AND is_read=FALSE", (user_id,))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── unread_notifications_count — счётчик непрочитанных ──────────────────
    if action == "unread_notifications_count":
        user_id = get_user_id(conn, session_id)
        if not user_id:
            conn.close()
            return ok({"ok": True, "count": 0})
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.notifications WHERE user_id=%s AND is_read=FALSE", (user_id,))
        count = cur.fetchone()[0]
        conn.close()
        return ok({"ok": True, "count": count})

    conn.close()
    return err(f"Неизвестный action: {action}")
