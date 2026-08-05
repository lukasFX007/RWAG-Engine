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

test("úkol neodhalí cílovou kartu, dokud ho hráči nesplní", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);

  assert.equal(engine.card.id, "a", "zůstáváme na kartě, chůze je součást hry");
  assert.equal(engine.activeQuests.length, 1);
  assert.equal(engine.pendingTask.quest.text, "Dojděte k lípě");
  assert.equal(engine.pendingTask.to, "b");
});

test("během úkolu nelze vzít jinou volbu", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  const list = engine.choices();
  assert.ok(list.every((c) => !c.available));
  assert.equal(list[1].reason, "probíhá úkol");
  assert.throws(() => engine.choose(1), /zamčená|probíhá úkol/);
});

test("potvrzení splnění úkol uzavře a odhalí kartu", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  engine.confirmArrival();

  assert.equal(engine.card.id, "b");
  assert.equal(engine.activeQuests.length, 0);
  assert.equal(engine.completedQuests[0].completedBy, "confirmed");
  assert.equal(engine.pendingTask, null);
});

test("potvrzení s polohou se zaznamená jako ověřené polohou", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  engine.confirmArrival({ position: { lat: 50, lon: 15, zones: [] } });
  assert.equal(engine.completedQuests[0].completedBy, "position");
});

test("potvrzení bez rozehraného úkolu je chyba", () => {
  const engine = new Engine(questFixture());
  assert.throws(() => engine.confirmArrival(), /žádný úkol/);
});

test("rozmyšlený úkol lze zrušit a zůstat na místě", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  assert.equal(engine.cancelTask(), true);

  assert.equal(engine.card.id, "a");
  assert.equal(Object.keys(engine.state.quests).length, 0);
  assert.equal(engine.choices()[0].available, true, "volby jsou zas dostupné");
});

test("undo během úkolu úkol zahodí, aniž by spotřebovalo krok", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  assert.equal(engine.canUndo, true);

  engine.undo();
  assert.equal(Object.keys(engine.state.quests).length, 0, "úkol se nikdy nezadal");
  assert.equal(engine.card.id, "a");
  assert.equal(engine.state.history.length, 0);
});

test("undo po splnění úkol vrátí do rozehraného stavu", () => {
  const engine = new Engine(questFixture());
  engine.choose(0);
  engine.confirmArrival();
  assert.equal(engine.card.id, "b");

  engine.undo();
  assert.equal(engine.card.id, "a", "jsme zpátky před cílem");
  assert.equal(engine.activeQuests.length, 1, "úkol zas probíhá");
  assert.ok(engine.pendingTask, "a je znovu rozehraný");
});

test("ručně splněný úkol nelze splnit dvakrát", () => {
  const engine = new Engine(questFixture());
  engine.choose(1);
  const id = engine.activeQuests[0].id;
  assert.equal(engine.completeQuest(id), true);
  assert.equal(engine.completeQuest(id), false);
});

test("schopnost Milovníka přírody splní probíhající přírodní úkol", () => {
  const engine = new Engine(questFixture());
  engine.choose(1);
  assert.equal(engine.activeQuests[0].kind, "nature");

  ruleModule.apply([{ type: "nature_quest_done" }], { state: engine.state, source: "role" });
  assert.equal(engine.activeQuests.length, 0);
  assert.equal(engine.completedQuests[0].kind, "nature");
});

/* -------------------------------------------------------------------- roles */

import { abilitiesOf, dealRoles, passivesOf } from "../src/core/roles.js";

const ROLES = [
  {
    id: "tupec",
    name: "Tupec",
    advantages: [{ trigger: "once", effects: { type: "ignore_choice_condition" }, text: "[1/hru] …" }],
    disadvantages: [{ trigger: "always", effects: { type: "roleplay_twice_answer" }, text: "[vždy] …" }],
  },
  {
    id: "pacifista",
    name: "Pacifista",
    advantages: [{ trigger: "start", effects: { type: "reputation", value: 1 }, text: "[začátek] …" }],
    disadvantages: [{ trigger: "always", effects: { type: "roleplay_cant_use_weapons" }, text: "[vždy] …" }],
  },
  {
    id: "pedant",
    name: "Vzdělaný pedant",
    advantages: [{ trigger: "once", effects: { type: "return_on_choice" }, text: "[1/hru] …" }],
    disadvantages: [{ trigger: "consequence", effects: { type: "encounter" }, text: "[následek] …" }],
  },
];

