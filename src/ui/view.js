/**
 * View models.
 *
 * The DOM layer should not have to ask the engine questions, and the tests
 * should not need a browser to check what the player will see. So everything
 * between the two — which choices are locked and how that is phrased, what the
 * status bar counts, whether a card is a dead end — is built here as plain
 * objects out of the engine's public API.
 *
 * These functions read the engine; they never change it.
 */

import { MIN_PLAYERS, consequencesOf } from "../core/roles.js";
import { currentValue, recordKey, sameText, toEditorText } from "../platform/overrides.js";
import { icon, questIcon, reputationIcon, reputationIconName, reputationWord } from "./icons.js";
import { cardText, plainText } from "./text.js";

/**
 * What a locked choice says about itself.
 *
 * Locked choices stay on screen: the printed cards spell their gates out in the
 * text ("[😐 > 4] Uklidnit situaci"), so hiding the button would throw away
 * information the player already has on paper.
 */
export function lockLabel(choice) {
  if (!choice.locked) return null;
  if (choice.requirement) return `Vyžaduje: ${choice.requirement}`;
  if (choice.reason) return `Zamčeno: ${choice.reason}`;
  return "Zamčeno";
}

/**
 * The task in progress.
 *
 * Deliberately does not carry `pendingTask.to`. The whole point of the model is
 * that the card behind a task stays hidden until the players have done it, so the
 * destination must not reach the DOM at all — not in a label, not in a data
 * attribute.
 */
export function taskView(engine) {
  const pending = engine.pendingTask;
  if (!pending) return null;
  const quest = pending.quest ?? {};
  const kind = quest.kind ?? null;
  const travel = kind === "travel";
  return {
    questId: pending.questId,
    text: quest.text ?? "Probíhající úkol",
    kind,
    glyph: questIcon(kind),
    optional: quest.optional === true,
    /** a travel task ends by arriving somewhere; the others by doing something */
    confirmLabel: travel ? "Jsme na místě" : "Splnili jsme",
    cancelLabel: "Zrušit úkol",
    hint: travel
      ? "Další karta se odhalí, až na místo dojdete."
      : "Další karta se odhalí, až úkol splníte.",
    /**
     * A role ability (Milovník přírody) can tick the quest off without the group
     * confirming the arrival, which would otherwise leave them on a card with
     * every choice locked. The panel stays up and says so.
     */
    fulfilled: quest.done === true,
  };
}

/**
 * The card that will not let go yet.
 *
 * The mirror image of `taskView`: a task is the group setting off somewhere, so
 * the destination is hidden; a progress condition is the card holding them where
 * they are, so everything about it is shown. The outcomes exist because some
 * conditions have a price only the players can adjudicate — the huntsman on G23
 * pays for the shooting challenge, but only if two of them hit the tree.
 */
export function progressView(engine) {
  const pending = engine.progress;
  if (!pending) return null;
  return {
    scene: pending.scene,
    kind: pending.kind,
    text: pending.text ?? "Než budete pokračovat, splňte podmínku postupu.",
    note: pending.note ?? null,
    action: pending.action ?? "Splnili jsme",
    glyph: icon(pending.kind === "acknowledge" ? "mozek" : "hodiny"),
    eyebrow: pending.kind === "acknowledge" ? "Podmínka postupu" : "Podmínka postupu — vyhodnoťte",
    outcomes: (pending.outcomes ?? []).map((outcome) => ({
      id: outcome.id,
      label: outcome.label ?? outcome.id,
    })),
  };
}

function imageView(name, { knownImages = null, imageBase = "" } = {}) {
  if (!name) return null;
  // `knownImages` is optional: when the caller has no index of the image folder
  // the renderer still tries to load the file and swaps in the "missing" note on
  // error, so a card never renders a broken-image icon.
  const available = knownImages ? knownImages.has(name) : null;
  return { name, src: `${imageBase}${name}`, available };
}

