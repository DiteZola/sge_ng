import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Award, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Download, 
  Printer, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Target, 
  BarChart2, 
  ArrowUpRight, 
  Building2,
  ShieldCheck,
  UserCheck,
  Filter,
  FileBarChart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Escola, 
  Turma, 
  Aluno, 
  Disciplina, 
  NotaTrimestralConsolidada, 
  AnoLectivoConfig,
  Funcionario,
  AtribuicaoDocente
} from '../types';
import { dbService } from '../services/storage';
import { 
  filtrarDisciplinasDaClasse, 
  normalizarClasse, 
  formatarCicloPorClasse,
  ordenarDisciplinas,
  isClasseFinal,
  isSegundoCiclo,
  isProfessorCoordenadorTurma,
  CURSOS_SEGUNDO_CICLO,
  disciplinaPertenceAoCurso
} from '../services/academicHierarchyService';
import { ordenarClassesMED } from '../utils/enrollmentProgression';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import {
  obterInformacaoEscala,
  calcularAproveitamentoPautaGeralAlunos,
  calcularNotaTrimestralDinamica,
  calcularMediaGeralDaClasse
} from '../services/macEngine';
import { hojeAngolano, formatarDataHoraAngolana } from '../utils/dateFormat';

type SubAbaEstatistica =
  | 'visao_geral'
  | 'resumo_rede'
  | 'mapa_rendimento'
  | 'rendimento_disciplina'
  | 'assiduidade_faltas'
  | 'carga_horaria';

