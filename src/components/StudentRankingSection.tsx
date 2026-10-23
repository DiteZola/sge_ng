import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  AlertTriangle, 
  Download, 
  Filter, 
  Medal, 
  User, 
  GraduationCap, 
  Calendar, 
  Search,
  Sparkles,
  Award,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  BookOpen,
  UserCheck,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Aluno, Escola, Turma, CursoEscolar, Disciplina, Funcionario } from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface StudentRankingSectionProps {
  escola: Escola;
  alunos?: Aluno[];
  turmas?: Turma[];
  cursos?: CursoEscolar[];
  disciplinas?: Disciplina[];
  funcionarios?: Funcionario[];
  currentUser?: Funcionario;
  isDiretorPanel?: boolean;
}

export interface AlunoRankeado {
  aluno: Aluno;
  posicao: number;
  mediaGeral: number;
  classeNome: string;
  turmaNome: string;
  cursoNome: string;
  status: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico';
}

export interface ProfessorRankeado {
  professor: Funcionario;
  posicao: number;
  taxaAssiduidade: number;
  mediaAlunos: number;
  indiceGlobal: number;
  disciplinasNomes: string[];
  totalTurmas: number;
}

export interface DisciplinaRankeada {
  disciplina: Disciplina;
  posicao: number;
  mediaGeral: number;
  taxaAprovacao: number;
  totalAvaliados: number;
  nivel: string;
}

/**
 * Cálculo consistente e auditado da média geral de cada aluno
 */
export function calcularMediaGeralAluno(aluno: Aluno): number {
  const notasHomologadas = dbService.obterNotasHomologadasAluno(aluno.id);
  if (notasHomologadas && notasHomologadas.length > 0) {
    const soma = notasHomologadas.reduce((acc, n) => acc + (n.notaFinal ?? n.mediaTrimestral ?? 0), 0);
    return Number((soma / notasHomologadas.length).toFixed(1));
  }

  if (aluno.historicoMultiAno && aluno.historicoMultiAno.length > 0) {
    const validas = aluno.historicoMultiAno.filter(h => typeof h.mediaFinal === 'number' && h.mediaFinal > 0);
    if (validas.length > 0) {
      const soma = validas.reduce((acc, h) => acc + (h.mediaFinal as number), 0);
      return Number((soma / validas.length).toFixed(1));
    }
  }

  if (aluno.historicoAnterior && aluno.historicoAnterior.length > 0) {
    const ultimo = aluno.historicoAnterior[aluno.historicoAnterior.length - 1];
    if (ultimo && typeof ultimo.mediaFinal === 'number' && ultimo.mediaFinal > 0) {
      return Number(ultimo.mediaFinal.toFixed(1));
    }
  }

  // Se o aluno ainda não possui notas lançadas nem histórico prévio, retorna 0 (sem notas lançadas)
  return 0;
}

