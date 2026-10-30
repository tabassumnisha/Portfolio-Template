# Changelog

All notable changes to this template are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.1] — 2026-10-29

### Added
- `.env.example` listing every configuration value with a placeholder and a comment (reference only; the template does not read it at runtime).
- `docker-compose.yml` to serve the site with nginx, and a "Deploy with Docker" section in `HowToSetup.md`.
- Optional `database/schema.sql` and `database/seed.sql` mirroring the content of `js/data.js`, and a "Database and first admin login" section in `HowToSetup.md` explaining that the template has no database, admin area or authenticated endpoints.
- "Security model" section in `README.md`.

### Changed
- The application folder `Portfolio Site/` is now `Project/`; all documentation paths were updated.

### Fixed
- Comment in `js/data.js` referred to a non-existent `js/skills.js`.

## [1.0.0] — 2026-10-27

Initial release.

### Added
- Responsive single-page portfolio: hero, about, services, portfolio gallery, skills, featured project and contact sections.
- Project gallery with keyboard-operable category filters (`aria-pressed`) and a live "Showing N projects" status for screen readers.
- Services section with six cards generated from data.
- Animated skill rings and an "Other skills" tag list generated from data.
- WhatsApp inquiry flow: prefilled `wa.me` links on every WhatsApp button and a contact form that opens WhatsApp with the visitor's message (`encodeURIComponent`, `rel="noopener noreferrer"`); no visitor data is stored or sent to a server.
- Single placeholder config file, `config.example.js` (owner name, initials, role, WhatsApp number, e-mail, social links, footer text).
- Data file `js/data.js` for projects, filter categories, services and skills.
- Mobile navigation menu (opens with button, closes with link click, outside click or Esc).
- Accessibility: semantic landmarks, skip link, labelled sections, alt text on every image, visible focus styles, reduced-motion support.
- CSS split by concern (`base`, `layout`, `components`, `responsive`) with theme variables in `:root`.
- JavaScript split by feature (`nav`, `gallery`, `services`, `whatsapp-inquiry`, `content`, `effects`).
- Original placeholder artwork (no real people, no third-party brands).
- Documentation: `README.md`, `HowToSetup.md`, `CLAUDE.md`, `LICENSE-NOTE.md`, `docs/customisation.md`.
- Licence: Standard Licence (one end product), see `LICENSE-NOTE.md`.

### Notes
- No build step, no npm packages, no CDN requests. Works from `file://` and from any static host.
