#!/usr/bin/env python3
"""Render every card as one page the author can check against the printed deck.

    python3 tools/build_card_review.py

The first questionnaire asked about the places the data itself flagged. This one
asks about the rest: it prints all 166 cards exactly as the app holds them —
text, choices, where each choice leads, the reputation gates and what each one
costs — and lets the author mark a card as correct or type the wording it should
have had.

Marking is the point. Nobody retypes 166 cards, so a card starts unmarked, "Sedí"
is one tap, and the box for the corrected text only opens on "Opravit" and opens
prefilled with what the app currently shows. The export then carries only the
cards that were touched.
"""

import html
import json
import os
import re
import sys

GAME = os.path.join("games", "nebakov")
DEFAULT_OUT = os.path.join("dist", "kontrola-karet.html")
VERSION = "2"

DECK_NAMES = {
    "A": "A — seznámení s pravidly",
    "B": "B — Troskovice, pomník, bylinkář",
    "C": "C — lípa, mlýn, spálený Nebákov",
    "D": "D — hospoda a stráže",
    "E": "E — hostinec",
    "F": "F — cesta do Tachova",
    "G": "G — Jarek, ovce a vodopád",
    "H": "H — zpět do Troskovic, závěry",
    "N": "N — náhodná setkání",
    "P": "P — pravidla",
}
ICONS = {
    "stopy": "👣", "lupa": "🔍", "koruna": "👑", "mozek": "🧠", "nuz": "🔪",
    "priroda": "🌿", "svitek": "📜", "batoh": "🎒", "hodiny": "⏳",
    "lebka": "💀", "bublina": "💬", "role": "👤",
}


def read(name):
    with open(os.path.join(GAME, name), encoding="utf-8") as fh:
        return json.load(fh)


def paragraphs(text):
    """`text` is a string on some cards and a list on others; <br> is real markup."""
    items = [text] if isinstance(text, str) else list(text or [])
    out = []
    for item in items:
        parts = [html.escape(p) for p in str(item).split("<br>")]
        out.append("<br>".join(parts))
    return out


def describe_effects(effects):
    """What the effect list does, in the words the cards use."""
    out = []
    for effect in effects or []:
        kind = effect.get("type")
        if kind == "reputation":
            value = effect["value"]
            faces = ("😊" if value > 0 else "😡") * min(abs(value), 3)
            out.append(f"reputace {value:+d} {faces}")
        elif kind == "encounter":
            out.append("náhodné setkání ⏳")
        elif kind == "item":
            out.append(f"do inventáře: {effect.get('name') or effect.get('item')}")
        elif kind == "hold_card":
            out.append(f"osobní karta: {effect.get('card')}")
        elif kind == "toast":
            continue
        else:
            out.append(kind)
        if effect.get("when"):
            out[-1] += " — jen když " + " a ".join(describe_condition(c) for c in effect["when"])
    return out


def describe_condition(condition):
    kind = condition.get("type")
    if kind == "reputation":
        return f"reputace {condition['operator']} {condition['value']}"
    if kind == "visited":
        target = condition["scene"].removeprefix("card_")
        return f"{'ještě nebyla' if condition.get('negate') else 'už byla'} karta {target}"
    if kind == "has_item":
        return f"{'nemáte' if condition.get('negate') else 'máte'} {condition['item']}"
    if kind == "quest_done":
        return f"splněný úkol {condition['quest']}"
    if kind == "gps_zone":
        return f"jste v zóně {condition['zone']}"
    return kind


def describe_gate(disable_if):
    """`disableIf` locks a choice when it matches, so it is stated as what opens it."""
    parts = []
    for condition in disable_if or []:
        if condition.get("type") == "reputation":
            op, value = condition["operator"], condition["value"]
            opens = {"<": f"≥ {value}", "<=": f"> {value}", ">": f"≤ {value}",
                     ">=": f"< {value}", "==": f"≠ {value}", "!=": f"= {value}"}
            parts.append(f"otevřeno při reputaci {opens.get(op, op + str(value))}")
        elif condition.get("type") == "visited":
            target = condition["scene"].removeprefix("card_")
            parts.append(f"zamčeno, jakmile {'ne' if not condition.get('negate') else ''}"
                         f"padne karta {target}")
        else:
            parts.append("otevřeno když " + describe_condition(condition))
    return parts


