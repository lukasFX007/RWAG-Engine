/**
 * DOM rendering.
 *
 * Every function here takes a view model from view.js plus callbacks, and gives
 * back detached elements. It asks the engine nothing, so the layout can be
 * rearranged without touching game logic — and the controller in app.js stays
 * the only place that knows about state.
 */

import { toEditorText } from "../platform/overrides.js";
import { clear, el, withBreaks } from "./dom.js";
import { icon } from "./icons.js";

/* --------------------------------------------------------------------- card */

function missingImage(image) {
  return el("p", {
    class: "img-missing",
    text: `Obrázek chybí${image?.name ? ` (${image.name})` : ""}`,
  });
}

function renderImage(image) {
  const figure = el("figure", { class: "card-figure" });
  if (image.available === false) {
    figure.append(missingImage(image));
    return figure;
  }
  const img = el("img", {
    class: "card-image",
    src: image.src,
    alt: "Ilustrace ke kartě",
    decoding: "async",
  });
  // The image folder holds only some of the illustrations the cards ask for
  // (lipa02.jpg is not in the data), so a failed load is an expected state.
  img.addEventListener("error", () => figure.replaceChildren(missingImage(image)));
  figure.append(img);
  return figure;
}

function renderChoice(choice, onChoose, edit = null) {
  const parts = [
    el("span", { class: "choice-icon", "aria-hidden": "true", text: choice.glyph || "·" }),
    el("span", { class: "choice-body" },
      el("span", { class: "choice-text", text: choice.text }),
      choice.quest && !choice.quest.echoesChoiceText
        ? el("span", { class: "choice-quest" },
            el("span", { "aria-hidden": "true", text: `${choice.quest.glyph} ` }),
            `Úkol: ${choice.quest.text ?? choice.quest.id}`,
            choice.quest.optional ? " (nepovinný)" : "")
        : null,
      choice.lockLabel
        ? el("span", { class: "choice-lock" },
            el("span", { "aria-hidden": "true", text: `${icon("zamceno")} ` }),
            choice.lockLabel)
        : null,
      choice.unlockedByAbility
        ? el("span", { class: "choice-unlocked" },
            el("span", { "aria-hidden": "true", text: `${icon("odemceno")} ` }),
            "Odemčeno schopností role")
        : null,
    ),
  ];

  // A choice can be gated *and* open: a role ability overrides the gate for one
  // decision. Then the requirement still shows — it is what the card printed —
  // but the button works, so the lock styling follows `available`, not `locked`.
  const state = choice.available ? (choice.unlockedByAbility ? " is-unlocked" : "") : " is-locked";
  const button = el("button", {
    type: "button",
    class: `choice${state}`,
    dataset: { index: String(choice.index) },
    disabled: !choice.available,
    "aria-disabled": choice.available ? null : "true",
    onclick: () => onChoose?.(choice.index),
  }, parts);

  if (choice.locked && choice.lockLabel) button.title = choice.lockLabel;

  const item = el("li", { class: "choice-item" }, button);

  // The edit button is a sibling, not a child: a button inside a button is
  // invalid HTML, and tapping "edit" must never count as taking the choice.
  if (edit) {
    const editButton = el("button", {
      type: "button",
      class: `text-edit${choice.edited ? " is-edited" : ""}`,
      "aria-label": `Upravit text volby ${choice.index + 1}`,
      title: "Upravit text volby",
      onclick: () => openChoiceEditor(item, button, choice, edit),
    }, icon("psani"));
    item.append(editButton);
  }
  return item;
}

/**
 * Swap a choice for a textarea.
 *
 * Editing is local DOM state until it is saved; the controller only hears about a
 * rewrite that the author confirmed, and cancelling puts the button back exactly
 * as it was.
 */
function openChoiceEditor(item, button, choice, edit) {
  const field = el("textarea", {
    class: "text-editor",
    rows: "3",
    "aria-label": `Text volby ${choice.index + 1}`,
  });
  field.value = choice.text;

  const restore = () => item.replaceChildren(...kept);
  const kept = [...item.childNodes];

  item.replaceChildren(el("div", { class: "editor" },
    field,
    el("p", { class: "editor-hint", text: "Přepisuje se jen text volby. Kam vede a co stojí, zůstává." }),
    el("div", { class: "editor-actions" },
      el("button", {
        type: "button",
        class: "btn btn-small btn-primary",
        onclick: () => edit.onSaveChoice?.(choice.index, field.value),
      }, "Uložit"),
      el("button", { type: "button", class: "btn btn-small btn-quiet", onclick: restore }, "Zrušit"),
      choice.edited
        ? el("button", {
            type: "button",
            class: "btn btn-small btn-quiet",
            onclick: () => edit.onRevertChoice?.(choice.index),
          }, "Vrátit původní")
        : null,
    ),
  ));
  field.focus();
}

export function renderChoices(choices, onChoose, { blocked = false, edit = null } = {}) {
  const list = el("ul", { class: `choices${blocked ? " is-blocked" : ""}` });
  for (const choice of choices) list.append(renderChoice(choice, onChoose, edit));
  return list;
}

/* --------------------------------------------------------------- task panel */

/**
 * The task the group is out doing.
 *
 * This is the only way forward while a task is in progress, so it is the loudest
 * thing on the card — and it says nothing about where the task leads, because the
 * destination is what the walk is for.
 */
export function renderTaskPanel(task, { onConfirm, onCancel } = {}) {
  return el("section", { class: "task", role: "group", "aria-label": "Probíhající úkol" },
    el("p", { class: "task-eyebrow", text: "Probíhá úkol" }),
    el("p", { class: "task-text" },
      el("span", { class: "task-icon", "aria-hidden": "true", text: `${task.glyph} ` }),
      task.text,
      task.optional ? el("span", { class: "task-tag", text: " (nepovinný)" }) : null),
    el("p", { class: "task-hint", text: task.hint }),
    task.fulfilled
      ? el("p", { class: "task-note", text: "Úkol je už označený jako splněný. Potvrďte ho, aby se odhalila další karta." })
      : null,
    el("div", { class: "task-actions" },
      el("button", { type: "button", class: "btn btn-primary btn-wide", onclick: () => onConfirm?.() },
        task.confirmLabel),
      el("button", { type: "button", class: "btn btn-quiet", onclick: () => onCancel?.() },
        task.cancelLabel),
    ),
  );
}

/**
 * The panel for a card that holds the group where they are.
 *
 * Deliberately shaped like the task panel and worded differently: both lock
 * every choice underneath, and a player who cannot tell them apart cannot tell
 * whether they are supposed to walk somewhere or to do something here.
 */
