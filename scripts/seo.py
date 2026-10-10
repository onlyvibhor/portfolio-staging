#!/usr/bin/env python3
"""SEO / AEO build step, called by build_content.py.

From the CMS content it generates, with no manual steps:
  - the <head> block of every page: title, description, canonical, robots, Open Graph, Twitter, geo, JSON-LD
  - prerendered, crawlable copy inside <main> (the app replaces it as soon as JavaScript runs), so search
    engines and answer engines that do not run JavaScript still read the whole site
  - one static, indexable page per project and lab entry: projects/<slug>/index.html, lab/<slug>/index.html
  - sitemap.xml (with images), robots.txt, llms.txt and llms-full.txt

The canonical origin comes from content/site.json -> seo.site_url. Set it to the production domain.
"""
import datetime
import html
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
TOP_PAGES = ["index", "work", "lab", "about", "toolkit", "mentorship"]
ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"


# ----------------------------------------------------------------- text helpers
def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def plain(s):
    """Strip the light markdown used in the CMS (*em*, **strong**, [text](url), line breaks)."""
    s = str(s or "")
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    s = re.sub(r"\*+", "", s)
    s = re.sub(r"\s*\n\s*", " ", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def paras(s):
    return [plain(p) for p in re.split(r"\n\s*\n", str(s or "")) if plain(p)]


def clip(s, n):
    s = plain(s)
    if len(s) <= n:
        return s
    cut = s[: n - 1].rsplit(" ", 1)[0].rstrip(",;:- ")
    return cut + "…"


def youtube_id(url):
    m = re.search(r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/))([\w-]{6,})", url or "")
    return m.group(1) if m else None


# ----------------------------------------------------------------- urls
class Ctx:
    def __init__(self, site, about, toolkit, mentorship, projects, experiments):
        self.site, self.about, self.toolkit, self.mentorship = site, about, toolkit, mentorship
        self.projects, self.experiments = projects, experiments
        self.seo = site.get("seo", {})
        self.origin = self.seo.get("site_url", "https://example.com").rstrip("/")
        self.name = self.seo.get("name", "Vibhor Mathur")

    def abs(self, path):
        path = (path or "").lstrip("/")
        return f"{self.origin}/{quote(path, safe='/:?=&#%.-_~')}" if path else self.origin + "/"

    def page_url(self, key):
        return self.origin + "/" if key == "index" else f"{self.origin}/{key}.html"

    def entry_path(self, e, kind):
        return f"{'lab' if kind == 'e' else 'projects'}/{e['slug']}/"

    @property
    def person_id(self):
        return self.origin + "/#person"

    @property
    def og_image(self):
        return self.abs(self.seo.get("og_image", "assets/img/og/og-default.jpg"))


# ----------------------------------------------------------------- per-entry titles / descriptions
def enrich(site, projects, experiments):
    """Adds seo_title, seo_description and url to every project and lab entry (used by the app and the build)."""
    name = (site.get("seo") or {}).get("name", "Vibhor Mathur")
    for p in projects:
        cats = [c.strip() for c in re.split(r"\s*[·|]\s*", p.get("category") or "") if c.strip()]
        cat = ", ".join(cats) or "Case study"
        title = f"{p['title']} — {cat} | {name}"
        while len(title) > 68 and len(cats) > 1:
            cats.pop()
            title = f"{p['title']} — {', '.join(cats)} | {name}"
        who = (p.get("role") or "Creative direction").replace("·", "and")
        bits = [f"{who} by {name}"]
        if p.get("client"):
            bits.append("for " + re.sub(r"\s*·\s*", " / ", p["client"]))
        if p.get("year"):
            bits.append(f"({p['year']})")
        tail = " ".join(bits) + "."
        desc = plain(p.get("summary") or p.get("tagline") or "")
        p["seo_title"] = title
        short = f"{who} by {name}."
        p["seo_description"] = next((d for d in (f"{desc} {tail}", f"{desc} {short}", desc) if len(d) <= 160), clip(desc, 158))
        p["url"] = f"projects/{p['slug']}/"
    for e in experiments:
        title = f"{e['title']} — Lab experiment | {name}"
        year = f" ({e['year']})" if e.get("year") else ""
        e["seo_title"] = title
        d0 = plain(e.get("summary") or e.get("tagline") or "")
        e["seo_description"] = next((d for d in (f"{d0} A Lab project by {name}{year}.", f"{d0} A Lab project by {name}.", d0) if len(d) <= 160), clip(d0, 158))
        e["url"] = f"lab/{e['slug']}/"


