/**
 * SGE-NG Angola - Motor de Persistência Offline Blindado (IndexedDB + LocalStorage Dual Mirror)
 * Garante 100% de disponibilidade contínua sem internet, prevenção absoluta de perda de dados,
 * diário de mutações atómicas (Offline Journal), fila coalescida de sincronização e espelhamento em IndexedDB.
 */

export interface OfflineJournalEntry {
  id: string;
  timestamp: string;
  entidade: string;
  operacao: 'CRIAR' | 'ATUALIZAR' | 'ELIMINAR' | 'IMPORTAR' | 'RESTAURO';
  usuario: string;
  autorRole?: string;
  detalhes: string;
  sucesso: boolean;
}

export interface StorageHealthInfo {
  isOnline: boolean;
  quotaBytes: number;
  usedBytes: number;
  usedPercentage: number;
  indexedDbDisponivel: boolean;
  localStorageDisponivel: boolean;
  totalRegistosNoDiario: number;
  ultimoSnapshotHora: string | null;
}

export interface PendingSyncItem {
  id: string;
  entidade: string;
  docId?: string;
  acao: string; // 'CRIAR' | 'ATUALIZAR' | 'ELIMINAR'
  timestamp: string;
  descricao: string;
  dados?: any;
  extraColecoes?: string[];
  autorRole?: string;
}

const DB_NAME = 'SGE_NG_ANGOLA_OFFLINE_DB';
const DB_VERSION = 1;
const STORE_ENTITIES = 'entities';
const STORE_JOURNAL = 'journal';
const STORE_SNAPSHOTS = 'snapshots';

