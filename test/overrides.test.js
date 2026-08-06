/**
 * Text rewrites: storing them, applying them, noticing when the original moved,
 * and exporting them in a shape tools/apply_overrides.py can write.
 *
 * The last test in the file runs that tool, because an export nobody can apply is
 * the same as no export at all.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Engine } from "../src/core/engine.js";
import { memoryBackend } from "../src/platform/storage.js";
import {
  applyOverrides,
  applyRecord,
  createOverrides,
  currentValue,
  exportOverrides,
  fromEditorText,
  makeRecord,
  matchShape,
  questTextFor,
  recordKey,
  sameText,
  toEditorText,
} from "../src/platform/overrides.js";
import { cardView, editedFieldsOf, overridesView } from "../src/ui/view.js";

function scenario() {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        cardCode: "A01",
        text: ["První odstavec.", "Druhý<br>se zlomem."],
        choices: [
          { icon: "stopy", text: "Jít dál", goto: "b" },
          {
            icon: "priroda",
            text: "Úkol: Nasbírejte byliny",
            goto: "b",
            quest: { id: "q1", kind: "nature", text: "Nasbírejte byliny", completedAt: "b" },
            disableIf: [{ type: "reputation", operator: "<", value: 5 }],
            effects: [{ type: "reputation", value: -1 }],
          },
        ],
      },
      { id: "b", cardCode: "B01", text: "jednoduchý text", choices: [] },
    ],
  };
}

/* ------------------------------------------------------------------ text shape */

test("editor pracuje s odstavci oddělenými prázdným řádkem", () => {
  assert.equal(toEditorText(["A", "B"]), "A\n\nB");
  assert.deepEqual(fromEditorText("A\n\nB"), ["A", "B"]);
  assert.deepEqual(fromEditorText("A\n\n\n  B  "), ["A", "B"]);
});

test("<br> uvnitř odstavce editor nerozbije", () => {
  // The rendered paragraphs have their <br> split into lines; the editor must see
  // the raw text or saving would delete every hard break on the card.
  const raw = ["Seznam:<br>• jedna<br>• dvě"];
  assert.equal(toEditorText(raw), "Seznam:<br>• jedna<br>• dvě");
  assert.deepEqual(fromEditorText(toEditorText(raw)), raw);
});

test("tvar pole se při zápisu zachová", () => {
  assert.equal(matchShape("jeden", ["jeden"]), "jeden", "string zůstane stringem");
  assert.deepEqual(matchShape("jeden", ["a", "b"]), ["a", "b"], "dva odstavce už musí být pole");
  assert.deepEqual(matchShape(["a"], ["b"]), ["b"], "pole zůstane polem");
});

test("porovnání textu nezáleží na tvaru", () => {
  assert.equal(sameText("A\n\nB", ["A", "B"]), true);
  assert.equal(sameText(["A"], "A"), true);
  assert.equal(sameText(["A"], "B"), false);
});

/* -------------------------------------------------------------------- applying */

test("přepis změní text karty a nic jiného", () => {
  const data = scenario();
  const before = structuredClone(data.scenes[0].choices[1]);
  const record = makeRecord({
    cardId: "a",
    field: "text",
    value: ["Nový text."],
    base: data.scenes[0].text,
  });

  assert.equal(applyRecord(data, record), "applied");
  assert.deepEqual(data.scenes[0].text, ["Nový text."]);
  assert.deepEqual(data.scenes[0].choices[1], before, "volby se úpravou textu karty nedotkne");
});

test("přepis volby nesáhne na goto, podmínku ani efekty", () => {
  const data = scenario();
  const choice = data.scenes[0].choices[1];
  const record = makeRecord({
    cardId: "a",
    field: "choice",
    index: 1,
    value: "Úkol: Nasbírejte léčivé byliny",
    base: choice.text,
  });

  assert.equal(applyRecord(data, record), "applied");
  assert.equal(choice.text, "Úkol: Nasbírejte léčivé byliny");
  assert.equal(choice.goto, "b");
  assert.deepEqual(choice.disableIf, [{ type: "reputation", operator: "<", value: 5 }]);
  assert.deepEqual(choice.effects, [{ type: "reputation", value: -1 }]);
  assert.equal(choice.quest.id, "q1");
  assert.equal(choice.quest.completedAt, "b");
});

