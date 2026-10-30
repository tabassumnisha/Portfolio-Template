'use strict';
/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* test/api.test.js — run with `npm test`. Starts the real server on a temporary database (no network, no dependencies). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('../server/config');
const { createApp } = require('../server/app');

const PASSWORD = 'correct horse battery';
let app, base, dir;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

test.before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcms-test-'));
  app = createApp(load({ DATA_DIR: dir, ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: PASSWORD, RATE_LIMIT: 'false', PORT: '0' }));
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + app.server.address().port;
});
test.after(async () => { await app.close(); fs.rmSync(dir, { recursive: true, force: true }); });

/* tiny client that keeps a cookie + csrf token */
function client() {
  const c = { cookie: '', csrf: '' };
  c.req = async (method, url, body, extra) => {
    const headers = Object.assign({}, extra);
    if (c.cookie) headers.cookie = c.cookie;
    if (c.csrf && method !== 'GET') headers['x-csrf-token'] = c.csrf;
    let payload = body;
    if (body !== undefined && !Buffer.isBuffer(body)) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + url, { method, headers, body: payload });
    const sc = res.headers.get('set-cookie');
    if (sc) c.cookie = sc.split(';')[0];
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch (_) { /* not json */ }
    return { status: res.status, json, headers: res.headers };
  };
  c.login = async (email, password) => { const r = await c.req('POST', '/api/auth/login', { email, password }); if (r.status === 200) c.csrf = r.json.csrf; return r; };
  return c;
}
async function admin() { const c = client(); const r = await c.login('admin@example.com', PASSWORD); assert.equal(r.status, 200); return c; }

test('public site data is served without login and only lists published content', async () => {
  const r = await client().req('GET', '/api/public');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.projects.length, 6);
  assert.equal(r.json.data.featuredProjectId, 'brand-identity');
  assert.ok(r.json.config.owner.name);
  assert.equal(JSON.stringify(r.json).includes('password'), false);
});

test('SECURITY: every non-public route rejects anonymous callers; every mutating route is guarded', async () => {
  const routes = app.router.routes;
  assert.ok(routes.length > 30);
  const publicMutating = routes.filter((r) => r.method !== 'GET' && r.access === 'public').map((r) => r.method + ' ' + r.pattern).sort();
  assert.deepEqual(publicMutating, ['POST /api/auth/login', 'POST /api/contact']); // the only two unauthenticated writes, by design
  for (const r of routes.filter((x) => x.access !== 'public')) {
    const url = r.pattern.replace(/:[A-Za-z]+/g, '1');
    const res = await client().req(r.method, url, r.method === 'GET' ? undefined : {});
    assert.equal(res.status, 401, `${r.method} ${r.pattern} must return 401 without a session`);
  }
});

test('SECURITY: admin-only routes reject editors; mutating routes need the CSRF token', async () => {
  const a = await admin();
  const created = await a.req('POST', '/api/admin/users', { email: 'ed@example.com', name: 'Ed', role: 'editor', password: 'editor-password-1' });
  assert.equal(created.status, 201);
  const ed = client(); assert.equal((await ed.login('ed@example.com', 'editor-password-1')).status, 200);

  for (const r of app.router.routes.filter((x) => x.access === 'admin')) {
    const res = await ed.req(r.method, r.pattern.replace(/:[A-Za-z]+/g, '1'), r.method === 'GET' ? undefined : {});
    assert.equal(res.status, 403, `${r.method} ${r.pattern} must be 403 for an editor`);
  }
  assert.equal((await ed.req('GET', '/api/admin/stats')).status, 200); // editor may use staff routes

  const noCsrf = Object.assign(client(), { cookie: a.cookie, csrf: '' });
  assert.equal((await noCsrf.req('POST', '/api/admin/categories', { label: 'X' })).status, 403);
  const badOrigin = await a.req('POST', '/api/admin/categories', { label: 'X' }, { origin: 'https://evil.example' });
  assert.equal(badOrigin.status, 403);
});

test('login: wrong password and unknown user give the same answer; disabled users cannot sign in; logout ends the session', async () => {
  const a = await client().login('admin@example.com', 'wrong password 1');
  const b = await client().login('nobody@example.com', 'wrong password 1');
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.json.error, b.json.error);

  const c = await admin();
  assert.equal((await c.req('GET', '/api/auth/me')).status, 200);
  assert.equal((await c.req('POST', '/api/auth/logout')).status, 204);
  assert.equal((await c.req('GET', '/api/auth/me')).status, 401);
});

test('session cookie is HttpOnly + SameSite=Strict and the database never stores the raw token or password', async () => {
  const c = client();
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.com', password: PASSWORD }) });
  const sc = res.headers.get('set-cookie');
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/);
  const token = sc.split(';')[0].split('=')[1];
  const sessions = app.db.all('SELECT id FROM sessions');
  assert.ok(sessions.every((s) => s.id !== token));
  const u = app.db.get('SELECT password_hash FROM users WHERE email = ?', 'admin@example.com');
  assert.ok(u.password_hash.startsWith('scrypt$') && !u.password_hash.includes(PASSWORD));
  void c;
});