# ----------------------------------------------------------------- JSON-LD
def ld_script(obj):
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'<script type="application/ld+json">{data}</script>'


def award_strings(ctx):
    out = []
    for r in (ctx.about.get("recognition") or {}).get("items", []):
        out.append(f"{r['name']} {r.get('year', '')}: {plain(r.get('detail'))} ({r.get('work', '')})".replace(" ()", "").strip())
    return out


def same_as(ctx):
    return [l["url"] for l in (ctx.site.get("contact") or {}).get("links", []) if l.get("url", "").startswith("http")]


def person_ld(ctx):
    seo = ctx.seo
    return {
        "@type": "Person",
        "@id": ctx.person_id,
        "name": ctx.name,
        "url": ctx.origin + "/",
        "image": ctx.abs("assets/img/avatar/avatar.webp"),
        "jobTitle": seo.get("job_title"),
        "description": plain(seo.get("summary")),
        "email": (ctx.site.get("contact") or {}).get("email"),
        "worksFor": {"@type": "Organization", "name": "Razorpay", "url": "https://razorpay.com"},
        "alumniOf": [
            {"@type": "CollegeOrUniversity", "name": "Government Engineering College Bikaner"},
            {"@type": "Organization", "name": "Grofers (now Blinkit)"},
        ],
        "homeLocation": {"@type": "Place", "address": {"@type": "PostalAddress", "addressLocality": seo.get("city"), "addressRegion": seo.get("region"), "addressCountry": seo.get("country")}},
        "knowsAbout": seo.get("knows_about", []),
        "knowsLanguage": ["English", "Hindi"],
        "sameAs": same_as(ctx),
        "award": award_strings(ctx),
        "makesOffer": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": s["name"], "description": s["desc"], "provider": {"@id": ctx.person_id}}}
            for s in seo.get("services", [])
        ],
    }


def website_ld(ctx):
    return {"@type": "WebSite", "@id": ctx.origin + "/#website", "url": ctx.origin + "/", "name": ctx.name,
            "description": plain(ctx.seo.get("summary")), "inLanguage": "en-IN", "publisher": {"@id": ctx.person_id}}


def crumbs(ctx, trail):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(trail)]}


def itemlist(ctx, items, kind):
    return {"@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "url": ctx.abs(ctx.entry_path(e, kind)), "name": e["title"]} for i, e in enumerate(items)]}


def faq_ld(ctx):
    items = (ctx.about.get("faq") or {}).get("items", [])
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in items]}


def case_ld(ctx, p, kind):
    url = ctx.abs(ctx.entry_path(p, kind))
    cover = (p.get("cover") or {}).get("image")
    obj = {"@type": "CreativeWork", "@id": url + "#work", "url": url, "name": p["title"], "headline": plain(p.get("tagline") or p["title"]),
           "description": p["seo_description"], "inLanguage": "en-IN", "creator": {"@id": ctx.person_id},
           "isPartOf": {"@id": ctx.origin + "/#website"}, "mainEntityOfPage": url}
    if cover:
        obj["image"] = ctx.abs(cover)
    if p.get("year") and re.match(r"^\d{4}$", str(p["year"])):
        obj["dateCreated"] = str(p["year"])
    if p.get("client"):
        obj["sourceOrganization"] = {"@type": "Organization", "name": re.split(r"\s*·\s*", p["client"])[0]}
    kw = (p.get("categories") or []) + [c for c in re.split(r"\s*·\s*", p.get("category") or "") if c]
    if kw:
        obj["keywords"] = ", ".join(dict.fromkeys(kw))
    if p.get("role"):
        obj["genre"] = p["role"]
    awards = [a if isinstance(a, str) else a.get("name") or a.get("title") or "" for a in (p.get("awards") or [])]
    awards = [plain(a) for a in awards if a]
    if awards:
        obj["award"] = awards
    team = [t.get("name") for t in (p.get("team") or []) if t.get("name")]
    if team:
        obj["contributor"] = [{"@type": "Person", "name": n} for n in team]
    return obj


