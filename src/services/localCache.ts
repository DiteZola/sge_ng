// Camada de Cache em Memória de Alta Velocidade para LocalStorage (Read-Through / Write-Through)
// Zero dependências externas para evitar importações circulares entre storage.ts e firebaseSyncEngine.ts

interface CacheEntry {
  raw: string;
  value: unknown;
}

const memoryMap = new Map<string, CacheEntry>();
const memoryPrimaryKeys = new Set<string>();
const computedMap = new Map<string, { generation: number; value: unknown }>();
let cacheGeneration = 1;

function bumpGeneration() {
  cacheGeneration++;
  if (computedMap.size > 0) {
    computedMap.clear();
  }
}

function shallowCloneReturn<T>(val: T): T {
  if (Array.isArray(val)) {
    return [...val] as unknown as T;
  }
  if (val && typeof val === 'object') {
    return { ...val };
  }
  return val;
}

if (typeof window !== 'undefined') {
  try {
    window.addEventListener('storage', (e) => {
      if (e.key) {
        memoryMap.delete(e.key);
        memoryPrimaryKeys.delete(e.key);
      } else {
        memoryMap.clear();
        memoryPrimaryKeys.clear();
      }
      bumpGeneration();
    });
    window.addEventListener('sge_dados_atualizados_remoto', () => {
      bumpGeneration();
    });
  } catch {
    // noop
  }
}

export function getCacheGeneration(): number {
  return cacheGeneration;
}

export function invalidateLocalCache(key?: string): void {
  if (key) {
    memoryMap.delete(key);
    memoryPrimaryKeys.delete(key);
  } else {
    memoryMap.clear();
    memoryPrimaryKeys.clear();
  }
  bumpGeneration();
}

export function getCachedLocal<T>(key: string, fallback: T): T {
  try {
    if (memoryPrimaryKeys.has(key) && memoryMap.has(key)) {
      return shallowCloneReturn(memoryMap.get(key)!.value as T);
    }
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') {
      if (raw === 'undefined' || raw === 'null') {
        try {
          localStorage.removeItem(key);
        } catch {
          // noop
        }
      }
      if (memoryMap.has(key)) {
        memoryMap.delete(key);
        bumpGeneration();
      }
      return fallback;
    }

    const cached = memoryMap.get(key);
    if (cached && cached.raw === raw) {
      return shallowCloneReturn(cached.value as T);
    }

    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) {
      memoryMap.delete(key);
      return fallback;
    }

    memoryMap.set(key, { raw, value: parsed });
    if (cached) {
      // A chave mudou externamente (ex: escrita direta de sync remoto em localStorage)
      bumpGeneration();
    }
    return shallowCloneReturn(parsed as T);
  } catch {
    memoryMap.delete(key);
    memoryPrimaryKeys.delete(key);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // noop
    }
    return fallback;
  }
}

export function setCachedLocalEntry<T>(
  key: string,
  serialized: string,
  value: T,
  isQuotaFallback: boolean = false
): void {
  memoryMap.set(key, { raw: serialized, value: shallowCloneReturn(value) });
  if (isQuotaFallback) {
    memoryPrimaryKeys.add(key);
  } else {
    memoryPrimaryKeys.delete(key);
  }
  bumpGeneration();
}

export function removeCachedLocalEntry(key: string): void {
  memoryMap.delete(key);
  memoryPrimaryKeys.delete(key);
  bumpGeneration();
}

export function getComputedCache<T>(computedKey: string, computeFn: () => T): T {
  const existing = computedMap.get(computedKey);
  if (existing && existing.generation === cacheGeneration) {
    return shallowCloneReturn(existing.value as T);
  }
  const value = computeFn();
  computedMap.set(computedKey, { generation: cacheGeneration, value });
  return shallowCloneReturn(value);
}
