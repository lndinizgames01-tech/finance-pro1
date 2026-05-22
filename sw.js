// ══════════════════════════════════════════
//  Finance Cobranças Pro — Service Worker
//  Versão: 1.0
// ══════════════════════════════════════════

const CACHE_NAME = 'finance-pro-v1';

// Arquivos principais para cache offline
const CORE_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── Instalação: faz o cache dos arquivos core ──
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_FILES.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Alguns arquivos não puderam ser cacheados:', err));
    })
  );
  self.skipWaiting();
});

// ── Ativação: limpa caches antigos ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: estratégia Cache First → Network ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Para requisições da própria origem (index.html, manifest, ícones)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            // Salva no cache para próximas vezes
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline: entrega o index.html como fallback
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
    );
    return;
  }

  // Para recursos externos (fontes Google, CDN xlsx) — Network First → Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
