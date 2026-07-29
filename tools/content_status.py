#!/usr/bin/env python3
"""Report what the scenario data still needs, grouped by what kind of work it is.

Every card carrying a `todo` is classified, and the graph is checked for dead
ends, so the output separates the one thing that stops a playthrough from the
much larger pile of notes that do not. Writes Markdown:

    python3 tools/content_status.py                 # -> docs/content-status.md
    python3 tools/content_status.py --out -         # to stdout

Card codes are cross-referenced against cards_source.md so each item names the
source sheet to check it against.
"""

import argparse
import collections
import json
import os
import re
import sys

GAME_DIR = os.path.join("games", "nebakov")
SCENARIO = os.path.join(GAME_DIR, "scenario.json")
EVENTS = os.path.join(GAME_DIR, "events.json")
SOURCE_MD = os.path.join(GAME_DIR, "cards_source.md")
DEFAULT_OUT = os.path.join("docs", "content-status.md")

# classification order matters: the first rule that matches wins
RULES = [
    ("nonscene", ("nikoli scéna s návazností", "Karta balíčku „N“", "Referenční stránka",
                  "fyzická příloha", "Nemá návaznost", "Sama nemá návaznost")),
    ("truncated", ("odříznut", "nebyla stažena celá", "Doplňte celý text")),
    ("verify", ("rekonstruované", "ověřte proti originálu", "Ověřte", "Přiřazení textu",
                "Rozdělení", "rozdělení textu")),
    ("author", ("Doplní autor scénáře", "doplní autor scénáře",
                "nebyl ve zdroji nalezen explicitní odkaz")),
    ("rewrite", ("Plně digitální verze", "je potřeba ho přepsat")),
]

TITLES = {
    "blocking": ("A. Zastavuje průchod hrou",
                 "Dosažitelná scéna bez východu, u které východ chybět nemá. "
                 "Tohle je jediná kategorie, která brání dohrát hru."),
    "author": ("B. Chybí návaznost, doplní autor",
               "Karta má pokračovat, ale odkaz ve zdroji není. Pokud je karta "
               "zároveň v kategorii A, je uvedená tam."),
    "nonscene": ("C. Není to scéna — potřebuje datový model",
                 "Karty, které správně nemají žádné „goto“: předměty do inventáře, "
                 "osobní karty, nápovědy pro konkrétního hráče, náhodná setkání, "
                 "referenční listy. Nechybí u nich obsah, chybí jim v enginu "
                 "odpovídající pojem."),
    "verify": ("D. Ověřit přiřazení textu ke kartě",
               "Na zdrojovém slidu je víc karet pohromadě a extrakce nezachovala "
               "jejich hranice. Hra se hraje, ale text může sedět na jiné kartě, "
               "než má. Nutná kontrola proti originálu."),
    "truncated": ("E. Chybí obsah ve zdroji",
                  "Zdrojová prezentace nebyla stažená celá."),
    "rewrite": ("F. Přepsat pro digitální verzi",
                "Text popisuje zacházení s fyzickými kartami a v plně digitální hře "
                "nemá smysl."),
    "unclassified": ("G. Vyžaduje rozhodnutí",
                     "Poznámka, na kterou nesedlo žádné pravidlo."),
}


def read_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def slide_index():
    """code -> [slide numbers] from the '*Kódy karet na slidu: …*' lines."""
    idx = collections.defaultdict(list)
    if not os.path.exists(SOURCE_MD):
        return idx
    slide = None
    for line in open(SOURCE_MD, encoding="utf-8"):
        m = re.match(r"^##\s*Slide\s*(\d+)", line)
        if m:
            slide = int(m.group(1))
            continue
        m = re.match(r"^\*Kódy karet na slidu:\s*(.+?)\s*\*", line)
        if m and slide:
            for code in re.findall(r"[A-Z]\d{2}", m.group(1)):
                if slide not in idx[code]:
                    idx[code].append(slide)
    return idx


def classify(todo):
    for name, needles in RULES:
        if any(n in todo for n in needles):
            return name
    return "unclassified"


def analyse():
    scenario = read_json(SCENARIO)
    events = read_json(EVENTS) if os.path.exists(EVENTS) else {"cards": []}
    scenes = {s["id"]: s for s in scenario["scenes"]}

    adjacency = collections.defaultdict(list)
    for sid, scene in scenes.items():
        for choice in scene.get("choices") or []:
            if choice.get("goto"):
                adjacency[sid].append(choice["goto"])

    start = scenario.get("startScene")
    reached, stack = set(), [start] if start in scenes else []
    while stack:
        node = stack.pop()
        if node in reached:
            continue
        reached.add(node)
        stack.extend(t for t in adjacency[node] if t in scenes)

    cards = []
    for scene in scenario["scenes"]:
        cards.append((scene, "scene"))
    for card in events.get("cards", []):
        cards.append((card, "event"))

    buckets = collections.defaultdict(list)
    for card, kind in cards:
        todo = card.get("todo")
        sid = card["id"]
        has_exit = bool(adjacency.get(sid))
        is_reachable = sid in reached if kind == "scene" else None
        group = classify(todo) if todo else None

        # a reachable scene with no way out is the blocking case, unless the
        # note says it is deliberately not a scene
        is_ending = bool(card.get("ending"))
        if (kind == "scene" and is_reachable and not has_exit
                and group not in ("nonscene",) and not is_ending and sid != start):
            group = "blocking"
        if not todo and group is None:
            continue
        buckets[group].append({
            "id": sid, "code": card.get("cardCode"), "kind": kind,
            "todo": todo or "", "reachable": is_reachable, "hasExit": has_exit,
        })

    unreachable = sorted(sid for sid in scenes if sid not in reached)
    terminal = sorted(sid for sid in scenes
                      if sid in reached and not adjacency.get(sid))
    return scenario, events, buckets, unreachable, terminal, scenes


