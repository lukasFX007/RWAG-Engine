/**
 * Page bootstrap.
 *
 * The app lives in `web/` while the game data sits at the repository root, so
 * every data path is resolved against `base = "../"`. The service worker is
 * registered after the first paint: it is what makes the game work in the field,
 * but nothing on screen should wait for it.
 */

import { createApp } from "../src/ui/app.js";

const VERSION = "0.1.0";

const app = createApp({
  root: document.getElementById("app"),
  base: "../",
  version: VERSION,
});

// Reachable from the console for debugging on the trail, and used by the
// browser check to drive a walkthrough.
globalThis.rwag = app;

app.start();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      // No offline cache is a degraded state, not a broken one.
      console.warn("service worker se nezaregistroval:", err.message);
    });
  });
}
