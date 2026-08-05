/**
 * UI logic without a browser.
 *
 * Everything between the engine and the DOM — text formatting, icon lookup, the
 * view models — is plain functions, so it is tested here. The DOM layer itself is
 * covered by the browser check (see docs/screenshots).
 */

import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";

import { Engine } from "../src/core/engine.js";
import { cardText, linesOf, paragraphsOf, plainText } from "../src/ui/text.js";
import { icon, questIcon, reputationIcon, reputationIconName } from "../src/ui/icons.js";
import {
  abilitiesView,
  cardView,
  groupActionsView,
  dealtRolesView,
  durationLabel,
  endingView,
  inventoryView,
  itemCardView,
  journalView,
  lockLabel,
  messageViews,
  playerBounds,
  roleRulesView,
  scenarioListView,
  statusView,
  taskView,
} from "../src/ui/view.js";

/* ------------------------------------------------------------ text formatting */

test("text karty jako jeden string je jeden odstavec", () => {
  assert.deepEqual(cardText("Jeden odstavec."), [["Jeden odstavec."]]);
});

test("pole textů je pole odstavců", () => {
  assert.deepEqual(cardText(["První.", "Druhý."]), [["První."], ["Druhý."]]);
});

test("<br> se láme na řádky uvnitř odstavce", () => {
  const out = cardText(["Seznam:<br>• jedna<br>• dvě"]);
  assert.deepEqual(out, [["Seznam:", "• jedna", "• dvě"]]);
});

test("varianty <br/> a velkých písmen se rozpoznají", () => {
  assert.deepEqual(linesOf("a<br/>b<BR />c<br>d"), ["a", "b", "c", "d"]);
});

test("prázdné odstavce a řádky se zahodí", () => {
  assert.deepEqual(cardText(["", "  ", "text<br><br>dál"]), [["text", "dál"]]);
  assert.deepEqual(paragraphsOf(null), []);
  assert.deepEqual(cardText(undefined), []);
});

test("plainText spojí odstavce prázdným řádkem", () => {
  assert.equal(plainText(["a<br>b", "c"]), "a\nb\n\nc");
});

test("text se nikdy nepředává jako HTML", () => {
  // The renderer builds text nodes from these strings, so a card cannot inject
  // markup; the formatter must therefore leave the content untouched.
  const [[line]] = cardText("<b>tučně</b> a <script>alert(1)</script>");
  assert.equal(line, "<b>tučně</b> a <script>alert(1)</script>");
});

/* --------------------------------------------------------------------- icons */

test("ikony se mapují podle názvu z dat", () => {
  assert.equal(icon("stopy"), "👣");
  assert.equal(icon("lupa"), "🔍");
  assert.equal(icon("bublina"), "💬");
  assert.equal(icon("svitek"), "📜");
});

test("neznámá ani chybějící ikona nevrací zástupný znak", () => {
  assert.equal(icon("vymyslena_ikona"), "");
  assert.equal(icon(null), "");
  assert.equal(icon(undefined), "");
});

test("reputace má tři pásma podle znaménka", () => {
  assert.equal(reputationIconName(3), "rep_pos");
  assert.equal(reputationIconName(0), "rep_neu");
  assert.equal(reputationIconName(-2), "rep_neg");
  assert.equal(reputationIcon(0), "😐");
});

test("úkol bez známého druhu dostane ikonu svitku", () => {
  assert.equal(questIcon("travel"), "👣");
  assert.equal(questIcon("nature"), "🌿");
  assert.equal(questIcon(undefined), "📜");
});

/* ---------------------------------------------------------------- view models */

function fixture() {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        cardCode: "A01",
        image: "lipa01.jpg",
        text: ["První odstavec.", "Druhý<br>se zlomem."],
        effects: [{ type: "reputation", value: 2 }],
        choices: [
          { icon: "stopy", text: "Jít dál", goto: "b" },
          {
            icon: "bublina",
            text: "[😐 > 4] Promluvit",
            goto: "c",
            disableIf: [{ type: "reputation", operator: "<", value: 5 }],
          },
          {
            icon: "priroda",
            text: "Vzít úkol",
            goto: "b",
            quest: { id: "q1", kind: "nature", text: "Nasbírejte byliny", completedAt: "zz" },
          },
        ],
      },
      { id: "b", cardCode: "B01", text: "bez pokračování", choices: [] },
      { id: "c", cardCode: "C01", text: "konec", ending: true, choices: [] },
    ],
  };
}