def card_code(card):
    return card.get("cardCode") or card["id"].removeprefix("card_")


def deck_of(card):
    code = card_code(card)
    return code[0] if re.match(r"^[A-Z]\d", code) else "—"


def render_card(card, kind, fields):
    code = card_code(card)
    field_id = code if re.match(r"^[A-Z]?\d*$", code) or True else card["id"]
    fields.append({"id": field_id, "label": f"karta {code}"})

    body = [f'<article class="card" id="karta-{html.escape(field_id)}" '
            f'data-card="{html.escape(field_id)}">']
    body.append(
        f'<div class="chead"><span class="code">{html.escape(code)}</span>'
        f'<span class="cid">{html.escape(card["id"])}</span>')
    if card.get("ending"):
        body.append('<span class="flag">konec hry</span>')
    if kind == "encounter":
        body.append('<span class="flag">balíček N</span>')
    body.append("</div>")

    for para in paragraphs(card.get("text")):
        body.append(f"<p>{para}</p>")

    if card.get("answer"):
        answer = card["answer"]
        printed = f" (tištěno na {answer['printedOn']})" if answer.get("printedOn") else ""
        body.append(f'<p class="answer">Řešení: <strong>'
                    f'{html.escape(answer["text"])}</strong>{html.escape(printed)}</p>')

    progress = card.get("progress")
    if progress:
        bits = [progress.get("text", "")]
        if progress.get("card"):
            bits.append(f"karta {progress['card'].removeprefix('card_')}")
        for outcome in progress.get("outcomes", []):
            bits.append(outcome.get("label", outcome.get("id", "")))
        body.append('<p class="fx">Podmínka postupu (karta nepustí dál): '
                    + html.escape(" · ".join(b for b in bits if b)) + "</p>")

    scene_effects = describe_effects(card.get("effects"))
    if scene_effects:
        body.append('<p class="fx">Karta sama o sobě: ' + html.escape(", ".join(scene_effects)) + "</p>")

    choices = card.get("choices") or []
    if choices:
        body.append('<ul class="choices">')
        for choice in choices:
            icon = ICONS.get(choice.get("icon"), "•")
            target = (choice.get("goto") or "").removeprefix("card_") or "—"
            line = (f'<li><span class="ico">{icon}</span>'
                    f'<span class="ctext">{html.escape(choice.get("text", ""))}</span>'
                    f'<span class="goto">→ {html.escape(target)}</span>')
            notes = describe_gate(choice.get("disableIf")) + describe_effects(choice.get("effects"))
            if choice.get("quest"):
                notes.insert(0, "úkol — karta se odkryje až po potvrzení")
            if notes:
                line += f'<span class="note">{html.escape(" · ".join(notes))}</span>'
            body.append(line + "</li>")
        body.append("</ul>")
    elif not card.get("ending"):
        body.append('<p class="fx">Karta nemá žádné pokračování.</p>')

    if card.get("todo"):
        body.append(f'<p class="todo">Moje poznámka: {html.escape(card["todo"])}</p>')

    body.append(
        f'<div class="mark" data-for="{html.escape(field_id)}">'
        f'<button type="button" class="ok" data-mark="ok">Sedí</button>'
        f'<button type="button" class="bad" data-mark="fix">Opravit</button>'
        f'<span class="state"></span></div>'
        f'<textarea class="fix" id="fix-{html.escape(field_id)}" rows="4" hidden '
        f'placeholder="Napište správné znění karty…"></textarea>')
    body.append("</article>")
    return "".join(body)


PAGE = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kontrola karet — Tajemství Nebákova</title>
<style>
:root {
  color-scheme: light dark;
  --bg:#f6f3ec; --card:#fffdf8; --ink:#221c14; --muted:#6d6252; --line:#ddd4c2;
  --accent:#7a2e22; --ok:#2f6b3a; --bad:#b3261e; --fill:#fff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#12100c; --card:#1b1813; --ink:#ece5d8; --muted:#a4998a; --line:#332e26;
    --accent:#e0a08d; --ok:#7bbf8a; --bad:#f2857c; --fill:#100e0a;
  }
}
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink);
  font:16px/1.55 "Iowan Old Style","Palatino Linotype",Georgia,serif; }
