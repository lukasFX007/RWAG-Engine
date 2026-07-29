/**
 * Saved games.
 *
 * The state object is the whole save (see src/core/state.js), so persistence is
 * one `JSON.stringify` and a key. What this module really adds is failure
 * tolerance: `localStorage` throws on access in a locked-down or private-mode
 * browser and throws again when the quota is full, and an eight-hour walk in the
 * field must not end because a save failed. Every operation therefore returns a
 * result instead of throwing, and the game runs unsaved when storage is absent.
 */

import { deserialise, serialise } from "../core/state.js";

export const SAVE_VERSION = 1;
export const KEY_PREFIX = "rwag:save:1:";

/** In-memory stand-in with the localStorage interface, for tests and fallback. */
export function memoryBackend(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

/**
 * A backend is only usable if a write actually goes through: Safari's private
 * mode exposes `localStorage` and then throws on `setItem`.
 */
export function isUsable(backend) {
  if (!backend) return false;
  const probe = `${KEY_PREFIX}__probe`;
  try {
    backend.setItem(probe, "1");
    backend.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // accessing the property itself can throw when storage is blocked
    return null;
  }
}

/**
 * @param {object} [options]
 * @param {Storage} [options.backend]  defaults to localStorage when it works
 */
export function createStorage({ backend = defaultBackend() } = {}) {
  const usable = isUsable(backend);
  const store = usable ? backend : null;
  /** last failure, so the UI can tell the players saving is off */
  let lastError = usable ? null : "úložiště prohlížeče není dostupné";

  const keyFor = (scenarioId) => `${KEY_PREFIX}${scenarioId}`;

  function save(scenarioId, state) {
    if (!store) return false;
    const payload = {
      v: SAVE_VERSION,
      scenarioId,
      savedAt: new Date().toISOString(),
      scene: state.currentScene ?? null,
      reputation: state.reputation ?? 0,
      finished: Boolean(state.finishedAt),
      state: serialise(state),
    };
    try {
      store.setItem(keyFor(scenarioId), JSON.stringify(payload));
      lastError = null;
      return true;
    } catch (err) {
      lastError = err?.message ?? String(err);
      return false;
    }
  }

  /** @returns {{scenarioId, savedAt, scene, state}|null} */
  function load(scenarioId) {
    if (!store) return null;
    let raw;
    try {
      raw = store.getItem(keyFor(scenarioId));
    } catch (err) {
      lastError = err?.message ?? String(err);
      return null;
    }
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      if (payload.v !== SAVE_VERSION) {
        // A save from another app version is dropped rather than guessed at: a
        // half-understood state would corrupt a game in progress.
        lastError = `uložená hra je z jiné verze (${payload.v})`;
        return null;
      }
      return { ...payload, state: deserialise(payload.state) };
    } catch (err) {
      lastError = err?.message ?? String(err);
      return null;
    }
  }

  /** Metadata for every saved game, without deserialising the states. */
  function list() {
    const out = {};
    if (!store) return out;
    try {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key || !key.startsWith(KEY_PREFIX)) continue;
        const payload = JSON.parse(store.getItem(key) ?? "null");
        if (!payload || payload.v !== SAVE_VERSION) continue;
        out[payload.scenarioId] = {
          scenarioId: payload.scenarioId,
          savedAt: payload.savedAt ?? null,
          scene: payload.scene ?? null,
          reputation: payload.reputation ?? 0,
          finished: Boolean(payload.finished),
        };
      }
    } catch (err) {
      lastError = err?.message ?? String(err);
    }
    return out;
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
    available: usable,
    save,
    load,
    list,
    clear,
    get lastError() {
      return lastError;
    },
  };
}
