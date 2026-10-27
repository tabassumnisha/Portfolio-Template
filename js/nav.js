/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/nav.js — sticky header state, mobile menu (keyboard + click-outside + Esc), active link highlight. */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$, $$ = P.$$;

  function init() {
    var header = $('.site-header'), menuBtn = $('.menu-btn'), nav = $('#nav');
    if (!header || !menuBtn || !nav) return;

    function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function setMenu(open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    }
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });

    /* Active link while scrolling */
    var links = $$('.nav > a[href^="#"]');
    var secs = $$('main section[id]').filter(function (s) {
      return links.some(function (l) { return l.getAttribute('href') === '#' + s.id; });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) {
            var on = l.getAttribute('href') === '#' + en.target.id;
            l.classList.toggle('active', on);
            if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      secs.forEach(function (s) { io.observe(s); });
    }
  }
  P.nav = { init: init };
})();
