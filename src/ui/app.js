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
import {
  applyOverrides,
  applyRecord,
  createOverrides,
  currentValue,
  exportOverrides,
  fromEditorText,
  makeRecord,
  matchShape,
} from "../platform/overrides.js";
import { clear, el, withBreaks } from "./dom.js";
import { cardText } from "./text.js";
import {
  abilitiesView,
  cardView,
  dealtRolesView,
  editModeView,
  endingView,
  encounterView,
  heldCardsView,
  inventoryView,
  journalView,
  privateCardView,
  trailText,
  messageViews,
  overridesView,
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
  renderEncounter,
  renderHeldCards,
  renderInventory,
  renderPrivateCard,
  renderJournal,
  renderMenu,
  renderOverrides,
  renderPicker,
  renderRoleReveal,
  renderRoleRules,
  renderSetup,
} from "./render.js";

const THEME_KEY = "rwag:theme";
const EDIT_MODE_KEY = "rwag:editmode";

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
  overrides = createOverrides(),
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
    onInventory: () => openInventory(),
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
  let editMode = readEditMode();
  /** rewrites for the loaded scenario, and the ones whose original has moved on */
  let records = [];
  let staleRecords = [];
  /** last thing the export sheet did, shown in it */
  let overrideStatus = null;
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

  function readEditMode() {
    try {
      return globalThis.localStorage?.getItem(EDIT_MODE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setEditMode(enabled) {
    editMode = Boolean(enabled) && overrides.available;
    try {
      globalThis.localStorage?.setItem(EDIT_MODE_KEY, editMode ? "1" : "0");
    } catch {
      /* the switch still works for this session */
    }
    drawGame();
    openMenu();
  }

  /* ---------------------------------------------------------------- catalogue */

  async function showCatalogue() {
    engine = null;
    game = null;
    setup.count = 0;
    setup.names.length = 0;
    setup.error = null;
    lastApplied = [];
    records = [];
    staleRecords = [];
    overrideStatus = null;
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

    // The engine must never know about rewrites, so they are applied to the data
    // between loading and constructing it. The pristine copy is kept because it is
    // what the repository says: rewrites are based against it, drift is measured
    // against it, and the export is checked against it.
    game.pristine = structuredClone(game.scenario);
    records = overrides.list(entry.id);
    const overrideResult = applyOverrides(game.scenario, records);
    staleRecords = overrideResult.stale;
    if (staleRecords.length) {
      messages.push([{
        kind: "reminder",
        glyph: "✏️",
        text: `U ${staleRecords.length} upravených textů se změnil původní text. Najdete je v nabídce pod „Upravené texty“.`,
      }]);
    }

    const saved = fresh ? null : storage.load(entry.id);
    engine = new Engine(game.scenario, {
      events: game.events,
      roles: game.roles,
      items: game.items,
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

  /** Whether the person holding a private card has tapped through to the text. */
  let privateRevealed = false;

  function drawGame() {
    if (!engine) return;

    // A card meant for one player takes over the screen: it is the only way to
    // keep it off the eyes of everyone else sitting round the same phone.
    const priv = privateCardView(engine);
    if (priv) {
      statusBar.update(statusView(engine));
      screen.replaceChildren(renderPrivateCard(priv, {
        revealed: privateRevealed,
        onReveal: () => {
          privateRevealed = true;
          drawGame();
        },
        onDone: () => {
          engine.acknowledgePrivate();
          privateRevealed = false;
          autosave();
          drawGame();
          drainMessages();
        },
      }));
      return;
    }

    const view = cardView(engine, {
      position: geo.position,
      imageBase: game.imageBase,
      records,
    });
    statusBar.update(statusView(engine));

    const card = renderCard(view, {
      onChoose: (index) => choose(index),
      onUndo: engine.canUndo ? () => undo() : null,
      onConfirmTask: () => confirmTask(),
      onCancelTask: () => cancelTask(),
      onReleaseHeld: (cardId) => {
        const released = engine.heldCards.find((h) => h.cardId === cardId);
        engine.releaseHeldCard(cardId);
        const note = released?.card?.held?.releaseNote;
        if (note) engine.state.toasts.push({ text: note });
        autosave();
        drawGame();
        drainMessages();
      },
      onResolveProgress: (outcome) => {
        engine.resolveProgress(outcome);
        autosave();
        drawGame();
        drainMessages();
      },
      // Edit mode adds buttons beside the texts and nothing else: the game stays
      // fully playable while it is on.
      edit: editMode
        ? {
            onSaveText: (value) => saveOverride({ field: "text", value: fromEditorText(value) }),
            onSaveChoice: (index, value) =>
              saveOverride({ field: "choice", index, value: String(value).trim() }),
            onRevertText: () => revertOverride({ cardId: engine.card.id, field: "text" }),
            onRevertChoice: (index) =>
              revertOverride({ cardId: engine.card.id, field: "choice", index }),
          }
        : null,
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

  function openInventory() {
    if (!engine) return;
    openSheet("inventory", renderInventory(inventoryView(engine)));
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
      editMode: editModeView({
        enabled: editMode,
        available: overrides.available,
        count: records.length,
      }),
      onEditMode: (enabled) => setEditMode(enabled),
      onOverrides: game ? () => openOverrides() : null,
      storageAvailable: storage.available,
      onTrail: engine ? () => downloadTrail() : null,
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

  /* ---------------------------------------------------------- text overrides */

  /**
   * Store a rewrite and show it at once.
   *
   * The base is always the text as the repository has it, never the author's own
   * previous rewrite of the same field — a second edit replaces the first, and it
   * still has to be judged against the data when the next build lands.
   */
  function saveOverride({ field, index = null, value }) {
    if (!engine || !game) return;
    const cardId = engine.card.id;
    const target = { cardId, field, index };
    const base = currentValue(game.pristine, target);

    const emptied = field === "text" ? value.length === 0 : value.length === 0;
    if (emptied) {
      // Blanking a card is far more likely a slip than an intention, and the
      // renderer would show an empty card with no way to tell why.
      messages.push([{ kind: "toast", glyph: "⚠️", text: "Text nesmí být prázdný." }]);
      return;
    }

    const stored = field === "text" ? matchShape(base, value) : value;
    const record = makeRecord({ cardId, field, index, value: stored, base });

    if (!overrides.set(game.entry.id, record)) {
      messages.push([{
        kind: "toast",
        glyph: "⚠️",
        text: `Úpravu nešlo uložit: ${overrides.lastError ?? "úložiště není dostupné"}`,
      }]);
      return;
    }
    records = overrides.list(game.entry.id);
    // applied against the live data, which the engine shares by reference, so the
    // rewrite is on screen on the next redraw without touching the game state
    applyRecord(game.scenario, record);
    drawGame();
  }

  /** Put the repository's text back for one field. */
  function revertOverride(target) {
    if (!game) return;
    overrides.remove(game.entry.id, target);
    records = overrides.list(game.entry.id);
    // restoring means copying the pristine text back over the live data
    revertLive(target);
    drawGame();
    if (sheet.open && sheetBody.dataset.kind === "overrides") openOverrides();
  }

  function overrideExport() {
    return exportOverrides({
      scenarioId: game?.entry?.id ?? null,
      records,
      scenario: game?.pristine ?? null,
      build: version,
    });
  }

  function openOverrides() {
    if (!game) return;
    const view = overridesView(records, {
      scenario: game.pristine,
      scenarioId: game.entry.id,
    });
    const json = JSON.stringify(overrideExport(), null, 2);

    openSheet("overrides", renderOverrides(view, {
      json,
      status: overrideStatus,
      onRevert: (item) => revertOverride(item.record),
      onRevertAll: () => {
        overrides.clear(game.entry.id);
        const dropped = records;
        records = [];
        for (const record of dropped) revertLive(record);
        overrideStatus = "Všechny přepisy byly vráceny.";
        drawGame();
        openOverrides();
      },
      onCopy: () => copyExport(json),
      onDownload: () => downloadExport(json),
      // the author decided their text still stands: rebase it onto the current
      // data so it applies again, instead of quietly losing the work
      onKeepMine: (item) => {
        const rebased = makeRecord({
          cardId: item.cardId,
          field: item.field,
          index: item.index,
          value: item.value,
          base: item.current,
        });
        overrides.set(game.entry.id, rebased);
        records = overrides.list(game.entry.id);
        applyRecord(game.scenario, rebased);
        overrideStatus = "Váš text se použil na nový originál.";
        drawGame();
        openOverrides();
      },
      onDiscardMine: (item) => {
        overrides.remove(game.entry.id, item.record);
        records = overrides.list(game.entry.id);
        revertLive(item.record);
        overrideStatus = "Přepis byl zahozen, platí text z dat.";
        drawGame();
        openOverrides();
      },
    }));
  }

  /** Copy the pristine text of one field back over the live data. */
  function revertLive(record) {
    const scene = game.scenario.scenes.find((s) => s.id === record.cardId);
    const pristineScene = game.pristine.scenes.find((s) => s.id === record.cardId);
    if (!scene || !pristineScene) return;
    if (record.field === "text") {
      scene.text = structuredClone(pristineScene.text);
      return;
    }
    const choice = scene.choices?.[record.index];
    const pristineChoice = pristineScene.choices?.[record.index];
    if (!choice || !pristineChoice) return;
    choice.text = pristineChoice.text;
    if (choice.quest && pristineChoice.quest?.text) choice.quest.text = pristineChoice.quest.text;
  }

  async function copyExport(json) {
    try {
      await navigator.clipboard.writeText(json);
      overrideStatus = "Zkopírováno do schránky.";
    } catch {
      // Clipboard access fails on plenty of phones; the JSON is on screen anyway.
      overrideStatus = "Schránka není dostupná — rozbalte JSON níž a označte ho ručně.";
    }
    openOverrides();
  }

  /**
   * The walk as a text file. Eight hours on foot produce more than anyone
   * remembers, so the field test needs the record, not the recollection.
   */
  function downloadTrail() {
    const text = trailText(engine, { scenarioName: game?.entry?.name ?? "", version });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = el("a", { href: url, download: `rwag-pruchod-${stamp}.txt` });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      engine.state.toasts.push({ text: "Log průchodu byl stažen." });
    } catch (err) {
      engine.state.toasts.push({ text: `Stažení logu selhalo: ${err.message}` });
    }
    sheet.close();
    drainMessages();
  }

  function downloadExport(json) {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = el("a", {
        href: url,
        download: `rwag-upravy-${game.entry.id}-${new Date().toISOString().slice(0, 10)}.json`,
      });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      overrideStatus = "Soubor byl stažen.";
    } catch (err) {
      overrideStatus = `Stažení selhalo: ${err.message}`;
    }
    openOverrides();
  }

  /** A card drawn from deck N interrupts the story, so it gets the sheet. */
  /** dice thrown for the encounter on screen, and whether its answer is shown */
  let encounterRoll = null;
  let encounterAnswerShown = false;

  function showEncounter(card, { keepState = false } = {}) {
    if (!card) return;
    if (!keepState) {
      encounterRoll = null;
      encounterAnswerShown = false;
    }
    const view = encounterView(card, {
      roll: encounterRoll,
      answerShown: encounterAnswerShown,
    });
    openSheet("encounter", renderEncounter(view, {
      onReveal: () => {
        encounterAnswerShown = true;
        showEncounter(card, { keepState: true });
      },
      onRoll: (typed) => {
        const spec = card.resolution?.dice ?? { count: 1, sides: 6 };
        const given = parseDice(typed, spec);
        encounterRoll = { values: engine.rollDice(spec, given) };
        showEncounter(card, { keepState: true });
      },
      onResolve: (optionId) => {
        engine.resolveEncounter(card.id, optionId);
        encounterRoll = null;
        encounterAnswerShown = false;
        autosave();
        sheet.close();
        drawGame();
        drainMessages();
      },
      onClose: () => sheet.close(),
    }));
  }

  /**
   * What the players typed after rolling their own dice: "4", "2 5 1", "2,5,1".
   * Anything that is not a run of numbers means "let the app roll".
   */
  function parseDice(typed, spec) {
    const numbers = String(typed ?? "").match(/\d+/g);
    if (!numbers) return null;
    return numbers.slice(0, spec.count ?? 1).map(Number);
  }

  return {
    async start() {
      await showCatalogue();
    },
    /** exposed for the browser check and for debugging in the field */
    get engine() {
      return engine;
    },
    /** redraw after poking the engine from the console */
    redraw() {
      drawGame();
      drainMessages();
    },
  };
}
