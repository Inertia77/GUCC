const CACHE_VERSION = "gucc-pwa-v21";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/access-guard.js",
  "./assets/gucc-theme.css",
  "./assets/gucc-reference-v4.css",
  "./assets/resource-library-v5.css",
  "./assets/gucc-shell.js",
  "./assets/pwa-install.css",
  "./assets/pwa-install.js",
  "./assets/icons/gucc-icon.svg",
  "./assets/icons/gucc-icon-192.png?v=2",
  "./assets/icons/gucc-icon-512.png?v=2",
  "./assets/icons/gucc-icon-maskable-512.png?v=2",
  "./apps/command-center/",
  "./apps/command-center/index.html",
  "./apps/command-center/styles/app.css",
  "./apps/command-center/styles/interactions-v1.css",
  "./apps/command-center/styles/navigation-v1.css",
  "./apps/command-center/styles/content-v6.css",
  "./apps/command-center/src/main-v5.2.6.js",
  "./apps/command-center/src/api.js",
  "./apps/command-center/src/auth.js",
  "./apps/command-center/src/config-state.js",
  "./apps/command-center/src/config.js",
  "./apps/command-center/src/ui.js",
  "./apps/command-center/src/features/characters.js",
  "./apps/command-center/src/features/parties.js",
  "./apps/command-center/src/features/resources.js",
  "./apps/command-center/src/features/versions.js",
  "./apps/video-workspace/",
  "./apps/video-workspace/index.html",
  "./apps/video-workspace/ai-prompts.js",
  "./apps/cover-generator/",
  "./apps/cover-generator/index.html",
  "./reference/resource-library.html",
  "./reference/resource-library.js",
  "./data/imports/gacha-leak-sources-2026-08-07.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("gucc-pwa-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (
      await cache.match(request, { ignoreSearch: true })
      || await caches.match(request, { ignoreSearch: true })
      || await caches.match("./offline.html")
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", {
      status: 503,
      statusText: "Offline"
    });
  }
}