function roleEngine(playerCount = 3) {
  const engine = new Engine(fixture(), { roles: ROLES, seed: 3 });
  engine.dealRoles(playerCount);
  return engine;
}

test("role se rozdělí po jedné na hráče", () => {
  const engine = roleEngine(3);
  assert.equal(engine.players.length, 3);
  const ids = engine.players.map((p) => p.roleId);
  assert.equal(new Set(ids).size, 3, "žádná role nesmí být ve hře dvakrát");
});

test("víc hráčů než rolí je chyba, ne opakování role", () => {
  const engine = new Engine(fixture(), { roles: ROLES });
  assert.throws(() => engine.dealRoles(4), /víc rolí|víc než rolí/);
});

test("efekt se spouštěčem start se aplikuje při rozdání", () => {
  const engine = new Engine(fixture(), { roles: ROLES, seed: 3 });
  const before = engine.state.reputation;
  engine.dealRoles(3);
  assert.equal(engine.state.reputation, before + 1, "Pacifista dává +1 na začátku");
});

test("schopnosti 1/hru se nabídnou a po utracení zmizí", () => {
  const engine = roleEngine(3);
  const offered = engine.abilities.map((a) => a.type);
  assert.ok(offered.includes("ignore_choice_condition"));

  const tupec = engine.players.find((p) => p.roleId === "tupec");
  engine.useAbility(tupec.playerId, "ignore_choice_condition");
  assert.equal(engine.abilities.some((a) => a.type === "ignore_choice_condition"), false);
  assert.throws(() => engine.useAbility(tupec.playerId, "ignore_choice_condition"), /vyčerpaná/);
});

test("schopnost Tupce reálně odemkne zamčenou volbu", () => {
  const engine = roleEngine(3);
  const tupec = engine.players.find((p) => p.roleId === "tupec");
  assert.equal(engine.choices()[1].available, false);

  engine.useAbility(tupec.playerId, "ignore_choice_condition");
  assert.equal(engine.choices()[1].available, true);
});

test("schopnost, kterou role nemá, nelze utratit", () => {
  const engine = roleEngine(3);
  const tupec = engine.players.find((p) => p.roleId === "tupec");
  assert.throws(() => engine.useAbility(tupec.playerId, "return_on_choice"), /nemá schopnost/);
});

test("Pedant vezme rozhodnutí zpět a zaplatí za to setkáním", () => {
  const engine = roleEngine(3);
  engine.choose(0);
  assert.equal(engine.card.id, "b");

  const pedant = engine.players.find((p) => p.roleId === "pedant");
  const seen = [];
  engine.on((e) => seen.push(e.type));
  engine.useAbility(pedant.playerId, "return_on_choice");

  assert.equal(engine.card.id, "a", "rozhodnutí se vrátilo");
  assert.ok(seen.includes("abilityUsed"));
  const used = engine.state.players.find((p) => p.playerId === pedant.playerId);
  assert.equal(used.usedOnce.return_on_choice, true);
});

test("pasivní pravidla se vrátí jako připomínky pro konkrétní hráče", () => {
  const engine = roleEngine(3);
  const list = engine.roleReminders();
  // Tupec a Pacifista mají pravidlo se spouštěčem „always“; Pedantova nevýhoda
  // je „consequence“, tedy cena za schopnost, ne trvalé pravidlo
  assert.equal(list.length, 2);
  assert.ok(list.every((r) => r.playerName && r.roleName && r.text));
  assert.deepEqual(
    list.map((r) => r.roleName).sort(),
    ["Pacifista", "Tupec"],
  );
});

test("rozdělení rolí je se stejným seedem stejné", () => {
  const a = new Engine(fixture(), { roles: ROLES, seed: 11 });
  const b = new Engine(fixture(), { roles: ROLES, seed: 11 });
  a.dealRoles(3);
  b.dealRoles(3);
  assert.deepEqual(a.players.map((p) => p.roleId), b.players.map((p) => p.roleId));
});

test("klasifikace položek role podle spouštěče", () => {
  assert.deepEqual(abilitiesOf(ROLES[0]).map((a) => a.type), ["ignore_choice_condition"]);
  assert.deepEqual(passivesOf(ROLES[0]).map((a) => a.type), ["roleplay_twice_answer"]);
  assert.deepEqual(abilitiesOf(ROLES[1]).map((a) => a.type), [], "start není 1/hru");
});

/* --------------------------------------------- one registry, one meaning */

/**
 * A condition answers "is this true now". `disableIf` shuts a choice when it is
 * true; `when` fires an effect when it is true. These pin that down, because an
 * earlier version inverted inside one handler and not the others, and the two
 * readings agree on every gate in the game except the ones that matter.
 */
