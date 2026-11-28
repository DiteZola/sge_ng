export type UserRole = 
  | 'AdminGeral'
  | 'DiretorGeral'
  | 'SubdiretorPedagogico'
  | 'SubdiretorAdministrativo'
  | 'SubdirectorAdministrativo'
  | 'CoordenadorPedagogico'
  | 'ChefeSecretaria'
  | 'Secretario'
  | 'SecretarioEscolar'
  | 'CoordenadorTurno'
  | 'CoordenadorDisciplina'
  | 'Professor'
  | 'Secretaria'
  | 'Tesoureiro'
  | 'Bibliotecario'
  | 'Estagiario'
  | 'TecnicoTI'
  | 'AuxiliarLimpeza'
  | 'Encarregado';

export type NivelEnsino = 
  | 'Iniciacao'
  | 'Primario'
  | 'ICiclo'
  | 'IICiclo'
  | 'EnsinoTecnico';

export type Genero = 'M' | 'F';

export type EstadoAluno = 'Ativo' | 'Desistente' | 'Transferido' | 'Inativo';

export type EstadoAno = 'Planeamento' | 'Aberto' | 'Fechado' | 'Congelado';

export type Trimestre = '1' | '2' | '3' | '1º Trimestre' | '2º Trimestre' | '3º Trimestre';

export type ConceitoQualitativoIniciacao = 'Muito Bom' | 'Bom' | 'Suficiente' | 'Insuficiente';

export interface Escola {
  id: string;
  codigoEscola?: string;
  codigoSIGE?: string;
  codigoMEC?: string;
  comunaDistrito?: string;
  bairro?: string;
  telefone?: string;
  subdirectorAdministrativoNome?: string;
  subdiretorAdministrativoNome?: string;
  nome?: string;
  nomeOficial: string;
  denominacao?: string; // ex: "Ciências Humanas" ou "Daniel Vemba"
  sigla: string;
  logotipo: string;
  logotipoUrl?: string;
  nif: string;
  endereco: string;
  municipio: string;
  provincia: string;
  governoProvincial?: string; // ex: "Governo Provincial do Zaire"
  gabineteEducacao?: string; // ex: "Gabinete da Educação"
  contactos: string;
  email: string;
  decretoCriacao: string; // ex: "Decreto Executivo n.º 250/18 de 06 de Outubro"
  artigoLegal?: string; // ex: "alínea e) do artigo 109º da Lei n.º 32/20 de 12 de Agosto"
  diretorGeralNome: string;
  diretorGeralGenero?: 'M' | 'F';
  subdiretorPedagogicoNome: string;
  chefeSecretariaNome?: string;
  anoLectivoActivo: string;
  trimestreActivo: Trimestre;
  regimePeriodos?: RegimePeriodosLetivos;
  estadoAno: EstadoAno;
  ativo: boolean;
  estadoEscola?: 'Ativa' | 'Suspensa' | 'Inativa';
  motivoSuspensao?: string;
  dataSuspensao?: string;
  diretorGeralId?: string;
  diretorGeralEmail?: string;
  diretorGeralTelefone?: string;
  // Botões de Ativação / Desativação da Escola (Diretor)
  matriculasAbertas?: boolean;
  lancamentoNotasAberto?: boolean;
  permitirSolicitacaoAlteracaoNota?: boolean;
  permitirSubdiretorCadastrarFuncionarios?: boolean;
  exigirPropinaRegularizadaParaDocumentos?: boolean;
  moduloFinanceiroAtivo?: boolean;
  emissaoPassesAtiva?: boolean;
  permitirConsultaPautaOnline?: boolean;
  // Configurações do Portal do Encarregado (Diretor Geral)
  permitirBoletimNoPortalEncarregado?: boolean;
  trimestreBoletimPortal?: '1' | '2' | '3' | 'todos';
  // Configurações de Emissão de Passes e Boletins (Diretor)
  layoutBoletinsPadrao?: '1_por_folha' | '2_por_folha' | '4_por_folha';
  layoutPassesPadrao?: '8_por_folha' | 'individual';
  recibosMatriculaPorFolhaA4?: number;
  recibosEmolumentosPorFolhaA4?: number;
  corTemaPasses?: 'azul' | 'verde' | 'bordo' | 'ouro' | 'cinza_escuro' | string;
  corPrimaria?: string; // ex: "#1e3a8a"
  corSecundaria?: string; // ex: "#d97706"
  corFundoPasses?: string;
  configuracaoPasses?: ConfiguracaoPassesEscola;
  assinaturaDiretorUrl?: string; // Assinatura digitalizada para passes e visto de boletins
  // Configuração Oficial de Avaliação e Médias (Diretor / Admin Geral)
  nppAtivo?: boolean; // true = ativa (MT = MAC+NPP+NPT/3), false = desativada (MT = MAC+NPT/2)
  regrasMediaFinal?: RegraMediaFinalClasse[];
  // Níveis de Ensino e Classe da Iniciação
  ensinoPrimario?: boolean;
  temIniciacao?: boolean; // Obrigatório no cadastro quando leciona Ensino Primário (Sim = possui Iniciação, Não = 1ª à 6ª classe)
  niveisEnsino?: string[]; // ex: ['Primario', 'ICiclo', 'IICiclo', 'Tecnico']
  // Controlo de Visibilidade e Permissões de Empregados (Direção Geral)
  visibilidadeEmpregados?: ConfiguracaoVisibilidadeEmpregados;
  // Sessão Provisória de Apoio Técnico Autorizada pelo Diretor
  sessaoApoioTecnicoAtiva?: {
    solicitacaoId: string;
    adminGeralId: string;
    adminGeralNome: string;
    dataInicio: string;
    motivo: string;
  };
  // Tempos letivos configuráveis do horário escolar
  temposHorarios?: Array<{
    numero: number;
    inicio: string;
    fim: string;
    rotulo?: string;
  }>;
  atualizadoEm?: string;
}

export interface RegraVisibilidadeDadosSensiveis {
  verContactosAlunosEncarregados: boolean;
  verDocumentosIdentificacaoAlunos: boolean;
  verSituacaoFinanceiraPropinasAlunos: boolean;
  verDadosSensiveisFuncionarios: boolean;
  verEstatisticasGlobaisEscola: boolean;
  verLogsAuditoriaSistema: boolean;
}

export interface RegraVisibilidadePorCargo {
  ativo: boolean;
  modulosBloqueados: string[];
  modulosExtrasPermitidos?: string[];
  dadosSensiveis: RegraVisibilidadeDadosSensiveis;
}

export interface ConfiguracaoVisibilidadeEmpregados {
  ativo: boolean;
  aplicarRestricaoPadraoTodosEmpregados: boolean;
  padraoEmpregados: RegraVisibilidadeDadosSensiveis;
  modulosBloqueadosPadrao: string[];
  regrasPorCargo: Record<string, RegraVisibilidadePorCargo>;
  atualizadoPorId?: string;
  atualizadoPorNome?: string;
  atualizadoEm?: string;
}

export interface RegraMediaFinalClasse {
  classe: string; // "6ª", "9ª", "12ª", "13ª" ou "Transição"
  tipoCalculo: 'ARITMETICA_SIMPLES' | 'COM_EXAME_MED' | 'PONDERADA_PERSONALIZADA';
  pesoMF?: number; // ex: 0.6 (60%)
  pesoExame?: number; // ex: 0.4 (40%)
  notaMinimaExame?: number; // ex: 7
  notaDispensarExame?: number; // ex: 14
  arredondamento?: 'PADRAO_MED' | 'DECIMAL' | 'INTEIRO_SUPERIOR';
}

export type EpocaExame = 'Ordinaria' | 'Recurso' | 'Especial' | 'Equivalencia';

export interface AlunoNotaTermoExame {
  alunoId: string;
  nomeCompleto: string;
  numeroProcesso: string;
  mediaFrequencia: number;
  notaExameEscrito: number;
  mediaFinal: number;
  resultado: 'Aprovado' | 'Não Aprovado' | 'Recurso';
}

export interface TermoExame {
  id: string;
  escolaId: string;
  anoLectivo: string;
  epoca: EpocaExame;
  classe: string;
  turmaId: string;
  disciplinaId: string;
  disciplinaNome: string;
  dataExame: string;
  horaInicio?: string;
  salaExame?: string;
  presidenteJuriNome?: string;
  secretarioJuriNome?: string;
  vigilantesNomes?: string[];
  pesoMF: number; // ex: 0.6
  pesoExame: number; // ex: 0.4
  alunosNotas: AlunoNotaTermoExame[];
  homologado: boolean;
  homologadoPor?: string;
  homologadoEm?: string;
  observacoes?: string;
  atualizadoEm?: string;
}

export interface CursoEscolar {
  id: string;
  escolaId: string;
  nome: string;
  area: string;
  duracao: string;
  codigo?: string;
  ativo?: boolean;
}

export interface NotaMultiAno {
  disciplinaNome: string;
  categoria: 'Formação Geral' | 'Formação Específica' | 'Disciplina Opcional';
  nota10?: number | string; // '-' ou número
  nota11?: number | string;
  nota12?: number | string;
  mediaFinal: number;
  notaFinal?: number;
}

export interface HistoricoAnoAnterior {
  classe: string;
  anoLectivo: string;
  escolaOrigem?: string;
  mediaFinal: number;
  aprovado: boolean;
  concluido?: boolean;
}

