# API reference

JSON over HTTP. Public routes need no sign-in. Every route that changes data needs a signed-in administrator **and** the request header `X-Portfolio-Action: 1` (anti-CSRF check); the session cookie is `HttpOnly` and `SameSite=Strict`.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /api/health` | public | `{"ok": true}` for uptime checks |
| `GET /api/data` | public | portfolio content (categories, projects, services, skills) |
| `GET /api/config` | public | site profile, contact, social links, page texts |
| `GET /js/data.js`, `GET /config.js` | public | the same content as scripts for the website |
| `GET /assets/images/<file>` | public | bundled and uploaded images |
| `POST /api/login` | public, throttled | body `{"email","password"}`; sets the session cookie |
| `POST /api/logout` | public | ends the session |
| `GET /api/admin/session` | public | `{"signedIn": true/false}` |
| `GET /api/admin/content` | admin | portfolio and config for the editor |
| `GET /api/admin/images` | admin | names of bundled and uploaded images |
| `PUT /api/admin/content/portfolio` | admin | replace the portfolio content (validated) |
| `PUT /api/admin/content/config` | admin | replace the site configuration (validated) |
| `POST /api/admin/upload` | admin | raw image body (JPG, PNG, WebP or GIF, 3 MB maximum, type checked by file signature); returns `{"file": "upload-….png"}` |
| `POST /api/admin/password` | admin | body `{"currentPassword","newPassword"}` (14+ characters) |

Errors are `{"error": "message"}` with status 400 (invalid data), 401 (not signed in), 403 (missing role or header), 413 (too large), 429 (too many sign-in attempts).

Validation rules (see `validation.py`): unknown fields are rejected; ids use lowercase letters, numbers and dashes; project images are plain file names (no folders); every project needs an existing category; skill levels are whole numbers 0-100; links must start with `http://` or `https://`.
