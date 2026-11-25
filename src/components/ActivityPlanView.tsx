import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Edit3,
  Trash2,
  EyeOff,
  RotateCcw,
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  Layers,
  MapPin,
  Users,
  X,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Ban
} from 'lucide-react';
import {
  AreaPlanoAtividades,
  AtividadePlanoEscolar,
  CategoriaAtividadePlano,
  CoordenacaoEscolar,
  Escola,
  EstadoAtividadePlano,
  Funcionario,
  Turma
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { formatarDataAngolana } from '../utils/dateFormat';
import {
  flexionarGenero,
  inferirGeneroPorNomeOuParentesco,
  obterNomeChefeSecretaria,
  obterNomeDiretorGeral,
  obterNomeSubdiretorAdministrativo,
  obterNomeSubdiretorPedagogico,
  obterTituloChefeSecretaria,
  obterTituloDiretorGeral,
  obterTituloSubdiretorAdministrativo,
  obterTituloSubdiretorPedagogico
} from '../utils/directorHelper';

export interface ActivityPlanViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios?: Funcionario[];
  coordenacoes?: CoordenacaoEscolar[];
  turmas?: Turma[];
}

type PerfilRelatorioFiltro =
  | 'GERAL_DIRECAO'
  | 'SUBDIRETOR_PEDAGOGICO'
  | 'SUBDIRETOR_ADMINISTRATIVO'
  | 'COORDENADORES'
  | 'SECRETARIA';

const LABELS_AREA: Record<AreaPlanoAtividades, string> = {
  Direcao_Geral: 'Direcção Geral',
  Subdirecao_Pedagogica: 'Subdirecção Pedagógica',
  Subdirecao_Administrativa: 'Subdirecção Administrativa',
  Coordenacao_Pedagogica: 'Coordenações Escolares / Turma',
  Secretaria_Geral: 'Secretaria Geral'
};

const CORES_AREA: Record<AreaPlanoAtividades, string> = {
  Direcao_Geral: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800',
  Subdirecao_Pedagogica: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
  Subdirecao_Administrativa: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800',
  Coordenacao_Pedagogica: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  Secretaria_Geral: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800'
};

const LABELS_ESTADO: Record<EstadoAtividadePlano, string> = {
  Planeada: 'Planeada',
  Em_Curso: 'Em Curso',
  Realizada: 'Realizada',
  Adiada: 'Adiada',
  Cancelada: 'Cancelada'
};

const CORES_ESTADO: Record<EstadoAtividadePlano, string> = {
  Planeada: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  Em_Curso: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
  Realizada: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
  Adiada: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  Cancelada: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800'
};

const CATEGORIAS_ATIVIDADE: CategoriaAtividadePlano[] = [
  'Pedagógica',
  'Administrativa',
  'Evento',
  'Reunião',
  'Avaliação',
  'Extracurricular',
  'Infraestrutura',
  'Secretaria'
];

