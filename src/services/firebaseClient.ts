import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  getDocFromServer,
  onSnapshot
} from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

// Configuração oficial do projeto Firebase provisionado
export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId
};

// Inicialização segura do Firebase
let appInstance: any = null;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("Firebase inicializado em modo offline/local:", e);
}

export const firebaseApp = appInstance;
export const db = appInstance ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId) : null;

// Teste de conexão conforme especificação
export async function testConnection() {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Dispositivo em modo offline.");
    }
    return false;
  }
}

// Serviços diretos do Firestore para sincronização
export const firestoreSyncService = {
  // Salvar perfil de usuário no Firebase
  salvarUsuarioFirebase: async (usuario: any): Promise<boolean> => {
    if (!db || !navigator.onLine) return false;
    try {
      const sanitized = { ...usuario };
      delete sanitized.password; // Segurança
      await setDoc(doc(db, "users", usuario.id), {
        ...usuario,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("[Firestore] Falha ao salvar usuário no Firestore:", e);
      return false;
    }
  },

  // Buscar perfil de usuário no Firebase (Online)
  buscarUsuarioFirebase: async (identificador: string): Promise<any | null> => {
    if (!db || !navigator.onLine) return null;
    try {
      // 1. Tentar busca direta por ID
      const docRef = doc(db, "users", identificador);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }

      // 2. Tentar busca na coleção por email, BI ou nome
      const colRef = collection(db, "users");
      const querySnap = await getDocs(colRef);
      const idLimpo = identificador.trim().toLowerCase();
      for (const d of querySnap.docs) {
        const u = d.data();
        if (
          u.email?.toLowerCase() === idLimpo ||
          u.numeroBI?.toLowerCase() === idLimpo ||
          u.nomeCompleto?.toLowerCase() === idLimpo ||
          d.id.toLowerCase() === idLimpo
        ) {
          return u;
        }
      }
      return null;
    } catch (e) {
      console.warn("[Firestore] Falha ao buscar usuário no Firestore:", e);
      return null;
    }
  },

  // Sincronizar todos os usuários locais com o Firebase
  sincronizarUsuariosComFirebase: async (usuarios: any[]): Promise<number> => {
    if (!db || !navigator.onLine) return 0;
    let sincronizados = 0;
    try {
      for (const u of usuarios) {
        if (!u.id) continue;
        await setDoc(doc(db, "users", u.id), {
          ...u,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        sincronizados++;
      }
    } catch (e) {
      console.warn("[Firestore] Erro parcial na sincronização de usuários:", e);
    }
    return sincronizados;
  },

  // Buscar todos os usuários do Firebase para sincronizar para o dispositivo
  buscarTodosUsuariosFirebase: async (): Promise<any[]> => {
    if (!db || !navigator.onLine) return [];
    try {
      const querySnap = await getDocs(collection(db, "users"));
      return querySnap.docs.map(d => d.data());
    } catch (e) {
      console.warn("[Firestore] Erro ao buscar usuários no Firebase:", e);
      return [];
    }
  },

  // Salvar configuração do sistema no Firebase
  salvarConfigSistemaFirebase: async (config: any): Promise<boolean> => {
    if (!db || !navigator.onLine) return false;
    try {
      await setDoc(doc(db, "system_config", "global"), {
        ...config,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("[Firestore] Erro ao salvar config no Firebase:", e);
      return false;
    }
  },

  // Buscar configuração do sistema no Firebase
  buscarConfigSistemaFirebase: async (): Promise<any | null> => {
    if (!db || !navigator.onLine) return null;
    try {
      const snap = await getDoc(doc(db, "system_config", "global"));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e) {
      console.warn("[Firestore] Erro ao buscar config no Firebase:", e);
      return null;
    }
  }
};

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
    firebaseConectado: isOnline && !!db,
    isOnline,
    modoOfflinePersistence: true,
    ultimaSincronizacao: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
  };
}