test("disableIf zavírá volbu, když podmínka platí", () => {
  const scenario = {
    gameId: "t",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "",
        choices: [
          { text: "jen chudým", goto: "b", disableIf: [{ type: "reputation", operator: ">", value: 2 }] },
          { text: "jen s mapou", goto: "b", disableIf: [{ type: "has_item", item: "mapa", negate: true }] },
          { text: "jen bez mapy", goto: "b", disableIf: [{ type: "has_item", item: "mapa" }] },
        ],
      },
      { id: "b", text: "", ending: true, choices: [] },
    ],
  };

  const poor = new Engine(scenario);
  assert.equal(poor.choices()[0].available, true, "reputace 0 není nad 2");
  assert.equal(poor.choices()[1].available, false, "bez mapy je volba na mapu zavřená");
  assert.equal(poor.choices()[2].available, true);

  const rich = new Engine(scenario);
  rich.state.reputation = 5;
  rich.state.inventory.mapa = { id: "mapa", name: "mapa", count: 1 };
  assert.equal(rich.choices()[0].available, false, "reputace 5 je nad 2, volba se zavírá");
  assert.equal(rich.choices()[1].available, true);
  assert.equal(rich.choices()[2].available, false);
});

test("neznámá podmínka zamyká volbu, ale nespouští efekt", () => {
  const scenario = {
    gameId: "t",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "",
        choices: [{ text: "?", goto: "b", disableIf: [{ type: "vymyslena" }] }],
      },
      {
        id: "b",
        text: "",
        ending: true,
        effects: [{ type: "reputation", value: -3, when: [{ type: "vymyslena" }] }],
        choices: [],
      },
    ],
  };
  const engine = new Engine(scenario);
  const [choice] = engine.choices();
  assert.equal(choice.available, false, "neznámá podmínka nesmí bránu otevřít");
  assert.match(choice.reason, /neznámý typ podmínky/);

  // and the other way round: the same unknown condition must not charge anything
  engine.state.currentScene = "a";
  engine.state.reputation = 0;
  const forced = new Engine(scenario, { state: engine.state });
  forced.state.currentScene = "b";
  ruleModule.apply(scenario.scenes[1].effects, { state: forced.state, source: "b" });
  assert.equal(forced.state.reputation, 0, "neznámá podmínka nesmí efekt spustit");
});

/* ------------------------------------------------- arriving somewhere (Fáze 5) */

/** A task that names a place, so the arrival can be checked against a position. */
function placedFixture() {
  return {
    gameId: "t",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "",
        choices: [{
          text: "Úkol: Dojděte k lípě",
          goto: "b",
          quest: {
            id: "q1",
            kind: "travel",
            text: "Dojděte k lípě",
            at: { lat: 50.5486, lon: 15.2331, radius: 25, name: "tisíciletá lípa" },
          },
        }],
      },
      { id: "b", text: "", ending: true, choices: [] },
    ],
  };
}

const AT_TREE = { lat: 50.5486, lon: 15.2331, accuracy: 8, zones: [] };
const FAR_AWAY = { lat: 50.5600, lon: 15.2500, accuracy: 8, zones: [] };

test("bez polohy a bez souřadnic se skupině věří na slovo", () => {
  const plain = new Engine(fixture());
  plain.state.currentScene = "a";

  const placed = new Engine(placedFixture());
  placed.choose(0);
  // no position at all: nothing to check against
  assert.equal(placed.arrivalCheck({}), null);
  placed.confirmArrival();
  assert.equal(placed.card.id, "b");
});

test("když GPS říká, že tam nejste, hra se zeptá a nechá si odporovat", () => {
  const engine = new Engine(placedFixture());
  engine.choose(0);

  const check = engine.arrivalCheck({ position: FAR_AWAY });
  assert.equal(check.here, false);
  assert.ok(check.distance > 25, `vzdálenost ${check.distance} m`);
  assert.match(check.message, /Podle GPS jste/);
  assert.match(check.message, /tisíciletá lípa/);

  const refused = () => engine.confirmArrival({ position: FAR_AWAY });
  assert.throws(refused, (err) => err.code === "not_at_place");
  assert.equal(engine.card.id, "a", "karta se nesmí odhalit");
  assert.ok(engine.pendingTask, "úkol pořád probíhá");

  // the group insists, which is the author's rule: the app asks, it does not refuse
  engine.confirmArrival({ position: FAR_AWAY, override: true });
  assert.equal(engine.card.id, "b");
});