# ----------------------------------------------------------------- page specs
def page_specs(ctx):
    """One spec per top-level page: title, description, h1, ld, og type."""
    S, seo = ctx.site, ctx.seo
    A, T, M = ctx.about, ctx.toolkit, ctx.mentorship
    home = ctx.origin + "/"
    pages = seo.get("pages", {})
    graph_home = [website_ld(ctx), person_ld(ctx),
                  {"@type": "ProfilePage", "@id": home + "#webpage", "url": home, "name": S["meta"]["title"], "description": S["meta"]["description"],
                   "inLanguage": "en-IN", "isPartOf": {"@id": ctx.origin + "/#website"}, "mainEntity": {"@id": ctx.person_id},
                   "primaryImageOfPage": {"@type": "ImageObject", "url": ctx.og_image}}]
    specs = {
        "index": dict(title=S["meta"]["title"], desc=S["meta"]["description"], h1=seo.get("home_h1"), ld=graph_home),
        "work": dict(title=pages["work"]["title"], desc=pages["work"]["description"], h1=pages["work"]["h1"],
                     ld=[{"@type": "CollectionPage", "name": pages["work"]["title"], "url": ctx.page_url("work"), "description": pages["work"]["description"],
                          "isPartOf": {"@id": ctx.origin + "/#website"}, "about": {"@id": ctx.person_id}, "mainEntity": itemlist(ctx, ctx.projects, "c")},
                         crumbs(ctx, [("Home", home), ("Work", ctx.page_url("work"))])]),
        "lab": dict(title=pages["lab"]["title"], desc=pages["lab"]["description"], h1=pages["lab"]["h1"],
                    ld=[{"@type": "CollectionPage", "name": pages["lab"]["title"], "url": ctx.page_url("lab"), "description": pages["lab"]["description"],
                         "isPartOf": {"@id": ctx.origin + "/#website"}, "about": {"@id": ctx.person_id}, "mainEntity": itemlist(ctx, ctx.experiments, "e")},
                        crumbs(ctx, [("Home", home), ("Lab", ctx.page_url("lab"))])]),
        "about": dict(title=A["meta"]["title"], desc=A["meta"]["description"], h1=plain(A.get("headline")),
                      ld=[{"@type": "AboutPage", "name": A["meta"]["title"], "url": ctx.page_url("about"), "description": A["meta"]["description"],
                           "isPartOf": {"@id": ctx.origin + "/#website"}, "mainEntity": {"@id": ctx.person_id}},
                          faq_ld(ctx), crumbs(ctx, [("Home", home), ("About", ctx.page_url("about"))])]),
        "toolkit": dict(title=T["meta"]["title"], desc=T["meta"]["description"], h1=plain(T.get("headline")),
                        ld=[{"@type": "WebPage", "name": T["meta"]["title"], "url": ctx.page_url("toolkit"), "description": T["meta"]["description"],
                             "isPartOf": {"@id": ctx.origin + "/#website"}, "about": {"@id": ctx.person_id}},
                            crumbs(ctx, [("Home", home), ("AI Toolkit", ctx.page_url("toolkit"))])]),
        "mentorship": dict(title=M["meta"]["title"], desc=M["meta"]["description"], h1=plain(M.get("headline")),
                           ld=[{"@type": "WebPage", "name": M["meta"]["title"], "url": ctx.page_url("mentorship"), "description": M["meta"]["description"],
                                "isPartOf": {"@id": ctx.origin + "/#website"}, "about": {"@id": ctx.person_id}},
                               {"@type": "Service", "name": "One-to-one design mentoring", "serviceType": "Design mentoring",
                                "provider": {"@id": ctx.person_id}, "areaServed": "Worldwide", "url": (M.get("oneonone") or {}).get("cta", {}).get("href"),
                                "description": plain((M.get("oneonone") or {}).get("body"))},
                               crumbs(ctx, [("Home", home), ("Mentorship", ctx.page_url("mentorship"))])]),
    }
    return specs


