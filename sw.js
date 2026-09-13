const CACHE_NAME = "omrano-studio-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./site.js",
  "./game.js",
  "./favicon.svg",
  "./feed.xml",
  "./privacy.html",
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
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