test('contact form: stores a message, validates input, honeypot stores nothing', async () => {
  const c = client();
  const before = app.db.get('SELECT COUNT(*) AS n FROM messages').n;
  assert.equal((await c.req('POST', '/api/contact', { name: 'Rahim', email: 'rahim@example.com', subject: 'Hello', message: 'I would like a logo.' })).status, 201);
  assert.equal(app.db.get('SELECT COUNT(*) AS n FROM messages').n, before + 1);
  const bad = await c.req('POST', '/api/contact', { name: '', email: 'nope', message: 'x' });
  assert.equal(bad.status, 422); assert.ok(bad.json.fields.name && bad.json.fields.email && bad.json.fields.message);
  assert.equal((await c.req('POST', '/api/contact', { name: 'Bot', email: 'bot@example.com', message: 'spam spam', website: 'http://spam' })).status, 201);
  assert.equal(app.db.get('SELECT COUNT(*) AS n FROM messages').n, before + 1);
  const html = await c.req('POST', '/api/contact', { name: '<script>alert(1)</script>', email: 'x@example.com', message: 'hello there' });
  assert.equal(html.status, 201); // stored as plain text; the admin UI only uses textContent
});

test('inbox: staff can list, mark read and delete messages', async () => {
  const a = await admin();
  const list = await a.req('GET', '/api/admin/messages');
  assert.ok(list.json.total >= 2);
  const id = list.json.items[0].id;
  assert.equal((await a.req('PATCH', `/api/admin/messages/${id}`, { is_read: true })).json.is_read, 1);
  assert.equal((await a.req('DELETE', `/api/admin/messages/${id}`)).status, 204);
  assert.equal((await a.req('DELETE', `/api/admin/messages/${id}`)).status, 404);
});

test('projects: create, validate, update, feature, unpublish hides from public site, delete', async () => {
  const a = await admin();
  const bad = await a.req('POST', '/api/admin/projects', { title: 'T', category_id: 'nope', image: 'http://evil/x.png', alt_text: 'a' });
  assert.equal(bad.status, 422); assert.ok(bad.json.fields.image);
  const ok = await a.req('POST', '/api/admin/projects', { title: 'My New Logo', subtitle: 'Logo', category_id: 'branding', image: 'assets/images/og-cover.jpg', alt_text: 'A logo', sort_order: 9 });
  assert.equal(ok.status, 201); assert.equal(ok.json.id, 'my-new-logo');
  const dup = await a.req('POST', '/api/admin/projects', { title: 'My New Logo', category_id: 'branding', image: 'assets/images/og-cover.jpg', alt_text: 'A logo' });
  assert.equal(dup.json.id, 'my-new-logo-2');
  assert.equal((await a.req('POST', '/api/admin/projects/my-new-logo/feature', { featured: true })).json.is_featured, 1);
  let pub = (await client().req('GET', '/api/public')).json.data;
  assert.equal(pub.featuredProjectId, 'my-new-logo');
  assert.equal(app.db.get('SELECT COUNT(*) AS n FROM projects WHERE is_featured = 1').n, 1);
  const upd = await a.req('PUT', '/api/admin/projects/my-new-logo', { title: 'My New Logo', subtitle: 'Logo', category_id: 'branding', image: 'assets/images/og-cover.jpg', alt_text: 'A logo', is_published: false });
  assert.equal(upd.json.is_published, 0); assert.equal(upd.json.is_featured, 0);
  pub = (await client().req('GET', '/api/public')).json.data;
  assert.ok(!pub.projects.some((p) => p.id === 'my-new-logo'));
  assert.equal((await a.req('DELETE', '/api/admin/projects/my-new-logo')).status, 204);
  assert.equal((await a.req('DELETE', '/api/admin/projects/my-new-logo-2')).status, 204);
});

test('categories: cannot delete a category that still has projects (foreign key rule)', async () => {
  const a = await admin();
  const r = await a.req('DELETE', '/api/admin/categories/branding');
  assert.equal(r.status, 409);
  const c = await a.req('POST', '/api/admin/categories', { label: 'Motion Graphics' });
  assert.equal(c.json.id, 'motion-graphics');
  assert.equal((await a.req('DELETE', '/api/admin/categories/motion-graphics')).status, 204);
});

test('services and skills: validation and CRUD', async () => {
  const a = await admin();
  assert.equal((await a.req('POST', '/api/admin/skills', { name: 'Blender', short_label: 'Bl', level: 120 })).status, 422);
  const s = await a.req('POST', '/api/admin/skills', { name: 'Blender', short_label: 'Bl', level: 70, ring: 'A' });
  assert.equal(s.status, 201);
  assert.equal((await a.req('POST', '/api/admin/skills', { name: 'Blender', short_label: 'Bl', level: 70 })).status, 409);
  assert.equal((await a.req('PUT', `/api/admin/skills/${s.json.id}`, { name: 'Blender 3D', short_label: 'Bl', level: 75, ring: 'A' })).json.level, 75);
  assert.equal((await a.req('DELETE', `/api/admin/skills/${s.json.id}`)).status, 204);
  assert.equal((await a.req('POST', '/api/admin/services', { icon: 'javascript:alert(1)', title: 'X', body: 'Y' })).status, 422);
  const sv = await a.req('POST', '/api/admin/services', { icon: 'i-code', title: 'Dev', body: 'Build sites' });
  assert.equal(sv.status, 201);
  assert.equal((await a.req('DELETE', `/api/admin/services/${sv.json.id}`)).status, 204);
  const os = await a.req('POST', '/api/admin/other-skills', { name: 'Illustration' });
  assert.equal((await a.req('DELETE', `/api/admin/other-skills/${os.json.id}`)).status, 204);
});

