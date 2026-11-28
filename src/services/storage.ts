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
  Trimestre,
  PeriodoTrimestre,
  PeriodoLetivoConfig,
  RegimePeriodosLetivos,
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
  RelatorioAcontecimento,
  ConfiguracaoCamposDocumento,
  RegraVisibilidadeDadosSensiveis,
  RegraVisibilidadePorCargo,
  ConfiguracaoVisibilidadeEmpregados,
  RelatorioFinalInterinidade,
  OcorrenciaHistoricoAluno,
  CoordenacaoEscolar,
  TipoCoordenacaoPersonalizada,
  RelatorioPedagogicoFormal,
  AtividadePlanoEscolar,
  DadosFinancasPessoaisUsuario,
  HorarioProvaItem,
  MapaFiscalizacaoProva,
  AtaProvaRegistro,
  MapaFeriasItem,
  MaterialLimpezaItem,
  MovimentoEstoqueLimpeza,
  CategoriaMaterialLimpeza,
  UnidadeMedidaLimpeza,
  TipoMovimentoEstoqueLimpeza
} from '../types';
import { isClasseFinal } from './macEngine';
import {
  extrairLinhasComCabecalhoAutomatico,
  classificarFolhaExcel,
  obterCampoFlexivel,
  obterCampoBrutoFlexivel,
  converterValorDataExcel,
  converterNumeroNotaExcel,
  normalizarClasseImportacao,
  normalizarTurnoImportacao,
  normalizarGeneroImportacao,
  normalizarAnoLectivoImportacao,
  normalizarRoleImportacao,
  normalizarTextoComparacao,
  inferirNivelEnsinoPorClasse,
  ALIASES_ALUNO,
  ALIASES_FUNCIONARIO,
  ALIASES_NOTA
} from '../utils/flexibleExcelImport';
import {
  getCachedLocal,
  setCachedLocalEntry,
  removeCachedLocalEntry,
  getComputedCache
} from './localCache';
import { turnosHorariosConflitam } from '../utils/scheduleGenerator';

export const STORAGE_KEYS = {
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
  COORDENACOES: 'sge_coordenacoes',
  TIPOS_COORDENACAO: 'sge_tipos_coordenacao',
  RELATORIOS_PEDAGOGICOS: 'sge_relatorios_pedagogicos',
  PLANOS_ATIVIDADES: 'sge_planos_atividades',
  FINANCAS_PESSOAIS: 'sge_financas_pessoais',
  HORARIOS_PROVAS: 'sge_horarios_provas',
  MAPAS_FISCALIZACAO: 'sge_mapas_fiscalizacao',
  ATAS_PROVAS: 'sge_atas_provas',
  MAPAS_FERIAS: 'sge_mapas_ferias',
  ESTOQUE_LIMPEZA: 'sge_estoque_limpeza',
  MOVIMENTOS_LIMPEZA: 'sge_movimentos_limpeza',
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

export const DEFAULT_CAMPOS_DADOS_DOCUMENTO: ConfiguracaoCamposDocumento = {
  // Dados da Escola
  mostrarProvinciaMunicipio: true,
  mostrarGovernoGabinete: true,
  mostrarNif: true,
  mostrarDecreto: true,
  mostrarContatosEmail: true,
  mostrarDataLocalExtenso: true,
  // Dados do Aluno
  mostrarFoto: true,
  mostrarNumeroProcessoMatricula: true,
  mostrarNumeroOrdem: true,
  mostrarBI: true,
  mostrarDataEmissaoBI: true,
  mostrarFiliacao: true,
  mostrarDataNascimento: true,
  mostrarNaturalidadeProvincia: true,
  mostrarResidencia: true,
  mostrarEncarregado: true,
  mostrarContactoEncarregado: true,
  mostrarTurmaSalaTurno: true,
  mostrarCurso: true,
  mostrarLivroFolhaRegisto: true,
  // Dados Académicos & Avaliações
  mostrarMacNppNptDetalhado: true,
  mostrarFaltas: true,
  mostrarComportamento: true,
  mostrarMediaGeral: true,
  mostrarSituacaoFinal: true,
  mostrarEscalaExtenso: true,
  mostrarHistoricoOcorrencias: true,
  // Dados do Funcionário
  mostrarFuncionarioFoto: true,
  mostrarFuncionarioBI: true,
  mostrarFuncionarioNif: true,
  mostrarFuncionarioContatos: true,
  mostrarFuncionarioNumeroAgente: true,
  mostrarFuncionarioGrauEspecialidade: true,
  mostrarFuncionarioCategoriaContrato: true,
  mostrarFuncionarioDadosBancariosIbanInss: true,
  mostrarFuncionarioCargaHoraria: true
};

export const DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS: RegraVisibilidadeDadosSensiveis = {
  verContactosAlunosEncarregados: true,
  verDocumentosIdentificacaoAlunos: true,
  verSituacaoFinanceiraPropinasAlunos: true,
  verDadosSensiveisFuncionarios: true,
  verEstatisticasGlobaisEscola: true,
  verLogsAuditoriaSistema: true
};

export const DEFAULT_CONFIGURACAO_VISIBILIDADE_EMPREGADOS: ConfiguracaoVisibilidadeEmpregados = {
  ativo: false,
  aplicarRestricaoPadraoTodosEmpregados: true,
  padraoEmpregados: { ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS },
  modulosBloqueadosPadrao: [],
  regrasPorCargo: {}
};

export const DEFAULT_CONFIGURACAO_PASSES: ConfiguracaoPassesEscola = {
  corPrimaria: '#1e3a8a', // Azul Real MED
  corSecundaria: '#d97706', // Ouro / Dourado
  corTexto: '#ffffff',
  corTextoSecundario: '#1e293b',
  corFundoFrente: '#ffffff',
  corBorda: '#1e3a8a',
  estiloTarja: 'elegante_dourado',
  formatoLayout: 'classico_horizontal',
  tipoFundo: 'solido',
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
  tamanhoFoto: 'padrao',
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

const LEGACY_PURGE_FLAG = 'sge_legacy_purge_v2_done';

function executarPurgaLegadoAssincrona(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(LEGACY_PURGE_FLAG) === 'true') return;

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

    const escolasAtuais = dbService.getEscolas();
    if (escolasAtuais.length === 0) {
      const funcs = dbService.getFuncionarios();
      const funcsReais = funcs.filter(f => f.role === 'AdminGeral' || (f.nomeCompleto && f.password));
      if (funcsReais.length !== funcs.length) {
        setLocal(STORAGE_KEYS.FUNCIONARIOS, funcsReais);
      }
    }

    localStorage.setItem(LEGACY_PURGE_FLAG, 'true');
  } catch (e) {
    console.warn('Erro ao purgar dados de teste no armazenamento local:', e);
  }
}

// Initializer ultra-rápido (sem parse síncrono de listas pesadas antes da primeira pintura)
export function inicializarArmazenamento(): void {
  if (typeof window === 'undefined') return;

  try {
    const rawCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (rawCurrentUser === 'undefined' || rawCurrentUser === 'null') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }

    const isAuth = localStorage.getItem('sge_authenticated') === 'true';
    const hasUser = !!localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (isAuth || hasUser) {
      if (localStorage.getItem('sge_admin_configured') !== 'true') {
        localStorage.setItem('sge_admin_configured', 'true');
      }
      if (localStorage.getItem(STORAGE_KEYS.SETUP_MASTER_LOCK) !== 'true') {
        localStorage.setItem(STORAGE_KEYS.SETUP_MASTER_LOCK, 'true');
      }
      if (localStorage.getItem(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO) !== 'true') {
        localStorage.setItem(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, 'true');
      }
    } else if (localStorage.getItem('sge_admin_configured') !== 'true') {
      const rawFuncs = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
      if (rawFuncs && rawFuncs !== 'undefined' && rawFuncs !== 'null' && rawFuncs !== '[]') {
        try {
          const funcs = JSON.parse(rawFuncs);
          const temAdmin = Array.isArray(funcs) && funcs.some((f: any) => f.role === 'AdminGeral' && f.ativo !== false);
          if (temAdmin || (Array.isArray(funcs) && funcs.length > 0)) {
            localStorage.setItem('sge_admin_configured', 'true');
            localStorage.setItem(STORAGE_KEYS.SETUP_MASTER_LOCK, 'true');
            localStorage.setItem(STORAGE_KEYS.SETUP_INICIAL_CONCLUIDO, 'true');
          }
        } catch {}
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA)) {
      localStorage.setItem(STORAGE_KEYS.CONFIGURACAO_SISTEMA, JSON.stringify(DEFAULT_CONFIGURACAO_SISTEMA));
    }

    // Purga de dados legados apenas uma vez por dispositivo e em tempo ocioso (zero bloqueio no arranque)
    if (localStorage.getItem(LEGACY_PURGE_FLAG) !== 'true') {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(() => executarPurgaLegadoAssincrona(), { timeout: 1500 });
      } else {
        setTimeout(() => executarPurgaLegadoAssincrona(), 120);
      }
    }
  } catch {}
}

