#!/usr/bin/env python3
"""Write the browser's text rewrites into the per-card files.

The author plays the hosted game with edit mode on, rewrites the wording that
reads badly, and exports a JSON (see src/platform/overrides.js). This applies that
JSON to games/<scenario>/cards/**, which is the source the bundles are built from:

    python3 tools/apply_overrides.py upravy.json
    python3 tools/apply_overrides.py upravy.json --dry-run
    python3 tools/cards.py build && python3 tools/cards.py check

Every rewrite carries the text it was written against (`base`). If that no longer
matches what the file says, the text changed after the rewrite was made and
applying it would silently undo whatever changed it — so nothing at all is
written and the mismatches are listed. All or nothing on purpose: a half-applied
export leaves nobody able to say which half.

Only two shapes of path are accepted, `text` and `choices[N].text`. A rewrite is
allowed to change wording and nothing else; `goto`, `disableIf`, `effects` and the
rest of a quest are not reachable from here even with a hand-edited file.
"""

import argparse
import json
import os
import re
import sys

EXPECTED_FORMAT = "rwag-overrides/1"
CHOICE_PATH = re.compile(r"^choices\[(\d+)\]\.text$")
INDENT = 2


def read_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=INDENT)
        fh.write("\n")


def paragraphs(text):
    """Normalised form for comparison: a list of non-empty paragraphs."""
    if text is None:
        return []
    parts = text if isinstance(text, list) else [text]
    out = []
    for part in parts:
        if not isinstance(part, str):
            continue
        for chunk in re.split(r"\n{2,}", part):
            chunk = chunk.strip()
            if chunk:
                out.append(chunk)
    return out


def same_text(a, b):
    return paragraphs(a) == paragraphs(b)


def shaped(original, value):
    """Keep the field's existing shape, so a string does not become a list."""
    if isinstance(original, list):
        return value if isinstance(value, list) else [value]
    if isinstance(value, list):
        return value[0] if len(value) == 1 else value
    return value


def card_path(root, scenario_id, card_id):
    cards_dir = os.path.join(root, "games", scenario_id, "cards")
    for folder in ("scenes", "encounters"):
        candidate = os.path.join(cards_dir, folder, f"{card_id}.json")
        if os.path.exists(candidate):
            return candidate
    return None


def plan_entry(card, entry, card_id, path_label):
    """Locate the field an entry points at and check its base. Returns (setter, problem)."""
    path = entry.get("path")

    if path == "text":
        current = card.get("text")
        if not same_text(current, entry.get("base")):
            return None, f"{card_id} / text: v datech je jiný text, než ze kterého úprava vycházela"

        def apply_text():
            card["text"] = shaped(current, entry["value"])

        return apply_text, None

    match = CHOICE_PATH.match(path or "")
    if not match:
        return None, f"{card_id} / {path!r}: nepodporovaná cesta (povoleno jen text a choices[N].text)"

    index = int(match.group(1))
    choices = card.get("choices") or []
    if index >= len(choices):
        return None, f"{card_id} / {path}: volba {index} v kartě není"

    choice = choices[index]
    if not same_text(choice.get("text"), entry.get("base")):
        return None, f"{card_id} / {path}: v datech je jiný text, než ze kterého úprava vycházela"

    quest_text = entry.get("questText")

    def apply_choice():
        choice["text"] = entry["value"] if isinstance(entry["value"], str) else " ".join(entry["value"])
        # The quest text was derived from this label, so it travels with it; the
        # browser computed the new value, this only writes it.
        if quest_text and isinstance(choice.get("quest"), dict):
            choice["quest"]["text"] = quest_text

    return apply_choice, None


def print_notes(notes):
    """
    Field notes ride in the same export as the rewrites, and nothing here writes
    them anywhere: they are somebody's sentences about the walk, addressed to a
    person. Printing them is the whole job — a note that scrolled past unread is
    the same as a note nobody wrote.
    """
    if not notes:
        return
    print(f"POZNÁMKY Z PRŮCHODU ({len(notes)}) — nezapisují se, jsou k přečtení:")
    for note in notes:
        where = ""
        if note.get("lat") is not None and note.get("lon") is not None:
            where = f"  @ {note['lat']:.5f},{note['lon']:.5f}"
        stamp = str(note.get("at") or "")[11:16] or "--:--"
        print(f"  [{note.get('cardCode') or '—'}] {stamp}{where}")
        for line in str(note.get("text") or "").splitlines():
            print(f"      {line}")
    print()


def apply_export(export, root, dry_run=False):
    if export.get("format") != EXPECTED_FORMAT:
        print(f"neznámý formát: {export.get('format')!r} (čekán {EXPECTED_FORMAT!r})", file=sys.stderr)
        return 2

    scenario_id = export.get("scenarioId")
    if not scenario_id:
        print("export neuvádí scenarioId", file=sys.stderr)
        return 2

    print_notes(export.get("notes") or [])

    cards = export.get("cards") or {}
    if not cards:
        print("export neobsahuje žádné úpravy k zapsání")
        return 0

    problems = []
    plans = []  # (path, card, [setters], count)

    for card_id, fields in sorted(cards.items()):
        path = card_path(root, scenario_id, card_id)
        if not path:
            problems.append(f"{card_id}: soubor karty ve games/{scenario_id}/cards/ neexistuje")
            continue

        card = read_json(path)
        setters = []
        described = []

        entries = []
        if isinstance(fields.get("text"), dict):
            entries.append(fields["text"])
        for entry in fields.get("choices") or []:
            entries.append(entry)

        for entry in entries:
            setter, problem = plan_entry(card, entry, card_id, entry.get("path"))
            if problem:
                problems.append(problem)
                continue
            setters.append(setter)
            described.append(entry.get("path"))

        if setters:
            plans.append((path, card, setters, described))

    stale = export.get("stale") or []
    if stale:
        print(f"pozor: {len(stale)} úprav je v exportu označeno jako „původní text se změnil“ "
              "a nejsou určeny k zápisu:", file=sys.stderr)
        for entry in stale:
            print(f"  {entry.get('cardId')} / {entry.get('path')}", file=sys.stderr)

    if problems:
        print("nezapisuji nic, protože tyto úpravy nelze bezpečně použít:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        print("\nText se od úpravy změnil. Porovnejte obě verze a upravte export, "
              "nebo úpravu zahoďte.", file=sys.stderr)
        return 1

    written = 0
    for path, card, setters, described in plans:
        for setter in setters:
            setter()
        if not dry_run:
            write_json(path, card)
        written += len(setters)
        print(f"{'(nanečisto) ' if dry_run else ''}{path}: {', '.join(described)}")

    print(f"\n{'zapsalo by se' if dry_run else 'zapsáno'}: {written} úprav "
          f"v {len(plans)} kartách")
    if not dry_run:
        print("dál spusťte: python3 tools/cards.py build && python3 tools/cards.py check")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("export", help="JSON vyexportovaný z režimu úprav")
    parser.add_argument("--root", default=".", help="kořen repozitáře (výchozí: .)")
    parser.add_argument("--dry-run", action="store_true", help="jen vypsat, nic nezapisovat")
    args = parser.parse_args()

    return apply_export(read_json(args.export), args.root, dry_run=args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