test("na místě se potvrzení nikoho na nic neptá", () => {
  const engine = new Engine(placedFixture());
  engine.choose(0);
  assert.equal(engine.arrivalCheck({ position: AT_TREE }).here, true);
  engine.confirmArrival({ position: AT_TREE });
  assert.equal(engine.card.id, "b");
  const quest = engine.completedQuests[0];
  assert.equal(quest.completedBy, "position", "splněno podle polohy, ne na slovo");
});

/* ------------------------------------------------------- akce mimo karty */

function withActions() {
  const scenario = fixture();
  scenario.groupActions = [{
    id: "ask_locals",
    icon: "lupa",
    title: "Požádat místní o pomoc",
    text: "Poradí vám s cestou.",
    effects: [{ type: "reputation", value: -1 }],
    disableIf: [{ type: "reputation", operator: "<", value: 1 }],
  }];
  return scenario;
}

test("akce skupiny stojí reputaci a zamkne se, jakmile není kladná", () => {
  const engine = new Engine(withActions());
  assert.equal(engine.state.reputation, 2, "úvodní karta dá dva body");

  const [action] = engine.groupActions();
  assert.equal(action.id, "ask_locals");
  assert.equal(action.available, true);

  engine.useGroupAction("ask_locals");
  assert.equal(engine.state.reputation, 1);
  engine.useGroupAction("ask_locals");
  assert.equal(engine.state.reputation, 0);

  // nula není kladná, takže dál se pomoc koupit nedá (karta B09)
  const [spent] = engine.groupActions();
  assert.equal(spent.available, false);
  assert.equal(spent.locked, true);
  assert.equal(spent.requirement, "reputace 1 nebo více");
});

test("zamčenou akci nelze provést ani přímým voláním", () => {
  const engine = new Engine(withActions());
  engine.state.reputation = 0;
  assert.throws(() => engine.useGroupAction("ask_locals"), /zamčená/);
  assert.equal(engine.state.reputation, 0, "za neúspěšný pokus se neplatí");
});

test("neznámá akce skupiny je chyba, ne tichý souhlas", () => {
  const engine = new Engine(withActions());
  assert.throws(() => engine.useGroupAction("neexistuje"), /ve scénáři není/);
});

test("scénář bez akcí skupiny jich nabízí nula", () => {
  assert.deepEqual(new Engine(fixture()).groupActions(), []);
});

/* ------------------------------------------------ zaškrtávací úkoly na kartě */

function withTasks() {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "start",
        tasks: [
          { id: "t_deed", icon: "koruna", text: "Udělejte to", optional: true,
            effects: [{ type: "reputation", value: 1 }] },
        ],
        choices: [{
          text: "Pokračovat",
          goto: "c",
          routes: [{ when: [{ type: "quest_done", quest: "t_deed" }], goto: "b" }],
        }],
      },
      { id: "b", text: "odměna", choices: [{ text: "dál", goto: "c" }] },
      { id: "c", text: "konec", ending: true, choices: [] },
    ],
  };
}

test("zaškrtnutí úkolu zaplatí reputaci a odškrtnutí ji vrátí", () => {
  const engine = new Engine(withTasks());
  const [task] = engine.cardTasks();
  assert.equal(task.id, "t_deed");
  assert.equal(task.done, false);
  assert.equal(engine.state.reputation, 0);

  engine.setTask("t_deed", true);
  assert.equal(engine.state.reputation, 1);
  assert.equal(engine.cardTasks()[0].done, true);

  // překlep na telefonu v kapse se musí dát vzít zpět, i s tím, co zaplatil
  engine.setTask("t_deed", false);
  assert.equal(engine.state.reputation, 0);
  assert.equal(engine.cardTasks()[0].done, false);

  // a dvojí zaškrtnutí nesmí zaplatit dvakrát
  engine.setTask("t_deed", true);
  engine.setTask("t_deed", true);
  assert.equal(engine.state.reputation, 1);
});

test("zaškrtnutý úkol přesměruje jedinou cestu dál", () => {
  const engine = new Engine(withTasks());
  assert.equal(engine.choices().length, 1);
  assert.equal(engine.choices()[0].goto, "c");

  engine.setTask("t_deed", true);
  assert.equal(engine.choices()[0].goto, "b");
  engine.choose(0);
  assert.equal(engine.card.id, "b");
});

test("úkol, který karta nemá, je chyba", () => {
  const engine = new Engine(withTasks());
  assert.throws(() => engine.setTask("neexistuje", true), /nemá/);
});
