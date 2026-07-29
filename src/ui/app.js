/**
 * The application controller.
 *
 * Owns the screens (catalogue, player setup, dealt roles, game, ending), the
 * autosave and the sheets (journal, abilities, role rules, menu, drawn event
 * card). It is the only module that holds mutable app state; view.js decides what
 * is shown and render.js how.
 *
 * Three shapes here follow from the game being played on a walk:
 *  - the state is written after every single transition, because a phone dies or
 *    a browser tab is evicted mid-afternoon and the group must not lose the day;
 *  - the position is optional throughout. Nothing waits for a GPS fix;
 *  - nothing is saved until the roles are dealt, so a group that backs out of the
 *    setup screen is not offered a half-built game to continue.
 */

import { Engine } from "../core/engine.js";
import { createLoader } from "../platform/data.js";
import { createStorage } from "../platform/storage.js";
import { accuracyLabel, createGeo } from "../platform/geo.js";
import { clear, el, withBreaks } from "./dom.js";
import { cardText } from "./text.js";
import {
  abilitiesView,
  cardView,
  dealtRolesView,
  endingView,
  journalView,
  messageViews,
  playerBounds,
  roleRulesView,
  scenarioListView,
  statusView,
} from "./view.js";
import {
  createMessages,
  createStatusBar,
  renderAbilities,
  renderCard,
  renderEnding,
  renderJournal,
  renderMenu,
  renderPicker,
  renderRoleReveal,
  renderRoleRules,
  renderSetup,
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
  /** the setup form's state, kept while the group fiddles with it */
  const setup = { count: 0, names: [], error: null };
  /** what the roles applied the moment they were dealt, from the engine's event */
  let lastApplied = [];
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
    setup.count = 0;
    setup.names.length = 0;
    setup.error = null;
    lastApplied = [];
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
      if (event.type === "rolesDealt") lastApplied = event.applied ?? [];
      if (event.type === "unknownEffects") {
        console.warn(`karta ${event.scene}: neznámé efekty`, event.types);
      }
    });

    // A fresh game asks who is playing first: the roles are what make the
    // reputation economy and the abilities mean anything, and card P03 hands them
    // out before the group sets off. A restored game already has them — or, if it
    // was saved before roles existed, plays on without them.
    if (fresh && game.roles.length) {
      showSetup();
      return;
    }

    enterGame();
  }

  function enterGame() {
    statusBar.element.hidden = false;
    autosave();
    drainMessages();
    drawGame();
  }

  /* ------------------------------------------------------------- player setup */

  function showSetup() {
    statusBar.element.hidden = true;
    const bounds = playerBounds(game.scenario, game.roles);
    if (setup.count < bounds.min || setup.count > bounds.max) setup.count = bounds.min;
    setup.names.length = setup.count;

    screen.replaceChildren(renderSetup({
      ...bounds,
      count: setup.count,
      names: setup.names,
      error: setup.error,
      scenarioName: game.entry?.name ?? game.scenario?.scenarioName ?? null,
    }, {
      onCount: (n) => {
        setup.count = n;
        setup.error = null;
        showSetup();
      },
      onName: (index, value) => {
        // no redraw: retyping the field would lose the caret
        setup.names[index] = value;
      },
      onDeal: () => dealRoles(),
      onCancel: () => showCatalogue(),
    }));
    window.scrollTo(0, 0);
  }

  function dealRoles() {
    const names = setup.names.slice(0, setup.count).map((n) => (n ?? "").trim());
    try {
      engine.dealRoles(setup.count, { names });
    } catch (err) {
      // More players than roles is the one case the engine refuses; the picker
      // should not have allowed it, so show what it said rather than swallow it.
      setup.error = err.message;
      showSetup();
      return;
    }
    setup.error = null;
    showRoles();
  }

  function showRoles() {
    statusBar.element.hidden = true;
    screen.replaceChildren(renderRoleReveal(dealtRolesView(engine, game.roles), {
      applied: lastApplied,
      onStart: () => enterGame(),
    }));
    window.scrollTo(0, 0);
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
      hasRoles: (engine?.players?.length ?? 0) > 0,
      abilityCount: engine?.players?.length ? engine.abilities.length : 0,
      onAbilities: engine ? () => openAbilities() : null,
      onRoles: engine ? () => openRoleRules() : null,
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

  /**
   * The once-per-game abilities.
   *
   * An ability changes the card underneath (the Pedant's undo moves the group, the
   * Milovník přírody's closes a task), so the sheet is redrawn *and* the card
   * behind it: leaving a stale card under an open sheet is how a group ends up
   * acting on a screen that no longer matches the game.
   */
  function openAbilities() {
    if (!engine) return;
    openSheet("abilities", renderAbilities(abilitiesView(engine, game?.roles ?? []), {
      onUse: (ability) => {
        const kindBefore = sheetBody.dataset.kind;
        try {
          engine.useAbility(ability.playerId, ability.type);
        } catch (err) {
          messages.push([{ kind: "toast", text: err.message, glyph: "⚠️" }]);
          return;
        }
        autosave();
        drainMessages();
        messages.push([{
          kind: "toast",
          glyph: ability.glyph,
          text: `Schopnost použita: ${ability.playerName} (${ability.roleName}).`,
        }]);
        drawGame();
        // The Pedant's ability pays with an immediate encounter, and that card
        // takes over the sheet while useAbility runs. Closing here would hide it,
        // so the sheet is only dismissed if it is still the ability list — and
        // dismissed it must be, because every ability changes the card behind it.
        if (sheetBody.dataset.kind === kindBefore) sheet.close();
      },
    }));
  }

  /** What each role obliges its player to do, all game. */
  function openRoleRules() {
    if (!engine) return;
    openSheet("roles", renderRoleRules(
      roleRulesView(engine),
      dealtRolesView(engine, game?.roles ?? []),
    ));
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
