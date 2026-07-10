/**
 * MUSEU VAC — Service Worker
 * VERSÃO: 2.0.0
 * Padrão: HTML e chamadas à API (Apps Script) NUNCA em cache — sempre
 * da rede, para a lista de peças estar sempre atualizada. Só os
 * ficheiros verdadeiramente estáticos (ícones/logo/manifest) usam
 * cache-first. Corrige bug da v1.0.0 que fazia cache da API por engano.
 */
const CACHE_NAME = 'museu-vac-v2';
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
  const isApiCall = req.url.includes('script.google.com') || req.url.includes('script.googleusercontent.com');

  // HTML e chamadas à API — sempre da rede, nunca cache. Garante que a
  // lista de peças e o próprio site estão sempre atualizados.
  if (isHTML || isApiCall) {
    event.respondWith(
      fetch(req).catch(() => (isHTML ? caches.match('./index.html') : Response.error()))
    );
    return;
  }

  // Estáticos (ícones, logo, manifest) e fotos do GitHub — cache first,
  // com atualização em segundo plano
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
