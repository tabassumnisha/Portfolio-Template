# Responsive Creative Portfolio Website Template

A polished, **responsive single-page portfolio template for designers and freelancers**. It showcases your work in a filterable project gallery, presents your services, tells your story, and turns visitors into clients through contact links and a **WhatsApp inquiry flow** that opens a chat with a prefilled message.

Built with **HTML5, CSS3 and vanilla JavaScript**. Frontend-only: no backend, no database, no build step, no npm packages, no CDN requests, no tracking. Customise a single config file, upload the folder, and you are live.

| Desktop | Mobile |
|---|---|
| ![Desktop screenshot of the hero section](docs/screenshots/desktop.png) | ![Mobile screenshot of the hero section](docs/screenshots/mobile.png) |

![Desktop screenshot of the services and portfolio gallery](docs/screenshots/desktop-gallery.png)

**Live demo:** the public demo URL is shown on the marketplace listing where you bought this template.

---

## Who is it for?

- Graphic designers, UI/UX designers, illustrators and brand designers
- Freelancers and creative studios who need a fast, professional online portfolio
- Developers who want a clean, well-structured static starter for a client's portfolio

## Features

- **Hero, About, Services, Portfolio, Skills, Featured project and Contact** sections in one page
- **Project gallery with category filters**: keyboard-operable buttons, live "Showing N projects" status for screen readers
- **Data-driven content**: gallery cards, filters, service cards and skill rings are generated from `js/data.js`; add a project by adding one object
- **WhatsApp inquiry flow**: every WhatsApp button and the contact form open `wa.me` with a prefilled, URL-encoded message; nothing is stored or sent to a server
- **One config file** (`config.example.js`) for your name, initials, role, WhatsApp number, e-mail, social links and footer text
- **Responsive** from 320 px phones to wide desktops, with a mobile navigation menu
- **Accessible**: semantic landmarks, skip link, labelled sections, alt text on every image, visible focus, reduced-motion support
- **Fast and private**: no frameworks, no third-party requests, works offline from `file://`
- **Clean structure**: CSS split into `base`, `layout`, `components`, `responsive`; JS split by feature
- **Themeable** through CSS variables
- **Strict-CSP friendly** (an nginx example with a Content-Security-Policy is in `HowToSetup.md`)

## Quick start

1. Unzip the package.
2. Open `Portfolio Site/index.html` in your browser (or run `python3 -m http.server 8080` inside `Portfolio Site/`).
3. Edit `Portfolio Site/config.example.js` with your details and `Portfolio Site/js/data.js` with your projects.
4. Upload the `Portfolio Site/` folder to Netlify, GitHub Pages or your own server.

Full instructions, including nginx on a VPS: **[HowToSetup.md](HowToSetup.md)**.

## What is in the package

```text
README.md                 this file
HowToSetup.md             local preview, Netlify, GitHub Pages, VPS/nginx, branding, WhatsApp, images
CLAUDE.md                 guide for AI coding tools
CHANGELOG.md              version history (1.0.0)
LICENSE-NOTE.md           template licence + rights and sources of every bundled asset
Portfolio Site/
├── index.html
├── config.example.js     the only configuration file (placeholders)
├── css/                  base.css · layout.css · components.css · responsive.css
├── js/                   data.js · utils.js · content.js · gallery.js · services.js ·
│                         nav.js · whatsapp-inquiry.js · effects.js · main.js
└── assets/images/        original placeholder artwork
docs/
├── customisation.md      theme colours, adding projects and services, fonts
└── screenshots/          images used in this README
```

## Browser support

Current versions of Chrome, Edge, Firefox and Safari (desktop and mobile).

## Placeholders and privacy

All names, numbers, e-mail addresses and links shipped in the template are placeholders (`+10000000000`, `hello@example.com`, `https://example.com/...`). The template contains no analytics, API keys or private URLs, and it does not collect visitor data.

## Licence

Sold under the **Standard Licence** (one end product per licence). You may modify the template and use it for one website; you may not resell or redistribute the template itself. All bundled images are original artwork; no third-party fonts or libraries are bundled. Read the full terms and the asset-rights table in **[LICENSE-NOTE.md](LICENSE-NOTE.md)**.

© 2026 Ride Bangla Limited.
