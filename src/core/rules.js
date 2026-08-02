/**
 * Conditions and effects, as registries rather than switch statements.
 *
 * The data declares 14 effect types and the list will grow with every scenario,
 * so adding one has to mean registering a handler, not editing a branch in the
 * middle of the engine.
 *
 * Nine of the declared effects are social rules — "the answer must be repeated
 * to you", "you cannot use weapons", "you tip more" — which software cannot
 * enforce. Those are registered as reminders: the engine records them so the UI
 * can show the players what their role obliges them to do, and changes nothing
 * else. That is a deliberate limit, not a gap.
 */

/* ------------------------------------------------------------------ conditions */

/**
 * One registry, one meaning: a condition answers "is this true right now".
 *
 * It is used from two places that want opposite things from that answer.
 * `disableIf` on a choice LOCKS it when a condition is true; `when` on an effect
 * FIRES it when a condition is true. Writing the handlers to answer the question
 * rather than the consequence is what lets the same JSON mean the same thing in
 * both fields — an earlier version inverted inside the `reputation` handler and
 * not inside the others, which held together only because each type happened to
 * be used in one place.
 *
 * The unknown case differs, and deliberately: an unrecognised condition locks a
 * choice (never open a gate the author meant to close) and suppresses an effect
 * (never charge a price the author meant to condition). Both are the cautious
 * direction; they just point opposite ways.
 */
export const conditions = new Map();

export function registerCondition(type, fn) {
  conditions.set(type, fn);
}

/** @returns {{known: boolean, holds: boolean, reason: string|null, requirement: string|null}} */
export function evaluate(condition, ctx) {
  const fn = conditions.get(condition.type);
  if (!fn) {
    return {
      known: false,
      holds: false,
      reason: `neznámý typ podmínky: ${condition.type}`,
      requirement: null,
    };
  }
  return { known: true, ...fn(condition, ctx) };
}

/** True when the condition is true. Unknown types are not true. */
export function holds(condition, ctx) {
  return evaluate(condition, ctx).holds === true;
}

export function holdsAll(list, ctx) {
  return (list ?? []).every((condition) => holds(condition, ctx));
}

/**
 * Whether a choice's `disableIf` closes it, and how to say so.
 * @returns {{locked: boolean, reasons: string[], requirements: string[]}}
 */
export function lockState(list, ctx) {
  const reasons = [];
  const requirements = [];
  let locked = false;

  for (const condition of list ?? []) {
    const result = evaluate(condition, ctx);
    // an unknown condition is treated as closing the gate
    if (!result.known || result.holds) {
      locked = true;
      if (result.reason) reasons.push(result.reason);
      if (result.requirement) requirements.push(result.requirement);
    }
  }
  return { locked, reasons, requirements };
}

const OPERATORS = {
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
};

/** Wording of what the players would need for a choice locked by this to open. */
function repRequirement(operator, value) {
  switch (operator) {
    case "<": return `reputace ${value} nebo více`;
    case "<=": return `reputace více než ${value}`;
    case ">": return `reputace ${value} nebo méně`;
    case ">=": return `reputace méně než ${value}`;
    case "==": return `reputace jiná než ${value}`;
    case "!=": return `reputace přesně ${value}`;
    default: return null;
  }
}

registerCondition("reputation", (condition, { state }) => {
  const op = OPERATORS[condition.operator];
  if (!op) {
    return { holds: false, reason: `neznámý operátor: ${condition.operator}`, requirement: null };
  }
  return {
    holds: op(state.reputation, condition.value),
    reason: `reputace ${state.reputation} nesplňuje podmínku`,
    requirement: repRequirement(condition.operator, condition.value),
  };
});

registerCondition("gps_zone", (condition, { position }) => {
  const inside = position ? (position.zones?.includes(condition.zone) ?? false) : false;
  // Without a position nothing is known, so "in the zone" is false either way.
  // A choice that requires being there stays shut, which is what the printed
  // card does too: it asks the players to be standing in the right place.
  return {
    holds: condition.negate ? !inside : inside,
    reason: position
      ? (inside ? `jste v zóně „${condition.zone}“` : `nejste v zóně „${condition.zone}“`)
      : "poloha není známá",
    requirement: condition.negate ? `být v zóně „${condition.zone}“` : null,
  };
});

registerCondition("visited", (condition, { state }) => {
  const count = state.visited[condition.scene] ?? 0;
  const card = condition.scene.replace(/^card_/, "");
  return {
    holds: condition.negate ? count === 0 : count > 0,
    reason: condition.negate ? `karta ${card} ještě nepadla` : `karta ${card} už padla`,
    requirement: condition.negate ? `nejdřív projít kartu ${card}` : null,
  };
});

