/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* js/effects.js — reveal-on-scroll (also animates skill rings) and the desktop cursor glow. */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$, $$ = P.$$;

  function init() {
    var els = $$('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('show'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      els.forEach(function (el) { io.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add('show'); });
    }

    var glow = $('.cursor-glow');
    if (glow && window.matchMedia && matchMedia('(pointer:fine)').matches) {
      window.addEventListener('pointermove', function (e) {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
      }, { passive: true });
    }
  }
  P.effects = { init: init };
})();
