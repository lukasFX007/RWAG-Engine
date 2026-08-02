/**
 * Loading scenario data.
 *
 * The catalogue in `games/scenarios.json` gives a path per scenario, and each
 * `scenario.json` names its own companions (`events`, `roleSet`, `legend`,
 * `items`, `zones`) relative to its own folder. Resolving that is this module's whole job, kept
 * away from the UI so a test can hand it a fake `fetch`.
 *
 * `base` exists because the app is served from `web/` while the data lives at the
 * repository root: the page passes `"../"` and everything else stays relative.
 */

/** Folder of a path, with the trailing slash. `a/b/c.json` -> `a/b/` */
export function dirOf(path) {
  const cut = String(path ?? "").lastIndexOf("/");
  return cut === -1 ? "" : path.slice(0, cut + 1);
}

export function createLoader({ fetch: fetchImpl = globalThis.fetch, base = "" } = {}) {
  async function getJson(path) {
    const url = `${base}${path}`;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  /** The scenario catalogue, as authored (the UI decides what is playable). */
  async function loadCatalogue(path = "games/scenarios.json") {
    const list = await getJson(path);
    return Array.isArray(list) ? list : [];
  }

  /**
   * One scenario with everything the engine needs.
   * Companion files are optional: a scenario without an event deck still plays.
   */
  async function loadGame(entry) {
    const file = entry?.file;
    if (!file) throw new Error(`scénář ${entry?.id ?? "?"} nemá cestu k datům`);
    const scenario = await getJson(file);
    const dir = dirOf(file);

    const optional = async (name) => {
      if (!name) return null;
      try {
        return await getJson(`${dir}${name}`);
      } catch {
        return null;
      }
    };

    const [events, roles, legend, items, zones] = await Promise.all([
      optional(scenario.events),
      optional(scenario.roleSet),
      optional(scenario.legend),
      optional(scenario.items),
      optional(scenario.zones),
    ]);

    return {
      entry,
      scenario,
      events,
      roles: roles?.roles ?? [],
      legend: legend ?? null,
      items: items ?? null,
      /** GPS zones the role effects depend on, and the ones still missing */
      zones: zones?.zones ?? [],
      zonesPending: zones?.pending ?? [],
      dir,
      /** where card `image` names resolve, for the renderer */
      imageBase: `${base}${dir}images/`,
    };
  }

  return { loadCatalogue, loadGame, getJson };
}
