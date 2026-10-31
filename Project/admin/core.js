/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* admin/core.js — shared helpers for the admin panel: DOM builder, API calls, form fields. No innerHTML is ever used with data. */
(function () {
  'use strict';
  var A = window.Admin = { state: { portfolio: null, config: null, images: [] }, onSignedOut: function () {} };
  var uid = 0;

  /* h('div', {class: 'x', text: 'hi', on: {click: fn}}, [children]) */
  A.h = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'text') e.textContent = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { e.addEventListener(ev, v[ev]); });
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    [].concat(kids == null ? [] : kids).forEach(function (c) {
      if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  A.api = function (path, method, body) {
    var opts = { method: method || 'GET', headers: { Accept: 'application/json', 'X-Portfolio-Action': '1' }, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return A.request(path, opts);
  };

  A.upload = function (file) {
    return A.request('/api/admin/upload', { method: 'POST', credentials: 'same-origin', body: file,
      headers: { Accept: 'application/json', 'X-Portfolio-Action': '1', 'Content-Type': file.type || 'application/octet-stream' } });
  };

  A.request = function (path, opts) {
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401 && path !== '/api/login') A.onSignedOut();
        if (!r.ok) throw new Error(d.error || ('Request failed (' + r.status + ')'));
        return d;
      });
    });
  };

  /* Status line: say(el, 'Saved', true) */
  A.say = function (el, message, ok) {
    el.textContent = message;
    el.className = 'status' + (message ? (ok ? ' ok' : ' bad') : '');
  };

  A.slug = function (text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  };

  A.uniqueId = function (base, taken) {
    var id = A.slug(base), n = 2;
    while (taken.indexOf(id) !== -1) id = A.slug(base) + '-' + n++;
    return id;
  };

  /* Labelled text input / textarea bound to obj[key]. */
  A.field = function (label, obj, key, opts) {
    opts = opts || {};
    var id = 'f' + (++uid);
    var input = opts.long
      ? A.h('textarea', { id: id, rows: opts.rows || 3, maxlength: opts.max })
      : A.h('input', { id: id, type: opts.type || 'text', maxlength: opts.max, min: opts.min, max: opts.maxValue, placeholder: opts.placeholder, readonly: opts.readonly });
    input.value = obj[key] == null ? '' : obj[key];
    input.addEventListener('input', function () {
      obj[key] = opts.number ? Number(input.value) : input.value;
      if (opts.onChange) opts.onChange(obj[key]);
    });
    return A.h('div', { class: 'field' }, [A.h('label', { for: id, text: label }), input, opts.help ? A.h('small', { text: opts.help }) : null]);
  };

  /* Labelled <select> bound to obj[key]; options is [[value, label], …]. */
  A.select = function (label, obj, key, options, onChange) {
    var id = 'f' + (++uid);
    var sel = A.h('select', { id: id }, options.map(function (o) { return A.h('option', { value: o[0], text: o[1] }); }));
    sel.value = obj[key];
    sel.addEventListener('change', function () { obj[key] = sel.value; if (onChange) onChange(sel.value); });
    return A.h('div', { class: 'field' }, [A.h('label', { for: id, text: label }), sel]);
  };

  A.button = function (text, onClick, kind) {
    return A.h('button', { type: 'button', class: kind || '', text: text, on: { click: onClick } });
  };
})();
