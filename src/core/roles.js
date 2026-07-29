/**
 * Roles.
 *
 * Card P03 hands them out: each player draws one at random, reads it aloud and
 * plays to it. That draw is the only thing that makes the reputation economy and
 * the once-per-game abilities mean anything, so it belongs in the core rather
 * than in the UI.
 *
 * A role entry's `trigger` says when it applies (see tools/annotate_roles.py):
 *
 *   start        applied the moment roles are handed out
 *   once         the players spend it when they decide to
 *   always       stands all game; the roleplay ones are reminders only
 *   consequence  fires right after that role's `once` ability is spent
 */

import { makeRng, shuffled } from "./decks.js";
import { apply } from "./rules.js";

export const MIN_PLAYERS = 3;

function entries(role) {
  return [
    ...(role.advantages ?? []).map((e) => ({ ...e, sort: "advantage" })),
    ...(role.disadvantages ?? []).map((e) => ({ ...e, sort: "disadvantage" })),
  ];
}

export function abilitiesOf(role) {
  return entries(role)
    .filter((e) => e.trigger === "once" && e.sort === "advantage")
    .map((e) => ({ type: e.effects?.type, text: e.text, effect: e.effects }));
}

export function consequencesOf(role) {
  return entries(role)
    .filter((e) => e.trigger === "consequence")
    .map((e) => ({ type: e.effects?.type, text: e.text, effect: e.effects }));
}

export function passivesOf(role) {
  return entries(role)
    .filter((e) => e.trigger === "always")
    .map((e) => ({
      type: e.effects?.type,
      text: e.text,
      effect: e.effects,
      condition: e.condition ?? null,
      sort: e.sort,
    }));
}

export function startEffectsOf(role) {
  return entries(role)
    .filter((e) => e.trigger === "start")
    .map((e) => ({ type: e.effects?.type, text: e.text, effect: e.effects }));
}

/**
 * Deal one role per player. Fewer roles than players is a data problem, not
 * something to paper over by handing the same role out twice — each role's
 * once-per-game ability is meant to exist once.
 */
export function dealRoles(roles, playerCount, { seed = 1, cursor = 0, names = [] } = {}) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error("žádné role k rozdělení");
  }
  if (playerCount < 1) throw new Error("hra potřebuje aspoň jednoho hráče");
  if (playerCount > roles.length) {
    throw new Error(
      `hráčů (${playerCount}) je víc než rolí (${roles.length}); každá role má být ve hře jen jednou`,
    );
  }

  const rng = makeRng(seed, cursor);
  const drawn = shuffled(roles.map((r) => r.id), rng).slice(0, playerCount);

  return drawn.map((roleId, index) => {
    const role = roles.find((r) => r.id === roleId);
    return {
      playerId: `p${index + 1}`,
      name: names[index] || `Hráč ${index + 1}`,
      roleId,
      roleName: role.name,
      abilities: abilitiesOf(role).map((a) => a.type).filter(Boolean),
      usedOnce: {},
    };
  });
}

/** Apply everything the roles do the moment they are handed out. */
export function applyStartEffects(state, roles) {
  const applied = [];
  for (const player of state.players) {
    const role = roles.find((r) => r.id === player.roleId);
    if (!role) continue;
    for (const entry of startEffectsOf(role)) {
      if (!entry.effect) continue;
      apply([entry.effect], { state, source: `role:${role.id}` });
      applied.push({ playerId: player.playerId, roleId: role.id, text: entry.text });
    }
  }
  return applied;
}

/** Reminders for the rules the engine cannot enforce, one list per player. */
export function passiveReminders(state, roles) {
  return state.players.flatMap((player) => {
    const role = roles.find((r) => r.id === player.roleId);
    if (!role) return [];
    return passivesOf(role).map((entry) => ({
      playerId: player.playerId,
      playerName: player.name,
      roleName: role.name,
      sort: entry.sort,
      text: entry.text,
      /** conditional passives cannot be judged without a position */
      condition: entry.condition,
      enforceable: entry.type === "reputation" && !entry.condition,
    }));
  });
}
