/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/content.js — applies SITE_CONFIG (config.js) to the page text, images and links. */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$, $$ = P.$$, cfg = P.config;
  var SOCIAL_ICONS = { facebook: 'i-facebook', x: 'i-x', instagram: 'i-instagram', github: 'i-code', telegram: 'i-telegram', reddit: 'i-reddit' };
  var SOCIAL_LABELS = { facebook: 'Facebook', x: 'X', instagram: 'Instagram', github: 'GitHub', telegram: 'Telegram', reddit: 'Reddit' };

  function setMeta(selector, value) { var m = $(selector); if (m && value) m.setAttribute('content', value); }

  function renderSocials(container) {
    var social = cfg.social || {};
    Object.keys(SOCIAL_ICONS).forEach(function (key) {
      if (!social[key]) return;
      var a = P.el('a', { href: P.safeUrl(social[key]), target: '_blank', rel: 'noopener noreferrer', 'aria-label': SOCIAL_LABELS[key] });
      a.appendChild(P.icon(SOCIAL_ICONS[key]));
      container.appendChild(a);
    });
  }

  function run() {
    var owner = cfg.owner || {}, contact = cfg.contact || {}, site = cfg.site || {}, images = cfg.images || {};

    /* Generic text bindings: <span data-bind="owner.name"></span> */
    $$('[data-bind]').forEach(function (n) { var v = P.get(n.getAttribute('data-bind')); if (v != null) n.textContent = v; });

    /* Hero title: last word of the name is highlighted */
    var h1 = $('#heroName');
    if (h1 && owner.name) {
      var parts = String(owner.name).trim().split(/\s+/), last = parts.pop();
      h1.textContent = '';
      if (parts.length) h1.appendChild(document.createTextNode(parts.join(' ') + ' '));
      h1.appendChild(P.el('span', {}, last));
    }

    /* Page title and meta */
    if (site.title) document.title = site.title;
    setMeta('meta[name="description"]', site.description);
    setMeta('meta[property="og:title"]', site.title);
    setMeta('meta[property="og:description"]', site.description);

    /* Images and alt text */
    var hero = $('#heroImage'), about = $('#aboutImage');
    if (hero && images.hero) hero.src = images.hero;
    if (hero) hero.alt = (owner.name || 'Designer') + ' — portrait';
    if (about && images.about) about.src = images.about;
    if (about) about.alt = (owner.name || 'Designer') + ' — portrait photo';
    $$('.slot img').forEach(function (img) { img.addEventListener('error', function () { img.remove(); }); });

    /* Brand mark, aria labels */
    $$('[data-brand-label]').forEach(function (n) { n.setAttribute('aria-label', (owner.name || 'Home') + ' — home'); });

    /* Email */
    $$('a[data-email]').forEach(function (a) { a.setAttribute('href', 'mailto:' + (contact.email || '')); });

    /* Website (footer) */
    $$('a[data-website]').forEach(function (a) { a.setAttribute('href', P.safeUrl(contact.website)); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); });

    /* Social icons and extra links */
    $$('[data-socials]').forEach(renderSocials);
    var chips = $('#extraLinks');
    if (chips) (cfg.extraLinks || []).forEach(function (l) {
      chips.appendChild(P.el('a', { href: P.safeUrl(l.url), target: '_blank', rel: 'noopener noreferrer' }, l.label));
    });
  }

  P.content = { run: run };
})();
