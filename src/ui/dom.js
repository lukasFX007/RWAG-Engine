/**
 * The smallest DOM helper that keeps the renderer readable.
 *
 * Text always goes in through `textContent`, never `innerHTML`: card text is
 * data, and the `<br>` in it is turned into a real element by the renderer
 * instead of being handed to the HTML parser.
 */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === "string" || typeof child === "number" ? String(child) : child);
  }
  return node;
}

export function clear(node) {
  if (node) node.replaceChildren();
  return node;
}

/** Lines inside a paragraph: text nodes separated by real `<br>` elements. */
export function withBreaks(lines) {
  const out = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push(document.createElement("br"));
    out.push(document.createTextNode(line));
  });
  return out;
}
