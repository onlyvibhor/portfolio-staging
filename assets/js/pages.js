// Work, Lab, About and case-study / experiment pages
(function () {
  'use strict';
  const { SITE, $, $$, esc, inline, nl, md, pad2, projHref, reduce, html, gsap, initReveals, lineSpans, introLines, contactHTML, arrive, finish } = window.VM;
  const PROJECTS = window.PROJECTS || [];
  const EXPERIMENTS = window.EXPERIMENTS || [];
  const ABOUT = window.ABOUT || {};
  const TOOLKIT = window.TOOLKIT || {};
  const MENTORSHIP = window.MENTORSHIP || {};
  const page = document.body.dataset.page;
  const root = $('#app');

  const CAT_ORDER = ['AI Film', 'Campaign', 'Video', 'Motion', 'Landing Page / Web', 'Brand & Identity', 'Social', 'Print'];
  function orderedCats(list, key, preferred) {
    const set = new Map();
    list.forEach((p) => (p[key] || []).forEach((c) => set.set(c, (set.get(c) || 0) + 1)));
    const rank = (n) => { const i = (preferred || []).indexOf(n); return i < 0 ? 99 : i; };
    return [...set.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((n) => [n, set.get(n)]);
  }

  function pageHead(label, title, intro, count) {
    return `
      <section class="page-head z2">
        <p class="mono top"><span>${esc(label)}</span><span>(${pad2(count)})</span></p>
        <h1 aria-label="${esc(title.replace(/\n/g, ' '))}">${nl(title)}</h1>
        ${intro ? `<p class="intro" data-fade>${esc(intro)}</p>` : ''}
      </section>`;
  }

  /* ===================================================================== */
  /* Filterable list pages (Work, Lab)                                       */
  /* ===================================================================== */
  function listPage(cfg) {
    const { items, key, label, title, intro, kind, preferred, card, gridClass, sortable } = cfg;
    const cats = orderedCats(items, key, preferred);
    const state = { cat: 'All', sort: 'featured' };

    root.innerHTML = pageHead(label, title, intro, items.length) + `
      <div class="filters z2" role="group" aria-label="Filter by category">
        <div class="fchips">
          <button class="fchip" type="button" data-cat="All" aria-pressed="true">All <span class="n">${items.length}</span></button>
          ${cats.map(([c, n]) => `<button class="fchip" type="button" data-cat="${esc(c)}" aria-pressed="false">${esc(c)} <span class="n">${n}</span></button>`).join('')}
        </div>
        ${sortable ? `<label class="fsort mono">Sort <select id="sort" aria-label="Sort projects"><option value="featured">Featured</option><option value="newest">Newest</option><option value="az">A to Z</option></select></label>` : ''}
      </div>
      <div class="${gridClass} z2" id="grid" aria-live="polite"></div>` + contactHTML();

    const grid = $('#grid');

    function list() {
      let l = items.filter((p) => state.cat === 'All' || (p[key] || []).includes(state.cat));
      if (state.sort === 'newest') l = l.slice().sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0) || (a.order || 99) - (b.order || 99));
      if (state.sort === 'az') l = l.slice().sort((a, b) => a.title.localeCompare(b.title));
      return l;
    }
    function paint(animate) {
      const l = list();
      grid.innerHTML = l.length ? l.map((p, i) => card(p, i)).join('') : '<p class="empty">Nothing here yet.</p>';
      if (animate && !reduce) gsap.fromTo($$('.card,.lcard', grid), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 });
      window.ScrollTrigger && ScrollTrigger.refresh();
    }
    function apply() {
      if (reduce) { paint(false); return; }
      gsap.to($$('.card,.lcard', grid), { opacity: 0, y: -10, duration: 0.2, ease: 'power2.in', stagger: 0.02, onComplete: () => paint(true) });
    }

    $$('.fchip').forEach((b) => b.addEventListener('click', () => {
      state.cat = b.dataset.cat;
      $$('.fchip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      apply();
    }));
    const sel = $('#sort');
    if (sel) sel.addEventListener('change', () => { state.sort = sel.value; apply(); });

    paint(false);
    finish();
    const h1 = $('.page-head h1');
    arrive(() => {
      introLines(h1);
      if (!reduce) gsap.fromTo($$('.card,.lcard', grid), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.3 });
    });
    initReveals(document);
  }

  function projectCard(p, i) {
    const c = p.cover || {};
    const media = c.image
      ? `<div class="card-media"><img src="${esc(c.image)}" alt="${esc(p.title)}" loading="${i < 4 ? 'eager' : 'lazy'}"></div>`
      : `<div class="card-media type"><span class="mono">${esc((p.categories || [])[0] || 'Project')}</span><b>${esc(p.title)}</b></div>`;
    const sub = [p.client, p.year].filter(Boolean).join(' · ');
    return `
      <a class="card" href="${esc(projHref(p))}"data-cursor="View">
        ${media}
        <div class="card-meta">
          <span class="n mono">${pad2(i + 1)}</span>
          <h3><span>${esc(p.title)}</span></h3>
          ${sub ? `<p class="sub mono">${esc(sub)}</p>` : ''}
          <div class="tags">${(p.categories || []).map((t) => `<span class="tag mono">${esc(t)}</span>`).join('')}</div>
        </div>
      </a>`;
  }

  function labCard(e) {
    const c = e.cover || {};
    const media = c.image
      ? `<div class="lm"><img src="${esc(c.image)}" alt="${esc(e.title)}" loading="lazy"></div>`
      : `<div class="lm type"><span class="mono">${esc((e.medium || [])[0] || 'Experiment')}</span><b>${esc(e.title)}</b></div>`;
    return `<a class="lcard" href="${esc(projHref(e, 'e'))}"data-cursor="View">${media}<h3>${esc(e.title)}</h3><span class="lt mono">${esc([e.year, (e.medium || []).join(', ')].filter(Boolean).join(' · '))}</span></a>`;
  }

  /* ===================================================================== */
  /* About                                                                  */
  /* ===================================================================== */
  function aboutPage() {
    const A = ABOUT, tl = A.timeline || {}, ld = A.leadership || {}, st = A.studio || {}, th = A.teaching || {}, rc = A.recognition || {}, wr = A.writing || {}, el = A.elsewhere || {};
    document.title = (A.meta && A.meta.title) || 'About';
    const d = $('meta[name="description"]'); if (d && A.meta) d.setAttribute('content', A.meta.description);

    const head = (n, label, title) => `<div class="asec-head"><span class="mono">${pad2(n)} / ${esc(label)}</span>${title ? `<h2 data-split>${inline(title)}</h2>` : ''}</div>`;
    const labCards = EXPERIMENTS.slice(0, 3).map((e) => {
      const c = e.cover || {};
      return c.image ? `<a class="lcard" href="${esc(projHref(e, 'e'))}"data-cursor="View"><div class="lm"><img src="${esc(c.image)}" alt="${esc(e.title)}" loading="lazy"></div><h3>${esc(e.title)}</h3><span class="lt mono">${esc([e.year, (e.medium || []).join(', ')].filter(Boolean).join(' · '))}</span></a>` : '';
    }).join('');

    root.innerHTML = `
      <section class="about-hero z2">
        <p class="mono top">${esc(A.label || 'About')}</p>
        <h1 data-split>${inline(A.headline)}</h1>
      </section>

      <section class="about-main z2">
        <aside class="about-side" data-fade>
          <div class="ph"><img src="${esc(A.portrait)}" alt="Portrait of Vibhor Mathur"></div>
          <div class="cap mono"><span>Vibhor Mathur</span><span>${esc(A.portrait_caption)}</span></div>
          <dl class="facts">${(A.facts || []).map((f) => `<div><dt class="mono">${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
        </aside>
        <div class="about-copy">
          ${(A.intro || []).map((t, i) => `<p data-fade>${inline(t)}</p>`).join('')}
          <div class="numbers" data-fade>${(A.numbers || []).map((n) => `<div><b data-count="${esc(n.value)}">${esc(n.value)}</b><span>${esc(n.label)}</span></div>`).join('')}</div>
        </div>
      </section>

      <section class="asec z2">
        ${head(1, tl.label || 'Path', tl.label)}
        <div class="tl">${(tl.items || []).map((r) => `
          <div class="tl-row" data-fade>
            <p class="yrs mono">${esc(r.years)}</p>
            <div><h3>${esc(r.org)}</h3><p class="role mono">${esc(r.role)}</p><p>${esc(r.note)}</p></div>
          </div>`).join('')}</div>
      </section>

      <section class="asec dark dark-pad z2" style="margin-top:clamp(70px,13vh,170px)">
        <div class="asec-head"><span class="mono">02 / ${esc(ld.label)}</span><h2 data-split>${esc(ld.title)}</h2></div>
        <div class="asec-head" style="margin-top:-20px"><span></span><p class="intro-p" data-fade>${esc(ld.intro)}</p></div>
        <div class="lead-grid">${(ld.items || []).map((it, i) => `<div data-fade><span class="k mono">${pad2(i + 1)}</span><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`).join('')}</div>
        ${ld.source ? `<a class="btn src" href="${esc(ld.source.url)}" target="_blank" rel="noopener">${esc(ld.source.label)}</a>` : ''}
      </section>

      <section class="blue-panel z2" data-cur="white">
        <span class="mono">03 / ${esc(st.label)}</span>
        <h2 data-split>${esc(st.title)}</h2>
        ${String(st.body || '').split(/\n\n/).map((t) => `<p data-fade>${esc(t)}</p>`).join('')}
        ${st.link ? `<a class="btn" href="${esc(st.link.url)}" data-fade>${esc(st.link.label)}</a>` : ''}
        ${labCards ? `<div class="lab-row" data-fade style="grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))">${labCards}</div>` : ''}
      </section>

      <section class="asec z2">
        ${head(4, th.label, th.label)}
        <div class="teach">
          <div data-fade>${th.quote ? `<blockquote>&ldquo;${esc(th.quote.text)}&rdquo;</blockquote><p class="who mono">${esc(th.quote.who)}</p>` : ''}</div>
          <div data-fade><ul>${(th.items || []).map((r) => `<li><span>${esc(r.name)}</span><span>${esc(r.detail)}</span></li>`).join('')}</ul>${th.link ? `<a class="btn" href="${esc(th.link.url)}" style="margin-top:22px">${esc(th.link.label)}</a>` : ''}</div>
        </div>
      </section>

      <section class="asec z2">
        ${head(5, rc.label, rc.label)}
        <div data-fade>${(rc.items || []).map((r) => `<div class="reco-row w4"><span>${esc(r.name)}</span><span>${esc(r.detail)}</span><span>${esc(r.work)}</span><span class="mono">${esc(r.year)}</span></div>`).join('')}</div>
      </section>

      <section class="asec z2">
        ${head(6, wr.label, wr.label)}
        <ul class="writing" data-fade>${(wr.items || []).map((w) => `<li><a href="${esc(w.url)}" target="_blank" rel="noopener"><b>${esc(w.title)}</b><span class="mono">${esc(w.date)} &#8599;</span></a></li>`).join('')}</ul>
      </section>

      <section class="asec z2">
        ${head(7, el.label, el.label)}
        <div class="elsewhere" data-fade>${(el.items || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <span aria-hidden="true" style="font-size:.5em">&#8599;</span></a>`).join('')}</div>
      </section>` + contactHTML();

    finish();
    arrive(() => {});
    initReveals(document);
  }


  /* ===================================================================== */
  /* AI Toolkit                                                             */
  /* ===================================================================== */
  function toolkitPage() {
    const T = TOOLKIT, th = T.tools_head || {}, it = T.interactive || {}, ln = T.learn || {}, sk = T.stack || {}, tm = T.team || {}, cta = T.cta || {};
    document.title = (T.meta && T.meta.title) || 'AI Toolkit';
    const d = $('meta[name="description"]'); if (d && T.meta) d.setAttribute('content', T.meta.description);
    const head = (n, label, title) => `<div class="asec-head"><span class="mono">${pad2(n)} / ${esc(label)}</span>${title ? `<h2 data-split>${inline(title)}</h2>` : ''}</div>`;
    const proof = (pr) => `<${pr.href ? `a href="${esc(pr.href)}"${/^https?:/.test(pr.href) ? ' target="_blank" rel="noopener"' : ''} data-cursor="View"` : 'div'} class="tk-proof"><b>${esc(pr.label)}</b><span>${esc(pr.detail)}</span>${pr.href ? '<i aria-hidden="true">&rarr;</i>' : ''}</${pr.href ? 'a' : 'div'}>`;

    const pillars = (T.pillars || []).map((p, i) => `
      <article class="tk-pillar" data-fade>
        <div class="tk-pn"><span class="mono">${pad2(i + 1)}</span><h3>${esc(p.title)}</h3></div>
        <div class="tk-pb"><p>${esc(p.body)}</p><div class="tk-proofs">${(p.proof || []).map(proof).join('')}</div></div>
      </article>`).join('');

    const tools = (T.tools || []).map((t, i) => `
      <article class="tk-tool">
        <div class="tk-th" data-fade>
          <span class="mono">${pad2(i + 1)} / ${esc(t.tag)}</span>
          <h3>${esc(t.name)}</h3>
          <p>${esc(t.body)}</p>
          <ul>${(t.bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
          ${t.built_with ? `<p class="bw mono">Built with: ${esc(t.built_with)}</p>` : ''}
        </div>
        ${t.hero ? `<figure class="tk-hero-img" data-fade><img src="${esc(t.hero)}" alt="${esc(t.name)} interface" loading="lazy"></figure>` : ''}
        ${(t.gallery || []).length ? `<div class="tk-gal" data-fade>${t.gallery.map((g) => `<img src="${esc(g)}" alt="" loading="lazy">`).join('')}</div>` : ''}
      </article>`).join('');

    const inter = (it.items || []).map((x) => {
      const ex = /^https?:/.test(x.href || '');
      const tag = x.href ? `a href="${esc(x.href)}"${ex ? ' target="_blank" rel="noopener"' : ''} data-cursor="View"` : 'div';
      return `<${tag} class="tk-int" data-fade>
        ${x.image ? `<div class="im"><img src="${esc(x.image)}" alt="${esc(x.title)}" loading="lazy"></div>` : `<div class="im type"><b>${esc(x.title)}</b></div>`}
        <span class="mono">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p>${x.href ? `<span class="go mono">${ex ? 'Open it' : 'Case study'} ${ex ? '&#8599;' : '&rarr;'}</span>` : ''}
      </${x.href ? 'a' : 'div'}>`;
    }).join('');

    root.innerHTML = `
      <section class="about-hero tk-top z2">
        <p class="mono top">${esc(T.label || 'AI Toolkit')}</p>
        <h1 data-split>${inline(T.headline)}</h1>
        <p class="tk-intro" data-fade>${esc(T.intro)}</p>
      </section>

      <section class="tk-principles z2">${(T.principles || []).map((p, i) => `<div data-fade><span class="k mono">${pad2(i + 1)}</span><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`).join('')}</section>

      <section class="asec z2">
        ${head(1, 'Why build tools', 'Four things that change when the studio builds its own tools.')}
        <div class="tk-pillars">${pillars}</div>
      </section>

      <section class="asec dark dark-pad z2" style="margin-top:clamp(70px,13vh,170px)" id="tools">
        ${head(2, th.label || 'Tools', th.title)}
        <div class="asec-head" style="margin-top:-20px"><span></span><p class="intro-p" data-fade>${esc(th.body)}</p></div>
        <div class="tk-tools">${tools}</div>
      </section>

      <section class="blue-panel tk-inter z2" data-cur="white">
        <span class="mono">03 / ${esc(it.label)}</span>
        <h2 data-split>${esc(it.title)}</h2>
        <p data-fade>${esc(it.body)}</p>
        <div class="tk-ints">${inter}</div>
      </section>

      <section class="asec z2">
        ${head(4, ln.label || 'Learning', ln.title)}
        <div class="tk-learn">
          <div data-fade><p class="lead-p">${esc(ln.body)}</p>
            <ul class="tk-talks">${(ln.items || []).map((r) => `<li><span>${esc(r.name)}</span><span>${esc(r.detail)}</span></li>`).join('')}</ul>${ln.link ? `<a class="btn" href="${esc(ln.link.href)}" style="margin-top:24px">${esc(ln.link.label)}</a>` : ''}</div>
          <div class="tk-posters" data-fade>${(ln.images || []).map((g) => `<figure><img src="${esc(g.image)}" alt="${esc(g.caption)}" loading="lazy"><figcaption class="cap mono">${esc(g.caption)}</figcaption></figure>`).join('')}</div>
        </div>
        ${ln.wide ? `<figure class="tk-wide" data-fade><img src="${esc(ln.wide)}" alt="" loading="lazy"></figure>` : ''}
      </section>

      <section class="asec z2">
        ${head(5, sk.label || 'Stack')}
        <div class="chips" data-fade>${(sk.items || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
        ${tm.body ? `<p class="tk-team" data-fade><span class="mono">${esc(tm.label)}</span>${esc(tm.body)}</p>` : ''}
        ${cta.href ? `<a class="btn tk-cta" href="${esc(cta.href)}" data-fade>${esc(cta.label)}</a>` : ''}
      </section>` + contactHTML();

    finish();
    arrive(() => {});
    initReveals(document);
  }


  /* ===================================================================== */
  /* Mentorship                                                             */
  /* ===================================================================== */
  function mentorshipPage() {
    const M = MENTORSHIP, o = M.oneonone || {}, v = M.voices || {}, ev = M.events || {}, g = M.gallery || {}, rd = M.reading || {}, cta = M.cta || {};
    document.title = (M.meta && M.meta.title) || 'Mentorship';
    const d = $('meta[name="description"]'); if (d && M.meta) d.setAttribute('content', M.meta.description);
    const head = (n, label, title) => `<div class="asec-head"><span class="mono">${pad2(n)} / ${esc(label)}</span>${title ? `<h2 data-split>${inline(title)}</h2>` : ''}</div>`;
    const isExt = (u) => /^https?:/.test(u || '');
    const btn = (b, cls) => `<a class="btn ${cls || ''}" href="${esc(b.href)}"${isExt(b.href) ? ' target="_blank" rel="noopener"' : ''} data-fade>${esc(b.label)}</a>`;

    const events = (ev.items || []).map((e) => `
      <article class="mt-ev${e.image ? '' : ' noimg'}" data-fade>
        ${e.image ? `<div class="im"><img src="${esc(e.image)}" alt="${esc(e.title)}" loading="lazy"></div>` : ''}
        <div class="tx">
          <p class="mono">${esc([e.type, e.date].filter(Boolean).join(' · '))}</p>
          <h3>${esc(e.title)}</h3>
          <p class="host">${esc(e.host)}</p>
          <p>${esc(e.detail)}</p>
        </div>
      </article>`).join('');

    root.innerHTML = `
      <section class="about-hero tk-top z2">
        <p class="mono top">${esc(M.label || 'Mentorship')}</p>
        <h1 data-split>${inline(M.headline)}</h1>
        <p class="tk-intro" data-fade>${esc(M.intro)}</p>
      </section>

      <section class="mt-numbers z2">
        <div class="numbers" data-fade>${(M.numbers || []).map((n) => `<div><b data-count="${esc(n.value)}">${esc(n.value)}</b><span>${esc(n.label)}</span></div>`).join('')}</div>
        ${M.numbers_note ? `<p class="mono mt-note">${esc(M.numbers_note)}</p>` : ''}
      </section>

      <section class="asec z2">
        ${head(1, o.label || 'One to one', o.title)}
        <div class="mt-one">
          <div data-fade><p class="lead-p">${esc(o.body)}</p>${o.cta ? btn(o.cta) : ''}</div>
          <div data-fade><h4 class="mono">${esc(o.topics_label)}</h4><div class="chips">${(o.topics || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
        </div>
      </section>

      <section class="asec dark dark-pad z2" style="margin-top:clamp(70px,13vh,170px)">
        ${head(2, v.label || 'Voices', 'In their words.')}
        <div class="mt-voices">${(v.items || []).map((q) => `<figure data-fade><blockquote>&ldquo;${esc(q.text)}&rdquo;</blockquote><figcaption class="mono">${esc(q.who)}</figcaption></figure>`).join('')}</div>
        ${v.note ? `<p class="mono mt-note light">${esc(v.note)}</p>` : ''}
      </section>

      <section class="asec z2">
        ${head(3, ev.label || 'Events', ev.title)}
        <div class="asec-head" style="margin-top:-20px"><span></span><p class="intro-p" data-fade>${esc(ev.body)}</p></div>
        <div class="mt-events">${events}</div>
      </section>

      ${(g.items || []).length ? `<section class="asec z2">
        ${head(4, g.label || 'Gallery')}
        <div class="mt-gal" data-fade>${g.items.map((i) => `<figure class="${i.tall ? 'tall' : ''}"><img src="${esc(i.image)}" alt="${esc(i.caption)}" loading="lazy"><figcaption class="cap mono">${esc(i.caption)}</figcaption></figure>`).join('')}</div>
      </section>` : ''}

      ${(rd.items || []).length ? `<section class="asec z2">
        ${head(5, rd.label || 'Reading')}
        <ul class="writing" data-fade>${rd.items.map((w) => `<li><a href="${esc(w.url)}" target="_blank" rel="noopener"><b>${esc(w.title)}</b><span class="mono">${esc(w.date)} &#8599;</span></a></li>`).join('')}</ul>
      </section>` : ''}

      <section class="blue-panel mt-cta z2" data-cur="white">
        <span class="mono">${esc(cta.label)}</span>
        <h2 data-split>${esc(cta.title)}</h2>
        <p data-fade>${esc(cta.body)}</p>
        <div class="mt-btns">${(cta.buttons || []).map((b) => btn(b)).join('')}</div>
      </section>` + contactHTML();

    finish();
    arrive(() => {});
    initReveals(document);
  }

  /* ===================================================================== */
  /* Case study (?c=slug) and experiment (?e=slug)                          */
  /* ===================================================================== */
  /* short silent loop: source is attached when scrolled near, so many clips cost nothing up front */
  const loopVideo = (src, poster) => `<video data-loop="${esc(src)}" muted loop playsinline preload="none"${poster ? ` poster="${esc(poster)}"` : ''}${reduce ? ' controls' : ''}></video>`;

  function initLoops() {
    const vs = $$('video[data-loop]');
    if (!vs.length) return;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      es.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.src = v.dataset.loop;
          if (!reduce) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' }) : null;
    vs.forEach((v) => { if (io) io.observe(v); else { v.src = v.dataset.loop; v.controls = true; } });
  }

  function videoHTML(b) {
    const url = b.url || '';
    const size = b.size === 'full' ? 'full' : 'wide';
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const btn = '<button class="play-btn" type="button" aria-label="Play video"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg></button>';
    let inner = '';
    if (yt) {
      const id = yt[1];
      inner = `<div class="vbox" data-embed="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1"><img src="${esc(b.poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}" alt="" loading="lazy">${btn}</div>`;
    } else if (vm) {
      inner = `<div class="vbox" data-embed="https://player.vimeo.com/video/${vm[1]}?autoplay=1">${b.poster ? `<img src="${esc(b.poster)}" alt="" loading="lazy">` : ''}${btn}</div>`;
    } else if (url) {
      inner = b.loop
        ? `<div class="vbox">${loopVideo(url, b.poster)}</div>`
        : `<div class="vbox"><video src="${esc(url)}" controls playsinline preload="metadata" ${b.poster ? `poster="${esc(b.poster)}"` : ''}></video></div>`;
    }
    return `<figure class="blk blk-video size-${size} z2" data-fade>${inner}${b.caption ? `<figcaption class="cap mono">${esc(b.caption)}</figcaption>` : ''}</figure>`;
  }

  function blockHTML(b) {
    switch (b.type) {
      case 'text':
        return `<section class="blk blk-text z2" data-fade><div class="blk-row"><h4 class="mono">${esc(b.label)}</h4><div>${b.title ? `<h3 class="blk-title">${inline(b.title)}</h3>` : ''}${b.body ? `<div class="prose">${md(b.body)}</div>` : ''}</div></div></section>`;
      case 'statement':
        return `<section class="blk blk-statement z2"><p class="stmt" data-scrub>${inline(b.text)}</p></section>`;
      case 'image':
        return `<figure class="blk blk-image size-${esc(b.size || 'wide')} z2" data-fade><img src="${esc(b.image)}" alt="${esc(b.alt || b.caption || '')}" loading="lazy">${b.caption ? `<figcaption class="cap mono">${esc(b.caption)}</figcaption>` : ''}</figure>`;
      case 'image_grid': {
        const cols = parseInt(b.columns, 10) || 2;
        return `<section class="blk z2"><div class="blk-grid" style="--cols:${cols}">${(b.images || []).map((im) => `<figure data-fade><img src="${esc(im.image)}" alt="${esc(im.caption || '')}" loading="lazy">${im.caption ? `<figcaption class="cap mono">${esc(im.caption)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;
      }
      case 'video':
        return videoHTML(b);
      case 'clips': {
        const cols = parseInt(b.columns, 10) || 2;
        return `<section class="blk z2"><div class="blk-grid clips" style="--cols:${cols}">${(b.clips || []).map((c) => `<figure data-fade><div class="clip">${loopVideo(c.video, c.poster)}</div>${c.caption ? `<figcaption class="cap mono">${esc(c.caption)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;
      }
      case 'steps':
        return `<section class="blk blk-steps z2"><div class="blk-row" data-fade><h4 class="mono">${esc(b.label)}</h4><div>${b.title ? `<h3 class="blk-title">${inline(b.title)}</h3>` : ''}</div></div><div class="steps-list">${(b.items || []).map((s, i) => `<div class="step" data-fade><div><span class="n mono">${pad2(i + 1)}</span><h5 style="display:inline">${esc(s.title)}</h5></div><div><p>${esc(s.body)}</p>${s.tools ? `<p class="tl2 mono">${esc(s.tools)}</p>` : ''}</div></div>`).join('')}</div></section>`;
      case 'tools':
        return `<section class="blk blk-text z2" data-fade><div class="blk-row"><h4 class="mono">${esc(b.label || 'Stack')}</h4><div class="chips">${(b.items || []).map((t) => `<span class="chip">${esc(typeof t === 'string' ? t : t.tool || t.name)}</span>`).join('')}</div></div></section>`;
      case 'metrics':
        return `<section class="blk blk-metrics z2"><div class="blk-row" data-fade><h4 class="mono">${esc(b.label)}</h4><div class="metrics">${(b.items || []).map((m) => `<div class="metric"><b data-count="${esc(m.value)}">${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div></div></section>`;
      case 'quote':
        return `<section class="blk blk-quote z2" data-fade><q>${inline(b.text)}</q>${b.who ? `<p class="who mono">${esc(b.who)}</p>` : ''}</section>`;
      default:
        return '';
    }
  }

  function casePage() {
    const params = new URLSearchParams(location.search);
    const isExp = params.has('e');
    const list = isExp ? EXPERIMENTS : PROJECTS;
    const slug = params.get(isExp ? 'e' : 'c');
    const p = list.find((x) => x.slug === slug) || (!slug ? list[0] : null);
    const back = isExp ? ['lab.html', 'the Lab'] : ['work.html', 'all work'];

    if (!p) {
      root.innerHTML = `<section class="case-hero z2"><h1>Not<br>found</h1><p class="case-hook" style="padding-left:0">That entry doesn't exist, or hasn't been published yet. <a href="${back[0]}" style="border-bottom:1px solid">Back to ${back[1]}</a>.</p></section>` + contactHTML();
      finish(); arrive(() => {}); return;
    }

    document.title = p.title + ' — Vibhor Mathur';
    const dsc = $('meta[name="description"]'); if (dsc && p.summary) dsc.setAttribute('content', p.summary);

    const siblings = list.filter((x) => (x.sections || []).length);
    const idx = siblings.indexOf(p);
    const next = siblings.length > 1 ? siblings[(idx + 1) % siblings.length] : null;
    const cover = p.cover || {};
    const coverMedia = cover.video
      ? `<video src="${esc(cover.video)}" muted loop playsinline autoplay preload="metadata" ${cover.image ? `poster="${esc(cover.image)}"` : ''}></video>`
      : (cover.image ? `<img src="${esc(cover.image)}" alt="${esc(p.title)}">` : '');
    const lines = String(p.title_lines || p.title).split(/\n/);
    const meta = isExp
      ? [['Medium', (p.medium || []).join(', ')], ['Tools', p.tools], ['Year', p.year], ['Type', 'Experiment']]
      : [['Client', p.client], ['Role', p.role], ['Year', p.year], ['Type', p.category]];
    const metrics = (p.metrics || []).length ? `<div class="metrics z2">${p.metrics.map((m) => `<div class="metric" data-fade><b data-count="${esc(m.value)}">${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div>` : '';
    const team = (p.team || []).length ? `<div data-fade><h4 class="mono">Team</h4><ul>${p.team.map((t) => `<li><span>${esc(t.name)}</span><span>${esc(t.role)}</span></li>`).join('')}</ul></div>` : '';
    const awards = (p.awards || []).length ? `<div data-fade><h4 class="mono">Recognition</h4><ul>${p.awards.map((a) => `<li><span>${esc(a.title)}</span><span>${esc(a.detail)}</span></li>`).join('')}</ul></div>` : '';
    const links = (p.links || []).length ? `<div data-fade><h4 class="mono">Links</h4><ul>${p.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><span aria-hidden="true">&#8599;</span></a></li>`).join('')}</ul></div>` : '';
    const hasEnd = team || awards || links;

    root.innerHTML = `
      <section class="case-hero z2">
        <h1 aria-label="${esc(p.title)}">${lines.map((t) => `<span class="l"><span>${esc(t)}</span></span>`).join('')}</h1>
        <div class="case-meta mono">${meta.filter((m) => m[1]).map((m) => `<div><span>${m[0]}</span>${esc(m[1])}</div>`).join('')}</div>
      </section>
      ${coverMedia ? `<div class="case-cover ${isExp ? 'sq' : ''} z2">${coverMedia}</div>` : ''}
      ${p.tagline ? `<p class="case-hook z2" data-split>${inline(p.tagline)}</p>` : ''}
      ${metrics}
      ${(p.sections || []).map(blockHTML).join('')}
      ${hasEnd ? `<section class="case-end z2">${team}${awards}${links}</section>` : ''}
      ${next
        ? `<a class="next" href="case.html?${isExp ? 'e' : 'c'}=${encodeURIComponent(next.slug)}" data-cursor="Next"><span class="mono">Next ${isExp ? 'experiment' : 'project'}</span><div class="t">${esc(next.title)}</div></a>`
        : `<a class="next" href="${back[0]}"><span class="mono">Back</span><div class="t">${isExp ? 'The Lab' : 'All work'}</div></a>`}
      ${contactHTML()}`;

    $$('.vbox[data-embed]', root).forEach((box) => {
      box.querySelector('.play-btn').addEventListener('click', () => {
        const f = document.createElement('iframe');
        f.src = box.dataset.embed; f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.allowFullscreen = true; f.title = 'Video player';
        box.innerHTML = ''; box.appendChild(f);
      });
    });

    initReveals(document);
    initLoops();
    finish();
    arrive(() => introLines($('.case-hero h1')));
  }

  /* ---- boot ---- */
  const S = SITE;
  if (page === 'work') {
    document.title = 'Work — Vibhor Mathur';
    listPage({ items: PROJECTS, key: 'categories', label: 'Work', title: 'Work', intro: 'Brand films, campaigns, launches and identities from Razorpay and Grofers. Filter by category.', preferred: CAT_ORDER, card: projectCard, gridClass: 'wgrid', sortable: true });
  } else if (page === 'lab') {
    document.title = 'Lab — Vibhor Mathur';
    listPage({ items: EXPERIMENTS, key: 'medium', label: 'Lab', title: 'Lab', intro: (S.lab && S.lab.sub) ? 'Art experiments made after hours: AI art, stop-motion animation and found-object art.' : '', preferred: ['AI art', 'Stop motion', 'Found objects', 'Conceptual art', 'Type & text'], card: (p) => labCard(p), gridClass: 'lgrid', sortable: false });
  } else if (page === 'about') {
    aboutPage();
  } else if (page === 'mentorship') {
    mentorshipPage();
  } else if (page === 'toolkit') {
    toolkitPage();
  } else if (page === 'case') {
    casePage();
  }
})();