export function renderProgressPanel(progress, { onResolve } = {}) {
  const actions = el("div", { class: "task-actions" });
  if (progress.outcomes.length) {
    for (const outcome of progress.outcomes) {
      actions.append(el("button", {
        type: "button",
        class: "btn btn-wide",
        onclick: () => onResolve?.(outcome.id),
      }, outcome.label));
    }
  } else {
    actions.append(el("button", {
      type: "button",
      class: "btn btn-primary btn-wide",
      onclick: () => onResolve?.(null),
    }, progress.action));
  }

  return el("section", { class: "task task-progress", role: "group", "aria-label": "Podmínka postupu" },
    el("p", { class: "task-eyebrow", text: progress.eyebrow }),
    el("p", { class: "task-text" },
      el("span", { class: "task-icon", "aria-hidden": "true", text: `${progress.glyph} ` }),
      progress.text),
    progress.note ? el("p", { class: "task-note", text: progress.note }) : null,
    el("p", { class: "task-hint", text: "Dokud to neuděláte, karta vás nepustí dál." }),
    actions,
  );
}

/**
 * Handing the phone over.
 *
 * Two taps rather than one, and deliberately: the first is the person taking the
 * phone, the second is them giving it back. Between those two the text is on
 * screen, and outside them it is not.
 */
export function renderPrivateCard(view, { onReveal, onDone, revealed = false } = {}) {
  const root = el("section", { class: "private", role: "group", "aria-label": "Osobní karta" });
  root.append(
    el("p", { class: "eyebrow", text: "Jen pro jednoho" }),
    el("h2", { class: "private-title", text: view.prompt }),
    el("p", { class: "muted", text: view.note }),
  );

  if (!revealed) {
    root.append(el("button", {
      type: "button", class: "btn btn-primary btn-wide", onclick: () => onReveal?.(),
    }, view.revealLabel));
    return root;
  }

  const body = el("div", { class: "private-body" });
  if (view.cardCode) body.append(el("span", { class: "card-code", text: view.cardCode }));
  for (const lines of view.paragraphs) body.append(el("p", {}, withBreaks(lines)));
  root.append(body);
  root.append(el("button", {
    type: "button", class: "btn btn-primary btn-wide", onclick: () => onDone?.(),
  }, view.doneLabel));
  return root;
}

/** Curses still in force, above the card so they cannot be forgotten. */
export function renderHeldCards(held, { onRelease } = {}) {
  const root = el("div", { class: "held-strip" });
  for (const card of held) {
    root.append(el("section", { class: "held", role: "status" },
      el("div", { class: "held-body" },
        el("p", { class: "held-banner" },
          el("span", { "aria-hidden": "true", text: `${icon("lebka")} ` }),
          card.banner),
        card.player ? el("p", { class: "held-who", text: card.player }) : null,
        card.detail ? el("p", { class: "held-detail", text: card.detail }) : null,
      ),
      el("button", {
        type: "button", class: "btn btn-small", onclick: () => onRelease?.(card.cardId),
      }, card.releaseLabel),
    ));
  }
  return root;
}

/** The card's text, with an edit button when the author is in edit mode. */
function renderCardText(view, edit) {
  const block = el("div", { class: "card-text" });
  for (const lines of view.paragraphs) block.append(el("p", {}, withBreaks(lines)));

  if (!edit) return block;

  const wrap = el("div", { class: "text-block" });
  const editButton = el("button", {
    type: "button",
    class: `text-edit text-edit-card${view.edited.text ? " is-edited" : ""}`,
    title: "Upravit text karty",
    "aria-label": "Upravit text karty",
    onclick: () => {
      const field = el("textarea", { class: "text-editor", rows: "10", "aria-label": "Text karty" });
      field.value = view.editorText;
      const kept = [...wrap.childNodes];
      wrap.replaceChildren(el("div", { class: "editor" },
        field,
        el("p", { class: "editor-hint", text: "Prázdný řádek dělí odstavce, <br> zalomí řádek uvnitř odstavce." }),
        el("div", { class: "editor-actions" },
          el("button", {
            type: "button",
            class: "btn btn-small btn-primary",
            onclick: () => edit.onSaveText?.(field.value),
          }, "Uložit"),
          el("button", {
            type: "button",
            class: "btn btn-small btn-quiet",
            onclick: () => wrap.replaceChildren(...kept),
          }, "Zrušit"),
          view.edited.text
            ? el("button", {
                type: "button",
                class: "btn btn-small btn-quiet",
                onclick: () => edit.onRevertText?.(),
              }, "Vrátit původní")
            : null,
        ),
      ));
      field.focus();
    },
  }, icon("psani"));

  wrap.append(block, editButton);
  return wrap;
}

/**
 * Deeds to tick off on this card.
 *
 * A real checkbox, not a button that looks like one: the group needs to see at a
 * glance whether they did it, and to be able to untick a mis-tap. Nothing moves
 * when it changes — what it changes is where "Pokračovat" goes next.
 */
function renderCardTasks(tasks, onToggle) {
  const list = el("ul", { class: "card-tasks" });
  for (const task of tasks) {
    const box = el("input", { type: "checkbox", class: "card-task-box", id: `task-${task.id}` });
    box.checked = task.done;
    box.addEventListener("change", () => onToggle?.(task, box.checked));
    list.append(el("li", { class: `card-task${task.done ? " is-done" : ""}` },
      el("label", { class: "card-task-label", for: `task-${task.id}` },
        box,
        el("span", { class: "card-task-icon", "aria-hidden": "true", text: task.glyph }),
        el("span", { class: "card-task-text", text: task.label }),
      )));
  }
  return list;
}

export function renderCard(view, {
  onChoose, onUndo, onConfirmTask, onCancelTask, onResolveProgress, onReleaseHeld,
  onToggleTask, onAddNote, edit = null,
} = {}) {
  const root = el("article", { class: "card", "aria-live": "polite" });

  root.append(el("div", { class: "card-head" },
    view.cardCode ? el("span", { class: "card-code", text: view.cardCode }) : null,
    view.ending ? el("span", { class: "badge badge-end", text: "závěr" }) : null,
    view.deadEnd ? el("span", { class: "badge badge-warn", text: "bez pokračování" }) : null,
    view.taskInProgress ? el("span", { class: "badge badge-task", text: "úkol" }) : null,
    view.edited.any ? el("span", { class: "badge badge-edit", text: "upravený text" }) : null,
  ));

  if (view.held?.length) root.append(renderHeldCards(view.held, { onRelease: onReleaseHeld }));

  if (view.image) root.append(renderImage(view.image));

  root.append(renderCardText(view, edit));

  if (view.deadEnd) {
    root.append(el("div", { class: "notice" },
      el("p", { text: "Tato karta nemá ve scénáři pokračování — obsah zatím chybí." }),
      view.note ? el("p", { class: "notice-note", text: view.note }) : null,
      onUndo ? el("button", { type: "button", class: "btn btn-quiet", onclick: onUndo },
        `${icon("zpet")} Vrátit poslední rozhodnutí`) : null,
    ));
  }

  if (view.tasks?.length) root.append(renderCardTasks(view.tasks, onToggleTask));

  if (view.progress) {
    root.append(renderProgressPanel(view.progress, { onResolve: onResolveProgress }));
  }
  if (view.task) {
    root.append(renderTaskPanel(view.task, { onConfirm: onConfirmTask, onCancel: onCancelTask }));
  }
  // The choice a task came from is the panel above, so it is not listed twice.
  const shown = view.choices.filter((choice) => !choice.inProgress);
  if (shown.length) {
    root.append(renderChoices(shown, onChoose, {
      blocked: view.taskInProgress || view.progressPending, edit,
    }));
  }

  // Deliberately last and deliberately quiet: writing a note is not a move in
  // the game, and it must never be mistaken for one of the ways on.
  if (onAddNote) {
    root.append(el("div", { class: "card-note-row" },
      el("button", { type: "button", class: "btn btn-small btn-quiet", onclick: () => onAddNote() },
        `${icon("psani")} Poznámka`)));
  }
  return root;
}