registerCondition("has_item", (condition, { state }) => {
  const owned = (state.inventory[condition.item]?.count ?? 0) > 0;
  return {
    holds: condition.negate ? !owned : owned,
    reason: condition.negate ? `chybí ${condition.item}` : `máte ${condition.item}`,
    requirement: condition.negate ? `mít u sebe ${condition.item}` : null,
  };
});

registerCondition("quest_done", (condition, { state }) => {
  const done = state.quests[condition.quest]?.done === true;
  return {
    holds: condition.negate ? !done : done,
    reason: condition.negate ? `úkol ${condition.quest} není splněný` : `úkol ${condition.quest} je splněný`,
    requirement: condition.negate ? `splnit úkol ${condition.quest}` : null,
  };
});

/* -------------------------------------------------------------------- effects */

export const effects = new Map();

export function registerEffect(type, fn) {
  effects.set(type, fn);
}

/** Effects the engine can only surface as a reminder to the players. */
export const REMINDER_EFFECTS = {
  roleplay_twice_answer: "Pokud se na něco zeptáš, musí ti to dotazovaný říct dvakrát.",
  roleplay_cant_use_weapons: "Nemůžeš používat zbraně a nože.",
  roleplay_no_tips: "Nemusíš nechávat spropitné.",
  roleplay_cant_read_nor_calculate: "Neumíš číst ani počítat.",
  roleplay_buy_and_eat: "U místa, kde se prodává jídlo, si musíš něco koupit a hned to sníst.",
  roleplay_higher_tip: "Platíš jako poslední a dáváš vyšší spropitné.",
  roleplay_no_meat: "Jíš pouze bezmasá jídla.",
};

for (const [type, text] of Object.entries(REMINDER_EFFECTS)) {
  registerEffect(type, (effect, { state, source }) => {
    state.reminders.push({ type, text, source: source ?? null });
  });
}

export function apply(list, ctx) {
  const unknown = [];
  const skipped = [];
  for (const effect of list ?? []) {
    const fn = effects.get(effect.type);
    if (!fn) {
      unknown.push(effect.type);
      continue;
    }
    // `when` gates the effect itself, not the choice that carries it
    if (effect.when && !holdsAll(effect.when, ctx)) {
      skipped.push(effect.type);
      continue;
    }
    fn(effect, ctx);
  }
  return { unknown, skipped };
}

registerEffect("reputation", (effect, { state }) => {
  if (effect.value < 0 && state.pendingIgnoreReputationLoss) {
    state.pendingIgnoreReputationLoss = false;
    state.toasts.push({ text: "Ztráta reputace byla ignorována (Šlechtic)." });
    return;
  }
  state.reputation += effect.value;
});

registerEffect("toast", (effect, { state }) => {
  state.toasts.push({ text: effect.text });
});

registerEffect("item", (effect, { state }) => {
  const entry = state.inventory[effect.item] ?? { id: effect.item, name: effect.name ?? effect.item, count: 0 };
  entry.count += effect.count ?? 1;
  state.inventory[effect.item] = entry;
});

registerEffect("quest", (effect, { state, source }) => {
  state.quests[effect.quest] = {
    id: effect.quest,
    text: effect.text ?? null,
    sceneId: source ?? null,
    done: false,
  };
});

registerEffect("quest_done", (effect, { state }) => {
  const quest = state.quests[effect.quest];
  if (quest) quest.done = true;
});

/** Cards a single player keeps, such as the curse on C11. */
registerEffect("hold_card", (effect, { state, source }) => {
  state.heldCards.push({
    cardId: effect.card ?? source,
    player: effect.player ?? null,
  });
});

/* Role abilities. These arm a flag that the engine consumes at the right
   moment, because their effect is on the next action, not on the state now. */

registerEffect("ignore_reputation_loss", (effect, { state }) => {
  state.pendingIgnoreReputationLoss = true;
});

registerEffect("ignore_choice_condition", (effect, { state }) => {
  state.pendingIgnoreChoiceCondition = true;
});

registerEffect("ignore_encounter", (effect, { state }) => {
  state.pendingIgnoreEncounter = true;
});

registerEffect("return_on_choice", (effect, { state }) => {
  state.pendingUndo = true;
});

registerEffect("nature_quest_done", (effect, { state }) => {
  const quest = Object.values(state.quests).find((q) => !q.done && q.kind === "nature");
  if (quest) quest.done = true;
});

/** Draw the top card of deck N right now. Handled by the engine, which owns the decks. */
registerEffect("encounter", (effect, { state, drawEncounter }) => {
  if (state.pendingIgnoreEncounter) {
    state.pendingIgnoreEncounter = false;
    state.toasts.push({ text: "Náhodnému setkání jste předešli (Lenoch)." });
    return;
  }
  drawEncounter?.(effect.deck ?? "N");
});
