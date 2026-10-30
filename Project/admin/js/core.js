/* © 2026 Tabassum Nisha. Standard Licence, see LICENSE-NOTE.md. */
/* admin/js/core.js — API client, DOM helper, toasts, dialogs and the form builder. All text is set with textContent. */
(function () {
  'use strict';
  var A = window.Admin = { state: { user: null, csrf: '' } };

  /* h('div', {class:'x', on:{click:fn}}, 'text', node, [nodes]) */
  A.h = function (tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'on') Object.keys(v).forEach(function (e) { n.addEventListener(e, v[e]); });
      else if (k === 'value') n.value = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      list.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return add(c);
        n.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
      });
    })(Array.prototype.slice.call(arguments, 2));
    return n;
  };
  var h = A.h;

  A.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };

  /* ---- API --------------------------------------------------------------- */
  A.api = function (method, url, body, opts) {
    var headers = { Accept: 'application/json' }, init = { method: method, headers: headers, credentials: 'same-origin' };
    if (method !== 'GET' && A.state.csrf) headers['X-CSRF-Token'] = A.state.csrf;
    if (typeof Blob !== 'undefined' && body instanceof Blob) { headers['Content-Type'] = body.type; init.body = body; }
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    return fetch('/api' + url, init).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error(j.error || 'Request failed'); e.status = r.status; e.fields = j.fields || {};
          if (r.status === 401 && !(opts && opts.quiet) && A.onUnauthorized) A.onUnauthorized();
          throw e;
        }
        return j;
      });
    });
  };

  /* ---- toasts ------------------------------------------------------------ */
  A.toast = function (message, kind) {
    var box = document.getElementById('toasts');
    var t = h('div', { class: 'toast ' + (kind || 'ok') }, message);
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, kind === 'error' ? 6000 : 3000);
  };
  A.fail = function (err) { A.toast(err && err.message ? err.message : 'Something went wrong.', 'error'); };

  A.date = function (iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  /* ---- dialogs ----------------------------------------------------------- */
  function openDialog(title, content, footer) {
    var dlg = h('dialog', { class: 'dlg', 'aria-label': title },
      h('div', { class: 'dlg-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', on: { click: function () { dlg.close(); } } }, '✕')),
      h('div', { class: 'dlg-body' }, content),
      footer ? h('div', { class: 'dlg-foot' }, footer) : null);
    dlg.addEventListener('close', function () { dlg.remove(); });
    document.body.appendChild(dlg);
    dlg.showModal();
    return dlg;
  }

  A.confirm = function (message, okLabel) {
    return new Promise(function (resolve) {
      var done = false;
      var dlg = openDialog('Please confirm', h('p', {}, message), [
        h('button', { type: 'button', class: 'btn ghost', on: { click: function () { dlg.close(); } } }, 'Cancel'),
        h('button', { type: 'button', class: 'btn danger', on: { click: function () { done = true; dlg.close(); } } }, okLabel || 'Delete')
      ]);
      dlg.addEventListener('close', function () { resolve(done); });
    });
  };

  /* Form dialog: fields -> inputs, Save calls onSubmit(data) (returns a promise); server field errors are shown inline. */
  A.formDialog = function (opts) {
    var f = A.form(opts.fields, opts.values || {});
    var save = h('button', { type: 'submit', class: 'btn primary' }, opts.submitLabel || 'Save');
    var cancel = h('button', { type: 'button', class: 'btn ghost', on: { click: function () { dlg.close(); } } }, 'Cancel');
    f.node.appendChild(h('div', { class: 'dlg-foot in-form' }, cancel, save));
    var dlg = openDialog(opts.title, f.node);
    f.node.addEventListener('submit', function (e) {
      e.preventDefault();
      save.disabled = true;
      Promise.resolve(opts.onSubmit(f.read())).then(function () { dlg.close(); }).catch(function (err) {
        save.disabled = false;
        if (err && err.fields) f.setErrors(err.fields);
        A.fail(err);
      });
    });
    return dlg;
  };

  /* ---- form builder ------------------------------------------------------ */
  /* field: {name,label,type:text|textarea|number|password|email|select|checkbox|image,required,max,min,help,options:[{value,label}]} */
  A.form = function (fields, values) {
    var form = h('form', { class: 'form', novalidate: true }), controls = {}, errs = {}, uid = Math.random().toString(36).slice(2, 7);

    fields.forEach(function (f) {
      var id = 'f-' + uid + '-' + f.name.replace(/[^a-z0-9]/gi, '-'), v = values[f.name], control, err = h('p', { class: 'err', id: id + '-err', hidden: true });
      var common = { id: id, name: f.name, 'aria-describedby': id + '-err' };
      if (f.required) common.required = true;
      if (f.type === 'textarea') control = h('textarea', Object.assign({ rows: f.rows || 4, maxlength: f.max }, common), v == null ? '' : v);
      else if (f.type === 'select') control = h('select', common, (f.options || []).map(function (o) { return h('option', { value: o.value }, o.label); }));
      else if (f.type === 'checkbox') control = h('input', Object.assign({ type: 'checkbox' }, common, v ? { checked: true } : {}));
      else if (f.type === 'image') control = imageControl(f, v, id);
      else control = h('input', Object.assign({ type: f.type === 'number' ? 'number' : f.type || 'text', maxlength: f.max, min: f.min, max: f.type === 'number' ? f.max : null, autocomplete: f.type === 'password' ? 'new-password' : 'off' }, common));
      if (f.type === 'select') control.value = v == null ? (f.options && f.options[0] ? f.options[0].value : '') : v;
      else if (f.type !== 'textarea' && f.type !== 'checkbox' && f.type !== 'image') control.value = v == null ? '' : v;
      controls[f.name] = { f: f, node: control };
      errs[f.name] = err;
      var label = h('label', { for: id }, f.label + (f.required ? ' *' : ''));
      form.appendChild(h('div', { class: 'field' + (f.type === 'checkbox' ? ' check' : '') }, f.type === 'checkbox' ? [control, label] : [label, control], f.help ? h('p', { class: 'help' }, f.help) : null, err));
    });

    function imageControl(f, value, id) {
      var current = value || '', wrap = h('div', { class: 'imgctl' }), prev = h('img', { alt: '', class: 'imgprev', hidden: !current }), msg = h('span', { class: 'help' });
      if (current) prev.src = '/' + current;
      var pick = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', id: id, 'aria-describedby': id + '-err', on: { change: function () {
        var file = pick.files[0]; if (!file) return;
        msg.textContent = 'Uploading…';
        A.api('PUT', '/admin/upload', file).then(function (r) { current = r.path; prev.src = '/' + current; prev.hidden = false; msg.textContent = 'Uploaded.'; }).catch(function (e) { msg.textContent = ''; A.fail(e); });
      } } });
      wrap.getValue = function () { return current; };
      wrap.append(prev, pick, msg);
      return wrap;
    }

    return {
      node: form,
      read: function () {
        var out = {};
        fields.forEach(function (f) {
          var n = controls[f.name].node;
          if (f.type === 'checkbox') out[f.name] = n.checked;
          else if (f.type === 'image') out[f.name] = n.getValue();
          else if (f.type === 'number') out[f.name] = n.value === '' ? '' : Number(n.value);
          else out[f.name] = n.value;
        });
        return out;
      },
      setErrors: function (map) {
        var first = null;
        Object.keys(errs).forEach(function (k) { errs[k].hidden = true; errs[k].textContent = ''; controls[k].node.removeAttribute('aria-invalid'); });
        Object.keys(map || {}).forEach(function (k) {
          if (!errs[k]) return;
          errs[k].textContent = map[k]; errs[k].hidden = false; controls[k].node.setAttribute('aria-invalid', 'true');
          first = first || controls[k].node;
        });
        if (first && first.focus) first.focus();
      }
    };
  };
})();
