"""
Объявления: создание (с загрузкой фото в S3), получение списка, мои объявления, архивация.
Роутинг через поле action в теле запроса или query-параметр action.
"""
import json
import os
import uuid
import base64
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p72465170_avito_like_board")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    "Content-Type": "application/json",
}

MIME_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def get_user_id(event, cur):
    sid = (event.get("headers") or {}).get("X-Session-Id") or (event.get("headers") or {}).get("x-session-id")
    if not sid:
        return None
    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()",
        (sid,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def upload_photos(photos_b64: list) -> list:
    s3 = get_s3()
    key_id = os.environ["AWS_ACCESS_KEY_ID"]
    urls = []
    for item in photos_b64[:10]:
        mime = item.get("mime", "image/jpeg")
        data_b64 = item.get("data", "")
        if not data_b64:
            continue
        ext = MIME_EXT.get(mime, "jpg")
        key = f"ads/{uuid.uuid4().hex}.{ext}"
        binary = base64.b64decode(data_b64)
        s3.put_object(Bucket="files", Key=key, Body=binary, ContentType=mime)
        url = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{key}"
        urls.append(url)
    return urls


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
                       a.created_at, u.name as author, a.photos
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
                "date": r[6].strftime("%d.%m.%Y"), "author": r[7],
                "photos": list(r[8]) if r[8] else []
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "ads": ads})}

    # create — создать объявление с фотографиями
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
        photos_b64 = body.get("photos") or []

        if not title or not price or not category or not city:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните обязательные поля"})}

        try:
            price = int(price)
        except (ValueError, TypeError):
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректная цена"})}

        photo_urls = upload_photos(photos_b64) if photos_b64 else []

        cur.execute(
            f"""INSERT INTO {SCHEMA}.ads (user_id, title, description, price, category, city, condition, photos)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (user_id, title, description, price, category, city, condition, photo_urls)
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
            f"""SELECT id, title, price, category, city, condition, status, views, created_at, photos
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
                "date": r[8].strftime("%d.%m.%Y"),
                "photos": list(r[9]) if r[9] else []
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "ads": ads})}

    # update — редактировать объявление
    if action == "update":
        conn = get_conn()
        cur = conn.cursor()
        user_id = get_user_id(event, cur)
        if not user_id:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}

        ad_id = body.get("id")
        title = (body.get("title") or "").strip()
        description = (body.get("description") or "").strip()
        price = body.get("price")
        category = (body.get("category") or "").strip()
        city = (body.get("city") or "").strip()
        condition = (body.get("condition") or "Хорошее").strip()
        photos_b64 = body.get("new_photos") or []      # base64 — новые фото
        keep_urls = body.get("keep_photos") or []       # уже загруженные URL которые оставить

        if not title or not price or not category or not city:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните обязательные поля"})}

        try:
            price = int(price)
        except (ValueError, TypeError):
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректная цена"})}

        new_urls = upload_photos(photos_b64) if photos_b64 else []
        all_photos = keep_urls + new_urls

        cur.execute(
            f"""UPDATE {SCHEMA}.ads
                SET title=%s, description=%s, price=%s, category=%s, city=%s, condition=%s, photos=%s
                WHERE id=%s AND user_id=%s""",
            (title, description, price, category, city, condition, all_photos, ad_id, user_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # get_one — получить одно объявление для редактирования
    if action == "get_one":
        ad_id = qs.get("id") or body.get("id")
        conn = get_conn()
        cur = conn.cursor()
        user_id = get_user_id(event, cur)
        if not user_id:
            conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}

        cur.execute(
            f"""SELECT id, title, description, price, category, city, condition, photos
                FROM {SCHEMA}.ads WHERE id=%s AND user_id=%s""",
            (ad_id, user_id)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Объявление не найдено"})}

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True,
            "ad": {
                "id": row[0], "title": row[1], "description": row[2] or "",
                "price": row[3], "category": row[4], "city": row[5],
                "condition": row[6], "photos": list(row[7]) if row[7] else []
            }
        })}

    # view — публичный просмотр объявления + инкремент просмотров
    if action == "view":
        ad_id = qs.get("id") or body.get("id")
        show_phone = (qs.get("show_phone") or body.get("show_phone")) == "1"
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"""SELECT a.id, a.title, a.description, a.price, a.category, a.city,
                       a.condition, a.status, a.views, a.created_at, a.photos,
                       u.id as author_id, u.name as author_name, u.phone
                FROM {SCHEMA}.ads a
                JOIN {SCHEMA}.users u ON u.id = a.user_id
                WHERE a.id = %s AND a.status = 'active'""",
            (ad_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Объявление не найдено"})}

        cur.execute(
            f"UPDATE {SCHEMA}.ads SET views = COALESCE(views,0) + 1 WHERE id = %s",
            (ad_id,)
        )
        conn.commit()
        conn.close()

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True,
            "ad": {
                "id": row[0], "title": row[1], "description": row[2] or "",
                "price": row[3], "category": row[4], "city": row[5],
                "condition": row[6], "status": row[7], "views": row[8],
                "created_at": row[9].strftime("%d.%m.%Y %H:%M"),
                "photos": list(row[10]) if row[10] else [],
                "author_id": row[11], "author_name": row[12],
                "phone": row[13] if show_phone else None
            }
        })}

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