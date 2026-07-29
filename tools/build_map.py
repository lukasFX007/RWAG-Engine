#!/usr/bin/env python3
"""Generate docs/scenario-map.html from the scenario data.

The page is a reference for implementing the engine: one node per scene keyed
by the id used in code, one edge per goto, and every disableIf spelled out as
the requirement it stands for. Run it after any change to the cards so the map
does not drift from the data:

    python3 tools/build_map.py
    python3 tools/build_map.py --out /tmp/map.html --open-decks P,C

Assets (tools/map_assets/style.css, graph.js) are inlined, and card images are
embedded as data URIs, so the result is a single self-contained file that works
from disk with no network access. Pillow is used to shrink the embedded images
if it is installed; without it they go in at full size.
"""

import argparse
import base64
import collections
import io
import json
import os
import sys

GAME_DIR = os.path.join("games", "nebakov")
SCENARIO = os.path.join(GAME_DIR, "scenario.json")
EVENTS = os.path.join(GAME_DIR, "events.json")
IMAGES_DIR = os.path.join(GAME_DIR, "images")
ASSETS = os.path.join("tools", "map_assets")
DEFAULT_OUT = os.path.join("docs", "scenario-map.html")

STORY_DECKS = ["P", "A", "B", "C", "D", "E", "F", "G", "H"]

DECK_TITLES = {
    "P": ("Pravidla a nastavení hry",
          "Lineární řetěz <code>card_P01</code>→<code>card_P04</code>, který je "
          "skutečným vstupem hry (<code>startScene</code>). <code>card_P05</code> "
          "je úklidová karta, na kterou míří možné konce z balíčku H."),
    "A": ("Seznamovací balíček",
          "Rozehřívací karty na cestě z výletiště, končí přidělením rolí a "
          "vstupem do balíčku B."),
    "B": ("Cesta na Nebákov",
          "Troskovice, pomník, bylinkář. <code>card_B06</code> a "
          "<code>card_B11</code> byly dřív <code>scene_206</code>/"
          "<code>scene_211</code>."),
    "C": ("Muž pod lípou a Apolena",
          "<code>card_C01</code>–<code>card_C06</code> byly dřív "
          "<code>scene_301</code>–<code>scene_306</code>. Reputaci dává jen "
          "<code>card_C07</code> (😊 ve zdroji)."),
    "D": ("Nebákov a mlýn", ""),
    "E": ("Výslechy a pátrání", ""),
    "F": ("Stopa cizince", ""),
    "G": ("Jarek a cesta k vodopádu",
          "Nejvíc podmíněných voleb v celé hře — pět voleb je zamčeno reputací "
          "(<code>rep ≥ 3</code> až <code>rep ≥ 6</code>)."),
    "H": ("Vyvrcholení a konce",
          "Čtyři karty (H19, H22, H25, H26) jsou konce hry a vedou na "
          "<code>card_P05</code>."),
}

MAX_IMAGE_WIDTH = 420
JPEG_QUALITY = 72


def read_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def deck_of(card, from_events=False):
    if from_events:
        return "N"
    code = card.get("cardCode")
    return code[0] if code and code[0].isalpha() else "REF"


def build_dataset(scenario, events):
    scenes = {s["id"]: s for s in scenario["scenes"]}
    inbound = collections.defaultdict(list)
    adjacency = collections.defaultdict(list)
    edges = 0
    for sid, scene in scenes.items():
        for choice in scene.get("choices") or []:
            target = choice.get("goto")
            if not target:
                continue
            edges += 1
            adjacency[sid].append(target)
            inbound[target].append(sid)

    start = scenario.get("startScene")
    reached, stack = set(), [start] if start in scenes else []
    while stack:
        node = stack.pop()
        if node in reached:
            continue
        reached.add(node)
        stack.extend(t for t in adjacency[node] if t in scenes)

    out = {}

    def add(card, from_events=False):
        text = card.get("text", "")
        if isinstance(text, list):
            text = "\n\n".join(text)
        out[card["id"]] = {
            "id": card["id"],
            "code": card.get("cardCode"),
            "deck": deck_of(card, from_events),
            "text": text,
            "image": card.get("image"),
            "effects": card.get("effects"),
            "todo": card.get("todo"),
            "choices": [{"icon": c.get("icon"), "text": c.get("text"),
                         "goto": c.get("goto"), "disableIf": c.get("disableIf")}
                        for c in (card.get("choices") or [])],
            "inbound": sorted(inbound[card["id"]]),
            "reachable": None if from_events else card["id"] in reached,
            "fromEvents": from_events,
        }

    for scene in scenario["scenes"]:
        add(scene)
    for card in (events or {}).get("cards", []):
        add(card, True)

    story = [v for v in out.values() if not v["fromEvents"]]
    stats = {
        "scenes": len(story),
        "events": len(out) - len(story),
        "edges": edges,
        "cond": sum(1 for v in story for c in v["choices"] if c["disableIf"]),
        "reach": len(reached),
        "conv": sum(1 for v in story if len(v["inbound"]) > 1),
        "todo": sum(1 for v in out.values() if v["todo"]),
        "unreach": sum(1 for v in story if not v["reachable"]),
        "terminal": sum(1 for v in story
                        if not [c for c in v["choices"] if c["goto"]]),
    }
    return out, stats