export interface Aluno {
  id: string;
  codigoMatricula: string;
  numeroInterno?: string; // ex: "7419ANGOS2205"
  numeroProcesso?: string; // ex: "159/2021" ou "220518E1396"
  numeroOrdem: number;
  nomeCompleto: string;
  genero: Genero;
  dataNascimento: string;
  naturalidade: string;
  municipioNascimento?: string;
  provinciaOrigem: string;
  paisOrigem?: string;
  numeroBI: string;
  arquivoIdentificacao?: string; // ex: "arquivo de identificação de Luanda" ou "Mbanza Kongo"
  dataEmissaoBI?: string; // ex: "15/02/2022"
  dataValidadeBI?: string; // ex: "15/02/2027"
  localEmissaoBI?: string; // ex: "Luanda", "Mbanza Kongo"
  nacionalidade?: string; // ex: "Angolana"
  estadoCivil?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | string;
  altura?: number | string; // ex: "1.65"
  residencia?: string;
  bairro?: string;
  municipio?: string;
  necessidadesEspeciais?: string; // ex: "Nenhuma" ou especificações
  // Dados Médicos e de Saúde
  grupoSanguineo?: string; // ex: "O+", "A+", "B+", "AB-", etc.
  alergias?: string; // ex: "Penicilina", "Pólen"
  doencasCronicas?: string; // ex: "Asma", "Diabetes"
  condicaoEspecial?: string; // ex: "Baixa visão", "Auditiva", "Nenhuma"
  restricaoEducacaoFisica?: boolean;
  contactoEmergenciaNome?: string;
  contactoEmergenciaTelefone?: string;
  tipoDocumento?: 'BI' | 'Cédula' | 'Passaporte' | 'Cartão de Residente' | 'Outro';
  numeroDocumento?: string;
  nomePai?: string;
  nomeMae?: string;
  telefone: string;
  fotoUrl: string;
  encarregadoNome: string;
  nomeEncarregado?: string;
  encarregadoParentesco: string;
  encarregadoTelefone: string;
  telefoneEncarregado?: string;
  encarregadoEmail?: string;
  encarregadoProfissao?: string;
  encarregadoMorada?: string;
  endereco?: string;
  estado: EstadoAluno;
  turmaId: string;
  classeId: string;
  escolaId: string;
  curso?: string; // ex: "Formação de Professores do 1.º Ciclo", "Ciências Humanas", "Ciências Económicas e Jurídicas"
  cursoId?: string;
  areaFormacao?: string;
  opcaoCurso?: string; // ex: "Língua Portuguesa e EMC"
  periodo?: 'Matinal' | 'Vespertino' | 'Noturno' | string;
  livroRegisto?: string; // ex: "02" ou "220518MA2003"
  folhaRegisto?: string; // ex: "64" ou "EJ-2024/2025"
  propinaStatus: 'Regularizada' | 'Pendente' | 'Isento';
  comportamentoConceito?: 'Excelente' | 'Muito Bom' | 'Bom' | 'Regular';
  assiduidadeConceito?: 'Excelente' | 'Muito Bom' | 'Bom' | 'Regular';
  historicoAnterior: HistoricoAnoAnterior[];
  historicoMultiAno?: NotaMultiAno[]; // Para geração de Certificado de 10ª, 11ª e 12ª classes
  cadastradoEm: string;
  anoMatricula?: string;
  anoLectivo?: string;
  documentoIdentificacao?: string;
  provincia?: string;
  turno?: string;
  sala?: string;
  faltas?: number;
  ocorrencias?: OcorrenciaHistoricoAluno[];
  atualizadoEm?: string;
}

export interface Turma {
  id: string;
  escolaId: string;
  nome: string; // Ex: "7ª A", "Iniciação B", "12ª CFB-1"
  classe: string; // "Iniciação", "1ª", "2ª", ..., "13ª"
  nivelEnsino: NivelEnsino;
  curso?: string; // "Geral", "Ciências Físicas e Biológicas", "Informática"
  cursoId?: string;
  areaFormacao?: string;
  turno: 'Manhã' | 'Tarde' | 'Noite' | string;
  periodo?: 'Matinal' | 'Vespertino' | 'Noturno' | string;
  sala: string;
  salaId?: string;
  capacidade?: number;
  capacidadeMaxima?: number;
  anoLectivo: string;
  coordenadorId?: string; // Professor Coordenador que atua como Presidente da Turma
  coordenadorNome?: string;
  directorTurmaNome?: string;
  ordem?: number;
  atualizadoEm?: string;
}

export interface Disciplina {
  id: string;
  escolaId?: string;
  nome: string;
  sigla: string;
  codigo?: string;
  cargaHorariaSemanal?: number;
  componente?: 'Geral' | 'Específica' | 'Opção' | string;
  nivelEnsino: NivelEnsino;
  ehTecnica?: boolean;
  ordem?: number;
  ordemPorClasseCurso?: Record<string, number>; // Ordem específica por classe e (no IIº Ciclo) curso: ex "10ª::Informática" ou "7ª"
  classe?: string; // Classe associada (ex: '7ª')
  classes?: string[]; // Classes associadas quando criada para múltiplas classes (ex: ['7ª', '8ª', '9ª'])
  ciclo?: string; // Ciclo curricular (ex: 'Ensino Primário', 'Iº Ciclo', 'IIº Ciclo')
  curso?: string; // Curso específico quando aplicável
  cursos?: string[]; // Cursos associados (vazio ou ['TODOS'] = tronco comum / todos os cursos da classe)
  areaFormacao?: string;
  anoLectivo?: string;
  atualizadoEm?: string;
}

export interface AtribuicaoDocente {
  id: string;
  escolaId: string;
  professorId: string;
  professorNome?: string;
  turmaId: string;
  turmaNome?: string;
  classe?: string;
  disciplinaId: string;
  disciplinaNome?: string;
  ehCoordenadorTurma: boolean; // Presidente de Turma
  anoLectivo: string;
  atualizadoEm?: string;
}

export interface FormacaoAcademicaExtra {
  id: string;
  nivelFormacao: string; // Ex: 'Ensino Médio', 'Licenciatura', 'Mestrado', 'Doutoramento', 'Curso Técnico', 'Certificação'
  cursoOuArea: string;
  instituicaoAcademica: string;
  anoConclusao: string;
  observacoes?: string;
}

export interface CampoPersonalizadoFuncionario {
  id: string;
  rotulo: string;
  valor: string;
}

export interface Funcionario {
  id: string;
  escolaId: string;
  nomeCompleto: string;
  genero: Genero;
  numeroBI: string;
  bi?: string;
  tipoDocumento?: 'BI' | 'Passaporte' | 'Cartão de Residente' | 'Outro';
  numeroDocumento?: string;
  dataEmissaoBI?: string;
  dataValidadeBI?: string;
  validadeBI?: string;
  localEmissaoBI?: string;
  dataEmissaoDocumento?: string;
  dataValidadeDocumento?: string;
  localEmissaoDocumento?: string;
  arquivoIdentificacao?: string;
  nomePai?: string;
  nomeMae?: string;
  dataNascimento?: string;
  naturalidade?: string;
  naturalidadeProvincia?: string;
  naturalidadeMunicipio?: string;
  provinciaOrigem?: string;
  municipioResidencia?: string;
  nacionalidade?: string; // ex: "Angolana"
  estadoCivil?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | string;
  residencia?: string;
  residenciaAtual?: string;
  bairro?: string;
  municipio?: string;
  provincia?: string;
  pais?: string;
  numeroAgente?: string; // Número de Agente do Ministério / Função Pública
  nif?: string; // Número de Identificação Fiscal
  departamento?: string;
  categoriaProfissional?: string; // ex: "Professor do IIº Ciclo do Ensino Secundário - 6º Grau"
  grauAcademico?:
    | 'Ensino Básico'
    | 'Ensino Médio'
    | 'Bacharelato'
    | 'Licenciatura'
    | 'Pós-Graduação'
    | 'Mestrado'
    | 'Doutoramento'
    | 'Pós-Doutoramento'
    | 'Médio'
    | 'Bacharel'
    | 'Licenciado'
    | 'Mestre'
    | 'Doutor'
    | string;
  instituicaoAcademica?: string;
  anoConclusaoFormacao?: string;
  outrasFormacoes?: FormacaoAcademicaExtra[];
  camposExtrasFormacao?: CampoPersonalizadoFuncionario[];
  especialidade?: string; // ex: "Ensino da Matemática", "Língua Portuguesa", "Informática"
  disciplinaEspecialidade?: string;
  comuna?: string;
  altura?: string; // ex: "1.75m"
  tipoContrato?:
    | 'Efetivo'
    | 'Efectivo'
    | 'Função Pública (MED)'
    | 'Quadro Definitivo'
    | 'Contratado'
    | 'Contratado a Termo Certo'
    | 'Contratado por Tempo Indeterminado'
    | 'Estagiário'
    | 'Estagiário Curricular'
    | 'Estagiário Profissional'
    | 'Colaborador'
    | 'Prestador de Serviços'
    | 'Comissão de Serviço'
    | 'Substituto / Interino'
    | 'Voluntário'
    | 'Outro'
    | string;
  situacaoFuncional?: 'Ativo' | 'Activo' | 'Em Comissão de Serviço' | 'Licença de Parto' | 'Licença Sabática' | 'Destacado' | 'Aposentado' | string;
  cargaHorariaSemanal?: number; // horas lectivas ex: 24
  regimeDocencia?: string;
  tempoServicoAnos?: number; // tempo de serviço efectivo em anos
  banco?: string; // ex: "BAI", "BFA", "BIC", "BPC"
  iban?: string; // ex: "AO06.0040.0000.1234.5678.9012.3"
  numeroSegurancaSocial?: string; // INSS ex: "8492014-9"
  numeroINSS?: string;
  telefone: string;
  telefoneAlternativo?: string;
  email: string;
  cargo: string;
  ehProfessor: boolean;
  ehAdministrativoQueLeciona: boolean;
  habilitacoes: string;
  fotoUrl: string;
  dataAdmissao: string;
  ativo: boolean;
  // Dados Médicos e de Saúde do Colaborador
  grupoSanguineo?: string; // ex: "A+", "O+", "B-", etc.
  alergias?: string;
  doencasCronicas?: string;
  necessidadesEspeciais?: string;
  contactoEmergenciaNome?: string;
  contactoEmergenciaTelefone?: string;
  atestadoMedicoData?: string;
  password?: string;
  role: UserRole;
  statusConta?: 'Ativa' | 'Suspensa' | 'Pendente';
  criadoPorRole?: UserRole;
  criadoPorNome?: string;
  dataCriacao?: string;
  atualizadoEm?: string;
}

export interface TipoAvaliacaoConfig {
  id: string;
  escolaId: string;
  nome: string; // "Prova do Professor", "Teste de Diagnóstico", "Trabalho em Grupo", "Seminário"
  codigo: string;
  escalaMax: 10 | 20;
  obrigatorio: boolean;
  pesoPadrao: number;
  niveisPermitidos: NivelEnsino[];
  classesPermitidas?: string[];
  ciclosPermitidos?: string[];
  trimestresPermitidos?: Trimestre[];
  atualizadoEm?: string;
}

