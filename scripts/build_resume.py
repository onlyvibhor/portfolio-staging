#!/usr/bin/env python3
"""Build a one-page profile PDF (assets/docs/vibhor-mathur-profile.pdf) from the site's own content.

Reads content/about.json, content/site.json, content/toolkit.json, content/mentorship.json and the projects.
Writes the PDF with a tiny built-in writer (standard Helvetica fonts, no extra packages). Needs Pillow and the
Windows Arial fonts only to measure text widths (Arial and Helvetica share metrics).

Run after changing the content:   python scripts/build_resume.py
"""
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageFont

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "content"
OUT = ROOT / "assets" / "docs" / "vibhor-mathur-profile.pdf"

W, H = 595.28, 841.89
M = 34
INK = (0.039, 0.039, 0.039)
PAPER = (0.953, 0.953, 0.945)
BLUE = (0.176, 0.357, 1.0)
CYAN = (0.0, 0.824, 1.0)
VIOLET = (0.478, 0.302, 1.0)
MINT = (0.071, 0.941, 0.753)
MUTE = (0.36, 0.36, 0.36)

FONTS = {"F1": "arial.ttf", "F2": "arialbd.ttf", "F3": "ariali.ttf"}
_font_cache = {}


def _font(key):
    if key not in _font_cache:
        for base in ("C:/Windows/Fonts/", "/usr/share/fonts/truetype/msttcorefonts/", "/Library/Fonts/"):
            p = Path(base) / FONTS[key]
            if p.exists():
                _font_cache[key] = ImageFont.truetype(str(p), 100)
                break
        else:
            sys.exit("Arial fonts not found; they are only used to measure text.")
    return _font_cache[key]


def tw(text, key, size):
    return _font(key).getlength(text) * size / 100.0


def wrap(text, key, size, width):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if tw(t, key, size) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def enc(text):
    t = (text.replace("\u2014", "-").replace("\u2013", "-").replace("\u2192", "to").replace("\u2019", "'").replace("\u2018", "'")
         .replace("\u201c", '"').replace("\u201d", '"').replace("\u00d7", "x").replace("\u2026", "..."))
    return t.encode("cp1252", "replace")


def esc(b):
    return b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


