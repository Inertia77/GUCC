const STATIC_CACHE = "gucc-static-v10";
const RUNTIME_CACHE = "gucc-runtime-v10";

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/access-guard.js",
  "./assets/creator-pipeline-core.mjs",
  "./assets/creator-pipeline-bridge.mjs",
  "./assets/creator-pipeline-ux.mjs",
  "./assets/creator-dashboard-core.mjs",
  "./assets/creator-dashboard.mjs",
  "./assets/creator-dashboard.css",
  "./assets/gucc-theme.css",
  "./assets/gucc-zzz.css",
  "./assets/gucc-shell-nav-v2.css",
  "./assets/gucc-uiux-v1.css",
  "./assets/gucc-workspace-fixes-v1.css",
  "./assets/gucc-cover-workspace-fixes-v1.css",
  "./assets/gucc-floating-docks-v1.css",
  "./assets/gucc-workspace-right-dock-v6.css",
  "./assets/gucc-workspace-field-heights-v1.css",
  "./assets/gucc-reference-v4.css",
  "./assets/resource-library-v5.css?v=3",
  "./assets/resource-library-compact-v1.css?v=2",
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
  "./apps/command-center/styles/interactions.css",
  "./apps/command-center/styles/navigation.css",
  "./apps/command-center/styles/content.css",
  "./apps/command-center/styles/search-filters.css",
  "./apps/command-center/styles/editor-drawer.css",
  "./apps/command-center/styles/mobile-layout.css",
  "./apps/command-center/styles/expanded-details.css",
  "./apps/command-center/styles/interaction-contrast.css",
  "./apps/command-center/styles/mechanisms.css",
  "./apps/command-center/src/main.js",
  "./apps/command-center/src/api.js",
  "./apps/command-center/src/auth.js",
  "./apps/command-center/src/config-state.js",
  "./apps/command-center/src/config.js",
  "./apps/command-center/src/ui.js",
  "./apps/command-center/src/ux-state.js",
  "./apps/command-center/src/search-filters.js",
  "./apps/command-center/src/fixed-field-options.js",
  "./apps/command-center/src/record-guards.mjs",
  "./apps/command-center/src/structured-links.js",
  "./apps/command-center/src/features/characters.js",
  "./apps/command-center/src/features/parties.js",
  "./apps/command-center/src/features/mechanisms.js",
  "./apps/command-center/src/features/resources.js",
  "./apps/command-center/src/features/versions.js",
  "./apps/video-workspace/",
  "./apps/video-workspace/index.html",
  "./apps/video-workspace/ai-prompts.js",
  "./apps/video-workspace/production-system/",
  "./apps/video-workspace/production-system/index.html",
  "./apps/video-workspace/production-system/styles.css",
  "./apps/video-workspace/production-system/engine.js",
  "./apps/video-workspace/production-system/app.js",
  "./apps/cover-generator/",
  "./apps/cover-generator/index.html",
  "./apps/publishing-console/",
  "./apps/publishing-console/index.html",
  "./apps/publishing-console/styles.css",
  "./apps/publishing-console/platform-rules.js",
  "./apps/publishing-console/app.js",
  "./reference/resource-library.html",
  "./reference/resource-library.js"
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
          .filter((key) => (
            (key.startsWith("gucc-pwa-") || key.startsWith("gucc-"))
            && ![STATIC_CACHE, RUNTIME_CACHE].includes(key)
          ))
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

  // Story Library Markdown is living source data. Never let an old runtime
  // cache permanently win over a freshly merged document or FILE_MANIFEST.
  if (
    ["script", "style"].includes(request.destination)
    || url.pathname.endsWith(".json")
    || url.pathname.endsWith(".md")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

function runtimeCacheKey(request) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith(".md")) return request;

  // The Story Library adds cache-busting query parameters so clients still
  // controlled by an older worker cannot reuse a stale Markdown response.
  // Store the fresh response under the canonical URL to avoid unbounded keys.
  url.searchParams.delete("_storyv");
  url.searchParams.delete("catalog");
  return url.toString();
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cacheKey = runtimeCacheKey(request);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    return (
      await cache.match(cacheKey)
      || await caches.match(cacheKey)
      || (request.mode === "navigate" ? await caches.match("./offline.html") : null)
      || new Response("", { status: 503, statusText: "Offline" })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
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