export interface RegraCalculoMAC {
  id: string;
  escolaId: string;
  nivelEnsino: NivelEnsino;
  classe: string;
  curso?: string;
  ciclo?: string;
  trimestre?: Trimestre | 'Todos';
  formulaTipo: 'ARITMETICA_SIMPLES' | 'PONDERADA_POR_TIPO' | 'FORMULA_CUSTOMIZADA';
  formulaCustom?: string; // ex: "SUM(notas)/COUNT(notas)"
  formula3Trimestre?: string; // ex: "MF = (MT1 + MT2 + MT3)/3" ou "MF = (0.4 * MT3) + (0.6 * Exame)"
  formulaTrimestral?: string;
  formulaTrimetral?: string;
  formula1Trimestre?: string;
  formula2Trimestre?: string;
  formulaPrimeirosTrimestres?: string; // Fórmulas dos 1º e 2º trimestres
  formulaTerceiroTrimestre?: string; // Fórmula específica diferenciada do 3º trimestre
  formulaMediaGeralClasse?: string; // ex: "(MT1 + MT2 + MT3) / 3" ou "MT1*0.2 + MT2*0.3 + MT3*0.5"
  formulaClassesFinaisExame?: string; // ex: "(MDF * 0.4) + (NE * 0.6)"
  tipoCalculoPrimeirosTrimestres?: 'ARITMETICA_SIMPLES' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA';
  tipoCalculoTerceiroTrimestre?: 'ARITMETICA_SIMPLES' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA';
  tipoCalculoClassesNaoFinais?: 'ARITMETICA_SIMPLES' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA';
  tipoCalculoClassesFinais?: 'PADRAO_MED' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA';
  pesosTrimestre?: {
    mac: number; // ex: 40 (%)
    npp: number; // ex: 30 (%)
    npt?: number; // ex: 30 (%)
  };
  pesosPrimeirosTrimestres?: {
    mac: number; // ex: 40 (%)
    npp: number; // ex: 30 (%)
    npt?: number; // ex: 30 (%)
  };
  pesosTerceiroTrimestre?: {
    mac: number; // ex: 30 (%)
    npp: number; // ex: 30 (%)
    npt?: number; // ex: 40 (%)
  };
  pesosTrimestresMF?: {
    t1: number; // ex: 20 (%) ou 33.3 (%)
    t2: number; // ex: 30 (%) ou 33.3 (%)
    t3: number; // ex: 50 (%) ou 33.4 (%)
  };
  pesoMDFClassesFinais?: number; // ex: 40 (%)
  pesoNEClassesFinais?: number; // ex: 60 (%)
  classesFinaisConfiguradas?: string[]; // ex: ['6ª', '9ª', '12ª', '13ª']
  pesoExameFinal?: number; // Peso percentual do Exame (ex: 60 ou 0.6)
  pesoMediasTrimestrais?: number; // Peso percentual das MAC/MT (ex: 40 ou 0.4)
  notaMinimaAprovacao?: number; // 10 ou 5
  notaMinimaExameRecurso?: number; // 7 ou 4
  tipoCalculo3Trimestre?: 'MED_ANGOLA_PADRAO' | 'PONDERADO_EXAME' | 'CUSTOMIZADO';
  pesosPorTipo?: Record<string, number>;
  minAvaliacoesExigidas: number;
  maxAvaliacoesPermitidas: number;
  descartarMenorNota?: boolean;
  versao: number;
  atualizadoEm: string;
  atualizadoPor: string;
}

export interface AvaliacaoCriada {
  id: string;
  escolaId: string;
  turmaId: string;
  disciplinaId: string;
  disciplinaNome?: string;
  professorId: string;
  trimestre: Trimestre;
  anoLectivo: string;
  tipoId: string;
  tipoNome: string;
  titulo: string;
  dataAplicacao: string;
  pontuacaoMaxima: number;
  peso: number;
  bloqueada: boolean;
  atualizadoEm?: string;
}

export interface NotaAdministrativaMetadata {
  atribuidaPorNome: string;
  atribuidaPorRole: string;
  dataHora: string;
  mediaOutrasDisciplinas: number;
  disciplinasBaseCount: number;
  observacao?: string;
}

export interface NotaEstudante {
  id: string;
  avaliacaoId: string;
  alunoId: string;
  valorNota: number; // 0-10 ou 0-20
  conceitoIniciacao?: ConceitoQualitativoIniciacao;
  dataLancamento: string;
  origemNota?: 'Professor' | 'Administrativa' | 'Direcao';
  notaAdministrativaInfo?: NotaAdministrativaMetadata;
  anoLectivo?: string;
  escolaId?: string;
  atualizadoEm?: string;
}

export interface NotaTrimestralConsolidada {
  id: string;
  escolaId?: string;
  alunoId: string;
  turmaId: string;
  disciplinaId: string;
  disciplinaNome?: string;
  trimestre: Trimestre;
  anoLectivo: string;
  mac: number; // Média de Avaliação Contínua (MAC)
  npp?: number; // Nota da Prova do Professor (NPP)
  provaTrimestral?: number; // Prova Trimestral (NPT)
  npt?: number; // Nota de Prova Trimestral (NPT)
  mediaTrimestral: number; // MT
  notaFinal?: number; // MT / CF Final para deliberação do Júri
  notaExame?: number; // Nota do Exame Estadual / Nacional
  comportamentoNota?: number; // 0-20
  comportamentoConceito?: string; // Excelente, Muito Bom, Bom, Regular, Mau
  assiduidadeConceito?: string; // Excelente, Muito Bom, Bom, Regular
  faltas: number;
  validadaPelaDirecao: boolean;
  origemNota?: 'Professor' | 'Administrativa' | 'Direcao';
  notaAdministrativaInfo?: NotaAdministrativaMetadata;
  atualizadoEm?: string;
}

export type NotaConsolidada = NotaTrimestralConsolidada;

export interface SolicitacaoAlteracaoNota {
  id: string;
  escolaId: string;
  professorId: string;
  professorNome: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  trimestre: Trimestre;
  avaliacaoId: string;
  avaliacaoTitulo: string;
  notaAnterior: number;
  notaProposta: number;
  motivo: string;
  estado: 'Pendente' | 'Aprovado' | 'Rejeitado';
  respostaDirecao?: string;
  dataSolicitacao: string;
  dataResposta?: string;
  anoLectivo?: string;
  atualizadoEm?: string;
}

// ==========================================
// MÓDULO COMISSÃO DE JÚRI (CONFORME ESPECIFICAÇÃO MED)
// ==========================================

export type FuncaoMembroJuri = 'Presidente' | 'Secretario' | 'Membro' | '1º Vogal' | '2º Vogal' | 'Vogal';

export type EstadoSessaoJuri = 
  | 'Planeada' 
  | 'Aberta' 
  | 'Em_Analise' 
  | 'Em_Deliberacao' 
  | 'Aguardando_Pendencias' 
  | 'Validada' 
  | 'Encerrada' 
  | 'Reaberta';

export type FinalidadeCriterio = 
  | 'Aprovacao' 
  | 'Reprovacao' 
  | 'Recurso' 
  | 'Recuperacao' 
  | 'Situacao_Especial' 
  | 'Aguardar_Documentacao' 
  | 'Aguardar_Correcao';

export type DecisaoDeliberacaoJuri = 
  | 'Aprovar' 
  | 'Nao_Aprovar' 
  | 'Recurso' 
  | 'Reavaliar' 
  | 'Aguardar_Informacao' 
  | 'Outra';

export interface CondicaoCriterio {
  id: string;
  campo: 'percentagem' | 'media' | 'disciplinas_positivas' | 'disciplinas_negativas' | 'nota_minima' | 'disciplina_especifica' | 'frequencia';
  operador: '>=' | '<=' | '==' | 'between';
  valorMin?: number;
  valorMax?: number;
  disciplinaNome?: string;
  operadorLogico?: 'E' | 'OU' | 'NAO';
}

export interface CriterioJuri {
  id: string;
  codigo: string; // Ex: "Critério 01"
  nome: string;
  descricao?: string;
  finalidade: FinalidadeCriterio;
  condicoes: CondicaoCriterio[];
  ativo: boolean;
}

export interface MembroComissaoJuri {
  usuarioId: string;
  nome: string;
  email: string;
  funcao: FuncaoMembroJuri;
  cargoOriginal?: string;
  ehProfessor?: boolean;
}

export interface ParecerMembroJuri {
  membroId: string;
  membroNome: string;
  funcao: FuncaoMembroJuri;
  parecer: string;
  dataHora: string;
}

export interface NotaAlteradaJuri {
  disciplinaId: string;
  disciplinaNome: string;
  notaAnterior: number;
  novaNota: number;
  motivo: string;
  alteradoPor: string;
  dataHora: string;
}

export interface DeliberacaoAlunoJuri {
  alunoId: string;
  alunoNome: string;
  decisao: DecisaoDeliberacaoJuri;
  justificativa: string;
  observacoes?: string;
  pareceres?: ParecerMembroJuri[];
  deliberadoPor: string;
  dataHora: string;
  conflitoInteresseDetectado?: boolean;
  professoresResponsaveisConflito?: string[];
  criteriosCumpridosIds?: string[];
  criteriosNaoCumpridosIds?: string[];
  explicacaoResultado?: string[];
  notasAlteradas?: NotaAlteradaJuri[];
  consensoPercentual?: number;
}

export interface AtaJuri {
  id: string;
  numeroAta: string;
  sessaoNumero: string;
  escolaNome: string;
  anoLectivo: string;
  periodo: string;
  data: string;
  membrosPresentes: { nome: string; funcao: FuncaoMembroJuri; cargoOriginal?: string }[];
  turmasAnalisadas: string[];
  totalAlunos: number;
  totalAprovados: number;
  totalReprovados: number;
  totalRecurso: number;
  totalEspeciais: number;
  deliberacoesResumo: string;
  conteudoTextoCompleto: string;
  dataEncerramento: string;
  assinaturaPresidente: string;
  assinaturaSecretario: string;
  assinaturasVogais: string[];
}

