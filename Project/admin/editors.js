/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* admin/editors.js — one editor per content section. Each returns a DOM element and edits Admin.state in place. */
(function () {
  'use strict';
  var A = window.Admin, h = A.h, E = A.editors = {};
  var ICONS = [['i-briefcase', 'Briefcase'], ['i-image', 'Image'], ['i-heart', 'Heart'], ['i-code', 'Code'], ['i-globe', 'Globe'], ['i-rocket', 'Rocket']];

  /* Reorder / delete buttons shared by every list card. */
  function controls(list, index, rerender, extra) {
    function move(by) { var t = index + by; if (t < 0 || t >= list.length) return; list.splice(t, 0, list.splice(index, 1)[0]); rerender(); }
    return h('div', { class: 'row-actions' }, [
      A.button('Move up', function () { move(-1); }, 'secondary'),
      A.button('Move down', function () { move(1); }, 'secondary'),
      A.button('Delete', function () { if (extra && extra() === false) return; list.splice(index, 1); rerender(); }, 'danger')
    ]);
  }

  function card(title, children) {
    return h('fieldset', { class: 'card' }, [h('legend', { text: title })].concat(children));
  }

  /* Image chooser: a list of the bundled and uploaded files, plus an "Upload new image" button. */
  function imagePicker(label, obj, key, prefix, onChange) {
    var current = function () { return String(obj[key] || '').replace(prefix, ''); };
    var holder = h('div', { class: 'field' });
    var status = h('span', { class: 'status', role: 'status' });
    function draw() {
      var names = A.state.images.slice();
      if (current() && names.indexOf(current()) === -1) names.push(current());
      var preview = h('img', { class: 'thumb', alt: 'Preview of ' + current(), src: '/assets/images/' + current() });
      var holderSelect = { v: current() };
      var sel = A.select(label, holderSelect, 'v', names.map(function (n) { return [n, n]; }), function (v) {
        obj[key] = prefix + v; preview.src = '/assets/images/' + v; if (onChange) onChange();
      });
      var file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', class: 'sr-only', 'aria-label': 'Upload an image for ' + label });
      file.addEventListener('change', function () {
        if (!file.files[0]) return;
        A.say(status, 'Uploading…', true);
        A.upload(file.files[0]).then(function (d) {
          A.state.images.push(d.file); obj[key] = prefix + d.file; if (onChange) onChange(); draw();
        }).catch(function (e) { A.say(status, e.message, false); });
      });
      holder.replaceChildren(sel, preview, h('div', { class: 'row-actions' }, [h('label', { class: 'button secondary', text: 'Upload new image' }, [file]), status]));
    }
    draw();
    return holder;
  }

  /* ---------- Site profile (config) ---------- */
  E.profile = function (done) {
    var c = A.state.config, root = h('div');
    function group(title, section, fields) {
      root.appendChild(card(title, fields.map(function (f) {
        return A.field(f[1], c[section], f[0], { long: f[2], max: f[3] });
      })));
    }
    group('Owner', 'owner', [['name', 'Full name', 0, 80], ['initials', 'Initials (1-3 letters)', 0, 3], ['role', 'Role / job title', 0, 100],
      ['intro', 'Hero introduction', 1, 400], ['about', 'About text', 1, 800], ['tagline', 'About tagline', 0, 200], ['quote', 'Quote', 1, 300],
      ['location', 'Location', 0, 100], ['experience', 'Experience', 0, 40]]);
    root.appendChild(card('Images', [imagePicker('Hero portrait', c.images, 'hero', 'assets/images/'), imagePicker('About photo', c.images, 'about', 'assets/images/')]));
    group('Contact', 'contact', [['whatsappNumber', 'WhatsApp number (international format, e.g. +10000000000)', 0, 24],
      ['whatsappGreeting', 'WhatsApp greeting text', 1, 300], ['email', 'E-mail address', 0, 260], ['website', 'Website (https://…)', 0, 300]]);
    group('Social links (leave empty to hide an icon)', 'social', ['facebook', 'x', 'instagram', 'github', 'telegram', 'reddit'].map(function (n) { return [n, n.charAt(0).toUpperCase() + n.slice(1) + ' URL', 0, 300]; }));
    group('Page texts', 'site', [['title', 'Browser tab title', 0, 120], ['description', 'Meta description', 1, 300], ['footerQuote', 'Footer quote', 0, 120], ['formNote', 'Note under the contact form', 1, 300]]);
    var links = c.extraLinks = c.extraLinks || [];
    root.appendChild(card('Extra link chips', links.map(function (l, i) {
      return h('div', { class: 'inline' }, [A.field('Label', l, 'label', { max: 40 }), A.field('URL', l, 'url', { max: 300 }), A.button('Remove', function () { links.splice(i, 1); done(); }, 'danger')]);
    }).concat([A.button('Add link', function () { if (links.length < 12) links.push({ label: '', url: '' }); done(); }, 'secondary')])));
    return root;
  };

  /* ---------- Categories ---------- */
  E.categories = function (rerender) {
    var p = A.state.portfolio, list = p.categories, root = h('div');
    list.forEach(function (cat, i) {
      root.appendChild(card(cat.label || 'New category', [
        A.field('Name shown on the filter button', cat, 'label', { max: 40 }),
        h('p', { class: 'muted', text: 'Internal id (fixed, used by projects): ' + cat.id }),
        controls(list, i, rerender, function () {
          if (p.projects.some(function (x) { return x.category === cat.id; })) { alert('Move or delete the projects in this category first.'); return false; }
        })
      ]));
    });
    root.appendChild(A.button('Add category', function () { list.push({ id: A.uniqueId('category', list.map(function (x) { return x.id; })), label: 'New category' }); rerender(); }, 'secondary'));
    return root;
  };

  /* ---------- Projects ---------- */
  E.projects = function (rerender) {
    var p = A.state.portfolio, list = p.projects, root = h('div');
    root.appendChild(A.field('Featured project text (shown beside the featured work)', p, 'featuredText', { long: true, max: 500 }));
    list.forEach(function (item, i) {
      var radio = h('input', { type: 'radio', name: 'featured', id: 'feat' + i });
      radio.checked = p.featuredProjectId === item.id;
      radio.addEventListener('change', function () { p.featuredProjectId = item.id; });
      root.appendChild(card((item.title || 'New project'), [
        A.field('Title', item, 'title', { max: 80 }), A.field('Subtitle', item, 'subtitle', { max: 80 }),
        A.select('Category', item, 'category', p.categories.map(function (c) { return [c.id, c.label]; })),
        imagePicker('Image', item, 'image', ''), A.field('Image description (alt text)', item, 'alt', { max: 200 }),
        h('div', { class: 'field inline-check' }, [radio, h('label', { for: 'feat' + i, text: 'Show as the featured project' })]),
        controls(list, i, rerender, function () { if (p.featuredProjectId === item.id) p.featuredProjectId = ''; })
      ]));
    });
    root.appendChild(A.button('Add project', function () {
      if (!p.categories.length) { alert('Add a category first.'); return; }
      list.push({ id: A.uniqueId('project', list.map(function (x) { return x.id; })), title: 'New project', subtitle: '', category: p.categories[0].id, image: A.state.images[0], alt: 'Describe this image' });
      if (!p.featuredProjectId) p.featuredProjectId = list[list.length - 1].id;
      rerender();
    }, 'secondary'));
    return root;
  };

  /* ---------- Services ---------- */
  E.services = function (rerender) {
    var list = A.state.portfolio.services, root = h('div');
    list.forEach(function (s, i) {
      root.appendChild(card(s.title || 'New service', [A.select('Icon', s, 'icon', ICONS), A.field('Title', s, 'title', { max: 60 }), A.field('Description', s, 'text', { long: true, max: 300 }), controls(list, i, rerender)]));
    });
    root.appendChild(A.button('Add service', function () { list.push({ icon: 'i-briefcase', title: 'New service', text: '' }); rerender(); }, 'secondary'));
    return root;
  };

  /* ---------- Skills ---------- */
  E.skills = function (rerender) {
    var p = A.state.portfolio, list = p.skills, root = h('div');
    list.forEach(function (s, i) {
      root.appendChild(card(s.name || 'New skill', [A.field('Name', s, 'name', { max: 40 }), A.field('Short label (1-6 characters)', s, 'short', { max: 6 }),
        A.field('Level (0-100)', s, 'level', { type: 'number', number: true, min: 0, maxValue: 100 }), A.select('Ring colour', s, 'ring', [['A', 'Violet'], ['B', 'Pink']]), controls(list, i, rerender)]));
    });
    root.appendChild(A.button('Add skill', function () { list.push({ name: 'New skill', short: 'NS', level: 80, ring: 'A' }); rerender(); }, 'secondary'));
    root.appendChild(h('h3', { text: 'Other skills (tags)' }));
    var others = p.otherSkills;
    others.forEach(function (_, i) {
      var box = { v: others[i] };
      root.appendChild(h('div', { class: 'inline' }, [A.field('Tag ' + (i + 1), box, 'v', { max: 40, onChange: function (v) { others[i] = v; } }), A.button('Remove', function () { others.splice(i, 1); rerender(); }, 'danger')]));
    });
    root.appendChild(A.button('Add tag', function () { others.push('New tag'); rerender(); }, 'secondary'));
    return root;
  };

  /* ---------- Password ---------- */
  E.password = function () {
    var form = h('form', { class: 'card', novalidate: true });
    var data = { currentPassword: '', newPassword: '' }, status = h('div', { class: 'status', role: 'status' });
    var current = A.field('Current password', data, 'currentPassword', { type: 'password' });
    var next = A.field('New password (minimum 14 characters)', data, 'newPassword', { type: 'password' });
    current.querySelector('input').autocomplete = 'current-password';
    next.querySelector('input').autocomplete = 'new-password';
    form.append(current, next, h('button', { type: 'submit', text: 'Change password' }), status);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      A.api('/api/admin/password', 'POST', data).then(function () { form.reset(); data.currentPassword = data.newPassword = ''; A.say(status, 'Password changed.', true); })
        .catch(function (err) { A.say(status, err.message, false); });
    });
    return form;
  };
})();
