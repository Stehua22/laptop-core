/* LaptopCore service worker: makes the site work offline.
 *
 *  - Pages:        network first, falls back to the last saved copy, then to /offline
 *  - Laptop data:  network first, falls back to the last data you saw
 *  - Static files: saved the first time they load, so they open instantly and offline
 *
 * Only plain GET requests are ever touched. Logins, payments, messages and /api/* are never cached.
 * To switch offline mode off for everyone, publish a new sw.js that just unregisters itself.
 */
const VERSION = "v1";
const PAGES = "lc-pages-" + VERSION;
const ASSETS = "lc-assets-" + VERSION;
const DATA = "lc-data-" + VERSION;
const KEEP = [PAGES, ASSETS, DATA];
const OFFLINE_URL = "/offline";
const MAX_PAGES = 40;
const MAX_ASSETS = 150;
const MAX_DATA = 80;
const PAGE_TIMEOUT = 6000;
const DATA_TIMEOUT = 8000;

// Pages that are personal or that move money: never saved
const NEVER_CACHE_PAGES = [
  "/login", "/signup", "/account", "/admin", "/messages",
  "/refurbished/sell", "/refurbished/my-listings", "/refurbished/payouts", "/premium",
];

// Public Supabase tables that are fine to show from the saved copy
const CACHEABLE_DATA = /\/rest\/v1\/(laptops|articles|listings)(\?|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("lc-") && !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request, cacheName, max, timeout, cacheKey) {
  const cache = await caches.open(cacheName);
  const key = cacheKey || request;
  try {
    const response = await withTimeout(fetch(request), timeout);
    if (response && response.ok) {
      await cache.put(key, response.clone());
      trim(cacheName, max);
    }
    return response;
  } catch (error) {
    const saved = await cache.match(key, { ignoreVary: true });
    if (saved) return saved;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone());
        trim(cacheName, max);
      }
      return response;
    })
    .catch(() => null);
  return saved || (await refresh) || Response.error();
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    cache.put(request, response.clone());
    trim(cacheName, max);
  }
  return response;
}

async function offlineFallback() {
  const cache = await caches.open(PAGES);
  return (await cache.match(OFFLINE_URL)) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1. Laptop / article / listing data from Supabase
  if (!sameOrigin) {
    if (url.hostname.endsWith(".supabase.co") && CACHEABLE_DATA.test(url.pathname + url.search)) {
      // Key by plain URL so the saved copy matches no matter which headers the request had
      const key = new Request(url.href);
      event.respondWith(networkFirst(request, DATA, MAX_DATA, DATA_TIMEOUT, key));
    }
    return; // everything else on other sites (images, analytics, Stripe...) is left alone
  }

  // 2. Same-site requests we never touch
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_vercel/") || url.pathname === "/sw.js") return;
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch") || url.searchParams.has("_rsc")) return;

  // 3. Page loads
  if (request.mode === "navigate") {
    if (NEVER_CACHE_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) return;
    event.respondWith(
      networkFirst(request, PAGES, MAX_PAGES, PAGE_TIMEOUT).catch(() =>
        caches.open(PAGES).then((cache) => cache.match(request, { ignoreSearch: true })).then((saved) => saved || offlineFallback())
      )
    );
    return;
  }

  // 4. Built files (named by content, so they never change): save once, reuse forever
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSETS, MAX_ASSETS));
    return;
  }

  // 5. Other files from this site (icon, manifest, optimized images...): show the saved one, refresh quietly
  event.respondWith(staleWhileRevalidate(request, ASSETS, MAX_ASSETS));
});
