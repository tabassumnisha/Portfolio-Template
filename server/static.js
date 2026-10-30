'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/static.js — serves Project/ and uploaded images. Blocks path traversal and dot-files. */
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

function resolveSafe(root, rel) {
  let decoded;
  try { decoded = decodeURIComponent(rel); } catch (_) { return null; }
  if (decoded.includes('\0')) return null;
  const parts = decoded.split('/').filter(Boolean);
  if (parts.some((p) => p === '..' || p.startsWith('.'))) return null;
  const full = path.join(root, ...parts);
  return full === root || full.startsWith(root + path.sep) ? full : null;
}

function serve(req, res, pathname, cfg, uploadsDir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let root = cfg.publicDir, rel = pathname, isUpload = false;
  if (pathname.startsWith('/uploads/')) { root = uploadsDir; rel = pathname.slice('/uploads/'.length); isUpload = true; }
  if (pathname === '/admin') { res.writeHead(301, { Location: '/admin/' }); return res.end(); }
  let file = resolveSafe(root, rel);
  if (!file) return notFound(res);
  let st;
  try { st = fs.statSync(file); if (st.isDirectory()) { file = path.join(file, 'index.html'); st = fs.statSync(file); } } catch (_) { return notFound(res); }
  if (!st.isFile()) return notFound(res);
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext];
  if (!type) return notFound(res);
  const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': type, 'Content-Length': st.size, ETag: etag,
    'Cache-Control': ext === '.html' ? 'no-cache' : isUpload ? 'public, max-age=86400' : 'public, max-age=300'
  };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); return res.end(); }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

function notFound(res) {
  const body = 'Not found';
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.length });
  res.end(body);
}

module.exports = { serve };