class Page:
    def __init__(self):
        self.ops = []
        self.links = []
        self.cmds = []

    def rect(self, x, y_top, w, h, color):
        r, g, b = color
        self.cmds.append(("rect", x, y_top, w, h, color))
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {H - y_top - h:.2f} {w:.2f} {h:.2f} re f".encode())

    def text(self, x, y_base, s, key="F1", size=9, color=INK):
        r, g, b = color
        self.cmds.append(("text", x, y_base, s, key, size, color))
        self.ops.append(b"BT /" + key.encode() + f" {size:.2f} Tf {r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {H - y_base:.2f} Td (".encode() + esc(enc(s)) + b") Tj ET")

    def link(self, x, y_base, w, size, url):
        self.links.append((x, H - y_base - size * 0.2, x + w, H - y_base + size * 0.85, url))

    def image(self, x, y_top, w, h):
        self.cmds.append(("image", x, y_top, w, h, None))
        self.ops.append(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {H - y_top - h:.2f} cm /Im1 Do Q".encode())


def build(scale):
    a = json.loads((C / "about.json").read_text(encoding="utf-8"))
    s = json.loads((C / "site.json").read_text(encoding="utf-8"))
    t = json.loads((C / "toolkit.json").read_text(encoding="utf-8"))
    m = json.loads((C / "mentorship.json").read_text(encoding="utf-8"))
    projects = []
    for p in sorted((C / "projects").glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        if d.get("published", True):
            projects.append(d)
    projects.sort(key=lambda d: d.get("order", 99))

    pg = Page()
    body = 8.4 * scale
    lead = body * 1.38

    # header band
    pg.rect(0, 0, W, 128, INK)
    pg.text(M, 58, "Vibhor Mathur", "F2", 34, (1, 1, 1))
    pg.text(M, 80, "Communication Design Senior Manager, Razorpay", "F2", 11.5, MINT)
    pg.text(M, 97, "Bengaluru, India  |  Brand films, launch campaigns and AI production systems", "F1", 8.4, (0.82, 0.82, 0.82))
    x = M
    parts = [("onlyvibhor@gmail.com", "mailto:" + s["contact"]["email"]), ("linkedin.com/in/onlyvibhor", "https://www.linkedin.com/in/onlyvibhor/"),
             ("behance.net/onlyvibhor", "https://www.behance.net/onlyvibhor"), ("adplist.org/mentors/vibhor-mathur", "https://adplist.org/mentors/vibhor-mathur")]
    for i, (label, url) in enumerate(parts):
        pg.text(x, 114, label, "F1", 8.4, (1, 1, 1))
        pg.link(x, 114, tw(label, "F1", 8.4), 8.4, url)
        x += tw(label, "F1", 8.4)
        if i < len(parts) - 1:
            pg.text(x + 5, 114, "|", "F1", 8.4, MINT)
            x += 14
    # colour stripe
    for i, col in enumerate((BLUE, VIOLET, CYAN, MINT)):
        pg.rect(W / 4 * i, 128, W / 4 + 0.5, 5, col)

    colL, wL = M, 336
    colR, wR = M + 336 + 24, W - 2 * M - 336 - 24

    def heading(x, y, label, w):
        pg.text(x, y, label.upper(), "F2", 7.4, BLUE)
        pg.rect(x, y + 3.5, w, 0.6, INK)
        return y + 17

    def para(x, y, text, w, key="F1", size=None, color=INK, leading=None):
        size = size or body
        leading = leading or lead
        for ln in wrap(text, key, size, w):
            pg.text(x, y, ln, key, size, color)
            y += leading
        return y

    # ---- left column
    y = 158
    y = heading(colL, y, "Profile", wL)
    prof = ("Self-taught designer from Jaipur with a B.Tech in computer engineering. Leads Communication Design at Razorpay across Payments, "
            "RazorpayX and POS: brand films, launch campaigns, landing pages and product imagery, held together by one visual system. "
            "Builds the AI production tools the design team uses on live campaigns. Previously Associate Director, Marketing Design at Grofers (now Blinkit).")
    y = para(colL, y, prof, wL) + 6

    y = heading(colL, y, "Experience", wL)
    for it in a["timeline"]["items"][:2]:
        pg.text(colL, y, it["org"], "F2", body + 0.8)
        yrs = it["years"].replace("\u2014", "-")
        pg.text(colL + wL - tw(yrs, "F1", body - 0.6), y, yrs, "F1", body - 0.6, MUTE)
        y += lead
        y = para(colL, y, it["role"].replace(" \u00b7 ", ", "), wL, "F3", body, MUTE)
        note = re.sub(r"\s+", " ", it["note"])
        y = para(colL, y, note, wL) + 5
    y += 1

    y = heading(colL, y, "Selected work", wL)
    pick = ["trial", "t20", "btb", "ring", "magic-checkout", "agentic-commerce-engine", "moneysaver-export-account", "passport-for-your-products"]
    by = {p["slug"]: p for p in projects}
    for slug in pick:
        p = by.get(slug)
        if not p:
            continue
        head = p["title"].replace("\n", " ")
        meta = " | ".join(x for x in (p.get("client", ""), p.get("year", "")) if x)
        pg.text(colL, y, head, "F2", body + 0.4)
        y += lead
        y = para(colL, y, meta, wL, "F1", body - 0.9, MUTE, lead - 1) if False else y
        y = para(colL, y, (p.get("summary") or p.get("tagline") or ""), wL, "F1", body - 0.4, INK, lead - 0.6) + 3.5
    left_end = y

    # ---- right column
    y = 158
    y = heading(colR, y, "Results", wR)
    for r in s["results"]["items"]:
        pg.text(colR, y + 8, r["value"], "F2", 16 * scale, BLUE)
        vw = tw(r["value"], "F2", 16 * scale)
        lab = wrap(r["label"], "F1", body - 1, wR - vw - 8)
        yy = y + 2
        for ln in lab[:2]:
            pg.text(colR + vw + 8, yy + 3, ln, "F1", body - 1)
            yy += lead - 2
        y += 25 * scale
    y += 3

    y = heading(colR, y, "Recognition", wR)
    for it in a["recognition"]["items"]:
        nm = f"{it['name']} {it.get('year', '')}".strip()
        pg.text(colR, y, nm, "F2", body)
        y += lead - 1
        y = para(colR, y, it["detail"], wR, "F1", body - 0.8, MUTE, lead - 1.6) + 3

    y += 2
    y = heading(colR, y, "AI toolkit, built in-house", wR)
    for tool in t["tools"]:
        y = para(colR, y, "- " + tool["name"], wR, "F1", body - 0.4, INK, lead - 1)
    y += 2
    stack = ", ".join(t["stack"]["items"][:13])
    y = para(colR, y, "Stack: " + stack + ".", wR, "F1", body - 1.2, MUTE, lead - 2) + 4

    y = heading(colR, y, "Mentoring and teaching", wR)
    nums = {n["label"]: n["value"] for n in m["numbers"]}
    y = para(colR, y, "33 one-to-one sessions on ADPList (31 hours). Workshops and talks: Samanvaya (Rotaract 3191), GrowthSchool, "
                      "IIIT-Delhi E-Summit, Designland, xtended Pack Collective, Design Tank.", wR, "F1", body - 0.6, INK, lead - 1.2) + 4

    y = heading(colR, y, "Education", wR)
    y = para(colR, y, "B.Tech, Computer Engineering. Government Engineering College Bikaner, 2010-2014.", wR, "F1", body - 0.6, INK, lead - 1.2)
    y = para(colR, y, "Languages: English, Hindi.", wR, "F1", body - 0.6, INK, lead - 1.2)
    right_end = y

    # avatar
    av = Image.open(ROOT / "assets/img/avatar/avatar.webp").convert("RGBA")
    bg = Image.new("RGB", av.size, (10, 10, 10))
    bg.paste(av, (0, 0), av)
    bg.thumbnail((420, 520))
    buf = io.BytesIO()
    bg.save(buf, "JPEG", quality=88)
    ah = 112
    aw = ah * bg.width / bg.height
    pg.image(W - M - aw, 8, aw, ah)

    # footer
    pg.rect(0, H - 22, W, 22, INK)
    pg.text(M, H - 8, "Awards: Shorty Awards 2026 (Winner, Generative AI)  |  Kyoorius 2026  |  ET Brand Disruption Awards 2026 (Gold, Silver)", "F1", 7.4, MINT)
    return pg, buf.getvalue(), bg.size, max(left_end, right_end)


def write_pdf(pg, jpeg, jsize):
    objs = []

    def add(b):
        objs.append(b)
        return len(objs)

    cat = add(b"")
    pages = add(b"")
    page = add(b"")
    f1 = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    f2 = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    f3 = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>")
    img = add(f"<< /Type /XObject /Subtype /Image /Width {jsize[0]} /Height {jsize[1]} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg)} >>\nstream\n".encode() + jpeg + b"\nendstream")
    content = b"\n".join(pg.ops)
    cont = add(f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream")
    annots = []
    for (x1, y1, x2, y2, url) in pg.links:
        annots.append(add(f"<< /Type /Annot /Subtype /Link /Rect [{x1:.2f} {y1:.2f} {x2:.2f} {y2:.2f}] /Border [0 0 0] /A << /S /URI /URI ({url}) >> >>".encode()))
    objs[cat - 1] = f"<< /Type /Catalog /Pages {pages} 0 R >>".encode()
    objs[pages - 1] = f"<< /Type /Pages /Kids [{page} 0 R] /Count 1 >>".encode()
    ann = (" /Annots [" + " ".join(f"{a} 0 R" for a in annots) + "]") if annots else ""
    objs[page - 1] = (f"<< /Type /Page /Parent {pages} 0 R /MediaBox [0 0 {W:.2f} {H:.2f}] /Contents {cont} 0 R "
                      f"/Resources << /Font << /F1 {f1} 0 R /F2 {f2} 0 R /F3 {f3} 0 R >> /XObject << /Im1 {img} 0 R >> >>{ann} >>").encode()
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + o + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for o in offs:
        out.write(f"{o:010d} 00000 n \n".encode())
    info = b""
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root {cat} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


def preview(pg, jpeg, path, k=2.0):
    from PIL import ImageDraw
    img = Image.new("RGB", (int(W * k), int(H * k)), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for c in pg.cmds:
        if c[0] == "rect":
            _, x, y, w, h, col = c
            d.rectangle([x * k, y * k, (x + w) * k, (y + h) * k], fill=tuple(int(v * 255) for v in col))
        elif c[0] == "text":
            _, x, y, t, key, size, col = c
            f = ImageFont.truetype(_font(key).path, max(1, int(size * k)))
            d.text((x * k, y * k), t, font=f, fill=tuple(int(v * 255) for v in col), anchor="ls")
        else:
            _, x, y, w, h, _c = c
            im = Image.open(io.BytesIO(jpeg)).resize((int(w * k), int(h * k)))
            img.paste(im, (int(x * k), int(y * k)))
    img.save(path)


def main():
    limit = H - 34
    scale = 1.14
    for _ in range(14):
        pg, jpeg, jsize, end = build(scale)
        if end <= limit:
            break
        scale -= 0.02
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(write_pdf(pg, jpeg, jsize))
    if "--preview" in sys.argv:
        preview(pg, jpeg, sys.argv[sys.argv.index("--preview") + 1])
    print(f"Wrote {OUT.relative_to(ROOT)} at scale {scale:.2f}, content ends at y={end:.0f} of {limit:.0f}")


if __name__ == "__main__":
    main()
