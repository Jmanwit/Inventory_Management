const CACHE_PREFIX = "sob-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v10`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./css/styles.css",
  "./vendor/qrcode.bundle.js",
  "./js/config.js",
  "./js/supabase-client.js",
  "./js/store.js",
  "./js/search.js",
  "./js/qr.js",
  "./js/printing.js",
  "./js/exports.js",
  "./js/pwa.js",
  "./js/app.js"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Atomic core-shell install: an incomplete deployment must not replace the working app.
    await cache.addAll(APP_SHELL);
    // Do not skipWaiting here. The user approves updates in pwa.js.
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SOB_SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const owned = keys.filter(key =>
      key.startsWith(CACHE_PREFIX) || key.startsWith("shack-out-back-shell-")
    );
    // Retain the active shell and two previous SOB shells for rollback/recovery.
    const numbered = owned
      .map(key => ({ key, version: Number(key.match(/(?:sob-shell-|shack-out-back-shell-)v?(\d+)$/)?.[1] ?? -1) }))
      .sort((a, b) => b.version - a.version);
    const keep = new Set([CACHE_NAME, ...numbered.filter(x => x.key !== CACHE_NAME).slice(0, 2).map(x => x.key)]);
    await Promise.all(owned.filter(key => !keep.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response?.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./index.html", response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.open(CACHE_NAME);
        const shell = await cached.match("./index.html");
        if (shell) return shell;
        throw error;
      }
    })());
    return;
  }

  // Cache-first for same-origin shell assets. A newly activated worker has its own versioned cache.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response?.ok && response.type !== "opaque") await cache.put(request, response.clone());
    return response;
  })());
});
