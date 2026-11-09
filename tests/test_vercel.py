# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Tests for the Vercel deployment: the api/index.py handler, stateless sessions and the public-demo mode.

Run:  python3 -m unittest discover -s tests -v
"""
import http.client
import importlib.util
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.dont_write_bytecode = True

import server  # noqa: E402

PASSWORD = "demo-admin-password-2026"
SETTINGS = ("DATABASE_PATH", "ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET", "COOKIE_SECURE",
            "STATELESS_SESSIONS", "DEMO_MODE", "VERCEL")


class VercelHandlerTests(unittest.TestCase):
    """Runs api/index.py exactly as Vercel does: every request arrives as /api/index?__p=<original path>."""

    @classmethod
    def setUpClass(cls):
        cls.saved = {k: os.environ.get(k) for k in SETTINGS}
        cls.tmp = tempfile.TemporaryDirectory()
        os.environ.update(DATABASE_PATH=str(Path(cls.tmp.name) / "v.sqlite3"), ADMIN_EMAIL="demo@example.com",
                          ADMIN_PASSWORD=PASSWORD, SESSION_SECRET="vercel-secret-" + "y" * 40,
                          COOKIE_SECURE="false", STATELESS_SESSIONS="true", DEMO_MODE="true")
        spec = importlib.util.spec_from_file_location("vercel_entry", ROOT / "api" / "index.py")
        cls.entry = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.entry)          # runs server.initialize() like a cold start
        cls.entry.handler.log_message = lambda *args: None
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), cls.entry.handler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close(); cls.tmp.cleanup()
        for k, v in cls.saved.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v
        server.initialize.__globals__.update(STATELESS_SESSIONS=False, DEMO_MODE=False)

    def setUp(self):
        server.LOGIN_FAILURES.clear()
        self.cookie = None

    def call(self, method, path, body=None):
        """Sends the request the way Vercel's rewrite does: /api/index?__p=<path without leading slash>."""
        path_only, _, query = path.partition("?")
        target = "/api/index?__p=" + path_only + ("&" + query if query else "")
        headers = {"X-Portfolio-Action": "1"}
        if self.cookie: headers["Cookie"] = self.cookie
        data = json.dumps(body).encode() if body is not None else None
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request(method, target, body=data, headers=headers)
        r = conn.getresponse(); payload = r.read()
        cookie = r.getheader("Set-Cookie")
        if cookie and "Max-Age=0" not in cookie: self.cookie = cookie.split(";")[0]
        conn.close()
        try: parsed = json.loads(payload)
        except ValueError: parsed = payload
        return r.status, parsed, r

    def login(self, password=PASSWORD):
        return self.call("POST", "/api/login", {"email": "demo@example.com", "password": password})

    def test_original_path_is_restored(self):
        self.assertEqual(self.call("GET", "/api/health")[1], {"ok": True, "product": "Portfolio CMS"})
        status, body, r = self.call("GET", "/")
        self.assertEqual(status, 200); self.assertIn(b"<html", body.lower())
        self.assertIn("script-src", r.getheader("Content-Security-Policy"))
        self.assertEqual(self.call("GET", "/admin/")[0], 200)
        self.assertEqual(self.call("GET", "/css/base.css")[0], 200)
        self.assertIn(b"window.SITE_CONFIG", self.call("GET", "/config.js")[1])

    def test_private_files_still_not_served(self):
        for path in ("/server.py", "/.env", "/database/schema.sql", "/api/index.py"):
            self.assertEqual(self.call("GET", path)[0], 404, path)

    def test_stateless_session_works_across_instances(self):
        status, _, r = self.login()
        self.assertEqual(status, 200)
        self.assertTrue(r.getheader("Set-Cookie").split("=", 1)[1].startswith("v1_"))
        server.SESSIONS.clear()                       # a different serverless instance knows no in-memory sessions
        self.assertEqual(self.call("GET", "/api/admin/session")[1], {"signedIn": True})
        _, content, _ = self.call("GET", "/api/admin/content")
        self.assertEqual(self.call("PUT", "/api/admin/content/portfolio", content["portfolio"])[0], 200)

    def test_tampered_or_expired_session_is_rejected(self):
        self.login()
        value = self.cookie.split("=", 1)[1]
        sid, sig = value.split(".", 1)
        self.cookie = "portfolio_session=" + sid[:-2] + "AA." + sig
        self.assertEqual(self.call("GET", "/api/admin/session")[1], {"signedIn": False})
        self.assertEqual(self.call("PUT", "/api/admin/content/portfolio", {})[0], 401)
        self.cookie = None
        self.assertEqual(self.call("GET", "/api/admin/content")[0], 401)

    def test_demo_mode_blocks_password_change_only(self):
        self.login()
        status, err, _ = self.call("POST", "/api/admin/password", {"currentPassword": PASSWORD, "newPassword": "x" * 20})
        self.assertEqual(status, 403); self.assertIn("demo", err["error"])
        self.assertEqual(self.login()[0], 200)

    def test_anonymous_still_cannot_change_data(self):
        for method, path in (("PUT", "/api/admin/content/portfolio"), ("PUT", "/api/admin/content/config"),
                             ("POST", "/api/admin/upload"), ("POST", "/api/admin/password")):
            self.assertEqual(self.call(method, path, {})[0], 401, method + " " + path)


