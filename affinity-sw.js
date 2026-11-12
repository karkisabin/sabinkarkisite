/* Affinity offline support.
   Pages: network first (so new uploads show up right away), cached copy when offline.
   Fonts and icons: cache first. Bump VERSION to clear old caches. */
const VERSION = "affinity-v2";
const PRECACHE = ["/affinity", "/affinity-192.png", "/affinity-512.png", "/affinity-180.png", "/affinity.webmanifest"];

// Safari refuses redirected responses for page loads, so store a clean copy.
const clean = res => res.redirected ? res.blob().then(b => new Response(b, {status: res.status, statusText: res.statusText, headers: res.headers})) : Promise.resolve(res);
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(PRECACHE.map(u =>
    fetch(u).then(clean).then(r => r.ok && c.put(u, r)).catch(() => {})
  ))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => { if (res.ok) { const copy = res.clone(); clean(copy).then(r => caches.open(VERSION).then(c => c.put("/affinity", r))); } return res; })
        .catch(() => caches.match("/affinity"))
    );
    return;
  }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
