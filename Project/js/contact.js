/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* js/contact.js — contact section.
   * Every <a data-wa> gets a prefilled https://wa.me/<digits>?text=... link (number from the site settings).
   * The contact form POSTs to /api/contact; the server validates it and stores it in the private admin inbox. */
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

  function pretty(number) { return String(number || '').trim(); }

  function showStatus(node, text, ok) {
    node.hidden = false;
    node.textContent = text;
    node.style.color = ok ? '#1b7f4b' : '#b3261e';
  }

  function clearFieldErrors(form) { $$('[aria-invalid]', form).forEach(function (n) { n.removeAttribute('aria-invalid'); }); }

  function init() {
    var contact = P.config.contact || {};
    var greeting = contact.whatsappGreeting || 'Hello!';

    $$('a[data-wa]').forEach(function (a) {
      a.setAttribute('href', link(greeting));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    $$('[data-wa-number]').forEach(function (n) { n.textContent = pretty(contact.whatsappNumber); });

    var form = $('#contactForm'), status = $('#formStatus');
    if (!form) return;
    var button = $('button[type="submit"]', form), label = $('span', button);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      clearFieldErrors(form);
      var f = new FormData(form), idleText = label.textContent;
      button.disabled = true; label.textContent = 'Sending…';
      P.post('/api/contact', {
        name: f.get('name'), email: f.get('email'), subject: f.get('subject'),
        message: f.get('message'), website: f.get('website')
      }).then(function () {
        form.reset();
        showStatus(status, 'Thank you! Your message was sent. You will get a reply by e-mail soon.', true);
      }).catch(function (err) {
        Object.keys(err.fields || {}).forEach(function (k) { var n = form.elements[k === 'message' ? 'message' : k]; if (n) n.setAttribute('aria-invalid', 'true'); });
        var detail = err.status === 429 ? 'Too many messages from this connection. Please try again later.' :
          err.status === 422 ? 'Please check your details: ' + Object.keys(err.fields || {}).map(function (k) { return err.fields[k]; }).join(' ') :
          'Sorry, the message could not be sent. Please try again or use WhatsApp.';
        showStatus(status, detail, false);
      }).then(function () { button.disabled = false; label.textContent = idleText; });
    });
  }

  P.contact = { init: init, link: link, digits: digits };
})();
