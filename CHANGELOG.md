# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow semantic versioning.

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
