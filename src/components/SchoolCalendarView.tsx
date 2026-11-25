import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  Award, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Flag, 
  BookOpen, 
  Users, 
  ChevronRight, 
  X, 
  Sparkles,
  Layers,
  MapPin,
  Edit2,
  Trash2,
  RotateCcw,
  Tag
} from 'lucide-react';
import { Escola, Funcionario, TipoEventoCalendarioCor, TipoEventoCalendarioCustom } from '../types';
import { InsigniaAngola, DEFAULT_INSIGNIA_SVG_DATA_URL } from '../constants/insignia';
import { downloadHtmlDocument } from '../utils/curriculoAngola';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { formatarDataAngolana } from '../utils/dateFormat';
import { dbService } from '../services/storage';
import { offlineStorage } from '../services/offlineStorage';

export interface EventoCalendarioEscolar {
  id: string;
  titulo: string;
  tipo: string;
  trimestre: '1' | '2' | '3' | 'Geral';
  dataInicio: string;
  dataFim?: string;
  descricao: string;
  obrigatorioMED: boolean;
  publicoAlvo: 'Geral' | 'Professores' | 'Alunos' | 'Encarregados';
}

interface TipoEventoDefinicao {
  id: string;
  nome: string;
  cor: TipoEventoCalendarioCor;
  padrao?: boolean;
}

const TIPOS_EVENTO_PADRAO: TipoEventoDefinicao[] = [
  { id: 'padrao-avaliacao', nome: 'Avaliação', cor: 'blue', padrao: true },
  { id: 'padrao-feriado', nome: 'Feriado', cor: 'red', padrao: true },
  { id: 'padrao-pausa', nome: 'Pausa Pedagógica', cor: 'amber', padrao: true },
  { id: 'padrao-conselho', nome: 'Conselho', cor: 'indigo', padrao: true },
  { id: 'padrao-matricula', nome: 'Matrícula', cor: 'emerald', padrao: true },
  { id: 'padrao-institucional', nome: 'Institucional', cor: 'purple', padrao: true }
];

const CORES_EVENTO_MAP: Record<
  TipoEventoCalendarioCor,
  { label: string; iconWrap: string; badge: string; swatch: string; htmlBg: string; htmlText: string }
> = {
  blue: {
    label: 'Azul',
    iconWrap: 'bg-blue-100 text-blue-800',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    swatch: 'bg-blue-600',
    htmlBg: '#dbeafe',
    htmlText: '#1e40af'
  },
  red: {
    label: 'Vermelho',
    iconWrap: 'bg-red-100 text-red-800',
    badge: 'bg-red-50 text-red-700 border border-red-200',
    swatch: 'bg-red-600',
    htmlBg: '#fee2e2',
    htmlText: '#991b1b'
  },
  amber: {
    label: 'Âmbar',
    iconWrap: 'bg-amber-100 text-amber-800',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    swatch: 'bg-amber-500',
    htmlBg: '#fef3c7',
    htmlText: '#92400e'
  },
  emerald: {
    label: 'Esmeralda',
    iconWrap: 'bg-emerald-100 text-emerald-800',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    swatch: 'bg-emerald-600',
    htmlBg: '#d1fae5',
    htmlText: '#065f46'
  },
  indigo: {
    label: 'Índigo',
    iconWrap: 'bg-indigo-100 text-indigo-800',
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    swatch: 'bg-indigo-600',
    htmlBg: '#e0e7ff',
    htmlText: '#3730a3'
  },
  purple: {
    label: 'Roxo',
    iconWrap: 'bg-purple-100 text-purple-800',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
    swatch: 'bg-purple-600',
    htmlBg: '#f3e8ff',
    htmlText: '#6b21a8'
  },
  teal: {
    label: 'Turquesa',
    iconWrap: 'bg-teal-100 text-teal-800',
    badge: 'bg-teal-50 text-teal-700 border border-teal-200',
    swatch: 'bg-teal-600',
    htmlBg: '#ccfbf1',
    htmlText: '#115e59'
  },
  rose: {
    label: 'Rosa',
    iconWrap: 'bg-rose-100 text-rose-800',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    swatch: 'bg-rose-600',
    htmlBg: '#ffe4e6',
    htmlText: '#9f1239'
  }
};

interface SchoolCalendarViewProps {
  escola: Escola;
  currentUser: Funcionario;
}

