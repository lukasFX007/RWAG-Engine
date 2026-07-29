#!/usr/bin/env python3
"""Cut the individual printed cards out of the print-ready deck.

Input is the print file exported to PDF (in Google Slides: File -> Download ->
PDF document). Each page is a print sheet carrying one or more cards on an
otherwise empty background, with the card code (G20, C03, N17 ...) set as a
separate label next to or on the card.

For every page the script

  1. renders the page at --dpi,
  2. finds the cards as connected regions of non-white pixels, keeping the ones
     whose size matches a card (default 89x63.5 mm, i.e. a 63x88 mm card in
     landscape) within --tolerance,
  3. reads the card codes from the PDF text layer, which comes with
     coordinates, so no OCR is needed, and assigns each code to the card it
     sits in or is nearest to,
  4. writes one PNG per card, named after the code.

Cards whose code could not be determined are still written, as
page<N>_<i>.png, and listed in the report so they can be named by hand.

    python3 tools/extract_cards.py deck.pdf --out games/nebakov/cards/images
    python3 tools/extract_cards.py deck.pdf --dpi 600 --report cards.json

Requires: pymupdf, pillow, numpy, scipy.
"""

import argparse
import json
import os
import re
import sys

CODE_RE = re.compile(r"^[A-Z]\d{2}$")
MM_PER_INCH = 25.4


def die(msg):
    print("chyba: " + msg, file=sys.stderr)
    raise SystemExit(2)


def load_deps():
    try:
        import fitz
        import numpy as np
        from PIL import Image
        from scipy import ndimage
    except ImportError as exc:
        die(f"chybí závislost ({exc.name}). Nainstaluj: "
            "python3 -m pip install pymupdf pillow numpy scipy")
    return fitz, np, Image, ndimage


def page_pixels(fitz, np, page, dpi):
    pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csRGB, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8)
    return arr.reshape(pix.height, pix.width, 3), pix.width, pix.height


def find_cards(np, ndimage, rgb, expect_w, expect_h, tol, ink_threshold, min_area_frac):
    ink = (255 - rgb.astype(np.int16)).max(axis=2) > ink_threshold
    # close small gaps so a card's interior counts as one region even where the
    # artwork is nearly white
    closed = ndimage.binary_closing(ink, structure=np.ones((5, 5)))
    labels, n = ndimage.label(closed)
    if not n:
        return [], []

    page_area = rgb.shape[0] * rgb.shape[1]
    cards, others = [], []
    for idx, sl in enumerate(ndimage.find_objects(labels), start=1):
        ys, xs = sl
        w, h = xs.stop - xs.start, ys.stop - ys.start
        area = int((labels[sl] == idx).sum())
        box = (int(xs.start), int(ys.start), int(xs.stop), int(ys.stop))
        item = {"box": box, "w": w, "h": h, "px": area}
        fits = (abs(w - expect_w) <= expect_w * tol
                and abs(h - expect_h) <= expect_h * tol)
        big_enough = area >= page_area * min_area_frac
        if fits and big_enough:
            cards.append(item)
        else:
            item["why"] = ("velikost %dx%d px mimo očekávané %dx%d ±%d%%"
                           % (w, h, expect_w, expect_h, round(tol * 100))
                           if not fits else "příliš malá plocha")
            others.append(item)
    cards.sort(key=lambda c: (c["box"][1], c["box"][0]))
    return cards, others


def page_codes(page, scale):
    """Card codes from the text layer, in pixel coordinates."""
    out = []
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        w = word.strip().strip("„“\"'()[]:.,")
        if CODE_RE.match(w):
            out.append({"code": w,
                        "box": (x0 * scale, y0 * scale, x1 * scale, y1 * scale)})
    return out


