import assert from "node:assert/strict";
import test from "node:test";

import { Engine } from "../src/core/engine.js";
import { createState, deserialise, serialise } from "../src/core/state.js";
import { draw, initDeck, timesDrawn } from "../src/core/decks.js";
import * as ruleModule from "../src/core/rules.js";

/** Small hand-built scenario, so behaviour is checked against something readable. */
function fixture() {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "start",
        effects: [{ type: "reputation", value: 2 }],
        choices: [
          { icon: "stopy", text: "dál", goto: "b" },
          {
            icon: "lupa",
            text: "zamčeno",
            goto: "c",
            disableIf: [{ type: "reputation", operator: "<", value: 5 }],
          },
        ],
      },
      { id: "b", text: "prostřed", choices: [{ text: "na konec", goto: "c" }] },
      { id: "c", text: "konec", ending: true, choices: [] },
    ],
  };
}

test("vstupní karta se načte a její efekty se aplikují", () => {
  const engine = new Engine(fixture());
  assert.equal(engine.card.id, "a");
  assert.equal(engine.state.reputation, 2);
  assert.equal(engine.state.visited.a, 1);
});

test("volba pod hranicí reputace zůstává vidět, ale zamčená", () => {
  const engine = new Engine(fixture());
  const [open, locked] = engine.choices();
  assert.equal(open.available, true);
  assert.equal(locked.available, false);
  assert.equal(locked.locked, true);
  assert.equal(locked.requirement, "reputace 5 nebo více");
});

test("zamčenou volbu nelze vzít ani obejít indexem", () => {
  const engine = new Engine(fixture());
  assert.throws(() => engine.choose(1), /zamčená/);
  assert.equal(engine.card.id, "a", "karta se nesmí změnit");
});

test("schopnost Tupce odemkne podmínku právě jednou", () => {
  const engine = new Engine(fixture());
  engine.state.pendingIgnoreChoiceCondition = true;

  const [, locked] = engine.choices();
  assert.equal(locked.available, true);
  assert.equal(locked.unlockedByAbility, true);

  engine.choose(1);
  assert.equal(engine.card.id, "c");
  assert.equal(engine.state.pendingIgnoreChoiceCondition, false, "schopnost se spotřebuje");
});

test("karta s ending ukončí hru", () => {
  const engine = new Engine(fixture());
  engine.choose(0);
  engine.choose(0);
  assert.equal(engine.card.id, "c");
  assert.equal(engine.finished, true);
});

test("undo vrátí kartu i reputaci před rozhodnutím", () => {
  const scenario = fixture();
  scenario.scenes[1].effects = [{ type: "reputation", value: -1 }];
  const engine = new Engine(scenario);

  assert.equal(engine.state.reputation, 2);
  engine.choose(0);
  assert.equal(engine.state.reputation, 1, "efekt karty b se aplikoval");

  engine.undo();
  assert.equal(engine.card.id, "a");
  assert.equal(engine.state.reputation, 2, "reputace se vrátila");
  assert.equal(engine.state.visited.b, 0);
});

test("undo po konci hry hru znovu otevře", () => {
  const engine = new Engine(fixture());
  engine.choose(0);
  engine.choose(0);
  assert.equal(engine.finished, true);
  engine.undo();
  assert.equal(engine.finished, false);
});

test("ignore_reputation_loss zruší jen ztrátu, ne zisk", () => {
  const scenario = fixture();
  scenario.scenes[1].effects = [{ type: "reputation", value: -3 }];
  const engine = new Engine(scenario);
  engine.state.pendingIgnoreReputationLoss = true;

  engine.choose(0);
  assert.equal(engine.state.reputation, 2, "ztráta byla ignorována");
  assert.equal(engine.state.pendingIgnoreReputationLoss, false);
});

test("roleplay efekty se jen připomenou", () => {
  const scenario = fixture();
  scenario.scenes[1].effects = [{ type: "roleplay_cant_use_weapons" }];
  const engine = new Engine(scenario);
  engine.choose(0);

  const reminders = engine.takeReminders();
  assert.equal(reminders.length, 1);
  assert.match(reminders[0].text, /zbraně/);
  assert.equal(engine.takeReminders().length, 0, "čtením se fronta vyprázdní");
});

test("neznámý efekt se ohlásí, místo aby tiše nic neudělal", () => {
  const scenario = fixture();
  scenario.scenes[1].effects = [{ type: "vymyslene_neco" }];
  const engine = new Engine(scenario);

  const seen = [];
  engine.on((e) => seen.push(e));
  engine.choose(0);

  const reported = seen.find((e) => e.type === "unknownEffects");
  assert.ok(reported, "engine musí oznámit neznámý typ efektu");
  assert.deepEqual(reported.types, ["vymyslene_neco"]);
});

