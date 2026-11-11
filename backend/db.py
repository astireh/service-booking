# Работа с базой данных SQLite: создание таблиц и тестовые данные
import sqlite3
import hashlib
import os
from datetime import date, timedelta

DB_FILE = os.path.join(os.path.dirname(__file__), "booking.db")


def get_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row          # строки как словари: row["name"]
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16).hex()
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return salt + "$" + h


def check_password(password, stored):
    salt = stored.split("$")[0]
    return hash_password(password, salt) == stored


def init_db():
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    );
    CREATE TABLE IF NOT EXISTS tokens (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        price INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS specialists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        service_id INTEGER NOT NULL REFERENCES services(id)
    );
    CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        specialist_id INTEGER NOT NULL REFERENCES specialists(id),
        start_time TEXT NOT NULL,
        UNIQUE (specialist_id, start_time)
    );
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        slot_id INTEGER NOT NULL REFERENCES slots(id),
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
    );
    -- Защита от двойного бронирования: на один слот только одна активная запись
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_slot
        ON bookings(slot_id) WHERE status = 'active';
    """)

    # Тестовые данные добавляем только в пустую базу
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        seed(conn)
    conn.commit()
    conn.close()


def seed(conn):
    conn.execute("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
                 ("admin@test.ru", hash_password("admin123"), "Администратор", "admin"))
    conn.execute("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
                 ("user@test.ru", hash_password("user123"), "Иван Тестов", "user"))

    services = [("Стрижка", 60, 1200), ("Маникюр", 60, 1500), ("Массаж", 60, 2500)]
    for s in services:
        conn.execute("INSERT INTO services (name, duration_min, price) VALUES (?, ?, ?)", s)

    specialists = [("Анна Смирнова", 1), ("Олег Петров", 1), ("Мария Козлова", 2), ("Сергей Волков", 3)]
    for sp in specialists:
        conn.execute("INSERT INTO specialists (name, service_id) VALUES (?, ?)", sp)

    # Слоты на 7 дней вперёд с 10:00 до 17:00 для каждого специалиста
    today = date.today()
    for day in range(7):
        d = today + timedelta(days=day)
        for sp_id in range(1, len(specialists) + 1):
            for hour in range(10, 18):
                start = d.isoformat() + "T" + str(hour).zfill(2) + ":00"
                conn.execute("INSERT INTO slots (specialist_id, start_time) VALUES (?, ?)", (sp_id, start))