function choiceView(annotated, declared, { pendingChoiceIndex = null, editedChoices = [] } = {}) {
  const quest = declared?.quest ?? null;
  // The cards print the task in the choice itself ("Úkol: Dojděte k pomníku"),
  // and the quest data was derived from exactly that wording — so repeating it
  // under the button would say the same thing twice. The renderer skips the line
  // when the text already contains it, and shows it when a scenario declares a
  // quest the label does not mention.
  const echoesChoiceText = Boolean(quest?.text) && (annotated.text ?? "").includes(quest.text);
  return {
    index: annotated.index,
    icon: annotated.icon,
    glyph: icon(annotated.icon),
    text: annotated.text,
    goto: annotated.goto,
    available: annotated.available,
    locked: annotated.locked,
    unlockedByAbility: annotated.unlockedByAbility,
    requirement: annotated.requirement,
    reason: annotated.reason,
    lockLabel: lockLabel(annotated),
    /**
     * This is the choice the group is out carrying out. The task panel above the
     * choices already is this choice, in progress, so the renderer leaves the
     * button out instead of repeating its label under a "probíhá úkol" lock.
     */
    inProgress: annotated.index === pendingChoiceIndex,
    /** the author has rewritten this label locally */
    edited: editedChoices.includes(annotated.index),
    quest: quest
      ? {
          id: quest.id,
          text: quest.text ?? null,
          kind: quest.kind ?? null,
          glyph: questIcon(quest.kind),
          optional: quest.optional === true,
          echoesChoiceText,
        }
      : null,
  };
}

/**
 * Everything needed to draw the current card.
 * @param {import("../core/engine.js").Engine} engine
 */
export function cardView(engine, options = {}) {
  const card = engine.card;
  if (!card) return null;
  const { position = null, knownImages = null, imageBase = "", records = [] } = options;

  const declared = card.choices ?? [];
  const pendingChoiceIndex = engine.pendingTask?.choiceIndex ?? null;
  const edited = editedFieldsOf(records, card.id);
  const choices = engine
    .choices({ position })
    .map((annotated) => choiceView(annotated, declared[annotated.index], {
      pendingChoiceIndex,
      editedChoices: edited.choices,
    }));
  const task = taskView(engine);
  const progress = progressView(engine);
  const held = heldCardsView(engine);

  return {
    id: card.id,
    cardCode: card.cardCode ?? null,
    paragraphs: cardText(card.text),
    plain: plainText(card.text),
    /**
     * The text as the data stores it. The editor works on this, not on
     * `paragraphs`: those have already had their `<br>` split into lines, and
     * saving them back would quietly delete every hard break on the card.
     */
    rawText: card.text ?? "",
    editorText: toEditorText(card.text),
    edited,
    image: imageView(card.image, { knownImages, imageBase }),
    choices,
    /** the task the group is out doing; while it is set, no choice can be taken */
    task,
    taskInProgress: Boolean(task),
    /** the condition holding the group on this card; also locks every choice */
    progress,
    progressPending: Boolean(progress),
    /** curses and personal cards still in play, shown above the card */
    held,
    ending: card.ending === true,
    finished: engine.finished,
    /**
     * A card with no way out that is not an ending is missing content, not a
     * finale. Only B02 is like that in Nebákov and the note on the card says so;
     * the UI shows the note and offers undo instead of trapping the players.
     */
    deadEnd: choices.length === 0 && card.ending !== true && !progress,
    note: card.todo ?? null,
  };
}

/**
 * A card meant for some of the players and not the rest.
 *
 * The printed game solves this by handing over a piece of card. One phone
 * cannot, so the game stops, names who should be holding it, and waits — first
 * before the text is shown, then again before play resumes, so nobody reads it
 * over a shoulder on the way back.
 */
export function privateCardView(engine) {
  const pending = engine.privateCard;
  if (!pending?.card) return null;
  const card = pending.card;
  const declared = card.private ?? {};
  const audience = pending.audience ?? declared.audience ?? "ten, komu to patří";
  return {
    cardId: pending.cardId,
    cardCode: card.cardCode ?? null,
    audience,
    prompt: pending.prompt ?? `Podejte telefon: ${audience}.`,
    note: declared.note ?? "Ostatní se prosím nedívají.",
    paragraphs: cardText(card.text),
    revealLabel: `Jsem ${audience === "ten, komu to patří" ? "to já" : "u telefonu"} — ukaž mi to`,
    doneLabel: pending.keep ? "Přečetl jsem si to a nechávám si to" : "Přečetli jsme si to",
    keep: pending.keep === true,
  };
}

/**
 * Curses and personal cards somebody is still holding.
 *
 * C11's says "you cannot speak from now on" and lifts only when that player has
 * a drink, which is exactly the kind of thing that gets forgotten five minutes
 * later — so it stays on screen above the card until it is lifted.
 */
