/**
 * The game engine.
 *
 * Holds no DOM and does no I/O: it takes the scenario data as plain objects and
 * exposes the current card, which choices are open and why the closed ones are
 * closed. The UI renders that; the tests drive it directly.
 *
 * A choice being visible but locked matters here. The cards print their gates in
 * the text ("[😐 > 5] Zeptat se na cestu k vodopádu"), so a player can see the
 * option exists and what it would take — the engine therefore returns locked
 * choices with a requirement string rather than hiding them.
 */

import { apply, evaluateAll } from "./rules.js";
import { createState, cloneState, visitCount } from "./state.js";
import { draw, initDeck } from "./decks.js";
import {
  abilitiesOf,
  applyStartEffects,
  consequencesOf,
  dealRoles,
  passiveReminders,
} from "./roles.js";

export class Engine {
  /**
   * @param {object} scenario  parsed scenario.json
   * @param {object} [options]
   * @param {object} [options.events]  parsed events.json (deck N)
   * @param {object[]} [options.roles]
   * @param {object} [options.state]   restore instead of starting fresh
   */
  constructor(scenario, { events = null, roles = [], state = null, players = [], seed = 1 } = {}) {
    this.scenario = scenario;
    this.events = events;
    this.roles = roles;

    this.scenes = new Map(scenario.scenes.map((s) => [s.id, s]));
    this.eventCards = new Map((events?.cards ?? []).map((c) => [c.id, c]));

    this.state = state ?? createState({
      scenarioId: scenario.gameId ?? null,
      startScene: scenario.startScene,
      players,
      seed,
    });

    if (!state) {
      this.state.startedAt = new Date().toISOString();
      this.#enter(scenario.startScene, { record: false });
      if (this.events) {
        initDeck(this.state, {
          deckId: this.events.deckId ?? "N",
          cardIds: (this.events.cards ?? []).map((c) => c.id),
          topCard: this.events.topCard ?? null,
        });
      }
    }
    /** listeners for things the UI should react to */
    this.listeners = new Set();
  }

