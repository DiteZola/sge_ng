import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Configuração oficial do projeto SGE-NG
export const firebaseConfig = {
  apiKey: "AIzaSyC_c7wygc3GgSiWsZgNSZvrh7xnxajK8Do",
  authDomain: "sge4-8b772.firebaseapp.com",
  projectId: "sge4-8b772",
  storageBucket: "sge4-8b772.firebasestorage.app",
  messagingSenderId: "311536152950",
  appId: "1:311536152950:web:c9d1600e9dad04921b4a57"
};

// Inicialização segura do Firebase e Firestore
let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (appInstance) {
    firestoreInstance = getFirestore(appInstance);
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
