'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/uploads.js — image uploads: type is decided by the file's magic bytes, never by its name or header. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { HttpError } = require('./validate');

function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.length > 12 && /^GIF8[79]a/.test(buf.subarray(0, 6).toString('latin1'))) return 'gif';
  return null; // SVG, HTML and everything else are refused on purpose (script risk)
}

function createStore(dataDir, db) {
  const dir = path.join(dataDir, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    save(buf) {
      const ext = sniff(buf);
      if (!ext) throw new HttpError(415, 'Only JPG, PNG, WebP or GIF images are accepted.');
      const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
      fs.writeFileSync(path.join(dir, name), buf, { flag: 'wx' });
      return 'uploads/' + name;
    },
    /* Deletes an uploaded file once nothing references it any more. Bundled sample images are never touched. */
    release(rel) {
      if (typeof rel !== 'string' || !/^uploads\/[A-Za-z0-9._-]+$/.test(rel)) return;
      const used = db.get('SELECT (SELECT COUNT(*) FROM projects WHERE image = ?) + (SELECT COUNT(*) FROM settings WHERE value = ?) AS n', rel, rel).n;
      if (used === 0) fs.rm(path.join(dir, path.basename(rel)), { force: true }, () => {});
    }
  };
}

module.exports = { createStore, sniff };