export interface ComissaoJuri {
  id: string;
  escolaId: string;
  nomeJuri: string;
  numeroSessao?: string;
  classe: string;
  curso?: string;
  turmaId?: string;
  turmasIds?: string[];
  anoLectivo: string;
  periodo?: string; // ex: "III Trimestre", "Exame Nacional"
  periodoTrimestre?: string;
  dataInicio?: string;
  dataEncerramento?: string;
  dataFim?: string;
  turmasAbrangidas?: string[];
  finalidade?: string;
  observacoes?: string;
  estado?: EstadoSessaoJuri;
  presidenteId?: string;
  presidenteJuriId?: string;
  secretarioId?: string;
  vogal1Id?: string;
  vogal2Id?: string;
  membros?: MembroComissaoJuri[];
  criterios?: CriterioJuri[];
  deliberacoes?: Record<string, DeliberacaoAlunoJuri>;
  ata?: AtaJuri;
  validadaPor?: string;
  validadaEm?: string;
  encerradaEm?: string;
  bloqueada?: boolean;
  fase?: string;
  ativa?: boolean;
  criadaEm?: string;
  criadaPor?: string;
  pautaHomologada?: boolean;
  pautaHomologadaEm?: string;
  pautaHomologadaPor?: string;
  atualizadoEm?: string;
}

// ==========================================
// RESILIÊNCIA & AUTO-RECUPERAÇÃO DE DESASTRES / ATAQUES
// ==========================================

export interface RegistroAutoRecuperacao {
  id: string;
  timestamp: string;
  tipoIncidente: 'CORRUPCAO_DADOS' | 'ADULTERACAO_NOTAS_FORA_SESSAO' | 'INJECAO_MALICIOSA' | 'FALHA_INTEGRIDADE_CHECKSUM' | 'FORCA_BRUTA_DETECTADA';
  detalhes: string;
  pontoRestauracaoTimestamp: string;
  entidadesAfetadas: string[];
  hashConsistencia: string;
  status: 'Recuperado_Com_Sucesso' | 'Monitorando';
  notificadoAdminGeral: boolean;
}

export interface PresencaFuncionario {
  id: string;
  escolaId: string;
  funcionarioId: string;
  funcionarioNome: string;
  cargo: string;
  data: string; // YYYY-MM-DD
  estado: 'Presente' | 'Falta_Justificada' | 'Falta_Injustificada';
  observacao?: string;
  registadoPor: string;
  horaEntrada?: string;
  horaSaida?: string;
  justificativa?: string;
  anoLectivo?: string;
  atualizadoEm?: string;
}

export type RegistoAssiduidade = PresencaFuncionario;

export interface LogAuditoria {
  id: string;
  escolaId: string;
  utilizadorId: string;
  utilizadorNome: string;
  usuarioNome?: string;
  papel: string;
  usuarioRole?: string;
  acao: string;
  detalhe: string;
  detalhes?: string;
  ip: string;
  dataHora: string;
  timestamp?: string;
  origemAdminGeral?: boolean;
}

export interface MensagemInterna {
  id: string;
  escolaId: string;
  remetenteId: string;
  remetenteNome: string;
  remetentePapel: string;
  remetenteCargo?: string;
  tipo: 'GERAL' | 'GRUPO' | 'DIRECTA';
  destinatarioTipo?: 'Todos' | 'Encarregados' | 'Docentes' | 'Funcionarios' | 'Area' | 'Secretaria' | 'Individual';
  destinatarioId?: string;
  destinatarioNome?: string;
  areaDestino?: string;
  classeDestino?: string;
  turmaIdDestino?: string;
  turmaNomeDestino?: string;
  escopoEnvioLabel?: string;
  grupo?: string; // ex: "Corpo Docente", "Turma 7ª A", "Encarregados"
  titulo: string;
  assunto?: string;
  conteudo: string;
  prioridade?: 'Normal' | 'Urgente' | 'Critica';
  urgente?: boolean;
  origemModulo?: 'Comunicacao' | 'Biblioteca' | 'Direcao' | 'Sistema';
  dataHora: string;
  criadaEm?: string;
  lida?: boolean;
  atualizadoEm?: string;
}

export type Mensagem = MensagemInterna;

export interface DocumentoBiblioteca {
  id: string;
  escolaId: string;
  titulo: string;
  autor: string;
  categoria: string;
  classe?: string;
  disciplina?: string;
  descricao?: string;
  tamanhoBytes: number;
  tamanhoMb?: number;
  url: string;
  arquivoUrl?: string;
  arquivoNome?: string;
  arquivoMimeType?: string;
  arquivoArmazenamentoId?: string;
  arquivoChunksCount?: number;
  tipoRecurso?: 'PDF' | 'Link';
  dataUpload: string;
  carregadoEm?: string;
  uploadPorId?: string;
  uploadPorRole?: string;
  uploadPorNome: string;
  atualizadoEm?: string;
}

export interface ReciboPagamento {
  id: string;
  escolaId: string;
  numeroRecibo: string;
  alunoId: string;
  alunoNome: string;
  codigoMatricula: string;
  turmaNome: string;
  mesReferencia: string;
  valorPagoKz: number;
  metodoPagamento: 'Dinheiro' | 'Multicaixa / TPA' | 'Transferência Bancária';
  dataHora: string;
  operadorNome: string;
  anoLectivo?: string;
  atualizadoEm?: string;
}

// ==========================================
// MÓDULO FINANCEIRO & SUBDIRECTOR ADMINISTRATIVO
// ==========================================

export type TipoEmolumento = 
  | 'Propina Mensal'
  | 'Matrícula'
  | 'Confirmação'
  | 'Declaração com Notas'
  | 'Declaração sem Notas'
  | 'Certificado de Conclusão'
  | 'Cartão de Estudante'
  | 'Exame de Recurso'
  | 'Outros'
  | (string & {});

export interface ItemEmolumentoConfig {
  id: string;
  escolaId: string;
  nome: string; // Ex: 'Uniforme Oficial', 'Transporte Escolar', 'Manual de Apoio'
  codigo?: string;
  descricao?: string;
  valorPadraoKz: number;
  valoresPorClasse?: Record<string, number>;
  periodicidade: 'Unico' | 'Mensal' | 'Anual' | 'Por_Solicitacao';
  classesAbrangidas: string[]; // ['Todas'] ou ['Iniciação', '1ª', ...]
  niveisAcademicos?: Array<'Todos' | 'Primario' | 'ICiclo' | 'IICiclo'>;
  obrigatorio: boolean;
  permitirPagamentoParcial?: boolean;
  diaVencimento?: number; // 1 a 31
  multaAtrasoPercentual?: number;
  bloqueiaDocumentosSePendente?: boolean;
  ativo: boolean;
  criadoPorNome?: string;
  dataCriacao: string;
}

export interface ConfiguracaoFinanceiraEscola {
  escolaId: string;
  propinasPorClasse: Record<string, number>; // Ex: { "Iniciação": 8000, "7ª": 12000, "10ª": 16000 }
  mesesPropinasAtivos?: string[]; // Ex: ["Setembro", "Outubro", ..., "Julho"]
  taxaMatricula: number;
  taxaConfirmacao: number;
  taxaDeclaracaoComNotas: number;
  taxaDeclaracaoSemNotas: number;
  taxaCertificado: number;
  taxaCartaoEstudante: number;
  taxaExameRecurso: number;
  diaLimitePagamento: number; // ex: dia 10 de cada mês
  multaAtrasoPercentual: number; // ex: 10%
  ibanEscola?: string;
  bancoNome?: string;
  delegacoesCobranca?: DelegacaoCobrancaFinanceira[];
  emolumentosPersonalizados?: ItemEmolumentoConfig[];
  recibosMatriculaPorFolhaA4?: number;
  recibosEmolumentosPorFolhaA4?: number;
  atualizadoEm?: string;
}

export interface DelegacaoCobrancaFinanceira {
  id: string;
  escolaId: string;
  funcionarioId: string;
  funcionarioNome: string;
  cargo: string;
  role: UserRole;
  ativo: boolean;
  emolumentosPermitidos: TipoEmolumento[];
  classesPermitidas?: string[];
  turmasPermitidas?: string[];
  valorMaximoPorCobrancaKz?: number;
  permitirAnulacao: boolean;
  dataDelegacao: string;
  delegadoPorNome: string;
  observacoes?: string;
  atualizadoEm?: string;
}

export type TipoPagamentoEscolar = TipoEmolumento;

export interface TransacaoFinanceira {
  id: string;
  escolaId: string;
  alunoId: string;
  alunoNome: string;
  codigoMatricula: string;
  turmaNome: string;
  classe: string;
  tipo: TipoEmolumento;
  emolumentoId?: string;
  nivelAcademico?: string;
  mesReferencia?: string; // ex: "Outubro 2025"
  anoLectivo: string;
  valorKz: number;
  multaKz?: number;
  valorTotalKz: number;
  valorPrevistoKz?: number;
  valorPagoAcumuladoKz?: number;
  saldoDevedorRestanteKz?: number;
  modalidadePagamento?: 'Total' | 'Parcial';
  metodoPagamento: MetodoPagamentoEscolar;
  numeroComprovativo?: string;
  numeroBordero?: string;
  comprovativo?: string;
  numeroRecibo: string;
  dataHora: string;
  operadorId: string;
  operadorNome: string;
  observacao?: string;
  observacoes?: string;
  status: 'Confirmado' | 'Pendente' | 'Anulado';
  atualizadoEm?: string;
}

export type MetodoPagamentoEscolar = 'Dinheiro' | 'Multicaixa / TPA' | 'Transferência Bancária' | 'Depósito' | 'Outro' | 'Cheque';

export type CategoriaDespesa = 
  | 'Salários & Subsídios'
  | 'Material de Escritório & Didáctico'
  | 'Manutenção de Infraestruturas'
  | 'Combustível / Gerador'
  | 'Energia & Água'
  | 'Internet & Comunicações'
  | 'Limpeza & Higiene'
  | 'Segurança & Portaria'
  | 'Outras Despesas';

export type CategoriaDespesaEscolar = CategoriaDespesa;

export interface DespesaEscolar {
  id: string;
  escolaId: string;
  anoLectivo?: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valorKz: number;
  dataHora: string;
  beneficiario: string; // Empresa ou pessoa que recebeu
  metodoPagamento: MetodoPagamentoEscolar;
  numeroComprovativo?: string;
  registadoPorNome: string;
  aprovadoPorNome?: string;
  observacao?: string;
  atualizadoEm?: string;
}

export type CategoriaPatrimonio = 
  | 'Mobiliário'
  | 'Equipamento Informático'
  | 'Material Didático'
  | 'Instalações e Edifícios'
  | 'Material Desportivo'
  | 'Outro'
  | 'Mobiliário Escolar (Carteiras/Secretárias)'
  | 'Informática & Equipamentos TIC'
  | 'Laboratório de Ciências'
  | 'Climatização & Energia (ACs/Geradores)'
  | 'Biblioteca & Acervo'
  | 'Desporto & Educação Física'
  | 'Outros Bens';

