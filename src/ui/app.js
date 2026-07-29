/**
 * The application controller.
 *
 * Owns the three screens (scenario catalogue, game, ending), the autosave and the
 * sheets (journal, menu, drawn event card). It is the only module that holds
 * mutable app state; view.js decides what is shown and render.js how.
 *
 * Two shapes here follow from the game being played on a walk:
 *  - the state is written after every single transition, because a phone dies or
 *    a browser tab is evicted mid-afternoon and the group must not lose the day;
 *  - the position is optional throughout. Nothing waits for a GPS fix.
 */

import { Engine } from "../core/engine.js";
import { createLoader } from "../platform/data.js";
import { createStorage } from "../platform/storage.js";
import { accuracyLabel, createGeo } from "../platform/geo.js";
import { clear, el, withBreaks } from "./dom.js";
import { cardText } from "./text.js";
import {
  cardView,
  endingView,
  journalView,
  messageViews,
  scenarioListView,
  statusView,
} from "./view.js";
import {
  createMessages,
  createStatusBar,
  renderCard,
  renderEnding,
  renderJournal,
  renderMenu,
  renderPicker,
} from "./render.js";

const THEME_KEY = "rwag:theme";

/** Does any choice on this card depend on where the players are standing? */
function usesPosition(card) {
  return (card?.choices ?? []).some((choice) =>
    (choice.disableIf ?? []).some((cond) => cond.type === "gps_zone"),
  );
}

