#!/usr/bin/env python3
# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Portfolio CMS entry point: python3 server.py

The code lives in the cms/ package (settings, db, auth, web, routes_public, routes_admin, app).
Public site: Project/ (served at /). Admin panel: Project/admin/ (served at /admin/).
Every route that changes data requires a signed-in admin and the X-Portfolio-Action header.
"""
from cms.app import Handler, initialize, main  # noqa: F401 (Handler and initialize are also used by api/index.py and the tests)
from cms.auth import LOGIN_FAILURES, SESSIONS, password_hash, password_ok  # noqa: F401
from cms.db import load_defaults  # noqa: F401
from cms.settings import LOGIN_MAX_FAILURES, session_secret_ready  # noqa: F401

if __name__ == "__main__":
    main()
