import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  CreditCard,
  Lightbulb,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Sliders,
  Calculator,
  BookOpen,
  X,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';
import {
  Funcionario,
  Escola,
  DadosFinancasPessoaisUsuario,
  TransacaoPessoal,
  TipoTransacaoPessoal,
  OrcamentoCategoriaPessoal,
  MetaPoupancaPessoal,
  DividaPessoal
} from '../types';
import { dbService } from '../services/storage';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { formatarDataAngolana } from '../utils/dateFormat';

interface MinhasFinancasViewProps {
  currentUser: Funcionario;
  escola?: Escola | null;
}

type AbaFinancasPessoais = 'painel' | 'movimentos' | 'orcamento' | 'poupanca_dividas' | 'educacao';

const CATEGORIAS_RECEITA = [
  'Salário / Vencimento',
  'Subsídios / Horas Extras',
  'Negócio / Freelance',
  'Rendimentos / Poupança',
  'Apoio / Reembolso',
  'Outras Receitas'
];

const CATEGORIAS_DESPESA: Array<{ nome: string; grupo503020: 'necessidade' | 'desejo' | 'poupanca' }> = [
  { nome: 'Alimentação & Mercado', grupo503020: 'necessidade' },
  { nome: 'Habitação / Renda & Energia', grupo503020: 'necessidade' },
  { nome: 'Transporte & Combustível', grupo503020: 'necessidade' },
  { nome: 'Saúde & Farmácia', grupo503020: 'necessidade' },
  { nome: 'Educação & Formação', grupo503020: 'necessidade' },
  { nome: 'Comunicação & Internet', grupo503020: 'necessidade' },
  { nome: 'Vestuário & Calçado', grupo503020: 'desejo' },
  { nome: 'Lazer & Família', grupo503020: 'desejo' },
  { nome: 'Impostos & Taxas', grupo503020: 'necessidade' },
  { nome: 'Dívidas & Prestações', grupo503020: 'poupanca' },
  { nome: 'Poupança & Reserva', grupo503020: 'poupanca' },
  { nome: 'Outras Despesas', grupo503020: 'desejo' }
];

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatKz(valor: number): string {
  const num = Number.isFinite(valor) ? valor : 0;
  return `${Math.round(num).toLocaleString('pt-AO')} Kz`;
}

