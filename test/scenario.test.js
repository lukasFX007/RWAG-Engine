/**
 * The engine driven against the real Nebákov data.
 *
 * These tests are the reason the engine exists: they walk the actual scenario,
 * so a change to a card that breaks a route fails here rather than on a hillside
 * in Troskovice.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { Engine } from "../src/core/engine.js";
import { deckSize, timesDrawn } from "../src/core/decks.js";
import { roleCardView, trailText } from "../src/ui/view.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const scenario = read("../games/nebakov/scenario.json");
const events = read("../games/nebakov/events.json");
const roles = read("../games/nebakov/roles.json").roles;

function fresh(options = {}) {
  return new Engine(scenario, { events, roles, seed: 1, ...options });
}

test("scénář se načte a začne na kartě A01", () => {
  const engine = fresh();
  assert.equal(engine.card.id, scenario.startScene);
  // The rules deck P is deliberately out of the flow: a digital game does not
  // explain how to handle pouches, so play opens with the introduction deck.
  assert.equal(engine.card.id, "card_A01");
});

/** Every card the graph can lead to, ignoring gates — reachability, not routes. */
function reachableScenes() {
  const adjacency = new Map(scenario.scenes.map((s) => [
    s.id, (s.choices ?? []).map((c) => c.goto).filter(Boolean),
  ]));
  const reached = new Set();
  const stack = [scenario.startScene];
  while (stack.length) {
    const node = stack.pop();
    if (reached.has(node)) continue;
    reached.add(node);
    stack.push(...(adjacency.get(node) ?? []));
  }
  return reached;
}

test("karty pravidel P01–P04 jsou mimo hru, P05 zůstává koncem", () => {
  const reached = reachableScenes();
  for (const id of ["card_P01", "card_P02", "card_P03", "card_P04"]) {
    assert.equal(reached.has(id), false, `${id} má být mimo hru`);
  }
  assert.equal(reached.has("card_P05"), true,
    "P05 je závěrečná obrazovka, na kterou míří konce z balíčku H");
});

test("balíček N se rozdá a N01 leží navrchu", () => {
  const engine = fresh();
  assert.equal(deckSize(engine.state, "N"), events.cards.length);
  assert.equal(engine.state.decks.N.order[0], events.topCard);
});

test("žádná karta nedeklaruje efekt, který engine neumí", async () => {
  // two ways round it: the walk covers every reachable card as it is played,
  // and the declared types are checked against the registry so unreachable
  // cards are covered too
  const unknown = new Set();
  walkAll(unknown);
  assert.deepEqual([...unknown], [],
    `neimplementované efekty na projité cestě: ${[...unknown].join(", ")}`);

  const { effects } = await import("../src/core/rules.js");
  const missing = new Set();
  for (const scene of [...scenario.scenes, ...events.cards]) {
    for (const effect of scene.effects ?? []) {
      if (!effects.has(effect.type)) missing.add(`${scene.id}: ${effect.type}`);
    }
  }
  assert.deepEqual([...missing], [], `neimplementované efekty v datech: ${[...missing]}`);
});

/** Depth-first walk taking every available choice, collecting problems. */
function walkAll(unknownSink = new Set()) {
  const visitedEdges = new Set();
  const endings = new Set();
  const errors = [];
  let steps = 0;

  const walk = (engine, path) => {
    steps += 1;
    if (steps > 20000) throw new Error("průchod se nezastavil (možný cyklus)");

    if (engine.finished) {
      endings.add(engine.card.id);
      return;
    }
    // a card meant for one player is handed over before play resumes
    if (engine.privateCard) engine.acknowledgePrivate();
    // a card can hold the group until something is done on it; the walk does it,
    // because the alternative reading is "every exit locked", which is a trap
    if (engine.progress) {
      engine.resolveProgress(engine.progress.outcomes?.[0]?.id ?? null);
    }
    const choices = engine.choices();
    const usable = choices.filter((c) => c.available && c.goto);

    if (usable.length === 0) {
      const card = engine.card;
      const hasAnyGoto = (card.choices ?? []).some((c) => c.goto);
      if (hasAnyGoto) {
        // every exit is gated and none is open on this route — a real trap
        errors.push(`${card.id}: všechny výstupy zamčené (cesta ${path.join(" → ")})`);
      } else if (!card.ending) {
        errors.push(`${card.id}: slepá ulička bez ending (cesta ${path.join(" → ")})`);
      }
      return;
    }

    for (const choice of usable) {
      const edge = `${engine.card.id}#${choice.index}`;
      if (visitedEdges.has(edge)) continue;
      visitedEdges.add(edge);

      const branch = new Engine(scenario, {
        events,
        roles,
        state: structuredClone(engine.state),
      });
      branch.on((e) => {
        if (e.type === "unknownEffects") e.types.forEach((t) => unknownSink.add(t));
      });
      try {
        branch.choose(choice.index);
        // a task does not move the group; carrying it out does
        if (branch.pendingTask) branch.confirmArrival();
      } catch (err) {
        errors.push(`${engine.card.id}#${choice.index}: ${err.message}`);
        continue;
      }
      walk(branch, [...path, branch.card.id]);
    }
  };

  const start = fresh();
  start.on((e) => {
    if (e.type === "unknownEffects") e.types.forEach((t) => unknownSink.add(t));
  });
  walk(start, [start.card.id]);
  return { visitedEdges, endings, errors, steps };
}

