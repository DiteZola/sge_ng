import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Download,
  FileSpreadsheet,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ClipboardCheck,
  X,
  UserCheck,
  Wand2,
  Scale
} from 'lucide-react';
import {
  Escola,
  Funcionario,
  Turma,
  Disciplina,
  Aluno,
  AtribuicaoDocente,
  Trimestre,
  NivelEnsino,
  TipoProvaEscolar,
  HorarioProvaItem,
  ProfessorFiscalizadorItem,
  MapaFiscalizacaoProva,
  OcorrenciaAtaProva,
  AtaProvaRegistro
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { formatarDataAngolana } from '../utils/dateFormat';
import {
  isSegundoCiclo,
  getNivelEnsinoPorClasse,
  normalizarClasse,
  filtrarDisciplinasDaClasse,
  ordenarDisciplinas,
  ordenarClassesMED
} from '../services/academicHierarchyService';
import {
  obterNomeDiretorGeral,
  obterTituloDiretorGeral,
  obterNomeSubdiretorPedagogico,
  obterTituloSubdiretorPedagogico,
  obterTituloProfessor,
  flexionarGenero
} from '../utils/directorHelper';

interface ProvasFiscalizacaoViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  disciplinas: Disciplina[];
  alunos: Aluno[];
  funcionarios: Funcionario[];
  atribuicoes?: AtribuicaoDocente[];
}

type AbaProvas = 'horarios' | 'mapas' | 'atas';

const TIPOS_PROVA: TipoProvaEscolar[] = [
  'Prova Trimestral',
  'Exame Final',
  'Exame Nacional',
  'Prova de Recurso',
  'Prova Especial',
  'Prova do Professor'
];

const TIPOS_OCORRENCIA: OcorrenciaAtaProva['tipo'][] = [
  'Fraude / Cábulas',
  'Atraso',
  'Indisciplina',
  'Problema de Saúde',
  'Erro de Enunciado',
  'Outro'
];

function horariosSobrepoem(inicioA: string, fimA: string, inicioB: string, fimB: string): boolean {
  if (!inicioA || !fimA || !inicioB || !fimB) return false;
  return inicioA < fimB && inicioB < fimA;
}

function calcularDuracaoMinutos(inicio: string, fim: string): number | undefined {
  if (!inicio || !fim || !inicio.includes(':') || !fim.includes(':')) return undefined;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return undefined;
  const diff = h2 * 60 + m2 - (h1 * 60 + m1);
  return diff > 0 ? diff : undefined;
}

