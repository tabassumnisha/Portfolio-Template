# CLAUDE.md

Guidance for AI coding tools (Claude Code, Copilot, Cursor, etc.) working on this repository.

## What this is
A frontend-only, responsive creative portfolio template (HTML5 + CSS3 + vanilla JS). **No backend, no database, no build step, no npm, no tests.** Keep it that way: do not add frameworks, bundlers, packages, CDN links, analytics or a `.env`.

## Folder layout
```text
README.md · HowToSetup.md · CLAUDE.md · CHANGELOG.md · LICENSE-NOTE.md
Portfolio Site/
  index.html            semantic sections + inline SVG icon sprite; contains NO real data
  config.example.js     the ONLY config file (window.SITE_CONFIG): owner, images, contact, social, site text
  css/
    base.css            :root theme variables, reset, helpers (.sr-only, .skip-link), reveal effects
    layout.css          header, hero, section frames, grids, footer
    components.css      buttons, cards, slots, forms, rings, chips, banners, service cards
    responsive.css      all media queries (1024 / 820 / 560 / 380, hover, reduced motion)
  js/
    data.js             PortfolioData: categories, projects, featuredProjectId, services, skills
    utils.js            window.Portfolio helpers: $, $$, el, icon, safeUrl, get
    content.js          applies SITE_CONFIG to text, images, links, socials
    gallery.js          builds filter buttons + project cards, filtering, featured band
    services.js         builds service cards and skill rings
    nav.js              sticky header, mobile menu, active-link highlight
    whatsapp-inquiry.js builds wa.me links and handles the contact form
    effects.js          reveal-on-scroll, cursor glow
    main.js             entry point; calls the modules in order
  assets/images/        original placeholder artwork (no real people or brands)
docs/customisation.md   theme variables, adding projects/services, fonts
```

CSS load order (see `<head>`): `base → layout → components → responsive`. Scripts are classic scripts loaded in the order at the bottom of `index.html` (**not ES modules**, so the page also works from `file://`); each file attaches to the shared `window.Portfolio` namespace.

## Where things live
- **Gallery data:** `Portfolio Site/js/data.js` → `PortfolioData.projects` and `.categories`. Rendering and filtering: `js/gallery.js`.
- **Services and skills data:** `js/data.js` → `.services`, `.skills`, `.otherSkills`. Rendering: `js/services.js`.
- **WhatsApp logic:** `js/whatsapp-inquiry.js` (`link()` builds `https://wa.me/<digits>?text=<encodeURIComponent(message)>`; the number comes from `SITE_CONFIG.contact.whatsappNumber`).
- **Owner name, e-mail, social links, texts:** `config.example.js`; applied by `js/content.js` through `data-bind="path.to.key"` attributes in `index.html`.
- **Theme colours:** CSS variables in `:root` of `css/base.css`.

## Conventions
- Vanilla ES5-style JS in IIFEs, `'use strict'`, no globals except `SITE_CONFIG`, `PortfolioData`, `Portfolio`.
- Build DOM with `Portfolio.el()` / `textContent`. **Never `innerHTML` with config or data values.** External URLs go through `Portfolio.safeUrl()` (http/https/mailto only).
- Every external link: `target="_blank" rel="noopener noreferrer"`.
- Never store or transmit visitor data. The contact flow may only open `wa.me` or `mailto:` links.
- No real credentials, phone numbers, e-mails or private URLs anywhere. Placeholders only: `+10000000000`, `hello@example.com`, `https://example.com/...`.
- Cards (projects, services, skills) are generated from data. Do not copy-paste card markup into `index.html`.
- Accessibility is a requirement: semantic landmarks, `alt` on every image, keyboard-operable controls, visible focus, `aria-pressed` on filters, `prefers-reduced-motion` respected.
- Keep CSS split by concern (above); put new media queries in `responsive.css`. Keep files small; add a new file per new feature rather than growing one.
- Do not add a second config file.
- Update `CHANGELOG.md` for every user-visible change (Keep a Changelog format).

## Preview
```bash
cd "Portfolio Site"
python3 -m http.server 8080     # then open http://localhost:8080
```
Or just open `Portfolio Site/index.html` in a browser. There are no tests to run. Manually check at 1440, 1024, 820, 560 and 390 px; test the gallery filters with the keyboard; click a WhatsApp button and confirm the `wa.me/…?text=…` URL.
