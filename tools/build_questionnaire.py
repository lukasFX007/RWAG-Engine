#!/usr/bin/env python3
"""Turn the author questionnaire into a single HTML page that can be filled in.

    python3 tools/build_questionnaire.py

`docs/otazky-pro-autora.md` stays the single source of truth: it is what gets
reviewed in git and what the answers are matched back against. This renders it as
one self-contained document with input fields, so the author does not need a text
editor, Word, or an account anywhere — they open the file, type, and press a button
that hands the answers back as plain text.

The markdown is parsed rather than duplicated, which means the format has to hold:

    ## Q01 🔴 · title            starts a question, priority from the emoji
    ```                          a fenced block holds the answer fields
    Q02a — label                 optional label for the field that follows
    ODPOVĚĎ:                     an answer field
    POZNÁMKA:                    an optional note field
    ```
    | Karta | Kód |               a table whose last column is empty becomes
    | ----- | --- |               one input per row
    | Cikáni | |

Anything else inside a question is context and is rendered read-only.
"""

import html
import json
import os
import re
import sys

SOURCE = os.path.join("docs", "otazky-pro-autora.md")
DEFAULT_OUT = os.path.join("dist", "otazky-pro-autora.html")

QUESTION_RE = re.compile(r"^##\s+(Q\d+)\s*(.*)$")
SECTION_RE = re.compile(r"^#\s+([A-Z]\.\s+.*)$")
FIELD_LABEL_RE = re.compile(r"^(Q\d+[a-z]?)\s+[—-]\s+(.*)$")
ANSWER_RE = re.compile(r"^ODPOVĚĎ:\s*(.*)$")
NOTE_RE = re.compile(r"^POZNÁMKA:\s*(.*)$")
OPTION_RE = re.compile(r"^[a-e]\)\s")
PRIORITY = {"🔴": "blocker", "🟠": "important", "🟡": "minor"}
PRIORITY_LABEL = {
    "blocker": "Bez odpovědi nejde hru dohrát",
    "important": "Mění chování hry",
    "minor": "Ověření nebo kosmetika",
}


def inline(text):
    """The small subset of markdown the questionnaire actually uses."""
    out = html.escape(text)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<![\w*])\*([^*]+)\*(?![\w*])", r"<em>\1</em>", out)
    return out


class Block:
    """A run of context lines, rendered once the run ends."""

    def __init__(self):
        self.kind = None
        self.lines = []

    def flush(self, into):
        if not self.lines:
            self.kind = None
            return
        if self.kind == "quote":
            body = " ".join(self.lines)
            into.append(f"<blockquote>{inline(body)}</blockquote>")
        elif self.kind == "list":
            items = "".join(f"<li>{inline(item)}</li>" for item in self.lines)
            into.append(f"<ul>{items}</ul>")
        else:
            into.append(f"<p>{inline(' '.join(self.lines))}</p>")
        self.lines = []
        self.kind = None

    def add(self, kind, line, into):
        if self.kind and kind != self.kind:
            self.flush(into)
        self.kind = kind
        self.lines.append(line)


def caption_html(parts):
    """A wrapped label reads as one sentence, but its a)/b)/c) options need own lines."""
    grouped, run = [], []
    for part in parts:
        if OPTION_RE.match(part):
            if run:
                grouped.append(" ".join(run))
                run = []
            grouped.append(part)
        else:
            run.append(part)
    if run:
        grouped.append(" ".join(run))
    return "<br>".join(inline(part) for part in grouped)


def render_table(rows, question_id, fields):
    """A table whose last column is blank on every data row becomes fillable."""
    header, body = rows[0], rows[2:]
    fillable = bool(body) and all(not row[-1].strip() for row in body)

    cells = "".join(f"<th>{inline(cell)}</th>" for cell in header)
    out = [f"<table><thead><tr>{cells}</tr></thead><tbody>"]
    for index, row in enumerate(body, start=1):
        out.append("<tr>")
        for column, cell in enumerate(row):
            last = column == len(row) - 1
            if fillable and last:
                field_id = f"{question_id}-{index}"
                fields.append({"id": field_id, "label": row[0].strip()})
                out.append(
                    f'<td class="fill"><input type="text" id="{field_id}" '
                    f'data-field="{field_id}" autocomplete="off"></td>')
            else:
                out.append(f"<td>{inline(cell)}</td>")
        out.append("</tr>")
    out.append("</tbody></table>")
    return "".join(out)


