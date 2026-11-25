import { registerSW } from 'virtual:pwa-register';
import { periodicBackupService } from './periodicBackupService';
import { firebaseSyncEngine } from './firebaseSyncEngine';

export interface AppUpdateState {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  offlineReady: boolean;
  updatingNow: boolean;
  lastCheckedAt: string | null;
  checkSource: 'sw' | 'version_json' | null;
}

const RELOAD_GUARD_KEY = 'sge_last_update_reload_ts';
const DISMISSED_VERSION_KEY = 'sge_update_dismissed_version';

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
    checkSource: null
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
            this.executarReloadSeguro();
          } else if (e.data?.type === 'SGE_UPDATE_FOUND' && e.data.version) {
            this.setState({
              updateAvailable: true,
              latestVersion: e.data.version,
              checkSource: e.data.source || 'version_json'
            });
          }
        };
      } catch {}
    }

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

    // Verificação periódica + foco + reconexão (indispensável para Safari/iOS e Firefox)
    setTimeout(() => {
      this.verificarAtualizacaoAgora().catch(() => {});
    }, 4500);

    setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        this.verificarAtualizacaoAgora().catch(() => {});
      }
    }, 5 * 60 * 1000);

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
      checkSource: source
    });
    try {
      this.broadcastChannel?.postMessage({ type: 'SGE_UPDATE_FOUND', version, source });
    } catch {}
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

    // 2. Verificar manifesto version.json sem cache (compatível com Safari, iOS PWA, Firefox e Chrome)
    try {
      const versionUrl = new URL(`./version.json?t=${Date.now()}`, document.baseURI).href;
      const resp = await fetch(versionUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });
      if (resp.ok) {
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
      }
    } catch {}

    this.setState({ lastCheckedAt: nowIso });
    return { hasUpdate: hasUpdate || this.state.updateAvailable, state: this.getState() };
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
    this.setState({ updatingNow: true });

    try {
      // 1. Snapshot de segurança em IndexedDB antes de recarregar
      await periodicBackupService
        .criarSnapshotAgora('pre_atualizacao', 'Salvaguarda automática antes de atualizar a versão do sistema')
        .catch(() => {});

      // 2. Escoar fila offline pendente para a nuvem se houver internet
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await Promise.race([
          firebaseSyncEngine.processarPendenciasOffline().catch(() => {}),
          new Promise<void>((r) => setTimeout(r, 3500))
        ]);
      }

      // 3. Limpar apenas caches estáticos do App-Shell (NUNCA IndexedDB nem localStorage!)
      if (typeof caches !== 'undefined') {
        try {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => !k.includes('fonts'))
              .map((k) => caches.delete(k))
          );
        } catch {}
      }

      // 4. Ativar SW em espera (skipWaiting) ou updateSW
      if (this.swRegistration?.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      if (this.updateSWFn) {
        try {
          await Promise.race([
            this.updateSWFn(true),
            new Promise<void>((r) => setTimeout(r, 2000))
          ]);
        } catch {}
      }

      try {
        this.broadcastChannel?.postMessage({ type: 'SGE_RELOAD_AFTER_UPDATE' });
      } catch {}
    } finally {
      this.executarReloadSeguro();
    }
  }
}

export const appUpdateService = new AppUpdateService();
