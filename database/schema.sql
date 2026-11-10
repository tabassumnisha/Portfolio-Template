-- ============================================================================
-- database/schema.sql — schema for the Portfolio CMS application
--
-- Runtime database for portfolio records, admin accounts, and CMS JSON content.
--
-- Standard SQL, tested on SQLite 3. It should also run on PostgreSQL and MariaDB.
-- On MySQL, delete "IF NOT EXISTS" from the CREATE INDEX line (MySQL does not support it).
-- Contains no credentials and no personal data.
-- Startup initializes this schema and seeds demo records when the database is empty.
--
-- TABLES
--   profile, photos, contacts      owner profile, hero/about photos and contact details (owner_id foreign keys, slug lookup)
--   projects, categories           portfolio gallery (projects.id is the project's slug)
--   services, skills, other_skills, site_settings
--   admin_users                    administrator accounts (PBKDF2 password hashes only, never plain passwords)
--   app_content                    the LIVE content of the website as JSON (keys 'portfolio' and 'config'); this is what the
--                                  running server reads and the admin panel edits
-- SESSIONS: there is deliberately NO sessions table. A session is an HMAC-signed HttpOnly cookie. On a normal server the
--   session is kept in process memory (a restart signs everybody out); on serverless hosting (STATELESS_SESSIONS) the signed
--   cookie itself carries the user id and expiry. Nothing about a session is ever written to the database.
-- INDEXES: every foreign key and lookup column is indexed (slug, owner_id, category_id) and so is every sort_order used to list rows.
-- OWNERSHIP: this is a single-owner CMS. profile holds the one owner; photos and contacts reference it through owner_id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile (
  id          INTEGER      NOT NULL PRIMARY KEY,
  slug        VARCHAR(60)  NOT NULL,               -- URL-safe name of the portfolio owner, e.g. your-name
  full_name   VARCHAR(120) NOT NULL,
  initials    VARCHAR(3)   NOT NULL,
  role_title  VARCHAR(120) NOT NULL,
  intro       VARCHAR(400) NOT NULL,               -- hero introduction
  about       VARCHAR(1000) NOT NULL,
  location    VARCHAR(120) NOT NULL,
  experience  VARCHAR(60)  NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_slug ON profile (slug);

CREATE TABLE IF NOT EXISTS photos (
  id          INTEGER      NOT NULL PRIMARY KEY,
  owner_id    INTEGER      NOT NULL,
  slot        VARCHAR(10)  NOT NULL CHECK (slot IN ('hero', 'about')),   -- where the photo appears on the website
  file_name   VARCHAR(255) NOT NULL,               -- file name inside Project/assets/images/ or the uploads folder
  alt_text    VARCHAR(255) NOT NULL,               -- required for accessibility
  FOREIGN KEY (owner_id) REFERENCES profile (id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_photos_owner_id ON photos (owner_id);

CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER      NOT NULL PRIMARY KEY,
  owner_id    INTEGER      NOT NULL,
  kind        VARCHAR(20)  NOT NULL CHECK (kind IN ('whatsapp', 'email', 'website', 'facebook', 'x', 'instagram', 'github', 'telegram', 'reddit')),
  value       VARCHAR(255) NOT NULL,               -- number, address or URL (placeholders only in the demo data)
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  FOREIGN KEY (owner_id) REFERENCES profile (id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts (owner_id);

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,   -- matches PortfolioData.categories[].id
  label       VARCHAR(80)  NOT NULL,               -- filter button text
  sort_order  INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);

CREATE TABLE IF NOT EXISTS projects (
  id           VARCHAR(60)  NOT NULL PRIMARY KEY,  -- matches PortfolioData.projects[].id
  title        VARCHAR(120) NOT NULL,
  subtitle     VARCHAR(120) NOT NULL,
  category_id  VARCHAR(40)  NOT NULL,
  image_file   VARCHAR(255) NOT NULL,              -- file name inside Project/assets/images/
  alt_text     VARCHAR(255) NOT NULL,              -- required for accessibility
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT  -- a category that still has projects cannot be deleted
);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects (category_id);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects (sort_order);

CREATE TABLE IF NOT EXISTS services (
  id          INTEGER       NOT NULL PRIMARY KEY,
  icon        VARCHAR(40)   NOT NULL,              -- id of a symbol in the SVG sprite, e.g. i-briefcase
  title       VARCHAR(120)  NOT NULL,
  body        VARCHAR(400)  NOT NULL,              -- service description (data.js key: text)
  sort_order  INTEGER       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_sort_order ON services (sort_order);

CREATE TABLE IF NOT EXISTS skills (
  name        VARCHAR(60)  NOT NULL PRIMARY KEY,
  short_label VARCHAR(10)  NOT NULL,
  level       INTEGER      NOT NULL CHECK (level BETWEEN 0 AND 100),
  ring        CHAR(1)      NOT NULL CHECK (ring IN ('A', 'B')),   -- gradient style of the ring
  sort_order  INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_skills_sort_order ON skills (sort_order);

CREATE TABLE IF NOT EXISTS other_skills (
  name        VARCHAR(60)  NOT NULL PRIMARY KEY,
  sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key    VARCHAR(60)  NOT NULL PRIMARY KEY,  -- featuredProjectId, featuredText
  setting_value  VARCHAR(500) NOT NULL
);


-- Application runtime tables (SQLite)
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS app_content (
  content_key TEXT PRIMARY KEY CHECK(content_key IN ('portfolio','config')),
  json_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
