# CLAUDE.md

Guidance for AI coding tools (Claude Code, Copilot, Cursor, etc.) working on this repository.

## What this is
**Responsive Creative Portfolio CMS**: a portfolio website plus an admin panel. Backend = Python standard library (`http.server`, `sqlite3`, `hashlib`) in `server.py`; frontend = vanilla HTML/CSS/JS. **No pip or npm packages, no build step, no CDN, no analytics.** Keep it that way. Requires Python >= 3.10.

## Architecture and folder map
```text
server.py          entry point (python3 server.py): HTTP handler, routes, sessions, sign-in, uploads, DB init
validation.py      portfolio_error() / config_error(): the only place content rules live
uploads.py         image type by file signature, safe names, size limit
Project/           static files served at /
  index.html       the website; contains NO personal data (content comes from /config.js and /js/data.js)
  config.js        static fallback config (used only when hosted without the server)
  css/ base, layout, components, responsive    (load order in index.html)
  js/  data.js (static fallback), utils, content, gallery, services, nav, whatsapp-inquiry, effects, main
  admin/           admin panel: index.html, admin.css, core.js (helpers, API), editors.js (one editor per section), main.js
  assets/images/   original placeholder artwork
database/          schema.sql (creates everything from scratch, idempotent), seed.sql (demo rows), default-portfolio.json, default-config.json
tests/             test_server.py (unittest: validation, auth, CSRF, uploads, throttling)
docs/              customisation.md, api.md, screenshots
Dockerfile, docker-compose.yml, .env.example
```
Runtime content lives as JSON in the SQLite table `app_content` (keys `portfolio`, `config`); the server renders it at `/js/data.js` and `/config.js`. The relational tables are demo/reference data.

## Rules that must not be broken
- Every route that creates, updates or deletes data calls `require_admin()` (session + admin role + `X-Portfolio-Action` header). Public POST routes: only `/api/login` and `/api/logout`.
- SQL: bound parameters only. Never build SQL from request data.
- New editable field: update `validation.py`, `database/default-*.json`, the editor in `Project/admin/editors.js`, the public use (`Project/js/content.js`, `data-bind="…"` in `index.html`), `Project/config.js` / `Project/js/data.js` fallbacks, docs and tests.
- New table/column: edit `database/schema.sql` (idempotent) and add a guarded migration in `initialize()` for existing installs.
- Never `innerHTML` with data (use `textContent` / `Admin.h()` / `Portfolio.el()`); external URLs go through `Portfolio.safeUrl()`.
- No inline scripts or inline event handlers (CSP `script-src 'self'`; the one allowed inline snippet in `index.html` is pinned by hash in `server.py`: update the hash if you change it).
- Never log or return password hashes or session tokens; never ship real credentials. Placeholders only: `+10000000000`, `hello@example.com`, `https://example.com/…`.
- Accessibility is required: landmarks, labels, alt text, keyboard operation, visible focus, `prefers-reduced-motion`.
- Keep files small; one file per feature. Media queries for the website go in `css/responsive.css`.
- Update `CHANGELOG.md` for every user-visible change and keep the docs in sync.

## Commands
```bash
cp .env.example .env                          # set ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET
python3 server.py                             # http://127.0.0.1:8080  (admin: /admin/)
python3 -m unittest discover -s tests -v      # must pass before every release
docker compose up --build -d                  # Docker alternative
```
Manual check after UI changes: website at 1440, 1024, 820, 560 and 390 px; admin at 390 px and desktop; keyboard-only through the filter buttons, contact form and admin forms.
