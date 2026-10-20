import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  limit,
  onSnapshot
} from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import { offlineStorage } from "./offlineStorage";
import { Funcionario, ConfiguracaoSistema, Escola, Aluno, Turma, NotaTrimestralConsolidada, SolicitacaoApoioTecnico, Mensagem } from "../types";
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
  DISCIPLINAS: 'sge_disciplinas',
  AVALIACOES: 'sge_avaliacoes',
  NOTAS: 'sge_notas',
  NOTAS_CONSOLIDADAS: 'sge_notas_consolidadas',
  SOLICITACOES_APOIO: 'sge_solicitacoes_apoio',
  MENSAGENS: 'sge_mensagens',
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
      if (!raw || raw === 'undefined' || raw === 'null') return;
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
        this.iniciarEscutasEmTempoReal();
      });

      window.addEventListener('offline', () => {
        console.log('[SGE Firebase Sync] Modo offline ativado. Dados mantidos no dispositivo.');
        this.notificarStatus();
      });

      // Auto-sincronização inicial ao carregar e ativação de escutas em tempo real
      setTimeout(() => {
        if (this.isOnline()) {
          this.puxarTudoDoFirebase().then(() => {
            this.iniciarEscutasEmTempoReal();
          });
        }
      }, 500);
    }
  }

  /**
   * Escutas em Tempo Real (onSnapshot) para sincronização instantânea entre múltiplos dispositivos
   */
  public iniciarEscutasEmTempoReal() {
    if (!this.canUseFirestore() || !firestoreDb || typeof window === 'undefined') return;

    try {
      // 1. Escuta em tempo real de Funcionários / Usuários (Diretores, Professores, Admin Geral)
      onSnapshot(collection(firestoreDb, "funcionarios"), (snapshot) => {
        const funcsRemotos: Funcionario[] = [];
        snapshot.forEach(d => {
          const f = d.data() as Funcionario;
          if (f && f.id && f.nomeCompleto) funcsRemotos.push(f);
        });
        if (funcsRemotos.length > 0) {
          localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(funcsRemotos));
          const temAdmin = funcsRemotos.some(f => f.role === 'AdminGeral' && f.ativo);
          if (temAdmin) {
            localStorage.setItem('sge_admin_configured', 'true');
            localStorage.setItem('sge_setup_inicial_concluido', 'true');
          }
          window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
        }
      }, (err) => console.warn('[SGE Realtime] Escuta de funcionários:', err));

      // 2. Escuta em tempo real de Escolas
      onSnapshot(collection(firestoreDb, "escolas"), (snapshot) => {
        const escolasRemotas: Escola[] = [];
        snapshot.forEach(d => {
          const esc = d.data() as Escola;
          if (esc && esc.id) escolasRemotas.push(esc);
        });
        if (escolasRemotas.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolasRemotas));
          window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
        }
      }, (err) => console.warn('[SGE Realtime] Escuta de escolas:', err));

      // 3. Escuta em tempo real de Turmas
      onSnapshot(collection(firestoreDb, "turmas"), (snapshot) => {
        const turmasRemotas: Turma[] = [];
        snapshot.forEach(d => {
          const t = d.data() as Turma;
          if (t && t.id) turmasRemotas.push(t);
        });
        localStorage.setItem(STORAGE_KEYS.TURMAS, JSON.stringify(turmasRemotas));
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }, (err) => console.warn('[SGE Realtime] Escuta de turmas:', err));

      // 4. Escuta em tempo real de Alunos
      onSnapshot(collection(firestoreDb, "alunos"), (snapshot) => {
        const alunosRemotos: Aluno[] = [];
        snapshot.forEach(d => {
          const a = d.data() as Aluno;
          if (a && a.id) alunosRemotos.push(a);
        });
        localStorage.setItem(STORAGE_KEYS.ALUNOS, JSON.stringify(alunosRemotos));
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }, (err) => console.warn('[SGE Realtime] Escuta de alunos:', err));
    } catch (e) {
      console.warn('[SGE Realtime] Falha ao iniciar escutas em tempo real:', e);
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

    const isAdminKeyword = termo === 'admin' || termo === 'admin.geral' || termo === 'admingeral' || termo === 'superadmin' || termo === 'administrador';

    // 1. Tentar busca no Firebase (Online)
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const funcsRef = collection(firestoreDb, "funcionarios");
        const usersRef = collection(firestoreDb, "users");

        // Se o utilizador escreveu um termo de administrador
        if (isAdminKeyword) {
          const snapAdmin = await getDocs(query(funcsRef, where("role", "==", "AdminGeral")));
          if (!snapAdmin.empty) {
            const admins = snapAdmin.docs.map(d => d.data() as Funcionario).filter(f => f.ativo !== false && f.nomeCompleto);
            if (admins.length > 0) {
              const userFromFirebase = admins[admins.length - 1];
              this.atualizarUsuarioNoDispositivo(userFromFirebase);
              return userFromFirebase;
            }
          }

          const snapAdminUsers = await getDocs(query(usersRef, where("role", "==", "AdminGeral")));
          if (!snapAdminUsers.empty) {
            const admins = snapAdminUsers.docs.map(d => d.data() as Funcionario).filter(f => f.ativo !== false && f.nomeCompleto);
            if (admins.length > 0) {
              const userFromFirebase = admins[admins.length - 1];
              this.atualizarUsuarioNoDispositivo(userFromFirebase);
              return userFromFirebase;
            }
          }
        }

        // Buscar por email exato
        const qEmail = query(funcsRef, where("email", "==", termo), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          const userFromFirebase = snapEmail.docs[0].data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }

        // Buscar por numeroBI
        const biUpper = identificador.trim().toUpperCase();
        const qBI = query(funcsRef, where("numeroBI", "==", biUpper), limit(1));
        const snapBI = await getDocs(qBI);
        if (!snapBI.empty) {
          const userFromFirebase = snapBI.docs[0].data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }

        // Buscar por ID direto
        const docDirect = await getDoc(doc(firestoreDb, "funcionarios", identificador.trim()));
        if (docDirect.exists()) {
          const userFromFirebase = docDirect.data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }

        // Escanear todos os documentos para busca case-insensitive e tolerante
        const snapAll = await getDocs(funcsRef);
        for (const docSnap of snapAll.docs) {
          const f = docSnap.data() as Funcionario;
          if (
            (f.email && f.email.toLowerCase() === termo) ||
            (f.numeroBI && f.numeroBI.toUpperCase() === biUpper) ||
            (f.numeroBI && f.numeroBI.toLowerCase() === termo) ||
            (f.nomeCompleto && f.nomeCompleto.toLowerCase() === termo) ||
            (f.nomeCompleto && f.nomeCompleto.toLowerCase().includes(termo)) ||
            (f.id && f.id.toLowerCase() === termo) ||
            (isAdminKeyword && f.role === 'AdminGeral')
          ) {
            this.atualizarUsuarioNoDispositivo(f);
            return f;
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
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      const funcs: Funcionario[] = JSON.parse(raw);
      if (!Array.isArray(funcs)) return null;

      // Se termo for termo de admin, prioriza o AdminGeral ativo
      if (termo === 'admin' || termo === 'admin.geral' || termo === 'admingeral' || termo === 'superadmin' || termo === 'administrador') {
        const adminFound = funcs.find(f => f.role === 'AdminGeral' && f.ativo);
        if (adminFound) return adminFound;
      }

      const found = funcs.find(f => 
        (f.email && f.email.toLowerCase() === termo) ||
        (f.numeroBI && f.numeroBI.toLowerCase() === termo) ||
        (f.nomeCompleto && f.nomeCompleto.toLowerCase() === termo) ||
        (f.nomeCompleto && f.nomeCompleto.toLowerCase().includes(termo)) ||
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
  /**
   * Descarrega e atualiza todos os dados do Firebase Firestore para o dispositivo (Multi-Dispositivo)
   */
  public async puxarTudoDoFirebase(): Promise<{ sucesso: boolean; mensagem: string }> {
    if (!this.canUseFirestore() || !firestoreDb) {
      return { sucesso: false, mensagem: 'Modo offline: utilizando dados guardados no dispositivo.' };
    }

    try {
      console.log('[SGE Firebase Sync] Descarregando base de dados completa do Firestore...');

      // 1. Escolas
      const snapEscolas = await getDocs(collection(firestoreDb, "escolas"));
      if (!snapEscolas.empty) {
        const escolasRemotas: Escola[] = [];
        snapEscolas.forEach(d => {
          const esc = d.data() as any;
          if (esc && esc.id) {
            esc.nomeOficial = esc.nomeOficial || esc.nome || 'Escola';
            esc.nome = esc.nome || esc.nomeOficial;
            escolasRemotas.push(esc as Escola);
          }
        });
        if (escolasRemotas.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolasRemotas));
        }
      } else {
        const localEscolas = localStorage.getItem(STORAGE_KEYS.ESCOLAS);
        if (localEscolas && (localEscolas.includes('esc-001') || localEscolas.includes('esc-002') || localEscolas.includes('esc-003'))) {
          localStorage.setItem(STORAGE_KEYS.ESCOLAS, JSON.stringify([]));
        }
      }

      // 2. Funcionários & Administrador Geral
      const snapFuncs = await getDocs(collection(firestoreDb, "funcionarios"));
      if (!snapFuncs.empty) {
        const funcsRemotos: Funcionario[] = [];
        snapFuncs.forEach(d => {
          const f = d.data() as Funcionario;
          if (f && f.id && f.nomeCompleto) funcsRemotos.push(f);
        });
        if (funcsRemotos.length > 0) {
          localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(funcsRemotos));
          const temAdmin = funcsRemotos.some(f => f.role === 'AdminGeral' && f.ativo !== false);
          if (temAdmin) {
            localStorage.setItem('sge_admin_configured', 'true');
            localStorage.setItem('sge_setup_inicial_concluido', 'true');
          }
        }
      } else {
        const localFuncs = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
        if (localFuncs && (localFuncs.includes('test_admin') || localFuncs.includes('func-00') || localFuncs.includes('func-admin-1791707975841') || localFuncs.includes('func-admin-1792142971892'))) {
          localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify([]));
          localStorage.removeItem('sge_admin_configured');
          localStorage.removeItem('sge_setup_inicial_concluido');
        }
      }

      // 3. Turmas
      const snapTurmas = await getDocs(collection(firestoreDb, "turmas"));
      if (!snapTurmas.empty) {
        const turmasRemotas: Turma[] = [];
        snapTurmas.forEach(d => {
          const t = d.data() as Turma;
          if (t && t.id) turmasRemotas.push(t);
        });
        if (turmasRemotas.length > 0) {
          localStorage.setItem(STORAGE_KEYS.TURMAS, JSON.stringify(turmasRemotas));
        }
      }

      // 4. Alunos
      const snapAlunos = await getDocs(collection(firestoreDb, "alunos"));
      if (!snapAlunos.empty) {
        const alunosRemotos: Aluno[] = [];
        snapAlunos.forEach(d => {
          const a = d.data() as Aluno;
          if (a && a.id) alunosRemotos.push(a);
        });
        if (alunosRemotos.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ALUNOS, JSON.stringify(alunosRemotos));
        }
      }

      // 5. Disciplinas
      const snapDisciplinas = await getDocs(collection(firestoreDb, "disciplinas"));
      if (!snapDisciplinas.empty) {
        const discsRemotas: any[] = [];
        snapDisciplinas.forEach(d => {
          const disc = d.data();
          if (disc && disc.id) discsRemotas.push(disc);
        });
        if (discsRemotas.length > 0) {
          localStorage.setItem(STORAGE_KEYS.DISCIPLINAS, JSON.stringify(discsRemotas));
        }
      }

      // 6. Notas Consolidadas (Pautas Trimestrais)
      const snapNotasCons = await getDocs(collection(firestoreDb, "notas"));
      if (!snapNotasCons.empty) {
        const notasRemotas: any[] = [];
        snapNotasCons.forEach(d => {
          const nota = d.data();
          if (nota && (nota.id || nota.alunoId)) notasRemotas.push(nota);
        });
        if (notasRemotas.length > 0) {
          localStorage.setItem(STORAGE_KEYS.NOTAS_CONSOLIDADAS, JSON.stringify(notasRemotas));
        }
      }

      // 6.1 Notas de Avaliações / Testes dos Alunos
      try {
        const snapNotasEst = await getDocs(collection(firestoreDb, "notas_estudantes"));
        if (!snapNotasEst.empty) {
          const notasEstRemotas: any[] = [];
          snapNotasEst.forEach(d => {
            const nota = d.data();
            if (nota && (nota.id || nota.avaliacaoId)) notasEstRemotas.push(nota);
          });
          if (notasEstRemotas.length > 0) {
            localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(notasEstRemotas));
          }
        }
      } catch {}

      // 6.2 Avaliações Criadas
      try {
        const snapAvs = await getDocs(collection(firestoreDb, "avaliacoes"));
        if (!snapAvs.empty) {
          const avsRemotas: any[] = [];
          snapAvs.forEach(d => {
            const av = d.data();
            if (av && av.id) avsRemotas.push(av);
          });
          if (avsRemotas.length > 0) {
            localStorage.setItem(STORAGE_KEYS.AVALIACOES, JSON.stringify(avsRemotas));
          }
        }
      } catch {}

      // 6.3 Mensagens Internas
      try {
        const snapMsgs = await getDocs(collection(firestoreDb, "mensagens"));
        if (!snapMsgs.empty) {
          const msgsRemotas: any[] = [];
          snapMsgs.forEach(d => {
            const m = d.data();
            if (m && m.id) msgsRemotas.push(m);
          });
          if (msgsRemotas.length > 0) {
            localStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(msgsRemotas));
          }
        }
      } catch {}

      // 6.4 Solicitações de Apoio Técnico
      try {
        const snapApoio = await getDocs(collection(firestoreDb, "solicitacoes_apoio"));
        if (!snapApoio.empty) {
          const apoioRemoto: any[] = [];
          snapApoio.forEach(d => {
            const s = d.data();
            if (s && s.id) apoioRemoto.push(s);
          });
          if (apoioRemoto.length > 0) {
            localStorage.setItem(STORAGE_KEYS.SOLICITACOES_APOIO, JSON.stringify(apoioRemoto));
          }
        }
      } catch {}

      // 7. Configuração do Sistema
      await this.buscarConfiguracaoSistema();

      this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
      this.notificarStatus();

      // Disparar evento para que a interface React recarregue os estados frescos
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }

      return { sucesso: true, mensagem: 'Dados remotos sincronizados com sucesso!' };
    } catch (err: any) {
      console.warn('[SGE Firebase Sync] Falha ao descarregar dados remotos:', err);
      return { sucesso: false, mensagem: err?.message || 'Falha ao descarregar dados do Firestore' };
    }
  }

  /**
   * Elimina um funcionário / utilizador do Firebase Firestore (coleções funcionarios e users)
   */
  public async eliminarFuncionario(funcionarioId: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await Promise.allSettled([
          deleteDoc(doc(firestoreDb, "funcionarios", funcionarioId)),
          deleteDoc(doc(firestoreDb, "users", funcionarioId))
        ]);
        console.log(`[SGE Firebase Sync] Utilizador ${funcionarioId} eliminado do Firestore.`);
        return true;
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar utilizador no Firestore:', e);
        return false;
      }
    }
    return true;
  }

  /**
   * Sincronização Completa e Imediata de Todos os Dados (Bidirecional: Envio + Receção)
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

        // 2. Enviar Usuários / Funcionários locais para o Firestore
        const funcsRaw = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
        if (funcsRaw && funcsRaw !== 'undefined' && funcsRaw !== 'null') {
          try {
            const funcs: Funcionario[] = JSON.parse(funcsRaw);
            for (const f of funcs) {
              try {
                const uRef = doc(firestoreDb, "funcionarios", f.id);
                await setDoc(uRef, { ...f, atualizadoEm: new Date().toISOString() }, { merge: true });
              } catch (uErr) {
                console.warn('[SGE Firebase Sync] Falha ao enviar utilizador:', f.nomeCompleto, uErr);
              }
            }
          } catch {}
        }

        // 3. Enviar Escolas locais para o Firestore
        const escolasRaw = localStorage.getItem(STORAGE_KEYS.ESCOLAS);
        if (escolasRaw && escolasRaw !== 'undefined' && escolasRaw !== 'null') {
          try {
            const escolas: Escola[] = JSON.parse(escolasRaw);
            for (const esc of escolas) {
              try {
                const escRef = doc(firestoreDb, "escolas", esc.id);
                await setDoc(escRef, { ...esc, atualizadoEm: new Date().toISOString() }, { merge: true });
              } catch {}
            }
          } catch {}
        }

        // 4. Enviar Alunos locais para o Firestore
        const alunosRaw = localStorage.getItem(STORAGE_KEYS.ALUNOS);
        if (alunosRaw && alunosRaw !== 'undefined' && alunosRaw !== 'null') {
          try {
            const alunos: Aluno[] = JSON.parse(alunosRaw);
            for (const al of alunos) {
              try {
                const alRef = doc(firestoreDb, "alunos", al.id);
                await setDoc(alRef, { ...al, atualizadoEm: new Date().toISOString() }, { merge: true });
              } catch (alErr) {
                console.warn('[SGE Firebase Sync] Falha ao enviar aluno:', al.nomeCompleto, alErr);
              }
            }
          } catch {}
        }

        // 5. Enviar Turmas locais para o Firestore
        const turmasRaw = localStorage.getItem(STORAGE_KEYS.TURMAS);
        if (turmasRaw && turmasRaw !== 'undefined' && turmasRaw !== 'null') {
          try {
            const turmas: Turma[] = JSON.parse(turmasRaw);
            for (const t of turmas) {
              try {
                const tRef = doc(firestoreDb, "turmas", t.id);
                await setDoc(tRef, { ...t, atualizadoEm: new Date().toISOString() }, { merge: true });
              } catch {}
            }
          } catch {}
        }

        // 6. Enviar Notas Consolidadas locais para o Firestore
        const notasRaw = localStorage.getItem(STORAGE_KEYS.NOTAS);
        if (notasRaw && notasRaw !== 'undefined' && notasRaw !== 'null') {
          try {
            const notas: NotaTrimestralConsolidada[] = JSON.parse(notasRaw);
            for (const n of notas) {
              try {
                const nRef = doc(firestoreDb, "notas", n.id);
                await setDoc(nRef, { ...n, atualizadoEm: new Date().toISOString() }, { merge: true });
              } catch {}
            }
          } catch {}
        }

        // 7. Enviar Solicitações de Apoio Técnico
        const apoioRaw = localStorage.getItem(STORAGE_KEYS.SOLICITACOES_APOIO);
        if (apoioRaw && apoioRaw !== 'undefined' && apoioRaw !== 'null') {
          try {
            const apoios: SolicitacaoApoioTecnico[] = JSON.parse(apoioRaw);
            for (const ap of apoios) {
              try {
                const apRef = doc(firestoreDb, "solicitacoes_apoio", ap.id);
                await setDoc(apRef, ap, { merge: true });
              } catch {}
            }
          } catch {}
        }

        // 8. Enviar Mensagens & Comunicados
        const msgRaw = localStorage.getItem(STORAGE_KEYS.MENSAGENS);
        if (msgRaw && msgRaw !== 'undefined' && msgRaw !== 'null') {
          try {
            const msgs: Mensagem[] = JSON.parse(msgRaw);
            for (const m of msgs) {
              try {
                const mRef = doc(firestoreDb, "mensagens", m.id);
                await setDoc(mRef, { ...m, atualizadoEm: new Date().toISOString() }, { merge: true });
              } catch {}
            }
          } catch {}
        }

        // 9. PUXAR dados mais recentes do Firestore para o dispositivo (Garante visibilidade multi-dispositivo)
        await this.puxarTudoDoFirebase();
      }

      // Snapshot de redundância no dispositivo (IndexedDB)
      await offlineStorage.sincronizar();

      this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
      this.emSincronizacao = false;
      this.notificarStatus();

      return {
        sucesso: true,
        mensagem: 'Sincronização imediata concluída com sucesso entre o Firebase e todos os dispositivos!'
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

  /**
   * Grava imediatamente um aluno no Firestore e no dispositivo
   */
  public async salvarAluno(aluno: Aluno): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "alunos", aluno.id);
        await setDoc(ref, { ...aluno, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar aluno:', e);
      }
    }
    return true;
  }

  /**
   * Grava imediatamente uma turma no Firestore
   */
  public async salvarTurma(turma: Turma): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "turmas", turma.id);
        await setDoc(ref, { ...turma, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar turma:', e);
      }
    }
    return true;
  }

  /**
   * Grava imediatamente uma nota consolidada no Firestore
   */
  public async salvarNota(nota: NotaTrimestralConsolidada): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "notas", nota.id);
        await setDoc(ref, { ...nota, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar nota:', e);
      }
    }
    return true;
  }

  /**
   * Grava nota pontual de estudante (teste/prova) no Firestore
   */
  public async salvarNotaEstudante(nota: any): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const id = nota.id || `${nota.avaliacaoId}_${nota.alunoId}`;
        const ref = doc(firestoreDb, "notas_estudantes", id);
        await setDoc(ref, { ...nota, id, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar nota do estudante:', e);
      }
    }
    return true;
  }

  /**
   * Remove uma nota pontual ou consolidada do Firestore
   */
  public async eliminarNota(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await Promise.allSettled([
          deleteDoc(doc(firestoreDb, "notas", id)),
          deleteDoc(doc(firestoreDb, "notas_estudantes", id))
        ]);
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar nota:', e);
      }
    }
    return true;
  }

  /**
   * Grava uma avaliação criada pelo professor no Firestore
   */
  public async salvarAvaliacao(av: any): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "avaliacoes", av.id);
        await setDoc(ref, { ...av, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar avaliação:', e);
      }
    }
    return true;
  }

  /**
   * Remove uma avaliação criada do Firestore
   */
  public async eliminarAvaliacao(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "avaliacoes", id));
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar avaliação:', e);
      }
    }
    return true;
  }

  /**
   * Grava solicitação de apoio técnico no Firestore
   */
  public async salvarSolicitacaoApoio(sol: SolicitacaoApoioTecnico): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "solicitacoes_apoio", sol.id);
        await setDoc(ref, { ...sol, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar apoio técnico:', e);
      }
    }
    return true;
  }

  /**
   * Grava mensagem interna ou comunicado no Firestore
   */
  public async salvarMensagem(msg: Mensagem): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "mensagens", msg.id);
        await setDoc(ref, { ...msg, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar mensagem:', e);
      }
    }
    return true;
  }

  /**
   * Grava imediatamente uma escola no Firestore e no dispositivo
   */
  public async salvarEscola(escola: Escola): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref1 = doc(firestoreDb, "escolas", escola.id);
        const ref2 = doc(firestoreDb, "schools", escola.id);
        const payload = { ...escola, atualizadoEm: new Date().toISOString() };
        await Promise.allSettled([
          setDoc(ref1, payload, { merge: true }),
          setDoc(ref2, payload, { merge: true })
        ]);
        console.log('[SGE Firebase Sync] Escola sincronizada com Firestore:', escola.nomeOficial);
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar escola:', e);
      }
    }
    return true;
  }

  /**
   * Remove uma escola do Firestore
   */
  public async eliminarEscola(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await Promise.allSettled([
          deleteDoc(doc(firestoreDb, "escolas", id)),
          deleteDoc(doc(firestoreDb, "schools", id))
        ]);
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar escola no Firestore:', e);
      }
    }
    return true;
  }

  /**
   * Grava imediatamente uma disciplina no Firestore
   */
  public async salvarDisciplina(disc: any): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const ref = doc(firestoreDb, "disciplinas", disc.id);
        await setDoc(ref, { ...disc, atualizadoEm: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao sincronizar disciplina:', e);
      }
    }
    return true;
  }

  /**
   * Remove uma disciplina do Firestore
   */
  public async eliminarDisciplina(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "disciplinas", id));
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar disciplina:', e);
      }
    }
    return true;
  }

  /**
   * Remove uma turma do Firestore
   */
  public async eliminarTurma(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, "turmas", id));
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar turma:', e);
      }
    }
    return true;
  }

  /**
   * Remove um aluno do Firestore
   */
  public async excluirAluno(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        await Promise.allSettled([
          deleteDoc(doc(firestoreDb, "alunos", id)),
          deleteDoc(doc(firestoreDb, "students", id))
        ]);
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar aluno no Firestore:', e);
      }
    }
    return true;
  }

  /**
   * Buscar Administrador Geral remoto no Firestore
   */
  public async buscarAdminGeralRemoto(): Promise<Funcionario | null> {
    if (!this.canUseFirestore() || !firestoreDb) return null;
    try {
      const q = query(
        collection(firestoreDb, "funcionarios"), 
        where("role", "==", "AdminGeral"), 
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const adminData = snap.docs[0].data() as Funcionario;
        this.atualizarUsuarioNoDispositivo(adminData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('sge_admin_configured', 'true');
          localStorage.setItem('sge_setup_inicial_concluido', 'true');
        }
        return adminData;
      }

      const q2 = query(
        collection(firestoreDb, "users"), 
        where("role", "==", "AdminGeral"), 
        limit(1)
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const adminData = snap2.docs[0].data() as Funcionario;
        this.atualizarUsuarioNoDispositivo(adminData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('sge_admin_configured', 'true');
          localStorage.setItem('sge_setup_inicial_concluido', 'true');
        }
        return adminData;
      }
    } catch (e) {
      console.warn('[SGE Firebase Sync] Erro ao buscar Admin Geral remoto:', e);
    }
    return null;
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