export function heldCardsView(engine) {
  return engine.heldCards
    .filter((held) => held.card)
    .map((held) => {
      const declared = held.card.held ?? {};
      return {
        cardId: held.cardId,
        cardCode: held.card.cardCode ?? null,
        banner: declared.banner ?? held.card.cardCode ?? held.cardId,
        detail: declared.detail ?? null,
        player: held.player ?? declared.audience ?? null,
        releaseLabel: declared.release ?? "Zrušit",
        releaseNote: declared.releaseNote ?? null,
        paragraphs: cardText(held.card.text),
      };
    });
}

/**
 * A drawn card of deck N, with whatever settles it.
 *
 * `roll` is the dice already thrown, if any, and the labels on the options tell
 * the players which side of the throw they landed on — a card that says
 * "⚁⚂⚃⚄: 😡😡" is asking whether the die shows one of those four, and the app
 * answers that question rather than making them read it off a list.
 */
export function encounterView(card, { roll = null, answerShown = false } = {}) {
  if (!card) return null;
  const resolution = card.resolution ?? null;
  const dice = resolution?.dice ?? null;

  const options = (resolution?.options ?? []).map((option) => {
    let label = option.label;
    // once the dice are down, say what they mean for this option
    if (roll && Array.isArray(option.faces)) {
      const hit = roll.values.some((value) => option.faces.includes(value));
      label = hit ? (option.failLabel ?? label) : (option.passLabel ?? label);
    }
    return { id: option.id, label };
  });

  return {
    id: card.id,
    cardCode: card.cardCode ?? null,
    paragraphs: cardText(card.text),
    answer: card.answer?.text ?? null,
    answerShown,
    revealLabel: resolution?.reveal ?? "Ukázat řešení",
    resolution: Boolean(resolution),
    prompt: resolution?.prompt ?? "Jak to dopadlo?",
    note: resolution?.note ?? null,
    dice: dice
      ? {
          text: dice.text ?? "Hoďte si kostkou",
          placeholder: dice.count > 1 ? `součet nebo ${dice.count} čísel` : "co padlo",
        }
      : null,
    roll: roll
      ? {
          faces: roll.values.map(diceFace).join(" "),
          summary: roll.values.length > 1
            ? `= ${roll.values.reduce((a, b) => a + b, 0)}`
            : "",
        }
      : null,
    options,
  };
}

/** ⚀ to ⚅; anything outside one to six shows the number instead. */
function diceFace(value) {
  return ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][value - 1] ?? String(value);
}

/** The status bar: reputation, quest tally, whether undo is possible. */
export function statusView(engine) {
  const reputation = engine.state.reputation;
  const active = engine.activeQuests.length;
  const done = engine.completedQuests.length;
  return {
    reputation,
    reputationIcon: reputationIcon(reputation),
    reputationIconName: reputationIconName(reputation),
    reputationWord: reputationWord(reputation),
    reputationLabel: `Reputace ${reputation} (${reputationWord(reputation)})`,
    activeQuests: active,
    completedQuests: done,
    questSummary: `${done} splněno · ${active} aktivní`,
    carrying: (engine.inventory ?? []).length,
    canUndo: engine.canUndo,
    cardCode: engine.card?.cardCode ?? null,
  };
}

function questEntry(quest, { pendingQuestId = null } = {}) {
  const pending = quest.id === pendingQuestId;
  return {
    id: quest.id,
    text: quest.text ?? quest.id,
    kind: quest.kind ?? null,
    glyph: questIcon(quest.kind),
    optional: quest.optional === true,
    done: quest.done === true,
    /** "position"/"confirmed" close a task; "manual" is the journal or an ability */
    completedBy: quest.completedBy ?? null,
    /** this is the task the group is out doing right now */
    pending,
    /**
     * The pending task must be closed through the engine's arrival, not through
     * completeQuest: ticking it off would mark the quest done and leave the group
     * on a card where every choice reports "probíhá úkol". Same wording as the
     * panel on the card, so the two places cannot be told apart.
     */
    action: pending
      ? (quest.kind === "travel" ? "Jsme na místě" : "Splnili jsme")
      : "Splnili jsme",
  };
}

