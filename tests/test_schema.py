# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Tests for what a marketplace reviewer checks: the schema, the .env.example, the repository layout and the Vercel demo.

Run:  python3 -m unittest discover -s tests -v
"""
import http.client
import importlib.util
import json
import os
import re
import sqlite3
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


def build_database():
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    schema = (ROOT / "database/schema.sql").read_text(encoding="utf-8")
    con.executescript(schema)
    con.executescript(schema)                      # idempotent: a second run must not fail
    con.executescript((ROOT / "database/seed.sql").read_text(encoding="utf-8"))
    return con


class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.con = build_database()

    def test_every_required_table_exists(self):
        tables = {r["name"] for r in self.con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for needed in ("profile", "photos", "projects", "services", "skills", "contacts", "admin_users", "app_content"):
            self.assertIn(needed, tables)
        self.assertNotIn("sessions", tables)       # sessions are signed cookies; schema.sql documents why

    def test_lookup_columns_are_indexed(self):
        indexed = set()
        for r in self.con.execute("SELECT name FROM sqlite_master WHERE type='table'"):
            for idx in self.con.execute(f"PRAGMA index_list({r['name']})"):
                for col in self.con.execute(f"PRAGMA index_info({idx['name']})"):
                    indexed.add((r["name"], col["name"]))
        for pair in (("profile", "slug"), ("photos", "owner_id"), ("contacts", "owner_id"), ("projects", "category_id")):
            self.assertIn(pair, indexed)

    def test_foreign_keys_are_enforced(self):
        self.assertEqual(self.con.execute("PRAGMA foreign_key_check").fetchall(), [])
        with self.assertRaises(sqlite3.IntegrityError):
            self.con.execute("INSERT INTO photos(owner_id,slot,file_name,alt_text) VALUES (999,'hero','x.jpg','x')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.con.execute("DELETE FROM categories WHERE id='branding'")   # still has projects: RESTRICT

    def test_seed_data_has_no_real_data_or_secrets(self):
        text = (ROOT / "database/seed.sql").read_text(encoding="utf-8").lower()
        for forbidden in ("password", "secret", "pbkdf2", "@gmail", "@yahoo", "@outlook"):
            self.assertNotIn(forbidden, text)
        emails = {r["value"] for r in self.con.execute("SELECT value FROM contacts WHERE kind='email'")}
        self.assertEqual(emails, {"hello@example.com"})


class RepositoryLayoutTests(unittest.TestCase):
    def test_env_example_lists_every_variable_the_server_reads(self):
        read = set()
        for name in ("server.py", "uploads.py", "validation.py", "demo_defaults.py", "api/index.py"):
            read |= set(re.findall(r'os\.(?:getenv|environ\.get)\(\s*"([A-Z_]+)"', (ROOT / name).read_text(encoding="utf-8")))
        listed = set(re.findall(r"^#?\s*([A-Z][A-Z_]+)=", (ROOT / ".env.example").read_text(encoding="utf-8"), re.M))
        self.assertTrue(read)
        self.assertEqual(read - listed, set(), "variables read by the code but missing from .env.example")

    def test_env_example_holds_placeholders_only(self):
        text = (ROOT / ".env.example").read_text(encoding="utf-8")
        self.assertIn("CHANGE_ME", text)
        self.assertNotIn("Demo-Admin", text)       # the demo password lives only in demo_defaults.py and the docs

    def test_exactly_one_example_config_and_no_junk_folders(self):
        self.assertEqual(sorted(p.name for p in ROOT.glob(".env*") if p.name != ".env"), [".env.example"])
        for junk in ("node_modules", ".venv", "dist", "build"):
            self.assertFalse((ROOT / junk).exists(), junk)

    def test_no_static_file_at_the_root_can_hide_the_server_on_vercel(self):
        """Vercel serves a static file before it applies a rewrite: a root index.html once replaced the whole demo with a redirect page."""
        self.assertFalse((ROOT / "index.html").exists())
        config = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
        self.assertEqual(config["rewrites"][0]["destination"], "/api/index?__p=/$1")

    def test_required_documents_exist(self):
        for name in ("README.md", "HowToSetup.md", "CLAUDE.md", "CHANGELOG.md", "LICENSE-NOTE.md", "requirements.txt",
                     "vercel.json", "docker-compose.yml", "Dockerfile", "database/schema.sql", "database/seed.sql"):
            self.assertTrue((ROOT / name).is_file(), name)
        self.assertIn("## [1.0.0]", (ROOT / "CHANGELOG.md").read_text(encoding="utf-8"))
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for needed in ("designers", "demo@example.com", "https://", "screenshots/"):
            self.assertIn(needed, readme)


class DemoOnlyVercelTests(unittest.TestCase):
    """The marketplace demo: Vercel with ONLY DEMO_MODE=true. Sign-in must work and the sample portfolio must load."""
    NAMES = ("DATABASE_PATH", "ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET", "COOKIE_SECURE", "STATELESS_SESSIONS", "DEMO_MODE", "VERCEL")

    @classmethod
    def setUpClass(cls):
        cls.saved = {k: os.environ.get(k) for k in cls.NAMES}
        for k in cls.NAMES:
            os.environ.pop(k, None)
        cls.tmp = tempfile.TemporaryDirectory()
        os.environ.update(VERCEL="1", DEMO_MODE="true", DATABASE_PATH=str(Path(cls.tmp.name) / "demo.sqlite3"), COOKIE_SECURE="false")
        spec = importlib.util.spec_from_file_location("vercel_demo_entry", ROOT / "api" / "index.py")
        entry = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(entry)
        entry.handler.log_message = lambda *args: None
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), entry.handler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close(); cls.tmp.cleanup()
        for k, v in cls.saved.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v
        server.STATELESS_SESSIONS = False; server.DEMO_MODE = False

    def call(self, method, path, body=None, cookie=None):
        target = "/api/index?__p=" + path
        headers = {"X-Portfolio-Action": "1"}
        if cookie: headers["Cookie"] = cookie
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request(method, target, body=json.dumps(body).encode() if body is not None else None, headers=headers)
        r = conn.getresponse(); data = r.read(); conn.close()
        return r.status, data, r

    def test_root_serves_the_real_website_not_a_redirect_page(self):
        status, body, _ = self.call("GET", "")
        self.assertEqual(status, 200)
        self.assertNotIn(b"http-equiv=\"refresh\"", body.lower())
        self.assertIn(b"data-bind", body)

    def test_sample_data_loads(self):
        status, body, _ = self.call("GET", "api/data")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(len(data["projects"]), 6)

    def test_demo_sign_in_works_and_admin_content_is_reachable(self):
        server.LOGIN_FAILURES.clear()
        status, _, r = self.call("POST", "api/login", {"email": "demo@example.com", "password": "Demo-Admin-2026!"})
        self.assertEqual(status, 200)
        cookie = r.getheader("Set-Cookie").split(";")[0]
        server.SESSIONS.clear()
        status, body, _ = self.call("GET", "api/admin/content", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertIn("portfolio", json.loads(body))
        self.assertEqual(self.call("GET", "api/admin/content")[0], 401)     # without the cookie: refused

    def test_wrong_demo_password_is_refused(self):
        server.LOGIN_FAILURES.clear()
        self.assertEqual(self.call("POST", "api/login", {"email": "demo@example.com", "password": "wrong-password-123"})[0], 401)


if __name__ == "__main__":
    unittest.main()
