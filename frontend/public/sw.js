// ==============================================================================
// UniSphere AI - Service Worker PWA & Navigation Hors-Ligne Intégrale
// Version: 5.0.0
// ==============================================================================

const CACHE_VERSION = 'unisphere-v5.0.0';
const STATIC_CACHE = `unisphere-static-${CACHE_VERSION}`;
const PAGES_CACHE = `unisphere-pages-${CACHE_VERSION}`;
const API_CACHE = `unisphere-api-${CACHE_VERSION}`;

const PUBLIC_PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/logo.png',
  '/images/modern-campus.jpg',
  '/login',
  '/offline.html',
];

function getFallbackDashboard(pathname) {
  if (pathname.startsWith('/admin')) return '/admin/dashboard';
  if (pathname.startsWith('/accountant')) return '/accountant/dashboard';
  if (pathname.startsWith('/secretary')) return '/secretary/dashboard';
  if (pathname.startsWith('/teacher')) return '/teacher/dashboard';
  if (pathname.startsWith('/student')) return '/student/dashboard';
  if (pathname.startsWith('/censeur')) return '/censeur/dashboard';
  if (pathname.startsWith('/guard')) return '/guard';
  if (pathname.startsWith('/alumni')) return '/alumni/dashboard';
  if (pathname.startsWith('/superadmin')) return '/superadmin/dashboard';
  return null;
}

async function cacheNextStaticAssetsFromHtml(htmlText, staticCache) {
  if (!htmlText) return;
  const matches = htmlText.match(/\/_next\/static\/[^"'\\\s<>]+/g);
  if (!matches) return;
  const uniqueUrls = Array.from(new Set(matches));
  await Promise.allSettled(
    uniqueUrls.map(async (assetPath) => {
      try {
        const existing = await staticCache.match(assetPath);
        if (!existing) {
          const assetRes = await fetch(assetPath, { credentials: 'same-origin' });
          if (assetRes && assetRes.status === 200 && !assetRes.redirected) {
            await staticCache.put(assetPath, assetRes);
          }
        }
      } catch {}
    })
  );
}

// 1. Installation : pré-cache des ressources publiques de base
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.allSettled(
        PUBLIC_PRECACHE_ASSETS.map(async (asset) => {
          try {
            const res = await fetch(asset, { credentials: 'same-origin' });
            if (res && res.status === 200 && !res.redirected) {
              await cache.put(asset, res);
            }
          } catch {}
        })
      );
    })
  );
});

// 2. Activation : nettoyage des anciens caches et contrôle immédiat
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, PAGES_CACHE, API_CACHE].includes(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Préchauffage complet des pages HTML + chunks JS/CSS du rôle connecté
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_ROUTES') {
    const routes = Array.isArray(event.data.routes) ? event.data.routes : [];
    event.waitUntil(
      (async () => {
        const pagesCache = await caches.open(PAGES_CACHE);
        const staticCache = await caches.open(STATIC_CACHE);

        for (const rawRoute of routes) {
          try {
            const cleanPath = String(rawRoute).split('?')[0];
            if (!cleanPath.startsWith('/')) continue;

            const alreadyCached = await pagesCache.match(cleanPath);
            if (alreadyCached) continue;

            const res = await fetch(cleanPath, {
              credentials: 'same-origin',
              headers: { Accept: 'text/html' },
            });

            // Ne jamais mettre en cache une redirection vers /login ou /?unauthorized=true
            if (res && res.status === 200 && !res.redirected) {
              const htmlClone = res.clone();
              await pagesCache.put(cleanPath, res);
              if (rawRoute !== cleanPath) {
                await pagesCache.put(rawRoute, htmlClone.clone());
              }
              const htmlText = await htmlClone.text();
              await cacheNextStaticAssetsFromHtml(htmlText, staticCache);
            }
          } catch {}
        }
      })()
    );
  }
});

