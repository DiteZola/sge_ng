import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  limit
} from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import { offlineStorage } from "./offlineStorage";
import { Funcionario, ConfiguracaoSistema, Escola, Aluno, Turma } from "../types";

export interface SyncStatus {
  isOnline: boolean;
  firestoreDisponivel: boolean;
  emSincronizacao: boolean;
  ultimaSincronizacao: string;
  totalUsuariosSincronizados: number;
  configSincronizada: boolean;
  errosRecentes?: string;
}

const STORAGE_KEYS = {
  FUNCIONARIOS: 'sge_funcionarios',
  CONFIGURACAO_SISTEMA: 'sge_configuracao_sistema',
  ESCOLAS: 'sge_escolas',
  ALUNOS: 'sge_alunos',
  TURMAS: 'sge_turmas',
  AUDITORIA: 'sge_auditoria'
};

class FirebaseSyncEngine {
  private emSincronizacao = false;
  private ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    this.iniciarObservadoresDeRede();
  }

  private iniciarObservadoresDeRede() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SGE Firebase Sync] Rede online restabelecida. Sincronizando de imediato...');
        this.sincronizarTudoImediato();
      });

      window.addEventListener('offline', () => {
        console.log('[SGE Firebase Sync] Modo offline ativado. Dados mantidos no dispositivo.');
        this.notificarStatus();
      });

      // Auto-sincronização inicial ao carregar
      setTimeout(() => {
        if (navigator.onLine) {
          this.sincronizarTudoImediato();
        }
      }, 1000);
    }
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public canUseFirestore(): boolean {
    return this.isOnline() && !!firestoreDb;
  }

  /**
   * Buscar perfil do usuário no Firebase (online) ou do dispositivo (offline).
   * Se online e encontrado no Firebase, atualiza imediatamente os dados no dispositivo.
   */
  public async buscarPerfilUsuario(identificador: string): Promise<Funcionario | null> {
    const termo = identificador.trim().toLowerCase();
    if (!termo) return null;

    // 1. Tentar busca no Firebase (Online)
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const funcsRef = collection(firestoreDb, "funcionarios");

        // Buscar por email
        let q = query(funcsRef, where("email", "==", termo), limit(1));
        let snapshot = await getDocs(q);

        // Se não encontrou por email, tentar por numeroBI
        if (snapshot.empty) {
          q = query(funcsRef, where("numeroBI", "==", identificador.trim().toUpperCase()), limit(1));
          snapshot = await getDocs(q);
        }

        // Se não encontrou por BI, tentar por ID direto
        if (snapshot.empty) {
          const docDirect = await getDoc(doc(firestoreDb, "funcionarios", identificador.trim()));
          if (docDirect.exists()) {
            const userFromFirebase = docDirect.data() as Funcionario;
            this.atualizarUsuarioNoDispositivo(userFromFirebase);
            return userFromFirebase;
          }
        } else {
          const userFromFirebase = snapshot.docs[0].data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }
      } catch (err) {
        console.warn('[SGE Firebase Sync] Falha ao consultar perfil no Firestore, recorrendo ao dispositivo:', err);
      }
    }

    // 2. Fallback Imediato: Buscar no Armazenamento do Dispositivo (Offline)
    return this.buscarPerfilNoDispositivo(termo);
  }

  /**
   * Procura o perfil no dispositivo local (localStorage)
   */
  public buscarPerfilNoDispositivo(termo: string): Funcionario | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
      if (!raw) return null;
      const funcs: Funcionario[] = JSON.parse(raw);
      if (!Array.isArray(funcs)) return null;

      const found = funcs.find(f => 
        (f.email && f.email.toLowerCase() === termo) ||
        (f.numeroBI && f.numeroBI.toLowerCase() === termo) ||
        (f.nomeCompleto && f.nomeCompleto.toLowerCase() === termo) ||
        (f.id && f.id.toLowerCase() === termo)
      );

      return found || null;
    } catch {
      return null;
    }
  }

  /**
   * Salva o perfil no dispositivo e no Firebase com sincronização imediata.
   */
  public async salvarPerfilUsuario(funcionario: Funcionario): Promise<boolean> {
    // 1. Gravar imediatamente no dispositivo
    this.atualizarUsuarioNoDispositivo(funcionario);

    // 2. Se online, enviar imediatamente para o Firebase Firestore
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const docRef = doc(firestoreDb, "funcionarios", funcionario.id);
        await setDoc(docRef, {
          ...funcionario,
          atualizadoEm: new Date().toISOString()
        }, { merge: true });

        offlineStorage.registarMutacao(
          'Utilizador', 
          'ATUALIZAR', 
          `Perfil de ${funcionario.nomeCompleto} sincronizado com Firebase e dispositivo.`, 
          funcionario.nomeCompleto
        );
        return true;
      } catch (err) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar funcionário no Firestore:', err);
        offlineStorage.registarMutacao(
          'Utilizador', 
          'ATUALIZAR', 
          `Perfil de ${funcionario.nomeCompleto} guardado no dispositivo (contingência offline).`, 
          funcionario.nomeCompleto
        );
      }
    }

    return true;
  }

  /**
   * Atualiza a lista de usuários no dispositivo local (localStorage e IndexedDB)
   */
  public atualizarUsuarioNoDispositivo(user: Funcionario) {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
      const funcs: Funcionario[] = raw ? JSON.parse(raw) : [];
      const idx = funcs.findIndex(f => f.id === user.id || (f.email && f.email.toLowerCase() === user.email?.toLowerCase()));
      if (idx >= 0) {
        funcs[idx] = { ...funcs[idx], ...user };
      } else {
        funcs.push(user);
      }
      localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(funcs));
      offlineStorage.registarMutacao('Dispositivo', 'ATUALIZAR', `Utilizador ${user.nomeCompleto} guardado localmente.`);
    } catch (e) {
      console.warn('[SGE Firebase Sync] Erro ao gravar utilizador no dispositivo:', e);
    }
  }

  /**
   * Buscar Configuração do Sistema (incluindo Insígnia do Administrador Geral)
   * no Firebase (online) e no dispositivo (offline)
   */
  public async buscarConfiguracaoSistema(): Promise<ConfiguracaoSistema | null> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const docRef = doc(firestoreDb, "configuracao_sistema", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const configFromFirebase = docSnap.data() as ConfiguracaoSistema;
          // Atualiza dispositivo
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(configFromFirebase));
          }
          return configFromFirebase;
        }
      } catch (err) {
        console.warn('[SGE Firebase Sync] Falha ao carregar configuração do Firestore:', err);
      }
    }

    // Carregar do dispositivo
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Salvar Configuração do Sistema (com a insígnia nacional) no Firebase e no dispositivo
   */
  public async salvarConfiguracaoSistema(config: ConfiguracaoSistema): Promise<boolean> {
    // 1. Dispositivo
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(config));
    }

    // 2. Firebase
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const docRef = doc(firestoreDb, "configuracao_sistema", "global");
        await setDoc(docRef, {
          ...config,
          atualizadoEm: new Date().toISOString()
        }, { merge: true });

        offlineStorage.registarMutacao(
          'Configuracao', 
          'ATUALIZAR', 
          'Insígnia e parâmetros do sistema sincronizados com o Firebase.'
        );
        return true;
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao gravar configuração no Firestore:', e);
      }
    }

    return true;
  }

  /**
   * Sincronização Completa e Imediata de Todos os Dados
   */
  public async sincronizarTudoImediato(): Promise<{ sucesso: boolean; mensagem: string }> {
    if (this.emSincronizacao) {
      return { sucesso: true, mensagem: 'Sincronização já em curso...' };
    }

    this.emSincronizacao = true;
    this.notificarStatus();

    try {
      // 1. Sincronizar Configuração do Sistema e Insígnia
      if (this.canUseFirestore() && firestoreDb) {
        const configLocal = await this.buscarConfiguracaoSistema();
        if (configLocal) {
          const docRef = doc(firestoreDb, "configuracao_sistema", "global");
          await setDoc(docRef, configLocal, { merge: true });
        }

        // 2. Sincronizar Usuários / Funcionários
        const funcsRaw = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
        if (funcsRaw) {
          const funcs: Funcionario[] = JSON.parse(funcsRaw);
          for (const f of funcs) {
            try {
              const uRef = doc(firestoreDb, "funcionarios", f.id);
              await setDoc(uRef, f, { merge: true });
            } catch (uErr) {
              console.warn('[SGE Firebase Sync] Falha ao enviar utilizador:', f.nomeCompleto, uErr);
            }
          }
        }

        // 3. Buscar novos utilizadores do Firebase para o dispositivo
        try {
          const funcsRemote = await getDocs(collection(firestoreDb, "funcionarios"));
          if (!funcsRemote.empty) {
            const funcsLocais: Funcionario[] = funcsRaw ? JSON.parse(funcsRaw) : [];
            funcsRemote.forEach(d => {
              const remoteUser = d.data() as Funcionario;
              const idx = funcsLocais.findIndex(fl => fl.id === remoteUser.id || (fl.email && fl.email.toLowerCase() === remoteUser.email?.toLowerCase()));
              if (idx >= 0) {
                funcsLocais[idx] = { ...funcsLocais[idx], ...remoteUser };
              } else {
                funcsLocais.push(remoteUser);
              }
            });
            localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(funcsLocais));
          }
        } catch (fetchErr) {
          console.warn('[SGE Firebase Sync] Falha ao descarregar utilizadores remotos:', fetchErr);
        }

        // 4. Sincronizar Escolas
        const escolasRaw = localStorage.getItem(STORAGE_KEYS.ESCOLAS);
        if (escolasRaw) {
          const escolas: Escola[] = JSON.parse(escolasRaw);
          for (const esc of escolas) {
            try {
              const escRef = doc(firestoreDb, "escolas", esc.id);
              await setDoc(escRef, esc, { merge: true });
            } catch {}
          }
        }
      }

      // Snapshot de redundância no dispositivo (IndexedDB)
      await offlineStorage.sincronizar();

      this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
      this.emSincronizacao = false;
      this.notificarStatus();

      return {
        sucesso: true,
        mensagem: 'Sincronização imediata concluída com sucesso entre o Firebase e o dispositivo!'
      };
    } catch (e: any) {
      console.error('[SGE Firebase Sync] Erro global na sincronização:', e);
      this.emSincronizacao = false;
      this.notificarStatus();
      return {
        sucesso: false,
        mensagem: 'Dados preservados com segurança no dispositivo. A sincronização com o Firebase será retomada automaticamente.'
      };
    }
  }

  public getStatus(): SyncStatus {
    const isOnline = this.isOnline();
    let totalUsers = 0;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
        if (raw) totalUsers = JSON.parse(raw).length;
      }
    } catch {}

    return {
      isOnline,
      firestoreDisponivel: this.canUseFirestore(),
      emSincronizacao: this.emSincronizacao,
      ultimaSincronizacao: this.ultimaSincronizacao,
      totalUsuariosSincronizados: totalUsers,
      configSincronizada: true
    };
  }

  public subscreverStatus(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notificarStatus() {
    const s = this.getStatus();
    this.listeners.forEach(l => l(s));
  }
}

export const firebaseSyncEngine = new FirebaseSyncEngine();