/* ----------------------------------------------------------------- encounter */

/**
 * A card of deck N and the way it is settled.
 *
 * Every card prints what it pays or costs and the app cannot know which applies:
 * only the players know whether they sang, guessed, or rolled a two. So the
 * options are buttons, and the dice cards get both ways of rolling — the app can
 * do it, or the group rolls real dice and types the result in, which is what the
 * author asked for and is also the only version that works when someone brought
 * dice along.
 */
export function renderEncounter(view, { onResolve, onRoll, onReveal, onClose } = {}) {
  const root = el("div", { class: "encounter" });
  root.append(el("h2", { class: "sheet-title", text: "Náhodné setkání" }));
  if (view.cardCode) root.append(el("span", { class: "card-code", text: view.cardCode }));
  root.append(el("div", { class: "card-text" },
    view.paragraphs.map((lines) => el("p", {}, withBreaks(lines)))));

  if (view.answer) {
    root.append(view.answerShown
      ? el("p", { class: "answer-shown" }, el("strong", { text: `Řešení: ${view.answer}` }))
      : el("button", { type: "button", class: "btn btn-small", onclick: () => onReveal?.() },
          view.revealLabel));
  }

  if (!view.resolution) {
    root.append(el("button", { type: "button", class: "btn btn-primary btn-wide", onclick: () => onClose?.() },
      "Vyhodnoceno"));
    return root;
  }

  if (view.note) root.append(el("p", { class: "muted", text: view.note }));

  if (view.dice) {
    const rolled = view.roll
      ? el("p", { class: "dice-result" },
          el("span", { class: "dice-faces", text: view.roll.faces }),
          el("span", { text: view.roll.summary }))
      : null;
    const manual = el("input", {
      type: "text",
      class: "dice-input",
      inputmode: "numeric",
      placeholder: view.dice.placeholder,
      "aria-label": "Co vám padlo",
    });
    root.append(el("div", { class: "dice" },
      el("p", { class: "dice-prompt", text: view.dice.text }),
      rolled,
      el("div", { class: "dice-actions" },
        el("button", { type: "button", class: "btn btn-small", onclick: () => onRoll?.(null) },
          "Hodit v aplikaci"),
        manual,
        el("button", {
          type: "button",
          class: "btn btn-small",
          onclick: () => onRoll?.(manual.value),
        }, "Hodili jsme sami"),
      )));
  }

  root.append(el("p", { class: "sheet-sub", text: view.prompt }));
  const actions = el("div", { class: "menu-actions" });
  for (const option of view.options) {
    actions.append(el("button", {
      type: "button",
      class: "btn btn-wide",
      onclick: () => onResolve?.(option.id),
    }, option.label));
  }
  root.append(actions);
  return root;
}

/* ---------------------------------------------------------------- status bar */

export function createStatusBar({ onUndo, onJournal, onInventory, onMenu } = {}) {
  const repIcon = el("span", { class: "rep-icon", "aria-hidden": "true" });
  const repValue = el("span", { class: "rep-value" });
  const rep = el("div", { class: "rep", role: "status" }, repIcon, repValue);

  const journalCount = el("span", { class: "tbtn-label" });
  const journalBtn = el("button", { type: "button", class: "tbtn", onclick: () => onJournal?.() },
    el("span", { "aria-hidden": "true", text: icon("svitek") }), journalCount);

  const bagCount = el("span", { class: "tbtn-label" });
  const bagBtn = el("button", { type: "button", class: "tbtn", onclick: () => onInventory?.() },
    el("span", { "aria-hidden": "true", text: icon("batoh") }), bagCount);

  const undoBtn = el("button", { type: "button", class: "tbtn", onclick: () => onUndo?.() },
    el("span", { "aria-hidden": "true", text: icon("zpet") }),
    el("span", { class: "tbtn-label", text: "Zpět" }));

  const menuBtn = el("button", { type: "button", class: "tbtn", "aria-label": "Nabídka", onclick: () => onMenu?.() },
    el("span", { "aria-hidden": "true", text: icon("menu") }));

  const element = el("header", { class: "topbar" },
    el("div", { class: "topbar-inner" }, menuBtn, rep, bagBtn, journalBtn, undoBtn));

  function update(status) {
    repIcon.textContent = status.reputationIcon;
    repValue.textContent = String(status.reputation);
    rep.setAttribute("aria-label", status.reputationLabel);
    rep.dataset.sign = status.reputation > 0 ? "pos" : status.reputation < 0 ? "neg" : "neu";

    journalCount.textContent = `${status.completedQuests}/${status.completedQuests + status.activeQuests}`;
    journalBtn.setAttribute("aria-label", `Deník úkolů — ${status.questSummary}`);

    bagCount.textContent = String(status.carrying ?? 0);
    bagBtn.setAttribute("aria-label", `Co neseme — ${status.carrying ?? 0} věcí`);

    undoBtn.disabled = !status.canUndo;
  }

  return { element, update };
}

/* -------------------------------------------------------------------- journal */

function questRow(quest, onAction) {
  return el("li", { class: `quest${quest.done ? " is-done" : ""}${quest.pending ? " is-pending" : ""}` },
    el("span", { class: "quest-icon", "aria-hidden": "true", text: quest.done ? icon("fajfka") : quest.glyph }),
    el("div", { class: "quest-body" },
      el("span", { class: "quest-text", text: quest.text }),
      quest.optional ? el("span", { class: "quest-tag", text: "nepovinný" }) : null,
      quest.pending ? el("span", { class: "quest-tag", text: "právě probíhá" }) : null,
    ),
    !quest.done && onAction
      ? el("button", {
          type: "button",
          class: `btn btn-small${quest.pending ? " btn-primary" : ""}`,
          onclick: () => onAction(quest),
        }, quest.action)
      : null,
  );
}

