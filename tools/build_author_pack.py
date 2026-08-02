#!/usr/bin/env python3
"""Both things the author has to fill in, as one file with one export.

    python3 tools/build_author_pack.py

There were two pages — the coordinates and the card check — and asking someone to
keep two files, two browsers' worth of saved progress and two exports in step is
asking for one of them to be forgotten. This is the same content in one document,
with a tab per part, one progress line and one export.

The two parts are rendered by the tools that already own them
(`build_places_form.sections`, `build_card_review.sections`) rather than described
again here: two renderings of the same card that drift apart would be worse than
having only one page.
"""

import html
import json
import os
import sys

import build_card_review as cards
import build_places_form as places

DEFAULT_OUT = os.path.join("dist", "pro-autora.html")
VERSION = "1"

PAGE = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pro autora — Tajemství Nebákova</title>
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
.wrap { max-width:46rem; margin:0 auto; padding:1.4rem 1rem 6rem; }
h1 { font-size:1.7rem; margin:0 0 .3rem; }
.sub { color:var(--muted); font-size:.9rem; margin:0 0 1.3rem; }
.intro { background:var(--card); border:1px solid var(--line); border-radius:12px;
  padding:1rem 1.1rem; margin:0 0 1.2rem; }
.intro p:first-child { margin-top:0; } .intro p:last-child { margin-bottom:0; }
h2 { font-size:1.05rem; margin:2rem 0 .3rem; padding-bottom:.3rem;
  border-bottom:2px solid var(--accent); color:var(--accent); }
h3 { font-size:.85rem; text-transform:uppercase; letter-spacing:.08em;
  color:var(--muted); margin:1.4rem 0 .5rem; }
.section-note { color:var(--muted); font-size:.9rem; margin:.5rem 0 1rem; }

/* ------------------------------------------------------------- tabs */
.tabs { display:flex; gap:.4rem; margin:0 0 1.2rem; flex-wrap:wrap; }
.tab {
  font:inherit; font-size:.95rem; cursor:pointer; flex:1 1 12rem;
  background:var(--card); color:var(--ink); border:1px solid var(--line);
  border-radius:10px; padding:.6rem .8rem; text-align:left; min-height:3rem;
}
.tab strong { display:block; }
.tab span { font-size:.82rem; color:var(--muted); }
.tab[aria-selected="true"] { border-color:var(--accent); border-width:2px; }
.tab[aria-selected="true"] strong { color:var(--accent); }
.part { display:none; }
.part.is-open { display:block; }

/* --------------------------------------------------------- places rows */
.row { background:var(--card); border:1px solid var(--line);
  border-left:4px solid var(--line); border-radius:10px;
  padding:.7rem .8rem; margin:0 0 .6rem; }
.row.is-done, .row.is-filled { border-left-color:var(--ok); }
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
input:focus, textarea:focus { outline:2px solid var(--accent); outline-offset:1px; }
.check { margin:.35rem 0 0; font-size:.85rem; min-height:1.2em; }
.check.ok { color:var(--ok); } .check.bad { color:var(--bad); } .check.warn { color:var(--warn); }
.skip { display:inline-flex; gap:.4rem; align-items:center; margin-top:.45rem;
  font-size:.85rem; color:var(--muted); }
.here { flex:0 0 auto; }

/* ----------------------------------------------------------- card rows */
.card { background:var(--card); border:1px solid var(--line); border-left:4px solid var(--line);
  border-radius:10px; padding:.85rem 1rem; margin:0 0 .8rem; }
