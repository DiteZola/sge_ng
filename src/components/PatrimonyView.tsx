import React, { useState } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Printer
} from 'lucide-react';
import { Escola, ItemPatrimonio, Funcionario, CategoriaPatrimonio, EstadoConservacao } from '../types';
import { dbService } from '../services/storage';

interface PatrimonyViewProps {
  escola: Escola;
  currentUser: Funcionario;
}

export const PatrimonyView: React.FC<PatrimonyViewProps> = ({ escola }) => {
  const [itens, setItens] = useState<ItemPatrimonio[]>(() => dbService.getPatrimonio(escola.id));
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemPatrimonio | null>(null);

  // Form State
  const [codigoTombo, setCodigoTombo] = useState('');
  const [designacao, setDesignacao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaPatrimonio>('Mobiliário Escolar (Carteiras/Secretárias)');
  const [localizacao, setLocalizacao] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [estadoConservacao, setEstadoConservacao] = useState<EstadoConservacao>('Bom');
  const [observacoes, setObservacoes] = useState('');

  const categorias: CategoriaPatrimonio[] = [
    'Mobiliário Escolar (Carteiras/Secretárias)',
    'Informática & Equipamentos TIC',
    'Laboratório de Ciências',
    'Climatização & Energia (ACs/Geradores)',
    'Biblioteca & Acervo',
    'Desporto & Educação Física',
    'Outros Bens'
  ];

  const estados: EstadoConservacao[] = [
    'Novo',
    'Bom',
    'Razoável',
    'Regular',
    'Danificado',
    'Em Reparação',
    'Inoperante',
    'Para Abate',
    'Já Não Existe / Abatido'
  ];

  const handleSalvarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designacao.trim()) return;

    const cod = codigoTombo.trim() || `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const item: ItemPatrimonio = {
      id: itemEmEdicao?.id || `pat-${Date.now()}`,
      escolaId: escola.id,
      codigoTombamento: cod,
      codigoTombo: cod,
      nomeItem: designacao.trim(),
      designacao: designacao.trim(),
      categoria,
      salaLocalizacao: localizacao.trim() || 'Edifício Principal',
      localizacao: localizacao.trim() || 'Edifício Principal',
      quantidade: Number(quantidade) || 1,
      estadoConservacao,
      observacoes: observacoes.trim(),
      dataAquisicao: itemEmEdicao?.dataAquisicao || new Date().toISOString().split('T')[0],
      ultimaRevisaoAno: escola.anoLectivoActivo,
      valorEstimadoKz: itemEmEdicao?.valorEstimadoKz || 0,
      responsavelNome: itemEmEdicao?.responsavelNome || escola.diretorGeralNome || 'Direção'
    };

    dbService.salvarItemPatrimonio(item);
    setItens(dbService.getPatrimonio(escola.id));
    fecharModal();
  };

  const handleExcluir = (id: string) => {
    if (confirm('Tem a certeza que deseja remover este registo de património?')) {
      dbService.eliminarItemPatrimonio(id);
      setItens(dbService.getPatrimonio(escola.id));
    }
  };

  const handleRevisarRapido = (id: string, novoEstado: EstadoConservacao) => {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    const atualizado: ItemPatrimonio = {
      ...item,
      estadoConservacao: novoEstado,
      ultimaRevisaoAno: escola.anoLectivoActivo
    };
    dbService.salvarItemPatrimonio(atualizado);
    setItens(dbService.getPatrimonio(escola.id));
  };

  const abrirEdicao = (item: ItemPatrimonio) => {
    setItemEmEdicao(item);
    setCodigoTombo(item.codigoTombo || item.codigoTombamento || '');
    setDesignacao(item.designacao || item.nomeItem || '');
    setCategoria(item.categoria);
    setLocalizacao(item.localizacao || item.salaLocalizacao || '');
    setQuantidade(item.quantidade);
    setEstadoConservacao(item.estadoConservacao);
    setObservacoes(item.observacoes || '');
    setShowNovoModal(true);
  };

  const fecharModal = () => {
    setShowNovoModal(false);
    setItemEmEdicao(null);
    setCodigoTombo('');
    setDesignacao('');
    setCategoria('Mobiliário Escolar (Carteiras/Secretárias)');
    setLocalizacao('');
    setQuantidade(1);
    setEstadoConservacao('Bom');
    setObservacoes('');
  };

  // Filtragem
  const itensFiltrados = itens.filter(item => {
    const nome = item.designacao || item.nomeItem || '';
    const cod = item.codigoTombo || item.codigoTombamento || '';
    const sala = item.localizacao || item.salaLocalizacao || '';
    const matchBusca = nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       cod.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       sala.toLowerCase().includes(termoBusca.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || item.estadoConservacao === filtroEstado;
    return matchBusca && matchEstado;
  });

  const totalAtivos = itens.filter(i => i.estadoConservacao !== 'Já Não Existe / Abatido' && i.estadoConservacao !== 'Para Abate').reduce((acc, i) => acc + i.quantidade, 0);
  const totalDanificados = itens.filter(i => i.estadoConservacao === 'Danificado' || i.estadoConservacao === 'Inoperante').reduce((acc, i) => acc + i.quantidade, 0);
  const totalAbatidos = itens.filter(i => i.estadoConservacao === 'Já Não Existe / Abatido' || i.estadoConservacao === 'Para Abate').reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner Oficial */}
      <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">
                Gestão e Inventário de Património Escolar
              </h2>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                Conforme as normas de transição de anos letivos do MED, o património da instituição é contínuo e permanece integralmente preservado entre os anos letivos. Utilize este módulo para realizar a <strong>revisão anual de estado</strong>, assinalando bens danificados ou que já não existem no inventário.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer no-print"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Inventário</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNovoModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer no-print"
            >
              <Plus className="w-4 h-4" />
              <span>Registar Bem</span>
            </button>
          </div>
        </div>

        {/* Indicadores Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-gray-100">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 block uppercase">Bens em Uso / Ativos</span>
            <span className="text-xl font-black text-blue-950 mt-1 block">{totalAtivos} unidades</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 block uppercase">Bens Danificados (Revisão)</span>
            <span className="text-xl font-black text-amber-950 mt-1 block">{totalDanificados} unidades</span>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold text-rose-700 block uppercase">Já Não Existe / Abatidos</span>
            <span className="text-xl font-black text-rose-950 mt-1 block">{totalAbatidos} unidades</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Pesquisar por designação, tombo ou sala..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs font-semibold border border-gray-300 rounded-xl px-3 py-2 bg-white"
          >
            <option value="todos">Todos os Estados de Conservação</option>
            {estados.map(est => (
              <option key={est} value={est}>{est}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Património */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Nº de Tombo</th>
                <th className="p-3.5">Designação do Bem</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Localização / Sala</th>
                <th className="p-3.5 text-center">Qtd</th>
                <th className="p-3.5">Estado de Conservação</th>
                <th className="p-3.5">Última Revisão</th>
                <th className="p-3.5 text-right no-print">Ações & Revisão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 text-xs">
                    Nenhum bem patrimonial encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-gray-800">{item.codigoTombo || item.codigoTombamento}</td>
                    <td className="p-3.5 font-bold text-gray-900">
                      <div>{item.designacao || item.nomeItem}</div>
                      {item.observacoes && <div className="text-[10px] text-gray-500 font-normal">{item.observacoes}</div>}
                    </td>
                    <td className="p-3.5 text-gray-600">{item.categoria}</td>
                    <td className="p-3.5 text-gray-700 font-medium">{item.localizacao || item.salaLocalizacao}</td>
                    <td className="p-3.5 text-center font-extrabold text-gray-900">{item.quantidade}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        item.estadoConservacao === 'Novo' ? 'bg-emerald-100 text-emerald-800' :
                        item.estadoConservacao === 'Bom' ? 'bg-blue-100 text-blue-800' :
                        item.estadoConservacao === 'Razoável' || item.estadoConservacao === 'Regular' ? 'bg-yellow-100 text-yellow-800' :
                        item.estadoConservacao === 'Danificado' || item.estadoConservacao === 'Inoperante' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.estadoConservacao}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-gray-500 font-medium">
                      Ano: {item.ultimaRevisaoAno || escola.anoLectivoActivo}
                    </td>
                    <td className="p-3.5 text-right space-x-1 no-print">
                      {/* Botões Rápidos de Revisão Anual */}
                      {item.estadoConservacao !== 'Danificado' && (
                        <button
                          type="button"
                          onClick={() => handleRevisarRapido(item.id, 'Danificado')}
                          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded cursor-pointer"
                          title="Marcar como Danificado"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.estadoConservacao !== 'Já Não Existe / Abatido' && (
                        <button
                          type="button"
                          onClick={() => handleRevisarRapido(item.id, 'Já Não Existe / Abatido')}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                          title="Marcar como Já Não Existe / Abatido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirEdicao(item)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                        title="Editar Detalhes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Remover Registo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar/Editar Item */}
      {showNovoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {itemEmEdicao ? 'Editar Bem Patrimonial' : 'Registar Novo Bem no Património'}
              </h3>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSalvarItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nº de Tombo</label>
                  <input
                    type="text"
                    value={codigoTombo}
                    onChange={(e) => setCodigoTombo(e.target.value)}
                    placeholder="PAT-1001"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {categorias.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Designação do Bem <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={designacao}
                  onChange={(e) => setDesignacao(e.target.value)}
                  placeholder="Ex: Carteiras duplas metálicas com assento em madeira"
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Localização / Sala</label>
                  <input
                    type="text"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    placeholder="Ex: Sala 01 ou Laboratório"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Estado de Conservação</label>
                <select
                  value={estadoConservacao}
                  onChange={(e) => setEstadoConservacao(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-semibold"
                >
                  {estados.map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observações / Danos Detetados</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Detalhes sobre avarias, peças em falta ou estado geral..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  {itemEmEdicao ? 'Salvar Alterações' : 'Confirmar e Registar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
