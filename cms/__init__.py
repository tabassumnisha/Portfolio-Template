# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Portfolio CMS server package (standard library only).

settings        paths, limits and values read from the environment / .env
db              SQLite connection, schema + seed start-up, content storage
auth            password hashing, signed-cookie sessions, sign-in throttling
web             base HTTP handler: security headers, JSON helpers, require_admin()
routes_public   public routes (website data, health, uploaded images)
routes_admin    admin routes (session, content, images, sign-in, password, upload)
app             the request handler that dispatches to the routes, plus start-up
"""
