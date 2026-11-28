import { registerSW } from 'virtual:pwa-register';
import { periodicBackupService } from './periodicBackupService';
import { firebaseSyncEngine } from './firebaseSyncEngine';
import { offlineStorage } from './offlineStorage';

export interface AppUpdateState {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  offlineReady: boolean;
  updatingNow: boolean;
  lastCheckedAt: string | null;
  checkSource: 'sw' | 'version_json' | null;
  offlineNotice?: string | null;
}

const RELOAD_GUARD_KEY = 'sge_last_update_reload_ts';
const DISMISSED_VERSION_KEY = 'sge_update_dismissed_version';
const STORAGE_BROADCAST_KEY = 'sge_update_broadcast_signal';

function getCurrentBuildVersion(): string {
  try {
    return typeof __SGE_APP_VERSION__ !== 'undefined' ? __SGE_APP_VERSION__ : 'dev-local';
  } catch {
    return 'dev-local';
  }
}

class AppUpdateService {
  private initialized = false;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners = new Set<(state: AppUpdateState) => void>();
  private state: AppUpdateState = {
    currentVersion: getCurrentBuildVersion(),
    latestVersion: null,
    updateAvailable: false,
    offlineReady: false,
    updatingNow: false,
    lastCheckedAt: null,
    checkSource: null,
    offlineNotice: null
  };

  public getState(): AppUpdateState {
    return { ...this.state };
  }

  public subscrever(cb: (state: AppUpdateState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_app_update_changed', { detail: snapshot }));
    }
  }

  private setState(partial: Partial<AppUpdateState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  public isUpdateDismissed(): boolean {
    try {
      if (typeof sessionStorage === 'undefined') return false;
      const v = sessionStorage.getItem(DISMISSED_VERSION_KEY);
      return Boolean(v && this.state.latestVersion && v === this.state.latestVersion);
    } catch {
      return false;
    }
  }

  public dispensarBannerTemporariamente(): void {
    try {
      if (typeof sessionStorage !== 'undefined' && this.state.latestVersion) {
        sessionStorage.setItem(DISMISSED_VERSION_KEY, this.state.latestVersion);
      }
    } catch {}
    this.emit();
  }

  public inicializar(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

    // Canal entre separadores para sincronizar atualizações em Chrome, Firefox e Safari
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('sge_app_update_channel');
        this.broadcastChannel.onmessage = (e) => {
          if (e.data?.type === 'SGE_RELOAD_AFTER_UPDATE') {
            this.verificarConectividadeReal().then((ok) => {
              if (ok) this.executarReloadSeguro();
            });
          } else if (e.data?.type === 'SGE_UPDATE_FOUND' && e.data.version) {
            this.setState({
              updateAvailable: true,
              latestVersion: e.data.version,
              checkSource: e.data.source || 'version_json',
              offlineNotice: null
            });
          }
        };
      } catch {}
    }

    // Fallback para browsers Safari/iOS mais antigos via localStorage storage event
    window.addEventListener('storage', (ev) => {
      if (ev.key !== STORAGE_BROADCAST_KEY || !ev.newValue) return;
      try {
        const msg = JSON.parse(ev.newValue);
        if (msg?.type === 'SGE_RELOAD_AFTER_UPDATE') {
          this.verificarConectividadeReal().then((ok) => {
            if (ok) this.executarReloadSeguro();
          });
        } else if (msg?.type === 'SGE_UPDATE_FOUND' && msg.version) {
          this.setState({
            updateAvailable: true,
            latestVersion: msg.version,
            checkSource: msg.source || 'version_json',
            offlineNotice: null
          });
        }
      } catch {}
    });

