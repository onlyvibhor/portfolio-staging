// Home page
(function () {
  'use strict';
  const { SITE, $, $$, esc, inline, nl, rand, pad2, projHref, reduce, fine, html, gsap, lenis, scrubWords, initReveals, contactHTML, arrive, finish } = window.VM;
  const PROJECTS = window.PROJECTS || [];
  const EXPERIMENTS = window.EXPERIMENTS || [];

  const extAttr = (p) => (p.external_url ? ' target="_blank" rel="noopener"' : '');

  function heroHTML() {
    const h = SITE.hero || {};
    const slides = (h.slides || []).map((x) => x.image).filter(Boolean);
    const lines = [h.name_line_1, h.name_line_2].filter(Boolean);
    const letters = (t) => Array.from(t).map((c) => `<span class="ch"><span class="chi">${esc(c)}</span></span>`).join('');
    const titleInner = lines.map((t) => `<span class="l"><span class="ln" aria-hidden="true">${letters(t)}</span></span>`).join('');
    return `
      <section class="hero" id="top"><div class="hero-pin">
        <div class="hero-media" data-gl ${slides.length > 1 ? `data-gl-slides="${esc(slides.join(','))}"` : ''}>${slides[0] ? `<img src="${esc(slides[0])}" alt="">` : ''}</div>
        <div class="hero-meta mono">
          <p>${inline(h.meta_left)}</p>
          <p style="text-align:right">${inline(h.meta_right)}<br><br><span class="hint">Try breaking the title</span></p>
        </div>
        <h1 class="hero-title" aria-label="${esc(lines.join(' '))}">${titleInner}</h1>
        <div class="hero-clip" aria-hidden="true"><div class="layer"><div class="hero-title w">${titleInner}</div></div></div>
      </div></section>`;
  }

  function workHTML() {
    const w = SITE.work || {};
    const feat = PROJECTS.filter((p) => p.featured && p.cover && (p.cover.image || p.cover.video));
    const rest = PROJECTS.filter((p) => !feat.includes(p)).slice(0, 5);
    const items = feat.map((p, i) => {
      const cover = p.cover || {};
      const media = cover.video
        ? `<video src="${esc(cover.video)}" muted loop playsinline autoplay preload="metadata" ${cover.image ? `poster="${esc(cover.image)}"` : ''}></video>`
        : `<img src="${esc(cover.image)}" alt="${esc(p.title)}" loading="${i < 2 ? 'eager' : 'lazy'}">`;
      return `
        <a class="work-item" href="${esc(projHref(p))}"${extAttr(p)} data-cursor="View">
          <div class="work-media" data-gl>${media}</div>
          <div class="work-meta">
            <div><span class="n mono">${pad2(i + 1)}</span><h3>${nl(p.card_title || p.title)}</h3></div>
            <div class="r mono">${esc(p.client)}<br>${esc(p.category)} &middot; ${esc(p.year)}</div>
          </div>
        </a>`;
    }).join('');
    const more = rest.map((p) => `<a href="${esc(projHref(p))}"${extAttr(p)}><span>${esc(p.title)}</span><span aria-hidden="true">${p.external_url ? '&#8599;' : '&rarr;'}</span></a>`).join('');
    return `
      <section class="work" id="work"><div class="work-pin">
        <div class="work-head"><h2>${esc(w.title || 'Selected work')}</h2><span class="mono">(${pad2(feat.length)})</span></div>
        <div class="work-track">${items}<div class="work-more"><h3>${esc(w.more_title || 'More work')}</h3>${more}<a class="all" href="work.html"><span>${esc(w.all_label || 'All work')} (${PROJECTS.length})</span><span aria-hidden="true">&rarr;</span></a></div></div>
      </div></section>`;
  }

  function labCard(e) {
    const c = e.cover || {};
    const media = c.image
      ? `<div class="lm"><img src="${esc(c.image)}" alt="${esc(e.title)}" loading="lazy"></div>`
      : `<div class="lm type"><span class="mono">${esc((e.medium || [])[0] || 'Experiment')}</span><b>${esc(e.title)}</b></div>`;
    return `<a class="lcard" href="${esc(projHref(e, 'e'))}"${extAttr(e)} data-cursor="View">${media}<h3>${esc(e.title)}</h3><span class="lt mono">${esc([e.year, (e.medium || []).join(', ')].filter(Boolean).join(' · '))}</span></a>`;
  }

  function homeHTML() {
    const st = SITE.statement || {}, tl = SITE.tools || {}, lab = SITE.lab || {}, at = SITE.about_teaser || {}, rc = SITE.recognition || {};
    const tools = (tl.items || []).map((t, i) => `
      <div class="tool" data-fade data-cur="${i < 2 ? 'white' : 'ink'}" data-stack="${esc(t.stack || '')}">
        <span class="mono">${pad2(i + 1)}</span>
        <h3>${esc(t.name)}</h3>
        <div><p>${esc(t.desc)}</p>${t.stack ? `<span class="stack mono">${esc(t.stack)}</span>` : ''}</div>
        <span class="a" aria-hidden="true">&#8599;</span>
      </div>`).join('');
    const reco = (rc.items || []).map((r) => `<div class="reco-row"><span>${esc(r.name)}</span><span>${esc(r.detail)}</span><span class="mono">${esc(r.year)}</span></div>`).join('');

    return heroHTML() + `
      <section class="statement z2">
        <p class="big">${inline(st.text)}</p>
        <div class="row mono" data-fade><p>${esc(st.left)}</p><p>${esc(st.right)}</p></div>
      </section>` + workHTML() + `
      <section class="tools" id="toolkit">
        <h2 class="sec-title z2" data-split>${inline(tl.title)}</h2>
        <p class="sub z2" data-fade>${esc(tl.sub)}</p>
        <div class="tool-list z2">${tools}</div>
      </section>
      ${EXPERIMENTS.length ? `
      <section class="labstrip z2" id="lab">
        <div class="labstrip-head">
          <div><h2 class="sec-title" data-split>${inline(lab.title)}</h2><p class="sub" data-fade>${esc(lab.sub)}</p></div>
          <a class="btn" href="lab.html" data-fade>${esc(lab.label || 'Open the Lab')}</a>
        </div>
        <div class="lab-row" data-fade>${EXPERIMENTS.slice(0, 4).map(labCard).join('')}</div>
      </section>` : ''}
      <section class="about-teaser z2" id="about">
        <div data-fade>
          <div class="ph"><img src="${esc(at.portrait)}" alt="Portrait of Vibhor Mathur" loading="lazy"></div>
          <div class="cap mono"><span>${esc(at.caption_left)}</span><span>${esc(at.caption_right)}</span></div>
        </div>
        <div>
          <p class="lead" data-split>${inline(at.lead)}</p>
          <a class="btn" href="about.html" data-fade>${esc(at.label || 'More about me')}</a>
        </div>
      </section>
      <section class="reco z2">
        <h2 data-split>${esc(rc.title)}</h2>
        <div data-fade>${reco}</div>
      </section>` + contactHTML();
  }

  /* ---- hero: letters you can push around and smash ---- */
  function initHeroLetters(onAllBroken) {
    const ink = $$('.hero-title:not(.w) .ch'), wht = $$('.hero-title.w .ch');
    if (!ink.length) return;
    const L = ink.map((el, i) => {
      const els = [el, wht[i]].filter(Boolean);
      return {
        els, inner: els.map((e) => e.firstElementChild), broken: false, ever: false,
        qx: els.map((e) => gsap.quickTo(e, 'x', { duration: 0.7, ease: 'elastic.out(1,.55)' })),
        qy: els.map((e) => gsap.quickTo(e, 'y', { duration: 0.7, ease: 'elastic.out(1,.55)' })),
        qr: els.map((e) => gsap.quickTo(e, 'rotation', { duration: 0.7, ease: 'elastic.out(1,.55)' }))
      };
    });
    const pin = $('.hero-pin');
    const active = () => window.scrollY < window.innerHeight * 0.6;

    if (fine && !reduce) {
      pin.addEventListener('pointermove', (e) => {
        if (!active()) return;
        const R = Math.min(240, innerWidth * 0.18);
        L.forEach((l) => {
          const el = l.els[0], r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2 - gsap.getProperty(el, 'x');
          const cy = r.top + r.height / 2 - gsap.getProperty(el, 'y');
          const dx = cx - e.clientX, dy = cy - e.clientY, d = Math.hypot(dx, dy) || 1;
          const k = d < R ? Math.pow(1 - d / R, 2) : 0;
          const push = k * R * 0.45;
          l.qx.forEach((q) => q((dx / d) * push));
          l.qy.forEach((q) => q((dy / d) * push * 0.6));
          l.qr.forEach((q) => q((dx / d) * k * 14));
        });
      });
      pin.addEventListener('pointerleave', () => L.forEach((l) => { l.qx.forEach((q) => q(0)); l.qy.forEach((q) => q(0)); l.qr.forEach((q) => q(0)); }));
    }

    function shards(cx, cy) {
      const cols = ['#0a0a0a', '#2d5bff', '#00d2ff', '#12f0c0', '#7a4dff', '#ffffff'];
      for (let i = 0; i < (reduce ? 0 : 16); i++) {
        const s = document.createElement('i'); s.className = 'shard';
        s.style.left = cx + 'px'; s.style.top = cy + 'px';
        s.style.background = cols[i % cols.length]; s.style.width = s.style.height = rand(5, 12) + 'px';
        if (i % 2) s.style.clipPath = 'polygon(0 0,100% 30%,40% 100%)';
        document.body.appendChild(s);
        gsap.to(s, { x: rand(-160, 160), y: rand(-200, 120) + 240, rotation: rand(-360, 360), opacity: 0, duration: rand(0.7, 1.2), ease: 'power2.out', onComplete: () => s.remove() });
      }
    }

    L.forEach((l) => {
      l.inner.forEach((inn) => inn.addEventListener('pointerdown', (e) => {
        if (!active() || l.broken) return;
        e.preventDefault();
        l.broken = true;
        const r = l.els[0].getBoundingClientRect();
        shards(r.left + r.width / 2, r.top + r.height / 2);
        gsap.killTweensOf(l.inner);
        gsap.to(l.inner, { y: window.innerHeight * 0.55, rotation: () => rand(-70, 70), opacity: 0, duration: reduce ? 0.01 : 0.75, ease: 'power2.in' });
        gsap.to(l.inner, { y: 0, rotation: 0, opacity: 1, duration: reduce ? 0.01 : 1.2, ease: 'elastic.out(1,.6)', delay: reduce ? 0.3 : 1.5, onComplete: () => { l.broken = false; } });
        l.ever = true;
        if (L.every((x) => x.ever)) { L.forEach((x) => (x.ever = false)); onAllBroken && onAllBroken(); }
      }, { passive: false }));
    });
  }

  function toast(htmlStr) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast mono'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = htmlStr; requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 6500);
  }

  /* ---- toolkit rows: a tag that follows the cursor ---- */
  function initToolFloat() {
    if (!fine || reduce) return;
    const fl = document.createElement('div'); fl.className = 'tool-float mono'; document.body.appendChild(fl);
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; });
    gsap.ticker.add(() => {
      const px = cx; cx += (x - cx) * 0.16; cy += (y - cy) * 0.16;
      const rot = Math.max(-18, Math.min(18, (cx - px) * 1.2));
      fl.style.transform = `translate3d(${cx + 20}px,${cy + 20}px,0) rotate(${rot}deg)`;
    });
    $$('.tool').forEach((row) => {
      row.addEventListener('mouseenter', () => { if (!row.dataset.stack) return; fl.textContent = row.dataset.stack; fl.classList.add('on'); });
      row.addEventListener('mouseleave', () => fl.classList.remove('on'));
    });
  }

  function initMagnetic(sel) {
    if (!fine || reduce) return;
    $$(sel).forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.18); qy((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('mouseleave', () => { qx(0); qy(0); });
    });
  }

  /* ---- boot ---- */
  document.title = (SITE.meta && SITE.meta.title) || document.title;
  const md_ = $('meta[name="description"]'); if (md_ && SITE.meta) md_.setAttribute('content', SITE.meta.description);
  $('#app').innerHTML = homeHTML();
  if (window.GL) GL.scan();

  const lines = $$('.hero-title .ln');
  const heroTitles = $$('.hero-title');
  const heroIntro = () => {
    const tl = gsap.timeline({ onComplete: () => heroTitles.forEach((t) => t.classList.add('done')) });
    tl.fromTo(lines, { yPercent: 105, y: 0 }, { yPercent: 0, duration: reduce ? 0.01 : 1.4, ease: 'power4.out', stagger: 0.12 })
      .to('.hero-meta', { opacity: 1, duration: reduce ? 0.01 : 1 }, '-=.9');
  };

  const big = $('.statement .big'); if (big) scrubWords(big);

  // hero expansion: the framed image grows to full-bleed as you scroll
  const pin = $('.hero-pin');
  const layer = $('.hero-clip .layer');
  const syncLayer = () => { layer.style.width = pin.clientWidth + 'px'; layer.style.height = pin.clientHeight + 'px'; };
  syncLayer();
  window.addEventListener('resize', syncLayer);
  ScrollTrigger.addEventListener('refresh', syncLayer);
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } })
    .to('.hero-media,.hero-clip', { width: () => pin.clientWidth, height: () => pin.clientHeight, borderRadius: 0, ease: 'none', duration: 0.55 }, 0)
    .to('.hero-meta', { opacity: 0, duration: 0.12, ease: 'none' }, 0)
    .to({}, { duration: 0.45 });

  // horizontal gallery (desktop / large tablet only)
  gsap.matchMedia().add('(min-width: 900px)', () => {
    const track = $('.work-track');
    if (!track) return;
    const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.work-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1 }
    });
  });

  initReveals(document);
  initHeroLetters(() => toast('You broke it. <a href="case.html?c=btb">See how we built it &rarr;</a>'));
  initToolFloat();
  initMagnetic('.contact .mail');
  finish();

  // entrance: loader on a first visit, curtain when arriving from another page
  const seen = (() => { try { return sessionStorage.getItem('vmseen'); } catch (e) { return null; } })();
  const loader = $('.loader');
  if (html.classList.contains('nav-in')) {
    loader && loader.remove();
    arrive(heroIntro);
  } else if (loader && !seen && !reduce) {
    lenis.stop();
    try { sessionStorage.setItem('vmseen', '1'); } catch (e) {}
    const num = $('.count', loader), bar = $('.bar', loader), o = { v: 0 };
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    const t0 = performance.now();
    const done = () => {
      lenis.start();
      gsap.to(loader, { yPercent: -100, duration: 1.1, ease: 'power4.inOut', onComplete: () => loader.remove() });
      setTimeout(heroIntro, 650);
    };
    gsap.to(o, {
      v: 100, duration: 1.8, ease: 'power2.inOut',
      onUpdate: () => { num.textContent = pad2(Math.round(o.v)); if (bar) bar.style.width = o.v + '%'; },
      onComplete: function wait() { if (loaded || performance.now() - t0 > 6000) done(); else setTimeout(wait, 150); }
    });
  } else {
    loader && loader.remove();
    heroIntro();
  }
})();
