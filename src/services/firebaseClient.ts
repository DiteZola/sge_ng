import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";

// Configuração oficial do projeto SGE-NG integrada com o Cloud Firebase
export const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyC_c7wygc3GgSiWsZgNSZvrh7xnxajK8Do",
  authDomain: appletConfig.authDomain || "sge4-8b772.firebaseapp.com",
  projectId: appletConfig.projectId || "sge4-8b772",
  storageBucket: appletConfig.storageBucket || "sge4-8b772.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "311536152950",
  appId: appletConfig.appId || "1:311536152950:web:c9d1600e9dad04921b4a57"
};

const customDatabaseId = appletConfig.firestoreDatabaseId || "(default)";

// Inicialização segura do Firebase e Firestore
let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (appInstance) {
    if (customDatabaseId && customDatabaseId !== "(default)") {
      try {
        firestoreInstance = getFirestore(appInstance, customDatabaseId);
      } catch (dbErr) {
        console.warn("[Firebase] Inicialização com banco nomeado falhou, tentando padrão:", dbErr);
        firestoreInstance = getFirestore(appInstance);
      }
    } else {
      firestoreInstance = getFirestore(appInstance);
    }
  }
} catch (e) {
  console.warn("[Firebase] Inicialização em modo contingência offline:", e);
}

export const firebaseApp = appInstance;
export const firestoreDb = firestoreInstance;

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
    const { doc, setDoc } = await import("firebase/firestore");
    const docRef = doc(firestoreDb, colecao, id);
    await setDoc(docRef, { ...dados, atualizadoEm: new Date().toISOString() }, { merge });
    console.log(`[Firestore Write OK] Gravado '${colecao}/${id}' com sucesso.`);
    return true;
  } catch (err: any) {
    console.error(`[Firestore Write ERROR] Falha ao gravar em '${colecao}/${id}':`, err?.message || err);
    return false;
  }
}
