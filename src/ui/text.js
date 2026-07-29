/**
 * Card text formatting.
 *
 * A card's `text` is either one string or an array of paragraphs, and inside a
 * paragraph the authors write a literal `<br>` where the printed card had a hard
 * line break (bullet lists, verse). The renderer therefore needs both levels:
 * paragraphs and, within them, lines.
 *
 * Everything here returns plain strings. The renderer builds text nodes from
 * them and never touches `innerHTML`, so card data cannot inject markup — which
 * matters because the same pipeline will render user-authored scenarios later.
 */

const BREAK = /<br\s*\/?>/gi;

/** Split a card's `text` into paragraphs, dropping empty ones. */
export function paragraphsOf(text) {
  if (text === null || text === undefined) return [];
  const list = Array.isArray(text) ? text : [text];
  return list
    .filter((part) => typeof part === "string")
    .flatMap((part) => part.split(/\n{2,}/))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Split one paragraph on `<br>` into the lines it should be shown as. */
export function linesOf(paragraph) {
  if (typeof paragraph !== "string") return [];
  const lines = paragraph
    .split(BREAK)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0);
  return lines;
}

/**
 * The renderable shape of a card's text: an array of paragraphs, each an array
 * of lines.
 * @returns {string[][]}
 */
export function cardText(text) {
  return paragraphsOf(text)
    .map((paragraph) => linesOf(paragraph))
    .filter((lines) => lines.length > 0);
}

/** Same content as one string — used for screen readers, titles and tests. */
export function plainText(text) {
  return cardText(text)
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}
