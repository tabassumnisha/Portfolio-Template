/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/utils.js — tiny shared helpers (namespace: window.Portfolio). Loaded first. */
(function () {
  'use strict';
  var P = window.Portfolio = window.Portfolio || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  P.$ = function (sel, root) { return (root || document).querySelector(sel); };
  P.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  /* Filled by js/api.js from GET /api/public before any module renders. */
  P.config = {};
  P.data = { categories: [], projects: [], featuredProjectId: null, featuredText: '', services: [], skills: [], otherSkills: [] };

  /* Create an element; text is always set with textContent (never innerHTML). */
  P.el = function (tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  };

  /* <svg class="ic"><use href="#id"/></svg> */
  P.icon = function (id) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ic');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  };

  /* Only allow http(s) and mailto links coming from config. Anything else becomes "#". */
  P.safeUrl = function (url) {
    var u = String(url || '').trim();
    return /^(https?:\/\/|mailto:)/i.test(u) ? u : '#';
  };

  /* Read "a.b.c" from the config object (looked up at call time, after the server data has loaded). */
  P.get = function (path) {
    return String(path).split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, P.config);
  };

  P.reducedMotion = function () {
    return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
})();
