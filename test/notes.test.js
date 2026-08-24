/**
 * Field notes: writing them, keeping them, and getting them out.
 *
 * The point of the whole feature is that a sentence typed in a field survives
 * the rest of the day and reaches the repository, so most of what is checked
 * here is survival: notes outliving a deleted save, a cleared set of rewrites,
 * and a browser that will not store anything at all.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { memoryBackend } from "../src/platform/storage.js";
import { createNotes, makeNote, NOTES_PREFIX } from "../src/platform/notes.js";
import { createOverrides, exportOverrides, makeRecord } from "../src/platform/overrides.js";
import { Engine } from "../src/core/engine.js";
import { noteDraft, notesView, trailText } from "../src/ui/view.js";

function scenario() {
  return {
    gameId: "test",
    scenarioName: "Zkouška",
    startScene: "a",
    scenes: [
      { id: "a", cardCode: "A01", text: "start", choices: [{ text: "dál", goto: "b" }] },
      { id: "b", cardCode: "B01", text: "konec", ending: true, choices: [] },
    ],
  };
}

/* ------------------------------------------------------------------- záznam */

test("poznámka si pamatuje kartu, čas i polohu", () => {
  const note = makeNote({
    text: "  GPS mimo o 40 m  ",
    cardId: "card_C12",
    cardCode: "C12",
    position: { lat: 50.5028614, lon: 15.2031408 },
    at: "2026-08-24T13:05:11.000Z",
  });

  assert.equal(note.text, "GPS mimo o 40 m", "okraje se ořežou");
  assert.equal(note.cardCode, "C12");
  assert.equal(note.at, "2026-08-24T13:05:11.000Z");
  assert.equal(note.lat, 50.5028614);
  assert.ok(note.id, "poznámka musí jít adresovat, aby šla smazat");
});

test("poznámka bez signálu je pořád poznámka", () => {
  const note = makeNote({ text: "cesta rozbahněná", cardCode: "B04" });
  assert.equal(note.lat, null);
  assert.equal(note.lon, null);
  assert.equal(note.text, "cesta rozbahněná");
});

/* ------------------------------------------------------------------ ukládání */

test("poznámky se ukládají a čtou v pořadí, v jakém vznikly", () => {
  const notes = createNotes({ backend: memoryBackend() });
  notes.add("nebakov", makeNote({ text: "první", cardCode: "A01" }));
  notes.add("nebakov", makeNote({ text: "druhá", cardCode: "B01" }));

  assert.deepEqual(notes.list("nebakov").map((n) => n.text), ["první", "druhá"]);
});

test("prázdná poznámka se neuloží", () => {
  const notes = createNotes({ backend: memoryBackend() });
  assert.equal(notes.add("nebakov", makeNote({ text: "   " })), false);
  assert.deepEqual(notes.list("nebakov"), []);
});

test("poznámku jde smazat, překlep na telefonu se stane", () => {
  const notes = createNotes({ backend: memoryBackend() });
  const keep = makeNote({ text: "tahle platí" });
  const typo = makeNote({ text: "asdf" });
  notes.add("nebakov", keep);
  notes.add("nebakov", typo);

  assert.equal(notes.remove("nebakov", typo.id), true);
  assert.deepEqual(notes.list("nebakov").map((n) => n.text), ["tahle platí"]);
  assert.equal(notes.remove("nebakov", "neexistuje"), false);
});

test("poznámky každého scénáře stojí zvlášť", () => {
  const notes = createNotes({ backend: memoryBackend() });
  notes.add("nebakov", makeNote({ text: "z Nebákova" }));
  assert.deepEqual(notes.list("jiny"), []);
});

test("poznámky přežijí smazání rozehrané hry i vrácení všech přepisů", () => {
  // one browser, three keys: the save, the rewrites and the notes. Losing a day
  // of field notes because somebody restarted the game would be unforgivable.
  const backend = memoryBackend();
  const notes = createNotes({ backend });
  const overrides = createOverrides({ backend });

  notes.add("nebakov", makeNote({ text: "u mlýna chybí značka" }));
  overrides.set("nebakov", makeRecord({
    cardId: "a", field: "text", value: ["nový"], base: ["start"],
  }));

  backend.removeItem("rwag:save:nebakov");
  overrides.clear("nebakov");

  assert.deepEqual(notes.list("nebakov").map((n) => n.text), ["u mlýna chybí značka"]);
});

