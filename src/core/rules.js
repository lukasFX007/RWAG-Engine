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

export const conditions = new Map();

export function registerCondition(type, fn) {
  conditions.set(type, fn);
}

/**
 * @returns {{ met: boolean, reason: string|null, requirement: string|null }}
 */
export function evaluate(condition, ctx) {
  const fn = conditions.get(condition.type);
  if (!fn) {
    // An unknown condition must not silently pass — that would unlock a choice
    // the author meant to gate.
    return {
      met: false,
      reason: `neznámý typ podmínky: ${condition.type}`,
      requirement: null,
    };
  }
  return fn(condition, ctx);
}

export function evaluateAll(list, ctx) {
  const results = (list ?? []).map((c) => evaluate(c, ctx));
  return {
    met: results.every((r) => r.met),
    failures: results.filter((r) => !r.met),
  };
}

const OPERATORS = {
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
};

/** Wording of what the player must reach for the choice to open. */
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
    return { met: false, reason: `neznámý operátor: ${condition.operator}`, requirement: null };
  }
  // `disableIf` states when a choice is LOCKED, so the condition matching means
  // the choice is unavailable.
  const locked = op(state.reputation, condition.value);
  return {
    met: !locked,
    reason: locked ? `reputace ${state.reputation} nesplňuje podmínku` : null,
    requirement: repRequirement(condition.operator, condition.value),
  };
});

registerCondition("gps_zone", (condition, { position }) => {
  if (!position) {
    return {
      met: false,
      reason: "poloha není známá",
      requirement: `být v zóně „${condition.zone}“`,
    };
  }
  const inside = position.zones?.includes(condition.zone) ?? false;
  return {
    met: inside,
    reason: inside ? null : `nejste v zóně „${condition.zone}“`,
    requirement: `být v zóně „${condition.zone}“`,
  };
});

registerCondition("visited", (condition, { state }) => {
  const count = state.visited[condition.scene] ?? 0;
  const met = condition.negate ? count === 0 : count > 0;
  return {
    met,
    reason: met ? null : `karta ${condition.scene} ${condition.negate ? "již byla" : "ještě nebyla"} navštívena`,
    requirement: null,
  };
});

registerCondition("has_item", (condition, { state }) => {
  const owned = (state.inventory[condition.item]?.count ?? 0) > 0;
  return {
    met: owned,
    reason: owned ? null : `chybí předmět: ${condition.item}`,
    requirement: `mít u sebe ${condition.item}`,
  };
});

registerCondition("quest_done", (condition, { state }) => {
  const done = state.quests[condition.quest]?.done === true;
  return {
    met: done,
    reason: done ? null : `úkol ${condition.quest} není splněný`,
    requirement: `splnit úkol ${condition.quest}`,
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
  for (const effect of list ?? []) {
    const fn = effects.get(effect.type);
    if (!fn) {
      unknown.push(effect.type);
      continue;
    }
    fn(effect, ctx);
  }
  return { unknown };
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
