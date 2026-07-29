/**
 * Platform adapters: saving, position, data loading.
 *
 * Each adapter takes its dependency as an argument (a storage backend, a
 * geolocation object, a fetch), so all three are testable in Node — which is also
 * why the game can run with any of them missing.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { Engine } from "../src/core/engine.js";
import { serialise } from "../src/core/state.js";
import { abilitiesView, dealtRolesView, roleRulesView } from "../src/ui/view.js";
import { createStorage, KEY_PREFIX, memoryBackend } from "../src/platform/storage.js";
import {
  REFERENCED_ZONES,
  ZONES,
  accuracyLabel,
  createGeo,
  haversine,
  positionContext,
  zonesAt,
} from "../src/platform/geo.js";
import { createLoader, dirOf } from "../src/platform/data.js";

function fixture() {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      { id: "a", text: "start", choices: [{ text: "dál", goto: "b" }] },
      { id: "b", text: "cíl", ending: true, choices: [] },
    ],
  };
}

/* ------------------------------------------------------------------- storage */

test("uložení a obnovení rozehrané hry", () => {
  const storage = createStorage({ backend: memoryBackend() });
  assert.equal(storage.available, true);

  const engine = new Engine(fixture());
  engine.choose(0);
  assert.equal(storage.save("test", engine.state), true);

  const loaded = storage.load("test");
  assert.equal(loaded.scenarioId, "test");
  assert.equal(loaded.scene, "b");
  assert.ok(loaded.savedAt);

  const restored = new Engine(fixture(), { state: loaded.state });
  assert.equal(restored.card.id, "b");
  assert.equal(restored.canUndo, true);
});

test("probíhající úkol přežije uložení a obnovení", () => {
  // The phone dies halfway to the lime tree: the group must come back to the
  // task in progress, not to the card before it and not past it.
  const scenario = {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "rozcestí",
        choices: [
          {
            text: "Úkol: Dojděte k lípě",
            goto: "b",
            quest: { id: "q_lipa", kind: "travel", text: "Dojděte k lípě", completedAt: "b" },
          },
        ],
      },
      { id: "b", text: "u lípy", ending: true, choices: [] },
    ],
  };
  const storage = createStorage({ backend: memoryBackend() });
  const engine = new Engine(scenario);
  engine.choose(0);
  storage.save("test", engine.state);

  const restored = new Engine(scenario, { state: storage.load("test").state });
  assert.equal(restored.card.id, "a", "cílová karta zůstává skrytá");
  assert.equal(restored.pendingTask.questId, "q_lipa");
  assert.equal(restored.choices()[0].available, false);

  restored.confirmArrival();
  assert.equal(restored.card.id, "b");
});

test("hra uložená před rolemi se obnoví a jen nemá co nabízet", () => {
  // Saves written before roles were dealt have no `players` at all, so the role
  // parts of the UI must treat the key as absent rather than trust the shape.
  const storage = createStorage({ backend: memoryBackend() });
  const engine = new Engine(fixture());
  engine.choose(0);
  const legacy = JSON.parse(serialise(engine.state));
  delete legacy.players;
  storage.save("test", legacy);

  const restored = new Engine(fixture(), { state: storage.load("test").state });
  assert.equal(restored.card.id, "b", "hra se obnoví");
  assert.equal(abilitiesView(restored, []).empty, true);
  assert.equal(abilitiesView(restored, []).dealt, false);
  assert.deepEqual(dealtRolesView(restored, []), []);
  assert.equal(roleRulesView(restored).empty, true);
});

test("seznam uložených her nese metadata bez načtení celého stavu", () => {
  const storage = createStorage({ backend: memoryBackend() });
  const engine = new Engine(fixture());
  engine.state.reputation = 4;
  storage.save("nebakov", engine.state);

  const list = storage.list();
  assert.deepEqual(Object.keys(list), ["nebakov"]);
  assert.equal(list.nebakov.reputation, 4);
  assert.equal(list.nebakov.scene, "a");
  assert.equal(list.nebakov.finished, false);
});

