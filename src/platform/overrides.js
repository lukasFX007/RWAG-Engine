/**
 * Text overrides.
 *
 * The author plays the hosted game, hits a clumsy sentence and rewrites it on the
 * spot. Those rewrites live in this browser until they are exported and written
 * into the repository, so this module is deliberately narrow: it stores a rewrite
 * per field, applies rewrites to a loaded scenario before the engine sees it, and
 * exports them in a shape that can be dropped straight into the per-card files.
 *
 * Two rules shape the whole design.
 *
 * Only text. A rewrite may replace a card's `text` or a choice's `text`, and
 * nothing else — never `goto`, `disableIf`, `effects` or `quest`. The engine can
 * therefore keep running on overridden data with no idea that anything happened,
 * and a bad rewrite can spoil the wording but never the graph.
 *
 * Every rewrite remembers the text it replaced (`base`). When the repository text
 * changes underneath — a new build lands while the author still has local
 * rewrites — the base no longer matches and the rewrite is *not* applied. It is
 * flagged instead, with both versions kept, because silently overwriting the new
 * official text with an edit made against the old one is exactly the accident
 * this field exists to prevent.
 */

export const OVERRIDES_VERSION = 1;
export const OVERRIDES_PREFIX = "rwag:overrides:1:";
export const EXPORT_FORMAT = "rwag-overrides/1";

/* ------------------------------------------------------------------ text shape */

/**
 * Card text is a string or an array of paragraphs, so comparisons and edits work
 * on the normalised form: an array of non-empty paragraphs.
 */
export function toParagraphs(text) {
  if (text === null || text === undefined) return [];
  const list = Array.isArray(text) ? text : [text];
  return list
    .filter((part) => typeof part === "string")
    .flatMap((part) => part.split(/\n{2,}/))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** The editor is one textarea; a blank line starts a new paragraph. */
export function fromEditorText(value) {
  return toParagraphs(String(value ?? ""));
}

export function toEditorText(text) {
  return toParagraphs(text).join("\n\n");
}

/**
 * Write the rewrite back in the shape the field already had, so a card that
 * stored one string does not turn into a one-item array in the diff.
 */
export function matchShape(original, paragraphs) {
  if (Array.isArray(original)) return paragraphs.slice();
  return paragraphs.length === 1 ? paragraphs[0] : paragraphs.slice();
}

export function sameText(a, b) {
  const left = toParagraphs(a);
  const right = toParagraphs(b);
  return left.length === right.length && left.every((line, i) => line === right[i]);
}

/* --------------------------------------------------------------------- records */

/** One rewrite per field: card text, or the label of one choice. */
export function recordKey({ cardId, field, index }) {
  return field === "choice" ? `${cardId}|choice|${index}` : `${cardId}|text`;
}

export function makeRecord({ cardId, field, index = null, value, base, at = null }) {
  const record = {
    cardId,
    field,
    value,
    base,
    at: at ?? new Date().toISOString(),
  };
  if (field === "choice") record.index = index;
  return record;
}

/** The path into the card file, which is what makes the export writable. */
export function recordPath(record) {
  return record.field === "choice" ? `choices[${record.index}].text` : "text";
}

/**
 * A quest's text was derived from its choice's label ("Úkol: Dojděte k pomníku"),
 * so rewriting the label has to carry the quest along or the journal and the
 * button start telling the group different things. The relationship is mechanical
 * — strip the "Úkol:" prefix — and it is only applied when the old quest text
 * really was inside the old label; otherwise the quest text is left alone.
 */
const QUEST_PREFIX = /^\s*Úkol\s*(\([^)]*\))?\s*:\s*/u;

export function questTextFor(choice, newLabel) {
  const quest = choice?.quest;
  if (!quest?.text) return null;
  const oldLabel = String(choice.text ?? "");
  if (!oldLabel.includes(quest.text)) return null;
  const derived = String(newLabel).replace(QUEST_PREFIX, "").trim();
  return derived.length ? derived : null;
}

/* --------------------------------------------------------------------- applying */

function sceneOf(scenario, cardId) {
  return (scenario?.scenes ?? []).find((scene) => scene.id === cardId) ?? null;
}

/** What the data says right now, for the field a record points at. */
export function currentValue(scenario, record) {
  const scene = sceneOf(scenario, record.cardId);
  if (!scene) return null;
  if (record.field === "choice") return scene.choices?.[record.index]?.text ?? null;
  return scene.text ?? null;
}

/**
 * Apply one rewrite in place.
 *
 * In place on purpose: the engine holds references to these very scene objects,
 * so an edit made mid-game shows up on the next redraw without rebuilding the
 * engine or losing the group's position.
 *
 * A base that no longer matches splits two ways. If the current text already
 * says what the rewrite wanted (a later build adopted it, or just landed on
 * the same words some other way), there is nothing to apply and nothing for
 * the author to decide — "resolved". Otherwise the field moved on for an
 * unrelated reason and the rewrite is a genuine "stale" conflict that needs a
 * human to look at both versions.
 *
 * @returns {"applied"|"resolved"|"stale"|"missing"}
 */
