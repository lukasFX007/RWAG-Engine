/**
 * What the group carries.
 *
 * The printed game hands out physical things: an envelope with a letter, three
 * maps, six herb cards, a whistle a dice player gives away, a bloodied stone
 * found behind a fence. Some are read, some unlock a choice, and one — the herb
 * pages — is a small economy of its own, because the herbalist gives one away
 * and sells four more for a point of reputation each.
 *
 * `state.inventory` already held counts keyed by id. This adds the catalogue
 * they are counted against, so the app can show a name and a description rather
 * than `bylina_mak: 1`, and so a pool can be drawn from without the card data
 * having to name which herb comes up.
 */

import { makeRng, shuffled } from "./decks.js";

/**
 * Index a scenario's `items.json` for lookup.
 * @param {{items?: object[], pools?: object}} [data]
 */
export function createCatalogue(data) {
  const items = new Map((data?.items ?? []).map((item) => [item.id, item]));
  const pools = new Map(Object.entries(data?.pools ?? {}));

  const byPool = new Map();
  for (const item of items.values()) {
    if (!item.pool) continue;
    if (!byPool.has(item.pool)) byPool.set(item.pool, []);
    byPool.get(item.pool).push(item.id);
  }

  return {
    get: (id) => items.get(id) ?? null,
    all: () => [...items.values()],
    pool: (id) => pools.get(id) ?? null,
    poolItems: (id) => byPool.get(id) ?? [],
    /** Items the group is meant to start the game holding. */
    starting: () => [...items.values()].filter((item) => item.startsWith),
  };
}

/** The empty catalogue, so a scenario without items.json still plays. */
export const NO_ITEMS = createCatalogue(null);

export function owned(state, itemId) {
  return (state.inventory[itemId]?.count ?? 0) > 0;
}

export function ownedFromPool(state, catalogue, poolId) {
  return catalogue.poolItems(poolId).filter((id) => owned(state, id));
}

export function give(state, catalogue, itemId, count = 1, fallbackName = null) {
  const known = catalogue.get(itemId);
  const entry = state.inventory[itemId] ?? {
    id: itemId,
    name: known?.name ?? fallbackName ?? itemId,
    count: 0,
  };
  entry.count += count;
  state.inventory[itemId] = entry;
  return entry;
}

/**
 * Take one unowned item from a pool at random.
 *
 * Seeded like the decks are, so a restored save deals the same herb it would
 * have dealt. Returns null when the pool is exhausted rather than handing out a
 * duplicate — six herb cards are six different pages, not six of the same.
 */
export function drawFromPool(state, catalogue, poolId) {
  const available = catalogue.poolItems(poolId).filter((id) => !owned(state, id));
  if (available.length === 0) return null;

  const rng = makeRng(state.seed, state.rngCursor);
  state.rngCursor += 1;
  const [picked] = shuffled(available, rng);
  give(state, catalogue, picked);
  return catalogue.get(picked) ?? { id: picked, name: picked };
}

/** Everything held, in catalogue order, with the pools kept together. */
export function inventoryOf(state, catalogue) {
  const held = [];
  for (const item of catalogue.all()) {
    const count = state.inventory[item.id]?.count ?? 0;
    if (count > 0) held.push({ ...item, count });
  }
  // items granted by a card that the catalogue does not know about still show,
  // because a curse recorded as an item is something the players need to see
  for (const [id, entry] of Object.entries(state.inventory)) {
    if (catalogue.get(id) || (entry.count ?? 0) <= 0) continue;
    held.push({ id, name: entry.name ?? id, icon: "batoh", count: entry.count });
  }
  return held;
}
