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
    this.state.history.push({
      from,
      choiceIndex: index,
      to: choice.goto,
      reputation: this.state.reputation,
      at: new Date().toISOString(),
    });
    this.#enter(choice.goto, { record: true });
    this.#emit({ type: "moved", from, to: choice.goto });
    return this.card;
  }

  /**
   * Take the last decision back — the Vzdělaný pedant's once-per-game ability.
   * Reverts the card and the reputation recorded before that step.
   */
  undo() {
    const last = this.state.history.pop();
    if (!last) return null;
    this.state.visited[last.to] = Math.max(0, (this.state.visited[last.to] ?? 1) - 1);
    this.state.currentScene = last.from;
    this.state.reputation = last.reputation;
    this.state.pendingUndo = false;
    this.state.finishedAt = null;
    this.#emit({ type: "undone", to: last.from });
    return this.card;
  }

  get canUndo() {
    return this.state.history.length > 0;
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
