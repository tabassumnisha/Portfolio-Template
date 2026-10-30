'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/db.js — opens the SQLite database (node:sqlite), applies schema.sql, seeds sample data once. */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function open(cfg) {
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  const file = cfg.dbFile || path.join(cfg.dataDir, 'portfolio.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(fs.readFileSync(cfg.schemaFile, 'utf8'));

  const settingsCount = db.prepare('SELECT COUNT(*) AS n FROM settings').get().n;
  if (cfg.seedSampleData && settingsCount === 0) db.exec(fs.readFileSync(cfg.seedFile, 'utf8'));

  /* Thin helpers: every query is a prepared statement with bound parameters (no string-built SQL). */
  const clean = (a) => a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  const api = {
    raw: db,
    file,
    all: (sql, ...p) => db.prepare(sql).all(...clean(p)).map((r) => Object.assign({}, r)),
    get: (sql, ...p) => { const r = db.prepare(sql).get(...clean(p)); return r ? Object.assign({}, r) : undefined; },
    run: (sql, ...p) => db.prepare(sql).run(...clean(p)),
    tx(fn) {
      db.exec('BEGIN IMMEDIATE');
      try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    close: () => db.close()
  };
  return api;
}

module.exports = { open };
