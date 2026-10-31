/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* admin/main.js — sign-in, tab navigation, loading and saving. Loaded last. */
(function () {
  'use strict';
  var A = window.Admin, h = A.h, E = A.editors;
  var $ = function (id) { return document.getElementById(id); };
  var TABS = [
    ['profile', 'Site profile', 'config'], ['projects', 'Projects', 'portfolio'], ['categories', 'Categories', 'portfolio'],
    ['services', 'Services', 'portfolio'], ['skills', 'Skills', 'portfolio'], ['password', 'Password', null]
  ];
  var current = 'projects';

  function show(signedIn) {
    $('login').classList.toggle('hidden', signedIn);
    $('editor').classList.toggle('hidden', !signedIn);
    $('logout').classList.toggle('hidden', !signedIn);
  }
  A.onSignedOut = function () { show(false); A.say($('loginStatus'), 'Please sign in again.', false); };

  function renderTabs() {
    $('tabs').replaceChildren.apply($('tabs'), TABS.map(function (t) {
      return h('button', { type: 'button', class: 'tab', 'aria-current': t[0] === current ? 'page' : null, text: t[1],
        on: { click: function () { current = t[0]; render(); } } });
    }));
  }

  function render() {
    renderTabs();
    var tab = TABS.filter(function (t) { return t[0] === current; })[0];
    var body = E[current](render);
    $('panel').replaceChildren(h('h2', { text: tab[1] }), body);
    $('saveBar').classList.toggle('hidden', !tab[2]);
    A.say($('saveStatus'), '', true);
  }

  function save() {
    var tab = TABS.filter(function (t) { return t[0] === current; })[0];
    A.say($('saveStatus'), 'Saving…', true);
    A.api('/api/admin/content/' + tab[2], 'PUT', A.state[tab[2]])
      .then(function () { A.say($('saveStatus'), 'Saved. Reload the public site to see the change.', true); })
      .catch(function (e) { A.say($('saveStatus'), 'Not saved: ' + e.message, false); });
  }

  function load() {
    return A.api('/api/admin/session').then(function (s) { return s.signedIn ? loadContent() : show(false); }).catch(function () { show(false); });
  }

  function loadContent() {
    return Promise.all([A.api('/api/admin/content'), A.api('/api/admin/images')]).then(function (r) {
      A.state.portfolio = r[0].portfolio; A.state.config = r[0].config; A.state.images = r[1].images;
      show(true); render();
    }).catch(function () { show(false); });
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    A.say($('loginStatus'), 'Signing in…', true);
    A.api('/api/login', 'POST', { email: $('email').value, password: $('password').value })
      .then(function () { $('password').value = ''; A.say($('loginStatus'), '', true); return load(); })
      .catch(function (err) { A.say($('loginStatus'), err.message, false); });
  });
  $('logout').addEventListener('click', function () {
    A.api('/api/logout', 'POST', {}).then(function () { show(false); }, function () { show(false); });
  });
  $('save').addEventListener('click', save);
  load();
})();
