"use client";

import { useEffect } from "react";

/** Registers the service worker in production for installability + offline. */
export function PWARegister() {
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
