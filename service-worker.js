const CACHE_NAME = "nilmar-training-v6-ciclo";
const APP_ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./sync.js", "./nutrition.js", "./cycle.js",
  "./data/modules.js", "./data/exercise-dataset.js", "./data/foods.js", "./data/plan-alimentacion.js", "./data/cycle-data.js",
  "./manifest.json", "./assets/isologo.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  ]));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Animaciones y dataset: red primero, con copia en caché para uso sin conexión.
  if (url.hostname === "raw.githubusercontent.com" || url.hostname.includes("fonts.")) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      try {
        const fresh = await fetch(event.request);
        if (fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      } catch { return cached || Response.error(); }
    }));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
    return res;
  }).catch(() => caches.match("./index.html"))));
});
