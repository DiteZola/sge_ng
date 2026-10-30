import React, { useState, useEffect, useMemo } from 'react';
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
  Trophy
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
  getSalaDaTurma,
  getCursoDaTurma,
  getDisciplinasDaTurma,
  filtrarDisciplinasDaClasse
} from '../services/academicHierarchyService';
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
  SolicitacaoAlteracaoNota
} from '../types';
import { dbService } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
  calcularMACEstudante, 
  calcularNotaTrimestralDinamica,
  calcularMediaFinal3Trimestre,
  converterComportamentoParaConceito, 
  obterEscalaMaximaPorNivel,
  obterInformacaoEscala,
  formatarTextoPorGenero,
  avaliarExpressaoNota
} from '../services/macEngine';

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
  onSalvarTipoAvaliacao: (tipo: TipoAvaliacaoConfig) => void;
  onSalvarRegraMAC: (regra: RegraCalculoMAC) => void;
  onSalvarAvaliacao: (av: AvaliacaoCriada) => void;
  onExcluirAvaliacao: (id: string) => void;
  onSalvarNota: (nota: NotaEstudante) => void;
  onSalvarNotaConsolidada: (cons: NotaTrimestralConsolidada) => void;
  onSalvarSolicitacao: (sol: SolicitacaoAlteracaoNota) => void;
  initialSubTab?: 'lancamento' | 'governanca_mac' | 'solicitacoes' | 'pauta' | 'ranking_turmas';
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
  initialSubTab,
  onSalvarTipoAvaliacao,
  onSalvarRegraMAC,
  onSalvarAvaliacao,
  onExcluirAvaliacao,
  onSalvarNota,
  onSalvarNotaConsolidada,
  onSalvarSolicitacao
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'lancamento' | 'governanca_mac' | 'solicitacoes' | 'pauta' | 'ranking_turmas'>(initialSubTab || 'lancamento');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Seleções para lançamento de notas com coerência acadêmica oficial
  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  const [selectedClasse, setSelectedClasse] = useState<string>(() => {
    return turmas[0]?.classe ? normalizarClasse(turmas[0].classe) : '10ª';
  });

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmas[0]?.id || '');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<string>(disciplinas[0]?.id || '');
  const [selectedTrimestre, setSelectedTrimestre] = useState<'1' | '2' | '3'>(() => {
    const t = String(escola.trimestreActivo || '1');
    if (t.includes('3')) return '3';
    if (t.includes('2')) return '2';
    return '1';
  });
  const [buscaAlunoTabela, setBuscaAlunoTabela] = useState<string>('');

  // Turmas estritamente filtradas pela classe selecionada
  const turmasDaClasse = useMemo(() => {
    const filtradas = getTurmasPorClasse(turmas, selectedClasse);
    return filtradas.length > 0 ? filtradas : turmas;
  }, [turmas, selectedClasse]);

  // Sincronizar turma selecionada quando mudar a classe
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
  const [notasInvalidas, setNotasInvalidas] = useState<Record<string, string>>({});

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
    if (res !== null) return Math.min(simEscalaMaxima, Math.max(0, Math.round(res * 10) / 10));
    return Math.min(simEscalaMaxima, Math.max(0, Math.round(((simMt1 + simMt2 + simMt3) / 3) * 10) / 10));
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
    if (res !== null) return Math.min(simEscalaMaxima, Math.max(0, Math.round(res * 10) / 10));
    const tot = (regraPesoMDF || 40) + (regraPesoNE || 60);
    const val = ((mtGeral * regraPesoMDF) + (simNE * regraPesoNE)) / tot;
    return Math.min(simEscalaMaxima, Math.max(0, Math.round(val * 10) / 10));
  }, [regraFormulaClassesFinais, simMt1, simMt2, simMt3, simNE, regraPesoMDF, regraPesoNE, simEscalaMaxima]);

  const turmaAtiva = turmas.find(t => t.id === selectedTurmaId) || turmasDaClasse[0] || turmas[0];

  // Filtrar disciplinas estritamente pela classe e curso da turma selecionada (MED Angola)
  const disciplinasDaClasseECurso = useMemo(() => {
    if (!turmaAtiva) return disciplinas;
    return filtrarDisciplinasDaClasse(disciplinas, turmaAtiva.classe, turmaAtiva.curso);
  }, [disciplinas, turmaAtiva]);

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

  // Filtrar avaliações cadastradas pelo professor para esta turma/disciplina/trimestre
  const avaliacoesDaTurma = avaliacoes.filter(a => 
    a.turmaId === selectedTurmaId && 
    a.disciplinaId === selectedDisciplinaId && 
    a.trimestre === selectedTrimestre
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

  const isDirecao = ['DiretorGeral', 'SubdiretorPedagogico', 'AdminGeral', 'SubdirectorAdministrativo', 'ChefeSecretaria'].includes(currentUser.role);

  // Exportar pauta/notas da turma atual para Excel (.xlsx)
  const handleExportarNotasExcel = () => {
    const wb = XLSX.utils.book_new();
    const dados = alunosDaTurma.map((aluno, i) => {
      const resMAC = calcularMACEstudante(
        aluno.id,
        avaliacoesDaTurma,
        notas,
        regraVigente,
        turmaAtiva?.nivelEnsino || 'ICiclo',
        turmaAtiva?.classe || '7ª'
      );
      const row: Record<string, any> = {
        'Nº': i + 1,
        'Nº Processo': aluno.numeroProcesso || aluno.codigoMatricula,
        'Nome Completo': aluno.nomeCompleto,
        'Turma': turmaAtiva?.nome || '',
        'Classe': turmaAtiva?.classe || '',
        'Disciplina': disciplinaAtiva?.nome || '',
        'Trimestre': `${selectedTrimestre}º Trimestre`,
        'Escala': escalaInfo.rotuloEscala,
      };

      avaliacoesDaTurma.forEach(av => {
        const notaAluno = notas.find(n => n.avaliacaoId === av.id && n.alunoId === aluno.id);
        row[av.titulo] = notaAluno ? notaAluno.valorNota : '-';
      });

      row['MAC Calculada'] = resMAC.macCalculada;
      row['Status'] = resMAC.statusAprovacao;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Notas');
    const nomeFicheiro = `Notas_${turmaAtiva?.nome || 'Turma'}_${disciplinaAtiva?.sigla || 'Disc'}_${selectedTrimestre}Trimestre.xlsx`;
    XLSX.writeFile(wb, nomeFicheiro);
  };

  // Criar avaliação pelo professor
  const handleCriarAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAvTitulo || !novoAvTipoId) return;

    const tipo = tiposAvaliacao.find(t => t.id === novoAvTipoId);
    const nova: AvaliacaoCriada = {
      id: `av-${Date.now()}`,
      escolaId: escola.id,
      turmaId: selectedTurmaId,
      disciplinaId: selectedDisciplinaId,
      professorId: currentUser.id,
      trimestre: selectedTrimestre,
      anoLectivo: escola.anoLectivoActivo,
      tipoId: novoAvTipoId,
      tipoNome: tipo?.nome || 'Avaliação Contínua',
      titulo: novoAvTitulo,
      dataAplicacao: novoAvData,
      pontuacaoMaxima: escalaMaxima,
      peso: tipo?.pesoPadrao || 1,
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

    onSalvarNota({
      id: `nota-${avaliacaoId}-${alunoId}`,
      avaliacaoId,
      alunoId,
      valorNota: Math.round(valorNum * 10) / 10,
      dataLancamento: new Date().toISOString().split('T')[0]
    });
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
      onSalvarNota({
        id: `nota-${sol.avaliacaoId}-${sol.alunoId}`,
        avaliacaoId: sol.avaliacaoId,
        alunoId: sol.alunoId,
        valorNota: sol.notaProposta,
        dataLancamento: new Date().toISOString().split('T')[0]
      });
    }
  };

  // Retificação Executiva de Nota pela Direção Geral / Subdireção com Registo Forense no Perfil do Professor
  const handleSalvarRetificacaoExecutiva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retificacaoAluno || !retificacaoMotivo.trim()) return;

    const atribuicoes = dbService.getAtribuicoes ? dbService.getAtribuicoes() : [];
    const atrib = atribuicoes.find((a: any) => a.turmaId === selectedTurmaId && a.disciplinaId === selectedDisciplinaId);
    const funcionarios = dbService.getFuncionarios();
    const profTitular = funcionarios.find((f: any) => f.id === atrib?.professorId) || 
      funcionarios.find((f: any) => f.role === 'Professor' && f.escolaId === escola.id) || 
      funcionarios.find((f: any) => f.role === 'Professor') || 
      currentUser;

    const notaFinalValida = Math.min(escalaMaxima, Math.max(0, retificacaoNovaNota));

    // 1. Atualizar ou criar nota consolidada
    const notasConsolid = dbService.getNotasConsolidadas();
    const idx = notasConsolid.findIndex((c: any) => 
      c.alunoId === retificacaoAluno.id && 
      c.disciplinaId === selectedDisciplinaId && 
      c.trimestre === selectedTrimestre
    );

    if (idx >= 0) {
      if (retificacaoTipoNota === 'MAC') notasConsolid[idx].mac = notaFinalValida;
      else if (retificacaoTipoNota === 'NPP') notasConsolid[idx].npp = notaFinalValida;
      else if (retificacaoTipoNota === 'NPT') notasConsolid[idx].npt = notaFinalValida;
      else {
        notasConsolid[idx].mediaTrimestral = notaFinalValida;
        notasConsolid[idx].notaFinal = notaFinalValida;
      }
      dbService.salvarNotasConsolidadas(notasConsolid);
    } else {
      notasConsolid.push({
        id: `nc-${retificacaoAluno.id}-${selectedDisciplinaId}-${selectedTrimestre}`,
        alunoId: retificacaoAluno.id,
        turmaId: selectedTurmaId,
        disciplinaId: selectedDisciplinaId,
        trimestre: selectedTrimestre as any,
        anoLectivo: escola.anoLectivoActivo || '2025/2026',
        mac: retificacaoTipoNota === 'MAC' ? notaFinalValida : 10,
        npp: retificacaoTipoNota === 'NPP' ? notaFinalValida : 10,
        provaTrimestral: retificacaoTipoNota === 'NPP' ? notaFinalValida : 10,
        npt: retificacaoTipoNota === 'NPT' ? notaFinalValida : 10,
        mediaTrimestral: notaFinalValida,
        notaFinal: notaFinalValida,
        comportamentoNota: undefined,
        comportamentoConceito: undefined,
        faltas: 0,
        validadaPelaDirecao: true
      });
      dbService.salvarNotasConsolidadas(notasConsolid);
    }

    // 2. Registar averbamento no perfil do professor titular e trilha de auditoria
    dbService.salvarRegistoAlteracaoNotaDirecao({
      id: `retif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      alunoId: retificacaoAluno.id,
      alunoNome: retificacaoAluno.nomeCompleto,
      turmaId: selectedTurmaId,
      turmaNome: turmaAtiva?.nome || selectedTurmaId,
      classe: turmaAtiva?.classe || selectedClasse,
      curso: turmaAtiva?.curso,
      disciplinaId: selectedDisciplinaId,
      disciplinaNome: disciplinaAtiva?.nome || selectedDisciplinaId,
      professorId: profTitular.id,
      professorNome: profTitular.nomeCompleto,
      trimestre: selectedTrimestre,
      tipoNota: retificacaoTipoNota,
      notaAnterior: retificacaoNotaAnterior,
      novaNota: notaFinalValida,
      motivoJustificativa: retificacaoMotivo.trim(),
      alteradoPorId: currentUser.id,
      alteradoPorNome: currentUser.nomeCompleto,
      alteradoPorRole: currentUser.role as any,
      dataHora: new Date().toLocaleString('pt-AO'),
      lidoPeloProfessor: false
    });

    setRetificacaoSucessoMsg(`Nota do aluno "${retificacaoAluno.nomeCompleto}" alterada com sucesso! Log gravado no perfil do Professor ${profTitular.nomeCompleto}.`);
    setModalRetificacaoDirecaoOpen(false);
    setTimeout(() => setRetificacaoSucessoMsg(null), 5000);
  };

  // Atualização em tempo real do Comportamento do Aluno (0 a 20 valores por cada professor)
  const handleComportamentoChange = (alunoId: string, valor: number) => {
    const notasConsolid = [...notasConsolidadas];
    const idx = notasConsolid.findIndex(c => 
      c.alunoId === alunoId && 
      c.disciplinaId === selectedDisciplinaId && 
      c.trimestre === selectedTrimestre
    );

    const conceito = converterComportamentoParaConceito(valor);
    if (idx >= 0) {
      notasConsolid[idx] = {
        ...notasConsolid[idx],
        comportamentoNota: valor,
        comportamentoConceito: conceito
      };
      dbService.salvarNotasConsolidadas(notasConsolid);
    } else {
      const resMac = calcularMACEstudante(
        alunoId,
        avaliacoesDaTurma,
        notas,
        regraVigente,
        turmaAtiva?.nivelEnsino || 'Primario',
        turmaAtiva?.classe || '1ª'
      );
      const macCalculado = resMac?.macCalculada || 0;
      const nova: NotaTrimestralConsolidada = {
        id: `nota-consol-${Date.now()}-${alunoId.slice(-4)}`,
        alunoId,
        turmaId: selectedTurmaId,
        disciplinaId: selectedDisciplinaId,
        trimestre: selectedTrimestre,
        anoLectivo: escola.anoLectivoActivo,
        mac: macCalculado,
        provaTrimestral: 0,
        mediaTrimestral: 0,
        comportamentoNota: valor,
        comportamentoConceito: conceito,
        faltas: 0,
        validadaPelaDirecao: false
      };
      dbService.salvarNotaConsolidada(nova);
    }
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
    alert(`Regra e Fórmulas v${novaRegra.versao} salvas com sucesso! As médias de cada trimestre, média geral e classes finais foram recalculadas.`);
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
                  {turmaAtiva?.classe} Classe
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">1. Classe Curricular</label>
                <select
                  value={selectedClasse}
                  onChange={(e) => setSelectedClasse(e.target.value)}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {todasClasses.map(c => (
                    <option key={`ev-cl-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  2. Turma ({turmasDaClasse.length} na {selectedClasse})
                </label>
                <select
                  value={selectedTurmaId}
                  onChange={(e) => setSelectedTurmaId(e.target.value)}
                  className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {turmasDaClasse.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">3. Disciplina Oficial</label>
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
                    <option key={d.id} value={d.id}>{d.nome} ({d.sigla})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">4. Trimestre</label>
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

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportarNotasExcel}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer text-xs"
                title="Descarregar pauta em formato Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Exportar Excel (.xlsx)</span>
              </button>
            </div>
          </div>

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
                    <th className="p-3 bg-green-50 text-green-900 font-extrabold border-l border-green-300 min-w-[100px]">
                      Comportamento
                    </th>
                    <th className="p-3 min-w-[120px] text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alunosDaTurma.length === 0 ? (
                    <tr>
                      <td colSpan={avaliacoesDaTurma.length + 4} className="p-6 text-center text-gray-500">
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
                        c.disciplinaId === selectedDisciplinaId && 
                        c.trimestre === selectedTrimestre
                      );

                      const compNota = notaConsol?.comportamentoNota || 17;
                      const compConceito = converterComportamentoParaConceito(compNota);

                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50/70">
                          <td className="p-3 sticky left-0 bg-white z-10 font-medium">
                            <div className="font-bold text-gray-900">{aluno.nomeCompleto}</div>
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
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={escalaMaxima}
                                  value={val}
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

                          {/* Comportamento 0-20 e Conversão Qualitativa */}
                          <td className="p-2.5 bg-green-50/50 border-l border-green-300 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="1"
                                value={compNota}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(20, Math.round(Number(e.target.value) || 0)));
                                  handleComportamentoChange(aluno.id, val);
                                }}
                                className="w-12 text-center text-xs font-black p-1 bg-white border border-green-400 rounded focus:ring-2 focus:ring-green-600 focus:outline-none text-green-950 shadow-2xs"
                                title="Atribuir nota comportamental de 0 a 20 valores"
                              />
                              <span className="text-[10px] text-green-800 font-bold">/20</span>
                            </div>
                            <div className="text-[10px] font-bold text-green-800 mt-1 uppercase tracking-wide">
                              {compConceito}
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

      {/* 4. PAUTA OFICIAL COM 5 ASSINATURAS DO MED ANGOLA */}
      {activeSubTab === 'pauta' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center no-print">
            <div>
              <h3 className="text-base font-bold text-gray-900">Pauta Oficial de Aproveitamento Escolar</h3>
              <p className="text-xs text-gray-500">Conforme formato legal do Ministério da Educação da República de Angola</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Pauta Oficial (A4)</span>
            </button>
          </div>

          {/* Pauta Sheet Document Container */}
          <div className="bg-white p-6 sm:p-8 border border-gray-300 rounded-xl shadow-xs space-y-6 print:border-none print:p-0">
            {/* Header da República de Angola */}
            <div className="text-center space-y-1 border-b pb-4 border-gray-200">
              <p className="text-xs font-bold tracking-widest text-gray-700 uppercase">
                República de Angola
              </p>
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Governo Provincial de {escola.provincia} • Município da {escola.municipio}
              </p>
              <p className="text-xs font-bold text-gray-800 uppercase">
                Ministério da Educação
              </p>
              <h2 className="text-base sm:text-lg font-black text-gray-950 uppercase mt-1">
                {escola.nomeOficial}
              </h2>
              <div className="text-xs font-bold text-blue-800 bg-blue-50 py-1 px-4 rounded-full inline-block mt-1">
                Pauta de Aproveitamento - {selectedTrimestre}º Trimestre • Ano Lectivo {escola.anoLectivoActivo}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Turma: <strong>{turmaAtiva?.nome}</strong> • Disciplina: <strong>{disciplinaAtiva?.nome}</strong> • Turno: <strong>{turmaAtiva?.turno}</strong>
              </p>
            </div>

            {/* Pauta Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-300">
                <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300 text-center">
                  <tr>
                    <th className="p-2 border-r border-gray-300 w-10">Nº</th>
                    <th className="p-2 border-r border-gray-300 text-left">Nome Completo do Aluno</th>
                    <th className="p-2 border-r border-gray-300 w-16">Gênero</th>
                    <th className="p-2 border-r border-gray-300 w-24">Nº Matrícula</th>
                    <th className="p-2 border-r border-gray-300 w-20">MAC</th>
                    <th className="p-2 border-r border-gray-300 w-20">NPP / Prova</th>
                    <th className="p-2 border-r border-gray-300 w-24">
                      {Number(selectedTrimestre) === 3 ? 'MT 3' : 'Média Trim.'}
                    </th>
                    {Number(selectedTrimestre) === 3 && (
                      <th className="p-2 border-r border-gray-300 w-28 bg-amber-100/70 text-amber-950 font-black">
                        Média Final (MF)
                      </th>
                    )}
                    <th className="p-2 border-r border-gray-300 w-24">Comportamento</th>
                    <th className="p-2 w-28">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {alunosDaTurma.map((aluno, idx) => {
                    const resMAC = calcularMACEstudante(
                      aluno.id,
                      avaliacoesDaTurma,
                      notas,
                      regraVigente,
                      turmaAtiva.nivelEnsino,
                      turmaAtiva.classe
                    );

                    const macVal = resMAC.macCalculada;
                    const nppVal = macVal; // Prova do professor / NPP
                    const calcTrim = calcularNotaTrimestralDinamica(
                      macVal,
                      nppVal,
                      undefined,
                      regraVigente,
                      Number(selectedTrimestre),
                      turmaAtiva.classe
                    );
                    const mediaTrim = calcTrim.mediaTrimestral;

                    // Média Final (especialmente no 3º Trimestre conforme regra configurada pelo Diretor)
                    const calcMF = calcularMediaFinal3Trimestre(
                      mediaTrim,
                      mediaTrim,
                      mediaTrim,
                      regraVigente.tipoCalculo3Trimestre === 'PONDERADO_EXAME' ? mediaTrim : undefined,
                      regraVigente,
                      turmaAtiva.classe
                    );

                    const valorNotaFinal = Number(selectedTrimestre) === 3 ? calcMF.mediaFinal : mediaTrim;
                    const aprov = turmaAtiva.classe === 'Iniciação' ? true : (escalaMaxima === 10 ? valorNotaFinal >= 5 : valorNotaFinal >= 10);
                    const generoText = formatarTextoPorGenero(aluno.genero);

                    return (
                      <tr key={aluno.id} className="text-center font-medium">
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
                        <td className="p-2 border-r border-gray-300 font-bold">{nppVal}</td>
                        <td className="p-2 border-r border-gray-300 font-black text-gray-950">{mediaTrim}</td>
                        {Number(selectedTrimestre) === 3 && (
                          <td className="p-2 border-r border-gray-300 font-black text-blue-900 bg-amber-50/50">
                            {calcMF.mediaFinal}
                          </td>
                        )}
                        <td className="p-2 border-r border-gray-300 text-[11px] font-bold text-gray-700">
                          {(() => {
                            const notaCons = notasConsolidadas.find(
                              c => c.alunoId === aluno.id && c.disciplinaId === selectedDisciplinaId && String(c.trimestre) === String(selectedTrimestre)
                            );
                            return notaCons?.comportamentoConceito || (notaCons?.comportamentoNota ? `${notaCons.comportamentoNota}v` : '—');
                          })()}
                        </td>
                        <td className="p-2">
                          <span className={`font-bold ${aprov ? 'text-green-700' : 'text-red-700'}`}>
                            {turmaAtiva.classe === 'Iniciação' 
                              ? resMAC.conceitoIniciacao 
                              : (aprov ? generoText.aprovadoOuAprovada : generoText.reprovadoOuReprovada)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé Oficial com 5 Assinaturas Formais */}
            <div className="pt-8 border-t border-gray-300">
              <p className="text-center text-xs text-gray-600 mb-6">
                Termo de Homologação: Aos ____ dias do mês de ______________ de {new Date().getFullYear()}, reuniu-se a comissão pedagógica para encerramento e validação da presente pauta.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                {/* Esquerda: 2 Vogais */}
                <div className="space-y-8">
                  <div className="space-y-1">
                    <div className="w-44 border-b border-gray-800 mx-auto" />
                    <p className="font-bold text-gray-900">1º Vogal</p>
                    <p className="text-[11px] text-gray-500">Docente Designado</p>
                  </div>
                  <div className="space-y-1">
                    <div className="w-44 border-b border-gray-800 mx-auto" />
                    <p className="font-bold text-gray-900">2º Vogal</p>
                    <p className="text-[11px] text-gray-500">Docente Designado</p>
                  </div>
                </div>

                {/* Centro: Coordenador de Turma e Subdiretor Pedagógico */}
                <div className="space-y-8">
                  <div className="space-y-1">
                    <div className="w-44 border-b border-gray-800 mx-auto" />
                    <p className="font-bold text-gray-900">O Coordenador de Turma</p>
                    <p className="text-[11px] text-blue-800 font-semibold">(Presidente da Turma)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="w-44 border-b border-gray-800 mx-auto" />
                    <p className="font-bold text-gray-900">A Subdiretora Pedagógica</p>
                    <p className="text-[11px] text-gray-700 font-semibold">{escola.subdiretorPedagogicoNome}</p>
                  </div>
                </div>

                {/* Direita: Diretor da Escola */}
                <div className="space-y-1 flex flex-col justify-center">
                  <div className="w-48 border-b border-gray-800 mx-auto" />
                  <p className="font-bold text-gray-900">O Diretor da Escola</p>
                  <p className="text-[11px] text-gray-800 font-bold">{escola.diretorGeralNome}</p>
                  <span className="text-[10px] text-gray-400 mt-2 block">[Carimbo Oficial / Selo Branco]</span>
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
                  onChange={(e) => setNovoAvTipoId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {tiposAvaliacao.map(t => (
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
