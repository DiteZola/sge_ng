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
  subdiretorPedagogicoNome: string;
  chefeSecretariaNome?: string;
  anoLectivoActivo: string;
  trimestreActivo: Trimestre;
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
  // Sessão Provisória de Apoio Técnico Autorizada pelo Diretor
  sessaoApoioTecnicoAtiva?: {
    solicitacaoId: string;
    adminGeralId: string;
    adminGeralNome: string;
    dataInicio: string;
    motivo: string;
  };
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
  tipoDocumento?: 'BI' | 'Cédula' | 'Passaporte';
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
  opcaoCurso?: string; // ex: "Língua Portuguesa e EMC"
  periodo?: 'Matinal' | 'Vespertino' | 'Noturno';
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
}

export interface Turma {
  id: string;
  escolaId: string;
  nome: string; // Ex: "7ª A", "Iniciação B", "12ª CFB-1"
  classe: string; // "Iniciação", "1ª", "2ª", ..., "13ª"
  nivelEnsino: NivelEnsino;
  curso?: string; // "Geral", "Ciências Físicas e Biológicas", "Informática"
  turno: 'Manhã' | 'Tarde' | 'Noite';
  periodo?: 'Matinal' | 'Vespertino' | 'Noturno' | string;
  sala: string;
  capacidade?: number;
  capacidadeMaxima?: number;
  anoLectivo: string;
  coordenadorId?: string; // Professor Coordenador que atua como Presidente da Turma
  ordem?: number;
}

export interface Disciplina {
  id: string;
  nome: string;
  sigla: string;
  codigo?: string;
  cargaHorariaSemanal?: number;
  componente?: 'Geral' | 'Específica' | 'Opção' | string;
  nivelEnsino: NivelEnsino;
  ehTecnica?: boolean;
  ordem?: number;
  classe?: string; // Classe associada (ex: '7ª')
  classes?: string[]; // Classes associadas quando criada para múltiplas classes (ex: ['7ª', '8ª', '9ª'])
  ciclo?: string; // Ciclo curricular (ex: 'Ensino Primário', 'Iº Ciclo', 'IIº Ciclo')
}

export interface AtribuicaoDocente {
  id: string;
  escolaId: string;
  professorId: string;
  turmaId: string;
  disciplinaId: string;
  ehCoordenadorTurma: boolean; // Presidente de Turma
  anoLectivo: string;
}

export interface Funcionario {
  id: string;
  escolaId: string;
  nomeCompleto: string;
  genero: Genero;
  numeroBI: string;
  bi?: string;
  dataEmissaoBI?: string;
  dataValidadeBI?: string;
  localEmissaoBI?: string;
  arquivoIdentificacao?: string;
  nomePai?: string;
  nomeMae?: string;
  dataNascimento?: string;
  naturalidadeProvincia?: string;
  naturalidadeMunicipio?: string;
  nacionalidade?: string; // ex: "Angolana"
  estadoCivil?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | string;
  residencia?: string;
  bairro?: string;
  municipio?: string;
  provincia?: string;
  numeroAgente?: string; // Número de Agente do Ministério / Função Pública
  nif?: string; // Número de Identificação Fiscal
  categoriaProfissional?: string; // ex: "Professor do IIº Ciclo do Ensino Secundário - 6º Grau"
  grauAcademico?: 'Médio' | 'Bacharel' | 'Licenciado' | 'Mestre' | 'Doutor' | string;
  especialidade?: string; // ex: "Ensino da Matemática", "Língua Portuguesa", "Informática"
  comuna?: string;
  altura?: string; // ex: "1.75m"
  tipoContrato?: 'Efectivo' | 'Contratado' | 'Colaborador';
  situacaoFuncional?: 'Activo' | 'Em Comissão de Serviço' | 'Licença de Parto' | 'Licença Sabática' | 'Aposentado' | string;
  cargaHorariaSemanal?: number; // horas lectivas ex: 24
  tempoServicoAnos?: number; // tempo de serviço efectivo em anos
  banco?: string; // ex: "BAI", "BFA", "BIC", "BPC"
  iban?: string; // ex: "AO06.0040.0000.1234.5678.9012.3"
  numeroSegurancaSocial?: string; // INSS ex: "8492014-9"
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
}