# ----------------------------------------------------------------- <head> block
def head_block(ctx, title, desc, url, image, ld, robots=ROBOTS, og_type="website", base=None, canonical=True, image_alt=None):
    seo = ctx.seo
    img_default = image == ctx.og_image
    L = []
    if base:
        L.append(f'<base href="{esc(base)}">')
    L.append(f"<title>{esc(title)}</title>")
    L.append(f'<meta name="description" content="{esc(desc)}">')
    if canonical:
        L.append(f'<link rel="canonical" href="{esc(url)}">')
    L.append(f'<meta name="robots" content="{robots}">')
    L.append(f'<meta name="author" content="{esc(ctx.name)}">')
    L.append(f'<meta name="keywords" content="{esc(", ".join(seo.get("keywords", [])))}">')
    L.append(f'<meta name="geo.region" content="{esc(seo.get("country", "IN"))}-KA"><meta name="geo.placename" content="{esc(seo.get("city", ""))}">')
    L.append(f'<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="{esc(ctx.name)}"><meta property="og:locale" content="{esc(seo.get("locale", "en_IN"))}">')
    L.append(f'<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">')
    if canonical:
        L.append(f'<meta property="og:url" content="{esc(url)}">')
    L.append(f'<meta property="og:image" content="{esc(image)}">')
    if img_default:
        L.append('<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">')
    L.append(f'<meta property="og:image:alt" content="{esc(image_alt or title)}">')
    L.append(f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(desc)}"><meta name="twitter:image" content="{esc(image)}">')
    L.append('<link rel="sitemap" type="application/xml" href="sitemap.xml">')
    L.append('<script>document.documentElement.classList.add("js")</script>')
    if ld:
        L.append(ld_script({"@context": "https://schema.org", "@graph": ld}))
    return "\n".join(L)


# ----------------------------------------------------------------- prerendered body copy
def a(href, text):
    return f'<a href="{esc(href)}">{esc(text)}</a>'


def img(src, alt):
    return f'<img src="{esc(src)}" alt="{esc(alt)}" loading="lazy">' if src else ""


def nav_html(ctx):
    items = [("Home", ""), ("Work", "work.html"), ("Lab", "lab.html"), ("AI Toolkit", "toolkit.html"), ("Mentorship", "mentorship.html"), ("About", "about.html")]
    return "<nav><ul>" + "".join(f"<li>{a(u or './', n)}</li>" for n, u in items) + "</ul></nav>"


def faq_html(ctx):
    items = (ctx.about.get("faq") or {}).get("items", [])
    return "<h2>Frequently asked questions</h2>" + "".join(f"<h3>{esc(f['q'])}</h3><p>{esc(f['a'])}</p>" for f in items)


def awards_html(ctx):
    rows = (ctx.about.get("recognition") or {}).get("items", [])
    return "<h2>Awards and recognition</h2><ul>" + "".join(
        f"<li><strong>{esc(r['name'])} {esc(r.get('year', ''))}</strong>: {esc(plain(r.get('detail')))} <em>{esc(r.get('work', ''))}</em></li>" for r in rows) + "</ul>"


def list_html(ctx, items, kind):
    out = "<ul>"
    for e in items:
        meta = " · ".join(x for x in [e.get("client"), str(e.get("year") or ""), e.get("category")] if x)
        out += f"<li>{a(ctx.entry_path(e, kind), e['title'])}{': ' + esc(plain(e.get('summary'))) if e.get('summary') else ''}{' (' + esc(meta) + ')' if meta else ''}</li>"
    return out + "</ul>"


