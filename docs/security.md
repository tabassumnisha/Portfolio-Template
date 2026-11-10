# Security review notes

Where each rule is enforced, so a reviewer can verify it quickly. Tests: `python3 -m unittest discover -s tests -v`.

## Ownership model
Single owner: one administrator account manages one portfolio. There is no multi-user or per-profile ownership, so there are no "owner" predicates to apply to queries; `photos.owner_id` and `contacts.owner_id` point at the one `profile` row.

## Every write route is guarded (`cms/routes_admin.py`, `cms/web.py`)
| Route | Method | Guard |
|---|---|---|
| `/api/admin/content/portfolio`, `/api/admin/content/config` | PUT | `handle_put()` calls `h.require_admin()` before reading the body |
| `/api/admin/upload` | POST | `upload()` calls `h.require_admin()` first |
| `/api/admin/password` | POST | `change_password()` calls `h.require_admin()` first (and is blocked in `DEMO_MODE`) |
| `/api/login`, `/api/logout` | POST | the only public POSTs: login is throttled (8 failures per 5 minutes per address) and constant-time compared; logout only clears the caller's own cookie |
| any other POST or PUT | | 404 (PUT requires `require_admin()` before even that) |

`require_admin()` (in `cms/web.py`) refuses a request unless it has the `X-Portfolio-Action: 1` header (CSRF), a valid signed session, and a user row whose `role` is `admin`. Read-only admin routes (`/api/admin/session`, `/content`, `/images`) require a valid session. There is no public write endpoint other than login and logout; the contact form opens WhatsApp in the visitor's browser and stores nothing.
Tests: `test_anonymous_cannot_read_or_change_admin_data`, `test_missing_csrf_header_is_refused_even_when_signed_in`, `test_every_write_route_is_guarded`.

## SQL
All statements are in `cms/db.py` and use `?` placeholders with a parameter tuple; no SQL text is ever built from request data (no string formatting, f-strings or concatenation).
Statements in the whole code base: `SELECT` (by key, id or email), `INSERT OR IGNORE` / upsert of `app_content`, one `INSERT` of the first admin, one `UPDATE admin_users SET password_hash=? WHERE id=?` (scoped by the signed-in admin's own id).
**There is no `DELETE` statement anywhere in the code.** The admin panel removes projects, services or skills by saving the whole JSON document, not by deleting rows. Test: `test_sql_is_parameterised_and_there_are_no_deletes`.

## Uploaded file names (`uploads.py`)
The visitor-supplied file name is never used. The type is detected from the file signature (JPG, PNG, WebP, GIF only), the size is limited to 3 MB, and the stored name is a random one (`new_name()`); files are served only when the name matches `SAFE_NAME_RE`, so path tricks such as `../` never reach the file system. Tests: `test_upload_accepts_real_images_only`, `test_image_type_detection_uses_file_signature`.

## Other
- Passwords: salted PBKDF2-HMAC-SHA256 (310,000 iterations); never logged or returned.
- Sessions: HMAC-signed `HttpOnly`, `SameSite=Strict` cookie, 8 hours; `Secure` when `COOKIE_SECURE=true`.
- Headers: strict Content-Security-Policy, `nosniff`, frame and referrer policies (`cms/web.py`).
- Demo: `DEMO_MODE=true` enables a public demo sign-in (`demo_defaults.py`) and blocks password changes. Never use it on a real site.
