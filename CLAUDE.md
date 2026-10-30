# CLAUDE.md

Guidance for AI coding tools (Claude Code, Copilot, Cursor, etc.) working on this repository.

## What this is
**Creative Portfolio CMS**: a portfolio website plus admin panel. Backend = plain Node.js (`node:http`, `node:sqlite`, `node:crypto`), frontend = vanilla HTML/CSS/JS. **No third-party dependencies, no build step, no CDN, no frameworks.** Keep it that way: do not add npm packages, bundlers, CDN links or analytics. Requires Node >= 22.13.

## Folder layout
```text
server/
  index.js            entry point (npm start)
  app.js              builds the HTTP server: security headers, Origin/CSRF/auth/role checks, rate limits, routing
  config.js           reads .env + process.env
  db.js               opens SQLite, applies database/schema.sql, seeds database/seed.sql on an empty DB; bound-parameter helpers
  auth.js             scrypt passwords, hashed session tokens, CSRF token, cookie header
  http.js             Router (every route declares access: public | staff | admin), body readers, CSP, limiter
  validate.js         schema validator (unknown fields dropped), HttpError, slugify
  settings-schema.js  whitelist + rules for editable site settings (key -> rule)
  uploads.js          image upload by magic bytes (JPG/PNG/WebP/GIF only), orphan clean-up
  static.js           static file server (path traversal + dot-file safe)
  routes/public.js    GET /api/public, POST /api/contact, POST /api/auth/login, GET /api/health
  routes/admin.js     session, password, stats, inbox, upload, settings, users
  routes/content.js   categories, projects, services, skills, other skills (uses routes/crud.js)
  routes/crud.js      generic list/get/create/update/delete for a content table
  scripts/create-admin.js   create admin / reset a password
database/schema.sql   SINGLE source of truth for the data model (idempotent, applied on every start)
database/seed.sql     placeholder sample content (INSERT OR IGNORE, applied once to an empty DB)
Project/              static files served at /
  index.html          the website; contains NO data (all content comes from /api/public)
  css/ base, layout, components, responsive   (load order: base -> layout -> components -> responsive)
  js/ boot, utils, api, content, gallery, services, nav, contact, effects, main   (classic scripts, order in index.html)
  admin/              admin panel: index.html, admin.css, js/ core, resources, views, main
  assets/images/      original placeholder artwork
test/api.test.js      npm test (node:test): auth, roles, CSRF, validation, uploads, rate limit, traversal
docs/                 customisation.md, api.md, screenshots
```

## Rules that must not be broken
- **Every route is registered with an explicit access level** (`public`, `staff`, `admin`). The only public non-GET routes are `POST /api/contact` and `POST /api/auth/login`; `test/api.test.js` fails if another appears or if any guarded route answers an anonymous request with anything but 401.
- Every non-GET request from a signed-in user needs the `X-CSRF-Token` header; cross-origin writes are refused by the Origin check. Do not weaken this.
- SQL: **bound parameters only**. Table/column names may come only from constants in code (see `routes/crud.js`), never from a request.
- New editable setting: add it to `server/settings-schema.js`, `database/seed.sql`, the admin form in `Project/admin/js/views.js` (SECTIONS), the public use in `Project/js/content.js` / `index.html` (`data-bind="group.key"`), and `.env.example`/docs if relevant.
- New table/column: edit `database/schema.sql` (idempotent: `IF NOT EXISTS`; for new columns on existing installs add a guarded migration step in `server/db.js`), keep foreign keys, indexes on FK columns and explicit `ON DELETE` rules.
- Never `innerHTML` with data; use `textContent` / `Portfolio.el()` / `Admin.h()`. External URLs from data go through `Portfolio.safeUrl()`.
- No inline `<script>` or event-handler attributes (the CSP is `script-src 'self'`). Put code in a file.
- Never log or return password hashes or session tokens. Never ship real credentials, phone numbers or e-mails; placeholders only (`+10000000000`, `hello@example.com`, `https://example.com/...`).
- Accessibility is a requirement: landmarks, `alt` text, labels for inputs, keyboard operation, visible focus, `prefers-reduced-motion`.
- Keep CSS split by concern; media queries for the website go in `responsive.css`. Keep files small; add a file per new feature.
- Update `CHANGELOG.md` (Keep a Changelog) for every user-visible change and keep the docs in sync.

## Commands
```bash
cp .env.example .env     # set ADMIN_EMAIL / ADMIN_PASSWORD once
npm start                # http://localhost:3000  (admin: /admin/)
npm test                 # must pass before every release
npm run create-admin     # create an admin or reset a password
```
Manual check after UI changes: website at 1440, 1024, 820, 560 and 390 px; admin panel at 390 px and desktop; keyboard-only through the filter buttons, contact form and admin dialogs.
