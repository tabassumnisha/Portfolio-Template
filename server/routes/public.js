'use strict';
/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* server/routes/public.js — the only routes anyone can call without signing in:
   GET /api/health, GET /api/public (site content), POST /api/contact (visitor inquiry, rate limited), POST /api/auth/login. */
const { validate, HttpError } = require('../validate');
const { readJson } = require('../http');
const { toConfig } = require('../settings-schema');
const auth = require('../auth');

function register(router, ctx) {
  const { db, cfg } = ctx;

  router.add('GET', '/api/health', 'public', () => { db.get('SELECT 1 AS ok'); return { status: 'ok' }; });

  router.add('GET', '/api/public', 'public', () => {
    const projects = db.all('SELECT id, title, subtitle, category_id AS category, image, alt_text AS alt, is_featured FROM projects WHERE is_published = 1 ORDER BY sort_order, title');
    const used = new Set(projects.map((p) => p.category));
    const categories = db.all('SELECT id, label FROM categories ORDER BY sort_order, label').filter((c) => used.has(c.id));
    const config = toConfig(db.all('SELECT key, value FROM settings'));
    const featured = projects.find((p) => p.is_featured) || projects[0] || null;
    return {
      config,
      data: {
        categories,
        projects: projects.map(({ is_featured, ...p }) => p),
        featuredProjectId: featured ? featured.id : null,
        featuredText: config.site.featuredText || '',
        services: db.all('SELECT icon, title, body AS text FROM services ORDER BY sort_order, id'),
        skills: db.all('SELECT name, short_label AS short, level, ring FROM skills ORDER BY sort_order, id'),
        otherSkills: db.all('SELECT name FROM other_skills ORDER BY sort_order, id').map((r) => r.name)
      }
    };
  });

  router.add('POST', '/api/contact', 'public', async (req) => {
    const body = await readJson(req, 20 * 1024);
    if (typeof body.website === 'string' && body.website.trim() !== '') return { status: 201, body: { ok: true } }; // honeypot: pretend success, store nothing
    const data = validate(body, {
      name: { type: 'string', required: true, max: 100 },
      email: { type: 'email', required: true, max: 200 },
      subject: { type: 'string', max: 120 },
      message: { type: 'text', required: true, min: 5, max: 3000 }
    });
    db.run('INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)', data.name, data.email, data.subject, data.message);
    return { status: 201, body: { ok: true } };
  }, { limit: [{ bucket: 'contact', max: 5, windowMs: 15 * 60 * 1000 }, { bucket: 'contact-all', max: 200, windowMs: 60 * 60 * 1000, global: true }] });

  router.add('POST', '/api/auth/login', 'public', async (req) => {
    const body = await readJson(req, 4 * 1024);
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
    const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
    const user = email ? db.get('SELECT * FROM users WHERE email = ?', email) : undefined;
    const ok = auth.verifyPassword(password, user ? user.password_hash : auth.DUMMY_HASH) && user && user.is_active;
    if (!ok) throw new HttpError(401, 'Incorrect e-mail or password.');
    const s = auth.createSession(db, user.id, cfg.sessionHours);
    db.run("UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", user.id);
    return {
      status: 200,
      body: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, csrf: s.csrf },
      cookie: { token: s.token, maxAge: s.maxAge }
    };
  }, { limit: [{ bucket: 'login', max: 10, windowMs: 15 * 60 * 1000 }] });
}

module.exports = { register };
