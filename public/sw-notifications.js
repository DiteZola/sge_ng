// Service Worker Notifications & Offline App-Shell Handler for SGE-NG
// Handles Push events, Offline/Closed-Browser Scheduled Alerts (PeriodicSync, Sync, TimestampTrigger),
// Shared IndexedDB Reminder State, Notification Click deep-linking, and Offline App-Shell Caching.

const IS_WORKBOX = typeof self.__WB_MANIFEST !== 'undefined';
const SGE_APP_SHELL_CACHE = 'sge-ng-app-shell-v5';
const SGE_RUNTIME_CACHE = 'sge-ng-runtime-v5';

const REMINDER_DB_NAME = 'SGE_NG_SW_REMINDERS_DB';
const REMINDER_DB_VERSION = 1;
const REMINDER_STORE = 'state';

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
    p.endsWith('/version.json') ||
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

// ==========================================
// INDEXEDDB PARTILHADO PARA LEMBRETES OFFLINE / BROWSER FECHADO
// ==========================================
function openReminderDB() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(REMINDER_DB_NAME, REMINDER_DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(REMINDER_STORE)) {
          db.createObjectStore(REMINDER_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readReminderRecord(id) {
  const db = await openReminderDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(REMINDER_STORE, 'readonly');
      const store = tx.objectStore(REMINDER_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeReminderRecord(record) {
  const db = await openReminderDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(REMINDER_STORE, 'readwrite');
      const store = tx.objectStore(REMINDER_STORE);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function parseMinutos(hhmm) {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
  const parts = hhmm.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatMinutos(totalMin) {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getLocalDateIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeDueLessonReminders(state, now) {
  if (!state || !state.prefs) return [];
  const prefs = state.prefs;
  if (!prefs.notificarMudancaTempo && !prefs.notificarTerminoTempo) return [];

  const mapaDias = {
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado'
  };
  const diaHoje = mapaDias[now.getDay()];
  if (!diaHoje) return [];

  const minutosAgora = now.getHours() * 60 + now.getMinutes();
  const dataHoje = getLocalDateIso(now);
  const icon = state.escolaIcon || scopeUrl('pwa-192x192.png');
  const candidatos = [];
  const temposCobertos = new Set();

  const horarios = Array.isArray(state.horarios) ? state.horarios : [];
  const horariosHoje = horarios.filter((h) => {
    if (!h || h.diaSemana !== diaHoje) return false;
    if (state.userRole === 'Professor') {
      return (
        h.professorId === state.userId ||
        (h.professorNome &&
          state.userNome &&
          String(h.professorNome).toLowerCase() === String(state.userNome).toLowerCase())
      );
    }
    return true;
  });

  horariosHoje.forEach((h) => {
    const minIni = parseMinutos(h.horaInicio);
    const minFim = parseMinutos(h.horaFim);
    if (minIni === null || minFim === null) return;
    const turmaRotulo = h.turmaNome ? `${h.classe} - ${h.turmaNome}` : h.classe || 'Turma';

    if (prefs.notificarMudancaTempo && prefs.avisoPrevio5Min) {
      const targetMin = minIni - 5;
      temposCobertos.add(`START5_${h.numeroTempo}`);
      candidatos.push({
        targetMin,
        dedupeKey: `${dataHoje}_${h.id}_AVISO5_${formatMinutos(targetMin)}`,
        title: `⏰ Faltam 5 min para o ${h.numeroTempo}º Tempo`,
        body: `Mudança de tempo às ${h.horaInicio}: ${h.disciplinaNome} (${turmaRotulo}). Sala ${h.sala || '—'}.`,
        tag: `sge-tempo-pre-${h.id}-${dataHoje}`,
        icon,
        categoria: 'MUDANCA_TEMPO',
        tab: 'horarios',
        entityId: h.id,
        urgente: false
      });
    }

    if (prefs.notificarMudancaTempo) {
      temposCobertos.add(`START_${h.numeroTempo}`);
      candidatos.push({
        targetMin: minIni,
        dedupeKey: `${dataHoje}_${h.id}_INICIO_${h.horaInicio}`,
        title: `🔔 Mudança de Tempo: Início do ${h.numeroTempo}º Tempo`,
        body: `${h.disciplinaNome} iniciou às ${h.horaInicio} (${turmaRotulo}). Sala ${h.sala || '—'}.`,
        tag: `sge-tempo-ini-${h.id}-${dataHoje}`,
        icon,
        categoria: 'MUDANCA_TEMPO',
        tab: 'horarios',
        entityId: h.id,
        urgente: false
      });
    }

    if (prefs.notificarTerminoTempo && prefs.avisoPrevio5Min) {
      const targetMin = minFim - 5;
      temposCobertos.add(`END5_${h.numeroTempo}`);
      candidatos.push({
        targetMin,
        dedupeKey: `${dataHoje}_${h.id}_FIM5_${formatMinutos(targetMin)}`,
        title: `⏱️ Faltam 5 min para Término do ${h.numeroTempo}º Tempo`,
        body: `A aula de ${h.disciplinaNome} (${turmaRotulo}) termina às ${h.horaFim}. Prepare o sumário.`,
        tag: `sge-tempo-prefim-${h.id}-${dataHoje}`,
        icon,
        categoria: 'TERMINO_TEMPO',
        tab: 'horarios',
        entityId: h.id,
        urgente: false
      });
    }

    if (prefs.notificarTerminoTempo) {
      temposCobertos.add(`END_${h.numeroTempo}`);
      candidatos.push({
        targetMin: minFim,
        dedupeKey: `${dataHoje}_${h.id}_FIM_${h.horaFim}`,
        title: `⏹️ Término do ${h.numeroTempo}º Tempo Letivo`,
        body: `O tempo de ${h.disciplinaNome} (${turmaRotulo}) terminou às ${h.horaFim}.`,
        tag: `sge-tempo-fim-${h.id}-${dataHoje}`,
        icon,
        categoria: 'TERMINO_TEMPO',
        tab: 'horarios',
        entityId: h.id,
        urgente: false
      });
    }
  });

  // Tempos letivos gerais da escola + turnos
  const slotsGerais = [];
  const temposHorarios = Array.isArray(state.temposHorarios) ? state.temposHorarios : [];
  temposHorarios.forEach((t) => {
    const ini = parseMinutos(t.inicio);
    const fim = parseMinutos(t.fim);
    if (ini === null || fim === null) return;
    slotsGerais.push({
      id: `TEMPO_${t.numero}`,
      rotuloTurno: 'Horário Oficial',
      numeroTempo: t.numero,
      inicioMin: ini,
      fimMin: fim,
      inicioStr: t.inicio,
      fimStr: t.fim
    });
  });

  if (slotsGerais.length === 0 && Array.isArray(state.turnos)) {
    state.turnos.forEach((turno) => {
      const minIniTurno = parseMinutos(turno.horaInicio);
      const minFimTurno = parseMinutos(turno.horaFim);
      if (minIniTurno === null || minFimTurno === null || minFimTurno <= minIniTurno) return;
      const numTempos = Math.max(1, turno.temposLectivos || 5);
      const intervalo = Math.max(0, turno.intervaloMinutos ?? 15);
      const duracaoAula = 45;
      const metadeTempos = Math.ceil(numTempos / 2);
      let cursor = minIniTurno;
      for (let n = 1; n <= numTempos; n++) {
        const ini = cursor;
        const fim = Math.min(minFimTurno, ini + duracaoAula);
        if (ini >= minFimTurno) break;
        slotsGerais.push({
          id: `${turno.id}_T${n}`,
          rotuloTurno: `Turno ${turno.nome}`,
          numeroTempo: n,
          inicioMin: ini,
          fimMin: fim,
          inicioStr: formatMinutos(ini),
          fimStr: formatMinutos(fim)
        });
        cursor = fim + (n === metadeTempos ? intervalo : 5);
      }
    });
  }

  slotsGerais.forEach((slot) => {
    if (prefs.notificarMudancaTempo && prefs.avisoPrevio5Min && !temposCobertos.has(`START5_${slot.numeroTempo}`)) {
      const targetMin = slot.inicioMin - 5;
      candidatos.push({
        targetMin,
        dedupeKey: `${dataHoje}_GERAL_${slot.id}_AVISO5_${formatMinutos(targetMin)}`,
        title: `⏰ Faltam 5 min — ${slot.numeroTempo}º Tempo (${slot.rotuloTurno})`,
        body: `Mudança de tempo letivo às ${slot.inicioStr}. ${state.escolaNome || 'SGE-NG'}.`,
        tag: `sge-geral-pre-${slot.id}-${dataHoje}`,
        icon,
        categoria: 'MUDANCA_TEMPO',
        tab: 'horarios',
        urgente: false
      });
    }

    if (prefs.notificarMudancaTempo && !temposCobertos.has(`START_${slot.numeroTempo}`)) {
      candidatos.push({
        targetMin: slot.inicioMin,
        dedupeKey: `${dataHoje}_GERAL_${slot.id}_INICIO_${slot.inicioStr}`,
        title: `🔔 Mudança de Tempo — ${slot.numeroTempo}º Tempo (${slot.rotuloTurno})`,
        body: `Início oficial do ${slot.numeroTempo}º tempo letivo (${slot.inicioStr} - ${slot.fimStr}).`,
        tag: `sge-geral-ini-${slot.id}-${dataHoje}`,
        icon,
        categoria: 'MUDANCA_TEMPO',
        tab: 'horarios',
        urgente: false
      });
    }

    if (prefs.notificarTerminoTempo && prefs.avisoPrevio5Min && !temposCobertos.has(`END5_${slot.numeroTempo}`)) {
      const targetMin = slot.fimMin - 5;
      candidatos.push({
        targetMin,
        dedupeKey: `${dataHoje}_GERAL_${slot.id}_FIM5_${formatMinutos(targetMin)}`,
        title: `⏱️ Faltam 5 min para Término — ${slot.numeroTempo}º Tempo`,
        body: `O ${slot.numeroTempo}º tempo (${slot.rotuloTurno}) termina às ${slot.fimStr}.`,
        tag: `sge-geral-prefim-${slot.id}-${dataHoje}`,
        icon,
        categoria: 'TERMINO_TEMPO',
        tab: 'horarios',
        urgente: false
      });
    }

    if (prefs.notificarTerminoTempo && !temposCobertos.has(`END_${slot.numeroTempo}`)) {
      candidatos.push({
        targetMin: slot.fimMin,
        dedupeKey: `${dataHoje}_GERAL_${slot.id}_FIM_${slot.fimStr}`,
        title: `⏹️ Término de Tempo — ${slot.numeroTempo}º Tempo (${slot.rotuloTurno})`,
        body: `Encerramento do ${slot.numeroTempo}º tempo letivo às ${slot.fimStr}.`,
        tag: `sge-geral-fim-${slot.id}-${dataHoje}`,
        icon,
        categoria: 'TERMINO_TEMPO',
        tab: 'horarios',
        urgente: false
      });
    }
  });

  // Disparar os que estão na janela [targetMin, targetMin + 2]
  return candidatos.filter((c) => minutosAgora >= c.targetMin && minutosAgora <= c.targetMin + 2);
}

async function checkAndDispatchDueReminders() {
  try {
    const state = await readReminderRecord('schedule_state');
    const firedRec = (await readReminderRecord('fired_keys')) || { id: 'fired_keys', entries: {} };
    const entries = firedRec.entries && typeof firedRec.entries === 'object' ? { ...firedRec.entries } : {};
    const nowMs = Date.now();
    const cutoff = nowMs - 36 * 60 * 60 * 1000;
    Object.keys(entries).forEach((k) => {
      if (!entries[k] || entries[k] < cutoff) delete entries[k];
    });

    const defaultIcon = scopeUrl('pwa-192x192.png');
    let changed = false;

    // 1. Verificar comunicações / mensagens pendentes em fila offline
    const queuedRec = await readReminderRecord('queued_comms');
    if (queuedRec && Array.isArray(queuedRec.items) && queuedRec.items.length > 0) {
      const remaining = [];
      for (const q of queuedRec.items) {
        if (!q || !q.title) continue;
        if (q.dedupeKey && entries[q.dedupeKey]) continue;
        if (q.dedupeKey) {
          entries[q.dedupeKey] = nowMs;
          changed = true;
        }
        await self.registration.showNotification(q.title, {
          body: q.body || '',
          icon: q.icon || defaultIcon,
          badge: defaultIcon,
          tag: q.tag || `sge-comm-${Date.now()}`,
          renotify: true,
          requireInteraction: Boolean(q.urgente),
          vibrate: q.urgente ? [220, 100, 220, 100, 220] : [140, 70, 140],
          data: {
            url: scopeUrl(''),
            tab: q.tab || 'comunicacao',
            subTab: q.subTab || '',
            entityId: q.entityId || '',
            categoria: q.categoria || 'COMUNICACAO'
          },
          actions: [
            { action: 'abrir', title: 'Abrir no SGE-NG' },
            { action: 'dispensar', title: 'Dispensar' }
          ]
        });
      }
      await writeReminderRecord({ id: 'queued_comms', items: remaining });
    }

    // 2. Verificar lembretes de mudança de tempo (5 min antes e hora exata) mesmo sem separador aberto
    if (state && state.prefs && state.prefs.executarEmSegundoPlanoSW !== false) {
      const due = computeDueLessonReminders(state, new Date());
      for (const item of due) {
        if (entries[item.dedupeKey]) continue;
        entries[item.dedupeKey] = nowMs;
        changed = true;
        await self.registration.showNotification(item.title, {
          body: item.body,
          icon: item.icon || defaultIcon,
          badge: defaultIcon,
          tag: item.tag,
          renotify: true,
          requireInteraction: false,
          silent: !state.prefs.somAtivo,
          vibrate: [160, 80, 160],
          data: {
            url: scopeUrl(''),
            tab: item.tab || 'horarios',
            subTab: '',
            entityId: item.entityId || '',
            categoria: item.categoria || 'MUDANCA_TEMPO'
          },
          actions: [
            { action: 'abrir', title: 'Abrir Horário' },
            { action: 'dispensar', title: 'Dispensar' }
          ]
        });
      }
    }

    if (changed) {
      await writeReminderRecord({ id: 'fired_keys', entries });
    }
  } catch {}
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
        .then(() => checkAndDispatchDueReminders())
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
} else {
  self.addEventListener('activate', (event) => {
    event.waitUntil(checkAndDispatchDueReminders());
  });
}

// Verificação periódica em segundo plano (Periodic Background Sync API)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sge-check-reminders') {
    event.waitUntil(checkAndDispatchDueReminders());
  }
});

// Background Sync fallback ao restabelecer rede / ciclo do sistema
self.addEventListener('sync', (event) => {
  if (event.tag === 'sge-check-reminders') {
    event.waitUntil(checkAndDispatchDueReminders());
  }
});

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

  event.waitUntil(
    Promise.allSettled([
      self.registration.showNotification(title, options),
      checkAndDispatchDueReminders()
    ])
  );
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

  if (payload.type === 'SGE_SYNC_REMINDER_STATE' && payload.state) {
    event.waitUntil(
      writeReminderRecord({ ...payload.state, id: 'schedule_state' }).then(() =>
        checkAndDispatchDueReminders()
      )
    );
  }

  if (payload.type === 'SGE_CHECK_REMINDERS_NOW') {
    event.waitUntil(checkAndDispatchDueReminders());
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
