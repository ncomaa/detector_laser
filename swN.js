// sw.js — funciona sin internet, pero SIEMPRE busca primero la versión nueva. Cambiar el número al actualizar archivos.
const V = "lasermark-v2";
const A = ["./", "./index.html", "./app.js", "./config.js", "./detector.js", "./estilos.css", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => Promise.all(A.map(u => fetch(u, { cache: "reload" }).then(r => c.put(u, r)))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request.url, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
