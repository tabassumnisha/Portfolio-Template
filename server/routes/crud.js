'use strict';
/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* server/routes/crud.js — one generic list/get/create/update/delete route set for a content table.
   Column names come only from the spec in the code (never from the request); values are always bound parameters. */
const { validate, slugify, HttpError } = require('../validate');
const { readJson } = require('../http');

function crud(router, ctx, spec) {
  const { db } = ctx;
  const base = '/api/admin/' + spec.path;
  const names = Object.keys(spec.fields);
  const slug = spec.pkType === 'slug';
  const order = spec.orderBy || 'sort_order, ' + spec.pk;

  const find = (id) => {
    const row = db.get(`SELECT * FROM ${spec.table} WHERE ${spec.pk} = ?`, slug ? String(id) : Number(id));
    if (!row) throw new HttpError(404, 'Not found.');
    return row;
  };

  router.add('GET', base, 'staff', () => ({ items: db.all(`SELECT * FROM ${spec.table} ORDER BY ${order}`) }));
  router.add('GET', base + '/:id', 'staff', (req, res, p) => find(p.id));

  router.add('POST', base, 'staff', async (req) => {
    const body = await readJson(req);
    const data = validate(body, spec.fields);
    if (spec.beforeSave) spec.beforeSave(data, null);
    return db.tx(() => {
      let id;
      if (slug) {
        const wanted = body.id ? validate({ id: body.id }, { id: { type: 'slug', max: 60 } }).id : slugify(data[spec.slugFrom]);
        if (!wanted) throw new HttpError(422, 'Please correct the highlighted fields.', { [spec.slugFrom]: 'Use letters or numbers so a URL name can be made.' });
        id = wanted;
        if (!body.id) for (let i = 2; db.get(`SELECT 1 AS x FROM ${spec.table} WHERE ${spec.pk} = ?`, id); i++) id = `${wanted}-${i}`.slice(0, 60);
        else if (db.get(`SELECT 1 AS x FROM ${spec.table} WHERE ${spec.pk} = ?`, id)) throw new HttpError(409, 'That ID is already used.', { id: 'Already used.' });
        db.run(`INSERT INTO ${spec.table} (${spec.pk}, ${names.join(', ')}) VALUES (?, ${names.map(() => '?').join(', ')})`, id, ...names.map((n) => data[n]));
      } else {
        id = Number(db.run(`INSERT INTO ${spec.table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`, ...names.map((n) => data[n])).lastInsertRowid);
      }
      return { status: 201, body: find(id) };
    });
  });

  router.add('PUT', base + '/:id', 'staff', async (req, res, p) => {
    const existing = find(p.id);
    const data = validate(await readJson(req), spec.fields);
    if (spec.beforeSave) spec.beforeSave(data, existing);
    db.run(`UPDATE ${spec.table} SET ${names.map((n) => n + ' = ?').join(', ')} WHERE ${spec.pk} = ?`, ...names.map((n) => data[n]), existing[spec.pk]);
    if (spec.afterChange) spec.afterChange(existing, data);
    return find(existing[spec.pk]);
  });

  router.add('DELETE', base + '/:id', 'staff', (req, res, p) => {
    const existing = find(p.id);
    if (spec.beforeDelete) spec.beforeDelete(existing);
    db.run(`DELETE FROM ${spec.table} WHERE ${spec.pk} = ?`, existing[spec.pk]);
    if (spec.afterChange) spec.afterChange(existing, null);
    return { status: 204 };
  });
}

module.exports = { crud };
