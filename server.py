#!/usr/bin/env python3
# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Portfolio CMS: standard-library HTTP server with SQLite, admin sign-in and JSON APIs.

Public site: Project/ (served at /). Admin panel: Project/admin/ (served at /admin/).
Content (portfolio data and site configuration) is stored as JSON in the SQLite table app_content.
Every route that changes data requires a signed-in admin and the X-Portfolio-Action header.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, json, sqlite3, hashlib, hmac, secrets, time, urllib.parse

import uploads
from validation import portfolio_error, config_error, valid_portfolio, valid_config  # noqa: F401 (re-exported for tests)

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT / "Project"
BUNDLED_IMAGES = PROJECT / "assets" / "images"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(ROOT / "data" / "portfolio.sqlite3")))
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8080"))
ADMIN_EMAIL = ""
ADMIN_PASSWORD = ""
SESSION_SECRET = ""
COOKIE_SECURE = False
SESSION_TTL = 8 * 60 * 60
SESSIONS = {}
LOGIN_FAILURES = {}
LOGIN_WINDOW_SECONDS = 300
LOGIN_MAX_FAILURES = 8
PUBLIC_CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
              "script-src 'self' 'sha256-Du+OJKJSbdUgz5nrHeWWINvez6XKDDU/tyj/5c2uvwo='; "
              "base-uri 'none'; form-action 'self'; frame-ancestors 'self'")
ADMIN_CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
             "base-uri 'none'; form-action 'self'; frame-ancestors 'none'")


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


def load_defaults():
    portfolio = json.loads((ROOT / "database/default-portfolio.json").read_text(encoding="utf-8"))
    config = json.loads((ROOT / "database/default-config.json").read_text(encoding="utf-8"))
    return portfolio, config


def upload_dir():
    return DB_PATH.parent / "uploads"


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA journal_mode=WAL")
    return con


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    return salt.hex() + "$" + hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000).hex()


def password_ok(password, stored):
    try:
        salt_hex, digest = stored.split("$", 1)
        return hmac.compare_digest(password_hash(password, bytes.fromhex(salt_hex)).split("$", 1)[1], digest)
    except Exception:
        return False


def session_secret_ready():
    return bool(SESSION_SECRET) and not SESSION_SECRET.startswith("CHANGE_ME")


def initialize():
    """Read settings, create the database from scratch if needed, seed demo content, create the first admin."""
    read_env_file()
    global HOST, PORT, DB_PATH, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, COOKIE_SECURE
    HOST = os.getenv("HOST", HOST); PORT = int(os.getenv("PORT", str(PORT)))
    DB_PATH = Path(os.getenv("DATABASE_PATH", str(DB_PATH)))
    if not DB_PATH.is_absolute(): DB_PATH = (ROOT / DB_PATH).resolve()
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
    SESSION_SECRET = os.getenv("SESSION_SECRET", "")
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    con = connect()
    con.executescript((ROOT / "database/schema.sql").read_text(encoding="utf-8"))
    if con.execute("SELECT COUNT(*) n FROM projects").fetchone()["n"] == 0:
        con.executescript((ROOT / "database/seed.sql").read_text(encoding="utf-8"))
    for key, value in zip(("portfolio", "config"), load_defaults()):
        con.execute("INSERT OR IGNORE INTO app_content(content_key,json_value) VALUES(?,?)",
                    (key, json.dumps(value, ensure_ascii=False)))
    if con.execute("SELECT COUNT(*) n FROM admin_users").fetchone()["n"] == 0 \
            and ADMIN_EMAIL and ADMIN_PASSWORD and not ADMIN_PASSWORD.startswith("CHANGE_ME"):
        con.execute("INSERT INTO admin_users(email,password_hash,role) VALUES(?,?, 'admin')",
                    (ADMIN_EMAIL, password_hash(ADMIN_PASSWORD)))
        print("Initial admin account created for", ADMIN_EMAIL)
    con.commit(); con.close()
    upload_dir().mkdir(parents=True, exist_ok=True)
    if not session_secret_ready():
        print("WARNING: SESSION_SECRET is not configured. Admin sign-in is disabled until you set a unique secret in .env.")


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


def list_images():
    names = {p.name for p in BUNDLED_IMAGES.iterdir() if p.is_file()}
    if upload_dir().is_dir():
        names |= {p.name for p in upload_dir().iterdir() if p.is_file() and uploads.SAFE_NAME_RE.match(p.name)}
    return sorted(names)


