/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* js/live.js — builds the Live Projects slider and the two summary columns from js/data.js.
   Swipe/scroll, arrow buttons, dots and keyboard arrows all work; the optional auto-slide stops on any interaction.
   Everything is created with textContent / setAttribute (never innerHTML); links go through Portfolio.safeUrl(). */
(function () {
  'use strict';
  var P = window.Portfolio, $ = P.$;
  var IMG_DIR = 'assets/images/';

  /* "What I do" -> <h3>What I <span>do</span></h3> (last word highlighted) */
  function heading(tag, text) {
    var parts = String(text).trim().split(/\s+/), last = parts.pop(), h = P.el(tag, {});
    if (parts.length) h.appendChild(document.createTextNode(parts.join(' ') + ' '));
    h.appendChild(P.el('span', {}, last));
    return h;
  }

  function card(p) {
    var art = P.el('article', { 'class': 'live-card' });
    var bar = P.el('div', { 'class': 'bar' });
    bar.append(P.el('i'), P.el('i'), P.el('i'), P.el('span', { 'class': 'url' }, p.urlLabel || ''));
    var shot = P.el('img', { 'class': 'shot', src: IMG_DIR + p.image, alt: p.alt, width: '1440', height: '900', loading: 'lazy' });
    shot.addEventListener('error', function () { shot.remove(); });
    var body = P.el('div', { 'class': 'screen-body' }); body.appendChild(shot);
    var screen = P.el('div', { 'class': 'screen' }); screen.append(bar, body);
    var lid = P.el('div', { 'class': 'lid' }); lid.appendChild(screen);
    var laptop = P.el('div', { 'class': 'laptop' }); laptop.append(lid, P.el('div', { 'class': 'base' }));
    var info = P.el('div', { 'class': 'live-info' });
    if (p.tag) info.appendChild(P.el('span', { 'class': 'live-tag' }, p.tag));
    info.appendChild(P.el('h3', {}, p.title));
    if (p.text) info.appendChild(P.el('p', {}, p.text));
    if (p.chips && p.chips.length) {
      var ul = P.el('ul', { 'class': 'live-chips' });
      p.chips.forEach(function (c) { ul.appendChild(P.el('li', {}, c)); });
      info.appendChild(ul);
    }
    if (p.url) {
      var a = P.el('a', { 'class': 'live-link', href: P.safeUrl(p.url), target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Visit ' + p.title + ' (opens in a new tab)' });
      a.appendChild(P.el('span', {}, p.urlLabel || p.url)); a.appendChild(P.icon('i-ext'));
      info.appendChild(a);
    }
    art.append(laptop, info);
    return art;
  }

  function summary(columns) {
    var root = $('#workSummary');
    columns.forEach(function (col, i) {
      var box = P.el('div', { 'class': 'work-col reveal' + (i ? ' delay-' + i : '') }), ul = P.el('ul');
      box.appendChild(heading('h3', col.heading));
      col.items.forEach(function (it) {
        var li = P.el('li'); li.appendChild(P.el('b', {}, it.title));
        if (it.text) li.appendChild(document.createTextNode(it.text));
        ul.appendChild(li);
      });
      box.appendChild(ul); root.appendChild(box);
    });
  }

  function slider(root) {
    var track = $('.slider-track', root), slides = [].slice.call(track.children);
    var prev = $('.s-prev', root), next = $('.s-next', root), play = $('.s-play', root), dots = $('.s-dots', root);
    var timer = null, userPaused = P.reducedMotion(), inView = false;
    function perView() { var w = slides[0].getBoundingClientRect().width; return Math.max(1, Math.round(track.clientWidth / (w + 14))); }
    function pages() { return Math.max(1, slides.length - perView() + 1); }
    function step() { return slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : 1; }
    function idx() { return Math.round(track.scrollLeft / step()); }
    function go(i) { i = Math.max(0, Math.min(pages() - 1, i)); track.scrollTo({ left: i * step(), behavior: P.reducedMotion() ? 'auto' : 'smooth' }); }
    function sync() {
      var i = Math.min(idx(), pages() - 1);
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); d.setAttribute('aria-selected', String(k === i)); });
      prev.disabled = i <= 0; next.disabled = i >= pages() - 1;
    }
    function halt() { clearInterval(timer); timer = null; }
    function start() { if (timer || userPaused || !inView) return; timer = setInterval(function () { var i = idx(); go(i >= pages() - 1 ? 0 : i + 1); }, 6000); }
    function label() { play.textContent = userPaused ? 'Play' : 'Pause'; play.setAttribute('aria-label', userPaused ? 'Start auto-slide' : 'Pause auto-slide'); play.setAttribute('aria-pressed', String(userPaused)); }
    function manual(i) { halt(); userPaused = true; label(); go(i); }
    function buildDots() {
      dots.replaceChildren();
      for (var i = 0; i < pages(); i++) (function (n) {
        var b = P.el('button', { type: 'button', role: 'tab', 'aria-label': 'Go to project ' + (n + 1) });
        b.addEventListener('click', function () { manual(n); }); dots.appendChild(b);
      })(i);
      sync();
    }
    prev.addEventListener('click', function () { manual(idx() - 1); });
    next.addEventListener('click', function () { manual(idx() + 1); });
    play.addEventListener('click', function () { userPaused = !userPaused; label(); if (userPaused) halt(); else start(); });
    track.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); manual(idx() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); manual(idx() - 1); }
    });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { track.addEventListener(ev, function () { halt(); userPaused = true; label(); }, { passive: true }); });
    root.addEventListener('mouseenter', halt); root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', halt); root.addEventListener('focusout', start);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView) start(); else halt(); }, { threshold: 0.35 }).observe(root);
    window.addEventListener('resize', buildDots);
    label(); buildDots();
  }

  function init() {
    var section = $('#live-work'); if (!section) return;
    var d = P.data, projects = d.liveProjects || [], columns = d.summaryColumns || [], site = P.config.site || {};
    if (!projects.length && !columns.length) return;          /* nothing to show: section and menu link stay hidden */
    section.hidden = false;
    $$nav().forEach(function (a) { a.hidden = false; });
    if (site.liveTitle) { var h = $('#liveTitle'), n = heading('h2', site.liveTitle); h.textContent = ''; while (n.firstChild) h.appendChild(n.firstChild); }
    if (site.liveIntro) $('#liveIntro').textContent = site.liveIntro;
    if (projects.length) {
      var root = $('#liveSlider'), track = $('.slider-track', root);
      projects.forEach(function (p) { track.appendChild(card(p)); });
      root.hidden = false; slider(root);
    }
    summary(columns);
  }
  function $$nav() { return P.$$('[data-live-nav]'); }

  P.live = { init: init };
})();