.wrap { max-width:48rem; margin:0 auto; padding:1.4rem 1rem 6rem; }
h1 { font-size:1.6rem; margin:0 0 .3rem; }
.sub { color:var(--muted); font-size:.9rem; margin:0 0 1.4rem; }
.intro { background:var(--card); border:1px solid var(--line); border-radius:12px;
  padding:1rem 1.1rem; margin:0 0 1.4rem; }
.intro p:first-child { margin-top:0; } .intro p:last-child { margin-bottom:0; }
h2 { font-size:1.05rem; margin:2.2rem 0 .7rem; padding-bottom:.3rem;
  border-bottom:2px solid var(--accent); color:var(--accent); }
.card { background:var(--card); border:1px solid var(--line); border-left:4px solid var(--line);
  border-radius:10px; padding:.85rem 1rem; margin:0 0 .8rem; }
.card.ok { border-left-color:var(--ok); }
.card.fix { border-left-color:var(--bad); }
.chead { display:flex; gap:.5rem; align-items:baseline; margin-bottom:.4rem; flex-wrap:wrap; }
.code { font:700 .8rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--accent); color:#fff; border-radius:5px; padding:.1rem .45rem; }
.cid { font:.75rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--muted); }
.flag { font-size:.7rem; text-transform:uppercase; letter-spacing:.04em;
  border:1px solid var(--line); border-radius:99px; padding:.05rem .5rem; color:var(--muted); }
.card p { margin:.45rem 0; }
.answer { color:var(--ok); font-size:.92rem; }
.fx { color:var(--muted); font-size:.85rem; font-style:italic; }
.todo { font-size:.85rem; color:var(--bad); }
.choices { list-style:none; margin:.6rem 0 0; padding:0;
  border-top:1px dashed var(--line); }
.choices li { display:grid; grid-template-columns:1.4rem 1fr auto; gap:.15rem .4rem;
  padding:.4rem 0; border-bottom:1px dashed var(--line); font-size:.93rem; align-items:baseline; }
.ico { grid-row:1; }
.ctext { grid-row:1; }
.goto { grid-row:1; font:.8rem ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--accent); }
.note { grid-column:2/4; font-size:.8rem; color:var(--muted); }
.mark { display:flex; gap:.4rem; align-items:center; margin-top:.7rem; }
button { font:inherit; font-size:.85rem; cursor:pointer; border-radius:7px;
  border:1px solid var(--line); background:var(--card); color:var(--ink); padding:.25rem .7rem; }
