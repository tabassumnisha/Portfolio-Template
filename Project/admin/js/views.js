/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* admin/js/views.js — login, dashboard, inbox, settings, users and account screens. */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;
  var V = A.views = {};

  /* ---- login ------------------------------------------------------------- */
  V.login = function (root, onDone, note) {
    var err = h('p', { class: 'err', role: 'alert', hidden: true });
    var email = h('input', { type: 'email', id: 'li-email', name: 'email', required: true, autocomplete: 'username' });
    var pass = h('input', { type: 'password', id: 'li-pass', name: 'password', required: true, autocomplete: 'current-password' });
    var btn = h('button', { type: 'submit', class: 'btn primary full' }, 'Sign in');
    var form = h('form', { class: 'form login-card', novalidate: true },
      h('h1', {}, 'Admin sign in'), note ? h('p', { class: 'help' }, note) : null,
      h('div', { class: 'field' }, h('label', { for: 'li-email' }, 'E-mail'), email),
      h('div', { class: 'field' }, h('label', { for: 'li-pass' }, 'Password'), pass),
      err, btn,
      h('p', { class: 'help center' }, h('a', { href: '/' }, '← Back to the website')));
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      A.api('POST', '/auth/login', { email: email.value, password: pass.value }, { quiet: true }).then(function (r) {
        A.state.user = r.user; A.state.csrf = r.csrf; onDone();
      }).catch(function (ex) { btn.disabled = false; pass.value = ''; err.textContent = ex.message; err.hidden = false; pass.focus(); });
    });
    A.clear(root).appendChild(h('main', { class: 'login-wrap' }, form));
    email.focus();
  };

  /* ---- dashboard --------------------------------------------------------- */
  V.dashboard = function (root) {
    A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, 'Dashboard')), h('p', { class: 'help' }, 'Loading…'));
    A.api('GET', '/admin/stats').then(function (s) {
      var card = function (n, label, href) { return h('a', { class: 'stat', href: href }, h('b', {}, String(n)), h('span', {}, label)); };
      A.clear(root).append(
        h('div', { class: 'page-head' }, h('h1', {}, 'Dashboard'), h('a', { class: 'btn ghost', href: '/', target: '_blank', rel: 'noopener' }, 'View website ↗')),
        h('p', { class: 'help' }, 'Signed in as ' + A.state.user.name + ' (' + A.state.user.role + ').'),
        h('div', { class: 'stats' }, card(s.unread, 'Unread messages', '#/messages'), card(s.messages, 'Total messages', '#/messages'), card(s.published + ' / ' + s.projects, 'Projects published', '#/projects'), card(s.services, 'Services', '#/services'), card(s.skills, 'Skills', '#/skills')),
        h('h2', {}, 'Latest messages'),
        s.latest.length ? h('ul', { class: 'rows' }, s.latest.map(function (m) {
          return h('li', { class: 'row' }, h('div', { class: 'row-main' }, h('strong', {}, (m.is_read ? '' : '● ') + m.name), h('span', { class: 'meta' }, (m.subject || 'No subject') + ' · ' + A.date(m.created_at))), h('a', { class: 'btn small ghost', href: '#/messages' }, 'Open'));
        })) : h('p', { class: 'empty' }, 'No messages yet. Visitors can write to you from the contact form on your website.'));
    }).catch(A.fail);
  };

  /* ---- inbox ------------------------------------------------------------- */
  V.messages = function (root) {
    var list = h('ul', { class: 'rows' }), more = h('button', { type: 'button', class: 'btn ghost' }, 'Load more'), offset = 0, total = 0;
    A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, 'Messages')), list, h('div', { class: 'center' }, more));

    function add(m) {
      var body = h('div', { class: 'msg-body', hidden: true }, h('p', { class: 'pre' }, m.body),
        h('div', { class: 'row-actions' },
          h('a', { class: 'btn small primary', href: 'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: ' + (m.subject || 'your message')) }, 'Reply by e-mail'),
          h('button', { type: 'button', class: 'btn small ghost', on: { click: function (e) { toggleRead(m, e.target); } } }, m.is_read ? 'Mark unread' : 'Mark read'),
          h('button', { type: 'button', class: 'btn small danger-ghost', on: { click: function () { A.confirm('Delete this message?').then(function (y) { if (y) A.api('DELETE', '/admin/messages/' + m.id).then(function () { li.remove(); A.toast('Deleted.'); }).catch(A.fail); }); } } }, 'Delete')));
      var head = h('button', { type: 'button', class: 'msg-head', 'aria-expanded': 'false', on: { click: function () {
        var open = body.hidden; body.hidden = !open; head.setAttribute('aria-expanded', String(open));
        if (open && !m.is_read) toggleRead(m);
      } } }, h('strong', {}, (m.is_read ? '' : '● ') + m.name), h('span', { class: 'meta' }, m.email + ' · ' + (m.subject || 'No subject') + ' · ' + A.date(m.created_at)));
      var li = h('li', { class: 'row msg' + (m.is_read ? '' : ' unread') }, head, body);
      list.appendChild(li);
    }
    function toggleRead(m, btn) {
      A.api('PATCH', '/admin/messages/' + m.id, { is_read: !m.is_read }).then(function (u) { m.is_read = u.is_read; V.messages(root); }).catch(function (e) { if (btn) btn.disabled = false; A.fail(e); });
    }
    function load() {
      A.api('GET', '/admin/messages?limit=50&offset=' + offset).then(function (r) {
        total = r.total; r.items.forEach(add); offset += r.items.length; more.hidden = offset >= total;
        if (!total) list.appendChild(h('li', { class: 'empty' }, 'No messages yet.'));
      }).catch(A.fail);
    }
    more.addEventListener('click', load); load();
  };

  /* ---- site settings (admin only to save) -------------------------------- */
  var SECTIONS = [
    ['About you', [
      ['owner.name', 'Full name', { required: true, max: 120 }], ['owner.initials', 'Initials (header logo)', { max: 6 }], ['owner.role', 'Job title', { max: 120 }],
      ['owner.intro', 'Intro text (hero)', { type: 'textarea', max: 400, rows: 3 }], ['owner.about', 'About text', { type: 'textarea', max: 800, rows: 4 }],
      ['owner.tagline', 'Tagline', { max: 200 }], ['owner.quote', 'Quote', { max: 300 }], ['owner.location', 'Location', { max: 120 }], ['owner.experience', 'Experience (e.g. 2+ Years)', { max: 40 }]]],
    ['Photos', [['images.hero', 'Hero portrait (transparent PNG/WebP works best)', { type: 'image' }], ['images.about', 'About photo (4:5)', { type: 'image' }]]],
    ['Contact', [
      ['contact.whatsappNumber', 'WhatsApp number (international format)', { max: 24 }], ['contact.whatsappGreeting', 'WhatsApp greeting text', { max: 300 }],
      ['contact.email', 'Public e-mail', { type: 'email', max: 200 }], ['contact.website', 'Website address (https://…)', { max: 500 }]]],
    ['Social profiles (leave empty to hide)', ['facebook', 'x', 'instagram', 'github', 'telegram', 'reddit'].map(function (s) { return ['social.' + s, s.charAt(0).toUpperCase() + s.slice(1) + ' link', { max: 500 }]; }).concat([
      ['extraLinks', 'Extra links (one per line: Label | https://link)', { type: 'textarea', rows: 3 }]])],
    ['Page text', [
      ['site.title', 'Browser tab title', { required: true, max: 120 }], ['site.description', 'Search-engine description', { max: 300 }],
      ['site.footerQuote', 'Footer quote', { max: 120 }], ['site.formNote', 'Note under the contact form', { max: 300 }], ['site.featuredText', 'Featured project text', { type: 'textarea', max: 400, rows: 3 }]]]
  ];

  V.settings = function (root) {
    var canEdit = A.state.user.role === 'admin';
    A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, 'Site settings')), h('p', { class: 'help' }, 'Loading…'));
    A.api('GET', '/admin/settings').then(function (cfg) {
      var forms = [];
      var flat = {};
      Object.keys(cfg).forEach(function (g) {
        if (g === 'extraLinks') flat.extraLinks = (cfg.extraLinks || []).map(function (l) { return l.label + ' | ' + l.url; }).join('\n');
        else Object.keys(cfg[g]).forEach(function (k) { flat[g + '.' + k] = cfg[g][k]; });
      });
      var wrap = h('div', { class: 'settings' });
      SECTIONS.forEach(function (sec) {
        var fields = sec[1].map(function (f) { return Object.assign({ name: f[0], label: f[1] }, f[2]); });
        var form = A.form(fields, flat); forms.push({ form: form, fields: fields });
        wrap.appendChild(h('section', { class: 'card' }, h('h2', {}, sec[0]), form.node));
      });
      var save = h('button', { type: 'button', class: 'btn primary', disabled: !canEdit, on: { click: function () {
        var payload = {};
        forms.forEach(function (f) { var d = f.form.read(); Object.keys(d).forEach(function (k) { payload[k] = d[k]; }); });
        var lines = String(payload.extraLinks || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        payload.extraLinks = lines.map(function (l) { var i = l.indexOf('|'); return { label: (i < 0 ? l : l.slice(0, i)).trim(), url: (i < 0 ? '' : l.slice(i + 1)).trim() }; });
        save.disabled = true;
        A.api('PUT', '/admin/settings', payload).then(function () { A.toast('Settings saved.'); save.disabled = false; }).catch(function (e) {
          save.disabled = false; A.fail(e);
          forms.forEach(function (f) { f.form.setErrors(e.fields || {}); });
        });
      } } }, 'Save settings');
      A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, 'Site settings'), save),
        canEdit ? null : h('p', { class: 'notice' }, 'Only administrators can change site settings. You can view them here.'), wrap);
      if (!canEdit) wrap.querySelectorAll('input,textarea,select').forEach(function (n) { n.disabled = true; });
    }).catch(A.fail);
  };

  /* ---- users (admin only) ------------------------------------------------ */
  V.users = function (root) {
    var list = h('ul', { class: 'rows' });
    var roleOpts = [{ value: 'editor', label: 'Editor — manages content and messages' }, { value: 'admin', label: 'Admin — everything, including settings and users' }];
    A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, 'Users'), h('button', { type: 'button', class: 'btn primary', on: { click: function () { open(null); } } }, '+ Add user')), list);

    function load() {
      A.api('GET', '/admin/users').then(function (r) {
        A.clear(list);
        r.items.forEach(function (u) {
          var me = u.id === A.state.user.id;
          list.appendChild(h('li', { class: 'row' },
            h('div', { class: 'row-main' }, h('strong', {}, u.name + (me ? ' (you)' : '')), h('span', { class: 'meta' }, [u.email, u.role, u.is_active ? 'Active' : 'Disabled', u.last_login_at ? 'last sign-in ' + A.date(u.last_login_at) : 'never signed in'].join(' · '))),
            h('div', { class: 'row-actions' }, h('button', { type: 'button', class: 'btn small ghost', on: { click: function () { open(u); } } }, 'Edit'),
              me ? null : h('button', { type: 'button', class: 'btn small danger-ghost', on: { click: function () { A.confirm('Delete the account of ' + u.name + '?').then(function (y) { if (y) A.api('DELETE', '/admin/users/' + u.id).then(function () { A.toast('Deleted.'); load(); }).catch(A.fail); }); } } }, 'Delete'))));
        });
      }).catch(A.fail);
    }

    function open(u) {
      var fields = [{ name: 'name', label: 'Name', required: true, max: 100 }];
      if (!u) fields.unshift({ name: 'email', label: 'E-mail', type: 'email', required: true, max: 200 });
      fields.push({ name: 'role', label: 'Role', type: 'select', options: roleOpts });
      if (u) fields.push({ name: 'is_active', label: 'Account active', type: 'checkbox' });
      fields.push({ name: 'password', label: u ? 'New password (leave empty to keep)' : 'Password', type: 'password', required: !u, max: 200, help: 'At least 10 characters.' });
      A.formDialog({
        title: u ? 'Edit user' : 'Add user', fields: fields, values: u || { role: 'editor', is_active: true },
        onSubmit: function (d) {
          if (u && !d.password) delete d.password;
          return (u ? A.api('PUT', '/admin/users/' + u.id, d) : A.api('POST', '/admin/users', d)).then(function () { A.toast('Saved.'); load(); });
        }
      });
    }
    load();
  };

  /* ---- account ----------------------------------------------------------- */
  V.account = function (root) {
    var u = A.state.user, f = A.form([
      { name: 'current', label: 'Current password', type: 'password', required: true },
      { name: 'next', label: 'New password', type: 'password', required: true, max: 200, help: 'At least 10 characters. Other devices will be signed out.' }
    ], {});
    var save = h('button', { type: 'submit', class: 'btn primary' }, 'Change password');
    f.node.appendChild(save);
    f.node.addEventListener('submit', function (e) {
      e.preventDefault(); save.disabled = true;
      A.api('POST', '/auth/password', f.read()).then(function () { A.toast('Password changed.'); f.node.reset(); save.disabled = false; })
        .catch(function (ex) { save.disabled = false; f.setErrors(ex.fields || {}); A.fail(ex); });
    });
    A.clear(root).append(h('div', { class: 'page-head' }, h('h1', {}, 'My account')),
      h('section', { class: 'card' }, h('p', {}, h('strong', {}, u.name), ' · ' + u.email + ' · ' + u.role)),
      h('section', { class: 'card' }, h('h2', {}, 'Change password'), f.node));
  };
})();
