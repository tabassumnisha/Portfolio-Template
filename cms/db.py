# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Data layer: SQLite connection, start-up (schema, seed, first admin) and content storage. Bound parameters only."""
import json
import sqlite3

from . import auth, settings


def load_defaults():
    portfolio = json.loads((settings.ROOT / "database/default-portfolio.json").read_text(encoding="utf-8"))
    config = json.loads((settings.ROOT / "database/default-config.json").read_text(encoding="utf-8"))
    return portfolio, config


def connect():
    settings.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(settings.DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA journal_mode=WAL")
    return con


def initialize_database():
    """Create the database from scratch if needed, seed demo content and create the first admin."""
    con = connect()
    con.executescript((settings.ROOT / "database/schema.sql").read_text(encoding="utf-8"))
    if con.execute("SELECT COUNT(*) n FROM projects").fetchone()["n"] == 0:
        con.executescript((settings.ROOT / "database/seed.sql").read_text(encoding="utf-8"))
    for key, value in zip(("portfolio", "config"), load_defaults()):
        con.execute("INSERT OR IGNORE INTO app_content(content_key,json_value) VALUES(?,?)",
                    (key, json.dumps(value, ensure_ascii=False)))
    if con.execute("SELECT COUNT(*) n FROM admin_users").fetchone()["n"] == 0 \
            and settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD and not settings.ADMIN_PASSWORD.startswith("CHANGE_ME"):
        con.execute("INSERT INTO admin_users(email,password_hash,role) VALUES(?,?, 'admin')",
                    (settings.ADMIN_EMAIL, auth.password_hash(settings.ADMIN_PASSWORD)))
        print("Initial admin account created for", settings.ADMIN_EMAIL)
    con.commit(); con.close()


def get_content(key):
    con = connect()
    row = con.execute("SELECT json_value FROM app_content WHERE content_key=?", (key,)).fetchone()
    con.close()
    if not row: raise RuntimeError("Missing content: " + key)
    return json.loads(row["json_value"])


def save_content(key, value):
    con = connect()
    con.execute("INSERT INTO app_content(content_key,json_value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) "
                "ON CONFLICT(content_key) DO UPDATE SET json_value=excluded.json_value,updated_at=CURRENT_TIMESTAMP",
                (key, json.dumps(value, ensure_ascii=False)))
    con.commit(); con.close()


def admin_by_id(user_id):
    con = connect(); row = con.execute("SELECT id,email,role FROM admin_users WHERE id=?", (user_id,)).fetchone(); con.close()
    return row


def admin_by_email(email):
    con = connect()
    row = con.execute("SELECT id,email,password_hash,role FROM admin_users WHERE email=?", (email,)).fetchone()
    con.close()
    return row


def password_hash_of(user_id):
    con = connect(); row = con.execute("SELECT password_hash FROM admin_users WHERE id=?", (user_id,)).fetchone(); con.close()
    return row["password_hash"] if row else None


def set_password_hash(user_id, new_hash):
    con = connect()
    con.execute("UPDATE admin_users SET password_hash=? WHERE id=?", (new_hash, user_id))
    con.commit(); con.close()