/**
 * Dead ends that are known content gaps, listed in docs/content-status.md.
 * The list exists so a *new* dead end still fails the suite, and the test below
 * asserts every entry is still a dead end — so the list cannot quietly rot once
 * the card is fixed.
 */
const KNOWN_DEAD_ENDS = new Set([]);

test("celý graf lze projít bez neznámé slepé uličky a bez chyby", () => {
  const { errors, endings, visitedEdges } = walkAll();
  const unexpected = errors.filter(
    (e) => ![...KNOWN_DEAD_ENDS].some((id) => e.startsWith(`${id}:`)),
  );
  assert.deepEqual(unexpected, [], unexpected.join("\n"));
  assert.ok(visitedEdges.size > 150, `projito jen ${visitedEdges.size} hran`);
  assert.ok(endings.size >= 1, "hra musí mít dosažitelný konec");
});

test("seznam známých slepých uliček je aktuální", () => {
  const { errors } = walkAll();
  for (const id of KNOWN_DEAD_ENDS) {
    assert.ok(
      errors.some((e) => e.startsWith(`${id}:`)),
      `${id} už slepá ulička není – odeber ji z KNOWN_DEAD_ENDS`,
    );
  }
});

test("hra dojde do konce označeného ending", () => {
  const { endings } = walkAll();
  for (const id of endings) {
    const scene = scenario.scenes.find((s) => s.id === id);
    assert.equal(scene.ending, true, `${id} ukončuje hru, ale nemá ending: true`);
  }
  assert.ok(endings.has("card_P05"), "card_P05 má být dosažitelný konec");
});

/* ------------------------------------------ what the author confirmed in v1 */

test("minuta ticha u pomníku se dá splnit jen jednou", () => {
  const engine = fresh();
  engine.state.currentScene = "card_B03";

  const silence = engine.choices().findIndex((c) => c.goto === "card_B02");
  assert.ok(silence >= 0, "z B03 musí vést volitelný úkol na B02");
  assert.equal(engine.choices()[silence].available, true);

  engine.choose(silence);
  engine.confirmArrival();
  assert.equal(engine.card.id, "card_B02");
  assert.equal(engine.state.reputation, 1);

  // B02 is the one place in the game that leads back where it came from, so the
  // task that got there has to close behind it or the loop never ends
  const back = engine.choices().findIndex((c) => c.goto === "card_B03");
  assert.ok(back >= 0, "B02 se musí vracet na B03");
  engine.choose(back);

  assert.equal(engine.card.id, "card_B03");
  const again = engine.choices().find((c) => c.goto === "card_B02");
  assert.equal(again.available, false, "splněný úkol se nesmí nabízet podruhé");
  assert.ok(engine.choices().some((c) => c.goto === "card_B04" && c.available));
});

/** Walk B04 -> B08, the card that ignores the herbalist, so its effects run. */
function ignoreHerbalist(engine) {
  engine.state.currentScene = "card_B04";
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_B08"));
  return engine;
}

test("prokletí na B08 zaplatí jen skupina, která má co ztratit", () => {
  const proud = fresh();
  proud.state.reputation = 5;
  ignoreHerbalist(proud);
  assert.equal(proud.state.reputation, 3, "reputace nad 3 stojí prokletí 2 body");

  const humble = fresh();
  humble.state.reputation = 2;
  ignoreHerbalist(humble);
  assert.equal(humble.state.reputation, 2, "pod hranicí se nesmí strhnout nic");
});

test("hrozba z B08 dožene skupinu na konci balíčku B", () => {
  const cursed = ignoreHerbalist(fresh());
  assert.ok(cursed.state.inventory.kletba_b08, "B08 má prokletí uložit");

  const drawn = [];
  cursed.on((event) => event.type === "encounter" && drawn.push(event.card.id));
  cursed.state.currentScene = "card_B06";
  cursed.choose(cursed.choices().findIndex((c) => c.goto === "card_C01"));
  assert.equal(drawn.length, 1, "odložení balíčku B má vyvolat setkání");

  const clean = fresh();
  const none = [];
  clean.on((event) => event.type === "encounter" && none.push(event.card.id));
  clean.state.currentScene = "card_B06";
  clean.choose(clean.choices().findIndex((c) => c.goto === "card_C01"));
  assert.equal(none.length, 0, "bez prokletí se nic tahat nemá");
});

test("na skálu G17 se dá dojít a lovčí čeká na G23", () => {
  const engine = fresh();
  engine.state.currentScene = "card_G21";
  engine.choose(0);
  engine.confirmArrival();
  assert.equal(engine.card.id, "card_G17");

  const huntsman = scenario.scenes.find((s) => s.id === "card_G23");
  assert.match(huntsman.text.join(" "), /lovčí/);
  assert.match(huntsman.text.join(" "), /N12/, "podmínka postupu je konkrétně N12");
});

test("každá hádanka balíčku N zná svoje řešení", () => {
  const riddles = events.cards.filter((c) => c.slug?.startsWith("hadankar"));
  assert.equal(riddles.length, 7, "autor potvrdil sedm hádanek");
  for (const riddle of riddles) {
    assert.ok(riddle.answer?.text, `${riddle.id} nemá řešení`);
    assert.ok(riddle.text.join(" ").includes("Co jsem?")
      || riddle.text.join(" ").includes("jejich jména?"),
      `${riddle.id} nemá dokončené zadání`);
  }
});

test("balíček N má dvacet karet s kódy N01 až N20", () => {
  const codes = events.cards.map((c) => c.cardCode).sort();
  const expected = Array.from({ length: 20 }, (_, i) => `N${String(i + 1).padStart(2, "0")}`);
  assert.deepEqual(codes, expected);
});

