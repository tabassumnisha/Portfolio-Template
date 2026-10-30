'use strict';
/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* server/routes/admin.js — session, own password, dashboard stats, inbox, uploads, settings and user management. */
const { validate, HttpError, EMAIL_RE } = require('../validate');
const { readJson, readBody } = require('../http');
const { validateSettings, IMAGE_KEYS, toConfig } = require('../settings-schema');
const auth = require('../auth');

function register(router, ctx) {
  const { db, cfg, uploads } = ctx;

  /* ---- session --------------------------------------------------------- */
  router.add('GET', '/api/auth/me', 'staff', (req, res, p, a) => ({ user: a.user, csrf: a.session.csrf }));

  router.add('POST', '/api/auth/logout', 'staff', (req, res, p, a) => {
    db.run('DELETE FROM sessions WHERE id = ?', a.session.id);
    return { status: 204, clearCookie: true };
  });

  router.add('POST', '/api/auth/password', 'staff', async (req, res, p, a) => {
    const body = await readJson(req, 4 * 1024);
    const row = db.get('SELECT password_hash FROM users WHERE id = ?', a.user.id);
    if (typeof body.current !== 'string' || !auth.verifyPassword(body.current, row.password_hash)) throw new HttpError(403, 'Your current password is not correct.', { current: 'Not correct.' });
    auth.checkPasswordStrength(body.next);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', auth.hashPassword(body.next), a.user.id);
    db.run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', a.user.id, a.session.id); // sign out every other device
    return { status: 204 };
  }, { limit: [{ bucket: 'password', max: 10, windowMs: 15 * 60 * 1000 }] });

  /* ---- dashboard ------------------------------------------------------- */
  router.add('GET', '/api/admin/stats', 'staff', () => ({
    projects: db.get('SELECT COUNT(*) AS n FROM projects').n,
    published: db.get('SELECT COUNT(*) AS n FROM projects WHERE is_published = 1').n,
    services: db.get('SELECT COUNT(*) AS n FROM services').n,
    skills: db.get('SELECT COUNT(*) AS n FROM skills').n,
    messages: db.get('SELECT COUNT(*) AS n FROM messages').n,
    unread: db.get('SELECT COUNT(*) AS n FROM messages WHERE is_read = 0').n,
    latest: db.all('SELECT id, name, subject, is_read, created_at FROM messages ORDER BY id DESC LIMIT 5')
  }));

  /* ---- inbox ----------------------------------------------------------- */
  router.add('GET', '/api/admin/messages', 'staff', (req, res, p, a, url) => {
    const unreadOnly = url.searchParams.get('unread') === '1';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset'), 10) || 0, 0);
    const where = unreadOnly ? 'WHERE is_read = 0' : '';
    return {
      total: db.get(`SELECT COUNT(*) AS n FROM messages ${where}`).n,
      items: db.all(`SELECT * FROM messages ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, limit, offset)
    };
  });

  router.add('PATCH', '/api/admin/messages/:id', 'staff', async (req, res, p) => {
    const { is_read } = validate(await readJson(req), { is_read: { type: 'bool', required: true } });
    const r = db.run('UPDATE messages SET is_read = ? WHERE id = ?', is_read, Number(p.id));
    if (!r.changes) throw new HttpError(404, 'Not found.');
    return db.get('SELECT * FROM messages WHERE id = ?', Number(p.id));
  });

  router.add('DELETE', '/api/admin/messages/:id', 'staff', (req, res, p) => {
    if (!db.run('DELETE FROM messages WHERE id = ?', Number(p.id)).changes) throw new HttpError(404, 'Not found.');
    return { status: 204 };
  });

  /* ---- image upload (raw body, Content-Type image/*) -------------------- */
  router.add('PUT', '/api/admin/upload', 'staff', async (req) => {
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) throw new HttpError(415, 'Upload a JPG, PNG, WebP or GIF image.');
    const buf = await readBody(req, cfg.maxUploadMb * 1024 * 1024);
    if (!buf.length) throw new HttpError(400, 'The file is empty.');
    return { status: 201, body: { path: uploads.save(buf) } };
  }, { limit: [{ bucket: 'upload', max: 60, windowMs: 10 * 60 * 1000 }] });

  /* ---- settings (read: staff, write: admin only) ------------------------ */
  router.add('GET', '/api/admin/settings', 'staff', () => toConfig(db.all('SELECT key, value FROM settings')));

  router.add('PUT', '/api/admin/settings', 'admin', async (req) => {
    const body = await readJson(req);
    const clean = validateSettings(body);
    const before = db.all('SELECT key, value FROM settings');
    db.tx(() => {
      for (const [k, v] of Object.entries(clean)) {
        db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', k, v);
      }
    });
    before.filter((r) => IMAGE_KEYS.includes(r.key) && clean[r.key] !== undefined && clean[r.key] !== r.value).forEach((r) => uploads.release(r.value));
    return toConfig(db.all('SELECT key, value FROM settings'));
  });

  /* ---- users (admin only) ---------------------------------------------- */
  const publicUser = 'id, email, name, role, is_active, created_at, last_login_at';

  router.add('GET', '/api/admin/users', 'admin', () => ({ items: db.all(`SELECT ${publicUser} FROM users ORDER BY id`) }));

  router.add('POST', '/api/admin/users', 'admin', async (req) => {
    const body = await readJson(req, 8 * 1024);
    const data = validate(body, {
      email: { type: 'email', required: true, max: 200 },
      name: { type: 'string', required: true, max: 100 },
      role: { type: 'enum', values: ['admin', 'editor'], default: 'editor' }
    });
    auth.checkPasswordStrength(body.password);
    if (db.get('SELECT 1 AS x FROM users WHERE email = ?', data.email)) throw new HttpError(409, 'That e-mail already has an account.', { email: 'Already used.' });
    const id = Number(db.run('INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)', data.email, data.name, data.role, auth.hashPassword(body.password)).lastInsertRowid);
    return { status: 201, body: db.get(`SELECT ${publicUser} FROM users WHERE id = ?`, id) };
  });

  router.add('PUT', '/api/admin/users/:id', 'admin', async (req, res, p, a) => {
    const id = Number(p.id);
    const user = db.get('SELECT * FROM users WHERE id = ?', id);
    if (!user) throw new HttpError(404, 'Not found.');
    const body = await readJson(req, 8 * 1024);
    const data = validate(body, {
      name: { type: 'string', required: true, max: 100 },
      role: { type: 'enum', values: ['admin', 'editor'], default: user.role },
      is_active: { type: 'bool', default: user.is_active }
    });
    if (id === a.user.id && (data.role !== 'admin' || !data.is_active)) throw new HttpError(400, 'You cannot remove your own admin access or disable your own account.');
    const newPassword = body.password ? (auth.checkPasswordStrength(body.password), auth.hashPassword(body.password)) : user.password_hash;
    db.tx(() => {
      db.run('UPDATE users SET name = ?, role = ?, is_active = ?, password_hash = ? WHERE id = ?', data.name, data.role, data.is_active, newPassword, id);
      if (!data.is_active || data.role !== user.role || body.password) db.run('DELETE FROM sessions WHERE user_id = ?', id); // force re-login with the new rights
    });
    return db.get(`SELECT ${publicUser} FROM users WHERE id = ?`, id);
  });

  router.add('DELETE', '/api/admin/users/:id', 'admin', (req, res, p, a) => {
    const id = Number(p.id);
    if (id === a.user.id) throw new HttpError(400, 'You cannot delete your own account.');
    if (!db.run('DELETE FROM users WHERE id = ?', id).changes) throw new HttpError(404, 'Not found.');
    return { status: 204 };
  });
}

module.exports = { register, EMAIL_RE };