test("model karty nese kód, odstavce i obrázek s předponou cesty", () => {
  const engine = new Engine(fixture());
  const view = cardView(engine, { imageBase: "../games/nebakov/images/" });

  assert.equal(view.cardCode, "A01");
  assert.deepEqual(view.paragraphs, [["První odstavec."], ["Druhý", "se zlomem."]]);
  assert.equal(view.image.src, "../games/nebakov/images/lipa01.jpg");
  assert.equal(view.image.available, null, "bez seznamu obrázků se nechá rozhodnout načtení");
  assert.equal(view.choices.length, 3);
});

test("známý seznam obrázků označí chybějící soubor", () => {
  const engine = new Engine(fixture());
  const present = cardView(engine, { knownImages: new Set(["lipa01.jpg"]) });
  assert.equal(present.image.available, true);

  const missing = cardView(engine, { knownImages: new Set(["jiny.jpg"]) });
  assert.equal(missing.image.available, false);
  assert.equal(missing.image.name, "lipa01.jpg");
});

test("zamčená volba zůstává v modelu a nese svůj požadavek", () => {
  const engine = new Engine(fixture());
  const [, gated] = cardView(engine).choices;

  assert.equal(gated.locked, true);
  assert.equal(gated.available, false, "tlačítko musí být vypnuté");
  assert.equal(gated.requirement, "reputace 5 nebo více");
  assert.equal(gated.lockLabel, "Vyžaduje: reputace 5 nebo více");
  assert.equal(gated.text, "[😐 > 4] Promluvit", "text karty se nepřepisuje");
});

test("volba odemčená schopností je klikatelná, ale požadavek se pořád ukáže", () => {
  const engine = new Engine(fixture());
  engine.state.pendingIgnoreChoiceCondition = true;
  const [, gated] = cardView(engine).choices;

  assert.equal(gated.available, true);
  assert.equal(gated.unlockedByAbility, true);
  assert.equal(gated.lockLabel, "Vyžaduje: reputace 5 nebo více");
});

test("popisek zámku bez požadavku vysvětlí důvod", () => {
  assert.equal(lockLabel({ locked: false }), null);
  assert.equal(lockLabel({ locked: true, reason: "poloha není známá" }), "Zamčeno: poloha není známá");
  assert.equal(lockLabel({ locked: true }), "Zamčeno");
});

test("volba s úkolem nese jeho text i ikonu druhu", () => {
  const engine = new Engine(fixture());
  const quest = cardView(engine).choices[2].quest;
  assert.equal(quest.text, "Nasbírejte byliny");
  assert.equal(quest.glyph, "🌿");
  assert.equal(quest.optional, false);
});

test("úkol, který už je v textu volby, se neopakuje", () => {
  const scenario = fixture();
  // this is how the Nebákov data reads: the label is "Úkol: <text úkolu>"
  scenario.scenes[0].choices[2].text = "Úkol: Nasbírejte byliny";
  const engine = new Engine(scenario);

  const echoed = cardView(engine).choices[2];
  assert.equal(echoed.quest.echoesChoiceText, true, "renderer takový úkol pod tlačítkem nevypisuje");

  const own = cardView(new Engine(fixture())).choices[2];
  assert.equal(own.quest.echoesChoiceText, false, "úkol, který text nezmiňuje, se ukázat musí");
});

test("karta bez volby a bez konce je označená jako bez pokračování", () => {
  const engine = new Engine(fixture());
  engine.choose(0);
  const view = cardView(engine);
  assert.equal(view.deadEnd, true);
  assert.equal(view.ending, false);
});

test("závěrečná karta není bez pokračování, je to konec", () => {
  const engine = new Engine(fixture());
  engine.state.reputation = 9;
  engine.choose(1);
  const view = cardView(engine);
  assert.equal(view.ending, true);
  assert.equal(view.deadEnd, false);
  assert.equal(view.finished, true);
});

/* ----------------------------------------------------------- probíhající úkol */