export function applyRecord(scenario, record) {
  const scene = sceneOf(scenario, record.cardId);
  if (!scene) return "missing";

  if (record.field === "text") {
    if (sameText(scene.text, record.base)) {
      scene.text = matchShape(scene.text, toParagraphs(record.value));
      return "applied";
    }
    return sameText(scene.text, record.value) ? "resolved" : "stale";
  }

  const choice = scene.choices?.[record.index];
  if (!choice) return "missing";
  if (sameText(choice.text, record.base)) {
    const questText = questTextFor(choice, record.value);
    choice.text = String(record.value);
    if (questText) choice.quest.text = questText;
    return "applied";
  }
  return sameText(choice.text, record.value) ? "resolved" : "stale";
}

/**
 * Apply every rewrite to a scenario, reporting the ones that could not be.
 * @returns {{scenario, applied: object[], resolved: object[], stale: object[], missing: object[]}}
 */
export function applyOverrides(scenario, records = []) {
  const applied = [];
  const resolved = [];
  const stale = [];
  const missing = [];

  for (const record of records) {
    const before = currentValue(scenario, record);
    const result = applyRecord(scenario, record);
    if (result === "applied") applied.push(record);
    else if (result === "resolved") resolved.push(record);
    else if (result === "stale") stale.push({ record, current: before });
    else missing.push(record);
  }
  return { scenario, applied, resolved, stale, missing };
}

/* --------------------------------------------------------------------- export */

/**
 * The shape `tools/apply_overrides.py` writes into the per-card files: grouped by
 * card, one path per field, each carrying the base it was written against so the
 * tool can refuse anything that has moved on.
 *
 * Rewrites whose base no longer matches split the same way `applyRecord`
 * does: one already resolved needs no export and no mention at all, the
 * other kind is a genuine conflict and is listed separately, since it needs
 * a human to compare the two versions first.
 */
export function exportOverrides({
  scenarioId,
  records = [],
  scenario = null,
  build = null,
  at = null,
} = {}) {
  const cards = {};
  const stale = [];
  let written = 0;

  for (const record of records) {
    const current = scenario ? currentValue(scenario, record) : null;
    const drifted = scenario ? !sameText(current, record.base) : false;
    const resolved = drifted && scenario ? sameText(current, record.value) : false;
    if (resolved) continue;

    const entry = {
      path: recordPath(record),
      base: record.base,
      value: record.value,
      at: record.at,
    };

    if (record.field === "choice") {
      entry.index = record.index;
      const scene = scenario ? sceneOf(scenario, record.cardId) : null;
      const choice = scene?.choices?.[record.index];
      // the quest text derived from this label travels with it
      const questText = choice ? questTextFor({ ...choice, text: record.base }, record.value) : null;
      if (questText) {
        entry.questText = questText;
        entry.questPath = `choices[${record.index}].quest.text`;
      }
    }

    if (drifted) {
      stale.push({ cardId: record.cardId, ...entry, current });
      continue;
    }

    const card = (cards[record.cardId] ??= { choices: [] });
    if (record.field === "choice") card.choices.push(entry);
    else card.text = entry;
    written += 1;
  }

  for (const card of Object.values(cards)) {
    card.choices.sort((a, b) => a.index - b.index);
    if (!card.choices.length) delete card.choices;
  }

  return {
    format: EXPORT_FORMAT,
    scenarioId: scenarioId ?? null,
    build: build ?? null,
    exportedAt: at ?? new Date().toISOString(),
    count: written,
    cards,
    stale,
  };
}

/* -------------------------------------------------------------------- storage */

function overridesBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function overridesUsable(backend) {
  if (!backend) return false;
  const probe = `${OVERRIDES_PREFIX}__probe`;
  try {
    backend.setItem(probe, "1");
    backend.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rewrites are kept under their own key, apart from the saved game: deleting a
 * game in progress must not throw away the author's text work, and vice versa.
 */
export function createOverrides({ backend = overridesBackend() } = {}) {
  const store = overridesUsable(backend) ? backend : null;
  let lastError = store ? null : "úložiště prohlížeče není dostupné";

  const keyFor = (scenarioId) => `${OVERRIDES_PREFIX}${scenarioId}`;

  function list(scenarioId) {
    if (!store) return [];
    try {
      const raw = store.getItem(keyFor(scenarioId));
      if (!raw) return [];
      const payload = JSON.parse(raw);
      if (payload.v !== OVERRIDES_VERSION) {
        lastError = `úpravy textů jsou z jiné verze (${payload.v})`;
        return [];
      }
      return Array.isArray(payload.records) ? payload.records : [];
    } catch (err) {
      lastError = err?.message ?? String(err);
      return [];
    }
  }

  function write(scenarioId, records) {
    if (!store) return false;
    try {
      store.setItem(keyFor(scenarioId), JSON.stringify({
        v: OVERRIDES_VERSION,
        scenarioId,
        savedAt: new Date().toISOString(),
        records,
      }));
      lastError = null;
      return true;
    } catch (err) {
      lastError = err?.message ?? String(err);
      return false;
    }
  }

  /** One rewrite per field: setting the same field again replaces it. */
  function set(scenarioId, record) {
    const key = recordKey(record);
    const records = list(scenarioId).filter((r) => recordKey(r) !== key);
    records.push(record);
    return write(scenarioId, records);
  }

  function remove(scenarioId, target) {
    const key = recordKey(target);
    const records = list(scenarioId);
    const kept = records.filter((r) => recordKey(r) !== key);
    if (kept.length === records.length) return false;
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
    set,
    remove,
    clear,
    get lastError() {
      return lastError;
    },
  };
}