export interface NotaEstudante {
  id: string;
  avaliacaoId: string;
  alunoId: string;
  valorNota: number; // 0-10 ou 0-20
  conceitoIniciacao?: ConceitoQualitativoIniciacao;
  dataLancamento: string;
}

export interface NotaTrimestralConsolidada {
  id: string;
  alunoId: string;
  turmaId: string;
  disciplinaId: string;
  trimestre: Trimestre;
  anoLectivo: string;
  mac: number; // Média de Avaliação Contínua (MAC)
  npp?: number; // Nota da Prova do Professor (NPP)
  provaTrimestral: number; // NPP / Prova do Professor
  npt?: number; // Nota de Prova Trimestral (NPT)
  mediaTrimestral: number; // MT
  notaFinal?: number; // MT / CF Final para deliberação do Júri
  notaExame?: number; // Nota do Exame Estadual / Nacional
  comportamentoNota?: number; // 0-20
  comportamentoConceito?: string; // Excelente, Muito Bom, Bom, Regular, Mau
  assiduidadeConceito?: string; // Excelente, Muito Bom, Bom, Regular
  faltas: number;
  validadaPelaDirecao: boolean;
}

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
}

// ==========================================
// MÓDULO COMISSÃO DE JÚRI (CONFORME ESPECIFICAÇÃO MED)
// ==========================================

export type FuncaoMembroJuri = 'Presidente' | 'Secretario' | 'Membro';

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
}

export interface MensagemInterna {
  id: string;
  escolaId: string;
  remetenteId: string;
  remetenteNome: string;
  remetentePapel: string;
  remetenteCargo?: string;
  tipo: 'GERAL' | 'GRUPO' | 'DIRECTA';
  destinatarioTipo?: 'Todos' | 'Docentes' | 'Secretaria' | 'Individual';
  destinatarioId?: string;
  destinatarioNome?: string;
  grupo?: string; // ex: "Corpo Docente", "Turma 7ª A"
  titulo: string;
  assunto?: string;
  conteudo: string;
  dataHora: string;
  criadaEm?: string;
  lida?: boolean;
}

export type Mensagem = MensagemInterna;

export interface DocumentoBiblioteca {
  id: string;
  escolaId: string;
  titulo: string;
  autor: string;
  categoria: string;
  classe?: string;
  tamanhoBytes: number;
  tamanhoMb?: number;
  url: string;
  arquivoUrl?: string;
  dataUpload: string;
  carregadoEm?: string;
  uploadPorNome: string;
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
  periodicidade: 'Unico' | 'Mensal' | 'Anual' | 'Por_Solicitacao';
  classesAbrangidas: string[]; // ['Todas'] ou ['Iniciação', '1ª', ...]
  obrigatorio: boolean;
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
  mesReferencia?: string; // ex: "Outubro 2025"
  anoLectivo: string;
  valorKz: number;
  multaKz?: number;
  valorTotalKz: number;
  metodoPagamento: MetodoPagamentoEscolar;
  numeroComprovativo?: string;
  numeroRecibo: string;
  dataHora: string;
  operadorId: string;
  operadorNome: string;
  observacao?: string;
  observacoes?: string;
  status: 'Confirmado' | 'Pendente' | 'Anulado';
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
  descricao: string;
  registadoPor: string;
  cargo: 'Professor' | 'Coordenador' | 'Diretor' | 'Secretário' | string;
  anoLectivo: string;
  classe?: string;
  turmaNome?: string;
  resolucao?: string;
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
}

// ==========================================
// ESTRUTURAS DE GESTÃO DE ANOS LECTIVOS & CALENDÁRIO
// ==========================================

export interface PeriodoTrimestre {
  trimestre: Trimestre;
  nome: string; // "Iº Trimestre", "IIº Trimestre", "IIIº Trimestre"
  dataInicio: string;
  dataFim: string;
  estado: 'Aberto' | 'Fechado';
  pesoPercentual?: number;
}

export interface AnoLectivoConfig {
  id: string; // ex: "ano-2025-2026"
  rotulo: string; // "2025/2026"
  ano?: string;
  dataInicio: string;
  dataFim: string;
  estado: EstadoAno; // 'Aberto' | 'Fechado' | 'Congelado'
  trimestres: PeriodoTrimestre[];
  descricao?: string;
  criadoEm: string;
}

