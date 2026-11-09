# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Vercel entry point: serves the whole Portfolio CMS (website, admin panel and /api/*) from one Python function.

vercel.json rewrites every request to this function and passes the original path in the __p query parameter.
The real logic lives in server.py; this file only restores the path and exposes the handler Vercel looks for.
Vercel's filesystem is read-only except /tmp, so the demo database is rebuilt on every cold start (see HowToSetup.md, section C).
"""
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402

server.initialize()


class handler(server.Handler):
    def restore_path(self):
        parts = urllib.parse.urlsplit(self.path)
        query = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
        original = [value for key, value in query if key == "__p"]
        if not original:
            return
        rest = urllib.parse.urlencode([(k, v) for k, v in query if k != "__p"])
        self.path = "/" + original[0].lstrip("/") + ("?" + rest if rest else "")

    def do_GET(self):
        self.restore_path(); super().do_GET()

    def do_HEAD(self):
        self.restore_path(); super().do_HEAD()

    def do_POST(self):
        self.restore_path(); super().do_POST()

    def do_PUT(self):
        self.restore_path(); super().do_PUT()
