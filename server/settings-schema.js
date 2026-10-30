'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/settings-schema.js — the whitelist of editable site settings (key -> validation rule) and their groups. */
const { validate, HttpError } = require('./validate');

const SCHEMA = {
  'owner.name':       { type: 'string', required: true, max: 120 },
  'owner.initials':   { type: 'string', max: 6 },
  'owner.role':       { type: 'string', max: 120 },
  'owner.intro':      { type: 'text', max: 400 },
  'owner.about':      { type: 'text', max: 800 },
  'owner.tagline':    { type: 'string', max: 200 },
  'owner.quote':      { type: 'string', max: 300 },
  'owner.location':   { type: 'string', max: 120 },
  'owner.experience': { type: 'string', max: 40 },
  'images.hero':      { type: 'image' },
  'images.about':     { type: 'image' },
  'contact.whatsappNumber':   { type: 'phone' },
  'contact.whatsappGreeting': { type: 'string', max: 300 },
  'contact.email':    { type: 'email' },
  'contact.website':  { type: 'url' },
  'social.facebook':  { type: 'url' },
  'social.x':         { type: 'url' },
  'social.instagram': { type: 'url' },
  'social.github':    { type: 'url' },
  'social.telegram':  { type: 'url' },
  'social.reddit':    { type: 'url' },
  'site.title':       { type: 'string', required: true, max: 120 },
  'site.description': { type: 'string', max: 300 },
  'site.footerQuote': { type: 'string', max: 120 },
  'site.formNote':    { type: 'string', max: 300 },
  'site.featuredText': { type: 'text', max: 400 }
};
const IMAGE_KEYS = ['images.hero', 'images.about'];
const MAX_EXTRA_LINKS = 6;

/* extraLinks is stored as a JSON string: [{label, url}] */
function parseExtraLinks(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > MAX_EXTRA_LINKS) throw new HttpError(422, 'Please correct the highlighted fields.', { extraLinks: `Provide at most ${MAX_EXTRA_LINKS} links.` });
  const links = input.map((l) => validate(l, { label: { type: 'string', required: true, max: 60 }, url: { type: 'url', required: true, max: 500 } }));
  return JSON.stringify(links);
}

/* Validates a partial settings object ({ "owner.name": "...", extraLinks: [...] }); returns { key: stringValue }. */
function validateSettings(body) {
  const picked = {};
  for (const k of Object.keys(SCHEMA)) if (body && Object.prototype.hasOwnProperty.call(body, k)) picked[k] = body[k];
  const rules = {};
  for (const k of Object.keys(picked)) rules[k] = SCHEMA[k];
  const out = validate(picked, rules);
  const links = parseExtraLinks(body && body.extraLinks);
  if (links !== undefined) out.extraLinks = links;
  return out;
}

/* Builds the nested config object the public site uses, from flat key/value rows. */
function toConfig(rows) {
  const flat = {};
  rows.forEach((r) => { flat[r.key] = r.value; });
  const nested = { owner: {}, images: {}, contact: {}, social: {}, site: {}, extraLinks: [] };
  for (const [k, v] of Object.entries(flat)) {
    if (k === 'extraLinks') { try { nested.extraLinks = JSON.parse(v); } catch (_) { nested.extraLinks = []; } continue; }
    const [group, name] = k.split('.');
    if (nested[group] && name) nested[group][name] = v;
  }
  return nested;
}

module.exports = { SCHEMA, IMAGE_KEYS, validateSettings, toConfig };