button:hover { border-color:var(--accent); }
.card.ok .ok { background:var(--ok); border-color:var(--ok); color:#fff; }
.card.fix .bad { background:var(--bad); border-color:var(--bad); color:#fff; }
.state { font-size:.8rem; color:var(--muted); }
textarea { width:100%; margin-top:.5rem; font:inherit; font-size:.92rem; color:var(--ink);
  background:var(--fill); border:1px solid var(--line); border-radius:8px;
  padding:.5rem .6rem; resize:vertical; }
textarea:focus { outline:2px solid var(--accent); outline-offset:1px; }
.bar { position:sticky; bottom:0; z-index:5; margin:0 -1rem;
  background:color-mix(in srgb,var(--card) 92%,transparent); backdrop-filter:blur(8px);
  border-top:1px solid var(--line); padding:.55rem 1rem; display:flex; flex-wrap:wrap;
  gap:.45rem; align-items:center; }
.bar .count { font-size:.83rem; color:var(--muted); margin-right:auto; }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
.toast { position:fixed; left:50%; transform:translateX(-50%); bottom:4.5rem;
  background:var(--ink); color:var(--bg); padding:.5rem .9rem; border-radius:8px;
  font-size:.87rem; opacity:0; pointer-events:none; transition:opacity .18s; z-index:10; }
.toast.on { opacity:1; }
body.only-open .card.ok { display:none; }
@media print { .bar,.toast,.mark { display:none; } body { background:#fff; } }
</style>
</head>
<body>
<div class="wrap">
<h1>Kontrola karet</h1>
<p class="sub">Tajemství Nebákova · dotazník __VERSION__ · __COUNT__ karet</p>

<div class="intro">
<p><strong>Co to je.</strong> Všech __COUNT__ karet tak, jak je má aplikace — text,
volby, kam která vede, podmínky na reputaci a co která stojí. Porovnejte to prosím
s tištěnými kartami.</p>
<p><strong>Jak to vyplnit.</strong> U každé karty jsou dvě tlačítka.
<em>Sedí</em> = souhlasí, jdu dál. <em>Opravit</em> = otevře se okno s tím, co tam mám
teď, a vy to přepíšete na správné znění. Karty, kterých se nedotknete, se berou jako
neprojité — nic se tím nerozbije.</p>
<p><strong>Nemusíte to stihnout naráz.</strong> Vše se průběžně ukládá do tohoto
prohlížeče. Dole je přepínač <em>Skrýt hotové</em>, takže se vždycky vrátíte tam, kde
jste skončili.</p>
<p><strong>Až budete hotoví</strong> (nebo budete chtít poslat, co máte), klepněte na
<em>Zkopírovat odpovědi</em> nebo <em>Stáhnout odpovědi</em>. Posílají se jen karty,
které jste označili.</p>
<p class="sub" style="margin:.7rem 0 0">Červená poznámka u karty znamená, že si tím
sám nejsem jistý — tam se hodí kouknout nejdřív.</p>
</div>

__BODY__

<div class="bar">
  <span class="count" id="count"></span>
  <button id="toggle">Skrýt hotové</button>
  <button id="copy" class="primary">Zkopírovat odpovědi</button>
  <button id="download">Stáhnout odpovědi</button>
  <button id="clear">Vymazat vše</button>
</div>
</div>
<div class="toast" id="toast"></div>

<script>
const CARDS = __FIELDS__;
const CURRENT = __CURRENT__;
const KEY = "nebakov-kontrola-v__VERSION__";
let marks = {};

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 2000);
}

function save() {
  const data = {};
  for (const [id, mark] of Object.entries(marks)) {
    const box = document.getElementById("fix-" + id);
    data[id] = { mark, text: mark === "fix" ? (box?.value ?? "") : "" };
  }
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* blocked */ }
}

function paint(id) {
  const article = document.querySelector('[data-card="' + CSS.escape(id) + '"]');
  const box = document.getElementById("fix-" + id);
  const mark = marks[id];
  article.classList.toggle("ok", mark === "ok");
  article.classList.toggle("fix", mark === "fix");
  box.hidden = mark !== "fix";
  article.querySelector(".state").textContent =
    mark === "ok" ? "označeno jako správné" : mark === "fix" ? "čeká na opravu" : "";
}

function refresh() {
  const done = Object.values(marks).filter((m) => m === "ok").length;
  const fixes = Object.values(marks).filter((m) => m === "fix").length;
  document.getElementById("count").textContent =
    "Zkontrolováno " + (done + fixes) + " z " + CARDS.length + " karet"
    + (fixes ? " · " + fixes + " k opravě" : "");
}

document.querySelectorAll(".mark button").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.parentElement.dataset.for;
    const wanted = button.dataset.mark;
    marks[id] = marks[id] === wanted ? undefined : wanted;
    if (!marks[id]) delete marks[id];
    const box = document.getElementById("fix-" + id);
    // opening the box prefilled means correcting is editing, not retyping
    if (marks[id] === "fix" && !box.value) box.value = CURRENT[id] ?? "";
    paint(id);
    save();
    refresh();
    if (marks[id] === "fix") box.focus();
  });
});

document.querySelectorAll("textarea.fix").forEach((box) => {
  box.addEventListener("input", save);
});

