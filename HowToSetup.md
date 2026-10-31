# HowToSetup

Step-by-step guide for **Creative Portfolio CMS** (version 2.0.0). Follow sections 1–4 to run it on your computer, then pick one deployment in section 6.

## Contents
1. Requirements
2. Install and first start
3. First sign-in and customising your site
4. Configuration reference (`.env`)
5. Backups, updates and password reset
6. Deploy (VPS + nginx, Docker, PaaS)
7. Demo site for marketplace reviewers
8. Final checklist
9. Troubleshooting

---

## 1. Requirements
- **Node.js 22.13 or newer** — check with `node -v`. (The app uses Node's built-in SQLite module; on Node 22 it prints no warning because the start script silences the "experimental" notice.)
- Nothing else. There is **no `npm install`**, no build step and no external database server: data lives in one SQLite file.
- Optional: Docker 24+ with Compose v2 for section 6.2; a domain name and HTTPS for production.

## 2. Install and first start
1. Unzip the package and open a terminal in the folder that contains `package.json`.
2. Create your settings file: `cp .env.example .env`
3. Open `.env` and set:
   ```ini
   ADMIN_EMAIL=you@your-domain.com
   ADMIN_PASSWORD=a-long-password-only-you-know
   ```
   (10+ characters.) These are used **once**, when the database has no user yet.
4. Start: `npm start`
5. You should see `Creative Portfolio CMS running: http://localhost:3000`. Open it in a browser.
6. **Remove the `ADMIN_PASSWORD` line from `.env`** now. The account already exists.

Prefer not to put a password in a file? Leave both lines empty and run `npm run create-admin`; it asks for the e-mail and password interactively.

The database and uploaded images are created in the `data/` folder on first start; the page is filled with placeholder content from `database/seed.sql`. (Set `SEED_SAMPLE_DATA=false` to start with an empty site.)

## 3. First sign-in and customising your site
1. Go to `/admin/` and sign in.
2. **Site settings** → replace the placeholder name, role, texts, photos, WhatsApp number, e-mail and social links → **Save settings**.
3. **Projects** → open each sample project and replace its image, title and description, or delete it and add your own. Pick one project with **Feature** for the Featured band.
4. **Categories, Services, Skills** → edit to match your work. Categories become the filter buttons; a category with no published project is hidden automatically.
5. **Users** (admin only) → add an `editor` account for a colleague or client who should manage content but not settings or users.
6. **My account** → change your password at any time (other devices are signed out).

Visitors' messages arrive under **Messages**. The dashboard shows the unread count. (The CMS does not send e-mail notifications; check the inbox, or put your WhatsApp number in the settings for instant chats.)

Image tips: project images ~1200×900 (4:3); hero portrait a transparent PNG/WebP ~1000×1307; about photo 4:5 ~960×1200. Maximum upload size is `MAX_UPLOAD_MB` (default 5).

## 4. Configuration reference (`.env`)
| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Interface to bind (`127.0.0.1` when a reverse proxy is on the same machine) |
| `DATA_DIR` | `data` | Folder for `portfolio.db` and `uploads/` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | empty | First administrator, created once if no user exists |
| `SESSION_HOURS` | `12` | How long a sign-in lasts |
| `COOKIE_SECURE` | `auto` | `true` forces the Secure flag (use on HTTPS) |
| `TRUST_PROXY` | `false` | `true` only behind your own reverse proxy |
| `MAX_UPLOAD_MB` | `5` | Upload size limit |
| `SEED_SAMPLE_DATA` | `true` | Fill an empty database with the placeholder portfolio |
| `RATE_LIMIT` | `true` | Per-IP limits on login, contact and uploads |

Site content (names, texts, links) is **not** in `.env`; it lives in the database and is edited in the admin panel. Site title and meta tags are applied from the settings by `Project/js/content.js`.

## 5. Backups, updates and password reset
- **Backup:** stop the server (or use `sqlite3 data/portfolio.db ".backup backup.db"`) and copy the whole `data/` folder. It contains everything: content, messages, users and uploads.
- **Restore:** put the folder back as `data/` and start the server.
- **Update to a new version:** replace `server/`, `database/`, `Project/`, `package.json` (keep your `.env` and `data/`). `database/schema.sql` runs on every start and only adds missing tables, so existing data is kept.
- **Forgot the admin password:** run `npm run create-admin`, enter the same e-mail and a new password; it resets that account and restores admin access.
- **Database:** `database/schema.sql` defines the tables, foreign keys and indexes. It is applied automatically; you never need to run it by hand.

## 6. Deploy
Run the app on any host that can run Node.js 22.13+ **and keeps a persistent disk** (the SQLite file and uploads must survive restarts). Static-only hosts (GitHub Pages, Netlify static) cannot run it.

Always serve it over **HTTPS** in production and set in `.env`:
```ini
COOKIE_SECURE=true
TRUST_PROXY=true        # only if a reverse proxy in front sets X-Forwarded-For / X-Forwarded-Proto
HOST=127.0.0.1          # if the proxy is on the same machine
```

### 6.1 VPS with nginx and systemd (Ubuntu example)
```bash
# On the server (Node 22.13+ installed, e.g. from nodesource or nvm)
sudo adduser --system --group --home /opt/portfolio portfolio
# copy the package contents to /opt/portfolio, then:
sudo -u portfolio cp /opt/portfolio/.env.example /opt/portfolio/.env   # edit it
```
`/etc/systemd/system/portfolio.service`:
```ini
[Unit]
Description=Creative Portfolio CMS
After=network.target

[Service]
User=portfolio
WorkingDirectory=/opt/portfolio
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/index.js
Restart=on-failure
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now portfolio
```
nginx site (then add HTTPS with `certbot --nginx`):
```nginx
server {
  server_name your-domain.com;
  client_max_body_size 6m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 6.2 Docker
```bash
cp .env.example .env            # set ADMIN_EMAIL / ADMIN_PASSWORD for the first start
docker compose up -d --build
```
Open `http://localhost:3000/admin/`. Data is stored in the named volume `portfolio-data`. Put a reverse proxy with HTTPS in front for production and set `COOKIE_SECURE=true`, `TRUST_PROXY=true` in `.env`.

### 6.3 Platform-as-a-service (Render, Railway, Fly.io, …)
A `render.yaml` blueprint is included for Render. Import the repository and review the selected paid service plan and persistent-disk charge before deploying. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` as private environment variables in the host dashboard; do not add them to the repository. The blueprint sets `DATA_DIR=/var/data`, `COOKIE_SECURE=true`, and `TRUST_PROXY=true`. On other hosts, use start command `npm start`, mount a **persistent disk/volume**, and point `DATA_DIR` to it. Without persistent storage, the SQLite database, uploads, and messages may be lost on redeploy or restart. After the first administrator is created, remove `ADMIN_PASSWORD` from the host environment if the platform allows it safely; password changes should then be managed through the admin panel.

## 7. Demo site for marketplace reviewers
A reviewer must be able to sign in. On your public demo deployment:
1. Create a **separate demo administrator** (Users → Add user, role `admin`, or `npm run create-admin`) with a throw-away password that you do not use anywhere else.
2. Publish those demo credentials in the listing's "demo credentials" field.
3. Keep real personal data out of the demo; restore a clean copy of `data/` from time to time (section 5).

## 8. Final checklist
- [ ] `node -v` is 22.13 or newer and `npm test` passes
- [ ] `ADMIN_PASSWORD` removed from `.env`; `.env` and `data/` are **not** uploaded to any public repository
- [ ] Site settings, photos, WhatsApp number, e-mail and social links replaced
- [ ] Sample projects replaced or deleted; every project has an image description
- [ ] HTTPS enabled, `COOKIE_SECURE=true`, `TRUST_PROXY` set correctly
- [ ] Contact form tested; the message appears under **Messages**
- [ ] Backup of the `data/` folder scheduled

## 9. Troubleshooting
| Problem | Fix |
|---|---|
| `Cannot find module 'node:sqlite'` | Node is too old. Install Node 22.13 or newer. |
| `[setup] No user exists yet` | Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` or run `npm run create-admin`. |
| Cannot sign in over HTTPS behind a proxy | Set `TRUST_PROXY=true` and make the proxy send `X-Forwarded-Proto`; or set `COOKIE_SECURE=true`. |
| "Too many requests" | The rate limiter protects login/contact/uploads; wait 15 minutes. Behind a proxy make sure `TRUST_PROXY=true`, otherwise all visitors share one IP. |
| Website shows "content could not be loaded" | The server is not running or `/api/public` is unreachable; check `npm start` output. |
| Upload refused | Only real JPG/PNG/WebP/GIF files up to `MAX_UPLOAD_MB` are accepted (SVG is not allowed). |
| Content disappears after redeploy | The host has no persistent disk; mount one and point `DATA_DIR` to it. |
| Port already in use | Change `PORT` in `.env`. |
