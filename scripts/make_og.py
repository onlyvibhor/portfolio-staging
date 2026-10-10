#!/usr/bin/env python3
"""Builds the default social-share image (1200x630): assets/img/og/og-default.jpg.

Run once, or again when the avatar or positioning line changes:   python scripts/make_og.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630

# deep ink-to-brand-blue gradient with the 3D avatar on the right
bg = Image.new("RGB", (W, H))
px = bg.load()
for x in range(W):
    for y in range(H):
        k = min(1.0, (x / W) * 0.75 + (y / H) * 0.25)
        px[x, y] = (int(10 + 20 * k), int(12 + 60 * k), int(22 + 190 * k))
av = Image.open(ROOT / "assets/img/avatar/avatar.webp").convert("RGBA")
ah = 590
av = av.resize((round(av.width * ah / av.height), ah), Image.LANCZOS)
bg = bg.convert("RGBA")
bg.alpha_composite(av, (W - av.width - 70, H - ah + 6))
bg = bg.convert("RGB")


def font(size, bold=False):
    for name in ("arialbd.ttf" if bold else "arial.ttf", "Arial Bold.ttf" if bold else "Arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


d = ImageDraw.Draw(bg)
pad = 72
d.text((pad, 78), "PORTFOLIO 2026", font=font(22, True), fill=(160, 200, 255))
d.text((pad, 170), "Vibhor", font=font(132, True), fill=(255, 255, 255))
d.text((pad, 296), "Mathur", font=font(132, True), fill=(255, 255, 255))
d.rectangle((pad, 468, pad + 90, 472), fill=(60, 130, 255))
d.text((pad, 492), "Creative director and design leader", font=font(34, True), fill=(255, 255, 255))
d.text((pad, 538), "Brand films, campaigns and AI-native production", font=font(26), fill=(215, 220, 230))
d.text((pad, 576), "Razorpay  |  ex-Grofers (Blinkit)  |  Bengaluru", font=font(22), fill=(160, 170, 185))

out = ROOT / "assets/img/og/og-default.jpg"
out.parent.mkdir(parents=True, exist_ok=True)
bg.save(out, quality=86, optimize=True, progressive=True)
print("wrote", out.relative_to(ROOT), out.stat().st_size // 1024, "KB")
