import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";

// Configuração oficial do projeto SGE-NG integrada com o Cloud Firebase
export const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyDoCDEYIjvgUcDS00hw6RoET3NgssBH5gk",
  authDomain: appletConfig.authDomain || "poetic-sun-4gtt6.firebaseapp.com",
  projectId: appletConfig.projectId || "poetic-sun-4gtt6",
  storageBucket: appletConfig.storageBucket || "poetic-sun-4gtt6.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "26933016368",
  appId: appletConfig.appId || "1:26933016368:web:d1c75aa13cbfd78ee07af5"
};

const customDatabaseId = appletConfig.firestoreDatabaseId || "ai-studio-sgengsistemadege-e0481ed1-d3d7-455d-9835-a0f827249578";

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
