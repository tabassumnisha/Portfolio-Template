'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/app.js — builds the HTTP server: security headers, CSRF/origin checks, auth + role guard, routing, static files. */
const http = require('node:http');
const dbModule = require('./db');
const auth = require('./auth');
const staticFiles = require('./static');
const uploadsModule = require('./uploads');
const { Router, parseCookies, sendJson, securityHeaders, createLimiter, HttpError } = require('./http');

function clientIp(req, cfg) {
  if (cfg.trustProxy) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xff) return xff;
  }
  return req.socket.remoteAddress || 'unknown';
}

function createApp(cfg) {
  const db = dbModule.open(cfg);
  const uploads = uploadsModule.createStore(cfg.dataDir, db);
  const router = new Router();
  const limiter = createLimiter();
  const ctx = { cfg, db, uploads };

  require('./routes/public').register(router, ctx);
  require('./routes/admin').register(router, ctx);
  require('./routes/content').register(router, ctx);
  ensureFirstAdmin(cfg, db);

  const isSecure = (req) => cfg.cookieSecure === 'true' || (cfg.cookieSecure === 'auto' && (req.socket.encrypted || (cfg.trustProxy && req.headers['x-forwarded-proto'] === 'https')));

  async function handleApi(req, res, url) {
    const secure = isSecure(req);
    const mutating = req.method !== 'GET' && req.method !== 'HEAD';

    /* Cross-site requests: a browser always sends Origin on cross-origin writes. Refuse when it is not this host. */
    if (mutating && req.headers.origin) {
      let originHost = '';
      try { originHost = new URL(req.headers.origin).host; } catch (_) { /* invalid origin -> mismatch */ }
      if (originHost !== req.headers.host) throw new HttpError(403, 'Cross-site request refused.');
    }

    const m = router.match(req.method, url.pathname);
    if (!m.route) throw new HttpError(m.pathMatched ? 405 : 404, m.pathMatched ? 'Method not allowed.' : 'Not found.');
    const { route, params } = m;

    let authCtx = null;
    if (route.access !== 'public') {
      authCtx = auth.findSession(db, parseCookies(req.headers.cookie)[auth.COOKIE]);
      if (!authCtx) throw new HttpError(401, 'Please sign in.');
      if (route.access === 'admin' && authCtx.user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
      if (mutating && !auth.safeEqual(req.headers['x-csrf-token'], authCtx.session.csrf)) throw new HttpError(403, 'Security token missing or invalid. Reload the page.');
    }

    if (cfg.rateLimit && route.opts.limit) {
      const ip = clientIp(req, cfg);
      for (const l of route.opts.limit) {
        if (!limiter(l.global ? l.bucket : `${l.bucket}:${ip}`, l.max, l.windowMs)) throw new HttpError(429, 'Too many requests. Please try again later.');
      }
    }

    const result = await route.handler(req, res, params, authCtx, url);
    /* A handler returns plain data (-> 200 JSON) or an envelope { status: <number>, body, cookie, clearCookie }. */
    const env = result && typeof result.status === 'number' ? result : { status: 200, body: result };
    if (env.body && env.body.cookie) throw new Error('Handler leaked a cookie object into a response body.');
    const headers = {};
    if (env.cookie) headers['Set-Cookie'] = auth.cookieHeader(env.cookie.token, env.cookie.maxAge, secure);
    if (env.clearCookie) headers['Set-Cookie'] = auth.cookieHeader('', 0, secure);
    if (env.status === 204 || env.body === undefined) { res.writeHead(env.status === 200 ? 204 : env.status, Object.assign({ 'Cache-Control': 'no-store' }, headers)); return res.end(); }
    sendJson(res, env.status, env.body, headers);
  }

  const server = http.createServer(async (req, res) => {
    securityHeaders(res, isSecure(req));
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (_) { return sendJson(res, 400, { error: 'Bad request.' }); }
    try {
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
      else staticFiles.serve(req, res, url.pathname, cfg, uploads.dir);
    } catch (err) {
      if (res.headersSent) return res.destroy();
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message, fields: err.fields });
      const msg = String(err && err.message);
      if (/UNIQUE constraint failed/.test(msg)) return sendJson(res, 409, { error: 'That value is already used.' });
      if (/FOREIGN KEY constraint failed/.test(msg)) return sendJson(res, 409, { error: 'This item is still in use by other records.' });
      console.error('[error]', req.method, url.pathname, err);
      sendJson(res, 500, { error: 'Something went wrong on the server.' });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;

  return { server, db, router, ctx, close: () => new Promise((r) => server.close(() => { db.close(); r(); })) };
}

/* Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD, only while no user exists. */
function ensureFirstAdmin(cfg, db) {
  if (db.get('SELECT COUNT(*) AS n FROM users').n > 0) return;
  if (!cfg.adminEmail || !cfg.adminPassword) {
    console.warn('[setup] No user exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or run: npm run create-admin');
    return;
  }
  auth.checkPasswordStrength(cfg.adminPassword);
  db.run('INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)', cfg.adminEmail.trim(), cfg.adminName, 'admin', auth.hashPassword(cfg.adminPassword));
  console.log(`[setup] Administrator account created for ${cfg.adminEmail.trim()}. Remove ADMIN_PASSWORD from .env now.`);
}

module.exports = { createApp };