/** The quest journal: what is open, what is done, and what can be ticked off. */
export function journalView(engine) {
  const pendingQuestId = engine.pendingTask?.questId ?? null;
  const active = engine.activeQuests.map((q) => questEntry(q, { pendingQuestId }));
  const done = engine.completedQuests.map((q) => questEntry(q, { pendingQuestId }));
  return {
    active,
    done,
    pendingQuestId,
    empty: active.length === 0 && done.length === 0,
    emptyLabel: "Zatím jste na sebe žádný úkol nevzali.",
  };
}

/**
 * What the group carries, grouped so the maps do not get lost among six herbs.
 *
 * The printed game keeps these as physical cards in a pouch, and the players can
 * fan them out. On a phone that has to be a list someone can scan while walking,
 * so the things that answer "where do we go now" come first.
 */
export function inventoryView(engine) {
  const held = engine.inventory ?? [];
  const groups = [
    { id: "kletby", title: "Co na vás leží", items: [] },
    { id: "mapy", title: "Mapy a dopis", items: [] },
    { id: "predmety", title: "Předměty", items: [] },
    { id: "byliny", title: "Stránky herbáře", items: [] },
  ];
  for (const item of held) {
    // a curse is carried the same way in the data and read very differently by
    // the people carrying it, so it goes first and on its own
    const target = item.kind === "curse" ? groups[0]
      : item.pool === "byliny" ? groups[3]
      : (item.icon === "pin" || item.icon === "svitek") ? groups[1]
      : groups[2];
    target.items.push({
      id: item.id,
      name: item.name,
      glyph: item.icon ?? "batoh",
      text: item.text ?? null,
      count: item.count > 1 ? item.count : null,
    });
  }
  return {
    groups: groups.filter((group) => group.items.length),
    total: held.length,
    empty: held.length === 0,
    emptyLabel: "Zatím nic nenesete.",
  };
}

/** The closing screen. The card's own text is still shown above this summary. */
export function endingView(engine) {
  const status = statusView(engine);
  return {
    cardCode: engine.card?.cardCode ?? null,
    reputation: status.reputation,
    reputationIcon: status.reputationIcon,
    reputationWord: status.reputationWord,
    completedQuests: status.completedQuests,
    activeQuests: status.activeQuests,
    visitedCards: Object.values(engine.state.visited).filter((n) => n > 0).length,
    steps: engine.state.history.length,
    startedAt: engine.state.startedAt ?? null,
    finishedAt: engine.state.finishedAt ?? null,
    duration: durationLabel(engine.state.startedAt, engine.state.finishedAt),
  };
}

/**
 * The walk, as a text file someone can read on a train home.
 *
 * Written for the field test: eight hours and a dozen kilometres produce more
 * than anyone remembers accurately, and "the app felt wrong somewhere after the
 * mill" is not something a bug can be found from. Every step carries its card,
 * the time, the reputation it left behind and the position the device had, so a
 * complaint can be traced to a card and a place.
 */
export function trailText(engine, { scenarioName = "", version = "" } = {}) {
  const cardCode = (id) => engine.scenes.get(id)?.cardCode ?? id;
  const started = engine.state.startedAt;
  const lines = [
    `Průchod hrou — ${scenarioName || engine.scenario?.scenarioName || "?"}`,
    `začátek: ${started ?? "?"}`,
    `konec: ${engine.state.finishedAt ?? "hra ještě běží"}`,
    `doba: ${durationLabel(started, engine.state.finishedAt ?? new Date().toISOString()) ?? "?"}`,
    `hráči: ${engine.state.players.map((p) => `${p.name} (${p.roleId})`).join(", ") || "bez rolí"}`,
    `reputace na konci: ${engine.state.reputation}`,
    version ? `verze: ${version}` : null,
    "",
    "KROKY",
  ].filter((line) => line !== null);

  const clock = (iso) => (iso ? String(iso).slice(11, 19) : "--:--:--");
  for (const [index, step] of engine.state.history.entries()) {
    const place = step.at_lat != null
      ? ` @ ${step.at_lat.toFixed(5)},${step.at_lon.toFixed(5)}`
      : "";
    const quest = step.startedQuest ? ` [úkol ${step.startedQuest}]` : "";
    lines.push(`${String(index + 1).padStart(3)}. ${clock(step.at)}  `
      + `${cardCode(step.from)} → ${cardCode(step.to)}  rep ${step.reputation}${quest}${place}`);
  }
  if (engine.state.history.length === 0) lines.push("  (zatím žádný krok)");

  const drawn = engine.state.decks?.N?.drawn ?? [];
  lines.push("", `NÁHODNÁ SETKÁNÍ (${drawn.length})`);
  lines.push(drawn.length ? "  " + drawn.map((id) => cardCode(id)).join(", ") : "  žádné");

  const carried = engine.inventory ?? [];
  lines.push("", `INVENTÁŘ (${carried.length})`);
  lines.push(carried.length ? carried.map((i) => `  ${i.name}`).join("\n") : "  prázdný");

  const quests = Object.values(engine.state.quests);
  lines.push("", `ÚKOLY (${quests.filter((q) => q.done).length}/${quests.length})`);
  for (const quest of quests) {
    lines.push(`  ${quest.done ? "[x]" : "[ ]"} ${quest.text ?? quest.id}`
      + (quest.completedBy ? ` — ${quest.completedBy}` : ""));
  }
  if (!quests.length) lines.push("  žádné");

  return lines.join("\n") + "\n";
}

