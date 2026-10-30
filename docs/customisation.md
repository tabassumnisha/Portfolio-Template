# Customisation guide

Paths are relative to `Project/`. No build step: edit, save, reload.

## 1. Theme colours

The theme variables are at the top of `css/base.css`, inside `:root { … }`.

| Variable | Default | What it changes |
|---|---|---|
| `--violet` | `#7b3cff` | Main accent: headline highlights, hover states, focus ring on light sections |
| `--purple` | `#a855ff` | Active nav underline, glow |
| `--lilac` | `#c9a2ff` | Light accent |
| `--accent-text` | `#6a31e6` | Accent text and icon colour on light sections (eyebrows, info icons, service icons, project subtitles) |
| `--btn-from` / `--btn-to` | `#7a38ff` / `#b04fff` | Start and end colour of the primary button gradient |
| `--navy`, `--navy2` | `#050816`, `#0a0d24` | Dark page background |
| `--ink` | `#0f1230` | Main text colour |
| `--muted` | `#5d6584` | Secondary text |
| `--line` | `#e6e7f2` | Borders on cards |
| `--paper` | `#fbfbfe` | Light section background |
| `--soft` | `#f4f2ff` | Soft tint |
| `--serif`, `--sans`, `--script` | font stacks | Heading, body and handwriting fonts |

**Example:** switch the purple theme to teal:

```css
:root {
  --violet: #0d9488;
  --purple: #2dd4bf;
  --lilac:  #99f6e4;
  --accent-text: #0f766e;
  --btn-from: #0d9488;
  --btn-to:   #14b8a6;
}
```

A few decorative gradients (hero glow, filter-pill gradient, skill-ring gradients, sample banners) use fixed colour values written directly in `css/layout.css` and `css/components.css`; search for `#7b3cff`, `#6f32f5`, `#8e48ff` and `rgba(123,60,255` if you want to recolour those too. The skill-ring gradient stops are defined in the SVG sprite in `index.html` (`#ringA`, `#ringB`).

## 2. Add a project to the gallery

1. Put the image in `assets/images/` (recommended **1200×900 px**, JPG/WebP, under 200 KB).
2. Open `js/data.js` and add an object to `projects`:

```js
{ id: "coffee-brand", title: "Coffee Shop Brand", subtitle: "Logo Design",
  category: "branding", image: "coffee-brand.jpg",
  alt: "Logo, cup and signage design for a neighbourhood coffee shop" }
```

3. `category` must be one of the `id` values in `categories`. `alt` is required.
4. To change which project is highlighted in the "Featured project" band, set `featuredProjectId` to a project's `id`.

### Add a new filter category

Add `{ id: "illustration", label: "Illustration" }` to `categories`, then use `category: "illustration"` in the relevant projects. The filter button appears automatically.

## 3. Add a new service card

Add an object to `services` in `js/data.js`:

```js
{ icon: "i-image", title: "Illustration", text: "Custom illustrations for books, brands and editorial work." }
```

`icon` is the id of a symbol in the SVG sprite at the top of `index.html`. Available: `i-briefcase`, `i-image`, `i-code`, `i-globe`, `i-heart`, `i-rocket`, `i-pin`, `i-mail`, `i-arrow`. To add your own icon, add a `<symbol id="i-yours" viewBox="0 0 24 24">…</symbol>` to the sprite (24×24, stroke-based, no fill).

The grid reflows automatically: 3 columns on desktop, 2 on tablet, 1 on phones.

## 4. Edit skills

`skills` in `js/data.js`: `{ name, short, level, ring }`. `level` is 0–100; `ring` is `"A"` or `"B"` (two gradient styles). `otherSkills` is a plain list of tags. Do not claim skill levels you cannot back up; remove the section from `index.html` (`#skills`) and the nav link if you do not want it.

## 5. Add or remove a section

Sections are plain `<section id="…">` blocks inside `<main>`. To remove one, delete the block and its link in `<nav>`. To add one, copy an existing section's wrapper (`class="section light"` with `class="wrap"` inside) and add a nav link.

## 6. Adding web fonts (optional)

No font files are bundled. By default the template uses the first installed font from each stack and otherwise falls back to system fonts. To ship the original look:

1. Download **DM Sans**, **DM Serif Display** and **Caveat** from Google Fonts (all are SIL Open Font License 1.1) as `.woff2` files.
2. Put them in `assets/fonts/` together with each font's `OFL.txt`.
3. Add to the top of `css/base.css`:

```css
@font-face { font-family: "DM Sans"; src: url("../assets/fonts/DMSans-Regular.woff2") format("woff2"); font-weight: 400 700; font-display: swap; }
@font-face { font-family: "DM Serif Display"; src: url("../assets/fonts/DMSerifDisplay-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Caveat"; src: url("../assets/fonts/Caveat-Regular.woff2") format("woff2"); font-weight: 400 700; font-display: swap; }
```

(Adjust file names to the files you downloaded.) Hosting the files yourself keeps the site free of third-party requests. If you load fonts from a CDN instead, pin the version and add Subresource Integrity, and update the CSP in `HowToSetup.md`.

## 7. Change the contact flow

All WhatsApp behaviour is in `js/whatsapp-inquiry.js`. To change the message format, edit `formMessage()`. To remove the form entirely, delete the `<form id="contactForm">` block; the WhatsApp and e-mail rows keep working.
