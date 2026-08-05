#!/usr/bin/env python3
"""List the places the game sends people to, and which of them have coordinates.

    python3 tools/waypoints.py                 # report to stdout
    python3 tools/waypoints.py --out docs/mista.md

The engine can check an arrival against a position, but only for a task that
names a place (`quest.at`). Nothing else in the game knows where anything is —
the zone list in platform/geo.js is empty and the role effects that depend on it
stay unmet. So this is the precise shape of what is missing: every task that
sends the group somewhere, with a blank where its coordinates go.

Written as a checklist rather than a warning because that is what it is for:
handing to whoever walks the route with a phone in one hand.
"""

import argparse
import json
import os
import sys
from collections import defaultdict

GAME = os.path.join("games", "nebakov")


def read(name):
    with open(os.path.join(GAME, name), encoding="utf-8") as fh:
        return json.load(fh)


def zones():
    """What zones.json already holds, and what it is still waiting for."""
    if not os.path.exists(os.path.join(GAME, "zones.json")):
        return [], []
    data = read("zones.json")
    return data.get("zones", []), data.get("pending", [])


def collect(scenario):
    """Every quest a card starts, keyed by deck, in card order."""
    by_deck = defaultdict(list)
    for scene in scenario["scenes"]:
        code = scene.get("cardCode") or scene["id"]
        for choice in scene.get("choices") or []:
            quest = choice.get("quest")
            if not quest:
                continue
            by_deck[code[0] if code[:1].isalpha() else "?"].append({
                "card": code,
                "quest": quest.get("id"),
                "kind": quest.get("kind"),
                "text": quest.get("text") or choice.get("text", ""),
                "at": quest.get("at"),
            })
    return by_deck


def report(scenario, out):
    by_deck = collect(scenario)
    total = sum(len(v) for v in by_deck.values())
    travel = [q for v in by_deck.values() for q in v if q["kind"] == "travel"]
    placed = [q for q in travel if q["at"]]

    have, waiting = zones()
    lines = [
        "# Místa k doplnění",
        "",
        f"Úkolů celkem **{total}**, z toho cestovních **{len(travel)}**. "
        f"Souřadnice má **{len(placed)}**. Zón v datech: **{len(have)}**.",
        "",
        "Bez souřadnic se hra hraje na čestné slovo: tlačítko „Jsme na místě“ "
        "prostě odhalí další kartu. Se souřadnicemi se hra zeptá, když je skupina "
        "podle GPS jinde — a nechá si odporovat, protože signál pod skalami je "
        "často mimo (Q08c).",
        "",
        "Formát: `50.54861, 15.23310` a případně rádius v metrech (bez něj se "
        "počítá 25 m).",
        "",
        "---",
        "",
        "## Hospody a místa s jídlem",
        "",
        "Kvůli Nenasytovi (+1 v hospodách) a Lenochovi (−1 mimo obce).",
        "",
        "| Místo | Souřadnice | Rádius |",
        "|---|---|---|",
    ]
    for zone in have:
        if zone.get("id") != "pubs":
            continue
        lines.append(f"| {zone.get('name')} | {zone['lat']}, {zone['lon']} ✅ "
                     f"| {zone.get('radius', 25)} m |")
    for zone in waiting:
        if zone.get("id") != "pubs":
            continue
        lines.append(f"| {zone.get('name')} | | |")

    lines += [
        "",
        "## Obce",
        "",
        "Autor to nechal otevřené (Q08b): v okruhu hry je dnes jen Troskovice, "
        "ale osad, které se ve středověku za obec počítaly, je víc. Doplňte "
        "prosím střed a rádius u každé, kterou má hra brát jako obec.",
        "",
        "| Obec / osada | Střed | Rádius |",
        "|---|---|---|",
    ]
    for zone in have + waiting:
        if zone.get("id") != "village":
            continue
        coords = f"{zone['lat']}, {zone['lon']} ✅" if zone.get("lat") else ""
        lines.append(f"| {zone.get('name')} | {coords} | {zone.get('radius', '')} |")
    lines += [
        "| Tachov | | |",
        "| | | |",
        "",
        "## Cestovní úkoly",
        "",
        "Kam hra skupinu posílá. Stačí ta místa, u kterých má smysl polohu "
        "kontrolovat — u „vraťte se, odkud jste přišli“ to smysl nemá.",
        "",
    ]

    for deck in sorted(by_deck):
        rows = [q for q in by_deck[deck] if q["kind"] == "travel"]
        if not rows:
            continue
        lines += [f"### Balíček {deck}", "", "| Karta | Úkol | Souřadnice |", "|---|---|---|"]
        for row in rows:
            coords = ""
            if row["at"]:
                coords = f"{row['at'].get('lat')}, {row['at'].get('lon')} ✅"
            lines.append(f"| {row['card']} | {row['text']} | {coords} |")
        lines.append("")

    other = [q for v in by_deck.values() for q in v if q["kind"] != "travel"]
    if other:
        lines += [
            "## Ostatní úkoly (poloha se u nich nekontroluje)",
            "",
            "Tady jde o něco, co se udělá, ne o to, kam se dojde — nechávám je "
            "na čestné slovo.",
            "",
        ]
        for row in other:
            lines.append(f"- **{row['card']}** · {row['text']} ({row['kind'] or 'bez druhu'})")
        lines.append("")

    text = "\n".join(lines)
    if out:
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
        print(f"{out}: {len(travel)} cestovních úkolů, {len(placed)} se souřadnicemi")
    else:
        print(text)
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    if not os.path.isdir(GAME):
        print(f"chyba: {GAME} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2
    return report(read("scenario.json"), args.out)


if __name__ == "__main__":
    raise SystemExit(main())
