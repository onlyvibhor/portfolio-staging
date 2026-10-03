// Shared across every page: helpers, smooth scroll, header / menu, cursor, page transitions, reveals.
(function () {
  'use strict';
  const SITE = window.SITE || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const html = document.documentElement;
  const page = document.body.dataset.page;
  if (reduce) html.classList.add('reduce');

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------------ helpers */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const nl = (s) => String(s || '').split(/\n/).map(esc).join('<br>');
  const md = (s) => {
    s = String(s || '');
    if (window.marked) return window.marked.parse(s);
    return '<p>' + esc(s).replace(/\n\n+/g, '</p><p>') + '</p>';
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const projHref = (p, kind) => (p.external_url ? p.external_url : `case.html?${kind === 'e' ? 'e' : 'c'}=${encodeURIComponent(p.slug)}`);
  const pad2 = (n) => String(n).padStart(2, '0');
  const clock = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date());

  /* ------------------------------------------------------- smooth scroll */
  let lenis;
  if (reduce) {
    lenis = { velocity: 0, stop() {}, start() {}, scrollTo(t) { const el = typeof t === 'string' ? $(t) : t; if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'auto' }); else if (typeof t === 'number') window.scrollTo(0, t); } };
  } else {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.__lenis = lenis;

  /* ---------------------------------------------------------- text split */
  function split(el, mask) {
    const frag = document.createDocumentFragment();
    (function walk(node, parent) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { parent.appendChild(document.createTextNode(' ')); return; }
            if (mask) {
              const w = document.createElement('span'); w.className = 'w';
              const i = document.createElement('span'); i.className = 'wi'; i.textContent = t;
              w.appendChild(i); parent.appendChild(w);
            } else {
              const s = document.createElement('span'); s.className = 'sw'; s.textContent = t; parent.appendChild(s);
            }
          });
        } else if (n.nodeName === 'BR') {
          parent.appendChild(n.cloneNode());
        } else {
          const c = n.cloneNode(false); parent.appendChild(c); walk(n, c);
        }
      });
    })(el, frag);
    el.innerHTML = ''; el.appendChild(frag);
    return mask ? $$('.wi', el) : $$('.sw', el);
  }

  function scrubWords(el) {
    const words = split(el, false);
    if (reduce) { words.forEach((w) => (w.style.opacity = 1)); return; }
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.35,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 55%', scrub: true }
    });
  }

  function initReveals(root) {
    $$('[data-split]', root).forEach((el) => {
      const wi = split(el, true);
      if (reduce) return;
      gsap.fromTo(wi, { yPercent: 112, y: 0 }, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
    $$('[data-scrub]', root).forEach(scrubWords);
    $$('[data-fade]', root).forEach((el) => {
      if (reduce) return;
      gsap.fromTo(el, { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%' }
      });
    });
    $$('[data-count]', root).forEach((el) => {
      const m = el.dataset.count.match(/^([\d.,]+)(.*)$/);
      if (!m || reduce) { el.textContent = el.dataset.count; return; }
      const target = parseFloat(m[1].replace(/,/g, '')), suffix = m[2];
      const dec = (m[1].split('.')[1] || '').length;
      const o = { v: 0 };
      el.textContent = (0).toFixed(dec) + suffix;
      gsap.to(o, {
        v: target, duration: 1.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => { el.textContent = o.v.toFixed(dec) + suffix; }
      });
    });
  }

  // rise-in for a headline built from <br> separated lines
  function lineSpans(el) {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p) => `<span class="l"><span>${p}</span></span>`).join('');
    return $$('.l > span', el);
  }
  function introLines(h1, delay) {
    const lines = lineSpans(h1);
    return gsap.fromTo(lines, { yPercent: 105, y: 0 }, {
      yPercent: 0, duration: reduce ? 0.01 : 1.3, ease: 'power4.out', stagger: 0.12, delay: delay || 0,
      onComplete: () => h1.classList.add('done')
    });
  }

  /* --------------------------------------------------------------- chrome */
  const NAV = [
    ['Work', 'work.html', 'work'],
    ['Lab', 'lab.html', 'lab'],
    ['AI Toolkit', 'index.html#toolkit', 'toolkit'],
    ['About', 'about.html', 'about'],
    ['Contact', '#contact', 'contact']
  ];
  const isExp = new URLSearchParams(location.search).has('e');
  const navCurrent = { work: 'work', case: isExp ? 'lab' : 'work', lab: 'lab', about: 'about' }[page];
  const navHTML = (cls) => NAV.map(([label, href, key]) => `<a href="${href}"${key === navCurrent ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <header class="hdr">
      <a href="index.html" class="logo">Vibhor Mathur</a>
      <nav aria-label="Primary">${navHTML()}</nav>
      <span class="clock mono"></span>
      <button class="menu-btn" type="button" aria-controls="mnav" aria-expanded="false">Menu</button>
    </header>
    <div class="mnav" id="mnav">${navHTML()}</div>`);

  function contactHTML() {
    const ct = SITE.contact || {};
    const links = (ct.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
    const mail = Array.from(ct.email || '').map((c, i) => `<span class="mc" style="--i:${i}">${esc(c)}</span>`).join('');
    return `
      <section class="contact" id="contact">
        <p class="big" data-split>${inline(ct.headline)}</p>
        <a class="mail" href="mailto:${esc(ct.email)}" aria-label="Email ${esc(ct.email)}">${mail}</a>
        <div class="foot mono"><nav aria-label="Social">${links}</nav><span>Bengaluru <span data-clock></span></span><span>&copy; ${new Date().getFullYear()}</span></div>
      </section>`;
  }

  function startClocks() {
    $$('.clock').forEach((el) => { const f = () => (el.textContent = 'Bengaluru ' + clock()); f(); setInterval(f, 20000); });
    $$('[data-clock]').forEach((el) => { const f = () => (el.textContent = clock() + ' IST'); f(); setInterval(f, 20000); });
  }

  /* --------------------------------------------------------------- cursor */
  const cur = $('.cur');
  if (cur && fine) {
    const label = cur.querySelector('span');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; });
    gsap.ticker.add(() => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    });
    document.addEventListener('mouseover', (e) => {
      const sc = e.target.closest && e.target.closest('[data-cur]');
      cur.classList.toggle('solid-ink', !!sc && sc.dataset.cur === 'ink');
      cur.classList.toggle('solid-white', !!sc && sc.dataset.cur === 'white');
      const v = e.target.closest && e.target.closest('[data-cursor]');
      if (v) { label.textContent = v.dataset.cursor; cur.classList.add('view'); cur.classList.remove('link'); return; }
      cur.classList.remove('view');
      cur.classList.toggle('link', !!(e.target.closest && e.target.closest('a,button,select,label')));
    });
  }

  /* -------------------------------------------- header, menu, transitions */
  const hdr = $('.hdr');
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) < 6) return;
    lastY = y;
    if (document.body.classList.contains('menu-open') || hdr.contains(document.activeElement)) return;
    hdr.classList.toggle('hide', dy > 0 && y > 140);
  }, { passive: true });

  const mbtn = $('.menu-btn'), mnav = $('.mnav');
  function closeMenu() { document.body.classList.remove('menu-open'); mnav.classList.remove('open'); mbtn.textContent = 'Menu'; mbtn.setAttribute('aria-expanded', 'false'); lenis.start(); }
  mbtn.addEventListener('click', () => {
    const o = mnav.classList.toggle('open');
    document.body.classList.toggle('menu-open', o);
    mbtn.textContent = o ? 'Close' : 'Menu';
    mbtn.setAttribute('aria-expanded', String(o));
    o ? lenis.stop() : lenis.start();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  const curtain = $('.curtain');
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || /^(mailto:|tel:)/.test(href) || a.target === '_blank' || a.hasAttribute('download')) return;
    let url;
    try { url = new URL(a.href, location.href); } catch (er) { return; }
    if (url.origin !== location.origin) return;
    const samePage = url.pathname === location.pathname || (url.pathname.endsWith('/index.html') && location.pathname.endsWith('/'));
    if (href.startsWith('#') || (samePage && url.hash)) {
      e.preventDefault();
      const t = $(url.hash);
      closeMenu();
      if (t) lenis.scrollTo(t, { offset: 0, duration: 1.6 });
      return;
    }
    e.preventDefault();
    closeMenu();
    lenis.stop();
    gsap.fromTo(curtain, { yPercent: 100 }, {
      yPercent: 0, duration: reduce ? 0.01 : 0.85, ease: 'power4.inOut',
      onComplete: () => { try { sessionStorage.setItem('vmnav', '1'); } catch (er) {} location.href = a.href; }
    });
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted && curtain) { gsap.set(curtain, { yPercent: 100 }); lenis.start(); } });

  function curtainOut(cb, delay) {
    gsap.fromTo(curtain, { yPercent: 0 }, {
      yPercent: -100, duration: reduce ? 0.01 : 1, ease: 'power4.inOut', delay: delay || 0,
      onStart: () => setTimeout(cb, reduce ? 0 : 450),
      onComplete: () => { html.classList.remove('nav-in'); gsap.set(curtain, { yPercent: 100 }); }
    });
  }
  // run `intro` after the arrival transition (or straight away on a first visit)
  function arrive(intro) {
    if (html.classList.contains('nav-in')) curtainOut(intro, 0.1); else intro();
  }

  function finish() {
    startClocks();
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }

  window.VM = { SITE, $, $$, esc, inline, nl, md, rand, pad2, projHref, reduce, fine, html, gsap, lenis, split, scrubWords, initReveals, lineSpans, introLines, contactHTML, curtainOut, arrive, finish };
})();