/** "7 h 12 min" — the game is a day out, so hours are the useful unit. */
export function durationLabel(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return null;
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

const STATUS_LABELS = Object.freeze({
  available: "hratelné",
  preparing: "připravujeme",
  retired: "nedostupné",
});

/**
 * The scenario picker. Only `status: "available"` can be started; the rest are
 * listed anyway, because a player who bought the box wants to see what is coming.
 */
export function scenarioListView(entries, { saves = {} } = {}) {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    name: entry.name ?? entry.id,
    description: entry.description ?? "",
    file: entry.file ?? null,
    image: entry.image ?? null,
    location: entry.location ?? null,
    time: entry.time ?? null,
    distance: entry.distance ?? null,
    players: entry.players ?? null,
    author: entry.author ?? null,
    version: entry.version ?? null,
    status: entry.status ?? "preparing",
    statusLabel: STATUS_LABELS[entry.status] ?? entry.status ?? "neznámý stav",
    playable: entry.status === "available",
    /** a save for this scenario, if the storage adapter found one */
    save: saves[entry.id] ?? null,
  }));
}

/** Toasts and role reminders share one strip; they differ only in tone. */
export function messageViews({ toasts = [], reminders = [] } = {}) {
  return [
    ...toasts.map((t) => ({ kind: "toast", text: t.text ?? String(t), glyph: icon("info") })),
    ...reminders.map((r) => ({
      kind: "reminder",
      text: r.text ?? String(r),
      glyph: icon("role"),
      source: r.source ?? null,
    })),
  ].filter((m) => m.text);
}

/* ---------------------------------------------------------------------- roles */

/**
 * How many players the group may set up.
 *
 * Two limits meet here: what the scenario says it is written for, and how many
 * roles exist. The engine refuses to deal more players than roles — each
 * once-per-game ability is meant to exist once in the group — so the picker must
 * not offer a number that would throw.
 */
export function playerBounds(scenario, roles = []) {
  const roleCount = roles.length;
  const declaredMin = scenario?.players_min ?? MIN_PLAYERS;
  const declaredMax = scenario?.players_max ?? (roleCount || declaredMin);
  // With fewer roles than the scenario asks for, the roles win: dealing the same
  // role twice would put two copies of a once-per-game ability in the group.
  const max = roleCount
    ? Math.min(declaredMax, roleCount)
    : Math.max(declaredMax, MIN_PLAYERS);
  const min = Math.min(Math.max(MIN_PLAYERS, declaredMin), max);
  return {
    min,
    max,
    roleCount,
    /** the scenario claims more players than it has roles for */
    limitedByRoles: roleCount > 0 && declaredMax > roleCount,
    limitNote: roleCount > 0 && declaredMax > roleCount
      ? `Rolí je jen ${roleCount}, takže hru lze rozdat nejvýš pro ${roleCount} hráčů.`
      : null,
  };
}

const TRIGGER_LABELS = Object.freeze({
  start: "na začátku",
  once: "1× za hru",
  always: "vždy",
  consequence: "následek",
});

/**
 * A single line of a role sheet.
 *
 * `condition` is the honest part: the two conditional passives (Nenasyta in pubs,
 * Lenoch outside villages) reference GPS zones that have no coordinates anywhere
 * in the game data, so the UI must not claim they apply or that they do not.
 */