class Handler(SimpleHTTPRequestHandler):
    server_version = "PortfolioCMS/1.2"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT), **kwargs)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        admin_area = path.startswith("/admin") or path.startswith("/api/")
        self.send_header("Content-Security-Policy", ADMIN_CSP if admin_area else PUBLIC_CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY" if admin_area else "SAMEORIGIN")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(403, "Directory listing is disabled")
        return None

    def send_bytes(self, status, raw, content_type, headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(raw)

    def send_json(self, status, obj, headers=None):
        self.send_bytes(status, json.dumps(obj, ensure_ascii=False).encode(), "application/json; charset=utf-8", headers)

    def body_length(self, limit):
        try: n = int(self.headers.get("Content-Length", "0"))
        except ValueError: n = -1
        if n < 0 or n > limit: raise ValueError("Request body too large")
        return n

    def body(self):
        try:
            parsed = json.loads(self.rfile.read(self.body_length(1_000_000)) or b"{}")
            if not isinstance(parsed, dict): raise ValueError("JSON body must be an object")
            return parsed
        except (ValueError, TypeError, json.JSONDecodeError) as e:
            raise ValueError(str(e) if str(e) == "Request body too large" else "Invalid JSON request") from e

    # --- sign-in throttling and sessions -------------------------------------------------
    def recent_failures(self):
        now = time.time()
        attempts = [t for t in LOGIN_FAILURES.get(self.client_address[0], []) if now - t < LOGIN_WINDOW_SECONDS]
        LOGIN_FAILURES[self.client_address[0]] = attempts
        return attempts

    def session_cookie_value(self):
        for part in self.headers.get("Cookie", "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "portfolio_session": return v
        return ""

    def token(self):
        value = self.session_cookie_value()
        if not value or not session_secret_ready(): return None
        sid, sep, sig = value.partition(".")
        if not sep or not hmac.compare_digest(sig, hmac.new(SESSION_SECRET.encode(), sid.encode(), hashlib.sha256).hexdigest()): return None
        session = SESSIONS.get(sid)
        if not session or session["expires"] < time.time():
            SESSIONS.pop(sid, None); return None
        session["expires"] = time.time() + SESSION_TTL
        return session

    def require_admin(self):
        """Every route that changes data calls this: signed-in user with the admin role plus the anti-CSRF header."""
        if self.headers.get("X-Portfolio-Action") != "1":
            self.send_json(403, {"error": "Request validation failed."}); return None
        s = self.token()
        if not s:
            self.send_json(401, {"error": "Please sign in again."}); return None
        con = connect(); row = con.execute("SELECT id,email,role FROM admin_users WHERE id=?", (s["user_id"],)).fetchone(); con.close()
        if not row or row["role"] != "admin":
            self.send_json(403, {"error": "Admin permission required."}); return None
        return row

    def require_admin_read(self):
        s = self.token()
        if not s:
            self.send_json(401, {"error": "Please sign in again."}); return None
        return s

    # --- GET -----------------------------------------------------------------------------
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            self.send_json(200, {"ok": True, "product": "Portfolio CMS"}); return
        if path == "/api/data":
            self.send_json(200, get_content("portfolio")); return
        if path == "/api/config":
            self.send_json(200, get_content("config")); return
        if path in ("/js/data.js", "/config.js"):
            name, key = ("PortfolioData", "portfolio") if path == "/js/data.js" else ("SITE_CONFIG", "config")
            self.send_bytes(200, ("window." + name + " = " + json.dumps(get_content(key), ensure_ascii=False) + ";\n").encode(),
                            "application/javascript; charset=utf-8"); return
        if path == "/api/admin/session":
            self.send_json(200, {"signedIn": bool(self.token())}); return
        if path == "/api/admin/content":
            if not self.require_admin_read(): return
            self.send_json(200, {"portfolio": get_content("portfolio"), "config": get_content("config")}); return
        if path == "/api/admin/images":
            if not self.require_admin_read(): return
            self.send_json(200, {"images": list_images()}); return
        if path.startswith("/assets/images/") and self.send_uploaded_image(path): return
        if path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def send_uploaded_image(self, path):
        """Serve a file the admin uploaded (stored outside Project/, in the data folder)."""
        name = path[len("/assets/images/"):]
        file = upload_dir() / name
        if not uploads.SAFE_NAME_RE.match(name) or (BUNDLED_IMAGES / name).exists() or not file.is_file(): return False
        self.send_bytes(200, file.read_bytes(), uploads.content_type_for(name), {"Cache-Control": "public, max-age=3600"})
        return True

    # --- POST ----------------------------------------------------------------------------
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/admin/upload":
            self.handle_upload(); return
        try: data = self.body()
        except ValueError as e: self.send_json(400, {"error": str(e)}); return
        if path == "/api/login":
            self.handle_login(data); return
        if path == "/api/logout":
            SESSIONS.pop(self.session_cookie_value().split(".", 1)[0], None)
            self.send_json(200, {"ok": True}, {"Set-Cookie": "portfolio_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"}); return
        if path == "/api/admin/password":
            self.handle_password(data); return
        self.send_json(404, {"error": "Not found."})

    def handle_login(self, data):
        if len(self.recent_failures()) >= LOGIN_MAX_FAILURES:
            self.send_json(429, {"error": "Too many sign-in attempts. Try again in five minutes."}, {"Retry-After": str(LOGIN_WINDOW_SECONDS)}); return
        if not session_secret_ready():
            self.send_json(503, {"error": "Admin sign-in is disabled: configure a unique SESSION_SECRET in .env."}); return
        email = str(data.get("email", "")).strip().lower(); password = str(data.get("password", ""))
        con = connect(); user = con.execute("SELECT id,email,password_hash,role FROM admin_users WHERE email=?", (email,)).fetchone(); con.close()
        if not user or user["role"] != "admin" or not password_ok(password, user["password_hash"]):
            LOGIN_FAILURES.setdefault(self.client_address[0], []).append(time.time())
            time.sleep(.25); self.send_json(401, {"error": "Invalid email or password."}); return
        LOGIN_FAILURES.pop(self.client_address[0], None)
        sid = secrets.token_urlsafe(32); SESSIONS[sid] = {"user_id": user["id"], "expires": time.time() + SESSION_TTL}
        sig = hmac.new(SESSION_SECRET.encode(), sid.encode(), hashlib.sha256).hexdigest()
        cookie = "portfolio_session=%s.%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d" % (sid, sig, SESSION_TTL)
        if COOKIE_SECURE: cookie += "; Secure"
        self.send_json(200, {"ok": True, "email": user["email"]}, {"Set-Cookie": cookie})

    def handle_password(self, data):
        user = self.require_admin()
        if not user: return
        current = str(data.get("currentPassword", "")); new = str(data.get("newPassword", ""))
        if len(new) < 14: self.send_json(400, {"error": "New password must be at least 14 characters."}); return
        con = connect(); row = con.execute("SELECT password_hash FROM admin_users WHERE id=?", (user["id"],)).fetchone()
        if not row or not password_ok(current, row["password_hash"]):
            con.close(); self.send_json(401, {"error": "Current password is incorrect."}); return
        con.execute("UPDATE admin_users SET password_hash=? WHERE id=?", (password_hash(new), user["id"])); con.commit(); con.close()
        self.send_json(200, {"ok": True})

    def handle_upload(self):
        if not self.require_admin(): return
        try: raw = self.rfile.read(self.body_length(uploads.MAX_UPLOAD_BYTES))
        except ValueError: self.send_json(413, {"error": "Image is larger than 3 MB."}); return
        extension = uploads.detect_extension(raw)
        if not extension: self.send_json(400, {"error": "Only JPG, PNG, WebP or GIF images are accepted."}); return
        name = uploads.new_name(extension)
        upload_dir().mkdir(parents=True, exist_ok=True)
        (upload_dir() / name).write_bytes(raw)
        self.send_json(201, {"file": name})

    # --- PUT -----------------------------------------------------------------------------
    def do_PUT(self):
        path = urllib.parse.urlparse(self.path).path
        user = self.require_admin()
        if not user: return
        try: data = self.body()
        except ValueError as e: self.send_json(400, {"error": str(e)}); return
        checks = {"/api/admin/content/portfolio": ("portfolio", portfolio_error),
                  "/api/admin/content/config": ("config", config_error)}
        if path not in checks:
            self.send_json(404, {"error": "Not found."}); return
        key, check = checks[path]
        error = check(data)
        if error: self.send_json(400, {"error": error}); return
        save_content(key, data); self.send_json(200, {"ok": True})


def main():
    initialize()
    print("Portfolio CMS running at http://%s:%d (admin: /admin/)" % (HOST, PORT))
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
