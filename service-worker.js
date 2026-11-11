const CACHE_PREFIX = "sob-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v9`;
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      // Do not skipWaiting here. Existing users choose when to apply an update.
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SOB_SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Remove only caches created by Shack Out Back, including its known legacy names.
    const owned = keys.filter(key =>
      key.startsWith(CACHE_PREFIX) || key.startsWith("shack-out-back-shell-")
    );
    await Promise.all(owned.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  // Always check the network for page navigations so users don't stay on stale HTML.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
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

  // Versioned app assets are cached for offline use; the new worker has a new cache.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      throw error;
    }
  })());
});
