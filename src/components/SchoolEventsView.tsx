import React, { useState } from 'react';
import {
  Plus,
  Search,
  Clock,
  MapPin,
  Users,
  CalendarDays,
  X,
  Edit3,
  Trash2,
  Download,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { Escola, Funcionario } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { formatarDataAngolana } from '../utils/dateFormat';

export interface EventoEscolar {
  id: string;
  escolaId: string;
  anoLectivo: string;
  titulo: string;
  categoria: 'Feriado' | 'Exame' | 'Reunião' | 'Pedagógico' | 'Extracurricular';
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string;
  hora?: string;
  local?: string;
  publicoAlvo: 'Toda a Comunidade' | 'Professores' | 'Encarregados' | 'Estudantes' | 'Direção';
  descricao?: string;
  concluido?: boolean;
}

const DEFAULT_EVENTOS: EventoEscolar[] = [];

interface SchoolEventsViewProps {
  escola: Escola;
  currentUser: Funcionario;
}

export const SchoolEventsView: React.FC<SchoolEventsViewProps> = ({
  escola,
  currentUser
}) => {
  const [eventos, setEventos] = useState<EventoEscolar[]>(() => {
    try {
      const stored = localStorage.getItem('sge_eventos_escolares');
      if (stored) {
        const parsed: EventoEscolar[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(e => e.escolaId !== 'esc-002');
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_EVENTOS;
  });

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [showModal, setShowModal] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoEscolar | null>(null);
  const [eventoParaEliminar, setEventoParaEliminar] = useState<EventoEscolar | null>(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Formulário de Evento
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState<EventoEscolar['categoria']>('Pedagógico');
  const [novaDataInicio, setNovaDataInicio] = useState('');
  const [novaDataFim, setNovaDataFim] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [novoLocal, setNovoLocal] = useState('');
  const [novoPublico, setNovoPublico] = useState<EventoEscolar['publicoAlvo']>('Toda a Comunidade');
  const [novaDescricao, setNovaDescricao] = useState('');

  const salvarEventosNaStorage = (novos: EventoEscolar[]) => {
    setEventos(novos);
    try {
      localStorage.setItem('sge_eventos_escolares', JSON.stringify(novos));
    } catch {
      // silent
    }
  };

  const abrirNovoEvento = () => {
    setEventoEditando(null);
    setNovoTitulo('');
    setNovaCategoria('Pedagógico');
    setNovaDataInicio('');
    setNovaDataFim('');
    setNovaHora('');
    setNovoLocal('');
    setNovoPublico('Toda a Comunidade');
    setNovaDescricao('');
    setShowModal(true);
  };

  const abrirEditarEvento = (evt: EventoEscolar) => {
    setEventoEditando(evt);
    setNovoTitulo(evt.titulo);
    setNovaCategoria(evt.categoria);
    setNovaDataInicio(evt.dataInicio);
    setNovaDataFim(evt.dataFim || '');
    setNovaHora(evt.hora || '');
    setNovoLocal(evt.local || '');
    setNovoPublico(evt.publicoAlvo);
    setNovaDescricao(evt.descricao || '');
    setShowModal(true);
  };

  const handleSalvarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !novaDataInicio) return;

    if (eventoEditando) {
      const atualizados = eventos.map(ev =>
        ev.id === eventoEditando.id
          ? {
              ...ev,
              titulo: novoTitulo.trim(),
              categoria: novaCategoria,
              dataInicio: novaDataInicio,
              dataFim: novaDataFim || undefined,
              hora: novaHora || undefined,
              local: novoLocal.trim() || 'Recinto Escolar',
              publicoAlvo: novoPublico,
              descricao: novaDescricao.trim() || undefined
            }
          : ev
      );
      salvarEventosNaStorage(atualizados);
      setFeedback({ tipo: 'sucesso', texto: `Evento "${novoTitulo.trim()}" atualizado com sucesso.` });
    } else {
      const novo: EventoEscolar = {
        id: `evt-${Date.now()}`,
        escolaId: escola.id,
        anoLectivo: escola.anoLectivoActivo,
        titulo: novoTitulo.trim(),
        categoria: novaCategoria,
        dataInicio: novaDataInicio,
        dataFim: novaDataFim || undefined,
        hora: novaHora || undefined,
        local: novoLocal.trim() || 'Recinto Escolar',
        publicoAlvo: novoPublico,
        descricao: novaDescricao.trim() || undefined,
        concluido: false
      };
      salvarEventosNaStorage([novo, ...eventos]);
      setFeedback({ tipo: 'sucesso', texto: `Evento "${novo.titulo}" agendado com sucesso.` });
    }

    setShowModal(false);
    setEventoEditando(null);
  };

  const handleToggleConcluido = (id: string) => {
    const atualizados = eventos.map(e => e.id === id ? { ...e, concluido: !e.concluido } : e);
    salvarEventosNaStorage(atualizados);
  };

  const handleConfirmarEliminar = () => {
    if (!eventoParaEliminar) return;
    const titulo = eventoParaEliminar.titulo;
    salvarEventosNaStorage(eventos.filter(e => e.id !== eventoParaEliminar.id));
    setEventoParaEliminar(null);
    setFeedback({ tipo: 'sucesso', texto: `Evento "${titulo}" eliminado.` });
  };

  // Filtragem estrita pela escola e ano ativo
  const eventosFiltrados = eventos.filter(e => {
    const matchEscola = !e.escolaId || e.escolaId === escola.id;
    const matchAno = !e.anoLectivo || e.anoLectivo === escola.anoLectivoActivo;
    const matchCat = categoriaFiltro === 'TODAS' || e.categoria === categoriaFiltro;
    const matchBusca =
      !busca ||
      e.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (e.descricao && e.descricao.toLowerCase().includes(busca.toLowerCase())) ||
      (e.local && e.local.toLowerCase().includes(busca.toLowerCase()));
    return matchEscola && matchAno && matchCat && matchBusca;
  });

  const handleBaixarPdf = async () => {
    const el = document.getElementById('eventos-escolares-a4');
    if (!el || eventosFiltrados.length === 0) {
      setFeedback({ tipo: 'erro', texto: 'Não existem eventos filtrados para exportar em PDF.' });
      return;
    }
    setExportandoPdf(true);
    try {
      await downloadElementAsPdf(el, `Eventos_Escolares_${escola.sigla || 'MED'}_${escola.anoLectivoActivo}.pdf`);
      setFeedback({ tipo: 'sucesso', texto: 'PDF de Eventos Escolares gerado com sucesso.' });
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Falha ao gerar o PDF dos eventos escolares.' });
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarXlsx = () => {
    if (eventosFiltrados.length === 0) {
      setFeedback({ tipo: 'erro', texto: 'Não existem eventos filtrados para exportar em XLSX.' });
      return;
    }
    const linhas = eventosFiltrados.map((ev, idx) => ({
      'Nº': idx + 1,
      'Ano Letivo': ev.anoLectivo || escola.anoLectivoActivo,
      Título: ev.titulo,
      Categoria: ev.categoria,
      'Data Início': ev.dataInicio,
      'Data Fim': ev.dataFim || '-',
      Hora: ev.hora || '-',
      Local: ev.local || '-',
      'Público-Alvo': ev.publicoAlvo,
      Estado: ev.concluido ? 'Realizado' : 'Agendado',
      Descrição: ev.descricao || '-'
    }));
    downloadExcelFile('Eventos_Escolares', linhas, `Eventos_Escolares_${escola.sigla || 'MED'}_${escola.anoLectivoActivo}.xlsx`);
    setFeedback({ tipo: 'sucesso', texto: 'Ficheiro XLSX de Eventos Escolares exportado com sucesso.' });
  };

  const getCategoriaBadge = (cat: EventoEscolar['categoria']) => {
    switch (cat) {
      case 'Feriado':
        return 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'Exame':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Reunião':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Pedagógico':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Extracurricular':
        return 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
    }
  };

  const podeGerir = ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdirectorAdministrativo', 'Secretaria'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CalendarDays className="h-6 w-6 text-blue-600" />
            <span>Calendário & Agenda de Eventos</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Programação letiva, feriados nacionais, reuniões pedagógicas e exames de{' '}
            <span className="font-bold text-blue-700 dark:text-blue-400">{escola.anoLectivoActivo}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleBaixarPdf}
            disabled={exportandoPdf}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{exportandoPdf ? 'A gerar PDF...' : 'Baixar PDF'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportarXlsx}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar XLSX</span>
          </button>
          {podeGerir && (
            <button
              type="button"
              onClick={abrirNovoEvento}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Agendar Novo Evento</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between ${
            feedback.tipo === 'erro'
              ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{feedback.texto}</span>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por título, local ou detalhe..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['TODAS', 'Pedagógico', 'Exame', 'Feriado', 'Reunião', 'Extracurricular'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaFiltro(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                categoriaFiltro === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'TODAS' ? 'Todos os Eventos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventosFiltrados.map((evt) => (
          <div
            key={evt.id}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
              evt.concluido ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 opacity-85' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getCategoriaBadge(evt.categoria)}`}>
                  {evt.categoria}
                </span>

                {podeGerir && (
                  <button
                    type="button"
                    onClick={() => handleToggleConcluido(evt.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      evt.concluido
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {evt.concluido ? 'Realizado ✓' : 'Marcar Realizado'}
                  </button>
                )}
              </div>

              <h3 className={`text-sm font-bold text-slate-900 dark:text-white leading-snug ${evt.concluido ? 'line-through text-slate-500' : ''}`}>
                {evt.titulo}
              </h3>

              {evt.descricao && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {evt.descricao}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex items-center space-x-2 tabular-nums">
                <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>
                  {formatarDataAngolana(evt.dataInicio)} {evt.dataFim ? `até ${formatarDataAngolana(evt.dataFim)}` : ''} {evt.hora ? `(${evt.hora})` : ''}
                </span>
              </div>

              {evt.local && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{evt.local}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">{evt.publicoAlvo}</span>
                </div>
                {podeGerir && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEditarEvento(evt)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Editar evento"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventoParaEliminar(evt)}
                      className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer"
                      title="Eliminar evento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {eventosFiltrados.length === 0 && (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-sm">Nenhum evento escolar registado para os critérios selecionados.</p>
            <p className="text-xs text-slate-400 mt-1">Utilize o botão acima para agendar novas atividades ou exames.</p>
          </div>
        )}
      </div>

      {/* Documento A4 Oculto para PDF */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div id="eventos-escolares-a4" className="bg-white text-black p-8 w-[794px] space-y-4" style={{ fontFamily: 'Times New Roman, Georgia, serif' }}>
          <div className="text-center border-b-2 border-black pb-3 space-y-1">
            <div className="flex justify-center"><InsigniaAngola className="h-12 w-12" /></div>
            <p className="text-[11px] font-bold uppercase tracking-wider">República de Angola • Ministério da Educação</p>
            <h2 className="text-sm font-black uppercase">{escola.nomeOficial}</h2>
            <p className="text-xs font-bold uppercase">Calendário e Agenda de Eventos Escolares — {escola.anoLectivoActivo}</p>
          </div>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1.5 text-center">Nº</th>
                <th className="border border-black p-1.5 text-left">Evento</th>
                <th className="border border-black p-1.5 text-left">Categoria</th>
                <th className="border border-black p-1.5 text-center">Data / Hora</th>
                <th className="border border-black p-1.5 text-left">Local / Público</th>
                <th className="border border-black p-1.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((ev, i) => (
                <tr key={`pdf-ev-${ev.id}`}>
                  <td className="border border-black p-1.5 text-center">{i + 1}</td>
                  <td className="border border-black p-1.5">
                    <div className="font-bold">{ev.titulo}</div>
                    {ev.descricao && <div className="text-[9px] text-gray-700">{ev.descricao}</div>}
                  </td>
                  <td className="border border-black p-1.5">{ev.categoria}</td>
                  <td className="border border-black p-1.5 text-center">
                    {formatarDataAngolana(ev.dataInicio)}
                    {ev.dataFim ? ` a ${formatarDataAngolana(ev.dataFim)}` : ''}
                    {ev.hora ? ` (${ev.hora})` : ''}
                  </td>
                  <td className="border border-black p-1.5">{ev.local || '-'} · {ev.publicoAlvo}</td>
                  <td className="border border-black p-1.5 text-center font-bold">{ev.concluido ? 'Realizado' : 'Agendado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criar / Editar Evento (alinhado no topo + scroll interno seguro) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[90] flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[88vh] flex flex-col overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <span>{eventoEditando ? 'Editar Evento Escolar' : 'Agendar Evento no Calendário Escolar'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEvento} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Provas Parcelares do IIIº Trimestre"
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Pedagógico">Pedagógico</option>
                    <option value="Exame">Exame / Avaliação</option>
                    <option value="Feriado">Feriado / Suspensão</option>
                    <option value="Reunião">Reunião de Pais/Docentes</option>
                    <option value="Extracurricular">Extracurricular / Feira</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Público-Alvo</label>
                  <select
                    value={novoPublico}
                    onChange={(e) => setNovoPublico(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Toda a Comunidade">Toda a Comunidade</option>
                    <option value="Professores">Professores</option>
                    <option value="Encarregados">Encarregados de Educação</option>
                    <option value="Estudantes">Estudantes</option>
                    <option value="Direção">Direção</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={novaDataInicio}
                    onChange={(e) => setNovaDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Término (Opcional)</label>
                  <input
                    type="date"
                    value={novaDataFim}
                    onChange={(e) => setNovaDataFim(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Horário (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 08:30 às 12:00"
                    value={novaHora}
                    onChange={(e) => setNovaHora(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Local / Sala</label>
                  <input
                    type="text"
                    placeholder="Ex: Anfiteatro / Pátio"
                    value={novoLocal}
                    onChange={(e) => setNovoLocal(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Observações</label>
                <textarea
                  rows={2}
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Informações adicionais para a comunidade escolar..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {eventoEditando ? 'Guardar Alterações' : 'Confirmar e Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminação */}
      {eventoParaEliminar && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[90] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Eliminar Evento?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Tem a certeza que deseja eliminar <strong>"{eventoParaEliminar.titulo}"</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEventoParaEliminar(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