    if ('serviceWorker' in navigator) {
      try {
        if (isDev) {
          const swUrl = new URL('./sw-notifications.js', document.baseURI).href;
          navigator.serviceWorker
            .register(swUrl)
            .then((reg) => {
              this.vincularRegistration(reg);
            })
            .catch(() => {});
        } else {
          this.updateSWFn = registerSW({
            immediate: true,
            onNeedRefresh: () => {
              this.marcarAtualizacaoDisponivel(this.state.latestVersion || 'Nova versão SW', 'sw');
            },
            onOfflineReady: () => {
              this.setState({ offlineReady: true });
            },
            onRegisteredSW: (_swUrl, reg) => {
              if (reg) {
                this.vincularRegistration(reg);
              }
            },
            onRegisterError: () => {}
          });
        }

        navigator.serviceWorker.ready
          .then((reg) => {
            this.vincularRegistration(reg);
          })
          .catch(() => {});

        // Quando um novo SW assume controlo (Chrome/Edge/Firefox/Safari), recarregar de forma segura
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          if (this.state.updatingNow) {
            this.executarReloadSeguro();
          }
        });
      } catch {}
    }

    // Verificação periódica + foco + reconexão (indispensável para Safari/iOS e Firefox e atualização rápida em todos os dispositivos online)
    setTimeout(() => {
      this.verificarAtualizacaoAgora().catch(() => {});
    }, 1500);

    setInterval(() => {
      if ((typeof navigator === 'undefined' || navigator.onLine) && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
        this.verificarAtualizacaoAgora().catch(() => {});
      }
    }, 90 * 1000);

    window.addEventListener('online', () => {
      this.verificarAtualizacaoAgora().catch(() => {});
    });

    window.addEventListener('focus', () => {
      this.verificarAtualizacaoAgora().catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.verificarAtualizacaoAgora().catch(() => {});
      }
    });
  }

  private vincularRegistration(reg: ServiceWorkerRegistration) {
    this.swRegistration = reg;

    if (reg.waiting) {
      this.marcarAtualizacaoDisponivel(this.state.latestVersion || 'Nova versão disponível', 'sw');
    }

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          this.marcarAtualizacaoDisponivel(this.state.latestVersion || 'Nova versão disponível', 'sw');
        }
      });
    });
  }

  private marcarAtualizacaoDisponivel(version: string, source: 'sw' | 'version_json') {
    if (this.state.updateAvailable && this.state.latestVersion === version) return;
    this.setState({
      updateAvailable: true,
      latestVersion: version,
      checkSource: source,
      offlineNotice: null
    });
    const payload = { type: 'SGE_UPDATE_FOUND', version, source, ts: Date.now() };
    try {
      this.broadcastChannel?.postMessage(payload);
    } catch {}
    try {
      localStorage.setItem(STORAGE_BROADCAST_KEY, JSON.stringify(payload));
    } catch {}
  }

  private obterCandidatosVersionUrl(): string[] {
    const ts = Date.now();
    const candidatos = new Set<string>();
    try {
      candidatos.add(new URL(`./version.json?t=${ts}`, document.baseURI).href);
    } catch {}
    try {
      const path = window.location.pathname || '/';
      if (path.includes('/docs/documentos')) {
        candidatos.add(`${window.location.origin}/docs/version.json?t=${ts}`);
      }
      if (path.startsWith('/docs')) {
        candidatos.add(`${window.location.origin}/docs/version.json?t=${ts}`);
      }
      candidatos.add(`${window.location.origin}/version.json?t=${ts}`);
    } catch {}
    return Array.from(candidatos);
  }

  public getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }

  public async verificarAtualizacaoAgora(): Promise<{ hasUpdate: boolean; state: AppUpdateState }> {
    const nowIso = new Date().toISOString();
    let hasUpdate = false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setState({ lastCheckedAt: nowIso });
      return { hasUpdate: this.state.updateAvailable, state: this.getState() };
    }

    // 1. Verificar Service Worker diretamente
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = this.swRegistration || (await navigator.serviceWorker.getRegistration().catch(() => null));
        if (reg) {
          this.swRegistration = reg;
          await reg.update().catch(() => {});
          if (reg.waiting) {
            hasUpdate = true;
            this.marcarAtualizacaoDisponivel(this.state.latestVersion || 'Nova versão SW', 'sw');
          }
        }
      }
    } catch {}

    // 2. Verificar manifesto version.json sem cache (compatível com raiz, /docs e /documentos)
    try {
      const candidatos = this.obterCandidatosVersionUrl();
      for (const versionUrl of candidatos) {
        try {
          const resp = await fetch(versionUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache'
            }
          });
          if (!resp.ok) continue;
          const contentType = resp.headers.get('content-type') || '';
          if (!contentType.includes('json') && !contentType.includes('text/plain')) continue;
          const data = await resp.json().catch(() => null);
          const serverVersion = typeof data?.version === 'string' ? data.version.trim() : '';
          const localVersion = this.state.currentVersion;
          if (
            serverVersion &&
            localVersion &&
            localVersion !== 'dev-local' &&
            serverVersion !== localVersion
          ) {
            hasUpdate = true;
            this.marcarAtualizacaoDisponivel(serverVersion, 'version_json');
          }
          if (serverVersion) break;
        } catch {}
      }
    } catch {}

    this.setState({ lastCheckedAt: nowIso });
    return { hasUpdate: hasUpdate || this.state.updateAvailable, state: this.getState() };
  }

  private async verificarConectividadeReal(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    const candidatos = this.obterCandidatosVersionUrl();
    for (const url of candidatos) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;
      try {
        const resp = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          signal: controller?.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          }
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (resp.ok) return true;
      } catch {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
    return false;
  }

  private executarReloadSeguro() {
    if (typeof window === 'undefined') return;
    try {
      const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
      if (Date.now() - lastReload < 10000) {
        return;
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {}
    window.location.reload();
  }

  public async aplicarAtualizacaoESincronizar(): Promise<void> {
    if (this.state.updatingNow) return;
    this.setState({ updatingNow: true, offlineNotice: null });

    let podeRecarregar = false;

    try {
      // 0. Garantir espelhamento imediato para IndexedDB antes de qualquer operação
      offlineStorage.flushEspelhoSync();

      // 1. Snapshot de segurança em IndexedDB antes de atualizar
      await periodicBackupService
        .criarSnapshotAgora('pre_atualizacao', 'Salvaguarda automática antes de atualizar a versão do sistema')
        .catch(() => {});

      // 2. Verificar conectividade real antes de limpar caches ou reiniciar (evita travar utilizadores sem internet)
      const online = await this.verificarConectividadeReal();
      if (!online) {
        this.setState({
          updatingNow: false,
          offlineNotice:
            'Sem ligação à internet neste momento. Pode continuar a trabalhar normalmente offline; a atualização será aplicada quando estiver online.'
        });
        return;
      }

      // 3. Escoar fila offline pendente para a nuvem com internet ativa
      await Promise.race([
        firebaseSyncEngine.processarPendenciasOffline().catch(() => {}),
        new Promise<void>((r) => setTimeout(r, 3500))
      ]);

      // 4. Ativar SW em espera (skipWaiting) ou updateSW — mantendo o precache íntegro via Workbox cleanupOutdatedCaches
      if (this.swRegistration?.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      if (this.updateSWFn) {
        try {
          await Promise.race([
            this.updateSWFn(true),
            new Promise<void>((r) => setTimeout(r, 2500))
          ]);
        } catch {}
      }

      const reloadPayload = { type: 'SGE_RELOAD_AFTER_UPDATE', ts: Date.now() };
      try {
        this.broadcastChannel?.postMessage(reloadPayload);
      } catch {}
      try {
        localStorage.setItem(STORAGE_BROADCAST_KEY, JSON.stringify(reloadPayload));
      } catch {}

      podeRecarregar = true;
    } finally {
      if (podeRecarregar) {
        this.executarReloadSeguro();
      } else {
        this.setState({ updatingNow: false });
      }
    }
  }
}

export const appUpdateService = new AppUpdateService();
