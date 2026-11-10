# CLAUDE.md

Guidance for AI coding tools (Claude Code, Copilot, Cursor, etc.) working on this repository.

## What this is
**Responsive Creative Portfolio CMS**: a portfolio website plus an admin panel. Backend = Python standard library (`http.server`, `sqlite3`, `hashlib`) in the `cms/` package; frontend = vanilla HTML/CSS/JS. **No pip or npm packages, no build step, no CDN, no analytics.** Keep it that way. Requires Python >= 3.10.

## Architecture and folder map
```text
demo_defaults.py   public demo sign-in, used only with DEMO_MODE=true
server.py          entry point only (python3 server.py): starts cms.app; re-exports a few names for api/index.py and the tests
cms/               the server, one module per concern (each under 150 lines):
  settings.py      paths, limits, values read from the environment / .env (read as settings.NAME at call time)
  db.py            data layer: connection, schema + seed start-up, content storage, admin queries (bound parameters only)
  auth.py          password hashing, signed-cookie sessions, sign-in throttling (no database access)
  web.py           base handler: security headers (CSP), JSON helpers, body limits, require_admin() / require_admin_read()
  routes_public.py public GET routes: health, data, config, uploaded images
  routes_admin.py  admin routes: session, content, images, login/logout, password, upload (PUT/POST call require_admin())
  app.py           Handler (dispatch to the routes), initialize(), main()
validation.py      portfolio_error() / config_error(): the only place content rules live
uploads.py         image type by file signature, safe names, size limit
Project/           static files served at /
  index.html       the website; contains NO personal data (content comes from /config.js and /js/data.js)
  config.js        static fallback config (used only when hosted without the server)
  css/ base, layout, components, responsive    (load order in index.html)
  js/  data.js (static fallback), utils, content, gallery, services, nav, whatsapp-inquiry, effects, main
  admin/           admin panel: index.html, admin.css, core.js (helpers, API), editors.js (one editor per section), main.js
  assets/images/   original placeholder artwork
database/          schema.sql (creates everything from scratch, idempotent; no sessions table, sessions are signed cookies), seed.sql (demo rows), default-portfolio.json, default-config.json
tests/             test_server.py, test_vercel.py, test_schema.py (unittest: validation, auth, CSRF, uploads, throttling, Vercel handler, schema, repository layout)
docs/              customisation.md, architecture.md, api-reference.md, ERD.md, security.md, screenshots
AGENTS.md, requirements.txt   short pointer for other AI tools; "no third-party dependencies" declaration
api/index.py       Vercel entry: restores the original path from ?__p= and reuses server.Handler (vercel.json rewrites everything to it)
Dockerfile, docker-compose.yml, .env.example, vercel.json
```
New Python modules must be added to the `Dockerfile` (`COPY`) and to `includeFiles` in `vercel.json` (a test checks the latter).
Runtime content lives as JSON in the SQLite table `app_content` (keys `portfolio`, `config`); the server renders it at `/js/data.js` and `/config.js`. The relational tables are demo/reference data.

## Rules that must not be broken
- Every route that creates, updates or deletes data calls `require_admin()` (in `cms/routes_admin.py`; `tests/test_schema.py` checks it) (session + admin role + `X-Portfolio-Action` header). Public POST routes: only `/api/login` and `/api/logout`.
- SQL: bound parameters only, and only in `cms/db.py`. Never build SQL from request data. There is no DELETE statement (a test checks this).
- New editable field: update `validation.py`, `database/default-*.json`, the editor in `Project/admin/editors.js`, the public use (`Project/js/content.js`, `data-bind="…"` in `index.html`), `Project/config.js` / `Project/js/data.js` fallbacks, docs and tests.
- New table/column: edit `database/schema.sql` (idempotent) and add a guarded migration in `initialize()` for existing installs.
- Never `innerHTML` with data (use `textContent` / `Admin.h()` / `Portfolio.el()`); external URLs go through `Portfolio.safeUrl()`.
- No inline scripts or inline event handlers (CSP `script-src 'self'`; the one allowed inline snippet in `index.html` is pinned by hash in `cms/web.py`: update the hash if you change it).
- Never log or return password hashes or session tokens; never ship real credentials. Placeholders only: `+10000000000`, `hello@example.com`, `https://example.com/…`. The only exception is the public demo sign-in in `demo_defaults.py`, used solely when `DEMO_MODE=true`; never use it elsewhere.
- Accessibility is required: landmarks, labels, alt text, keyboard operation, visible focus, `prefers-reduced-motion`.
- Keep files small; one file per feature. Media queries for the website go in `css/responsive.css`.
- Update `CHANGELOG.md` for every user-visible change and keep the docs in sync.

- Never put a static file (`index.html`, `robots.txt`, …) at the repository root: Vercel serves static files before the rewrite in `vercel.json`, which hides the server (`tests/test_schema.py` checks this).
- Every variable the code reads must be listed in `.env.example` (checked by a test).
- On Vercel (`VERCEL` set) the database lives in `/tmp` and sessions are stateless signed cookies (`STATELESS_SESSIONS`); keep both code paths working and tested (`tests/test_vercel.py`).

## Commands
```bash
cp .env.example .env                          # set ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET
python3 server.py                             # http://127.0.0.1:8080  (admin: /admin/)
python3 -m unittest discover -s tests -v      # must pass before every release
docker compose up --build -d                  # Docker alternative
```
Manual check after UI changes: website at 1440, 1024, 820, 560 and 390 px; admin at 390 px and desktop; keyboard-only through the filter buttons, contact form and admin forms.