test('settings: admin can update, values are validated, public site reflects the change', async () => {
  const a = await admin();
  const bad = await a.req('PUT', '/api/admin/settings', { 'social.facebook': 'javascript:alert(1)', 'contact.email': 'nope' });
  assert.equal(bad.status, 422);
  const ok = await a.req('PUT', '/api/admin/settings', { 'owner.name': 'Tabassum Nisha', 'social.x': '', extraLinks: [{ label: 'Behance', url: 'https://behance.net/x' }], unknown: 'ignored' });
  assert.equal(ok.status, 200);
  const pub = (await client().req('GET', '/api/public')).json.config;
  assert.equal(pub.owner.name, 'Tabassum Nisha'); assert.equal(pub.social.x, ''); assert.equal(pub.extraLinks.length, 1);
  assert.equal(app.db.get("SELECT COUNT(*) AS n FROM settings WHERE key = 'unknown'").n, 0);
});

test('uploads: only real images are accepted (checked by content), SVG/HTML are refused, files are served', async () => {
  const a = await admin();
  const good = await a.req('PUT', '/api/admin/upload', PNG, { 'content-type': 'image/png' });
  assert.equal(good.status, 201); assert.match(good.json.path, /^uploads\/[a-f0-9]{24}\.png$/);
  const served = await fetch(base + '/' + good.json.path);
  assert.equal(served.status, 200); assert.equal(served.headers.get('content-type'), 'image/png');
  const fake = await a.req('PUT', '/api/admin/upload', Buffer.from('<svg onload=alert(1)>'.repeat(5)), { 'content-type': 'image/png' });
  assert.equal(fake.status, 415);
  assert.equal((await a.req('PUT', '/api/admin/upload', Buffer.from('<svg/>'), { 'content-type': 'image/svg+xml' })).status, 415);
});

test('users: create, duplicate e-mail, cannot delete or demote yourself, password change signs out other sessions', async () => {
  const a = await admin();
  const me = (await a.req('GET', '/api/auth/me')).json.user;
  assert.equal((await a.req('DELETE', `/api/admin/users/${me.id}`)).status, 400);
  assert.equal((await a.req('PUT', `/api/admin/users/${me.id}`, { name: 'Admin', role: 'editor' })).status, 400);
  assert.equal((await a.req('POST', '/api/admin/users', { email: 'admin@example.com', name: 'Dup', password: 'another-long-password' })).status, 409);
  assert.equal((await a.req('POST', '/api/admin/users', { email: 'weak@example.com', name: 'Weak', password: 'short' })).status, 422);

  const other = await admin();                       // a second session of the same user
  assert.equal((await a.req('POST', '/api/auth/password', { current: PASSWORD, next: PASSWORD })).status, 204);
  assert.equal((await other.req('GET', '/api/auth/me')).status, 401);
  assert.equal((await a.req('GET', '/api/auth/me')).status, 200);
  assert.equal((await a.req('POST', '/api/auth/password', { current: 'wrong', next: 'a-new-long-password' })).status, 403);
});

test('disabling a user ends their sessions immediately', async () => {
  const a = await admin();
  const u = await a.req('POST', '/api/admin/users', { email: 'temp@example.com', name: 'Temp', password: 'temp-password-123' });
  const t = client(); assert.equal((await t.login('temp@example.com', 'temp-password-123')).status, 200);
  assert.equal((await a.req('PUT', `/api/admin/users/${u.json.id}`, { name: 'Temp', role: 'editor', is_active: false })).status, 200);
  assert.equal((await t.req('GET', '/api/auth/me')).status, 401);
  assert.equal((await client().login('temp@example.com', 'temp-password-123')).status, 401);
});

test('static files: site and admin panel load; path traversal and dot-files are blocked; security headers present', async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(base + '/admin/')).status, 200);
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/css/../../package.json', '/.env', '/uploads/../portfolio.db', '/server/app.js']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 404, p);
  }
});

test('rate limiting: repeated logins are throttled when enabled', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pcms-rl-'));
  const rl = createApp(load({ DATA_DIR: d, RATE_LIMIT: 'true', PORT: '0' }));
  await new Promise((r) => rl.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${rl.server.address().port}/api/auth/login`;
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co', password: 'x' }) })).status);
  assert.equal(codes[0], 401); assert.equal(codes[11], 429);
  await rl.close(); fs.rmSync(d, { recursive: true, force: true });
});