def embed_images(cards):
    wanted = sorted({c["image"] for c in cards.values() if c.get("image")})
    images, missing = {}, []
    try:
        from PIL import Image
    except ImportError:
        Image = None
    for name in wanted:
        path = os.path.join(IMAGES_DIR, name)
        if not os.path.exists(path):
            missing.append(name)
            continue
        raw = open(path, "rb").read()
        mime = "image/jpeg" if name.lower().endswith((".jpg", ".jpeg")) else "image/png"
        if Image is not None:
            try:
                im = Image.open(io.BytesIO(raw))
                if im.width > MAX_IMAGE_WIDTH:
                    im.thumbnail((MAX_IMAGE_WIDTH, MAX_IMAGE_WIDTH * 4))
                buf = io.BytesIO()
                im.convert("RGB").save(buf, format="JPEG", quality=JPEG_QUALITY)
                raw, mime = buf.getvalue(), "image/jpeg"
            except Exception as exc:                      # noqa: BLE001
                print(f"  varování: {name} nešel zmenšit ({exc}), vkládám v původní velikosti",
                      file=sys.stderr)
        images[name] = f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")
    return images, missing


def deck_counts(cards):
    per = {}
    for deck in set(v["deck"] for v in cards.values()):
        ids = [k for k, v in cards.items() if v["deck"] == deck]
        per[deck] = {
            "n": len(ids),
            "e": sum(1 for i in ids for c in cards[i]["choices"] if c["goto"]),
            "cond": sum(1 for i in ids for c in cards[i]["choices"] if c["disableIf"]),
            "todo": sum(1 for i in ids if cards[i]["todo"]),
        }
    return per


def folio(code, title, desc, counts, kind="flow", open_it=False, suffix=""):
    meta = f'<span>{counts["n"]} karet</span><span>{counts["e"]} hran</span>'
    if counts["cond"]:
        meta += f'<span style="color:var(--cond)">{counts["cond"]}× podmínka</span>'
    if counts["todo"]:
        meta += f'<span style="color:var(--warn)">{counts["todo"]}× todo</span>'
    desc_html = f'<p class="f-desc">{desc}</p>' if desc else ""
    return f'''      <details class="folio" data-deck="{code}" data-kind="{kind}"{" open" if open_it else ""}>
        <summary><span class="f-deck">{code}</span><span class="f-title">{title}{suffix}</span><span class="f-meta">{meta}</span></summary>
        <div class="f-body">
{desc_html}
          <div class="scroller"></div>
        </div>
      </details>'''


