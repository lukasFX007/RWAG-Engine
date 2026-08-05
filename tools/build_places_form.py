#!/usr/bin/env python3
"""Render the missing coordinates as one page that can be filled in and exported.

    python3 tools/build_places_form.py

`docs/mista-k-doplneni.md` says what is missing; this is the same list as a form.
Generated from `zones.json` and the cards, so what is already known shows as
done and cannot drift from the data.

Three things earn their keep here beyond a table of blanks:

*   **"Jsem tady"** reads the device position. The person filling this in can walk
    to the pub and tap it, which beats copying numbers off a map — and is the only
    version that is right by construction. It needs https, so it works from the
    hosted page and not from a file:// copy; the typed field is always there.
*   **A live check** on every value: what was parsed, and how far it is from the
    middle of the game area. A transposed pair or a slipped decimal lands
    hundreds of kilometres away and says so immediately, which no amount of
    proof-reading catches reliably.
*   **"Nepotřebuje"**, because a third of the travel tasks are "go back where you
    came from" and have no place to check. Without it a blank row is ambiguous
    between "not done yet" and "makes no sense".
"""

import html
import json
import os
import re
import sys

GAME = os.path.join("games", "nebakov")
DEFAULT_OUT = os.path.join("dist", "mista-k-doplneni.html")
VERSION = "1"

DECK_NAMES = {
    "A": "A — seznámení", "B": "B — Troskovice a pomník", "C": "C — lípa a Nebákov",
    "D": "D — Apolena a stráže", "E": "E — hostinec", "F": "F — cesta do Tachova",
    "G": "G — Jarek a vodopád", "H": "H — zpět do Troskovic",
}
ZONE_TITLES = {
    "pubs": "Hospody a místa s jídlem",
    "village": "Obce a osady",
}
ZONE_NOTES = {
    "pubs": "Nenasyta má v hospodě a jejím okolí +1 k reputaci. Rádius 60 m je "
            "můj odhad — „v hospodách a jejich okolí“ je víc než dveře a méně "
            "než vesnice.",
    "village": "Lenoch má mimo obce −1 k reputaci. Tady jde o střed a rádius; "
                  "obvod na mapě neodpovídá cedulím, takže to bude vždycky "
                  "kompromis. Dokud tu nic není, Lenochova nevýhoda se "
                  "nevyhodnocuje.",
}


def read(name):
    with open(os.path.join(GAME, name), encoding="utf-8") as fh:
        return json.load(fh)


def slug(text):
    out = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()
                 .replace("á", "a").replace("č", "c").replace("ď", "d")
                 .replace("é", "e").replace("ě", "e").replace("í", "i")
                 .replace("ň", "n").replace("ó", "o").replace("ř", "r")
                 .replace("š", "s").replace("ť", "t").replace("ú", "u")
                 .replace("ů", "u").replace("ý", "y").replace("ž", "z"))
    return out.strip("_") or "misto"


def anchor(zones):
    """Middle of what is already known, for the "how far is this" check."""
    placed = [z for z in zones if z.get("lat") and z.get("lon")]
    if not placed:
        # Troskovice, near enough for a sanity check on a typed value
        return {"lat": 50.51, "lon": 15.23}
    return {
        "lat": sum(z["lat"] for z in placed) / len(placed),
        "lon": sum(z["lon"] for z in placed) / len(placed),
    }


def row(field_id, name, note, fields, existing=None):
    fields.append({"id": field_id, "label": name})
    done = bool(existing)
    body = [f'<div class="row{" is-done" if done else ""}" data-row="{html.escape(field_id)}">']
    body.append(f'<div class="row-head"><span class="row-name">{html.escape(name)}</span>')
    if done:
        body.append('<span class="tick">už v datech</span>')
    body.append("</div>")
    if note:
        body.append(f'<p class="row-note">{html.escape(note)}</p>')

    if done:
        body.append(f'<p class="row-have">{existing["lat"]}, {existing["lon"]}'
                    f' · rádius {existing.get("radius", 25)} m</p>')
        body.append("</div>")
        return "".join(body)

    body.append(
        f'<div class="row-fields">'
        f'<input type="text" class="coord" id="{html.escape(field_id)}" '
        f'data-field="{html.escape(field_id)}" inputmode="decimal" autocomplete="off" '
        f'placeholder="50.5101141N, 15.2257150E">'
        f'<input type="text" class="radius" id="r-{html.escape(field_id)}" '
        f'data-radius="{html.escape(field_id)}" inputmode="numeric" autocomplete="off" '
        f'placeholder="rádius m">'
        f'<button type="button" class="here" data-here="{html.escape(field_id)}">Jsem tady</button>'
        f'</div>'
        f'<p class="check" data-check="{html.escape(field_id)}"></p>'
        f'<label class="skip"><input type="checkbox" data-skip="{html.escape(field_id)}"> '
        f'Nepotřebuje souřadnice</label>')
    body.append("</div>")
    return "".join(body)