def render_fields(entries, question_id, question_title, fields):
    """One fenced block, turned into labelled answer boxes.

    The caption shown on the page and the label carried into the export differ on
    purpose: a lone box reads best as just "Odpověď", but in the exported text that
    would leave the answer with nothing to identify it, so the question title goes
    there instead.
    """
    out = ['<div class="answers">']
    pending = None
    seen = 0

    for line in entries:
        label_match = FIELD_LABEL_RE.match(line)
        if label_match:
            pending = label_match.group(1), [label_match.group(2).rstrip()]
            continue
        answer = ANSWER_RE.match(line)
        note = NOTE_RE.match(line)
        if not answer and not note:
            # a wrapped continuation of the label above
            if pending and line.strip():
                pending[1].append(line.strip())
            continue

        if note:
            field_id = f"{pending[0] if pending else question_id}-poznamka"
            caption = inline("Poznámka (nepovinné)")
            export = f"poznámka — {question_title}"
            optional = True
        else:
            field_id = pending[0] if pending else question_id
            caption = caption_html(pending[1]) if pending else inline("Odpověď")
            export = " ".join(pending[1]) if pending else question_title
            optional = False
            if seen and not pending:
                field_id = f"{question_id}-{seen}"
            seen += 1

        fields.append({"id": field_id, "label": export, "optional": optional})
        css = "field optional" if optional else "field"
        out.append(
            f'<div class="{css}">'
            f'<label for="{field_id}"><span class="tag">{html.escape(field_id)}</span>'
            f'<span class="cap">{caption}</span></label>'
            f'<textarea id="{field_id}" data-field="{field_id}" rows="2" '
            f'placeholder="{"cokoli navíc…" if optional else "Sem napište odpověď…"}"></textarea>'
            f"</div>")
        pending = None

    out.append("</div>")
    return "".join(out)


def parse(markdown):
    lines = markdown.splitlines()
    intro, sections = [], []
    questions = None
    current = None
    fields = []

    block = Block()
    table = []
    fence = None
    target = intro

    def close_table():
        nonlocal table
        if table:
            target.append(render_table(table, current["id"] if current else "T", fields))
            table = []

    def start_question(qid, rest):
        nonlocal current, target
        finish_question()
        priority = next((p for p in PRIORITY if p in rest), None)
        title = rest
        for mark in PRIORITY:
            title = title.replace(mark, "")
        title = title.strip(" ·-—")
        current = {
            "id": qid,
            "title": title,
            "priority": PRIORITY.get(priority, "minor"),
            "body": [],
        }
        target = current["body"]

    def finish_question():
        nonlocal current
        if current is not None:
            block.flush(current["body"])
            close_table()
            questions.append(current)
            current = None

    for raw in lines:
        line = raw.rstrip()

        if line.startswith("```"):
            if fence is None:
                block.flush(target)
                close_table()
                fence = []
            else:
                if current is not None:
                    target.append(
                        render_fields(fence, current["id"], current["title"], fields))
                fence = None
            continue
        if fence is not None:
            fence.append(line)
            continue

        section = SECTION_RE.match(line)
        if section:
            finish_question()
            block.flush(intro)
            questions = []
            sections.append({"title": section.group(1).strip(), "questions": questions})
            target = intro  # section prose lands in the section header instead
            current = None
            sections[-1]["intro"] = []
            target = sections[-1]["intro"]
            continue

        question = QUESTION_RE.match(line)
        if question:
            if questions is None:  # a question before any section heading
                questions = []
                sections.append({"title": "Otázky", "intro": [], "questions": questions})
            start_question(question.group(1), question.group(2))
            continue

        if line.startswith("|"):
            block.flush(target)
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            table.append(cells)
            continue
        close_table()

        if not line.strip():
            block.flush(target)
            continue
        if line.startswith("---"):
            block.flush(target)
            continue
        if line.startswith("*Konec"):  # the sign-off is for the markdown reader only
            break
        if line.startswith(">"):
            block.add("quote", line.lstrip("> ").strip(), target)
            continue
        if re.match(r"^[-*]\s+", line):
            block.add("list", re.sub(r"^[-*]\s+", "", line), target)
            continue
        if block.kind == "list" and raw[:1] in (" ", "\t"):
            # an indented continuation belongs to the bullet above, not to a new one
            block.lines[-1] += " " + line.strip()
            continue
        if line.startswith("#"):
            block.flush(target)
            target.append(f"<h3>{inline(line.lstrip('# ').strip())}</h3>")
            continue
        block.add("para", line.strip(), target)

    finish_question()
    block.flush(target)
    return sections, fields


