import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle,
  Download,
  Edit3,
  Eye,
  FileText,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  ArrowUp,
  ArrowDown,
  Users,
  BarChart3,
  Check
} from 'lucide-react';
import {
  Aluno,
  AtribuicaoDocente,
  CoordenacaoEscolar,
  Disciplina,
  Escola,
  Funcionario,
  NivelCoordenacaoEnsino,
  NotaTrimestralConsolidada,
  PeriodoRelatorioPedagogico,
  RelatorioPedagogicoFormal,
  SecaoRelatorioPedagogico,
  Turma
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { formatarDataAngolana, formatarDataHoraAngolana } from '../utils/dateFormat';
import {
  filtrarDisciplinasDaClasse,
  getDisciplinasPermitidasProfessor,
  isEnsinoPrimario,
  isPrimeiroCiclo,
  isProfessorCoordenadorTurma,
  isSegundoCiclo,
  normalizarClasse
} from '../services/academicHierarchyService';
import {
  calcularMediaFinal3Trimestre,
  calcularNotaTrimestralDinamica,
  obterInformacaoEscala,
  obterObservacaoDisciplina
} from '../services/macEngine';
import {
  flexionarGenero,
  inferirGeneroPorNomeOuParentesco,
  obterNomeDiretorGeral,
  obterNomeSubdiretorPedagogico,
  obterTituloDiretorSimples,
  obterTituloSubdiretorPedagogico
} from '../utils/directorHelper';

export interface PedagogicalReportsBuilderProps {
  mode: 'COORDENACAO_FINAL_ANO' | 'DOCENTE_TRIMESTRAL_ANUAL';
  escola: Escola;
  currentUser?: Funcionario;
  turmas: Turma[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  notasConsolidadas?: NotaTrimestralConsolidada[];
  funcionarios: Funcionario[];
  atribuicoes: AtribuicaoDocente[];
  anosDisponiveis: string[];
}

interface CoordCandidata {
  id: string;
  titulo: string;
  tipoCoordenacao: string;
  nivelEnsino: NivelCoordenacaoEnsino;
  responsavelId: string;
  responsavelNome: string;
  responsavelGenero: 'M' | 'F';
  classeAlvo?: string;
  turmaId?: string;
  turmaNome?: string;
  disciplinaId?: string;
  disciplinaNome?: string;
  cursoAlvo?: string;
  turnoAlvo?: string;
  areaDisciplinarAlvo?: string;
}

interface LinhaTurmaEstatistica {
  turmaId: string;
  turmaNome: string;
  classe: string;
  turno: string;
  curso?: string;
  matriculadosM: number;
  matriculadosF: number;
  totalMatriculados: number;
  avaliados: number;
  aprovadosM: number;
  aprovadosF: number;
  totalAprovados: number;
  reprovadosRecurso: number;
  taxaAprovacao: number;
  mediaArredondada: number;
  assiduidadePercent: number;
}

interface LinhaDisciplinaEstatistica {
  disciplinaId: string;
  disciplinaNome: string;
  avaliados: number;
  aprovados: number;
  reprovadosRecurso: number;
  taxaAprovacao: number;
  mediaArredondada: number;
}

const normalizarTxt = (v?: string | null): string =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const PedagogicalReportsBuilder: React.FC<PedagogicalReportsBuilderProps> = ({
  mode,
  escola,
  currentUser,
  turmas,
  alunos,
  disciplinas,
  notasConsolidadas = [],
  funcionarios,
  atribuicoes,
  anosDisponiveis
}) => {
  const isAdminGeral = currentUser?.role === 'AdminGeral';
  const isDirecaoOuAdmin =
    isAdminGeral ||
    currentUser?.role === 'DiretorGeral' ||
    currentUser?.role === 'SubdiretorPedagogico' ||
    currentUser?.role === 'SubdiretorAdministrativo' ||
    currentUser?.role === 'SubdirectorAdministrativo' ||
    currentUser?.role === 'CoordenadorPedagogico' ||
    currentUser?.role === 'ChefeSecretaria' ||
    currentUser?.role === 'Secretaria' ||
    currentUser?.role === 'SecretarioEscolar' ||
    currentUser?.role === 'Secretario';

  const podeHomologar =
    isAdminGeral ||
    currentUser?.role === 'DiretorGeral' ||
    currentUser?.role === 'SubdiretorPedagogico' ||
    currentUser?.role === 'CoordenadorPedagogico';

  const anoDefault = escola.anoLectivoActivo || anosDisponiveis[0] || String(new Date().getFullYear());
  const [anoLectivo, setAnoLectivo] = useState<string>(anoDefault);

  useEffect(() => {
    if (escola.anoLectivoActivo) {
      setAnoLectivo(escola.anoLectivoActivo);
    }
  }, [escola.id, escola.anoLectivoActivo]);

  const [periodoDocente, setPeriodoDocente] = useState<PeriodoRelatorioPedagogico>('1');
  const periodoEfetivo: PeriodoRelatorioPedagogico =
    mode === 'COORDENACAO_FINAL_ANO' ? 'Anual' : periodoDocente;

  const [refreshTick, setRefreshTick] = useState(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [visualizacaoFoco, setVisualizacaoFoco] = useState<'dividido' | 'preview'>('dividido');
  const [orientacaoPdf, setOrientacaoPdf] = useState<'portrait' | 'landscape'>('portrait');

  const notificar = (texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Base acadêmica filtrada para o ano selecionado
  const turmasDoAno = useMemo(
    () =>
      turmas.filter(
        t =>
          t.escolaId === escola.id &&
          (!anoLectivo || !t.anoLectivo || t.anoLectivo === anoLectivo)
      ),
    [turmas, escola.id, anoLectivo]
  );

  const regrasMAC = useMemo(() => dbService.obterRegrasMAC(), [refreshTick]);
  const presencasEscola = useMemo(
    () => dbService.obterPresencasAlunos().filter(p => p.escolaId === escola.id),
    [escola.id, refreshTick]
  );

  const notasBaseConsolidadas = useMemo(() => {
    const armazenadas = dbService.getNotasConsolidadas();
    const mapa = new Map<string, NotaTrimestralConsolidada>();
    [...armazenadas, ...notasConsolidadas].forEach(n => {
      if (n && n.id) mapa.set(n.id, n);
    });
    return Array.from(mapa.values()).filter(
      n => (!n.escolaId || n.escolaId === escola.id) && (!anoLectivo || !n.anoLectivo || n.anoLectivo === anoLectivo)
    );
  }, [notasConsolidadas, escola.id, anoLectivo, refreshTick]);

  const todasNotasLancadas = useMemo(() => dbService.getNotas(), [refreshTick]);
  const todasAvaliacoes = useMemo(() => dbService.getAvaliacoes(), [refreshTick]);

  // =========================================================
  // 1. RESOLUÇÃO DE COORDENAÇÕES DISPONÍVEIS (MODE COORDENACAO)
  // =========================================================
  const coordenacoesDisponiveis = useMemo<CoordCandidata[]>(() => {
    if (mode !== 'COORDENACAO_FINAL_ANO') return [];
    const registadas = dbService.getCoordenacoes(escola.id, anoLectivo);
    const lista: CoordCandidata[] = [];
    const chavesVistas = new Set<string>();

    const inferirNivelPorClasse = (cls?: string): NivelCoordenacaoEnsino => {
      if (cls && isSegundoCiclo(cls)) return 'IICiclo';
      if (cls && isPrimeiroCiclo(cls)) return 'ICiclo';
      return 'Primario';
    };

    registadas.forEach(c => {
      const respId = c.funcionarioId || c.professorId || '';
      if (!isDirecaoOuAdmin && currentUser && respId !== currentUser.id) {
        return;
      }
      const func = funcionarios.find(f => f.id === respId);
      const nomeResp = func?.nomeCompleto || c.funcionarioNome || c.professorNome || 'Coordenação';
      const gen = inferirGeneroPorNomeOuParentesco(nomeResp, undefined, func?.genero, funcionarios);
      const discObj = c.disciplinaId ? disciplinas.find(d => d.id === c.disciplinaId) : undefined;
      const turmaObj = c.turmaId ? turmasDoAno.find(t => t.id === c.turmaId) : undefined;
      const cursoLimpo = c.nivelEnsino === 'IICiclo' ? c.curso || turmaObj?.curso : undefined;

      const detalhes: string[] = [];
      if (c.classe || turmaObj?.classe) detalhes.push(c.classe || turmaObj?.classe || '');
      if (turmaObj?.nome || c.turmaNome) detalhes.push(`Turma ${turmaObj?.nome || c.turmaNome}`);
      if (discObj?.nome || c.disciplinaNome) detalhes.push(discObj?.nome || c.disciplinaNome || '');
      if (cursoLimpo) detalhes.push(cursoLimpo);
      if (c.turno) detalhes.push(`Turno ${c.turno}`);
      if (c.areaDisciplinar) detalhes.push(c.areaDisciplinar);

      lista.push({
        id: c.id,
        titulo: `${c.tipoCoordenacao}${detalhes.length > 0 ? ` — ${detalhes.join(' • ')}` : ''}`,
        tipoCoordenacao: c.tipoCoordenacao,
        nivelEnsino: c.nivelEnsino,
        responsavelId: respId,
        responsavelNome: nomeResp,
        responsavelGenero: gen,
        classeAlvo: c.classe || turmaObj?.classe,
        turmaId: c.turmaId,
        turmaNome: turmaObj?.nome || c.turmaNome,
        disciplinaId: c.disciplinaId,
        disciplinaNome: discObj?.nome || c.disciplinaNome,
        cursoAlvo: cursoLimpo,
        turnoAlvo: c.turno,
        areaDisciplinarAlvo: c.areaDisciplinar
      });
      chavesVistas.add(`turma-${c.turmaId || ''}-${respId}`);
    });

    // Coordenações implícitas definidas diretamente nas Turmas (Director de Turma / Coordenador de Turma)
    turmasDoAno.forEach(t => {
      const coordId = t.coordenadorId || '';
      const ehCoordDesta =
        isDirecaoOuAdmin
          ? Boolean(coordId || t.directorTurmaNome)
          : currentUser &&
            (isProfessorCoordenadorTurma(t, currentUser.id) ||
              (t.directorTurmaNome && normalizarTxt(t.directorTurmaNome) === normalizarTxt(currentUser.nomeCompleto)));
      if (!ehCoordDesta) return;
      const idEfetivo = coordId || currentUser?.id || `dt-${t.id}`;
      const chave = `turma-${t.id}-${idEfetivo}`;
      if (chavesVistas.has(chave)) return;

      const func = funcionarios.find(f => f.id === idEfetivo);
      const nomeResp = func?.nomeCompleto || t.directorTurmaNome || currentUser?.nomeCompleto || 'Coordenação de Turma';
      const gen = inferirGeneroPorNomeOuParentesco(nomeResp, undefined, func?.genero, funcionarios);
      const niv = inferirNivelPorClasse(t.classe);
      const cursoLimpo = niv === 'IICiclo' ? t.curso : undefined;

      lista.push({
        id: `coord-turma-${t.id}`,
        titulo: `Coordenador de Turma — ${t.classe} • ${t.nome} (${t.turno})${cursoLimpo ? ` • ${cursoLimpo}` : ''}`,
        tipoCoordenacao: 'Coordenador de Turma',
        nivelEnsino: niv,
        responsavelId: idEfetivo,
        responsavelNome: nomeResp,
        responsavelGenero: gen,
        classeAlvo: t.classe,
        turmaId: t.id,
        turmaNome: t.nome,
        cursoAlvo: cursoLimpo,
        turnoAlvo: t.turno
      });
      chavesVistas.add(chave);
    });

    // Fallback para Coordenador Pedagógico / Turno / Disciplina por papel (role) se não houver vínculo explícito
    if (
      currentUser &&
      (currentUser.role === 'CoordenadorPedagogico' ||
        currentUser.role === 'CoordenadorDisciplina' ||
        currentUser.role === 'CoordenadorTurno' ||
        isDirecaoOuAdmin) &&
      lista.length === 0
    ) {
      const gen = inferirGeneroPorNomeOuParentesco(currentUser?.nomeCompleto, undefined, currentUser?.genero, funcionarios);
      const tipoPapel =
        currentUser?.role === 'CoordenadorDisciplina'
          ? 'Coordenador de Disciplina'
          : currentUser?.role === 'CoordenadorTurno'
            ? 'Coordenador de Turno'
            : 'Coordenador Pedagógico';
      const nivPadrao: NivelCoordenacaoEnsino = turmasDoAno.some(t => isSegundoCiclo(t.classe))
        ? 'IICiclo'
        : turmasDoAno.some(t => isPrimeiroCiclo(t.classe))
          ? 'ICiclo'
          : 'Primario';
      lista.push({
        id: `coord-role-${currentUser?.id || escola.id}`,
        titulo: `${tipoPapel} — Coordenação Geral (${escola.nome})`,
        tipoCoordenacao: tipoPapel,
        nivelEnsino: nivPadrao,
        responsavelId: currentUser?.id || 'direcao',
        responsavelNome: currentUser?.nomeCompleto || 'Coordenação Pedagógica',
        responsavelGenero: gen
      });
    }

    return lista;
  }, [mode, escola.id, escola.nome, anoLectivo, isDirecaoOuAdmin, currentUser, funcionarios, disciplinas, turmasDoAno]);

  const [coordenacaoSelecionadaId, setCoordenacaoSelecionadaId] = useState<string>('');
  useEffect(() => {
    if (mode !== 'COORDENACAO_FINAL_ANO') return;
    if (coordenacoesDisponiveis.length === 0) {
      setCoordenacaoSelecionadaId('');
      return;
    }
    if (!coordenacoesDisponiveis.some(c => c.id === coordenacaoSelecionadaId)) {
      setCoordenacaoSelecionadaId(coordenacoesDisponiveis[0].id);
    }
  }, [mode, coordenacoesDisponiveis, coordenacaoSelecionadaId]);

  const coordAtual = useMemo(
    () => coordenacoesDisponiveis.find(c => c.id === coordenacaoSelecionadaId) || null,
    [coordenacoesDisponiveis, coordenacaoSelecionadaId]
  );

  // =========================================================
  // 2. RESOLUÇÃO DE DOCENTE / TURMAS / DISCIPLINAS (MODE DOCENTE)
  // =========================================================
  const professoresSelecionaveis = useMemo(() => {
    const lista = funcionarios.filter(
      f =>
        f.escolaId === escola.id &&
        (f.role === 'Professor' || f.ehProfessor || f.ehAdministrativoQueLeciona || atribuicoes.some(a => a.professorId === f.id))
    );
    if (!isDirecaoOuAdmin && currentUser) {
      return lista.filter(f => f.id === currentUser.id).length > 0
        ? lista.filter(f => f.id === currentUser.id)
        : [currentUser];
    }
    return lista;
  }, [funcionarios, escola.id, atribuicoes, isDirecaoOuAdmin, currentUser]);

  const [professorSelecionadoId, setProfessorSelecionadoId] = useState<string>(
    currentUser?.id || professoresSelecionaveis[0]?.id || ''
  );

  useEffect(() => {
    if (mode !== 'DOCENTE_TRIMESTRAL_ANUAL') return;
    if (!isDirecaoOuAdmin && currentUser) {
      setProfessorSelecionadoId(currentUser.id);
      return;
    }
    if (
      professoresSelecionaveis.length > 0 &&
      !professoresSelecionaveis.some(p => p.id === professorSelecionadoId)
    ) {
      setProfessorSelecionadoId(professoresSelecionaveis[0].id);
    }
  }, [mode, isDirecaoOuAdmin, currentUser, professoresSelecionaveis, professorSelecionadoId]);

  const professorAtual = useMemo(
    () => professoresSelecionaveis.find(p => p.id === professorSelecionadoId) || currentUser || null,
    [professoresSelecionaveis, professorSelecionadoId, currentUser]
  );

  const atribuicoesDoProfessor = useMemo(() => {
    if (!professorAtual) return [];
    return atribuicoes.filter(
      a =>
        a.escolaId === escola.id &&
        a.professorId === professorAtual.id &&
        (!anoLectivo || !a.anoLectivo || a.anoLectivo === anoLectivo)
    );
  }, [atribuicoes, escola.id, professorAtual, anoLectivo]);

  const turmasDoProfessor = useMemo(() => {
    if (!professorAtual) return [];
    const ids = new Set<string>();
    atribuicoesDoProfessor.forEach(a => {
      if (a.turmaId) ids.add(a.turmaId);
    });
    const horariosProf = dbService
      .obterHorarios(escola.id)
      .filter(h => h.professorId === professorAtual.id);
    horariosProf.forEach(h => {
      if (h.turmaId) ids.add(h.turmaId);
    });
    return turmasDoAno.filter(t => ids.has(t.id) || isProfessorCoordenadorTurma(t, professorAtual.id));
  }, [professorAtual, atribuicoesDoProfessor, escola.id, turmasDoAno]);

  const [filtroTurmaDocenteId, setFiltroTurmaDocenteId] = useState<string>('TODAS');
  const [filtroDisciplinaDocenteId, setFiltroDisciplinaDocenteId] = useState<string>('TODAS');

  const disciplinasDoProfessorNoEscopo = useMemo(() => {
    if (!professorAtual) return [];
    const horariosProf = dbService
      .obterHorarios(escola.id)
      .filter(h => h.professorId === professorAtual.id);

    if (filtroTurmaDocenteId !== 'TODAS') {
      const turmaObj = turmasDoProfessor.find(t => t.id === filtroTurmaDocenteId);
      return getDisciplinasPermitidasProfessor(
        disciplinas,
        turmaObj,
        atribuicoesDoProfessor,
        professorAtual.id,
        horariosProf
      );
    }

    const mapa = new Map<string, Disciplina>();
    turmasDoProfessor.forEach(t => {
      getDisciplinasPermitidasProfessor(
        disciplinas,
        t,
        atribuicoesDoProfessor,
        professorAtual.id,
        horariosProf
      ).forEach(d => {
        if (!mapa.has(d.id)) mapa.set(d.id, d);
      });
    });
    if (mapa.size === 0) {
      getDisciplinasPermitidasProfessor(
        disciplinas,
        undefined,
        atribuicoesDoProfessor,
        professorAtual.id,
        horariosProf
      ).forEach(d => {
        if (!mapa.has(d.id)) mapa.set(d.id, d);
      });
    }
    return Array.from(mapa.values());
  }, [professorAtual, escola.id, filtroTurmaDocenteId, turmasDoProfessor, disciplinas, atribuicoesDoProfessor]);

  useEffect(() => {
    if (
      filtroDisciplinaDocenteId !== 'TODAS' &&
      !disciplinasDoProfessorNoEscopo.some(d => d.id === filtroDisciplinaDocenteId)
    ) {
      setFiltroDisciplinaDocenteId('TODAS');
    }
  }, [disciplinasDoProfessorNoEscopo, filtroDisciplinaDocenteId]);

  // =========================================================
  // 3. MOTOR ESTATÍSTICO DO ÂMBITO (COORDENAÇÃO OU DOCENTE)
  // =========================================================
  const calculoEstatisticas = useMemo(() => {
    // Determinar turmas no escopo
    let turmasAlvo: Turma[] = [];
    let disciplinasAlvo: Disciplina[] = [];

    if (mode === 'COORDENACAO_FINAL_ANO') {
      if (!coordAtual) {
        turmasAlvo = [];
      } else if (coordAtual.turmaId) {
        turmasAlvo = turmasDoAno.filter(t => t.id === coordAtual.turmaId);
      } else {
        turmasAlvo = turmasDoAno.filter(t => {
          if (coordAtual.nivelEnsino === 'Primario' && !isEnsinoPrimario(t.classe)) return false;
          if (coordAtual.nivelEnsino === 'ICiclo' && !isPrimeiroCiclo(t.classe)) return false;
          if (coordAtual.nivelEnsino === 'IICiclo' && !isSegundoCiclo(t.classe)) return false;
          if (coordAtual.classeAlvo && normalizarClasse(t.classe) !== normalizarClasse(coordAtual.classeAlvo)) {
            return false;
          }
          if (coordAtual.nivelEnsino === 'IICiclo' && coordAtual.cursoAlvo) {
            if (normalizarTxt(t.curso) !== normalizarTxt(coordAtual.cursoAlvo)) return false;
          }
          if (coordAtual.turnoAlvo && normalizarTxt(t.turno) !== normalizarTxt(coordAtual.turnoAlvo)) {
            return false;
          }
          return true;
        });
      }

      if (coordAtual?.disciplinaId) {
        const dObj = disciplinas.find(d => d.id === coordAtual.disciplinaId);
        disciplinasAlvo = dObj ? [dObj] : [];
      } else if (coordAtual?.areaDisciplinarAlvo) {
        const areaNorm = normalizarTxt(coordAtual.areaDisciplinarAlvo);
        disciplinasAlvo = disciplinas.filter(d => normalizarTxt(d.nome).includes(areaNorm));
      }
    } else {
      // DOCENTE_TRIMESTRAL_ANUAL
      turmasAlvo =
        filtroTurmaDocenteId !== 'TODAS'
          ? turmasDoProfessor.filter(t => t.id === filtroTurmaDocenteId)
          : turmasDoProfessor;

      disciplinasAlvo =
        filtroDisciplinaDocenteId !== 'TODAS'
          ? disciplinasDoProfessorNoEscopo.filter(d => d.id === filtroDisciplinaDocenteId)
          : disciplinasDoProfessorNoEscopo;
    }

    // Helper para obter média do aluno numa disciplina no período
    const obterMediaAlunoDisciplina = (
      aluno: Aluno,
      turma: Turma,
      disc: Disciplina,
      trimestre: PeriodoRelatorioPedagogico
    ): number | null => {
      const nivel = turma.nivelEnsino || (isEnsinoPrimario(turma.classe) ? 'Primario' : isPrimeiroCiclo(turma.classe) ? 'ICiclo' : 'IICiclo');
      const regra = regrasMAC.find(r => r.nivelEnsino === nivel) || regrasMAC[0];
      const nppAtivo = escola.nppAtivo !== false;

      const buscarNotaTrimestre = (trNum: 1 | 2 | 3): number | null => {
        const cons = notasBaseConsolidadas.find(
          n =>
            n.alunoId === aluno.id &&
            n.turmaId === turma.id &&
            n.disciplinaId === disc.id &&
            Number(n.trimestre) === trNum
        );
        if (cons && typeof cons.mediaTrimestral === 'number' && !isNaN(cons.mediaTrimestral)) {
          return cons.mediaTrimestral;
        }
        // Fallback em tempo real para avaliações criadas na área de lançamento de notas
        const avsTurmaDisc = todasAvaliacoes.filter(
          av => av.turmaId === turma.id && av.disciplinaId === disc.id && Number(av.trimestre) === trNum
        );
        if (avsTurmaDisc.length === 0) return null;
        const notasAlunoAvs = todasNotasLancadas.filter(n => n.alunoId === aluno.id);
        let somaMac = 0;
        let countMac = 0;
        let nppVal: number | undefined;
        let nptVal: number | undefined;
        avsTurmaDisc.forEach(av => {
          const nt = notasAlunoAvs.find(n => n.avaliacaoId === av.id);
          if (nt && typeof nt.valorNota === 'number') {
            const tNome = (av.tipoNome || '').toUpperCase();
            if (tNome.includes('NPT') || tNome.includes('PROVA TRIMESTRAL')) {
              nptVal = nt.valorNota;
            } else if (tNome.includes('NPP') || tNome.includes('PROVA DO PROFESSOR')) {
              nppVal = nt.valorNota;
            } else {
              somaMac += nt.valorNota;
              countMac++;
            }
          }
        });
        if (countMac === 0 && nppVal === undefined && nptVal === undefined) return null;
        const mac = countMac > 0 ? somaMac / countMac : (nppVal ?? nptVal ?? 0);
        return calcularNotaTrimestralDinamica(mac, nppVal, nptVal, regra, trNum, turma.classe, nppAtivo).mediaTrimestral;
      };

      if (trimestre === '1' || trimestre === '2' || trimestre === '3') {
        return buscarNotaTrimestre(Number(trimestre) as 1 | 2 | 3);
      }

      // Cálculo Anual (MFD arredondado)
      const mt1 = buscarNotaTrimestre(1);
      const mt2 = buscarNotaTrimestre(2);
      const mt3 = buscarNotaTrimestre(3);
      const validas = [mt1, mt2, mt3].filter((v): v is number => v !== null);
      if (validas.length === 0) return null;
      if (mt1 !== null && mt2 !== null && mt3 !== null) {
        const cons3 = notasBaseConsolidadas.find(
          n => n.alunoId === aluno.id && n.turmaId === turma.id && n.disciplinaId === disc.id && Number(n.trimestre) === 3
        );
        return calcularMediaFinal3Trimestre(mt1, mt2, mt3, cons3?.notaExame, regra, turma.classe).mediaFinal;
      }
      const mediaParcial = validas.reduce((acc, v) => acc + v, 0) / validas.length;
      return Math.round(mediaParcial);
    };

    let matriculadosM = 0;
    let matriculadosF = 0;
    let avaliadosTotal = 0;
    let avaliadosM = 0;
    let avaliadosF = 0;
    let aprovadosM = 0;
    let aprovadosF = 0;
    let reprovadosRecurso = 0;
    let desistentes = 0;
    let transferidos = 0;
    const somaMediasGerais: number[] = [];

    const linhasTurmas: LinhaTurmaEstatistica[] = [];
    const mapaDiscStats = new Map<
      string,
      { nome: string; avaliados: number; aprovados: number; reprovados: number; soma: number }
    >();

    const ocorrenciasLista: Array<{
      alunoNome: string;
      turmaNome: string;
      data: string;
      tipo: string;
      gravidade?: string;
      descricao: string;
    }> = [];

    turmasAlvo.forEach(t => {
      const alunosTurma = alunos.filter(
        a =>
          a.escolaId === escola.id &&
          (a.turmaId === t.id ||
            (normalizarClasse(a.classeId) === normalizarClasse(t.classe) &&
              (!a.turmaId && normalizarTxt(a.periodo) === normalizarTxt(t.turno))))
      );

      // Disciplinas efetivas para esta turma neste relatório
      let discsDaTurma: Disciplina[];
      if (mode === 'DOCENTE_TRIMESTRAL_ANUAL') {
        const atribsT = atribuicoesDoProfessor.filter(a => !a.turmaId || a.turmaId === t.id);
        const permitidas = getDisciplinasPermitidasProfessor(disciplinas, t, atribsT, professorAtual?.id);
        discsDaTurma =
          filtroDisciplinaDocenteId !== 'TODAS'
            ? permitidas.filter(d => d.id === filtroDisciplinaDocenteId)
            : permitidas;
        if (discsDaTurma.length === 0 && disciplinasAlvo.length > 0) {
          discsDaTurma = disciplinasAlvo;
        }
      } else if (disciplinasAlvo.length > 0) {
        discsDaTurma = disciplinasAlvo;
      } else {
        discsDaTurma = filtrarDisciplinasDaClasse(
          disciplinas,
          t.classe,
          isSegundoCiclo(t.classe) ? t.curso : undefined
        );
      }

      let tMatM = 0;
      let tMatF = 0;
      let tAval = 0;
      let tAprovM = 0;
      let tAprovF = 0;
      let tReprov = 0;
      const tMedias: number[] = [];

      const nivelT = t.nivelEnsino || (isEnsinoPrimario(t.classe) ? 'Primario' : isPrimeiroCiclo(t.classe) ? 'ICiclo' : 'IICiclo');
      const regraT = regrasMAC.find(r => r.nivelEnsino === nivelT) || regrasMAC[0];
      const escalaT = obterInformacaoEscala(t.classe, nivelT);

      alunosTurma.forEach(al => {
        const isF = al.genero === 'F';
        if (isF) {
          matriculadosF++;
          tMatF++;
        } else {
          matriculadosM++;
          tMatM++;
        }

        // Ocorrências homologadas deste aluno
        const ocsAprovadas = dbService.obterOcorrenciasAprovadasDossie(al.ocorrencias || []);
        ocsAprovadas.forEach(oc => {
          if (!oc.turmaId || oc.turmaId === t.id) {
            ocorrenciasLista.push({
              alunoNome: al.nomeCompleto,
              turmaNome: `${t.classe} ${t.nome}`,
              data: oc.data,
              tipo: oc.tipo,
              gravidade: oc.gravidade,
              descricao: oc.descricao
            });
          }
        });

        if (al.estado === 'Desistente') {
          desistentes++;
          return;
        }
        if (al.estado === 'Transferido') {
          transferidos++;
          return;
        }

        const notasAlunoDiscs: number[] = [];
        discsDaTurma.forEach(disc => {
          const mediaD = obterMediaAlunoDisciplina(al, t, disc, periodoEfetivo);
          if (mediaD !== null) {
            notasAlunoDiscs.push(mediaD);
            const st = mapaDiscStats.get(disc.id) || {
              nome: disc.nome,
              avaliados: 0,
              aprovados: 0,
              reprovados: 0,
              soma: 0
            };
            st.avaliados++;
            st.soma += mediaD;
            const obsD = obterObservacaoDisciplina(mediaD, t.classe, al.estado, regraT);
            if (obsD.categoria === 'Aprovado') {
              st.aprovados++;
            } else if (obsD.categoria === 'Recurso' || obsD.categoria === 'Reprovado') {
              st.reprovados++;
            }
            mapaDiscStats.set(disc.id, st);
          }
        });

        if (notasAlunoDiscs.length > 0) {
          tAval++;
          avaliadosTotal++;
          if (isF) avaliadosF++;
          else avaliadosM++;

          const mediaAlunoGeral = Math.round(
            notasAlunoDiscs.reduce((acc, v) => acc + v, 0) / notasAlunoDiscs.length
          );
          tMedias.push(mediaAlunoGeral);
          somaMediasGerais.push(mediaAlunoGeral);

          const negativas = notasAlunoDiscs.filter(n => n < escalaT.notaAprovacao).length;
          if (negativas === 0) {
            if (isF) {
              aprovadosF++;
              tAprovF++;
            } else {
              aprovadosM++;
              tAprovM++;
            }
          } else {
            reprovadosRecurso++;
            tReprov++;
          }
        }
      });

      const presTurma = presencasEscola.filter(p => p.turmaId === t.id);
      const totalPresRegs = presTurma.length;
      const presentesCount = presTurma.filter(p => p.estado === 'Presente').length;
      const assidPct = totalPresRegs > 0 ? Math.round((presentesCount / totalPresRegs) * 100) : 100;

      const mediaTurmaArred =
        tMedias.length > 0 ? Math.round(tMedias.reduce((acc, v) => acc + v, 0) / tMedias.length) : 0;
      const tTotalAprov = tAprovM + tAprovF;
      const taxaT = tAval > 0 ? Math.round((tTotalAprov / tAval) * 100) : 0;

      linhasTurmas.push({
        turmaId: t.id,
        turmaNome: t.nome,
        classe: t.classe,
        turno: t.turno,
        curso: isSegundoCiclo(t.classe) ? t.curso : undefined,
        matriculadosM: tMatM,
        matriculadosF: tMatF,
        totalMatriculados: tMatM + tMatF,
        avaliados: tAval,
        aprovadosM: tAprovM,
        aprovadosF: tAprovF,
        totalAprovados: tTotalAprov,
        reprovadosRecurso: tReprov,
        taxaAprovacao: taxaT,
        mediaArredondada: mediaTurmaArred,
        assiduidadePercent: assidPct
      });
    });

    const linhasDisciplinas: LinhaDisciplinaEstatistica[] = Array.from(mapaDiscStats.entries()).map(
      ([discId, st]) => ({
        disciplinaId: discId,
        disciplinaNome: st.nome,
        avaliados: st.avaliados,
        aprovados: st.aprovados,
        reprovadosRecurso: st.reprovados,
        taxaAprovacao: st.avaliados > 0 ? Math.round((st.aprovados / st.avaliados) * 100) : 0,
        mediaArredondada: st.avaliados > 0 ? Math.round(st.soma / st.avaliados) : 0
      })
    );

    const totalMatriculados = matriculadosM + matriculadosF;
    const totalAprovados = aprovadosM + aprovadosF;
    const taxaAprovacaoGeral = avaliadosTotal > 0 ? Math.round((totalAprovados / avaliadosTotal) * 100) : 0;
    const taxaReprovacaoGeral = avaliadosTotal > 0 ? Math.round((reprovadosRecurso / avaliadosTotal) * 100) : 0;
    const mediaGeralArredondada =
      somaMediasGerais.length > 0
        ? Math.round(somaMediasGerais.reduce((acc, v) => acc + v, 0) / somaMediasGerais.length)
        : 0;
    const presencasTotaisScope = presencasEscola.filter(p => turmasAlvo.some(t => t.id === p.turmaId));
    const taxaAssiduidadeGeral =
      presencasTotaisScope.length > 0
        ? Math.round(
            (presencasTotaisScope.filter(p => p.estado === 'Presente').length / presencasTotaisScope.length) * 100
          )
        : 100;

    return {
      turmasAlvo,
      disciplinasAlvo,
      matriculadosM,
      matriculadosF,
      totalMatriculados,
      avaliadosTotal,
      avaliadosM,
      avaliadosF,
      aprovadosM,
      aprovadosF,
      totalAprovados,
      reprovadosRecurso,
      desistentes,
      transferidos,
      taxaAprovacaoGeral,
      taxaReprovacaoGeral,
      mediaGeralArredondada,
      taxaAssiduidadeGeral,
      linhasTurmas,
      linhasDisciplinas,
      ocorrenciasLista
    };
  }, [
    mode,
    coordAtual,
    turmasDoAno,
    turmasDoProfessor,
    disciplinas,
    disciplinasDoProfessorNoEscopo,
    filtroTurmaDocenteId,
    filtroDisciplinaDocenteId,
    alunos,
    escola.id,
    atribuicoesDoProfessor,
    professorAtual,
    regrasMAC,
    escola.nppAtivo,
    notasBaseConsolidadas,
    todasAvaliacoes,
    todasNotasLancadas,
    periodoEfetivo,
    presencasEscola
  ]);

  // =========================================================
  // 4. ESTADO EDITÁVEL DO RELATÓRIO & SECÇÕES PERSONALIZADAS
  // =========================================================
  const [relatorioIdAtual, setRelatorioIdAtual] = useState<string>('');
  const [tituloDocumento, setTituloDocumento] = useState<string>('');
  const [subtituloDocumento, setSubtituloDocumento] = useState<string>('');
  const [sinteseExecutiva, setSinteseExecutiva] = useState<string>('');
  const [atividadesRealizadas, setAtividadesRealizadas] = useState<string>('');
  const [dificuldadesConstrangimentos, setDificuldadesConstrangimentos] = useState<string>('');
  const [recomendacoes, setRecomendacoes] = useState<string>('');
  const [conclusaoFinal, setConclusaoFinal] = useState<string>('');
  const [secoesPersonalizadas, setSecoesPersonalizadas] = useState<SecaoRelatorioPedagogico[]>([]);
  const [incluirTabelasEstatisticas, setIncluirTabelasEstatisticas] = useState<boolean>(true);
  const [incluirDetalhePorTurmaDisciplina, setIncluirDetalhePorTurmaDisciplina] = useState<boolean>(true);
  const [incluirOcorrencias, setIncluirOcorrencias] = useState<boolean>(true);
  const [estadoRelatorio, setEstadoRelatorio] = useState<'Rascunho' | 'Finalizado' | 'Homologado'>('Rascunho');
  const [homologadoPorNome, setHomologadoPorNome] = useState<string | undefined>(undefined);

  const gerarTextosPadraoComDadosReais = () => {
    const s = calculoEstatisticas;
    const periodoTxt =
      periodoEfetivo === 'Anual'
        ? `Ano Lectivo ${anoLectivo}`
        : `${periodoEfetivo}º Trimestre — Ano Lectivo ${anoLectivo}`;

    if (mode === 'COORDENACAO_FINAL_ANO') {
      const respNome = coordAtual?.responsavelNome || currentUser?.nomeCompleto || 'Coordenação';
      const cargoCoord = coordAtual?.tipoCoordenacao || 'Coordenação Pedagógica';
      const escopoLabel = [
        coordAtual?.classeAlvo ? `${coordAtual.classeAlvo} Classe` : '',
        coordAtual?.turmaNome ? `Turma ${coordAtual.turmaNome}` : '',
        coordAtual?.disciplinaNome || '',
        coordAtual?.nivelEnsino === 'IICiclo' && coordAtual?.cursoAlvo ? `Curso: ${coordAtual.cursoAlvo}` : '',
        coordAtual?.turnoAlvo ? `Turno: ${coordAtual.turnoAlvo}` : '',
        coordAtual?.areaDisciplinarAlvo || ''
      ]
        .filter(Boolean)
        .join(' • ');

      setTituloDocumento(`RELATÓRIO ANUAL DE FIM DE ANO DA COORDENAÇÃO`);
      setSubtituloDocumento(`${cargoCoord}${escopoLabel ? ` (${escopoLabel})` : ''} • ${periodoTxt}`);
      setSinteseExecutiva(
        `No encerramento do Ano Lectivo ${anoLectivo}, no âmbito da ${cargoCoord}${escopoLabel ? ` (${escopoLabel})` : ''}, sob responsabilidade de ${respNome}, registou-se um total de ${s.totalMatriculados} estudantes matriculados (${s.matriculadosM} do sexo masculino e ${s.matriculadosF} do sexo feminino), distribuídos por ${s.turmasAlvo.length} turma(s). Foram avaliados ${s.avaliadosTotal} alunos, alcançando ${s.totalAprovados} aprovações (${s.taxaAprovacaoGeral}% de aproveitamento global) e média geral arredondada de ${s.mediaGeralArredondada} valores.`
      );
      setAtividadesRealizadas(
        `• Acompanhamento contínuo da dosificação programática e cumprimento dos planos de aula.\n• Realização de reuniões periódicas de coordenação, conselhos de notas trimestrais e revisão das mini-pautas.\n• Monitorização da assiduidade estudantil (taxa média registada: ${s.taxaAssiduidadeGeral}%) e atendimento aos encarregados de educação.\n• Validação de ocorrências pedagógicas e disciplinares encaminhadas ao dossiê estudantil.`
      );
      setDificuldadesConstrangimentos(
        s.reprovadosRecurso > 0 || s.desistentes > 0
          ? `• Identificaram-se ${s.reprovadosRecurso} estudante(s) em situação de recurso ou reprovação e ${s.desistentes} desistência(s), exigindo reforço pedagógico nas unidades com menor rendimento.\n• Necessidade de maior pontualidade na entrega de trabalhos contínuos e acompanhamento familiar regular.`
          : `• Sem constrangimentos graves de aproveitamento, mantendo-se foco no acompanhamento preventivo da assiduidade e hábitos de estudo.`
      );
      setRecomendacoes(
        `• Reforçar sessões de recuperação pedagógica para os estudantes com aproveitamento insuficiente ou em exame de recurso.\n• Manter a articulação estreita entre docentes, coordenação e encarregados de educação desde o 1º Trimestre do próximo ano lectivo.`
      );
      setConclusaoFinal(
        `Face aos indicadores estatísticos consolidados (${s.taxaAprovacaoGeral}% de aprovação global e média geral de ${s.mediaGeralArredondada} valores), a Coordenação dá por cumpridos os objectivos pedagógicos previstos para o Ano Lectivo ${anoLectivo}, submetendo o presente relatório à consideração superior.`
      );
    } else {
      const profNome = professorAtual?.nomeCompleto || 'Docente';
      const discsTxt =
        s.linhasDisciplinas.length > 0
          ? s.linhasDisciplinas.map(d => d.disciplinaNome).join(', ')
          : disciplinasDoProfessorNoEscopo.map(d => d.nome).join(', ') || 'Disciplinas Atribuídas';

      setTituloDocumento(
        periodoEfetivo === 'Anual'
          ? `RELATÓRIO ANUAL DE DESEMPENHO DOCENTE`
          : `RELATÓRIO PEDAGÓGICO DO ${periodoEfetivo}º TRIMESTRE (DOCENTE)`
      );
      setSubtituloDocumento(`Disciplina(s): ${discsTxt} • ${periodoTxt}`);
      setSinteseExecutiva(
        `O presente relatório apresenta o balanço pedagógico de ${profNome} relativo ao ${periodoTxt}, abrangendo ${s.turmasAlvo.length} turma(s) atribuída(s) na(s) disciplina(s) de ${discsTxt}. Do total de ${s.totalMatriculados} estudantes matriculados (${s.matriculadosM}M / ${s.matriculadosF}F), foram avaliados ${s.avaliadosTotal} alunos, obtendo-se ${s.totalAprovados} aprovações (${s.taxaAprovacaoGeral}% de aproveitamento) e média geral arredondada de ${s.mediaGeralArredondada} valores.`
      );
      setAtividadesRealizadas(
        `• Leccionação integral dos conteúdos programáticos previstos para o ${periodoEfetivo === 'Anual' ? 'ano lectivo' : `${periodoEfetivo}º trimestre`}.\n• Aplicação e correcção das avaliações contínuas (MAC), provas do professor e provas trimestrais, com lançamento atempado no sistema.\n• Controlo regular de presenças em sala de aula (assiduidade média de ${s.taxaAssiduidadeGeral}%) e registo de ocorrências relevantes.`
      );
      setDificuldadesConstrangimentos(
        s.reprovadosRecurso > 0
          ? `• Registaram-se ${s.reprovadosRecurso} aluno(s) abaixo do limiar de aprovação neste período, associados sobretudo a dificuldades de consolidação prática e faltas pontuais.`
          : `• O processo de ensino-aprendizagem decorreu com regularidade e participação positiva da maioria dos estudantes.`
      );
      setRecomendacoes(
        `• Intensificar exercícios de consolidação dirigida e acompanhamento individualizado aos estudantes com menor rendimento.\n• Envolver os encarregados de educação nos casos de ausência frequente ou baixa participação nas tarefas.`
      );
      setConclusaoFinal(
        `Conclui-se o ${periodoTxt} com ${s.taxaAprovacaoGeral}% de aprovação nas turmas leccionadas, mantendo-se o compromisso de melhoria contínua da qualidade do ensino.`
      );
    }
  };

  // Inicializa / atualiza automaticamente quando muda modo, ano, período ou seleção (se não estiver a editar um relatório guardado)
  useEffect(() => {
    if (!relatorioIdAtual) {
      gerarTextosPadraoComDadosReais();
      setEstadoRelatorio('Rascunho');
      setHomologadoPorNome(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    anoLectivo,
    periodoEfetivo,
    coordenacaoSelecionadaId,
    professorSelecionadoId,
    filtroTurmaDocenteId,
    filtroDisciplinaDocenteId,
    relatorioIdAtual
  ]);

  const relatoriosGuardados = useMemo(() => {
    const todos = dbService
      .getRelatoriosPedagogicos(escola.id)
      .filter(r => r.tipoRelatorio === mode);
    if (isDirecaoOuAdmin) return todos;
    return todos.filter(
      r => r.criadoPorId === currentUser?.id || r.professorId === currentUser?.id
    );
  }, [escola.id, mode, isDirecaoOuAdmin, currentUser, refreshTick]);

  const carregarRelatorioGuardado = (rel: RelatorioPedagogicoFormal) => {
    setRelatorioIdAtual(rel.id);
    if (rel.anoLectivo) setAnoLectivo(rel.anoLectivo);
    if (mode === 'DOCENTE_TRIMESTRAL_ANUAL' && rel.periodoReferencia) {
      setPeriodoDocente(rel.periodoReferencia);
    }
    if (mode === 'COORDENACAO_FINAL_ANO' && rel.coordenacaoId) {
      setCoordenacaoSelecionadaId(rel.coordenacaoId);
    }
    if (mode === 'DOCENTE_TRIMESTRAL_ANUAL' && rel.professorId) {
      setProfessorSelecionadoId(rel.professorId);
    }
    setTituloDocumento(rel.tituloDocumento);
    setSubtituloDocumento(rel.subtituloDocumento || '');
    setSinteseExecutiva(rel.sinteseExecutiva);
    setAtividadesRealizadas(rel.atividadesRealizadas);
    setDificuldadesConstrangimentos(rel.dificuldadesConstrangimentos);
    setRecomendacoes(rel.recomendacoes);
    setConclusaoFinal(rel.conclusaoFinal);
    setSecoesPersonalizadas(rel.secoesPersonalizadas || []);
    setIncluirTabelasEstatisticas(rel.incluirTabelasEstatisticas !== false);
    setIncluirDetalhePorTurmaDisciplina(rel.incluirDetalhePorTurmaDisciplina !== false);
    setIncluirOcorrencias(rel.incluirOcorrencias !== false);
    setEstadoRelatorio(rel.estado);
    setHomologadoPorNome(rel.homologadoPorNome);
    notificar('Relatório carregado para edição e pré-visualização.');
  };

  const iniciarNovoRelatorio = () => {
    setRelatorioIdAtual('');
    setSecoesPersonalizadas([]);
    setEstadoRelatorio('Rascunho');
    setHomologadoPorNome(undefined);
    setTimeout(() => gerarTextosPadraoComDadosReais(), 0);
  };

  const adicionarSecaoPersonalizada = () => {
    const nova: SecaoRelatorioPedagogico = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: `Informação Adicional ${secoesPersonalizadas.length + 1}`,
      conteudo: ''
    };
    setSecoesPersonalizadas(prev => [...prev, nova]);
  };

  const atualizarSecaoPersonalizada = (id: string, campo: 'titulo' | 'conteudo', valor: string) => {
    setSecoesPersonalizadas(prev => prev.map(s => (s.id === id ? { ...s, [campo]: valor } : s)));
  };

  const moverSecaoPersonalizada = (idx: number, direcao: -1 | 1) => {
    const destino = idx + direcao;
    if (destino < 0 || destino >= secoesPersonalizadas.length) return;
    setSecoesPersonalizadas(prev => {
      const copia = [...prev];
      const [item] = copia.splice(idx, 1);
      copia.splice(destino, 0, item);
      return copia;
    });
  };

  const removerSecaoPersonalizada = (id: string) => {
    setSecoesPersonalizadas(prev => prev.filter(s => s.id !== id));
  };

  const guardarRelatorio = (novoEstado?: 'Rascunho' | 'Finalizado' | 'Homologado') => {
    const estadoAlvo = novoEstado || estadoRelatorio;
    const profRef = mode === 'COORDENACAO_FINAL_ANO' ? coordAtual?.responsavelId : professorAtual?.id;
    const profNomeRef = mode === 'COORDENACAO_FINAL_ANO' ? coordAtual?.responsavelNome : professorAtual?.nomeCompleto;
    const profGenRef =
      mode === 'COORDENACAO_FINAL_ANO'
        ? coordAtual?.responsavelGenero || 'M'
        : inferirGeneroPorNomeOuParentesco(professorAtual?.nomeCompleto, undefined, professorAtual?.genero, funcionarios);

    const isIICicloAtual =
      mode === 'COORDENACAO_FINAL_ANO'
        ? coordAtual?.nivelEnsino === 'IICiclo'
        : calculoEstatisticas.turmasAlvo.some(t => isSegundoCiclo(t.classe));

    const payload: RelatorioPedagogicoFormal = {
      id: relatorioIdAtual || `relped-${escola.id}-${Date.now()}`,
      escolaId: escola.id,
      escolaNome: escola.nomeOficial || escola.nome,
      anoLectivo,
      tipoRelatorio: mode,
      periodoReferencia: periodoEfetivo,
      coordenacaoId: mode === 'COORDENACAO_FINAL_ANO' ? coordAtual?.id : undefined,
      coordenacaoTipo: mode === 'COORDENACAO_FINAL_ANO' ? coordAtual?.tipoCoordenacao : undefined,
      nivelEnsino: mode === 'COORDENACAO_FINAL_ANO' ? coordAtual?.nivelEnsino : undefined,
      classeAlvo: coordAtual?.classeAlvo,
      turmaId: filtroTurmaDocenteId !== 'TODAS' ? filtroTurmaDocenteId : coordAtual?.turmaId,
      disciplinaId: filtroDisciplinaDocenteId !== 'TODAS' ? filtroDisciplinaDocenteId : coordAtual?.disciplinaId,
      cursoAlvo: isIICicloAtual ? coordAtual?.cursoAlvo : undefined,
      turnoAlvo: coordAtual?.turnoAlvo,
      areaDisciplinarAlvo: coordAtual?.areaDisciplinarAlvo,
      professorId: profRef,
      professorNome: profNomeRef,
      professorGenero: profGenRef,
      tituloDocumento: tituloDocumento.trim() || 'RELATÓRIO PEDAGÓGICO',
      subtituloDocumento: subtituloDocumento.trim(),
      sinteseExecutiva,
      atividadesRealizadas,
      dificuldadesConstrangimentos,
      recomendacoes,
      conclusaoFinal,
      secoesPersonalizadas,
      incluirTabelasEstatisticas,
      incluirDetalhePorTurmaDisciplina,
      incluirOcorrencias,
      estado: estadoAlvo,
      homologadoPorNome:
        estadoAlvo === 'Homologado' ? homologadoPorNome || currentUser?.nomeCompleto || 'Direção' : homologadoPorNome,
      homologadoEm: estadoAlvo === 'Homologado' ? new Date().toISOString() : undefined,
      criadoPorId: currentUser?.id || profRef || 'sistema',
      criadoPorNome: currentUser?.nomeCompleto || profNomeRef || 'Docente',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      estatisticasSnapshot: {
        totalMatriculados: calculoEstatisticas.totalMatriculados,
        avaliadosTotal: calculoEstatisticas.avaliadosTotal,
        totalAprovados: calculoEstatisticas.totalAprovados,
        taxaAprovacaoGeral: calculoEstatisticas.taxaAprovacaoGeral,
        mediaGeralArredondada: calculoEstatisticas.mediaGeralArredondada
      }
    };

    const salvo = dbService.salvarRelatorioPedagogico(payload);
    dbService.registarLog(
      mode === 'COORDENACAO_FINAL_ANO' ? 'Relatório Final de Coordenação' : 'Relatório Pedagógico Docente',
      `${payload.tituloDocumento} (${payload.periodoReferencia}/${payload.anoLectivo}) por ${currentUser?.nomeCompleto || profNomeRef || 'Docente'} guardado no estado "${estadoAlvo}".`,
      escola.id
    );
    setRelatorioIdAtual(salvo.id);
    setEstadoRelatorio(estadoAlvo);
    if (estadoAlvo === 'Homologado') {
      setHomologadoPorNome(payload.homologadoPorNome);
    }
    setRefreshTick(t => t + 1);
    notificar(
      estadoAlvo === 'Homologado'
        ? 'Relatório homologado e registado com sucesso.'
        : estadoAlvo === 'Finalizado'
          ? 'Relatório finalizado e pronto para exportação PDF.'
          : 'Rascunho guardado com sucesso.'
    );
  };

  const eliminarRelatorio = (id: string) => {
    dbService.removerRelatorioPedagogico(id);
    if (relatorioIdAtual === id) {
      iniciarNovoRelatorio();
    }
    setConfirmDeleteId(null);
    setRefreshTick(t => t + 1);
    notificar('Relatório eliminado.');
  };

  // Exportação PDF num clique diretamente a partir da Visualização Geral Completa
  const previewElementId =
    mode === 'COORDENACAO_FINAL_ANO'
      ? 'relatorio-coordenacao-final-pdf'
      : 'relatorio-docente-periodo-pdf';

  const handleBaixarPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const slugBase =
        mode === 'COORDENACAO_FINAL_ANO'
          ? `Relatorio_Final_Coordenacao_${(coordAtual?.tipoCoordenacao || 'Geral').replace(/\s+/g, '_')}_${anoLectivo}`
          : `Relatorio_Docente_${(professorAtual?.nomeCompleto || 'Professor').replace(/\s+/g, '_')}_${periodoEfetivo}_${anoLectivo}`;
      await downloadElementAsPdf(previewElementId, `${slugBase}.pdf`, {
        orientation: orientacaoPdf,
        scale: 2,
        marginMm: 10
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleImprimir = () => {
    const el = document.getElementById(previewElementId);
    if (el) {
      imprimirElementoDiretamente(el, tituloDocumento || 'Relatorio_Pedagogico', {
        orientation: orientacaoPdf,
        marginMm: 10
      });
    }
  };

  // Concordância de género estrita do signatário e direcção
  const autorGenero: 'M' | 'F' =
    mode === 'COORDENACAO_FINAL_ANO'
      ? coordAtual?.responsavelGenero || inferirGeneroPorNomeOuParentesco(currentUser?.nomeCompleto, undefined, currentUser?.genero, funcionarios)
      : inferirGeneroPorNomeOuParentesco(professorAtual?.nomeCompleto, undefined, professorAtual?.genero, funcionarios);

  const tituloCargoAutorDocumento =
    mode === 'COORDENACAO_FINAL_ANO'
      ? flexionarGenero(
          autorGenero,
          `O ${(coordAtual?.tipoCoordenacao || 'Coordenador').replace(/^Coordenadora/i, 'Coordenador')}`,
          `A ${(coordAtual?.tipoCoordenacao || 'Coordenadora').replace(/^Coordenador/i, 'Coordenadora')}`
        )
      : flexionarGenero(autorGenero, 'O Professor', 'A Professora');

  const nomeAutorDocumento =
    mode === 'COORDENACAO_FINAL_ANO'
      ? coordAtual?.responsavelNome || currentUser?.nomeCompleto || 'Coordenação'
      : professorAtual?.nomeCompleto || currentUser?.nomeCompleto || 'Docente';

  const tituloSubdirPed = obterTituloSubdiretorPedagogico(escola, funcionarios);
  const nomeSubdirPed = obterNomeSubdiretorPedagogico(escola, funcionarios);
  const tituloDiretor = obterTituloDiretorSimples(escola, funcionarios);
  const nomeDiretor = obterNomeDiretorGeral(escola, funcionarios);

  const temCursoExibivel =
    mode === 'COORDENACAO_FINAL_ANO'
      ? coordAtual?.nivelEnsino === 'IICiclo' && Boolean(coordAtual?.cursoAlvo)
      : calculoEstatisticas.turmasAlvo.some(t => isSegundoCiclo(t.classe) && Boolean(t.curso));

  const cursosEnvolvidosTexto = useMemo(() => {
    if (mode === 'COORDENACAO_FINAL_ANO') {
      return coordAtual?.nivelEnsino === 'IICiclo' ? coordAtual?.cursoAlvo || '' : '';
    }
    const cs = Array.from(
      new Set(
        calculoEstatisticas.turmasAlvo
          .filter(t => isSegundoCiclo(t.classe) && t.curso)
          .map(t => t.curso!)
      )
    );
    return cs.join(', ');
  }, [mode, coordAtual, calculoEstatisticas.turmasAlvo]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRA DE COMANDO E EXPORTAÇÃO */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0 border border-amber-200">
              {mode === 'COORDENACAO_FINAL_ANO' ? (
                <Award className="w-7 h-7" />
              ) : (
                <BookOpen className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {mode === 'COORDENACAO_FINAL_ANO'
                    ? 'Relatório Anual de Fim de Ano da Coordenação'
                    : 'Relatório Pedagógico Docente (Trimestral / Anual)'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {estadoRelatorio}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {mode === 'COORDENACAO_FINAL_ANO'
                  ? 'Visualize as estatísticas completas da sua coordenação, edite ou adicione novas secções personalizadas e descarregue o relatório oficial em PDF num único clique.'
                  : 'Gere relatórios do 1º, 2º, 3º Trimestre ou Anual das suas turmas e disciplinas com estatísticas reais, pré-visualização completa, edição livre e exportação PDF direta.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setVisualizacaoFoco(v => (v === 'dividido' ? 'preview' : 'dividido'))}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{visualizacaoFoco === 'dividido' ? 'Ecrã Inteiro (Pré-visualização)' : 'Voltar à Edição + Pré-visualização'}</span>
            </button>
            <div className="flex items-center space-x-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Folha:</span>
              <select
                value={orientacaoPdf}
                onChange={(e) => setOrientacaoPdf(e.target.value as 'portrait' | 'landscape')}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                title="Orientação da folha A4"
              >
                <option value="portrait">Retrato (A4 Vertical)</option>
                <option value="landscape">Paisagem (A4 Horizontal)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={isDownloadingPdf}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-black text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'A Gerar PDF...' : 'Baixar PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir (A4)</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
              feedback.tipo === 'erro'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span>{feedback.texto}</span>
            <button type="button" onClick={() => setFeedback(null)} className="font-black px-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* SELETORES DE ÂMBITO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">Ano Lectivo</label>
            <select
              value={anoLectivo}
              onChange={(e) => {
                setAnoLectivo(e.target.value);
                setRelatorioIdAtual('');
              }}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
            >
              {anosDisponiveis.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {mode === 'COORDENACAO_FINAL_ANO' ? (
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-600 mb-1">Coordenação de Referência *</label>
              {coordenacoesDisponiveis.length === 0 ? (
                <div className="p-2.5 border border-amber-300 bg-amber-50 text-amber-900 rounded-xl font-semibold">
                  Nenhuma coordenação atribuída ao seu perfil neste ano letivo.
                </div>
              ) : (
                <select
                  value={coordenacaoSelecionadaId}
                  onChange={(e) => {
                    setCoordenacaoSelecionadaId(e.target.value);
                    setRelatorioIdAtual('');
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  {coordenacoesDisponiveis.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Período do Relatório *</label>
                <select
                  value={periodoDocente}
                  onChange={(e) => {
                    setPeriodoDocente(e.target.value as PeriodoRelatorioPedagogico);
                    setRelatorioIdAtual('');
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                  <option value="Anual">Relatório Anual Completo</option>
                </select>
              </div>

              {isDirecaoOuAdmin && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Docente</label>
                  <select
                    value={professorSelecionadoId}
                    onChange={(e) => {
                      setProfessorSelecionadoId(e.target.value);
                      setFiltroTurmaDocenteId('TODAS');
                      setFiltroDisciplinaDocenteId('TODAS');
                      setRelatorioIdAtual('');
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    {professoresSelecionaveis.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nomeCompleto}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 mb-1">Turma (Escopo)</label>
                <select
                  value={filtroTurmaDocenteId}
                  onChange={(e) => {
                    setFiltroTurmaDocenteId(e.target.value);
                    setRelatorioIdAtual('');
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="TODAS">Todas as Minhas Turmas ({turmasDoProfessor.length})</option>
                  {turmasDoProfessor.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.classe} • {t.nome} ({t.turno}){isSegundoCiclo(t.classe) && t.curso ? ` — ${t.curso}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Disciplina</label>
                <select
                  value={filtroDisciplinaDocenteId}
                  onChange={(e) => {
                    setFiltroDisciplinaDocenteId(e.target.value);
                    setRelatorioIdAtual('');
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="TODAS">Todas as Minhas Disciplinas ({disciplinasDoProfessorNoEscopo.length})</option>
                  {disciplinasDoProfessorNoEscopo.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              type="button"
              onClick={gerarTextosPadraoComDadosReais}
              className="w-full px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl font-black flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Texto com Estatísticas Reais</span>
            </button>
          </div>
        </div>

        {/* KPIs INSTANTÂNEOS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase text-slate-500">Matriculados</p>
            <p className="text-lg font-black text-slate-900">{calculoEstatisticas.totalMatriculados}</p>
            <p className="text-[10px] text-slate-600">
              {calculoEstatisticas.matriculadosM}M • {calculoEstatisticas.matriculadosF}F
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-[10px] font-bold uppercase text-blue-700">Avaliados</p>
            <p className="text-lg font-black text-blue-900">{calculoEstatisticas.avaliadosTotal}</p>
            <p className="text-[10px] text-blue-700">
              {calculoEstatisticas.avaliadosM}M • {calculoEstatisticas.avaliadosF}F
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-[10px] font-bold uppercase text-emerald-700">Aprovações</p>
            <p className="text-lg font-black text-emerald-900">
              {calculoEstatisticas.totalAprovados} ({calculoEstatisticas.taxaAprovacaoGeral}%)
            </p>
            <p className="text-[10px] text-emerald-700">
              {calculoEstatisticas.aprovadosM}M • {calculoEstatisticas.aprovadosF}F
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <p className="text-[10px] font-bold uppercase text-rose-700">Reprov. / Recurso</p>
            <p className="text-lg font-black text-rose-900">
              {calculoEstatisticas.reprovadosRecurso} ({calculoEstatisticas.taxaReprovacaoGeral}%)
            </p>
            <p className="text-[10px] text-rose-700">
              Desist.: {calculoEstatisticas.desistentes} • Transf.: {calculoEstatisticas.transferidos}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <p className="text-[10px] font-bold uppercase text-indigo-700">Média Geral (Arred.)</p>
            <p className="text-lg font-black text-indigo-900">{calculoEstatisticas.mediaGeralArredondada} val.</p>
            <p className="text-[10px] text-indigo-700">{calculoEstatisticas.turmasAlvo.length} turma(s)</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[10px] font-bold uppercase text-amber-700">Assiduidade Média</p>
            <p className="text-lg font-black text-amber-900">{calculoEstatisticas.taxaAssiduidadeGeral}%</p>
            <p className="text-[10px] text-amber-700">
              {calculoEstatisticas.ocorrenciasLista.length} ocorrência(s) dossiê
            </p>
          </div>
        </div>
      </div>

      {/* CORPO PRINCIPAL: EDITOR À ESQUERDA + VISUALIZAÇÃO GERAL A4 À DIREITA */}
      <div className={`grid grid-cols-1 ${visualizacaoFoco === 'dividido' ? 'xl:grid-cols-12' : ''} gap-6 items-start`}>
        {/* PAINEL DE EDIÇÃO E PERSONALIZAÇÃO */}
        {visualizacaoFoco === 'dividido' && (
          <div className="xl:col-span-5 space-y-4 print:hidden">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    Editar &amp; Adicionar Informações ao Relatório
                  </h3>
                </div>
                {relatorioIdAtual && (
                  <button
                    type="button"
                    onClick={iniciarNovoRelatorio}
                    className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    + Novo Relatório
                  </button>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Título Oficial do Relatório</label>
                <input
                  type="text"
                  value={tituloDocumento}
                  onChange={(e) => setTituloDocumento(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo / Referência</label>
                <input
                  type="text"
                  value={subtituloDocumento}
                  onChange={(e) => setSubtituloDocumento(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">1. Síntese Executiva &amp; Contextualização</label>
                <textarea
                  rows={4}
                  value={sinteseExecutiva}
                  onChange={(e) => setSinteseExecutiva(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">2. Actividades Pedagógicas Desenvolvidas</label>
                <textarea
                  rows={4}
                  value={atividadesRealizadas}
                  onChange={(e) => setAtividadesRealizadas(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">3. Dificuldades &amp; Constrangimentos Identificados</label>
                <textarea
                  rows={3}
                  value={dificuldadesConstrangimentos}
                  onChange={(e) => setDificuldadesConstrangimentos(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">4. Recomendações &amp; Plano de Melhoria</label>
                <textarea
                  rows={3}
                  value={recomendacoes}
                  onChange={(e) => setRecomendacoes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">5. Conclusão Final</label>
                <textarea
                  rows={3}
                  value={conclusaoFinal}
                  onChange={(e) => setConclusaoFinal(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              {/* BLOCOS ADICIONAIS PERSONALIZADOS */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-950 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Secções Adicionais Personalizadas ({secoesPersonalizadas.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={adicionarSecaoPersonalizada}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Informação</span>
                  </button>
                </div>

                {secoesPersonalizadas.length === 0 ? (
                  <p className="text-[11px] text-indigo-800/80">
                    Clique em &ldquo;Adicionar Informação&rdquo; para incluir novas secções (ex.: Projectos Extracurriculares, Reuniões com Encarregados, Premiações, Observações Específicas).
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {secoesPersonalizadas.map((sec, idx) => (
                      <div key={sec.id} className="bg-white border border-indigo-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={sec.titulo}
                            onChange={(e) => atualizarSecaoPersonalizada(sec.id, 'titulo', e.target.value)}
                            placeholder="Título da secção..."
                            className="flex-1 p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moverSecaoPersonalizada(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moverSecaoPersonalizada(idx, 1)}
                              disabled={idx === secoesPersonalizadas.length - 1}
                              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removerSecaoPersonalizada(sec.id)}
                              className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
                              title="Remover secção"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={sec.conteudo}
                          onChange={(e) => atualizarSecaoPersonalizada(sec.id, 'conteudo', e.target.value)}
                          placeholder="Escreva aqui o conteúdo detalhado que constará no relatório em PDF..."
                          className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OPÇÕES DE TABELAS NO PDF */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="font-black text-slate-700 text-[11px] uppercase">
                  Quadros Estatísticos Incluídos no PDF:
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirTabelasEstatisticas}
                      onChange={(e) => setIncluirTabelasEstatisticas(e.target.checked)}
                    />
                    <span className="font-semibold text-slate-800">Quadro Resumo de Aproveitamento (M / F / Taxa / Média)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirDetalhePorTurmaDisciplina}
                      onChange={(e) => setIncluirDetalhePorTurmaDisciplina(e.target.checked)}
                    />
                    <span className="font-semibold text-slate-800">Desdobramento por Turma e por Disciplina (Nomes Reais)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirOcorrencias}
                      onChange={(e) => setIncluirOcorrencias(e.target.checked)}
                    />
                    <span className="font-semibold text-slate-800">Síntese de Ocorrências Homologadas no Dossiê</span>
                  </label>
                </div>
              </div>

              {/* BOTÕES DE GRAVAÇÃO / HOMOLOGAÇÃO */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => guardarRelatorio('Rascunho')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Guardar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => guardarRelatorio('Finalizado')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalizar Relatório</span>
                </button>
                {podeHomologar && (
                  <button
                    type="button"
                    onClick={() => guardarRelatorio('Homologado')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Homologar</span>
                  </button>
                )}
              </div>
            </div>

            {/* HISTÓRICO DE RELATÓRIOS GUARDADOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 flex items-center space-x-1.5">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  <span>Relatórios Guardados ({relatoriosGuardados.length})</span>
                </h4>
              </div>

              {relatoriosGuardados.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Ainda não guardou nenhum relatório neste módulo. Edite o relatório acima e clique em &ldquo;Guardar Rascunho&rdquo; ou &ldquo;Finalizar Relatório&rdquo;.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {relatoriosGuardados.map(rel => (
                    <div
                      key={rel.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        relatorioIdAtual === rel.id
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => carregarRelatorioGuardado(rel)}
                        className="text-left flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 line-clamp-1">{rel.tituloDocumento}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white border border-slate-300 text-slate-700">
                            {rel.periodoReferencia === 'Anual' ? 'Anual' : `${rel.periodoReferencia}º Trim.`} • {rel.anoLectivo}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              rel.estado === 'Homologado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rel.estado === 'Finalizado'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rel.estado}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {rel.professorNome || rel.criadoPorNome} • {formatarDataAngolana(rel.atualizadoEm || rel.criadoEm)}
                        </p>
                      </button>

                      {confirmDeleteId === rel.id ? (
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => eliminarRelatorio(rel.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(rel.id)}
                          className="p-1.5 text-red-600 hover:text-red-800 cursor-pointer shrink-0"
                          title="Eliminar relatório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISUALIZAÇÃO GERAL COMPLETA (A4 OFICIAL PARA PDF — SEMPRE FUNDO BRANCO / TEXTO PRETO) */}
        <div className={visualizacaoFoco === 'dividido' ? 'xl:col-span-7' : 'w-full'}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden bg-indigo-950 text-white px-4 py-2.5 rounded-xl">
            <div className="flex items-center space-x-2 text-xs">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="font-bold">
                Pré-Visualização Geral do Documento PDF — Todas as alterações são reflectidas em tempo real
              </span>
            </div>
            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg font-black text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'A Gerar...' : 'Baixar PDF Agora'}</span>
            </button>
          </div>

          <div className="bg-slate-200/70 p-3 sm:p-6 rounded-2xl overflow-x-auto">
            <div
              id={previewElementId}
              className={`bg-white text-black mx-auto ${orientacaoPdf === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'} p-8 sm:p-10 shadow-xl border border-slate-300 space-y-6 font-serif`}
            >
              {/* CABEÇALHO OFICIAL MED ANGOLA */}
              <div className="text-center border-b-2 border-black pb-4 space-y-1">
                <div className="flex items-center justify-center space-x-4 mb-2">
                  <InsigniaAngola className="w-14 h-14 object-contain" />
                  {(escola.logotipoUrl || escola.logotipo) && (
                    <img
                      src={escola.logotipoUrl || escola.logotipo}
                      alt={escola.nome}
                      className="w-14 h-14 object-contain border border-slate-200 rounded p-0.5 bg-white"
                    />
                  )}
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest">República de Angola</p>
                <p className="text-[11px] font-bold uppercase tracking-wider">Ministério da Educação</p>
                <p className="text-[10px] font-semibold uppercase text-slate-700">
                  Governo Provincial de {escola.provincia} • Administração Municipal de {escola.municipio}
                </p>
                <h2 className="text-sm font-black uppercase tracking-wide pt-1">
                  {escola.nomeOficial || escola.nome}
                </h2>
                {(escola.codigoMEC || escola.codigoEscola) && (
                  <p className="text-[10px] text-slate-600 font-sans">
                    Código MED: <strong>{escola.codigoMEC || escola.codigoEscola}</strong> • NIF: <strong>{escola.nif || 'N/D'}</strong>
                  </p>
                )}
              </div>

              {/* TÍTULO DO RELATÓRIO */}
              <div className="text-center space-y-1">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wide underline decoration-2 underline-offset-4">
                  {tituloDocumento || 'RELATÓRIO PEDAGÓGICO'}
                </h1>
                {subtituloDocumento && (
                  <p className="text-xs font-bold text-slate-800 font-sans">{subtituloDocumento}</p>
                )}
              </div>

              {/* METADADOS DE IDENTIFICAÇÃO */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-black p-3 text-[11px] font-sans bg-slate-50">
                <div>
                  <span className="text-slate-600 uppercase text-[9px] font-bold block">Ano Lectivo</span>
                  <strong className="text-black">{anoLectivo}</strong>
                </div>
                <div>
                  <span className="text-slate-600 uppercase text-[9px] font-bold block">Período de Referência</span>
                  <strong className="text-black">
                    {periodoEfetivo === 'Anual' ? 'Final de Ano (Anual)' : `${periodoEfetivo}º Trimestre`}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 uppercase text-[9px] font-bold block">
                    {flexionarGenero(autorGenero, 'Responsável', 'Responsável')}
                  </span>
                  <strong className="text-black">{nomeAutorDocumento}</strong>
                </div>
                {mode === 'COORDENACAO_FINAL_ANO' && coordAtual && (
                  <>
                    <div>
                      <span className="text-slate-600 uppercase text-[9px] font-bold block">Nível de Ensino</span>
                      <strong className="text-black">
                        {coordAtual.nivelEnsino === 'Primario'
                          ? 'Ensino Primário'
                          : coordAtual.nivelEnsino === 'ICiclo'
                            ? 'Iº Ciclo do Secundário'
                            : 'IIº Ciclo / Ensino Técnico'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-600 uppercase text-[9px] font-bold block">Estrutura Coordenada</span>
                      <strong className="text-black">{coordAtual.tipoCoordenacao}</strong>
                    </div>
                  </>
                )}
                {temCursoExibivel && cursosEnvolvidosTexto && (
                  <div>
                    <span className="text-slate-600 uppercase text-[9px] font-bold block">Curso (IIº Ciclo)</span>
                    <strong className="text-black">{cursosEnvolvidosTexto}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-600 uppercase text-[9px] font-bold block">Estado do Documento</span>
                  <strong className="text-black">
                    {estadoRelatorio}
                    {homologadoPorNome ? ` (${homologadoPorNome})` : ''}
                  </strong>
                </div>
              </div>

              {/* 1. SÍNTESE EXECUTIVA */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5 font-sans">
                  1. Síntese Executiva &amp; Contextualização
                </h3>
                <p className="text-xs leading-relaxed whitespace-pre-line text-justify">{sinteseExecutiva}</p>
              </div>

              {/* 2. QUADROS ESTATÍSTICOS */}
              {incluirTabelasEstatisticas && (
                <div className="space-y-2.5 font-sans">
                  <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5">
                    2. Quadro Estatístico Global de Aproveitamento
                  </h3>
                  <table className="w-full border-collapse border border-black text-[11px] text-center">
                    <thead>
                      <tr className="bg-slate-100 font-black uppercase text-[10px]">
                        <th className="border border-black p-1.5">Matriculados (M/F)</th>
                        <th className="border border-black p-1.5">Avaliados (M/F)</th>
                        <th className="border border-black p-1.5">Aprovações (M/F)</th>
                        <th className="border border-black p-1.5">Reprov. / Recurso</th>
                        <th className="border border-black p-1.5">Desist. / Transf.</th>
                        <th className="border border-black p-1.5">Taxa Aprov.</th>
                        <th className="border border-black p-1.5">Média Geral (Arred.)</th>
                        <th className="border border-black p-1.5">Assiduidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-bold">
                        <td className="border border-black p-1.5">
                          {calculoEstatisticas.totalMatriculados} ({calculoEstatisticas.matriculadosM}M /{' '}
                          {calculoEstatisticas.matriculadosF}F)
                        </td>
                        <td className="border border-black p-1.5">
                          {calculoEstatisticas.avaliadosTotal} ({calculoEstatisticas.avaliadosM}M /{' '}
                          {calculoEstatisticas.avaliadosF}F)
                        </td>
                        <td className="border border-black p-1.5">
                          {calculoEstatisticas.totalAprovados} ({calculoEstatisticas.aprovadosM}M /{' '}
                          {calculoEstatisticas.aprovadosF}F)
                        </td>
                        <td className="border border-black p-1.5">{calculoEstatisticas.reprovadosRecurso}</td>
                        <td className="border border-black p-1.5">
                          {calculoEstatisticas.desistentes} / {calculoEstatisticas.transferidos}
                        </td>
                        <td className="border border-black p-1.5">{calculoEstatisticas.taxaAprovacaoGeral}%</td>
                        <td className="border border-black p-1.5">{calculoEstatisticas.mediaGeralArredondada} val.</td>
                        <td className="border border-black p-1.5">{calculoEstatisticas.taxaAssiduidadeGeral}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* DESDOBRAMENTO POR TURMA E DISCIPLINA */}
              {incluirDetalhePorTurmaDisciplina && (
                <div className="space-y-4 font-sans">
                  {calculoEstatisticas.linhasTurmas.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-black uppercase text-slate-900">
                        2.1. Estatística Detalhada por Turma
                      </h4>
                      <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-black uppercase">
                            <th className="border border-black p-1.5 text-left">Classe / Turma</th>
                            <th className="border border-black p-1.5 text-center">Turno</th>
                            {calculoEstatisticas.linhasTurmas.some(l => Boolean(l.curso)) && (
                              <th className="border border-black p-1.5 text-left">Curso (IIº Ciclo)</th>
                            )}
                            <th className="border border-black p-1.5 text-center">Matr. (M/F)</th>
                            <th className="border border-black p-1.5 text-center">Aval.</th>
                            <th className="border border-black p-1.5 text-center">Aprov. (M/F)</th>
                            <th className="border border-black p-1.5 text-center">Reprov.</th>
                            <th className="border border-black p-1.5 text-center">% Aprov.</th>
                            <th className="border border-black p-1.5 text-center">Média</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculoEstatisticas.linhasTurmas.map(lt => {
                            const mostrarColCurso = calculoEstatisticas.linhasTurmas.some(l => Boolean(l.curso));
                            return (
                              <tr key={lt.turmaId}>
                                <td className="border border-black p-1.5 font-bold">
                                  {lt.classe} • {lt.turmaNome}
                                </td>
                                <td className="border border-black p-1.5 text-center">{lt.turno}</td>
                                {mostrarColCurso && (
                                  <td className="border border-black p-1.5">{lt.curso || '—'}</td>
                                )}
                                <td className="border border-black p-1.5 text-center">
                                  {lt.totalMatriculados} ({lt.matriculadosM}/{lt.matriculadosF})
                                </td>
                                <td className="border border-black p-1.5 text-center">{lt.avaliados}</td>
                                <td className="border border-black p-1.5 text-center font-bold">
                                  {lt.totalAprovados} ({lt.aprovadosM}/{lt.aprovadosF})
                                </td>
                                <td className="border border-black p-1.5 text-center">{lt.reprovadosRecurso}</td>
                                <td className="border border-black p-1.5 text-center font-bold">{lt.taxaAprovacao}%</td>
                                <td className="border border-black p-1.5 text-center font-bold">{lt.mediaArredondada}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {calculoEstatisticas.linhasDisciplinas.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-black uppercase text-slate-900">
                        2.2. Rendimento por Disciplina (Nomes Curriculares Oficiais)
                      </h4>
                      <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-black uppercase">
                            <th className="border border-black p-1.5 text-left">Disciplina</th>
                            <th className="border border-black p-1.5 text-center">Avaliações Lançadas</th>
                            <th className="border border-black p-1.5 text-center">Aprovações</th>
                            <th className="border border-black p-1.5 text-center">Reprov. / Recurso</th>
                            <th className="border border-black p-1.5 text-center">Taxa de Aprovação</th>
                            <th className="border border-black p-1.5 text-center">Média Arredondada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculoEstatisticas.linhasDisciplinas.map(ld => (
                            <tr key={ld.disciplinaId}>
                              <td className="border border-black p-1.5 font-bold">{ld.disciplinaNome}</td>
                              <td className="border border-black p-1.5 text-center">{ld.avaliados}</td>
                              <td className="border border-black p-1.5 text-center font-bold">{ld.aprovados}</td>
                              <td className="border border-black p-1.5 text-center">{ld.reprovadosRecurso}</td>
                              <td className="border border-black p-1.5 text-center font-bold">{ld.taxaAprovacao}%</td>
                              <td className="border border-black p-1.5 text-center font-bold">{ld.mediaArredondada}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. ACTIVIDADES REALIZADAS */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5 font-sans">
                  3. Actividades Pedagógicas Desenvolvidas
                </h3>
                <p className="text-xs leading-relaxed whitespace-pre-line">{atividadesRealizadas}</p>
              </div>

              {/* 4. DIFICULDADES & RECOMENDAÇÕES */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5 font-sans">
                  4. Dificuldades &amp; Constrangimentos
                </h3>
                <p className="text-xs leading-relaxed whitespace-pre-line">{dificuldadesConstrangimentos}</p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5 font-sans">
                  5. Recomendações &amp; Acções de Melhoria
                </h3>
                <p className="text-xs leading-relaxed whitespace-pre-line">{recomendacoes}</p>
              </div>

              {/* 6. OCORRÊNCIAS HOMOLOGADAS (OPCIONAL) */}
              {incluirOcorrencias && calculoEstatisticas.ocorrenciasLista.length > 0 && (
                <div className="space-y-1.5 font-sans">
                  <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5">
                    6. Ocorrências Disciplinares / Pedagógicas Homologadas no Dossiê
                  </h3>
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 font-black uppercase">
                        <th className="border border-black p-1 text-left">Data</th>
                        <th className="border border-black p-1 text-left">Estudante</th>
                        <th className="border border-black p-1 text-left">Turma</th>
                        <th className="border border-black p-1 text-left">Tipo / Gravidade</th>
                        <th className="border border-black p-1 text-left">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculoEstatisticas.ocorrenciasLista.slice(0, 15).map((oc, idx) => (
                        <tr key={`oc-${idx}`}>
                          <td className="border border-black p-1">{formatarDataAngolana(oc.data)}</td>
                          <td className="border border-black p-1 font-bold">{oc.alunoNome}</td>
                          <td className="border border-black p-1">{oc.turmaNome}</td>
                          <td className="border border-black p-1">
                            {oc.tipo}
                            {oc.gravidade ? ` (${oc.gravidade})` : ''}
                          </td>
                          <td className="border border-black p-1">{oc.descricao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECÇÕES PERSONALIZADAS ADICIONADAS PELO UTILIZADOR */}
              {secoesPersonalizadas.map((sec, idx) => (
                <div key={sec.id} className="space-y-1.5">
                  <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5 font-sans">
                    {idx + (incluirOcorrencias && calculoEstatisticas.ocorrenciasLista.length > 0 ? 7 : 6)}.{' '}
                    {sec.titulo || 'Informação Complementar'}
                  </h3>
                  <p className="text-xs leading-relaxed whitespace-pre-line">{sec.conteudo}</p>
                </div>
              ))}

              {/* CONCLUSÃO FINAL */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase border-b border-slate-400 pb-0.5 font-sans">
                  Conclusão Final
                </h3>
                <p className="text-xs leading-relaxed whitespace-pre-line text-justify">{conclusaoFinal}</p>
              </div>

              {/* ASSINATURAS COM CONCORDÂNCIA DE GÉNERO */}
              <div className="pt-6 border-t-2 border-black space-y-6 font-sans">
                <p className="text-[11px] text-center font-semibold">
                  {escola.municipio}, {escola.provincia}, aos {formatarDataAngolana(new Date())}.
                </p>

                <div
                  data-pdf-fixed-signatures="true"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-[11px]"
                >
                  <div>
                    <p className="font-bold uppercase text-black">{tituloCargoAutorDocumento}</p>
                    <div className="w-44 h-10 mx-auto border-b border-black mt-4" />
                    <p className="text-[10px] font-semibold text-slate-800 mt-1">{nomeAutorDocumento}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-black">{tituloSubdirPed}</p>
                    <div className="w-44 h-10 mx-auto border-b border-black mt-4" />
                    <p className="text-[10px] font-semibold text-slate-800 mt-1">{nomeSubdirPed}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-black">{tituloDiretor}</p>
                    <div className="w-44 h-10 mx-auto border-b border-black mt-4" />
                    <p className="text-[10px] font-semibold text-slate-800 mt-1">{nomeDiretor}</p>
                  </div>
                </div>

                <div
                  data-pdf-fixed-qr="true"
                  className="pt-3 border-t border-slate-300 flex items-center justify-between gap-3 text-[10px] text-slate-700 font-mono"
                >
                  <div>
                    <p>Emitido eletronicamente pelo SGE-NG em {formatarDataHoraAngolana(new Date())}</p>
                    <p className="font-bold text-black">{escola.nomeOficial || escola.nome}</p>
                  </div>
                  <OfficialQrCode
                    value={gerarPayloadQrDocumento({
                      docType:
                        mode === 'COORDENACAO_FINAL_ANO'
                          ? 'RELATORIO_FINAL_COORDENACAO'
                          : 'RELATORIO_PEDAGOGICO_DOCENTE',
                      escolaId: escola.id,
                      docRef: `${anoLectivo}-${periodoEfetivo}-${relatorioIdAtual || 'PREVIEW'}`,
                      anoLectivo
                    })}
                    size={56}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