.card.ok { border-left-color:var(--ok); }
.card.fix { border-left-color:var(--bad); }
.chead { display:flex; gap:.5rem; align-items:baseline; margin-bottom:.4rem; flex-wrap:wrap; }
.code { font:700 .8rem/1.4 ui-monospace,Menlo,monospace;
  background:var(--accent); color:#fff; border-radius:5px; padding:.1rem .45rem; }
.cid { font:.75rem/1.4 ui-monospace,Menlo,monospace; color:var(--muted); }
.flag { font-size:.7rem; text-transform:uppercase; letter-spacing:.04em;
  border:1px solid var(--line); border-radius:99px; padding:.05rem .5rem; color:var(--muted); }
.card p { margin:.45rem 0; }
.answer { color:var(--ok); font-size:.92rem; }
.fx { color:var(--muted); font-size:.85rem; font-style:italic; }
.todo { font-size:.85rem; color:var(--bad); }
.choices { list-style:none; margin:.6rem 0 0; padding:0; border-top:1px dashed var(--line); }
.choices li { display:grid; grid-template-columns:1.4rem 1fr auto; gap:.15rem .4rem;
  padding:.4rem 0; border-bottom:1px dashed var(--line); font-size:.93rem; align-items:baseline; }
.ico, .ctext, .goto { grid-row:1; }
.goto { font:.8rem ui-monospace,Menlo,monospace; color:var(--accent); }
.note { grid-column:2/4; font-size:.8rem; color:var(--muted); }
.mark { display:flex; gap:.4rem; align-items:center; margin-top:.7rem; }
.card.ok .ok-btn { background:var(--ok); border-color:var(--ok); color:#fff; }
.card.fix .bad-btn { background:var(--bad); border-color:var(--bad); color:#fff; }
.state { font-size:.8rem; color:var(--muted); }
textarea { width:100%; margin-top:.5rem; font:inherit; font-size:.92rem; color:var(--ink);
  background:var(--fill); border:1px solid var(--line); border-radius:8px;
  padding:.5rem .6rem; resize:vertical; }
.tablewrap { overflow-x:auto; }
table { border-collapse:collapse; width:100%; font-size:.92rem; margin:.8rem 0; }
th, td { border:1px solid var(--line); padding:.35rem .5rem; text-align:left; }

/* --------------------------------------------------------------- chrome */
button { font:inherit; font-size:.88rem; cursor:pointer; border-radius:8px;
  border:1px solid var(--line); background:var(--card); color:var(--ink);
  padding:.4rem .8rem; min-height:2.6rem; }
button:hover { border-color:var(--accent); }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
.bar { position:sticky; bottom:0; z-index:5; margin:0 -1rem;
  background:color-mix(in srgb,var(--card) 92%,transparent); backdrop-filter:blur(8px);
  border-top:1px solid var(--line); padding:.55rem 1rem; display:flex; flex-wrap:wrap;
  gap:.45rem; align-items:center; }
.bar .count { font-size:.83rem; color:var(--muted); margin-right:auto; }
.toast { position:fixed; left:50%; transform:translateX(-50%); bottom:4.5rem;
  background:var(--ink); color:var(--bg); padding:.5rem .9rem; border-radius:8px;
  font-size:.87rem; opacity:0; pointer-events:none; transition:opacity .18s; z-index:10; }
.toast.on { opacity:1; }
body.only-open .row.is-done, body.only-open .row.is-filled,
body.only-open .row.is-skipped, body.only-open .card.ok { display:none; }
@media print { .bar,.toast,.tabs,.mark,.row-fields,.skip { display:none; }
  .part { display:block; } body { background:#fff; } }
</style>
</head>
<body>
<div class="wrap">
<h1>Pro autora</h1>
<p class="sub">Tajemství Nebákova · __PLACES__ míst a __CARDS__ karet · dotazník __VERSION__</p>

<div class="intro">
<p><strong>Dvě věci v jednom.</strong> Nahoře se přepíná mezi <em>místy</em>
(kde co je) a <em>kartami</em> (jestli text sedí). Vyplňuje se to nezávisle,
ukládá průběžně, a dole se z obojího vyexportuje jeden text.</p>
<p><strong>Nemusí to být všechno ani naráz.</strong> Co se nevyplní, zůstává jak
je — hra běží dál na čestné slovo a s texty, které v ní jsou teď.</p>
<p><strong>Až budete chtít poslat, co máte</strong>, klepněte dole na
<em>Zkopírovat</em> a vložte to do zprávy, nebo <em>Stáhnout</em> a pošlete
soubor.</p>
</div>

<div class="tabs" role="tablist">
  <button class="tab" role="tab" data-part="places" aria-selected="true">
    <strong>Místa</strong><span id="tab-places-note"></span>
  </button>
  <button class="tab" role="tab" data-part="cards" aria-selected="false">
    <strong>Karty</strong><span id="tab-cards-note"></span>
  </button>
</div>

<section class="part is-open" id="part-places">
<div class="intro">
<p><strong>Co je potřeba.</strong> Hra umí ověřit, že skupina opravdu stojí tam,
kam ji poslala — jen neví, kde ta místa jsou.</p>
<p><strong>Jak vyplnit.</strong> Souřadnice v jakémkoli tvaru:
<code>50.5101141N, 15.2257150E</code> i <code>50.5101141 15.225715</code> projde.
Pod políčkem se hned ukáže, co z toho hra přečetla a jak daleko to je od
Troskovic — když se někde splete čárka, je to vidět okamžitě.</p>
<p><strong>„Jsem tady“</strong> vezme polohu z telefonu. Když tuhle stránku
otevřete na místě, je to nejrychlejší i nejpřesnější cesta. (Funguje jen
z internetového odkazu, ne ze souboru na disku.)</p>
<p><strong>„Nepotřebuje souřadnice“</strong> zaškrtněte u úkolů typu „vraťte se,
odkud jste přišli“ — tam není co kontrolovat.</p>
<p><strong>Rádius</strong> je nepovinný: kolik metrů okolo se ještě počítá za
„jsme tam“. Bez něj 25 m u úkolů a 60 m u hospod.</p>
</div>
__PLACES_BODY__
</section>

<section class="part" id="part-cards">
<div class="intro">
<p><strong>Co to je.</strong> Všech __CARDS__ karet tak, jak je má aplikace —
text, volby, kam která vede, podmínky na reputaci a co která stojí. Porovnejte to
prosím s tištěnými kartami.</p>
<p><strong>Jak vyplnit.</strong> <em>Sedí</em> = souhlasí, jdu dál.
<em>Opravit</em> = otevře se okno s tím, co tam mám teď, a vy to přepíšete.
Karet, kterých se nedotknete, se to nedotkne.</p>
<p><strong>Červená poznámka</strong> u karty znamená, že si tím sám nejsem jistý —
tam se hodí kouknout nejdřív. Takových je __TODOS__.</p>
</div>
__CARDS_BODY__
</section>

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
const PLACES = __PLACES_FIELDS__;
const CARDS = __CARDS_FIELDS__;
const CURRENT = __CURRENT__;
const ANCHOR = __ANCHOR__;
const KEY = "nebakov-pro-autora-v__VERSION__";
/** the two separate pages this replaces, so work already done is not lost */
const OLD_KEYS = { places: "nebakov-mista-v1", cards: "nebakov-kontrola-v2" };
let marks = {};

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 2200);
}

/* ------------------------------------------------------------- places */

/**
 * Read coordinates out of whatever was typed.
 *
 * Decimal commas are the awkward case: a Czech keyboard produces them and they
 * also separate the pair, so a comma is a decimal point only when it sits
 * between two digits.
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

function distance(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function describe(point) {
  const away = distance(ANCHOR, point);
  const shown = away >= 1000 ? `${(away / 1000).toFixed(1)} km` : `${Math.round(away)} m`;
  const where = `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
  if (point.lat < -90 || point.lat > 90 || point.lon < -180 || point.lon > 180) {
    return { kind: "bad", text: "To nejsou platné souřadnice." };
  }
  if (away > 30000) {
    return { kind: "bad", text: `${where} — ale to je ${shown} od Troskovic. `
      + "Nejsou čísla obráceně nebo někde přebývá čárka?" };
  }
  if (away > 8000) {
    return { kind: "warn", text: `${where} — ${shown} od Troskovic. `
      + "Dost daleko, ale možná to tak má být." };
  }
  return { kind: "ok", text: `${where} — ${shown} od Troskovic. Sedí.` };
}

function placeOf(id) {
  return {
    coord: document.getElementById(id),
    radius: document.getElementById("r-" + id),
    skip: document.querySelector(`[data-skip="${CSS.escape(id)}"]`),
  };
}

function paintPlace(id) {
  const { coord, radius, skip } = placeOf(id);
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

/* -------------------------------------------------------------- cards */

function paintCard(id) {
  const article = document.querySelector(`[data-card="${CSS.escape(id)}"]`);
  const box = document.getElementById("fix-" + id);
  if (!article || !box) return;
  const mark = marks[id];
  article.classList.toggle("ok", mark === "ok");
  article.classList.toggle("fix", mark === "fix");
  box.hidden = mark !== "fix";
  article.querySelector(".state").textContent =
    mark === "ok" ? "označeno jako správné" : mark === "fix" ? "čeká na opravu" : "";
}

/* --------------------------------------------------------- both halves */

function save() {
  const data = { places: {}, cards: {} };
  for (const field of PLACES) {
    const { coord, radius, skip } = placeOf(field.id);
    if (!coord) continue;
    if (coord.value.trim() || radius.value.trim() || skip.checked) {
      data.places[field.id] = { coord: coord.value, radius: radius.value, skip: skip.checked };
    }
  }
  for (const [id, mark] of Object.entries(marks)) {
    const box = document.getElementById("fix-" + id);
    data.cards[id] = { mark, text: mark === "fix" ? (box?.value ?? "") : "" };
  }
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* blocked */ }
}

function refresh() {
  let filled = 0;
  let skipped = 0;
  for (const field of PLACES) {
    const verdict = paintPlace(field.id);
    if (verdict === "filled") filled += 1;
    if (placeOf(field.id).skip?.checked) skipped += 1;
  }
  for (const card of CARDS) paintCard(card.id);

  const fine = Object.values(marks).filter((m) => m === "ok").length;
  const fixes = Object.values(marks).filter((m) => m === "fix").length;

  document.getElementById("tab-places-note").textContent =
    `${filled} z ${PLACES.length} vyplněno` + (skipped ? ` · ${skipped}× nepotřeba` : "");
  document.getElementById("tab-cards-note").textContent =
    `${fine + fixes} z ${CARDS.length} zkontrolováno` + (fixes ? ` · ${fixes} k opravě` : "");
  document.getElementById("count").textContent =
    `Místa ${filled}/${PLACES.length} · karty ${fine + fixes}/${CARDS.length}`;
}

function asText() {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    "Pro autora — Tajemství Nebákova",
    "dotazník __VERSION__ · vyplněno: " + stamp,
    "",
    "=== MÍSTA ===",
    "",
  ];
  let anyPlace = false;
  for (const field of PLACES) {
    const { coord, radius, skip } = placeOf(field.id);
    if (!coord) continue;
    if (skip.checked) {
      lines.push(`[NEPOTREBA ${field.tag}] ${field.label}`, "");
      anyPlace = true;
      continue;
    }
    const point = parseCoords(coord.value);
    if (!point) continue;
    lines.push(`[${field.tag}] ${field.label}`);
    lines.push(`${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`
      + (radius.value.trim() ? `  r=${radius.value.trim()}` : ""), "");
    anyPlace = true;
  }
  if (!anyPlace) lines.push("(nic nevyplněno)", "");

  lines.push("=== KARTY ===", "");
  const fine = [];
  const fixes = [];
  for (const card of CARDS) {
    const mark = marks[card.id];
    if (mark === "ok") fine.push(card.id);
    if (mark !== "fix") continue;
    const box = document.getElementById("fix-" + card.id);
    fixes.push(`[KARTA ${card.id}]`, (box?.value ?? "").trim() || "(bez textu)", "");
  }
  lines.push(`SPRÁVNĚ (${fine.length}): ${fine.join(", ") || "—"}`, "");
  lines.push(`K OPRAVĚ (${fixes.length / 3}):`, "");
  lines.push(...(fixes.length ? fixes : ["—"]));
  return lines.join("\\n");
}

/* ------------------------------------------------------------- wiring */

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    for (const other of document.querySelectorAll(".tab")) {
      other.setAttribute("aria-selected", String(other === tab));
    }
    for (const part of document.querySelectorAll(".part")) {
      part.classList.toggle("is-open", part.id === "part-" + tab.dataset.part);
    }
    window.scrollTo(0, 0);
  });
});