function taskFixture(kind = "travel") {
  return {
    gameId: "test",
    startScene: "a",
    scenes: [
      {
        id: "a",
        cardCode: "A01",
        text: "rozcestí",
        choices: [
          { icon: "stopy", text: "Jít dál", goto: "c" },
          {
            icon: "stopy",
            text: "Úkol: Dojděte k tisícileté lípě",
            goto: "b",
            quest: { id: "q_lipa", kind, text: "Dojděte k tisícileté lípě", completedAt: "b" },
          },
        ],
      },
      { id: "b", cardCode: "B11", text: "u lípy", choices: [{ text: "dál", goto: "c" }] },
      { id: "c", cardCode: "C01", text: "konec", ending: true, choices: [] },
    ],
  };
}

test("vzetí úkolu neodhalí cílovou kartu a nabídne panel", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);

  const view = cardView(engine);
  assert.equal(view.cardCode, "A01", "zůstáváme na stejné kartě");
  assert.equal(view.taskInProgress, true);
  assert.equal(view.task.text, "Dojděte k tisícileté lípě");
  assert.equal(view.task.glyph, "👣");
  assert.equal(view.task.confirmLabel, "Jsme na místě");
  assert.equal(view.task.cancelLabel, "Zrušit úkol");
  assert.match(view.task.hint, /odhalí/);
});

test("panel úkolu nesmí prozradit, kam úkol vede", () => {
  // The card behind a task is the reward for walking there; leaking its id into
  // the DOM would give it away in the page source.
  const engine = new Engine(taskFixture());
  engine.choose(1);
  const task = cardView(engine).task;
  assert.equal("to" in task, false);
  assert.equal(JSON.stringify(task).includes("B11"), false);
});

test("během úkolu nejde vzít žádná volba a je vidět proč", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);
  const { choices } = cardView(engine);

  assert.equal(choices.length, 2);
  for (const choice of choices) {
    assert.equal(choice.available, false);
    assert.equal(choice.reason, "probíhá úkol");
    assert.equal(choice.lockLabel, "Zamčeno: probíhá úkol");
  }
});

test("volba, ze které úkol vzešel, se pod panelem neopakuje", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);
  const { choices } = cardView(engine);

  assert.equal(choices[1].inProgress, true, "tuhle volbu zastupuje panel");
  assert.equal(choices[0].inProgress, false, "ostatní volby zůstávají vidět zamčené");

  engine.cancelTask();
  assert.equal(cardView(engine).choices[1].inProgress, false);
});

test("úkol typu deed se potvrzuje slovy „Splnili jsme“", () => {
  const engine = new Engine(taskFixture("deed"));
  engine.choose(1);
  assert.equal(cardView(engine).task.confirmLabel, "Splnili jsme");
});

test("potvrzení příchodu odhalí kartu a odemkne volby", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);
  engine.confirmArrival();

  const view = cardView(engine);
  assert.equal(view.cardCode, "B11");
  assert.equal(view.task, null);
  assert.equal(view.taskInProgress, false);
  assert.equal(view.choices[0].available, true);
  assert.equal(journalView(engine).done[0].completedBy, "confirmed");
});

test("zrušení úkolu vrátí volby zpět", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);
  engine.cancelTask();

  const view = cardView(engine);
  assert.equal(view.cardCode, "A01");
  assert.equal(view.task, null);
  assert.equal(view.choices[0].available, true);
  assert.equal(journalView(engine).empty, true, "nesplněný úkol se nezapočítá");
});

test("undo během úkolu úkol zahodí, undo po příchodu ho vrátí do běhu", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);
  assert.equal(statusView(engine).canUndo, true, "undo musí být dostupné i během úkolu");

  engine.undo();
  assert.equal(cardView(engine).task, null);
  assert.equal(cardView(engine).choices[1].available, true);

  engine.choose(1);
  engine.confirmArrival();
  assert.equal(cardView(engine).cardCode, "B11");

  engine.undo();
  const view = cardView(engine);
  assert.equal(view.cardCode, "A01", "vracíme se k chůzi, ne k tomu, že jsme nevyšli");
  assert.equal(view.taskInProgress, true);
  assert.equal(view.task.text, "Dojděte k tisícileté lípě");
});

test("deník označí probíhající úkol a nabídne u něj příchod", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);

  const journal = journalView(engine);
  assert.equal(journal.pendingQuestId, "q_lipa");
  assert.equal(journal.active.length, 1);
  assert.equal(journal.active[0].pending, true);
  assert.equal(journal.active[0].action, "Jsme na místě", "stejná formulace jako v panelu");
});

