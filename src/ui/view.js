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
