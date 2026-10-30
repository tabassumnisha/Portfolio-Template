'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/config.js — reads .env (if present) and process.env. Real environment variables win over the file. */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

function load(overrides) {
  const env = Object.assign({}, parseEnvFile(path.join(ROOT, '.env')), process.env, overrides || {});
  const int = (k, d) => { const n = parseInt(env[k], 10); return Number.isFinite(n) && n > 0 ? n : d; };
  const bool = (k, d) => (env[k] == null || env[k] === '' ? d : /^(1|true|yes|on)$/i.test(env[k]));
  return {
    root: ROOT,
    publicDir: path.join(ROOT, 'Project'),
    schemaFile: path.join(ROOT, 'database', 'schema.sql'),
    seedFile: path.join(ROOT, 'database', 'seed.sql'),
    port: int('PORT', 3000),
    host: env.HOST || '0.0.0.0',
    dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
    trustProxy: bool('TRUST_PROXY', false),          // true only behind a reverse proxy you control
    cookieSecure: env.COOKIE_SECURE || 'auto',        // 'auto' (use the request), 'true' or 'false'
    sessionHours: int('SESSION_HOURS', 12),
    maxUploadMb: int('MAX_UPLOAD_MB', 5),
    seedSampleData: bool('SEED_SAMPLE_DATA', true),
    adminEmail: env.ADMIN_EMAIL || '',
    adminPassword: env.ADMIN_PASSWORD || '',
    adminName: env.ADMIN_NAME || 'Administrator',
    rateLimit: bool('RATE_LIMIT', true)
  };
}

module.exports = { load };
