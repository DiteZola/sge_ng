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
  Unsubscribe
} from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import { offlineStorage } from "./offlineStorage";
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
  SESSOES_ATIVAS: 'sge_sessoes_ativas'
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

function sanitizarParaFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
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
  private cicloInicialPromise: Promise<void> | null = null;
  private escutasAtivas = false;
  private unsubRealtime: Unsubscribe[] = [];
  private remoteNotifyTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.iniciarObservadoresDeRede();
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

  private agendarNotificacaoRemota() {
    if (typeof window === 'undefined') return;
    if (this.remoteNotifyTimer) return;
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
    }, 2000);
  }

  private async prepararPayloadComLimiteDeTamanho(dados: Record<string, any>): Promise<Record<string, any>> {
    const payload = sanitizarParaFirestore({
      ...dados,
      atualizadoEm: dados.atualizadoEm || new Date().toISOString()
    });

    // Comprimir automaticamente imagens/fotos/logótipos/assinaturas base64 pesados para caberem com segurança no Firestore (< 160KB)
    const imageKeys = ['fotoUrl', 'foto', 'logotipo', 'logotipoUrl', 'assinaturaDiretorUrl'];
    for (const imgKey of imageKeys) {
      const val = payload[imgKey];
      if (typeof val === 'string' && val.length > 140000 && (val.startsWith('data:image') || val.includes(';base64,'))) {
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

    return payload;
  }

  /**
   * Persistência Imediata e Garantida:
   * Quando ONLINE -> grava diretamente no Firebase Firestore no momento da ação (e limpa pendência).
   * Se OFFLINE ou houver falha de rede -> coloca na fila de pendências para sincronizar automaticamente assim que voltar online.
   */
  public async gravarDocumentoDireto(
    colecao: string,
    docId: string,
    dados: Record<string, any>,
    extraColecoes?: string[],
    descricao?: string
  ): Promise<boolean> {
    if (!docId) return false;
    const payload = await this.prepararPayloadComLimiteDeTamanho({ ...dados, id: dados.id || docId });

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

        const results = await Promise.allSettled(tasks);
        const primaryResult = results[0];

        if (primaryResult.status === 'fulfilled') {
          offlineStorage.removerPendenciaPorDocumento(colecao, docId);
          this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
          this.notificarStatus();
          return true;
        }

        this.registrarErroPermissao(primaryResult.reason);
        console.warn(`[SGE Firebase Sync] Erro ao gravar '${colecao}/${docId}', movido para fila de retry:`, primaryResult.reason);
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn(`[SGE Firebase Sync] Exceção ao gravar '${colecao}/${docId}', movido para fila de retry:`, err);
      }
    }

    // Garantia offline / retry automático: enfileira para envio imediato ao restabelecer ligação
    offlineStorage.adicionarPendencia(
      colecao,
      'ATUALIZAR',
      descricao || `Alteração em ${colecao} (${docId})`,
      payload,
      docId,
      extraColecoes
    );
    this.agendarProcessamentoPendencias();
    return false;
  }

  /**
   * Gravação em Lote (writeBatch) no Firestore com fallback para fila offline
   */
  public async gravarLoteDireto(
    colecao: string,
    itens: Array<{ id: string; dados: Record<string, any> }>,
    extraColecoes?: string[]
  ): Promise<boolean> {
    if (!itens || itens.length === 0) return true;

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const payloads = await Promise.all(
          itens.map(async (item) => ({
            id: item.id,
            payload: await this.prepararPayloadComLimiteDeTamanho({ ...item.dados, id: item.dados.id || item.id })
          }))
        );

        const CHUNK = 350;
        for (let i = 0; i < payloads.length; i += CHUNK) {
          const slice = payloads.slice(i, i + CHUNK);
          const batch = writeBatch(firestoreDb);
          for (const entry of slice) {
            batch.set(doc(firestoreDb, colecao, entry.id), entry.payload, { merge: true });
            if (extraColecoes) {
              for (const extraCol of extraColecoes) {
                batch.set(doc(firestoreDb, extraCol, entry.id), entry.payload, { merge: true });
              }
            }
          }
          await batch.commit();
          for (const entry of slice) {
            offlineStorage.removerPendenciaPorDocumento(colecao, entry.id);
          }
        }

        this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
        this.notificarStatus();
        return true;
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn(`[SGE Firebase Sync] Erro no lote '${colecao}', enfileirando individualmente:`, err);
      }
    }

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

    if (this.canUseFirestore() && firestoreDb) {
      try {
        const tasks = [deleteDoc(doc(firestoreDb, colecao, docId))];
        if (extraColecoes && extraColecoes.length > 0) {
          for (const extraCol of extraColecoes) {
            tasks.push(deleteDoc(doc(firestoreDb, extraCol, docId)));
          }
        }
        const results = await Promise.allSettled(tasks);
        if (results[0].status === 'fulfilled') {
          offlineStorage.removerPendenciaPorDocumento(colecao, docId);
          this.ultimaSincronizacao = new Date().toLocaleTimeString('pt-AO');
          this.notificarStatus();
          return true;
        }
        this.registrarErroPermissao(results[0].reason);
      } catch (err) {
        this.registrarErroPermissao(err);
        console.warn(`[SGE Firebase Sync] Erro ao eliminar '${colecao}/${docId}':`, err);
      }
    }

    offlineStorage.adicionarPendencia(
      colecao,
      'ELIMINAR',
      descricao || `Eliminação em ${colecao} (${docId})`,
      { id: docId },
      docId,
      extraColecoes
    );
    this.agendarProcessamentoPendencias();
    return false;
  }

  /**
   * Processa em paralelo todas as pendências acumuladas offline (criações, atualizações e eliminações)
   */
  public async processarPendenciasOffline(): Promise<void> {
    if (!this.canUseFirestore() || !firestoreDb) return;
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
              await Promise.allSettled(delTasks);
              offlineStorage.removerPendencia(p.id);
            } else if (p.dados) {
              const payload = await this.prepararPayloadComLimiteDeTamanho({
                ...p.dados,
                sincronizadoEm: new Date().toISOString()
              });
              const setTasks = [setDoc(doc(firestoreDb!, col, docId), payload, { merge: true })];
              if (p.extraColecoes) {
                for (const ec of p.extraColecoes) {
                  setTasks.push(setDoc(doc(firestoreDb!, ec, docId), payload, { merge: true }));
                }
              }
              const res = await Promise.allSettled(setTasks);
              if (res[0].status === 'fulfilled') {
                offlineStorage.removerPendencia(p.id);
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
  }

  private iniciarObservadoresDeRede() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SGE Firebase Sync] Rede online restabelecida. A processar pendências e sincronizar...');
      this.notificarStatus();
      this.processarPendenciasOffline().then(() => {
        this.puxarTudoDoFirebase(true);
        this.iniciarEscutasEmTempoReal();
      });
    });

    window.addEventListener('offline', () => {
      console.log('[SGE Firebase Sync] Modo offline ativado. Dados guardados localmente com fila automática.');
      this.notificarStatus();
    });
  }

  /**
   * Ciclo Único de Inicialização Online (chamado no arranque da app sem duplicações)
   */
  public iniciarCicloInicialOnline(): Promise<void> {
    if (this.cicloInicialPromise) return this.cicloInicialPromise;

    this.cicloInicialPromise = (async () => {
      if (!this.canUseFirestore()) return;
      try {
        // 1. Primeiro enviar quaisquer pendências que ficaram presas offline
        await this.processarPendenciasOffline();
        // 2. Descarregar base remota em ondas paralelas
        await this.puxarTudoDoFirebase();
        // 3. Ligar escutas em tempo real (apenas uma vez)
        this.iniciarEscutasEmTempoReal();
      } catch (err) {
        console.warn('[SGE Firebase Sync] Erro no ciclo inicial:', err);
      }
    })();

    return this.cicloInicialPromise;
  }

  /**
   * Helper para mesclar coleção tipo Array entre Firestore e Dispositivo
   * respeitando itens pendentes locais e remoções autoritativas do servidor.
   */
  private aplicarSnapshotArray<T extends Record<string, any>>(
    storageKey: string,
    colecao: string,
    remotos: T[],
    fromCache: boolean,
    filterValid?: (item: T) => boolean,
    preserveFieldFn?: (local: T | undefined, remote: T) => T,
    getIdFn: (item: T) => string = (item) => item.id
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

    const jaSincronizouAntes = localStorage.getItem(`sge_remote_synced_${colecao}`) === 'true';
    const resultMap = new Map<string, T>();

    const isLocalNewer = (localItem: T | undefined, remoteItem: T): boolean => {
      if (!localItem) return false;
      const tLocal = localItem.atualizadoEm ? Date.parse(String(localItem.atualizadoEm)) : NaN;
      const tRemote = remoteItem.atualizadoEm ? Date.parse(String(remoteItem.atualizadoEm)) : NaN;
      return !isNaN(tLocal) && !isNaN(tRemote) && tLocal > tRemote + 500;
    };

    // Se servidor já era fonte autoritativa e devolveu snapshot atualizado (não apenas cache vazio local),
    // remover itens apagados remotamente — exceto os que têm alteração local pendente!
    if (jaSincronizouAntes && !fromCache) {
      for (const id of pendingUpsertIds) {
        const localItem = mapLocal.get(id);
        if (localItem) resultMap.set(id, localItem);
      }
      for (const r of remotosValidos) {
        const id = getIdFn(r);
        if (!id || pendingDeleteIds.has(id)) continue;
        const existing = mapLocal.get(id);
        if (pendingUpsertIds.has(id) && existing) {
          resultMap.set(id, existing);
        } else if (existing && isLocalNewer(existing, r)) {
          resultMap.set(id, existing);
        } else {
          resultMap.set(id, preserveFieldFn ? preserveFieldFn(existing, r) : { ...existing, ...r });
        }
      }
    } else {
      // Primeira sincronização ou leitura em cache: fundir sem perder dados locais ainda não enviados
      for (const [id, l] of mapLocal.entries()) {
        if (!pendingDeleteIds.has(id)) {
          resultMap.set(id, l);
        }
      }
      for (const r of remotosValidos) {
        const id = getIdFn(r);
        if (!id || pendingDeleteIds.has(id)) continue;
        const existing = resultMap.get(id);
        if (pendingUpsertIds.has(id) && existing) continue;
        if (existing && isLocalNewer(existing, r)) continue;
        resultMap.set(id, preserveFieldFn ? preserveFieldFn(existing, r) : { ...existing, ...r });
      }
    }

    const finalArray = Array.from(resultMap.values());
    if (remotosValidos.length > 0 || jaSincronizouAntes) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(finalArray));
      } catch (quotaErr) {
        console.warn(`[SGE Sync] Quota localStorage excedida ao gravar ${storageKey}:`, quotaErr);
      }
      if (!fromCache && remotosValidos.length > 0) {
        localStorage.setItem(`sge_remote_synced_${colecao}`, 'true');
      }
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
      getIdFn: (item: T) => string = (item) => item.id
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
            this.agendarNotificacaoRemota();
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
      (existing, rf) => ({
        ...existing,
        ...rf,
        password: rf.password || existing?.password || '',
        fotoUrl: rf.fotoUrl !== undefined ? rf.fotoUrl : (existing?.fotoUrl || '')
      }),
      (mesclados) => {
        const curRaw = localStorage.getItem('sge_user') || localStorage.getItem('sge_current_user');
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
      }
    );

    registrarEscutaArray<Escola>(
      "escolas",
      STORAGE_KEYS.ESCOLAS,
      (esc) => Boolean(esc && esc.id && !isDemoEscola(esc)),
      (existing, esc) => ({
        ...existing,
        ...esc,
        nomeOficial: esc.nomeOficial || (esc as any).nome || existing?.nomeOficial || 'Escola',
        nome: (esc as any).nome || esc.nomeOficial || existing?.nome,
        logotipoUrl: esc.logotipoUrl !== undefined ? esc.logotipoUrl : existing?.logotipoUrl,
        assinaturaDiretorUrl: esc.assinaturaDiretorUrl !== undefined ? esc.assinaturaDiretorUrl : existing?.assinaturaDiretorUrl
      })
    );

    registrarEscutaArray<Turma>("turmas", STORAGE_KEYS.TURMAS, (t) => Boolean(t && t.id));
    registrarEscutaArray<any>("disciplinas", STORAGE_KEYS.DISCIPLINAS, (d) => Boolean(d && d.id));
    registrarEscutaArray<Aluno>(
      "alunos",
      STORAGE_KEYS.ALUNOS,
      (a) => Boolean(a && a.id && !isDemoAluno(a)),
      (existing, ra) => ({
        ...existing,
        ...ra,
        fotoUrl: ra.fotoUrl !== undefined ? ra.fotoUrl : (existing?.fotoUrl || '')
      })
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
          const [snapAdmin, snapAdminUsers] = await Promise.all([
            getDocs(query(funcsRef, where("role", "==", "AdminGeral"))),
            getDocs(query(usersRef, where("role", "==", "AdminGeral")))
          ]);
          const admins = [
            ...snapAdmin.docs.map(d => d.data() as Funcionario),
            ...snapAdminUsers.docs.map(d => d.data() as Funcionario)
          ].filter(f => f.ativo !== false && f.nomeCompleto);
          if (admins.length > 0) {
            const userFromFirebase = admins[0];
            this.atualizarUsuarioNoDispositivo(userFromFirebase);
            return userFromFirebase;
          }
        }

        const biUpper = identificador.trim().toUpperCase();
        // Consultas específicas em paralelo (muito mais rápido do que sequencial)
        const [snapEmail, snapBI, docDirect] = await Promise.all([
          getDocs(query(funcsRef, where("email", "==", termo), limit(1))),
          getDocs(query(funcsRef, where("numeroBI", "==", biUpper), limit(1))),
          getDoc(doc(firestoreDb, "funcionarios", identificador.trim()))
        ]);

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

        const snapAll = await getDocs(funcsRef);
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
        const [docSnap, docSnapAlt] = await Promise.all([
          getDoc(doc(firestoreDb, "configuracao_sistema", "global")),
          getDoc(doc(firestoreDb, "system_config", "global"))
        ]);

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
   * Helper genérico para descarregar e reconciliar uma coleção tipo Array no puxarTudoDoFirebase
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

    if (remotos.length > 0) {
      return this.aplicarSnapshotArray(
        storageKey,
        colecao,
        remotos,
        snap.metadata.fromCache,
        options?.filterValid,
        options?.preserveFieldFn,
        options?.getIdFn
      );
    } else if (options?.uploadLocalIfRemoteEmpty) {
      const locais = safeParseJson<T[]>(localStorage.getItem(storageKey), []);
      const validos = options?.filterValid ? locais.filter(options.filterValid) : locais;
      if (validos.length > 0) {
        const getId = options?.getIdFn || ((i: T) => i.id);
        this.gravarLoteDireto(
          colecao,
          validos.filter(v => Boolean(getId(v))).map(v => ({ id: getId(v), dados: v })),
          options?.extraColecoes
        );
      }
    }
    return [];
  }

  /**
   * Helper genérico para descarregar e reconciliar coleções tipo Record<string, any> (Map por chave)
   */
  private async puxarColecaoMapa(
    colecao: string,
    storageKey: string,
    docToKeyFn?: (docId: string, data: any) => string,
    unwrapFn?: (data: any) => any
  ): Promise<void> {
    if (!firestoreDb) return;
    const snap = await getDocs(collection(firestoreDb, colecao));
    if (snap.empty) return;
    const localMap = safeParseJson<Record<string, any>>(localStorage.getItem(storageKey), {});
    const pendentes = offlineStorage.obterPendencias().filter(p => p.entidade === colecao);
    const pendingMap = new Map(pendentes.map(p => [p.docId || p.dados?.id, p]));

    snap.forEach(d => {
      const rawData = d.data();
      const mapKey = docToKeyFn ? docToKeyFn(d.id, rawData) : d.id;
      const pend = pendingMap.get(d.id) || pendingMap.get(mapKey);
      if (pend && pend.acao !== 'ELIMINAR') return; // preserva alteração local pendente
      localMap[mapKey] = unwrapFn ? unwrapFn(rawData) : rawData;
    });

    localStorage.setItem(storageKey, JSON.stringify(localMap));
    localStorage.setItem(`sge_remote_synced_${colecao}`, 'true');
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
            preserveFieldFn: (existing, esc) => ({
              ...existing,
              ...esc,
              nomeOficial: esc.nomeOficial || (esc as any).nome || existing?.nomeOficial || 'Escola',
              nome: (esc as any).nome || esc.nomeOficial || existing?.nome
            }),
            uploadLocalIfRemoteEmpty: true,
            extraColecoes: ["schools"]
          }),
          (async () => {
            const funcs = await this.puxarColecaoArray<Funcionario>("funcionarios", STORAGE_KEYS.FUNCIONARIOS, {
              filterValid: (f) => Boolean(f && f.id && f.nomeCompleto && !isDemoFunc(f)),
              preserveFieldFn: (existing, rf) => ({
                ...existing,
                ...rf,
                password: rf.password || existing?.password || '',
                fotoUrl: rf.fotoUrl !== undefined ? rf.fotoUrl : (existing?.fotoUrl || '')
              }),
              uploadLocalIfRemoteEmpty: true,
              extraColecoes: ["users"]
            });
            if (funcs.some(f => f.role === 'AdminGeral' && f.ativo !== false)) {
              localStorage.setItem('sge_admin_configured', 'true');
              localStorage.setItem('sge_setup_inicial_concluido', 'true');
            }
          })()
        ]);

        this.atualizarProgresso(45, 'Instituições e utilizadores carregados. A sincronizar dados académicos...');
        this.agendarNotificacaoRemota();

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
          this.puxarColecaoArray<any>("delegacoes_poderes", STORAGE_KEYS.DELEGACOES_PODERES, { filterValid: (d) => Boolean(d && d.id) }),
          this.puxarColecaoArray<any>("acoes_delegadas_logs", STORAGE_KEYS.ACOES_DELEGADAS_LOGS, { filterValid: (l) => Boolean(l && l.id) }),
          this.puxarColecaoArray<any>("auditoria", STORAGE_KEYS.AUDITORIA, { filterValid: (l) => Boolean(l && l.id) }),
          this.puxarColecaoArray<any>("sessoes_ativas", STORAGE_KEYS.SESSOES_ATIVAS, {
            filterValid: (s) => Boolean(s && (s.userId || s.id)),
            getIdFn: (s) => s.userId || s.id
          }),
          this.puxarColecaoMapa("configuracoes_financeiras", STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, (docId, d) => d.escolaId || docId),
          this.puxarColecaoMapa("historico_completo", STORAGE_KEYS.HISTORICO_COMPLETO, (docId, d) => d.alunoId || docId),
          this.puxarColecaoMapa("configuracoes_passes", STORAGE_KEYS.CONFIGURACOES_PASSES, (docId, d) => d.escolaId || docId),
          this.puxarColecaoMapa("configuracoes_documentos", STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, (docId, d) => (d.escolaId && d.tipoDocumento) ? `${d.escolaId}_${d.tipoDocumento}` : docId),
          this.puxarColecaoMapa("delegacoes_cobranca", STORAGE_KEYS.DELEGACOES_COBRANCA, (docId, d) => d.escolaId || docId, (d) => d.lista || d)
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
        if (this.canUseFirestore() && firestoreDb) {
          // 1. Primeiro envia pendências offline (inclui eliminações)
          await this.processarPendenciasOffline();

          // 2. Preparar todos os lotes locais para envio paralelo
          const uploadArray = async (storageKey: string, colecao: string, extraColecoes?: string[], getIdFn: (item: any) => string = (i) => i.id) => {
            const list = safeParseJson<any[]>(localStorage.getItem(storageKey), []);
            if (!Array.isArray(list) || list.length === 0) return;
            const itens = list
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
              dados: wrapFn ? wrapFn(k, v) : (typeof v === 'object' && v !== null ? v : { id: k, valor: v })
            }));
            await this.gravarLoteDireto(colecao, itens);
          };

          const configLocal = await this.buscarConfiguracaoSistema();

          await Promise.allSettled([
            configLocal ? this.gravarConfiguracaoNoFirestore(configLocal) : Promise.resolve(true),
            uploadArray(STORAGE_KEYS.FUNCIONARIOS, "funcionarios", ["users"]),
            uploadArray(STORAGE_KEYS.ESCOLAS, "escolas", ["schools"]),
            uploadArray(STORAGE_KEYS.ALUNOS, "alunos"),
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
            uploadArray(STORAGE_KEYS.DELEGACOES_PODERES, "delegacoes_poderes"),
            uploadArray(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, "acoes_delegadas_logs"),
            uploadMap(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, "configuracoes_financeiras"),
            uploadMap(STORAGE_KEYS.HISTORICO_COMPLETO, "historico_completo"),
            uploadMap(STORAGE_KEYS.CONFIGURACOES_PASSES, "configuracoes_passes", (escolaId, v) => ({ ...v, escolaId, id: escolaId })),
            uploadMap(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, "configuracoes_documentos"),
            uploadMap(STORAGE_KEYS.DELEGACOES_COBRANCA, "delegacoes_cobranca", (escolaId, lista) => ({ id: escolaId, escolaId, lista }))
          ]);

          // 3. Descarregar estado reconciliado do Firestore
          await this.puxarTudoDoFirebase(true);
        }

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
    return this.gravarDocumentoDireto("escolas", escola.id, escola, ["schools"], `Escola ${escola.nomeOficial}`);
  }

  public async salvarEscolasLote(escolas: Escola[]): Promise<boolean> {
    return this.gravarLoteDireto("escolas", escolas.map(e => ({ id: e.id, dados: e })), ["schools"]);
  }

  public async eliminarEscola(id: string): Promise<boolean> {
    if (this.canUseFirestore() && firestoreDb) {
      try {
        const colecoesParaApagar = [
          "escolas", "schools", "alunos", "turmas", "disciplinas", "atribuicoes",
          "funcionarios", "transacoes_financeiras", "despesas_escolares", "patrimonio",
          "notas", "notas_estudantes", "avaliacoes", "juris", "termos_exame",
          "presencas", "presencas_alunos", "horarios", "mensagens", "biblioteca",
          "recibos", "delegacoes_poderes", "acoes_delegadas_logs", "alteracoes_notas_direcao"
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

  public async eliminarPresencaFuncionario(funcionarioId: string, data: string): Promise<boolean> {
    const id = `${funcionarioId}_${data}`;
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
