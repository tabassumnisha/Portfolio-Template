/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* js/services.js — builds the service cards and the skill rings from the server data. */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function services() {
    var grid = $('#servicesGrid');
    if (!grid) return;
    P.data.services.forEach(function (s, i) {
      var card = P.el('article', { 'class': 'service-card reveal' + (i % 3 ? ' delay-' + (i % 3) : '') });
      var ic = P.el('span', { 'class': 'service-ic', 'aria-hidden': 'true' });
      ic.appendChild(P.icon(s.icon || 'i-briefcase'));
      card.appendChild(ic);
      card.appendChild(P.el('h3', {}, s.title));
      card.appendChild(P.el('p', {}, s.text));
      grid.appendChild(card);
    });
  }

  function ring(s) {
    var wrap = P.el('div', { 'class': 'skill' });
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ring'); svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', s.name + ' ' + s.level + ' percent');
    svg.style.setProperty('--p', String(Math.max(0, Math.min(100, s.level)) / 100));
    [['ring-bg', null], ['ring-fg', s.ring === 'A' ? 'url(#ringA)' : 'url(#ringB)']].forEach(function (c) {
      var circ = document.createElementNS(SVGNS, 'circle');
      circ.setAttribute('class', c[0]); circ.setAttribute('cx', '50'); circ.setAttribute('cy', '50'); circ.setAttribute('r', '44');
      if (c[1]) circ.setAttribute('stroke', c[1]);
      svg.appendChild(circ);
    });
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', '50'); t.setAttribute('y', '50'); t.textContent = s.level + '%';
    svg.appendChild(t);
    wrap.appendChild(svg);
    wrap.appendChild(P.el('b', {}, s.name));
    wrap.appendChild(P.el('small', {}, '(' + s.short + ')'));
    return wrap;
  }

  function skills() {
    var grid = $('#skillsGrid'), tags = $('#otherSkills');
    if (grid) P.data.skills.forEach(function (s) { grid.appendChild(ring(s)); });
    if (tags) P.data.otherSkills.forEach(function (t) { tags.appendChild(P.el('span', {}, t)); });
  }

  P.services = { init: function () { services(); skills(); } };
})();