for (const field of PLACES) {
  const { coord, radius, skip } = placeOf(field.id);
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
        document.getElementById(id).value = `${latitude.toFixed(7)}, ${longitude.toFixed(7)}`;
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

document.querySelectorAll(".mark button").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.parentElement.dataset.for;
    const wanted = button.dataset.mark;
    marks[id] = marks[id] === wanted ? undefined : wanted;
    if (!marks[id]) delete marks[id];
    const box = document.getElementById("fix-" + id);
    // opening the box prefilled means correcting is editing, not retyping
    if (marks[id] === "fix" && !box.value) box.value = CURRENT[id] ?? "";
    save();
    refresh();
    if (marks[id] === "fix") box.focus();
  });
});

document.querySelectorAll("textarea[id^='fix-']").forEach((box) => {
  box.addEventListener("input", save);
});

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
  link.download = "pro-autora-nebakov.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Soubor uložen");
});

document.getElementById("toggle").addEventListener("click", (event) => {
  const hidden = document.body.classList.toggle("only-open");
  event.target.textContent = hidden ? "Zobrazit vše" : "Skrýt hotové";
});

document.getElementById("clear").addEventListener("click", () => {
  if (!confirm("Vymazat všechno vyplněné — místa i karty?")) return;
  for (const field of PLACES) {
    const { coord, radius, skip } = placeOf(field.id);
    if (!coord) continue;
    coord.value = "";
    radius.value = "";
    skip.checked = false;
  }
  marks = {};
  document.querySelectorAll("textarea[id^='fix-']").forEach((b) => { b.value = ""; });
  try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  refresh();
  toast("Vymazáno");
});

