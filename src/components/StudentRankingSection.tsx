import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  AlertTriangle, 
  Download, 
  Filter, 
  Search,
  Sparkles,
  BookOpen,
  UserCheck,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { Aluno, Escola, Turma, CursoEscolar, Disciplina, Funcionario } from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { normalizarClasse, TODAS_CLASSES_OFICIAIS_MED, filtrarDisciplinasDaClasse } from '../services/academicHierarchyService';
import { ordenarClassesMED } from '../utils/enrollmentProgression';

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
  escala?: 10 | 20;
  notaAprovacao?: number;
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
  escala?: 10 | 20;
  limiarAprovacao?: number;
}

function isClassePrimariaRanking(classeStr?: string): boolean {
  const norm = (classeStr || '').trim().toLowerCase();
  if (!norm) return false;
  return (
    norm.includes('inicia') ||
    ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '1a', '2a', '3a', '4a', '5a', '6a', '1', '2', '3', '4', '5', '6'].some(
      c => norm === c || norm.startsWith(`${c} `) || norm.startsWith(`${c}ª`)
    )
  );
}

/**
 * Cálculo consistente e auditado da média geral de cada aluno (com notas homologadas, consolidadas e avaliações contínuas)
 */
export function calcularMediaGeralAluno(aluno: Aluno): number {
  // 1. Notas homologadas oficiais pelo diretor/júri
  const notasHomologadas = dbService.obterNotasHomologadasAluno(aluno.id);
  if (notasHomologadas && notasHomologadas.length > 0) {
    const validas = notasHomologadas.map(n => n.notaFinal ?? n.mediaTrimestral ?? 0).filter(v => v > 0);
    if (validas.length > 0) {
      const soma = validas.reduce((acc, v) => acc + v, 0);
      return Number((soma / validas.length).toFixed(1));
    }
  }

  // 2. Notas consolidadas por disciplina e trimestre
  try {
    const todasConsolidadas = dbService.obterNotasConsolidadas();
    const notasAluno = todasConsolidadas.filter(n => n.alunoId === aluno.id);
    if (notasAluno && notasAluno.length > 0) {
      const validas = notasAluno
        .map(n => n.notaFinal ?? n.mediaTrimestral ?? (n as any).mf ?? (n as any).mt ?? 0)
        .filter(v => typeof v === 'number' && v > 0);
      if (validas.length > 0) {
        const soma = validas.reduce((acc, v) => acc + v, 0);
        return Number((soma / validas.length).toFixed(1));
      }
    }
  } catch {}

  // 3. Notas individuais de avaliações (MAC, Testes, Provas do Professor)
  try {
    const notasIndividuais = dbService.obterNotas().filter(n => n.alunoId === aluno.id && typeof (n.valorNota ?? (n as any).valor) === 'number' && (n.valorNota ?? (n as any).valor) > 0);
    if (notasIndividuais.length > 0) {
      const soma = notasIndividuais.reduce((acc, n) => acc + (n.valorNota ?? (n as any).valor ?? 0), 0);
      return Number((soma / notasIndividuais.length).toFixed(1));
    }
  } catch {}

  // 4. Histórico multi-ano (para ensino secundário 10ª, 11ª, 12ª)
  if (aluno.historicoMultiAno && aluno.historicoMultiAno.length > 0) {
    const validas = aluno.historicoMultiAno.filter(h => typeof h.mediaFinal === 'number' && h.mediaFinal > 0);
    if (validas.length > 0) {
      const soma = validas.reduce((acc, h) => acc + (h.mediaFinal as number), 0);
      return Number((soma / validas.length).toFixed(1));
    }
  }

  // 5. Histórico de classes anteriores
  if (aluno.historicoAnterior && aluno.historicoAnterior.length > 0) {
    const validos = aluno.historicoAnterior.filter(h => typeof h.mediaFinal === 'number' && h.mediaFinal > 0);
    if (validos.length > 0) {
      const ultimo = validos[validos.length - 1];
      if (ultimo && typeof ultimo.mediaFinal === 'number' && ultimo.mediaFinal > 0) {
        return Number(ultimo.mediaFinal.toFixed(1));
      }
    }
  }

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
  // Separamos estritamente o Quadro de Excelência (Top 5), Atenção Pedagógica (Risco) e Classificação Geral
  const [rankingTab, setRankingTab] = useState<'top5' | 'risco' | 'todos' | 'professores' | 'disciplinas'>('top5');
  const [filtroClasse, setFiltroClasse] = useState<string>('todas');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [filtroCurso, setFiltroCurso] = useState<string>('todos');
  const [filtroTurno, setFiltroTurno] = useState<string>('todos');
  const [filtroSala, setFiltroSala] = useState<string>('todas');
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [apenasMinhasTurmas, setApenasMinhasTurmas] = useState<boolean>(() => {
    return currentUser?.ehProfessor || currentUser?.role === 'Professor' || false;
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [feedbackExport, setFeedbackExport] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onRemoteOrStorage = () => setRefreshTick(t => t + 1);
    window.addEventListener('sge_dados_atualizados_remoto', onRemoteOrStorage);
    window.addEventListener('storage', onRemoteOrStorage);
    return () => {
      window.removeEventListener('sge_dados_atualizados_remoto', onRemoteOrStorage);
      window.removeEventListener('storage', onRemoteOrStorage);
    };
  }, []);

  const configSistema = dbService.getConfiguracaoSistema();
  const todosAlunos = propAlunos || dbService.getAlunos();
  const todasTurmas = propTurmas || dbService.getTurmas();
  const todosCursos = propCursos || dbService.getCursos(escola.id);
  const todasDisciplinas = propDisciplinas || dbService.getDisciplinas(escola.id);
  const todosFuncionarios = propFuncionarios || dbService.getFuncionarios();
  const todasAtribuicoes = dbService.obterAtribuicoes();
  const todosAssiduidade = dbService.obterAssiduidade();
  const todasNotas = dbService.obterNotasConsolidadas();
  const todasAvaliacoes = dbService.getAvaliacoes();
  const todasNotasIndividuais = dbService.getNotas();

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

  // Lista de classes disponíveis (Classes configuradas + Turmas + Alunos + MED)
  const classesDisponiveis = useMemo(() => {
    const fromCfg = dbService.getClassesConfigs(escola.id).filter(c => c.ativa !== false).map(c => normalizarClasse(c.nome));
    const fromTurmas = todasTurmas.map(t => normalizarClasse(t.classe)).filter(Boolean);
    const fromAlunos = todosAlunos.map(a => normalizarClasse(a.classeId)).filter(Boolean);
    return ordenarClassesMED([
      ...fromCfg,
      ...fromTurmas,
      ...fromAlunos,
      ...TODAS_CLASSES_OFICIAIS_MED
    ]);
  }, [escola.id, todasTurmas, todosAlunos]);

  // Lista de cursos disponíveis (dinâmicos da Direção + Turmas + Alunos)
  const cursosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    dbService.getCursos(escola.id).filter(c => c.ativo !== false).forEach(c => {
      if (c.nome) set.add(c.nome);
    });
    todosCursos.forEach(c => { if (c.nome) set.add(c.nome); });
    todasTurmas.forEach(t => { if (t.curso) set.add(t.curso); });
    todosAlunos.forEach(a => { if (a.curso) set.add(a.curso); });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [escola.id, todosCursos, todasTurmas, todosAlunos]);

  const turnosDisponiveis = useMemo(() => {
    const set = new Set<string>(['Manhã', 'Tarde', 'Noite']);
    dbService.getTurnosConfigs(escola.id).filter(t => t.ativo !== false).forEach(t => {
      if (t.nome) set.add(t.nome);
    });
    todasTurmas.forEach(t => { if (t.turno) set.add(t.turno); });
    return Array.from(set);
  }, [escola.id, todasTurmas]);

  const salasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    dbService.getSalasAulas(escola.id).filter(s => s.ativo !== false).forEach(s => {
      if (s.nome) set.add(s.nome);
    });
    todasTurmas.forEach(t => { if (t.sala) set.add(t.sala); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [escola.id, todasTurmas]);

  // Lista de turmas filtradas pela classe, curso, turno e sala
  const turmasFiltradas = useMemo(() => {
    let base = todasTurmas;
    if (isProfessor && apenasMinhasTurmas) {
      base = base.filter(t => turmasDoProfessorIds.includes(t.id));
    }
    return base.filter(t => {
      if (filtroClasse !== 'todas' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroCurso !== 'todos' && (t.curso || '').trim().toLowerCase() !== filtroCurso.trim().toLowerCase()) return false;
      if (filtroTurno !== 'todos' && (t.turno || '').trim().toLowerCase() !== filtroTurno.trim().toLowerCase()) return false;
      if (filtroSala !== 'todas' && (t.sala || '').trim().toLowerCase() !== filtroSala.trim().toLowerCase()) return false;
      return true;
    });
  }, [todasTurmas, filtroClasse, filtroCurso, filtroTurno, filtroSala, isProfessor, apenasMinhasTurmas, turmasDoProfessorIds]);

  // Alunos filtrados e com médias
  const alunosComMedia = useMemo(() => {
    const anoActivo = escola.anoLectivoActivo || '';
    let filtrados = todosAlunos.filter(a => {
      // Filtrar estritamente por escola ativa
      if (escola.id && escola.id !== 'todas' && a.escolaId !== escola.id) return false;

      // Filtrar por ano letivo ativo: se houver ano ativo definido, filtrar discentes desse ano
      const anoDoAluno = a.anoLectivo || a.anoMatricula;
      if (anoActivo && anoDoAluno && anoDoAluno !== anoActivo) return false;

      if (isProfessor && apenasMinhasTurmas) {
        if (turmasDoProfessorIds.length > 0 && !turmasDoProfessorIds.includes(a.turmaId)) return false;
      }

      const turma = turmasMap.get(a.turmaId);

      if (filtroClasse !== 'todas') {
        const classeDoAluno = normalizarClasse(turma?.classe || a.classeId);
        if (classeDoAluno !== normalizarClasse(filtroClasse)) return false;
      }

      if (filtroTurma !== 'todas') {
        if (a.turmaId !== filtroTurma) return false;
      }

      if (filtroCurso !== 'todos') {
        const cursoDoAluno = (turma?.curso || a.curso || '').trim().toLowerCase();
        if (cursoDoAluno !== filtroCurso.trim().toLowerCase()) return false;
      }

      if (filtroTurno !== 'todos') {
        const turnoDoAluno = (turma?.turno || a.periodo || '').trim().toLowerCase();
        if (turnoDoAluno !== filtroTurno.trim().toLowerCase()) return false;
      }

      if (filtroSala !== 'todas') {
        const salaDoAluno = (turma?.sala || '').trim().toLowerCase();
        if (salaDoAluno !== filtroSala.trim().toLowerCase()) return false;
      }

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
      const classeNome = turma?.classe || aluno.classeId || '—';
      const turmaNome = turma?.nome || aluno.turmaId || '—';
      const cursoNome = turma?.curso || aluno.curso || '—';
      const primario = isClassePrimariaRanking(classeNome);
      const escala: 10 | 20 = primario ? 10 : 20;
      const notaAprovacao = primario ? 5.0 : 9.5;
      const notaExcelencia = primario ? 8.0 : 14.0;
      const notaCritico = primario ? 3.5 : 7.0;

      let status: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' = 'Bom';
      if (media >= notaExcelencia) status = 'Excelente';
      else if (media >= notaAprovacao) status = 'Bom';
      else if (media >= notaCritico) status = 'Atenção';
      else status = 'Crítico';

      return {
        aluno,
        posicao: 0,
        mediaGeral: media,
        classeNome,
        turmaNome,
        cursoNome,
        status,
        escala,
        notaAprovacao
      };
    });
  }, [todosAlunos, filtroClasse, filtroTurma, filtroCurso, filtroTurno, filtroSala, termoPesquisa, turmasMap, escola.id, escola.anoLectivoActivo, isProfessor, apenasMinhasTurmas, turmasDoProfessorIds, refreshTick]);

  // Quadro Geral de Todos os Estudantes Matriculados e Confirmados no Ano Activo
  const todosEstudantesRankeados: AlunoRankeado[] = useMemo(() => {
    const ordenados = [...alunosComMedia].sort((a, b) => {
      const normA = a.mediaGeral / (a.escala || 20);
      const normB = b.mediaGeral / (b.escala || 20);
      if (normB !== normA) return normB - normA;
      return a.aluno.nomeCompleto.localeCompare(b.aluno.nomeCompleto);
    });
    return ordenados.map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [alunosComMedia]);

  // 1. QUADRO DE EXCELÊNCIA (TOP 5 MELHORES ALUNOS — ESTRITAMENTE APROVADOS)
  const top5Melhores: AlunoRankeado[] = useMemo(() => {
    const comNotasPositivas = alunosComMedia.filter(a => a.mediaGeral >= (a.notaAprovacao ?? 9.5));
    const ordenados = [...comNotasPositivas].sort((a, b) => {
      const normA = a.mediaGeral / (a.escala || 20);
      const normB = b.mediaGeral / (b.escala || 20);
      if (normB !== normA) return normB - normA;
      return a.aluno.nomeCompleto.localeCompare(b.aluno.nomeCompleto);
    });
    return ordenados.slice(0, 5).map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [alunosComMedia]);

  // 2. ATENÇÃO PEDAGÓGICA (EXCLUSIVO PARA ALUNOS ABAIXO DA MÉDIA DE APROVAÇÃO — SEM SOBREPOSIÇÃO COM O TOP 5)
  const alunosAtencaoPedagogica: AlunoRankeado[] = useMemo(() => {
    const topIds = new Set(top5Melhores.map(t => t.aluno.id));
    const emRisco = alunosComMedia.filter(a => {
      if (topIds.has(a.aluno.id)) return false;
      const limiar = a.notaAprovacao ?? 9.5;
      return a.mediaGeral > 0 && a.mediaGeral < limiar;
    });
    const ordenados = [...emRisco].sort((a, b) => {
      const normA = a.mediaGeral / (a.escala || 20);
      const normB = b.mediaGeral / (b.escala || 20);
      if (normA !== normB) return normA - normB;
      return a.aluno.nomeCompleto.localeCompare(b.aluno.nomeCompleto);
    });
    return ordenados.slice(0, 15).map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [alunosComMedia, top5Melhores]);

  // 3. RANKING DE PROFESSORES (ESCOPO DA ESCOLA ATIVA)
  const rankingProfessores: ProfessorRankeado[] = useMemo(() => {
    const profs = todosFuncionarios.filter(f => {
      const belongsSchool = !escola.id || escola.id === 'todas' || f.escolaId === escola.id;
      return belongsSchool && f.role !== 'AdminGeral' && (f.ehProfessor || f.role === 'Professor' || f.cargo?.toLowerCase().includes('prof'));
    });
    if (profs.length === 0) return [];

    return profs.map(prof => {
      const registos = todosAssiduidade.filter(a => a.funcionarioId === prof.id);
      let taxaAssiduidade = 0;
      if (registos.length > 0) {
        const presentes = registos.filter(r => r.estado === 'Presente').length;
        taxaAssiduidade = Number(((presentes / registos.length) * 100).toFixed(1));
      }

      const atribs = todasAtribuicoes.filter(at => at.professorId === prof.id && (!escola.id || escola.id === 'todas' || at.escolaId === escola.id));
      const disciplinasNomes = Array.from(new Set(atribs.map(at => (at as any).disciplinaNome || todasDisciplinas.find(d => d.id === at.disciplinaId)?.nome || at.disciplinaId))).filter(Boolean).slice(0, 3);
      const turmasIds = Array.from(new Set(atribs.map(at => at.turmaId)));

      const notasTurmas = todasNotas.filter(nc => turmasIds.includes(nc.turmaId));
      let mediaAlunos = 0;
      if (notasTurmas.length > 0) {
        const soma = notasTurmas.reduce((acc, n) => acc + (n.notaFinal ?? n.mediaTrimestral ?? 0), 0);
        mediaAlunos = Number((soma / notasTurmas.length).toFixed(1));
      }

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
  }, [todosFuncionarios, todosAssiduidade, todasAtribuicoes, todasNotas, todasDisciplinas, escola.id, refreshTick]);

  // 4. RANKING DE DISCIPLINAS (NOTAS CONSOLIDADAS + FALLBACK AVALIAÇÕES MAC DA ESCOLA ATIVA & FILTROS ACADÉMICOS)
  const rankingDisciplinas: DisciplinaRankeada[] = useMemo(() => {
    const anoActivo = escola.anoLectivoActivo || '';
    const temFiltroTurmaAluno =
      filtroClasse !== 'todas' ||
      filtroTurma !== 'todas' ||
      filtroCurso !== 'todos' ||
      filtroTurno !== 'todos' ||
      filtroSala !== 'todas';

    const alunosFiltradosMap = new Map<string, Aluno>();
    todosAlunos.forEach(a => {
      if (escola.id && escola.id !== 'todas' && a.escolaId !== escola.id) return;
      const turma = turmasMap.get(a.turmaId);
      const anoAl = a.anoLectivo || a.anoMatricula || turma?.anoLectivo;
      if (anoActivo && anoAl && anoAl !== anoActivo) return;
      if (isProfessor && apenasMinhasTurmas && turmasDoProfessorIds.length > 0 && !turmasDoProfessorIds.includes(a.turmaId)) {
        return;
      }
      if (filtroClasse !== 'todas') {
        const cl = normalizarClasse(turma?.classe || a.classeId);
        if (cl !== normalizarClasse(filtroClasse)) return;
      }
      if (filtroTurma !== 'todas' && a.turmaId !== filtroTurma) return;
      if (filtroCurso !== 'todos') {
        const cur = (turma?.curso || a.curso || '').trim().toLowerCase();
        if (cur !== filtroCurso.trim().toLowerCase()) return;
      }
      if (filtroTurno !== 'todos') {
        const trn = (turma?.turno || a.periodo || '').trim().toLowerCase();
        if (trn !== filtroTurno.trim().toLowerCase()) return;
      }
      if (filtroSala !== 'todas') {
        const sl = (turma?.sala || '').trim().toLowerCase();
        if (sl !== filtroSala.trim().toLowerCase()) return;
      }
      alunosFiltradosMap.set(a.id, a);
    });

    const turmasFiltradasIds = new Set(
      turmasFiltradas
        .filter(t => !escola.id || escola.id === 'todas' || t.escolaId === escola.id)
        .filter(t => !anoActivo || !t.anoLectivo || t.anoLectivo === anoActivo)
        .filter(t => filtroTurma === 'todas' || t.id === filtroTurma)
        .map(t => t.id)
    );

    let disciplinasEscola = todasDisciplinas.filter(
      d => !escola.id || escola.id === 'todas' || d.escolaId === escola.id
    );
    if (filtroClasse !== 'todas') {
      disciplinasEscola = filtrarDisciplinasDaClasse(
        disciplinasEscola,
        filtroClasse,
        filtroCurso !== 'todos' ? filtroCurso : undefined
      );
    }

    return disciplinasEscola.map(disc => {
      const nomeNormDisc = (disc.nome || '').trim().toLowerCase();
      const primarioDisc =
        (filtroClasse !== 'todas' && isClassePrimariaRanking(filtroClasse)) ||
        (disc.nivelEnsino || '').toLowerCase().includes('prim');
      const escala: 10 | 20 = primarioDisc ? 10 : 20;
      const limiarAprovacao = primarioDisc ? 5.0 : 9.5;

      const notasConsDisc = todasNotas.filter(n => {
        const pertenceEscola =
          !escola.id ||
          escola.id === 'todas' ||
          (n as any).escolaId === escola.id ||
          alunosFiltradosMap.has(n.alunoId) ||
          turmasFiltradasIds.has(n.turmaId);
        if (!pertenceEscola) return false;
        if (anoActivo && n.anoLectivo && n.anoLectivo !== anoActivo) return false;
        if (temFiltroTurmaAluno || (isProfessor && apenasMinhasTurmas)) {
          if (!alunosFiltradosMap.has(n.alunoId) && !turmasFiltradasIds.has(n.turmaId)) return false;
        }
        const matchId = n.disciplinaId === disc.id;
        const matchNome = ((n as any).disciplinaNome || '').trim().toLowerCase() === nomeNormDisc;
        return matchId || (nomeNormDisc && matchNome);
      });

      const valores: number[] = [];
      if (notasConsDisc.length > 0) {
        notasConsDisc.forEach(n => {
          const val = n.notaFinal ?? n.mediaTrimestral ?? (n as any).mac;
          if (typeof val === 'number' && !isNaN(val) && val > 0) {
            valores.push(val);
          }
        });
      }

      if (valores.length === 0) {
        const avIdsDisc = new Set(
          todasAvaliacoes
            .filter(av => {
              const pertenceEscola = !escola.id || escola.id === 'todas' || av.escolaId === escola.id;
              if (!pertenceEscola) return false;
              if (anoActivo && av.anoLectivo && av.anoLectivo !== anoActivo) return false;
              if (temFiltroTurmaAluno || (isProfessor && apenasMinhasTurmas)) {
                if (av.turmaId && !turmasFiltradasIds.has(av.turmaId)) return false;
              }
              return av.disciplinaId === disc.id || ((av as any).disciplinaNome || '').trim().toLowerCase() === nomeNormDisc;
            })
            .map(av => av.id)
        );

        todasNotasIndividuais.forEach(ni => {
          if (avIdsDisc.has(ni.avaliacaoId)) {
            if (temFiltroTurmaAluno && !alunosFiltradosMap.has(ni.alunoId)) return;
            const val = ni.valorNota ?? (ni as any).valor;
            if (typeof val === 'number' && !isNaN(val) && val > 0) {
              valores.push(val);
            }
          }
        });
      }

      let mediaGeral = 0;
      let taxaAprovacao = 0;
      if (valores.length > 0) {
        const soma = valores.reduce((acc, v) => acc + v, 0);
        mediaGeral = Number((soma / valores.length).toFixed(1));
        const positivas = valores.filter(v => v >= limiarAprovacao).length;
        taxaAprovacao = Math.round((positivas / valores.length) * 100);
      }

      return {
        disciplina: disc,
        posicao: 0,
        mediaGeral,
        taxaAprovacao,
        totalAvaliados: valores.length,
        nivel: disc.nivelEnsino || 'Geral',
        escala,
        limiarAprovacao
      };
    })
    .filter(d => d.totalAvaliados > 0)
    .sort((a, b) => (b.mediaGeral / (b.escala || 20)) - (a.mediaGeral / (a.escala || 20)))
    .map((item, idx) => ({ ...item, posicao: idx + 1 }));
  }, [
    todasDisciplinas,
    todasNotas,
    todasAvaliacoes,
    todasNotasIndividuais,
    todosAlunos,
    turmasFiltradas,
    turmasMap,
    filtroClasse,
    filtroTurma,
    filtroCurso,
    filtroTurno,
    filtroSala,
    isProfessor,
    apenasMinhasTurmas,
    turmasDoProfessorIds,
    escola.id,
    escola.anoLectivoActivo,
    refreshTick
  ]);

  const topDisciplinas = useMemo(() => {
    const positivas = rankingDisciplinas.filter(d => d.mediaGeral >= (d.limiarAprovacao ?? 9.5));
    return positivas.slice(0, 5);
  }, [rankingDisciplinas]);

  const pioresDisciplinas = useMemo(() => {
    const topIds = new Set(topDisciplinas.map(d => d.disciplina.id));
    const baixasOuRestantes = rankingDisciplinas.filter(d => {
      const abaixo = d.mediaGeral < (d.limiarAprovacao ?? 9.5);
      return abaixo || !topIds.has(d.disciplina.id);
    });
    return [...baixasOuRestantes]
      .sort((a, b) => (a.mediaGeral / (a.escala || 20)) - (b.mediaGeral / (b.escala || 20)))
      .slice(0, 5);
  }, [rankingDisciplinas, topDisciplinas]);

  // ID exclusivo do container atual para garantia de separação total
  const containerIdAtual = useMemo(() => {
    if (rankingTab === 'top5') return 'ranking-documento-top5-excelencia';
    if (rankingTab === 'risco') return 'ranking-documento-atencao-pedagogica';
    if (rankingTab === 'todos') return 'ranking-documento-todos-estudantes';
    if (rankingTab === 'professores') return 'ranking-documento-professores';
    return 'ranking-documento-disciplinas';
  }, [rankingTab]);

  // Download do PDF com separação estrita de documentos
  const handleBaixarPdf = async () => {
    const element = document.getElementById(containerIdAtual);
    if (!element) return;

    setIsExportingPdf(true);
    setFeedbackExport('A gerar documento PDF idêntico...');

    try {
      const nomeLimpoEscola = (escola.nomeOficial || 'Escola').replace(/[^a-zA-Z0-9]/g, '_');
      const prefixo = 
        rankingTab === 'top5' ? 'Quadro_Honra_Excelencia_Top5' :
        rankingTab === 'risco' ? 'Intervencao_Pedagogica_Risco' :
        rankingTab === 'todos' ? 'Classificacao_Geral_Estudantes' :
        rankingTab === 'professores' ? 'Ranking_Docente' : 'Rendimento_Disciplinas';
      
      const filename = `${prefixo}_${nomeLimpoEscola}_${escola.anoLectivoActivo || '2025_2026'}.pdf`;

      const sucesso = await downloadElementAsPdf(element, filename, {
        orientation: 'portrait',
        marginMm: 6,
        scale: 2.2
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

  // Download de Ficheiro Excel Separado e Isolado
  const handleBaixarExcel = () => {
    const anoLimpo = (escola.anoLectivoActivo || '2025_2026').replace(/[\/\\]/g, '_');
    if (rankingTab === 'top5') {
      const linhas = top5Melhores.map(item => ({
        'Posição': item.posicao,
        'N.º Processo': item.aluno.numeroProcesso || item.aluno.codigoMatricula,
        'Nome do Estudante': item.aluno.nomeCompleto,
        'Classe': item.classeNome,
        'Turma': item.turmaNome,
        'Curso': item.cursoNome,
        'Média Geral': item.mediaGeral,
        'Classificação': 'Quadro de Excelência'
      }));
      downloadExcelFile('Quadro_Excelencia_Top5', linhas, `Quadro_Honra_Top5_${escola.sigla || 'MED'}_${anoLimpo}.xlsx`);
    } else if (rankingTab === 'risco') {
      const linhas = alunosAtencaoPedagogica.map(item => {
        const limiarCrit = (item.escala || 20) === 10 ? 3.5 : 7;
        return {
          'Prioridade': item.posicao,
          'N.º Processo': item.aluno.numeroProcesso || item.aluno.codigoMatricula,
          'Nome do Estudante': item.aluno.nomeCompleto,
          'Classe': item.classeNome,
          'Turma': item.turmaNome,
          'Curso': item.cursoNome,
          'Média Geral': item.mediaGeral,
          'Diagnóstico': item.mediaGeral < limiarCrit ? 'Crítico (Intervenção Imediata)' : 'Atenção Pedagógica (Recuperação)',
          'Contacto Encarregado': item.aluno.telefoneEncarregado || item.aluno.telefone || '—'
        };
      });
      downloadExcelFile('Atencao_Pedagogica', linhas, `Intervencao_Pedagogica_Risco_${escola.sigla || 'MED'}_${anoLimpo}.xlsx`);
    } else if (rankingTab === 'todos') {
      const linhas = todosEstudantesRankeados.map(item => ({
        'Posição': item.posicao,
        'N.º Processo': item.aluno.numeroProcesso || item.aluno.codigoMatricula,
        'Nome do Estudante': item.aluno.nomeCompleto,
        'Classe': item.classeNome,
        'Turma': item.turmaNome,
        'Curso': item.cursoNome,
        'Média Geral': item.mediaGeral > 0 ? item.mediaGeral : 'Pendente (Aguardando Avaliação)',
        'Estado': item.status
      }));
      downloadExcelFile('Classificacao_Geral_Estudantes', linhas, `Classificacao_Geral_${escola.sigla || 'MED'}_${anoLimpo}.xlsx`);
    } else if (rankingTab === 'professores') {
      const linhas = rankingProfessores.map(item => ({
        'Posição': item.posicao,
        'Nome do Professor': item.professor.nomeCompleto,
        'BI': item.professor.numeroBI,
        'Assiduidade': `${item.taxaAssiduidade}%`,
        'Média dos Alunos': item.mediaAlunos,
        'Índice Global': item.indiceGlobal,
        'Turmas': item.totalTurmas,
        'Disciplinas': item.disciplinasNomes.join(', ')
      }));
      downloadExcelFile('Ranking_Professores', linhas, `Ranking_Professores_${escola.sigla || 'MED'}_${anoLimpo}.xlsx`);
    } else {
      const linhas = rankingDisciplinas.map(item => ({
        'Posição': item.posicao,
        'Disciplina': item.disciplina.nome,
        'Sigla': item.disciplina.sigla || '',
        'Ciclo / Nível': item.nivel,
        'Média Geral': item.mediaGeral,
        'Taxa de Aprovação': `${item.taxaAprovacao}%`,
        'Total Alunos Avaliados': item.totalAvaliados
      }));
      downloadExcelFile('Rendimento_Disciplinas', linhas, `Rendimento_Disciplinas_${escola.sigla || 'MED'}_${anoLimpo}.xlsx`);
    }

    setFeedbackExport('Ficheiro Excel descarregado com sucesso!');
    setTimeout(() => setFeedbackExport(null), 4000);
  };

  const hoje = new Date();
  const dia = hoje.getDate();
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  const dataExtensa = `${escola.provincia || 'Luanda'}, aos ${dia} de ${mes} de ${ano}`;

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
    if (filtroTurno !== 'todos') partes.push(`Turno: ${filtroTurno}`);
    if (filtroSala !== 'todas') partes.push(`Sala: ${filtroSala}`);
    return partes.length > 0 ? partes.join(' • ') : 'Toda a Escola (Geral)';
  }, [filtroClasse, filtroTurma, filtroCurso, filtroTurno, filtroSala, turmasMap, isProfessor, apenasMinhasTurmas, currentUser]);

  return (
    <div className="space-y-6">
      {/* Abas Superiores de Alternância com Separação Total dos Lugares */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 no-print">
        <button
          type="button"
          onClick={() => setRankingTab('top5')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'top5'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Quadro de Honra & Excelência (Top 5)</span>
        </button>

        <button
          type="button"
          onClick={() => setRankingTab('todos')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'todos'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Classificação Geral ({alunosComMedia.length} Alunos)</span>
        </button>

        <button
          type="button"
          onClick={() => setRankingTab('risco')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'risco'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Atenção Pedagógica (Alunos em Risco)</span>
        </button>

        <button
          type="button"
          onClick={() => setRankingTab('professores')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'professores'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Ranking de Professores</span>
        </button>

        <button
          type="button"
          onClick={() => setRankingTab('disciplinas')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            rankingTab === 'disciplinas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Rendimento por Disciplinas</span>
        </button>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <div className={`p-2.5 rounded-xl text-white ${
              rankingTab === 'top5' ? 'bg-amber-500' :
              rankingTab === 'todos' ? 'bg-blue-600' :
              rankingTab === 'risco' ? 'bg-rose-600' :
              rankingTab === 'professores' ? 'bg-purple-600' : 'bg-indigo-600'
            }`}>
              {rankingTab === 'top5' && <Trophy className="h-5 w-5" />}
              {rankingTab === 'todos' && <Award className="h-5 w-5" />}
              {rankingTab === 'risco' && <AlertTriangle className="h-5 w-5" />}
              {rankingTab === 'professores' && <UserCheck className="h-5 w-5" />}
              {rankingTab === 'disciplinas' && <BookOpen className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {rankingTab === 'top5' && 'Quadro de Honra & Excelência Discente'}
                {rankingTab === 'todos' && 'Classificação Geral de Desempenho de Todos os Alunos'}
                {rankingTab === 'risco' && 'Plano de Intervenção & Atenção Pedagógica'}
                {rankingTab === 'professores' && 'Ranking Oficial de Desempenho Docente'}
                {rankingTab === 'disciplinas' && 'Aproveitamento Académico por Disciplina'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {rankingTab === 'top5' && 'Exclusivo para os 5 estudantes com melhor rendimento académico da instituição'}
                {rankingTab === 'todos' && `Lista integral de todos os ${alunosComMedia.length} alunos activos no ano lectivo ${escola.anoLectivoActivo || ''}`}
                {rankingTab === 'risco' && 'Ficheiro independente para acompanhamento de recuperação pedagógica e notas baixas'}
                {rankingTab === 'professores' && 'Classificação por assiduidade e aproveitamento das turmas lecionadas'}
                {rankingTab === 'disciplinas' && 'Comparativo de médias e taxas de aprovação curricular'}
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Download Exclusivos para a Aba Selecionada */}
        <div className="flex flex-wrap items-center gap-2.5">
          {feedbackExport && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
              {feedbackExport}
            </span>
          )}

          {isProfessor && (rankingTab === 'top5' || rankingTab === 'risco' || rankingTab === 'todos') && (
            <label className="flex items-center space-x-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 cursor-pointer">
              <input
                type="checkbox"
                checked={apenasMinhasTurmas}
                onChange={(e) => setApenasMinhasTurmas(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Apenas Minhas Turmas</span>
            </label>
          )}

          <button
            type="button"
            onClick={handleBaixarExcel}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            title="Descarregar ficheiro Excel com estes dados específicos"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Baixar Excel</span>
          </button>

          <button
            type="button"
            onClick={handleBaixarPdf}
            disabled={isExportingPdf}
            className={`px-4 py-2.5 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
              rankingTab === 'top5' ? 'bg-amber-600 hover:bg-amber-700' :
              rankingTab === 'risco' ? 'bg-rose-700 hover:bg-rose-800' :
              'bg-blue-700 hover:bg-blue-800'
            }`}
            title="Descarregar ficheiro PDF com cabeçalho oficial e assinaturas"
          >
            {isExportingPdf ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {rankingTab === 'top5' ? 'Baixar Quadro de Excelência (PDF)' :
               rankingTab === 'todos' ? 'Baixar Classificação Geral (PDF)' :
               rankingTab === 'risco' ? 'Baixar Ficha de Atenção Pedagógica (PDF)' :
               'Baixar PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* Seletores de Filtros (para Top 5, Todos, Risco e Disciplinas) */}
      {(rankingTab === 'top5' || rankingTab === 'risco' || rankingTab === 'todos' || rankingTab === 'disciplinas') && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 no-print">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>Filtrar por Classe, Turma, Curso, Turno e Sala:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Curso:</label>
              <select
                value={filtroCurso}
                onChange={(e) => {
                  setFiltroCurso(e.target.value);
                  setFiltroTurma('todas');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="todos">Todos os Cursos</option>
                {cursosDisponiveis.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Turno:</label>
              <select
                value={filtroTurno}
                onChange={(e) => {
                  setFiltroTurno(e.target.value);
                  setFiltroTurma('todas');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="todos">Todos os Turnos</option>
                {turnosDisponiveis.map(tr => (
                  <option key={tr} value={tr}>{tr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Sala:</label>
              <select
                value={filtroSala}
                onChange={(e) => {
                  setFiltroSala(e.target.value);
                  setFiltroTurma('todas');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="todas">Todas as Salas</option>
                {salasDisponiveis.map(sl => (
                  <option key={sl} value={sl}>{sl}</option>
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

            {rankingTab !== 'disciplinas' && (
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
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          DOCUMENTO OFICIAL ISOLADO PARA A ABA ATIVA
          ========================================================================= */}
      <div 
        id={containerIdAtual}
        data-doc-root="true"
        className="documento-oficial-print bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 md:p-10 shadow-md text-slate-900 space-y-6 max-w-5xl mx-auto"
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
              {rankingTab === 'top5' && 'QUADRO DE HONRA & EXCELÊNCIA ACADÉMICA (TOP 5 ESTUDANTES)'}
              {rankingTab === 'todos' && 'QUADRO GERAL DE CLASSIFICAÇÃO E RENDIMENTO DOS ESTUDANTES'}
              {rankingTab === 'risco' && 'MAPA DE INTERVENÇÃO PEDAGÓGICA & RECUPERAÇÃO DISCENTE'}
              {rankingTab === 'professores' && 'QUADRO MINISTERIAL DE MÉRITO E ASSIDUIDADE DOCENTE'}
              {rankingTab === 'disciplinas' && 'MAPA COMPARATIVO DE RENDIMENTO POR DISCIPLINA'}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-bold text-blue-800">
              Ano Lectivo: {escola.anoLectivoActivo || '—'} • Âmbito: {filtroDescricao}
            </p>
          </div>
        </div>

        {/* 1. SECÇÃO ISOLADA: TOP 5 MELHORES ALUNOS (QUADRO DE HONRA) */}
        {rankingTab === 'top5' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <Trophy className="h-5 w-5 text-yellow-200 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Quadro de Excelência • Os 5 Estudantes com Maior Aproveitamento
              </h4>
            </div>

            {top5Melhores.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-700 font-bold">
                  Nenhum estudante qualificado para o Quadro de Excelência com notas lançadas neste filtro.
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {alunosComMedia.length} aluno(s) matriculado(s) no ano lectivo activo ({escola.anoLectivoActivo}). Verifique a aba <strong className="text-blue-700 font-bold">"Classificação Geral"</strong> para visualizar todos os estudantes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-100/70 border-b border-amber-300 text-amber-950 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">N.º</th>
                      <th className="py-2.5 px-3 w-16 text-center">Fotografia</th>
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
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-black shadow-2xs">
                            {item.posicao}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.aluno.fotoUrl && item.aluno.fotoUrl.trim() !== '' ? (
                            <img 
                              src={item.aluno.fotoUrl} 
                              alt={item.aluno.nomeCompleto} 
                              className="w-10 h-10 rounded-full object-cover mx-auto border-2 border-amber-400 shadow-xs" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-300 flex items-center justify-center font-black text-xs mx-auto shadow-xs">
                              {item.aluno.nomeCompleto ? item.aluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('') : 'AL'}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          <div className="text-xs font-black text-slate-900">{item.aluno.nomeCompleto}</div>
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
        )}

        {/* 1.1 SECÇÃO ISOLADA: CLASSIFICAÇÃO GERAL DE TODOS OS ESTUDANTES */}
        {rankingTab === 'todos' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <Award className="h-5 w-5 text-blue-200 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Classificação Geral • Todos os Estudantes Matriculados ({todosEstudantesRankeados.length})
              </h4>
            </div>

            {todosEstudantesRankeados.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                Nenhum estudante matriculado encontrado para os filtros selecionados no ano lectivo {escola.anoLectivoActivo}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-100/70 border-b border-blue-300 text-blue-950 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">N.º</th>
                      <th className="py-2.5 px-3 w-16 text-center">Fotografia</th>
                      <th className="py-2.5 px-4">Nome Completo do Estudante</th>
                      <th className="py-2.5 px-4 text-center">Classe</th>
                      <th className="py-2.5 px-4 text-center">Turma</th>
                      <th className="py-2.5 px-4 text-center">Curso</th>
                      <th className="py-2.5 px-4 text-right">Média Geral</th>
                      <th className="py-2.5 px-4 text-center">Situação Académica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {todosEstudantesRankeados.map((item) => (
                      <tr key={item.aluno.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-black">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            item.posicao <= 3 ? 'bg-amber-500 text-white font-black' :
                            item.posicao <= 5 ? 'bg-blue-600 text-white font-black' :
                            'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {item.posicao}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.aluno.fotoUrl && item.aluno.fotoUrl.trim() !== '' ? (
                            <img 
                              src={item.aluno.fotoUrl} 
                              alt={item.aluno.nomeCompleto} 
                              className="w-10 h-10 rounded-full object-cover mx-auto border-2 border-blue-300 shadow-xs" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 border-2 border-blue-300 flex items-center justify-center font-black text-xs mx-auto shadow-xs">
                              {item.aluno.nomeCompleto ? item.aluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('') : 'AL'}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          <div className="text-xs font-black text-slate-900">{item.aluno.nomeCompleto}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Proc. n.º {item.aluno.numeroProcesso || item.aluno.codigoMatricula} • Gênero: {item.aluno.genero || 'N/D'}
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
                          {item.mediaGeral > 0 ? (
                            <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                              item.mediaGeral >= ((item.escala || 20) === 10 ? 8 : 14) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                              item.mediaGeral >= (item.notaAprovacao ?? 9.5) ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                              'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}>
                              {item.mediaGeral.toFixed(1)} val
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 rounded text-[10px] font-bold">
                              Em Lançamento
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.mediaGeral >= ((item.escala || 20) === 10 ? 8 : 14) ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            item.mediaGeral >= (item.notaAprovacao ?? 9.5) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                            item.mediaGeral > 0 ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                            'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {item.mediaGeral >= ((item.escala || 20) === 10 ? 8 : 14) ? 'Quadro de Honra' :
                             item.mediaGeral >= (item.notaAprovacao ?? 9.5) ? 'Aproveitamento Positivo' :
                             item.mediaGeral > 0 ? 'Atenção Pedagógica' :
                             'Matriculado / Activo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. SECÇÃO ISOLADA: ATENÇÃO PEDAGÓGICA (ALUNOS EM RISCO / MENOR RENDIMENTO) */}
        {rankingTab === 'risco' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-rose-600 to-red-700 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <AlertTriangle className="h-5 w-5 text-rose-200 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Quadro de Intervenção Pedagógica • Alunos com Necessidade de Reforço Académico
              </h4>
            </div>

            {alunosAtencaoPedagogica.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                Nenhum estudante identificado com insuficiência ou média crítica neste filtro.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-100/70 border-b border-rose-300 text-rose-950 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">N.º</th>
                      <th className="py-2.5 px-3 w-16 text-center">Fotografia</th>
                      <th className="py-2.5 px-4">Nome Completo do Estudante</th>
                      <th className="py-2.5 px-4 text-center">Classe</th>
                      <th className="py-2.5 px-4 text-center">Turma</th>
                      <th className="py-2.5 px-4 text-center">Curso</th>
                      <th className="py-2.5 px-4 text-right">Média Atual</th>
                      <th className="py-2.5 px-4 text-center">Recomendação Pedagógica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {alunosAtencaoPedagogica.map((item) => (
                      <tr key={item.aluno.id} className="hover:bg-rose-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-black">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-black shadow-2xs">
                            {item.posicao}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.aluno.fotoUrl && item.aluno.fotoUrl.trim() !== '' ? (
                            <img 
                              src={item.aluno.fotoUrl} 
                              alt={item.aluno.nomeCompleto} 
                              className="w-10 h-10 rounded-full object-cover mx-auto border-2 border-rose-400 shadow-xs" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-800 border-2 border-rose-300 flex items-center justify-center font-black text-xs mx-auto shadow-xs">
                              {item.aluno.nomeCompleto ? item.aluno.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('') : 'AL'}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          <div className="text-xs font-black text-slate-900">{item.aluno.nomeCompleto}</div>
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
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.mediaGeral < ((item.escala || 20) === 10 ? 3.5 : 7) ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {item.mediaGeral < ((item.escala || 20) === 10 ? 3.5 : 7) ? 'Apoio Tutelar Urgente' : 'Reforço nas Avaliações'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. SECÇÃO ISOLADA: RANKING DE PROFESSORES */}
        {rankingTab === 'professores' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <UserCheck className="h-5 w-5 text-blue-200 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Quadro de Mérito Docente • Assiduidade e Aproveitamento Discente
              </h4>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100/70 border-b border-blue-300 text-blue-950 font-black text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-12">N.º</th>
                    <th className="py-2.5 px-4">Nome do Professor</th>
                    <th className="py-2.5 px-4">Disciplinas Lecionadas</th>
                    <th className="py-2.5 px-3 text-center">Turmas</th>
                    <th className="py-2.5 px-3 text-center">Assiduidade</th>
                    <th className="py-2.5 px-3 text-center">Média Alunos</th>
                    <th className="py-2.5 px-4 text-right">Índice Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankingProfessores.map((item) => (
                    <tr key={item.professor.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-black">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-black shadow-2xs">
                          {item.posicao}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        <div>{item.professor.nomeCompleto}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          BI: {item.professor.numeroBI}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {item.disciplinasNomes.join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                        {item.totalTurmas}
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

        {/* 4. SECÇÃO ISOLADA: RENDIMENTO POR DISCIPLINAS */}
        {rankingTab === 'disciplinas' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-xl shadow-xs">
                <TrendingUp className="h-5 w-5 text-emerald-200 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Top Disciplinas com Melhores Médias
                </h4>
              </div>

              {topDisciplinas.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                  Ainda não existem disciplinas com média positiva lançada nesta escola.
                </div>
              ) : (
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
                      {topDisciplinas.map((item, idx) => (
                        <tr key={item.disciplina.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-3 text-center font-black">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black shadow-2xs">
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
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-rose-700 text-white px-4 py-2.5 rounded-xl shadow-xs">
                <TrendingDown className="h-5 w-5 text-amber-200 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Disciplinas em Atenção Pedagógica (Menores Médias)
                </h4>
              </div>

              {pioresDisciplinas.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                  Sem disciplinas em situação de insuficiência ou atenção pedagógica.
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}

        {/* RODAPÉ INSTITUCIONAL */}
        <div className="pt-8 border-t-2 border-slate-300 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div className="text-left space-y-1 text-xs text-slate-600">
            <p className="font-semibold">{dataExtensa}</p>
            <p className="text-[11px] text-slate-500">
              Documento Oficial emitido pela Direcção Pedagógica da Instituição de Ensino.
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

          <div className="text-center space-y-1 flex flex-col items-center">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {escola.diretorGeralGenero === 'F' ? 'A Directora Geral da Instituição' : 'O Director Geral da Instituição'}
            </p>
            
            {escola.assinaturaDiretorUrl && escola.assinaturaDiretorUrl.trim() !== '' ? (
              <div className="h-14 flex items-center justify-center -mb-1">
                <img 
                  src={escola.assinaturaDiretorUrl} 
                  alt="Assinatura do Director" 
                  className="max-h-12 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="h-10" />
            )}
            <div className="w-56 border-b-2 border-slate-900 mx-auto my-1" />

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
