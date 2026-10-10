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
  const projHref = (p, kind) => `${kind === 'e' ? 'lab' : 'projects'}/${encodeURIComponent(p.slug)}/`;
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
              const w = document.createElement('span'); w.className = 'wm';
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
      const unmask = () => wi.forEach((n) => n.parentNode.classList.add('d'));
      if (reduce) { unmask(); return; }
      gsap.fromTo(wi, { yPercent: 140, y: 0 }, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 90%' }, onComplete: unmask
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
    return gsap.fromTo(lines, { yPercent: 130, y: 0 }, {
      yPercent: 0, duration: reduce ? 0.01 : 1.3, ease: 'power4.out', stagger: 0.12, delay: delay || 0,
      onComplete: () => h1.classList.add('done')
    });
  }

  /* --------------------------------------------------------------- chrome */
  const NAV = [
    ['Work', 'work.html', 'work'],
    ['Lab', 'lab.html', 'lab'],
    ['AI Toolkit', 'toolkit.html', 'toolkit'],
    ['Mentorship', 'mentorship.html', 'mentorship'],
    ['About', 'about.html', 'about'],
    ['Contact', '#contact', 'contact']
  ];
  const isExp = document.body.dataset.kind ? document.body.dataset.kind === 'lab' : new URLSearchParams(location.search).has('e');
  const navCurrent = { work: 'work', case: isExp ? 'lab' : 'work', lab: 'lab', about: 'about', toolkit: 'toolkit', mentorship: 'mentorship' }[page];
  const navHTML = (cls) => NAV.map(([label, href, key]) => `<a href="${href}"${key === navCurrent ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <header class="hdr">
     <div class="hdr-row">
      <a href="index.html" class="logo"><img class="hdr-av" src="assets/img/avatar/avatar-sm.webp" alt="" width="138" height="200" data-tilt="14"><span>Vibhor Mathur</span></a>
      <nav aria-label="Primary">${navHTML()}</nav>
      <span class="clock mono"></span>
      <button class="menu-btn" type="button" aria-controls="mnav" aria-expanded="false">Menu</button>
     </div>
    </header>
    <div class="mnav" id="mnav">${navHTML()}</div>`);

  /* ---- tool logos: tags for AI / design tools render as logos (mono masks), unknown names stay text ---- */
  const LOGO_RULES = [
    [/midjourney/i, 'midjourney.svg'], [/nano\s*banana/i, 'nanobanana.svg'], [/gemini/i, 'gemini.svg'],
    [/chatgpt|openai/i, 'openai.svg'], [/claude/i, 'claude.svg'], [/runway/i, 'runway.svg'], [/kling/i, 'kling.svg'],
    [/higgsfield/i, 'higgsfield.png'], [/eleven\s*labs/i, 'elevenlabs.svg'], [/suno/i, 'suno.svg'], [/topaz/i, 'topazlabs.svg'],
    [/replit/i, 'replit.svg'], [/firefly/i, 'adobefirefly.svg'], [/photoshop/i, 'adobephotoshop.svg'], [/premiere/i, 'adobepremierepro.svg'],
    [/after\s*effects/i, 'adobeaftereffects.svg'], [/illustrator/i, 'adobeillustrator.svg'], [/^adobe/i, 'adobe.svg'],
    [/stable\s*diffusion/i, 'stability.svg'], [/kaiber/i, 'kaiber.png'], [/d-?id/i, 'did.png']
  ];
  function logoFor(name) { const n = String(name || '').trim(); const r = LOGO_RULES.find((x) => x[0].test(n)); return r ? 'assets/img/logos/' + r[1] : null; }
  /* one tool: a logo mark (tooltip + accessible name) or, if we have no logo, its name as text */
  function toolMark(name, cls) {
    const n = String(name || '').trim(); if (!n) return '';
    const src = logoFor(n);
    return src
      ? `<span class="tm ${cls || ''}" role="img" aria-label="${esc(n)}" title="${esc(n)}"><i style="-webkit-mask-image:url(${src});mask-image:url(${src})"></i></span>`
      : `<span class="tm txt ${cls || ''}">${esc(n)}</span>`;
  }
  /* a list of tools, from an array or a free-text string ("Gemini, Nano Banana API and Replit"); logos are de-duplicated */
  function toolMarks(list, cls) {
    const arr = Array.isArray(list) ? list : String(list || '').split(/\s*(?:,|·|\+|&|and)\s*/i);
    const seen = new Set(); const out = [];
    arr.forEach((t) => { const n = String(t || '').trim(); if (!n) return; const src = logoFor(n); const key = src || n.toLowerCase(); if (seen.has(key)) return; seen.add(key); out.push(toolMark(n, cls)); });
    return out.join('');
  }
  /* "Gemini Studio for the interface, Nano Banana API": keep only the tools we have logos for */
  function toolMarksFromText(text, cls) {
    const found = []; String(text || '').split(/\s*(?:,|·|and)\s*/i).forEach((part) => { const src = logoFor(part); if (src) found.push(part); });
    return toolMarks(found, cls);
  }

  /* ---- Lab shuffle: any [data-shuffle] link jumps to a random experiment (never the one you are on) ---- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-shuffle]'); if (!a) return;
    const list = (window.EXPERIMENTS || []).filter((x) => (x.sections || []).length);
    const cur = document.body.dataset.slug || new URLSearchParams(location.search).get('e');
    const pool = list.filter((x) => x.slug !== cur); const pick = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
    if (pick) a.setAttribute('href', projHref(pick, 'e'));
  }, true);

  /* ---- awards: one data source (ABOUT.recognition) feeds the header ticker and the tiles ---- */
  function awardItems() { return ((window.ABOUT || {}).recognition || {}).items || []; }
  function awardsTicker(cls) {
    const parts = [];
    awardItems().forEach((r) => String(r.detail || '').split(/\.\s+/).map((d) => d.replace(/\.$/, '').trim()).filter(Boolean)
      .forEach((d) => parts.push(`<span><i aria-hidden="true"></i><b>${esc(r.name)} ${esc(r.year || '')}</b> ${esc(d)}</span>`)));
    if (!parts.length) return '';
    const run = parts.join('');
    return `<a class="tick${cls ? ' ' + cls : ''}" href="about.html#recognition" aria-label="Awards and recognition, see all"><span class="tick-lab">Awards</span><div class="tick-win"><div class="tick-track"><div>${run}</div><div aria-hidden="true">${run}</div></div></div></a>`;
  }
  function awardTiles(items) {
    return `<div class="award-tiles">${(items || awardItems()).map((r, i) => `
      <article class="award" data-fade>
        <span class="mono">${esc(r.year || '')}</span>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.detail)}</p>
        ${r.work ? `<p class="aw-work mono">${esc(r.work)}</p>` : ''}
      </article>`).join('')}</div>`;
  }

  function contactHTML() {
    const ct = SITE.contact || {};
    const prof = ct.profile ? `<a href="${esc(ct.profile.url)}" download>${esc(ct.profile.label)}</a>` : '';
    const links = prof + (ct.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
    const mail = Array.from(ct.email || '').map((c, i) => `<span class="mc" style="--i:${i}">${esc(c)}</span>`).join('');
    return `
      <section class="contact" id="contact">
        <img class="cav" src="assets/img/avatar/avatar.webp" alt="" aria-hidden="true" width="691" height="1000" loading="lazy" data-tilt="18">
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
    let x = 0, y = 0, cx = 0, cy = 0, seen = false, scrolled = false, last = performance.now();
    cur.classList.add('off');                       // hidden until the real pointer has been seen: no more flying in from the screen centre
    const place = () => { cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; };
    window.addEventListener('mousemove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; cx = x; cy = y; place(); cur.classList.remove('off'); }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => cur.classList.add('off'));
    document.documentElement.addEventListener('mouseenter', () => { if (seen) cur.classList.remove('off'); });
    gsap.ticker.add(() => {
      if (!seen) return;
      const now = performance.now(), dt = Math.min(64, now - last); last = now;
      const k = 1 - Math.pow(1 - 0.3, dt / 16.67);   // same feel at 60, 120 or 144 Hz
      cx += (x - cx) * k; cy += (y - cy) * k;
      place();
    });
    /* the cursor state follows the element under it, including when the page scrolls or animates under a still mouse */
    function state(t) {
      if (!t || !t.closest) return;
      cur.classList.toggle('off', !!t.closest('iframe,input,textarea,video[controls]') || !seen);
      const sc = t.closest('[data-cur]');
      cur.classList.toggle('solid-ink', !!sc && sc.dataset.cur === 'ink');
      cur.classList.toggle('solid-white', !!sc && sc.dataset.cur === 'white');
      const v = t.closest('[data-cursor]');
      if (v) { if (label.textContent !== v.dataset.cursor) label.textContent = v.dataset.cursor; cur.classList.add('view'); cur.classList.remove('link'); return; }
      cur.classList.remove('view');
      cur.classList.toggle('link', !!t.closest('a,button,select,label'));
    }
    document.addEventListener('mouseover', (e) => state(e.target), { passive: true });
    window.addEventListener('scroll', () => { scrolled = true; }, { passive: true });
    setInterval(() => { if (scrolled && seen) { scrolled = false; state(document.elementFromPoint(x, y)); } }, 120);
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

  /* 3D avatar: turns its head toward the cursor (fine pointers only) */
  function initTilt() {
    const els = $$('[data-tilt]');
    if (!els.length || reduce || !fine) return;
    let mx = innerWidth / 2, my = innerHeight / 2;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const st = els.map((el) => ({ el, max: parseFloat(el.dataset.tilt) || 14, rx: 0, ry: 0, on: true }));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { const s = st.find((x) => x.el === e.target); if (s) s.on = e.isIntersecting; }), { rootMargin: '100px' });
      st.forEach((s) => io.observe(s.el));
    }
    gsap.ticker.add(() => {
      st.forEach((s) => {
        if (!s.on) return;
        const r = s.el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (mx - (r.left + r.width / 2)) / (innerWidth * 0.5)));
        const dy = Math.max(-1, Math.min(1, (my - (r.top + r.height / 2)) / (innerHeight * 0.5)));
        s.ry += (dx * s.max - s.ry) * 0.08; s.rx += (-dy * s.max * 0.7 - s.rx) * 0.08;
        s.el.style.setProperty('--ry', s.ry.toFixed(2) + 'deg'); s.el.style.setProperty('--rx', s.rx.toFixed(2) + 'deg');
      });
    });
  }

  function finish() {
    startClocks();

    initTilt();
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }

  window.VM = { awardsTicker, toolMark, toolMarks, toolMarksFromText, logoFor, awardTiles, awardItems, SITE, $, $$, esc, inline, nl, md, rand, pad2, projHref, reduce, fine, html, gsap, lenis, split, scrubWords, initReveals, lineSpans, introLines, contactHTML, curtainOut, arrive, finish };
})();