function roleEntryView(entry, sort) {
  const condition = entry.condition ?? null;
  const zone = condition?.type === "gps_zone" ? condition.zone : null;
  return {
    sort,
    glyph: icon(sort === "advantage" ? "plus" : "minus"),
    text: entry.text ?? "",
    trigger: entry.trigger ?? null,
    triggerLabel: TRIGGER_LABELS[entry.trigger] ?? null,
    effectType: entry.effects?.type ?? null,
    condition,
    conditionNote: zone
      ? `Podmínku zóny „${zone}“ zatím nelze vyhodnotit — v datech hry nejsou souřadnice zón.`
      : null,
  };
}

/** One dealt role, as its player reads it out to the others. */
/**
 * One player's role card.
 *
 * The Analfabet's card is printed twice: once plainly, and once with the letters
 * shuffled — that second version is what the player holding the role reads, and
 * it is the whole mechanic, because the role is "you cannot read". The data was
 * storing only the shuffled spelling, so everybody read gibberish. `playerView`
 * now holds it and is used only for the person it belongs to.
 */
export function roleCardView(player, role = {}, { own = true } = {}) {
  const view = own ? role.playerView ?? null : null;
  const entryTexts = view
    ? [...(view.advantages ?? []), ...(view.disadvantages ?? [])]
    : null;
  const entries = [
    ...(role.advantages ?? []).map((e) => roleEntryView(e, "advantage")),
    ...(role.disadvantages ?? []).map((e) => roleEntryView(e, "disadvantage")),
  ];
  return {
    playerId: player.playerId,
    playerName: player.name ?? player.playerId,
    roleId: player.roleId ?? role.id ?? null,
    roleName: player.roleName ?? role.name ?? player.roleId,
    description: role.description ?? null,
    character: cardText(view?.character ?? role.character),
    entries: entryTexts
      ? entries.map((entry, index) => ({ ...entry, text: entryTexts[index] ?? entry.text }))
      : entries,
    /** the player is reading a version of the card only they see */
    ownView: Boolean(view),
    ownViewNote: view ? "Takhle ji vidíš ty. Ostatní čtou něco jiného." : null,
  };
}

/**
 * The roles actually in play.
 *
 * Empty for a game saved before roles existed — such a state may not even have a
 * `players` key, so every reader here treats it as absent rather than trusting
 * the shape.
 */
export function dealtRolesView(engine, roles = []) {
  return (engine.players ?? []).map((player) =>
    roleCardView(player, roles.find((r) => r.id === player.roleId) ?? {}));
}

/**
 * The once-per-game abilities still unspent.
 *
 * The Vzdělaný pedant's undo is paid for with an immediate encounter, and that
 * price is a `consequence` entry on the role — it is read from the data rather
 * than restated here, so the warning cannot drift from what the role says.
 */
export function abilitiesView(engine, roles = []) {
  const dealt = (engine.players ?? []).length > 0;
  // engine.abilities walks state.players, so it is only asked once we know there
  // are some — an old save can restore without that key at all.
  const list = (dealt ? engine.abilities : []).map((ability) => {
    const role = roles.find((r) => r.id === ability.roleId);
    const consequences = role ? consequencesOf(role).map((c) => c.text).filter(Boolean) : [];
    return {
      playerId: ability.playerId,
      playerName: ability.playerName,
      roleId: ability.roleId,
      roleName: ability.roleName,
      type: ability.type,
      text: ability.text,
      glyph: icon("plus"),
      consequences,
    };
  });
  return {
    list,
    dealt,
    empty: list.length === 0,
    emptyLabel: dealt
      ? "Všechny schopnosti jsou vyčerpané."
      : "Tato hra nemá rozdané role, takže není co použít.",
    note: "Každou schopnost lze použít jen jednou za hru. Použití nelze vzít zpět.",
    confirmPrompt: "Použít nevratně?",
  };
}

/**
 * Standing obligations, grouped per player — the role card in play.
 *
 * Built from the players rather than from the reminders, because a player can
 * have none: the Vzdělaný pedant's entries are a once-per-game ability and its
 * consequence, neither of which stands all game. Grouping the reminders alone
 * would drop that player from the sheet entirely.
 */
