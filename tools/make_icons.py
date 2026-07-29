#!/usr/bin/env python3
"""Generate the PWA icons in web/icons/.

The icons are drawn rather than hand-authored so they can be regenerated at any
size and stay in step with the palette in web/app.css (oxblood on parchment). The
emblem is a compass rose: the game is a walk with a map, and a rose reads at 48px
where a letterform or an illustration would not.

Usage: python3 tools/make_icons.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OXBLOOD = (122, 46, 34, 255)
PARCHMENT = (250, 245, 232, 255)
PARCHMENT_DIM = (233, 224, 202, 255)

OUT = Path(__file__).resolve().parent.parent / "web" / "icons"
SUPERSAMPLE = 4


def rose(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    long_r: float,
    short_r: float,
    fill,
    rotation: float = 0.0,
) -> None:
    """Four-pointed star with pinched sides, rotated by `rotation` radians."""
    points = []
    for i in range(8):
        angle = (math.pi / 4) * i - math.pi / 2 + rotation
        radius = long_r if i % 2 == 0 else short_r
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(points, fill=fill)


def draw_icon(size: int, *, maskable: bool) -> Image.Image:
    s = size * SUPERSAMPLE
    image = Image.new("RGBA", (s, s), OXBLOOD)
    draw = ImageDraw.Draw(image)

    # A maskable icon may be cropped to a circle of 80% of the canvas, so the
    # emblem shrinks while the background stays full-bleed.
    scale = 0.72 if maskable else 0.86
    c = s / 2
    ring_r = 0.40 * s * scale
    line = max(1, int(0.022 * s * scale))

    draw.ellipse([c - ring_r, c - ring_r, c + ring_r, c + ring_r], outline=PARCHMENT, width=line)
    inner = ring_r - line * 2.4
    draw.ellipse([c - inner, c - inner, c + inner, c + inner], outline=PARCHMENT_DIM, width=max(1, line // 2))

    # diagonal points behind, cardinal points in front
    rose(draw, c, c, inner * 0.60, inner * 0.14, PARCHMENT_DIM, rotation=math.pi / 4)
    rose(draw, c, c, inner * 0.92, inner * 0.18, PARCHMENT)

    dot = inner * 0.10
    draw.ellipse([c - dot, c - dot, c + dot, c + dot], fill=OXBLOOD)

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size, maskable, name in (
        (192, False, "icon-192.png"),
        (512, False, "icon-512.png"),
        (512, True, "icon-512-maskable.png"),
    ):
        path = OUT / name
        draw_icon(size, maskable=maskable).save(path)
        print(f"wrote {path.relative_to(OUT.parent.parent)}")


if __name__ == "__main__":
    main()