export const ActivityPlanView: React.FC<ActivityPlanViewProps> = ({
  escola,
  currentUser,
  funcionarios = [],
  coordenacoes: coordenacoesProp,
  turmas: turmasProp
}) => {
  const anoActivo = escola.anoLectivoActivo || String(new Date().getFullYear());
  const anosDisponiveis = useMemo(() => {
    const lista = dbService.getAnosLectivos(escola.id);
    if (!lista.includes(anoActivo)) return [anoActivo, ...lista];
    return lista;
  }, [escola.id, anoActivo]);

  const coordenacoes = useMemo(() => {
    if (coordenacoesProp && coordenacoesProp.length > 0) return coordenacoesProp;
    return dbService.getCoordenacoes(escola.id, anoActivo);
  }, [coordenacoesProp, escola.id, anoActivo]);

  const turmas = useMemo(() => {
    if (turmasProp && turmasProp.length > 0) return turmasProp;
    return dbService.obterTurmas().filter(t => t.escolaId === escola.id);
  }, [turmasProp, escola.id]);

  // Determinar nível hierárquico do utilizador atual
  const role = currentUser.role;
  const ehDiretorOuAdmin = role === 'DiretorGeral' || role === 'AdminGeral';
  const ehSubdiretorPedagogico = role === 'SubdiretorPedagogico';
  const ehSubdiretorAdministrativo =
    role === 'SubdiretorAdministrativo' || role === 'SubdirectorAdministrativo';
  const ehSecretaria = [
    'Secretaria',
    'ChefeSecretaria',
    'Secretario',
    'SecretarioEscolar',
    'Tesoureiro'
  ].includes(role);
  const ehCoordenadorRole = [
    'CoordenadorPedagogico',
    'CoordenadorTurno',
    'CoordenadorDisciplina'
  ].includes(role);
  const ehProfessorCoordenadorAtivo =
    role === 'Professor' &&
    (coordenacoes.some(c => (c.funcionarioId === currentUser.id || c.professorId === currentUser.id) && c.ativo !== false) ||
      turmas.some(t => t.coordenadorId === currentUser.id));
  const ehCoordenador = ehCoordenadorRole || ehProfessorCoordenadorAtivo;

  const areaPropriaDoUsuario: AreaPlanoAtividades = useMemo(() => {
    if (ehDiretorOuAdmin) return 'Direcao_Geral';
    if (ehSubdiretorPedagogico) return 'Subdirecao_Pedagogica';
    if (ehSubdiretorAdministrativo) return 'Subdirecao_Administrativa';
    if (ehSecretaria) return 'Secretaria_Geral';
    return 'Coordenacao_Pedagogica';
  }, [ehDiretorOuAdmin, ehSubdiretorPedagogico, ehSubdiretorAdministrativo, ehSecretaria]);

  const areasVisiveisParaUsuario: AreaPlanoAtividades[] = useMemo(() => {
    if (ehDiretorOuAdmin) {
      return [
        'Direcao_Geral',
        'Subdirecao_Pedagogica',
        'Subdirecao_Administrativa',
        'Coordenacao_Pedagogica',
        'Secretaria_Geral'
      ];
    }
    if (ehSubdiretorPedagogico) {
      return ['Subdirecao_Pedagogica', 'Coordenacao_Pedagogica'];
    }
    if (ehSubdiretorAdministrativo) {
      return ['Subdirecao_Administrativa', 'Secretaria_Geral'];
    }
    if (ehSecretaria) {
      return ['Secretaria_Geral'];
    }
    return ['Coordenacao_Pedagogica'];
  }, [ehDiretorOuAdmin, ehSubdiretorPedagogico, ehSubdiretorAdministrativo, ehSecretaria]);

  const coordenacaoUsuarioAtual = useMemo(() => {
    const c = coordenacoes.find(cd => (cd.funcionarioId === currentUser.id || cd.professorId === currentUser.id) && cd.ativo !== false);
    if (c) {
      const detalhe = [c.classe, c.turmaNome, c.disciplinaNome, c.curso, c.turno].filter(Boolean).join(' • ');
      return detalhe ? `${c.tipoCoordenacao} (${detalhe})` : String(c.tipoCoordenacao);
    }
    const t = turmas.find(tm => tm.coordenadorId === currentUser.id);
    if (t) return `Coordenação de Turma (${t.classe} - ${t.nome})`;
    if (role === 'CoordenadorTurno') return 'Coordenação de Turno';
    if (role === 'CoordenadorDisciplina') return 'Coordenação de Disciplina';
    if (role === 'CoordenadorPedagogico') return 'Coordenação Pedagógica';
    return undefined;
  }, [coordenacoes, turmas, currentUser.id, role]);

  // Estado principal
  const [atividades, setAtividades] = useState<AtividadePlanoEscolar[]>(() =>
    dbService.getAtividadesPlano(escola.id)
  );
  const [abaAtiva, setAbaAtiva] = useState<'plano' | 'excluidas' | 'relatorios'>('plano');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; texto: string } | null>(null);

  // Filtros do Plano
  const [filtroAno, setFiltroAno] = useState<string>(anoActivo);
  const [filtroTrimestre, setFiltroTrimestre] = useState<'TODOS' | '1' | '2' | '3' | 'Anual'>('TODOS');
  const [filtroArea, setFiltroArea] = useState<'TODAS' | AreaPlanoAtividades>('TODAS');
  const [filtroCategoria, setFiltroCategoria] = useState<'TODAS' | CategoriaAtividadePlano>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoAtividadePlano>('TODOS');
  const [pesquisa, setPesquisa] = useState('');

  // Modal Criar / Editar Atividade
  const [showFormModal, setShowFormModal] = useState(false);
  const [editandoAtividade, setEditandoAtividade] = useState<AtividadePlanoEscolar | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState<CategoriaAtividadePlano>('Pedagógica');
  const [formTrimestre, setFormTrimestre] = useState<'1' | '2' | '3' | 'Anual'>('1');
  const [formAnoLectivo, setFormAnoLectivo] = useState<string>(anoActivo);
  const [formDataInicio, setFormDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [formDataFim, setFormDataFim] = useState('');
  const [formHora, setFormHora] = useState('08:30');
  const [formLocal, setFormLocal] = useState('');
  const [formPublicoAlvo, setFormPublicoAlvo] = useState('Comunidade Escolar');
  const [formObjetivos, setFormObjetivos] = useState('');
  const [formRecursos, setFormRecursos] = useState('');
  const [formResponsavel, setFormResponsavel] = useState(currentUser.nomeCompleto);
  const [formCoordenacaoTipo, setFormCoordenacaoTipo] = useState(coordenacaoUsuarioAtual || '');
  const [formEstado, setFormEstado] = useState<EstadoAtividadePlano>('Planeada');
  const [formPercentual, setFormPercentual] = useState<number>(0);
  const [formObservacoesCumprimento, setFormObservacoesCumprimento] = useState('');
  const [formEvidencias, setFormEvidencias] = useState('');
  const [formAreaSelecionada, setFormAreaSelecionada] = useState<AreaPlanoAtividades>(areaPropriaDoUsuario);
  const [formErro, setFormErro] = useState<string | null>(null);

  // Modal Atualizar Cumprimento Rápido
  const [atividadeCumprimentoModal, setAtividadeCumprimentoModal] = useState<AtividadePlanoEscolar | null>(null);
  const [cumpEstado, setCumpEstado] = useState<EstadoAtividadePlano>('Realizada');
  const [cumpPercentual, setCumpPercentual] = useState<number>(100);
  const [cumpObs, setCumpObs] = useState('');
  const [cumpEvidencias, setCumpEvidencias] = useState('');

  // Modal Excluir do Plano Geral (Diretor Geral)
  const [atividadeExcluirPlanoModal, setAtividadeExcluirPlanoModal] = useState<AtividadePlanoEscolar | null>(null);
  const [motivoExclusaoDiretor, setMotivoExclusaoDiretor] = useState('');

  // Modal Eliminar Definitivamente
  const [atividadeParaEliminar, setAtividadeParaEliminar] = useState<AtividadePlanoEscolar | null>(null);

  // Filtros e Estado dos Relatórios de Cumprimento
  const perfisRelatorioDisponiveis = useMemo<{ id: PerfilRelatorioFiltro; label: string }[]>(() => {
    const todos: { id: PerfilRelatorioFiltro; label: string }[] = [];
    if (ehDiretorOuAdmin) {
      todos.push({ id: 'GERAL_DIRECAO', label: 'Plano Geral da Escola (Diretor Geral)' });
      todos.push({ id: 'SUBDIRETOR_PEDAGOGICO', label: 'Subdiretor Pedagógico (Área Pedagógica + Coordenações)' });
      todos.push({ id: 'SUBDIRETOR_ADMINISTRATIVO', label: 'Subdiretor Administrativo (Área Administrativa + Secretaria)' });
      todos.push({ id: 'COORDENADORES', label: 'Coordenadores (Coordenação Pedagógica / Turmas)' });
      todos.push({ id: 'SECRETARIA', label: 'Secretaria Geral' });
    } else if (ehSubdiretorPedagogico) {
      todos.push({ id: 'SUBDIRETOR_PEDAGOGICO', label: 'Subdiretor Pedagógico (Consolidado Pedagógico)' });
      todos.push({ id: 'COORDENADORES', label: 'Coordenadores' });
    } else if (ehSubdiretorAdministrativo) {
      todos.push({ id: 'SUBDIRETOR_ADMINISTRATIVO', label: 'Subdiretor Administrativo (Consolidado Administrativo)' });
      todos.push({ id: 'SECRETARIA', label: 'Secretaria Geral' });
    } else if (ehSecretaria) {
      todos.push({ id: 'SECRETARIA', label: 'Secretaria Geral' });
    } else {
      todos.push({ id: 'COORDENADORES', label: 'Coordenação Escolar' });
    }
    return todos;
  }, [ehDiretorOuAdmin, ehSubdiretorPedagogico, ehSubdiretorAdministrativo, ehSecretaria]);

  const [relAno, setRelAno] = useState<string>(anoActivo);
  const [relPeriodo, setRelPeriodo] = useState<'1' | '2' | '3' | 'Anual'>(
    (escola.trimestreActivo as '1' | '2' | '3') || '1'
  );
  const [relPerfil, setRelPerfil] = useState<PerfilRelatorioFiltro>(
    perfisRelatorioDisponiveis[0]?.id || 'GERAL_DIRECAO'
  );
  const [relTipo, setRelTipo] = useState<'Detalhado' | 'Resumido'>('Detalhado');
  const [relNotasDirecao, setRelNotasDirecao] = useState('');
  const [exportandoPdf, setExportandoPdf] = useState(false);

  useEffect(() => {
    setAtividades(dbService.getAtividadesPlano(escola.id));
  }, [escola.id]);

  useEffect(() => {
    if (!perfisRelatorioDisponiveis.some(p => p.id === relPerfil) && perfisRelatorioDisponiveis[0]) {
      setRelPerfil(perfisRelatorioDisponiveis[0].id);
    }
  }, [perfisRelatorioDisponiveis, relPerfil]);

  const notificar = (texto: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'sucesso') => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 5000);
  };

  const recarregarAtividades = () => {
    setAtividades(dbService.getAtividadesPlano(escola.id));
  };

  const podeEditarAtividade = (atv: AtividadePlanoEscolar): boolean => {
    if (ehDiretorOuAdmin) return true;
    if (atv.criadoPorId === currentUser.id) return true;
    if (ehSubdiretorPedagogico && (atv.areaOrigem === 'Subdirecao_Pedagogica' || atv.areaOrigem === 'Coordenacao_Pedagogica')) {
      return true;
    }
    if (ehSubdiretorAdministrativo && (atv.areaOrigem === 'Subdirecao_Administrativa' || atv.areaOrigem === 'Secretaria_Geral')) {
      return true;
    }
    return false;
  };

  // Atividades filtradas por ano + hierarquia do utilizador
  const atividadesDoEscopoUsuario = useMemo(() => {
    return atividades.filter(atv => {
      if (filtroAno !== 'TODOS' && atv.anoLectivo !== filtroAno) return false;
      if (!areasVisiveisParaUsuario.includes(atv.areaOrigem)) return false;
      // Coordenador específico vê as atividades das coordenações; se for apenas coordenador simples e houver outro, continua podendo ver sua própria área
      return true;
    });
  }, [atividades, filtroAno, areasVisiveisParaUsuario]);

  const atividadesAtivasNoPlano = useMemo(() => {
    return atividadesDoEscopoUsuario.filter(atv => {
      if (atv.excluidaDoPlanoGeralPorDiretor) return false;
      if (filtroTrimestre !== 'TODOS' && atv.trimestre !== filtroTrimestre) return false;
      if (filtroArea !== 'TODAS' && atv.areaOrigem !== filtroArea) return false;
      if (filtroCategoria !== 'TODAS' && atv.categoria !== filtroCategoria) return false;
      if (filtroEstado !== 'TODOS' && atv.estadoExecucao !== filtroEstado) return false;
      if (pesquisa.trim()) {
        const q = pesquisa.toLowerCase().trim();
        const bateu =
          atv.titulo.toLowerCase().includes(q) ||
          atv.descricao.toLowerCase().includes(q) ||
          (atv.responsavelExecucaoNome || '').toLowerCase().includes(q) ||
          (atv.criadoPorNome || '').toLowerCase().includes(q) ||
          (atv.local || '').toLowerCase().includes(q) ||
          (atv.coordenacaoTipo || '').toLowerCase().includes(q);
        if (!bateu) return false;
      }
      return true;
    });
  }, [
    atividadesDoEscopoUsuario,
    filtroTrimestre,
    filtroArea,
    filtroCategoria,
    filtroEstado,
    pesquisa
  ]);

  const atividadesExcluidasPeloDiretor = useMemo(() => {
    return atividadesDoEscopoUsuario.filter(atv => Boolean(atv.excluidaDoPlanoGeralPorDiretor));
  }, [atividadesDoEscopoUsuario]);

  // Métricas KPI do Plano Ativo
  const metricasPlano = useMemo(() => {
    const total = atividadesAtivasNoPlano.length;
    const realizadas = atividadesAtivasNoPlano.filter(a => a.estadoExecucao === 'Realizada').length;
    const emCurso = atividadesAtivasNoPlano.filter(a => a.estadoExecucao === 'Em_Curso').length;
    const planeadas = atividadesAtivasNoPlano.filter(a => a.estadoExecucao === 'Planeada').length;
    const adiadasCanceladas = atividadesAtivasNoPlano.filter(
      a => a.estadoExecucao === 'Adiada' || a.estadoExecucao === 'Cancelada'
    ).length;
    const mediaCumprimento =
      total > 0
        ? Math.round(
            atividadesAtivasNoPlano.reduce((acc, a) => acc + (Number(a.percentualCumprimento) || 0), 0) /
              total
          )
        : 0;
    return { total, realizadas, emCurso, planeadas, adiadasCanceladas, mediaCumprimento };
  }, [atividadesAtivasNoPlano]);

  // Abrir modal de nova atividade
  const abrirNovaAtividade = () => {
    setEditandoAtividade(null);
    setFormTitulo('');
    setFormDescricao('');
    setFormCategoria(
      ehSecretaria || ehSubdiretorAdministrativo ? 'Administrativa' : 'Pedagógica'
    );
    setFormTrimestre((escola.trimestreActivo as '1' | '2' | '3') || '1');
    setFormAnoLectivo(filtroAno === 'TODOS' ? anoActivo : filtroAno);
    setFormDataInicio(new Date().toISOString().split('T')[0]);
    setFormDataFim('');
    setFormHora('08:30');
    setFormLocal('');
    setFormPublicoAlvo('Comunidade Escolar');
    setFormObjetivos('');
    setFormRecursos('');
    setFormResponsavel(currentUser.nomeCompleto);
    setFormCoordenacaoTipo(coordenacaoUsuarioAtual || '');
    setFormEstado('Planeada');
    setFormPercentual(0);
    setFormObservacoesCumprimento('');
    setFormEvidencias('');
    setFormAreaSelecionada(areaPropriaDoUsuario);
    setFormErro(null);
    setShowFormModal(true);
  };

  const abrirEditarAtividade = (atv: AtividadePlanoEscolar) => {
    setEditandoAtividade(atv);
    setFormTitulo(atv.titulo);
    setFormDescricao(atv.descricao);
    setFormCategoria(atv.categoria);
    setFormTrimestre(atv.trimestre);
    setFormAnoLectivo(atv.anoLectivo);
    setFormDataInicio(atv.dataInicio);
    setFormDataFim(atv.dataFim || '');
    setFormHora(atv.hora || '');
    setFormLocal(atv.local || '');
    setFormPublicoAlvo(atv.publicoAlvo || 'Comunidade Escolar');
    setFormObjetivos(atv.objetivos || '');
    setFormRecursos(atv.recursosNecessarios || '');
    setFormResponsavel(atv.responsavelExecucaoNome || atv.criadoPorNome);
    setFormCoordenacaoTipo(atv.coordenacaoTipo || '');
    setFormEstado(atv.estadoExecucao);
    setFormPercentual(atv.percentualCumprimento ?? 0);
    setFormObservacoesCumprimento(atv.observacoesCumprimento || '');
    setFormEvidencias(atv.evidenciasResultados || '');
    setFormAreaSelecionada(atv.areaOrigem);
    setFormErro(null);
    setShowFormModal(true);
  };

  const handleEstadoFormChange = (novoEstado: EstadoAtividadePlano) => {
    setFormEstado(novoEstado);
    if (novoEstado === 'Realizada') setFormPercentual(100);
    else if (novoEstado === 'Planeada') setFormPercentual(0);
    else if (novoEstado === 'Em_Curso' && (formPercentual === 0 || formPercentual === 100)) {
      setFormPercentual(50);
    }
  };

  const handleSalvarAtividade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormErro('Indique o título da atividade ou evento.');
      return;
    }
    if (!formDataInicio) {
      setFormErro('Indique a data prevista de início.');
      return;
    }

    const agora = new Date().toISOString();
    const areaFinal: AreaPlanoAtividades = ehDiretorOuAdmin
      ? formAreaSelecionada
      : areaPropriaDoUsuario;

    const item: AtividadePlanoEscolar = {
      id: editandoAtividade?.id || `atv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      anoLectivo: formAnoLectivo || anoActivo,
      trimestre: formTrimestre,
      titulo: formTitulo.trim(),
      descricao: formDescricao.trim() || formTitulo.trim(),
      categoria: formCategoria,
      dataInicio: formDataInicio,
      dataFim: formDataFim || undefined,
      hora: formHora.trim() || undefined,
      local: formLocal.trim() || undefined,
      publicoAlvo: formPublicoAlvo.trim() || 'Comunidade Escolar',
      objetivos: formObjetivos.trim() || undefined,
      recursosNecessarios: formRecursos.trim() || undefined,
      areaOrigem: editandoAtividade ? editandoAtividade.areaOrigem : areaFinal,
      perfilOrigemRole: editandoAtividade?.perfilOrigemRole || currentUser.role,
      perfilOrigemLabel: editandoAtividade?.perfilOrigemLabel || currentUser.cargo || currentUser.role,
      coordenacaoTipo: formCoordenacaoTipo.trim() || editandoAtividade?.coordenacaoTipo,
      criadoPorId: editandoAtividade?.criadoPorId || currentUser.id,
      criadoPorNome: editandoAtividade?.criadoPorNome || currentUser.nomeCompleto,
      criadoPorGenero: editandoAtividade?.criadoPorGenero || currentUser.genero,
      responsavelExecucaoNome: formResponsavel.trim() || currentUser.nomeCompleto,
      estadoExecucao: formEstado,
      percentualCumprimento: Math.max(0, Math.min(100, Number(formPercentual) || 0)),
      observacoesCumprimento: formObservacoesCumprimento.trim() || undefined,
      evidenciasResultados: formEvidencias.trim() || undefined,
      excluidaDoPlanoGeralPorDiretor: editandoAtividade?.excluidaDoPlanoGeralPorDiretor,
      motivoExclusaoDiretor: editandoAtividade?.motivoExclusaoDiretor,
      excluidaPorId: editandoAtividade?.excluidaPorId,
      excluidaPorNome: editandoAtividade?.excluidaPorNome,
      excluidaEm: editandoAtividade?.excluidaEm,
      criadoEm: editandoAtividade?.criadoEm || agora,
      atualizadoEm: agora
    };

    dbService.salvarAtividadePlano(item);
    recarregarAtividades();
    setShowFormModal(false);
    notificar(
      editandoAtividade
        ? `Atividade "${item.titulo}" atualizada com sucesso.`
        : `Atividade "${item.titulo}" adicionada ao Plano (${LABELS_AREA[item.areaOrigem]}).`
    );
  };

  const abrirAtualizarCumprimento = (atv: AtividadePlanoEscolar) => {
    setAtividadeCumprimentoModal(atv);
    setCumpEstado(atv.estadoExecucao);
    setCumpPercentual(atv.percentualCumprimento ?? 0);
    setCumpObs(atv.observacoesCumprimento || '');
    setCumpEvidencias(atv.evidenciasResultados || '');
  };

  const handleSalvarCumprimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atividadeCumprimentoModal) return;
    const atualizada: AtividadePlanoEscolar = {
      ...atividadeCumprimentoModal,
      estadoExecucao: cumpEstado,
      percentualCumprimento: Math.max(0, Math.min(100, Number(cumpPercentual) || 0)),
      observacoesCumprimento: cumpObs.trim() || undefined,
      evidenciasResultados: cumpEvidencias.trim() || undefined,
      atualizadoEm: new Date().toISOString()
    };
    dbService.salvarAtividadePlano(atualizada);
    recarregarAtividades();
    setAtividadeCumprimentoModal(null);
    notificar(`Cumprimento da atividade "${atualizada.titulo}" atualizado (${atualizada.percentualCumprimento}%).`);
  };

  const handleConfirmarExclusaoPlanoGeral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atividadeExcluirPlanoModal) return;
    const motivo =
      motivoExclusaoDiretor.trim() || 'Considerada não prioritária/relevante para o Plano Geral da Escola pela Direcção.';
    const atualizada: AtividadePlanoEscolar = {
      ...atividadeExcluirPlanoModal,
      excluidaDoPlanoGeralPorDiretor: true,
      motivoExclusaoDiretor: motivo,
      excluidaPorId: currentUser.id,
      excluidaPorNome: currentUser.nomeCompleto,
      excluidaEm: new Date().toISOString()
    };
    dbService.salvarAtividadePlano(atualizada);
    recarregarAtividades();
    setAtividadeExcluirPlanoModal(null);
    setMotivoExclusaoDiretor('');
    notificar(`"${atualizada.titulo}" foi excluída do Plano Geral da Escola.`, 'aviso');
  };

  const handleRestaurarParaPlanoGeral = (atv: AtividadePlanoEscolar) => {
    const atualizada: AtividadePlanoEscolar = {
      ...atv,
      excluidaDoPlanoGeralPorDiretor: false,
      motivoExclusaoDiretor: undefined,
      excluidaPorId: undefined,
      excluidaPorNome: undefined,
      excluidaEm: undefined
    };
    dbService.salvarAtividadePlano(atualizada);
    recarregarAtividades();
    notificar(`Atividade "${atv.titulo}" restaurada para o Plano Geral da Escola.`);
  };

  const handleConfirmarEliminarDefinitivamente = () => {
    if (!atividadeParaEliminar) return;
    const titulo = atividadeParaEliminar.titulo;
    dbService.removerAtividadePlano(atividadeParaEliminar.id);
    recarregarAtividades();
    setAtividadeParaEliminar(null);
    notificar(`Atividade "${titulo}" removida permanentemente.`);
  };

  // =========================================================================
  // DADOS DO RELATÓRIO DE CUMPRIMENTO (TRIMESTRAL OU ANUAL, DETALHADO OU RESUMIDO)
  // =========================================================================
  const dadosRelatorio = useMemo(() => {
    const areasDoPerfil: Record<PerfilRelatorioFiltro, AreaPlanoAtividades[]> = {
      GERAL_DIRECAO: [
        'Direcao_Geral',
        'Subdirecao_Pedagogica',
        'Subdirecao_Administrativa',
        'Coordenacao_Pedagogica',
        'Secretaria_Geral'
      ],
      SUBDIRETOR_PEDAGOGICO: ['Subdirecao_Pedagogica', 'Coordenacao_Pedagogica'],
      SUBDIRETOR_ADMINISTRATIVO: ['Subdirecao_Administrativa', 'Secretaria_Geral'],
      COORDENADORES: ['Coordenacao_Pedagogica'],
      SECRETARIA: ['Secretaria_Geral']
    };

    const areasPermitidas = areasDoPerfil[relPerfil] || [];
    const basePeriodo = atividades.filter(atv => {
      if (relAno !== 'TODOS' && atv.anoLectivo !== relAno) return false;
      if (!areasPermitidas.includes(atv.areaOrigem)) return false;
      if (relPeriodo !== 'Anual' && atv.trimestre !== relPeriodo) return false;
      return true;
    });

    const incluidas = basePeriodo.filter(a => !a.excluidaDoPlanoGeralPorDiretor);
    const excluidas = basePeriodo.filter(a => Boolean(a.excluidaDoPlanoGeralPorDiretor));

    const total = incluidas.length;
    const realizadas = incluidas.filter(a => a.estadoExecucao === 'Realizada').length;
    const emCurso = incluidas.filter(a => a.estadoExecucao === 'Em_Curso').length;
    const planeadas = incluidas.filter(a => a.estadoExecucao === 'Planeada').length;
    const adiadas = incluidas.filter(a => a.estadoExecucao === 'Adiada').length;
    const canceladas = incluidas.filter(a => a.estadoExecucao === 'Cancelada').length;
    const taxaExecucaoRealizadas = total > 0 ? Math.round((realizadas / total) * 100) : 0;
    const mediaCumprimento =
      total > 0
        ? Math.round(
            incluidas.reduce((acc, a) => acc + (Number(a.percentualCumprimento) || 0), 0) / total
          )
        : 0;

    // Resumo agrupado por Área e Categoria
    const resumoPorArea = areasPermitidas
      .map(area => {
        const itens = incluidas.filter(a => a.areaOrigem === area);
        const tot = itens.length;
        const real = itens.filter(a => a.estadoExecucao === 'Realizada').length;
        const curso = itens.filter(a => a.estadoExecucao === 'Em_Curso').length;
        const plan = itens.filter(a => a.estadoExecucao === 'Planeada').length;
        const adCanc = itens.filter(a => a.estadoExecucao === 'Adiada' || a.estadoExecucao === 'Cancelada').length;
        const med =
          tot > 0
            ? Math.round(itens.reduce((acc, a) => acc + (Number(a.percentualCumprimento) || 0), 0) / tot)
            : 0;
        return {
          area,
          label: LABELS_AREA[area],
          total: tot,
          realizadas: real,
          emCurso: curso,
          planeadas: plan,
          adiadasCanceladas: adCanc,
          mediaCumprimento: med
        };
      })
      .filter(r => r.total > 0 || relPerfil === 'GERAL_DIRECAO');

    const resumoPorCategoria = CATEGORIAS_ATIVIDADE.map(cat => {
      const itens = incluidas.filter(a => a.categoria === cat);
      const tot = itens.length;
      const real = itens.filter(a => a.estadoExecucao === 'Realizada').length;
      const med =
        tot > 0
          ? Math.round(itens.reduce((acc, a) => acc + (Number(a.percentualCumprimento) || 0), 0) / tot)
          : 0;
      return { categoria: cat, total: tot, realizadas: real, mediaCumprimento: med };
    }).filter(c => c.total > 0);

    return {
      incluidas,
      excluidas,
      total,
      realizadas,
      emCurso,
      planeadas,
      adiadas,
      canceladas,
      taxaExecucaoRealizadas,
      mediaCumprimento,
      resumoPorArea,
      resumoPorCategoria
    };
  }, [atividades, relAno, relPeriodo, relPerfil]);

  const infoAssinaturasRelatorio = useMemo(() => {
    const dirTitulo = obterTituloDiretorGeral(escola, funcionarios);
    const dirNome = obterNomeDiretorGeral(escola, funcionarios);
    const subPedTitulo = obterTituloSubdiretorPedagogico(escola, funcionarios);
    const subPedNome = obterNomeSubdiretorPedagogico(escola, funcionarios);
    const subAdmTitulo = obterTituloSubdiretorAdministrativo(escola, funcionarios);
    const subAdmNome = obterNomeSubdiretorAdministrativo(escola, funcionarios);
    const secTitulo = obterTituloChefeSecretaria(escola, funcionarios);
    const secNome = obterNomeChefeSecretaria(escola, funcionarios);
    const userGen = inferirGeneroPorNomeOuParentesco(currentUser.nomeCompleto, undefined, currentUser.genero, funcionarios);
    const coordTitulo = flexionarGenero(userGen, 'O Coordenador Responsável', 'A Coordenadora Responsável');

    if (relPerfil === 'GERAL_DIRECAO') {
      return {
        emissorTitulo: dirTitulo,
        emissorNome: dirNome,
        vistoTitulo: subPedTitulo,
        vistoNome: subPedNome
      };
    }
    if (relPerfil === 'SUBDIRETOR_PEDAGOGICO') {
      return {
        emissorTitulo: subPedTitulo,
        emissorNome: subPedNome,
        vistoTitulo: dirTitulo,
        vistoNome: dirNome
      };
    }
    if (relPerfil === 'SUBDIRETOR_ADMINISTRATIVO') {
      return {
        emissorTitulo: subAdmTitulo,
        emissorNome: subAdmNome,
        vistoTitulo: dirTitulo,
        vistoNome: dirNome
      };
    }
    if (relPerfil === 'SECRETARIA') {
      return {
        emissorTitulo: secTitulo,
        emissorNome: secNome,
        vistoTitulo: subAdmTitulo,
        vistoNome: subAdmNome
      };
    }
    return {
      emissorTitulo: coordTitulo,
      emissorNome: currentUser.nomeCompleto,
      vistoTitulo: subPedTitulo,
      vistoNome: subPedNome
    };
  }, [relPerfil, escola, funcionarios, currentUser]);

  const referenciaDocumentoRelatorio = useMemo(() => {
    const p = relPeriodo === 'Anual' ? 'ANUAL' : `T${relPeriodo}`;
    const t = relTipo === 'Detalhado' ? 'DET' : 'RES';
    return `PA-${escola.sigla || 'MED'}-${relAno}-${p}-${relPerfil}-${t}`;
  }, [escola.sigla, relAno, relPeriodo, relPerfil, relTipo]);

  const handleBaixarRelatorioPdf = async () => {
    const el = document.getElementById('plano-relatorio-a4');
    if (!el) return;
    setExportandoPdf(true);
    try {
      const periodoLabel = relPeriodo === 'Anual' ? 'Anual' : `${relPeriodo}_Trimestre`;
      await downloadElementAsPdf(
        el,
        `Relatorio_Plano_Atividades_${relTipo}_${relPerfil}_${periodoLabel}_${relAno}.pdf`
      );
      notificar('Relatório exportado em PDF oficial A4 com sucesso.');
    } catch {
      notificar('Não foi possível gerar o PDF neste momento. Use a opção Imprimir (A4).', 'erro');
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleImprimirRelatorio = () => {
    const el = document.getElementById('plano-relatorio-a4');
    if (!el) return;
    imprimirElementoDiretamente(el, `Relatório de Cumprimento — ${escola.nomeOficial}`);
  };

  const handleExportarPlanoExcel = () => {
    const linhas = dadosRelatorio.incluidas.map((a, idx) => ({
      'Nº': idx + 1,
      'Ano Letivo': a.anoLectivo,
      Período: a.trimestre === 'Anual' ? 'Anual (Todo Ano Letivo)' : `${a.trimestre}º Trimestre`,
      Área: LABELS_AREA[a.areaOrigem],
      'Subárea / Coordenação': a.coordenacaoTipo || '-',
      Categoria: a.categoria,
      'Título da Atividade / Evento': a.titulo,
      Descrição: a.descricao,
      'Data Início': a.dataInicio,
      'Data Fim': a.dataFim || '-',
      Hora: a.hora || '-',
      Local: a.local || '-',
      'Público-Alvo': a.publicoAlvo,
      'Responsável pela Execução': a.responsavelExecucaoNome || a.criadoPorNome,
      Estado: LABELS_ESTADO[a.estadoExecucao],
      'Cumprimento (%)': a.percentualCumprimento,
      'Evidências / Resultados': a.evidenciasResultados || '-',
      Observações: a.observacoesCumprimento || '-'
    }));

    if (linhas.length === 0) {
      notificar('Não existem atividades incluídas para exportar neste período.', 'aviso');
      return;
    }

    const periodoSlug = relPeriodo === 'Anual' ? 'Anual' : `${relPeriodo}T`;
    downloadExcelFile(
      'Plano_Atividades',
      linhas,
      `Relatorio_Plano_Atividades_${relPerfil}_${periodoSlug}_${relAno}.xlsx`
    );
    notificar('Planilha Excel do Plano de Atividades exportada com sucesso.');
  };

  const handleBaixarListaPlanoPdf = async () => {
    const el = document.getElementById('plano-lista-direta-a4');
    if (!el || atividadesAtivasNoPlano.length === 0) {
      notificar('Não existem atividades na lista filtrada para exportar em PDF.', 'aviso');
      return;
    }
    setExportandoPdf(true);
    try {
      const anoLabel = filtroAno === 'TODOS' ? (escola.anoLectivoActivo || 'Geral') : filtroAno;
      await downloadElementAsPdf(
        el,
        `Plano_Atividades_${escola.sigla || 'MED'}_${anoLabel}.pdf`
      );
      notificar('Ficheiro PDF do Plano de Atividades descarregado com sucesso.');
    } catch {
      notificar('Erro ao gerar PDF do Plano de Atividades.', 'erro');
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarListaPlanoExcel = () => {
    if (atividadesAtivasNoPlano.length === 0) {
      notificar('Não existem atividades na lista filtrada para exportar em XLSX.', 'aviso');
      return;
    }
    const linhas = atividadesAtivasNoPlano.map((a, idx) => ({
      'Nº': idx + 1,
      'Ano Letivo': a.anoLectivo,
      Período: a.trimestre === 'Anual' ? 'Anual' : `${a.trimestre}º Trimestre`,
      Área: LABELS_AREA[a.areaOrigem],
      'Coordenação / Subárea': a.coordenacaoTipo || '-',
      Categoria: a.categoria,
      Título: a.titulo,
      Descrição: a.descricao,
      'Data Início': a.dataInicio,
      'Data Fim': a.dataFim || '-',
      Hora: a.hora || '-',
      Local: a.local || '-',
      'Público-Alvo': a.publicoAlvo,
      Responsável: a.responsavelExecucaoNome || a.criadoPorNome,
      Estado: LABELS_ESTADO[a.estadoExecucao],
      'Cumprimento (%)': a.percentualCumprimento,
      Evidências: a.evidenciasResultados || '-',
      Observações: a.observacoesCumprimento || '-'
    }));
    const anoLabel = filtroAno === 'TODOS' ? (escola.anoLectivoActivo || 'Geral') : filtroAno;
    downloadExcelFile('Plano_Atividades', linhas, `Plano_Atividades_${escola.sigla || 'MED'}_${anoLabel}.xlsx`);
    notificar('Ficheiro XLSX do Plano de Atividades exportado com sucesso.');
  };

  const labelPeriodoTexto =
    relPeriodo === 'Anual' ? `Ano Letivo Completo (${relAno})` : `${relPeriodo}º Trimestre de ${relAno}`;

  const labelPerfilRelatorio =
    perfisRelatorioDisponiveis.find(p => p.id === relPerfil)?.label || 'Plano Geral da Escola';

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-black uppercase tracking-wider">
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Plano de Atividades e Eventos</span>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {ehDiretorOuAdmin
                  ? 'Visão Geral Consolidada da Escola (Direcção)'
                  : ehSubdiretorPedagogico
                    ? 'Consolidação Pedagógica (Subdirecção + Coordenações)'
                    : ehSubdiretorAdministrativo
                      ? 'Consolidação Administrativa (Subdirecção + Secretaria)'
                      : ehSecretaria
                        ? 'Plano Operacional da Secretaria Geral'
                        : 'Plano da Coordenação Escolar'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Planificação Anual, Trimestral e Controlo de Cumprimento
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {ehDiretorOuAdmin
                ? 'Centraliza os planos dos Coordenadores, Secretaria e Subdiretores no Plano Geral da Escola, permitindo filtrar, adicionar atividades e excluir itens não relevantes.'
                : ehSubdiretorPedagogico
                  ? 'Integra as atividades da Subdirecção Pedagógica e de todos os Coordenadores para reporte à Direcção Geral.'
                  : ehSubdiretorAdministrativo
                    ? 'Integra as atividades da Subdirecção Administrativa e da Secretaria Geral para reporte à Direcção Geral.'
                    : 'Registe as atividades e eventos da sua área; estas integram automaticamente o plano do respetivo Subdiretor e o Plano Geral da Escola.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {abaAtiva === 'plano' && (
              <>
                <button
                  type="button"
                  onClick={handleBaixarListaPlanoPdf}
                  disabled={exportandoPdf}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>{exportandoPdf ? 'A gerar PDF...' : 'Baixar PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportarListaPlanoExcel}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Exportar XLSX</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={abrirNovaAtividade}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Atividade / Evento</span>
            </button>
          </div>
        </div>

        {/* Sub-abas */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAbaAtiva('plano')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              abaAtiva === 'plano'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              {ehDiretorOuAdmin ? 'Plano Geral Consolidado' : 'Plano de Atividades'} ({atividadesAtivasNoPlano.length})
            </span>
          </button>

          {ehDiretorOuAdmin && (
            <button
              type="button"
              onClick={() => setAbaAtiva('excluidas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                abaAtiva === 'excluidas'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Excluídas do Plano Geral ({atividadesExcluidasPeloDiretor.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAbaAtiva('relatorios')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              abaAtiva === 'relatorios'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Relatórios de Cumprimento (Trimestral & Anual)</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between ${
            feedback.tipo === 'erro'
              ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
              : feedback.tipo === 'aviso'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{feedback.texto}</span>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 opacity-70 hover:opacity-100 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 1: PLANO ATIVO CONSOLIDADO                                        */}
      {/* ===================================================================== */}
      {abaAtiva === 'plano' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total no Plano</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metricasPlano.total}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4">
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Realizadas</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{metricasPlano.realizadas}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4">
              <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">Em Curso</p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{metricasPlano.emCurso}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">Planeadas / Adiadas</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                {metricasPlano.planeadas} <span className="text-xs font-bold text-amber-600 dark:text-amber-400">({metricasPlano.adiadasCanceladas})</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-bold text-blue-100 uppercase">Cumprimento Médio</p>
              <p className="text-2xl font-black mt-1">{metricasPlano.mediaCumprimento}%</p>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={pesquisa}
                onChange={e => setPesquisa(e.target.value)}
                placeholder="Pesquisar título, local, responsável..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="p-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos os Anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>Ano {ano}</option>
              ))}
            </select>

            <select
              value={filtroTrimestre}
              onChange={e => setFiltroTrimestre(e.target.value as any)}
              className="p-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos os Períodos</option>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
              <option value="Anual">Anual</option>
            </select>

            <select
              value={filtroArea}
              onChange={e => setFiltroArea(e.target.value as any)}
              className="p-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="TODAS">Todas as Áreas ({areasVisiveisParaUsuario.length})</option>
              {areasVisiveisParaUsuario.map(area => (
                <option key={area} value={area}>{LABELS_AREA[area]}</option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as any)}
              className="p-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Todos os Estados</option>
              {(Object.keys(LABELS_ESTADO) as EstadoAtividadePlano[]).map(est => (
                <option key={est} value={est}>{LABELS_ESTADO[est]}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Categoria rápido */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Categoria:
            </span>
            <button
              type="button"
              onClick={() => setFiltroCategoria('TODAS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                filtroCategoria === 'TODAS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Todas
            </button>
            {CATEGORIAS_ATIVIDADE.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  filtroCategoria === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Lista de Atividades */}
          {atividadesAtivasNoPlano.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <CalendarCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Nenhuma atividade registada para os filtros selecionados
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Adicione atividades ou eventos para que sejam consolidados na sua área e no Plano Geral da Escola.
              </p>
              <button
                type="button"
                onClick={abrirNovaAtividade}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Primeira Atividade</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {atividadesAtivasNoPlano.map(atv => {
                const podeEditar = podeEditarAtividade(atv);
                const podeExcluirDoGeral = ehDiretorOuAdmin && atv.areaOrigem !== 'Direcao_Geral';

                return (
                  <div
                    key={atv.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${CORES_AREA[atv.areaOrigem]}`}>
                            {LABELS_AREA[atv.areaOrigem]}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {atv.trimestre === 'Anual' ? 'Anual' : `${atv.trimestre}º Trimestre`} · {atv.anoLectivo}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {atv.categoria}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${CORES_ESTADO[atv.estadoExecucao]}`}>
                          {LABELS_ESTADO[atv.estadoExecucao]} ({atv.percentualCumprimento}%)
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                          {atv.titulo}
                        </h3>
                        {atv.coordenacaoTipo && (
                          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                            {atv.coordenacaoTipo}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {atv.descricao}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {formatarDataAngolana(atv.dataInicio)}
                            {atv.dataFim ? ` a ${formatarDataAngolana(atv.dataFim)}` : ''}
                            {atv.hora ? ` · ${atv.hora}` : ''}
                          </span>
                        </div>
                        {atv.local && (
                          <div className="flex items-center space-x-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{atv.local}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1.5 truncate">
                          <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Resp.: {atv.responsavelExecucaoNome || atv.criadoPorNome}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Público: {atv.publicoAlvo}</span>
                        </div>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              atv.estadoExecucao === 'Realizada'
                                ? 'bg-emerald-500'
                                : atv.estadoExecucao === 'Cancelada'
                                  ? 'bg-red-500'
                                  : atv.estadoExecucao === 'Adiada'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, atv.percentualCumprimento || 0))}%` }}
                          />
                        </div>
                        {atv.observacoesCumprimento && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Obs. execução: {atv.observacoesCumprimento}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acções */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Submetido por {atv.criadoPorNome}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {podeEditar && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirAtualizarCumprimento(atv)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer flex items-center space-x-1"
                              title="Atualizar cumprimento e evidências"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Cumprimento</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirEditarAtividade(atv)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-1"
                              title="Editar atividade"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Editar</span>
                            </button>
                          </>
                        )}

                        {podeExcluirDoGeral && (
                          <button
                            type="button"
                            onClick={() => {
                              setAtividadeExcluirPlanoModal(atv);
                              setMotivoExclusaoDiretor('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer flex items-center space-x-1"
                            title="Retirar do Plano de Atividades Geral da Escola"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Excluir do Plano Geral</span>
                          </button>
                        )}

                        {podeEditar && (
                          <button
                            type="button"
                            onClick={() => setAtividadeParaEliminar(atv)}
                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                            title="Eliminar registo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: ATIVIDADES EXCLUÍDAS PELO DIRETOR DO PLANO GERAL               */}
      {/* ===================================================================== */}
      {abaAtiva === 'excluidas' && ehDiretorOuAdmin && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
            <Ban className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-black">Atividades Excluídas do Plano Geral da Escola</p>
              <p className="mt-0.5 opacity-90">
                Estas atividades foram submetidas por Coordenadores, Secretaria ou Subdiretores, mas marcadas pela Direcção como não relevantes/prioritárias para constarem no Plano Geral da Escola. Pode restaurá-las a qualquer momento.
              </p>
            </div>
          </div>

          {atividadesExcluidasPeloDiretor.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Não existem atividades excluídas do Plano Geral no ano letivo selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              {atividadesExcluidasPeloDiretor.map(atv => (
                <div
                  key={atv.id}
                  className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${CORES_AREA[atv.areaOrigem]}`}>
                        {LABELS_AREA[atv.areaOrigem]}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {atv.trimestre === 'Anual' ? 'Anual' : `${atv.trimestre}º Trimestre`} · {atv.anoLectivo}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{atv.titulo}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Submetido por <strong>{atv.criadoPorNome}</strong> ({formatarDataAngolana(atv.dataInicio)})
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                      Motivo da exclusão: {atv.motivoExclusaoDiretor || 'Sem observação adicional.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestaurarParaPlanoGeral(atv)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restaurar no Plano Geral</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAtividadeParaEliminar(atv)}
                      className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold hover:bg-red-100 cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: RELATÓRIOS TRIMESTRAIS E ANUAIS DE CUMPRIMENTO POR PERFIL      */}
      {/* ===================================================================== */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-5">
          {/* Painel de Controlo do Relatório */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Emissão de Relatórios de Cumprimento do Plano de Atividades
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecione o período (Trimestre ou Ano Letivo), o perfil/área e o formato (Detalhado ou Resumido) para emitir em PDF A4 ou Excel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBaixarRelatorioPdf}
                  disabled={exportandoPdf}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-black flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>{exportandoPdf ? 'A gerar PDF...' : 'Baixar PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleImprimirRelatorio}
                  className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-black flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportarPlanoExcel}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Ano Letivo</label>
                <select
                  value={relAno}
                  onChange={e => setRelAno(e.target.value)}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {anosDisponiveis.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Período</label>
                <select
                  value={relPeriodo}
                  onChange={e => setRelPeriodo(e.target.value as any)}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                  <option value="Anual">Ano Letivo Completo (Anual)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Perfil / Área</label>
                <select
                  value={relPerfil}
                  onChange={e => setRelPerfil(e.target.value as PerfilRelatorioFiltro)}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {perfisRelatorioDisponiveis.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo de Relatório</label>
                <select
                  value={relTipo}
                  onChange={e => setRelTipo(e.target.value as 'Detalhado' | 'Resumido')}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Detalhado">Relatório Detalhado (Item a Item)</option>
                  <option value="Resumido">Relatório Resumido (Executivo)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Parecer / Considerações Finais do Emissor (Opcional — aparece no PDF)
              </label>
              <textarea
                rows={2}
                value={relNotasDirecao}
                onChange={e => setRelNotasDirecao(e.target.value)}
                placeholder="Ex: Durante o período em referência, verificou-se elevado grau de cumprimento das metas pedagógicas..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* PREVIEW OFICIAL A4 (SEMPRE FUNDO BRANCO E TEXTO PRETO) */}
          <div className="overflow-x-auto pb-6">
            <div
              id="plano-relatorio-a4"
              className="bg-white text-black mx-auto shadow-lg border border-gray-300 p-8 sm:p-10 w-full max-w-[900px] min-h-[1120px] flex flex-col justify-between font-serif"
            >
              <div className="space-y-6">
                {/* Cabeçalho Oficial Angola MED */}
                <div className="text-center space-y-1.5 border-b-2 border-black pb-4">
                  <div className="flex justify-center mb-1">
                    <InsigniaAngola className="h-14 w-14" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest">REPÚBLICA DE ANGOLA</p>
                  <p className="text-[11px] font-bold uppercase">MINISTÉRIO DA EDUCAÇÃO</p>
                  <p className="text-sm font-black uppercase tracking-wide">{escola.nomeOficial}</p>
                  {(escola.municipio || escola.provincia) && (
                    <p className="text-[10px] text-gray-700 uppercase">
                      {[escola.municipio, escola.provincia].filter(Boolean).join(' · ')}
                      {escola.decretoCriacao ? ` · ${escola.decretoCriacao}` : ''}
                    </p>
                  )}
                </div>

                {/* Título do Relatório */}
                <div className="text-center space-y-1 py-1">
                  <h1 className="text-base font-black uppercase underline underline-offset-4">
                    RELATÓRIO {relTipo.toUpperCase()} DE CUMPRIMENTO DO PLANO DE ATIVIDADES E EVENTOS
                  </h1>
                  <p className="text-xs font-bold uppercase text-gray-800">
                    {labelPerfilRelatorio} · {labelPeriodoTexto}
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">Ref.ª: {referenciaDocumentoRelatorio}</p>
                </div>

                {/* Quadro Resumo de Indicadores */}
                <div className="grid grid-cols-5 border border-black text-center text-xs">
                  <div className="p-2.5 border-r border-black">
                    <p className="text-[10px] font-bold uppercase text-gray-700">Total Planeado</p>
                    <p className="text-lg font-black">{dadosRelatorio.total}</p>
                  </div>
                  <div className="p-2.5 border-r border-black">
                    <p className="text-[10px] font-bold uppercase text-gray-700">Realizadas</p>
                    <p className="text-lg font-black text-emerald-800">{dadosRelatorio.realizadas}</p>
                  </div>
                  <div className="p-2.5 border-r border-black">
                    <p className="text-[10px] font-bold uppercase text-gray-700">Em Curso</p>
                    <p className="text-lg font-black text-blue-800">{dadosRelatorio.emCurso}</p>
                  </div>
                  <div className="p-2.5 border-r border-black">
                    <p className="text-[10px] font-bold uppercase text-gray-700">Adiadas / Canc.</p>
                    <p className="text-lg font-black text-amber-800">
                      {dadosRelatorio.adiadas + dadosRelatorio.canceladas}
                    </p>
                  </div>
                  <div className="p-2.5 bg-gray-100">
                    <p className="text-[10px] font-bold uppercase text-gray-700">Cumprimento Médio</p>
                    <p className="text-lg font-black">{dadosRelatorio.mediaCumprimento}%</p>
                  </div>
                </div>

                {/* Tabela Síntese por Área */}
                <div className="space-y-2">
                  <h2 className="text-xs font-black uppercase border-b border-black pb-1">
                    1. Síntese Estatística por Área Orgânica
                  </h2>
                  <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-1.5 text-left">Área / Estrutura</th>
                        <th className="border border-black p-1.5 text-center">Planeadas</th>
                        <th className="border border-black p-1.5 text-center">Realizadas</th>
                        <th className="border border-black p-1.5 text-center">Em Curso</th>
                        <th className="border border-black p-1.5 text-center">Pendentes</th>
                        <th className="border border-black p-1.5 text-center">Adiadas/Canc.</th>
                        <th className="border border-black p-1.5 text-center">Cumprimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosRelatorio.resumoPorArea.map(row => (
                        <tr key={row.area}>
                          <td className="border border-black p-1.5 font-bold">{row.label}</td>
                          <td className="border border-black p-1.5 text-center">{row.total}</td>
                          <td className="border border-black p-1.5 text-center font-bold">{row.realizadas}</td>
                          <td className="border border-black p-1.5 text-center">{row.emCurso}</td>
                          <td className="border border-black p-1.5 text-center">{row.planeadas}</td>
                          <td className="border border-black p-1.5 text-center">{row.adiadasCanceladas}</td>
                          <td className="border border-black p-1.5 text-center font-black">{row.mediaCumprimento}%</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-black">
                        <td className="border border-black p-1.5">TOTAL CONSOLIDADO</td>
                        <td className="border border-black p-1.5 text-center">{dadosRelatorio.total}</td>
                        <td className="border border-black p-1.5 text-center">{dadosRelatorio.realizadas}</td>
                        <td className="border border-black p-1.5 text-center">{dadosRelatorio.emCurso}</td>
                        <td className="border border-black p-1.5 text-center">{dadosRelatorio.planeadas}</td>
                        <td className="border border-black p-1.5 text-center">
                          {dadosRelatorio.adiadas + dadosRelatorio.canceladas}
                        </td>
                        <td className="border border-black p-1.5 text-center">{dadosRelatorio.mediaCumprimento}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Conteúdo Condicional: Detalhado vs Resumido */}
                {relTipo === 'Detalhado' ? (
                  <div className="space-y-2">
                    <h2 className="text-xs font-black uppercase border-b border-black pb-1">
                      2. Mapa Detalhado de Atividades, Eventos e Evidências de Execução
                    </h2>
                    {dadosRelatorio.incluidas.length === 0 ? (
                      <p className="text-xs italic text-gray-600 py-4 text-center border border-gray-300">
                        Nenhuma atividade registada no plano para este período e perfil.
                      </p>
                    ) : (
                      <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1.5 text-center w-8">Nº</th>
                            <th className="border border-black p-1.5 text-left">Atividade / Evento & Área</th>
                            <th className="border border-black p-1.5 text-center">Data / Período</th>
                            <th className="border border-black p-1.5 text-left">Responsável</th>
                            <th className="border border-black p-1.5 text-center">Estado</th>
                            <th className="border border-black p-1.5 text-center">%</th>
                            <th className="border border-black p-1.5 text-left">Evidências / Observações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dadosRelatorio.incluidas.map((a, idx) => (
                            <tr key={a.id}>
                              <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                              <td className="border border-black p-1.5">
                                <p className="font-bold">{a.titulo}</p>
                                <p className="text-[9px] text-gray-700">
                                  {LABELS_AREA[a.areaOrigem]} · {a.categoria}
                                  {a.coordenacaoTipo ? ` · ${a.coordenacaoTipo}` : ''}
                                </p>
                              </td>
                              <td className="border border-black p-1.5 text-center whitespace-nowrap">
                                <p>{formatarDataAngolana(a.dataInicio)}</p>
                                <p className="text-[9px] text-gray-600">
                                  {a.trimestre === 'Anual' ? 'Anual' : `${a.trimestre}º Trim.`}
                                </p>
                              </td>
                              <td className="border border-black p-1.5">
                                {a.responsavelExecucaoNome || a.criadoPorNome}
                              </td>
                              <td className="border border-black p-1.5 text-center font-bold">
                                {LABELS_ESTADO[a.estadoExecucao]}
                              </td>
                              <td className="border border-black p-1.5 text-center font-black">
                                {a.percentualCumprimento}%
                              </td>
                              <td className="border border-black p-1.5">
                                {[a.evidenciasResultados, a.observacoesCumprimento].filter(Boolean).join(' — ') || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-xs font-black uppercase border-b border-black pb-1">
                        2. Distribuição Resumida por Categoria de Ação
                      </h2>
                      {dadosRelatorio.resumoPorCategoria.length === 0 ? (
                        <p className="text-xs italic text-gray-600 py-3">Sem registos para o período.</p>
                      ) : (
                        <table className="w-full border-collapse border border-black text-[11px]">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-black p-1.5 text-left">Categoria</th>
                              <th className="border border-black p-1.5 text-center">Nº Atividades</th>
                              <th className="border border-black p-1.5 text-center">Concluídas</th>
                              <th className="border border-black p-1.5 text-center">Taxa Média de Cumprimento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dadosRelatorio.resumoPorCategoria.map(c => (
                              <tr key={c.categoria}>
                                <td className="border border-black p-1.5 font-bold">{c.categoria}</td>
                                <td className="border border-black p-1.5 text-center">{c.total}</td>
                                <td className="border border-black p-1.5 text-center">{c.realizadas}</td>
                                <td className="border border-black p-1.5 text-center font-black">{c.mediaCumprimento}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="border border-black p-3 bg-gray-50 text-xs space-y-1">
                      <p className="font-black uppercase text-[11px]">Síntese Executiva do Cumprimento:</p>
                      <p className="leading-relaxed">
                        No período referente a <strong>{labelPeriodoTexto}</strong>, no âmbito de{' '}
                        <strong>{labelPerfilRelatorio}</strong>, foram planificadas{' '}
                        <strong>{dadosRelatorio.total}</strong> atividades e eventos, das quais{' '}
                        <strong>{dadosRelatorio.realizadas}</strong> encontram-se totalmente realizadas (
                        <strong>{dadosRelatorio.taxaExecucaoRealizadas}%</strong> de conclusão integral),{' '}
                        <strong>{dadosRelatorio.emCurso}</strong> em execução,{' '}
                        <strong>{dadosRelatorio.planeadas}</strong> pendentes e{' '}
                        <strong>{dadosRelatorio.adiadas + dadosRelatorio.canceladas}</strong> adiadas/canceladas,
                        alcançando uma taxa média global de cumprimento de{' '}
                        <strong>{dadosRelatorio.mediaCumprimento}%</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Nota sobre Exclusões pela Direcção */}
                {dadosRelatorio.excluidas.length > 0 && (
                  <div className="border border-gray-400 p-2.5 text-[10px] bg-gray-50">
                    <p className="font-bold">
                      Nota de Controlo da Direcção ({dadosRelatorio.excluidas.length} atividade(s) não incluída(s) no Plano Geral):
                    </p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {dadosRelatorio.excluidas.map(ex => (
                        <li key={ex.id}>
                          <strong>{ex.titulo}</strong> ({LABELS_AREA[ex.areaOrigem]}) — {ex.motivoExclusaoDiretor || 'Excluída por despacho da Direcção Geral.'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parecer / Observações Finais */}
                {relNotasDirecao.trim() && (
                  <div className="border border-black p-3 text-xs space-y-1">
                    <p className="font-black uppercase text-[11px]">Parecer / Considerações Finais:</p>
                    <p className="whitespace-pre-line leading-relaxed">{relNotasDirecao}</p>
                  </div>
                )}
              </div>

              {/* Rodapé Oficial com Assinaturas Flexionadas por Género e QR Code */}
              <div className="pt-8 mt-8 border-t border-gray-300 space-y-6">
                <p className="text-center text-xs">
                  {escola.municipio || escola.provincia || 'Angola'}, aos {formatarDataAngolana(new Date().toISOString().split('T')[0])}.
                </p>

                <div className="grid grid-cols-3 items-end gap-4 text-center text-[11px]">
                  <div className="space-y-1">
                    <p className="font-bold uppercase">{infoAssinaturasRelatorio.emissorTitulo}</p>
                    <div className="h-10" />
                    <div className="border-t border-black pt-1 font-bold">
                      {infoAssinaturasRelatorio.emissorNome}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <OfficialQrCode
                      value={gerarPayloadQrDocumento({
                        docType: 'RELATORIO_OFICIAL',
                        escolaId: escola.id,
                        docRef: referenciaDocumentoRelatorio,
                        anoLectivo: relAno
                      })}
                      size={74}
                    />
                    <span className="text-[8px] font-mono text-gray-600 mt-1">Autenticidade SGE-NG</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold uppercase">
                      Visto — {infoAssinaturasRelatorio.vistoTitulo}
                    </p>
                    <div className="h-10" />
                    <div className="border-t border-black pt-1 font-bold">
                      {infoAssinaturasRelatorio.vistoNome}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DOCUMENTO A4 OCULTO PARA EXPORTAÇÃO PDF DIRETA DA LISTA DE ATIVIDADES */}
      {/* ===================================================================== */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          id="plano-lista-direta-a4"
          className="bg-white text-black p-8 w-[794px] space-y-4"
          style={{ fontFamily: 'Times New Roman, Georgia, serif' }}
        >
          <div className="text-center border-b-2 border-black pb-3 space-y-1">
            <div className="flex justify-center">
              <InsigniaAngola className="h-12 w-12" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider">República de Angola • Ministério da Educação</p>
            <h2 className="text-sm font-black uppercase">{escola.nomeOficial}</h2>
            <p className="text-xs font-bold uppercase pt-1">Plano de Atividades e Eventos Escolares — Ano Letivo {filtroAno === 'TODOS' ? escola.anoLectivoActivo : filtroAno}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] border border-black p-2">
            <div><span className="block text-[9px] uppercase">Total</span><strong>{metricasPlano.total}</strong></div>
            <div><span className="block text-[9px] uppercase">Realizadas</span><strong>{metricasPlano.realizadas}</strong></div>
            <div><span className="block text-[9px] uppercase">Em Curso / Plan.</span><strong>{metricasPlano.emCurso + metricasPlano.planeadas}</strong></div>
            <div><span className="block text-[9px] uppercase">Cumprimento</span><strong>{metricasPlano.mediaCumprimento}%</strong></div>
          </div>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1.5 text-left">Nº</th>
                <th className="border border-black p-1.5 text-left">Atividade / Evento</th>
                <th className="border border-black p-1.5 text-left">Área / Categoria</th>
                <th className="border border-black p-1.5 text-center">Período / Data</th>
                <th className="border border-black p-1.5 text-left">Responsável / Local</th>
                <th className="border border-black p-1.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {atividadesAtivasNoPlano.map((a, idx) => (
                <tr key={`pdf-atv-${a.id}`}>
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5">
                    <div className="font-bold">{a.titulo}</div>
                    <div className="text-[9px] text-gray-700">{a.descricao}</div>
                  </td>
                  <td className="border border-black p-1.5">
                    <div>{LABELS_AREA[a.areaOrigem]}</div>
                    <div className="text-[9px]">{a.categoria}</div>
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    <div>{a.trimestre === 'Anual' ? 'Anual' : `${a.trimestre}º Trim.`}</div>
                    <div>{formatarDataAngolana(a.dataInicio)}</div>
                  </td>
                  <td className="border border-black p-1.5">
                    <div>{a.responsavelExecucaoNome || a.criadoPorNome}</div>
                    <div className="text-[9px]">{a.local || '-'}</div>
                  </td>
                  <td className="border border-black p-1.5 text-center font-bold">
                    {LABELS_ESTADO[a.estadoExecucao]} ({a.percentualCumprimento}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-right pt-4">
            Emitido em {new Date().toLocaleDateString('pt-AO')} • {escola.municipio}, {escola.provincia}
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: CRIAR / EDITAR ATIVIDADE                                       */}
      {/* ===================================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editandoAtividade ? 'Editar Atividade / Evento' : 'Nova Atividade / Evento no Plano'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Área de Origem: <strong>{LABELS_AREA[editandoAtividade ? editandoAtividade.areaOrigem : formAreaSelecionada]}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {formErro && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300">
                  {formErro}
                </div>
              )}

              <form onSubmit={handleSalvarAtividade} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Título da Atividade / Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={e => setFormTitulo(e.target.value)}
                    placeholder="Ex: Reunião Pedagógica de Balanço do 1º Trimestre"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {ehDiretorOuAdmin && !editandoAtividade && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Área / Secção do Plano
                    </label>
                    <select
                      value={formAreaSelecionada}
                      onChange={e => setFormAreaSelecionada(e.target.value as AreaPlanoAtividades)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {(Object.keys(LABELS_AREA) as AreaPlanoAtividades[]).map(ar => (
                        <option key={ar} value={ar}>{LABELS_AREA[ar]}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria *</label>
                  <select
                    value={formCategoria}
                    onChange={e => setFormCategoria(e.target.value as CategoriaAtividadePlano)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {CATEGORIAS_ATIVIDADE.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ano Letivo *</label>
                  <select
                    value={formAnoLectivo}
                    onChange={e => setFormAnoLectivo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {anosDisponiveis.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Trimestre / Período *</label>
                  <select
                    value={formTrimestre}
                    onChange={e => setFormTrimestre(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="1">1º Trimestre</option>
                    <option value="2">2º Trimestre</option>
                    <option value="3">3º Trimestre</option>
                    <option value="Anual">Ano Letivo Completo (Anual)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Início *</label>
                  <input
                    type="date"
                    required
                    value={formDataInicio}
                    onChange={e => setFormDataInicio(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Fim (Opcional)</label>
                  <input
                    type="date"
                    value={formDataFim}
                    onChange={e => setFormDataFim(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hora / Horário</label>
                  <input
                    type="text"
                    value={formHora}
                    onChange={e => setFormHora(e.target.value)}
                    placeholder="Ex: 08:30 - 11:00"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Local / Sala</label>
                  <input
                    type="text"
                    value={formLocal}
                    onChange={e => setFormLocal(e.target.value)}
                    placeholder="Ex: Anfiteatro / Sala dos Professores"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Público-Alvo *</label>
                  <input
                    type="text"
                    value={formPublicoAlvo}
                    onChange={e => setFormPublicoAlvo(e.target.value)}
                    placeholder="Ex: Docentes, Encarregados, Alunos"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável pela Execução</label>
                  <input
                    type="text"
                    value={formResponsavel}
                    onChange={e => setFormResponsavel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {(ehCoordenador || formAreaSelecionada === 'Coordenacao_Pedagogica') && (
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Coordenação / Turma / Disciplina Associada
                    </label>
                    <input
                      type="text"
                      value={formCoordenacaoTipo}
                      onChange={e => setFormCoordenacaoTipo(e.target.value)}
                      placeholder="Ex: Coordenação de Língua Portuguesa / Coordenação da 10ª Classe"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição Detalhada *</label>
                  <textarea
                    rows={2}
                    required
                    value={formDescricao}
                    onChange={e => setFormDescricao(e.target.value)}
                    placeholder="Descreva os objetivos, etapas e impacto da atividade..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Estado de Execução</label>
                  <select
                    value={formEstado}
                    onChange={e => handleEstadoFormChange(e.target.value as EstadoAtividadePlano)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {(Object.keys(LABELS_ESTADO) as EstadoAtividadePlano[]).map(est => (
                      <option key={est} value={est}>{LABELS_ESTADO[est]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Grau de Cumprimento ({formPercentual}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formPercentual}
                    onChange={e => setFormPercentual(Number(e.target.value))}
                    className="w-full accent-blue-600 mt-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer"
                >
                  {editandoAtividade ? 'Guardar Alterações' : 'Registar no Plano'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ATUALIZAR CUMPRIMENTO E EVIDÊNCIAS                             */}
      {/* ===================================================================== */}
      {atividadeCumprimentoModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Registar Cumprimento da Atividade
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {atividadeCumprimentoModal.titulo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAtividadeCumprimentoModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarCumprimento} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                <select
                  value={cumpEstado}
                  onChange={e => {
                    const est = e.target.value as EstadoAtividadePlano;
                    setCumpEstado(est);
                    if (est === 'Realizada') setCumpPercentual(100);
                    else if (est === 'Planeada') setCumpPercentual(0);
                    else if (est === 'Em_Curso' && cumpPercentual === 0) setCumpPercentual(50);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {(Object.keys(LABELS_ESTADO) as EstadoAtividadePlano[]).map(est => (
                    <option key={est} value={est}>{LABELS_ESTADO[est]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Percentagem de Execução ({cumpPercentual}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={cumpPercentual}
                  onChange={e => setCumpPercentual(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Evidências / Resultados Alcançados
                </label>
                <textarea
                  rows={2}
                  value={cumpEvidencias}
                  onChange={e => setCumpEvidencias(e.target.value)}
                  placeholder="Ex: Ata assinada por 32 docentes, pautas entregues no prazo..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Constrangimentos
                </label>
                <textarea
                  rows={2}
                  value={cumpObs}
                  onChange={e => setCumpObs(e.target.value)}
                  placeholder="Ex: Atividade concluída conforme previsto ou justificação de adiamento..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAtividadeCumprimentoModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer"
                >
                  Guardar Cumprimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EXCLUIR DO PLANO GERAL DA ESCOLA (DIRETOR GERAL)               */}
      {/* ===================================================================== */}
      {atividadeExcluirPlanoModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto my-auto">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 rounded-xl">
                <EyeOff className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Excluir do Plano Geral da Escola
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  A atividade <strong>"{atividadeExcluirPlanoModal.titulo}"</strong> ({LABELS_AREA[atividadeExcluirPlanoModal.areaOrigem]}) deixará de constar no Plano Geral da Escola. Poderá restaurá-la posteriormente na aba "Excluídas".
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmarExclusaoPlanoGeral} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Justificação da Direcção (opcional)
                </label>
                <textarea
                  rows={2}
                  value={motivoExclusaoDiretor}
                  onChange={e => setMotivoExclusaoDiretor(e.target.value)}
                  placeholder="Ex: Atividade duplicada ou não prioritária para o trimestre letivo..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAtividadeExcluirPlanoModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black cursor-pointer"
                >
                  Confirmar Exclusão do Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE ELIMINAÇÃO DEFINITIVA                           */}
      {/* ===================================================================== */}
      {atividadeParaEliminar && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Eliminar Atividade Permanentemente?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Tem a certeza que deseja eliminar <strong>"{atividadeParaEliminar.titulo}"</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAtividadeParaEliminar(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminarDefinitivamente}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer"
              >
                Eliminar Registo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
