'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/scripts/create-admin.js — create an administrator, or reset a forgotten password.
   Usage:  npm run create-admin                      (asks for e-mail, name and password)
           ADMIN_EMAIL=a@b.com ADMIN_PASSWORD='long password' npm run create-admin   (non-interactive) */
const readline = require('node:readline');
const { load } = require('../config');
const dbModule = require('../db');
const auth = require('../auth');
const { EMAIL_RE } = require('../validate');

function ask(q, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(q)) process.stdout.write(s); };
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a); });
  });
}

(async () => {
  const cfg = load();
  const email = (cfg.adminEmail || await ask('Admin e-mail: ')).trim();
  if (!EMAIL_RE.test(email)) { console.error('That is not a valid e-mail address.'); process.exit(1); }
  const name = cfg.adminEmail ? cfg.adminName : (await ask('Display name [Administrator]: ')).trim() || 'Administrator';
  const password = cfg.adminPassword || await ask(`Password (min ${auth.MIN_PASSWORD} characters): `, true);
  try { auth.checkPasswordStrength(password); } catch (e) { console.error(e.message); process.exit(1); }

  const db = dbModule.open(cfg);
  const existing = db.get('SELECT id FROM users WHERE email = ?', email);
  const hash = auth.hashPassword(password);
  if (existing) {
    db.run("UPDATE users SET password_hash = ?, role = 'admin', is_active = 1 WHERE id = ?", hash, existing.id);
    db.run('DELETE FROM sessions WHERE user_id = ?', existing.id);
    console.log(`Password reset and admin access restored for ${email}.`);
  } else {
    db.run("INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, 'admin', ?)", email, name, hash);
    console.log(`Administrator created: ${email}`);
  }
  db.close();
})();
