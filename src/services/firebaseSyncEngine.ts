import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query, 
  where,
  limit,
  onSnapshot,
  Unsubscribe,
  deleteField
} from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import { offlineStorage } from "./offlineStorage";
import { invalidateLocalCache } from "./localCache";
import { Funcionario, ConfiguracaoSistema, Escola, Aluno, Turma, NotaTrimestralConsolidada, SolicitacaoApoioTecnico, Mensagem } from "../types";
import { comprimirImagemBase64 } from "../utils/imageOptimizer";

export interface SyncStatus {
  isOnline: boolean;
  firestoreDisponivel: boolean;
  emSincronizacao: boolean;
  progressoPercentual: number;
  etapaAtual: string;
  ultimaSincronizacao: string;
  totalUsuariosSincronizados: number;
  configSincronizada: boolean;
  errosRecentes?: string;
  permissaoNegada?: boolean;
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
  AUDITORIA: 'sge_auditoria',
  ATRIBUICOES: 'sge_atribuicoes',
  JURIS: 'sge_juris',
  TERMOS_EXAME: 'sge_termos_exame',
  ANOS_LECTIVOS: 'sge_anos_lectivos',
  ANOS_LECTIVOS_CONFIGS: 'sge_anos_lectivos_configs',
  TURNOS_CONFIGS: 'sge_turnos_configs',
  CLASSES_CONFIGS: 'sge_classes_configs',
  CURSOS: 'sge_cursos',
  REGRAS_MAC: 'sge_regras_mac',
  TIPOS_AVALIACAO: 'sge_tipos_avaliacao',
  SOLICITACOES_NOTA: 'sge_solicitacoes_nota',
  PRESENCAS: 'sge_presencas',
  PRESENCAS_ALUNOS: 'sge_presencas_alunos',
  HORARIOS: 'sge_horarios',
  BIBLIOTECA: 'sge_biblioteca',
  BIBLIOTECA_ACESSOS: 'sge_biblioteca_acessos',
  RECIBOS: 'sge_recibos',
  CONFIGURACOES_FINANCEIRAS: 'sge_configuracoes_financeiras',
  TRANSACOES_FINANCEIRAS: 'sge_transacoes_financeiras',
  DESPESAS_ESCOLARES: 'sge_despesas_escolares',
  PATRIMONIO: 'sge_patrimonio',
  HISTORICO_COMPLETO: 'sge_historico_completo',
  CONFIGURACOES_PASSES: 'sge_configuracoes_passes',
  ALTERACOES_NOTAS_DIRECAO: 'sge_alteracoes_notas_direcao',
  CONFIGURACOES_DOCUMENTOS: 'sge_configuracoes_documentos',
  DELEGACOES_COBRANCA: 'sge_delegacoes_cobranca',
  DELEGACOES_PODERES: 'sge_delegacoes_poderes',
  ACOES_DELEGADAS_LOGS: 'sge_acoes_delegadas_logs',
  SESSOES_ATIVAS: 'sge_sessoes_ativas',
  RELATORIOS_ACONTECIMENTOS: 'sge_relatorios_acontecimentos'
};

const MOCK_NAMES = ['manuel zola', 'dr. manuel zola', 'manuel almeida lula', 'garcia antónio vunge', 'esperança maria kwanza'];
const isDemoFunc = (f: Funcionario) => 
  !f || !f.id || 
  f.id.startsWith('func-00') ||
  f.id === 'func-subadmin-01' ||
  f.id === 'test_admin' ||
  f.id.startsWith('func-admin-179') ||
  f.id === 'func-1790329119660' ||
  MOCK_NAMES.includes((f.nomeCompleto || '').toLowerCase().trim());

const isDemoEscola = (e: Escola) => !e || !e.id || e.id === 'esc-001' || e.id === 'esc-002' || e.id === 'esc-003';

const isDemoAluno = (a: Aluno) => 
  !a || !a.id || 
  a.id.startsWith('aluno-00') ||
  a.id.startsWith('aluno-goncalves') ||
  a.id.startsWith('aluno-ndilu') ||
  a.id.startsWith('aluno-nzinga') ||
  a.id === 'exemplo-01' ||
  ['kiese manuel domingos', 'ndilu manuel sebastião', 'manuel gonçalves', 'madalena fineza nzinga', 'afonso domingos cambuta'].includes((a.nomeCompleto || '').toLowerCase().trim());

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw || raw === 'undefined' || raw === 'null') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

const FIRESTORE_TIMEOUT_TOKEN = '__SGE_FIRESTORE_TIMEOUT__' as const;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof FIRESTORE_TIMEOUT_TOKEN> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<typeof FIRESTORE_TIMEOUT_TOKEN>((resolve) => {
        timer = setTimeout(() => resolve(FIRESTORE_TIMEOUT_TOKEN), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sanitizarValorFirestore(val: any, depth: number = 0): any {
  if (val === undefined || typeof val === 'function' || typeof val === 'symbol') return undefined;
  if (val === null) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof Blob !== 'undefined' && val instanceof Blob) return undefined;
  if (typeof File !== 'undefined' && val instanceof File) return undefined;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString();
  if (depth > 8) return undefined;

  if (Array.isArray(val)) {
    const arr: any[] = [];
    for (const item of val) {
      const cleaned = sanitizarValorFirestore(item, depth + 1);
      if (cleaned !== undefined) arr.push(cleaned);
    }
    return arr;
  }

  if (typeof val === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      const cleaned = sanitizarValorFirestore(v, depth + 1);
      if (cleaned !== undefined) {
        clean[k] = cleaned;
      }
    }
    return clean;
  }

  return val;
}

function sanitizarParaFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const res = sanitizarValorFirestore(obj, 0);
  return (res && typeof res === 'object' && !Array.isArray(res)) ? res : {};
}

class FirebaseSyncEngine {
  private emSincronizacao = false;
  private progressoPercentual = 0;
  private etapaAtual = '';
  private ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
  private permissaoNegadaDetectada = false;
  private listeners: Array<(status: SyncStatus) => void> = [];

  private pullPromise: Promise<{ sucesso: boolean; mensagem: string }> | null = null;
  private syncPromise: Promise<{ sucesso: boolean; mensagem: string }> | null = null;
  private bootstrapLevePromise: Promise<void> | null = null;
  private cicloInicialPromise: Promise<void> | null = null;
  private escutasAtivas = false;
  private unsubRealtime: Unsubscribe[] = [];
  private remoteNotifyTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private processingQueuePromise: Promise<void> | null = null;
  private syncChannel: BroadcastChannel | null = null;