/**
 * @param {object} journal
 * @param {object} handlers
 * @param {(quest: object) => void} handlers.onAction  the row's button; the
 *   controller decides between confirming the arrival and ticking a quest off,
 *   because only the pending one may go through the engine's arrival.
 */
export function renderJournal(journal, { onAction } = {}) {
  const root = el("div", { class: "journal" });
  root.append(el("h2", { class: "sheet-title", text: "Deník úkolů" }));

  if (journal.empty) {
    root.append(el("p", { class: "muted", text: journal.emptyLabel }));
    return root;
  }
  if (journal.active.length) {
    root.append(el("h3", { class: "sheet-sub", text: `Aktivní (${journal.active.length})` }));
    const list = el("ul", { class: "quests" });
    for (const quest of journal.active) list.append(questRow(quest, onAction));
    root.append(list);
  }
  if (journal.done.length) {
    root.append(el("h3", { class: "sheet-sub", text: `Splněné (${journal.done.length})` }));
    const list = el("ul", { class: "quests" });
    for (const quest of journal.done) list.append(questRow(quest, null));
    root.append(list);
  }
  return root;
}

/* ------------------------------------------------------------------ inventory */

export function renderInventory(inventory, { onOpen } = {}) {
  const root = el("div", { class: "inventory" });
  root.append(el("h2", { class: "sheet-title", text: "Co neseme" }));

  if (inventory.empty) {
    root.append(el("p", { class: "muted", text: inventory.emptyLabel }));
    return root;
  }

  for (const group of inventory.groups) {
    root.append(el("h3", { class: "sheet-sub", text: `${group.title} (${group.items.length})` }));
    const list = el("ul", { class: "items" });
    for (const item of group.items) {
      list.append(el("li", { class: "item" },
        el("span", { class: "item-icon", "aria-hidden": "true", text: icon(item.glyph) }),
        el("div", { class: "item-body" },
          el("span", { class: "item-name", text: item.name }),
          item.count ? el("span", { class: "quest-tag", text: `${item.count}×` }) : null,
          item.text ? el("p", { class: "item-text", text: item.text }) : null,
          item.cardId && onOpen
            ? el("button", {
                type: "button",
                class: "btn btn-small",
                onclick: () => onOpen(item),
              }, item.openLabel)
            : null,
        )));
    }
    root.append(list);
  }
  return root;
}

/** One carried thing, opened from the bag: what it says and what it looks like. */
export function renderItemCard(view) {
  const root = el("div", { class: "item-card" });
  root.append(el("h2", { class: "sheet-title", text: view.title }));
  if (view.cardCode) root.append(el("span", { class: "card-code", text: view.cardCode }));
  if (view.image) root.append(renderImage(view.image));
  const block = el("div", { class: "card-text" });
  for (const lines of view.paragraphs) block.append(el("p", {}, withBreaks(lines)));
  root.append(block);
  return root;
}

/* --------------------------------------------------------------------- ending */

export function renderEnding(ending, { onRestart, onCatalogue, onUndo } = {}) {
  const stats = [
    ["Reputace", `${ending.reputationIcon} ${ending.reputation}`],
    ["Splněné úkoly", String(ending.completedQuests)],
    ["Nesplněné úkoly", String(ending.activeQuests)],
    ["Prošlé karty", String(ending.visitedCards)],
    ending.duration ? ["Doba hry", ending.duration] : null,
  ].filter(Boolean);

  return el("section", { class: "ending" },
    el("h2", { class: "ending-title", text: "Konec dobrodružství" }),
    el("dl", { class: "ending-stats" },
      stats.flatMap(([label, value]) => [
        el("dt", { text: label }),
        el("dd", { text: value }),
      ])),
    el("div", { class: "ending-actions" },
      onRestart ? el("button", { type: "button", class: "btn btn-primary", onclick: onRestart }, "Hrát znovu") : null,
      onCatalogue ? el("button", { type: "button", class: "btn", onclick: onCatalogue }, "Zpět na výběr scénáře") : null,
      onUndo ? el("button", { type: "button", class: "btn btn-quiet", onclick: onUndo }, `${icon("zpet")} Vrátit poslední rozhodnutí`) : null,
    ),
  );
}

/* --------------------------------------------------------------------- picker */

function factRow(entry) {
  const facts = [
    ["Místo", entry.location],
    ["Čas", entry.time],
    ["Trasa", entry.distance],
    ["Hráči", entry.players],
  ].filter(([, value]) => value);
  return el("dl", { class: "facts" },
    facts.flatMap(([label, value]) => [el("dt", { text: label }), el("dd", { text: value })]));
}

export function renderPicker(list, { onPlay, onContinue, onDelete, storageNote, base = "" } = {}) {
  const root = el("section", { class: "picker" });
  root.append(
    el("p", { class: "eyebrow", text: "RWAG" }),
    el("h1", { class: "picker-title", text: "Chodící dobrodružství" }),
    el("p", { class: "lede", text: "Vyberte scénář. Hraje se venku, v terénu, telefon vás povede kartu po kartě." }),
  );
  if (storageNote) root.append(el("p", { class: "warn-note", text: storageNote }));

  const grid = el("div", { class: "scenarios" });
  for (const entry of list) {
    const card = el("article", { class: `scenario${entry.playable ? "" : " is-locked"}` });
    if (entry.image) {
      const img = el("img", { class: "scenario-image", src: `${base}${entry.image}`, alt: "" });
      img.addEventListener("error", () => img.remove());
      card.append(img);
    }
    card.append(
      el("div", { class: "scenario-body" },
        el("div", { class: "scenario-head" },
          el("h2", { class: "scenario-name", text: entry.name }),
          el("span", { class: `badge ${entry.playable ? "badge-ok" : "badge-warn"}`, text: entry.statusLabel }),
        ),
        el("p", { class: "scenario-desc", text: entry.description }),
        factRow(entry),
        entry.save
          ? el("p", { class: "scenario-save", text: `Rozehráno — karta ${entry.save.scene ?? "?"}, reputace ${entry.save.reputation}` })
          : null,
        el("div", { class: "scenario-actions" },
          entry.playable && entry.save
            ? el("button", { type: "button", class: "btn btn-primary", onclick: () => onContinue?.(entry) }, "Pokračovat ve hře")
            : null,
          entry.playable
            ? el("button", {
                type: "button",
                class: entry.save ? "btn" : "btn btn-primary",
                onclick: () => onPlay?.(entry),
              }, entry.save ? "Začít znovu" : "Začít hru")
            : el("button", { type: "button", class: "btn", disabled: true }, "Zatím nehratelné"),
          entry.save
            ? el("button", { type: "button", class: "btn btn-quiet", onclick: () => onDelete?.(entry) }, "Smazat rozehranou hru")
            : null,
        ),
      ),
    );
    grid.append(card);
  }
  root.append(grid);
  return root;
}

