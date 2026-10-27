# Changelog

All notable changes to this template are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

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