export const StudentRankingSection: React.FC<StudentRankingSectionProps> = ({
  escola,
  alunos: propAlunos,
  turmas: propTurmas,
  cursos: propCursos,
  disciplinas: propDisciplinas,
  funcionarios: propFuncionarios,
  currentUser,
  isDiretorPanel = false
}) => {
  const [rankingTab, setRankingTab] = useState<'alunos' | 'professores' | 'disciplinas'>('alunos');
  const [filtroClasse, setFiltroClasse] = useState<string>('todas');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [filtroCurso, setFiltroCurso] = useState<string>('todos');
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [apenasMinhasTurmas, setApenasMinhasTurmas] = useState<boolean>(() => {
    return currentUser?.ehProfessor || currentUser?.role === 'Professor' || false;
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [feedbackExport, setFeedbackExport] = useState<string | null>(null);

  const configSistema = dbService.getConfiguracaoSistema();
  const todosAlunos = propAlunos || dbService.getAlunos();
  const todasTurmas = propTurmas || dbService.getTurmas();
  const todosCursos = propCursos || dbService.getCursos();
  const todasDisciplinas = propDisciplinas || dbService.getDisciplinas();
  const todosFuncionarios = propFuncionarios || dbService.getFuncionarios();
  const todasAtribuicoes = dbService.obterAtribuicoes();
  const todosAssiduidade = dbService.obterAssiduidade();
  const todasNotas = dbService.obterNotasConsolidadas();

  const isProfessor = currentUser?.ehProfessor || currentUser?.role === 'Professor';

  // Identificar turmas atribuídas ao professor logado
  const turmasDoProfessorIds = useMemo(() => {
    if (!currentUser) return [];
    return todasAtribuicoes
      .filter(at => at.professorId === currentUser.id)
      .map(at => at.turmaId);
  }, [currentUser, todasAtribuicoes]);

  // Mapeamento de turmas para busca rápida
  const turmasMap = useMemo(() => {
    const m = new Map<string, Turma>();
    todasTurmas.forEach(t => m.set(t.id, t));
    return m;
  }, [todasTurmas]);

  // Lista de classes disponíveis
  const classesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    todasTurmas.forEach(t => { if (t.classe) set.add(t.classe); });
    todosAlunos.forEach(a => { if (a.classeId) set.add(a.classeId); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [todasTurmas, todosAlunos]);

  // Lista de turmas filtradas pela classe
  const turmasFiltradas = useMemo(() => {
    let base = todasTurmas;
    if (isProfessor && apenasMinhasTurmas) {
      base = base.filter(t => turmasDoProfessorIds.includes(t.id));
    }
    if (filtroClasse === 'todas') return base;
    return base.filter(t => t.classe === filtroClasse);
  }, [todasTurmas, filtroClasse, isProfessor, apenasMinhasTurmas, turmasDoProfessorIds]);

  // Lista de cursos disponíveis
  const cursosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    todosCursos.forEach(c => { if (c.nome) set.add(c.nome); });
    todasTurmas.forEach(t => { if (t.curso) set.add(t.curso); });
    todosAlunos.forEach(a => { if (a.curso) set.add(a.curso); });
    return Array.from(set).filter(Boolean);
  }, [todosCursos, todasTurmas, todosAlunos]);

  // Alunos filtrados e classificados
  const alunosComMedia = useMemo(() => {
    let filtrados = todosAlunos.filter(a => {
      if (a.escolaId && a.escolaId !== escola.id && escola.id !== 'todas') return false;

      // Filtro para professor titular: turmas atribuídas
      if (isProfessor && apenasMinhasTurmas) {
        if (!turmasDoProfessorIds.includes(a.turmaId)) return false;
      }

      // Filtro de Classe
      if (filtroClasse !== 'todas') {
        const turma = turmasMap.get(a.turmaId);
        const classeDoAluno = turma?.classe || a.classeId;
        if (classeDoAluno !== filtroClasse) return false;
      }

      // Filtro de Turma
      if (filtroTurma !== 'todas') {
        if (a.turmaId !== filtroTurma) return false;
      }

      // Filtro de Curso
      if (filtroCurso !== 'todos') {
        const turma = turmasMap.get(a.turmaId);
        const cursoDoAluno = turma?.curso || a.curso;
        if (cursoDoAluno !== filtroCurso) return false;
      }

      // Termo de Pesquisa
      if (termoPesquisa.trim()) {
        const t = termoPesquisa.toLowerCase();
        const nomeMatch = a.nomeCompleto.toLowerCase().includes(t);
        const biMatch = a.numeroBI?.toLowerCase().includes(t);
        const procMatch = a.numeroProcesso?.toLowerCase().includes(t);
        if (!nomeMatch && !biMatch && !procMatch) return false;
      }

      return true;
    });

    return filtrados.map(aluno => {
      const media = calcularMediaGeralAluno(aluno);
      const turma = turmasMap.get(aluno.turmaId);
      const classeNome = turma?.classe || aluno.classeId || 'Geral';
      const turmaNome = turma?.nome || 'Turma A';
      const cursoNome = turma?.curso || aluno.curso || 'Geral';

      let status: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' = 'Bom';
      if (media >= 15) status = 'Excelente';
      else if (media >= 10) status = 'Bom';
      else if (media >= 7) status = 'Atenção';
      else status = 'Crítico';

      return {
        aluno,
        posicao: 0,
        mediaGeral: media,
        classeNome,
        turmaNome,
        cursoNome,
        status
      };
    });
  }, [todosAlunos, filtroClasse, filtroTurma, filtroCurso, termoPesquisa, turmasMap, escola.id, isProfessor, apenasMinhasTurmas, turmasDoProfessorIds]);

  // 5 Melhores Alunos (Ordenados por média decrescente - Apenas com notas lançadas)
  const top5Melhores: AlunoRankeado[] = useMemo(() => {
    const comNotas = alunosComMedia.filter(a => a.mediaGeral > 0);
    const ordenados = [...comNotas].sort((a, b) => b.mediaGeral - a.mediaGeral);
    return ordenados.slice(0, 5).map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [alunosComMedia]);

  // 5 Piores Alunos (Ordenados por média crescente - Apenas com notas lançadas)
  const top5Piores: AlunoRankeado[] = useMemo(() => {
    const comNotas = alunosComMedia.filter(a => a.mediaGeral > 0);
    const ordenados = [...comNotas].sort((a, b) => a.mediaGeral - b.mediaGeral);
    return ordenados.slice(0, 5).map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [alunosComMedia]);

  // ==========================================
  // RANKING DE PROFESSORES (Assiduidade e Rendimento)
  // ==========================================
  const rankingProfessores: ProfessorRankeado[] = useMemo(() => {
    const profs = todosFuncionarios.filter(f => f.ehProfessor || f.cargo?.toLowerCase().includes('prof'));
    if (profs.length === 0) return [];

    return profs.map(prof => {
      // 1. Assiduidade
      const registos = todosAssiduidade.filter(a => a.funcionarioId === prof.id);
      let taxaAssiduidade = 0;
      if (registos.length > 0) {
        const presentes = registos.filter(r => r.estado === 'Presente').length;
        taxaAssiduidade = Number(((presentes / registos.length) * 100).toFixed(1));
      }

      // 2. Turmas e disciplinas lecionadas
      const atribs = todasAtribuicoes.filter(at => at.professorId === prof.id);
      const disciplinasNomes = Array.from(new Set(atribs.map(at => (at as any).disciplinaNome || at.disciplinaId))).filter(Boolean).slice(0, 3);
      const turmasIds = Array.from(new Set(atribs.map(at => at.turmaId)));

      // 3. Avaliação dos alunos nas disciplinas
      const notasTurmas = todasNotas.filter(nc => turmasIds.includes(nc.turmaId));
      let mediaAlunos = 0;
      if (notasTurmas.length > 0) {
        const soma = notasTurmas.reduce((acc, n) => acc + (n.notaFinal ?? n.mediaTrimestral ?? 0), 0);
        mediaAlunos = Number((soma / notasTurmas.length).toFixed(1));
      }

      // 4. Índice Global (40% assiduidade + 60% aproveitamento discente)
      const indiceGlobal = (taxaAssiduidade > 0 || mediaAlunos > 0) 
        ? Number(((taxaAssiduidade * 0.4) + ((mediaAlunos / 20) * 100 * 0.6)).toFixed(1))
        : 0;

      return {
        professor: prof,
        posicao: 0,
        taxaAssiduidade,
        mediaAlunos,
        indiceGlobal,
        disciplinasNomes: disciplinasNomes.length > 0 ? disciplinasNomes : ['Sem disciplina atribuída'],
        totalTurmas: turmasIds.length
      };
    })
    .sort((a, b) => b.indiceGlobal - a.indiceGlobal)
    .map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [todosFuncionarios, todosAssiduidade, todasAtribuicoes, todasNotas]);

  // ==========================================
  // RANKING DE DISCIPLINAS (Melhores e Piores Notas)
  // ==========================================
  const rankingDisciplinas: DisciplinaRankeada[] = useMemo(() => {
    if (todasNotas.length === 0) return [];
    return todasDisciplinas.map(disc => {
      const notasDisc = todasNotas.filter(n => n.disciplinaId === disc.id);
      let mediaGeral = 0;
      let taxaAprovacao = 0;

      if (notasDisc.length > 0) {
        const soma = notasDisc.reduce((acc, n) => acc + (n.notaFinal ?? n.mediaTrimestral ?? 0), 0);
        mediaGeral = Number((soma / notasDisc.length).toFixed(1));
        const positivas = notasDisc.filter(n => (n.notaFinal ?? n.mediaTrimestral ?? 0) >= 10).length;
        taxaAprovacao = Math.round((positivas / notasDisc.length) * 100);
      }

      return {
        disciplina: disc,
        posicao: 0,
        mediaGeral,
        taxaAprovacao,
        totalAvaliados: notasDisc.length,
        nivel: disc.nivelEnsino || 'Geral'
      };
    })
    .filter(d => d.totalAvaliados > 0)
    .sort((a, b) => b.mediaGeral - a.mediaGeral)
    .map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [todasDisciplinas, todasNotas]);

  // Melhores e Piores Disciplinas
  const topDisciplinas = useMemo(() => rankingDisciplinas.slice(0, 5), [rankingDisciplinas]);
  const pioresDisciplinas = useMemo(() => [...rankingDisciplinas].reverse().slice(0, 5), [rankingDisciplinas]);

  // Função para descarregar o documento oficial em PDF idêntico ao ecrã
  const handleBaixarPdf = async () => {
    const elementId = `ranking-documento-oficial-${isDiretorPanel ? 'diretor' : 'alunos'}`;
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsExportingPdf(true);
    setFeedbackExport('A gerar documento PDF idêntico...');

    try {
      const nomeLimpoEscola = (escola.nomeOficial || 'Escola').replace(/[^a-zA-Z0-9]/g, '_');
      const tipoDoc = rankingTab === 'alunos' ? 'Ranking_Alunos' : rankingTab === 'professores' ? 'Ranking_Professores' : 'Ranking_Disciplinas';
      const filename = `${tipoDoc}_${nomeLimpoEscola}_${escola.anoLectivoActivo || '2025-2026'}.pdf`;

      const sucesso = await downloadElementAsPdf(element, filename, {
        orientation: 'portrait',
        marginMm: 6,
        scale: 2
      });

      if (sucesso) {
        setFeedbackExport('Ficheiro PDF descarregado com sucesso!');
        setTimeout(() => setFeedbackExport(null), 4000);
      } else {
        setFeedbackExport('Não foi possível gerar o PDF.');
      }
    } catch (e) {
      console.error('Erro na exportação de PDF do Ranking:', e);
      setFeedbackExport('Erro ao processar PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const containerDocId = `ranking-documento-oficial-${isDiretorPanel ? 'diretor' : 'alunos'}`;

  // Data atual formatada em Português Angolano
  const hoje = new Date();
  const dia = hoje.getDate();
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  const dataExtensa = `${escola.provincia || 'Luanda'}, aos ${dia} de ${mes} de ${ano}`;

  // Descrição do filtro para o cabeçalho
  const filtroDescricao = useMemo(() => {
    if (isProfessor && apenasMinhasTurmas) {
      return `Minhas Turmas Atribuídas • Prof. ${currentUser?.nomeCompleto || 'Docente Titular'}`;
    }
    const partes: string[] = [];
    if (filtroClasse !== 'todas') partes.push(`Classe: ${filtroClasse}`);
    if (filtroTurma !== 'todas') {
      const t = turmasMap.get(filtroTurma);
      partes.push(`Turma: ${t?.nome || filtroTurma}`);
    }
    if (filtroCurso !== 'todos') partes.push(`Curso: ${filtroCurso}`);
    return partes.length > 0 ? partes.join(' • ') : 'Toda a Escola (Geral)';
  }, [filtroClasse, filtroTurma, filtroCurso, turmasMap, isProfessor, apenasMinhasTurmas, currentUser]);

  return (
    <div className="space-y-6">
      {/* Abas Superiores de Alternância de Ranking */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 no-print">
        <button
          type="button"
          onClick={() => setRankingTab('alunos')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'alunos'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Ranking de Estudantes (Top 5 & Risco)</span>
        </button>

        <button
          type="button"
          onClick={() => setRankingTab('professores')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'professores'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Ranking do Melhor Professor</span>
        </button>

        <button
          type="button"
          onClick={() => setRankingTab('disciplinas')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'disciplinas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Ranking de Disciplinas (Melhores & Piores)</span>
        </button>
      </div>

      {/* Barra de Filtros e Ações - Totalmente Responsiva */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              {rankingTab === 'alunos' && <Trophy className="h-5 w-5" />}
              {rankingTab === 'professores' && <UserCheck className="h-5 w-5" />}
              {rankingTab === 'disciplinas' && <BookOpen className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {rankingTab === 'alunos' && 'Ranking de Desempenho dos Alunos'}
                {rankingTab === 'professores' && 'Ranking Oficial de Desempenho Docente'}
                {rankingTab === 'disciplinas' && 'Aproveitamento Académico por Disciplina'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {rankingTab === 'alunos' && (isProfessor ? 'Visualização dos 5 Melhores e 5 Piores nas suas Turmas' : 'Top 5 Melhores Alunos & 5 Alunos com Menor Rendimento')}
                {rankingTab === 'professores' && 'Classificação por assiduidade, pontualidade e rendimento discente'}
                {rankingTab === 'disciplinas' && 'Disciplinas com melhores médias e disciplinas em atenção pedagógica'}
              </p>
            </div>
          </div>
        </div>

        {/* Controlos e Botão de Download PDF */}
        <div className="flex flex-wrap items-center gap-2.5">
          {feedbackExport && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
              {feedbackExport}
            </span>
          )}

          {isProfessor && rankingTab === 'alunos' && (
            <label className="flex items-center space-x-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 cursor-pointer">
              <input
                type="checkbox"
                checked={apenasMinhasTurmas}
                onChange={(e) => setApenasMinhasTurmas(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Apenas Minhas Turmas Atribuídas</span>
            </label>
          )}

          <button
            type="button"
            onClick={handleBaixarPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Descarregar ficheiro PDF com cabeçalho oficial e assinaturas"
          >
            {isExportingPdf ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Baixar em PDF</span>
          </button>
        </div>
      </div>

      {/* Seletores de Filtros para Alunos */}
      {rankingTab === 'alunos' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 no-print">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>Filtrar Alunos por Âmbito:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Classe:</label>
              <select
                value={filtroClasse}
                onChange={(e) => {
                  setFiltroClasse(e.target.value);
                  setFiltroTurma('todas');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="todas">Todas as Classes</option>
                {classesDisponiveis.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Turma:</label>
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="todas">Todas as Turmas</option>
                {turmasFiltradas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.turno})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Curso:</label>
              <select
                value={filtroCurso}
                onChange={(e) => setFiltroCurso(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="todos">Todos os Cursos</option>
                {cursosDisponiveis.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Pesquisar:</label>
              <div className="relative">
                <input
                  type="text"
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  placeholder="Nome, BI ou N.º Processo..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DOCUMENTO OFICIAL COMPLETO (Capturado com fidelidade total no PDF)
          ========================================================================= */}
      <div 
        id={containerDocId}
        className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 md:p-10 shadow-md text-slate-900 space-y-6 max-w-5xl mx-auto"
      >
        {/* CABEÇALHO OFICIAL INSTITUCIONAL */}
        <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-5">
          <div className="flex justify-center mb-2">
            <InsigniaAngola 
              size={64} 
              customUrl={configSistema.insigniaNacionalUrl} 
              className="object-contain" 
            />
          </div>

          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.25em] text-slate-900">
            REPÚBLICA DE ANGOLA
          </p>
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
            MINISTÉRIO DA EDUCAÇÃO
          </p>
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            GOVERNO PROVINCIAL DE {escola.provincia?.toUpperCase() || 'LUANDA'} • DIRECÇÃO MUNICIPAL DE {escola.municipio?.toUpperCase() || 'LUANDA'}
          </p>
          
          <h2 className="text-base sm:text-lg md:text-xl font-black uppercase text-blue-900 pt-1 tracking-tight">
            {escola.nomeOficial || 'COMPLEXO ESCOLAR OFICIAL'}
          </h2>

          <div className="inline-block mt-2 px-4 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
              {rankingTab === 'alunos' && 'PAUTA OFICIAL DE RANKING DE DESEMPENHO ACADÉMICO (TOP 5 & RISCO)'}
              {rankingTab === 'professores' && 'QUADRO MINISTERIAL DE MÉRITO E ASSIDUIDADE DOCENTE'}
              {rankingTab === 'disciplinas' && 'MAPA COMPARATIVO DE RENDIMENTO POR DISCIPLINA'}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-bold text-blue-800">
              Ano Lectivo: {escola.anoLectivoActivo || '2025/2026'} • Âmbito: {filtroDescricao}
            </p>
          </div>
        </div>

        {/* =========================================================================
            ABA 1: RANKING DOS ALUNOS (TOP 5 MELHORES E 5 PIORES)
            ========================================================================= */}
        {rankingTab === 'alunos' && (
          <div className="space-y-6">
            {/* SECÇÃO 1: OS 5 MELHORES ALUNOS (QUADRO DE HONRA) */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-4 py-2 rounded-xl shadow-xs">
                <Trophy className="h-5 w-5 text-yellow-200 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Quadro de Excelência • Top 5 Melhores Alunos da Instituição
                </h4>
              </div>

              {top5Melhores.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                  Nenhum estudante qualificado para este filtro.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/70 border-b border-amber-300 text-amber-950 font-black text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-center w-12">N.º</th>
                        <th className="py-2.5 px-3 w-14 text-center">Foto</th>
                        <th className="py-2.5 px-4">Nome Completo do Estudante</th>
                        <th className="py-2.5 px-4 text-center">Classe</th>
                        <th className="py-2.5 px-4 text-center">Turma</th>
                        <th className="py-2.5 px-4 text-center">Curso</th>
                        <th className="py-2.5 px-4 text-right">Média Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {top5Melhores.map((item) => (
                        <tr key={item.aluno.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-black">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black shadow-2xs">
                              {item.posicao}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.aluno.fotoUrl ? (
                              <img 
                                src={item.aluno.fotoUrl} 
                                alt={item.aluno.nomeCompleto} 
                                className="w-9 h-9 rounded-full object-cover mx-auto border-2 border-amber-400"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-black text-xs mx-auto">
                                {item.aluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <div>{item.aluno.nomeCompleto}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Proc. n.º {item.aluno.numeroProcesso || item.aluno.codigoMatricula}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                            {item.classeNome}
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                            {item.turmaNome}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-600 font-medium">
                            {item.cursoNome}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-black text-sm">
                              {item.mediaGeral.toFixed(1)} <span className="text-[10px] font-normal">val</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECÇÃO 2: OS 5 ALUNOS COM MENOR RENDIMENTO (ATENÇÃO PEDAGÓGICA) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-rose-600 to-red-700 text-white px-4 py-2 rounded-xl shadow-xs">
                <AlertTriangle className="h-5 w-5 text-rose-200 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Quadro de Intervenção Pedagógica • 5 Alunos em Menor Rendimento
                </h4>
              </div>

              {top5Piores.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                  Nenhum estudante identificado com insuficiência neste filtro.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-100/70 border-b border-rose-300 text-rose-950 font-black text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-center w-12">N.º</th>
                        <th className="py-2.5 px-3 w-14 text-center">Foto</th>
                        <th className="py-2.5 px-4">Nome Completo do Estudante</th>
                        <th className="py-2.5 px-4 text-center">Classe</th>
                        <th className="py-2.5 px-4 text-center">Turma</th>
                        <th className="py-2.5 px-4 text-center">Curso</th>
                        <th className="py-2.5 px-4 text-right">Média Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {top5Piores.map((item) => (
                        <tr key={item.aluno.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-black">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black shadow-2xs">
                              {item.posicao}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.aluno.fotoUrl ? (
                              <img 
                                src={item.aluno.fotoUrl} 
                                alt={item.aluno.nomeCompleto} 
                                className="w-9 h-9 rounded-full object-cover mx-auto border-2 border-rose-400"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center font-black text-xs mx-auto">
                                {item.aluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <div>{item.aluno.nomeCompleto}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Proc. n.º {item.aluno.numeroProcesso || item.aluno.codigoMatricula}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                            {item.classeNome}
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                            {item.turmaNome}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-600 font-medium">
                            {item.cursoNome}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg font-black text-sm">
                              {item.mediaGeral.toFixed(1)} <span className="text-[10px] font-normal">val</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: RANKING DO MELHOR PROFESSOR (ASSIDUIDADE & RENDIMENTO DOS ALUNOS)
            ========================================================================= */}
        {rankingTab === 'professores' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-700 to-blue-800 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <UserCheck className="h-5 w-5 text-indigo-200 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Quadro de Mérito e Avaliação do Desempenho Docente
              </h4>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-50 border-b border-indigo-200 text-indigo-950 font-black text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-12">N.º</th>
                    <th className="py-2.5 px-3 w-14 text-center">Foto</th>
                    <th className="py-2.5 px-4">Nome do Professor</th>
                    <th className="py-2.5 px-4">Disciplinas Lecionadas</th>
                    <th className="py-2.5 px-3 text-center">Assiduidade</th>
                    <th className="py-2.5 px-3 text-center">Média dos Alunos</th>
                    <th className="py-2.5 px-4 text-right">Índice Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankingProfessores.map((item) => (
                    <tr key={item.professor.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-black">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-black shadow-2xs ${
                          item.posicao === 1 ? 'bg-amber-500 ring-2 ring-amber-300' :
                          item.posicao === 2 ? 'bg-slate-400 ring-2 ring-slate-300' :
                          item.posicao === 3 ? 'bg-amber-700 ring-2 ring-amber-500' :
                          'bg-indigo-600'
                        }`}>
                          {item.posicao}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.professor.fotoUrl ? (
                          <img 
                            src={item.professor.fotoUrl} 
                            alt={item.professor.nomeCompleto} 
                            className="w-9 h-9 rounded-full object-cover mx-auto border-2 border-indigo-300"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center justify-center font-black text-xs mx-auto">
                            {item.professor.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        <div>{item.professor.nomeCompleto}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          BI: {item.professor.numeroBI || 'Agente MED'} • {item.totalTurmas} turmas
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">
                        <div className="flex flex-wrap gap-1">
                          {item.disciplinasNomes.map((d, dIdx) => (
                            <span key={dIdx} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.taxaAssiduidade}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {item.mediaAlunos.toFixed(1)} val
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-block px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg font-black text-xs shadow-2xs">
                          {item.indiceGlobal} pts
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 3: RANKING DE DISCIPLINAS (MELHORES E PIORES NOTAS)
            ========================================================================= */}
        {rankingTab === 'disciplinas' && (
          <div className="space-y-6">
            {/* Disciplinas com Melhores Notas */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2 rounded-xl shadow-xs">
                <TrendingUp className="h-5 w-5 text-emerald-200 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Top 5 Disciplinas com Melhores Notas e Rendimento
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 border-b border-emerald-200 text-emerald-950 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">N.º</th>
                      <th className="py-2.5 px-4">Disciplina</th>
                      <th className="py-2.5 px-4 text-center">Ciclo / Nível</th>
                      <th className="py-2.5 px-4 text-center">Taxa de Aproveitamento</th>
                      <th className="py-2.5 px-4 text-right">Média Geral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {topDisciplinas.map((item) => (
                      <tr key={item.disciplina.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-2.5 px-3 text-center font-black">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black shadow-2xs">
                            {item.posicao}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {item.disciplina.nome}
                          <span className="ml-2 text-[10px] text-slate-500 font-normal">({item.disciplina.sigla || 'DISC'})</span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600 font-medium">
                          {item.nivel}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold text-[11px]">
                            {item.taxaAprovacao}% Aprovados
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="inline-block px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-black text-sm shadow-2xs">
                            {item.mediaGeral.toFixed(1)} val
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disciplinas com Piores Notas */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-rose-700 text-white px-4 py-2 rounded-xl shadow-xs">
                <TrendingDown className="h-5 w-5 text-amber-200 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Disciplinas com Menores Médias (Atenção Pedagógica Prioritária)
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-50 border-b border-rose-200 text-rose-950 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">N.º</th>
                      <th className="py-2.5 px-4">Disciplina</th>
                      <th className="py-2.5 px-4 text-center">Ciclo / Nível</th>
                      <th className="py-2.5 px-4 text-center">Taxa de Aproveitamento</th>
                      <th className="py-2.5 px-4 text-right">Média Geral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pioresDisciplinas.map((item, idx) => (
                      <tr key={item.disciplina.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2.5 px-3 text-center font-black">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black shadow-2xs">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {item.disciplina.nome}
                          <span className="ml-2 text-[10px] text-slate-500 font-normal">({item.disciplina.sigla || 'DISC'})</span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600 font-medium">
                          {item.nivel}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full font-bold text-[11px]">
                            {item.taxaAprovacao}% Aprovados
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="inline-block px-2.5 py-1 bg-rose-600 text-white rounded-lg font-black text-sm shadow-2xs">
                            {item.mediaGeral.toFixed(1)} val
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RODAPÉ OFICIAL COM DATA E ASSINATURA DO DIRETOR E PROFESSOR */}
        <div className="pt-8 border-t-2 border-slate-300 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div className="text-left space-y-1 text-xs text-slate-600">
            <p className="font-semibold">{dataExtensa}</p>
            <p className="text-[11px] text-slate-400">
              Documento emitido pelo Sistema de Gestão Escolar (SGE-NG Angola).
            </p>
            <p className="text-[10px] text-slate-400">
              Autenticidade assegurada por assinatura diretiva e carimbo institucional.
            </p>
            {isProfessor && (
              <p className="text-[10px] font-bold text-blue-900 pt-1">
                Averbado por: Prof. {currentUser?.nomeCompleto}
              </p>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
              O Director Geral da Instituição
            </p>
            
            {/* Assinatura Digitalizada se disponível */}
            <div className="h-16 flex items-center justify-center">
              {escola.assinaturaDiretorUrl ? (
                <img 
                  src={escola.assinaturaDiretorUrl} 
                  alt="Assinatura do Director" 
                  className="max-h-14 object-contain mx-auto"
                />
              ) : (
                <div className="w-56 border-b-2 border-slate-900 mt-8" />
              )}
            </div>

            <p className="text-xs font-extrabold text-slate-900 uppercase">
              {escola.diretorGeralNome || (escola.diretorGeralEmail ? escola.diretorGeralEmail.split('@')[0].replace(/\./g, ' ') : 'Direção Geral da Escola')}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              [Carimbo Oficial da Escola]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
