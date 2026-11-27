import React, { useState } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Printer,
  Download,
  Loader2,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';
import { Escola, ItemPatrimonio, Funcionario, CategoriaPatrimonio, EstadoConservacao } from '../types';
import { dbService } from '../services/storage';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { InsigniaAngola } from '../constants/insignia';
import { obterNomeDiretorGeral, obterTituloDiretorSimples } from '../utils/directorHelper';
import { hojeAngolano } from '../utils/dateFormat';

interface PatrimonyViewProps {
  escola: Escola;
  currentUser: Funcionario;
}

export const PatrimonyView: React.FC<PatrimonyViewProps> = ({ escola, currentUser }) => {
  const [itens, setItens] = useState<ItemPatrimonio[]>(() => dbService.getPatrimonio(escola.id));
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemPatrimonio | null>(null);
  const [itemParaExcluirId, setItemParaExcluirId] = useState<string | null>(null);
  const [itemParaMovimentar, setItemParaMovimentar] = useState<ItemPatrimonio | null>(null);
  const [movDestinoEstado, setMovDestinoEstado] = useState<EstadoConservacao>('Em Uso');
  const [movQtd, setMovQtd] = useState<number>(1);
  const [movLocalizacao, setMovLocalizacao] = useState<string>('');
  const [movResponsavel, setMovResponsavel] = useState<string>('');
  const [movObs, setMovObs] = useState<string>('');
  const [patrimonioToast, setPatrimonioToast] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [orientacaoPdf, setOrientacaoPdf] = useState<'landscape' | 'portrait'>('landscape');

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
    'Em Uso',
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
    setItemParaExcluirId(id);
  };

  const confirmarExcluirPatrimonio = () => {
    if (!itemParaExcluirId) return;
    dbService.eliminarItemPatrimonio(itemParaExcluirId);
    setItens(dbService.getPatrimonio(escola.id));
    setItemParaExcluirId(null);
  };

  const handleRevisarRapido = (id: string, novoEstado: EstadoConservacao) => {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    if ((item.quantidade || 0) > 1 && (novoEstado === 'Em Uso' || novoEstado === 'Já Não Existe / Abatido' || novoEstado === 'Danificado')) {
      abrirMovimentacao(item, novoEstado);
      return;
    }
    const res = dbService.movimentarQuantidadePatrimonio({
      itemId: id,
      destinoEstado: novoEstado,
      quantidadeMover: Math.max(1, item.quantidade || 1),
      responsavel: currentUser?.nomeCompleto || escola.diretorGeralNome || 'Direção'
    });
    setItens(dbService.getPatrimonio(escola.id));
    if (res.sucesso) {
      setPatrimonioToast(res.mensagem);
      setTimeout(() => setPatrimonioToast(null), 5000);
    }
  };

  const abrirMovimentacao = (item: ItemPatrimonio, estadoInicial: EstadoConservacao = 'Em Uso') => {
    setItemParaMovimentar(item);
    setMovDestinoEstado(estadoInicial);
    setMovQtd(1);
    setMovLocalizacao(item.localizacao || item.salaLocalizacao || '');
    setMovResponsavel(currentUser?.nomeCompleto || item.responsavelNome || '');
    setMovObs('');
  };

  const handleConfirmarMovimentacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemParaMovimentar) return;
    const maxQtd = Math.max(1, Number(itemParaMovimentar.quantidade || 1));
    const qtdValida = Math.min(maxQtd, Math.max(1, Math.floor(Number(movQtd || 1))));
    const res = dbService.movimentarQuantidadePatrimonio({
      itemId: itemParaMovimentar.id,
      destinoEstado: movDestinoEstado,
      quantidadeMover: qtdValida,
      novaLocalizacao: movLocalizacao.trim() || itemParaMovimentar.localizacao || itemParaMovimentar.salaLocalizacao,
      responsavel: movResponsavel.trim() || currentUser?.nomeCompleto,
      observacoes: movObs.trim()
    });
    setItens(dbService.getPatrimonio(escola.id));
    setItemParaMovimentar(null);
    setPatrimonioToast(res.mensagem);
    setTimeout(() => setPatrimonioToast(null), 5000);
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

  const totalNovosStock = itens.filter(i => i.estadoConservacao === 'Novo').reduce((acc, i) => acc + i.quantidade, 0);
  const totalAtivos = itens.filter(i => ['Em Uso', 'Bom', 'Razoável', 'Regular'].includes(i.estadoConservacao)).reduce((acc, i) => acc + i.quantidade, 0);
  const totalDanificados = itens.filter(i => i.estadoConservacao === 'Danificado' || i.estadoConservacao === 'Em Reparação' || i.estadoConservacao === 'Inoperante').reduce((acc, i) => acc + i.quantidade, 0);
  const totalAbatidos = itens.filter(i => i.estadoConservacao === 'Já Não Existe / Abatido' || i.estadoConservacao === 'Para Abate').reduce((acc, i) => acc + i.quantidade, 0);

  const funcionariosEscola = dbService.getFuncionarios(escola.id);
  const nomeDiretor = obterNomeDiretorGeral(escola, funcionariosEscola);
  const tituloDiretor = obterTituloDiretorSimples(escola, funcionariosEscola);

  const handleBaixarPdfInventario = async () => {
    const el = document.getElementById('patrimonio-inventario-pdf');
    if (!el || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const sigla = (escola.sigla || escola.nomeOficial || 'SGE').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ano = (escola.anoLectivoActivo || new Date().getFullYear().toString()).replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsPdf(el, `Inventario_Patrimonio_${sigla}_${ano}.pdf`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
      setPatrimonioToast('Inventário de Património descarregado em PDF com sucesso!');
      setTimeout(() => setPatrimonioToast(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar PDF do inventário patrimonial:', err);
      setPatrimonioToast('Não foi possível gerar o PDF diretamente. A abrir pré-visualização de impressão...');
      setTimeout(() => setPatrimonioToast(null), 5000);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImprimirInventario = () => {
    const el = document.getElementById('patrimonio-inventario-pdf');
    if (el) {
      imprimirElementoDiretamente(el, `Inventário Patrimonial - ${escola.nomeOficial}`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {patrimonioToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center justify-between shadow-xs no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{patrimonioToast}</span>
          </div>
          <button type="button" onClick={() => setPatrimonioToast(null)} className="text-emerald-700 font-bold cursor-pointer">✕</button>
        </div>
      )}

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
                Conforme as normas de transição de anos letivos do MED, o património da instituição é contínuo e permanece integralmente preservado entre os anos letivos. Ao colocar bens <strong>Novos</strong> em <strong>Em Uso</strong> ou registar bens <strong>Inexistentes / Abatidos</strong>, as quantidades são automaticamente subtraídas do lote registado.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            <select
              value={orientacaoPdf}
              onChange={(e) => setOrientacaoPdf(e.target.value as 'landscape' | 'portrait')}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800"
              title="Orientação da folha A4 do inventário"
            >
              <option value="landscape">Paisagem (A4 Horizontal)</option>
              <option value="portrait">Retrato (A4 Vertical)</option>
            </select>
            <button
              type="button"
              onClick={handleBaixarPdfInventario}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? 'A gerar PDF...' : 'Baixar PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleImprimirInventario}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Inventário</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNovoModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registar Bem</span>
            </button>
          </div>
        </div>

        {/* Indicadores Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-gray-100">
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 block uppercase">Novos em Stock</span>
            <span className="text-xl font-black text-emerald-950 mt-1 block">{totalNovosStock} unidades</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 block uppercase">Em Uso / Ativos</span>
            <span className="text-xl font-black text-blue-950 mt-1 block">{totalAtivos} unidades</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 block uppercase">Danificados / Reparação</span>
            <span className="text-xl font-black text-amber-950 mt-1 block">{totalDanificados} unidades</span>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold text-rose-700 block uppercase">Inexistentes / Abatidos</span>
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

      {/* Área Oficial Exportável em PDF / Impressão do Inventário Patrimonial */}
      <div id="patrimonio-inventario-pdf" data-doc-root="true" className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-4">
        {/* Cabeçalho Oficial (exibido na exportação em PDF e Impressão) */}
        <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="hidden print:block text-center px-6 pt-6 pb-3 border-b-2 border-gray-900 space-y-1">
          <div className="flex justify-center mb-1">
            <InsigniaAngola size={44} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
          {escola.governoProvincial && (
            <p className="text-[10px] font-bold uppercase text-gray-800">{escola.governoProvincial}</p>
          )}
          <h3 className="text-sm font-black uppercase text-gray-900">{escola.nomeOficial}</h3>
          <div className="pt-1">
            <span className="inline-block border-b-2 border-gray-900 pb-0.5 px-3 text-xs font-black uppercase tracking-wider text-gray-900">
              INVENTÁRIO OFICIAL DO PATRIMÓNIO ESCOLAR
            </span>
          </div>
          <p className="text-[10px] font-semibold text-gray-700 pt-1">
            Ano Lectivo: {escola.anoLectivoActivo || '—'} • Total Listado: {itensFiltrados.length} registos ({itensFiltrados.reduce((acc, i) => acc + Number(i.quantidade || 0), 0)} unidades)
            {filtroEstado !== 'todos' ? ` • Filtro: ${filtroEstado}` : ''}
          </p>
          <div className="grid grid-cols-4 gap-2 pt-2 text-[10px]">
            <div className="p-1.5 border border-gray-300 rounded bg-gray-50">
              <strong>Novos:</strong> {totalNovosStock} un.
            </div>
            <div className="p-1.5 border border-gray-300 rounded bg-gray-50">
              <strong>Em Uso / Ativos:</strong> {totalAtivos} un.
            </div>
            <div className="p-1.5 border border-gray-300 rounded bg-gray-50">
              <strong>Danificados:</strong> {totalDanificados} un.
            </div>
            <div className="p-1.5 border border-gray-300 rounded bg-gray-50">
              <strong>Inexistentes / Abate:</strong> {totalAbatidos} un.
            </div>
          </div>
        </div>

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
                        item.estadoConservacao === 'Em Uso' ? 'bg-cyan-100 text-cyan-900' :
                        item.estadoConservacao === 'Bom' ? 'bg-blue-100 text-blue-800' :
                        item.estadoConservacao === 'Razoável' || item.estadoConservacao === 'Regular' ? 'bg-yellow-100 text-yellow-800' :
                        item.estadoConservacao === 'Danificado' || item.estadoConservacao === 'Em Reparação' || item.estadoConservacao === 'Inoperante' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.estadoConservacao}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-gray-500 font-medium">
                      Ano: {item.ultimaRevisaoAno || escola.anoLectivoActivo}
                    </td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap no-print">
                      {/* Movimentar / Subtrair Quantidade (Novo -> Em Uso / Inexistente) */}
                      {item.quantidade > 0 && item.estadoConservacao !== 'Já Não Existe / Abatido' && (
                        <button
                          type="button"
                          onClick={() => abrirMovimentacao(item, item.estadoConservacao === 'Novo' ? 'Em Uso' : 'Já Não Existe / Abatido')}
                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer"
                          title="Movimentar para Em Uso ou Dar Baixa / Inexistente (subtrai quantidade)"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.estadoConservacao !== 'Danificado' && item.estadoConservacao !== 'Já Não Existe / Abatido' && (
                        <button
                          type="button"
                          onClick={() => handleRevisarRapido(item.id, 'Danificado')}
                          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded cursor-pointer"
                          title="Assinalar como Danificado"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.estadoConservacao !== 'Já Não Existe / Abatido' && (
                        <button
                          type="button"
                          onClick={() => abrirMovimentacao(item, 'Já Não Existe / Abatido')}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                          title="Dar Baixa / Inexistente (subtrai quantidade)"
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

        {/* Rodapé e Assinaturas Oficiais (exibido na exportação em PDF e Impressão) */}
        <div data-pdf-fixed-signatures="true" className="hidden print:block px-6 pb-6 pt-4 border-t border-gray-300 space-y-6">
          <p className="text-[11px] text-right font-medium text-gray-800">
            {[escola.municipio, escola.provincia].filter(Boolean).join(', ') || 'República de Angola'}, aos {hojeAngolano('extenso')}.
          </p>
          <div className="grid grid-cols-2 gap-10 text-center text-xs">
            <div className="space-y-1">
              <p className="font-bold uppercase text-gray-900">O Responsável pelo Património</p>
              <div className="h-8" />
              <div className="w-56 border-b border-black mx-auto" />
              <p className="font-bold uppercase text-gray-800">{currentUser?.nomeCompleto || 'Secretaria / Administração'}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold uppercase text-gray-900">{tituloDiretor}</p>
              <div className="h-8" />
              <div className="w-56 border-b border-black mx-auto" />
              <p className="font-bold uppercase text-gray-800">{nomeDiretor}</p>
            </div>
          </div>
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

      {itemParaMovimentar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Movimentar / Dar Baixa de Stock</h3>
              </div>
              <button type="button" onClick={() => setItemParaMovimentar(null)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">✕</button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold text-gray-900">{itemParaMovimentar.designacao || itemParaMovimentar.nomeItem}</div>
              <div className="text-gray-600">
                Estado Atual: <strong>{itemParaMovimentar.estadoConservacao}</strong> • Disponível: <strong>{itemParaMovimentar.quantidade} un.</strong>
              </div>
              <div className="text-gray-500">Localização Atual: {itemParaMovimentar.localizacao || itemParaMovimentar.salaLocalizacao}</div>
            </div>

            <form onSubmit={handleConfirmarMovimentacao} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Destino / Situação *</label>
                  <select
                    value={movDestinoEstado}
                    onChange={(e) => setMovDestinoEstado(e.target.value as EstadoConservacao)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                  >
                    <option value="Em Uso">Em Uso (Colocar em Utilização)</option>
                    <option value="Já Não Existe / Abatido">Inexistente / Já Não Existe</option>
                    <option value="Danificado">Danificado</option>
                    <option value="Em Reparação">Em Reparação</option>
                    <option value="Para Abate">Para Abate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Qtd a Subtrair (Máx: {itemParaMovimentar.quantidade})</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, itemParaMovimentar.quantidade)}
                    required
                    value={movQtd}
                    onChange={(e) => setMovQtd(Math.min(itemParaMovimentar.quantidade, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-full p-2 border border-gray-300 rounded-lg font-extrabold text-indigo-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Localização / Sala de Destino</label>
                <input
                  type="text"
                  value={movLocalizacao}
                  onChange={(e) => setMovLocalizacao(e.target.value)}
                  placeholder="Ex: Sala 04, Secretaria, Baixa de Inventário"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Responsável pela Movimentação</label>
                <input
                  type="text"
                  value={movResponsavel}
                  onChange={(e) => setMovResponsavel(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observações / Motivo</label>
                <textarea
                  rows={2}
                  value={movObs}
                  onChange={(e) => setMovObs(e.target.value)}
                  placeholder="Ex: Entregue à Sala 03 para o ano letivo, ou extraviado/abatido..."
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] text-indigo-950 font-medium">
                Após confirmar: restarão <strong>{Math.max(0, itemParaMovimentar.quantidade - movQtd)} un.</strong> em "{itemParaMovimentar.estadoConservacao}" e serão registadas <strong>{movQtd} un.</strong> como "{movDestinoEstado}".
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setItemParaMovimentar(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
                >
                  Confirmar Subtração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemParaExcluirId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900 dark:text-white">Remover Registo Patrimonial</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Tem a certeza que deseja remover este registo de património?
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setItemParaExcluirId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExcluirPatrimonio}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Remover Registo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
