#!/usr/bin/env python3
"""Read a filled-in export from the author pack and write the coordinates into the data.

    python3 tools/apply_places.py odpovedi.txt          # dry run, prints what it would do
    python3 tools/apply_places.py odpovedi.txt --write

The export is the format `build_author_pack` produces:

    [ZONA pubs] Restaurace Nebákov
    50.5027894, 15.2026175  r=60

    [UKOL C12] C12 · Dojděte k nebákovskému mlýnu
    50.5028614, 15.2031408  r=30

    [NEPOTREBA UKOL H03] H03 · Vraťte se zpět k ohradě s ovcemi

Zones go to `zones.json`, task coordinates onto the quest that starts them, and a
task marked as needing none is recorded as such rather than left looking
unanswered. Cards can carry more than one travel task — D11 sends the group two
different ways — so a task is matched on its wording, not just its card.

Nothing is written without `--write`, and every value is checked against the
game's own area first: a swapped pair or a slipped decimal lands in another
country and is refused rather than saved.
"""

import argparse
import json
import os
import re
import sys

GAME = os.path.join("games", "nebakov")
SCENES = os.path.join(GAME, "cards", "scenes")
ZONES = os.path.join(GAME, "zones.json")

HEADER_RE = re.compile(r"^\[(NEPOTREBA\s+)?(ZONA|UKOL|UDALOST)\s+([^\]]+)\]\s*(.*)$")
COORD_RE = re.compile(r"^(-?\d+[.,]\d+)[,\s]+(-?\d+[.,]\d+)(?:\s+r=(\d+))?\s*$")

# Everything in this game happens within a few kilometres of Troskovice.
AREA = {"lat": 50.512, "lon": 15.223}
AREA_LIMIT_M = 15000


def read_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def haversine(a, b):
    from math import asin, cos, radians, sin, sqrt
    d_lat = radians(b["lat"] - a["lat"])
    d_lon = radians(b["lon"] - a["lon"])
    h = (sin(d_lat / 2) ** 2
         + cos(radians(a["lat"])) * cos(radians(b["lat"])) * sin(d_lon / 2) ** 2)
    return 2 * 6371008.8 * asin(min(1, sqrt(h)))


def parse(text):
    """Entries in the order they appear, each with whatever followed its header."""
    entries = []
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        header = HEADER_RE.match(line)
        if header:
            skip, kind, key, label = header.groups()
            current = {
                "kind": kind,
                "key": key.strip(),
                "label": label.strip(),
                "skip": bool(skip),
                "lat": None,
                "lon": None,
                "radius": None,
            }
            entries.append(current)
            continue
        if current is None or not line:
            continue
        coords = COORD_RE.match(line)
        if coords:
            lat, lon, radius = coords.groups()
            current["lat"] = float(lat.replace(",", "."))
            current["lon"] = float(lon.replace(",", "."))
            current["radius"] = int(radius) if radius else None
    return entries


def sane(entry, problems):
    if entry["lat"] is None:
        return False
    away = haversine(AREA, {"lat": entry["lat"], "lon": entry["lon"]})
    if away > AREA_LIMIT_M:
        problems.append(f"{entry['key']} „{entry['label']}“: {round(away / 1000)} km "
                        "od Troskovic — nezapsáno")
        return False
    return True


def apply_zones(entries, problems):
    """Zone entries replace what `pending` promised and keep what is already there."""
    data = read_json(ZONES)
    known = {(z["id"], z["name"]): z for z in data.get("zones", [])}
    pending = {(z["id"], z.get("name")): z for z in data.get("pending", [])}
    added = []

    for entry in entries:
        if entry["kind"] != "ZONA" or not sane(entry, problems):
            continue
        zone_id = entry["key"]
        name = entry["label"]
        known[(zone_id, name)] = {
            "id": zone_id,
            "name": name,
            "lat": entry["lat"],
            "lon": entry["lon"],
            "radius": entry["radius"] or (60 if zone_id == "pubs" else 200),
            "source": "autor",
        }
        pending.pop((zone_id, name), None)
        added.append(f"{zone_id}/{name}")

    data["zones"] = sorted(known.values(), key=lambda z: (z["id"], z["name"]))
    data["pending"] = list(pending.values())
    return data, added