test("smazání rozehrané hry", () => {
  const storage = createStorage({ backend: memoryBackend() });
  storage.save("test", new Engine(fixture()).state);
  assert.equal(storage.clear("test"), true);
  assert.equal(storage.load("test"), null);
  assert.deepEqual(storage.list(), {});
});

test("hru lze hrát i když úložiště nefunguje", () => {
  // Safari in private mode exposes localStorage and then throws on write.
  const hostile = {
    length: 0,
    key: () => null,
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
  };
  const storage = createStorage({ backend: hostile });

  assert.equal(storage.available, false);
  assert.equal(storage.save("test", new Engine(fixture()).state), false);
  assert.equal(storage.load("test"), null);
  assert.deepEqual(storage.list(), {});
  assert.match(storage.lastError, /není dostupné/);
});

test("chybějící úložiště se pozná i když vlastnost vůbec není", () => {
  const storage = createStorage({ backend: null });
  assert.equal(storage.available, false);
  assert.equal(storage.save("test", {}), false);
});

test("uložená hra z jiné verze se nepoužije", () => {
  const backend = memoryBackend({
    [`${KEY_PREFIX}test`]: JSON.stringify({ v: 99, scenarioId: "test", state: "{}" }),
  });
  const storage = createStorage({ backend });
  assert.equal(storage.load("test"), null);
  assert.match(storage.lastError, /jiné verze/);
  assert.deepEqual(storage.list(), {}, "cizí verze se v seznamu neukáže");
});

test("poškozený záznam v úložišti hru nesestřelí", () => {
  const backend = memoryBackend({ [`${KEY_PREFIX}test`]: "{tohle není json" });
  const storage = createStorage({ backend });
  assert.equal(storage.load("test"), null);
  assert.ok(storage.lastError);
});

/* ----------------------------------------------------------------------- geo */

test("haversine měří v metrech", () => {
  assert.equal(Math.round(haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })), 111195);
  assert.equal(haversine({ lat: 50.1, lon: 15.2 }, { lat: 50.1, lon: 15.2 }), 0);
  // 1 minute of latitude is a nautical mile
  assert.ok(Math.abs(haversine({ lat: 50, lon: 15 }, { lat: 50 + 1 / 60, lon: 15 }) - 1852) < 5);
});

test("zóny nejsou v datech, takže se nikdy netrefí", () => {
  // roles.json gates two role effects on `pubs` and `no_village`, but no
  // coordinates exist anywhere in the game data. Inventing them is out of scope,
  // so the resolver must answer honestly: no zone.
  assert.deepEqual([...ZONES], []);
  assert.deepEqual([...REFERENCED_ZONES], ["pubs", "no_village"]);
  assert.deepEqual(zonesAt({ lat: 50.5, lon: 15.2 }), []);
});

test("zóna se vyhodnotí podle poloměru, jakmile souřadnice budou", () => {
  const zones = [{ id: "pubs", lat: 50.0, lon: 15.0, radius: 100 }];
  assert.deepEqual(zonesAt({ lat: 50.0, lon: 15.0 }, zones), ["pubs"]);
  assert.deepEqual(zonesAt({ lat: 50.01, lon: 15.0 }, zones), []);
});

test("kontext polohy má tvar, který engine čeká", () => {
  const position = positionContext({ latitude: 50.5, longitude: 15.25, accuracy: 12.4 });
  assert.equal(position.lat, 50.5);
  assert.equal(position.lon, 15.25);
  assert.deepEqual(position.zones, []);
  assert.equal(accuracyLabel(position), "±12 m");
  assert.equal(positionContext(null), null);
});

test("podmínka na zónu zůstane nesplněná a řekne, co by bylo potřeba", () => {
  const scenario = {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        text: "start",
        choices: [
          { text: "do hospody", goto: "b", disableIf: [{ type: "gps_zone", zone: "pubs" }] },
        ],
      },
      { id: "b", text: "cíl", ending: true, choices: [] },
    ],
  };
  const engine = new Engine(scenario);
  const [choice] = engine.choices({ position: positionContext({ latitude: 50.5, longitude: 15.2 }) });
  assert.equal(choice.available, false);
  assert.equal(choice.requirement, "být v zóně „pubs“");
});

