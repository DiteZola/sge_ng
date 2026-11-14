// Service Worker Notifications Handler for SGE-NG
// Handles Push events, Local Scheduled/Immediate Alerts via postMessage, and Notification Click deep-linking

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