class DemoDefaultsTests(unittest.TestCase):
    """DEMO_MODE=true alone (no ADMIN_* or SESSION_SECRET set) gives a working public-demo sign-in; without it nothing is created."""

    def setUp(self):
        self.saved = {k: os.environ.get(k) for k in SETTINGS}
        self.tmp = tempfile.TemporaryDirectory()
        for k in ("ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET", "VERCEL", "STATELESS_SESSIONS"):
            os.environ.pop(k, None)
        os.environ.update(DATABASE_PATH=str(Path(self.tmp.name) / "d.sqlite3"), COOKIE_SECURE="false")

    def tearDown(self):
        for k, v in self.saved.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v
        server.initialize.__globals__.update(STATELESS_SESSIONS=False, DEMO_MODE=False)
        self.tmp.cleanup()

    def request(self, httpd, method, path, body=None, cookie=None):
        conn = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
        headers = {"X-Portfolio-Action": "1"}
        if cookie: headers["Cookie"] = cookie
        conn.request(method, path, body=json.dumps(body).encode() if body is not None else None, headers=headers)
        r = conn.getresponse(); payload = json.loads(r.read() or b"{}"); cookie = r.getheader("Set-Cookie"); conn.close()
        return r.status, payload, (cookie.split(";")[0] if cookie else None)

    def test_demo_mode_alone_enables_the_demo_login(self):
        import demo_defaults
        os.environ["DEMO_MODE"] = "true"
        server.initialize()
        server.Handler.log_message = lambda *args: None
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            server.LOGIN_FAILURES.clear()
            self.assertEqual(self.request(httpd, "POST", "/api/login", {"email": demo_defaults.EMAIL, "password": "wrong-password-123"})[0], 401)
            status, _, cookie = self.request(httpd, "POST", "/api/login", {"email": demo_defaults.EMAIL, "password": demo_defaults.PASSWORD})
            self.assertEqual(status, 200)
            self.assertEqual(self.request(httpd, "GET", "/api/admin/session", cookie=cookie)[1], {"signedIn": True})
            self.assertEqual(self.request(httpd, "POST", "/api/admin/password", {"currentPassword": demo_defaults.PASSWORD, "newPassword": "x" * 20}, cookie)[0], 403)
        finally:
            httpd.shutdown(); httpd.server_close()

    def test_nothing_is_created_without_demo_mode(self):
        import sqlite3
        os.environ["DEMO_MODE"] = "false"
        server.initialize()
        self.assertEqual(server.ADMIN_PASSWORD, "")
        self.assertFalse(server.session_secret_ready())
        con = sqlite3.connect(os.environ["DATABASE_PATH"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM admin_users").fetchone()[0], 0)
        con.close()

    def test_placeholder_values_do_not_block_demo_defaults(self):
        os.environ.update(DEMO_MODE="true", ADMIN_PASSWORD="CHANGE_ME_USE_A_UNIQUE_LONG_PASSWORD", SESSION_SECRET="CHANGE_ME_GENERATE_AT_LEAST_32_RANDOM_BYTES")
        server.initialize()
        self.assertTrue(server.session_secret_ready())
        self.assertFalse(server.ADMIN_PASSWORD.startswith("CHANGE_ME"))


class VercelConfigTests(unittest.TestCase):
    def test_vercel_json_routes_everything_to_the_function(self):
        cfg = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
        self.assertEqual(cfg["rewrites"], [{"source": "/(.*)", "destination": "/api/index?__p=/$1"}])
        include = cfg["functions"]["api/index.py"]["includeFiles"]
        for needed in ("server.py", "validation.py", "uploads.py", "demo_defaults.py", "Project/**", "database/**"):
            self.assertIn(needed, include)


if __name__ == "__main__":
    unittest.main()
