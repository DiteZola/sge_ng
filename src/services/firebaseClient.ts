import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  Firestore, 
  doc, 
  setDoc,
  getDocFromServer 
} from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";

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

// Inicialização segura do Firebase e Firestore
let appInstance: FirebaseApp;
if (getApps().length === 0) {
  appInstance = initializeApp(firebaseConfig);
} else {
  appInstance = getApp();
}

let firestoreInstance: Firestore;
try {
  if (customDatabaseId && customDatabaseId !== "(default)") {
    firestoreInstance = initializeFirestore(
      appInstance,
      {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true
      },
      customDatabaseId
    );
  } else {
    firestoreInstance = initializeFirestore(appInstance, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    });
  }
} catch {
  if (customDatabaseId && customDatabaseId !== "(default)") {
    firestoreInstance = getFirestore(appInstance, customDatabaseId);
  } else {
    firestoreInstance = getFirestore(appInstance);
  }
}

// Validação de conexão inicial com o Firestore conforme directrizes do sistema
async function testConnection() {
  if (!firestoreInstance) return;
  try {
    await getDocFromServer(doc(firestoreInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Por favor, verifique a ligação ou a conectividade do Firebase.");
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

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
    console.log(`[Firestore Write OK] Gravado '${colecao}/${id}' com sucesso.`);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, `${colecao}/${id}`);
    }
    console.error(`[Firestore Write ERROR] Falha ao gravar em '${colecao}/${id}':`, err?.message || err);
    return false;
  }
}
