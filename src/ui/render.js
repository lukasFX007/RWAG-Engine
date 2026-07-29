/**
 * DOM rendering.
 *
 * Every function here takes a view model from view.js plus callbacks, and gives
 * back detached elements. It asks the engine nothing, so the layout can be
 * rearranged without touching game logic — and the controller in app.js stays
 * the only place that knows about state.
 */

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

function renderChoice(choice, onChoose) {
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
  return el("li", { class: "choice-item" }, button);
}

export function renderChoices(choices, onChoose, { blocked = false } = {}) {
  const list = el("ul", { class: `choices${blocked ? " is-blocked" : ""}` });
  for (const choice of choices) list.append(renderChoice(choice, onChoose));
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

export function renderCard(view, { onChoose, onUndo, onConfirmTask, onCancelTask } = {}) {
  const root = el("article", { class: "card", "aria-live": "polite" });

  root.append(el("div", { class: "card-head" },
    view.cardCode ? el("span", { class: "card-code", text: view.cardCode }) : null,
    view.ending ? el("span", { class: "badge badge-end", text: "závěr" }) : null,
    view.deadEnd ? el("span", { class: "badge badge-warn", text: "bez pokračování" }) : null,
    view.taskInProgress ? el("span", { class: "badge badge-task", text: "úkol" }) : null,
  ));

  if (view.image) root.append(renderImage(view.image));

  const text = el("div", { class: "card-text" });
  for (const lines of view.paragraphs) text.append(el("p", {}, withBreaks(lines)));
  root.append(text);

  if (view.deadEnd) {
    root.append(el("div", { class: "notice" },
      el("p", { text: "Tato karta nemá ve scénáři pokračování — obsah zatím chybí." }),
      view.note ? el("p", { class: "notice-note", text: view.note }) : null,
      onUndo ? el("button", { type: "button", class: "btn btn-quiet", onclick: onUndo },
        `${icon("zpet")} Vrátit poslední rozhodnutí`) : null,
    ));
  }

  if (view.task) {
    root.append(renderTaskPanel(view.task, { onConfirm: onConfirmTask, onCancel: onCancelTask }));
  }
  // The choice a task came from is the panel above, so it is not listed twice.
  const shown = view.choices.filter((choice) => !choice.inProgress);
  if (shown.length) {
    root.append(renderChoices(shown, onChoose, { blocked: view.taskInProgress }));
  }
  return root;
}

/* ---------------------------------------------------------------- status bar */

export function createStatusBar({ onUndo, onJournal, onMenu } = {}) {
  const repIcon = el("span", { class: "rep-icon", "aria-hidden": "true" });
  const repValue = el("span", { class: "rep-value" });
  const rep = el("div", { class: "rep", role: "status" }, repIcon, repValue);

  const journalCount = el("span", { class: "tbtn-label" });
  const journalBtn = el("button", { type: "button", class: "tbtn", onclick: () => onJournal?.() },
    el("span", { "aria-hidden": "true", text: icon("svitek") }), journalCount);

  const undoBtn = el("button", { type: "button", class: "tbtn", onclick: () => onUndo?.() },
    el("span", { "aria-hidden": "true", text: icon("zpet") }),
    el("span", { class: "tbtn-label", text: "Zpět" }));

  const menuBtn = el("button", { type: "button", class: "tbtn", "aria-label": "Nabídka", onclick: () => onMenu?.() },
    el("span", { "aria-hidden": "true", text: icon("menu") }));

  const element = el("header", { class: "topbar" },
    el("div", { class: "topbar-inner" }, menuBtn, rep, journalBtn, undoBtn));

  function update(status) {
    repIcon.textContent = status.reputationIcon;
    repValue.textContent = String(status.reputation);
    rep.setAttribute("aria-label", status.reputationLabel);
    rep.dataset.sign = status.reputation > 0 ? "pos" : status.reputation < 0 ? "neg" : "neu";

    journalCount.textContent = `${status.completedQuests}/${status.completedQuests + status.activeQuests}`;
    journalBtn.setAttribute("aria-label", `Deník úkolů — ${status.questSummary}`);

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

/* ----------------------------------------------------------------------- menu */

function roleRow(role) {
  const lines = [
    ...(role.advantages ?? []).map((a) => ({ sign: icon("plus"), text: a.text })),
    ...(role.disadvantages ?? []).map((d) => ({ sign: icon("minus"), text: d.text })),
  ].filter((l) => l.text);

  return el("details", { class: "role" },
    el("summary", {},
      el("span", { "aria-hidden": "true", text: `${icon("role")} ` }),
      el("b", { text: role.name ?? role.id }),
      role.description ? el("span", { class: "role-desc", text: `— ${role.description}` }) : null),
    el("ul", { class: "role-lines" },
      lines.map((line) => el("li", {},
        el("span", { class: "role-sign", "aria-hidden": "true", text: line.sign }),
        line.text))),
  );
}

export function renderMenu({
  theme,
  onTheme,
  geo,
  onGeoToggle,
  roles = [],
  storageAvailable,
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

  if (roles.length) {
    root.append(el("h3", { class: "sheet-sub", text: "Role ve hře" }));
    root.append(el("div", { class: "roles" }, roles.map(roleRow)));
  }

  root.append(el("h3", { class: "sheet-sub", text: "Hra" }));
  root.append(el("div", { class: "menu-actions" },
    onCatalogue ? el("button", { type: "button", class: "btn", onclick: onCatalogue }, "Výběr scénáře") : null,
    onDeleteSave ? el("button", { type: "button", class: "btn btn-quiet", onclick: onDeleteSave }, "Smazat rozehranou hru") : null,
  ));
  root.append(el("p", { class: "muted", text: storageAvailable
    ? "Hra se ukládá po každém rozhodnutí do tohoto prohlížeče."
    : "Ukládání není dostupné (např. anonymní režim) — hrát lze, ale po zavření se hra neobnoví." }));
  if (version) root.append(el("p", { class: "muted", text: `Verze ${version}` }));
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
