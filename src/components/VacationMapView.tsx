import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Edit3,
  Trash2,
  Printer,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Users
} from 'lucide-react';
import {
  Escola,
  Funcionario,
  MapaFeriasItem,
  CategoriaGrupoFerias,
  EstadoFeriasItem
} from '../types';
import { dbService } from '../services/storage';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { InsigniaAngola } from '../constants/insignia';
import {
  obterNomeDiretorGeral,
  obterTituloDiretorSimples,
  obterNomeSubdiretorAdministrativo,
  obterTituloSubdiretorAdministrativo
} from '../utils/directorHelper';
import { formatarDataAngolana, hojeAngolano, MESES_ANGOLA } from '../utils/dateFormat';

interface VacationMapViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
}

const ROLES_ADMINISTRATIVOS = new Set([
  'SubdiretorAdministrativo',
  'SubdirectorAdministrativo',
  'ChefeSecretaria',
  'Secretario',
  'SecretarioEscolar',
  'Secretaria',
  'Tesoureiro',
  'Bibliotecario',
  'TecnicoTI',
  'Estagiario'
]);

const ROLES_AUXILIAR_LIMPEZA = new Set(['AuxiliarLimpeza']);

const ESTADOS_FERIAS: { value: EstadoFeriasItem; label: string; badge: string }[] = [
  { value: 'Planeada', label: 'Planeada', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  { value: 'Aprovada', label: 'Aprovada', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' },
  { value: 'Em_Curso', label: 'Em Curso', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
  { value: 'Concluida', label: 'Concluída', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200' },
  { value: 'Adiada', label: 'Adiada', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  { value: 'Cancelada', label: 'Cancelada', badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' }
];

function classificarGrupoFuncionario(f: Funcionario): CategoriaGrupoFerias | null {
  if (ROLES_AUXILIAR_LIMPEZA.has(f.role)) return 'AuxiliarLimpeza';
  const cargoNorm = (f.cargo || '').toLowerCase();
  if (cargoNorm.includes('limpeza') || cargoNorm.includes('servente') || cargoNorm.includes('auxiliar')) {
    return 'AuxiliarLimpeza';
  }
  if (ROLES_ADMINISTRATIVOS.has(f.role)) return 'Administrativo';
  if (
    !f.ehProfessor &&
    (cargoNorm.includes('secret') ||
      cargoNorm.includes('admin') ||
      cargoNorm.includes('tesour') ||
      cargoNorm.includes('bibliot') ||
      cargoNorm.includes('inform'))
  ) {
    return 'Administrativo';
  }
  return null;
}

function calcularDiasUteis(inicioIso: string, fimIso: string): number {
  if (!inicioIso || !fimIso) return 0;
  const d1 = new Date(`${inicioIso}T00:00:00`);
  const d2 = new Date(`${fimIso}T00:00:00`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 0;
  let count = 0;
  const cur = new Date(d1);
  while (cur <= d2 && count < 366) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function derivarMesPrevisto(inicioIso: string): string {
  if (!inicioIso) return 'Janeiro';
  const parts = inicioIso.split('-');
  const mesIdx = parseInt(parts[1] || '1', 10) - 1;
  return MESES_ANGOLA[mesIdx] || parts[1] || '—';
}

export const VacationMapView: React.FC<VacationMapViewProps> = ({ escola, currentUser, funcionarios }) => {
  const [anoFiltro, setAnoFiltro] = useState<string>(escola.anoLectivoActivo || '');
  const [grupoFiltro, setGrupoFiltro] = useState<'Todos' | CategoriaGrupoFerias>('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState<'Todos' | EstadoFeriasItem>('Todos');
  const [busca, setBusca] = useState('');
  const [orientacaoPdf, setOrientacaoPdf] = useState<'portrait' | 'landscape'>('landscape');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [registos, setRegistos] = useState<MapaFeriasItem[]>(() => dbService.getMapasFerias(escola.id));
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modal Criar/Editar
  const [showModal, setShowModal] = useState(false);
  const [itemEdicao, setItemEdicao] = useState<MapaFeriasItem | null>(null);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [substitutoId, setSubstitutoId] = useState('');
  const [estado, setEstado] = useState<EstadoFeriasItem>('Planeada');
  const [observacoes, setObservacoes] = useState('');
  const [confirmarRemoverId, setConfirmarRemoverId] = useState<string | null>(null);

  const podeGerirFerias = [
    'AdminGeral',
    'DiretorGeral',
    'SubdiretorAdministrativo',
    'SubdirectorAdministrativo',
    'ChefeSecretaria'
  ].includes(currentUser.role);

  const recarregar = () => {
    setRegistos(dbService.getMapasFerias(escola.id));
  };

  useEffect(() => {
    recarregar();
    const handler = () => recarregar();
    window.addEventListener('sge_dados_atualizados_remoto', handler);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', handler);
  }, [escola.id]);

  const anosDisponiveis = useMemo(() => {
    const anos = dbService.getAnosLectivos(escola.id);
    if (escola.anoLectivoActivo && !anos.includes(escola.anoLectivoActivo)) {
      anos.unshift(escola.anoLectivoActivo);
    }
    return anos;
  }, [escola.id, escola.anoLectivoActivo]);

  // Funcionários elegíveis (Administrativos + Auxiliares de Limpeza)
  const funcionariosElegiveis = useMemo(() => {
    return funcionarios
      .filter(f => f.escolaId === escola.id && f.ativo !== false)
      .map(f => ({ func: f, grupo: classificarGrupoFuncionario(f) }))
      .filter((x): x is { func: Funcionario; grupo: CategoriaGrupoFerias } => x.grupo !== null)
      .sort((a, b) => a.func.nomeCompleto.localeCompare(b.func.nomeCompleto, 'pt-AO'));
  }, [funcionarios, escola.id]);

  const registosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return registos.filter(r => {
      if (anoFiltro && anoFiltro !== 'todos' && r.anoLectivo !== anoFiltro) return false;
      if (grupoFiltro !== 'Todos' && r.grupoCategoria !== grupoFiltro) return false;
      if (estadoFiltro !== 'Todos' && r.estado !== estadoFiltro) return false;
      if (
        q &&
        !r.funcionarioNome.toLowerCase().includes(q) &&
        !(r.numeroAgente || '').toLowerCase().includes(q) &&
        !r.cargo.toLowerCase().includes(q) &&
        !(r.substitutoNome || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [registos, anoFiltro, grupoFiltro, estadoFiltro, busca]);

  // Detectar sobreposições no mesmo grupo ou com o substituto
  const conflitosMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const ativos = registosFiltrados.filter(r => r.estado !== 'Cancelada');
    for (let i = 0; i < ativos.length; i++) {
      const a = ativos[i];
      for (let j = i + 1; j < ativos.length; j++) {
        const b = ativos[j];
        const sobrepoe = a.dataInicio <= b.dataFim && b.dataInicio <= a.dataFim;
        if (!sobrepoe) continue;
        if (a.funcionarioId === b.funcionarioId) {
          map.set(a.id, [...(map.get(a.id) || []), `Duplicação de período com outro registo do mesmo funcionário`]);
          map.set(b.id, [...(map.get(b.id) || []), `Duplicação de período com outro registo do mesmo funcionário`]);
        } else if (a.substitutoId && a.substitutoId === b.funcionarioId) {
          map.set(a.id, [...(map.get(a.id) || []), `Substituto (${a.substitutoNome}) também em férias neste período`]);
        } else if (b.substitutoId && b.substitutoId === a.funcionarioId) {
          map.set(b.id, [...(map.get(b.id) || []), `Substituto (${b.substitutoNome}) também em férias neste período`]);
        } else if (a.grupoCategoria === b.grupoCategoria) {
          map.set(a.id, [...(map.get(a.id) || []), `Coincide com ${b.funcionarioNome} (${b.grupoCategoria === 'AuxiliarLimpeza' ? 'Limpeza' : 'Admin'})`]);
          map.set(b.id, [...(map.get(b.id) || []), `Coincide com ${a.funcionarioNome} (${a.grupoCategoria === 'AuxiliarLimpeza' ? 'Limpeza' : 'Admin'})`]);
        }
      }
    }
    return map;
  }, [registosFiltrados]);

  const mostrarToast = (tipo: 'sucesso' | 'erro', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 5000);
  };

  const abrirModalNovo = () => {
    setItemEdicao(null);
    setFuncionarioId(funcionariosElegiveis[0]?.func.id || '');
    const hoje = new Date();
    const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 22);
    setDataInicio(proxMes.toISOString().split('T')[0]);
    setDataFim(fimMes.toISOString().split('T')[0]);
    setSubstitutoId('');
    setEstado('Planeada');
    setObservacoes('');
    setShowModal(true);
  };

  const abrirModalEditar = (item: MapaFeriasItem) => {
    setItemEdicao(item);
    setFuncionarioId(item.funcionarioId);
    setDataInicio(item.dataInicio);
    setDataFim(item.dataFim);
    setSubstitutoId(item.substitutoId || '');
    setEstado(item.estado);
    setObservacoes(item.observacoes || '');
    setShowModal(true);
  };

  const diasUteisForm = useMemo(() => calcularDiasUteis(dataInicio, dataFim), [dataInicio, dataFim]);

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    const selecionado = funcionariosElegiveis.find(x => x.func.id === funcionarioId);
    if (!selecionado) {
      mostrarToast('erro', 'Selecione um funcionário administrativo ou auxiliar de limpeza.');
      return;
    }
    if (!dataInicio || !dataFim || dataFim < dataInicio) {
      mostrarToast('erro', 'A data de término deve ser igual ou posterior à data de início.');
      return;
    }
    const substituto = funcionariosElegiveis.find(x => x.func.id === substitutoId)?.func;
    const agora = new Date().toISOString();

    const item: MapaFeriasItem = {
      id: itemEdicao?.id || `ferias-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      anoLectivo: itemEdicao?.anoLectivo || (anoFiltro !== 'todos' ? anoFiltro : escola.anoLectivoActivo),
      funcionarioId: selecionado.func.id,
      funcionarioNome: selecionado.func.nomeCompleto,
      numeroAgente: selecionado.func.numeroAgente || undefined,
      cargo: selecionado.func.cargo,
      role: selecionado.func.role,
      grupoCategoria: selecionado.grupo,
      mesPrevisto: derivarMesPrevisto(dataInicio),
      dataInicio,
      dataFim,
      diasUteis: diasUteisForm,
      substitutoId: substituto?.id,
      substitutoNome: substituto?.nomeCompleto,
      estado,
      observacoes: observacoes.trim() || undefined,
      criadoPorId: itemEdicao?.criadoPorId || currentUser.id,
      criadoPorNome: itemEdicao?.criadoPorNome || currentUser.nomeCompleto,
      aprovadoPorNome: estado === 'Aprovada' ? currentUser.nomeCompleto : itemEdicao?.aprovadoPorNome,
      criadoEm: itemEdicao?.criadoEm || agora,
      atualizadoEm: agora
    };

    dbService.salvarMapaFerias(item);
    recarregar();
    setShowModal(false);
    mostrarToast('sucesso', itemEdicao ? 'Férias atualizadas no mapa anual!' : 'Férias registadas no mapa anual!');
  };

  const handleConfirmarRemover = () => {
    if (!confirmarRemoverId) return;
    dbService.eliminarMapaFerias(confirmarRemoverId);
    setConfirmarRemoverId(null);
    recarregar();
    mostrarToast('sucesso', 'Registo removido do Mapa de Férias.');
  };

  const handleExportarExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = registosFiltrados.map((r, idx) => ({
        'Nº': idx + 1,
        'Ano Lectivo': r.anoLectivo,
        'Nº de Agente': r.numeroAgente || '—',
        'Funcionário': r.funcionarioNome,
        'Grupo': r.grupoCategoria === 'AuxiliarLimpeza' ? 'Auxiliar de Limpeza' : 'Pessoal Administrativo',
        'Cargo / Função': r.cargo,
        'Mês Previsto': r.mesPrevisto,
        'Data Início': r.dataInicio,
        'Data Fim': r.dataFim,
        'Dias Úteis': r.diasUteis,
        'Substituto Designado': r.substitutoNome || '—',
        'Estado': r.estado.replace('_', ' '),
        'Observações': r.observacoes || ''
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Mapa_Ferias');
      const sigla = (escola.sigla || 'Escola').replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `Mapa_Ferias_${sigla}_${(anoFiltro || 'Anual').replace('/', '-')}.xlsx`);
      mostrarToast('sucesso', 'Mapa de Férias exportado em Excel com sucesso!');
    } catch (err: any) {
      mostrarToast('erro', `Erro ao gerar Excel: ${err?.message || 'Tente novamente'}`);
    }
  };

  const handleBaixarPdf = async () => {
    const el = document.getElementById('mapa-ferias-print');
    if (!el || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const sigla = (escola.sigla || 'SGE').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsPdf(el, `Mapa_Ferias_${sigla}_${(anoFiltro || 'Anual').replace('/', '-')}.pdf`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
      mostrarToast('sucesso', 'Mapa de Férias descarregado em PDF!');
    } catch {
      imprimirElementoDiretamente(el, `Mapa de Férias - ${escola.nomeOficial}`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImprimir = () => {
    const el = document.getElementById('mapa-ferias-print');
    if (el) {
      imprimirElementoDiretamente(el, `Mapa de Férias - ${escola.nomeOficial}`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
    }
  };

  const nomeDiretor = obterNomeDiretorGeral(escola, funcionarios);
  const tituloDiretor = obterTituloDiretorSimples(escola, funcionarios);
  const nomeSubAdmin = obterNomeSubdiretorAdministrativo(escola, funcionarios);
  const tituloSubAdmin = obterTituloSubdiretorAdministrativo(escola, funcionarios);

  const countAdmin = registosFiltrados.filter(r => r.grupoCategoria === 'Administrativo').length;
  const countLimpeza = registosFiltrados.filter(r => r.grupoCategoria === 'AuxiliarLimpeza').length;
  const countAprovadas = registosFiltrados.filter(r => r.estado === 'Aprovada' || r.estado === 'Em_Curso').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm no-print border ${
            toast.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{toast.texto}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer px-2 font-black">✕</button>
        </div>
      )}

      {/* Cabeçalho e Filtros */}
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 rounded-2xl p-5 sm:p-6 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Mapa de Férias — Pessoal Administrativo & Auxiliares de Limpeza
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Planificação anual, designação de substitutos, deteção automática de sobreposições e emissão oficial em PDF e Excel.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrientacaoPdf('portrait')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  orientacaoPdf === 'portrait' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Retrato
              </button>
              <button
                type="button"
                onClick={() => setOrientacaoPdf('landscape')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  orientacaoPdf === 'landscape' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Paisagem
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportarExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={isExportingPdf}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {podeGerirFerias && (
              <button
                type="button"
                onClick={abrirModalNovo}
                disabled={funcionariosElegiveis.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Agendar Férias</span>
              </button>
            )}
          </div>
        </div>

        {/* Cartões Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Elegíveis na Escola</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{funcionariosElegiveis.length}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Administrativos no Mapa</div>
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 mt-0.5">{countAdmin}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase">Auxiliares de Limpeza</div>
            <div className="text-2xl font-black text-teal-900 dark:text-teal-100 mt-0.5">{countLimpeza}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Aprovadas / Em Curso</div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">{countAprovadas}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Nome, nº de agente, cargo..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <select
            value={anoFiltro}
            onChange={e => setAnoFiltro(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
          >
            <option value="todos">Todos os Anos Lectivos</option>
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
          <select
            value={grupoFiltro}
            onChange={e => setGrupoFiltro(e.target.value as any)}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
          >
            <option value="Todos">Todos os Grupos (Admin + Limpeza)</option>
            <option value="Administrativo">Pessoal Administrativo</option>
            <option value="AuxiliarLimpeza">Auxiliares de Limpeza</option>
          </select>
          <select
            value={estadoFiltro}
            onChange={e => setEstadoFiltro(e.target.value as any)}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
          >
            <option value="Todos">Todos os Estados</option>
            {ESTADOS_FERIAS.map(est => (
              <option key={est.value} value={est.value}>{est.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela Interativa */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden no-print">
        {registosFiltrados.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Users className="w-10 h-10 text-indigo-500 mx-auto opacity-60" />
            <h3 className="text-sm font-black text-slate-800 dark:text-white">
              Nenhum período de férias agendado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {funcionariosElegiveis.length === 0
                ? 'Registe primeiro funcionários com perfil Administrativo ou Auxiliar de Limpeza em Recursos Humanos para criar o Mapa de Férias.'
                : 'A Direcção pode agendar períodos de férias anuais para o pessoal administrativo e auxiliares de limpeza.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-black border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Funcionário / Nº Agente</th>
                  <th className="p-3">Grupo / Cargo</th>
                  <th className="p-3">Período de Férias</th>
                  <th className="p-3 text-center">Dias Úteis</th>
                  <th className="p-3">Substituto</th>
                  <th className="p-3 text-center">Estado</th>
                  {podeGerirFerias && <th className="p-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {registosFiltrados.map(item => {
                  const badgeObj = ESTADOS_FERIAS.find(e => e.value === item.estado) || ESTADOS_FERIAS[0];
                  const conflitos = conflitosMap.get(item.id) || [];
                  const ehProprio = item.funcionarioId === currentUser.id;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
                        ehProprio ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{item.funcionarioNome}</span>
                          {ehProprio && (
                            <span className="px-1.5 py-0.5 text-[9px] rounded bg-indigo-600 text-white uppercase">Você</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Agente: {item.numeroAgente || '—'}
                        </div>
                        {conflitos.length > 0 && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{conflitos[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black mb-1 ${
                            item.grupoCategoria === 'AuxiliarLimpeza'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200'
                          }`}
                        >
                          {item.grupoCategoria === 'AuxiliarLimpeza' ? 'Auxiliar de Limpeza' : 'Administrativo'}
                        </span>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">{item.cargo}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {formatarDataAngolana(item.dataInicio)} → {formatarDataAngolana(item.dataFim)}
                        </div>
                        <div className="text-[11px] text-slate-500">Mês: {item.mesPrevisto} • {item.anoLectivo}</div>
                      </td>
                      <td className="p-3 text-center font-black text-slate-900 dark:text-white">
                        {item.diasUteis} dias
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{item.substitutoNome || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${badgeObj.badge}`}>
                          {badgeObj.label}
                        </span>
                      </td>
                      {podeGerirFerias && (
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => abrirModalEditar(item)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer"
                              title="Editar / Aprovar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarRemoverId(item.id)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documento Oficial para Impressão / PDF */}
      <div className="mt-6">
        <div
          id="mapa-ferias-print"
          className="bg-white text-slate-900 border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm max-w-5xl mx-auto"
        >
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
            <InsigniaAngola className="w-12 h-12 mx-auto mb-2" />
            <div className="text-[11px] font-bold uppercase tracking-wider">República de Angola</div>
            <div className="text-[11px] font-bold uppercase">Ministério da Educação</div>
            <div className="text-sm font-black uppercase mt-1">{escola.nomeOficial}</div>
            <h2 className="text-base font-black uppercase tracking-wide mt-2">
              MAPA ANUAL DE FÉRIAS — PESSOAL ADMINISTRATIVO E AUXILIARES DE LIMPEZA
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Ano Lectivo: {anoFiltro === 'todos' ? escola.anoLectivoActivo : anoFiltro} • Emitido em {hojeAngolano('extenso')}
            </p>
          </div>

          <table className="w-full border-collapse border border-slate-700 text-[11px] mb-8">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 p-2 w-8 text-center">Nº</th>
                <th className="border border-slate-700 p-2 text-left">Nº Agente</th>
                <th className="border border-slate-700 p-2 text-left">Nome Completo</th>
                <th className="border border-slate-700 p-2 text-left">Grupo / Cargo</th>
                <th className="border border-slate-700 p-2 text-center">Mês</th>
                <th className="border border-slate-700 p-2 text-center">Início</th>
                <th className="border border-slate-700 p-2 text-center">Término</th>
                <th className="border border-slate-700 p-2 text-center">Dias Úteis</th>
                <th className="border border-slate-700 p-2 text-left">Substituto</th>
                <th className="border border-slate-700 p-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {registosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border border-slate-700 p-4 text-center text-slate-500">
                    Sem registos de férias para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                registosFiltrados.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="border border-slate-700 p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-700 p-1.5 font-mono">{r.numeroAgente || '—'}</td>
                    <td className="border border-slate-700 p-1.5 font-bold">{r.funcionarioNome}</td>
                    <td className="border border-slate-700 p-1.5">
                      {r.grupoCategoria === 'AuxiliarLimpeza' ? 'Limpeza' : 'Admin.'} — {r.cargo}
                    </td>
                    <td className="border border-slate-700 p-1.5 text-center">{r.mesPrevisto}</td>
                    <td className="border border-slate-700 p-1.5 text-center">{formatarDataAngolana(r.dataInicio)}</td>
                    <td className="border border-slate-700 p-1.5 text-center">{formatarDataAngolana(r.dataFim)}</td>
                    <td className="border border-slate-700 p-1.5 text-center font-bold">{r.diasUteis}</td>
                    <td className="border border-slate-700 p-1.5">{r.substitutoNome || '—'}</td>
                    <td className="border border-slate-700 p-1.5 text-center">{r.estado.replace('_', ' ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
            <div>
              <div className="font-bold uppercase">{tituloSubAdmin}</div>
              <div className="mt-10 border-t border-slate-800 pt-1 font-bold">{nomeSubAdmin}</div>
            </div>
            <div>
              <div className="font-bold uppercase">{tituloDiretor}</div>
              <div className="mt-10 border-t border-slate-800 pt-1 font-bold">{nomeDiretor}</div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL AGENDAR / EDITAR FÉRIAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-4 bg-indigo-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">
                {itemEdicao ? 'Editar Período de Férias' : 'Agendar Férias no Mapa Anual'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Funcionário (Administrativo ou Auxiliar de Limpeza) *
                </label>
                <select
                  required
                  value={funcionarioId}
                  onChange={e => setFuncionarioId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="">Selecione...</option>
                  {funcionariosElegiveis.map(({ func, grupo }) => (
                    <option key={func.id} value={func.id}>
                      {func.nomeCompleto} — {grupo === 'AuxiliarLimpeza' ? 'Auxiliar de Limpeza' : 'Administrativo'} ({func.cargo})
                      {func.numeroAgente ? ` [Ag: ${func.numeroAgente}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Término *</label>
                  <input
                    type="date"
                    required
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <span className="font-bold text-indigo-800 dark:text-indigo-200">
                  Mês Previsto: {derivarMesPrevisto(dataInicio)}
                </span>
                <span className="font-black text-indigo-900 dark:text-indigo-100">
                  {diasUteisForm} dias úteis calculados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Substituto Designado</label>
                  <select
                    value={substitutoId}
                    onChange={e => setSubstitutoId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Sem substituto designado</option>
                    {funcionariosElegiveis
                      .filter(x => x.func.id !== funcionarioId)
                      .map(({ func }) => (
                        <option key={func.id} value={func.id}>
                          {func.nomeCompleto} ({func.cargo})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                  <select
                    value={estado}
                    onChange={e => setEstado(e.target.value as EstadoFeriasItem)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    {ESTADOS_FERIAS.map(est => (
                      <option key={est.value} value={est.value}>{est.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Ex: Férias acumuladas, passagem de pastas ao substituto..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black cursor-pointer"
                >
                  Guardar no Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE ELIMINAÇÃO */}
      {confirmarRemoverId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Eliminar Registo de Férias?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tem a certeza de que pretende remover este agendamento do Mapa de Férias?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmarRemoverId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRemover}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
