"""
Избранное: папки и объявления в них.
Действия: folders (список), create_folder, rename_folder, delete_folder,
          add_item, remove_item, folder_items.
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
    cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()", (sid,))
    row = cur.fetchone()
    return row[0] if row else None


def require_auth(event, cur, conn):
    uid = get_user_id(event, cur)
    if not uid:
        conn.close()
        return None, {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Необходима авторизация"})}
    return uid, None


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action") or body.get("action") or ""

    # folders — список папок пользователя с количеством объявлений
    if action == "folders":
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"""SELECT f.id, f.name, f.created_at,
                       COUNT(i.id) as cnt
                FROM {SCHEMA}.favorite_folders f
                LEFT JOIN {SCHEMA}.favorite_items i ON i.folder_id = f.id
                WHERE f.user_id = %s
                GROUP BY f.id, f.name, f.created_at
                ORDER BY f.created_at ASC""",
            (uid,)
        )
        rows = cur.fetchall()
        conn.close()
        folders = [{"id": r[0], "name": r[1], "date": r[2].strftime("%d.%m.%Y"), "count": r[3]} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "folders": folders})}

    # create_folder — создать папку
    if action == "create_folder":
        name = (body.get("name") or "").strip()
        if not name:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите название папки"})}
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"INSERT INTO {SCHEMA}.favorite_folders (user_id, name) VALUES (%s, %s) RETURNING id",
            (uid, name)
        )
        fid = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": fid})}

    # rename_folder — переименовать папку
    if action == "rename_folder":
        fid = body.get("folder_id")
        name = (body.get("name") or "").strip()
        if not name or not fid:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите id и название"})}
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"UPDATE {SCHEMA}.favorite_folders SET name = %s WHERE id = %s AND user_id = %s",
            (name, fid, uid)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # delete_folder — удалить папку (объявления не удаляются)
    if action == "delete_folder":
        fid = body.get("folder_id")
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"UPDATE {SCHEMA}.favorite_folders SET name = name WHERE id = %s AND user_id = %s RETURNING id",
            (fid, uid)
        )
        if cur.fetchone():
            cur.execute(f"DELETE FROM {SCHEMA}.favorite_items WHERE folder_id = %s", (fid,))
            cur.execute(f"DELETE FROM {SCHEMA}.favorite_folders WHERE id = %s AND user_id = %s", (fid, uid))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # add_item — добавить объявление в папку
    if action == "add_item":
        fid = body.get("folder_id")
        ad_id = body.get("ad_id")
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"SELECT id FROM {SCHEMA}.favorite_folders WHERE id = %s AND user_id = %s",
            (fid, uid)
        )
        if not cur.fetchone():
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Папка не найдена"})}
        cur.execute(
            f"INSERT INTO {SCHEMA}.favorite_items (folder_id, ad_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (fid, ad_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # remove_item — убрать объявление из папки
    if action == "remove_item":
        fid = body.get("folder_id")
        ad_id = body.get("ad_id")
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"""DELETE FROM {SCHEMA}.favorite_items i
                USING {SCHEMA}.favorite_folders f
                WHERE i.folder_id = f.id AND f.user_id = %s
                AND i.folder_id = %s AND i.ad_id = %s""",
            (uid, fid, ad_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # folder_items — объявления в папке
    if action == "folder_items":
        fid = qs.get("folder_id") or body.get("folder_id")
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"SELECT id FROM {SCHEMA}.favorite_folders WHERE id = %s AND user_id = %s",
            (fid, uid)
        )
        if not cur.fetchone():
            conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Папка не найдена"})}
        cur.execute(
            f"""SELECT a.id, a.title, a.price, a.category, a.city, a.condition,
                       a.created_at, u.name as author, a.photos
                FROM {SCHEMA}.favorite_items i
                JOIN {SCHEMA}.ads a ON a.id = i.ad_id
                JOIN {SCHEMA}.users u ON u.id = a.user_id
                WHERE i.folder_id = %s
                ORDER BY i.created_at DESC""",
            (fid,)
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

    # my_ad_folders — в каких папках находится объявление (для показа галочек)
    if action == "my_ad_folders":
        ad_id = qs.get("ad_id") or body.get("ad_id")
        conn = get_conn()
        cur = conn.cursor()
        uid, err = require_auth(event, cur, conn)
        if err:
            return err
        cur.execute(
            f"""SELECT i.folder_id FROM {SCHEMA}.favorite_items i
                JOIN {SCHEMA}.favorite_folders f ON f.id = i.folder_id
                WHERE f.user_id = %s AND i.ad_id = %s""",
            (uid, ad_id)
        )
        folder_ids = [r[0] for r in cur.fetchall()]
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "folder_ids": folder_ids})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите action"})}