def prerender(ctx, key, spec):
    S, A, T, M, seo = ctx.site, ctx.about, ctx.toolkit, ctx.mentorship, ctx.seo
    h = f"<h1>{esc(spec['h1'])}</h1>"
    if key == "index":
        h += f"<p>{esc(plain(seo.get('summary')))}</p>"
        h += f"<p>{esc(plain((S.get('statement') or {}).get('text')))} {esc(plain((S.get('statement') or {}).get('left')))} {esc(plain((S.get('statement') or {}).get('right')))}</p>"
        h += "<h2>What I do</h2><ul>" + "".join(f"<li><strong>{esc(s['name'])}.</strong> {esc(s['desc'])}</li>" for s in seo.get("services", [])) + "</ul>"
        feat = [p for p in ctx.projects if p.get("featured")] or ctx.projects
        h += "<h2>Selected work</h2>" + list_html(ctx, feat, "c")
        rs = S.get("results") or {}
        if rs.get("items"):
            h += f"<h2>{esc(rs.get('title', 'Results'))}</h2><ul>" + "".join(
                f"<li><strong>{esc(r['value'])}</strong> {esc(r['label'])}: {a('projects/' + r['slug'] + '/', r['project'])}</li>" for r in rs["items"]) + "</ul>"
        h += awards_html(ctx)
        tl = S.get("tools") or {}
        if tl.get("items"):
            h += f"<h2>{esc(plain(tl.get('title')))}</h2><p>{esc(plain(tl.get('sub')))}</p><ul>" + "".join(
                f"<li><strong>{esc(t['name'])}</strong>: {esc(t['desc'])}</li>" for t in tl["items"]) + "</ul>"
        h += "<h2>Explore</h2>" + nav_html(ctx)
        h += f"<h2>Contact</h2><p>{esc(plain((S.get('contact') or {}).get('headline')))} " + a("mailto:" + S["contact"]["email"], S["contact"]["email"]) + "</p>"
        h += "<ul>" + "".join(f"<li>{a(l['url'], l['label'])}</li>" for l in S["contact"].get("links", [])) + "</ul>"
    elif key == "work":
        h += f"<p>{esc(ctx.seo['pages']['work']['intro'])}</p>" + list_html(ctx, ctx.projects, "c") + nav_html(ctx)
    elif key == "lab":
        h += f"<p>{esc(ctx.seo['pages']['lab']['intro'])}</p>" + list_html(ctx, ctx.experiments, "e") + nav_html(ctx)
    elif key == "about":
        h += "".join(f"<p>{esc(plain(t))}</p>" for t in A.get("intro", []))
        h += "<h2>Facts</h2><dl>" + "".join(f"<dt>{esc(f['label'])}</dt><dd>{esc(f['value'])}</dd>" for f in A.get("facts", [])) + "</dl>"
        h += "<h2>Career</h2><ul>" + "".join(
            f"<li><strong>{esc(r['org'])}</strong>, {esc(r['role'])} ({esc(r['years'])}). {esc(plain(r['note']))}</li>" for r in (A.get("timeline") or {}).get("items", [])) + "</ul>"
        h += awards_html(ctx) + faq_html(ctx)
        ld = A.get("leadership") or {}
        h += f"<h2>{esc(ld.get('title', ''))}</h2><ul>" + "".join(f"<li><strong>{esc(i['title'])}.</strong> {esc(i['body'])}</li>" for i in ld.get("items", [])) + "</ul>"
        h += nav_html(ctx)
    elif key == "toolkit":
        h += f"<p>{esc(plain(T.get('intro')))}</p>"
        h += "<h2>Principles</h2><ul>" + "".join(f"<li><strong>{esc(p['title'])}.</strong> {esc(p['body'])}</li>" for p in T.get("principles", [])) + "</ul>"
        for p in T.get("pillars", []):
            h += f"<h2>{esc(p['title'])}</h2><p>{esc(p['body'])}</p><ul>" + "".join(f"<li><strong>{esc(x['label'])}</strong>: {esc(x['detail'])}</li>" for x in p.get("proof", [])) + "</ul>"
        h += f"<h2>{esc((T.get('tools_head') or {}).get('title', 'Tools'))}</h2>"
        for t in T.get("tools", []):
            h += f"<h3>{esc(t['name'])}: {esc(t.get('tag', ''))}</h3><p>{esc(t['body'])}</p><ul>" + "".join(f"<li>{esc(b)}</li>" for b in t.get("bullets", [])) + "</ul>"
            h += img(t.get("hero"), f"{t['name']} interface")
        h += nav_html(ctx)
    elif key == "mentorship":
        h += f"<p>{esc(plain(M.get('intro')))}</p>"
        h += "<ul>" + "".join(f"<li><strong>{esc(n['value'])}</strong> {esc(n['label'])}</li>" for n in M.get("numbers", [])) + "</ul>"
        o = M.get("oneonone") or {}
        h += f"<h2>{esc(o.get('title', 'One to one'))}</h2><p>{esc(plain(o.get('body')))}</p><p>Topics: {esc(', '.join(o.get('topics', [])))}.</p>"
        if o.get("cta"):
            h += f"<p>{a(o['cta']['href'], o['cta']['label'])}</p>"
        ev = M.get("events") or {}
        h += f"<h2>{esc(ev.get('title', 'Talks and workshops'))}</h2><ul>" + "".join(
            f"<li><strong>{esc(e['title'])}</strong>, {esc(e['host'])} ({esc(e['type'])}{', ' + esc(e['date']) if e.get('date') else ''}). {esc(plain(e.get('detail')))}</li>" for e in ev.get("items", [])) + "</ul>"
        h += nav_html(ctx)
    return h


