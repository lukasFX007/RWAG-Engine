/**
 * Card decks.
 *
 * Deck N is not a graph: card N01 instructs that every evaluated card goes back
 * to the bottom, so the deck is a queue that recycles and the same card can come
 * up again in a long game. That makes the deck order part of the saved state,
 * and it makes shuffling a seeded operation, so a game restored from a save
 * keeps dealing the same sequence it would have dealt.
 */

/** mulberry32 — small, fast, and reproducible from a 32-bit seed. */
export function makeRng(seed, cursor = 0) {
  let a = (seed + cursor * 0x6d2b79f5) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(ids, rng) {
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build a deck's initial order. `topCard` is kept on top after shuffling,
 * because P05 says deck N is put away with N01 face up on top and N01 is the
 * card that explains the mechanic.
 */
export function initDeck(state, { deckId, cardIds, topCard = null, shuffle = true }) {
  const rng = makeRng(state.seed, state.rngCursor);
  state.rngCursor += 1;

  let order = shuffle ? shuffled(cardIds, rng) : cardIds.slice();
  if (topCard && order.includes(topCard)) {
    order = [topCard, ...order.filter((id) => id !== topCard)];
  }
  state.decks[deckId] = { order, drawn: [] };
  return state.decks[deckId];
}

/**
 * Take the top card. With drawRule "recycle_to_bottom" it goes straight to the
 * bottom, so it can be drawn again later; otherwise it is set aside.
 */
export function draw(state, deckId, { drawRule = "recycle_to_bottom" } = {}) {
  const deck = state.decks[deckId];
  if (!deck || deck.order.length === 0) return null;

  const [cardId, ...rest] = deck.order;
  deck.order = drawRule === "recycle_to_bottom" ? [...rest, cardId] : rest;
  deck.drawn.push(cardId);
  return cardId;
}

export function deckSize(state, deckId) {
  return state.decks[deckId]?.order.length ?? 0;
}

export function timesDrawn(state, deckId, cardId) {
  return (state.decks[deckId]?.drawn ?? []).filter((id) => id === cardId).length;
}