/* ------------------------------------------------------------------ game setup */

/**
 * How many are playing, and who they are.
 *
 * The count is a row of buttons rather than a number field: it is the first thing
 * a group does, standing outside with one phone, and the bounds come from the
 * scenario and the number of roles so an impossible number cannot be entered at
 * all. Names are optional — the engine falls back to "Hráč 1".
 */
/**
 * The role picker on one player's row.
 *
 * A `<select>` rather than anything cleverer: this is filled in at a table
 * before setting off, often by one person reading eight paper cards out loud,
 * and the native control is the one that works on every phone with no fuss.
 * A role somebody else has already been given is shown but disabled, so the
 * list stays the same length and it is obvious why an option is unavailable.
 */
function rolePicker(setup, index, onRole) {
  const chosen = setup.roleIds?.[index] ?? "";
  const takenElsewhere = new Set(
    (setup.roleIds ?? []).filter((id, i) => id && i !== index),
  );

  const select = el("select", {
    class: "role-select",
    "aria-label": `Role hráče ${index + 1}`,
  });
  select.append(el("option", { value: "", text: setup.randomLabel ?? "Náhodně" }));
  for (const role of setup.roleOptions ?? []) {
    const option = el("option", { value: role.id, text: role.name });
    if (takenElsewhere.has(role.id)) option.disabled = true;
    select.append(option);
  }
  select.value = chosen;
  select.addEventListener("change", () => onRole?.(index, select.value || null));
  return select;
}

export function renderSetup(setup, { onCount, onName, onRole, onDeal, onCancel } = {}) {
  const root = el("section", { class: "setup" });
  root.append(
    el("p", { class: "eyebrow", text: setup.scenarioName ?? "Nová hra" }),
    el("h1", { class: "picker-title", text: "Kdo hraje?" }),
    el("p", { class: "lede", text: "Vyberte počet hráčů. Každý dostane jednu roli — role se v průběhu hry nemění." }),
  );

  const counts = [];
  for (let n = setup.min; n <= setup.max; n += 1) counts.push(n);
  root.append(el("div", { class: "menu-row" },
    el("span", { class: "menu-label", text: "Počet hráčů" }),
    el("div", { class: "seg seg-wide" },
      counts.map((n) => el("button", {
        type: "button",
        "aria-pressed": String(n === setup.count),
        onclick: () => onCount?.(n),
        text: String(n),
      })))));

  if (setup.limitNote) root.append(el("p", { class: "muted", text: setup.limitNote }));

  root.append(el("h3", { class: "sheet-sub", text: "Hráči a role" }));
  if (setup.roleHint) root.append(el("p", { class: "muted", text: setup.roleHint }));

  const names = el("div", { class: "name-fields" });
  for (let i = 0; i < setup.count; i += 1) {
    const input = el("input", {
      type: "text",
      class: "name-input",
      value: setup.names[i] ?? "",
      placeholder: `Hráč ${i + 1}`,
      "aria-label": `Jméno hráče ${i + 1}`,
      autocomplete: "off",
      maxlength: "24",
    });
    input.addEventListener("input", () => onName?.(i, input.value));
    names.append(el("div", { class: "player-row" },
      input,
      setup.roleOptions?.length ? rolePicker(setup, i, onRole) : null,
    ));
  }
  root.append(names);

  if (setup.error) root.append(el("p", { class: "warn-note", text: setup.error }));

  root.append(el("div", { class: "setup-actions" },
    el("button", { type: "button", class: "btn btn-primary btn-wide", onclick: () => onDeal?.() },
      "Rozdat role"),
    onCancel ? el("button", { type: "button", class: "btn btn-quiet", onclick: onCancel }, "Zpět na výběr scénáře") : null,
  ));
  return root;
}

/* ------------------------------------------------------------------ role cards */

function roleEntryRow(entry) {
  return el("li", { class: `role-line role-${entry.sort}` },
    el("span", { class: "role-sign", "aria-hidden": "true", text: entry.glyph }),
    el("div", { class: "role-line-body" },
      entry.triggerLabel ? el("span", { class: "role-trigger", text: entry.triggerLabel }) : null,
      el("span", { text: entry.text }),
      entry.conditionNote ? el("span", { class: "role-cond", text: entry.conditionNote }) : null,
    ));
}

export function renderRoleCard(card) {
  return el("article", { class: "role-card" },
    el("div", { class: "role-card-head" },
      el("span", { class: "role-player", text: card.playerName }),
      el("span", { class: "role-name", text: card.roleName }),
    ),
    card.description ? el("p", { class: "role-desc", text: card.description }) : null,
    card.character.length
      ? el("div", { class: "role-character" },
          card.character.map((lines) => el("p", {}, withBreaks(lines))))
      : null,
    card.entries.length ? el("ul", { class: "role-lines" }, card.entries.map(roleEntryRow)) : null,
    card.ownViewNote ? el("p", { class: "role-own-note", text: card.ownViewNote }) : null,
  );
}

/** The screen between dealing and playing: everyone reads their own role. */
export function renderRoleReveal(cards, { applied = [], onStart } = {}) {
  const root = el("section", { class: "reveal" });
  root.append(
    el("p", { class: "eyebrow", text: "Rozdané role" }),
    el("h1", { class: "picker-title", text: "Přečtěte si své role" }),
    el("p", { class: "lede", text: "Podejte telefon dokola. Podle rolí se hraje od chvíle, kdy je znají všichni." }),
  );
  root.append(el("div", { class: "role-cards" }, cards.map(renderRoleCard)));

  if (applied.length) {
    root.append(el("h3", { class: "sheet-sub", text: "Hned se uplatnilo" }));
    root.append(el("ul", { class: "role-lines" },
      applied.map((line) => el("li", { class: "role-line" },
        el("span", { class: "role-sign", "aria-hidden": "true", text: icon("plus") }),
        el("span", { text: line.text ?? "" })))));
  }

  root.append(el("div", { class: "setup-actions" },
    el("button", { type: "button", class: "btn btn-primary btn-wide", onclick: () => onStart?.() },
      "Začít hrát")));
  return root;
}

/* -------------------------------------------------------------------- abilities */

/**
 * Once-per-game abilities.
 *
 * Spending one cannot be taken back, so the button asks twice in place rather
 * than firing on the first tap — a mis-tap in a pocket must not burn the group's
 * only undo. The Pedant's price (an immediate encounter) is shown from the role
 * data before the confirmation, not after.
 */
