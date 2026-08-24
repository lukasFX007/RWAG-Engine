/**
 * Field notes.
 *
 * Somebody walks the route and something is wrong: the GPS points forty metres
 * off, a task makes no sense on the ground, the path is a bog. This is where
 * that gets written down, on the spot, and it travels back to the repository in
 * the same export as the text rewrites.
 *
 * A note remembers where it was made — card, time, position — so it does not
 * have to say. "Tohle nedávalo smysl" is useless a week later; the same
 * sentence stamped with C12 and a pair of coordinates is a bug report.
 *
 * Notes are stored apart from the saved game on purpose, exactly like the
 * rewrites in overrides.js. Deleting a game in progress must not throw away a
 * day's worth of field notes, and `Zpět` must not undo one: a note is *about*
 * the game, not a move in it.
 */

export const NOTES_VERSION = 1;
export const NOTES_PREFIX = "rwag:notes:1:";

function notesBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function notesUsable(backend) {
  if (!backend) return false;
  const probe = `${NOTES_PREFIX}__probe`;
  try {
    backend.setItem(probe, "1");
    backend.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build one note from what is on screen and where the phone thinks it is.
 * `position` is optional throughout: nothing waits for a fix on a walk, and a
 * note without coordinates is still worth having.
 */
export function makeNote({ text, cardId = null, cardCode = null, position = null, at = null } = {}) {
  return {
    id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text: String(text ?? "").trim(),
    cardId,
    cardCode,
    at: at ?? new Date().toISOString(),
    lat: Number.isFinite(position?.lat) ? position.lat : null,
    lon: Number.isFinite(position?.lon) ? position.lon : null,
  };
}

export function createNotes({ backend = notesBackend() } = {}) {
  const store = notesUsable(backend) ? backend : null;
  let lastError = store ? null : "úložiště prohlížeče není dostupné";

  const keyFor = (scenarioId) => `${NOTES_PREFIX}${scenarioId}`;

  function list(scenarioId) {
    if (!store) return [];
    try {
      const raw = store.getItem(keyFor(scenarioId));
      if (!raw) return [];
      const payload = JSON.parse(raw);
      if (payload.v !== NOTES_VERSION) {
        lastError = `poznámky jsou z jiné verze (${payload.v})`;
        return [];
      }
      return Array.isArray(payload.notes) ? payload.notes : [];
    } catch (err) {
      lastError = err?.message ?? String(err);
      return [];
    }
  }

  function write(scenarioId, entries) {
    if (!store) return false;
    try {
      store.setItem(keyFor(scenarioId), JSON.stringify({
        v: NOTES_VERSION,
        scenarioId,
        savedAt: new Date().toISOString(),
        notes: entries,
      }));
      lastError = null;
      return true;
    } catch (err) {
      lastError = err?.message ?? String(err);
      return false;
    }
  }

  /** Kept oldest first, the order they were written on the walk. */
  function add(scenarioId, note) {
    if (!note?.text) return false;
    return write(scenarioId, [...list(scenarioId), note]);
  }

  function remove(scenarioId, noteId) {
    const entries = list(scenarioId);
    const kept = entries.filter((note) => note.id !== noteId);
    if (kept.length === entries.length) return false;
    return write(scenarioId, kept);
  }

  function clear(scenarioId) {
    if (!store) return false;
    try {
      store.removeItem(keyFor(scenarioId));
      return true;
    } catch (err) {
      lastError = err?.message ?? String(err);
      return false;
    }
  }

  return {
    available: Boolean(store),
    list,
    add,
    remove,
    clear,
    get lastError() {
      return lastError;
    },
  };
}
