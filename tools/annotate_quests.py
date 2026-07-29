#!/usr/bin/env python3
"""Turn the task wording on choices into explicit quest data.

46 choices are phrased as tasks — "Úkol: Dojděte k tisícileté lípě" — and the
engine needs them as data rather than as a string it sniffs at runtime. The task
is started by taking the choice and finished by arriving at the card the choice
leads to, so a quest needs no new links: it is derived from what is already
there.

The kind comes from the icon the card prints, which is the same classification
the rules sheet uses:

    priroda  🌿  nature   — the Milovník přírody may complete one per game
    stopy    👣  travel   — walk somewhere
    koruna   👑  deed     — an act of courage or generosity
    lupa     🔍  inspect  — look at something

Writes to the per-card files; run `tools/cards.py build` afterwards. Idempotent,
so running it twice changes nothing.

    python3 tools/annotate_quests.py --dry-run
    python3 tools/annotate_quests.py
"""

import argparse
import json
import os
import re
import sys

CARDS_DIR = os.path.join("games", "nebakov", "cards", "scenes")

KIND_BY_ICON = {
    "priroda": "nature",
    "stopy": "travel",
    "koruna": "deed",
    "lupa": "inspect",
    "mozek": "inspect",
    "bublina": "talk",
    "nuz": "deed",
}

TASK_RE = re.compile(r"^Úkol\b")
OPTIONAL_RE = re.compile(r"^Úkol\s*\(volitelný\)")


def quest_id(scene_id, index):
    return "q_" + scene_id.replace("card_", "").replace("scene_", "") + f"_{index}"


def task_label(text):
    """The task itself, without the 'Úkol:' prefix."""
    stripped = re.sub(r"^Úkol\s*(\(volitelný\))?\s*:\s*", "", text).strip()
    return stripped or text


def annotate_card(card):
    """Returns (changed, [descriptions]) for one card."""
    changed, notes = False, []
    for index, choice in enumerate(card.get("choices") or []):
        text = choice.get("text") or ""
        if not TASK_RE.match(text):
            # a quest annotation that no longer matches the wording is stale
            if "quest" in choice:
                del choice["quest"]
                changed = True
                notes.append(f"#{index} odebrána zastaralá anotace")
            continue
        if not choice.get("goto"):
            notes.append(f"#{index} úkol bez cíle, přeskočeno")
            continue

        quest = {
            "id": quest_id(card["id"], index),
            "kind": KIND_BY_ICON.get(choice.get("icon"), "travel"),
            "text": task_label(text),
            "completedAt": choice["goto"],
        }
        if OPTIONAL_RE.match(text):
            quest["optional"] = True

        if choice.get("quest") != quest:
            choice["quest"] = quest
            changed = True
            notes.append(f"#{index} {quest['kind']}: {quest['text'][:48]}")
    return changed, notes


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="nic nezapisovat")
    args = ap.parse_args()

    if not os.path.isdir(CARDS_DIR):
        print(f"chyba: {CARDS_DIR} neexistuje (spusť z korene repozitáře; "
              "případně nejdřív tools/cards.py split)", file=sys.stderr)
        return 2

    touched = 0
    total_quests = 0
    kinds = {}
    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(CARDS_DIR, name)
        with open(path, encoding="utf-8") as fh:
            card = json.load(fh)

        changed, notes = annotate_card(card)
        for choice in card.get("choices") or []:
            quest = choice.get("quest")
            if quest:
                total_quests += 1
                kinds[quest["kind"]] = kinds.get(quest["kind"], 0) + 1

        if changed:
            touched += 1
            print(f"{card['id']}")
            for note in notes:
                print(f"  {note}")
            if not args.dry_run:
                with open(path, "w", encoding="utf-8") as fh:
                    json.dump(card, fh, ensure_ascii=False, indent=2)
                    fh.write("\n")

    print(f"\núkolů celkem: {total_quests}"
          + (f" | změněno karet: {touched}" if touched else " | bez změn"))
    for kind, count in sorted(kinds.items()):
        print(f"  {kind}: {count}")
    if args.dry_run:
        print("(dry-run, nic nezapsáno)")
    elif touched:
        print("\nnyní spusť: python3 tools/cards.py build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
