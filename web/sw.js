/**
 * Service worker — the offline half of the app.
 *
 * The game is played on an eight-hour walk through countryside where a signal is
 * a matter of luck, so "offline" is not a nicety: everything the app needs is
 * precached on install, including the scenario JSON and the card illustrations.
 * After that the network is only ever an update channel.
 *
 * Paths are relative to this file (web/), which is why the data is reached with
 * `../games/…`.
 */

const VERSION = "rwag-v1";
const CACHE = `${VERSION}`;

/** Everything needed to start and finish a game with the radio off. */
const ASSETS = [
  "./",
  "index.html",
  "app.css",
  "boot.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",

  "../src/core/engine.js",
  "../src/core/rules.js",
  "../src/core/state.js",
  "../src/core/decks.js",
  "../src/ui/app.js",
  "../src/ui/render.js",
  "../src/ui/view.js",
  "../src/ui/text.js",
  "../src/ui/icons.js",
  "../src/ui/dom.js",
  "../src/platform/data.js",
  "../src/platform/storage.js",
  "../src/platform/geo.js",

  "../games/scenarios.json",
  "../games/nebakov/scenario.json",
  "../games/nebakov/events.json",
  "../games/nebakov/roles.json",
  "../games/nebakov/legend.json",
  "../games/nebakov/images/nahled.jpg",
  "../games/nebakov/images/lipa01.jpg",
  "../games/ukazka/images/nahled.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One missing asset must not fail the whole install — a game that runs
    // without its thumbnail beats a game that never installs.
    const results = await Promise.allSettled(ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" }))));
    const failed = results
      .map((r, i) => (r.status === "rejected" ? ASSETS[i] : null))
      .filter(Boolean);
    if (failed.length) console.warn("sw: nepodařilo se uložit do cache:", failed);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

/**
 * Cache first.
 *
 * The scenario data is versioned content, not a feed, so serving the stored copy
 * is both correct and instant; a background revalidation keeps a cached copy
 * fresh for the next launch when there happens to be a signal.
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });

    if (cached) {
      revalidate(cache, request);
      return cached;
    }

    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    } catch (err) {
      // Offline and not cached: a navigation still gets the app shell, so the
      // player sees the game instead of the browser's error page.
      if (request.mode === "navigate") {
        const shell = await cache.match("index.html");
        if (shell) return shell;
      }
      throw err;
    }
  })());
});

function revalidate(cache, request) {
  fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") cache.put(request, response);
    })
    .catch(() => {
      /* offline is the normal case out there */
    });
}