test("neznámý typ podmínky volbu zamkne, ne odemkne", () => {
  const scenario = fixture();
  scenario.scenes[0].choices[1].disableIf = [{ type: "neznama_podminka" }];
  const engine = new Engine(scenario);
  const [, locked] = engine.choices();
  assert.equal(locked.available, false);
  assert.match(locked.reason, /neznámý typ podmínky/);
});

test("stav se uloží a obnoví včetně rozehrané pozice", () => {
  const engine = new Engine(fixture());
  engine.choose(0);
  const saved = serialise(engine.state);

  const restored = new Engine(fixture(), { state: deserialise(saved) });
  assert.equal(restored.card.id, "b");
  assert.equal(restored.state.reputation, engine.state.reputation);
  assert.equal(restored.canUndo, true);
});

test("obnova odmítne stav z jiné verze", () => {
  const state = createState({ startScene: "a" });
  state.version = 999;
  assert.throws(() => deserialise(JSON.stringify(state)), /nepodporovaná verze/);
});

test("balíček se recykluje, takže se karta může objevit znovu", () => {
  const state = createState({ startScene: "a", seed: 42 });
  initDeck(state, { deckId: "N", cardIds: ["n1", "n2", "n3"], topCard: "n1" });

  assert.equal(state.decks.N.order[0], "n1", "topCard zůstane navrchu");
  const first = draw(state, "N");
  assert.equal(first, "n1");
  assert.equal(state.decks.N.order.length, 3, "karta se vrátila dospod");

  draw(state, "N");
  draw(state, "N");
  const again = draw(state, "N");
  assert.equal(again, "n1", "po projití balíčku přijde znovu");
  assert.equal(timesDrawn(state, "N", "n1"), 2);
});

test("stejný seed dává stejné míchání", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const one = createState({ seed: 7 });
  const two = createState({ seed: 7 });
  initDeck(one, { deckId: "N", cardIds: ids });
  initDeck(two, { deckId: "N", cardIds: ids });
  assert.deepEqual(one.decks.N.order, two.decks.N.order);

  const other = createState({ seed: 8 });
  initDeck(other, { deckId: "N", cardIds: ids });
  assert.notDeepEqual(other.decks.N.order, one.decks.N.order);
});

/* ------------------------------------------------------------------- quests */

function questFixture() {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "start",
        choices: [
          {
            icon: "stopy",
            text: "Úkol: Dojděte k lípě",
            goto: "b",
            quest: { id: "q1", kind: "travel", text: "Dojděte k lípě", completedAt: "b" },
          },
          {
            icon: "priroda",
            text: "Úkol: Nasbírejte byliny",
            goto: "c",
            quest: { id: "q2", kind: "nature", text: "Nasbírejte byliny", completedAt: "zz" },
          },
        ],
      },
      { id: "b", text: "u lípy", ending: true, choices: [] },
      { id: "c", text: "les", ending: true, choices: [] },
    ],
  };
}

test("úkol se založí volbou a splní příchodem na cíl", () => {
  const engine = new Engine(questFixture());
  assert.equal(engine.activeQuests.length, 0);

  engine.choose(0);
  assert.equal(engine.completedQuests.length, 1);
  const [quest] = engine.completedQuests;
  assert.equal(quest.id, "q1");
  assert.equal(quest.completedBy, "arrival");
  assert.equal(quest.startedAt, "a");
});

test("úkol s cílem jinde zůstane rozehraný", () => {
  const engine = new Engine(questFixture());
  engine.choose(1);
  assert.equal(engine.activeQuests.length, 1);
  assert.equal(engine.activeQuests[0].kind, "nature");
});

test("schopnost Milovníka přírody splní rozehraný přírodní úkol", () => {
  const engine = new Engine(questFixture());
  engine.choose(1);
  assert.equal(engine.activeQuests.length, 1);

  const { apply } = ruleModule;
  apply([{ type: "nature_quest_done" }], { state: engine.state, source: "role" });

  assert.equal(engine.activeQuests.length, 0);
  assert.equal(engine.completedQuests[0].kind, "nature");
});

test("undo vrátí i úkol, který rozhodnutí založilo", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  assert.equal(Object.keys(engine.state.quests).length, 1);

  engine.undo();
  assert.equal(Object.keys(engine.state.quests).length, 0, "úkol se nikdy nezadal");
  assert.equal(engine.card.id, "a");
});

test("ručně splněný úkol nelze splnit dvakrát", () => {
  const engine = new Engine(questFixture());
  engine.choose(1);
  const id = engine.activeQuests[0].id;
  assert.equal(engine.completeQuest(id), true);
  assert.equal(engine.completeQuest(id), false);
});
