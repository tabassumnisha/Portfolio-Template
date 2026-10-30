/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/api.js — loads the site content (settings, projects, services, skills) from the server: GET /api/public. */
(function () {
  'use strict';
  var P = window.Portfolio;

  P.load = function () {
    return fetch('/api/public', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) { P.config = json.config || {}; P.data = json.data || P.data; });
  };

  /* POST JSON to the server; resolves with the parsed body, rejects with {status, message, fields}. */
  P.post = function (url, payload) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok) { var e = new Error(body.error || 'Request failed'); e.status = r.status; e.fields = body.fields || {}; throw e; }
          return body;
        });
      });
  };
})();
