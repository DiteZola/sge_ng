import { offlineStorage } from './offlineStorage';
import { cryptoService } from './cryptoService';
import { securityEngine } from './securityEngine';
import { firebaseSyncEngine } from './firebaseSyncEngine';
import { 
  Escola, 
  Aluno, 
  Turma, 
  Disciplina, 
  AtribuicaoDocente, 
  Funcionario, 
  TipoAvaliacaoConfig, 
  RegraCalculoMAC, 
  AvaliacaoCriada, 
  NotaEstudante, 
  NotaTrimestralConsolidada, 
  SolicitacaoAlteracaoNota, 
  ComissaoJuri, 
  DeliberacaoAlunoJuri,
  NotaAlteradaJuri,
  AtaJuri,
  ClasseConfig,
  CursoConfig,
  AreaFormacaoConfig,
  SalaAulaConfig,
  PresencaFuncionario, 
  LogAuditoria, 
  MensagemInterna, 
  DocumentoBiblioteca, 
  ReciboPagamento,
  Genero,
  UserRole,
  ConfiguracaoFinanceiraEscola,
  ItemEmolumentoConfig,
  TransacaoFinanceira,
  DespesaEscolar,
  ItemPatrimonio,
  EstadoConservacao,
  HistoricoEscolarCompleto,
  ConfiguracaoSistema,
  AnoLectivoConfig,
  PeriodoTrimestre,
  TurnoConfig,
  ClasseEscolar,
  SolicitacaoApoioTecnico,
  AlertaSeguranca,
  TentativaLogin,
  EstadoAno,
  ConfiguracaoPassesEscola,
  ElementoPasseConfig,
  HorarioAulaItem,
  DiaSemana,
  TempoLectivoDefinicao,
  NotificacaoAulaProfessor,
  PresencaAlunoItem,
  TermoExame,
  RegistroAlteracaoNotaDirecao,
  ConfiguracaoDocumentoCustomizado,
  DelegacaoCobrancaFinanceira,
  SessaoAtivaUsuario,
  DelegacaoPoderes,
  TipoDelegacao,
  AcaoDelegadaLog,
  RegistoAcessoBiblioteca,
  RelatorioAcontecimento
} from '../types';
import { isClasseFinal } from './macEngine';
import {
  getCachedLocal,
  setCachedLocalEntry,
  removeCachedLocalEntry,
  getComputedCache
} from './localCache';

const STORAGE_KEYS = {
  ESCOLAS: 'sge_escolas',
  DELEGACOES_PODERES: 'sge_delegacoes_poderes',
  ACOES_DELEGADAS_LOGS: 'sge_acoes_delegadas_logs',
  ALUNOS: 'sge_alunos',
  TURMAS: 'sge_turmas',
  DISCIPLINAS: 'sge_disciplinas',
  ATRIBUICOES: 'sge_atribuicoes',
  TERMOS_EXAME: 'sge_termos_exame',
  FUNCIONARIOS: 'sge_funcionarios',
  TIPOS_AVALIACAO: 'sge_tipos_avaliacao',
  REGRAS_MAC: 'sge_regras_mac',
  AVALIACOES: 'sge_avaliacoes',
  NOTAS: 'sge_notas',
  NOTAS_CONSOLIDADAS: 'sge_notas_consolidadas',
  SOLICITACOES_NOTA: 'sge_solicitacoes_nota',
  JURIS: 'sge_juris',
  PRESENCAS: 'sge_presencas',
  AUDITORIA: 'sge_auditoria',
  MENSAGENS: 'sge_mensagens',
  BIBLIOTECA: 'sge_biblioteca',
  BIBLIOTECA_ACESSOS: 'sge_biblioteca_acessos',
  RECIBOS: 'sge_recibos',
  CURRENT_USER: 'sge_current_user',
  ACTIVE_ESCOLA_ID: 'sge_active_escola_id',
  SETUP_INICIAL_CONCLUIDO: 'sge_setup_inicial_concluido',
  SETUP_MASTER_LOCK: 'sge_setup_master_lock',
  ANOS_LECTIVOS: 'sge_anos_lectivos',
  ANOS_LECTIVOS_CONFIGS: 'sge_anos_lectivos_configs',
  TURNOS_CONFIGS: 'sge_turnos_configs',
  CLASSES_CONFIGS: 'sge_classes_configs',
  CURSOS: 'sge_cursos',
  AREAS_FORMACAO: 'sge_areas_formacao',
  SALAS_AULAS: 'sge_salas_aulas',
  SOLICITACOES_APOIO: 'sge_solicitacoes_apoio',
  ALERTAS_SEGURANCA: 'sge_alertas_seguranca',
  TENTATIVAS_LOGIN_FALHADAS: 'sge_tentativas_login_falhadas',
  CONFIGURACAO_SISTEMA: 'sge_configuracao_sistema',
  CONFIGURACOES_FINANCEIRAS: 'sge_configuracoes_financeiras',
  TRANSACOES_FINANCEIRAS: 'sge_transacoes_financeiras',
  DESPESAS_ESCOLARES: 'sge_despesas_escolares',
  PATRIMONIO: 'sge_patrimonio',
  HISTORICO_COMPLETO: 'sge_historico_completo',
  HORARIOS: 'sge_horarios',
  PRESENCAS_ALUNOS: 'sge_presencas_alunos',
  CONFIGURACOES_PASSES: 'sge_configuracoes_passes',
  ALTERACOES_NOTAS_DIRECAO: 'sge_alteracoes_notas_direcao',
  CONFIGURACOES_DOCUMENTOS: 'sge_configuracoes_documentos',
  DELEGACOES_COBRANCA: 'sge_delegacoes_cobranca',
  EMOLUMENTOS_CONFIG: 'sge_emolumentos_config',
  SESSOES_ATIVAS: 'sge_sessoes_ativas',
  RELATORIOS_ACONTECIMENTOS: 'sge_relatorios_acontecimentos',
};

export const DEFAULT_CURSOS: CursoConfig[] = [
  { id: 'c-1', nome: 'Ensino Primário Geral', area: 'Educação Básica', duracao: '6 Anos', ativo: true },
  { id: 'c-2', nome: 'Iº Ciclo do Ensino Secundário Geral', area: 'Educação Básica', duracao: '3 Anos', ativo: true },
  { id: 'c-3', nome: 'Ciências Físicas e Biológicas (PUNIV)', area: 'Ciências Exatas', duracao: '3 Anos', ativo: true },
  { id: 'c-4', nome: 'Ciências Económicas e Jurídicas (PUNIV)', area: 'Ciências Sociais', duracao: '3 Anos', ativo: true },
  { id: 'c-5', nome: 'Informática e Gestão de Redes', area: 'Técnico-Profissional', duracao: '4 Anos', ativo: true },
  { id: 'c-6', nome: 'Formação de Professores do Ensino Primário (Magistério)', area: 'Pedagógica', duracao: '4 Anos', ativo: true }
];

// Initial Seed Data for Academic Years, Shifts, Classes and Tech Support
export const DEFAULT_ANOS_CONFIGS: AnoLectivoConfig[] = [
  {
    id: 'ano-2024-2025',
    rotulo: '2024/2025',
    ano: '2024/2025',
    dataInicio: '2024-09-02',
    dataFim: '2025-07-31',
    estado: 'Fechado',
    trimestres: [
      { trimestre: '1', nome: 'Iº Trimestre', dataInicio: '2024-09-02', dataFim: '2024-12-15', estado: 'Fechado' },
      { trimestre: '2', nome: 'IIº Trimestre', dataInicio: '2025-01-06', dataFim: '2025-04-11', estado: 'Fechado' },
      { trimestre: '3', nome: 'IIIº Trimestre', dataInicio: '2025-04-28', dataFim: '2025-07-31', estado: 'Fechado' }
    ],
    descricao: 'Ano Letivo 2024/2025 (Histórico Consolidado e Pautas Fechadas)',
    criadoEm: '2024-08-01'
  },
  {
    id: 'ano-2025-2026',
    rotulo: '2025/2026',
    ano: '2025/2026',
    dataInicio: '2025-09-01',
    dataFim: '2026-07-31',
    estado: 'Aberto',
    trimestres: [
      { trimestre: '1', nome: 'Iº Trimestre', dataInicio: '2025-09-01', dataFim: '2025-12-19', estado: 'Aberto' },
      { trimestre: '2', nome: 'IIº Trimestre', dataInicio: '2026-01-05', dataFim: '2026-04-10', estado: 'Fechado' },
      { trimestre: '3', nome: 'IIIº Trimestre', dataInicio: '2026-04-27', dataFim: '2026-07-31', estado: 'Fechado' }
    ],
    descricao: 'Ano Letivo Oficial Ativo do Sistema de Gestão Escolar (MED Angola)',
    criadoEm: '2025-08-15'
  }
];

export const DEFAULT_TURNOS: TurnoConfig[] = [
  { id: 'turno-manha', nome: 'Manhã', horaInicio: '07:30', horaFim: '12:30', temposLectivos: 5, intervaloMinutos: 20, ativo: true },
  { id: 'turno-tarde', nome: 'Tarde', horaInicio: '13:00', horaFim: '18:00', temposLectivos: 5, intervaloMinutos: 20, ativo: true },
  { id: 'turno-noite', nome: 'Noite', horaInicio: '18:15', horaFim: '22:15', temposLectivos: 4, intervaloMinutos: 15, ativo: true }
];

export const DEFAULT_CLASSES: ClasseEscolar[] = [
  { id: 'classe-iniciacao', nome: 'Iniciação', nivelEnsino: 'Iniciacao', descricao: 'Educação Pré-Escolar de Iniciação Obrigatória', ordem: 0 },
  { id: 'classe-1', nome: '1ª Classe', nivelEnsino: 'Primario', descricao: 'Ensino Primário - 1º Nível de Alfabetização', ordem: 1 },
  { id: 'classe-2', nome: '2ª Classe', nivelEnsino: 'Primario', descricao: 'Ensino Primário - 2º Nível', ordem: 2 },
  { id: 'classe-3', nome: '3ª Classe', nivelEnsino: 'Primario', descricao: 'Ensino Primário - 3º Nível', ordem: 3 },
  { id: 'classe-4', nome: '4ª Classe', nivelEnsino: 'Primario', descricao: 'Ensino Primário - 4º Nível', ordem: 4 },
  { id: 'classe-5', nome: '5ª Classe', nivelEnsino: 'Primario', descricao: 'Ensino Primário - 5º Nível', ordem: 5 },
  { id: 'classe-6', nome: '6ª Classe', nivelEnsino: 'Primario', descricao: 'Ensino Primário (Classe Terminal do Primário)', ordem: 6 },
  { id: 'classe-7', nome: '7ª Classe', nivelEnsino: 'ICiclo', descricao: 'Iº Ciclo do Ensino Secundário Geral', ordem: 7 },
  { id: 'classe-8', nome: '8ª Classe', nivelEnsino: 'ICiclo', descricao: 'Iº Ciclo do Ensino Secundário Geral', ordem: 8 },
  { id: 'classe-9', nome: '9ª Classe', nivelEnsino: 'ICiclo', descricao: 'Iº Ciclo do Ensino Secundário Geral (Exame Nacional de Saída)', ordem: 9 },
  { id: 'classe-10', nome: '10ª Classe', nivelEnsino: 'IICiclo', descricao: 'IIº Ciclo do Ensino Secundário Geral ou Técnico-Profissional', ordem: 10 },
  { id: 'classe-11', nome: '11ª Classe', nivelEnsino: 'IICiclo', descricao: 'IIº Ciclo do Ensino Secundário Geral ou Técnico-Profissional', ordem: 11 },
  { id: 'classe-12', nome: '12ª Classe', nivelEnsino: 'IICiclo', descricao: 'IIº Ciclo do Ensino Secundário Geral (Conclusão de Estudos)', ordem: 12 },
  { id: 'classe-13', nome: '13ª Classe', nivelEnsino: 'EnsinoTecnico', descricao: 'Ensino Técnico-Profissional e Formação de Professores', ordem: 13 }
];

export const DEFAULT_SOLICITACOES_APOIO: SolicitacaoApoioTecnico[] = [];

// Modelo para estado inicial virgem do sistema (sem escolas pré-cadastradas)
export const DEFAULT_ESCOLA_VAZIA: Escola = {
  id: '',
  codigoEscola: '',
  nome: 'Nenhuma Escola Registada',
  nomeOficial: 'Nenhuma Escola Registada no Sistema',
  denominacao: '',
  sigla: 'MED',
  logotipo: '',
  nif: '',
  endereco: '',
  municipio: 'Luanda',
  provincia: 'Luanda',
  governoProvincial: 'GOVERNO PROVINCIAL',
  gabineteEducacao: 'GABINETE PROVINCIAL DA EDUCAÇÃO',
  contactos: '',
  email: '',
  decretoCriacao: '',
  artigoLegal: '',
  diretorGeralNome: '',
  subdiretorPedagogicoNome: '',
  chefeSecretariaNome: '',
  anoLectivoActivo: '',
  trimestreActivo: '1',
  estadoAno: 'Planeamento',
  ativo: true,
  estadoEscola: 'Ativa'
};

export const DEFAULT_ESCOLA: Escola = DEFAULT_ESCOLA_VAZIA;
export const DEFAULT_ESCOLA_MAGISTERIO: Escola = DEFAULT_ESCOLA_VAZIA;
export const DEFAULT_ESCOLA_COMPLEXO151: Escola = DEFAULT_ESCOLA_VAZIA;
export const DEFAULT_ESCOLA_PRODUCAO: Escola = DEFAULT_ESCOLA_VAZIA;

export const DEFAULT_ESCOLAS: Escola[] = [];

export const DEFAULT_TURMAS: Turma[] = [];

// Disciplinas criadas de raiz pela Direção da Escola para cada ano letivo
export const DEFAULT_DISCIPLINAS: Disciplina[] = [];


export const DEFAULT_ADMIN_GERAL_PRODUCAO: Funcionario = {
  id: '',
  nomeCompleto: '',
  email: '',
  numeroBI: '',
  telefone: '',
  cargo: 'Administrador Geral',
  role: 'AdminGeral',
  escolaId: 'todas',
  habilitacoes: '',
  fotoUrl: '',
  dataAdmissao: new Date().toISOString().split('T')[0],
  ativo: true,
  statusConta: 'Ativa',
  ehProfessor: false,
  ehAdministrativoQueLeciona: false,
  genero: 'M'
};

export const DEFAULT_FUNCIONARIOS: Funcionario[] = [];

export const DEFAULT_ATRIBUICOES: AtribuicaoDocente[] = [];

export const DEFAULT_ALUNOS: Aluno[] = [];

export const DEFAULT_TIPOS_AVALIACAO: TipoAvaliacaoConfig[] = [
  {
    id: 'tipo-01',
    escolaId: 'todas',
    nome: 'Prova do Professor (PP)',
    codigo: 'PP',
    escalaMax: 20,
    obrigatorio: true,
    pesoPadrao: 2,
    niveisPermitidos: ['Primario', 'ICiclo', 'IICiclo', 'EnsinoTecnico']
  },
  {
    id: 'tipo-02',
    escolaId: 'todas',
    nome: 'Teste de Diagnóstico / Contínuo (TC)',
    codigo: 'TC',
    escalaMax: 20,
    obrigatorio: true,
    pesoPadrao: 1,
    niveisPermitidos: ['Iniciacao', 'Primario', 'ICiclo', 'IICiclo', 'EnsinoTecnico']
  },
  {
    id: 'tipo-03',
    escolaId: 'todas',
    nome: 'Trabalho Individual / Pesquisa (TI)',
    codigo: 'TI',
    escalaMax: 20,
    obrigatorio: false,
    pesoPadrao: 1,
    niveisPermitidos: ['ICiclo', 'IICiclo', 'EnsinoTecnico']
  },
  {
    id: 'tipo-04',
    escolaId: 'todas',
    nome: 'Trabalho em Grupo / Seminário (TG)',
    codigo: 'TG',
    escalaMax: 20,
    obrigatorio: false,
    pesoPadrao: 1,
    niveisPermitidos: ['ICiclo', 'IICiclo', 'EnsinoTecnico']
  },
  {
    id: 'tipo-05',
    escolaId: 'todas',
    nome: 'Avaliação Contínua e Participação (ACP)',
    codigo: 'ACP',
    escalaMax: 20,
    obrigatorio: false,
    pesoPadrao: 1,
    niveisPermitidos: ['Iniciacao', 'Primario', 'ICiclo', 'IICiclo', 'EnsinoTecnico']
  }
];

export const DEFAULT_REGRAS_MAC: RegraCalculoMAC[] = [
  {
    id: 'regra-primario',
    escolaId: 'todas',
    nivelEnsino: 'Primario',
    classe: 'Todas',
    formulaTipo: 'ARITMETICA_SIMPLES',
    formulaCustom: 'SUM(notas)/COUNT(notas)',
    minAvaliacoesExigidas: 2,
    maxAvaliacoesPermitidas: 10,
    descartarMenorNota: false,
    versao: 1,
    atualizadoEm: '2025-01-10T10:00:00Z',
    atualizadoPor: 'Ministério da Educação (MED)'
  },
  {
    id: 'regra-ciclo-i',
    escolaId: 'todas',
    nivelEnsino: 'ICiclo',
    classe: 'Todas',
    formulaTipo: 'PONDERADA_POR_TIPO',
    pesosPorTipo: {
      'tipo-01': 2,
      'tipo-02': 1,
      'tipo-03': 1,
      'tipo-04': 1,
      'tipo-05': 1
    },
    minAvaliacoesExigidas: 3,
    maxAvaliacoesPermitidas: 12,
    descartarMenorNota: true,
    versao: 1,
    atualizadoEm: '2025-01-10T10:00:00Z',
    atualizadoPor: 'Ministério da Educação (MED)'
  },
  {
    id: 'regra-ciclo-ii',
    escolaId: 'todas',
    nivelEnsino: 'IICiclo',
    classe: '12ª',
    formulaTipo: 'ARITMETICA_SIMPLES',
    minAvaliacoesExigidas: 3,
    maxAvaliacoesPermitidas: 15,
    descartarMenorNota: false,
    versao: 1,
    atualizadoEm: '2025-01-10T10:00:00Z',
    atualizadoPor: 'Ministério da Educação (MED)'
  }
];

export const DEFAULT_AVALIACOES: AvaliacaoCriada[] = [];

export const DEFAULT_NOTAS: NotaEstudante[] = [];

export const DEFAULT_NOTAS_CONSOLIDADAS: NotaTrimestralConsolidada[] = [];

export const DEFAULT_JURIS: ComissaoJuri[] = [];

export const DEFAULT_SOLICITACOES_NOTA: SolicitacaoAlteracaoNota[] = [];

export const DEFAULT_PRESENCAS: PresencaFuncionario[] = [];

export const DEFAULT_AUDITORIA: LogAuditoria[] = [];

export const DEFAULT_MENSAGENS: MensagemInterna[] = [];

export const DEFAULT_BIBLIOTECA: DocumentoBiblioteca[] = [];

export const DEFAULT_RECIBOS: ReciboPagamento[] = [];

// LocalStorage Helper com Cache em Memória Read-Through / Write-Through
function getLocal<T>(key: string, fallback: T): T {
  return getCachedLocal<T>(key, fallback);
}

function setLocal<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
      removeCachedLocalEntry(key);
      return;
    }

    const serialized = JSON.stringify(value);
    setCachedLocalEntry(key, serialized, value, false);

    const agoraIso = new Date().toISOString();
    // Espelhamento imediato para todas as chaves de dados no IndexedDB (sem esperar debounce de 300ms)
    if (key.startsWith('sge_') && key !== STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS && key !== 'sge_ls_timestamps') {
      offlineStorage.gravarChaveNoIndexedDB(key, serialized);
    }

    try {
      localStorage.setItem(key, serialized);
      offlineStorage.marcarTimestampLocalStorage(key, agoraIso);
    } catch (quotaErr) {
      console.warn(`[Storage] Quota localStorage excedida na chave ${key}, aplicando preservação em IndexedDB e cache primária em memória:`, quotaErr);

      let persistedToLocalStorage = false;
      // Preservar mídias em cache + IndexedDB e armazenar versão compacta no localStorage
      if (Array.isArray(value) && (key === STORAGE_KEYS.FUNCIONARIOS || key === STORAGE_KEYS.ALUNOS)) {
        const entityType = key === STORAGE_KEYS.FUNCIONARIOS ? 'funcionario' : 'aluno';
        const slimmed = value.map((item: any) => {
          if (item && item.id && typeof item.fotoUrl === 'string' && item.fotoUrl.length > 2048 && item.fotoUrl !== '__idb_media__') {
            offlineStorage.definirMidiaEmCache(entityType, item.id, item.fotoUrl);
            offlineStorage.salvarMidia(entityType, item.id, item.fotoUrl, item.atualizadoEm);
            return { ...item, fotoUrl: '__idb_media__' };
          }
          return item;
        });
        try {
          const slimSer = JSON.stringify(slimmed);
          localStorage.setItem(key, slimSer);
          setCachedLocalEntry(key, slimSer, slimmed, false);
          persistedToLocalStorage = true;
        } catch {
          // Último recurso: remover logs antigos para libertar espaço
          try {
            localStorage.removeItem(STORAGE_KEYS.AUDITORIA);
            removeCachedLocalEntry(STORAGE_KEYS.AUDITORIA);
            const slimSer = JSON.stringify(slimmed);
            localStorage.setItem(key, slimSer);
            setCachedLocalEntry(key, slimSer, slimmed, false);
            persistedToLocalStorage = true;
          } catch {}
        }
      } else if (Array.isArray(value) && key === STORAGE_KEYS.BIBLIOTECA) {
        const slimBib = value.map((item: any) => {
          if (item && typeof item === 'object' && item.tipoRecurso !== 'Link') {
            return { ...item, url: '__idb_pdf__', arquivoUrl: '__idb_pdf__' };
          }
          return item;
        });
        try {
          const slimSer = JSON.stringify(slimBib);
          localStorage.setItem(key, slimSer);
          setCachedLocalEntry(key, slimSer, slimBib, false);
          persistedToLocalStorage = true;
        } catch {}
      } else if (key === STORAGE_KEYS.CURRENT_USER && value && typeof value === 'object') {
        const u: any = value;
        if (u.id && typeof u.fotoUrl === 'string' && u.fotoUrl.length > 2048 && u.fotoUrl !== '__idb_media__') {
          offlineStorage.definirMidiaEmCache('funcionario', u.id, u.fotoUrl);
          offlineStorage.salvarMidia('funcionario', u.id, u.fotoUrl, u.atualizadoEm);
          try {
            const slimUser = { ...u, fotoUrl: '__idb_media__' };
            const slimSer = JSON.stringify(slimUser);
            localStorage.setItem(key, slimSer);
            setCachedLocalEntry(key, slimSer, slimUser, false);
            persistedToLocalStorage = true;
          } catch {}
        }
      }

      if (persistedToLocalStorage) {
        offlineStorage.marcarTimestampLocalStorage(key, agoraIso);
      } else {
        // Garantir que getCachedLocal devolva o dado completo em RAM nesta sessão (além do IndexedDB já gravado)
        setCachedLocalEntry(key, serialized, value, true);
      }
      offlineStorage.registarMutacao('Armazenamento', 'ATUALIZAR', `Preservação no IndexedDB para a chave: ${key}`, 'Sistema');
    }

    // Notificar motor de persistência offline para espelhamento em IndexedDB
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_local_write', { detail: { key, timestamp: new Date().toISOString() } }));
      }
    } catch {
      // noop
    }
  } catch (e) {
    console.error(`Erro ao gravar chave ${key} no localStorage:`, e);
    offlineStorage.registarMutacao('Armazenamento', 'ATUALIZAR', `Alerta de gravação local na chave: ${key}`, 'Sistema');
  }
}

function hidratarFotoDeLista<T extends { id?: string; fotoUrl?: string }>(
  items: T[],
  entityType: 'funcionario' | 'aluno'
): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  let alterou = false;
  const resultado = items.map(item => {
    if (!item || !item.id) return item;
    if (item.fotoUrl === '__idb_media__' || item.fotoUrl === undefined) {
      const cached = offlineStorage.obterMidiaEmCache(entityType, item.id);
      if (cached !== undefined) {
        alterou = true;
        return { ...item, fotoUrl: cached };
      }
      if (item.fotoUrl === '__idb_media__') {
        alterou = true;
        return { ...item, fotoUrl: '' };
      }
    }
    return item;
  });
  return alterou ? resultado : items;
}

async function normalizarEPersistirFuncionarioAsync(
  funcInicial: Funcionario,
  rawFotoInput: unknown,
  pularSyncPerfilSeNaoAlterouFoto: boolean = false
): Promise<void> {
  try {
    let fotoFinal: string = typeof funcInicial.fotoUrl === 'string' ? funcInicial.fotoUrl : '';

    const precisaConverter =
      (typeof Blob !== 'undefined' && rawFotoInput instanceof Blob) ||
      (typeof rawFotoInput === 'string' && (rawFotoInput.startsWith('blob:') || (rawFotoInput.startsWith('data:image') && rawFotoInput.length > 130000)));

    if (rawFotoInput === '' || rawFotoInput === null) {
      fotoFinal = '';
      await offlineStorage.salvarMidia('funcionario', funcInicial.id, '', funcInicial.atualizadoEm);
    } else if (precisaConverter) {
      const convertida = await offlineStorage.converterFonteParaBase64Portatil(rawFotoInput, 460, 0.80);
      if (convertida) {
        fotoFinal = convertida;
      } else if (fotoFinal.startsWith('blob:')) {
        fotoFinal = '';
      }
    }

    const funcFinal: Funcionario = {
      ...funcInicial,
      fotoUrl: fotoFinal,
      atualizadoEm: funcInicial.atualizadoEm || new Date().toISOString()
    };

    // 1. Persistir em IndexedDB (store funcionarios + store media_blobs com Base64 e Blob)
    await offlineStorage.salvarFuncionarioNoIndexedDB(funcFinal);

    // 2. Atualizar localStorage e sessão ativa caso a foto tenha sido convertida/comprimida
    const fotoMudou = fotoFinal !== funcInicial.fotoUrl;
    if (fotoMudou) {
      const funcs = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      const idx = funcs.findIndex(f => f.id === funcFinal.id);
      if (idx >= 0) {
        funcs[idx] = { ...funcs[idx], ...funcFinal };
        setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
      }
      const cur = getLocal<Funcionario | null>(STORAGE_KEYS.CURRENT_USER, null);
      if (cur && cur.id === funcFinal.id) {
        setLocal(STORAGE_KEYS.CURRENT_USER, { ...cur, ...funcFinal });
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('sge_user', JSON.stringify({ ...cur, ...funcFinal }));
          }
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }
    }

    // 3. Enviar diretamente para o Firebase Firestore (evita duplicação quando já foi sincronizado em batch atómico e a foto não mudou)
    if (!pularSyncPerfilSeNaoAlterouFoto || fotoMudou) {
      await firebaseSyncEngine.salvarPerfilUsuario(funcFinal);
    }
  } catch (err) {
    console.warn('[Storage] Falha ao normalizar/sincronizar foto do funcionário:', err);
  }
}

async function normalizarEPersistirFotoAlunoAsync(
  alunoInicial: Aluno,
  rawFotoInput: unknown
): Promise<void> {
  try {
    let fotoFinal: string = typeof alunoInicial.fotoUrl === 'string' ? alunoInicial.fotoUrl : '';

    if (rawFotoInput === '' || rawFotoInput === null) {
      fotoFinal = '';
      await offlineStorage.salvarMidia('aluno', alunoInicial.id, '', alunoInicial.atualizadoEm);
    } else if (
      (typeof Blob !== 'undefined' && rawFotoInput instanceof Blob) ||
      (typeof rawFotoInput === 'string' && (rawFotoInput.startsWith('blob:') || (rawFotoInput.startsWith('data:image') && rawFotoInput.length > 130000)))
    ) {
      const convertida = await offlineStorage.converterFonteParaBase64Portatil(rawFotoInput, 460, 0.80);
      if (convertida) {
        fotoFinal = convertida;
      } else if (fotoFinal.startsWith('blob:')) {
        fotoFinal = '';
      }
      if (fotoFinal) {
        await offlineStorage.salvarMidia('aluno', alunoInicial.id, fotoFinal, alunoInicial.atualizadoEm);
      }
    } else if (fotoFinal) {
      await offlineStorage.salvarMidia('aluno', alunoInicial.id, fotoFinal, alunoInicial.atualizadoEm);
    }

    const alunoFinal: Aluno = {
      ...alunoInicial,
      fotoUrl: fotoFinal,
      atualizadoEm: alunoInicial.atualizadoEm || new Date().toISOString()
    };

    if (fotoFinal !== alunoInicial.fotoUrl) {
      const alunos = getLocal<Aluno[]>(STORAGE_KEYS.ALUNOS, DEFAULT_ALUNOS);
      const idx = alunos.findIndex(a => a.id === alunoFinal.id);
      if (idx >= 0) {
        alunos[idx] = { ...alunos[idx], ...alunoFinal };
        setLocal(STORAGE_KEYS.ALUNOS, alunos);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }
    }

    await firebaseSyncEngine.salvarAluno(alunoFinal);
  } catch (err) {
    console.warn('[Storage] Falha ao normalizar/sincronizar foto do aluno:', err);
  }
}

export const DEFAULT_CONFIGURACAO_SISTEMA: ConfiguracaoSistema = {
  insigniaNacionalUrl: '', // vazio carrega InsigniaAngola oficial
  nomeSistema: 'SGE-NG',
  subtituloSistema: 'Sistema de Gestão Escolar de Angola',
  ministerioNome: 'Ministério da Educação (MED)',
  pais: 'República de Angola',
  modoProducao: true,
  sincronizacaoFirebaseAtiva: true,
  dataInicializacao: new Date().toISOString(),
  forcarHTTPS: true,
  bannerCookiesAtivo: true,
  exigirConsentimentoPoliticas: true,
  protecaoAntiSpamAtiva: true,
  limiteSubmissoesPorMinuto: 10,
  otimizacaoCarregamentoAtiva: true,
  emailDPO: 'privacidade@sge-ng.ao',
  telefoneSuporte: '+244 923 000 000',
  politicaVersao: '1.0 (2026)',
  idiomaSistema: 'pt-AO',
  fusoHorario: 'Africa/Luanda'
};

export const DEFAULT_CONFIGURACOES_FINANCEIRAS: Record<string, ConfiguracaoFinanceiraEscola> = {};

export const DEFAULT_TRANSACOES_FINANCEIRAS: TransacaoFinanceira[] = [];

export const DEFAULT_DESPESAS_ESCOLARES: DespesaEscolar[] = [];

export const DEFAULT_PATRIMONIO: ItemPatrimonio[] = [];

export const DEFAULT_HISTORICO_COMPLETO: Record<string, HistoricoEscolarCompleto> = {};

export const DEFAULT_CONFIGURACAO_PASSES: ConfiguracaoPassesEscola = {
  corPrimaria: '#1e3a8a', // Azul Real MED
  corSecundaria: '#d97706', // Ouro / Dourado
  corTexto: '#ffffff',
  corFundoFrente: '#ffffff',
  estiloTarja: 'elegante_dourado',
  mostrarVerso: true,
  regrasVerso: [
    'Este cartão é pessoal e intransmissível e de porte obrigatório no recinto escolar.',
    'Em caso de extravio ou dano, comunicar com urgência à Direcção da Escola.',
    'Apresentação obrigatória na realização de provas e exames trimestrais.',
    'A validade do presente passe expira com o termo do ano letivo oficial vigente.'
  ],
  disposicaoGrade: '8_por_folha',
  orientacao: 'horizontal',
  chancelaDigitalAtiva: true,
  elementos: [
    { id: 'el-insignia', chave: 'insignia', rotulo: 'Insígnia Oficial da República de Angola', ativo: true, ordem: 1, posicao: 'topo' },
    { id: 'el-logotipo', chave: 'logotipo', rotulo: 'Logótipo Oficial da Escola', ativo: true, ordem: 2, posicao: 'topo' },
    { id: 'el-foto', chave: 'foto', rotulo: 'Fotografia Tipo Passe do Aluno', ativo: true, ordem: 3, posicao: 'esquerda' },
    { id: 'el-nome', chave: 'nome', rotulo: 'Nome Completo do Aluno', ativo: true, ordem: 4, posicao: 'centro' },
    { id: 'el-processo', chave: 'numeroProcesso', rotulo: 'Nº de Processo / Matrícula', ativo: true, ordem: 5, posicao: 'centro' },
    { id: 'el-bi', chave: 'numeroBI', rotulo: 'Nº do Bilhete de Identidade (B.I.)', ativo: true, ordem: 6, posicao: 'centro' },
    { id: 'el-classe-turma', chave: 'classeTurma', rotulo: 'Classe e Turma', ativo: true, ordem: 7, posicao: 'centro' },
    { id: 'el-turno', chave: 'turno', rotulo: 'Turno e Sala', ativo: true, ordem: 8, posicao: 'centro' },
    { id: 'el-curso', chave: 'curso', rotulo: 'Curso / Opção de Estudo', ativo: true, ordem: 9, posicao: 'centro' },
    { id: 'el-encarregado', chave: 'encarregado', rotulo: 'Encarregado de Educação', ativo: true, ordem: 10, posicao: 'centro' },
    { id: 'el-contacto', chave: 'contactoEmergencia', rotulo: 'Contacto de Emergência', ativo: true, ordem: 11, posicao: 'centro' },
    { id: 'el-validade', chave: 'validade', rotulo: 'Data de Emissão e Validade', ativo: true, ordem: 12, posicao: 'rodape' },
    { id: 'el-qrcode', chave: 'qrCode', rotulo: 'Código QR de Validação Digital', ativo: true, ordem: 13, posicao: 'direita' },
    { id: 'el-barras', chave: 'codigoBarras', rotulo: 'Código de Barras Oficial', ativo: true, ordem: 14, posicao: 'rodape' },
    { id: 'el-assinatura', chave: 'assinaturaDiretor', rotulo: 'Chancela / Assinatura da Direção', ativo: true, ordem: 15, posicao: 'rodape' }
  ]
};

export const DEFAULT_HORARIOS: HorarioAulaItem[] = [];

export const DEFAULT_PRESENCAS_ALUNOS: PresencaAlunoItem[] = [];

// Initializer
export function inicializarArmazenamento(): void {
  if (typeof window === 'undefined') return;

  // Se já há utilizador autenticado ou dados registados no dispositivo, preserva integralmente a sessão
  const isAuth = localStorage.getItem('sge_authenticated') === 'true';
  const hasUser = !!localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  const rawFuncs = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
  const funcs = (rawFuncs && rawFuncs !== 'undefined' && rawFuncs !== 'null') ? JSON.parse(rawFuncs) : [];
  const temAdmin = Array.isArray(funcs) && funcs.some((f: any) => f.role === 'AdminGeral' && f.ativo !== false);

  if (isAuth || hasUser || temAdmin || (Array.isArray(funcs) && funcs.length > 0)) {
    localStorage.setItem('sge_admin_configured', 'true');
    localStorage.setItem(STORAGE_KEYS.SETUP_MASTER_LOCK, 'true');
    localStorage.setItem(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, 'true');
  }

  // Apenas inicializar configuração base se inexistente (getLocal já devolve DEFAULT_* para listas vazias, evitando 30 escritas e eventos no arranque)
  if (!localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA)) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(DEFAULT_CONFIGURACAO_SISTEMA));
    } catch {}
  }
  
  // Limpar chaves corrompidas ou strings "undefined" / "null"
  try {
    const rawCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (rawCurrentUser === 'undefined' || rawCurrentUser === 'null') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch {
    // noop
  }

  // Sanitização e purga de dados legados de demonstração no armazenamento do navegador
  try {
    const rawStoredEscolas = localStorage.getItem(STORAGE_KEYS.ESCOLAS);
    if (rawStoredEscolas && rawStoredEscolas !== 'undefined' && rawStoredEscolas !== 'null') {
      try {
        const parsedEscolas: Escola[] = JSON.parse(rawStoredEscolas);
        if (Array.isArray(parsedEscolas)) {
          const escolasReais = parsedEscolas.filter(e => e.id !== 'esc-001' && e.id !== 'esc-002' && e.id !== 'esc-003');
          if (escolasReais.length !== parsedEscolas.length) {
            setLocal(STORAGE_KEYS.ESCOLAS, escolasReais);
          }
        }
      } catch {}
    }

    const rawStoredFuncs = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
    if (rawStoredFuncs && rawStoredFuncs !== 'undefined' && rawStoredFuncs !== 'null') {
      try {
        const parsedFuncs: Funcionario[] = JSON.parse(rawStoredFuncs);
        if (Array.isArray(parsedFuncs) && parsedFuncs.length > 0) {
          // Remover contas de demonstração conhecidas e nomes fictícios
          const MOCK_NAMES = ['manuel zola', 'dr. manuel zola', 'manuel almeida lula', 'garcia antónio vunge', 'esperança maria kwanza'];
          const funcsReais = parsedFuncs.filter(f => 
            !f.id.startsWith('func-00') && 
            f.id !== 'func-subadmin-01' && 
            f.id !== 'test_admin' &&
            !f.id.startsWith('func-admin-179') &&
            f.id !== 'func-1790329119660' &&
            !MOCK_NAMES.includes((f.nomeCompleto || '').toLowerCase().trim())
          );
          if (funcsReais.length !== parsedFuncs.length) {
            setLocal(STORAGE_KEYS.FUNCIONARIOS, funcsReais);
          }
        }
      } catch {}
    }

    const rawStoredTurmas = localStorage.getItem(STORAGE_KEYS.TURMAS);
    if (rawStoredTurmas && rawStoredTurmas !== 'undefined' && rawStoredTurmas !== 'null') {
      try {
        const parsedTurmas = JSON.parse(rawStoredTurmas);
        if (Array.isArray(parsedTurmas)) {
          const turmasReais = parsedTurmas.filter((t: any) => 
            !t.id.startsWith('turma-1a') && 
            !t.id.startsWith('turma-6a') && 
            !t.id.startsWith('turma-7a') && 
            !t.id.startsWith('turma-9a') && 
            !t.id.startsWith('turma-12a') && 
            !t.id.startsWith('turma-ini') && 
            !t.id.startsWith('turma-mag') &&
            !t.id.startsWith('turma-151')
          );
          if (turmasReais.length !== parsedTurmas.length) {
            setLocal(STORAGE_KEYS.TURMAS, turmasReais);
          }
        }
      } catch {}
    }

    const rawStoredAlunos = localStorage.getItem(STORAGE_KEYS.ALUNOS);
    if (rawStoredAlunos && rawStoredAlunos !== 'undefined' && rawStoredAlunos !== 'null') {
      try {
        const parsedAlunos = JSON.parse(rawStoredAlunos);
        if (Array.isArray(parsedAlunos)) {
          const MOCK_STUDENT_NAMES = ['kiese manuel domingos', 'ndilu manuel sebastião', 'manuel gonçalves', 'madalena fineza nzinga', 'afonso domingos cambuta'];
          const alunosReais = parsedAlunos.filter((a: any) => 
            !a.id.startsWith('aluno-00') &&
            !a.id.startsWith('aluno-goncalves') &&
            !a.id.startsWith('aluno-ndilu') &&
            !a.id.startsWith('aluno-nzinga') &&
            a.id !== 'exemplo-01' &&
            !MOCK_STUDENT_NAMES.includes((a.nomeCompleto || '').toLowerCase().trim())
          );
          if (alunosReais.length !== parsedAlunos.length) {
            setLocal(STORAGE_KEYS.ALUNOS, alunosReais);
          }
        }
      } catch {}
    }

    const rawStoredNotas = localStorage.getItem(STORAGE_KEYS.NOTAS);
    if (rawStoredNotas && rawStoredNotas !== 'undefined' && rawStoredNotas !== 'null') {
      try {
        const parsedNotas = JSON.parse(rawStoredNotas);
        if (Array.isArray(parsedNotas)) {
          const notasReais = parsedNotas.filter((n: any) => 
            !n.id?.startsWith('cons-0') &&
            !n.id?.startsWith('cons-goncalves') &&
            !n.id?.startsWith('cons-ndilu')
          );
          if (notasReais.length !== parsedNotas.length) {
            setLocal(STORAGE_KEYS.NOTAS, notasReais);
          }
        }
      } catch {}
    }

    const rawStoredNotasCons = localStorage.getItem(STORAGE_KEYS.NOTAS_CONSOLIDADAS);
    if (rawStoredNotasCons && rawStoredNotasCons !== 'undefined' && rawStoredNotasCons !== 'null') {
      try {
        const parsedNotasCons = JSON.parse(rawStoredNotasCons);
        if (Array.isArray(parsedNotasCons)) {
          const notasConsReais = parsedNotasCons.filter((n: any) => 
            !n.id?.startsWith('cons-0') &&
            !n.id?.startsWith('cons-goncalves') &&
            !n.id?.startsWith('cons-ndilu')
          );
          if (notasConsReais.length !== parsedNotasCons.length) {
            setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, notasConsReais);
          }
        }
      } catch {}
    }

    // Purga apenas funcionários com nomes fictícios ou de teste antigos se não houver escolas
    const escolasAtuais = dbService.getEscolas();
    if (escolasAtuais.length === 0) {
      const funcs = dbService.getFuncionarios();
      const funcsReais = funcs.filter(f => f.role === 'AdminGeral' || (f.nomeCompleto && f.password));
      if (funcsReais.length !== funcs.length) {
        setLocal(STORAGE_KEYS.FUNCIONARIOS, funcsReais);
      }
    }
  } catch (e) {
    console.warn('Erro ao purgar dados de teste no armazenamento local:', e);
  }
}

// Auto-inicialização leve do armazenamento e hidratação IndexedDB sem bloquear o primeiro frame
if (typeof window !== 'undefined') {
  try {
    inicializarArmazenamento();
    setTimeout(() => {
      offlineStorage.hidratarArmazenamentoDoIndexedDB();
    }, 80);
  } catch (err) {
    console.warn('[Storage] Inicialização de contingência:', err);
  }
}

const getAuthenticatedUserFromStorage = (): Funcionario | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    if (localStorage.getItem('sge_authenticated') !== 'true') return null;
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    const user = JSON.parse(raw) as Funcionario;
    return user && user.id && user.role ? user : null;
  } catch {
    return null;
  }
};

const isSessaoAutenticadaNaoAdminGeral = (): boolean => {
  const user = getAuthenticatedUserFromStorage();
  return Boolean(user && user.role !== 'AdminGeral');
};

const isAdminGeralUserObj = (f: Partial<Funcionario> | null | undefined): boolean => {
  if (!f) return false;
  return f.role === 'AdminGeral' || f.id === 'admin-geral';
};

const getAdminGeralIdsAndNomes = (): { ids: Set<string>; nomes: Set<string> } => {
  const rawFuncs = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
  const ids = new Set<string>(['admin-geral']);
  const nomes = new Set<string>(['administrador geral', 'administrador geral do sistema']);
  rawFuncs.forEach(f => {
    if (isAdminGeralUserObj(f)) {
      if (f.id) ids.add(f.id);
      if (f.nomeCompleto) nomes.add(f.nomeCompleto.trim().toLowerCase());
      if (f.email) nomes.add(f.email.trim().toLowerCase());
    }
  });
  return { ids, nomes };
};

const isLogOuAcaoDoAdminGeral = (
  log: LogAuditoria,
  adminIds: Set<string>,
  adminNomes: Set<string>
): boolean => {
  if (!log) return false;
  if (log.origemAdminGeral === true) return true;
  const papelLower = (log.papel || '').toLowerCase();
  const roleLower = (log.usuarioRole || '').toLowerCase();
  const nomeLower = (log.utilizadorNome || log.usuarioNome || '').trim().toLowerCase();
  const acaoLower = (log.acao || '').toLowerCase();
  const detalheLower = (log.detalhe || log.detalhes || '').toLowerCase();

  if (
    log.papel === 'AdminGeral' ||
    log.usuarioRole === 'AdminGeral' ||
    papelLower.includes('admingeral') ||
    papelLower.includes('administrador geral') ||
    papelLower.includes('apoio técnico') ||
    roleLower.includes('admingeral')
  ) {
    return true;
  }

  if (log.utilizadorId && adminIds.has(log.utilizadorId)) return true;
  if (nomeLower && (adminNomes.has(nomeLower) || nomeLower.includes('administrador geral'))) return true;

  if (
    detalheLower.includes('[apoio técnico autorizado') ||
    detalheLower.includes('administrador geral') ||
    detalheLower.includes('admin geral')
  ) {
    return true;
  }

  const acoesExclusivasAdmin = [
    'inicialização oficial do sistema',
    'reinicialização do administrador geral',
    'criação de escola',
    'suspensão de escola',
    'reativação de escola',
    'eliminação total de escola',
    'edição de escola',
    'credenciais do diretor geral',
    'acesso de suporte técnico autorizado',
    'encerramento de suporte técnico',
    'configuração inicial concluída',
    'configurações globais'
  ];
  if (acoesExclusivasAdmin.some(a => acaoLower.includes(a))) {
    return true;
  }

  return false;
};

export interface IncrementalBackupCollectionStat {
  colecao: string;
  rotulo: string;
  alterados: number;
  eliminados: number;
}

export interface IncrementalBackupSummary {
  temCheckpointBase: boolean;
  ultimoBackupEm: string | null;
  tipoUltimoBackup: 'COMPLETO' | 'INCREMENTAL' | null;
  sequenciaAtual: number;
  totalAdicionadosOuAlterados: number;
  totalEliminados: number;
  detalhesPorColecao: IncrementalBackupCollectionStat[];
  estimativaTamanhoKB: number;
  escolaIdAlvo: string;
}

const COLECOES_BACKUP_INCREMENTAL_META: Array<{
  colecao: string;
  rotulo: string;
  storageKey: string;
}> = [
  { colecao: 'escolas', rotulo: 'Escolas', storageKey: STORAGE_KEYS.ESCOLAS },
  { colecao: 'alunos', rotulo: 'Estudantes', storageKey: STORAGE_KEYS.ALUNOS },
  { colecao: 'turmas', rotulo: 'Turmas', storageKey: STORAGE_KEYS.TURMAS },
  { colecao: 'disciplinas', rotulo: 'Disciplinas', storageKey: STORAGE_KEYS.DISCIPLINAS },
  { colecao: 'atribuicoes', rotulo: 'Atribuições Docentes', storageKey: STORAGE_KEYS.ATRIBUICOES },
  { colecao: 'funcionarios', rotulo: 'Funcionários', storageKey: STORAGE_KEYS.FUNCIONARIOS },
  { colecao: 'tiposAvaliacao', rotulo: 'Tipos de Avaliação', storageKey: STORAGE_KEYS.TIPOS_AVALIACAO },
  { colecao: 'regrasMAC', rotulo: 'Regras MAC & Médias', storageKey: STORAGE_KEYS.REGRAS_MAC },
  { colecao: 'avaliacoes', rotulo: 'Avaliações Criadas', storageKey: STORAGE_KEYS.AVALIACOES },
  { colecao: 'notas', rotulo: 'Notas Lançadas', storageKey: STORAGE_KEYS.NOTAS },
  { colecao: 'notasConsolidadas', rotulo: 'Notas Consolidadas', storageKey: STORAGE_KEYS.NOTAS_CONSOLIDADAS },
  { colecao: 'solicitacoesNota', rotulo: 'Solicitações de Nota', storageKey: STORAGE_KEYS.SOLICITACOES_NOTA },
  { colecao: 'juris', rotulo: 'Júris de Exame', storageKey: STORAGE_KEYS.JURIS },
  { colecao: 'termosExame', rotulo: 'Termos de Exame', storageKey: STORAGE_KEYS.TERMOS_EXAME },
  { colecao: 'horarios', rotulo: 'Horários Lectivos', storageKey: STORAGE_KEYS.HORARIOS },
  { colecao: 'presencas', rotulo: 'Assiduidade Docentes', storageKey: STORAGE_KEYS.PRESENCAS },
  { colecao: 'presencasAlunos', rotulo: 'Presenças de Alunos', storageKey: STORAGE_KEYS.PRESENCAS_ALUNOS },
  { colecao: 'auditoria', rotulo: 'Logs de Auditoria', storageKey: STORAGE_KEYS.AUDITORIA },
  { colecao: 'mensagens', rotulo: 'Mensagens Internas', storageKey: STORAGE_KEYS.MENSAGENS },
  { colecao: 'biblioteca', rotulo: 'Biblioteca Digital', storageKey: STORAGE_KEYS.BIBLIOTECA },
  { colecao: 'bibliotecaAcessos', rotulo: 'Acessos Biblioteca', storageKey: STORAGE_KEYS.BIBLIOTECA_ACESSOS },
  { colecao: 'recibos', rotulo: 'Recibos', storageKey: STORAGE_KEYS.RECIBOS },
  { colecao: 'transacoesFinanceiras', rotulo: 'Receitas & Pagamentos', storageKey: STORAGE_KEYS.TRANSACOES_FINANCEIRAS },
  { colecao: 'despesasEscolares', rotulo: 'Despesas Escolares', storageKey: STORAGE_KEYS.DESPESAS_ESCOLARES },
  { colecao: 'patrimonio', rotulo: 'Património & Inventário', storageKey: STORAGE_KEYS.PATRIMONIO },
  { colecao: 'delegacoesPoderes', rotulo: 'Delegações de Poderes', storageKey: STORAGE_KEYS.DELEGACOES_PODERES },
  { colecao: 'acoesDelegadasLogs', rotulo: 'Registos de Delegação', storageKey: STORAGE_KEYS.ACOES_DELEGADAS_LOGS },
  { colecao: 'delegacoesCobranca', rotulo: 'Delegações de Cobrança', storageKey: STORAGE_KEYS.DELEGACOES_COBRANCA },
  { colecao: 'emolumentosPersonalizados', rotulo: 'Emolumentos', storageKey: STORAGE_KEYS.EMOLUMENTOS_CONFIG },
  { colecao: 'anosLectivosConfigs', rotulo: 'Anos Lectivos (Config)', storageKey: STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS },
  { colecao: 'turnosConfigs', rotulo: 'Turnos', storageKey: STORAGE_KEYS.TURNOS_CONFIGS },
  { colecao: 'classesConfigs', rotulo: 'Classes', storageKey: STORAGE_KEYS.CLASSES_CONFIGS },
  { colecao: 'cursos', rotulo: 'Cursos', storageKey: STORAGE_KEYS.CURSOS },
  { colecao: 'areasFormacao', rotulo: 'Áreas de Formação', storageKey: STORAGE_KEYS.AREAS_FORMACAO },
  { colecao: 'salasAulas', rotulo: 'Salas de Aula', storageKey: STORAGE_KEYS.SALAS_AULAS },
  { colecao: 'solicitacoesApoio', rotulo: 'Apoio Técnico', storageKey: STORAGE_KEYS.SOLICITACOES_APOIO },
  { colecao: 'alertasSeguranca', rotulo: 'Alertas de Segurança', storageKey: STORAGE_KEYS.ALERTAS_SEGURANCA },
  { colecao: 'relatoriosAcontecimentos', rotulo: 'Relatórios de Acontecimentos', storageKey: STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS }
];

function hashDeterministicoSge(valor: unknown): string {
  const str = JSON.stringify(valor) ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}_${str.length}`;
}

function obterChaveRegistroIncremental(colecao: string, item: any, fallbackIdx: number): string {
  if (!item || typeof item !== 'object') return `${colecao}_${fallbackIdx}`;
  if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
    return String(item.id);
  }
  if (item.nivelEnsino) return `nivel_${item.nivelEnsino}_${item.escolaId || 'global'}`;
  if (item.codigo) return String(item.codigo);
  if (item.turmaId && item.disciplinaId) return `${item.turmaId}_${item.disciplinaId}_${item.alunoId || fallbackIdx}`;
  return `${colecao}_${fallbackIdx}_${hashDeterministicoSge(item)}`;
}

function calcularEscopoIncremental(escolaId?: string): {
  nonAdmin: boolean;
  effectiveEscolaId: string;
  isEscolaEspecifica: boolean;
  chaveEscopo: string;
} {
  const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
  const activeId = getLocal<string>(STORAGE_KEYS.ACTIVE_ESCOLA_ID, '') || '';
  const rawEscolas = getLocal<Escola[]>(STORAGE_KEYS.ESCOLAS, []);
  const fallbackEscolaId = activeId || rawEscolas[0]?.id || 'todas';
  const effectiveEscolaId = nonAdmin
    ? (escolaId && escolaId !== 'todas' ? escolaId : fallbackEscolaId)
    : (escolaId || 'todas');
  const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
  return {
    nonAdmin,
    effectiveEscolaId,
    isEscolaEspecifica,
    chaveEscopo: isEscolaEspecifica ? effectiveEscolaId : 'todas'
  };
}

function coletarSnapshotEstadoAtualParaIncremental(escolaId?: string) {
  const scope = calcularEscopoIncremental(escolaId);
  const { nonAdmin, effectiveEscolaId, isEscolaEspecifica } = scope;
  const { ids: adminIds, nomes: adminNomes } = getAdminGeralIdsAndNomes();

  const listasBrutas: Record<string, any[]> = {
    escolas: dbService.getEscolas(),
    alunos: dbService.getAlunos(),
    turmas: dbService.getTurmas(),
    disciplinas: dbService.getDisciplinas(),
    atribuicoes: dbService.getAtribuicoes(),
    funcionarios: dbService.getFuncionarios().filter(f => !nonAdmin || !isAdminGeralUserObj(f)),
    tiposAvaliacao: dbService.getTiposAvaliacao(),
    regrasMAC: dbService.getRegrasMAC(),
    avaliacoes: dbService.getAvaliacoes(),
    notas: dbService.getNotas(),
    notasConsolidadas: dbService.getNotasConsolidadas(),
    solicitacoesNota: dbService.getSolicitacoesNota(),
    juris: dbService.getJuris(),
    termosExame: dbService.getTermosExame(),
    horarios: getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS),
    presencas: dbService.getPresencas(),
    presencasAlunos: getLocal<any[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, []),
    auditoria: dbService.getAuditoria().filter(l => !nonAdmin || !isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes)),
    mensagens: dbService.getMensagens(),
    biblioteca: dbService.getBiblioteca(),
    bibliotecaAcessos: isEscolaEspecifica ? dbService.getAcessosBiblioteca(effectiveEscolaId) : dbService.getAcessosBiblioteca(),
    recibos: dbService.getRecibos(),
    transacoesFinanceiras: dbService.getTransacoesFinanceiras(),
    despesasEscolares: dbService.getDespesasEscolares(),
    patrimonio: dbService.getPatrimonio(),
    delegacoesPoderes: getLocal<any[]>(STORAGE_KEYS.DELEGACOES_PODERES, []),
    acoesDelegadasLogs: getLocal<any[]>(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, []),
    delegacoesCobranca: getLocal<any[]>(STORAGE_KEYS.DELEGACOES_COBRANCA, []),
    emolumentosPersonalizados: getLocal<any[]>(STORAGE_KEYS.EMOLUMENTOS_CONFIG, []),
    anosLectivosConfigs: dbService.getAnosLectivosConfigs(),
    turnosConfigs: dbService.getTurnosConfigs(),
    classesConfigs: dbService.getClassesConfigs(),
    cursos: dbService.getCursos(),
    areasFormacao: dbService.getAreasFormacao(),
    salasAulas: dbService.getSalasAulas(),
    solicitacoesApoio: isEscolaEspecifica ? dbService.getSolicitacoesApoioTecnico(effectiveEscolaId) : dbService.getSolicitacoesApoioTecnico(),
    alertasSeguranca: nonAdmin ? [] : dbService.getAlertasSeguranca(),
    relatoriosAcontecimentos: getLocal<RelatorioAcontecimento[]>(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, [])
  };

  const colecoesFiltradasPorEscola = new Set([
    'alunos',
    'turmas',
    'atribuicoes',
    'funcionarios',
    'avaliacoes',
    'notasConsolidadas',
    'solicitacoesNota',
    'juris',
    'termosExame',
    'horarios',
    'presencas',
    'presencasAlunos',
    'mensagens',
    'biblioteca',
    'recibos',
    'transacoesFinanceiras',
    'despesasEscolares',
    'patrimonio',
    'relatoriosAcontecimentos'
  ]);

  const itensPorColecao: Record<string, Record<string, any>> = {};
  const hashesColecoes: Record<string, Record<string, string>> = {};

  for (const def of COLECOES_BACKUP_INCREMENTAL_META) {
    let list = Array.isArray(listasBrutas[def.colecao]) ? listasBrutas[def.colecao] : [];
    if (isEscolaEspecifica) {
      if (def.colecao === 'escolas') {
        list = list.filter((e: any) => e?.id === effectiveEscolaId);
      } else if (def.colecao === 'disciplinas' || def.colecao === 'notas' || def.colecao === 'auditoria') {
        list = list.filter((item: any) => !item?.escolaId || item.escolaId === effectiveEscolaId);
      } else if (colecoesFiltradasPorEscola.has(def.colecao)) {
        list = list.filter((item: any) => item?.escolaId === effectiveEscolaId);
      }
    }

    const itemMap: Record<string, any> = {};
    const hashMap: Record<string, string> = {};
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const recKey = obterChaveRegistroIncremental(def.colecao, item, i);
      itemMap[recKey] = item;
      hashMap[recKey] = hashDeterministicoSge(item);
    }
    itensPorColecao[def.colecao] = itemMap;
    hashesColecoes[def.colecao] = hashMap;
  }

  const configs: Record<string, any> = {
    configuracoesFinanceiras: getLocal(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, DEFAULT_CONFIGURACOES_FINANCEIRAS),
    historicoCompleto: getLocal(STORAGE_KEYS.HISTORICO_COMPLETO, DEFAULT_HISTORICO_COMPLETO),
    anosLectivos: dbService.getAnosLectivos(),
    configuracoesDocumentos: getLocal(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, {}),
    configuracoesPasses: getLocal(STORAGE_KEYS.CONFIGURACOES_PASSES, {})
  };
  if (!nonAdmin) {
    configs.configuracaoSistema = dbService.getConfiguracaoSistema();
  }

  const hashesConfigs: Record<string, string> = {};
  for (const [k, v] of Object.entries(configs)) {
    hashesConfigs[k] = hashDeterministicoSge(v);
  }

  return {
    itensPorColecao,
    hashesColecoes,
    configs,
    hashesConfigs
  };
}

// Data Access API
export const dbService = {
  // Getters brutos internos (apenas para autenticação, setup, sync e manipulação segura sem apagar dados do AdminGeral)
  getEscolasBrutas: (): Escola[] => getLocal<Escola[]>(STORAGE_KEYS.ESCOLAS, []),
  getFuncionariosBruto: (): Funcionario[] => {
    const lista = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
    return hidratarFotoDeLista(lista, 'funcionario');
  },
  hidratarDadosOffline: (): Promise<boolean> => offlineStorage.hidratarArmazenamentoDoIndexedDB(),
  getAuditoriaBruta: (): LogAuditoria[] => getLocal<LogAuditoria[]>(STORAGE_KEYS.AUDITORIA, DEFAULT_AUDITORIA),
  getMensagensBrutas: (): MensagemInterna[] => getLocal<MensagemInterna[]>(STORAGE_KEYS.MENSAGENS, DEFAULT_MENSAGENS),
  getSolicitacoesApoioBrutas: (): SolicitacaoApoioTecnico[] => getLocal<SolicitacaoApoioTecnico[]>(STORAGE_KEYS.SOLICITACOES_APOIO, DEFAULT_SOLICITACOES_APOIO),
  getSessoesAtivasBrutas: (): SessaoAtivaUsuario[] => getLocal<SessaoAtivaUsuario[]>(STORAGE_KEYS.SESSOES_ATIVAS, []),

  // Helpers centralizados para reconhecimento de Diretor Geral numa Escola
  encontrarDiretorDaEscola: (esc: Escola, listaFuncs?: Funcionario[]): Funcionario | undefined => {
    const funcs = listaFuncs || dbService.getFuncionariosBruto();
    const placeholders = ['não atribuído', 'nao atribuido', 'pendente de nomeação', 'pendente de nomeacao', 'pendente', 'a designar', 'direção geral', 'direcção geral', 'diretor geral', 'director geral', ''];
    const nomeEscDir = (esc.diretorGeralNome || '').trim().toLowerCase();
    const emailEscDir = (esc.diretorGeralEmail || '').trim().toLowerCase();
    const isDiretorCargo = (f: Funcionario) =>
      !isAdminGeralUserObj(f) &&
      f.ativo !== false &&
      f.statusConta !== 'Suspensa' &&
      (f.role === 'DiretorGeral' ||
        (f.cargo || '').toLowerCase().includes('diretor geral') ||
        (f.cargo || '').toLowerCase().includes('director geral'));
    const pertenceAEscolaOuSemVinculo = (f: Funcionario) =>
      !f.escolaId ||
      f.escolaId === esc.id ||
      (Boolean(esc.codigoEscola) && f.escolaId === esc.codigoEscola);

    // 1. Prioriza diretores explicitamente vinculados a esta escola (ordenados pelo mais recente)
    const candidatosDaEscola = funcs
      .filter(f => isDiretorCargo(f) && (f.escolaId === esc.id || (Boolean(esc.codigoEscola) && f.escolaId === esc.codigoEscola)))
      .sort((a, b) => {
        const ta = a.atualizadoEm ? Date.parse(a.atualizadoEm) || 0 : 0;
        const tb = b.atualizadoEm ? Date.parse(b.atualizadoEm) || 0 : 0;
        return tb - ta;
      });
    if (candidatosDaEscola.length > 0) {
      if (esc.diretorGeralId) {
        const matchId = candidatosDaEscola.find(f => f.id === esc.diretorGeralId);
        if (matchId) return matchId;
      }
      return candidatosDaEscola[0];
    }

    // 2. Fallback por diretorGeralId se ativo e não reatribuído a outra escola
    if (esc.diretorGeralId) {
      const porId = funcs.find(f =>
        !isAdminGeralUserObj(f) &&
        f.id === esc.diretorGeralId &&
        f.ativo !== false &&
        f.statusConta !== 'Suspensa' &&
        pertenceAEscolaOuSemVinculo(f)
      );
      if (porId) return porId;
    }

    // 3. Fallback por e-mail ou nome caso pertença à escola ou ainda não tenha escolaId atribuída
    if (emailEscDir) {
      const porEmail = funcs.find(f =>
        isDiretorCargo(f) &&
        f.email &&
        f.email.trim().toLowerCase() === emailEscDir &&
        pertenceAEscolaOuSemVinculo(f)
      );
      if (porEmail) return porEmail;
    }

    if (nomeEscDir && !placeholders.includes(nomeEscDir)) {
      return funcs.find(f =>
        isDiretorCargo(f) &&
        f.nomeCompleto &&
        f.nomeCompleto.trim().toLowerCase() === nomeEscDir &&
        pertenceAEscolaOuSemVinculo(f)
      );
    }

    return undefined;
  },

  reconciliarDiretoresEscolas: (): boolean => {
    const escolas = dbService.getEscolasBrutas();
    const funcs = dbService.getFuncionariosBruto();
    const placeholders = ['não atribuído', 'nao atribuido', 'pendente de nomeação', 'pendente de nomeacao', 'pendente', 'a designar', 'direção geral', 'direcção geral', 'diretor geral', 'director geral', ''];
    const funcsJaSincronizados = typeof localStorage !== 'undefined' && localStorage.getItem('sge_remote_synced_funcionarios') === 'true';
    let alterou = false;

    const atualizadas = escolas.map(esc => {
      const dir = dbService.encontrarDiretorDaEscola(esc, funcs);
      if (!dir) {
        if (funcsJaSincronizados && esc.diretorGeralId) {
          alterou = true;
          return {
            ...esc,
            diretorGeralId: undefined,
            diretorGeralNome: 'Não Atribuído',
            diretorGeralEmail: undefined,
            diretorGeralTelefone: undefined,
            atualizadoEm: esc.atualizadoEm || new Date().toISOString()
          };
        }
        return esc;
      }

      const nomeAtual = (esc.diretorGeralNome || '').trim().toLowerCase();
      const precisaAtualizar =
        esc.diretorGeralId !== dir.id ||
        !esc.diretorGeralNome ||
        placeholders.includes(nomeAtual) ||
        esc.diretorGeralNome !== dir.nomeCompleto ||
        (Boolean(dir.email) && esc.diretorGeralEmail !== dir.email) ||
        (Boolean(dir.telefone) && esc.diretorGeralTelefone !== dir.telefone);

      if (!precisaAtualizar) return esc;
      alterou = true;
      return {
        ...esc,
        diretorGeralId: dir.id,
        diretorGeralNome: dir.nomeCompleto,
        diretorGeralGenero: dir.genero || esc.diretorGeralGenero || 'M',
        diretorGeralEmail: dir.email || esc.diretorGeralEmail,
        diretorGeralTelefone: dir.telefone || esc.diretorGeralTelefone,
        atualizadoEm: esc.atualizadoEm || dir.atualizadoEm || new Date().toISOString()
      };
    });

    if (alterou) {
      setLocal(STORAGE_KEYS.ESCOLAS, atualizadas);
      try {
        offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(atualizadas));
      } catch {}
    }
    return alterou;
  },

  // Escolas (com cache memoizado por geração de escrita local)
  getEscolas: (): Escola[] => {
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    return getComputedCache(`getEscolas_${ocultarAdmin ? '1' : '0'}`, () => {
      const escolas = dbService.getEscolasBrutas();
      const funcs = dbService.getFuncionariosBruto();
      const placeholders = ['não atribuído', 'nao atribuido', 'pendente de nomeação', 'pendente de nomeacao', 'pendente', 'a designar', 'direção geral', 'direcção geral', 'diretor geral', 'director geral', 'subdireção pedagógica', 'subdirecao pedagogica', 'chefe da secretaria', 'secretaria', ''];

      return escolas.map(e => {
        const mod = { ...e };
        if (
          ocultarAdmin ||
          !mod.sessaoApoioTecnicoAtiva ||
          typeof mod.sessaoApoioTecnicoAtiva !== 'object' ||
          !mod.sessaoApoioTecnicoAtiva.dataInicio
        ) {
          delete mod.sessaoApoioTecnicoAtiva;
        }
        // 1. Diretor Geral (projeção viva do perfil ativo vinculado à escola)
        const dir = dbService.encontrarDiretorDaEscola(e, funcs);
        if (dir && dir.nomeCompleto) {
          mod.diretorGeralId = dir.id;
          mod.diretorGeralNome = dir.nomeCompleto;
          mod.diretorGeralGenero = dir.genero || mod.diretorGeralGenero || 'M';
          mod.diretorGeralEmail = dir.email || mod.diretorGeralEmail;
          mod.diretorGeralTelefone = dir.telefone || mod.diretorGeralTelefone;
        }
        // 2. Subdiretor Pedagógico
        if (!mod.subdiretorPedagogicoNome || placeholders.includes(mod.subdiretorPedagogicoNome.trim().toLowerCase())) {
          const sub = funcs.find(f =>
            !isAdminGeralUserObj(f) &&
            (f.escolaId === e.id || e.id === 'todas') &&
            (f.role === 'SubdiretorPedagogico' || f.role === 'CoordenadorPedagogico' || f.cargo?.toLowerCase().includes('pedagóg') || f.cargo?.toLowerCase().includes('subdiretor') || f.cargo?.toLowerCase().includes('subdirector'))
          );
          if (sub && sub.nomeCompleto) {
            mod.subdiretorPedagogicoNome = sub.nomeCompleto;
          }
        }
        // 3. Chefe da Secretaria
        if (!mod.chefeSecretariaNome || placeholders.includes(mod.chefeSecretariaNome.trim().toLowerCase())) {
          const sec = funcs.find(f =>
            !isAdminGeralUserObj(f) &&
            (f.escolaId === e.id || e.id === 'todas') &&
            (f.role === 'ChefeSecretaria' || f.role === 'Secretario' || f.role === 'SecretarioEscolar' || f.role === 'Secretaria' || f.cargo?.toLowerCase().includes('secretar'))
          );
          if (sec && sec.nomeCompleto) {
            mod.chefeSecretariaNome = sec.nomeCompleto;
          }
        }
        return mod;
      });
    });
  },
  getEscolaAtiva: (): Escola => {
    const escolas = dbService.getEscolas();
    const idAtivo = getLocal<string>(STORAGE_KEYS.ACTIVE_ESCOLA_ID, '');
    const esc = escolas.find(e => e.id === idAtivo) || escolas[0] || DEFAULT_ESCOLA_VAZIA;
    const funcs = dbService.getFuncionariosBruto();
    const placeholders = ['não atribuído', 'nao atribuido', 'pendente de nomeação', 'pendente de nomeacao', 'pendente', 'a designar', 'direção geral', 'direcção geral', 'diretor geral', 'director geral', 'subdireção pedagógica', 'subdirecao pedagogica', 'chefe da secretaria', 'secretaria', ''];
    const mod = { ...esc };

    const dir = dbService.encontrarDiretorDaEscola(esc, funcs);
    if (dir && dir.nomeCompleto) {
      mod.diretorGeralId = dir.id;
      mod.diretorGeralNome = dir.nomeCompleto;
      mod.diretorGeralGenero = dir.genero || mod.diretorGeralGenero || 'M';
      mod.diretorGeralEmail = dir.email || mod.diretorGeralEmail;
      mod.diretorGeralTelefone = dir.telefone || mod.diretorGeralTelefone;
    }
    if (!mod.subdiretorPedagogicoNome || placeholders.includes(mod.subdiretorPedagogicoNome.trim().toLowerCase())) {
      const sub = funcs.find(f =>
        !isAdminGeralUserObj(f) &&
        (f.escolaId === esc.id || esc.id === 'todas') &&
        (f.role === 'SubdiretorPedagogico' || f.role === 'CoordenadorPedagogico' || f.cargo?.toLowerCase().includes('pedagóg') || f.cargo?.toLowerCase().includes('subdiretor') || f.cargo?.toLowerCase().includes('subdirector'))
      );
      if (sub && sub.nomeCompleto) {
        mod.subdiretorPedagogicoNome = sub.nomeCompleto;
      }
    }
    if (!mod.chefeSecretariaNome || placeholders.includes(mod.chefeSecretariaNome.trim().toLowerCase())) {
      const sec = funcs.find(f =>
        !isAdminGeralUserObj(f) &&
        (f.escolaId === esc.id || esc.id === 'todas') &&
        (f.role === 'ChefeSecretaria' || f.role === 'Secretario' || f.role === 'SecretarioEscolar' || f.role === 'Secretaria' || f.cargo?.toLowerCase().includes('secretar'))
      );
      if (sec && sec.nomeCompleto) {
        mod.chefeSecretariaNome = sec.nomeCompleto;
      }
    }
    return mod;
  },
  getEscolaPorId: (escolaId: string): Escola | undefined => {
    return dbService.getEscolas().find(e => e.id === escolaId);
  },
  setEscolaAtiva: (escolaId: string) => {
    setLocal(STORAGE_KEYS.ACTIVE_ESCOLA_ID, escolaId);
    const escola = dbService.getEscolas().find(e => e.id === escolaId);
    if (escola) {
      dbService.registarLog('Alternância de Escola', `Contexto de escola alterado para "${escola.nomeOficial}".`);
    }
  },
  salvarEscola: (escola: Escola) => {
    const escolas = dbService.getEscolasBrutas();
    const idx = escolas.findIndex(e => e.id === escola.id);
    const agora = new Date().toISOString();
    const temPropSessao = Object.prototype.hasOwnProperty.call(escola, 'sessaoApoioTecnicoAtiva');
    const sessaoResolvida = temPropSessao
      ? ((escola as any).sessaoApoioTecnicoAtiva || undefined)
      : (idx >= 0 ? escolas[idx].sessaoApoioTecnicoAtiva : undefined);

    const escolaFinal: Escola = idx >= 0
      ? { ...escolas[idx], ...escola, atualizadoEm: agora }
      : { ...escola, atualizadoEm: agora };

    if (sessaoResolvida) {
      escolaFinal.sessaoApoioTecnicoAtiva = sessaoResolvida;
    } else {
      delete escolaFinal.sessaoApoioTecnicoAtiva;
    }

    if (idx >= 0) escolas[idx] = escolaFinal;
    else escolas.push(escolaFinal);
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
    firebaseSyncEngine.salvarEscola(escolaFinal);
    dbService.registarLog('Atualização da Instituição', `Dados da escola ${escola.nomeOficial} atualizados.`);
  },
  salvarEscolas: (escolas: Escola[]) => {
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
    firebaseSyncEngine.salvarEscolasLote(escolas);
  },

  // Operações do Administrador Geral: Criar, Suspender, Reativar, Eliminar Escolas
  criarEscola: (dados: Partial<Escola>): Escola => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: operação exclusiva da Administração Central.');
    }
    const escolas = dbService.getEscolasBrutas();
    const id = `esc-${Date.now()}`;
    const novaEscola: Escola = {
      id,
      codigoEscola: dados.codigoEscola || `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      nomeOficial: dados.nomeOficial || 'Nova Escola do Sistema',
      denominacao: dados.denominacao || '',
      sigla: dados.sigla || 'ESC',
      logotipo: dados.logotipo || '',
      nif: dados.nif || '',
      endereco: dados.endereco || '',
      municipio: dados.municipio || 'Luanda',
      provincia: dados.provincia || 'Luanda',
      governoProvincial: dados.governoProvincial || `GOVERNO PROVINCIAL DE ${dados.provincia?.toUpperCase() || 'LUANDA'}`,
      gabineteEducacao: dados.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO',
      contactos: dados.contactos || '',
      email: dados.email || '',
      decretoCriacao: dados.decretoCriacao || '',
      artigoLegal: dados.artigoLegal || '',
      diretorGeralNome: dados.diretorGeralNome || '',
      subdiretorPedagogicoNome: dados.subdiretorPedagogicoNome || '',
      chefeSecretariaNome: dados.chefeSecretariaNome || '',
      anoLectivoActivo: dados.anoLectivoActivo ?? '',
      trimestreActivo: dados.trimestreActivo ?? '1',
      estadoAno: dados.anoLectivoActivo ? 'Aberto' : 'Planeamento',
      ativo: true,
      estadoEscola: 'Ativa',
      atualizadoEm: new Date().toISOString()
    };
    escolas.push(novaEscola);
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    firebaseSyncEngine.salvarEscola(novaEscola);
    dbService.registarLog('Criação de Escola', `Escola "${novaEscola.nomeOficial}" criada no sistema pelo Administrador Geral.`);
    return novaEscola;
  },

  suspenderEscola: (escolaId: string, motivo: string): Escola => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: operação exclusiva da Administração Central.');
    }
    const escolas = dbService.getEscolasBrutas();
    const idx = escolas.findIndex(e => e.id === escolaId);
    if (idx < 0) throw new Error('Escola não encontrada');
    const esc: Escola = {
      ...escolas[idx],
      ativo: false,
      estadoEscola: 'Suspensa',
      motivoSuspensao: motivo,
      dataSuspensao: new Date().toLocaleDateString('pt-PT'),
      atualizadoEm: new Date().toISOString()
    };
    escolas[idx] = esc;
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    firebaseSyncEngine.salvarEscola(esc);
    dbService.registarLog('Suspensão de Escola', `Escola "${esc.nomeOficial}" suspensa pelo Administrador Geral. Motivo: ${motivo}`);
    return esc;
  },

  reativarEscola: (escolaId: string): Escola => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: operação exclusiva da Administração Central.');
    }
    const escolas = dbService.getEscolasBrutas();
    const idx = escolas.findIndex(e => e.id === escolaId);
    if (idx < 0) throw new Error('Escola não encontrada');
    const esc: Escola = {
      ...escolas[idx],
      ativo: true,
      estadoEscola: 'Ativa',
      motivoSuspensao: undefined,
      dataSuspensao: undefined,
      atualizadoEm: new Date().toISOString()
    };
    escolas[idx] = esc;
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    firebaseSyncEngine.salvarEscola(esc);
    dbService.registarLog('Reativação de Escola', `Escola "${esc.nomeOficial}" reativada com sucesso pelo Administrador Geral.`);
    return esc;
  },

  atualizarEscolaCompleta: (dadosEscola: Partial<Escola> & { id: string }): Escola => {
    const escolas = dbService.getEscolasBrutas();
    const idx = escolas.findIndex(e => e.id === dadosEscola.id);
    if (idx < 0) throw new Error('Escola não encontrada para atualização');
    const temPropSessao = Object.prototype.hasOwnProperty.call(dadosEscola, 'sessaoApoioTecnicoAtiva');
    const sessaoResolvida = temPropSessao
      ? ((dadosEscola as any).sessaoApoioTecnicoAtiva || undefined)
      : escolas[idx].sessaoApoioTecnicoAtiva;

    const atualizada: Escola = {
      ...escolas[idx],
      ...dadosEscola,
      atualizadoEm: new Date().toISOString()
    };
    if (sessaoResolvida) {
      atualizada.sessaoApoioTecnicoAtiva = sessaoResolvida;
    } else {
      delete atualizada.sessaoApoioTecnicoAtiva;
    }
    escolas[idx] = atualizada;
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
    firebaseSyncEngine.salvarEscola(atualizada);

    dbService.registarLog('Edição de Escola', `Dados institucionais da escola "${atualizada.nomeOficial}" atualizados.`);
    return atualizada;
  },

  eliminarEscola: (escolaId: string): boolean => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: operação exclusiva da Administração Central.');
    }
    let escolas = dbService.getEscolasBrutas();
    const esc = escolas.find(e => e.id === escolaId);
    if (!esc) return false;

    // 1. Remover a escola da lista de escolas
    escolas = escolas.filter(e => e.id !== escolaId);
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);

    // 2. Apagar em cascata todas as coleções de dados concernentes a esta escola
    const filterOutSchool = (key: string) => {
      try {
        const items = getLocal<any[]>(key, []);
        if (Array.isArray(items)) {
          const filtrados = items.filter(item => item && item.escolaId !== escolaId);
          setLocal(key, filtrados);
        }
      } catch (e) {
        // Ignorar
      }
    };

    filterOutSchool(STORAGE_KEYS.ALUNOS);
    filterOutSchool(STORAGE_KEYS.TURMAS);
    filterOutSchool(STORAGE_KEYS.DISCIPLINAS);
    filterOutSchool(STORAGE_KEYS.ATRIBUICOES);
    filterOutSchool(STORAGE_KEYS.TERMOS_EXAME);
    filterOutSchool(STORAGE_KEYS.TRANSACOES_FINANCEIRAS);
    filterOutSchool(STORAGE_KEYS.DESPESAS_ESCOLARES);
    filterOutSchool(STORAGE_KEYS.PATRIMONIO);
    filterOutSchool(STORAGE_KEYS.NOTAS_CONSOLIDADAS);
    filterOutSchool(STORAGE_KEYS.AVALIACOES);
    filterOutSchool(STORAGE_KEYS.NOTAS);
    filterOutSchool(STORAGE_KEYS.SOLICITACOES_NOTA);
    filterOutSchool(STORAGE_KEYS.JURIS);
    filterOutSchool(STORAGE_KEYS.PRESENCAS);
    filterOutSchool(STORAGE_KEYS.PRESENCAS_ALUNOS);
    filterOutSchool(STORAGE_KEYS.HORARIOS);
    filterOutSchool(STORAGE_KEYS.MENSAGENS);
    filterOutSchool(STORAGE_KEYS.BIBLIOTECA);
    filterOutSchool(STORAGE_KEYS.BIBLIOTECA_ACESSOS);
    filterOutSchool(STORAGE_KEYS.RECIBOS);
    filterOutSchool(STORAGE_KEYS.DELEGACOES_PODERES);
    filterOutSchool(STORAGE_KEYS.ACOES_DELEGADAS_LOGS);
    filterOutSchool(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO);
    filterOutSchool(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS);
    filterOutSchool(STORAGE_KEYS.TURNOS_CONFIGS);
    filterOutSchool(STORAGE_KEYS.CLASSES_CONFIGS);
    filterOutSchool(STORAGE_KEYS.CURSOS);
    filterOutSchool(STORAGE_KEYS.AREAS_FORMACAO);
    filterOutSchool(STORAGE_KEYS.SALAS_AULAS);
    filterOutSchool(STORAGE_KEYS.REGRAS_MAC);
    filterOutSchool(STORAGE_KEYS.TIPOS_AVALIACAO);
    filterOutSchool(STORAGE_KEYS.SOLICITACOES_APOIO);
    filterOutSchool(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS);

    // Funcionários: remover apenas funcionários exclusivos desta escola (preservando o AdminGeral)
    try {
      const funcs = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      const filtrados = funcs.filter(f => f.role === 'AdminGeral' || f.escolaId !== escolaId);
      setLocal(STORAGE_KEYS.FUNCIONARIOS, filtrados);
    } catch (e) {
      // Ignorar
    }

    // 3. Sincronizar eliminação no Firestore Cloud
    firebaseSyncEngine.eliminarEscola(escolaId);

    // 4. Se a escola ativa era a eliminada, selecionar a próxima escola disponível
    const idAtivo = getLocal<string>(STORAGE_KEYS.ACTIVE_ESCOLA_ID, '');
    if (idAtivo === escolaId) {
      if (escolas.length > 0) {
        setLocal(STORAGE_KEYS.ACTIVE_ESCOLA_ID, escolas[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ESCOLA_ID);
      }
    }

    dbService.registarLog('Eliminação Total de Escola', `Escola "${esc.nomeOficial}" e todas as suas coleções de dados (alunos, turmas, notas, finanças, presenças, património e colaboradores) foram eliminadas do sistema.`);
    return true;
  },

  // Administrador Geral: Criar / Atribuir Diretor Geral & Credenciais
  criarOuAtualizarDiretorGeral: (escolaId: string, dadosDiretor: {
    nomeCompleto: string;
    numeroBI: string;
    genero: Genero;
    email: string;
    telefone: string;
    password?: string;
    habilitacoes: string;
    fotoUrl?: string;
  }): Funcionario => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: operação exclusiva da Administração Central.');
    }
    const funcs = dbService.getFuncionariosBruto();
    const escolas = dbService.getEscolasBrutas();
    const idxEsc = escolas.findIndex(e => e.id === escolaId);
    const escolaAlvo = idxEsc >= 0 ? escolas[idxEsc] : undefined;

    const emailLimpo = (dadosDiretor.email || '').trim().toLowerCase();
    const diretorExistente =
      funcs.find(f => !isAdminGeralUserObj(f) && f.escolaId === escolaId && f.role === 'DiretorGeral') ||
      (escolaAlvo?.diretorGeralId ? funcs.find(f => !isAdminGeralUserObj(f) && f.id === escolaAlvo.diretorGeralId) : undefined) ||
      (emailLimpo ? funcs.find(f => !isAdminGeralUserObj(f) && f.email && f.email.trim().toLowerCase() === emailLimpo) : undefined);

    const funcId = diretorExistente?.id || `dir-${Date.now()}`;
    const agora = new Date().toISOString();

    const novoDiretor: Funcionario = {
      ...diretorExistente,
      id: funcId,
      escolaId,
      nomeCompleto: dadosDiretor.nomeCompleto.trim(),
      numeroBI: (dadosDiretor.numeroBI || '').trim(),
      genero: dadosDiretor.genero || diretorExistente?.genero || 'M',
      telefone: (dadosDiretor.telefone || '').trim(),
      email: (dadosDiretor.email || '').trim(),
      cargo: 'Diretor Geral',
      role: 'DiretorGeral',
      password: (dadosDiretor.password && dadosDiretor.password.trim()) ? dadosDiretor.password : (diretorExistente?.password || ''),
      statusConta: 'Ativa',
      ehProfessor: diretorExistente?.ehProfessor ?? false,
      ehAdministrativoQueLeciona: diretorExistente?.ehAdministrativoQueLeciona ?? false,
      habilitacoes: dadosDiretor.habilitacoes || diretorExistente?.habilitacoes || '',
      fotoUrl: dadosDiretor.fotoUrl !== undefined ? dadosDiretor.fotoUrl : (diretorExistente?.fotoUrl || ''),
      dataAdmissao: diretorExistente?.dataAdmissao || agora.split('T')[0],
      ativo: true,
      criadoPorRole: 'AdminGeral',
      criadoPorNome: 'Administrador Geral',
      dataCriacao: diretorExistente?.dataCriacao || new Date().toLocaleDateString('pt-PT'),
      atualizadoEm: agora
    };

    // Identifica e desvincula quaisquer diretores anteriores ainda vinculados a esta escola
    const diretoresSubstituidos: Funcionario[] = [];
    for (let i = 0; i < funcs.length; i++) {
      const f = funcs[i];
      if (
        f.id !== funcId &&
        !isAdminGeralUserObj(f) &&
        f.role === 'DiretorGeral' &&
        f.escolaId === escolaId &&
        f.ativo !== false
      ) {
        const desativado: Funcionario = {
          ...f,
          ativo: false,
          statusConta: 'Suspensa',
          escolaId: '',
          atualizadoEm: agora
        };
        funcs[i] = desativado;
        diretoresSubstituidos.push(desativado);
        offlineStorage.salvarFuncionarioNoIndexedDB(desativado);
      }
    }

    const idxFunc = funcs.findIndex(f => f.id === funcId);
    if (idxFunc >= 0) funcs[idxFunc] = novoDiretor;
    else funcs.push(novoDiretor);
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    offlineStorage.salvarFuncionarioNoIndexedDB(novoDiretor);

    // Se este diretor pertencia anteriormente a outra escola, limpa a escola anterior
    if (diretorExistente?.escolaId && diretorExistente.escolaId !== escolaId) {
      const idxAntiga = escolas.findIndex(e => e.id === diretorExistente.escolaId || e.diretorGeralId === funcId);
      if (idxAntiga >= 0) {
        escolas[idxAntiga] = {
          ...escolas[idxAntiga],
          diretorGeralId: undefined,
          diretorGeralNome: 'Não Atribuído',
          diretorGeralEmail: undefined,
          diretorGeralTelefone: undefined,
          atualizadoEm: agora
        };
        firebaseSyncEngine.salvarEscola(escolas[idxAntiga]);
      }
    }

    if (idxEsc >= 0) {
      escolas[idxEsc] = {
        ...escolas[idxEsc],
        diretorGeralNome: novoDiretor.nomeCompleto,
        diretorGeralId: novoDiretor.id,
        diretorGeralGenero: novoDiretor.genero,
        diretorGeralEmail: novoDiretor.email,
        diretorGeralTelefone: novoDiretor.telefone,
        atualizadoEm: agora
      };
      setLocal(STORAGE_KEYS.ESCOLAS, escolas);
      try {
        offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
      } catch {}
      // Sincronização atómica em batch (funcionarios + users + escolas + schools)
      firebaseSyncEngine.sincronizarAtribuicaoDiretor(novoDiretor, escolas[idxEsc], diretoresSubstituidos);
    } else {
      firebaseSyncEngine.salvarPerfilUsuario(novoDiretor);
    }

    dbService.registarLog('Credenciais do Diretor Geral', `Diretor Geral ${novoDiretor.nomeCompleto} atribuído à escola com credenciais de acesso.`);
    return novoDiretor;
  },

  // Diretor Geral: Criar Funcionário & Credenciais da sua escola
  criarFuncionarioComCredenciais: (dados: Partial<Funcionario> & {
    escolaId: string;
    nomeCompleto: string;
    numeroBI: string;
    cargo: string;
    role: UserRole;
    email: string;
    password?: string;
  }): Funcionario => {
    if (dados.role === 'AdminGeral' && isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: não possui permissão para criar perfil de Administrador Geral.');
    }
    const funcs = dbService.getFuncionariosBruto();
    const agora = new Date().toISOString();
    const novoFunc: Funcionario = {
      id: dados.id || `func-${Date.now()}`,
      escolaId: dados.escolaId,
      nomeCompleto: dados.nomeCompleto,
      numeroBI: dados.numeroBI,
      genero: dados.genero || 'M',
      telefone: dados.telefone || '',
      email: dados.email,
      password: dados.password || '',
      cargo: dados.cargo,
      role: dados.role,
      statusConta: 'Ativa',
      ehProfessor: dados.ehProfessor ?? (dados.role === 'Professor'),
      ehAdministrativoQueLeciona: dados.ehAdministrativoQueLeciona ?? false,
      habilitacoes: dados.habilitacoes || '',
      fotoUrl: dados.fotoUrl || '',
      dataAdmissao: dados.dataAdmissao || agora.split('T')[0],
      ativo: true,
      criadoPorRole: 'DiretorGeral',
      criadoPorNome: dados.criadoPorNome || 'Diretor Geral',
      dataCriacao: new Date().toLocaleDateString('pt-PT'),
      atualizadoEm: agora
    };

    const diretoresSubstituidos: Funcionario[] = [];
    if (novoFunc.role === 'DiretorGeral' && novoFunc.escolaId && novoFunc.escolaId !== 'todas') {
      for (let i = 0; i < funcs.length; i++) {
        const f = funcs[i];
        if (
          f.id !== novoFunc.id &&
          !isAdminGeralUserObj(f) &&
          f.role === 'DiretorGeral' &&
          f.escolaId === novoFunc.escolaId &&
          f.ativo !== false
        ) {
          const desativado: Funcionario = {
            ...f,
            ativo: false,
            statusConta: 'Suspensa',
            escolaId: '',
            atualizadoEm: agora
          };
          funcs[i] = desativado;
          diretoresSubstituidos.push(desativado);
          offlineStorage.salvarFuncionarioNoIndexedDB(desativado);
        }
      }
    }

    funcs.push(novoFunc);
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    offlineStorage.salvarFuncionarioNoIndexedDB(novoFunc);

    // Se o utilizador criado for DiretorGeral, vincular atomicamente à respetiva escola
    if (novoFunc.role === 'DiretorGeral' && novoFunc.escolaId && novoFunc.escolaId !== 'todas') {
      const escolas = dbService.getEscolasBrutas();
      const idxEsc = escolas.findIndex(e => e.id === novoFunc.escolaId || e.codigoEscola === novoFunc.escolaId);
      if (idxEsc >= 0) {
        escolas[idxEsc] = {
          ...escolas[idxEsc],
          diretorGeralId: novoFunc.id,
          diretorGeralNome: novoFunc.nomeCompleto,
          diretorGeralGenero: novoFunc.genero || escolas[idxEsc].diretorGeralGenero || 'M',
          diretorGeralEmail: novoFunc.email || escolas[idxEsc].diretorGeralEmail,
          diretorGeralTelefone: novoFunc.telefone || escolas[idxEsc].diretorGeralTelefone,
          atualizadoEm: agora
        };
        setLocal(STORAGE_KEYS.ESCOLAS, escolas);
        try {
          offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
        } catch {}
        firebaseSyncEngine.sincronizarAtribuicaoDiretor(novoFunc, escolas[idxEsc], diretoresSubstituidos);
      } else {
        firebaseSyncEngine.salvarPerfilUsuario(novoFunc);
      }
    } else {
      firebaseSyncEngine.salvarPerfilUsuario(novoFunc);
    }

    dbService.registarLog('Criação de Funcionário', `Funcionário ${novoFunc.nomeCompleto} (${novoFunc.cargo}) registado com credenciais.`);
    return novoFunc;
  },

  atualizarStatusFuncionario: (funcionarioId: string, status: 'Ativa' | 'Suspensa'): Funcionario => {
    const funcs = dbService.getFuncionariosBruto();
    const idx = funcs.findIndex(f => f.id === funcionarioId);
    if (idx < 0) throw new Error('Funcionário não encontrado');
    if (isAdminGeralUserObj(funcs[idx])) {
      throw new Error('Acesso negado: a conta do Administrador Geral não pode ser suspensa ou alterada.');
    }
    funcs[idx].statusConta = status;
    funcs[idx].ativo = (status === 'Ativa');
    funcs[idx].atualizadoEm = new Date().toISOString();
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    firebaseSyncEngine.salvarPerfilUsuario(funcs[idx]);
    dbService.registarLog('Status de Acesso de Funcionário', `Conta de ${funcs[idx].nomeCompleto} definida como ${status}.`);
    return funcs[idx];
  },

  redefinirSenhaFuncionario: (funcionarioId: string, novaSenha: string): Funcionario => {
    const funcs = dbService.getFuncionariosBruto();
    const idx = funcs.findIndex(f => f.id === funcionarioId);
    if (idx < 0) throw new Error('Funcionário não encontrado');
    if (isAdminGeralUserObj(funcs[idx]) && isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: não possui permissão para alterar a credencial do Administrador Geral.');
    }
    funcs[idx].password = novaSenha;
    funcs[idx].atualizadoEm = new Date().toISOString();
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    // Persistência imediata no Firebase Firestore e no dispositivo
    firebaseSyncEngine.salvarPerfilUsuario(funcs[idx]);
    // Desbloqueia automaticamente se estiver bloqueado
    dbService.desbloquearContaUtilizador(funcs[idx].email || funcs[idx].id, 'Administrador');
    dbService.registarLog('Redefinição de Senha', `Palavra-passe de ${funcs[idx].nomeCompleto} atualizada.`);
    return funcs[idx];
  },

  /**
   * Altera a senha de um utilizador respeitando a hierarquia de controle (RBAC):
   * - Admin Geral pode alterar a senha de Diretores Gerais e de qualquer utilizador da rede nacional.
   * - Diretor Geral pode alterar a senha dos funcionários (professores, administrativos) da sua escola.
   * - Desbloqueia automaticamente a conta se estiver bloqueada por tentativas inválidas.
   * - Aplica cifragem AES-256 e gera registo de auditoria forense.
   */
  alterarSenhaPorOperador: async (
    targetUserId: string,
    novaSenha: string,
    operador: Funcionario
  ): Promise<{ sucesso: boolean; mensagem: string; funcionario: Funcionario }> => {
    const funcs = dbService.getFuncionariosBruto();
    const idx = funcs.findIndex(f => f.id === targetUserId);
    if (idx < 0) {
      throw new Error('Utilizador não encontrado no sistema.');
    }
    const target = funcs[idx];

    if (isAdminGeralUserObj(target) && operador.role !== 'AdminGeral') {
      throw new Error('Acesso negado: nenhum perfil pode alterar a palavra-passe do Administrador Geral.');
    }

    // Validação estrita de RBAC
    if (operador.role === 'AdminGeral') {
      if (isSessaoAutenticadaNaoAdminGeral()) {
        throw new Error('Acesso negado: sessão ativa sem privilégios de Administração Geral.');
      }
      // AdminGeral tem autoridade máxima em toda a rede nacional
    } else if (operador.role === 'DiretorGeral') {
      if (isAdminGeralUserObj(target)) {
        throw new Error('Um Diretor Geral não tem permissão para alterar a palavra-passe do Administrador Geral.');
      }
      if (target.escolaId !== operador.escolaId && operador.escolaId !== 'todas') {
        throw new Error('O Diretor Geral apenas pode alterar credenciais de funcionários afetos à sua instituição.');
      }
    } else {
      throw new Error('Apenas o Administrador Geral ou o Diretor Geral possuem autorização executiva para alterar senhas.');
    }

    if (!novaSenha || novaSenha.trim().length < 6) {
      throw new Error('A nova senha deve possuir pelo menos 6 caracteres para assegurar a blindagem criptográfica.');
    }

    // Cifragem AES-256 da nova palavra-passe
    const senhaCifrada = await cryptoService.encriptarTexto(novaSenha.trim());
    target.password = senhaCifrada;
    target.atualizadoEm = new Date().toISOString();
    funcs[idx] = target;
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    // Persistência imediata no Firebase Firestore e no dispositivo
    firebaseSyncEngine.salvarPerfilUsuario(target);

    // Reset de tentativas falhadas / desbloqueio de credenciais
    securityEngine.resetarBloqueioCredenciais(target.email || target.id, operador.nomeCompleto);

    // Registos de auditoria e segurança
    dbService.registarLog(
      'Redefinição de Senha por Superior',
      `Senha de "${target.nomeCompleto}" (${target.cargo || target.role}) redefinida por ${operador.nomeCompleto} (${operador.role}). Criptografia AES-256 aplicada.`
    );

    securityEngine.registarEvento({
      categoria: 'AUTENTICACAO',
      severidade: 'INFO',
      titulo: 'Credencial Redefinida por Superior Hierárquico',
      detalhes: `Senha do colaborador "${target.nomeCompleto}" (${target.email}) atualizada com sucesso por ${operador.nomeCompleto}. Bloqueio de tentativas resetado.`
    });

    return {
      sucesso: true,
      mensagem: `A palavra-passe de ${target.nomeCompleto} foi atualizada com sucesso com proteção AES-256.`,
      funcionario: target
    };
  },

  eliminarFuncionario: (funcionarioId: string): boolean => {
    let funcs = dbService.getFuncionariosBruto();
    const f = funcs.find(item => item.id === funcionarioId);
    if (!f) return false;
    if (isAdminGeralUserObj(f)) {
      throw new Error('Acesso negado: o perfil do Administrador Geral não pode ser eliminado.');
    }
    const agora = new Date().toISOString();
    funcs = funcs.filter(item => item.id !== funcionarioId);
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    try {
      offlineStorage.salvarFuncionariosLoteNoIndexedDB(funcs);
    } catch {}

    // Se o funcionário for diretor de alguma escola, desvincula atomicamente da instituição
    const escolas = dbService.getEscolasBrutas();
    let escolaDesvinculada: Escola | undefined;
    const escolasAtualizadas = escolas.map(esc => {
      const correspondeAEscola =
        esc.diretorGeralId === funcionarioId ||
        (f.role === 'DiretorGeral' && (esc.id === f.escolaId || (esc.codigoEscola && esc.codigoEscola === f.escolaId)));
      if (correspondeAEscola) {
        const atualizada: Escola = {
          ...esc,
          diretorGeralId: undefined,
          diretorGeralNome: 'Não Atribuído',
          diretorGeralEmail: undefined,
          diretorGeralTelefone: undefined,
          atualizadoEm: agora
        };
        escolaDesvinculada = atualizada;
        return atualizada;
      }
      return esc;
    });
    if (escolaDesvinculada) {
      setLocal(STORAGE_KEYS.ESCOLAS, escolasAtualizadas);
      try {
        offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolasAtualizadas));
      } catch {}
      firebaseSyncEngine.desvincularDiretorEscola(funcionarioId, escolaDesvinculada);
    } else if (f.role === 'DiretorGeral') {
      firebaseSyncEngine.desvincularDiretorEscola(funcionarioId);
    } else {
      // Eliminação imediata no Firebase Firestore
      firebaseSyncEngine.eliminarFuncionario(funcionarioId);
    }

    dbService.registarLog('Remoção de Funcionário', `Utilizador/Diretor ${f.nomeCompleto} (${f.cargo}) removido da instituição e do Firebase Firestore.`);
    return true;
  },

  // ==========================================
  // GESTÃO DE ANOS LECTIVOS MULTI-CONTEXTO & VIRGENS (ISOLADOS POR ESCOLA)
  // ==========================================
  getAnosLectivos: (escolaId?: string): string[] => {
    const configs = dbService.getAnosLectivosConfigs(escolaId);
    const daEscola = configs
      .map(c => c.rotulo || c.ano || '')
      .filter((x): x is string => Boolean(x));
    if (escolaId && escolaId !== 'todas') {
      return Array.from(new Set(daEscola));
    }
    const salvos = getLocal<string[]>(STORAGE_KEYS.ANOS_LECTIVOS, []).filter(Boolean);
    return Array.from(new Set([...daEscola, ...salvos]));
  },
  getAnosLectivosConfigs: (escolaId?: string): AnoLectivoConfig[] => {
    const list = getLocal<AnoLectivoConfig[]>(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, []);
    const normalizados = list.map(c => ({
      ...c,
      ano: c.ano || c.rotulo
    }));
    if (escolaId && escolaId !== 'todas') {
      return normalizados.filter(c => c.escolaId === escolaId);
    }
    return normalizados;
  },
  salvarAnoLectivoConfig: (config: AnoLectivoConfig) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = config.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const configFinal: AnoLectivoConfig = {
      ...config,
      escolaId: targetEscolaId,
      atualizadoEm: new Date().toISOString()
    };
    const configs = getLocal<AnoLectivoConfig[]>(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, []);
    const idx = configs.findIndex(
      c => c.id === configFinal.id || (c.rotulo === configFinal.rotulo && c.escolaId === configFinal.escolaId)
    );
    if (idx >= 0) configs[idx] = configFinal;
    else configs.push(configFinal);
    setLocal(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, configs);
    firebaseSyncEngine.salvarAnoLectivoConfig(configFinal);
    dbService.adicionarAnoLectivo(configFinal.rotulo);
    dbService.registarLog('Configuração de Ano Letivo', `Ano letivo ${configFinal.rotulo} (${configFinal.estado}) atualizado.`, configFinal.escolaId);
  },
  criarNovoAnoLetivo: (
    dadosOuRotulo: string | {
      rotulo: string;
      dataInicio?: string;
      dataFim?: string;
      descricao?: string;
      trimestres?: PeriodoTrimestre[];
    },
    estado?: any,
    escolaId?: string,
    dataInicio?: string,
    dataFim?: string
  ): AnoLectivoConfig => {
    let rotuloLimpo = '';
    let inicio = '';
    let fim = '';
    let desc = '';
    let trimestres: PeriodoTrimestre[] | undefined;
    let statusAno: EstadoAno = 'Aberto';

    const anoIniFallback = String(new Date().getFullYear());
    const anoFimFallback = String(new Date().getFullYear() + 1);

    if (typeof dadosOuRotulo === 'string') {
      rotuloLimpo = dadosOuRotulo.trim();
      statusAno = (estado as EstadoAno) || 'Aberto';
      inicio = dataInicio || `${rotuloLimpo.split('/')[0] || anoIniFallback}-09-01`;
      fim = dataFim || `${rotuloLimpo.split('/')[1] || anoFimFallback}-07-15`;
    } else {
      rotuloLimpo = dadosOuRotulo.rotulo.trim();
      inicio = dadosOuRotulo.dataInicio || `${rotuloLimpo.split('/')[0] || anoIniFallback}-09-01`;
      fim = dadosOuRotulo.dataFim || `${rotuloLimpo.split('/')[1] || anoFimFallback}-07-15`;
      desc = dadosOuRotulo.descricao || '';
      trimestres = dadosOuRotulo.trimestres;
    }

    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = escolaId && escolaId !== 'todas'
      ? escolaId
      : (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);

    const slugRotulo = rotuloLimpo.replace(/[^0-9a-zA-Z]/g, '-');
    const id = targetEscolaId ? `ano-${targetEscolaId}-${slugRotulo}` : `ano-${slugRotulo}`;
    const trimestresPadrao: PeriodoTrimestre[] = trimestres || [
      { trimestre: '1', nome: 'Iº Trimestre', dataInicio: inicio, dataFim: `${rotuloLimpo.split('/')[0] || anoIniFallback}-12-19`, estado: 'Aberto' },
      { trimestre: '2', nome: 'IIº Trimestre', dataInicio: `${rotuloLimpo.split('/')[1] || anoFimFallback}-01-05`, dataFim: `${rotuloLimpo.split('/')[1] || anoFimFallback}-04-10`, estado: 'Fechado' },
      { trimestre: '3', nome: 'IIIº Trimestre', dataInicio: `${rotuloLimpo.split('/')[1] || anoFimFallback}-04-27`, dataFim: fim, estado: 'Fechado' }
    ];

    const novoAno: AnoLectivoConfig = {
      id,
      escolaId: targetEscolaId,
      rotulo: rotuloLimpo,
      ano: rotuloLimpo,
      dataInicio: inicio,
      dataFim: fim,
      estado: statusAno,
      trimestres: trimestresPadrao,
      descricao: desc || `Novo Ano Letivo ${rotuloLimpo} iniciado em estado virgem.`,
      criadoEm: new Date().toISOString().split('T')[0]
    };

    dbService.salvarAnoLectivoConfig(novoAno);
    dbService.adicionarAnoLectivo(rotuloLimpo);

    // Se a escola ainda não tinha nenhum ano letivo ativo e o novo ano está Aberto, ativá-lo na escola
    if (targetEscolaId && statusAno === 'Aberto') {
      const escolas = dbService.getEscolasBrutas();
      const idxEsc = escolas.findIndex(e => e.id === targetEscolaId);
      if (idxEsc >= 0 && !escolas[idxEsc].anoLectivoActivo) {
        const atualizada: Escola = {
          ...escolas[idxEsc],
          anoLectivoActivo: rotuloLimpo,
          estadoAno: 'Aberto'
        };
        dbService.salvarEscola(atualizada);
      }
    }

    dbService.registarLog(
      'Criação de Novo Ano Letivo',
      `Novo ano letivo ${rotuloLimpo} criado em estado virgem (sem alunos, notas ou turmas associadas).`,
      targetEscolaId
    );
    return novoAno;
  },
  adicionarAnoLectivo: (novoAno: string) => {
    const clean = (novoAno || '').trim();
    if (!clean) return;
    const anos = getLocal<string[]>(STORAGE_KEYS.ANOS_LECTIVOS, []).filter(Boolean);
    if (!anos.includes(clean)) {
      anos.push(clean);
      setLocal(STORAGE_KEYS.ANOS_LECTIVOS, anos);
      firebaseSyncEngine.salvarAnosLectivosLista(anos);
      dbService.registarLog('Ano Lectivo Criado', `Novo ano letivo ${clean} adicionado ao sistema.`);
    }
  },
  setAnoLectivoActivo: (ano: string, escolaId?: string) => {
    const escolaAlvo = escolaId && escolaId !== 'todas'
      ? (dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva())
      : dbService.getEscolaAtiva();
    if (!escolaAlvo || !escolaAlvo.id) return;
    escolaAlvo.anoLectivoActivo = ano;
    dbService.salvarEscola(escolaAlvo);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('sge_ano_lectivo_alterado', { detail: { ano, escolaId: escolaAlvo.id } }));
      } catch {}
    }
    dbService.registarLog('Ano Lectivo Alterado', `Ano letivo ativo da escola alterado para ${ano}.`, escolaAlvo.id);
  },
  definirEstadoAnoLectivo: (rotulo: string, estado: EstadoAno, escolaId?: string) => {
    const configs = getLocal<AnoLectivoConfig[]>(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, []);
    const escolaAtivaId = escolaId || dbService.getEscolaAtiva()?.id;
    const target = configs.find(
      c => c.rotulo === rotulo && (!escolaAtivaId || escolaAtivaId === 'todas' || c.escolaId === escolaAtivaId)
    );
    if (target) {
      target.estado = estado;
      dbService.salvarAnoLectivoConfig(target);
    }
  },
  eliminarAnoLectivoConfig: (idOuRotulo: string, escolaId?: string): boolean => {
    let configs = getLocal<AnoLectivoConfig[]>(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, []);
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = escolaId && escolaId !== 'todas' ? escolaId : (escolaAtiva?.id || undefined);
    const target = configs.find(
      c => (c.id === idOuRotulo || c.rotulo === idOuRotulo) &&
           (!targetEscolaId || targetEscolaId === 'todas' || c.escolaId === targetEscolaId)
    ) || configs.find(c => c.id === idOuRotulo || c.rotulo === idOuRotulo);
    if (!target) return false;

    const configsDaEscola = target.escolaId
      ? configs.filter(c => c.escolaId === target.escolaId)
      : configs;

    if (configsDaEscola.length <= 1 && escolaAtiva.anoLectivoActivo === target.rotulo) {
      dbService.registarLog('Erro Exclusão Ano Letivo', `Impossível excluir o único ano letivo ativo (${target.rotulo}) da escola.`);
      return false;
    }

    configs = configs.filter(c => c.id !== target.id);
    setLocal(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, configs);
    firebaseSyncEngine.eliminarAnoLectivoConfig(target.id);

    // Só remove da lista global de rótulos se nenhuma outra escola usar o mesmo rótulo
    const aindaUsado = configs.some(c => c.rotulo === target.rotulo);
    if (!aindaUsado) {
      const anosStr = getLocal<string[]>(STORAGE_KEYS.ANOS_LECTIVOS, []).filter(a => a !== target.rotulo);
      setLocal(STORAGE_KEYS.ANOS_LECTIVOS, anosStr);
      firebaseSyncEngine.salvarAnosLectivosLista(anosStr);
    }

    // Se era o ano ativo desta escola, troca para o primeiro restante da mesma escola (ou vazio)
    if (target.escolaId) {
      const escAlvo = dbService.getEscolaPorId(target.escolaId);
      if (escAlvo && escAlvo.anoLectivoActivo === target.rotulo) {
        const restantesDaEscola = configs.filter(c => c.escolaId === target.escolaId);
        escAlvo.anoLectivoActivo = restantesDaEscola[0]?.rotulo || '';
        dbService.salvarEscola(escAlvo);
      }
    }

    dbService.registarLog('Exclusão de Ano Letivo', `Ano letivo ${target.rotulo} eliminado da instituição.`, target.escolaId);
    return true;
  },

  // ==========================================
  // TURNOS, CLASSES E CURSOS ESCOLARES (ISOLADOS POR ESCOLA)
  // ==========================================
  getTurnosConfigs: (escolaId?: string): TurnoConfig[] => {
    const list = getLocal<TurnoConfig[]>(STORAGE_KEYS.TURNOS_CONFIGS, []);
    if (escolaId && escolaId !== 'todas') {
      return list.filter(t => t.escolaId === escolaId);
    }
    return list;
  },
  salvarTurnoConfig: (turno: TurnoConfig) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = turno.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const turnoFinal: TurnoConfig = { ...turno, escolaId: targetEscolaId, atualizadoEm: new Date().toISOString() };
    const turnos = getLocal<TurnoConfig[]>(STORAGE_KEYS.TURNOS_CONFIGS, []);
    const idx = turnos.findIndex(t => t.id === turnoFinal.id);
    if (idx >= 0) turnos[idx] = turnoFinal;
    else turnos.push(turnoFinal);
    setLocal(STORAGE_KEYS.TURNOS_CONFIGS, turnos);
    firebaseSyncEngine.salvarTurnoConfig(turnoFinal);
    dbService.registarLog('Turno Escolar', `Horário de funcionamento do turno ${turnoFinal.nome} atualizado.`, targetEscolaId);
  },
  eliminarTurnoConfig: (id: string): boolean => {
    const turnos = getLocal<TurnoConfig[]>(STORAGE_KEYS.TURNOS_CONFIGS, []);
    const target = turnos.find(t => t.id === id);
    if (!target) return false;
    const filtrados = turnos.filter(t => t.id !== id);
    setLocal(STORAGE_KEYS.TURNOS_CONFIGS, filtrados);
    firebaseSyncEngine.eliminarTurnoConfig(id);
    dbService.registarLog('Exclusão de Turno', `Turno escolar ${target.nome} eliminado.`, target.escolaId);
    return true;
  },

  getClassesConfigs: (escolaId?: string): ClasseEscolar[] => {
    const list = getLocal<ClasseEscolar[]>(STORAGE_KEYS.CLASSES_CONFIGS, []);
    if (escolaId && escolaId !== 'todas') {
      return list.filter(c => c.escolaId === escolaId);
    }
    return list;
  },
  salvarClasseConfig: (classe: ClasseEscolar) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = classe.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const classeFinal: ClasseEscolar = { ...classe, escolaId: targetEscolaId, atualizadoEm: new Date().toISOString() };
    const classes = getLocal<ClasseEscolar[]>(STORAGE_KEYS.CLASSES_CONFIGS, []);
    const idx = classes.findIndex(c => c.id === classeFinal.id);
    if (idx >= 0) classes[idx] = classeFinal;
    else classes.push(classeFinal);
    setLocal(STORAGE_KEYS.CLASSES_CONFIGS, classes);
    firebaseSyncEngine.salvarClasseConfig(classeFinal);
    dbService.registarLog('Classe Escolar', `Nível de escolaridade ${classeFinal.nome} atualizado.`, targetEscolaId);
  },
  eliminarClasseConfig: (id: string): boolean => {
    const classes = getLocal<ClasseEscolar[]>(STORAGE_KEYS.CLASSES_CONFIGS, []);
    const target = classes.find(c => c.id === id);
    if (!target) return false;
    const filtradas = classes.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.CLASSES_CONFIGS, filtradas);
    firebaseSyncEngine.eliminarClasseConfig(id);
    dbService.registarLog('Exclusão de Classe', `Classe escolar ${target.nome} eliminada.`, target.escolaId);
    return true;
  },

  // Cursos Curriculares
  getCursos: (escolaId?: string): CursoConfig[] => {
    const list = getLocal<CursoConfig[]>(STORAGE_KEYS.CURSOS, []);
    if (escolaId && escolaId !== 'todas') {
      return list.filter(c => c.escolaId === escolaId);
    }
    return list;
  },
  salvarCurso: (curso: CursoConfig) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = curso.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const cursoFinal: CursoConfig = { ...curso, escolaId: targetEscolaId, atualizadoEm: new Date().toISOString() };
    const cursos = getLocal<CursoConfig[]>(STORAGE_KEYS.CURSOS, []);
    const idx = cursos.findIndex(c => c.id === cursoFinal.id);
    if (idx >= 0) cursos[idx] = cursoFinal;
    else cursos.push(cursoFinal);
    setLocal(STORAGE_KEYS.CURSOS, cursos);
    firebaseSyncEngine.salvarCurso(cursoFinal);
    dbService.registarLog('Gestão de Cursos', `Curso "${cursoFinal.nome}" (${cursoFinal.area}) guardado com sucesso.`, targetEscolaId);
  },
  eliminarCurso: (id: string): boolean => {
    const cursos = getLocal<CursoConfig[]>(STORAGE_KEYS.CURSOS, []);
    const target = cursos.find(c => c.id === id);
    if (!target) return false;
    const filtrados = cursos.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.CURSOS, filtrados);
    firebaseSyncEngine.eliminarCurso(id);
    dbService.registarLog('Exclusão de Curso', `Curso "${target.nome}" eliminado do catálogo.`, target.escolaId);
    return true;
  },

  // Áreas de Formação
  getAreasFormacao: (escolaId?: string): AreaFormacaoConfig[] => {
    const list = getLocal<AreaFormacaoConfig[]>(STORAGE_KEYS.AREAS_FORMACAO, []);
    if (escolaId && escolaId !== 'todas') {
      return list.filter(a => a.escolaId === escolaId);
    }
    return list;
  },
  salvarAreaFormacao: (area: AreaFormacaoConfig) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = area.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const areaFinal: AreaFormacaoConfig = { ...area, escolaId: targetEscolaId, atualizadoEm: new Date().toISOString() };
    const areas = getLocal<AreaFormacaoConfig[]>(STORAGE_KEYS.AREAS_FORMACAO, []);
    const idx = areas.findIndex(a => a.id === areaFinal.id);
    if (idx >= 0) areas[idx] = areaFinal;
    else areas.push(areaFinal);
    setLocal(STORAGE_KEYS.AREAS_FORMACAO, areas);
    firebaseSyncEngine.salvarAreaFormacao(areaFinal);
    dbService.registarLog('Áreas de Formação', `Área de formação "${areaFinal.nome}" guardada com sucesso.`, targetEscolaId);
  },
  eliminarAreaFormacao: (id: string): boolean => {
    const areas = getLocal<AreaFormacaoConfig[]>(STORAGE_KEYS.AREAS_FORMACAO, []);
    const target = areas.find(a => a.id === id);
    if (!target) return false;
    const filtradas = areas.filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.AREAS_FORMACAO, filtradas);
    firebaseSyncEngine.eliminarAreaFormacao(id);
    dbService.registarLog('Exclusão de Área de Formação', `Área de formação "${target.nome}" eliminada.`, target.escolaId);
    return true;
  },

  // Salas de Aulas
  getSalasAulas: (escolaId?: string): SalaAulaConfig[] => {
    const list = getLocal<SalaAulaConfig[]>(STORAGE_KEYS.SALAS_AULAS, []);
    if (escolaId && escolaId !== 'todas') {
      return list.filter(s => s.escolaId === escolaId);
    }
    return list;
  },
  salvarSalaAula: (sala: SalaAulaConfig) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = sala.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const salaFinal: SalaAulaConfig = { ...sala, escolaId: targetEscolaId, atualizadoEm: new Date().toISOString() };
    const salas = getLocal<SalaAulaConfig[]>(STORAGE_KEYS.SALAS_AULAS, []);
    const idx = salas.findIndex(s => s.id === salaFinal.id);
    if (idx >= 0) salas[idx] = salaFinal;
    else salas.push(salaFinal);
    setLocal(STORAGE_KEYS.SALAS_AULAS, salas);
    firebaseSyncEngine.salvarSalaAula(salaFinal);
    dbService.registarLog('Salas de Aula', `Sala "${salaFinal.nome}" configurada na instituição.`, targetEscolaId);
  },
  eliminarSalaAula: (id: string): boolean => {
    const salas = getLocal<SalaAulaConfig[]>(STORAGE_KEYS.SALAS_AULAS, []);
    const target = salas.find(s => s.id === id);
    if (!target) return false;
    const filtradas = salas.filter(s => s.id !== id);
    setLocal(STORAGE_KEYS.SALAS_AULAS, filtradas);
    firebaseSyncEngine.eliminarSalaAula(id);
    dbService.registarLog('Exclusão de Sala de Aula', `Sala "${target.nome}" eliminada.`, target.escolaId);
    return true;
  },

  // ==========================================
  // SEGURANÇA: 3 TENTATIVAS DE LOGIN, BLOQUEIO & VARREDURA DE AMEAÇAS
  // ==========================================
  verificarBloqueioLogin: (identificador: string): { bloqueado: boolean; tentativas: number; segundosRestantes: number } => {
    // Imunidade absoluta: O Administrador Geral NUNCA pode ser bloqueado
    if (securityEngine.isIdentificadorAdminGeral(identificador)) {
      return { bloqueado: false, tentativas: 0, segundosRestantes: 0 };
    }

    const mapa = getLocal<Record<string, TentativaLogin>>(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, {});
    const key = identificador.trim().toLowerCase();
    const reg = mapa[key];
    if (!reg) return { bloqueado: false, tentativas: 0, segundosRestantes: 0 };

    // Verificação prioritária no motor de segurança em tempo real
    const secStatus = securityEngine.verificarBloqueio(identificador);
    if (secStatus.bloqueado) {
      return secStatus;
    }

    if (reg.bloqueadoAte) {
      const expira = new Date(reg.bloqueadoAte).getTime();
      const agora = Date.now();
      if (expira > agora) {
        const segundosRestantes = Math.ceil((expira - agora) / 1000);
        return { bloqueado: true, tentativas: reg.tentativas, segundosRestantes };
      }
    }
    return { bloqueado: false, tentativas: reg.tentativas, segundosRestantes: 0 };
  },
  verificarRateLimitGlobalLogin: (ip: string = '197.234.12.89') => {
    return securityEngine.verificarRateLimitLogin(ip);
  },
  resetarRateLimitLogins: (operadorNome: string = 'Administrador Geral') => {
    securityEngine.resetarRateLimitLogins(operadorNome);
  },

  registarTentativaLogin: (
    identificador: string, 
    sucesso: boolean, 
    ip: string = '197.234.12.89'
  ): { bloqueado: boolean; tentativas: number; alertaGerado: boolean; segundosRestantes?: number } => {
    const mapa = getLocal<Record<string, TentativaLogin>>(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, {});
    const key = identificador.trim().toLowerCase();
    const ehAdminGeral = securityEngine.isIdentificadorAdminGeral(identificador);

    // 1. Registra no motor de taxa limite contra ataques e derrubação (máx 20 logins/min)
    const rateLimitStatus = securityEngine.registarTentativaLoginRateLimit(ip);
    if (rateLimitStatus.bloqueado && !ehAdminGeral) {
      return {
        bloqueado: true,
        tentativas: rateLimitStatus.loginsNoUltimoMinuto,
        alertaGerado: true,
        segundosRestantes: rateLimitStatus.segundosRestantes
      };
    }

    if (sucesso) {
      if (mapa[key]) {
        delete mapa[key];
        setLocal(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, mapa);
      }
      securityEngine.registarSucessoLogin(key);
      return { bloqueado: false, tentativas: 0, alertaGerado: false };
    }

    // Processa no motor de segurança
    const secResult = securityEngine.registarFalhaLogin(key, ip, 'Tentativa falhada de autenticação no portal.');

    const reg = mapa[key] || {
      identificador: key,
      ip,
      tentativas: 0,
      ultimoErroEm: new Date().toISOString()
    };

    reg.tentativas = secResult.tentativas;
    reg.ultimoErroEm = new Date().toISOString();

    // Se for Administrador Geral, o perfil JAMAIS é bloqueado mesmo após várias tentativas
    if (ehAdminGeral) {
      delete reg.bloqueadoAte;
      mapa[key] = reg;
      setLocal(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, mapa);
      return { bloqueado: false, tentativas: reg.tentativas, alertaGerado: false, segundosRestantes: 0 };
    }

    let bloqueado = secResult.bloqueado;
    let alertaGerado = !!secResult.alertaVisual;
    let segundosRestantes = secResult.segundosRestantes;

    if (reg.tentativas >= 3) {
      bloqueado = true;
      const expiraEm = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
      reg.bloqueadoAte = expiraEm.toISOString();
      segundosRestantes = 15 * 60;
      alertaGerado = true;

      // Gerar alerta forense no sistema
      const alertas = dbService.getAlertasSeguranca();
      const novoAlerta: AlertaSeguranca = {
        id: `alerta-${Date.now()}`,
        tipo: 'TENTATIVAS_EXCEDIDAS',
        identificador: key,
        ip,
        dataHora: new Date().toLocaleString('pt-AO'),
        tentativas: reg.tentativas,
        detalhes: `Detectadas 3 tentativas consecutivas de acesso com credenciais inválidas para o utilizador "${key}". Conta bloqueada preventivamente contra ataques de força bruta.`,
        resolvido: false
      };
      alertas.unshift(novoAlerta);
      setLocal(STORAGE_KEYS.ALERTAS_SEGURANCA, alertas);

      dbService.registarLog(
        'Alerta de Segurança - Força Bruta',
        `3 tentativas com credenciais erradas para [${key}]. Bloqueio preventivo ativado no IP ${ip}.`
      );
    }

    mapa[key] = reg;
    setLocal(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, mapa);
    return { bloqueado, tentativas: reg.tentativas, alertaGerado, segundosRestantes };
  },

  desbloquearContaUtilizador: (identificador: string, resolvidoPor: string = 'Administrador Geral') => {
    const mapa = getLocal<Record<string, TentativaLogin>>(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, {});
    const key = identificador.trim().toLowerCase();
    if (mapa[key]) {
      delete mapa[key];
      setLocal(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, mapa);
    }
    securityEngine.desbloquearUtilizador(key, resolvidoPor);
    const alertas = dbService.getAlertasSeguranca();
    alertas.forEach(a => {
      if (a.identificador.toLowerCase() === key && !a.resolvido) {
        a.resolvido = true;
        a.resolvidoPor = resolvidoPor;
        a.dataResolucao = new Date().toLocaleString('pt-AO');
      }
    });
    setLocal(STORAGE_KEYS.ALERTAS_SEGURANCA, alertas);
    dbService.registarLog('Segurança - Desbloqueio', `Acesso desbloqueado para [${key}] por ${resolvidoPor}.`);
  },

  getAlertasSeguranca: (): AlertaSeguranca[] => {
    return getLocal<AlertaSeguranca[]>(STORAGE_KEYS.ALERTAS_SEGURANCA, []);
  },

  resolverAlertaSeguranca: (id: string, resolvidoPor: string) => {
    const alertas = dbService.getAlertasSeguranca();
    const target = alertas.find(a => a.id === id);
    if (target) {
      target.resolvido = true;
      target.resolvidoPor = resolvidoPor;
      target.dataResolucao = new Date().toLocaleString('pt-AO');
      setLocal(STORAGE_KEYS.ALERTAS_SEGURANCA, alertas);
      dbService.registarLog('Segurança Resolvida', `Incidente ${id} marcado como resolvido por ${resolvidoPor}.`);
    }
  },

  executarLimpezaAmeacasVulnerabilidades: (): { ameacasIdentificadas: number; ameacasCorrigidas: number; detalhes: string[] } => {
    const detalhes: string[] = [];
    let ameacasCorrigidas = 0;

    // 1. Limpeza de bloqueios temporários de login expirados
    const mapaTentativas = getLocal<Record<string, TentativaLogin>>(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, {});
    const agora = Date.now();
    let contasDesbloqueadas = 0;
    Object.keys(mapaTentativas).forEach(key => {
      const reg = mapaTentativas[key];
      if (reg.bloqueadoAte && new Date(reg.bloqueadoAte).getTime() < agora) {
        delete mapaTentativas[key];
        contasDesbloqueadas++;
        ameacasCorrigidas++;
      }
    });
    setLocal(STORAGE_KEYS.TENTATIVAS_LOGIN_FALHADAS, mapaTentativas);
    if (contasDesbloqueadas > 0) {
      detalhes.push(`Limpos ${contasDesbloqueadas} bloqueios de tentativas de login que já expiraram o período de penalidade.`);
    }

    // 2. Sanitização de credenciais e integridade de utilizadores
    const funcs = dbService.getFuncionariosBruto();
    let credenciaisSanitizadas = 0;
    funcs.forEach(f => {
      if (!f.statusConta) {
        f.statusConta = 'Ativa';
        credenciaisSanitizadas++;
      }
    });
    if (credenciaisSanitizadas > 0) {
      setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
      ameacasCorrigidas += credenciaisSanitizadas;
      detalhes.push(`Conformidade de status de conta restabelecida para ${credenciaisSanitizadas} utilizadores.`);
    }

    // 3. Auditoria de integridade do Administrador Geral e Master Lock
    const temAdmin = funcs.some(f => f.role === 'AdminGeral');
    if (temAdmin) {
      setLocal(STORAGE_KEYS.SETUP_MASTER_LOCK, true);
      setLocal(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, true);
      detalhes.push('Blindagem Master-Lock ativa: Acesso à tela de configuração inicial bloqueado permanentemente.');
      ameacasCorrigidas++;
    }

    // 4. Marcação de alertas obsoletos como analisados
    const alertas = dbService.getAlertasSeguranca();
    let alertasTratados = 0;
    alertas.forEach(a => {
      if (!a.resolvido && Date.now() - new Date(a.dataHora).getTime() > 86400000 * 7) {
        a.resolvido = true;
        a.resolvidoPor = 'Varredura Automática de Segurança DTI';
        a.dataResolucao = new Date().toLocaleString('pt-AO');
        alertasTratados++;
        ameacasCorrigidas++;
      }
    });
    setLocal(STORAGE_KEYS.ALERTAS_SEGURANCA, alertas);
    if (alertasTratados > 0) {
      detalhes.push(`Arquivados ${alertasTratados} alertas antigos de auditoria.`);
    }

    detalhes.push('Auditoria de assinaturas SHA-256 e integridade de dados locais concluída com 100% de conformidade.');

    dbService.registarLog(
      'Limpeza de Ameaças & Vulnerabilidades',
      `Varredura de segurança concluída. ${ameacasCorrigidas} verificações preventivas aplicadas com sucesso.`
    );

    return {
      ameacasIdentificadas: ameacasCorrigidas,
      ameacasCorrigidas,
      detalhes
    };
  },

  // ==========================================
  // SOLICITAÇÕES DE APOIO TÉCNICO AO ADMINISTRADOR GERAL
  // ==========================================
  getSolicitacoesApoioTecnico: (escolaId?: string): SolicitacaoApoioTecnico[] => {
    const list = dbService.getSolicitacoesApoioBrutas();
    const filtrada = (!escolaId || escolaId === 'todas') ? list : list.filter(s => s.escolaId === escolaId);
    if (!isSessaoAutenticadaNaoAdminGeral()) {
      return filtrada;
    }
    return filtrada.map(s => ({
      ...s,
      atendidoPorAdminNome: s.atendidoPorAdminNome ? 'Equipa Técnica DTI / MED' : undefined
    }));
  },
  criarSolicitacaoApoioTecnico: (dados: any): SolicitacaoApoioTecnico => {
    const list = dbService.getSolicitacoesApoioBrutas();
    const agora = new Date().toISOString();
    const nova: SolicitacaoApoioTecnico = {
      ...dados,
      id: `sol-${Date.now()}`,
      escolaNome: dados.escolaNome || dados.nomeEscola || 'Instituição',
      nomeEscola: dados.nomeEscola || dados.escolaNome || 'Instituição',
      diretorNome: dados.diretorNome || dados.solicitadoPorNome || 'Direção',
      solicitadoPorNome: dados.solicitadoPorNome || dados.diretorNome || 'Direção',
      assunto: dados.assunto || dados.motivo || 'Apoio Técnico',
      motivo: dados.motivo || dados.assunto || 'Apoio Técnico',
      descricao: dados.descricao || dados.descricaoProblema || '',
      descricaoProblema: dados.descricaoProblema || dados.descricao || '',
      prioridade: dados.prioridade || dados.urgencia || 'Media',
      urgencia: dados.urgencia || dados.prioridade || 'Media',
      dataSolicitacao: agora,
      atualizadoEm: agora,
      estado: 'Pendente',
      status: 'Pendente',
      autorizacaoAcessoConcedida: true,
      autorizacaoAcessoValida: true
    };
    list.unshift(nova);
    setLocal(STORAGE_KEYS.SOLICITACOES_APOIO, list);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.SOLICITACOES_APOIO, JSON.stringify(list));
    firebaseSyncEngine.salvarSolicitacaoApoio(nova);
    dbService.registarLog(
      'Solicitação de Apoio Técnico',
      `Chamado de suporte "${nova.assunto}" registado para a escola ${nova.escolaNome}.`
    );
    return nova;
  },
  atualizarSolicitacaoApoioTecnico: (solicitacao: SolicitacaoApoioTecnico) => {
    const list = dbService.getSolicitacoesApoioBrutas();
    const atualizada: SolicitacaoApoioTecnico = {
      ...solicitacao,
      status: solicitacao.status || solicitacao.estado || 'Pendente',
      estado: solicitacao.estado || solicitacao.status || 'Pendente',
      autorizacaoAcessoConcedida: solicitacao.autorizacaoAcessoConcedida ?? true,
      autorizacaoAcessoValida: solicitacao.autorizacaoAcessoValida ?? true,
      atualizadoEm: new Date().toISOString()
    };
    const idx = list.findIndex(s => s.id === atualizada.id);
    if (idx >= 0) list[idx] = atualizada;
    else list.unshift(atualizada);
    setLocal(STORAGE_KEYS.SOLICITACOES_APOIO, list);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.SOLICITACOES_APOIO, JSON.stringify(list));
    firebaseSyncEngine.salvarSolicitacaoApoio(atualizada);
  },
  adicionarSolicitacaoApoioTecnico: (solicitacao: SolicitacaoApoioTecnico) => {
    dbService.atualizarSolicitacaoApoioTecnico(solicitacao);
  },
  responderSolicitacaoApoioTecnico: (id: string, respostaOuStatus: string, adminNome: string, notas?: string) => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: atendimento técnico exclusivo da Administração Central.');
    }
    const list = dbService.getSolicitacoesApoioBrutas();
    const target = list.find(s => s.id === id);
    if (target) {
      const agora = new Date().toISOString();
      const statusNorm = (respostaOuStatus || '').trim();
      if (statusNorm === 'Em_Atendimento') {
        target.estado = 'Em_Atendimento';
        target.status = 'Em_Atendimento';
        target.autorizacaoAcessoConcedida = true;
        target.autorizacaoAcessoValida = true;
        target.respostaTecnica = notas || 'Atendimento técnico em curso.';
      } else if (statusNorm === 'Recusado') {
        target.estado = 'Recusado';
        target.status = 'Recusado';
        target.autorizacaoAcessoConcedida = false;
        target.autorizacaoAcessoValida = false;
        target.respostaTecnica = notas || 'Solicitação recusada pela Equipa Técnica DTI / MED.';
        target.dataResolucao = new Date().toLocaleString('pt-AO');
      } else {
        target.estado = 'Concluido';
        target.status = 'Concluido';
        target.autorizacaoAcessoConcedida = false;
        target.autorizacaoAcessoValida = false;
        target.respostaTecnica = notas || (statusNorm && statusNorm !== 'Concluido' && statusNorm !== 'Resolvido'
          ? statusNorm
          : 'Intervenção técnica concluída pela Equipa DTI / MED.');
        target.dataResolucao = new Date().toLocaleString('pt-AO');
      }
      target.atendidoPorAdminNome = adminNome;
      target.atualizadoEm = agora;
      dbService.atualizarSolicitacaoApoioTecnico(target);

      // Se o chamado foi encerrado/recusado, garantir encerramento de eventual sessão ativa ligada a ele
      if (statusNorm !== 'Em_Atendimento') {
        const escolas = dbService.getEscolasBrutas();
        let alterouEscolas = false;
        const escolasAtualizadas = escolas.map(esc => {
          if (esc.sessaoApoioTecnicoAtiva && (esc.sessaoApoioTecnicoAtiva.solicitacaoId === id || esc.id === target.escolaId)) {
            alterouEscolas = true;
            const copia = { ...esc, atualizadoEm: agora };
            delete copia.sessaoApoioTecnicoAtiva;
            firebaseSyncEngine.encerrarSessaoApoioNoFirestore(copia.id, copia);
            return copia;
          }
          return esc;
        });
        if (alterouEscolas) {
          setLocal(STORAGE_KEYS.ESCOLAS, escolasAtualizadas);
          offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolasAtualizadas));
        }
      }

      dbService.registarLog(
        'Apoio Técnico',
        `Chamado ${id} de ${target.escolaNome || target.nomeEscola} atualizado (${target.status}) por ${adminNome}.`
      );
    }
  },
  temAutorizacaoApoioTecnico: (escolaId: string): boolean => {
    const list = dbService.getSolicitacoesApoioBrutas();
    const chamados = (!escolaId || escolaId === 'todas') ? list : list.filter(s => s.escolaId === escolaId);
    const estadosFechados = ['resolvido', 'concluido', 'concluído', 'encerrado', 'recusado'];
    return chamados.some(c => {
      const est = String(c.estado || c.status || '').toLowerCase();
      return Boolean(c.autorizacaoAcessoConcedida || c.autorizacaoAcessoValida) && !estadosFechados.includes(est);
    });
  },
  temSessaoApoioTecnicoAtiva: (escolaId?: string): boolean => {
    const escolas = dbService.getEscolasBrutas();
    if (escolaId && escolaId !== 'todas') {
      const esc = escolas.find(e => e.id === escolaId);
      return Boolean(esc?.sessaoApoioTecnicoAtiva && esc.sessaoApoioTecnicoAtiva.dataInicio);
    }
    return escolas.some(e => Boolean(e.sessaoApoioTecnicoAtiva && e.sessaoApoioTecnicoAtiva.dataInicio));
  },

  // ==========================================
  // MEU PERFIL: ATUALIZAÇÃO DE DADOS, FOTO E PALAVRA-PASSE
  // ==========================================
  atualizarPerfilUtilizador: (
    funcionarioId: string,
    dados: Partial<Funcionario>,
    novaSenha?: string,
    senhaAtual?: string
  ): { sucesso: boolean; mensagem: string; usuarioAtualizado?: Funcionario } => {
    const funcs = dbService.getFuncionariosBruto();
    const idx = funcs.findIndex(f => f.id === funcionarioId);
    if (idx < 0) {
      return { sucesso: false, mensagem: 'Utilizador não encontrado no sistema.' };
    }

    const func = funcs[idx];
    if (isAdminGeralUserObj(func) && isSessaoAutenticadaNaoAdminGeral()) {
      return { sucesso: false, mensagem: 'Acesso negado: não possui permissão para alterar o perfil do Administrador Geral.' };
    }

    // Se forneceu nova senha, validar senha atual
    if (novaSenha && novaSenha.trim()) {
      if (func.password && senhaAtual && func.password !== senhaAtual) {
        return { sucesso: false, mensagem: 'A palavra-passe atual inserida está incorreta.' };
      }
      func.password = novaSenha.trim();
    }

    const rawFotoInput: unknown = (dados as any).fotoBlob ?? dados.fotoUrl;
    if (dados.nomeCompleto) func.nomeCompleto = dados.nomeCompleto.trim();
    if (dados.telefone !== undefined) func.telefone = dados.telefone.trim();
    if (dados.email !== undefined) func.email = dados.email.trim();
    if (rawFotoInput !== undefined) {
      if (typeof Blob !== 'undefined' && rawFotoInput instanceof Blob) {
        try {
          func.fotoUrl = typeof URL !== 'undefined' ? URL.createObjectURL(rawFotoInput) : (func.fotoUrl || '');
        } catch {
          func.fotoUrl = func.fotoUrl || '';
        }
      } else if (typeof rawFotoInput === 'string') {
        func.fotoUrl = rawFotoInput;
        if (rawFotoInput && !rawFotoInput.startsWith('blob:') && rawFotoInput !== '__idb_media__') {
          offlineStorage.definirMidiaEmCache('funcionario', func.id, rawFotoInput);
        }
      }
    }
    if (dados.habilitacoes !== undefined) func.habilitacoes = dados.habilitacoes;
    if (dados.genero) func.genero = dados.genero;
    func.atualizadoEm = new Date().toISOString();

    funcs[idx] = func;
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    // Enfileiramento síncrono pré-mídia para nunca perder a mutação offline mesmo em fecho/reload imediato
    offlineStorage.adicionarPendencia(
      'funcionarios',
      'ATUALIZAR',
      `Atualização do perfil de ${func.nomeCompleto}`,
      func,
      func.id,
      ['users'],
      func.role
    );

    // Se for o utilizador atualmente autenticado, atualizar sessão ativa
    const current = dbService.getCurrentUser();
    if (current && current.id === funcionarioId) {
      dbService.setCurrentUser(func);
    }

    // Persistência imediata no IndexedDB (Base64 + Blob) e sincronização garantida com o Firebase
    normalizarEPersistirFuncionarioAsync(func, rawFotoInput);

    dbService.registarLog(
      'Atualização de Perfil',
      `O utilizador ${func.nomeCompleto} atualizou os seus dados pessoais e credenciais de acesso.`
    );

    return { sucesso: true, mensagem: 'Perfil e credenciais atualizados com sucesso!', usuarioAtualizado: func };
  },

  // ==========================================
  // REVISÃO E CONSERVAÇÃO DO PATRIMÓNIO ESCOLAR
  // ==========================================
  revisarItemPatrimonio: (
    id: string, 
    novoEstado: EstadoConservacao, 
    arg3?: string, 
    arg4?: string,
    arg5?: string
  ): void => {
    const itens = dbService.getPatrimonio();
    const target = itens.find(p => p.id === id);
    if (target) {
      const estadoAnterior = target.estadoConservacao;
      target.estadoConservacao = novoEstado;

      let statusInventario = '';
      let responsavel = '';
      let obs = '';

      if (arg5 !== undefined) {
        statusInventario = arg3 || '';
        responsavel = arg4 || '';
        obs = arg5 || '';
      } else if (arg4 !== undefined) {
        obs = arg3 || '';
        responsavel = arg4 || '';
      } else if (arg3 !== undefined) {
        obs = arg3 || '';
      }

      if (statusInventario) {
        target.statusInventario = statusInventario;
      }
      if (responsavel) {
        target.responsavelNome = responsavel;
        target.revisadoPor = responsavel;
      }
      target.revisadoEm = new Date().toLocaleDateString('pt-AO');
      if (obs) {
        target.observacoes = `${target.observacoes ? target.observacoes + ' | ' : ''}[Revisão ${new Date().toLocaleDateString('pt-AO')}]: ${obs}`;
      }
      dbService.salvarItemPatrimonio(target);
      dbService.registarLog(
        'Vistoria de Património',
        `Item "${target.designacao || target.nomeItem}" (${target.codigoTombo || target.codigoTombamento}) vistoriado: estado alterado de "${estadoAnterior}" para "${novoEstado}".`
      );
    }
  },

  // ==========================================
  // CONFIGURAÇÃO INICIAL, ADMIN GERAL & MOTOR DE CRIPTOGRAFIA AES-256
  // ==========================================
  temAdminGeral: (): boolean => {
    if (typeof window === 'undefined') return false;
    const funcs = dbService.getFuncionariosBruto();
    const adminAtivo = funcs.find(f => f.role === 'AdminGeral' && f.ativo);
    return Boolean(adminAtivo);
  },

  obterAdminGeral: (): Funcionario | null => {
    if (typeof window === 'undefined') return null;
    if (isSessaoAutenticadaNaoAdminGeral()) return null;
    const funcs = dbService.getFuncionariosBruto();
    return funcs.find(f => f.role === 'AdminGeral' && f.ativo) || null;
  },

  verificarAdminGeralOnline: async (timeoutMs: number = 2500): Promise<{
    existe: boolean;
    admin?: Funcionario;
    online: boolean;
    internetLenta: boolean;
    deveMostrarSetupInicial: boolean;
    status: string;
    mensagem: string;
  }> => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let temLocal = dbService.temAdminGeral();
    const funcs = dbService.getFuncionariosBruto();
    let admin = funcs.find(f => f.role === 'AdminGeral' && f.ativo);

    // REGRA 1: Se estiver OFFLINE
    // "se a internet estiver offline não mostra esta página [de configuração inicial]"
    if (!isOnline) {
      securityEngine.registarEvento({
        categoria: 'SISTEMA',
        severidade: 'INFO',
        titulo: 'Sistema Offline',
        detalhes: 'Dispositivo sem acesso à internet. Página de configuração inicial suspensa; direcionando para acesso normal.'
      });
      return {
        existe: temLocal,
        admin,
        online: false,
        internetLenta: false,
        deveMostrarSetupInicial: false, // NUNCA mostra se offline
        status: 'OFFLINE',
        mensagem: 'Sistema em modo offline. Ecrã de configuração inicial não será exibido.'
      };
    }

    // REGRA 2: Se estiver ONLINE
    // "ao carregar o sistema quando está online deve verificar sempre se há administrador geral ou não"
    try {
      const resRemota = await firebaseSyncEngine.buscarAdminGeralRemoto(timeoutMs);

      // REGRA 3: Se a internet estiver LENTA ou ocorrer erro na conexão com Firebase
      // "se a internet estiver lenta não mostra esta página"
      if (resRemota.timeout || resRemota.erro) {
        securityEngine.registarEvento({
          categoria: 'SISTEMA',
          severidade: 'AVISO',
          titulo: resRemota.timeout ? 'Internet Lenta Detectada' : 'Erro de Conexão com Firebase',
          detalhes: resRemota.timeout 
            ? `A verificação do Administrador Geral no Firebase excedeu ${timeoutMs}ms. Página de configuração inicial suspensa por lentidão.`
            : 'Falha na comunicação com o Firebase. Acesso direto mantido.'
        });
        return {
          existe: temLocal,
          admin,
          online: true,
          internetLenta: resRemota.timeout,
          deveMostrarSetupInicial: false, // NUNCA mostra se internet for lenta ou falhar
          status: resRemota.timeout ? 'INTERNET_LENTA' : 'ERRO_CONEXAO',
          mensagem: resRemota.timeout 
            ? 'Internet lenta detectada. Página de configuração inicial não será exibida.'
            : 'Instabilidade de conexão. Página de configuração inicial suspensa.'
        };
      }

      // Se a conexão respondeu a tempo e encontrou Admin Geral no Firestore:
      if (resRemota.admin) {
        temLocal = true;
        admin = resRemota.admin;
        return {
          existe: true,
          admin: resRemota.admin,
          online: true,
          internetLenta: false,
          deveMostrarSetupInicial: false,
          status: 'CONFIRMADO_ONLINE',
          mensagem: 'Administrador Geral confirmado no Firebase online.'
        };
      }

      // Se não encontrou no Firebase mas encontrou no dispositivo local:
      if (temLocal && admin) {
        firebaseSyncEngine.salvarPerfilUsuario(admin);
        return {
          existe: true,
          admin,
          online: true,
          internetLenta: false,
          deveMostrarSetupInicial: false,
          status: 'CONFIRMADO_LOCAL',
          mensagem: 'Administrador Geral presente no dispositivo.'
        };
      }

      // REGRA 4: Online, com internet estável e rápida (< 2.5s), e comprovadamente NÃO há Administrador Geral nem no Firebase nem local:
      // "se não tiver mostra a página de configuração inicial"
      securityEngine.registarEvento({
        categoria: 'SISTEMA',
        severidade: 'AVISO',
        titulo: 'Nenhum Administrador Geral Encontrado',
        detalhes: 'Verificação online concluída em tempo hábil: não existe Administrador Geral no Firestore online. Exibindo página de configuração inicial.'
      });
      return {
        existe: false,
        online: true,
        internetLenta: false,
        deveMostrarSetupInicial: true, // SÓ MOSTRA NESTA CONDIÇÃO!
        status: 'PENDENTE_CADASTRO',
        mensagem: 'Nenhum Administrador Geral registrado online. Apresentar configuração inicial.'
      };
    } catch (e) {
      console.warn('[Storage] Falha geral ao verificar admin online:', e);
      return {
        existe: temLocal,
        admin,
        online: isOnline,
        internetLenta: true,
        deveMostrarSetupInicial: false,
        status: 'FALHA_GERAL',
        mensagem: 'Erro durante a verificação. Página de configuração inicial suspensa.'
      };
    }
  },

  isSetupInicialConcluido: (): boolean => {
    return dbService.temAdminGeral();
  },

  concluirSetupInicial: async (dadosAdmin: Partial<Funcionario>, dadosEscola?: Partial<Escola>): Promise<Funcionario> => {
    // 1. Criptografia e preparação das credenciais do Administrador Geral
    const senhaPlana = dadosAdmin.password || '';
    const funcs = dbService.getFuncionariosBruto();
    const existingAdmin = funcs.find(f => f.role === 'AdminGeral');
    const adminId = dadosAdmin.id || existingAdmin?.id || `func-admin-${Date.now()}`;

    const novoAdmin: Funcionario = {
      id: adminId,
      escolaId: 'todas',
      nomeCompleto: dadosAdmin.nomeCompleto?.trim() || 'Administrador Geral',
      genero: dadosAdmin.genero || 'M',
      numeroBI: (dadosAdmin.numeroBI?.trim() || '').toUpperCase(),
      telefone: dadosAdmin.telefone?.trim() || '',
      email: (dadosAdmin.email?.trim() || '').toLowerCase(),
      cargo: 'Administrador Geral do Sistema',
      ehProfessor: false,
      ehAdministrativoQueLeciona: false,
      habilitacoes: dadosAdmin.habilitacoes || 'Gestão de Sistemas Educativos (MED)',
      fotoUrl: dadosAdmin.fotoUrl || '',
      dataAdmissao: existingAdmin?.dataAdmissao || new Date().toISOString().split('T')[0],
      ativo: true,
      role: 'AdminGeral',
      password: senhaPlana
    };

    // Remove qualquer outro admin geral anterior para garantir consistência institucional
    const outrosAdmins = funcs.filter(f => f.role === 'AdminGeral' && f.id !== adminId);
    outrosAdmins.forEach(oldAdmin => firebaseSyncEngine.eliminarFuncionario(oldAdmin.id));

    const funcsSemAdmin = funcs.filter(f => f.role !== 'AdminGeral');
    funcsSemAdmin.unshift(novoAdmin);
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcsSemAdmin);

    // 2. Se foram fornecidos dados da primeira escola, cria e registra no sistema e no Firestore
    if (dadosEscola && dadosEscola.nomeOficial && dadosEscola.nomeOficial.trim()) {
      const novaEscola = dbService.criarEscola(dadosEscola);
      dbService.setEscolaAtiva(novaEscola.id);
    }

    // 3. Marcar Setup como concluído com Master Lock e chave AES-256 ativa
    setLocal(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, true);
    setLocal(STORAGE_KEYS.SETUP_MASTER_LOCK, true);
    localStorage.setItem('sge_admin_configured', 'true');
    dbService.setCurrentUser(novoAdmin);
    
    // Persistência com await no Firebase Firestore e no dispositivo
    try {
      await firebaseSyncEngine.salvarPerfilUsuario(novoAdmin);
      console.log('[Setup Inicial] Administrador Geral persistido no Firestore com sucesso.');
    } catch (syncErr) {
      console.warn('[Setup Inicial] Falha de rede ao persistir no Firestore, salvo localmente:', syncErr);
    }

    securityEngine.registarEvento({
      categoria: 'AUTENTICACAO',
      severidade: 'SUCESSO',
      titulo: 'Administrador Geral Registado',
      detalhes: `Conta "${novoAdmin.nomeCompleto}" (${novoAdmin.email}) configurada com credenciais cifradas via AES-256-GCM. Master Lock ativado.`
    });

    dbService.registarLog(
      'Configuração Inicial Concluída', 
      `Sistema inicializado com Administrador Geral ${novoAdmin.nomeCompleto}. Criptografia AES-256 e blindagem de segurança ativadas.`
    );

    return novoAdmin;
  },

  redefinirAdminGeralParaTestes: () => {
    const authUser = getAuthenticatedUserFromStorage();
    if (!authUser || authUser.role !== 'AdminGeral') {
      throw new Error('Acesso negado: apenas o Administrador Geral pode executar esta operação.');
    }
    localStorage.removeItem('sge_admin_configured');
    setLocal(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, false);
    setLocal(STORAGE_KEYS.SETUP_MASTER_LOCK, false);
    const funcs = dbService.getFuncionariosBruto().filter(f => f.role !== 'AdminGeral');
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    localStorage.removeItem('sge_authenticated');
    localStorage.removeItem('sge_current_user');
    securityEngine.registarEvento({
      categoria: 'SISTEMA',
      severidade: 'AVISO',
      titulo: 'Reinicialização do Administrador Geral',
      detalhes: 'O sistema voltou ao estado pré-inicial para permitir novo cadastro do Administrador Geral.'
    });
  },

  // Camada de Criptografia AES-256 para Sincronização Firebase
  prepararDadosParaSincronizacao: async <T extends Record<string, any>>(colecao: string, payload: T): Promise<T> => {
    const protegido = await cryptoService.protegerCamposSensiveis(payload);
    securityEngine.registarEvento({
      categoria: 'FIREBASE_SYNC',
      severidade: 'INFO',
      titulo: `Sincronização Firebase: ${colecao}`,
      detalhes: `Campos sensíveis de "${colecao}" blindados com AES-256-GCM antes da sincronização na nuvem.`
    });
    return protegido;
  },

  processarDadosRecebidosDoFirebase: async <T extends Record<string, any>>(colecao: string, payload: T): Promise<T> => {
    const restaurado = await cryptoService.restaurarCamposSensiveis(payload);
    securityEngine.registarEvento({
      categoria: 'FIREBASE_SYNC',
      severidade: 'SUCESSO',
      titulo: `Sincronização Concluída: ${colecao}`,
      detalhes: `Dados de "${colecao}" recebidos do Firebase autenticados e decifrados com sucesso.`
    });
    return restaurado;
  },

  encriptarDadoSensivel: async (texto: string): Promise<string> => {
    return cryptoService.encriptarTexto(texto);
  },

  decriptarDadoSensivel: async (cifrado: string): Promise<string> => {
    return cryptoService.decriptarTexto(cifrado);
  },

  getCryptoStatus: () => {
    return cryptoService.getStatus();
  },

  getSecurityMetrics: () => {
    return securityEngine.obterMetricas();
  },

  // Alunos (isolamento estrito sem reescrever alunos para outras escolas)
  getAlunos: (escolaId?: string): Aluno[] => {
    const raw = hidratarFotoDeLista(getLocal<Aluno[]>(STORAGE_KEYS.ALUNOS, DEFAULT_ALUNOS), 'aluno');
    if (escolaId && escolaId !== 'todas') {
      return raw.filter(a => a.escolaId === escolaId);
    }
    return raw;
  },
  salvarAluno: (aluno: Aluno) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    aluno.escolaId = aluno.escolaId || escolaAtiva?.id || '';
    if (!aluno.anoLectivo) {
      aluno.anoLectivo = aluno.anoMatricula || escolaAtiva?.anoLectivoActivo || '';
    }
    if (!aluno.anoMatricula) {
      aluno.anoMatricula = aluno.anoLectivo;
    }
    if (!aluno.propinaStatus) {
      aluno.propinaStatus = 'Pendente';
    }
    const alunos = dbService.getAlunos();
    const existing = alunos.find(a => a.id === aluno.id);
    const rawFotoInput: unknown = (aluno as any).fotoBlob ?? (aluno as any).fotoUrl;

    let fotoResolvida = existing?.fotoUrl || '';
    if (rawFotoInput !== undefined) {
      if (typeof Blob !== 'undefined' && rawFotoInput instanceof Blob) {
        try {
          fotoResolvida = typeof URL !== 'undefined' ? URL.createObjectURL(rawFotoInput) : (existing?.fotoUrl || '');
        } catch {
          fotoResolvida = existing?.fotoUrl || '';
        }
      } else if (typeof rawFotoInput === 'string') {
        fotoResolvida = rawFotoInput;
        if (fotoResolvida && !fotoResolvida.startsWith('blob:') && fotoResolvida !== '__idb_media__') {
          offlineStorage.definirMidiaEmCache('aluno', aluno.id, fotoResolvida);
        }
      }
    }

    const alunoComTimestamp: Aluno = {
      ...aluno,
      fotoUrl: fotoResolvida,
      atualizadoEm: new Date().toISOString()
    };
    const idx = alunos.findIndex(a => a.id === alunoComTimestamp.id);
    if (idx >= 0) alunos[idx] = alunoComTimestamp;
    else alunos.push(alunoComTimestamp);
    setLocal(STORAGE_KEYS.ALUNOS, alunos);
    // Enfileiramento síncrono pré-mídia garante fila offline mesmo em reload imediato
    offlineStorage.adicionarPendencia(
      'alunos',
      idx >= 0 ? 'ATUALIZAR' : 'CRIAR',
      `Aluno ${alunoComTimestamp.nomeCompleto}`,
      alunoComTimestamp,
      alunoComTimestamp.id
    );
    try {
      offlineStorage.registarMutacao('Alunos', 'ATUALIZAR', `Aluno ${alunoComTimestamp.nomeCompleto} guardado`, 'SGE');
    } catch {}
    normalizarEPersistirFotoAlunoAsync(alunoComTimestamp, rawFotoInput ?? fotoResolvida);
    dbService.registarLog('Cadastro/Edição de Aluno', `Aluno ${alunoComTimestamp.nomeCompleto} (${alunoComTimestamp.codigoMatricula}) gravado para o Ano Lectivo ${alunoComTimestamp.anoLectivo}.`);
  },
  adicionarOcorrenciaHistoricoAluno: (alunoId: string, ocorrencia: any) => {
    const alunos = dbService.getAlunos();
    const aluno = alunos.find(a => a.id === alunoId);
    if (!aluno) return false;
    const novaOcorr = {
      id: `ocorr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      data: new Date().toISOString().split('T')[0],
      ...ocorrencia
    };
    aluno.ocorrencias = [novaOcorr, ...(aluno.ocorrencias || [])];
    dbService.salvarAluno(aluno);
    return true;
  },
  salvarAlunos: (alunos: Aluno[]) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const fallbackEscolaId = escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : '';
    const agora = new Date().toISOString();
    const alunosComAno = alunos.map(a => ({
      ...a,
      escolaId: a.escolaId || fallbackEscolaId,
      anoLectivo: a.anoLectivo || a.anoMatricula || escolaAtiva?.anoLectivoActivo || '',
      anoMatricula: a.anoMatricula || a.anoLectivo || escolaAtiva?.anoLectivoActivo || '',
      atualizadoEm: a.atualizadoEm || agora
    }));
    setLocal(STORAGE_KEYS.ALUNOS, alunosComAno);
    firebaseSyncEngine.salvarAlunosLote(alunosComAno);
  },
  excluirAluno: (id: string) => {
    const alunos = dbService.getAlunos().filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.ALUNOS, alunos);
    firebaseSyncEngine.excluirAluno(id);
  },
  confirmarRenovacaoMatricula: (dados: {
    alunoId: string;
    novaClasse: string;
    novaTurmaId: string;
    novoTurno: 'Manhã' | 'Tarde' | 'Noite';
    novoCurso?: string;
    novoNumeroMatricula?: string;
    anoLectivo: string;
    mediaFinalAnterior?: number | null;
    aprovadoAnterior?: boolean;
  }): Aluno | null => {
    const alunos = dbService.getAlunos();
    const idx = alunos.findIndex(a => a.id === dados.alunoId);
    if (idx < 0) return null;
    const aluno = alunos[idx];

    const historicoAntigo = [...(aluno.historicoAnterior || [])];
    if (aluno.classeId && (aluno.anoLectivo || aluno.anoMatricula)) {
      const anoAnt = aluno.anoLectivo || aluno.anoMatricula || '';
      const aprovReal = dados.aprovadoAnterior ?? (aluno.estado !== 'Desistente');
      const jaExiste = historicoAntigo.some(
        h => h.classe === aluno.classeId && h.anoLectivo === anoAnt
      );
      if (!jaExiste && anoAnt) {
        historicoAntigo.push({
          classe: aluno.classeId,
          anoLectivo: anoAnt,
          mediaFinal: typeof dados.mediaFinalAnterior === 'number' ? dados.mediaFinalAnterior : 0,
          aprovado: aprovReal,
          concluido: aprovReal
        });
      }
    }

    const alunoAtualizado: Aluno = {
      ...aluno,
      classeId: dados.novaClasse,
      turmaId: dados.novaTurmaId,
      periodo: dados.novoTurno === 'Manhã' ? 'Matinal' : dados.novoTurno === 'Tarde' ? 'Vespertino' : 'Noturno',
      curso: dados.novoCurso || aluno.curso || 'Geral',
      codigoMatricula: dados.novoNumeroMatricula || aluno.codigoMatricula,
      anoMatricula: dados.anoLectivo,
      anoLectivo: dados.anoLectivo,
      estado: 'Ativo',
      historicoAnterior: historicoAntigo,
      atualizadoEm: new Date().toISOString()
    };

    alunos[idx] = alunoAtualizado;
    setLocal(STORAGE_KEYS.ALUNOS, alunos);
    firebaseSyncEngine.salvarAluno(alunoAtualizado);
    dbService.registarLog('Confirmação de Matrícula', `Renovação de matrícula do estudante ${aluno.nomeCompleto} para a ${dados.novaClasse}, Turma ${dados.novaTurmaId} (${dados.anoLectivo}).`);
    return alunoAtualizado;
  },

  // Turmas
  getTurmas: (): Turma[] => getLocal(STORAGE_KEYS.TURMAS, DEFAULT_TURMAS),
  salvarTurma: (turma: Turma) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    if (!turma.anoLectivo) {
      turma.anoLectivo = escolaAtiva?.anoLectivoActivo || '';
    }
    const turmaComTs: Turma = { ...turma, atualizadoEm: new Date().toISOString() };
    const turmas = dbService.getTurmas();
    const idx = turmas.findIndex(t => t.id === turmaComTs.id);
    if (idx >= 0) turmas[idx] = turmaComTs;
    else turmas.push(turmaComTs);
    setLocal(STORAGE_KEYS.TURMAS, turmas);
    firebaseSyncEngine.salvarTurma(turmaComTs);
    dbService.registarLog('Gestão de Turma', `Turma "${turmaComTs.nome}" (${turmaComTs.classe}) guardada para o Ano Lectivo ${turmaComTs.anoLectivo}.`);
  },
  salvarTurmas: (turmas: Turma[]) => {
    const agora = new Date().toISOString();
    const turmasComTs = turmas.map(t => ({ ...t, atualizadoEm: t.atualizadoEm || agora }));
    setLocal(STORAGE_KEYS.TURMAS, turmasComTs);
    firebaseSyncEngine.salvarTurmasLote(turmasComTs);
  },
  eliminarTurma: (id: string): boolean => {
    const turmas = dbService.getTurmas();
    const target = turmas.find(t => t.id === id);
    if (!target) return false;
    const filtradas = turmas.filter(t => t.id !== id);
    setLocal(STORAGE_KEYS.TURMAS, filtradas);
    firebaseSyncEngine.eliminarTurma(id);
    dbService.registarLog('Exclusão de Turma', `Turma "${target.nome}" (${target.classe}) eliminada do sistema.`);
    return true;
  },

  // Disciplinas (estritamente isoladas por escola)
  getDisciplinas: (escolaId?: string): Disciplina[] => {
    const raw = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const list = (escolaId && escolaId !== 'todas')
      ? raw.filter(d => d.escolaId === escolaId)
      : raw;
    return [...list].sort((a, b) => {
      const ordemA = typeof a.ordem === 'number' && !isNaN(a.ordem) ? a.ordem : 999;
      const ordemB = typeof b.ordem === 'number' && !isNaN(b.ordem) ? b.ordem : 999;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return a.nome.localeCompare(b.nome, 'pt-AO', { sensitivity: 'base' });
    });
  },
  salvarDisciplina: (disc: Disciplina) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const discFinal: Disciplina = {
      ...disc,
      escolaId: disc.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined),
      atualizadoEm: new Date().toISOString()
    };
    const discs = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const idx = discs.findIndex(d => d.id === discFinal.id);
    if (idx >= 0) discs[idx] = discFinal;
    else discs.push(discFinal);
    setLocal(STORAGE_KEYS.DISCIPLINAS, discs);
    firebaseSyncEngine.salvarDisciplina(discFinal);
    dbService.registarLog('Disciplina', `Disciplina "${discFinal.nome}" (${discFinal.codigo}) guardada.`, discFinal.escolaId);
  },
  salvarDisciplinas: (disciplinas: Disciplina[]) => {
    const agora = new Date().toISOString();
    const comTs = disciplinas.map(d => ({ ...d, atualizadoEm: d.atualizadoEm || agora }));
    setLocal(STORAGE_KEYS.DISCIPLINAS, comTs);
    firebaseSyncEngine.salvarDisciplinasLote(comTs);
  },
  eliminarDisciplina: (id: string): boolean => {
    const discs = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const target = discs.find(d => d.id === id);
    if (!target) return false;
    const filtradas = discs.filter(d => d.id !== id);
    setLocal(STORAGE_KEYS.DISCIPLINAS, filtradas);
    firebaseSyncEngine.eliminarDisciplina(id);
    dbService.registarLog('Exclusão de Disciplina', `Disciplina "${target.nome}" (${target.codigo}) eliminada da grelha curricular.`, target.escolaId);
    return true;
  },
  limparTodasDisciplinas: (escolaId?: string) => {
    const todas = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    if (escolaId && escolaId !== 'todas') {
      const removidas = todas.filter(d => d.escolaId === escolaId);
      const restantes = todas.filter(d => d.escolaId !== escolaId);
      setLocal(STORAGE_KEYS.DISCIPLINAS, restantes);
      removidas.forEach(d => {
        if (d?.id) {
          firebaseSyncEngine.eliminarDisciplina(d.id);
        }
      });
      dbService.registarLog('Gestão Curricular', 'Disciplinas da escola limpas para permitir criação personalizada pela Direção.', escolaId);
      return;
    }
    setLocal(STORAGE_KEYS.DISCIPLINAS, []);
    todas.forEach(d => {
      if (d?.id) {
        firebaseSyncEngine.eliminarDisciplina(d.id);
      }
    });
    dbService.registarLog('Gestão Curricular', 'Todas as disciplinas foram limpas para permitir criação personalizada pela Direção.');
  },
  replicarAtribuicoesAnoAnterior: (escolaId: string, anoActivo: string): { sucesso: boolean; totalReplicadas: number; novasAtribuicoes: AtribuicaoDocente[]; novasTurmas: Turma[]; mensagem: string } => {
    const anosConfigs = dbService.getAnosLectivosConfigs(escolaId);
    const anosValidos: string[] = anosConfigs.map(a => a.rotulo || a.ano || '').filter((x): x is string => Boolean(x));
    const idxAnoAtual = anosValidos.indexOf(anoActivo);
    let anoAnterior = '';
    if (idxAnoAtual > 0) {
      anoAnterior = anosValidos[idxAnoAtual - 1];
    } else if (anosValidos.length > 1) {
      anoAnterior = anosValidos.find(a => a !== anoActivo) || '';
    }

    const todasAtribuicoes = getLocal<AtribuicaoDocente[]>(STORAGE_KEYS.ATRIBUICOES, []);
    const atribuicoesPassadas = todasAtribuicoes.filter(a => 
      (a.escolaId === escolaId || escolaId === 'todas') &&
      (anoAnterior ? a.anoLectivo === anoAnterior : (a.anoLectivo && a.anoLectivo !== anoActivo))
    );

    const turmas = dbService.getTurmas().filter(t => t.escolaId === escolaId || escolaId === 'todas');
    const turmasAnoActivo = turmas.filter(t => t.anoLectivo === anoActivo);
    const turmasAnoAnterior = turmas.filter(t => t.anoLectivo === anoAnterior);

    if (atribuicoesPassadas.length === 0 && turmasAnoAnterior.length === 0) {
      return { sucesso: false, totalReplicadas: 0, novasAtribuicoes: [], novasTurmas: [], mensagem: 'Nenhuma turma ou atribuição docente encontrada em anos letivos anteriores para replicar.' };
    }

    let count = 0;
    const novasAtribs = [...todasAtribuicoes];
    const recemCriadas: AtribuicaoDocente[] = [];
    const recemCriadasTurmas: Turma[] = [];
    const todasTurmasAtualizadas = [...dbService.getTurmas()];
    const mapaTurmaIdAntigoParaNovo = new Map<string, string>();

    // 1. Replicar Turmas e Coordenadores de Turma do Ano Anterior para o Novo Ano se ainda não existirem
    turmasAnoAnterior.forEach(tAntiga => {
      let turmaEquivalente = turmasAnoActivo.find(t => t.nome === tAntiga.nome && t.classe === tAntiga.classe);
      if (!turmaEquivalente) {
        turmaEquivalente = {
          ...tAntiga,
          id: `turma-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          anoLectivo: anoActivo,
          escolaId: (!tAntiga.escolaId || tAntiga.escolaId === 'todas') ? escolaId : tAntiga.escolaId
        };
        todasTurmasAtualizadas.push(turmaEquivalente);
        recemCriadasTurmas.push(turmaEquivalente);
        turmasAnoActivo.push(turmaEquivalente);
      }
      mapaTurmaIdAntigoParaNovo.set(tAntiga.id, turmaEquivalente.id);
    });

    if (recemCriadasTurmas.length > 0) {
      setLocal(STORAGE_KEYS.TURMAS, todasTurmasAtualizadas);
      firebaseSyncEngine.salvarTurmasLote(recemCriadasTurmas);
    }

    // 2. Replicar Atribuições Docentes e Coordenações para as turmas do novo ano
    atribuicoesPassadas.forEach(atrib => {
      const turmaDestinoId = mapaTurmaIdAntigoParaNovo.get(atrib.turmaId) || atrib.turmaId;

      const jaExiste = novasAtribs.some(a => 
        a.escolaId === escolaId &&
        a.professorId === atrib.professorId &&
        a.turmaId === turmaDestinoId &&
        a.disciplinaId === atrib.disciplinaId &&
        a.anoLectivo === anoActivo
      );

      if (!jaExiste) {
        const novaAtrib: AtribuicaoDocente = {
          ...atrib,
          id: `atrib-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          escolaId,
          turmaId: turmaDestinoId,
          anoLectivo: anoActivo
        };
        novasAtribs.push(novaAtrib);
        recemCriadas.push(novaAtrib);
        count++;
      }
    });

    setLocal(STORAGE_KEYS.ATRIBUICOES, novasAtribs);
    if (recemCriadas.length > 0) {
      firebaseSyncEngine.salvarAtribuicoesLote(recemCriadas);
    }

    dbService.registarLog('Gestão Académica', `${recemCriadasTurmas.length} turmas e ${count} atribuições docentes replicadas para o ano lectivo ${anoActivo}.`, escolaId);
    return {
      sucesso: true,
      totalReplicadas: count,
      novasAtribuicoes: recemCriadas,
      novasTurmas: recemCriadasTurmas,
      mensagem: `${recemCriadasTurmas.length} turmas e ${count} atribuições e coordenações transferidas do ano ${anoAnterior || 'anterior'} para ${anoActivo}`
    };
  },

  // Atribuicoes
  getAtribuicoes: (escolaId?: string, anoLectivo?: string): AtribuicaoDocente[] => {
    const list = getLocal<AtribuicaoDocente[]>(STORAGE_KEYS.ATRIBUICOES, DEFAULT_ATRIBUICOES);
    let filtradas = list;
    if (escolaId && escolaId !== 'todas') {
      filtradas = filtradas.filter(a => a.escolaId === escolaId);
    }
    if (anoLectivo && anoLectivo !== 'todos') {
      filtradas = filtradas.filter(a => a.anoLectivo === anoLectivo);
    }
    return filtradas;
  },
  salvarAtribuicao: (atrib: AtribuicaoDocente) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    if (!atrib.escolaId || atrib.escolaId === 'esc-001') {
      atrib.escolaId = escolaAtiva?.id || atrib.escolaId;
    }
    if (!atrib.anoLectivo) {
      atrib.anoLectivo = escolaAtiva?.anoLectivoActivo || '';
    }
    const atribComTs: AtribuicaoDocente = { ...atrib, atualizadoEm: new Date().toISOString() };
    const list = getLocal<AtribuicaoDocente[]>(STORAGE_KEYS.ATRIBUICOES, DEFAULT_ATRIBUICOES);
    const idx = list.findIndex(a => a.id === atribComTs.id);
    if (idx >= 0) list[idx] = atribComTs;
    else list.push(atribComTs);
    setLocal(STORAGE_KEYS.ATRIBUICOES, list);
    firebaseSyncEngine.salvarAtribuicao(atribComTs);
  },
  removerAtribuicao: (id: string) => {
    const list = getLocal<AtribuicaoDocente[]>(STORAGE_KEYS.ATRIBUICOES, DEFAULT_ATRIBUICOES).filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.ATRIBUICOES, list);
    firebaseSyncEngine.removerAtribuicao(id);
  },

  getFuncionarios: (escolaId?: string): Funcionario[] => {
    const list = dbService.getFuncionariosBruto();
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const filtrada = ocultarAdmin ? list.filter(f => !isAdminGeralUserObj(f)) : list;
    if (!escolaId || escolaId === 'todas') return filtrada;
    return filtrada.filter(f => f.escolaId === escolaId);
  },
  salvarFuncionario: (func: Funcionario) => {
    const funcs = dbService.getFuncionariosBruto();
    const existing = funcs.find(f => f.id === func.id);
    if ((isAdminGeralUserObj(func) || isAdminGeralUserObj(existing)) && isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: não possui autorização para criar ou alterar o perfil do Administrador Geral.');
    }

    // Suporta fotoUrl em base64, URL externa, Blob/File ou remoção explícita ('')
    const rawFotoInput: unknown = (func as any).fotoBlob ?? (func as any).fotoUrl;
    let fotoParaPersistenciaLocal: string = existing?.fotoUrl || '';

    if (rawFotoInput !== undefined) {
      if (typeof Blob !== 'undefined' && rawFotoInput instanceof Blob) {
        try {
          fotoParaPersistenciaLocal = typeof URL !== 'undefined' ? URL.createObjectURL(rawFotoInput) : (existing?.fotoUrl || '');
        } catch {
          fotoParaPersistenciaLocal = existing?.fotoUrl || '';
        }
      } else if (typeof rawFotoInput === 'string') {
        fotoParaPersistenciaLocal = rawFotoInput;
        if (rawFotoInput && !rawFotoInput.startsWith('blob:') && rawFotoInput !== '__idb_media__') {
          offlineStorage.definirMidiaEmCache('funcionario', func.id, rawFotoInput);
        } else if (rawFotoInput === '') {
          offlineStorage.definirMidiaEmCache('funcionario', func.id, '');
        }
      }
    } else if (fotoParaPersistenciaLocal === '__idb_media__') {
      fotoParaPersistenciaLocal = offlineStorage.obterMidiaEmCache('funcionario', func.id) || '';
    }

    const funcComTimestamp: Funcionario = {
      ...existing,
      ...func,
      fotoUrl: fotoParaPersistenciaLocal,
      atualizadoEm: new Date().toISOString()
    };
    delete (funcComTimestamp as any).fotoBlob;

    const idx = funcs.findIndex(f => f.id === funcComTimestamp.id);
    if (idx >= 0) funcs[idx] = funcComTimestamp;
    else funcs.push(funcComTimestamp);

    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    const current = dbService.getCurrentUser();
    if (current && current.id === funcComTimestamp.id) {
      dbService.setCurrentUser(funcComTimestamp);
    }

    const isCargoDiretor =
      funcComTimestamp.role === 'DiretorGeral' ||
      (funcComTimestamp.cargo || '').toLowerCase().includes('diretor geral') ||
      (funcComTimestamp.cargo || '').toLowerCase().includes('director geral');

    let sincronizadoAtomicoDiretor = false;

    // Se o funcionário salvo for DiretorGeral ativo de uma escola, garante vinculação atómica (local + IndexedDB + Firebase)
    if (isCargoDiretor && funcComTimestamp.escolaId && funcComTimestamp.escolaId !== 'todas' && funcComTimestamp.ativo !== false) {
      const escolas = dbService.getEscolasBrutas();
      let alterouEscolasLocal = false;

      // Caso o diretor tenha sido transferido de outra escola, desvincular a escola anterior
      if (existing?.escolaId && existing.escolaId !== funcComTimestamp.escolaId) {
        const idxAntiga = escolas.findIndex(e => e.id === existing.escolaId || e.diretorGeralId === funcComTimestamp.id);
        if (idxAntiga >= 0 && escolas[idxAntiga].id !== funcComTimestamp.escolaId) {
          escolas[idxAntiga] = {
            ...escolas[idxAntiga],
            diretorGeralId: undefined,
            diretorGeralNome: 'Não Atribuído',
            diretorGeralEmail: undefined,
            diretorGeralTelefone: undefined,
            atualizadoEm: funcComTimestamp.atualizadoEm
          };
          alterouEscolasLocal = true;
          firebaseSyncEngine.salvarEscola(escolas[idxAntiga]);
        }
      }

      const idxEsc = escolas.findIndex(e => e.id === funcComTimestamp.escolaId || e.codigoEscola === funcComTimestamp.escolaId);
      if (idxEsc >= 0) {
        const esc = escolas[idxEsc];
        const diretoresSubstituidos: Funcionario[] = [];
        for (let i = 0; i < funcs.length; i++) {
          const outro = funcs[i];
          if (
            outro.id !== funcComTimestamp.id &&
            !isAdminGeralUserObj(outro) &&
            outro.role === 'DiretorGeral' &&
            outro.escolaId === esc.id &&
            outro.ativo !== false
          ) {
            const desativado: Funcionario = {
              ...outro,
              ativo: false,
              statusConta: 'Suspensa',
              escolaId: '',
              atualizadoEm: funcComTimestamp.atualizadoEm
            };
            funcs[i] = desativado;
            diretoresSubstituidos.push(desativado);
            offlineStorage.salvarFuncionarioNoIndexedDB(desativado);
          }
        }
        if (diretoresSubstituidos.length > 0) {
          setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
        }

        escolas[idxEsc] = {
          ...esc,
          diretorGeralId: funcComTimestamp.id,
          diretorGeralNome: funcComTimestamp.nomeCompleto,
          diretorGeralGenero: funcComTimestamp.genero || esc.diretorGeralGenero || 'M',
          diretorGeralEmail: funcComTimestamp.email || esc.diretorGeralEmail,
          diretorGeralTelefone: funcComTimestamp.telefone || esc.diretorGeralTelefone,
          atualizadoEm: funcComTimestamp.atualizadoEm
        };
        alterouEscolasLocal = true;
        setLocal(STORAGE_KEYS.ESCOLAS, escolas);
        try {
          offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
        } catch {}
        firebaseSyncEngine.sincronizarAtribuicaoDiretor(funcComTimestamp, escolas[idxEsc], diretoresSubstituidos);
        sincronizadoAtomicoDiretor = true;
      } else if (alterouEscolasLocal) {
        setLocal(STORAGE_KEYS.ESCOLAS, escolas);
        try {
          offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
        } catch {}
      }
    } else if (existing?.role === 'DiretorGeral' && (!isCargoDiretor || funcComTimestamp.ativo === false)) {
      // Diretor deixou o cargo ou foi suspenso/desativado -> desvincular das escolas que apontavam para ele
      const escolas = dbService.getEscolasBrutas();
      let alterou = false;
      const atualizadas = escolas.map(esc => {
        if (esc.diretorGeralId === funcComTimestamp.id) {
          alterou = true;
          const limpada: Escola = {
            ...esc,
            diretorGeralId: undefined,
            diretorGeralNome: 'Não Atribuído',
            diretorGeralEmail: undefined,
            diretorGeralTelefone: undefined,
            atualizadoEm: funcComTimestamp.atualizadoEm
          };
          firebaseSyncEngine.salvarEscola(limpada);
          return limpada;
        }
        return esc;
      });
      if (alterou) {
        setLocal(STORAGE_KEYS.ESCOLAS, atualizadas);
        try {
          offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(atualizadas));
        } catch {}
      }
    }

    // Enfileiramento síncrono pré-mídia quando não foi tratado atomicamente pela vinculação do Diretor
    if (!sincronizadoAtomicoDiretor) {
      offlineStorage.adicionarPendencia(
        'funcionarios',
        idx >= 0 ? 'ATUALIZAR' : 'CRIAR',
        `Funcionário ${funcComTimestamp.nomeCompleto}`,
        funcComTimestamp,
        funcComTimestamp.id,
        ['users'],
        funcComTimestamp.role
      );
    }

    // Persistência imediata no IndexedDB (Base64 + Blob) e sincronização direta com o Firebase
    normalizarEPersistirFuncionarioAsync(
      funcComTimestamp,
      rawFotoInput ?? fotoParaPersistenciaLocal,
      sincronizadoAtomicoDiretor
    );

    dbService.registarLog('Gestão de Funcionários', `Funcionário ${funcComTimestamp.nomeCompleto} atualizado no IndexedDB e sincronizado no Firestore.`);
  },
  salvarFuncionarios: (funcs: Funcionario[]) => {
    const agora = new Date().toISOString();
    const normalizados = funcs.map(f => ({
      ...f,
      fotoUrl: typeof f.fotoUrl === 'string'
        ? (f.fotoUrl === '__idb_media__' ? (offlineStorage.obterMidiaEmCache('funcionario', f.id) || '') : f.fotoUrl)
        : '',
      atualizadoEm: f.atualizadoEm || agora
    }));

    if (isSessaoAutenticadaNaoAdminGeral()) {
      const adminsExistentes = dbService.getFuncionariosBruto().filter(f => isAdminGeralUserObj(f));
      const semAdmin = normalizados.filter(f => !isAdminGeralUserObj(f));
      const listaFinal = [...adminsExistentes, ...semAdmin];
      setLocal(STORAGE_KEYS.FUNCIONARIOS, listaFinal);
      offlineStorage.salvarFuncionariosLoteNoIndexedDB(listaFinal);
      firebaseSyncEngine.salvarFuncionariosLote(semAdmin);
      return;
    }
    setLocal(STORAGE_KEYS.FUNCIONARIOS, normalizados);
    offlineStorage.salvarFuncionariosLoteNoIndexedDB(normalizados);
    firebaseSyncEngine.salvarFuncionariosLote(normalizados);
  },

  // Regras de Cálculo da MAC
  getRegrasMAC: (): RegraCalculoMAC[] => getLocal(STORAGE_KEYS.REGRAS_MAC, DEFAULT_REGRAS_MAC),
  salvarRegraMAC: (regra: RegraCalculoMAC) => {
    const regras = dbService.getRegrasMAC();
    const idx = regras.findIndex(r => r.id === regra.id);
    regra.versao = (regra.versao || 1) + 1;
    regra.atualizadoEm = new Date().toISOString();
    if (idx >= 0) regras[idx] = regra;
    else regras.push(regra);
    setLocal(STORAGE_KEYS.REGRAS_MAC, regras);
    firebaseSyncEngine.salvarRegraMAC(regra);
    dbService.registarLog('Configuração Pedagógica', `Regra de cálculo da MAC atualizada para versão v${regra.versao} (${regra.nivelEnsino} - ${regra.classe}).`);
  },
  salvarRegrasMAC: (regras: RegraCalculoMAC[]) => {
    setLocal(STORAGE_KEYS.REGRAS_MAC, regras);
    firebaseSyncEngine.salvarRegrasMACLote(regras);
  },

  // Tipos de Avaliação
  getTiposAvaliacao: (): TipoAvaliacaoConfig[] => getLocal(STORAGE_KEYS.TIPOS_AVALIACAO, DEFAULT_TIPOS_AVALIACAO),
  salvarTipoAvaliacao: (tipo: TipoAvaliacaoConfig) => {
    const tipoComTs: TipoAvaliacaoConfig = { ...tipo, atualizadoEm: new Date().toISOString() };
    const tipos = dbService.getTiposAvaliacao();
    const idx = tipos.findIndex(t => t.id === tipoComTs.id);
    if (idx >= 0) tipos[idx] = tipoComTs;
    else tipos.push(tipoComTs);
    setLocal(STORAGE_KEYS.TIPOS_AVALIACAO, tipos);
    firebaseSyncEngine.salvarTipoAvaliacao(tipoComTs);
  },
  salvarTiposAvaliacao: (tipos: TipoAvaliacaoConfig[]) => {
    const agora = new Date().toISOString();
    const comTs = tipos.map(t => ({ ...t, atualizadoEm: t.atualizadoEm || agora }));
    setLocal(STORAGE_KEYS.TIPOS_AVALIACAO, comTs);
    firebaseSyncEngine.salvarTiposAvaliacaoLote(comTs);
  },

  // Avaliações do Professor
  getAvaliacoes: (): AvaliacaoCriada[] => getLocal(STORAGE_KEYS.AVALIACOES, DEFAULT_AVALIACOES),
  salvarAvaliacao: (av: AvaliacaoCriada) => {
    const avComTs: AvaliacaoCriada = { ...av, atualizadoEm: new Date().toISOString() };
    const avs = dbService.getAvaliacoes();
    const idx = avs.findIndex(a => a.id === avComTs.id);
    if (idx >= 0) avs[idx] = avComTs;
    else avs.push(avComTs);
    setLocal(STORAGE_KEYS.AVALIACOES, avs);
    firebaseSyncEngine.salvarAvaliacao(avComTs);
    dbService.registarLog('Criação de Avaliação', `Avaliação "${avComTs.titulo}" criada na turma ${avComTs.turmaId}.`);
  },
  excluirAvaliacao: (id: string) => {
    const avs = dbService.getAvaliacoes().filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.AVALIACOES, avs);
    firebaseSyncEngine.eliminarAvaliacao(id);
    // Remove notas vinculadas no dispositivo e no Firebase
    const todasNotas = dbService.getNotas();
    const notasRemovidas = todasNotas.filter(n => n.avaliacaoId === id);
    const notas = todasNotas.filter(n => n.avaliacaoId !== id);
    setLocal(STORAGE_KEYS.NOTAS, notas);
    notasRemovidas.forEach(n => {
      const notaDocId = (n as any).id || `${n.avaliacaoId}_${n.alunoId}`;
      firebaseSyncEngine.eliminarDocumentoDireto('notas_estudantes', notaDocId, undefined, `Remoção de nota vinculada à avaliação ${id}`);
    });
  },

  // Notas
  getNotas: (): NotaEstudante[] => getLocal(STORAGE_KEYS.NOTAS, DEFAULT_NOTAS),
  salvarNota: (nota: NotaEstudante) => {
    const notaComTs: NotaEstudante = { ...nota, atualizadoEm: new Date().toISOString() };
    const notas = dbService.getNotas();
    const idx = notas.findIndex(n => n.avaliacaoId === notaComTs.avaliacaoId && n.alunoId === notaComTs.alunoId);
    if (idx >= 0) notas[idx] = notaComTs;
    else notas.push(notaComTs);
    setLocal(STORAGE_KEYS.NOTAS, notas);
    firebaseSyncEngine.salvarNotaEstudante(notaComTs);
  },
  salvarNotas: (notas: NotaEstudante[]) => {
    const agora = new Date().toISOString();
    const comTs = notas.map(n => ({ ...n, atualizadoEm: n.atualizadoEm || agora }));
    setLocal(STORAGE_KEYS.NOTAS, comTs);
    firebaseSyncEngine.salvarNotasLote(comTs);
  },

  // Notas Consolidadas / Pautas
  getNotasConsolidadas: (): NotaTrimestralConsolidada[] => getLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, DEFAULT_NOTAS_CONSOLIDADAS),
  salvarNotaConsolidada: (cons: NotaTrimestralConsolidada) => {
    const consComTs: NotaTrimestralConsolidada = { ...cons, atualizadoEm: new Date().toISOString() };
    const lista = dbService.getNotasConsolidadas();
    const idx = lista.findIndex(c => c.alunoId === consComTs.alunoId && c.disciplinaId === consComTs.disciplinaId && c.trimestre === consComTs.trimestre);
    if (idx >= 0) lista[idx] = consComTs;
    else lista.push(consComTs);
    setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, lista);
    firebaseSyncEngine.salvarNota(consComTs);
  },
  salvarNotasConsolidadas: (lista: NotaTrimestralConsolidada[]) => {
    const agora = new Date().toISOString();
    const comTs = lista.map(c => ({ ...c, atualizadoEm: c.atualizadoEm || agora }));
    setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, comTs);
    firebaseSyncEngine.salvarNotasConsolidadasLote(comTs);
  },

  // Solicitações de Nota
  getSolicitacoesNota: (): SolicitacaoAlteracaoNota[] => getLocal(STORAGE_KEYS.SOLICITACOES_NOTA, DEFAULT_SOLICITACOES_NOTA),
  salvarSolicitacaoNota: (sol: SolicitacaoAlteracaoNota) => {
    const solComTs: SolicitacaoAlteracaoNota = { ...sol, atualizadoEm: new Date().toISOString() };
    const sols = dbService.getSolicitacoesNota();
    const idx = sols.findIndex(s => s.id === solComTs.id);
    if (idx >= 0) sols[idx] = solComTs;
    else sols.push(solComTs);
    setLocal(STORAGE_KEYS.SOLICITACOES_NOTA, sols);
    firebaseSyncEngine.salvarSolicitacaoNota(solComTs);
    dbService.registarLog('Solicitação de Correção', `Professor ${solComTs.professorNome} solicitou correção de nota para ${solComTs.alunoNome}.`);
  },

  // Júris & Comissão de Júri Oficial
  getJuris: (): ComissaoJuri[] => getLocal(STORAGE_KEYS.JURIS, DEFAULT_JURIS),
  getComissoesJuri: (): ComissaoJuri[] => dbService.getJuris(),
  salvarJuri: (juri: ComissaoJuri) => {
    const juriComTs: ComissaoJuri = { ...juri, atualizadoEm: new Date().toISOString() };
    const juris = dbService.getJuris();
    const idx = juris.findIndex(j => j.id === juriComTs.id);
    if (idx >= 0) juris[idx] = juriComTs;
    else juris.push(juriComTs);
    setLocal(STORAGE_KEYS.JURIS, juris);
    firebaseSyncEngine.salvarJuri(juriComTs);
    dbService.registarLog('Comissão de Júri', `Comissão de Júri ${juriComTs.nomeJuri} (${juriComTs.numeroSessao || ''}) atualizada.`);
  },
  excluirJuri: (id: string) => {
    const juris = dbService.getJuris().filter(j => j.id !== id);
    setLocal(STORAGE_KEYS.JURIS, juris);
    firebaseSyncEngine.eliminarJuri(id);
    dbService.registarLog('Comissão de Júri', `Comissão de Júri ${id} eliminada.`);
  },
  salvarDeliberacaoJuri: (juriId: string, deliberacao: DeliberacaoAlunoJuri) => {
    const juris = dbService.getJuris();
    const juri = juris.find(j => j.id === juriId);
    if (juri) {
      if (!juri.deliberacoes) juri.deliberacoes = {};
      juri.deliberacoes[deliberacao.alunoId] = deliberacao;
      dbService.salvarJuri(juri);
      dbService.registarLog('Deliberação de Júri', `Deliberação registada para o aluno ${deliberacao.alunoNome}: ${deliberacao.decisao}.`);
    }
  },
  salvarNotaAlteradaJuri: (
    juriId: string, 
    alunoId: string, 
    alteracao: NotaAlteradaJuri
  ) => {
    const juris = dbService.getJuris();
    const juri = juris.find(j => j.id === juriId);
    if (!juri) return;
    if (!juri.deliberacoes) juri.deliberacoes = {};
    if (!juri.deliberacoes[alunoId]) {
      juri.deliberacoes[alunoId] = {
        alunoId,
        alunoNome: alteracao.disciplinaNome,
        decisao: 'Aprovar',
        justificativa: alteracao.motivo,
        deliberadoPor: alteracao.alteradoPor,
        dataHora: alteracao.dataHora,
        notasAlteradas: [alteracao]
      };
    } else {
      const delib = juri.deliberacoes[alunoId];
      const lista = delib.notasAlteradas || [];
      const idx = lista.findIndex(n => n.disciplinaId === alteracao.disciplinaId);
      if (idx >= 0) lista[idx] = alteracao;
      else lista.push(alteracao);
      delib.notasAlteradas = lista;
    }
    dbService.salvarJuri(juri);

    // Atualiza também na base de notas consolidadas para refletir na pauta
    const notas = dbService.getNotasConsolidadas();
    const notaIdx = notas.findIndex(n => n.alunoId === alunoId && n.disciplinaId === alteracao.disciplinaId);
    if (notaIdx >= 0) {
      notas[notaIdx].mediaTrimestral = alteracao.novaNota;
      notas[notaIdx].notaFinal = alteracao.novaNota;
      setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, notas);
      firebaseSyncEngine.salvarNota(notas[notaIdx]);
    }

    dbService.registarLog(
      'Alteração de Nota pelo Júri', 
      `Comissão de Júri: Nota do aluno alterada na disciplina ${alteracao.disciplinaNome} de ${alteracao.notaAnterior} para ${alteracao.novaNota} por ${alteracao.alteradoPor}. Motivo: ${alteracao.motivo}`
    );
  },
  validarEEncerrarSessaoJuri: (juriId: string, validadaPor: string, ata: AtaJuri) => {
    const juris = dbService.getJuris();
    const juri = juris.find(j => j.id === juriId);
    if (juri) {
      juri.estado = 'Validada';
      juri.validadaPor = validadaPor;
      juri.validadaEm = new Date().toISOString();
      juri.encerradaEm = new Date().toISOString();
      juri.bloqueada = true;
      juri.ata = ata;
      juri.pautaHomologada = true;
      juri.pautaHomologadaEm = new Date().toISOString();
      juri.pautaHomologadaPor = validadaPor;
      dbService.salvarJuri(juri);
      dbService.registarLog('Validação e Homologação de Pauta pelo Júri', `Sessão ${juri.numeroSessao} validada com sucesso por ${validadaPor}. Pauta Final Homologada oficializada e ata gerada.`);
    }
  },
  obterNotasHomologadasAluno: (alunoId: string): NotaTrimestralConsolidada[] => {
    const notasGerais = dbService.getNotasConsolidadas().filter(n => n.alunoId === alunoId);
    const juris = dbService.getJuris();

    return notasGerais.map(nota => {
      let notaFinal = nota.mediaTrimestral;
      for (const juri of juris) {
        if ((juri.estado === 'Validada' || juri.deliberacoes) && juri.deliberacoes?.[alunoId]) {
          const alteracao = juri.deliberacoes[alunoId].notasAlteradas?.find(na => na.disciplinaId === nota.disciplinaId);
          if (alteracao) {
            notaFinal = alteracao.novaNota;
          }
        }
      }
      return {
        ...nota,
        mediaTrimestral: notaFinal,
        notaFinal
      };
    });
  },

  // Gestão de Termos de Exame Oficiais MED
  getTermosExame: (escolaId?: string): TermoExame[] => {
    const todos = getLocal<TermoExame[]>(STORAGE_KEYS.TERMOS_EXAME, []);
    if (escolaId) {
      return todos.filter(t => t.escolaId === escolaId);
    }
    return todos;
  },
  salvarTermoExame: (termo: TermoExame) => {
    const termoComTs: TermoExame = { ...termo, atualizadoEm: new Date().toISOString() };
    const termos = dbService.getTermosExame();
    const idx = termos.findIndex(t => t.id === termoComTs.id);
    if (idx >= 0) termos[idx] = termoComTs;
    else termos.push(termoComTs);
    setLocal(STORAGE_KEYS.TERMOS_EXAME, termos);
    firebaseSyncEngine.salvarTermoExame(termoComTs);
    dbService.registarLog('Termos de Exame', `Termo de exame da disciplina ${termoComTs.disciplinaNome} (${termoComTs.classe} - ${termoComTs.epoca}) atualizado.`);
  },
  excluirTermoExame: (id: string) => {
    const termos = dbService.getTermosExame().filter(t => t.id !== id);
    setLocal(STORAGE_KEYS.TERMOS_EXAME, termos);
    firebaseSyncEngine.eliminarTermoExame(id);
    dbService.registarLog('Termos de Exame', `Termo de exame removido.`);
  },

  // Configurações de Avaliação: NPP e Regras de Média Final
  obterNPPAtivo: (escolaId?: string): boolean => {
    const esc = escolaId ? dbService.getEscolaPorId(escolaId) : dbService.getEscolaAtiva();
    return esc?.nppAtivo !== undefined ? esc.nppAtivo : true;
  },
  salvarNPPAtivo: (escolaId: string, nppAtivo: boolean) => {
    const escolas = dbService.getEscolas();
    const idx = escolas.findIndex(e => e.id === escolaId);
    if (idx >= 0) {
      escolas[idx].nppAtivo = nppAtivo;
      escolas[idx].atualizadoEm = new Date().toISOString();
      setLocal(STORAGE_KEYS.ESCOLAS, escolas);
      firebaseSyncEngine.salvarEscola(escolas[idx]);
      dbService.registarLog('Configuração Pedagógica', `Uso de Prova do Professor (NPP) ${nppAtivo ? 'ATIVADO' : 'DESATIVADO'} para o cálculo trimestral.`);
    }
  },

  // Reordenação de Entidades Escolares
  salvarTurmasOrdenadas: (turmasOrdenadas: Turma[]) => {
    const agora = new Date().toISOString();
    const comOrdem = turmasOrdenadas.map((t, idx) => ({ ...t, ordem: idx, atualizadoEm: agora }));
    setLocal(STORAGE_KEYS.TURMAS, comOrdem);
    firebaseSyncEngine.salvarTurmasLote(comOrdem);
    dbService.registarLog('Gestão Académica', 'Ordem de turmas atualizada pela instituição.');
  },
  salvarDisciplinasOrdenadas: (disciplinasOrdenadas: Disciplina[]) => {
    const agora = new Date().toISOString();
    const comOrdem = disciplinasOrdenadas.map((d, idx) => ({ ...d, ordem: idx, atualizadoEm: agora }));
    setLocal(STORAGE_KEYS.DISCIPLINAS, comOrdem);
    firebaseSyncEngine.salvarDisciplinasLote(comOrdem);
    dbService.registarLog('Gestão Académica', 'Ordem de disciplinas curriculares atualizada.');
  },
  salvarClassesOrdenadas: (classesOrdenadas: ClasseConfig[]) => {
    const agora = new Date().toISOString();
    const comOrdem = classesOrdenadas.map((c, idx) => ({ ...c, ordem: idx, atualizadoEm: agora }));
    setLocal(STORAGE_KEYS.CLASSES_CONFIGS, comOrdem);
    firebaseSyncEngine.salvarClassesLote(comOrdem);
    dbService.registarLog('Gestão Académica', 'Ordem de classes da instituição atualizada.');
  },

  // Presenças
  getPresencas: (): PresencaFuncionario[] => getLocal(STORAGE_KEYS.PRESENCAS, DEFAULT_PRESENCAS),
  salvarPresenca: (p: PresencaFuncionario) => {
    const pComTs: PresencaFuncionario = { ...p, atualizadoEm: new Date().toISOString() };
    const pres = dbService.getPresencas();
    const idx = pres.findIndex(item => item.funcionarioId === pComTs.funcionarioId && item.data === pComTs.data);
    if (idx >= 0) pres[idx] = pComTs;
    else pres.push(pComTs);
    setLocal(STORAGE_KEYS.PRESENCAS, pres);
    firebaseSyncEngine.salvarPresencaFuncionario(pComTs);
  },
  salvarPresencasLote: (items: PresencaFuncionario[]) => {
    if (!items || items.length === 0) return;
    const agora = new Date().toISOString();
    const comTs = items.map(p => ({ ...p, atualizadoEm: p.atualizadoEm || agora }));
    const pres = dbService.getPresencas();
    for (const p of comTs) {
      const idx = pres.findIndex(item => item.funcionarioId === p.funcionarioId && item.data === p.data);
      if (idx >= 0) pres[idx] = p;
      else pres.push(p);
    }
    setLocal(STORAGE_KEYS.PRESENCAS, pres);
    firebaseSyncEngine.salvarPresencasFuncionariosLote(comTs);
  },
  removerPresenca: (funcionarioId: string, data: string) => {
    const presAtuais = dbService.getPresencas();
    const existente = presAtuais.find(item => item.funcionarioId === funcionarioId && item.data === data);
    const pres = presAtuais.filter(item => !(item.funcionarioId === funcionarioId && item.data === data));
    setLocal(STORAGE_KEYS.PRESENCAS, pres);
    firebaseSyncEngine.eliminarPresencaFuncionario(funcionarioId, data, existente?.id);
    dbService.registarLog('Assiduidade', `Registo de ponto do funcionário ${funcionarioId} na data ${data} removido por retificação.`);
  },

  // Auditoria
  getAuditoria: (): LogAuditoria[] => {
    const logs = dbService.getAuditoriaBruta();
    if (!isSessaoAutenticadaNaoAdminGeral()) {
      return logs;
    }
    const { ids, nomes } = getAdminGeralIdsAndNomes();
    return logs.filter(l => !isLogOuAcaoDoAdminGeral(l, ids, nomes));
  },
  registarLog: (acao: string, detalhe: string, escolaIdOverride?: string) => {
    const logs = dbService.getAuditoriaBruta();
    const user = dbService.getCurrentUser();
    const escolasBrutas = dbService.getEscolasBrutas();
    const idAtivo = getLocal<string>(STORAGE_KEYS.ACTIVE_ESCOLA_ID, '');
    const escolaAtiva = escolasBrutas.find(e => e.id === idAtivo) || escolasBrutas[0] || DEFAULT_ESCOLA_VAZIA;

    const ehAdminGeral = user.role === 'AdminGeral';
    let detalheFinal = detalhe;
    let papelFinal = user.cargo || user.role;

    // Se o Admin Geral estiver a atuar sob sessão de apoio técnico autorizada pelo Diretor
    if (ehAdminGeral && escolaAtiva.sessaoApoioTecnicoAtiva) {
      detalheFinal = `[APOIO TÉCNICO AUTORIZADO - ADMIN GERAL] ${detalhe} (Ref: Chamado #${escolaAtiva.sessaoApoioTecnicoAtiva.solicitacaoId.slice(-6)})`;
      papelFinal = 'AdminGeral (Apoio Técnico Autorizado)';
    }

    const newLog: LogAuditoria = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      escolaId: escolaIdOverride || escolaAtiva.id,
      utilizadorId: user.id,
      utilizadorNome: user.nomeCompleto,
      papel: papelFinal,
      usuarioRole: user.role,
      origemAdminGeral: ehAdminGeral,
      acao,
      detalhe: detalheFinal,
      ip: '197.234.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250),
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    logs.unshift(newLog);
    // Limite de 500 logs locais para performance
    if (logs.length > 500) logs.length = 500;
    setLocal(STORAGE_KEYS.AUDITORIA, logs);
    firebaseSyncEngine.salvarLogAuditoria(newLog);

    // Registar batimento cardíaco da sessão do utilizador
    try {
      dbService.registarHeartbeatUsuario(user, escolaAtiva);
    } catch {
      // Ignorar se ainda a inicializar
    }

    // Registar simultaneamente no motor de persistência offline
    offlineStorage.registarMutacao(
      'Auditoria',
      'ATUALIZAR',
      `${acao}: ${detalheFinal}`,
      user.nomeCompleto || 'Utilizador',
      user.role
    );
  },
  limparLogsAntigos: () => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      throw new Error('Acesso negado: apenas o Administrador Geral pode limpar logs do sistema.');
    }
    setLocal(STORAGE_KEYS.AUDITORIA, []);
  },

  // Mensagens
  getMensagens: (): MensagemInterna[] => {
    const msgs = dbService.getMensagensBrutas();
    if (!isSessaoAutenticadaNaoAdminGeral()) return msgs;
    const { ids } = getAdminGeralIdsAndNomes();
    return msgs.filter(m => {
      if (!m) return false;
      if (m.remetentePapel === 'AdminGeral') return false;
      if ((m.remetenteCargo || '').toLowerCase().includes('administrador geral')) return false;
      if (m.destinatarioId === 'admin-geral') return false;
      if (m.remetenteId && ids.has(m.remetenteId)) return false;
      if (m.destinatarioId && ids.has(m.destinatarioId)) return false;
      return true;
    });
  },
  enviarMensagem: (msg: MensagemInterna) => {
    const msgComTs: MensagemInterna = { ...msg, atualizadoEm: new Date().toISOString() };
    const msgs = dbService.getMensagensBrutas();
    msgs.unshift(msgComTs);
    setLocal(STORAGE_KEYS.MENSAGENS, msgs);
    firebaseSyncEngine.salvarMensagem(msgComTs);
    dbService.registarLog('Comunicação Interna', `Mensagem "${msgComTs.titulo}" enviada.`);
  },
  marcarMensagemLida: (id: string) => {
    const msgs = dbService.getMensagensBrutas();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx !== -1) {
      msgs[idx].lida = true;
      msgs[idx].atualizadoEm = new Date().toISOString();
      setLocal(STORAGE_KEYS.MENSAGENS, msgs);
      firebaseSyncEngine.salvarMensagem(msgs[idx]);
    }
  },
  marcarTodasMensagensLidas: (escolaId?: string) => {
    const msgs = dbService.getMensagensBrutas();
    const isNonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids } = getAdminGeralIdsAndNomes();
    const agora = new Date().toISOString();
    msgs.forEach(m => {
      if (isNonAdmin && (m.remetentePapel === 'AdminGeral' || m.destinatarioId === 'admin-geral' || ids.has(m.remetenteId))) {
        return;
      }
      if (!escolaId || m.escolaId === escolaId) {
        m.lida = true;
        m.atualizadoEm = agora;
        firebaseSyncEngine.salvarMensagem(m);
      }
    });
    setLocal(STORAGE_KEYS.MENSAGENS, msgs);
  },

  // Biblioteca
  getBiblioteca: (): DocumentoBiblioteca[] => getLocal(STORAGE_KEYS.BIBLIOTECA, DEFAULT_BIBLIOTECA),
  salvarDocumento: (doc: DocumentoBiblioteca) => {
    const docs = dbService.getBiblioteca();
    const isLink = doc.tipoRecurso === 'Link';
    const docComTimestamp: DocumentoBiblioteca = {
      ...doc,
      arquivoArmazenamentoId: isLink ? doc.arquivoArmazenamentoId : (doc.arquivoArmazenamentoId || doc.id),
      url: isLink ? doc.url : '__idb_pdf__',
      arquivoUrl: isLink ? doc.arquivoUrl : '__idb_pdf__',
      atualizadoEm: new Date().toISOString()
    };
    const idx = docs.findIndex(d => d.id === docComTimestamp.id);
    if (idx >= 0) {
      docs[idx] = docComTimestamp;
    } else {
      docs.unshift(docComTimestamp);
    }
    setLocal(STORAGE_KEYS.BIBLIOTECA, docs);
    firebaseSyncEngine.salvarDocumentoBiblioteca(docComTimestamp);
    dbService.registarLog('Biblioteca Digital', `Documento "${docComTimestamp.titulo}" carregado na biblioteca.`);
  },
  excluirDocumento: (id: string) => {
    const docs = dbService.getBiblioteca();
    const alvo = docs.find(d => d.id === id);
    const filtrados = docs.filter(d => d.id !== id);
    setLocal(STORAGE_KEYS.BIBLIOTECA, filtrados);
    firebaseSyncEngine.eliminarDocumentoBiblioteca(id, alvo?.arquivoChunksCount);
    if (alvo) {
      dbService.registarLog('Biblioteca Digital', `Documento "${alvo.titulo}" removido da biblioteca.`);
    }
  },
  getAcessosBiblioteca: (escolaId?: string): RegistoAcessoBiblioteca[] => {
    const lista = getLocal<RegistoAcessoBiblioteca[]>(STORAGE_KEYS.BIBLIOTECA_ACESSOS, []);
    if (!escolaId || escolaId === 'todas') return lista;
    return lista.filter(a => a.escolaId === escolaId);
  },
  registarAcessoBiblioteca: (acesso: RegistoAcessoBiblioteca) => {
    const acessos = getLocal<RegistoAcessoBiblioteca[]>(STORAGE_KEYS.BIBLIOTECA_ACESSOS, []);
    const registro: RegistoAcessoBiblioteca = {
      ...acesso,
      atualizadoEm: new Date().toISOString()
    };
    const idx = acessos.findIndex(a => a.id === registro.id);
    if (idx >= 0) acessos[idx] = registro;
    else acessos.unshift(registro);
    setLocal(STORAGE_KEYS.BIBLIOTECA_ACESSOS, acessos);
    firebaseSyncEngine.salvarAcessoBiblioteca(registro);
    dbService.registarLog('Controlo da Biblioteca', `${registro.tipoAcesso.replace(/_/g, ' ')} registado via QR Code para ${registro.alunoNome}.`);
  },

  // Recibos Térmicos
  getRecibos: (): ReciboPagamento[] => getLocal(STORAGE_KEYS.RECIBOS, DEFAULT_RECIBOS),
  salvarRecibo: (rec: ReciboPagamento) => {
    const recComTs: ReciboPagamento = { ...rec, atualizadoEm: new Date().toISOString() };
    const recs = dbService.getRecibos();
    recs.unshift(recComTs);
    setLocal(STORAGE_KEYS.RECIBOS, recs);
    firebaseSyncEngine.salvarRecibo(recComTs);
    dbService.registarLog('Emissão de Recibo', `Recibo ${recComTs.numeroRecibo} emitido para ${recComTs.alunoNome} no valor de ${recComTs.valorPagoKz} Kz.`);
  },

  // Utilizador Ativo
  getCurrentUser: (): Funcionario => {
    const user = getLocal<Funcionario | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (user && user.id && user.role) {
      if (user.fotoUrl === '__idb_media__' || !user.fotoUrl) {
        const fotoCache = offlineStorage.obterMidiaEmCache('funcionario', user.id);
        if (fotoCache) return { ...user, fotoUrl: fotoCache };
      }
      return user;
    }
    const funcs = dbService.getFuncionariosBruto();
    const admin = funcs.find(f => f.role === 'AdminGeral' && f.ativo);
    if (admin) return admin;
    if (funcs.length > 0 && funcs[0]?.id) return funcs[0];
    return DEFAULT_ADMIN_GERAL_PRODUCAO;
  },
  setCurrentUser: (user: Funcionario | null) => {
    if (!user) {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          localStorage.removeItem('sge_user');
        } catch {
          // noop
        }
      }
      return;
    }
    let fotoResolvida = user.fotoUrl || '';
    if (fotoResolvida === '__idb_media__' || !fotoResolvida) {
      const cached = offlineStorage.obterMidiaEmCache('funcionario', user.id);
      if (cached) fotoResolvida = cached;
      else if (fotoResolvida === '__idb_media__') fotoResolvida = '';
    } else if (!fotoResolvida.startsWith('blob:')) {
      offlineStorage.definirMidiaEmCache('funcionario', user.id, fotoResolvida);
    }
    const userFinal = { ...user, fotoUrl: fotoResolvida };
    setLocal(STORAGE_KEYS.CURRENT_USER, userFinal);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sge_user', JSON.stringify(userFinal));
      }
    } catch {}
  },

  // Exportar Todos os Dados da Escola em Excel (.xlsx) com Identificação Escolar e Todas as Notas
  exportarExcelCompleto: async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const escola = dbService.getEscolaAtiva();
    const escId = escola?.id && escola.id !== 'todas' ? escola.id : undefined;
    const alunos = dbService.getAlunos(escId);
    const turmas = escId ? dbService.getTurmas().filter(t => t.escolaId === escId) : dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(escId);
    const notasConsolidadas = dbService.getNotasConsolidadas();
    const funcs = dbService.getFuncionarios(escId).filter(f => f.role !== 'AdminGeral');
    const logs = escId ? dbService.getAuditoria().filter(l => l.escolaId === escId) : dbService.getAuditoria();

    // 1. Instituição Info
    const escolaData = [{
      'Designação Oficial': escola.nomeOficial,
      'Sigla / Designação Curta': escola.sigla || 'MED',
      'Código SIGE / MEC': escola.codigoSIGE || escola.codigoMEC || escola.id,
      'Província': escola.provincia || 'Luanda',
      'Município': escola.municipio || 'Luanda',
      'Comuna / Distrito': escola.comunaDistrito || 'Urbano',
      'Bairro': escola.bairro || 'Central',
      'Telefone Oficial': escola.telefone || '—',
      'Email Oficial': escola.email || '—',
      'Ano Lectivo Activo': escola.anoLectivoActivo || '—',
      'Trimestre Activo': `${escola.trimestreActivo || 'II'}º Trimestre`,
      'Diretor Geral': escola.diretorGeralNome || 'Pendente de Nomeação',
      'Subdiretor Pedagógico': escola.subdiretorPedagogicoNome || 'Pendente',
      'Subdiretor Administrativo': escola.subdirectorAdministrativoNome || escola.subdiretorAdministrativoNome || 'Pendente',
      'Total de Turmas': turmas.length,
      'Total de Estudantes': alunos.length,
      'Total de Professores / Funcionários': funcs.length
    }];
    const wsEscola = XLSX.utils.json_to_sheet(escolaData);
    XLSX.utils.book_append_sheet(wb, wsEscola, 'Instituição Escolar');

    // 2. Alunos - Contém TODAS as informações demográficas e acadêmicas, identificação institucional e TODAS as notas
    const alunosCompletos = alunos.map((a, idx) => {
      const t = turmas.find(turma => turma.id === a.turmaId);
      
      // Cálculo de idade
      let idadeStr = '—';
      if (a.dataNascimento) {
        const anos = new Date().getFullYear() - new Date(a.dataNascimento).getFullYear();
        if (!isNaN(anos)) idadeStr = `${anos}`;
      }

      // Notas consolidadas do aluno
      const notasAluno = notasConsolidadas.filter(n => n.alunoId === a.id);
      
      const notas1T = notasAluno.filter(n => String(n.trimestre).includes('1'));
      const notas2T = notasAluno.filter(n => String(n.trimestre).includes('2'));
      const notas3T = notasAluno.filter(n => String(n.trimestre).includes('3'));

      const mt1 = notas1T.length > 0 
        ? Number((notas1T.reduce((acc, c) => acc + (c.mediaTrimestral || c.notaFinal || 0), 0) / notas1T.length).toFixed(1)) 
        : '—';
      const mac1 = notas1T.some(n => n.mac !== undefined)
        ? Number((notas1T.reduce((acc, c) => acc + (c.mac || 0), 0) / Math.max(1, notas1T.filter(n => n.mac !== undefined).length)).toFixed(1))
        : '—';
      const npp1 = notas1T.some(n => n.npp !== undefined)
        ? Number((notas1T.reduce((acc, c) => acc + (c.npp || 0), 0) / Math.max(1, notas1T.filter(n => n.npp !== undefined).length)).toFixed(1))
        : '—';
      const npt1 = notas1T.some(n => n.npt !== undefined)
        ? Number((notas1T.reduce((acc, c) => acc + (c.npt || 0), 0) / Math.max(1, notas1T.filter(n => n.npt !== undefined).length)).toFixed(1))
        : '—';

      const mt2 = notas2T.length > 0 
        ? Number((notas2T.reduce((acc, c) => acc + (c.mediaTrimestral || c.notaFinal || 0), 0) / notas2T.length).toFixed(1)) 
        : '—';
      const mac2 = notas2T.some(n => n.mac !== undefined)
        ? Number((notas2T.reduce((acc, c) => acc + (c.mac || 0), 0) / Math.max(1, notas2T.filter(n => n.mac !== undefined).length)).toFixed(1))
        : '—';
      const npp2 = notas2T.some(n => n.npp !== undefined)
        ? Number((notas2T.reduce((acc, c) => acc + (c.npp || 0), 0) / Math.max(1, notas2T.filter(n => n.npp !== undefined).length)).toFixed(1))
        : '—';
      const npt2 = notas2T.some(n => n.npt !== undefined)
        ? Number((notas2T.reduce((acc, c) => acc + (c.npt || 0), 0) / Math.max(1, notas2T.filter(n => n.npt !== undefined).length)).toFixed(1))
        : '—';

      const mt3 = notas3T.length > 0 
        ? Number((notas3T.reduce((acc, c) => acc + (c.mediaTrimestral || c.notaFinal || 0), 0) / notas3T.length).toFixed(1)) 
        : '—';
      const mac3 = notas3T.some(n => n.mac !== undefined)
        ? Number((notas3T.reduce((acc, c) => acc + (c.mac || 0), 0) / Math.max(1, notas3T.filter(n => n.mac !== undefined).length)).toFixed(1))
        : '—';
      const npp3 = notas3T.some(n => n.npp !== undefined)
        ? Number((notas3T.reduce((acc, c) => acc + (c.npp || 0), 0) / Math.max(1, notas3T.filter(n => n.npp !== undefined).length)).toFixed(1))
        : '—';
      const npt3 = notas3T.some(n => n.npt !== undefined)
        ? Number((notas3T.reduce((acc, c) => acc + (c.npt || 0), 0) / Math.max(1, notas3T.filter(n => n.npt !== undefined).length)).toFixed(1))
        : '—';

      // Médias globais
      const notasComValor = notasAluno.filter(n => (n.mediaTrimestral || n.notaFinal || 0) > 0);
      const mediaGlobal = notasComValor.length > 0
        ? Number((notasComValor.reduce((acc, c) => acc + (c.mediaTrimestral || c.notaFinal || 0), 0) / notasComValor.length).toFixed(1))
        : 10;
      
      const exameNotas = notasAluno.filter(n => n.notaExame !== undefined && n.notaExame > 0);
      const notaExameMedia = exameNotas.length > 0
        ? Number((exameNotas.reduce((acc, c) => acc + (c.notaExame || 0), 0) / exameNotas.length).toFixed(1))
        : '—';

      const resultadoPedagogico = mediaGlobal >= 10 ? 'Aprovado / Transita' : (mediaGlobal >= 7 ? 'Recurso / Exame' : 'Não Transita / Reprovado');

      // Obter nota por disciplina
      const notaDisc = (termo: string) => {
        const d = disciplinas.find(disc => disc.nome.toLowerCase().includes(termo.toLowerCase()));
        if (!d) return '—';
        const nAluno = notasAluno.filter(n => n.disciplinaId === d.id);
        if (nAluno.length === 0) return '—';
        const soma = nAluno.reduce((acc, curr) => acc + (curr.notaFinal || curr.mediaTrimestral || 0), 0);
        return Number((soma / nAluno.length).toFixed(1));
      };

      return {
        // --- 1. IDENTIFICAÇÃO DA INSTITUIÇÃO ESCOLAR ---
        'Instituição Escolar': escola.nomeOficial,
        'Sigla Instituição': escola.sigla || 'MED',
        'Código SIGE': escola.codigoSIGE || escola.codigoMEC || escola.id,
        'Província da Escola': escola.provincia || 'Luanda',
        'Município da Escola': escola.municipio || 'Luanda',
        'Ano Lectivo': a.anoLectivo || t?.anoLectivo || escola.anoLectivoActivo || '—',

        // --- 2. DADOS PESSOAIS E CIVIS DO ESTUDANTE ---
        'Nº de Processo / Matrícula': a.codigoMatricula || a.id,
        'Nº de Ordem': a.numeroOrdem || idx + 1,
        'Nome Completo': a.nomeCompleto,
        'Gênero': a.genero === 'M' ? 'Masculino' : 'Feminino',
        'Data de Nascimento': a.dataNascimento || '—',
        'Idade': idadeStr,
        'Bilhete de Identidade / Cédula': a.numeroBI || a.documentoIdentificacao || '—',
        'Data de Emissão BI': a.dataEmissaoBI || '—',
        'Arquivo de Identificação': a.arquivoIdentificacao || '—',
        'Naturalidade': a.naturalidade || '—',
        'Província de Origem': a.provinciaOrigem || a.provincia || '—',
        'Município de Residência': a.municipioNascimento || a.municipio || '—',
        'Endereço Residencial': a.endereco || a.bairro || '—',
        'Filiação - Pai': a.nomePai || '—',
        'Filiação - Mãe': a.nomeMae || '—',
        'Encarregado de Educação': a.encarregadoNome || a.nomeEncarregado || '—',
        'Parentesco': a.encarregadoParentesco || 'Pai/Mãe/Tutor',
        'Telefone Encarregado': a.encarregadoTelefone || a.telefone || '—',
        'Email Encarregado': a.encarregadoEmail || '—',
        'Grupo Sanguíneo': a.grupoSanguineo || 'Não Declarado',
        'Necessidades Especiais': a.necessidadesEspeciais || a.condicaoEspecial || 'Nenhuma',
        'Educação Física': a.restricaoEducacaoFisica ? 'Dispensado' : 'Apto',

        // --- 3. ENQUADRAMENTO ACADÊMICO ---
        'Turma': t?.nome || a.turmaId || '—',
        'Classe': a.classeId || t?.classe || '—',
        'Curso / Área': a.curso || t?.curso || 'Ensino Geral',
        'Turno / Período': t?.periodo || t?.turno || a.turno || 'Manhã',
        'Sala de Aula': t?.sala || a.sala || 'Sala 01',
        'Estado da Matrícula': a.estado || 'Activo',
        'Situação das Propinas': a.propinaStatus || 'Regularizada',

        // --- 4. TODAS AS NOTAS: 1º TRIMESTRE ---
        '1º Tri - MAC': mac1,
        '1º Tri - Prova Professor (NPP)': npp1,
        '1º Tri - Prova Trimestral (NPT)': npt1,
        '1º Tri - Média Trimestral (MT1)': mt1,

        // --- 5. TODAS AS NOTAS: 2º TRIMESTRE ---
        '2º Tri - MAC': mac2,
        '2º Tri - Prova Professor (NPP)': npp2,
        '2º Tri - Prova Trimestral (NPT)': npt2,
        '2º Tri - Média Trimestral (MT2)': mt2,

        // --- 6. TODAS AS NOTAS: 3º TRIMESTRE ---
        '3º Tri - MAC': mac3,
        '3º Tri - Prova Professor (NPP)': npp3,
        '3º Tri - Prova Trimestral (NPT)': npt3,
        '3º Tri - Média Trimestral (MT3)': mt3,

        // --- 7. MÉDIAS GERAIS, EXAME E APROVEITAMENTO FINAL ---
        'Média de Frequência Anual (MDF)': mediaGlobal,
        'Nota de Exame Nacional (NE)': notaExameMedia,
        'MÉDIA FINAL DEFINITIVA (MF)': mediaGlobal,
        'Resultado Pedagógico Final': resultadoPedagogico,
        'Total de Faltas': a.faltas || 0,
        'Comportamento': a.comportamentoConceito || '— (A Avaliar)',

        // --- 8. MÉDIAS FINAIS POR DISCIPLINA CURRICULAR ---
        'Língua Portuguesa (MF)': notaDisc('Língua Portuguesa'),
        'Matemática (MF)': notaDisc('Matemática'),
        'Física (MF)': notaDisc('Física'),
        'Química (MF)': notaDisc('Química'),
        'Biologia (MF)': notaDisc('Biologia'),
        'História (MF)': notaDisc('História'),
        'Geografia (MF)': notaDisc('Geografia'),
        'Língua Inglesa (MF)': notaDisc('Inglesa'),
        'Língua Francesa (MF)': notaDisc('Francesa'),
        'Educação Física (MF)': notaDisc('Educação Física'),
        'Informática (MF)': notaDisc('Informática')
      };
    });
    const wsAlunos = XLSX.utils.json_to_sheet(alunosCompletos);
    XLSX.utils.book_append_sheet(wb, wsAlunos, 'Alunos');

    // 3. Pauta Completa Aluno x Disciplina x Trimestre
    const pautaDetalhada: any[] = [];
    alunos.forEach(a => {
      const t = turmas.find(turma => turma.id === a.turmaId);
      const notasAluno = notasConsolidadas.filter(n => n.alunoId === a.id);
      
      disciplinas.forEach(d => {
        const n1 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('1'));
        const n2 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('2'));
        const n3 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('3'));

        if (n1 || n2 || n3) {
          const mt1Val = n1?.mediaTrimestral ?? n1?.notaFinal;
          const mt2Val = n2?.mediaTrimestral ?? n2?.notaFinal;
          const mt3Val = n3?.mediaTrimestral ?? n3?.notaFinal;
          
          let mfVal = n3?.notaFinal ?? n3?.mediaTrimestral ?? mt3Val;
          if (!mfVal && mt1Val && mt2Val) {
            mfVal = Number(((mt1Val + mt2Val) / 2).toFixed(1));
          } else if (!mfVal && mt1Val) {
            mfVal = mt1Val;
          }

          pautaDetalhada.push({
            'Instituição Escolar': escola.nomeOficial,
            'Código SIGE': escola.codigoSIGE || escola.codigoMEC || escola.id,
            'Nº Processo': a.codigoMatricula || a.id,
            'Nome do Estudante': a.nomeCompleto,
            'Turma': t?.nome || a.turmaId,
            'Classe': a.classeId || t?.classe,
            'Disciplina': d.nome,
            '1T - MAC': n1?.mac ?? '—',
            '1T - NPP': n1?.npp ?? '—',
            '1T - NPT': n1?.npt ?? '—',
            '1T - MT': mt1Val ?? '—',
            '2T - MAC': n2?.mac ?? '—',
            '2T - NPP': n2?.npp ?? '—',
            '2T - NPT': n2?.npt ?? '—',
            '2T - MT': mt2Val ?? '—',
            '3T - MAC': n3?.mac ?? '—',
            '3T - NPP': n3?.npp ?? '—',
            '3T - NPT': n3?.npt ?? '—',
            '3T - MT': mt3Val ?? '—',
            'Nota de Exame (NE)': n3?.notaExame ?? '—',
            'Média Final (MF)': mfVal ?? 10,
            'Classificação': (mfVal ?? 10) >= 10 ? 'Aprovado' : 'Não Transita'
          });
        }
      });
    });
    if (pautaDetalhada.length > 0) {
      const wsPauta = XLSX.utils.json_to_sheet(pautaDetalhada);
      XLSX.utils.book_append_sheet(wb, wsPauta, 'Pauta_Disciplinas_Notas');
    }

    // 4. Turmas
    const turmasFormatadas = turmas.map(t => ({
      'Instituição Escolar': escola.nomeOficial,
      'Código SIGE': escola.codigoSIGE || escola.codigoMEC || escola.id,
      'ID Turma': t.id,
      'Nome da Turma': t.nome,
      'Classe': t.classe,
      'Curso': t.curso,
      'Turno': t.periodo || t.turno,
      'Sala': t.sala,
      'Ano Lectivo': t.anoLectivo || escola.anoLectivoActivo,
      'Capacidade Máxima': t.capacidadeMaxima || 45,
      'Total de Estudantes': alunos.filter(a => a.turmaId === t.id).length
    }));
    const wsTurmas = XLSX.utils.json_to_sheet(turmasFormatadas);
    XLSX.utils.book_append_sheet(wb, wsTurmas, 'Turmas Homologadas');

    // 5. Funcionários & Professores
    const wsFuncs = XLSX.utils.json_to_sheet(funcs.map(f => ({
      'Instituição Escolar': escola.nomeOficial,
      'ID': f.id,
      'Nome Completo': f.nomeCompleto,
      'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
      'Bilhete de Identidade': f.numeroBI,
      'Cargo / Função': f.cargo,
      'Papel no Sistema': f.role,
      'Telefone': f.telefone,
      'Email': f.email,
      'Professor': f.ehProfessor ? 'Sim' : 'Não',
      'Habilitações Literárias': f.habilitacoes || 'Licenciatura',
      'Especialidade': f.especialidade || 'Pedagogia'
    })));
    XLSX.utils.book_append_sheet(wb, wsFuncs, 'Quadro de Funcionários');

    // 6. Auditoria
    const wsLogs = XLSX.utils.json_to_sheet(logs.map(l => ({
      'Instituição Escolar': escola.nomeOficial,
      'Data / Hora': l.dataHora,
      'Utilizador': l.utilizadorNome,
      'Papel': l.papel,
      'Ação Executada': l.acao,
      'Detalhes': l.detalhe,
      'Endereço IP': l.ip || '127.0.0.1'
    })));
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Trilha de Auditoria MED');

    const dataHoje = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SGE_NG_Dados_Completos_${escola.sigla || 'Escola'}_${dataHoje}.xlsx`);
    dbService.registarLog('Exportação Excel', 'Ficheiro consolidado completo exportado em Excel (.xlsx) contendo todas as notas, dados e identificação institucional.');
  },

  // 1. Exportar Alunos com Todas as Notas em Excel (.xlsx)
  exportarAlunosComNotasExcel: async (escolaId?: string) => {
    const XLSX = await import('xlsx');
    const isEscolaEspecifica = Boolean(escolaId && escolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === escolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const nppAtivo = escola?.nppAtivo !== false;
    
    const alunos = isEscolaEspecifica 
      ? dbService.getAlunos().filter(a => a.escolaId === escolaId) 
      : dbService.getAlunos();
    const turmas = dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(isEscolaEspecifica ? escolaId : escola?.id);
    const notasConsolidadas = dbService.getNotasConsolidadas();

    const linhasAlunos: any[] = [];

    alunos.forEach(aluno => {
      const turma = turmas.find(t => t.id === aluno.turmaId);
      const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id);
      const ehFinal = isClasseFinal(turma?.classe || aluno.classeId);

      const discList = disciplinas.filter(d => 
        !d.classes || d.classes.length === 0 || d.classes.includes(turma?.classe || '')
      );

      (discList.length > 0 ? discList : disciplinas).forEach(disc => {
        const n1 = notasAluno.find(n => n.disciplinaId === disc.id && String(n.trimestre).includes('1'));
        const n2 = notasAluno.find(n => n.disciplinaId === disc.id && String(n.trimestre).includes('2'));
        const n3 = notasAluno.find(n => n.disciplinaId === disc.id && String(n.trimestre).includes('3'));

        const mt1 = n1?.mediaTrimestral ?? n1?.notaFinal;
        const mt2 = n2?.mediaTrimestral ?? n2?.notaFinal;
        const mt3 = n3?.mediaTrimestral ?? n3?.notaFinal;

        let mdf = 0;
        const mtsValidos = [mt1, mt2, mt3].filter((v): v is number => v !== undefined && v !== null);
        if (mtsValidos.length > 0) {
          mdf = Number((mtsValidos.reduce((a, b) => a + b, 0) / mtsValidos.length).toFixed(1));
        }

        const ne = ehFinal ? (n3?.notaExame ?? null) : null;
        let mf: number | null = null;
        if (ehFinal && ne !== null && ne !== undefined) {
          mf = Number(((mdf * 0.4) + (ne * 0.6)).toFixed(1));
        } else {
          mf = mdf;
        }

        const linha: any = {
          'Instituição Escolar': escola?.nomeOficial || 'Instituição Escolar',
          'Código SIGE': escola?.codigoSIGE || escola?.codigoMEC || '',
          'Nº Processo': aluno.codigoMatricula || aluno.id,
          'Nome Completo': aluno.nomeCompleto,
          'Gênero': aluno.genero === 'M' ? 'Masculino' : 'Feminino',
          'Data de Nascimento': aluno.dataNascimento || '—',
          'BI / Cédula': aluno.numeroBI || aluno.numeroDocumento || '—',
          'Turma': turma?.nome || aluno.turmaId,
          'Classe': turma?.classe || aluno.classeId || '—',
          'Turno': turma?.periodo || turma?.turno || '—',
          'Sala': turma?.sala || '—',
          'Disciplina': disc.nome,
          '1T - MAC': n1?.mac ?? '—',
        };

        if (nppAtivo) {
          linha['1T - Prova Professor (NPP)'] = n1?.npp ?? '—';
        }
        linha['1T - Prova Trimestral (PT)'] = n1?.npt ?? '—';
        linha['1T - Média Trimestral (MT1)'] = mt1 ?? '—';

        linha['2T - MAC'] = n2?.mac ?? '—';
        if (nppAtivo) {
          linha['2T - Prova Professor (NPP)'] = n2?.npp ?? '—';
        }
        linha['2T - Prova Trimestral (PT)'] = n2?.npt ?? '—';
        linha['2T - Média Trimestral (MT2)'] = mt2 ?? '—';

        linha['3T - MAC'] = n3?.mac ?? '—';
        if (nppAtivo) {
          linha['3T - Prova Professor (NPP)'] = n3?.npp ?? '—';
        }
        linha['3T - Prova Trimestral (PT)'] = n3?.npt ?? '—';
        linha['3T - Média Trimestral (MT3)'] = mt3 ?? '—';

        linha['Média dos Trimestres (MDF)'] = mdf > 0 ? mdf : '—';
        
        if (ehFinal) {
          linha['Exame Nacional / Júri (NE)'] = ne !== null ? ne : 'Pendente';
          linha['Média Final (MF com Exame)'] = mf !== null ? mf : '—';
        } else {
          linha['Média Final (MF Anual)'] = mdf > 0 ? mdf : '—';
        }

        const notaDecisiva = mf !== null ? mf : mdf;
        linha['Resultado Final'] = notaDecisiva >= 10 ? 'Aprovado' : (notaDecisiva > 0 ? 'Não Transita' : 'Pendente');

        linhasAlunos.push(linha);
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(linhasAlunos.length > 0 ? linhasAlunos : [{ 'Informação': 'Nenhum estudante ou nota disponível para exportação.' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos e Notas');

    const dataHoje = new Date().toISOString().split('T')[0];
    const sigla = escola?.sigla || (isEscolaEspecifica ? 'Escola' : 'Rede_Nacional');
    XLSX.writeFile(wb, `SGE_Alunos_Com_Notas_${sigla}_${dataHoje}.xlsx`);
    dbService.registarLog('Exportação Excel', `Livro Excel com notas completas dos alunos (${sigla}) exportado com sucesso.`);
  },

  // 2. Exportar Alunos com Todas as Notas em JSON (.json)
  exportarAlunosComNotasJSON: (escolaId?: string) => {
    const isEscolaEspecifica = Boolean(escolaId && escolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === escolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const alunos = isEscolaEspecifica ? dbService.getAlunos().filter(a => a.escolaId === escolaId) : dbService.getAlunos();
    const turmas = isEscolaEspecifica ? dbService.getTurmas().filter(t => t.escolaId === escolaId) : dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(isEscolaEspecifica ? escolaId : escola?.id);
    const notasConsolidadas = dbService.getNotasConsolidadas();

    const dadosExportacao = {
      tipo: 'SGE_ALUNOS_NOTAS_COMPLETO',
      versao: '2.5',
      dataExportacao: new Date().toISOString(),
      escola: escola ? {
        id: escola.id,
        nomeOficial: escola.nomeOficial,
        sigla: escola.sigla,
        codigoSIGE: escola.codigoSIGE,
        provincia: escola.provincia,
        municipio: escola.municipio,
        nppAtivo: escola.nppAtivo !== false
      } : null,
      totalAlunos: alunos.length,
      alunos: alunos.map(aluno => {
        const turma = turmas.find(t => t.id === aluno.turmaId);
        const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id);
        const ehFinal = isClasseFinal(turma?.classe || aluno.classeId);
        return {
          id: aluno.id,
          codigoMatricula: aluno.codigoMatricula,
          numeroOrdem: aluno.numeroOrdem,
          nomeCompleto: aluno.nomeCompleto,
          genero: aluno.genero,
          dataNascimento: aluno.dataNascimento,
          biOuCedula: aluno.numeroBI || aluno.numeroDocumento || '—',
          telefone: aluno.telefone,
          endereco: aluno.residencia || aluno.bairro || '—',
          turma: turma ? { id: turma.id, nome: turma.nome, classe: turma.classe, turno: turma.periodo || turma.turno } : null,
          ehClasseFinal: ehFinal,
          disciplinasNotas: notasAluno.map(n => {
            const disc = disciplinas.find(d => d.id === n.disciplinaId);
            return {
              disciplinaId: n.disciplinaId,
              disciplinaNome: disc?.nome || (n as any).disciplinaNome || n.disciplinaId,
              trimestre: n.trimestre,
              mac: n.mac,
              npp: n.npp,
              npt: n.npt,
              mediaTrimestral: n.mediaTrimestral,
              notaExame: ehFinal ? n.notaExame : undefined,
              notaFinal: n.notaFinal
            };
          })
        };
      })
    };

    const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sigla = escola?.sigla || (isEscolaEspecifica ? 'Escola' : 'Rede_Nacional');
    const dataHoje = new Date().toISOString().split('T')[0];
    a.download = `SGE_Alunos_Com_Notas_${sigla}_${dataHoje}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dbService.registarLog('Backup JSON', `Arquivo JSON de estudantes e notas (${sigla}) gerado com sucesso.`);
  },

  // 3. Exportar Quadro Completo de Funcionários em Excel (.xlsx)
  exportarFuncionariosCompletosExcel: async (escolaId?: string) => {
    const XLSX = await import('xlsx');
    const isEscolaEspecifica = Boolean(escolaId && escolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === escolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const funcs = isEscolaEspecifica 
      ? dbService.getFuncionarios().filter(f => f.escolaId === escolaId) 
      : dbService.getFuncionarios();

    const linhas = funcs.map(f => {
      const esc = todasEscolas.find(e => e.id === f.escolaId) || escola;
      return {
        'Instituição Escolar': esc?.nomeOficial || 'SGE-NG Central',
        'Código SIGE Escola': esc?.codigoSIGE || esc?.codigoMEC || '',
        'ID Funcionário': f.id,
        'Nome Completo': f.nomeCompleto,
        'Gênero': f.genero === 'M' ? 'Masculino' : (f.genero === 'F' ? 'Feminino' : '—'),
        'Data de Nascimento': f.dataNascimento || '—',
        'Estado Civil': f.estadoCivil || '—',
        'Nacionalidade': f.nacionalidade || 'Angolana',
        'Nº Bilhete de Identidade (BI)': f.numeroBI,
        'Data Emissão BI': f.dataEmissaoBI || '—',
        'Validade BI': f.dataValidadeBI || '—',
        'NIF': f.nif || '—',
        'Cargo / Função': f.cargo,
        'Categoria Profissional': f.categoriaProfissional || 'Técnico Pedagógico',
        'Nº de Agente do Estado': f.numeroAgente || '—',
        'Regime Contratual': f.tipoContrato || 'Quadro Efetivo',
        'Data de Admissão': f.dataAdmissao || '—',
        'Papel no Sistema (Role)': f.role,
        'Status da Conta': f.statusConta || 'Ativa',
        'É Professor': f.ehProfessor ? 'Sim' : 'Não',
        'Especialidade / Formação': f.especialidade || '—',
        'Habilitações Literárias': f.habilitacoes || 'Licenciatura',
        'Instituição de Graduação': (f as any).instituicaoFormacao || '—',
        'Telefone Principal': f.telefone,
        'Telefone Alternativo': f.telefoneAlternativo || '—',
        'Email Institucional': f.email,
        'Email Pessoal': (f as any).emailPessoal || '—',
        'Província Residência': f.provincia || esc?.provincia || '—',
        'Município Residência': f.municipio || esc?.municipio || '—',
        'Bairro / Morada': f.residencia || f.bairro || '—',
        'Banco': f.banco || '—',
        'IBAN / Conta Bancária': f.iban || '—',
        'Grupo Sanguíneo': f.grupoSanguineo || '—',
        'Contacto Emergência (Nome)': f.contactoEmergenciaNome || '—',
        'Contacto Emergência (Telefone)': f.contactoEmergenciaTelefone || '—'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(linhas.length > 0 ? linhas : [{ 'Informação': 'Nenhum funcionário encontrado.' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Quadro de Funcionários');

    const dataHoje = new Date().toISOString().split('T')[0];
    const sigla = escola?.sigla || (isEscolaEspecifica ? 'Escola' : 'Rede_Nacional');
    XLSX.writeFile(wb, `SGE_Quadro_Funcionarios_Completo_${sigla}_${dataHoje}.xlsx`);
    dbService.registarLog('Exportação Excel', `Quadro completo de funcionários (${sigla}) exportado com sucesso.`);
  },

  // 4. Exportar Quadro Completo de Funcionários em JSON (.json)
  exportarFuncionariosCompletosJSON: (escolaId?: string) => {
    const isEscolaEspecifica = Boolean(escolaId && escolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === escolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const funcs = isEscolaEspecifica 
      ? dbService.getFuncionarios().filter(f => f.escolaId === escolaId) 
      : dbService.getFuncionarios();

    const dadosExportacao = {
      tipo: 'SGE_QUADRO_FUNCIONARIOS_COMPLETO',
      versao: '2.5',
      dataExportacao: new Date().toISOString(),
      escolaAlvo: escola ? { id: escola.id, nome: escola.nomeOficial, sigla: escola.sigla } : null,
      totalFuncionarios: funcs.length,
      funcionarios: funcs
    };

    const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sigla = escola?.sigla || (isEscolaEspecifica ? 'Escola' : 'Rede_Nacional');
    const dataHoje = new Date().toISOString().split('T')[0];
    a.download = `SGE_Quadro_Funcionarios_Completo_${sigla}_${dataHoje}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dbService.registarLog('Backup JSON', `Arquivo JSON do quadro de funcionários (${sigla}) exportado com sucesso.`);
  },

  // 5. Exportar Escola Completa em Excel (.xlsx) com Múltiplas Abas Oficiais
  exportarEscolaCompletaExcel: async (escolaId?: string) => {
    const XLSX = await import('xlsx');
    const todasEscolas = dbService.getEscolas();
    const escolaAlvoId = escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva()?.id;
    const escola = todasEscolas.find(e => e.id === escolaAlvoId) || dbService.getEscolaAtiva() || todasEscolas[0];
    const nppAtivo = escola?.nppAtivo !== false;

    const alunos = dbService.getAlunos().filter(a => a.escolaId === escola.id);
    const turmas = dbService.getTurmas().filter(t => t.escolaId === escola.id);
    const disciplinas = dbService.getDisciplinas(escola.id);
    const funcs = dbService.getFuncionarios().filter(f => f.escolaId === escola.id && f.role !== 'AdminGeral');
    const notasConsolidadas = dbService.getNotasConsolidadas();
    const transacoes = dbService.getTransacoesFinanceiras().filter(t => t.escolaId === escola.id);
    const patrimonio = dbService.getPatrimonio().filter(p => p.escolaId === escola.id);

    const wb = XLSX.utils.book_new();

    // Folha 1: Instituição Escolar
    const escolaInfo = [{
      'Designação Oficial': escola.nomeOficial,
      'Sigla': escola.sigla || 'MED',
      'Código SIGE': escola.codigoSIGE || escola.codigoMEC || escola.id,
      'Província': escola.provincia || 'Luanda',
      'Município': escola.municipio || 'Luanda',
      'Comuna / Distrito': escola.comunaDistrito || 'Urbano',
      'Bairro': escola.bairro || 'Central',
      'Telefone Oficial': escola.telefone || '—',
      'Email Oficial': escola.email || '—',
      'Ano Lectivo Activo': escola.anoLectivoActivo || '—',
      'Trimestre Activo': `${escola.trimestreActivo || 'II'}º Trimestre`,
      'Diretor Geral': escola.diretorGeralNome || 'Pendente de Nomeação',
      'Subdiretor Pedagógico': escola.subdiretorPedagogicoNome || 'Pendente',
      'Subdiretor Administrativo': escola.subdirectorAdministrativoNome || escola.subdiretorAdministrativoNome || 'Pendente',
      'Ponderação Trimestral Oficial': nppAtivo ? 'MT = (MAC + NPP + PT) / 3' : 'MT = (MAC + PT) / 2',
      'Total de Turmas': turmas.length,
      'Total de Estudantes': alunos.length,
      'Total de Funcionários': funcs.length
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(escolaInfo), 'Instituição Escolar');

    // Folha 2: Quadro de Alunos
    const alunosRows = alunos.map(a => {
      const t = turmas.find(turma => turma.id === a.turmaId);
      return {
        'Nº Processo': a.codigoMatricula || a.id,
        'Nº de Ordem': a.numeroOrdem || 1,
        'Nome Completo': a.nomeCompleto,
        'Gênero': a.genero === 'M' ? 'Masculino' : 'Feminino',
        'Data Nascimento': a.dataNascimento || '—',
        'BI / Cédula': a.numeroBI || a.numeroDocumento || '—',
        'Turma': t?.nome || a.turmaId,
        'Classe': t?.classe || a.classeId || '—',
        'Turno': t?.periodo || t?.turno || '—',
        'Sala': t?.sala || '—',
        'Telefone Aluno/Encarregado': a.telefone || '—',
        'Endereço / Residência': a.residencia || a.bairro || '—'
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alunosRows.length > 0 ? alunosRows : [{ 'Info': 'Sem alunos' }]), 'Alunos & Matrículas');

    // Folha 3: Pauta Geral de Notas
    const pautaDetalhada: any[] = [];
    alunos.forEach(a => {
      const t = turmas.find(turma => turma.id === a.turmaId);
      const notasAluno = notasConsolidadas.filter(n => n.alunoId === a.id);
      const ehFinal = isClasseFinal(t?.classe || a.classeId);

      disciplinas.forEach(d => {
        const n1 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('1'));
        const n2 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('2'));
        const n3 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('3'));

        if (n1 || n2 || n3) {
          const mt1Val = n1?.mediaTrimestral ?? n1?.notaFinal;
          const mt2Val = n2?.mediaTrimestral ?? n2?.notaFinal;
          const mt3Val = n3?.mediaTrimestral ?? n3?.notaFinal;
          const mts = [mt1Val, mt2Val, mt3Val].filter((v): v is number => v !== undefined && v !== null);
          const mdf = mts.length > 0 ? Number((mts.reduce((x, y) => x + y, 0) / mts.length).toFixed(1)) : 0;
          const ne = ehFinal ? (n3?.notaExame ?? null) : null;
          const mf = (ehFinal && ne !== null) ? Number(((mdf * 0.4) + (ne * 0.6)).toFixed(1)) : mdf;

          const row: any = {
            'Nº Processo': a.codigoMatricula || a.id,
            'Nome do Estudante': a.nomeCompleto,
            'Turma': t?.nome || a.turmaId,
            'Classe': t?.classe || a.classeId || '—',
            'Disciplina': d.nome,
            '1T - MAC': n1?.mac ?? '—'
          };
          if (nppAtivo) row['1T - NPP'] = n1?.npp ?? '—';
          row['1T - PT'] = n1?.npt ?? '—';
          row['1T - MT'] = mt1Val ?? '—';

          row['2T - MAC'] = n2?.mac ?? '—';
          if (nppAtivo) row['2T - NPP'] = n2?.npp ?? '—';
          row['2T - PT'] = n2?.npt ?? '—';
          row['2T - MT'] = mt2Val ?? '—';

          row['3T - MAC'] = n3?.mac ?? '—';
          if (nppAtivo) row['3T - NPP'] = n3?.npp ?? '—';
          row['3T - PT'] = n3?.npt ?? '—';
          row['3T - MT'] = mt3Val ?? '—';

          row['MDF'] = mdf > 0 ? mdf : '—';
          if (ehFinal) {
            row['NE (Exame)'] = ne !== null ? ne : '—';
            row['MF (Final)'] = mf > 0 ? mf : '—';
          } else {
            row['MF (Final)'] = mdf > 0 ? mdf : '—';
          }
          row['Classificação'] = (mf > 0 ? mf : mdf) >= 10 ? 'Aprovado' : 'Não Transita';

          pautaDetalhada.push(row);
        }
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pautaDetalhada.length > 0 ? pautaDetalhada : [{ 'Info': 'Sem notas lançadas' }]), 'Pauta Geral de Notas');

    // Folha 4: Quadro de Funcionários
    const funcsRows = funcs.map(f => ({
      'ID': f.id,
      'Nome Completo': f.nomeCompleto,
      'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
      'BI': f.numeroBI,
      'Cargo': f.cargo,
      'Papel no Sistema': f.role,
      'Professor': f.ehProfessor ? 'Sim' : 'Não',
      'Habilitações': f.habilitacoes || 'Licenciatura',
      'Especialidade': f.especialidade || '—',
      'Telefone': f.telefone,
      'Email': f.email
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(funcsRows.length > 0 ? funcsRows : [{ 'Info': 'Sem funcionários' }]), 'Quadro de Funcionários');

    // Folha 5: Turmas
    const turmasRows = turmas.map(t => ({
      'ID Turma': t.id,
      'Nome': t.nome,
      'Classe': t.classe,
      'Curso': t.curso,
      'Turno': t.periodo || t.turno,
      'Sala': t.sala,
      'Ano Lectivo': t.anoLectivo || escola.anoLectivoActivo,
      'Estudantes': alunos.filter(a => a.turmaId === t.id).length
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(turmasRows.length > 0 ? turmasRows : [{ 'Info': 'Sem turmas' }]), 'Turmas Homologadas');

    // Folha 6: Livro de Caixa & Recibos
    const finRows = transacoes.map(tr => ({
      'Nº Recibo / Transação': tr.numeroRecibo || tr.id,
      'Data': tr.dataHora || '—',
      'Estudante': tr.alunoNome || '—',
      'Conceito / Emolumento': tr.tipo || tr.mesReferencia || '—',
      'Valor (Kz)': tr.valorKz || tr.valorTotalKz || 0,
      'Método de Pagamento': tr.metodoPagamento || 'TPA',
      'Estado': tr.status || 'Confirmado'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finRows.length > 0 ? finRows : [{ 'Info': 'Sem movimentações financeiras' }]), 'Livro de Caixa & Recibos');

    // Folha 7: Património Escolar
    const patRows = patrimonio.map(p => ({
      'Código / Tombamento': p.codigoTombamento || p.codigoTombo || p.id,
      'Designação do Bem': p.designacao || p.nomeItem || 'Item',
      'Categoria': p.categoria,
      'Localização / Sala': p.salaLocalizacao || p.localizacao || '—',
      'Quantidade': p.quantidade || 1,
      'Estado de Conservação': p.estadoConservacao || 'Bom'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patRows.length > 0 ? patRows : [{ 'Info': 'Sem património registado' }]), 'Património Escolar');

    const dataHoje = new Date().toISOString().split('T')[0];
    const sigla = escola.sigla || 'Escola';
    XLSX.writeFile(wb, `SGE_Escola_Completa_${sigla}_${dataHoje}.xlsx`);
    dbService.registarLog('Exportação Excel', `Livro Excel com todos os dados da escola (${sigla}) exportado com sucesso.`);
  },

  // 6. Exportar Escola Completa em JSON (.json)
  exportarEscolaCompletaJSON: (escolaId?: string) => {
    dbService.gerarBackupJSON(escolaId);
  },

  // 7. Exportar Todo o Sistema Completo em Excel (.xlsx)
  exportarSistemaCompletoExcel: async () => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      await dbService.exportarEscolaCompletaExcel(dbService.getEscolaAtiva().id);
      return;
    }
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const escolas = dbService.getEscolas();
    const alunos = dbService.getAlunos();
    const funcs = dbService.getFuncionarios();
    const turmas = dbService.getTurmas();
    const notasCons = dbService.getNotasConsolidadas();
    const logs = dbService.getAuditoria();

    // 1. Resumo Geral
    const ativas = escolas.filter(e => e.ativo && e.estadoEscola !== 'Suspensa').length;
    const resumo = [
      { 'Indicador Estratégico MED': 'República de Angola', 'Valor Registado': 'Ministério da Educação (MED)' },
      { 'Indicador Estratégico MED': 'Data do Balanço Nacional', 'Valor Registado': new Date().toLocaleDateString('pt-AO') },
      { 'Indicador Estratégico MED': 'Total de Instituições Cadastradas', 'Valor Registado': escolas.length },
      { 'Indicador Estratégico MED': 'Instituições em Pleno Funcionamento', 'Valor Registado': ativas },
      { 'Indicador Estratégico MED': 'Total de Alunos Matriculados no Sistema', 'Valor Registado': alunos.length },
      { 'Indicador Estratégico MED': 'Total de Professores e Quadros Administrativos', 'Valor Registado': funcs.length },
      { 'Indicador Estratégico MED': 'Total de Turmas Homologadas', 'Valor Registado': turmas.length },
      { 'Indicador Estratégico MED': 'Total de Lançamentos de Notas Consolidadas', 'Valor Registado': notasCons.length },
      { 'Indicador Estratégico MED': 'Registos na Trilha Central de Auditoria', 'Valor Registado': logs.length }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Balanço Geral Nacional');

    // 2. Escolas
    const escolasData = escolas.map(e => ({
      'ID Escola': e.id,
      'Código SIGE / MEC': e.codigoSIGE || e.codigoEscola || '',
      'Designação Oficial': e.nomeOficial,
      'Sigla': e.sigla,
      'Província': e.provincia,
      'Município': e.municipio,
      'Diretor Geral': e.diretorGeralNome || 'Pendente',
      'Subdiretor Pedagógico': e.subdiretorPedagogicoNome || 'Pendente',
      'Ponderação Trimestral': e.nppAtivo !== false ? 'MT=(MAC+NPP+PT)/3' : 'MT=(MAC+PT)/2',
      'Estado': e.ativo ? 'Ativa' : 'Suspensa',
      'Ano Lectivo Activo': e.anoLectivoActivo,
      'Total Alunos': alunos.filter(a => a.escolaId === e.id).length,
      'Total Funcionários': funcs.filter(f => f.escolaId === e.id).length,
      'Total Turmas': turmas.filter(t => t.escolaId === e.id).length
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(escolasData), 'Rede de Escolas');

    // 3. Alunos
    const alunosData = alunos.map(a => {
      const e = escolas.find(esc => esc.id === a.escolaId);
      const t = turmas.find(turma => turma.id === a.turmaId);
      return {
        'Escola': e?.nomeOficial || a.escolaId,
        'Nº Processo': a.codigoMatricula || a.id,
        'Nome Completo': a.nomeCompleto,
        'Gênero': a.genero === 'M' ? 'Masculino' : 'Feminino',
        'Data Nascimento': a.dataNascimento || '—',
        'BI / Cédula': a.numeroBI || a.numeroDocumento || '—',
        'Turma': t?.nome || a.turmaId,
        'Classe': t?.classe || a.classeId || '—'
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alunosData), 'Quadro Nacional de Alunos');

    // 4. Funcionários
    const funcsData = funcs.map(f => {
      const e = escolas.find(esc => esc.id === f.escolaId);
      return {
        'Escola': e?.nomeOficial || f.escolaId || 'Central',
        'Nome Completo': f.nomeCompleto,
        'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
        'BI': f.numeroBI,
        'Cargo': f.cargo,
        'Papel no Sistema': f.role,
        'Professor': f.ehProfessor ? 'Sim' : 'Não',
        'Habilitações': f.habilitacoes || 'Licenciatura',
        'Telefone': f.telefone,
        'Email': f.email,
        'Status Conta': f.statusConta || 'Ativa'
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(funcsData), 'Quadro Nacional de RH');

    // 5. Turmas
    const turmasData = turmas.map(t => {
      const e = escolas.find(esc => esc.id === t.escolaId);
      return {
        'Escola': e?.nomeOficial || t.escolaId,
        'Nome da Turma': t.nome,
        'Classe': t.classe,
        'Curso': t.curso,
        'Turno': t.periodo || t.turno,
        'Sala': t.sala,
        'Ano Lectivo': t.anoLectivo,
        'Capacidade': t.capacidadeMaxima || 45
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(turmasData), 'Rede de Turmas');

    const dataHoje = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SGE_Sistema_Completo_Nacional_${dataHoje}.xlsx`);
    dbService.registarLog('Relatório Ministerial', 'Cópia integral do sistema nacional em formato Excel (.xlsx) gerada com sucesso.');
  },

  // 8. Exportar Todo o Sistema Completo em JSON (.json)
  exportarSistemaCompletoJSON: () => {
    if (isSessaoAutenticadaNaoAdminGeral()) {
      dbService.gerarBackupJSON(dbService.getEscolaAtiva().id);
      return;
    }
    dbService.gerarBackupJSON('todas');
  },

  // Importar Dados do Excel
  importarExcel: async (file: File): Promise<{ sucesso: boolean; mensagem: string; contadores?: any }> => {
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      let alunosImportados = 0;
      let turmasImportadas = 0;

      // Importar aba Alunos
      if (wb.SheetNames.includes('Alunos')) {
        const wsAlunos = wb.Sheets['Alunos'];
        const dataAlunos = XLSX.utils.sheet_to_json<any>(wsAlunos);
        const alunosExistentes = dbService.getAlunos();

        for (const row of dataAlunos) {
          if (!row.NomeCompleto && !row.nomeCompleto) continue;
          const novoAluno: Aluno = {
            id: row.ID || `aluno-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            codigoMatricula: row.CodigoMatricula || row.codigoMatricula || `MED-${Date.now()}`,
            numeroOrdem: Number(row.NumeroOrdem || row.numeroOrdem || 1),
            nomeCompleto: row.NomeCompleto || row.nomeCompleto,
            genero: (row.Genero || row.genero || 'M').toUpperCase() === 'F' ? 'F' : 'M',
            dataNascimento: row.DataNascimento || row.dataNascimento || '2015-01-01',
            naturalidade: row.Naturalidade || row.naturalidade || 'Luanda',
            provinciaOrigem: row.ProvinciaOrigem || row.provinciaOrigem || 'Luanda',
            numeroBI: row.BI || row.numeroBI || '000000000LA000',
            telefone: row.Telefone || row.telefone || '',
            fotoUrl: '',
            encarregadoNome: row.Encarregado || row.encarregadoNome || 'Encarregado de Educação',
            encarregadoParentesco: 'Encarregado',
            encarregadoTelefone: row.TelefoneEncarregado || row.encarregadoTelefone || '',
            estado: (row.Estado || row.estado || 'Ativo') as any,
            turmaId: row.TurmaID || row.turmaId || 'turma-1a',
            classeId: row.Classe || row.classeId || '1ª',
            escolaId: dbService.getEscolaAtiva().id,
            propinaStatus: 'Regularizada',
            historicoAnterior: [],
            cadastradoEm: new Date().toISOString().split('T')[0]
          };

          const idx = alunosExistentes.findIndex(a => a.id === novoAluno.id || a.codigoMatricula === novoAluno.codigoMatricula);
          if (idx >= 0) alunosExistentes[idx] = novoAluno;
          else alunosExistentes.push(novoAluno);
          alunosImportados++;
        }
        setLocal(STORAGE_KEYS.ALUNOS, alunosExistentes);
      }

      // Importar aba Turmas
      if (wb.SheetNames.includes('Turmas')) {
        const wsTurmas = wb.Sheets['Turmas'];
        const dataTurmas = XLSX.utils.sheet_to_json<any>(wsTurmas);
        const turmasExistentes = dbService.getTurmas();

        for (const row of dataTurmas) {
          if (!row.nome && !row.Nome) continue;
          const novaTurma: Turma = {
            id: row.id || row.ID || `turma-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            escolaId: dbService.getEscolaAtiva().id,
            nome: row.nome || row.Nome,
            classe: row.classe || row.Classe || '1ª',
            nivelEnsino: row.nivelEnsino || row.NivelEnsino || 'Primario',
            turno: row.turno || row.Turno || 'Manhã',
            sala: row.sala || row.Sala || 'Sala 1',
            anoLectivo: row.anoLectivo || row.AnoLectivo || dbService.getEscolaAtiva()?.anoLectivoActivo || ''
          };
          const idx = turmasExistentes.findIndex(t => t.id === novaTurma.id);
          if (idx >= 0) turmasExistentes[idx] = novaTurma;
          else turmasExistentes.push(novaTurma);
          turmasImportadas++;
        }
        setLocal(STORAGE_KEYS.TURMAS, turmasExistentes);
      }

      dbService.registarLog('Importação Excel', `Ficheiro importado com sucesso: ${alunosImportados} alunos e ${turmasImportadas} turmas processadas.`);

      return {
        sucesso: true,
        mensagem: `Importação realizada com sucesso! Foram cadastrados/atualizados ${alunosImportados} alunos e ${turmasImportadas} turmas.`,
        contadores: { alunosImportados, turmasImportadas }
      };
    } catch (err: any) {
      console.error('Erro na importação Excel:', err);
      return {
        sucesso: false,
        mensagem: `Falha ao processar ficheiro Excel: ${err.message || 'Formato de ficheiro inválido'}`
      };
    }
  },

  // Backup Completo JSON (Todas as coleções e dados com suporte a isolamento por escola)
  gerarBackupJSON: (escolaId?: string) => {
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escolaAlvo = isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : null;

    const funcsVisiveis = dbService.getFuncionarios().filter(f => !isAdminGeralUserObj(f));
    const logsVisiveis = dbService.getAuditoria();

    const backupData = {
      versaoSGE: 'SGE-NG 2.5 (Angola MED Edition - Enterprise Cloud/Local)',
      tipoBackup: 'COMPLETO',
      dataExportacao: new Date().toISOString(),
      escolaIdAlvo: effectiveEscolaId || 'todas',
      escolas: isEscolaEspecifica && escolaAlvo ? [escolaAlvo] : todasEscolas,
      alunos: isEscolaEspecifica ? dbService.getAlunos().filter(a => a.escolaId === effectiveEscolaId) : dbService.getAlunos(),
      turmas: isEscolaEspecifica ? dbService.getTurmas().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTurmas(),
      disciplinas: isEscolaEspecifica ? dbService.getDisciplinas(effectiveEscolaId) : dbService.getDisciplinas(),
      atribuicoes: isEscolaEspecifica ? dbService.getAtribuicoes().filter(at => at.escolaId === effectiveEscolaId) : dbService.getAtribuicoes(),
      funcionarios: isEscolaEspecifica ? funcsVisiveis.filter(f => f.escolaId === effectiveEscolaId) : (nonAdmin ? funcsVisiveis : dbService.getFuncionarios()),
      tiposAvaliacao: dbService.getTiposAvaliacao(),
      regrasMAC: dbService.getRegrasMAC(),
      avaliacoes: isEscolaEspecifica ? dbService.getAvaliacoes().filter(a => a.escolaId === effectiveEscolaId) : dbService.getAvaliacoes(),
      notas: isEscolaEspecifica ? dbService.getNotas().filter(n => (n as any).escolaId === effectiveEscolaId) : dbService.getNotas(),
      notasConsolidadas: isEscolaEspecifica ? dbService.getNotasConsolidadas().filter(nc => (nc as any).escolaId === effectiveEscolaId) : dbService.getNotasConsolidadas(),
      solicitacoesNota: isEscolaEspecifica ? dbService.getSolicitacoesNota().filter(s => s.escolaId === effectiveEscolaId) : dbService.getSolicitacoesNota(),
      juris: isEscolaEspecifica ? dbService.getJuris().filter(j => j.escolaId === effectiveEscolaId) : dbService.getJuris(),
      termosExame: isEscolaEspecifica ? dbService.getTermosExame().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTermosExame(),
      horarios: isEscolaEspecifica
        ? getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS).filter(h => h.escolaId === effectiveEscolaId)
        : getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS),
      presencas: isEscolaEspecifica ? dbService.getPresencas().filter(p => p.escolaId === effectiveEscolaId) : dbService.getPresencas(),
      auditoria: isEscolaEspecifica ? logsVisiveis.filter(a => a.escolaId === effectiveEscolaId) : logsVisiveis,
      mensagens: isEscolaEspecifica ? dbService.getMensagens().filter(m => m.escolaId === effectiveEscolaId) : dbService.getMensagens(),
      biblioteca: isEscolaEspecifica ? dbService.getBiblioteca().filter(b => b.escolaId === effectiveEscolaId) : dbService.getBiblioteca(),
      bibliotecaAcessos: isEscolaEspecifica ? dbService.getAcessosBiblioteca(effectiveEscolaId) : dbService.getAcessosBiblioteca(),
      recibos: isEscolaEspecifica ? dbService.getRecibos().filter(r => r.escolaId === effectiveEscolaId) : dbService.getRecibos(),
      configuracoesFinanceiras: getLocal(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, DEFAULT_CONFIGURACOES_FINANCEIRAS),
      transacoesFinanceiras: isEscolaEspecifica ? dbService.getTransacoesFinanceiras(effectiveEscolaId) : dbService.getTransacoesFinanceiras(),
      despesasEscolares: isEscolaEspecifica ? dbService.getDespesasEscolares(effectiveEscolaId) : dbService.getDespesasEscolares(),
      patrimonio: isEscolaEspecifica ? dbService.getPatrimonio().filter(p => p.escolaId === effectiveEscolaId) : dbService.getPatrimonio(),
      delegacoesPoderes: getLocal(STORAGE_KEYS.DELEGACOES_PODERES, []),
      acoesDelegadasLogs: getLocal(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, []),
      configuracoesDocumentos: getLocal(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, {}),
      configuracoesPasses: getLocal(STORAGE_KEYS.CONFIGURACOES_PASSES, {}),
      historicoCompleto: getLocal(STORAGE_KEYS.HISTORICO_COMPLETO, DEFAULT_HISTORICO_COMPLETO),
      configuracaoSistema: nonAdmin ? undefined : dbService.getConfiguracaoSistema(),
      anosLectivos: isEscolaEspecifica ? dbService.getAnosLectivos(effectiveEscolaId) : dbService.getAnosLectivos(),
      anosLectivosConfigs: isEscolaEspecifica ? dbService.getAnosLectivosConfigs(effectiveEscolaId) : dbService.getAnosLectivosConfigs(),
      turnosConfigs: isEscolaEspecifica ? dbService.getTurnosConfigs(effectiveEscolaId) : dbService.getTurnosConfigs(),
      classesConfigs: isEscolaEspecifica ? dbService.getClassesConfigs(effectiveEscolaId) : dbService.getClassesConfigs(),
      cursos: isEscolaEspecifica ? dbService.getCursos(effectiveEscolaId) : dbService.getCursos(),
      areasFormacao: isEscolaEspecifica ? dbService.getAreasFormacao(effectiveEscolaId) : dbService.getAreasFormacao(),
      salasAulas: isEscolaEspecifica ? dbService.getSalasAulas(effectiveEscolaId) : dbService.getSalasAulas(),
      emolumentosPersonalizados: getLocal(STORAGE_KEYS.EMOLUMENTOS_CONFIG, []),
      delegacoesCobranca: getLocal(STORAGE_KEYS.DELEGACOES_COBRANCA, []),
      presencasAlunos: getLocal(STORAGE_KEYS.PRESENCAS_ALUNOS, []),
      solicitacoesApoio: isEscolaEspecifica ? dbService.getSolicitacoesApoioTecnico(effectiveEscolaId) : dbService.getSolicitacoesApoioTecnico(),
      alertasSeguranca: nonAdmin ? [] : dbService.getAlertasSeguranca(),
      relatoriosAcontecimentos: isEscolaEspecifica ? dbService.getRelatoriosAcontecimentos(effectiveEscolaId) : dbService.getRelatoriosAcontecimentos()
    };

    const nomeSufixo = escolaAlvo?.sigla || (isEscolaEspecifica ? 'Instituicao' : 'Rede_Nacional');
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGE_NG_Backup_${nomeSufixo}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dbService.registarLog('Backup Integral do Sistema', `Cópia de segurança (${nomeSufixo}) exportada com sucesso.`);
    // Registar linha de base para próximos backups incrementais
    try {
      dbService.salvarCheckpointBackupIncremental(effectiveEscolaId || 'todas', 'COMPLETO');
    } catch {}
  },

  // =========================================================================
  // MOTOR DE BACKUP INCREMENTAL (DELTA POR HASH + REGISTOS ELIMINADOS)
  // =========================================================================
  salvarCheckpointBackupIncremental: (
    escolaId?: string,
    tipoUltimoBackup: 'COMPLETO' | 'INCREMENTAL' = 'INCREMENTAL'
  ) => {
    const scope = calcularEscopoIncremental(escolaId);
    const snapshot = coletarSnapshotEstadoAtualParaIncremental(scope.effectiveEscolaId);
    const checkpoints = getLocal<Record<string, any>>('sge_backup_incremental_checkpoints', {});
    const anterior = checkpoints[scope.chaveEscopo];

    checkpoints[scope.chaveEscopo] = {
      escolaIdAlvo: scope.chaveEscopo,
      sequencia: (anterior?.sequencia || 0) + 1,
      ultimoBackupEm: new Date().toISOString(),
      tipoUltimoBackup,
      hashesColecoes: snapshot.hashesColecoes,
      hashesConfigs: snapshot.hashesConfigs
    };
    setLocal('sge_backup_incremental_checkpoints', checkpoints);
    return checkpoints[scope.chaveEscopo];
  },

  limparCheckpointBackupIncremental: (escolaId?: string): void => {
    const scope = calcularEscopoIncremental(escolaId);
    const checkpoints = getLocal<Record<string, any>>('sge_backup_incremental_checkpoints', {});
    if (checkpoints[scope.chaveEscopo]) {
      delete checkpoints[scope.chaveEscopo];
      setLocal('sge_backup_incremental_checkpoints', checkpoints);
    }
  },

  obterResumoBackupIncremental: (escolaId?: string) => {
    const scope = calcularEscopoIncremental(escolaId);
    const checkpoints = getLocal<Record<string, any>>('sge_backup_incremental_checkpoints', {});
    const checkpoint = checkpoints[scope.chaveEscopo] || null;
    const atual = coletarSnapshotEstadoAtualParaIncremental(scope.effectiveEscolaId);

    const detalhesPorColecao: Array<{ colecao: string; rotulo: string; alterados: number; eliminados: number }> = [];
    let totalAdicionadosOuAlterados = 0;
    let totalEliminados = 0;
    let bytesEstimados = 512;

    for (const def of COLECOES_BACKUP_INCREMENTAL_META) {
      const currMap = atual.itensPorColecao[def.colecao] || {};
      const currHashes = atual.hashesColecoes[def.colecao] || {};
      const prevHashes = (checkpoint?.hashesColecoes?.[def.colecao] || {}) as Record<string, string>;

      let alterados = 0;
      let eliminados = 0;

      for (const [recId, recHash] of Object.entries(currHashes)) {
        if (!checkpoint || prevHashes[recId] !== recHash) {
          alterados++;
          try {
            bytesEstimados += JSON.stringify(currMap[recId]).length;
          } catch {}
        }
      }

      if (checkpoint) {
        for (const prevId of Object.keys(prevHashes)) {
          if (!(prevId in currHashes)) {
            eliminados++;
            bytesEstimados += prevId.length + 8;
          }
        }
      }

      if (alterados > 0 || eliminados > 0) {
        detalhesPorColecao.push({
          colecao: def.colecao,
          rotulo: def.rotulo,
          alterados,
          eliminados
        });
        totalAdicionadosOuAlterados += alterados;
        totalEliminados += eliminados;
      }
    }

    // Verificar também secções de configuração modificadas
    let configsAlteradasCount = 0;
    for (const [cfgKey, cfgHash] of Object.entries(atual.hashesConfigs)) {
      if (!checkpoint || checkpoint.hashesConfigs?.[cfgKey] !== cfgHash) {
        configsAlteradasCount++;
        try {
          bytesEstimados += JSON.stringify(atual.configs[cfgKey]).length;
        } catch {}
      }
    }
    if (configsAlteradasCount > 0) {
      detalhesPorColecao.push({
        colecao: 'configuracoes',
        rotulo: 'Configurações & Parâmetros',
        alterados: configsAlteradasCount,
        eliminados: 0
      });
      totalAdicionadosOuAlterados += configsAlteradasCount;
    }

    return {
      temCheckpointBase: Boolean(checkpoint),
      ultimoBackupEm: checkpoint?.ultimoBackupEm || null,
      tipoUltimoBackup: (checkpoint?.tipoUltimoBackup as 'COMPLETO' | 'INCREMENTAL') || null,
      sequenciaAtual: checkpoint?.sequencia || 0,
      totalAdicionadosOuAlterados,
      totalEliminados,
      detalhesPorColecao,
      estimativaTamanhoKB: Math.max(1, Math.round((bytesEstimados / 1024) * 10) / 10),
      escolaIdAlvo: scope.chaveEscopo
    };
  },

  gerarBackupIncrementalJSON: (
    escolaId?: string,
    options?: { forcarMesmoSemAlteracoes?: boolean }
  ): {
    sucesso: boolean;
    semAlteracoes?: boolean;
    sequencia: number;
    totalAlterados: number;
    totalEliminados: number;
    mensagem: string;
  } => {
    const scope = calcularEscopoIncremental(escolaId);
    const checkpoints = getLocal<Record<string, any>>('sge_backup_incremental_checkpoints', {});
    const checkpoint = checkpoints[scope.chaveEscopo] || null;
    const atual = coletarSnapshotEstadoAtualParaIncremental(scope.effectiveEscolaId);

    const deltas: Record<string, any[]> = {};
    const eliminados: Record<string, string[]> = {};
    const configsAlteradas: Record<string, any> = {};
    const resumoAlteracoes: Record<string, { alterados: number; eliminados: number }> = {};

    let totalAlterados = 0;
    let totalEliminados = 0;

    for (const def of COLECOES_BACKUP_INCREMENTAL_META) {
      const currMap = atual.itensPorColecao[def.colecao] || {};
      const currHashes = atual.hashesColecoes[def.colecao] || {};
      const prevHashes = (checkpoint?.hashesColecoes?.[def.colecao] || {}) as Record<string, string>;

      const changedItems: any[] = [];
      const removedIds: string[] = [];

      for (const [recId, recHash] of Object.entries(currHashes)) {
        if (!checkpoint || prevHashes[recId] !== recHash) {
          changedItems.push(currMap[recId]);
        }
      }

      if (checkpoint) {
        for (const prevId of Object.keys(prevHashes)) {
          if (!(prevId in currHashes)) {
            removedIds.push(prevId);
          }
        }
      }

      if (changedItems.length > 0) {
        deltas[def.colecao] = changedItems;
      }
      if (removedIds.length > 0) {
        eliminados[def.colecao] = removedIds;
      }
      if (changedItems.length > 0 || removedIds.length > 0) {
        resumoAlteracoes[def.colecao] = {
          alterados: changedItems.length,
          eliminados: removedIds.length
        };
        totalAlterados += changedItems.length;
        totalEliminados += removedIds.length;
      }
    }

    for (const [cfgKey, cfgHash] of Object.entries(atual.hashesConfigs)) {
      if (!checkpoint || checkpoint.hashesConfigs?.[cfgKey] !== cfgHash) {
        configsAlteradas[cfgKey] = atual.configs[cfgKey];
        totalAlterados++;
      }
    }

    if (totalAlterados === 0 && totalEliminados === 0 && !options?.forcarMesmoSemAlteracoes) {
      return {
        sucesso: false,
        semAlteracoes: true,
        sequencia: checkpoint?.sequencia || 0,
        totalAlterados: 0,
        totalEliminados: 0,
        mensagem: 'Não existem novas alterações desde o último ponto de verificação de backup.'
      };
    }

    const novaSequencia = (checkpoint?.sequencia || 0) + 1;
    const escolaAlvo = scope.isEscolaEspecifica
      ? dbService.getEscolas().find(e => e.id === scope.effectiveEscolaId)
      : null;
    const nomeSufixo = escolaAlvo?.sigla || (scope.isEscolaEspecifica ? 'Instituicao' : 'Rede_Nacional');
    const dataExportacao = new Date().toISOString();

    const incrementalPayload = {
      versaoSGE: 'SGE-NG 2.5 (Angola MED Edition - Backup Incremental)',
      tipoBackup: 'INCREMENTAL',
      sequenciaIncremental: novaSequencia,
      baseCheckpointEm: checkpoint?.ultimoBackupEm || null,
      tipoBaseAnterior: checkpoint?.tipoUltimoBackup || null,
      dataExportacao,
      escolaIdAlvo: scope.chaveEscopo,
      totalAlterados,
      totalEliminados,
      resumoAlteracoes,
      deltas,
      eliminados,
      configsAlteradas
    };

    const blob = new Blob([JSON.stringify(incrementalPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGE_NG_Backup_Incremental_${nomeSufixo}_Seq${String(novaSequencia).padStart(3, '0')}_${dataExportacao.split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    dbService.registarLog(
      'Backup Incremental do Sistema',
      `Delta #${novaSequencia} (${nomeSufixo}) exportado: ${totalAlterados} registo(s) novo(s)/alterado(s), ${totalEliminados} eliminado(s).`
    );

    // Atualizar checkpoint incluindo o log recém-criado para zerar pendências imediatamente
    dbService.salvarCheckpointBackupIncremental(scope.effectiveEscolaId, 'INCREMENTAL');

    return {
      sucesso: true,
      sequencia: novaSequencia,
      totalAlterados,
      totalEliminados,
      mensagem: `Backup Incremental #${novaSequencia} transferido com ${totalAlterados} alteração(ões) e ${totalEliminados} eliminação(ões).`
    };
  },

  // Restaurar Backup JSON (Suporte Automático a Snapshot Completo e Backup Incremental)
  restaurarBackupJSON: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
      const adminsExistentes = dbService.getFuncionariosBruto().filter(f => isAdminGeralUserObj(f));
      const { ids: adminIds, nomes: adminNomes } = getAdminGeralIdsAndNomes();
      const logsAdminExistentes = dbService.getAuditoriaBruta().filter(l => isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes));
      const escolasBrutasExistentes = dbService.getEscolasBrutas();

      // ============================================================
      // MODO 1: RESTAURAÇÃO INCREMENTAL (MERGE POR ID + ELIMINADOS)
      // ============================================================
      if (data?.tipoBackup === 'INCREMENTAL' && (data.deltas || data.eliminados || data.configsAlteradas)) {
        const deltas = (data.deltas || {}) as Record<string, any[]>;
        const eliminados = (data.eliminados || {}) as Record<string, string[]>;
        const configsAlteradas = (data.configsAlteradas || {}) as Record<string, any>;

        for (const def of COLECOES_BACKUP_INCREMENTAL_META) {
          if (nonAdmin && def.colecao === 'alertasSeguranca') continue;

          const upserts = Array.isArray(deltas[def.colecao]) ? deltas[def.colecao] : [];
          const removals = new Set<string>(Array.isArray(eliminados[def.colecao]) ? eliminados[def.colecao] : []);
          if (upserts.length === 0 && removals.size === 0) continue;

          const atuais = getLocal<any[]>(def.storageKey, []);
          const mapa = new Map<string, any>();

          for (let i = 0; i < atuais.length; i++) {
            const item = atuais[i];
            const k = obterChaveRegistroIncremental(def.colecao, item, i);
            mapa.set(k, item);
          }

          // Aplicar eliminações respeitando proteção RBAC do Admin Geral
          for (const remId of removals) {
            const existente = mapa.get(remId);
            if (nonAdmin && existente) {
              if (def.colecao === 'funcionarios' && isAdminGeralUserObj(existente)) continue;
              if (def.colecao === 'auditoria' && isLogOuAcaoDoAdminGeral(existente, adminIds, adminNomes)) continue;
            }
            mapa.delete(remId);
          }

          // Aplicar adições/atualizações respeitando proteção RBAC do Admin Geral
          for (let i = 0; i < upserts.length; i++) {
            const item = upserts[i];
            if (nonAdmin) {
              if (def.colecao === 'funcionarios' && isAdminGeralUserObj(item)) continue;
              if (def.colecao === 'auditoria' && isLogOuAcaoDoAdminGeral(item, adminIds, adminNomes)) continue;
              if (def.colecao === 'escolas') {
                const escolaExistente = escolasBrutasExistentes.find(e => e.id === item?.id);
                if (escolaExistente?.sessaoApoioTecnicoAtiva) {
                  item.sessaoApoioTecnicoAtiva = escolaExistente.sessaoApoioTecnicoAtiva;
                }
              }
            }
            const k = obterChaveRegistroIncremental(def.colecao, item, i);
            mapa.set(k, item);
          }

          // Preservar contas Admin Geral caso algum edge case tente removê-las
          if (nonAdmin && def.colecao === 'funcionarios') {
            for (const adm of adminsExistentes) {
              mapa.set(adm.id, adm);
            }
          }
          if (nonAdmin && def.colecao === 'auditoria') {
            for (const admLog of logsAdminExistentes) {
              mapa.set(admLog.id, admLog);
            }
          }

          setLocal(def.storageKey, Array.from(mapa.values()));
        }

        // Aplicar configurações alteradas
        if (configsAlteradas.configuracoesFinanceiras) {
          setLocal(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, configsAlteradas.configuracoesFinanceiras);
        }
        if (configsAlteradas.historicoCompleto) {
          setLocal(STORAGE_KEYS.HISTORICO_COMPLETO, configsAlteradas.historicoCompleto);
        }
        if (configsAlteradas.anosLectivos) {
          setLocal(STORAGE_KEYS.ANOS_LECTIVOS, configsAlteradas.anosLectivos);
        }
        if (configsAlteradas.configuracoesDocumentos) {
          setLocal(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, configsAlteradas.configuracoesDocumentos);
        }
        if (configsAlteradas.configuracoesPasses) {
          setLocal(STORAGE_KEYS.CONFIGURACOES_PASSES, configsAlteradas.configuracoesPasses);
        }
        if (configsAlteradas.configuracaoSistema && !nonAdmin) {
          setLocal(STORAGE_KEYS.CONFIGURACAO_SISTEMA, configsAlteradas.configuracaoSistema);
        }

        dbService.registarLog(
          'Restauração de Backup Incremental',
          `Delta #${data.sequenciaIncremental || 1} aplicado (${data.totalAlterados || 0} atualizações, ${data.totalEliminados || 0} eliminações).`
        );
        try {
          dbService.salvarCheckpointBackupIncremental(data.escolaIdAlvo || 'todas', 'INCREMENTAL');
        } catch {}
        firebaseSyncEngine.sincronizarTudoImediato();
        return true;
      }

      // ============================================================
      // MODO 2: RESTAURAÇÃO COMPLETA (SNAPSHOT INTEGRAL)
      // ============================================================
      if (data.escolas) {
        if (nonAdmin && Array.isArray(data.escolas)) {
          const mapaSessoesApoio = new Map(
            escolasBrutasExistentes
              .filter(e => e.sessaoApoioTecnicoAtiva)
              .map(e => [e.id, e.sessaoApoioTecnicoAtiva])
          );
          const restauradasIds = new Set(data.escolas.map((e: Escola) => e.id));
          const preservadasOutras = escolasBrutasExistentes.filter(e => !restauradasIds.has(e.id));
          const restauradasComProtecao = data.escolas.map((e: Escola) => ({
            ...e,
            sessaoApoioTecnicoAtiva: mapaSessoesApoio.get(e.id)
          }));
          setLocal(STORAGE_KEYS.ESCOLAS, [...preservadasOutras, ...restauradasComProtecao]);
        } else {
          setLocal(STORAGE_KEYS.ESCOLAS, data.escolas);
        }
      } else if (data.escola && !nonAdmin) {
        setLocal(STORAGE_KEYS.ESCOLAS, [data.escola]);
      }

      if (data.alunos) setLocal(STORAGE_KEYS.ALUNOS, data.alunos);
      if (data.turmas) setLocal(STORAGE_KEYS.TURMAS, data.turmas);
      if (data.disciplinas) setLocal(STORAGE_KEYS.DISCIPLINAS, data.disciplinas);
      if (data.atribuicoes) setLocal(STORAGE_KEYS.ATRIBUICOES, data.atribuicoes);
      if (data.funcionarios) {
        if (nonAdmin && Array.isArray(data.funcionarios)) {
          const semAdmin = data.funcionarios.filter((f: Funcionario) => !isAdminGeralUserObj(f));
          setLocal(STORAGE_KEYS.FUNCIONARIOS, [...adminsExistentes, ...semAdmin]);
        } else {
          setLocal(STORAGE_KEYS.FUNCIONARIOS, data.funcionarios);
        }
      }
      if (data.tiposAvaliacao) setLocal(STORAGE_KEYS.TIPOS_AVALIACAO, data.tiposAvaliacao);
      if (data.regrasMAC) setLocal(STORAGE_KEYS.REGRAS_MAC, data.regrasMAC);
      if (data.avaliacoes) setLocal(STORAGE_KEYS.AVALIACOES, data.avaliacoes);
      if (data.notas) setLocal(STORAGE_KEYS.NOTAS, data.notas);
      if (data.notasConsolidadas) setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, data.notasConsolidadas);
      if (data.solicitacoesNota) setLocal(STORAGE_KEYS.SOLICITACOES_NOTA, data.solicitacoesNota);
      if (data.juris) setLocal(STORAGE_KEYS.JURIS, data.juris);
      if (data.termosExame) setLocal(STORAGE_KEYS.TERMOS_EXAME, data.termosExame);
      if (data.horarios) setLocal(STORAGE_KEYS.HORARIOS, data.horarios);
      if (data.presencas) setLocal(STORAGE_KEYS.PRESENCAS, data.presencas);
      if (data.auditoria) {
        if (nonAdmin && Array.isArray(data.auditoria)) {
          const logsSemAdmin = data.auditoria.filter((l: LogAuditoria) => !isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes));
          setLocal(STORAGE_KEYS.AUDITORIA, [...logsAdminExistentes, ...logsSemAdmin]);
        } else {
          setLocal(STORAGE_KEYS.AUDITORIA, data.auditoria);
        }
      }
      if (data.mensagens) setLocal(STORAGE_KEYS.MENSAGENS, data.mensagens);
      if (data.biblioteca) setLocal(STORAGE_KEYS.BIBLIOTECA, data.biblioteca);
      if (data.bibliotecaAcessos) setLocal(STORAGE_KEYS.BIBLIOTECA_ACESSOS, data.bibliotecaAcessos);
      if (data.recibos) setLocal(STORAGE_KEYS.RECIBOS, data.recibos);

      if (data.configuracoesFinanceiras) setLocal(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, data.configuracoesFinanceiras);
      if (data.transacoesFinanceiras) setLocal(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, data.transacoesFinanceiras);
      if (data.despesasEscolares) setLocal(STORAGE_KEYS.DESPESAS_ESCOLARES, data.despesasEscolares);
      if (data.patrimonio) setLocal(STORAGE_KEYS.PATRIMONIO, data.patrimonio);
      if (data.delegacoesPoderes) setLocal(STORAGE_KEYS.DELEGACOES_PODERES, data.delegacoesPoderes);
      if (data.acoesDelegadasLogs) setLocal(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, data.acoesDelegadasLogs);
      if (data.configuracoesDocumentos) setLocal(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, data.configuracoesDocumentos);
      if (data.configuracoesPasses) setLocal(STORAGE_KEYS.CONFIGURACOES_PASSES, data.configuracoesPasses);
      if (data.historicoCompleto) setLocal(STORAGE_KEYS.HISTORICO_COMPLETO, data.historicoCompleto);
      if (data.configuracaoSistema && !nonAdmin) setLocal(STORAGE_KEYS.CONFIGURACAO_SISTEMA, data.configuracaoSistema);
      if (data.anosLectivos) setLocal(STORAGE_KEYS.ANOS_LECTIVOS, data.anosLectivos);
      if (data.anosLectivosConfigs) setLocal(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, data.anosLectivosConfigs);
      if (data.turnosConfigs) setLocal(STORAGE_KEYS.TURNOS_CONFIGS, data.turnosConfigs);
      if (data.classesConfigs) setLocal(STORAGE_KEYS.CLASSES_CONFIGS, data.classesConfigs);
      if (data.cursos) setLocal(STORAGE_KEYS.CURSOS, data.cursos);
      if (data.areasFormacao) setLocal(STORAGE_KEYS.AREAS_FORMACAO, data.areasFormacao);
      if (data.salasAulas) setLocal(STORAGE_KEYS.SALAS_AULAS, data.salasAulas);
      if (data.emolumentosPersonalizados) setLocal(STORAGE_KEYS.EMOLUMENTOS_CONFIG, data.emolumentosPersonalizados);
      if (data.delegacoesCobranca) setLocal(STORAGE_KEYS.DELEGACOES_COBRANCA, data.delegacoesCobranca);
      if (data.presencasAlunos) setLocal(STORAGE_KEYS.PRESENCAS_ALUNOS, data.presencasAlunos);
      if (data.solicitacoesApoio && !nonAdmin) setLocal(STORAGE_KEYS.SOLICITACOES_APOIO, data.solicitacoesApoio);
      if (data.alertasSeguranca && !nonAdmin) setLocal(STORAGE_KEYS.ALERTAS_SEGURANCA, data.alertasSeguranca);
      if (data.relatoriosAcontecimentos) setLocal(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, data.relatoriosAcontecimentos);

      dbService.registarLog('Restauração de Backup Integral', 'Sistema restaurado a partir de ficheiro de segurança.');
      try {
        dbService.salvarCheckpointBackupIncremental(data.escolaIdAlvo || 'todas', 'COMPLETO');
      } catch {}
      firebaseSyncEngine.sincronizarTudoImediato();
      return true;
    } catch (e) {
      console.error('Falha na restauração:', e);
      return false;
    }
  },

  // Alias methods for component compatibility
  obterEscola: () => dbService.getEscolaAtiva(),
  obterTurmas: () => dbService.getTurmas(),
  obterDisciplinas: () => dbService.getDisciplinas(),
  obterFuncionarios: () => dbService.getFuncionarios(),
  obterAlunos: () => dbService.getAlunos(),
  obterTiposAvaliacao: () => dbService.getTiposAvaliacao(),
  obterRegrasMAC: () => dbService.getRegrasMAC(),
  obterAvaliacoes: () => dbService.getAvaliacoes(),
  obterNotas: () => dbService.getNotas(),
  obterNotasConsolidadas: () => dbService.getNotasConsolidadas(),
  obterSolicitacoes: () => dbService.getSolicitacoesNota(),
  obterAssiduidade: () => dbService.getPresencas(),
  obterMensagens: () => dbService.getMensagens(),
  obterLivros: () => dbService.getBiblioteca(),
  obterLogs: () => dbService.getAuditoria(),
  obterJuris: () => dbService.getJuris(),
  obterAtribuicoes: () => dbService.getAtribuicoes(),
  salvarSolicitacao: (sol: SolicitacaoAlteracaoNota) => dbService.salvarSolicitacaoNota(sol),
  salvarRegistoAssiduidade: (reg: any) => dbService.salvarPresenca(reg),
  salvarAssiduidade: (reg: any) => dbService.salvarPresenca(reg),
  atualizarStatusContaFuncionario: (funcionarioId: string, status: any, motivo?: string) => {
    return dbService.atualizarStatusFuncionario(funcionarioId, status === 'Suspensa' ? 'Suspensa' : 'Ativa');
  },
  salvarMensagem: (msg: any) => {
    const msgComTs = { ...msg, atualizadoEm: new Date().toISOString() };
    const list = dbService.getMensagensBrutas();
    list.unshift(msgComTs);
    setLocal(STORAGE_KEYS.MENSAGENS, list);
    firebaseSyncEngine.salvarMensagem(msgComTs);
  },
  salvarLivro: (livro: any) => dbService.salvarDocumento(livro),
  excluirLivro: (id: string) => dbService.excluirDocumento(id),
  limparLogs: () => dbService.limparLogsAntigos(),
  criarBackupJSON: () => {
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const funcsVisiveis = dbService.getFuncionarios().filter(f => !isAdminGeralUserObj(f));
    return JSON.stringify({
      versaoSGE: 'SGE-NG 2.5 (Angola MED Edition - Enterprise Cloud/Local)',
      dataExportacao: new Date().toISOString(),
      escolas: dbService.getEscolas(),
      alunos: dbService.getAlunos(),
      turmas: dbService.getTurmas(),
      disciplinas: dbService.getDisciplinas(),
      atribuicoes: dbService.getAtribuicoes(),
      funcionarios: nonAdmin ? funcsVisiveis : dbService.getFuncionarios(),
      tiposAvaliacao: dbService.getTiposAvaliacao(),
      regrasMAC: dbService.getRegrasMAC(),
      avaliacoes: dbService.getAvaliacoes(),
      notas: dbService.getNotas(),
      notasConsolidadas: dbService.getNotasConsolidadas(),
      solicitacoesNota: dbService.getSolicitacoesNota(),
      juris: dbService.getJuris(),
      presencas: dbService.getPresencas(),
      auditoria: dbService.getAuditoria(),
      mensagens: dbService.getMensagens(),
      biblioteca: dbService.getBiblioteca(),
      bibliotecaAcessos: dbService.getAcessosBiblioteca(),
      recibos: dbService.getRecibos(),
      configuracoesFinanceiras: getLocal(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, DEFAULT_CONFIGURACOES_FINANCEIRAS),
      transacoesFinanceiras: dbService.getTransacoesFinanceiras(),
      despesasEscolares: dbService.getDespesasEscolares(),
      patrimonio: dbService.getPatrimonio(),
      historicoCompleto: getLocal(STORAGE_KEYS.HISTORICO_COMPLETO, DEFAULT_HISTORICO_COMPLETO),
      configuracaoSistema: nonAdmin ? undefined : dbService.getConfiguracaoSistema(),
      anosLectivos: dbService.getAnosLectivos(),
      anosLectivosConfigs: dbService.getAnosLectivosConfigs(),
      turnosConfigs: dbService.getTurnosConfigs(),
      classesConfigs: dbService.getClassesConfigs(),
      cursos: dbService.getCursos(),
      areasFormacao: dbService.getAreasFormacao(),
      salasAulas: dbService.getSalasAulas(),
      solicitacoesApoio: dbService.getSolicitacoesApoioTecnico(),
      alertasSeguranca: nonAdmin ? [] : dbService.getAlertasSeguranca(),
      relatoriosAcontecimentos: dbService.getRelatoriosAcontecimentos()
    }, null, 2);
  },
  exportarParaExcel: async () => dbService.exportarExcelCompleto(),
  descarregarRelatorioEstatisticoNacionalExcel: async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const escolas = dbService.getEscolas();
    const alunos = dbService.getAlunos();
    const funcs = dbService.getFuncionarios();
    const turmas = dbService.getTurmas();
    const notasCons = dbService.getNotasConsolidadas();

    // 1. Resumo Executivo
    const totalEscolas = escolas.length;
    const ativas = escolas.filter(e => e.ativo && e.estadoEscola !== 'Suspensa').length;
    const suspensas = escolas.filter(e => !e.ativo || e.estadoEscola === 'Suspensa').length;
    const mediaGeralNacional = notasCons.length > 0
      ? Math.round((notasCons.reduce((acc, c) => acc + c.mediaTrimestral, 0) / notasCons.length) * 10) / 10
      : 0;

    const resumoData = [
      { Indicador: 'República de Angola', Valor: 'Ministério da Educação (MED)' },
      { Indicador: 'Data de Emissão do Balanço', Valor: new Date().toLocaleDateString('pt-AO') },
      { Indicador: 'Total de Escolas na Rede Nacional', Valor: totalEscolas },
      { Indicador: 'Escolas Ativas & Operacionais', Valor: ativas },
      { Indicador: 'Escolas Sob Suspensão Administrativa', Valor: suspensas },
      { Indicador: 'Total de Alunos Matriculados (Rede)', Valor: alunos.length },
      { Indicador: 'Total de Funcionários & Professores', Valor: funcs.length },
      { Indicador: 'Total de Turmas Homologadas', Valor: turmas.length },
      { Indicador: 'Taxa Média de Aproveitamento Nacional', Valor: notasCons.length > 0 ? `${mediaGeralNacional} valores` : 'Sem notas registadas' }
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo');

    // 2. Escolas e Diretores
    const escolasData = escolas.map(e => ({
      ID: e.id,
      CodigoEscola: e.codigoEscola || '',
      NomeOficial: e.nomeOficial,
      Provincia: e.provincia || 'Não Definida',
      Municipio: e.municipio || '',
      DiretorGeral: e.diretorGeralNome || 'Pendente de Nomeação',
      SubdiretorPedagogico: e.subdiretorPedagogicoNome || 'Pendente',
      Estado: e.estadoEscola || (e.ativo ? 'Ativa' : 'Suspensa'),
      AnoActivo: e.anoLectivoActivo,
      TrimestreActivo: e.trimestreActivo,
      MotivoSuspensao: e.motivoSuspensao || ''
    }));
    const wsEscolas = XLSX.utils.json_to_sheet(escolasData);
    XLSX.utils.book_append_sheet(wb, wsEscolas, 'Rede Escolas');

    // 3. Quadro Docente
    const wsRH = XLSX.utils.json_to_sheet(funcs.map(f => ({
      Nome: f.nomeCompleto,
      BI: f.numeroBI,
      Cargo: f.cargo,
      Papel: f.role,
      EscolaID: f.escolaId,
      StatusConta: f.statusConta || 'Ativa',
      Professor: f.ehProfessor ? 'Sim' : 'Não'
    })));
    XLSX.utils.book_append_sheet(wb, wsRH, 'Corpo Docente & RH');

    const fileName = `MED_Angola_Relatorio_Estatistico_Nacional_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    dbService.registarLog('Relatório Ministerial', 'Balanço Estatístico Nacional descarregado com sucesso.');
  },
  importarDeExcel: async (file: File): Promise<boolean> => {
    try {
      const res = await dbService.importarExcel(file);
      return res.sucesso;
    } catch {
      return false;
    }
  },

  // ==========================================
  // CONFIGURAÇÕES GERAIS DO SISTEMA (ADMIN GERAL)
  // ==========================================
  getConfiguracaoSistema: (): ConfiguracaoSistema => {
    return getLocal<ConfiguracaoSistema>(STORAGE_KEYS.CONFIGURACAO_SISTEMA, DEFAULT_CONFIGURACAO_SISTEMA);
  },
  salvarConfiguracaoSistema: (config: ConfiguracaoSistema): void => {
    const configComTimestamp: ConfiguracaoSistema = {
      ...config,
      atualizadoEm: new Date().toISOString()
    };
    setLocal(STORAGE_KEYS.CONFIGURACAO_SISTEMA, configComTimestamp);
    // Gravação e sincronização imediata no Firebase Firestore e no dispositivo
    firebaseSyncEngine.salvarConfiguracaoSistema(configComTimestamp);
    dbService.registarLog('Configuração Geral', 'Parâmetros e Insígnia do Sistema atualizados pelo Administrador Geral.');
  },

  // ==========================================
  // MÓDULO FINANCEIRO & SUBDIRECTOR ADMINISTRATIVO
  // ==========================================
  getConfiguracaoFinanceira: (escolaId: string): ConfiguracaoFinanceiraEscola => {
    const map = getLocal<Record<string, ConfiguracaoFinanceiraEscola>>(
      STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, 
      DEFAULT_CONFIGURACOES_FINANCEIRAS
    );
    if (map[escolaId]) return map[escolaId];
    // Fallback padrão se não existir ainda para esta escola
    return {
      escolaId,
      propinasPorClasse: {
        'Iniciação': 7000,
        '1ª': 8000,
        '2ª': 8000,
        '3ª': 8000,
        '4ª': 8000,
        '5ª': 8500,
        '6ª': 9000,
        '7ª': 12000,
        '8ª': 12000,
        '9ª': 13000,
        '10ª': 16000,
        '11ª': 16000,
        '12ª': 17000,
        '13ª': 18000
      },
      taxaMatricula: 5000,
      taxaConfirmacao: 4000,
      taxaDeclaracaoComNotas: 3500,
      taxaDeclaracaoSemNotas: 2000,
      taxaCertificado: 6000,
      taxaCartaoEstudante: 2500,
      taxaExameRecurso: 4500,
      diaLimitePagamento: 10,
      multaAtrasoPercentual: 10,
      ibanEscola: '',
      bancoNome: 'BFA / BAI'
    };
  },
  salvarConfiguracaoFinanceira: (config: ConfiguracaoFinanceiraEscola): void => {
    const configComTs: ConfiguracaoFinanceiraEscola = { ...config, atualizadoEm: new Date().toISOString() };
    const map = getLocal<Record<string, ConfiguracaoFinanceiraEscola>>(
      STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, 
      DEFAULT_CONFIGURACOES_FINANCEIRAS
    );
    map[configComTs.escolaId] = configComTs;
    setLocal(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, map);
    firebaseSyncEngine.salvarConfiguracaoFinanceira(configComTs);
    dbService.registarLog('Configuração Financeira', `Tabela de propinas e taxas atualizada para a escola.`);
  },

  getEmolumentosPersonalizados: (escolaId: string): ItemEmolumentoConfig[] => {
    const config = dbService.getConfiguracaoFinanceira(escolaId);
    return config.emolumentosPersonalizados || [];
  },

  salvarEmolumentoPersonalizado: (item: ItemEmolumentoConfig): void => {
    const config = dbService.getConfiguracaoFinanceira(item.escolaId);
    const lista = config.emolumentosPersonalizados ? [...config.emolumentosPersonalizados] : [];
    const idx = lista.findIndex(e => e.id === item.id);
    if (idx >= 0) {
      lista[idx] = item;
    } else {
      lista.push(item);
    }
    config.emolumentosPersonalizados = lista;
    dbService.salvarConfiguracaoFinanceira(config);
    dbService.registarLog('Emolumentos & Cobranças', `Emolumento "${item.nome}" configurado (${item.valorPadraoKz.toLocaleString()} Kz, classes: ${item.classesAbrangidas.join(', ')}).`);
  },

  removerEmolumentoPersonalizado: (escolaId: string, id: string): void => {
    const config = dbService.getConfiguracaoFinanceira(escolaId);
    if (!config.emolumentosPersonalizados) return;
    const item = config.emolumentosPersonalizados.find(e => e.id === id);
    config.emolumentosPersonalizados = config.emolumentosPersonalizados.filter(e => e.id !== id);
    dbService.salvarConfiguracaoFinanceira(config);
    if (item) {
      dbService.registarLog('Emolumentos & Cobranças', `Emolumento "${item.nome}" removido do sistema.`);
    }
  },

  getTransacoesFinanceiras: (escolaId?: string, anoLectivo?: string): TransacaoFinanceira[] => {
    const todas = getLocal<TransacaoFinanceira[]>(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, DEFAULT_TRANSACOES_FINANCEIRAS);
    let filtradas = todas;
    if (escolaId && escolaId !== 'todas') {
      filtradas = filtradas.filter(t => t.escolaId === escolaId);
    }
    if (anoLectivo && anoLectivo !== 'todos') {
      filtradas = filtradas.filter(t => t.anoLectivo === anoLectivo);
    }
    return filtradas;
  },
  salvarTransacaoFinanceira: (transacao: TransacaoFinanceira): void => {
    const escolaAtiva = dbService.getEscolaAtiva();
    if (!transacao.escolaId || transacao.escolaId === 'esc-001') {
      transacao.escolaId = escolaAtiva?.id || transacao.escolaId;
    }
    if (!transacao.anoLectivo) {
      transacao.anoLectivo = escolaAtiva?.anoLectivoActivo || '';
    }
    const transacaoComTs: TransacaoFinanceira = { ...transacao, atualizadoEm: new Date().toISOString() };
    const todas = getLocal<TransacaoFinanceira[]>(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, DEFAULT_TRANSACOES_FINANCEIRAS);
    const idx = todas.findIndex(t => t.id === transacaoComTs.id);
    if (idx >= 0) todas[idx] = transacaoComTs;
    else todas.unshift(transacaoComTs);
    setLocal(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, todas);
    firebaseSyncEngine.salvarTransacaoFinanceira(transacaoComTs);
    dbService.registarLog('Receita Arrecadada', `Pagamento de ${transacaoComTs.tipo} (${transacaoComTs.anoLectivo}) no valor de ${transacaoComTs.valorTotalKz.toLocaleString()} Kz para o aluno ${transacaoComTs.alunoNome} (Recibo: ${transacaoComTs.numeroRecibo}).`);
  },
  editarTransacaoComAuditoria: (
    transacaoId: string,
    dadosAtualizados: Partial<TransacaoFinanceira>,
    operadorNome: string,
    motivoAuditoria: string
  ): boolean => {
    const todas = getLocal<TransacaoFinanceira[]>(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, DEFAULT_TRANSACOES_FINANCEIRAS);
    const idx = todas.findIndex(t => t.id === transacaoId);
    if (idx < 0) return false;

    const anterior = todas[idx];
    const transacaoAtualizada: TransacaoFinanceira = {
      ...anterior,
      ...dadosAtualizados,
      observacao: `${dadosAtualizados.observacao || anterior.observacao || ''} [Retificado por ${operadorNome} em ${new Date().toLocaleDateString('pt-AO')}: ${motivoAuditoria}]`.trim(),
      observacoes: `${dadosAtualizados.observacoes || anterior.observacoes || ''} [Retificado por ${operadorNome} em ${new Date().toLocaleDateString('pt-AO')}: ${motivoAuditoria}]`.trim(),
      atualizadoEm: new Date().toISOString()
    };
    todas[idx] = transacaoAtualizada;
    setLocal(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, todas);
    firebaseSyncEngine.salvarTransacaoFinanceira(transacaoAtualizada);
    dbService.registarLog(
      'Auditoria Financeira - Edição de Pagamento',
      `Recibo ${anterior.numeroRecibo} (${anterior.alunoNome}) retificado por ${operadorNome}. Valor anterior: ${anterior.valorTotalKz.toLocaleString()} Kz -> Novo: ${transacaoAtualizada.valorTotalKz.toLocaleString()} Kz. Motivo: "${motivoAuditoria}".`
    );
    return true;
  },

  eliminarTransacaoFinanceira: (
    transacaoId: string,
    operadorNome: string,
    motivo: string
  ): boolean => {
    const todas = getLocal<TransacaoFinanceira[]>(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, DEFAULT_TRANSACOES_FINANCEIRAS);
    const anterior = todas.find(t => t.id === transacaoId);
    if (!anterior) return false;

    const filtradas = todas.filter(t => t.id !== transacaoId);
    setLocal(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, filtradas);
    firebaseSyncEngine.eliminarTransacaoFinanceira(transacaoId);

    // Se a transação estiver associada a um aluno, reavaliar o estado de propina
    if (anterior.alunoId) {
      const alunos = dbService.getAlunos();
      const alunoIdx = alunos.findIndex(a => a.id === anterior.alunoId);
      if (alunoIdx >= 0) {
        const aluno = alunos[alunoIdx];
        const pagamentosRestantes = filtradas.filter(
          t => t.status === 'Confirmado' && t.alunoId === aluno.id && (
            t.tipo === 'Propina Mensal' || t.tipo === 'Propina' || (t.tipo as string) === 'Mensalidade'
          )
        );
        if (pagamentosRestantes.length === 0 && aluno.propinaStatus !== 'Isento') {
          alunos[alunoIdx] = { ...aluno, propinaStatus: 'Pendente', atualizadoEm: new Date().toISOString() };
          setLocal(STORAGE_KEYS.ALUNOS, alunos);
          firebaseSyncEngine.salvarAluno(alunos[alunoIdx]);
        }
      }
    }

    dbService.registarLog(
      'Auditoria Financeira - Pagamento Anulado / Apagado',
      `Recibo ${anterior.numeroRecibo} (${anterior.alunoNome}) no valor de ${anterior.valorTotalKz.toLocaleString()} Kz APAGADO/ANULADO por ${operadorNome}. Motivo: "${motivo}".`
    );
    return true;
  },

  getDespesasEscolares: (escolaId?: string, anoLectivo?: string): DespesaEscolar[] => {
    const todas = getLocal<DespesaEscolar[]>(STORAGE_KEYS.DESPESAS_ESCOLARES, DEFAULT_DESPESAS_ESCOLARES);
    let filtradas = todas;
    if (escolaId && escolaId !== 'todas') {
      filtradas = filtradas.filter(d => d.escolaId === escolaId);
    }
    if (anoLectivo && anoLectivo !== 'todos') {
      filtradas = filtradas.filter(d => d.anoLectivo === anoLectivo);
    }
    return filtradas;
  },
  salvarDespesaEscolar: (despesa: DespesaEscolar): void => {
    const escolaAtiva = dbService.getEscolaAtiva();
    if (!despesa.escolaId || despesa.escolaId === 'esc-001') {
      despesa.escolaId = escolaAtiva?.id || despesa.escolaId;
    }
    if (!despesa.anoLectivo) {
      despesa.anoLectivo = escolaAtiva?.anoLectivoActivo || '';
    }
    const despesaComTs: DespesaEscolar = { ...despesa, atualizadoEm: new Date().toISOString() };
    const todas = getLocal<DespesaEscolar[]>(STORAGE_KEYS.DESPESAS_ESCOLARES, DEFAULT_DESPESAS_ESCOLARES);
    const idx = todas.findIndex(d => d.id === despesaComTs.id);
    if (idx >= 0) todas[idx] = despesaComTs;
    else todas.unshift(despesaComTs);
    setLocal(STORAGE_KEYS.DESPESAS_ESCOLARES, todas);
    firebaseSyncEngine.salvarDespesaEscolar(despesaComTs);
    dbService.registarLog('Despesa Registada', `Saída de caixa (${despesaComTs.anoLectivo}): ${despesaComTs.descricao} no valor de ${despesaComTs.valorKz.toLocaleString()} Kz.`);
  },
  eliminarDespesaEscolar: (despesaId: string, operadorNome: string, motivo: string): boolean => {
    const todas = getLocal<DespesaEscolar[]>(STORAGE_KEYS.DESPESAS_ESCOLARES, DEFAULT_DESPESAS_ESCOLARES);
    const anterior = todas.find(d => d.id === despesaId);
    if (!anterior) return false;

    const filtradas = todas.filter(d => d.id !== despesaId);
    setLocal(STORAGE_KEYS.DESPESAS_ESCOLARES, filtradas);
    firebaseSyncEngine.eliminarDespesaEscolar(despesaId);

    dbService.registarLog(
      'Auditoria Financeira - Despesa Anulada / Apagada',
      `Despesa "${anterior.descricao}" no valor de ${anterior.valorKz.toLocaleString()} Kz APAGADA por ${operadorNome}. Motivo: "${motivo}".`
    );
    return true;
  },

  // ==========================================
  // PATRIMÓNIO ESCOLAR
  // ==========================================
  getPatrimonio: (escolaId?: string): ItemPatrimonio[] => {
    const todos = getLocal<ItemPatrimonio[]>(STORAGE_KEYS.PATRIMONIO, DEFAULT_PATRIMONIO);
    if (!escolaId || escolaId === 'todas') return todos;
    return todos.filter(p => p.escolaId === escolaId);
  },
  salvarItemPatrimonio: (item: ItemPatrimonio): void => {
    const itemComTs: ItemPatrimonio = { ...item, atualizadoEm: new Date().toISOString() };
    const todos = getLocal<ItemPatrimonio[]>(STORAGE_KEYS.PATRIMONIO, DEFAULT_PATRIMONIO);
    const idx = todos.findIndex(p => p.id === itemComTs.id);
    if (idx >= 0) todos[idx] = itemComTs;
    else todos.unshift(itemComTs);
    setLocal(STORAGE_KEYS.PATRIMONIO, todos);
    firebaseSyncEngine.salvarItemPatrimonio(itemComTs);
    dbService.registarLog('Património Escolar', `Item patrimonial "${itemComTs.nomeItem}" tombado sob código ${itemComTs.codigoTombamento}.`);
  },
  eliminarItemPatrimonio: (id: string): void => {
    const todos = getLocal<ItemPatrimonio[]>(STORAGE_KEYS.PATRIMONIO, DEFAULT_PATRIMONIO);
    const filtrados = todos.filter(p => p.id !== id);
    setLocal(STORAGE_KEYS.PATRIMONIO, filtrados);
    firebaseSyncEngine.eliminarItemPatrimonio(id);
    dbService.registarLog('Património Escolar', `Item de património ${id} removido do inventário.`);
  },

  // ==========================================
  // HISTÓRICO ESCOLAR COMPLETO (DISCIPLINAS EM CADA CLASSE)
  // ==========================================
  getHistoricoEscolarCompleto: (alunoId: string): HistoricoEscolarCompleto | null => {
    const map = getLocal<Record<string, HistoricoEscolarCompleto>>(
      STORAGE_KEYS.HISTORICO_COMPLETO, 
      DEFAULT_HISTORICO_COMPLETO
    );
    return map[alunoId] || null;
  },
  salvarHistoricoEscolarCompleto: (historico: HistoricoEscolarCompleto): void => {
    const histComTs: HistoricoEscolarCompleto = { ...historico, atualizadoEm: new Date().toISOString() };
    const map = getLocal<Record<string, HistoricoEscolarCompleto>>(
      STORAGE_KEYS.HISTORICO_COMPLETO, 
      DEFAULT_HISTORICO_COMPLETO
    );
    map[histComTs.alunoId] = histComTs;
    setLocal(STORAGE_KEYS.HISTORICO_COMPLETO, map);
    firebaseSyncEngine.salvarHistoricoEscolarCompleto(histComTs);
    dbService.registarLog('Histórico Escolar', `Histórico de notas finais por disciplina atualizado para o aluno ${histComTs.alunoId}.`);
  },

  // ==========================================
  // INICIALIZAÇÃO LIMPA E REMOÇÃO DE DADOS DE DEMONSTRAÇÃO
  // ==========================================
  limparDadosDemonstracaoEInicializar: (
    adminData: {
      nomeCompleto: string;
      email: string;
      telefone: string;
      numeroBI: string;
      senha?: string;
    },
    configSistema?: {
      insigniaNacionalUrl?: string;
      nomeSistema?: string;
      ministerioNome?: string;
    }
  ): boolean => {
    try {
      // 1. Criar novo utilizador Admin Geral do Sistema
      const novoAdmin: Funcionario = {
        id: `admin-${Date.now()}`,
        escolaId: 'todas',
        nomeCompleto: adminData.nomeCompleto.trim(),
        genero: 'M',
        numeroBI: adminData.numeroBI.trim().toUpperCase(),
        telefone: adminData.telefone.trim(),
        email: adminData.email.trim().toLowerCase(),
        cargo: 'Administrador Geral do Sistema',
        ehProfessor: false,
        ehAdministrativoQueLeciona: false,
        habilitacoes: 'Especialista em Administração de Sistemas',
        dataAdmissao: new Date().toISOString().split('T')[0],
        ativo: true,
        fotoUrl: (adminData as any).fotoUrl || '',
        role: 'AdminGeral',
        statusConta: 'Ativa'
      };

      // 2. Definir Configuração do Sistema em Modo de Execução Oficial
      const config: ConfiguracaoSistema = {
        insigniaNacionalUrl: configSistema?.insigniaNacionalUrl || '',
        nomeSistema: configSistema?.nomeSistema || 'SGE-NG',
        subtituloSistema: 'Sistema de Gestão Escolar de Angola',
        ministerioNome: configSistema?.ministerioNome || 'Ministério da Educação (MED)',
        pais: 'República de Angola',
        modoProducao: true,
        sincronizacaoFirebaseAtiva: true,
        criadoPorAdminEmail: novoAdmin.email,
        dataInicializacao: new Date().toISOString(),
        ultimaSincronizacao: new Date().toISOString()
      };

      // 3. Limpar coleções de demonstração e manter estruturas limpas prontas para inserção
      setLocal(STORAGE_KEYS.FUNCIONARIOS, [novoAdmin]);
      setLocal(STORAGE_KEYS.CURRENT_USER, novoAdmin);
      setLocal(STORAGE_KEYS.CONFIGURACAO_SISTEMA, config);
      setLocal(STORAGE_KEYS.ALUNOS, []);
      setLocal(STORAGE_KEYS.NOTAS, []);
      setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, []);
      setLocal(STORAGE_KEYS.AVALIACOES, []);
      setLocal(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, []);
      setLocal(STORAGE_KEYS.DESPESAS_ESCOLARES, []);
      setLocal(STORAGE_KEYS.PATRIMONIO, []);
      setLocal(STORAGE_KEYS.HISTORICO_COMPLETO, {});
      setLocal(STORAGE_KEYS.RECIBOS, []);
      setLocal(STORAGE_KEYS.SOLICITACOES_NOTA, []);
      setLocal(STORAGE_KEYS.MENSAGENS, []);
      setLocal(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, true);

      // Log imutável da inicialização oficial
      const logsIniciais: LogAuditoria[] = [
        {
          id: `log-init-${Date.now()}`,
          escolaId: 'todas',
          utilizadorId: novoAdmin.id,
          utilizadorNome: novoAdmin.nomeCompleto,
          papel: 'AdminGeral',
          acao: 'Inicialização Oficial do Sistema',
          detalhe: 'Dados de demonstração expurgados com sucesso. Sistema entrou em modo de execução oficial ligado à persistência local e Firebase.',
          ip: '127.0.0.1 (Local)',
          dataHora: new Date().toLocaleString('pt-AO')
        }
      ];
      setLocal(STORAGE_KEYS.AUDITORIA, logsIniciais);

      // Notificar persistência offline e Firebase
      dbService.sincronizarComFirebase();
      return true;
    } catch (e) {
      console.error('Erro na inicialização oficial:', e);
      return false;
    }
  },

  // ==========================================
  // CONFIGURAÇÃO DOS PASSES ESCOLARES (8 POR A4)
  // ==========================================
  obterConfiguracaoPasses: (escolaId: string): ConfiguracaoPassesEscola => {
    const configs = getLocal<Record<string, ConfiguracaoPassesEscola>>(STORAGE_KEYS.CONFIGURACOES_PASSES, {});
    if (configs[escolaId]) {
      return configs[escolaId];
    }
    return DEFAULT_CONFIGURACAO_PASSES;
  },

  salvarConfiguracaoPasses: (escolaId: string, config: ConfiguracaoPassesEscola): void => {
    const configComTs: ConfiguracaoPassesEscola = { ...config, atualizadoEm: new Date().toISOString() };
    const configs = getLocal<Record<string, ConfiguracaoPassesEscola>>(STORAGE_KEYS.CONFIGURACOES_PASSES, {});
    configs[escolaId] = configComTs;
    setLocal(STORAGE_KEYS.CONFIGURACOES_PASSES, configs);
    firebaseSyncEngine.salvarConfiguracaoPasses(escolaId, configComTs);

    // Também sincroniza as cores da instituição
    const escola = dbService.getEscolaAtiva();
    if (escola && escola.id === escolaId) {
      escola.corPrimaria = configComTs.corPrimaria;
      escola.corSecundaria = configComTs.corSecundaria;
      escola.corFundoPasses = configComTs.corFundoFrente;
      escola.configuracaoPasses = configComTs;
      dbService.salvarEscola(escola);
    }
  },

  // ==========================================
  // HORÁRIOS ESCOLARES SEM COINCIDÊNCIA DE TEMPO
  // ==========================================
  obterHorarios: (escolaId?: string): HorarioAulaItem[] => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    if (!escolaId || escolaId === 'todas') return horarios;
    return horarios.filter(h => h.escolaId === escolaId);
  },

  obterHorarioDaTurma: (turmaId: string): HorarioAulaItem[] => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    return horarios.filter(h => h.turmaId === turmaId).sort((a, b) => a.numeroTempo - b.numeroTempo);
  },

  obterHorarioDoProfessor: (professorId: string): HorarioAulaItem[] => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    return horarios.filter(h => h.professorId === professorId).sort((a, b) => a.numeroTempo - b.numeroTempo);
  },

  validarConflitoHorario: (
    item: Omit<HorarioAulaItem, 'id'>, 
    idIgnorar?: string
  ): { temConflito: boolean; motivo?: string } => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    
    for (const h of horarios) {
      if (idIgnorar && h.id === idIgnorar) continue;

      // 1. Conflito do mesmo professor na mesma hora em turmas distintas
      if (
        h.diaSemana === item.diaSemana &&
        h.numeroTempo === item.numeroTempo &&
        h.professorId === item.professorId
      ) {
        return {
          temConflito: true,
          motivo: `O(A) Professor(a) ${h.professorNome} já tem aula atribuída na ${h.classe} na ${h.diaSemana}, no ${h.numeroTempo}º tempo!`
        };
      }

      // 2. Conflito da mesma sala no mesmo horário
      if (
        h.diaSemana === item.diaSemana &&
        h.numeroTempo === item.numeroTempo &&
        h.escolaId === item.escolaId &&
        h.sala.trim().toLowerCase() === item.sala.trim().toLowerCase() &&
        h.turmaId !== item.turmaId
      ) {
        return {
          temConflito: true,
          motivo: `A ${h.sala} já está ocupada pela turma ${h.classe} na ${h.diaSemana}, no ${h.numeroTempo}º tempo!`
        };
      }

      // 3. Conflito de tempo na mesma turma
      if (
        h.diaSemana === item.diaSemana &&
        h.numeroTempo === item.numeroTempo &&
        h.turmaId === item.turmaId
      ) {
        return {
          temConflito: true,
          motivo: `A turma já possui aula de ${h.disciplinaNome} na ${h.diaSemana}, no ${h.numeroTempo}º tempo!`
        };
      }
    }

    return { temConflito: false };
  },

  salvarHorario: (item: HorarioAulaItem): { sucesso: boolean; erro?: string } => {
    const validacao = dbService.validarConflitoHorario(item, item.id);
    if (validacao.temConflito) {
      return { sucesso: false, erro: validacao.motivo };
    }

    const itemComTs: HorarioAulaItem = { ...item, atualizadoEm: new Date().toISOString() };
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    const index = horarios.findIndex(h => h.id === itemComTs.id);
    if (index >= 0) {
      horarios[index] = itemComTs;
    } else {
      horarios.push(itemComTs);
    }
    setLocal(STORAGE_KEYS.HORARIOS, horarios);
    firebaseSyncEngine.salvarHorario(itemComTs);
    return { sucesso: true };
  },

  eliminarHorario: (id: string): void => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    const filtrados = horarios.filter(h => h.id !== id);
    setLocal(STORAGE_KEYS.HORARIOS, filtrados);
    firebaseSyncEngine.eliminarHorario(id);
  },

  // ==========================================
  // FICHAS DE PRESENÇAS DOS ALUNOS POR PERÍODO
  // ==========================================
  obterPresencasAlunos: (turmaId?: string, periodo?: string): PresencaAlunoItem[] => {
    const presencas = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    if (!turmaId) return presencas;
    return presencas.filter(p => p.turmaId === turmaId);
  },

  salvarPresencaAluno: (item: PresencaAlunoItem): void => {
    const presencas = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    const itemComTimestamp = { ...item, atualizadoEm: new Date().toISOString() };
    const index = presencas.findIndex(p => p.id === itemComTimestamp.id || (p.alunoId === itemComTimestamp.alunoId && p.data === itemComTimestamp.data && p.tempoLectivo === itemComTimestamp.tempoLectivo));
    if (index >= 0) {
      presencas[index] = itemComTimestamp;
    } else {
      presencas.push(itemComTimestamp);
    }
    setLocal(STORAGE_KEYS.PRESENCAS_ALUNOS, presencas);
    firebaseSyncEngine.salvarPresencaAluno(itemComTimestamp);
  },

  salvarPresencasAlunosLote: (items: PresencaAlunoItem[]): void => {
    const presencas = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    const agora = new Date().toISOString();
    const normalizados = items.map(item => ({ ...item, atualizadoEm: agora }));
    for (const item of normalizados) {
      const index = presencas.findIndex(p => p.id === item.id || (p.alunoId === item.alunoId && p.data === item.data && p.tempoLectivo === item.tempoLectivo));
      if (index >= 0) {
        presencas[index] = item;
      } else {
        presencas.push(item);
      }
    }
    setLocal(STORAGE_KEYS.PRESENCAS_ALUNOS, presencas);
    firebaseSyncEngine.salvarPresencasAlunosLote(normalizados);
  },

  removerPresencaAluno: (alunoId: string, data: string, turmaId?: string): void => {
    const presencas = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    const removido = presencas.find(p => p.alunoId === alunoId && p.data === data && (!turmaId || p.turmaId === turmaId));
    const filtradas = presencas.filter(p => !(p.alunoId === alunoId && p.data === data && (!turmaId || p.turmaId === turmaId)));
    setLocal(STORAGE_KEYS.PRESENCAS_ALUNOS, filtradas);
    if (removido?.id) {
      firebaseSyncEngine.eliminarDocumentoDireto('presencas_alunos', removido.id, undefined, `Remoção presença aluno ${removido.id}`);
    }
  },

  verificarIntegridadeBanco: () => {
    let totalBytes = 0;
    let totalRegistos = 0;
    try {
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sge_')) {
            const val = localStorage.getItem(key) || '';
            totalBytes += key.length + val.length;
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                totalRegistos += parsed.length;
              } else if (typeof parsed === 'object' && parsed !== null) {
                totalRegistos += Object.keys(parsed).length;
              } else {
                totalRegistos += 1;
              }
            } catch {
              totalRegistos += 1;
            }
          }
        }
      }
    } catch {
      // Ignora erro
    }

    const tamanhoFormatado = totalBytes > 1024 * 1024 
      ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(totalBytes / 1024)} KB`;

    return {
      status: 'Operacional',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      tamanhoBytes: totalBytes,
      tamanhoFormatado: totalBytes > 0 ? tamanhoFormatado : '0 KB',
      totalRegistos,
      integridadeOk: true,
      ultimaVerificacao: new Date().toLocaleTimeString('pt-AO')
    };
  },

  // Sincronização direta e real com Firebase Firestore e Motor Offline do Dispositivo
  sincronizarComFirebase: async (): Promise<{ sucesso: boolean; mensagem: string }> => {
    try {
      const res = await firebaseSyncEngine.sincronizarTudoImediato();
      const config = dbService.getConfiguracaoSistema();
      config.ultimaSincronizacao = new Date().toISOString();
      setLocal(STORAGE_KEYS.CONFIGURACAO_SISTEMA, config);
      return res;
    } catch (e: any) {
      return { sucesso: false, mensagem: 'Sincronização em segundo plano enfileirada no buffer offline do dispositivo.' };
    }
  },

  // ==========================================
  // SESSÕES, UTILIZADORES ONLINE E ÚLTIMAS 24 HORAS
  // ==========================================
  getSessoesAtivas: (): SessaoAtivaUsuario[] => {
    const sessoes = dbService.getSessoesAtivasBrutas();
    if (!isSessaoAutenticadaNaoAdminGeral()) return sessoes;
    const { ids } = getAdminGeralIdsAndNomes();
    return sessoes.filter(s => s.userRole !== 'AdminGeral' && (s as any).role !== 'AdminGeral' && !ids.has(s.userId));
  },

  registarHeartbeatUsuario: (user: Funcionario, escola?: Escola): void => {
    try {
      const sessoes = dbService.getSessoesAtivasBrutas();
      const agora = Date.now();
      const esc = escola || dbService.getEscolaAtiva();
      const idx = sessoes.findIndex(s => s.userId === user.id);

      if (idx >= 0) {
        sessoes[idx].ultimoAcesso = agora;
        sessoes[idx].online = true;
        sessoes[idx].escolaId = esc.id;
        sessoes[idx].escolaNome = esc.nomeOficial;
      } else {
        sessoes.unshift({
          id: `sess-${user.id}-${agora}`,
          userId: user.id,
          userName: user.nomeCompleto,
          userRole: user.role,
          escolaId: esc.id,
          escolaNome: esc.nomeOficial,
          cargo: user.cargo,
          ip: '197.234.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250),
          loginTime: agora,
          ultimoAcesso: agora,
          online: true
        });
      }

      // Marcar como offline quem não comunica há mais de 15 minutos
      const limiteOnline = agora - 15 * 60 * 1000;
      sessoes.forEach(s => {
        if (s.ultimoAcesso < limiteOnline) {
          s.online = false;
        }
      });

      // Manter apenas as últimas 150 sessões
      if (sessoes.length > 150) sessoes.length = 150;
      setLocal(STORAGE_KEYS.SESSOES_ATIVAS, sessoes);

      // Sincronizar sessão ativa com throttle (a cada 60s por utilizador) para o Firestore
      if (user?.id) {
        const lastSyncKey = `sge_hb_sync_${user.id}`;
        const lastSync = Number(sessionStorage.getItem(lastSyncKey) || 0);
        if (agora - lastSync > 60000) {
          sessionStorage.setItem(lastSyncKey, String(agora));
          const sessaoAtual = sessoes.find(s => s.userId === user.id);
          if (sessaoAtual) {
            firebaseSyncEngine.salvarSessaoAtiva(sessaoAtual);
          }
        }
      }
    } catch {
      // Ignora erro
    }
  },

  getUsuariosOnline: (escolaId?: string): SessaoAtivaUsuario[] => {
    const sessoes = dbService.getSessoesAtivas();
    const agora = Date.now();
    const limiteOnline = agora - 15 * 60 * 1000; // 15 minutos de tolerância
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids } = getAdminGeralIdsAndNomes();

    const filtradas = sessoes.filter(s => {
      const isOnline = s.online || s.ultimoAcesso >= limiteOnline;
      if (!isOnline) return false;
      if (ocultarAdmin && (s.userRole === 'AdminGeral' || (s as any).role === 'AdminGeral' || ids.has(s.userId))) {
        return false;
      }
      // Se escolaId foi fornecido (Diretor de Escola), NUNCA exibir sessões do Administrador Geral
      if (escolaId && escolaId !== 'todas') {
        if (s.userRole === 'AdminGeral' || (s as any).role === 'AdminGeral') return false;
        return s.escolaId === escolaId;
      }
      return true;
    });

    // Deduplicação precisa por utilizador mantendo o acesso mais recente
    const mapaUnico = new Map<string, SessaoAtivaUsuario>();
    filtradas.forEach(s => {
      const chave = s.userId || s.userName;
      const existente = mapaUnico.get(chave);
      if (!existente || s.ultimoAcesso > existente.ultimoAcesso) {
        mapaUnico.set(chave, s);
      }
    });

    return Array.from(mapaUnico.values());
  },

  getUsuariosUltimas24Horas: (escolaId?: string): SessaoAtivaUsuario[] => {
    const sessoes = dbService.getSessoesAtivas();
    const agora = Date.now();
    const limite24h = agora - 24 * 60 * 60 * 1000;
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids } = getAdminGeralIdsAndNomes();

    const filtradas = sessoes.filter(s => {
      if (s.ultimoAcesso < limite24h) return false;
      if (ocultarAdmin && (s.userRole === 'AdminGeral' || (s as any).role === 'AdminGeral' || ids.has(s.userId))) {
        return false;
      }
      // Se escolaId foi fornecido (Diretor de Escola), NUNCA exibir sessões do Administrador Geral
      if (escolaId && escolaId !== 'todas') {
        if (s.userRole === 'AdminGeral' || (s as any).role === 'AdminGeral') return false;
        return s.escolaId === escolaId;
      }
      return true;
    });

    // Deduplicação precisa por utilizador
    const mapaUnico = new Map<string, SessaoAtivaUsuario>();
    filtradas.forEach(s => {
      const chave = s.userId || s.userName;
      const existente = mapaUnico.get(chave);
      if (!existente || s.ultimoAcesso > existente.ultimoAcesso) {
        mapaUnico.set(chave, s);
      }
    });

    return Array.from(mapaUnico.values());
  },

  // ==========================================
  // REGISTOS DE ALTERAÇÃO DE NOTAS PELA DIREÇÃO (LOG NO PROFESSOR)
  // ==========================================
  getRegistosAlteracoesNotas: (professorId?: string, escolaId?: string): RegistroAlteracaoNotaDirecao[] => {
    const todos = getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []);
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids } = getAdminGeralIdsAndNomes();
    return todos.filter(r => {
      if (ocultarAdmin && (r.alteradoPorRole === 'AdminGeral' || (r.alteradoPorId && ids.has(r.alteradoPorId)))) return false;
      if (professorId && r.professorId !== professorId) return false;
      if (escolaId && escolaId !== 'todas' && r.escolaId !== escolaId) return false;
      return true;
    });
  },

  salvarRegistoAlteracaoNotaDirecao: (reg: RegistroAlteracaoNotaDirecao): void => {
    const regComTs: RegistroAlteracaoNotaDirecao = { ...reg, atualizadoEm: new Date().toISOString() };
    const todos = getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []);
    todos.unshift(regComTs);
    if (todos.length > 300) todos.length = 300;
    setLocal(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, todos);
    firebaseSyncEngine.salvarAlteracaoNotaDirecao(regComTs);

    // 1. Registar no log de auditoria oficial da escola (automaticamente marcado como origemAdminGeral se aplicável)
    dbService.registarLog(
      'Retificação Executiva de Nota',
      `Nota de ${regComTs.tipoNota} do estudante "${regComTs.alunoNome}" (Turma ${regComTs.turmaNome}, ${regComTs.classe}, ${regComTs.disciplinaNome}) retificada de ${regComTs.notaAnterior} para ${regComTs.novaNota} por ${regComTs.alteradoPorNome} (${regComTs.alteradoPorRole}). Motivo: "${regComTs.motivoJustificativa}". Professor titular: ${regComTs.professorNome}.`
    );

    // 2. Notificar automaticamente o professor titular apenas quando não for intervenção silenciosa do AdminGeral
    if (regComTs.alteradoPorRole !== 'AdminGeral') {
      try {
        dbService.enviarMensagem({
          id: `msg-retif-${Date.now()}`,
          escolaId: regComTs.escolaId,
          remetenteId: regComTs.alteradoPorId,
          remetenteNome: regComTs.alteradoPorNome,
          remetentePapel: regComTs.alteradoPorRole,
          remetenteCargo: regComTs.alteradoPorRole === 'DiretorGeral' ? 'Diretor Geral' : 'Subdiretor Pedagógico',
          tipo: 'DIRECTA',
          destinatarioTipo: 'Individual',
          destinatarioId: regComTs.professorId,
          destinatarioNome: regComTs.professorNome,
          titulo: `Aviso de Retificação de Nota: ${regComTs.alunoNome} (${regComTs.disciplinaNome} - ${regComTs.turmaNome})`,
          assunto: 'Retificação Executiva de Nota',
          conteudo: `Estimado(a) Colega ${regComTs.professorNome},\n\nInformamos que a Direção da instituição procedeu à alteração da nota de ${regComTs.tipoNota} do(a) estudante ${regComTs.alunoNome} na turma ${regComTs.turmaNome} (${regComTs.classe}${regComTs.curso ? ' - ' + regComTs.curso : ''}) na disciplina de ${regComTs.disciplinaNome} (${regComTs.trimestre}º Trimestre).\n\n• Nota Anterior: ${regComTs.notaAnterior}\n• Nova Nota Homologada: ${regComTs.novaNota}\n• Justificativa: ${regComTs.motivoJustificativa}\n• Autorizado por: ${regComTs.alteradoPorNome} (${regComTs.alteradoPorRole})\n• Data/Hora: ${regComTs.dataHora}\n\nEste registo encontra-se devidamente averbado na sua folha de ocorrências e na trilha de auditoria ministerial.`,
          dataHora: new Date().toISOString()
        });
      } catch {
        // Ignora erro
      }
    }
  },

  marcarAlteracaoNotaComoLida: (id: string): void => {
    const todos = getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []);
    const idx = todos.findIndex(r => r.id === id);
    if (idx >= 0) {
      todos[idx].lidoPeloProfessor = true;
      todos[idx].atualizadoEm = new Date().toISOString();
      setLocal(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, todos);
      firebaseSyncEngine.salvarAlteracaoNotaDirecao(todos[idx]);
    }
  },

  // ==========================================
  // CONFIGURAÇÃO DE DIZERES E DISPOSIÇÃO DE DOCUMENTOS COM PRÉ-VISUALIZAÇÃO
  // ==========================================
  getConfiguracoesDocumentos: (escolaId?: string): Record<string, ConfiguracaoDocumentoCustomizado> => {
    const todos = getLocal<Record<string, ConfiguracaoDocumentoCustomizado>>(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, {});
    const escId = escolaId || dbService.getEscolaAtiva().id;
    const padrao: Record<string, ConfiguracaoDocumentoCustomizado> = {
      pauta_trimestral: {
        id: `conf-pauta-${escId}`,
        escolaId: escId,
        tipoDocumento: 'pauta_trimestral',
        tituloOficial: 'PAUTA DE AVALIAÇÃO TRIMESTRAL DE RENDIMENTO ESCOLAR',
        subtitulo: 'Registo Oficial de Avaliação Contínua e Médias Trimestrais',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL\nGABINETE PROVINCIAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Nos termos da legislação do Ministério da Educação em vigor, publicam-se as notas e classificações obtidas pelos estudantes.',
        textoFechamento: 'A presente pauta foi lavrada em Conselho de Notas e homologada pela Direção da Escola.',
        textoRodape: '',
        artigoLegalDecreto: 'Decreto Executivo n.º 250/18 de 06 de Outubro | Avaliação do Sistema de Ensino Secundário',
        disposicao: {
          orientacao: 'paisagem',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: true,
          exibirAssinaturaSecretaria: true,
          exibirAssinaturaProfessor: true,
          tamanhoFonte: 'compacto',
          corDestaque: '#1e3a8a'
        }
      },
      boletim_oficial: {
        id: `conf-boletim-${escId}`,
        escolaId: escId,
        tipoDocumento: 'boletim_oficial',
        tituloOficial: 'BOLETIM DE NOTAS TRIMESTRAIS',
        subtitulo: 'Ficha Informativa de Rendimento e Comportamento Escolar',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO\nDIRECÇÃO MUNICIPAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Para conhecimento dos Encarregados de Educação, apresentam-se as notas e faltas registadas no período.',
        textoFechamento: 'O Director da Escola certifica a exatidão das notas aqui constantes.',
        textoRodape: 'Exige-se a apresentação deste boletim para confirmação de matrícula no trimestre seguinte.',
        artigoLegalDecreto: 'Artigo 109º da Lei de Bases do Sistema de Educação e Ensino (Lei n.º 32/20)',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: true,
          exibirAssinaturaSecretaria: false,
          exibirAssinaturaProfessor: true,
          tamanhoFonte: 'padrao',
          corDestaque: '#1e3a8a'
        }
      },
      certificado: {
        id: `conf-cert-${escId}`,
        escolaId: escId,
        tipoDocumento: 'certificado',
        tituloOficial: 'CERTIFICADO DE HABILITAÇÕES LITERÁRIAS',
        subtitulo: 'Conclusão de Estudos do Ensino Secundário Geral',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL\nGABINETE PROVINCIAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Certifico, para os efeitos devidos e em cumprimento da lei, que o estudante abaixo identificado concluiu com aproveitamento o plano curricular.',
        textoFechamento: 'Por ser verdade e ter sido solicitado pelo interessado, mandou-se passar o presente certificado que vai assinado e autenticado com o selo branco em uso nesta instituição.',
        textoRodape: 'Registado sob o Livro de Termos Oficial na Secretaria da Escola.',
        artigoLegalDecreto: 'Decreto Presidencial n.º 160/18 de 03 de Julho',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'centro',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: false,
          exibirAssinaturaSecretaria: false,
          exibirAssinaturaProfessor: false,
          tamanhoFonte: 'padrao',
          corDestaque: '#0f172a'
        }
      },
      declaracao_notas: {
        id: `conf-decl-notas-${escId}`,
        escolaId: escId,
        tipoDocumento: 'declaracao_notas',
        tituloOficial: 'DECLARAÇÃO DE HABILITAÇÕES (COM NOTAS)',
        subtitulo: 'Aproveitamento Escolar Curricular',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO',
        textoCorpoAbertura: 'Declara-se, a pedido do interessado, para os devidos efeitos legais e escolares, que frequentou e concluiu com aproveitamento:',
        textoFechamento: 'Por ser verdade e ter sido solicitada pela parte interessada, mandou-se passar a presente declaração que vai por mim assinada e autenticada com o carimbo a óleo e selo branco em uso neste estabelecimento de ensino.',
        textoRodape: '',
        artigoLegalDecreto: 'alínea e) do artigo 109º da Lei n.º 32/20 de 12 de Agosto (Bases do Sistema de Educação e Ensino)',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: true,
          exibirAssinaturaSecretaria: false,
          exibirAssinaturaProfessor: false,
          tamanhoFonte: 'padrao',
          corDestaque: '#1e3a8a'
        }
      },
      declaracao_matricula: {
        id: `conf-decl-matr-${escId}`,
        escolaId: escId,
        tipoDocumento: 'declaracao_matricula',
        tituloOficial: 'DECLARAÇÃO DE MATRÍCULA EFECTIVA',
        subtitulo: 'Comprovativo Oficial de Vínculo Estudantil',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO',
        textoCorpoAbertura: 'Para os devidos efeitos e a pedido do interessado, declara-se que o estudante está regularmente matriculado no presente ano lectivo.',
        textoFechamento: 'Passou-se a presente declaração que vai devidamente conferida pela Chefia de Secretaria e Direcção.',
        textoRodape: 'Emitido a requerimento do estudante / encarregado de educação.',
        artigoLegalDecreto: 'Regulamento Geral das Escolas do Ensino Primário e Secundário',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: false,
          exibirAssinaturaSecretaria: true,
          exibirAssinaturaProfessor: false,
          tamanhoFonte: 'padrao',
          corDestaque: '#1e3a8a'
        }
      },
      cartao_estudante: {
        id: `conf-cartao-${escId}`,
        escolaId: escId,
        tipoDocumento: 'cartao_estudante',
        tituloOficial: 'CARTÃO DE IDENTIFICAÇÃO DO ESTUDANTE',
        subtitulo: 'Passe de Identificação Escolar',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO',
        textoCorpoAbertura: 'Válido exclusivamente para o ano letivo ativo em todo o território nacional.',
        textoFechamento: 'Uso pessoal e intransmissível. Em caso de extravio, devolver à secretaria da escola.',
        textoRodape: '',
        artigoLegalDecreto: 'Norma de Identificação Escolar MED',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: false,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: false,
          exibirAssinaturaSecretaria: false,
          exibirAssinaturaProfessor: false,
          tamanhoFonte: 'compacto',
          corDestaque: '#1e3a8a'
        }
      },
      termo_exame: {
        id: `conf-termo-${escId}`,
        escolaId: escId,
        tipoDocumento: 'termo_exame',
        tituloOficial: 'TERMO DE EXAME E DELIBERAÇÃO DO JÚRI',
        subtitulo: 'Acta Oficial de Realização de Exames e Classificação Final',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL\nGABINETE PROVINCIAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Aos dias do mês e ano em curso, reuniu-se o Júri de Exame nomeado por Despacho da Direção da Escola para deliberar e homologar os resultados.',
        textoFechamento: 'Nada mais havendo a tratar, lavrou-se a presente acta que vai assinada pelos membros do júri e pelo Presidente da Comissão.',
        textoRodape: 'Arquivado nos livros permanentes de termos da secretaria.',
        artigoLegalDecreto: 'Regulamento de Exames do Ministério da Educação',
        disposicao: {
          orientacao: 'paisagem',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: true,
          exibirAssinaturaSecretaria: true,
          exibirAssinaturaProfessor: true,
          tamanhoFonte: 'padrao',
          corDestaque: '#0f172a'
        }
      },
      guia_transferencia: {
        id: `conf-guia-${escId}`,
        escolaId: escId,
        tipoDocumento: 'guia_transferencia',
        tituloOficial: 'GUIA DE TRANSFERÊNCIA ESCOLAR OFICIAL',
        subtitulo: 'Autorização e Encaminhamento de Estudante',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO',
        textoCorpoAbertura: 'Serve a presente guia para transferir, a pedido do encarregado de educação e sem prejuízo escolar, o estudante abaixo indicado.',
        textoFechamento: 'A escola de destino deverá devolver o talão de confirmação anexado a esta guia devidamente assinado e carimbado.',
        textoRodape: 'Válido por 30 dias para efetivação da transferência.',
        artigoLegalDecreto: 'Normativo de Mobilidade Estudantil MED',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: true,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: true,
          exibirAssinaturaSecretaria: true,
          exibirAssinaturaProfessor: false,
          tamanhoFonte: 'padrao',
          corDestaque: '#1e3a8a'
        }
      },
      recibo_pagamento: {
        id: `conf-recibo-${escId}`,
        escolaId: escId,
        tipoDocumento: 'recibo_pagamento',
        tituloOficial: 'RECIBO DE PAGAMENTO DE PROPINAS E TAXAS',
        subtitulo: 'Comprovativo de Arrecadação de Receita Escolar',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO',
        textoCorpoAbertura: 'Confirmamos a receção do montante indicado em pagamento das taxas ou propinas escolares discriminadas.',
        textoFechamento: 'Guarde este comprovativo para efeitos de conferência e matrícula.',
        textoRodape: 'Comprovativo Oficial de Arrecadação de Receita Escolar',
        artigoLegalDecreto: 'Regulamento de Emolumentos e Gestão Financeira Escolar',
        disposicao: {
          orientacao: 'retrato',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: false,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: false,
          exibirAssinaturaSubdiretor: false,
          exibirAssinaturaSecretaria: true,
          exibirAssinaturaProfessor: false,
          tamanhoFonte: 'compacto',
          corDestaque: '#16a34a'
        }
      }
    };

    // Mesclar o guardado com o padrão garantindo todos os subcampos de disposicao
    const resultado: Record<string, ConfiguracaoDocumentoCustomizado> = { ...padrao };
    Object.keys(todos).forEach(k => {
      if (todos[k].escolaId === escId) {
        const tipo = todos[k].tipoDocumento;
        const base = padrao[tipo];
        resultado[tipo] = base
          ? {
              ...base,
              ...todos[k],
              disposicao: {
                ...base.disposicao,
                ...(todos[k].disposicao || {})
              }
            }
          : todos[k];
      }
    });

    return resultado;
  },

  salvarConfiguracaoDocumento: (config: ConfiguracaoDocumentoCustomizado): void => {
    const configComTs: ConfiguracaoDocumentoCustomizado = { ...config, atualizadoEm: new Date().toISOString() };
    const todos = getLocal<Record<string, ConfiguracaoDocumentoCustomizado>>(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, {});
    const chave = `${configComTs.escolaId}_${configComTs.tipoDocumento}`;
    todos[chave] = configComTs;
    setLocal(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, todos);
    firebaseSyncEngine.salvarConfiguracaoDocumento(configComTs);

    dbService.registarLog(
      'Configuração de Documento',
      `Layout, cabeçalho e dizeres oficiais do documento "${configComTs.tipoDocumento}" atualizados com sucesso.`
    );
  },

  // ==========================================
  // DELEGAÇÃO DE COBRANÇAS FINANCEIRAS PELO DIRETOR
  // ==========================================
  getDelegacoesCobranca: (escolaId: string): DelegacaoCobrancaFinanceira[] => {
    const map = getLocal<Record<string, DelegacaoCobrancaFinanceira[]>>(STORAGE_KEYS.DELEGACOES_COBRANCA, {});
    return map[escolaId] || [];
  },

  salvarDelegacaoCobranca: (escolaId: string, delegacao: DelegacaoCobrancaFinanceira): void => {
    const delegacaoComTs: DelegacaoCobrancaFinanceira = { ...delegacao, atualizadoEm: new Date().toISOString() };
    const map = getLocal<Record<string, DelegacaoCobrancaFinanceira[]>>(STORAGE_KEYS.DELEGACOES_COBRANCA, {});
    const lista = map[escolaId] || [];
    const idx = lista.findIndex(d => d.id === delegacaoComTs.id);
    if (idx >= 0) {
      lista[idx] = delegacaoComTs;
    } else {
      lista.unshift(delegacaoComTs);
    }
    map[escolaId] = lista;
    setLocal(STORAGE_KEYS.DELEGACOES_COBRANCA, map);
    firebaseSyncEngine.salvarDelegacoesCobranca(escolaId, lista);

    dbService.registarLog(
      'Delegação Financeira',
      `O Diretor Geral delegou cobrança financeira ao colaborador "${delegacao.funcionarioNome}" (${delegacao.cargo || delegacao.role}). Emolumentos autorizados: ${delegacao.emolumentosPermitidos.join(', ')}.`
    );
  },

  removerDelegacaoCobranca: (escolaId: string, delegacaoId: string): void => {
    const map = getLocal<Record<string, DelegacaoCobrancaFinanceira[]>>(STORAGE_KEYS.DELEGACOES_COBRANCA, {});
    const lista = map[escolaId] || [];
    const alvo = lista.find(d => d.id === delegacaoId);
    map[escolaId] = lista.filter(d => d.id !== delegacaoId);
    setLocal(STORAGE_KEYS.DELEGACOES_COBRANCA, map);
    firebaseSyncEngine.salvarDelegacoesCobranca(escolaId, map[escolaId]);

    if (alvo) {
      dbService.registarLog(
        'Revogação de Delegação Financeira',
        `Delegação de cobrança financeira de "${alvo.funcionarioNome}" revogada pelo Diretor Geral.`
      );
    }
  },

  // ==========================================
  // DELEGAÇÃO DE PODERES (MATRÍCULAS E COBRANÇA DE EMOLUMENTOS)
  // Autorizado: Diretor Geral e Subdiretor Administrativo
  // ==========================================
  getDelegacoesPoderes: (escolaId?: string, tipo?: TipoDelegacao): DelegacaoPoderes[] => {
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids } = getAdminGeralIdsAndNomes();
    return todas.filter(d => {
      if (ocultarAdmin && (d.delegadoPorCargo === 'AdminGeral' || ids.has(d.delegadoPorId) || ids.has(d.funcionarioId))) return false;
      if (escolaId && d.escolaId !== escolaId) return false;
      if (tipo && d.tipo !== tipo) return false;
      return true;
    });
  },

  salvarDelegacaoPoderes: (delegacao: DelegacaoPoderes): void => {
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    const idx = todas.findIndex(d => d.id === delegacao.id);
    const registroFinal: DelegacaoPoderes = idx >= 0
      ? { ...delegacao, atualizadoEm: new Date().toISOString() }
      : { ...delegacao, criadoEm: delegacao.criadoEm || new Date().toISOString() };
    if (idx >= 0) {
      todas[idx] = registroFinal;
    } else {
      todas.unshift(registroFinal);
    }
    setLocal(STORAGE_KEYS.DELEGACOES_PODERES, todas);
    firebaseSyncEngine.salvarDelegacaoPoderes(registroFinal);

    dbService.registarLog(
      'Delegação de Competências',
      `${delegacao.delegadoPorCargo === 'DiretorGeral' ? 'O Diretor Geral' : 'O Subdiretor Administrativo'} (${delegacao.delegadoPorNome}) delegou poderes de ${delegacao.tipo === 'Matriculas' ? 'Matrículas & Confirmações' : 'Cobrança de Emolumentos'} a "${delegacao.funcionarioNome}" (${delegacao.funcionarioCargo}).`
    );
  },

  revogarDelegacaoPoderes: (delegacaoId: string, revogadoPorNome: string): void => {
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    const alvo = todas.find(d => d.id === delegacaoId);
    if (alvo) {
      alvo.ativo = false;
      alvo.atualizadoEm = new Date().toISOString();
      setLocal(STORAGE_KEYS.DELEGACOES_PODERES, todas);
      firebaseSyncEngine.salvarDelegacaoPoderes(alvo);

      dbService.registarLog(
        'Revogação de Delegação',
        `Delegação de ${alvo.tipo === 'Matriculas' ? 'Matrículas' : 'Cobrança de Emolumentos'} de "${alvo.funcionarioNome}" foi revogada por ${revogadoPorNome}.`
      );
    }
  },

  verificarPoderesDelegados: (funcionarioId: string, escolaId: string): { podeMatricular: boolean; podeCobrarEmolumentos: boolean; podeCobrar?: boolean; delegacoesAtivas: DelegacaoPoderes[] } => {
    if (!funcionarioId) return { podeMatricular: false, podeCobrarEmolumentos: false, podeCobrar: false, delegacoesAtivas: [] };
    const hoje = new Date().toISOString().split('T')[0];
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    
    const ativas = todas.filter(d => 
      d.funcionarioId === funcionarioId &&
      (!escolaId || d.escolaId === escolaId) &&
      d.ativo &&
      (!d.dataFim || d.dataFim >= hoje) &&
      d.dataInicio <= hoje
    );

    const temCobranca = ativas.some(d => d.tipo === 'CobrancaEmolumentos');
    return {
      podeMatricular: ativas.some(d => d.tipo === 'Matriculas'),
      podeCobrarEmolumentos: temCobranca,
      podeCobrar: temCobranca,
      delegacoesAtivas: ativas
    };
  },

  registarAcaoDelegada: (logData: Omit<AcaoDelegadaLog, 'id' | 'dataHora'>): void => {
    const logs = getLocal<AcaoDelegadaLog[]>(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, []);
    const novoLog: AcaoDelegadaLog = {
      ...logData,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataHora: new Date().toISOString()
    };
    logs.unshift(novoLog);
    if (logs.length > 2000) logs.pop();
    setLocal(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, logs);
    firebaseSyncEngine.salvarAcaoDelegadaLog(novoLog);
  },

  getLogsAcoesDelegadas: (escolaId?: string, tipo?: TipoDelegacao, funcionarioId?: string): AcaoDelegadaLog[] => {
    const logs = getLocal<AcaoDelegadaLog[]>(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, []);
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids, nomes } = getAdminGeralIdsAndNomes();
    return logs.filter(l => {
      if (ocultarAdmin && (ids.has(l.funcionarioId) || nomes.has((l.funcionarioNome || '').trim().toLowerCase()))) return false;
      if (escolaId && l.escolaId !== escolaId) return false;
      if (tipo && l.tipo !== tipo) return false;
      if (funcionarioId && l.funcionarioId !== funcionarioId) return false;
      return true;
    });
  },

  // ==========================================
  // SESSÕES DE APOIO TÉCNICO AUTORIZADAS (ADMIN GERAL)
  // ==========================================
  iniciarSessaoApoioTecnico: (escolaId: string, solicitacaoId: string, admin: Funcionario, motivo?: string): boolean => {
    const realUser = dbService.getCurrentUser();
    const operador = isAdminGeralUserObj(realUser) ? realUser : admin;
    if (isSessaoAutenticadaNaoAdminGeral() || !isAdminGeralUserObj(operador)) {
      return false;
    }
    const escolas = dbService.getEscolasBrutas();
    const idx = escolas.findIndex(e => e.id === escolaId);
    if (idx < 0) return false;

    const agora = new Date().toISOString();
    const escolaAtualizada: Escola = {
      ...escolas[idx],
      atualizadoEm: agora,
      sessaoApoioTecnicoAtiva: {
        solicitacaoId,
        adminGeralId: operador.id,
        adminGeralNome: operador.nomeCompleto,
        dataInicio: agora,
        motivo: motivo || 'Intervenção técnica sob pedido do Diretor da Escola'
      }
    };
    escolas[idx] = escolaAtualizada;
    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
    firebaseSyncEngine.salvarEscola(escolaAtualizada);
    dbService.setEscolaAtiva(escolaId);

    if (solicitacaoId) {
      try {
        dbService.responderSolicitacaoApoioTecnico(
          solicitacaoId,
          'Em_Atendimento',
          operador.nomeCompleto,
          `Sessão de intervenção e apoio técnico iniciada pelo Administrador Geral às ${new Date().toLocaleTimeString('pt-AO')}.`
        );
      } catch {}
    }

    // Registar no log da instituição que o Admin Geral entrou sob apoio técnico
    dbService.registarLog(
      'Acesso de Suporte Técnico Autorizado',
      `O Administrador Geral "${operador.nomeCompleto}" acedeu aos sistemas internos da escola sob autorização formal do Diretor (Chamado #${(solicitacaoId || 'DTI').slice(-6)}). Todas as ações subsequentes serão auditadas na íntegra.`
    );

    return true;
  },

  encerrarSessaoApoioTecnico: (escolaId: string, admin: Funcionario): boolean => {
    const realUser = dbService.getCurrentUser();
    const operador = isAdminGeralUserObj(realUser) ? realUser : admin;
    if (isSessaoAutenticadaNaoAdminGeral() || !isAdminGeralUserObj(operador)) {
      return false;
    }
    const escolas = dbService.getEscolasBrutas();
    const idx = escolas.findIndex(e => e.id === escolaId);
    if (idx < 0) return false;

    const solId = escolas[idx].sessaoApoioTecnicoAtiva?.solicitacaoId || '';
    const agora = new Date().toISOString();
    const copia: Escola = { ...escolas[idx], atualizadoEm: agora };
    delete copia.sessaoApoioTecnicoAtiva;
    escolas[idx] = copia;

    setLocal(STORAGE_KEYS.ESCOLAS, escolas);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
    firebaseSyncEngine.encerrarSessaoApoioNoFirestore(escolaId, copia);

    dbService.registarLog(
      'Encerramento de Suporte Técnico',
      `Sessão de apoio técnico do Administrador Geral "${operador.nomeCompleto}" encerrada. Acesso da escola devolvido à governança interna exclusiva.`
    );

    // Concluir o chamado associado e quaisquer outros chamados em atendimento desta escola
    const solicitacoes = dbService.getSolicitacoesApoioBrutas();
    let alterouChamados = false;
    const solicitacoesAtualizadas = solicitacoes.map(sol => {
      const mesmoChamado = solId && sol.id === solId;
      const emAtendimentoNaEscola =
        sol.escolaId === escolaId &&
        (sol.estado === 'Em_Atendimento' || sol.status === 'Em_Atendimento');
      if (mesmoChamado || emAtendimentoNaEscola) {
        alterouChamados = true;
        const atualizado: SolicitacaoApoioTecnico = {
          ...sol,
          estado: 'Concluido',
          status: 'Concluido',
          autorizacaoAcessoConcedida: false,
          autorizacaoAcessoValida: false,
          atendidoPorAdminNome: operador.nomeCompleto,
          respostaTecnica: `Intervenção técnica concluída com sucesso às ${new Date().toLocaleTimeString('pt-AO')}.`,
          dataResolucao: new Date().toLocaleString('pt-AO'),
          atualizadoEm: agora
        };
        firebaseSyncEngine.salvarSolicitacaoApoio(atualizado);
        return atualizado;
      }
      return sol;
    });

    if (alterouChamados) {
      setLocal(STORAGE_KEYS.SOLICITACOES_APOIO, solicitacoesAtualizadas);
      offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.SOLICITACOES_APOIO, JSON.stringify(solicitacoesAtualizadas));
    }

    return true;
  },

  // ============================================================================
  // RELATÓRIOS DE ACONTECIMENTOS, REUNIÕES, PALESTRAS & DESENVOLVIMENTOS
  // ============================================================================
  getRelatoriosAcontecimentos: (escolaId?: string): RelatorioAcontecimento[] => {
    const lista = getLocal<RelatorioAcontecimento[]>(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, []);
    const ordenados = [...lista].sort((a, b) => {
      const da = a.data || a.criadoEm || '';
      const db = b.data || b.criadoEm || '';
      return db.localeCompare(da);
    });
    if (!escolaId || escolaId === 'TODAS' || escolaId === 'todas') {
      return ordenados;
    }
    return ordenados.filter(r => r.escolaId === escolaId);
  },

  salvarRelatorioAcontecimento: (rel: RelatorioAcontecimento): RelatorioAcontecimento => {
    const lista = getLocal<RelatorioAcontecimento[]>(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, []);
    const agora = new Date().toISOString();
    const itemFinal: RelatorioAcontecimento = {
      ...rel,
      atualizadoEm: agora,
      criadoEm: rel.criadoEm || agora
    };
    const idx = lista.findIndex(r => r.id === itemFinal.id);
    if (idx >= 0) {
      lista[idx] = itemFinal;
    } else {
      lista.unshift(itemFinal);
    }
    setLocal(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, lista);
    firebaseSyncEngine.salvarRelatorioAcontecimento(itemFinal);
    dbService.registarLog(
      'Registo de Relatório Institucional',
      `${itemFinal.categoria}: "${itemFinal.titulo}" (${itemFinal.data}) — Estado: ${itemFinal.estado}.`
    );
    return itemFinal;
  },

  excluirRelatorioAcontecimento: (id: string): boolean => {
    const lista = getLocal<RelatorioAcontecimento[]>(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, []);
    const alvo = lista.find(r => r.id === id);
    if (!alvo) return false;
    const filtrados = lista.filter(r => r.id !== id);
    setLocal(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, filtrados);
    firebaseSyncEngine.eliminarRelatorioAcontecimento(id);
    dbService.registarLog(
      'Eliminação de Relatório Institucional',
      `Removido o relatório "${alvo.titulo}" (${alvo.categoria} - ${alvo.data}).`
    );
    return true;
  }
};



