-- ============================================================================
-- database/schema.sql — database schema of Creative Portfolio CMS
--
-- SQLite 3 (used through Node's built-in `node:sqlite`). The server applies this
-- file automatically on every start; every statement is idempotent
-- (CREATE ... IF NOT EXISTS), so it builds from an empty database and is safe to
-- re-run. This file is the single source of truth for the data model.
--
-- Contains no credentials and no personal data. The first admin account is created
-- from ADMIN_EMAIL / ADMIN_PASSWORD (see .env.example) or `npm run create-admin`,
-- never from SQL.
-- Order: schema.sql (automatic) -> seed.sql (automatic on an empty database).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- accounts --
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name           TEXT    NOT NULL,
  password_hash  TEXT    NOT NULL,                       -- scrypt$N$r$p$salt$hash, never plain text
  role           TEXT    NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at  TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,                       -- SHA-256 of the cookie token (the token itself is never stored)
  user_id     INTEGER NOT NULL,
  csrf_token  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT    NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- ----------------------------------------------------------------- content --
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT    PRIMARY KEY,                       -- url-safe slug, e.g. "branding"
  label       TEXT    NOT NULL,                          -- filter button text
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT    PRIMARY KEY,                     -- url-safe slug, e.g. "brand-identity"
  title         TEXT    NOT NULL,
  subtitle      TEXT    NOT NULL DEFAULT '',
  category_id   TEXT    NOT NULL,
  image         TEXT    NOT NULL,                        -- "assets/images/x.jpg" or "uploads/x.jpg"
  alt_text      TEXT    NOT NULL,                        -- required for accessibility
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_published  INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  is_featured   INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- a category that still has projects cannot be deleted
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects (category_id);
-- at most one featured project
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_featured ON projects (is_featured) WHERE is_featured = 1;

CREATE TABLE IF NOT EXISTS services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  icon        TEXT    NOT NULL DEFAULT 'i-briefcase',    -- id of a symbol in the SVG sprite in index.html
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  short_label  TEXT    NOT NULL,
  level        INTEGER NOT NULL CHECK (level BETWEEN 0 AND 100),
  ring         TEXT    NOT NULL DEFAULT 'B' CHECK (ring IN ('A', 'B')),   -- gradient style of the ring
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS other_skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,                               -- dotted key, e.g. "owner.name" (whitelist in server/settings-schema.js)
  value  TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------- inquiries --
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  subject     TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL,
  is_read     INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read    ON messages (is_read);
