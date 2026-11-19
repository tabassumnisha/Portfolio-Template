/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* admin/live-editor.js — editor for the Live Projects slider cards and the two summary columns. Loaded after editors.js. */
(function () {
  'use strict';
  var A = window.Admin, h = A.h, ui = A.ui;

  function projects(p, rerender) {
    var list = p.liveProjects, root = h('div');
    list.forEach(function (item, i) {
      var chips = { v: (item.chips || []).join(', ') };
      root.appendChild(ui.card(item.title || 'New live project', [
        A.field('Small label (e.g. Website, Web App)', item, 'tag', { max: 30 }),
        A.field('Title', item, 'title', { max: 80 }),
        A.field('Description', item, 'text', { long: true, max: 300 }),
        A.field('Feature chips (separate with commas, up to 10)', chips, 'v', { max: 400, onChange: function (v) {
          item.chips = v.split(',').map(function (x) { return x.trim().slice(0, 30); }).filter(Boolean).slice(0, 10);
        } }),
        A.field('Live link (https://…, leave empty for no button)', item, 'url', { max: 300 }),
        A.field('Link text shown on the button and browser bar (e.g. example.com)', item, 'urlLabel', { max: 60 }),
        ui.imagePicker('Screenshot', item, 'image', ''),
        A.field('Screenshot description (alt text)', item, 'alt', { max: 200 }),
        ui.controls(list, i, rerender)
      ]));
    });
    root.appendChild(A.button('Add live project', function () {
      if (list.length >= 12) return;
      list.push({ tag: 'Website', title: 'New live project', text: '', chips: [], url: '', urlLabel: '', image: A.state.images[0], alt: 'Screenshot of the project' });
      rerender();
    }, 'secondary'));
    return root;
  }

  function columns(p, rerender) {
    var cols = p.summaryColumns, root = h('div');
    cols.forEach(function (col, ci) {
      var box = [A.field('Column heading (the last word is highlighted)', col, 'heading', { max: 60 })];
      col.items.forEach(function (it, ii) {
        box.push(h('div', { class: 'inline' }, [A.field('Bold title', it, 'title', { max: 80 }), A.field('Short text', it, 'text', { max: 200 }),
          A.button('Remove', function () { col.items.splice(ii, 1); rerender(); }, 'danger')]));
      });
      box.push(A.button('Add item', function () { if (col.items.length < 12) col.items.push({ title: 'New item', text: '' }); rerender(); }, 'secondary'));
      box.push(ui.controls(cols, ci, rerender));
      root.appendChild(ui.card(col.heading || 'New column', box));
    });
    if (cols.length < 2) root.appendChild(A.button('Add summary column', function () { cols.push({ heading: 'New column', items: [] }); rerender(); }, 'secondary'));
    return root;
  }

  A.editors.live = function (rerender) {
    var p = A.state.portfolio;
    p.liveProjects = p.liveProjects || []; p.summaryColumns = p.summaryColumns || [];
    return h('div', {}, [
      h('p', { class: 'muted', text: 'Cards in the Live Projects slider. The whole section is hidden on the website when this list and the columns below are empty. The section title and intro are in Site profile → Page texts.' }),
      projects(p, rerender), h('h3', { text: 'Summary columns (two lists under the slider)' }), columns(p, rerender)
    ]);
  };
})();