PAGE = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Místa k doplnění — Tajemství Nebákova</title>
<style>
:root {
  color-scheme: light dark;
  --bg:#f6f3ec; --card:#fffdf8; --ink:#221c14; --muted:#6d6252; --line:#ddd4c2;
  --accent:#7a2e22; --ok:#2f6b3a; --bad:#b3261e; --warn:#b06a12; --fill:#fff;
}
@media (prefers-color-scheme: dark) {
  :root { --bg:#12100c; --card:#1b1813; --ink:#ece5d8; --muted:#a4998a; --line:#332e26;
    --accent:#e0a08d; --ok:#7bbf8a; --bad:#f2857c; --warn:#e0ac5e; --fill:#100e0a; }
}
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink);
  font:16px/1.55 "Iowan Old Style","Palatino Linotype",Georgia,serif; }
.wrap { max-width:44rem; margin:0 auto; padding:1.4rem 1rem 6rem; }
h1 { font-size:1.6rem; margin:0 0 .3rem; }
.sub { color:var(--muted); font-size:.9rem; margin:0 0 1.3rem; }
.intro { background:var(--card); border:1px solid var(--line); border-radius:12px;
  padding:1rem 1.1rem; margin:0 0 1.4rem; }
.intro p:first-child { margin-top:0; } .intro p:last-child { margin-bottom:0; }
h2 { font-size:1.05rem; margin:2rem 0 .3rem; padding-bottom:.3rem;
  border-bottom:2px solid var(--accent); color:var(--accent); }
h3 { font-size:.85rem; text-transform:uppercase; letter-spacing:.08em;
  color:var(--muted); margin:1.4rem 0 .5rem; }
.section-note { color:var(--muted); font-size:.9rem; margin:.5rem 0 1rem; }
.row { background:var(--card); border:1px solid var(--line);
  border-left:4px solid var(--line); border-radius:10px;
  padding:.7rem .8rem; margin:0 0 .6rem; }
.row.is-done { border-left-color:var(--ok); }
.row.is-filled { border-left-color:var(--ok); }
.row.is-bad { border-left-color:var(--bad); }
.row.is-skipped { border-left-color:var(--muted); opacity:.65; }
.row-head { display:flex; gap:.5rem; align-items:baseline; flex-wrap:wrap; }
.row-name { font-weight:600; }
.tick { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em;
  color:var(--ok); border:1px solid currentColor; border-radius:99px; padding:.05rem .5rem; }
.row-note { margin:.25rem 0 0; font-size:.85rem; color:var(--muted); }
.row-have { margin:.35rem 0 0; font:.9rem ui-monospace,Menlo,monospace; color:var(--ok); }
.row-fields { display:flex; gap:.4rem; margin-top:.5rem; flex-wrap:wrap; }
input[type=text] { font:inherit; font-size:.95rem; color:var(--ink); background:var(--fill);
  border:1px solid var(--line); border-radius:8px; padding:.45rem .55rem; min-height:2.6rem; }
.coord { flex:1 1 14rem; min-width:0; font-family:ui-monospace,Menlo,monospace; }
.radius { flex:0 0 6.5rem; }
input:focus { outline:2px solid var(--accent); outline-offset:1px; }
button { font:inherit; font-size:.88rem; cursor:pointer; border-radius:8px;
  border:1px solid var(--line); background:var(--card); color:var(--ink);
  padding:.4rem .8rem; min-height:2.6rem; }
button:hover { border-color:var(--accent); }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
.here { flex:0 0 auto; }
.check { margin:.35rem 0 0; font-size:.85rem; min-height:1.2em; }
.check.ok { color:var(--ok); } .check.bad { color:var(--bad); } .check.warn { color:var(--warn); }
.skip { display:inline-flex; gap:.4rem; align-items:center; margin-top:.45rem;
  font-size:.85rem; color:var(--muted); }
.bar { position:sticky; bottom:0; z-index:5; margin:0 -1rem;
  background:color-mix(in srgb,var(--card) 92%,transparent); backdrop-filter:blur(8px);
  border-top:1px solid var(--line); padding:.55rem 1rem; display:flex; flex-wrap:wrap;
  gap:.45rem; align-items:center; }
