/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/main.js — entry point. Runs after every feature module has loaded. */
(function () {
  'use strict';
  var P = window.Portfolio;
  function start() {
    P.content.run();      // config -> text / images / links
    P.gallery.init();     // filters + project cards
    P.gallery.featured(); // featured band
    P.services.init();    // service cards + skill rings
    P.nav.init();         // header + mobile menu
    P.whatsapp.init();    // wa.me links + form
    P.effects.init();     // must run last: observes the generated .reveal elements
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