export function renderAbilities(view, { onUse } = {}) {
  const root = el("div", { class: "abilities" });
  root.append(el("h2", { class: "sheet-title", text: "Schopnosti rolí" }));
  root.append(el("p", { class: "muted", text: view.note }));

  if (view.empty) {
    root.append(el("p", { class: "muted", text: view.emptyLabel }));
    return root;
  }

  const list = el("ul", { class: "ability-list" });
  for (const ability of view.list) {
    const item = el("li", { class: "ability" });
    const actions = el("div", { class: "ability-actions" });

    const use = el("button", { type: "button", class: "btn btn-small" }, "Použít");
    use.addEventListener("click", () => {
      actions.replaceChildren(
        el("span", { class: "ability-confirm", text: view.confirmPrompt }),
        el("button", {
          type: "button",
          class: "btn btn-small btn-primary",
          onclick: () => onUse?.(ability),
        }, "Ano, použít"),
        el("button", {
          type: "button",
          class: "btn btn-small btn-quiet",
          onclick: () => actions.replaceChildren(use),
        }, "Zpět"),
      );
    });
    actions.append(use);

    item.append(
      el("div", { class: "ability-head" },
        el("span", { class: "ability-icon", "aria-hidden": "true", text: ability.glyph }),
        el("span", { class: "ability-player", text: ability.playerName }),
        el("span", { class: "ability-role", text: ability.roleName }),
      ),
      el("p", { class: "ability-text", text: ability.text }),
      ...ability.consequences.map((text) =>
        el("p", { class: "ability-cost" },
          el("span", { "aria-hidden": "true", text: `${icon("hodiny")} ` }),
          text)),
      actions,
    );
    list.append(item);
  }
  root.append(list);
  return root;
}

/* ------------------------------------------------------------- group actions */

export function renderGroupActions(view, { onUse } = {}) {
  const root = el("div", { class: "abilities" });
  root.append(el("h2", { class: "sheet-title", text: "Co můžete udělat" }));
  root.append(el("p", { class: "muted", text: view.note }));

  if (view.empty) {
    root.append(el("p", { class: "muted", text: view.emptyLabel }));
    return root;
  }

  const list = el("ul", { class: "ability-list" });
  for (const action of view.list) {
    const item = el("li", { class: "ability", "data-locked": String(action.locked) });
    const actions = el("div", { class: "ability-actions" });

    if (action.locked) {
      actions.append(el("p", { class: "ability-cost" },
        el("span", { "aria-hidden": "true", text: `${icon("zamceno")} ` }),
        action.lockLabel ?? "Zamčeno"));
    } else {
      const use = el("button", { type: "button", class: "btn btn-small" }, "Použít");
      use.addEventListener("click", () => {
        actions.replaceChildren(
          el("span", { class: "ability-confirm", text: action.confirm ?? "Opravdu?" }),
          el("button", {
            type: "button",
            class: "btn btn-small btn-primary",
            onclick: () => onUse?.(action),
          }, "Ano"),
          el("button", {
            type: "button",
            class: "btn btn-small btn-quiet",
            onclick: () => actions.replaceChildren(use),
          }, "Zpět"),
        );
      });
      actions.append(use);
    }

    item.append(
      el("div", { class: "ability-head" },
        el("span", { class: "ability-icon", "aria-hidden": "true", text: action.glyph }),
        el("span", { class: "ability-player", text: action.title }),
      ),
      el("p", { class: "ability-text", text: action.text }),
      actions,
    );
    list.append(item);
  }
  root.append(list);
  return root;
}

/* ------------------------------------------------------------- standing rules */

/** The role a player has, swappable in place — P03 allows the trade. */
function roleSwitcher(player, onChangeRole) {
  const select = el("select", {
    class: "role-select",
    "aria-label": `Role hráče ${player.playerName}`,
  });
  for (const role of player.roleOptions ?? []) {
    const option = el("option", {
      value: role.id,
      text: role.taken ? `${role.name} — má ${role.takenBy}` : role.name,
    });
    if (role.taken) option.disabled = true;
    select.append(option);
  }
  select.value = player.roleId ?? "";
  select.addEventListener("change", () => onChangeRole?.(player, select.value));
  return select;
}

export function renderRoleRules(view, cards = [], { onChangeRole } = {}) {
  const root = el("div", { class: "role-rules" });
  root.append(el("h2", { class: "sheet-title", text: "Role a jejich pravidla" }));

  if (view.empty) {
    root.append(el("p", { class: "muted", text: view.emptyLabel }));
    return root;
  }

  const swappable = view.canChangeRole && onChangeRole;
  if (swappable) root.append(el("p", { class: "muted", text: view.changeRoleNote }));

  for (const player of view.players) {
    root.append(el("div", { class: "role-rule-block" },
      el("div", { class: "role-card-head" },
        el("span", { class: "role-player", text: player.playerName }),
        swappable
          ? roleSwitcher(player, onChangeRole)
          : el("span", { class: "role-name", text: player.roleName }),
      ),
      player.rules.length
        ? el("ul", { class: "role-lines" },
            player.rules.map((rule) => el("li", { class: `role-line role-${rule.sort}` },
              el("span", { class: "role-sign", "aria-hidden": "true", text: rule.glyph }),
              el("div", { class: "role-line-body" },
                el("span", { class: `role-enforce is-${rule.enforcement}`, text: rule.enforcementLabel }),
                el("span", { text: rule.text }),
              ))))
        : el("p", { class: "muted", text: player.noRulesLabel }),
    ));
  }
  root.append(el("p", { class: "muted", text: view.zonesNote }));

  if (cards.length) {
    root.append(el("h3", { class: "sheet-sub", text: "Celé karty rolí" }));
    root.append(el("div", { class: "role-cards" }, cards.map(renderRoleCard)));
  }
  return root;
}

/* --------------------------------------------------------------- field notes */

/**
 * The box a note is written in.
 *
 * The card, the time and the position sit above it as a fact, not as fields to
 * fill in — every second spent on a form is a second standing in a field with a
 * phone out. Save is disabled until something is actually typed, because an
 * empty note is worse than none: it looks like a record of something.
 */
export function renderNote(draft, { onSave, onCancel } = {}) {
  const root = el("div", { class: "note-compose" });
  root.append(
    el("h2", { class: "sheet-title", text: draft.title }),
    el("p", { class: "note-context", text: draft.contextLabel }),
  );

  const box = el("textarea", {
    class: "note-input",
    rows: "5",
    placeholder: draft.placeholder,
    "aria-label": draft.title,
  });
  root.append(box);
  root.append(el("p", { class: "muted", text: draft.hint }));

  const save = el("button", {
    type: "button",
    class: "btn btn-primary btn-wide",
    onclick: () => onSave?.(box.value),
  }, draft.saveLabel);
  save.disabled = true;
  box.addEventListener("input", () => { save.disabled = box.value.trim().length === 0; });

  root.append(el("div", { class: "menu-actions" },
    save,
    el("button", { type: "button", class: "btn btn-quiet", onclick: () => onCancel?.() },
      draft.cancelLabel),
  ));
  // the phone is out and the point is to type: focus without waiting to be asked
  queueMicrotask(() => box.focus());
  return root;
}

