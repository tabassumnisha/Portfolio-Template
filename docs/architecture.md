# Architecture

Portfolio CMS is a small, dependency-free web application: a public portfolio website plus an admin panel for the site owner.
Python standard library on the server, plain HTML, CSS and JavaScript in the browser. No pip or npm packages, no build step.

## Components

| Part | Files | Responsibility |
|---|---|---|
| HTTP server | `server.py` | Routing, static files, JSON API, sign-in and sessions, uploads, database start-up, security headers |
| Validation | `validation.py` | The only place content rules live: `portfolio_error()` and `config_error()` |
| Uploads | `uploads.py` | Detects the real image type from the file signature, builds safe random file names, enforces the 3 MB limit |
| Website | `Project/index.html`, `css/`, `js/` | Public site; text and images come from `/config.js` and `/js/data.js` |
| Admin panel | `Project/admin/` | Form-based editors (`editors.js`), API helpers (`core.js`), start-up (`main.js`) |
| Database | `database/schema.sql`, `seed.sql`, `default-*.json` | SQLite schema, demo rows and the initial content |
| Vercel entry | `api/index.py`, `vercel.json` | Runs the same server as one serverless function |
| Demo sign-in | `demo_defaults.py` | Public demo account, used only when `DEMO_MODE=true` |

## How a request flows

```text
Browser ──► server.py Handler ──► static file from Project/            (GET /, /css/..., /js/..., /admin/)
                              ├─► rendered content from SQLite         (GET /config.js, /js/data.js, /api/data, /api/config)
                              ├─► sign-in                              (POST /api/login, /api/logout)
                              └─► admin API, signed-in admin only      (GET /api/admin/session|content|images,
                                                                        PUT /api/admin/content/<portfolio|config>,
                                                                        POST /api/admin/upload|password)
```

1. The website loads `/config.js` and `/js/data.js`. The server builds both from the JSON stored in the SQLite table `app_content`
   (keys `portfolio` and `config`). Without the server (static hosting) the files in `Project/` act as a fallback.
2. `Project/js/content.js` writes that content into the page (`data-bind` attributes, `textContent` only).
3. The admin panel reads and writes the same two JSON documents through the admin API. Every write is validated by `validation.py` before it is stored.
4. Uploaded images are stored under random names in the data folder and served from `/assets/images/`.

## Data model

- `app_content(key, value)`: the live content of the site as JSON (`portfolio`, `config`). This is what the website shows.
- `admin_users`: administrator accounts with salted PBKDF2-HMAC-SHA256 password hashes.
- `categories`, `projects`, `services`, `skills`, `other_skills`, `site_settings`: relational demo and reference tables that mirror the default content
  (`projects.category_id` references `categories` with `ON UPDATE CASCADE ON DELETE RESTRICT`). The running site reads `app_content`, not these tables.

`database/schema.sql` creates everything from an empty database and is safe to run repeatedly.

## Sessions and security

- **Sign-in:** e-mail and password, constant-time comparison, 8 failed attempts per 5 minutes per address are throttled.
- **Session:** a signed `HttpOnly`, `SameSite=Strict` cookie, valid for 8 hours. On a normal server the session is kept in memory.
  On serverless hosting (`STATELESS_SESSIONS`, automatic on Vercel) the cookie itself carries the user and the expiry and is verified by its HMAC signature.
- **Authorisation:** every route that creates, updates or deletes data calls `require_admin()`: valid session, admin role and the `X-Portfolio-Action` header (CSRF protection).
- **Output safety:** a strict Content-Security-Policy (`script-src 'self'`), `nosniff`, frame and referrer headers; data is rendered with `textContent`, never `innerHTML`.
- **Database:** bound SQL parameters only.

## Deployment modes

| Mode | How | Storage |
|---|---|---|
| VPS or any host | `python3 server.py` | SQLite file in `data/` |
| Docker | `docker compose up --build -d` | Named volume `portfolio_data` |
| Vercel (demo) | `api/index.py` + `vercel.json` | `/tmp`, rebuilt on a cold start, so changes are temporary |

See `HowToSetup.md` for the steps and `docs/api-reference.md` for the API.

## Extending

Add a new editable field in this order: `validation.py`, `database/default-*.json`, the editor in `Project/admin/editors.js`,
its use in `Project/js/content.js` and `index.html`, the static fallbacks, the docs and a test. `CLAUDE.md` lists the rules that must not be broken.