export const ProvasFiscalizacaoView: React.FC<ProvasFiscalizacaoViewProps> = ({
  escola,
  currentUser,
  turmas,
  disciplinas,
  alunos,
  funcionarios,
  atribuicoes
}) => {
  const anoActivo = escola.anoLectivoActivo || '';
  const podeGerirProvas = ['DiretorGeral', 'SubdiretorPedagogico', 'AdminGeral'].includes(currentUser.role);
  const isProfessor = currentUser.role === 'Professor';

  const [abaAtiva, setAbaAtiva] = useState<AbaProvas>('horarios');
  const [horarios, setHorarios] = useState<HorarioProvaItem[]>(() =>
    dbService.getHorariosProvas(escola.id, anoActivo)
  );
  const [mapas, setMapas] = useState<MapaFiscalizacaoProva[]>(() =>
    dbService.getMapasFiscalizacao(escola.id, anoActivo)
  );
  const [atas, setAtas] = useState<AtaProvaRegistro[]>(() =>
    dbService.getAtasProvas(escola.id, anoActivo)
  );
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [orientacaoHorarioMapa, setOrientacaoHorarioMapa] = useState<'landscape' | 'portrait'>('landscape');
  const [orientacaoAta, setOrientacaoAta] = useState<'portrait' | 'landscape'>('portrait');

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroTipoProva, setFiltroTipoProva] = useState<string>('TODOS');
  const [filtroClasse, setFiltroClasse] = useState<string>('TODAS');
  const [filtroTurmaId, setFiltroTurmaId] = useState<string>('TODAS');
  const [apenasMinhasProvas, setApenasMinhasProvas] = useState<boolean>(false);

  // Modal Horário de Prova
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [editHorarioId, setEditHorarioId] = useState<string | null>(null);
  const [hpTipoProva, setHpTipoProva] = useState<TipoProvaEscolar>('Prova Trimestral');
  const [hpTrimestre, setHpTrimestre] = useState<HorarioProvaItem['trimestre']>(escola.trimestreActivo || '1');
  const [hpTurmaId, setHpTurmaId] = useState<string>('');
  const [hpDisciplinaId, setHpDisciplinaId] = useState<string>('');
  const [hpData, setHpData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hpHoraInicio, setHpHoraInicio] = useState<string>('08:00');
  const [hpHoraFim, setHpHoraFim] = useState<string>('10:00');
  const [hpSala, setHpSala] = useState<string>('');
  const [hpObservacoes, setHpObservacoes] = useState<string>('');

  // Modal Mapa de Fiscalização (1 a 4 professores por turma)
  const [showMapaModal, setShowMapaModal] = useState(false);
  const [editMapaId, setEditMapaId] = useState<string | null>(null);
  const [mpHorarioId, setMpHorarioId] = useState<string>('');
  const [mpFiscais, setMpFiscais] = useState<ProfessorFiscalizadorItem[]>([]);
  const [mpInstrucoes, setMpInstrucoes] = useState<string>('');

  // Modal Escala Automática Equilibrada
  const [showAutoEscalaModal, setShowAutoEscalaModal] = useState(false);
  const [autoQtdFiscais, setAutoQtdFiscais] = useState<1 | 2 | 3 | 4>(2);
  const [autoEscopo, setAutoEscopo] = useState<'apenas_pendentes' | 'filtradas' | 'todas'>('apenas_pendentes');
  const [autoInstrucoes, setAutoInstrucoes] = useState<string>(
    'Conferir BI/Passe Escolar à entrada, recolher telemóveis e rubricar a folha de presença e a ata final.'
  );

  // Modal Ata da Prova
  const [showAtaModal, setShowAtaModal] = useState(false);
  const [editAtaId, setEditAtaId] = useState<string | null>(null);
  const [ataMapaId, setAtaMapaId] = useState<string>('');
  const [ataHoraInicioReal, setAtaHoraInicioReal] = useState<string>('08:00');
  const [ataHoraFimReal, setAtaHoraFimReal] = useState<string>('10:00');
  const [ataMatriculados, setAtaMatriculados] = useState<number>(0);
  const [ataPresentes, setAtaPresentes] = useState<number>(0);
  const [ataFaltosos, setAtaFaltosos] = useState<number>(0);
  const [ataAnulados, setAtaAnulados] = useState<number>(0);
  const [ataOcorrencias, setAtaOcorrencias] = useState<OcorrenciaAtaProva[]>([]);
  const [ataSintese, setAtaSintese] = useState<string>('');
  const [ataObservacoesGerais, setAtaObservacoesGerais] = useState<string>('');
  const [ataEstado, setAtaEstado] = useState<'Rascunho' | 'Finalizada'>('Rascunho');

  // Novo item de ocorrência dentro do modal de Ata
  const [ocHora, setOcHora] = useState('08:45');
  const [ocAlunoId, setOcAlunoId] = useState('');
  const [ocAlunoNomeManual, setOcAlunoNomeManual] = useState('');
  const [ocTipo, setOcTipo] = useState<OcorrenciaAtaProva['tipo']>('Fraude / Cábulas');
  const [ocDescricao, setOcDescricao] = useState('');
  const [ocMedida, setOcMedida] = useState('');

  // Preview / PDF Ata selecionada
  const [ataParaPdf, setAtaParaPdf] = useState<AtaProvaRegistro | null>(null);

  // Confirmação de eliminação inline
  const [itemParaEliminar, setItemParaEliminar] = useState<{
    tipo: 'horario' | 'mapa' | 'ata';
    id: string;
    rotulo: string;
  } | null>(null);

  const recarregarTudo = () => {
    setHorarios(dbService.getHorariosProvas(escola.id, anoActivo));
    setMapas(dbService.getMapasFiscalizacao(escola.id, anoActivo));
    setAtas(dbService.getAtasProvas(escola.id, anoActivo));
    setConfigSistema(dbService.getConfiguracaoSistema());
  };

  useEffect(() => {
    recarregarTudo();
  }, [escola.id, anoActivo]);

  useEffect(() => {
    const onRemote = () => recarregarTudo();
    window.addEventListener('sge_dados_atualizados_remoto', onRemote);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', onRemote);
  }, [escola.id, anoActivo]);

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Lista de professores elegíveis para fiscalização
  const professoresDisponiveis = useMemo(() => {
    return funcionarios
      .filter(f =>
        f.ativo !== false &&
        f.role !== 'AdminGeral' &&
        f.role !== 'Encarregado' &&
        (f.ehProfessor ||
          f.role === 'Professor' ||
          f.role === 'CoordenadorDisciplina' ||
          f.role === 'CoordenadorTurno' ||
          f.role === 'CoordenadorPedagogico' ||
          f.ehAdministrativoQueLeciona)
      )
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt'));
  }, [funcionarios]);

  const turmasDoAno = useMemo(() => {
    return turmas
      .filter(t => !anoActivo || !t.anoLectivo || t.anoLectivo === anoActivo)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  }, [turmas, anoActivo]);

  const classesDisponiveis = useMemo(() => {
    return ordenarClassesMED(turmasDoAno.map(t => normalizarClasse(t.classe)).filter(Boolean));
  }, [turmasDoAno]);

  // Disciplinas filtradas pela turma escolhida no modal de Horário
  const turmaSelecionadaModal = useMemo(
    () => turmasDoAno.find(t => t.id === hpTurmaId) || turmasDoAno[0],
    [turmasDoAno, hpTurmaId]
  );

  const disciplinasParaTurmaModal = useMemo(() => {
    if (!turmaSelecionadaModal) return ordenarDisciplinas(disciplinas);
    const cursoRef = isSegundoCiclo(turmaSelecionadaModal.classe) ? turmaSelecionadaModal.curso : undefined;
    const filtradas = filtrarDisciplinasDaClasse(disciplinas, turmaSelecionadaModal.classe, cursoRef);
    return ordenarDisciplinas(filtradas.length > 0 ? filtradas : disciplinas, turmaSelecionadaModal.classe, cursoRef);
  }, [disciplinas, turmaSelecionadaModal]);

  // Mapas e Atas helper lookup
  const mapasPorHorarioId = useMemo(() => {
    const map = new Map<string, MapaFiscalizacaoProva>();
    mapas.forEach(m => map.set(m.horarioProvaId, m));
    return map;
  }, [mapas]);

  const atasPorMapaId = useMemo(() => {
    const map = new Map<string, AtaProvaRegistro>();
    atas.forEach(a => map.set(a.mapaFiscalizacaoId, a));
    return map;
  }, [atas]);

  // Verificação de conflitos de fiscalizadores em outros mapas no mesmo dia/hora
  const conflitosFiscaisModal = useMemo(() => {
    const horarioRef = horarios.find(h => h.id === mpHorarioId);
    if (!horarioRef) return [];
    const alertas: string[] = [];
    mpFiscais.forEach(fiscal => {
      if (!fiscal.professorId) return;
      const choque = mapas.find(
        m =>
          m.id !== editMapaId &&
          m.horarioProvaId !== horarioRef.id &&
          m.data === horarioRef.data &&
          horariosSobrepoem(m.horaInicio, m.horaFim, horarioRef.horaInicio, horarioRef.horaFim) &&
          m.fiscais.some(f => f.professorId === fiscal.professorId)
      );
      if (choque) {
        alertas.push(
          `${fiscal.professorNome} já está escalado(a) na turma ${choque.turmaNome} (${choque.disciplinaNome}) das ${choque.horaInicio} às ${choque.horaFim}.`
        );
      }
    });
    return alertas;
  }, [horarios, mpHorarioId, mpFiscais, mapas, editMapaId]);

  // Filtros aplicados às listas
  const horariosFiltrados = useMemo(() => {
    return horarios.filter(h => {
      if (filtroTipoProva !== 'TODOS' && h.tipoProva !== filtroTipoProva) return false;
      if (filtroClasse !== 'TODAS' && normalizarClasse(h.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroTurmaId !== 'TODAS' && h.turmaId !== filtroTurmaId) return false;
      if (apenasMinhasProvas) {
        const mapa = mapasPorHorarioId.get(h.id);
        if (!mapa || !mapa.fiscais.some(f => f.professorId === currentUser.id)) return false;
      }
      if (busca.trim()) {
        const q = busca.toLowerCase().trim();
        const txt = `${h.disciplinaNome} ${h.turmaNome} ${h.classe} ${h.curso || ''} ${h.sala || ''} ${h.tipoProva}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [horarios, filtroTipoProva, filtroClasse, filtroTurmaId, apenasMinhasProvas, busca, mapasPorHorarioId, currentUser.id]);

  const mapasFiltrados = useMemo(() => {
    return mapas.filter(m => {
      if (filtroTipoProva !== 'TODOS' && m.tipoProva !== filtroTipoProva) return false;
      if (filtroClasse !== 'TODAS' && normalizarClasse(m.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroTurmaId !== 'TODAS' && m.turmaId !== filtroTurmaId) return false;
      if (apenasMinhasProvas && !m.fiscais.some(f => f.professorId === currentUser.id)) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase().trim();
        const fiscaisTxt = m.fiscais.map(f => f.professorNome).join(' ');
        const txt = `${m.disciplinaNome} ${m.turmaNome} ${m.classe} ${m.curso || ''} ${fiscaisTxt}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [mapas, filtroTipoProva, filtroClasse, filtroTurmaId, apenasMinhasProvas, busca, currentUser.id]);

  const atasFiltradas = useMemo(() => {
    return atas.filter(a => {
      if (filtroTipoProva !== 'TODOS' && a.tipoProva !== filtroTipoProva) return false;
      if (filtroClasse !== 'TODAS' && normalizarClasse(a.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroTurmaId !== 'TODAS' && a.turmaId !== filtroTurmaId) return false;
      if (apenasMinhasProvas && !a.fiscais.some(f => f.professorId === currentUser.id) && a.redigidaPorId !== currentUser.id) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase().trim();
        const txt = `${a.disciplinaNome} ${a.turmaNome} ${a.sinteseOcorrido} ${a.redigidaPorNome}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [atas, filtroTipoProva, filtroClasse, filtroTurmaId, apenasMinhasProvas, busca, currentUser.id]);

  // Mapeamento de vínculos docentes (classe, turma, disciplina) para impedir conflitos na escala
  const perfilDocentePorProfId = useMemo(() => {
    const normTxt = (v?: string) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const mapaPerfil = new Map<
      string,
      {
        turmasIds: Set<string>;
        disciplinasIds: Set<string>;
        disciplinasNomes: Set<string>;
        classesNorm: Set<string>;
      }
    >();

    const getOrCreate = (profId: string) => {
      let item = mapaPerfil.get(profId);
      if (!item) {
        item = {
          turmasIds: new Set<string>(),
          disciplinasIds: new Set<string>(),
          disciplinasNomes: new Set<string>(),
          classesNorm: new Set<string>()
        };
        mapaPerfil.set(profId, item);
      }
      return item;
    };

    const atribsOrigem =
      atribuicoes && atribuicoes.length > 0
        ? atribuicoes
        : dbService.getAtribuicoes(escola.id, anoActivo || 'todos');

    atribsOrigem
      .filter(a => !anoActivo || !a.anoLectivo || a.anoLectivo === anoActivo)
      .forEach(a => {
        if (!a.professorId) return;
        const p = getOrCreate(a.professorId);
        if (a.turmaId) p.turmasIds.add(a.turmaId);
        if (a.disciplinaId) p.disciplinasIds.add(a.disciplinaId);
        const discObj = disciplinas.find(d => d.id === a.disciplinaId);
        const discNome = normTxt(a.disciplinaNome || discObj?.nome);
        if (discNome) p.disciplinasNomes.add(discNome);
        const turmaObj = turmasDoAno.find(t => t.id === a.turmaId);
        const clNorm = normTxt(normalizarClasse(a.classe || turmaObj?.classe || ''));
        if (clNorm) p.classesNorm.add(clNorm);
      });

    const horariosAula = dbService.obterHorarios(escola.id, anoActivo || undefined);
    horariosAula.forEach(ha => {
      const profId =
        ha.professorId ||
        professoresDisponiveis.find(pr => normTxt(pr.nomeCompleto) === normTxt(ha.professorNome))?.id;
      if (!profId) return;
      const p = getOrCreate(profId);
      if (ha.turmaId) p.turmasIds.add(ha.turmaId);
      if (ha.disciplinaId) p.disciplinasIds.add(ha.disciplinaId);
      if (ha.disciplinaNome) p.disciplinasNomes.add(normTxt(ha.disciplinaNome));
      const turmaObj = turmasDoAno.find(t => t.id === ha.turmaId);
      const clNorm = normTxt(normalizarClasse(ha.classe || turmaObj?.classe || ''));
      if (clNorm) p.classesNorm.add(clNorm);
    });

    return mapaPerfil;
  }, [atribuicoes, escola.id, anoActivo, disciplinas, turmasDoAno, professoresDisponiveis]);

  const avaliarConflitoDocenteProva = (
    profId: string,
    prova: Pick<HorarioProvaItem, 'classe' | 'turmaId' | 'disciplinaId' | 'disciplinaNome'>
  ): { tier: 0 | 1 | 2 | 3 | 4; motivo: string } => {
    const perfil = perfilDocentePorProfId.get(profId);
    if (!perfil) return { tier: 0, motivo: 'Sem conflito' };

    const normTxt = (v?: string) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const lecTurma = Boolean(prova.turmaId && perfil.turmasIds.has(prova.turmaId));
    const lecDisciplina = Boolean(
      (prova.disciplinaId && perfil.disciplinasIds.has(prova.disciplinaId)) ||
        (prova.disciplinaNome && perfil.disciplinasNomes.has(normTxt(prova.disciplinaNome)))
    );
    const clNorm = normTxt(normalizarClasse(prova.classe || ''));
    const lecClasse = Boolean(clNorm && perfil.classesNorm.has(clNorm));

    if (!lecClasse && !lecTurma && !lecDisciplina) {
      return { tier: 0, motivo: 'Sem conflito' };
    }
    if (lecClasse && !lecTurma && !lecDisciplina) {
      return { tier: 1, motivo: `Leciona na ${prova.classe}` };
    }
    if (!lecTurma && lecDisciplina) {
      return {
        tier: 2,
        motivo: lecClasse ? `Leciona ${prova.disciplinaNome} e na ${prova.classe}` : `Leciona ${prova.disciplinaNome}`
      };
    }
    if (lecTurma && !lecDisciplina) {
      return { tier: 3, motivo: 'Leciona na mesma turma' };
    }
    return { tier: 4, motivo: 'Leciona a turma e a disciplina da prova' };
  };

  // Estatísticas de equilíbrio de dias e provas por professor para os mapas filtrados
  const equilibrioPorProfessor = useMemo(() => {
    const mapa = new Map<
      string,
      {
        professorId: string;
        professorNome: string;
        diasSet: Set<string>;
        totalProvas: number;
        comoPrincipal: number;
        comoAdjunto: number;
      }
    >();

    mapasFiltrados.forEach(m => {
      m.fiscais.forEach(f => {
        if (!f.professorId) return;
        const curr = mapa.get(f.professorId) || {
          professorId: f.professorId,
          professorNome: f.professorNome,
          diasSet: new Set<string>(),
          totalProvas: 0,
          comoPrincipal: 0,
          comoAdjunto: 0
        };
        if (m.data) curr.diasSet.add(m.data);
        curr.totalProvas += 1;
        if (f.papelFiscalizacao === 'Fiscal Principal') curr.comoPrincipal += 1;
        else curr.comoAdjunto += 1;
        mapa.set(f.professorId, curr);
      });
    });

    const lista = Array.from(mapa.values())
      .map(item => ({
        professorId: item.professorId,
        professorNome: item.professorNome,
        diasEscalados: item.diasSet.size,
        datasOrdenadas: Array.from(item.diasSet).sort(),
        totalProvas: item.totalProvas,
        comoPrincipal: item.comoPrincipal,
        comoAdjunto: item.comoAdjunto
      }))
      .sort((a, b) => b.diasEscalados - a.diasEscalados || b.totalProvas - a.totalProvas || a.professorNome.localeCompare(b.professorNome, 'pt'));

    const minDias = lista.length > 0 ? Math.min(...lista.map(x => x.diasEscalados)) : 0;
    const maxDias = lista.length > 0 ? Math.max(...lista.map(x => x.diasEscalados)) : 0;
    const minProvas = lista.length > 0 ? Math.min(...lista.map(x => x.totalProvas)) : 0;
    const maxProvas = lista.length > 0 ? Math.max(...lista.map(x => x.totalProvas)) : 0;

    return { lista, minDias, maxDias, minProvas, maxProvas };
  }, [mapasFiltrados]);

  const provasAlvoAuto = useMemo(() => {
    if (autoEscopo === 'apenas_pendentes') {
      return horarios.filter(h => !mapasPorHorarioId.has(h.id));
    }
    if (autoEscopo === 'filtradas') {
      return horariosFiltrados;
    }
    return horarios;
  }, [autoEscopo, horarios, horariosFiltrados, mapasPorHorarioId]);

  // Handlers: Horário de Prova
  const abrirNovoHorario = () => {
    const primeiraTurma = turmasDoAno[0];
    setEditHorarioId(null);
    setHpTipoProva('Prova Trimestral');
    setHpTrimestre(escola.trimestreActivo || '1');
    setHpTurmaId(primeiraTurma?.id || '');
    const discs = primeiraTurma
      ? filtrarDisciplinasDaClasse(disciplinas, primeiraTurma.classe, isSegundoCiclo(primeiraTurma.classe) ? primeiraTurma.curso : undefined)
      : disciplinas;
    setHpDisciplinaId((discs[0] || disciplinas[0])?.id || '');
    setHpData(new Date().toISOString().split('T')[0]);
    setHpHoraInicio('08:00');
    setHpHoraFim('10:00');
    setHpSala(primeiraTurma?.sala || '');
    setHpObservacoes('');
    setShowHorarioModal(true);
  };

  const abrirEditarHorario = (h: HorarioProvaItem) => {
    setEditHorarioId(h.id);
    setHpTipoProva(h.tipoProva);
    setHpTrimestre(h.trimestre);
    setHpTurmaId(h.turmaId);
    setHpDisciplinaId(h.disciplinaId);
    setHpData(h.data);
    setHpHoraInicio(h.horaInicio);
    setHpHoraFim(h.horaFim);
    setHpSala(h.sala || '');
    setHpObservacoes(h.observacoes || '');
    setShowHorarioModal(true);
  };

  const handleSalvarHorario = (e: React.FormEvent) => {
    e.preventDefault();
    const turma = turmasDoAno.find(t => t.id === hpTurmaId);
    const disc = disciplinas.find(d => d.id === hpDisciplinaId);
    if (!turma || !disc || !hpData || !hpHoraInicio || !hpHoraFim) {
      mostrarFeedback('erro', 'Selecione a turma, disciplina, data e hora de início/fim.');
      return;
    }
    if (hpHoraFim <= hpHoraInicio) {
      mostrarFeedback('erro', 'A hora de fim deve ser posterior à hora de início.');
      return;
    }
    const ehSec = isSegundoCiclo(turma.classe);
    const nivel = getNivelEnsinoPorClasse(turma.classe) as NivelEnsino;
    const salvo = dbService.salvarHorarioProva({
      id: editHorarioId || `hp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      anoLectivo: anoActivo,
      trimestre: hpTrimestre,
      tipoProva: hpTipoProva,
      nivelEnsino: nivel,
      classe: turma.classe,
      curso: ehSec ? turma.curso : undefined,
      turmaId: turma.id,
      turmaNome: turma.nome,
      disciplinaId: disc.id,
      disciplinaNome: disc.nome,
      data: hpData,
      horaInicio: hpHoraInicio,
      horaFim: hpHoraFim,
      sala: hpSala.trim() || turma.sala || undefined,
      duracaoMinutos: calcularDuracaoMinutos(hpHoraInicio, hpHoraFim),
      observacoes: hpObservacoes.trim() || undefined,
      criadoPorId: currentUser.id,
      criadoPorNome: currentUser.nomeCompleto,
      criadoEm: new Date().toISOString()
    });

    // Se já existir mapa ligado a este horário, sincronizar metadados do horário no mapa
    const mapaVinculado = mapas.find(m => m.horarioProvaId === salvo.id);
    if (mapaVinculado) {
      dbService.salvarMapaFiscalizacao({
        ...mapaVinculado,
        turmaId: salvo.turmaId,
        turmaNome: salvo.turmaNome,
        classe: salvo.classe,
        curso: salvo.curso,
        disciplinaId: salvo.disciplinaId,
        disciplinaNome: salvo.disciplinaNome,
        tipoProva: salvo.tipoProva,
        trimestre: String(salvo.trimestre),
        data: salvo.data,
        horaInicio: salvo.horaInicio,
        horaFim: salvo.horaFim,
        sala: salvo.sala
      });
    }

    recarregarTudo();
    setShowHorarioModal(false);
    mostrarFeedback('sucesso', editHorarioId ? 'Horário de prova atualizado.' : 'Horário de prova registado com sucesso.');
  };

  // Handlers: Mapa de Fiscalização (1 a 4 professores por turma)
  const abrirModalMapa = (horarioAlvo?: HorarioProvaItem, mapaExistente?: MapaFiscalizacaoProva) => {
    const h = horarioAlvo || (mapaExistente ? horarios.find(item => item.id === mapaExistente.horarioProvaId) : horarios[0]);
    if (!h) {
      mostrarFeedback('erro', 'Crie primeiro pelo menos um Horário de Prova para poder escalar os fiscalizadores.');
      return;
    }
    setEditMapaId(mapaExistente?.id || null);
    setMpHorarioId(h.id);
    if (mapaExistente && mapaExistente.fiscais.length > 0) {
      setMpFiscais(mapaExistente.fiscais.map(f => ({ ...f })));
      setMpInstrucoes(mapaExistente.instrucoes || '');
    } else {
      const primeiroProf = professoresDisponiveis[0];
      setMpFiscais(
        primeiroProf
          ? [{ professorId: primeiroProf.id, professorNome: primeiroProf.nomeCompleto, papelFiscalizacao: 'Fiscal Principal' }]
          : []
      );
      setMpInstrucoes('');
    }
    setShowMapaModal(true);
  };

  const handleToggleFiscalSlot = (idx: number, professorId: string) => {
    const prof = professoresDisponiveis.find(p => p.id === professorId);
    if (!prof) return;
    setMpFiscais(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        professorId: prof.id,
        professorNome: prof.nomeCompleto
      };
      return copy;
    });
  };

  const handleAdicionarSlotFiscal = () => {
    if (mpFiscais.length >= 4) return;
    const jaEscolhidos = new Set(mpFiscais.map(f => f.professorId));
    const proximo = professoresDisponiveis.find(p => !jaEscolhidos.has(p.id)) || professoresDisponiveis[0];
    if (!proximo) return;
    setMpFiscais(prev => [
      ...prev,
      {
        professorId: proximo.id,
        professorNome: proximo.nomeCompleto,
        papelFiscalizacao: prev.length === 0 ? 'Fiscal Principal' : 'Fiscal Adjunto'
      }
    ]);
  };

  const handleRemoverSlotFiscal = (idx: number) => {
    if (mpFiscais.length <= 1) return;
    setMpFiscais(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSalvarMapa = (e: React.FormEvent) => {
    e.preventDefault();
    const h = horarios.find(item => item.id === mpHorarioId);
    if (!h) {
      mostrarFeedback('erro', 'Selecione um horário de prova válido.');
      return;
    }
    const fiscaisLimpos = mpFiscais.filter(f => f.professorId && f.professorNome);
    if (fiscaisLimpos.length < 1 || fiscaisLimpos.length > 4) {
      mostrarFeedback('erro', 'Cada turma deve ter entre 1 e 4 professores fiscalizadores.');
      return;
    }
    const idsUnicos = new Set(fiscaisLimpos.map(f => f.professorId));
    if (idsUnicos.size !== fiscaisLimpos.length) {
      mostrarFeedback('erro', 'Não repita o mesmo professor na mesma turma.');
      return;
    }

    dbService.salvarMapaFiscalizacao({
      id: editMapaId || `mp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      anoLectivo: anoActivo,
      horarioProvaId: h.id,
      turmaId: h.turmaId,
      turmaNome: h.turmaNome,
      classe: h.classe,
      curso: isSegundoCiclo(h.classe) ? h.curso : undefined,
      disciplinaId: h.disciplinaId,
      disciplinaNome: h.disciplinaNome,
      tipoProva: h.tipoProva,
      trimestre: String(h.trimestre),
      data: h.data,
      horaInicio: h.horaInicio,
      horaFim: h.horaFim,
      sala: h.sala,
      fiscais: fiscaisLimpos,
      instrucoes: mpInstrucoes.trim() || undefined,
      criadoPorId: currentUser.id,
      criadoPorNome: currentUser.nomeCompleto,
      criadoEm: new Date().toISOString()
    });

    recarregarTudo();
    setShowMapaModal(false);
    mostrarFeedback('sucesso', `Mapa de fiscalização guardado com ${fiscaisLimpos.length} fiscalizador(es).`);
  };

  // Algoritmo de Escala Automática Equilibrada de Fiscalizadores
  const abrirModalEscalaAutomatica = () => {
    if (horarios.length === 0) {
      mostrarFeedback('erro', 'Cadastre primeiro os horários de provas para gerar a escala automática.');
      return;
    }
    if (professoresDisponiveis.length === 0) {
      mostrarFeedback('erro', 'Não existem professores ativos elegíveis para escalar.');
      return;
    }
    const temPendentes = horarios.some(h => !mapasPorHorarioId.has(h.id));
    setAutoEscopo(temPendentes ? 'apenas_pendentes' : 'filtradas');
    setShowAutoEscalaModal(true);
  };

  const handleExecutarEscalaAutomatica = (e: React.FormEvent) => {
    e.preventDefault();
    if (provasAlvoAuto.length === 0) {
      mostrarFeedback('erro', 'Não há provas disponíveis neste âmbito para escalar.');
      return;
    }
    if (professoresDisponiveis.length === 0) {
      mostrarFeedback('erro', 'Não há professores elegíveis na escola.');
      return;
    }

    const qtdPorProva = Math.min(4, Math.max(1, autoQtdFiscais));
    const alvoIds = new Set(provasAlvoAuto.map(p => p.id));
    const mapasMantidos = mapas.filter(m => !alvoIds.has(m.horarioProvaId));

    interface SlotOcupado {
      horarioProvaId: string;
      data: string;
      horaInicio: string;
      horaFim: string;
    }

    interface AlocacaoPlano {
      prova: HorarioProvaItem;
      profIds: string[];
      maxTier: number;
      motivosConflito: string[];
    }

    const profIndexMap = new Map<string, number>();
    professoresDisponiveis.forEach((p, idx) => profIndexMap.set(p.id, idx));

    const ocupacaoFixaPorProf = new Map<string, SlotOcupado[]>();
    const diasFixosPorProf = new Map<string, Map<string, number>>();
    const totalFixoPorProf = new Map<string, number>();

    professoresDisponiveis.forEach(p => {
      ocupacaoFixaPorProf.set(p.id, []);
      diasFixosPorProf.set(p.id, new Map<string, number>());
      totalFixoPorProf.set(p.id, 0);
    });

    mapasMantidos.forEach(m => {
      m.fiscais.forEach(f => {
        if (!f.professorId) return;
        const occ = ocupacaoFixaPorProf.get(f.professorId) || [];
        occ.push({ horarioProvaId: m.horarioProvaId, data: m.data, horaInicio: m.horaInicio, horaFim: m.horaFim });
        ocupacaoFixaPorProf.set(f.professorId, occ);

        const dMap = diasFixosPorProf.get(f.professorId) || new Map<string, number>();
        dMap.set(m.data, (dMap.get(m.data) || 0) + 1);
        diasFixosPorProf.set(f.professorId, dMap);

        totalFixoPorProf.set(f.professorId, (totalFixoPorProf.get(f.professorId) || 0) + 1);
      });
    });

    // Ordenar provas alvo: primeiro as com menos candidatos Tier-0 (sem conflito), depois data/hora
    const provasOrdenadas = [...provasAlvoAuto].sort((a, b) => {
      const freeA = professoresDisponiveis.filter(p => avaliarConflitoDocenteProva(p.id, a).tier === 0).length;
      const freeB = professoresDisponiveis.filter(p => avaliarConflitoDocenteProva(p.id, b).tier === 0).length;
      if (freeA !== freeB) return freeA - freeB;
      return (a.data || '').localeCompare(b.data || '') || (a.horaInicio || '').localeCompare(b.horaInicio || '');
    });

    const plano: AlocacaoPlano[] = [];

    const temSobreposicaoNoPlano = (profId: string, prova: HorarioProvaItem, planoAtual: AlocacaoPlano[], ignoreIdx?: number) => {
      const fixas = ocupacaoFixaPorProf.get(profId) || [];
      if (fixas.some(s => s.horarioProvaId !== prova.id && s.data === prova.data && horariosSobrepoem(s.horaInicio, s.horaFim, prova.horaInicio, prova.horaFim))) {
        return true;
      }
      for (let i = 0; i < planoAtual.length; i++) {
        if (i === ignoreIdx) continue;
        const al = planoAtual[i];
        if (!al.profIds.includes(profId)) continue;
        if (al.prova.data === prova.data && horariosSobrepoem(al.prova.horaInicio, al.prova.horaFim, prova.horaInicio, prova.horaFim)) {
          return true;
        }
      }
      return false;
    };

    const calcularCargaPorProf = (planoAtual: AlocacaoPlano[]) => {
      const diasPorProf = new Map<string, Map<string, number>>();
      const totalPorProf = new Map<string, number>();
      professoresDisponiveis.forEach(p => {
        const dCopy = new Map<string, number>(diasFixosPorProf.get(p.id) || []);
        diasPorProf.set(p.id, dCopy);
        totalPorProf.set(p.id, totalFixoPorProf.get(p.id) || 0);
      });
      planoAtual.forEach(al => {
        al.profIds.forEach(pid => {
          const dMap = diasPorProf.get(pid);
          if (dMap) {
            dMap.set(al.prova.data, (dMap.get(al.prova.data) || 0) + 1);
          }
          totalPorProf.set(pid, (totalPorProf.get(pid) || 0) + 1);
        });
      });
      return { diasPorProf, totalPorProf };
    };

    // Passo 1: Construção Gulosa com Prioridade Estrita Sem Conflitos + Equilíbrio de Dias
    let cursorRotacao = 0;
    const N = professoresDisponiveis.length;

    for (const prova of provasOrdenadas) {
      const escolhidos: string[] = [];
      let maxTier = 0;
      const motivosConflito: string[] = [];

      for (let slot = 0; slot < qtdPorProva; slot++) {
        const { diasPorProf, totalPorProf } = calcularCargaPorProf(plano);
        const candidatos = professoresDisponiveis
          .filter(p => !escolhidos.includes(p.id) && !temSobreposicaoNoPlano(p.id, prova, plano))
          .map(p => {
            const conf = avaliarConflitoDocenteProva(p.id, prova);
            const dMap = diasPorProf.get(p.id) || new Map<string, number>();
            const diasCount = dMap.size;
            const totalCount = totalPorProf.get(p.id) || 0;
            const mesmoDiaCount = dMap.get(prova.data) || 0;
            const idxOrig = profIndexMap.get(p.id) || 0;
            const rotOrder = (idxOrig - cursorRotacao + N) % N;
            return { prof: p, conf, diasCount, totalCount, mesmoDiaCount, rotOrder };
          })
          .sort((a, b) => {
            if (a.conf.tier !== b.conf.tier) return a.conf.tier - b.conf.tier;
            if (a.diasCount !== b.diasCount) return a.diasCount - b.diasCount;
            if (a.totalCount !== b.totalCount) return a.totalCount - b.totalCount;
            if (a.mesmoDiaCount !== b.mesmoDiaCount) return a.mesmoDiaCount - b.mesmoDiaCount;
            return a.rotOrder - b.rotOrder;
          });

        if (candidatos.length === 0) break;
        const melhor = candidatos[0];
        escolhidos.push(melhor.prof.id);
        if (melhor.conf.tier > maxTier) maxTier = melhor.conf.tier;
        if (melhor.conf.tier > 0) {
          motivosConflito.push(`${melhor.prof.nomeCompleto}: ${melhor.conf.motivo}`);
        }
        cursorRotacao = (cursorRotacao + 1) % N;
      }

      if (escolhidos.length > 0) {
        plano.push({
          prova,
          profIds: escolhidos,
          maxTier,
          motivosConflito
        });
      }
    }

    // Passo 2: Reequilíbrio Global por Trocas (minimiza diferença de dias escalados e total de provas entre professores)
    const calcularScoreDesequilibrio = (planoAtual: AlocacaoPlano[]) => {
      const { diasPorProf, totalPorProf } = calcularCargaPorProf(planoAtual);
      const diasArr = professoresDisponiveis.map(p => (diasPorProf.get(p.id) || new Map()).size);
      const totArr = professoresDisponiveis.map(p => totalPorProf.get(p.id) || 0);
      const maxD = Math.max(...diasArr);
      const minD = Math.min(...diasArr);
      const sumSqD = diasArr.reduce((acc, v) => acc + v * v, 0);
      const maxT = Math.max(...totArr);
      const minT = Math.min(...totArr);
      const sumSqT = totArr.reduce((acc, v) => acc + v * v, 0);
      return [maxD - minD, sumSqD, maxT - minT, sumSqT] as const;
    };

    const ehScoreMelhor = (a: readonly number[], b: readonly number[]) => {
      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) return true;
        if (a[i] > b[i]) return false;
      }
      return false;
    };

    let scoreAtual = calcularScoreDesequilibrio(plano);
    for (let iter = 0; iter < 250; iter++) {
      let melhorou = false;

      // 2a. Substituição simples de um fiscal por outro com menos dias/provas (sem piorar nível de conflito)
      for (let idxAl = 0; idxAl < plano.length && !melhorou; idxAl++) {
        const al = plano[idxAl];
        for (let sIdx = 0; sIdx < al.profIds.length && !melhorou; sIdx++) {
          const profAtualId = al.profIds[sIdx];
          const tierAtual = avaliarConflitoDocenteProva(profAtualId, al.prova).tier;

          for (const cand of professoresDisponiveis) {
            if (cand.id === profAtualId || al.profIds.includes(cand.id)) continue;
            if (temSobreposicaoNoPlano(cand.id, al.prova, plano, idxAl)) continue;
            const tierCand = avaliarConflitoDocenteProva(cand.id, al.prova).tier;
            if (tierCand > tierAtual) continue;

            const copiaProfIds = [...al.profIds];
            copiaProfIds[sIdx] = cand.id;
            const planoTeste = plano.map((item, k) => (k === idxAl ? { ...item, profIds: copiaProfIds } : item));
            const novoScore = calcularScoreDesequilibrio(planoTeste);
            if (ehScoreMelhor(novoScore, scoreAtual)) {
              plano[idxAl].profIds = copiaProfIds;
              scoreAtual = novoScore;
              melhorou = true;
              break;
            }
          }
        }
      }

      // 2b. Troca cruzada entre duas provas de datas distintas se reduzir desigualdade de dias
      if (!melhorou && plano.length > 1) {
        for (let i = 0; i < plano.length && !melhorou; i++) {
          for (let j = i + 1; j < plano.length && !melhorou; j++) {
            const alA = plano[i];
            const alB = plano[j];
            if (alA.prova.data === alB.prova.data) continue;

            for (let sA = 0; sA < alA.profIds.length && !melhorou; sA++) {
              for (let sB = 0; sB < alB.profIds.length && !melhorou; sB++) {
                const pA = alA.profIds[sA];
                const pB = alB.profIds[sB];
                if (pA === pB || alA.profIds.includes(pB) || alB.profIds.includes(pA)) continue;

                const tierAOrig = avaliarConflitoDocenteProva(pA, alA.prova).tier;
                const tierBOrig = avaliarConflitoDocenteProva(pB, alB.prova).tier;
                const tierBNovo = avaliarConflitoDocenteProva(pB, alA.prova).tier;
                const tierANovo = avaliarConflitoDocenteProva(pA, alB.prova).tier;
                if (tierBNovo > tierAOrig || tierANovo > tierBOrig) continue;

                if (temSobreposicaoNoPlano(pB, alA.prova, plano, i) || temSobreposicaoNoPlano(pA, alB.prova, plano, j)) {
                  continue;
                }

                const idsA = [...alA.profIds];
                idsA[sA] = pB;
                const idsB = [...alB.profIds];
                idsB[sB] = pA;
                const planoTeste = plano.map((it, k) =>
                  k === i ? { ...it, profIds: idsA } : k === j ? { ...it, profIds: idsB } : it
                );
                const novoScore = calcularScoreDesequilibrio(planoTeste);
                if (ehScoreMelhor(novoScore, scoreAtual)) {
                  plano[i].profIds = idsA;
                  plano[j].profIds = idsB;
                  scoreAtual = novoScore;
                  melhorou = true;
                }
              }
            }
          }
        }
      }

      if (!melhorou) break;
    }

    // Persistir mapas gerados
    let mapasGerados = 0;
    let mapasComFallback = 0;
    let provasIncompletas = 0;

    plano.forEach(al => {
      const existente = mapasPorHorarioId.get(al.prova.id);
      const fiscaisMontados: ProfessorFiscalizadorItem[] = al.profIds.map((pid, idx) => {
        const pObj = professoresDisponiveis.find(pr => pr.id === pid);
        return {
          professorId: pid,
          professorNome: pObj?.nomeCompleto || 'Docente',
          papelFiscalizacao: idx === 0 ? 'Fiscal Principal' : 'Fiscal Adjunto'
        };
      });

      const conflitosReais = al.profIds
        .map(pid => {
          const cf = avaliarConflitoDocenteProva(pid, al.prova);
          if (cf.tier === 0) return '';
          const pObj = professoresDisponiveis.find(pr => pr.id === pid);
          return `${pObj?.nomeCompleto || 'Docente'} (${cf.motivo})`;
        })
        .filter(Boolean);

      if (conflitosReais.length > 0) mapasComFallback++;
      if (fiscaisMontados.length < qtdPorProva) provasIncompletas++;

      dbService.salvarMapaFiscalizacao({
        id: existente?.id || `mp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        escolaId: escola.id,
        anoLectivo: anoActivo,
        horarioProvaId: al.prova.id,
        turmaId: al.prova.turmaId,
        turmaNome: al.prova.turmaNome,
        classe: al.prova.classe,
        curso: isSegundoCiclo(al.prova.classe) ? al.prova.curso : undefined,
        disciplinaId: al.prova.disciplinaId,
        disciplinaNome: al.prova.disciplinaNome,
        tipoProva: al.prova.tipoProva,
        trimestre: String(al.prova.trimestre),
        data: al.prova.data,
        horaInicio: al.prova.horaInicio,
        horaFim: al.prova.horaFim,
        sala: al.prova.sala,
        fiscais: fiscaisMontados,
        instrucoes: autoInstrucoes.trim() || existente?.instrucoes || undefined,
        escalaAutomatica: true,
        usouFallbackConflito: conflitosReais.length > 0,
        observacaoConflito:
          conflitosReais.length > 0
            ? `Recurso por indisponibilidade de docentes sem vínculo: ${conflitosReais.join('; ')}`
            : undefined,
        criadoPorId: currentUser.id,
        criadoPorNome: currentUser.nomeCompleto,
        criadoEm: existente?.criadoEm || new Date().toISOString()
      });
      mapasGerados++;
    });

    const { diasPorProf } = calcularCargaPorProf(plano);
    const contagensDias = professoresDisponiveis.map(p => (diasPorProf.get(p.id) || new Map()).size);
    const minD = contagensDias.length > 0 ? Math.min(...contagensDias) : 0;
    const maxD = contagensDias.length > 0 ? Math.max(...contagensDias) : 0;

    recarregarTudo();
    setShowAutoEscalaModal(false);
    setAbaAtiva('mapas');

    const partesResumo = [
      `Escala automática gerada para ${mapasGerados} prova(s) com até ${qtdPorProva} fiscal(is)/prova`,
      `Equilíbrio: ${minD} a ${maxD} dia(s) por docente`
    ];
    if (mapasComFallback > 0) {
      partesResumo.push(`${mapasComFallback} prova(s) usaram docente com vínculo por falta de outros disponíveis`);
    }
    if (provasIncompletas > 0) {
      partesResumo.push(`${provasIncompletas} prova(s) com menos fiscais por sobreposição de horários simultâneos`);
    }

    mostrarFeedback('sucesso', `${partesResumo.join(' · ')}.`);
  };

  // Handlers: Ata da Prova
  const podeRedigirAta = (mapa: MapaFiscalizacaoProva): boolean => {
    if (podeGerirProvas) return true;
    return mapa.fiscais.some(f => f.professorId === currentUser.id);
  };

  const abrirModalAta = (mapa: MapaFiscalizacaoProva, ataExistente?: AtaProvaRegistro) => {
    const alunosTurma = alunos.filter(a => a.turmaId === mapa.turmaId && a.estado !== 'Desistente' && a.estado !== 'Transferido');
    setEditAtaId(ataExistente?.id || null);
    setAtaMapaId(mapa.id);
    setAtaHoraInicioReal(ataExistente?.horaInicioReal || mapa.horaInicio);
    setAtaHoraFimReal(ataExistente?.horaFimReal || mapa.horaFim);
    setAtaMatriculados(ataExistente ? ataExistente.alunosMatriculados : alunosTurma.length);
    setAtaPresentes(ataExistente ? ataExistente.alunosPresentes : alunosTurma.length);
    setAtaFaltosos(ataExistente ? ataExistente.alunosFaltosos : 0);
    setAtaAnulados(ataExistente?.alunosAnulados || 0);
    setAtaOcorrencias(ataExistente?.ocorrencias ? [...ataExistente.ocorrencias] : []);
    setAtaSintese(
      ataExistente?.sinteseOcorrido ||
        `A prova decorreu com normalidade na sala ${mapa.sala || 'designada'}, cumprindo-se o horário regulamentar e a verificação das identificações dos estudantes.`
    );
    setAtaObservacoesGerais(ataExistente?.observacoesGerais || '');
    setAtaEstado(ataExistente?.estado || 'Rascunho');
    setOcHora(mapa.horaInicio);
    setOcAlunoId(alunosTurma[0]?.id || '');
    setOcAlunoNomeManual('');
    setOcDescricao('');
    setOcMedida('');
    setShowAtaModal(true);
  };

  const alunosDaTurmaAta = useMemo(() => {
    const mapa = mapas.find(m => m.id === ataMapaId);
    if (!mapa) return [];
    return alunos
      .filter(a => a.turmaId === mapa.turmaId)
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt'));
  }, [mapas, ataMapaId, alunos]);

  const handleAdicionarOcorrenciaAta = () => {
    if (!ocDescricao.trim() || !ocMedida.trim()) {
      mostrarFeedback('erro', 'Descreva a ocorrência e a medida tomada pelo júri/fiscalização.');
      return;
    }
    const alunoObj = alunosDaTurmaAta.find(a => a.id === ocAlunoId);
    const nova: OcorrenciaAtaProva = {
      id: `oc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      hora: ocHora || '09:00',
      alunoId: alunoObj?.id,
      alunoNome: ocAlunoNomeManual.trim() || alunoObj?.nomeCompleto || 'Geral / Turma',
      tipo: ocTipo,
      descricao: ocDescricao.trim(),
      medidaTomada: ocMedida.trim()
    };
    setAtaOcorrencias(prev => [...prev, nova]);
    setOcDescricao('');
    setOcMedida('');
    setOcAlunoNomeManual('');
  };

  const handleSalvarAta = (e: React.FormEvent, estadoFinal: 'Rascunho' | 'Finalizada') => {
    e.preventDefault();
    const mapa = mapas.find(m => m.id === ataMapaId);
    if (!mapa) return;
    if (!ataSintese.trim()) {
      mostrarFeedback('erro', 'Redija a síntese do decorrer da prova antes de guardar a ata.');
      return;
    }
    const salva = dbService.salvarAtaProva({
      id: editAtaId || `ata-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      anoLectivo: anoActivo,
      mapaFiscalizacaoId: mapa.id,
      horarioProvaId: mapa.horarioProvaId,
      turmaId: mapa.turmaId,
      turmaNome: mapa.turmaNome,
      classe: mapa.classe,
      curso: isSegundoCiclo(mapa.classe) ? mapa.curso : undefined,
      disciplinaId: mapa.disciplinaId,
      disciplinaNome: mapa.disciplinaNome,
      tipoProva: mapa.tipoProva,
      trimestre: mapa.trimestre,
      dataProva: mapa.data,
      horaInicioReal: ataHoraInicioReal,
      horaFimReal: ataHoraFimReal,
      sala: mapa.sala,
      fiscais: mapa.fiscais,
      alunosMatriculados: Math.max(0, Number(ataMatriculados) || 0),
      alunosPresentes: Math.max(0, Number(ataPresentes) || 0),
      alunosFaltosos: Math.max(0, Number(ataFaltosos) || 0),
      alunosAnulados: Math.max(0, Number(ataAnulados) || 0),
      ocorrencias: ataOcorrencias,
      sinteseOcorrido: ataSintese.trim(),
      observacoesGerais: ataObservacoesGerais.trim() || undefined,
      estado: estadoFinal,
      redigidaPorId: currentUser.id,
      redigidaPorNome: currentUser.nomeCompleto,
      redigidaPorGenero: currentUser.genero,
      criadoEm: new Date().toISOString()
    });
    setAtaEstado(salva.estado);
    recarregarTudo();
    setShowAtaModal(false);
    setAbaAtiva('atas');
    mostrarFeedback(
      'sucesso',
      estadoFinal === 'Finalizada' ? 'Ata oficial da prova finalizada com sucesso.' : 'Rascunho da ata guardado.'
    );
  };

  // Eliminação confirmada
  const handleConfirmarEliminacao = () => {
    if (!itemParaEliminar) return;
    if (itemParaEliminar.tipo === 'horario') {
      dbService.eliminarHorarioProva(itemParaEliminar.id);
    } else if (itemParaEliminar.tipo === 'mapa') {
      dbService.eliminarMapaFiscalizacao(itemParaEliminar.id);
    } else if (itemParaEliminar.tipo === 'ata') {
      dbService.eliminarAtaProva(itemParaEliminar.id);
    }
    recarregarTudo();
    setItemParaEliminar(null);
    mostrarFeedback('sucesso', 'Registo eliminado com segurança.');
  };

  // Downloads PDF & Excel
  const handleBaixarHorarioPdf = async () => {
    if (horariosFiltrados.length === 0) {
      mostrarFeedback('erro', 'Não existem provas no filtro atual para exportar em PDF.');
      return;
    }
    const ok = await downloadElementAsPdf(
      'provas-horario-a4',
      `Horario_Provas_${escola.sigla || escola.nomeOficial}_${anoActivo.replace('/', '-')}`,
      { orientation: orientacaoHorarioMapa, format: 'a4', marginMm: 8 }
    );
    if (ok) mostrarFeedback('sucesso', 'Horário de Provas em PDF descarregado.');
  };

  const handleBaixarHorarioExcel = async () => {
    if (horariosFiltrados.length === 0) {
      mostrarFeedback('erro', 'Não existem provas no filtro atual para exportar para Excel.');
      return;
    }
    const rows = horariosFiltrados.map(h => ({
      Data: formatarDataAngolana(h.data),
      Hora_Inicio: h.horaInicio,
      Hora_Fim: h.horaFim,
      Tipo_Prova: h.tipoProva,
      Epoca_Trimestre: h.trimestre,
      Classe: h.classe,
      Curso: isSegundoCiclo(h.classe) ? (h.curso || '') : 'Ensino Geral',
      Turma: h.turmaNome,
      Disciplina: h.disciplinaNome,
      Sala: h.sala || '',
      Observacoes: h.observacoes || ''
    }));
    await downloadExcelFile(
      'Horario_Provas',
      rows,
      `Horario_Provas_${anoActivo.replace('/', '-')}.xlsx`
    );
    mostrarFeedback('sucesso', 'Horário de Provas exportado em Excel.');
  };

  const handleBaixarMapaPdf = async () => {
    if (mapasFiltrados.length === 0) {
      mostrarFeedback('erro', 'Não existem mapas de fiscalização no filtro atual para exportar em PDF.');
      return;
    }
    const ok = await downloadElementAsPdf(
      'provas-mapa-fiscalizacao-a4',
      `Escala_Fiscalizacao_Provas_${escola.sigla || escola.nomeOficial}_${anoActivo.replace('/', '-')}`,
      { orientation: orientacaoHorarioMapa, format: 'a4', marginMm: 8 }
    );
    if (ok) mostrarFeedback('sucesso', 'Escala e Mapa de Fiscalização de Provas em PDF descarregado.');
  };

  const handleBaixarMapaExcel = async () => {
    if (mapasFiltrados.length === 0) {
      mostrarFeedback('erro', 'Não existem mapas de fiscalização para exportar.');
      return;
    }
    const XLSX = await import('xlsx');
    const rowsEscala = mapasFiltrados.map(m => ({
      Data: formatarDataAngolana(m.data),
      Horario: `${m.horaInicio} - ${m.horaFim}`,
      Tipo_Prova: m.tipoProva,
      Classe: m.classe,
      Curso: isSegundoCiclo(m.classe) ? (m.curso || '') : 'Ensino Geral',
      Turma: m.turmaNome,
      Disciplina: m.disciplinaNome,
      Sala: m.sala || '',
      Fiscal_1: m.fiscais[0]?.professorNome || '',
      Fiscal_2: m.fiscais[1]?.professorNome || '',
      Fiscal_3: m.fiscais[2]?.professorNome || '',
      Fiscal_4: m.fiscais[3]?.professorNome || '',
      Origem_Escala: m.escalaAutomatica ? 'Automática Equilibrada' : 'Manual',
      Observacoes_Conflito: m.observacaoConflito || 'Sem conflito de classe/turma/disciplina',
      Instrucoes: m.instrucoes || ''
    }));

    const rowsEquilibrio = equilibrioPorProfessor.lista.map(eq => ({
      Professor: eq.professorNome,
      Dias_Fiscalizacao: eq.diasEscalados,
      Total_Provas: eq.totalProvas,
      Como_Fiscal_Principal: eq.comoPrincipal,
      Como_Fiscal_Adjunto: eq.comoAdjunto,
      Datas_Escaladas: eq.datasOrdenadas.map(d => formatarDataAngolana(d)).join(', ')
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rowsEscala);
    XLSX.utils.book_append_sheet(wb, ws1, 'Escala_Fiscalizacao');
    if (rowsEquilibrio.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(rowsEquilibrio);
      XLSX.utils.book_append_sheet(wb, ws2, 'Equilibrio_Professores');
    }
    XLSX.writeFile(wb, `Escala_Fiscalizacao_Provas_${anoActivo.replace('/', '-')}.xlsx`);
    mostrarFeedback('sucesso', 'Escala de Fiscalização e Resumo de Equilíbrio exportados em Excel.');
  };

  const handleBaixarAtaPdf = async (ata: AtaProvaRegistro) => {
    setAtaParaPdf(ata);
    setTimeout(async () => {
      const ok = await downloadElementAsPdf(
        'provas-ata-individual-a4',
        `Ata_Prova_${ata.disciplinaNome.replace(/\s+/g, '_')}_${ata.turmaNome.replace(/\s+/g, '_')}_${ata.dataProva}`,
        { orientation: orientacaoAta, format: 'a4', marginMm: 10 }
      );
      if (ok) mostrarFeedback('sucesso', 'Ata oficial da prova em PDF descarregada.');
    }, 120);
  };

  const handleBaixarAtasExcel = async () => {
    if (atasFiltradas.length === 0) {
      mostrarFeedback('erro', 'Não existem atas de provas para exportar.');
      return;
    }
    const rows = atasFiltradas.map(a => ({
      Data: formatarDataAngolana(a.dataProva),
      Horario_Real: `${a.horaInicioReal} - ${a.horaFimReal}`,
      Tipo_Prova: a.tipoProva,
      Classe: a.classe,
      Turma: a.turmaNome,
      Disciplina: a.disciplinaNome,
      Matriculados: a.alunosMatriculados,
      Presentes: a.alunosPresentes,
      Faltosos: a.alunosFaltosos,
      Anulados: a.alunosAnulados || 0,
      Total_Ocorrencias: a.ocorrencias.length,
      Fiscais: a.fiscais.map(f => f.professorNome).join(' | '),
      Estado: a.estado,
      Redigida_Por: a.redigidaPorNome,
      Sintese: a.sinteseOcorrido
    }));
    await downloadExcelFile(
      'Atas_Provas',
      rows,
      `Atas_Provas_${anoActivo.replace('/', '-')}.xlsx`
    );
    mostrarFeedback('sucesso', 'Atas de Provas exportadas em Excel.');
  };

  const nomeDiretor = obterNomeDiretorGeral(escola, funcionarios);
  const tituloDiretor = obterTituloDiretorGeral(escola, funcionarios);
  const nomeSubPed = obterNomeSubdiretorPedagogico(escola, funcionarios);
  const tituloSubPed = obterTituloSubdiretorPedagogico(escola, funcionarios);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{escola.nomeOficial}</span>
            <span aria-hidden="true">·</span>
            <span>Ano Letivo {anoActivo || 'Ativo'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Provas, Exames, Fiscalização & Atas
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
            Calendário oficial de provas e exames de recurso, escalamento de 1 a 4 professores fiscalizadores por turma e redação das atas finais com ocorrências.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {podeGerirProvas && (
            <>
              <button
                type="button"
                onClick={abrirNovoHorario}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar Prova / Exame</span>
              </button>
              <button
                type="button"
                onClick={abrirModalEscalaAutomatica}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                title="Gerar escala automática equilibrada por dias sem conflito de classe/turma/disciplina"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Escala Automática</span>
              </button>
              <button
                type="button"
                onClick={() => abrirModalMapa()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Escalar Manualmente</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedback.texto}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Sub-abas + Ações de Exportação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit">
          {[
            { id: 'horarios' as const, label: `Horários de Provas (${horariosFiltrados.length})`, icon: Calendar },
            { id: 'mapas' as const, label: `Mapas de Fiscalização (${mapasFiltrados.length})`, icon: Users },
            { id: 'atas' as const, label: `Atas das Provas (${atasFiltradas.length})`, icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const active = abaAtiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbaAtiva(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(abaAtiva === 'horarios' || abaAtiva === 'mapas') && (
            <select
              value={orientacaoHorarioMapa}
              onChange={(e) => setOrientacaoHorarioMapa(e.target.value as 'landscape' | 'portrait')}
              className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              title="Orientação da folha A4 para PDF"
            >
              <option value="landscape">Paisagem (A4 Horizontal)</option>
              <option value="portrait">Retrato (A4 Vertical)</option>
            </select>
          )}
          {abaAtiva === 'horarios' && (
            <>
              <button
                type="button"
                onClick={handleBaixarHorarioPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Horário PDF</span>
              </button>
              <button
                type="button"
                onClick={handleBaixarHorarioExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Horário XLSX</span>
              </button>
            </>
          )}
          {abaAtiva === 'mapas' && (
            <>
              <button
                type="button"
                onClick={handleBaixarMapaPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Escala / Mapa PDF</span>
              </button>
              <button
                type="button"
                onClick={handleBaixarMapaExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Escala / Mapa XLSX</span>
              </button>
            </>
          )}
          {abaAtiva === 'atas' && (
            <>
              <select
                value={orientacaoAta}
                onChange={(e) => setOrientacaoAta(e.target.value as 'portrait' | 'landscape')}
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                title="Orientação da folha A4 da Ata"
              >
                <option value="portrait">Ata: Retrato (A4 Vertical)</option>
                <option value="landscape">Ata: Paisagem (A4 Horizontal)</option>
              </select>
              <button
                type="button"
                onClick={handleBaixarAtasExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Atas XLSX</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filtros Globais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar disciplina, turma, fiscal..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white w-56"
          />
        </div>

        <select
          value={filtroTipoProva}
          onChange={(e) => setFiltroTipoProva(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
        >
          <option value="TODOS">Todos os Tipos de Prova</option>
          {TIPOS_PROVA.map(tp => (
            <option key={tp} value={tp}>{tp}</option>
          ))}
        </select>

        <select
          value={filtroClasse}
          onChange={(e) => setFiltroClasse(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
        >
          <option value="TODAS">Todas as Classes</option>
          {classesDisponiveis.map((cl: string) => (
            <option key={cl} value={cl}>{cl}</option>
          ))}
        </select>

        <select
          value={filtroTurmaId}
          onChange={(e) => setFiltroTurmaId(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
        >
          <option value="TODAS">Todas as Turmas</option>
          {turmasDoAno.map(t => (
            <option key={t.id} value={t.id}>{t.nome} ({t.classe})</option>
          ))}
        </select>

        {isProfessor && (
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={apenasMinhasProvas}
              onChange={(e) => setApenasMinhasProvas(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Apenas provas em que sou fiscalizador</span>
          </label>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: HORÁRIOS DE PROVAS / EXAMES / RECURSO                          */}
      {/* ===================================================================== */}
      {abaAtiva === 'horarios' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          {horariosFiltrados.length === 0 ? (
            <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Calendar className="w-8 h-8 mx-auto text-slate-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhum horário de prova agendado</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {podeGerirProvas
                    ? 'Agende provas trimestrais, exames finais, exames nacionais ou provas de recurso para as turmas do ano letivo ativo.'
                    : 'A Direção Geral ou Subdireção Pedagógica ainda não publicou o calendário de provas para este filtro.'}
                </p>
              </div>
              {podeGerirProvas && (
                <button
                  type="button"
                  onClick={abrirNovoHorario}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  + Agendar Primeira Prova
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Data & Horário</th>
                    <th className="py-2.5 px-3">Tipo & Época</th>
                    <th className="py-2.5 px-3">Classe / Turma</th>
                    <th className="py-2.5 px-3">Disciplina</th>
                    <th className="py-2.5 px-3">Sala</th>
                    <th className="py-2.5 px-3">Fiscalização</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {horariosFiltrados.map(h => {
                    const mapa = mapasPorHorarioId.get(h.id);
                    const souFiscal = mapa?.fiscais.some(f => f.professorId === currentUser.id);
                    return (
                      <tr key={h.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${souFiscal ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white tabular-nums">{formatarDataAngolana(h.data)}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {h.horaInicio} – {h.horaFim} {h.duracaoMinutos ? `(${h.duracaoMinutos} min)` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{h.tipoProva}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {['1', '2', '3'].includes(String(h.trimestre)) ? `${h.trimestre}º Trimestre` : h.trimestre}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {h.classe} · {h.turmaNome}
                          </div>
                          {isSegundoCiclo(h.classe) && h.curso && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{h.curso}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{h.disciplinaNome}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{h.sala || 'A definir'}</td>
                        <td className="py-3 px-3">
                          {mapa ? (
                            <div className="text-[11px] text-slate-700 dark:text-slate-300">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {mapa.fiscais.length} fiscal(is)
                              </span>
                              <div className="truncate max-w-[200px] text-slate-500 dark:text-slate-400">
                                {mapa.fiscais.map(f => f.professorNome).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Pendente de escala</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {podeGerirProvas && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => abrirModalMapa(h, mapa)}
                                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                                  title="Escalar 1 a 4 professores fiscalizadores"
                                >
                                  {mapa ? 'Editar Fiscais' : 'Escalar Fiscais'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirEditarHorario(h)}
                                  className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 cursor-pointer"
                                  title="Editar Horário"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemParaEliminar({ tipo: 'horario', id: h.id, rotulo: `${h.disciplinaNome} (${h.turmaNome})` })
                                  }
                                  className="p-1.5 rounded-md text-slate-500 hover:text-red-700 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: MAPAS DE FISCALIZAÇÃO (1 A 4 PROFESSORES POR TURMA)            */}
      {/* ===================================================================== */}
      {abaAtiva === 'mapas' && (
        <div className="space-y-4">
          {equilibrioPorProfessor.lista.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    Equilíbrio de Dias e Provas por Fiscalizador
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    Dias/Docente: {equilibrioPorProfessor.minDias} – {equilibrioPorProfessor.maxDias} dia(s)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    Provas/Docente: {equilibrioPorProfessor.minProvas} – {equilibrioPorProfessor.maxProvas}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {equilibrioPorProfessor.lista.map(eq => (
                  <div
                    key={eq.professorId}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      eq.professorId === currentUser.id
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{eq.professorNome}</span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {eq.diasEscalados}d · {eq.totalProvas}p
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            {mapasFiltrados.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Users className="w-8 h-8 mx-auto text-slate-400" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhum mapa de fiscalização registado</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gere automaticamente uma escala equilibrada (sem conflitos de classe, turma ou disciplina) ou escale manualmente 1 a 4 professores.
                  </p>
                </div>
                {podeGerirProvas && horarios.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={abrirModalEscalaAutomatica}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Gerar Escala Automática</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirModalMapa()}
                      className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      + Criar Mapa Manual
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3">Data & Horário</th>
                      <th className="py-2.5 px-3">Turma & Disciplina</th>
                      <th className="py-2.5 px-3">Sala</th>
                      <th className="py-2.5 px-3">Professores Fiscalizadores (1–4)</th>
                      <th className="py-2.5 px-3">Ata da Prova</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {mapasFiltrados.map(m => {
                      const ata = atasPorMapaId.get(m.id);
                      const podeRedigir = podeRedigirAta(m);
                      const souFiscal = m.fiscais.some(f => f.professorId === currentUser.id);
                      return (
                        <tr key={m.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${souFiscal ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white tabular-nums">{formatarDataAngolana(m.data)}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{m.horaInicio} – {m.horaFim}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {m.disciplinaNome} · {m.turmaNome} ({m.classe})
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {m.tipoProva}{isSegundoCiclo(m.classe) && m.curso ? ` · ${m.curso}` : ''}
                            </div>
                            {m.usouFallbackConflito && m.observacaoConflito && (
                              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                                {m.observacaoConflito}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{m.sala || 'A definir'}</td>
                          <td className="py-3 px-3">
                            <div className="space-y-0.5 text-[11px]">
                              {m.fiscais.map((f, idx) => (
                                <div key={`${f.professorId}-${idx}`} className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                  <span className="font-bold tabular-nums text-slate-400">{idx + 1}.</span>
                                  <span className={f.professorId === currentUser.id ? 'font-bold text-blue-700 dark:text-blue-400' : 'font-medium'}>
                                    {f.professorNome}
                                  </span>
                                  <span className="text-slate-400">({f.papelFiscalizacao})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {ata ? (
                              <div className="text-[11px]">
                                <span className={`font-bold ${ata.estado === 'Finalizada' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {ata.estado}
                                </span>
                                <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                                  {ata.ocorrencias.length} ocorrência(s)
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Sem ata redigida</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {podeRedigir && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalAta(m, ata)}
                                  className="px-2.5 py-1 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  {ata ? 'Abrir Ata' : 'Redigir Ata'}
                                </button>
                              )}
                              {ata && (
                                <button
                                  type="button"
                                  onClick={() => handleBaixarAtaPdf(ata)}
                                  className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-emerald-700 cursor-pointer"
                                  title="Baixar Ata PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {podeGerirProvas && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => abrirModalMapa(horarios.find(h => h.id === m.horarioProvaId), m)}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 cursor-pointer"
                                    title="Editar Fiscalização"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setItemParaEliminar({ tipo: 'mapa', id: m.id, rotulo: `Mapa ${m.disciplinaNome} (${m.turmaNome})` })
                                    }
                                    className="p-1.5 rounded-md text-slate-500 hover:text-red-700 cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ATAS DAS PROVAS COM REGISTO DE OCORRÊNCIAS                     */}
      {/* ===================================================================== */}
      {abaAtiva === 'atas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          {atasFiltradas.length === 0 ? (
            <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <ClipboardCheck className="w-8 h-8 mx-auto text-slate-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhuma ata de prova registada</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Os professores fiscalizadores podem redigir a ata da prova a partir do separador "Mapas de Fiscalização".
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbaAtiva('mapas')}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Ir para Mapas de Fiscalização
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {atasFiltradas.map(ata => {
                const mapaRef = mapas.find(m => m.id === ata.mapaFiscalizacaoId);
                const podeEditar = podeGerirProvas || ata.fiscais.some(f => f.professorId === currentUser.id) || ata.redigidaPorId === currentUser.id;
                return (
                  <div
                    key={ata.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatarDataAngolana(ata.dataProva)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ata.tipoProva}</span>
                        <span aria-hidden="true">·</span>
                        <span className={ata.estado === 'Finalizada' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                          {ata.estado}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {ata.disciplinaNome} — {ata.turmaNome} ({ata.classe}{isSegundoCiclo(ata.classe) && ata.curso ? ` · ${ata.curso}` : ''})
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{ata.sinteseOcorrido}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums pt-0.5">
                        <span>Matriculados: <strong>{ata.alunosMatriculados}</strong></span>
                        <span>Presentes: <strong>{ata.alunosPresentes}</strong></span>
                        <span>Faltosos: <strong>{ata.alunosFaltosos}</strong></span>
                        <span>Ocorrências: <strong>{ata.ocorrencias.length}</strong></span>
                        <span>Redigida por: <strong>{ata.redigidaPorNome}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleBaixarAtaPdf(ata)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Ata PDF</span>
                      </button>
                      {podeEditar && mapaRef && (
                        <button
                          type="button"
                          onClick={() => abrirModalAta(mapaRef, ata)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Ata</span>
                        </button>
                      )}
                      {podeGerirProvas && (
                        <button
                          type="button"
                          onClick={() => setItemParaEliminar({ tipo: 'ata', id: ata.id, rotulo: `Ata ${ata.disciplinaNome} (${ata.turmaNome})` })}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-700 cursor-pointer"
                          title="Eliminar Ata"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: AGENDAR / EDITAR HORÁRIO DE PROVA                            */}
      {/* ===================================================================== */}
      {showHorarioModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editHorarioId ? 'Editar Horário de Prova' : 'Agendar Horário de Prova / Exame'}
              </h3>
              <button type="button" onClick={() => setShowHorarioModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarHorario} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Prova *</label>
                  <select
                    value={hpTipoProva}
                    onChange={(e) => setHpTipoProva(e.target.value as TipoProvaEscolar)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {TIPOS_PROVA.map(tp => (
                      <option key={tp} value={tp}>{tp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Trimestre / Época *</label>
                  <select
                    value={hpTrimestre}
                    onChange={(e) => setHpTrimestre(e.target.value as HorarioProvaItem['trimestre'])}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="1">1º Trimestre</option>
                    <option value="2">2º Trimestre</option>
                    <option value="3">3º Trimestre</option>
                    <option value="Época Única">Época Única / Exame</option>
                    <option value="Recurso">Época de Recurso</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Turma *</label>
                  <select
                    required
                    value={hpTurmaId}
                    onChange={(e) => {
                      const novaTurmaId = e.target.value;
                      setHpTurmaId(novaTurmaId);
                      const tm = turmasDoAno.find(t => t.id === novaTurmaId);
                      if (tm) {
                        setHpSala(tm.sala || '');
                        const discs = filtrarDisciplinasDaClasse(disciplinas, tm.classe, isSegundoCiclo(tm.classe) ? tm.curso : undefined);
                        if (discs.length > 0 && !discs.some(d => d.id === hpDisciplinaId)) {
                          setHpDisciplinaId(discs[0].id);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {turmasDoAno.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome} · {t.classe}{isSegundoCiclo(t.classe) && t.curso ? ` (${t.curso})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Disciplina *</label>
                  <select
                    required
                    value={hpDisciplinaId}
                    onChange={(e) => setHpDisciplinaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {disciplinasParaTurmaModal.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={hpData}
                    onChange={(e) => setHpData(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Início *</label>
                  <input
                    type="time"
                    required
                    value={hpHoraInicio}
                    onChange={(e) => setHpHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fim *</label>
                  <input
                    type="time"
                    required
                    value={hpHoraFim}
                    onChange={(e) => setHpHoraFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sala de Exame / Prova</label>
                <input
                  type="text"
                  value={hpSala}
                  onChange={(e) => setHpSala(e.target.value)}
                  placeholder="Ex: Sala 04 / Anfiteatro"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações / Materiais Permitidos</label>
                <textarea
                  rows={2}
                  value={hpObservacoes}
                  onChange={(e) => setHpObservacoes(e.target.value)}
                  placeholder="Ex: Permitido uso de calculadora científica não programável."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowHorarioModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer">
                  Guardar Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: MAPA DE FISCALIZAÇÃO (1 A 4 PROFESSORES POR TURMA)           */}
      {/* ===================================================================== */}
      {showMapaModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Mapa de Fiscalização (1 a 4 Professores por Turma)
              </h3>
              <button type="button" onClick={() => setShowMapaModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarMapa} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Prova / Exame Agendado *</label>
                <select
                  value={mpHorarioId}
                  onChange={(e) => setMpHorarioId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  {horarios.map(h => (
                    <option key={h.id} value={h.id}>
                      {formatarDataAngolana(h.data)} ({h.horaInicio}-{h.horaFim}) · {h.disciplinaNome} · {h.turmaNome} ({h.classe})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Professores Fiscalizadores ({mpFiscais.length} / 4)
                  </label>
                  {mpFiscais.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAdicionarSlotFiscal}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar Fiscal</span>
                    </button>
                  )}
                </div>

                {mpFiscais.map((fiscal, idx) => {
                  const horarioSel = horarios.find(h => h.id === mpHorarioId);
                  const confSlot = horarioSel && fiscal.professorId ? avaliarConflitoDocenteProva(fiscal.professorId, horarioSel) : null;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7">
                          <select
                            value={fiscal.professorId}
                            onChange={(e) => handleToggleFiscalSlot(idx, e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                          >
                            {professoresDisponiveis.map(p => {
                              const cf = horarioSel ? avaliarConflitoDocenteProva(p.id, horarioSel) : null;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.nomeCompleto}{cf && cf.tier > 0 ? ` (${cf.motivo})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <select
                            value={fiscal.papelFiscalizacao}
                            onChange={(e) => {
                              const papel = e.target.value as 'Fiscal Principal' | 'Fiscal Adjunto';
                              setMpFiscais(prev => prev.map((it, i) => (i === idx ? { ...it, papelFiscalizacao: papel } : it)));
                            }}
                            className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="Fiscal Principal">Fiscal Principal</option>
                            <option value="Fiscal Adjunto">Fiscal Adjunto</option>
                          </select>
                        </div>
                        <div className="col-span-1 text-right">
                          {mpFiscais.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoverSlotFiscal(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {confSlot && confSlot.tier > 0 && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 pl-1">
                          Aviso docente: {confSlot.motivo}.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {conflitosFiscaisModal.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Aviso de Sobreposição de Horário</span>
                  </div>
                  {conflitosFiscaisModal.map((alerta, i) => (
                    <p key={i} className="text-[11px]">{alerta}</p>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Instruções à Equipa de Fiscalização</label>
                <textarea
                  rows={2}
                  value={mpInstrucoes}
                  onChange={(e) => setMpInstrucoes(e.target.value)}
                  placeholder="Ex: Recolher telemóveis antes do início e conferir BI/Passe escolar."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowMapaModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer">
                  Guardar Mapa de Fiscalização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: REDIGIR / EDITAR ATA DA PROVA & OCORRÊNCIAS                  */}
      {/* ===================================================================== */}
      {showAtaModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ata Oficial de Realização da Prova
                </h3>
                {(() => {
                  const mp = mapas.find(m => m.id === ataMapaId);
                  return mp ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {mp.disciplinaNome} · {mp.turmaNome} ({mp.classe}) · {formatarDataAngolana(mp.data)}
                    </p>
                  ) : null;
                })()}
              </div>
              <button type="button" onClick={() => setShowAtaModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSalvarAta(e, ataEstado)} className="p-5 space-y-5 overflow-y-auto">
              {/* Horário Real e Contagem de Alunos */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Início Real</label>
                  <input
                    type="time"
                    value={ataHoraInicioReal}
                    onChange={(e) => setAtaHoraInicioReal(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Fim Real</label>
                  <input
                    type="time"
                    value={ataHoraFimReal}
                    onChange={(e) => setAtaHoraFimReal(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Matriculados</label>
                  <input
                    type="number"
                    min={0}
                    value={ataMatriculados}
                    onChange={(e) => setAtaMatriculados(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Presentes</label>
                  <input
                    type="number"
                    min={0}
                    value={ataPresentes}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setAtaPresentes(p);
                      setAtaFaltosos(Math.max(0, ataMatriculados - p));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Faltosos</label>
                  <input
                    type="number"
                    min={0}
                    value={ataFaltosos}
                    onChange={(e) => setAtaFaltosos(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Provas Anuladas</label>
                  <input
                    type="number"
                    min={0}
                    value={ataAnulados}
                    onChange={(e) => setAtaAnulados(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Registo de Ocorrências Durante a Prova */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Ocorrências Registadas Durante a Prova ({ataOcorrencias.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="time"
                      value={ocHora}
                      onChange={(e) => setOcHora(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={ocAlunoId}
                      onChange={(e) => setOcAlunoId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="">-- Estudante (Opcional) --</option>
                      {alunosDaTurmaAta.map(al => (
                        <option key={al.id} value={al.id}>{al.nomeCompleto}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={ocTipo}
                      onChange={(e) => setOcTipo(e.target.value as OcorrenciaAtaProva['tipo'])}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      {TIPOS_OCORRENCIA.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={ocAlunoNomeManual}
                      onChange={(e) => setOcAlunoNomeManual(e.target.value)}
                      placeholder="Ou nome manual..."
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={ocDescricao}
                      onChange={(e) => setOcDescricao(e.target.value)}
                      placeholder="Descrição da ocorrência cometida..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={ocMedida}
                      onChange={(e) => setOcMedida(e.target.value)}
                      placeholder="Medida tomada (ex: Prova anulada / Advertência)..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAdicionarOcorrenciaAta}
                      className="w-full py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {ataOcorrencias.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {ataOcorrencias.map(oc => (
                      <div
                        key={oc.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            <span className="tabular-nums">{oc.hora}</span> · {oc.tipo} · {oc.alunoNome || 'Geral'}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            {oc.descricao} — <strong>Medida:</strong> {oc.medidaTomada}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAtaOcorrencias(prev => prev.filter(x => x.id !== oc.id))}
                          className="text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Síntese Oficial do Decorrer da Prova *</label>
                <textarea
                  rows={3}
                  required
                  value={ataSintese}
                  onChange={(e) => setAtaSintese(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações Finais dos Fiscalizadores</label>
                <textarea
                  rows={2}
                  value={ataObservacoesGerais}
                  onChange={(e) => setAtaObservacoesGerais(e.target.value)}
                  placeholder="Notas adicionais para a Subdireção Pedagógica..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowAtaModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSalvarAta(e, 'Rascunho')}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                >
                  Guardar Rascunho
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSalvarAta(e, 'Finalizada')}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Finalizar Ata Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESCALA AUTOMÁTICA EQUILIBRADA DE FISCALIZADORES */}
      {showAutoEscalaModal && (
        <div className="fixed inset-0 z-[92] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Escala Automática Equilibrada de Fiscalizadores
                </h3>
              </div>
              <button type="button" onClick={() => setShowAutoEscalaModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutarEscalaAutomatica} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Critérios Oficiais da Distribuição Automática</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  1. Impede que o professor que leciona a <strong>classe, turma ou disciplina</strong> da prova seja escalado na mesma, exceto se não restarem outros docentes sem conflito disponíveis.
                </p>
                <p className="text-[11px] leading-relaxed">
                  2. Equilibra os <strong>dias de fiscalização</strong> e o número total de provas entre todos os docentes elegíveis, evitando sobreposição de horários.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fiscalizadores por Prova Já Cadastrada (1 a 4) *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([1, 2, 3, 4] as const).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAutoQtdFiscais(n)}
                      className={`py-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                        autoQtdFiscais === n
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {n} {n === 1 ? 'Fiscal' : 'Fiscais'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Provas Cadastradas a Incluir *
                </label>
                <select
                  value={autoEscopo}
                  onChange={(e) => setAutoEscopo(e.target.value as 'apenas_pendentes' | 'filtradas' | 'todas')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="apenas_pendentes">
                    Apenas provas pendentes de escala ({horarios.filter(h => !mapasPorHorarioId.has(h.id)).length} prova(s))
                  </option>
                  <option value="filtradas">
                    Provas do filtro atual — atualizar/recriar ({horariosFiltrados.length} prova(s))
                  </option>
                  <option value="todas">
                    Todas as provas do ano letivo — recriar escala global ({horarios.length} prova(s))
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instruções Padrão da Equipa de Fiscalização
                </label>
                <textarea
                  rows={2}
                  value={autoInstrucoes}
                  onChange={(e) => setAutoInstrucoes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Provas selecionadas: <strong>{provasAlvoAuto.length}</strong> · Docentes elegíveis: <strong>{professoresDisponiveis.length}</strong>
                </span>
                <span>
                  Vagas totais: <strong>{provasAlvoAuto.length * autoQtdFiscais}</strong>
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowAutoEscalaModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={provasAlvoAuto.length === 0 || professoresDisponiveis.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Gerar Escala Equilibrada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE ELIMINAÇÃO */}
      {itemParaEliminar && (
        <div className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tem a certeza que deseja eliminar <strong>{itemParaEliminar.rotulo}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemParaEliminar(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminacao}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODELOS A4 OFF-SCREEN PARA EXPORTAÇÃO PDF OFICIAL MED                 */}
      {/* ===================================================================== */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {/* 1. HORÁRIO DE PROVAS A4 PAISAGEM */}
        <div id="provas-horario-a4" style={{ width: '1080px' }} className="bg-white text-black p-8 font-serif space-y-5">
          <div className="text-center space-y-1 border-b-2 border-black pb-3">
            <div className="mx-auto flex justify-center mb-1">
              <InsigniaAngola className="w-11 h-11" customUrl={configSistema.insigniaNacionalUrl} />
            </div>
            <p className="text-[11px] font-bold uppercase">República de Angola · Ministério da Educação</p>
            <p className="text-sm font-bold uppercase">{escola.nomeOficial}</p>
            <h2 className="text-base font-bold uppercase underline">Horário Geral de Provas e Exames — Ano Letivo {anoActivo}</h2>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1.5 text-left">Data</th>
                <th className="border border-black px-2 py-1.5 text-left">Horário</th>
                <th className="border border-black px-2 py-1.5 text-left">Tipo / Época</th>
                <th className="border border-black px-2 py-1.5 text-left">Classe / Turma</th>
                <th className="border border-black px-2 py-1.5 text-left">Disciplina</th>
                <th className="border border-black px-2 py-1.5 text-left">Sala</th>
                <th className="border border-black px-2 py-1.5 text-left">Observações</th>
              </tr>
            </thead>
            <tbody>
              {horariosFiltrados.map(h => (
                <tr key={h.id}>
                  <td className="border border-black px-2 py-1 font-bold">{formatarDataAngolana(h.data)}</td>
                  <td className="border border-black px-2 py-1">{h.horaInicio} - {h.horaFim}</td>
                  <td className="border border-black px-2 py-1">{h.tipoProva} ({h.trimestre})</td>
                  <td className="border border-black px-2 py-1">
                    {h.classe} · {h.turmaNome}{isSegundoCiclo(h.classe) && h.curso ? ` (${h.curso})` : ''}
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">{h.disciplinaNome}</td>
                  <td className="border border-black px-2 py-1">{h.sala || '-'}</td>
                  <td className="border border-black px-2 py-1">{h.observacoes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-[11px]">
            <div>
              <p className="font-bold uppercase">{tituloSubPed}</p>
              <div className="border-t border-black w-64 mx-auto mt-8 pt-1">{nomeSubPed}</div>
            </div>
            <div>
              <p className="font-bold uppercase">{tituloDiretor}</p>
              <div className="border-t border-black w-64 mx-auto mt-8 pt-1">{nomeDiretor}</div>
            </div>
          </div>
        </div>

        {/* 2. MAPA DE FISCALIZAÇÃO A4 PAISAGEM */}
        <div id="provas-mapa-fiscalizacao-a4" style={{ width: '1080px' }} className="bg-white text-black p-8 font-serif space-y-5">
          <div className="text-center space-y-1 border-b-2 border-black pb-3">
            <div className="mx-auto flex justify-center mb-1">
              <InsigniaAngola className="w-11 h-11" customUrl={configSistema.insigniaNacionalUrl} />
            </div>
            <p className="text-[11px] font-bold uppercase">República de Angola · Ministério da Educação</p>
            <p className="text-sm font-bold uppercase">{escola.nomeOficial}</p>
            <h2 className="text-base font-bold uppercase underline">Escala e Mapa Oficial de Fiscalização de Provas e Exames — {anoActivo}</h2>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1.5 text-left">Data & Hora</th>
                <th className="border border-black px-2 py-1.5 text-left">Prova / Época</th>
                <th className="border border-black px-2 py-1.5 text-left">Classe / Turma</th>
                <th className="border border-black px-2 py-1.5 text-left">Disciplina</th>
                <th className="border border-black px-2 py-1.5 text-left">Sala</th>
                <th className="border border-black px-2 py-1.5 text-left">Professores Fiscalizadores (1 a 4)</th>
              </tr>
            </thead>
            <tbody>
              {mapasFiltrados.map(m => (
                <tr key={m.id}>
                  <td className="border border-black px-2 py-1">
                    <strong>{formatarDataAngolana(m.data)}</strong><br />
                    {m.horaInicio} - {m.horaFim}
                  </td>
                  <td className="border border-black px-2 py-1">{m.tipoProva}</td>
                  <td className="border border-black px-2 py-1">
                    {m.classe} · {m.turmaNome}{isSegundoCiclo(m.classe) && m.curso ? ` (${m.curso})` : ''}
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">{m.disciplinaNome}</td>
                  <td className="border border-black px-2 py-1">{m.sala || '-'}</td>
                  <td className="border border-black px-2 py-1">
                    {m.fiscais.map((f, i) => `${i + 1}. ${f.professorNome} (${f.papelFiscalizacao})`).join(' | ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {equilibrioPorProfessor.lista.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <p className="text-[11px] font-bold uppercase">
                Resumo de Equilíbrio por Fiscalizador (Dias: {equilibrioPorProfessor.minDias} a {equilibrioPorProfessor.maxDias} dia(s)/docente)
              </p>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-2 py-1 text-left">Docente</th>
                    <th className="border border-black px-2 py-1 text-center">Dias Escalados</th>
                    <th className="border border-black px-2 py-1 text-center">Total Provas</th>
                    <th className="border border-black px-2 py-1 text-left">Datas de Fiscalização</th>
                  </tr>
                </thead>
                <tbody>
                  {equilibrioPorProfessor.lista.map(eq => (
                    <tr key={`pdf-eq-${eq.professorId}`}>
                      <td className="border border-black px-2 py-1 font-bold">{eq.professorNome}</td>
                      <td className="border border-black px-2 py-1 text-center">{eq.diasEscalados}</td>
                      <td className="border border-black px-2 py-1 text-center">{eq.totalProvas}</td>
                      <td className="border border-black px-2 py-1">{eq.datasOrdenadas.map(d => formatarDataAngolana(d)).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-[11px]" data-pdf-fixed-signatures="true">
            <div>
              <p className="font-bold uppercase">{tituloSubPed}</p>
              <div className="border-t border-black w-64 mx-auto mt-8 pt-1">{nomeSubPed}</div>
            </div>
            <div>
              <p className="font-bold uppercase">{tituloDiretor}</p>
              <div className="border-t border-black w-64 mx-auto mt-8 pt-1">{nomeDiretor}</div>
            </div>
          </div>
        </div>

        {/* 3. ATA OFICIAL DA PROVA A4 RETRATO */}
        {ataParaPdf && (
          <div id="provas-ata-individual-a4" style={{ width: '794px' }} className="bg-white text-black p-8 font-serif space-y-5">
            <div className="text-center space-y-1 border-b-2 border-black pb-3">
              <div className="mx-auto flex justify-center mb-1">
                <InsigniaAngola className="w-12 h-12" customUrl={configSistema.insigniaNacionalUrl} />
              </div>
              <p className="text-[11px] font-bold uppercase">República de Angola · Ministério da Educação</p>
              <p className="text-sm font-bold uppercase">{escola.nomeOficial}</p>
              <h2 className="text-base font-bold uppercase underline">Ata Oficial de Realização e Fiscalização de Prova</h2>
              <p className="text-[11px]">Ano Letivo {ataParaPdf.anoLectivo} · {ataParaPdf.tipoProva}</p>
            </div>

            <div className="text-xs leading-relaxed text-justify space-y-2">
              <p>
                Aos <strong>{formatarDataAngolana(ataParaPdf.dataProva)}</strong>, das <strong>{ataParaPdf.horaInicioReal}</strong> às{' '}
                <strong>{ataParaPdf.horaFimReal}</strong>, na sala <strong>{ataParaPdf.sala || 'designada'}</strong> desta instituição de ensino,
                realizou-se a prova de <strong>{ataParaPdf.disciplinaNome}</strong> destinada à turma <strong>{ataParaPdf.turmaNome}</strong> (
                <strong>{ataParaPdf.classe}</strong>
                {isSegundoCiclo(ataParaPdf.classe) && ataParaPdf.curso ? `, curso de ${ataParaPdf.curso}` : ''}), sob a fiscalização{' '}
                {ataParaPdf.fiscais.length > 1 ? 'dos professores' : 'do(a) docente'}:{' '}
                <strong>{ataParaPdf.fiscais.map(f => `${f.professorNome} (${f.papelFiscalizacao})`).join(', ')}</strong>.
              </p>
            </div>

            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1.5 text-center">Alunos Matriculados</th>
                  <th className="border border-black px-2 py-1.5 text-center">Presentes</th>
                  <th className="border border-black px-2 py-1.5 text-center">Faltosos</th>
                  <th className="border border-black px-2 py-1.5 text-center">Provas Anuladas</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{ataParaPdf.alunosMatriculados}</td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{ataParaPdf.alunosPresentes}</td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{ataParaPdf.alunosFaltosos}</td>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{ataParaPdf.alunosAnulados || 0}</td>
                </tr>
              </tbody>
            </table>

            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase">1. Síntese do Decorrer da Prova</h3>
              <p className="text-xs leading-relaxed border border-black p-3 text-justify">{ataParaPdf.sinteseOcorrido}</p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase">2. Registo de Ocorrências Durante a Prova</h3>
              {ataParaPdf.ocorrencias.length === 0 ? (
                <p className="text-xs italic border border-black p-2.5">Sem ocorrências disciplinares ou incidentes registados durante a prova.</p>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1">Hora</th>
                      <th className="border border-black px-2 py-1">Estudante</th>
                      <th className="border border-black px-2 py-1">Tipo</th>
                      <th className="border border-black px-2 py-1">Descrição</th>
                      <th className="border border-black px-2 py-1">Medida Tomada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ataParaPdf.ocorrencias.map(oc => (
                      <tr key={oc.id}>
                        <td className="border border-black px-2 py-1">{oc.hora}</td>
                        <td className="border border-black px-2 py-1">{oc.alunoNome || '-'}</td>
                        <td className="border border-black px-2 py-1">{oc.tipo}</td>
                        <td className="border border-black px-2 py-1">{oc.descricao}</td>
                        <td className="border border-black px-2 py-1">{oc.medidaTomada}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {ataParaPdf.observacoesGerais && (
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase">3. Observações Gerais</h3>
                <p className="text-xs border border-black p-2.5">{ataParaPdf.observacoesGerais}</p>
              </div>
            )}

            <div className="pt-4 space-y-6 text-[11px]">
              <div>
                <p className="font-bold uppercase mb-3 text-center">Assinaturas da Equipa de Fiscalização</p>
                <div className={`grid gap-6 text-center ${ataParaPdf.fiscais.length >= 3 ? 'grid-cols-2' : ataParaPdf.fiscais.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {ataParaPdf.fiscais.map((f, i) => {
                    const funcObj = funcionarios.find(fn => fn.id === f.professorId);
                    const tit = obterTituloProfessor(funcObj, f.professorNome, funcionarios);
                    return (
                      <div key={i} className="pt-4">
                        <div className="border-t border-black w-56 mx-auto pt-1 font-bold">{f.professorNome}</div>
                        <p className="text-[10px]">{tit} · {f.papelFiscalizacao}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 pt-4 text-center">
                <div>
                  <p className="font-bold uppercase">{tituloSubPed}</p>
                  <div className="border-t border-black w-56 mx-auto mt-7 pt-1">{nomeSubPed}</div>
                </div>
                <div>
                  <p className="font-bold uppercase">{tituloDiretor}</p>
                  <div className="border-t border-black w-56 mx-auto mt-7 pt-1">{nomeDiretor}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
