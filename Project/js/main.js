/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/main.js — entry point. Loads the content from the server, then runs every feature module. */
(function () {
  'use strict';
  var P = window.Portfolio;

  function render() {
    P.content.run();      // settings -> text / images / links
    P.gallery.init();     // filters + project cards
    P.gallery.featured(); // featured band
    P.services.init();    // service cards + skill rings
    P.nav.init();         // header + mobile menu
    P.contact.init();     // wa.me links + contact form
    P.effects.init();     // must run last: observes the generated .reveal elements
  }

  function fail() {
    var main = P.$('main');
    if (!main) return;
    var box = P.el('p', { 'class': 'noscript-note', role: 'alert' }, 'The site content could not be loaded. Please reload the page in a moment.');
    main.insertBefore(box, main.firstChild);
    P.nav.init();
  }

  function start() { P.load().then(render, fail); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