PAGE = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Otázky pro autora — Tajemství Nebákova</title>
<style>
:root {
  color-scheme: light dark;
  --bg: #f6f3ec; --card: #fffdf8; --ink: #221c14; --muted: #6d6252;
  --line: #ddd4c2; --accent: #7a2e22; --focus: #a8452f;
  --blocker: #b3261e; --important: #b06a12; --minor: #6d6252;
  --fill: #fff; --ok: #2f6b3a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12100c; --card: #1b1813; --ink: #ece5d8; --muted: #a4998a;
    --line: #332e26; --accent: #e0a08d; --focus: #e0a08d;
    --blocker: #f2857c; --important: #e0ac5e; --minor: #a4998a;
    --fill: #100e0a; --ok: #7bbf8a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 16px/1.6 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}
.wrap { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.1rem 6rem; }
h1 { font-size: 1.7rem; line-height: 1.25; margin: 0 0 .3rem; }
h2 { font-size: 1.15rem; margin: 0 0 .6rem; }
h3 { font-size: .95rem; margin: 1.1rem 0 .3rem; }
.sub { color: var(--muted); font-size: .9rem; margin: 0 0 1.6rem; }
.intro, .qcard, .section > .lead {
  background: var(--card); border: 1px solid var(--line); border-radius: 12px;
  padding: 1rem 1.1rem; margin: 0 0 1rem;
}
.intro p:first-child, .qcard p:first-child { margin-top: 0; }
.intro p:last-child, .qcard p:last-child { margin-bottom: 0; }
.section > h2 {
  margin: 2.4rem 0 .8rem; padding-bottom: .35rem;
  border-bottom: 2px solid var(--accent); color: var(--accent);
}
.qhead { display: flex; gap: .6rem; align-items: baseline; margin: 0 0 .5rem; }
.qid {
  font: 700 .8rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  background: var(--accent); color: #fff; border-radius: 5px;
  padding: .1rem .4rem; flex: none;
}
.qtitle { font-weight: 700; }
.prio {
  font-size: .72rem; letter-spacing: .04em; text-transform: uppercase;
  border: 1px solid currentColor; border-radius: 99px; padding: .05rem .5rem;
  flex: none; align-self: center;
}
.blocker .prio { color: var(--blocker); }
.important .prio { color: var(--important); }
.minor .prio { color: var(--minor); }
.qcard.blocker { border-left: 4px solid var(--blocker); }
.qcard.important { border-left: 4px solid var(--important); }
blockquote {
  margin: .7rem 0; padding: .1rem 0 .1rem .9rem;
  border-left: 3px solid var(--line); color: var(--muted);
}
code {
  font: .88em/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  background: color-mix(in srgb, var(--line) 45%, transparent);
  padding: .05rem .25rem; border-radius: 4px;
}
ul { margin: .6rem 0; padding-left: 1.2rem; }
li { margin: .2rem 0; }
.tablewrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .92rem; margin: .8rem 0; }
th, td { border: 1px solid var(--line); padding: .35rem .5rem; text-align: left; }
th { background: color-mix(in srgb, var(--line) 35%, transparent); }
td.fill { width: 6.5rem; padding: .15rem; }
td.fill input { width: 100%; border: 0; background: var(--fill); color: var(--ink);
  font: inherit; padding: .25rem .35rem; border-radius: 4px; }