def summarise(card, slides):
    bits = [f"**{card['code'] or card['id']}**", f"`{card['id']}`"]
    where = slides.get(card["code"] or "", [])
    if where:
        bits.append("slide " + ", ".join(str(s) for s in where))
    if card["kind"] == "event":
        bits.append("balíček N")
    if card["reachable"] is False:
        bits.append("nedosažitelná")
    return " · ".join(bits)


def render(scenario, events, buckets, unreachable, terminal, scenes, slides):
    total_todo = sum(len(v) for v in buckets.values())
    blocking = buckets.get("blocking", [])
    author = buckets.get("author", [])

    lines = []
    add = lines.append
    add("# Stav obsahu — Tajemství Nebákova")
    add("")
    add("Generováno nástrojem `tools/content_status.py` z `games/nebakov/"
        "scenario.json` a `events.json`. Spusť ho znovu po každé úpravě karet.")
    add("")
    add("## Souhrn")
    add("")
    add(f"- scén: **{len(scenes)}**, karet balíčku N: **{len(events.get('cards', []))}**")
    add(f"- poznámek `todo`: **{total_todo}**")
    add(f"- **zastavuje průchod hrou: {len(blocking)}**")
    endings = [sid for sid in terminal if scenes[sid].get("ending")]
    add(f"- dosažitelných scén bez východu: {len(terminal)} "
        f"({', '.join('`' + t + '`' for t in terminal)})")
    if endings:
        add(f"  - z toho označených jako konec hry (`ending: true`): "
            f"{', '.join('`' + e + '`' for e in endings)}")
    add(f"- nedosažitelných scén: {len(unreachable)} "
        f"({', '.join('`' + u + '`' for u in unreachable)})")
    add("")
    if len(blocking) <= 2:
        add("> Podstatné zjištění: velká většina poznámek `todo` **nejsou chybějící "
            "návaznosti**. Jsou to buď karty, které správně žádné pokračování nemají "
            "(předměty, osobní karty, náhodná setkání), nebo nejistota, na které kartě "
            "má text sedět. Hra je tedy prakticky průchozí a kritickou cestou k "
            "produkčnímu stavu je engine, ne dopisování obsahu.")
        add("")

    for key in ("blocking", "author", "nonscene", "verify", "truncated",
                "rewrite", "unclassified"):
        items = buckets.get(key)
        if not items:
            continue
        title, desc = TITLES[key]
        add(f"## {title} — {len(items)}")
        add("")
        add(desc)
        add("")
        by_note = collections.OrderedDict()
        for card in sorted(items, key=lambda c: (c["code"] or "zz", c["id"])):
            by_note.setdefault(card["todo"], []).append(card)
        for note, group_cards in by_note.items():
            if len(group_cards) == 1:
                add(f"- {summarise(group_cards[0], slides)}")
            else:
                add(f"- {len(group_cards)} karet se stejnou poznámkou:")
                for card in group_cards:
                    add(f"  - {summarise(card, slides)}")
            if note:
                add(f"  - {note}")
        add("")

    add("## Chybí mimo karty")
    add("")
    add("- **Balíček O** (`O01`–`O03`, případně `O04`) — řešení hádanek balíčku N. "
        "Odkazuje se na něj pět hádanek, v repu není vůbec.")
    add("- **Karty REP+ / REP−** — zmíněné v pravidlech na `card_P02`, nikdy "
        "nedigitalizované.")
    add("- **Obrázek `lipa02.jpg`** — používají ho `card_C05` a `card_C06`.")
    add("- **Souřadnice GPS zón** — `pubs` a `no_village` se používají v "
        "`roles.json`, nikde nejsou definované.")
    add("- **Mapy a obálky** — fyzické rekvizity („Mapa 03“, tři obálky); v plně "
        "digitální verzi je potřeba nahradit obsahem.")
    add("")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=DEFAULT_OUT,
                    help="výstupní soubor, '-' pro stdout (default: %(default)s)")
    args = ap.parse_args()

    if not os.path.exists(SCENARIO):
        print(f"chyba: {SCENARIO} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2

    slides = slide_index()
    scenario, events, buckets, unreachable, terminal, scenes = analyse()
    text = render(scenario, events, buckets, unreachable, terminal, scenes, slides)

    if args.out == "-":
        sys.stdout.write(text)
    else:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(text)
        counts = {k: len(v) for k, v in buckets.items()}
        print(f"{args.out}: {sum(counts.values())} poznámek")
        for key in ("blocking", "author", "nonscene", "verify", "truncated",
                    "rewrite", "unclassified"):
            if counts.get(key):
                print(f"  {TITLES[key][0].split('.')[0]}: {counts[key]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