.bar .count { font-size:.83rem; color:var(--muted); margin-right:auto; }
.toast { position:fixed; left:50%; transform:translateX(-50%); bottom:4.5rem;
  background:var(--ink); color:var(--bg); padding:.5rem .9rem; border-radius:8px;
  font-size:.87rem; opacity:0; pointer-events:none; transition:opacity .18s; z-index:10; }
.toast.on { opacity:1; }
body.only-open .row.is-done, body.only-open .row.is-filled, body.only-open .row.is-skipped { display:none; }
@media print { .bar,.toast,.row-fields,.skip { display:none; } body { background:#fff; } }
</style>
</head>
<body>
<div class="wrap">
<h1>Místa k doplnění</h1>
<p class="sub">Tajemství Nebákova · __COUNT__ míst k vyplnění · __DONE__ už v datech</p>

<div class="intro">
<p><strong>Co je potřeba.</strong> Hra umí ověřit, že skupina opravdu stojí tam,
kam ji poslala — jen neví, kde ta místa jsou. Bez souřadnic se hraje na čestné
slovo přesně jako dosud, takže nic nespěchá a nemusí to být všechno.</p>
<p><strong>Jak vyplnit.</strong> Do políčka napište souřadnice v jakémkoli
tvaru — <code>50.5101141N, 15.2257150E</code> i <code>50.5101141 15.225715</code>
projde. Pod políčkem se hned ukáže, co z toho hra přečetla a jak daleko to je od
Troskovic; když se někde splete čárka, je to vidět okamžitě.</p>
<p><strong>„Jsem tady“</strong> vezme polohu z telefonu. Když tuhle stránku
otevřete na místě, je to nejrychlejší i nejpřesnější cesta. (Funguje jen
z internetového odkazu, ne ze souboru na disku.)</p>
<p><strong>„Nepotřebuje souřadnice“</strong> zaškrtněte u úkolů typu „vraťte se,
odkud jste přišli“ — tam není co kontrolovat. Ať je jasné, že se na to nezapomnělo.</p>
<p><strong>Rádius</strong> je nepovinný: kolik metrů okolo se ještě počítá za
„jsme tam“. Bez něj se bere 25 m u úkolů a 60 m u hospod.</p>
<p><strong>Až budete hotoví</strong> (nebo budete chtít poslat, co máte), dole
<em>Zkopírovat</em> nebo <em>Stáhnout</em>. Průběžně se to samo ukládá do tohoto
prohlížeče, takže se dá vyplňovat na etapy.</p>
</div>

__BODY__

<div class="bar">
  <span class="count" id="count"></span>
  <button id="toggle">Skrýt hotové</button>
  <button id="copy" class="primary">Zkopírovat</button>
  <button id="download">Stáhnout</button>
  <button id="clear">Vymazat vše</button>
</div>
</div>
<div class="toast" id="toast"></div>

<script>
const FIELDS = __FIELDS__;
const ANCHOR = __ANCHOR__;
const KEY = "nebakov-mista-v__VERSION__";

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 2200);
}

/**
 * Read coordinates out of whatever was typed.
 *
 * "50.5101141N, 15.2257150E", "50.51 15.22", "50,51 15,22" — all the same point.
 * Decimal commas are the awkward case: a Czech keyboard produces them and they
 * also separate the pair, so a comma is only a decimal point when the number has
 * no dot of its own.
 */