.answers { margin: .9rem 0 0; }
.field { margin: .7rem 0 0; }
.field label { display: block; margin-bottom: .25rem; }
.tag {
  font: 700 .74rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--accent); margin-right: .45rem;
}
.cap { font-size: .92rem; }
textarea, input[type=text] {
  width: 100%; font: inherit; color: var(--ink); background: var(--fill);
  border: 1px solid var(--line); border-radius: 8px; padding: .5rem .6rem;
  resize: vertical;
}
textarea:focus, input:focus { outline: 2px solid var(--focus); outline-offset: 1px; }
.field.filled textarea, .field.filled input { border-color: var(--ok); }
.optional .cap { color: var(--muted); }
.bar {
  position: sticky; bottom: 0; z-index: 5; margin: 0 -1.1rem;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  backdrop-filter: blur(8px); border-top: 1px solid var(--line);
  padding: .6rem 1.1rem; display: flex; flex-wrap: wrap; gap: .5rem;
  align-items: center;
}
.bar .count { font-size: .85rem; color: var(--muted); margin-right: auto; }
button {
  font: inherit; font-size: .88rem; cursor: pointer; border-radius: 8px;
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
  padding: .4rem .8rem;
}
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button:hover { border-color: var(--focus); }
.toast {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 4.5rem;
  background: var(--ink); color: var(--bg); padding: .5rem .9rem;
  border-radius: 8px; font-size: .88rem; opacity: 0; pointer-events: none;
  transition: opacity .18s; z-index: 10;
}
.toast.on { opacity: 1; }
@media print {
  .bar, .toast { display: none; }
  body { background: #fff; }
  .qcard, .intro { break-inside: avoid; }
}
</style>
</head>
<body>
<div class="wrap">
<h1>Otázky pro autora hry</h1>
<p class="sub">Tajemství Nebákova · verze dotazníku __VERSION__ · __COUNT__ polí k vyplnění</p>

<div class="intro">
<p><strong>Jak to funguje.</strong> Klikněte do rámečku a pište. Nemusíte vyplnit
všechno a nemusíte to stihnout naráz — <strong>odpovědi se samy ukládají do tohoto
prohlížeče</strong>, takže stránku můžete zavřít a vrátit se k ní později (jen ji
otevírejte pořád ve stejném prohlížeči).</p>
<p><strong>Až budete hotoví</strong>, klepněte dole na <em>Zkopírovat odpovědi</em>
a vložte je do e‑mailu nebo zprávy. Nebo použijte <em>Stáhnout odpovědi</em> a pošlete
soubor jako přílohu.</p>
<p><strong>Nemáte-li čas na všechno:</strong> stačí otázky <strong>Q01–Q09 a Q18</strong>
— to jsou věci, které brání hru dohrát, a chybějící obsah. Zbytek jsou většinou
kontroly, jestli text sedí na správné kartě.</p>
<p><strong>Proč se ptám:</strong> karty jsem přebral z prezentace „KCD Troskovice“.
Na některých slidech je vysázeno víc karet vedle sebe a strojová extrakce nezachovala
jejich hranice — takže vím, že text existuje, ale ne vždy jistě, ke které kartě patří.
Konec prezentace se navíc nestáhl celý.</p>
<p class="sub" style="margin:.8rem 0 0">Značky u otázek: <strong>bez odpovědi nejde hru
dohrát</strong> · <strong>mění chování hry</strong> · <strong>ověření nebo
kosmetika</strong> (to poslední klidně přeskočte).</p>
</div>

__BODY__

<div class="bar">
  <span class="count" id="count"></span>
  <button id="copy" class="primary">Zkopírovat odpovědi</button>
  <button id="download">Stáhnout odpovědi</button>
  <button id="clear">Vymazat vše</button>
</div>
</div>
<div class="toast" id="toast"></div>

<script>
const FIELDS = __FIELDS__;
const VERSION = __VERSION_JSON__;
const KEY = "nebakov-dotaznik-v" + VERSION;
const inputs = FIELDS.map((f) => document.getElementById(f.id)).filter(Boolean);
const required = FIELDS.filter((f) => !f.optional).length;

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 2200);
}

function save() {
  const data = {};
  for (const el of inputs) if (el.value.trim()) data[el.dataset.field] = el.value;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* full or blocked */ }
}

function restore() {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (err) { data = {}; }
  for (const el of inputs) if (data[el.dataset.field]) el.value = data[el.dataset.field];
}

