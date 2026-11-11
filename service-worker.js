// Shack Out Back application-shell service worker.
// IMPORTANT: This worker never reads, writes, or deletes application inventory data.
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
    // Installation fails as a whole if any required shell asset is missing.
    // The currently active worker remains in control until the user approves this update.
    await cache.addAll(APP_SHELL);
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SOB_SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Deliberately retain previous SOB shell caches. This preserves a rollback
    // copy of the last application shell. No origin-wide cache cleanup occurs.
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

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
        const cached = await caches.match("./index.html");
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // App-shell assets use the version-specific cache. A new worker gets a new
  // cache, so it cannot silently mix old and new JavaScript files.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  })());
});
