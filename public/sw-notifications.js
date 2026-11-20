// Service Worker Notifications & Offline App-Shell Handler for SGE-NG
// Handles Push events, Local Scheduled/Immediate Alerts via postMessage, Notification Click deep-linking,
// Offline App-Shell + full dynamic chunk/module caching, and Cache Warming from the app.

const IS_WORKBOX = typeof self.__WB_MANIFEST !== 'undefined';
const SGE_APP_SHELL_CACHE = 'sge-ng-app-shell-v3';
const SGE_RUNTIME_CACHE = 'sge-ng-runtime-v3';
const SGE_APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

function isImmutableOrStaticAsset(pathname) {
  return (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/node_modules/.vite/deps/') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|css|mjs|js)$/i.test(pathname) &&
      !pathname.startsWith('/src/')
  );
}

if (!IS_WORKBOX) {
  self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
      caches.open(SGE_APP_SHELL_CACHE).then((cache) =>
        Promise.allSettled(
          SGE_APP_SHELL_URLS.map((url) =>
            fetch(new Request(url, { cache: 'reload' }))
              .then((res) => {
                if (res && res.ok) return cache.put(url, res);
              })
              .catch(() => {})
          )
        )
      )
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (k) =>
                  (k.startsWith('sge-ng-app-shell-') && k !== SGE_APP_SHELL_CACHE) ||
                  (k.startsWith('sge-ng-runtime-') && k !== SGE_RUNTIME_CACHE)
              )
              .map((k) => caches.delete(k))
          )
        )
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (!req || req.method !== 'GET') return;

    let url;
    try {
      url = new URL(req.url);
    } catch {
      return;
    }

    if (url.origin !== self.location.origin) return;
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('.hot-update.') ||
      url.pathname.startsWith('/@vite/client')
    ) {
      return;
    }

    const isNavigation = req.mode === 'navigate' || req.destination === 'document';
    const isImmutable = !isNavigation && isImmutableOrStaticAsset(url.pathname);

    event.respondWith(
      (async () => {
        const cacheName = isImmutable ? SGE_RUNTIME_CACHE : SGE_APP_SHELL_CACHE;
        const cache = await caches.open(cacheName);

        const fetchWithTimeout = (timeoutMs) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('network-timeout')), timeoutMs);
            fetch(req)
              .then((res) => {
                clearTimeout(timer);
                resolve(res);
              })
              .catch((err) => {
                clearTimeout(timer);
                reject(err);
              });
          });

        // Para dependências pré-compiladas (.vite/deps, assets com hash, ícones, fontes): Stale-While-Revalidate instantâneo offline e online
        if (isImmutable) {
          const cached = (await cache.match(req)) || (await caches.match(req));
          if (cached) {
            fetch(req)
              .then((netRes) => {
                if (netRes && netRes.ok && (netRes.type === 'basic' || netRes.type === 'default')) {
                  cache.put(req, netRes.clone()).catch(() => {});
                }
              })
              .catch(() => {});
            return cached;
          }
        }

        try {
          // Timeout curto (1200ms) evita bloqueio longo em Wi-Fi sem saída internet (portal cativo / sem dados)
          const networkRes = await fetchWithTimeout(isNavigation ? 1500 : 1200);
          if (networkRes && networkRes.ok && (networkRes.type === 'basic' || networkRes.type === 'default')) {
            cache.put(req, networkRes.clone()).catch(() => {});
            if (isNavigation) {
              cache.put('/index.html', networkRes.clone()).catch(() => {});
            }
          }
          return networkRes;
        } catch {
          const cached = (await cache.match(req)) || (await caches.match(req));
          if (cached) return cached;
          if (isNavigation) {
            return (
              (await cache.match('/index.html')) ||
              (await cache.match('/')) ||
              (await caches.match('/index.html')) ||
              new Response(
                '<!doctype html><html lang="pt"><meta charset="utf-8"><title>SGE-NG Offline</title><body style="font-family:sans-serif;padding:24px;text-align:center;"><h2>SGE-NG Modo Offline</h2><p>Recarregue a página para restaurar a sessão local.</p></body></html>',
                { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
            );
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      })()
    );
  });
}

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      try {
        data = { title: 'SGE-NG • Notificação Escolar', body: event.data.text() };
      } catch {
        data = { title: 'SGE-NG • Notificação Escolar', body: 'Nova atualização no sistema.' };
      }
    }
  }

  const title = data.title || 'SGE-NG • Alerta Escolar';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || `sge-push-${Date.now()}`,
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction || data.urgente),
    vibrate: data.urgente ? [200, 100, 200, 100, 250] : [150, 80, 150],
    silent: Boolean(data.silent),
    data: {
      url: data.url || '/',
      tab: data.tab || 'dashboard',
      subTab: data.subTab || '',
      categoria: data.categoria || 'SISTEMA',
      entityId: data.entityId || '',
      timestamp: Date.now()
    },
    actions: Array.isArray(data.actions) ? data.actions : [
      { action: 'abrir', title: 'Abrir no SGE-NG' },
      { action: 'dispensar', title: 'Dispensar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('message', (event) => {
  const payload = event.data;
  if (!payload || typeof payload !== 'object') return;

  if (payload.type === 'SGE_SHOW_NOTIFICATION' && payload.notification) {
    const n = payload.notification;
    const title = n.title || 'SGE-NG • Alerta';
    const options = {
      body: n.body || '',
      icon: n.icon || '/pwa-192x192.png',
      badge: n.badge || '/pwa-192x192.png',
      tag: n.tag || `sge-local-${Date.now()}`,
      renotify: true,
      requireInteraction: Boolean(n.requireInteraction || n.urgente),
      vibrate: n.urgente ? [220, 100, 220, 100, 220] : [140, 70, 140],
      silent: Boolean(n.silent),
      data: n.data || { url: '/', tab: 'dashboard' },
      actions: Array.isArray(n.actions) ? n.actions : [
        { action: 'abrir', title: 'Ver Detalhes' },
        { action: 'dispensar', title: 'Fechar' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }

  if (payload.type === 'SGE_WARM_CACHE' && Array.isArray(payload.urls) && !IS_WORKBOX) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SGE_APP_SHELL_CACHE);
        const runtime = await caches.open(SGE_RUNTIME_CACHE);
        const uniqueUrls = Array.from(new Set(payload.urls)).filter(
          (u) => typeof u === 'string' && u.startsWith(self.location.origin) && !u.includes('.hot-update.')
        );
        await Promise.allSettled(
          uniqueUrls.map(async (u) => {
            try {
              const parsed = new URL(u);
              const targetCache = isImmutableOrStaticAsset(parsed.pathname) ? runtime : cache;
              const existing = await targetCache.match(u);
              if (existing) return;
              const res = await fetch(u);
              if (res && res.ok) {
                await targetCache.put(u, res);
              }
            } catch {}
          })
        );
      })()
    );
  }

  if (payload.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dispensar') {
    return;
  }

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'SGE_NOTIFICATION_CLICK',
            data: notifData
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl).then((newClient) => {
          if (newClient) {
            setTimeout(() => {
              newClient.postMessage({
                type: 'SGE_NOTIFICATION_CLICK',
                data: notifData
              });
            }, 800);
          }
        });
      }
    })
  );
});