test("text úkolu jde s textem volby, aby se deník s tlačítkem nerozešel", () => {
  const data = scenario();
  const record = makeRecord({
    cardId: "a",
    field: "choice",
    index: 1,
    value: "Úkol: Nasbírejte léčivé byliny",
    base: data.scenes[0].choices[1].text,
  });
  applyRecord(data, record);
  assert.equal(data.scenes[0].choices[1].quest.text, "Nasbírejte léčivé byliny");
});

test("text úkolu se nechá být, když ve volbě nikdy nebyl", () => {
  const choice = { text: "Něco úplně jiného", quest: { text: "Nasbírejte byliny" } };
  assert.equal(questTextFor(choice, "Něco jiného"), null);
});

test("přepis se nepoužije, když se původní text mezitím změnil", () => {
  const data = scenario();
  const record = makeRecord({
    cardId: "a",
    field: "text",
    value: ["Můj text."],
    base: ["Text, který v datech už není."],
  });

  assert.equal(applyRecord(data, record), "stale");
  assert.deepEqual(data.scenes[0].text, ["První odstavec.", "Druhý<br>se zlomem."],
    "nová data se potichu nepřepíšou");
});

test("applyOverrides roztřídí použité, zastaralé a chybějící", () => {
  const data = scenario();
  const good = makeRecord({ cardId: "a", field: "text", value: ["Nový."], base: data.scenes[0].text });
  const stale = makeRecord({ cardId: "b", field: "text", value: ["X"], base: ["něco jiného"] });
  const missing = makeRecord({ cardId: "neexistuje", field: "text", value: ["X"], base: ["Y"] });

  const result = applyOverrides(data, [good, stale, missing]);
  assert.equal(result.applied.length, 1);
  assert.equal(result.resolved.length, 0);
  assert.equal(result.stale.length, 1);
  assert.equal(result.missing.length, 1);
  assert.equal(result.stale[0].current, "jednoduchý text", "u zastaralého se nese i aktuální text");
});

test("přepis, který mezitím dostal přesně to, co chtěl, se tiše vyřeší", () => {
  const data = scenario();
  // the base no longer matches — something else rewrote the field — but the
  // current text happens to already say exactly what the rewrite wanted
  const record = makeRecord({ cardId: "b", field: "text", value: ["jednoduchý text"], base: ["stará verze"] });

  assert.equal(applyRecord(data, record), "resolved");
  assert.equal(data.scenes[1].text, "jednoduchý text", "nic se nemuselo měnit");

  const result = applyOverrides(data, [record]);
  assert.equal(result.resolved.length, 1);
  assert.equal(result.stale.length, 0, "vyřešené není totéž jako zastaralé");
  assert.equal(result.applied.length, 0);
});

test("hra na přepsaných datech běží dál normálně", () => {
  const data = scenario();
  applyRecord(data, makeRecord({
    cardId: "a",
    field: "choice",
    index: 0,
    value: "Vyrazit dál",
    base: "Jít dál",
  }));

  const engine = new Engine(data);
  const view = cardView(engine, { records: [] });
  assert.equal(view.choices[0].text, "Vyrazit dál");
  assert.equal(view.choices[0].available, true);
  engine.choose(0);
  assert.equal(engine.card.id, "b", "graf zůstal nedotčený");
});

/* --------------------------------------------------------------------- storage */

test("přepisy se ukládají zvlášť od rozehrané hry", () => {
  const backend = memoryBackend();
  const store = createOverrides({ backend });
  const record = makeRecord({ cardId: "a", field: "text", value: ["N"], base: ["P"] });

  assert.equal(store.set("nebakov", record), true);
  assert.equal(store.list("nebakov").length, 1);

  const keys = [];
  for (let i = 0; i < backend.length; i += 1) keys.push(backend.key(i));
  assert.equal(keys.some((k) => k.startsWith("rwag:overrides:")), true);
  assert.equal(keys.some((k) => k.startsWith("rwag:save:")), false, "hra a texty se nemíchají");
});

