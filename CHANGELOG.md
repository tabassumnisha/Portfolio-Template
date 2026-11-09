# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow semantic versioning.

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
- `.gitignore`, `docs/api.md`, admin screenshots.
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