test("úkol splněný schopností role nechá panel stát, aby šlo pokračovat", () => {
  // The Milovník přírody can tick a nature task off without the group arriving.
  // The quest is then done while pendingTask still blocks every choice, so the
  // panel has to stay and say so — otherwise the game is over for that group.
  const engine = new Engine(taskFixture("nature"));
  engine.choose(1);
  engine.completeQuest("q_lipa");

  const view = cardView(engine);
  assert.equal(view.taskInProgress, true);
  assert.equal(view.task.fulfilled, true);
  assert.equal(view.choices[0].available, false);

  engine.confirmArrival();
  assert.equal(cardView(engine).cardCode, "B11", "potvrzení pořád odhalí kartu");
});

test("úkol potvrzený s polohou se zaznamená jako splněný podle polohy", () => {
  const engine = new Engine(taskFixture());
  engine.choose(1);
  engine.confirmArrival({ position: { lat: 50.5, lon: 15.2, zones: [] } });
  assert.equal(journalView(engine).done[0].completedBy, "position");
});

test("stavový pruh počítá reputaci, úkoly a možnost undo", () => {
  const engine = new Engine(fixture());
  let status = statusView(engine);
  assert.equal(status.reputation, 2);
  assert.equal(status.reputationIcon, "🙂");
  assert.equal(status.reputationLabel, "Reputace 2 (dobrá)");
  assert.equal(status.canUndo, false);
  assert.equal(status.questSummary, "0 splněno · 0 aktivní");

  engine.choose(2);
  status = statusView(engine);
  assert.equal(status.canUndo, true);
  assert.equal(status.activeQuests, 1);
  assert.equal(status.questSummary, "0 splněno · 1 aktivní");
});

test("deník rozdělí aktivní a splněné úkoly", () => {
  const engine = new Engine(fixture());
  assert.equal(journalView(engine).empty, true);

  engine.choose(2);
  let journal = journalView(engine);
  assert.equal(journal.active.length, 1);
  assert.equal(journal.active[0].text, "Nasbírejte byliny");
  assert.equal(journal.active[0].done, false);

  engine.confirmArrival();
  journal = journalView(engine);
  assert.equal(journal.active.length, 0);
  assert.equal(journal.done.length, 1);
  assert.equal(journal.done[0].completedBy, "confirmed");
});

test("taskView bez probíhajícího úkolu je null", () => {
  assert.equal(taskView(new Engine(fixture())), null);
});

test("závěrečná obrazovka sečte průchod", () => {
  const engine = new Engine(fixture());
  engine.state.reputation = 9;
  engine.choose(1);

  const ending = endingView(engine);
  assert.equal(ending.reputation, 9);
  assert.equal(ending.visitedCards, 2);
  assert.equal(ending.steps, 1);
  assert.equal(ending.cardCode, "C01");
});

test("doba hry se ukazuje v hodinách a minutách", () => {
  assert.equal(durationLabel("2026-07-29T08:00:00Z", "2026-07-29T15:12:00Z"), "7 h 12 min");
  assert.equal(durationLabel("2026-07-29T08:00:00Z", "2026-07-29T08:25:00Z"), "25 min");
  assert.equal(durationLabel(null, "2026-07-29T08:25:00Z"), null);
});

/* ------------------------------------------------------------------ catalogue */

test("hratelný je jen scénář se statusem available", () => {
  const list = scenarioListView(
    [
      { id: "nebakov", name: "Tajemství Nebákova", status: "available", file: "games/nebakov/scenario.json" },
      { id: "ukazka", name: "Ukázkový scénář", status: "preparing" },
    ],
    { saves: { nebakov: { scene: "card_C01", reputation: 3 } } },
  );

  assert.equal(list[0].playable, true);
  assert.equal(list[0].statusLabel, "hratelné");
  assert.equal(list[0].save.scene, "card_C01");
  assert.equal(list[1].playable, false);
  assert.equal(list[1].statusLabel, "připravujeme");
  assert.equal(list[1].save, null);
});

test("zprávy z enginu se rozliší na toasty a připomínky rolí", () => {
  const views = messageViews({
    toasts: [{ text: "Ztratili jste 1 bod reputace." }],
    reminders: [{ text: "Nemůžeš používat zbraně.", source: "role" }],
  });
  assert.equal(views.length, 2);
  assert.equal(views[0].kind, "toast");
  assert.equal(views[1].kind, "reminder");
  assert.equal(views[1].source, "role");
});

