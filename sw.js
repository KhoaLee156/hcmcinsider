/* HCMC Insider service worker: keeps the homepage, the Saved page and saved place pages usable offline.
   Pages: network first, cached copy when offline. Assets: cached copy first, refreshed in the background.
   Saved place pages live in "hi-saved" (filled by assets/site.js when you tap ♡ Save). */
const V = "v1";
const CORE = "hi-core-" + V, PAGES = "hi-pages-" + V, ASSETS = "hi-assets-" + V, SAVED = "hi-saved";
const PRECACHE = ["/", "/saved/", "/assets/page.css", "/assets/site.js?v=6ea69382", "/favicon.svg",
  "/assets/fonts/be-vietnam-pro-latin-400-normal.woff2", "/assets/fonts/be-vietnam-pro-latin-800-normal.woff2",
  "/assets/fonts/be-vietnam-pro-vietnamese-400-normal.woff2", "/assets/fonts/be-vietnam-pro-vietnamese-800-normal.woff2",
  "/assets/fonts/be-vietnam-pro-latin-ext-400-normal.woff2", "/assets/fonts/be-vietnam-pro-latin-ext-800-normal.woff2"];
const MAX_PAGES = 40;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  const keep = [CORE, PAGES, ASSETS, SAVED];
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => keep.indexOf(k) < 0).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name), ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

async function page(req) {
  const url = new URL(req.url), key = url.origin + url.pathname;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CORE).then(async c => {
        // Keep the precached copies and saved places fresh; other pages go into a small rolling cache.
        if (await c.match(key)) return c.put(key, copy);
        const s = await caches.open(SAVED);
        if (await s.match(key)) return s.put(key, copy);
        const p = await caches.open(PAGES);
        await p.put(key, copy);
        trim(PAGES, MAX_PAGES);
      });
    }
    return res;
  } catch (err) {
    return (await caches.match(key)) || (await caches.match("/saved/")) ||
      new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function asset(req, e) {
  const hit = await caches.match(req);
  const net = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then(c => c.put(req, copy)); }
    return res;
  });
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") { e.respondWith(page(req)); return; }
  if (/^\/(assets|og)\//.test(url.pathname) || /\.(svg|png|jpg|woff2)$/.test(url.pathname)) e.respondWith(asset(req, e));
});
