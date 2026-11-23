/* Gestor Integral · Service Worker
   Estrategia: la app (shell estático) funciona sin conexión.
   - Navegación: network-first; si no hay red, responde con index.html cacheado.
   - Resto de recursos propios: stale-while-revalidate (instantáneo + se actualiza en segundo plano).
   - Los datos de la app NUNCA tocan este worker: viven en localStorage del navegador.
   Para publicar una nueva versión del shell, basta con volver a desplegar:
   el SWR actualiza los archivos en segundo plano; subir VERSION limpia cachés viejas. */
var VERSION = 'gestor-v15-2026-11-23';
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf('gestor-') === 0 && k !== VERSION) return caches.delete(k);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; /* la nube (Supabase) siempre va por la red */

  if (req.mode === 'navigate') {
    event.respondWith((async function () {
      try {
        var net = await fetch(req);
        var cache = await caches.open(VERSION);
        cache.put('./index.html', net.clone());
        return net;
      } catch (err) {
        var cached = await caches.match('./index.html');
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  event.respondWith((async function () {
    var cached = await caches.match(req);
    if (cached) {
      fetch(req).then(function (r) {
        if (r && r.ok) caches.open(VERSION).then(function (c) { c.put(req, r.clone()); });
      }).catch(function () {});
      return cached;
    }
    try {
      var r = await fetch(req);
      if (r && r.ok) { var c = await caches.open(VERSION); c.put(req, r.clone()); }
      return r;
    } catch (err) {
      var alt = await caches.match('./index.html');
      if (alt) return alt;
      throw err;
    }
  })());
});
