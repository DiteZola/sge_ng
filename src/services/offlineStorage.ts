/**
 * SGE-NG Angola - Motor de Persistência Offline Blindado (IndexedDB + LocalStorage Dual Mirror)
 * Garante 100% de disponibilidade contínua sem internet, prevenção absoluta de perda de dados,
 * armazenamento dedicado de fotografias (Base64 + Blob) em IndexedDB, diário de mutações atómicas
 * (Offline Journal), fila coalescida de sincronização e hidratação automática no arranque.
 */
import { comprimirImagemBase64 } from '../utils/imageOptimizer';
import { invalidateLocalCache, setCachedLocalEntry } from './localCache';

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
  isStoragePersisted: boolean;
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

export interface StoredMediaEntry {
  id: string; // `${entityType}:${entityId}`
  entityType: 'funcionario' | 'aluno' | 'escola' | 'config';
  entityId: string;
  base64: string;
  blob?: Blob | null;
  mimeType: string;
  updatedAt: string;
}

export interface StoredPdfEntry {
  id: string; // docId na biblioteca
  nome: string;
  mimeType: string;
  tamanhoBytes: number;
  base64: string;
  blob?: Blob | null;
  updatedAt: string;
}

const DB_NAME = 'SGE_NG_ANGOLA_OFFLINE_DB';
const DB_VERSION = 4;
const STORE_ENTITIES = 'entities';
const STORE_JOURNAL = 'journal';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_MEDIA = 'media_blobs';
const STORE_FUNCIONARIOS = 'funcionarios';
const STORE_PDFS = 'biblioteca_pdfs';
const STORE_PERIODIC_BACKUPS = 'backups_periodicos';

export function base64ToBlob(dataUrl: string, defaultMime: string = 'image/jpeg'): Blob | null {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const trimmed = dataUrl.trim();
    if (!trimmed) return null;

    let mime = defaultMime;
    let base64Body = '';

    if (trimmed.startsWith('data:')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx < 0) return null;
      const header = trimmed.slice(0, commaIdx);
      base64Body = trimmed.slice(commaIdx + 1);
      const mimeMatch = header.match(/data:([^;]+);base64/i);
      if (mimeMatch && mimeMatch[1]) {
        mime = mimeMatch[1].trim();
      }
    } else {
      base64Body = trimmed;
    }

    const cleaned = base64Body.replace(/\s+/g, '');
    if (!cleaned) return null;
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    } catch {
      resolve('');
    }
  });
}