  /* ------------------------------------------------------------ observation */

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #emit(event) {
    for (const fn of this.listeners) fn(event);
  }

  get card() {
    return this.scenes.get(this.state.currentScene) ?? null;
  }

  get finished() {
    return Boolean(this.state.finishedAt);
  }

  /** Frozen snapshot; callers must go through the engine to change anything. */
  snapshot() {
    return Object.freeze(cloneState(this.state));
  }

  /**
   * The current card's choices, each annotated with whether it can be taken.
   * @param {object} [ctx] extra context for conditions, e.g. { position }
   */
  choices(ctx = {}) {
    const card = this.card;
    if (!card) return [];
    const base = { state: this.state, engine: this, ...ctx };

    // while a task is being carried out, nothing else can be taken — the group
    // is on its way somewhere and has to arrive or turn back first
    if (this.state.pendingTask) {
      return (card.choices ?? []).map((choice, index) => ({
        index,
        icon: choice.icon ?? null,
        text: choice.text ?? "",
        goto: choice.goto ?? null,
        available: false,
        locked: true,
        unlockedByAbility: false,
        requirement: null,
        reason: "probíhá úkol",
      }));
    }

    return (card.choices ?? []).map((choice, index) => {
      const { met, failures } = evaluateAll(choice.disableIf, base);
      const overridable = this.state.pendingIgnoreChoiceCondition === true;
      return {
        index,
        icon: choice.icon ?? null,
        text: choice.text ?? "",
        goto: choice.goto ?? null,
        available: met || overridable,
        locked: !met,
        unlockedByAbility: !met && overridable,
        /** what the players would need, phrased for them */
        requirement: failures.map((f) => f.requirement).filter(Boolean).join(" a ") || null,
        reason: failures.map((f) => f.reason).filter(Boolean).join("; ") || null,
      };
    });
  }

  /* ---------------------------------------------------------------- actions */

  /**
   * Take a choice. Returns the new card.
   * Throws if the choice is locked, so a UI bug cannot walk through a gate.
   */
  choose(index, ctx = {}) {
    const list = this.choices(ctx);
    const choice = list[index];
    if (!choice) throw new Error(`volba ${index} na kartě ${this.state.currentScene} neexistuje`);
    if (!choice.available) {
      throw new Error(
        `volba „${choice.text}“ je zamčená: ${choice.reason ?? "nesplněná podmínka"}`,
      );
    }
    if (!choice.goto) throw new Error(`volba „${choice.text}“ nemá cíl`);
    if (!this.scenes.has(choice.goto)) {
      throw new Error(`volba míří na neexistující kartu ${choice.goto}`);
    }

    if (choice.unlockedByAbility) {
      this.state.pendingIgnoreChoiceCondition = false;
      this.state.toasts.push({ text: "Podmínka rozhodnutí byla ignorována (Tupec)." });
    }

    const from = this.state.currentScene;
    const declared = (this.card.choices ?? [])[index];

    // A task is not a move. Taking it commits the group to doing something out
    // in the world; the card on the other side is revealed by confirmArrival().
    if (declared?.quest) {
      const quest = this.#startQuest(declared.quest, from);
      this.state.pendingTask = {
        questId: quest.id,
        from,
        to: choice.goto,
        choiceIndex: index,
      };
      this.#emit({ type: "taskStarted", quest, to: choice.goto });
      return this.card;
    }

    this.state.history.push({
      from,
      choiceIndex: index,
      to: choice.goto,
      reputation: this.state.reputation,
      startedQuest: null,
      at: new Date().toISOString(),
    });

    this.#enter(choice.goto, { record: true });
    this.#emit({ type: "moved", from, to: choice.goto });
    return this.card;
  }

  /** The task in progress, or null. */
  get pendingTask() {
    const pending = this.state.pendingTask;
    if (!pending) return null;
    return { ...pending, quest: this.state.quests[pending.questId] ?? null };
  }

  /**
   * The players say they did it: finish the task and reveal the card behind it.
   * `ctx.position` is accepted so a scenario that gates a task on a GPS zone can
   * refuse here — no zone coordinates exist yet, so nothing is refused today.
   */
  confirmArrival(ctx = {}) {
    const pending = this.state.pendingTask;
    if (!pending) throw new Error("žádný úkol neprobíhá");

    const quest = this.state.quests[pending.questId];
    if (quest && !quest.done) {
      quest.done = true;
      quest.completedBy = ctx.position ? "position" : "confirmed";
      this.#emit({ type: "questDone", quest });
    }

    this.state.history.push({
      from: pending.from,
      choiceIndex: pending.choiceIndex,
      to: pending.to,
      reputation: this.state.reputation,
      startedQuest: pending.questId,
      at: new Date().toISOString(),
    });
    this.state.pendingTask = null;

    this.#enter(pending.to, { record: true });
    this.#emit({ type: "moved", from: pending.from, to: pending.to });
    return this.card;
  }

  /* ------------------------------------------------------------------- roles */

  /**
   * Hand out roles, one per player, and apply what they do at the start.
   * Card P03 is where the game asks for this.
   */
  dealRoles(playerCount, { names = [] } = {}) {
    if (!this.roles?.length) throw new Error("scénář nemá žádné role");
    this.state.players = dealRoles(this.roles, playerCount, {
      seed: this.state.seed,
      cursor: this.state.rngCursor,
      names,
    });
    this.state.rngCursor += 1;

    const applied = applyStartEffects(this.state, this.roles);
    this.#emit({ type: "rolesDealt", players: this.state.players, applied });
    return this.state.players;
  }

  get players() {
    return this.state.players;
  }

  /** Once-per-game abilities that nobody has spent yet. */
  get abilities() {
    return this.state.players.flatMap((player) => {
      const role = this.roles.find((r) => r.id === player.roleId);
      if (!role) return [];
      return abilitiesOf(role)
        .filter((ability) => ability.type && !player.usedOnce[ability.type])
        .map((ability) => ({
          playerId: player.playerId,
          playerName: player.name,
          roleId: role.id,
          roleName: role.name,
          type: ability.type,
          text: ability.text,
        }));
    });
  }

  /**
   * Spend a once-per-game ability. Its consequence, if the role has one, fires
   * straight after — the Vzdělaný pedant pays for taking a decision back with an
   * immediate encounter.
   */
  useAbility(playerId, type) {
    const player = this.state.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(`hráč ${playerId} není ve hře`);
    if (player.usedOnce[type]) throw new Error(`schopnost ${type} je už vyčerpaná`);

    const role = this.roles.find((r) => r.id === player.roleId);
    const ability = abilitiesOf(role ?? {}).find((a) => a.type === type);
    if (!ability) throw new Error(`role ${player.roleId} nemá schopnost ${type}`);

    player.usedOnce[type] = true;
    apply([ability.effect], {
      state: this.state,
      source: `role:${player.roleId}`,
      drawEncounter: (deckId) => this.drawEncounter(deckId),
    });

    // return_on_choice arms an undo; carry it out here so the ability does
    // something on its own rather than waiting for the UI to notice a flag
    if (this.state.pendingUndo) this.undo();

    const consequences = consequencesOf(role ?? {});
    for (const consequence of consequences) {
      if (!consequence.effect) continue;
      apply([consequence.effect], {
        state: this.state,
        source: `role:${player.roleId}`,
        drawEncounter: (deckId) => this.drawEncounter(deckId),
      });
    }

    this.#emit({ type: "abilityUsed", playerId, ability: type, consequences });
    return true;
  }

  /**
   * Rules the players have to keep themselves, per player. Distinct from
   * takeReminders(), which drains the queue of reminders raised by cards.
   */
  roleReminders() {
    return passiveReminders(this.state, this.roles ?? []);
  }

  /** Change of mind before setting off: drop the task, stay where we are. */
  cancelTask() {
    const pending = this.state.pendingTask;
    if (!pending) return false;
    delete this.state.quests[pending.questId];
    this.state.pendingTask = null;
    this.#emit({ type: "taskCancelled", questId: pending.questId });
    return true;
  }

  /**
   * Take the last decision back — the Vzdělaný pedant's once-per-game ability.
   * Reverts the card and the reputation recorded before that step.
   */
  undo() {
    // an unfinished task is undone by dropping it, without spending a step
    if (this.state.pendingTask) {
      this.cancelTask();
      return this.card;
    }
    const last = this.state.history.pop();
    if (!last) return null;
    this.state.visited[last.to] = Math.max(0, (this.state.visited[last.to] ?? 1) - 1);
    this.state.currentScene = last.from;
    this.state.reputation = last.reputation;
    this.state.pendingUndo = false;
    this.state.finishedAt = null;

    // undoing the arrival puts the task back in progress rather than erasing it
    if (last.startedQuest) {
      const quest = this.state.quests[last.startedQuest];
      if (quest) {
        quest.done = false;
        quest.completedBy = null;
        this.state.pendingTask = {
          questId: quest.id,
          from: last.from,
          to: last.to,
          choiceIndex: last.choiceIndex,
        };
      }
    }

    this.#emit({ type: "undone", to: last.from });
    return this.card;
  }

  get canUndo() {
    return Boolean(this.state.pendingTask) || this.state.history.length > 0;
  }

  /** Draw the top card of an encounter deck and return the card object. */
  drawEncounter(deckId = this.events?.deckId ?? "N") {
    const cardId = draw(this.state, deckId, {
      drawRule: this.events?.drawRule ?? "recycle_to_bottom",
    });
    if (!cardId) return null;
    const card = this.eventCards.get(cardId) ?? null;
    if (card) {
      apply(card.effects, { state: this.state, source: card.id, drawEncounter: () => {} });
      this.#emit({ type: "encounter", card });
    }
    return card;
  }

  /** Messages queued for the UI; reading them clears the queue. */
  takeToasts() {
    const out = this.state.toasts;
    this.state.toasts = [];
    return out;
  }

  takeReminders() {
    const out = this.state.reminders;
    this.state.reminders = [];
    return out;
  }

  /* ------------------------------------------------------------------ quests */

  /** Quests taken on but not yet finished, in the order they were taken. */
  get activeQuests() {
    return Object.values(this.state.quests).filter((q) => !q.done);
  }

  get completedQuests() {
    return Object.values(this.state.quests).filter((q) => q.done);
  }

  /**
   * Finish a quest by hand. Used by the Milovník přírody's once-per-game
   * ability and by the UI when players confirm they did something the app
   * cannot observe.
   */
  completeQuest(questId) {
    const quest = this.state.quests[questId];
    if (!quest || quest.done) return false;
    quest.done = true;
    quest.completedBy = "manual";
    this.#emit({ type: "questDone", quest });
    return true;
  }

  #startQuest(declared, fromScene) {
    const existing = this.state.quests[declared.id];
    if (existing && !existing.done) return existing;
    const quest = {
      ...declared,
      startedAt: fromScene,
      done: false,
      completedBy: null,
    };
    this.state.quests[quest.id] = quest;
    this.#emit({ type: "questStarted", quest });
    return quest;
  }

  /* ----------------------------------------------------------------- internal */

  #enter(sceneId, { record }) {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`karta ${sceneId} neexistuje`);

    this.state.currentScene = sceneId;
    this.state.visited[sceneId] = visitCount(this.state, sceneId) + 1;

    const { unknown } = apply(scene.effects, {
      state: this.state,
      source: sceneId,
      drawEncounter: (deckId) => this.drawEncounter(deckId),
    });
    if (unknown.length) {
      // Loud on purpose: data declaring an effect the engine does not implement
      // would otherwise change nothing and look like it worked.
      this.#emit({ type: "unknownEffects", scene: sceneId, types: unknown });
    }

    if (scene.ending) {
      this.state.finishedAt = new Date().toISOString();
      this.#emit({ type: "finished", scene: sceneId });
    }
    return scene;
  }
}

/** Convenience for tests and the loader. */
export function startGame(scenario, options) {
  return new Engine(scenario, options);
}
