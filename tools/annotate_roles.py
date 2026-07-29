#!/usr/bin/env python3
"""Turn the trigger written in a role's text into explicit data.

Every advantage and disadvantage states when it applies in a bracket at the
front of its text, and the engine needs that as a field rather than a prefix it
parses at runtime:

    [začátek]   start        applied once when the game begins
    [1/hru]     once         the players spend it when they choose to
    [vždy]      always       stands the whole game; the roleplay ones are
                             reminders the engine cannot enforce
    [následek]  consequence  fires right after the role's once-ability is used

The last one is a linked pair: the Vzdělaný pedant may take a decision back
("[1/hru] Můžete vzít zpět jednou rozhodnutí") and pays for it with
"[následek] Ihned poté nastane náhodné setkání."

Idempotent — running it twice changes nothing.

    python3 tools/annotate_roles.py --dry-run
    python3 tools/annotate_roles.py games/nebakov/roles.json
"""

import argparse
import json
import os
import re
import sys

DEFAULT_FILES = [
    os.path.join("games", "nebakov", "roles.json"),
    os.path.join("games", "ukazka", "roles.json"),
]

TRIGGERS = [
    ("start", ("[začátek]", "[zacatek]")),
    ("once", ("[1/hru]", "[1/hru ]")),
    ("consequence", ("[následek]", "[nasledek]")),
    ("always", ("[vždy]", "[vdžy]", "[vzdy]")),
]

BRACKET_RE = re.compile(r"^\s*\[([^\]]{1,20})\]")


def trigger_for(text):
    lowered = (text or "").strip().lower()
    for name, prefixes in TRIGGERS:
        if any(lowered.startswith(p.lower()) for p in prefixes):
            return name
    return None


def annotate(path, dry_run):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    changed = False
    counts = {}
    unknown = []

    for role in data.get("roles", []):
        for key in ("advantages", "disadvantages"):
            for entry in role.get(key, []):
                text = entry.get("text", "")
                trigger = trigger_for(text)
                if trigger is None:
                    bracket = BRACKET_RE.match(text)
                    unknown.append(
                        f"{role.get('id')}/{key}: "
                        + (f"neznámý spouštěč [{bracket.group(1)}]" if bracket
                           else "text bez spouštěče v hranatých závorkách")
                    )
                    continue
                counts[trigger] = counts.get(trigger, 0) + 1
                if entry.get("trigger") != trigger:
                    entry["trigger"] = trigger
                    changed = True

    if changed and not dry_run:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

    return changed, counts, unknown


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", default=None,
                    help="soubory rolí (default: nebakov + ukazka)")
    ap.add_argument("--dry-run", action="store_true", help="nic nezapisovat")
    args = ap.parse_args()

    files = args.files or [p for p in DEFAULT_FILES if os.path.exists(p)]
    if not files:
        print("chyba: žádný soubor rolí nenalezen (spusť z korene repozitáře)",
              file=sys.stderr)
        return 2

    problems = 0
    for path in files:
        if not os.path.exists(path):
            print(f"chyba: {path} neexistuje", file=sys.stderr)
            return 2
        changed, counts, unknown = annotate(path, args.dry_run)
        summary = ", ".join(f"{k}={v}" for k, v in sorted(counts.items())) or "nic"
        print(f"{path}: {'změněno' if changed else 'bez změn'} | {summary}")
        for problem in unknown:
            print(f"  varování: {problem}")
            problems += 1

    if args.dry_run:
        print("(dry-run, nic nezapsáno)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
