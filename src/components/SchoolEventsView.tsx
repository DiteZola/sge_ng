import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Tag, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  CalendarDays,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { Escola, Funcionario } from '../types';

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

  // Formulário de Novo Evento
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

  const handleCriarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !novaDataInicio) return;

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

    const atualizados = [novo, ...eventos];
    salvarEventosNaStorage(atualizados);
    setShowModal(false);

    // Limpar form
    setNovoTitulo('');
    setNovaDataInicio('');
    setNovaDataFim('');
    setNovaHora('');
    setNovoLocal('');
    setNovaDescricao('');
  };

  const handleToggleConcluido = (id: string) => {
    const atualizados = eventos.map(e => e.id === id ? { ...e, concluido: !e.concluido } : e);
    salvarEventosNaStorage(atualizados);
  };

  // Filtragem dos eventos para o ano ativo
  const eventosFiltrados = eventos.filter(e => {
    const matchAno = !e.anoLectivo || e.anoLectivo === escola.anoLectivoActivo;
    const matchCat = categoriaFiltro === 'TODAS' || e.categoria === categoriaFiltro;
    const matchBusca = !busca || 
      e.titulo.toLowerCase().includes(busca.toLowerCase()) || 
      (e.descricao && e.descricao.toLowerCase().includes(busca.toLowerCase())) ||
      (e.local && e.local.toLowerCase().includes(busca.toLowerCase()));
    return matchAno && matchCat && matchBusca;
  });

  const getCategoriaBadge = (cat: EventoEscolar['categoria']) => {
    switch (cat) {
      case 'Feriado':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Exame':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Reunião':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pedagógico':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Extracurricular':
        return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const podeGerir = ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdirectorAdministrativo'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <CalendarDays className="h-6 w-6 text-blue-600" />
            <span>Calendário & Agenda Escolar</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Programação letiva, feriados nacionais, reuniões pedagógicas e exames de <span className="font-bold text-blue-700">{escola.anoLectivoActivo}</span>.
          </p>
        </div>

        {podeGerir && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar Novo Evento</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por título, local ou detalhe..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['TODAS', 'Pedagógico', 'Exame', 'Feriado', 'Reunião', 'Extracurricular'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                categoriaFiltro === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
              evt.concluido ? 'border-gray-200 bg-gray-50/70 opacity-80' : 'border-gray-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoriaBadge(evt.categoria)}`}>
                  {evt.categoria}
                </span>

                {podeGerir && (
                  <button
                    onClick={() => handleToggleConcluido(evt.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      evt.concluido ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {evt.concluido ? 'Realizado ✓' : 'Marcar Realizado'}
                  </button>
                )}
              </div>

              <h3 className={`text-sm font-bold text-gray-900 leading-snug ${evt.concluido ? 'line-through text-gray-500' : ''}`}>
                {evt.titulo}
              </h3>

              {evt.descricao && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {evt.descricao}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500 font-medium">
              <div className="flex items-center space-x-2">
                <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>
                  {evt.dataInicio} {evt.dataFim ? `até ${evt.dataFim}` : ''} {evt.hora ? `(${evt.hora})` : ''}
                </span>
              </div>

              {evt.local && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{evt.local}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-[11px] text-gray-700 font-semibold">{evt.publicoAlvo}</span>
              </div>
            </div>
          </div>
        ))}

        {eventosFiltrados.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">Nenhum evento escolar registado para os critérios selecionados.</p>
            <p className="text-xs text-gray-400 mt-1">Utilize o botão acima para agendar novas atividades ou exames.</p>
          </div>
        )}
      </div>

      {/* Modal de Novo Evento */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <span>Agendar Evento no Calendário Escolar</span>
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCriarEvento} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Provas Parcelares do IIIº Trimestre"
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Pedagógico">Pedagógico</option>
                    <option value="Exame">Exame / Avaliação</option>
                    <option value="Feriado">Feriado / Suspensão</option>
                    <option value="Reunião">Reunião de Pais/Docentes</option>
                    <option value="Extracurricular">Extracurricular / Feira</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Público-Alvo</label>
                  <select
                    value={novoPublico}
                    onChange={(e) => setNovoPublico(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={novaDataInicio}
                    onChange={(e) => setNovaDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data de Término (Opcional)</label>
                  <input
                    type="date"
                    value={novaDataFim}
                    onChange={(e) => setNovaDataFim(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Horário (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 08:30 às 12:00"
                    value={novaHora}
                    onChange={(e) => setNovaHora(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Local / Sala</label>
                  <input
                    type="text"
                    placeholder="Ex: Anfiteatro / Pátio"
                    value={novoLocal}
                    onChange={(e) => setNovoLocal(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição / Observações</label>
                <textarea
                  rows={2}
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Informações adicionais para a comunidade escolar..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar e Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