/* ---------------------------------------------------------------------- roles */

const NEBAKOV_ROLES = JSON.parse(
  fs.readFileSync(new URL("../games/nebakov/roles.json", import.meta.url), "utf8"),
).roles;

/** The real roles against a small scenario, so the role UI is tested on real data. */
function roleFixture() {
  return {
    gameId: "test",
    startScene: "a",
    players_min: 3,
    players_max: 8,
    scenes: [
      {
        id: "a",
        cardCode: "A01",
        text: "start",
        choices: [
          { icon: "stopy", text: "dál", goto: "b" },
          {
            icon: "priroda",
            text: "Úkol: Nasbírejte byliny",
            goto: "b",
            quest: { id: "q_nat", kind: "nature", text: "Nasbírejte byliny", completedAt: "b" },
          },
        ],
      },
      { id: "b", cardCode: "B01", text: "dál", choices: [{ text: "konec", goto: "c" }] },
      { id: "c", cardCode: "C01", text: "konec", ending: true, choices: [] },
    ],
  };
}

const roleEngine = (players = 4) => {
  const engine = new Engine(roleFixture(), { roles: NEBAKOV_ROLES, seed: 7 });
  if (players) engine.dealRoles(players);
  return engine;
};

test("počet hráčů je omezený scénářem i počtem rolí", () => {
  const bounds = playerBounds({ players_min: 3, players_max: 8 }, NEBAKOV_ROLES);
  assert.equal(bounds.min, 3);
  assert.equal(bounds.max, 8);
  assert.equal(bounds.limitedByRoles, false);
  assert.equal(bounds.limitNote, null);
});

test("scénář, který chce víc hráčů než má rolí, se zastropuje", () => {
  // The engine refuses to deal more players than roles, so the picker must not
  // offer such a number at all — and must say why.
  const bounds = playerBounds({ players_min: 3, players_max: 12 }, NEBAKOV_ROLES.slice(0, 5));
  assert.equal(bounds.max, 5);
  assert.equal(bounds.limitedByRoles, true);
  assert.match(bounds.limitNote, /jen 5/);
});

test("bez rolí se počet hráčů drží na minimu enginu", () => {
  const bounds = playerBounds({}, []);
  assert.equal(bounds.min, 3);
  assert.equal(bounds.roleCount, 0);
});

test("rozdané role se dají přečíst jako karty hráčů", () => {
  const engine = roleEngine(4);
  const cards = dealtRolesView(engine, NEBAKOV_ROLES);

  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map((c) => c.playerName), ["Hráč 1", "Hráč 2", "Hráč 3", "Hráč 4"]);
  assert.equal(new Set(cards.map((c) => c.roleId)).size, 4, "každá role jen jednou");
  for (const card of cards) {
    assert.ok(card.roleName, "role musí mít jméno");
    assert.ok(card.character.length > 0, "karta role má text charakteru");
    assert.ok(card.entries.length > 0, "karta role má výhody i nevýhody");
    for (const entry of card.entries) {
      assert.ok(entry.text);
      assert.ok(["advantage", "disadvantage"].includes(entry.sort));
    }
  }
});

test("jména hráčů se přenesou do karet rolí", () => {
  const engine = new Engine(roleFixture(), { roles: NEBAKOV_ROLES, seed: 7 });
  engine.dealRoles(3, { names: ["Anna", "", "Cyril"] });
  const cards = dealtRolesView(engine, NEBAKOV_ROLES);
  assert.deepEqual(cards.map((c) => c.playerName), ["Anna", "Hráč 2", "Cyril"]);
});

test("spouštěč role se ukáže jako popisek, ne jako závorka v textu", () => {
  const engine = roleEngine(8);
  const entries = dealtRolesView(engine, NEBAKOV_ROLES).flatMap((c) => c.entries);
  const once = entries.filter((e) => e.trigger === "once");
  assert.equal(once.length, 5, "pět schopností 1/hru");
  for (const entry of once) assert.equal(entry.triggerLabel, "1× za hru");
  assert.ok(entries.some((e) => e.triggerLabel === "vždy"));
  assert.ok(entries.some((e) => e.triggerLabel === "následek"), "Pedantův následek");
});

