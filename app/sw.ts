/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = "/offline";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // App posts SKIP_WAITING after the user accepts the update toast.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.destination === "document" && url.origin === self.location.origin,
      handler: new NetworkFirst({
        cacheName: "folio-documents",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 })],
      }),
    },
    {
      matcher: ({ request, url }) =>
        request.destination === "image" && url.origin === self.location.origin,
      handler: new CacheFirst({
        cacheName: "folio-static-images",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // Dexie owns user data via blob: URLs — keep the SW out of it.
    {
      matcher: ({ url }) => url.protocol === "blob:",
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
