/**
 * Game state.
 *
 * Everything the engine needs to resume a game lives in one plain object, so a
 * save is `JSON.stringify(state)` and nothing else. The state is never mutated
 * from outside: the engine hands out frozen snapshots and applies changes
 * through effects.
 *
 * The scenario graph is acyclic, but a card can still be seen twice — deck N
 * recycles evaluated cards to the bottom, and the Vzdělaný pedant role can take
 * a decision back — so `visited` is a count per scene, not a set, and `history`
 * is kept for undo.
 */

export const STATE_VERSION = 1;

export function createState({ scenarioId, startScene, players = [], seed = 1 } = {}) {
  return {
    version: STATE_VERSION,
    scenarioId: scenarioId ?? null,
    startedAt: null,
    finishedAt: null,

    currentScene: startScene ?? null,
    /** scene id -> how many times it has been shown */
    visited: {},
    /** entries pushed on every transition, used by undo */
    history: [],

    reputation: 0,
    /** quest id -> { id, text, sceneId, done } */
    quests: {},
    /** item id -> { id, name, count } */
    inventory: {},
    /** deck id -> { order: [...cardIds], drawn: [...cardIds] } */
    decks: {},
    /** cards held by a single player, e.g. a curse: [{ cardId, player }] */
    heldCards: [],
    /** roles in play: [{ playerId, roleId, usedOnce: { effectType: true } }] */
    players: players.map((p) => ({ ...p, usedOnce: {} })),

    /** rules the engine cannot enforce, surfaced to the players as reminders */
    reminders: [],
    /** transient messages for the UI, cleared once shown */
    toasts: [],
    /** deterministic RNG cursor so a replay from a save behaves the same */
    seed,
    rngCursor: 0,
  };
}

export function cloneState(state) {
  return structuredClone(state);
}

export function serialise(state) {
  return JSON.stringify(state);
}

export function deserialise(text) {
  const parsed = JSON.parse(text);
  if (parsed.version !== STATE_VERSION) {
    throw new Error(
      `nepodporovaná verze uloženého stavu: ${parsed.version} (engine umí ${STATE_VERSION})`,
    );
  }
  return parsed;
}

export function visitCount(state, sceneId) {
  return state.visited[sceneId] ?? 0;
}

/** Roles currently in play, flattened for condition checks. */
export function activeRoleIds(state) {
  return state.players.map((p) => p.roleId).filter(Boolean);
}

/**
 * A once-per-game role ability is available while no player who holds it has
 * spent it yet. Returns the player that can still use it, or null.
 */
export function playerWithUnusedAbility(state, effectType) {
  return state.players.find((p) => p.abilities?.includes(effectType) && !p.usedOnce[effectType])
    ?? null;
}

export function markAbilityUsed(state, playerId, effectType) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (player) player.usedOnce[effectType] = true;
}