def quest_index(scenario_dir):
    """Every travel quest, keyed by card code, with the file it lives in."""
    index = {}
    for name in sorted(os.listdir(scenario_dir)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(scenario_dir, name)
        card = read_json(path)
        code = card.get("cardCode") or card["id"].removeprefix("card_")
        for choice in card.get("choices") or []:
            quest = choice.get("quest")
            if not quest:
                continue
            index.setdefault(code, []).append((path, card, quest))
    return index


def normalise(text):
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def apply_quests(entries, problems):
    """Coordinates onto the quest they belong to, matched on card and wording."""
    index = quest_index(SCENES)
    touched = {}
    placed = []
    skipped = []

    for entry in entries:
        if entry["kind"] != "UKOL":
            continue
        code = entry["key"]
        candidates = index.get(code)
        if not candidates:
            problems.append(f"{code}: karta žádný úkol nemá — „{entry['label']}“")
            continue

        # the label is "B10 · Dojděte k tisícileté lípě"; the wording after the
        # separator is what tells two tasks on one card apart
        wanted = normalise(entry["label"].split("·", 1)[-1])
        match = None
        for path, card, quest in candidates:
            if normalise(quest.get("text")) == wanted:
                match = (path, card, quest)
                break
        if match is None and len(candidates) == 1:
            # one task on the card and the wording drifted: still unambiguous
            match = candidates[0]
        if match is None:
            problems.append(f"{code}: nepoznávám úkol „{entry['label']}“ "
                            f"(karta jich má {len(candidates)})")
            continue

        path, card, quest = match
        if entry["skip"]:
            quest["needsPlace"] = False
            skipped.append(f"{code} · {quest.get('text')}")
        else:
            if not sane(entry, problems):
                continue
            quest["at"] = {
                "lat": entry["lat"],
                "lon": entry["lon"],
                "radius": entry["radius"] or 25,
                "name": quest.get("text"),
            }
            placed.append(f"{code} · {quest.get('text')}")
        touched[path] = card

    return touched, placed, skipped


def apply_events(entries, problems):
    """
    A place that springs an encounter when the group walks past it.

    Different from a task: nobody is sent there, it is on the way. The cards
    print it as "⏳ Událost: Dojdete k odbočce na Želejov ➤ ⏳", and until now it
    was a sentence and nothing else. Storing the coordinates keeps them from
    being lost while the mechanic is built.
    """
    touched = {}
    placed = []
    for entry in entries:
        if entry["kind"] != "UDALOST" or not sane(entry, problems):
            continue
        code = entry["key"]
        path = os.path.join(SCENES, f"card_{code}.json")
        if not os.path.exists(path):
            problems.append(f"UDALOST {code}: karta neexistuje")
            continue
        card = touched.get(path) or read_json(path)
        where = entry["label"].split("·", 1)[-1].strip()
        events = [e for e in card.get("events", []) if e.get("text") != where]
        events.append({
            "kind": "encounter",
            "deck": "N",
            "text": where,
            "at": {
                "lat": entry["lat"],
                "lon": entry["lon"],
                "radius": entry["radius"] or 30,
                "name": where,
            },
            "note": "Vyhodnotí se, až tudy skupina půjde. Mechanika zatím není "
                    "hotová — souřadnice jsou uložené, aby se neztratily.",
        })
        card["events"] = events
        touched[path] = card
        placed.append(f"{code} · {where}")
    return touched, placed


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("answers")
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    if not os.path.isdir(GAME):
        print(f"chyba: {GAME} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2

    entries = parse(open(args.answers, encoding="utf-8").read())
    problems = []
    zones, added = apply_zones(entries, problems)
    touched, placed, skipped = apply_quests(entries, problems)
    event_files, events = apply_events(entries, problems)
    for path, card in event_files.items():
        touched.setdefault(path, card)

    print(f"zón: {len(added)} ({', '.join(added) or '—'})")
    print(f"úkolů se souřadnicemi: {len(placed)}")
    for line in placed:
        print("   " + line)
    print(f"úkolů bez potřeby souřadnic: {len(skipped)}")
    for line in skipped:
        print("   " + line)
    print(f"míst s událostí na cestě: {len(events)}")
    for line in events:
        print("   " + line)
    if problems:
        print("\nnezapsáno:", file=sys.stderr)
        for line in problems:
            print("  " + line, file=sys.stderr)

    if not args.write:
        print("\n(nic nezapsáno — přidej --write)")
        return 0

    write_json(ZONES, zones)
    for path, card in touched.items():
        write_json(path, card)
    print(f"\nzapsáno: {ZONES} + {len(touched)} karet")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
