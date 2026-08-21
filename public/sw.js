// SATU ATAP service worker — network-first runtime cache for light offline
// support. It must never serve one route's HTML for another route, and it must
// not cache Next.js RSC navigation payloads (those always go to the network).
const CACHE = "satu-atap-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  // Let Next.js data / RSC navigation requests always hit the network so the
  // client router never renders a cached wrong page.
  const url = new URL(request.url);
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(async () => {
        // Offline: prefer the exact cached URL. Only fall back to the app
        // shell for navigations we have never cached — never for a different
        // route we *do* have.
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("/");
        return Response.error();
      })
  );
});