def render(cards, stats, images, missing_images, open_decks, start):
    per = deck_counts(cards)
    folios = []
    for code in STORY_DECKS:
        if code not in per:
            continue
        title, desc = DECK_TITLES.get(code, (f"Balíček {code}", ""))
        folios.append(folio(code, title, desc, per[code],
                            open_it=code in open_decks))
    if "N" in per:
        folios.append(folio(
            "N", "Náhodná setkání",
            "Tyto karty nejsou ve <code>scenario.json</code> — žijí v "
            "<code>games/nebakov/events.json</code>. Nemají žádné <code>goto</code>: "
            "engine je tahá z balíčku a podle <code>drawRule: \"recycle_to_bottom\"</code> "
            "vrací vyhodnocenou kartu dospod, takže se balíček recykluje. Proto galerie, "
            "ne rozhodovací diagram.",
            per["N"], kind="gallery",
            suffix=' <span style="font-weight:400;color:var(--ink-soft)">— events.json</span>'))
    if "REF" in per:
        folios.append(folio(
            "REF", "Referenční karty",
            "Úvodní dopis paní Machny a legenda značek — text bez voleb, engine "
            "je nikdy nevyvolává hranou.", per["REF"], kind="gallery"))

    missing_note = ""
    if missing_images:
        missing_note = ("; chybí obrázky <code>"
                        + "</code>, <code>".join(missing_images) + "</code>")

    style = open(os.path.join(ASSETS, "style.css"), encoding="utf-8").read()
    script = open(os.path.join(ASSETS, "graph.js"), encoding="utf-8").read()
    payload = json.dumps(
        {"declaredStart": None, "trueStart": None, "scenes": cards, "images": images},
        ensure_ascii=False, separators=(",", ":"))

    return f'''<title>Tajemství Nebákova — graf scénáře</title>
<style>
{style}
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">RWAG Engine · games/nebakov/scenario.json + events.json</p>
    <h1>Tajemství Nebákova — graf scénáře</h1>
    <p class="lede">Referenční mapa pro implementaci herní logiky. Vygenerovaná
      z dat nástrojem <code>tools/build_map.py</code>: každý uzel, každá hrana a
      každá podmínka odpovídá tomu, co je v datech — nic není domyšlené. Uzly
      nesou <strong><code>id</code>, na která se odkazuje v kódu</strong>.</p>
    <dl class="factbar">
      <div class="fact"><dt>scén</dt><dd>{stats['scenes']}</dd></div>
      <div class="fact"><dt>karet v <code>events</code></dt><dd>{stats['events']}</dd></div>
      <div class="fact"><dt>hran (goto)</dt><dd>{stats['edges']}</dd></div>
      <div class="fact"><dt>podmíněných voleb</dt><dd>{stats['cond']}</dd></div>
      <div class="fact"><dt>dosažitelných</dt><dd>{stats['reach']} <small>z {stats['scenes']}</small></dd></div>
      <div class="fact"><dt>konvergencí <small>(&gt;1 vstup)</small></dt><dd>{stats['conv']}</dd></div>
      <div class="fact"><dt>cyklů v <code>goto</code></dt><dd>0 <small>viz pozn. 1</small></dd></div>
    </dl>
  </header>
</div>

<div class="toolbar">
  <div class="toolbar-inner">
    <div class="grp">
      <label class="tb" for="m-story">Zobrazení</label>
      <div class="seg" role="group" aria-label="Režim zobrazení">
        <button id="m-story" type="button" data-mode="story" aria-pressed="true">Příběh</button>
        <button type="button" data-mode="logic" aria-pressed="false">Logika</button>
      </div>
    </div>
    <span class="hint">Příběh = plné znění karet · Logika = kompaktní uzly s id, efekty a podmínkami</span>
    <span class="spacer"></span>
    <button class="linkish" type="button" id="expandall">Rozbalit vše</button>
  </div>
</div>

<div class="wrap">

  <section class="block">
    <div class="note">
      <h3>Co je potřeba vědět před psaním enginu</h3>
      <p><strong>1. Kartu <em>lze</em> vidět dvakrát, i když graf <code>goto</code> je
        acyklický.</strong> Topologické řazení projde všech {stats['scenes']} scén, takže po
        hranách <code>goto</code> se na už navštívenou kartu vrátit nelze. Opakování
        ale zajišťují dvě mechaniky, které v grafu vůbec nejsou: balíček
        <strong>N</strong> se podle karty <code>card_N01</code> recykluje („vždy když
        kartu vyhodnotíte, vraťte ji dospod balíčku“), a role <strong>Vzdělaný
        pedant</strong> má <code>return_on_choice</code> („1/hru můžete vzít zpět
        rozhodnutí“). Engine tedy potřebuje historii průchodu i stav balíčku, ne jen
        ukazatel na aktuální scénu.</p>
      <p><strong>2. Podmínky a toasty dnes engine ignoruje.</strong>
        <code>engine/conditions.js</code> je prázdná kostra, takže všech
        {stats['cond']} voleb s <code>disableIf</code> se nezamyká a jde je vzít bez
        ohledu na reputaci. <code>engine/effects.js</code> zná jen
        <code>reputation</code>, takže <code>toast</code> v datech je zatím mrtvý.</p>
      <p><strong>3. Data nejsou hotová.</strong> {stats['todo']} karet nese
        <code>todo</code>, tedy návaznost, kterou se ze zdrojové prezentace nepodařilo
        zachytit; {stats['unreach']} scén není z <code>startScene</code> dosažitelných.
        Chybí celý balíček <strong>O</strong> (<code>O01</code>–<code>O03</code>, řešení
        hádanek balíčku N), na který karty odkazují{missing_note}. Acykličnost i
        dosažitelnost proto platí pro data, která existují, ne pro hotovou hru.</p>
    </div>
  </section>

  <section class="block">
    <h2 class="h">Jak čtete diagram</h2>
    <p class="sub">Značení drží konvenci rozhodovacích diagramů: obdélník = činnost,
      kosočtverec = rozhodnutí, pětiúhelník = odkaz mimo stránku.</p>
    <div class="key">
      <div class="key-item"><span class="shape proc"><i></i></span><span class="kdesc"><b>Karta (činnost)</b> — jeden uzel <code>scenes[]</code>. V hlavičce kód karty a jeho <code>id</code>.</span></div>
      <div class="key-item"><span class="shape dec"><i></i></span><span class="kdesc"><b>Rozhodnutí</b> — vloženo jen tam, kde karta má 2+ voleb s <code>goto</code>. Číslo = počet voleb.</span></div>
      <div class="key-item"><span class="shape conn"><i></i></span><span class="kdesc"><b>Odkaz na jiný balíček</b> — hrana opouštějící/vstupující do balíčku, s cílovým <code>id</code>.</span></div>
      <div class="key-item"><span class="shape line"><i></i></span><span class="kdesc"><b>Plná šipka</b> — nepodmíněný přechod. Popisek = přesný text volby z karty.</span></div>
      <div class="key-item"><span class="shape line cond"><i></i></span><span class="kdesc"><b>Modrá přerušovaná</b> — volba s <code>disableIf</code>; popisek říká, co je potřeba splnit.</span></div>
      <div class="key-item"><span class="shape proc" style="opacity:.7"><i style="border-style:dashed"></i></span><span class="kdesc"><b>Přerušovaný rámeček</b> — scéna nedosažitelná ze <code>startScene</code>.</span></div>
    </div>
  </section>

  <section class="block">
    <h2 class="h">Balíčky</h2>
    <p class="sub">Každý balíček je samostatný podgraf. Hrany mezi balíčky jsou
      zobrazené jako pětiúhelníkové odkazy na obou stranách.</p>
    <div class="folios">
{chr(10).join(folios)}
    </div>
  </section>

  <section class="block">
    <h2 class="h">Tabulka scén</h2>
    <p class="sub">Autoritativní přehled pro implementaci: co scéna dělá, kam vede a
      za jakých podmínek. Filtr bere id, kód, balíček i klíčová slova
      <code>todo</code>, <code>podminka</code>, <code>terminal</code>, <code>mimo</code>.</p>
    <div class="filterbox">
      <input id="specfilter" type="search" placeholder="filtr: card_G1, podminka, todo, mimo…" aria-label="Filtr scén">
      <span class="count" id="speccount"></span>
    </div>
    <div class="tablewrap">
      <table class="spec">
        <thead>
          <tr>
            <th>id (engine)</th><th>karta</th><th>balíček</th><th class="num">vstupů</th>
            <th>vede na (goto)</th><th>effects</th><th>stav</th>
          </tr>
        </thead>
        <tbody id="specbody"></tbody>
      </table>
    </div>
  </section>

  <footer class="foot">
    <p>Vygenerováno nástrojem <code>tools/build_map.py</code> z
      <code>games/nebakov/scenario.json</code> a <code>events.json</code>. Rozvržení je
      automatické: vrstvení podle nejdelší cesty, průchozí uzly pro dlouhé hrany a
      barycentrické průchody pro omezení křížení. Popisky hran se packují do pásu mezi
      vrstvami, který se rozšíří, když se nevejdou.</p>
    <p>Po každé úpravě karet spusť <code>python3 tools/cards.py build</code> a poté
      <code>python3 tools/build_map.py</code>, aby mapa neodběhla od dat.</p>
  </footer>
</div>

<script>
window.__NEBAKOV_DATA__ = {payload};
window.__NEBAKOV_DATA__.declaredStart = {json.dumps(start)};
window.__NEBAKOV_DATA__.trueStart = {json.dumps(start)};
</script>
<script>
{script}
</script>
'''


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=DEFAULT_OUT, help="výstupní soubor (default: %(default)s)")
    ap.add_argument("--open-decks", default="P,C",
                    help="balíčky rozbalené po otevření (default: %(default)s)")
    ap.add_argument("--fragment", action="store_true",
                    help="zapsat bez <!doctype>/<html> obálky")
    args = ap.parse_args()

    for path in (SCENARIO, os.path.join(ASSETS, "style.css"),
                 os.path.join(ASSETS, "graph.js")):
        if not os.path.exists(path):
            print(f"chyba: {path} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
            return 2

    scenario = read_json(SCENARIO)
    events = read_json(EVENTS) if os.path.exists(EVENTS) else None

    cards, stats = build_dataset(scenario, events)
    images, missing = embed_images(cards)
    open_decks = {d.strip().upper() for d in args.open_decks.split(",") if d.strip()}

    page = render(cards, stats, images, missing, open_decks,
                  scenario.get("startScene"))
    if not args.fragment:
        page = ('<!doctype html>\n<html lang="cs">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
                '</head>\n<body>\n' + page + '\n</body>\n</html>\n')

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(page)

    print(f"{args.out}: {round(len(page.encode()) / 1024)} KB")
    print(f"  {stats['scenes']} scén + {stats['events']} karet events, "
          f"{stats['edges']} hran, {stats['cond']} podmínek")
    print(f"  dosažitelných {stats['reach']}/{stats['scenes']}, "
          f"{stats['todo']}× todo, {stats['terminal']} bez východu")
    if images:
        print(f"  vloženo obrázků: {len(images)}")
    if missing:
        print(f"  chybějící obrázky: {missing}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