export function roleRulesView(engine) {
  const players = new Map(
    (engine.players ?? []).map((player) => [player.playerId, {
      playerId: player.playerId,
      playerName: player.name ?? player.playerId,
      roleName: player.roleName ?? player.roleId,
      rules: [],
      noRulesLabel: "Žádné trvalé pravidlo — role má jen schopnost na jedno použití.",
    }]),
  );

  for (const reminder of players.size ? engine.roleReminders() : []) {
    if (!players.has(reminder.playerId)) continue;
    const zone = reminder.condition?.type === "gps_zone" ? reminder.condition.zone : null;
    players.get(reminder.playerId).rules.push({
      sort: reminder.sort,
      glyph: icon(reminder.sort === "advantage" ? "plus" : "minus"),
      text: reminder.text,
      /**
       * Three honest states: the app applies it, the players keep it themselves,
       * or nobody can tell because the zone has no coordinates.
       */
      enforcement: zone ? "unknown" : reminder.enforceable ? "app" : "players",
      enforcementLabel: zone
        ? `zóna „${zone}“ — nelze vyhodnotit`
        : reminder.enforceable
          ? "hlídá aplikace"
          : "hlídáte si sami",
      zone,
    });
  }
  const list = [...players.values()];
  return {
    players: list,
    empty: list.length === 0,
    emptyLabel: "Tato hra nemá rozdané role.",
    zonesNote:
      "Podmínky na zóny (hospody, mimo obce) nejde vyhodnotit — v datech hry chybí souřadnice.",
  };
}

/* ------------------------------------------------------------- text overrides */

/** Which fields of one card the author has rewritten locally. */
export function editedFieldsOf(records = [], cardId) {
  const mine = records.filter((record) => record.cardId === cardId);
  return {
    text: mine.some((record) => record.field === "text"),
    choices: mine.filter((record) => record.field === "choice").map((record) => record.index),
    any: mine.length > 0,
  };
}

const FIELD_LABELS = Object.freeze({
  text: "Text karty",
  choice: "Volba",
});

function preview(value, limit = 90) {
  const text = toEditorText(value).replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/**
 * The list of rewrites, for the export sheet.
 *
 * `scenario` here is the scenario as the repository has it — the copy taken before
 * the rewrites were applied. Comparing against the applied copy would mark every
 * rewrite as drifted, since the applied copy already contains the new text.
 */
export function overridesView(records = [], { scenario = null, scenarioId = null } = {}) {
  const scenes = new Map((scenario?.scenes ?? []).map((scene) => [scene.id, scene]));

  const items = records.map((record) => {
    const scene = scenes.get(record.cardId) ?? null;
    const current = scenario ? currentValue(scenario, record) : null;
    const stale = scenario ? !sameText(current, record.base) : false;
    return {
      key: recordKey(record),
      cardId: record.cardId,
      cardCode: scene?.cardCode ?? record.cardId,
      field: record.field,
      index: record.index ?? null,
      label: record.field === "choice"
        ? `${FIELD_LABELS.choice} ${(record.index ?? 0) + 1}`
        : FIELD_LABELS.text,
      preview: preview(record.value),
      value: record.value,
      base: record.base,
      /** what the data says now; differs from `base` only when it drifted */
      current,
      currentPreview: preview(current),
      basePreview: preview(record.base),
      at: record.at ?? null,
      /**
       * The repository text changed after this rewrite was made, so the rewrite is
       * not applied and not exported until someone has looked at both.
       */
      stale,
      staleLabel: "Původní text se změnil",
      record,
    };
  });

  const staleCount = items.filter((item) => item.stale).length;
  return {
    scenarioId,
    items,
    count: items.length,
    staleCount,
    empty: items.length === 0,
    emptyLabel: "Zatím jste nic nepřepsali.",
    staleNote: staleCount
      ? `U ${staleCount} přepisů se změnil původní text. Dokud se nerozhodnete, nepoužijí se ani nevyexportují.`
      : null,
    copyLabel: "Zkopírovat pro Claude",
    downloadLabel: "Stáhnout JSON",
    revertAllLabel: "Vrátit všechny",
    revertAllPrompt: "Vrátit všechny přepisy?",
  };
}

/** The badge on a card whose text the author has rewritten. */
export function editModeView({ enabled, available, count = 0 }) {
  return {
    enabled,
    available,
    count,
    label: "Režim úprav",
    hint: enabled
      ? "U textu karty a u voleb je tlačítko úpravy. Přepisují se jen texty, nikdy postup hry."
      : "Zapne tlačítka pro přepis textů přímo ve hře.",
    unavailableNote: available
      ? null
      : "Bez úložiště prohlížeče by se přepisy neuložily, takže je režim úprav vypnutý.",
  };
}