interface StatisticsViewProps {
  escola: Escola;
  escolas?: Escola[];
  currentUser?: Funcionario;
  turmas: Turma[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  notasConsolidadas?: NotaTrimestralConsolidada[];
  funcionarios?: Funcionario[];
  anoLectivoConfigs?: AnoLectivoConfig[];
  atribuicoes?: AtribuicaoDocente[];
  onMudarEscola?: (escolaId: string) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  escola,
  escolas = [],
  currentUser,
  turmas: propTurmas,
  alunos: propAlunos,
  disciplinas: propDisciplinas,
  notasConsolidadas: propNotas,
  funcionarios: propFuncionarios,
  anoLectivoConfigs = [],
  atribuicoes: propAtribuicoes,
  onMudarEscola: _onMudarEscola
}) => {
  // Identificação do Perfil
  const isAdminGeral = currentUser?.role === 'AdminGeral';
  const isProfessor = currentUser?.role === 'Professor';
  const isCoordenadorDisciplina = currentUser?.role === 'CoordenadorDisciplina';
  const isCoordenadorTurno = currentUser?.role === 'CoordenadorTurno';
  const isCoordenadorPedagogico = currentUser?.role === 'CoordenadorPedagogico';
  const isDocenteOuCoordenador = isProfessor || isCoordenadorDisciplina || isCoordenadorTurno || isCoordenadorPedagogico;
  const isDirecao = 
    currentUser?.role === 'DiretorGeral' || 
    currentUser?.role === 'SubdiretorPedagogico' || 
    currentUser?.role === 'SubdiretorAdministrativo' || 
    currentUser?.role === 'SubdirectorAdministrativo' || 
    currentUser?.role === 'ChefeSecretaria' || 
    currentUser?.role === 'Secretaria' ||
    currentUser?.role === 'SecretarioEscolar' ||
    currentUser?.role === 'Secretario' ||
    currentUser?.role === 'TecnicoTI';

  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [orientacaoPdf, setOrientacaoPdf] = useState<'portrait' | 'landscape'>('portrait');
  const [statsFeedback, setStatsFeedback] = useState<string | null>(null);

  useEffect(() => {
    const syncCfg = () => setConfigSistema(dbService.getConfiguracaoSistema());
    window.addEventListener('sge_dados_atualizados_remoto', syncCfg);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', syncCfg);
  }, []);

  // Filtro local de escola para Administrador Geral (padrão: 'TODAS' = Estatísticas Consolidadas da Rede)
  const [escolaFiltroAdmin, setEscolaFiltroAdmin] = useState<string>(() => (isAdminGeral ? 'TODAS' : escola.id));
  useEffect(() => {
    if (!isAdminGeral) {
      setEscolaFiltroAdmin(escola.id);
    }
  }, [isAdminGeral, escola.id]);

  const isVisaoRedeTodas = isAdminGeral && escolaFiltroAdmin === 'TODAS';
  const escolaExibida = useMemo(() => {
    if (isAdminGeral && escolaFiltroAdmin !== 'TODAS') {
      return escolas.find(e => e.id === escolaFiltroAdmin) || escola;
    }
    return escola;
  }, [isAdminGeral, escolaFiltroAdmin, escolas, escola]);

  const escolasMap = useMemo(() => {
    const map = new Map<string, Escola>();
    escolas.forEach(e => map.set(e.id, e));
    if (escola?.id && !map.has(escola.id)) map.set(escola.id, escola);
    return map;
  }, [escolas, escola]);

  // Dados isolados ao escopo selecionado
  const turmas = useMemo(() => {
    if (!isAdminGeral || isVisaoRedeTodas) return propTurmas;
    return propTurmas.filter(t => t.escolaId === escolaExibida.id);
  }, [isAdminGeral, isVisaoRedeTodas, propTurmas, escolaExibida.id]);

  const alunos = useMemo(() => {
    if (!isAdminGeral || isVisaoRedeTodas) return propAlunos;
    return propAlunos.filter(a => a.escolaId === escolaExibida.id);
  }, [isAdminGeral, isVisaoRedeTodas, propAlunos, escolaExibida.id]);

  const disciplinas = useMemo(() => {
    if (!isAdminGeral || isVisaoRedeTodas) return propDisciplinas;
    return propDisciplinas.filter(d => d.escolaId === escolaExibida.id);
  }, [isAdminGeral, isVisaoRedeTodas, propDisciplinas, escolaExibida.id]);

  const notas = useMemo(() => {
    const base = propNotas || dbService.getNotasConsolidadas();
    if (!isAdminGeral || isVisaoRedeTodas) return base;
    const idsAlunos = new Set(alunos.map(a => a.id));
    return base.filter(n => n.escolaId === escolaExibida.id || idsAlunos.has(n.alunoId));
  }, [propNotas, isAdminGeral, isVisaoRedeTodas, escolaExibida.id, alunos]);

  const funcionarios = useMemo(() => {
    const base = (propFuncionarios || dbService.getFuncionarios()).filter(f => f.role !== 'AdminGeral');
    if (!isAdminGeral) return base.filter(f => f.escolaId === escola.id);
    if (isVisaoRedeTodas) return base;
    return base.filter(f => f.escolaId === escolaExibida.id);
  }, [propFuncionarios, isAdminGeral, isVisaoRedeTodas, escola.id, escolaExibida.id]);

  const anosConfigs = useMemo(() => {
    if (anoLectivoConfigs.length > 0 && !isVisaoRedeTodas) return anoLectivoConfigs;
    const todas = isVisaoRedeTodas
      ? dbService.getAnosLectivosConfigs()
      : dbService.getAnosLectivosConfigs(escolaExibida.id);
    const vistos = new Map<string, AnoLectivoConfig>();
    todas.forEach(c => {
      const rot = (c.rotulo || c.ano || '').trim();
      if (rot && !vistos.has(rot)) vistos.set(rot, c);
    });
    if (isVisaoRedeTodas) {
      escolas.forEach(esc => {
        if (esc.anoLectivoActivo && !vistos.has(esc.anoLectivoActivo)) {
          vistos.set(esc.anoLectivoActivo, {
            id: `ano-stat-${esc.id}`,
            escolaId: esc.id,
            rotulo: esc.anoLectivoActivo,
            ano: esc.anoLectivoActivo,
            dataInicio: '',
            dataFim: '',
            estado: 'Aberto',
            trimestres: [],
            criadoEm: ''
          });
        }
      });
    }
    return Array.from(vistos.values());
  }, [anoLectivoConfigs, isVisaoRedeTodas, escolaExibida.id, escolas]);

  const atribuicoesTodas = useMemo(() => {
    const base = propAtribuicoes || dbService.getAtribuicoes();
    if (!isAdminGeral || isVisaoRedeTodas) return base;
    return base.filter(a => !a.escolaId || a.escolaId === escolaExibida.id);
  }, [propAtribuicoes, isAdminGeral, isVisaoRedeTodas, escolaExibida.id]);

  const horariosTodas = useMemo(() => {
    const base = dbService.obterHorarios(
      isVisaoRedeTodas ? undefined : escolaExibida.id,
      isVisaoRedeTodas ? undefined : escolaExibida.anoLectivoActivo
    );
    return base;
  }, [isVisaoRedeTodas, escolaExibida.id, escolaExibida.anoLectivoActivo]);

  // Escopo estrito por perfil:
  // - Professor / CoordenadorDisciplina / CoordenadorTurno: estritamente limitado às suas turmas/disciplinas/turno
  // - CoordenadorPedagogico / Direção: visão global da escola (com opção de auditar docente)
  // - AdminGeral: visão global de todas as escolas (ou escola específica)
  const isDocenteEscopoRestrito = isProfessor || isCoordenadorDisciplina || isCoordenadorTurno;
  const [modoVisao, setModoVisao] = useState<'minhas_atribuicoes' | 'toda_escola'>(
    isDocenteEscopoRestrito ? 'minhas_atribuicoes' : 'toda_escola'
  );
  useEffect(() => {
    if (isDocenteEscopoRestrito && modoVisao !== 'minhas_atribuicoes') {
      setModoVisao('minhas_atribuicoes');
    }
  }, [isDocenteEscopoRestrito, modoVisao]);

  const [subAbaAtiva, setSubAbaAtiva] = useState<SubAbaEstatistica>('visao_geral');

  // Filtro de Docente para Direção / AdminGeral: permite auditar individualmente qualquer professor
  const [filtroDocenteId, setFiltroDocenteId] = useState<string>('TODOS');

  // Filtros Centrais
  const [filtroAno, setFiltroAno] = useState<string>(() => (isAdminGeral ? 'TODOS' : (escola.anoLectivoActivo || '')));
  useEffect(() => {
    if (!isAdminGeral) {
      setFiltroAno(escola.anoLectivoActivo || '');
    }
  }, [isAdminGeral, escola.id, escola.anoLectivoActivo]);
  const [filtroTrimestre, setFiltroTrimestre] = useState<string>(() => (isAdminGeral ? 'anual' : String(escola.trimestreActivo || '1')));
  const [filtroCiclo, setFiltroCiclo] = useState<string>('TODOS');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');
  const [filtroCurso, setFiltroCurso] = useState<string>('TODOS');
  const [filtroClasse, setFiltroClasse] = useState<string>('TODAS');
  const [filtroSala, setFiltroSala] = useState<string>('TODAS');
  const [filtroTurmaId, setFiltroTurmaId] = useState<string>('TODAS');
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState<string>('TODAS');

  const handleSelecionarEscolaAdmin = (novoEscId: string) => {
    setEscolaFiltroAdmin(novoEscId);
    setFiltroDocenteId('TODOS');
    setFiltroTurmaId('TODAS');
    setFiltroDisciplinaId('TODAS');
    setFiltroClasse('TODAS');
    setFiltroCurso('TODOS');
    setFiltroSala('TODAS');
    if (novoEscId === 'TODAS') {
      setFiltroAno('TODOS');
      setFiltroTrimestre('anual');
    } else {
      const escAlvo = escolas.find(e => e.id === novoEscId);
      setFiltroAno(escAlvo?.anoLectivoActivo || 'TODOS');
      setFiltroTrimestre(String(escAlvo?.trimestreActivo || 'anual'));
    }
  };

  // Lista de docentes e coordenadores cadastrados na escola
  const listaDocentes = useMemo(() => {
    return funcionarios.filter(f => 
      f.categoriaProfissional?.toLowerCase().includes('prof') || 
      f.categoriaProfissional?.toLowerCase().includes('doc') ||
      f.role === 'Professor' ||
      f.role === 'CoordenadorDisciplina' ||
      f.role === 'CoordenadorTurno' ||
      f.role === 'CoordenadorPedagogico' ||
      Boolean(f.especialidade)
    );
  }, [funcionarios]);

  // Identificação do Docente Alvo da Análise
  const docenteAlvo = useMemo(() => {
    if (isDocenteEscopoRestrito) {
      return currentUser || null;
    }
    if ((isDirecao || isCoordenadorPedagogico || isAdminGeral) && filtroDocenteId !== 'TODOS') {
      return funcionarios.find(f => f.id === filtroDocenteId) || null;
    }
    return null;
  }, [isDocenteEscopoRestrito, currentUser, isDirecao, isCoordenadorPedagogico, isAdminGeral, filtroDocenteId, funcionarios]);

  // Atribuições e Horários do Docente Alvo
  const atribuicoesDoDocenteAlvo = useMemo(() => {
    if (!docenteAlvo) return [];
    return atribuicoesTodas.filter(a => a.professorId === docenteAlvo.id);
  }, [docenteAlvo, atribuicoesTodas]);

  const horariosDoDocenteAlvo = useMemo(() => {
    if (!docenteAlvo) return [];
    return horariosTodas.filter(h => h.professorId === docenteAlvo.id);
  }, [docenteAlvo, horariosTodas]);

  const turmasCoordenadasIds = useMemo(() => {
    const ids = new Set<string>();
    if (!docenteAlvo) return ids;
    turmas.forEach(t => {
      if (
        isProfessorCoordenadorTurma(t, docenteAlvo.id) ||
        (t.directorTurmaNome && t.directorTurmaNome.toLowerCase() === docenteAlvo.nomeCompleto.toLowerCase())
      ) {
        ids.add(t.id);
      }
    });
    return ids;
  }, [docenteAlvo, turmas]);

  const turmasDocenteIds = useMemo(() => {
    if (!docenteAlvo) return new Set<string>();
    const ids = new Set<string>(atribuicoesDoDocenteAlvo.map(a => a.turmaId));
    horariosDoDocenteAlvo.forEach(h => {
      if (h.turmaId) ids.add(h.turmaId);
    });
    turmasCoordenadasIds.forEach(id => ids.add(id));
    if (isCoordenadorTurno && docenteAlvo.cargo) {
      const cargo = docenteAlvo.cargo.toLowerCase();
      turmas.forEach(t => {
        if (cargo.includes('manhã') && t.turno === 'Manhã') ids.add(t.id);
        else if (cargo.includes('tarde') && t.turno === 'Tarde') ids.add(t.id);
        else if (cargo.includes('noite') && t.turno === 'Noite') ids.add(t.id);
      });
    }
    return ids;
  }, [docenteAlvo, atribuicoesDoDocenteAlvo, horariosDoDocenteAlvo, turmasCoordenadasIds, isCoordenadorTurno, turmas]);

  const paresTurmaDisciplinaDocente = useMemo(() => {
    const pares = new Set<string>();
    atribuicoesDoDocenteAlvo.forEach(a => {
      if (a.turmaId && a.disciplinaId) pares.add(`${a.turmaId}::${a.disciplinaId}`);
    });
    horariosDoDocenteAlvo.forEach(h => {
      if (h.turmaId && h.disciplinaId) pares.add(`${h.turmaId}::${h.disciplinaId}`);
    });
    return pares;
  }, [atribuicoesDoDocenteAlvo, horariosDoDocenteAlvo]);

  const disciplinasDocenteIds = useMemo(() => {
    if (!docenteAlvo) return new Set<string>();
    const ids = new Set<string>(atribuicoesDoDocenteAlvo.map(a => a.disciplinaId));
    horariosDoDocenteAlvo.forEach(h => {
      if (h.disciplinaId) ids.add(h.disciplinaId);
    });
    // Se coordena alguma turma, inclui as disciplinas curriculares das classes coordenadas
    turmas.forEach(t => {
      if (turmasCoordenadasIds.has(t.id)) {
        filtrarDisciplinasDaClasse(disciplinas, t.classe, isSegundoCiclo(t.classe) ? t.curso : undefined).forEach(d => ids.add(d.id));
      }
    });
    if (docenteAlvo.role === 'CoordenadorDisciplina' && docenteAlvo.especialidade) {
      disciplinas.forEach(d => {
        if (d.nome.toLowerCase().includes(docenteAlvo.especialidade!.toLowerCase()) ||
            docenteAlvo.especialidade!.toLowerCase().includes(d.nome.toLowerCase())) {
          ids.add(d.id);
        }
      });
    }
    return ids;
  }, [docenteAlvo, atribuicoesDoDocenteAlvo, horariosDoDocenteAlvo, turmas, turmasCoordenadasIds, disciplinas]);

  // Turmas permitidas conforme o perfil ou filtro (NUNCA devolve todas as turmas da escola ao professor)
  const turmasPermitidas = useMemo(() => {
    if (docenteAlvo) {
      return turmas.filter(t => turmasDocenteIds.has(t.id));
    }
    if (isCoordenadorTurno && modoVisao === 'minhas_atribuicoes' && currentUser?.cargo) {
      const cargo = currentUser.cargo.toLowerCase();
      if (cargo.includes('manhã')) return turmas.filter(t => t.turno === 'Manhã');
      if (cargo.includes('tarde')) return turmas.filter(t => t.turno === 'Tarde');
      if (cargo.includes('noite')) return turmas.filter(t => t.turno === 'Noite');
    }
    return turmas;
  }, [turmas, docenteAlvo, turmasDocenteIds, isCoordenadorTurno, modoVisao, currentUser]);

  // Disciplinas permitidas (NUNCA devolve todas as disciplinas da escola ao professor)
  const disciplinasPermitidas = useMemo(() => {
    if (docenteAlvo) {
      return ordenarDisciplinas(disciplinas.filter(d => disciplinasDocenteIds.has(d.id)));
    }
    if (isCoordenadorDisciplina && modoVisao === 'minhas_atribuicoes' && currentUser?.especialidade) {
      const filtradas = disciplinas.filter(d =>
        d.nome.toLowerCase().includes(currentUser.especialidade!.toLowerCase()) ||
        currentUser.especialidade!.toLowerCase().includes(d.nome.toLowerCase())
      );
      return ordenarDisciplinas(filtradas);
    }
    return ordenarDisciplinas(disciplinas);
  }, [disciplinas, docenteAlvo, disciplinasDocenteIds, isCoordenadorDisciplina, modoVisao, currentUser]);

  // Cursos, Classes, Salas e Turnos disponíveis (Curso exclusivo para IIº Ciclo)
  const cursosDisponiveis = useMemo(() => {
    const setCursos = new Set<string>();
    const cfg = isVisaoRedeTodas
      ? dbService.getCursos()
      : dbService.getCursos(escolaExibida.id);
    cfg.filter(c => c.ativo !== false).forEach(c => {
      if (c.nome && c.nome.trim()) setCursos.add(c.nome.trim());
    });
    turmasPermitidas.forEach(t => {
      if (isSegundoCiclo(t.classe) && t.curso && t.curso.trim()) setCursos.add(t.curso.trim());
    });
    if (turmasPermitidas.some(t => isSegundoCiclo(t.classe))) {
      CURSOS_SEGUNDO_CICLO.forEach(c => setCursos.add(c));
    }
    return Array.from(setCursos).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [isVisaoRedeTodas, escolaExibida.id, turmasPermitidas]);

  const classesDisponiveis = useMemo(() => {
    const cfg = isVisaoRedeTodas
      ? dbService.getClassesConfigs()
      : dbService.getClassesConfigs(escolaExibida.id, escolaExibida.anoLectivoActivo);
    const fromCfg = isDocenteEscopoRestrito
      ? []
      : cfg.filter(c => c.ativa !== false).map(c => normalizarClasse(c.nome)).filter(Boolean);
    const fromTurmas = turmasPermitidas.map(t => normalizarClasse(t.classe)).filter(Boolean);
    return ordenarClassesMED([...fromCfg, ...fromTurmas]);
  }, [isVisaoRedeTodas, escolaExibida.id, escolaExibida.anoLectivoActivo, turmasPermitidas, isDocenteEscopoRestrito]);

  const exibirFiltroCurso = useMemo(() => {
    if (filtroClasse !== 'TODAS') return isSegundoCiclo(filtroClasse);
    if (filtroCiclo !== 'TODOS' && filtroCiclo !== 'IIº Ciclo') return false;
    return classesDisponiveis.some(c => isSegundoCiclo(c)) || turmasPermitidas.some(t => isSegundoCiclo(t.classe));
  }, [filtroClasse, filtroCiclo, classesDisponiveis, turmasPermitidas]);

  useEffect(() => {
    if (!exibirFiltroCurso && filtroCurso !== 'TODOS') {
      setFiltroCurso('TODOS');
    }
  }, [exibirFiltroCurso, filtroCurso]);

  const salasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    const cfg = isVisaoRedeTodas ? dbService.getSalasAulas() : dbService.getSalasAulas(escolaExibida.id);
    if (!isDocenteEscopoRestrito) {
      cfg.filter(s => s.ativo !== false).forEach(s => { if (s.nome) set.add(s.nome); });
    }
    turmasPermitidas.forEach(t => { if (t.sala && t.sala.trim()) set.add(t.sala.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [isVisaoRedeTodas, escolaExibida.id, turmasPermitidas, isDocenteEscopoRestrito]);

  const turnosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    if (!isDocenteEscopoRestrito) {
      ['Manhã', 'Tarde', 'Noite'].forEach(tr => set.add(tr));
      const cfg = isVisaoRedeTodas ? dbService.getTurnosConfigs() : dbService.getTurnosConfigs(escolaExibida.id, escolaExibida.anoLectivoActivo);
      cfg.filter(t => t.ativo !== false).forEach(t => { if (t.nome) set.add(t.nome); });
    }
    turmasPermitidas.forEach(t => { if (t.turno) set.add(t.turno); });
    return Array.from(set);
  }, [isVisaoRedeTodas, escolaExibida.id, escolaExibida.anoLectivoActivo, turmasPermitidas, isDocenteEscopoRestrito]);

  // Turmas filtradas
  const turmasFiltradas = useMemo(() => {
    return turmasPermitidas.filter(t => {
      if (filtroAno && filtroAno !== 'TODOS' && t.anoLectivo && t.anoLectivo !== filtroAno) return false;
      if (filtroTurno !== 'TODOS' && (!t.turno || !t.turno.toLowerCase().includes(filtroTurno.toLowerCase()))) return false;
      if (filtroCiclo !== 'TODOS') {
        const cicloTurma = formatarCicloPorClasse(t.classe);
        if (!cicloTurma.toLowerCase().includes(filtroCiclo.toLowerCase())) return false;
      }
      if (filtroCurso !== 'TODOS' && (!isSegundoCiclo(t.classe) || (t.curso || '').trim().toLowerCase() !== filtroCurso.trim().toLowerCase())) return false;
      if (filtroSala !== 'TODAS' && (t.sala || '').trim().toLowerCase() !== filtroSala.trim().toLowerCase()) return false;
      if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroTurmaId !== 'TODAS' && t.id !== filtroTurmaId) return false;
      return true;
    });
  }, [turmasPermitidas, filtroAno, filtroTurno, filtroCiclo, filtroCurso, filtroSala, filtroClasse, filtroTurmaId]);

  // Alunos das turmas filtradas
  const alunosFiltrados = useMemo(() => {
    const idsTurmas = new Set(turmasFiltradas.map(t => t.id));
    if (!docenteAlvo && !isDocenteEscopoRestrito && filtroClasse === 'TODAS' && filtroCiclo === 'TODOS' && filtroCurso === 'TODOS' && filtroTurno === 'TODOS' && filtroSala === 'TODAS' && filtroTurmaId === 'TODAS' && (!filtroAno || filtroAno === 'TODOS')) {
      const escolaIds = new Set(turmasFiltradas.map(t => t.escolaId));
      return alunos.filter(a => idsTurmas.has(a.turmaId) || (!a.turmaId && (escolaIds.has(a.escolaId) || isVisaoRedeTodas)));
    }
    return alunos.filter(a => idsTurmas.has(a.turmaId));
  }, [alunos, turmasFiltradas, docenteAlvo, isDocenteEscopoRestrito, filtroClasse, filtroCiclo, filtroCurso, filtroTurno, filtroSala, filtroTurmaId, filtroAno, isVisaoRedeTodas]);

  // Notas aplicáveis aos filtros (professor vê estritamente suas disciplinas/turmas/coordenações)
  const notasFiltradas = useMemo(() => {
    const idsAlunos = new Set(alunosFiltrados.map(a => a.id));
    const alunoTurmaMap = new Map<string, string>();
    alunosFiltrados.forEach(a => {
      if (a.turmaId) alunoTurmaMap.set(a.id, a.turmaId);
    });
    return notas.filter(n => {
      if (!idsAlunos.has(n.alunoId)) return false;
      if (filtroAno && filtroAno !== 'TODOS' && n.anoLectivo && n.anoLectivo !== filtroAno) return false;
      if (filtroTrimestre !== 'anual' && n.trimestre && String(n.trimestre) !== filtroTrimestre) return false;
      if (filtroDisciplinaId !== 'TODAS' && n.disciplinaId !== filtroDisciplinaId) return false;
      if (docenteAlvo) {
        const turmaNota = n.turmaId || alunoTurmaMap.get(n.alunoId) || '';
        if (turmasCoordenadasIds.has(turmaNota)) return true;
        if (paresTurmaDisciplinaDocente.size > 0 && turmaNota) {
          return paresTurmaDisciplinaDocente.has(`${turmaNota}::${n.disciplinaId}`);
        }
        return disciplinasDocenteIds.has(n.disciplinaId);
      }
      return true;
    });
  }, [notas, alunosFiltrados, filtroAno, filtroTrimestre, filtroDisciplinaId, docenteAlvo, turmasCoordenadasIds, paresTurmaDisciplinaDocente, disciplinasDocenteIds]);

  const regrasMAC = useMemo(() => dbService.obterRegrasMAC(), []);
  const jurisTodos = useMemo(() => dbService.getJuris(), []);
  const nppAtivoEfetivo = isVisaoRedeTodas ? true : escolaExibida.nppAtivo !== false;
  const triFiltroCanonical: '1' | '2' | '3' | 'anual' =
    filtroTrimestre === '1' || filtroTrimestre === '2' || filtroTrimestre === '3' ? filtroTrimestre : 'anual';
  const anoFiltroCanonical = !filtroAno || filtroAno === 'TODOS' ? 'todos' : filtroAno;

  // Indicadores Centrais (KPIs) — 100% Coerentes com as Pautas Gerais
  const metricasGlobais = useMemo(() => {
    const totalMatriculados = alunosFiltrados.length;
    const matriculadosM = alunosFiltrados.filter(a => a.genero === 'M').length;
    const matriculadosF = alunosFiltrados.filter(a => a.genero === 'F').length;

    const resumoPauta = calcularAproveitamentoPautaGeralAlunos({
      alunos: alunosFiltrados,
      notasConsolidadas: notasFiltradas,
      turmas: turmasFiltradas,
      regrasMAC,
      juris: jurisTodos,
      trimestreFiltro: triFiltroCanonical,
      anoLectivo: anoFiltroCanonical,
      nppAtivo: nppAtivoEfetivo,
      escolaId: isVisaoRedeTodas ? 'todas' : escolaExibida.id
    });

    const desistentes = resumoPauta.desistentesOuTransferidos;
    const taxaAbandono = totalMatriculados > 0 ? ((desistentes / totalMatriculados) * 100).toFixed(1) : '0.0';

    const totalAvaliados = resumoPauta.totalAvaliados;
    const totalAprovados = resumoPauta.aprovados;
    const totalReprovados = resumoPauta.recurso + resumoPauta.reprovados;
    const taxaAprovacao = totalAvaliados > 0 ? ((totalAprovados / totalAvaliados) * 100).toFixed(1) : '0.0';
    const mediaGeralEscola = totalAvaliados > 0 ? String(Math.round(resumoPauta.mediaNotas)) : '—';

    // Distribuição de notas normalizada na escala /20 para classificar Primário (0-10) e Secundário (0-20) com rigor MED
    let excelente = 0;
    let bom = 0;
    let suficiente = 0;
    let insuficiente = 0;

    alunosFiltrados.forEach(aluno => {
      if (aluno.estado === 'Desistente' || aluno.estado === 'Transferido') return;
      const turma = turmas.find(t => t.id === aluno.turmaId);
      const escala = obterInformacaoEscala(turma?.classe || aluno.classeId);
      const notasAluno = notasFiltradas.filter(n => n.alunoId === aluno.id);
      if (notasAluno.length === 0) return;
      const soma = notasAluno.reduce((acc, n) => {
        const pt = typeof n.npt === 'number' ? n.npt : (typeof n.provaTrimestral === 'number' ? n.provaTrimestral : undefined);
        const temInputs = typeof n.mac === 'number' || typeof pt === 'number' || (nppAtivoEfetivo && typeof n.npp === 'number');
        const val = !nppAtivoEfetivo && temInputs
          ? calcularNotaTrimestralDinamica(typeof n.mac === 'number' ? n.mac : undefined, undefined, pt, regrasMAC[0], Number(n.trimestre) || 1, turma?.classe, false).mediaTrimestral
          : (n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0);
        return acc + val;
      }, 0);
      const media = soma / notasAluno.length;
      const norm20 = escala.escalaMaxima === 10 ? media * 2 : media;
      if (norm20 >= 17.5) excelente++;
      else if (norm20 >= 13.5) bom++;
      else if (norm20 >= 9.5) suficiente++;
      else insuficiente++;
    });

    return {
      totalMatriculados,
      matriculadosM,
      matriculadosF,
      desistentes,
      taxaAbandono,
      totalAvaliados,
      totalAprovados,
      totalReprovados,
      taxaAprovacao,
      mediaGeralEscola,
      distribuicaoNiveis: {
        excelente: { count: excelente, pct: totalAvaliados > 0 ? ((excelente / totalAvaliados) * 100).toFixed(1) : '0' },
        bom: { count: bom, pct: totalAvaliados > 0 ? ((bom / totalAvaliados) * 100).toFixed(1) : '0' },
        suficiente: { count: suficiente, pct: totalAvaliados > 0 ? ((suficiente / totalAvaliados) * 100).toFixed(1) : '0' },
        insuficiente: { count: insuficiente, pct: totalAvaliados > 0 ? ((insuficiente / totalAvaliados) * 100).toFixed(1) : '0' }
      }
    };
  }, [alunosFiltrados, turmas, turmasFiltradas, notasFiltradas, regrasMAC, jurisTodos, triFiltroCanonical, anoFiltroCanonical, nppAtivoEfetivo, isVisaoRedeTodas, escolaExibida.id]);

  // Rendimento Comparativo por Classe — Alinhado com Pautas Gerais e Médias de Disciplinas Necessárias
  const rendimentoPorClasse = useMemo(() => {
    const mapaTurmasPorClasse = new Map<string, Turma[]>();
    turmasFiltradas.forEach(t => {
      const cls = t.classe || 'Outra';
      const arr = mapaTurmasPorClasse.get(cls);
      if (arr) arr.push(t);
      else mapaTurmasPorClasse.set(cls, [t]);
    });

    const anoRef = anoFiltroCanonical && anoFiltroCanonical !== 'todos' ? anoFiltroCanonical : escolaExibida.anoLectivoActivo;
    const regimePeriodos = dbService.getRegimePeriodosAtivo(escolaExibida.id, anoRef);
    const periodosConfig = dbService.getPeriodosLetivos(escolaExibida.id, anoRef);

    return Array.from(mapaTurmasPorClasse.entries()).map(([classe, turmasCls]) => {
      const turmaIds = new Set(turmasCls.map(t => t.id));
      const alunosCls = alunosFiltrados.filter(a => turmaIds.has(a.turmaId));
      const resCls = calcularAproveitamentoPautaGeralAlunos({
        alunos: alunosCls,
        notasConsolidadas: notasFiltradas,
        turmas: turmasCls,
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: nppAtivoEfetivo,
        escolaId: isVisaoRedeTodas ? 'todas' : escolaExibida.id
      });
      const resMediaCls = calcularMediaGeralDaClasse({
        classe,
        turmasDaClasse: turmasCls,
        alunosDaClasse: alunosCls,
        disciplinas: disciplinasPermitidas,
        notasConsolidadas: notasFiltradas,
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: nppAtivoEfetivo,
        regimePeriodos,
        periodosConfig,
        escolaId: isVisaoRedeTodas ? 'todas' : escolaExibida.id
      });
      const taxa = resCls.totalAvaliados > 0 ? ((resCls.aprovados / resCls.totalAvaliados) * 100).toFixed(1) : '0.0';
      const media = resMediaCls.mediaGeral !== null
        ? resMediaCls.mediaGeral.toFixed(1)
        : (resCls.totalAvaliados > 0 ? resCls.mediaNotas.toFixed(1) : '—');
      const mediaNum = resMediaCls.mediaGeral !== null ? resMediaCls.mediaGeral : resCls.mediaNotas;
      return {
        classe,
        matriculados: alunosCls.length,
        avaliados: resCls.totalAvaliados,
        aprovados: resCls.aprovados,
        somaMedias: mediaNum * resCls.totalAvaliados,
        taxaAprovacao: parseFloat(taxa),
        mediaGeral: media,
        disciplinasComNotas: resMediaCls.disciplinasComNotas,
        totalDisciplinasNecessarias: resMediaCls.totalDisciplinasNecessarias
      };
    }).sort((a, b) => a.classe.localeCompare(b.classe, 'pt-AO', { numeric: true }));
  }, [turmasFiltradas, alunosFiltrados, notasFiltradas, disciplinasPermitidas, regrasMAC, jurisTodos, triFiltroCanonical, anoFiltroCanonical, nppAtivoEfetivo, isVisaoRedeTodas, escolaExibida.id, escolaExibida.anoLectivoActivo]);

  // Ranking de Turmas — Alinhado com Pautas Gerais
  const rankingTurmas = useMemo(() => {
    const lista = turmasFiltradas.map(t => {
      const alunosTurma = alunos.filter(a => a.turmaId === t.id);
      const resTurma = calcularAproveitamentoPautaGeralAlunos({
        alunos: alunosTurma,
        notasConsolidadas: notasFiltradas,
        turmas: [t],
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: nppAtivoEfetivo,
        escolaId: t.escolaId || escolaExibida.id
      });
      const taxa = resTurma.totalAvaliados > 0 ? (resTurma.aprovados / resTurma.totalAvaliados) * 100 : 0;

      return {
        turma: t,
        avaliados: resTurma.totalAvaliados,
        aprovados: resTurma.aprovados,
        taxaAprovacao: parseFloat(taxa.toFixed(1)),
        mediaTurma: resTurma.totalAvaliados > 0 ? Math.round(resTurma.mediaNotas) : 0
      };
    }).filter(t => t.avaliados > 0);

    const ordenadasPorTaxa = [...lista].sort((a, b) => b.taxaAprovacao - a.taxaAprovacao || b.mediaTurma - a.mediaTurma);
    const topTurmas = ordenadasPorTaxa.slice(0, 5);
    const atencaoTurmas = [...ordenadasPorTaxa].reverse().slice(0, 5);

    return { topTurmas, atencaoTurmas };
  }, [turmasFiltradas, alunos, notasFiltradas, regrasMAC, jurisTodos, triFiltroCanonical, anoFiltroCanonical, nppAtivoEfetivo, escolaExibida.id]);

  // Aproveitamento por Disciplina na Ordem Oficial Cadastrada (consolida por nome quando em Visão de Todas as Escolas)
  const aproveitamentoDisciplinas = useMemo(() => {
    const turmaPorAluno = new Map<string, Turma>();
    const turmasMap = new Map<string, Turma>();
    turmasFiltradas.forEach(t => turmasMap.set(t.id, t));
    alunos.forEach(a => {
      const t = turmasMap.get(a.turmaId);
      if (t) turmaPorAluno.set(a.id, t);
    });

    if (isVisaoRedeTodas) {
      const discPorId = new Map<string, Disciplina>();
      disciplinasPermitidas.forEach(d => discPorId.set(d.id, d));
      const grupos = new Map<string, { nome: string; codigo: string; ordem: number; avaliados: number; positivas: number; soma: number }>();

      notasFiltradas.forEach(n => {
        const disc = discPorId.get(n.disciplinaId);
        if (!disc) return;
        const key = (disc.nome || '').trim().toLowerCase();
        if (!key) return;
        if (!grupos.has(key)) {
          grupos.set(key, {
            nome: disc.nome,
            codigo: disc.codigo || '—',
            ordem: disc.ordem ?? 999,
            avaliados: 0,
            positivas: 0,
            soma: 0
          });
        }
        const g = grupos.get(key)!;
        const turma = turmaPorAluno.get(n.alunoId) || turmasMap.get(n.turmaId);
        const escala = obterInformacaoEscala(turma?.classe);
        const val = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
        g.avaliados++;
        g.soma += val;
        if (val >= escala.notaAprovacao) g.positivas++;
      });

      return Array.from(grupos.values())
        .filter(g => g.avaliados > 0)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-AO'))
        .map(g => {
          const taxa = g.avaliados > 0 ? ((g.positivas / g.avaliados) * 100).toFixed(1) : '0.0';
          const media = g.avaliados > 0 ? (g.soma / g.avaliados).toFixed(1) : '—';
          return {
            disciplina: { id: g.nome, nome: g.nome, codigo: g.codigo, ordem: g.ordem } as Disciplina,
            avaliados: g.avaliados,
            positivas: g.positivas,
            taxa: parseFloat(taxa),
            media
          };
        });
    }

    const discsOrdenadas = ordenarDisciplinas(disciplinasPermitidas);

    return discsOrdenadas.map(disc => {
      let avaliados = 0;
      let positivas = 0;
      let soma = 0;

      notasFiltradas.forEach(n => {
        if (n.disciplinaId === disc.id) {
          const turma = turmaPorAluno.get(n.alunoId) || turmasMap.get(n.turmaId);
          const escala = obterInformacaoEscala(turma?.classe);
          const val = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
          avaliados++;
          soma += val;
          if (val >= escala.notaAprovacao) positivas++;
        }
      });

      const taxa = avaliados > 0 ? ((positivas / avaliados) * 100).toFixed(1) : '0.0';
      const media = avaliados > 0 ? (soma / avaliados).toFixed(1) : '—';

      return {
        disciplina: disc,
        avaliados,
        positivas,
        taxa: parseFloat(taxa),
        media
      };
    }).filter(d => d.avaliados > 0);
  }, [isVisaoRedeTodas, disciplinasPermitidas, notasFiltradas, turmasFiltradas, alunos]);

  // =========================================================================
  // MAPAS ESTATÍSTICOS DETALHADOS CONSOLIDADOS NA ESTATÍSTICA (MED ANGOLA — COERENTE COM PAUTAS GERAIS)
  // =========================================================================
  const mapaRendimentoTurmas = useMemo(() => {
    return turmasFiltradas.map(t => {
      const alunosDaTurma = alunos.filter(a => a.turmaId === t.id);
      const matriculadosM = alunosDaTurma.filter(a => a.genero === 'M').length;
      const matriculadosF = alunosDaTurma.filter(a => a.genero === 'F').length;
      const matriculadosTotal = alunosDaTurma.length;

      const resTurma = calcularAproveitamentoPautaGeralAlunos({
        alunos: alunosDaTurma,
        notasConsolidadas: notasFiltradas,
        turmas: [t],
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: nppAtivoEfetivo,
        escolaId: t.escolaId || escolaExibida.id
      });
      const resM = calcularAproveitamentoPautaGeralAlunos({
        alunos: alunosDaTurma.filter(a => a.genero === 'M'),
        notasConsolidadas: notasFiltradas,
        turmas: [t],
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: nppAtivoEfetivo,
        escolaId: t.escolaId || escolaExibida.id
      });
      const resF = calcularAproveitamentoPautaGeralAlunos({
        alunos: alunosDaTurma.filter(a => a.genero === 'F'),
        notasConsolidadas: notasFiltradas,
        turmas: [t],
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: nppAtivoEfetivo,
        escolaId: t.escolaId || escolaExibida.id
      });

      const desistentesTotal = resTurma.desistentesOuTransferidos;
      const avaliadosTotal = resTurma.totalAvaliados;
      const avaliadosM = resM.totalAvaliados;
      const avaliadosF = resF.totalAvaliados;

      const aprovadosTotal = resTurma.aprovados;
      const aprovadosM = resM.aprovados;
      const aprovadosF = resF.aprovados;
      const reprovadosTotal = resTurma.recurso + resTurma.reprovados;

      const percAprovados = avaliadosTotal > 0 ? ((aprovadosTotal / avaliadosTotal) * 100).toFixed(1) : '0.0';
      const percReprovados = avaliadosTotal > 0 ? ((reprovadosTotal / avaliadosTotal) * 100).toFixed(1) : '0.0';
      const mediaTurma = avaliadosTotal > 0 ? resTurma.mediaNotas.toFixed(1) : '—';

      return {
        turma: t,
        escolaSigla: escolasMap.get(t.escolaId)?.sigla || escolaExibida.sigla || 'MED',
        matriculadosTotal,
        matriculadosM,
        matriculadosF,
        desistentesTotal,
        avaliadosTotal,
        avaliadosM,
        avaliadosF,
        aprovadosTotal,
        aprovadosM,
        aprovadosF,
        percAprovados,
        reprovadosTotal,
        percReprovados,
        mediaTurma,
        ehTerminal: isClasseFinal(t.classe)
      };
    });
  }, [turmasFiltradas, alunos, notasFiltradas, escolasMap, escolaExibida.sigla, escolaExibida.id, regrasMAC, jurisTodos, triFiltroCanonical, anoFiltroCanonical, nppAtivoEfetivo]);

  const totaisGeraisMapa = useMemo(() => {
    let matriculados = 0;
    let avaliados = 0;
    let aprovados = 0;
    let reprovados = 0;
    mapaRendimentoTurmas.forEach(m => {
      matriculados += m.matriculadosTotal;
      avaliados += m.avaliadosTotal;
      aprovados += m.aprovadosTotal;
      reprovados += m.reprovadosTotal;
    });
    const taxaGeral = avaliados > 0 ? ((aprovados / avaliados) * 100).toFixed(1) : '0.0';
    return { matriculados, avaliados, aprovados, reprovados, taxaGeral };
  }, [mapaRendimentoTurmas]);

  const rendimentoDetalhadoPorDisciplina = useMemo(() => {
    if (isVisaoRedeTodas) {
      const grupos = new Map<string, { nome: string; codigo: string; ordem: number; totalAvaliados: number; totalPositivas: number; totalNegativas: number; somaNotas: number }>();
      const discPorId = new Map<string, Disciplina>();
      disciplinasPermitidas.forEach(d => discPorId.set(d.id, d));

      const alunosIdsAlvo = new Set(
        alunosFiltrados.filter(a => a.estado !== 'Desistente').map(a => a.id)
      );
      const turmaPorAluno = new Map<string, Turma>();
      alunos.forEach(a => {
        const t = turmasFiltradas.find(tu => tu.id === a.turmaId);
        if (t) turmaPorAluno.set(a.id, t);
      });

      notasFiltradas.forEach(item => {
        if (!alunosIdsAlvo.has(item.alunoId)) return;
        const disc = discPorId.get(item.disciplinaId);
        if (!disc) return;
        const key = (disc.nome || '').trim().toLowerCase();
        if (!key) return;
        const turma = turmaPorAluno.get(item.alunoId);
        const escala = obterInformacaoEscala(turma?.classe);
        const notaVal = item.mediaTrimestral ?? item.notaFinal ?? item.mac ?? 0;

        if (!grupos.has(key)) {
          grupos.set(key, {
            nome: disc.nome,
            codigo: disc.codigo || '—',
            ordem: disc.ordem ?? 999,
            totalAvaliados: 0,
            totalPositivas: 0,
            totalNegativas: 0,
            somaNotas: 0
          });
        }
        const g = grupos.get(key)!;
        g.totalAvaliados++;
        g.somaNotas += notaVal;
        if (notaVal >= escala.notaAprovacao) g.totalPositivas++;
        else g.totalNegativas++;
      });

      return Array.from(grupos.values())
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-AO'))
        .map(g => {
          const taxaAproveitamento = g.totalAvaliados > 0 ? ((g.totalPositivas / g.totalAvaliados) * 100).toFixed(1) : '0.0';
          const mediaDisciplina = g.totalAvaliados > 0 ? (g.somaNotas / g.totalAvaliados).toFixed(1) : '—';
          let statusQualitativo = 'Sem Avaliações';
          if (g.totalAvaliados > 0) {
            const pct = parseFloat(taxaAproveitamento);
            if (pct >= 85) statusQualitativo = 'Excelente';
            else if (pct >= 65) statusQualitativo = 'Bom';
            else if (pct >= 50) statusQualitativo = 'Regular';
            else statusQualitativo = 'Crítico / Atenção';
          }
          return {
            disciplina: { id: g.nome, nome: g.nome, codigo: g.codigo, ordem: g.ordem } as Disciplina,
            ordem: g.ordem,
            totalAvaliados: g.totalAvaliados,
            totalPositivas: g.totalPositivas,
            totalNegativas: g.totalNegativas,
            taxaAproveitamento,
            mediaDisciplina,
            statusQualitativo
          };
        });
    }

    const disciplinasDaGrelha =
      filtroClasse !== 'TODAS'
        ? filtrarDisciplinasDaClasse(
            disciplinasPermitidas,
            filtroClasse,
            filtroCurso !== 'TODOS' ? filtroCurso : turmasFiltradas[0]?.curso
          )
        : filtroCurso !== 'TODOS'
        ? disciplinasPermitidas.filter(d => disciplinaPertenceAoCurso(d, filtroCurso))
        : disciplinasPermitidas;
    const disciplinasFinais = filtroDisciplinaId !== 'TODAS'
      ? disciplinasDaGrelha.filter(d => d.id === filtroDisciplinaId)
      : disciplinasDaGrelha;

    return disciplinasFinais.map(disc => {
      let totalAvaliados = 0;
      let totalPositivas = 0;
      let totalNegativas = 0;
      let somaNotas = 0;

      turmasFiltradas.forEach(t => {
        const alunosTurma = alunos.filter(a => a.turmaId === t.id && a.estado !== 'Desistente');
        const escala = obterInformacaoEscala(t.classe);

        alunosTurma.forEach(aluno => {
          const n = notasFiltradas.find(item => item.alunoId === aluno.id && item.disciplinaId === disc.id);
          if (n) {
            const notaVal = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
            totalAvaliados++;
            somaNotas += notaVal;
            if (notaVal >= escala.notaAprovacao) totalPositivas++;
            else totalNegativas++;
          }
        });
      });

      const taxaAproveitamento = totalAvaliados > 0 ? ((totalPositivas / totalAvaliados) * 100).toFixed(1) : '0.0';
      const mediaDisciplina = totalAvaliados > 0 ? (somaNotas / totalAvaliados).toFixed(1) : '—';
      let statusQualitativo = 'Sem Avaliações';
      if (totalAvaliados > 0) {
        const pct = parseFloat(taxaAproveitamento);
        if (pct >= 85) statusQualitativo = 'Excelente';
        else if (pct >= 65) statusQualitativo = 'Bom';
        else if (pct >= 50) statusQualitativo = 'Regular';
        else statusQualitativo = 'Crítico / Atenção';
      }

      return {
        disciplina: disc,
        ordem: disc.ordem ?? 999,
        totalAvaliados,
        totalPositivas,
        totalNegativas,
        taxaAproveitamento,
        mediaDisciplina,
        statusQualitativo
      };
    });
  }, [isVisaoRedeTodas, disciplinasPermitidas, filtroClasse, filtroCurso, filtroDisciplinaId, turmasFiltradas, alunosFiltrados, alunos, notasFiltradas]);

  const presencasAlunosEscopo = useMemo(() => {
    const todas = dbService.obterPresencasAlunos();
    if (!isAdminGeral || isVisaoRedeTodas) return todas;
    return todas.filter(p => p.escolaId === escolaExibida.id);
  }, [isAdminGeral, isVisaoRedeTodas, escolaExibida.id]);

  const dadosAssiduidadeTurmas = useMemo(() => {
    return turmasFiltradas.map(t => {
      const alunosTurma = alunos.filter(a => a.turmaId === t.id && a.estado !== 'Desistente');
      const presencasTurma = presencasAlunosEscopo.filter(p => p.turmaId === t.id);
      let totalFaltasTurma = 0;
      let alunosEmRiscoFaltas = 0;

      alunosTurma.forEach(aluno => {
        const notasAluno = notasFiltradas.filter(n => n.alunoId === aluno.id);
        const faltasNotas = notasAluno.reduce((acc, n) => acc + (n.faltas || 0), 0);
        const faltasChamada = presencasTurma.filter(p => p.alunoId === aluno.id && p.estado !== 'Presente').length;
        const faltasAluno = Math.max(faltasNotas, faltasChamada);
        totalFaltasTurma += faltasAluno;
        if (faltasAluno >= 20) alunosEmRiscoFaltas++;
      });

      const mediaFaltasPorAluno = alunosTurma.length > 0 ? (totalFaltasTurma / alunosTurma.length).toFixed(1) : '0';
      let taxaAssiduidadeEstimada = Math.max(0, 100 - (parseFloat(mediaFaltasPorAluno) * 1.5)).toFixed(1);
      if (presencasTurma.length > 0) {
        const presentes = presencasTurma.filter(p => p.estado === 'Presente').length;
        taxaAssiduidadeEstimada = ((presentes / presencasTurma.length) * 100).toFixed(1);
      }

      return {
        turma: t,
        escolaSigla: escolasMap.get(t.escolaId)?.sigla || escolaExibida.sigla || 'MED',
        totalAlunos: alunosTurma.length,
        totalFaltasTurma,
        mediaFaltasPorAluno,
        alunosEmRiscoFaltas,
        taxaAssiduidadeEstimada
      };
    });
  }, [turmasFiltradas, alunos, presencasAlunosEscopo, notasFiltradas, escolasMap, escolaExibida.sigla]);

  const distribuicaoCargaDocente = useMemo(() => {
    const listaProfessores = docenteAlvo
      ? [docenteAlvo]
      : listaDocentes.length > 0
        ? listaDocentes
        : funcionarios.filter(f =>
            f.categoriaProfissional?.toLowerCase().includes('prof') ||
            f.categoriaProfissional?.toLowerCase().includes('doc') ||
            Boolean(f.especialidade)
          );

    return listaProfessores.map(doc => {
      const turmasDoProf = turmas.filter(t =>
        t.coordenadorId === doc.id ||
        (t.coordenadorNome && t.coordenadorNome.toLowerCase() === doc.nomeCompleto.toLowerCase()) ||
        (t.directorTurmaNome && t.directorTurmaNome.toLowerCase() === doc.nomeCompleto.toLowerCase()) ||
        atribuicoesTodas.some(a => a.professorId === doc.id && a.turmaId === t.id)
      );
      const turmasNomes = turmasDoProf.length > 0
        ? turmasDoProf.map(t => t.nome).join(', ')
        : 'Docência em Turmas Curriculares';

      const discAtribs = atribuicoesTodas
        .filter(a => a.professorId === doc.id)
        .map(a => disciplinas.find(d => d.id === a.disciplinaId)?.nome)
        .filter(Boolean);

      const discNomes = discAtribs.length > 0
        ? Array.from(new Set(discAtribs)).join(', ')
        : (doc.especialidade || 'Docência Curricular (MED)');

      const temposSemanais = Math.max(doc.cargaHorariaSemanal || (turmasDoProf.length * 4), turmasDoProf.length * 2, 4);

      return {
        docente: doc,
        disciplinas: discNomes,
        turmasContagem: turmasDoProf.length,
        turmasNomes,
        temposSemanais,
        regime: doc.tipoContrato || 'Quadro Efetivo (MED)'
      };
    });
  }, [docenteAlvo, listaDocentes, funcionarios, turmas, atribuicoesTodas, disciplinas]);

  // Resumo Estatístico Comparativo por Escola (para AdminGeral em Rede Nacional)
  const resumoPorEscola = useMemo(() => {
    if (!isAdminGeral) return [];
    const presencasTodas = dbService.obterPresencasAlunos();
    const notasBase = propNotas || dbService.getNotasConsolidadas();
    const funcsBase = (propFuncionarios || dbService.getFuncionarios()).filter(f => f.role !== 'AdminGeral' && f.ativo !== false);

    return escolas.map(esc => {
      const dir = dbService.encontrarDiretorDaEscola(esc, funcsBase);
      const nomeDirRaw = dir?.nomeCompleto || esc.diretorGeralNome || '';
      const nomeDirNorm = nomeDirRaw.trim().toLowerCase();
      const temDiretor = Boolean(
        dir ||
        (nomeDirNorm && nomeDirNorm !== 'não atribuído' && nomeDirNorm !== 'nao atribuido' && nomeDirNorm !== 'pendente de nomeação')
      );
      const diretorNome = temDiretor ? nomeDirRaw : 'Sem Diretor Atribuído';

      const turmasEsc = propTurmas.filter(t => {
        if (t.escolaId !== esc.id) return false;
        if (filtroAno && filtroAno !== 'TODOS' && t.anoLectivo && t.anoLectivo !== filtroAno) return false;
        if (filtroTurno !== 'TODOS' && (!t.turno || !t.turno.toLowerCase().includes(filtroTurno.toLowerCase()))) return false;
        if (filtroCiclo !== 'TODOS' && !formatarCicloPorClasse(t.classe).toLowerCase().includes(filtroCiclo.toLowerCase())) return false;
        if (filtroCurso !== 'TODOS' && (t.curso || '').trim().toLowerCase() !== filtroCurso.trim().toLowerCase()) return false;
        if (filtroSala !== 'TODAS' && (t.sala || '').trim().toLowerCase() !== filtroSala.trim().toLowerCase()) return false;
        if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
        return true;
      });
      const turmasEscIds = new Set(turmasEsc.map(t => t.id));
      const temFiltroTurma =
        (filtroAno && filtroAno !== 'TODOS') ||
        filtroTurno !== 'TODOS' ||
        filtroCiclo !== 'TODOS' ||
        filtroCurso !== 'TODOS' ||
        filtroSala !== 'TODAS' ||
        filtroClasse !== 'TODAS';
      const alunosEsc = propAlunos.filter(
        a => a.escolaId === esc.id && (!temFiltroTurma || turmasEscIds.has(a.turmaId))
      );
      const matriculadosM = alunosEsc.filter(a => a.genero === 'M').length;
      const matriculadosF = alunosEsc.filter(a => a.genero === 'F').length;
      const desistentes = alunosEsc.filter(a => a.estado === 'Desistente' || a.estado === 'Transferido').length;
      const ativos = alunosEsc.filter(a => a.estado !== 'Desistente' && a.estado !== 'Transferido');

      const professoresCount = funcsBase.filter(f =>
        f.escolaId === esc.id &&
        (f.role === 'Professor' || f.ehProfessor || f.categoriaProfissional?.toLowerCase().includes('prof') || f.categoriaProfissional?.toLowerCase().includes('doc'))
      ).length;

      const resEsc = calcularAproveitamentoPautaGeralAlunos({
        alunos: alunosEsc,
        notasConsolidadas: notasBase.filter(n => !n.escolaId || n.escolaId === esc.id || alunosEsc.some(a => a.id === n.alunoId)),
        turmas: turmasEsc,
        regrasMAC,
        juris: jurisTodos,
        trimestreFiltro: triFiltroCanonical,
        anoLectivo: anoFiltroCanonical,
        nppAtivo: esc.nppAtivo !== false,
        escolaId: esc.id
      });

      const avaliados = resEsc.totalAvaliados;
      const aprovados = resEsc.aprovados;
      const taxaAprovacao = avaliados > 0 ? parseFloat(((aprovados / avaliados) * 100).toFixed(1)) : 0;
      const mediaGeral = avaliados > 0 ? String(Math.round(resEsc.mediaNotas)) : '—';

      const presEsc = presencasTodas.filter(p => p.escolaId === esc.id);
      const assiduidadePct = presEsc.length > 0
        ? `${((presEsc.filter(p => p.estado === 'Presente').length / presEsc.length) * 100).toFixed(1)}%`
        : '—';

      return {
        escola: esc,
        diretorNome,
        temDiretor,
        turmasCount: turmasEsc.length,
        professoresCount,
        totalMatriculados: alunosEsc.length,
        matriculadosM,
        matriculadosF,
        desistentes,
        avaliados,
        aprovados,
        taxaAprovacao,
        mediaGeral,
        assiduidadePct
      };
    });
  }, [isAdminGeral, escolas, propTurmas, propAlunos, propNotas, propFuncionarios, filtroAno, filtroTrimestre, filtroTurno, filtroCiclo, filtroCurso, filtroSala, filtroClasse, regrasMAC, jurisTodos, triFiltroCanonical, anoFiltroCanonical]);

  // Rendimento Agregado por Curso & Área de Formação (Exclusivo IIº Ciclo — Coerente com Pautas Gerais)
  const rendimentoPorCurso = useMemo(() => {
    const turmasSegundoCiclo = turmasFiltradas.filter(t => isSegundoCiclo(t.classe));
    if (turmasSegundoCiclo.length === 0) return [];

    const cursosConfigsMap = new Map<string, string>();
    const cursosCfg = isVisaoRedeTodas ? dbService.getCursos() : dbService.getCursos(escolaExibida.id);
    cursosCfg.forEach(c => {
      if (c.nome) cursosConfigsMap.set(c.nome.trim().toLowerCase(), c.area || '');
    });

    const grupos = new Map<string, { curso: string; area: string; turmasCurso: Turma[]; alunosCurso: Aluno[] }>();

    turmasSegundoCiclo.forEach(t => {
      const cursoNome = (t.curso || '').trim();
      if (!cursoNome) return;
      const key = cursoNome.toLowerCase();
      const areaNome = t.areaFormacao || cursosConfigsMap.get(key) || 'Especialidade';
      if (!grupos.has(key)) {
        grupos.set(key, { curso: cursoNome, area: areaNome, turmasCurso: [], alunosCurso: [] });
      }
      const g = grupos.get(key)!;
      g.turmasCurso.push(t);
      const alunosTurma = alunos.filter(a => a.turmaId === t.id);
      g.alunosCurso.push(...alunosTurma);
    });

    return Array.from(grupos.values())
      .map(g => {
        const resC = calcularAproveitamentoPautaGeralAlunos({
          alunos: g.alunosCurso,
          notasConsolidadas: notasFiltradas,
          turmas: g.turmasCurso,
          regrasMAC,
          juris: jurisTodos,
          trimestreFiltro: triFiltroCanonical,
          anoLectivo: anoFiltroCanonical,
          nppAtivo: nppAtivoEfetivo,
          escolaId: isVisaoRedeTodas ? 'todas' : escolaExibida.id
        });
        return {
          curso: g.curso,
          area: g.area,
          turmasCount: g.turmasCurso.length,
          matriculados: g.alunosCurso.length,
          avaliados: resC.totalAvaliados,
          aprovados: resC.aprovados,
          somaMedias: resC.mediaNotas * resC.totalAvaliados,
          taxaAprovacao: resC.totalAvaliados > 0 ? Number(((resC.aprovados / resC.totalAvaliados) * 100).toFixed(1)) : 0,
          mediaGeral: resC.totalAvaliados > 0 ? String(Math.round(resC.mediaNotas)) : '—'
        };
      })
      .sort((a, b) => b.matriculados - a.matriculados || a.curso.localeCompare(b.curso, 'pt'));
  }, [isVisaoRedeTodas, escolaExibida.id, turmasFiltradas, alunos, notasFiltradas, regrasMAC, jurisTodos, triFiltroCanonical, anoFiltroCanonical, nppAtivoEfetivo]);

  // Ações
  const handleImprimir = () => {
    const el = document.getElementById('estatisticas-painel-oficial-doc');
    if (el) {
      imprimirElementoDiretamente(
        el,
        `Estatisticas_MED_${isVisaoRedeTodas ? 'Rede_Nacional' : (escolaExibida.sigla || escolaExibida.nome || 'Escola')}`,
        { orientation: orientacaoPdf, format: 'a4', marginMm: 8 }
      );
    } else {
      window.print();
    }
  };

  const handleBaixarPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const escSlug = (isVisaoRedeTodas ? 'TODAS_ESCOLAS' : (escolaExibida.sigla || escolaExibida.nome || 'MED')).replace(/[^a-zA-Z0-9_-]+/g, '_');
      const anoSlug = (filtroAno || 'GERAL').replace(/[\/\\]/g, '-');
      const ok = await downloadElementAsPdf(
        'estatisticas-painel-oficial-doc',
        `Estatisticas_${escSlug}_${anoSlug}_T${filtroTrimestre}`,
        { orientation: orientacaoPdf, format: 'a4', marginMm: 8, scale: 2.1 }
      );
      if (ok) {
        setStatsFeedback('Relatório estatístico exportado em PDF com sucesso.');
        setTimeout(() => setStatsFeedback(null), 4000);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const tituloInst = isVisaoRedeTodas
        ? 'REPÚBLICA DE ANGOLA — MINISTÉRIO DA EDUCAÇÃO (MAPA ESTATÍSTICO CONSOLIDADO)'
        : `${(escolaExibida.nomeOficial || escolaExibida.nome || 'ESCOLA').toUpperCase()} — MAPA ESTATÍSTICO`;
      const filtroDesc = `Ano Lectivo: ${filtroAno || 'Todos'} | Trimestre: ${filtroTrimestre === 'anual' ? 'Consolidado Anual' : `${filtroTrimestre}º Trimestre`} | Emitido em: ${hojeAngolano('curto')}`;

      // Resumo Por Escola (AdminGeral)
      if (resumoPorEscola.length > 0) {
        const aoaEscolas: any[][] = [
          [tituloInst],
          [filtroDesc],
          [],
          ['Nº', 'Escola', 'Sigla', 'Província / Município', 'Diretor Geral', 'Ano Letivo', 'Estado', 'Turmas', 'Professores', 'Matriculados', 'M', 'F', 'Avaliados', 'Aprovados', '% Aprovação', 'Média Geral', 'Assiduidade']
        ];
        const firstR = 5;
        resumoPorEscola.forEach((r, idx) => {
          const rNum = firstR + idx;
          aoaEscolas.push([
            idx + 1,
            r.escola.nomeOficial || r.escola.nome,
            r.escola.sigla || '—',
            `${r.escola.provincia || 'Angola'} / ${r.escola.municipio || '—'}`,
            r.diretorNome,
            r.escola.anoLectivoActivo || 'Não Definido',
            r.escola.ativo === false || r.escola.estadoEscola === 'Suspensa' ? 'Suspensa' : 'Ativa',
            r.turmasCount,
            r.professoresCount,
            r.totalMatriculados,
            r.matriculadosM,
            r.matriculadosF,
            r.avaliados,
            r.aprovados,
            { t: 'n', v: r.avaliados > 0 ? r.aprovados / r.avaliados : 0, f: `IF(M${rNum}>0,N${rNum}/M${rNum},0)`, z: '0.0%' },
            r.mediaGeral !== '—' ? Number(r.mediaGeral) : '—',
            r.assiduidadePct
          ]);
        });
        const lastR = firstR + resumoPorEscola.length - 1;
        const totR = lastR + 1;
        aoaEscolas.push([
          '', 'TOTAL / MÉDIA GLOBAL', '', '', '', '', '',
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.turmasCount, 0), f: `SUM(H${firstR}:H${lastR})`, z: '0' },
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.professoresCount, 0), f: `SUM(I${firstR}:I${lastR})`, z: '0' },
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.totalMatriculados, 0), f: `SUM(J${firstR}:J${lastR})`, z: '0' },
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.matriculadosM, 0), f: `SUM(K${firstR}:K${lastR})`, z: '0' },
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.matriculadosF, 0), f: `SUM(L${firstR}:L${lastR})`, z: '0' },
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.avaliados, 0), f: `SUM(M${firstR}:M${lastR})`, z: '0' },
          { t: 'n', v: resumoPorEscola.reduce((s, r) => s + r.aprovados, 0), f: `SUM(N${firstR}:N${lastR})`, z: '0' },
          { t: 'n', v: 0, f: `IF(M${totR}>0,N${totR}/M${totR},0)`, z: '0.0%' },
          { t: 'n', v: 0, f: `IFERROR(ROUND(AVERAGE(P${firstR}:P${lastR}),1),0)`, z: '0.0' },
          ''
        ]);
        const wsEscolas = XLSX.utils.aoa_to_sheet(aoaEscolas);
        wsEscolas['!cols'] = [
          { wch: 6 }, { wch: 32 }, { wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 12 }, { wch: 10 },
          { wch: 9 }, { wch: 11 }, { wch: 13 }, { wch: 7 }, { wch: 7 }, { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 12 }, { wch: 13 }
        ];
        wsEscolas['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } }
        ];
        XLSX.utils.book_append_sheet(wb, wsEscolas, 'Resumo_Por_Escola');
      }

      // Indicadores Centrais
      const aoaKpi: any[][] = [
        [tituloInst],
        [filtroDesc],
        [],
        ['Indicador Estatístico', 'Valor'],
        ['Âmbito', isVisaoRedeTodas ? `Rede Nacional (${escolas.length} Escolas)` : (escolaExibida.nomeOficial || escolaExibida.nome)],
        ['Perfil Analisado', isProfessor ? `Docente (${currentUser?.nomeCompleto})` : (isVisaoRedeTodas ? 'Administração Central (Todas as Escolas)' : 'Institucional / Geral')],
        ['Total de Estudantes Registados', metricasGlobais.totalMatriculados],
        ['Estudantes do Género Masculino (M)', metricasGlobais.matriculadosM],
        ['Estudantes do Género Feminino (F)', metricasGlobais.matriculadosF],
        ['Alunos Avaliados no Período', metricasGlobais.totalAvaliados],
        ['Alunos Aprovados (Positivos)', metricasGlobais.totalAprovados],
        ['Alunos Reprovados (Negativos)', { t: 'n', v: metricasGlobais.totalReprovados, f: 'MAX(0,B10-B11)', z: '0' }],
        ['Taxa de Aprovação Global (%)', { t: 'n', v: metricasGlobais.totalAvaliados > 0 ? metricasGlobais.totalAprovados / metricasGlobais.totalAvaliados : 0, f: 'IF(B10>0,B11/B10,0)', z: '0.0%' }],
        ['Média Geral', Number(metricasGlobais.mediaGeralEscola) || 0],
        ['Estudantes Desistentes / Transferidos', metricasGlobais.desistentes],
        ['Taxa de Retenção e Abandono (%)', { t: 'n', v: metricasGlobais.totalMatriculados > 0 ? metricasGlobais.desistentes / metricasGlobais.totalMatriculados : 0, f: 'IF(B7>0,B15/B7,0)', z: '0.0%' }]
      ];
      const wsKpi = XLSX.utils.aoa_to_sheet(aoaKpi);
      wsKpi['!cols'] = [{ wch: 42 }, { wch: 34 }];
      wsKpi['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
      XLSX.utils.book_append_sheet(wb, wsKpi, 'Indicadores_Gerais');

      // Rendimento por Classe
      const aoaClasses: any[][] = [
        [tituloInst],
        [filtroDesc],
        [],
        ['Classe', 'Matriculados', 'Avaliados', 'Aprovados', '% Aprovação', 'Média Geral']
      ];
      const cFirstR = 5;
      rendimentoPorClasse.forEach((c, idx) => {
        const rNum = cFirstR + idx;
        aoaClasses.push([
          c.classe,
          c.matriculados,
          c.avaliados,
          c.aprovados,
          { t: 'n', v: c.avaliados > 0 ? c.aprovados / c.avaliados : 0, f: `IF(C${rNum}>0,D${rNum}/C${rNum},0)`, z: '0.0%' },
          Number(c.mediaGeral) || 0
        ]);
      });
      if (rendimentoPorClasse.length > 0) {
        const cLastR = cFirstR + rendimentoPorClasse.length - 1;
        const cTotR = cLastR + 1;
        aoaClasses.push([
          'TOTAL / MÉDIA',
          { t: 'n', v: 0, f: `SUM(B${cFirstR}:B${cLastR})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(C${cFirstR}:C${cLastR})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(D${cFirstR}:D${cLastR})`, z: '0' },
          { t: 'n', v: 0, f: `IF(C${cTotR}>0,D${cTotR}/C${cTotR},0)`, z: '0.0%' },
          { t: 'n', v: 0, f: `IFERROR(ROUND(AVERAGE(F${cFirstR}:F${cLastR}),1),0)`, z: '0.0' }
        ]);
      }
      const wsClasses = XLSX.utils.aoa_to_sheet(aoaClasses);
      wsClasses['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 14 }];
      wsClasses['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }];
      XLSX.utils.book_append_sheet(wb, wsClasses, 'Rendimento_Por_Classe');

      // Rendimento por Disciplina
      const aoaDisciplinas: any[][] = [
        [tituloInst],
        [filtroDesc],
        [],
        ['Ordem', 'Disciplina', 'Código', 'Total Avaliados', 'Notas Positivas', 'Notas Negativas', '% Aproveitamento', 'Média da Disciplina']
      ];
      const dFirstR = 5;
      aproveitamentoDisciplinas.forEach((d, idx) => {
        const rNum = dFirstR + idx;
        aoaDisciplinas.push([
          d.disciplina.ordem ?? idx + 1,
          d.disciplina.nome,
          d.disciplina.codigo || '—',
          d.avaliados,
          d.positivas,
          { t: 'n', v: Math.max(0, d.avaliados - d.positivas), f: `MAX(0,D${rNum}-E${rNum})`, z: '0' },
          { t: 'n', v: d.avaliados > 0 ? d.positivas / d.avaliados : 0, f: `IF(D${rNum}>0,E${rNum}/D${rNum},0)`, z: '0.0%' },
          Number(d.media) || 0
        ]);
      });
      if (aproveitamentoDisciplinas.length > 0) {
        const dLastR = dFirstR + aproveitamentoDisciplinas.length - 1;
        const dTotR = dLastR + 1;
        aoaDisciplinas.push([
          '', 'TOTAL / MÉDIA GERAL', '',
          { t: 'n', v: 0, f: `SUM(D${dFirstR}:D${dLastR})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(E${dFirstR}:E${dLastR})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(F${dFirstR}:F${dLastR})`, z: '0' },
          { t: 'n', v: 0, f: `IF(D${dTotR}>0,E${dTotR}/D${dTotR},0)`, z: '0.0%' },
          { t: 'n', v: 0, f: `IFERROR(ROUND(AVERAGE(H${dFirstR}:H${dLastR}),1),0)`, z: '0.0' }
        ]);
      }
      const wsDisciplinas = XLSX.utils.aoa_to_sheet(aoaDisciplinas);
      wsDisciplinas['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
      wsDisciplinas['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
      XLSX.utils.book_append_sheet(wb, wsDisciplinas, 'Rendimento_Por_Disciplina');

      // Mapa Geral de Rendimento MED por Turma (com fórmulas)
      if (mapaRendimentoTurmas.length > 0) {
        const aoaMapa: any[][] = [
          [tituloInst],
          [filtroDesc],
          [],
          ['Nº', 'Escola', 'Turma', 'Classe', 'Curso', 'Turno', 'Matrícula Total', 'M', 'F', 'Desistentes', 'Avaliados', 'Aprovados', '% Aprovados', 'Não Transitam', '% Reprov.', 'Média', 'Regime']
        ];
        const mFirst = 5;
        mapaRendimentoTurmas.forEach((m, idx) => {
          const rNum = mFirst + idx;
          aoaMapa.push([
            idx + 1,
            m.escolaSigla,
            m.turma.nome,
            m.turma.classe,
            isSegundoCiclo(m.turma.classe) ? (m.turma.curso || '—') : '—',
            m.turma.turno || 'Manhã',
            m.matriculadosTotal,
            m.matriculadosM,
            m.matriculadosF,
            m.desistentesTotal,
            m.avaliadosTotal,
            m.aprovadosTotal,
            { t: 'n', v: m.avaliadosTotal > 0 ? m.aprovadosTotal / m.avaliadosTotal : 0, f: `IF(K${rNum}>0,L${rNum}/K${rNum},0)`, z: '0.0%' },
            m.reprovadosTotal,
            { t: 'n', v: m.avaliadosTotal > 0 ? m.reprovadosTotal / m.avaliadosTotal : 0, f: `IF(K${rNum}>0,N${rNum}/K${rNum},0)`, z: '0.0%' },
            m.mediaTurma !== '—' ? Number(m.mediaTurma) : '—',
            m.ehTerminal ? 'EXAME' : 'Transição'
          ]);
        });
        const mLast = mFirst + mapaRendimentoTurmas.length - 1;
        const mTot = mLast + 1;
        aoaMapa.push([
          '', 'TOTAL / GERAL', '', '', '', '',
          { t: 'n', v: 0, f: `SUM(G${mFirst}:G${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(H${mFirst}:H${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(I${mFirst}:I${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(J${mFirst}:J${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(K${mFirst}:K${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `SUM(L${mFirst}:L${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `IF(K${mTot}>0,L${mTot}/K${mTot},0)`, z: '0.0%' },
          { t: 'n', v: 0, f: `SUM(N${mFirst}:N${mLast})`, z: '0' },
          { t: 'n', v: 0, f: `IF(K${mTot}>0,N${mTot}/K${mTot},0)`, z: '0.0%' },
          { t: 'n', v: 0, f: `IFERROR(ROUND(AVERAGE(P${mFirst}:P${mLast}),1),0)`, z: '0.0' },
          ''
        ]);
        const wsMapa = XLSX.utils.aoa_to_sheet(aoaMapa);
        wsMapa['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 16 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } }];
        XLSX.utils.book_append_sheet(wb, wsMapa, 'Mapa_Rendimento_MED');
      }

      // Mapa de Assiduidade & Faltas
      if (dadosAssiduidadeTurmas.length > 0) {
        const aoaAssid: any[][] = [
          [tituloInst],
          [filtroDesc],
          [],
          ['Nº', 'Escola', 'Turma', 'Classe', 'Estudantes', 'Total Faltas', 'Média Faltas/Aluno', 'Em Risco (>=20 Faltas)', 'Taxa Frequência (%)']
        ];
        dadosAssiduidadeTurmas.forEach((a, idx) => {
          aoaAssid.push([
            idx + 1,
            a.escolaSigla,
            a.turma.nome,
            a.turma.classe,
            a.totalAlunos,
            a.totalFaltasTurma,
            Number(a.mediaFaltasPorAluno) || 0,
            a.alunosEmRiscoFaltas,
            `${a.taxaAssiduidadeEstimada}%`
          ]);
        });
        const wsAssid = XLSX.utils.aoa_to_sheet(aoaAssid);
        wsAssid['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
        XLSX.utils.book_append_sheet(wb, wsAssid, 'Mapa_Assiduidade');
      }

      // Carga Horária Docente
      if (distribuicaoCargaDocente.length > 0) {
        const aoaDoc: any[][] = [
          [tituloInst],
          [filtroDesc],
          [],
          ['Nº', 'Docente', 'Cargo', 'Disciplinas', 'Nº Turmas', 'Turmas Atribuídas', 'Tempos Semanais', 'Vínculo']
        ];
        distribuicaoCargaDocente.forEach((d, idx) => {
          aoaDoc.push([
            idx + 1,
            d.docente.nomeCompleto,
            d.docente.categoriaProfissional || 'Professor (MED)',
            d.disciplinas,
            d.turmasContagem,
            d.turmasNomes,
            d.temposSemanais,
            d.regime
          ]);
        });
        const wsDoc = XLSX.utils.aoa_to_sheet(aoaDoc);
        wsDoc['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
        XLSX.utils.book_append_sheet(wb, wsDoc, 'Carga_Horaria_Docente');
      }

      const prefixo = docenteAlvo
        ? `ESTATISTICAS_DOCENTE_${docenteAlvo.nomeCompleto.replace(/\s+/g, '_').toUpperCase()}`
        : isVisaoRedeTodas
          ? 'ESTATISTICAS_TODAS_ESCOLAS'
          : `ESTATISTICAS_ESCOLA_${escolaExibida.sigla || 'MED'}`;
      const fileName = `${prefixo}_${(filtroAno || 'GERAL').replace('/', '-')}_T${filtroTrimestre}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setStatsFeedback('Mapa estatístico completo exportado em Excel (.xlsx) com fórmulas ativas!');
      setTimeout(() => setStatsFeedback(null), 4000);
    } catch (e) {
      console.error('Erro na exportação de estatísticas:', e);
      setStatsFeedback('Erro ao exportar estatísticas para Excel.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* SELETOR DE ESCOPO PARA ADMIN GERAL (TODAS AS ESCOLAS OU ESCOLA ESPECÍFICA) */}
      {isAdminGeral && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                  Estatísticas da Rede Nacional — Angola ({escolas.length} Escolas)
                </span>
                <p className="text-xs text-purple-700">
                  {isVisaoRedeTodas
                    ? 'Resumo estatístico consolidado de todas as escolas, com comparativo automático sem sair do painel central:'
                    : `A analisar estatísticas detalhadas de "${escolaExibida.nomeOficial || escolaExibida.nome}":`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-purple-900 whitespace-nowrap">Âmbito:</span>
              <select
                value={escolaFiltroAdmin}
                onChange={e => handleSelecionarEscolaAdmin(e.target.value)}
                className="bg-white border-2 border-purple-300 rounded-xl px-3 py-1.5 text-xs font-black text-purple-950 focus:ring-2 focus:ring-purple-600 shadow-sm"
              >
                <option value="TODAS">Todas as Escolas ({escolas.length}) — Resumo Consolidado</option>
                {escolas.map(esc => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nomeOficial || esc.nome} ({esc.municipio || 'Angola'})
                  </option>
                ))}
              </select>
              {!isVisaoRedeTodas && (
                <button
                  type="button"
                  onClick={() => handleSelecionarEscolaAdmin('TODAS')}
                  className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap"
                >
                  Todas as Escolas
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BANNER CONTEXTUAL POR PAPEL DO USUÁRIO */}
      <div className="print:hidden space-y-3">
        {isDocenteEscopoRestrito ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-950 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-emerald-900">
                    {isProfessor ? 'Estatísticas do Docente:' : 'Estatísticas de Coordenação:'} {currentUser?.nomeCompleto}
                  </h3>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                    {currentUser?.cargo || currentUser?.categoriaProfissional || 'Docente'}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Instituição: <strong>{escola.nomeOficial || escola.nome}</strong> • Escopo estrito do seu perfil: <strong>{turmasPermitidas.length} turmas</strong> e <strong>{disciplinasPermitidas.length} disciplinas</strong> atribuídas.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-white/90 border border-emerald-300 rounded-xl text-[11px] font-black text-emerald-900 self-start md:self-center">
              Âmbito: Minhas Atribuições
            </span>
          </div>
        ) : (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-indigo-950 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-indigo-950">
                    {isVisaoRedeTodas
                      ? `Estatísticas Consolidadas: Rede Nacional (${escolas.length} Escolas)`
                      : `Estatísticas Gerais: ${escolaExibida.nomeOficial || escolaExibida.nome}`}
                  </h3>
                  <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                    {isVisaoRedeTodas ? 'Visão Global de Todas as Escolas' : (isCoordenadorPedagogico ? 'Coordenação Pedagógica Global' : 'Direcção da Escola')}
                  </span>
                </div>
                <p className="text-xs text-indigo-700 mt-0.5">
                  {docenteAlvo ? (
                    <span>A visualizar estatísticas detalhadas do(a) docente <strong>{docenteAlvo.nomeCompleto}</strong> ({turmasPermitidas.length} turmas • {disciplinasPermitidas.length} disciplinas).</span>
                  ) : isVisaoRedeTodas ? (
                    <span>Painel executivo unificado de todas as escolas ({escolas.length} escolas • {turmas.length} turmas • {alunos.length} estudantes • {funcionarios.length} colaboradores).</span>
                  ) : (
                    <span>Painel de Rendimento e Desempenho Global da Instituição ({turmas.length} turmas • {alunos.length} estudantes).</span>
                  )}
                </p>
              </div>
            </div>

            {/* SELETOR DE PROFESSOR PARA A DIREÇÃO / COORDENAÇÃO PEDAGÓGICA */}
            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-indigo-200 shadow-xs">
              <Users className="w-4 h-4 text-indigo-600" />
              <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Auditar Docente:</label>
              <select
                value={filtroDocenteId}
                onChange={e => {
                  setFiltroDocenteId(e.target.value);
                  setFiltroTurmaId('TODAS');
                  setFiltroDisciplinaId('TODAS');
                }}
                className="bg-indigo-50/50 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 max-w-xs"
              >
                <option value="TODOS">Todos os Professores ({isVisaoRedeTodas ? 'Rede Completa' : 'Escola Completa'})</option>
                {listaDocentes.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nomeCompleto}{isVisaoRedeTodas ? ` [${escolasMap.get(d.escolaId)?.sigla || 'MED'}]` : ''} — {d.especialidade || d.categoriaProfissional || 'Professor'}
                  </option>
                ))}
              </select>
              {filtroDocenteId !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroDocenteId('TODOS');
                    setFiltroTurmaId('TODAS');
                    setFiltroDisciplinaId('TODAS');
                  }}
                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-bold transition-all"
                  title="Voltar às Estatísticas Gerais"
                >
                  ✕ Geral
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CABEÇALHO DO MÓDULO E FILTROS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  {docenteAlvo
                    ? `Estatísticas: ${docenteAlvo.nomeCompleto}`
                    : isVisaoRedeTodas
                      ? 'Estatísticas Consolidadas de Todas as Escolas'
                      : 'Estatísticas & Rendimento Escolar'}
                </h1>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {isVisaoRedeTodas ? `${escolas.length} ESCOLAS` : (escolaExibida.sigla || 'MED')}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {docenteAlvo
                  ? 'Diagnóstico analítico do rendimento dos estudantes nas turmas e disciplinas sob a sua lecionação.'
                  : isVisaoRedeTodas
                    ? 'Resumo estatístico global da rede e comparativo automático de todas as instituições sem precisar entrar em cada escola.'
                    : 'Painel executivo com métricas de transição, distribuição de notas, aproveitamento por disciplina e ranking de turmas.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Folha:</span>
              <select
                value={orientacaoPdf}
                onChange={(e) => setOrientacaoPdf(e.target.value as 'portrait' | 'landscape')}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                title="Orientação da folha A4 para PDF e impressão"
              >
                <option value="portrait">Retrato (A4 Vertical)</option>
                <option value="landscape">Paisagem (A4 Horizontal)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleExportarExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleBaixarPdf}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'A Gerar PDF...' : 'Baixar PDF (.pdf)'}</span>
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Painel (A4)</span>
            </button>
          </div>
        </div>

        {statsFeedback && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
            <span>{statsFeedback}</span>
            <button type="button" onClick={() => setStatsFeedback(null)} className="text-emerald-700 hover:text-emerald-950 font-black px-1">×</button>
          </div>
        )}

        {/* BARRA DE FILTROS INTERATIVOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ano Letivo</span>
            </label>
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {isAdminGeral && <option value="TODOS">Todos os Anos Letivos</option>}
              {anosConfigs.length > 0 ? (
                anosConfigs.map(a => (
                  <option key={a.id} value={a.rotulo || a.ano}>{a.rotulo || a.ano}</option>
                ))
              ) : escolaExibida.anoLectivoActivo ? (
                <option value={escolaExibida.anoLectivoActivo}>{escolaExibida.anoLectivoActivo}</option>
              ) : !isAdminGeral ? (
                <option value="">Sem ano letivo registado</option>
              ) : null}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Trimestre</span>
            </label>
            <select
              value={filtroTrimestre}
              onChange={e => setFiltroTrimestre(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1">Iº Trimestre</option>
              <option value="2">IIº Trimestre</option>
              <option value="3">IIIº Trimestre</option>
              <option value="anual">Consolidado Anual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ciclo</span>
            </label>
            <select
              value={filtroCiclo}
              onChange={e => setFiltroCiclo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Ciclos</option>
              <option value="Primário">Ensino Primário</option>
              <option value="Iº Ciclo">Iº Ciclo Secundário</option>
              <option value="IIº Ciclo">IIº Ciclo / Médio Técnico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Turno</span>
            </label>
            <select
              value={filtroTurno}
              onChange={e => setFiltroTurno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Turnos</option>
              {turnosDisponiveis.map(tr => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </select>
          </div>

          {exibirFiltroCurso && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Curso (IIº Ciclo)</span>
              </label>
              <select
                value={filtroCurso}
                onChange={e => setFiltroCurso(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TODOS">Todos os Cursos ({cursosDisponiveis.length})</option>
                {cursosDisponiveis.map(cur => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Classe</span>
            </label>
            <select
              value={filtroClasse}
              onChange={e => {
                setFiltroClasse(e.target.value);
                setFiltroTurmaId('TODAS');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">Todas as Classes ({classesDisponiveis.length})</option>
              {classesDisponiveis.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sala</span>
            </label>
            <select
              value={filtroSala}
              onChange={e => {
                setFiltroSala(e.target.value);
                setFiltroTurmaId('TODAS');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">Todas as Salas ({salasDisponiveis.length})</option>
              {salasDisponiveis.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Turma</span>
            </label>
            <select
              value={filtroTurmaId}
              onChange={e => setFiltroTurmaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">
                {docenteAlvo ? `Turmas do Docente (${turmasFiltradas.length})` : `Todas as Turmas (${turmasFiltradas.length})`}
              </option>
              {turmasFiltradas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.classe})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Disciplina</span>
            </label>
            <select
              value={filtroDisciplinaId}
              onChange={e => setFiltroDisciplinaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">Todas as Disciplinas ({disciplinasPermitidas.length})</option>
              {disciplinasPermitidas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SUB-ABAS DOS MAPAS ESTATÍSTICOS COMPLETOS */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSubAbaAtiva('visao_geral')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              subAbaAtiva === 'visao_geral'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Painel Analítico & Indicadores</span>
          </button>

          {isAdminGeral && (
            <button
              type="button"
              onClick={() => {
                if (!isVisaoRedeTodas) handleSelecionarEscolaAdmin('TODAS');
                setSubAbaAtiva('resumo_rede');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                subAbaAtiva === 'resumo_rede'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Resumo Consolidado por Escola ({escolas.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubAbaAtiva('mapa_rendimento')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              subAbaAtiva === 'mapa_rendimento'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'Mapa de Rendimento das Minhas Turmas' : 'Mapa Geral de Rendimento MED'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAbaAtiva('rendimento_disciplina')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              subAbaAtiva === 'rendimento_disciplina'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'Rendimento das Minhas Disciplinas' : 'Rendimento Curricular por Disciplina'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAbaAtiva('assiduidade_faltas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              subAbaAtiva === 'assiduidade_faltas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mapa de Assiduidade & Faltas</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAbaAtiva('carga_horaria')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              subAbaAtiva === 'carga_horaria'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'Minha Carga Horária Docente' : 'Carga Horária & Quadro Docente'}</span>
          </button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL ESTATÍSTICO FORMATADO PARA PDF E IMPRESSÃO */}
      <div
        id="estatisticas-painel-oficial-doc"
        data-doc-root="true"
        className="documento-oficial-print bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none"
      >
        {/* CABEÇALHO INSTITUCIONAL OFICIAL MED ANGOLA */}
        <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
          <div className="flex justify-center mb-1.5">
            {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
              <img
                src={configSistema.insigniaNacionalUrl}
                alt="Insígnia da República de Angola"
                className="h-14 w-14 object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : (
              <InsigniaAngola size={52} />
            )}
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-900">REPÚBLICA DE ANGOLA</p>
          <p className="text-[11px] font-bold uppercase text-slate-800">
            {isVisaoRedeTodas
              ? 'ADMINISTRAÇÃO CENTRAL DA REDE ESCOLAR'
              : (escolaExibida.governoProvincial || `GOVERNO PROVINCIAL DE ${(escolaExibida.provincia || 'ANGOLA').toUpperCase()}`)}
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-700">
            {isVisaoRedeTodas
              ? `SUPERVISÃO GLOBAL DE ESCOLAS (${escolas.length} INSTITUIÇÕES)`
              : (escolaExibida.gabineteEducacao || `ADMINISTRAÇÃO MUNICIPAL DE ${(escolaExibida.municipio || 'ANGOLA').toUpperCase()}`)}
          </p>
          <h2 className="text-base sm:text-lg font-black uppercase text-slate-950 pt-0.5">
            {isVisaoRedeTodas
              ? 'MAPA ESTATÍSTICO CONSOLIDADO DE TODAS AS ESCOLAS'
              : (escolaExibida.nomeOficial || escolaExibida.nome)}
          </h2>
          <div className="pt-1.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-700">
            <span className="bg-slate-100 border border-slate-300 px-3 py-0.5 rounded">
              {docenteAlvo
                ? `ESTATÍSTICAS DO DOCENTE: ${docenteAlvo.nomeCompleto.toUpperCase()}`
                : 'ESTATÍSTICAS DE RENDIMENTO E APROVEITAMENTO ESCOLAR'}
            </span>
            <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-0.5 rounded">
              Ano Lectivo: {filtroAno && filtroAno !== 'TODOS' ? filtroAno : 'Todos'} • {filtroTrimestre === 'anual' ? 'Consolidado Anual' : `${filtroTrimestre}º Trimestre`}
            </span>
            {filtroClasse !== 'TODAS' && (
              <span className="bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded">Classe: {filtroClasse}</span>
            )}
            {filtroTurno !== 'TODOS' && (
              <span className="bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded">Turno: {filtroTurno}</span>
            )}
          </div>
        </div>

      {/* PAINEL DE INDICADORES PRINCIPAIS (KPIs) — VISÃO GERAL */}
      {subAbaAtiva === 'visao_geral' && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Taxa de Transição */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {docenteAlvo ? 'Aproveitamento das Turmas do Docente' : 'Taxa de Aproveitamento Geral'}
            </span>
            <div className={`p-2 rounded-xl ${parseFloat(metricasGlobais.taxaAprovacao) >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-800">{metricasGlobais.taxaAprovacao}%</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Positivo</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metricasGlobais.totalAprovados} de {metricasGlobais.totalAvaliados} avaliados
          </p>
        </div>

        {/* KPI 2: Média */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {docenteAlvo ? 'Média das Disciplinas do Docente' : 'Média Geral Institucional'}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-blue-900">{metricasGlobais.mediaGeralEscola}</span>
            <span className="text-xs font-bold text-slate-500">Valores (0-20)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {Number(metricasGlobais.mediaGeralEscola) >= 14 ? 'Excelente Desempenho' : Number(metricasGlobais.mediaGeralEscola) >= 10 ? 'Rendimento Estável' : 'Requer Reforço'}
          </p>
        </div>

        {/* KPI 3: Cobertura de Avaliação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {docenteAlvo ? 'Alunos Sob Sua Docência' : 'Estudantes Matriculados'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-800">{metricasGlobais.totalMatriculados}</span>
            <span className="text-xs font-bold text-indigo-600">
              {metricasGlobais.totalAvaliados} com notas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            M: {metricasGlobais.matriculadosM} • F: {metricasGlobais.matriculadosF}
          </p>
        </div>

        {/* KPI 4: Retenção e Abandono */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Taxa de Abandono</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-900">{metricasGlobais.taxaAbandono}%</span>
            <span className="text-xs font-bold text-slate-500">{metricasGlobais.desistentes} desistentes</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {docenteAlvo ? 'Desistências nas turmas do docente' : 'Estudantes em evasão escolar'}
          </p>
        </div>
      </div>

      {/* ESTATÍSTICAS COMPARATIVAS POR ESCOLA (VISÃO CONSOLIDADA DO ADMINISTRADOR GERAL) */}
      {isAdminGeral && isVisaoRedeTodas && (
        <div className="bg-white rounded-2xl p-6 border border-purple-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-purple-700" />
                <span>Resumo Estatístico por Escola — Rede Nacional ({escolas.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visão consolidada de todas as escolas cadastradas sem necessidade de entrar individualmente em cada escola.
              </p>
            </div>
            <span className="text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200 self-start sm:self-auto">
              {escolas.filter(e => e.ativo !== false && e.estadoEscola !== 'Suspensa').length} Ativas • {escolas.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 font-bold text-slate-700 text-center text-[11px]">
                <tr>
                  <th className="p-2.5 border-r border-slate-200 w-10">Nº</th>
                  <th className="p-2.5 border-r border-slate-200 text-left">ESCOLA / LOCALIDADE</th>
                  <th className="p-2.5 border-r border-slate-200 text-left">DIRETOR GERAL</th>
                  <th className="p-2.5 border-r border-slate-200 w-20">ANO</th>
                  <th className="p-2.5 border-r border-slate-200 w-16">TURMAS</th>
                  <th className="p-2.5 border-r border-slate-200 w-20">PROF.</th>
                  <th className="p-2.5 border-r border-slate-200 w-24">ALUNOS (M/F)</th>
                  <th className="p-2.5 border-r border-slate-200 w-32">% APROVAÇÃO</th>
                  <th className="p-2.5 border-r border-slate-200 w-16">MÉDIA</th>
                  <th className="p-2.5 border-r border-slate-200 w-20">ASSID.</th>
                  <th className="p-2.5 w-24 print:hidden">DETALHAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-center">
                {resumoPorEscola.length > 0 ? (
                  resumoPorEscola.map((r, idx) => {
                    const suspensa = r.escola.ativo === false || r.escola.estadoEscola === 'Suspensa';
                    return (
                      <tr key={r.escola.id} className="hover:bg-purple-50/40">
                        <td className="p-2 border-r border-slate-100 text-slate-600">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-100 text-left font-sans">
                          <div className="font-bold text-slate-900">
                            {r.escola.nomeOficial || r.escola.nome}
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-black">{r.escola.sigla || 'ESC'}</span>
                            {suspensa && <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black">Suspensa</span>}
                          </div>
                          <div className="text-[10px] text-slate-500">{r.escola.municipio || '—'}, {r.escola.provincia || 'Angola'}</div>
                        </td>
                        <td className="p-2 border-r border-slate-100 text-left font-sans">
                          <span className={r.temDiretor ? 'font-semibold text-slate-800' : 'text-amber-700 italic font-semibold'}>
                            {r.diretorNome}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-100 text-[11px]">{r.escola.anoLectivoActivo || '—'}</td>
                        <td className="p-2 border-r border-slate-100 font-bold">{r.turmasCount}</td>
                        <td className="p-2 border-r border-slate-100 font-bold">{r.professoresCount}</td>
                        <td className="p-2 border-r border-slate-100">
                          <span className="font-bold text-slate-800">{r.totalMatriculados}</span>
                          <span className="text-[10px] text-slate-500 block">({r.matriculadosM}M / {r.matriculadosF}F)</span>
                        </td>
                        <td className="p-2 border-r border-slate-100">
                          <div className="flex items-center justify-between text-[11px] font-black text-slate-800 mb-1">
                            <span>{r.taxaAprovacao}%</span>
                            <span className="text-[10px] font-normal text-slate-500">{r.aprovados}/{r.avaliados}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.taxaAprovacao >= 75 ? 'bg-emerald-600' : r.taxaAprovacao >= 50 ? 'bg-blue-600' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, Math.max(4, r.taxaAprovacao))}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-100 font-black text-indigo-900">{r.mediaGeral}</td>
                        <td className="p-2 border-r border-slate-100 font-bold text-emerald-800">{r.assiduidadePct}</td>
                        <td className="p-2 font-sans print:hidden">
                          <button
                            type="button"
                            onClick={() => handleSelecionarEscolaAdmin(r.escola.id)}
                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[10px] font-bold transition-colors"
                          >
                            Analisar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="p-6 text-center font-sans text-slate-500 italic">
                      Nenhuma escola registada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDIMENTO POR CURSO & ÁREA DE FORMAÇÃO */}
      {rendimentoPorCurso.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <span>Aproveitamento por Curso &amp; Área de Formação</span>
            </h2>
            <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              {rendimentoPorCurso.length} cursos / áreas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 font-bold text-slate-700 text-[11px]">
                <tr>
                  <th className="p-2.5 border-r border-slate-200">Curso / Especialidade</th>
                  <th className="p-2.5 border-r border-slate-200">Área de Formação</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">Turmas</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">Matriculados</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">Avaliados</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">Aprovados</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">% Aprovação</th>
                  <th className="p-2.5 text-center">Média Geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rendimentoPorCurso.map((rc) => (
                  <tr key={rc.curso} className="hover:bg-purple-50/30">
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-900">{rc.curso}</td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-600 font-medium">{rc.area}</td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-mono font-bold">{rc.turmasCount}</td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-mono">{rc.matriculados}</td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-mono">{rc.avaliados}</td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-mono font-bold text-emerald-700">{rc.aprovados}</td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-mono font-black text-indigo-900">{rc.taxaAprovacao}%</td>
                    <td className="p-2.5 text-center font-mono font-black text-blue-900">{rc.mediaGeral}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISTRIBUIÇÃO QUALITATIVA DE NOTAS (MED ANGOLA) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-indigo-600" />
          <span>
            {docenteAlvo 
              ? `Distribuição Qualitativa nas Disciplinas do Docente (${docenteAlvo.nomeCompleto})` 
              : 'Distribuição de Rendimento por Escala Qualitativa Oficial'}
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Distribuição dos estudantes por escala qualitativa de avaliação das aprendizagens.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          {/* Excelente */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-800">Excelente (18 a 20)</span>
              <span className="text-xs font-bold text-emerald-600">{metricasGlobais.distribuicaoNiveis.excelente.pct}%</span>
            </div>
            <p className="text-2xl font-black text-emerald-900">{metricasGlobais.distribuicaoNiveis.excelente.count}</p>
            <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.excelente.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold block">Quadro de Honra / Destaque</span>
          </div>

          {/* Bom */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-800">Bom (14 a 17)</span>
              <span className="text-xs font-bold text-blue-600">{metricasGlobais.distribuicaoNiveis.bom.pct}%</span>
            </div>
            <p className="text-2xl font-black text-blue-900">{metricasGlobais.distribuicaoNiveis.bom.count}</p>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.bom.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-blue-700 font-semibold block">Aproveitamento Satisfatório Forte</span>
          </div>

          {/* Suficiente */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-800">Suficiente (10 a 13)</span>
              <span className="text-xs font-bold text-amber-600">{metricasGlobais.distribuicaoNiveis.suficiente.pct}%</span>
            </div>
            <p className="text-2xl font-black text-amber-900">{metricasGlobais.distribuicaoNiveis.suficiente.count}</p>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.suficiente.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-amber-700 font-semibold block">Transição / Limiar de Aprovação</span>
          </div>

          {/* Insuficiente */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-800">Insuficiente (0 a 9)</span>
              <span className="text-xs font-bold text-rose-600">{metricasGlobais.distribuicaoNiveis.insuficiente.pct}%</span>
            </div>
            <p className="text-2xl font-black text-rose-900">{metricasGlobais.distribuicaoNiveis.insuficiente.count}</p>
            <div className="w-full bg-rose-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-rose-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.insuficiente.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-rose-700 font-semibold block">Não Transita / Recuperação</span>
          </div>
        </div>
      </div>

      {/* RENDIMENTO COMPARATIVO POR CLASSE E RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimento por Classe */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>
              {docenteAlvo 
                ? 'Aproveitamento nas Classes sob Docência' 
                : 'Aproveitamento Comparativo por Classe'}
            </span>
          </h2>
          
          <div className="space-y-3 pt-2">
            {rendimentoPorClasse.length > 0 ? (
              rendimentoPorClasse.map(c => (
                <div key={c.classe} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">{c.classe}</span>
                    <span className="text-slate-600">
                      {c.taxaAprovacao}% de sucesso • Média: {c.mediaGeral} ({c.avaliados} alunos)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        c.taxaAprovacao >= 75 ? 'bg-emerald-600' :
                        c.taxaAprovacao >= 50 ? 'bg-blue-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, c.taxaAprovacao))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Sem dados para as classes selecionadas.</p>
            )}
          </div>
        </div>

        {/* RANKING DE TURMAS: DESTAQUE VS ATENÇÃO */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span>
              {docenteAlvo 
                ? 'Desempenho Comparativo Entre as Turmas do Docente' 
                : 'Ranking de Turmas & Diagnóstico Pedagógico'}
            </span>
          </h2>

          <div className="space-y-4 pt-1">
            <div>
              <span className="text-xs font-black uppercase text-emerald-800 flex items-center space-x-1 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Turmas de Maior Rendimento</span>
              </span>
              <div className="space-y-1.5">
                {rankingTurmas.topTurmas.map((item, idx) => (
                  <div key={item.turma.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      {isVisaoRedeTodas && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[9px] font-black">
                          {escolasMap.get(item.turma.escolaId)?.sigla || 'ESC'}
                        </span>
                      )}
                      <span className="font-bold text-slate-800">{item.turma.nome}</span>
                      <span className="text-slate-500 text-[10px]">({item.turma.classe})</span>
                    </div>
                    <span className="font-mono font-black text-emerald-800">
                      {item.taxaAprovacao}% • Média: {item.mediaTurma}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-black uppercase text-rose-800 flex items-center space-x-1 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Turmas com Necessidade de Reforço Pedagógico</span>
              </span>
              <div className="space-y-1.5">
                {rankingTurmas.atencaoTurmas.map((item, idx) => (
                  <div key={item.turma.id} className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-xs font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      {isVisaoRedeTodas && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[9px] font-black">
                          {escolasMap.get(item.turma.escolaId)?.sigla || 'ESC'}
                        </span>
                      )}
                      <span className="font-bold text-slate-800">{item.turma.nome}</span>
                      <span className="text-slate-500 text-[10px]">({item.turma.classe})</span>
                    </div>
                    <span className="font-mono font-black text-rose-800">
                      {item.taxaAprovacao}% • Média: {item.mediaTurma}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* APROVEITAMENTO POR DISCIPLINA (ORDEM CADASTRADA) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>
                {docenteAlvo 
                  ? 'Aproveitamento das Disciplinas sob Lecionação' 
                  : 'Aproveitamento Curricular por Disciplina'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Disciplinas dispostas na sequência estrita definida na grelha curricular oficial.
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            {aproveitamentoDisciplinas.length} Disciplinas
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 font-bold text-slate-700 text-center text-[11px]">
              <tr>
                <th className="p-3 border-r border-slate-200 w-12">ORD.</th>
                <th className="p-3 border-r border-slate-200 text-left">DISCIPLINA</th>
                <th className="p-3 border-r border-slate-200 w-24">CÓDIGO</th>
                <th className="p-3 border-r border-slate-200 w-28">AVALIADOS</th>
                <th className="p-3 border-r border-slate-200 w-28 text-emerald-700">POSITIVAS (≥10)</th>
                <th className="p-3 border-r border-slate-200 w-32">% SUCESSO</th>
                <th className="p-3 border-r border-slate-200 w-24">MÉDIA</th>
                <th className="p-3 w-40 text-left">DIAGNÓSTICO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-center">
              {aproveitamentoDisciplinas.length > 0 ? (
                aproveitamentoDisciplinas.map((item, idx) => (
                  <tr key={item.disciplina.id} className="hover:bg-slate-50">
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-600">
                      {item.disciplina.ordem ?? idx + 1}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-left font-sans font-bold uppercase text-slate-800">
                      {item.disciplina.nome}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-500 font-sans">
                      {item.disciplina.codigo || '—'}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-700">
                      {item.avaliados}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-emerald-700">
                      {item.positivas}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-black text-indigo-900">
                      {item.taxa}%
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-black bg-slate-50">
                      {item.media}
                    </td>
                    <td className="p-2.5 text-left font-sans text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.taxa >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        item.taxa >= 60 ? 'bg-blue-100 text-blue-800' :
                        item.taxa >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.taxa >= 80 ? 'Alto Aproveitamento' :
                         item.taxa >= 60 ? 'Rendimento Estável' :
                         item.taxa >= 50 ? 'Atenção / Regular' : 'Apoio Prioritário'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center font-sans text-slate-500 italic">
                    Nenhuma nota registada para o conjunto de filtros atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* SUB-ABA: RESUMO CONSOLIDADO POR ESCOLA (EXCLUSIVO ADMIN GERAL) */}
      {subAbaAtiva === 'resumo_rede' && isAdminGeral && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
              <thead className="bg-slate-100 font-bold text-center text-[10px]">
                <tr>
                  <th className="p-2 border-r border-black w-8">Nº</th>
                  <th className="p-2 border-r border-black text-left">ESCOLA / PROVÍNCIA</th>
                  <th className="p-2 border-r border-black text-left">DIRETOR GERAL</th>
                  <th className="p-2 border-r border-black w-20">ANO ATIVO</th>
                  <th className="p-2 border-r border-black w-16">TURMAS</th>
                  <th className="p-2 border-r border-black w-16">DOCENTES</th>
                  <th className="p-2 border-r border-black w-24 bg-slate-200">MATRÍCULA (M/F)</th>
                  <th className="p-2 border-r border-black w-16 bg-blue-50">AVAL.</th>
                  <th className="p-2 border-r border-black w-20 bg-emerald-50">% APROV.</th>
                  <th className="p-2 border-r border-black w-14">MÉDIA</th>
                  <th className="p-2 border-r border-black w-16">ASSID.</th>
                  <th className="p-2 w-24 print:hidden">AÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono text-center">
                {resumoPorEscola.length > 0 ? (
                  resumoPorEscola.map((r, idx) => {
                    const suspensa = r.escola.ativo === false || r.escola.estadoEscola === 'Suspensa';
                    return (
                      <tr key={r.escola.id} className="hover:bg-slate-50">
                        <td className="p-1.5 border-r border-black">{idx + 1}</td>
                        <td className="p-1.5 border-r border-black text-left font-sans">
                          <div className="font-bold text-slate-900">
                            {r.escola.nomeOficial || r.escola.nome}
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-black">{r.escola.sigla || 'ESC'}</span>
                            {suspensa && <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-black">SUSPENSA</span>}
                          </div>
                          <div className="text-[10px] text-slate-500">{r.escola.municipio || '—'}, {r.escola.provincia || 'Angola'}</div>
                        </td>
                        <td className="p-1.5 border-r border-black text-left font-sans">
                          <span className={r.temDiretor ? 'font-semibold text-slate-800' : 'text-amber-700 italic font-semibold'}>
                            {r.diretorNome}
                          </span>
                        </td>
                        <td className="p-1.5 border-r border-black text-[10px]">{r.escola.anoLectivoActivo || '—'}</td>
                        <td className="p-1.5 border-r border-black font-bold">{r.turmasCount}</td>
                        <td className="p-1.5 border-r border-black font-bold">{r.professoresCount}</td>
                        <td className="p-1.5 border-r border-black bg-slate-50">
                          <span className="font-bold">{r.totalMatriculados}</span>
                          <span className="text-[9px] text-slate-500 block">({r.matriculadosM}M / {r.matriculadosF}F)</span>
                        </td>
                        <td className="p-1.5 border-r border-black bg-blue-50/40 font-bold">{r.avaliados}</td>
                        <td className="p-1.5 border-r border-black bg-emerald-50/40 font-black text-emerald-800">{r.taxaAprovacao}%</td>
                        <td className="p-1.5 border-r border-black font-black">{r.mediaGeral}</td>
                        <td className="p-1.5 border-r border-black font-semibold text-indigo-800">{r.assiduidadePct}</td>
                        <td className="p-1.5 font-sans print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelecionarEscolaAdmin(r.escola.id);
                              setSubAbaAtiva('mapa_rendimento');
                            }}
                            className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Detalhar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="p-6 text-center font-sans text-slate-500 italic">
                      Nenhuma escola registada na rede nacional.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-200 font-bold text-center border-t-2 border-black font-mono">
                <tr>
                  <td colSpan={4} className="p-2 border-r border-black text-right font-sans uppercase">
                    TOTAIS CONSOLIDADOS DA REDE ({escolas.length} ESCOLAS):
                  </td>
                  <td className="p-1.5 border-r border-black">{resumoPorEscola.reduce((s, r) => s + r.turmasCount, 0)}</td>
                  <td className="p-1.5 border-r border-black">{resumoPorEscola.reduce((s, r) => s + r.professoresCount, 0)}</td>
                  <td className="p-1.5 border-r border-black">{resumoPorEscola.reduce((s, r) => s + r.totalMatriculados, 0)}</td>
                  <td className="p-1.5 border-r border-black text-blue-900">{resumoPorEscola.reduce((s, r) => s + r.avaliados, 0)}</td>
                  <td className="p-1.5 border-r border-black text-emerald-900">{totaisGeraisMapa.taxaGeral}%</td>
                  <td colSpan={2} className="p-1.5 border-r border-black font-sans text-[10px]">Consolidado Geral</td>
                  <td className="p-1.5 print:hidden">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA: MAPA OFICIAL GERAL DE RENDIMENTO MED */}
      {subAbaAtiva === 'mapa_rendimento' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-500 uppercase">
                {isProfessor ? 'Matrícula das Suas Turmas' : 'Matrícula Total'}
              </span>
              <p className="text-2xl font-black text-slate-800">{totaisGeraisMapa.matriculados}</p>
              <span className="text-[10px] text-slate-400">Estudantes</span>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-xs font-bold text-blue-600 uppercase">Avaliados</span>
              <p className="text-2xl font-black text-blue-900">{totaisGeraisMapa.avaliados}</p>
              <span className="text-[10px] text-blue-600">Alunos no Mapa</span>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-bold text-emerald-600 uppercase">Aprovados / Apto</span>
              <p className="text-2xl font-black text-emerald-900">{totaisGeraisMapa.aprovados}</p>
              <span className="text-[10px] text-emerald-600 font-bold">{totaisGeraisMapa.taxaGeral}% de Sucesso</span>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-xs font-bold text-rose-600 uppercase">Não Transitam</span>
              <p className="text-2xl font-black text-rose-900">{totaisGeraisMapa.reprovados}</p>
              <span className="text-[10px] text-rose-600">Necessitam de Apoio</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {(() => {
              const mostrarColunaCursoMapa = mapaRendimentoTurmas.some(m => isSegundoCiclo(m.turma.classe));
              return (
            <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
              <thead className="bg-slate-100 font-bold text-center text-[10px]">
                <tr>
                  <th rowSpan={2} className="p-2 border-r border-black w-8">Nº</th>
                  <th rowSpan={2} className="p-2 border-r border-black text-left">TURMA / CLASSE</th>
                  {mostrarColunaCursoMapa && (
                    <th rowSpan={2} className="p-2 border-r border-black text-left">CURSO (IIº CICLO)</th>
                  )}
                  <th colSpan={3} className="p-1 border-r border-black bg-slate-200">MATRÍCULA INICIAL</th>
                  <th rowSpan={2} className="p-2 border-r border-black w-14">DESIST.</th>
                  <th colSpan={3} className="p-1 border-r border-black bg-blue-50">AVALIADOS</th>
                  <th colSpan={3} className="p-1 border-r border-black bg-emerald-50">APROVADOS (APTO)</th>
                  <th colSpan={2} className="p-1 border-r border-black bg-rose-50">NÃO TRANSITAM</th>
                  <th rowSpan={2} className="p-2 border-r border-black w-14">MÉDIA</th>
                  <th rowSpan={2} className="p-2 w-16">EXAME</th>
                </tr>
                <tr className="bg-slate-50 text-[9px]">
                  <th className="p-1 border-r border-black w-8">MF</th>
                  <th className="p-1 border-r border-black w-8">M</th>
                  <th className="p-1 border-r border-black w-8">F</th>
                  <th className="p-1 border-r border-black w-8 bg-blue-50">MF</th>
                  <th className="p-1 border-r border-black w-8 bg-blue-50">M</th>
                  <th className="p-1 border-r border-black w-8 bg-blue-50">F</th>
                  <th className="p-1 border-r border-black w-8 bg-emerald-50">MF</th>
                  <th className="p-1 border-r border-black w-8 bg-emerald-50">%</th>
                  <th className="p-1 border-r border-black w-8 bg-emerald-50">F</th>
                  <th className="p-1 border-r border-black w-8 bg-rose-50">MF</th>
                  <th className="p-1 border-r border-black w-8 bg-rose-50">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono">
                {mapaRendimentoTurmas.length > 0 ? (
                  mapaRendimentoTurmas.map((item, idx) => (
                    <tr key={item.turma.id} className="hover:bg-slate-50 text-center">
                      <td className="p-1.5 border-r border-black">{idx + 1}</td>
                      <td className="p-1.5 border-r border-black text-left font-sans font-bold uppercase">
                        {isVisaoRedeTodas && (
                          <span className="mr-1.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[9px] font-black">{item.escolaSigla}</span>
                        )}
                        {item.turma.nome}
                      </td>
                      {mostrarColunaCursoMapa && (
                        <td className="p-1.5 border-r border-black text-left font-sans text-[10px] whitespace-normal break-words min-w-[100px] max-w-[180px]">
                          {isSegundoCiclo(item.turma.classe) ? (item.turma.curso || '—') : '—'}
                        </td>
                      )}
                      <td className="p-1 border-r border-black font-bold">{item.matriculadosTotal}</td>
                      <td className="p-1 border-r border-black text-slate-600">{item.matriculadosM}</td>
                      <td className="p-1 border-r border-black text-slate-600">{item.matriculadosF}</td>
                      <td className="p-1 border-r border-black text-rose-700">{item.desistentesTotal}</td>
                      <td className="p-1 border-r border-black font-bold bg-blue-50/50">{item.avaliadosTotal}</td>
                      <td className="p-1 border-r border-black bg-blue-50/50 text-slate-600">{item.avaliadosM}</td>
                      <td className="p-1 border-r border-black bg-blue-50/50 text-slate-600">{item.avaliadosF}</td>
                      <td className="p-1 border-r border-black font-bold text-emerald-800 bg-emerald-50/50">{item.aprovadosTotal}</td>
                      <td className="p-1 border-r border-black font-bold text-emerald-800 bg-emerald-50/50">{item.percAprovados}%</td>
                      <td className="p-1 border-r border-black bg-emerald-50/50 text-slate-600">{item.aprovadosF}</td>
                      <td className="p-1 border-r border-black font-bold text-rose-800 bg-rose-50/50">{item.reprovadosTotal}</td>
                      <td className="p-1 border-r border-black bg-rose-50/50 text-rose-800">{item.percReprovados}%</td>
                      <td className="p-1 border-r border-black font-black bg-slate-100">{item.mediaTurma}</td>
                      <td className="p-1 font-sans text-[9px] font-bold">
                        {item.ehTerminal ? (
                          <span className="text-amber-800 font-black">EXAME</span>
                        ) : (
                          <span className="text-slate-400">Transição</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={mostrarColunaCursoMapa ? 17 : 16} className="p-6 text-center font-sans text-slate-500 italic">
                      Nenhuma turma localizada para os critérios de filtro selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-200 font-bold text-center border-t-2 border-black font-mono">
                <tr>
                  <td colSpan={mostrarColunaCursoMapa ? 3 : 2} className="p-2 border-r border-black text-right font-sans uppercase">
                    {docenteAlvo ? 'TOTAIS DO DOCENTE:' : 'TOTAIS CONSOLIDADOS:'}
                  </td>
                  <td className="p-1 border-r border-black">{totaisGeraisMapa.matriculados}</td>
                  <td colSpan={2} className="p-1 border-r border-black text-[10px] font-sans">—</td>
                  <td className="p-1 border-r border-black text-rose-800">
                    {mapaRendimentoTurmas.reduce((acc, i) => acc + i.desistentesTotal, 0)}
                  </td>
                  <td className="p-1 border-r border-black font-black text-blue-900">{totaisGeraisMapa.avaliados}</td>
                  <td colSpan={2} className="p-1 border-r border-black text-[10px] font-sans">—</td>
                  <td className="p-1 border-r border-black font-black text-emerald-900">{totaisGeraisMapa.aprovados}</td>
                  <td className="p-1 border-r border-black font-black text-emerald-900">{totaisGeraisMapa.taxaGeral}%</td>
                  <td colSpan={2} className="p-1 border-r border-black text-[10px] font-sans">—</td>
                  <td className="p-1 border-r border-black font-black text-rose-900">{totaisGeraisMapa.reprovados}</td>
                  <td colSpan={2} className="p-1 font-sans text-[10px] text-slate-700">Consolidado</td>
                </tr>
              </tfoot>
            </table>
              );
            })()}
          </div>
          <div className="text-[10px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p><strong>Critérios de Aprovação:</strong> O aproveitamento positivo exige nota igual ou superior a 5,0 valores no Ensino Primário (0 a 10) ou 10,0 valores nos Iº e IIº Ciclos (0 a 20). Classes terminais (6ª, 9ª e 12ª/13ª) ficam sujeitas a Exame Nacional / Prova de Escola.</p>
          </div>
        </div>
      )}

      {/* SUB-ABA: RENDIMENTO CURRICULAR DETALHADO POR DISCIPLINA */}
      {subAbaAtiva === 'rendimento_disciplina' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
              <thead className="bg-slate-100 font-bold text-center text-[10px]">
                <tr>
                  <th className="p-2 border-r border-black w-10">ORD.</th>
                  <th className="p-2 border-r border-black text-left">DISCIPLINA</th>
                  <th className="p-2 border-r border-black w-24">CÓDIGO</th>
                  <th className="p-2 border-r border-black w-24 bg-blue-50">AVALIADOS</th>
                  <th className="p-2 border-r border-black w-24 bg-emerald-50">POSITIVAS</th>
                  <th className="p-2 border-r border-black w-24 bg-rose-50">NEGATIVAS</th>
                  <th className="p-2 border-r border-black w-24 bg-emerald-100">% APROVEIT.</th>
                  <th className="p-2 border-r border-black w-20">MÉDIA</th>
                  <th className="p-2 w-32">CLASSIFICAÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono">
                {rendimentoDetalhadoPorDisciplina.length > 0 ? (
                  rendimentoDetalhadoPorDisciplina.map((item, idx) => (
                    <tr key={item.disciplina.id} className="hover:bg-slate-50 text-center">
                      <td className="p-2 border-r border-black font-bold">{item.ordem !== 999 ? item.ordem : idx + 1}</td>
                      <td className="p-2 border-r border-black text-left font-sans font-bold uppercase">{item.disciplina.nome}</td>
                      <td className="p-2 border-r border-black text-slate-600">{item.disciplina.codigo || '—'}</td>
                      <td className="p-2 border-r border-black font-bold bg-blue-50/50">{item.totalAvaliados}</td>
                      <td className="p-2 border-r border-black font-bold text-emerald-800 bg-emerald-50/50">{item.totalPositivas}</td>
                      <td className="p-2 border-r border-black font-bold text-rose-800 bg-rose-50/50">{item.totalNegativas}</td>
                      <td className="p-2 border-r border-black font-black text-emerald-900 bg-emerald-100/50">{item.taxaAproveitamento}%</td>
                      <td className="p-2 border-r border-black font-black bg-slate-100">{item.mediaDisciplina}</td>
                      <td className="p-2 font-sans text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded ${
                          item.statusQualitativo === 'Excelente' ? 'bg-emerald-100 text-emerald-800' :
                          item.statusQualitativo === 'Bom' ? 'bg-blue-100 text-blue-800' :
                          item.statusQualitativo === 'Regular' ? 'bg-amber-100 text-amber-800' :
                          item.statusQualitativo === 'Crítico / Atenção' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.statusQualitativo}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center font-sans text-slate-500 italic">
                      Nenhuma disciplina curricular associada aos filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA: MAPA DE ASSIDUIDADE E FALTAS */}
      {subAbaAtiva === 'assiduidade_faltas' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
              <thead className="bg-slate-100 font-bold text-center text-[10px]">
                <tr>
                  <th className="p-2 border-r border-black w-10">Nº</th>
                  <th className="p-2 border-r border-black text-left">TURMA</th>
                  <th className="p-2 border-r border-black text-left">CLASSE</th>
                  <th className="p-2 border-r border-black w-24">ESTUDANTES</th>
                  <th className="p-2 border-r border-black w-28">TOTAL DE FALTAS</th>
                  <th className="p-2 border-r border-black w-28">MÉDIA FALTAS/ALUNO</th>
                  <th className="p-2 border-r border-black w-36 bg-rose-50">EM RISCO (&gt;=20 FALTAS)</th>
                  <th className="p-2 w-32 bg-emerald-50">TAXA DE FREQUÊNCIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono text-center">
                {dadosAssiduidadeTurmas.length > 0 ? (
                  dadosAssiduidadeTurmas.map((item, idx) => (
                    <tr key={item.turma.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-black">{idx + 1}</td>
                      <td className="p-2 border-r border-black text-left font-sans font-bold uppercase">
                        {isVisaoRedeTodas && (
                          <span className="mr-1.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[9px] font-black">{item.escolaSigla}</span>
                        )}
                        {item.turma.nome}
                      </td>
                      <td className="p-2 border-r border-black text-left font-sans">{item.turma.classe}</td>
                      <td className="p-2 border-r border-black font-bold">{item.totalAlunos}</td>
                      <td className="p-2 border-r border-black font-bold text-slate-700">{item.totalFaltasTurma}</td>
                      <td className="p-2 border-r border-black text-slate-700">{item.mediaFaltasPorAluno}</td>
                      <td className="p-2 border-r border-black font-bold text-rose-800 bg-rose-50/50">
                        {item.alunosEmRiscoFaltas > 0 ? `${item.alunosEmRiscoFaltas} Aluno(s)` : 'Nenhum'}
                      </td>
                      <td className="p-2 font-black text-emerald-800 bg-emerald-50/50">{item.taxaAssiduidadeEstimada}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center font-sans text-slate-500 italic">
                      Sem registos de presenças para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA: CARGA HORÁRIA & QUADRO DOCENTE */}
      {subAbaAtiva === 'carga_horaria' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
              <thead className="bg-slate-100 font-bold text-center text-[10px]">
                <tr>
                  <th className="p-2 border-r border-black w-10">Nº</th>
                  <th className="p-2 border-r border-black text-left">NOME DO PROFESSOR</th>
                  <th className="p-2 border-r border-black text-left">DISCIPLINA(S) LECCIONADA(S)</th>
                  <th className="p-2 border-r border-black w-24">Nº TURMAS</th>
                  <th className="p-2 border-r border-black text-left">TURMAS ATRIBUÍDAS</th>
                  <th className="p-2 border-r border-black w-28">CARGA SEMANAL</th>
                  <th className="p-2 w-32">VÍNCULO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-sans text-center">
                {distribuicaoCargaDocente.length > 0 ? (
                  distribuicaoCargaDocente.map((item, idx) => (
                    <tr key={item.docente.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-black font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-black text-left font-bold uppercase">{item.docente.nomeCompleto}</td>
                      <td className="p-2 border-r border-black text-left text-slate-800">{item.disciplinas}</td>
                      <td className="p-2 border-r border-black font-mono font-bold">{item.turmasContagem}</td>
                      <td className="p-2 border-r border-black text-left text-[10px] text-slate-600">{item.turmasNomes}</td>
                      <td className="p-2 border-r border-black font-mono font-bold text-blue-900">{item.temposSemanais} Tempos</td>
                      <td className="p-2 text-[10px] font-semibold text-slate-700">{item.regime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                      Nenhum funcionário docente cadastrado no quadro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RODAPÉ OFICIAL & ASSINATURAS NO FINAL DO DOCUMENTO ESTATÍSTICO */}
      <div className="mt-8 pt-6 border-t-2 border-slate-900 space-y-6">
        <div data-pdf-fixed-signatures="true" className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          <div className="min-w-0">
            <p className="font-bold uppercase text-slate-900 whitespace-normal break-words">
              {docenteAlvo ? 'O(A) Docente Responsável' : 'O Subdirector Pedagógico'}
            </p>
            <div className="w-full max-w-[208px] h-10 mx-auto border-b border-black mt-4" />
            <p className="text-[11px] font-semibold text-slate-700 mt-1 whitespace-normal break-words">
              {docenteAlvo ? docenteAlvo.nomeCompleto : (escolaExibida.subdiretorPedagogicoNome || 'Assinatura & Rubrica')}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-bold uppercase text-slate-900 whitespace-normal break-words">
              {isVisaoRedeTodas ? 'Supervisão Central da Rede Escolar' : 'O Director Geral da Instituição'}
            </p>
            <div className="w-full max-w-[208px] h-10 mx-auto border-b border-black mt-4" />
            <p className="text-[11px] font-semibold text-slate-700 mt-1 whitespace-normal break-words">
              {isVisaoRedeTodas ? 'Administrador Geral' : (escolaExibida.diretorGeralNome || 'Direcção da Escola')}
            </p>
          </div>
        </div>

        <div data-pdf-fixed-qr="true" className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-600 font-mono">
          <div className="text-center sm:text-left">
            <p>Documento Estatístico Oficial emitido em {formatarDataHoraAngolana(new Date())}</p>
            <p className="font-bold text-slate-800 mt-0.5">
              {isVisaoRedeTodas ? `Administração Central da Rede Escolar • ${escolas.length} Escolas` : (escolaExibida.nomeOficial || escolaExibida.nome)}
            </p>
          </div>
          <OfficialQrCode
            value={gerarPayloadQrDocumento({
              docType: 'MAPA_ESTATISTICO',
              escolaId: isVisaoRedeTodas ? 'REDE_NACIONAL' : escolaExibida.id,
              docRef: `${filtroAno || 'TODOS'}-T${filtroTrimestre}`,
              anoLectivo: filtroAno || 'TODOS'
            })}
            size={48}
          />
        </div>
      </div>
      </div>
    </div>
  );
};
