// Service worker för Ölbiblioteket: gör sidan installerbar och läsbar offline.
// Nätet först (så att nattens nya data och kod alltid används), cachen som reserv när nätet saknas.
const CACHE = 'olb-v2';
const GRUND = ['./', 'index.html', 'shim.js', 'forslag.js', 'flikar.js', 'd3.min.js', 'manifest.webmanifest', 'ikoner/ikon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(GRUND)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((nycklar) => Promise.all(nycklar.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((svar) => {
        if (svar.ok) { const kopia = svar.clone(); caches.open(CACHE).then((c) => c.put(req, kopia)); }
        return svar;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((tr) => tr || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
