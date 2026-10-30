'use strict';
/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* server/validate.js — tiny schema validator. Unknown fields are dropped; errors are collected per field. */

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@.]{2,}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_RE = /^(assets\/images|uploads)\/[A-Za-z0-9._-]{1,120}$/;
const URL_RE = /^https?:\/\/[^\s<>"']{1,500}$/i;
const CTRL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/* rule: { type: 'string'|'int'|'bool'|'email'|'url'|'slug'|'image'|'enum'|'phone', required, min, max, values, default } */
function validate(input, rules) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {}, errors = {};
  for (const [key, r] of Object.entries(rules)) {
    let v = body[key];
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (empty) {
      if (r.required) errors[key] = 'This field is required.';
      else if (r.default !== undefined) out[key] = r.default;
      else if (['string', 'text', 'url', 'email', 'phone'].includes(r.type)) out[key] = '';
      continue;
    }
    switch (r.type) {
      case 'int': {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isInteger(n)) { errors[key] = 'Must be a whole number.'; break; }
        if ((r.min != null && n < r.min) || (r.max != null && n > r.max)) { errors[key] = `Must be between ${r.min} and ${r.max}.`; break; }
        out[key] = n; break;
      }
      case 'bool':
        if (v === true || v === 1 || v === '1' || v === 'true') out[key] = 1;
        else if (v === false || v === 0 || v === '0' || v === 'false') out[key] = 0;
        else errors[key] = 'Must be true or false.';
        break;
      case 'enum':
        if (r.values.includes(v)) out[key] = v; else errors[key] = 'Not an allowed value.';
        break;
      default: {
        if (typeof v !== 'string') { errors[key] = 'Must be text.'; break; }
        v = v.trim();
        if (CTRL_RE.test(v)) { errors[key] = 'Contains invalid characters.'; break; }
        if (r.type !== 'text' && /[\r\n]/.test(v)) { errors[key] = 'Must be a single line.'; break; }
        const max = r.max || 500;
        if (v.length > max) { errors[key] = `Must be at most ${max} characters.`; break; }
        if (r.min && v.length < r.min) { errors[key] = `Must be at least ${r.min} characters.`; break; }
        if (r.type === 'email' && !EMAIL_RE.test(v)) errors[key] = 'Enter a valid e-mail address.';
        else if (r.type === 'url' && !URL_RE.test(v)) errors[key] = 'Must start with http:// or https://';
        else if (r.type === 'slug' && !SLUG_RE.test(v)) errors[key] = 'Use lowercase letters, numbers and hyphens only.';
        else if (r.type === 'image' && !IMAGE_RE.test(v)) errors[key] = 'Choose an uploaded image.';
        else if (r.type === 'phone' && !/^\+?[0-9 ()-]{3,24}$/.test(v)) errors[key] = 'Enter a phone number such as +8801XXXXXXXXX.';
        else out[key] = v;
      }
    }
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'Please correct the highlighted fields.', errors);
  return out;
}

function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

module.exports = { validate, slugify, HttpError, EMAIL_RE, IMAGE_RE };
