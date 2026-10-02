/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // fotos otimizadas pelo next/image (origem: R2)
      matcher: ({ url }) => url.pathname.startsWith("/_next/image"),
      handler: new CacheFirst({
        cacheName: "r2-images",
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      // feed paginado — prioriza dado fresco, cai pro cache se offline
      matcher: ({ url }) => url.pathname.startsWith("/api/photos"),
      handler: new NetworkFirst({ cacheName: "api-photos" }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "pages" }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
