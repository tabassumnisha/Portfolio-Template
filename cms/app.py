# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""The request handler (dispatches to the route modules) and server start-up."""
import urllib.parse
from http.server import ThreadingHTTPServer

from . import db, routes_admin, routes_public, settings
from .web import BaseHandler


class Handler(BaseHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if routes_public.handle_get(self, path) or routes_admin.handle_get(self, path): return
        if path == "/": self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        routes_admin.handle_post(self, urllib.parse.urlparse(self.path).path)

    def do_PUT(self):
        routes_admin.handle_put(self, urllib.parse.urlparse(self.path).path)


def initialize():
    """Read settings, create the database from scratch if needed, seed demo content, create the first admin."""
    settings.load_from_environment()
    db.initialize_database()
    settings.upload_dir().mkdir(parents=True, exist_ok=True)
    if not settings.session_secret_ready():
        print("WARNING: SESSION_SECRET is not configured. Admin sign-in is disabled until you set a unique secret in .env.")


def main():
    initialize()
    print("Portfolio CMS running at http://%s:%d (admin: /admin/)" % (settings.HOST, settings.PORT))
    ThreadingHTTPServer((settings.HOST, settings.PORT), Handler).serve_forever()
