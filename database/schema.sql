-- ============================================================================
-- database/schema.sql — schema for the Portfolio CMS application
--
-- Runtime database for portfolio records, admin accounts, and CMS JSON content.
--
-- Standard SQL, tested on SQLite 3. It should also run on PostgreSQL and MariaDB.
-- On MySQL, delete "IF NOT EXISTS" from the CREATE INDEX line (MySQL does not support it).
-- Contains no credentials and no personal data.
-- Startup initializes this schema and seeds demo records when the database is empty.
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,   -- matches PortfolioData.categories[].id
  label       VARCHAR(80)  NOT NULL,               -- filter button text
  sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id           VARCHAR(60)  NOT NULL PRIMARY KEY,  -- matches PortfolioData.projects[].id
  title        VARCHAR(120) NOT NULL,
  subtitle     VARCHAR(120) NOT NULL,
  category_id  VARCHAR(40)  NOT NULL,
  image_file   VARCHAR(255) NOT NULL,              -- file name inside Project/assets/images/
  alt_text     VARCHAR(255) NOT NULL,              -- required for accessibility
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects (category_id);

CREATE TABLE IF NOT EXISTS services (
  id          INTEGER       NOT NULL PRIMARY KEY,
  icon        VARCHAR(40)   NOT NULL,              -- id of a symbol in the SVG sprite, e.g. i-briefcase
  title       VARCHAR(120)  NOT NULL,
  body        VARCHAR(400)  NOT NULL,              -- service description (data.js key: text)
  sort_order  INTEGER       NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  name        VARCHAR(60)  NOT NULL PRIMARY KEY,
  short_label VARCHAR(10)  NOT NULL,
  level       INTEGER      NOT NULL CHECK (level BETWEEN 0 AND 100),
  ring        CHAR(1)      NOT NULL CHECK (ring IN ('A', 'B')),   -- gradient style of the ring
  sort_order  INTEGER      NOT NULL DEFAULT 0
);

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
