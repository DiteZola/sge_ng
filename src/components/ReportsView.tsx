import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Download,
  Printer,
  Filter,
  Search,
  Edit3,
  Trash2,
  Eye,
  X,
  Building2,
  ShieldCheck,
  Megaphone,
  BookOpen,
  Award,
  Layers,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Escola,
  Turma,
  Aluno,
  Disciplina,
  NotaTrimestralConsolidada,
  Funcionario,
  AnoLectivoConfig,
  AtribuicaoDocente,
  RelatorioAcontecimento,
  CategoriaRelatorioAcontecimento,
  VisibilidadeRelatorioAcontecimento,
  EstadoRelatorioAcontecimento
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { formatarDataAngolana, formatarDataHoraAngolana } from '../utils/dateFormat';

interface ReportsViewProps {
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

interface EventoEscolarExterno {
  id: string;
  escolaId: string;
  anoLectivo: string;
  titulo: string;
  categoria: string;
  dataInicio: string;
  dataFim?: string;
  hora?: string;
  local?: string;
  publicoAlvo: string;
  descricao?: string;
  concluido?: boolean;
}

interface DespachoExterno {
  id: string;
  escolaId: string;
  numeroDespacho: string;
  ano: string;
  assunto: string;
  categoria: string;
  fundamentacaoLegal: string;
  conteudo: string;
  dataEmissao: string;
  assinadoPor: string;
  cargoSignatario: string;
  publicoAlvo: string;
  status: string;
}

interface ReuniaoDirecaoExterna {
  id: string;
  escolaId: string;
  numeroAta: string;
  tipo: string;
  data: string;
  hora: string;
  local: string;
  ordemDoDia: string[];
  membrosPresentes: string[];
  deliberacoes: string[];
  estado: string;
}

type OrigemItemRelatorio = 'Relatorio' | 'Agenda' | 'Conselho_Direcao' | 'Despacho' | 'Ocorrencia_Aluno';

interface ItemRelatorioUnificado extends RelatorioAcontecimento {
  origem: OrigemItemRelatorio;
  somenteLeitura: boolean;
  referenciaOriginal?: string;
}

const CATEGORIAS_CONFIG: Record<
  CategoriaRelatorioAcontecimento,
  { label: string; corBadge: string; subtipos: string[] }
> = {
  Reuniao: {
    label: 'Reunião',
    corBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    subtipos: [
      'Reunião de Direção',
      'Conselho Pedagógico',
      'Conselho de Turma',
      'Reunião de Pais e Encarregados',
      'Reunião de Coordenação de Disciplina',
      'Reunião Extraordinária'
    ]
  },
  Palestra: {
    label: 'Palestra & Formação',
    corBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    subtipos: [
      'Palestra Educativa',
      'Seminário / Simpósio',
      'Capacitação Docente',
      'Workshop Técnico-Pedagógico',
      'Sensibilização Comunitária'
    ]
  },
  Evento: {
    label: 'Evento Escolar',
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    subtipos: [
      'Abertura do Ano Letivo',
      'Jornada Pedagógica',
      'Feira de Ciências / Cultura',
      'Cerimónia Oficial / Efeméride',
      'Actividade Desportiva / Recreativa'
    ]
  },
  Desenvolvimento: {
    label: 'Desenvolvimento',
    corBadge: 'bg-blue-100 text-blue-800 border-blue-200',
    subtipos: [
      'Desenvolvimento Pedagógico',
      'Desenvolvimento Administrativo',
      'Cumprimento Programático / Curricular',
      'Melhoria de Infraestrutura',
      'Projecto Educativo'
    ]
  },
  Ocorrencia: {
    label: 'Ocorrência & Supervisão',
    corBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    subtipos: [
      'Ocorrência Disciplinar / Pedagógica',
      'Visita de Inspecção / Supervisão',
      'Ocorrência de Turno',
      'Relatório de Incidente'
    ]
  }
};

const LABEL_ESTADO: Record<EstadoRelatorioAcontecimento, { label: string; classe: string }> = {
  Rascunho: { label: 'Rascunho', classe: 'bg-slate-100 text-slate-700 border-slate-300' },
  Registado: { label: 'Registado', classe: 'bg-blue-100 text-blue-800 border-blue-200' },
  Homologado: { label: 'Homologado', classe: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
};

const LABEL_VISIBILIDADE: Record<VisibilidadeRelatorioAcontecimento, string> = {
  Publico_Escola: 'Toda a Escola',
  Direcao: 'Direção & Coordenação',
  Docente_Turma: 'Turma / Docência Específica',
  Rede_Nacional: 'Rede Nacional (Administração Central)'
};

const normalizarTexto = (txt?: string): string =>
  (txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const ReportsView: React.FC<ReportsViewProps> = ({
  escola,
  escolas = [],
  currentUser,
  turmas: propTurmas,
  alunos: propAlunos,
  disciplinas: propDisciplinas,
  funcionarios: propFuncionarios,
  anoLectivoConfigs = [],
  atribuicoes: propAtribuicoes,
  onMudarEscola: _onMudarEscola
}) => {
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());
  const [refreshTick, setRefreshTick] = useState(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notificar = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    const onSync = () => {
      setConfigSistema(dbService.getConfiguracaoSistema());
      setRefreshTick(t => t + 1);
    };
    window.addEventListener('sge_dados_atualizados_remoto', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener('sge_dados_atualizados_remoto', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  // Identificação estrita do perfil do utilizador
  const isAdminGeral = currentUser?.role === 'AdminGeral';
  const isDiretorGeral = currentUser?.role === 'DiretorGeral';
  const isSubdiretor =
    currentUser?.role === 'SubdiretorPedagogico' ||
    currentUser?.role === 'SubdiretorAdministrativo' ||
    currentUser?.role === 'SubdirectorAdministrativo';
  const isCoordenadorPedagogico = currentUser?.role === 'CoordenadorPedagogico';
  const isDirecaoOuAdmin =
    isAdminGeral ||
    isDiretorGeral ||
    isSubdiretor ||
    isCoordenadorPedagogico ||
    currentUser?.role === 'ChefeSecretaria' ||
    currentUser?.role === 'Secretaria' ||
    currentUser?.role === 'SecretarioEscolar' ||
    currentUser?.role === 'Secretario' ||
    currentUser?.role === 'TecnicoTI';

  const isProfessor = currentUser?.role === 'Professor';
  const isCoordenadorDisciplina = currentUser?.role === 'CoordenadorDisciplina';
  const isCoordenadorTurno = currentUser?.role === 'CoordenadorTurno';
  const isDocenteEscopoRestrito =
    !isDirecaoOuAdmin && (isProfessor || isCoordenadorDisciplina || isCoordenadorTurno);

  const podeHomologar = isAdminGeral || isDiretorGeral || isSubdiretor || isCoordenadorPedagogico;

  // Filtro de escola para Admin Geral ('TODAS' por padrão para visão global)
  const [escolaFiltroAdmin, setEscolaFiltroAdmin] = useState<string>(() =>
    isAdminGeral ? 'TODAS' : escola.id
  );
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
    if (escola?.id && !map.has(escola.id)) {
      map.set(escola.id, escola);
    }
    return map;
  }, [escolas, escola]);

  // Dados base consolidados
  const todasTurmas = useMemo(() => {
    if (isAdminGeral) {
      const todas = dbService.getTurmas();
      return escolaFiltroAdmin === 'TODAS'
        ? todas
        : todas.filter(t => t.escolaId === escolaFiltroAdmin);
    }
    return propTurmas;
  }, [isAdminGeral, escolaFiltroAdmin, propTurmas, refreshTick]);

  const todosAlunos = useMemo(() => {
    if (isAdminGeral) {
      const todos = dbService.getAlunos();
      return escolaFiltroAdmin === 'TODAS'
        ? todos
        : todos.filter(a => a.escolaId === escolaFiltroAdmin);
    }
    return propAlunos;
  }, [isAdminGeral, escolaFiltroAdmin, propAlunos, refreshTick]);

  const todasDisciplinas = useMemo(() => {
    if (isAdminGeral) {
      const todas = dbService.getDisciplinas();
      return escolaFiltroAdmin === 'TODAS'
        ? todas
        : todas.filter(d => d.escolaId === escolaFiltroAdmin);
    }
    return propDisciplinas;
  }, [isAdminGeral, escolaFiltroAdmin, propDisciplinas, refreshTick]);

  const todasAtribuicoes = useMemo(() => {
    if (isAdminGeral) {
      const todas = dbService.getAtribuicoes();
      return escolaFiltroAdmin === 'TODAS'
        ? todas
        : todas.filter(a => a.escolaId === escolaFiltroAdmin);
    }
    return propAtribuicoes || dbService.getAtribuicoes(escola.id);
  }, [isAdminGeral, escolaFiltroAdmin, propAtribuicoes, escola.id, refreshTick]);

  const todosFuncionarios = useMemo(() => {
    if (isAdminGeral) {
      const todos = dbService.getFuncionarios().filter(f => f.role !== 'AdminGeral');
      return escolaFiltroAdmin === 'TODAS'
        ? todos
        : todos.filter(f => f.escolaId === escolaFiltroAdmin);
    }
    return propFuncionarios || dbService.getFuncionarios(escola.id);
  }, [isAdminGeral, escolaFiltroAdmin, propFuncionarios, escola.id, refreshTick]);

  // Escopo do Docente / Coordenador de Turno / Disciplina
  const minhasAtribuicoes = useMemo(() => {
    if (!currentUser || !isDocenteEscopoRestrito) return [];
    return todasAtribuicoes.filter(a => {
      if (a.escolaId && a.escolaId !== escola.id) return false;
      return a.professorId === currentUser.id;
    });
  }, [currentUser, isDocenteEscopoRestrito, todasAtribuicoes, escola.id]);

  const minhasTurmasIds = useMemo(() => {
    const ids = new Set<string>();
    if (!currentUser) return ids;
    minhasAtribuicoes.forEach(a => {
      if (a.turmaId) ids.add(a.turmaId);
    });
    todasTurmas.forEach(t => {
      if (t.escolaId !== escola.id) return;
      if (
        t.coordenadorId === currentUser.id ||
        (t.coordenadorNome &&
          normalizarTexto(t.coordenadorNome) === normalizarTexto(currentUser.nomeCompleto)) ||
        (t.directorTurmaNome &&
          normalizarTexto(t.directorTurmaNome) === normalizarTexto(currentUser.nomeCompleto))
      ) {
        ids.add(t.id);
      }
      if (isCoordenadorTurno && currentUser.cargo) {
        const cargoNorm = normalizarTexto(currentUser.cargo);
        const turnoNorm = normalizarTexto(t.turno);
        if (turnoNorm && cargoNorm.includes(turnoNorm)) {
          ids.add(t.id);
        }
      }
    });
    return ids;
  }, [currentUser, minhasAtribuicoes, todasTurmas, escola.id, isCoordenadorTurno]);

  const minhasDisciplinasIds = useMemo(() => {
    const ids = new Set<string>();
    minhasAtribuicoes.forEach(a => {
      if (a.disciplinaId) ids.add(a.disciplinaId);
    });
    if (isCoordenadorDisciplina && currentUser?.especialidade) {
      const espNorm = normalizarTexto(currentUser.especialidade);
      todasDisciplinas.forEach(d => {
        if (d.escolaId === escola.id && normalizarTexto(d.nome).includes(espNorm)) {
          ids.add(d.id);
        }
      });
    }
    return ids;
  }, [minhasAtribuicoes, isCoordenadorDisciplina, currentUser, todasDisciplinas, escola.id]);

  // Anos letivos disponíveis
  const anosConfigs = useMemo(() => {
    if (isVisaoRedeTodas) {
      return dbService.getAnosLectivosConfigs();
    }
    return anoLectivoConfigs.length > 0
      ? anoLectivoConfigs
      : dbService.getAnosLectivosConfigs(escolaExibida.id);
  }, [isVisaoRedeTodas, anoLectivoConfigs, escolaExibida.id, refreshTick]);

  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    anosConfigs.forEach(a => {
      const rot = a.rotulo || a.ano;
      if (rot) set.add(rot);
    });
    if (escolaExibida.anoLectivoActivo) set.add(escolaExibida.anoLectivoActivo);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [anosConfigs, escolaExibida.anoLectivoActivo]);

  // Filtros
  const [filtroAno, setFiltroAno] = useState<string>('TODOS');
  const [filtroTrimestre, setFiltroTrimestre] = useState<string>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<'TODAS' | CategoriaRelatorioAcontecimento>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoRelatorioAcontecimento>('TODOS');
  const [filtroOrigem, setFiltroOrigem] = useState<'TODAS' | OrigemItemRelatorio>('TODAS');
  const [filtroTurmaId, setFiltroTurmaId] = useState<string>('TODAS');
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');
  const [busca, setBusca] = useState<string>('');

  // Relatórios estruturados guardados na base de dados (sincronizados via Firebase + cache offline)
  const relatoriosEstruturados = useMemo(() => {
    return dbService.getRelatoriosAcontecimentos('TODAS');
  }, [refreshTick]);

  // Agregação segura com os módulos existentes (Agenda Escolar, Reuniões de Direção, Despachos e Ocorrências de Alunos)
  const todosItensBrutos = useMemo<ItemRelatorioUnificado[]>(() => {
    const lista: ItemRelatorioUnificado[] = [];

    // 1. Relatórios de Acontecimentos registados diretamente (CRUD principal)
    relatoriosEstruturados.forEach(r => {
      lista.push({
        ...r,
        origem: 'Relatorio',
        somenteLeitura: false
      });
    });

    // Escolas relevantes para leitura de chaves locais complementares
    const escolaIdsAlvo = isAdminGeral
      ? escolaFiltroAdmin === 'TODAS'
        ? Array.from(escolasMap.keys())
        : [escolaFiltroAdmin]
      : [escola.id];

    // 2. Eventos Escolares (Calendário / Agenda Escolar)
    try {
      const rawEventos = localStorage.getItem('sge_eventos_escolares');
      if (rawEventos) {
        const parsed: EventoEscolarExterno[] = JSON.parse(rawEventos);
        if (Array.isArray(parsed)) {
          parsed.forEach(ev => {
            if (!escolaIdsAlvo.includes(ev.escolaId)) return;
            const esc = escolasMap.get(ev.escolaId);
            const catRaw = normalizarTexto(ev.categoria);
            const categoriaMapeada: CategoriaRelatorioAcontecimento = catRaw.includes('reuniao')
              ? 'Reuniao'
              : catRaw.includes('palestra')
              ? 'Palestra'
              : catRaw.includes('pedagogic')
              ? 'Desenvolvimento'
              : 'Evento';
            const visibilidade: VisibilidadeRelatorioAcontecimento =
              ev.publicoAlvo === 'Direção' ? 'Direcao' : 'Publico_Escola';

            lista.push({
              id: `agenda-${ev.id}`,
              escolaId: ev.escolaId,
              escolaNome: esc?.nomeOficial || esc?.nome,
              anoLectivo: ev.anoLectivo || esc?.anoLectivoActivo || '',
              categoria: categoriaMapeada,
              subtipo: `Agenda: ${ev.categoria}`,
              titulo: ev.titulo,
              data: ev.dataInicio,
              hora: ev.hora,
              local: ev.local || 'Recinto Escolar',
              organizadorNome: 'Calendário Escolar',
              publicoAlvo: (ev.publicoAlvo as any) || 'Toda a Comunidade',
              resumoAcontecimentos: ev.descricao || `Actividade registada na agenda escolar (${ev.categoria}).`,
              nivelVisibilidade: visibilidade,
              estado: ev.concluido ? 'Homologado' : 'Registado',
              criadoPorId: 'sistema-agenda',
              criadoPorNome: 'Agenda Escolar',
              criadoPorRole: 'Secretaria',
              criadoEm: ev.dataInicio || '',
              origem: 'Agenda',
              somenteLeitura: true,
              referenciaOriginal: ev.id
            });
          });
        }
      }
    } catch {
      // ignore malformed local events
    }

    // 3. Reuniões de Conselho de Direção & Despachos Executivos (por escola)
    escolaIdsAlvo.forEach(escId => {
      const esc = escolasMap.get(escId);
      const escNome = esc?.nomeOficial || esc?.nome || '';

      try {
        const rawReunioes = localStorage.getItem(`sge_reunioes_direcao_${escId}`);
        if (rawReunioes) {
          const parsed: ReuniaoDirecaoExterna[] = JSON.parse(rawReunioes);
          if (Array.isArray(parsed)) {
            parsed.forEach(reu => {
              lista.push({
                id: `reu-dir-${escId}-${reu.id}`,
                escolaId: escId,
                escolaNome: escNome,
                anoLectivo: esc?.anoLectivoActivo || (reu.data || '').slice(0, 4),
                categoria: 'Reuniao',
                subtipo: `Conselho de Direção (${reu.tipo})`,
                titulo: `${reu.numeroAta} — Reunião ${reu.tipo}`,
                data: reu.data,
                hora: reu.hora,
                local: reu.local || 'Sala da Direção',
                organizadorNome: esc?.diretorGeralNome || 'Direção Executiva',
                organizadorRole: 'DiretorGeral',
                participantes: (reu.membrosPresentes || []).join(', '),
                numeroParticipantes: (reu.membrosPresentes || []).length,
                publicoAlvo: 'Direção',
                resumoAcontecimentos:
                  (reu.ordemDoDia || []).length > 0
                    ? `Ordem do Dia: ${reu.ordemDoDia.join('; ')}`
                    : 'Reunião do Conselho de Direção.',
                deliberacoesEncaminhamentos: (reu.deliberacoes || []).join('\n• '),
                nivelVisibilidade: 'Direcao',
                estado: reu.estado === 'Concluída' ? 'Homologado' : 'Registado',
                criadoPorId: 'conselho-direcao',
                criadoPorNome: 'Conselho de Direção',
                criadoPorRole: 'DiretorGeral',
                criadoEm: reu.data || '',
                origem: 'Conselho_Direcao',
                somenteLeitura: true,
                referenciaOriginal: reu.numeroAta
              });
            });
          }
        }
      } catch {
        // silent
      }

      try {
        const rawDespachos = localStorage.getItem(`sge_despachos_${escId}`);
        if (rawDespachos) {
          const parsed: DespachoExterno[] = JSON.parse(rawDespachos);
          if (Array.isArray(parsed)) {
            parsed.forEach(desp => {
              const vis: VisibilidadeRelatorioAcontecimento =
                desp.publicoAlvo === 'Geral' || desp.publicoAlvo === 'Professores'
                  ? 'Publico_Escola'
                  : 'Direcao';
              lista.push({
                id: `desp-${escId}-${desp.id}`,
                escolaId: escId,
                escolaNome: escNome,
                anoLectivo: desp.ano || esc?.anoLectivoActivo || '',
                categoria: 'Desenvolvimento',
                subtipo: `Despacho (${desp.categoria})`,
                titulo: `${desp.numeroDespacho} — ${desp.assunto}`,
                data: desp.dataEmissao,
                local: 'Gabinete da Direção Geral',
                organizadorNome: desp.assinadoPor || esc?.diretorGeralNome || 'Diretor Geral',
                organizadorRole: desp.cargoSignatario || 'DiretorGeral',
                publicoAlvo:
                  desp.publicoAlvo === 'Geral' ? 'Toda a Comunidade' : (desp.publicoAlvo as any),
                resumoAcontecimentos: desp.conteudo,
                deliberacoesEncaminhamentos: desp.fundamentacaoLegal,
                nivelVisibilidade: vis,
                estado: desp.status === 'Em Vigor' ? 'Homologado' : 'Rascunho',
                criadoPorId: 'direcao-despacho',
                criadoPorNome: desp.assinadoPor || 'Direção Geral',
                criadoPorRole: 'DiretorGeral',
                criadoEm: desp.dataEmissao || '',
                origem: 'Despacho',
                somenteLeitura: true,
                referenciaOriginal: desp.numeroDespacho
              });
            });
          }
        }
      } catch {
        // silent
      }
    });

    // 4. Ocorrências registadas nas fichas dos alunos (para visão agregada)
    todosAlunos.forEach(al => {
      if (!al.ocorrencias || al.ocorrencias.length === 0) return;
      const esc = escolasMap.get(al.escolaId);
      const turmaAl = todasTurmas.find(t => t.id === al.turmaId);
      al.ocorrencias.forEach(oc => {
        const ehReuniao = oc.tipo === 'Reunião Encarregado';
        lista.push({
          id: `oc-${al.id}-${oc.id}`,
          escolaId: al.escolaId,
          escolaNome: esc?.nomeOficial || esc?.nome || '',
          anoLectivo: oc.anoLectivo || al.anoLectivo || esc?.anoLectivoActivo || '',
          categoria: ehReuniao ? 'Reuniao' : 'Ocorrencia',
          subtipo: `${oc.tipo}${oc.gravidade ? ` (${oc.gravidade})` : ''}`,
          titulo: `${oc.tipo} — ${al.nomeCompleto}`,
          data: oc.data,
          organizadorNome: oc.registadoPor || 'Equipa Pedagógica',
          organizadorRole: oc.cargo,
          publicoAlvo: ehReuniao ? 'Encarregados' : 'Direção',
          turmaId: al.turmaId,
          turmaNome: oc.turmaNome || turmaAl?.nome || '',
          classe: oc.classe || turmaAl?.classe || al.classeId,
          turno: turmaAl?.turno,
          resumoAcontecimentos: oc.descricao,
          deliberacoesEncaminhamentos: oc.resolucao,
          nivelVisibilidade: 'Docente_Turma',
          estado: oc.resolucao ? 'Homologado' : 'Registado',
          criadoPorId: oc.registadoPor || 'docente',
          criadoPorNome: oc.registadoPor || 'Equipa Pedagógica',
          criadoPorRole: oc.cargo || 'Professor',
          criadoEm: oc.data || '',
          origem: 'Ocorrencia_Aluno',
          somenteLeitura: true,
          referenciaOriginal: al.numeroProcesso || al.codigoMatricula
        });
      });
    });

    return lista;
  }, [
    relatoriosEstruturados,
    isAdminGeral,
    escolaFiltroAdmin,
    escolasMap,
    escola.id,
    todosAlunos,
    todasTurmas,
    refreshTick
  ]);

  // Aplicação rigorosa das regras de visibilidade por Perfil + Filtros
  const itensVisiveisPorPerfil = useMemo(() => {
    return todosItensBrutos
      .filter(item => {
        // Escopo por Escola
        if (isAdminGeral) {
          if (escolaFiltroAdmin !== 'TODAS') {
            if (item.escolaId !== escolaFiltroAdmin && item.escolaId !== 'REDE') {
              return false;
            }
          }
        } else {
          const ehDaEscola = item.escolaId === escola.id;
          const ehCircularNacional =
            item.escolaId === 'REDE' && item.nivelVisibilidade === 'Rede_Nacional';
          if (!ehDaEscola && !ehCircularNacional) return false;
        }

        // Escopo por Perfil
        if (isDocenteEscopoRestrito && currentUser) {
          const ehMeu =
            item.criadoPorId === currentUser.id ||
            item.organizadorId === currentUser.id ||
            (item.criadoPorNome &&
              normalizarTexto(item.criadoPorNome) === normalizarTexto(currentUser.nomeCompleto));

          if (ehMeu) return true;

          // Documentos exclusivos da Direção ou Rede Nacional restrita não aparecem ao docente
          if (item.nivelVisibilidade === 'Direcao' || item.origem === 'Conselho_Direcao') {
            return false;
          }

          // Eventos/Relatórios públicos para toda a escola ou corpo docente
          if (
            item.nivelVisibilidade === 'Publico_Escola' ||
            item.publicoAlvo === 'Toda a Comunidade' ||
            item.publicoAlvo === 'Professores'
          ) {
            return true;
          }

          // Relatórios ou ocorrências da mesma turma/disciplina/turno sob responsabilidade do docente
          if (item.turmaId && minhasTurmasIds.has(item.turmaId)) return true;
          if (item.disciplinaId && minhasDisciplinasIds.has(item.disciplinaId)) return true;
          if (
            isCoordenadorTurno &&
            item.turno &&
            currentUser.cargo &&
            normalizarTexto(currentUser.cargo).includes(normalizarTexto(item.turno))
          ) {
            return true;
          }

          return false;
        }

        // Direção e AdminGeral veem globalmente no seu respectivo escopo
        return true;
      })
      .sort((a, b) => {
        const da = a.data || a.criadoEm || '';
        const db = b.data || b.criadoEm || '';
        return db.localeCompare(da);
      });
  }, [
    todosItensBrutos,
    isAdminGeral,
    escolaFiltroAdmin,
    escola.id,
    isDocenteEscopoRestrito,
    currentUser,
    minhasTurmasIds,
    minhasDisciplinasIds,
    isCoordenadorTurno
  ]);

  // Filtros aplicados sobre os itens permitidos ao perfil
  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    return itensVisiveisPorPerfil.filter(item => {
      if (filtroAno !== 'TODOS' && item.anoLectivo && item.anoLectivo !== filtroAno) {
        return false;
      }
      if (filtroTrimestre !== 'TODOS' && item.trimestre && item.trimestre !== filtroTrimestre) {
        return false;
      }
      if (filtroCategoria !== 'TODAS' && item.categoria !== filtroCategoria) {
        return false;
      }
      if (filtroEstado !== 'TODOS' && item.estado !== filtroEstado) {
        return false;
      }
      if (filtroOrigem !== 'TODAS' && item.origem !== filtroOrigem) {
        return false;
      }
      if (filtroTurmaId !== 'TODAS' && item.turmaId !== filtroTurmaId) {
        return false;
      }
      if (filtroDataInicio && item.data && item.data < filtroDataInicio) {
        return false;
      }
      if (filtroDataFim && item.data && item.data > filtroDataFim) {
        return false;
      }
      if (termo) {
        const alvo = normalizarTexto(
          `${item.titulo} ${item.subtipo || ''} ${item.resumoAcontecimentos} ${item.deliberacoesEncaminhamentos || ''} ${item.organizadorNome} ${item.local || ''} ${item.escolaNome || ''} ${item.turmaNome || ''}`
        );
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [
    itensVisiveisPorPerfil,
    filtroAno,
    filtroTrimestre,
    filtroCategoria,
    filtroEstado,
    filtroOrigem,
    filtroTurmaId,
    filtroDataInicio,
    filtroDataFim,
    busca
  ]);

  // Métricas / Resumo executivo dos relatórios filtrados
  const metricasRelatorios = useMemo(() => {
    const total = itensFiltrados.length;
    const reunioes = itensFiltrados.filter(i => i.categoria === 'Reuniao').length;
    const palestrasEventos = itensFiltrados.filter(
      i => i.categoria === 'Palestra' || i.categoria === 'Evento'
    ).length;
    const desenvolvimentosOcorrencias = itensFiltrados.filter(
      i => i.categoria === 'Desenvolvimento' || i.categoria === 'Ocorrencia'
    ).length;
    const homologados = itensFiltrados.filter(i => i.estado === 'Homologado').length;
    const participantesTotais = itensFiltrados.reduce(
      (acc, i) => acc + (i.numeroParticipantes || 0),
      0
    );
    const escolasCobertas = new Set(
      itensFiltrados.map(i => i.escolaId).filter(id => id && id !== 'REDE')
    ).size;

    return {
      total,
      reunioes,
      palestrasEventos,
      desenvolvimentosOcorrencias,
      homologados,
      taxaHomologacao: total > 0 ? Math.round((homologados / total) * 100) : 0,
      participantesTotais,
      escolasCobertas
    };
  }, [itensFiltrados]);

  // Estado do Modal de Novo / Editar Relatório
  const [modalAberto, setModalAberto] = useState(false);
  const [detalheItem, setDetalheItem] = useState<ItemRelatorioUnificado | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [formEscolaId, setFormEscolaId] = useState<string>(escola.id);
  const [formAnoLectivo, setFormAnoLectivo] = useState<string>(
    escolaExibida.anoLectivoActivo || anosDisponiveis[0] || String(new Date().getFullYear())
  );
  const [formTrimestre, setFormTrimestre] = useState<string>('1');
  const [formCategoria, setFormCategoria] = useState<CategoriaRelatorioAcontecimento>('Reuniao');
  const [formSubtipo, setFormSubtipo] = useState<string>(CATEGORIAS_CONFIG.Reuniao.subtipos[0]);
  const [formTitulo, setFormTitulo] = useState<string>('');
  const [formData, setFormData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formHora, setFormHora] = useState<string>('09:00');
  const [formLocal, setFormLocal] = useState<string>('');
  const [formOrganizadorNome, setFormOrganizadorNome] = useState<string>(
    currentUser?.nomeCompleto || ''
  );
  const [formPublicoAlvo, setFormPublicoAlvo] = useState<RelatorioAcontecimento['publicoAlvo']>(
    isDocenteEscopoRestrito ? 'Professores' : 'Toda a Comunidade'
  );
  const [formParticipantes, setFormParticipantes] = useState<string>('');
  const [formNumeroParticipantes, setFormNumeroParticipantes] = useState<string>('');
  const [formTurmaId, setFormTurmaId] = useState<string>('');
  const [formDisciplinaId, setFormDisciplinaId] = useState<string>('');
  const [formResumo, setFormResumo] = useState<string>('');
  const [formDeliberacoes, setFormDeliberacoes] = useState<string>('');
  const [formResultados, setFormResultados] = useState<string>('');
  const [formVisibilidade, setFormVisibilidade] = useState<VisibilidadeRelatorioAcontecimento>(
    isAdminGeral ? 'Rede_Nacional' : isDocenteEscopoRestrito ? 'Docente_Turma' : 'Publico_Escola'
  );
  const [formEstado, setFormEstado] = useState<EstadoRelatorioAcontecimento>('Registado');

  // Turmas disponíveis para associação no formulário conforme perfil
  const turmasDisponiveisForm = useMemo(() => {
    const base = isAdminGeral
      ? dbService.getTurmas().filter(t => formEscolaId === 'REDE' || t.escolaId === formEscolaId)
      : todasTurmas;
    if (isDocenteEscopoRestrito && minhasTurmasIds.size > 0) {
      return base.filter(t => minhasTurmasIds.has(t.id));
    }
    return base;
  }, [isAdminGeral, formEscolaId, todasTurmas, isDocenteEscopoRestrito, minhasTurmasIds]);

  const disciplinasDisponiveisForm = useMemo(() => {
    const base = isAdminGeral
      ? dbService.getDisciplinas(formEscolaId === 'REDE' ? undefined : formEscolaId)
      : todasDisciplinas;
    if (isDocenteEscopoRestrito && minhasDisciplinasIds.size > 0) {
      return base.filter(d => minhasDisciplinasIds.has(d.id));
    }
    return base;
  }, [isAdminGeral, formEscolaId, todasDisciplinas, isDocenteEscopoRestrito, minhasDisciplinasIds]);

  const abrirModalNovo = (categoriaInicial: CategoriaRelatorioAcontecimento = 'Reuniao') => {
    setEditandoId(null);
    setFormEscolaId(
      isAdminGeral
        ? escolaFiltroAdmin !== 'TODAS'
          ? escolaFiltroAdmin
          : 'REDE'
        : escola.id
    );
    setFormAnoLectivo(
      escolaExibida.anoLectivoActivo || anosDisponiveis[0] || String(new Date().getFullYear())
    );
    setFormTrimestre('1');
    setFormCategoria(categoriaInicial);
    setFormSubtipo(CATEGORIAS_CONFIG[categoriaInicial].subtipos[0]);
    setFormTitulo('');
    setFormData(new Date().toISOString().split('T')[0]);
    setFormHora('09:00');
    setFormLocal(isAdminGeral ? 'Sede / Supervisão Central' : 'Anfiteatro / Sala de Reuniões');
    setFormOrganizadorNome(currentUser?.nomeCompleto || '');
    setFormPublicoAlvo(
      isAdminGeral
        ? 'Rede Nacional'
        : isDocenteEscopoRestrito
        ? 'Estudantes'
        : 'Toda a Comunidade'
    );
    setFormParticipantes('');
    setFormNumeroParticipantes('');
    setFormTurmaId('');
    setFormDisciplinaId('');
    setFormResumo('');
    setFormDeliberacoes('');
    setFormResultados('');
    setFormVisibilidade(
      isAdminGeral ? 'Rede_Nacional' : isDocenteEscopoRestrito ? 'Docente_Turma' : 'Publico_Escola'
    );
    setFormEstado('Registado');
    setModalAberto(true);
  };

  const abrirModalEditar = (item: ItemRelatorioUnificado) => {
    if (item.somenteLeitura) return;
    setEditandoId(item.id);
    setFormEscolaId(item.escolaId);
    setFormAnoLectivo(item.anoLectivo || '');
    setFormTrimestre(item.trimestre || '1');
    setFormCategoria(item.categoria);
    setFormSubtipo(item.subtipo || CATEGORIAS_CONFIG[item.categoria].subtipos[0]);
    setFormTitulo(item.titulo);
    setFormData(item.data || new Date().toISOString().split('T')[0]);
    setFormHora(item.hora || '');
    setFormLocal(item.local || '');
    setFormOrganizadorNome(item.organizadorNome || '');
    setFormPublicoAlvo(item.publicoAlvo || 'Toda a Comunidade');
    setFormParticipantes(item.participantes || '');
    setFormNumeroParticipantes(
      item.numeroParticipantes !== undefined ? String(item.numeroParticipantes) : ''
    );
    setFormTurmaId(item.turmaId || '');
    setFormDisciplinaId(item.disciplinaId || '');
    setFormResumo(item.resumoAcontecimentos || '');
    setFormDeliberacoes(item.deliberacoesEncaminhamentos || '');
    setFormResultados(item.resultadosObtidos || '');
    setFormVisibilidade(item.nivelVisibilidade || 'Publico_Escola');
    setFormEstado(item.estado || 'Registado');
    setModalAberto(true);
  };

  const handleSalvarRelatorio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formResumo.trim() || !formData) {
      notificar('Preencha pelo menos o Título, a Data e a Descrição dos Acontecimentos.');
      return;
    }

    const escDestino =
      formEscolaId === 'REDE'
        ? undefined
        : escolasMap.get(formEscolaId) || escola;
    const turmaSel = turmasDisponiveisForm.find(t => t.id === formTurmaId);
    const discSel = disciplinasDisponiveisForm.find(d => d.id === formDisciplinaId);
    const existente = editandoId
      ? relatoriosEstruturados.find(r => r.id === editandoId)
      : undefined;

    const estadoFinal: EstadoRelatorioAcontecimento =
      formEstado === 'Homologado' && !podeHomologar ? 'Registado' : formEstado;

    const payload: RelatorioAcontecimento = {
      id: editandoId || `rel-acont-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: isAdminGeral ? formEscolaId : escola.id,
      escolaNome:
        formEscolaId === 'REDE'
          ? 'Rede Escolar (Administração Central)'
          : escDestino?.nomeOficial || escDestino?.nome || escola.nome,
      anoLectivo: formAnoLectivo || escolaExibida.anoLectivoActivo || '',
      trimestre: formTrimestre || '1',
      categoria: formCategoria,
      subtipo: formSubtipo.trim() || CATEGORIAS_CONFIG[formCategoria].label,
      titulo: formTitulo.trim(),
      data: formData,
      hora: formHora.trim() || undefined,
      local: formLocal.trim() || undefined,
      organizadorId: currentUser?.id,
      organizadorNome:
        formOrganizadorNome.trim() || currentUser?.nomeCompleto || 'Responsável',
      organizadorRole: currentUser?.role || 'Professor',
      participantes: formParticipantes.trim() || undefined,
      numeroParticipantes: formNumeroParticipantes
        ? Math.max(0, parseInt(formNumeroParticipantes, 10) || 0)
        : undefined,
      publicoAlvo: formPublicoAlvo,
      turmaId: turmaSel?.id,
      turmaNome: turmaSel?.nome,
      classe: turmaSel?.classe,
      turno: turmaSel?.turno || (isCoordenadorTurno ? currentUser?.cargo : undefined),
      disciplinaId: discSel?.id,
      disciplinaNome: discSel?.nome,
      resumoAcontecimentos: formResumo.trim(),
      deliberacoesEncaminhamentos: formDeliberacoes.trim() || undefined,
      resultadosObtidos: formResultados.trim() || undefined,
      nivelVisibilidade: formVisibilidade,
      estado: estadoFinal,
      homologadoPorNome:
        estadoFinal === 'Homologado'
          ? existente?.homologadoPorNome || currentUser?.nomeCompleto || 'Direção'
          : undefined,
      homologadoEm:
        estadoFinal === 'Homologado'
          ? existente?.homologadoEm || new Date().toISOString()
          : undefined,
      criadoPorId: existente?.criadoPorId || currentUser?.id || 'sistema',
      criadoPorNome: existente?.criadoPorNome || currentUser?.nomeCompleto || 'Utilizador',
      criadoPorRole: existente?.criadoPorRole || currentUser?.role || 'Professor',
      criadoEm: existente?.criadoEm || new Date().toISOString()
    };

    dbService.salvarRelatorioAcontecimento(payload);
    setRefreshTick(t => t + 1);
    setModalAberto(false);
    notificar(
      editandoId
        ? 'Relatório atualizado e guardado com sucesso.'
        : 'Relatório de acontecimento registado com sucesso (sincronização offline/online ativa).'
    );
  };

  const handleHomologar = (item: ItemRelatorioUnificado) => {
    if (item.somenteLeitura || !podeHomologar) return;
    const original = relatoriosEstruturados.find(r => r.id === item.id);
    if (!original) return;
    dbService.salvarRelatorioAcontecimento({
      ...original,
      estado: 'Homologado',
      homologadoPorNome: currentUser?.nomeCompleto || 'Direção Geral',
      homologadoEm: new Date().toISOString()
    });
    setRefreshTick(t => t + 1);
    if (detalheItem?.id === item.id) {
      setDetalheItem({
        ...item,
        estado: 'Homologado',
        homologadoPorNome: currentUser?.nomeCompleto || 'Direção Geral',
        homologadoEm: new Date().toISOString()
      });
    }
    notificar(`Relatório "${item.titulo}" homologado com sucesso.`);
  };

  const handleExcluir = (item: ItemRelatorioUnificado) => {
    if (item.somenteLeitura) return;
    const podeExcluir =
      isAdminGeral ||
      isDiretorGeral ||
      isSubdiretor ||
      (item.criadoPorId === currentUser?.id && item.estado !== 'Homologado');
    if (!podeExcluir) return;
    dbService.excluirRelatorioAcontecimento(item.id);
    setRefreshTick(t => t + 1);
    if (detalheItem?.id === item.id) setDetalheItem(null);
    notificar('Relatório removido.');
  };

  // Exportação Excel formatada (sem branding de software)
  const handleExportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const linhas = [
      [
        'Nº',
        'Data',
        'Hora',
        'Escola / Âmbito',
        'Categoria',
        'Subtipo',
        'Título do Relatório',
        'Local',
        'Organizador / Responsável',
        'Público-Alvo',
        'Turma / Disciplina',
        'Nº Participantes',
        'Resumo dos Acontecimentos',
        'Deliberações & Encaminhamentos',
        'Resultados Obtidos',
        'Estado',
        'Homologado Por'
      ],
      ...itensFiltrados.map((item, idx) => [
        idx + 1,
        item.data || '—',
        item.hora || '—',
        item.escolaNome || escolasMap.get(item.escolaId)?.nome || (item.escolaId === 'REDE' ? 'Rede Escolar Nacional' : '—'),
        CATEGORIAS_CONFIG[item.categoria]?.label || item.categoria,
        item.subtipo || '—',
        item.titulo,
        item.local || '—',
        item.organizadorNome || '—',
        item.publicoAlvo || '—',
        [item.turmaNome, item.disciplinaNome].filter(Boolean).join(' • ') || 'Geral',
        item.numeroParticipantes ?? '',
        item.resumoAcontecimentos,
        item.deliberacoesEncaminhamentos || '—',
        item.resultadosObtidos || '—',
        LABEL_ESTADO[item.estado]?.label || item.estado,
        item.homologadoPorNome || '—'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(linhas);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 8 },
      { wch: 28 },
      { wch: 18 },
      { wch: 24 },
      { wch: 36 },
      { wch: 22 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 52 },
      { wch: 44 },
      { wch: 36 },
      { wch: 14 },
      { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorios_Acontecimentos');
    const escNomeSlug = isVisaoRedeTodas
      ? 'REDE_NACIONAL'
      : (escolaExibida.sigla || escolaExibida.nome || 'ESCOLA').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Relatorios_Acontecimentos_${escNomeSlug}_${filtroAno}.xlsx`);
    notificar('Ficheiro Excel exportado com sucesso.');
  };

  const handleBaixarPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const escNomeSlug = isVisaoRedeTodas
        ? 'REDE_NACIONAL'
        : (escolaExibida.sigla || escolaExibida.nome || 'ESCOLA').replace(/\s+/g, '_');
      await downloadElementAsPdf(
        'relatorio-acontecimentos-oficial-doc',
        `Relatorio_Acontecimentos_${escNomeSlug}_${filtroAno}.pdf`,
        { orientation: 'portrait', scale: 2, marginMm: 10 }
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleImprimir = () => {
    const el = document.getElementById('relatorio-acontecimentos-oficial-doc');
    if (el) {
      imprimirElementoDiretamente(el, 'Relatorio_de_Acontecimentos', {
        orientation: 'portrait',
        marginMm: 10
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* CABEÇALHO DE COMANDO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Relatórios de Acontecimentos & Actividades
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border ${
                    isAdminGeral
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : isDirecaoOuAdmin
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isAdminGeral
                    ? 'Visão Global — Todas as Escolas'
                    : isDirecaoOuAdmin
                    ? 'Visão Global da Escola (Direção)'
                    : 'Âmbito Docente & Atividades Gerais'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {isAdminGeral
                  ? 'Registo centralizado e acompanhamento global de reuniões, palestras, eventos, desenvolvimentos e ocorrências em toda a rede escolar.'
                  : isDirecaoOuAdmin
                  ? 'Registo e homologação de atas, reuniões, palestras, eventos institucionais, avanços pedagógicos e ocorrências da escola.'
                  : 'Registe e acompanhe relatórios de reuniões de turma/disciplina, palestras, desenvolvimentos pedagógicos e eventos escolares.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => abrirModalNovo('Reuniao')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Relatório de Acontecimento</span>
            </button>
            <button
              type="button"
              onClick={handleExportarExcel}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleBaixarPdf}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'A Gerar...' : 'Baixar PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir (A4)</span>
            </button>
          </div>
        </div>

        {/* ATALHOS RÁPIDOS DE REGISTO POR TIPO */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase text-slate-500 mr-1">
            Registo Rápido:
          </span>
          {(Object.keys(CATEGORIAS_CONFIG) as CategoriaRelatorioAcontecimento[]).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => abrirModalNovo(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all hover:opacity-90 cursor-pointer flex items-center space-x-1 ${CATEGORIAS_CONFIG[cat].corBadge}`}
            >
              <Plus className="w-3 h-3" />
              <span>{CATEGORIAS_CONFIG[cat].label}</span>
            </button>
          ))}
        </div>

        {feedback && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{feedback}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-emerald-700 hover:text-emerald-950 font-black px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* FILTROS POR ESCOLA, PERFIL, CATEGORIA E PERÍODO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-4 border-t border-slate-100">
          {isAdminGeral && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Escola / Âmbito</span>
              </label>
              <select
                value={escolaFiltroAdmin}
                onChange={e => {
                  setEscolaFiltroAdmin(e.target.value);
                  setFiltroTurmaId('TODAS');
                }}
                className="w-full bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-950"
              >
                <option value="TODAS">Todas as Escolas ({escolas.length})</option>
                {escolas.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.sigla ? `[${e.sigla}] ` : ''}
                    {e.nomeOficial || e.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ano Letivo</span>
            </label>
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="TODOS">Todos os Anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Categoria</span>
            </label>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="TODAS">Todas as Categorias</option>
              {(Object.keys(CATEGORIAS_CONFIG) as CategoriaRelatorioAcontecimento[]).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORIAS_CONFIG[cat].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Estado</span>
            </label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="TODOS">Todos os Estados</option>
              <option value="Registado">Registado</option>
              <option value="Homologado">Homologado</option>
              <option value="Rascunho">Rascunho</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Origem do Registo</span>
            </label>
            <select
              value={filtroOrigem}
              onChange={e => setFiltroOrigem(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="TODAS">Todas as Origens</option>
              <option value="Relatorio">Relatórios de Acontecimentos</option>
              <option value="Agenda">Agenda Escolar</option>
              {isDirecaoOuAdmin && <option value="Conselho_Direcao">Conselho de Direção</option>}
              <option value="Despacho">Despachos da Direção</option>
              <option value="Ocorrencia_Aluno">Ocorrências de Turma/Alunos</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              De (Data)
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={e => setFiltroDataInicio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Tema, local, ata..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {(filtroDataFim || filtroTurmaId !== 'TODAS' || filtroTrimestre !== 'TODOS') && (
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setFiltroDataInicio('');
                setFiltroDataFim('');
                setFiltroTurmaId('TODAS');
                setFiltroTrimestre('TODOS');
                setFiltroCategoria('TODAS');
                setFiltroEstado('TODOS');
                setFiltroOrigem('TODAS');
                setBusca('');
              }}
              className="text-indigo-700 hover:underline font-bold"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* KPIs EXECUTIVOS DOS RELATÓRIOS DE ACONTECIMENTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total de Relatórios</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{metricasRelatorios.total}</p>
          <p className="text-xs text-slate-500 mt-1">
            {isAdminGeral
              ? `Em ${metricasRelatorios.escolasCobertas} instituição(ões) registadas`
              : `${metricasRelatorios.participantesTotais} participantes contabilizados`}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Reuniões & Conselhos</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-900 mt-2">{metricasRelatorios.reunioes}</p>
          <p className="text-xs text-slate-500 mt-1">Atas, direções, conselhos e encarregados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Palestras & Eventos</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Megaphone className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-900 mt-2">
            {metricasRelatorios.palestrasEventos}
          </p>
          <p className="text-xs text-slate-500 mt-1">Seminários, jornadas, formações e feiras</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Desenvolvimentos & Homologação
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-900">
              {metricasRelatorios.desenvolvimentosOcorrencias}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              • {metricasRelatorios.taxaHomologacao}% homologados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metricasRelatorios.homologados} de {metricasRelatorios.total} validados
          </p>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL DE RELATÓRIOS & CRÓNICA DE ACONTECIMENTOS (A4 / PDF / IMPRESSÃO) */}
      <div
        id="relatorio-acontecimentos-oficial-doc"
        data-doc-root="true"
        className="documento-oficial-print bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none"
      >
        {/* CABEÇALHO INSTITUCIONAL OFICIAL MED ANGOLA */}
        <div
          data-pdf-fixed-header="true"
          data-pdf-center-insignia="true"
          className="text-center space-y-1 border-b-2 border-slate-900 pb-4"
        >
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
          <p className="text-xs font-black uppercase tracking-widest text-slate-900">
            REPÚBLICA DE ANGOLA
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-800">
            {isVisaoRedeTodas
              ? 'MINISTÉRIO DA EDUCAÇÃO • ADMINISTRAÇÃO CENTRAL DA REDE ESCOLAR'
              : escolaExibida.governoProvincial ||
                `GOVERNO PROVINCIAL DE ${(escolaExibida.provincia || 'ANGOLA').toUpperCase()}`}
          </p>
          <p className="text-[11px] font-bold uppercase text-slate-700">
            {isVisaoRedeTodas
              ? `SUPERVISÃO GLOBAL DE ACTIVIDADES E ACONTECIMENTOS (${escolas.length} ESCOLAS)`
              : escolaExibida.gabineteEducacao ||
                `DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${(escolaExibida.municipio || 'ANGOLA').toUpperCase()}`}
          </p>
          <h2 className="text-base sm:text-lg font-black uppercase text-slate-950 pt-0.5">
            {isVisaoRedeTodas
              ? 'RELATÓRIO GLOBAL DE ACONTECIMENTOS, REUNIÕES E DESENVOLVIMENTOS'
              : escolaExibida.nomeOficial || escolaExibida.nome}
          </h2>
          <div className="pt-1.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-700">
            <span className="bg-slate-100 border border-slate-300 px-3 py-0.5 rounded">
              REGISTO DE ACTIVIDADES, REUNIÕES, PALESTRAS &amp; DESENVOLVIMENTOS
            </span>
            <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-0.5 rounded">
              Ano Letivo: {filtroAno === 'TODOS' ? 'Todos' : filtroAno} • Perfil:{' '}
              {currentUser?.nomeCompleto || 'Institucional'}
            </span>
          </div>
        </div>

        {/* LISTA / CRONOLOGIA DE RELATÓRIOS */}
        {itensFiltrados.length > 0 ? (
          <div className="space-y-4">
            {itensFiltrados.map((item, idx) => {
              const catInfo = CATEGORIAS_CONFIG[item.categoria] || CATEGORIAS_CONFIG.Evento;
              const estInfo = LABEL_ESTADO[item.estado] || LABEL_ESTADO.Registado;
              const podeEditarEste =
                !item.somenteLeitura &&
                (isAdminGeral ||
                  isDiretorGeral ||
                  isSubdiretor ||
                  (item.criadoPorId === currentUser?.id && item.estado !== 'Homologado'));
              const podeExcluirEste =
                !item.somenteLeitura &&
                (isAdminGeral ||
                  isDiretorGeral ||
                  isSubdiretor ||
                  (item.criadoPorId === currentUser?.id && item.estado !== 'Homologado'));

              return (
                <article
                  key={item.id}
                  className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white hover:border-indigo-300 transition-all space-y-3 break-inside-avoid"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${catInfo.corBadge}`}
                        >
                          {catInfo.label}
                        </span>
                        {item.subtipo && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {item.subtipo}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${estInfo.classe}`}
                        >
                          {estInfo.label}
                        </span>
                        {(isVisaoRedeTodas || item.escolaId === 'REDE') && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black">
                            {item.escolaNome ||
                              escolasMap.get(item.escolaId)?.nome ||
                              'Rede Nacional'}
                          </span>
                        )}
                        {item.turmaNome && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                            Turma: {item.turmaNome}
                          </span>
                        )}
                        {item.somenteLeitura && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            Sincronizado de{' '}
                            {item.origem === 'Agenda'
                              ? 'Agenda Escolar'
                              : item.origem === 'Conselho_Direcao'
                              ? 'Conselho de Direção'
                              : item.origem === 'Despacho'
                              ? 'Despacho Direção'
                              : 'Ocorrência de Aluno'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {item.titulo}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{item.data || 'Sem data'}</span>
                        </span>
                        {item.hora && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{item.hora}</span>
                          </span>
                        )}
                        {item.local && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{item.local}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            Responsável: <strong>{item.organizadorNome}</strong>
                            {item.numeroParticipantes ? ` (${item.numeroParticipantes} part.)` : ''}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* AÇÕES DO REGISTO (OCULTAS NA IMPRESSÃO) */}
                    <div className="flex flex-wrap items-center gap-1.5 print:hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setDetalheItem(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        title="Ver Relatório Completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ler</span>
                      </button>

                      {podeHomologar && !item.somenteLeitura && item.estado !== 'Homologado' && (
                        <button
                          type="button"
                          onClick={() => handleHomologar(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                          title="Homologar Relatório"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Homologar</span>
                        </button>
                      )}

                      {podeEditarEste && (
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(item)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                          title="Editar Relatório"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {podeExcluirEste && (
                        <button
                          type="button"
                          onClick={() => handleExcluir(item)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                          title="Eliminar Relatório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SÍNTESE DO RELATÓRIO */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-800 space-y-2 leading-relaxed">
                    <p className="whitespace-pre-line">{item.resumoAcontecimentos}</p>
                    {item.deliberacoesEncaminhamentos && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="font-black text-[11px] uppercase text-indigo-900 block mb-0.5">
                          Deliberações &amp; Encaminhamentos:
                        </span>
                        <p className="whitespace-pre-line text-slate-700">
                          {item.deliberacoesEncaminhamentos}
                        </p>
                      </div>
                    )}
                    {item.resultadosObtidos && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="font-black text-[11px] uppercase text-emerald-900 block mb-0.5">
                          Resultados &amp; Impacto:
                        </span>
                        <p className="whitespace-pre-line text-slate-700">{item.resultadosObtidos}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span>
                      Público: <strong>{item.publicoAlvo}</strong> • Visibilidade:{' '}
                      <strong>{LABEL_VISIBILIDADE[item.nivelVisibilidade] || item.nivelVisibilidade}</strong>
                    </span>
                    {item.homologadoPorNome && (
                      <span className="text-emerald-800 font-bold">
                        Homologado por: {item.homologadoPorNome}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-700">
                Nenhum relatório de acontecimento encontrado para os filtros selecionados
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Registe reuniões, palestras, eventos escolares, relatórios de desenvolvimento pedagógico ou ocorrências através do botão &ldquo;Novo Relatório de Acontecimento&rdquo;.
              </p>
            </div>
            <button
              type="button"
              onClick={() => abrirModalNovo('Reuniao')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 print:hidden cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registar Primeiro Relatório</span>
            </button>
          </div>
        )}

        {/* RODAPÉ OFICIAL & ASSINATURAS */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900 space-y-6">
          <div
            data-pdf-fixed-signatures="true"
            className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs"
          >
            <div>
              <p className="font-bold uppercase text-slate-900">
                {isDocenteEscopoRestrito ? 'O(A) Docente / Coordenador(a)' : 'O Subdirector Pedagógico'}
              </p>
              <div className="w-52 h-10 mx-auto border-b border-black mt-4" />
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                {isDocenteEscopoRestrito
                  ? currentUser?.nomeCompleto || 'Assinatura'
                  : escolaExibida.subdiretorPedagogicoNome || 'Assinatura & Rubrica'}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">
                {isVisaoRedeTodas ? 'Supervisão Central da Rede Escolar' : 'O Director Geral da Instituição'}
              </p>
              <div className="w-52 h-10 mx-auto border-b border-black mt-4" />
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                {isVisaoRedeTodas
                  ? 'Administrador Geral / Direcção MED'
                  : escolaExibida.diretorGeralNome || 'Homologação e Carimbo Oficial'}
              </p>
            </div>
          </div>

          <div
            data-pdf-fixed-qr="true"
            className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-600 font-mono"
          >
            <div className="text-center sm:text-left">
              <p>
                Relatório de Acontecimentos emitido em {formatarDataHoraAngolana(new Date())}
              </p>
              <p className="font-bold text-slate-800 mt-0.5">
                {isVisaoRedeTodas
                  ? `Administração Central MED • ${escolas.length} Escolas`
                  : escolaExibida.nomeOficial || escolaExibida.nome}
              </p>
            </div>
            <OfficialQrCode
              value={gerarPayloadQrDocumento({
                docType: 'RELATORIO_ACONTECIMENTOS',
                escolaId: isVisaoRedeTodas ? 'REDE_NACIONAL' : escolaExibida.id,
                docRef: `${filtroAno}-${filtroCategoria}`,
                anoLectivo: filtroAno
              })}
              size={48}
              label="Validar Relatório"
            />
          </div>
        </div>
      </div>

      {/* MODAL DE LEITURA DETALHADA */}
      {detalheItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      (CATEGORIAS_CONFIG[detalheItem.categoria] || CATEGORIAS_CONFIG.Evento).corBadge
                    }`}
                  >
                    {(CATEGORIAS_CONFIG[detalheItem.categoria] || CATEGORIAS_CONFIG.Evento).label}
                  </span>
                  {detalheItem.subtipo && (
                    <span className="text-xs font-bold text-slate-500">{detalheItem.subtipo}</span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900">{detalheItem.titulo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetalheItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Data &amp; Hora</span>
                  <span className="font-bold text-slate-900">
                    {formatarDataAngolana(detalheItem.data, 'curto')} {detalheItem.hora ? `às ${detalheItem.hora}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Local</span>
                  <span className="font-bold text-slate-900">{detalheItem.local || 'Instituição'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Estado</span>
                  <span className="font-bold text-slate-900">
                    {LABEL_ESTADO[detalheItem.estado]?.label || detalheItem.estado}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Organizador</span>
                  <span className="font-bold text-slate-900">{detalheItem.organizadorNome}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Público-Alvo</span>
                  <span className="font-bold text-slate-900">{detalheItem.publicoAlvo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Ano Letivo</span>
                  <span className="font-bold text-slate-900">{detalheItem.anoLectivo || '—'}</span>
                </div>
              </div>

              {detalheItem.participantes && (
                <div>
                  <span className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                    Participantes / Intervenientes
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {detalheItem.participantes}
                  </p>
                </div>
              )}

              <div>
                <span className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                  Síntese &amp; Relato dos Acontecimentos
                </span>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  {detalheItem.resumoAcontecimentos}
                </p>
              </div>

              {detalheItem.deliberacoesEncaminhamentos && (
                <div>
                  <span className="text-[11px] font-black uppercase text-indigo-900 block mb-1">
                    Deliberações, Acordos &amp; Encaminhamentos
                  </span>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-200">
                    {detalheItem.deliberacoesEncaminhamentos}
                  </p>
                </div>
              )}

              {detalheItem.resultadosObtidos && (
                <div>
                  <span className="text-[11px] font-black uppercase text-emerald-900 block mb-1">
                    Resultados Obtidos &amp; Conclusões
                  </span>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200">
                    {detalheItem.resultadosObtidos}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              {podeHomologar && !detalheItem.somenteLeitura && detalheItem.estado !== 'Homologado' && (
                <button
                  type="button"
                  onClick={() => handleHomologar(detalheItem)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Homologar Relatório
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetalheItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTO / EDIÇÃO DE RELATÓRIO DE ACONTECIMENTO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editandoId
                      ? 'Editar Relatório de Acontecimento'
                      : 'Novo Relatório de Acontecimento / Actividade'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reuniões, palestras, jornadas, desenvolvimentos pedagógicos/administrativos ou ocorrências.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarRelatorio} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {isAdminGeral && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Escola / Âmbito *</label>
                    <select
                      value={formEscolaId}
                      onChange={e => setFormEscolaId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"
                    >
                      <option value="REDE">Rede Nacional (Todas as Escolas)</option>
                      {escolas.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.sigla ? `[${e.sigla}] ` : ''}
                          {e.nomeOficial || e.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={formCategoria}
                    onChange={e => {
                      const cat = e.target.value as CategoriaRelatorioAcontecimento;
                      setFormCategoria(cat);
                      setFormSubtipo(CATEGORIAS_CONFIG[cat].subtipos[0]);
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"
                  >
                    {(Object.keys(CATEGORIAS_CONFIG) as CategoriaRelatorioAcontecimento[]).map(cat => (
                      <option key={cat} value={cat}>
                        {CATEGORIAS_CONFIG[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo Específico / Subtipo</label>
                  <select
                    value={formSubtipo}
                    onChange={e => setFormSubtipo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"
                  >
                    {CATEGORIAS_CONFIG[formCategoria].subtipos.map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Título / Assunto Principal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={e => setFormTitulo(e.target.value)}
                    placeholder="Ex: Palestra sobre Orientação Vocacional / Balanço do 1º Trimestre"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={e => setFormData(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={e => setFormHora(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ano Letivo</label>
                  <input
                    type="text"
                    value={formAnoLectivo}
                    onChange={e => setFormAnoLectivo(e.target.value)}
                    placeholder="2025/2026"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trimestre</label>
                  <select
                    value={formTrimestre}
                    onChange={e => setFormTrimestre(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="1">Iº Trimestre</option>
                    <option value="2">IIº Trimestre</option>
                    <option value="3">IIIº Trimestre</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Local</label>
                  <input
                    type="text"
                    value={formLocal}
                    onChange={e => setFormLocal(e.target.value)}
                    placeholder="Sala, Pátio, Anfiteatro..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nº Participantes</label>
                  <input
                    type="number"
                    min={0}
                    value={formNumeroParticipantes}
                    onChange={e => setFormNumeroParticipantes(e.target.value)}
                    placeholder="Ex: 45"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Organizador / Orador</label>
                  <input
                    type="text"
                    value={formOrganizadorNome}
                    onChange={e => setFormOrganizadorNome(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Público-Alvo</label>
                  <select
                    value={formPublicoAlvo}
                    onChange={e => setFormPublicoAlvo(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="Toda a Comunidade">Toda a Comunidade</option>
                    <option value="Professores">Professores &amp; Coordenação</option>
                    <option value="Estudantes">Estudantes</option>
                    <option value="Encarregados">Pais e Encarregados</option>
                    {!isDocenteEscopoRestrito && <option value="Direção">Direção Executiva</option>}
                    {isAdminGeral && <option value="Rede Nacional">Rede Nacional</option>}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visibilidade por Perfil</label>
                  <select
                    value={formVisibilidade}
                    onChange={e => setFormVisibilidade(e.target.value as VisibilidadeRelatorioAcontecimento)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="Publico_Escola">Toda a Escola (Professores e Direção)</option>
                    <option value="Docente_Turma">Turma / Docência Específica</option>
                    {!isDocenteEscopoRestrito && (
                      <option value="Direcao">Exclusivo Direção &amp; Administração</option>
                    )}
                    {isAdminGeral && (
                      <option value="Rede_Nacional">Circular Rede Nacional (Todas Escolas)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Associação opcional a Turma / Disciplina */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Turma Associada (opcional)</label>
                  <select
                    value={formTurmaId}
                    onChange={e => setFormTurmaId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                  >
                    <option value="">Geral / Sem turma específica</option>
                    {turmasDisponiveisForm.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.classe})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disciplina Associada (opcional)</label>
                  <select
                    value={formDisciplinaId}
                    onChange={e => setFormDisciplinaId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                  >
                    <option value="">Geral / Sem disciplina específica</option>
                    {disciplinasDisponiveisForm.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado do Registo</label>
                  <select
                    value={formEstado}
                    onChange={e => setFormEstado(e.target.value as EstadoRelatorioAcontecimento)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800"
                  >
                    <option value="Registado">Registado / Submetido</option>
                    <option value="Rascunho">Rascunho</option>
                    {podeHomologar && <option value="Homologado">Homologado pela Direção</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Participantes / Entidades Presentes (opcional)
                </label>
                <input
                  type="text"
                  value={formParticipantes}
                  onChange={e => setFormParticipantes(e.target.value)}
                  placeholder="Nomes dos membros presentes, convidados, palestrantes ou comissões..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Relato Detalhado dos Acontecimentos / Ordem de Trabalhos *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formResumo}
                  onChange={e => setFormResumo(e.target.value)}
                  placeholder="Descreva o que ocorreu na reunião, palestra, evento ou o progresso alcançado no desenvolvimento pedagógico/administrativo..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Deliberações, Acordos &amp; Encaminhamentos
                  </label>
                  <textarea
                    rows={3}
                    value={formDeliberacoes}
                    onChange={e => setFormDeliberacoes(e.target.value)}
                    placeholder="Decisões tomadas, prazos e responsáveis..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Resultados Obtidos &amp; Recomendações
                  </label>
                  <textarea
                    rows={3}
                    value={formResultados}
                    onChange={e => setFormResultados(e.target.value)}
                    placeholder="Impacto na comunidade escolar, metas cumpridas ou recomendações..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editandoId ? 'Guardar Alterações' : 'Registar Relatório'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
