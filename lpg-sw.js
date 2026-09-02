const LPG_SHELL_CACHE = 'disperindag-lpg-shell-v7-firestore-ssot';
const LPG_SHELL_ASSETS = [
  '/lpg-agen.html',
  '/login.html',
  '/css/style.css',
  '/css/modal-system.css',
  '/js/firebase-config.js',
  '/js/lpg-engine.js',
  '/js/modal-system.js',
  '/js/auth.js',
  '/js/lpg-agen.js',
  '/assets/brand/logo_pinrang_opt.png',
  '/assets/brand/lpg-app-icon-192.png',
  '/assets/brand/lpg-app-icon-512.png',
  '/lpg-manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(LPG_SHELL_CACHE).then(cache => cache.addAll(LPG_SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('disperindag-lpg-shell-') && key !== LPG_SHELL_CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(LPG_SHELL_CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request)) || caches.match('/lpg-agen.html')));
    return;
  }

  // Aset aplikasi selalu diperiksa ke server lebih dahulu. Cache hanya menjadi
  // cadangan saat perangkat benar-benar luring, sehingga rilis lama tidak
  // bertahan setelah portal diperbarui.
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(LPG_SHELL_CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request)));
});