def assign(cards, codes):
    """Name each card from the code label printed beside it.

    Labels sit outside the card; codes printed *on* a card are usually
    references to other cards ("➤ 📜C24"), so using them would rename the card
    after its neighbour. Outside labels are therefore matched first, globally
    nearest pair first. A code found inside a card is used only when it is the
    single distinct code on that card — otherwise the card is left unnamed and
    reported, which is better than guessing wrong.
    """
    def centre(b):
        return ((b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0)

    def contains(b, pt):
        return b[0] <= pt[0] <= b[2] and b[1] <= pt[1] <= b[3]

    def gap(cb, lb):
        dx = max(cb[0] - lb[2], lb[0] - cb[2], 0)
        dy = max(cb[1] - lb[3], lb[1] - cb[3], 0)
        return (dx * dx + dy * dy) ** 0.5

    for card in cards:
        card["code"] = None
        card["codeFrom"] = None

    outside, inside_by_card = [], {id(c): [] for c in cards}
    for code in codes:
        pt = centre(code["box"])
        host = next((c for c in cards if contains(c["box"], pt)), None)
        if host is None:
            outside.append(code)
        else:
            inside_by_card[id(host)].append(code)

    # globally greedy: smallest card-to-label gap wins first
    pairs = sorted(((gap(c["box"], l["box"]), ci, li)
                    for ci, c in enumerate(cards)
                    for li, l in enumerate(outside)),
                   key=lambda t: t[0])
    taken_cards, taken_labels = set(), set()
    for _, ci, li in pairs:
        if ci in taken_cards or li in taken_labels:
            continue
        cards[ci]["code"] = outside[li]["code"]
        cards[ci]["codeFrom"] = "label"
        taken_cards.add(ci)
        taken_labels.add(li)

    for card in cards:
        if card["code"]:
            continue
        distinct = {c["code"] for c in inside_by_card[id(card)]}
        if len(distinct) == 1:
            card["code"] = distinct.pop()
            card["codeFrom"] = "on-card"

    unused = sorted({outside[li]["code"] for li in range(len(outside))
                     if li not in taken_labels})
    return unused


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", help="tiskové PDF")
    ap.add_argument("--out", default="games/nebakov/cards/images",
                    help="cílový adresář (default: %(default)s)")
    ap.add_argument("--dpi", type=int, default=300, help="rozlišení (default: %(default)s)")
    ap.add_argument("--card-mm", default="89x63.5",
                    help="očekávaný rozměr karty v mm (default: %(default)s)")
    ap.add_argument("--tolerance", type=float, default=0.20,
                    help="povolená odchylka rozměru, 0.2 = ±20%% (default: %(default)s)")
    ap.add_argument("--bleed", type=int, default=0,
                    help="přidat N px okraje kolem karty")
    ap.add_argument("--ink-threshold", type=int, default=18,
                    help="jak moc se pixel musí lišit od bílé (0-255)")
    ap.add_argument("--min-area-frac", type=float, default=0.005,
                    help="minimální plocha karty jako podíl stránky")
    ap.add_argument("--pages", help="rozsah stránek, např. 1-5 nebo 3 (1-indexováno)")
    ap.add_argument("--report", help="zapsat JSON report do souboru")
    ap.add_argument("--dry-run", action="store_true", help="nic nezapisovat")
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        die(f"{args.pdf} neexistuje")
    try:
        cw_mm, ch_mm = (float(v) for v in args.card_mm.lower().split("x"))
    except ValueError:
        die("--card-mm očekává tvar ŠxV, např. 89x63.5")

    fitz, np, Image, ndimage = load_deps()
    doc = fitz.open(args.pdf)

    pages = range(len(doc))
    if args.pages:
        m = re.match(r"^(\d+)(?:-(\d+))?$", args.pages)
        if not m:
            die("--pages očekává N nebo N-M")
        lo = int(m.group(1)) - 1
        hi = int(m.group(2) or m.group(1))
        pages = range(max(0, lo), min(len(doc), hi))

    expect_w = round(cw_mm / MM_PER_INCH * args.dpi)
    expect_h = round(ch_mm / MM_PER_INCH * args.dpi)
    print(f"{args.pdf}: {len(doc)} stránek | {args.dpi} DPI | "
          f"karta ≈ {expect_w}x{expect_h} px ({cw_mm}x{ch_mm} mm) ±{round(args.tolerance*100)}%")
    if not args.dry_run:
        os.makedirs(args.out, exist_ok=True)

    report = {"pdf": os.path.abspath(args.pdf), "dpi": args.dpi, "cards": [],
              "unnamedCards": [], "unusedCodes": [], "rejected": []}
    used = {}
    total = 0

    for pno in pages:
        page = doc[pno]
        rgb, _, _ = page_pixels(fitz, np, page, args.dpi)
        cards, others = find_cards(np, ndimage, rgb, expect_w, expect_h,
                                   args.tolerance, args.ink_threshold,
                                   args.min_area_frac)
        codes = page_codes(page, args.dpi / 72.0)
        leftover = assign(cards, codes)

        for i, card in enumerate(cards, start=1):
            code = card["code"]
            if code:
                name = code
                if code in used:
                    used[code] += 1
                    name = f"{code}__{used[code]}"       # same code twice = revision
                else:
                    used[code] = 1
            else:
                name = f"page{pno+1:02d}_{i}"
                report["unnamedCards"].append({"page": pno + 1, "box": card["box"]})

            x0, y0, x1, y1 = card["box"]
            b = args.bleed
            crop = (max(0, x0 - b), max(0, y0 - b),
                    min(rgb.shape[1], x1 + b), min(rgb.shape[0], y1 + b))
            path = os.path.join(args.out, name + ".png")
            if not args.dry_run:
                Image.fromarray(rgb[crop[1]:crop[3], crop[0]:crop[2]]).save(path)
            report["cards"].append({"name": name, "code": code, "page": pno + 1,
                                    "box": card["box"],
                                    "size": [crop[2] - crop[0], crop[3] - crop[1]],
                                    "codeFrom": card.get("codeFrom"),
                                    "file": path})
            total += 1

        for c in leftover:
            report["unusedCodes"].append({"page": pno + 1, "code": c})
        for card in cards:
            if card.get("codeFrom") == "on-card":
                report.setdefault("codeFromCardFace", []).append(
                    {"page": pno + 1, "code": card["code"]})
        for o in others:
            if o["px"] > expect_w * expect_h * 0.25:   # only report near-misses
                report["rejected"].append({"page": pno + 1, **o})

        print(f"  strana {pno+1:2d}: {len(cards)} karet"
              + (f", kódy bez karty: {leftover}" if leftover else "")
              + (f", {len([o for o in others if o['px'] > expect_w*expect_h*0.25])} zamítnutých oblastí"
                 if any(o["px"] > expect_w * expect_h * 0.25 for o in others) else ""))

    print(f"\nhotovo: {total} karet"
          + (" (dry-run, nic nezapsáno)" if args.dry_run else f" -> {args.out}"))
    if report["unnamedCards"]:
        print(f"  {len(report['unnamedCards'])} karet bez rozpoznaného kódu "
              "(uloženo jako page<N>_<i>.png)")
    if report["unusedCodes"]:
        print(f"  kódy, ke kterým se nenašla karta: "
              f"{[c['code'] for c in report['unusedCodes']]}")
    if report["rejected"]:
        print(f"  {len(report['rejected'])} oblastí zamítnuto podle rozměru — "
              "pokud to byly karty, uprav --card-mm/--tolerance:")
        for r in report["rejected"][:5]:
            print(f"    strana {r['page']}: {r['why']}")

    dupes = {c: n for c, n in used.items() if n > 1}
    if dupes:
        print(f"  kód se opakuje (revize karty, uloženo s __2 …): {dupes}")

    if args.report and not args.dry_run:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=2)
        print(f"  report: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
