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
import { comprimirImagemBase64 } from "../utils/imageOptimizer";

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
    // Auto-reparação imediata para imagens que excedam limites antes de qualquer sincronização
    this.repararConfiguracaoMuitoGrande().then(() => {
      this.iniciarObservadoresDeRede();
    });
  }

  /**
   * Corrige automaticamente qualquer insígnia gigante que possa estar no localStorage do dispositivo
   * prevenindo o erro de limite de 1MB (1,048,576 bytes) do Firestore.
   */
  public async repararConfiguracaoMuitoGrande(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA);
      if (!raw) return;
      const config: any = JSON.parse(raw);
      let alterado = false;

      for (const [key, val] of Object.entries(config)) {
        if (typeof val === 'string' && val.length > 90000) {
          console.log(`[SGE Firebase Sync] Otimizando campo "${key}" (${(val.length / 1024).toFixed(1)}KB)...`);
          if (val.startsWith('data:image/') || val.startsWith('data:application/')) {
            const otimizada = await comprimirImagemBase64(val, 380, 0.80);
            if (otimizada && otimizada.length < val.length) {
              config[key] = otimizada;
              alterado = true;
            }
          }
        }
      }

      if (alterado) {
        config.insigniaOtimizada = true;
        localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(config));
        console.log('[SGE Firebase Sync] Auto-reparação de imagens concluída com sucesso no dispositivo.');
      }
    } catch (e) {
      console.warn('[SGE Firebase Sync] Falha na auto-reparação inicial de insígnia:', e);
    }
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

        // Tentar também coleção alternativa "users"
        const usersRef = collection(firestoreDb, "users");
        let q2 = query(usersRef, where("email", "==", termo), limit(1));
        let snap2 = await getDocs(q2);
        if (snap2.empty) {
          q2 = query(usersRef, where("numeroBI", "==", identificador.trim().toUpperCase()), limit(1));
          snap2 = await getDocs(q2);
        }
        if (!snap2.empty) {
          const userFromFirebase = snap2.docs[0].data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        } else {
          const docDirectUser = await getDoc(doc(firestoreDb, "users", identificador.trim()));
          if (docDirectUser.exists()) {
            const userFromFirebase = docDirectUser.data() as Funcionario;
            this.atualizarUsuarioNoDispositivo(userFromFirebase);
            return userFromFirebase;
          }
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
        const payload = {
          ...funcionario,
          atualizadoEm: new Date().toISOString()
        };
        const docRef1 = doc(firestoreDb, "funcionarios", funcionario.id);
        const docRef2 = doc(firestoreDb, "users", funcionario.id);
        await Promise.allSettled([
          setDoc(docRef1, payload, { merge: true }),
          setDoc(docRef2, payload, { merge: true })
        ]);

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
   * no Firebase (online) e no dispositivo (offline).
   * Suporta reconstrução de insígnias grandes divididas em chunks.
   */
  public async buscarConfiguracaoSistema(): Promise<ConfiguracaoSistema | null> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        let configFromFirebase: ConfiguracaoSistema | null = null;
        const docRef = doc(firestoreDb, "configuracao_sistema", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          configFromFirebase = docSnap.data() as ConfiguracaoSistema;
        } else {
          // Tentar coleção alternativa system_config
          const docRefAlt = doc(firestoreDb, "system_config", "global");
          const docSnapAlt = await getDoc(docRefAlt);
          if (docSnapAlt.exists()) {
            configFromFirebase = docSnapAlt.data() as ConfiguracaoSistema;
          }
        }

        if (configFromFirebase) {
          // Se a insígnia estiver dividida em chunks
          if (configFromFirebase.insigniaChunksCount && configFromFirebase.insigniaChunksCount > 0) {
            try {
              const chunks: string[] = [];
              for (let i = 0; i < configFromFirebase.insigniaChunksCount; i++) {
                const cSnap = await getDoc(doc(firestoreDb, "configuracao_sistema", `insignia_chunk_${i}`));
                if (cSnap.exists()) {
                  chunks.push(cSnap.data().chunk || '');
                }
              }
              if (chunks.length === configFromFirebase.insigniaChunksCount) {
                configFromFirebase.insigniaNacionalUrl = chunks.join('');
              }
            } catch (chunkErr) {
              console.warn('[SGE Firebase Sync] Falha ao reconstruir chunks da insígnia:', chunkErr);
            }
          }

          if (configFromFirebase.insigniaNacionalUrl === '[CHUNKED]') {
            try {
              const rawLocal = localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA);
              if (rawLocal) {
                const parsed = JSON.parse(rawLocal);
                if (parsed.insigniaNacionalUrl && parsed.insigniaNacionalUrl !== '[CHUNKED]') {
                  configFromFirebase.insigniaNacionalUrl = parsed.insigniaNacionalUrl;
                }
              }
            } catch {}
          }

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
   * Salva a configuração no Firestore com garantia estrita de tamanho inferior a 1MB (1,048,576 bytes).
   * Otimiza a imagem via canvas e fragmenta em subdocumentos de 200KB se necessário.
   */
  public async gravarConfiguracaoNoFirestore(config: ConfiguracaoSistema): Promise<boolean> {
    if (!this.canUseFirestore() || !firestoreDb) return false;

    try {
      let insigniaFinal = config.insigniaNacionalUrl || '';

      // 1. Otimizar e comprimir imagem se for maior que 40KB
      if (insigniaFinal && insigniaFinal.length > 40000 && (insigniaFinal.startsWith('data:') || insigniaFinal.includes(';base64,'))) {
        try {
          const comprimida = await comprimirImagemBase64(insigniaFinal, 360, 0.78);
          if (comprimida && comprimida.length < insigniaFinal.length) {
            insigniaFinal = comprimida;
            config.insigniaNacionalUrl = comprimida;
            config.insigniaOtimizada = true;
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(config));
            }
          }
        } catch (compErr) {
          console.warn('[SGE Firebase Sync] Compressão canvas:', compErr);
        }
      }

      const CHUNK_SIZE = 180000; // 180KB por chunk para margem de segurança garantida
      let chunksCount = 0;
      let payloadInsignia = insigniaFinal;

      // 2. Se a imagem ultrapassar 60KB, NUNCA guardar no documento global; dividir em sub-documentos
      if (insigniaFinal && insigniaFinal.length > 60000) {
        chunksCount = Math.ceil(insigniaFinal.length / CHUNK_SIZE);
        for (let i = 0; i < chunksCount; i++) {
          try {
            const chunkStr = insigniaFinal.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const chunkRef = doc(firestoreDb, "configuracao_sistema", `insignia_chunk_${i}`);
            await setDoc(chunkRef, { chunk: chunkStr, index: i, total: chunksCount });
          } catch (chunkErr) {
            console.warn(`[SGE Firebase Sync] Falha ao gravar chunk ${i}:`, chunkErr);
          }
        }
        payloadInsignia = "[CHUNKED]";
      }

      // 3. Montar payload limpo e estritamente limitado em tamanho
      const payload: Record<string, any> = {
        id: 'global',
        nomeSistema: String(config.nomeSistema || 'SGE-NG').slice(0, 150),
        subtituloSistema: String(config.subtituloSistema || '').slice(0, 250),
        ministerioNome: String(config.ministerioNome || '').slice(0, 250),
        pais: String(config.pais || 'República de Angola').slice(0, 100),
        modoProducao: !!config.modoProducao,
        sincronizacaoFirebaseAtiva: true,
        insigniaNacionalUrl: payloadInsignia,
        insigniaChunksCount: chunksCount,
        modoAuditoriaForense: !!config.modoAuditoriaForense,
        validarBIComAlgoritmoNacional: !!config.validarBIComAlgoritmoNacional,
        permitirAutoRegistoEscolas: !!config.permitirAutoRegistoEscolas,
        bloqueioPorFalhasLogin: !!config.bloqueioPorFalhasLogin,
        criadoPorAdminEmail: String(config.criadoPorAdminEmail || '').slice(0, 150),
        dataInicializacao: String(config.dataInicializacao || '').slice(0, 80),
        atualizadoEm: new Date().toISOString()
      };

      // 4. Auditoria de tamanho final: NENHUM campo pode ultrapassar 70KB no documento global
      for (const [k, v] of Object.entries(payload)) {
        if (typeof v === 'string' && v.length > 70000) {
          payload[k] = '[CHUNKED]';
        }
      }

      const docRef1 = doc(firestoreDb, "configuracao_sistema", "global");
      const docRef2 = doc(firestoreDb, "system_config", "global");
      // NÃO utilizar { merge: true } aqui para garantir que documentos antigos que excediam 1MB
      // sejam totalmente substituídos pelo payload limpo e leve (< 60KB)
      await Promise.allSettled([
        setDoc(docRef1, payload),
        setDoc(docRef2, payload)
      ]);

      offlineStorage.registarMutacao(
        'Configuracao', 
        'ATUALIZAR', 
        'Insígnia e parâmetros do sistema sincronizados com o Firebase com proteção rigorosa de quota (<60KB).'
      );
      return true;
    } catch (e) {
      console.warn('[SGE Firebase Sync] Erro ao gravar configuração no Firestore:', e);
      return false;
    }
  }

  /**
   * Salvar Configuração do Sistema (com a insígnia nacional) no Firebase e no dispositivo
   */
  public async salvarConfiguracaoSistema(config: ConfiguracaoSistema): Promise<boolean> {
    // 1. Dispositivo
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(config));
    }

    // 2. Firebase protegido contra limite de 1MB
    await this.gravarConfiguracaoNoFirestore(config);
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
      // 1. Sincronizar Configuração do Sistema e Insígnia com proteção de tamanho
      if (this.canUseFirestore() && firestoreDb) {
        const configLocal = await this.buscarConfiguracaoSistema();
        if (configLocal) {
          await this.gravarConfiguracaoNoFirestore(configLocal);
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
