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

import { apply, holdsAll, lockState } from "./rules.js";
import { createState, cloneState, visitCount } from "./state.js";
import { draw, initDeck, makeRng } from "./decks.js";
import { NO_ITEMS, createCatalogue, give, inventoryOf } from "./items.js";
import { formatDistance, haversine } from "./distance.js";

/**
 * How close counts as "here", when a task names a place and nothing else says.
 * The author asked for about 25 m (Q08c); a phone under trees is routinely worse
 * than that, which is exactly why the check asks rather than refuses.
 */
export const DEFAULT_ARRIVAL_RADIUS_M = 25;
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
   * @param {object} [options.items]   parsed items.json
   * @param {object} [options.state]   restore instead of starting fresh
   */
  constructor(scenario, {
    events = null, roles = [], items = null, state = null, players = [], seed = 1,
  } = {}) {
    this.scenario = scenario;
    this.events = events;
    this.roles = roles;
    this.items = items ? createCatalogue(items) : NO_ITEMS;

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
      // The envelope is open before the first card: the letter and the first map
      // are what the group sets out with.
      for (const item of this.items.starting()) give(this.state, this.items, item.id);
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
    const base = { state: this.state, engine: this, items: this.items, ...ctx };

    // nothing can be taken while a card is waiting to be handed to somebody
    if (this.state.pendingPrivate) {
      return (card.choices ?? []).map((choice, index) => ({
        index,
        icon: choice.icon ?? null,
        text: choice.text ?? "",
        goto: choice.goto ?? null,
        available: false,
        locked: true,
        unlockedByAbility: false,
        requirement: null,
        reason: "čeká osobní karta",
      }));
    }

    // A card can refuse to let go before something is done on it. Same shape as
    // the task lock, opposite meaning: a task is about leaving, this is about
    // not leaving yet.
    if (this.state.pendingProgress) {
      return (card.choices ?? []).map((choice, index) => ({
        index,
        icon: choice.icon ?? null,
        text: choice.text ?? "",
        goto: choice.goto ?? null,
        available: false,
        locked: true,
        unlockedByAbility: false,
        requirement: this.state.pendingProgress.text ?? null,
        reason: "nesplněná podmínka postupu",
      }));
    }

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
      const { locked, reasons, requirements } = lockState(choice.disableIf, base);
      const overridable = this.state.pendingIgnoreChoiceCondition === true;
      return {
        index,
        icon: choice.icon ?? null,
        text: choice.text ?? "",
        goto: this.#routeOf(choice, base),
        available: !locked || overridable,
        locked,
        unlockedByAbility: locked && overridable,
        /** what the players would need, phrased for them */
        requirement: requirements.join(" a ") || null,
        reason: reasons.join("; ") || null,
      };
    });
  }

  /**
   * Where a choice actually leads.
   *
   * One button, more than one destination: B03's "Pokračovat" goes to B02 when
   * the group held their minute of silence and straight to B04 when they did
   * not. The alternative — two buttons, one of them locked — would put the
   * answer on screen, and the whole point is that the players just carry on.
   *
   * First matching route wins; `goto` is the fallback, so a choice without
   * routes behaves exactly as before.
   */
  #routeOf(choice, ctx) {
    for (const route of choice.routes ?? []) {
      if (route.goto && holdsAll(route.when, ctx)) return route.goto;
    }
    return choice.goto ?? null;
  }

  /* ------------------------------------------------------------ card tasks */

  /**
   * Things to tick off on this card rather than walk through.
   *
   * An optional deed — the minute of silence at the memorial, opening the map in
   * the bag — is not a fork in the story: the group either did it or did not,
   * and the game goes on the same way either way. It used to be modelled as a
   * choice with a destination, which meant taking it moved everybody and not
   * taking it left a button on screen forever. A checkbox says what it is.
   */
  cardTasks() {
    const card = this.card;
    return (card?.tasks ?? []).map((task) => ({
      id: task.id,
      icon: task.icon ?? "fajfka",
      text: task.text ?? "",
      optional: task.optional !== false,
      done: this.state.quests[task.id]?.done === true,
    }));
  }

  /**
   * Tick one off, or take it back.
   *
   * Untick has to work: this is a phone in a pocket on a walk, and a deed the
   * group did not do must not stay ticked because somebody brushed the screen.
   * What a deed pays is therefore paid on the tick and taken back on the untick,
   * which is why `tasks[].effects` is restricted to reputation — the one thing
   * that can be undone by applying its opposite. `cards.py validate` enforces
   * that, so an effect that cannot be reversed cannot get onto a checkbox.
   */
  setTask(id, done = true) {
    const card = this.card;
    const declared = (card?.tasks ?? []).find((t) => t.id === id);
    if (!declared) throw new Error(`karta ${card?.id} úkol ${id} nemá`);

    const quest = this.state.quests[id] ?? (this.state.quests[id] = {
      ...declared,
      startedAt: card.id,
      done: false,
      completedBy: null,
    });

    const wanted = Boolean(done);
    if (quest.done !== wanted) {
      const effects = (declared.effects ?? []).map((effect) => (
        wanted ? effect : { ...effect, value: -(effect.value ?? 0) }
      ));
      apply(effects, {
        state: this.state,
        source: card.id,
        items: this.items,
        drawEncounter: (deckId) => this.drawEncounter(deckId),
      });
    }
    quest.done = wanted;
    quest.completedBy = wanted ? "checked" : null;

    this.#emit({ type: wanted ? "questDone" : "questReopened", quest });
    return quest.done;
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
      // where the group actually was, when the device knows — this is the part
      // of the record that cannot be reconstructed afterwards
      at_lat: ctx.position?.lat ?? null,
      at_lon: ctx.position?.lon ?? null,
    });

    this.#applyChoiceEffects(declared, from);
    this.#enter(choice.goto, { record: true });
    this.#emit({ type: "moved", from, to: choice.goto });
    return this.card;
  }

  /**
   * Some cards attach the consequence to the route rather than to either end of
   * it — "Pokračovat ➤ ⏳ a potom", or F14's "ztrácíte 2 body reputace (😡😡),
   * vyhodnoťte setkání (⏳)". Both alternatives lead to the same card, so the
   * price cannot live on the target: it belongs to the choice.
   */
  #applyChoiceEffects(declared, from) {
    if (!declared?.effects?.length) return;
    const { unknown } = apply(declared.effects, {
      state: this.state,
      source: from,
      items: this.items,
      drawEncounter: (deckId) => this.drawEncounter(deckId),
    });
    if (unknown.length) {
      this.#emit({ type: "unknownEffects", scene: from, types: unknown });
    }
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

    const check = this.arrivalCheck(ctx);
    if (check && !check.here && !ctx.override) {
      // Not a refusal, a question. The author's rule (Q08c) is that the group is
      // asked and may insist: the sensor is wrong often enough, and a game that
      // cannot be played because a phone is confused is worse than one that
      // trusts people.
      const error = new Error(check.message);
      error.code = "not_at_place";
      error.check = check;
      throw error;
    }

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
      at_lat: ctx.position?.lat ?? null,
      at_lon: ctx.position?.lon ?? null,
    });
    this.state.pendingTask = null;

    this.#enter(pending.to, { record: true });
    this.#emit({ type: "moved", from: pending.from, to: pending.to });
    return this.card;
  }

  /**
   * Whether the group is where the pending task said to go.
   *
   * Returns null when there is nothing to check — no task, no coordinates on it,
   * or no position from the device — because all three mean the same thing in
   * practice: take their word for it.
   */
  arrivalCheck({ position = null } = {}) {
    const pending = this.state.pendingTask;
    if (!pending || !position) return null;
    const quest = this.state.quests[pending.questId];
    const place = quest?.at ?? null;
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return null;

    const radius = place.radius ?? DEFAULT_ARRIVAL_RADIUS_M;
    const distance = haversine({ lat: position.lat, lon: position.lon }, place);
    const here = distance <= radius;
    return {
      here,
      distance: Math.round(distance),
      radius,
      accuracy: position.accuracy ?? null,
      place: place.name ?? quest?.text ?? null,
      message: here
        ? "Jste na místě."
        : `Podle GPS jste ${formatDistance(distance)} od místa`
          + `${place.name ? ` „${place.name}“` : ""}. Přesto pokračovat?`,
    };
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
      items: this.items,
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
        items: this.items,
        drawEncounter: (deckId) => this.drawEncounter(deckId),
      });
    }

    this.#emit({ type: "abilityUsed", playerId, ability: type, consequences });
    return true;
  }

  /**
   * Things the group can do at any time, off the cards — today only B09's
   * "ask a local the way", which costs a point of reputation.
   *
   * Declared in the scenario rather than here, and gated by the same
   * `disableIf` the choices use, so the rule the card prints and the rule the
   * engine keeps are one condition and cannot drift apart.
   */
  groupActions(ctx = {}) {
    const base = { state: this.state, engine: this, items: this.items, ...ctx };
    return (this.scenario.groupActions ?? []).map((action) => {
      const { locked, reasons, requirements } = lockState(action.disableIf, base);
      return {
        id: action.id,
        icon: action.icon ?? null,
        title: action.title ?? "",
        text: action.text ?? "",
        confirm: action.confirm ?? null,
        available: !locked,
        locked,
        requirement: requirements.join(" a ") || null,
        reason: reasons.join("; ") || null,
      };
    });
  }

  /**
   * Do one. Throws when it is locked, for the same reason `choose` does: the
   * gate is the rule, and a UI that forgot to grey a button must not be able to
   * walk through it.
   */
  useGroupAction(id, ctx = {}) {
    const declared = (this.scenario.groupActions ?? []).find((a) => a.id === id);
    if (!declared) throw new Error(`akce ${id} ve scénáři není`);

    const action = this.groupActions(ctx).find((a) => a.id === id);
    if (!action.available) {
      throw new Error(`akce „${action.title}“ je zamčená: ${action.reason ?? "nesplněná podmínka"}`);
    }

    apply(declared.effects ?? [], {
      state: this.state,
      source: `action:${id}`,
      items: this.items,
      drawEncounter: (deckId) => this.drawEncounter(deckId),
    });

    this.#emit({ type: "groupActionUsed", id, title: action.title });
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

    // stepping back onto a card re-asks its progress condition unless the group
    // already satisfied it there
    this.#armProgress(this.card ?? {});

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
      apply(card.effects, {
        state: this.state, source: card.id, items: this.items, drawEncounter: () => {},
      });
      this.#emit({ type: "encounter", card });
    }
    return card;
  }

  /** Everything the group carries, with names and descriptions from items.json. */
  get inventory() {
    return inventoryOf(this.state, this.items);
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

  /* --------------------------------------------------------- encounter outcome */

  /**
   * Settle a card of deck N.
   *
   * Every one of the twenty prints what it costs or pays — "Odměna: 😊",
   * "Postih: 😡", "⚁⚂⚃⚄: 😡😡" — and none of it was ever applied, because the
   * outcome depends on something only the players know: whether they sang, whether
   * they guessed, whether the die came up two. So the card offers its options and
   * the group says which happened.
   */
  resolveEncounter(cardId, optionId) {
    const card = this.eventCards.get(cardId);
    if (!card) throw new Error(`karta ${cardId} v balíčku není`);
    const option = (card.resolution?.options ?? []).find((o) => o.id === optionId);
    if (!option) throw new Error(`karta ${cardId} nemá možnost ${optionId}`);

    apply(option.effects, {
      state: this.state,
      source: cardId,
      items: this.items,
      drawEncounter: () => {},
    });
    this.#emit({ type: "encounterResolved", cardId, outcome: optionId });
    return option;
  }

  /**
   * Roll dice for a card that asks for them, or record what the players rolled.
   * `given` is what came up on real dice; without it the app rolls, seeded like
   * everything else so a restored save is reproducible.
   */
  rollDice(spec, given = null) {
    const count = spec?.count ?? 1;
    const sides = spec?.sides ?? 6;
    if (Array.isArray(given)) return given.slice(0, count);

    const rng = makeRng(this.state.seed, this.state.rngCursor);
    this.state.rngCursor += 1;
    return Array.from({ length: count }, () => 1 + Math.floor(rng() * sides));
  }

  /* ------------------------------------------------------------ private cards */

  /** The card waiting to be handed to somebody, or null. */
  get privateCard() {
    const pending = this.state.pendingPrivate;
    if (!pending) return null;
    return { ...pending, card: this.scenes.get(pending.cardId) ?? null };
  }

  /** The player took the phone and read it. */
  acknowledgePrivate() {
    const pending = this.state.pendingPrivate;
    if (!pending) throw new Error("žádná osobní karta nečeká");
    if (pending.keep) {
      this.state.heldCards.push({
        cardId: pending.cardId,
        player: pending.audience ?? null,
        since: new Date().toISOString(),
      });
    }
    this.state.pendingPrivate = null;
    this.#emit({ type: "privateRead", cardId: pending.cardId, kept: pending.keep });
    return true;
  }

  /** Cards somebody is still holding, with the scene they came from. */
  get heldCards() {
    return this.state.heldCards.map((held) => ({
      ...held,
      card: this.scenes.get(held.cardId) ?? null,
    }));
  }

  /**
   * A curse ends when the players say it does. C11's ends with a drink, and only
   * the person under it knows whether they had one.
   */
  releaseHeldCard(cardId) {
    const before = this.state.heldCards.length;
    this.state.heldCards = this.state.heldCards.filter((held) => held.cardId !== cardId);
    if (this.state.heldCards.length === before) return false;
    this.#emit({ type: "heldCardReleased", cardId });
    return true;
  }

  /* ------------------------------------------------------- progress conditions */

  /** The condition holding the group on this card, or null. */
  get progress() {
    return this.state.pendingProgress ?? null;
  }

  /**
   * Do what the card asks and let the group move on.
   *
   * `outcome` names one of the condition's outcomes when it has any — G23's
   * huntsman pays for the shooting challenge only if two of the party hit the
   * tree, and nothing but the players can know whether they did.
   */
  resolveProgress(outcome = null) {
    const pending = this.state.pendingProgress;
    if (!pending) throw new Error("žádná podmínka postupu neprobíhá");

    let drawn = null;
    if (pending.kind === "encounter") {
      drawn = this.drawEncounter(pending.deck ?? "N");
    } else if (pending.kind === "encounter_card") {
      drawn = this.eventCards.get(pending.card) ?? null;
      if (drawn) {
        apply(drawn.effects, {
          state: this.state, source: drawn.id, items: this.items, drawEncounter: () => {},
        });
        this.#emit({ type: "encounter", card: drawn });
      }
    }

    const chosen = (pending.outcomes ?? []).find((o) => o.id === outcome);
    if (chosen?.effects) {
      apply(chosen.effects, {
        state: this.state,
        source: pending.scene,
        items: this.items,
        drawEncounter: (deckId) => this.drawEncounter(deckId),
      });
    }

    this.state.progressDone[pending.scene] = true;
    this.state.pendingProgress = null;
    this.#emit({ type: "progressResolved", scene: pending.scene, outcome, card: drawn });
    return drawn;
  }

  #armProgress(scene) {
    const declared = scene.progress;
    if (!declared || this.state.progressDone[scene.id]) {
      this.state.pendingProgress = null;
      return;
    }
    this.state.pendingProgress = { ...declared, scene: scene.id };
    this.#emit({ type: "progressRequired", scene: scene.id, progress: this.state.pendingProgress });
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
      items: this.items,
      drawEncounter: (deckId) => this.drawEncounter(deckId),
    });
    if (unknown.length) {
      // Loud on purpose: data declaring an effect the engine does not implement
      // would otherwise change nothing and look like it worked.
      this.#emit({ type: "unknownEffects", scene: sceneId, types: unknown });
    }

    this.#armProgress(scene);

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