test("hra má čtyři závěry z balíčku H a všechny ústí do P05", () => {
  const reached = reachableScenes();
  for (const id of ["card_H20", "card_H22", "card_H25", "card_H26"]) {
    assert.ok(reached.has(id), `${id} má být dosažitelný závěr`);
    const scene = scenario.scenes.find((s) => s.id === id);
    assert.deepEqual((scene.choices ?? []).map((c) => c.goto), ["card_P05"],
      `${id} má vést na závěrečnou obrazovku P05`);
  }
});

test("trasa pomoci umírajícímu dává +1, ne +2", () => {
  // card_C05 -> card_C06 -> card_C07; the 😊 in the source sits only on C07
  const engine = fresh();
  engine.state.currentScene = "card_C05";
  engine.state.reputation = 1; // C05's choice needs a non-negative reputation

  const before = engine.state.reputation;
  const toC06 = engine.choices().findIndex((c) => c.goto === "card_C06");
  assert.ok(toC06 >= 0, "z C05 musí vést volba na C06");
  engine.choose(toC06);

  const toC07 = engine.choices().findIndex((c) => c.goto === "card_C07");
  assert.ok(toC07 >= 0, "z C06 musí vést volba na C07");
  engine.choose(toC07);

  assert.equal(engine.state.reputation - before, 1);
});

test("náhodné setkání se dá vytáhnout a balíček se recykluje", () => {
  const engine = fresh();
  const size = deckSize(engine.state, "N");

  const first = engine.drawEncounter();
  assert.ok(first, "z balíčku N musí jít vytáhnout karta");
  assert.equal(first.id, events.topCard);
  assert.equal(deckSize(engine.state, "N"), size, "karta se vrací dospod");

  for (let i = 0; i < size - 1; i += 1) engine.drawEncounter();
  const again = engine.drawEncounter();
  assert.equal(again.id, events.topCard, "po projití balíčku se karta objeví znovu");
  assert.equal(timesDrawn(engine.state, "N", events.topCard), 2);
});

test("uložení a obnovení uprostřed hry zachová pozici i balíček", () => {
  const engine = fresh();
  engine.choose(0);
  engine.choose(0);
  engine.drawEncounter();

  const saved = JSON.parse(JSON.stringify(engine.state));
  const restored = new Engine(scenario, { events, roles, state: saved });

  assert.equal(restored.card.id, engine.card.id);
  assert.deepEqual(restored.state.decks.N.order, engine.state.decks.N.order);
  assert.equal(restored.state.reputation, engine.state.reputation);
});

test("každá role deklaruje jen efekty, které engine zná", async () => {
  const { effects } = await import("../src/core/rules.js");
  const missing = new Set();
  for (const role of roles) {
    for (const key of ["advantages", "disadvantages"]) {
      for (const entry of role[key] ?? []) {
        const type = entry.effects?.type;
        if (type && !effects.has(type)) missing.add(type);
      }
    }
  }
  assert.deepEqual([...missing], [], `role používají neimplementované efekty: ${[...missing]}`);
});

test("úkol reálného scénáře drží cílovou kartu skrytou, dokud ho hráči nesplní", () => {
  const engine = fresh();
  // card_B10 sets the task "Dojděte k tisícileté lípě" and leads to card_B11
  engine.state.currentScene = "card_B10";
  const index = engine.choices().findIndex((c) => c.goto === "card_B11");
  assert.ok(index >= 0);

  engine.choose(index);
  assert.equal(engine.card.id, "card_B10", "karta B11 se nesmí odhalit hned");
  assert.equal(engine.activeQuests.length, 1);
  assert.match(engine.pendingTask.quest.text, /tisícileté lípě/);

  engine.confirmArrival();
  assert.equal(engine.card.id, "card_B11");
  assert.equal(engine.completedQuests.length, 1);
});

test("deník ukáže probíhající úkol, takže „Splnili jsme“ má co splnit", () => {
  const engine = fresh();
  engine.state.currentScene = "card_G13"; // Úkol: Spočítejte ovce v ohradě (příroda)
  const index = engine.choices().findIndex((c) => c.goto === "card_G14");
  assert.ok(index >= 0);

  engine.choose(index);
  assert.equal(engine.activeQuests.length, 1, "úkol musí být v deníku jako aktivní");
  assert.equal(engine.activeQuests[0].kind, "nature");
});