export type EstadoConservacao = 
  | 'Novo' 
  | 'Em Uso' 
  | 'Bom' 
  | 'Razoável' 
  | 'Regular' 
  | 'Danificado' 
  | 'Em Reparação' 
  | 'Inoperante' 
  | 'Para Abate'
  | 'Já Não Existe / Abatido';

export interface ItemPatrimonio {
  id: string;
  escolaId: string;
  codigoTombamento?: string; // ex: "PAT-CE151-2025-042"
  codigoTombo?: string;
  nomeItem?: string;
  designacao?: string;
  categoria: CategoriaPatrimonio;
  salaLocalizacao?: string; // ex: "Sala 04", "Laboratório de Biologia", "Direção"
  localizacao?: string;
  quantidade: number;
  estadoConservacao: EstadoConservacao;
  dataAquisicao: string;
  valorEstimadoKz?: number;
  responsavelNome?: string;
  observacoes?: string;
  ultimaRevisaoAno?: string;
  revisadoEm?: string;
  revisadoPor?: string;
  statusInventario?: 'Confirmado' | 'Danificado' | 'Inexistente' | 'Para_Abate' | string;
  atualizadoEm?: string;
}

// ==========================================
// HISTÓRICO ESCOLAR COMPLETO (NOTAS FINAIS POR DISCIPLINA EM CADA CLASSE)
// ==========================================

export interface NotaFinalDisciplinaHistorico {
  disciplinaNome: string;
  notaFinal: number;
  resultado: 'Aprovado' | 'Não Transita' | 'Dispensado';
  professorNome?: string;
}

export interface OcorrenciaHistoricoAluno {
  id: string;
  data: string; // YYYY-MM-DD
  tipo: 'Disciplinar' | 'Pedagógico' | 'Elogio' | 'Reunião Encarregado' | 'Advertência' | 'Louvor' | 'Outro';
  gravidade?: 'Leve' | 'Média' | 'Grave';
  descricao: string;
  registadoPor: string;
  cargo: 'Professor' | 'Coordenador' | 'Coordenador de Turno' | 'Diretor Geral' | 'Subdiretor Pedagógico' | 'Subdiretor Administrativo' | 'Chefe da Secretaria' | 'Secretário' | 'Secretária' | string;
  anoLectivo: string;
  classe?: string;
  turmaId?: string;
  turmaNome?: string;
  resolucao?: string;
  notificarEncarregado?: boolean;
  notificadoEncarregado?: boolean;
  // Fluxo oficial de 3 etapas: Registo (Professor/Staff) -> Coordenador da Classe/Turma -> Subdiretor Pedagógico -> Dossiê
  statusAprovacao?: 'Pendente_Coordenador' | 'Aprovado_Coordenador' | 'Rejeitado_Coordenador' | 'Aprovado_Pedagogico' | 'Rejeitado_Pedagogico';
  criadoPorId?: string;
  criadoPorRole?: UserRole | string;
  criadoEm?: string;
  coordenadorAprovadorId?: string;
  coordenadorAprovadorNome?: string;
  coordenadorAprovadorEm?: string;
  subdiretorAprovadorId?: string;
  subdiretorAprovadorNome?: string;
  subdiretorAprovadorEm?: string;
  rejeitadoPorId?: string;
  rejeitadoPorNome?: string;
  rejeitadoMotivo?: string;
  rejeitadoEm?: string;
}

export interface FaltasAnoHistorico {
  anoLectivo: string;
  classe?: string;
  totalAulasPrevistas?: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  totalPresencas?: number;
  percentualAssiduidade?: number;
  observacao?: string;
}

export interface DividasAnoHistorico {
  anoLectivo: string;
  classe?: string;
  status: 'Regularizado' | 'Pendente' | 'Acordo de Pagamento' | 'Isento';
  totalDividaAKZ: number;
  totalPagoAKZ: number;
  mesesPendentes?: string[];
  observacoes?: string;
}

export interface HistoricoClasseDisciplinas {
  classe: string;
  anoLectivo: string;
  escolaOrigem?: string;
  mediaGeralClasse?: number;
  notasDisciplinas: NotaFinalDisciplinaHistorico[];
  ocorrencias?: OcorrenciaHistoricoAluno[];
  faltas?: FaltasAnoHistorico;
  dividas?: DividasAnoHistorico;
}

export interface NotaFinalDisciplinaClasse {
  disciplinaNome: string;
  categoria?: 'Formação Geral' | 'Formação Específica' | 'Opção';
  notasPorClasse: Record<string, number | '-' | string>; // ex: { "10ª": 14, "11ª": 13, "12ª": 15 }
  mediaFinal: number | '-';
  situacao?: 'Aprovado' | 'Dispensado' | 'Não Aprovado';
}

export interface HistoricoEscolarCompleto {
  alunoId: string;
  ciclo?: 'Ensino Primário (1ª à 6ª)' | 'Iº Ciclo do Ensino Secundário (7ª à 9ª)' | 'IIº Ciclo Geral (10ª à 12ª)' | 'Ensino Técnico Profissional (10ª à 13ª)' | string;
  classesCursadas?: string[]; // ex: ["10.ª Classe", "11.ª Classe", "12.ª Classe"]
  anosLectivos?: Record<string, string>; // ex: { "10.ª Classe": "2022/2023", "11.ª Classe": "2023/2024", "12.ª Classe": "2024/2025" }
  disciplinas?: NotaFinalDisciplinaClasse[];
  classes: HistoricoClasseDisciplinas[]; // Notas finais de cada disciplina em cada classe
  ocorrenciasGerais?: OcorrenciaHistoricoAluno[];
  faltasHistoricas?: FaltasAnoHistorico[];
  dividasHistoricas?: DividasAnoHistorico[];
  mediaFinalCiclo?: number;
  resultadoFinal?: 'Aprovado' | 'Concluído com Distinção' | 'Em Curso';
  dataConclusao?: string;
  dataUltimaAtualizacao?: string;
  livroRegisto?: string;
  folhaRegisto?: string;
  termoNumero?: string;
  atualizadoEm?: string;
}

// ==========================================
// CONFIGURAÇÕES GERAIS DO SISTEMA (ADMIN GERAL)
// ==========================================

export interface ConfiguracaoSistema {
  insigniaNacionalUrl: string; // Logótipo do sistema e insígnia nos documentos oficiais
  nomeSistema: string; // "SGE-NG"
  subtituloSistema: string; // "Sistema de Gestão Escolar de Nova Geração"
  ministerioNome: string; // "Ministério da Educação (MED)"
  pais: string; // "República de Angola"
  modoProducao: boolean; // Se false, modo demonstração; se true, modo de execução
  sincronizacaoFirebaseAtiva: boolean;
  modoAuditoriaForense?: boolean;
  validarBIComAlgoritmoNacional?: boolean;
  permitirAutoRegistoEscolas?: boolean;
  bloqueioPorFalhasLogin?: boolean;
  notificacoesEmailAtivas?: boolean;
  backupAutomaticoDiario?: boolean;
  ultimaSincronizacao?: string;
  criadoPorAdminEmail?: string;
  dataInicializacao?: string;
  insigniaChunksCount?: number;
  insigniaOtimizada?: boolean;
  atualizadoEm?: string;
  // Configurações Gerais, Segurança, Privacidade & Desempenho
  forcarHTTPS?: boolean;
  bannerCookiesAtivo?: boolean;
  exigirConsentimentoPoliticas?: boolean;
  protecaoAntiSpamAtiva?: boolean;
  limiteSubmissoesPorMinuto?: number;
  otimizacaoCarregamentoAtiva?: boolean;
  emailDPO?: string;
  telefoneSuporte?: string;
  politicaVersao?: string;
  idiomaSistema?: string;
  fusoHorario?: string;
}

// ==========================================
// ESTRUTURAS DE GESTÃO DE ANOS LECTIVOS & CALENDÁRIO
// ==========================================

export type RegimePeriodosLetivos = 'Trimestral' | 'Semestral';

export interface PeriodoTrimestre {
  trimestre: Trimestre;
  nome: string; // "Iº Trimestre", "IIº Trimestre", "IIIº Trimestre"
  dataInicio: string;
  dataFim: string;
  estado: 'Aberto' | 'Fechado';
  pesoPercentual?: number;
}

export interface PeriodoLetivoConfig extends PeriodoTrimestre {
  id?: string;
  numero: 1 | 2 | 3;
  tipo: 'Trimestre' | 'Semestre';
  bloquearLancamentoSeFechado?: boolean;
  descricao?: string;
}

