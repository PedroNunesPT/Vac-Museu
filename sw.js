/**
 * ============================================================
 * MUSEU VAC — Service Worker
 * ============================================================
 * VERSÃO:  2.1.0
 * GRUPO:   Vintage Aero Club — Museu Digital
 * DATA:    2026-09-09
 * AUTOR:   Pedro Nunes (com apoio de Claude)
 * ------------------------------------------------------------
 * HISTÓRICO DE VERSÕES
 * 2.1.0  2026-09-09 — PM3: CACHE_NAME subiu de museu-vac-v2 para
 *        museu-vac-v3, para forçar todos os telemóveis a
 *        descartarem a cache antiga e irem buscar os ícones
 *        maskable novos (icon-museu-192-maskable.png e
 *        icon-museu-512-maskable.png), adicionados também à
 *        lista de estáticos. Sem esta subida de versão, quem já
 *        tinha a app instalada continuaria a servir os ícones
 *        antigos da cache local, mesmo depois do manifest.json
 *        ser publicado.
 * 2.0.0  2026-07-10 00:00 — Corrigido bug grave: chamadas à API
 *        (script.google.com) estavam a ser tratadas como
 *        ficheiros estáticos e ficavam em cache, mostrando dados
 *        antigos (peças/fotos novas não apareciam). Agora API e
 *        HTML são sempre da rede, nunca em cache.
 * 1.0.0  2026-07-03        — Primeira versão: HTML network-first,
 *        estáticos (ícones/logo) cache-first.
 * ------------------------------------------------------------
 */
const CACHE_NAME = 'museu-vac-v3';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-museu.svg',
  './icon-museu-192.png',
  './icon-museu-512.png',
  './icon-museu-192-maskable.png',
  './icon-museu-512-maskable.png',
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