test("sledování polohy hlásí polohu i chybu", () => {
  let onPosition;
  let onError;
  const geolocation = {
    watchPosition(success, failure) {
      onPosition = success;
      onError = failure;
      return 7;
    },
    clearWatch(id) {
      geolocation.cleared = id;
    },
  };
  const geo = createGeo({ geolocation });
  assert.equal(geo.supported, true);
  assert.equal(geo.watching, false);

  const seen = [];
  geo.on((position, error) => seen.push({ position, error }));
  geo.start();
  assert.equal(geo.watching, true);

  onPosition({ coords: { latitude: 50.5, longitude: 15.2, accuracy: 8 }, timestamp: 0 });
  assert.equal(geo.position.lat, 50.5);
  assert.deepEqual(geo.position.zones, []);

  onError({ message: "permission denied" });
  assert.equal(geo.error, "permission denied");
  assert.equal(seen.length, 2);

  geo.stop();
  assert.equal(geo.watching, false);
  assert.equal(geolocation.cleared, 7);
});

test("bez podpory geolokace se nic nerozbije", () => {
  const geo = createGeo({ geolocation: undefined });
  assert.equal(geo.supported, false);
  assert.equal(geo.start(), false);
  assert.equal(geo.position, null);
});

/* ---------------------------------------------------------------- data loader */

test("dirOf vrátí složku cesty", () => {
  assert.equal(dirOf("games/nebakov/scenario.json"), "games/nebakov/");
  assert.equal(dirOf("scenario.json"), "");
});

test("loader načte katalog a scénář se všemi přílohami", async () => {
  const files = {
    "../games/scenarios.json": [{ id: "nebakov", file: "games/nebakov/scenario.json", status: "available" }],
    "../games/nebakov/scenario.json": {
      gameId: "nebakov",
      startScene: "card_P01",
      events: "events.json",
      roleSet: "roles.json",
      legend: "legend.json",
      scenes: [],
    },
    "../games/nebakov/events.json": { deckId: "N", cards: [] },
    "../games/nebakov/roles.json": { roles: [{ id: "tupec" }] },
    "../games/nebakov/legend.json": [{ title: "Přehled" }],
  };
  const asked = [];
  const loader = createLoader({
    base: "../",
    fetch: async (url) => {
      asked.push(url);
      return url in files
        ? { ok: true, json: async () => files[url] }
        : { ok: false, status: 404, json: async () => null };
    },
  });

  const catalogue = await loader.loadCatalogue();
  assert.equal(catalogue[0].id, "nebakov");

  const game = await loader.loadGame(catalogue[0]);
  assert.equal(game.scenario.gameId, "nebakov");
  assert.equal(game.events.deckId, "N");
  assert.deepEqual(game.roles, [{ id: "tupec" }]);
  assert.equal(game.dir, "games/nebakov/");
  assert.equal(game.imageBase, "../games/nebakov/images/");
  assert.ok(asked.includes("../games/nebakov/events.json"), "přílohy se hledají u scénáře");
});

test("scénář bez příloh se načte, chybějící příloha není chyba", async () => {
  const loader = createLoader({
    fetch: async (url) =>
      url === "games/x/scenario.json"
        ? { ok: true, json: async () => ({ gameId: "x", startScene: "a", events: "events.json", scenes: [] }) }
        : { ok: false, status: 404, json: async () => null },
  });
  const game = await loader.loadGame({ id: "x", file: "games/x/scenario.json" });
  assert.equal(game.events, null);
  assert.deepEqual(game.roles, []);
});

test("chybějící cesta ke scénáři se ohlásí česky", async () => {
  const loader = createLoader({ fetch: async () => ({ ok: true, json: async () => ({}) }) });
  await assert.rejects(() => loader.loadGame({ id: "x" }), /nemá cestu k datům/);
});