/** The notes so far, each with where it came from and a way to drop it. */
export function renderNotes(view, { onRemove } = {}) {
  const root = el("div", { class: "notes" });
  if (view.empty) {
    root.append(el("p", { class: "muted", text: view.emptyLabel }));
    return root;
  }

  const list = el("ul", { class: "note-list" });
  for (const note of view.list) {
    list.append(el("li", { class: "note" },
      el("div", { class: "note-head" },
        el("span", { class: "card-code", text: note.cardCode }),
        el("span", { class: "note-time", text: note.time }),
        note.place ? el("span", { class: "note-place", text: note.place }) : null,
      ),
      el("p", { class: "note-text" }, withBreaks(String(note.text).split("\n"))),
      onRemove
        ? el("div", { class: "override-actions" },
            el("button", {
              type: "button",
              class: "btn btn-small btn-quiet",
              onclick: () => onRemove(note),
            }, view.removeLabel))
        : null,
    ));
  }
  root.append(list);
  return root;
}

/* ------------------------------------------------------------- text overrides */

/**
 * The rewrites, and the only thing that makes them worth anything: getting them
 * out of this browser.
 *
 * Copying to the clipboard fails often enough on a phone — no permission, no
 * secure context, a browser that only allows it inside a user gesture it did not
 * recognise — that the JSON is always also on screen to select by hand, and
 * downloadable as a file.
 */
export function renderOverrides(view, {
  onRevert,
  onRevertAll,
  onCopy,
  onDownload,
  onKeepMine,
  onDiscardMine,
  onRemoveNote,
  notes = null,
  json = "",
  status = null,
} = {}) {
  const root = el("div", { class: "overrides" });
  const total = view.count + (notes?.count ?? 0);
  root.append(el("h2", { class: "sheet-title", text: `Poznámky a úpravy (${total})` }));

  // Notes come first: on a walk they are what gets written, and the rewrites
  // are the rarer, more deliberate thing.
  if (notes && !notes.empty) {
    root.append(el("h3", { class: "sheet-sub", text: `Poznámky (${notes.count})` }));
    root.append(renderNotes(notes, { onRemove: onRemoveNote }));
  }

  // One kind of thing being empty must not blank the sheet — the export lives
  // down here and has to stay reachable while only notes exist.
  if (view.empty && (!notes || notes.empty)) {
    root.append(el("p", { class: "muted", text: view.emptyLabel }));
    return root;
  }
  if (!view.empty) root.append(el("h3", { class: "sheet-sub", text: `Upravené texty (${view.count})` }));
  if (view.staleNote) root.append(el("p", { class: "warn-note", text: view.staleNote }));

  const list = el("ul", { class: "override-list" });
  for (const item of view.items) {
    const row = el("li", { class: `override${item.stale ? " is-stale" : ""}` });
    row.append(
      el("div", { class: "override-head" },
        el("span", { class: "card-code", text: item.cardCode }),
        el("span", { class: "override-field", text: item.label }),
        item.stale ? el("span", { class: "badge badge-warn", text: item.staleLabel }) : null,
      ),
      el("p", { class: "override-preview", text: item.preview }),
    );

    if (item.stale) {
      // Both versions, side by side, and the author decides — nothing is dropped
      // and nothing is silently overwritten.
      row.append(
        el("details", { class: "override-diff" },
          el("summary", { text: "Porovnat obě verze" }),
          el("p", { class: "override-label", text: "Váš text" }),
          el("p", { class: "override-text", text: item.preview }),
          el("p", { class: "override-label", text: "Text v datech teď" }),
          el("p", { class: "override-text", text: item.currentPreview }),
          el("p", { class: "override-label", text: "Text, ze kterého jste vycházeli" }),
          el("p", { class: "override-text", text: item.basePreview }),
        ),
        el("div", { class: "override-actions" },
          el("button", {
            type: "button",
            class: "btn btn-small btn-primary",
            onclick: () => onKeepMine?.(item),
          }, "Ponechat můj text"),
          el("button", {
            type: "button",
            class: "btn btn-small btn-quiet",
            onclick: () => onDiscardMine?.(item),
          }, "Zahodit můj text"),
        ),
      );
    } else {
      row.append(el("div", { class: "override-actions" },
        el("button", {
          type: "button",
          class: "btn btn-small btn-quiet",
          onclick: () => onRevert?.(item),
        }, "Vrátit původní")));
    }
    list.append(row);
  }
  if (!view.empty) root.append(list);

  const revertAll = el("button", { type: "button", class: "btn btn-small btn-quiet" }, view.revertAllLabel);
  const bulk = el("div", { class: "override-bulk" });
  revertAll.addEventListener("click", () => {
    bulk.replaceChildren(
      el("span", { class: "ability-confirm", text: view.revertAllPrompt }),
      el("button", { type: "button", class: "btn btn-small btn-primary", onclick: () => onRevertAll?.() }, "Ano, vrátit"),
      el("button", { type: "button", class: "btn btn-small btn-quiet", onclick: () => bulk.replaceChildren(revertAll) }, "Zpět"),
    );
  });
  bulk.append(revertAll);

  root.append(el("h3", { class: "sheet-sub", text: "Export" }));
  root.append(el("div", { class: "override-export" },
    el("button", { type: "button", class: "btn btn-small btn-primary", onclick: () => onCopy?.() },
      `${icon("kopirovat")} ${view.copyLabel}`),
    el("button", { type: "button", class: "btn btn-small", onclick: () => onDownload?.() },
      `${icon("disketa")} ${view.downloadLabel}`),
    // "revert all" only ever undid the text rewrites, so it stays out of sight
    // when there are none — it must not read as a way to bin the notes too
    view.empty ? null : bulk,
  ));
  if (status) root.append(el("p", { class: "muted", text: status }));

  const field = el("textarea", {
    class: "text-editor override-json",
    rows: "8",
    readonly: true,
    "aria-label": "JSON s úpravami",
    onclick: (event) => event.currentTarget.select(),
  });
  field.value = json;
  root.append(
    el("details", { class: "override-diff" },
      el("summary", { text: "Zobrazit JSON k ručnímu zkopírování" }),
      field),
  );
  return root;
}

/* ----------------------------------------------------------------------- menu */