export const MinhasFinancasView: React.FC<MinhasFinancasViewProps> = ({ currentUser, escola }) => {
  const hoje = new Date();
  const mesAtualPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const anoAtualPadrao = hoje.getFullYear();

  const [dados, setDados] = useState<DadosFinancasPessoaisUsuario>(() =>
    dbService.getFinancasPessoaisUsuario(currentUser.id)
  );
  const [abaAtiva, setAbaAtiva] = useState<AbaFinancasPessoais>('painel');
  const [mesSelecionado, setMesSelecionado] = useState<string>(mesAtualPadrao);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(anoAtualPadrao);
  const [modoGraficoEvolucao, setModoGraficoEvolucao] = useState<'mensal' | 'anual'>('mensal');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Filtros de movimentos
  const [buscaMovimento, setBuscaMovimento] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState<'Todos' | TipoTransacaoPessoal>('Todos');
  const [filtroCategoriaMov, setFiltroCategoriaMov] = useState<string>('TODAS');
  const [escopoMovimentos, setEscopoMovimentos] = useState<'mes' | 'ano' | 'todos'>('mes');

  // Modais (top-aligned e com scroll interno para nunca cortar no topo)
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [editTransacaoId, setEditTransacaoId] = useState<string | null>(null);
  const [txTipo, setTxTipo] = useState<TipoTransacaoPessoal>('Despesa');
  const [txCategoria, setTxCategoria] = useState<string>(CATEGORIAS_DESPESA[0].nome);
  const [txDescricao, setTxDescricao] = useState('');
  const [txValor, setTxValor] = useState('');
  const [txData, setTxData] = useState(hoje.toISOString().split('T')[0]);
  const [txRecorrente, setTxRecorrente] = useState(false);
  const [txObservacoes, setTxObservacoes] = useState('');

  const [showMetaModal, setShowMetaModal] = useState(false);
  const [editMetaId, setEditMetaId] = useState<string | null>(null);
  const [metaTitulo, setMetaTitulo] = useState('');
  const [metaValorAlvo, setMetaValorAlvo] = useState('');
  const [metaValorAtual, setMetaValorAtual] = useState('0');
  const [metaDataLimite, setMetaDataLimite] = useState('');

  const [depositoMetaAlvo, setDepositoMetaAlvo] = useState<MetaPoupancaPessoal | null>(null);
  const [depositoValor, setDepositoValor] = useState('');

  const [showDividaModal, setShowDividaModal] = useState(false);
  const [editDividaId, setEditDividaId] = useState<string | null>(null);
  const [divCredor, setDivCredor] = useState('');
  const [divDescricao, setDivDescricao] = useState('');
  const [divTotal, setDivTotal] = useState('');
  const [divPago, setDivPago] = useState('0');
  const [divPrestacao, setDivPrestacao] = useState('');
  const [divVencimento, setDivVencimento] = useState('');

  const [pagamentoDividaAlvo, setPagamentoDividaAlvo] = useState<DividaPessoal | null>(null);
  const [pagamentoDividaValor, setPagamentoDividaValor] = useState('');

  const [itemParaEliminar, setItemParaEliminar] = useState<{
    tipo: 'transacao' | 'meta' | 'divida';
    id: string;
    rotulo: string;
  } | null>(null);

  // Simulador iniciante
  const [simObjetivoKz, setSimObjetivoKz] = useState('300000');
  const [simPoupancaMensalKz, setSimPoupancaMensalKz] = useState('25000');
  const [simDividaKz, setSimDividaKz] = useState('150000');
  const [simPagamentoMensalKz, setSimPagamentoMensalKz] = useState('30000');

  useEffect(() => {
    setDados(dbService.getFinancasPessoaisUsuario(currentUser.id));
  }, [currentUser.id]);

  useEffect(() => {
    const onRemoteSync = () => {
      setDados(dbService.getFinancasPessoaisUsuario(currentUser.id));
    };
    window.addEventListener('sge_dados_atualizados_remoto', onRemoteSync);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', onRemoteSync);
  }, [currentUser.id]);

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4000);
  };

  const persistirDados = (novosDados: DadosFinancasPessoaisUsuario) => {
    const salvo = dbService.salvarFinancasPessoaisUsuario({
      ...novosDados,
      userId: currentUser.id,
      userNome: currentUser.nomeCompleto,
      escolaId: escola?.id
    });
    setDados(salvo);
  };

  // Transações do mês selecionado
  const transacoesMes = useMemo(
    () => dados.transacoes.filter(t => (t.data || '').startsWith(mesSelecionado)),
    [dados.transacoes, mesSelecionado]
  );

  const resumoMes = useMemo(() => {
    const receitas = transacoesMes.filter(t => t.tipo === 'Receita').reduce((acc, t) => acc + (Number(t.valorKz) || 0), 0);
    const despesas = transacoesMes.filter(t => t.tipo === 'Despesa').reduce((acc, t) => acc + (Number(t.valorKz) || 0), 0);
    const saldo = receitas - despesas;
    const taxaPoupanca = receitas > 0 ? Math.round(((receitas - despesas) / receitas) * 100) : 0;

    let necessidades = 0;
    let desejos = 0;
    let poupancaDividas = 0;
    const porCategoria: Record<string, number> = {};

    transacoesMes
      .filter(t => t.tipo === 'Despesa')
      .forEach(t => {
        const val = Number(t.valorKz) || 0;
        porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + val;
        const catInfo = CATEGORIAS_DESPESA.find(c => c.nome === t.categoria);
        const grupo = catInfo?.grupo503020 || 'necessidade';
        if (grupo === 'necessidade') necessidades += val;
        else if (grupo === 'desejo') desejos += val;
        else poupancaDividas += val;
      });

    const categoriasOrdenadas = Object.entries(porCategoria)
      .map(([categoria, total]) => ({
        categoria,
        total,
        pctDespesas: despesas > 0 ? Math.round((total / despesas) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    return {
      receitas,
      despesas,
      saldo,
      taxaPoupanca,
      necessidades,
      desejos,
      poupancaDividas,
      categoriasOrdenadas
    };
  }, [transacoesMes]);

  // Evolução mensal (12 meses do ano selecionado) e evolução anual
  const dadosGraficoMensal = useMemo(() => {
    return MESES_CURTOS.map((mesLabel, idx) => {
      const chave = `${anoSelecionado}-${String(idx + 1).padStart(2, '0')}`;
      const doMes = dados.transacoes.filter(t => (t.data || '').startsWith(chave));
      const rec = doMes.filter(t => t.tipo === 'Receita').reduce((s, t) => s + (Number(t.valorKz) || 0), 0);
      const desp = doMes.filter(t => t.tipo === 'Despesa').reduce((s, t) => s + (Number(t.valorKz) || 0), 0);
      return { chave, label: mesLabel, receitas: rec, despesas: desp, saldo: rec - desp };
    });
  }, [dados.transacoes, anoSelecionado]);

  const dadosGraficoAnual = useMemo(() => {
    const anosSet = new Set<number>([anoAtualPadrao - 2, anoAtualPadrao - 1, anoAtualPadrao]);
    dados.transacoes.forEach(t => {
      const y = parseInt((t.data || '').slice(0, 4), 10);
      if (y > 2000 && y < 2100) anosSet.add(y);
    });
    return Array.from(anosSet)
      .sort((a, b) => a - b)
      .map(ano => {
        const prefix = `${ano}-`;
        const doAno = dados.transacoes.filter(t => (t.data || '').startsWith(prefix));
        const rec = doAno.filter(t => t.tipo === 'Receita').reduce((s, t) => s + (Number(t.valorKz) || 0), 0);
        const desp = doAno.filter(t => t.tipo === 'Despesa').reduce((s, t) => s + (Number(t.valorKz) || 0), 0);
        return { chave: String(ano), label: String(ano), receitas: rec, despesas: desp, saldo: rec - desp };
      });
  }, [dados.transacoes, anoAtualPadrao]);

  const serieGraficoAtiva = modoGraficoEvolucao === 'mensal' ? dadosGraficoMensal : dadosGraficoAnual;
  const maxValorGrafico = useMemo(() => {
    const max = serieGraficoAtiva.reduce((m, item) => Math.max(m, item.receitas, item.despesas), 0);
    return max > 0 ? max : 100000;
  }, [serieGraficoAtiva]);

  // Orçamentos do mês
  const orcamentosMes = useMemo<OrcamentoCategoriaPessoal[]>(() => {
    return dados.orcamentosPorMes?.[mesSelecionado] || [];
  }, [dados.orcamentosPorMes, mesSelecionado]);

  const resumoOrcamento = useMemo(() => {
    const totalPlaneado = orcamentosMes.reduce((s, o) => s + (Number(o.limiteMensalKz) || 0), 0);
    const totalGastoNoPlaneado = orcamentosMes.reduce((s, o) => {
      const gastoCat = transacoesMes
        .filter(t => t.tipo === 'Despesa' && t.categoria === o.categoria)
        .reduce((acc, t) => acc + (Number(t.valorKz) || 0), 0);
      return s + gastoCat;
    }, 0);
    const categoriasEstouradas = orcamentosMes.filter(o => {
      if (!o.limiteMensalKz) return false;
      const gastoCat = transacoesMes
        .filter(t => t.tipo === 'Despesa' && t.categoria === o.categoria)
        .reduce((acc, t) => acc + (Number(t.valorKz) || 0), 0);
      return gastoCat > o.limiteMensalKz;
    });
    return { totalPlaneado, totalGastoNoPlaneado, categoriasEstouradas };
  }, [orcamentosMes, transacoesMes]);

  // Conselhos inteligentes baseados nos dados reais do utilizador
  const conselhoInteligente = useMemo(() => {
    if (transacoesMes.length === 0) {
      return {
        nivel: 'neutro' as const,
        titulo: 'Comece por registar o seu primeiro movimento deste mês',
        mensagem: 'Anote o seu salário ou entrada principal e as despesas do dia-a-dia. Em 3 dias já terá clareza sobre onde vai o seu dinheiro.'
      };
    }
    if (resumoOrcamento.categoriasEstouradas.length > 0) {
      return {
        nivel: 'alerta' as const,
        titulo: `${resumoOrcamento.categoriasEstouradas.length} categoria(s) ultrapassaram o orçamento mensal`,
        mensagem: `Revise os gastos em ${resumoOrcamento.categoriasEstouradas.map(c => c.categoria).slice(0, 2).join(' e ')} e tente travar compras não essenciais até o fim do mês.`
      };
    }
    if (resumoMes.receitas > 0 && resumoMes.despesas > resumoMes.receitas) {
      return {
        nivel: 'critico' as const,
        titulo: 'Atenção: as despesas estão acima das receitas neste mês',
        mensagem: `Está com défice de ${formatKz(Math.abs(resumoMes.saldo))}. Evite recorrer a dívidas de curto prazo e reveja as despesas de lazer ou extras.`
      };
    }
    if (resumoMes.receitas > 0 && resumoMes.taxaPoupanca >= 20) {
      return {
        nivel: 'sucesso' as const,
        titulo: `Excelente disciplina financeira (${resumoMes.taxaPoupanca}% poupado)`,
        mensagem: 'Está a cumprir ou superar a meta recomendada de 20% de poupança. Considere canalizar parte do excedente para o seu Fundo de Emergência ou para amortizar dívidas.'
      };
    }
    return {
      nivel: 'aviso' as const,
      titulo: 'Saldo positivo — reserve uma parte fixa antes de gastar',
      mensagem: 'Tem margem mensal positiva. Tente automatizar pelo menos 10% a 20% logo no início do mês para construir a sua reserva.'
    };
  }, [transacoesMes.length, resumoOrcamento.categoriasEstouradas, resumoMes]);

  // Movimentos filtrados para listagem
  const movimentosFiltrados = useMemo(() => {
    return dados.transacoes.filter(t => {
      if (escopoMovimentos === 'mes' && !(t.data || '').startsWith(mesSelecionado)) return false;
      if (escopoMovimentos === 'ano' && !(t.data || '').startsWith(String(anoSelecionado))) return false;
      if (filtroTipoMov !== 'Todos' && t.tipo !== filtroTipoMov) return false;
      if (filtroCategoriaMov !== 'TODAS' && t.categoria !== filtroCategoriaMov) return false;
      if (buscaMovimento.trim()) {
        const q = buscaMovimento.toLowerCase().trim();
        const match =
          (t.descricao || '').toLowerCase().includes(q) ||
          (t.categoria || '').toLowerCase().includes(q) ||
          (t.notas || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [dados.transacoes, escopoMovimentos, mesSelecionado, anoSelecionado, filtroTipoMov, filtroCategoriaMov, buscaMovimento]);

  const totalPoupadoMetas = useMemo(
    () => dados.metasPoupanca.reduce((s, m) => s + (Number(m.atualKz) || 0), 0),
    [dados.metasPoupanca]
  );

  const totalDividasRestantes = useMemo(
    () =>
      dados.dividas.reduce((s, d) => {
        const rest = Math.max(0, (Number(d.valorTotalKz) || 0) - (Number(d.valorPagoKz) || 0));
        return s + rest;
      }, 0),
    [dados.dividas]
  );

  // Handlers
  const abrirNovaTransacao = (tipoInicial: TipoTransacaoPessoal) => {
    setEditTransacaoId(null);
    setTxTipo(tipoInicial);
    setTxCategoria(tipoInicial === 'Receita' ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0].nome);
    setTxDescricao('');
    setTxValor('');
    setTxData(hoje.toISOString().split('T')[0]);
    setTxRecorrente(false);
    setTxObservacoes('');
    setShowTransacaoModal(true);
  };

  const abrirEditarTransacao = (t: TransacaoPessoal) => {
    setEditTransacaoId(t.id);
    setTxTipo(t.tipo);
    setTxCategoria(t.categoria);
    setTxDescricao(t.descricao);
    setTxValor(String(t.valorKz));
    setTxData(t.data);
    setTxRecorrente(Boolean(t.recorrente));
    setTxObservacoes(t.notas || '');
    setShowTransacaoModal(true);
  };

  const handleSalvarTransacao = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = Number(txValor);
    if (!txDescricao.trim() || !Number.isFinite(valorNum) || valorNum <= 0 || !txData) {
      mostrarFeedback('erro', 'Preencha a descrição, a data e um valor superior a zero.');
      return;
    }
    const agora = new Date().toISOString();
    let novasTransacoes: TransacaoPessoal[];
    if (editTransacaoId) {
      novasTransacoes = dados.transacoes.map(item =>
        item.id === editTransacaoId
          ? {
              ...item,
              userId: item.userId || currentUser.id,
              tipo: txTipo,
              categoria: txCategoria,
              descricao: txDescricao.trim(),
              valorKz: valorNum,
              data: txData,
              recorrente: txRecorrente,
              notas: txObservacoes.trim() || undefined,
              atualizadoEm: agora
            }
          : item
      );
    } else {
      const nova: TransacaoPessoal = {
        id: `fin-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser.id,
        tipo: txTipo,
        categoria: txCategoria,
        descricao: txDescricao.trim(),
        valorKz: valorNum,
        data: txData,
        recorrente: txRecorrente,
        notas: txObservacoes.trim() || undefined,
        criadoEm: agora,
        atualizadoEm: agora
      };
      novasTransacoes = [nova, ...dados.transacoes];
    }

    novasTransacoes.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    persistirDados({ ...dados, transacoes: novasTransacoes });
    setShowTransacaoModal(false);
    mostrarFeedback('sucesso', editTransacaoId ? 'Movimento atualizado com sucesso.' : `${txTipo} registada com sucesso.`);
  };

  const handleAlterarLimiteOrcamento = (categoria: string, novoValorStr: string) => {
    const limite = Math.max(0, Number(novoValorStr) || 0);
    const atuais = [...(dados.orcamentosPorMes?.[mesSelecionado] || [])];
    const idx = atuais.findIndex(o => o.categoria === categoria);
    if (idx >= 0) {
      atuais[idx] = { ...atuais[idx], limiteMensalKz: limite };
    } else {
      atuais.push({ categoria, limiteMensalKz: limite });
    }
    persistirDados({
      ...dados,
      orcamentosPorMes: {
        ...(dados.orcamentosPorMes || {}),
        [mesSelecionado]: atuais
      }
    });
  };

  const handleCopiarOrcamentoMesAnterior = () => {
    const [anoStr, mesStr] = mesSelecionado.split('-');
    let ano = parseInt(anoStr, 10);
    let mes = parseInt(mesStr, 10) - 1;
    if (mes < 1) {
      mes = 12;
      ano -= 1;
    }
    const chaveAnterior = `${ano}-${String(mes).padStart(2, '0')}`;
    const anterior = dados.orcamentosPorMes?.[chaveAnterior];
    if (!anterior || anterior.length === 0) {
      mostrarFeedback('erro', `Não existe orçamento definido no mês anterior (${chaveAnterior}).`);
      return;
    }
    persistirDados({
      ...dados,
      orcamentosPorMes: {
        ...(dados.orcamentosPorMes || {}),
        [mesSelecionado]: anterior.map(item => ({ ...item }))
      }
    });
    mostrarFeedback('sucesso', `Orçamento copiado de ${chaveAnterior} para ${mesSelecionado}.`);
  };

  const handleSalvarMeta = (e: React.FormEvent) => {
    e.preventDefault();
    const alvo = Number(metaValorAlvo);
    const atual = Math.max(0, Number(metaValorAtual) || 0);
    if (!metaTitulo.trim() || !Number.isFinite(alvo) || alvo <= 0) {
      mostrarFeedback('erro', 'Informe o título da meta e o valor objetivo em Kz.');
      return;
    }
    const agora = new Date().toISOString();
    let metas: MetaPoupancaPessoal[];
    if (editMetaId) {
      metas = dados.metasPoupanca.map(m =>
        m.id === editMetaId
          ? {
              ...m,
              titulo: metaTitulo.trim(),
              objetivoKz: alvo,
              atualKz: atual,
              prazo: metaDataLimite || undefined,
              atualizadoEm: agora
            }
          : m
      );
    } else {
      metas = [
        {
          id: `meta-${Date.now()}`,
          titulo: metaTitulo.trim(),
          objetivoKz: alvo,
          atualKz: atual,
          prazo: metaDataLimite || undefined,
          prioridade: 'Média',
          criadoEm: agora,
          atualizadoEm: agora
        },
        ...dados.metasPoupanca
      ];
    }
    persistirDados({ ...dados, metasPoupanca: metas });
    setShowMetaModal(false);
    mostrarFeedback('sucesso', 'Meta de poupança guardada com sucesso.');
  };

  const handleConfirmarDepositoMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositoMetaAlvo) return;
    const val = Number(depositoValor);
    if (!Number.isFinite(val) || val <= 0) {
      mostrarFeedback('erro', 'Indique um valor válido para depósito.');
      return;
    }
    const metas = dados.metasPoupanca.map(m =>
      m.id === depositoMetaAlvo.id ? { ...m, atualKz: (Number(m.atualKz) || 0) + val, atualizadoEm: new Date().toISOString() } : m
    );
    const agora = new Date().toISOString();
    const movReserva: TransacaoPessoal = {
      id: `fin-meta-${Date.now()}`,
      userId: currentUser.id,
      tipo: 'Despesa',
      categoria: 'Poupança & Reserva',
      descricao: `Depósito na meta: ${depositoMetaAlvo.titulo}`,
      valorKz: val,
      data: hoje.toISOString().split('T')[0],
      criadoEm: agora,
      atualizadoEm: agora
    };
    persistirDados({
      ...dados,
      metasPoupanca: metas,
      transacoes: [movReserva, ...dados.transacoes]
    });
    setDepositoMetaAlvo(null);
    setDepositoValor('');
    mostrarFeedback('sucesso', `Depósito de ${formatKz(val)} adicionado à meta "${depositoMetaAlvo.titulo}".`);
  };

  const handleSalvarDivida = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(divTotal);
    const pago = Math.max(0, Number(divPago) || 0);
    if (!divCredor.trim() || !divDescricao.trim() || !Number.isFinite(total) || total <= 0) {
      mostrarFeedback('erro', 'Preencha o credor, a descrição e o valor total da dívida.');
      return;
    }
    const estado: 'Ativa' | 'Quitada' = pago >= total ? 'Quitada' : 'Ativa';
    const agora = new Date().toISOString();
    let dividas: DividaPessoal[];
    if (editDividaId) {
      dividas = dados.dividas.map(d =>
        d.id === editDividaId
          ? {
              ...d,
              credor: divCredor.trim(),
              descricao: divDescricao.trim(),
              valorTotalKz: total,
              valorPagoKz: pago,
              prestacaoMensalKz: divPrestacao ? Number(divPrestacao) : undefined,
              vencimento: divVencimento || undefined,
              estado,
              atualizadoEm: agora
            }
          : d
      );
    } else {
      dividas = [
        {
          id: `div-${Date.now()}`,
          credor: divCredor.trim(),
          descricao: divDescricao.trim(),
          valorTotalKz: total,
          valorPagoKz: pago,
          prestacaoMensalKz: divPrestacao ? Number(divPrestacao) : undefined,
          vencimento: divVencimento || undefined,
          estado,
          criadoEm: agora,
          atualizadoEm: agora
        },
        ...dados.dividas
      ];
    }
    persistirDados({ ...dados, dividas });
    setShowDividaModal(false);
    mostrarFeedback('sucesso', 'Dívida guardada no seu controlo pessoal.');
  };

  const handleConfirmarPagamentoDivida = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagamentoDividaAlvo) return;
    const val = Number(pagamentoDividaValor);
    if (!Number.isFinite(val) || val <= 0) {
      mostrarFeedback('erro', 'Indique um valor válido para amortização.');
      return;
    }
    const agora = new Date().toISOString();
    const dividas = dados.dividas.map(d => {
      if (d.id !== pagamentoDividaAlvo.id) return d;
      const novoPago = Math.min(d.valorTotalKz, (Number(d.valorPagoKz) || 0) + val);
      return {
        ...d,
        valorPagoKz: novoPago,
        estado: novoPago >= d.valorTotalKz ? ('Quitada' as const) : ('Ativa' as const),
        atualizadoEm: agora
      };
    });
    const movDivida: TransacaoPessoal = {
      id: `fin-div-${Date.now()}`,
      userId: currentUser.id,
      tipo: 'Despesa',
      categoria: 'Dívidas & Prestações',
      descricao: `Amortização: ${pagamentoDividaAlvo.credor} (${pagamentoDividaAlvo.descricao})`,
      valorKz: val,
      data: hoje.toISOString().split('T')[0],
      criadoEm: agora,
      atualizadoEm: agora
    };
    persistirDados({
      ...dados,
      dividas,
      transacoes: [movDivida, ...dados.transacoes]
    });
    setPagamentoDividaAlvo(null);
    setPagamentoDividaValor('');
    mostrarFeedback('sucesso', `Pagamento de ${formatKz(val)} registado.`);
  };

  const handleConfirmarEliminacao = () => {
    if (!itemParaEliminar) return;
    if (itemParaEliminar.tipo === 'transacao') {
      persistirDados({
        ...dados,
        transacoes: dados.transacoes.filter(t => t.id !== itemParaEliminar.id)
      });
    } else if (itemParaEliminar.tipo === 'meta') {
      persistirDados({
        ...dados,
        metasPoupanca: dados.metasPoupanca.filter(m => m.id !== itemParaEliminar.id)
      });
    } else if (itemParaEliminar.tipo === 'divida') {
      persistirDados({
        ...dados,
        dividas: dados.dividas.filter(d => d.id !== itemParaEliminar.id)
      });
    }
    setItemParaEliminar(null);
    mostrarFeedback('sucesso', 'Registo removido com sucesso.');
  };

  const handleBaixarPdfExtrato = async () => {
    const ok = await downloadElementAsPdf(
      'minhas-financas-pdf-a4',
      `Minhas_Financas_${currentUser.nomeCompleto.replace(/\s+/g, '_')}_${mesSelecionado}`,
      { orientation: 'portrait', format: 'a4', marginMm: 10 }
    );
    if (ok) mostrarFeedback('sucesso', 'Extrato financeiro pessoal em PDF descarregado.');
  };

  const handleExportarExcelExtrato = async () => {
    if (movimentosFiltrados.length === 0) {
      mostrarFeedback('erro', 'Sem movimentos no filtro selecionado para exportar para Excel.');
      return;
    }
    const rows = movimentosFiltrados.map(m => ({
      Data: formatarDataAngolana(m.data),
      Tipo: m.tipo,
      Categoria: m.categoria,
      Descricao: m.descricao,
      Valor_Kz: m.valorKz,
      Recorrente: m.recorrente ? 'Sim' : 'Não',
      Observacoes: m.notas || ''
    }));
    await downloadExcelFile(
      'MinhasFinancas',
      rows,
      `Minhas_Financas_${currentUser.nomeCompleto.replace(/\s+/g, '_')}_${mesSelecionado}.xlsx`
    );
    mostrarFeedback('sucesso', 'Ficheiro Excel (.xlsx) das suas finanças exportado.');
  };

  // Simulador cálculos
  const mesesSimPoupanca = useMemo(() => {
    const obj = Number(simObjetivoKz) || 0;
    const mens = Number(simPoupancaMensalKz) || 0;
    if (obj <= 0 || mens <= 0) return null;
    return Math.ceil(obj / mens);
  }, [simObjetivoKz, simPoupancaMensalKz]);

  const mesesSimDivida = useMemo(() => {
    const div = Number(simDividaKz) || 0;
    const pag = Number(simPagamentoMensalKz) || 0;
    if (div <= 0 || pag <= 0) return null;
    return Math.ceil(div / pag);
  }, [simDividaKz, simPagamentoMensalKz]);

  const mesExtensoSelecionado = useMemo(() => {
    const [ano, mes] = mesSelecionado.split('-');
    const idx = Math.max(0, Math.min(11, (parseInt(mes, 10) || 1) - 1));
    return `${MESES_NOMES[idx]} de ${ano}`;
  }, [mesSelecionado]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações Principais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Área Privada de {currentUser.nomeCompleto}</span>
            <span aria-hidden="true">·</span>
            <span>Visível apenas para si</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Minhas Finanças Pessoais
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
            Organize as suas receitas, despesas, orçamento mensal, poupanças e dívidas num painel simples e prático.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Mês:</span>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setMesSelecionado(val);
                  const y = parseInt(val.split('-')[0], 10);
                  if (!isNaN(y)) setAnoSelecionado(y);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={() => abrirNovaTransacao('Receita')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Receita</span>
          </button>

          <button
            type="button"
            onClick={() => abrirNovaTransacao('Despesa')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 dark:hover:bg-blue-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Despesa</span>
          </button>

          <button
            type="button"
            onClick={handleBaixarPdfExtrato}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportarExcelExtrato}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar XLSX</span>
          </button>
        </div>
      </div>

      {/* Feedback */}
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

      {/* Navegação por Sub-abas */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit max-w-full overflow-x-auto">
        {[
          { id: 'painel' as const, label: 'Painel & Evolução', icon: BarChart3 },
          { id: 'movimentos' as const, label: 'Receitas & Despesas', icon: Wallet },
          { id: 'orcamento' as const, label: 'Planeamento & Orçamento', icon: Sliders },
          { id: 'poupanca_dividas' as const, label: 'Poupança & Dívidas', icon: PiggyBank },
          { id: 'educacao' as const, label: 'Dicas para Leigos', icon: Lightbulb }
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

      {/* ===================================================================== */}
      {/* ABA 1: PAINEL & EVOLUÇÃO                                              */}
      {/* ===================================================================== */}
      {abaAtiva === 'painel' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Receitas · {mesExtensoSelecionado}</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatKz(resumoMes.receitas)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {transacoesMes.filter(t => t.tipo === 'Receita').length} entrada(s) registada(s)
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Despesas · {mesExtensoSelecionado}</span>
                <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">
                {formatKz(resumoMes.despesas)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {transacoesMes.filter(t => t.tipo === 'Despesa').length} saída(s) registada(s)
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Saldo do Mês</span>
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  resumoMes.saldo >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatKz(resumoMes.saldo)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Taxa de poupança: <span className="font-semibold tabular-nums">{resumoMes.taxaPoupanca}%</span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Reservas vs Dívidas</span>
                <PiggyBank className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatKz(totalPoupadoMetas)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dívidas em aberto: <span className="font-semibold tabular-nums">{formatKz(totalDividasRestantes)}</span>
              </p>
            </div>
          </div>

          {/* Conselho Inteligente Personalizado */}
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              conselhoInteligente.nivel === 'critico'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-950 dark:text-red-100'
                : conselhoInteligente.nivel === 'alerta' || conselhoInteligente.nivel === 'aviso'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                  : conselhoInteligente.nivel === 'sucesso'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold">{conselhoInteligente.titulo}</h3>
                <p className="text-xs opacity-90 leading-relaxed">{conselhoInteligente.mensagem}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAbaAtiva('educacao')}
              className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              Ver Guia para Iniciantes
            </button>
          </div>

          {/* Gráfico de Evolução Mensal / Anual + Regra 50/30/20 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evolução Mensal / Anual (SVG Limpo) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {modoGraficoEvolucao === 'mensal'
                      ? `Evolução Mensal (${anoSelecionado})`
                      : 'Evolução Anual Comparativa'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comparação direta entre entradas (verde) e saídas (vermelho).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {modoGraficoEvolucao === 'mensal' && (
                    <select
                      value={anoSelecionado}
                      onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {[anoAtualPadrao - 2, anoAtualPadrao - 1, anoAtualPadrao, anoAtualPadrao + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setModoGraficoEvolucao('mensal')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        modoGraficoEvolucao === 'mensal'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoGraficoEvolucao('anual')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        modoGraficoEvolucao === 'anual'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 720 240" className="w-full min-w-[540px] h-56">
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 200 - pct * 170;
                    const labelVal = Math.round(maxValorGrafico * pct);
                    return (
                      <g key={i}>
                        <line x1="65" y1={y} x2="705" y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
                        <text x="60" y={y + 4} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono">
                          {labelVal >= 1000 ? `${Math.round(labelVal / 1000)}k` : labelVal}
                        </text>
                      </g>
                    );
                  })}
                  {serieGraficoAtiva.map((item, idx) => {
                    const groupWidth = 630 / Math.max(1, serieGraficoAtiva.length);
                    const xCenter = 70 + idx * groupWidth + groupWidth / 2;
                    const barW = Math.min(20, Math.max(8, groupWidth * 0.28));
                    const hRec = (item.receitas / maxValorGrafico) * 170;
                    const hDesp = (item.despesas / maxValorGrafico) * 170;
                    const isSelectedBar = modoGraficoEvolucao === 'mensal' && item.chave === mesSelecionado;
                    return (
                      <g
                        key={item.chave}
                        className="cursor-pointer"
                        onClick={() => {
                          if (modoGraficoEvolucao === 'mensal') setMesSelecionado(item.chave);
                        }}
                      >
                        {isSelectedBar && (
                          <rect
                            x={xCenter - barW - 5}
                            y={24}
                            width={barW * 2 + 12}
                            height={180}
                            rx={6}
                            className="fill-blue-50/70 dark:fill-blue-950/30"
                          />
                        )}
                        <rect
                          x={xCenter - barW - 1}
                          y={200 - hRec}
                          width={barW}
                          height={Math.max(2, hRec)}
                          rx={3}
                          fill="#16A34A"
                        >
                          <title>{`${item.label} · Receitas: ${formatKz(item.receitas)}`}</title>
                        </rect>
                        <rect
                          x={xCenter + 1}
                          y={200 - hDesp}
                          width={barW}
                          height={Math.max(2, hDesp)}
                          rx={3}
                          fill="#DC2626"
                        >
                          <title>{`${item.label} · Despesas: ${formatKz(item.despesas)}`}</title>
                        </rect>
                        <text
                          x={xCenter}
                          y={220}
                          textAnchor="middle"
                          className={`text-[10px] font-semibold ${
                            isSelectedBar ? 'fill-blue-700 dark:fill-blue-400' : 'fill-slate-500 dark:fill-slate-400'
                          }`}
                        >
                          {item.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" /> Receitas
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-red-600 inline-block" /> Despesas
                  </span>
                </div>
                <span className="text-[11px]">Clique num mês no gráfico para consultar os seus movimentos.</span>
              </div>
            </div>

            {/* Regra 50/30/20 + Distribuição por Categoria */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Equilíbrio 50 / 30 / 20</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparação dos gastos de {mesExtensoSelecionado} com a regra recomendada para iniciantes.
                </p>
              </div>

              {(() => {
                const baseRenda = Math.max(resumoMes.receitas, resumoMes.despesas, 1);
                const pctNec = Math.round((resumoMes.necessidades / baseRenda) * 100);
                const pctDes = Math.round((resumoMes.desejos / baseRenda) * 100);
                const pctPoup = Math.max(0, Math.round(((resumoMes.poupancaDividas + Math.max(0, resumoMes.saldo)) / baseRenda) * 100));
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Necessidades (Meta: ≤ 50%)</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">{pctNec}% · {formatKz(resumoMes.necessidades)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${pctNec > 55 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, pctNec)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Desejos & Lazer (Meta: ≤ 30%)</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">{pctDes}% · {formatKz(resumoMes.desejos)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${pctDes > 30 ? 'bg-red-600' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, pctDes)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Poupança & Dívidas (Meta: ≥ 20%)</span>
                        <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{pctPoup}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, pctPoup)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Principais Categorias de Despesa</h3>
                {resumoMes.categoriasOrdenadas.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nenhuma despesa registada em {mesExtensoSelecionado}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {resumoMes.categoriasOrdenadas.slice(0, 5).map(cat => (
                      <div key={cat.categoria} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[175px]">{cat.categoria}</span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatKz(cat.total)} ({cat.pctDespesas}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-700 dark:bg-blue-500" style={{ width: `${Math.min(100, cat.pctDespesas)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: RECEITAS & DESPESAS                                            */}
      {/* ===================================================================== */}
      {abaAtiva === 'movimentos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={buscaMovimento}
                  onChange={(e) => setBuscaMovimento(e.target.value)}
                  placeholder="Procurar descrição ou categoria..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white w-56 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <select
                value={escopoMovimentos}
                onChange={(e) => setEscopoMovimentos(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
              >
                <option value="mes">Apenas {mesExtensoSelecionado}</option>
                <option value="ano">Todo o ano {anoSelecionado}</option>
                <option value="todos">Todos os movimentos</option>
              </select>

              <select
                value={filtroTipoMov}
                onChange={(e) => setFiltroTipoMov(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
              >
                <option value="Todos">Receitas e Despesas</option>
                <option value="Receita">Apenas Receitas</option>
                <option value="Despesa">Apenas Despesas</option>
              </select>

              <select
                value={filtroCategoriaMov}
                onChange={(e) => setFiltroCategoriaMov(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
              >
                <option value="TODAS">Todas as Categorias</option>
                {CATEGORIAS_RECEITA.map(c => (
                  <option key={`r-${c}`} value={c}>[Receita] {c}</option>
                ))}
                {CATEGORIAS_DESPESA.map(c => (
                  <option key={`d-${c.nome}`} value={c.nome}>[Despesa] {c.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>{movimentosFiltrados.length} movimento(s)</span>
            </div>
          </div>

          {movimentosFiltrados.length === 0 ? (
            <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Wallet className="w-8 h-8 mx-auto text-slate-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sem movimentos neste período</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registe uma receita ou despesa para acompanhar o seu fluxo financeiro.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => abrirNovaTransacao('Receita')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  + Registar Receita
                </button>
                <button
                  type="button"
                  onClick={() => abrirNovaTransacao('Despesa')}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  + Registar Despesa
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {movimentosFiltrados.map(mov => (
                    <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatarDataAngolana(mov.data)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        <span className={mov.tipo === 'Receita' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {mov.categoria}
                        {mov.recorrente && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500"> · Fixa</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium">
                        <div>{mov.descricao}</div>
                        {mov.notas && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{mov.notas}</div>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                          mov.tipo === 'Receita' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {mov.tipo === 'Receita' ? '+' : '-'} {formatKz(mov.valorKz)}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditarTransacao(mov)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setItemParaEliminar({ tipo: 'transacao', id: mov.id, rotulo: `${mov.descricao} (${formatKz(mov.valorKz)})` })
                            }
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: PLANEAMENTO & ORÇAMENTO MENSAL                                 */}
      {/* ===================================================================== */}
      {abaAtiva === 'orcamento' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Orçamento Mensal · {mesExtensoSelecionado}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Defina um limite máximo em Kz para cada categoria de despesa. O painel avisa automaticamente quando atingir 80% ou ultrapassar o limite.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopiarOrcamentoMesAnterior}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar do Mês Anterior</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Orçamentado</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatKz(resumoOrcamento.totalPlaneado)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Gasto nas Categorias Planeadas</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatKz(resumoOrcamento.totalGastoNoPlaneado)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Disponível no Orçamento</span>
              <p
                className={`text-lg font-bold tabular-nums ${
                  resumoOrcamento.totalPlaneado - resumoOrcamento.totalGastoNoPlaneado >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatKz(resumoOrcamento.totalPlaneado - resumoOrcamento.totalGastoNoPlaneado)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIAS_DESPESA.map(cat => {
              const limiteObj = orcamentosMes.find(o => o.categoria === cat.nome);
              const limite = limiteObj?.limiteMensalKz || 0;
              const gasto = transacoesMes
                .filter(t => t.tipo === 'Despesa' && t.categoria === cat.nome)
                .reduce((acc, t) => acc + (Number(t.valorKz) || 0), 0);
              const pct = limite > 0 ? Math.round((gasto / limite) * 100) : 0;
              const estadoTexto =
                limite === 0
                  ? 'Sem limite definido'
                  : pct > 100
                    ? 'Acima do orçamento'
                    : pct >= 80
                      ? 'Perto do limite'
                      : 'Dentro do limite';
              return (
                <div
                  key={cat.nome}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cat.nome}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Gasto atual: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatKz(gasto)}</span>
                        {limite > 0 && ` · ${pct}% utilizado`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-slate-500 dark:text-slate-400">Limite (Kz):</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={limite || ''}
                        placeholder="0"
                        onChange={(e) => handleAlterarLimiteOrcamento(cat.nome, e.target.value)}
                        className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-right tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        limite === 0
                          ? 'bg-slate-300 dark:bg-slate-700'
                          : pct > 100
                            ? 'bg-red-600'
                            : pct >= 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                      }`}
                      style={{ width: `${limite > 0 ? Math.min(100, pct) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${
                        limite === 0
                          ? 'text-slate-400 dark:text-slate-500'
                          : pct > 100
                            ? 'text-red-600 dark:text-red-400'
                            : pct >= 80
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {estadoTexto}
                    </span>
                    {limite > 0 && (
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        Restante: {formatKz(Math.max(0, limite - gasto))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 4: POUPANÇA & DÍVIDAS                                             */}
      {/* ===================================================================== */}
      {abaAtiva === 'poupanca_dividas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metas de Poupança */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Metas de Poupança</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fundo de emergência, estudos, casa ou projetos pessoais.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditMetaId(null);
                  setMetaTitulo('');
                  setMetaValorAlvo('');
                  setMetaValorAtual('0');
                  setMetaDataLimite('');
                  setShowMetaModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Meta</span>
              </button>
            </div>

            {dados.metasPoupanca.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <Target className="w-7 h-7 mx-auto text-slate-400" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Ainda não criou nenhuma meta de poupança. Comece por um "Fundo de Emergência".
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dados.metasPoupanca.map(meta => {
                  const pct = meta.objetivoKz > 0 ? Math.min(100, Math.round((meta.atualKz / meta.objetivoKz) * 100)) : 0;
                  const concluida = meta.atualKz >= meta.objetivoKz;
                  return (
                    <div key={meta.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{meta.titulo}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatKz(meta.atualKz)} de {formatKz(meta.objetivoKz)} ({pct}%)
                            {meta.prazo && ` · Prazo: ${formatarDataAngolana(meta.prazo)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDepositoMetaAlvo(meta);
                              setDepositoValor('');
                            }}
                            className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold cursor-pointer"
                          >
                            + Depositar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditMetaId(meta.id);
                              setMetaTitulo(meta.titulo);
                              setMetaValorAlvo(String(meta.objetivoKz));
                              setMetaValorAtual(String(meta.atualKz));
                              setMetaDataLimite(meta.prazo || '');
                              setShowMetaModal(true);
                            }}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemParaEliminar({ tipo: 'meta', id: meta.id, rotulo: meta.titulo })}
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${concluida ? 'bg-emerald-600' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{concluida ? 'Meta concluída' : 'Em progresso'}</span>
                        <span className="tabular-nums">Falta: {formatKz(Math.max(0, meta.objetivoKz - meta.atualKz))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Controlo de Dívidas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Dívidas & Prestações</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acompanhe empréstimos, prestações e reduza juros com pagamentos planeados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditDividaId(null);
                  setDivCredor('');
                  setDivDescricao('');
                  setDivTotal('');
                  setDivPago('0');
                  setDivPrestacao('');
                  setDivVencimento('');
                  setShowDividaModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registar Dívida</span>
              </button>
            </div>

            {dados.dividas.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <CreditCard className="w-7 h-7 mx-auto text-slate-400" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Nenhuma dívida ativa registada. Mantenha o foco em evitar juros desnecessários.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dados.dividas.map(div => {
                  const pctPago = div.valorTotalKz > 0 ? Math.min(100, Math.round((div.valorPagoKz / div.valorTotalKz) * 100)) : 0;
                  const restante = Math.max(0, div.valorTotalKz - div.valorPagoKz);
                  return (
                    <div key={div.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {div.credor} · <span className="font-medium text-slate-600 dark:text-slate-300">{div.descricao}</span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            Pago: {formatKz(div.valorPagoKz)} de {formatKz(div.valorTotalKz)} ({pctPago}%)
                            {div.vencimento && ` · Vence: ${formatarDataAngolana(div.vencimento)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {div.estado !== 'Quitada' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagamentoDividaAlvo(div);
                                setPagamentoDividaValor(div.prestacaoMensalKz ? String(div.prestacaoMensalKz) : '');
                              }}
                              className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold cursor-pointer"
                            >
                              Registar Pagamento
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditDividaId(div.id);
                              setDivCredor(div.credor);
                              setDivDescricao(div.descricao);
                              setDivTotal(String(div.valorTotalKz));
                              setDivPago(String(div.valorPagoKz));
                              setDivPrestacao(div.prestacaoMensalKz ? String(div.prestacaoMensalKz) : '');
                              setDivVencimento(div.vencimento || '');
                              setShowDividaModal(true);
                            }}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemParaEliminar({ tipo: 'divida', id: div.id, rotulo: `${div.credor} (${div.descricao})` })}
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${div.estado === 'Quitada' ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${pctPago}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className={div.estado === 'Quitada' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}>
                          {div.estado === 'Quitada' ? 'Dívida Quitada' : 'Em amortização'}
                        </span>
                        <span className="tabular-nums">Em falta: {formatKz(restante)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 5: DICAS & EDUCAÇÃO FINANCEIRA PARA LEIGOS                        */}
      {/* ===================================================================== */}
      {abaAtiva === 'educacao' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Guia Prático de Educação Financeira para Iniciantes
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conceitos simples, sem termos complicados, para tomar decisões financeiras mais seguras no dia-a-dia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                {
                  titulo: '01. Começar do Zero em 3 Passos',
                  resumo: 'Não precisa de ganhar muito para se organizar: o segredo está em saber quanto entra e para onde vai cada kwanza.',
                  pontos: [
                    'Anote TODAS as entradas e saídas durante 30 dias — mesmo os pequenos gastos diários.',
                    'Separe o dinheiro das contas obrigatórias logo no dia em que recebe o salário.',
                    'Guarde primeiro uma pequena quantia (ex.: 5% a 10%) antes de gastar com extras.'
                  ]
                },
                {
                  titulo: '02. A Regra Simples 50 / 30 / 20',
                  resumo: 'Uma fórmula fácil para dividir o seu rendimento mensal sem passar aperto:',
                  pontos: [
                    '50% para Necessidades: alimentação, renda, água, luz, transporte, saúde e educação.',
                    '30% para Desejos: lazer, saídas em família, roupa não urgente e pequenos confortos.',
                    '20% para Poupança e Dívidas: fundo de emergência ou amortização de empréstimos.'
                  ]
                },
                {
                  titulo: '03. O Fundo de Emergência',
                  resumo: 'É a sua rede de proteção contra imprevistos (avaria, doença ou atraso salarial) sem ter de pedir emprestado.',
                  pontos: [
                    'Objetivo inicial: juntar o equivalente a 1 mês das suas despesas essenciais.',
                    'Objetivo ideal: evoluir aos poucos até 3 a 6 meses de despesas essenciais guardados.',
                    'Mantenha este dinheiro separado da conta do dia-a-dia e só use em emergências reais.'
                  ]
                },
                {
                  titulo: '04. Como Sair das Dívidas Mais Depressa',
                  resumo: 'Duas estratégias simples usadas em todo o mundo para eliminar dívidas passo a passo:',
                  pontos: [
                    'Método Bola de Neve: pague primeiro a dívida mais pequena para ganhar alívio e motivação rápida.',
                    'Método Avalanche: foque-se primeiro na dívida com juros mais altos para poupar dinheiro.',
                    'Nunca contraia uma nova dívida cara apenas para cobrir gastos supérfluos.'
                  ]
                },
                {
                  titulo: '05. Os Gastos Invisíveis que Consomem o Salário',
                  resumo: 'Pequenos valores repetidos todos os dias somam grandes quantias no final do ano.',
                  pontos: [
                    'Refeições fora improvisadas, compras por impulso e recargas sem controlo pesam muito.',
                    'Use a regra das 48 horas: antes de comprar algo não essencial, espere dois dias.',
                    'Defina um limite semanal em dinheiro para pequenos gastos pessoais.'
                  ]
                },
                {
                  titulo: '06. Planear Gastos Sazonais com Antecedência',
                  resumo: 'Matrículas, material escolar, viagens e festas acontecem todos os anos — não são surpresa.',
                  pontos: [
                    'Divida o valor anual estimado por 12 meses e crie uma meta aqui no painel.',
                    'Quando chegar a época das propinas ou festas, o dinheiro já estará disponível sem sufoco.',
                    'Reavalie o seu orçamento uma vez por mês durante 10 minutos.'
                  ]
                }
              ].map(card => (
                <div key={card.titulo} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{card.titulo}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{card.resumo}</p>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                    {card.pontos.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Simulador Prático para Iniciantes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Simulador Rápido: Quanto Tempo Vou Levar?</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Faça contas simples antes de assumir um objetivo ou um plano de pagamento.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Simulador de Meta */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Simular Meta de Poupança</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Objetivo Total (Kz)</label>
                    <input
                      type="number"
                      min={0}
                      value={simObjetivoKz}
                      onChange={(e) => setSimObjetivoKz(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Poupança por Mês (Kz)</label>
                    <input
                      type="number"
                      min={0}
                      value={simPoupancaMensalKz}
                      onChange={(e) => setSimPoupancaMensalKz(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                  {mesesSimPoupanca ? (
                    <span>
                      Guardando <strong>{formatKz(Number(simPoupancaMensalKz))}</strong> por mês, atingirá o objetivo em{' '}
                      <strong className="tabular-nums">{mesesSimPoupanca} mês(es)</strong> (~{(mesesSimPoupanca / 12).toFixed(1)} anos).
                    </span>
                  ) : (
                    <span>Preencha ambos os valores para calcular o prazo.</span>
                  )}
                </div>
              </div>

              {/* Simulador de Dívida */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Simular Quitação de Dívida</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Dívida Restante (Kz)</label>
                    <input
                      type="number"
                      min={0}
                      value={simDividaKz}
                      onChange={(e) => setSimDividaKz(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Pagamento Mensal (Kz)</label>
                    <input
                      type="number"
                      min={0}
                      value={simPagamentoMensalKz}
                      onChange={(e) => setSimPagamentoMensalKz(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                  {mesesSimDivida ? (
                    <span>
                      Pagando <strong>{formatKz(Number(simPagamentoMensalKz))}</strong> por mês (sem juros adicionais), ficará livre da dívida em{' '}
                      <strong className="tabular-nums">{mesesSimDivida} prestação(ões)</strong>.
                    </span>
                  ) : (
                    <span>Preencha ambos os valores para calcular o prazo.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NOVA / EDITAR RECEITA OU DESPESA (TOP-ALIGNED)                 */}
      {/* ===================================================================== */}
      {showTransacaoModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editTransacaoId ? 'Editar Movimento Financeiro' : `Registar Nova ${txTipo}`}
              </h3>
              <button type="button" onClick={() => setShowTransacaoModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarTransacao} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['Receita', 'Despesa'] as TipoTransacaoPessoal[]).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setTxTipo(tipo);
                      setTxCategoria(tipo === 'Receita' ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0].nome);
                    }}
                    className={`py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      txTipo === tipo
                        ? tipo === 'Receita'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-red-700 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoria *</label>
                  <select
                    value={txCategoria}
                    onChange={(e) => setTxCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {(txTipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA.map(c => c.nome)).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={txData}
                    onChange={(e) => setTxData(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  value={txDescricao}
                  onChange={(e) => setTxDescricao(e.target.value)}
                  placeholder={txTipo === 'Receita' ? 'Ex: Salário mensal, aula particular...' : 'Ex: Compras da semana, energia, táxi...'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor (Kz) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={txValor}
                  onChange={(e) => setTxValor(e.target.value)}
                  placeholder="Ex: 25000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={txRecorrente}
                  onChange={(e) => setTxRecorrente(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Movimento fixo / recorrente todos os meses</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas (Opcional)</label>
                <textarea
                  rows={2}
                  value={txObservacoes}
                  onChange={(e) => setTxObservacoes(e.target.value)}
                  placeholder="Observações adicionais..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransacaoModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Guardar Movimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL META POUPANÇA */}
      {showMetaModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editMetaId ? 'Editar Meta de Poupança' : 'Nova Meta de Poupança'}
              </h3>
              <button type="button" onClick={() => setShowMetaModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarMeta} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome da Meta *</label>
                <input
                  type="text"
                  required
                  value={metaTitulo}
                  onChange={(e) => setMetaTitulo(e.target.value)}
                  placeholder="Ex: Fundo de Emergência, Formação, Terreno"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor Objetivo (Kz) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={metaValorAlvo}
                    onChange={(e) => setMetaValorAlvo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Já Poupado (Kz)</label>
                  <input
                    type="number"
                    min={0}
                    value={metaValorAtual}
                    onChange={(e) => setMetaValorAtual(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data Limite (Opcional)</label>
                <input
                  type="date"
                  value={metaDataLimite}
                  onChange={(e) => setMetaDataLimite(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowMetaModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer">
                  Guardar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEPÓSITO NA META */}
      {depositoMetaAlvo && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Depositar em "{depositoMetaAlvo.titulo}"</h3>
              <button type="button" onClick={() => setDepositoMetaAlvo(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmarDepositoMeta} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor a Guardar (Kz) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={depositoValor}
                  onChange={(e) => setDepositoValor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold tabular-nums text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDepositoMetaAlvo(null)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer">
                  Confirmar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÍVIDA */}
      {showDividaModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editDividaId ? 'Editar Dívida' : 'Registar Dívida / Prestação'}
              </h3>
              <button type="button" onClick={() => setShowDividaModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarDivida} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Credor / Instituição *</label>
                <input
                  type="text"
                  required
                  value={divCredor}
                  onChange={(e) => setDivCredor(e.target.value)}
                  placeholder="Ex: Banco, Cooperativa, Familiar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  value={divDescricao}
                  onChange={(e) => setDivDescricao(e.target.value)}
                  placeholder="Ex: Crédito pessoal, prestação de computador"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor Total (Kz) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={divTotal}
                    onChange={(e) => setDivTotal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Já Pago (Kz)</label>
                  <input
                    type="number"
                    min={0}
                    value={divPago}
                    onChange={(e) => setDivPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Prestação Mensal (Kz)</label>
                  <input
                    type="number"
                    min={0}
                    value={divPrestacao}
                    onChange={(e) => setDivPrestacao(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={divVencimento}
                    onChange={(e) => setDivVencimento(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowDividaModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer">
                  Guardar Dívida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO DE DÍVIDA */}
      {pagamentoDividaAlvo && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Amortizar "{pagamentoDividaAlvo.credor}"</h3>
              <button type="button" onClick={() => setPagamentoDividaAlvo(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmarPagamentoDivida} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor Pago Agora (Kz) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={pagamentoDividaValor}
                  onChange={(e) => setPagamentoDividaValor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold tabular-nums text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPagamentoDividaAlvo(null)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer">
                  Confirmar Pagamento
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
              Tem a certeza que pretende eliminar <strong>{itemParaEliminar.rotulo}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemParaEliminar(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
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

      {/* DOCUMENTO A4 OFF-SCREEN PARA EXPORTAÇÃO PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px' }}>
        <div id="minhas-financas-pdf-a4" className="bg-white text-slate-900 p-8 font-sans space-y-6">
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Gestão Financeira Pessoal · SGE-NG</p>
              <h1 className="text-lg font-bold text-slate-900 mt-1">Extrato & Resumo Financeiro — {mesExtensoSelecionado}</h1>
              <p className="text-xs text-slate-600">Titular: {currentUser.nomeCompleto} · Emitido em {formatarDataAngolana(hoje.toISOString().split('T')[0])}</p>
            </div>
            {escola?.nomeOficial && (
              <div className="text-right text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700">{escola.nomeOficial}</p>
                <p>Documento de Controlo Privado</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="border border-slate-300 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Receitas do Mês</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">{formatKz(resumoMes.receitas)}</p>
            </div>
            <div className="border border-slate-300 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Despesas do Mês</p>
              <p className="text-sm font-bold text-red-700 mt-1">{formatKz(resumoMes.despesas)}</p>
            </div>
            <div className="border border-slate-300 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo Líquido</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{formatKz(resumoMes.saldo)}</p>
            </div>
            <div className="border border-slate-300 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Reservas / Metas</p>
              <p className="text-sm font-bold text-blue-700 mt-1">{formatKz(totalPoupadoMetas)}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase text-slate-700 mb-2">Movimentos Registados</h2>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Data</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Tipo</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Categoria</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Descrição</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">Valor (Kz)</th>
                </tr>
              </thead>
              <tbody>
                {movimentosFiltrados.map(m => (
                  <tr key={m.id}>
                    <td className="border border-slate-300 px-2 py-1">{formatarDataAngolana(m.data)}</td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold">{m.tipo}</td>
                    <td className="border border-slate-300 px-2 py-1">{m.categoria}</td>
                    <td className="border border-slate-300 px-2 py-1">{m.descricao}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                      {m.tipo === 'Receita' ? '+' : '-'} {formatKz(m.valorKz)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
