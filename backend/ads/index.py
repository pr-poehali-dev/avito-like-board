"""
Объявления: создание, получение списка, получение своих, удаление, архивация.
Роутинг через поле action в теле запроса или query-параметр action.
"""
import json
import os
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


def get_user_id(event, cur):
    sid = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
    if not sid:
        return None
    cur.execute(
        f"""SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()""",
        (sid,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action") or body.get("action") or ""

    # list — получить все активные объявления с фильтрами
    if action == "list" or (method == "GET" and not action):
        category = qs.get("category") or ""
        city = qs.get("city") or ""
        price_from = qs.get("price_from") or ""
        price_to = qs.get("price_to") or ""
        condition = qs.get("condition") or ""
        search = qs.get("search") or ""

        conn = get_conn()
        cur = conn.cursor()

        filters = ["a.status = 'active'"]
        params = []

        if category:
            filters.append("a.category = %s")
            params.append(category)
        if city:
            filters.append("a.city = %s")
            params.append(city)
        if price_from:
            filters.append("a.price >= %s")
            params.append(int(price_from))
        if price_to:
            filters.append("a.price <= %s")
            params.append(int(price_to))
        if condition:
            filters.append("a.condition ILIKE %s")
            params.append(f"%{condition}%")
        if search:
            filters.append("(a.title ILIKE %s OR a.description ILIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])

        where = " AND ".join(filters)
        cur.execute(
            f"""SELECT a.id, a.title, a.price, a.category, a.city, a.condition,
                       a.created_at, u.name as author
                FROM {SCHEMA}.ads a
                JOIN {SCHEMA}.users u ON u.id = a.user_id
                WHERE {where}
                ORDER BY a.created_at DESC
                LIMIT 100""",
            params
        )
        rows = cur.fetchall()
        conn.close()

        ads = [
            {
                "id": r[0], "title": r[1], "price": r[2],
                "category": r[3], "city": r[4], "condition": r[5],
                "date": r[6].strftime("%d.%m.%Y"), "author": r[7]
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "ads": ads})}

    # create — создать объявление
    if action == "create":
        conn = get_conn()
        cur = conn.cursor()
        user_id = get_user_id(event, cur)
        if not user_id:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}

        title = (body.get("title") or "").strip()
        description = (body.get("description") or "").strip()
        price = body.get("price")
        category = (body.get("category") or "").strip()
        city = (body.get("city") or "").strip()
        condition = (body.get("condition") or "Хорошее").strip()

        if not title or not price or not category or not city:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните обязательные поля"})}

        try:
            price = int(price)
        except (ValueError, TypeError):
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректная цена"})}

        cur.execute(
            f"""INSERT INTO {SCHEMA}.ads (user_id, title, description, price, category, city, condition)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (user_id, title, description, price, category, city, condition)
        )
        ad_id = cur.fetchone()[0]
        conn.commit()
        conn.close()

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": ad_id})}

    # my — мои объявления
    if action == "my":
        conn = get_conn()
        cur = conn.cursor()
        user_id = get_user_id(event, cur)
        if not user_id:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}

        cur.execute(
            f"""SELECT id, title, price, category, city, condition, status, views, created_at
                FROM {SCHEMA}.ads WHERE user_id = %s ORDER BY created_at DESC""",
            (user_id,)
        )
        rows = cur.fetchall()
        conn.close()

        ads = [
            {
                "id": r[0], "title": r[1], "price": r[2],
                "category": r[3], "city": r[4], "condition": r[5],
                "status": r[6], "views": r[7],
                "date": r[8].strftime("%d.%m.%Y")
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "ads": ads})}

    # archive — архивировать объявление
    if action == "archive":
        ad_id = body.get("id")
        conn = get_conn()
        cur = conn.cursor()
        user_id = get_user_id(event, cur)
        if not user_id:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}

        cur.execute(
            f"UPDATE {SCHEMA}.ads SET status = 'archived' WHERE id = %s AND user_id = %s",
            (ad_id, user_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # activate — вернуть из архива
    if action == "activate":
        ad_id = body.get("id")
        conn = get_conn()
        cur = conn.cursor()
        user_id = get_user_id(event, cur)
        if not user_id:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}

        cur.execute(
            f"UPDATE {SCHEMA}.ads SET status = 'active' WHERE id = %s AND user_id = %s",
            (ad_id, user_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите action"})}