export function renderMenu({
  theme,
  onTheme,
  geo,
  onGeoToggle,
  abilityCount = 0,
  hasRoles = false,
  onRules,
  onAbilities,
  onGroupActions,
  onRoles,
  editMode = null,
  onEditMode,
  onOverrides,
  noteCount = 0,
  storageAvailable,
  onTrail,
  onCatalogue,
  onDeleteSave,
  version,
} = {}) {
  const root = el("div", { class: "menu" });
  root.append(el("h2", { class: "sheet-title", text: "Nabídka" }));

  root.append(el("div", { class: "menu-row" },
    el("span", { class: "menu-label", text: "Vzhled" }),
    el("div", { class: "seg" },
      ["auto", "light", "dark"].map((mode) => el("button", {
        type: "button",
        "aria-pressed": String(theme === mode),
        onclick: () => onTheme?.(mode),
        text: { auto: "Podle systému", light: "Světlý", dark: "Tmavý" }[mode],
      })))));

  const geoLines = [];
  if (!geo?.supported) geoLines.push("Prohlížeč polohu neposkytuje.");
  else if (!geo.watching) geoLines.push("Poloha se nesleduje.");
  else if (geo.error) geoLines.push(`Chyba: ${geo.error}`);
  else if (geo.position) {
    geoLines.push(`${geo.position.lat.toFixed(5)}, ${geo.position.lon.toFixed(5)}${geo.accuracy ? ` (${geo.accuracy})` : ""}`);
  } else geoLines.push("Čeká se na první polohu…");

  root.append(el("div", { class: "menu-row" },
    el("span", { class: "menu-label", text: "Poloha" }),
    el("div", { class: "menu-value" },
      geo?.supported
        ? el("button", { type: "button", class: "btn btn-small", onclick: () => onGeoToggle?.() },
            geo.watching ? "Vypnout sledování" : "Zapnout sledování")
        : null,
      el("p", { class: "muted", text: geoLines.join(" ") }),
      el("p", { class: "muted", text: geo?.missingNote ?? "" }),
    )));

  root.append(el("h3", { class: "sheet-sub", text: "Role a pravidla" }));
  root.append(el("div", { class: "menu-actions" },
    onRules ? el("button", { type: "button", class: "btn", onclick: onRules },
      `${icon("svitek")} Pravidla`) : null,
    onAbilities
      ? el("button", { type: "button", class: "btn", onclick: onAbilities },
          `${icon("plus")} Schopnosti (${abilityCount})`)
      : null,
    onGroupActions
      ? el("button", { type: "button", class: "btn", onclick: onGroupActions },
          `${icon("bublina")} Co můžete udělat`)
      : null,
    onRoles ? el("button", { type: "button", class: "btn", onclick: onRoles }, `${icon("role")} Role a pravidla`) : null,
  ));
  if (!hasRoles) {
    root.append(el("p", { class: "muted", text: "Tato rozehraná hra nemá rozdané role — začala před tím, než hra role rozdávala." }));
  }

  // Notes and rewrites leave together, so the way out of the app is one button
  // and it does not hide behind the edit-mode switch — most of what gets
  // written on a walk is a note, and edit mode is off for that.
  if (onOverrides) {
    root.append(el("h3", { class: "sheet-sub", text: "Zápisky" }));
    root.append(el("div", { class: "menu-actions" },
      el("button", { type: "button", class: "btn", onclick: onOverrides },
        `${icon("psani")} Poznámky a úpravy (${noteCount + (editMode?.count ?? 0)})`)));
  }

  if (editMode) {
    root.append(el("h3", { class: "sheet-sub", text: "Texty" }));
    root.append(el("div", { class: "menu-row" },
      el("span", { class: "menu-label", text: editMode.label }),
      el("div", { class: "menu-value" },
        el("div", { class: "seg" },
          el("button", {
            type: "button",
            "aria-pressed": String(!editMode.enabled),
            disabled: !editMode.available,
            onclick: () => onEditMode?.(false),
          }, "Vypnuto"),
          el("button", {
            type: "button",
            "aria-pressed": String(editMode.enabled),
            disabled: !editMode.available,
            onclick: () => onEditMode?.(true),
          }, "Zapnuto")),
        el("p", { class: "muted", text: editMode.hint }),
        editMode.unavailableNote ? el("p", { class: "warn-note", text: editMode.unavailableNote }) : null,
      )));
  }

  root.append(el("h3", { class: "sheet-sub", text: "Hra" }));
  root.append(el("div", { class: "menu-actions" },
    onTrail
      ? el("button", { type: "button", class: "btn", onclick: onTrail },
          `${icon("disketa")} Stáhnout log průchodu`)
      : null,
    onCatalogue ? el("button", { type: "button", class: "btn", onclick: onCatalogue }, "Výběr scénáře") : null,
    onDeleteSave ? el("button", { type: "button", class: "btn btn-quiet", onclick: onDeleteSave }, "Smazat rozehranou hru") : null,
  ));
  root.append(el("p", { class: "muted", text: storageAvailable
    ? "Hra se ukládá po každém rozhodnutí do tohoto prohlížeče."
    : "Ukládání není dostupné (např. anonymní režim) — hrát lze, ale po zavření se hra neobnoví." }));
  if (version) root.append(el("p", { class: "muted", text: `Verze ${version}` }));
  return root;
}

/** The rules, read from the menu rather than walked through. */
export function renderRules(pages) {
  const root = el("div", { class: "rules" });
  root.append(el("h2", { class: "sheet-title", text: "Pravidla" }));
  if (!pages.length) {
    root.append(el("p", { class: "muted", text: "Tento scénář pravidla neuvádí." }));
    return root;
  }
  for (const page of pages) {
    root.append(el("section", { class: "rules-page" },
      el("h3", { class: "sheet-sub", text: page.title }),
      el("div", { class: "card-text" },
        page.paragraphs.map((lines) => el("p", {}, withBreaks(lines)))),
    ));
  }
  return root;
}

/* ------------------------------------------------------------------- messages */

/**
 * Toasts and role reminders.
 *
 * Reminders are things the software cannot enforce ("you may not use weapons"),
 * so they stay until dismissed; toasts are consequences already applied and fade
 * on their own.
 */
export function createMessages(container, { timeout = 7000 } = {}) {
  function push(messages) {
    for (const message of messages) {
      const item = el("div", { class: `msg msg-${message.kind}`, role: "status" },
        el("span", { class: "msg-icon", "aria-hidden": "true", text: message.glyph }),
        el("span", { class: "msg-text", text: message.text }),
        el("button", { type: "button", class: "msg-close", "aria-label": "Zavřít", onclick: () => item.remove() }, "×"),
      );
      container.append(item);
      if (message.kind === "toast") setTimeout(() => item.remove(), timeout);
    }
  }
  return { push, clear: () => clear(container) };
}
