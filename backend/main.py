# Серверное API сервиса записи на услуги
# Запуск: uvicorn main:app --reload   (документация API: http://localhost:8000/docs)
import secrets
import sqlite3
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from db import get_conn, init_db, hash_password, check_password

app = FastAPI(title="Сервис записи на услуги", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
bearer = HTTPBearer()


# ---------- Модели запросов ----------

class RegisterIn(BaseModel):
    email: str
    password: str
    name: str


class LoginIn(BaseModel):
    email: str
    password: str


class BookingIn(BaseModel):
    slot_id: int


class SlotIn(BaseModel):
    specialist_id: int
    start_time: str          # формат 2026-11-20T10:00


# ---------- Авторизация ----------

def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)):
    conn = get_conn()
    row = conn.execute(
        "SELECT u.id, u.email, u.name, u.role FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ?",
        (cred.credentials,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(401, "Нужно войти в систему")
    return dict(row)


def admin_user(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Доступ только для администратора")
    return user


def make_token(conn, user_id):
    token = secrets.token_hex(32)
    conn.execute("INSERT INTO tokens (token, user_id) VALUES (?, ?)", (token, user_id))
    return token


@app.post("/api/register", tags=["Авторизация"])
def register(data: RegisterIn):
    if len(data.password) < 6:
        raise HTTPException(400, "Пароль должен быть не короче 6 символов")
    if "@" not in data.email:
        raise HTTPException(400, "Некорректный email")
    conn = get_conn()
    try:
        cur = conn.execute("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
                           (data.email.lower(), hash_password(data.password), data.name))
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(409, "Пользователь с таким email уже есть")
    token = make_token(conn, cur.lastrowid)
    conn.commit()
    conn.close()
    return {"token": token, "user": {"id": cur.lastrowid, "email": data.email.lower(), "name": data.name, "role": "user"}}


@app.post("/api/login", tags=["Авторизация"])
def login(data: LoginIn):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (data.email.lower(),)).fetchone()
    if row is None or not check_password(data.password, row["password_hash"]):
        conn.close()
        raise HTTPException(401, "Неверный email или пароль")
    token = make_token(conn, row["id"])
    conn.commit()
    conn.close()
    return {"token": token, "user": {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"]}}


@app.get("/api/me", tags=["Авторизация"])
def me(user=Depends(current_user)):
    return user


# ---------- Каталог ----------

@app.get("/api/services", tags=["Каталог"])
def get_services():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM services").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/specialists", tags=["Каталог"])
def get_specialists(service_id: int = None):
    conn = get_conn()
    if service_id is None:
        rows = conn.execute("SELECT * FROM specialists").fetchall()
    else:
        rows = conn.execute("SELECT * FROM specialists WHERE service_id = ?", (service_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/slots", tags=["Каталог"])
def get_slots(specialist_id: int, date: str):
    """Слоты специалиста на дату (YYYY-MM-DD). is_free = можно записаться."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT s.id, s.start_time,
               (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.status = 'active') AS busy
        FROM slots s
        WHERE s.specialist_id = ? AND s.start_time LIKE ?
        ORDER BY s.start_time""", (specialist_id, date + "%")).fetchall()
    conn.close()
    now = datetime.now().strftime("%Y-%m-%dT%H:%M")
    result = []
    for r in rows:
        result.append({"id": r["id"], "start_time": r["start_time"],
                       "is_free": r["busy"] == 0 and r["start_time"] > now})
    return result


# ---------- Записи пользователя ----------

@app.post("/api/bookings", tags=["Записи"])
def create_booking(data: BookingIn, user=Depends(current_user)):
    conn = get_conn()
    slot = conn.execute("SELECT * FROM slots WHERE id = ?", (data.slot_id,)).fetchone()
    if slot is None:
        conn.close()
        raise HTTPException(404, "Слот не найден")
    if slot["start_time"] <= datetime.now().strftime("%Y-%m-%dT%H:%M"):
        conn.close()
        raise HTTPException(400, "Нельзя записаться на прошедшее время")
    try:
        cur = conn.execute("INSERT INTO bookings (user_id, slot_id, created_at) VALUES (?, ?, ?)",
                           (user["id"], data.slot_id, datetime.now().isoformat(timespec="seconds")))
        conn.commit()
    except sqlite3.IntegrityError:
        # сработал уникальный индекс: на этот слот уже есть активная запись
        conn.close()
        raise HTTPException(409, "Это время уже занято")
    conn.close()
    return {"id": cur.lastrowid, "status": "active"}


BOOKINGS_SQL = """
    SELECT b.id, b.status, b.created_at, s.start_time, sp.name AS specialist,
           sv.name AS service, sv.price, u.name AS client, u.email
    FROM bookings b
    JOIN slots s ON s.id = b.slot_id
    JOIN specialists sp ON sp.id = s.specialist_id
    JOIN services sv ON sv.id = sp.service_id
    JOIN users u ON u.id = b.user_id
"""


@app.get("/api/my/bookings", tags=["Записи"])
def my_bookings(user=Depends(current_user)):
    conn = get_conn()
    rows = conn.execute(BOOKINGS_SQL + " WHERE b.user_id = ? ORDER BY s.start_time", (user["id"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.delete("/api/bookings/{booking_id}", tags=["Записи"])
def cancel_booking(booking_id: int, user=Depends(current_user)):
    conn = get_conn()
    row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(404, "Запись не найдена")
    if row["user_id"] != user["id"] and user["role"] != "admin":
        conn.close()
        raise HTTPException(403, "Это не ваша запись")
    conn.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
    conn.commit()
    conn.close()
    return {"id": booking_id, "status": "cancelled"}


# ---------- Администратор ----------

@app.get("/api/admin/bookings", tags=["Администратор"])
def all_bookings(user=Depends(admin_user)):
    conn = get_conn()
    rows = conn.execute(BOOKINGS_SQL + " ORDER BY s.start_time").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/admin/slots", tags=["Администратор"])
def add_slot(data: SlotIn, user=Depends(admin_user)):
    conn = get_conn()
    try:
        cur = conn.execute("INSERT INTO slots (specialist_id, start_time) VALUES (?, ?)",
                           (data.specialist_id, data.start_time))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(409, "Такой слот уже есть или специалист не найден")
    conn.close()
    return {"id": cur.lastrowid}


@app.delete("/api/admin/slots/{slot_id}", tags=["Администратор"])
def delete_slot(slot_id: int, user=Depends(admin_user)):
    conn = get_conn()
    busy = conn.execute("SELECT COUNT(*) FROM bookings WHERE slot_id = ? AND status = 'active'",
                        (slot_id,)).fetchone()[0]
    if busy > 0:
        conn.close()
        raise HTTPException(409, "На этот слот есть запись, сначала отмените её")
    conn.execute("DELETE FROM bookings WHERE slot_id = ?", (slot_id,))
    conn.execute("DELETE FROM slots WHERE id = ?", (slot_id,))
    conn.commit()
    conn.close()
    return {"deleted": slot_id}
