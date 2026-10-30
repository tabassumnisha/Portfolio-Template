'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/auth.js — password hashing (scrypt), sessions stored as SHA-256 hashes, CSRF tokens. */
const crypto = require('node:crypto');
const { HttpError } = require('./validate');

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 };
const COOKIE = 'pcms_sid';
const MIN_PASSWORD = 10;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), h.toString('base64')].join('$');
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return crypto.timingSafeEqual(actual, expected);
}

/* Used so that "unknown e-mail" costs the same time as "wrong password". */
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

function checkPasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) throw new HttpError(422, `Password must be at least ${MIN_PASSWORD} characters.`, { password: `Use at least ${MIN_PASSWORD} characters.` });
  if (password.length > 200) throw new HttpError(422, 'Password is too long.', { password: 'Use at most 200 characters.' });
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const iso = (d) => d.toISOString();

function createSession(db, userId, hours) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  db.run('DELETE FROM sessions WHERE expires_at < ?', iso(new Date()));
  db.run('INSERT INTO sessions (id, user_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)', sha256(token), userId, csrf, iso(new Date(Date.now() + hours * 3600 * 1000)));
  return { token, csrf, maxAge: hours * 3600 };
}

/* Returns { user, session } for a valid cookie token, otherwise null. Disabled users never pass. */
function findSession(db, token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  const row = db.get(
    `SELECT s.id AS sid, s.csrf_token, s.expires_at, u.id, u.email, u.name, u.role, u.is_active
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`, sha256(token));
  if (!row || !row.is_active || row.expires_at < iso(new Date())) return null;
  return { session: { id: row.sid, csrf: row.csrf_token }, user: { id: row.id, email: row.email, name: row.name, role: row.role } };
}

function destroySession(db, token) { if (token) db.run('DELETE FROM sessions WHERE id = ?', sha256(token)); }

function safeEqual(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function cookieHeader(token, maxAge, secure) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

module.exports = { COOKIE, MIN_PASSWORD, hashPassword, verifyPassword, DUMMY_HASH, checkPasswordStrength, createSession, findSession, destroySession, safeEqual, cookieHeader };