function refresh() {
  let done = 0;
  for (const el of inputs) {
    const filled = el.value.trim().length > 0;
    el.closest(".field, td")?.classList.toggle("filled", filled);
    const field = FIELDS.find((f) => f.id === el.dataset.field);
    if (filled && field && !field.optional) done += 1;
  }
  document.getElementById("count").textContent =
    "Vyplněno " + done + " z " + required + " otázek";
}

/** Plain text, because it gets pasted into a mail and read by a person and a program. */
function asText() {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    "Odpovědi k dotazníku — Tajemství Nebákova",
    "verze dotazníku: " + VERSION + " · vyplněno: " + stamp,
    "",
  ];
  for (const field of FIELDS) {
    const el = document.getElementById(field.id);
    const value = (el?.value || "").trim();
    if (!value) continue;
    lines.push("[" + field.id + "] " + field.label);
    lines.push(value);
    lines.push("");
  }
  if (lines.length === 3) lines.push("(nic nevyplněno)");
  return lines.join("\\n");
}

for (const el of inputs) {
  el.addEventListener("input", () => { save(); refresh(); });
}

document.getElementById("copy").addEventListener("click", async () => {
  const text = asText();
  try {
    await navigator.clipboard.writeText(text);
    toast("Odpovědi zkopírovány do schránky");
  } catch (err) {
    // clipboard is blocked on file:// in some browsers — fall back to a selection
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.("copy");
    area.remove();
    toast(ok ? "Odpovědi zkopírovány do schránky" : "Kopírování nešlo — použijte Stáhnout");
  }
});

document.getElementById("download").addEventListener("click", () => {
  const blob = new Blob([asText()], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "odpovedi-nebakov.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Soubor uložen");
});

document.getElementById("clear").addEventListener("click", () => {
  if (!confirm("Vymazat všechny vyplněné odpovědi?")) return;
  for (const el of inputs) el.value = "";
  try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  refresh();
  toast("Vymazáno");
});

restore();
refresh();
</script>
</body>
</html>
"""


def build(out_path):
    markdown = open(SOURCE, encoding="utf-8").read()
    version = "1"
    match = re.search(r"Verze dotazníku:\s*\*\*(\d+)\*\*", markdown)
    if match:
        version = match.group(1)

    sections, fields = parse(markdown)

    body = []
    for section in sections:
        body.append('<section class="section">')
        body.append(f"<h2>{inline(section['title'])}</h2>")
        lead = "".join(section.get("intro", []))
        if lead.strip():
            body.append(f'<div class="lead">{lead}</div>')
        for question in section["questions"]:
            priority = question["priority"]
            # the field for a single-answer question already owns that bare id
            body.append(f'<article class="qcard {priority}" id="otazka-{question["id"]}">')
            body.append(
                f'<div class="qhead"><span class="qid">{question["id"]}</span>'
                f'<span class="qtitle">{inline(question["title"])}</span>'
                f'<span class="prio">{PRIORITY_LABEL[priority]}</span></div>')
            body.extend(question["body"])
            body.append("</article>")
        body.append("</section>")

    # tables need their own scroll container so the page never scrolls sideways
    rendered = "\n".join(body)
    rendered = rendered.replace("<table>", '<div class="tablewrap"><table>')
    rendered = rendered.replace("</table>", "</table></div>")

    required = sum(1 for f in fields if not f.get("optional"))
    page = (PAGE
            .replace("__BODY__", rendered)
            .replace("__FIELDS__", json.dumps(fields, ensure_ascii=False))
            .replace("__VERSION_JSON__", json.dumps(version))
            .replace("__VERSION__", html.escape(version))
            .replace("__COUNT__", str(required)))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(page)

    print(f"{out_path}: {round(len(page.encode()) / 1024)} KB")
    print(f"  sekcí: {len(sections)} | otázek: {sum(len(s['questions']) for s in sections)}"
          f" | polí: {len(fields)} (z toho povinných {required})")
    duplicates = [f["id"] for f in fields if [g["id"] for g in fields].count(f["id"]) > 1]
    if duplicates:
        print(f"  chyba: opakující se id polí: {sorted(set(duplicates))}", file=sys.stderr)
        return 1
    return 0


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    if not os.path.exists(SOURCE):
        print(f"chyba: {SOURCE} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
        return 2
    return build(out)


if __name__ == "__main__":
    raise SystemExit(main())
