/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* admin/js/main.js — shell (header + tabs), hash router and session handling. */
(function () {
  'use strict';
  var A = window.Admin, h = A.h, app = document.getElementById('app');

  function tabs() {
    var t = [['dashboard', 'Dashboard'], ['messages', 'Messages'], ['projects', 'Projects'], ['categories', 'Categories'], ['services', 'Services'], ['skills', 'Skills'], ['other-skills', 'Other skills'], ['settings', 'Settings']];
    if (A.state.user.role === 'admin') t.push(['users', 'Users']);
    t.push(['account', 'My account']);
    return t;
  }

  function route() {
    var key = (location.hash.replace(/^#\//, '') || 'dashboard');
    var allowed = tabs().map(function (t) { return t[0]; });
    if (allowed.indexOf(key) < 0) key = 'dashboard';
    var main = document.getElementById('view');
    if (!main) return;
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) {
      var on = a.getAttribute('data-key') === key;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = (A.titles[key] || 'Admin') + ' — Portfolio CMS';
    if (A.resources.keys.indexOf(key) >= 0) A.resources.render(key, main); else A.views[key](main);
    window.scrollTo(0, 0);
  }

  A.titles = { dashboard: 'Dashboard', messages: 'Messages', settings: 'Site settings', users: 'Users', account: 'My account' };
  Object.keys(A.resources.titles).forEach(function (k) { A.titles[k] = A.resources.titles[k]; });

  function shell() {
    var u = A.state.user;
    A.clear(app).append(
      h('header', { class: 'topbar' },
        h('a', { class: 'brand', href: '#/dashboard' }, 'Portfolio CMS'),
        h('div', { class: 'topbar-right' }, h('span', { class: 'who' }, u.name), h('button', { type: 'button', class: 'btn small ghost-light', on: { click: signOut } }, 'Sign out'))),
      h('nav', { class: 'tabs', id: 'tabs', 'aria-label': 'Admin sections' }, tabs().map(function (t) { return h('a', { href: '#/' + t[0], 'data-key': t[0] }, t[1]); })),
      h('main', { id: 'view', class: 'view' }));
    route();
  }

  function signOut() {
    A.api('POST', '/auth/logout', undefined, { quiet: true }).catch(function () {}).then(function () { A.state.user = null; A.state.csrf = ''; showLogin(); });
  }

  function showLogin(note) { A.views.login(app, shell, note); }
  A.onUnauthorized = function () { if (A.state.user) { A.state.user = null; A.state.csrf = ''; showLogin('Your session has ended. Please sign in again.'); } };

  window.addEventListener('hashchange', function () { if (A.state.user) route(); });
  A.api('GET', '/auth/me', undefined, { quiet: true }).then(function (r) { A.state.user = r.user; A.state.csrf = r.csrf; shell(); }).catch(function () { showLogin(); });
})();
