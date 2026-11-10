# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow semantic versioning.

## [1.3.4] — 2026-11-10
### Fixed
- **Vercel demo showed only a redirect page.** A static `index.html` at the repository root was served by Vercel before the rewrite in `vercel.json`, so `/` never reached the server. The file is removed; a test guards against it coming back.
### Added
- Tables `profile`, `photos` and `contacts` (primary and foreign keys, indexes on `slug` and `owner_id`) in `database/schema.sql`, with sample rows in `database/seed.sql`. `schema.sql` now documents why there is no `sessions` table (signed-cookie sessions).
- `.env.example`: lists `VERCEL` and explains how this server's variable names (`SESSION_SECRET`, `DATABASE_PATH`, `ADMIN_PASSWORD`) map to the common `SECRET_KEY`, `DB_PATH`, `ADMIN_PASSWORD_HASH`, `UPLOAD_DIR`, `ALLOWED_ORIGINS`.
- README: demo URL and the public demo sign-in. HowToSetup.md: manual database creation from `schema.sql`, `docker run`, theme variables, Python version, Vercel settings and a health check.
- `.python-version` (3.12) for Vercel.
- `tests/test_schema.py`: schema and indexes, `.env.example` completeness, repository layout, and the Vercel demo (`DEMO_MODE` only) end to end.

## [1.3.3] — 2026-11-10
### Added
- `requirements.txt` (declares that there are no third-party dependencies), `docs/architecture.md`, `AGENTS.md`.
- Docker health check in `docker-compose.yml`.
### Changed
- `docs/api.md` is now `docs/api-reference.md`.

## [1.3.2] — 2026-11-09
### Added
- `DEMO_MODE=true` now also provides a built-in public demo sign-in (`demo_defaults.py`), so a Vercel demo needs only that one setting. Your own `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `SESSION_SECRET` override it. Without `DEMO_MODE` nothing changes and no default account exists.

## [1.3.1] — 2026-11-09
### Added
- Vercel deployment: `api/index.py` and `vercel.json` run the website, admin panel and API as one serverless function (HowToSetup.md, option C).
- `STATELESS_SESSIONS` (automatic on Vercel): the signed session cookie carries the session, so sign-in works across serverless instances.
- `DEMO_MODE`: blocks admin password changes in a public demo.
- Tests for the Vercel handler, stateless sessions and demo mode (`tests/test_vercel.py`).
### Changed
- The footer quote "Good Design is Good Business" is removed. The footer quote is now empty by default and only appears when you enter one under Site profile → Page texts → Footer quote.
- `projects.category_id` foreign key now has explicit `ON UPDATE CASCADE ON DELETE RESTRICT` in `database/schema.sql`.
- Docs describe the Vercel demo and its temporary storage.
### Fixed
- An upload larger than 3 MB now reliably returns the "Image is larger than 3 MB" message: the rejected body is read and dropped before the reply, instead of the connection being closed mid-upload.

## [1.2.0] — 2026-10-31
### Added
- Form-based admin panel (`/admin/`): site profile, projects, categories, services, skills and tags, with add, edit, reorder and delete; no JSON editing needed.
- Image upload for projects and the hero/about photos (JPG, PNG, WebP, GIF, 3 MB maximum, checked by file signature).
- Strict Content-Security-Policy headers, a session-check endpoint and end-to-end tests (sign-in, roles, validation, uploads).
- `.gitignore`, `docs/api-reference.md`, admin screenshots.
### Changed
- Admin panel moved out of `server.py` into `Project/admin/`; validation moved to `validation.py`, upload helpers to `uploads.py`.
- Content validation is stricter (unknown fields rejected, categories and featured project must exist, links must be http/https).
- Logout and password change now also require the anti-CSRF header.
- Config file renamed from `config.example.js` to `config.js`; `.env.example` documents every variable.
- Company name and licence terms (Ride Bangla Limited) restored in `LICENSE-NOTE.md` and source headers.
### Removed
- `RELEASE-CHECKLIST.md` (internal notes) and the empty `__pycache__` folder from the package.

## [1.1.1] — 2026-10-31
- Removed a duplicate database initialisation call, added per-IP sign-in throttling, hardened JSON parsing.

## [1.1.0] — 2026-10-30
- Added SQLite-backed content, admin sign-in, sessions, password change, Docker deployment and tests.

## [1.0.0] — 2026-10-28
- Initial responsive static portfolio template with project filters, services, skills and WhatsApp inquiry links.