test("druhá úprava téhož pole tu první nahradí", () => {
  const store = createOverrides({ backend: memoryBackend() });
  store.set("nebakov", makeRecord({ cardId: "a", field: "text", value: ["První"], base: ["P"] }));
  store.set("nebakov", makeRecord({ cardId: "a", field: "text", value: ["Druhá"], base: ["P"] }));

  const records = store.list("nebakov");
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].value, ["Druhá"]);
  assert.deepEqual(records[0].base, ["P"], "základem zůstává text z dat, ne první úprava");
});

test("vrácení jednoho přepisu a všech", () => {
  const store = createOverrides({ backend: memoryBackend() });
  store.set("nebakov", makeRecord({ cardId: "a", field: "text", value: ["X"], base: ["P"] }));
  store.set("nebakov", makeRecord({ cardId: "a", field: "choice", index: 1, value: "Y", base: "Q" }));
  assert.equal(store.list("nebakov").length, 2);

  assert.equal(store.remove("nebakov", { cardId: "a", field: "choice", index: 1 }), true);
  assert.equal(store.list("nebakov").length, 1);
  assert.equal(store.remove("nebakov", { cardId: "a", field: "choice", index: 1 }), false);

  store.clear("nebakov");
  assert.deepEqual(store.list("nebakov"), []);
});

test("bez úložiště se dá hrát, jen se nedá přepisovat", () => {
  const store = createOverrides({
    backend: {
      length: 0,
      key: () => null,
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    },
  });
  assert.equal(store.available, false);
  assert.equal(store.set("nebakov", makeRecord({ cardId: "a", field: "text", value: ["X"], base: ["P"] })), false);
  assert.deepEqual(store.list("nebakov"), []);
});

test("klíč záznamu rozlišuje kartu, pole i index volby", () => {
  assert.equal(recordKey({ cardId: "a", field: "text" }), "a|text");
  assert.equal(recordKey({ cardId: "a", field: "choice", index: 2 }), "a|choice|2");
});

/* ------------------------------------------------------------------ view model */

test("upravená karta to dá najevo v modelu", () => {
  const data = scenario();
  const records = [
    makeRecord({ cardId: "a", field: "text", value: ["Nový."], base: data.scenes[0].text }),
    makeRecord({ cardId: "a", field: "choice", index: 1, value: "Jinak", base: data.scenes[0].choices[1].text }),
  ];
  applyOverrides(data, records);

  const view = cardView(new Engine(data), { records });
  assert.equal(view.edited.any, true);
  assert.equal(view.edited.text, true);
  assert.deepEqual(view.edited.choices, [1]);
  assert.equal(view.choices[1].edited, true);
  assert.equal(view.choices[0].edited, false);
});

test("konfliktní přepis nerozsvítí odznak — text na obrazovce není jeho", () => {
  const data = scenario();
  // base does not match (something else changed the card) and the current
  // text is not the record's value either — a genuine, unresolved conflict
  const conflict = makeRecord({ cardId: "a", field: "text", value: ["Moje verze."], base: ["Stará verze."] });
  applyOverrides(data, [conflict]);
  assert.equal(applyRecord(scenario(), conflict), "stale", "ověření, že je to skutečně konflikt");

  const view = cardView(new Engine(data), { records: [conflict] });
  assert.equal(view.edited.any, false,
    "karta nesmí vypadat upraveně, když se zobrazuje text, který ten přepis nikdy nenastavil");
});

test("editedFieldsOf bez scénáře se chová jako dřív — nemá čím konflikt poznat", () => {
  const conflict = makeRecord({ cardId: "a", field: "text", value: ["Moje verze."], base: ["Stará verze."] });
  const view = editedFieldsOf([conflict], "a");
  assert.equal(view.any, true, "bez scénáře je přítomnost záznamu jediné vodítko");
});

test("seznam přepisů pozná ten, kterému se změnil originál", () => {
  const pristine = scenario();
  const records = [
    makeRecord({ cardId: "a", field: "text", value: ["Nový."], base: pristine.scenes[0].text }),
    makeRecord({ cardId: "b", field: "text", value: ["Můj."], base: ["starý text z dat"] }),
  ];

  const view = overridesView(records, { scenario: pristine, scenarioId: "test" });
  assert.equal(view.count, 2);
  assert.equal(view.staleCount, 1);
  assert.equal(view.items[0].stale, false);
  assert.equal(view.items[1].stale, true);
  assert.equal(view.items[1].currentPreview, "jednoduchý text", "vidět musí být obě verze");
  assert.equal(view.items[1].basePreview, "starý text z dat");
  assert.match(view.staleNote, /nepoužijí se ani nevyexportují/);
  assert.equal(view.items[0].cardCode, "A01");
});