test("všechny úkolové volby mají anotaci a platný cíl", () => {
  const problems = [];
  for (const scene of scenario.scenes) {
    for (const [index, choice] of (scene.choices ?? []).entries()) {
      const isTask = (choice.text ?? "").startsWith("Úkol");
      if (isTask && !choice.quest) {
        problems.push(`${scene.id}#${index}: úkolová volba bez anotace quest`);
      }
      if (choice.quest) {
        if (choice.quest.completedAt !== choice.goto) {
          problems.push(`${scene.id}#${index}: quest.completedAt ≠ goto`);
        }
        if (!scenario.scenes.some((s) => s.id === choice.quest.completedAt)) {
          problems.push(`${scene.id}#${index}: quest míří na neexistující kartu`);
        }
      }
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

test("v datech jsou čtyři přírodní úkoly, které schopnost roli umí splnit", () => {
  const nature = [];
  for (const scene of scenario.scenes) {
    for (const choice of scene.choices ?? []) {
      if (choice.quest?.kind === "nature") nature.push(choice.quest.id);
    }
  }
  assert.equal(nature.length, 4, `přírodní úkoly: ${nature.join(", ")}`);
});

test("id úkolů jsou jedinečná", () => {
  const seen = new Map();
  for (const scene of scenario.scenes) {
    for (const choice of scene.choices ?? []) {
      const id = choice.quest?.id;
      if (!id) continue;
      assert.equal(seen.has(id), false, `duplicitní id úkolu ${id} (${seen.get(id)} a ${scene.id})`);
      seen.set(id, scene.id);
    }
  }
  assert.equal(seen.size, 46);
});

/* ---------------------------------------------------- roles on the real data */

test("reálné role se rozdělí a Pacifista dá +1 na začátku", () => {
  const engine = fresh();
  const before = engine.state.reputation;
  engine.dealRoles(8); // the deck has exactly eight roles

  assert.equal(engine.players.length, 8);
  assert.equal(new Set(engine.players.map((p) => p.roleId)).size, 8);
  assert.equal(engine.state.reputation, before + 1,
    "Pacifista je vždy ve hře při osmi hráčích a dává +1");
});

test("devět hráčů odmítne, protože rolí je osm", () => {
  const engine = fresh();
  assert.throws(() => engine.dealRoles(9), /víc než rolí/);
});

test("každá položka rolí má spouštěč", () => {
  const missing = [];
  for (const role of roles) {
    for (const key of ["advantages", "disadvantages"]) {
      for (const entry of role[key] ?? []) {
        if (!entry.trigger) missing.push(`${role.id}/${key}: ${entry.text?.slice(0, 40)}`);
      }
    }
  }
  assert.deepEqual(missing, [], missing.join("\n"));
});

test("schopnosti 1/hru odpovídají pěti rolím z pravidel", () => {
  const engine = fresh();
  engine.dealRoles(8);
  const types = engine.abilities.map((a) => a.type).sort();
  assert.deepEqual(types, [
    "ignore_choice_condition",
    "ignore_encounter",
    "ignore_reputation_loss",
    "nature_quest_done",
    "return_on_choice",
  ]);
});

test("Milovník přírody splní probíhající přírodní úkol reálné hry", () => {
  const engine = fresh();
  engine.dealRoles(8);
  engine.state.currentScene = "card_G13"; // Úkol: Spočítejte ovce v ohradě
  const index = engine.choices().findIndex((c) => c.goto === "card_G14");
  engine.choose(index);
  assert.equal(engine.activeQuests.length, 1);

  const lover = engine.players.find((p) => p.roleId === "vegetarian");
  engine.useAbility(lover.playerId, "nature_quest_done");
  assert.equal(engine.activeQuests.length, 0, "úkol je splněný schopností");
  assert.ok(engine.pendingTask, "příchod je ale potřeba pořád potvrdit");
});

test("Šlechtic zruší jednu ztrátu reputace na reálné kartě", () => {
  const engine = fresh();
  engine.dealRoles(8);
  const noble = engine.players.find((p) => p.roleId === "slechtic");
  engine.useAbility(noble.playerId, "ignore_reputation_loss");

  const before = engine.state.reputation;
  engine.state.currentScene = "card_C03";
  // card_C04 applies reputation -1
  engine.state.currentScene = "card_C02";
  const toC04 = engine.choices().findIndex((c) => c.goto === "card_C04");
  assert.ok(toC04 >= 0);
  engine.choose(toC04);
  assert.equal(engine.state.reputation, before, "ztráta byla ignorována");
});

/* ------------------------------------------- reputation gates, printed vs data */

/**
 * The cards print their gate in a bracket at the front of the choice, using the
 * notation from legend.json: 😊 is positive reputation (more than 0), 😐 is none
 * (exactly 0), 😡 is bad (less than 0). "😐 > 3" reads as more than three.
 *
 * disableIf states when a choice is LOCKED, so a gate of "at least N" is stored
 * as reputation < N. These two have to agree, or the game either offers an
 * action the cards forbid or withholds one they allow — which is how C04 and C05
 * came to have each other's condition.
 */
function printedGate(text) {
  // the bracket is usually first but not always — card_E05 writes
  // "Úkol [😐/😡]: …", so take the first bracket that talks about reputation
  const brackets = [...String(text ?? "").matchAll(/\[([^\]]*)\]/g)];
  const bracket = brackets.find((m) => /[😊😐😡]/u.test(m[1]));
  if (!bracket) return null;
  const inside = bracket[1].trim();

  const band = /😐\s*=\s*(-?\d+)\s*-\s*(-?\d+)/.exec(inside);
  if (band) return { min: Number(band[1]), max: Number(band[2]) };

  const above = /😐\s*>\s*(-?\d+)/.exec(inside);
  if (above) return { min: Number(above[1]) + 1, max: null };

  const below = /😐\s*<\s*(-?\d+)/.exec(inside);
  if (below) return { min: null, max: Number(below[1]) - 1 };

  const faces = new Set([...inside].filter((ch) => "😊😐😡".includes(ch)));
  const positive = faces.has("😊");
  const neutral = faces.has("😐");
  const bad = faces.has("😡");

  if (positive && neutral && !bad) return { min: 0, max: null };
  if (neutral && bad && !positive) return { min: null, max: 0 };
  if (positive && !neutral && !bad) return { min: 1, max: null };
  if (bad && !neutral && !positive) return { min: null, max: -1 };
  // a bare 😐 is "exactly zero" by the legend but reads as "not bad" on some
  // cards; which one applies cannot be told from the bracket alone
  return { underivable: true };
}

/**
 * Where the bracket alone does not settle the gate, the card has to say how it
 * was read — so an interpretation is never silently baked into the data. Today
 * that is card_H23's bare 😐, settled by complementarity with the [😡] branch
 * beside it and written into the card's todo.
 */

function gateFromData(choice) {
  const conds = (choice.disableIf ?? []).filter((c) => c.type === "reputation");
    if (!conds.length) return null;
  let min = null;
  let max = null;
  for (const cond of conds) {
    if (cond.operator === "<") min = cond.value;          // locked below  -> min
    else if (cond.operator === ">") max = cond.value;     // locked above  -> max
    else return { unsupported: cond.operator };
  }
  return { min, max };
}

test("vytištěná podmínka reputace odpovídá datům, u všech voleb", () => {
  const problems = [];
  const underivable = [];

  for (const scene of scenario.scenes) {
    for (const [index, choice] of (scene.choices ?? []).entries()) {
      const where = `${scene.id}#${index}`;
      const printed = printedGate(choice.text);
      const stored = gateFromData(choice);

      if (printed?.underivable) {
        // the gate cannot be derived, so demand the reasoning instead
        if (!scene.todo) {
          problems.push(`${where}: notace ⟨${choice.text.slice(0, 14)}⟩ nejde odvodit `
            + "ze závorky a karta nevysvětluje, jak byla přečtená");
        }
        underivable.push(where);
        continue;
      }
      if (!printed && stored) {
        problems.push(`${where}: data hradlují (${JSON.stringify(stored)}), karta nic netiskne`);
        continue;
      }
      if (printed && !stored) {
        problems.push(`${where}: karta tiskne ${JSON.stringify(printed)}, data hradlo nemají`);
        continue;
      }
      if (!printed) continue;
      if (stored.unsupported) {
        problems.push(`${where}: nepodporovaný operátor ${stored.unsupported}`);
        continue;
      }
      if (printed.min !== stored.min || printed.max !== stored.max) {
        problems.push(`${where}: karta ${JSON.stringify(printed)}, data ${JSON.stringify(stored)}`);
      }
    }
  }

  assert.deepEqual(problems, [], problems.join("\n"));
  assert.deepEqual(underivable, ["card_H23#0"],
    "změnil se seznam voleb, jejichž hradlo nejde odvodit ze závorky");
});

test("pásmo reputace se otevře jen uvnitř svých hranic", () => {
  // card_H17 splits the ending three ways: over 6, one to six, under one
  const at = (reputation) => {
    const engine = fresh();
    engine.state.currentScene = "card_H17";
    engine.state.reputation = reputation;
    return engine.choices().map((c) => c.available);
  };

  assert.deepEqual(at(7), [true, false, false], "nad 6 jen první větev");
  assert.deepEqual(at(6), [false, true, false], "šest padá do pásma 1-6");
  assert.deepEqual(at(1), [false, true, false], "jednička taky");
  assert.deepEqual(at(0), [false, false, true], "pod jedničkou třetí větev");
  assert.deepEqual(at(-3), [false, false, true]);

  for (const reputation of [-3, 0, 1, 6, 7]) {
    assert.equal(at(reputation).filter(Boolean).length, 1,
      `při rep ${reputation} musí být otevřená právě jedna větev`);
  }
});

test("hradlo se řídí reputací až po efektech karty, na které stojíme", () => {
  // card_C04 costs a point for grabbing the dying man's pouch, and only then may
  // the group offer help — so arriving with exactly 1 must close that door
  const arriveWith = (reputation) => {
    const engine = fresh();
    engine.state.currentScene = "card_C02";
    engine.state.reputation = reputation;
    const toC04 = engine.choices().findIndex((c) => c.goto === "card_C04");
    engine.choose(toC04);
    return engine;
  };

  const tight = arriveWith(1);
  assert.equal(tight.state.reputation, 0, "karta C04 sebrala bod");
  const helpTight = tight.choices().find((c) => c.goto === "card_C06");
  assert.equal(helpTight.available, false, "s reputací 0 už pomoc nabídnout nelze");
  assert.equal(helpTight.requirement, "reputace 1 nebo více");

  const roomy = arriveWith(2);
  assert.equal(roomy.state.reputation, 1);
  assert.equal(roomy.choices().find((c) => c.goto === "card_C06").available, true);
});

test("zamčenou volbu neprojde ani přímé zavolání choose", () => {
  const engine = fresh();
  engine.state.currentScene = "card_G15"; // [😐 > 5] => rep >= 6
  engine.state.reputation = 5;

  const index = engine.choices().findIndex((c) => c.locked);
  assert.ok(index >= 0);
  assert.throws(() => engine.choose(index), /zamčená/);
  assert.equal(engine.card.id, "card_G15", "karta se nesmí změnit");

  engine.state.reputation = 6;
  assert.equal(engine.choices()[index].available, true);
});

test("každé hradlo se otevře přesně na svých hranicích, ne o krok dřív", () => {
  const gated = [];
  for (const scene of scenario.scenes) {
    for (const [index, choice] of (scene.choices ?? []).entries()) {
      const gate = gateFromData(choice);
      if (gate) gated.push({ scene: scene.id, index, gate });
    }
  }
  assert.ok(gated.length >= 16, `hradel je jen ${gated.length}`);

  const availableAt = (sceneId, index, reputation) => {
    const engine = fresh();
    engine.state.currentScene = sceneId;
    engine.state.reputation = reputation;
    return engine.choices()[index].available;
  };

  for (const { scene, index, gate } of gated) {
    if (gate.min !== null) {
      assert.equal(availableAt(scene, index, gate.min - 1), false,
        `${scene}#${index} má být při rep ${gate.min - 1} zamčená`);
      assert.equal(availableAt(scene, index, gate.min), true,
        `${scene}#${index} má být při rep ${gate.min} otevřená`);
    }
    if (gate.max !== null) {
      assert.equal(availableAt(scene, index, gate.max + 1), false,
        `${scene}#${index} má být při rep ${gate.max + 1} zamčená`);
      assert.equal(availableAt(scene, index, gate.max), true,
        `${scene}#${index} má být při rep ${gate.max} otevřená`);
    }
  }
});

test("záporná reputace zamkne i to nejmírnější hradlo", () => {
  const engine = fresh();
  engine.state.currentScene = "card_C05"; // [😐/😊] => rep >= 0
  engine.state.reputation = -1;
  const help = engine.choices().find((c) => c.goto === "card_C06");
  assert.equal(help.available, false, "se špatnou pověstí pomoc nabídnout nelze");
  assert.equal(help.requirement, "reputace 0 nebo více");

  engine.state.reputation = 0;
  assert.equal(engine.choices().find((c) => c.goto === "card_C06").available, true);
});

/* ------------------------------- effects printed on a choice vs in the data */

/**
 * A few cards hang the consequence on the route rather than on either card:
 * "Pokračovat ➤ ⏳ a potom" owes a random encounter, and F14 charges two points
 * of reputation for standing in the wrong place. Both alternatives on those cards
 * lead to the same place, so the price can only live on the choice — and if it is
 * missing there, bad standing simply costs nothing.
 */
function printedEffects(text) {
  const gate = [...String(text ?? "").matchAll(/\[([^\]]*)\]/g)]
    .find((m) => /[😊😐😡]/u.test(m[1]));
  // strip the gate, whose faces are a condition rather than a consequence
  const rest = gate
    ? String(text).slice(0, gate.index) + String(text).slice(gate.index + gate[0].length)
    : String(text ?? "");

  const wanted = [];
  if (rest.includes("⏳")) wanted.push("encounter");
  const loss = (rest.match(/😡/gu) ?? []).length;
  const gain = (rest.match(/[🙂😊]/gu) ?? []).length;
  if (loss) wanted.push(`reputation:-${loss}`);
  if (gain) wanted.push(`reputation:+${gain}`);
  return wanted;
}

function storedEffects(choice) {
  return (choice.effects ?? []).flatMap((effect) => {
    // A conditional effect is not printed on the choice that fires it: B06 owes
    // an encounter only to a group carrying B08's curse, and it is B08 that says
    // so. Matching those against this card's text would always fail.
    if (effect.when) return [];
    if (effect.type === "encounter") return ["encounter"];
    if (effect.type === "reputation") {
      return [`reputation:${effect.value > 0 ? "+" : "-"}${Math.abs(effect.value)}`];
    }
    return [];
  });
}

test("efekt vytištěný u volby je i v datech", () => {
  const problems = [];
  for (const scene of scenario.scenes) {
    for (const [index, choice] of (scene.choices ?? []).entries()) {
      const wanted = printedEffects(choice.text).sort();
      const stored = storedEffects(choice).sort();
      if (wanted.length === 0 && stored.length === 0) continue;
      if (JSON.stringify(wanted) !== JSON.stringify(stored)) {
        problems.push(`${scene.id}#${index}: text žádá [${wanted}], data mají [${stored}] `
          + `— ⟨${choice.text.slice(0, 46)}⟩`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

test("volba se špatnou reputací na A13 zaplatí náhodným setkáním", () => {
  const engine = fresh();
  engine.state.currentScene = "card_A13";
  engine.state.reputation = -1;

  const encounters = [];
  engine.on((e) => { if (e.type === "encounter") encounters.push(e.card.id); });

  const list = engine.choices();
  assert.equal(list[0].available, false, "[😊] větev musí být zamčená");
  assert.equal(list[1].available, true, "[😐/😡] větev je ta pro špatnou reputaci");

  engine.choose(1);
  assert.equal(encounters.length, 1, "⏳ v textu volby musí vytáhnout kartu z balíčku N");
  assert.equal(engine.card.id, "card_A14");
});

test("dobrá reputace na A13 žádné setkání nevyvolá", () => {
  const engine = fresh();
  engine.state.currentScene = "card_A13";
  engine.state.reputation = 2;

  const encounters = [];
  engine.on((e) => { if (e.type === "encounter") encounters.push(e.card.id); });
  engine.choose(0);
  assert.equal(encounters.length, 0);
  assert.equal(engine.card.id, "card_A14");
});

test("F14 účtuje za špatné místo dva body a setkání", () => {
  const engine = fresh();
  engine.state.currentScene = "card_F14";
  engine.state.reputation = 5;

  const encounters = [];
  engine.on((e) => { if (e.type === "encounter") encounters.push(e.card.id); });
  engine.choose(1);

  assert.equal(engine.state.reputation, 3, "dva body dolů");
  assert.equal(encounters.length, 1);
});

test("efekt volby se undo vrátí", () => {
  const engine = fresh();
  engine.state.currentScene = "card_F14";
  engine.state.reputation = 5;
  engine.choose(1);
  assert.equal(engine.state.reputation, 3);

  engine.undo();
  assert.equal(engine.state.reputation, 5, "reputace se vrátila na hodnotu před volbou");
  assert.equal(engine.card.id, "card_F14");
});

test("počet hráčů na kartě P01 souhlasí s metadaty scénáře", () => {
  const p01 = scenario.scenes.find((s) => s.id === "card_P01");
  const text = Array.isArray(p01.text) ? p01.text.join(" ") : p01.text;
  const printed = /skupinu\s*(\d+)\s*[–-]\s*(\d+)\s*hráč/u.exec(text);

  assert.ok(printed, "karta P01 musí uvádět rozsah hráčů");
  assert.equal(Number(printed[1]), scenario.players_min,
    `karta říká od ${printed[1]}, metadata players_min ${scenario.players_min}`);
  assert.equal(Number(printed[2]), scenario.players_max,
    `karta říká do ${printed[2]}, metadata players_max ${scenario.players_max}`);
});

test("rozsah hráčů se vejde do počtu rolí", () => {
  assert.ok(scenario.players_max <= roles.length,
    `players_max ${scenario.players_max} přesahuje ${roles.length} rolí, `
    + "rozdání by muselo některou roli zdvojit");
  assert.ok(scenario.players_min >= 1);
  assert.ok(scenario.players_min <= scenario.players_max);
});

test("hra se rozdá i pro nejmenší povolený počet hráčů", () => {
  const engine = fresh();
  engine.dealRoles(scenario.players_min);
  assert.equal(engine.players.length, scenario.players_min);
  assert.equal(new Set(engine.players.map((p) => p.roleId)).size, scenario.players_min);
});

/* ------------------------------------------------------------ what we carry */

const items = read("../games/nebakov/items.json");

function withItems(options = {}) {
  return new Engine(scenario, { events, roles, items, seed: 1, ...options });
}

test("skupina vyráží s dopisem a první mapou", () => {
  const engine = withItems();
  assert.deepEqual(engine.inventory.map((i) => i.id).sort(), ["dopis", "mapa01"]);
});

test("bylinkář dá jednu bylinu zdarma a další za reputaci", () => {
  const engine = withItems();
  engine.state.reputation = 3;
  engine.state.currentScene = "card_B04";
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_B07"));
  assert.equal(engine.card.id, "card_B07");

  const herbs = () => engine.inventory.filter((i) => i.pool === "byliny");
  assert.equal(herbs().length, 1, "jedna bylina je od bylinkáře zdarma");

  const buy = () => engine.choices().findIndex((c) => c.goto === "card_B07");
  engine.choose(buy());
  assert.equal(herbs().length, 2, "druhá bylina stojí reputaci");
  assert.equal(engine.state.reputation, 2);
  assert.equal(herbs()[0].id !== herbs()[1].id, true, "šest bylin je šest různých stránek");

  // reputation runs out before the pool does
  engine.choose(buy());
  engine.choose(buy());
  assert.equal(engine.state.reputation, 0);
  assert.equal(engine.choices()[buy()].available, false, "bez reputace není čím platit");

  engine.state.reputation = 9;
  engine.choose(buy());
  assert.equal(herbs().length, 5);
  assert.equal(engine.choices()[buy()].available, false, "víc než pět bylin karta nedovolí");
});

test("píšťalku nelze odevzdat, dokud ji skupina nemá", () => {
  const engine = withItems();
  engine.state.currentScene = "card_G18";
  const handOver = engine.choices().findIndex((c) => c.goto === "card_G13");
  assert.equal(engine.choices()[handOver].available, false);
  assert.match(engine.choices()[handOver].requirement, /píšťalk|pistalka/);

  engine.state.currentScene = "card_F04";
  const other = withItems();
  other.state.currentScene = "card_F05";
  // entering F05 is what hands the whistle over, so walk in rather than jump
  other.state.currentScene = "card_F03";
  const toF05 = other.choices().findIndex((c) => c.goto === "card_F05");
  if (toF05 >= 0) {
    other.choose(toF05);
    assert.ok(other.inventory.some((i) => i.id === "pistalka"), "F05 dává píšťalku");
  }
});

test("mapy přibývají tam, kde je karta předává", () => {
  const engine = withItems();
  const has = (id) => engine.inventory.some((i) => i.id === id);

  assert.equal(has("mapa02"), false);
  engine.state.currentScene = "card_C14";
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_C16"));
  assert.equal(has("mapa02"), true, "C16 vydává mapu 2");

  assert.equal(has("mapa03"), false);
  engine.state.currentScene = "card_G16";
  engine.state.reputation = 9;
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_G20"));
  assert.equal(has("mapa03"), true, "G20 vydává mapu 3");
});

test("log průchodu zaznamená karty, reputaci i polohu", () => {
  const engine = withItems();
  engine.state.currentScene = "card_B04";
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_B08"),
    { position: { lat: 50.5123, lon: 15.2456, zones: [] } });

  const log = trailText(engine, { scenarioName: "Test", version: "x" });
  assert.match(log, /Průchod hrou — Test/);
  assert.match(log, /B04 → B08/);
  assert.match(log, /50\.51230,15\.24560/);
  // the letter, the first map, and the curse B08 leaves behind
  assert.match(log, /INVENTÁŘ \(3\)/);
  assert.match(log, /Prokletí od bylinkáře/);
});

/* -------------------------------------------------- podmínky postupu (Fáze 2) */

const PROGRESS_CARDS = ["card_C25", "card_C26", "card_D06", "card_G17",
  "card_G23", "card_H03", "card_H05", "card_H11"];

test("osm karet drží skupinu, dokud se podmínka postupu nevyhodnotí", () => {
  for (const id of PROGRESS_CARDS) {
    const engine = withItems();
    engine.state.currentScene = id;
    // entering is what arms it, so walk in through the engine rather than jump
    engine.state.progressDone = {};
    const scene = scenario.scenes.find((s) => s.id === id);
    assert.ok(scene.progress, `${id} nemá deklarovanou podmínku postupu`);

    const armed = new Engine(scenario, { events, roles, items, seed: 1 });
    armed.state.currentScene = "card_A01";
    armed.state.progressDone = {};
    // #enter is private; the public way in is a choice, so arm it by hand the
    // same way the engine does and then check the lock the players would meet
    armed.state.pendingProgress = { ...scene.progress, scene: id };
    armed.state.currentScene = id;

    const choices = armed.choices();
    assert.ok(choices.length > 0, `${id} nemá žádnou volbu`);
    assert.ok(choices.every((c) => !c.available),
      `${id}: volby mají být zamčené, dokud podmínka platí`);

    armed.resolveProgress(scene.progress.outcomes?.[0]?.id ?? null);
    assert.equal(armed.progress, null);
    assert.ok(armed.choices().some((c) => c.available), `${id}: po splnění se má odemknout`);
  }
});

test("podmínka postupu se natáhne při vstupu na kartu a podruhé už ne", () => {
  const engine = withItems();
  engine.state.currentScene = "card_H10";
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_H11"));
  assert.equal(engine.card.id, "card_H11");
  assert.ok(engine.progress, "H11 má podmínku postupu");
  assert.equal(engine.choices().every((c) => !c.available), true);

  const drawn = [];
  engine.on((e) => e.type === "encounter" && drawn.push(e.card.id));
  engine.resolveProgress();
  assert.equal(drawn.length, 1, "vyhodnocení podmínky tahá z balíčku N");
  assert.equal(engine.progress, null);
  assert.equal(engine.state.progressDone["card_H11"], true);
});

test("lovčí na G23 platí jen za dva úspěchy", () => {
  const scene = scenario.scenes.find((s) => s.id === "card_G23");
  assert.equal(scene.progress.card, "card_N12");
  assert.deepEqual(scene.progress.outcomes.map((o) => o.id), ["uspech", "neuspech"]);

  const won = withItems();
  won.state.pendingProgress = { ...scene.progress, scene: "card_G23" };
  won.state.currentScene = "card_G23";
  const before = won.state.reputation;
  const seen = [];
  won.on((e) => e.type === "encounter" && seen.push(e.card.id));
  won.resolveProgress("uspech");
  assert.deepEqual(seen, ["card_N12"], "podmínka ukazuje právě N12, ne náhodnou kartu");
  assert.equal(won.state.reputation, before + 1);

  const lost = withItems();
  lost.state.pendingProgress = { ...scene.progress, scene: "card_G23" };
  lost.state.currentScene = "card_G23";
  lost.resolveProgress("neuspech");
  assert.equal(lost.state.reputation, -1);
});

/* --------------------------------------------- osobní karty a role (Fáze 3) */

test("klatba z C11 se předává jednomu hráči a drží, dokud si nedá panáka", () => {
  const engine = withItems();
  engine.state.currentScene = "card_C08";
  engine.choose(engine.choices().findIndex((c) => c.goto === "card_C10"));
  if (engine.pendingTask) engine.confirmArrival();

  const priv = engine.privateCard;
  assert.ok(priv, "C10 má předat kartu C11 jednomu hráči");
  assert.equal(priv.cardId, "card_C11");
  assert.equal(priv.keep, true);
  assert.ok(engine.choices().every((c) => !c.available),
    "dokud si kartu nepřečte, hra nepokračuje");

  engine.acknowledgePrivate();
  assert.equal(engine.privateCard, null);
  assert.ok(engine.choices().some((c) => c.available));

  const held = engine.heldCards;
  assert.equal(held.length, 1);
  assert.equal(held[0].card.held.banner, "Klatba: nemůžeš mluvit");

  assert.equal(engine.releaseHeldCard("card_C11"), true);
  assert.deepEqual(engine.heldCards, []);
  assert.equal(engine.releaseHeldCard("card_C11"), false, "podruhé už není co rušit");
});

test("nápovědu D12 vidí jen dva strážní a nikdo si ji nenechává", () => {
  const engine = withItems();
  engine.state.currentScene = "card_D02";
  const activity = engine.choices().findIndex((c) => c.goto === "card_D02");
  assert.ok(activity >= 0, "D02 má volitelnou aktivitu se strážemi");
  engine.choose(activity);

  const priv = engine.privateCard;
  assert.equal(priv.cardId, "card_D12");
  assert.equal(priv.keep, false);
  assert.match(priv.audience, /stráže/);

  engine.acknowledgePrivate();
  assert.deepEqual(engine.heldCards, [], "nápověda se nenechává, jen přečte");
  assert.equal(engine.card.id, "card_D02", "po přečtení se pokračuje ze stejné karty");
});

test("Analfabet čte svou kartu přeházeně, ostatní ji čtou normálně", () => {
  const role = roles.find((r) => r.id === "analfabet");
  const player = { playerId: "p1", name: "Hráč 1", roleId: "analfabet" };

  const own = roleCardView(player, role, { own: true });
  const others = roleCardView(player, role, { own: false });

  assert.equal(own.ownView, true);
  assert.match(own.character.join(" "), /čvoljek/);
  assert.match(own.entries[0].text, /Nemušíš/);

  assert.equal(others.ownView, false);
  assert.match(others.character.join(" "), /člověk pocházející/);
  assert.match(others.entries[0].text, /Nemusíš/);
});