class OfflineStorageEngine {
  private db: IDBDatabase | null = null;
  private dbReadyPromise: Promise<boolean>;
  private broadcastChannel: BroadcastChannel | null = null;
  private journalListeners: Array<(journal: OfflineJournalEntry[]) => void> = [];
  private mirrorQueue = new Set<string>();
  private mirrorTimer: ReturnType<typeof setTimeout> | null = null;
  private mediaCache = new Map<string, string>();
  private hydrationPromise: Promise<boolean> | null = null;
  private pendingQueueMemory: PendingSyncItem[] | null = null;

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
          if (!db.objectStoreNames.contains(STORE_MEDIA)) {
            const mStore = db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
            mStore.createIndex('entityType', 'entityType', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_FUNCIONARIOS)) {
            db.createObjectStore(STORE_FUNCIONARIOS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_PDFS)) {
            db.createObjectStore(STORE_PDFS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_PERIODIC_BACKUPS)) {
            const pbStore = db.createObjectStore(STORE_PERIODIC_BACKUPS, { keyPath: 'id' });
            pbStore.createIndex('criadoEm', 'criadoEm', { unique: false });
            pbStore.createIndex('escolaId', 'escolaId', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          // Solicitar persistência nativa e hidratar dados críticos primeiro; espelhar localStorage em tempo ocioso
          setTimeout(() => {
            this.solicitarPersistenciaNativa().catch(() => {});
            this.hidratarArmazenamentoDoIndexedDB().finally(() => {
              const agendarEspelhamento = () => {
                this.syncLocalStorageToIndexedDB();
              };
              if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
                (window as any).requestIdleCallback(agendarEspelhamento, { timeout: 3000 });
              } else {
                setTimeout(agendarEspelhamento, 2200);
              }
            });
          }, 30);
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
      this.flushMirrorQueueSync();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushMirrorQueueSync();
      }
    });

    // Snapshots automáticos periódicos em segundo plano (a cada 5 minutos)
    setInterval(() => {
      this.criarSnapshotEmergencia('Snapshot de rotina em segundo plano');
    }, 300000);
  }

  private flushMirrorQueueSync() {
    if (!this.db || this.mirrorQueue.size === 0) return;
    if (this.mirrorTimer) {
      clearTimeout(this.mirrorTimer);
      this.mirrorTimer = null;
    }
    const keys = Array.from(this.mirrorQueue);
    this.mirrorQueue.clear();
    try {
      const tx = this.db.transaction(STORE_ENTITIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTITIES);
      const tsMap = this.obterTimestampsLocalStorage();
      const now = new Date().toISOString();
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val !== null) {
          store.put({ key: k, value: val, updatedAt: tsMap[k] || now });
        }
      }
    } catch {}
  }

  private agendarEspelhamentoChave(key: string) {
    if (!key || key === 'sge_ls_timestamps') return;
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
        const tsMap = this.obterTimestampsLocalStorage();
        const now = new Date().toISOString();
        for (const k of keys) {
          const val = localStorage.getItem(k);
          if (val !== null) {
            store.put({ key: k, value: val, updatedAt: tsMap[k] || now });
          } else {
            store.delete(k);
          }
        }
      } catch {
        // Ignora erro transitório de IndexedDB
      }
    }, 300);
  }

  public obterTimestampsLocalStorage(): Record<string, string> {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem('sge_ls_timestamps');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  public marcarTimestampLocalStorage(key: string, isoTimestamp: string = new Date().toISOString()): void {
    if (!key || key === 'sge_ls_timestamps' || typeof localStorage === 'undefined') return;
    try {
      const map = this.obterTimestampsLocalStorage();
      map[key] = isoTimestamp;
      localStorage.setItem('sge_ls_timestamps', JSON.stringify(map));
    } catch {}
  }

  // Copia apenas entidades alteradas do localStorage para o IndexedDB numa única transação rápida
  private async syncLocalStorageToIndexedDB() {
    if (!this.db) return;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sge_') && k !== 'sge_ls_timestamps');
      if (keys.length === 0) return;
      const existing = await this.lerTodosDoIndexedDB<{ key: string; value?: string; updatedAt?: string }>(STORE_ENTITIES);
      const idbMap = new Map(existing.map(r => [r.key, r]));
      const lsTsMap = this.obterTimestampsLocalStorage();
      const pendentesParaGravar: Array<{ key: string; value: string; updatedAt: string }> = [];
      const now = new Date().toISOString();
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (!val) continue;
        const idbRec = idbMap.get(k);
        if (idbRec?.value === val) continue; // já idêntico no IndexedDB — evitar escrita desnecessária
        const tIdb = idbRec?.updatedAt ? Date.parse(idbRec.updatedAt) || 0 : 0;
        const tLs = lsTsMap[k] ? Date.parse(lsTsMap[k]) || 0 : 0;
        // Só sobrescreve o IndexedDB se não houver versão mais recente já guardada no IndexedDB
        if (tIdb > tLs + 500 && k !== 'sge_pending_sync_queue') continue;
        pendentesParaGravar.push({ key: k, value: val, updatedAt: lsTsMap[k] || now });
      }
      if (pendentesParaGravar.length === 0) return;
      const tx = this.db.transaction(STORE_ENTITIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTITIES);
      for (const item of pendentesParaGravar) {
        store.put(item);
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

  private eliminarDoIndexedDB(storeName: string, key: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false);
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  private lerTodosDoIndexedDB<T = any>(storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      if (!this.db || !this.db.objectStoreNames.contains(storeName)) return resolve([]);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  private lerUmDoIndexedDB<T = any>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve) => {
      if (!this.db || !this.db.objectStoreNames.contains(storeName)) return resolve(null);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public obterMidiaEmCache(entityType: StoredMediaEntry['entityType'], entityId: string): string | undefined {
    if (!entityId) return undefined;
    return this.mediaCache.get(`${entityType}:${entityId}`);
  }

  public definirMidiaEmCache(entityType: StoredMediaEntry['entityType'], entityId: string, base64: string): void {
    if (!entityId) return;
    const key = `${entityType}:${entityId}`;
    if (!base64 || base64 === '__idb_media__') {
      if (base64 === '') this.mediaCache.set(key, '');
      return;
    }
    this.mediaCache.set(key, base64);
  }

  /**
   * Converte qualquer fonte de fotografia (Blob, File, blob: URL ou Base64 pesada)
   * em Data URL Base64 portátil e otimizada para IndexedDB + Firebase (< 140KB).
   */
  public async converterFonteParaBase64Portatil(
    fonte: unknown,
    maxDim: number = 460,
    qualidade: number = 0.80
  ): Promise<string> {
    if (fonte === undefined || fonte === null) return '';

    if (typeof Blob !== 'undefined' && fonte instanceof Blob) {
      const b64 = await blobToBase64(fonte);
      if (!b64) return '';
      return comprimirImagemBase64(b64, maxDim, qualidade);
    }

    if (typeof fonte !== 'string') return '';
    const trimmed = fonte.trim();
    if (!trimmed || trimmed === '__idb_media__') return '';

    if (trimmed.startsWith('blob:')) {
      try {
        const resp = await fetch(trimmed);
        const blob = await resp.blob();
        const b64 = await blobToBase64(blob);
        if (!b64) return '';
        return comprimirImagemBase64(b64, maxDim, qualidade);
      } catch {
        return '';
      }
    }

    if (trimmed.startsWith('data:image/') || trimmed.includes(';base64,')) {
      if (trimmed.length > 130000) {
        try {
          return await comprimirImagemBase64(trimmed, maxDim, qualidade);
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    return trimmed;
  }

  /**
   * Persiste imediatamente a fotografia (Base64 + Blob binário) no IndexedDB (store media_blobs).
   */
  public async salvarMidia(
    entityType: StoredMediaEntry['entityType'],
    entityId: string,
    valor: string | Blob | null | undefined,
    updatedAt: string = new Date().toISOString()
  ): Promise<string> {
    if (!entityId) return '';
    const cacheKey = `${entityType}:${entityId}`;

    if (valor === '' || valor === null) {
      this.mediaCache.set(cacheKey, '');
      await this.dbReadyPromise;
      await this.eliminarDoIndexedDB(STORE_MEDIA, cacheKey);
      return '';
    }

    let base64 = '';
    let blob: Blob | null = null;

    if (typeof Blob !== 'undefined' && valor instanceof Blob) {
      blob = valor;
      base64 = await this.converterFonteParaBase64Portatil(valor);
      if (base64) {
        blob = base64ToBlob(base64) || valor;
      }
    } else if (typeof valor === 'string') {
      const trimmed = valor.trim();
      if (!trimmed || trimmed === '__idb_media__') return this.mediaCache.get(cacheKey) || '';
      if (trimmed.startsWith('blob:')) {
        try {
          const resp = await fetch(trimmed);
          blob = await resp.blob();
        } catch {}
        base64 = await this.converterFonteParaBase64Portatil(trimmed);
        if (base64) blob = base64ToBlob(base64) || blob;
      } else {
        base64 = await this.converterFonteParaBase64Portatil(trimmed);
        if (base64.startsWith('data:')) {
          blob = base64ToBlob(base64);
        }
      }
    }

    if (base64) {
      this.mediaCache.set(cacheKey, base64);
      await this.dbReadyPromise;
      const entry: StoredMediaEntry = {
        id: cacheKey,
        entityType,
        entityId,
        base64,
        blob,
        mimeType: blob?.type || 'image/jpeg',
        updatedAt
      };
      await this.gravarNoIndexedDB(STORE_MEDIA, entry);
    }

    return base64;
  }

  public async obterMidia(entityType: StoredMediaEntry['entityType'], entityId: string): Promise<string> {
    if (!entityId) return '';
    const cacheKey = `${entityType}:${entityId}`;
    const cached = this.mediaCache.get(cacheKey);
    if (cached !== undefined && cached !== '__idb_media__') return cached;

    await this.dbReadyPromise;
    const entry = await this.lerUmDoIndexedDB<StoredMediaEntry>(STORE_MEDIA, cacheKey);
    if (!entry) return '';
    let base64 = entry.base64 || '';
    if (!base64 && entry.blob) {
      base64 = await blobToBase64(entry.blob);
    }
    if (base64) {
      this.mediaCache.set(cacheKey, base64);
    }
    return base64;
  }

  public async gravarChaveNoIndexedDB(key: string, value: string): Promise<boolean> {
    await this.dbReadyPromise;
    return this.gravarNoIndexedDB(STORE_ENTITIES, {
      key,
      value,
      updatedAt: new Date().toISOString()
    });
  }

  public async lerChaveNoIndexedDB(key: string): Promise<string | null> {
    await this.dbReadyPromise;
    const rec = await this.lerUmDoIndexedDB<{ key: string; value: string }>(STORE_ENTITIES, key);
    return rec?.value ?? null;
  }

  public async verificarPersistenciaNativa(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persisted === 'function') {
        return await navigator.storage.persisted();
      }
    } catch {}
    return false;
  }

  public async solicitarPersistenciaNativa(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage) {
        if (typeof navigator.storage.persisted === 'function') {
          const jaPersistido = await navigator.storage.persisted();
          if (jaPersistido) return true;
        }
        if (typeof navigator.storage.persist === 'function') {
          return await navigator.storage.persist();
        }
      }
    } catch {}
    return false;
  }

  public async gravarSnapshotPeriodicoNoIDB(record: any): Promise<boolean> {
    await this.dbReadyPromise;
    return this.gravarNoIndexedDB(STORE_PERIODIC_BACKUPS, record);
  }

  public async listarSnapshotsPeriodicosDoIDB<T = any>(): Promise<T[]> {
    await this.dbReadyPromise;
    const items = await this.lerTodosDoIndexedDB<T>(STORE_PERIODIC_BACKUPS);
    return items.sort((a: any, b: any) =>
      String(b?.criadoEm || '').localeCompare(String(a?.criadoEm || ''))
    );
  }

  public async obterSnapshotPeriodicoDoIDB<T = any>(id: string): Promise<T | null> {
    if (!id) return null;
    await this.dbReadyPromise;
    return this.lerUmDoIndexedDB<T>(STORE_PERIODIC_BACKUPS, id);
  }

  public async eliminarSnapshotPeriodicoDoIDB(id: string): Promise<boolean> {
    if (!id) return false;
    await this.dbReadyPromise;
    return this.eliminarDoIndexedDB(STORE_PERIODIC_BACKUPS, id);
  }

  /**
   * Persiste imediatamente um funcionário e a sua fotoUrl (Base64 + Blob) no IndexedDB.
   */
  public async salvarFuncionarioNoIndexedDB(func: any): Promise<void> {
    if (!func || !func.id) return;
    if (typeof func.fotoUrl === 'string' && func.fotoUrl && func.fotoUrl !== '__idb_media__' && !func.fotoUrl.startsWith('blob:')) {
      this.definirMidiaEmCache('funcionario', func.id, func.fotoUrl);
    }
    await this.dbReadyPromise;
    const updatedAt = func.atualizadoEm || new Date().toISOString();
    let fotoPortatil = func.fotoUrl;
    if (func.fotoUrl !== undefined) {
      if (func.fotoUrl === '' || func.fotoUrl === null) {
        fotoPortatil = await this.salvarMidia('funcionario', func.id, '', updatedAt);
      } else if (func.fotoUrl !== '__idb_media__') {
        fotoPortatil = await this.salvarMidia('funcionario', func.id, func.fotoUrl, updatedAt);
      } else {
        fotoPortatil = await this.obterMidia('funcionario', func.id);
      }
    }
    const registroIndexedDB = {
      ...func,
      fotoUrl: fotoPortatil !== undefined ? fotoPortatil : (func.fotoUrl || ''),
      atualizadoEm: updatedAt
    };
    await this.gravarNoIndexedDB(STORE_FUNCIONARIOS, registroIndexedDB);
  }

  public async salvarFuncionariosLoteNoIndexedDB(funcs: any[]): Promise<void> {
    if (!Array.isArray(funcs) || funcs.length === 0) return;
    for (const f of funcs) {
      if (f?.id && typeof f.fotoUrl === 'string' && f.fotoUrl && f.fotoUrl !== '__idb_media__' && !f.fotoUrl.startsWith('blob:')) {
        this.definirMidiaEmCache('funcionario', f.id, f.fotoUrl);
      }
    }
    await this.dbReadyPromise;
    if (!this.db) return;
    const now = new Date().toISOString();
    try {
      const tx = this.db.transaction([STORE_FUNCIONARIOS, STORE_MEDIA], 'readwrite');
      const fStore = tx.objectStore(STORE_FUNCIONARIOS);
      const mStore = tx.objectStore(STORE_MEDIA);
      for (const f of funcs) {
        if (!f || !f.id) continue;
        const updatedAt = f.atualizadoEm || now;
        fStore.put({ ...f, atualizadoEm: updatedAt });
        if (typeof f.fotoUrl === 'string' && f.fotoUrl && f.fotoUrl !== '__idb_media__' && !f.fotoUrl.startsWith('blob:')) {
          const blob = f.fotoUrl.startsWith('data:') ? base64ToBlob(f.fotoUrl) : null;
          mStore.put({
            id: `funcionario:${f.id}`,
            entityType: 'funcionario',
            entityId: f.id,
            base64: f.fotoUrl,
            blob,
            mimeType: blob?.type || 'image/jpeg',
            updatedAt
          });
        }
      }
    } catch {}
  }

  private async hidratarBlobsMediaEmSegundoPlano(blobsPendentes: StoredMediaEntry[]): Promise<void> {
    if (!blobsPendentes || blobsPendentes.length === 0) return;
    let mudouMidia = false;
    for (let i = 0; i < blobsPendentes.length; i++) {
      const m = blobsPendentes[i];
      if (!m?.blob || !m.entityType || !m.entityId) continue;
      const cacheKey = `${m.entityType}:${m.entityId}`;
      if (this.mediaCache.has(cacheKey)) continue;
      try {
        const b64 = await blobToBase64(m.blob);
        if (b64) {
          this.mediaCache.set(cacheKey, b64);
          mudouMidia = true;
        }
      } catch {}
      // Ceder frame a cada 4 imagens para não travar interações
      if ((i + 1) % 4 === 0) {
        await new Promise((r) => setTimeout(r, 15));
      }
    }
    if (!mudouMidia || typeof localStorage === 'undefined') return;

    try {
      const curRaw = localStorage.getItem('sge_current_user');
      if (curRaw && curRaw !== 'undefined' && curRaw !== 'null') {
        const cur = JSON.parse(curRaw);
        const foto = cur?.id ? this.mediaCache.get(`funcionario:${cur.id}`) : undefined;
        if (cur && (!cur.fotoUrl || cur.fotoUrl === '__idb_media__' || cur.fotoUrl.startsWith('blob:')) && foto) {
          cur.fotoUrl = foto;
          localStorage.setItem('sge_current_user', JSON.stringify(cur));
          localStorage.setItem('sge_user', JSON.stringify(cur));
        }
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
    }
  }

  /**
   * Hidrata entidades críticas primeiro e fotos/mídias em segundo plano sem bloquear o arranque.
   */
  public hidratarArmazenamentoDoIndexedDB(): Promise<boolean> {
    if (this.hydrationPromise) return this.hydrationPromise;
    this.hydrationPromise = (async () => {
      try {
        const ready = await this.dbReadyPromise;
        if (!ready || !this.db) return false;

        let mudouAlgumDado = false;

        // Ler lojas em paralelo numa única fase rápida (evita loops síncronos de FileReader antes dos dados principais)
        const [allIdbEntities, funcsIdb, medias] = await Promise.all([
          typeof localStorage !== 'undefined'
            ? this.lerTodosDoIndexedDB<{ key: string; value: string; updatedAt?: string }>(STORE_ENTITIES)
            : Promise.resolve([]),
          this.lerTodosDoIndexedDB<any>(STORE_FUNCIONARIOS),
          this.lerTodosDoIndexedDB<StoredMediaEntry>(STORE_MEDIA)
        ]);

        const blobsPendentes: StoredMediaEntry[] = [];
        for (const m of medias) {
          if (m.base64 && m.entityType && m.entityId) {
            this.mediaCache.set(`${m.entityType}:${m.entityId}`, m.base64);
          } else if (m.blob && m.entityType && m.entityId) {
            blobsPendentes.push(m);
          }
        }

        // Restaurar TODAS as chaves sge_* espelhadas no IndexedDB caso o localStorage esteja vazio, desatualizado ou tenha excedido a quota
        if (typeof localStorage !== 'undefined') {
          const lsTimestamps = this.obterTimestampsLocalStorage();
          let pendRecValue: string | null = null;
          for (const rec of allIdbEntities) {
            try {
              if (!rec || !rec.key || !rec.key.startsWith('sge_') || rec.key === 'sge_ls_timestamps') {
                continue;
              }
              if (rec.key === 'sge_pending_sync_queue') {
                pendRecValue = rec.value;
                continue;
              }
              const curVal = localStorage.getItem(rec.key);
              const isEmptyLocal =
                !curVal ||
                curVal === '[]' ||
                curVal === '{}' ||
                curVal === 'undefined' ||
                curVal === 'null';
              const recTemConteudo =
                Boolean(rec.value) &&
                rec.value !== '[]' &&
                rec.value !== '{}' &&
                rec.value !== 'undefined' &&
                rec.value !== 'null';
              const tIdb = rec.updatedAt ? Date.parse(rec.updatedAt) || 0 : 0;
              const tLs = lsTimestamps[rec.key] ? Date.parse(lsTimestamps[rec.key]) || 0 : 0;
              const idbMaisRecente = tIdb > tLs + 500 && rec.value !== curVal;

              if ((isEmptyLocal && recTemConteudo) || (idbMaisRecente && rec.value)) {
                try {
                  localStorage.setItem(rec.key, rec.value);
                  if (rec.updatedAt) this.marcarTimestampLocalStorage(rec.key, rec.updatedAt);
                  invalidateLocalCache(rec.key);
                  mudouAlgumDado = true;
                } catch {
                  // Se exceder quota do localStorage, hidratar diretamente na cache primária em RAM sem marcar timestamp no localStorage
                  try {
                    const parsedVal = JSON.parse(rec.value);
                    setCachedLocalEntry(rec.key, rec.value, parsedVal, true);
                    mudouAlgumDado = true;
                  } catch {}
                }
              }
            } catch {}
          }

          // Restaurar e mesclar fila de pendências já lida no batch acima (zero consulta extra ao IDB)
          try {
            if (pendRecValue) {
              const idbQueue = JSON.parse(pendRecValue);
              if (Array.isArray(idbQueue) && idbQueue.length > 0) {
                const lsRaw = localStorage.getItem('sge_pending_sync_queue');
                const lsQueue: PendingSyncItem[] = lsRaw ? JSON.parse(lsRaw) : [];
                const merged = new Map<string, PendingSyncItem>();
                for (const p of idbQueue) {
                  if (p && p.entidade) {
                    const key = `${p.entidade.toLowerCase()}::${p.docId || p.dados?.id || p.id}`;
                    merged.set(key, p);
                  }
                }
                if (Array.isArray(lsQueue)) {
                  for (const p of lsQueue) {
                    if (p && p.entidade) {
                      const key = `${p.entidade.toLowerCase()}::${p.docId || p.dados?.id || p.id}`;
                      const prev = merged.get(key);
                      if (!prev || (p.timestamp && (!prev.timestamp || p.timestamp >= prev.timestamp))) {
                        merged.set(key, p);
                      }
                    }
                  }
                }
                const mergedList = Array.from(merged.values());
                this.pendingQueueMemory = mergedList;
                try {
                  localStorage.setItem('sge_pending_sync_queue', JSON.stringify(mergedList));
                } catch {}
                if (typeof window !== 'undefined' && mergedList.length > 0) {
                  window.dispatchEvent(new CustomEvent('sge_pending_sync_changed', { detail: { total: mergedList.length } }));
                }
              }
            }
          } catch {}
        }

        if (funcsIdb.length > 0 && typeof localStorage !== 'undefined') {
          let funcsLocal: any[] = [];
          try {
            const raw = localStorage.getItem('sge_funcionarios');
            if (raw && raw !== 'undefined' && raw !== 'null') {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) funcsLocal = parsed;
            }
          } catch {}

          const mapLocal = new Map<string, any>(funcsLocal.filter(Boolean).map(f => [f.id, f]));
          let funcsMudou = false;
          for (const fIdb of funcsIdb) {
            if (!fIdb?.id) continue;
            const fotoCache = this.mediaCache.get(`funcionario:${fIdb.id}`);
            const fotoIdb = (fIdb.fotoUrl && fIdb.fotoUrl !== '__idb_media__') ? fIdb.fotoUrl : (fotoCache || '');
            const existing = mapLocal.get(fIdb.id);

            if (!existing) {
              mapLocal.set(fIdb.id, { ...fIdb, fotoUrl: fotoIdb });
              funcsMudou = true;
              mudouAlgumDado = true;
            } else {
              const tLocal = existing.atualizadoEm ? Date.parse(String(existing.atualizadoEm)) : 0;
              const tIdb = fIdb.atualizadoEm ? Date.parse(String(fIdb.atualizadoEm)) : 0;
              if (tIdb > tLocal) {
                mapLocal.set(fIdb.id, { ...existing, ...fIdb, fotoUrl: fotoIdb || existing.fotoUrl || '' });
                funcsMudou = true;
                mudouAlgumDado = true;
              } else if ((!existing.fotoUrl || existing.fotoUrl === '__idb_media__' || existing.fotoUrl.startsWith('blob:')) && fotoIdb) {
                mapLocal.set(fIdb.id, { ...existing, fotoUrl: fotoIdb });
                funcsMudou = true;
                mudouAlgumDado = true;
              }
            }
          }

          if (funcsMudou) {
            try {
              localStorage.setItem('sge_funcionarios', JSON.stringify(Array.from(mapLocal.values())));
              invalidateLocalCache('sge_funcionarios');
            } catch {}
          }

          // Garantir que sge_current_user também recupera fotoUrl se perdida
          try {
            const curRaw = localStorage.getItem('sge_current_user');
            if (curRaw && curRaw !== 'undefined' && curRaw !== 'null') {
              const cur = JSON.parse(curRaw);
              if (cur?.id) {
                const fotoRestaurada = this.mediaCache.get(`funcionario:${cur.id}`) || mapLocal.get(cur.id)?.fotoUrl;
                if ((!cur.fotoUrl || cur.fotoUrl === '__idb_media__' || cur.fotoUrl.startsWith('blob:')) && fotoRestaurada) {
                  cur.fotoUrl = fotoRestaurada;
                  localStorage.setItem('sge_current_user', JSON.stringify(cur));
                  localStorage.setItem('sge_user', JSON.stringify(cur));
                  mudouAlgumDado = true;
                }
              }
            }
          } catch {}
        }

        // Hidratar fotos de alunos que já possuem base64 em cache
        if (typeof localStorage !== 'undefined' && this.mediaCache.size > 0) {
          try {
            const alRaw = localStorage.getItem('sge_alunos');
            if (alRaw && alRaw !== 'undefined' && alRaw !== 'null') {
              const alParsed = JSON.parse(alRaw);
              if (Array.isArray(alParsed)) {
                let alChanged = false;
                const alHydrated = alParsed.map((a: any) => {
                  const fotoCache = a?.id ? this.mediaCache.get(`aluno:${a.id}`) : undefined;
                  if (a && (!a.fotoUrl || a.fotoUrl === '__idb_media__' || a.fotoUrl.startsWith('blob:')) && fotoCache) {
                    alChanged = true;
                    return { ...a, fotoUrl: fotoCache };
                  }
                  return a;
                });
                if (alChanged) {
                  try {
                    localStorage.setItem('sge_alunos', JSON.stringify(alHydrated));
                    invalidateLocalCache('sge_alunos');
                  } catch {}
                  mudouAlgumDado = true;
                }
              }
            }
          } catch {}
        }

        if (mudouAlgumDado && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
        }

        // Converter Blobs de fotos sem base64 apenas em segundo plano/tempo ocioso
        if (blobsPendentes.length > 0) {
          setTimeout(() => {
            this.hidratarBlobsMediaEmSegundoPlano(blobsPendentes).catch(() => {});
          }, 300);
        }

        return mudouAlgumDado;
      } catch (e) {
        console.warn('[SGE Offline] Aviso na hidratação do IndexedDB:', e);
        return false;
      }
    })();
    return this.hydrationPromise;
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

    const isStoragePersisted = await this.verificarPersistenciaNativa();
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
      isStoragePersisted,
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
   * Persistência e Leitura Offline de Livros / Manuais PDF em IndexedDB (store biblioteca_pdfs)
   */
  public async salvarPdfBiblioteca(
    docId: string,
    blobOrBase64: Blob | string,
    meta?: { nome?: string; mimeType?: string; updatedAt?: string }
  ): Promise<{ base64: string; tamanhoBytes: number; chunksCount: number }> {
    if (!docId) return { base64: '', tamanhoBytes: 0, chunksCount: 0 };

    let base64 = '';
    let blob: Blob | null = null;
    const fallbackMime = meta?.mimeType || 'application/pdf';

    if (typeof Blob !== 'undefined' && blobOrBase64 instanceof Blob) {
      try {
        const ab = await blobOrBase64.arrayBuffer();
        blob = new Blob([ab], { type: blobOrBase64.type || fallbackMime });
      } catch {
        blob = blobOrBase64;
      }
      base64 = await blobToBase64(blob);
    } else if (typeof blobOrBase64 === 'string') {
      base64 = blobOrBase64.trim();
      if (base64 && !base64.startsWith('data:')) {
        base64 = `data:${fallbackMime};base64,${base64}`;
      }
      if (base64) {
        blob = base64ToBlob(base64, fallbackMime);
      }
    }

    if (!base64 && !blob) {
      return { base64: '', tamanhoBytes: 0, chunksCount: 0 };
    }

    const tamanhoBytes = blob?.size || Math.round((base64.length * 3) / 4);
    const mimeType = meta?.mimeType || blob?.type || fallbackMime;
    const nome = meta?.nome || `documento-${docId}.pdf`;
    const updatedAt = meta?.updatedAt || new Date().toISOString();

    await this.dbReadyPromise;
    await this.gravarNoIndexedDB(STORE_PDFS, {
      id: docId,
      nome,
      mimeType,
      tamanhoBytes,
      base64,
      blob,
      updatedAt
    } as StoredPdfEntry);

    const chunksCount = base64 ? Math.max(1, Math.ceil(base64.length / 300000)) : 0;
    return { base64, tamanhoBytes, chunksCount };
  }

  public async obterPdfBibliotecaEntry(docId: string): Promise<StoredPdfEntry | null> {
    if (!docId) return null;
    await this.dbReadyPromise;
    return this.lerUmDoIndexedDB<StoredPdfEntry>(STORE_PDFS, docId);
  }

  public async obterPdfBibliotecaBlob(docId: string): Promise<Blob | null> {
    const entry = await this.obterPdfBibliotecaEntry(docId);
    if (!entry) return null;
    if (typeof Blob !== 'undefined' && entry.blob instanceof Blob) {
      return entry.blob;
    }
    if (entry.base64 && entry.base64.startsWith('data:')) {
      return base64ToBlob(entry.base64);
    }
    return null;
  }

  public async obterPdfBibliotecaBase64(docId: string): Promise<string> {
    const entry = await this.obterPdfBibliotecaEntry(docId);
    if (!entry) return '';
    if (entry.base64) return entry.base64;
    if (typeof Blob !== 'undefined' && entry.blob instanceof Blob) {
      return blobToBase64(entry.blob);
    }
    return '';
  }

  public async temPdfBibliotecaLocal(docId: string): Promise<boolean> {
    if (!docId) return false;
    const entry = await this.obterPdfBibliotecaEntry(docId);
    return Boolean(entry && (entry.blob || entry.base64));
  }

  public async listarIdsPdfsLocais(): Promise<string[]> {
    await this.dbReadyPromise;
    const all = await this.lerTodosDoIndexedDB<StoredPdfEntry>(STORE_PDFS);
    return all.filter(e => Boolean(e?.id && (e.blob || e.base64))).map(e => e.id);
  }

  public async removerPdfBiblioteca(docId: string): Promise<void> {
    if (!docId) return;
    await this.dbReadyPromise;
    await this.eliminarDoIndexedDB(STORE_PDFS, docId);
  }

  /**
   * Compacta campos Base64 pesados ao guardar item na fila de pendências para evitar QuotaExceededError no localStorage,
   * assegurando que a mídia real permanece salva no IndexedDB (store media_blobs).
   */
  private slimDadosParaFila(entidade: string, docId: string | undefined, dados: any): any {
    if (!dados || typeof dados !== 'object') return dados;
    const entNorm = entidade.toLowerCase();
    const entityType: StoredMediaEntry['entityType'] =
      entNorm === 'funcionarios' || entNorm === 'users'
        ? 'funcionario'
        : entNorm === 'alunos' || entNorm === 'students'
        ? 'aluno'
        : entNorm === 'escolas' || entNorm === 'schools'
        ? 'escola'
        : 'config';
    const mediaEntityId = docId || dados.id || 'global';
    const imageKeys = ['fotoUrl', 'foto', 'logotipo', 'logotipoUrl', 'assinaturaDiretorUrl', 'insigniaNacionalUrl'];
    let cloned: Record<string, any> | null = null;

    if (entNorm === 'biblioteca') {
      const pdfKeys = ['url', 'arquivoUrl', 'arquivoBase64', 'pdfBase64'];
      let clonedBib: Record<string, any> | null = null;
      for (const k of pdfKeys) {
        const val = dados[k];
        if (typeof val === 'string' && val.startsWith('data:') && val.length > 2048) {
          const target = clonedBib ?? (clonedBib = { ...dados });
          target[k] = '__idb_pdf__';
        }
      }
      return clonedBib ?? dados;
    }

    for (const k of imageKeys) {
      const val = dados[k];
      if (typeof val === 'string' && val.length > 4096 && val !== '__idb_media__' && !val.startsWith('http')) {
        const target = cloned ?? (cloned = { ...dados });
        this.definirMidiaEmCache(entityType, mediaEntityId, val);
        this.salvarMidia(entityType, mediaEntityId, val, dados.atualizadoEm);
        target[k] = '__idb_media__';
      }
    }
    return cloned ?? dados;
  }

  private persistirPendencias(list: PendingSyncItem[], lastAddedItem?: PendingSyncItem): void {
    this.pendingQueueMemory = list;
    const serialized = JSON.stringify(list);
    this.gravarChaveNoIndexedDB('sge_pending_sync_queue', serialized);
    try {
      if (typeof localStorage !== 'undefined') {
        if (list.length === 0) {
          localStorage.removeItem('sge_pending_sync_queue');
        } else {
          localStorage.setItem('sge_pending_sync_queue', serialized);
        }
      }
    } catch {
      // Fallback caso QuotaExceededError no localStorage: compactar agressivamente todos os itens
      try {
        const ultraSlim = list.map(p => ({
          ...p,
          dados: this.slimDadosParaFila(p.entidade, p.docId || p.dados?.id, p.dados)
        }));
        this.pendingQueueMemory = ultraSlim;
        const slimJson = JSON.stringify(ultraSlim);
        this.gravarChaveNoIndexedDB('sge_pending_sync_queue', slimJson);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('sge_pending_sync_queue', slimJson);
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_pending_sync_changed', { detail: { total: list.length, item: lastAddedItem } }));
    }
  }

  /**
   * Gestão de Fila de Informações Pendentes para Sincronizar com o Firebase (com coalescência por coleção + docId e espelho no IndexedDB)
   */
  public obterPendencias(): PendingSyncItem[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('sge_pending_sync_queue');
        if (raw && raw !== 'undefined' && raw !== 'null') {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            this.pendingQueueMemory = list;
            return list;
          }
        }
      }
    } catch {}
    return this.pendingQueueMemory ? [...this.pendingQueueMemory] : [];
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

      const dadosCompactados = this.slimDadosParaFila(entidadeNorm, resolvedDocId, dados);

      const item: PendingSyncItem = {
        id: `pend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entidade: entidadeNorm,
        docId: resolvedDocId,
        acao,
        timestamp: new Date().toISOString(),
        descricao,
        dados: dadosCompactados,
        extraColecoes,
        autorRole: resolvedRole
      };
      list.push(item);
      this.persistirPendencias(list, item);
    } catch (e) {
      console.warn('[SGE Offline] Erro ao adicionar pendência de sincronização:', e);
    }
  }

  public adicionarPendenciasEmLote(
    itens: Array<{
      entidade: string;
      acao: string;
      descricao: string;
      dados?: any;
      docId?: string;
      extraColecoes?: string[];
      autorRole?: string;
    }>
  ): void {
    if (!Array.isArray(itens) || itens.length === 0) return;
    try {
      let resolvedRole: string | undefined;
      if (typeof localStorage !== 'undefined') {
        try {
          const uRaw = localStorage.getItem('sge_current_user');
          if (uRaw) {
            const parsed = JSON.parse(uRaw);
            if (parsed?.role) resolvedRole = parsed.role;
          }
        } catch {}
      }

      const atual = this.obterPendencias();
      const map = new Map<string, PendingSyncItem>();
      for (const p of atual) {
        if (!p || !p.entidade) continue;
        const k = `${p.entidade.toLowerCase()}::${p.docId || p.dados?.id || p.id}`;
        map.set(k, p);
      }

      const nowIso = new Date().toISOString();
      const baseTs = Date.now();
      let ultimoItem: PendingSyncItem | undefined;

      itens.forEach((entrada, idx) => {
        const entidadeNorm = entrada.entidade.toLowerCase();
        const resolvedDocId = entrada.docId || entrada.dados?.id;
        const key = `${entidadeNorm}::${resolvedDocId || `${baseTs}-${idx}`}`;
        const dadosCompactados = this.slimDadosParaFila(entidadeNorm, resolvedDocId, entrada.dados);
        const item: PendingSyncItem = {
          id: `pend-${baseTs}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          entidade: entidadeNorm,
          docId: resolvedDocId,
          acao: entrada.acao,
          timestamp: nowIso,
          descricao: entrada.descricao,
          dados: dadosCompactados,
          extraColecoes: entrada.extraColecoes,
          autorRole: entrada.autorRole || resolvedRole
        };
        map.delete(key);
        map.set(key, item);
        ultimoItem = item;
      });

      this.persistirPendencias(Array.from(map.values()), ultimoItem);
    } catch (e) {
      console.warn('[SGE Offline] Erro ao adicionar pendências em lote:', e);
    }
  }

  public removerPendenciaPorDocumento(entidade: string, docId: string): void {
    try {
      const entidadeNorm = entidade.toLowerCase();
      const atual = this.obterPendencias();
      const filtrada = atual.filter(p => !(p.entidade.toLowerCase() === entidadeNorm && (p.docId || p.dados?.id) === docId));
      if (filtrada.length !== atual.length) {
        this.persistirPendencias(filtrada);
      }
    } catch {}
  }

  public removerPendencia(id: string): void {
    try {
      const list = this.obterPendencias().filter(p => p.id !== id);
      this.persistirPendencias(list);
    } catch {}
  }

  public limparPendencias(): void {
    try {
      this.persistirPendencias([]);
    } catch {}
  }

  public flushEspelhoSync(): void {
    try {
      this.flushMirrorQueueSync();
    } catch {}
  }

  /**
   * Remove em cascata todos os dados locais no IndexedDB (mídias, PDFs, funcionários, entidades e fila pendente)
   * pertencentes a uma escola eliminada.
   */
  public async limparDadosEscolaNoIndexedDB(
    escolaId: string,
    funcIds: string[] = [],
    alunoIds: string[] = [],
    bibIds: string[] = []
  ): Promise<void> {
    if (!escolaId) return;
    try {
      const funcSet = new Set(funcIds.filter(Boolean));
      const alunoSet = new Set(alunoIds.filter(Boolean));
      const bibSet = new Set(bibIds.filter(Boolean));

      // 1. Limpar cache de mídia em memória
      this.mediaCache.delete(`escola:${escolaId}`);
      for (const fId of funcSet) this.mediaCache.delete(`funcionario:${fId}`);
      for (const aId of alunoSet) this.mediaCache.delete(`aluno:${aId}`);

      // 2. Remover pendências offline antigas (exceto a própria remoção da escola) para não ressuscitar documentos
      try {
        const atuais = this.obterPendencias();
        const filtradas = atuais.filter((p) => {
          const ent = (p.entidade || '').toLowerCase();
          const dId = p.docId || p.dados?.id;
          if (ent === 'escolas' && dId === escolaId && (p.acao === 'ELIMINAR' || p.acao === 'ELIMINAR_ESCOLA_CASCATA')) {
            return true;
          }
          if (p.dados?.escolaId === escolaId) return false;
          if (ent === 'escolas' && dId === escolaId) return false;
          if (ent === 'funcionarios' && dId && funcSet.has(dId)) return false;
          if (ent === 'alunos' && dId && alunoSet.has(dId)) return false;
          if (ent === 'biblioteca' && dId && bibSet.has(dId)) return false;
          if (dId && (dId === escolaId || dId.startsWith(`${escolaId}_`))) return false;
          return true;
        });
        if (filtradas.length !== atuais.length) {
          this.persistirPendencias(filtradas);
        }
      } catch {}

      await this.dbReadyPromise;
      if (!this.db) return;

      // 3. Remover chaves específicas e caches no IndexedDB
      const entityKeysToDelete = [
        `sge_calendario_${escolaId}`,
        `sge_calendario_tipos_${escolaId}`
      ];
      await Promise.allSettled([
        this.eliminarDoIndexedDB(STORE_MEDIA, `escola:${escolaId}`),
        ...entityKeysToDelete.map(k => this.eliminarDoIndexedDB(STORE_ENTITIES, k)),
        ...Array.from(funcSet).flatMap(fId => [
          this.eliminarDoIndexedDB(STORE_FUNCIONARIOS, fId),
          this.eliminarDoIndexedDB(STORE_MEDIA, `funcionario:${fId}`)
        ]),
        ...Array.from(alunoSet).map(aId => this.eliminarDoIndexedDB(STORE_MEDIA, `aluno:${aId}`)),
        ...Array.from(bibSet).map(bId => this.eliminarDoIndexedDB(STORE_PDFS, bId))
      ]);
    } catch (e) {
      console.warn('[SGE Offline] Erro ao limpar dados da escola no IndexedDB:', e);
    }
  }
}

export const offlineStorage = new OfflineStorageEngine();