def block_html(b):
    t = b.get("type")
    if t == "text":
        return (f"<h2>{esc(plain(b.get('title') or b.get('label')))}</h2>" if (b.get("title") or b.get("label")) else "") + "".join(f"<p>{esc(p)}</p>" for p in paras(b.get("body")))
    if t == "statement":
        return f"<p>{esc(plain(b.get('text')))}</p>"
    if t == "image":
        return f"<figure>{img(b.get('image'), b.get('alt') or b.get('caption') or '')}{('<figcaption>' + esc(plain(b['caption'])) + '</figcaption>') if b.get('caption') else ''}</figure>"
    if t == "image_grid":
        return "".join(f"<figure>{img(i.get('image'), i.get('caption') or '')}</figure>" for i in b.get("images", []))
    if t == "video":
        cap = plain(b.get("caption") or "Video")
        link = f"<p><a href=\"{esc(b['url'])}\">{esc(cap)}</a></p>" if b.get("url", "").startswith("http") else f"<p>{esc(cap)}</p>"
        return link + img(b.get("poster"), cap)
    if t == "video_grid":
        return "<ul>" + "".join(f"<li>{a(v['url'], plain(v.get('caption') or 'Video')) if v.get('url', '').startswith('http') else esc(plain(v.get('caption') or 'Video'))}</li>" for v in b.get("videos", [])) + "</ul>"
    if t == "compare":
        return f"<figure>{img(b.get('before'), b.get('before_label') or 'Before')}{img(b.get('after'), b.get('after_label') or 'After')}</figure>"
    if t == "steps":
        return (f"<h2>{esc(plain(b.get('title') or b.get('label')))}</h2>" if (b.get("title") or b.get("label")) else "") + "<ol>" + "".join(
            f"<li><strong>{esc(s['title'])}.</strong> {esc(s['body'])}</li>" for s in b.get("items", [])) + "</ol>"
    if t == "tools":
        names = [x if isinstance(x, str) else x.get("tool") or x.get("name") for x in b.get("items", [])]
        return f"<p>{esc(b.get('label', 'Stack'))}: {esc(', '.join(n for n in names if n))}.</p>"
    if t == "metrics":
        return "<ul>" + "".join(f"<li><strong>{esc(m['value'])}</strong> {esc(m['label'])}</li>" for m in b.get("items", [])) + "</ul>"
    if t == "quote":
        return f"<blockquote>{esc(plain(b.get('text')))}</blockquote>" + (f"<p>{esc(b['who'])}</p>" if b.get("who") else "")
    return ""


def prerender_case(ctx, p, kind):
    title = p["title"].replace("\n", " ")
    h = f"<h1>{esc(title)}</h1>"
    if p.get("tagline"):
        h += f"<p><strong>{esc(plain(p['tagline']))}</strong></p>"
    if p.get("summary"):
        h += f"<p>{esc(plain(p['summary']))}</p>"
    facts = [("Client", p.get("client")), ("Year", p.get("year")), ("Role", p.get("role")), ("Category", p.get("category")), ("Tools", ", ".join(p.get("tools", [])) if isinstance(p.get("tools"), list) else p.get("tools"))]
    facts = [(k, v) for k, v in facts if v]
    if facts:
        h += "<dl>" + "".join(f"<dt>{esc(k)}</dt><dd>{esc(plain(v))}</dd>" for k, v in facts) + "</dl>"
    cover = (p.get("cover") or {}).get("image")
    h += img(cover, f"{title} cover")
    if p.get("metrics"):
        h += block_html({"type": "metrics", "items": p["metrics"]})
    for b in p.get("sections", []):
        h += block_html(b)
    if p.get("team"):
        h += "<h2>Team</h2><ul>" + "".join(f"<li>{esc(t['name'])}{(', ' + esc(t['role'])) if t.get('role') else ''}</li>" for t in p["team"]) + "</ul>"
    if p.get("awards"):
        aw = [x if isinstance(x, str) else x.get("name") or x.get("title") or "" for x in p["awards"]]
        h += "<h2>Awards</h2><ul>" + "".join(f"<li>{esc(plain(x))}</li>" for x in aw if x) + "</ul>"
    h += f"<p>By {a('about.html', ctx.name)}, {esc(ctx.seo.get('job_title', ''))}. " + a("work.html" if kind == "c" else "lab.html", "Back to all " + ("work" if kind == "c" else "lab projects")) + "</p>"
    return h + nav_html(ctx)


