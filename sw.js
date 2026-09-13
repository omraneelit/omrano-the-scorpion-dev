const CACHE_NAME = "omrano-studio-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./site.js",
  "./game.js",
  "./manifest.json",
  "./favicon.svg",
  "./feed.xml",
  "./privacy.html",
  "./data/game-updates.json",
  "./assets/brand/og-cover.png",
  "./assets/brand/apple-touch-icon.png",
  "./assets/games/lineburst.webp",
  "./assets/games/paws-and-platters-card.webp",
  "./assets/games/turf-bag-alley-mafia-card.webp",
  "./assets/games/zero-hour-protocol.webp",
  "./assets/games/cowdude-open-world.webp",
  "./assets/games/heir-of-the-wilds-card.webp",
  "./projects/shadow-engine.html",
  "./games/cowdude-open-world.html",
  "./games/heir-of-the-wilds.html",
  "./games/lineburst.html",
  "./games/paws-and-platters.html",
  "./games/turf-bag-alley-mafia.html",
  "./games/zero-hour-protocol.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  // Navigation (HTML document requests): Network-First, fallback to Cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // Static assets: Stale-While-Revalidate (instant response from cache, background refresh)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === "basic" || url.origin === location.origin)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
