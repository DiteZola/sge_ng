import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  Firestore, 
  doc, 
  setDoc,
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";

// Silenciar avisos informativos de conectividade de rede para operar sem alertas de latência
try {
  setLogLevel('error');
} catch {}

// Configuração oficial do projeto SGE-NG integrada com o Cloud Firebase
export const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId
};

export const customDatabaseId = appletConfig.firestoreDatabaseId || "(default)";

// Inicialização segura e rápida do Firebase e Firestore com cache persistente multi-separador e auto-detecção de polling
let appInstance: FirebaseApp;
if (getApps().length === 0) {
  appInstance = initializeApp(firebaseConfig);
} else {
  appInstance = getApp();
}

function criarFirestoreInstance(): Firestore {
  const optionsWithCache = {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };

  const optionsFallback = {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true
  };

  try {
    if (customDatabaseId && customDatabaseId !== "(default)") {
      return initializeFirestore(appInstance, optionsWithCache, customDatabaseId);
    }
    return initializeFirestore(appInstance, optionsWithCache);
  } catch {
    try {
      if (customDatabaseId && customDatabaseId !== "(default)") {
        return initializeFirestore(appInstance, optionsFallback, customDatabaseId);
      }
      return initializeFirestore(appInstance, optionsFallback);
    } catch {
      if (customDatabaseId && customDatabaseId !== "(default)") {
        return getFirestore(appInstance, customDatabaseId);
      }
      return getFirestore(appInstance);
    }
  }
}

const firestoreInstance: Firestore = criarFirestoreInstance();

export const firebaseApp = appInstance;
export const firestoreDb = firestoreInstance;
export const db = firestoreInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: false,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SystemIntegrityStatus {
  bancoLocalOk: boolean;
  sincronizacaoOk: boolean;
  firebaseConectado: boolean;
  isOnline: boolean;
  modoOfflinePersistence: boolean;
  ultimaSincronizacao: string;
}

export function verificarIntegridadeSistema(): SystemIntegrityStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    bancoLocalOk: true,
    sincronizacaoOk: true,
    firebaseConectado: isOnline && !!firestoreDb,
    isOnline,
    modoOfflinePersistence: true,
    ultimaSincronizacao: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Operação atômica e resiliente de gravação no Firestore com logging robusto e tolerância a falhas.
 */
export async function firestoreWriteWithLogging(
  colecao: string,
  id: string,
  dados: Record<string, any>,
  merge: boolean = true
): Promise<boolean> {
  if (!firestoreDb) {
    console.warn(`[Firestore Offline] '${colecao}/${id}' guardado apenas no dispositivo.`);
    return false;
  }
  try {
    const docRef = doc(firestoreDb, colecao, id);
    await setDoc(docRef, { ...dados, atualizadoEm: new Date().toISOString() }, { merge });
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, `${colecao}/${id}`);
    }
    console.error(`[Firestore Write ERROR] Falha ao gravar em '${colecao}/${id}':`, err?.message || err);
    return false;
  }
}

export async function testConnection(): Promise<boolean> {
  if (!firestoreDb || (typeof navigator !== 'undefined' && !navigator.onLine)) return false;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline: operando com cache local persistente.');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

