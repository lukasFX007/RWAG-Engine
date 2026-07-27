# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RWAG Engine — "Universal engine for real world adventure interactive games". A zero-dependency static web app (plain HTML/CSS/ES5-style JS, no bundler, no package.json, no tests) that plays branching text adventures meant to be run outdoors by a group of players. All user-facing text is **Czech**; keep it that way when adding strings.

Deployed via GitHub Pages from `main` at the repo root (upstream: https://vodomil87.github.io/RWAG-Engine/).

## Running locally

The app loads all content with `fetch()`, so `file://` will **not** work — it must be served over HTTP:

```
python -m http.server 8000     # then open http://localhost:8000
```

There is no build, lint, or test step. Changes are verified by reloading the page and watching the console (the code logs progress liberally: `PAGE READY`, `LAUNCHER INIT`, `LOAD GAME ID`, `BASE PATH`, `ROLES LOADED`, `PAGE =`).

## Architecture

### Global-object modules, load order matters

There is no module system. Each file defines a top-level `const` and (mostly) assigns it to `window`. `index.html` hard-codes the load order and the comments there are load-order constraints, not decoration:

`icons.js → settings.js → conditions.js → status.js → effects.js → roles.js → menu.js → ui.js → engine.js → save.js → launcher.js`

Boot happens in an inline `window.onload` in `index.html`: `Settings.load(); Launcher.init();`. A new engine file must be added to `index.html` in a position where its dependencies already exist.

### Runtime flow

1. `Launcher.init()` fetches `games/scenarios.json` (the catalogue) and renders one card per scenario.
2. Clicking a card hides `#launcher`, shows `#game`, and calls `Engine.start(id)`.
3. `Engine.loadGame()` fetches the scenario's `file`, derives `Engine.basePath` from it (the scenario folder), then loads `roles.json` and `legend.json` **relative to `basePath`**.
4. `Engine.gotoScene(id)` looks the scene up in `game.scenes`, applies `scene.effects` **once** (guarded by `state.visited`, which lives in the state so it survives a save), pushes the previous scene onto `state.history`, hands off to `UI.renderScene`, and autosaves.
5. `UI` rebuilds `#game` from scratch on every scene; each choice button calls `Engine.gotoScene(c.goto)`.
6. `Menu` owns the whole slide-out panel (`#menuPanel`) as a small page router (`Menu.page`: `main` / `settings` / `about` / `roles` / `legend` / `confirm`) — it is by far the largest file and holds all player/role management UI.

`Engine.exitScenario()` tears the game down and returns to the launcher; `Status.render()` redraws the top bar and, importantly, also re-binds the menu button (it re-creates `#menuButton`'s HTML, hence the `Menu.init()` calls sprinkled after every render).

### Content is data, not code

Adding a game means adding JSON, not JS. A game lives in `games/<id>/`:

- `games/scenarios.json` — catalogue entry: `id`, `file`, `image`, `description`, `location`, `time`, `distance`, `players`, `status`, `author`, `version`. `status` must be one of `available` / `preparing` / `beta` (mapped to icon + Czech label by `ScenarioStatus` in `status.js`); anything else falls through as raw text.
- `games/<id>/scenario.json` — `gameId`, `scenarioName`, `startScene`, `roleSet`, `legend`, plus `scenes[]`. A scene is `{ id, text (string or array of paragraphs joined with <br><br>), image?, effects?[], choices[] }`; a choice is `{ icon, text, goto }`.
- `games/<id>/roles.json` — `{ roleSet, roles: [{ id, name, description, icon, character[], advantages[], disadvantages[] }] }`. Advantage/disadvantage `effects.type` values (`ignore_choice_condition`, `roleplay_twice_answer`, …) are currently descriptive only — nothing in the engine reads them.
- `games/<id>/legend.json` — array whose first element is `{title}` and the rest are `{subtitle, items:[{icon, text}]}`; rendered by `Menu.renderLegend()`.

Icon names in JSON are keys into the `icons` map in `engine/icons.js` (emoji strings). An unknown key renders as empty/`undefined` — add the icon there first.

### Player/role model

`Engine.state` = `{ reputation, inventory, roles, players, pendingPlayers, flags }`. Players are entered in the menu into `pendingPlayers`, then `Menu.assignRoles()` / `Engine.assignRandomRole()` moves them into `players` with a randomly drawn, non-repeating role. Note there are three overlapping role-loading paths (`Engine.roles`, `Engine.game.roles`, `Engine.state.roles`) populated by `loadGame()` and `loadRoles()`; `assignRandomRole` reads `Engine.roles.roles` while `Engine.addPlayer` consumes `state.roles`. Pick the one already used by the code you are touching rather than "fixing" it in passing.

### Settings / theming

`Settings` persists to `localStorage` under the `rwag_` prefix (`theme`, `font`, `font_size`, `sound`, `vibration`). Themes and fonts are applied as `body` classes — `theme-dark|light|medieval`, `font-default|medieval|typewriter` — and all colours come from CSS custom properties declared in `:root` and overridden per theme in `css/engine.css`. Font size is the `--game-font-size` variable on `documentElement`; several sizes (buttons, radii) are `calc()`-derived from it, so changing it rescales the UI. Adding a theme/font means: a `body.<class>` block in the CSS, the class name in the removal lists in `Settings.setTheme`/`setFont`/`load`, and a preview button in `Menu.renderSettings()`.

## Mechanics vocabulary

The JSON already uses a richer vocabulary than the engine originally implemented; treat `games/*/roles.json` as the de-facto spec. Currently wired up:

- **Conditions** (`Conditions.evaluate`) — `reputation`, `players`, `item`, `flag`, `role`, `visited`, `quest`, plus `and` / `or` / `not`. Numeric types take `operator` (`<`, `<=`, `>`, `>=`, `==`, `!=`) and `value`. **An unknown condition type logs a warning and returns `true`** — deliberately, so half-finished content stays playable. `gps_zone` (used by Nenasyta and Lenoch) currently falls into this bucket.
- **Choice gating** — `disableIf` locks when **any** listed condition holds; `enableIf` unlocks only when **all** hold. Locked choices render disabled with 🔒 and a Czech description of what is missing (`Conditions.describeChoiceRequirement` inverts the operator for `disableIf`, since the data says when to lock but the player needs to read what to reach).
- **Effects** (`Effects.applyOne`) — `reputation`, `toast`, `item`, `flag`, `quest`, `encounter`, `return_on_choice`, the `ignore_*` modifiers, and `nature_quest_done`. Any type prefixed `roleplay_` is an instruction for the human player and is intentionally a no-op. An effect may carry its own `condition`.
- **Role abilities** — `usage: {type:"once"}` gets a "Použít" button in the roles menu, tracked in `state.usedAbilities` keyed `playerIndex:kind:index`. The `ignore_*` types increment counters in `state.modifiers`, consumed where they apply (e.g. `ignore_reputation_loss` swallows the next negative reputation effect).
- **Save** — autosaves into `localStorage` after every scene under `rwag_save_<gameId>`; the launcher card grows a "Pokračovat" button when a save exists.

## Known gaps (don't assume they work)

- `engine/gps.js` is a **stub** — a bare list of function names. It is syntactically valid JS but would throw if loaded, so it is deliberately not referenced from `index.html`. GPS zones therefore do not exist: any `gps_zone` condition passes unconditionally.
- `scenario.json` references `"events": "events.json"`, which does not exist and is never fetched. The `encounter` effect only shows a toast telling the group to draw a physical event card.
- Menu items rendered with the `zabrana` (🚧) icon — Úkoly, Inventář, Statistiky — are placeholders with no handler, even though `state.quests` and `state.inventory` are populated by effects.
- `games/nebakov/scenario.json` refers to `lipa02.jpg`, which is not in the repo (`UI.createSceneImage` removes images that fail to load).
- The two scenarios are near-duplicates of the same 8-scene fragment; there is no full adventure content in the repo yet.

## Testing

There is no test runner in the repo. The engine modules are plain globals with no DOM dependency in their logic paths, so they can be exercised in Node by stubbing `document`, `localStorage` and `fetch`, then loading the `engine/*.js` files with `vm.runInThisContext` in the `index.html` order (top-level `const`s land in Node's shared global lexical scope, so the modules see each other). That is the cheapest way to verify conditions, effects, ability usage and save/load without a browser.

## Git remotes

This is a fork: `origin` → `lukasFX007/RWAG-Engine`, `upstream` → `vodomil87/RWAG-Engine`. Pull upstream changes with `git pull upstream main`.
