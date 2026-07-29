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

function imageView(name, { knownImages = null, imageBase = "" } = {}) {
  if (!name) return null;
  // `knownImages` is optional: when the caller has no index of the image folder
  // the renderer still tries to load the file and swaps in the "missing" note on
  // error, so a card never renders a broken-image icon.
  const available = knownImages ? knownImages.has(name) : null;
  return { name, src: `${imageBase}${name}`, available };
}

function choiceView(annotated, declared, { pendingChoiceIndex = null } = {}) {
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
  const { position = null, knownImages = null, imageBase = "" } = options;

  const declared = card.choices ?? [];
  const pendingChoiceIndex = engine.pendingTask?.choiceIndex ?? null;
  const choices = engine
    .choices({ position })
    .map((annotated) => choiceView(annotated, declared[annotated.index], { pendingChoiceIndex }));
  const task = taskView(engine);

  return {
    id: card.id,
    cardCode: card.cardCode ?? null,
    paragraphs: cardText(card.text),
    plain: plainText(card.text),
    image: imageView(card.image, { knownImages, imageBase }),
    choices,
    /** the task the group is out doing; while it is set, no choice can be taken */
    task,
    taskInProgress: Boolean(task),
    ending: card.ending === true,
    finished: engine.finished,
    /**
     * A card with no way out that is not an ending is missing content, not a
     * finale. Only B02 is like that in Nebákov and the note on the card says so;
     * the UI shows the note and offers undo instead of trapping the players.
     */
    deadEnd: choices.length === 0 && card.ending !== true,
    note: card.todo ?? null,
  };
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
export function roleCardView(player, role = {}) {
  return {
    playerId: player.playerId,
    playerName: player.name ?? player.playerId,
    roleId: player.roleId ?? role.id ?? null,
    roleName: player.roleName ?? role.name ?? player.roleId,
    description: role.description ?? null,
    character: cardText(role.character),
    entries: [
      ...(role.advantages ?? []).map((e) => roleEntryView(e, "advantage")),
      ...(role.disadvantages ?? []).map((e) => roleEntryView(e, "disadvantage")),
    ],
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
