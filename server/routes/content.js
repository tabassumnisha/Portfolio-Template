'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/routes/content.js — categories, projects, services, skills, other skills (all staff-only). */
const { crud } = require('./crud');
const { HttpError, validate } = require('../validate');
const { readJson } = require('../http');

const ICONS = ['i-briefcase', 'i-image', 'i-code', 'i-globe', 'i-heart', 'i-rocket'];
const order = { type: 'int', min: 0, max: 9999, default: 0 };

function register(router, ctx) {
  const { db, uploads } = ctx;

  crud(router, ctx, {
    path: 'categories', table: 'categories', pk: 'id', pkType: 'slug', slugFrom: 'label', orderBy: 'sort_order, label',
    fields: { label: { type: 'string', required: true, max: 60 }, sort_order: order },
    beforeDelete(row) {
      const n = db.get('SELECT COUNT(*) AS n FROM projects WHERE category_id = ?', row.id).n;
      if (n) throw new HttpError(409, `This category still has ${n} project(s). Move or delete them first.`);
    }
  });

  crud(router, ctx, {
    path: 'projects', table: 'projects', pk: 'id', pkType: 'slug', slugFrom: 'title', orderBy: 'sort_order, title',
    fields: {
      title: { type: 'string', required: true, max: 120 },
      subtitle: { type: 'string', max: 120 },
      category_id: { type: 'slug', required: true, max: 60 },
      image: { type: 'image', required: true },
      alt_text: { type: 'string', required: true, max: 255 },
      sort_order: order,
      is_published: { type: 'bool', default: 1 }
    },
    beforeSave(data, existing) {
      if (!db.get('SELECT 1 AS x FROM categories WHERE id = ?', data.category_id)) throw new HttpError(422, 'Please correct the highlighted fields.', { category_id: 'Choose an existing category.' });
      if (existing && existing.is_featured && !data.is_published) db.run('UPDATE projects SET is_featured = 0 WHERE id = ?', existing.id);
    },
    afterChange(before, after) { if (!after || after.image !== before.image) uploads.release(before.image); }
  });

  /* Mark one project as the featured one (or clear it). At most one can be featured (unique index + transaction). */
  router.add('POST', '/api/admin/projects/:id/feature', 'staff', async (req, res, p) => {
    const { featured } = validate(await readJson(req), { featured: { type: 'bool', default: 1 } });
    const row = db.get('SELECT * FROM projects WHERE id = ?', p.id);
    if (!row) throw new HttpError(404, 'Not found.');
    if (featured && !row.is_published) throw new HttpError(422, 'Publish the project before featuring it.');
    db.tx(() => {
      db.run('UPDATE projects SET is_featured = 0 WHERE is_featured = 1');
      if (featured) db.run('UPDATE projects SET is_featured = 1 WHERE id = ?', row.id);
    });
    return db.get('SELECT * FROM projects WHERE id = ?', row.id);
  });

  crud(router, ctx, {
    path: 'services', table: 'services', pk: 'id', pkType: 'int',
    fields: {
      icon: { type: 'enum', values: ICONS, default: 'i-briefcase' },
      title: { type: 'string', required: true, max: 120 },
      body: { type: 'text', required: true, max: 400 },
      sort_order: order
    }
  });

  crud(router, ctx, {
    path: 'skills', table: 'skills', pk: 'id', pkType: 'int',
    fields: {
      name: { type: 'string', required: true, max: 60 },
      short_label: { type: 'string', required: true, max: 10 },
      level: { type: 'int', required: true, min: 0, max: 100 },
      ring: { type: 'enum', values: ['A', 'B'], default: 'B' },
      sort_order: order
    }
  });

  crud(router, ctx, {
    path: 'other-skills', table: 'other_skills', pk: 'id', pkType: 'int',
    fields: { name: { type: 'string', required: true, max: 60 }, sort_order: order }
  });
}

module.exports = { register, ICONS };