  constructor() {
    this.iniciarObservadoresDeRede();
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.syncChannel = new BroadcastChannel('sge_director_school_sync');
        this.syncChannel.onmessage = (ev) => {
          if (ev?.data?.type === 'DIRETOR_ESCOLA_SYNC') {
            this.agendarNotificacaoRemota(true);
          }
        };
      } catch {}
    }
  }

  public atualizarProgresso(percentual: number, etapa: string) {
    this.progressoPercentual = percentual;
    this.etapaAtual = etapa;
    this.notificarStatus();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_sync_progresso', {
        detail: {
          percentual,
          etapa,
          emSincronizacao: this.emSincronizacao
        }
      }));
    }
  }

  public registrarErroPermissao(err: any) {
    if (err?.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED') || String(err).includes('Missing or insufficient permissions')) {
      if (!this.permissaoNegadaDetectada) {
        this.permissaoNegadaDetectada = true;
        this.notificarStatus();
      }
    }
  }

  public isPermissaoNegada(): boolean {
    return this.permissaoNegadaDetectada;
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public canUseFirestore(): boolean {
    return this.isOnline() && !!firestoreDb;
  }

  private emitirBroadcastDiretorEscola() {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({ type: 'DIRETOR_ESCOLA_SYNC', ts: Date.now() });
      } catch {}
    }
  }

  private agendarNotificacaoRemota(imediato: boolean = false) {
    if (typeof window === 'undefined') return;
    if (this.remoteNotifyTimer) {
      clearTimeout(this.remoteNotifyTimer);
      this.remoteNotifyTimer = null;
    }
    if (imediato) {
      window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      return;
    }
    this.remoteNotifyTimer = setTimeout(() => {
      this.remoteNotifyTimer = null;
      window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
    }, 120);
  }

  private agendarProcessamentoPendencias() {
    if (typeof window === 'undefined' || !this.canUseFirestore()) return;
    if (this.pendingSyncTimer) return;
    this.pendingSyncTimer = setTimeout(() => {
      this.pendingSyncTimer = null;
      this.processarPendenciasOffline();
    }, 1500);
  }

  private obterIdsSincronizados(colecao: string): Set<string> {
    if (typeof localStorage === 'undefined') return new Set();
    const list = safeParseJson<string[]>(localStorage.getItem(`sge_synced_ids_${colecao}`), []);
    return new Set(Array.isArray(list) ? list.filter(Boolean) : []);
  }

  private registrarIdsSincronizados(colecao: string, idsAdicionar: string[], idsRemover?: string[]) {
    if (typeof localStorage === 'undefined') return;
    try {
      const set = this.obterIdsSincronizados(colecao);
      for (const id of idsAdicionar) {
        if (id) set.add(id);
      }
      if (idsRemover) {
        for (const id of idsRemover) {
          if (id) set.delete(id);
        }
      }
      localStorage.setItem(`sge_synced_ids_${colecao}`, JSON.stringify(Array.from(set)));
    } catch {}
  }

  private async prepararPayloadComLimiteDeTamanho(dados: Record<string, any>, colecaoHint?: string): Promise<Record<string, any>> {
    const colLower = (colecaoHint || '').toLowerCase();
    const deveLimparSessaoApoio =
      (colLower === 'escolas' || colLower === 'schools') &&
      Object.prototype.hasOwnProperty.call(dados, 'sessaoApoioTecnicoAtiva') &&
      (dados.sessaoApoioTecnicoAtiva === null || dados.sessaoApoioTecnicoAtiva === undefined);

    const deveLimparDiretor =
      (colLower === 'escolas' || colLower === 'schools') &&
      Object.prototype.hasOwnProperty.call(dados, 'diretorGeralId') &&
      (!dados.diretorGeralId || dados.diretorGeralId === null) &&
      (!dados.diretorGeralNome || String(dados.diretorGeralNome).trim().toLowerCase() === 'não atribuído');

    const payload = sanitizarParaFirestore({
      ...dados,
      atualizadoEm: dados.atualizadoEm || new Date().toISOString()
    });
    if (deveLimparSessaoApoio) {
      delete payload.sessaoApoioTecnicoAtiva;
    }
    if (deveLimparDiretor) {
      delete payload.diretorGeralId;
      delete payload.diretorGeralEmail;
      delete payload.diretorGeralTelefone;
      payload.diretorGeralNome = 'Não Atribuído';
    }

    // Se fotoUrl veio como Blob/File ou placeholder __idb_media__, recuperar/converter antes de sanitizar
    const rawBlobFoto = (dados as any).fotoBlob ?? (typeof Blob !== 'undefined' && (dados as any).fotoUrl instanceof Blob ? (dados as any).fotoUrl : undefined);
    if (rawBlobFoto && typeof Blob !== 'undefined' && rawBlobFoto instanceof Blob) {
      try {
        const b64 = await offlineStorage.converterFonteParaBase64Portatil(rawBlobFoto, 420, 0.78);
        if (b64) payload.fotoUrl = b64;
      } catch {}
    }

    const mediaId = payload.id || payload.escolaId || 'global';
    const mediaKeys = ['fotoUrl', 'foto', 'logotipo', 'logotipoUrl', 'assinaturaDiretorUrl', 'insigniaNacionalUrl'];
    for (const mk of mediaKeys) {
      if (payload[mk] === '__idb_media__' && mediaId) {
        const col = (colecaoHint || '').toLowerCase();
        const ordemTipos: Array<'funcionario' | 'aluno' | 'escola' | 'config'> =
          col === 'funcionarios' || col === 'users'
            ? ['funcionario', 'aluno', 'escola', 'config']
            : col === 'alunos' || col === 'students'
            ? ['aluno', 'funcionario', 'escola', 'config']
            : col === 'escolas' || col === 'schools'
            ? ['escola', 'config', 'funcionario', 'aluno']
            : ['config', 'escola', 'funcionario', 'aluno'];

        let recuperada = '';
        for (const tipo of ordemTipos) {
          recuperada = await offlineStorage.obterMidia(tipo, mediaId);
          if (recuperada) break;
        }
        payload[mk] = recuperada || '';
      }
    }
    delete payload.fotoBlob;

    // Converter blob: URLs e comprimir imagens base64 pesadas para caberem com segurança no Firestore (< 150KB)
    const imageKeys = ['fotoUrl', 'foto', 'logotipo', 'logotipoUrl', 'assinaturaDiretorUrl'];
    for (const imgKey of imageKeys) {
      const val = payload[imgKey];
      if (typeof val === 'string' && val.startsWith('blob:')) {
        try {
          const b64 = await offlineStorage.converterFonteParaBase64Portatil(val, 420, 0.78);
          payload[imgKey] = b64 || '';
        } catch {
          payload[imgKey] = '';
        }
      } else if (typeof val === 'string' && val.length > 130000 && (val.startsWith('data:image') || val.includes(';base64,'))) {
        try {
          const comprimida = await comprimirImagemBase64(val, 420, 0.78);
          if (comprimida && comprimida.length < val.length) {
            payload[imgKey] = comprimida;
          }
        } catch {}
      }
    }

    if (payload.configuracaoPasses && typeof payload.configuracaoPasses === 'object') {
      const sig = payload.configuracaoPasses.assinaturaDiretorUrl;
      if (typeof sig === 'string' && sig.length > 120000 && (sig.startsWith('data:image') || sig.includes(';base64,'))) {
        try {
          const comp = await comprimirImagemBase64(sig, 360, 0.78);
          if (comp && comp.length < sig.length) {
            payload.configuracaoPasses = { ...payload.configuracaoPasses, assinaturaDiretorUrl: comp };
          }
        } catch {}
      }
    }

    // Proteção final contra limite rígido de 1MB do Firestore
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'string' && v.length > 700000) {
        if (imageKeys.includes(k)) {
          try {
            payload[k] = await comprimirImagemBase64(v, 300, 0.65);
          } catch {
            delete payload[k];
          }
        } else {
          payload[k] = v.slice(0, 700000);
        }
      }
    }

    if (deveLimparSessaoApoio) {
      payload.sessaoApoioTecnicoAtiva = deleteField();
    }
    if (deveLimparDiretor) {
      payload.diretorGeralId = deleteField();
      payload.diretorGeralEmail = deleteField();
      payload.diretorGeralTelefone = deleteField();
      payload.diretorGeralNome = 'Não Atribuído';
    }

    return payload;
  }

  /**
   * Persistência Imediata e Garantida:
   * Enfileira de imediato no dispositivo antes de tentar gravar no Firebase Firestore.
   * Quando ONLINE e gravação confirmada -> remove a pendência; se falhar ou offline -> fica segura para retry automático.
   */
  public async gravarDocumentoDireto(
    colecao: string,
    docId: string,
    dados: Record<string, any>,
    extraColecoes?: string[],
    descricao?: string
  ): Promise<boolean> {
    if (!docId) return false;

    const dadosComId = { ...dados, id: dados.id || docId };
    // Enfileira sincronamente ANTES de qualquer await (protege contra fecho imediato do separador)
    offlineStorage.adicionarPendencia(
      colecao,
      'ATUALIZAR',
      descricao || `Alteração em ${colecao} (${docId})`,
      dadosComId,
      docId,
      extraColecoes
    );

    const payload = await this.prepararPayloadComLimiteDeTamanho(dadosComId, colecao);

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const tasks = [
          setDoc(doc(firestoreDb, colecao, docId), payload, { merge: true })
        ];
        if (extraColecoes && extraColecoes.length > 0) {
          for (const extraCol of extraColecoes) {
            tasks.push(setDoc(doc(firestoreDb, extraCol, docId), payload, { merge: true }));
          }
        }

        const results = await withTimeout(Promise.allSettled(tasks), 3500);
        if (results === FIRESTORE_TIMEOUT_TOKEN) {
          console.warn(`[SGE Firebase Sync] Timeout ao gravar '${colecao}/${docId}', mantido na fila offline.`);
          this.agendarProcessamentoPendencias();
          return false;
        }
        const primaryResult = results[0];

        if (primaryResult.status === 'fulfilled') {
          offlineStorage.removerPendenciaPorDocumento(colecao, docId);
          this.registrarIdsSincronizados(colecao, [docId]);
          this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
          this.notificarStatus();
          return true;
        }

        this.registrarErroPermissao(primaryResult.reason);
        console.warn(`[SGE Firebase Sync] Erro ao gravar '${colecao}/${docId}', mantido na fila de retry:`, primaryResult.reason);
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn(`[SGE Firebase Sync] Exceção ao gravar '${colecao}/${docId}', mantido na fila de retry:`, err);
      }
    }

    this.agendarProcessamentoPendencias();
    return false;
  }

  /**
   * Gravação em Lote (writeBatch) respeitando os limites do Firestore (<= 400 ops e <= 2.5MB por lote)
   * com fallback automático por documento em caso de erro no lote.
   */
  public async gravarLoteDireto(
    colecao: string,
    itens: Array<{ id: string; dados: Record<string, any> }>,
    extraColecoes?: string[]
  ): Promise<boolean> {
    if (!itens || itens.length === 0) return true;

    if (!this.canUseFirestore() || !firestoreDb) {
      for (const item of itens) {
        offlineStorage.adicionarPendencia(
          colecao,
          'ATUALIZAR',
          `Lote ${colecao} (${item.id})`,
          sanitizarParaFirestore({ ...item.dados, id: item.dados.id || item.id }),
          item.id,
          extraColecoes
        );
      }
      this.agendarProcessamentoPendencias();
      return false;
    }

    const payloads = await Promise.all(
      itens.map(async (item) => ({
        id: item.id,
        dadosOriginais: item.dados,
        payload: await this.prepararPayloadComLimiteDeTamanho({ ...item.dados, id: item.dados.id || item.id }, colecao)
      }))
    );

    const opsPorItem = 1 + (extraColecoes?.length || 0);
    const MAX_OPS_PER_BATCH = 400;
    const MAX_BYTES_PER_BATCH = 2_500_000;

    // Agrupar dinamicamente por limite de operações e bytes
    const batches: Array<typeof payloads> = [];
    let currentSlice: typeof payloads = [];
    let currentOps = 0;
    let currentBytes = 0;

    for (const entry of payloads) {
      const approxBytes = JSON.stringify(entry.payload).length * opsPorItem;
      if (
        currentSlice.length > 0 &&
        (currentOps + opsPorItem > MAX_OPS_PER_BATCH || currentBytes + approxBytes > MAX_BYTES_PER_BATCH)
      ) {
        batches.push(currentSlice);
        currentSlice = [];
        currentOps = 0;
        currentBytes = 0;
      }
      currentSlice.push(entry);
      currentOps += opsPorItem;
      currentBytes += approxBytes;
    }
    if (currentSlice.length > 0) batches.push(currentSlice);

    let allOk = true;
    const syncedIds: string[] = [];

    for (const slice of batches) {
      try {
        const batch = writeBatch(firestoreDb);
        for (const entry of slice) {
          batch.set(doc(firestoreDb, colecao, entry.id), entry.payload, { merge: true });
          if (extraColecoes) {
            for (const extraCol of extraColecoes) {
              batch.set(doc(firestoreDb, extraCol, entry.id), entry.payload, { merge: true });
            }
          }
        }
        const commitRes = await withTimeout(batch.commit(), 4500);
        if (commitRes === FIRESTORE_TIMEOUT_TOKEN) {
          throw new Error('Timeout ao confirmar lote no Firestore');
        }
        for (const entry of slice) {
          offlineStorage.removerPendenciaPorDocumento(colecao, entry.id);
          syncedIds.push(entry.id);
        }
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn(`[SGE Firebase Sync] Batch falhou em '${colecao}' (${slice.length} itens), tentando por documento:`, err);
        const individualResults = await withTimeout(
          Promise.allSettled(
            slice.map(async (entry) => {
              const tasks = [setDoc(doc(firestoreDb!, colecao, entry.id), entry.payload, { merge: true })];
              if (extraColecoes) {
                for (const ec of extraColecoes) {
                  tasks.push(setDoc(doc(firestoreDb!, ec, entry.id), entry.payload, { merge: true }));
                }
              }
              const res = await withTimeout(Promise.allSettled(tasks), 3000);
              if (res !== FIRESTORE_TIMEOUT_TOKEN && res[0].status === 'fulfilled') {
                offlineStorage.removerPendenciaPorDocumento(colecao, entry.id);
                syncedIds.push(entry.id);
                return true;
              }
              throw res === FIRESTORE_TIMEOUT_TOKEN
                ? new Error('Timeout individual')
                : (res[0].status === 'rejected' ? res[0].reason : new Error('Falha de escrita'));
            })
          ),
          4500
        );

        if (individualResults === FIRESTORE_TIMEOUT_TOKEN) {
          allOk = false;
          slice.forEach((entry) => {
            offlineStorage.adicionarPendencia(
              colecao,
              'ATUALIZAR',
              `Lote ${colecao} (${entry.id})`,
              entry.dadosOriginais,
              entry.id,
              extraColecoes
            );
          });
        } else {
          individualResults.forEach((r, idx) => {
            if (r.status === 'rejected') {
              allOk = false;
              const entry = slice[idx];
              offlineStorage.adicionarPendencia(
                colecao,
                'ATUALIZAR',
                `Lote ${colecao} (${entry.id})`,
                entry.dadosOriginais,
                entry.id,
                extraColecoes
              );
            }
          });
        }
      }
    }

    if (syncedIds.length > 0) {
      this.registrarIdsSincronizados(colecao, syncedIds);
      this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
      this.notificarStatus();
    }

    if (!allOk) {
      this.agendarProcessamentoPendencias();
    }
    return allOk;
  }

  /**
   * Eliminação Imediata e Garantida no Firestore + fila offline caso desconectado
   */
  public async eliminarDocumentoDireto(
    colecao: string,
    docId: string,
    extraColecoes?: string[],
    descricao?: string
  ): Promise<boolean> {
    if (!docId) return false;

    offlineStorage.adicionarPendencia(
      colecao,
      'ELIMINAR',
      descricao || `Eliminação em ${colecao} (${docId})`,
      { id: docId },
      docId,
      extraColecoes
    );

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const tasks = [deleteDoc(doc(firestoreDb, colecao, docId))];
        if (extraColecoes && extraColecoes.length > 0) {
          for (const extraCol of extraColecoes) {
            tasks.push(deleteDoc(doc(firestoreDb, extraCol, docId)));
          }
        }
        const results = await withTimeout(Promise.allSettled(tasks), 3500);
        if (results !== FIRESTORE_TIMEOUT_TOKEN && results[0].status === 'fulfilled') {
          offlineStorage.removerPendenciaPorDocumento(colecao, docId);
          this.registrarIdsSincronizados(colecao, [], [docId]);
          this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
          this.notificarStatus();
          return true;
        }
        if (results !== FIRESTORE_TIMEOUT_TOKEN && results[0].status === 'rejected') {
          this.registrarErroPermissao(results[0].reason);
        }
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn(`[SGE Firebase Sync] Erro ao eliminar '${colecao}/${docId}':`, err);
      }
    }

    this.agendarProcessamentoPendencias();
    return false;
  }

  /**
   * Processa em paralelo todas as pendências acumuladas offline (criações, atualizações e eliminações)
   */
  public async processarPendenciasOffline(): Promise<void> {
    if (this.processingQueuePromise) return this.processingQueuePromise;
    if (!this.canUseFirestore() || !firestoreDb) return;

    this.processingQueuePromise = (async () => {
      try {
        await offlineStorage.hidratarArmazenamentoDoIndexedDB();
        const pendentes = offlineStorage.obterPendencias();
        if (pendentes.length === 0) return;

        console.log(`[SGE Firebase Sync] Processando ${pendentes.length} pendências em paralelo para o Firebase...`);
        const CONCURRENCY = 10;
        for (let i = 0; i < pendentes.length; i += CONCURRENCY) {
          const fatia = pendentes.slice(i, i + CONCURRENCY);
          await Promise.allSettled(
            fatia.map(async (p) => {
              try {
                const col = (p.entidade || '').toLowerCase();
                const docId = p.docId || p.dados?.id || p.id;
                if (!col || !docId) {
                  offlineStorage.removerPendencia(p.id);
                  return;
                }

                if (p.acao === 'ELIMINAR') {
                  const delTasks = [deleteDoc(doc(firestoreDb!, col, docId))];
                  if (p.extraColecoes) {
                    for (const ec of p.extraColecoes) {
                      delTasks.push(deleteDoc(doc(firestoreDb!, ec, docId)));
                    }
                  }
                  const delRes = await withTimeout(Promise.allSettled(delTasks), 4000);
                  if (delRes !== FIRESTORE_TIMEOUT_TOKEN && delRes[0].status === 'fulfilled') {
                    offlineStorage.removerPendencia(p.id);
                    this.registrarIdsSincronizados(col, [], [docId]);
                  }
                } else if (p.dados) {
                  if (col === 'configuracao_sistema' && docId === 'global') {
                    const okCfg = await this.gravarConfiguracaoNoFirestore(p.dados);
                    if (okCfg) offlineStorage.removerPendencia(p.id);
                    return;
                  }
                  const payload = await this.prepararPayloadComLimiteDeTamanho(
                    {
                      ...p.dados,
                      id: p.dados.id || docId,
                      sincronizadoEm: new Date().toISOString()
                    },
                    col
                  );
                  const setTasks = [setDoc(doc(firestoreDb!, col, docId), payload, { merge: true })];
                  if (p.extraColecoes) {
                    for (const ec of p.extraColecoes) {
                      setTasks.push(setDoc(doc(firestoreDb!, ec, docId), payload, { merge: true }));
                    }
                  }
                  const res = await withTimeout(Promise.allSettled(setTasks), 4000);
                  if (res !== FIRESTORE_TIMEOUT_TOKEN && res[0].status === 'fulfilled') {
                    offlineStorage.removerPendencia(p.id);
                    this.registrarIdsSincronizados(col, [docId]);
                  }
                } else {
                  offlineStorage.removerPendencia(p.id);
                }
              } catch (err) {
                console.warn(`[SGE Firebase Sync] Falha ao processar pendência ${p.id}:`, err);
              }
            })
          );
        }
      } finally {
        this.processingQueuePromise = null;
      }
    })();

    return this.processingQueuePromise;
  }

  private iniciarObservadoresDeRede() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SGE Firebase Sync] Rede online restabelecida. A processar pendências e sincronizar...');
      this.notificarStatus();
      const isAuth = typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';
      this.processarPendenciasOffline().then(() => {
        if (isAuth) {
          this.puxarTudoDoFirebase(true);
          this.iniciarEscutasEmTempoReal();
        } else {
          this.iniciarCicloBootstrapLeve();
        }
      });
    });

    window.addEventListener('offline', () => {
      console.log('[SGE Firebase Sync] Modo offline ativado. Dados guardados localmente com fila automática.');
      this.notificarStatus();
    });

    // Retry periódico em segundo plano para garantir que nenhuma alteração local fica por subir ao Firebase
    setInterval(() => {
      if (this.canUseFirestore() && offlineStorage.obterTotalPendentes() > 0) {
        this.processarPendenciasOffline();
      }
    }, 25000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.canUseFirestore() && offlineStorage.obterTotalPendentes() > 0) {
          this.processarPendenciasOffline();
        }
      });
    }
  }

  /**
   * Fase 1 (Ultra-Leve para Ecrã de Login / Dispositivo Novo):
   * Descarrega apenas o estritamente necessário antes da autenticação (configuração, escolas e anos letivos),
   * sem disparar 40 leituras nem abrir 40 listeners pesados no primeiro segundo de vida da página.
   */
  public iniciarCicloBootstrapLeve(): Promise<void> {
    if (this.bootstrapLevePromise) return this.bootstrapLevePromise;

    this.bootstrapLevePromise = (async () => {
      if (!this.canUseFirestore() || !firestoreDb) return;
      try {
        await offlineStorage.hidratarArmazenamentoDoIndexedDB();
        await this.processarPendenciasOffline();
        await Promise.allSettled([
          this.buscarConfiguracaoSistema(),
          this.puxarColecaoArray<Escola>("escolas", STORAGE_KEYS.ESCOLAS, {
            filterValid: (esc) => Boolean(esc && esc.id && !isDemoEscola(esc)),
            preserveFieldFn: (existing, esc) => this.mergeEscolaRemota(existing, esc),
            uploadLocalIfRemoteEmpty: true,
            extraColecoes: ["schools"]
          }),
          (async () => {
            if (!firestoreDb) return;
            const snap = await getDoc(doc(firestoreDb, "configuracao_sistema", "anos_lectivos"));
            if (snap.exists() && Array.isArray(snap.data().anos)) {
              localStorage.setItem(STORAGE_KEYS.ANOS_LECTIVOS, JSON.stringify(snap.data().anos));
            }
          })()
        ]);
        this.agendarNotificacaoRemota();
      } catch (err) {
        console.warn('[SGE Firebase Sync] Aviso no bootstrap leve:', err);
      } finally {
        this.bootstrapLevePromise = null;
      }
    })();

    return this.bootstrapLevePromise;
  }

  /**
   * Fase 2 (Completa Pós-Autenticação):
   * Hidrata o IndexedDB, envia quaisquer pendências e registos locais em falta no Firebase,
   * descarrega a base em 3 ondas paralelas e ativa as escutas em tempo real.
   */
  public iniciarCicloInicialOnline(): Promise<void> {
    if (this.cicloInicialPromise) return this.cicloInicialPromise;

    this.cicloInicialPromise = (async () => {
      if (!this.canUseFirestore()) return;
      try {
        await offlineStorage.hidratarArmazenamentoDoIndexedDB();
        await this.processarPendenciasOffline();
        await this.puxarTudoDoFirebase();
        this.iniciarEscutasEmTempoReal();
      } catch (err) {
        console.warn('[SGE Firebase Sync] Erro no ciclo inicial:', err);
      }
    })();

    return this.cicloInicialPromise;
  }

  /**
   * Helper para mesclar coleção tipo Array entre Firestore e Dispositivo:
   * - Preserva itens locais pendentes ou recém-criados no dispositivo (que ainda não foram confirmados no Firebase),
   * - Respeita timestamps `atualizadoEm` mais recentes localmente,
   * - Identifica e devolve os itens locais em falta/mais recentes para subida imediata ao Firebase.
   */
  private aplicarSnapshotArray<T extends Record<string, any>>(
    storageKey: string,
    colecao: string,
    remotos: T[],
    fromCache: boolean,
    filterValid?: (item: T) => boolean,
    preserveFieldFn?: (local: T | undefined, remote: T) => T,
    getIdFn: (item: T) => string = (item) => item.id,
    onLocalToPush?: (itensParaSubir: T[]) => void
  ): T[] {
    const pendentes = offlineStorage.obterPendencias().filter(p => p.entidade === colecao);
    const pendingDeleteIds = new Set(pendentes.filter(p => p.acao === 'ELIMINAR').map(p => p.docId || p.dados?.id).filter(Boolean));
    const pendingUpsertIds = new Set(pendentes.filter(p => p.acao !== 'ELIMINAR').map(p => p.docId || p.dados?.id).filter(Boolean));

    const locaisRaw = safeParseJson<T[]>(localStorage.getItem(storageKey), []);
    const locaisValidos = filterValid ? locaisRaw.filter(filterValid) : locaisRaw;
    const remotosValidos = filterValid ? remotos.filter(filterValid) : remotos;

    const mapLocal = new Map<string, T>();
    for (const l of locaisValidos) {
      const id = getIdFn(l);
      if (id) mapLocal.set(id, l);
    }

    const mapRemote = new Map<string, T>();
    for (const r of remotosValidos) {
      const id = getIdFn(r);
      if (id) mapRemote.set(id, r);
    }

    const jaSincronizouAntes = localStorage.getItem(`sge_remote_synced_${colecao}`) === 'true';
    const previouslySyncedIds = this.obterIdsSincronizados(colecao);
    const resultMap = new Map<string, T>();
    const localToPush: T[] = [];

    const isLocalNewer = (localItem: T | undefined, remoteItem: T): boolean => {
      if (!localItem) return false;
      const tLocal = localItem.atualizadoEm ? Date.parse(String(localItem.atualizadoEm)) : NaN;
      const tRemote = remoteItem.atualizadoEm ? Date.parse(String(remoteItem.atualizadoEm)) : NaN;
      return !isNaN(tLocal) && !isNaN(tRemote) && tLocal > tRemote + 500;
    };

    // 1. Avaliar registos existentes localmente neste dispositivo
    for (const [id, l] of mapLocal.entries()) {
      if (pendingDeleteIds.has(id)) continue;
      const r = mapRemote.get(id);
      if (!r) {
        // Se este ID já tinha sido confirmado na nuvem e já houve sync anterior, foi removido remotamente por outro dispositivo — exceto se há pendente local
        const removidoRemotamente = jaSincronizouAntes && !fromCache && previouslySyncedIds.has(id) && !pendingUpsertIds.has(id);
        if (!removidoRemotamente) {
          resultMap.set(id, l);
          localToPush.push(l);
        }
      } else if (pendingUpsertIds.has(id) || isLocalNewer(l, r)) {
        resultMap.set(id, l);
        localToPush.push(l);
      }
    }

    // 2. Mesclar registos remotos do Firestore
    for (const r of remotosValidos) {
      const id = getIdFn(r);
      if (!id || pendingDeleteIds.has(id)) continue;
      if (resultMap.has(id)) continue; // local mais recente ou pendente preservado acima
      const existing = mapLocal.get(id);
      resultMap.set(id, preserveFieldFn ? preserveFieldFn(existing, r) : { ...existing, ...r });
    }

    const finalArray = Array.from(resultMap.values());
    if (remotosValidos.length > 0 || finalArray.length > 0 || jaSincronizouAntes) {
      const serialized = JSON.stringify(finalArray);
      if (colecao === 'funcionarios' || colecao === 'alunos' || colecao === 'escolas') {
        offlineStorage.gravarChaveNoIndexedDB(storageKey, serialized);
      }
      try {
        localStorage.setItem(storageKey, serialized);
        invalidateLocalCache(storageKey);
      } catch (quotaErr) {
        console.warn(`[SGE Sync] Quota localStorage excedida ao gravar ${storageKey}, preservando fotos no IndexedDB:`, quotaErr);
        if (colecao === 'funcionarios' || colecao === 'alunos') {
          const entityType = colecao === 'funcionarios' ? 'funcionario' : 'aluno';
          const slimmed = finalArray.map((item: any) => {
            if (item?.id && typeof item.fotoUrl === 'string' && item.fotoUrl.length > 2048 && item.fotoUrl !== '__idb_media__') {
              offlineStorage.definirMidiaEmCache(entityType, item.id, item.fotoUrl);
              offlineStorage.salvarMidia(entityType, item.id, item.fotoUrl, item.atualizadoEm);
              return { ...item, fotoUrl: '__idb_media__' };
            }
            return item;
          });
          try {
            localStorage.setItem(storageKey, JSON.stringify(slimmed));
            invalidateLocalCache(storageKey);
          } catch {}
        }
      }
      if (!fromCache && remotosValidos.length > 0) {
        localStorage.setItem(`sge_remote_synced_${colecao}`, 'true');
        this.registrarIdsSincronizados(colecao, Array.from(mapRemote.keys()));
      }
    }

    if (onLocalToPush && localToPush.length > 0) {
      onLocalToPush(localToPush);
    }
    return finalArray;
  }

  /**
   * Escutas em Tempo Real (onSnapshot) com tratamento de remoções e notificação com debounce
   */
  public iniciarEscutasEmTempoReal() {
    if (!this.canUseFirestore() || !firestoreDb || typeof window === 'undefined') return;
    if (this.escutasAtivas) return;
    this.escutasAtivas = true;

    const registrarEscutaArray = <T extends Record<string, any>>(
      colecao: string,
      storageKey: string,
      filterValid?: (item: T) => boolean,
      preserveFieldFn?: (local: T | undefined, remote: T) => T,
      afterApply?: (lista: T[]) => void,
      getIdFn: (item: T) => string = (item) => item.id,
      immediateNotify: boolean = false
    ) => {
      if (!firestoreDb) return;
      try {
        const unsub = onSnapshot(collection(firestoreDb, colecao), (snapshot) => {
          const remotos: T[] = [];
          snapshot.forEach(d => {
            const data = d.data() as T;
            if (data) {
              const item = { ...data, id: data.id || d.id };
              remotos.push(item);
            }
          });

          // Aplicar remoções explícitas em tempo real via docChanges
          const removedIds = new Set<string>();
          snapshot.docChanges().forEach(change => {
            if (change.type === 'removed') {
              const d = change.doc.data() as any;
              removedIds.add(d?.id || change.doc.id);
            }
          });

          if (removedIds.size > 0) {
            const pendentes = offlineStorage.obterPendencias().filter(p => p.entidade === colecao && p.acao !== 'ELIMINAR');
            const pendingUpsertIds = new Set(pendentes.map(p => p.docId || p.dados?.id));
            const atuais = safeParseJson<T[]>(localStorage.getItem(storageKey), []);
            const filtrados = atuais.filter(item => {
              const id = getIdFn(item);
              return !removedIds.has(id) || pendingUpsertIds.has(id);
            });
            localStorage.setItem(storageKey, JSON.stringify(filtrados));
          }

          if (remotos.length > 0 || removedIds.size > 0) {
            const aplicados = this.aplicarSnapshotArray(
              storageKey,
              colecao,
              remotos,
              snapshot.metadata.fromCache,
              filterValid,
              preserveFieldFn,
              getIdFn
            );
            if (afterApply) afterApply(aplicados);
            this.agendarNotificacaoRemota(immediateNotify);
          }
        }, (err) => {
          this.registrarErroPermissao(err);
        });
        this.unsubRealtime.push(unsub);
      } catch (e) {
        console.warn(`[SGE Realtime] Falha ao iniciar escuta em ${colecao}:`, e);
      }
    };

    const registrarEscutaMapa = (
      colecao: string,
      storageKey: string,
      docToKeyFn?: (docId: string, data: any) => string,
      unwrapFn?: (data: any) => any
    ) => {
      if (!firestoreDb) return;
      try {
        const unsub = onSnapshot(collection(firestoreDb, colecao), (snapshot) => {
          if (snapshot.empty) return;
          const localMap = safeParseJson<Record<string, any>>(localStorage.getItem(storageKey), {});
          const pendentes = offlineStorage.obterPendencias().filter(p => p.entidade === colecao);
          const pendingMap = new Map(pendentes.map(p => [p.docId || p.dados?.id, p]));
          let changed = false;

          snapshot.forEach(d => {
            const rawData = d.data();
            const mapKey = docToKeyFn ? docToKeyFn(d.id, rawData) : d.id;
            const pend = pendingMap.get(d.id) || pendingMap.get(mapKey);
            if (pend && pend.acao !== 'ELIMINAR') return;
            localMap[mapKey] = unwrapFn ? unwrapFn(rawData) : rawData;
            changed = true;
          });

          if (changed) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(localMap));
              invalidateLocalCache(storageKey);
              localStorage.setItem(`sge_remote_synced_${colecao}`, 'true');
            } catch {}
            this.agendarNotificacaoRemota();
          }
        }, () => {});
        this.unsubRealtime.push(unsub);
      } catch {}
    };

    registrarEscutaArray<Funcionario>(
      "funcionarios",
      STORAGE_KEYS.FUNCIONARIOS,
      (f) => Boolean(f && f.id && f.nomeCompleto && !isDemoFunc(f)),
      (existing, rf) => {
        const fotoExistente =
          existing?.fotoUrl && existing.fotoUrl !== '__idb_media__'
            ? existing.fotoUrl
            : (existing?.id ? (offlineStorage.obterMidiaEmCache('funcionario', existing.id) || '') : '');
        const fotoFinal = rf.fotoUrl !== undefined ? rf.fotoUrl : fotoExistente;
        if (rf.id && rf.fotoUrl !== undefined) {
          offlineStorage.definirMidiaEmCache('funcionario', rf.id, rf.fotoUrl);
        }
        return {
          ...existing,
          ...rf,
          password: rf.password || existing?.password || '',
          fotoUrl: fotoFinal
        };
      },
      (mesclados) => {
        // Espelhar todos os funcionários e respetivas fotos imediatamente no IndexedDB local
        offlineStorage.salvarFuncionariosLoteNoIndexedDB(mesclados);
        // Reconciliar imediatamente diretores recebidos com as respetivas escolas
        this.reconciliarDiretoresLocal(false);
        const curRaw = localStorage.getItem('sge_current_user') || localStorage.getItem('sge_user');
        if (curRaw) {
          try {
            const cur = JSON.parse(curRaw);
            const updatedCur = mesclados.find(f => f.id === cur.id || (f.email && cur.email && f.email.toLowerCase() === cur.email.toLowerCase()));
            if (updatedCur) {
              const tCur = cur.atualizadoEm ? Date.parse(String(cur.atualizadoEm)) : 0;
              const tUpd = updatedCur.atualizadoEm ? Date.parse(String(updatedCur.atualizadoEm)) : 0;
              const mergedCur = tCur > tUpd + 500
                ? { ...updatedCur, ...cur }
                : { ...cur, ...updatedCur, fotoUrl: updatedCur.fotoUrl !== undefined ? updatedCur.fotoUrl : cur.fotoUrl };
              localStorage.setItem('sge_user', JSON.stringify(mergedCur));
              localStorage.setItem('sge_current_user', JSON.stringify(mergedCur));
            }
          } catch {}
        }
        if (mesclados.some(f => f.role === 'AdminGeral' && f.ativo !== false)) {
          localStorage.setItem('sge_admin_configured', 'true');
          localStorage.setItem('sge_setup_inicial_concluido', 'true');
        }
      },
      (item) => item.id,
      true
    );

    registrarEscutaArray<Escola>(
      "escolas",
      STORAGE_KEYS.ESCOLAS,
      (esc) => Boolean(esc && esc.id && !isDemoEscola(esc)),
      (existing, esc) => this.mergeEscolaRemota(existing, esc),
      () => {
        this.reconciliarDiretoresLocal(false);
      },
      (item) => item.id,
      true
    );

    // Escuta auxiliar na coleção espelho "users" para Diretores Gerais (garante propagação mesmo de clientes legados)
    try {
      const qUsersDir = query(collection(firestoreDb, "users"), where("role", "==", "DiretorGeral"));
      const unsubUsersDir = onSnapshot(qUsersDir, (snapshot) => {
        if (snapshot.empty) return;
        const locais = safeParseJson<Funcionario[]>(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS), []);
        const pendentesDel = new Set(
          offlineStorage.obterPendencias()
            .filter(p => p.entidade === 'funcionarios' && p.acao === 'ELIMINAR')
            .map(p => p.docId || p.dados?.id)
        );
        let mudou = false;
        snapshot.forEach(d => {
          const u = d.data() as Funcionario;
          const uid = u?.id || d.id;
          if (!u || !u.nomeCompleto || isDemoFunc({ ...u, id: uid }) || pendentesDel.has(uid)) return;
          const idx = locais.findIndex(f => f.id === uid);
          const uNorm: Funcionario = { ...u, id: uid };
          if (idx < 0) {
            locais.push(uNorm);
            mudou = true;
          } else {
            const tLoc = locais[idx].atualizadoEm ? Date.parse(String(locais[idx].atualizadoEm)) : 0;
            const tRem = uNorm.atualizadoEm ? Date.parse(String(uNorm.atualizadoEm)) : 0;
            if (tRem > tLoc + 500 || (locais[idx].escolaId !== uNorm.escolaId && tRem >= tLoc)) {
              locais[idx] = {
                ...locais[idx],
                ...uNorm,
                password: uNorm.password || locais[idx].password || '',
                fotoUrl: uNorm.fotoUrl !== undefined ? uNorm.fotoUrl : locais[idx].fotoUrl
              };
              mudou = true;
            }
          }
        });
        if (mudou) {
          localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(locais));
          offlineStorage.salvarFuncionariosLoteNoIndexedDB(locais);
          this.reconciliarDiretoresLocal(false);
          this.agendarNotificacaoRemota(true);
        }
      }, () => {});
      this.unsubRealtime.push(unsubUsersDir);
    } catch {}

    registrarEscutaArray<Turma>("turmas", STORAGE_KEYS.TURMAS, (t) => Boolean(t && t.id));
    registrarEscutaArray<any>("disciplinas", STORAGE_KEYS.DISCIPLINAS, (d) => Boolean(d && d.id));
    registrarEscutaArray<Aluno>(
      "alunos",
      STORAGE_KEYS.ALUNOS,
      (a) => Boolean(a && a.id && !isDemoAluno(a)),
      (existing, ra) => {
        const fotoExistente =
          existing?.fotoUrl && existing.fotoUrl !== '__idb_media__'
            ? existing.fotoUrl
            : (existing?.id ? (offlineStorage.obterMidiaEmCache('aluno', existing.id) || '') : '');
        const fotoFinal = ra.fotoUrl !== undefined ? ra.fotoUrl : fotoExistente;
        if (ra.id && ra.fotoUrl !== undefined && ra.fotoUrl !== '__idb_media__') {
          offlineStorage.salvarMidia('aluno', ra.id, ra.fotoUrl, ra.atualizadoEm);
        }
        return {
          ...existing,
          ...ra,
          fotoUrl: fotoFinal
        };
      }
    );
    registrarEscutaArray<any>("atribuicoes", STORAGE_KEYS.ATRIBUICOES, (at) => Boolean(at && at.id));
    registrarEscutaArray<any>("avaliacoes", STORAGE_KEYS.AVALIACOES, (av) => Boolean(av && av.id));
    registrarEscutaArray<any>("notas", STORAGE_KEYS.NOTAS_CONSOLIDADAS, (n) => Boolean(n && (n.id || n.alunoId)), undefined, undefined, (n) => n.id || `${n.alunoId}_${n.disciplinaId}_${n.trimestre}_${n.anoLectivo || 'padrao'}`);
    registrarEscutaArray<any>("notas_estudantes", STORAGE_KEYS.NOTAS, (n) => Boolean(n && (n.id || n.avaliacaoId)), undefined, undefined, (n) => n.id || `${n.avaliacaoId}_${n.alunoId}`);
    registrarEscutaArray<any>("juris", STORAGE_KEYS.JURIS, (j) => Boolean(j && j.id));
    registrarEscutaArray<any>("termos_exame", STORAGE_KEYS.TERMOS_EXAME, (t) => Boolean(t && t.id));
    registrarEscutaArray<any>("mensagens", STORAGE_KEYS.MENSAGENS, (m) => Boolean(m && m.id));
    registrarEscutaArray<any>("solicitacoes_apoio", STORAGE_KEYS.SOLICITACOES_APOIO, (s) => Boolean(s && s.id));
    registrarEscutaArray<any>("horarios", STORAGE_KEYS.HORARIOS, (h) => Boolean(h && h.id));
    registrarEscutaArray<any>("transacoes_financeiras", STORAGE_KEYS.TRANSACOES_FINANCEIRAS, (t) => Boolean(t && t.id));
    registrarEscutaArray<any>("delegacoes_poderes", STORAGE_KEYS.DELEGACOES_PODERES, (d) => Boolean(d && d.id));
    registrarEscutaArray<any>("acoes_delegadas_logs", STORAGE_KEYS.ACOES_DELEGADAS_LOGS, (l) => Boolean(l && l.id));
    registrarEscutaArray<any>("biblioteca", STORAGE_KEYS.BIBLIOTECA, (b) => Boolean(b && b.id));
    registrarEscutaArray<any>("biblioteca_acessos", STORAGE_KEYS.BIBLIOTECA_ACESSOS, (ba) => Boolean(ba && ba.id));
    registrarEscutaArray<any>("presencas", STORAGE_KEYS.PRESENCAS, (p) => Boolean(p && p.funcionarioId && p.data), undefined, undefined, (p) => p.id || `${p.funcionarioId}_${p.data}`);
    registrarEscutaArray<any>("presencas_alunos", STORAGE_KEYS.PRESENCAS_ALUNOS, (p) => Boolean(p && p.alunoId && p.data), undefined, undefined, (p) => p.id || `${p.alunoId}_${p.data}_${p.tempoLectivo}`);
    registrarEscutaArray<any>("recibos", STORAGE_KEYS.RECIBOS, (r) => Boolean(r && r.id));
    registrarEscutaArray<any>("despesas_escolares", STORAGE_KEYS.DESPESAS_ESCOLARES, (d) => Boolean(d && d.id));
    registrarEscutaArray<any>("patrimonio", STORAGE_KEYS.PATRIMONIO, (p) => Boolean(p && p.id));
    registrarEscutaArray<any>("regras_mac", STORAGE_KEYS.REGRAS_MAC, (r) => Boolean(r && r.id));
    registrarEscutaArray<any>("tipos_avaliacao", STORAGE_KEYS.TIPOS_AVALIACAO, (t) => Boolean(t && t.id));
    registrarEscutaArray<any>("solicitacoes_nota", STORAGE_KEYS.SOLICITACOES_NOTA, (s) => Boolean(s && s.id));
    registrarEscutaArray<any>("anos_lectivos_configs", STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, (c) => Boolean(c && c.id));
    registrarEscutaArray<any>("turnos_configs", STORAGE_KEYS.TURNOS_CONFIGS, (t) => Boolean(t && t.id));
    registrarEscutaArray<any>("classes_configs", STORAGE_KEYS.CLASSES_CONFIGS, (c) => Boolean(c && c.id));
    registrarEscutaArray<any>("cursos", STORAGE_KEYS.CURSOS, (c) => Boolean(c && c.id));
    registrarEscutaArray<any>("alteracoes_notas_direcao", STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, (r) => Boolean(r && r.id));
    registrarEscutaArray<any>("relatorios_acontecimentos", STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, (r) => Boolean(r && r.id));

    registrarEscutaMapa("configuracoes_financeiras", STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, (docId, d) => d.escolaId || docId);
    registrarEscutaMapa("historico_completo", STORAGE_KEYS.HISTORICO_COMPLETO, (docId, d) => d.alunoId || docId);
    registrarEscutaMapa("configuracoes_passes", STORAGE_KEYS.CONFIGURACOES_PASSES, (docId, d) => d.escolaId || docId);
    registrarEscutaMapa("configuracoes_documentos", STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, (docId, d) => (d.escolaId && d.tipoDocumento) ? `${d.escolaId}_${d.tipoDocumento}` : docId);
    registrarEscutaMapa("delegacoes_cobranca", STORAGE_KEYS.DELEGACOES_COBRANCA, (docId, d) => d.escolaId || docId, (d) => d.lista || d);

    // Escuta em tempo real de configuração global (Insígnia Nacional + parâmetros)
    const aplicarConfigRemota = async (rawCfg: ConfiguracaoSistema) => {
      const cfg = await this.reconstruirConfiguracaoComChunks({ ...rawCfg });
      localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(cfg));
      this.agendarNotificacaoRemota();
    };
    try {
      const unsubCfg = onSnapshot(doc(firestoreDb, "configuracao_sistema", "global"), async (snap) => {
        if (snap.exists()) {
          await aplicarConfigRemota(snap.data() as ConfiguracaoSistema);
        }
      }, () => {});
      this.unsubRealtime.push(unsubCfg);

      const unsubCfgAlt = onSnapshot(doc(firestoreDb, "system_config", "global"), async (snap) => {
        if (snap.exists()) {
          await aplicarConfigRemota(snap.data() as ConfiguracaoSistema);
        }
      }, () => {});
      this.unsubRealtime.push(unsubCfgAlt);
    } catch {}
  }

  /**
   * Buscar perfil do usuário no Firebase (online) ou do dispositivo (offline).
   */
  public async buscarPerfilUsuario(identificador: string): Promise<Funcionario | null> {
    const termo = identificador.trim().toLowerCase();
    if (!termo) return null;

    const isAdminKeyword = termo === 'admin' || termo === 'admin.geral' || termo === 'admingeral' || termo === 'superadmin' || termo === 'administrador';

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const funcsRef = collection(firestoreDb, "funcionarios");
        const usersRef = collection(firestoreDb, "users");

        if (isAdminKeyword) {
          const adminRes = await withTimeout(
            Promise.all([
              getDocs(query(funcsRef, where("role", "==", "AdminGeral"))),
              getDocs(query(usersRef, where("role", "==", "AdminGeral")))
            ]),
            2000
          );
          if (adminRes !== FIRESTORE_TIMEOUT_TOKEN) {
            const [snapAdmin, snapAdminUsers] = adminRes;
            const admins = [
              ...snapAdmin.docs.map(d => d.data() as Funcionario),
              ...snapAdminUsers.docs.map(d => d.data() as Funcionario)
            ].filter(f => f.ativo !== false && f.nomeCompleto);
            if (admins.length > 0) {
              const userFromFirebase = admins[0];
              this.atualizarUsuarioNoDispositivo(userFromFirebase);
              return userFromFirebase;
            }
          } else {
            return this.buscarPerfilNoDispositivo(termo);
          }
        }

        const biUpper = identificador.trim().toUpperCase();
        // Consultas específicas em paralelo com timeout rígido para não travar offline/rede instável
        const parallelRes = await withTimeout(
          Promise.all([
            getDocs(query(funcsRef, where("email", "==", termo), limit(1))),
            getDocs(query(funcsRef, where("numeroBI", "==", biUpper), limit(1))),
            getDoc(doc(firestoreDb, "funcionarios", identificador.trim()))
          ]),
          2000
        );

        if (parallelRes === FIRESTORE_TIMEOUT_TOKEN) {
          return this.buscarPerfilNoDispositivo(termo);
        }

        const [snapEmail, snapBI, docDirect] = parallelRes;

        if (!snapEmail.empty) {
          const userFromFirebase = snapEmail.docs[0].data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }
        if (!snapBI.empty) {
          const userFromFirebase = snapBI.docs[0].data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }
        if (docDirect.exists()) {
          const userFromFirebase = docDirect.data() as Funcionario;
          this.atualizarUsuarioNoDispositivo(userFromFirebase);
          return userFromFirebase;
        }

        const snapAll = await withTimeout(getDocs(funcsRef), 2000);
        if (snapAll !== FIRESTORE_TIMEOUT_TOKEN) {
          for (const docSnap of snapAll.docs) {
            const f = docSnap.data() as Funcionario;
            const fEmail = (f.email || '').trim().toLowerCase();
            const fBi = (f.numeroBI || '').toUpperCase().replace(/\s+/g, '');
            const fNome = (f.nomeCompleto || '').trim().toLowerCase();
            const fId = (f.id || '').trim().toLowerCase();

            if (
              fEmail === termo ||
              fBi === biUpper ||
              fBi === termo.toUpperCase().replace(/\s+/g, '') ||
              fNome === termo ||
              fId === termo ||
              (isAdminKeyword && f.role === 'AdminGeral')
            ) {
              this.atualizarUsuarioNoDispositivo(f);
              return f;
            }
          }
        }
      } catch (err) {
        console.warn('[SGE Firebase Sync] Falha ao consultar perfil no Firestore, recorrendo ao dispositivo:', err);
      }
    }

    return this.buscarPerfilNoDispositivo(termo);
  }

  public buscarPerfilNoDispositivo(termo: string): Funcionario | null {
    try {
      if (typeof window === 'undefined') return null;
      const funcs = safeParseJson<Funcionario[]>(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS), []);
      if (!Array.isArray(funcs)) return null;

      if (termo === 'admin' || termo === 'admin.geral' || termo === 'admingeral' || termo === 'superadmin' || termo === 'administrador') {
        const adminFound = funcs.find(f => f.role === 'AdminGeral' && f.ativo);
        if (adminFound) return adminFound;
      }

      const termoBi = termo.toUpperCase().replace(/\s+/g, '');

      return funcs.find(f => {
        const fEmail = (f.email || '').trim().toLowerCase();
        const fBi = (f.numeroBI || '').toUpperCase().replace(/\s+/g, '');
        const fNome = (f.nomeCompleto || '').trim().toLowerCase();
        const fId = (f.id || '').trim().toLowerCase();

        return fEmail === termo || fBi === termoBi || fNome === termo || fId === termo;
      }) || null;
    } catch {
      return null;
    }
  }

  /**
   * Salva o perfil no dispositivo e diretamente no Firebase Firestore.
   */
  public async salvarPerfilUsuario(funcionario: Funcionario): Promise<boolean> {
    this.atualizarUsuarioNoDispositivo(funcionario);
    const ok = await this.gravarDocumentoDireto(
      "funcionarios",
      funcionario.id,
      funcionario,
      ["users"],
      `Perfil de ${funcionario.nomeCompleto}`
    );
    offlineStorage.registarMutacao(
      'Utilizador',
      'ATUALIZAR',
      ok
        ? `Perfil de ${funcionario.nomeCompleto} salvo diretamente no Firebase e no dispositivo.`
        : `Perfil de ${funcionario.nomeCompleto} salvo no dispositivo (fila offline ativa).`,
      funcionario.nomeCompleto
    );
    return true;
  }

  public atualizarUsuarioNoDispositivo(user: Funcionario) {
    try {
      if (typeof window === 'undefined') return;
      const funcs = safeParseJson<Funcionario[]>(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS), []);
      const idx = funcs.findIndex(f => f.id === user.id || (f.email && user.email && f.email.toLowerCase() === user.email.toLowerCase()));
      if (idx >= 0) {
        funcs[idx] = { 
          ...funcs[idx], 
          ...user,
          password: user.password || funcs[idx].password || '',
          fotoUrl: user.fotoUrl !== undefined ? user.fotoUrl : (funcs[idx].fotoUrl || '')
        };
      } else {
        funcs.push(user);
      }
      localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(funcs));

      const curRaw = localStorage.getItem('sge_user') || localStorage.getItem('sge_current_user');
      if (curRaw) {
        try {
          const cur = JSON.parse(curRaw);
          if (cur.id === user.id || (cur.email && user.email && cur.email.toLowerCase() === user.email.toLowerCase())) {
            const mergedCur = { ...cur, ...user };
            localStorage.setItem('sge_user', JSON.stringify(mergedCur));
            localStorage.setItem('sge_current_user', JSON.stringify(mergedCur));
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[SGE Firebase Sync] Erro ao gravar utilizador no dispositivo:', e);
    }
  }

  private async reconstruirConfiguracaoComChunks(configFromFirebase: ConfiguracaoSistema): Promise<ConfiguracaoSistema> {
    if (configFromFirebase.insigniaChunksCount && configFromFirebase.insigniaChunksCount > 0 && firestoreDb) {
      try {
        const chunkPromises = Array.from({ length: configFromFirebase.insigniaChunksCount }, (_, i) =>
          getDoc(doc(firestoreDb!, "configuracao_sistema", `insignia_chunk_${i}`))
        );
        const chunkSnaps = await Promise.all(chunkPromises);
        const chunks = chunkSnaps.map(cSnap => (cSnap.exists() ? (cSnap.data().chunk || '') : ''));
        if (chunks.every(Boolean)) {
          configFromFirebase.insigniaNacionalUrl = chunks.join('');
        }
      } catch (chunkErr) {
        console.warn('[SGE Firebase Sync] Falha ao reconstruir chunks da insígnia:', chunkErr);
      }
    }

    if (configFromFirebase.insigniaNacionalUrl === '[CHUNKED]') {
      try {
        const parsed = safeParseJson<any>(localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA), null);
        if (parsed?.insigniaNacionalUrl && parsed.insigniaNacionalUrl !== '[CHUNKED]') {
          configFromFirebase.insigniaNacionalUrl = parsed.insigniaNacionalUrl;
        }
      } catch {}
    }
    return configFromFirebase;
  }

  public async buscarConfiguracaoSistema(): Promise<ConfiguracaoSistema | null> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const cfgSnaps = await withTimeout(
          Promise.all([
            getDoc(doc(firestoreDb, "configuracao_sistema", "global")),
            getDoc(doc(firestoreDb, "system_config", "global"))
          ]),
          2000
        );

        if (cfgSnaps !== FIRESTORE_TIMEOUT_TOKEN) {
          const [docSnap, docSnapAlt] = cfgSnaps;
          let configFromFirebase: ConfiguracaoSistema | null = null;
          if (docSnap.exists()) {
            configFromFirebase = docSnap.data() as ConfiguracaoSistema;
          } else if (docSnapAlt.exists()) {
            configFromFirebase = docSnapAlt.data() as ConfiguracaoSistema;
          }

          if (configFromFirebase) {
            configFromFirebase = await this.reconstruirConfiguracaoComChunks(configFromFirebase);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(configFromFirebase));
            }
            return configFromFirebase;
          }
        }
      } catch (err) {
        console.warn('[SGE Firebase Sync] Falha ao carregar configuração do Firestore:', err);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        return safeParseJson<ConfiguracaoSistema | null>(localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA), null);
      }
    } catch {}
    return null;
  }

  public async gravarConfiguracaoNoFirestore(config: ConfiguracaoSistema): Promise<boolean> {
    if (!this.canUseFirestore() || !firestoreDb) {
      offlineStorage.adicionarPendencia('configuracao_sistema', 'ATUALIZAR', 'Configuração Global do Sistema', config, 'global', ['system_config']);
      return false;
    }

    try {
      let insigniaFinal = config.insigniaNacionalUrl || '';

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
        } catch {}
      }

      const CHUNK_SIZE = 240000;
      let chunksCount = 0;
      let payloadInsignia = insigniaFinal;

      if (insigniaFinal && insigniaFinal.length > 350000) {
        chunksCount = Math.ceil(insigniaFinal.length / CHUNK_SIZE);
        await Promise.all(
          Array.from({ length: chunksCount }, (_, i) => {
            const chunkStr = insigniaFinal.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            return setDoc(doc(firestoreDb!, "configuracao_sistema", `insignia_chunk_${i}`), { chunk: chunkStr, index: i, total: chunksCount });
          })
        );
        payloadInsignia = "[CHUNKED]";
      }

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
        atualizadoEm: config.atualizadoEm || new Date().toISOString()
      };

      await Promise.allSettled([
        setDoc(doc(firestoreDb, "configuracao_sistema", "global"), payload),
        setDoc(doc(firestoreDb, "system_config", "global"), payload)
      ]);
      offlineStorage.removerPendenciaPorDocumento('configuracao_sistema', 'global');

      return true;
    } catch (e) {
      console.warn('[SGE Firebase Sync] Erro ao gravar configuração no Firestore:', e);
      offlineStorage.adicionarPendencia('configuracao_sistema', 'ATUALIZAR', 'Configuração Global do Sistema', config, 'global', ['system_config']);
      return false;
    }
  }

  public async salvarConfiguracaoSistema(config: ConfiguracaoSistema): Promise<boolean> {
    const cfgAtualizada = { ...config, atualizadoEm: new Date().toISOString() };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(cfgAtualizada));
    }
    await this.gravarConfiguracaoNoFirestore(cfgAtualizada);
    return true;
  }

  /**
   * Helper genérico para descarregar e reconciliar bidirecionalmente uma coleção tipo Array no Firebase
   */
  private async puxarColecaoArray<T extends Record<string, any>>(
    colecao: string,
    storageKey: string,
    options?: {
      filterValid?: (item: T) => boolean;
      preserveFieldFn?: (local: T | undefined, remote: T) => T;
      getIdFn?: (item: T) => string;
      uploadLocalIfRemoteEmpty?: boolean;
      extraColecoes?: string[];
    }
  ): Promise<T[]> {
    if (!firestoreDb) return [];
    const snap = await getDocs(collection(firestoreDb, colecao));
    const remotos: T[] = [];
    snap.forEach(d => {
      const data = d.data() as T;
      if (data) {
        remotos.push({ ...data, id: data.id || d.id });
      }
    });

    const getId = options?.getIdFn || ((i: T) => i.id);
    const deveSubirLocais = options?.uploadLocalIfRemoteEmpty !== false;

    if (remotos.length > 0) {
      let itensParaSubir: T[] = [];
      const aplicados = this.aplicarSnapshotArray(
        storageKey,
        colecao,
        remotos,
        snap.metadata.fromCache,
        options?.filterValid,
        options?.preserveFieldFn,
        getId,
        (lista) => {
          itensParaSubir = lista;
        }
      );
      if (deveSubirLocais && itensParaSubir.length > 0 && !snap.metadata.fromCache) {
        const lote = itensParaSubir
          .map(v => ({ id: getId(v), dados: v }))
          .filter(entry => Boolean(entry.id));
        if (lote.length > 0) {
          await this.gravarLoteDireto(colecao, lote, options?.extraColecoes);
        }
      }
      return aplicados;
    } else if (deveSubirLocais) {
      const locais = safeParseJson<T[]>(localStorage.getItem(storageKey), []);
      const validos = options?.filterValid ? locais.filter(options.filterValid) : locais;
      if (validos.length > 0) {
        const lote = validos
          .map(v => ({ id: getId(v), dados: v }))
          .filter(entry => Boolean(entry.id));
        if (lote.length > 0) {
          await this.gravarLoteDireto(colecao, lote, options?.extraColecoes);
        }
        return validos;
      }
    }
    return [];
  }

  /**
   * Helper genérico para descarregar e reconciliar bidirecionalmente coleções tipo Record<string, any> (Map por chave)
   */
  private async puxarColecaoMapa(
    colecao: string,
    storageKey: string,
    docToKeyFn?: (docId: string, data: any) => string,
    unwrapFn?: (data: any) => any,
    wrapForUploadFn?: (k: string, val: any) => Record<string, any>
  ): Promise<void> {
    if (!firestoreDb) return;
    const snap = await getDocs(collection(firestoreDb, colecao));
    const localMap = safeParseJson<Record<string, any>>(localStorage.getItem(storageKey), {});
    const pendentes = offlineStorage.obterPendencias().filter(p => p.entidade === colecao);
    const pendingMap = new Map(pendentes.map(p => [p.docId || p.dados?.id, p]));
    const remoteKeys = new Set<string>();

    snap.forEach(d => {
      const rawData = d.data();
      const mapKey = docToKeyFn ? docToKeyFn(d.id, rawData) : d.id;
      remoteKeys.add(mapKey);
      const pend = pendingMap.get(d.id) || pendingMap.get(mapKey);
      if (pend && pend.acao !== 'ELIMINAR') return; // preserva alteração local pendente
      localMap[mapKey] = unwrapFn ? unwrapFn(rawData) : rawData;
    });

    // Subir chaves que só existem localmente no dispositivo e ainda não estão no Firestore
    if (!snap.metadata.fromCache) {
      const faltandoNoFirebase = Object.entries(localMap).filter(([k]) => !remoteKeys.has(k));
      if (faltandoNoFirebase.length > 0) {
        const lote = faltandoNoFirebase.map(([k, v]) => ({
          id: k,
          dados: wrapForUploadFn ? wrapForUploadFn(k, v) : (typeof v === 'object' && v !== null ? { ...v, id: v.id || k } : { id: k, valor: v })
        }));
        await this.gravarLoteDireto(colecao, lote);
      }
    }

    if (Object.keys(localMap).length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(localMap));
        if (!snap.empty) {
          localStorage.setItem(`sge_remote_synced_${colecao}`, 'true');
        }
      } catch {}
    }
  }

  /**
   * Download Ultra-Rápido em 3 Ondas Paralelas (com deduplicação de concorrência)
   */
  public async puxarTudoDoFirebase(forceReload: boolean = false): Promise<{ sucesso: boolean; mensagem: string }> {
    if (!this.canUseFirestore() || !firestoreDb) {
      return { sucesso: false, mensagem: 'Modo offline: utilizando dados guardados no dispositivo.' };
    }

    if (this.pullPromise && !forceReload) {
      return this.pullPromise;
    }

    const executePull = async (): Promise<{ sucesso: boolean; mensagem: string }> => {
      try {
        this.emSincronizacao = true;
        this.atualizarProgresso(12, 'A conectar em alta velocidade ao Firebase Firestore...');

        // ============================================================
        // ONDA 1 (CRÍTICA): Configuração, Escolas e Utilizadores em paralelo
        // Permite autenticar e abrir o painel em < 500ms num novo dispositivo!
        // ============================================================
        await Promise.allSettled([
          this.buscarConfiguracaoSistema(),
          this.puxarColecaoArray<Escola>("escolas", STORAGE_KEYS.ESCOLAS, {
            filterValid: (esc) => Boolean(esc && esc.id && !isDemoEscola(esc)),
            preserveFieldFn: (existing, esc) => this.mergeEscolaRemota(existing, esc),
            uploadLocalIfRemoteEmpty: true,
            extraColecoes: ["schools"]
          }),
          (async () => {
            const funcs = await this.puxarColecaoArray<Funcionario>("funcionarios", STORAGE_KEYS.FUNCIONARIOS, {
              filterValid: (f) => Boolean(f && f.id && f.nomeCompleto && !isDemoFunc(f)),
              preserveFieldFn: (existing, rf) => {
                const fotoExistente =
                  existing?.fotoUrl && existing.fotoUrl !== '__idb_media__'
                    ? existing.fotoUrl
                    : (existing?.id ? (offlineStorage.obterMidiaEmCache('funcionario', existing.id) || '') : '');
                const fotoFinal = rf.fotoUrl !== undefined ? rf.fotoUrl : fotoExistente;
                if (rf.id && rf.fotoUrl !== undefined) {
                  offlineStorage.definirMidiaEmCache('funcionario', rf.id, rf.fotoUrl);
                }
                return {
                  ...existing,
                  ...rf,
                  password: rf.password || existing?.password || '',
                  fotoUrl: fotoFinal
                };
              },
              uploadLocalIfRemoteEmpty: true,
              extraColecoes: ["users"]
            });

            // Complementar com perfis presentes em "users" (em falta ou mais recentes, ex.: Diretores)
            let listaConsolidada = funcs;
            try {
              if (firestoreDb) {
                const snapUsers = await getDocs(collection(firestoreDb, "users"));
                if (!snapUsers.empty) {
                  const mapCons = new Map(listaConsolidada.map(f => [f.id, f]));
                  const extras: Funcionario[] = [];
                  let mudou = false;
                  snapUsers.forEach(d => {
                    const u = d.data() as Funcionario;
                    const uid = u?.id || d.id;
                    if (!u || !u.nomeCompleto || isDemoFunc({ ...u, id: uid })) return;
                    const uNorm = { ...u, id: uid };
                    const localExisting = mapCons.get(uid);
                    if (!localExisting) {
                      mapCons.set(uid, uNorm);
                      extras.push(uNorm);
                      mudou = true;
                    } else {
                      const tLoc = localExisting.atualizadoEm ? Date.parse(String(localExisting.atualizadoEm)) : 0;
                      const tRem = uNorm.atualizadoEm ? Date.parse(String(uNorm.atualizadoEm)) : 0;
                      if (tRem > tLoc + 500) {
                        const merged = {
                          ...localExisting,
                          ...uNorm,
                          password: uNorm.password || localExisting.password || '',
                          fotoUrl: uNorm.fotoUrl !== undefined ? uNorm.fotoUrl : localExisting.fotoUrl
                        };
                        mapCons.set(uid, merged);
                        extras.push(merged);
                        mudou = true;
                      }
                    }
                  });
                  if (mudou) {
                    listaConsolidada = Array.from(mapCons.values());
                    localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(listaConsolidada));
                    if (extras.length > 0) {
                      await this.gravarLoteDireto("funcionarios", extras.map(e => ({ id: e.id, dados: e })));
                    }
                  }
                }
              }
            } catch {}

            if (listaConsolidada.length > 0) {
              await offlineStorage.salvarFuncionariosLoteNoIndexedDB(listaConsolidada);
            }
            if (listaConsolidada.some(f => f.role === 'AdminGeral' && f.ativo !== false)) {
              localStorage.setItem('sge_admin_configured', 'true');
              localStorage.setItem('sge_setup_inicial_concluido', 'true');
            }
          })()
        ]);

        // Reconciliar Diretores Gerais encontrados com as respectivas escolas no dispositivo e reparar divergências na nuvem
        this.reconciliarDiretoresLocal(true);

        this.atualizarProgresso(45, 'Instituições e utilizadores carregados. A sincronizar dados académicos...');
        this.agendarNotificacaoRemota(true);

        // ============================================================
        // ONDA 2 (ACADÉMICA): Turmas, Disciplinas, Alunos, Atribuições, Avaliações, Notas em paralelo
        // ============================================================
        await Promise.allSettled([
          this.puxarColecaoArray<Turma>("turmas", STORAGE_KEYS.TURMAS, {
            filterValid: (t) => Boolean(t && t.id),
            uploadLocalIfRemoteEmpty: true
          }),
          this.puxarColecaoArray<any>("disciplinas", STORAGE_KEYS.DISCIPLINAS, {
            filterValid: (d) => Boolean(d && d.id),
            uploadLocalIfRemoteEmpty: true
          }),
          this.puxarColecaoArray<Aluno>("alunos", STORAGE_KEYS.ALUNOS, {
            filterValid: (a) => Boolean(a && a.id && !isDemoAluno(a)),
            uploadLocalIfRemoteEmpty: true
          }),
          this.puxarColecaoArray<any>("atribuicoes", STORAGE_KEYS.ATRIBUICOES, {
            filterValid: (at) => Boolean(at && at.id),
            uploadLocalIfRemoteEmpty: true
          }),
          this.puxarColecaoArray<any>("avaliacoes", STORAGE_KEYS.AVALIACOES, {
            filterValid: (av) => Boolean(av && av.id),
            uploadLocalIfRemoteEmpty: true
          }),
          this.puxarColecaoArray<any>("notas", STORAGE_KEYS.NOTAS_CONSOLIDADAS, {
            filterValid: (n) => Boolean(n && (n.id || n.alunoId)),
            getIdFn: (n) => n.id || `${n.alunoId}_${n.disciplinaId}_${n.trimestre}_${n.anoLectivo || 'padrao'}`,
            uploadLocalIfRemoteEmpty: true
          }),
          this.puxarColecaoArray<any>("notas_estudantes", STORAGE_KEYS.NOTAS, {
            filterValid: (n) => Boolean(n && (n.id || n.avaliacaoId)),
            getIdFn: (n) => n.id || `${n.avaliacaoId}_${n.alunoId}`,
            uploadLocalIfRemoteEmpty: true
          })
        ]);

        this.atualizarProgresso(80, 'A sincronizar finanças, horários, júris e documentos...');
        this.agendarNotificacaoRemota();

        // ============================================================
        // ONDA 3 (COMPLEMENTAR): Finanças, Horários, Assiduidade, Júris, Documentos em paralelo
        // ============================================================
        await Promise.allSettled([
          this.puxarColecaoArray<any>("juris", STORAGE_KEYS.JURIS, { filterValid: (j) => Boolean(j && j.id), uploadLocalIfRemoteEmpty: true }),
          this.puxarColecaoArray<any>("termos_exame", STORAGE_KEYS.TERMOS_EXAME, { filterValid: (t) => Boolean(t && t.id), uploadLocalIfRemoteEmpty: true }),
          this.puxarColecaoArray<any>("mensagens", STORAGE_KEYS.MENSAGENS, { filterValid: (m) => Boolean(m && m.id), uploadLocalIfRemoteEmpty: true }),
          this.puxarColecaoArray<any>("solicitacoes_apoio", STORAGE_KEYS.SOLICITACOES_APOIO, { filterValid: (s) => Boolean(s && s.id), uploadLocalIfRemoteEmpty: true }),
          this.puxarColecaoArray<any>("anos_lectivos_configs", STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, { filterValid: (c) => Boolean(c && c.id) }),
          (async () => {
            if (!firestoreDb) return;
            const snap = await getDoc(doc(firestoreDb, "configuracao_sistema", "anos_lectivos"));
            if (snap.exists() && Array.isArray(snap.data().anos)) {
              localStorage.setItem(STORAGE_KEYS.ANOS_LECTIVOS, JSON.stringify(snap.data().anos));
            }
          })(),
          this.puxarColecaoArray<any>("turnos_configs", STORAGE_KEYS.TURNOS_CONFIGS, { filterValid: (t) => Boolean(t && t.id) }),
          this.puxarColecaoArray<any>("classes_configs", STORAGE_KEYS.CLASSES_CONFIGS, { filterValid: (c) => Boolean(c && c.id) }),
          this.puxarColecaoArray<any>("cursos", STORAGE_KEYS.CURSOS, { filterValid: (c) => Boolean(c && c.id) }),
          this.puxarColecaoArray<any>("regras_mac", STORAGE_KEYS.REGRAS_MAC, { filterValid: (r) => Boolean(r && r.id) }),
          this.puxarColecaoArray<any>("tipos_avaliacao", STORAGE_KEYS.TIPOS_AVALIACAO, { filterValid: (t) => Boolean(t && t.id) }),
          this.puxarColecaoArray<any>("solicitacoes_nota", STORAGE_KEYS.SOLICITACOES_NOTA, { filterValid: (s) => Boolean(s && s.id) }),
          this.puxarColecaoArray<any>("presencas", STORAGE_KEYS.PRESENCAS, {
            filterValid: (p) => Boolean(p && p.funcionarioId && p.data),
            getIdFn: (p) => p.id || `${p.funcionarioId}_${p.data}`
          }),
          this.puxarColecaoArray<any>("presencas_alunos", STORAGE_KEYS.PRESENCAS_ALUNOS, {
            filterValid: (p) => Boolean(p && p.alunoId && p.data),
            getIdFn: (p) => p.id || `${p.alunoId}_${p.data}_${p.tempoLectivo}`
          }),
          this.puxarColecaoArray<any>("horarios", STORAGE_KEYS.HORARIOS, { filterValid: (h) => Boolean(h && h.id) }),
          this.puxarColecaoArray<any>("biblioteca", STORAGE_KEYS.BIBLIOTECA, { filterValid: (b) => Boolean(b && b.id) }),
          this.puxarColecaoArray<any>("biblioteca_acessos", STORAGE_KEYS.BIBLIOTECA_ACESSOS, { filterValid: (ba) => Boolean(ba && ba.id) }),
          this.puxarColecaoArray<any>("recibos", STORAGE_KEYS.RECIBOS, { filterValid: (r) => Boolean(r && r.id) }),
          this.puxarColecaoArray<any>("transacoes_financeiras", STORAGE_KEYS.TRANSACOES_FINANCEIRAS, { filterValid: (t) => Boolean(t && t.id) }),
          this.puxarColecaoArray<any>("despesas_escolares", STORAGE_KEYS.DESPESAS_ESCOLARES, { filterValid: (d) => Boolean(d && d.id) }),
          this.puxarColecaoArray<any>("patrimonio", STORAGE_KEYS.PATRIMONIO, { filterValid: (p) => Boolean(p && p.id) }),
          this.puxarColecaoArray<any>("alteracoes_notas_direcao", STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, { filterValid: (r) => Boolean(r && r.id) }),
          this.puxarColecaoArray<any>("relatorios_acontecimentos", STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, { filterValid: (r) => Boolean(r && r.id), uploadLocalIfRemoteEmpty: true }),
          this.puxarColecaoArray<any>("delegacoes_poderes", STORAGE_KEYS.DELEGACOES_PODERES, { filterValid: (d) => Boolean(d && d.id) }),
          this.puxarColecaoArray<any>("acoes_delegadas_logs", STORAGE_KEYS.ACOES_DELEGADAS_LOGS, { filterValid: (l) => Boolean(l && l.id) }),
          this.puxarColecaoArray<any>("auditoria", STORAGE_KEYS.AUDITORIA, { filterValid: (l) => Boolean(l && l.id), uploadLocalIfRemoteEmpty: true }),
          this.puxarColecaoArray<any>("sessoes_ativas", STORAGE_KEYS.SESSOES_ATIVAS, {
            filterValid: (s) => Boolean(s && (s.userId || s.id)),
            getIdFn: (s) => s.userId || s.id
          }),
          this.puxarColecaoMapa("configuracoes_financeiras", STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, (docId, d) => d.escolaId || docId),
          this.puxarColecaoMapa("historico_completo", STORAGE_KEYS.HISTORICO_COMPLETO, (docId, d) => d.alunoId || docId),
          this.puxarColecaoMapa("configuracoes_passes", STORAGE_KEYS.CONFIGURACOES_PASSES, (docId, d) => d.escolaId || docId, undefined, (escolaId, v) => ({ ...v, escolaId, id: escolaId })),
          this.puxarColecaoMapa("configuracoes_documentos", STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, (docId, d) => (d.escolaId && d.tipoDocumento) ? `${d.escolaId}_${d.tipoDocumento}` : docId),
          this.puxarColecaoMapa("delegacoes_cobranca", STORAGE_KEYS.DELEGACOES_COBRANCA, (docId, d) => d.escolaId || docId, (d) => d.lista || d, (escolaId, lista) => ({ id: escolaId, escolaId, lista }))
        ]);

        this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
        this.emSincronizacao = false;
        this.atualizarProgresso(100, 'Sincronização concluída com sucesso!');
        this.notificarStatus();
        this.agendarNotificacaoRemota();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sge_sync_notificacao', {
            detail: {
              sucesso: true,
              mensagem: 'Dados sincronizados entre o dispositivo e o Firebase!',
              hora: this.ultimaSincronizacao
            }
          }));
        }

        return { sucesso: true, mensagem: 'Dados remotos sincronizados com sucesso!' };
      } catch (err: any) {
        console.warn('[SGE Firebase Sync] Falha ao descarregar dados remotos:', err);
        this.emSincronizacao = false;
        this.atualizarProgresso(0, 'Falha ao descarregar dados do Firestore.');
        return { sucesso: false, mensagem: err?.message || 'Falha ao descarregar dados do Firestore' };
      } finally {
        this.pullPromise = null;
      }
    };

    this.pullPromise = executePull();
    return this.pullPromise;
  }

  /**
   * Sincronização Completa e Imediata Bidirecional em Lotes Paralelos
   */
  public async sincronizarTudoImediato(): Promise<{ sucesso: boolean; mensagem: string }> {
    if (this.syncPromise) return this.syncPromise;

    const runSync = async (): Promise<{ sucesso: boolean; mensagem: string }> => {
      this.emSincronizacao = true;
      this.notificarStatus();

      try {
        await offlineStorage.hidratarArmazenamentoDoIndexedDB();

        if (this.canUseFirestore() && firestoreDb) {
          // 1. Primeiro envia pendências offline (inclui eliminações)
          await this.processarPendenciasOffline();

          // 2. Ler configuração LOCAL primeiro antes de puxar do remoto (evita sobrescrever insígnia local ainda não sincronizada)
          const configLocalAtual = typeof window !== 'undefined'
            ? safeParseJson<ConfiguracaoSistema | null>(localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA), null)
            : null;

          // 3. Preparar todos os lotes locais para envio paralelo
          const uploadArray = async (storageKey: string, colecao: string, extraColecoes?: string[], getIdFn: (item: any) => string = (i) => i.id, filterFn?: (item: any) => boolean) => {
            const list = safeParseJson<any[]>(localStorage.getItem(storageKey), []);
            if (!Array.isArray(list) || list.length === 0) return;
            const validList = filterFn ? list.filter(filterFn) : list;
            const itens = validList
              .map(item => ({ id: getIdFn(item), dados: item }))
              .filter(entry => Boolean(entry.id));
            if (itens.length > 0) {
              await this.gravarLoteDireto(colecao, itens, extraColecoes);
            }
          };

          const uploadMap = async (storageKey: string, colecao: string, wrapFn?: (k: string, val: any) => Record<string, any>) => {
            const obj = safeParseJson<Record<string, any>>(localStorage.getItem(storageKey), {});
            const entries = Object.entries(obj || {});
            if (entries.length === 0) return;
            const itens = entries.map(([k, v]) => ({
              id: k,
              dados: wrapFn ? wrapFn(k, v) : (typeof v === 'object' && v !== null ? { ...v, id: v.id || k } : { id: k, valor: v })
            }));
            await this.gravarLoteDireto(colecao, itens);
          };

          const uploadConfigIfNeeded = async () => {
            if (!configLocalAtual) return;
            const remoteSnap = await getDoc(doc(firestoreDb!, "configuracao_sistema", "global"));
            const remoteCfg = remoteSnap.exists() ? (remoteSnap.data() as ConfiguracaoSistema) : null;
            const tLocal = configLocalAtual.atualizadoEm ? Date.parse(String(configLocalAtual.atualizadoEm)) : 0;
            const tRemote = remoteCfg?.atualizadoEm ? Date.parse(String(remoteCfg.atualizadoEm)) : 0;
            const temDadosCustomLocal = Boolean(configLocalAtual.insigniaNacionalUrl || configLocalAtual.criadoPorAdminEmail);
            if (!remoteCfg || tLocal > tRemote || (temDadosCustomLocal && !remoteCfg.insigniaNacionalUrl)) {
              await this.gravarConfiguracaoNoFirestore(configLocalAtual);
            }
          };

          await Promise.allSettled([
            uploadConfigIfNeeded(),
            uploadArray(STORAGE_KEYS.FUNCIONARIOS, "funcionarios", ["users"], (f) => f.id, (f) => Boolean(f && f.id && f.nomeCompleto && !isDemoFunc(f))),
            uploadArray(STORAGE_KEYS.ESCOLAS, "escolas", ["schools"], (e) => e.id, (e) => Boolean(e && e.id && !isDemoEscola(e))),
            uploadArray(STORAGE_KEYS.ALUNOS, "alunos", undefined, (a) => a.id, (a) => Boolean(a && a.id && !isDemoAluno(a))),
            uploadArray(STORAGE_KEYS.TURMAS, "turmas"),
            uploadArray(STORAGE_KEYS.DISCIPLINAS, "disciplinas"),
            uploadArray(STORAGE_KEYS.AVALIACOES, "avaliacoes"),
            // NotaEstudante (sge_notas) -> notas_estudantes ; NotaTrimestralConsolidada (sge_notas_consolidadas) -> notas
            uploadArray(STORAGE_KEYS.NOTAS, "notas_estudantes", undefined, (n) => n.id || `${n.avaliacaoId}_${n.alunoId}`),
            uploadArray(STORAGE_KEYS.NOTAS_CONSOLIDADAS, "notas", undefined, (n) => n.id || `${n.alunoId}_${n.disciplinaId}_${n.trimestre}_${n.anoLectivo || 'padrao'}`),
            uploadArray(STORAGE_KEYS.SOLICITACOES_APOIO, "solicitacoes_apoio"),
            uploadArray(STORAGE_KEYS.MENSAGENS, "mensagens"),
            uploadArray(STORAGE_KEYS.ATRIBUICOES, "atribuicoes"),
            uploadArray(STORAGE_KEYS.JURIS, "juris"),
            uploadArray(STORAGE_KEYS.TERMOS_EXAME, "termos_exame"),
            uploadArray(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, "anos_lectivos_configs"),
            (async () => {
              const anos = safeParseJson<string[]>(localStorage.getItem(STORAGE_KEYS.ANOS_LECTIVOS), []);
              if (anos.length > 0) await this.salvarAnosLectivosLista(anos);
            })(),
            uploadArray(STORAGE_KEYS.TURNOS_CONFIGS, "turnos_configs"),
            uploadArray(STORAGE_KEYS.CLASSES_CONFIGS, "classes_configs"),
            uploadArray(STORAGE_KEYS.CURSOS, "cursos"),
            uploadArray(STORAGE_KEYS.REGRAS_MAC, "regras_mac"),
            uploadArray(STORAGE_KEYS.TIPOS_AVALIACAO, "tipos_avaliacao"),
            uploadArray(STORAGE_KEYS.SOLICITACOES_NOTA, "solicitacoes_nota"),
            uploadArray(STORAGE_KEYS.PRESENCAS, "presencas", undefined, (p) => p.id || `${p.funcionarioId}_${p.data}`),
            uploadArray(STORAGE_KEYS.PRESENCAS_ALUNOS, "presencas_alunos", undefined, (p) => p.id || `${p.alunoId}_${p.data}_${p.tempoLectivo}`),
            uploadArray(STORAGE_KEYS.HORARIOS, "horarios"),
            uploadArray(STORAGE_KEYS.BIBLIOTECA, "biblioteca"),
            uploadArray(STORAGE_KEYS.BIBLIOTECA_ACESSOS, "biblioteca_acessos"),
            uploadArray(STORAGE_KEYS.RECIBOS, "recibos"),
            uploadArray(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, "transacoes_financeiras"),
            uploadArray(STORAGE_KEYS.DESPESAS_ESCOLARES, "despesas_escolares"),
            uploadArray(STORAGE_KEYS.PATRIMONIO, "patrimonio"),
            uploadArray(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, "alteracoes_notas_direcao"),
            uploadArray(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, "relatorios_acontecimentos"),
            uploadArray(STORAGE_KEYS.DELEGACOES_PODERES, "delegacoes_poderes"),
            uploadArray(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, "acoes_delegadas_logs"),
            uploadArray(STORAGE_KEYS.AUDITORIA, "auditoria"),
            uploadMap(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, "configuracoes_financeiras"),
            uploadMap(STORAGE_KEYS.HISTORICO_COMPLETO, "historico_completo"),
            uploadMap(STORAGE_KEYS.CONFIGURACOES_PASSES, "configuracoes_passes", (escolaId, v) => ({ ...v, escolaId, id: escolaId })),
            uploadMap(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, "configuracoes_documentos"),
            uploadMap(STORAGE_KEYS.DELEGACOES_COBRANCA, "delegacoes_cobranca", (escolaId, lista) => ({ id: escolaId, escolaId, lista }))
          ]);

          // 4. Descarregar estado reconciliado do Firestore
          await this.puxarTudoDoFirebase(true);
        }

        await offlineStorage.sincronizar();

        this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
        this.emSincronizacao = false;
        this.notificarStatus();

        return {
          sucesso: this.canUseFirestore(),
          mensagem: this.canUseFirestore()
            ? 'Sincronização imediata concluída com sucesso entre o Firebase e o dispositivo!'
            : 'Sem ligação à internet. Os dados permanecem salvos no dispositivo e subirão automaticamente assim que ficar online.'
        };
      } catch (e: any) {
        console.error('[SGE Firebase Sync] Erro global na sincronização:', e);
        this.emSincronizacao = false;
        this.notificarStatus();
        return {
          sucesso: false,
          mensagem: 'Dados preservados no dispositivo. A sincronização com o Firebase será retomada automaticamente.'
        };
      } finally {
        this.syncPromise = null;
      }
    };

    this.syncPromise = runSync();
    return this.syncPromise;
  }

  // =========================================================================
  // RECONCILIAÇÃO & SINCRONIZAÇÃO ATÓMICA DE DIRETORES GERAIS <-> ESCOLAS
  // =========================================================================

  private mergeEscolaRemota(existing: Escola | undefined, esc: Escola): Escola {
    const tLocal = existing?.atualizadoEm ? Date.parse(String(existing.atualizadoEm)) : 0;
    const tRemote = esc.atualizadoEm ? Date.parse(String(esc.atualizadoEm)) : 0;
    const remotoMaisRecenteOuIgual = isNaN(tRemote) || isNaN(tLocal) || tRemote >= tLocal;

    const placeholders = new Set([
      'não atribuído',
      'nao atribuido',
      'pendente de nomeação',
      'pendente de nomeacao',
      'pendente',
      'a designar',
      ''
    ]);
    const nomeRemotoNorm = (esc.diretorGeralNome || '').trim().toLowerCase();
    const remotoTemDiretorReal =
      Boolean(esc.diretorGeralId) ||
      (Boolean(esc.diretorGeralNome) && !placeholders.has(nomeRemotoNorm));
    const remotoRemoveuDiretor =
      remotoMaisRecenteOuIgual &&
      !esc.diretorGeralId &&
      (nomeRemotoNorm === 'não atribuído' || nomeRemotoNorm === 'nao atribuido');

    let diretorGeralId = esc.diretorGeralId || existing?.diretorGeralId;
    let diretorGeralNome = !placeholders.has(nomeRemotoNorm)
      ? esc.diretorGeralNome
      : (existing?.diretorGeralNome || 'Não Atribuído');
    let diretorGeralEmail = esc.diretorGeralEmail || existing?.diretorGeralEmail;
    let diretorGeralTelefone = esc.diretorGeralTelefone || existing?.diretorGeralTelefone;
    let diretorGeralGenero = esc.diretorGeralGenero || existing?.diretorGeralGenero;

    if (remotoRemoveuDiretor) {
      diretorGeralId = undefined;
      diretorGeralNome = 'Não Atribuído';
      diretorGeralEmail = undefined;
      diretorGeralTelefone = undefined;
    } else if (remotoTemDiretorReal && remotoMaisRecenteOuIgual) {
      diretorGeralId = esc.diretorGeralId;
      diretorGeralNome = esc.diretorGeralNome || existing?.diretorGeralNome || 'Não Atribuído';
      diretorGeralEmail = esc.diretorGeralEmail ?? existing?.diretorGeralEmail;
      diretorGeralTelefone = esc.diretorGeralTelefone ?? existing?.diretorGeralTelefone;
      diretorGeralGenero = esc.diretorGeralGenero ?? existing?.diretorGeralGenero;
    }

    const merged: Escola = {
      ...existing,
      ...esc,
      nomeOficial: esc.nomeOficial || (esc as any).nome || existing?.nomeOficial || 'Escola',
      nome: (esc as any).nome || esc.nomeOficial || existing?.nome,
      diretorGeralId,
      diretorGeralNome,
      diretorGeralEmail,
      diretorGeralTelefone,
      diretorGeralGenero,
      logotipoUrl: esc.logotipoUrl !== undefined ? esc.logotipoUrl : existing?.logotipoUrl,
      assinaturaDiretorUrl: esc.assinaturaDiretorUrl !== undefined ? esc.assinaturaDiretorUrl : existing?.assinaturaDiretorUrl
    };
    if (!esc.sessaoApoioTecnicoAtiva) {
      delete merged.sessaoApoioTecnicoAtiva;
    }
    return merged;
  }

  /**
   * Reconcilia localmente em ambos os sentidos (Funcionários <-> Escolas) para eliminar
   * qualquer discrepância entre Admin Geral e os painéis das escolas.
   */
  public reconciliarDiretoresLocal(pushRepairsToFirebase: boolean = false): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const escLocais = safeParseJson<Escola[]>(localStorage.getItem(STORAGE_KEYS.ESCOLAS), []);
      const funcLocais = safeParseJson<Funcionario[]>(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS), []);
      if (!Array.isArray(escLocais) || escLocais.length === 0) return false;

      const pendentes = offlineStorage.obterPendencias();
      const pendingDeleteFuncIds = new Set(
        pendentes.filter(p => p.entidade === 'funcionarios' && p.acao === 'ELIMINAR').map(p => p.docId || p.dados?.id)
      );
      const hasPendingFuncUpserts = pendentes.some(p => p.entidade === 'funcionarios' && p.acao !== 'ELIMINAR');
      const funcionariosJaSincronizados = localStorage.getItem('sge_remote_synced_funcionarios') === 'true';

      const isDiretorAtivo = (f: Funcionario) =>
        Boolean(f) &&
        !isDemoFunc(f) &&
        !pendingDeleteFuncIds.has(f.id) &&
        f.role !== 'AdminGeral' &&
        f.ativo !== false &&
        (f.role === 'DiretorGeral' ||
          (f.cargo || '').toLowerCase().includes('diretor geral') ||
          (f.cargo || '').toLowerCase().includes('director geral'));

      const idsOutrasEscolas = (escAtual: Escola, f: Funcionario) =>
        escLocais.some(
          other =>
            other.id !== escAtual.id &&
            ((f.escolaId && (f.escolaId === other.id || (other.codigoEscola && f.escolaId === other.codigoEscola))) ||
              other.diretorGeralId === f.id)
        );

      let alterouEsc = false;
      let alterouFunc = false;
      const escolasReparadas: Escola[] = [];

      const escAtualizadas = escLocais.map(esc => {
        const candidatosDaEscola = funcLocais.filter(
          f =>
            isDiretorAtivo(f) &&
            (f.escolaId === esc.id || (esc.codigoEscola && f.escolaId === esc.codigoEscola))
        );

        let dir: Funcionario | undefined;
        if (candidatosDaEscola.length > 0) {
          // Priorizar o diretor já apontado por diretorGeralId se ainda ativo e mais recente, ou o mais recente atribuído à escola
          const ordenado = [...candidatosDaEscola].sort((a, b) => {
            const tA = a.atualizadoEm ? Date.parse(String(a.atualizadoEm)) || 0 : 0;
            const tB = b.atualizadoEm ? Date.parse(String(b.atualizadoEm)) || 0 : 0;
            if (tB !== tA) return tB - tA;
            if (a.id === esc.diretorGeralId) return -1;
            if (b.id === esc.diretorGeralId) return 1;
            return 0;
          });
          dir = ordenado[0];
        } else {
          dir =
            funcLocais.find(f => isDiretorAtivo(f) && esc.diretorGeralId && f.id === esc.diretorGeralId && !idsOutrasEscolas(esc, f)) ||
            (esc.diretorGeralEmail
              ? funcLocais.find(
                  f =>
                    isDiretorAtivo(f) &&
                    f.email &&
                    f.email.trim().toLowerCase() === esc.diretorGeralEmail!.trim().toLowerCase() &&
                    !idsOutrasEscolas(esc, f)
                )
              : undefined);
        }

        if (dir) {
          // Garantir que dir.escolaId aponta para esc.id
          const idxF = funcLocais.findIndex(f => f.id === dir!.id);
          if (idxF >= 0 && funcLocais[idxF].escolaId !== esc.id) {
            funcLocais[idxF] = { ...funcLocais[idxF], escolaId: esc.id };
            alterouFunc = true;
          }

          const precisaAtualizarEsc =
            esc.diretorGeralId !== dir.id ||
            esc.diretorGeralNome !== dir.nomeCompleto ||
            (dir.email && esc.diretorGeralEmail !== dir.email) ||
            (dir.telefone && esc.diretorGeralTelefone !== dir.telefone) ||
            (!esc.diretorGeralGenero && Boolean(dir.genero));

          if (precisaAtualizarEsc) {
            alterouEsc = true;
            const corrigida: Escola = {
              ...esc,
              diretorGeralId: dir.id,
              diretorGeralNome: dir.nomeCompleto,
              diretorGeralGenero: dir.genero || esc.diretorGeralGenero || 'M',
              diretorGeralEmail: dir.email || esc.diretorGeralEmail,
              diretorGeralTelefone: dir.telefone || esc.diretorGeralTelefone
            };
            escolasReparadas.push(corrigida);
            return corrigida;
          }
          return esc;
        }

        // Se funcionarios já foi sincronizado remotamente (sem pendências locais) e o diretor antigo não existe ou ficou inativo
        if (funcionariosJaSincronizados && !hasPendingFuncUpserts && esc.diretorGeralId) {
          const antigoExisteAtivo = funcLocais.some(f => f.id === esc.diretorGeralId && isDiretorAtivo(f) && (!f.escolaId || f.escolaId === esc.id));
          if (!antigoExisteAtivo) {
            alterouEsc = true;
            const limpa: Escola = {
              ...esc,
              diretorGeralId: undefined,
              diretorGeralNome: 'Não Atribuído',
              diretorGeralEmail: undefined,
              diretorGeralTelefone: undefined
            };
            escolasReparadas.push(limpa);
            return limpa;
          }
        }

        return esc;
      });

      if (alterouFunc) {
        const serFuncs = JSON.stringify(funcLocais);
        localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, serFuncs);
        offlineStorage.salvarFuncionariosLoteNoIndexedDB(funcLocais);
      }

      if (alterouEsc) {
        const serEsc = JSON.stringify(escAtualizadas);
        localStorage.setItem(STORAGE_KEYS.ESCOLAS, serEsc);
        offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, serEsc);
        if (pushRepairsToFirebase && escolasReparadas.length > 0 && this.canUseFirestore()) {
          this.gravarLoteDireto(
            "escolas",
            escolasReparadas.map(e => ({ id: e.id, dados: e })),
            ["schools"]
          ).catch(() => {});
        }
      }

      return alterouEsc || alterouFunc;
    } catch {
      return false;
    }
  }

  /**
   * Sincronização Atómica (writeBatch) de Atribuição de Diretor Geral <-> Escola:
   * Grava em simultâneo `funcionarios/{dirId}`, `users/{dirId}`, `escolas/{escId}` e `schools/{escId}`
   * numa única transação batch no Firestore + fila offline garantida se sem rede.
   */
  public async sincronizarAtribuicaoDiretor(
    diretor: Funcionario,
    escola: Escola,
    diretoresSubstituidos?: Funcionario[]
  ): Promise<boolean> {
    if (!diretor?.id || !escola?.id) return false;

    const agora = diretor.atualizadoEm || escola.atualizadoEm || new Date().toISOString();
    const diretorFinal: Funcionario = { ...diretor, escolaId: escola.id, atualizadoEm: agora };
    const escolaFinal: Escola = {
      ...escola,
      diretorGeralId: diretorFinal.id,
      diretorGeralNome: diretorFinal.nomeCompleto,
      diretorGeralGenero: diretorFinal.genero || escola.diretorGeralGenero || 'M',
      diretorGeralEmail: diretorFinal.email || escola.diretorGeralEmail,
      diretorGeralTelefone: diretorFinal.telefone || escola.diretorGeralTelefone,
      atualizadoEm: agora
    };

    // Enfileira pendências offline sincronamente antes de qualquer await
    offlineStorage.adicionarPendencia(
      "funcionarios",
      "ATUALIZAR",
      `Diretor Geral ${diretorFinal.nomeCompleto} (${escolaFinal.nomeOficial})`,
      diretorFinal,
      diretorFinal.id,
      ["users"]
    );
    offlineStorage.adicionarPendencia(
      "escolas",
      "ATUALIZAR",
      `Vínculo Diretor -> Escola ${escolaFinal.nomeOficial}`,
      escolaFinal,
      escolaFinal.id,
      ["schools"]
    );
    if (diretoresSubstituidos && diretoresSubstituidos.length > 0) {
      for (const oldDir of diretoresSubstituidos) {
        if (oldDir.id !== diretorFinal.id) {
          offlineStorage.adicionarPendencia(
            "funcionarios",
            "ATUALIZAR",
            `Substituição Diretor anterior ${oldDir.nomeCompleto}`,
            oldDir,
            oldDir.id,
            ["users"]
          );
        }
      }
    }

    this.atualizarUsuarioNoDispositivo(diretorFinal);
    this.emitirBroadcastDiretorEscola();
    this.agendarNotificacaoRemota(true);

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const [payloadDir, payloadEsc] = await Promise.all([
          this.prepararPayloadComLimiteDeTamanho(diretorFinal, "funcionarios"),
          this.prepararPayloadComLimiteDeTamanho(escolaFinal, "escolas")
        ]);

        const batch = writeBatch(firestoreDb);
        batch.set(doc(firestoreDb, "funcionarios", diretorFinal.id), payloadDir, { merge: true });
        batch.set(doc(firestoreDb, "users", diretorFinal.id), payloadDir, { merge: true });
        batch.set(doc(firestoreDb, "escolas", escolaFinal.id), payloadEsc, { merge: true });
        batch.set(doc(firestoreDb, "schools", escolaFinal.id), payloadEsc, { merge: true });

        const antigosValidos = (diretoresSubstituidos || []).filter(o => o.id && o.id !== diretorFinal.id);
        for (const oldDir of antigosValidos) {
          const payloadOld = await this.prepararPayloadComLimiteDeTamanho(oldDir, "funcionarios");
          batch.set(doc(firestoreDb, "funcionarios", oldDir.id), payloadOld, { merge: true });
          batch.set(doc(firestoreDb, "users", oldDir.id), payloadOld, { merge: true });
        }

        const commitRes = await withTimeout(batch.commit(), 3500);
        if (commitRes === FIRESTORE_TIMEOUT_TOKEN) {
          throw new Error('Timeout ao sincronizar atribuição de diretor');
        }

        offlineStorage.removerPendenciaPorDocumento("funcionarios", diretorFinal.id);
        offlineStorage.removerPendenciaPorDocumento("escolas", escolaFinal.id);
        for (const oldDir of antigosValidos) {
          offlineStorage.removerPendenciaPorDocumento("funcionarios", oldDir.id);
        }
        this.registrarIdsSincronizados("funcionarios", [diretorFinal.id, ...antigosValidos.map(o => o.id)]);
        this.registrarIdsSincronizados("escolas", [escolaFinal.id]);
        this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
        this.notificarStatus();
        this.emitirBroadcastDiretorEscola();
        return true;
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn('[SGE Firebase Sync] Batch atómico de atribuição de diretor falhou, mantendo na fila:', err);
      }
    }

    this.agendarProcessamentoPendencias();
    return false;
  }

  /**
   * Desvinculação/Remoção Atómica de Diretor Geral da Escola (writeBatch):
   * Remove o perfil do diretor em `funcionarios`/`users` e limpa os campos na escola em `escolas`/`schools`.
   */
  public async desvincularDiretorEscola(diretorId: string, escolaAtualizada?: Escola): Promise<boolean> {
    if (!diretorId) return false;
    const agora = new Date().toISOString();

    offlineStorage.adicionarPendencia(
      "funcionarios",
      "ELIMINAR",
      `Remoção Diretor Geral ${diretorId}`,
      { id: diretorId },
      diretorId,
      ["users"]
    );

    if (escolaAtualizada) {
      const escolaJsonOffline: Record<string, any> = {
        ...escolaAtualizada,
        diretorGeralId: '',
        diretorGeralNome: 'Não Atribuído',
        diretorGeralEmail: '',
        diretorGeralTelefone: '',
        atualizadoEm: agora
      };
      offlineStorage.adicionarPendencia(
        "escolas",
        "ATUALIZAR",
        `Desvinculação Diretor -> Escola ${escolaAtualizada.nomeOficial}`,
        escolaJsonOffline,
        escolaAtualizada.id,
        ["schools"]
      );
    }

    this.emitirBroadcastDiretorEscola();
    this.agendarNotificacaoRemota(true);

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const batch = writeBatch(firestoreDb);
        batch.delete(doc(firestoreDb, "funcionarios", diretorId));
        batch.delete(doc(firestoreDb, "users", diretorId));

        if (escolaAtualizada?.id) {
          const payloadClear = {
            diretorGeralId: deleteField(),
            diretorGeralEmail: deleteField(),
            diretorGeralTelefone: deleteField(),
            diretorGeralNome: 'Não Atribuído',
            atualizadoEm: agora
          };
          batch.set(doc(firestoreDb, "escolas", escolaAtualizada.id), payloadClear, { merge: true });
          batch.set(doc(firestoreDb, "schools", escolaAtualizada.id), payloadClear, { merge: true });
        }

        const commitRes = await withTimeout(batch.commit(), 3500);
        if (commitRes === FIRESTORE_TIMEOUT_TOKEN) {
          throw new Error('Timeout ao desvincular diretor');
        }
        offlineStorage.removerPendenciaPorDocumento("funcionarios", diretorId);
        this.registrarIdsSincronizados("funcionarios", [], [diretorId]);
        if (escolaAtualizada?.id) {
          offlineStorage.removerPendenciaPorDocumento("escolas", escolaAtualizada.id);
        }
        this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
        this.notificarStatus();
        this.emitirBroadcastDiretorEscola();
        return true;
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn('[SGE Firebase Sync] Batch atómico de remoção de diretor falhou, mantendo na fila:', err);
      }
    }

    this.agendarProcessamentoPendencias();
    return false;
  }

  // =========================================================================
  // MÉTODOS DE PERSISTÊNCIA DIRETA POR ENTIDADE (Online -> Firebase + Device)
  // =========================================================================

  public async eliminarFuncionario(funcionarioId: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("funcionarios", funcionarioId, ["users"], `Remoção de utilizador ${funcionarioId}`);
  }

  public async salvarFuncionariosLote(funcs: Funcionario[]): Promise<boolean> {
    return this.gravarLoteDireto("funcionarios", funcs.map(f => ({ id: f.id, dados: f })), ["users"]);
  }

  public async salvarAluno(aluno: Aluno): Promise<boolean> {
    return this.gravarDocumentoDireto("alunos", aluno.id, aluno, undefined, `Aluno ${aluno.nomeCompleto}`);
  }

  public async salvarAlunosLote(alunos: Aluno[]): Promise<boolean> {
    return this.gravarLoteDireto("alunos", alunos.map(a => ({ id: a.id, dados: a })));
  }

  public async excluirAluno(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("alunos", id, ["students"], `Remoção de aluno ${id}`);
  }

  public async salvarTurma(turma: Turma): Promise<boolean> {
    return this.gravarDocumentoDireto("turmas", turma.id, turma, undefined, `Turma ${turma.nome}`);
  }

  public async salvarTurmasLote(turmas: Turma[]): Promise<boolean> {
    return this.gravarLoteDireto("turmas", turmas.map(t => ({ id: t.id, dados: t })));
  }

  public async eliminarTurma(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("turmas", id, undefined, `Remoção de turma ${id}`);
  }

  public async salvarNota(nota: NotaTrimestralConsolidada): Promise<boolean> {
    const id = nota.id || `${nota.alunoId}_${nota.disciplinaId}_${nota.trimestre}_${nota.anoLectivo || 'padrao'}`;
    return this.gravarDocumentoDireto("notas", id, { ...nota, id }, undefined, `Nota consolidada ${id}`);
  }

  public async salvarNotasConsolidadasLote(lista: NotaTrimestralConsolidada[]): Promise<boolean> {
    return this.gravarLoteDireto(
      "notas",
      lista.map(n => {
        const id = n.id || `${n.alunoId}_${n.disciplinaId}_${n.trimestre}_${n.anoLectivo || 'padrao'}`;
        return { id, dados: { ...n, id } };
      })
    );
  }

  public async salvarNotaEstudante(nota: any): Promise<boolean> {
    const id = nota.id || `${nota.avaliacaoId}_${nota.alunoId}`;
    return this.gravarDocumentoDireto("notas_estudantes", id, { ...nota, id }, undefined, `Nota de avaliação ${id}`);
  }

  public async salvarNotasLote(notas: any[]): Promise<boolean> {
    return this.gravarLoteDireto(
      "notas_estudantes",
      notas.map(n => {
        const id = n.id || `${n.avaliacaoId}_${n.alunoId}`;
        return { id, dados: { ...n, id } };
      })
    );
  }

  public async eliminarNota(id: string): Promise<boolean> {
    const r1 = await this.eliminarDocumentoDireto("notas", id, ["notas_estudantes"], `Remoção de nota ${id}`);
    return r1;
  }

  public async salvarAvaliacao(av: any): Promise<boolean> {
    return this.gravarDocumentoDireto("avaliacoes", av.id, av, undefined, `Avaliação ${av.titulo || av.id}`);
  }

  public async eliminarAvaliacao(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("avaliacoes", id, undefined, `Remoção de avaliação ${id}`);
  }

  public async salvarSolicitacaoApoio(sol: SolicitacaoApoioTecnico): Promise<boolean> {
    return this.gravarDocumentoDireto("solicitacoes_apoio", sol.id, sol, undefined, `Apoio Técnico ${sol.id}`);
  }

  public async salvarMensagem(msg: Mensagem): Promise<boolean> {
    return this.gravarDocumentoDireto("mensagens", msg.id, msg, undefined, `Mensagem ${msg.titulo || msg.id}`);
  }

  public async salvarEscola(escola: Escola): Promise<boolean> {
    const payload = { ...escola } as Record<string, any>;
    if (!escola.sessaoApoioTecnicoAtiva) {
      payload.sessaoApoioTecnicoAtiva = null;
    }
    return this.gravarDocumentoDireto("escolas", escola.id, payload, ["schools"], `Escola ${escola.nomeOficial}`);
  }

  public async salvarEscolasLote(escolas: Escola[]): Promise<boolean> {
    return this.gravarLoteDireto(
      "escolas",
      escolas.map(e => {
        const payload = { ...e } as Record<string, any>;
        if (!e.sessaoApoioTecnicoAtiva) {
          payload.sessaoApoioTecnicoAtiva = null;
        }
        return { id: e.id, dados: payload };
      }),
      ["schools"]
    );
  }

  public async encerrarSessaoApoioNoFirestore(escolaId: string, escolaSnapshot?: Escola): Promise<boolean> {
    if (!escolaId) return false;
    const agora = new Date().toISOString();
    const baseData: Record<string, any> = escolaSnapshot
      ? { ...escolaSnapshot, id: escolaId, sessaoApoioTecnicoAtiva: null, atualizadoEm: agora }
      : { id: escolaId, sessaoApoioTecnicoAtiva: null, atualizadoEm: agora };

    offlineStorage.adicionarPendencia(
      "escolas",
      "ATUALIZAR",
      `Encerramento apoio técnico (${escolaId})`,
      baseData,
      escolaId,
      ["schools"]
    );

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const clearPayload = { sessaoApoioTecnicoAtiva: deleteField(), atualizadoEm: agora };
        const results = await withTimeout(
          Promise.allSettled([
            setDoc(doc(firestoreDb, "escolas", escolaId), clearPayload, { merge: true }),
            setDoc(doc(firestoreDb, "schools", escolaId), clearPayload, { merge: true })
          ]),
          3500
        );
        if (results !== FIRESTORE_TIMEOUT_TOKEN && results[0].status === 'fulfilled') {
          offlineStorage.removerPendenciaPorDocumento("escolas", escolaId);
          this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
          this.notificarStatus();
          return true;
        }
        if (results !== FIRESTORE_TIMEOUT_TOKEN && results[0].status === 'rejected') {
          this.registrarErroPermissao(results[0].reason);
        }
      } catch (err) {
        this.registrarErroPermissao(err);
      }
    }
    this.agendarProcessamentoPendencias();
    return false;
  }

  public async eliminarEscola(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const colecoesParaApagar = [
          "escolas", "schools", "alunos", "turmas", "disciplinas", "atribuicoes",
          "funcionarios", "transacoes_financeiras", "despesas_escolares", "patrimonio",
          "notas", "notas_estudantes", "avaliacoes", "juris", "termos_exame",
          "presencas", "presencas_alunos", "horarios", "mensagens", "biblioteca",
          "biblioteca_acessos", "recibos", "delegacoes_poderes", "acoes_delegadas_logs",
          "alteracoes_notas_direcao", "anos_lectivos_configs", "turnos_configs",
          "classes_configs", "cursos", "regras_mac", "tipos_avaliacao",
          "solicitacoes_nota", "solicitacoes_apoio", "relatorios_acontecimentos"
        ];

        await Promise.allSettled([
          deleteDoc(doc(firestoreDb, "escolas", id)),
          deleteDoc(doc(firestoreDb, "schools", id)),
          deleteDoc(doc(firestoreDb, "configuracoes_financeiras", id)),
          deleteDoc(doc(firestoreDb, "configuracoes_passes", id)),
          deleteDoc(doc(firestoreDb, "delegacoes_cobranca", id))
        ]);

        // Cascade queries em paralelo em vez de sequencial!
        await Promise.allSettled(
          colecoesParaApagar.map(async (colNome) => {
            try {
              const q = query(collection(firestoreDb!, colNome), where("escolaId", "==", id));
              const snap = await getDocs(q);
              if (!snap.empty) {
                await Promise.allSettled(snap.docs.map(d => deleteDoc(d.ref)));
              }
            } catch {}
          })
        );
        return true;
      } catch (e) {
        console.warn('[SGE Firebase Sync] Erro ao eliminar escola no Firestore:', e);
      }
    }
    offlineStorage.adicionarPendencia("escolas", "ELIMINAR", `Eliminação de escola ${id}`, { id }, id, ["schools"]);
    return true;
  }

  public async salvarDisciplina(disc: any): Promise<boolean> {
    return this.gravarDocumentoDireto("disciplinas", disc.id, disc, undefined, `Disciplina ${disc.nome}`);
  }

  public async salvarDisciplinasLote(discs: any[]): Promise<boolean> {
    return this.gravarLoteDireto("disciplinas", discs.map(d => ({ id: d.id, dados: d })));
  }

  public async eliminarDisciplina(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("disciplinas", id, undefined, `Remoção de disciplina ${id}`);
  }

  public async salvarAtribuicao(atrib: any): Promise<boolean> {
    return this.gravarDocumentoDireto("atribuicoes", atrib.id, atrib, undefined, `Atribuição docente ${atrib.id}`);
  }

  public async salvarAtribuicoesLote(atribs: any[]): Promise<boolean> {
    return this.gravarLoteDireto("atribuicoes", atribs.map(a => ({ id: a.id, dados: a })));
  }

  public async removerAtribuicao(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("atribuicoes", id, undefined, `Remoção de atribuição ${id}`);
  }

  public async salvarJuri(juri: any): Promise<boolean> {
    return this.gravarDocumentoDireto("juris", juri.id, juri, undefined, `Comissão de Júri ${juri.nomeJuri || juri.id}`);
  }

  public async eliminarJuri(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("juris", id, undefined, `Remoção de júri ${id}`);
  }

  public async salvarTermoExame(termo: any): Promise<boolean> {
    return this.gravarDocumentoDireto("termos_exame", termo.id, termo, undefined, `Termo de exame ${termo.id}`);
  }

  public async eliminarTermoExame(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("termos_exame", id, undefined, `Remoção de termo de exame ${id}`);
  }

  public async salvarAnoLectivoConfig(cfg: any): Promise<boolean> {
    return this.gravarDocumentoDireto("anos_lectivos_configs", cfg.id, cfg, undefined, `Ano letivo ${cfg.rotulo || cfg.id}`);
  }

  public async eliminarAnoLectivoConfig(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("anos_lectivos_configs", id, undefined, `Remoção de ano letivo ${id}`);
  }

  public async salvarAnosLectivosLista(anos: string[]): Promise<boolean> {
    return this.gravarDocumentoDireto("configuracao_sistema", "anos_lectivos", { id: "anos_lectivos", anos }, undefined, `Lista de anos letivos`);
  }

  public async salvarTurnoConfig(turno: any): Promise<boolean> {
    return this.gravarDocumentoDireto("turnos_configs", turno.id, turno, undefined, `Turno ${turno.nome}`);
  }

  public async eliminarTurnoConfig(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("turnos_configs", id, undefined, `Remoção de turno ${id}`);
  }

  public async salvarClasseConfig(classe: any): Promise<boolean> {
    return this.gravarDocumentoDireto("classes_configs", classe.id, classe, undefined, `Classe ${classe.nome}`);
  }

  public async salvarClassesLote(classes: any[]): Promise<boolean> {
    return this.gravarLoteDireto("classes_configs", classes.map(c => ({ id: c.id, dados: c })));
  }

  public async eliminarClasseConfig(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("classes_configs", id, undefined, `Remoção de classe ${id}`);
  }

  public async salvarCurso(curso: any): Promise<boolean> {
    return this.gravarDocumentoDireto("cursos", curso.id, curso, undefined, `Curso ${curso.nome}`);
  }

  public async eliminarCurso(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("cursos", id, undefined, `Remoção de curso ${id}`);
  }

  public async salvarRegraMAC(regra: any): Promise<boolean> {
    return this.gravarDocumentoDireto("regras_mac", regra.id, regra, undefined, `Regra MAC ${regra.id}`);
  }

  public async salvarRegrasMACLote(regras: any[]): Promise<boolean> {
    return this.gravarLoteDireto("regras_mac", regras.map(r => ({ id: r.id, dados: r })));
  }

  public async salvarTipoAvaliacao(tipo: any): Promise<boolean> {
    return this.gravarDocumentoDireto("tipos_avaliacao", tipo.id, tipo, undefined, `Tipo de avaliação ${tipo.nome}`);
  }

  public async salvarTiposAvaliacaoLote(tipos: any[]): Promise<boolean> {
    return this.gravarLoteDireto("tipos_avaliacao", tipos.map(t => ({ id: t.id, dados: t })));
  }

  public async salvarSolicitacaoNota(sol: any): Promise<boolean> {
    return this.gravarDocumentoDireto("solicitacoes_nota", sol.id, sol, undefined, `Solicitação de nota ${sol.id}`);
  }

  public async salvarPresencaFuncionario(p: any): Promise<boolean> {
    const id = p.id || `${p.funcionarioId}_${p.data}`;
    return this.gravarDocumentoDireto("presencas", id, { ...p, id }, undefined, `Presença funcionário ${id}`);
  }

  public async salvarPresencasFuncionariosLote(items: any[]): Promise<boolean> {
    return this.gravarLoteDireto(
      "presencas",
      items.map(p => {
        const id = p.id || `${p.funcionarioId}_${p.data}`;
        return { id, dados: { ...p, id } };
      })
    );
  }

  public async eliminarPresencaFuncionario(funcionarioId: string, data: string, docId?: string): Promise<boolean> {
    const id = docId || `${funcionarioId}_${data}`;
    return this.eliminarDocumentoDireto("presencas", id, undefined, `Remoção presença ${id}`);
  }

  public async salvarPresencaAluno(item: any): Promise<boolean> {
    const id = item.id || `${item.alunoId}_${item.data}_${item.tempoLectivo}`;
    return this.gravarDocumentoDireto("presencas_alunos", id, { ...item, id }, undefined, `Presença aluno ${id}`);
  }

  public async salvarPresencasAlunosLote(items: any[]): Promise<boolean> {
    return this.gravarLoteDireto(
      "presencas_alunos",
      items.map(item => {
        const id = item.id || `${item.alunoId}_${item.data}_${item.tempoLectivo}`;
        return { id, dados: { ...item, id } };
      })
    );
  }

  public async salvarHorario(item: any): Promise<boolean> {
    return this.gravarDocumentoDireto("horarios", item.id, item, undefined, `Horário ${item.id}`);
  }

  public async eliminarHorario(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("horarios", id, undefined, `Remoção de horário ${id}`);
  }

  public async salvarDocumentoBiblioteca(docItem: any): Promise<boolean> {
    return this.gravarDocumentoDireto("biblioteca", docItem.id, docItem, undefined, `Documento biblioteca ${docItem.titulo || docItem.id}`);
  }

  public async salvarAcessoBiblioteca(acesso: any): Promise<boolean> {
    return this.gravarDocumentoDireto("biblioteca_acessos", acesso.id, acesso, undefined, `Acesso biblioteca ${acesso.alunoNome || acesso.id}`);
  }

  public async salvarRecibo(rec: any): Promise<boolean> {
    return this.gravarDocumentoDireto("recibos", rec.id, rec, undefined, `Recibo ${rec.numeroRecibo || rec.id}`);
  }

  public async salvarConfiguracaoFinanceira(cfg: any): Promise<boolean> {
    return this.gravarDocumentoDireto("configuracoes_financeiras", cfg.escolaId, { ...cfg, id: cfg.escolaId }, undefined, `Configuração financeira ${cfg.escolaId}`);
  }

  public async salvarTransacaoFinanceira(tx: any): Promise<boolean> {
    return this.gravarDocumentoDireto("transacoes_financeiras", tx.id, tx, undefined, `Transação ${tx.numeroRecibo || tx.id}`);
  }

  public async eliminarTransacaoFinanceira(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("transacoes_financeiras", id, undefined, `Eliminação transação ${id}`);
  }

  public async salvarDespesaEscolar(d: any): Promise<boolean> {
    return this.gravarDocumentoDireto("despesas_escolares", d.id, d, undefined, `Despesa ${d.descricao || d.id}`);
  }

  public async eliminarDespesaEscolar(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("despesas_escolares", id, undefined, `Eliminação despesa ${id}`);
  }

  public async salvarItemPatrimonio(item: any): Promise<boolean> {
    return this.gravarDocumentoDireto("patrimonio", item.id, item, undefined, `Património ${item.nomeItem || item.id}`);
  }

  public async eliminarItemPatrimonio(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("patrimonio", id, undefined, `Eliminação património ${id}`);
  }

  public async salvarHistoricoEscolarCompleto(hist: any): Promise<boolean> {
    return this.gravarDocumentoDireto("historico_completo", hist.alunoId, { ...hist, id: hist.alunoId }, undefined, `Histórico escolar ${hist.alunoId}`);
  }

  public async salvarConfiguracaoPasses(escolaId: string, cfg: any): Promise<boolean> {
    return this.gravarDocumentoDireto("configuracoes_passes", escolaId, { ...cfg, id: escolaId, escolaId }, undefined, `Passes escola ${escolaId}`);
  }

  public async salvarAlteracaoNotaDirecao(reg: any): Promise<boolean> {
    return this.gravarDocumentoDireto("alteracoes_notas_direcao", reg.id, reg, undefined, `Retificação de nota ${reg.id}`);
  }

  public async salvarConfiguracaoDocumento(cfg: any): Promise<boolean> {
    const id = `${cfg.escolaId}_${cfg.tipoDocumento}`;
    return this.gravarDocumentoDireto("configuracoes_documentos", id, { ...cfg, id }, undefined, `Config documento ${id}`);
  }

  public async salvarDelegacoesCobranca(escolaId: string, lista: any[]): Promise<boolean> {
    return this.gravarDocumentoDireto("delegacoes_cobranca", escolaId, { id: escolaId, escolaId, lista }, undefined, `Delegações cobrança ${escolaId}`);
  }

  public async salvarDelegacaoPoderes(del: any): Promise<boolean> {
    return this.gravarDocumentoDireto("delegacoes_poderes", del.id, del, undefined, `Delegação de poderes ${del.id}`);
  }

  public async salvarAcaoDelegadaLog(log: any): Promise<boolean> {
    return this.gravarDocumentoDireto("acoes_delegadas_logs", log.id, log, undefined, `Ação delegada ${log.id}`);
  }

  public async salvarLogAuditoria(log: any): Promise<boolean> {
    if (!this.canUseFirestore() || !firestoreDb) return false;
    try {
      await setDoc(doc(firestoreDb, "auditoria", log.id), sanitizarParaFirestore(log), { merge: true });
      return true;
    } catch {
      return false;
    }
  }

  public async salvarRelatorioAcontecimento(rel: any): Promise<boolean> {
    return this.gravarDocumentoDireto("relatorios_acontecimentos", rel.id, rel, undefined, `Relatório ${rel.titulo || rel.id}`);
  }

  public async eliminarRelatorioAcontecimento(id: string): Promise<boolean> {
    return this.eliminarDocumentoDireto("relatorios_acontecimentos", id, undefined, `Eliminação de relatório ${id}`);
  }

  public async salvarSessaoAtiva(sessao: any): Promise<boolean> {
    if (!this.canUseFirestore() || !firestoreDb || !sessao?.userId) return false;
    try {
      await setDoc(doc(firestoreDb, "sessoes_ativas", sessao.userId), sanitizarParaFirestore(sessao), { merge: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Buscar Administrador Geral remoto no Firestore em paralelo com proteção contra internet lenta
   */
  public async buscarAdminGeralRemoto(timeoutMs: number = 1800): Promise<{ admin: Funcionario | null; timeout: boolean; erro: boolean }> {
    if (!this.canUseFirestore() || !firestoreDb) {
      return { admin: null, timeout: false, erro: true };
    }

    try {
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
        setTimeout(() => resolve({ timeout: true }), timeoutMs);
      });

      const queryPromise = (async (): Promise<{ admin: Funcionario | null; timeout: false; erro: boolean }> => {
        try {
          const [snap1, snap2] = await Promise.all([
            getDocs(query(collection(firestoreDb!, "funcionarios"), where("role", "==", "AdminGeral"), limit(1))),
            getDocs(query(collection(firestoreDb!, "users"), where("role", "==", "AdminGeral"), limit(1)))
          ]);

          const adminDoc = !snap1.empty ? snap1.docs[0] : (!snap2.empty ? snap2.docs[0] : null);
          if (adminDoc) {
            const adminData = adminDoc.data() as Funcionario;
            this.atualizarUsuarioNoDispositivo(adminData);
            if (typeof window !== 'undefined') {
              localStorage.setItem('sge_admin_configured', 'true');
              localStorage.setItem('sge_setup_inicial_concluido', 'true');
            }
            return { admin: adminData, timeout: false, erro: false };
          }

          return { admin: null, timeout: false, erro: false };
        } catch (err) {
          console.warn('[SGE Firebase Sync] Erro interno ao buscar Admin Geral remoto:', err);
          return { admin: null, timeout: false, erro: true };
        }
      })();

      const resultado = await Promise.race([queryPromise, timeoutPromise]);
      if ('timeout' in resultado && resultado.timeout) {
        return { admin: null, timeout: true, erro: false };
      }

      return resultado as { admin: Funcionario | null; timeout: boolean; erro: boolean };
    } catch (e) {
      console.warn('[SGE Firebase Sync] Erro ao buscar Admin Geral remoto:', e);
      return { admin: null, timeout: false, erro: true };
    }
  }

  public getStatus(): SyncStatus {
    const isOnline = this.isOnline();
    let totalUsers = 0;
    try {
      if (typeof window !== 'undefined') {
        const funcs = safeParseJson<any[]>(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS), []);
        if (Array.isArray(funcs)) totalUsers = funcs.length;
      }
    } catch {}

    return {
      isOnline,
      firestoreDisponivel: this.canUseFirestore(),
      emSincronizacao: this.emSincronizacao,
      progressoPercentual: this.progressoPercentual,
      etapaAtual: this.etapaAtual,
      ultimaSincronizacao: this.ultimaSincronizacao,
      totalUsuariosSincronizados: totalUsers,
      configSincronizada: true,
      permissaoNegada: this.permissaoNegadaDetectada
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
