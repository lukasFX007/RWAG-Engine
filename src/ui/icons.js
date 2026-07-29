/**
 * Icon names to glyphs.
 *
 * The card data names its icons (`stopy`, `lupa`, `bublina`, …) and the legend
 * in `legend.json` uses the same names, so the mapping belongs to the UI layer
 * rather than to the data. Emoji are used on purpose: they need no image assets,
 * so a fully offline install stays a handful of text files.
 *
 * An unknown name resolves to an empty string, never to a placeholder box — a
 * missing glyph must not push the label of a choice out of alignment.
 */

export const ICONS = Object.freeze({
  stopy: "👣",
  lupa: "🔍",
  koruna: "👑",
  mozek: "🧠",
  nuz: "🗡️",
  priroda: "🌿",
  bublina: "💬",
  svitek: "📜",
  batoh: "🎒",
  hodiny: "⏳",
  lebka: "💀",
  rep_pos: "🙂",
  rep_neu: "😐",
  rep_neg: "😡",
  zamceno: "🔒",
  odemceno: "🔓",
  role: "👤",
  hraci: "👥",
  pin: "📍",
  fajfka: "✅",
  krizek: "❌",
  otaznik: "❓",
  plus: "➕",
  minus: "➖",
  zpet: "◀",
  vpred: "▶",
  menu: "≡",
  den_noc: "🌓",
  info: "ℹ️",
  kostka: "🎲",
  zabrana: "🚧",
  psani: "✏️",
  disketa: "💾",
  kopirovat: "📋",
});

/** @returns {string} the glyph, or "" when the name is unknown or missing. */
export function icon(name) {
  if (!name) return "";
  return ICONS[name] ?? "";
}

/**
 * Reputation is a single signed number and the cards speak about it in three
 * bands (😊 positive, 😐 neutral, 😡 negative), so the status bar shows the band
 * rather than only the digits.
 */
export function reputationIconName(value) {
  if (value > 0) return "rep_pos";
  if (value < 0) return "rep_neg";
  return "rep_neu";
}

export function reputationIcon(value) {
  return icon(reputationIconName(value));
}

export function reputationWord(value) {
  if (value > 0) return "dobrá";
  if (value < 0) return "špatná";
  return "neutrální";
}

/** Quests carry a `kind` from the data; each kind reuses the card icon set. */
const QUEST_ICONS = Object.freeze({
  travel: "stopy",
  inspect: "lupa",
  deed: "koruna",
  nature: "priroda",
  talk: "bublina",
});

export function questIconName(kind) {
  return QUEST_ICONS[kind] ?? "svitek";
}

export function questIcon(kind) {
  return icon(questIconName(kind));
}
