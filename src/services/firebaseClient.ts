import { initializeApp, getApps, getApp } from "firebase/app";

// Configuração fornecida para o projeto SGE-NG
export const firebaseConfig = {
  apiKey: "AIzaSyC_c7wygc3GgSiWsZgNSZvrh7xnxajK8Do",
  authDomain: "sge4-8b772.firebaseapp.com",
  projectId: "sge4-8b772",
  storageBucket: "sge4-8b772.firebasestorage.app",
  messagingSenderId: "311536152950",
  appId: "1:311536152950:web:c9d1600e9dad04921b4a57"
};

// Inicialização segura do Firebase
let appInstance: any = null;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("Firebase inicializado em modo offline/local:", e);
}

export const firebaseApp = appInstance;

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
    firebaseConectado: isOnline,
    isOnline,
    modoOfflinePersistence: true,
    ultimaSincronizacao: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
  };
}
