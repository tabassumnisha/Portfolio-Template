# HowToSetup

Step-by-step setup for the **Responsive Creative Portfolio Website Template**.

**Dependencies:** none. The template uses plain HTML5, CSS3 and vanilla JavaScript. There is **no `package.json`, no npm install, no build step, no backend, no database and no CDN request**. Everything runs by opening `Project/index.html` or serving the `Project/` folder with any static web server. `.env.example`, `database/` and `docker-compose.yml` are optional extras (see sections 10 and 11).

Contents

1. [Quick overview](#1-quick-overview)
2. [Local preview](#2-local-preview)
3. [Configuration reference (`config.example.js`)](#3-configuration-reference)
4. [Change the branding](#4-change-the-branding)
5. [Change the WhatsApp number](#5-change-the-whatsapp-number)
6. [Replace portfolio project images](#6-replace-portfolio-project-images)
7. [Deploy: Netlify](#7-deploy-to-netlify)
8. [Deploy: GitHub Pages](#8-deploy-to-github-pages)
9. [Deploy: VPS with nginx](#9-deploy-to-a-vps-with-nginx)
10. [Deploy: Docker](#10-deploy-with-docker)
11. [Database and first admin login](#11-database-and-first-admin-login)
12. [Final checklist](#12-final-checklist)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Quick overview

```text
.env.example             every setting with a placeholder (reference only; not read at runtime)
docker-compose.yml       nginx container for Project/
database/                optional schema.sql + seed.sql (the site does not use them)
Project/
├── index.html              page structure (semantic sections, SVG icon sprite)
├── config.example.js       the ONE config file: your name, WhatsApp number, e-mail, social links
├── css/                    base.css, layout.css, components.css, responsive.css
├── js/                     data.js, utils.js, content.js, gallery.js, services.js,
│                           nav.js, whatsapp-inquiry.js, effects.js, main.js
└── assets/images/          sample images (replace with your own)
```

`config.example.js` is loaded directly by `index.html`. Despite the word "example", **you edit this file in place**; there is nothing to copy or rename. (If you prefer a different name, rename the file and change the one `<script src="config.example.js">` line near the end of `index.html`.)

Requirements: any modern browser (Chrome, Edge, Firefox, Safari). Python 3 is optional and only used for a local web server.

---

## 2. Local preview

**Option A: open the file.** Double-click `Project/index.html`. Every script is a classic script (no ES modules), so it works from `file://`.

**Option B: simple static server** (closest to production):

```bash
cd Project
python3 -m http.server 8080
```

Open <http://localhost:8080>. Stop the server with `Ctrl+C`. On Windows use `py -m http.server 8080`. Any other static server works as well.

---

## 3. Configuration reference

All keys live in `Project/config.example.js` under `window.SITE_CONFIG`. **All values shipped in the file are placeholders.** Never put passwords, credentials or private URLs in it: the file is public to every visitor.

| Key | Type | What it controls | Placeholder |
|---|---|---|---|
| `owner.name` | text | Name in header, hero title (last word is highlighted), polaroid, quote and footer | `Your Name` |
| `owner.initials` | text (1–3 letters) | Brand mark in the header | `YN` |
| `owner.role` | text | Job title under the hero name | `Graphic Designer & Digital Creator` |
| `owner.intro` | text | Short paragraph in the hero | sample sentence |
| `owner.about` | text | Paragraph in the About section | sample sentence |
| `owner.tagline` | text | Line under "About Me" | sample sentence |
| `owner.quote` | text | Quote card text (attributed to `owner.name`) | sample quote |
| `owner.location` | text | Location in the info bar and contact list | `Your City, Country` |
| `owner.experience` | text | Experience in the info bar | `2+ Years` |
| `images.hero` | path | Hero portrait. Use a **transparent** cut-out (WebP/PNG), about 1000×1307 | `assets/images/portrait-placeholder.webp` |
| `images.about` | path | Portrait in the About polaroid, 4:5 ratio, about 960×1200 | `assets/images/about-photo.jpg` |
| `contact.whatsappNumber` | text | WhatsApp number in international format. Spaces, `+`, `-` and brackets are removed automatically to build `wa.me/<digits>` | `+10000000000` |
| `contact.whatsappGreeting` | text | Prefilled message on every WhatsApp button (URL-encoded with `encodeURIComponent`) | sample greeting |
| `contact.email` | text | Shown on the page and used for `mailto:` | `hello@example.com` |
| `contact.website` | URL | Shown and linked in the footer | `https://example.com` |
| `social.facebook`, `social.x`, `social.instagram`, `social.github`, `social.telegram`, `social.reddit` | URL or `""` | Social icons (hero and contact). **An empty string hides that icon.** Only `http(s)://` links are accepted | `https://example.com/yourname` |
| `extraLinks` | list of `{ label, url }` | Text chips under "Follow Me" (for example Behance, Dribbble). Delete entries you do not need | two sample entries |
| `site.title` | text | Browser tab title | `Your Name — Designer & Creative Professional` |
| `site.description` | text | Meta description and Open Graph description | sample sentence |
| `site.footerQuote` | text | Quote in the footer | `Good Design is Good Business` |
| `site.formNote` | text | Small note under the contact form | privacy note |

Gallery projects, filter categories, services and skills are **data**, not config, and live in `js/data.js` (see [docs/customisation.md](docs/customisation.md)).

> **Crawlers and social previews:** search engines and social networks read the static `<title>` and `<meta>` tags in `index.html`, not the JavaScript values. After editing `config.example.js`, also update `<title>`, `<meta name="description">` and the `og:` tags in `index.html`, and make `og:image` an absolute URL (for example `https://your-domain.com/assets/images/og-cover.jpg`).

---

## 4. Change the branding

1. **Name, initials, role, texts:** edit `owner` and `site` in `config.example.js`.
2. **Colours:** edit the theme variables at the top of `css/base.css` (`--violet`, `--purple`, `--lilac`, `--accent-text`, `--btn-from`, `--btn-to`, `--navy`, `--ink`, …). Details and what each variable changes are in [docs/customisation.md](docs/customisation.md).
3. **Fonts:** the CSS asks for *DM Sans*, *DM Serif Display* and *Caveat* and falls back to system fonts. To ship them with your site, see "Adding web fonts" in [docs/customisation.md](docs/customisation.md).
4. **Favicon:** the favicon is an inline SVG in the `<link rel="icon">` line in `index.html`. Change the letters `YN` in that line (or point `href` at your own `.ico`/`.png`).
5. **Social sharing image:** replace `assets/images/og-cover.jpg` (1200×630) and set an absolute URL in `og:image`.
6. **Portraits:** put your photo files in `assets/images/` and set `images.hero` and `images.about`.

---

## 5. Change the WhatsApp number

1. Open `Project/config.example.js`.
2. Set `contact.whatsappNumber` to your number in international format, for example `"+14155550123"` or `"+441234567890"`.
3. Optionally edit `contact.whatsappGreeting` (the prefilled text).
4. Save and reload. Click any WhatsApp button: it opens `https://wa.me/<your digits>?text=<encoded greeting>`. The contact form opens the same link with the visitor's name, e-mail, subject and message.

Nothing is stored or sent to any server: the visitor's message goes only to WhatsApp, and only when they press the button.

---

## 6. Replace portfolio project images

1. Prepare images at **1200×900 px (4:3)**, JPG or WebP, ideally under 200 KB each.
2. Copy them into `Project/assets/images/`.
3. Open `js/data.js` and edit the `projects` list, one object per project:

   ```js
   { id: "my-logo", title: "Brand Identity", subtitle: "Logo Design", category: "branding",
     image: "my-logo.jpg", alt: "Logo and colour palette for a coffee shop" }
   ```

   `category` must match an `id` in `categories`. `alt` is required (it is what screen readers read).
4. To keep the original file names instead, overwrite the files `project-01-…jpg` to `project-06-…jpg`.

Adding or removing a project needs no HTML edit: the cards and filters are generated from this list.

---

## 7. Deploy to Netlify

**Drag and drop (fastest)**
1. Sign in at <https://app.netlify.com> and open **Sites**.
2. Drag the **`Project`** folder onto the "Deploy manually" area.
3. Netlify returns a public URL. Add your own domain under **Domain settings**.

**From a Git repository**
1. Push the project to GitHub/GitLab.
2. In Netlify choose **Add new site → Import an existing project**.
3. Set **Build command:** *(leave empty)* and **Publish directory:** `Project`.
4. Deploy.

---

## 8. Deploy to GitHub Pages

GitHub Pages serves a branch root, so publish the **contents** of `Project/` (do not publish the `Project` folder itself).

1. Create a repository, e.g. `my-portfolio`.
2. Upload everything **inside** `Project/` (`index.html`, `config.example.js`, `css/`, `js/`, `assets/`) to the repository root.
3. Open **Settings → Pages**. Under **Build and deployment** choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/my-portfolio/`. All paths in the template are relative, so a project sub-path works.
5. Custom domain: set it under **Settings → Pages → Custom domain**.

---

## 9. Deploy to a VPS with nginx

Typical setup for Ubuntu/Debian. Replace `example.com` with your domain.

```bash
# 1. On the server
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/portfolio

# 2. From your computer: upload the CONTENTS of Project
scp -r Project/* user@your-server:/tmp/portfolio/
# 3. On the server
sudo cp -r /tmp/portfolio/* /var/www/portfolio/
sudo chown -R www-data:www-data /var/www/portfolio
```

Create `/etc/nginx/sites-available/portfolio`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    root /var/www/portfolio;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \.(?:css|js|jpg|jpeg|png|webp|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;

    # Security headers (the template has no server code, so the policy can be strict)
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-Du+OJKJSbdUgz5nrHeWWINvez6XKDDU/tyj/5c2uvwo='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
}
```

The `sha256-…` value allows the one tiny inline script in `<head>` (`document.documentElement.classList.add('js')`). If you edit that line, recompute the hash or drop the `Content-Security-Policy` header.

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS (free certificate):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

Updating later: copy the changed files into `/var/www/portfolio/`; no restart is needed.

---

## 10. Deploy with Docker

Needs Docker Engine with the Compose plugin. The container is plain nginx serving the `Project/` folder (read-only); there is no image to build.

```bash
# from the ZIP root (the folder that contains docker-compose.yml)
docker compose up -d
```

Open <http://localhost:8080>. Useful commands:

```bash
docker compose logs -f portfolio      # watch the nginx log
docker compose down                   # stop and remove the container
```

To use another port, copy `.env.example` to `.env`, set `PORTFOLIO_PORT=9090` and run `docker compose up -d` again. Never put real secrets in `.env`; the template has none. Edits to files in `Project/` show up on reload because the folder is mounted, not copied. For production behind your own domain, put HTTPS in front (for example the nginx + certbot steps in section 9, or a reverse proxy such as Caddy or Traefik).

---

## 11. Database and first admin login

The template is **frontend-only**: there is no database to create, no admin area, no sign-in and no server endpoint that creates, changes or deletes data. That is why there is no "first admin login" step: nobody can change the live site except by editing its files.

`database/schema.sql` and `database/seed.sql` are **optional**. They describe the same content as `Project/js/data.js` (categories, projects, services, skills) as relational tables, for a buyer who later wants to manage it in a database or CMS. The site never reads them. To try them with SQLite:

```bash
sqlite3 portfolio.db < database/schema.sql
sqlite3 portfolio.db < database/seed.sql
sqlite3 portfolio.db "SELECT id, title, category_id FROM projects;"
```

For PostgreSQL use `psql -d yourdb -f database/schema.sql` and then `-f database/seed.sql`. Do not commit the resulting database file or any connection string.

---

## 12. Final checklist

- [ ] Name, role and texts replaced in `config.example.js`
- [ ] `contact.whatsappNumber` and `contact.email` are yours; WhatsApp button opens the right chat
- [ ] Social links set (or `""` to hide)
- [ ] Sample project images replaced and `alt` text written in `js/data.js`
- [ ] Hero and About portraits replaced
- [ ] `<title>`, meta description and `og:` tags updated in `index.html`; `og:image` is an absolute URL
- [ ] Checked at 1440 px, 1024 px, 820 px, 560 px and 390 px widths
- [ ] Gallery filters work with mouse and keyboard (Tab, then Enter or Space)
- [ ] Mobile menu opens and closes (button, link, Esc)

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| Page shows no gallery/services | JavaScript is disabled, or a script path is wrong. Open the browser console (F12) and look for a red error |
| Old content after editing | Hard refresh (`Ctrl+Shift+R`); on a CDN/host, clear its cache |
| WhatsApp opens with the wrong number | Check `contact.whatsappNumber`: international format, country code first |
| An image does not show | File name and case must match exactly (`Photo.JPG` ≠ `photo.jpg` on Linux hosts) |
| Fonts look different from the screenshots | The fonts are not bundled; see "Adding web fonts" in `docs/customisation.md` |
| Social preview shows no image | `og:image` must be an absolute `https://` URL |
