// ══════════════════════════════════════════
//  Finance Cobranças Pro — Service Worker
//  Versão: 2.0 (Offline completo)
// ══════════════════════════════════════════

const CACHE_NAME = 'finance-pro-v2';

const CORE_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Recursos externos essenciais para o app funcionar offline
const EXTERNAL_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Lato:wght@400;700&family=IBM+Plex+Mono:wght@400;600&display=swap'
];

// ── Instalação ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cacheia arquivos locais
      await cache.addAll(CORE_FILES.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Arquivos locais:', err));
      // Cacheia recursos externos
      await cache.addAll(EXTERNAL_FILES)
        .catch(err => console.warn('[SW] Recursos externos:', err));
    })
  );
  self.skipWaiting();
});

// ── Ativação ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache First → Network ──
self.addEventListener('fetch', (event) => {
  // Ignora requisições do Firebase (precisam de rede, têm retry próprio)
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('securetoken.google.com') ||
      url.includes('drive.googleapis.com')) {
    return; // Deixa o Firebase/Drive lidar diretamente
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline e sem cache: retorna index.html como fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