# ----------------------------------------------------------------- html patching
def patch(text, head, main, body_attrs=None, lang="en-IN"):
    text = re.sub(r"<!--seo:start-->.*?<!--seo:end-->\s*", "", text, flags=re.S)
    text = re.sub(r"<title>.*?</title>\s*", "", text, count=1, flags=re.S)
    text = re.sub(r'<meta name="description"[^>]*>\s*', "", text, count=1)
    text = re.sub(r'(<meta name="viewport"[^>]*>)\s*', lambda m: m.group(1) + "\n<!--seo:start-->\n" + head + "\n<!--seo:end-->\n", text, count=1)
    text = re.sub(r'<html lang="[^"]*"', f'<html lang="{lang}"', text, count=1)
    text = re.sub(r'<main id="app">.*?</main>', lambda m: '<main id="app"><!--prerender:start--><div class="prerender">' + main + '</div><!--prerender:end--></main>', text, count=1, flags=re.S)
    if body_attrs:
        text = re.sub(r"<body[^>]*>", f"<body {body_attrs}>", text, count=1)
    return text


# ----------------------------------------------------------------- files
def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def sitemap(ctx):
    today = datetime.date.today().isoformat()
    rows = []

    def url(loc, images=()):
        r = f"<url><loc>{esc(loc)}</loc><lastmod>{today}</lastmod>"
        for im, cap in list(dict.fromkeys(images))[:40]:
            r += f"<image:image><image:loc>{esc(ctx.abs(im))}</image:loc>" + (f"<image:caption>{esc(clip(cap, 200))}</image:caption>" if cap else "") + "</image:image>"
        rows.append(r + "</url>")

    for k in TOP_PAGES:
        url(ctx.page_url(k))
    for kind, items in (("c", ctx.projects), ("e", ctx.experiments)):
        for e in items:
            imgs = []
            if (e.get("cover") or {}).get("image"):
                imgs.append((e["cover"]["image"], e["title"]))
            for b in e.get("sections", []):
                if b.get("type") == "image" and b.get("image"):
                    imgs.append((b["image"], b.get("alt") or b.get("caption") or e["title"]))
                for i in b.get("images", []) if b.get("type") == "image_grid" else []:
                    imgs.append((i["image"], i.get("caption") or e["title"]))
            url(ctx.abs(ctx.entry_path(e, kind)), imgs)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + "\n".join(rows) + "\n</urlset>\n")


def robots(ctx):
    return f"User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: {ctx.origin}/sitemap.xml\n"


def llms(ctx, full=False):
    seo, S, A = ctx.seo, ctx.site, ctx.about
    L = [f"# {ctx.name}", "", f"> {plain(seo.get('summary'))}", "", "## Key facts", ""]
    for f in A.get("facts", []):
        L.append(f"- {f['label']}: {f['value']}")
    L.append(f"- Email: {S['contact']['email']}")
    for l in S["contact"].get("links", []):
        L.append(f"- {l['label']}: {l['url']}")
    L += ["", "## What to hire for", ""] + [f"- {s['name']}: {s['desc']}" for s in seo.get("services", [])]
    L += ["", "## Awards", ""] + [f"- {x}" for x in award_strings(ctx)]
    L += ["", "## Pages", ""]
    for k, n, d in [("index", "Home", "Overview"), ("work", "Work", "All projects"), ("lab", "Lab", "Art, stop motion and personal AI work"),
                    ("toolkit", "AI Toolkit", "AI design tools built in-house"), ("mentorship", "Mentorship", "Mentoring, workshops, talks"), ("about", "About", "Career, awards and FAQ")]:
        L.append(f"- [{n}]({ctx.page_url(k)}): {d}")
    L += ["", "## Projects", ""] + [f"- [{p['title'].replace(chr(10), ' ')}]({ctx.abs(ctx.entry_path(p, 'c'))}): {plain(p.get('summary'))}" for p in ctx.projects]
    L += ["", "## Lab", ""] + [f"- [{e['title']}]({ctx.abs(ctx.entry_path(e, 'e'))}): {plain(e.get('summary'))}" for e in ctx.experiments]
    if full:
        L += ["", "## Frequently asked questions", ""]
        for f in (A.get("faq") or {}).get("items", []):
            L += [f"### {f['q']}", f["a"], ""]
        L += ["## Career", ""]
        for r in (A.get("timeline") or {}).get("items", []):
            L.append(f"- {r['years']}: {r['role']}, {r['org']}. {plain(r['note'])}")
        L += ["", "## Case studies", ""]
        for p in ctx.projects:
            L += [f"### {p['title'].replace(chr(10), ' ')}", f"{p.get('client', '')} | {p.get('year', '')} | {p.get('category', '')} | {p.get('role', '')}", plain(p.get("tagline")), plain(p.get("summary"))]
            for b in p.get("sections", []):
                if b.get("type") == "text":
                    L += [plain(b.get("title") or b.get("label")), *paras(b.get("body"))]
                elif b.get("type") == "steps":
                    L += [f"- {s['title']}: {s['body']}" for s in b.get("items", [])]
                elif b.get("type") == "metrics":
                    L += [f"- {m['value']} {m['label']}" for m in b.get("items", [])]
            L.append("")
    return "\n".join(L).strip() + "\n"


