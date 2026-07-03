/**
 * MUSEU VAC — Service Worker
 * VERSÃO: 1.0.0
 * Padrão: HTML nunca em cache (network-first), estáticos (ícones/logo) em cache.
 * Segue o mesmo princípio do Service Worker do VAC.Sales POS.
 */
const CACHE_NAME = 'museu-vac-v1';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-museu.svg',
  './icon-museu-192.png',
  './icon-museu-512.png',
  './logo-vac-color.png',
  './icon-my192.png',
  './icon-pos192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {}) // não bloquear instalação se algum ícone ainda não existir
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // HTML — sempre da rede (nunca cache), garante que o utilizador vê sempre a versão mais recente
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Estáticos (ícones, logo, manifest) — cache first, com atualização em segundo plano
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes && networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
