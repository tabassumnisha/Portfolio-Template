# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Tests: validation rules, password hashing, upload detection and the HTTP API (sign-in, roles, CSRF, uploads).

Run:  python3 -m unittest discover -s tests -v
"""
import copy
import http.client
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.dont_write_bytecode = True

import server  # noqa: E402
import uploads  # noqa: E402
import validation  # noqa: E402

PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000" "1f15c4890000000d49444154789c6360f8cfc0f01f0005000100a5f645400000000049454e44ae426082")
PASSWORD = "a-long-test-password-123"


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.portfolio, self.config = server.load_defaults()

    def test_default_content_is_valid(self):
        self.assertIsNone(validation.portfolio_error(self.portfolio))
        self.assertIsNone(validation.config_error(self.config))

    def test_portfolio_rules(self):
        def broken(change):
            p = copy.deepcopy(self.portfolio); change(p); return validation.portfolio_error(p)
        self.assertTrue(broken(lambda p: p["projects"][0].update(image="../secret.txt")))
        self.assertTrue(broken(lambda p: p["projects"][0].update(image="a/b.jpg")))
        self.assertTrue(broken(lambda p: p["projects"][0].update(category="missing")))
        self.assertTrue(broken(lambda p: p["projects"][1].update(id=p["projects"][0]["id"])))
        self.assertTrue(broken(lambda p: p["skills"][0].update(level=101)))
        self.assertTrue(broken(lambda p: p["skills"][0].update(level=True)))
        self.assertTrue(broken(lambda p: p["services"][0].update(icon="i-evil")))
        self.assertTrue(broken(lambda p: p.update(featuredProjectId="nope")))
        self.assertTrue(broken(lambda p: p.update(extra="field")))
        self.assertTrue(broken(lambda p: p["projects"][0].update(title="x" * 81)))

    def test_config_rules(self):
        def broken(change):
            c = copy.deepcopy(self.config); change(c); return validation.config_error(c)
        self.assertTrue(broken(lambda c: c["social"].update(x="javascript:alert(1)")))
        self.assertTrue(broken(lambda c: c["contact"].update(email="not-an-email")))
        self.assertTrue(broken(lambda c: c["contact"].update(whatsappNumber="call me")))
        self.assertTrue(broken(lambda c: c["images"].update(hero="../../etc/passwd")))
        self.assertTrue(broken(lambda c: c["owner"].update(name="")))
        self.assertTrue(broken(lambda c: c.update(secret={"a": 1})))
        self.assertTrue(broken(lambda c: c.update(extraLinks=[{"label": "x", "url": "ftp://x"}])))


class DatabaseScriptTests(unittest.TestCase):
    def test_schema_and_seed_build_a_clean_database_matching_default_content(self):
        import sqlite3
        con = sqlite3.connect(":memory:")
        con.execute("PRAGMA foreign_keys=ON")
        root = Path(__file__).resolve().parents[1]
        con.executescript((root / "database/schema.sql").read_text(encoding="utf-8"))
        con.executescript((root / "database/seed.sql").read_text(encoding="utf-8"))
        self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(), [])
        portfolio, _ = server.load_defaults()
        for table, key in (("categories", "categories"), ("projects", "projects"), ("services", "services"),
                           ("skills", "skills"), ("other_skills", "otherSkills")):
            self.assertEqual(con.execute("SELECT COUNT(*) FROM " + table).fetchone()[0], len(portfolio[key]), table)


class HelperTests(unittest.TestCase):
    def test_password_hash_and_verify(self):
        stored = server.password_hash(PASSWORD)
        self.assertTrue(server.password_ok(PASSWORD, stored))
        self.assertFalse(server.password_ok("wrong-password", stored))
        self.assertNotIn(PASSWORD, stored)

    def test_image_type_detection_uses_file_signature(self):
        self.assertEqual(uploads.detect_extension(PNG), "png")
        self.assertEqual(uploads.detect_extension(b"\xff\xd8\xff\xe0abc"), "jpg")
        self.assertEqual(uploads.detect_extension(b"RIFF\x00\x00\x00\x00WEBPVP8 "), "webp")
        self.assertEqual(uploads.detect_extension(b"GIF89a...."), "gif")
        self.assertIsNone(uploads.detect_extension(b"<html><script>alert(1)</script>"))
        self.assertIsNone(uploads.detect_extension(b"MZ\x90\x00 fake.png"))


class ApiTests(unittest.TestCase):
    """Starts the real server on a free port with a temporary database."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        os.environ.update(DATABASE_PATH=str(Path(cls.tmp.name) / "t.sqlite3"), ADMIN_EMAIL="admin@example.com",
                          ADMIN_PASSWORD=PASSWORD, SESSION_SECRET="test-secret-" + "x" * 40, COOKIE_SECURE="false")
        server.initialize()
        server.Handler.log_message = lambda *args: None
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close(); cls.tmp.cleanup()

    def setUp(self):
        server.LOGIN_FAILURES.clear()
        self.cookie = None

    def call(self, method, path, body=None, action=True, raw=None, ctype="application/json"):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        headers = {}
        if self.cookie: headers["Cookie"] = self.cookie
        if action: headers["X-Portfolio-Action"] = "1"
        data = raw
        if body is not None: data = json.dumps(body).encode()
        if data is not None: headers["Content-Type"] = ctype
        conn.request(method, path, body=data, headers=headers)
        r = conn.getresponse(); payload = r.read()
        set_cookie = r.getheader("Set-Cookie")
        if set_cookie and "Max-Age=0" not in set_cookie: self.cookie = set_cookie.split(";")[0]
        conn.close()
        try: parsed = json.loads(payload)
        except ValueError: parsed = payload
        return r.status, parsed, r

    def login(self, password=PASSWORD):
        return self.call("POST", "/api/login", {"email": "admin@example.com", "password": password})

    # --- public ---
    def test_public_site_and_content(self):
        self.assertEqual(self.call("GET", "/api/health")[0], 200)
        status, _, r = self.call("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("script-src", r.getheader("Content-Security-Policy"))
        status, data, _ = self.call("GET", "/api/data")
        self.assertEqual(status, 200); self.assertTrue(data["projects"])
        self.assertIn(b"window.SITE_CONFIG", self.call("GET", "/config.js")[1])

    def test_admin_page_has_strict_csp(self):
        status, _, r = self.call("GET", "/admin/")
        self.assertEqual(status, 200)
        self.assertNotIn("unsafe-inline", r.getheader("Content-Security-Policy"))

    def test_private_files_are_not_served(self):
        for path in ("/server.py", "/.env", "/data/t.sqlite3", "/../server.py", "/%2e%2e/server.py", "/database/schema.sql"):
            self.assertEqual(self.call("GET", path)[0], 404, path)

    # --- authentication and roles ---
    def test_anonymous_cannot_read_or_change_admin_data(self):
        self.assertEqual(self.call("GET", "/api/admin/content")[0], 401)
        self.assertEqual(self.call("GET", "/api/admin/images")[0], 401)
        for method, path in (("PUT", "/api/admin/content/portfolio"), ("PUT", "/api/admin/content/config"),
                             ("POST", "/api/admin/upload"), ("POST", "/api/admin/password")):
            status = self.call(method, path, {})[0]
            self.assertEqual(status, 401, method + " " + path)
        self.assertEqual(self.call("PUT", "/api/admin/content/portfolio", {}, action=False)[0], 403)

    def test_wrong_password_rejected_and_login_works(self):
        self.assertEqual(self.login("wrong")[0], 401)
        status, data, r = self.login()
        self.assertEqual(status, 200)
        cookie = r.getheader("Set-Cookie")
        self.assertIn("HttpOnly", cookie); self.assertIn("SameSite=Strict", cookie)
        self.assertNotIn("password_hash", json.dumps(data))
        self.assertEqual(self.call("GET", "/api/admin/session")[1], {"signedIn": True})

    def test_missing_csrf_header_is_refused_even_when_signed_in(self):
        self.login()
        _, content, _ = self.call("GET", "/api/admin/content")
        self.assertEqual(self.call("PUT", "/api/admin/content/portfolio", content["portfolio"], action=False)[0], 403)
        self.assertEqual(self.call("POST", "/api/admin/password", {}, action=False)[0], 403)

    # --- content ---
    def test_save_valid_content_and_reject_invalid(self):
        self.login()
        _, content, _ = self.call("GET", "/api/admin/content")
        portfolio = content["portfolio"]
        portfolio["projects"][0]["title"] = "Saved By Test"
        self.assertEqual(self.call("PUT", "/api/admin/content/portfolio", portfolio)[0], 200)
        self.assertEqual(self.call("GET", "/api/data")[1]["projects"][0]["title"], "Saved By Test")
        self.assertIn(b"Saved By Test", self.call("GET", "/js/data.js")[1])
        portfolio["skills"][0]["level"] = 500
        status, err, _ = self.call("PUT", "/api/admin/content/portfolio", portfolio)
        self.assertEqual(status, 400); self.assertIn("error", err)
        self.assertEqual(self.call("PUT", "/api/admin/content/nope", {})[0], 404)

    def test_config_save(self):
        self.login()
        config = self.call("GET", "/api/admin/content")[1]["config"]
        config["owner"]["name"] = "Test Owner"
        self.assertEqual(self.call("PUT", "/api/admin/content/config", config)[0], 200)
        self.assertEqual(self.call("GET", "/api/config")[1]["owner"]["name"], "Test Owner")

    # --- uploads ---
    def test_upload_accepts_real_images_only(self):
        self.login()
        status, data, _ = self.call("POST", "/api/admin/upload", raw=PNG, ctype="image/png")
        self.assertEqual(status, 201)
        name = data["file"]
        self.assertRegex(name, r"^upload-[0-9a-f]{16}\.png$")
        status, body, r = self.call("GET", "/assets/images/" + name)
        self.assertEqual(status, 200); self.assertEqual(r.getheader("Content-Type"), "image/png"); self.assertEqual(body, PNG)
        self.assertIn(name, self.call("GET", "/api/admin/images")[1]["images"])
        self.assertEqual(self.call("POST", "/api/admin/upload", raw=b"<script>alert(1)</script>", ctype="image/png")[0], 400)
        self.assertEqual(self.call("POST", "/api/admin/upload", raw=PNG + b"0" * uploads.MAX_UPLOAD_BYTES, ctype="image/png")[0], 413)
        self.assertEqual(self.call("GET", "/assets/images/..%2f..%2fserver.py")[0], 404)

    # --- password and logout ---
    def test_logout_ends_session(self):
        self.login()
        self.assertEqual(self.call("POST", "/api/logout", {})[0], 200)
        self.cookie = None
        self.assertEqual(self.call("GET", "/api/admin/content")[0], 401)

    def test_password_change(self):
        self.login()
        self.assertEqual(self.call("POST", "/api/admin/password", {"currentPassword": "wrong", "newPassword": "x" * 20})[0], 401)
        self.assertEqual(self.call("POST", "/api/admin/password", {"currentPassword": PASSWORD, "newPassword": "short"})[0], 400)
        new = "another-long-password-456"
        self.assertEqual(self.call("POST", "/api/admin/password", {"currentPassword": PASSWORD, "newPassword": new})[0], 200)
        self.assertEqual(self.login(PASSWORD)[0], 401)
        self.assertEqual(self.login(new)[0], 200)
        self.assertEqual(self.call("POST", "/api/admin/password", {"currentPassword": new, "newPassword": PASSWORD})[0], 200)

    def test_zz_sign_in_is_throttled(self):
        for _ in range(server.LOGIN_MAX_FAILURES):
            self.assertEqual(self.login("wrong-password")[0], 401)
        self.assertEqual(self.login(PASSWORD)[0], 429)


if __name__ == "__main__":
    unittest.main()
