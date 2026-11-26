import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Calculator, 
  Sliders, 
  Check, 
  X, 
  AlertTriangle, 
  AlertCircle,
  Printer, 
  Send, 
  Layers, 
  Info,
  CheckCircle2,
  Lock,
  History,
  Search,
  School,
  ShieldCheck,
  UserCheck,
  FileText,
  Trophy,
  ShieldAlert,
  Award,
  Download,
  Loader2,
  Bell,
  CheckCheck,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { StudentRankingSection } from './StudentRankingSection';
import {
  getTurmasPorClasse,
  normalizarClasse,
  isSegundoCiclo,
  isPrimeiroCiclo,
  isEnsinoPrimario,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  TODAS_CLASSES_OFICIAIS_MED,
  getSalaDaTurma,
  getCursoDaTurma,
  getDisciplinasDaTurma,
  filtrarDisciplinasDaClasse,
  getDisciplinasPermitidasProfessor
} from '../services/academicHierarchyService';
import { ordenarClassesMED } from '../utils/enrollmentProgression';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  Funcionario, 
  Aluno, 
  TipoAvaliacaoConfig, 
  RegraCalculoMAC, 
  AvaliacaoCriada, 
  NotaEstudante, 
  NotaTrimestralConsolidada,
  SolicitacaoAlteracaoNota,
  RegistroAlteracaoNotaDirecao
} from '../types';
import { dbService } from '../services/storage';
import * as XLSX from 'xlsx';
import { formatarDataHoraAngolana, hojeAngolano } from '../utils/dateFormat';
import { 
  calcularMACEstudante, 
  calcularNotaTrimestralDinamica,
  calcularMediaFinal3Trimestre,
  converterComportamentoParaConceito, 
  obterEscalaMaximaPorNivel,
  obterInformacaoEscala,
  formatarTextoPorGenero,
  avaliarExpressaoNota,
  isClasseFinal,
  obterObservacaoDisciplina
} from '../services/macEngine';
import {
  aplicarNotasAdministrativas,
  calcularNotasAdministrativasProporcionais,
  ModoAplicacaoNotaAdministrativa,
  resolverProfessoresAtribuidosDisciplina,
  TipoComponenteNotaAdministrativa
} from '../services/administrativeGradeService';
import { handleStrictNumericKeyDown, handleStrictNumericPaste } from './StrictNumericInput';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { exportarPautaTrimestralComFormulasExcel } from '../utils/pautaExcelExporter';
import { InsigniaAngola } from '../constants/insignia';
import { 
  obterNomeDiretorGeral, 
  obterTituloDiretorGeral, 
  obterPresidenteJuri, 
  obterSecretarioJuri, 
  obterVogaisJuri, 
  obterNomeSubdiretorPedagogico, 
  obterTituloSubdiretorPedagogico, 
  obterNomeCoordenadorTurma, 
  obterTituloCoordenadorTurma 
} from '../utils/directorHelper';

interface EvaluationMacViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  disciplinas: Disciplina[];
  alunos: Aluno[];
  tiposAvaliacao: TipoAvaliacaoConfig[];
  regrasMAC: RegraCalculoMAC[];
  avaliacoes: AvaliacaoCriada[];
  notas: NotaEstudante[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  solicitacoes: SolicitacaoAlteracaoNota[];
  atribuicoes?: any[];
  onSalvarTipoAvaliacao: (tipo: TipoAvaliacaoConfig) => void;
  onSalvarRegraMAC: (regra: RegraCalculoMAC) => void;
  onSalvarAvaliacao: (av: AvaliacaoCriada) => void;
  onExcluirAvaliacao: (id: string) => void;
  onSalvarNota: (nota: NotaEstudante) => void;
  onSalvarNotaConsolidada: (cons: NotaTrimestralConsolidada) => void;
  onSalvarSolicitacao: (sol: SolicitacaoAlteracaoNota) => void;
  initialSubTab?: 'lancamento' | 'governanca_mac' | 'solicitacoes' | 'auditoria_direcao' | 'pauta' | 'ranking_turmas';
}

