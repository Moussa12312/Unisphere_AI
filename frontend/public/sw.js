// ==============================================================================
// UniSphere AI - Service Worker Haute Performance (PWA & Mode Hors-Ligne Global)
// Version: 3.1.0
// ==============================================================================

const CACHE_VERSION = 'unisphere-v3.1.0';
const STATIC_CACHE = `unisphere-static-${CACHE_VERSION}`;
const PAGES_CACHE = `unisphere-pages-${CACHE_VERSION}`;
const API_CACHE = `unisphere-api-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';

// Ressources critiques indispensables au démarrage hors-ligne
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/login'
];

// Installation : mise en cache immédiate des assets critiques
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache non-bloquant:', err);
      });
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, PAGES_CACHE, API_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception réseau intelligente
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorer les requêtes non-HTTP (ex: chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // ============================================================================
  // 1. NAVIGATION HTML (Pages de l'application)
  // Stratégie : Réseau d'abord, sauvegarde automatique en cache, repli sur cache
  // ============================================================================
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Hors-ligne : chercher d'abord la page demandée dans le cache
          const pagesCache = await caches.open(PAGES_CACHE);
          const cachedPage = await pagesCache.match(req);
          if (cachedPage) {
            return cachedPage;
          }
          // Si la page précise n'a jamais été visitée, servir la page hors-ligne officielle
          const staticCache = await caches.open(STATIC_CACHE);
          const offlinePage = await staticCache.match(OFFLINE_URL);
          return offlinePage || new Response('Mode hors ligne actif', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // ============================================================================
  // 2. APPELS API (FastAPI /api/v1/...)
  // Stratégie : Réseau d'abord, sauvegarde du dernier état, repli sur données en cache
  // ============================================================================
  if (url.pathname.includes('/api/')) {
    // Les mutations (POST, PUT, DELETE) nécessitent une connexion
    if (req.method !== 'GET') {
      event.respondWith(
        fetch(req).catch(() => {
          return new Response(
            JSON.stringify({
              detail: 'Connexion Internet requise pour enregistrer cette opération.',
              offline: true
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        })
      );
      return;
    }

    // Requêtes de lecture GET API : mise en cache dynamique
    event.respondWith(
      fetch(req)
        .then((apiResponse) => {
          if (apiResponse && apiResponse.status === 200) {
            const apiCopy = apiResponse.clone();
            caches.open(API_CACHE).then((cache) => cache.put(req, apiCopy));
          }
          return apiResponse;
        })
        .catch(async () => {
          // Serveur inaccessible / sans internet : servir les dernières données connues
          const apiCache = await caches.open(API_CACHE);
          const cachedData = await apiCache.match(req);
          if (cachedData) {
            return cachedData;
          }
          return new Response(
            JSON.stringify({
              detail: 'Données temporairement indisponibles hors connexion.',
              offline: true,
              data: []
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }
          );
        })
    );
    return;
  }

  // ============================================================================
  // 3. FICHIERS STATIQUES (JS Next.js, CSS, Images, Polices)
  // Stratégie : Stale-While-Revalidate (Cache immédiat + rafraîchissement silencieux)
  // ============================================================================
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Notifications Push en arrière-plan
self.addEventListener('push', (event) => {
  let data = {
    title: 'UniSphere AI',
    body: 'Nouvelle notification disponible.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      vibrate: [150, 80, 150],
      data: { url: data.url || '/' }
    })
  );
});

// Clic notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (let client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