export interface AnoLectivoConfig {
  id: string; // ex: "ano-esc-123-2025-2026"
  escolaId?: string;
  rotulo: string; // "2025/2026"
  ano?: string;
  dataInicio: string;
  dataFim: string;
  estado: EstadoAno; // 'Aberto' | 'Fechado' | 'Congelado'
  trimestres: PeriodoTrimestre[];
  regimePeriodos?: RegimePeriodosLetivos;
  periodos?: PeriodoLetivoConfig[];
  calculoSegmentadoAtivo?: boolean;
  descricao?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface TurnoConfig {
  id: string;
  escolaId?: string;
  nome: 'Manhã' | 'Tarde' | 'Noite' | string;
  horaInicio: string; // ex: "07:30"
  horaFim: string; // ex: "12:30"
  temposLectivos: number; // ex: 5 ou 6 tempos
  intervaloMinutos: number; // ex: 20 min
  toleranciaMinutos?: number;
  diasSemana?: string[];
  ativo: boolean;
  anoLectivo?: string;
  atualizadoEm?: string;
}

export interface ClasseConfig {
  id: string;
  escolaId?: string;
  nome: string;
  ciclo?: string;
  regimeAvaliacao?: string;
  ativa?: boolean;
  nivelEnsino?: NivelEnsino;
  descricao?: string;
  ordem?: number;
  anoLectivo?: string;
  atualizadoEm?: string;
}

export interface AreaFormacaoConfig {
  id: string;
  escolaId?: string;
  nome: string;
  codigo?: string;
  ciclo?: string;
  nivelEnsino?: NivelEnsino;
  descricao?: string;
  ativo?: boolean;
  atualizadoEm?: string;
}

export interface SalaAulaConfig {
  id: string;
  escolaId?: string;
  nome: string;
  codigo?: string;
  capacidade?: number;
  tipo?: 'Sala de Aula' | 'Laboratório' | 'Oficina' | 'Auditório' | string;
  bloco?: string;
  ativo?: boolean;
  atualizadoEm?: string;
}

export interface CursoConfig {
  id: string;
  escolaId?: string;
  nome: string;
  codigo?: string;
  area: string;
  areaFormacaoId?: string;
  duracao: string;
  nivelEnsino?: NivelEnsino;
  ciclo?: string;
  classesPermitidas?: string[];
  descricao?: string;
  ativo?: boolean;
  atualizadoEm?: string;
}

export interface ClasseEscolar {
  id: string;
  escolaId?: string;
  nome: string; // "Iniciação", "1ª", "2ª", ..., "13ª"
  nivelEnsino?: NivelEnsino;
  descricao?: string;
  ordem?: number;
  ciclo?: string;
  regimeAvaliacao?: string;
  ativa?: boolean;
  anoLectivo?: string;
  atualizadoEm?: string;
}

export type NivelCoordenacaoEnsino = 'Primario' | 'ICiclo' | 'IICiclo';

export type TipoCoordenacaoEscolar =
  | 'Coordenador Pedagógico'
  | 'Coordenador da Iniciação'
  | 'Coordenador de Turno'
  | 'Coordenador de Classe'
  | 'Coordenador de Turma'
  | 'Coordenador de Disciplina'
  | 'Coordenador de Área Disciplinar'
  | 'Coordenador de Curso / Área de Formação'
  | 'Coordenador de Estágio / PAP';

export interface CoordenacaoEscolar {
  id: string;
  escolaId: string;
  anoLectivo: string;
  nivelEnsino: NivelCoordenacaoEnsino;
  tipoCoordenacao: TipoCoordenacaoEscolar | string;
  funcionarioId: string;
  funcionarioNome: string;
  professorId?: string;
  professorNome?: string;
  turno?: string;
  classe?: string;
  turmaId?: string;
  turmaNome?: string;
  disciplinaId?: string;
  disciplinaNome?: string;
  curso?: string; // Exclusivo IIº Ciclo
  areaDisciplinar?: string;
  observacoes?: string;
  ativo: boolean;
  criadoPorNome?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// ==========================================
// SOLICITAÇÃO DE APOIO TÉCNICO AO ADMINISTRADOR GERAL
// ==========================================

export interface SolicitacaoApoioTecnico {
  id: string;
  escolaId: string;
  escolaNome?: string;
  nomeEscola?: string;
  diretorId?: string;
  diretorNome?: string;
  solicitadoPorNome?: string;
  assunto?: string;
  motivo?: string;
  descricao?: string;
  descricaoProblema?: string;
  categoria?: 
    | 'Problema no Lançamento de Notas' 
    | 'Falha de Conexão/Sincronização' 
    | 'Recuperação de Dados' 
    | 'Configuração de Pautas' 
    | 'Auditoria Técnica' 
    | 'Outro'
    | string;
  prioridade?: 'Baixa' | 'Média' | 'Media' | 'Alta' | 'Urgente' | 'Critica' | string;
  urgencia?: 'Baixa' | 'Média' | 'Media' | 'Alta' | 'Urgente' | 'Critica' | string;
  estado?: 'Pendente' | 'Aberto' | 'Em_Atendimento' | 'Resolvido' | 'Concluido' | 'Recusado' | string;
  status?: 'Pendente' | 'Aberto' | 'Em_Atendimento' | 'Resolvido' | 'Concluido' | 'Recusado' | string;
  dataSolicitacao: string;
  atualizadoEm?: string;
  respostaTecnica?: string;
  atendidoPorAdminNome?: string;
  dataResolucao?: string;
  autorizacaoAcessoConcedida?: boolean;
  autorizacaoAcessoValida?: boolean;
}

// ==========================================
// SEGURANÇA, ALERTAS & CONTROLO FORENSE
// ==========================================

export interface AlertaSeguranca {
  id: string;
  tipo: 'TENTATIVAS_EXCEDIDAS' | 'BLOQUEIO_CONTA' | 'ACESSO_NAO_AUTORIZADO' | 'INTEGRIDADE_VIOLADA' | 'SUSPEITA_BURLA';
  identificador: string;
  ip: string;
  dataHora: string;
  tentativas: number;
  detalhes: string;
  resolvido: boolean;
  resolvidoPor?: string;
  dataResolucao?: string;
}

export interface TentativaLogin {
  identificador: string;
  ip: string;
  tentativas: number;
  ultimoErroEm: string;
  bloqueadoAte?: string;
}

// ==========================================
// CONFIGURAÇÃO DINÂMICA DE PASSES ESCOLARES (8 POR A4)
// ==========================================

export interface ElementoPasseConfig {
  id: string;
  chave: 
    | 'foto' 
    | 'insignia' 
    | 'logotipo' 
    | 'nome' 
    | 'numeroProcesso' 
    | 'numeroBI' 
    | 'classeTurma' 
    | 'turno' 
    | 'curso' 
    | 'encarregado' 
    | 'contactoEmergencia' 
    | 'validade' 
    | 'qrCode' 
    | 'codigoBarras' 
    | 'assinaturaDiretor';
  rotulo: string;
  ativo: boolean;
  ordem: number;
  posicao?: 'esquerda' | 'direita' | 'centro' | 'topo' | 'rodape';
}

export interface ConfiguracaoPassesEscola {
  corPrimaria: string; // hex ex: "#1e3a8a"
  corSecundaria: string; // hex ex: "#f59e0b"
  corTexto: string; // hex ex: "#ffffff"
  corTextoSecundario?: string; // hex ex: "#1e293b"
  corFundoFrente: string; // ex: "#ffffff"
  corBorda?: string; // ex: "#1e3a8a"
  estiloTarja: 'gradiente' | 'solido' | 'elegante_dourado' | 'minimalista';
  formatoLayout?: 'classico_horizontal' | 'moderno_faixa' | 'vertical_cracha' | 'bicolor_institucional' | 'minimalista_med';
  tipoFundo?: 'solido' | 'gradiente_suave' | 'marca_dagua';
  mostrarVerso: boolean;
  regrasVerso: string[];
  elementos: ElementoPasseConfig[];
  disposicaoGrade: '8_por_folha' | '4_por_folha' | 'individual';
  orientacao: 'horizontal' | 'vertical';
  chancelaDigitalAtiva: boolean;
  assinaturaDiretorUrl?: string; // Assinatura digitalizada do diretor
  tamanhoFoto?: 'padrao' | 'grande' | 'maximo'; // Tamanho ampliado da foto 3x4
  atualizadoEm?: string;
}

// ==========================================
// HORÁRIOS ESCOLARES SEM COINCIDÊNCIA DE TEMPO & NOTIFICAÇÕES
// ==========================================

export type DiaSemana = 
  | 'Segunda-feira' 
  | 'Terça-feira' 
  | 'Quarta-feira' 
  | 'Quinta-feira' 
  | 'Sexta-feira' 
  | 'Sábado';

export interface TempoLectivoDefinicao {
  numeroTempo: number; // 1 a 6
  horaInicio: string; // "07:15"
  horaFim: string; // "08:00"
  turno: 'Manhã' | 'Tarde' | 'Noite';
}

export interface HorarioAulaItem {
  id: string;
  escolaId: string;
  turmaId: string;
  turmaNome?: string;
  classe: string;
  diaSemana: DiaSemana;
  numeroTempo: number; // 1 a 6
  horaInicio: string;
  horaFim: string;
  disciplinaId: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  sala: string;
  anoLectivo: string;
  atualizadoEm?: string;
}

export interface NotificacaoAulaProfessor {
  id: string;
  professorId: string;
  tipo: '5_MIN_ANTES' | 'INICIO_EXACTO' | '5_MIN_FIM';
  titulo: string;
  mensagem: string;
  horarioItem: HorarioAulaItem;
  timestamp: string;
  lida: boolean;
}

// ==========================================
// FICHAS DE PRESENÇAS DOS ALUNOS POR PERÍODO
// ==========================================

export interface PresencaAlunoItem {
  id: string;
  escolaId: string;
  turmaId: string;
  alunoId: string;
  disciplinaId?: string;
  data: string; // "YYYY-MM-DD"
  tempoLectivo?: number;
  estado: 'Presente' | 'Falta_Justificada' | 'Falta_Injustificada';
  justificativa?: string;
  registadoPorId: string;
  registadoPorNome: string;
  anoLectivo?: string;
  atualizadoEm?: string;
}

// ==========================================
// REGISTO DE ALTERAÇÃO EXECUTIVA DE NOTAS PELA DIREÇÃO (COM LOG NO PROFESSOR)
// ==========================================

export interface RegistroAlteracaoNotaDirecao {
  id: string;
  escolaId: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  classe: string;
  curso?: string;
  disciplinaId: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  trimestre: Trimestre;
  tipoNota: 'MAC' | 'NPP' | 'NPT' | 'MT' | 'Exame';
  notaAnterior: number;
  notaAnteriorEmFalta?: boolean;
  novaNota: number;
  motivoJustificativa: string;
  alteradoPorId: string;
  alteradoPorNome: string;
  alteradoPorRole: 'DiretorGeral' | 'SubdiretorPedagogico' | 'AdminGeral';
  dataHora: string;
  lidoPeloProfessor?: boolean;
  anoLectivo?: string;
  atualizadoEm?: string;
}

// ==========================================
// CONFIGURAÇÃO DE DIZERES E DISPOSIÇÃO DE DOCUMENTOS COM PRÉ-VISUALIZAÇÃO
// ==========================================

export interface ConfiguracaoCamposDocumento {
  // Dados da Escola
  mostrarProvinciaMunicipio: boolean;
  mostrarGovernoGabinete: boolean;
  mostrarNif: boolean;
  mostrarDecreto: boolean;
  mostrarContatosEmail: boolean;
  mostrarDataLocalExtenso: boolean;
  // Dados do Aluno
  mostrarFoto: boolean;
  mostrarNumeroProcessoMatricula: boolean;
  mostrarNumeroOrdem: boolean;
  mostrarBI: boolean;
  mostrarDataEmissaoBI: boolean;
  mostrarFiliacao: boolean;
  mostrarDataNascimento: boolean;
  mostrarNaturalidadeProvincia: boolean;
  mostrarResidencia: boolean;
  mostrarEncarregado: boolean;
  mostrarContactoEncarregado: boolean;
  mostrarTurmaSalaTurno: boolean;
  mostrarCurso: boolean;
  mostrarLivroFolhaRegisto: boolean;
  // Dados Académicos & Avaliações
  mostrarMacNppNptDetalhado: boolean;
  mostrarFaltas: boolean;
  mostrarComportamento: boolean;
  mostrarMediaGeral: boolean;
  mostrarSituacaoFinal: boolean;
  mostrarEscalaExtenso: boolean;
  mostrarHistoricoOcorrencias: boolean;
  // Dados do Funcionário
  mostrarFuncionarioFoto: boolean;
  mostrarFuncionarioBI: boolean;
  mostrarFuncionarioNif: boolean;
  mostrarFuncionarioContatos: boolean;
  mostrarFuncionarioNumeroAgente: boolean;
  mostrarFuncionarioGrauEspecialidade: boolean;
  mostrarFuncionarioCategoriaContrato: boolean;
  mostrarFuncionarioDadosBancariosIbanInss: boolean;
  mostrarFuncionarioCargaHoraria: boolean;
}

export interface ConfiguracaoDocumentoCustomizado {
  id: string;
  escolaId: string;
  tipoDocumento: string; // 'boletim_oficial' | 'pauta_trimestral' | 'certificado' | 'declaracao_notas' | 'declaracao_matricula' | 'termo_exame' | 'ficha_individual_aluno' | 'ficha_individual_funcionario' | 'ficha_presencas' | 'cartao_estudante' | 'guia_transferencia' | 'recibo_pagamento'
  tituloOficial: string;
  subtitulo: string;
  textoCabecalho: string;
  textoCorpoAbertura: string;
  textoFechamento: string;
  textoRodape: string;
  artigoLegalDecreto: string;
  atualizadoEm?: string;
  disposicao: {
    orientacao: 'retrato' | 'paisagem';
    alinhamentoLogo: 'centro' | 'esquerda' | 'duplo';
    exibirInsigniaRepublica: boolean;
    exibirLogoEscola: boolean;
    exibirCarimboBranco: boolean;
    exibirCodigoQR: boolean;
    exibirAssinaturaDiretor: boolean;
    exibirAssinaturaSubdiretor: boolean;
    exibirAssinaturaSecretaria: boolean;
    exibirAssinaturaProfessor: boolean;
    tamanhoFonte: 'compacto' | 'padrao' | 'grande';
    corDestaque: string;
  };
  camposDados?: ConfiguracaoCamposDocumento;
}

// ==========================================
// UTILIZADORES ONLINE E HISTÓRICO DE ACESSOS (24H)
// ==========================================

export interface SessaoAtivaUsuario {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  escolaId: string;
  escolaNome?: string;
  cargo?: string;
  ip: string;
  ultimoAcesso: number; // timestamp ms
  loginTime: number;
  online: boolean;
}

// ==========================================
// DELEGAÇÃO DE PODERES E AUDITORIA EXECUTIVA
// ==========================================

export type TipoDelegacao = 'Matriculas' | 'CobrancaEmolumentos' | 'Interinidade';

export interface RelatorioFinalInterinidade {
  delegacaoId: string;
  escolaId: string;
  titularId: string;
  titularNome: string;
  titularCargo: string;
  interinoId: string;
  interinoNome: string;
  interinoCargoOriginal: string;
  cargoExercidoRole: UserRole | string;
  cargoExercidoTitulo: string;
  dataInicio: string;
  dataFimRevogacao: string;
  revogadoPorId?: string;
  revogadoPorNome: string;
  totalAcoesAuditadas: number;
  acoesPorModulo: Array<{ acao: string; quantidade: number }>;
  ultimosRegistos: Array<{ id: string; dataHora: string; acao: string; detalhe: string }>;
  resumoExecutivo: string;
  geradoEm: string;
}

export interface DelegacaoPoderes {
  id: string;
  escolaId: string;
  delegadoPorId: string;
  delegadoPorNome: string;
  delegadoPorCargo: UserRole | string;
  delegadoPorRole?: UserRole;
  funcionarioId: string;
  funcionarioNome: string;
  funcionarioCargo: string;
  tipo: TipoDelegacao; // 'Matriculas', 'CobrancaEmolumentos' ou 'Interinidade'
  cargoDelegadoRole?: UserRole; // Perfil completo assumido durante interinidade
  cargoDelegadoTitulo?: string; // Rótulo legível do cargo interinado
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD (opcional; Interinidade só termina por revogação do titular)
  ativo: boolean;
  motivo?: string;
  criadoEm: string;
  atualizadoEm?: string;
  revogadoPorId?: string;
  revogadoPorNome?: string;
  revogadoEm?: string;
  relatorioRevogacao?: RelatorioFinalInterinidade;
}

export interface AcaoDelegadaLog {
  id: string;
  escolaId: string;
  delegacaoId?: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: TipoDelegacao;
  acao: 'Matricula' | 'Confirmacao' | 'Cobranca' | 'Anulacao' | 'Interinidade' | 'Outro';
  detalhes: string;
  alunoId?: string;
  alunoNome?: string;
  valorCobrado?: number;
  numeroRecibo?: string;
  formaPagamento?: string;
  dataHora: string;
}

export type TipoAcessoBiblioteca =
  | 'Entrada_Biblioteca'
  | 'Consulta_Local'
  | 'Emprestimo_Livro'
  | 'Devolucao_Livro';

export interface RegistoAcessoBiblioteca {
  id: string;
  escolaId: string;
  alunoId: string;
  alunoNome: string;
  codigoMatricula: string;
  alunoCodigo?: string;
  numeroProcesso?: string;
  turmaNome?: string;
  classe?: string;
  tipoAcesso: TipoAcessoBiblioteca;
  livroId?: string;
  livroTitulo?: string;
  observacao?: string;
  dataHora: string;
  dataDia: string;
  operadorId: string;
  operadorNome: string;
  registadoPorId?: string;
  registadoPorNome?: string;
  codigoQr?: string;
  atualizadoEm?: string;
}

export type NotificacaoSistemaCategoria =
  | 'SOLICITACAO_NOTA'
  | 'ALTERACAO_NOTA_DIRECAO'
  | 'OCORRENCIA_ESCOLAR'
  | 'MENSAGEM_BIBLIOTECA'
  | 'COMUNICACAO'
  | 'MUDANCA_TEMPO'
  | 'TERMINO_TEMPO'
  | 'SISTEMA';

export interface NotificacaoSistemaItem {
  id: string;
  escolaId: string;
  destinatarioUserId?: string;
  categoria: NotificacaoSistemaCategoria;
  titulo: string;
  mensagem: string;
  detalhes?: string;
  urgente?: boolean;
  lida: boolean;
  criadaEm: string;
  tagSW?: string;
  navegacao?: {
    tab: string;
    subTab?: string;
    entityId?: string;
  };
}

export interface PreferenciasNotificacaoSW {
  somAtivo: boolean;
  notificarSolicitacoesNota: boolean;
  notificarAlteracoesNotaDirecao?: boolean;
  notificarOcorrencias?: boolean;
  notificarBibliotecaUrgente: boolean;
  notificarComunicacoes: boolean;
  notificarMudancaTempo: boolean;
  notificarTerminoTempo: boolean;
  avisoPrevio5Min: boolean;
  executarEmSegundoPlanoSW: boolean;
}

export type TipoEventoCalendarioCor =
  | 'blue'
  | 'red'
  | 'amber'
  | 'emerald'
  | 'indigo'
  | 'purple'
  | 'teal'
  | 'rose';

export interface TipoEventoCalendarioCustom {
  id: string;
  nome: string;
  cor: TipoEventoCalendarioCor;
  padraoSistema?: boolean;
  escolaId?: string;
  criadoPor?: string;
  criadoEm?: string;
}

export type CategoriaRelatorioAcontecimento =
  | 'Reuniao'
  | 'Palestra'
  | 'Evento'
  | 'Desenvolvimento'
  | 'Ocorrencia';

export type VisibilidadeRelatorioAcontecimento =
  | 'Publico_Escola'
  | 'Direcao'
  | 'Docente_Turma'
  | 'Rede_Nacional';

export type EstadoRelatorioAcontecimento =
  | 'Rascunho'
  | 'Registado'
  | 'Homologado';

export interface RelatorioAcontecimento {
  id: string;
  escolaId: string;
  escolaNome?: string;
  anoLectivo: string;
  trimestre?: string;
  categoria: CategoriaRelatorioAcontecimento;
  subtipo?: string; // Ex: "Conselho de Turma", "Seminário", "Jornada Pedagógica", "Infraestrutura", "Inspecção"
  titulo: string;
  data: string; // YYYY-MM-DD
  hora?: string;
  local?: string;
  organizadorId?: string;
  organizadorNome: string;
  organizadorRole?: UserRole | string;
  participantes?: string;
  numeroParticipantes?: number;
  publicoAlvo: 'Toda a Comunidade' | 'Professores' | 'Encarregados' | 'Estudantes' | 'Direção' | 'Rede Nacional';
  turmaId?: string;
  turmaNome?: string;
  classe?: string;
  turno?: string;
  disciplinaId?: string;
  disciplinaNome?: string;
  resumoAcontecimentos: string;
  deliberacoesEncaminhamentos?: string;
  resultadosObtidos?: string;
  nivelVisibilidade: VisibilidadeRelatorioAcontecimento;
  estado: EstadoRelatorioAcontecimento;
  homologadoPorNome?: string;
  homologadoEm?: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoPorRole: UserRole | string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface TipoCoordenacaoPersonalizada {
  id: string;
  escolaId: string;
  nivelEnsino: NivelCoordenacaoEnsino;
  tipo: string;
  descricao: string;
  requerClasse?: boolean;
  requerTurma?: boolean;
  requerDisciplina?: boolean;
  requerCurso?: boolean;
  requerTurno?: boolean;
  requerAreaDisciplinar?: boolean;
  criadoPorId?: string;
  criadoPorNome?: string;
  criadoEm: string;
  atualizadoEm?: string;
  ativo?: boolean;
}

export interface SecaoRelatorioPedagogico {
  id: string;
  titulo: string;
  conteudo: string;
}

export type TipoRelatorioPedagogicoFormal = 'COORDENACAO_FINAL_ANO' | 'DOCENTE_TRIMESTRAL_ANUAL';
export type PeriodoRelatorioPedagogico = '1' | '2' | '3' | 'Anual';
export type EstadoRelatorioPedagogico = 'Rascunho' | 'Finalizado' | 'Homologado';

export interface RelatorioPedagogicoFormal {
  id: string;
  escolaId: string;
  escolaNome?: string;
  anoLectivo: string;
  tipoRelatorio: TipoRelatorioPedagogicoFormal;
  periodoReferencia: PeriodoRelatorioPedagogico;
  coordenacaoId?: string;
  coordenacaoTipo?: string;
  nivelEnsino?: NivelCoordenacaoEnsino;
  classeAlvo?: string;
  turmaId?: string;
  turmaNome?: string;
  disciplinaId?: string;
  disciplinaNome?: string;
  cursoAlvo?: string;
  turnoAlvo?: string;
  areaDisciplinarAlvo?: string;
  professorId?: string;
  professorNome?: string;
  professorGenero?: 'M' | 'F';
  tituloDocumento: string;
  subtituloDocumento?: string;
  sinteseExecutiva: string;
  atividadesRealizadas: string;
  dificuldadesConstrangimentos: string;
  recomendacoes: string;
  conclusaoFinal: string;
  secoesPersonalizadas?: SecaoRelatorioPedagogico[];
  incluirTabelasEstatisticas?: boolean;
  incluirDetalhePorTurmaDisciplina?: boolean;
  incluirOcorrencias?: boolean;
  estado: EstadoRelatorioPedagogico;
  homologadoPorNome?: string;
  homologadoEm?: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm?: string;
  estatisticasSnapshot?: Record<string, any>;
}

// ==========================================
// PLANO DE ATIVIDADES E EVENTOS (HIERÁRQUICO POR ÁREA E PERFIL)
// ==========================================

export type AreaPlanoAtividades =
  | 'Direcao_Geral'
  | 'Subdirecao_Pedagogica'
  | 'Subdirecao_Administrativa'
  | 'Coordenacao_Pedagogica'
  | 'Secretaria_Geral';

export type EstadoAtividadePlano =
  | 'Planeada'
  | 'Em_Curso'
  | 'Realizada'
  | 'Adiada'
  | 'Cancelada';

export type CategoriaAtividadePlano =
  | 'Pedagógica'
  | 'Administrativa'
  | 'Evento'
  | 'Reunião'
  | 'Avaliação'
  | 'Extracurricular'
  | 'Infraestrutura'
  | 'Secretaria';

export interface AtividadePlanoEscolar {
  id: string;
  escolaId: string;
  anoLectivo: string;
  trimestre: '1' | '2' | '3' | 'Anual';
  titulo: string;
  descricao: string;
  categoria: CategoriaAtividadePlano;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string;
  hora?: string;
  local?: string;
  publicoAlvo: string;
  objetivos?: string;
  recursosNecessarios?: string;
  areaOrigem: AreaPlanoAtividades;
  perfilOrigemRole: UserRole | string;
  perfilOrigemLabel?: string;
  coordenacaoTipo?: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoPorGenero?: 'M' | 'F';
  responsavelExecucaoNome?: string;
  estadoExecucao: EstadoAtividadePlano;
  percentualCumprimento: number; // 0 a 100
  observacoesCumprimento?: string;
  evidenciasResultados?: string;
  excluidaDoPlanoGeralPorDiretor?: boolean;
  motivoExclusaoDiretor?: string;
  excluidaPorId?: string;
  excluidaPorNome?: string;
  excluidaEm?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// ==========================================
// FINANÇAS PESSOAIS DO UTILIZADOR ("MINHAS FINANÇAS")
// ==========================================

export type TipoTransacaoPessoal = 'Receita' | 'Despesa';

export interface TransacaoPessoal {
  id: string;
  userId: string;
  tipo: TipoTransacaoPessoal;
  categoria: string;
  descricao: string;
  valorKz: number;
  data: string; // YYYY-MM-DD
  recorrente?: boolean;
  notas?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface OrcamentoCategoriaPessoal {
  categoria: string;
  limiteMensalKz: number;
}

export interface MetaPoupancaPessoal {
  id: string;
  titulo: string;
  objetivoKz: number;
  atualKz: number;
  prazo?: string; // YYYY-MM-DD
  prioridade: 'Alta' | 'Média' | 'Baixa';
  criadoEm: string;
  atualizadoEm?: string;
}

export interface DividaPessoal {
  id: string;
  credor: string;
  descricao: string;
  valorTotalKz: number;
  valorPagoKz: number;
  prestacaoMensalKz?: number;
  taxaJuroAnual?: number;
  vencimento?: string; // YYYY-MM-DD
  estado: 'Ativa' | 'Quitada';
  criadoEm: string;
  atualizadoEm?: string;
}

export interface DadosFinancasPessoaisUsuario {
  id: string; // igual ao userId
  userId: string;
  userNome?: string;
  escolaId?: string;
  transacoes: TransacaoPessoal[];
  orcamentosPorMes: Record<string, OrcamentoCategoriaPessoal[]>; // chave YYYY-MM
  metasPoupanca: MetaPoupancaPessoal[];
  dividas: DividaPessoal[];
  atualizadoEm: string;
}

// ==========================================
// HORÁRIOS DE PROVAS, MAPAS DE FISCALIZAÇÃO (1-4 PROFS/TURMA) & ATAS DE PROVAS
// ==========================================

export type TipoProvaEscolar =
  | 'Prova do Professor'
  | 'Prova Trimestral'
  | 'Exame Final'
  | 'Exame Nacional'
  | 'Prova de Recurso'
  | 'Prova Especial';

export interface HorarioProvaItem {
  id: string;
  escolaId: string;
  anoLectivo: string;
  trimestre: Trimestre | 'Época Única' | 'Recurso';
  tipoProva: TipoProvaEscolar;
  nivelEnsino: NivelEnsino;
  classe: string;
  curso?: string; // Exclusivo IIº Ciclo
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  sala?: string;
  duracaoMinutos?: number;
  observacoes?: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface ProfessorFiscalizadorItem {
  professorId: string;
  professorNome: string;
  papelFiscalizacao: 'Fiscal Principal' | 'Fiscal Adjunto';
}

export interface MapaFiscalizacaoProva {
  id: string;
  escolaId: string;
  anoLectivo: string;
  horarioProvaId: string;
  turmaId: string;
  turmaNome: string;
  classe: string;
  curso?: string;
  disciplinaId: string;
  disciplinaNome: string;
  tipoProva: TipoProvaEscolar;
  trimestre: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  sala?: string;
  fiscais: ProfessorFiscalizadorItem[]; // 1 a 4 professores
  instrucoes?: string;
  escalaAutomatica?: boolean;
  usouFallbackConflito?: boolean;
  observacaoConflito?: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface OcorrenciaAtaProva {
  id: string;
  hora: string;
  alunoId?: string;
  alunoNome?: string;
  tipo: 'Fraude / Cábulas' | 'Atraso' | 'Indisciplina' | 'Problema de Saúde' | 'Erro de Enunciado' | 'Outro';
  descricao: string;
  medidaTomada: string;
}

export interface AtaProvaRegistro {
  id: string;
  escolaId: string;
  anoLectivo: string;
  mapaFiscalizacaoId: string;
  horarioProvaId: string;
  turmaId: string;
  turmaNome: string;
  classe: string;
  curso?: string;
  disciplinaId: string;
  disciplinaNome: string;
  tipoProva: TipoProvaEscolar;
  trimestre: string;
  dataProva: string;
  horaInicioReal: string;
  horaFimReal: string;
  sala?: string;
  fiscais: ProfessorFiscalizadorItem[];
  alunosMatriculados: number;
  alunosPresentes: number;
  alunosFaltosos: number;
  alunosAnulados?: number;
  ocorrencias: OcorrenciaAtaProva[];
  sinteseOcorrido: string;
  observacoesGerais?: string;
  estado: 'Rascunho' | 'Finalizada';
  redigidaPorId: string;
  redigidaPorNome: string;
  redigidaPorGenero?: 'M' | 'F';
  criadoEm: string;
  atualizadoEm?: string;
}

export type CategoriaGrupoFerias = 'Administrativo' | 'AuxiliarLimpeza';

export type EstadoFeriasItem = 'Planeada' | 'Aprovada' | 'Em_Curso' | 'Concluida' | 'Adiada' | 'Cancelada';

export interface MapaFeriasItem {
  id: string;
  escolaId: string;
  anoLectivo: string;
  funcionarioId: string;
  funcionarioNome: string;
  numeroAgente?: string;
  cargo: string;
  role: UserRole;
  grupoCategoria: CategoriaGrupoFerias;
  mesPrevisto: string; // Ex: '2026-08' ou 'Agosto'
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  diasUteis: number;
  substitutoId?: string;
  substitutoNome?: string;
  estado: EstadoFeriasItem;
  observacoes?: string;
  criadoPorId: string;
  criadoPorNome: string;
  aprovadoPorNome?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export type CategoriaMaterialLimpeza =
  | 'Detergentes & Desinfetantes'
  | 'Lixívia & Álcool'
  | 'Vassouras, Rodos & Baldes'
  | 'Sacos de Lixo & Descartáveis'
  | 'Papel Higiénico & Toalhas'
  | 'Equipamento de Proteção (Luvas/Máscaras)'
  | 'Outros Materiais';

export type UnidadeMedidaLimpeza = 'Unidade' | 'Litro' | 'Caixa' | 'Pacote' | 'Rolo' | 'Galão' | 'Quilograma';

export interface MaterialLimpezaItem {
  id: string;
  escolaId: string;
  codigo?: string;
  nome: string;
  categoria: CategoriaMaterialLimpeza;
  unidade: UnidadeMedidaLimpeza;
  quantidadeAtual: number;
  quantidadeMinima: number;
  localArmazenamento?: string;
  fornecedor?: string;
  observacoes?: string;
  ultimoMovimentoEm?: string;
  criadoPorId?: string;
  criadoPorNome?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export type TipoMovimentoEstoqueLimpeza = 'Entrada' | 'Saida' | 'Ajuste';

export interface MovimentoEstoqueLimpeza {
  id: string;
  escolaId: string;
  materialId: string;
  materialNome: string;
  unidade: string;
  tipo: TipoMovimentoEstoqueLimpeza;
  quantidade: number;
  quantidadeAnterior: number;
  quantidadeNova: number;
  data: string; // YYYY-MM-DD
  setorDestino?: string;
  motivo: string;
  responsavelId: string;
  responsavelNome: string;
  responsavelRole: UserRole;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm?: string;
}



