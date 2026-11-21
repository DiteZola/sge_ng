// Service Worker Notifications & Offline App-Shell Handler for SGE-NG
// Handles Push events, Local Scheduled/Immediate Alerts via postMessage, Notification Click deep-linking,
// Offline App-Shell + full dynamic chunk/module caching, and Cache Warming from the app.

const IS_WORKBOX = typeof self.__WB_MANIFEST !== 'undefined';
const SGE_APP_SHELL_CACHE = 'sge-ng-app-shell-v4';
const SGE_RUNTIME_CACHE = 'sge-ng-runtime-v4';

const SCOPE_URL = (self.registration && self.registration.scope) || new URL('./', self.location.href).href;
function scopeUrl(rel = '') {
  try {
    return new URL(rel, SCOPE_URL).href;
  } catch {
    return rel || './';
  }
}

const SGE_APP_SHELL_URLS = [
  '',
  'index.html',
  'manifest.json',
  'icon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png'
].map((p) => scopeUrl(p));

function isViteDevRequest(url) {
  const p = url.pathname;
  return (
    p.startsWith('/src/') ||
    p.startsWith('/@') ||
    p.startsWith('/node_modules/') ||
    p.includes('.hot-update.') ||
    p.startsWith('/api/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t')
  );
}

function isImmutableOrStaticAsset(url) {
  const p = url.pathname;
  if (isViteDevRequest(url)) return false;
  return (
    url.href.startsWith(scopeUrl('assets/')) ||
    /\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|css|mjs|js|json|webmanifest)$/i.test(p)
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
    if (isViteDevRequest(url)) return;

    const isNavigation = req.mode === 'navigate' || req.destination === 'document';
    const isImmutable = !isNavigation && isImmutableOrStaticAsset(url);

    event.respondWith(
      (async () => {
        const cacheName = isImmutable ? SGE_RUNTIME_CACHE : SGE_APP_SHELL_CACHE;
        const cache = await caches.open(cacheName);

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
          const networkRes = await fetch(req);
          if (networkRes && networkRes.ok && (networkRes.type === 'basic' || networkRes.type === 'default')) {
            cache.put(req, networkRes.clone()).catch(() => {});
          }
          return networkRes;
        }

        if (isNavigation) {
          const indexHref = scopeUrl('index.html');
          const cachedShell =
            (await cache.match(req)) ||
            (await cache.match(indexHref)) ||
            (await cache.match(scopeUrl(''))) ||
            (await caches.match(indexHref));

          try {
            const networkPromise = fetch(req).then((networkRes) => {
              if (networkRes && networkRes.ok && (networkRes.type === 'basic' || networkRes.type === 'default')) {
                cache.put(req, networkRes.clone()).catch(() => {});
                cache.put(indexHref, networkRes.clone()).catch(() => {});
              }
              return networkRes;
            });

            if (cachedShell) {
              return await Promise.race([
                networkPromise,
                new Promise((resolve) => setTimeout(() => resolve(cachedShell), 3500))
              ]);
            }
            return await networkPromise;
          } catch {
            if (cachedShell) return cachedShell;
            return new Response(
              '<!doctype html><html lang="pt"><meta charset="utf-8"><title>SGE-NG Offline</title><body style="font-family:sans-serif;padding:24px;text-align:center;"><h2>SGE-NG Modo Offline</h2><p>Recarregue a página para restaurar a sessão local.</p></body></html>',
              { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          }
        }

        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.ok && (networkRes.type === 'basic' || networkRes.type === 'default')) {
            cache.put(req, networkRes.clone()).catch(() => {});
          }
          return networkRes;
        } catch {
          const cached = (await cache.match(req)) || (await caches.match(req));
          if (cached) return cached;
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

  const defaultIcon = scopeUrl('pwa-192x192.png');
  const title = data.title || 'SGE-NG • Alerta Escolar';
  const options = {
    body: data.body || '',
    icon: data.icon || defaultIcon,
    badge: data.badge || defaultIcon,
    tag: data.tag || `sge-push-${Date.now()}`,
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction || data.urgente),
    vibrate: data.urgente ? [200, 100, 200, 100, 250] : [150, 80, 150],
    silent: Boolean(data.silent),
    data: {
      url: data.url || scopeUrl(''),
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
    const defaultIcon = scopeUrl('pwa-192x192.png');
    const title = n.title || 'SGE-NG • Alerta';
    const options = {
      body: n.body || '',
      icon: n.icon || defaultIcon,
      badge: n.badge || defaultIcon,
      tag: n.tag || `sge-local-${Date.now()}`,
      renotify: true,
      requireInteraction: Boolean(n.requireInteraction || n.urgente),
      vibrate: n.urgente ? [220, 100, 220, 100, 220] : [140, 70, 140],
      silent: Boolean(n.silent),
      data: n.data || { url: scopeUrl(''), tab: 'dashboard' },
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
        const uniqueUrls = Array.from(new Set(payload.urls)).filter((u) => {
          if (typeof u !== 'string' || !u.startsWith(self.location.origin)) return false;
          try {
            return !isViteDevRequest(new URL(u));
          } catch {
            return false;
          }
        });
        await Promise.allSettled(
          uniqueUrls.map(async (u) => {
            try {
              const parsed = new URL(u);
              const targetCache = isImmutableOrStaticAsset(parsed) ? runtime : cache;
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
  const targetUrl = notifData.url || scopeUrl('');

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