test("bez úložiště se dá hrát, jen se nedá zapisovat", () => {
  const notes = createNotes({ backend: null });
  assert.equal(notes.available, false);
  assert.equal(notes.add("nebakov", makeNote({ text: "x" })), false);
  assert.deepEqual(notes.list("nebakov"), []);
  assert.match(notes.lastError, /úložiště/);
});

test("poznámky z jiné verze se raději ignorují, než chybně přečtou", () => {
  const backend = memoryBackend();
  backend.setItem(`${NOTES_PREFIX}nebakov`, JSON.stringify({ v: 99, notes: [{ text: "?" }] }));
  const notes = createNotes({ backend });
  assert.deepEqual(notes.list("nebakov"), []);
  assert.match(notes.lastError, /jiné verze/);
});

/* -------------------------------------------------------------- pohledy a export */

test("koncept poznámky ukáže, k čemu se připne", () => {
  const engine = new Engine(scenario());
  const draft = noteDraft(engine, {
    position: { lat: 50.5028614, lon: 15.2031408 },
    at: "2026-08-24T13:05:11.000Z",
  });

  assert.equal(draft.cardId, "a");
  assert.equal(draft.cardCode, "A01");
  assert.equal(draft.contextLabel, "Karta A01 · 13:05 · 50.50286, 15.20314");
});

test("bez polohy to koncept přizná, ale nebrání psát", () => {
  const draft = noteDraft(new Engine(scenario()), { at: "2026-08-24T13:05:11.000Z" });
  assert.equal(draft.lat, null);
  assert.match(draft.contextLabel, /bez polohy/);
});

test("seznam poznámek má nejnovější nahoře", () => {
  const view = notesView([
    makeNote({ text: "první", cardCode: "A01", at: "2026-08-24T09:00:00.000Z" }),
    makeNote({ text: "druhá", cardCode: "B01", at: "2026-08-24T10:00:00.000Z" }),
  ]);

  assert.equal(view.count, 2);
  assert.equal(view.list[0].text, "druhá", "poslední zápis je ten, který se kontroluje");
  assert.equal(view.list[0].time, "10:00");
  assert.equal(view.list[0].place, null);
});

test("prázdný seznam to řekne", () => {
  const view = notesView([]);
  assert.equal(view.empty, true);
  assert.match(view.emptyLabel, /Zatím žádná/);
});

test("log průchodu obsahuje i to, co někdo napsal cestou", () => {
  const engine = new Engine(scenario());
  const text = trailText(engine, {
    scenarioName: "Zkouška",
    notes: [makeNote({
      text: "GPS mimo\na cesta rozbitá",
      cardCode: "A01",
      position: { lat: 50.5, lon: 15.2 },
      at: "2026-08-24T13:05:11.000Z",
    })],
  });

  assert.match(text, /POZNÁMKY \(1\)/);
  assert.match(text, /A01 @ 50\.50000,15\.20000/);
  assert.match(text, /GPS mimo/);
  assert.match(text, /a cesta rozbitá/, "víceřádková poznámka se nesmí useknout");

  assert.match(trailText(engine, {}), /POZNÁMKY \(0\)/);
});

test("export nese poznámky vedle přepisů, v jednom souboru", () => {
  const pristine = scenario();
  const out = exportOverrides({
    scenarioId: "test",
    records: [makeRecord({ cardId: "a", field: "text", value: ["nový"], base: pristine.scenes[0].text })],
    notes: [makeNote({ text: "u mlýna chybí značka", cardCode: "C12" })],
    scenario: pristine,
  });

  assert.equal(out.count, 1);
  assert.ok(out.cards.a.text, "přepis se pořád exportuje k zápisu");
  assert.equal(out.notes.length, 1);
  assert.equal(out.notes[0].cardCode, "C12");
});

test("samotné poznámky bez přepisů dají platný export", () => {
  const out = exportOverrides({
    scenarioId: "test",
    notes: [makeNote({ text: "jen poznámka" })],
    scenario: scenario(),
  });

  assert.equal(out.count, 0);
  assert.deepEqual(out.cards, {});
  assert.equal(out.notes.length, 1, "soubor má smysl i bez jediné úpravy textu");
});