test("podmínka na zónu se u role označí jako nevyhodnotitelná", () => {
  const engine = roleEngine(8);
  const conditional = dealtRolesView(engine, NEBAKOV_ROLES)
    .flatMap((c) => c.entries)
    .filter((e) => e.condition);

  assert.ok(conditional.length >= 2, "Nenasyta a Lenoch mají podmínku na zónu");
  for (const entry of conditional) {
    assert.match(entry.conditionNote, /nejsou souřadnice zón/);
  }
});

test("schopnosti 1/hru se nabídnou s hráčem, rolí a cenou", () => {
  const engine = roleEngine(8);
  const view = abilitiesView(engine, NEBAKOV_ROLES);

  assert.equal(view.dealt, true);
  assert.equal(view.empty, false);
  assert.equal(view.list.length, 5, "pět schopností 1/hru");
  assert.match(view.note, /nelze vzít zpět/);

  const pedant = view.list.find((a) => a.type === "return_on_choice");
  assert.ok(pedant, "Pedantova schopnost je v seznamu");
  assert.ok(pedant.playerName);
  assert.equal(pedant.roleName, "Vzdělaný pedant");
  assert.equal(pedant.consequences.length, 1, "cena schopnosti se bere z dat role");
  assert.match(pedant.consequences[0], /náhodné setkání/);

  const slechtic = view.list.find((a) => a.type === "ignore_reputation_loss");
  assert.deepEqual(slechtic.consequences, [], "ostatní role cenu nemají");
});

test("použitá schopnost ze seznamu zmizí", () => {
  const engine = roleEngine(8);
  const before = abilitiesView(engine, NEBAKOV_ROLES).list;
  const target = before.find((a) => a.type === "ignore_reputation_loss");

  engine.useAbility(target.playerId, target.type);
  const after = abilitiesView(engine, NEBAKOV_ROLES).list;

  assert.equal(after.length, before.length - 1);
  assert.equal(after.some((a) => a.type === "ignore_reputation_loss"), false);
});

test("bez rozdaných rolí není co nabízet a řekne se to", () => {
  // Games saved before roles existed restore with state.players empty.
  const engine = new Engine(roleFixture(), { roles: NEBAKOV_ROLES, seed: 7 });
  const view = abilitiesView(engine, NEBAKOV_ROLES);
  assert.equal(view.dealt, false);
  assert.equal(view.empty, true);
  assert.match(view.emptyLabel, /nemá rozdané role/);
  assert.equal(roleRulesView(engine).empty, true);
});

test("trvalá pravidla se seskupí po hráčích a přiznají, co aplikace nehlídá", () => {
  const engine = roleEngine(8);
  const view = roleRulesView(engine);

  assert.equal(view.players.length, 8, "v přehledu je každý hráč, i bez trvalých pravidel");
  assert.match(view.zonesNote, /chybí souřadnice/);

  // The Vzdělaný pedant has only a once-per-game ability and its consequence, so
  // his row has no standing rule and must say so rather than vanish.
  const pedant = view.players.find((p) => p.roleName === "Vzdělaný pedant");
  assert.ok(pedant, "Pedant nesmí z přehledu vypadnout");
  assert.equal(pedant.rules.length, 0);
  assert.match(pedant.noRulesLabel, /Žádné trvalé pravidlo/);

  const rules = view.players.flatMap((p) => p.rules);
  assert.ok(rules.length > 0);
  assert.ok(rules.every((r) => ["app", "players", "unknown"].includes(r.enforcement)));

  const zoned = rules.filter((r) => r.enforcement === "unknown");
  assert.ok(zoned.length >= 2, "dvě pasiva jsou podmíněná zónou");
  for (const rule of zoned) assert.match(rule.enforcementLabel, /nelze vyhodnotit/);

  const own = rules.filter((r) => r.enforcement === "players");
  assert.ok(own.length > 0, "roleplay pravidla si hlídají hráči");
  for (const rule of own) assert.equal(rule.enforcementLabel, "hlídáte si sami");
});

test("schopnost Milovníka přírody úkol uzavře, ale panel zůstane", () => {
  // nature_quest_done ticks the quest off without confirming the arrival, so the
  // task panel has to stay up — otherwise the group is stuck behind locked choices.
  const engine = new Engine(roleFixture(), { roles: NEBAKOV_ROLES, seed: 7 });
  engine.dealRoles(8);
  engine.choose(1);
  assert.equal(cardView(engine).taskInProgress, true);

  const ability = abilitiesView(engine, NEBAKOV_ROLES).list
    .find((a) => a.type === "nature_quest_done");
  engine.useAbility(ability.playerId, ability.type);

  const view = cardView(engine);
  assert.equal(view.taskInProgress, true, "panel musí zůstat");
  assert.equal(view.task.fulfilled, true, "a přiznat, že úkol je splněný");
  engine.confirmArrival();
  assert.equal(cardView(engine).cardCode, "B01");
});

