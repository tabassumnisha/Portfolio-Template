# Setup and deployment guide

Follow this guide from top to bottom on a clean machine. No packages need to be installed.

## Prerequisites
- **Python 3.10 or newer** for direct (VPS) deployment: `python3 --version`
- **Docker Engine 24+ and Docker Compose v2** for Docker deployment: `docker --version`, `docker compose version`
- A unique admin password (14+ characters) and a random session secret

## 1. Get the files
Unzip the package into a folder, for example `/opt/portfolio-cms`, and open a terminal there. The folder contains `server.py`, `Project/`, `database/`, `Dockerfile` and this guide.

## 2. Configure `.env`
```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_hex(32))"   # copy the output
```
Edit `.env` (every variable is explained inside the file):
- `ADMIN_EMAIL`: your admin e-mail
- `ADMIN_PASSWORD`: a unique password, 14+ characters (used once, on the first start)
- `SESSION_SECRET`: paste the generated secret
- `COOKIE_SECURE=true` once the site is served over HTTPS
- `HOST=127.0.0.1` when a reverse proxy runs on the same server, otherwise `0.0.0.0`

Never commit `.env`. Never use the `CHANGE_ME` sample values: the server refuses to create an admin or allow sign-in with them.

## A. Deploy on a VPS (Python)
1. Install Python 3.10+ (`sudo apt install python3` on Debian/Ubuntu).
2. Complete step 2 above.
3. Start the server: `python3 server.py`. The first start **creates the database from scratch** (`database/schema.sql`), loads the demo records (`database/seed.sql`) and the initial content, and creates the first admin from `.env`.
4. Open `http://SERVER:8080/` (website) and `http://SERVER:8080/admin/` (admin).
5. For production run it as a service. Create `/etc/systemd/system/portfolio-cms.service` (adjust path and user):
```ini
[Unit]
Description=Portfolio CMS
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/portfolio-cms
ExecStart=/usr/bin/python3 /opt/portfolio-cms/server.py
Restart=on-failure
User=portfolio
EnvironmentFile=/opt/portfolio-cms/.env
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/portfolio-cms/data
[Install]
WantedBy=multi-user.target
```
Then: `sudo useradd --system portfolio`, `sudo chown -R portfolio /opt/portfolio-cms/data`, `sudo systemctl daemon-reload && sudo systemctl enable --now portfolio-cms`.
6. Put nginx or Caddy in front for HTTPS (for example `proxy_pass http://127.0.0.1:8080;`), then set `COOKIE_SECURE=true` and restart.

## B. Deploy with Docker
1. Complete step 2 above (`.env` is read by `docker compose`).
2. Build and start: `docker compose up --build -d`
3. Check: `docker compose ps` and `docker compose logs -f portfolio`
4. Open `http://SERVER:8080/` and `/admin/`. Change the host port with `PORTFOLIO_PORT` in `.env`.
5. The database and uploaded images live in the named volume `portfolio_data`, so they survive updates. `docker compose down` stops the site; **`docker compose down -v` deletes all saved content**.

## 3. Database
You do not run any SQL by hand: the server applies `database/schema.sql` on every start (idempotent) and, on an empty database, loads `database/seed.sql` and `database/default-*.json`. To inspect or rebuild it manually with SQLite:
```bash
sqlite3 test.db < database/schema.sql && sqlite3 test.db < database/seed.sql
```
The live content is stored as JSON in the table `app_content`; `categories`, `projects`, `services`, `skills` are relational demo/reference tables that mirror the default content. To start over, stop the server and delete the `data/` folder.

## 4. First admin login
1. Open `/admin/`.
2. Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.
3. Go to the **Password** tab and set your own password, then delete the `ADMIN_PASSWORD` line from `.env`.
4. If you forget the password: stop the server, delete the `admin_users` row (`sqlite3 data/portfolio.sqlite3 "DELETE FROM admin_users;"`), put a new `ADMIN_PASSWORD` in `.env` and start again. There is no public reset endpoint on purpose.

## 5. Change the branding
Everything is editable in `/admin/`: the **Site profile** tab holds your name, initials, role, texts, WhatsApp number, e-mail, social links and the hero/about photos (upload your own). **Projects**, **Categories**, **Services** and **Skills** hold the portfolio content. Theme colours and fonts are CSS variables in `Project/css/base.css` (see `docs/customisation.md`).

## 6. Set up a public demo (marketplace listing)
A ZIP cannot host a demo; deploy it yourself:
1. Deploy with option A or B on a host that has a public HTTPS address (any VPS, or a managed platform that builds the `Dockerfile` and offers a persistent disk for `/app/data`).
2. Set `COOKIE_SECURE=true`, and create a dedicated demo admin with a **non-sensitive** password in `.env`.
3. Open the URL from another network, sign in at `/admin/` with the demo account, change one text, save, reload the public site.
4. Enter the public URL and the demo e-mail and password in the listing form. Do not reuse a real password.

## 7. Updating, backups and tests
- Back up the whole `data/` folder (or the `portfolio_data` volume): it holds the database and uploaded images.
- To update, replace the program files (`server.py`, `validation.py`, `uploads.py`, `Project/`, `database/`) and restart; the `data/` folder is untouched.
- Run the tests any time: `python3 -m unittest discover -s tests -v`

## 8. Troubleshooting
| Problem | Fix |
|---|---|
| "Admin sign-in is disabled" | `SESSION_SECRET` is empty or still `CHANGE_ME…`; set a real secret and restart |
| Cannot sign in on first start | The admin is only created when the database has none and the password is not `CHANGE_ME…`; see "First admin login", step 4 |
| Port already in use | Change `PORT` (Python) or `PORTFOLIO_PORT` (Docker) |
| Changes not visible | Save in the admin panel, then hard-reload the site (Ctrl+F5) |
| Session lost after HTTPS | Use the same HTTPS address and set `COOKIE_SECURE=true` |
| Docker data lost | You ran `docker compose down -v`; restore from your backup |