export const EvaluationMacView: React.FC<EvaluationMacViewProps> = ({
  escola,
  currentUser,
  turmas,
  disciplinas,
  alunos,
  tiposAvaliacao,
  regrasMAC,
  avaliacoes,
  notas,
  notasConsolidadas,
  solicitacoes,
  atribuicoes,
  initialSubTab,
  onSalvarTipoAvaliacao,
  onSalvarRegraMAC,
  onSalvarAvaliacao,
  onExcluirAvaliacao,
  onSalvarNota,
  onSalvarNotaConsolidada,
  onSalvarSolicitacao
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'lancamento' | 'governanca_mac' | 'solicitacoes' | 'auditoria_direcao' | 'pauta' | 'ranking_turmas'>(initialSubTab || 'lancamento');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    const handleSubTab = (e: Event) => {
      const sub = (e as CustomEvent<string>).detail;
      if (sub === 'solicitacoes' || sub === 'lancamento' || sub === 'governanca_mac' || sub === 'auditoria_direcao' || sub === 'pauta' || sub === 'ranking_turmas') {
        setActiveSubTab(sub);
      }
    };
    window.addEventListener('sge_open_evaluation_subtab', handleSubTab);
    return () => window.removeEventListener('sge_open_evaluation_subtab', handleSubTab);
  }, []);

  const isProfessor = currentUser.role === 'Professor';

  // Atribuições docentes oficiais da escola
  const atribuicoesTodas = useMemo(() => {
    return atribuicoes || (dbService.getAtribuicoes ? dbService.getAtribuicoes() : []);
  }, [atribuicoes]);

  // Se for Professor, isola estritamente turmas que lhe foram atribuídas
  const atribuicoesDoProfessor = useMemo(() => {
    if (!isProfessor) return [];
    return atribuicoesTodas.filter((a: any) => a.professorId === currentUser.id);
  }, [isProfessor, currentUser.id, atribuicoesTodas]);

  const turmasPermitidas = useMemo(() => {
    if (!isProfessor) return turmas;
    const idsPermitidos = new Set(atribuicoesDoProfessor.map((a: any) => a.turmaId));
    return turmas.filter(t => idsPermitidos.has(t.id));
  }, [turmas, isProfessor, atribuicoesDoProfessor]);

  // Seleções para lançamento de notas com coerência acadêmica oficial
  const todasClasses = useMemo(() => {
    const fromCfg = dbService.getClassesConfigs(escola.id, escola.anoLectivoActivo).filter(c => c.ativa !== false).map(c => c.nome);
    const fromTurmas = turmasPermitidas.map(t => normalizarClasse(t.classe)).filter(Boolean);
    const listaGeral = ordenarClassesMED([
      ...TODAS_CLASSES_OFICIAIS_MED,
      ...fromCfg,
      ...fromTurmas
    ]);
    if (isProfessor) {
      const classesSet = new Set(fromTurmas);
      const filtradas = listaGeral.filter(c => classesSet.has(normalizarClasse(c)));
      return filtradas.length > 0 ? filtradas : Array.from(classesSet);
    }
    return listaGeral;
  }, [escola.id, escola.anoLectivoActivo, isProfessor, turmasPermitidas]);

  const [selectedClasse, setSelectedClasse] = useState<string>(() => {
    return turmasPermitidas[0]?.classe ? normalizarClasse(turmasPermitidas[0].classe) : '10ª';
  });
  const [selectedCursoFilter, setSelectedCursoFilter] = useState<string>('TODOS');
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState<string>('TODOS');

  // Sincronizar classe e turma automaticamente quando as atribuições/turmas do professor carregam
  useEffect(() => {
    if (turmasPermitidas.length === 0) return;
    const temNaClasseAtual = getTurmasPorClasse(turmasPermitidas, selectedClasse).length > 0;
    if (!temNaClasseAtual) {
      const novaCl = normalizarClasse(turmasPermitidas[0].classe);
      if (novaCl) setSelectedClasse(novaCl);
      setSelectedCursoFilter('TODOS');
    }
  }, [turmasPermitidas, selectedClasse]);

  useEffect(() => {
    if (!isSegundoCiclo(selectedClasse) && selectedCursoFilter !== 'TODOS') {
      setSelectedCursoFilter('TODOS');
    }
  }, [selectedClasse, selectedCursoFilter]);

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmasPermitidas[0]?.id || '');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<string>(disciplinas[0]?.id || '');
  const [selectedTrimestre, setSelectedTrimestre] = useState<'1' | '2' | '3'>(() => {
    const t = String(escola.trimestreActivo || '1');
    if (t.includes('3')) return '3';
    if (t.includes('2')) return '2';
    return '1';
  });
  const [buscaAlunoTabela, setBuscaAlunoTabela] = useState<string>('');

  const cursosDisponiveisClasse = useMemo(() => {
    if (!isSegundoCiclo(selectedClasse)) return [];
    const set = new Set<string>();
    dbService.getCursos(escola.id).filter(c => c.ativo !== false).forEach(c => {
      if (c.nome) set.add(c.nome);
    });
    turmasPermitidas.forEach(t => {
      if (isSegundoCiclo(t.classe) && normalizarClasse(t.classe) === normalizarClasse(selectedClasse) && t.curso) {
        set.add(t.curso);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [escola.id, turmasPermitidas, selectedClasse]);

  const turnosDisponiveis = useMemo(() => {
    const set = new Set<string>(['Manhã', 'Tarde', 'Noite']);
    dbService.getTurnosConfigs(escola.id, escola.anoLectivoActivo).filter(t => t.ativo !== false).forEach(t => {
      if (t.nome) set.add(t.nome);
    });
    turmasPermitidas.forEach(t => {
      if (t.turno) set.add(t.turno);
    });
    return Array.from(set);
  }, [escola.id, escola.anoLectivoActivo, turmasPermitidas]);

  // Turmas estritamente filtradas pela classe, curso (apenas IIº Ciclo) e turno selecionados
  const turmasDaClasse = useMemo(() => {
    const porClasse = getTurmasPorClasse(turmasPermitidas, selectedClasse);
    const base = porClasse.length > 0 ? porClasse : turmasPermitidas;
    const aplicarCurso = isSegundoCiclo(selectedClasse) && selectedCursoFilter !== 'TODOS';
    const filtradas = base.filter(t => {
      if (aplicarCurso && (t.curso || '').trim().toLowerCase() !== selectedCursoFilter.trim().toLowerCase()) {
        return false;
      }
      if (selectedTurnoFilter !== 'TODOS' && (t.turno || '').trim().toLowerCase() !== selectedTurnoFilter.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
    return filtradas.length > 0 ? filtradas : base;
  }, [turmasPermitidas, selectedClasse, selectedCursoFilter, selectedTurnoFilter]);

  // Sincronizar turma selecionada quando mudar a classe, curso ou turno
  useEffect(() => {
    if (turmasDaClasse.length > 0 && !turmasDaClasse.some(t => t.id === selectedTurmaId)) {
      setSelectedTurmaId(turmasDaClasse[0].id);
    }
  }, [selectedClasse, turmasDaClasse, selectedTurmaId]);

  // Modal de Criação de Avaliação (Autonomia do Professor)
  const [showNovaAvaliacaoModal, setShowNovaAvaliacaoModal] = useState(false);
  const [novoAvTitulo, setNovoAvTitulo] = useState('');
  const [novoAvTipoId, setNovoAvTipoId] = useState(tiposAvaliacao[0]?.id || '');
  const [novoAvData, setNovoAvData] = useState(new Date().toISOString().split('T')[0]);

  // Modal de Solicitação de Alteração de Nota
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [solAlunoId, setSolAlunoId] = useState('');
  const [solAvaliacaoId, setSolAvaliacaoId] = useState('');
  const [solNotaAtual, setSolNotaAtual] = useState(0);
  const [solNotaProposta, setSolNotaProposta] = useState(0);
  const [solMotivo, setSolMotivo] = useState('');

  // Rastreio de notas digitadas e validação por nível (0-10 Primário, 0-20 I/II Ciclo)
  const [valoresDigitados, setValoresDigitados] = useState<Record<string, string>>({});
  const [nppDigitadas, setNppDigitadas] = useState<Record<string, string>>({});
  const [ptDigitadas, setPtDigitadas] = useState<Record<string, string>>({});
  const [exameDigitados, setExameDigitados] = useState<Record<string, string>>({});
  const [notasInvalidas, setNotasInvalidas] = useState<Record<string, string>>({});

  // Modal de Atribuição de Notas Administrativas Proporcionais (Direção)
  const [modalNotasAdmOpen, setModalNotasAdmOpen] = useState(false);
  const [admClasse, setAdmClasse] = useState<string>('');
  const [admCurso, setAdmCurso] = useState<string>('TODOS');
  const [admTurmaId, setAdmTurmaId] = useState<string>('');
  const [admDisciplinaId, setAdmDisciplinaId] = useState<string>('');
  const [admTrimestre, setAdmTrimestre] = useState<'1' | '2' | '3'>('1');
  const [admAlvoTipo, setAdmAlvoTipo] = useState<TipoComponenteNotaAdministrativa>('PROVA_TRIMESTRAL');
  const [admModoAplicacao, setAdmModoAplicacao] = useState<ModoAplicacaoNotaAdministrativa>('FALTA');
  const [admJustificativa, setAdmJustificativa] = useState('Atribuição administrativa proporcional por incumprimento de prazo de lançamento docente.');
  const [admNotasEditadas, setAdmNotasEditadas] = useState<Record<string, string>>({});
  const [admSelecionados, setAdmSelecionados] = useState<Record<string, boolean>>({});
  const [buscaAuditoriaDirecao, setBuscaAuditoriaDirecao] = useState<string>('');

  // Modal de Configuração de Regra de Cálculo MAC (Direção)
  const [editingRegraNivel, setEditingRegraNivel] = useState<'Primario' | 'ICiclo' | 'IICiclo'>('ICiclo');
  const [regraFormulaTipo, setRegraFormulaTipo] = useState<'ARITMETICA_SIMPLES' | 'PONDERADA_POR_TIPO' | 'FORMULA_CUSTOMIZADA'>('PONDERADA_POR_TIPO');
  const [regraMinAvaliacoes, setRegraMinAvaliacoes] = useState(3);
  const [regraDescartarMenor, setRegraDescartarMenor] = useState(false);
  const [regraPesos, setRegraPesos] = useState<Record<string, number>>({
    'tipo-01': 2,
    'tipo-02': 1,
    'tipo-03': 1
  });

  // Fórmulas trimestrais e pesos (MED Angola / Direção Geral)
  const [regraFormula1Tri, setRegraFormula1Tri] = useState('(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');
  const [regraFormula2Tri, setRegraFormula2Tri] = useState('(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');
  const [regraFormula3Tri, setRegraFormula3Tri] = useState('(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');
  const [regraPesoMac, setRegraPesoMac] = useState(40);
  const [regraPesoNpp, setRegraPesoNpp] = useState(30);
  const [regraPesoNpt, setRegraPesoNpt] = useState(30);
  const [regraFormulaMediaGeral, setRegraFormulaMediaGeral] = useState('(MT1 + MT2 + MT3) / 3');
  const [regraFormulaClassesFinais, setRegraFormulaClassesFinais] = useState('(MDF * 0.4) + (NE * 0.6)');
  const [regraPesoMDF, setRegraPesoMDF] = useState(40);
  const [regraPesoNE, setRegraPesoNE] = useState(60);
  const [regraClassesFinais, setRegraClassesFinais] = useState<string[]>(['6ª', '9ª', '12ª', '13ª']);

  // Simulador de cálculo em tempo real
  const [simMac, setSimMac] = useState(14);
  const [simNpp, setSimNpp] = useState(15);
  const [simNpt, setSimNpt] = useState(16);
  const [simMt1, setSimMt1] = useState(14);
  const [simMt2, setSimMt2] = useState(15);
  const [simMt3, setSimMt3] = useState(16);
  const [simNE, setSimNE] = useState(15);

  // Sincronizar campos quando o diretor seleciona outro nível de ensino
  useEffect(() => {
    const regra = regrasMAC.find(r => r.nivelEnsino === editingRegraNivel);
    if (regra) {
      setRegraFormulaTipo(regra.formulaTipo || 'PONDERADA_POR_TIPO');
      setRegraMinAvaliacoes(regra.minAvaliacoesExigidas || 3);
      setRegraDescartarMenor(!!regra.descartarMenorNota);
      if (regra.pesosPorTipo) setRegraPesos(regra.pesosPorTipo);
      if (regra.formula1Trimestre) setRegraFormula1Tri(regra.formula1Trimestre);
      if (regra.formula2Trimestre) setRegraFormula2Tri(regra.formula2Trimestre);
      if (regra.formula3Trimestre) setRegraFormula3Tri(regra.formula3Trimestre);
      if (regra.pesosTrimestre) {
        setRegraPesoMac(regra.pesosTrimestre.mac || 40);
        setRegraPesoNpp(regra.pesosTrimestre.npp || 30);
        setRegraPesoNpt(regra.pesosTrimestre.npt ?? 30);
      }
      if (regra.formulaMediaGeralClasse) setRegraFormulaMediaGeral(regra.formulaMediaGeralClasse);
      if (regra.formulaClassesFinaisExame) setRegraFormulaClassesFinais(regra.formulaClassesFinaisExame);
      if (regra.pesoMDFClassesFinais !== undefined) setRegraPesoMDF(regra.pesoMDFClassesFinais);
      if (regra.pesoNEClassesFinais !== undefined) setRegraPesoNE(regra.pesoNEClassesFinais);
      if (regra.classesFinaisConfiguradas) setRegraClassesFinais(regra.classesFinaisConfiguradas);
    }
  }, [editingRegraNivel, regrasMAC]);

  // Cálculos simulados em tempo real para testes do Diretor / Administrador
  const simEscalaMaxima = editingRegraNivel === 'Primario' ? 10 : 20;

  const simResultadoTrimestre = useMemo(() => {
    const res = avaliarExpressaoNota(regraFormula1Tri, {
      MAC: simMac,
      NPP: simNpp,
      NPT: simNpt,
      PA: simMac
    });
    if (res !== null) return Math.min(simEscalaMaxima, Math.max(0, Math.round(res * 10) / 10));
    const totalP = (regraPesoMac || 1) + (regraPesoNpp || 1) + (regraPesoNpt || 1);
    const val = ((simMac * regraPesoMac) + (simNpp * regraPesoNpp) + (simNpt * regraPesoNpt)) / totalP;
    return Math.min(simEscalaMaxima, Math.max(0, Math.round(val * 10) / 10));
  }, [regraFormula1Tri, simMac, simNpp, simNpt, regraPesoMac, regraPesoNpp, regraPesoNpt, simEscalaMaxima]);

  const simResultadoMediaGeral = useMemo(() => {
    const res = avaliarExpressaoNota(regraFormulaMediaGeral, {
      MT1: simMt1,
      MT2: simMt2,
      MT3: simMt3
    });
    if (res !== null) return Math.min(simEscalaMaxima, Math.max(0, Math.round(res)));
    return Math.min(simEscalaMaxima, Math.max(0, Math.round((simMt1 + simMt2 + simMt3) / 3)));
  }, [regraFormulaMediaGeral, simMt1, simMt2, simMt3, simEscalaMaxima]);

  const simResultadoExameFinal = useMemo(() => {
    const mtGeral = (simMt1 + simMt2 + simMt3) / 3;
    const res = avaliarExpressaoNota(regraFormulaClassesFinais, {
      MDF: mtGeral,
      MT1: simMt1,
      MT2: simMt2,
      MT3: simMt3,
      NE: simNE,
      EXAME: simNE
    });
    if (res !== null) return Math.min(simEscalaMaxima, Math.max(0, Math.round(res)));
    const tot = (regraPesoMDF || 40) + (regraPesoNE || 60);
    const val = ((mtGeral * regraPesoMDF) + (simNE * regraPesoNE)) / tot;
    return Math.min(simEscalaMaxima, Math.max(0, Math.round(val)));
  }, [regraFormulaClassesFinais, simMt1, simMt2, simMt3, simNE, regraPesoMDF, regraPesoNE, simEscalaMaxima]);

  const turmaAtiva = turmasPermitidas.find(t => t.id === selectedTurmaId) || turmasDaClasse[0] || turmasPermitidas[0];

  const horariosEscola = useMemo(() => dbService.obterHorarios(escola.id, escola.anoLectivoActivo), [escola.id, escola.anoLectivoActivo]);

  // Filtrar disciplinas estritamente pela classe e curso da turma selecionada e por atribuições docentes
  const disciplinasDaClasseECurso = useMemo(() => {
    if (!turmaAtiva) return isProfessor ? [] : disciplinas;
    if (isProfessor) {
      return getDisciplinasPermitidasProfessor(
        disciplinas,
        turmaAtiva,
        atribuicoesTodas,
        currentUser.id,
        horariosEscola
      );
    }
    return filtrarDisciplinasDaClasse(disciplinas, turmaAtiva.classe, turmaAtiva.curso);
  }, [disciplinas, turmaAtiva, isProfessor, currentUser.id, atribuicoesTodas, horariosEscola]);

  // Modal de Retificação Executiva de Nota pela Direção (com averbamento no perfil do Professor)
  const [modalRetificacaoDirecaoOpen, setModalRetificacaoDirecaoOpen] = useState(false);
  const [retificacaoAluno, setRetificacaoAluno] = useState<Aluno | null>(null);
  const [retificacaoTipoNota, setRetificacaoTipoNota] = useState<'MAC' | 'NPP' | 'NPT' | 'MT'>('MT');
  const [retificacaoNotaAnterior, setRetificacaoNotaAnterior] = useState<number>(0);
  const [retificacaoNovaNota, setRetificacaoNovaNota] = useState<number>(10);
  const [retificacaoMotivo, setRetificacaoMotivo] = useState<string>('');
  const [retificacaoSucessoMsg, setRetificacaoSucessoMsg] = useState<string | null>(null);

  // Sincronizar disciplina selecionada com a lista filtrada da classe/curso
  useEffect(() => {
    if (disciplinasDaClasseECurso.length > 0) {
      const existe = disciplinasDaClasseECurso.some((d: Disciplina) => d.id === selectedDisciplinaId);
      if (!existe) {
        setSelectedDisciplinaId(disciplinasDaClasseECurso[0].id);
      }
    }
  }, [disciplinasDaClasseECurso, selectedDisciplinaId]);

  const disciplinaAtiva = disciplinasDaClasseECurso.find((d: Disciplina) => d.id === selectedDisciplinaId) || disciplinasDaClasseECurso[0] || disciplinas[0];
  const escalaInfo = obterInformacaoEscala(turmaAtiva?.classe, turmaAtiva?.nivelEnsino);
  const escalaMaxima = escalaInfo.escalaMaxima;

  const normTriEval = (tri?: string | number | null): string => {
    const s = String(tri ?? '').toUpperCase().trim();
    if (s.includes('3') || s.includes('III')) return '3';
    if (s.includes('2') || s.includes('II')) return '2';
    if (s.includes('1') || s.includes('I')) return '1';
    return s;
  };
  const normNomeEval = (nome?: string): string =>
    (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.\-_()]/g, ' ').replace(/\s+/g, ' ').trim();
  const correspondeDiscEval = (item?: { disciplinaId?: string; disciplinaNome?: string } | null): boolean => {
    if (!item) return false;
    if (selectedDisciplinaId && item.disciplinaId === selectedDisciplinaId) return true;
    const alvoNorm = normNomeEval(disciplinaAtiva?.nome);
    if (!alvoNorm) return false;
    const itemNome = item.disciplinaNome || disciplinas.find(d => d.id === item.disciplinaId)?.nome || '';
    const itemNorm = normNomeEval(itemNome);
    return Boolean(itemNorm && (itemNorm === alvoNorm || (itemNorm.length >= 6 && alvoNorm.length >= 6 && (itemNorm.includes(alvoNorm) || alvoNorm.includes(itemNorm)))));
  };
  const extrairNptConsolidada = (rec?: NotaTrimestralConsolidada | null): number | undefined => {
    if (!rec) return undefined;
    if (typeof rec.npt === 'number' && !isNaN(rec.npt)) return rec.npt;
    if ('npt' in rec && rec.npt === undefined && rec.provaTrimestral === 0) return undefined;
    if (typeof rec.provaTrimestral === 'number' && !isNaN(rec.provaTrimestral)) return rec.provaTrimestral;
    return undefined;
  };

  // Filtrar avaliações cadastradas pelo professor para esta turma/disciplina/trimestre
  const avaliacoesDaTurma = avaliacoes.filter(a => 
    a.turmaId === selectedTurmaId && 
    correspondeDiscEval(a) && 
    normTriEval(a.trimestre) === normTriEval(selectedTrimestre)
  );

  // Regra vigente para esta turma e trimestre com coerência com as parametrizações da Direção Geral
  const regraVigente = useMemo(() => {
    if (!turmaAtiva) return regrasMAC[0];
    const triStr = `${selectedTrimestre}º Trimestre`;
    return (
      regrasMAC.find(r => r.classe === turmaAtiva.classe && r.trimestre === triStr) ||
      regrasMAC.find(r => r.classe === turmaAtiva.classe) ||
      regrasMAC.find(r => r.nivelEnsino === turmaAtiva.nivelEnsino) ||
      regrasMAC[0]
    );
  }, [regrasMAC, turmaAtiva, selectedTrimestre]);

  // Verificação oficial se a turma atual pertence a uma classe final de ciclo (6ª, 9ª, 12ª, 13ª)
  const ehClasseFinal = useMemo(() => {
    return isClasseFinal(turmaAtiva?.classe, regraVigente);
  }, [turmaAtiva?.classe, regraVigente]);

  // Se a Prova do Professor (NPP) está ativa nas configurações da escola
  const provaProfessorAtiva = Boolean(escola.nppAtivo);

  // Alunos desta turma com suporte a pesquisa rápida e segura
  const alunosDaTurma = useMemo(() => {
    const daTurma = alunos.filter(a => a.turmaId === selectedTurmaId);
    if (!buscaAlunoTabela.trim()) return daTurma;
    return daTurma.filter(a => 
      safeSearchMatch(a.nomeCompleto, buscaAlunoTabela) ||
      safeSearchMatch(a.codigoMatricula, buscaAlunoTabela) ||
      safeSearchMatch(a.numeroProcesso, buscaAlunoTabela) ||
      safeSearchMatch(a.numeroBI, buscaAlunoTabela)
    );
  }, [alunos, selectedTurmaId, buscaAlunoTabela]);

  const isDirecao = ['DiretorGeral', 'SubdiretorPedagogico', 'AdminGeral', 'SubdirectorAdministrativo', 'SubdiretorAdministrativo', 'ChefeSecretaria'].includes(currentUser.role);
  const isDirecaoAuditavel = currentUser.role === 'DiretorGeral' || currentUser.role === 'SubdiretorPedagogico';

  // Registos de auditoria de notas alteradas pela Direção / Subdireção Pedagógica
  const [registosAuditoriaDirecao, setRegistosAuditoriaDirecao] = useState<RegistroAlteracaoNotaDirecao[]>(() => {
    try {
      return dbService.getRegistosAlteracoesNotas(
        isProfessor ? currentUser.id : undefined,
        escola.id,
        escola.anoLectivoActivo
      );
    } catch {
      return [];
    }
  });

  const recarregarAuditoriaDirecao = () => {
    try {
      setRegistosAuditoriaDirecao(
        dbService.getRegistosAlteracoesNotas(
          isProfessor ? currentUser.id : undefined,
          escola.id,
          escola.anoLectivoActivo
        )
      );
    } catch {
      // ignorar
    }
  };

  useEffect(() => {
    recarregarAuditoriaDirecao();
    const onAtualizado = () => recarregarAuditoriaDirecao();
    window.addEventListener('sge_alteracao_nota_direcao', onAtualizado);
    window.addEventListener('sge_alteracao_nota_direcao_atualizada', onAtualizado);
    window.addEventListener('sge_dados_atualizados_remoto', onAtualizado);
    return () => {
      window.removeEventListener('sge_alteracao_nota_direcao', onAtualizado);
      window.removeEventListener('sge_alteracao_nota_direcao_atualizada', onAtualizado);
      window.removeEventListener('sge_dados_atualizados_remoto', onAtualizado);
    };
  }, [escola.id, escola.anoLectivoActivo, currentUser.id, isProfessor]);

  const registosNaoLidosProfessor = useMemo(
    () =>
      registosAuditoriaDirecao.filter(
        (r) => r.professorId === currentUser.id && !r.lidoPeloProfessor
      ),
    [registosAuditoriaDirecao, currentUser.id]
  );

  // Rastreio de edições diretas na grelha pela Direção / Subdireção Pedagógica para auditoria & notificação ao professor
  const notasFocoInicialRef = useRef<Record<string, { val: number | null; label: string }>>({});

  const registarInicioFocoNota = (chave: string, valorInicial: number | undefined | null, label: string) => {
    if (!isDirecaoAuditavel) return;
    if (!(chave in notasFocoInicialRef.current)) {
      const valNorm =
        typeof valorInicial === 'number' && !isNaN(valorInicial) ? valorInicial : null;
      notasFocoInicialRef.current[chave] = { val: valNorm, label };
    }
  };

  const emitirAuditoriaAlteracaoDirecao = (params: {
    aluno: Aluno;
    tipoNota: 'MAC' | 'NPP' | 'NPT' | 'MT' | 'Exame';
    notaAnterior: number | null;
    novaNota: number;
    motivo: string;
    turmaAlvo?: Turma;
    discId?: string;
    discNome?: string;
    trim?: string;
  }) => {
    if (!isDirecaoAuditavel) return [];
    const tAlvo = params.turmaAlvo || turmaAtiva;
    const dId = params.discId || selectedDisciplinaId;
    const dNome = params.discNome || disciplinaAtiva?.nome || dId;
    const tri = params.trim || selectedTrimestre;
    if (!tAlvo || !dId) return [];

    const profs = resolverProfessoresAtribuidosDisciplina(
      escola.id,
      tAlvo.id,
      dId,
      dNome,
      tAlvo.anoLectivo || escola.anoLectivoActivo
    );
    const destinatarios =
      profs.length > 0
        ? profs
        : [{ id: '', nomeCompleto: 'Sem professor atribuído' } as Funcionario];
    const dataHoraFmt = formatarDataHoraAngolana(new Date());
    const notaNovaArred = Math.round(params.novaNota * 10) / 10;

    for (const prof of destinatarios) {
      dbService.salvarRegistoAlteracaoNotaDirecao({
        id: `dir-audit-${Date.now()}-${params.aluno.id.slice(-4)}-${(prof.id || 'sem').slice(-4)}-${Math.random().toString(36).slice(2, 6)}`,
        escolaId: escola.id,
        anoLectivo: tAlvo.anoLectivo || escola.anoLectivoActivo,
        alunoId: params.aluno.id,
        alunoNome: params.aluno.nomeCompleto,
        turmaId: tAlvo.id,
        turmaNome: tAlvo.nome,
        classe: tAlvo.classe,
        curso: isSegundoCiclo(tAlvo.classe) ? tAlvo.curso : undefined,
        disciplinaId: dId,
        disciplinaNome: dNome,
        professorId: prof.id,
        professorNome: prof.nomeCompleto,
        trimestre: tri as any,
        tipoNota: params.tipoNota,
        notaAnterior: params.notaAnterior ?? 0,
        notaAnteriorEmFalta: params.notaAnterior === null,
        novaNota: notaNovaArred,
        motivoJustificativa: params.motivo,
        alteradoPorId: currentUser.id,
        alteradoPorNome: currentUser.nomeCompleto,
        alteradoPorRole: currentUser.role as any,
        dataHora: dataHoraFmt,
        lidoPeloProfessor: false,
      });
    }
    return profs;
  };

  const finalizarFocoNotaDirecao = (
    chave: string,
    aluno: Aluno,
    valorAtualStr: string,
    tipoNota: 'MAC' | 'NPP' | 'NPT' | 'Exame',
    detalheAvaliacao?: string
  ) => {
    const infoInicial = notasFocoInicialRef.current[chave];
    delete notasFocoInicialRef.current[chave];
    if (!isDirecaoAuditavel || !infoInicial) return;

    const texto = (valorAtualStr || '').trim().replace(/,/g, '.');
    if (texto === '') return;
    const novoNum = parseFloat(texto);
    if (isNaN(novoNum) || novoNum < 0 || novoNum > escalaMaxima) return;

    const novoArred = Math.round(novoNum * 10) / 10;
    const mudou =
      infoInicial.val === null || Math.abs(infoInicial.val - novoArred) > 0.001;
    if (!mudou) return;

    emitirAuditoriaAlteracaoDirecao({
      aluno,
      tipoNota,
      notaAnterior: infoInicial.val,
      novaNota: novoArred,
      motivo: detalheAvaliacao
        ? `Alteração direta pela Direção na avaliação "${detalheAvaliacao}".`
        : `Alteração direta pela Direção na grelha de lançamento (${tipoNota}).`,
    });
  };

  // Verificação oficial de autorização para lançar notas de Exame (Comissão de Júri ou Direção)
  const isMembroJuriOuDirecao = useMemo(() => {
    if (isDirecao) return true;
    try {
      const juris = dbService.getJuris ? dbService.getJuris() : [];
      return juris.some(j => {
        const ehTurma = j.turmaId === selectedTurmaId || (j.turmasIds && j.turmasIds.includes(selectedTurmaId)) || j.classe === selectedClasse;
        if (!ehTurma) return false;
        const ehPres = j.presidenteId === currentUser.id || j.presidenteJuriId === currentUser.id;
        const ehSec = j.secretarioId === currentUser.id;
        const ehVogal = j.vogal1Id === currentUser.id || j.vogal2Id === currentUser.id;
        const ehMembro = j.membros?.some((m: any) => m.funcionarioId === currentUser.id);
        return ehPres || ehSec || ehVogal || ehMembro;
      });
    } catch {
      return false;
    }
  }, [isDirecao, currentUser.id, selectedTurmaId, selectedClasse]);

  // Cascata de filtros independente dentro do Modal de Atribuição de Notas Administrativas
  const admClassesDisponiveis = useMemo(() => {
    const fromTurmas = turmas.map((t) => normalizarClasse(t.classe)).filter(Boolean);
    const lista = ordenarClassesMED([...todasClasses, ...fromTurmas]);
    return lista.length > 0 ? lista : TODAS_CLASSES_OFICIAIS_MED;
  }, [todasClasses, turmas]);

  const admCursosDisponiveis = useMemo(() => {
    if (!isSegundoCiclo(admClasse)) return [];
    const set = new Set<string>();
    dbService
      .getCursos(escola.id)
      .filter((c) => c.ativo !== false)
      .forEach((c) => {
        if (c.nome) set.add(c.nome);
      });
    turmas.forEach((t) => {
      if (
        isSegundoCiclo(t.classe) &&
        normalizarClasse(t.classe) === normalizarClasse(admClasse) &&
        t.curso
      ) {
        set.add(t.curso);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [escola.id, turmas, admClasse]);

  const admTurmasFiltradas = useMemo(() => {
    const porClasse = getTurmasPorClasse(turmas, admClasse);
    const base = porClasse.length > 0 ? porClasse : turmas;
    if (isSegundoCiclo(admClasse) && admCurso !== 'TODOS') {
      const porCurso = base.filter(
        (t) => (t.curso || '').trim().toLowerCase() === admCurso.trim().toLowerCase()
      );
      return porCurso.length > 0 ? porCurso : base;
    }
    return base;
  }, [turmas, admClasse, admCurso]);

  const admTurmaAtiva = useMemo(
    () =>
      admTurmasFiltradas.find((t) => t.id === admTurmaId) ||
      admTurmasFiltradas[0] ||
      turmaAtiva,
    [admTurmasFiltradas, admTurmaId, turmaAtiva]
  );

  const admDisciplinasFiltradas = useMemo(() => {
    if (!admTurmaAtiva) return disciplinas;
    const cursoEfetivo = isSegundoCiclo(admTurmaAtiva.classe)
      ? admTurmaAtiva.curso || (admCurso !== 'TODOS' ? admCurso : undefined)
      : undefined;
    return filtrarDisciplinasDaClasse(disciplinas, admTurmaAtiva.classe, cursoEfetivo);
  }, [disciplinas, admTurmaAtiva, admCurso]);

  const admDisciplinaAtiva = useMemo(
    () =>
      admDisciplinasFiltradas.find((d) => d.id === admDisciplinaId) ||
      admDisciplinasFiltradas[0] ||
      null,
    [admDisciplinasFiltradas, admDisciplinaId]
  );

  const admRegraVigente = useMemo(() => {
    if (!admTurmaAtiva) return regraVigente;
    const triStr = `${admTrimestre}º Trimestre`;
    return (
      regrasMAC.find((r) => r.classe === admTurmaAtiva.classe && r.trimestre === triStr) ||
      regrasMAC.find((r) => r.classe === admTurmaAtiva.classe) ||
      regrasMAC.find((r) => r.nivelEnsino === admTurmaAtiva.nivelEnsino) ||
      regrasMAC[0]
    );
  }, [regrasMAC, admTurmaAtiva, admTrimestre, regraVigente]);

  const admEscalaInfo = obterInformacaoEscala(
    admTurmaAtiva?.classe || admClasse,
    admTurmaAtiva?.nivelEnsino
  );
  const admEhClasseFinal = isClasseFinal(admTurmaAtiva?.classe || admClasse, admRegraVigente);

  useEffect(() => {
    if (!modalNotasAdmOpen) return;
    if (admTurmasFiltradas.length > 0 && !admTurmasFiltradas.some((t) => t.id === admTurmaId)) {
      setAdmTurmaId(admTurmasFiltradas[0].id);
    }
  }, [modalNotasAdmOpen, admTurmasFiltradas, admTurmaId]);

  useEffect(() => {
    if (!modalNotasAdmOpen) return;
    if (!isSegundoCiclo(admClasse) && admCurso !== 'TODOS') {
      setAdmCurso('TODOS');
    }
  }, [modalNotasAdmOpen, admClasse, admCurso]);

  useEffect(() => {
    if (!modalNotasAdmOpen) return;
    if (
      admDisciplinasFiltradas.length > 0 &&
      !admDisciplinasFiltradas.some((d) => d.id === admDisciplinaId)
    ) {
      setAdmDisciplinaId(admDisciplinasFiltradas[0].id);
    }
  }, [modalNotasAdmOpen, admDisciplinasFiltradas, admDisciplinaId]);

  useEffect(() => {
    if (!admEhClasseFinal && admAlvoTipo === 'EXAME') {
      setAdmAlvoTipo('PROVA_TRIMESTRAL');
    }
  }, [admEhClasseFinal, admAlvoTipo]);

  useEffect(() => {
    if (!modalNotasAdmOpen) return;
    setAdmNotasEditadas({});
    setAdmSelecionados({});
  }, [
    modalNotasAdmOpen,
    admTurmaId,
    admDisciplinaId,
    admTrimestre,
    admAlvoTipo,
    admModoAplicacao,
  ]);

  const abrirModalNotasAdm = () => {
    setAdmClasse(turmaAtiva?.classe ? normalizarClasse(turmaAtiva.classe) : selectedClasse);
    setAdmCurso(
      isSegundoCiclo(turmaAtiva?.classe || selectedClasse)
        ? turmaAtiva?.curso || selectedCursoFilter || 'TODOS'
        : 'TODOS'
    );
    setAdmTurmaId(turmaAtiva?.id || selectedTurmaId || turmas[0]?.id || '');
    setAdmDisciplinaId(selectedDisciplinaId || disciplinasDaClasseECurso[0]?.id || '');
    setAdmTrimestre(selectedTrimestre);
    setAdmNotasEditadas({});
    setAdmSelecionados({});
    setModalNotasAdmOpen(true);
  };

  const admAlunosDaTurma = useMemo(
    () => (admTurmaAtiva ? alunos.filter((a) => a.turmaId === admTurmaAtiva.id) : []),
    [alunos, admTurmaAtiva]
  );

  const previewNotasAdm = useMemo(() => {
    if (!modalNotasAdmOpen || !admTurmaAtiva || !admDisciplinaAtiva) return null;
    return calcularNotasAdministrativasProporcionais({
      turma: admTurmaAtiva,
      disciplinaId: admDisciplinaAtiva.id,
      trimestre: admTrimestre,
      anoLectivo: admTurmaAtiva.anoLectivo || escola.anoLectivoActivo || '',
      alunosDaTurma: admAlunosDaTurma,
      avaliacoes,
      notasAvaliacoes: notas,
      notasConsolidadas,
      regraVigente: admRegraVigente,
      alvoTipo: admAlvoTipo,
      modoAplicacao: admModoAplicacao
    });
  }, [
    modalNotasAdmOpen,
    admTurmaAtiva,
    admDisciplinaAtiva,
    admTrimestre,
    escola.anoLectivoActivo,
    admAlunosDaTurma,
    avaliacoes,
    notas,
    notasConsolidadas,
    admRegraVigente,
    admAlvoTipo,
    admModoAplicacao
  ]);

  const itensAdmEditaveis = useMemo(() => {
    if (!previewNotasAdm) return [];
    return previewNotasAdm.itens.map((item) => {
      const aplicarFinal =
        admSelecionados[item.alunoId] !== undefined
          ? admSelecionados[item.alunoId]
          : item.aplicar;
      const textoEditado = admNotasEditadas[item.alunoId];
      let notaFinalItem = item.notaProposta;
      let editadaManual = false;
      let invalida = false;

      if (textoEditado !== undefined) {
        const parsed = parseFloat(textoEditado.replace(/,/g, '.'));
        if (
          textoEditado.trim() === '' ||
          isNaN(parsed) ||
          parsed < 0 ||
          parsed > previewNotasAdm.escalaMaxima
        ) {
          invalida = aplicarFinal;
        } else {
          notaFinalItem = Math.round(parsed * 10) / 10;
          editadaManual = Math.abs(notaFinalItem - item.notaSugeridaProporcional) > 0.001;
        }
      }

      return {
        ...item,
        aplicar: aplicarFinal,
        notaProposta: notaFinalItem,
        textoEditado,
        editadaManual,
        invalida,
      };
    });
  }, [previewNotasAdm, admSelecionados, admNotasEditadas]);

  const totalAdmSelecionados = useMemo(
    () => itensAdmEditaveis.filter((i) => i.aplicar).length,
    [itensAdmEditaveis]
  );

  const totalAdmInvalidas = useMemo(
    () => itensAdmEditaveis.filter((i) => i.invalida).length,
    [itensAdmEditaveis]
  );

  const handleConfirmarNotasAdministrativas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirecao || !admTurmaAtiva || !admDisciplinaAtiva || !previewNotasAdm) return;
    if (totalAdmSelecionados === 0 || totalAdmInvalidas > 0) return;

    const resultado = aplicarNotasAdministrativas({
      escola,
      turma: admTurmaAtiva,
      disciplina: admDisciplinaAtiva,
      disciplinaId: admDisciplinaAtiva.id,
      trimestre: admTrimestre,
      currentUser,
      regraVigente: admRegraVigente,
      alvoTipo: admAlvoTipo,
      itensPreview: itensAdmEditaveis,
      justificativa: admJustificativa.trim() || 'Atribuição administrativa proporcional pela Direção.'
    });

    // Limpar estados digitados locais se for a mesma turma/disciplina/trimestre da grelha principal
    if (
      admTurmaAtiva.id === selectedTurmaId &&
      admDisciplinaAtiva.id === selectedDisciplinaId &&
      admTrimestre === selectedTrimestre
    ) {
      const limparIds = new Set(itensAdmEditaveis.filter(i => i.aplicar).map(i => i.alunoId));
      if (admAlvoTipo === 'AVALIACAO' && resultado.avaliacaoCriadaOuUsada) {
        const avId = resultado.avaliacaoCriadaOuUsada.id;
        setValoresDigitados(prev => {
          const next = { ...prev };
          limparIds.forEach(alId => delete next[`${avId}-${alId}`]);
          return next;
        });
      } else if (admAlvoTipo === 'PROVA_TRIMESTRAL') {
        setPtDigitadas(prev => {
          const next = { ...prev };
          limparIds.forEach(alId => delete next[alId]);
          return next;
        });
      } else if (admAlvoTipo === 'NPP') {
        setNppDigitadas(prev => {
          const next = { ...prev };
          limparIds.forEach(alId => delete next[alId]);
          return next;
        });
      } else if (admAlvoTipo === 'EXAME') {
        setExameDigitados(prev => {
          const next = { ...prev };
          limparIds.forEach(alId => delete next[alId]);
          return next;
        });
      }
    }

    recarregarAuditoriaDirecao();
    setModalNotasAdmOpen(false);
    setRetificacaoSucessoMsg(
      `${resultado.aplicadasCount} nota(s) administrativa(s) atribuída(s) em ${admDisciplinaAtiva.nome} (${admTurmaAtiva.nome} • ${admTrimestre}º Trimestre)! Os professores atribuídos foram notificados.`
    );
    setTimeout(() => setRetificacaoSucessoMsg(null), 6000);
  };

  // Exportar pauta/notas da turma atual para Excel (.xlsx) com fórmulas reais
  const handleExportarNotasExcel = () => {
    if (!turmaAtiva) return;
    exportarPautaTrimestralComFormulasExcel({
      escola,
      turma: turmaAtiva,
      disciplina: disciplinaAtiva,
      alunos: alunosDaTurma,
      avaliacoesDaTurma,
      notasAvaliacoes: notas,
      notasConsolidadas,
      trimestre: (Number(selectedTrimestre) || 1) as 1 | 2 | 3,
      regraVigente,
      provaProfessorAtiva,
      anoLectivo: turmaAtiva.anoLectivo || escola.anoLectivoActivo || ''
    });
  };

  // Estados e Funções de Exportação de Pautas em PDF Oficial (MED Angola)
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  const juriTurmaAtiva = useMemo(() => {
    if (!turmaAtiva) return null;
    try {
      const juris = dbService.getJuris ? dbService.getJuris() : [];
      return juris.find(j => 
        (j.escolaId === escola.id || escola.id === 'todas') &&
        (j.turmaId === turmaAtiva.id || (j.turmasIds && j.turmasIds.includes(turmaAtiva.id)) || j.classe === turmaAtiva.classe)
      ) || null;
    } catch {
      return null;
    }
  }, [turmaAtiva, escola.id]);

  const funcionariosEscola = useMemo(() => {
    return dbService.getFuncionarios(escola.id);
  }, [escola.id]);

  const handleExportarPautaPdf = async () => {
    const el = document.getElementById('pauta-oficial-para-exportacao');
    if (!el) {
      window.print();
      return;
    }
    setIsExportingPdf(true);
    try {
      const turmaNomeLimpo = (turmaAtiva?.nome || 'Turma').replace(/[^a-zA-Z0-9]/g, '_');
      const discNomeLimpo = (disciplinaAtiva?.nome || 'Geral').replace(/[^a-zA-Z0-9]/g, '_');
      const anoLimpo = (escola.anoLectivoActivo || '2025_2026').replace(/[\/\\]/g, '_');
      const nomeFicheiro = `Pauta_Oficial_MED_${turmaNomeLimpo}_${discNomeLimpo}_${selectedTrimestre}T_${anoLimpo}`;
      
      const ok = await downloadElementAsPdf(el, nomeFicheiro, {
        orientation: 'landscape',
        scale: 2.4,
        marginMm: 6
      });
      if (ok) {
        setPdfSuccessToast(`Pauta oficial "${nomeFicheiro}.pdf" exportada com sucesso em formato oficial do MED Angola!`);
        setTimeout(() => setPdfSuccessToast(null), 5000);
      }
    } catch (err) {
      console.error('Erro ao descarregar PDF da pauta:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Criar avaliação pelo professor
  const handleCriarAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAvTitulo || !novoAvTipoId) return;

    const tipo = tiposAvaliacao.find(t => t.id === novoAvTipoId);
    let tipoNome = tipo?.nome || 'Avaliação Contínua';
    let peso = tipo?.pesoPadrao || 1;
    if (novoAvTipoId === 'tipo-pt') {
      tipoNome = 'Prova Trimestral (PT)';
      peso = 2;
    } else if (novoAvTipoId === 'tipo-comp') {
      tipoNome = 'Avaliação de Comportamento (COMP)';
      peso = 1;
    } else if (novoAvTipoId === 'tipo-nee') {
      tipoNome = 'Exame de Júri (NEE)';
      peso = 3;
    }

    const nova: AvaliacaoCriada = {
      id: `av-${Date.now()}`,
      escolaId: escola.id,
      turmaId: selectedTurmaId,
      disciplinaId: selectedDisciplinaId,
      disciplinaNome: disciplinaAtiva?.nome || '',
      professorId: currentUser.id,
      trimestre: selectedTrimestre,
      anoLectivo: escola.anoLectivoActivo,
      tipoId: novoAvTipoId,
      tipoNome,
      titulo: novoAvTitulo,
      dataAplicacao: novoAvData,
      pontuacaoMaxima: escalaMaxima,
      peso,
      bloqueada: false
    };

    onSalvarAvaliacao(nova);
    setShowNovaAvaliacaoModal(false);
    setNovoAvTitulo('');
  };

  // Salvar nota de um estudante com validação rigorosa de acordo com o nível:
  // - 0 a 10 para Ensino Primário (1ª à 6ª classe)
  // - 0 a 20 para Iº Ciclo (7ª à 9ª classe) e IIº Ciclo (10ª à 13ª classe / Médio Técnico)
  // Se o professor colocar nota fora destes intervalos, NÃO pode guardar esta nota
  // e aparece em vermelho escuro para boa visualização.
  const handleNotaChange = (avaliacaoId: string, alunoId: string, valorStr: string) => {
    const chave = `${avaliacaoId}-${alunoId}`;
    setValoresDigitados(prev => ({ ...prev, [chave]: valorStr }));

    // Se o campo estiver vazio
    if (valorStr.trim() === '') {
      setNotasInvalidas(prev => {
        const copy = { ...prev };
        delete copy[chave];
        return copy;
      });
      return;
    }

    const valorNum = parseFloat(valorStr);

    // Validação do intervalo oficial do nível
    if (isNaN(valorNum) || valorNum < 0 || valorNum > escalaMaxima) {
      // FORA DO INTERVALO: NÃO PODE GUARDAR ESTA NOTA!
      setNotasInvalidas(prev => ({
        ...prev,
        [chave]: `Nota fora do intervalo oficial! Para ${escalaInfo.rotuloEscala}, o valor deve ser entre 0.0 e ${escalaMaxima}.0.`
      }));
      return; // NÃO chama onSalvarNota!
    }

    // Nota válida no intervalo permitido: limpa qualquer erro anterior e guarda
    setNotasInvalidas(prev => {
      const copy = { ...prev };
      delete copy[chave];
      return copy;
    });

    const novaNota: NotaEstudante = {
      id: `nota-${avaliacaoId}-${alunoId}`,
      avaliacaoId,
      alunoId,
      valorNota: Math.round(valorNum * 10) / 10,
      dataLancamento: new Date().toISOString().split('T')[0]
    };
    onSalvarNota(novaNota);

    // Sincronizar imediatamente a MAC, Média Trimestral e Média Final na pauta consolidada
    const notasAtualizadas = [
      ...notas.filter(n => !(n.avaliacaoId === avaliacaoId && n.alunoId === alunoId)),
      novaNota
    ];
    const resMacAtual = calcularMACEstudante(
      alunoId,
      avaliacoesDaTurma,
      notasAtualizadas,
      regraVigente,
      turmaAtiva?.nivelEnsino || 'ICiclo',
      turmaAtiva?.classe || selectedClasse
    );
    salvarNotaConsolidadaCompleta(alunoId, { mac: resMacAtual.macCalculada });
  };

  // Solicitação de alteração de nota
  const handleEnviarSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solAlunoId || !solAvaliacaoId || !solMotivo) return;

    const aluno = alunos.find(a => a.id === solAlunoId);
    const av = avaliacoes.find(a => a.id === solAvaliacaoId);

    const novaSol: SolicitacaoAlteracaoNota = {
      id: `sol-${Date.now()}`,
      escolaId: escola.id,
      professorId: currentUser.id,
      professorNome: currentUser.nomeCompleto,
      alunoId: solAlunoId,
      alunoNome: aluno?.nomeCompleto || solAlunoId,
      turmaId: selectedTurmaId,
      turmaNome: turmaAtiva?.nome || selectedTurmaId,
      disciplinaId: selectedDisciplinaId,
      disciplinaNome: disciplinaAtiva?.nome || selectedDisciplinaId,
      trimestre: selectedTrimestre,
      avaliacaoId: solAvaliacaoId,
      avaliacaoTitulo: av?.titulo || solAvaliacaoId,
      notaAnterior: solNotaAtual,
      notaProposta: solNotaProposta,
      motivo: solMotivo,
      estado: 'Pendente',
      dataSolicitacao: new Date().toISOString().split('T')[0]
    };

    onSalvarSolicitacao(novaSol);
    setShowSolicitacaoModal(false);
    setSolMotivo('');
  };

  // Direção aprova/rejeita solicitação
  const handleDecisaoSolicitacao = (sol: SolicitacaoAlteracaoNota, estado: 'Aprovado' | 'Rejeitado', resposta: string) => {
    onSalvarSolicitacao({
      ...sol,
      estado,
      respostaDirecao: resposta,
      dataResposta: new Date().toISOString().split('T')[0]
    });

    if (estado === 'Aprovado') {
      const novaNota: NotaEstudante = {
        id: `nota-${sol.avaliacaoId}-${sol.alunoId}`,
        avaliacaoId: sol.avaliacaoId,
        alunoId: sol.alunoId,
        valorNota: sol.notaProposta,
        dataLancamento: new Date().toISOString().split('T')[0]
      };
      onSalvarNota(novaNota);
      const notasAtualizadas = [
        ...notas.filter(n => !(n.avaliacaoId === sol.avaliacaoId && n.alunoId === sol.alunoId)),
        novaNota
      ];
      const avsAlvo = avaliacoes.filter(a =>
        a.turmaId === sol.turmaId &&
        a.disciplinaId === sol.disciplinaId &&
        normTriEval(a.trimestre) === normTriEval(sol.trimestre)
      );
      const turmaAlvo = turmas.find(t => t.id === sol.turmaId);
      if (avsAlvo.length > 0 && sol.turmaId === selectedTurmaId && sol.disciplinaId === selectedDisciplinaId && normTriEval(sol.trimestre) === normTriEval(selectedTrimestre)) {
        const resMacAtual = calcularMACEstudante(
          sol.alunoId,
          avsAlvo,
          notasAtualizadas,
          regraVigente,
          turmaAlvo?.nivelEnsino || turmaAtiva?.nivelEnsino || 'ICiclo',
          turmaAlvo?.classe || selectedClasse
        );
        salvarNotaConsolidadaCompleta(sol.alunoId, { mac: resMacAtual.macCalculada });
      }
    }
  };

  // Retificação Executiva de Nota pela Direção Geral / Subdireção com Registo Forense e Notificação ao Professor
  const handleSalvarRetificacaoExecutiva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retificacaoAluno || !retificacaoMotivo.trim()) return;

    const notaFinalValida = Math.round(Math.min(escalaMaxima, Math.max(0, retificacaoNovaNota)) * 10) / 10;

    // 1. Atualizar ou criar nota consolidada
    const notasConsolid = dbService.getNotasConsolidadas();
    const idx = notasConsolid.findIndex((c: any) => 
      c.alunoId === retificacaoAluno.id && 
      correspondeDiscEval(c) && 
      normTriEval(c.trimestre) === normTriEval(selectedTrimestre)
    );

    let registroRetificado: NotaTrimestralConsolidada;
    if (idx >= 0) {
      if (retificacaoTipoNota === 'MAC') notasConsolid[idx].mac = notaFinalValida;
      else if (retificacaoTipoNota === 'NPP') notasConsolid[idx].npp = notaFinalValida;
      else if (retificacaoTipoNota === 'NPT') {
        notasConsolid[idx].npt = notaFinalValida;
        notasConsolid[idx].provaTrimestral = notaFinalValida;
      } else {
        notasConsolid[idx].mediaTrimestral = notaFinalValida;
        notasConsolid[idx].notaFinal = notaFinalValida;
      }
      if (retificacaoTipoNota === 'MAC' || retificacaoTipoNota === 'NPP' || retificacaoTipoNota === 'NPT') {
        const calcTri = calcularNotaTrimestralDinamica(
          notasConsolid[idx].mac || 0,
          notasConsolid[idx].npp,
          extrairNptConsolidada(notasConsolid[idx]),
          regraVigente,
          Number(selectedTrimestre),
          turmaAtiva?.classe || selectedClasse,
          provaProfessorAtiva
        );
        notasConsolid[idx].mediaTrimestral = calcTri.mediaTrimestral;
        if (String(selectedTrimestre) !== '3') {
          notasConsolid[idx].notaFinal = calcTri.mediaTrimestral;
        }
      }
      notasConsolid[idx].validadaPelaDirecao = true;
      notasConsolid[idx].origemNota = 'Direcao';
      if (!notasConsolid[idx].disciplinaNome && disciplinaAtiva?.nome) {
        notasConsolid[idx].disciplinaNome = disciplinaAtiva.nome;
      }
      registroRetificado = notasConsolid[idx];
      dbService.salvarNotasConsolidadas(notasConsolid);
    } else {
      registroRetificado = {
        id: `nc-${retificacaoAluno.id}-${selectedDisciplinaId}-${selectedTrimestre}`,
        escolaId: escola.id,
        alunoId: retificacaoAluno.id,
        turmaId: selectedTurmaId,
        disciplinaId: selectedDisciplinaId,
        disciplinaNome: disciplinaAtiva?.nome || '',
        trimestre: selectedTrimestre as any,
        anoLectivo: escola.anoLectivoActivo || '',
        mac: retificacaoTipoNota === 'MAC' ? notaFinalValida : 0,
        npp: retificacaoTipoNota === 'NPP' ? notaFinalValida : undefined,
        provaTrimestral: retificacaoTipoNota === 'NPT' ? notaFinalValida : undefined,
        npt: retificacaoTipoNota === 'NPT' ? notaFinalValida : undefined,
        mediaTrimestral: notaFinalValida,
        notaFinal: notaFinalValida,
        comportamentoNota: undefined,
        comportamentoConceito: undefined,
        faltas: 0,
        validadaPelaDirecao: true,
        origemNota: 'Direcao'
      };
      notasConsolid.push(registroRetificado);
      dbService.salvarNotasConsolidadas(notasConsolid);
    }
    onSalvarNotaConsolidada(registroRetificado);

    // 2. Registar auditoria e notificar todos os professores atribuídos a esta turma e disciplina
    const profsNotificados = resolverProfessoresAtribuidosDisciplina(
      escola.id,
      selectedTurmaId,
      selectedDisciplinaId,
      disciplinaAtiva?.nome,
      turmaAtiva?.anoLectivo || escola.anoLectivoActivo
    );
    const destinatarios =
      profsNotificados.length > 0
        ? profsNotificados
        : [{ id: '', nomeCompleto: 'Sem professor atribuído' } as Funcionario];
    const dataHoraFmt = formatarDataHoraAngolana(new Date());

    for (const prof of destinatarios) {
      dbService.salvarRegistoAlteracaoNotaDirecao({
        id: `retif-${Date.now()}-${(prof.id || 'sem').slice(-4)}-${Math.random().toString(36).slice(2, 6)}`,
        escolaId: escola.id,
        anoLectivo: turmaAtiva?.anoLectivo || escola.anoLectivoActivo,
        alunoId: retificacaoAluno.id,
        alunoNome: retificacaoAluno.nomeCompleto,
        turmaId: selectedTurmaId,
        turmaNome: turmaAtiva?.nome || selectedTurmaId,
        classe: turmaAtiva?.classe || selectedClasse,
        curso: isSegundoCiclo(turmaAtiva?.classe || selectedClasse) ? turmaAtiva?.curso : undefined,
        disciplinaId: selectedDisciplinaId,
        disciplinaNome: disciplinaAtiva?.nome || selectedDisciplinaId,
        professorId: prof.id,
        professorNome: prof.nomeCompleto,
        trimestre: selectedTrimestre,
        tipoNota: retificacaoTipoNota,
        notaAnterior: retificacaoNotaAnterior,
        novaNota: notaFinalValida,
        motivoJustificativa: retificacaoMotivo.trim(),
        alteradoPorId: currentUser.id,
        alteradoPorNome: currentUser.nomeCompleto,
        alteradoPorRole: currentUser.role as any,
        dataHora: dataHoraFmt,
        lidoPeloProfessor: false
      });
    }

    recarregarAuditoriaDirecao();
    const nomesProfs = profsNotificados.map((p) => p.nomeCompleto).join(', ');
    setRetificacaoSucessoMsg(
      profsNotificados.length > 0
        ? `Nota de "${retificacaoAluno.nomeCompleto}" alterada (${retificacaoNotaAnterior.toFixed(1)} → ${notaFinalValida.toFixed(1)})! Auditoria e notificação enviadas para ${nomesProfs}.`
        : `Nota de "${retificacaoAluno.nomeCompleto}" alterada (${retificacaoNotaAnterior.toFixed(1)} → ${notaFinalValida.toFixed(1)}) e registada na auditoria da escola.`
    );
    setModalRetificacaoDirecaoOpen(false);
    setTimeout(() => setRetificacaoSucessoMsg(null), 5000);
  };

  // Função centralizada para calcular e gravar notas consolidadas (MAC, Prova do Professor, Prova Trimestral, Média Trimestral, Exame e Comportamento)
  const salvarNotaConsolidadaCompleta = (alunoId: string, dados: {
    mac?: number;
    npp?: number;
    provaTrimestral?: number;
    notaExame?: number;
    comportamentoNota?: number;
    comportamentoConceito?: string;
  }) => {
    const notasConsolid = [...notasConsolidadas];
    const idx = notasConsolid.findIndex(c => 
      c.alunoId === alunoId && 
      correspondeDiscEval(c) && 
      normTriEval(c.trimestre) === normTriEval(selectedTrimestre)
    );

    const existente = idx >= 0 ? notasConsolid[idx] : null;
    const macVal = dados.mac !== undefined ? dados.mac : (existente?.mac || 0);
    const nppVal = 'npp' in dados ? dados.npp : existente?.npp;
    const existentePt = extrairNptConsolidada(existente);
    const ptVal = 'provaTrimestral' in dados ? dados.provaTrimestral : existentePt;
    // A nota de exame é ESTRITAMENTE reservada para classes finais (6ª, 9ª, 12ª, 13ª)
    const exameVal = ehClasseFinal ? ('notaExame' in dados ? dados.notaExame : existente?.notaExame) : undefined;
    const compNota = 'comportamentoNota' in dados ? dados.comportamentoNota : existente?.comportamentoNota;
    const compConceito = 'comportamentoConceito' in dados
      ? dados.comportamentoConceito 
      : (compNota !== undefined && compNota !== null ? converterComportamentoParaConceito(compNota, escalaMaxima) : existente?.comportamentoConceito);

    // Média Trimestral (MT) rigorosamente conforme regra/fórmula configurada para o nível e trimestre
    const calcTriDinamico = calcularNotaTrimestralDinamica(
      macVal,
      nppVal,
      ptVal,
      regraVigente,
      Number(selectedTrimestre),
      turmaAtiva?.classe || selectedClasse,
      provaProfessorAtiva
    );
    const mediaTri = calcTriDinamico.mediaTrimestral;

    // Média Final (MF): para 3º Trimestre usa MT1, MT2, MT3 reais da disciplina e regra configurada
    let notaFinal = mediaTri;
    if (String(selectedTrimestre) === '3') {
      const n1Al = notasConsolid.find(c => c.alunoId === alunoId && correspondeDiscEval(c) && normTriEval(c.trimestre) === '1');
      const n2Al = notasConsolid.find(c => c.alunoId === alunoId && correspondeDiscEval(c) && normTriEval(c.trimestre) === '2');
      const mt1 = n1Al?.mediaTrimestral ?? mediaTri;
      const mt2 = n2Al?.mediaTrimestral ?? mediaTri;
      const calcMf = calcularMediaFinal3Trimestre(
        mt1,
        mt2,
        mediaTri,
        ehClasseFinal ? exameVal : undefined,
        regraVigente,
        turmaAtiva?.classe || selectedClasse
      );
      notaFinal = calcMf.mediaFinal;
    } else if (ehClasseFinal && exameVal !== undefined && exameVal !== null && !isNaN(exameVal)) {
      const calcMf = calcularMediaFinal3Trimestre(
        mediaTri,
        mediaTri,
        mediaTri,
        exameVal,
        regraVigente,
        turmaAtiva?.classe || selectedClasse
      );
      notaFinal = calcMf.mediaFinal;
    }

    let atualizada: NotaTrimestralConsolidada;
    if (existente) {
      atualizada = {
        ...existente,
        escolaId: existente.escolaId || escola.id,
        disciplinaId: existente.disciplinaId || selectedDisciplinaId,
        disciplinaNome: existente.disciplinaNome || disciplinaAtiva?.nome || '',
        mac: macVal,
        npp: nppVal,
        provaTrimestral: ptVal,
        npt: ptVal,
        mediaTrimestral: mediaTri,
        notaExame: exameVal,
        notaFinal,
        comportamentoNota: compNota,
        comportamentoConceito: compConceito
      };
      notasConsolid[idx] = atualizada;
      dbService.salvarNotasConsolidadas(notasConsolid);
    } else {
      atualizada = {
        id: `nota-consol-${Date.now()}-${alunoId.slice(-4)}`,
        escolaId: escola.id,
        alunoId,
        turmaId: selectedTurmaId,
        disciplinaId: selectedDisciplinaId,
        disciplinaNome: disciplinaAtiva?.nome || '',
        trimestre: selectedTrimestre,
        anoLectivo: escola.anoLectivoActivo,
        mac: macVal,
        npp: nppVal,
        provaTrimestral: ptVal,
        npt: ptVal,
        mediaTrimestral: mediaTri,
        notaExame: exameVal,
        notaFinal,
        comportamentoNota: compNota,
        comportamentoConceito: compConceito,
        faltas: 0,
        validadaPelaDirecao: false
      };
      dbService.salvarNotaConsolidada(atualizada);
    }

    onSalvarNotaConsolidada(atualizada);

    // Sincroniza conceito de comportamento com o dossiê do estudante se houver alteração
    if (compConceito !== undefined) {
      const alunoAlvo = alunos.find(a => a.id === alunoId);
      if (alunoAlvo) {
        dbService.salvarAluno({
          ...alunoAlvo,
          comportamentoConceito: compConceito as any
        });
      }
    }

    window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
  };

  // Inserção da Prova do Professor (NPP) quando ativada nas configurações escolares
  const handleNppChange = (alunoId: string, valorStr: string, resMAC: any) => {
    setNppDigitadas(prev => ({ ...prev, [alunoId]: valorStr }));
    const chaveErro = `npp-${alunoId}`;
    if (valorStr.trim() === '') {
      setNotasInvalidas(prev => {
        const copy = { ...prev };
        delete copy[chaveErro];
        return copy;
      });
      salvarNotaConsolidadaCompleta(alunoId, { npp: undefined, mac: resMAC.macCalculada });
      return;
    }

    const num = parseFloat(valorStr.replace(/,/g, '.'));
    if (isNaN(num) || num < 0 || num > escalaMaxima) {
      setNotasInvalidas(prev => ({
        ...prev,
        [chaveErro]: `A Prova do Professor deve estar entre 0 e ${escalaMaxima}`
      }));
      return;
    }

    setNotasInvalidas(prev => {
      const copy = { ...prev };
      delete copy[chaveErro];
      return copy;
    });

    salvarNotaConsolidadaCompleta(alunoId, { npp: num, mac: resMAC.macCalculada });
  };

  // Inserção da Prova Trimestral (PT / NPT) pelo Professor
  const handleProvaTrimestralChange = (alunoId: string, valorStr: string, resMAC: any) => {
    setPtDigitadas(prev => ({ ...prev, [alunoId]: valorStr }));
    const chaveErro = `pt-${alunoId}`;
    if (valorStr.trim() === '') {
      setNotasInvalidas(prev => {
        const copy = { ...prev };
        delete copy[chaveErro];
        return copy;
      });
      salvarNotaConsolidadaCompleta(alunoId, { provaTrimestral: undefined, mac: resMAC.macCalculada });
      return;
    }

    const num = parseFloat(valorStr.replace(/,/g, '.'));
    if (isNaN(num) || num < 0 || num > escalaMaxima) {
      setNotasInvalidas(prev => ({
        ...prev,
        [chaveErro]: `A Prova Trimestral deve estar entre 0 e ${escalaMaxima}`
      }));
      return;
    }

    setNotasInvalidas(prev => {
      const copy = { ...prev };
      delete copy[chaveErro];
      return copy;
    });

    salvarNotaConsolidadaCompleta(alunoId, { provaTrimestral: num, mac: resMAC.macCalculada });
  };

  // Inserção do Exame pela Comissão de Júri ou Direção (apenas para classes finais)
  const handleExameJuriChange = (alunoId: string, valorStr: string, resMAC: any) => {
    if (!isMembroJuriOuDirecao || !ehClasseFinal) return;
    setExameDigitados(prev => ({ ...prev, [alunoId]: valorStr }));
    const chaveErro = `exame-${alunoId}`;
    if (valorStr.trim() === '') {
      setNotasInvalidas(prev => {
        const copy = { ...prev };
        delete copy[chaveErro];
        return copy;
      });
      salvarNotaConsolidadaCompleta(alunoId, { notaExame: undefined, mac: resMAC.macCalculada });
      return;
    }

    const num = parseFloat(valorStr.replace(/,/g, '.'));
    if (isNaN(num) || num < 0 || num > escalaMaxima) {
      setNotasInvalidas(prev => ({
        ...prev,
        [chaveErro]: `A Nota de Exame do Júri deve estar entre 0 e ${escalaMaxima}`
      }));
      return;
    }

    setNotasInvalidas(prev => {
      const copy = { ...prev };
      delete copy[chaveErro];
      return copy;
    });

    salvarNotaConsolidadaCompleta(alunoId, { notaExame: num, mac: resMAC.macCalculada });
  };

  // Atualização em tempo real do Comportamento do Aluno inserido como avaliação normal
  const handleComportamentoChange = (alunoId: string, valor?: number, conceitoDireto?: string) => {
    const resMac = calcularMACEstudante(
      alunoId,
      avaliacoesDaTurma,
      notas,
      regraVigente,
      turmaAtiva?.nivelEnsino || 'Primario',
      turmaAtiva?.classe || '1ª'
    );
    const conceito = conceitoDireto || (valor !== undefined && valor !== null ? converterComportamentoParaConceito(valor, escalaMaxima) : undefined);
    salvarNotaConsolidadaCompleta(alunoId, {
      comportamentoNota: valor,
      comportamentoConceito: conceito,
      mac: resMac.macCalculada
    });
  };

  // Salvar Regra de Cálculo MAC (Direção)
  const handleSalvarRegraMAC = (e: React.FormEvent) => {
    e.preventDefault();
    const regraExistente = regrasMAC.find(r => r.nivelEnsino === editingRegraNivel);
    const novaRegra: RegraCalculoMAC = {
      id: regraExistente?.id || `regra-${editingRegraNivel.toLowerCase()}`,
      escolaId: escola.id,
      nivelEnsino: editingRegraNivel,
      classe: 'Todas',
      formulaTipo: regraFormulaTipo,
      pesosPorTipo: regraPesos,
      formula1Trimestre: regraFormula1Tri.trim(),
      formula2Trimestre: regraFormula2Tri.trim(),
      formula3Trimestre: regraFormula3Tri.trim(),
      formulaTrimestral: regraFormula1Tri.trim(),
      pesosTrimestre: {
        mac: regraPesoMac,
        npp: regraPesoNpp,
        npt: regraPesoNpt
      },
      formulaMediaGeralClasse: regraFormulaMediaGeral.trim(),
      formulaClassesFinaisExame: regraFormulaClassesFinais.trim(),
      pesoMDFClassesFinais: regraPesoMDF,
      pesoNEClassesFinais: regraPesoNE,
      classesFinaisConfiguradas: regraClassesFinais,
      tipoCalculo3Trimestre: 'PONDERADO_EXAME',
      minAvaliacoesExigidas: regraMinAvaliacoes,
      maxAvaliacoesPermitidas: 15,
      descartarMenorNota: regraDescartarMenor,
      versao: (regraExistente?.versao || 1) + 1,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: currentUser.nomeCompleto
    };
    onSalvarRegraMAC(novaRegra);
    setRetificacaoSucessoMsg(`Regra e Fórmulas v${novaRegra.versao} salvas com sucesso! As médias de cada trimestre, média geral e classes finais foram recalculadas.`);
    setTimeout(() => setRetificacaoSucessoMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 no-print">
        <button
          onClick={() => setActiveSubTab('lancamento')}
          className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 ${
            activeSubTab === 'lancamento'
              ? 'bg-blue-50 text-blue-700 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          Lançamento de Notas & Motor MAC
        </button>

        {isDirecao && (
          <button
            onClick={() => setActiveSubTab('governanca_mac')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 ${
              activeSubTab === 'governanca_mac'
                ? 'bg-blue-50 text-blue-700 border-blue-600'
                : 'text-gray-700 hover:bg-gray-100 border-transparent'
            }`}
          >
            Governança da MAC (Fórmulas & Pesos)
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('solicitacoes')}
          className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 ${
            activeSubTab === 'solicitacoes'
              ? 'bg-blue-50 text-blue-700 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          Solicitações de Alteração de Nota
          {solicitacoes.filter(s => s.estado === 'Pendente').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
              {solicitacoes.filter(s => s.estado === 'Pendente').length}
            </span>
          )}
        </button>

        {(isProfessor || isDirecao || registosAuditoriaDirecao.length > 0) && (
          <button
            onClick={() => setActiveSubTab('auditoria_direcao')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'auditoria_direcao'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-600'
                : 'text-gray-700 hover:bg-gray-100 border-transparent'
            }`}
          >
            <Bell className="h-4 w-4 text-indigo-600" />
            <span>Auditoria da Direção</span>
            {registosNaoLidosProfessor.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {registosNaoLidosProfessor.length} nova(s)
              </span>
            ) : registosAuditoriaDirecao.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900">
                {registosAuditoriaDirecao.length}
              </span>
            ) : null}
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('pauta')}
          className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 ${
            activeSubTab === 'pauta'
              ? 'bg-green-50 text-green-700 border-green-600'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          Pauta Oficial (5 Assinaturas MED)
        </button>

        <button
          onClick={() => setActiveSubTab('ranking_turmas')}
          className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 flex items-center space-x-1.5 cursor-pointer ${
            activeSubTab === 'ranking_turmas'
              ? 'bg-amber-50 text-amber-900 border-amber-600'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          <Trophy className="h-4 w-4 text-amber-600" />
          <span>{currentUser?.ehProfessor ? 'Ranking das Minhas Turmas' : 'Rankings Académicos'}</span>
        </button>
      </div>

      {/* 0. RANKINGS ACADÉMICOS & TURMAS DO PROFESSOR */}
      {activeSubTab === 'ranking_turmas' && (
        <StudentRankingSection
          escola={escola}
          alunos={alunos}
          turmas={turmas}
          disciplinas={disciplinas}
          currentUser={currentUser}
          isDiretorPanel={isDirecao}
        />
      )}

      {/* 1. LANÇAMENTO DE NOTAS & AUTONOMIA DO PROFESSOR */}
      {activeSubTab === 'lancamento' && (
        isProfessor && turmasPermitidas.length === 0 ? (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-8 text-center space-y-3 max-w-lg mx-auto my-8">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-amber-900">Sem Turmas Atribuídas</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              {currentUser.genero === 'F' ? 'Prezada Professora' : 'Prezado Professor'} <strong>{currentUser.nomeCompleto}</strong>, ainda não possui turmas ou disciplinas atribuídas ao seu perfil docente para o ano letivo ativo ({escola.anoLectivoActivo || 'Sem Ano Ativo'}). Contacte a Coordenação Pedagógica ou a Direção da Escola para cadastrar as suas atribuições curriculares.
            </p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Seletor Hierárquico Coerente: Classe -> Turma -> Sala -> Curso e Disciplina */}
          <div className="bg-white border-2 border-blue-600 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-2">
                <School className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-gray-900 uppercase">Hierarquia Académica & Lançamento de Notas</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {turmaAtiva?.classe} {turmaAtiva?.classe && turmaAtiva.classe !== 'Iniciação' ? 'Classe' : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Turno: {turmaAtiva?.turno || 'Manhã'}
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Sala: {getSalaDaTurma(turmaAtiva)}
                </span>
                {isSegundoCiclo(selectedClasse) && (
                  <span className="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                    Curso: {getCursoDaTurma(turmaAtiva)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">1. Classe</label>
                <select
                  value={selectedClasse}
                  onChange={(e) => {
                    setSelectedClasse(e.target.value);
                    setSelectedCursoFilter('TODOS');
                  }}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {todasClasses.map(c => (
                    <option key={`ev-cl-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
                  ))}
                </select>
              </div>

              {isSegundoCiclo(selectedClasse) && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">2. Curso (IIº Ciclo)</label>
                  <select
                    value={selectedCursoFilter}
                    onChange={(e) => setSelectedCursoFilter(e.target.value)}
                    className="w-full text-xs font-bold text-purple-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="TODOS">Todos os Cursos</option>
                    {cursosDisponiveisClasse.map(c => (
                      <option key={`ev-cur-${c}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Turno</label>
                <select
                  value={selectedTurnoFilter}
                  onChange={(e) => setSelectedTurnoFilter(e.target.value)}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="TODOS">Todos</option>
                  {turnosDisponiveis.map(t => (
                    <option key={`ev-trn-${t}`} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Turma ({turmasDaClasse.length})
                </label>
                <select
                  value={selectedTurmaId}
                  onChange={(e) => setSelectedTurmaId(e.target.value)}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {turmasDaClasse.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nome} • {t.sala || 'Sala'} ({t.turno}) {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">5. Disciplina</label>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    {disciplinasDaClasseECurso.length} da {turmaAtiva?.classe}
                  </span>
                </div>
                <select
                  value={selectedDisciplinaId}
                  onChange={(e) => setSelectedDisciplinaId(e.target.value)}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {disciplinasDaClasseECurso.map((d: Disciplina) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">6. Trimestre</label>
                <select
                  value={selectedTrimestre}
                  onChange={(e) => setSelectedTrimestre(e.target.value as any)}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                </select>
              </div>
            </div>

            {/* Caixa de Pesquisa Rápida de Alunos Sanitizada contra ataques e ReDoS */}
            <div className="relative pt-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={buscaAlunoTabela}
                onChange={(e) => setBuscaAlunoTabela(sanitizeSearchInput(e.target.value, 80))}
                maxLength={80}
                placeholder={`Pesquisar estudante por nome, processo ou BI nesta turma (${alunosDaTurma.length} filtrados)...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Autonomia Pedagógica: Criar Avaliações Livres */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wide">
                  Autonomia Pedagógica do Professor
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  N Avaliações Livres
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-1">
                Cadastre quantas avaliações contínuas julgar necessárias para a turma (Provas, Testes, Trabalhos, Participação). O motor calcula a MAC instantaneamente.
              </p>
            </div>

            <button
              onClick={() => setShowNovaAvaliacaoModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Avaliação</span>
            </button>
          </div>

          {/* Banner de Reconhecimento Oficial de Escala (0-10 vs 0-20) e Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                escalaInfo.ehPrimario 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}>
                Escala Ativa: 0 a {escalaInfo.escalaMaxima} Valores
              </span>
              <span className="text-gray-700 font-semibold">
                {escalaInfo.ehPrimario 
                  ? 'Ensino Primário (1ª à 6ª classe) • Transição positiva a partir de 5.0 valores'
                  : 'Iº e IIº Ciclos do Ensino Secundário • Transição positiva a partir de 10.0 valores'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isDirecao && turmas.length > 0 && (
                <button
                  type="button"
                  onClick={abrirModalNotasAdm}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer text-xs whitespace-nowrap shrink-0"
                  title="Atribuir ou editar notas administrativas por classe, curso, turma e disciplina"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Atribuir Notas Administrativas</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportarNotasExcel}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer text-xs whitespace-nowrap shrink-0"
                title="Descarregar pauta em formato Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Exportar Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Alerta para Professor quando Diretor / Subdiretor Pedagógico alterou notas */}
          {registosNaoLidosProfessor.length > 0 && (
            <div className="p-3.5 bg-indigo-50 border-2 border-indigo-500 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-indigo-950">
                    {registosNaoLidosProfessor.length} alteração(ões) de nota pela Direção aguardando a sua leitura
                  </div>
                  <p className="text-[11px] text-indigo-900 mt-0.5">
                    Último registo: <strong>{registosNaoLidosProfessor[0].alunoNome}</strong> ({registosNaoLidosProfessor[0].disciplinaNome} • {registosNaoLidosProfessor[0].turmaNome}) — {registosNaoLidosProfessor[0].tipoNota}:{' '}
                    <strong>
                      {registosNaoLidosProfessor[0].notaAnteriorEmFalta
                        ? 'Em falta'
                        : `${Number(registosNaoLidosProfessor[0].notaAnterior).toFixed(1)} val.`}
                    </strong>{' '}
                    → <strong className="text-emerald-800">{Number(registosNaoLidosProfessor[0].novaNota).toFixed(1)} val.</strong>{' '}
                    por {registosNaoLidosProfessor[0].alteradoPorNome}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('auditoria_direcao')}
                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Ver Auditoria
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dbService.marcarTodasAlteracoesNotaComoLidas(currentUser.id, escola.id);
                    recarregarAuditoriaDirecao();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Marcar Lidas
                </button>
              </div>
            </div>
          )}

          {/* Banner de Aviso de Notas Fora do Intervalo */}
          {Object.keys(notasInvalidas).length > 0 && (
            <div className="p-3.5 bg-red-900/10 border-2 border-red-700 rounded-xl text-red-950 flex items-center justify-between text-xs font-bold animate-pulse shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-red-700 text-white rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black uppercase tracking-wider text-red-900">
                    Atenção: {Object.keys(notasInvalidas).length} Nota(s) Fora do Intervalo Permitido!
                  </span>
                  <p className="text-[11px] text-red-800 font-semibold mt-0.5">
                    Para o nível desta turma ({escalaInfo.rotuloEscala}), as notas devem estar estritamente entre <strong>0 e {escalaMaxima} valores</strong>. Os campos inválidos estão assinalados em vermelho escuro e o salvamento foi bloqueado até serem corrigidos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Lançamento de Notas */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3 sticky left-0 bg-gray-100 z-10 min-w-[200px]">Aluno / Matrícula</th>
                    {avaliacoesDaTurma.map((av) => (
                      <th key={av.id} className="p-3 min-w-[130px] border-l border-gray-200">
                        <div className="font-bold text-gray-900 truncate">{av.titulo}</div>
                        <div className="text-[10px] text-gray-500">{av.tipoNome} (Máx: {av.pontuacaoMaxima})</div>
                      </th>
                    ))}
                    <th className="p-3 bg-blue-50 text-blue-900 font-extrabold border-l-2 border-blue-600 min-w-[110px]">
                      MAC Calculada
                    </th>

                    {/* Prova do Professor (NPP) — Apenas visível quando ativada nas configurações escolares */}
                    {provaProfessorAtiva && (
                      <th className="p-3 bg-indigo-50 text-indigo-950 font-extrabold border-l-2 border-indigo-500 min-w-[125px]">
                        <div>Prova do Professor (NPP)</div>
                        <div className="text-[10px] text-indigo-700 font-normal">Escala (0-{escalaMaxima})</div>
                      </th>
                    )}

                    {/* Prova Trimestral (PT) — Prova Oficial do Trimestre */}
                    <th className="p-3 bg-purple-50 text-purple-900 font-extrabold border-l-2 border-purple-500 min-w-[125px]">
                      <div>Prova Trimestral (PT)</div>
                      <div className="text-[10px] text-purple-700 font-normal">Escala (0-{escalaMaxima})</div>
                    </th>

                    {/* Média Trimestral (MT) */}
                    <th className="p-3 bg-emerald-50 text-emerald-950 font-extrabold border-l border-emerald-400 min-w-[105px]">
                      <div>Média Trimestral (MT)</div>
                      <div className="text-[10px] text-emerald-700 font-normal">
                        {provaProfessorAtiva ? '(MAC + NPP + PT) / 3' : '(MAC + PT) / 2'}
                      </div>
                    </th>

                    {/* Exame e MF — Visíveis ESTRITAMENTE para classes finais (6ª, 9ª, 12ª, 13ª) */}
                    {ehClasseFinal && (
                      <>
                        <th className="p-3 bg-amber-50 text-amber-950 font-extrabold border-l-2 border-amber-500 min-w-[130px]">
                          <div className="flex items-center space-x-1">
                            <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Exame (Júri / NEE)</span>
                          </div>
                          <div className="text-[10px] text-amber-700 font-normal">
                            {isMembroJuriOuDirecao ? 'Comissão de Júri (Editável)' : 'Júri / Homologado'}
                          </div>
                        </th>
                        <th className="p-3 bg-indigo-50 text-indigo-950 font-extrabold border-l border-indigo-300 min-w-[105px]">
                          <div>Média Final (MF)</div>
                          <div className="text-[10px] text-indigo-700 font-normal">Com Exame (0.4/0.6)</div>
                        </th>
                      </>
                    )}

                    <th className="p-3 bg-green-50 text-green-900 font-extrabold border-l border-green-300 min-w-[100px]">
                      Comportamento
                    </th>
                    <th className="p-3 min-w-[120px] text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alunosDaTurma.length === 0 ? (
                    <tr>
                      <td colSpan={avaliacoesDaTurma.length + 4 + (provaProfessorAtiva ? 1 : 0) + (ehClasseFinal ? 2 : 0)} className="p-6 text-center text-gray-500">
                        Nenhum aluno matriculado nesta turma.
                      </td>
                    </tr>
                  ) : (
                    alunosDaTurma.map((aluno) => {
                      const resMAC = calcularMACEstudante(
                        aluno.id,
                        avaliacoesDaTurma,
                        notas,
                        regraVigente,
                        turmaAtiva.nivelEnsino,
                        turmaAtiva.classe
                      );

                      const notaConsol = notasConsolidadas.find(c => 
                        c.alunoId === aluno.id && 
                        correspondeDiscEval(c) && 
                        normTriEval(c.trimestre) === normTriEval(selectedTrimestre)
                      );

                      const compNota = notaConsol?.comportamentoNota;
                      const compConceito = compNota !== undefined && compNota !== null 
                        ? converterComportamentoParaConceito(compNota, escalaMaxima) 
                        : (aluno.comportamentoConceito || '—');

                      // Prova do Professor (NPP) quando ativa nas configurações
                      const chaveNpp = `npp-${aluno.id}`;
                      const nppVal = nppDigitadas[aluno.id] !== undefined 
                        ? nppDigitadas[aluno.id] 
                        : (notaConsol?.npp !== undefined && notaConsol?.npp !== null ? String(notaConsol.npp) : '');
                      const isNppInvalid = !!notasInvalidas[chaveNpp];
                      const nppErroMsg = notasInvalidas[chaveNpp];
                      const nppNum = nppVal !== '' ? parseFloat(nppVal.replace(/,/g, '.')) : undefined;
                      const temNpp = nppNum !== undefined && !isNaN(nppNum);

                      // Prova Trimestral (PT / NPT) pelo Professor
                      const chavePt = `pt-${aluno.id}`;
                      const ptSalvo = extrairNptConsolidada(notaConsol);
                      const ptVal = ptDigitadas[aluno.id] !== undefined 
                        ? ptDigitadas[aluno.id] 
                        : (ptSalvo !== undefined ? String(ptSalvo) : '');
                      const isPtInvalid = !!notasInvalidas[chavePt];
                      const ptErroMsg = notasInvalidas[chavePt];
                      const ptNum = ptVal !== '' ? parseFloat(ptVal.replace(/,/g, '.')) : undefined;
                      const temPt = ptNum !== undefined && !isNaN(ptNum);

                      // Média Trimestral (MT) rigorosa segundo a fórmula configurada
                      const macNum = resMAC.totalAvaliacoesUtilizadas > 0
                        ? resMAC.macCalculada
                        : (typeof notaConsol?.mac === 'number' ? notaConsol.mac : 0);
                      const calcTrimLinha = calcularNotaTrimestralDinamica(
                        macNum,
                        temNpp ? nppNum : undefined,
                        temPt ? ptNum : undefined,
                        regraVigente,
                        Number(selectedTrimestre),
                        turmaAtiva.classe,
                        provaProfessorAtiva
                      );
                      const temAlgumInput = resMAC.totalAvaliacoesUtilizadas > 0 || temNpp || temPt || typeof notaConsol?.mac === 'number';
                      const mediaTrimestralCalculada = temAlgumInput
                        ? calcTrimLinha.mediaTrimestral
                        : (notaConsol?.mediaTrimestral ?? macNum);
                      const aprovadoTrimestre = mediaTrimestralCalculada >= escalaInfo.notaAprovacao;

                      // Exame de Júri (NEE) — Apenas para classes finais!
                      const chaveExame = `exame-${aluno.id}`;
                      const exameVal = exameDigitados[aluno.id] !== undefined 
                        ? exameDigitados[aluno.id] 
                        : (notaConsol?.notaExame !== undefined && notaConsol?.notaExame !== null ? String(notaConsol.notaExame) : '');
                      const isExameInvalid = !!notasInvalidas[chaveExame];
                      const exameErroMsg = notasInvalidas[chaveExame];
                      const exameNum = (ehClasseFinal && exameVal !== '') ? parseFloat(exameVal.replace(/,/g, '.')) : undefined;
                      const temExame = ehClasseFinal && exameNum !== undefined && !isNaN(exameNum);

                      // Média Final (MF) rigorosa usando MT1, MT2, MT3 reais + regra configurada
                      const n1Al = notasConsolidadas.find(c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '1');
                      const n2Al = notasConsolidadas.find(c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '2');
                      const n3Al = notasConsolidadas.find(c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '3');
                      const mt1Real = Number(selectedTrimestre) === 1 ? mediaTrimestralCalculada : (n1Al?.mediaTrimestral ?? mediaTrimestralCalculada);
                      const mt2Real = Number(selectedTrimestre) === 2 ? mediaTrimestralCalculada : (n2Al?.mediaTrimestral ?? mediaTrimestralCalculada);
                      const mt3Real = Number(selectedTrimestre) === 3 ? mediaTrimestralCalculada : (n3Al?.mediaTrimestral ?? mediaTrimestralCalculada);

                      const calcMFLinha = calcularMediaFinal3Trimestre(
                        mt1Real,
                        mt2Real,
                        mt3Real,
                        temExame ? exameNum : undefined,
                        regraVigente,
                        turmaAtiva.classe
                      );
                      const mediaFinalCalculada = (String(selectedTrimestre) === '3' || temExame)
                        ? calcMFLinha.mediaFinal
                        : (notaConsol?.notaFinal ?? mediaTrimestralCalculada);
                      const aprovadoFinal = mediaFinalCalculada >= escalaInfo.notaAprovacao;

                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50/70">
                          <td className="p-3 sticky left-0 bg-white z-10 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{aluno.nomeCompleto}</span>
                              {notaConsol?.origemNota === 'Administrativa' && (
                                <span
                                  className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 rounded"
                                  title={`Nota administrativa atribuída por ${notaConsol.notaAdministrativaInfo?.atribuidaPorNome || 'Direção'}`}
                                >
                                  ADM
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">{aluno.codigoMatricula}</div>
                          </td>

                          {avaliacoesDaTurma.map((av) => {
                            const chave = `${av.id}-${aluno.id}`;
                            const notaAluno = notas.find(n => n.avaliacaoId === av.id && n.alunoId === aluno.id);
                            const isInvalid = !!notasInvalidas[chave];
                            const erroMsg = notasInvalidas[chave];
                            const val = valoresDigitados[chave] !== undefined 
                              ? valoresDigitados[chave] 
                              : (notaAluno ? notaAluno.valorNota : '');

                            return (
                              <td key={av.id} className="p-2 border-l border-gray-200 relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  step="0.5"
                                  min="0"
                                  max={escalaMaxima}
                                  value={val}
                                  onKeyDown={(e) => handleStrictNumericKeyDown(e, true)}
                                  onPaste={(e) => handleStrictNumericPaste(e, (novo) => handleNotaChange(av.id, aluno.id, novo), true)}
                                  onFocus={() => registarInicioFocoNota(chave, notaAluno?.valorNota ?? null, av.titulo)}
                                  onBlur={(e) => finalizarFocoNotaDirecao(chave, aluno, e.target.value, 'MAC', av.titulo)}
                                  onChange={(e) => handleNotaChange(av.id, aluno.id, e.target.value)}
                                  placeholder="0.0"
                                  title={isInvalid ? erroMsg : `Escala oficial: 0 a ${escalaMaxima}`}
                                  className={`w-full text-center text-xs font-black rounded p-1.5 focus:outline-none transition-all ${
                                    isInvalid
                                      ? 'border-2 border-red-700 bg-red-900/20 text-red-950 font-black ring-2 ring-red-600 focus:ring-red-800'
                                      : 'text-gray-900 bg-white border border-gray-300 focus:ring-2 focus:ring-blue-600'
                                  }`}
                                />
                                {isInvalid && (
                                  <div className="text-[9px] font-black text-red-900 bg-red-100 border border-red-400 rounded px-1 py-0.5 mt-0.5 text-center shadow-2xs">
                                    ⚠️ 0 a {escalaMaxima}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* MAC Calculada pelo Motor */}
                          <td className="p-3 bg-blue-50/50 border-l-2 border-blue-600">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-sm font-extrabold text-blue-800">
                                {turmaAtiva.classe === 'Iniciação' ? resMAC.conceitoIniciacao : resMAC.macCalculada}
                              </span>
                              {turmaAtiva.classe !== 'Iniciação' && (
                                <span className="text-[10px] text-gray-500">/{resMAC.escalaMaxima}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate" title={resMAC.detalheCalculo}>
                              {resMAC.cumpriuMinimoExigido ? 'Válida' : `Pendente (${resMAC.totalAvaliacoesUtilizadas}/${resMAC.minimoExigido})`}
                            </div>
                          </td>

                          {/* Prova do Professor (NPP) — Se ativa */}
                          {provaProfessorAtiva && (
                            <td className="p-2 bg-indigo-50/40 border-l-2 border-indigo-400 relative text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={nppVal}
                                  placeholder="0.0"
                                  onKeyDown={(e) => handleStrictNumericKeyDown(e, true)}
                                  onPaste={(e) => handleStrictNumericPaste(e, (novo) => handleNppChange(aluno.id, novo, resMAC), true)}
                                  onFocus={() => registarInicioFocoNota(chaveNpp, notaConsol?.npp ?? null, 'NPP')}
                                  onBlur={(e) => finalizarFocoNotaDirecao(chaveNpp, aluno, e.target.value, 'NPP')}
                                  onChange={(e) => handleNppChange(aluno.id, e.target.value, resMAC)}
                                  className={`w-16 text-center text-xs font-black p-1.5 rounded focus:outline-none transition-all shadow-2xs ${
                                    isNppInvalid
                                      ? 'border-2 border-red-700 bg-red-900/20 text-red-950 ring-2 ring-red-600'
                                      : 'text-indigo-950 bg-white border border-indigo-400 focus:ring-2 focus:ring-indigo-600'
                                  }`}
                                  title={isNppInvalid ? nppErroMsg : `Prova do Professor (NPP). Escala: 0 a ${escalaMaxima}`}
                                />
                                <span className="text-[10px] text-indigo-700 font-bold">/{escalaMaxima}</span>
                              </div>
                              {isNppInvalid && (
                                <div className="text-[9px] font-black text-red-900 bg-red-100 border border-red-400 rounded px-1 py-0.5 mt-0.5 text-center shadow-2xs">
                                  ⚠️ 0 a {escalaMaxima}
                                </div>
                              )}
                            </td>
                          )}

                          {/* Prova Trimestral (PT / NPT) pelo Professor */}
                          <td className="p-2 bg-purple-50/40 border-l-2 border-purple-400 relative text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ptVal}
                                placeholder="0.0"
                                onKeyDown={(e) => handleStrictNumericKeyDown(e, true)}
                                onPaste={(e) => handleStrictNumericPaste(e, (novo) => handleProvaTrimestralChange(aluno.id, novo, resMAC), true)}
                                onFocus={() => registarInicioFocoNota(chavePt, ptSalvo ?? null, 'NPT')}
                                onBlur={(e) => finalizarFocoNotaDirecao(chavePt, aluno, e.target.value, 'NPT')}
                                onChange={(e) => handleProvaTrimestralChange(aluno.id, e.target.value, resMAC)}
                                className={`w-16 text-center text-xs font-black p-1.5 rounded focus:outline-none transition-all shadow-2xs ${
                                  isPtInvalid
                                    ? 'border-2 border-red-700 bg-red-900/20 text-red-950 ring-2 ring-red-600'
                                    : 'text-purple-950 bg-white border border-purple-400 focus:ring-2 focus:ring-purple-600'
                                }`}
                                title={isPtInvalid ? ptErroMsg : `Lançamento da Prova Trimestral (PT). Escala: 0 a ${escalaMaxima}`}
                              />
                              <span className="text-[10px] text-purple-700 font-bold">/{escalaMaxima}</span>
                            </div>
                            {isPtInvalid && (
                              <div className="text-[9px] font-black text-red-900 bg-red-100 border border-red-400 rounded px-1 py-0.5 mt-0.5 text-center shadow-2xs">
                                ⚠️ 0 a {escalaMaxima}
                              </div>
                            )}
                          </td>

                          {/* Média Trimestral (MT) Oficial Calculada */}
                          <td className="p-2.5 bg-emerald-50/40 border-l border-emerald-400 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                aprovadoTrimestre 
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                                  : 'bg-red-100 text-red-950 border border-red-300'
                              }`}>
                                {mediaTrimestralCalculada}
                                <span className="text-[9px] font-normal text-gray-500">/{escalaMaxima}</span>
                              </span>
                              <span className="text-[9px] text-gray-500 mt-0.5">
                                {provaProfessorAtiva ? (temNpp && temPt ? '(MAC+NPP+PT)/3' : 'MT') : (temPt ? '(MAC+PT)/2' : 'MAC')}
                              </span>
                            </div>
                          </td>

                          {/* Nota de Exame e MF — Apenas para Classes Finais (6ª, 9ª, 12ª, 13ª) */}
                          {ehClasseFinal && (
                            <>
                              <td className="p-2 bg-amber-50/40 border-l-2 border-amber-400 relative text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  {isMembroJuriOuDirecao ? (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={exameVal}
                                      placeholder="0.0"
                                      onKeyDown={(e) => handleStrictNumericKeyDown(e, true)}
                                      onPaste={(e) => handleStrictNumericPaste(e, (novo) => handleExameJuriChange(aluno.id, novo, resMAC), true)}
                                      onFocus={() => registarInicioFocoNota(chaveExame, notaConsol?.notaExame ?? null, 'Exame')}
                                      onBlur={(e) => finalizarFocoNotaDirecao(chaveExame, aluno, e.target.value, 'Exame')}
                                      onChange={(e) => handleExameJuriChange(aluno.id, e.target.value, resMAC)}
                                      className={`w-16 text-center text-xs font-black p-1.5 rounded focus:outline-none transition-all shadow-2xs ${
                                        isExameInvalid
                                          ? 'border-2 border-red-700 bg-red-900/20 text-red-950 ring-2 ring-red-600'
                                          : 'text-amber-950 bg-white border border-amber-400 focus:ring-2 focus:ring-amber-600'
                                      }`}
                                      title={isExameInvalid ? exameErroMsg : `Lançamento do Exame de Júri. Escala: 0 a ${escalaMaxima}`}
                                    />
                                  ) : (
                                    <div 
                                      className="w-16 py-1.5 px-1 bg-gray-100 border border-gray-300 rounded text-center text-xs font-bold text-gray-600 flex items-center justify-center space-x-1 cursor-not-allowed"
                                      title="Apenas a Comissão de Júri ou Direção podem lançar a nota de Exame."
                                    >
                                      <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span>{exameVal !== '' ? exameVal : '—'}</span>
                                    </div>
                                  )}
                                  <span className="text-[10px] text-amber-700 font-bold">/{escalaMaxima}</span>
                                </div>
                                {isExameInvalid && (
                                  <div className="text-[9px] font-black text-red-900 bg-red-100 border border-red-400 rounded px-1 py-0.5 mt-0.5 text-center shadow-2xs">
                                    ⚠️ 0 a {escalaMaxima}
                                  </div>
                                )}
                              </td>

                              <td className="p-2.5 bg-indigo-50/40 border-l border-indigo-300 text-center">
                                {temExame ? (
                                  <div className="flex flex-col items-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                      aprovadoFinal 
                                        ? 'bg-indigo-100 text-indigo-950 border border-indigo-300' 
                                        : 'bg-red-100 text-red-950 border border-red-300'
                                    }`}>
                                      {mediaFinalCalculada}
                                      <span className="text-[9px] font-normal text-gray-500">/{escalaMaxima}</span>
                                    </span>
                                    <span className="text-[9px] text-indigo-700 font-semibold mt-0.5">
                                      {aprovadoFinal ? 'Aprovado' : 'Não Aprovado'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 font-semibold">—</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Comportamento 0-10 no Primário ou 0-20 no Secundário e Conversão Qualitativa */}
                          <td className="p-2.5 bg-green-50/50 border-l border-green-300 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <div className="flex items-center justify-center space-x-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={compNota !== undefined && compNota !== null ? compNota : ''}
                                  placeholder="—"
                                  onKeyDown={(e) => handleStrictNumericKeyDown(e, true)}
                                  onPaste={(e) => handleStrictNumericPaste(e, (novo) => {
                                    const num = parseFloat(novo.replace(/,/g, '.'));
                                    if (!isNaN(num)) {
                                      handleComportamentoChange(aluno.id, Math.max(0, Math.min(escalaMaxima, num)));
                                    }
                                  }, true)}
                                  onChange={(e) => {
                                    const textVal = e.target.value.trim().replace(/,/g, '.');
                                    if (textVal === '') {
                                      handleComportamentoChange(aluno.id, undefined, undefined);
                                    } else {
                                      const num = parseFloat(textVal);
                                      if (!isNaN(num)) {
                                        const val = Math.max(0, Math.min(escalaMaxima, num));
                                        handleComportamentoChange(aluno.id, val);
                                      }
                                    }
                                  }}
                                  className="w-12 text-center text-xs font-black p-1 bg-white border border-green-400 rounded focus:ring-2 focus:ring-green-600 focus:outline-none text-green-950 shadow-2xs"
                                  title={`Atribuir nota comportamental de 0 a ${escalaMaxima} valores (vazio se não registado)`}
                                />
                                <span className="text-[10px] text-green-800 font-bold">/{escalaMaxima}</span>
                              </div>

                              <select
                                value={compConceito && compConceito !== '—' && compConceito !== '— (A Avaliar)' ? compConceito : ''}
                                onChange={(e) => {
                                  const c = e.target.value;
                                  if (!c) {
                                    handleComportamentoChange(aluno.id, undefined, undefined);
                                  } else if (c === 'Excelente') {
                                    handleComportamentoChange(aluno.id, escalaMaxima === 10 ? 10 : 19, 'Excelente');
                                  } else if (c === 'Muito Bom') {
                                    handleComportamentoChange(aluno.id, escalaMaxima === 10 ? 9 : 16, 'Muito Bom');
                                  } else if (c === 'Bom') {
                                    handleComportamentoChange(aluno.id, escalaMaxima === 10 ? 7.5 : 14, 'Bom');
                                  } else if (c === 'Suficiente') {
                                    handleComportamentoChange(aluno.id, escalaMaxima === 10 ? 5 : 10, 'Suficiente');
                                  } else if (c === 'Mau') {
                                    handleComportamentoChange(aluno.id, escalaMaxima === 10 ? 3.5 : 7, 'Mau');
                                  }
                                }}
                                className="text-[10px] font-bold p-0.5 bg-white border border-green-300 rounded text-green-950 max-w-[100px] cursor-pointer"
                                title="Selecione o conceito de comportamento oficial"
                              >
                                <option value="">— A Avaliar —</option>
                                <option value="Excelente">Excelente ({escalaMaxima === 10 ? '10v' : '19v'})</option>
                                <option value="Muito Bom">Muito Bom ({escalaMaxima === 10 ? '9v' : '16v'})</option>
                                <option value="Bom">Bom ({escalaMaxima === 10 ? '7.5v' : '14v'})</option>
                                <option value="Suficiente">Suficiente ({escalaMaxima === 10 ? '5v' : '10v'})</option>
                                <option value="Mau">Mau ({escalaMaxima === 10 ? '3.5v' : '7v'})</option>
                              </select>
                            </div>
                          </td>

                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            {isDirecao ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setRetificacaoAluno(aluno);
                                  setRetificacaoTipoNota('MT');
                                  const nAnt = Number(notaConsol?.mediaTrimestral || notaConsol?.notaFinal || resMAC.macCalculada || 10);
                                  setRetificacaoNotaAnterior(nAnt);
                                  setRetificacaoNovaNota(nAnt);
                                  setRetificacaoMotivo('');
                                  setModalRetificacaoDirecaoOpen(true);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                title="Retificação executiva imediata pela Direção Geral / Subdireção com averbamento no perfil do Professor titular"
                              >
                                <ShieldCheck className="w-3 h-3 text-amber-700" />
                                <span>Retificar Nota</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSolAlunoId(aluno.id);
                                  setSolAvaliacaoId(avaliacoesDaTurma[0]?.id || '');
                                  setShowSolicitacaoModal(true);
                                }}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                title="Solicitar alteração formal de nota à Direção"
                              >
                                Pedir Correção
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* 2. GOVERNANÇA DA MAC (FÓRMULAS & PESOS) */}
      {activeSubTab === 'governanca_mac' && isDirecao && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Parametrização Dinâmica do Motor de Cálculo da MAC
                </h3>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold text-blue-800 bg-blue-100 rounded-full border border-blue-300">
                Governança Pedagógica
              </span>
            </div>

            <p className="text-xs text-gray-600">
              A Direção Escolar e a Administração Geral definem quais fórmulas matemáticas, pesos e tipos de avaliações são permitidos por nível de ensino. O motor efetua o recálculo em tempo real com versionamento das regras.
            </p>

            <form onSubmit={handleSalvarRegraMAC} className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Nível de Ensino</label>
                  <select
                    value={editingRegraNivel}
                    onChange={(e) => setEditingRegraNivel(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Primario">Ensino Primário (1ª à 6ª)</option>
                    <option value="ICiclo">Iº Ciclo (7ª à 9ª)</option>
                    <option value="IICiclo">IIº Ciclo (10ª à 13ª)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Fórmula de Cálculo da MAC</label>
                  <select
                    value={regraFormulaTipo}
                    onChange={(e) => setRegraFormulaTipo(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="ARITMETICA_SIMPLES">Média Aritmética Simples: SUM(notas) / COUNT(notas)</option>
                    <option value="PONDERADA_POR_TIPO">Média Ponderada Agrupada por Tipos de Avaliação</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mínimo de Avaliações Exigidas</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={regraMinAvaliacoes}
                    onChange={(e) => setRegraMinAvaliacoes(parseInt(e.target.value) || 2)}
                    className="w-full p-2 border border-gray-300 rounded-md font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {regraFormulaTipo === 'PONDERADA_POR_TIPO' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <h4 className="font-bold text-gray-800">Pesos por Tipo de Avaliação</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {tiposAvaliacao.map((tipo) => (
                      <div key={tipo.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                        <span className="font-semibold text-gray-800 truncate mr-2">{tipo.nome}</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={regraPesos[tipo.id] || 1}
                          onChange={(e) => setRegraPesos({
                            ...regraPesos,
                            [tipo.id]: parseInt(e.target.value) || 1
                          })}
                          className="w-16 p-1 text-center font-bold border border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FÓRMULAS DE CÁLCULO DE CADA TRIMESTRE (MED ANGOLA / DIRETOR GERAL) */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">Fórmulas de Cálculo da Média Trimestral (MT) por Trimestre</h4>
                    <p className="text-[11px] text-indigo-800">
                      Configure a ponderação dos componentes (MAC, Prova do Professor/NPP e Prova Trimestral/NPT) ou escreva uma expressão matemática direta.
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded font-mono">
                    Variáveis: MAC, NPP, NPT
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">1º Trimestre (Expressão ou Padrão)</label>
                    <input
                      type="text"
                      value={regraFormula1Tri}
                      onChange={(e) => setRegraFormula1Tri(e.target.value)}
                      placeholder="(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Ex: (MAC + NPP + NPT) / 3</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">2º Trimestre (Expressão ou Padrão)</label>
                    <input
                      type="text"
                      value={regraFormula2Tri}
                      onChange={(e) => setRegraFormula2Tri(e.target.value)}
                      placeholder="(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Ex: (MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">3º Trimestre (Expressão ou Padrão)</label>
                    <input
                      type="text"
                      value={regraFormula3Tri}
                      onChange={(e) => setRegraFormula3Tri(e.target.value)}
                      placeholder="(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Ex: (MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200">
                  <span className="font-bold text-gray-700 block mb-1">Ponderação Percentual Padrão dos Trimestres:</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-300">
                      <span className="text-gray-700 font-bold">Peso MAC (%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={regraPesoMac}
                        onChange={(e) => setRegraPesoMac(Number(e.target.value) || 0)}
                        className="w-16 p-1 text-center font-bold border rounded"
                      />
                    </div>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-300">
                      <span className="text-gray-700 font-bold">Peso NPP (%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={regraPesoNpp}
                        onChange={(e) => setRegraPesoNpp(Number(e.target.value) || 0)}
                        className="w-16 p-1 text-center font-bold border rounded"
                      />
                    </div>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-300">
                      <span className="text-gray-700 font-bold">Peso NPT (%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={regraPesoNpt}
                        onChange={(e) => setRegraPesoNpt(Number(e.target.value) || 0)}
                        className="w-16 p-1 text-center font-bold border rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FÓRMULAS DE MÉDIA GERAL DA CLASSE E CLASSES FINAIS DE EXAME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Média Geral da Classe (Classes de Transição) */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-950 text-sm">Média Geral da Classe (Classes Normais / Transição)</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded font-mono">
                      Variáveis: MT1, MT2, MT3
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Define como calcular a média final anual nas classes de transição (ex: 7ª e 8ª, 10ª e 11ª).
                  </p>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Expressão Matemática Oficial</label>
                    <input
                      type="text"
                      value={regraFormulaMediaGeral}
                      onChange={(e) => setRegraFormulaMediaGeral(e.target.value)}
                      placeholder="(MT1 + MT2 + MT3) / 3"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Padrão oficial MED: <code>(MT1 + MT2 + MT3) / 3</code> ou ponderada <code>(MT1*0.2) + (MT2*0.3) + (MT3*0.5)</code>
                    </span>
                  </div>
                </div>

                {/* 2. Classes Finais com Exame */}
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-950 text-sm">Classes Finais com Exame (MF)</h4>
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-mono">
                      Variáveis: MDF, NE
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Ponderação entre Média de Frequência (MDF) e Nota de Exame (NE).
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Peso MDF (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={regraPesoMDF}
                        onChange={(e) => setRegraPesoMDF(Number(e.target.value) || 40)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Peso Exame / NE (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={regraPesoNE}
                        onChange={(e) => setRegraPesoNE(Number(e.target.value) || 60)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Fórmula Alternativa Customizada</label>
                    <input
                      type="text"
                      value={regraFormulaClassesFinais}
                      onChange={(e) => setRegraFormulaClassesFinais(e.target.value)}
                      placeholder="(MDF * 0.4) + (NE * 0.6)"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block mb-1">Classes de Exame Abrangidas:</span>
                    <div className="flex flex-wrap gap-2">
                      {['6ª', '9ª', '12ª', '13ª'].map(cls => (
                        <label key={cls} className="flex items-center space-x-1.5 bg-white px-2 py-1 border border-gray-300 rounded cursor-pointer text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={regraClassesFinais.includes(cls)}
                            onChange={(e) => {
                              if (e.target.checked) setRegraClassesFinais([...regraClassesFinais, cls]);
                              else setRegraClassesFinais(regraClassesFinais.filter(c => c !== cls));
                            }}
                            className="rounded text-amber-600"
                          />
                          <span>{cls} Classe</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SIMULADOR DE FÓRMULAS INTERATIVO AO VIVO */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-sm text-slate-100">Simulador de Fórmulas em Tempo Real</h4>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-700 px-2.5 py-0.5 rounded-full">
                    Escala: 0 a {simEscalaMaxima} valores
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Teste aqui qualquer valor antes de salvar para verificar se os resultados pedagógicos condizem com o desejado.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">MAC</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simMac}
                      onChange={(e) => setSimMac(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">NPP</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simNpp}
                      onChange={(e) => setSimNpp(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">NPT</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simNpt}
                      onChange={(e) => setSimNpt(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">MT 1</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simMt1}
                      onChange={(e) => setSimMt1(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">MT 2</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simMt2}
                      onChange={(e) => setSimMt2(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">MT 3</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simMt3}
                      onChange={(e) => setSimMt3(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Exame (NE)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={simEscalaMaxima}
                      value={simNE}
                      onChange={(e) => setSimNE(Number(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 text-white border border-slate-700 rounded text-center font-bold"
                    />
                  </div>
                </div>

                {/* Resultados Simulados Calculados */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">MT Trimestral (Fórmula 1º Tri)</span>
                    <strong className="text-base font-mono text-blue-400">{simResultadoTrimestre} val.</strong>
                    <span className={`block text-[10px] font-bold ${simResultadoTrimestre >= (simEscalaMaxima === 10 ? 5 : 10) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simResultadoTrimestre >= (simEscalaMaxima === 10 ? 5 : 10) ? 'Aproveitamento Positivo' : 'Necessita Apoio'}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">Média Geral da Classe (Anual)</span>
                    <strong className="text-base font-mono text-emerald-400">{simResultadoMediaGeral} val.</strong>
                    <span className={`block text-[10px] font-bold ${simResultadoMediaGeral >= (simEscalaMaxima === 10 ? 5 : 10) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simResultadoMediaGeral >= (simEscalaMaxima === 10 ? 5 : 10) ? 'Aprovado / Transita' : 'Não Transita'}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block">Média Final c/ Exame (Classes Finais)</span>
                    <strong className="text-base font-mono text-amber-400">{simResultadoExameFinal} val.</strong>
                    <span className={`block text-[10px] font-bold ${simResultadoExameFinal >= (simEscalaMaxima === 10 ? 5 : 10) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simResultadoExameFinal >= (simEscalaMaxima === 10 ? 5 : 10) ? 'Aprovado no Exame' : 'Recurso / Reprovado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="descartarCheck"
                  checked={regraDescartarMenor}
                  onChange={(e) => setRegraDescartarMenor(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="descartarCheck" className="font-semibold text-gray-800">
                  Descartar a menor nota obtida pelo aluno (quando houver mais avaliações que o mínimo exigido)
                </label>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Salvar Regra & Recalcular Toda a Escola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SOLICITAÇÕES DE ALTERAÇÃO DE NOTA */}
      {activeSubTab === 'solicitacoes' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border-2 border-amber-600 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Segurança e Integridade Pedagógica: Solicitação de Alteração de Nota
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Os professores não alteram diretamente notas publicadas em pauta. Devem submeter um pedido fundamentado com a prova física para homologação expressa da Direção Pedagógica.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Data / Protocolo</th>
                    <th className="p-3">Professor Solicitante</th>
                    <th className="p-3">Aluno Afetado</th>
                    <th className="p-3">Avaliação</th>
                    <th className="p-3">Nota Atual → Proposta</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3">Estado</th>
                    {isDirecao && <th className="p-3 text-right">Decisão da Direção</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {solicitacoes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-500">
                        Nenhuma solicitação de alteração pendente ou registada.
                      </td>
                    </tr>
                  ) : (
                    solicitacoes.map((sol) => (
                      <tr key={sol.id} className="hover:bg-gray-50/70">
                        <td className="p-3 text-gray-500 font-mono">
                          {sol.dataSolicitacao}
                          <div className="text-[10px] text-gray-400">{sol.id}</div>
                        </td>
                        <td className="p-3 font-bold text-gray-900">{sol.professorNome}</td>
                        <td className="p-3 font-medium text-gray-800">
                          {sol.alunoNome}
                          <div className="text-[10px] text-gray-500">{sol.turmaNome}</div>
                        </td>
                        <td className="p-3 text-gray-700">{sol.avaliacaoTitulo}</td>
                        <td className="p-3 font-extrabold text-blue-700">
                          {sol.notaAnterior} → {sol.notaProposta} val.
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs">{sol.motivo}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sol.estado === 'Aprovado' 
                              ? 'bg-green-100 text-green-800 border border-green-300' 
                              : sol.estado === 'Rejeitado'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {sol.estado}
                          </span>
                        </td>
                        {isDirecao && (
                          <td className="p-3 text-right space-x-1.5">
                            {sol.estado === 'Pendente' ? (
                              <>
                                <button
                                  onClick={() => handleDecisaoSolicitacao(sol, 'Aprovado', 'Aprovado em despacho pedagógico')}
                                  className="px-2 py-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-600 rounded hover:bg-green-100"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => handleDecisaoSolicitacao(sol, 'Rejeitado', 'Fundamentação insuficiente')}
                                  className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-600 rounded hover:bg-red-100"
                                >
                                  Rejeitar
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-gray-400">Processado</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3.5 AUDITORIA DE ALTERAÇÕES DE NOTAS PELA DIREÇÃO */}
      {activeSubTab === 'auditoria_direcao' && (
        <div className="space-y-5">
          <div className="p-4 bg-indigo-50 border-2 border-indigo-500 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <History className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-black text-indigo-950">
                  Auditoria de Notas Alteradas pelo Diretor Geral e Subdiretor Pedagógico
                </h4>
                <p className="text-xs text-indigo-900 mt-0.5">
                  Registo transparente de todas as retificações executivas, alterações diretas na pauta e atribuições administrativas de notas, incluindo nota anterior, nova nota, disciplina, turma, autor e motivo.
                </p>
              </div>
            </div>
            {registosNaoLidosProfessor.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  dbService.marcarTodasAlteracoesNotaComoLidas(currentUser.id, escola.id);
                  recarregarAuditoriaDirecao();
                }}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg inline-flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Marcar todas como lidas ({registosNaoLidosProfessor.length})</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={buscaAuditoriaDirecao}
              onChange={(e) => setBuscaAuditoriaDirecao(sanitizeSearchInput(e.target.value, 80))}
              placeholder="Pesquisar por aluno, disciplina, turma ou autor da alteração..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Estudante</th>
                    <th className="p-3">Classe / Turma</th>
                    <th className="p-3">Disciplina & Trim.</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-center">Nota Anterior → Nova Nota</th>
                    <th className="p-3">Alterado por</th>
                    <th className="p-3">Motivo / Observação</th>
                    <th className="p-3 text-right">Leitura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const filtrados = registosAuditoriaDirecao.filter((r) => {
                      if (!buscaAuditoriaDirecao.trim()) return true;
                      return (
                        safeSearchMatch(r.alunoNome, buscaAuditoriaDirecao) ||
                        safeSearchMatch(r.disciplinaNome, buscaAuditoriaDirecao) ||
                        safeSearchMatch(r.turmaNome, buscaAuditoriaDirecao) ||
                        safeSearchMatch(r.alteradoPorNome, buscaAuditoriaDirecao) ||
                        safeSearchMatch(r.professorNome, buscaAuditoriaDirecao)
                      );
                    });
                    if (filtrados.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-gray-500">
                            Nenhuma alteração de nota pela Direção registada até ao momento.
                          </td>
                        </tr>
                      );
                    }
                    return filtrados.map((reg) => {
                      const ehMeuRegisto = reg.professorId === currentUser.id;
                      const naoLida = ehMeuRegisto && !reg.lidoPeloProfessor;
                      return (
                        <tr
                          key={reg.id}
                          className={naoLida ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-gray-50'}
                        >
                          <td className="p-3 text-gray-600 font-mono whitespace-nowrap">
                            {reg.dataHora}
                          </td>
                          <td className="p-3 font-bold text-gray-900">{reg.alunoNome}</td>
                          <td className="p-3 text-gray-700">
                            <div className="font-semibold">{reg.classe} • {reg.turmaNome}</div>
                            {reg.curso && (
                              <div className="text-[10px] text-purple-700 font-semibold">{reg.curso}</div>
                            )}
                          </td>
                          <td className="p-3 text-gray-800">
                            <div className="font-semibold">{reg.disciplinaNome}</div>
                            <div className="text-[10px] text-gray-500">{reg.trimestre}º Trimestre</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 font-bold text-gray-800 text-[10px]">
                              {reg.tipoNota}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap font-mono">
                            <span className="text-rose-700 font-bold">
                              {reg.notaAnteriorEmFalta ? 'Em falta' : Number(reg.notaAnterior).toFixed(1)}
                            </span>
                            <span className="mx-1.5 text-gray-400">→</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 font-black">
                              {Number(reg.novaNota).toFixed(1)} val.
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">
                            <div className="font-bold text-gray-900">{reg.alteradoPorNome}</div>
                            <div className="text-[10px] text-indigo-700 font-semibold">
                              {reg.alteradoPorRole === 'DiretorGeral'
                                ? 'Diretor Geral'
                                : reg.alteradoPorRole === 'SubdiretorPedagogico'
                                ? 'Subdiretor Pedagógico'
                                : reg.alteradoPorRole}
                            </div>
                            {!isProfessor && reg.professorNome && (
                              <div className="text-[10px] text-gray-500">Prof.: {reg.professorNome}</div>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 max-w-xs">{reg.motivoJustificativa}</td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {naoLida ? (
                              <button
                                type="button"
                                onClick={() => {
                                  dbService.marcarAlteracaoNotaComoLida(reg.id);
                                  recarregarAuditoriaDirecao();
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                              >
                                Marcar lida
                              </button>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  reg.lidoPeloProfessor
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {reg.lidoPeloProfessor ? 'Lida' : 'Pendente leitura'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PAUTA OFICIAL COM FORMATAÇÃO OFICIAL DO MINISTÉRIO DA EDUCAÇÃO */}
      {activeSubTab === 'pauta' && (
        <div className="space-y-6">
          {/* Toast de Sucesso da Geração de PDF */}
          {pdfSuccessToast && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-xs font-bold text-emerald-950 flex items-center justify-between shadow-md animate-fadeIn">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{pdfSuccessToast}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setPdfSuccessToast(null)} 
                className="text-emerald-800 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                <span>Pauta Oficial de Aproveitamento Escolar</span>
              </h3>
              <p className="text-xs text-gray-500">Registo oficial de aproveitamento por turma e disciplina</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportarPautaPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl inline-flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Descarregar pauta oficial formatada em PDF Paisagem (A4)"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isExportingPdf ? 'A Gerar PDF...' : 'Baixar Pauta em PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportarNotasExcel}
                disabled={!turmaAtiva || alunosDaTurma.length === 0}
                className="px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 inline-flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Descarregar pauta oficial em Excel (.xlsx) com fórmulas de médias, percentagens e aprovação"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                <span>Baixar Pauta em Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('pauta-oficial-para-exportacao');
                  if (el) {
                    imprimirElementoDiretamente(el, `Pauta Oficial - ${escola.nomeOficial}`);
                  } else {
                    window.print();
                  }
                }}
                className="px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 inline-flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir (A4)</span>
              </button>
            </div>
          </div>

          {/* Pauta Sheet Document Container — Formato Oficial A4 Paisagem */}
          <div 
            id="pauta-oficial-para-exportacao"
            className="bg-white p-6 sm:p-8 border border-gray-300 rounded-xl shadow-xs space-y-6 print:border-none print:p-0"
          >
            {/* Insígnia da República de Angola e Cabeçalho Governamental */}
            <div className="text-center space-y-1 border-b pb-4 border-gray-300">
              <div className="flex justify-center mb-1">
                <InsigniaAngola 
                  size={52} 
                  customUrl={dbService.getConfiguracaoSistema().insigniaNacionalUrl} 
                  className="object-contain" 
                />
              </div>
              <p className="text-xs font-bold tracking-widest text-gray-800 uppercase">
                República de Angola
              </p>
              <p className="text-xs font-semibold text-gray-700 uppercase">
                Governo Provincial de {escola.provincia} • Município da {escola.municipio}
              </p>
              <p className="text-xs font-bold text-gray-800 uppercase">
                {escola.gabineteEducacao || 'Gabinete Provincial da Educação'}
              </p>
              <h2 className="text-base sm:text-lg font-black text-gray-950 uppercase mt-1">
                {escola.nomeOficial}
              </h2>
              <div className="text-xs font-black text-blue-950 bg-blue-50 py-1 px-5 rounded-full inline-block mt-1 border border-blue-200 uppercase tracking-wider">
                Pauta Oficial de Aproveitamento — {selectedTrimestre}º Trimestre • Ano Lectivo {escola.anoLectivoActivo}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-gray-700 pt-2 font-medium">
                <div>Turma: <strong>{turmaAtiva?.nome}</strong></div>
                <div>Classe: <strong>{turmaAtiva?.classe}</strong></div>
                <div>Disciplina: <strong>{disciplinaAtiva?.nome}</strong></div>
                <div>Turno: <strong>{turmaAtiva?.turno}</strong></div>
                <div>Sala: <strong>{turmaAtiva?.sala}</strong></div>
              </div>
            </div>

            {/* Tabela Oficial da Pauta */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-300">
                <thead className="bg-gray-100 text-gray-900 font-bold border-b border-gray-300 text-center">
                  <tr>
                    <th className="p-2 border-r border-gray-300 w-10">Nº</th>
                    <th className="p-2 border-r border-gray-300 text-left">Nome Completo do Estudante</th>
                    <th className="p-2 border-r border-gray-300 w-14">Gênero</th>
                    <th className="p-2 border-r border-gray-300 w-24">Nº Matrícula</th>
                    <th className="p-2 border-r border-gray-300 w-16" title="Média de Avaliação Contínua">MAC</th>
                    {provaProfessorAtiva && (
                      <th className="p-2 border-r border-gray-300 w-16" title="Prova do Professor">NPP</th>
                    )}
                    <th className="p-2 border-r border-gray-300 w-16" title="Prova Trimestral">PT</th>
                    <th className="p-2 border-r border-gray-300 w-20">
                      {Number(selectedTrimestre) === 3 ? 'MT 3' : 'Média Trim.'}
                    </th>
                    {Number(selectedTrimestre) === 3 && ehClasseFinal && (
                      <th className="p-2 border-r border-gray-300 w-20 bg-amber-50" title="Exame Terminal do Ciclo">
                        Exame
                      </th>
                    )}
                    {Number(selectedTrimestre) === 3 && (
                      <th className="p-2 border-r border-gray-300 w-24 bg-amber-100/70 text-amber-950 font-black">
                        Média Final (MF)
                      </th>
                    )}
                    <th className="p-2 border-r border-gray-300 w-24">Comportamento</th>
                    <th className="p-2 w-28">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {alunosDaTurma.length === 0 ? (
                    <tr>
                      <td colSpan={7 + (provaProfessorAtiva ? 1 : 0) + (Number(selectedTrimestre) === 3 ? (ehClasseFinal ? 2 : 1) : 0)} className="p-6 text-center text-gray-500 italic">
                        Nenhum estudante matriculado nesta turma para o ano lectivo atual.
                      </td>
                    </tr>
                  ) : (
                    alunosDaTurma.map((aluno, idx) => {
                      const resMAC = calcularMACEstudante(
                        aluno.id,
                        avaliacoesDaTurma,
                        notas,
                        regraVigente,
                        turmaAtiva.nivelEnsino,
                        turmaAtiva.classe
                      );

                      const n1Cons = notasConsolidadas.find(
                        c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '1'
                      );
                      const n2Cons = notasConsolidadas.find(
                        c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '2'
                      );
                      const n3Cons = notasConsolidadas.find(
                        c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '3'
                      );

                      const triAtivoStr = normTriEval(selectedTrimestre);
                      const notaCons = triAtivoStr === '1' ? n1Cons : triAtivoStr === '2' ? n2Cons : n3Cons;

                      const macVal = resMAC.totalAvaliacoesUtilizadas > 0
                        ? resMAC.macCalculada
                        : (typeof notaCons?.mac === 'number' ? notaCons.mac : 0);
                      const nppVal = notaCons?.npp;
                      const ptVal = extrairNptConsolidada(notaCons);
                      const exameVal = ehClasseFinal ? (notaCons?.notaExame ?? n3Cons?.notaExame) : undefined;

                      const calcTrim = calcularNotaTrimestralDinamica(
                        macVal,
                        nppVal,
                        ptVal,
                        regraVigente,
                        Number(selectedTrimestre),
                        turmaAtiva.classe,
                        provaProfessorAtiva
                      );
                      const temInputsLive = resMAC.totalAvaliacoesUtilizadas > 0 || typeof nppVal === 'number' || typeof ptVal === 'number' || typeof notaCons?.mac === 'number';
                      const mediaTrim = temInputsLive ? calcTrim.mediaTrimestral : (notaCons?.mediaTrimestral ?? calcTrim.mediaTrimestral);

                      // Média Final usando MT1, MT2, MT3 reais da disciplina
                      const mt1Real = triAtivoStr === '1' ? mediaTrim : (n1Cons?.mediaTrimestral ?? mediaTrim);
                      const mt2Real = triAtivoStr === '2' ? mediaTrim : (n2Cons?.mediaTrimestral ?? mediaTrim);
                      const mt3Real = triAtivoStr === '3' ? mediaTrim : (n3Cons?.mediaTrimestral ?? mediaTrim);
                      const calcMF = calcularMediaFinal3Trimestre(
                        mt1Real,
                        mt2Real,
                        mt3Real,
                        ehClasseFinal ? exameVal : undefined,
                        regraVigente,
                        turmaAtiva.classe
                      );

                      const valorNotaFinal = Number(selectedTrimestre) === 3 ? calcMF.mediaFinal : mediaTrim;
                      const temNotasAl = resMAC.totalAvaliacoesUtilizadas > 0 || notaCons !== undefined || (n1Cons !== undefined) || (n2Cons !== undefined);
                      const obsRes = obterObservacaoDisciplina(
                        temNotasAl ? valorNotaFinal : undefined,
                        turmaAtiva.classe,
                        aluno.estado,
                        regraVigente
                      );
                      const obsCorClasse =
                        obsRes.categoria === 'Aprovado'
                          ? 'text-emerald-700'
                          : obsRes.categoria === 'Recurso'
                          ? 'text-amber-700'
                          : obsRes.categoria === 'Reprovado' || obsRes.categoria === 'Desistente'
                          ? 'text-red-700'
                          : 'text-slate-500';

                      return (
                        <tr key={aluno.id} className="text-center font-medium hover:bg-gray-50">
                          <td className="p-2 border-r border-gray-300">{idx + 1}</td>
                          <td className="p-2 border-r border-gray-300 text-left font-bold text-gray-900">
                            {aluno.nomeCompleto}
                          </td>
                          <td className="p-2 border-r border-gray-300">{aluno.genero}</td>
                          <td className="p-2 border-r border-gray-300 text-gray-600 font-mono text-[10px]">
                            {aluno.codigoMatricula}
                          </td>
                          <td className="p-2 border-r border-gray-300 font-bold">
                            {turmaAtiva.classe === 'Iniciação' ? resMAC.conceitoIniciacao : macVal}
                          </td>
                          {provaProfessorAtiva && (
                            <td className="p-2 border-r border-gray-300 font-bold">
                              {nppVal !== undefined ? nppVal : '—'}
                            </td>
                          )}
                          <td className="p-2 border-r border-gray-300 font-bold">
                            {ptVal !== undefined ? ptVal : '—'}
                          </td>
                          <td className="p-2 border-r border-gray-300 font-black text-gray-950">{mediaTrim}</td>
                          {Number(selectedTrimestre) === 3 && ehClasseFinal && (
                            <td className="p-2 border-r border-gray-300 font-bold bg-amber-50/70">
                              {exameVal !== undefined ? exameVal : '—'}
                            </td>
                          )}
                          {Number(selectedTrimestre) === 3 && (
                            <td className="p-2 border-r border-gray-300 font-black text-blue-900 bg-amber-50/50">
                              {calcMF.mediaFinal}
                            </td>
                          )}
                          <td className="p-2 border-r border-gray-300 text-[11px] font-bold text-gray-700">
                            {notaCons?.comportamentoConceito || (notaCons?.comportamentoNota ? `${notaCons.comportamentoNota}v` : '—')}
                          </td>
                          <td className="p-2">
                            <span className={`font-bold ${obsCorClasse}`}>
                              {obsRes.texto}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo Estatístico Oficial de Aproveitamento */}
            {(() => {
              const totalMat = alunosDaTurma.length;
              const mascMat = alunosDaTurma.filter(a => a.genero === 'M').length;
              const femMat = alunosDaTurma.filter(a => a.genero === 'F').length;
              const aprovados = alunosDaTurma.filter(aluno => {
                const resMAC = calcularMACEstudante(aluno.id, avaliacoesDaTurma, notas, regraVigente, turmaAtiva.nivelEnsino, turmaAtiva.classe);
                const n1 = notasConsolidadas.find(c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '1');
                const n2 = notasConsolidadas.find(c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '2');
                const n3 = notasConsolidadas.find(c => c.alunoId === aluno.id && correspondeDiscEval(c) && normTriEval(c.trimestre) === '3');
                const triStrR = normTriEval(selectedTrimestre);
                const nAt = triStrR === '1' ? n1 : triStrR === '2' ? n2 : n3;
                const macResumo = resMAC.totalAvaliacoesUtilizadas > 0 ? resMAC.macCalculada : (nAt?.mac ?? 0);
                const ptResumo = extrairNptConsolidada(nAt);
                const calcT = calcularNotaTrimestralDinamica(macResumo, nAt?.npp, ptResumo, regraVigente, Number(selectedTrimestre), turmaAtiva.classe, provaProfessorAtiva);
                const mTrim = (resMAC.totalAvaliacoesUtilizadas > 0 || typeof nAt?.npp === 'number' || typeof ptResumo === 'number' || typeof nAt?.mac === 'number')
                  ? calcT.mediaTrimestral
                  : (nAt?.mediaTrimestral ?? calcT.mediaTrimestral);
                const mfC = calcularMediaFinal3Trimestre(
                  triStrR === '1' ? mTrim : (n1?.mediaTrimestral ?? mTrim),
                  triStrR === '2' ? mTrim : (n2?.mediaTrimestral ?? mTrim),
                  triStrR === '3' ? mTrim : (n3?.mediaTrimestral ?? mTrim),
                  ehClasseFinal ? (nAt?.notaExame ?? n3?.notaExame) : undefined,
                  regraVigente,
                  turmaAtiva.classe
                );
                const vFinal = Number(selectedTrimestre) === 3 ? mfC.mediaFinal : mTrim;
                const temNotasResumo = resMAC.totalAvaliacoesUtilizadas > 0 || nAt !== undefined || n1 !== undefined || n2 !== undefined;
                const obs = obterObservacaoDisciplina(
                  temNotasResumo ? vFinal : undefined,
                  turmaAtiva.classe,
                  aluno.estado,
                  regraVigente
                );
                return obs.categoria === 'Aprovado';
              });
              const percAprov = totalMat > 0 ? Math.round((aprovados.length / totalMat) * 100) : 0;
              const percReprov = 100 - percAprov;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border border-gray-300 rounded text-xs text-center">
                  <div>
                    <span className="text-gray-600 block text-[10px] uppercase font-bold">Total Matriculados</span>
                    <strong className="text-sm font-mono text-gray-900">{totalMat} <span className="text-[10px] font-normal text-gray-600">(M:{mascMat} F:{femMat})</span></strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Aprovados ({percAprov}%)</span>
                    <strong className="text-sm font-mono text-emerald-800">{aprovados.length}</strong>
                  </div>
                  <div>
                    <span className="text-red-700 block text-[10px] uppercase font-bold">Não Transitados ({percReprov}%)</span>
                    <strong className="text-sm font-mono text-red-800">{totalMat - aprovados.length}</strong>
                  </div>
                  <div>
                    <span className="text-blue-700 block text-[10px] uppercase font-bold">Ano Lectivo / Regime</span>
                    <strong className="text-sm font-mono text-blue-900">{escola.anoLectivoActivo}</strong>
                  </div>
                </div>
              );
            })()}

            {/* Data Oficial da Pauta Conforme Normas do Ministério da Educação */}
            <div className="flex justify-end my-4 pr-3">
              <p className="text-right text-xs font-serif italic text-gray-800">
                {escola.municipio ? `${escola.municipio}` : (escola.provincia || 'Luanda')}, aos {hojeAngolano('extenso')}.
              </p>
            </div>

            {/* Rodapé Oficial com Assinaturas da Comissão de Júri e Homologação do Diretor Geral */}
            <div className="pt-8 border-t-2 border-black">
              <p className="text-center text-xs text-gray-700 font-bold uppercase mb-6 tracking-wider">
                {juriTurmaAtiva 
                  ? 'Termos Oficiais de Homologação da Comissão de Júri de Exame' 
                  : `Termo de Homologação e Validação Pedagógica — Ano Lectivo ${escola.anoLectivoActivo}`}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                {/* 1. Presidente da Comissão de Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">
                    {juriTurmaAtiva ? 'O Presidente da Comissão de Júri' : obterTituloCoordenadorTurma(turmaAtiva, funcionariosEscola, atribuicoesTodas)}
                  </p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {juriTurmaAtiva ? obterPresidenteJuri(juriTurmaAtiva, funcionariosEscola) : obterNomeCoordenadorTurma(turmaAtiva, funcionariosEscola, atribuicoesTodas)}
                  </p>
                </div>

                {/* 2. 1º Vogal da Comissão de Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">
                    {juriTurmaAtiva ? 'O 1º Vogal do Júri' : obterTituloSubdiretorPedagogico(escola, funcionariosEscola)}
                  </p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {juriTurmaAtiva ? obterVogaisJuri(juriTurmaAtiva, funcionariosEscola).primeiroVogal : obterNomeSubdiretorPedagogico(escola, funcionariosEscola)}
                  </p>
                </div>

                {/* 3. 2º Vogal da Comissão de Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">
                    {juriTurmaAtiva ? 'O 2º Vogal do Júri' : 'Vogal / Docente Avaliador'}
                  </p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {juriTurmaAtiva 
                      ? obterVogaisJuri(juriTurmaAtiva, funcionariosEscola).segundoVogal 
                      : (atribuicoesTodas.find((a: any) => a.turmaId === selectedTurmaId && a.disciplinaId === selectedDisciplinaId)?.professorNome || (currentUser?.ehProfessor ? currentUser.nomeCompleto : 'Docente da Disciplina'))}
                  </p>
                </div>

                {/* 4. Director Geral */}
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="font-black text-gray-950 uppercase text-[11px]">
                    {obterTituloDiretorGeral(escola, funcionariosEscola)}
                  </p>
                  {Boolean((escola.assinaturaDiretorUrl || (escola as any).configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                    <div className="h-10 flex items-center justify-center -mb-1">
                      <img 
                        src={escola.assinaturaDiretorUrl || (escola as any).configuracaoPasses?.assinaturaDiretorUrl} 
                        alt="Assinatura do Director" 
                        className="max-h-9 max-w-[140px] object-contain mix-blend-multiply" 
                      />
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {obterNomeDiretorGeral(escola, funcionariosEscola)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Avaliação */}
      {showNovaAvaliacaoModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border-2 border-blue-600 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-gray-900">Nova Avaliação do Professor</h3>
            <p className="text-xs text-gray-600">
              Autonomia do Professor: Cadastre uma nova prova, teste ou trabalho para a turma.
            </p>
            <form onSubmit={handleCriarAvaliacao} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título da Avaliação</label>
                <input
                  type="text"
                  required
                  value={novoAvTitulo}
                  onChange={(e) => setNovoAvTitulo(e.target.value)}
                  placeholder="Ex: 2ª Prova Parcial: Funções Quadráticas"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tipo de Avaliação Autorizado</label>
                <select
                  value={novoAvTipoId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setNovoAvTipoId(tid);
                    if (!novoAvTitulo || novoAvTitulo.startsWith('Prova') || novoAvTitulo.startsWith('Avaliação') || novoAvTitulo.startsWith('Exame') || novoAvTitulo.startsWith('2ª Prova')) {
                      if (tid === 'tipo-pt') setNovoAvTitulo(`Prova Trimestral de ${disciplinaAtiva?.nome || 'Disciplina'}`);
                      else if (tid === 'tipo-comp') setNovoAvTitulo(`Avaliação de Comportamento - ${selectedTrimestre}º Trimestre`);
                      else if (tid === 'tipo-nee') setNovoAvTitulo(`Exame de Júri de ${disciplinaAtiva?.nome || 'Disciplina'}`);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="tipo-pt">Prova Trimestral (PT / Prova do Professor) (Peso: 2)</option>
                  <option value="tipo-comp">Avaliação de Comportamento (COMP) (Peso: 1)</option>
                  <option value="tipo-nee">Exame de Júri / Prova de Exame (NEE) (Peso: 3)</option>
                  {tiposAvaliacao.filter(t => !['tipo-pt', 'tipo-comp', 'tipo-nee'].includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.nome} (Peso: {t.pesoPadrao})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Data da Realização</label>
                <input
                  type="date"
                  value={novoAvData}
                  onChange={(e) => setNovoAvData(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovaAvaliacaoModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Criar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Solicitar Correção de Nota */}
      {showSolicitacaoModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border-2 border-blue-600 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-gray-900">Solicitar Alteração / Adição de Nota</h3>
            <p className="text-xs text-gray-600">
              O pedido será enviado à Direção Pedagógica com o registo de auditoria imutável.
            </p>
            <form onSubmit={handleEnviarSolicitacao} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Aluno</label>
                <select
                  value={solAlunoId}
                  onChange={(e) => setSolAlunoId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {alunosDaTurma.map(a => (
                    <option key={a.id} value={a.id}>{a.nomeCompleto} ({a.codigoMatricula})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Avaliação Afetada</label>
                <select
                  value={solAvaliacaoId}
                  onChange={(e) => setSolAvaliacaoId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {avaliacoesDaTurma.map(av => (
                    <option key={av.id} value={av.id}>{av.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Nota Anterior</label>
                  <input
                    type="number"
                    step="0.5"
                    value={solNotaAtual}
                    onChange={(e) => setSolNotaAtual(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Nota Proposta</label>
                  <input
                    type="number"
                    step="0.5"
                    value={solNotaProposta}
                    onChange={(e) => setSolNotaProposta(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Motivo Pedagógico Fundamentado</label>
                <textarea
                  required
                  rows={3}
                  value={solMotivo}
                  onChange={(e) => setSolMotivo(e.target.value)}
                  placeholder="Ex: Erro de soma na questão 4 após revisão presencial com o estudante."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowSolicitacaoModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Retificação Executiva de Notas pela Direção Geral / Subdireção */}
      {modalRetificacaoDirecaoOpen && retificacaoAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Retificação Executiva de Nota (Direção)</h3>
                  <p className="text-[11px] text-gray-500">Alteração com registo forense permanente no perfil do Professor titular</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalRetificacaoDirecaoOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarRetificacaoExecutiva} className="space-y-3.5 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estudante:</span>
                  <strong className="text-gray-900">{retificacaoAluno.nomeCompleto}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Turma & Disciplina:</span>
                  <span className="font-semibold">{turmaAtiva?.nome} ({turmaAtiva?.classe}) • {disciplinaAtiva?.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trimestre:</span>
                  <span className="font-bold text-blue-700">{selectedTrimestre}º Trimestre</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Tipo de Nota</label>
                  <select
                    value={retificacaoTipoNota}
                    onChange={(e) => setRetificacaoTipoNota(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    <option value="MT">Média Trimestral (MT)</option>
                    <option value="MAC">Avaliação Contínua (MAC)</option>
                    <option value="NPP">Prova do Professor (NPP)</option>
                    <option value="NPT">Prova Trimestral (NPT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nota Anterior</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={escalaMaxima}
                    value={retificacaoNotaAnterior}
                    onChange={(e) => setRetificacaoNotaAnterior(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 font-mono font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nova Nota</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={escalaMaxima}
                    value={retificacaoNovaNota}
                    onChange={(e) => setRetificacaoNovaNota(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2 border-2 border-amber-500 rounded-lg bg-white font-mono font-black text-center text-amber-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Justificativa Executiva / Despacho Fundamentado <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={retificacaoMotivo}
                  onChange={(e) => setRetificacaoMotivo(e.target.value)}
                  placeholder="Ex: Deferimento de requerimento de revisão de prova homologado pelo Conselho Pedagógico em reunião de 02/04/2026."
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso Oficial:</strong> Esta operação gravará um registo irrevogável no perfil e na folha de ocorrências do Professor titular que leciona esta turma/disciplina, enviando notificação formal de auditoria.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalRetificacaoDirecaoOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Homologar Retificação & Notificar Professor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Atribuição e Edição de Notas Administrativas (Direção) */}
      {modalNotasAdmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/65 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-200 flex flex-col max-h-[94vh] overflow-hidden">
            {/* Cabeçalho fixo */}
            <div className="flex items-start justify-between border-b border-gray-200 px-4 sm:px-6 py-3.5 bg-gray-50/70 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-gray-900 truncate">
                    Atribuição e Edição de Notas Administrativas (Direção)
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-600 truncate">
                    {admTurmaAtiva ? (
                      <>
                        <strong>{admTurmaAtiva.classe}</strong>
                        {isSegundoCiclo(admTurmaAtiva.classe) && (admTurmaAtiva.curso || admCurso !== 'TODOS')
                          ? ` • ${admTurmaAtiva.curso || admCurso}`
                          : ''}{' '}
                        • Turma <strong>{admTurmaAtiva.nome}</strong> •{' '}
                        <strong>{admDisciplinaAtiva?.nome || 'Selecionar Disciplina'}</strong> • {admTrimestre}º Trimestre
                      </>
                    ) : (
                      'Selecione a classe, curso, turma e disciplina para gerir notas administrativas.'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNotasAdmOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200/60 cursor-pointer shrink-0"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarNotasAdministrativas} className="flex flex-col min-h-0 flex-1 text-xs">
              {/* Corpo rolável único para garantir visibilidade completa em qualquer ecrã */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* 1. Seleção Académica completa dentro do modal */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                      1. Selecionar Turma, Curso e Disciplina Alvo
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                      Escala: 0 a {admEscalaInfo.escalaMaxima} val. ({admEscalaInfo.ehPrimario ? 'Sugestão 4–10' : 'Sugestão 8–20'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Classe</label>
                      <select
                        value={admClasse}
                        onChange={(e) => {
                          setAdmClasse(e.target.value);
                          setAdmCurso('TODOS');
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                      >
                        {admClassesDisponiveis.map((c) => (
                          <option key={`adm-cl-${c}`} value={c}>
                            {c} {c !== 'Iniciação' ? 'Classe' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isSegundoCiclo(admClasse) && (
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Curso (IIº Ciclo)</label>
                        <select
                          value={admCurso}
                          onChange={(e) => setAdmCurso(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-purple-900"
                        >
                          <option value="TODOS">Todos os Cursos</option>
                          {admCursosDisponiveis.map((c) => (
                            <option key={`adm-cur-${c}`} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Turma ({admTurmasFiltradas.length})
                      </label>
                      <select
                        value={admTurmaAtiva?.id || ''}
                        onChange={(e) => setAdmTurmaId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                      >
                        {admTurmasFiltradas.length === 0 ? (
                          <option value="">Sem turmas cadastradas</option>
                        ) : (
                          admTurmasFiltradas.map((t) => (
                            <option key={`adm-t-${t.id}`} value={t.id}>
                              {t.nome} ({t.turno}){isSegundoCiclo(t.classe) && t.curso ? ` • ${t.curso}` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Disciplina ({admDisciplinasFiltradas.length})
                      </label>
                      <select
                        value={admDisciplinaAtiva?.id || ''}
                        onChange={(e) => setAdmDisciplinaId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                      >
                        {admDisciplinasFiltradas.length === 0 ? (
                          <option value="">Sem disciplinas configuradas</option>
                        ) : (
                          admDisciplinasFiltradas.map((d) => (
                            <option key={`adm-d-${d.id}`} value={d.id}>
                              {d.nome}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Trimestre</label>
                      <select
                        value={admTrimestre}
                        onChange={(e) => setAdmTrimestre(e.target.value as '1' | '2' | '3')}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                      >
                        <option value="1">1º Trimestre</option>
                        <option value="2">2º Trimestre</option>
                        <option value="3">3º Trimestre</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Parâmetros de Atribuição e Edição */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Componente de Nota</label>
                    <select
                      value={admAlvoTipo}
                      onChange={(e) => setAdmAlvoTipo(e.target.value as TipoComponenteNotaAdministrativa)}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                    >
                      <option value="AVALIACAO">Avaliação Contínua (MAC)</option>
                      <option value="PROVA_TRIMESTRAL">Prova Trimestral (PT / NPT)</option>
                      {provaProfessorAtiva && <option value="NPP">Prova do Professor (NPP)</option>}
                      {admEhClasseFinal && <option value="EXAME">Exame (Classe Final)</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Âmbito / Modo de Edição</label>
                    <select
                      value={admModoAplicacao}
                      onChange={(e) => setAdmModoAplicacao(e.target.value as ModoAplicacaoNotaAdministrativa)}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                    >
                      <option value="FALTA">Apenas alunos sem nota lançada</option>
                      <option value="APENAS_ADM">Editar notas administrativas já atribuídas e em falta</option>
                      <option value="TODOS">Toda a turma (atribuir/editar todos os alunos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Despacho / Justificativa</label>
                    <input
                      type="text"
                      required
                      value={admJustificativa}
                      onChange={(e) => setAdmJustificativa(e.target.value)}
                      placeholder="Motivo administrativo..."
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                </div>

                {/* Resumo + Ações em lote */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <span className="font-black uppercase text-[11px] tracking-wide block">
                      Edição Direta & Proporcionalidade ({admEscalaInfo.ehPrimario ? 'Ensino Primário: 4.0 a 10.0' : 'I e II Ciclos: 8.0 a 20.0'})
                    </span>
                    <span className="text-[11px] text-amber-900 block">
                      Pode editar individualmente qualquer nota sugerida ou já atribuída administrativamente na coluna editável abaixo. Os professores atribuídos recebem auditoria e notificação automática.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {Object.keys(admNotasEditadas).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdmNotasEditadas({})}
                        className="px-2.5 py-1.5 bg-white hover:bg-amber-100 border border-amber-400 rounded-lg font-bold text-[11px] text-amber-900 inline-flex items-center space-x-1 cursor-pointer"
                        title="Repor todas as notas editadas manualmente para a sugestão proporcional"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Repor Sugestões</span>
                      </button>
                    )}
                    {itensAdmEditaveis.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<string, boolean> = {};
                            itensAdmEditaveis.forEach((it) => {
                              next[it.alunoId] = true;
                            });
                            setAdmSelecionados(next);
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-bold text-[11px] text-amber-900 cursor-pointer"
                        >
                          Selecionar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<string, boolean> = {};
                            itensAdmEditaveis.forEach((it) => {
                              next[it.alunoId] = false;
                            });
                            setAdmSelecionados(next);
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg font-bold text-[11px] text-gray-700 cursor-pointer"
                        >
                          Desmarcar Todos
                        </button>
                      </>
                    )}
                    <span className="px-2.5 py-1 bg-white border border-amber-400 rounded-lg font-black text-amber-900 tabular-nums whitespace-nowrap">
                      {totalAdmSelecionados} de {itensAdmEditaveis.length} selecionado(s)
                    </span>
                  </div>
                </div>

                {totalAdmInvalidas > 0 && (
                  <div className="p-2.5 bg-red-50 border border-red-400 rounded-xl text-red-900 font-bold text-[11px] flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                    <span>
                      Existem {totalAdmInvalidas} nota(s) editada(s) inválida(s). Cada nota deve estar entre 0 e {admEscalaInfo.escalaMaxima} valores.
                    </span>
                  </div>
                )}

                {/* Tabela completa com edição por estudante */}
                <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white">
                  <table className="w-full text-left border-collapse text-xs tabular-nums">
                    <thead className="bg-gray-100 border-b border-gray-200 text-[11px] font-black text-gray-700 uppercase">
                      <tr>
                        <th className="p-2.5 text-center w-10">Aplicar</th>
                        <th className="p-2.5 min-w-[180px]">Estudante</th>
                        <th className="p-2.5 text-center whitespace-nowrap">Média Noutras Disc.</th>
                        <th className="p-2.5 text-center whitespace-nowrap">Nota Atual</th>
                        <th className="p-2.5 text-center whitespace-nowrap">Nota a Atribuir (0–{admEscalaInfo.escalaMaxima})</th>
                        <th className="p-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {!admTurmaAtiva || !admDisciplinaAtiva ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-500">
                            Selecione uma turma e uma disciplina válidas acima para visualizar os estudantes.
                          </td>
                        </tr>
                      ) : itensAdmEditaveis.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-500">
                            Nenhum aluno matriculado na turma selecionada ({admTurmaAtiva.nome}).
                          </td>
                        </tr>
                      ) : (
                        itensAdmEditaveis.map((item) => {
                          const inputVal =
                            item.textoEditado !== undefined
                              ? item.textoEditado
                              : item.notaProposta.toFixed(1);
                          return (
                            <tr
                              key={item.alunoId}
                              className={item.aplicar ? 'bg-white hover:bg-amber-50/40' : 'bg-gray-50/70 opacity-70'}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.aplicar}
                                  onChange={(e) =>
                                    setAdmSelecionados((prev) => ({
                                      ...prev,
                                      [item.alunoId]: e.target.checked,
                                    }))
                                  }
                                  className="h-4 w-4 text-amber-600 border-gray-300 rounded cursor-pointer"
                                  title="Incluir ou excluir estudante desta atribuição"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-gray-900">{item.alunoNome}</div>
                                <div className="text-[10px] text-gray-500">
                                  {item.codigoMatricula} • {item.motivoBase}
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-blue-900">
                                {item.disciplinasBaseCount > 0
                                  ? `${item.mediaOutrasDisciplinas.toFixed(1)}/${admEscalaInfo.escalaMaxima} (${item.disciplinasBaseCount})`
                                  : '—'}
                              </td>
                              <td className="p-2.5 text-center font-mono text-gray-700 whitespace-nowrap">
                                {item.notaAtual !== null ? (
                                  <span className="inline-flex items-center space-x-1">
                                    <span>{item.notaAtual.toFixed(1)}</span>
                                    {item.origemNota === 'Administrativa' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                        ADM
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 font-semibold">Em falta</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center justify-center space-x-1.5">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={inputVal}
                                      onKeyDown={(e) => handleStrictNumericKeyDown(e, true)}
                                      onPaste={(e) =>
                                        handleStrictNumericPaste(
                                          e,
                                          (novo) => {
                                            setAdmNotasEditadas((prev) => ({
                                              ...prev,
                                              [item.alunoId]: novo,
                                            }));
                                            setAdmSelecionados((prev) => ({
                                              ...prev,
                                              [item.alunoId]: true,
                                            }));
                                          },
                                          true
                                        )
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAdmNotasEditadas((prev) => ({
                                          ...prev,
                                          [item.alunoId]: val,
                                        }));
                                        setAdmSelecionados((prev) => ({
                                          ...prev,
                                          [item.alunoId]: true,
                                        }));
                                      }}
                                      className={`w-20 text-center font-mono font-black px-2 py-1 rounded-lg focus:outline-none ${
                                        item.invalida
                                          ? 'border-2 border-red-700 bg-red-50 text-red-950'
                                          : item.editadaManual
                                          ? 'border-2 border-indigo-500 bg-indigo-50 text-indigo-950'
                                          : 'border border-amber-400 bg-amber-50 text-amber-950 focus:ring-2 focus:ring-amber-500'
                                      }`}
                                      title={`Sugestão proporcional: ${item.notaSugeridaProporcional.toFixed(1)} val. Pode editar entre 0 e ${admEscalaInfo.escalaMaxima}.`}
                                    />
                                  </div>
                                  {item.editadaManual && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAdmNotasEditadas((prev) => {
                                          const next = { ...prev };
                                          delete next[item.alunoId];
                                          return next;
                                        })
                                      }
                                      className="p-1 text-indigo-700 hover:bg-indigo-100 rounded cursor-pointer"
                                      title={`Repor sugestão (${item.notaSugeridaProporcional.toFixed(1)})`}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-[9px] text-gray-500 mt-0.5">
                                  Sugerida: {item.notaSugeridaProporcional.toFixed(1)}
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                {!item.aplicar ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-700">
                                    Mantida
                                  </span>
                                ) : item.invalida ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900">
                                    Inválida
                                  </span>
                                ) : item.editadaManual ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 inline-flex items-center space-x-1">
                                    <Edit3 className="w-3 h-3" />
                                    <span>Editada</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                                    Aplicar
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rodapé fixo */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50/80 shrink-0">
                <span className="text-[11px] text-gray-600">
                  As notas são guardadas offline, sincronizadas com o Firebase e notificam os professores atribuídos.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalNotasAdmOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200/70 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!admTurmaAtiva || !admDisciplinaAtiva || totalAdmSelecionados === 0 || totalAdmInvalidas > 0}
                    className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Atribuir ({totalAdmSelecionados})</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {retificacaoSucessoMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{retificacaoSucessoMsg}</span>
        </div>
      )}
    </div>
  );
};
