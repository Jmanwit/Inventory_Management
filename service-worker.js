const CACHE_PREFIX = "sob-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v13`;
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
    // Install the shell atomically. A missing asset prevents a partial update.
    await cache.addAll(APP_SHELL);
    // Deliberately do not call skipWaiting here; the user approves activation.
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SOB_SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => event.waitUntil((async () => {
  const keys = (await caches.keys()).filter(key => key.startsWith(CACHE_PREFIX)).sort((a, b) => {
    const av = Number(a.slice(CACHE_PREFIX.length));
    const bv = Number(b.slice(CACHE_PREFIX.length));
    return av - bv;
  });
  // Retain the active shell and two prior SOB shells for recovery.
  const obsolete = keys.filter(key => key !== CACHE_NAME).slice(0, Math.max(0, keys.length - 3));
  await Promise.all(obsolete.map(key => caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  // Always revalidate navigations; fall back to the cached app shell if offline.
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

  // Same-origin application assets use this version's cache first.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response?.ok && response.type !== "opaque") await cache.put(request, response.clone());
    return response;
  })());
});