function restore() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (err) { data = null; }
  if (!data) {
    // first visit: pick up whatever was typed into the two pages this replaces
    data = { places: {}, cards: {} };
    for (const [part, key] of Object.entries(OLD_KEYS)) {
      try {
        const old = JSON.parse(localStorage.getItem(key) || "null");
        if (old) data[part] = old;
      } catch (err) { /* ignore */ }
    }
  }
  for (const [id, entry] of Object.entries(data.places ?? {})) {
    const { coord, radius, skip } = placeOf(id);
    if (!coord) continue;
    coord.value = entry.coord ?? "";
    radius.value = entry.radius ?? "";
    skip.checked = entry.skip === true;
  }
  for (const [id, entry] of Object.entries(data.cards ?? {})) {
    if (!document.getElementById("fix-" + id)) continue;
    marks[id] = entry.mark;
    if (entry.text) document.getElementById("fix-" + id).value = entry.text;
  }
}

restore();
refresh();
</script>
</body>
</html>
"""


def build(out_path):
    places_body, places_fields, mid, _done = places.sections()
    cards_body, cards_fields, current, stats = cards.sections()

    clash = {f["id"] for f in places_fields} & {f["id"] for f in cards_fields}
    if clash:
        print(f"chyba: místo a karta se stejným id: {sorted(clash)}", file=sys.stderr)
        return 1

    rendered_cards = "\n".join(cards_body)
    # tables need their own scroll box so the page never scrolls sideways
    rendered_cards = rendered_cards.replace("<table>", '<div class="tablewrap"><table>')
    rendered_cards = rendered_cards.replace("</table>", "</table></div>")
    # the two halves style their buttons differently; disambiguate the card ones
    rendered_cards = rendered_cards.replace('class="ok" data-mark="ok"',
                                            'class="ok-btn" data-mark="ok"')
    rendered_cards = rendered_cards.replace('class="bad" data-mark="fix"',
                                           'class="bad-btn" data-mark="fix"')

    page = (PAGE
            .replace("__PLACES_BODY__", "\n".join(places_body))
            .replace("__CARDS_BODY__", rendered_cards)
            .replace("__PLACES_FIELDS__", json.dumps(places_fields, ensure_ascii=False))
            .replace("__CARDS_FIELDS__", json.dumps(cards_fields, ensure_ascii=False))
            .replace("__CURRENT__", json.dumps(current, ensure_ascii=False))
            .replace("__ANCHOR__", json.dumps(mid))
            .replace("__PLACES__", str(len(places_fields)))
            .replace("__CARDS__", str(len(cards_fields)))
            .replace("__TODOS__", str(stats["todos"]))
            .replace("__VERSION__", VERSION))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(page)

    print(f"{out_path}: {round(len(page.encode()) / 1024)} KB")
    print(f"  míst: {len(places_fields)} | karet: {len(cards_fields)}"
          f" | s poznámkou todo: {stats['todos']}")
    return 0


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    if not os.path.isdir(places.GAME):
        print(f"chyba: {places.GAME} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2
    return build(out)


if __name__ == "__main__":
    raise SystemExit(main())
