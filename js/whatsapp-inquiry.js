/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/whatsapp-inquiry.js — WhatsApp inquiry flow.
   * Builds https://wa.me/<digits>?text=<encodeURIComponent(message)> from config.contact.whatsappNumber.
   * Opens WhatsApp in a new tab with rel="noopener noreferrer". Nothing is stored or sent to any server. */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$, $$ = P.$$;

  /* "+1 (000) 000-0000" -> "10000000000" */
  function digits(number) { return String(number || '').replace(/\D/g, ''); }

  function link(message) {
    var d = digits((P.config.contact || {}).whatsappNumber);
    if (!d) return '#contact';
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(message || '');
  }

  function pretty(number) { var n = String(number || '').trim(); return n || ''; }

  function formMessage(f) {
    var subject = f.get('subject') || 'Portfolio Inquiry';
    return '*Portfolio Inquiry*\n\n*Name:* ' + f.get('name') + '\n*Email:* ' + f.get('email') +
      '\n*Subject:* ' + subject + '\n\n*Message:*\n' + f.get('message');
  }

  function init() {
    var contact = P.config.contact || {};
    var greeting = contact.whatsappGreeting || 'Hello!';

    /* Every <a data-wa> gets the prefilled-message link */
    $$('a[data-wa]').forEach(function (a) {
      a.setAttribute('href', link(greeting));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    $$('[data-wa-number]').forEach(function (n) { n.textContent = pretty(contact.whatsappNumber); });

    var form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var url = link(formMessage(new FormData(form)));
      var w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) window.location.href = url; // pop-up blocked: navigate instead
    });
  }

  P.whatsapp = { init: init, link: link, digits: digits };
})();
