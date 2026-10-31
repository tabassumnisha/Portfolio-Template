'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/http.js — minimal router, body readers, cookies, security headers and a rate limiter (no dependencies). */
const { HttpError } = require('./validate');

/* Every route is declared with an explicit access level: 'public' | 'staff' | 'admin'.
   The registry is exported so the test-suite can prove that no mutating route is unguarded. */
class Router {
  constructor() { this.routes = []; }
  add(method, pattern, access, handler, opts) {
    if (!['public', 'staff', 'admin'].includes(access)) throw new Error('Route needs an access level: ' + pattern);
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, pattern, access, handler, re, keys, opts: opts || {} });
  }
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => { try { params[k] = decodeURIComponent(m[i + 1]); } catch (_) { params[k] = m[i + 1]; } });
      return { route: r, params };
    }
    return { route: null, pathMatched };
  }
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (_) { /* ignore malformed cookie */ } }
  });
  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = parseInt(req.headers['content-length'] || '0', 10);
    if (declared > limit) { req.resume(); return reject(new HttpError(413, 'The request body is too large.')); }
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { req.destroy(); return reject(new HttpError(413, 'The request body is too large.')); }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req, limit = 100 * 1024) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new HttpError(415, 'Send the request as application/json.');
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch (_) { throw new HttpError(400, 'Invalid JSON.'); }
}

function sendJson(res, status, data, headers) {
  const body = JSON.stringify(data);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' }, headers || {}));
  res.end(body);
}

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "object-src 'none'",
  "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
].join('; ');

function securityHeaders(res, secure) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
}

/* Fixed-window limiter, in memory (one process). Returns true when the request is allowed. */
function createLimiter() {
  const hits = new Map();
  return function allow(key, max, windowMs) {
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.reset <= now) { e = { n: 0, reset: now + windowMs }; hits.set(key, e); }
    e.n += 1;
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    return e.n <= max;
  };
}

module.exports = { Router, parseCookies, readBody, readJson, sendJson, securityHeaders, createLimiter, HttpError };
