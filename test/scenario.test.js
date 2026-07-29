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

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const scenario = read("../games/nebakov/scenario.json");
const events = read("../games/nebakov/events.json");
const roles = read("../games/nebakov/roles.json").roles;

function fresh(options = {}) {
  return new Engine(scenario, { events, roles, seed: 1, ...options });
}

test("scénář se načte a začne na startScene", () => {
  const engine = fresh();
  assert.equal(engine.card.id, scenario.startScene);
  assert.equal(engine.card.id, "card_P01");
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
const KNOWN_DEAD_ENDS = new Set([
  // card B02 has no onward link in the source deck; the author has to supply it
  "card_B02",
]);

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
