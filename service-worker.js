const CACHE_NAME = "shack-out-back-shell-v5";
const APP_SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./css/styles.css",
  "./vendor/qrcode.bundle.js", "./js/config.js", "./js/supabase-client.js", "./js/store.js", "./js/search.js", "./js/qr.js",
  "./js/printing.js", "./js/exports.js", "./js/app.js"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === location.origin) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match("./index.html"))));
});
