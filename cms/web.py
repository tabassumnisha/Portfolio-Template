# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Base HTTP handler: security headers, JSON helpers, request body limits and the require_admin() guard."""
import json
from http.server import SimpleHTTPRequestHandler

from . import auth, db, settings

# The one inline script of the website is pinned by hash here; update the hash if you change it in Project/index.html.
PUBLIC_CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
              "script-src 'self' 'sha256-Du+OJKJSbdUgz5nrHeWWINvez6XKDDU/tyj/5c2uvwo='; "
              "base-uri 'none'; form-action 'self'; frame-ancestors 'self'")
ADMIN_CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
             "base-uri 'none'; form-action 'self'; frame-ancestors 'none'")


class BaseHandler(SimpleHTTPRequestHandler):
    server_version = "PortfolioCMS/1.4"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(settings.PROJECT), **kwargs)

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

    # --- responses and request bodies ----------------------------------------------------
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

    def discard_body(self, limit=16 * 1024 * 1024):
        """Read and drop a rejected request body (bounded) so the client receives our error instead of a broken connection."""
        try: left = min(int(self.headers.get("Content-Length", "0")), limit)
        except ValueError: left = 0
        while left > 0:
            chunk = self.rfile.read(min(65536, left))
            if not chunk: break
            left -= len(chunk)
        self.close_connection = True

    def body(self):
        try:
            parsed = json.loads(self.rfile.read(self.body_length(1_000_000)) or b"{}")
            if not isinstance(parsed, dict): raise ValueError("JSON body must be an object")
            return parsed
        except (ValueError, TypeError, json.JSONDecodeError) as e:
            raise ValueError(str(e) if str(e) == "Request body too large" else "Invalid JSON request") from e

    # --- authorisation guards ------------------------------------------------------------
    def session(self):
        return auth.read_session(self.headers.get("Cookie", ""))

    def require_admin(self):
        """Every route that changes data calls this: signed-in user with the admin role plus the anti-CSRF header."""
        if self.headers.get("X-Portfolio-Action") != "1":
            self.send_json(403, {"error": "Request validation failed."}); return None
        s = self.session()
        if not s:
            self.send_json(401, {"error": "Please sign in again."}); return None
        row = db.admin_by_id(s["user_id"])
        if not row or row["role"] != "admin":
            self.send_json(403, {"error": "Admin permission required."}); return None
        return row

    def require_admin_read(self):
        """Guard for admin routes that only read data: a valid session is enough."""
        s = self.session()
        if not s:
            self.send_json(401, {"error": "Please sign in again."}); return None
        return s