/* -------------------------------------------------------------- akce skupiny */

function actionEngine() {
  const scenario = roleFixture();
  scenario.groupActions = [{
    id: "ask_locals",
    icon: "lupa",
    title: "Požádat místní o pomoc",
    text: "Poradí vám s cestou.",
    confirm: "Poradili vám?",
    effects: [{ type: "reputation", value: -1 }],
    disableIf: [{ type: "reputation", operator: "<", value: 1 }],
  }];
  return new Engine(scenario, { roles: NEBAKOV_ROLES });
}

test("akce skupiny se nabídne s ikonou a potvrzením", () => {
  const engine = actionEngine();
  engine.state.reputation = 2;
  const view = groupActionsView(engine);

  assert.equal(view.empty, false);
  assert.equal(view.list.length, 1);
  assert.equal(view.list[0].glyph, "🔍");
  assert.equal(view.list[0].confirm, "Poradili vám?");
  assert.equal(view.list[0].available, true);
});

test("nedostupná akce zůstane vidět i s tím, co by bylo potřeba", () => {
  const engine = actionEngine();
  engine.state.reputation = 0;
  const [action] = groupActionsView(engine).list;

  assert.equal(action.available, false);
  assert.equal(action.locked, true);
  assert.equal(action.requirement, "reputace 1 nebo více");
  assert.equal(action.lockLabel, "Vyžaduje: reputace 1 nebo více");
});

test("scénář bez akcí to řekne místo prázdného seznamu", () => {
  const view = groupActionsView(new Engine(roleFixture(), { roles: NEBAKOV_ROLES }));
  assert.equal(view.empty, true);
  assert.match(view.emptyLabel, /mimo karty/);
});

/* --------------------------------------------------- zaškrtávací úkoly a batoh */

const NEBAKOV_SCENARIO = JSON.parse(
  fs.readFileSync(new URL("../games/nebakov/scenario.json", import.meta.url), "utf8"),
);
const NEBAKOV_ITEMS = JSON.parse(
  fs.readFileSync(new URL("../games/nebakov/items.json", import.meta.url), "utf8"),
);

test("volitelný úkol na kartě se ukáže jako zaškrtávátko, ne jako volba", () => {
  const engine = new Engine(NEBAKOV_SCENARIO, { items: NEBAKOV_ITEMS });
  engine.state.currentScene = "card_B03";
  const view = cardView(engine);

  assert.equal(view.tasks.length, 1);
  assert.equal(view.tasks[0].label, "Úkol (volitelný): Držte minutu ticha za padlé");
  assert.equal(view.tasks[0].glyph, "👑");
  assert.equal(view.tasks[0].done, false);

  // a z pomníku vede jediné tlačítko — kudy povede, řeší zaškrtnutí
  assert.deepEqual(view.choices.map((c) => c.text), ["Pokračovat"]);

  engine.setTask("q_B03_ticho", true);
  assert.equal(cardView(engine).tasks[0].done, true);
});

test("dopis a mapy se dají otevřít z batohu", () => {
  const engine = new Engine(NEBAKOV_SCENARIO, { items: NEBAKOV_ITEMS });
  const bag = inventoryView(engine);
  const readable = bag.groups.flatMap((g) => g.items).filter((i) => i.cardId);

  assert.deepEqual(readable.map((i) => i.id).sort(), ["dopis", "mapa01"]);
  assert.equal(readable.find((i) => i.id === "mapa01").openLabel, "Rozložit");
  assert.equal(readable.find((i) => i.id === "dopis").openLabel, "Přečíst");

  const page = itemCardView(engine, readable.find((i) => i.id === "dopis"));
  assert.equal(page.id, "card_intro_dopis");
  assert.match(page.paragraphs.flat().join(" "), /Machna/);
  // otevřít mapu u vodopádu nesmí nikoho nikam poslat, takže volby tu nejsou
  assert.equal("choices" in page, false);
});