export const SchoolCalendarView: React.FC<SchoolCalendarViewProps> = ({
  escola,
  currentUser
}) => {
  const [trimestreSelecionado, setTrimestreSelecionado] = useState<'TODOS' | '1' | '2' | '3' | 'Geral'>('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [termoBusca, setTermoBusca] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const podeEditarCalendario = [
    'AdminGeral',
    'DiretorGeral',
    'SubdiretorPedagogico',
    'SubdiretorAdministrativo',
    'SubdirectorAdministrativo',
    'CoordenadorPedagogico',
    'CoordenadorTurno',
    'CoordenadorDisciplina',
    'Secretaria',
    'ChefeSecretaria',
    'Secretario',
    'SecretarioEscolar'
  ].includes(currentUser.role);

  const notificar = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const gerarEventosPadraoMED = (anoLectivo: string): EventoCalendarioEscolar[] => {
    const ano = (anoLectivo || '2025/2026').split('/')[0] || '2025';
    const anoSeguinte = (anoLectivo || '2025/2026').split('/')[1] || '2026';

    return [
      // 1º Trimestre
      {
        id: 'cal-01',
        titulo: 'Abertura Oficial do Ano Letivo & Início das Aulas',
        tipo: 'Institucional',
        trimestre: '1',
        dataInicio: `${ano}-09-02`,
        dataFim: `${ano}-09-02`,
        descricao: 'Acolhimento solene aos estudantes, conferência inaugural e início das atividades letivas em todos os turnos.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-02',
        titulo: 'Dia do Fundador da Nação e dos Heróis Nacionais (Feriado)',
        tipo: 'Feriado',
        trimestre: '1',
        dataInicio: `${ano}-09-17`,
        dataFim: `${ano}-09-17`,
        descricao: 'Comemoração oficial do aniversário do Dr. António Agostinho Neto (Tolerância de Ponto / Feriado Nacional).',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-03',
        titulo: 'Semana de Realização das Provas do Professor (NPP1)',
        tipo: 'Avaliação',
        trimestre: '1',
        dataInicio: `${ano}-10-21`,
        dataFim: `${ano}-10-25`,
        descricao: 'Aplicação das primeiras avaliações somativas com calendário afixado por disciplina.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-04',
        titulo: 'Dia de Todos os Santos e Finados (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '1',
        dataInicio: `${ano}-11-02`,
        dataFim: `${ano}-11-02`,
        descricao: 'Celebração cívica e religiosa nacional.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-05',
        titulo: 'Dia da Independência Nacional de Angola (50 Anos)',
        tipo: 'Feriado',
        trimestre: '1',
        dataInicio: `${ano}-11-11`,
        dataFim: `${ano}-11-11`,
        descricao: 'Jubileu dos 50 anos da Proclamação da Independência da República de Angola.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-06',
        titulo: 'Provas Trimestrais do Iº Trimestre (NPT1)',
        tipo: 'Avaliação',
        trimestre: '1',
        dataInicio: `${ano}-12-02`,
        dataFim: `${ano}-12-09`,
        descricao: 'Provas oficiais unificadas de fim de trimestre para cálculo da Média Trimestral (MT1).',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-07',
        titulo: 'Conselho de Notas & Pausa Pedagógica do Iº Trimestre',
        tipo: 'Pausa Pedagógica',
        trimestre: '1',
        dataInicio: `${ano}-12-16`,
        dataFim: `${anoSeguinte}-01-03`,
        descricao: 'Reunião de professores de turma, lançamento de notas e pausa natalícia/ano novo.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      // 2º Trimestre
      {
        id: 'cal-08',
        titulo: 'Reinício das Aulas do IIº Trimestre',
        tipo: 'Institucional',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-01-05`,
        dataFim: `${anoSeguinte}-01-05`,
        descricao: 'Arranque regular do 2º trimestre letivo com entrega de boletins do 1º trimestre.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-09',
        titulo: 'Dia do Início da Luta Armada de Libertação Nacional (Feriado)',
        tipo: 'Feriado',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-02-04`,
        dataFim: `${anoSeguinte}-02-04`,
        descricao: 'Comemoração dos heróis do 4 de Fevereiro.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-10',
        titulo: 'Provas do Professor do IIº Trimestre (NPP2)',
        tipo: 'Avaliação',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-02-16`,
        dataFim: `${anoSeguinte}-02-20`,
        descricao: 'Avaliações contínuas intermediárias do 2º trimestre.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-11',
        titulo: 'Dia Internacional da Mulher (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-03-08`,
        dataFim: `${anoSeguinte}-03-08`,
        descricao: 'Celebração e reflexão sobre o papel da mulher angolana.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-12',
        titulo: 'Provas Trimestrais do IIº Trimestre (NPT2)',
        tipo: 'Avaliação',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-03-23`,
        dataFim: `${anoSeguinte}-03-28`,
        descricao: 'Provas trimestrais oficiais e cálculo das médias MT2.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-13',
        titulo: 'Dia da Paz e da Reconciliação Nacional (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-04-04`,
        dataFim: `${anoSeguinte}-04-04`,
        descricao: 'Comemoração histórica dos acordos de paz em Angola.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      // 3º Trimestre
      {
        id: 'cal-14',
        titulo: 'Início das Aulas do IIIº Trimestre',
        tipo: 'Institucional',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-04-07`,
        dataFim: `${anoSeguinte}-04-07`,
        descricao: 'Última etapa curricular decisiva do ano letivo.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-15',
        titulo: 'Dia Internacional do Trabalhador (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-05-01`,
        dataFim: `${anoSeguinte}-05-01`,
        descricao: 'Feriado comemorativo dos direitos do trabalhador.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-16',
        titulo: 'Provas Trimestrais do IIIº Trimestre (NPT3)',
        tipo: 'Avaliação',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-06-08`,
        dataFim: `${anoSeguinte}-06-15`,
        descricao: 'Realização das provas trimestrais finais e apuramento dos alunos aprovados antes do exame/júri.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-17',
        titulo: 'Provas de Exames Nacionais & Sessões das Comissões de Júri',
        tipo: 'Avaliação',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-06-22`,
        dataFim: `${anoSeguinte}-07-04`,
        descricao: 'Realização dos exames de ciclo (6ª, 9ª, 12ª, 13ª Classes) e deliberações oficiais com atas de júri.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-18',
        titulo: 'Publicação Oficial das Pautas Gerais de Fim de Ano & Encerramento',
        tipo: 'Conselho',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-07-10`,
        dataFim: `${anoSeguinte}-07-10`,
        descricao: 'Afixação solene das pautas homologadas e emissão de certificados de conclusão de ciclo.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-19',
        titulo: 'Período Oficial de Matrículas e Confirmações para o Próximo Ano',
        tipo: 'Matrícula',
        trimestre: 'Geral',
        dataInicio: `${anoSeguinte}-07-20`,
        dataFim: `${anoSeguinte}-08-10`,
        descricao: 'Inscrição de novos discentes e confirmação presencial/online na Secretaria Escolar.',
        obrigatorioMED: true,
        publicoAlvo: 'Encarregados'
      }
    ];
  };

  const carregarEventosEscola = (escolaObj: Escola): EventoCalendarioEscolar[] => {
    const salvos = localStorage.getItem(`sge_calendario_${escolaObj.id}`);
    if (salvos) {
      try {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return gerarEventosPadraoMED(escolaObj.anoLectivoActivo);
  };

  const carregarTiposCustomizadosEscola = (escolaId: string): TipoEventoCalendarioCustom[] => {
    const salvos = localStorage.getItem(`sge_calendario_tipos_${escolaId}`);
    if (salvos) {
      try {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  const persistirEventos = (lista: EventoCalendarioEscolar[]) => {
    const key = `sge_calendario_${escola.id}`;
    const serialized = JSON.stringify(lista);
    try {
      localStorage.setItem(key, serialized);
      window.dispatchEvent(new CustomEvent('sge_local_write', { detail: { key } }));
    } catch {}
    offlineStorage.gravarChaveNoIndexedDB(key, serialized).catch(() => {});
  };

  const persistirTiposCustom = (lista: TipoEventoCalendarioCustom[]) => {
    const key = `sge_calendario_tipos_${escola.id}`;
    const serialized = JSON.stringify(lista);
    try {
      localStorage.setItem(key, serialized);
      window.dispatchEvent(new CustomEvent('sge_local_write', { detail: { key } }));
    } catch {}
    offlineStorage.gravarChaveNoIndexedDB(key, serialized).catch(() => {});
  };

  const [eventos, setEventos] = useState<EventoCalendarioEscolar[]>(() => carregarEventosEscola(escola));
  const [tiposCustom, setTiposCustom] = useState<TipoEventoCalendarioCustom[]>(() =>
    carregarTiposCustomizadosEscola(escola.id)
  );

  React.useEffect(() => {
    const keyEventos = `sge_calendario_${escola.id}`;
    const keyTipos = `sge_calendario_tipos_${escola.id}`;
    setEventos(carregarEventosEscola(escola));
    setTiposCustom(carregarTiposCustomizadosEscola(escola.id));

    if (!localStorage.getItem(keyEventos)) {
      offlineStorage.lerChaveNoIndexedDB(keyEventos).then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localStorage.setItem(keyEventos, raw);
              setEventos(parsed);
            }
          } catch {}
        }
      }).catch(() => {});
    }

    if (!localStorage.getItem(keyTipos)) {
      offlineStorage.lerChaveNoIndexedDB(keyTipos).then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localStorage.setItem(keyTipos, raw);
              setTiposCustom(parsed);
            }
          } catch {}
        }
      }).catch(() => {});
    }
  }, [escola.id]);

  const todosTiposEventos: TipoEventoDefinicao[] = React.useMemo(() => {
    const customMapped: TipoEventoDefinicao[] = tiposCustom.map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: t.cor,
      padrao: false
    }));
    return [...TIPOS_EVENTO_PADRAO, ...customMapped];
  }, [tiposCustom]);

  const obterEstiloTipo = (nomeTipo: string) => {
    const def = todosTiposEventos.find(
      (t) => t.nome.toLowerCase() === (nomeTipo || '').toLowerCase()
    );
    const cor: TipoEventoCalendarioCor = def?.cor || 'indigo';
    return CORES_EVENTO_MAP[cor] || CORES_EVENTO_MAP.indigo;
  };

  // Modal Novo / Editar Evento
  const [showNovoEventoModal, setShowNovoEventoModal] = useState(false);
  const [editingEventoId, setEditingEventoId] = useState<string | null>(null);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTipo, setNovoTipo] = useState<string>('Avaliação');
  const [novoTrimestre, setNovoTrimestre] = useState<EventoCalendarioEscolar['trimestre']>('1');
  const [novaDataInicio, setNovaDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [novaDataFim, setNovaDataFim] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoPublico, setNovoPublico] = useState<EventoCalendarioEscolar['publicoAlvo']>('Geral');
  const [erroModalEvento, setErroModalEvento] = useState<string | null>(null);
  const [eventoParaEliminar, setEventoParaEliminar] = useState<EventoCalendarioEscolar | null>(null);
  const [showConfirmRestaurarPadrao, setShowConfirmRestaurarPadrao] = useState(false);

  // Gestão de Tipos Personalizados de Eventos
  const [showGerirTiposModal, setShowGerirTiposModal] = useState(false);
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [nomeTipoForm, setNomeTipoForm] = useState('');
  const [corTipoForm, setCorTipoForm] = useState<TipoEventoCalendarioCor>('teal');
  const [erroTipoForm, setErroTipoForm] = useState<string | null>(null);
  const [tipoParaEliminarConfirmId, setTipoParaEliminarConfirmId] = useState<string | null>(null);

  // Criação rápida inline de tipo dentro do modal de evento
  const [mostrarCriacaoRapidaTipo, setMostrarCriacaoRapidaTipo] = useState(false);
  const [nomeNovoTipoRapido, setNomeNovoTipoRapido] = useState('');
  const [corNovoTipoRapido, setCorNovoTipoRapido] = useState<TipoEventoCalendarioCor>('teal');

  const abrirModalNovoEvento = (trimestrePredefinido?: EventoCalendarioEscolar['trimestre']) => {
    setEditingEventoId(null);
    setErroModalEvento(null);
    setMostrarCriacaoRapidaTipo(false);
    setNovoTitulo('');
    setNovoTipo('Avaliação');
    setNovoTrimestre(trimestrePredefinido || (escola.trimestreActivo as any) || '1');
    setNovaDataInicio(new Date().toISOString().split('T')[0]);
    setNovaDataFim('');
    setNovaDescricao('');
    setNovoPublico('Geral');
    setShowNovoEventoModal(true);
  };

  const abrirModalEditarEvento = (evt: EventoCalendarioEscolar) => {
    setEditingEventoId(evt.id);
    setErroModalEvento(null);
    setMostrarCriacaoRapidaTipo(false);
    setNovoTitulo(evt.titulo);
    setNovoTipo(evt.tipo);
    setNovoTrimestre(evt.trimestre);
    setNovaDataInicio(evt.dataInicio);
    setNovaDataFim(evt.dataFim || '');
    setNovaDescricao(evt.descricao);
    setNovoPublico(evt.publicoAlvo);
    setShowNovoEventoModal(true);
  };

  const handleAdicionarTipoRapido = () => {
    const limpo = nomeNovoTipoRapido.trim();
    if (!limpo) {
      setErroModalEvento('Indique o nome do novo tipo de evento.');
      return;
    }
    const duplicado = todosTiposEventos.some((t) => t.nome.toLowerCase() === limpo.toLowerCase());
    if (duplicado) {
      setErroModalEvento(`O tipo "${limpo}" já existe no calendário.`);
      return;
    }
    const novo: TipoEventoCalendarioCustom = {
      id: `tipo-cal-${Date.now()}`,
      nome: limpo,
      cor: corNovoTipoRapido,
      criadoPor: currentUser.nomeCompleto,
      criadoEm: new Date().toISOString()
    };
    const atualizados = [...tiposCustom, novo];
    setTiposCustom(atualizados);
    persistirTiposCustom(atualizados);
    setNovoTipo(novo.nome);
    setNomeNovoTipoRapido('');
    setMostrarCriacaoRapidaTipo(false);
    setErroModalEvento(null);
    dbService.registarLog('Calendário Escolar', `Novo tipo de evento criado: "${novo.nome}".`, escola.id);
    notificar(`Tipo de evento "${novo.nome}" criado e selecionado.`);
  };

  const handleSalvarTipoModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErroTipoForm(null);
    const limpo = nomeTipoForm.trim();
    if (!limpo) {
      setErroTipoForm('Preencha o nome do tipo de evento.');
      return;
    }
    const existeOutro = todosTiposEventos.some(
      (t) => t.nome.toLowerCase() === limpo.toLowerCase() && t.id !== editingTipoId
    );
    if (existeOutro) {
      setErroTipoForm(`Já existe um tipo de evento designado "${limpo}".`);
      return;
    }

    if (editingTipoId) {
      const anterior = tiposCustom.find((t) => t.id === editingTipoId);
      const atualizados = tiposCustom.map((t) =>
        t.id === editingTipoId ? { ...t, nome: limpo, cor: corTipoForm } : t
      );
      setTiposCustom(atualizados);
      persistirTiposCustom(atualizados);

      if (anterior && anterior.nome !== limpo) {
        const eventosRenomeados = eventos.map((ev) =>
          ev.tipo === anterior.nome ? { ...ev, tipo: limpo } : ev
        );
        setEventos(eventosRenomeados);
        persistirEventos(eventosRenomeados);
        if (tipoFiltro === anterior.nome) setTipoFiltro(limpo);
      }

      dbService.registarLog('Calendário Escolar', `Tipo de evento editado para "${limpo}".`, escola.id);
      notificar(`Tipo de evento "${limpo}" atualizado com sucesso.`);
    } else {
      const novo: TipoEventoCalendarioCustom = {
        id: `tipo-cal-${Date.now()}`,
        nome: limpo,
        cor: corTipoForm,
        criadoPor: currentUser.nomeCompleto,
        criadoEm: new Date().toISOString()
      };
      const atualizados = [...tiposCustom, novo];
      setTiposCustom(atualizados);
      persistirTiposCustom(atualizados);
      dbService.registarLog('Calendário Escolar', `Novo tipo de evento adicionado: "${limpo}".`, escola.id);
      notificar(`Tipo de evento "${limpo}" adicionado ao calendário.`);
    }

    setEditingTipoId(null);
    setNomeTipoForm('');
    setCorTipoForm('teal');
  };

  const handleConfirmarEliminarTipo = (tipoObj: TipoEventoCalendarioCustom) => {
    const atualizados = tiposCustom.filter((t) => t.id !== tipoObj.id);
    setTiposCustom(atualizados);
    persistirTiposCustom(atualizados);
    if (tipoFiltro === tipoObj.nome) setTipoFiltro('TODOS');
    setTipoParaEliminarConfirmId(null);
    dbService.registarLog('Calendário Escolar', `Tipo de evento "${tipoObj.nome}" eliminado.`, escola.id);
    notificar(`Tipo de evento "${tipoObj.nome}" removido.`);
  };

  const handleSalvarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    setErroModalEvento(null);
    if (!novoTitulo.trim() || !novaDataInicio) {
      setErroModalEvento('Preencha o título e a data de início do evento.');
      return;
    }
    if (novaDataFim && novaDataFim < novaDataInicio) {
      setErroModalEvento('A data de término não pode ser anterior à data de início.');
      return;
    }

    const existente = editingEventoId ? eventos.find(x => x.id === editingEventoId) : undefined;
    const registro: EventoCalendarioEscolar = {
      id: editingEventoId || `cal-evt-${Date.now()}`,
      titulo: novoTitulo.trim(),
      tipo: novoTipo,
      trimestre: novoTrimestre,
      dataInicio: novaDataInicio,
      dataFim: novaDataFim || undefined,
      descricao: novaDescricao.trim() || 'Evento agendado no calendário institucional da escola.',
      obrigatorioMED: existente ? existente.obrigatorioMED : false,
      publicoAlvo: novoPublico
    };

    const listaBase = editingEventoId
      ? eventos.map(x => (x.id === editingEventoId ? registro : x))
      : [...eventos, registro];

    const atualizados = [...listaBase].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
    setEventos(atualizados);
    persistirEventos(atualizados);
    dbService.registarLog(
      'Calendário Escolar',
      editingEventoId
        ? `Atividade do calendário editada (${registro.trimestre === 'Geral' ? 'Geral' : `${registro.trimestre}º Trim.` }): "${registro.titulo}".`
        : `Novo evento agendado (${registro.trimestre === 'Geral' ? 'Geral' : `${registro.trimestre}º Trim.` }): "${registro.titulo}" para ${registro.dataInicio}.`,
      escola.id
    );
    setShowNovoEventoModal(false);
    setEditingEventoId(null);
    setNovoTitulo('');
    setNovaDescricao('');
    notificar(editingEventoId ? `Atividade "${registro.titulo}" atualizada no calendário oficial.` : `Evento "${registro.titulo}" averbado no calendário oficial.`);
  };

  const confirmarEliminarEvento = () => {
    if (!eventoParaEliminar) return;
    const atualizados = eventos.filter(e => e.id !== eventoParaEliminar.id);
    setEventos(atualizados);
    persistirEventos(atualizados);
    dbService.registarLog('Calendário Escolar', `Atividade "${eventoParaEliminar.titulo}" removida do calendário escolar.`, escola.id);
    notificar(`Atividade "${eventoParaEliminar.titulo}" removida do calendário.`);
    setEventoParaEliminar(null);
  };

  const confirmarRestaurarPadraoMED = () => {
    const padrao = gerarEventosPadraoMED(escola.anoLectivoActivo);
    setEventos(padrao);
    persistirEventos(padrao);
    dbService.registarLog('Calendário Escolar', 'Calendário escolar restaurado para os marcos oficiais padrão do MED.', escola.id);
    setShowConfirmRestaurarPadrao(false);
    notificar('Calendário Escolar restaurado para o modelo oficial do MED.');
  };

  const [renderizarA4Offscreen, setRenderizarA4Offscreen] = useState(false);

  const handleBaixarCalendarioPDF = async () => {
    setRenderizarA4Offscreen(true);
    await new Promise<void>(resolve => setTimeout(resolve, 160));
    const el = document.getElementById('calendario-escolar-a4-pdf');
    if (el) {
      await downloadElementAsPdf(
        el,
        `Calendario_Escolar_${escola.anoLectivoActivo.replace(/[\/\s]/g, '_')}`,
        { orientation: 'portrait', format: 'a4' }
      );
      notificar('Calendário Escolar Oficial descarregado em PDF (.pdf) com sucesso.');
    }
  };

  const handleImprimirCalendarioDiretoA4 = async () => {
    setRenderizarA4Offscreen(true);
    await new Promise<void>(resolve => setTimeout(resolve, 160));
    const el = document.getElementById('calendario-escolar-a4-pdf');
    if (el) {
      imprimirElementoDiretamente(
        el,
        `Calendário Escolar Oficial - ${escola.nomeOficial}`,
        { orientation: 'portrait', format: 'a4' }
      );
    }
  };

  const handleImprimirCalendarioA4 = () => {
    const configSys = dbService.getConfiguracaoSistema();
    const insigniaSrc = (configSys?.insigniaNacionalUrl || '').trim() || DEFAULT_INSIGNIA_SVG_DATA_URL;
    const tituloDir = escola.diretorGeralGenero === 'F' ? 'A Directora Geral da Instituição' : 'O Director Geral da Instituição';
    const html = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>Calendário Escolar Oficial - ${escola.nomeOficial}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; line-height: 1.4; font-size: 10pt; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
          .insignia { width: 55px; height: 55px; margin: 0 auto 5px; }
          .insignia img { width: 52px; height: 52px; object-fit: contain; }
          .gov { font-size: 9pt; font-weight: bold; text-transform: uppercase; margin: 1px 0; color: #333; }
          .inst { font-size: 12pt; font-weight: 900; text-transform: uppercase; margin: 4px 0; color: #1e3a8a; }
          .sub { font-size: 10pt; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8.5pt; }
          th { background-color: #1e3a8a; color: #fff; padding: 6px 8px; text-align: left; text-transform: uppercase; font-size: 8pt; border: 1px solid #1e3a8a; }
          td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; }
          .badge-av { background-color: #dbeafe; color: #1e40af; }
          .badge-fer { background-color: #fee2e2; color: #991b1b; }
          .badge-pausa { background-color: #fef3c7; color: #92400e; }
          .badge-inst { background-color: #e0e7ff; color: #3730a3; }
          .badge-mat { background-color: #d1fae5; color: #065f46; }
          .footer { margin-top: 25px; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
          .sign-grid { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
          .sign-box { font-size: 9pt; }
          .sign-title { font-weight: bold; text-transform: uppercase; margin-bottom: 28px; }
          .sign-line { border-top: 1px solid #000; width: 200px; margin: 0 auto 4px; }
          .sign-name { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="insignia"><img src="${insigniaSrc}" alt="Insígnia da República de Angola" /></div>
          <div class="gov">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</div>
          <div class="gov">${escola.governoProvincial || 'GOVERNO PROVINCIAL'} • ${escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}</div>
          <div class="inst">${escola.nomeOficial}</div>
          <div class="sub">CALENDÁRIO ESCOLAR OFICIAL • ANO LECTIVO ${escola.anoLectivoActivo}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Período / Data</th>
              <th style="width: 12%;">Trimestre</th>
              <th style="width: 15%;">Tipo</th>
              <th style="width: 33%;">Atividade / Marco Normativo</th>
              <th style="width: 25%;">Descrição Operacional</th>
            </tr>
          </thead>
          <tbody>
            ${eventos.map(e => {
              const est = obterEstiloTipo(e.tipo);
              return `
              <tr>
                <td><strong>${formatarDataAngolana(e.dataInicio, 'curto')}</strong>${e.dataFim ? ` a ${formatarDataAngolana(e.dataFim, 'curto')}` : ''}</td>
                <td>${e.trimestre === 'Geral' ? 'Ano Todo' : `${e.trimestre}º Trimestre`}</td>
                <td>
                  <span class="badge" style="background-color: ${est.htmlBg}; color: ${est.htmlText};">
                    ${e.tipo}
                  </span>
                </td>
                <td><strong>${e.titulo}</strong></td>
                <td>${e.descricao}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <div class="sign-grid">
          <div class="sign-box">
            <div class="sign-title">${tituloDir}</div>
            <div class="sign-line"></div>
            <div class="sign-name">${escola.diretorGeralNome || 'Diretor Geral'}</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">O Subdirector Pedagógico</div>
            <div class="sign-line"></div>
            <div class="sign-name">${escola.subdiretorPedagogicoNome || 'Subdiretor Pedagógico'}</div>
          </div>
        </div>

        <div class="footer">
          Documento oficial homologado pela Direção Geral da Instituição conforme o Despacho do Ministério da Educação (MED).
        </div>
      </body>
      </html>
    `;
    downloadHtmlDocument(
      `Calendario_Escolar_${escola.anoLectivoActivo.replace(/[\/\s]/g, '_')}.html`,
      `Calendário Escolar Oficial - ${escola.nomeOficial}`,
      html
    );
    notificar('Calendário Escolar Oficial descarregado em HTML com sucesso.');
  };

  const eventosFiltrados = eventos.filter(e => {
    const matchTrim = trimestreSelecionado === 'TODOS' || e.trimestre === trimestreSelecionado;
    const matchTipo = tipoFiltro === 'TODOS' || e.tipo === tipoFiltro;
    const matchBusca = e.titulo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      e.descricao.toLowerCase().includes(termoBusca.toLowerCase());
    return matchTrim && matchTipo && matchBusca;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Banner Oficial do Calendário MED */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Cronograma Oficial • Ministério da Educação (MED)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Calendário Escolar Oficial {escola.anoLectivoActivo}
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
              Estrutura curricular unificada dos Iº, IIº e IIIº Trimestres: Provas do Professor, Provas Trimestrais, Exames de Ciclo, Conselhos de Turma e Feriados Nacionais de Angola.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-blue-200">
              <span>Trimestre Ativo: <strong className="text-amber-400">{escola.trimestreActivo}º Trimestre</strong></span>
              <span>•</span>
              <span>Instituição: <strong className="text-white">{escola.nomeOficial}</strong></span>
              <span>•</span>
              <span>Total de Marcos Registados: <strong className="text-white">{eventos.length}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {podeEditarCalendario && (
              <>
                <button
                  type="button"
                  onClick={() => abrirModalNovoEvento()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Marco Escolar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTipoId(null);
                    setNomeTipoForm('');
                    setCorTipoForm('teal');
                    setErroTipoForm(null);
                    setTipoParaEliminarConfirmId(null);
                    setShowGerirTiposModal(true);
                  }}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg transition-all cursor-pointer"
                  title="Adicionar, editar ou eliminar tipos de eventos do calendário"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>Tipos de Eventos ({todosTiposEventos.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmRestaurarPadrao(true)}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  title="Repor os feriados e marcos normativos padrão do MED"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restaurar Padrão MED</span>
                </button>
              </>
            )}
            <button
              onClick={handleBaixarCalendarioPDF}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Baixar PDF (.pdf)</span>
            </button>
            <button
              onClick={handleImprimirCalendarioDiretoA4}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir A4</span>
            </button>
            <button
              onClick={handleImprimirCalendarioA4}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span>HTML</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cartões dos 3 Trimestres com Gestão Direta por Trimestre */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            trim: '1' as const,
            titulo: 'Iº Trimestre Letivo',
            periodo: 'Setembro a Dezembro',
            corWrapAtivo: 'bg-blue-50/70 border-blue-400 shadow-sm ring-2 ring-blue-500/20',
            corTitle: 'text-blue-900',
            corBadge: 'bg-blue-700 text-white',
            corBtn: 'bg-blue-100 hover:bg-blue-200 text-blue-900'
          },
          {
            trim: '2' as const,
            titulo: 'IIº Trimestre Letivo',
            periodo: 'Janeiro a Março',
            corWrapAtivo: 'bg-indigo-50/70 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20',
            corTitle: 'text-indigo-900',
            corBadge: 'bg-indigo-700 text-white',
            corBtn: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900'
          },
          {
            trim: '3' as const,
            titulo: 'IIIº Trimestre Letivo',
            periodo: 'Abril a Julho',
            corWrapAtivo: 'bg-amber-50/70 border-amber-400 shadow-sm ring-2 ring-amber-500/20',
            corTitle: 'text-amber-900',
            corBadge: 'bg-amber-700 text-white',
            corBtn: 'bg-amber-100 hover:bg-amber-200 text-amber-900'
          }
        ].map(cfg => {
          const evtsTrim = eventos.filter(e => e.trimestre === cfg.trim);
          const isSelecionado = trimestreSelecionado === cfg.trim;
          return (
            <div
              key={cfg.trim}
              onClick={() => setTrimestreSelecionado(isSelecionado ? 'TODOS' : cfg.trim)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                escola.trimestreActivo === cfg.trim || isSelecionado
                  ? cfg.corWrapAtivo
                  : 'bg-white border-gray-200 shadow-xs hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black uppercase ${cfg.corTitle} tracking-wider`}>{cfg.titulo}</span>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-gray-800 border border-gray-300">
                    {evtsTrim.length} ativ.
                  </span>
                  {escola.trimestreActivo === cfg.trim && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.corBadge}`}>
                      Em Curso
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900">{cfg.periodo}</p>
              <ul className="text-xs text-gray-600 space-y-1 mt-3 min-h-[54px]">
                {evtsTrim.slice(0, 3).map(item => (
                  <li key={item.id} className="truncate">
                    • {item.titulo} ({formatarDataAngolana(item.dataInicio, 'curto')})
                  </li>
                ))}
                {evtsTrim.length === 0 && (
                  <li className="italic text-gray-400">Sem atividades registadas neste trimestre.</li>
                )}
              </ul>
              {podeEditarCalendario && (
                <div className="mt-3 pt-2.5 border-t border-gray-200/70 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-semibold">
                    {isSelecionado ? 'A filtrar este trimestre' : 'Clique para filtrar'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirModalNovoEvento(cfg.trim);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer ${cfg.corBtn}`}
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ {cfg.trim}º Trimestre</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar evento, feriado ou avaliação..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center space-x-1 bg-gray-100 p-1 rounded-xl">
            {(['TODOS', '1', '2', '3', 'Geral'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrimestreSelecionado(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  trimestreSelecionado === t
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t === 'TODOS' ? 'Todos Trimestres' : t === 'Geral' ? 'Ano Inteiro' : `${t}º Trim.`}
              </button>
            ))}
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
          >
            <option value="TODOS">Todos os Tipos</option>
            {todosTiposEventos.map((tp) => (
              <option key={tp.id} value={tp.nome}>
                {tp.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista / Timeline de Marcos do Calendário */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
          <span>Cronograma Oficial • {eventosFiltrados.length} Registos Listados</span>
          <span>Ano Letivo: {escola.anoLectivoActivo}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {eventosFiltrados.map((evt) => {
            const estiloTipo = obterEstiloTipo(evt.tipo);
            return (
            <div
              key={evt.id}
              className="p-5 hover:bg-blue-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-2xl shrink-0 ${estiloTipo.iconWrap}`}>
                  {evt.tipo === 'Avaliação' ? <Award className="h-5 w-5" /> :
                   evt.tipo === 'Feriado' ? <Flag className="h-5 w-5" /> :
                   evt.tipo === 'Matrícula' ? <Users className="h-5 w-5" /> : <CalendarIcon className="h-5 w-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-gray-900">{evt.titulo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estiloTipo.badge}`}>
                      {evt.tipo}
                    </span>
                    {evt.obrigatorioMED && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        Obrigatório MED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                    {evt.descricao}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500">
                    <span>Trimestre: <strong>{evt.trimestre === 'Geral' ? 'Anual' : `${evt.trimestre}º Trimestre`}</strong></span>
                    <span>•</span>
                    <span>Destinatários: <strong>{evt.publicoAlvo}</strong></span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right shrink-0 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl flex sm:flex-col items-center sm:items-end justify-between gap-2">
                <div>
                  <span className="text-xs font-black text-gray-900 block">
                    {formatarDataAngolana(evt.dataInicio, 'extenso')}
                  </span>
                  {evt.dataFim && evt.dataFim !== evt.dataInicio && (
                    <span className="text-[11px] text-gray-500 block">
                      até {formatarDataAngolana(evt.dataFim, 'extenso')}
                    </span>
                  )}
                </div>
                {podeEditarCalendario && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => abrirModalEditarEvento(evt)}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                      title="Editar atividade do calendário"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventoParaEliminar(evt)}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                      title="Eliminar atividade do calendário"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}

          {eventosFiltrados.length === 0 && (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <CalendarDays className="h-8 w-8 mx-auto text-gray-400" />
              <p className="font-bold text-sm">Nenhum evento localizado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NOVO / EDITAR EVENTO */}
      {showNovoEventoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingEventoId ? 'Editar Atividade do Calendário Escolar' : 'Novo Marco no Calendário Escolar'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingEventoId ? 'Atualizar datas, trimestre, público ou descrição da atividade' : 'Agendar evento letivo, feriado ou semana de provas'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowNovoEventoModal(false);
                  setEditingEventoId(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEvento} className="space-y-4 text-xs">
              {erroModalEvento && (
                <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span>{erroModalEvento}</span>
                  <button type="button" onClick={() => setErroModalEvento(null)} className="text-red-600 hover:text-red-800"><X className="h-4 w-4" /></button>
                </div>
              )}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Título do Evento / Atividade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Feira de Ciências e Projetos Tecnológicos"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Tipo de Evento *</label>
                    <button
                      type="button"
                      onClick={() => setMostrarCriacaoRapidaTipo(!mostrarCriacaoRapidaTipo)}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{mostrarCriacaoRapidaTipo ? 'Fechar' : 'Novo Tipo'}</span>
                    </button>
                  </div>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    {todosTiposEventos.map((tp) => (
                      <option key={tp.id} value={tp.nome}>
                        {tp.nome}
                      </option>
                    ))}
                    {!todosTiposEventos.some((t) => t.nome === novoTipo) && novoTipo && (
                      <option value={novoTipo}>{novoTipo}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Trimestre Letivo *</label>
                  <select
                    value={novoTrimestre}
                    onChange={(e) => setNovoTrimestre(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="1">1º Trimestre</option>
                    <option value="2">2º Trimestre</option>
                    <option value="3">3º Trimestre</option>
                    <option value="Geral">Ano Inteiro (Geral)</option>
                  </select>
                </div>
              </div>

              {mostrarCriacaoRapidaTipo && (
                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-950">Adicionar Novo Tipo de Evento</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Olimpíada, Reunião de Pais..."
                      value={nomeNovoTipoRapido}
                      onChange={(e) => setNomeNovoTipoRapido(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <select
                      value={corNovoTipoRapido}
                      onChange={(e) => setCorNovoTipoRapido(e.target.value as TipoEventoCalendarioCor)}
                      className="px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white text-xs"
                    >
                      {(Object.keys(CORES_EVENTO_MAP) as TipoEventoCalendarioCor[]).map((c) => (
                        <option key={c} value={c}>{CORES_EVENTO_MAP[c].label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdicionarTipoRapido}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Criar Tipo
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={novaDataInicio}
                    onChange={(e) => setNovaDataInicio(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data de Término (Opcional)</label>
                  <input
                    type="date"
                    value={novaDataFim}
                    onChange={(e) => setNovaDataFim(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Destinatários</label>
                <select
                  value={novoPublico}
                  onChange={(e) => setNovoPublico(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="Geral">Toda a Comunidade Escolar</option>
                  <option value="Professores">Professores</option>
                  <option value="Alunos">Alunos</option>
                  <option value="Encarregados">Encarregados de Educação</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição Operacional</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a realização da atividade..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNovoEventoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{editingEventoId ? 'Guardar Alterações' : 'Averbar no Calendário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERIR TIPOS PERSONALIZADOS DE EVENTOS */}
      {showGerirTiposModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Gerir Tipos de Eventos do Calendário</h3>
                  <p className="text-xs text-gray-500">Crie, edite ou remova categorias próprias da instituição</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGerirTiposModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarTipoModal} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <h4 className="font-black text-slate-900">
                {editingTipoId ? 'Editar Tipo Personalizado' : 'Adicionar Novo Tipo Personalizado'}
              </h4>
              {erroTipoForm && (
                <div className="p-2 bg-red-50 border border-red-300 text-red-800 rounded-lg font-bold">
                  {erroTipoForm}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Nome do Tipo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Feira Científica, Desporto Escolar..."
                    value={nomeTipoForm}
                    onChange={(e) => setNomeTipoForm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cor da Etiqueta</label>
                  <select
                    value={corTipoForm}
                    onChange={(e) => setCorTipoForm(e.target.value as TipoEventoCalendarioCor)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white"
                  >
                    {(Object.keys(CORES_EVENTO_MAP) as TipoEventoCalendarioCor[]).map((c) => (
                      <option key={c} value={c}>{CORES_EVENTO_MAP[c].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                {editingTipoId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTipoId(null);
                      setNomeTipoForm('');
                      setCorTipoForm('teal');
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{editingTipoId ? 'Atualizar Tipo' : 'Adicionar Tipo'}</span>
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase text-gray-500">Tipos Personalizados ({tiposCustom.length})</div>
              {tiposCustom.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl">
                  Ainda não adicionou tipos personalizados além dos 6 padrões oficiais do MED.
                </div>
              ) : (
                tiposCustom.map((tp) => {
                  const est = CORES_EVENTO_MAP[tp.cor] || CORES_EVENTO_MAP.indigo;
                  const emConfirm = tipoParaEliminarConfirmId === tp.id;
                  return (
                    <div key={tp.id} className="p-3 border border-gray-200 rounded-xl flex items-center justify-between gap-2 bg-white">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`h-3 w-3 rounded-full shrink-0 ${est.swatch}`} />
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold truncate ${est.badge}`}>
                          {tp.nome}
                        </span>
                      </div>
                      {emConfirm ? (
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="text-[11px] text-rose-700 font-bold">Confirmar?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmarEliminarTipo(tp)}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setTipoParaEliminarConfirmId(null)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTipoId(tp.id);
                              setNomeTipoForm(tp.nome);
                              setCorTipoForm(tp.cor);
                              setErroTipoForm(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTipoParaEliminarConfirmId(tp.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              <div className="pt-2 text-[11px] font-bold uppercase text-gray-500">Tipos Padrão Oficiais (MED)</div>
              <div className="flex flex-wrap gap-2">
                {TIPOS_EVENTO_PADRAO.map((tp) => {
                  const est = CORES_EVENTO_MAP[tp.cor];
                  return (
                    <span key={tp.id} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${est.badge}`}>
                      {tp.nome}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowGerirTiposModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAÇÃO DE ATIVIDADE */}
      {eventoParaEliminar && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900">Eliminar Atividade do Calendário</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Tem a certeza de que pretende eliminar <strong>"{eventoParaEliminar.titulo}"</strong> do calendário escolar? Esta ação pode ser revertida mais tarde através de "Restaurar Padrão MED".
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEventoParaEliminar(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarEvento}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Confirmar Eliminação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR RESTAURO DO CALENDÁRIO MED */}
      {showConfirmRestaurarPadrao && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center space-x-2 text-blue-700">
              <RotateCcw className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900">Restaurar Calendário Padrão MED</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Esta operação irá repor os marcos normativos oficiais do Ministério da Educação para o ano letivo <strong>{escola.anoLectivoActivo}</strong>. Atividades personalizadas adicionadas serão substituídas pelo modelo oficial.
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowConfirmRestaurarPadrao(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRestaurarPadraoMED}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl cursor-pointer"
              >
                Restaurar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT OFFSCREEN PARA PDF / IMPRESSÃO A4 DO CALENDÁRIO */}
      {renderizarA4Offscreen && (
        <div
          id="calendario-escolar-a4-pdf"
          style={{ position: 'fixed', left: '-10000px', top: 0, opacity: 1, width: '794px' }}
          className="bg-white p-8 text-black space-y-4"
        >
          <div className="text-center space-y-1 border-b-2 border-blue-900 pb-3">
            <div className="flex justify-center mb-1">
              <InsigniaAngola size={48} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</p>
            <p className="text-[9.5px] font-bold uppercase text-gray-700">
              {escola.governoProvincial || 'GOVERNO PROVINCIAL'} • {escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}
            </p>
            <h2 className="text-sm font-black uppercase text-blue-950">{escola.nomeOficial}</h2>
            <p className="text-xs font-bold uppercase pt-1">CALENDÁRIO ESCOLAR OFICIAL • ANO LECTIVO {escola.anoLectivoActivo}</p>
          </div>

          <table className="w-full border-collapse border border-gray-400 text-[10px]">
            <thead>
              <tr className="bg-blue-900 text-white uppercase font-bold text-[9px]">
                <th className="p-1.5 border border-blue-900 text-left w-28">Período / Data</th>
                <th className="p-1.5 border border-blue-900 text-center w-20">Trimestre</th>
                <th className="p-1.5 border border-blue-900 text-center w-24">Tipo</th>
                <th className="p-1.5 border border-blue-900 text-left">Atividade / Marco Normativo</th>
                <th className="p-1.5 border border-blue-900 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((evt, idx) => (
                <tr key={evt.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="p-1.5 border border-gray-300 font-bold">
                    {formatarDataAngolana(evt.dataInicio, 'curto')}
                    {evt.dataFim && evt.dataFim !== evt.dataInicio ? ` a ${formatarDataAngolana(evt.dataFim, 'curto')}` : ''}
                  </td>
                  <td className="p-1.5 border border-gray-300 text-center">
                    {evt.trimestre === 'Geral' ? 'Anual' : `${evt.trimestre}º Trim.`}
                  </td>
                  <td className="p-1.5 border border-gray-300 text-center font-bold">{evt.tipo}</td>
                  <td className="p-1.5 border border-gray-300 font-bold">{evt.titulo}</td>
                  <td className="p-1.5 border border-gray-300 text-gray-700">{evt.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs items-end">
            <div className="flex flex-col items-center">
              <p className="font-bold uppercase">
                {escola.diretorGeralGenero === 'F' ? 'A Directora Geral da Instituição' : 'O Director Geral da Instituição'}
              </p>
              <div className="h-8" />
              <div className="w-48 border-b border-black my-1" />
              <p className="font-bold uppercase">{escola.diretorGeralNome || 'Direcção da Escola'}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-bold uppercase">O Subdirector Pedagógico</p>
              <div className="h-8" />
              <div className="w-48 border-b border-black my-1" />
              <p className="font-bold uppercase">{escola.subdiretorPedagogicoNome || 'Subdirecção Pedagógica'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