/* --------------------------------------------------------------------- export */

test("export je seskupený po kartách a nese cestu k poli", () => {
  const pristine = scenario();
  const records = [
    makeRecord({ cardId: "a", field: "text", value: ["Nový text."], base: pristine.scenes[0].text }),
    makeRecord({
      cardId: "a",
      field: "choice",
      index: 1,
      value: "Úkol: Nasbírejte léčivé byliny",
      base: pristine.scenes[0].choices[1].text,
    }),
  ];

  const out = exportOverrides({ scenarioId: "test", records, scenario: pristine, build: "1.2.3" });
  assert.equal(out.format, "rwag-overrides/1");
  assert.equal(out.scenarioId, "test");
  assert.equal(out.build, "1.2.3");
  assert.equal(out.count, 2);
  assert.equal(out.cards.a.text.path, "text");
  assert.deepEqual(out.cards.a.text.value, ["Nový text."]);
  assert.equal(out.cards.a.choices[0].path, "choices[1].text");
  assert.equal(out.cards.a.choices[0].questPath, "choices[1].quest.text");
  assert.equal(out.cards.a.choices[0].questText, "Nasbírejte léčivé byliny");
  assert.deepEqual(out.stale, []);
});

test("zastaralý přepis se nevyexportuje, ale ani neztratí", () => {
  const pristine = scenario();
  const records = [makeRecord({ cardId: "b", field: "text", value: ["Můj."], base: ["už neplatí"] })];
  const out = exportOverrides({ scenarioId: "test", records, scenario: pristine });

  assert.equal(out.count, 0);
  assert.deepEqual(out.cards, {});
  assert.equal(out.stale.length, 1);
  assert.equal(out.stale[0].cardId, "b");
  assert.equal(out.stale[0].current, "jednoduchý text");
});

test("vyřešený přepis se z exportu úplně ztratí — není co hlásit", () => {
  const pristine = scenario();
  // base drifted, but the data already says exactly what the rewrite wanted
  const records = [makeRecord({ cardId: "b", field: "text", value: ["jednoduchý text"], base: ["stará verze"] })];
  const out = exportOverrides({ scenarioId: "test", records, scenario: pristine });

  assert.equal(out.count, 0);
  assert.deepEqual(out.cards, {});
  assert.deepEqual(out.stale, [], "vyřešené nepatří ani mezi zastaralé");
});

test("base se počítá proti datům, ne proti předchozí úpravě", () => {
  // The app keeps a pristine copy exactly for this: the second edit of a field
  // still has to be judged against what the repository says.
  const pristine = scenario();
  const working = scenario();
  const first = makeRecord({ cardId: "a", field: "text", value: ["Verze 1."], base: pristine.scenes[0].text });
  applyRecord(working, first);

  const second = makeRecord({
    cardId: "a",
    field: "text",
    value: ["Verze 2."],
    base: currentValue(pristine, { cardId: "a", field: "text" }),
  });
  const out = exportOverrides({ scenarioId: "test", records: [second], scenario: pristine });
  assert.equal(out.stale.length, 0, "druhá úprava není zastaralá");
  assert.deepEqual(out.cards.a.text.value, ["Verze 2."]);
});

/* ------------------------------------------------- the tool on the other end */