function asText() {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    "Kontrola karet — Tajemství Nebákova",
    "dotazník __VERSION__ · vyplněno: " + stamp,
    "",
  ];
  const fixes = [];
  const fine = [];
  for (const card of CARDS) {
    const mark = marks[card.id];
    if (mark === "ok") fine.push(card.id);
    if (mark !== "fix") continue;
    const box = document.getElementById("fix-" + card.id);
    fixes.push("[" + card.id + "] " + card.label);
    fixes.push((box?.value ?? "").trim() || "(bez textu)");
    fixes.push("");
  }
  lines.push("SPRÁVNĚ (" + fine.length + "): " + (fine.join(", ") || "—"));
  lines.push("");
  lines.push("K OPRAVĚ (" + (fixes.length ? fixes.length / 3 : 0) + "):");
  lines.push("");
  lines.push(...(fixes.length ? fixes : ["—"]));
  return lines.join("\\n");
}

document.getElementById("copy").addEventListener("click", async () => {
  const text = asText();
  try {
    await navigator.clipboard.writeText(text);
    toast("Zkopírováno do schránky");
  } catch (err) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.("copy");
    area.remove();
    toast(ok ? "Zkopírováno do schránky" : "Kopírování nešlo — použijte Stáhnout");
  }
});

document.getElementById("download").addEventListener("click", () => {
  const blob = new Blob([asText()], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "kontrola-karet-nebakov.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Soubor uložen");
});

document.getElementById("toggle").addEventListener("click", (event) => {
  const hidden = document.body.classList.toggle("only-open");
  event.target.textContent = hidden ? "Zobrazit vše" : "Skrýt hotové";
});

document.getElementById("clear").addEventListener("click", () => {
  if (!confirm("Vymazat všechny značky i opravy?")) return;
  marks = {};
  document.querySelectorAll("textarea.fix").forEach((b) => { b.value = ""; });
  CARDS.forEach((c) => paint(c.id));
  try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  refresh();
  toast("Vymazáno");
});

try {
  const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
  for (const [id, entry] of Object.entries(stored)) {
    if (!document.getElementById("fix-" + id)) continue;
    marks[id] = entry.mark;
    if (entry.text) document.getElementById("fix-" + id).value = entry.text;
  }
} catch (err) { marks = {}; }
CARDS.forEach((c) => paint(c.id));
refresh();
</script>
</body>
</html>
"""


def build(out_path):
    scenario = read("scenario.json")
    events = read("events.json")

    scenes = sorted(scenario["scenes"], key=lambda c: (deck_of(c), card_code(c)))
    encounters = sorted(events["cards"], key=lambda c: card_code(c))

    fields, current = [], {}
    grouped = {}
    for card in scenes:
        grouped.setdefault(deck_of(card), []).append((card, "scene"))
    grouped["N"] = [(card, "encounter") for card in encounters]

    body = []
    for deck in sorted(grouped, key=lambda d: (d == "—", d)):
        body.append(f"<h2>{html.escape(DECK_NAMES.get(deck, 'Ostatní karty'))}</h2>")
        for card, kind in grouped[deck]:
            body.append(render_card(card, kind, fields))
            code = card_code(card)
            items = [card["text"]] if isinstance(card.get("text"), str) else (card.get("text") or [])
            current[code] = "\n".join(str(i).replace("<br>", "\n") for i in items)

    duplicates = [f["id"] for f in fields if [g["id"] for g in fields].count(f["id"]) > 1]
    if duplicates:
        print(f"chyba: dvě karty se stejným kódem: {sorted(set(duplicates))}", file=sys.stderr)
        return 1

    page = (PAGE
            .replace("__BODY__", "\n".join(body))
            .replace("__FIELDS__", json.dumps(fields, ensure_ascii=False))
            .replace("__CURRENT__", json.dumps(current, ensure_ascii=False))
            .replace("__COUNT__", str(len(fields)))
            .replace("__VERSION__", VERSION))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(page)

    print(f"{out_path}: {round(len(page.encode()) / 1024)} KB")
    print(f"  karet: {len(fields)} | balíčků: {len(grouped)}"
          f" | s poznámkou todo: {sum(1 for c, _ in sum(grouped.values(), []) if c.get('todo'))}")
    return 0


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    if not os.path.isdir(GAME):
        print(f"chyba: {GAME} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2
    return build(out)


if __name__ == "__main__":
    raise SystemExit(main())