function parseCoords(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/[NnSsEeWwVvZz]/g, " ")
    .replace(/(\\d),(\\d)/g, (m, a, b) => `${a}.${b}`);
  const numbers = cleaned.match(/-?\\d+(?:\\.\\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const lat = Number(numbers[0]);
  const lon = Number(numbers[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

const R = 6371008.8;
function distance(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function describe(point) {
  const away = distance(ANCHOR, point);
  const shown = away >= 1000 ? `${(away / 1000).toFixed(1)} km` : `${Math.round(away)} m`;
  if (point.lat < -90 || point.lat > 90 || point.lon < -180 || point.lon > 180) {
    return { kind: "bad", text: "To nejsou platné souřadnice." };
  }
  if (away > 30000) {
    return {
      kind: "bad",
      text: `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)} — ale to je ${shown} `
        + "od Troskovic. Nejsou čísla obráceně nebo někde přebývá čárka?",
    };
  }
  if (away > 8000) {
    return {
      kind: "warn",
      text: `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)} — ${shown} od Troskovic. `
        + "Dost daleko, ale možná to tak má být.",
    };
  }
  return {
    kind: "ok",
    text: `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)} — ${shown} od Troskovic. Sedí.`,
  };
}

function stateOf(id) {
  const coord = document.getElementById(id);
  const radius = document.getElementById("r-" + id);
  const skip = document.querySelector(`[data-skip="${CSS.escape(id)}"]`);
  return { coord, radius, skip };
}

function save() {
  const data = {};
  for (const field of FIELDS) {
    const { coord, radius, skip } = stateOf(field.id);
    if (!coord) continue;
    if (coord.value.trim() || radius.value.trim() || skip.checked) {
      data[field.id] = {
        coord: coord.value,
        radius: radius.value,
        skip: skip.checked,
      };
    }
  }
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* blocked */ }
}

function paint(id) {
  const { coord, radius, skip } = stateOf(id);
  if (!coord) return null;
  const row = document.querySelector(`[data-row="${CSS.escape(id)}"]`);
  const check = document.querySelector(`[data-check="${CSS.escape(id)}"]`);
  coord.disabled = skip.checked;
  radius.disabled = skip.checked;

  let verdict = null;
  if (skip.checked) {
    check.textContent = "";
    check.className = "check";
  } else {
    const point = parseCoords(coord.value);
    if (!coord.value.trim()) {
      check.textContent = "";
      check.className = "check";
    } else if (!point) {
      check.textContent = "Tomu nerozumím — čekám dvě čísla, zeměpisnou šířku a délku.";
      check.className = "check bad";
      verdict = "bad";
    } else {
      const described = describe(point);
      check.textContent = described.text;
      check.className = "check " + described.kind;
      verdict = described.kind === "bad" ? "bad" : "filled";
    }
  }
  row.classList.toggle("is-skipped", skip.checked);
  row.classList.toggle("is-filled", verdict === "filled");
  row.classList.toggle("is-bad", verdict === "bad");
  return verdict;
}

function refresh() {
  let filled = 0;
  let skipped = 0;
  for (const field of FIELDS) {
    const verdict = paint(field.id);
    if (verdict === "filled") filled += 1;
    const { skip } = stateOf(field.id);
    if (skip?.checked) skipped += 1;
  }
  document.getElementById("count").textContent =
    `Vyplněno ${filled} z ${FIELDS.length}`
    + (skipped ? ` · ${skipped} označeno „nepotřebuje“` : "");
}

for (const field of FIELDS) {
  const { coord, radius, skip } = stateOf(field.id);
  if (!coord) continue;
  for (const el of [coord, radius, skip]) {
    el.addEventListener(el === skip ? "change" : "input", () => { save(); refresh(); });
  }
}

document.querySelectorAll("[data-here]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.here;
    if (!navigator.geolocation) {
      toast("Prohlížeč polohu neposkytuje.");
      return;
    }
    button.disabled = true;
    button.textContent = "Hledám…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        document.getElementById(id).value =
          `${latitude.toFixed(7)}, ${longitude.toFixed(7)}`;
        button.disabled = false;
        button.textContent = "Jsem tady";
        save();
        refresh();
        toast(accuracy ? `Poloha zapsána (±${Math.round(accuracy)} m)` : "Poloha zapsána");
      },
      (err) => {
        button.disabled = false;
        button.textContent = "Jsem tady";
        toast(`Polohu se nepodařilo zjistit: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  });
});

function asText() {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    "Místa — Tajemství Nebákova",
    "verze __VERSION__ · vyplněno: " + stamp,
    "",
  ];
  let any = false;
  for (const field of FIELDS) {
    const { coord, radius, skip } = stateOf(field.id);
    if (!coord) continue;
    if (skip.checked) {
      lines.push(`[NEPOTREBA ${field.tag}] ${field.label}`);
      lines.push("");
      any = true;
      continue;
    }
    const point = parseCoords(coord.value);
    if (!point) continue;
    lines.push(`[${field.tag}] ${field.label}`);
    lines.push(`${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`
      + (radius.value.trim() ? `  r=${radius.value.trim()}` : ""));
    lines.push("");
    any = true;
  }
  if (!any) lines.push("(nic nevyplněno)");
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
  link.download = "mista-nebakov.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Soubor uložen");
});

document.getElementById("toggle").addEventListener("click", (event) => {
  const hidden = document.body.classList.toggle("only-open");
  event.target.textContent = hidden ? "Zobrazit vše" : "Skrýt hotové";
});

document.getElementById("clear").addEventListener("click", () => {
  if (!confirm("Vymazat všechno vyplněné?")) return;
  for (const field of FIELDS) {
    const { coord, radius, skip } = stateOf(field.id);
    if (!coord) continue;
    coord.value = "";
    radius.value = "";
    skip.checked = false;
  }
  try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  refresh();
  toast("Vymazáno");
});

try {
  const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
  for (const [id, entry] of Object.entries(stored)) {
    const { coord, radius, skip } = stateOf(id);
    if (!coord) continue;
    coord.value = entry.coord ?? "";
    radius.value = entry.radius ?? "";
    skip.checked = entry.skip === true;
  }
} catch (err) { /* start empty */ }
refresh();
</script>
</body>
</html>
"""


def sections():
    """The places as HTML plus the fields they declare.

    Split out of `build` so the combined author pack can reuse it instead of
    describing the same missing coordinates a second way.
    """
    scenario = read("scenario.json")
    zone_data = read("zones.json") if os.path.exists(os.path.join(GAME, "zones.json")) else {}
    known = zone_data.get("zones", [])
    pending = zone_data.get("pending", [])

    fields = []
    body = []
    done = 0

    for zone_id, title in ZONE_TITLES.items():
        body.append(f"<h2>{html.escape(title)}</h2>")
        body.append(f'<p class="section-note">{html.escape(ZONE_NOTES.get(zone_id, ""))}</p>')
        for zone in known:
            if zone.get("id") != zone_id:
                continue
            done += 1
            body.append(row(f"zona-{zone_id}-{slug(zone.get('name'))}",
                            zone.get("name", zone_id), None, [], existing=zone))
        for zone in pending:
            if zone.get("id") != zone_id:
                continue
            field_id = f"zona-{zone_id}-{slug(zone.get('name'))}"
            body.append(row(field_id, zone.get("name", zone_id), zone.get("note"), fields))
            fields[-1]["tag"] = f"ZONA {zone_id}"
        if zone_id == "village":
            # the author said which villages count is still open, so leave room
            for n in range(1, 4):
                field_id = f"zona-{zone_id}-dalsi{n}"
                body.append(row(field_id, f"Další obec / osada {n}",
                                "Necháno prázdné — dopište jméno do exportu, "
                                "pokud sem něco patří.", fields))
                fields[-1]["tag"] = f"ZONA {zone_id}"

    body.append("<h2>Cestovní úkoly</h2>")
    body.append('<p class="section-note">Kam hra skupinu posílá. U „vraťte se, odkud '
                'jste přišli“ zaškrtněte, že to souřadnice nepotřebuje.</p>')

    by_deck = {}
    for scene in scenario["scenes"]:
        code = scene.get("cardCode") or scene["id"]
        for choice in scene.get("choices") or []:
            quest = choice.get("quest")
            if not quest or quest.get("kind") != "travel":
                continue
            by_deck.setdefault(code[:1], []).append((code, quest))

    for deck in sorted(by_deck):
        body.append(f"<h3>{html.escape(DECK_NAMES.get(deck, 'Balíček ' + deck))}</h3>")
        for code, quest in by_deck[deck]:
            field_id = f"ukol-{quest['id']}"
            existing = quest.get("at")
            if existing:
                done += 1
            body.append(row(field_id, f"{code} · {quest.get('text', quest['id'])}",
                            None, [] if existing else fields, existing=existing))
            if not existing:
                fields[-1]["tag"] = f"UKOL {code}"

    duplicates = [f["id"] for f in fields if [g["id"] for g in fields].count(f["id"]) > 1]
    if duplicates:
        raise SystemExit(f"chyba: dvě políčka se stejným id: {sorted(set(duplicates))}")

    return body, fields, anchor(known), done


def build(out_path):
    body, fields, mid, done = sections()

    page = (PAGE
            .replace("__BODY__", "\n".join(body))
            .replace("__FIELDS__", json.dumps(fields, ensure_ascii=False))
            .replace("__ANCHOR__", json.dumps(mid))
            .replace("__COUNT__", str(len(fields)))
            .replace("__DONE__", str(done))
            .replace("__VERSION__", VERSION))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(page)

    print(f"{out_path}: {round(len(page.encode()) / 1024)} KB")
    print(f"  políček: {len(fields)} | už v datech: {done}")
    return 0


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    if not os.path.isdir(GAME):
        print(f"chyba: {GAME} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2
    return build(out)


if __name__ == "__main__":
    raise SystemExit(main())
