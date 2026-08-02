// MT Servis - basit offline cache
const CACHE = "mtservis-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./catalog.js",
  "./db.js",
  "./sync.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./bmw.png",
  "./mini-cooper.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // dış kaynaklar (ör. Tesseract CDN) network'ten geçsin
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
