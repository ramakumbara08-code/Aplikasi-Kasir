const CACHE_NAME = "kasir-saas-v33";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css?v=20260724-02",
  "./js/config.js?v=20260724-02",
  "./js/demo.js?v=20260724-02",
  "./js/app.js?v=20260724-02",
  "./manifest.webmanifest?v=20260724-02",
  "./public/icon.svg?v=20260724-02",
  "./public/icon-192.png?v=20260724-02",
  "./public/icon-512.png?v=20260724-02",
  "./public/apple-touch-icon.png?v=20260724-02"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate" || ["script", "style"].includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
