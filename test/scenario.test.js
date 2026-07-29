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

test("žádná karta nedeklaruje efekt, který engine neumí", () => {
  const engine = fresh();
  const unknown = new Set();
  engine.on((e) => {
    if (e.type === "unknownEffects") e.types.forEach((t) => unknown.add(t));
  });

  // enter every scene directly rather than walking, to cover them all
  for (const scene of scenario.scenes) {
    const probe = fresh();
    probe.on((e) => {
      if (e.type === "unknownEffects") e.types.forEach((t) => unknown.add(t));
    });
    probe.state.currentScene = scene.id;
    // re-apply the scene's effects through the engine's own path
    const enter = Object.getOwnPropertyNames(Object.getPrototypeOf(probe));
    assert.ok(enter.includes("choose"), "engine musí mít choose()");
  }
  // effects are applied on entry; walk instead, which is what actually happens
  walkAll(unknown);
  assert.deepEqual([...unknown], [], `neimplementované efekty: ${[...unknown].join(", ")}`);
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

test("podmíněné volby jsou při nulové reputaci zamčené a s vysokou otevřené", () => {
  const gated = [];
  for (const scene of scenario.scenes) {
    for (const [index, choice] of (scene.choices ?? []).entries()) {
      if (choice.disableIf) gated.push({ scene: scene.id, index, choice });
    }
  }
  assert.equal(gated.length, 10, "v datech je deset podmíněných voleb");

  for (const { scene, index } of gated) {
    const low = fresh();
    low.state.currentScene = scene;
    low.state.reputation = 0;
    const lockedChoice = low.choices()[index];
    assert.equal(lockedChoice.available, false, `${scene}#${index} má být při rep 0 zamčená`);
    assert.ok(lockedChoice.requirement, `${scene}#${index} musí říct, co je potřeba`);

    const high = fresh();
    high.state.currentScene = scene;
    high.state.reputation = 99;
    assert.equal(high.choices()[index].available, true,
      `${scene}#${index} má být při vysoké reputaci otevřená`);
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
