# Vibhor Mathur: portfolio

A fast static site (no framework, no bundler) with a browser-based CMS.

```
index.html     home (hero, selected work, AI toolkit, lab strip, about teaser, recognition)
work.html      every project, with category filter + sort
lab.html       art experiments, with medium filter
about.html     about page
toolkit.html   AI toolkit page (in-house tools, interactive web, learning)
mentorship.html  mentoring, workshops, talks and podcasts
case.html      one template for every detail page:
                 case.html?c=<slug>   project case study
                 case.html?e=<slug>   lab experiment
content/
  site.json          home-page copy, hero slides, toolkit, recognition, contact
  about.json         the whole About page
  toolkit.json       the whole AI Toolkit page
  mentorship.json    the whole Mentorship page, plus its home-page teaser
  projects/*.json    one file per project (every project is a full case study page)
  experiments/*.json one file per art experiment
  content.js         GENERATED bundle the site reads (do not edit by hand)
scripts/build_content.py   validates + bundles the content
admin/             the CMS (Decap), opens at /admin/
assets/            css, js, images (img/p = project images, img/lab = lab images, img/tools = toolkit images, vid = looping clips, uploads = CMS uploads)
```

## Run it locally

```
python -m http.server 8743
```

Open <http://localhost:8743>. (Use a server: opening `index.html` as a file blocks the WebGL
textures on the home page, which then falls back to plain images.)

After editing any file in `content/`, rebuild the bundle:

```
python scripts/build_content.py
```

It reports drafts it skipped, warns about any image path that doesn't exist, and stamps `?v=` cache-busters on the
CSS/JS links in every `.html` page so browsers always load the latest files.

## Publish + edit in the browser (one-time setup, ~15 min)

1. **Put the folder on GitHub** (a new repo, e.g. `portfolio`).
2. **Deploy on Netlify**: "Add new site" -> import the repo. `netlify.toml` already has the build command
   (`python3 scripts/build_content.py`). Vercel and Cloudflare Pages work too with the same build command.
3. **Edit `admin/config.yml`**: set `backend.repo` to `your-github-username/portfolio`, and `site_url` / `display_url`.
4. **Let the CMS log in with GitHub** (once): Netlify -> Site configuration -> Access & security -> OAuth ->
   install the GitHub provider (create a GitHub OAuth app and paste its Client ID and Secret).
5. Open `https://your-site/admin/`, log in with GitHub, and edit. **Publishing = a commit**; Netlify rebuilds in about a minute.

Editing on your own machine instead (saves straight to your files): run `npx decap-server` in this folder,
keep a local server running, and open `/admin/`.

## What you can edit in the CMS

| Collection | What it controls |
|---|---|
| **Projects (case studies)** | Every project on the Work page. Categories drive the filter chips. |
| **Lab (art experiments)** | Every entry on the Lab page, each with its own detail page. |
| **Site content > Home page** | Hero, statement, toolkit, lab/about teasers, awards, contact. |
| **Site content > About page** | The entire About page. |
| **Site content > Mentorship page** | Numbers, ADPList section, mentee reviews, every talk/workshop card, photos, closing call to action. |
| **Site content > AI Toolkit page** | Headline, principles, the four pillars, each tool (images, bullets), interactive-web pieces, learning, stack. |

### Projects

- **Categories**: free-text list. Every category you use becomes a filter chip on the Work page automatically.
- **Published** off = draft (hidden). **Featured on home page** puts it in the horizontal gallery (needs a cover image).
- **Order** controls the default sequence on Work and in "Next project".

### Writing a case study or experiment

Fill the header fields, then build the story from **blocks** in any order, as many as you need:

| Block | Use it for |
|---|---|
| **Text** | A small label, a big heading and markdown body (bold, italics, links, lists) |
| **Big statement** | One huge sentence that reveals word by word on scroll |
| **Image** | A single image: `full` (edge to edge), `wide`, or `narrow` (portrait/tall) |
| **Image grid** | 1 to 3 columns of images with captions (great for before/after pairs) |
| **Video** | A YouTube/Vimeo link (click-to-play poster) or an MP4 you upload. Tick *Silent loop* for short autoplay clips |
| **Looping clips** | A grid of short silent MP4 loops with captions (UI micro-animations, motion studies) |
| **Process steps** | Numbered steps with a description and the tools used |
| **Tools / stack** | A row of tool chips |
| **Metrics** | Big numbers that count up on scroll |
| **Quote** | A large pull quote with attribution |

Images on project and lab pages are shown plainly (no hover effects), so what you upload is what visitors see.
Wrap words in `*asterisks*` in headings to get the italic accent.

## Media guidelines

- **Images:** JPG, at most 2400px wide, ideally under 600 KB. Lab covers: square.
- **Cover / hero video:** MP4 (H.264), muted loop, 1280 to 1920px wide, under 8 MB, 6 to 12 seconds.
- **Long videos:** use the Video block with a YouTube or Vimeo link.
- Lowercase file names with hyphens.

## Look and feel

- Palette: black and white, with vivid cool accents (electric blue `#2d5bff`, cyan, violet, mint) defined at the top of
  `assets/css/style.css`.
- Home hero and gallery images tilt in 3D toward the cursor on hover (WebGL, perspective camera, desktop only): the plane lifts, the picture shifts for depth and the far edge falls into shade. Everything else is plain DOM.
- Interactions: hero letters react to the cursor and can be smashed (tap or click), AI-toolkit rows show a cursor-following
  tag and fill with colour, page transitions use a curtain wipe.
- Reduced-motion users get a calm version (no scroll hijacking, no letter physics, instant reveals).

Layouts are fluid from 320px phones to ultrawide monitors; hover-only effects have touch equivalents, and the pinned
horizontal gallery becomes a vertical stack under 900px.