export interface TurnoConfig {
  id: string;
  nome: 'Manhã' | 'Tarde' | 'Noite' | string;
  horaInicio: string; // ex: "07:30"
  horaFim: string; // ex: "12:30"
  temposLectivos: number; // ex: 5 ou 6 tempos
  intervaloMinutos: number; // ex: 20 min
  toleranciaMinutos?: number;
  diasSemana?: string[];
  ativo: boolean;
}

export interface ClasseConfig {
  id: string;
  nome: string;
  ciclo?: string;
  regimeAvaliacao?: string;
  ativa?: boolean;
  nivelEnsino?: NivelEnsino;
  descricao?: string;
  ordem?: number;
}

export interface CursoConfig {
  id: string;
  nome: string;
  codigo?: string;
  area: string;
  duracao: string;
  descricao?: string;
  ativo?: boolean;
}

export interface ClasseEscolar {
  id: string;
  nome: string; // "Iniciação", "1ª", "2ª", ..., "13ª"
  nivelEnsino?: NivelEnsino;
  descricao?: string;
  ordem?: number;
  ciclo?: string;
  regimeAvaliacao?: string;
  ativa?: boolean;
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
  estado?: 'Pendente' | 'Em_Atendimento' | 'Resolvido' | 'Concluido' | string;
  status?: 'Pendente' | 'Em_Atendimento' | 'Resolvido' | 'Concluido' | string;
  dataSolicitacao: string;
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
  corFundoFrente: string; // ex: "#ffffff"
  estiloTarja: 'gradiente' | 'solido' | 'elegante_dourado' | 'minimalista';
  mostrarVerso: boolean;
  regrasVerso: string[];
  elementos: ElementoPasseConfig[];
  disposicaoGrade: '8_por_folha' | 'individual';
  orientacao: 'horizontal' | 'vertical';
  chancelaDigitalAtiva: boolean;
  assinaturaDiretorUrl?: string; // Assinatura digitalizada do diretor
  tamanhoFoto?: 'padrao' | 'grande' | 'maximo'; // Tamanho ampliado da foto 3x4
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
  novaNota: number;
  motivoJustificativa: string;
  alteradoPorId: string;
  alteradoPorNome: string;
  alteradoPorRole: 'DiretorGeral' | 'SubdiretorPedagogico' | 'AdminGeral';
  dataHora: string;
  lidoPeloProfessor?: boolean;
}

// ==========================================
// CONFIGURAÇÃO DE DIZERES E DISPOSIÇÃO DE DOCUMENTOS COM PRÉ-VISUALIZAÇÃO
// ==========================================

export interface ConfiguracaoDocumentoCustomizado {
  id: string;
  escolaId: string;
  tipoDocumento: string; // 'boletim_oficial' | 'pauta_trimestral' | 'certificado' | 'declaracao_notas' | 'declaracao_matricula' | 'termo_exame' | 'cartao_estudante' | 'guia_transferencia' | 'recibo_pagamento'
  tituloOficial: string;
  subtitulo: string;
  textoCabecalho: string;
  textoCorpoAbertura: string;
  textoFechamento: string;
  textoRodape: string;
  artigoLegalDecreto: string;
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

export type TipoDelegacao = 'Matriculas' | 'CobrancaEmolumentos';

export interface DelegacaoPoderes {
  id: string;
  escolaId: string;
  delegadoPorId: string;
  delegadoPorNome: string;
  delegadoPorCargo: 'DiretorGeral' | 'SubdiretorAdministrativo' | 'SubdirectorAdministrativo' | 'ChefeSecretaria' | 'AdminGeral';
  funcionarioId: string;
  funcionarioNome: string;
  funcionarioCargo: string;
  tipo: TipoDelegacao; // 'Matriculas' ou 'CobrancaEmolumentos'
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD (opcional)
  ativo: boolean;
  motivo?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface AcaoDelegadaLog {
  id: string;
  escolaId: string;
  delegacaoId?: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: TipoDelegacao;
  acao: 'Matricula' | 'Confirmacao' | 'Cobranca' | 'Anulacao';
  detalhes: string;
  alunoId?: string;
  alunoNome?: string;
  valorCobrado?: number;
  numeroRecibo?: string;
  formaPagamento?: string;
  dataHora: string;
}



