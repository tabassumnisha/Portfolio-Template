# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Settings: paths, limits and values read from the environment (and an optional .env file).

Other modules read these as `settings.NAME` at call time, so load_from_environment() can change them after import.
"""
import os
from pathlib import Path

import demo_defaults

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "Project"
BUNDLED_IMAGES = PROJECT / "assets" / "images"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(ROOT / "data" / "portfolio.sqlite3")))
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8080"))
ADMIN_EMAIL = ""
ADMIN_PASSWORD = ""
SESSION_SECRET = ""
COOKIE_SECURE = False
STATELESS_SESSIONS = False   # True on serverless hosts (Vercel): the session lives in the signed cookie, not in memory
DEMO_MODE = False            # True for a public demo: the admin password cannot be changed
SESSION_TTL = 8 * 60 * 60
LOGIN_WINDOW_SECONDS = 300
LOGIN_MAX_FAILURES = 8


def read_env_file():
    """Tiny .env reader; real environment variables always take precedence."""
    p = ROOT / ".env"
    if not p.exists(): return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ: os.environ[k] = v


def session_secret_ready():
    return bool(SESSION_SECRET) and not SESSION_SECRET.startswith("CHANGE_ME")


def upload_dir():
    return DB_PATH.parent / "uploads"


def load_from_environment():
    """Read every setting from the environment (after loading .env)."""
    read_env_file()
    global HOST, PORT, DB_PATH, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, COOKIE_SECURE, STATELESS_SESSIONS, DEMO_MODE
    on_vercel = bool(os.getenv("VERCEL"))
    HOST = os.getenv("HOST", HOST); PORT = int(os.getenv("PORT", str(PORT)))
    # On Vercel only /tmp is writable, so the database defaults there (it is rebuilt on every cold start).
    DB_PATH = Path(os.getenv("DATABASE_PATH", "/tmp/portfolio-cms/portfolio.sqlite3" if on_vercel else str(DB_PATH)))
    if not DB_PATH.is_absolute(): DB_PATH = (ROOT / DB_PATH).resolve()
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
    SESSION_SECRET = os.getenv("SESSION_SECRET", "")
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true" if on_vercel else "false").lower() == "true"
    STATELESS_SESSIONS = os.getenv("STATELESS_SESSIONS", "true" if on_vercel else "false").lower() == "true"
    DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
    if DEMO_MODE:   # public demo: fall back to the built-in demo sign-in for anything not configured explicitly
        if not ADMIN_EMAIL or not ADMIN_PASSWORD or ADMIN_PASSWORD.startswith("CHANGE_ME"):
            ADMIN_EMAIL, ADMIN_PASSWORD = demo_defaults.EMAIL, demo_defaults.PASSWORD
        if not session_secret_ready():
            SESSION_SECRET = demo_defaults.SESSION_SECRET
        print("DEMO_MODE is on: this is a public demo. Do not use it for a real site.")