// 4. Interception intelligente des requêtes
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // ==========================================================================
  // A. NAVIGATION HTML (Pages de l'application)
  // ==========================================================================
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const copyExact = networkResponse.clone();
            const copyPath = networkResponse.clone();
            const copyForAssets = networkResponse.clone();
            caches.open(PAGES_CACHE).then(async (cache) => {
              await cache.put(req, copyExact);
              await cache.put(url.pathname, copyPath);
            });
            caches.open(STATIC_CACHE).then(async (staticCache) => {
              try {
                const html = await copyForAssets.text();
                await cacheNextStaticAssetsFromHtml(html, staticCache);
              } catch {}
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const pagesCache = await caches.open(PAGES_CACHE);
          const staticCache = await caches.open(STATIC_CACHE);

          // 1. Page exacte (avec query params)
          let cached = await pagesCache.match(req);
          if (cached) return cached;

          // 2. Page par chemin canonique (sans query params)
          cached = (await pagesCache.match(url.pathname)) || (await staticCache.match(url.pathname));
          if (cached) return cached;

          // 3. Sous-page dynamique jamais ouverte en ligne : maintien strict dans l'espace de travail
          const roleDashboard = getFallbackDashboard(url.pathname);
          if (roleDashboard) {
            const safePath = JSON.stringify(url.pathname);
            const safeDash = JSON.stringify(roleDashboard);
            return new Response(
              `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UniSphere AI</title></head><body style="margin:0;background:#0a1628;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;color:#fff;"><script>try{sessionStorage.setItem('unisphere_offline_stay',${safePath});}catch(e){}if(window.history.length>1){window.history.back();}else{window.location.replace(${safeDash});}</script></body></html>`,
              { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          }

          // 4. Repli sur /offline.html uniquement en cas d'accès public à froid
          const offlineFallback = await staticCache.match('/offline.html');
          return (
            offlineFallback ||
            new Response('Mode hors-ligne actif', {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // ==========================================================================
  // B. REQUÊTES RSC NEXT.JS (Navigation SPA _rsc / Header RSC: 1)
  // ==========================================================================
  const isRscRequest = url.searchParams.has('_rsc') || req.headers.get('RSC') === '1';
  if (isRscRequest) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const pagesCache = await caches.open(PAGES_CACHE);
          const cachedRsc = await pagesCache.match(req);
          if (cachedRsc) return cachedRsc;
          // Laisser Next.js basculer proprement sur la page HTML complète déjà en cache dans PAGES_CACHE
          return Response.error();
        })
    );
    return;
  }

  // ==========================================================================
  // C. APPELS API (/api/v1/...)
  // ==========================================================================
  if (url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET') {
      event.respondWith(
        fetch(req).catch(() => {
          return new Response(
            JSON.stringify({
              detail: 'Mode hors-ligne : connexion Internet requise pour enregistrer de nouvelles informations.',
              offline: true,
            }),
            {
              status: 503,
              statusText: 'Offline Mode',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        })
      );
      return;
    }

    event.respondWith(
      fetch(req)
        .then((apiRes) => {
          if (apiRes && apiRes.status === 200) {
            const copyExact = apiRes.clone();
            const copyPath = apiRes.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(req, copyExact);
              cache.put(url.pathname, copyPath);
            });
          }
          return apiRes;
        })
        .catch(async () => {
          const apiCache = await caches.open(API_CACHE);
          const cachedExact = await apiCache.match(req);
          if (cachedExact) return cachedExact;

          const cachedByPath = await apiCache.match(url.pathname);
          if (cachedByPath) return cachedByPath;

          return new Response('[]', {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-UniSphere-Offline': '1',
            },
          });
        })
    );
    return;
  }

  // ==========================================================================
  // D. CHUNKS IMMUABLES NEXT.JS (/_next/static/...) -> Cache-First Ultra Rapide
  // ==========================================================================
  if (req.method === 'GET' && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const netRes = await fetch(req);
          if (netRes && netRes.status === 200 && !netRes.redirected) {
            cache.put(req, netRes.clone());
          }
          return netRes;
        } catch {
          if (url.pathname.endsWith('.css')) {
            return new Response('/* offline */', {
              status: 200,
              headers: { 'Content-Type': 'text/css; charset=utf-8' },
            });
          }
          return new Response('/* offline */', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
          });
        }
      })
    );
    return;
  }

  // ==========================================================================
  // E. AUTRES FICHIERS STATIQUES (Images, Icônes, Polices, Uploads)
  // ==========================================================================
  if (req.method === 'GET') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((netRes) => {
            if (netRes && netRes.status === 200 && !netRes.redirected) {
              cache.put(req, netRes.clone());
            }
            return netRes;
          })
          .catch(() => cached || new Response('', { status: 204 }));

        return cached || networkPromise;
      })
    );
  }
});

// Notifications Push
self.addEventListener('push', (event) => {
  let data = {
    title: 'UniSphere AI',
    body: 'Nouvelle notification disponible.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/',
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
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      vibrate: [150, 80, 150],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
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