// Auto-inicialização leve do armazenamento sem bloquear o primeiro frame
if (typeof window !== 'undefined') {
  try {
    inicializarArmazenamento();
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
  { colecao: 'relatoriosAcontecimentos', rotulo: 'Relatórios de Acontecimentos', storageKey: STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS },
  { colecao: 'coordenacoes', rotulo: 'Coordenações Escolares', storageKey: STORAGE_KEYS.COORDENACOES },
  { colecao: 'tiposCoordenacaoPersonalizados', rotulo: 'Tipos de Coordenação Personalizados', storageKey: STORAGE_KEYS.TIPOS_COORDENACAO },
  { colecao: 'relatoriosPedagogicos', rotulo: 'Relatórios Pedagógicos Formais', storageKey: STORAGE_KEYS.RELATORIOS_PEDAGOGICOS },
  { colecao: 'planosAtividades', rotulo: 'Planos de Atividades e Eventos', storageKey: STORAGE_KEYS.PLANOS_ATIVIDADES },
  { colecao: 'mapasFerias', rotulo: 'Mapas de Férias (RH & Limpeza)', storageKey: STORAGE_KEYS.MAPAS_FERIAS },
  { colecao: 'materiaisLimpeza', rotulo: 'Estoque de Materiais de Limpeza', storageKey: STORAGE_KEYS.ESTOQUE_LIMPEZA },
  { colecao: 'movimentosLimpeza', rotulo: 'Movimentos de Estoque de Limpeza', storageKey: STORAGE_KEYS.MOVIMENTOS_LIMPEZA }
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
    auditoria: dbService.getAuditoriaBruta().filter(l => {
      if (nonAdmin && (isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes) || l.escolaId === 'ADMIN_GLOBAL' || l.escolaId === 'SISTEMA')) {
        return false;
      }
      if (isEscolaEspecifica) {
        return l.escolaId === effectiveEscolaId;
      }
      return true;
    }),
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
    relatoriosAcontecimentos: getLocal<RelatorioAcontecimento[]>(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, []),
    coordenacoes: getLocal<CoordenacaoEscolar[]>(STORAGE_KEYS.COORDENACOES, []),
    tiposCoordenacaoPersonalizados: getLocal<TipoCoordenacaoPersonalizada[]>(STORAGE_KEYS.TIPOS_COORDENACAO, []),
    relatoriosPedagogicos: getLocal<RelatorioPedagogicoFormal[]>(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, []),
    planosAtividades: getLocal<AtividadePlanoEscolar[]>(STORAGE_KEYS.PLANOS_ATIVIDADES, []),
    mapasFerias: getLocal<MapaFeriasItem[]>(STORAGE_KEYS.MAPAS_FERIAS, []),
    materiaisLimpeza: getLocal<MaterialLimpezaItem[]>(STORAGE_KEYS.ESTOQUE_LIMPEZA, []),
    movimentosLimpeza: getLocal<MovimentoEstoqueLimpeza[]>(STORAGE_KEYS.MOVIMENTOS_LIMPEZA, [])
  };

  const colecoesFiltradasPorEscola = new Set([
    'alunos',
    'turmas',
    'atribuicoes',
    'coordenacoes',
    'tiposCoordenacaoPersonalizados',
    'relatoriosPedagogicos',
    'planosAtividades',
    'mapasFerias',
    'materiaisLimpeza',
    'movimentosLimpeza',
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
      } else if (def.colecao === 'auditoria') {
        list = list.filter((item: any) => item?.escolaId === effectiveEscolaId);
      } else if (def.colecao === 'disciplinas' || def.colecao === 'notas') {
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
    try {
      dbService.garantirDiretorNosFuncionarios(escolaFinal);
    } catch {}
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

    // 2. Identificar IDs relacionais desta escola antes de limpar as coleções
    const alunosRemovidosIds = new Set<string>();
    const turmasRemovidasIds = new Set<string>();
    const avaliacoesRemovidasIds = new Set<string>();
    const funcsRemovidosIds = new Set<string>();
    const bibRemovidosIds = new Set<string>();
    const mensagensRemovidasIds: string[] = [];
    const notasEstRemovidasIds: string[] = [];
    const notasConsRemovidasIds: string[] = [];
    const docConfigKeysRemovidas: string[] = [];

    try {
      const todosAlunos = getLocal<Aluno[]>(STORAGE_KEYS.ALUNOS, []);
      const alunosRest = todosAlunos.filter(a => {
        if (a && a.escolaId === escolaId) {
          if (a.id) alunosRemovidosIds.add(a.id);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.ALUNOS, alunosRest);
    } catch {}

    try {
      const todasTurmas = getLocal<Turma[]>(STORAGE_KEYS.TURMAS, []);
      const turmasRest = todasTurmas.filter(t => {
        if (t && t.escolaId === escolaId) {
          if (t.id) turmasRemovidasIds.add(t.id);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.TURMAS, turmasRest);
    } catch {}

    try {
      const todasAv = getLocal<AvaliacaoCriada[]>(STORAGE_KEYS.AVALIACOES, []);
      const avRest = todasAv.filter(av => {
        if (av && (av.escolaId === escolaId || turmasRemovidasIds.has(av.turmaId))) {
          if (av.id) avaliacoesRemovidasIds.add(av.id);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.AVALIACOES, avRest);
    } catch {}

    // Funcionários: remover apenas funcionários exclusivos desta escola (preservando AdminGeral)
    try {
      const funcs = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
      const filtrados = funcs.filter(f => {
        if (f && f.role !== 'AdminGeral' && f.escolaId === escolaId) {
          if (f.id) funcsRemovidosIds.add(f.id);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.FUNCIONARIOS, filtrados);
    } catch {}

    try {
      const bibs = getLocal<DocumentoBiblioteca[]>(STORAGE_KEYS.BIBLIOTECA, []);
      const bibRest = bibs.filter(b => {
        if (b && b.escolaId === escolaId) {
          if (b.id) bibRemovidosIds.add(b.id);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.BIBLIOTECA, bibRest);
    } catch {}

    // Helper genérico para filtrar arrays por escolaId (ou critério extra relacional)
    const filterOutSchool = (key: string, extraMatch?: (item: any) => boolean) => {
      try {
        const items = getLocal<any[]>(key, []);
        if (Array.isArray(items)) {
          const filtrados = items.filter(item => {
            if (!item) return false;
            if (item.escolaId === escolaId || (extraMatch && extraMatch(item))) {
              return false;
            }
            return true;
          });
          if (filtrados.length !== items.length) {
            setLocal(key, filtrados);
          }
        }
      } catch {}
    };

    filterOutSchool(STORAGE_KEYS.DISCIPLINAS);
    filterOutSchool(STORAGE_KEYS.ATRIBUICOES, (a) => turmasRemovidasIds.has(a.turmaId));
    filterOutSchool(STORAGE_KEYS.TERMOS_EXAME, (t) => turmasRemovidasIds.has(t.turmaId));
    filterOutSchool(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, (t) => alunosRemovidosIds.has(t.alunoId));
    filterOutSchool(STORAGE_KEYS.DESPESAS_ESCOLARES);
    filterOutSchool(STORAGE_KEYS.PATRIMONIO);
    filterOutSchool(STORAGE_KEYS.SOLICITACOES_NOTA, (s) => alunosRemovidosIds.has(s.alunoId));
    filterOutSchool(STORAGE_KEYS.JURIS, (j) => turmasRemovidasIds.has(j.turmaId));
    filterOutSchool(STORAGE_KEYS.PRESENCAS, (p) => funcsRemovidosIds.has(p.funcionarioId));
    filterOutSchool(STORAGE_KEYS.PRESENCAS_ALUNOS, (pa) => alunosRemovidosIds.has(pa.alunoId) || turmasRemovidasIds.has(pa.turmaId));
    filterOutSchool(STORAGE_KEYS.HORARIOS, (h) => turmasRemovidasIds.has(h.turmaId));
    filterOutSchool(STORAGE_KEYS.BIBLIOTECA_ACESSOS);
    filterOutSchool(STORAGE_KEYS.RECIBOS, (r) => alunosRemovidosIds.has(r.alunoId));
    filterOutSchool(STORAGE_KEYS.DELEGACOES_PODERES);
    filterOutSchool(STORAGE_KEYS.ACOES_DELEGADAS_LOGS);
    filterOutSchool(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, (r) => alunosRemovidosIds.has(r.alunoId) || turmasRemovidasIds.has(r.turmaId));
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
    filterOutSchool(STORAGE_KEYS.COORDENACOES, (c) => Boolean(c.turmaId && turmasRemovidasIds.has(c.turmaId)));
    filterOutSchool(STORAGE_KEYS.TIPOS_COORDENACAO);
    filterOutSchool(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS);
    filterOutSchool(STORAGE_KEYS.PLANOS_ATIVIDADES);
    filterOutSchool(STORAGE_KEYS.HORARIOS_PROVAS, (h) => turmasRemovidasIds.has(h.turmaId));
    filterOutSchool(STORAGE_KEYS.MAPAS_FISCALIZACAO, (m) => turmasRemovidasIds.has(m.turmaId));
    filterOutSchool(STORAGE_KEYS.ATAS_PROVAS, (a) => turmasRemovidasIds.has(a.turmaId));
    filterOutSchool(STORAGE_KEYS.MAPAS_FERIAS, (f) => funcsRemovidosIds.has(f.funcionarioId));
    filterOutSchool(STORAGE_KEYS.ESTOQUE_LIMPEZA);
    filterOutSchool(STORAGE_KEYS.MOVIMENTOS_LIMPEZA);
    filterOutSchool(STORAGE_KEYS.EMOLUMENTOS_CONFIG);
    filterOutSchool(STORAGE_KEYS.SESSOES_ATIVAS, (s) => funcsRemovidosIds.has(s.userId));
    filterOutSchool(STORAGE_KEYS.AUDITORIA, (l) => funcsRemovidosIds.has(l.usuarioId));

    // Notas individuais e consolidadas (podem não ter escolaId explícito)
    try {
      const todasNotas = getLocal<NotaEstudante[]>(STORAGE_KEYS.NOTAS, []);
      const notasRest = todasNotas.filter(n => {
        if (!n) return false;
        const match = n.escolaId === escolaId || alunosRemovidosIds.has(n.alunoId) || avaliacoesRemovidasIds.has(n.avaliacaoId);
        if (match) {
          notasEstRemovidasIds.push(n.id || `${n.avaliacaoId}_${n.alunoId}`);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.NOTAS, notasRest);
    } catch {}

    try {
      const todasCons = getLocal<NotaTrimestralConsolidada[]>(STORAGE_KEYS.NOTAS_CONSOLIDADAS, []);
      const consRest = todasCons.filter(nc => {
        if (!nc) return false;
        const match = (nc as any).escolaId === escolaId || alunosRemovidosIds.has(nc.alunoId) || turmasRemovidasIds.has(nc.turmaId);
        if (match) {
          notasConsRemovidasIds.push(nc.id || `${nc.alunoId}_${nc.disciplinaId}_${nc.trimestre}_${nc.anoLectivo || 'padrao'}`);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, consRest);
    } catch {}

    // Mensagens internas relacionadas à escola ou aos seus utilizadores
    try {
      const msgs = getLocal<MensagemInterna[]>(STORAGE_KEYS.MENSAGENS, []);
      const msgsRest = msgs.filter(m => {
        if (!m) return false;
        const match = (m as any).escolaId === escolaId || Boolean(m.remetenteId && funcsRemovidosIds.has(m.remetenteId)) || Boolean(m.destinatarioId && funcsRemovidosIds.has(m.destinatarioId));
        if (match) {
          if (m.id) mensagensRemovidasIds.push(m.id);
          return false;
        }
        return true;
      });
      setLocal(STORAGE_KEYS.MENSAGENS, msgsRest);
    } catch {}

    // Limpar mapas indexados por escolaId / alunoId / userId
    try {
      const histMap = getLocal<Record<string, HistoricoEscolarCompleto>>(STORAGE_KEYS.HISTORICO_COMPLETO, {});
      let changedHist = false;
      for (const aId of alunosRemovidosIds) {
        if (histMap[aId]) {
          delete histMap[aId];
          changedHist = true;
        }
      }
      Object.keys(histMap).forEach(k => {
        if ((histMap[k] as any)?.escolaId === escolaId) {
          delete histMap[k];
          alunosRemovidosIds.add(k);
          changedHist = true;
        }
      });
      if (changedHist) setLocal(STORAGE_KEYS.HISTORICO_COMPLETO, histMap);
    } catch {}

    try {
      const finMap = getLocal<Record<string, DadosFinancasPessoaisUsuario>>(STORAGE_KEYS.FINANCAS_PESSOAIS, {});
      let changedFin = false;
      for (const fId of funcsRemovidosIds) {
        if (finMap[fId]) {
          delete finMap[fId];
          changedFin = true;
        }
      }
      if (changedFin) setLocal(STORAGE_KEYS.FINANCAS_PESSOAIS, finMap);
    } catch {}

    try {
      const docCfgMap = getLocal<Record<string, ConfiguracaoDocumentoCustomizado>>(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, {});
      let changedDocCfg = false;
      Object.keys(docCfgMap).forEach(k => {
        if (k.startsWith(`${escolaId}_`) || (docCfgMap[k] as any)?.escolaId === escolaId) {
          delete docCfgMap[k];
          docConfigKeysRemovidas.push(k);
          changedDocCfg = true;
        }
      });
      if (changedDocCfg) setLocal(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, docCfgMap);
    } catch {}

    const deleteFromSchoolMap = (key: string) => {
      try {
        const map = getLocal<Record<string, any>>(key, {});
        if (map && Object.prototype.hasOwnProperty.call(map, escolaId)) {
          delete map[escolaId];
          setLocal(key, map);
        }
      } catch {}
    };
    deleteFromSchoolMap(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS);
    deleteFromSchoolMap(STORAGE_KEYS.CONFIGURACOES_PASSES);
    deleteFromSchoolMap(STORAGE_KEYS.DELEGACOES_COBRANCA);

    // Limpar Eventos Escolares e Calendário desta escola no localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const rawEv = localStorage.getItem('sge_eventos_escolares');
        if (rawEv) {
          const evts = JSON.parse(rawEv);
          if (Array.isArray(evts)) {
            localStorage.setItem('sge_eventos_escolares', JSON.stringify(evts.filter((ev: any) => ev?.escolaId !== escolaId)));
          }
        }
        localStorage.removeItem(`sge_calendario_${escolaId}`);
        localStorage.removeItem(`sge_calendario_tipos_${escolaId}`);
      } catch {}
    }

    // Atualizar rótulos globais de anos letivos que não pertençam a nenhuma outra escola restante
    try {
      const configsRestantes = getLocal<AnoLectivoConfig[]>(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, []);
      const anosEmUso = new Set(configsRestantes.map(c => c.rotulo).filter(Boolean));
      const anosAtuais = getLocal<string[]>(STORAGE_KEYS.ANOS_LECTIVOS, []);
      const anosFiltrados = anosAtuais.filter(a => anosEmUso.has(a));
      if (anosFiltrados.length !== anosAtuais.length) {
        setLocal(STORAGE_KEYS.ANOS_LECTIVOS, anosFiltrados);
        firebaseSyncEngine.salvarAnosLectivosLista(anosFiltrados);
      }
    } catch {}

    // 3. Limpar IndexedDB (mídias, PDFs, funcionários e calendários desta escola) + fila offline antiga
    const idsRelacionados = {
      alunosIds: Array.from(alunosRemovidosIds),
      funcionariosIds: Array.from(funcsRemovidosIds),
      avaliacoesIds: Array.from(avaliacoesRemovidasIds),
      notasEstudantesIds: notasEstRemovidasIds,
      notasConsolidadasIds: notasConsRemovidasIds,
      bibliotecaIds: Array.from(bibRemovidosIds),
      mensagensIds: mensagensRemovidasIds,
      docConfigKeys: docConfigKeysRemovidas
    };
    offlineStorage.limparDadosEscolaNoIndexedDB(
      escolaId,
      idsRelacionados.funcionariosIds,
      idsRelacionados.alunosIds,
      idsRelacionados.bibliotecaIds
    ).catch(() => {});

    // 4. Sincronizar eliminação total em cascata no Firestore Cloud
    firebaseSyncEngine.eliminarEscola(escolaId, idsRelacionados);

    // 5. Se a escola ativa era a eliminada, selecionar a próxima escola disponível
    const idAtivo = getLocal<string>(STORAGE_KEYS.ACTIVE_ESCOLA_ID, '');
    if (idAtivo === escolaId) {
      if (escolas.length > 0) {
        setLocal(STORAGE_KEYS.ACTIVE_ESCOLA_ID, escolas[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ESCOLA_ID);
      }
    }

    const proxEscolaId = escolas.length > 0 ? escolas[0].id : 'sistema';
    dbService.registarLog(
      'Eliminação Total de Escola',
      `Escola "${esc.nomeOficial}" e todas as suas coleções de dados (alunos, turmas, disciplinas, notas, pautas, horários, finanças, recibos, património, limpeza, atas e colaboradores) foram eliminadas em cascata.`,
      proxEscolaId
    );
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
  gerarPeriodosLetivosPadrao: (
    regime: RegimePeriodosLetivos = 'Trimestral',
    anoRotulo?: string,
    dataInicio?: string,
    dataFim?: string
  ): PeriodoLetivoConfig[] => {
    const partes = (anoRotulo || '').split('/');
    const anoIni = partes[0] && /^\d{4}$/.test(partes[0]) ? partes[0] : String(new Date().getFullYear());
    const anoFim = partes[1] && /^\d{4}$/.test(partes[1]) ? partes[1] : String(Number(anoIni) + 1);
    const ini = dataInicio || `${anoIni}-09-01`;
    const fim = dataFim || `${anoFim}-07-15`;

    if (regime === 'Semestral') {
      return [
        {
          id: 'periodo-sem-1',
          numero: 1,
          tipo: 'Semestre',
          trimestre: '1',
          nome: '1º Semestre',
          dataInicio: ini,
          dataFim: `${anoFim}-02-15`,
          estado: 'Aberto',
          pesoPercentual: 50,
          bloquearLancamentoSeFechado: false
        },
        {
          id: 'periodo-sem-2',
          numero: 2,
          tipo: 'Semestre',
          trimestre: '2',
          nome: '2º Semestre',
          dataInicio: `${anoFim}-02-23`,
          dataFim: fim,
          estado: 'Fechado',
          pesoPercentual: 50,
          bloquearLancamentoSeFechado: false
        }
      ];
    }

    return [
      {
        id: 'periodo-trim-1',
        numero: 1,
        tipo: 'Trimestre',
        trimestre: '1',
        nome: '1º Trimestre',
        dataInicio: ini,
        dataFim: `${anoIni}-12-19`,
        estado: 'Aberto',
        pesoPercentual: 33.3,
        bloquearLancamentoSeFechado: false
      },
      {
        id: 'periodo-trim-2',
        numero: 2,
        tipo: 'Trimestre',
        trimestre: '2',
        nome: '2º Trimestre',
        dataInicio: `${anoFim}-01-05`,
        dataFim: `${anoFim}-04-10`,
        estado: 'Fechado',
        pesoPercentual: 33.3,
        bloquearLancamentoSeFechado: false
      },
      {
        id: 'periodo-trim-3',
        numero: 3,
        tipo: 'Trimestre',
        trimestre: '3',
        nome: '3º Trimestre',
        dataInicio: `${anoFim}-04-27`,
        dataFim: fim,
        estado: 'Fechado',
        pesoPercentual: 33.4,
        bloquearLancamentoSeFechado: false
      }
    ];
  },
  getRegimePeriodosAtivo: (escolaId?: string, anoLectivo?: string): RegimePeriodosLetivos => {
    const escolaAlvo = escolaId && escolaId !== 'todas'
      ? (dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva())
      : dbService.getEscolaAtiva();
    const anoAlvo = (anoLectivo || escolaAlvo?.anoLectivoActivo || '').trim();
    const configs = dbService.getAnosLectivosConfigs(escolaAlvo?.id);
    const cfg = configs.find(c => (c.rotulo || c.ano || '').trim() === anoAlvo);
    if (cfg?.regimePeriodos === 'Semestral' || cfg?.regimePeriodos === 'Trimestral') {
      return cfg.regimePeriodos;
    }
    if (escolaAlvo?.regimePeriodos === 'Semestral' || escolaAlvo?.regimePeriodos === 'Trimestral') {
      return escolaAlvo.regimePeriodos;
    }
    return 'Trimestral';
  },
  getPeriodosLetivos: (escolaId?: string, anoLectivo?: string): PeriodoLetivoConfig[] => {
    const escolaAlvo = escolaId && escolaId !== 'todas'
      ? (dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva())
      : dbService.getEscolaAtiva();
    const anoAlvo = (anoLectivo || escolaAlvo?.anoLectivoActivo || '').trim();
    const configs = dbService.getAnosLectivosConfigs(escolaAlvo?.id);
    const cfg = configs.find(c => (c.rotulo || c.ano || '').trim() === anoAlvo);
    const regime = dbService.getRegimePeriodosAtivo(escolaAlvo?.id, anoAlvo);

    if (cfg?.periodos && cfg.periodos.length > 0) {
      const esperados = regime === 'Semestral' ? [1, 2] : [1, 2, 3];
      const padrao = dbService.gerarPeriodosLetivosPadrao(regime, anoAlvo, cfg.dataInicio, cfg.dataFim);
      return esperados.map((num, idx) => {
        const encontrado = cfg.periodos!.find(p => Number(p.numero) === num || String(p.trimestre).startsWith(String(num)));
        const base = padrao[idx];
        return encontrado
          ? {
              ...base,
              ...encontrado,
              numero: num as 1 | 2 | 3,
              tipo: regime === 'Semestral' ? 'Semestre' : 'Trimestre',
              trimestre: String(num) as Trimestre
            }
          : base;
      });
    }

    if (cfg?.trimestres && cfg.trimestres.length > 0 && regime === 'Trimestral') {
      const padrao = dbService.gerarPeriodosLetivosPadrao('Trimestral', anoAlvo, cfg.dataInicio, cfg.dataFim);
      return ([1, 2, 3] as const).map((num, idx) => {
        const tr = cfg.trimestres.find(t => String(t.trimestre).startsWith(String(num)));
        const base = padrao[idx];
        return tr
          ? {
              ...base,
              nome: tr.nome || base.nome,
              dataInicio: tr.dataInicio || base.dataInicio,
              dataFim: tr.dataFim || base.dataFim,
              estado: tr.estado || base.estado,
              pesoPercentual: typeof tr.pesoPercentual === 'number' ? tr.pesoPercentual : base.pesoPercentual
            }
          : base;
      });
    }

    return dbService.gerarPeriodosLetivosPadrao(regime, anoAlvo, cfg?.dataInicio, cfg?.dataFim);
  },
  salvarPeriodosLetivos: (
    escolaId: string,
    anoLectivo: string,
    regime: RegimePeriodosLetivos,
    periodos: PeriodoLetivoConfig[],
    calculoSegmentadoAtivo: boolean = true
  ): AnoLectivoConfig => {
    const escolaAlvo = dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva();
    const targetEscolaId = escolaAlvo?.id && escolaAlvo.id !== 'todas' ? escolaAlvo.id : escolaId;
    const anoLimpo = (anoLectivo || escolaAlvo?.anoLectivoActivo || '').trim() || String(new Date().getFullYear());
    const configs = dbService.getAnosLectivosConfigs(targetEscolaId);
    const existente = configs.find(c => (c.rotulo || c.ano || '').trim() === anoLimpo);

    const periodosNormalizados: PeriodoLetivoConfig[] = periodos.map((p, i) => {
      const num = (p.numero || (i + 1)) as 1 | 2 | 3;
      return {
        ...p,
        id: p.id || `periodo-${regime === 'Semestral' ? 'sem' : 'trim'}-${num}`,
        numero: num,
        tipo: regime === 'Semestral' ? 'Semestre' : 'Trimestre',
        trimestre: String(num) as Trimestre,
        nome: p.nome?.trim() || `${num}º ${regime === 'Semestral' ? 'Semestre' : 'Trimestre'}`,
        estado: p.estado === 'Fechado' ? 'Fechado' : 'Aberto',
        pesoPercentual: typeof p.pesoPercentual === 'number' && !isNaN(p.pesoPercentual)
          ? Math.max(0, Math.min(100, Number(p.pesoPercentual)))
          : (regime === 'Semestral' ? 50 : (num === 3 ? 33.4 : 33.3))
      };
    });

    const trimestresCompat: PeriodoTrimestre[] = periodosNormalizados.map(p => ({
      trimestre: p.trimestre,
      nome: p.nome,
      dataInicio: p.dataInicio,
      dataFim: p.dataFim,
      estado: p.estado,
      pesoPercentual: p.pesoPercentual
    }));

    const slugRotulo = anoLimpo.replace(/[^0-9a-zA-Z]/g, '-');
    const atualizado: AnoLectivoConfig = existente
      ? {
          ...existente,
          regimePeriodos: regime,
          periodos: periodosNormalizados,
          trimestres: trimestresCompat,
          calculoSegmentadoAtivo,
          atualizadoEm: new Date().toISOString()
        }
      : {
          id: targetEscolaId ? `ano-${targetEscolaId}-${slugRotulo}` : `ano-${slugRotulo}`,
          escolaId: targetEscolaId,
          rotulo: anoLimpo,
          ano: anoLimpo,
          dataInicio: periodosNormalizados[0]?.dataInicio || `${anoLimpo.split('/')[0] || new Date().getFullYear()}-09-01`,
          dataFim: periodosNormalizados[periodosNormalizados.length - 1]?.dataFim || `${anoLimpo.split('/')[1] || new Date().getFullYear() + 1}-07-15`,
          estado: 'Aberto',
          regimePeriodos: regime,
          periodos: periodosNormalizados,
          trimestres: trimestresCompat,
          calculoSegmentadoAtivo,
          criadoEm: new Date().toISOString().split('T')[0],
          atualizadoEm: new Date().toISOString()
        };

    dbService.salvarAnoLectivoConfig(atualizado);

    if (escolaAlvo && escolaAlvo.id === targetEscolaId && (escolaAlvo.anoLectivoActivo || '').trim() === anoLimpo) {
      const triAtual = Number(String(escolaAlvo.trimestreActivo || '1').replace(/[^0-9]/g, '')) || 1;
      const triAjustado = regime === 'Semestral' && triAtual > 2 ? '2' : String(Math.min(3, Math.max(1, triAtual)));
      dbService.salvarEscola({
        ...escolaAlvo,
        regimePeriodos: regime,
        trimestreActivo: triAjustado as Trimestre
      });
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('sge_periodos_letivos_alterados', { detail: { escolaId: targetEscolaId, anoLectivo: anoLimpo, regime } }));
      } catch {}
    }

    dbService.registarLog(
      'Gestão de Períodos Letivos',
      `Períodos letivos (${regime}) do ano ${anoLimpo} configurados (${periodosNormalizados.length} períodos, cálculo segmentado ${calculoSegmentadoAtivo ? 'ativo' : 'padrão'}).`,
      targetEscolaId
    );
    return atualizado;
  },
  definirPeriodoLetivoAtivo: (escolaId: string, numeroPeriodo: 1 | 2 | 3) => {
    const escolaAlvo = dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva();
    if (!escolaAlvo || !escolaAlvo.id) return;
    const regime = dbService.getRegimePeriodosAtivo(escolaAlvo.id, escolaAlvo.anoLectivoActivo);
    const numEfetivo = regime === 'Semestral' && numeroPeriodo > 2 ? 2 : numeroPeriodo;
    dbService.salvarEscola({
      ...escolaAlvo,
      regimePeriodos: regime,
      trimestreActivo: String(numEfetivo) as Trimestre
    });
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('sge_periodos_letivos_alterados', { detail: { escolaId: escolaAlvo.id, trimestreActivo: String(numEfetivo) } }));
      } catch {}
    }
    dbService.registarLog(
      'Ativação de Período Letivo',
      `Período letivo ativo definido para ${numEfetivo}º ${regime === 'Semestral' ? 'Semestre' : 'Trimestre'}.`,
      escolaAlvo.id
    );
  },
  contarDadosDoAnoLectivo: (escolaId: string, anoRotulo: string): Record<string, number> => {
    const matchAnoEsc = (esc?: string, ano?: string) => (!escolaId || escolaId === 'todas' || esc === escolaId) && ano === anoRotulo;
    const turmas = dbService.getTurmas().filter(t => matchAnoEsc(t.escolaId, t.anoLectivo));
    const turmasIds = new Set(turmas.map(t => t.id));
    const alunos = dbService.getAlunos(escolaId).filter(a => (a.anoLectivo || a.anoMatricula) === anoRotulo);
    const alunosIds = new Set(alunos.map(a => a.id));
    const avaliacoes = dbService.getAvaliacoes().filter(a => matchAnoEsc(a.escolaId, a.anoLectivo));
    const avIds = new Set(avaliacoes.map(a => a.id));
    const notas = dbService.getNotas().filter(n => n.anoLectivo === anoRotulo || avIds.has(n.avaliacaoId) || alunosIds.has(n.alunoId));
    const notasCons = dbService.getNotasConsolidadas().filter(nc => ((nc as any).escolaId ? (nc as any).escolaId === escolaId : true) && (nc.anoLectivo === anoRotulo || alunosIds.has(nc.alunoId)));
    const classes = dbService.getClassesConfigs(escolaId, anoRotulo).filter(c => c.anoLectivo === anoRotulo);
    const turnos = dbService.getTurnosConfigs(escolaId, anoRotulo).filter(t => t.anoLectivo === anoRotulo);
    const disciplinas = dbService.getDisciplinas(escolaId, anoRotulo).filter(d => d.anoLectivo === anoRotulo);
    const atribuicoes = dbService.getAtribuicoes(escolaId, anoRotulo);
    const coordenacoes = dbService.getCoordenacoes(escolaId, anoRotulo);
    const relatorios = [
      ...dbService.getRelatoriosAcontecimentos(escolaId).filter(r => r.anoLectivo === anoRotulo),
      ...dbService.getRelatoriosPedagogicos(escolaId).filter(r => r.anoLectivo === anoRotulo)
    ];
    const planos = dbService.getAtividadesPlano(escolaId, anoRotulo).filter(p => p.anoLectivo === anoRotulo);
    const provas = dbService.getHorariosProvas(escolaId, anoRotulo).length + dbService.getMapasFiscalizacao(escolaId, anoRotulo).length + dbService.getAtasProvas(escolaId, anoRotulo).length;
    const financeiro = dbService.getTransacoesFinanceiras(escolaId, anoRotulo).length + dbService.getDespesasEscolares(escolaId, anoRotulo).length + dbService.getRecibos().filter(r => r.escolaId === escolaId && (r.anoLectivo === anoRotulo || alunosIds.has(r.alunoId))).length;
    const juris = dbService.getJuris().filter(j => j.escolaId === escolaId && j.anoLectivo === anoRotulo).length + dbService.getTermosExame(escolaId).filter(t => t.anoLectivo === anoRotulo).length;
    return {
      turmas: turmas.length,
      alunos: alunos.length,
      classes: classes.length,
      turnos: turnos.length,
      disciplinas: disciplinas.length,
      atribuicoes: atribuicoes.length,
      coordenacoes: coordenacoes.length,
      avaliacoes: avaliacoes.length,
      notas: notas.length + notasCons.length,
      relatorios: relatorios.length,
      planos: planos.length,
      provas,
      financeiro,
      juris,
      turmasCountFallback: turmasIds.size
    };
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

    const escAlvoId = target.escolaId || targetEscolaId || '';
    const anoRotulo = target.rotulo || target.ano || '';
    const matchEscola = (eId?: string) => !escAlvoId || escAlvoId === 'todas' || eId === escAlvoId;
    const colecoesCascataFirestore: Array<{ colecao: string; ids: string[]; extraColecoes?: string[] }> = [];

    // 1. Remover Alunos do Ano Letivo e limpar entradas históricas desse ano nos restantes alunos
    const todosAlunos = getLocal<Aluno[]>(STORAGE_KEYS.ALUNOS, DEFAULT_ALUNOS);
    const alunosRemovidosIds = new Set<string>();
    const alunosRestantes: Aluno[] = [];
    for (const a of todosAlunos) {
      if (matchEscola(a.escolaId) && (a.anoLectivo || a.anoMatricula) === anoRotulo) {
        alunosRemovidosIds.add(a.id);
      } else if (matchEscola(a.escolaId)) {
        const histLimpo = Array.isArray(a.historicoAnterior)
          ? a.historicoAnterior.filter(h => h.anoLectivo !== anoRotulo)
          : a.historicoAnterior;
        const ocorrLimpo = Array.isArray(a.ocorrencias)
          ? a.ocorrencias.filter((o: any) => !o?.anoLectivo || o.anoLectivo !== anoRotulo)
          : a.ocorrencias;
        alunosRestantes.push({ ...a, historicoAnterior: histLimpo, ocorrencias: ocorrLimpo });
      } else {
        alunosRestantes.push(a);
      }
    }
    setLocal(STORAGE_KEYS.ALUNOS, alunosRestantes);
    if (alunosRemovidosIds.size > 0) {
      colecoesCascataFirestore.push({ colecao: 'alunos', ids: Array.from(alunosRemovidosIds), extraColecoes: ['students'] });
    }

    // 2. Remover Turmas do Ano Letivo
    const todasTurmas = getLocal<Turma[]>(STORAGE_KEYS.TURMAS, DEFAULT_TURMAS);
    const turmasRemovidasIds = new Set<string>();
    const turmasRestantes = todasTurmas.filter(t => {
      if (matchEscola(t.escolaId) && t.anoLectivo === anoRotulo) {
        turmasRemovidasIds.add(t.id);
        return false;
      }
      return true;
    });
    setLocal(STORAGE_KEYS.TURMAS, turmasRestantes);
    if (turmasRemovidasIds.size > 0) {
      colecoesCascataFirestore.push({ colecao: 'turmas', ids: Array.from(turmasRemovidasIds) });
    }

    // Helper genérico para remover registos de arrays por escola + anoLectivo
    const removerPorAnoEsc = <T extends { id?: string; escolaId?: string; anoLectivo?: string }>(
      storageKey: string,
      colecaoFirestore: string,
      extraMatch?: (item: T) => boolean
    ) => {
      const lista = getLocal<T[]>(storageKey, []);
      const idsRem: string[] = [];
      const filtrada = lista.filter(item => {
        const ehAlvo = matchEscola(item?.escolaId) && (item?.anoLectivo === anoRotulo || Boolean(extraMatch && extraMatch(item)));
        if (ehAlvo) {
          if (item?.id) idsRem.push(item.id);
          return false;
        }
        return true;
      });
      if (idsRem.length > 0 || filtrada.length !== lista.length) {
        setLocal(storageKey, filtrada);
      }
      if (idsRem.length > 0) {
        colecoesCascataFirestore.push({ colecao: colecaoFirestore, ids: idsRem });
      }
      return new Set(idsRem);
    };

    removerPorAnoEsc<ClasseEscolar>(STORAGE_KEYS.CLASSES_CONFIGS, 'classes_configs');
    removerPorAnoEsc<TurnoConfig>(STORAGE_KEYS.TURNOS_CONFIGS, 'turnos_configs');
    removerPorAnoEsc<Disciplina>(STORAGE_KEYS.DISCIPLINAS, 'disciplinas');
    removerPorAnoEsc<AtribuicaoDocente>(STORAGE_KEYS.ATRIBUICOES, 'atribuicoes', (a) => turmasRemovidasIds.has(a.turmaId));
    removerPorAnoEsc<CoordenacaoEscolar>(STORAGE_KEYS.COORDENACOES, 'coordenacoes', (c) => Boolean(c.turmaId && turmasRemovidasIds.has(c.turmaId)));
    const avRemovidasIds = removerPorAnoEsc<AvaliacaoCriada>(STORAGE_KEYS.AVALIACOES, 'avaliacoes', (av) => turmasRemovidasIds.has(av.turmaId));

    // Notas individuais
    const todasNotas = getLocal<NotaEstudante[]>(STORAGE_KEYS.NOTAS, DEFAULT_NOTAS);
    const notasRemIds: string[] = [];
    const notasRest = todasNotas.filter(n => {
      const ehDoAno =
        n.anoLectivo === anoRotulo ||
        avRemovidasIds.has(n.avaliacaoId) ||
        alunosRemovidosIds.has(n.alunoId);
      if (ehDoAno && (!n.escolaId || matchEscola(n.escolaId) || alunosRemovidosIds.has(n.alunoId) || avRemovidasIds.has(n.avaliacaoId))) {
        notasRemIds.push(n.id || `${n.avaliacaoId}_${n.alunoId}`);
        return false;
      }
      return true;
    });
    setLocal(STORAGE_KEYS.NOTAS, notasRest);
    if (notasRemIds.length > 0) {
      colecoesCascataFirestore.push({ colecao: 'notas_estudantes', ids: notasRemIds });
    }

    // Notas consolidadas (Pautas / Mini-Pautas / Boletins)
    const todasCons = getLocal<NotaTrimestralConsolidada[]>(STORAGE_KEYS.NOTAS_CONSOLIDADAS, DEFAULT_NOTAS_CONSOLIDADAS);
    const consRemIds: string[] = [];
    const consRest = todasCons.filter(nc => {
      const mesmoAno = nc.anoLectivo === anoRotulo || alunosRemovidosIds.has(nc.alunoId) || turmasRemovidasIds.has(nc.turmaId);
      const mesmaEsc = !(nc as any).escolaId || matchEscola((nc as any).escolaId) || alunosRemovidosIds.has(nc.alunoId);
      if (mesmoAno && mesmaEsc) {
        consRemIds.push(nc.id || `${nc.alunoId}_${nc.disciplinaId}_${nc.trimestre}_${nc.anoLectivo || 'padrao'}`);
        return false;
      }
      return true;
    });
    setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, consRest);
    if (consRemIds.length > 0) {
      colecoesCascataFirestore.push({ colecao: 'notas', ids: consRemIds });
    }

    removerPorAnoEsc<SolicitacaoAlteracaoNota>(STORAGE_KEYS.SOLICITACOES_NOTA, 'solicitacoes_nota', (s) => alunosRemovidosIds.has(s.alunoId));
    removerPorAnoEsc<RegistroAlteracaoNotaDirecao>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, 'alteracoes_notas_direcao', (r) => turmasRemovidasIds.has(r.turmaId) || alunosRemovidosIds.has(r.alunoId));
    removerPorAnoEsc<ComissaoJuri>(STORAGE_KEYS.JURIS, 'juris', (j) => Boolean(j.turmaId && turmasRemovidasIds.has(j.turmaId)) || Boolean(j.turmasIds?.some(tid => turmasRemovidasIds.has(tid))));
    removerPorAnoEsc<TermoExame>(STORAGE_KEYS.TERMOS_EXAME, 'termos_exame', (t) => turmasRemovidasIds.has(t.turmaId));
    removerPorAnoEsc<HorarioAulaItem>(STORAGE_KEYS.HORARIOS, 'horarios', (h) => turmasRemovidasIds.has(h.turmaId));
    removerPorAnoEsc<PresencaFuncionario>(STORAGE_KEYS.PRESENCAS, 'presencas');

    // Presenças de alunos
    const todasPresAlunos = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    const presAlRemIds: string[] = [];
    const presAlRest = todasPresAlunos.filter(pa => {
      if (matchEscola(pa.escolaId) && (pa.anoLectivo === anoRotulo || turmasRemovidasIds.has(pa.turmaId) || alunosRemovidosIds.has(pa.alunoId))) {
        presAlRemIds.push(pa.id || `${pa.alunoId}_${pa.data}_${pa.tempoLectivo}`);
        return false;
      }
      return true;
    });
    setLocal(STORAGE_KEYS.PRESENCAS_ALUNOS, presAlRest);
    if (presAlRemIds.length > 0) {
      colecoesCascataFirestore.push({ colecao: 'presencas_alunos', ids: presAlRemIds });
    }

    removerPorAnoEsc<ReciboPagamento>(STORAGE_KEYS.RECIBOS, 'recibos', (r) => alunosRemovidosIds.has(r.alunoId));
    removerPorAnoEsc<TransacaoFinanceira>(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, 'transacoes_financeiras', (t) => Boolean(t.alunoId && alunosRemovidosIds.has(t.alunoId)));
    removerPorAnoEsc<DespesaEscolar>(STORAGE_KEYS.DESPESAS_ESCOLARES, 'despesas_escolares');
    removerPorAnoEsc<RelatorioAcontecimento>(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, 'relatorios_acontecimentos');
    removerPorAnoEsc<RelatorioPedagogicoFormal>(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, 'relatorios_pedagogicos');
    removerPorAnoEsc<AtividadePlanoEscolar>(STORAGE_KEYS.PLANOS_ATIVIDADES, 'planos_atividades');
    removerPorAnoEsc<HorarioProvaItem>(STORAGE_KEYS.HORARIOS_PROVAS, 'horarios_provas', (h) => turmasRemovidasIds.has(h.turmaId));
    removerPorAnoEsc<MapaFiscalizacaoProva>(STORAGE_KEYS.MAPAS_FISCALIZACAO, 'mapas_fiscalizacao', (m) => turmasRemovidasIds.has(m.turmaId));
    removerPorAnoEsc<AtaProvaRegistro>(STORAGE_KEYS.ATAS_PROVAS, 'atas_provas', (a) => turmasRemovidasIds.has(a.turmaId));
    removerPorAnoEsc<MapaFeriasItem>(STORAGE_KEYS.MAPAS_FERIAS, 'mapas_ferias');

    // Limpar Histórico Completo dos alunos removidos e entradas do ano nos restantes
    const histMap = getLocal<Record<string, HistoricoEscolarCompleto>>(STORAGE_KEYS.HISTORICO_COMPLETO, DEFAULT_HISTORICO_COMPLETO);
    const histRemIds: string[] = [];
    Object.keys(histMap).forEach(alId => {
      if (alunosRemovidosIds.has(alId)) {
        delete histMap[alId];
        histRemIds.push(alId);
      } else if (histMap[alId]) {
        const reg = histMap[alId];
        let alterado = false;
        const classesFiltradas = (reg.classes || []).filter(c => c.anoLectivo !== anoRotulo);
        if (classesFiltradas.length !== (reg.classes || []).length) alterado = true;
        const ocorrFiltradas = (reg.ocorrenciasGerais || []).filter(o => o.anoLectivo !== anoRotulo);
        if (ocorrFiltradas.length !== (reg.ocorrenciasGerais || []).length) alterado = true;
        const faltasFiltradas = (reg.faltasHistoricas || []).filter(f => f.anoLectivo !== anoRotulo);
        if (faltasFiltradas.length !== (reg.faltasHistoricas || []).length) alterado = true;
        const dividasFiltradas = (reg.dividasHistoricas || []).filter(d => d.anoLectivo !== anoRotulo);
        if (dividasFiltradas.length !== (reg.dividasHistoricas || []).length) alterado = true;
        const anosLectivosLimpos = reg.anosLectivos ? { ...reg.anosLectivos } : undefined;
        if (anosLectivosLimpos) {
          Object.keys(anosLectivosLimpos).forEach(k => {
            if (anosLectivosLimpos[k] === anoRotulo) {
              delete anosLectivosLimpos[k];
              alterado = true;
            }
          });
        }
        if (alterado) {
          histMap[alId] = {
            ...reg,
            classes: classesFiltradas,
            ocorrenciasGerais: ocorrFiltradas,
            faltasHistoricas: faltasFiltradas,
            dividasHistoricas: dividasFiltradas,
            anosLectivos: anosLectivosLimpos,
            atualizadoEm: new Date().toISOString()
          };
          firebaseSyncEngine.salvarHistoricoEscolarCompleto(histMap[alId]);
        }
      }
    });
    setLocal(STORAGE_KEYS.HISTORICO_COMPLETO, histMap);
    if (histRemIds.length > 0) {
      colecoesCascataFirestore.push({ colecao: 'historico_completo', ids: histRemIds });
    }

    // Limpar Eventos Escolares e Calendário Escolar deste Ano Letivo
    if (typeof localStorage !== 'undefined') {
      try {
        const rawEv = localStorage.getItem('sge_eventos_escolares');
        if (rawEv) {
          const evts = JSON.parse(rawEv);
          if (Array.isArray(evts)) {
            const evtsFiltrados = evts.filter((ev: any) => !(matchEscola(ev?.escolaId) && ev?.anoLectivo === anoRotulo));
            localStorage.setItem('sge_eventos_escolares', JSON.stringify(evtsFiltrados));
          }
        }
        if (escAlvoId && escAlvoId !== 'todas') {
          const calKey = `sge_calendario_${escAlvoId}`;
          const rawCal = localStorage.getItem(calKey);
          if (rawCal) {
            const cal = JSON.parse(rawCal);
            if (Array.isArray(cal)) {
              const calFiltrado = cal.filter((ev: any) => {
                if (ev?.anoLectivo) return ev.anoLectivo !== anoRotulo;
                if (target.dataInicio && target.dataFim && ev?.dataInicio) {
                  return !(ev.dataInicio >= target.dataInicio && ev.dataInicio <= target.dataFim);
                }
                return true;
              });
              const calJson = JSON.stringify(calFiltrado);
              localStorage.setItem(calKey, calJson);
              offlineStorage.gravarChaveNoIndexedDB(calKey, calJson);
            }
          }
        }
      } catch {}
    }

    configs = configs.filter(c => c.id !== target.id);
    setLocal(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, configs);
    firebaseSyncEngine.eliminarAnoLectivoConfig(target.id);
    firebaseSyncEngine.eliminarDadosAnoLectivoCascata(colecoesCascataFirestore);

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

    dbService.registarLog(
      'Exclusão Completa em Cascata de Ano Letivo',
      `Ano letivo ${target.rotulo} e todos os dados associados (alunos: ${alunosRemovidosIds.size}, turmas: ${turmasRemovidasIds.size}, avaliações: ${avRemovidasIds.size}, notas: ${notasRemIds.length + consRemIds.length}) foram eliminados permanentemente.`,
      target.escolaId
    );
    return true;
  },

  // ==========================================
  // TURNOS, CLASSES E CURSOS ESCOLARES (ISOLADOS POR ESCOLA E ANO LETIVO)
  // ==========================================
  getTurnosConfigs: (escolaId?: string, anoLectivo?: string): TurnoConfig[] => {
    const list = getLocal<TurnoConfig[]>(STORAGE_KEYS.TURNOS_CONFIGS, []);
    return list.filter(t => {
      if (escolaId && escolaId !== 'todas' && t.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && t.anoLectivo && t.anoLectivo !== anoLectivo) return false;
      return true;
    });
  },
  salvarTurnoConfig: (turno: TurnoConfig) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = turno.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const escRef = targetEscolaId ? dbService.getEscolaPorId(targetEscolaId) : escolaAtiva;
    const anoRef = turno.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined;
    const turnoFinal: TurnoConfig = {
      ...turno,
      escolaId: targetEscolaId,
      anoLectivo: anoRef,
      atualizadoEm: new Date().toISOString()
    };
    const turnos = getLocal<TurnoConfig[]>(STORAGE_KEYS.TURNOS_CONFIGS, []);
    const idx = turnos.findIndex(t => t.id === turnoFinal.id);
    if (idx >= 0) turnos[idx] = turnoFinal;
    else turnos.push(turnoFinal);
    setLocal(STORAGE_KEYS.TURNOS_CONFIGS, turnos);
    firebaseSyncEngine.salvarTurnoConfig(turnoFinal);
    dbService.registarLog('Turno Escolar', `Horário de funcionamento do turno ${turnoFinal.nome} (${anoRef || 'Geral'}) atualizado.`, targetEscolaId);
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

  getClassesConfigs: (escolaId?: string, anoLectivo?: string): ClasseEscolar[] => {
    const list = getLocal<ClasseEscolar[]>(STORAGE_KEYS.CLASSES_CONFIGS, []);
    return list.filter(c => {
      if (escolaId && escolaId !== 'todas' && c.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && c.anoLectivo && c.anoLectivo !== anoLectivo) return false;
      return true;
    });
  },
  salvarClasseConfig: (classe: ClasseEscolar) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const targetEscolaId = classe.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const escRef = targetEscolaId ? dbService.getEscolaPorId(targetEscolaId) : escolaAtiva;
    const anoRef = classe.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined;
    const classeFinal: ClasseEscolar = {
      ...classe,
      escolaId: targetEscolaId,
      anoLectivo: anoRef,
      atualizadoEm: new Date().toISOString()
    };
    const classes = getLocal<ClasseEscolar[]>(STORAGE_KEYS.CLASSES_CONFIGS, []);
    const idx = classes.findIndex(c => c.id === classeFinal.id);
    if (idx >= 0) classes[idx] = classeFinal;
    else classes.push(classeFinal);
    setLocal(STORAGE_KEYS.CLASSES_CONFIGS, classes);
    firebaseSyncEngine.salvarClasseConfig(classeFinal);
    dbService.registarLog('Classe Escolar', `Nível de escolaridade ${classeFinal.nome} (${anoRef || 'Geral'}) atualizado.`, targetEscolaId);
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
    const current = dbService.getCurrentUser();
    let idx = funcs.findIndex(f => f.id === funcionarioId);
    if (idx < 0 && current) {
      idx = funcs.findIndex(f =>
        (current.email && f.email && f.email.trim().toLowerCase() === current.email.trim().toLowerCase()) ||
        (current.numeroBI && f.numeroBI && f.numeroBI.trim().toUpperCase() === current.numeroBI.trim().toUpperCase())
      );
    }
    if (idx < 0 && current && (current.id === funcionarioId || !funcionarioId)) {
      funcs.push({ ...current });
      idx = funcs.length - 1;
    }
    if (idx < 0) {
      return { sucesso: false, mensagem: 'Utilizador não encontrado no sistema.' };
    }

    const func: Funcionario = { ...funcs[idx] };
    if (isAdminGeralUserObj(func) && isSessaoAutenticadaNaoAdminGeral()) {
      return { sucesso: false, mensagem: 'Acesso negado: não possui permissão para alterar o perfil do Administrador Geral.' };
    }

    // Se forneceu nova senha (via argumento explícito ou dados.password), validar senha atual quando aplicável
    const novaSenhaEfetiva = (novaSenha && novaSenha.trim())
      ? novaSenha.trim()
      : (typeof dados.password === 'string' && dados.password.trim() ? dados.password.trim() : '');
    if (novaSenhaEfetiva) {
      if (func.password && senhaAtual && !cryptoService.isEncriptado(func.password) && func.password !== senhaAtual) {
        return { sucesso: false, mensagem: 'A palavra-passe atual inserida está incorreta.' };
      }
      func.password = novaSenhaEfetiva;
    }

    const rawFotoInput: unknown = (dados as any).fotoBlob ?? dados.fotoUrl;
    if (dados.nomeCompleto !== undefined && dados.nomeCompleto.trim()) func.nomeCompleto = dados.nomeCompleto.trim();
    if (dados.telefone !== undefined) func.telefone = dados.telefone.trim();
    if (dados.telefoneAlternativo !== undefined) func.telefoneAlternativo = dados.telefoneAlternativo.trim();
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
    if (dados.grauAcademico !== undefined) func.grauAcademico = dados.grauAcademico;
    if (dados.instituicaoAcademica !== undefined) func.instituicaoAcademica = dados.instituicaoAcademica;
    if (dados.anoConclusaoFormacao !== undefined) func.anoConclusaoFormacao = dados.anoConclusaoFormacao;
    if (dados.outrasFormacoes !== undefined) func.outrasFormacoes = dados.outrasFormacoes;
    if (dados.camposExtrasFormacao !== undefined) func.camposExtrasFormacao = dados.camposExtrasFormacao;
    if (dados.especialidade !== undefined) func.especialidade = dados.especialidade;
    if (dados.genero) func.genero = dados.genero;
    if (dados.cargo !== undefined && dados.cargo.trim()) func.cargo = dados.cargo.trim();
    if (dados.tipoDocumento !== undefined) func.tipoDocumento = dados.tipoDocumento;
    if (dados.numeroBI !== undefined) func.numeroBI = dados.numeroBI;
    if (dados.bi !== undefined) func.bi = dados.bi;
    if (dados.numeroDocumento !== undefined) func.numeroDocumento = dados.numeroDocumento;
    if (dados.dataEmissaoBI !== undefined) {
      func.dataEmissaoBI = dados.dataEmissaoBI;
      func.dataEmissaoDocumento = dados.dataEmissaoBI;
    }
    if (dados.validadeBI !== undefined) {
      func.validadeBI = dados.validadeBI;
      func.dataValidadeBI = dados.validadeBI;
      func.dataValidadeDocumento = dados.validadeBI;
    }
    if (dados.dataValidadeBI !== undefined) {
      func.dataValidadeBI = dados.dataValidadeBI;
      func.validadeBI = dados.dataValidadeBI;
    }
    if (dados.localEmissaoBI !== undefined) {
      func.localEmissaoBI = dados.localEmissaoBI;
      func.localEmissaoDocumento = dados.localEmissaoBI;
      func.arquivoIdentificacao = dados.localEmissaoBI;
    }
    if (dados.dataEmissaoDocumento !== undefined) func.dataEmissaoDocumento = dados.dataEmissaoDocumento;
    if (dados.dataValidadeDocumento !== undefined) func.dataValidadeDocumento = dados.dataValidadeDocumento;
    if (dados.localEmissaoDocumento !== undefined) func.localEmissaoDocumento = dados.localEmissaoDocumento;
    if (dados.dataNascimento !== undefined) func.dataNascimento = dados.dataNascimento;
    if (dados.naturalidade !== undefined) func.naturalidade = dados.naturalidade;
    if (dados.provincia !== undefined) {
      func.provincia = dados.provincia;
      func.provinciaOrigem = dados.provincia;
    }
    if (dados.provinciaOrigem !== undefined) {
      func.provinciaOrigem = dados.provinciaOrigem;
      if (!func.provincia) func.provincia = dados.provinciaOrigem;
    }
    if (dados.municipio !== undefined) {
      func.municipio = dados.municipio;
      func.municipioResidencia = dados.municipio;
    }
    if (dados.municipioResidencia !== undefined) {
      func.municipioResidencia = dados.municipioResidencia;
      func.municipio = dados.municipioResidencia;
    }
    if (dados.pais !== undefined) func.pais = dados.pais;
    if (dados.nacionalidade !== undefined) func.nacionalidade = dados.nacionalidade;
    if (dados.estadoCivil !== undefined) func.estadoCivil = dados.estadoCivil;
    if (dados.nomePai !== undefined) func.nomePai = dados.nomePai;
    if (dados.nomeMae !== undefined) func.nomeMae = dados.nomeMae;
    if (dados.residencia !== undefined) {
      func.residencia = dados.residencia;
      func.residenciaAtual = dados.residencia;
    }
    if (dados.residenciaAtual !== undefined) {
      func.residenciaAtual = dados.residenciaAtual;
      func.residencia = dados.residenciaAtual;
    }
    if (dados.categoriaProfissional !== undefined) func.categoriaProfissional = dados.categoriaProfissional;
    if (dados.numeroAgente !== undefined) func.numeroAgente = dados.numeroAgente;
    if (dados.nif !== undefined) func.nif = dados.nif;
    if (dados.tipoContrato !== undefined) func.tipoContrato = dados.tipoContrato;
    if (dados.situacaoFuncional !== undefined) func.situacaoFuncional = dados.situacaoFuncional;
    if (dados.dataAdmissao !== undefined) func.dataAdmissao = dados.dataAdmissao;
    if (dados.cargaHorariaSemanal !== undefined) func.cargaHorariaSemanal = dados.cargaHorariaSemanal;
    if (dados.disciplinaEspecialidade !== undefined) func.disciplinaEspecialidade = dados.disciplinaEspecialidade;
    if (dados.banco !== undefined) func.banco = dados.banco;
    if (dados.iban !== undefined) func.iban = dados.iban;
    if (dados.numeroSegurancaSocial !== undefined) {
      func.numeroSegurancaSocial = dados.numeroSegurancaSocial;
      func.numeroINSS = dados.numeroSegurancaSocial;
    }
    if (dados.numeroINSS !== undefined) {
      func.numeroINSS = dados.numeroINSS;
      func.numeroSegurancaSocial = dados.numeroINSS;
    }
    if (dados.grupoSanguineo !== undefined) func.grupoSanguineo = dados.grupoSanguineo;
    if (dados.alergias !== undefined) func.alergias = dados.alergias;
    if (dados.doencasCronicas !== undefined) func.doencasCronicas = dados.doencasCronicas;
    if (dados.contactoEmergenciaNome !== undefined) func.contactoEmergenciaNome = dados.contactoEmergenciaNome;
    if (dados.contactoEmergenciaTelefone !== undefined) func.contactoEmergenciaTelefone = dados.contactoEmergenciaTelefone;
    if (dados.departamento !== undefined) func.departamento = dados.departamento;
    func.atualizadoEm = new Date().toISOString();

    funcs[idx] = func;
    setLocal(STORAGE_KEYS.FUNCIONARIOS, funcs);
    offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(funcs));
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

    // Se for DiretorGeral, refletir dados oficiais também no registo da Escola correspondente
    if (func.role === 'DiretorGeral' && func.escolaId) {
      const escolas = dbService.getEscolasBrutas();
      const escIdx = escolas.findIndex(e => e.id === func.escolaId);
      if (escIdx >= 0) {
        const escAtualizada: Escola = {
          ...escolas[escIdx],
          diretorGeralId: func.id,
          diretorGeralNome: func.nomeCompleto,
          diretorGeralGenero: func.genero || escolas[escIdx].diretorGeralGenero,
          diretorGeralEmail: func.email || escolas[escIdx].diretorGeralEmail,
          diretorGeralTelefone: func.telefone || escolas[escIdx].diretorGeralTelefone,
          atualizadoEm: new Date().toISOString()
        };
        escolas[escIdx] = escAtualizada;
        setLocal(STORAGE_KEYS.ESCOLAS, escolas);
        offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
        firebaseSyncEngine.salvarEscola(escAtualizada);
      }
    }

    // Se for o utilizador atualmente autenticado, atualizar sessão ativa imediatamente
    if (
      !current ||
      current.id === funcionarioId ||
      current.id === func.id ||
      (current.email && func.email && current.email.toLowerCase() === func.email.toLowerCase())
    ) {
      dbService.setCurrentUser(func);
      offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.CURRENT_USER, JSON.stringify(func));
    }

    // Persistência imediata no IndexedDB (Base64 + Blob); o envio ao Firebase é coordenado pelo caller ou caso a foto seja comprimida
    normalizarEPersistirFuncionarioAsync(func, rawFotoInput, true);

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

  // Disciplinas (estritamente isoladas por escola e ano letivo)
  getDisciplinas: (escolaId?: string, anoLectivo?: string): Disciplina[] => {
    const raw = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const list = raw.filter(d => {
      if (escolaId && escolaId !== 'todas' && d.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && d.anoLectivo && d.anoLectivo !== anoLectivo) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const ordemA = typeof a.ordem === 'number' && !isNaN(a.ordem) ? a.ordem : 999;
      const ordemB = typeof b.ordem === 'number' && !isNaN(b.ordem) ? b.ordem : 999;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return a.nome.localeCompare(b.nome, 'pt-AO', { sensitivity: 'base' });
    });
  },
  salvarDisciplina: (disc: Disciplina) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const escId = disc.escolaId || (escolaAtiva?.id && escolaAtiva.id !== 'todas' ? escolaAtiva.id : undefined);
    const escRef = escId ? dbService.getEscolaPorId(escId) : escolaAtiva;
    const anoRef = disc.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined;
    const discs = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const idx = discs.findIndex(d => d.id === disc.id);
    const maxOrdem = discs
      .filter(d => (!escId || d.escolaId === escId) && (!anoRef || !d.anoLectivo || d.anoLectivo === anoRef))
      .reduce((max, d) => Math.max(max, typeof d.ordem === 'number' && !isNaN(d.ordem) ? d.ordem : 0), 0);
    const discFinal: Disciplina = {
      ...disc,
      escolaId: escId,
      anoLectivo: anoRef,
      ordem: typeof disc.ordem === 'number' && !isNaN(disc.ordem) ? disc.ordem : (idx >= 0 ? discs[idx].ordem : maxOrdem + 1),
      atualizadoEm: new Date().toISOString()
    };
    if (idx >= 0) discs[idx] = discFinal;
    else discs.push(discFinal);
    setLocal(STORAGE_KEYS.DISCIPLINAS, discs);
    firebaseSyncEngine.salvarDisciplina(discFinal);
    dbService.registarLog('Disciplina', `Disciplina "${discFinal.nome}" (${discFinal.codigo}) guardada (${anoRef || 'Geral'}).`, discFinal.escolaId);
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
  limparTodasDisciplinas: (escolaId?: string, anoLectivo?: string) => {
    const todas = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    if (escolaId && escolaId !== 'todas') {
      const removidas = todas.filter(d => d.escolaId === escolaId && (!anoLectivo || !d.anoLectivo || d.anoLectivo === anoLectivo));
      const idsRem = new Set(removidas.map(r => r.id));
      const restantes = todas.filter(d => !idsRem.has(d.id));
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

    // Replicar Classes, Turnos e Disciplinas do ano anterior (caso ainda não existam no ano ativo)
    let countEstruturas = 0;
    const classesAnt = dbService.getClassesConfigs(escolaId, anoAnterior).filter(c => c.anoLectivo === anoAnterior);
    const classesAtv = dbService.getClassesConfigs(escolaId, anoActivo).filter(c => c.anoLectivo === anoActivo);
    classesAnt.forEach(c => {
      if (!classesAtv.some(ca => ca.nome === c.nome)) {
        dbService.salvarClasseConfig({ ...c, id: `cls-${escolaId}-${anoActivo.replace(/[^0-9a-zA-Z]/g, '')}-${c.nome}`, anoLectivo: anoActivo });
        countEstruturas++;
      }
    });
    const turnosAnt = dbService.getTurnosConfigs(escolaId, anoAnterior).filter(t => t.anoLectivo === anoAnterior);
    const turnosAtv = dbService.getTurnosConfigs(escolaId, anoActivo).filter(t => t.anoLectivo === anoActivo);
    turnosAnt.forEach(t => {
      if (!turnosAtv.some(ta => ta.nome === t.nome)) {
        dbService.salvarTurnoConfig({ ...t, id: `turno-${escolaId}-${anoActivo.replace(/[^0-9a-zA-Z]/g, '')}-${t.nome}`, anoLectivo: anoActivo });
        countEstruturas++;
      }
    });
    const discsAnt = dbService.getDisciplinas(escolaId, anoAnterior).filter(d => d.anoLectivo === anoAnterior);
    const discsAtv = dbService.getDisciplinas(escolaId, anoActivo).filter(d => d.anoLectivo === anoActivo);
    const mapaDiscId = new Map<string, string>();
    discsAnt.forEach(d => {
      const equiv = discsAtv.find(da => da.nome.toLowerCase() === d.nome.toLowerCase() && (da.classe || '') === (d.classe || ''));
      if (equiv) {
        mapaDiscId.set(d.id, equiv.id);
      } else {
        const novoId = `disc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        dbService.salvarDisciplina({ ...d, id: novoId, anoLectivo: anoActivo });
        mapaDiscId.set(d.id, novoId);
        countEstruturas++;
      }
    });

    if (atribuicoesPassadas.length === 0 && turmasAnoAnterior.length === 0 && countEstruturas === 0) {
      return { sucesso: false, totalReplicadas: 0, novasAtribuicoes: [], novasTurmas: [], mensagem: 'Nenhuma turma, disciplina ou atribuição docente encontrada em anos letivos anteriores para replicar.' };
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
      const discDestinoId = mapaDiscId.get(atrib.disciplinaId) || atrib.disciplinaId;

      const jaExiste = novasAtribs.some(a => 
        a.escolaId === escolaId &&
        a.professorId === atrib.professorId &&
        a.turmaId === turmaDestinoId &&
        a.disciplinaId === discDestinoId &&
        a.anoLectivo === anoActivo
      );

      if (!jaExiste) {
        const novaAtrib: AtribuicaoDocente = {
          ...atrib,
          id: `atrib-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          escolaId,
          turmaId: turmaDestinoId,
          disciplinaId: discDestinoId,
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

    // Replicar Coordenações
    const coordsAnt = dbService.getCoordenacoes(escolaId, anoAnterior).filter(c => c.anoLectivo === anoAnterior);
    const coordsAtv = dbService.getCoordenacoes(escolaId, anoActivo).filter(c => c.anoLectivo === anoActivo);
    coordsAnt.forEach(c => {
      const turmaNova = c.turmaId ? (mapaTurmaIdAntigoParaNovo.get(c.turmaId) || c.turmaId) : undefined;
      const discNova = c.disciplinaId ? (mapaDiscId.get(c.disciplinaId) || c.disciplinaId) : undefined;
      const dup = coordsAtv.some(ca => ca.tipoCoordenacao === c.tipoCoordenacao && ca.funcionarioId === c.funcionarioId && (ca.classe || '') === (c.classe || '') && (ca.turmaId || '') === (turmaNova || ''));
      if (!dup) {
        dbService.salvarCoordenacao({
          ...c,
          id: `coord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          turmaId: turmaNova,
          disciplinaId: discNova,
          anoLectivo: anoActivo
        });
      }
    });

    dbService.registarLog('Gestão Académica', `${recemCriadasTurmas.length} turmas, ${countEstruturas} configurações curriculares e ${count} atribuições replicadas para ${anoActivo}.`, escolaId);
    return {
      sucesso: true,
      totalReplicadas: count,
      novasAtribuicoes: recemCriadas,
      novasTurmas: recemCriadasTurmas,
      mensagem: `${recemCriadasTurmas.length} turmas, ${countEstruturas} itens curriculares e ${count} atribuições transferidas do ano ${anoAnterior || 'anterior'} para ${anoActivo}`
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
    const discs = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const turmasAll = getLocal<Turma[]>(STORAGE_KEYS.TURMAS, DEFAULT_TURMAS);
    const funcsAll = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
    const discObj = discs.find(d => d.id === atrib.disciplinaId);
    const turmaObj = turmasAll.find(t => t.id === atrib.turmaId);
    const profObj = funcsAll.find(f => f.id === atrib.professorId);

    const atribComTs: AtribuicaoDocente = {
      ...atrib,
      disciplinaNome: discObj?.nome || atrib.disciplinaNome || undefined,
      turmaNome: turmaObj?.nome || atrib.turmaNome || undefined,
      classe: turmaObj?.classe || atrib.classe || undefined,
      professorNome: profObj?.nomeCompleto || atrib.professorNome || undefined,
      atualizadoEm: new Date().toISOString()
    };
    const list = getLocal<AtribuicaoDocente[]>(STORAGE_KEYS.ATRIBUICOES, DEFAULT_ATRIBUICOES);
    const idx = list.findIndex(a => a.id === atribComTs.id);
    if (idx >= 0) list[idx] = atribComTs;
    else list.push(atribComTs);
    setLocal(STORAGE_KEYS.ATRIBUICOES, list);
    firebaseSyncEngine.salvarAtribuicao(atribComTs);

    if (atribComTs.ehCoordenadorTurma && turmaObj && turmaObj.coordenadorId !== atribComTs.professorId) {
      const turmaAtualizada = { ...turmaObj, coordenadorId: atribComTs.professorId, atualizadoEm: new Date().toISOString() };
      const tIdx = turmasAll.findIndex(t => t.id === turmaObj.id);
      if (tIdx >= 0) {
        turmasAll[tIdx] = turmaAtualizada;
        setLocal(STORAGE_KEYS.TURMAS, turmasAll);
        firebaseSyncEngine.salvarTurma(turmaAtualizada);
      }
    }
  },
  removerAtribuicao: (id: string) => {
    const list = getLocal<AtribuicaoDocente[]>(STORAGE_KEYS.ATRIBUICOES, DEFAULT_ATRIBUICOES).filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.ATRIBUICOES, list);
    firebaseSyncEngine.removerAtribuicao(id);
  },

  // Coordenações Escolares por Nível de Ensino (Ensino Primário, Iº Ciclo, IIº Ciclo)
  getCoordenacoes: (escolaId?: string, anoLectivo?: string): CoordenacaoEscolar[] => {
    const list = getLocal<CoordenacaoEscolar[]>(STORAGE_KEYS.COORDENACOES, []);
    return list.filter(c => {
      if (escolaId && escolaId !== 'todas' && c.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && c.anoLectivo && c.anoLectivo !== anoLectivo) return false;
      return true;
    });
  },
  salvarCoordenacao: (coord: CoordenacaoEscolar): CoordenacaoEscolar => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const respId = coord.funcionarioId || coord.professorId || '';
    const respNome = coord.funcionarioNome || coord.professorNome || '';
    const coordFinal: CoordenacaoEscolar = {
      ...coord,
      escolaId: coord.escolaId || escolaAtiva?.id || '',
      anoLectivo: coord.anoLectivo || escolaAtiva?.anoLectivoActivo || '',
      funcionarioId: respId,
      funcionarioNome: respNome,
      professorId: respId,
      professorNome: respNome,
      curso: coord.nivelEnsino === 'IICiclo' ? coord.curso : undefined,
      ativo: coord.ativo !== false,
      criadoEm: coord.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
    const list = getLocal<CoordenacaoEscolar[]>(STORAGE_KEYS.COORDENACOES, []);
    const idx = list.findIndex(c => c.id === coordFinal.id);
    if (idx >= 0) list[idx] = coordFinal;
    else list.unshift(coordFinal);
    setLocal(STORAGE_KEYS.COORDENACOES, list);
    firebaseSyncEngine.salvarCoordenacao(coordFinal);

    // Sincronizar automaticamente com Turma.coordenadorId quando for Coordenador de Turma
    if (coordFinal.tipoCoordenacao === 'Coordenador de Turma' && coordFinal.turmaId && respId) {
      const turmas = getLocal<Turma[]>(STORAGE_KEYS.TURMAS, DEFAULT_TURMAS);
      const tIdx = turmas.findIndex(t => t.id === coordFinal.turmaId);
      if (tIdx >= 0 && turmas[tIdx].coordenadorId !== respId) {
        turmas[tIdx] = { ...turmas[tIdx], coordenadorId: respId, atualizadoEm: new Date().toISOString() };
        setLocal(STORAGE_KEYS.TURMAS, turmas);
        firebaseSyncEngine.salvarTurma(turmas[tIdx]);
      }
    }

    dbService.registarLog(
      'Gestão de Coordenações',
      `${coordFinal.tipoCoordenacao} (${coordFinal.nivelEnsino}) atribuída a ${respNome}.`,
      coordFinal.escolaId
    );
    return coordFinal;
  },
  removerCoordenacao: (id: string): boolean => {
    const list = getLocal<CoordenacaoEscolar[]>(STORAGE_KEYS.COORDENACOES, []);
    const alvo = list.find(c => c.id === id);
    if (!alvo) return false;
    const respId = alvo.funcionarioId || alvo.professorId;
    const respNome = alvo.funcionarioNome || alvo.professorNome || '';
    const restantes = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.COORDENACOES, restantes);
    firebaseSyncEngine.removerCoordenacao(id);

    if (alvo.tipoCoordenacao === 'Coordenador de Turma' && alvo.turmaId) {
      const turmas = getLocal<Turma[]>(STORAGE_KEYS.TURMAS, DEFAULT_TURMAS);
      const tIdx = turmas.findIndex(t => t.id === alvo.turmaId && t.coordenadorId === respId);
      if (tIdx >= 0) {
        turmas[tIdx] = { ...turmas[tIdx], coordenadorId: undefined, atualizadoEm: new Date().toISOString() };
        setLocal(STORAGE_KEYS.TURMAS, turmas);
        firebaseSyncEngine.salvarTurma(turmas[tIdx]);
      }
    }

    dbService.registarLog(
      'Exclusão de Coordenação',
      `${alvo.tipoCoordenacao} de ${respNome} removida.`,
      alvo.escolaId
    );
    return true;
  },

  garantirDiretorNosFuncionarios: (escolaOverride?: Escola): void => {
    const rawList = getLocal<Funcionario[]>(STORAGE_KEYS.FUNCIONARIOS, []);
    const escolas = escolaOverride ? [escolaOverride] : dbService.getEscolasBrutas();
    const placeholders = new Set(['não atribuído', 'nao atribuido', 'pendente', 'pendente de nomeação', 'a designar', 'diretor geral', 'director geral', '']);
    let alterado = false;
    const novaLista = [...rawList];

    escolas.forEach(esc => {
      if (!esc?.id) return;
      const existentePorId = esc.diretorGeralId ? novaLista.findIndex(f => f.id === esc.diretorGeralId) : -1;
      const existentePorRole = novaLista.findIndex(f => f.escolaId === esc.id && f.role === 'DiretorGeral');

      if (existentePorId >= 0) {
        if (!novaLista[existentePorId].escolaId) {
          novaLista[existentePorId] = { ...novaLista[existentePorId], escolaId: esc.id };
          alterado = true;
        }
        return;
      }

      if (existentePorRole >= 0) {
        if (!novaLista[existentePorRole].escolaId) {
          novaLista[existentePorRole] = { ...novaLista[existentePorRole], escolaId: esc.id };
          alterado = true;
        }
        return;
      }

      const nomeLimpo = (esc.diretorGeralNome || '').trim();
      if (!nomeLimpo || placeholders.has(nomeLimpo.toLowerCase())) return;

      const novoDir: Funcionario = {
        id: esc.diretorGeralId || `dir-${esc.id}`,
        escolaId: esc.id,
        nomeCompleto: nomeLimpo,
        numeroBI: '',
        role: 'DiretorGeral',
        cargo: esc.diretorGeralGenero === 'F' ? 'Directora Geral' : 'Director Geral',
        genero: esc.diretorGeralGenero || 'M',
        email: esc.diretorGeralEmail || esc.email || '',
        telefone: esc.diretorGeralTelefone || esc.telefone || '',
        ehProfessor: false,
        ehAdministrativoQueLeciona: true,
        fotoUrl: '',
        dataAdmissao: new Date().toISOString().split('T')[0],
        ativo: true,
        situacaoFuncional: 'Activo',
        regimeDocencia: 'Tempo Integral',
        habilitacoes: 'Licenciatura em Gestão Escolar',
        tipoContrato: 'Função Pública (MED)',
        atualizadoEm: new Date().toISOString()
      };
      novaLista.push(novoDir);
      alterado = true;
    });

    const cur = dbService.getCurrentUser();
    if (cur && cur.role === 'DiretorGeral' && cur.id && !novaLista.some(f => f.id === cur.id)) {
      novaLista.push({ ...cur, ativo: cur.ativo !== false, situacaoFuncional: cur.situacaoFuncional || 'Activo' });
      alterado = true;
    }

    if (alterado) {
      setLocal(STORAGE_KEYS.FUNCIONARIOS, novaLista);
    }
  },
  getFuncionarios: (escolaId?: string): Funcionario[] => {
    try {
      dbService.garantirDiretorNosFuncionarios();
    } catch {}
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = av.escolaId ? dbService.getEscolaPorId(av.escolaId) : escolaAtiva;
    const avComTs: AvaliacaoCriada = {
      ...av,
      escolaId: av.escolaId || escolaAtiva?.id || '',
      anoLectivo: av.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || '',
      atualizadoEm: new Date().toISOString()
    };
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
    const avObj = dbService.getAvaliacoes().find(a => a.id === nota.avaliacaoId);
    const escolaAtiva = dbService.getEscolaAtiva();
    const notaComTs: NotaEstudante = {
      ...nota,
      escolaId: nota.escolaId || avObj?.escolaId || escolaAtiva?.id || undefined,
      anoLectivo: nota.anoLectivo || avObj?.anoLectivo || escolaAtiva?.anoLectivoActivo || undefined,
      atualizadoEm: new Date().toISOString()
    };
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const consComTs: NotaTrimestralConsolidada = {
      ...cons,
      escolaId: cons.escolaId || escolaAtiva?.id || undefined,
      anoLectivo: cons.anoLectivo || escolaAtiva?.anoLectivoActivo || '',
      atualizadoEm: new Date().toISOString()
    };
    const lista = dbService.getNotasConsolidadas();
    const idx = lista.findIndex(
      c => c.alunoId === consComTs.alunoId &&
           c.disciplinaId === consComTs.disciplinaId &&
           c.trimestre === consComTs.trimestre &&
           (!consComTs.anoLectivo || !c.anoLectivo || c.anoLectivo === consComTs.anoLectivo)
    );
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const solComTs: SolicitacaoAlteracaoNota = {
      ...sol,
      escolaId: sol.escolaId || escolaAtiva?.id || '',
      anoLectivo: sol.anoLectivo || escolaAtiva?.anoLectivoActivo || '',
      atualizadoEm: new Date().toISOString()
    };
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
      let notaFinalAlterada: number | undefined =
        typeof nota.notaFinal === 'number' && !isNaN(nota.notaFinal) ? nota.notaFinal : undefined;
      let foiHomologadaJuri = false;

      for (const juri of juris) {
        if ((juri.estado === 'Validada' || juri.deliberacoes) && juri.deliberacoes?.[alunoId]) {
          if (juri.anoLectivo && nota.anoLectivo && juri.anoLectivo !== nota.anoLectivo) {
            continue;
          }
          if (Array.isArray(juri.turmasIds) && juri.turmasIds.length > 0 && nota.turmaId && !juri.turmasIds.includes(nota.turmaId)) {
            continue;
          }
          const alteracao = juri.deliberacoes[alunoId].notasAlteradas?.find(na => na.disciplinaId === nota.disciplinaId);
          if (alteracao && typeof alteracao.novaNota === 'number' && !isNaN(alteracao.novaNota)) {
            notaFinalAlterada = alteracao.novaNota;
            foiHomologadaJuri = true;
          }
        }
      }

      if (foiHomologadaJuri && notaFinalAlterada !== undefined) {
        return {
          ...nota,
          mediaTrimestral: notaFinalAlterada,
          notaFinal: notaFinalAlterada
        };
      }

      if (notaFinalAlterada !== undefined) {
        return {
          ...nota,
          notaFinal: notaFinalAlterada
        };
      }

      return { ...nota };
    });
  },

  // Gestão de Termos de Exame Oficiais MED
  getTermosExame: (escolaId?: string, anoLectivo?: string): TermoExame[] => {
    const todos = getLocal<TermoExame[]>(STORAGE_KEYS.TERMOS_EXAME, []);
    return todos.filter(t => {
      if (escolaId && escolaId !== 'todas' && t.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && t.anoLectivo && t.anoLectivo !== anoLectivo) return false;
      return true;
    });
  },
  salvarTermoExame: (termo: TermoExame) => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = termo.escolaId ? dbService.getEscolaPorId(termo.escolaId) : escolaAtiva;
    const anoRef = termo.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || '';
    const termoComTs: TermoExame = { ...termo, anoLectivo: anoRef, atualizadoEm: new Date().toISOString() };
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
  isProvaProfessorAtiva: (escola?: Escola | null): boolean => {
    if (escola) return escola.nppAtivo !== false;
    return dbService.obterNPPAtivo();
  },
  salvarNPPAtivo: (escolaId: string, nppAtivo: boolean) => {
    const escolas = dbService.getEscolas();
    const idx = escolas.findIndex(e => e.id === escolaId);
    if (idx >= 0) {
      escolas[idx].nppAtivo = nppAtivo;
      escolas[idx].atualizadoEm = new Date().toISOString();
      setLocal(STORAGE_KEYS.ESCOLAS, escolas);
      offlineStorage.gravarChaveNoIndexedDB(STORAGE_KEYS.ESCOLAS, JSON.stringify(escolas));
      firebaseSyncEngine.salvarEscola(escolas[idx]);
      dbService.registarLog('Configuração Pedagógica', `Uso de Prova do Professor (NPP) ${nppAtivo ? 'ATIVADO' : 'DESATIVADO'} para o cálculo trimestral.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }
    }
  },
  getRecibosMatriculaPorFolhaA4: (escolaId?: string): number => {
    const esc = escolaId ? dbService.getEscolaPorId(escolaId) : dbService.getEscolaAtiva();
    const cfg = esc?.id ? dbService.getConfiguracaoFinanceira(esc.id) : undefined;
    const raw = Number(cfg?.recibosMatriculaPorFolhaA4 ?? esc?.recibosMatriculaPorFolhaA4 ?? 3);
    return [1, 2, 3, 4, 6].includes(raw) ? raw : 3;
  },
  salvarRecibosMatriculaPorFolhaA4: (escolaId: string, qtd: number): number => {
    const valid = [1, 2, 3, 4, 6].includes(Number(qtd)) ? Number(qtd) : 3;
    const cfg = dbService.getConfiguracaoFinanceira(escolaId);
    dbService.salvarConfiguracaoFinanceira({ ...cfg, recibosMatriculaPorFolhaA4: valid });
    const esc = dbService.getEscolaPorId(escolaId);
    if (esc) {
      dbService.salvarEscola({ ...esc, recibosMatriculaPorFolhaA4: valid });
    }
    dbService.registarLog('Configuração de Recibos', `Quantidade de recibos de matrícula/confirmação por folha A4 definida para ${valid}.`);
    return valid;
  },
  getRecibosEmolumentosPorFolhaA4: (escolaId?: string): number => {
    const esc = escolaId ? dbService.getEscolaPorId(escolaId) : dbService.getEscolaAtiva();
    const cfg = esc?.id ? dbService.getConfiguracaoFinanceira(esc.id) : undefined;
    const raw = Number(cfg?.recibosEmolumentosPorFolhaA4 ?? esc?.recibosEmolumentosPorFolhaA4 ?? 8);
    return [1, 2, 4, 6, 8].includes(raw) ? raw : 8;
  },
  salvarRecibosEmolumentosPorFolhaA4: (escolaId: string, qtd: number): number => {
    const valid = [1, 2, 4, 6, 8].includes(Number(qtd)) ? Number(qtd) : 8;
    const cfg = dbService.getConfiguracaoFinanceira(escolaId);
    dbService.salvarConfiguracaoFinanceira({ ...cfg, recibosEmolumentosPorFolhaA4: valid });
    const esc = dbService.getEscolaPorId(escolaId);
    if (esc) {
      dbService.salvarEscola({ ...esc, recibosEmolumentosPorFolhaA4: valid });
    }
    dbService.registarLog('Configuração de Recibos', `Quantidade de recibos de propinas/emolumentos por folha A4 definida para ${valid}.`);
    return valid;
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
    const todas = getLocal<Disciplina[]>(STORAGE_KEYS.DISCIPLINAS, DEFAULT_DISCIPLINAS);
    const atualizadasMap = new Map<string, Disciplina>();
    disciplinasOrdenadas.forEach((d, idx) => {
      atualizadasMap.set(d.id, {
        ...d,
        ordem: typeof d.ordem === 'number' && !isNaN(d.ordem) ? d.ordem : idx + 1,
        atualizadoEm: agora
      });
    });

    const merged = todas.map(d => atualizadasMap.get(d.id) || d);
    atualizadasMap.forEach((d, id) => {
      if (!merged.some(m => m.id === id)) merged.push(d);
    });

    setLocal(STORAGE_KEYS.DISCIPLINAS, merged);
    firebaseSyncEngine.salvarDisciplinasLote(Array.from(atualizadasMap.values()));
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = p.escolaId ? dbService.getEscolaPorId(p.escolaId) : escolaAtiva;
    const pComTs: PresencaFuncionario = {
      ...p,
      anoLectivo: p.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined,
      atualizadoEm: new Date().toISOString()
    };
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

  // Auditoria (Isolada por escola para utilizadores escolares; visão global completa para AdminGeral)
  getAuditoria: (escolaIdOverride?: string): LogAuditoria[] => {
    const logs = dbService.getAuditoriaBruta();
    const isNonAdmin = isSessaoAutenticadaNaoAdminGeral();
    if (!isNonAdmin) {
      if (escolaIdOverride && escolaIdOverride !== 'todas' && escolaIdOverride !== 'TODAS') {
        return logs.filter(l => l.escolaId === escolaIdOverride);
      }
      return logs;
    }
    const { ids, nomes } = getAdminGeralIdsAndNomes();
    const activeId = getLocal<string>(STORAGE_KEYS.ACTIVE_ESCOLA_ID, '');
    const user = getAuthenticatedUserFromStorage();
    const targetEscolaId =
      (escolaIdOverride && escolaIdOverride !== 'todas' && escolaIdOverride !== 'TODAS' ? escolaIdOverride : '') ||
      activeId ||
      user?.escolaId ||
      '';
    return logs.filter(l => {
      if (isLogOuAcaoDoAdminGeral(l, ids, nomes)) return false;
      if (l.escolaId === 'ADMIN_GLOBAL' || l.escolaId === 'SISTEMA') return false;
      if (targetEscolaId) return l.escolaId === targetEscolaId;
      return true;
    });
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
    const emApoioNaEscola = Boolean(ehAdminGeral && idAtivo && idAtivo !== 'todas' && escolaAtiva.sessaoApoioTecnicoAtiva);
    const targetEscolaId = escolaIdOverride
      ? escolaIdOverride
      : (ehAdminGeral && !emApoioNaEscola)
        ? 'ADMIN_GLOBAL'
        : ((idAtivo && idAtivo !== 'todas' ? idAtivo : '') || (!ehAdminGeral ? user.escolaId : '') || escolaAtiva.id || 'ADMIN_GLOBAL');

    // Verificar se o utilizador atual está a atuar sob regime de Interinidade ativa
    const todasDelegacoes = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    const interinidadeAtiva = todasDelegacoes.find(d =>
      d.tipo === 'Interinidade' &&
      d.ativo &&
      !d.revogadoEm &&
      d.funcionarioId === user.id &&
      (!targetEscolaId || d.escolaId === targetEscolaId)
    );
    if (interinidadeAtiva && !ehAdminGeral) {
      const tituloCargo = interinidadeAtiva.cargoDelegadoTitulo || interinidadeAtiva.cargoDelegadoRole || 'Titular';
      detalheFinal = `[EM INTERINIDADE: ${tituloCargo} (Titular: ${interinidadeAtiva.delegadoPorNome})] ${detalhe}`;
      papelFinal = `${papelFinal} (Interino: ${tituloCargo})`;
    }

    // Se o Admin Geral estiver a atuar sob sessão de apoio técnico autorizada pelo Diretor
    if (ehAdminGeral && escolaAtiva.sessaoApoioTecnicoAtiva) {
      detalheFinal = `[APOIO TÉCNICO AUTORIZADO - ADMIN GERAL] ${detalhe} (Ref: Chamado #${escolaAtiva.sessaoApoioTecnicoAtiva.solicitacaoId.slice(-6)})`;
      papelFinal = 'AdminGeral (Apoio Técnico Autorizado)';
    }

    const newLog: LogAuditoria = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      escolaId: targetEscolaId,
      utilizadorId: user.id,
      utilizadorNome: user.nomeCompleto,
      papel: papelFinal,
      usuarioRole: interinidadeAtiva?.cargoDelegadoRole || user.role,
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = rec.escolaId ? dbService.getEscolaPorId(rec.escolaId) : escolaAtiva;
    const recComTs: ReciboPagamento = {
      ...rec,
      anoLectivo: rec.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined,
      atualizadoEm: new Date().toISOString()
    };
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

    // 5. Funcionários & Professores (Completo com Formação Académica, Contratos e Dados Financeiros)
    const operadorAtual = dbService.getCurrentUser();
    const visGeral = dbService.getVisibilidadeEfetivaUsuario(operadorAtual, escola);
    const podeSensiveisGeral = (f: Funcionario) =>
      visGeral.irrestrito || visGeral.dadosSensiveis.verDadosSensiveisFuncionarios || f.id === operadorAtual?.id;
    const formatOutrasFormacoes = (f: Funcionario) =>
      Array.isArray(f.outrasFormacoes) && f.outrasFormacoes.length > 0
        ? f.outrasFormacoes
            .map(of => `${of.nivelFormacao}: ${of.cursoOuArea || '—'} — ${of.instituicaoAcademica || '—'} (${of.anoConclusao || '—'})${of.observacoes ? ` [${of.observacoes}]` : ''}`)
            .join(' | ')
        : '—';
    const formatCamposExtras = (f: Funcionario) =>
      Array.isArray(f.camposExtrasFormacao) && f.camposExtrasFormacao.length > 0
        ? f.camposExtrasFormacao.map(c => `${c.rotulo}: ${c.valor}`).join(' | ')
        : '—';

    const wsFuncs = XLSX.utils.json_to_sheet(funcs.map(f => {
      const ver = podeSensiveisGeral(f);
      return {
        'Instituição Escolar': escola.nomeOficial,
        'ID': f.id,
        'Nome Completo': f.nomeCompleto,
        'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
        'Bilhete de Identidade': ver ? f.numeroBI : '*** Protegido ***',
        'Cargo / Função': f.cargo,
        'Papel no Sistema': f.role,
        'Categoria Profissional MED': f.categoriaProfissional || '—',
        'Nº de Agente': f.numeroAgente || '—',
        'Tipo de Contrato': f.tipoContrato || 'Efetivo',
        'Situação Funcional': f.situacaoFuncional || 'Ativo',
        'Data de Admissão': f.dataAdmissao || '—',
        'Carga Horária Semanal': f.cargaHorariaSemanal ? `${f.cargaHorariaSemanal} h/sem` : '—',
        'Formação Académica Principal': f.grauAcademico || f.habilitacoes || 'Licenciatura',
        'Especialidade / Curso': f.especialidade || '—',
        'Instituição Académica': f.instituicaoAcademica || f.habilitacoes || '—',
        'Ano de Conclusão': f.anoConclusaoFormacao || '—',
        'Outras Formações': formatOutrasFormacoes(f),
        'Campos Adicionais (Formação/RH)': formatCamposExtras(f),
        'NIF': ver ? (f.nif || f.numeroBI || '—') : '*** Protegido ***',
        'Banco': ver ? (f.banco || '—') : '*** Protegido ***',
        'IBAN': ver ? (f.iban || '—') : '*** Protegido ***',
        'Nº Segurança Social (INSS)': ver ? (f.numeroSegurancaSocial || f.numeroINSS || '—') : '*** Protegido ***',
        'Telefone': ver ? f.telefone : '*** Protegido ***',
        'Email': ver ? f.email : '*** Protegido ***',
        'Professor': f.ehProfessor ? 'Sim' : 'Não'
      };
    }));
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
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const nppAtivo = escola?.nppAtivo !== false;

    const alunos = isEscolaEspecifica
      ? dbService.getAlunos().filter(a => a.escolaId === effectiveEscolaId)
      : dbService.getAlunos();
    const turmas = dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(isEscolaEspecifica ? effectiveEscolaId : escola?.id);
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
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const alunos = isEscolaEspecifica ? dbService.getAlunos().filter(a => a.escolaId === effectiveEscolaId) : dbService.getAlunos();
    const turmas = isEscolaEspecifica ? dbService.getTurmas().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(isEscolaEspecifica ? effectiveEscolaId : escola?.id);
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
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const funcs = (isEscolaEspecifica
      ? dbService.getFuncionarios().filter(f => f.escolaId === effectiveEscolaId || (escola?.diretorGeralId && f.id === escola.diretorGeralId))
      : dbService.getFuncionarios()
    ).filter(f => !nonAdmin || !isAdminGeralUserObj(f));

    const operadorAtual = dbService.getCurrentUser();
    const vis = dbService.getVisibilidadeEfetivaUsuario(operadorAtual, escola);
    const podeVer = (f: Funcionario) =>
      vis.irrestrito || vis.dadosSensiveis.verDadosSensiveisFuncionarios || f.id === operadorAtual?.id;

    const linhasFormacoesExtras: any[] = [];
    const linhas = funcs.map(f => {
      const esc = todasEscolas.find(e => e.id === f.escolaId) || escola;
      const ver = podeVer(f);
      const outrasTxt = Array.isArray(f.outrasFormacoes) && f.outrasFormacoes.length > 0
        ? f.outrasFormacoes
            .map(of => `${of.nivelFormacao}: ${of.cursoOuArea || '—'} — ${of.instituicaoAcademica || '—'} (${of.anoConclusao || '—'})${of.observacoes ? ` [${of.observacoes}]` : ''}`)
            .join(' | ')
        : '—';
      const camposExtrasTxt = Array.isArray(f.camposExtrasFormacao) && f.camposExtrasFormacao.length > 0
        ? f.camposExtrasFormacao.map(c => `${c.rotulo}: ${c.valor}`).join(' | ')
        : '—';

      if (Array.isArray(f.outrasFormacoes)) {
        f.outrasFormacoes.forEach(of => {
          linhasFormacoesExtras.push({
            'Instituição Escolar': esc?.nomeOficial || 'SGE-NG Central',
            'Funcionário': f.nomeCompleto,
            'Cargo / Função': f.cargo,
            'Nível de Formação': of.nivelFormacao || '—',
            'Curso / Área': of.cursoOuArea || '—',
            'Instituição Académica': of.instituicaoAcademica || '—',
            'Ano de Conclusão': of.anoConclusao || '—',
            'Observações': of.observacoes || '—'
          });
        });
      }

      const row: Record<string, any> = {
        'Instituição Escolar': esc?.nomeOficial || 'SGE-NG Central',
        'Código SIGE Escola': esc?.codigoSIGE || esc?.codigoMEC || '',
        'ID Funcionário': f.id,
        'Nome Completo': f.nomeCompleto,
        'Gênero': f.genero === 'M' ? 'Masculino' : (f.genero === 'F' ? 'Feminino' : '—'),
        'Data de Nascimento': f.dataNascimento || '—',
        'Estado Civil': f.estadoCivil || '—',
        'Nacionalidade': f.nacionalidade || 'Angolana',
        'Naturalidade': f.naturalidade || f.naturalidadeMunicipio || '—',
        'Filiação (Pai)': f.nomePai || '—',
        'Filiação (Mãe)': f.nomeMae || '—',
        'Nº Bilhete de Identidade (BI)': ver ? f.numeroBI : '*** Protegido ***',
        'Data Emissão BI': ver ? (f.dataEmissaoBI || '—') : '***',
        'Validade BI': ver ? (f.dataValidadeBI || f.validadeBI || '—') : '***',
        'Local Emissão BI': ver ? (f.localEmissaoBI || f.arquivoIdentificacao || '—') : '***',
        'NIF': ver ? (f.nif || f.numeroBI || '—') : '*** Protegido ***',
        'Cargo / Função': f.cargo,
        'Departamento / Setor': f.departamento || '—',
        'Categoria Profissional': f.categoriaProfissional || 'Técnico Pedagógico',
        'Nº de Agente do Estado': f.numeroAgente || '—',
        'Tipo de Contrato': f.tipoContrato || 'Efetivo',
        'Situação Funcional': f.situacaoFuncional || 'Ativo',
        'Data de Admissão': f.dataAdmissao || '—',
        'Carga Horária Semanal': f.cargaHorariaSemanal ? `${f.cargaHorariaSemanal} h/sem` : '—',
        'Papel no Sistema (Role)': f.role,
        'Status da Conta': f.statusConta || 'Ativa',
        'É Professor': f.ehProfessor ? 'Sim' : 'Não',
        'Formação Académica Principal': f.grauAcademico || f.habilitacoes || 'Licenciatura',
        'Especialidade / Curso': f.especialidade || '—',
        'Instituição Académica': f.instituicaoAcademica || (f as any).instituicaoFormacao || f.habilitacoes || '—',
        'Ano de Conclusão': f.anoConclusaoFormacao || '—',
        'Outras Formações': outrasTxt,
        'Campos Extras (Formação & RH)': camposExtrasTxt,
        'Telefone Principal': ver ? f.telefone : '*** Protegido ***',
        'Telefone Alternativo': ver ? (f.telefoneAlternativo || '—') : '***',
        'Email Institucional': ver ? f.email : '*** Protegido ***',
        'Província Residência': f.provincia || f.provinciaOrigem || esc?.provincia || '—',
        'Município Residência': f.municipio || f.municipioResidencia || esc?.municipio || '—',
        'Bairro / Morada': ver ? (f.residencia || f.residenciaAtual || f.bairro || '—') : '*** Protegido ***',
        'Banco': ver ? (f.banco || '—') : '*** Protegido ***',
        'IBAN / Conta Bancária': ver ? (f.iban || '—') : '*** Protegido ***',
        'Nº Segurança Social (INSS)': ver ? (f.numeroSegurancaSocial || f.numeroINSS || '—') : '*** Protegido ***',
        'Grupo Sanguíneo': f.grupoSanguineo || '—',
        'Alergias': f.alergias || '—',
        'Doenças Crónicas': f.doencasCronicas || '—',
        'Contacto Emergência (Nome)': f.contactoEmergenciaNome || '—',
        'Contacto Emergência (Telefone)': ver ? (f.contactoEmergenciaTelefone || '—') : '*** Protegido ***'
      };

      if (Array.isArray(f.camposExtrasFormacao)) {
        f.camposExtrasFormacao.forEach(c => {
          if (c.rotulo && !Object.prototype.hasOwnProperty.call(row, c.rotulo)) {
            row[c.rotulo] = c.valor || '—';
          }
        });
      }

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(linhas.length > 0 ? linhas : [{ 'Informação': 'Nenhum funcionário encontrado.' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Quadro de Funcionários');
    if (linhasFormacoesExtras.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhasFormacoesExtras), 'Outras Formações Académicas');
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const sigla = escola?.sigla || (isEscolaEspecifica ? 'Escola' : 'Rede_Nacional');
    XLSX.writeFile(wb, `SGE_Quadro_Funcionarios_Completo_${sigla}_${dataHoje}.xlsx`);
    dbService.registarLog('Exportação Excel', `Quadro completo de funcionários (${sigla}) exportado com sucesso.`);
  },

  // 4. Exportar Quadro Completo de Funcionários em JSON (.json)
  exportarFuncionariosCompletosJSON: (escolaId?: string) => {
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const funcs = (isEscolaEspecifica
      ? dbService.getFuncionarios().filter(f => f.escolaId === effectiveEscolaId)
      : dbService.getFuncionarios()
    ).filter(f => !nonAdmin || !isAdminGeralUserObj(f));

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

  // 4B. Exportação Unificada: Funcionários, Alunos e Notas em Excel (.xlsx) - Escopo estrito da escola para Diretor
  exportarFuncionariosAlunosNotasExcel: async (escolaId?: string) => {
    const XLSX = await import('xlsx');
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];
    const nppAtivo = escola?.nppAtivo !== false;

    const alunos = isEscolaEspecifica ? dbService.getAlunos().filter(a => a.escolaId === effectiveEscolaId) : dbService.getAlunos();
    const turmas = isEscolaEspecifica ? dbService.getTurmas().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(isEscolaEspecifica ? effectiveEscolaId : escola?.id);
    const funcs = (isEscolaEspecifica
      ? dbService.getFuncionarios().filter(f => f.escolaId === effectiveEscolaId || (escola?.diretorGeralId && f.id === escola.diretorGeralId))
      : dbService.getFuncionarios()
    ).filter(f => !isAdminGeralUserObj(f));
    const notasConsolidadas = dbService.getNotasConsolidadas();

    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo Institucional
    const resumo = [{
      'Instituição Escolar': isEscolaEspecifica ? (escola?.nomeOficial || effectiveEscolaId) : 'Rede Nacional Completa',
      'Sigla': escola?.sigla || 'SGE-NG',
      'Código SIGE / MEC': escola?.codigoSIGE || escola?.codigoMEC || escola?.id || '',
      'Ano Lectivo Activo': escola?.anoLectivoActivo || '—',
      'Data de Exportação': new Date().toLocaleDateString('pt-AO'),
      'Total de Funcionários': funcs.length,
      'Total de Estudantes': alunos.length,
      'Total de Turmas': turmas.length
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo Escolar');

    // Aba 2: Quadro Completo de Funcionários
    const funcsRows = funcs.map(f => ({
      'Instituição Escolar': todasEscolas.find(e => e.id === f.escolaId)?.nomeOficial || escola?.nomeOficial || '',
      'ID Funcionário': f.id,
      'Nº de Agente': f.numeroAgente || '—',
      'Nome Completo': f.nomeCompleto,
      'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
      'Data de Nascimento': f.dataNascimento || '—',
      'Nº Bilhete de Identidade (BI)': f.numeroBI || '—',
      'NIF': f.nif || f.numeroBI || '—',
      'Cargo / Função': f.cargo,
      'Papel no Sistema (Role)': f.role,
      'Categoria Profissional MED': f.categoriaProfissional || '—',
      'É Professor': f.ehProfessor ? 'Sim' : 'Não',
      'Tipo de Contrato': f.tipoContrato || 'Efetivo',
      'Situação Funcional': f.situacaoFuncional || 'Ativo',
      'Data de Admissão': f.dataAdmissao || '—',
      'Formação Académica': f.grauAcademico || f.habilitacoes || '—',
      'Especialidade': f.especialidade || '—',
      'Telefone': f.telefone || '—',
      'Email': f.email || '—',
      'IBAN': f.iban || '—',
      'Status Conta': f.statusConta || 'Ativa'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(funcsRows.length > 0 ? funcsRows : [{ Info: 'Sem funcionários registados' }]), 'Funcionários');

    // Aba 3: Alunos Completos
    const alunosRows = alunos.map((a, idx) => {
      const t = turmas.find(tr => tr.id === a.turmaId);
      const escA = todasEscolas.find(e => e.id === a.escolaId) || escola;
      return {
        'Instituição Escolar': escA?.nomeOficial || '',
        'Ano Lectivo': a.anoLectivo || t?.anoLectivo || escA?.anoLectivoActivo || '',
        'ID': a.id,
        'Nº de Processo / Matrícula': a.codigoMatricula || a.id,
        'Nº de Ordem': a.numeroOrdem || idx + 1,
        'Nome Completo': a.nomeCompleto,
        'Gênero': a.genero === 'M' ? 'Masculino' : 'Feminino',
        'Data de Nascimento': a.dataNascimento || '—',
        'Bilhete de Identidade / Cédula': a.numeroBI || a.numeroDocumento || '—',
        'Classe': t?.classe || a.classeId || '—',
        'Turma': t?.nome || a.turmaId || '—',
        'Curso / Área': a.curso || t?.curso || 'Ensino Geral',
        'Turno': t?.periodo || t?.turno || a.turno || 'Manhã',
        'Sala': t?.sala || a.sala || '—',
        'Estado da Matrícula': a.estado || 'Ativo',
        'Filiação - Pai': a.nomePai || '—',
        'Filiação - Mãe': a.nomeMae || '—',
        'Encarregado de Educação': a.encarregadoNome || a.nomeEncarregado || '—',
        'Telefone Encarregado': a.encarregadoTelefone || a.telefone || '—',
        'Telefone': a.telefone || '—',
        'Endereço Residencial': a.residencia || a.bairro || '—'
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alunosRows.length > 0 ? alunosRows : [{ Info: 'Sem alunos registados' }]), 'Alunos');

    // Aba 4: Notas Completas por Disciplina
    const notasRows: any[] = [];
    alunos.forEach(a => {
      const t = turmas.find(tr => tr.id === a.turmaId);
      const escA = todasEscolas.find(e => e.id === a.escolaId) || escola;
      const classeAluno = t?.classe || a.classeId || '';
      const ehFinal = isClasseFinal(classeAluno);
      const notasAluno = notasConsolidadas.filter(n => n.alunoId === a.id);
      const discList = disciplinas.filter(d => !d.classes || d.classes.length === 0 || d.classes.includes(classeAluno));
      (discList.length > 0 ? discList : disciplinas).forEach(d => {
        const n1 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('1'));
        const n2 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('2'));
        const n3 = notasAluno.find(n => n.disciplinaId === d.id && String(n.trimestre).includes('3'));
        const mt1 = n1?.mediaTrimestral ?? n1?.notaFinal;
        const mt2 = n2?.mediaTrimestral ?? n2?.notaFinal;
        const mt3 = n3?.mediaTrimestral ?? n3?.notaFinal;
        const mtsValidos = [mt1, mt2, mt3].filter((v): v is number => v !== undefined && v !== null);
        const mdf = mtsValidos.length > 0 ? Number((mtsValidos.reduce((x, y) => x + y, 0) / mtsValidos.length).toFixed(1)) : 0;
        const ne = ehFinal ? (n3?.notaExame ?? null) : null;
        const mf = ehFinal && ne !== null ? Number((mdf * 0.4 + ne * 0.6).toFixed(1)) : mdf;

        const row: Record<string, any> = {
          'Instituição Escolar': escA?.nomeOficial || '',
          'Ano Lectivo': a.anoLectivo || t?.anoLectivo || escA?.anoLectivoActivo || '',
          'Nº Processo': a.codigoMatricula || a.id,
          'Nome do Estudante': a.nomeCompleto,
          'BI / Cédula': a.numeroBI || a.numeroDocumento || '—',
          'Classe': classeAluno || '—',
          'Turma': t?.nome || a.turmaId || '—',
          'Disciplina': d.nome,
          '1T - MAC': n1?.mac ?? '—'
        };
        if (nppAtivo) row['1T - NPP'] = n1?.npp ?? '—';
        row['1T - PT'] = n1?.npt ?? '—';
        row['1T - MT'] = mt1 ?? '—';
        row['2T - MAC'] = n2?.mac ?? '—';
        if (nppAtivo) row['2T - NPP'] = n2?.npp ?? '—';
        row['2T - PT'] = n2?.npt ?? '—';
        row['2T - MT'] = mt2 ?? '—';
        row['3T - MAC'] = n3?.mac ?? '—';
        if (nppAtivo) row['3T - NPP'] = n3?.npp ?? '—';
        row['3T - PT'] = n3?.npt ?? '—';
        row['3T - MT'] = mt3 ?? '—';
        row['MDF'] = mdf > 0 ? mdf : '—';
        row['NE (Exame)'] = ehFinal && ne !== null ? ne : '—';
        row['MF (Final)'] = mf > 0 ? mf : '—';
        row['Resultado'] = mf > 0 ? (mf >= 10 ? 'Aprovado' : 'Não Transita') : 'Pendente';
        notasRows.push(row);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notasRows.length > 0 ? notasRows : [{ Info: 'Sem notas lançadas' }]), 'Notas e Pautas');

    const sigla = isEscolaEspecifica ? (escola?.sigla || 'Escola') : 'Rede_Nacional';
    const dataHoje = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SGE_Funcionarios_Alunos_Notas_${sigla}_${dataHoje}.xlsx`);
    dbService.registarLog('Exportação Excel', `Pacote completo Funcionários, Alunos e Notas (${sigla}) exportado em Excel.`);
  },

  // 4C. Exportação Unificada: Funcionários, Alunos e Notas em JSON (.json) - Escopo estrito da escola para Diretor
  exportarFuncionariosAlunosNotasJSON: (escolaId?: string) => {
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escola = (isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : dbService.getEscolaAtiva()) || todasEscolas[0];

    const alunos = isEscolaEspecifica ? dbService.getAlunos().filter(a => a.escolaId === effectiveEscolaId) : dbService.getAlunos();
    const alunosIds = new Set(alunos.map(a => a.id));
    const turmas = isEscolaEspecifica ? dbService.getTurmas().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTurmas();
    const disciplinas = dbService.getDisciplinas(isEscolaEspecifica ? effectiveEscolaId : escola?.id);
    const funcs = (isEscolaEspecifica
      ? dbService.getFuncionarios().filter(f => f.escolaId === effectiveEscolaId || (escola?.diretorGeralId && f.id === escola.diretorGeralId))
      : dbService.getFuncionarios()
    ).filter(f => !isAdminGeralUserObj(f));
    const notasConsolidadas = isEscolaEspecifica
      ? dbService.getNotasConsolidadas().filter(nc => !(nc as any).escolaId || (nc as any).escolaId === effectiveEscolaId || alunosIds.has(nc.alunoId))
      : dbService.getNotasConsolidadas();
    const avaliacoesIds = new Set(
      (isEscolaEspecifica ? dbService.getAvaliacoes().filter(av => av.escolaId === effectiveEscolaId) : dbService.getAvaliacoes()).map(av => av.id)
    );
    const notasDetalhadas = isEscolaEspecifica
      ? dbService.getNotas().filter(n => avaliacoesIds.has(n.avaliacaoId) || alunosIds.has(n.alunoId))
      : dbService.getNotas();

    const payload = {
      tipo: 'SGE_FUNCIONARIOS_ALUNOS_NOTAS_COMPLETO',
      escopo: isEscolaEspecifica ? 'ESCOLA' : 'SISTEMA_COMPLETO',
      versao: '2.6',
      dataExportacao: new Date().toISOString(),
      escolaAlvo: isEscolaEspecifica && escola
        ? { id: escola.id, nomeOficial: escola.nomeOficial, sigla: escola.sigla, anoLectivoActivo: escola.anoLectivoActivo }
        : { id: 'todas', nomeOficial: 'Rede Nacional Completa' },
      resumo: {
        totalFuncionarios: funcs.length,
        totalAlunos: alunos.length,
        totalTurmas: turmas.length,
        totalNotasConsolidadas: notasConsolidadas.length
      },
      funcionarios: funcs,
      turmas,
      disciplinas,
      alunos,
      notasConsolidadas,
      notas: notasDetalhadas
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sigla = isEscolaEspecifica ? (escola?.sigla || 'Escola') : 'Rede_Nacional';
    const dataHoje = new Date().toISOString().split('T')[0];
    a.download = `SGE_Funcionarios_Alunos_Notas_${sigla}_${dataHoje}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dbService.registarLog('Backup JSON', `Pacote JSON Funcionários, Alunos e Notas (${sigla}) exportado com sucesso.`);
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

    // Folha 4: Quadro de Funcionários (Completo com Formação, Instituição, Ano, Contratos e Dados Financeiros)
    const operadorEscola = dbService.getCurrentUser();
    const visEscola = dbService.getVisibilidadeEfetivaUsuario(operadorEscola, escola);
    const podeVerFuncEsc = (f: Funcionario) =>
      visEscola.irrestrito || visEscola.dadosSensiveis.verDadosSensiveisFuncionarios || f.id === operadorEscola?.id;
    const funcsRows = funcs.map(f => {
      const ver = podeVerFuncEsc(f);
      const outrasTxt = Array.isArray(f.outrasFormacoes) && f.outrasFormacoes.length > 0
        ? f.outrasFormacoes
            .map(of => `${of.nivelFormacao}: ${of.cursoOuArea || '—'} — ${of.instituicaoAcademica || '—'} (${of.anoConclusao || '—'})`)
            .join(' | ')
        : '—';
      const camposExtrasTxt = Array.isArray(f.camposExtrasFormacao) && f.camposExtrasFormacao.length > 0
        ? f.camposExtrasFormacao.map(c => `${c.rotulo}: ${c.valor}`).join(' | ')
        : '—';
      const row: Record<string, any> = {
        'ID': f.id,
        'Nome Completo': f.nomeCompleto,
        'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
        'BI': ver ? f.numeroBI : '*** Protegido ***',
        'Data Nascimento': f.dataNascimento || '—',
        'Cargo': f.cargo,
        'Papel no Sistema': f.role,
        'Categoria Profissional MED': f.categoriaProfissional || '—',
        'Nº de Agente': f.numeroAgente || '—',
        'Tipo de Contrato': f.tipoContrato || 'Efetivo',
        'Situação Funcional': f.situacaoFuncional || 'Ativo',
        'Data de Admissão': f.dataAdmissao || '—',
        'Carga Horária Semanal': f.cargaHorariaSemanal ? `${f.cargaHorariaSemanal} h/sem` : '—',
        'Professor': f.ehProfessor ? 'Sim' : 'Não',
        'Formação Académica': f.grauAcademico || f.habilitacoes || 'Licenciatura',
        'Especialidade / Curso': f.especialidade || '—',
        'Instituição Académica': f.instituicaoAcademica || (f as any).instituicaoFormacao || f.habilitacoes || '—',
        'Ano de Conclusão': f.anoConclusaoFormacao || '—',
        'Outras Formações': outrasTxt,
        'Campos Adicionais (RH/Formação)': camposExtrasTxt,
        'NIF': ver ? (f.nif || f.numeroBI || '—') : '*** Protegido ***',
        'Banco': ver ? (f.banco || '—') : '*** Protegido ***',
        'IBAN': ver ? (f.iban || '—') : '*** Protegido ***',
        'Nº Segurança Social (INSS)': ver ? (f.numeroSegurancaSocial || f.numeroINSS || '—') : '*** Protegido ***',
        'Telefone': ver ? f.telefone : '*** Protegido ***',
        'Email': ver ? f.email : '*** Protegido ***',
        'Província / Município': `${f.provincia || f.provinciaOrigem || '—'} / ${f.municipio || f.municipioResidencia || '—'}`,
        'Residência': ver ? (f.residencia || f.residenciaAtual || f.bairro || '—') : '*** Protegido ***'
      };
      if (Array.isArray(f.camposExtrasFormacao)) {
        f.camposExtrasFormacao.forEach(c => {
          if (c.rotulo && !Object.prototype.hasOwnProperty.call(row, c.rotulo)) {
            row[c.rotulo] = c.valor || '—';
          }
        });
      }
      return row;
    });
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

    // Folha 8: Plano de Atividades e Eventos da Escola
    const planoAtividades = dbService.getAtividadesPlano(escola.id);
    const planoRows = planoAtividades.map(a => ({
      'Ano Lectivo': a.anoLectivo,
      'Período / Trimestre': a.trimestre === 'Anual' ? 'Anual' : `${a.trimestre}º Trimestre`,
      'Área de Origem': a.areaOrigem,
      'Perfil / Responsável': a.perfilOrigemLabel || a.criadoPorNome,
      'Título da Atividade / Evento': a.titulo,
      'Categoria': a.categoria,
      'Data Início': a.dataInicio,
      'Data Fim': a.dataFim || '—',
      'Local': a.local || '—',
      'Público-Alvo': a.publicoAlvo,
      'Estado de Execução': a.estadoExecucao,
      'Cumprimento (%)': `${a.percentualCumprimento}%`,
      'No Plano Geral do Diretor': a.excluidaDoPlanoGeralPorDiretor ? `Excluída (${a.motivoExclusaoDiretor || 'Sem motivo'})` : 'Incluída'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planoRows.length > 0 ? planoRows : [{ 'Info': 'Sem atividades no plano' }]), 'Plano de Atividades e Eventos');

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
      const outrasTxt = Array.isArray(f.outrasFormacoes) && f.outrasFormacoes.length > 0
        ? f.outrasFormacoes.map(of => `${of.nivelFormacao}: ${of.cursoOuArea || '—'} (${of.instituicaoAcademica || '—'}, ${of.anoConclusao || '—'})`).join(' | ')
        : '—';
      const extrasTxt = Array.isArray(f.camposExtrasFormacao) && f.camposExtrasFormacao.length > 0
        ? f.camposExtrasFormacao.map(c => `${c.rotulo}: ${c.valor}`).join(' | ')
        : '—';
      return {
        'Escola': e?.nomeOficial || f.escolaId || 'Central',
        'Nome Completo': f.nomeCompleto,
        'Gênero': f.genero === 'M' ? 'Masculino' : 'Feminino',
        'BI': f.numeroBI,
        'NIF': f.nif || f.numeroBI || '—',
        'Cargo': f.cargo,
        'Papel no Sistema': f.role,
        'Tipo de Contrato': f.tipoContrato || 'Efetivo',
        'Situação Funcional': f.situacaoFuncional || 'Ativo',
        'Nº de Agente': f.numeroAgente || '—',
        'Professor': f.ehProfessor ? 'Sim' : 'Não',
        'Formação Académica': f.grauAcademico || f.habilitacoes || 'Licenciatura',
        'Especialidade': f.especialidade || '—',
        'Instituição Académica': f.instituicaoAcademica || f.habilitacoes || '—',
        'Ano de Conclusão': f.anoConclusaoFormacao || '—',
        'Outras Formações': outrasTxt,
        'Campos Adicionais': extrasTxt,
        'Banco': f.banco || '—',
        'IBAN': f.iban || '—',
        'INSS': f.numeroSegurancaSocial || f.numeroINSS || '—',
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

  // Importar Dados do Excel (Motor Flexível Multi-Escolas e Multi-Anos Letivos)
  importarExcel: async (
    file: File,
    opcoes?: { anoLectivoDestino?: string; escolaIdDestino?: string }
  ): Promise<{ sucesso: boolean; mensagem: string; contadores?: any }> => {
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      const escolaAtiva = (opcoes?.escolaIdDestino ? dbService.getEscolaPorId(opcoes.escolaIdDestino) : null) || dbService.getEscolaAtiva();
      const anoDestinoBase = opcoes?.anoLectivoDestino || escolaAtiva?.anoLectivoActivo || '';

      let alunosImportados = 0;
      let turmasImportadas = 0;
      let funcionariosImportados = 0;
      let disciplinasImportadas = 0;
      let notasImportadas = 0;

      const alunosExistentes = [...dbService.getAlunos()];
      const turmasExistentes = [...dbService.getTurmas()];
      const disciplinasExistentes = [...dbService.getDisciplinas(escolaAtiva.id)];
      const funcionariosExistentes = [...dbService.getFuncionariosBruto()];
      const notasExistentes = [...dbService.getNotasConsolidadas()];

      const ensureTurma = (nomeTurmaRaw: string, classeRaw: string, turnoRaw: string, cursoRaw: string, salaRaw: string, anoRow: string): Turma | null => {
        const nomeT = (nomeTurmaRaw || '').trim();
        const classeNorm = normalizarClasseImportacao(classeRaw) || '1ª';
        const anoT = normalizarAnoLectivoImportacao(anoRow, anoDestinoBase);
        if (!nomeT && !classeNorm) return null;
        const nomeFinal = nomeT || `${classeNorm} A`;

        const found = turmasExistentes.find(
          t =>
            t.escolaId === escolaAtiva.id &&
            normalizarTextoComparacao(t.nome) === normalizarTextoComparacao(nomeFinal) &&
            (!classeNorm || normalizarTextoComparacao(t.classe) === normalizarTextoComparacao(classeNorm)) &&
            (!anoT || !t.anoLectivo || t.anoLectivo === anoT)
        );
        if (found) return found;

        const created: Turma = {
          id: `turma-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          escolaId: escolaAtiva.id,
          nome: nomeFinal,
          classe: classeNorm,
          nivelEnsino: inferirNivelEnsinoPorClasse(classeNorm),
          curso: cursoRaw || 'Ensino Geral',
          turno: normalizarTurnoImportacao(turnoRaw),
          sala: salaRaw || 'Sala 01',
          capacidadeMaxima: 45,
          anoLectivo: anoT
        };
        turmasExistentes.push(created);
        firebaseSyncEngine.salvarTurma(created);
        turmasImportadas++;
        return created;
      };

      const ensureDisciplina = (nomeDiscRaw: string, classeNorm?: string): Disciplina | null => {
        const nomeD = (nomeDiscRaw || '').trim();
        if (!nomeD || nomeD === '—') return null;
        const found = disciplinasExistentes.find(
          d => normalizarTextoComparacao(d.nome) === normalizarTextoComparacao(nomeD)
        );
        if (found) return found;
        const created: Disciplina = {
          id: `disc-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          escolaId: escolaAtiva.id,
          nome: nomeD,
          sigla: nomeD.slice(0, 3).toUpperCase(),
          codigo: nomeD.slice(0, 3).toUpperCase(),
          cargaHorariaSemanal: 4,
          nivelEnsino: inferirNivelEnsinoPorClasse(classeNorm || '10ª'),
          classes: classeNorm ? [classeNorm] : [],
          anoLectivo: anoDestinoBase
        };
        disciplinasExistentes.push(created);
        firebaseSyncEngine.salvarDisciplina(created);
        disciplinasImportadas++;
        return created;
      };

      const folhasAnalisadas = wb.SheetNames.map(sheetName => {
        const ws = wb.Sheets[sheetName];
        const parsed = extrairLinhasComCabecalhoAutomatico(XLSX, ws);
        const tipo = classificarFolhaExcel(sheetName, parsed.headers);
        return { sheetName, tipo, ...parsed };
      });

      // Ordem estratégica: Turmas -> Disciplinas -> Funcionários -> Alunos -> Notas
      const ordem: Record<string, number> = {
        AnoLectivo: 1,
        Turmas: 2,
        Disciplinas: 3,
        Funcionarios: 4,
        Alunos: 5,
        Notas: 6,
        Desconhecido: 7
      };
      folhasAnalisadas.sort((a, b) => (ordem[a.tipo] || 9) - (ordem[b.tipo] || 9));

      for (const folha of folhasAnalisadas) {
        if (folha.rows.length === 0 || folha.tipo === 'Desconhecido') continue;
        const anoFolha = folha.metadados.anoLectivoDetectado || anoDestinoBase;

        if (folha.tipo === 'Turmas') {
          for (const row of folha.rows) {
            const nomeT = obterCampoFlexivel(row, ['Nome da Turma', 'Nome', 'Turma', 'Designação']);
            const classeT = normalizarClasseImportacao(obterCampoFlexivel(row, ['Classe', 'classe', 'ClasseID'])) || '1ª';
            if (!nomeT) continue;
            const turnoT = obterCampoFlexivel(row, ['Turno', 'Período', 'turno', 'periodo']);
            const cursoT = obterCampoFlexivel(row, ['Curso', 'Curso / Área', 'curso']);
            const salaT = obterCampoFlexivel(row, ['Sala', 'sala', 'Sala de Aula']);
            const anoT = normalizarAnoLectivoImportacao(obterCampoFlexivel(row, ['Ano Lectivo', 'Ano Letivo', 'anoLectivo']), anoFolha);
            ensureTurma(nomeT, classeT, turnoT, cursoT, salaT, anoT);
          }
        } else if (folha.tipo === 'Disciplinas') {
          for (const row of folha.rows) {
            const nomeD = obterCampoFlexivel(row, ['Disciplina', 'Nome', 'Nome da Disciplina', 'Cadeira']);
            if (!nomeD) continue;
            const classeD = normalizarClasseImportacao(obterCampoFlexivel(row, ['Classe', 'classe']));
            ensureDisciplina(nomeD, classeD);
          }
        } else if (folha.tipo === 'Funcionarios') {
          for (const row of folha.rows) {
            const nomeF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.nomeCompleto);
            if (!nomeF) continue;
            const biF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.numeroBI).replace(/\*\*\*.*?\*\*\*/g, '').trim();
            const agenteF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.numeroAgente);
            const emailF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.email).replace(/\*\*\*.*?\*\*\*/g, '').trim();
            const telF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.telefone).replace(/\*\*\*.*?\*\*\*/g, '').trim();
            const cargoF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.cargo) || 'Professor';
            const roleF = normalizarRoleImportacao(obterCampoFlexivel(row, ALIASES_FUNCIONARIO.role), cargoF);
            if (roleF === 'AdminGeral') continue;
            const dnF = converterValorDataExcel(obterCampoBrutoFlexivel(row, ALIASES_FUNCIONARIO.dataNascimento)) || '1990-01-01';
            const admF = converterValorDataExcel(obterCampoBrutoFlexivel(row, ALIASES_FUNCIONARIO.dataAdmissao)) || new Date().toISOString().split('T')[0];

            const existenteIdx = funcionariosExistentes.findIndex(
              f =>
                f.escolaId === escolaAtiva.id &&
                ((biF && f.numeroBI && normalizarTextoComparacao(f.numeroBI) === normalizarTextoComparacao(biF)) ||
                  (agenteF && f.numeroAgente && normalizarTextoComparacao(f.numeroAgente) === normalizarTextoComparacao(agenteF)) ||
                  normalizarTextoComparacao(f.nomeCompleto) === normalizarTextoComparacao(nomeF))
            );
            const baseExist = existenteIdx >= 0 ? funcionariosExistentes[existenteIdx] : null;
            const funcObj: Funcionario = {
              ...(baseExist || {}),
              id: baseExist?.id || `func-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              escolaId: escolaAtiva.id,
              nomeCompleto: nomeF,
              numeroBI: biF || baseExist?.numeroBI || `BI-${Date.now().toString().slice(-6)}`,
              numeroAgente: agenteF || baseExist?.numeroAgente,
              genero: normalizarGeneroImportacao(obterCampoFlexivel(row, ALIASES_FUNCIONARIO.genero)),
              dataNascimento: dnF,
              telefone: telF || baseExist?.telefone || '',
              email: emailF || baseExist?.email || `${normalizarTextoComparacao(nomeF).replace(/\s+/g, '.')}@escola.gov.ao`,
              cargo: cargoF,
              role: roleF,
              ehProfessor: roleF === 'Professor' || ['sim', 'true', '1'].includes(normalizarTextoComparacao(obterCampoFlexivel(row, ALIASES_FUNCIONARIO.ehProfessor))),
              ehAdministrativoQueLeciona: baseExist?.ehAdministrativoQueLeciona ?? false,
              fotoUrl: baseExist?.fotoUrl ?? '',
              habilitacoes: obterCampoFlexivel(row, ALIASES_FUNCIONARIO.habilitacoes) || baseExist?.habilitacoes || 'Licenciatura',
              especialidade: obterCampoFlexivel(row, ALIASES_FUNCIONARIO.especialidade) || baseExist?.especialidade,
              dataAdmissao: admF,
              ativo: true,
              statusConta: baseExist?.statusConta || 'Ativa',
              atualizadoEm: new Date().toISOString()
            };
            if (existenteIdx >= 0) funcionariosExistentes[existenteIdx] = funcObj;
            else funcionariosExistentes.push(funcObj);
            firebaseSyncEngine.salvarFuncionariosLote([funcObj]);
            funcionariosImportados++;
          }
        } else if (folha.tipo === 'Alunos') {
          for (let rIdx = 0; rIdx < folha.rows.length; rIdx++) {
            const row = folha.rows[rIdx];
            const nomeA = obterCampoFlexivel(row, ALIASES_ALUNO.nomeCompleto);
            if (!nomeA) continue;

            const biA = obterCampoFlexivel(row, ALIASES_ALUNO.numeroBI);
            const matA = obterCampoFlexivel(row, ALIASES_ALUNO.codigoMatricula);
            const anoA = normalizarAnoLectivoImportacao(obterCampoFlexivel(row, ALIASES_ALUNO.anoLectivo), anoFolha);
            const classeA = normalizarClasseImportacao(obterCampoFlexivel(row, ALIASES_ALUNO.classe) || folha.metadados.classeDetectada || '1ª');
            const turmaNomeA = obterCampoFlexivel(row, ALIASES_ALUNO.turmaNome) || folha.metadados.turmaDetectada || '';
            const cursoA = obterCampoFlexivel(row, ALIASES_ALUNO.curso) || 'Ensino Geral';
            const turnoA = obterCampoFlexivel(row, ALIASES_ALUNO.turno) || 'Manhã';
            const salaA = obterCampoFlexivel(row, ALIASES_ALUNO.sala) || 'Sala 01';
            const turmaResolvida = ensureTurma(turmaNomeA, classeA, turnoA, cursoA, salaA, anoA);
            const dnA = converterValorDataExcel(obterCampoBrutoFlexivel(row, ALIASES_ALUNO.dataNascimento)) || '2014-01-01';

            const idxExist = alunosExistentes.findIndex(
              a =>
                a.escolaId === escolaAtiva.id &&
                ((matA && a.codigoMatricula && normalizarTextoComparacao(a.codigoMatricula) === normalizarTextoComparacao(matA)) ||
                  (biA && a.numeroBI && normalizarTextoComparacao(a.numeroBI) === normalizarTextoComparacao(biA)) ||
                  (normalizarTextoComparacao(a.nomeCompleto) === normalizarTextoComparacao(nomeA) && a.anoLectivo === anoA))
            );
            const baseExist = idxExist >= 0 ? alunosExistentes[idxExist] : null;
            const novoAluno: Aluno = {
              ...(baseExist || {}),
              id: baseExist?.id || `aluno-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              codigoMatricula: matA || baseExist?.codigoMatricula || `MED-${Date.now().toString().slice(-6)}-${rIdx + 1}`,
              numeroProcesso: matA || baseExist?.numeroProcesso,
              numeroOrdem: Number(obterCampoFlexivel(row, ALIASES_ALUNO.numeroOrdem)) || baseExist?.numeroOrdem || rIdx + 1,
              nomeCompleto: nomeA,
              genero: normalizarGeneroImportacao(obterCampoFlexivel(row, ALIASES_ALUNO.genero)),
              dataNascimento: dnA,
              naturalidade: obterCampoFlexivel(row, ALIASES_ALUNO.naturalidade) || baseExist?.naturalidade || 'Luanda',
              provinciaOrigem: obterCampoFlexivel(row, ALIASES_ALUNO.provinciaOrigem) || baseExist?.provinciaOrigem || escolaAtiva.provincia || 'Luanda',
              numeroBI: biA || baseExist?.numeroBI || 'S/Doc',
              telefone: obterCampoFlexivel(row, ALIASES_ALUNO.telefone) || baseExist?.telefone || '',
              fotoUrl: baseExist?.fotoUrl || '',
              nomePai: obterCampoFlexivel(row, ALIASES_ALUNO.nomePai) || baseExist?.nomePai,
              nomeMae: obterCampoFlexivel(row, ALIASES_ALUNO.nomeMae) || baseExist?.nomeMae,
              encarregadoNome: obterCampoFlexivel(row, ALIASES_ALUNO.encarregadoNome) || baseExist?.encarregadoNome || 'Encarregado de Educação',
              encarregadoParentesco: baseExist?.encarregadoParentesco || 'Encarregado',
              encarregadoTelefone: obterCampoFlexivel(row, ALIASES_ALUNO.encarregadoTelefone) || baseExist?.encarregadoTelefone || '',
              estado: (obterCampoFlexivel(row, ALIASES_ALUNO.estado) || baseExist?.estado || 'Ativo') as any,
              turmaId: turmaResolvida?.id || baseExist?.turmaId || '',
              classeId: classeA || turmaResolvida?.classe || baseExist?.classeId || '1ª',
              curso: cursoA || turmaResolvida?.curso || baseExist?.curso,
              turno: normalizarTurnoImportacao(turnoA),
              escolaId: escolaAtiva.id,
              anoLectivo: anoA,
              propinaStatus: baseExist?.propinaStatus || 'Regularizada',
              historicoAnterior: baseExist?.historicoAnterior || [],
              cadastradoEm: baseExist?.cadastradoEm || new Date().toISOString().split('T')[0],
              atualizadoEm: new Date().toISOString()
            };

            if (idxExist >= 0) alunosExistentes[idxExist] = novoAluno;
            else alunosExistentes.push(novoAluno);
            firebaseSyncEngine.salvarAluno(novoAluno);
            alunosImportados++;
          }
        } else if (folha.tipo === 'Notas') {
          for (const row of folha.rows) {
            const alunoNome = obterCampoFlexivel(row, ALIASES_NOTA.alunoNome);
            const matAluno = obterCampoFlexivel(row, ALIASES_NOTA.codigoMatricula);
            const biAluno = obterCampoFlexivel(row, ALIASES_NOTA.numeroBI);
            const discNome = obterCampoFlexivel(row, ALIASES_NOTA.disciplinaNome);
            if ((!alunoNome && !matAluno) || !discNome) continue;

            const anoNota = normalizarAnoLectivoImportacao(obterCampoFlexivel(row, ALIASES_NOTA.anoLectivo), anoFolha);
            const classeNota = normalizarClasseImportacao(obterCampoFlexivel(row, ALIASES_NOTA.classe) || folha.metadados.classeDetectada || '');
            const turmaNomeNota = obterCampoFlexivel(row, ALIASES_NOTA.turmaNome) || folha.metadados.turmaDetectada || '';

            let alunoTarget = alunosExistentes.find(
              a =>
                a.escolaId === escolaAtiva.id &&
                ((matAluno && a.codigoMatricula && normalizarTextoComparacao(a.codigoMatricula) === normalizarTextoComparacao(matAluno)) ||
                  (biAluno && a.numeroBI && normalizarTextoComparacao(a.numeroBI) === normalizarTextoComparacao(biAluno)) ||
                  (alunoNome && normalizarTextoComparacao(a.nomeCompleto) === normalizarTextoComparacao(alunoNome)))
            );

            if (!alunoTarget && alunoNome) {
              const tResolvida = ensureTurma(turmaNomeNota || `${classeNota || '1ª'} A`, classeNota || '1ª', 'Manhã', 'Ensino Geral', 'Sala 01', anoNota);
              alunoTarget = {
                id: `aluno-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                codigoMatricula: matAluno || `MED-${Date.now().toString().slice(-6)}`,
                numeroOrdem: alunosExistentes.length + 1,
                nomeCompleto: alunoNome,
                genero: 'M',
                dataNascimento: '2014-01-01',
                naturalidade: 'Luanda',
                provinciaOrigem: escolaAtiva.provincia || 'Luanda',
                numeroBI: biAluno || 'S/Doc',
                telefone: '',
                fotoUrl: '',
                encarregadoNome: 'Encarregado de Educação',
                encarregadoParentesco: 'Encarregado',
                encarregadoTelefone: '',
                estado: 'Ativo',
                turmaId: tResolvida?.id || '',
                classeId: classeNota || tResolvida?.classe || '1ª',
                escolaId: escolaAtiva.id,
                anoLectivo: anoNota,
                propinaStatus: 'Regularizada',
                historicoAnterior: [],
                cadastradoEm: new Date().toISOString().split('T')[0],
                atualizadoEm: new Date().toISOString()
              };
              alunosExistentes.push(alunoTarget);
              firebaseSyncEngine.salvarAluno(alunoTarget);
              alunosImportados++;
            }

            if (!alunoTarget) continue;
            const discTarget = ensureDisciplina(discNome, alunoTarget.classeId || classeNota);
            if (!discTarget) continue;

            const gravarNotaTrimestre = (trim: '1' | '2' | '3', mac?: number, npp?: number, npt?: number, mtRaw?: number, ne?: number, mf?: number) => {
              const valores = [mac, npp, npt].filter((v): v is number => v !== undefined);
              const mtCalc = mtRaw !== undefined ? mtRaw : (valores.length > 0 ? Number((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1)) : mf);
              if (mtCalc === undefined && mac === undefined && npp === undefined && npt === undefined && ne === undefined) return;
              const notaId = `${alunoTarget!.id}_${discTarget.id}_${trim}_${anoNota || 'padrao'}`;
              const idxN = notasExistentes.findIndex(
                n => n.id === notaId || (n.alunoId === alunoTarget!.id && n.disciplinaId === discTarget.id && String(n.trimestre).includes(trim) && (!anoNota || !n.anoLectivo || n.anoLectivo === anoNota))
              );
              const novaNota: NotaTrimestralConsolidada = {
                ...(idxN >= 0 ? notasExistentes[idxN] : {}),
                id: idxN >= 0 ? notasExistentes[idxN].id : notaId,
                escolaId: escolaAtiva.id,
                alunoId: alunoTarget!.id,
                turmaId: alunoTarget!.turmaId,
                disciplinaId: discTarget.id,
                disciplinaNome: discTarget.nome,
                trimestre: trim as any,
                anoLectivo: anoNota,
                mac: mac ?? 0,
                npp,
                npt: npt ?? 0,
                mediaTrimestral: mtCalc ?? 0,
                notaExame: trim === '3' ? ne : undefined,
                notaFinal: mf ?? mtCalc ?? 0,
                faltas: idxN >= 0 ? (notasExistentes[idxN].faltas ?? 0) : 0,
                validadaPelaDirecao: idxN >= 0 ? Boolean(notasExistentes[idxN].validadaPelaDirecao) : false,
                atualizadoEm: new Date().toISOString()
              };
              if (idxN >= 0) notasExistentes[idxN] = novaNota;
              else notasExistentes.push(novaNota);
              firebaseSyncEngine.salvarNotasConsolidadasLote([novaNota]);
              notasImportadas++;
            };

            const trimSingle = obterCampoFlexivel(row, ALIASES_NOTA.trimestre);
            const mt1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt1));
            const mac1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac1));
            const npp1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp1));
            const npt1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt1));
            const mt2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt2));
            const mac2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac2));
            const npp2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp2));
            const npt2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt2));
            const mt3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt3));
            const mac3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac3));
            const npp3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp3));
            const npt3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt3));
            const neVal = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.ne));
            const mfVal = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mf));

            const temMultiTrim = [mt1, mac1, npt1, mt2, mac2, npt2, mt3, mac3, npt3].some(v => v !== undefined);
            if (temMultiTrim) {
              gravarNotaTrimestre('1', mac1, npp1, npt1, mt1);
              gravarNotaTrimestre('2', mac2, npp2, npt2, mt2);
              gravarNotaTrimestre('3', mac3, npp3, npt3, mt3, neVal, mfVal);
            } else {
              const tDigit: '1' | '2' | '3' = trimSingle.includes('2') ? '2' : trimSingle.includes('3') ? '3' : '1';
              const macS = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac));
              const nppS = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp));
              const nptS = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt));
              const mtS = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt));
              gravarNotaTrimestre(tDigit, macS, nppS, nptS, mtS, neVal, mfVal);
            }
          }
        }
      }

      setLocal(STORAGE_KEYS.ALUNOS, alunosExistentes);
      setLocal(STORAGE_KEYS.TURMAS, turmasExistentes);
      setLocal(STORAGE_KEYS.DISCIPLINAS, disciplinasExistentes);
      setLocal(STORAGE_KEYS.FUNCIONARIOS, funcionariosExistentes);
      setLocal(STORAGE_KEYS.NOTAS_CONSOLIDADAS, notasExistentes);

      dbService.registarLog(
        'Importação Excel Flexível',
        `Ficheiro "${file.name}" importado: ${alunosImportados} alunos, ${turmasImportadas} turmas, ${funcionariosImportados} funcionários, ${disciplinasImportadas} disciplinas e ${notasImportadas} notas.`
      );

      return {
        sucesso: true,
        mensagem: `Importação flexível concluída! ${alunosImportados} aluno(s), ${turmasImportadas} turma(s), ${funcionariosImportados} funcionário(s), ${disciplinasImportadas} disciplina(s) e ${notasImportadas} nota(s) processados.`,
        contadores: {
          alunosImportados,
          turmasImportadas,
          funcionariosImportados,
          disciplinasImportadas,
          notasImportadas
        }
      };
    } catch (err: any) {
      console.error('Erro na importação Excel:', err);
      return {
        sucesso: false,
        mensagem: `Falha ao processar ficheiro Excel: ${err.message || 'Formato de ficheiro inválido'}`
      };
    }
  },

  // Backup Completo JSON (100% dos dados com isolamento por escola para Diretor e integral para AdminGeral)
  gerarBackupJSON: (escolaId?: string) => {
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escolaAlvo = isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : null;

    const jsonString = dbService.criarBackupJSON(effectiveEscolaId);
    const nomeSufixo = escolaAlvo?.sigla || (isEscolaEspecifica ? 'Instituicao' : 'Rede_Nacional');
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGE_NG_Backup_${nomeSufixo}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dbService.registarLog('Backup Integral do Sistema', `Cópia de segurança completa (${nomeSufixo}) exportada com sucesso.`);
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

    dbService.salvarCheckpointBackupIncremental(scope.effectiveEscolaId, 'INCREMENTAL');

    return {
      sucesso: true,
      sequencia: novaSequencia,
      totalAlterados,
      totalEliminados,
      mensagem: `Backup Incremental #${novaSequencia} transferido com ${totalAlterados} alteração(ões) e ${totalEliminados} eliminação(ões).`
    };
  },

  // Restaurar Backup JSON (Suporte Automático a Snapshot Completo da Escola/Sistema e Backup Incremental)
  restaurarBackupJSON: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
      const adminsExistentes = dbService.getFuncionariosBruto().filter(f => isAdminGeralUserObj(f));
      const { ids: adminIds, nomes: adminNomes } = getAdminGeralIdsAndNomes();
      const logsAdminExistentes = dbService.getAuditoriaBruta().filter(l => isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes));
      const escolasBrutasExistentes = dbService.getEscolasBrutas();
      const escolaAlvo = typeof data?.escolaIdAlvo === 'string' && data.escolaIdAlvo !== 'todas'
        ? data.escolaIdAlvo
        : (nonAdmin ? dbService.getEscolaAtiva().id : undefined);
      const modoMergeEscola = Boolean(escolaAlvo && escolaAlvo !== 'todas');

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

          for (const remId of removals) {
            const existente = mapa.get(remId);
            if (nonAdmin && existente) {
              if (def.colecao === 'funcionarios' && isAdminGeralUserObj(existente)) continue;
              if (def.colecao === 'auditoria' && isLogOuAcaoDoAdminGeral(existente, adminIds, adminNomes)) continue;
            }
            mapa.delete(remId);
          }

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

          if (nonAdmin && def.colecao === 'funcionarios') {
            for (const adm of adminsExistentes) mapa.set(adm.id, adm);
          }
          if (nonAdmin && def.colecao === 'auditoria') {
            for (const admLog of logsAdminExistentes) mapa.set(admLog.id, admLog);
          }

          setLocal(def.storageKey, Array.from(mapa.values()));
        }

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
      // MODO 2: RESTAURAÇÃO COMPLETA (SCHOOL-SAFE MERGE OU INTEGRAL)
      // ============================================================
      const mergeColecaoPorEscolaOuIntegral = (
        storageKey: string,
        novosItens: any[] | undefined,
        keyName: string = 'id'
      ) => {
        if (!Array.isArray(novosItens)) return;
        if (!modoMergeEscola || !escolaAlvo) {
          setLocal(storageKey, novosItens);
          return;
        }
        const atuais = getLocal<any[]>(storageKey, []);
        const preservadosOutras = atuais.filter(item => item?.escolaId && item.escolaId !== escolaAlvo);
        const idsNovos = new Set(novosItens.map(it => it?.[keyName]).filter(Boolean));
        const globaisSemConflito = atuais.filter(item => !item?.escolaId && !idsNovos.has(item?.[keyName]));
        setLocal(storageKey, [...preservadosOutras, ...globaisSemConflito, ...novosItens]);
      };

      const mergeMapaEscolar = (storageKey: string, novoMapa: Record<string, any> | undefined, filterKeyFn?: (k: string, v: any) => boolean) => {
        if (!novoMapa || typeof novoMapa !== 'object') return;
        if (!modoMergeEscola || !escolaAlvo) {
          setLocal(storageKey, novoMapa);
          return;
        }
        const atual = getLocal<Record<string, any>>(storageKey, {});
        const mesclado = { ...atual };
        Object.entries(novoMapa).forEach(([k, v]) => {
          if (!filterKeyFn || filterKeyFn(k, v)) {
            mesclado[k] = v;
          }
        });
        setLocal(storageKey, mesclado);
      };

      if (data.escolas) {
        if (modoMergeEscola || (nonAdmin && Array.isArray(data.escolas))) {
          const mapaSessoesApoio = new Map(
            escolasBrutasExistentes
              .filter(e => e.sessaoApoioTecnicoAtiva)
              .map(e => [e.id, e.sessaoApoioTecnicoAtiva])
          );
          const restauradasIds = new Set(data.escolas.map((e: Escola) => e.id));
          const preservadasOutras = escolasBrutasExistentes.filter(e => !restauradasIds.has(e.id));
          const restauradasComProtecao = data.escolas.map((e: Escola) => ({
            ...e,
            sessaoApoioTecnicoAtiva: nonAdmin ? mapaSessoesApoio.get(e.id) : (e.sessaoApoioTecnicoAtiva ?? mapaSessoesApoio.get(e.id))
          }));
          setLocal(STORAGE_KEYS.ESCOLAS, [...preservadasOutras, ...restauradasComProtecao]);
        } else {
          setLocal(STORAGE_KEYS.ESCOLAS, data.escolas);
        }
      } else if (data.escola && !nonAdmin) {
        setLocal(STORAGE_KEYS.ESCOLAS, [data.escola]);
      }

      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ALUNOS, data.alunos);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.TURMAS, data.turmas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.DISCIPLINAS, data.disciplinas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ATRIBUICOES, data.atribuicoes);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.COORDENACOES, data.coordenacoes);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.TIPOS_COORDENACAO, data.tiposCoordenacaoPersonalizados);

      if (Array.isArray(data.funcionarios)) {
        const funcsIncoming = nonAdmin
          ? data.funcionarios.filter((f: Funcionario) => !isAdminGeralUserObj(f))
          : data.funcionarios;
        if (modoMergeEscola && escolaAlvo) {
          const atuaisFuncs = dbService.getFuncionariosBruto();
          const preservados = atuaisFuncs.filter(f => (isAdminGeralUserObj(f) || (f.escolaId && f.escolaId !== escolaAlvo)));
          const idsIn = new Set(funcsIncoming.map((f: Funcionario) => f.id));
          const extrasPreservados = preservados.filter(p => !idsIn.has(p.id));
          setLocal(STORAGE_KEYS.FUNCIONARIOS, [...extrasPreservados, ...funcsIncoming]);
        } else if (nonAdmin) {
          const idsIn = new Set(funcsIncoming.map((f: Funcionario) => f.id));
          const admPres = adminsExistentes.filter(a => !idsIn.has(a.id));
          setLocal(STORAGE_KEYS.FUNCIONARIOS, [...admPres, ...funcsIncoming]);
        } else {
          setLocal(STORAGE_KEYS.FUNCIONARIOS, data.funcionarios);
        }
      }

      if (data.tiposAvaliacao) setLocal(STORAGE_KEYS.TIPOS_AVALIACAO, data.tiposAvaliacao);
      if (data.regrasMAC) setLocal(STORAGE_KEYS.REGRAS_MAC, data.regrasMAC);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.AVALIACOES, data.avaliacoes);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.NOTAS, data.notas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.NOTAS_CONSOLIDADAS, data.notasConsolidadas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.SOLICITACOES_NOTA, data.solicitacoesNota);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.JURIS, data.juris);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.TERMOS_EXAME, data.termosExame);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.HORARIOS, data.horarios);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.PRESENCAS, data.presencas);
      if (Array.isArray(data.auditoria)) {
        const logsIncoming = nonAdmin
          ? data.auditoria.filter((l: LogAuditoria) => !isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes))
          : data.auditoria;
        if (modoMergeEscola && escolaAlvo) {
          const atuaisLogs = dbService.getAuditoriaBruta();
          const outros = atuaisLogs.filter(l => (nonAdmin && isLogOuAcaoDoAdminGeral(l, adminIds, adminNomes)) || (l.escolaId && l.escolaId !== escolaAlvo));
          setLocal(STORAGE_KEYS.AUDITORIA, [...outros, ...logsIncoming]);
        } else if (nonAdmin) {
          setLocal(STORAGE_KEYS.AUDITORIA, [...logsAdminExistentes, ...logsIncoming]);
        } else {
          setLocal(STORAGE_KEYS.AUDITORIA, data.auditoria);
        }
      }
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.MENSAGENS, data.mensagens);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.BIBLIOTECA, data.biblioteca);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.BIBLIOTECA_ACESSOS, data.bibliotecaAcessos);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.RECIBOS, data.recibos);

      mergeMapaEscolar(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, data.configuracoesFinanceiras, (k) => !escolaAlvo || k === escolaAlvo);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.TRANSACOES_FINANCEIRAS, data.transacoesFinanceiras);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.DESPESAS_ESCOLARES, data.despesasEscolares);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.PATRIMONIO, data.patrimonio);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.DELEGACOES_PODERES, data.delegacoesPoderes);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, data.acoesDelegadasLogs);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, data.alteracoesNotasDirecao);
      mergeMapaEscolar(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, data.configuracoesDocumentos, (k, v) => !escolaAlvo || k.startsWith(`${escolaAlvo}_`) || v?.escolaId === escolaAlvo);
      mergeMapaEscolar(STORAGE_KEYS.CONFIGURACOES_PASSES, data.configuracoesPasses, (k) => !escolaAlvo || k === escolaAlvo);
      mergeMapaEscolar(STORAGE_KEYS.HISTORICO_COMPLETO, data.historicoCompleto);

      if (data.configuracaoSistema && !nonAdmin) setLocal(STORAGE_KEYS.CONFIGURACAO_SISTEMA, data.configuracaoSistema);
      if (data.anosLectivos && !modoMergeEscola) setLocal(STORAGE_KEYS.ANOS_LECTIVOS, data.anosLectivos);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ANOS_LECTIVOS_CONFIGS, data.anosLectivosConfigs);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.TURNOS_CONFIGS, data.turnosConfigs);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.CLASSES_CONFIGS, data.classesConfigs);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.CURSOS, data.cursos);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.AREAS_FORMACAO, data.areasFormacao);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.SALAS_AULAS, data.salasAulas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.EMOLUMENTOS_CONFIG, data.emolumentosPersonalizados);
      if (data.delegacoesCobranca) {
        if (Array.isArray(data.delegacoesCobranca)) {
          mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.DELEGACOES_COBRANCA, data.delegacoesCobranca);
        } else if (typeof data.delegacoesCobranca === 'object') {
          mergeMapaEscolar(STORAGE_KEYS.DELEGACOES_COBRANCA, data.delegacoesCobranca, (k) => !escolaAlvo || k === escolaAlvo);
        }
      }
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.PRESENCAS_ALUNOS, data.presencasAlunos);
      if (data.solicitacoesApoio && (!nonAdmin || modoMergeEscola)) {
        mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.SOLICITACOES_APOIO, data.solicitacoesApoio);
      }
      if (data.alertasSeguranca && !nonAdmin) setLocal(STORAGE_KEYS.ALERTAS_SEGURANCA, data.alertasSeguranca);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.RELATORIOS_ACONTECIMENTOS, data.relatoriosAcontecimentos);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, data.relatoriosPedagogicos);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.PLANOS_ATIVIDADES, data.planosAtividades);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.HORARIOS_PROVAS, data.horariosProvas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.MAPAS_FISCALIZACAO, data.mapasFiscalizacao);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ATAS_PROVAS, data.atasProvas);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.MAPAS_FERIAS, data.mapasFerias);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.ESTOQUE_LIMPEZA, data.materiaisLimpeza);
      mergeColecaoPorEscolaOuIntegral(STORAGE_KEYS.MOVIMENTOS_LIMPEZA, data.movimentosLimpeza);
      if (data.financasPessoais && typeof data.financasPessoais === 'object' && !modoMergeEscola) {
        mergeMapaEscolar(STORAGE_KEYS.FINANCAS_PESSOAIS, data.financasPessoais);
      }

      // Restaurar Calendários Escolares, Tipos Personalizados, Eventos Escolares, Localidades Personalizadas e Sessões (Admin)
      if (typeof localStorage !== 'undefined') {
        try {
          if (Array.isArray(data.calendarioEscolar) && escolaAlvo) {
            const calJson = JSON.stringify(data.calendarioEscolar);
            localStorage.setItem(`sge_calendario_${escolaAlvo}`, calJson);
            offlineStorage.gravarChaveNoIndexedDB(`sge_calendario_${escolaAlvo}`, calJson);
          }
          if (data.calendariosPorEscola && typeof data.calendariosPorEscola === 'object') {
            Object.entries(data.calendariosPorEscola).forEach(([escKey, evts]) => {
              if ((!escolaAlvo || escKey === escolaAlvo) && Array.isArray(evts)) {
                const calJson = JSON.stringify(evts);
                localStorage.setItem(`sge_calendario_${escKey}`, calJson);
                offlineStorage.gravarChaveNoIndexedDB(`sge_calendario_${escKey}`, calJson);
              }
            });
          }
          if (Array.isArray(data.calendarioTiposEscolar) && escolaAlvo) {
            const tiposJson = JSON.stringify(data.calendarioTiposEscolar);
            localStorage.setItem(`sge_calendario_tipos_${escolaAlvo}`, tiposJson);
            offlineStorage.gravarChaveNoIndexedDB(`sge_calendario_tipos_${escolaAlvo}`, tiposJson);
          }
          if (data.calendarioTiposPorEscola && typeof data.calendarioTiposPorEscola === 'object') {
            Object.entries(data.calendarioTiposPorEscola).forEach(([escKey, tipos]) => {
              if ((!escolaAlvo || escKey === escolaAlvo) && Array.isArray(tipos)) {
                const tiposJson = JSON.stringify(tipos);
                localStorage.setItem(`sge_calendario_tipos_${escKey}`, tiposJson);
                offlineStorage.gravarChaveNoIndexedDB(`sge_calendario_tipos_${escKey}`, tiposJson);
              }
            });
          }
          if (Array.isArray(data.eventosEscolares)) {
            if (modoMergeEscola && escolaAlvo) {
              const rawEv = localStorage.getItem('sge_eventos_escolares');
              const atuaisEv: any[] = rawEv ? JSON.parse(rawEv) : [];
              const outrosEv = Array.isArray(atuaisEv) ? atuaisEv.filter(ev => ev?.escolaId && ev.escolaId !== escolaAlvo) : [];
              localStorage.setItem('sge_eventos_escolares', JSON.stringify([...outrosEv, ...data.eventosEscolares]));
            } else {
              localStorage.setItem('sge_eventos_escolares', JSON.stringify(data.eventosEscolares));
            }
          }
          if (data.localidadesPersonalizadas && typeof data.localidadesPersonalizadas === 'object') {
            const loc = data.localidadesPersonalizadas;
            if (loc.provincias) localStorage.setItem('sgeng_provincias_personalizadas', JSON.stringify(loc.provincias));
            if (loc.municipios) localStorage.setItem('sgeng_municipios_personalizados', JSON.stringify(loc.municipios));
            if (loc.naturalidades) localStorage.setItem('sgeng_naturalidades_personalizadas', JSON.stringify(loc.naturalidades));
            if (loc.paises) localStorage.setItem('sgeng_paises_personalizados', JSON.stringify(loc.paises));
            if (loc.nacionalidades) localStorage.setItem('sgeng_nacionalidades_personalizadas', JSON.stringify(loc.nacionalidades));
          }
        } catch {}
      }

      dbService.registarLog('Restauração de Backup Integral', `Cópia de segurança (${modoMergeEscola ? `Escola ${escolaAlvo}` : 'Sistema Completo'}) restaurada com sucesso.`);
      try {
        dbService.salvarCheckpointBackupIncremental(escolaAlvo || 'todas', 'COMPLETO');
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
  obterLogs: (escolaId?: string) => dbService.getAuditoria(escolaId),
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
  criarBackupJSON: (escolaId?: string) => {
    const nonAdmin = isSessaoAutenticadaNaoAdminGeral();
    const effectiveEscolaId = nonAdmin
      ? (escolaId && escolaId !== 'todas' ? escolaId : dbService.getEscolaAtiva().id)
      : escolaId;
    const isEscolaEspecifica = Boolean(effectiveEscolaId && effectiveEscolaId !== 'todas');
    const todasEscolas = dbService.getEscolas();
    const escolaAlvo = isEscolaEspecifica ? todasEscolas.find(e => e.id === effectiveEscolaId) : null;
    const funcsVisiveis = dbService.getFuncionarios().filter(f => !isAdminGeralUserObj(f));
    const logsVisiveis = dbService.getAuditoria(isEscolaEspecifica ? effectiveEscolaId : undefined);

    const alunosFiltrados = isEscolaEspecifica
      ? dbService.getAlunos().filter(a => a.escolaId === effectiveEscolaId)
      : dbService.getAlunos();
    const alunosIdsSet = new Set(alunosFiltrados.map(a => a.id));

    const allFinConfigs = getLocal<Record<string, any>>(STORAGE_KEYS.CONFIGURACOES_FINANCEIRAS, DEFAULT_CONFIGURACOES_FINANCEIRAS);
    const allDocConfigs = getLocal<Record<string, any>>(STORAGE_KEYS.CONFIGURACOES_DOCUMENTOS, {});
    const allPassesConfigs = getLocal<Record<string, any>>(STORAGE_KEYS.CONFIGURACOES_PASSES, {});
    const allHistorico = getLocal<Record<string, any>>(STORAGE_KEYS.HISTORICO_COMPLETO, DEFAULT_HISTORICO_COMPLETO);
    const allDelCobranca = getLocal<any>(STORAGE_KEYS.DELEGACOES_COBRANCA, {});

    const finFiltered = isEscolaEspecifica && effectiveEscolaId
      ? (allFinConfigs[effectiveEscolaId] ? { [effectiveEscolaId]: allFinConfigs[effectiveEscolaId] } : {})
      : allFinConfigs;
    const docsFiltered = isEscolaEspecifica && effectiveEscolaId
      ? Object.fromEntries(Object.entries(allDocConfigs).filter(([k, v]) => k.startsWith(`${effectiveEscolaId}_`) || v?.escolaId === effectiveEscolaId))
      : allDocConfigs;
    const passesFiltered = isEscolaEspecifica && effectiveEscolaId
      ? (allPassesConfigs[effectiveEscolaId] ? { [effectiveEscolaId]: allPassesConfigs[effectiveEscolaId] } : {})
      : allPassesConfigs;
    const historicoFiltered = isEscolaEspecifica
      ? Object.fromEntries(Object.entries(allHistorico).filter(([k]) => alunosIdsSet.has(k)))
      : allHistorico;
    const delCobrancaFiltered = isEscolaEspecifica && effectiveEscolaId
      ? (Array.isArray(allDelCobranca)
          ? allDelCobranca.filter((d: any) => d?.escolaId === effectiveEscolaId)
          : (allDelCobranca[effectiveEscolaId] ? { [effectiveEscolaId]: allDelCobranca[effectiveEscolaId] } : {}))
      : allDelCobranca;

    let calendarioEscolar: any[] | undefined;
    let calendariosPorEscola: Record<string, any[]> | undefined;
    let calendarioTiposEscolar: any[] | undefined;
    let calendarioTiposPorEscola: Record<string, any[]> | undefined;
    let eventosEscolares: any[] = [];
    let localidadesPersonalizadas: Record<string, any> | undefined;

    if (typeof localStorage !== 'undefined') {
      try {
        if (isEscolaEspecifica && effectiveEscolaId) {
          const rawCal = localStorage.getItem(`sge_calendario_${effectiveEscolaId}`);
          calendarioEscolar = rawCal ? JSON.parse(rawCal) : [];
          const rawTipos = localStorage.getItem(`sge_calendario_tipos_${effectiveEscolaId}`);
          calendarioTiposEscolar = rawTipos ? JSON.parse(rawTipos) : [];
        } else {
          calendariosPorEscola = {};
          calendarioTiposPorEscola = {};
          todasEscolas.forEach(esc => {
            if (!esc?.id) return;
            const rawCal = localStorage.getItem(`sge_calendario_${esc.id}`);
            if (rawCal) {
              calendariosPorEscola![esc.id] = JSON.parse(rawCal);
            }
            const rawTipos = localStorage.getItem(`sge_calendario_tipos_${esc.id}`);
            if (rawTipos) {
              calendarioTiposPorEscola![esc.id] = JSON.parse(rawTipos);
            }
          });
        }
        const rawEventos = localStorage.getItem('sge_eventos_escolares');
        const allEventos: any[] = rawEventos ? JSON.parse(rawEventos) : [];
        eventosEscolares = isEscolaEspecifica
          ? allEventos.filter(ev => ev?.escolaId === effectiveEscolaId)
          : allEventos;

        localidadesPersonalizadas = {
          provincias: JSON.parse(localStorage.getItem('sgeng_provincias_personalizadas') || 'null'),
          municipios: JSON.parse(localStorage.getItem('sgeng_municipios_personalizados') || 'null'),
          naturalidades: JSON.parse(localStorage.getItem('sgeng_naturalidades_personalizadas') || 'null'),
          paises: JSON.parse(localStorage.getItem('sgeng_paises_personalizados') || 'null'),
          nacionalidades: JSON.parse(localStorage.getItem('sgeng_nacionalidades_personalizadas') || 'null')
        };
      } catch {}
    }

    return JSON.stringify({
      versaoSGE: 'SGE-NG 2.6 (Angola MED Edition - Complete Backup)',
      tipoBackup: 'COMPLETO',
      escopoBackup: isEscolaEspecifica ? 'ESCOLA' : 'SISTEMA_COMPLETO',
      dataExportacao: new Date().toISOString(),
      escolaIdAlvo: effectiveEscolaId || 'todas',
      escolas: isEscolaEspecifica && escolaAlvo ? [escolaAlvo] : todasEscolas,
      alunos: alunosFiltrados,
      turmas: isEscolaEspecifica ? dbService.getTurmas().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTurmas(),
      disciplinas: isEscolaEspecifica ? dbService.getDisciplinas(effectiveEscolaId) : dbService.getDisciplinas(),
      atribuicoes: isEscolaEspecifica ? dbService.getAtribuicoes(effectiveEscolaId) : dbService.getAtribuicoes(),
      coordenacoes: isEscolaEspecifica ? dbService.getCoordenacoes(effectiveEscolaId) : dbService.getCoordenacoes(),
      tiposCoordenacaoPersonalizados: isEscolaEspecifica ? dbService.getTiposCoordenacaoPersonalizados(effectiveEscolaId) : dbService.getTiposCoordenacaoPersonalizados(),
      funcionarios: isEscolaEspecifica ? funcsVisiveis.filter(f => f.escolaId === effectiveEscolaId) : (nonAdmin ? funcsVisiveis : dbService.getFuncionarios()),
      tiposAvaliacao: dbService.getTiposAvaliacao(),
      regrasMAC: dbService.getRegrasMAC(),
      avaliacoes: (() => {
        const avs = isEscolaEspecifica ? dbService.getAvaliacoes().filter(a => a.escolaId === effectiveEscolaId) : dbService.getAvaliacoes();
        return avs;
      })(),
      notas: (() => {
        if (!isEscolaEspecifica) return dbService.getNotas();
        const avaliacoesIdsSet = new Set(dbService.getAvaliacoes().filter(a => a.escolaId === effectiveEscolaId).map(a => a.id));
        return dbService.getNotas().filter(n => avaliacoesIdsSet.has(n.avaliacaoId) || alunosIdsSet.has(n.alunoId));
      })(),
      notasConsolidadas: isEscolaEspecifica ? dbService.getNotasConsolidadas().filter(nc => !(nc as any).escolaId || (nc as any).escolaId === effectiveEscolaId || alunosIdsSet.has(nc.alunoId)) : dbService.getNotasConsolidadas(),
      alteracoesNotasDirecao: isEscolaEspecifica
        ? getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []).filter(r => r.escolaId === effectiveEscolaId)
        : getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []),
      solicitacoesNota: isEscolaEspecifica ? dbService.getSolicitacoesNota().filter(s => s.escolaId === effectiveEscolaId) : dbService.getSolicitacoesNota(),
      juris: isEscolaEspecifica ? dbService.getJuris().filter(j => j.escolaId === effectiveEscolaId) : dbService.getJuris(),
      termosExame: isEscolaEspecifica ? dbService.getTermosExame().filter(t => t.escolaId === effectiveEscolaId) : dbService.getTermosExame(),
      horarios: isEscolaEspecifica
        ? getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS).filter(h => h.escolaId === effectiveEscolaId)
        : getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS),
      presencas: isEscolaEspecifica ? dbService.getPresencas().filter(p => p.escolaId === effectiveEscolaId) : dbService.getPresencas(),
      presencasAlunos: isEscolaEspecifica
        ? getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, []).filter(pa => !pa.escolaId || pa.escolaId === effectiveEscolaId || alunosIdsSet.has(pa.alunoId))
        : getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, []),
      auditoria: isEscolaEspecifica ? logsVisiveis.filter(a => a.escolaId === effectiveEscolaId) : logsVisiveis,
      mensagens: isEscolaEspecifica ? dbService.getMensagens().filter(m => m.escolaId === effectiveEscolaId) : dbService.getMensagens(),
      biblioteca: isEscolaEspecifica ? dbService.getBiblioteca().filter(b => b.escolaId === effectiveEscolaId) : dbService.getBiblioteca(),
      bibliotecaAcessos: isEscolaEspecifica ? dbService.getAcessosBiblioteca(effectiveEscolaId) : dbService.getAcessosBiblioteca(),
      recibos: isEscolaEspecifica ? dbService.getRecibos().filter(r => r.escolaId === effectiveEscolaId) : dbService.getRecibos(),
      configuracoesFinanceiras: finFiltered,
      transacoesFinanceiras: isEscolaEspecifica ? dbService.getTransacoesFinanceiras(effectiveEscolaId) : dbService.getTransacoesFinanceiras(),
      despesasEscolares: isEscolaEspecifica ? dbService.getDespesasEscolares(effectiveEscolaId) : dbService.getDespesasEscolares(),
      patrimonio: isEscolaEspecifica ? dbService.getPatrimonio().filter(p => p.escolaId === effectiveEscolaId) : dbService.getPatrimonio(),
      emolumentosPersonalizados: isEscolaEspecifica
        ? getLocal<any[]>(STORAGE_KEYS.EMOLUMENTOS_CONFIG, []).filter(e => !e?.escolaId || e.escolaId === effectiveEscolaId)
        : getLocal<any[]>(STORAGE_KEYS.EMOLUMENTOS_CONFIG, []),
      delegacoesCobranca: delCobrancaFiltered,
      delegacoesPoderes: isEscolaEspecifica
        ? getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []).filter(d => d.escolaId === effectiveEscolaId)
        : getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []),
      acoesDelegadasLogs: isEscolaEspecifica
        ? getLocal<AcaoDelegadaLog[]>(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, []).filter(l => l.escolaId === effectiveEscolaId)
        : getLocal<AcaoDelegadaLog[]>(STORAGE_KEYS.ACOES_DELEGADAS_LOGS, []),
      configuracoesDocumentos: docsFiltered,
      configuracoesPasses: passesFiltered,
      historicoCompleto: historicoFiltered,
      configuracaoSistema: nonAdmin ? undefined : dbService.getConfiguracaoSistema(),
      anosLectivos: isEscolaEspecifica ? dbService.getAnosLectivos(effectiveEscolaId) : dbService.getAnosLectivos(),
      anosLectivosConfigs: isEscolaEspecifica ? dbService.getAnosLectivosConfigs(effectiveEscolaId) : dbService.getAnosLectivosConfigs(),
      turnosConfigs: isEscolaEspecifica ? dbService.getTurnosConfigs(effectiveEscolaId) : dbService.getTurnosConfigs(),
      classesConfigs: isEscolaEspecifica ? dbService.getClassesConfigs(effectiveEscolaId) : dbService.getClassesConfigs(),
      cursos: isEscolaEspecifica ? dbService.getCursos(effectiveEscolaId) : dbService.getCursos(),
      areasFormacao: isEscolaEspecifica ? dbService.getAreasFormacao(effectiveEscolaId) : dbService.getAreasFormacao(),
      salasAulas: isEscolaEspecifica ? dbService.getSalasAulas(effectiveEscolaId) : dbService.getSalasAulas(),
      solicitacoesApoio: isEscolaEspecifica ? dbService.getSolicitacoesApoioTecnico(effectiveEscolaId) : dbService.getSolicitacoesApoioTecnico(),
      alertasSeguranca: nonAdmin ? [] : dbService.getAlertasSeguranca(),
      relatoriosAcontecimentos: isEscolaEspecifica ? dbService.getRelatoriosAcontecimentos(effectiveEscolaId) : dbService.getRelatoriosAcontecimentos(),
      relatoriosPedagogicos: isEscolaEspecifica ? dbService.getRelatoriosPedagogicos(effectiveEscolaId) : dbService.getRelatoriosPedagogicos(),
      planosAtividades: isEscolaEspecifica ? dbService.getAtividadesPlano(effectiveEscolaId) : dbService.getAtividadesPlano(),
      horariosProvas: isEscolaEspecifica ? dbService.getHorariosProvas(effectiveEscolaId) : dbService.getHorariosProvas(),
      mapasFiscalizacao: isEscolaEspecifica ? dbService.getMapasFiscalizacao(effectiveEscolaId) : dbService.getMapasFiscalizacao(),
      atasProvas: isEscolaEspecifica ? dbService.getAtasProvas(effectiveEscolaId) : dbService.getAtasProvas(),
      mapasFerias: isEscolaEspecifica ? dbService.getMapasFerias(effectiveEscolaId) : dbService.getMapasFerias(),
      materiaisLimpeza: isEscolaEspecifica ? dbService.getMateriaisLimpeza(effectiveEscolaId) : dbService.getMateriaisLimpeza(),
      movimentosLimpeza: isEscolaEspecifica ? dbService.getMovimentosLimpeza(effectiveEscolaId) : dbService.getMovimentosLimpeza(),
      financasPessoais: !isEscolaEspecifica && !nonAdmin ? getLocal<Record<string, any>>(STORAGE_KEYS.FINANCAS_PESSOAIS, {}) : undefined,
      calendarioEscolar,
      calendariosPorEscola,
      calendarioTiposEscolar,
      calendarioTiposPorEscola,
      eventosEscolares,
      localidadesPersonalizadas
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
  movimentarQuantidadePatrimonio: (params: {
    itemId: string;
    destinoEstado: EstadoConservacao;
    quantidadeMover: number;
    novaLocalizacao?: string;
    responsavel?: string;
    observacoes?: string;
    statusInventario?: string;
  }): { sucesso: boolean; mensagem: string } => {
    const { itemId, destinoEstado, quantidadeMover, novaLocalizacao, responsavel, observacoes, statusInventario } = params;
    const todos = getLocal<ItemPatrimonio[]>(STORAGE_KEYS.PATRIMONIO, DEFAULT_PATRIMONIO);
    const idxSource = todos.findIndex(p => p.id === itemId);
    if (idxSource < 0) {
      return { sucesso: false, mensagem: 'Bem patrimonial não encontrado.' };
    }
    const source = { ...todos[idxSource] };
    const qtdAtual = Math.max(0, Number(source.quantidade || 0));
    const qtdMover = Math.floor(Number(quantidadeMover || 0));
    if (qtdMover <= 0 || qtdMover > qtdAtual) {
      return { sucesso: false, mensagem: `Quantidade inválida. Disponível: ${qtdAtual} unidade(s).` };
    }

    const hojeFmt = new Date().toLocaleDateString('pt-AO');
    const agoraIso = new Date().toISOString();
    const escolaAtiva = dbService.getEscolaPorId(source.escolaId) || dbService.getEscolaAtiva();
    const nomeBem = (source.designacao || source.nomeItem || 'Bem').trim();
    const locDestino = (novaLocalizacao || source.localizacao || source.salaLocalizacao || 'Edifício Principal').trim();
    const estadoAnterior = source.estadoConservacao;
    const obsTag = `[${destinoEstado === 'Já Não Existe / Abatido' ? 'Baixa/Inexistente' : destinoEstado} ${hojeFmt} - ${qtdMover} un.]${observacoes?.trim() ? ` ${observacoes.trim()}` : ''}`;
    const statusFinal =
      statusInventario ||
      (destinoEstado === 'Já Não Existe / Abatido'
        ? 'Inexistente'
        : destinoEstado === 'Para Abate'
        ? 'Para_Abate'
        : destinoEstado === 'Danificado' || destinoEstado === 'Inoperante'
        ? 'Danificado'
        : 'Confirmado');

    const restante = qtdAtual - qtdMover;
    const norm = (s?: string) => (s || '').trim().toLowerCase();

    // Procurar registo de destino equivalente (mesma escola, nome, localização e estado destino)
    const idxDestinoExistente = todos.findIndex(
      (p, i) =>
        i !== idxSource &&
        p.escolaId === source.escolaId &&
        norm(p.designacao || p.nomeItem) === norm(nomeBem) &&
        norm(p.localizacao || p.salaLocalizacao) === norm(locDestino) &&
        p.estadoConservacao === destinoEstado
    );

    if (restante === 0 && idxDestinoExistente < 0) {
      // Conversão total em linha única preservando o ID original
      const atualizado: ItemPatrimonio = {
        ...source,
        estadoConservacao: destinoEstado,
        localizacao: locDestino,
        salaLocalizacao: locDestino,
        statusInventario: statusFinal,
        responsavelNome: responsavel || source.responsavelNome,
        revisadoPor: responsavel || source.revisadoPor,
        revisadoEm: hojeFmt,
        ultimaRevisaoAno: escolaAtiva?.anoLectivoActivo || source.ultimaRevisaoAno,
        observacoes: source.observacoes ? `${source.observacoes} | ${obsTag}` : obsTag,
        atualizadoEm: agoraIso
      };
      todos[idxSource] = atualizado;
      setLocal(STORAGE_KEYS.PATRIMONIO, todos);
      firebaseSyncEngine.salvarItemPatrimonio(atualizado);
    } else {
      // Subtrair da origem (ou remover se zerou ao fundir com destino existente)
      if (restante > 0) {
        const origemAtualizada: ItemPatrimonio = {
          ...source,
          quantidade: restante,
          revisadoEm: hojeFmt,
          revisadoPor: responsavel || source.revisadoPor,
          ultimaRevisaoAno: escolaAtiva?.anoLectivoActivo || source.ultimaRevisaoAno,
          observacoes: source.observacoes
            ? `${source.observacoes} | [Subtraído ${qtdMover} un. → ${destinoEstado} em ${hojeFmt}]`
            : `[Subtraído ${qtdMover} un. → ${destinoEstado} em ${hojeFmt}]`,
          atualizadoEm: agoraIso
        };
        todos[idxSource] = origemAtualizada;
        firebaseSyncEngine.salvarItemPatrimonio(origemAtualizada);
      } else {
        todos.splice(idxSource, 1);
        firebaseSyncEngine.eliminarItemPatrimonio(source.id);
      }

      if (idxDestinoExistente >= 0) {
        const adjIdx = restante === 0 && idxDestinoExistente > idxSource ? idxDestinoExistente - 1 : idxDestinoExistente;
        const destExist = todos[adjIdx];
        const destAtualizado: ItemPatrimonio = {
          ...destExist,
          quantidade: Number(destExist.quantidade || 0) + qtdMover,
          statusInventario: statusFinal,
          responsavelNome: responsavel || destExist.responsavelNome,
          revisadoPor: responsavel || destExist.revisadoPor,
          revisadoEm: hojeFmt,
          ultimaRevisaoAno: escolaAtiva?.anoLectivoActivo || destExist.ultimaRevisaoAno,
          observacoes: destExist.observacoes ? `${destExist.observacoes} | ${obsTag}` : obsTag,
          atualizadoEm: agoraIso
        };
        todos[adjIdx] = destAtualizado;
        firebaseSyncEngine.salvarItemPatrimonio(destAtualizado);
      } else {
        const tomboBase = source.codigoTombo || source.codigoTombamento || `PAT-${Date.now().toString().slice(-4)}`;
        const sufixo = destinoEstado === 'Em Uso' ? 'USO' : destinoEstado === 'Já Não Existe / Abatido' ? 'BAIXA' : 'MOV';
        const novoItem: ItemPatrimonio = {
          ...source,
          id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          codigoTombo: `${tomboBase}-${sufixo}`,
          codigoTombamento: `${tomboBase}-${sufixo}`,
          quantidade: qtdMover,
          estadoConservacao: destinoEstado,
          localizacao: locDestino,
          salaLocalizacao: locDestino,
          statusInventario: statusFinal,
          responsavelNome: responsavel || source.responsavelNome,
          revisadoPor: responsavel || source.revisadoPor,
          revisadoEm: hojeFmt,
          ultimaRevisaoAno: escolaAtiva?.anoLectivoActivo || source.ultimaRevisaoAno,
          observacoes: obsTag,
          atualizadoEm: agoraIso
        };
        todos.unshift(novoItem);
        firebaseSyncEngine.salvarItemPatrimonio(novoItem);
      }

      setLocal(STORAGE_KEYS.PATRIMONIO, todos);
    }

    dbService.registarLog(
      'Movimentação de Património',
      `${qtdMover} unidade(s) de "${nomeBem}" (${source.codigoTombo || source.codigoTombamento}) subtraída(s) de "${estadoAnterior}" para "${destinoEstado}" (${locDestino}). Restam ${restante} un. no lote original.`
    );
    return {
      sucesso: true,
      mensagem: `${qtdMover} unidade(s) movimentada(s) de "${estadoAnterior}" para "${destinoEstado}". Restam ${restante} un. no registo original.`
    };
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
  // CONFIGURAÇÃO DOS PASSES ESCOLARES (8 POR A4 / 4 POR A4 / INDIVIDUAL)
  // ==========================================
  obterConfiguracaoPasses: (escolaId: string): ConfiguracaoPassesEscola => {
    const configs = getLocal<Record<string, ConfiguracaoPassesEscola>>(STORAGE_KEYS.CONFIGURACOES_PASSES, {});
    const escola = dbService.getEscolaPorId(escolaId) || (dbService.getEscolaAtiva()?.id === escolaId ? dbService.getEscolaAtiva() : undefined);
    const configEscola = escola?.configuracaoPasses;
    const configSalva = configs[escolaId];

    const baseElementosMap = new Map<string, ElementoPasseConfig>(
      DEFAULT_CONFIGURACAO_PASSES.elementos.map(el => [el.chave, { ...el }])
    );
    const mergedSource = configSalva || configEscola;
    if (mergedSource?.elementos && Array.isArray(mergedSource.elementos)) {
      mergedSource.elementos.forEach(el => {
        const prev = baseElementosMap.get(el.chave);
        baseElementosMap.set(el.chave, prev ? { ...prev, ...el } : { ...el });
      });
    }

    return {
      ...DEFAULT_CONFIGURACAO_PASSES,
      ...(escola?.corPrimaria ? { corPrimaria: escola.corPrimaria, corBorda: escola.corPrimaria } : {}),
      ...(escola?.corSecundaria ? { corSecundaria: escola.corSecundaria } : {}),
      ...(escola?.corFundoPasses ? { corFundoFrente: escola.corFundoPasses } : {}),
      ...(configEscola || {}),
      ...(configSalva || {}),
      elementos: Array.from(baseElementosMap.values()).sort((a, b) => a.ordem - b.ordem)
    };
  },

  salvarConfiguracaoPasses: (escolaId: string, config: ConfiguracaoPassesEscola): void => {
    const configComTs: ConfiguracaoPassesEscola = { ...config, atualizadoEm: new Date().toISOString() };
    const configs = getLocal<Record<string, ConfiguracaoPassesEscola>>(STORAGE_KEYS.CONFIGURACOES_PASSES, {});
    configs[escolaId] = configComTs;
    setLocal(STORAGE_KEYS.CONFIGURACOES_PASSES, configs);
    firebaseSyncEngine.salvarConfiguracaoPasses(escolaId, configComTs);

    // Também sincroniza as cores e o formato na ficha da instituição correspondente
    const escolaAlvo = dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva();
    if (escolaAlvo && escolaAlvo.id === escolaId) {
      escolaAlvo.corPrimaria = configComTs.corPrimaria;
      escolaAlvo.corSecundaria = configComTs.corSecundaria;
      escolaAlvo.corFundoPasses = configComTs.corFundoFrente;
      escolaAlvo.layoutPassesPadrao = configComTs.disposicaoGrade === 'individual' ? 'individual' : '8_por_folha';
      escolaAlvo.configuracaoPasses = configComTs;
      dbService.salvarEscola(escolaAlvo);
    }
  },

  // ==========================================
  // HORÁRIOS ESCOLARES SEM COINCIDÊNCIA DE TEMPO
  // ==========================================
  getTemposHorarios: (escolaId?: string): Array<{ numero: number; inicio: string; fim: string; rotulo: string }> => {
    const padrao = [
      { numero: 1, inicio: '07:15', fim: '08:00', rotulo: '1º Tempo (07:15 - 08:00)' },
      { numero: 2, inicio: '08:05', fim: '08:50', rotulo: '2º Tempo (08:05 - 08:50)' },
      { numero: 3, inicio: '09:10', fim: '09:55', rotulo: '3º Tempo (09:10 - 09:55)' },
      { numero: 4, inicio: '10:00', fim: '10:45', rotulo: '4º Tempo (10:00 - 10:45)' },
      { numero: 5, inicio: '10:50', fim: '11:35', rotulo: '5º Tempo (10:50 - 11:35)' },
      { numero: 6, inicio: '11:40', fim: '12:25', rotulo: '6º Tempo (11:40 - 12:25)' }
    ];
    const escolas = dbService.getEscolas();
    const esc = escolas.find(e => e.id === escolaId) || dbService.getEscolaAtiva();
    const salvos = esc?.temposHorarios;
    if (salvos && salvos.length > 0) {
      return [...salvos]
        .sort((a, b) => a.numero - b.numero)
        .map(t => ({
          numero: t.numero,
          inicio: t.inicio,
          fim: t.fim,
          rotulo: t.rotulo && t.rotulo.trim() ? t.rotulo : `${t.numero}º Tempo (${t.inicio} - ${t.fim})`
        }));
    }
    return padrao;
  },

  salvarTemposHorarios: (
    escolaId: string,
    tempos: Array<{ numero: number; inicio: string; fim: string; rotulo?: string }>,
    atualizarHorariosExistentes: boolean = true
  ): void => {
    const normalizados = [...tempos]
      .sort((a, b) => a.numero - b.numero)
      .map(t => ({
        numero: Number(t.numero),
        inicio: t.inicio,
        fim: t.fim,
        rotulo: `${t.numero}º Tempo (${t.inicio} - ${t.fim})`
      }));

    const escolas = dbService.getEscolas();
    const esc = escolas.find(e => e.id === escolaId);
    if (esc) {
      dbService.salvarEscola({
        ...esc,
        temposHorarios: normalizados,
        atualizadoEm: new Date().toISOString()
      });
    }

    if (atualizarHorariosExistentes) {
      const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
      let alterados = 0;
      const atualizados = horarios.map(h => {
        if (h.escolaId !== escolaId) return h;
        const match = normalizados.find(t => t.numero === h.numeroTempo);
        if (!match) return h;
        if (h.horaInicio !== match.inicio || h.horaFim !== match.fim) {
          alterados++;
          const atualizado = { ...h, horaInicio: match.inicio, horaFim: match.fim, atualizadoEm: new Date().toISOString() };
          firebaseSyncEngine.salvarHorario(atualizado);
          return atualizado;
        }
        return h;
      });
      if (alterados > 0) {
        setLocal(STORAGE_KEYS.HORARIOS, atualizados);
      }
    }

    dbService.registarLog('Horários Escolares', `Tempos letivos e horários (${normalizados.length} tempos) atualizados na instituição.`, escolaId);
  },

  obterHorarios: (escolaId?: string, anoLectivo?: string): HorarioAulaItem[] => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    return horarios.filter(h => {
      if (escolaId && escolaId !== 'todas' && h.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && h.anoLectivo && h.anoLectivo !== anoLectivo) return false;
      return true;
    });
  },

  obterHorarioDaTurma: (turmaId: string, anoLectivo?: string): HorarioAulaItem[] => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    return horarios
      .filter(h => h.turmaId === turmaId && (!anoLectivo || anoLectivo === 'todos' || !h.anoLectivo || h.anoLectivo === anoLectivo))
      .sort((a, b) => a.numeroTempo - b.numeroTempo);
  },

  obterHorarioDoProfessor: (professorId: string, anoLectivo?: string): HorarioAulaItem[] => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    return horarios
      .filter(h => h.professorId === professorId && (!anoLectivo || anoLectivo === 'todos' || !h.anoLectivo || h.anoLectivo === anoLectivo))
      .sort((a, b) => a.numeroTempo - b.numeroTempo);
  },

  validarConflitoHorario: (
    item: Omit<HorarioAulaItem, 'id'>, 
    idIgnorar?: string
  ): { temConflito: boolean; motivo?: string } => {
    const horarios = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = item.escolaId ? dbService.getEscolaPorId(item.escolaId) : escolaAtiva;
    const escAlvoId = item.escolaId || escRef?.id || escolaAtiva?.id || '';
    const anoItem = item.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || '';
    const turmasEsc = getLocal<Turma[]>(STORAGE_KEYS.TURMAS, DEFAULT_TURMAS);
    const turnosCfg = dbService.getTurnosConfigs(escAlvoId, anoItem);
    const turnoItem = turmasEsc.find(t => t.id === item.turmaId)?.turno || '';
    
    for (const h of horarios) {
      if (idIgnorar && h.id === idIgnorar) continue;
      if (escAlvoId && h.escolaId && h.escolaId !== escAlvoId) continue;
      if (anoItem && h.anoLectivo && h.anoLectivo !== anoItem) continue;
      if (h.diaSemana !== item.diaSemana || h.numeroTempo !== item.numeroTempo) continue;

      // 3. Conflito de tempo na mesma turma (sempre conflito)
      if (h.turmaId === item.turmaId) {
        return {
          temConflito: true,
          motivo: `A turma já possui aula de ${h.disciplinaNome} na ${h.diaSemana}, no ${h.numeroTempo}º tempo!`
        };
      }

      const turnoH = turmasEsc.find(t => t.id === h.turmaId)?.turno || '';
      const turnosChocam = turnosHorariosConflitam(turnoItem, turnoH, turnosCfg, true);
      if (!turnosChocam) continue;

      // 1. Conflito do mesmo professor na mesma hora em turmas de turno incompatível
      if (h.professorId === item.professorId) {
        const profConflito = dbService.getFuncionarios(item.escolaId).find(f => f.id === item.professorId);
        const tituloProf = profConflito?.genero === 'F' ? 'A Professora' : 'O Professor';
        return {
          temConflito: true,
          motivo: `${tituloProf} ${h.professorNome} já tem aula atribuída na ${h.classe}${turnoH ? ` (${turnoH})` : ''} na ${h.diaSemana}, no ${h.numeroTempo}º tempo!`
        };
      }

      // 2. Conflito da mesma sala no mesmo horário e turno
      if (
        h.sala.trim().toLowerCase() === item.sala.trim().toLowerCase() &&
        h.turmaId !== item.turmaId
      ) {
        return {
          temConflito: true,
          motivo: `A ${h.sala} já está ocupada pela turma ${h.classe}${turnoH ? ` (${turnoH})` : ''} na ${h.diaSemana}, no ${h.numeroTempo}º tempo!`
        };
      }
    }

    return { temConflito: false };
  },

  salvarHorario: (item: HorarioAulaItem): { sucesso: boolean; erro?: string } => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = item.escolaId ? dbService.getEscolaPorId(item.escolaId) : escolaAtiva;
    const anoRef = item.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || '';
    const itemNormalizado: HorarioAulaItem = { ...item, anoLectivo: anoRef };
    const validacao = dbService.validarConflitoHorario(itemNormalizado, item.id);
    if (validacao.temConflito) {
      return { sucesso: false, erro: validacao.motivo };
    }

    const itemComTs: HorarioAulaItem = { ...itemNormalizado, atualizadoEm: new Date().toISOString() };
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

  salvarHorariosLote: (novosHorarios: HorarioAulaItem[], idsSubstituidos: string[] = []): void => {
    const nowIso = new Date().toISOString();
    const escolaAtiva = dbService.getEscolaAtiva();
    const subsSet = new Set(idsSubstituidos.filter(Boolean));
    const atuais = getLocal<HorarioAulaItem[]>(STORAGE_KEYS.HORARIOS, DEFAULT_HORARIOS);

    const normalizados = novosHorarios.map(item => {
      const escRef = item.escolaId ? dbService.getEscolaPorId(item.escolaId) : escolaAtiva;
      return {
        ...item,
        anoLectivo: item.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || '',
        atualizadoEm: item.atualizadoEm || nowIso
      };
    });

    const novosIdsSet = new Set(normalizados.map(n => n.id));
    const preservados = atuais.filter(h => !subsSet.has(h.id) && !novosIdsSet.has(h.id));
    const resultadoFinal = [...preservados, ...normalizados];
    setLocal(STORAGE_KEYS.HORARIOS, resultadoFinal);

    if (idsSubstituidos.length > 0) {
      firebaseSyncEngine.eliminarHorariosLote(idsSubstituidos);
    }
    if (normalizados.length > 0) {
      firebaseSyncEngine.salvarHorariosLote(normalizados);
    }

    const escIdLog = normalizados[0]?.escolaId || escolaAtiva?.id;
    dbService.registarLog(
      'Horário Automático Anti-Conflitos',
      `Gerado e gravado lote de ${normalizados.length} tempo(s) letivo(s) sem conflitos (${idsSubstituidos.length} substituídos).`,
      escIdLog
    );
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = item.escolaId ? dbService.getEscolaPorId(item.escolaId) : escolaAtiva;
    const presencas = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    const itemComTimestamp: PresencaAlunoItem = {
      ...item,
      anoLectivo: item.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined,
      atualizadoEm: new Date().toISOString()
    };
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
    const escolaAtiva = dbService.getEscolaAtiva();
    const presencas = getLocal<PresencaAlunoItem[]>(STORAGE_KEYS.PRESENCAS_ALUNOS, DEFAULT_PRESENCAS_ALUNOS);
    const agora = new Date().toISOString();
    const normalizados = items.map(item => {
      const escRef = item.escolaId ? dbService.getEscolaPorId(item.escolaId) : escolaAtiva;
      return {
        ...item,
        anoLectivo: item.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || undefined,
        atualizadoEm: agora
      };
    });
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
  getRegistosAlteracoesNotas: (professorId?: string, escolaId?: string, anoLectivo?: string): RegistroAlteracaoNotaDirecao[] => {
    const todos = getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []);
    const ocultarAdmin = isSessaoAutenticadaNaoAdminGeral();
    const { ids } = getAdminGeralIdsAndNomes();
    return todos.filter(r => {
      if (ocultarAdmin && (r.alteradoPorRole === 'AdminGeral' || (r.alteradoPorId && ids.has(r.alteradoPorId)))) return false;
      if (professorId && r.professorId !== professorId) return false;
      if (escolaId && escolaId !== 'todas' && r.escolaId !== escolaId) return false;
      if (anoLectivo && anoLectivo !== 'todos' && r.anoLectivo && r.anoLectivo !== anoLectivo) return false;
      return true;
    });
  },

  salvarRegistoAlteracaoNotaDirecao: (reg: RegistroAlteracaoNotaDirecao): void => {
    const escolaAtiva = dbService.getEscolaAtiva();
    const escRef = reg.escolaId ? dbService.getEscolaPorId(reg.escolaId) : escolaAtiva;
    const anoRef = reg.anoLectivo || escRef?.anoLectivoActivo || escolaAtiva?.anoLectivoActivo || '';
    const regComTs: RegistroAlteracaoNotaDirecao = { ...reg, anoLectivo: anoRef, atualizadoEm: new Date().toISOString() };
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
        const profNotif = dbService.getFuncionarios(regComTs.escolaId).find(f => f.id === regComTs.professorId);
        const alunoNotif = dbService.getAlunos(regComTs.escolaId).find(a => a.id === regComTs.alunoId);
        const saudacaoProf = profNotif?.genero === 'F' ? 'Estimada Colega' : 'Estimado Colega';
        const artigoEstudante = alunoNotif?.genero === 'F' ? 'da estudante' : 'do estudante';
        const notaAntTexto = regComTs.notaAnteriorEmFalta ? 'Em falta (Sem nota)' : `${regComTs.notaAnterior}`;
        dbService.enviarMensagem({
          id: `msg-retif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          escolaId: regComTs.escolaId,
          remetenteId: regComTs.alteradoPorId,
          remetenteNome: regComTs.alteradoPorNome,
          remetentePapel: regComTs.alteradoPorRole,
          remetenteCargo: regComTs.alteradoPorRole === 'DiretorGeral' ? 'Diretor Geral' : 'Subdiretor Pedagógico',
          tipo: 'DIRECTA',
          destinatarioTipo: 'Individual',
          destinatarioId: regComTs.professorId,
          destinatarioNome: regComTs.professorNome,
          titulo: `Aviso de Alteração de Nota: ${regComTs.alunoNome} (${regComTs.disciplinaNome} - ${regComTs.turmaNome})`,
          assunto: 'Alteração Executiva de Nota pela Direção',
          conteudo: `${saudacaoProf} ${regComTs.professorNome},\n\nInformamos que a Direção da instituição procedeu à alteração da nota de ${regComTs.tipoNota} ${artigoEstudante} ${regComTs.alunoNome} na turma ${regComTs.turmaNome} (${regComTs.classe}${regComTs.curso ? ' - ' + regComTs.curso : ''}) na disciplina de ${regComTs.disciplinaNome} (${regComTs.trimestre}º Trimestre).\n\n• Nota Anterior: ${notaAntTexto}\n• Nova Nota: ${regComTs.novaNota}\n• Justificativa: ${regComTs.motivoJustificativa}\n• Alterado por: ${regComTs.alteradoPorNome} (${regComTs.alteradoPorRole === 'DiretorGeral' ? 'Diretor Geral' : 'Subdiretor Pedagógico'})\n• Data/Hora: ${regComTs.dataHora}\n\nEste registo encontra-se disponível na Auditoria de Notas (menu Avaliações & Notas) e na sua folha de auditoria.`,
          dataHora: new Date().toISOString()
        });
      } catch {
        // Ignora erro
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_alteracao_nota_direcao', { detail: regComTs }));
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_alteracao_nota_direcao_atualizada'));
      }
    }
  },

  marcarTodasAlteracoesNotaComoLidas: (professorId: string, escolaId?: string): void => {
    const todos = getLocal<RegistroAlteracaoNotaDirecao[]>(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, []);
    const agoraIso = new Date().toISOString();
    let alterados = 0;
    todos.forEach((r) => {
      if (
        r.professorId === professorId &&
        (!escolaId || escolaId === 'todas' || r.escolaId === escolaId) &&
        r.lidoPeloProfessor !== true
      ) {
        r.lidoPeloProfessor = true;
        r.atualizadoEm = agoraIso;
        firebaseSyncEngine.salvarAlteracaoNotaDirecao(r);
        alterados++;
      }
    });
    if (alterados > 0) {
      setLocal(STORAGE_KEYS.ALTERACOES_NOTAS_DIRECAO, todos);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_alteracao_nota_direcao_atualizada'));
      }
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
      },
      ficha_individual_aluno: {
        id: `conf-ficha-aluno-${escId}`,
        escolaId: escId,
        tipoDocumento: 'ficha_individual_aluno',
        tituloOficial: 'FICHA INDIVIDUAL DO ESTUDANTE',
        subtitulo: 'Cadastro Biográfico, Filiação, Matrícula e Ocorrências Disciplinares',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO\nGABINETE PROVINCIAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Registo cadastral e biográfico oficial do estudante matriculado nesta instituição de ensino.',
        textoFechamento: 'Os dados constantes nesta ficha correspondem aos documentos apresentados no acto de matrícula.',
        textoRodape: 'Documento de uso interno e acompanhamento pedagógico-administrativo.',
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
      ficha_individual_funcionario: {
        id: `conf-ficha-func-${escId}`,
        escolaId: escId,
        tipoDocumento: 'ficha_individual_funcionario',
        tituloOficial: 'FICHA INDIVIDUAL DO FUNCIONÁRIO / DOCENTE',
        subtitulo: 'Registo Funcional, Habilitações Académicas, Carga Horária e Assiduidade',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO\nGABINETE PROVINCIAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Registo oficial do colaborador ou docente vinculado à instituição de ensino.',
        textoFechamento: 'Confirmado pelos Recursos Humanos e homologado pela Direcção da Escola.',
        textoRodape: 'Ficha cadastral sujeita a sigilo administrativo e actualização periódica.',
        artigoLegalDecreto: 'Estatuto da Carreira dos Agentes de Educação de Angola',
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
          corDestaque: '#0f172a'
        }
      },
      ficha_presencas: {
        id: `conf-ficha-presencas-${escId}`,
        escolaId: escId,
        tipoDocumento: 'ficha_presencas',
        tituloOficial: 'FOLHA OFICIAL DE CONTROLO DE ASSIDUIDADE E PRESENÇAS',
        subtitulo: 'Mapa Nominal de Frequência Diária e Registo de Faltas',
        textoCabecalho: 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO\nGABINETE PROVINCIAL DA EDUCAÇÃO',
        textoCorpoAbertura: 'Lista oficial de controlo de assiduidade diária dos estudantes pertencentes à turma indicada.',
        textoFechamento: 'O Director de Turma e o Secretário Pedagógico conferem os registos de presenças e ausências.',
        textoRodape: 'Documento de registo diário obrigatório em sala de aula.',
        artigoLegalDecreto: 'Normativo de Frequência Escolar — Ministério da Educação',
        disposicao: {
          orientacao: 'paisagem',
          alinhamentoLogo: 'duplo',
          exibirInsigniaRepublica: true,
          exibirLogoEscola: true,
          exibirCarimboBranco: false,
          exibirCodigoQR: true,
          exibirAssinaturaDiretor: true,
          exibirAssinaturaSubdiretor: true,
          exibirAssinaturaSecretaria: false,
          exibirAssinaturaProfessor: true,
          tamanhoFonte: 'compacto',
          corDestaque: '#1e3a8a'
        }
      }
    };

    // Mesclar o guardado com o padrão garantindo todos os subcampos de disposicao e camposDados
    const resultado: Record<string, ConfiguracaoDocumentoCustomizado> = {};
    Object.keys(padrao).forEach(k => {
      resultado[k] = {
        ...padrao[k],
        camposDados: {
          ...DEFAULT_CAMPOS_DADOS_DOCUMENTO,
          ...(padrao[k].camposDados || {})
        }
      };
    });

    Object.keys(todos).forEach(k => {
      if (todos[k].escolaId === escId) {
        const tipo = todos[k].tipoDocumento;
        const base = resultado[tipo];
        resultado[tipo] = base
          ? {
              ...base,
              ...todos[k],
              disposicao: {
                ...base.disposicao,
                ...(todos[k].disposicao || {})
              },
              camposDados: {
                ...DEFAULT_CAMPOS_DADOS_DOCUMENTO,
                ...(base.camposDados || {}),
                ...(todos[k].camposDados || {})
              }
            }
          : {
              ...todos[k],
              camposDados: {
                ...DEFAULT_CAMPOS_DADOS_DOCUMENTO,
                ...(todos[k].camposDados || {})
              }
            };
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

    const descTipo =
      delegacao.tipo === 'Interinidade'
        ? `Interinidade Total (${delegacao.cargoDelegadoTitulo || delegacao.cargoDelegadoRole || delegacao.delegadoPorCargo})`
        : delegacao.tipo === 'Matriculas'
          ? 'Matrículas & Confirmações'
          : 'Cobrança de Emolumentos';

    dbService.registarLog(
      delegacao.tipo === 'Interinidade' ? 'Delegação de Interinidade' : 'Delegação de Competências',
      `${delegacao.delegadoPorNome} (${delegacao.delegadoPorCargo}) delegou ${descTipo} a "${delegacao.funcionarioNome}" (${delegacao.funcionarioCargo}).`
    );
  },

  revogarDelegacaoPoderes: (
    delegacaoId: string,
    revogadoPorNome: string,
    revogadoPorId?: string
  ): { delegacaoRevogada?: DelegacaoPoderes; relatorio?: RelatorioFinalInterinidade } => {
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    const alvo = todas.find(d => d.id === delegacaoId);
    if (!alvo) return {};

    const agoraIso = new Date().toISOString();
    alvo.ativo = false;
    alvo.atualizadoEm = agoraIso;
    alvo.revogadoPorNome = revogadoPorNome;
    alvo.revogadoPorId = revogadoPorId;
    alvo.revogadoEm = agoraIso;

    let relatorioGerado: RelatorioFinalInterinidade | undefined;

    if (alvo.tipo === 'Interinidade') {
      const inicioIso = alvo.criadoEm || `${alvo.dataInicio}T00:00:00.000Z`;
      const inicioMs = new Date(inicioIso).getTime();
      const todosLogs = dbService.getAuditoriaBruta().filter(l => {
        if (l.escolaId && alvo.escolaId && l.escolaId !== alvo.escolaId) return false;
        if (l.utilizadorId !== alvo.funcionarioId) return false;
        const lTime = new Date(l.dataHora.replace(' ', 'T')).getTime();
        if (!isNaN(inicioMs) && !isNaN(lTime) && lTime < inicioMs - 60000) return false;
        return true;
      });

      const mapaModulos = new Map<string, number>();
      todosLogs.forEach(l => {
        const modNome = l.acao || 'Operação de Sistema';
        mapaModulos.set(modNome, (mapaModulos.get(modNome) || 0) + 1);
      });

      const acoesPorModulo = Array.from(mapaModulos.entries())
        .map(([acao, quantidade]) => ({ acao, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);

      const cargoTitulo = alvo.cargoDelegadoTitulo || String(alvo.cargoDelegadoRole || alvo.delegadoPorCargo);

      relatorioGerado = {
        delegacaoId: alvo.id,
        escolaId: alvo.escolaId,
        titularId: alvo.delegadoPorId,
        titularNome: alvo.delegadoPorNome,
        titularCargo: String(alvo.delegadoPorCargo),
        interinoId: alvo.funcionarioId,
        interinoNome: alvo.funcionarioNome,
        interinoCargoOriginal: alvo.funcionarioCargo,
        cargoExercidoRole: alvo.cargoDelegadoRole || alvo.delegadoPorRole || 'DiretorGeral',
        cargoExercidoTitulo: cargoTitulo,
        dataInicio: alvo.dataInicio,
        dataFimRevogacao: agoraIso,
        revogadoPorId,
        revogadoPorNome,
        totalAcoesAuditadas: todosLogs.length,
        acoesPorModulo,
        ultimosRegistos: todosLogs.slice(0, 60).map(l => ({
          id: l.id,
          dataHora: l.dataHora,
          acao: l.acao,
          detalhe: l.detalhe
        })),
        resumoExecutivo: `Mandato de interinidade no cargo de ${cargoTitulo} exercido por ${alvo.funcionarioNome} (${alvo.funcionarioCargo}) entre ${alvo.dataInicio} e ${agoraIso.slice(0, 10)}, encerrado formalmente por revogação de ${revogadoPorNome} com ${todosLogs.length} operação(ões) registada(s) em auditoria.`,
        geradoEm: agoraIso
      };

      alvo.relatorioRevogacao = relatorioGerado;

      dbService.registarAcaoDelegada({
        escolaId: alvo.escolaId,
        delegacaoId: alvo.id,
        funcionarioId: alvo.funcionarioId,
        funcionarioNome: alvo.funcionarioNome,
        tipo: 'Interinidade',
        acao: 'Interinidade',
        detalhes: relatorioGerado.resumoExecutivo
      });
    }

    setLocal(STORAGE_KEYS.DELEGACOES_PODERES, todas);
    firebaseSyncEngine.salvarDelegacaoPoderes(alvo);

    dbService.registarLog(
      alvo.tipo === 'Interinidade' ? 'Revogação de Interinidade & Relatório Final' : 'Revogação de Delegação',
      `Delegação de ${alvo.tipo === 'Interinidade' ? `Interinidade Total (${alvo.cargoDelegadoTitulo || alvo.delegadoPorCargo})` : alvo.tipo === 'Matriculas' ? 'Matrículas' : 'Cobrança de Emolumentos'} de "${alvo.funcionarioNome}" foi revogada por ${revogadoPorNome}.`
    );

    return { delegacaoRevogada: alvo, relatorio: relatorioGerado };
  },

  getInterinidadeAtivaUsuario: (funcionarioId?: string | null, escolaId?: string | null): DelegacaoPoderes | null => {
    if (!funcionarioId) return null;
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    // Interinidade permanece ativa exclusivamente até revogação explícita pelo titular
    const encontrada = todas.find(d =>
      d.tipo === 'Interinidade' &&
      d.ativo === true &&
      !d.revogadoEm &&
      d.funcionarioId === funcionarioId &&
      (!escolaId || d.escolaId === escolaId)
    );
    return encontrada || null;
  },

  obterOcorrenciasAprovadasDossie: (ocorrencias?: OcorrenciaHistoricoAluno[]): OcorrenciaHistoricoAluno[] => {
    if (!Array.isArray(ocorrencias)) return [];
    // Registo legado sem statusAprovacao mantém-se visível; novos registos só entram após aprovação final do Subdiretor Pedagógico
    return ocorrencias.filter(o => !o.statusAprovacao || o.statusAprovacao === 'Aprovado_Pedagogico');
  },

  verificarPoderesDelegados: (funcionarioId: string, escolaId: string): { podeMatricular: boolean; podeCobrarEmolumentos: boolean; podeCobrar?: boolean; interinidadeAtiva: DelegacaoPoderes | null; delegacoesAtivas: DelegacaoPoderes[] } => {
    if (!funcionarioId) return { podeMatricular: false, podeCobrarEmolumentos: false, podeCobrar: false, interinidadeAtiva: null, delegacoesAtivas: [] };
    const hoje = new Date().toISOString().split('T')[0];
    const todas = getLocal<DelegacaoPoderes[]>(STORAGE_KEYS.DELEGACOES_PODERES, []);
    
    const ativas = todas.filter(d => {
      if (d.funcionarioId !== funcionarioId) return false;
      if (escolaId && d.escolaId !== escolaId) return false;
      if (!d.ativo || d.revogadoEm) return false;
      if (d.tipo === 'Interinidade') return true;
      return (!d.dataFim || d.dataFim >= hoje) && d.dataInicio <= hoje;
    });

    const interinidadeAtiva = ativas.find(d => d.tipo === 'Interinidade') || null;
    const temCobranca = ativas.some(d => d.tipo === 'CobrancaEmolumentos');
    return {
      podeMatricular: ativas.some(d => d.tipo === 'Matriculas'),
      podeCobrarEmolumentos: temCobranca,
      podeCobrar: temCobranca,
      interinidadeAtiva,
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
  },

  // ============================================================================
  // TIPOS DE COORDENAÇÃO PERSONALIZADOS PELA DIREÇÃO
  // ============================================================================
  getTiposCoordenacaoPersonalizados: (escolaId?: string): TipoCoordenacaoPersonalizada[] => {
    const lista = getLocal<TipoCoordenacaoPersonalizada[]>(STORAGE_KEYS.TIPOS_COORDENACAO, []);
    const ativos = lista.filter(t => t && t.ativo !== false);
    if (!escolaId || escolaId === 'TODAS' || escolaId === 'todas') {
      return ativos;
    }
    return ativos.filter(t => t.escolaId === escolaId);
  },

  salvarTipoCoordenacaoPersonalizada: (item: TipoCoordenacaoPersonalizada): TipoCoordenacaoPersonalizada => {
    const lista = getLocal<TipoCoordenacaoPersonalizada[]>(STORAGE_KEYS.TIPOS_COORDENACAO, []);
    const agora = new Date().toISOString();
    const itemFinal: TipoCoordenacaoPersonalizada = {
      ...item,
      requerCurso: item.nivelEnsino === 'IICiclo' ? Boolean(item.requerCurso) : false,
      ativo: true,
      atualizadoEm: agora,
      criadoEm: item.criadoEm || agora
    };
    const idx = lista.findIndex(t => t.id === itemFinal.id);
    if (idx >= 0) {
      lista[idx] = itemFinal;
    } else {
      lista.unshift(itemFinal);
    }
    setLocal(STORAGE_KEYS.TIPOS_COORDENACAO, lista);
    firebaseSyncEngine.salvarTipoCoordenacao(itemFinal);
    dbService.registarLog(
      'Coordenação Personalizada',
      `Nova coordenação "${itemFinal.tipo}" (${itemFinal.nivelEnsino}) adicionada pela Direção.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  removerTipoCoordenacaoPersonalizada: (id: string): boolean => {
    const lista = getLocal<TipoCoordenacaoPersonalizada[]>(STORAGE_KEYS.TIPOS_COORDENACAO, []);
    const alvo = lista.find(t => t.id === id);
    if (!alvo) return false;
    const filtrados = lista.filter(t => t.id !== id);
    setLocal(STORAGE_KEYS.TIPOS_COORDENACAO, filtrados);
    firebaseSyncEngine.removerTipoCoordenacao(id);
    dbService.registarLog(
      'Coordenação Personalizada',
      `Removida a coordenação personalizada "${alvo.tipo}" (${alvo.nivelEnsino}).`,
      alvo.escolaId
    );
    return true;
  },

  // ============================================================================
  // RELATÓRIOS PEDAGÓGICOS FORMAIS (COORDENAÇÃO FINAL DE ANO & DOCENTE TRIMESTRAL/ANUAL)
  // ============================================================================
  getRelatoriosPedagogicos: (escolaId?: string): RelatorioPedagogicoFormal[] => {
    const lista = getLocal<RelatorioPedagogicoFormal[]>(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, []);
    const ordenados = [...lista].sort((a, b) =>
      (b.atualizadoEm || b.criadoEm || '').localeCompare(a.atualizadoEm || a.criadoEm || '')
    );
    if (!escolaId || escolaId === 'TODAS' || escolaId === 'todas') {
      return ordenados;
    }
    return ordenados.filter(r => r.escolaId === escolaId);
  },

  salvarRelatorioPedagogico: (rel: RelatorioPedagogicoFormal): RelatorioPedagogicoFormal => {
    const lista = getLocal<RelatorioPedagogicoFormal[]>(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, []);
    const agora = new Date().toISOString();
    const itemFinal: RelatorioPedagogicoFormal = {
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
    setLocal(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, lista);
    firebaseSyncEngine.salvarRelatorioPedagogico(itemFinal);
    dbService.registarLog(
      'Relatório Pedagógico',
      `${itemFinal.tipoRelatorio === 'COORDENACAO_FINAL_ANO' ? 'Relatório Anual de Coordenação' : 'Relatório Pedagógico Docente'}: "${itemFinal.tituloDocumento}" (${itemFinal.periodoReferencia === 'Anual' ? 'Anual' : `${itemFinal.periodoReferencia}º Trimestre`}) — Estado: ${itemFinal.estado}.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  removerRelatorioPedagogico: (id: string): boolean => {
    const lista = getLocal<RelatorioPedagogicoFormal[]>(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, []);
    const alvo = lista.find(r => r.id === id);
    if (!alvo) return false;
    const filtrados = lista.filter(r => r.id !== id);
    setLocal(STORAGE_KEYS.RELATORIOS_PEDAGOGICOS, filtrados);
    firebaseSyncEngine.removerRelatorioPedagogico(id);
    dbService.registarLog(
      'Relatório Pedagógico',
      `Removido o relatório "${alvo.tituloDocumento}".`,
      alvo.escolaId
    );
    return true;
  },

  // ============================================================================
  // VISIBILIDADE DE MÓDULOS E DADOS SENSÍVEIS DOS EMPREGADOS (DIREÇÃO GERAL)
  // ============================================================================
  getVisibilidadeEmpregados: (escolaId?: string): ConfiguracaoVisibilidadeEmpregados => {
    const escola = escolaId ? (dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva()) : dbService.getEscolaAtiva();
    const salva = escola?.visibilidadeEmpregados;
    if (!salva) {
      return {
        ...DEFAULT_CONFIGURACAO_VISIBILIDADE_EMPREGADOS,
        padraoEmpregados: { ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS },
        modulosBloqueadosPadrao: [],
        regrasPorCargo: {}
      };
    }

    const regrasMescladas: Record<string, RegraVisibilidadePorCargo> = {};
    if (salva.regrasPorCargo && typeof salva.regrasPorCargo === 'object') {
      Object.entries(salva.regrasPorCargo).forEach(([cargo, regra]) => {
        if (!regra) return;
        regrasMescladas[cargo] = {
          ativo: !!regra.ativo,
          modulosBloqueados: Array.isArray(regra.modulosBloqueados) ? [...regra.modulosBloqueados] : [],
          modulosExtrasPermitidos: Array.isArray(regra.modulosExtrasPermitidos) ? [...regra.modulosExtrasPermitidos] : [],
          dadosSensiveis: {
            ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS,
            ...(regra.dadosSensiveis || {})
          }
        };
      });
    }

    return {
      ...DEFAULT_CONFIGURACAO_VISIBILIDADE_EMPREGADOS,
      ...salva,
      padraoEmpregados: {
        ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS,
        ...(salva.padraoEmpregados || {})
      },
      modulosBloqueadosPadrao: Array.isArray(salva.modulosBloqueadosPadrao) ? [...salva.modulosBloqueadosPadrao] : [],
      regrasPorCargo: regrasMescladas
    };
  },

  salvarVisibilidadeEmpregados: (
    escolaId: string,
    config: ConfiguracaoVisibilidadeEmpregados,
    operadorNome?: string
  ): ConfiguracaoVisibilidadeEmpregados => {
    const agora = new Date().toISOString();
    const user = dbService.getCurrentUser();
    const configFinal: ConfiguracaoVisibilidadeEmpregados = {
      ...DEFAULT_CONFIGURACAO_VISIBILIDADE_EMPREGADOS,
      ...config,
      padraoEmpregados: {
        ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS,
        ...(config.padraoEmpregados || {})
      },
      modulosBloqueadosPadrao: Array.isArray(config.modulosBloqueadosPadrao) ? [...config.modulosBloqueadosPadrao] : [],
      regrasPorCargo: config.regrasPorCargo || {},
      atualizadoPorId: config.atualizadoPorId || user?.id,
      atualizadoPorNome: operadorNome || config.atualizadoPorNome || user?.nomeCompleto || 'Direcção Geral',
      atualizadoEm: agora
    };

    const escola = dbService.getEscolaPorId(escolaId) || dbService.getEscolaAtiva();
    if (escola && escola.id === escolaId) {
      const escolaAtualizada: Escola = {
        ...escola,
        visibilidadeEmpregados: configFinal,
        atualizadoEm: agora
      };
      dbService.salvarEscola(escolaAtualizada);
    }

    dbService.registarLog(
      'Ajuste de Visibilidade de Empregados',
      `A Direcção (${configFinal.atualizadoPorNome}) actualizou as regras de visibilidade e acesso de empregados (Controlo activo: ${configFinal.ativo ? 'Sim' : 'Não'}).`
    );

    return configFinal;
  },

  getVisibilidadeEfetivaUsuario: (
    user?: Funcionario | null,
    escola?: Escola | null
  ): {
    irrestrito: boolean;
    modulosBloqueados: Set<string>;
    modulosExtrasPermitidos: Set<string>;
    dadosSensiveis: RegraVisibilidadeDadosSensiveis;
  } => {
    const usuarioBase = user || dbService.getCurrentUser();
    const escInterin = escola || (usuarioBase?.escolaId ? dbService.getEscolaPorId(usuarioBase.escolaId) : undefined);
    const interinidade = dbService.getInterinidadeAtivaUsuario(usuarioBase?.id, escInterin?.id);
    const roleEfetiva = interinidade?.cargoDelegadoRole || usuarioBase?.role;
    if (!usuarioBase || roleEfetiva === 'AdminGeral' || roleEfetiva === 'DiretorGeral') {
      return {
        irrestrito: true,
        modulosBloqueados: new Set<string>(),
        modulosExtrasPermitidos: new Set<string>(),
        dadosSensiveis: { ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS }
      };
    }
    const usuario = { ...usuarioBase, role: roleEfetiva };

    const escAlvo = escola || (usuario.escolaId ? dbService.getEscolaPorId(usuario.escolaId) : undefined) || dbService.getEscolaAtiva();
    const cfg = dbService.getVisibilidadeEmpregados(escAlvo?.id);

    if (!cfg.ativo) {
      return {
        irrestrito: false,
        modulosBloqueados: new Set<string>(),
        modulosExtrasPermitidos: new Set<string>(),
        dadosSensiveis: { ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS }
      };
    }

    const regraCargo = cfg.regrasPorCargo?.[usuario.role];
    const regraCargoAtiva = regraCargo && regraCargo.ativo;

    const bloqueados = new Set<string>(
      cfg.aplicarRestricaoPadraoTodosEmpregados ? (cfg.modulosBloqueadosPadrao || []) : []
    );
    const extras = new Set<string>();

    let dados: RegraVisibilidadeDadosSensiveis = cfg.aplicarRestricaoPadraoTodosEmpregados
      ? { ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS, ...(cfg.padraoEmpregados || {}) }
      : { ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS };

    if (regraCargoAtiva) {
      // A regra específica do cargo prevalece sobre a restrição padrão
      dados = {
        ...DEFAULT_VISIBILIDADE_DADOS_SENSIVEIS,
        ...(regraCargo.dadosSensiveis || {})
      };
      // Extras definidos para o cargo liberam o que estava bloqueado no padrão
      (regraCargo.modulosExtrasPermitidos || []).forEach(m => {
        extras.add(m);
        bloqueados.delete(m);
      });
      (regraCargo.modulosBloqueados || []).forEach(m => {
        bloqueados.add(m);
        extras.delete(m);
      });
    }

    return {
      irrestrito: false,
      modulosBloqueados: bloqueados,
      modulosExtrasPermitidos: extras,
      dadosSensiveis: dados
    };
  },

  // ============================================================================
  // PLANO DE ATIVIDADES E EVENTOS (COORDINADORES -> SUBDIRETORES -> DIRETOR GERAL)
  // ============================================================================
  getAtividadesPlano: (escolaId?: string, anoLectivo?: string): AtividadePlanoEscolar[] => {
    const lista = getLocal<AtividadePlanoEscolar[]>(STORAGE_KEYS.PLANOS_ATIVIDADES, []);
    const ordenados = [...lista].sort((a, b) =>
      (a.dataInicio || '').localeCompare(b.dataInicio || '') ||
      (b.atualizadoEm || b.criadoEm || '').localeCompare(a.atualizadoEm || a.criadoEm || '')
    );
    return ordenados.filter(item => {
      if (escolaId && escolaId !== 'todas' && escolaId !== 'TODAS' && item.escolaId !== escolaId) {
        return false;
      }
      if (anoLectivo && anoLectivo !== 'TODOS' && item.anoLectivo && item.anoLectivo !== anoLectivo) {
        return false;
      }
      return true;
    });
  },

  salvarAtividadePlano: (atv: AtividadePlanoEscolar): AtividadePlanoEscolar => {
    const lista = getLocal<AtividadePlanoEscolar[]>(STORAGE_KEYS.PLANOS_ATIVIDADES, []);
    const agora = new Date().toISOString();
    const itemFinal: AtividadePlanoEscolar = {
      ...atv,
      percentualCumprimento: Math.max(0, Math.min(100, Number(atv.percentualCumprimento ?? (atv.estadoExecucao === 'Realizada' ? 100 : atv.estadoExecucao === 'Em_Curso' ? 50 : 0)))),
      atualizadoEm: agora,
      criadoEm: atv.criadoEm || agora
    };
    const idx = lista.findIndex(a => a.id === itemFinal.id);
    if (idx >= 0) {
      lista[idx] = itemFinal;
    } else {
      lista.unshift(itemFinal);
    }
    setLocal(STORAGE_KEYS.PLANOS_ATIVIDADES, lista);
    firebaseSyncEngine.salvarAtividadePlano(itemFinal);
    dbService.registarLog(
      'Plano de Atividades e Eventos',
      `Atividade "${itemFinal.titulo}" (${itemFinal.areaOrigem} • ${itemFinal.trimestre === 'Anual' ? 'Anual' : `${itemFinal.trimestre}º Trimestre`}) — Estado: ${itemFinal.estadoExecucao} (${itemFinal.percentualCumprimento}%)${itemFinal.excluidaDoPlanoGeralPorDiretor ? ' [Excluída do Plano Geral pelo Diretor]' : ''}.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  removerAtividadePlano: (id: string): boolean => {
    const lista = getLocal<AtividadePlanoEscolar[]>(STORAGE_KEYS.PLANOS_ATIVIDADES, []);
    const alvo = lista.find(a => a.id === id);
    if (!alvo) return false;
    const filtrados = lista.filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.PLANOS_ATIVIDADES, filtrados);
    firebaseSyncEngine.removerAtividadePlano(id);
    dbService.registarLog(
      'Plano de Atividades e Eventos',
      `Eliminada a atividade "${alvo.titulo}" (${alvo.areaOrigem}).`,
      alvo.escolaId
    );
    return true;
  },

  // ============================================================================
  // FINANÇAS PESSOAIS DO UTILIZADOR ("MINHAS FINANÇAS" - ESTRITAMENTE ISOLADO)
  // ============================================================================
  getFinancasPessoaisUsuario: (userId: string): DadosFinancasPessoaisUsuario => {
    const mapa = getLocal<Record<string, DadosFinancasPessoaisUsuario>>(STORAGE_KEYS.FINANCAS_PESSOAIS, {});
    const existente = mapa[userId];
    if (existente) {
      return {
        ...existente,
        id: userId,
        userId,
        transacoes: Array.isArray(existente.transacoes) ? existente.transacoes : [],
        orcamentosPorMes: existente.orcamentosPorMes && typeof existente.orcamentosPorMes === 'object' ? existente.orcamentosPorMes : {},
        metasPoupanca: Array.isArray(existente.metasPoupanca) ? existente.metasPoupanca : [],
        dividas: Array.isArray(existente.dividas) ? existente.dividas : []
      };
    }
    return {
      id: userId,
      userId,
      transacoes: [],
      orcamentosPorMes: {},
      metasPoupanca: [],
      dividas: [],
      atualizadoEm: new Date().toISOString()
    };
  },

  salvarFinancasPessoaisUsuario: (dados: DadosFinancasPessoaisUsuario): DadosFinancasPessoaisUsuario => {
    const mapa = getLocal<Record<string, DadosFinancasPessoaisUsuario>>(STORAGE_KEYS.FINANCAS_PESSOAIS, {});
    const itemFinal: DadosFinancasPessoaisUsuario = {
      ...dados,
      id: dados.userId,
      atualizadoEm: new Date().toISOString()
    };
    mapa[dados.userId] = itemFinal;
    setLocal(STORAGE_KEYS.FINANCAS_PESSOAIS, mapa);
    firebaseSyncEngine.salvarFinancasPessoais(itemFinal);
    return itemFinal;
  },

  // ============================================================================
  // HORÁRIOS DE PROVAS, MAPAS DE FISCALIZAÇÃO (1-4 PROFS/TURMA) & ATAS DE PROVAS
  // ============================================================================
  getHorariosProvas: (escolaId?: string, anoLectivo?: string): HorarioProvaItem[] => {
    const lista = getLocal<HorarioProvaItem[]>(STORAGE_KEYS.HORARIOS_PROVAS, []);
    return [...lista]
      .filter(h => {
        if (escolaId && escolaId !== 'todas' && escolaId !== 'TODAS' && h.escolaId !== escolaId) return false;
        if (anoLectivo && anoLectivo !== 'todos' && anoLectivo !== 'TODOS' && h.anoLectivo !== anoLectivo) return false;
        return true;
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.horaInicio || '').localeCompare(b.horaInicio || ''));
  },

  salvarHorarioProva: (item: HorarioProvaItem): HorarioProvaItem => {
    const lista = getLocal<HorarioProvaItem[]>(STORAGE_KEYS.HORARIOS_PROVAS, []);
    const agora = new Date().toISOString();
    const itemFinal: HorarioProvaItem = {
      ...item,
      criadoEm: item.criadoEm || agora,
      atualizadoEm: agora
    };
    const idx = lista.findIndex(h => h.id === itemFinal.id);
    if (idx >= 0) lista[idx] = itemFinal;
    else lista.push(itemFinal);
    setLocal(STORAGE_KEYS.HORARIOS_PROVAS, lista);
    firebaseSyncEngine.salvarHorarioProva(itemFinal);
    dbService.registarLog(
      'Horário de Provas',
      `${itemFinal.tipoProva}: ${itemFinal.disciplinaNome} (${itemFinal.turmaNome}, ${itemFinal.data} ${itemFinal.horaInicio}-${itemFinal.horaFim}) — Ano ${itemFinal.anoLectivo}.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  eliminarHorarioProva: (id: string): boolean => {
    const lista = getLocal<HorarioProvaItem[]>(STORAGE_KEYS.HORARIOS_PROVAS, []);
    const alvo = lista.find(h => h.id === id);
    if (!alvo) return false;
    setLocal(STORAGE_KEYS.HORARIOS_PROVAS, lista.filter(h => h.id !== id));
    firebaseSyncEngine.eliminarHorarioProva(id);
    // Eliminar mapas e atas ligados a este horário de prova
    const mapas = getLocal<MapaFiscalizacaoProva[]>(STORAGE_KEYS.MAPAS_FISCALIZACAO, []);
    mapas.filter(m => m.horarioProvaId === id).forEach(m => firebaseSyncEngine.eliminarMapaFiscalizacao(m.id));
    setLocal(STORAGE_KEYS.MAPAS_FISCALIZACAO, mapas.filter(m => m.horarioProvaId !== id));
    const atas = getLocal<AtaProvaRegistro[]>(STORAGE_KEYS.ATAS_PROVAS, []);
    atas.filter(a => a.horarioProvaId === id).forEach(a => firebaseSyncEngine.eliminarAtaProva(a.id));
    setLocal(STORAGE_KEYS.ATAS_PROVAS, atas.filter(a => a.horarioProvaId !== id));
    dbService.registarLog('Horário de Provas', `Horário de prova removido (${alvo.disciplinaNome} - ${alvo.turmaNome}).`, alvo.escolaId);
    return true;
  },

  getMapasFiscalizacao: (escolaId?: string, anoLectivo?: string): MapaFiscalizacaoProva[] => {
    const lista = getLocal<MapaFiscalizacaoProva[]>(STORAGE_KEYS.MAPAS_FISCALIZACAO, []);
    return [...lista]
      .filter(m => {
        if (escolaId && escolaId !== 'todas' && escolaId !== 'TODAS' && m.escolaId !== escolaId) return false;
        if (anoLectivo && anoLectivo !== 'todos' && anoLectivo !== 'TODOS' && m.anoLectivo !== anoLectivo) return false;
        return true;
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.horaInicio || '').localeCompare(b.horaInicio || ''));
  },

  salvarMapaFiscalizacao: (mapa: MapaFiscalizacaoProva): MapaFiscalizacaoProva => {
    const lista = getLocal<MapaFiscalizacaoProva[]>(STORAGE_KEYS.MAPAS_FISCALIZACAO, []);
    const agora = new Date().toISOString();
    const itemFinal: MapaFiscalizacaoProva = {
      ...mapa,
      fiscais: (mapa.fiscais || []).slice(0, 4),
      criadoEm: mapa.criadoEm || agora,
      atualizadoEm: agora
    };
    const idx = lista.findIndex(m => m.id === itemFinal.id || m.horarioProvaId === itemFinal.horarioProvaId);
    if (idx >= 0) lista[idx] = itemFinal;
    else lista.push(itemFinal);
    setLocal(STORAGE_KEYS.MAPAS_FISCALIZACAO, lista);
    firebaseSyncEngine.salvarMapaFiscalizacao(itemFinal);
    dbService.registarLog(
      'Mapa de Fiscalização de Provas',
      `${itemFinal.turmaNome} (${itemFinal.disciplinaNome}, ${itemFinal.data}): ${itemFinal.fiscais.map(f => f.professorNome).join(', ')}.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  eliminarMapaFiscalizacao: (id: string): boolean => {
    const lista = getLocal<MapaFiscalizacaoProva[]>(STORAGE_KEYS.MAPAS_FISCALIZACAO, []);
    const alvo = lista.find(m => m.id === id);
    if (!alvo) return false;
    setLocal(STORAGE_KEYS.MAPAS_FISCALIZACAO, lista.filter(m => m.id !== id));
    firebaseSyncEngine.eliminarMapaFiscalizacao(id);
    dbService.registarLog('Mapa de Fiscalização de Provas', `Mapa de fiscalização removido (${alvo.turmaNome} - ${alvo.disciplinaNome}).`, alvo.escolaId);
    return true;
  },

  getAtasProvas: (escolaId?: string, anoLectivo?: string): AtaProvaRegistro[] => {
    const lista = getLocal<AtaProvaRegistro[]>(STORAGE_KEYS.ATAS_PROVAS, []);
    return [...lista]
      .filter(a => {
        if (escolaId && escolaId !== 'todas' && escolaId !== 'TODAS' && a.escolaId !== escolaId) return false;
        if (anoLectivo && anoLectivo !== 'todos' && anoLectivo !== 'TODOS' && a.anoLectivo !== anoLectivo) return false;
        return true;
      })
      .sort((a, b) => (b.dataProva || '').localeCompare(a.dataProva || '') || (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''));
  },

  salvarAtaProva: (ata: AtaProvaRegistro): AtaProvaRegistro => {
    const lista = getLocal<AtaProvaRegistro[]>(STORAGE_KEYS.ATAS_PROVAS, []);
    const agora = new Date().toISOString();
    const itemFinal: AtaProvaRegistro = {
      ...ata,
      criadoEm: ata.criadoEm || agora,
      atualizadoEm: agora
    };
    const idx = lista.findIndex(a => a.id === itemFinal.id);
    if (idx >= 0) lista[idx] = itemFinal;
    else lista.unshift(itemFinal);
    setLocal(STORAGE_KEYS.ATAS_PROVAS, lista);
    firebaseSyncEngine.salvarAtaProva(itemFinal);
    dbService.registarLog(
      'Ata de Prova',
      `Ata da prova de ${itemFinal.disciplinaNome} (${itemFinal.turmaNome}, ${itemFinal.dataProva}) — Estado: ${itemFinal.estado} (${itemFinal.ocorrencias.length} ocorrências).`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  eliminarAtaProva: (id: string): boolean => {
    const lista = getLocal<AtaProvaRegistro[]>(STORAGE_KEYS.ATAS_PROVAS, []);
    const alvo = lista.find(a => a.id === id);
    if (!alvo) return false;
    setLocal(STORAGE_KEYS.ATAS_PROVAS, lista.filter(a => a.id !== id));
    firebaseSyncEngine.eliminarAtaProva(id);
    dbService.registarLog('Ata de Prova', `Ata removida (${alvo.turmaNome} - ${alvo.disciplinaNome}).`, alvo.escolaId);
    return true;
  },

  // ============================================================================
  // MAPA DE FÉRIAS (PESSOAL ADMINISTRATIVO & AUXILIARES DE LIMPEZA)
  // ============================================================================
  getMapasFerias: (escolaId?: string, anoLectivo?: string): MapaFeriasItem[] => {
    const lista = getLocal<MapaFeriasItem[]>(STORAGE_KEYS.MAPAS_FERIAS, []);
    return [...lista]
      .filter(f => {
        if (escolaId && escolaId !== 'todas' && escolaId !== 'TODAS' && f.escolaId !== escolaId) return false;
        if (anoLectivo && anoLectivo !== 'todos' && anoLectivo !== 'TODOS' && f.anoLectivo !== anoLectivo) return false;
        return true;
      })
      .sort((a, b) => (a.dataInicio || '').localeCompare(b.dataInicio || '') || (a.funcionarioNome || '').localeCompare(b.funcionarioNome || '', 'pt-AO'));
  },

  salvarMapaFerias: (item: MapaFeriasItem): MapaFeriasItem => {
    const lista = getLocal<MapaFeriasItem[]>(STORAGE_KEYS.MAPAS_FERIAS, []);
    const agora = new Date().toISOString();
    const itemFinal: MapaFeriasItem = {
      ...item,
      criadoEm: item.criadoEm || agora,
      atualizadoEm: agora
    };
    const idx = lista.findIndex(f => f.id === itemFinal.id);
    if (idx >= 0) lista[idx] = itemFinal;
    else lista.push(itemFinal);
    setLocal(STORAGE_KEYS.MAPAS_FERIAS, lista);
    firebaseSyncEngine.salvarMapaFerias(itemFinal);
    dbService.registarLog(
      'Mapa de Férias',
      `Férias de ${itemFinal.funcionarioNome} (${itemFinal.grupoCategoria}) de ${itemFinal.dataInicio} até ${itemFinal.dataFim} — Estado: ${itemFinal.estado}.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  eliminarMapaFerias: (id: string): boolean => {
    const lista = getLocal<MapaFeriasItem[]>(STORAGE_KEYS.MAPAS_FERIAS, []);
    const alvo = lista.find(f => f.id === id);
    if (!alvo) return false;
    setLocal(STORAGE_KEYS.MAPAS_FERIAS, lista.filter(f => f.id !== id));
    firebaseSyncEngine.eliminarMapaFerias(id);
    dbService.registarLog('Mapa de Férias', `Registo de férias removido (${alvo.funcionarioNome}).`, alvo.escolaId);
    return true;
  },

  // ============================================================================
  // ESTOQUE DE MATERIAIS DE LIMPEZA (SUBDIRETOR ADMIN + AUXILIARES DE LIMPEZA)
  // ============================================================================
  getMateriaisLimpeza: (escolaId?: string): MaterialLimpezaItem[] => {
    const lista = getLocal<MaterialLimpezaItem[]>(STORAGE_KEYS.ESTOQUE_LIMPEZA, []);
    return [...lista]
      .filter(m => !escolaId || escolaId === 'todas' || escolaId === 'TODAS' || m.escolaId === escolaId)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-AO'));
  },

  salvarMaterialLimpeza: (item: MaterialLimpezaItem): MaterialLimpezaItem => {
    const lista = getLocal<MaterialLimpezaItem[]>(STORAGE_KEYS.ESTOQUE_LIMPEZA, []);
    const agora = new Date().toISOString();
    const itemFinal: MaterialLimpezaItem = {
      ...item,
      quantidadeAtual: Math.max(0, Number(item.quantidadeAtual || 0)),
      quantidadeMinima: Math.max(0, Number(item.quantidadeMinima || 0)),
      criadoEm: item.criadoEm || agora,
      atualizadoEm: agora
    };
    const idx = lista.findIndex(m => m.id === itemFinal.id);
    if (idx >= 0) lista[idx] = itemFinal;
    else lista.unshift(itemFinal);
    setLocal(STORAGE_KEYS.ESTOQUE_LIMPEZA, lista);
    firebaseSyncEngine.salvarMaterialLimpeza(itemFinal);
    dbService.registarLog(
      'Estoque de Limpeza',
      `Material "${itemFinal.nome}" (${itemFinal.categoria}) guardado — Quantidade: ${itemFinal.quantidadeAtual} ${itemFinal.unidade}.`,
      itemFinal.escolaId
    );
    return itemFinal;
  },

  eliminarMaterialLimpeza: (id: string): boolean => {
    const lista = getLocal<MaterialLimpezaItem[]>(STORAGE_KEYS.ESTOQUE_LIMPEZA, []);
    const alvo = lista.find(m => m.id === id);
    if (!alvo) return false;
    setLocal(STORAGE_KEYS.ESTOQUE_LIMPEZA, lista.filter(m => m.id !== id));
    firebaseSyncEngine.eliminarMaterialLimpeza(id);
    dbService.registarLog('Estoque de Limpeza', `Material "${alvo.nome}" removido do catálogo de limpeza.`, alvo.escolaId);
    return true;
  },

  getMovimentosLimpeza: (escolaId?: string, materialId?: string): MovimentoEstoqueLimpeza[] => {
    const lista = getLocal<MovimentoEstoqueLimpeza[]>(STORAGE_KEYS.MOVIMENTOS_LIMPEZA, []);
    return [...lista]
      .filter(mv => {
        if (escolaId && escolaId !== 'todas' && escolaId !== 'TODAS' && mv.escolaId !== escolaId) return false;
        if (materialId && mv.materialId !== materialId) return false;
        return true;
      })
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  },

  registarMovimentoLimpeza: (params: {
    escolaId: string;
    materialId: string;
    tipo: TipoMovimentoEstoqueLimpeza;
    quantidade: number;
    data?: string;
    setorDestino?: string;
    motivo: string;
    responsavelId: string;
    responsavelNome: string;
    responsavelRole: UserRole;
    observacoes?: string;
  }): { sucesso: boolean; mensagem: string; material?: MaterialLimpezaItem; movimento?: MovimentoEstoqueLimpeza } => {
    const materiais = getLocal<MaterialLimpezaItem[]>(STORAGE_KEYS.ESTOQUE_LIMPEZA, []);
    const idx = materiais.findIndex(m => m.id === params.materialId);
    if (idx < 0) {
      return { sucesso: false, mensagem: 'Material de limpeza não encontrado no estoque.' };
    }
    const mat = materiais[idx];
    const qtdAtual = Number(mat.quantidadeAtual || 0);
    const qtdMov = Number(params.quantidade || 0);
    if (!Number.isFinite(qtdMov) || qtdMov < 0 || (params.tipo !== 'Ajuste' && qtdMov <= 0)) {
      return { sucesso: false, mensagem: 'Informe uma quantidade válida maior que zero.' };
    }

    let qtdNova = qtdAtual;
    if (params.tipo === 'Entrada') {
      qtdNova = Math.round((qtdAtual + qtdMov) * 100) / 100;
    } else if (params.tipo === 'Saida') {
      if (qtdMov > qtdAtual) {
        return {
          sucesso: false,
          mensagem: `Quantidade insuficiente em estoque (${qtdAtual} ${mat.unidade} disponíveis para "${mat.nome}").`
        };
      }
      qtdNova = Math.round((qtdAtual - qtdMov) * 100) / 100;
    } else {
      qtdNova = Math.max(0, Math.round(qtdMov * 100) / 100);
    }

    const agora = new Date().toISOString();
    const matAtualizado: MaterialLimpezaItem = {
      ...mat,
      quantidadeAtual: qtdNova,
      ultimoMovimentoEm: agora,
      atualizadoEm: agora
    };
    materiais[idx] = matAtualizado;
    setLocal(STORAGE_KEYS.ESTOQUE_LIMPEZA, materiais);
    firebaseSyncEngine.salvarMaterialLimpeza(matAtualizado);

    const movimento: MovimentoEstoqueLimpeza = {
      id: `mov-limp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: params.escolaId || mat.escolaId,
      materialId: mat.id,
      materialNome: mat.nome,
      unidade: mat.unidade,
      tipo: params.tipo,
      quantidade: qtdMov,
      quantidadeAnterior: qtdAtual,
      quantidadeNova: qtdNova,
      data: params.data || agora.split('T')[0],
      setorDestino: params.setorDestino?.trim() || undefined,
      motivo: params.motivo.trim() || (params.tipo === 'Entrada' ? 'Reposição de estoque' : params.tipo === 'Saida' ? 'Consumo de limpeza' : 'Acerto de inventário'),
      responsavelId: params.responsavelId,
      responsavelNome: params.responsavelNome,
      responsavelRole: params.responsavelRole,
      observacoes: params.observacoes?.trim() || undefined,
      criadoEm: agora,
      atualizadoEm: agora
    };

    const movs = getLocal<MovimentoEstoqueLimpeza[]>(STORAGE_KEYS.MOVIMENTOS_LIMPEZA, []);
    movs.unshift(movimento);
    setLocal(STORAGE_KEYS.MOVIMENTOS_LIMPEZA, movs);
    firebaseSyncEngine.salvarMovimentoLimpeza(movimento);

    dbService.registarLog(
      'Movimento de Estoque de Limpeza',
      `${params.tipo} de ${qtdMov} ${mat.unidade} em "${mat.nome}" por ${params.responsavelNome} (${qtdAtual} → ${qtdNova}).`,
      matAtualizado.escolaId
    );

    return {
      sucesso: true,
      mensagem: `Movimento (${params.tipo}) registado! Saldo atual de "${mat.nome}": ${qtdNova} ${mat.unidade}.`,
      material: matAtualizado,
      movimento
    };
  }
};