# ----------------------------------------------------------------- entry point
def build(site, about, toolkit, mentorship, projects, experiments):
    ctx = Ctx(site, about, toolkit, mentorship, projects, experiments)
    specs = page_specs(ctx)

    # top-level pages
    for key in TOP_PAGES:
        f = ROOT / f"{key}.html"
        spec = specs[key]
        head = head_block(ctx, spec["title"], spec["desc"], ctx.page_url(key), ctx.og_image, spec["ld"], image_alt=f"{ctx.name}, creative director")
        f.write_text(patch(f.read_text(encoding="utf-8"), head, prerender(ctx, key, spec)), encoding="utf-8", newline="\n")

    # case.html: legacy dispatcher (redirects to the static pages in the browser); kept out of the index
    case_tpl = ROOT / "case.html"
    base_text = case_tpl.read_text(encoding="utf-8")
    head = head_block(ctx, f"Case study | {ctx.name}", f"Case studies by {ctx.name}.", ctx.origin + "/", ctx.og_image, [], robots="noindex,follow", canonical=False)
    base_text = patch(base_text, head, "<h1>Case study</h1><p>" + a("work.html", "See all work") + "</p>", 'data-page="case"')
    case_tpl.write_text(base_text, encoding="utf-8", newline="\n")

    # static, indexable page for every project and lab entry
    for kind, items, folder in (("c", projects, "projects"), ("e", experiments, "lab")):
        for e in items:
            path = ctx.entry_path(e, kind)
            url = ctx.abs(path)
            cover = (e.get("cover") or {}).get("image")
            image = ctx.abs(cover) if cover else ctx.og_image
            trail = [("Home", ctx.origin + "/"), ("Work" if kind == "c" else "Lab", ctx.page_url("work" if kind == "c" else "lab")), (e["title"].replace("\n", " "), url)]
            head = head_block(ctx, e["seo_title"], e["seo_description"], url, image, [case_ld(ctx, e, kind), crumbs(ctx, trail)],
                              base="../../", image_alt=f"{e['title'].replace(chr(10), ' ')}, by {ctx.name}")
            attrs = f'data-page="case" data-kind="{"lab" if kind == "e" else "work"}" data-slug="{esc(e["slug"])}"'
            write(ROOT / path / "index.html", patch(base_text, head, prerender_case(ctx, e, kind), attrs))

    # drop static pages of entries that no longer exist
    for folder, items in (("projects", projects), ("lab", experiments)):
        keep = {e["slug"] for e in items}
        d = ROOT / folder
        if d.exists():
            for sub in d.iterdir():
                if sub.is_dir() and sub.name not in keep and (sub / "index.html").exists():
                    (sub / "index.html").unlink()
                    try:
                        sub.rmdir()
                    except OSError:
                        pass

    write(ROOT / "sitemap.xml", sitemap(ctx))
    write(ROOT / "robots.txt", robots(ctx))
    write(ROOT / "llms.txt", llms(ctx))
    write(ROOT / "llms-full.txt", llms(ctx, full=True))
    print(f"SEO: {len(TOP_PAGES)} pages, {len(projects) + len(experiments)} static entry pages, sitemap, robots, llms.txt  (origin {ctx.origin})")