class OfflineStorageEngine {
  private db: IDBDatabase | null = null;
  private dbReadyPromise: Promise<boolean>;
  private broadcastChannel: BroadcastChannel | null = null;
  private journalListeners: Array<(journal: OfflineJournalEntry[]) => void> = [];
  private mirrorQueue = new Set<string>();
  private mirrorTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.dbReadyPromise = this.initIndexedDB();
    this.initBroadcastChannel();
    this.setupSafetyHooks();
  }

  private async initIndexedDB(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_ENTITIES)) {
            db.createObjectStore(STORE_ENTITIES, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_JOURNAL)) {
            const jStore = db.createObjectStore(STORE_JOURNAL, { keyPath: 'id' });
            jStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
            db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          // Espelhar após inicializar sem bloquear o thread principal
          setTimeout(() => this.syncLocalStorageToIndexedDB(), 500);
          resolve(true);
        };

        request.onerror = (e) => {
          console.error('[SGE Offline] Erro ao inicializar IndexedDB:', e);
          resolve(false);
        };
      } catch (err) {
        console.error('[SGE Offline] Exceção ao abrir IndexedDB:', err);
        resolve(false);
      }
    });
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('sge_offline_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STORAGE_MUTATED') {
            window.dispatchEvent(new CustomEvent('sge_remote_mutation', { detail: event.data }));
          }
        };
      } catch (e) {
        console.warn('[SGE Offline] BroadcastChannel indisponível:', e);
      }
    }
  }

  private setupSafetyHooks() {
    if (typeof window === 'undefined') return;

    // Espelhamento automático em tempo real de qualquer chave escrita no localStorage para IndexedDB
    window.addEventListener('sge_local_write', (event: any) => {
      const key = event?.detail?.key;
      if (typeof key === 'string' && key.startsWith('sge_')) {
        this.agendarEspelhamentoChave(key);
      }
    });

    // Proteção contra perda acidental durante navegação
    window.addEventListener('beforeunload', () => {
      this.criarSnapshotEmergencia('Auto-Save pré-fechamento do separador');
    });

    // Snapshots automáticos periódicos em segundo plano (a cada 5 minutos)
    setInterval(() => {
      this.criarSnapshotEmergencia('Snapshot de rotina em segundo plano');
    }, 300000);
  }

  private agendarEspelhamentoChave(key: string) {
    this.mirrorQueue.add(key);
    if (this.mirrorTimer) return;
    this.mirrorTimer = setTimeout(() => {
      this.mirrorTimer = null;
      if (!this.db) {
        this.mirrorQueue.clear();
        return;
      }
      const keys = Array.from(this.mirrorQueue);
      this.mirrorQueue.clear();
      try {
        const tx = this.db.transaction(STORE_ENTITIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTITIES);
        const now = new Date().toISOString();
        for (const k of keys) {
          const val = localStorage.getItem(k);
          if (val !== null) {
            store.put({ key: k, value: val, updatedAt: now });
          } else {
            store.delete(k);
          }
        }
      } catch {
        // Ignora erro transitório de IndexedDB
      }
    }, 300);
  }

  // Copia as entidades do localStorage para o IndexedDB numa única transação rápida
  private async syncLocalStorageToIndexedDB() {
    if (!this.db) return;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sge_'));
      if (keys.length === 0) return;
      const tx = this.db.transaction(STORE_ENTITIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTITIES);
      const now = new Date().toISOString();
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val) {
          store.put({ key: k, value: val, updatedAt: now });
        }
      }
    } catch (e) {
      console.warn('[SGE Offline] Erro ao espelhar localStorage para IndexedDB:', e);
    }
  }

  private gravarNoIndexedDB(storeName: string, item: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false);
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Registar Mutações no Diário de Bordo Offline (Journal)
   */
  public registarMutacao(
    entidade: string,
    operacao: 'CRIAR' | 'ATUALIZAR' | 'ELIMINAR' | 'IMPORTAR' | 'RESTAURO',
    detalhes: string,
    usuario: string = 'Utilizador Local',
    autorRole?: string
  ) {
    let resolvedRole = autorRole;
    if (!resolvedRole && typeof localStorage !== 'undefined') {
      try {
        const uRaw = localStorage.getItem('sge_current_user');
        if (uRaw) {
          const parsed = JSON.parse(uRaw);
          if (parsed?.role) resolvedRole = parsed.role;
        }
      } catch {
        // ignore
      }
    }

    const entry: OfflineJournalEntry = {
      id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      entidade,
      operacao,
      usuario,
      autorRole: resolvedRole,
      detalhes,
      sucesso: true
    };

    try {
      const existingStr = localStorage.getItem('sge_offline_journal');
      let list: OfflineJournalEntry[] = [];
      if (existingStr && existingStr !== 'undefined' && existingStr !== 'null') {
        try {
          const parsed = JSON.parse(existingStr);
          if (Array.isArray(parsed)) list = parsed;
        } catch {
          list = [];
        }
      }
      list.unshift(entry);
      const trimmed = list.slice(0, 100);
      localStorage.setItem('sge_offline_journal', JSON.stringify(trimmed));
      localStorage.setItem('sge_last_mutation_time', entry.timestamp);

      if (this.db) {
        this.gravarNoIndexedDB(STORE_JOURNAL, entry);
      }

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'STORAGE_MUTATED',
          entry
        });
      }

      this.journalListeners.forEach(l => l(trimmed));
    } catch (e) {
      console.error('[SGE Offline] Falha ao registar mutação no diário:', e);
    }
  }

  public isEntradaDoAdminGeral(entry: OfflineJournalEntry): boolean {
    if (!entry) return false;
    if (entry.autorRole === 'AdminGeral') return true;
    const usr = (entry.usuario || '').toLowerCase();
    const det = (entry.detalhes || '').toLowerCase();
    return (
      usr.includes('administrador geral') ||
      det.includes('[apoio técnico autorizado') ||
      det.includes('administrador geral') ||
      det.includes('admin geral') ||
      det.includes('inicialização oficial do sistema') ||
      det.includes('criação de escola') ||
      det.includes('suspensão de escola') ||
      det.includes('reativação de escola') ||
      det.includes('eliminação total de escola') ||
      det.includes('credenciais do diretor geral')
    );
  }

  /**
   * Obter Diário de Mutações Offline Recentes
   */
  public obterDiario(): OfflineJournalEntry[] {
    try {
      const raw = localStorage.getItem('sge_offline_journal');
      if (!raw || raw === 'undefined' || raw === 'null') return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public obterDiarioVisivel(isAdminGeral: boolean): OfflineJournalEntry[] {
    const list = this.obterDiario();
    if (isAdminGeral) return list;
    return list.filter(e => !this.isEntradaDoAdminGeral(e));
  }

  public subscreverDiario(listener: (journal: OfflineJournalEntry[]) => void): () => void {
    this.journalListeners.push(listener);
    return () => {
      this.journalListeners = this.journalListeners.filter(l => l !== listener);
    };
  }

  /**
   * Criação de Ponto de Restauro / Snapshot Seguro
   */
  public criarSnapshotEmergencia(motivo: string = 'Snapshot manual'): { sucesso: boolean; id: string; timestamp: string } {
    const timestamp = new Date().toISOString();
    const id = `snap-${Date.now()}`;
    try {
      const allSGEKeys = Object.keys(localStorage).filter(k => k.startsWith('sge_') && k !== 'sge_snapshots_meta');
      const dump: Record<string, string> = {};
      for (const k of allSGEKeys) {
        const val = localStorage.getItem(k);
        if (val) dump[k] = val;
      }

      const snapshotObject = {
        id,
        timestamp,
        motivo,
        data: dump,
        totalChaves: allSGEKeys.length
      };

      if (this.db) {
        this.gravarNoIndexedDB(STORE_SNAPSHOTS, snapshotObject);
      }

      const metaStr = localStorage.getItem('sge_snapshots_meta') || '[]';
      const metas = JSON.parse(metaStr);
      metas.unshift({ id, timestamp, motivo, totalChaves: allSGEKeys.length });
      localStorage.setItem('sge_snapshots_meta', JSON.stringify(metas.slice(0, 10)));
      localStorage.setItem('sge_last_snapshot_time', timestamp);

      return { sucesso: true, id, timestamp };
    } catch (e) {
      console.error('[SGE Offline] Falha ao criar snapshot:', e);
      return { sucesso: false, id, timestamp };
    }
  }

  /**
   * Diagnóstico Completo de Armazenamento e Quota
   */
  public async obterDiagnostico(): Promise<StorageHealthInfo> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let quotaBytes = 50 * 1024 * 1024;
    let usedBytes = 0;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        quotaBytes = estimate.quota || quotaBytes;
        usedBytes = estimate.usage || 0;
      } catch {}
    }

    if (usedBytes === 0) {
      let lsChars = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const val = localStorage.getItem(key) || '';
        lsChars += key.length + val.length;
      }
      usedBytes = lsChars * 2;
    }

    const usedPercentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 1000) / 10);
    const ultimoSnapshotHora = localStorage.getItem('sge_last_snapshot_time');
    const journal = this.obterDiario();

    return {
      isOnline,
      quotaBytes,
      usedBytes,
      usedPercentage,
      indexedDbDisponivel: !!this.db,
      localStorageDisponivel: typeof window !== 'undefined' && !!window.localStorage,
      totalRegistosNoDiario: journal.length,
      ultimoSnapshotHora
    };
  }

  /**
   * Baixar Arquivo Imediato de Emergência (Exportação Offline Instantânea)
   */
  public descarregarBackupOfflineEmergencia() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let isNonAdminSession = false;
    let activeSchoolId = '';
    try {
      if (localStorage.getItem('sge_authenticated') === 'true') {
        const uRaw = localStorage.getItem('sge_current_user');
        const u = uRaw ? JSON.parse(uRaw) : null;
        if (u && u.role !== 'AdminGeral') {
          isNonAdminSession = true;
          activeSchoolId = localStorage.getItem('sge_active_escola_id') || u.escolaId || '';
        }
      }
    } catch {
      // ignore
    }

    const dump: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sge_')) {
        if (isNonAdminSession && (k === 'sge_sec_tentativas_falhadas' || k === 'sge_sec_alertas_dashboard' || k === 'sge_alertas_seguranca' || k === 'sge_setup_master_lock' || k === 'sge_setup_inicial_concluido')) {
          continue;
        }
        try {
          let parsed = JSON.parse(localStorage.getItem(k) || '');
          if (isNonAdminSession) {
            if (k === 'sge_funcionarios' && Array.isArray(parsed)) {
              parsed = parsed.filter((f: any) => f && f.role !== 'AdminGeral' && f.id !== 'admin-geral' && (!activeSchoolId || f.escolaId === activeSchoolId));
            } else if (k === 'sge_auditoria' && Array.isArray(parsed)) {
              parsed = parsed.filter((l: any) => l && !l.origemAdminGeral && l.papel !== 'AdminGeral' && !(l.papel || '').includes('AdminGeral') && !(l.detalhe || '').includes('[APOIO TÉCNICO AUTORIZADO'));
            } else if (k === 'sge_mensagens' && Array.isArray(parsed)) {
              parsed = parsed.filter((m: any) => m && m.remetentePapel !== 'AdminGeral' && m.destinatarioId !== 'admin-geral');
            } else if (k === 'sge_sessoes_ativas' && Array.isArray(parsed)) {
              parsed = parsed.filter((s: any) => s && s.userRole !== 'AdminGeral' && s.role !== 'AdminGeral');
            } else if (k === 'sge_offline_journal' && Array.isArray(parsed)) {
              parsed = parsed.filter((e: any) => !this.isEntradaDoAdminGeral(e));
            } else if (k === 'sge_escolas' && Array.isArray(parsed)) {
              parsed = parsed
                .filter((esc: any) => !activeSchoolId || esc.id === activeSchoolId)
                .map((esc: any) => {
                  const clone = { ...esc };
                  delete clone.sessaoApoioTecnicoAtiva;
                  return clone;
                });
            } else if (k === 'sge_configuracao_sistema' && parsed && typeof parsed === 'object') {
              parsed = { nomeSistema: parsed.nomeSistema, ministerioNome: parsed.ministerioNome };
            }
          }
          dump[k] = parsed;
        } catch {
          dump[k] = localStorage.getItem(k);
        }
      }
    }

    const json = JSON.stringify({
      software: 'SGE-NG Angola',
      tipo: 'Backup Offline de Emergência - Anti-Perda de Dados',
      geradoEm: new Date().toISOString(),
      dados: dump
    }, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGE_NG_Emergencia_Offline_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.registarMutacao('Backup', 'IMPORTAR', 'Cópia de segurança offline descarregada pelo utilizador.');
  }

  /**
   * Sincronização e validação de integridade do storage offline
   */
  public async sincronizar(): Promise<boolean> {
    await this.dbReadyPromise;
    await this.syncLocalStorageToIndexedDB();
    this.criarSnapshotEmergencia('Sincronização de integridade offline');
    return true;
  }

  /**
   * Gestão de Fila de Informações Pendentes para Sincronizar com o Firebase (com coalescência por coleção + docId)
   */
  public obterPendencias(): PendingSyncItem[] {
    try {
      const raw = localStorage.getItem('sge_pending_sync_queue');
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  public obterPendenciasVisiveis(isAdminGeral: boolean): PendingSyncItem[] {
    const list = this.obterPendencias();
    if (isAdminGeral) return list;
    return list.filter(p => {
      if (p.autorRole === 'AdminGeral') return false;
      if (p.dados && (p.dados.role === 'AdminGeral' || p.dados.origemAdminGeral === true || p.dados.papel === 'AdminGeral')) return false;
      const desc = (p.descricao || '').toLowerCase();
      if (desc.includes('administrador geral') || desc.includes('admin geral') || desc.includes('apoio técnico')) return false;
      return true;
    });
  }

  public obterTotalPendentes(): number {
    return this.obterPendencias().length;
  }

  public adicionarPendencia(
    entidade: string,
    acao: string,
    descricao: string,
    dados?: any,
    docId?: string,
    extraColecoes?: string[],
    autorRole?: string
  ): void {
    try {
      const resolvedDocId = docId || dados?.id;
      const entidadeNorm = entidade.toLowerCase();
      let list = this.obterPendencias();

      let resolvedRole = autorRole;
      if (!resolvedRole && typeof localStorage !== 'undefined') {
        try {
          const uRaw = localStorage.getItem('sge_current_user');
          if (uRaw) {
            const parsed = JSON.parse(uRaw);
            if (parsed?.role) resolvedRole = parsed.role;
          }
        } catch {
          // ignore
        }
      }

      // Coalescer: remover pendência anterior para a mesma entidade e docId para manter fila enxuta e ordem final correta
      if (resolvedDocId) {
        list = list.filter(p => !(p.entidade.toLowerCase() === entidadeNorm && (p.docId || p.dados?.id) === resolvedDocId));
      }

      const item: PendingSyncItem = {
        id: `pend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entidade: entidadeNorm,
        docId: resolvedDocId,
        acao,
        timestamp: new Date().toISOString(),
        descricao,
        dados,
        extraColecoes,
        autorRole: resolvedRole
      };
      list.push(item);
      localStorage.setItem('sge_pending_sync_queue', JSON.stringify(list));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_pending_sync_changed', { detail: { total: list.length, item } }));
      }
    } catch (e) {
      console.warn('[SGE Offline] Erro ao adicionar pendência de sincronização:', e);
    }
  }

  public removerPendenciaPorDocumento(entidade: string, docId: string): void {
    try {
      const entidadeNorm = entidade.toLowerCase();
      const atual = this.obterPendencias();
      const filtrada = atual.filter(p => !(p.entidade.toLowerCase() === entidadeNorm && (p.docId || p.dados?.id) === docId));
      if (filtrada.length !== atual.length) {
        localStorage.setItem('sge_pending_sync_queue', JSON.stringify(filtrada));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sge_pending_sync_changed', { detail: { total: filtrada.length } }));
        }
      }
    } catch {}
  }

  public removerPendencia(id: string): void {
    try {
      const list = this.obterPendencias().filter(p => p.id !== id);
      localStorage.setItem('sge_pending_sync_queue', JSON.stringify(list));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_pending_sync_changed', { detail: { total: list.length } }));
      }
    } catch {}
  }

  public limparPendencias(): void {
    try {
      localStorage.removeItem('sge_pending_sync_queue');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_pending_sync_changed', { detail: { total: 0 } }));
      }
    } catch {}
  }
}

export const offlineStorage = new OfflineStorageEngine();
