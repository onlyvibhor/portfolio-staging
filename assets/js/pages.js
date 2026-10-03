// Work, Lab, About and case-study / experiment pages
(function () {
  'use strict';
  const { SITE, $, $$, esc, inline, nl, md, pad2, projHref, reduce, html, gsap, initReveals, lineSpans, introLines, contactHTML, arrive, finish } = window.VM;
  const PROJECTS = window.PROJECTS || [];
  const EXPERIMENTS = window.EXPERIMENTS || [];
  const ABOUT = window.ABOUT || {};
  const page = document.body.dataset.page;
  const root = $('#app');
  const ext = (p) => (p.external_url ? ' target="_blank" rel="noopener"' : '');

  const CAT_ORDER = ['AI Film', 'Campaign', 'Video', 'Landing Page / Web', 'Brand & Identity', 'Social', 'Print'];
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
      : `<div class="card-media type"><span class="mono">${esc((p.categories || [])[0] || 'Project')}${p.external_url ? ' &middot; Behance ↗' : ''}</span><b>${esc(p.title)}</b></div>`;
    const sub = [p.client, p.year].filter(Boolean).join(' · ');
    return `
      <a class="card" href="${esc(projHref(p))}"${ext(p)} data-cursor="View">
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
      : `<div class="lm type"><span class="mono">${esc((e.medium || [])[0] || 'Experiment')}${e.external_url ? ' &middot; Behance ↗' : ''}</span><b>${esc(e.title)}</b></div>`;
    return `<a class="lcard" href="${esc(projHref(e, 'e'))}"${ext(e)} data-cursor="View">${media}<h3>${esc(e.title)}</h3><span class="lt mono">${esc([e.year, (e.medium || []).join(', ')].filter(Boolean).join(' · '))}</span></a>`;
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
      return c.image ? `<a class="lcard" href="${esc(projHref(e, 'e'))}"${ext(e)} data-cursor="View"><div class="lm"><img src="${esc(c.image)}" alt="${esc(e.title)}" loading="lazy"></div><h3>${esc(e.title)}</h3><span class="lt mono">${esc([e.year, (e.medium || []).join(', ')].filter(Boolean).join(' · '))}</span></a>` : '';
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
          <ul data-fade>${(th.items || []).map((r) => `<li><span>${esc(r.name)}</span><span>${esc(r.detail)}</span></li>`).join('')}</ul>
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
  /* Case study (?c=slug) and experiment (?e=slug)                          */
  /* ===================================================================== */
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
      inner = `<div class="vbox"><video src="${esc(url)}" controls playsinline preload="metadata" ${b.poster ? `poster="${esc(b.poster)}"` : ''}></video></div>`;
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
    if (p.external_url) { location.replace(p.external_url); return; }

    document.title = p.title + ' — Vibhor Mathur';
    const dsc = $('meta[name="description"]'); if (dsc && p.summary) dsc.setAttribute('content', p.summary);

    const siblings = list.filter((x) => !x.external_url && (x.sections || []).length);
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
  } else if (page === 'case') {
    casePage();
  }
})();
