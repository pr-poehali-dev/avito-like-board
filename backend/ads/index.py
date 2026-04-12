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


def is_site_offline(cur) -> bool:
    cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key = 'site_offline'")
    row = cur.fetchone()
    return row and row[0] == "true"


def is_admin(event, cur) -> bool:
    token = (event.get("headers") or {}).get("X-Admin-Token") or (event.get("headers") or {}).get("x-admin-token") or ""
    if not token:
        return False
    cur.execute(
        f"""SELECT u.id FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.id = %s AND s.expires_at > NOW() AND u.is_admin = TRUE""",
        (token,)
    )
    return cur.fetchone() is not None


OFFLINE_RESP = {"statusCode": 503, "headers": CORS, "body": json.dumps({"ok": False, "offline": True, "error": "Сайт временно недоступен"})}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action") or body.get("action") or ""

    # status — проверка режима сайта (публичный endpoint)
    if action == "status":
        conn = get_conn()
        cur = conn.cursor()
        offline = is_site_offline(cur)
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "offline": offline})}

    # categories — список категорий из БД
    if action == "categories":
        conn = get_conn()
        cur = conn.cursor()
        if is_site_offline(cur) and not is_admin(event, cur):
            conn.close()
            return OFFLINE_RESP
        cur.execute(
            f"""SELECT c.id, c.name, c.slug, c.icon, c.parent_id,
                       (SELECT COUNT(*) FROM {SCHEMA}.ads a WHERE a.category_id=c.id AND a.status='active') AS ads_count
                FROM {SCHEMA}.categories c
                WHERE c.show_in_menu = true
                ORDER BY c.sort_order, c.name"""
        )
        rows = cur.fetchall()
        conn.close()
        cats = [{"id": r[0], "name": r[1], "slug": r[2], "icon": r[3], "parent_id": r[4], "ads_count": r[5]} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "categories": cats})}

    # list — получить все активные объявления с фильтрами
    if action == "list" or (method == "GET" and not action):
        category = qs.get("category") or body.get("category") or ""
        category_id = qs.get("category_id") or body.get("category_id") or ""
        city = qs.get("city") or body.get("city") or ""
        price_from = qs.get("price_from") or body.get("price_from") or ""
        price_to = qs.get("price_to") or body.get("price_to") or ""
        condition = qs.get("condition") or body.get("condition") or ""
        search = qs.get("search") or body.get("search") or ""
        page = max(1, int(qs.get("page") or body.get("page") or 1))

        conn = get_conn()
        cur = conn.cursor()
        if is_site_offline(cur) and not is_admin(event, cur):
            conn.close()
            return OFFLINE_RESP

        # Читаем настройки из БД
        cur.execute(
            f"SELECT key, value FROM {SCHEMA}.settings WHERE key IN ('ads_per_page', 'ad_sort_by', 'ad_sort_order')"
        )
        cfg = {r[0]: r[1] for r in cur.fetchall()}
        default_per_page = max(1, min(int(cfg.get("ads_per_page", 40)), 100))
        per_page = min(int(qs.get("per_page") or body.get("per_page") or default_per_page), 100)

        sort_col_map = {
            "date": "a.created_at",
            "edit_date": "a.updated_at",
            "views": "a.views",
            "title": "a.title",
            "price": "a.price",
        }
        sort_by = cfg.get("ad_sort_by", "date")
        sort_order = cfg.get("ad_sort_order", "desc").upper()
        if sort_order not in ("ASC", "DESC"):
            sort_order = "DESC"
        order_expr = f"{sort_col_map.get(sort_by, 'a.created_at')} {sort_order}"

        filters = ["a.status = 'active'"]
        params = []

        if category_id:
            filters.append(f"""a.category_id IN (
                WITH RECURSIVE cat_tree AS (
                    SELECT id FROM {SCHEMA}.categories WHERE id = %s
                    UNION ALL
                    SELECT c.id FROM {SCHEMA}.categories c JOIN cat_tree t ON c.parent_id = t.id
                )
                SELECT id FROM cat_tree
            )""")
            params.append(int(category_id))
        elif category:
            filters.append("(a.category = %s OR EXISTS (SELECT 1 FROM {schema}.categories c WHERE c.id=a.category_id AND c.slug=%s))".replace("{schema}", SCHEMA))
            params.extend([category, category])
        if city:
            filters.append("a.city ILIKE %s")
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
                       a.created_at, u.name as author, a.photos,
                       a.status, a.views, a.category_id,
                       COALESCE(cat.name, a.category) as cat_name
                FROM {SCHEMA}.ads a
                JOIN {SCHEMA}.users u ON u.id = a.user_id
                LEFT JOIN {SCHEMA}.categories cat ON cat.id = a.category_id
                WHERE {where}
                ORDER BY {order_expr}
                LIMIT %s OFFSET %s""",
            params + [per_page, (page - 1) * per_page]
        )
        rows = cur.fetchall()
        cur.execute(
            f"""SELECT COUNT(*) FROM {SCHEMA}.ads a
                JOIN {SCHEMA}.users u ON u.id = a.user_id
                LEFT JOIN {SCHEMA}.categories cat ON cat.id = a.category_id
                WHERE {where}""",
            params
        )
        total = cur.fetchone()[0]
        conn.close()

        ads = [
            {
                "id": r[0], "title": r[1], "price": r[2],
                "category": r[3], "city": r[4], "condition": r[5],
                "date": r[6].strftime("%d.%m.%Y"), "author": r[7],
                "photos": list(r[8]) if r[8] else [],
                "status": r[9], "views": r[10],
                "category_id": r[11], "category_name": r[12],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "ads": ads, "total": total, "page": page, "per_page": per_page})}

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
        category_id = body.get("category_id")
        category_id = int(category_id) if category_id else None
        city = (body.get("city") or "").strip()
        condition = (body.get("condition") or "Хорошее").strip()
        photos_b64 = body.get("photos") or []

        if not title or not price or not city:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните обязательные поля"})}

        if not category and not category_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите категорию"})}

        if category_id and not category:
            cur.execute(f"SELECT name FROM {SCHEMA}.categories WHERE id=%s", (category_id,))
            row_c = cur.fetchone()
            if row_c:
                category = row_c[0]

        try:
            price = int(price)
        except (ValueError, TypeError):
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректная цена"})}

        photo_urls = upload_photos(photos_b64) if photos_b64 else []

        cur.execute(
            f"""INSERT INTO {SCHEMA}.ads (user_id, title, description, price, category, category_id, city, condition, photos, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending') RETURNING id""",
            (user_id, title, description, price, category, category_id, city, condition, photo_urls)
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
        category_id = body.get("category_id")
        category_id = int(category_id) if category_id else None
        city = (body.get("city") or "").strip()
        condition = (body.get("condition") or "Хорошее").strip()
        photos_b64 = body.get("new_photos") or []
        keep_urls = body.get("keep_photos") or []

        if not title or not price or not city:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните обязательные поля"})}

        if category_id and not category:
            cur.execute(f"SELECT name FROM {SCHEMA}.categories WHERE id=%s", (category_id,))
            row_c = cur.fetchone()
            if row_c:
                category = row_c[0]

        try:
            price = int(price)
        except (ValueError, TypeError):
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректная цена"})}

        new_urls = upload_photos(photos_b64) if photos_b64 else []
        all_photos = keep_urls + new_urls

        cur.execute(
            f"""UPDATE {SCHEMA}.ads
                SET title=%s, description=%s, price=%s, category=%s, category_id=%s,
                    city=%s, condition=%s, photos=%s, updated_at=NOW()
                WHERE id=%s AND user_id=%s""",
            (title, description, price, category, category_id, city, condition, all_photos, ad_id, user_id)
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