"use client";

import { useEffect } from "react";

/** Registers the service worker in production for installability + offline. */
export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }

    // Development: a service worker left registered by an earlier production
    // build (e.g. `npm run start` behind a tunnel) keeps intercepting requests
    // on this origin and serves a stale app shell — causing hydration
    // mismatches and a dashboard that loads forever with no data. Tear any such
    // worker (and its caches) down so `npm run dev` always runs uncached.
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // best-effort cleanup; never block the app on it
      }
    })();
  }, []);

  return null;
}
