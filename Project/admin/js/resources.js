/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* admin/js/resources.js — one generic list + add/edit/delete screen, configured per content type. */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;

  var ICONS = [['i-briefcase', 'Briefcase'], ['i-image', 'Image'], ['i-code', 'Code'], ['i-globe', 'Globe'], ['i-heart', 'Heart'], ['i-rocket', 'Rocket']];
  var sortField = { name: 'sort_order', label: 'Order', type: 'number', min: 0, max: 9999, help: 'Lower numbers appear first.' };

  /* Each config: path, title, singular, fields(ctx), row(item,ctx), load(): extra data needed by fields/rows. */
  var RESOURCES = {
    categories: {
      title: 'Categories', singular: 'category', path: '/admin/categories',
      fields: function () { return [{ name: 'label', label: 'Name', required: true, max: 60 }, sortField]; },
      row: function (i) { return { title: i.label, meta: 'ID: ' + i.id + ' · order ' + i.sort_order }; }
    },
    projects: {
      title: 'Projects', singular: 'project', path: '/admin/projects', needs: ['categories'],
      fields: function (ctx) {
        return [
          { name: 'title', label: 'Title', required: true, max: 120 },
          { name: 'subtitle', label: 'Subtitle', max: 120 },
          { name: 'category_id', label: 'Category', type: 'select', required: true, options: ctx.categories.map(function (c) { return { value: c.id, label: c.label }; }) },
          { name: 'image', label: 'Image', type: 'image', required: true, help: 'JPG, PNG, WebP or GIF, up to 5 MB. Landscape 4:3 looks best (about 1200×900).' },
          { name: 'alt_text', label: 'Image description (alt text)', required: true, max: 255, help: 'Describe the image for visitors who cannot see it.' },
          sortField,
          { name: 'is_published', label: 'Published (visible on the website)', type: 'checkbox' }
        ];
      },
      defaults: { is_published: true, sort_order: 0 },
      row: function (i, ctx) {
        var cat = ctx.categories.filter(function (c) { return c.id === i.category_id; })[0];
        return {
          thumb: '/' + i.image, title: i.title, meta: [i.subtitle, cat ? cat.label : i.category_id, i.is_published ? 'Published' : 'Hidden', i.is_featured ? '★ Featured' : ''].filter(Boolean).join(' · '),
          actions: [{ label: i.is_featured ? 'Unfeature' : 'Feature', run: function () { return A.api('POST', '/admin/projects/' + encodeURIComponent(i.id) + '/feature', { featured: !i.is_featured }); } }]
        };
      }
    },
    services: {
      title: 'Services', singular: 'service', path: '/admin/services',
      fields: function () {
        return [
          { name: 'title', label: 'Title', required: true, max: 120 },
          { name: 'body', label: 'Description', type: 'textarea', required: true, max: 400, rows: 3 },
          { name: 'icon', label: 'Icon', type: 'select', options: ICONS.map(function (x) { return { value: x[0], label: x[1] }; }) },
          sortField
        ];
      },
      row: function (i) { return { title: i.title, meta: i.body }; }
    },
    skills: {
      title: 'Skills', singular: 'skill', path: '/admin/skills',
      fields: function () {
        return [
          { name: 'name', label: 'Skill name', required: true, max: 60 },
          { name: 'short_label', label: 'Short label (inside the ring)', required: true, max: 10 },
          { name: 'level', label: 'Level (0–100)', type: 'number', required: true, min: 0, max: 100 },
          { name: 'ring', label: 'Ring colour', type: 'select', options: [{ value: 'A', label: 'Style A' }, { value: 'B', label: 'Style B' }] },
          sortField
        ];
      },
      defaults: { level: 80, ring: 'B', sort_order: 0 },
      row: function (i) { return { title: i.name + ' — ' + i.level + '%', meta: 'Label ' + i.short_label + ' · ring ' + i.ring }; }
    },
    'other-skills': {
      title: 'Other skills', singular: 'skill tag', path: '/admin/other-skills',
      fields: function () { return [{ name: 'name', label: 'Name', required: true, max: 60 }, sortField]; },
      defaults: { sort_order: 0 },
      row: function (i) { return { title: i.name, meta: 'Order ' + i.sort_order }; }
    }
  };

  function render(key, root) {
    var cfg = RESOURCES[key], list = h('ul', { class: 'rows' }), ctx = {};
    var addBtn = h('button', { type: 'button', class: 'btn primary', on: { click: function () { openForm(null); } } }, '+ Add ' + cfg.singular);
    A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, cfg.title), addBtn), list);

    function load() {
      var needs = (cfg.needs || []).map(function (n) { return A.api('GET', RESOURCES[n].path).then(function (r) { ctx[n] = r.items; }); });
      return Promise.all(needs.concat(A.api('GET', cfg.path).then(function (r) { ctx.items = r.items; }))).then(paint).catch(A.fail);
    }

    function paint() {
      A.clear(list);
      if (!ctx.items.length) list.appendChild(h('li', { class: 'empty' }, 'Nothing here yet. Use “Add ' + cfg.singular + '” to create the first one.'));
      ctx.items.forEach(function (item) {
        var r = cfg.row(item, ctx), pk = item.id;
        var actions = (r.actions || []).map(function (a) { return h('button', { type: 'button', class: 'btn small ghost', on: { click: function (e) { e.target.disabled = true; a.run().then(load).catch(function (err) { e.target.disabled = false; A.fail(err); }); } } }, a.label); });
        actions.push(h('button', { type: 'button', class: 'btn small ghost', on: { click: function () { openForm(item); } } }, 'Edit'));
        actions.push(h('button', { type: 'button', class: 'btn small danger-ghost', on: { click: function () { remove(item, r.title); } } }, 'Delete'));
        list.appendChild(h('li', { class: 'row' },
          r.thumb ? h('img', { class: 'thumb', src: r.thumb, alt: '', loading: 'lazy' }) : null,
          h('div', { class: 'row-main' }, h('strong', {}, r.title), h('span', { class: 'meta' }, r.meta || '')),
          h('div', { class: 'row-actions' }, actions)));
        void pk;
      });
    }

    function openForm(item) {
      var fields = cfg.fields(ctx);
      if (key === 'projects' && !ctx.categories.length) return A.toast('Create a category first.', 'error');
      A.formDialog({
        title: (item ? 'Edit ' : 'Add ') + cfg.singular, fields: fields, values: item || cfg.defaults || {},
        onSubmit: function (data) {
          var p = item ? A.api('PUT', cfg.path + '/' + encodeURIComponent(item.id), data) : A.api('POST', cfg.path, data);
          return p.then(function () { A.toast('Saved.'); return load(); });
        }
      });
    }

    function remove(item, name) {
      A.confirm('Delete “' + name + '”? This cannot be undone.').then(function (yes) {
        if (!yes) return;
        A.api('DELETE', cfg.path + '/' + encodeURIComponent(item.id)).then(function () { A.toast('Deleted.'); return load(); }).catch(A.fail);
      });
    }

    load();
  }

  A.resources = { keys: Object.keys(RESOURCES), titles: Object.keys(RESOURCES).reduce(function (o, k) { o[k] = RESOURCES[k].title; return o; }, {}), render: render };
})();