export function createApp({
  root,
  base = "",
  version = "",
  storage = createStorage(),
  loader = createLoader({ base }),
  geo = createGeo(),
} = {}) {
  /* ---------------------------------------------------------------- skeleton */

  const screen = el("main", { class: "screen" });
  const messageBox = el("div", { class: "messages", "aria-live": "polite" });
  const sheetBody = el("div", { class: "sheet-body" });
  const sheet = el("dialog", { class: "sheet" },
    el("div", { class: "sheet-inner" },
      el("button", {
        type: "button",
        class: "sheet-close",
        "aria-label": "Zavřít",
        onclick: () => sheet.close(),
      }, "×"),
      sheetBody));
  // clicking the backdrop closes: the sheet is a full-bleed target, its inner box is not
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) sheet.close();
  });

  const messages = createMessages(messageBox);
  const statusBar = createStatusBar({
    onUndo: () => undo(),
    onJournal: () => openJournal(),
    onMenu: () => openMenu(),
  });
  statusBar.element.hidden = true;

  root.replaceChildren(statusBar.element, screen, messageBox, sheet);

  /* -------------------------------------------------------------------- state */

  let catalogue = [];
  let game = null; // { entry, scenario, events, roles, imageBase }
  let engine = null;
  let theme = readTheme();
  applyTheme(theme);

  geo.on(() => {
    if (engine && usesPosition(engine.card)) drawGame();
    if (sheet.open && sheetBody.dataset.kind === "menu") openMenu();
  });

  /* -------------------------------------------------------------------- theme */

  function readTheme() {
    try {
      return globalThis.localStorage?.getItem(THEME_KEY) ?? "auto";
    } catch {
      return "auto";
    }
  }

  function applyTheme(mode) {
    theme = mode;
    const el_ = document.documentElement;
    if (mode === "auto") el_.removeAttribute("data-theme");
    else el_.setAttribute("data-theme", mode);
    try {
      globalThis.localStorage?.setItem(THEME_KEY, mode);
    } catch {
      /* a browser that cannot store the preference still honours it this session */
    }
  }

  /* ---------------------------------------------------------------- catalogue */

  async function showCatalogue() {
    engine = null;
    game = null;
    statusBar.element.hidden = true;
    messages.clear();

    if (!catalogue.length) {
      screen.replaceChildren(el("p", { class: "muted", text: "Načítám scénáře…" }));
      try {
        catalogue = await loader.loadCatalogue();
      } catch (err) {
        screen.replaceChildren(el("p", { class: "warn-note", text: `Scénáře se nepodařilo načíst: ${err.message}` }));
        return;
      }
    }

    const list = scenarioListView(catalogue, { saves: storage.list() });
    screen.replaceChildren(renderPicker(list, {
      base,
      storageNote: storage.available
        ? null
        : "Ukládání do prohlížeče není dostupné. Hru lze hrát, ale po zavření se neobnoví.",
      onPlay: (entry) => start(entry, { fresh: true }),
      onContinue: (entry) => start(entry, { fresh: false }),
      onDelete: (entry) => {
        storage.clear(entry.id);
        showCatalogue();
      },
    }));
    window.scrollTo(0, 0);
  }

  /* --------------------------------------------------------------------- game */

  async function start(entry, { fresh }) {
    screen.replaceChildren(el("p", { class: "muted", text: "Načítám dobrodružství…" }));
    try {
      game = await loader.loadGame(entry);
    } catch (err) {
      screen.replaceChildren(el("p", { class: "warn-note", text: `Scénář se nepodařilo načíst: ${err.message}` }));
      return;
    }

    const saved = fresh ? null : storage.load(entry.id);
    engine = new Engine(game.scenario, {
      events: game.events,
      roles: game.roles,
      state: saved?.state ?? null,
      // A fresh seed per game so the event deck is not shuffled the same way
      // twice; it is stored in the state, so a restored game keeps dealing the
      // sequence it would have dealt.
      seed: saved ? undefined : Date.now() % 2_147_483_647,
    });

    engine.on((event) => {
      if (event.type === "encounter") showEncounter(event.card);
      if (event.type === "unknownEffects") {
        console.warn(`karta ${event.scene}: neznámé efekty`, event.types);
      }
    });

    statusBar.element.hidden = false;
    autosave();
    drainMessages();
    drawGame();
  }

  function autosave() {
    if (!engine || !game) return;
    storage.save(game.entry.id, engine.state);
  }

  function drainMessages() {
    if (!engine) return;
    messages.push(messageViews({
      toasts: engine.takeToasts(),
      reminders: engine.takeReminders(),
    }));
  }

  function drawGame() {
    if (!engine) return;
    const view = cardView(engine, {
      position: geo.position,
      imageBase: game.imageBase,
    });
    statusBar.update(statusView(engine));

    const card = renderCard(view, {
      onChoose: (index) => choose(index),
      onUndo: engine.canUndo ? () => undo() : null,
      onConfirmTask: () => confirmTask(),
      onCancelTask: () => cancelTask(),
    });

    if (engine.finished) {
      screen.replaceChildren(card, renderEnding(endingView(engine), {
        onRestart: () => start(game.entry, { fresh: true }),
        onCatalogue: () => showCatalogue(),
        onUndo: engine.canUndo ? () => undo() : null,
      }));
    } else {
      screen.replaceChildren(card);
    }
    // Every card is read from its first line, so the view returns to the top.
    window.scrollTo(0, 0);
  }

  function choose(index) {
    if (!engine) return;
    try {
      engine.choose(index, { position: geo.position });
    } catch (err) {
      // The engine refuses locked choices; a UI that offered one is the bug, so
      // say so rather than failing silently.
      messages.push([{ kind: "toast", text: err.message, glyph: "⚠️" }]);
      return;
    }
    autosave();
    drainMessages();
    drawGame();
  }

  function undo() {
    if (!engine?.canUndo) return;
    engine.undo();
    autosave();
    drainMessages();
    drawGame();
  }

  /**
   * The players say they did the task, so the card behind it is revealed now.
   * The position is passed through if there is one: the engine records whether
   * the arrival was confirmed by hand or by GPS.
   */
  function confirmTask() {
    if (!engine?.pendingTask) return;
    try {
      engine.confirmArrival({ position: geo.position });
    } catch (err) {
      messages.push([{ kind: "toast", text: err.message, glyph: "⚠️" }]);
      return;
    }
    autosave();
    drainMessages();
    drawGame();
  }

  /** Turned back: the task is dropped and the group stays on the same card. */
  function cancelTask() {
    if (!engine?.cancelTask()) return;
    autosave();
    drainMessages();
    drawGame();
  }

  /* ------------------------------------------------------------------- sheets */

  function openSheet(kind, content) {
    sheetBody.dataset.kind = kind;
    clear(sheetBody).append(content);
    if (!sheet.open) sheet.showModal();
  }

  function openJournal() {
    if (!engine) return;
    openSheet("journal", renderJournal(journalView(engine), {
      onAction: (quest) => {
        if (quest.pending) {
          // The task in progress has to go through the engine's arrival.
          // completeQuest would tick the quest off and leave the group on a card
          // where every choice reports "probíhá úkol" — a dead end with a full
          // journal. Closing the sheet also matters: the new card is behind it.
          sheet.close();
          confirmTask();
          return;
        }
        engine.completeQuest(quest.id);
        autosave();
        drainMessages();
        statusBar.update(statusView(engine));
        openJournal();
      },
    }));
  }

  function openMenu() {
    openSheet("menu", renderMenu({
      theme,
      onTheme: (mode) => {
        applyTheme(mode);
        openMenu();
      },
      geo: {
        supported: geo.supported,
        watching: geo.watching,
        error: geo.error,
        position: geo.position,
        accuracy: accuracyLabel(geo.position),
        missingNote: geo.missingNote,
      },
      onGeoToggle: () => {
        if (geo.watching) geo.stop();
        else geo.start();
        openMenu();
      },
      roles: game?.roles ?? [],
      storageAvailable: storage.available,
      onCatalogue: () => {
        sheet.close();
        showCatalogue();
      },
      onDeleteSave: game
        ? () => {
            storage.clear(game.entry.id);
            sheet.close();
            showCatalogue();
          }
        : null,
      version,
    }));
  }

  /** A card drawn from deck N interrupts the story, so it gets the sheet. */
  function showEncounter(card) {
    if (!card) return;
    const body = el("div", { class: "encounter" },
      el("h2", { class: "sheet-title", text: "Náhodné setkání" }),
      card.cardCode ? el("span", { class: "card-code", text: card.cardCode }) : null,
      el("div", { class: "card-text" },
        cardText(card.text).map((lines) => el("p", {}, withBreaks(lines)))),
      el("button", { type: "button", class: "btn btn-primary", onclick: () => sheet.close() }, "Vyhodnoceno"),
    );
    openSheet("encounter", body);
  }

  return {
    async start() {
      await showCatalogue();
    },
    /** exposed for the browser check and for debugging in the field */
    get engine() {
      return engine;
    },
  };
}