function withTempRepo(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rwag-overrides-"));
  const dir = path.join(root, "games", "test", "cards", "scenes");
  fs.mkdirSync(dir, { recursive: true });
  const cardPath = path.join(dir, "card_a.json");
  fs.writeFileSync(cardPath, `${JSON.stringify({
    id: "card_a",
    cardCode: "A01",
    text: ["První odstavec.", "Druhý<br>se zlomem."],
    choices: [
      {
        icon: "priroda",
        text: "Úkol: Nasbírejte byliny",
        goto: "card_b",
        quest: { id: "q1", kind: "nature", text: "Nasbírejte byliny", completedAt: "card_b" },
        disableIf: [{ type: "reputation", operator: "<", value: 5 }],
      },
    ],
  }, null, 2)}\n`);
  try {
    return fn({ root, cardPath });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runTool(root, exportData, args = []) {
  const file = path.join(root, "export.json");
  fs.writeFileSync(file, JSON.stringify(exportData, null, 2));
  // spawnSync rather than execFileSync: the tool reports what it refused to write
  // on stderr even when it exits 0, and execFileSync only hands back stdout
  const result = spawnSync("python3", [
    path.join(process.cwd(), "tools", "apply_overrides.py"),
    file,
    "--root",
    root,
    ...args,
  ], { encoding: "utf8" });
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

test("nástroj zapíše přepisy do souborů karet", () => {
  withTempRepo(({ root, cardPath }) => {
    const card = JSON.parse(fs.readFileSync(cardPath, "utf8"));
    const result = runTool(root, {
      format: "rwag-overrides/1",
      scenarioId: "test",
      build: "0.1.0",
      cards: {
        card_a: {
          text: { path: "text", base: card.text, value: ["Přepsaný odstavec."] },
          choices: [{
            path: "choices[0].text",
            index: 0,
            base: card.choices[0].text,
            value: "Úkol: Nasbírejte léčivé byliny",
            questPath: "choices[0].quest.text",
            questText: "Nasbírejte léčivé byliny",
          }],
        },
      },
      stale: [],
    });

    assert.equal(result.code, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(cardPath, "utf8"));
    assert.deepEqual(after.text, ["Přepsaný odstavec."]);
    assert.equal(after.choices[0].text, "Úkol: Nasbírejte léčivé byliny");
    assert.equal(after.choices[0].quest.text, "Nasbírejte léčivé byliny");
    assert.equal(after.choices[0].goto, "card_b", "cíl volby se nemění");
    assert.deepEqual(after.choices[0].disableIf, [{ type: "reputation", operator: "<", value: 5 }]);
    assert.match(result.stdout, /cards\.py build/);
  });
});

test("nástroj odmítne celý export, když se text mezitím změnil", () => {
  withTempRepo(({ root, cardPath }) => {
    const before = fs.readFileSync(cardPath, "utf8");
    const result = runTool(root, {
      format: "rwag-overrides/1",
      scenarioId: "test",
      cards: {
        card_a: {
          text: { path: "text", base: ["něco, co v datech není"], value: ["Přepsáno."] },
          choices: [{
            path: "choices[0].text",
            index: 0,
            base: "Úkol: Nasbírejte byliny",
            value: "Úkol: jiné byliny",
          }],
        },
      },
      stale: [],
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /nezapisuji nic/);
    assert.match(result.stderr, /card_a \/ text/);
    assert.equal(fs.readFileSync(cardPath, "utf8"), before,
      "ani ta správná úprava se nezapíše — všechno, nebo nic");
  });
});

test("nástroj odmítne cestu mimo texty", () => {
  withTempRepo(({ root, cardPath }) => {
    const before = fs.readFileSync(cardPath, "utf8");
    const result = runTool(root, {
      format: "rwag-overrides/1",
      scenarioId: "test",
      cards: {
        card_a: {
          choices: [{ path: "choices[0].goto", index: 0, base: "card_b", value: "card_x" }],
        },
      },
      stale: [],
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /nepodporovaná cesta/);
    assert.equal(fs.readFileSync(cardPath, "utf8"), before);
  });
});

test("nástroj nanečisto nic nezapíše a nahlásí zastaralé", () => {
  withTempRepo(({ root, cardPath }) => {
    const card = JSON.parse(fs.readFileSync(cardPath, "utf8"));
    const before = fs.readFileSync(cardPath, "utf8");
    const result = runTool(root, {
      format: "rwag-overrides/1",
      scenarioId: "test",
      cards: { card_a: { text: { path: "text", base: card.text, value: ["Nanečisto."] } } },
      stale: [{ cardId: "card_a", path: "choices[0].text", base: "x", value: "y", current: "z" }],
    }, ["--dry-run"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /nanečisto/);
    assert.match(result.stderr, /původní text se změnil/);
    assert.equal(fs.readFileSync(cardPath, "utf8"), before);
  });
});
