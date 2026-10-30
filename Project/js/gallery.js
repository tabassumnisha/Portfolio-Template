/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/gallery.js — builds the filter buttons and project cards from the server data and handles filtering.
   Filter buttons are real <button> elements: operable with Tab, Enter and Space (aria-pressed). */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$, $$ = P.$$;

  function buildCard(p, i) {
    var card = P.el('article', { 'class': 'project reveal' + (i % 3 ? ' delay-' + (i % 3) : ''), 'data-category': p.category, 'data-id': p.id });
    var slot = P.el('div', { 'class': 'slot', 'data-file': p.image });
    var img = P.el('img', { src: p.image, alt: p.alt || p.title, loading: 'lazy', width: '1200', height: '900' });
    img.addEventListener('error', function () { img.remove(); });
    slot.appendChild(img);
    card.appendChild(slot);
    card.appendChild(P.el('h3', {}, p.title));
    card.appendChild(P.el('p', { 'class': 'project-tag' }, p.subtitle));
    return card;
  }

  function init() {
    var pills = $('#filterPills'), grid = $('#projectGrid'), status = $('#galleryStatus');
    if (!pills || !grid) return;
    var data = P.data, cats = [{ id: 'all', label: 'All' }].concat(data.categories);

    cats.forEach(function (c, idx) {
      var b = P.el('button', { type: 'button', 'data-filter': c.id, 'aria-pressed': idx === 0 ? 'true' : 'false' }, c.label);
      if (idx === 0) b.className = 'active';
      pills.appendChild(b);
    });
    data.projects.forEach(function (p, i) { grid.appendChild(buildCard(p, i)); });

    var buttons = $$('[data-filter]', pills), cards = $$('.project', grid);
    function apply(f) {
      var shown = 0;
      buttons.forEach(function (b) {
        var on = b.getAttribute('data-filter') === f;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      cards.forEach(function (c) {
        var show = f === 'all' || c.getAttribute('data-category') === f;
        c.hidden = !show;
        if (show) { shown++; c.classList.add('show'); }
      });
      if (status) status.textContent = 'Showing ' + shown + (shown === 1 ? ' project' : ' projects');
    }
    buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); }); });
    apply('all');
  }

  /* Featured project band (uses the project chosen by featuredProjectId) */
  function featured() {
    var d = P.data, p = d.projects.filter(function (x) { return x.id === d.featuredProjectId; })[0] || d.projects[0];
    var img = $('#featuredImage'), link = $('#featuredLink'), title = $('#featuredTitle'), text = $('#featuredText');
    if (!p || !img) return;
    img.src = p.image; img.alt = p.alt || p.title;
    if (link) link.href = p.image;
    if (title) title.textContent = p.title;
    if (text) text.textContent = d.featuredText || '';
  }

  P.gallery = { init: init, featured: featured };
})();
