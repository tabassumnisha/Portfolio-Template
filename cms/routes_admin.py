# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Admin routes. Every route that creates, updates or deletes data calls h.require_admin() first.

Public POST routes: only /api/login and /api/logout. There are no SQL DELETE statements anywhere in the code.
"""
import time

import uploads
from validation import portfolio_error, config_error
from . import auth, db, settings

CONTENT_CHECKS = {"/api/admin/content/portfolio": ("portfolio", portfolio_error),
                  "/api/admin/content/config": ("config", config_error)}


def list_images():
    names = {p.name for p in settings.BUNDLED_IMAGES.iterdir() if p.is_file()}
    if settings.upload_dir().is_dir():
        names |= {p.name for p in settings.upload_dir().iterdir() if p.is_file() and uploads.SAFE_NAME_RE.match(p.name)}
    return sorted(names)


# --- GET: read-only, valid session required -----------------------------------------------
def handle_get(h, path):
    if path == "/api/admin/session":
        h.send_json(200, {"signedIn": bool(h.session())}); return True
    if path == "/api/admin/content":
        if not h.require_admin_read(): return True
        h.send_json(200, {"portfolio": db.get_content("portfolio"), "config": db.get_content("config")}); return True
    if path == "/api/admin/images":
        if not h.require_admin_read(): return True
        h.send_json(200, {"images": list_images()}); return True
    return False


# --- POST ---------------------------------------------------------------------------------
def handle_post(h, path):
    if path == "/api/admin/upload":
        upload(h); return
    try: data = h.body()
    except ValueError as e: h.send_json(400, {"error": str(e)}); return
    if path == "/api/login":
        login(h, data); return
    if path == "/api/logout":
        h.send_json(200, {"ok": True}, {"Set-Cookie": auth.end_session(h.headers.get("Cookie", ""))}); return
    if path == "/api/admin/password":
        change_password(h, data); return
    h.send_json(404, {"error": "Not found."})


def login(h, data):
    address = h.client_address[0]
    if len(auth.recent_failures(address)) >= settings.LOGIN_MAX_FAILURES:
        h.send_json(429, {"error": "Too many sign-in attempts. Try again in five minutes."},
                    {"Retry-After": str(settings.LOGIN_WINDOW_SECONDS)}); return
    if not settings.session_secret_ready():
        h.send_json(503, {"error": "Admin sign-in is disabled: configure a unique SESSION_SECRET in .env."}); return
    email = str(data.get("email", "")).strip().lower(); password = str(data.get("password", ""))
    user = db.admin_by_email(email)
    if not user or user["role"] != "admin" or not auth.password_ok(password, user["password_hash"]):
        auth.record_failure(address)
        time.sleep(.25); h.send_json(401, {"error": "Invalid email or password."}); return
    auth.clear_failures(address)
    h.send_json(200, {"ok": True, "email": user["email"]}, {"Set-Cookie": auth.start_session(user["id"])})


def change_password(h, data):
    user = h.require_admin()
    if not user: return
    if settings.DEMO_MODE: h.send_json(403, {"error": "The password cannot be changed in the public demo."}); return
    current = str(data.get("currentPassword", "")); new = str(data.get("newPassword", ""))
    if len(new) < 14: h.send_json(400, {"error": "New password must be at least 14 characters."}); return
    stored = db.password_hash_of(user["id"])
    if not stored or not auth.password_ok(current, stored):
        h.send_json(401, {"error": "Current password is incorrect."}); return
    db.set_password_hash(user["id"], auth.password_hash(new))
    h.send_json(200, {"ok": True})


def upload(h):
    if not h.require_admin(): return
    try: raw = h.rfile.read(h.body_length(uploads.MAX_UPLOAD_BYTES))
    except ValueError:
        h.discard_body(); h.send_json(413, {"error": "Image is larger than 3 MB."}); return
    extension = uploads.detect_extension(raw)
    if not extension: h.send_json(400, {"error": "Only JPG, PNG, WebP or GIF images are accepted."}); return
    name = uploads.new_name(extension)       # random name: the visitor-supplied file name is never used
    settings.upload_dir().mkdir(parents=True, exist_ok=True)
    (settings.upload_dir() / name).write_bytes(raw)
    h.send_json(201, {"file": name})


# --- PUT ----------------------------------------------------------------------------------
def handle_put(h, path):
    user = h.require_admin()
    if not user: return
    try: data = h.body()
    except ValueError as e: h.send_json(400, {"error": str(e)}); return
    if path not in CONTENT_CHECKS:
        h.send_json(404, {"error": "Not found."}); return
    key, check = CONTENT_CHECKS[path]
    error = check(data)
    if error: h.send_json(400, {"error": error}); return
    db.save_content(key, data); h.send_json(200, {"ok": True})
