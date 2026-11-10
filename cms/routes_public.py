# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Public routes (no sign-in): health check, website content, uploaded images. Read-only."""
import json

import uploads
from . import db, settings


def handle_get(h, path):
    """Answer a public GET request. Returns True when the request was handled here."""
    if path == "/api/health":
        h.send_json(200, {"ok": True, "product": "Portfolio CMS"}); return True
    if path == "/api/data":
        h.send_json(200, db.get_content("portfolio")); return True
    if path == "/api/config":
        h.send_json(200, db.get_content("config")); return True
    if path in ("/js/data.js", "/config.js"):
        name, key = ("PortfolioData", "portfolio") if path == "/js/data.js" else ("SITE_CONFIG", "config")
        h.send_bytes(200, ("window." + name + " = " + json.dumps(db.get_content(key), ensure_ascii=False) + ";\n").encode(),
                     "application/javascript; charset=utf-8"); return True
    if path.startswith("/assets/images/"):
        return send_uploaded_image(h, path)
    return False


def send_uploaded_image(h, path):
    """Serve a file the admin uploaded (stored outside Project/, in the data folder)."""
    name = path[len("/assets/images/"):]
    file = settings.upload_dir() / name
    if not uploads.SAFE_NAME_RE.match(name) or (settings.BUNDLED_IMAGES / name).exists() or not file.is_file(): return False
    h.send_bytes(200, file.read_bytes(), uploads.content_type_for(name), {"Cache-Control": "public, max-age=3600"})
    return True
