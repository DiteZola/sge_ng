import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  PackageCheck,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  History,
  Trash2,
  Edit3,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Loader2,
  Boxes
} from 'lucide-react';
import {
  Escola,
  Funcionario,
  MaterialLimpezaItem,
  MovimentoEstoqueLimpeza,
  CategoriaMaterialLimpeza,
  UnidadeMedidaLimpeza,
  TipoMovimentoEstoqueLimpeza
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
import { formatarDataAngolana, hojeAngolano } from '../utils/dateFormat';

interface CleaningStockViewProps {
  escola: Escola;
  currentUser: Funcionario;
}

const CATEGORIAS_LIMPEZA: CategoriaMaterialLimpeza[] = [
  'Detergentes & Desinfetantes',
  'Lixívia & Álcool',
  'Vassouras, Rodos & Baldes',
  'Sacos de Lixo & Descartáveis',
  'Papel Higiénico & Toalhas',
  'Equipamento de Proteção (Luvas/Máscaras)',
  'Outros Materiais'
];

const UNIDADES_LIMPEZA: UnidadeMedidaLimpeza[] = [
  'Unidade',
  'Litro',
  'Caixa',
  'Pacote',
  'Rolo',
  'Galão',
  'Quilograma'
];

export const CleaningStockView: React.FC<CleaningStockViewProps> = ({ escola, currentUser }) => {
  const [materiais, setMateriais] = useState<MaterialLimpezaItem[]>(() => dbService.getMateriaisLimpeza(escola.id));
  const [movimentos, setMovimentos] = useState<MovimentoEstoqueLimpeza[]>(() => dbService.getMovimentosLimpeza(escola.id));
  const [abaAtiva, setAbaAtiva] = useState<'inventario' | 'historico' | 'documento'>('inventario');
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [apenasBaixoStock, setApenasBaixoStock] = useState(false);
  const [orientacaoPdf, setOrientacaoPdf] = useState<'portrait' | 'landscape'>('landscape');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modal Cadastro/Edição de Material
  const [showModalMaterial, setShowModalMaterial] = useState(false);
  const [materialEdicao, setMaterialEdicao] = useState<MaterialLimpezaItem | null>(null);
  const [matCodigo, setMatCodigo] = useState('');
  const [matNome, setMatNome] = useState('');
  const [matCategoria, setMatCategoria] = useState<CategoriaMaterialLimpeza>('Detergentes & Desinfetantes');
  const [matUnidade, setMatUnidade] = useState<UnidadeMedidaLimpeza>('Unidade');
  const [matQtdAtual, setMatQtdAtual] = useState<number>(0);
  const [matQtdMinima, setMatQtdMinima] = useState<number>(5);
  const [matLocal, setMatLocal] = useState('Arrecadação / Armazém de Limpeza');
  const [matFornecedor, setMatFornecedor] = useState('');
  const [matObs, setMatObs] = useState('');

  // Modal Movimento de Stock (Entrada / Saída / Ajuste)
  const [materialMovimento, setMaterialMovimento] = useState<MaterialLimpezaItem | null>(null);
  const [movTipo, setMovTipo] = useState<TipoMovimentoEstoqueLimpeza>('Saida');
  const [movQuantidade, setMovQuantidade] = useState<number>(1);
  const [movData, setMovData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [movSetor, setMovSetor] = useState('Pavilhões & Salas de Aula');
  const [movMotivo, setMovMotivo] = useState('');
  const [movObs, setMovObs] = useState('');

  // Confirmação eliminação
  const [confirmarRemoverId, setConfirmarRemoverId] = useState<string | null>(null);

  const podeGerirCatalogo = ['AdminGeral', 'DiretorGeral', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(
    currentUser.role
  );
  const podeMovimentarEstoque = [
    'AdminGeral',
    'DiretorGeral',
    'SubdiretorAdministrativo',
    'SubdirectorAdministrativo',
    'AuxiliarLimpeza'
  ].includes(currentUser.role);

  const recarregar = () => {
    setMateriais(dbService.getMateriaisLimpeza(escola.id));
    setMovimentos(dbService.getMovimentosLimpeza(escola.id));
  };

  useEffect(() => {
    recarregar();
    const handler = () => recarregar();
    window.addEventListener('sge_dados_atualizados_remoto', handler);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', handler);
  }, [escola.id]);

  const mostrarToast = (tipo: 'sucesso' | 'erro', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 5000);
  };

  const abrirModalNovoMaterial = () => {
    setMaterialEdicao(null);
    setMatCodigo(`LIMP-${Math.floor(100 + Math.random() * 900)}`);
    setMatNome('');
    setMatCategoria('Detergentes & Desinfetantes');
    setMatUnidade('Litro');
    setMatQtdAtual(0);
    setMatQtdMinima(5);
    setMatLocal('Arrecadação / Armazém de Limpeza');
    setMatFornecedor('');
    setMatObs('');
    setShowModalMaterial(true);
  };

  const abrirModalEditarMaterial = (item: MaterialLimpezaItem) => {
    setMaterialEdicao(item);
    setMatCodigo(item.codigo || '');
    setMatNome(item.nome);
    setMatCategoria(item.categoria);
    setMatUnidade(item.unidade);
    setMatQtdAtual(item.quantidadeAtual);
    setMatQtdMinima(item.quantidadeMinima);
    setMatLocal(item.localArmazenamento || '');
    setMatFornecedor(item.fornecedor || '');
    setMatObs(item.observacoes || '');
    setShowModalMaterial(true);
  };

  const handleSalvarMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matNome.trim()) {
      mostrarToast('erro', 'Informe o nome do material de limpeza.');
      return;
    }

    const agora = new Date().toISOString();
    const novoItem: MaterialLimpezaItem = {
      id: materialEdicao?.id || `mat-limp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      codigo: matCodigo.trim() || undefined,
      nome: matNome.trim(),
      categoria: matCategoria,
      unidade: matUnidade,
      quantidadeAtual: Math.max(0, Number(matQtdAtual) || 0),
      quantidadeMinima: Math.max(0, Number(matQtdMinima) || 0),
      localArmazenamento: matLocal.trim() || undefined,
      fornecedor: matFornecedor.trim() || undefined,
      observacoes: matObs.trim() || undefined,
      ultimoMovimentoEm: materialEdicao?.ultimoMovimentoEm || agora,
      criadoPorId: materialEdicao?.criadoPorId || currentUser.id,
      criadoPorNome: materialEdicao?.criadoPorNome || currentUser.nomeCompleto,
      criadoEm: materialEdicao?.criadoEm || agora,
      atualizadoEm: agora
    };

    dbService.salvarMaterialLimpeza(novoItem);
    recarregar();
    setShowModalMaterial(false);
    mostrarToast('sucesso', materialEdicao ? 'Material atualizado com sucesso!' : 'Novo material de limpeza adicionado ao estoque!');
  };

  const abrirModalMovimento = (item: MaterialLimpezaItem, tipo: TipoMovimentoEstoqueLimpeza) => {
    setMaterialMovimento(item);
    setMovTipo(tipo);
    setMovQuantidade(tipo === 'Ajuste' ? item.quantidadeAtual : 1);
    setMovData(new Date().toISOString().split('T')[0]);
    setMovSetor(tipo === 'Entrada' ? 'Armazém Central' : 'Salas de Aula & Corredores');
    setMovMotivo(
      tipo === 'Entrada'
        ? 'Reposição / Aquisição de material'
        : tipo === 'Saida'
        ? 'Requisição para limpeza diária'
        : 'Inventário físico / Conferência de stock'
    );
    setMovObs('');
  };

  const handleConfirmarMovimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialMovimento) return;

    const res = dbService.registarMovimentoLimpeza({
      escolaId: escola.id,
      materialId: materialMovimento.id,
      tipo: movTipo,
      quantidade: Number(movQuantidade),
      data: movData,
      setorDestino: movSetor,
      motivo: movMotivo,
      responsavelId: currentUser.id,
      responsavelNome: currentUser.nomeCompleto,
      responsavelRole: currentUser.role,
      observacoes: movObs
    });

    if (!res.sucesso) {
      mostrarToast('erro', res.mensagem);
      return;
    }

    recarregar();
    setMaterialMovimento(null);
    mostrarToast('sucesso', res.mensagem);
  };

  const handleConfirmarRemover = () => {
    if (!confirmarRemoverId) return;
    dbService.eliminarMaterialLimpeza(confirmarRemoverId);
    setConfirmarRemoverId(null);
    recarregar();
    mostrarToast('sucesso', 'Material removido do catálogo.');
  };

  const materiaisFiltrados = useMemo(() => {
    return materiais.filter(m => {
      const q = busca.trim().toLowerCase();
      const matchBusca =
        !q ||
        m.nome.toLowerCase().includes(q) ||
        (m.codigo || '').toLowerCase().includes(q) ||
        (m.localArmazenamento || '').toLowerCase().includes(q);
      const matchCat = filtroCategoria === 'todas' || m.categoria === filtroCategoria;
      const matchBaixo = !apenasBaixoStock || m.quantidadeAtual <= m.quantidadeMinima;
      return matchBusca && matchCat && matchBaixo;
    });
  }, [materiais, busca, filtroCategoria, apenasBaixoStock]);

  const movimentosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return movimentos.filter(mv => {
      if (!q) return true;
      return (
        mv.materialNome.toLowerCase().includes(q) ||
        mv.responsavelNome.toLowerCase().includes(q) ||
        (mv.setorDestino || '').toLowerCase().includes(q) ||
        mv.motivo.toLowerCase().includes(q)
      );
    });
  }, [movimentos, busca]);

  const stats = useMemo(() => {
    const totalItens = materiais.length;
    const totalUnidades = materiais.reduce((acc, m) => acc + (Number(m.quantidadeAtual) || 0), 0);
    const criticos = materiais.filter(m => m.quantidadeAtual <= 0).length;
    const baixoStock = materiais.filter(m => m.quantidadeAtual > 0 && m.quantidadeAtual <= m.quantidadeMinima).length;
    return { totalItens, totalUnidades, criticos, baixoStock, totalMovimentos: movimentos.length };
  }, [materiais, movimentos]);

  const handleExportarExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const rowsMat = materiais.map((m, idx) => ({
        'Nº': idx + 1,
        'Código': m.codigo || '—',
        'Designação do Material': m.nome,
        'Categoria': m.categoria,
        'Unidade': m.unidade,
        'Quantidade Atual': m.quantidadeAtual,
        'Stock Mínimo': m.quantidadeMinima,
        'Situação': m.quantidadeAtual <= 0 ? 'Esgotado' : m.quantidadeAtual <= m.quantidadeMinima ? 'Stock Baixo' : 'Normal',
        'Local Armazenamento': m.localArmazenamento || '—',
        'Fornecedor': m.fornecedor || '—'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsMat), 'Estoque_Limpeza');

      const rowsMov = movimentos.map((mv, idx) => ({
        'Nº': idx + 1,
        'Data': mv.data,
        'Material': mv.materialNome,
        'Tipo': mv.tipo,
        'Quantidade': mv.quantidade,
        'Unidade': mv.unidade,
        'Saldo Anterior': mv.quantidadeAnterior,
        'Saldo Novo': mv.quantidadeNova,
        'Setor / Destino': mv.setorDestino || '—',
        'Motivo': mv.motivo,
        'Responsável': mv.responsavelNome
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsMov), 'Movimentos_Limpeza');

      const sigla = (escola.sigla || 'Escola').replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `Estoque_Materiais_Limpeza_${sigla}_${new Date().toISOString().split('T')[0]}.xlsx`);
      mostrarToast('sucesso', 'Folha Excel do Estoque de Limpeza descarregada com sucesso!');
    } catch (err: any) {
      mostrarToast('erro', `Erro ao exportar Excel: ${err?.message || 'Tente novamente'}`);
    }
  };

  const handleBaixarPdf = async () => {
    const el = document.getElementById('estoque-limpeza-print');
    if (!el || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const sigla = (escola.sigla || 'SGE').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsPdf(el, `Estoque_Limpeza_${sigla}.pdf`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
      mostrarToast('sucesso', 'Documento PDF do Estoque de Limpeza descarregado!');
    } catch {
      imprimirElementoDiretamente(el, `Estoque de Materiais de Limpeza - ${escola.nomeOficial}`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImprimir = () => {
    const el = document.getElementById('estoque-limpeza-print');
    if (el) {
      imprimirElementoDiretamente(el, `Estoque de Materiais de Limpeza - ${escola.nomeOficial}`, {
        orientation: orientacaoPdf,
        format: 'a4',
        marginMm: 10
      });
    }
  };

  const funcionariosEscola = useMemo(() => dbService.getFuncionarios(escola.id), [escola.id]);
  const nomeDiretor = obterNomeDiretorGeral(escola, funcionariosEscola);
  const tituloDiretor = obterTituloDiretorSimples(escola, funcionariosEscola);
  const nomeSubAdmin = obterNomeSubdiretorAdministrativo(escola, funcionariosEscola);
  const tituloSubAdmin = obterTituloSubdiretorAdministrativo(escola, funcionariosEscola);

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

      {/* Cabeçalho do Módulo */}
      <div className="bg-white dark:bg-slate-900 border-2 border-teal-600 dark:border-teal-500 rounded-2xl p-5 sm:p-6 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-md shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Estoque de Materiais de Limpeza & Higiene
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                  Administração & Limpeza
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Controlo partilhado entre a Subdirecção Administrativa e os Auxiliares de Limpeza: registo de entradas, requisições diárias e inventário em tempo real.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrientacaoPdf('portrait')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  orientacaoPdf === 'portrait' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Retrato
              </button>
              <button
                type="button"
                onClick={() => setOrientacaoPdf('landscape')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  orientacaoPdf === 'landscape' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Paisagem
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportarExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={isExportingPdf}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
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

            {podeGerirCatalogo && (
              <button
                type="button"
                onClick={abrirModalNovoMaterial}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Material</span>
              </button>
            )}
          </div>
        </div>

        {/* Cartões de Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Tipos de Materiais</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalItens}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase">Unidades em Stock</div>
            <div className="text-2xl font-black text-teal-900 dark:text-teal-100 mt-0.5">{stats.totalUnidades}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase">Stock Baixo / Esgotado</div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-0.5">
              {stats.baixoStock + stats.criticos}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Movimentos Registados</div>
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 mt-0.5">{stats.totalMovimentos}</div>
          </div>
        </div>

        {/* Navegação interna */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAbaAtiva('inventario')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                abaAtiva === 'inventario'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Inventário & Movimentação ({materiais.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico de Entradas & Saídas ({movimentos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('documento')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                abaAtiva === 'documento'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Mapa Oficial p/ Impressão</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Pesquisar material, setor, pessoa..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {abaAtiva === 'inventario' && (
              <>
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="todas">Todas as Categorias</option>
                  {CATEGORIAS_LIMPEZA.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer px-2">
                  <input
                    type="checkbox"
                    checked={apenasBaixoStock}
                    onChange={e => setApenasBaixoStock(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <span>Só Stock Baixo</span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ABA 1: INVENTÁRIO & MOVIMENTAÇÃO */}
      {abaAtiva === 'inventario' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden no-print">
          {materiaisFiltrados.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-teal-500 mx-auto opacity-60" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                Nenhum material de limpeza encontrado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {materiais.length === 0
                  ? 'A Subdirecção Administrativa pode registar os materiais de limpeza (detergentes, lixívia, vassouras, sacos de lixo, etc.) para controlo conjunto com os auxiliares de limpeza.'
                  : 'Ajuste os filtros de pesquisa ou categoria para visualizar outros itens.'}
              </p>
              {podeGerirCatalogo && materiais.length === 0 && (
                <button
                  type="button"
                  onClick={abrirModalNovoMaterial}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Primeiro Material</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-black border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Código / Material</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Armazenamento</th>
                    <th className="p-3 text-center">Quantidade Atual</th>
                    <th className="p-3 text-center">Mínimo</th>
                    <th className="p-3 text-center">Situação</th>
                    <th className="p-3 text-right">Movimentar / Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {materiaisFiltrados.map(item => {
                    const esgotado = item.quantidadeAtual <= 0;
                    const baixo = !esgotado && item.quantidadeAtual <= item.quantidadeMinima;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-3">
                          <div className="font-black text-slate-900 dark:text-white">{item.nome}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            {item.codigo && <span className="font-mono">{item.codigo}</span>}
                            {item.fornecedor && <span>• Forn.: {item.fornecedor}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{item.categoria}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{item.localArmazenamento || '—'}</td>
                        <td className="p-3 text-center">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {item.quantidadeAtual}
                          </span>{' '}
                          <span className="text-[11px] text-slate-500">{item.unidade}(s)</span>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {item.quantidadeMinima}
                        </td>
                        <td className="p-3 text-center">
                          {esgotado ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                              Esgotado
                            </span>
                          ) : baixo ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                              Stock Baixo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                              Disponível
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {podeMovimentarEstoque && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => abrirModalMovimento(item, 'Entrada')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="Registar entrada/reposição"
                                >
                                  <ArrowDownCircle className="w-3.5 h-3.5" />
                                  <span>Entrada</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirModalMovimento(item, 'Saida')}
                                  disabled={item.quantidadeAtual <= 0}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="Registar saída/consumo"
                                >
                                  <ArrowUpCircle className="w-3.5 h-3.5" />
                                  <span>Saída</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirModalMovimento(item, 'Ajuste')}
                                  className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="Ajuste de inventário"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {podeGerirCatalogo && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarMaterial(item)}
                                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer"
                                  title="Editar ficha do material"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarRemoverId(item.id)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 cursor-pointer"
                                  title="Remover material"
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

      {/* ABA 2: HISTÓRICO DE MOVIMENTOS */}
      {abaAtiva === 'historico' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden no-print">
          {movimentosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Ainda não existem movimentos de entrada ou saída registados no estoque de limpeza.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-black border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Material</th>
                    <th className="p-3 text-center">Operação</th>
                    <th className="p-3 text-center">Qtd.</th>
                    <th className="p-3 text-center">Saldo (Antes → Depois)</th>
                    <th className="p-3">Setor / Destino</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movimentosFiltrados.map(mv => (
                    <tr key={mv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="p-3 whitespace-nowrap font-medium">{formatarDataAngolana(mv.data)}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{mv.materialNome}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            mv.tipo === 'Entrada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mv.tipo === 'Saida'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {mv.tipo === 'Saida' ? 'Saída' : mv.tipo}
                        </span>
                      </td>
                      <td className="p-3 text-center font-black">
                        {mv.quantidade} {mv.unidade}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px]">
                        {mv.quantidadeAnterior} → <strong>{mv.quantidadeNova}</strong>
                      </td>
                      <td className="p-3">{mv.setorDestino || '—'}</td>
                      <td className="p-3">{mv.motivo}</td>
                      <td className="p-3">
                        <div className="font-semibold">{mv.responsavelNome}</div>
                        <div className="text-[10px] text-slate-500">{mv.responsavelRole}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTO OFICIAL PARA PDF / IMPRESSÃO (visível na aba documento ou durante impressão) */}
      <div className={abaAtiva === 'documento' ? 'block' : 'hidden print:block'}>
        <div
          id="estoque-limpeza-print"
          className="bg-white text-slate-900 border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm max-w-5xl mx-auto"
        >
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
            <InsigniaAngola className="w-12 h-12 mx-auto mb-2" />
            <div className="text-[11px] font-bold uppercase tracking-wider">República de Angola</div>
            <div className="text-[11px] font-bold uppercase">Ministério da Educação</div>
            <div className="text-sm font-black uppercase mt-1">{escola.nomeOficial}</div>
            <h2 className="text-base font-black uppercase tracking-wide mt-2 text-slate-900">
              INVENTÁRIO & CONTROLO DE ESTOQUE DE MATERIAIS DE LIMPEZA
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Ano Lectivo: {escola.anoLectivoActivo} • Data de Emissão: {hojeAngolano('extenso')}
            </p>
          </div>

          <table className="w-full border-collapse border border-slate-700 text-[11px] mb-6">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 p-2 text-center w-10">Nº</th>
                <th className="border border-slate-700 p-2 text-left">Código</th>
                <th className="border border-slate-700 p-2 text-left">Material / Produto</th>
                <th className="border border-slate-700 p-2 text-left">Categoria</th>
                <th className="border border-slate-700 p-2 text-center">Unidade</th>
                <th className="border border-slate-700 p-2 text-center">Stock Atual</th>
                <th className="border border-slate-700 p-2 text-center">Mínimo</th>
                <th className="border border-slate-700 p-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {materiaisFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-slate-700 p-4 text-center text-slate-500">
                    Sem materiais de limpeza registados.
                  </td>
                </tr>
              ) : (
                materiaisFiltrados.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="border border-slate-700 p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-700 p-1.5 font-mono">{m.codigo || '—'}</td>
                    <td className="border border-slate-700 p-1.5 font-bold">{m.nome}</td>
                    <td className="border border-slate-700 p-1.5">{m.categoria}</td>
                    <td className="border border-slate-700 p-1.5 text-center">{m.unidade}</td>
                    <td className="border border-slate-700 p-1.5 text-center font-bold">{m.quantidadeAtual}</td>
                    <td className="border border-slate-700 p-1.5 text-center">{m.quantidadeMinima}</td>
                    <td className="border border-slate-700 p-1.5 text-center">
                      {m.quantidadeAtual <= 0 ? 'Esgotado' : m.quantidadeAtual <= m.quantidadeMinima ? 'Stock Baixo' : 'Normal'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {movimentos.length > 0 && (
            <>
              <h3 className="text-xs font-black uppercase mb-2">Últimos Movimentos de Stock (Entrada / Saída)</h3>
              <table className="w-full border-collapse border border-slate-700 text-[10px] mb-8">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-700 p-1.5">Data</th>
                    <th className="border border-slate-700 p-1.5 text-left">Material</th>
                    <th className="border border-slate-700 p-1.5">Tipo</th>
                    <th className="border border-slate-700 p-1.5">Qtd</th>
                    <th className="border border-slate-700 p-1.5">Saldo</th>
                    <th className="border border-slate-700 p-1.5 text-left">Destino / Motivo</th>
                    <th className="border border-slate-700 p-1.5 text-left">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.slice(0, 20).map(mv => (
                    <tr key={mv.id}>
                      <td className="border border-slate-700 p-1.5 text-center">{formatarDataAngolana(mv.data)}</td>
                      <td className="border border-slate-700 p-1.5 font-semibold">{mv.materialNome}</td>
                      <td className="border border-slate-700 p-1.5 text-center">{mv.tipo === 'Saida' ? 'Saída' : mv.tipo}</td>
                      <td className="border border-slate-700 p-1.5 text-center">{mv.quantidade} {mv.unidade}</td>
                      <td className="border border-slate-700 p-1.5 text-center">{mv.quantidadeAnterior} → {mv.quantidadeNova}</td>
                      <td className="border border-slate-700 p-1.5">{mv.setorDestino ? `${mv.setorDestino} — ` : ''}{mv.motivo}</td>
                      <td className="border border-slate-700 p-1.5">{mv.responsavelNome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

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

      {/* MODAL CADASTRO / EDIÇÃO DE MATERIAL */}
      {showModalMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">
                {materialEdicao ? 'Editar Material de Limpeza' : 'Registar Novo Material de Limpeza'}
              </h3>
              <button type="button" onClick={() => setShowModalMaterial(false)} className="cursor-pointer p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSalvarMaterial} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código</label>
                  <input
                    type="text"
                    value={matCodigo}
                    onChange={e => setMatCodigo(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Material *</label>
                  <input
                    type="text"
                    required
                    value={matNome}
                    onChange={e => setMatNome(e.target.value)}
                    placeholder="Ex: Lixívia 5L, Detergente Líquido..."
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={matCategoria}
                    onChange={e => setMatCategoria(e.target.value as CategoriaMaterialLimpeza)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {CATEGORIAS_LIMPEZA.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unidade</label>
                  <select
                    value={matUnidade}
                    onChange={e => setMatUnidade(e.target.value as UnidadeMedidaLimpeza)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {UNIDADES_LIMPEZA.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade Inicial / Atual</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={matQtdAtual}
                    onChange={e => setMatQtdAtual(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alerta Stock Mínimo</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={matQtdMinima}
                    onChange={e => setMatQtdMinima(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Local de Armazenamento</label>
                  <input
                    type="text"
                    value={matLocal}
                    onChange={e => setMatLocal(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fornecedor</label>
                  <input
                    type="text"
                    value={matFornecedor}
                    onChange={e => setMatFornecedor(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={matObs}
                  onChange={e => setMatObs(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalMaterial(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black cursor-pointer"
                >
                  Guardar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTO DE STOCK */}
      {materialMovimento && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                movTipo === 'Entrada' ? 'bg-emerald-700' : movTipo === 'Saida' ? 'bg-amber-700' : 'bg-blue-700'
              }`}
            >
              <div>
                <h3 className="text-sm font-black">
                  {movTipo === 'Entrada' ? 'Entrada no Estoque' : movTipo === 'Saida' ? 'Requisição / Saída de Material' : 'Ajuste de Inventário'}
                </h3>
                <p className="text-[11px] opacity-90">
                  {materialMovimento.nome} • Saldo atual: {materialMovimento.quantidadeAtual} {materialMovimento.unidade}(s)
                </p>
              </div>
              <button type="button" onClick={() => setMaterialMovimento(null)} className="cursor-pointer p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmarMovimento} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {movTipo === 'Ajuste' ? 'Nova Quantidade Total *' : 'Quantidade *'}
                  </label>
                  <input
                    type="number"
                    min={movTipo === 'Ajuste' ? 0 : 0.5}
                    step="0.5"
                    max={movTipo === 'Saida' ? materialMovimento.quantidadeAtual : undefined}
                    required
                    value={movQuantidade}
                    onChange={e => setMovQuantidade(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    value={movData}
                    onChange={e => setMovData(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Setor / Área de Aplicação</label>
                <input
                  type="text"
                  value={movSetor}
                  onChange={e => setMovSetor(e.target.value)}
                  placeholder="Ex: Bloco B, Casas de Banho, Secretaria..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo *</label>
                <input
                  type="text"
                  required
                  value={movMotivo}
                  onChange={e => setMovMotivo(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={movObs}
                  onChange={e => setMovObs(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaterialMovimento(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black cursor-pointer flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirmar Movimento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE REMOÇÃO */}
      {confirmarRemoverId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Remover Material do Catálogo?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Esta ação elimina o material da lista ativa de estoque. O histórico anterior de movimentos será mantido para auditoria.
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
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
