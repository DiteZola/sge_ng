import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  FileText, 
  BarChart3, 
  Settings, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  X, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  Trash2, 
  User, 
  Building2,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardCheck,
  Info,
  UserCheck,
  Coins,
  Edit
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Escola, 
  Funcionario, 
  Aluno, 
  Turma, 
  TransacaoFinanceira, 
  DespesaEscolar, 
  ItemPatrimonio, 
  ConfiguracaoFinanceiraEscola, 
  TipoPagamentoEscolar, 
  MetodoPagamentoEscolar, 
  CategoriaDespesaEscolar, 
  CategoriaPatrimonio,
  DelegacaoCobrancaFinanceira,
  TipoEmolumento,
  ItemEmolumentoConfig
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { AngolaDateInput } from './AngolaDateInput';
import {
  normalizarClasse,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO
} from '../services/academicHierarchyService';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';

interface AdministrativeFinanceViewProps {
  escola: Escola;
  currentUser: Funcionario;
  alunos: Aluno[];
  turmas: Turma[];
  initialSubTab?: 'visao_geral' | 'pagamentos' | 'despesas' | 'devedores' | 'patrimonio' | 'configuracao' | 'relatorios';
}

export const AdministrativeFinanceView: React.FC<AdministrativeFinanceViewProps> = ({
  escola,
  currentUser,
  alunos,
  turmas,
  initialSubTab
}) => {
  // Delegações Financeiras
  const [delegacoesLista, setDelegacoesLista] = useState<DelegacaoCobrancaFinanceira[]>(() =>
    dbService.getDelegacoesCobranca(escola.id)
  );
  const minhaDelegacao = delegacoesLista.find(d => d.funcionarioId === currentUser.id && d.ativo);
  const isDirecao = ['DiretorGeral', 'AdminGeral', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(currentUser.role);
  const isUsuarioDelegado = Boolean(minhaDelegacao && !isDirecao);

  // Abas do Módulo do Subdirector Administrativo e Delegações
  const [activeSubTab, setActiveSubTab] = useState<
    'visao_geral' | 'pagamentos' | 'despesas' | 'devedores' | 'patrimonio' | 'configuracao' | 'relatorios' | 'delegacoes' | 'emolumentos'
  >(isUsuarioDelegado ? 'pagamentos' : (initialSubTab || 'visao_geral'));

  useEffect(() => {
    if (isUsuarioDelegado && activeSubTab !== 'pagamentos') {
      setActiveSubTab('pagamentos');
    }
  }, [isUsuarioDelegado]);

  useEffect(() => {
    if (initialSubTab && !isUsuarioDelegado) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, isUsuarioDelegado]);

  // Dados carregados da persistência
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>(() => 
    dbService.getTransacoesFinanceiras(escola.id)
  );
  const [despesas, setDespesas] = useState<DespesaEscolar[]>(() => 
    dbService.getDespesasEscolares(escola.id)
  );
  const [patrimonio, setPatrimonio] = useState<ItemPatrimonio[]>(() => 
    dbService.getPatrimonio(escola.id)
  );
  const [configFinanceira, setConfigFinanceira] = useState<ConfiguracaoFinanceiraEscola>(() => 
    dbService.getConfiguracaoFinanceira(escola.id)
  );
  const [emolumentosCustomizados, setEmolumentosCustomizados] = useState<ItemEmolumentoConfig[]>(() => 
    dbService.getEmolumentosPersonalizados(escola.id)
  );
  const configSistema = dbService.getConfiguracaoSistema();

  // Estados de feedback
  const [feedback, setFeedback] = useState<string | null>(null);
  const notificar = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Modais de Novos Emolumentos Criados pelo Diretor
  const [showNovoEmolumentoModal, setShowNovoEmolumentoModal] = useState(false);
  const [emolIdEdit, setEmolIdEdit] = useState<string | null>(null);
  const [emolNome, setEmolNome] = useState('');
  const [emolValorKz, setEmolValorKz] = useState<number>(5000);
  const [emolPeriodicidade, setEmolPeriodicidade] = useState<'Unico' | 'Mensal' | 'Anual' | 'Por_Solicitacao'>('Por_Solicitacao');
  const [emolClasses, setEmolClasses] = useState<string[]>(['Todas']);
  const [emolObrigatorio, setEmolObrigatorio] = useState(false);
  const [emolDiaVencimento, setEmolDiaVencimento] = useState<number>(10);
  const [emolMultaPct, setEmolMultaPct] = useState<number>(10);
  const [emolDescricao, setEmolDescricao] = useState('');

  // Modais
  const [showNovoPagamentoModal, setShowNovoPagamentoModal] = useState(false);
  const [showNovaDespesaModal, setShowNovaDespesaModal] = useState(false);
  const [showNovoPatrimonioModal, setShowNovoPatrimonioModal] = useState(false);
  const [reciboParaImprimir, setReciboParaImprimir] = useState<TransacaoFinanceira | null>(null);

  // Estados de Delegação de Cobrança
  const [showNovaDelegacaoModal, setShowNovaDelegacaoModal] = useState(false);
  const [delFuncionarioId, setDelFuncionarioId] = useState('');
  const [delEmolumentos, setDelEmolumentos] = useState<TipoEmolumento[]>(['Propina Mensal', 'Confirmação']);
  const [delLimiteKz, setDelLimiteKz] = useState<number | undefined>(undefined);
  const [delPermitirAnulacao, setDelPermitirAnulacao] = useState(false);
  const [delObservacoes, setDelObservacoes] = useState('');

  const todosEmolumentosDisponiveis: TipoEmolumento[] = useMemo(() => {
    const padrao: TipoEmolumento[] = [
      'Propina Mensal',
      'Confirmação',
      'Declaração com Notas',
      'Declaração sem Notas',
      'Certificado de Conclusão',
      'Cartão de Estudante',
      'Exame de Recurso',
      'Matrícula'
    ];
    const customs = emolumentosCustomizados.filter(e => e.ativo !== false).map(e => e.nome as TipoEmolumento);
    return Array.from(new Set([...padrao, ...customs]));
  }, [emolumentosCustomizados]);

  const emolumentosPermitidosFormulario = isUsuarioDelegado && minhaDelegacao
    ? minhaDelegacao.emolumentosPermitidos
    : todosEmolumentosDisponiveis;

  // Estados Formulário Pagamento
  const [pagAlunoId, setPagAlunoId] = useState('');
  const [pagTipo, setPagTipo] = useState<TipoPagamentoEscolar>('Propina Mensal');
  const [pagMes, setPagMes] = useState('Fevereiro 2025');
  const [pagValor, setPagValor] = useState<number>(12000);
  const [pagMetodo, setPagMetodo] = useState<MetodoPagamentoEscolar>('Multicaixa / TPA');
  const [pagComprovativo, setPagComprovativo] = useState('');
  const [pagObservacao, setPagObservacao] = useState('');

  // Estados Formulário Despesa
  const [despDescricao, setDespDescricao] = useState('');
  const [despCategoria, setDespCategoria] = useState<CategoriaDespesaEscolar>('Combustível / Gerador');
  const [despValor, setDespValor] = useState<number>(50000);
  const [despBeneficiario, setDespBeneficiario] = useState('');
  const [despMetodo, setDespMetodo] = useState<MetodoPagamentoEscolar>('Transferência Bancária');
  const [despComprovativo, setDespComprovativo] = useState('');
  const [despObservacao, setDespObservacao] = useState('');

  // Estados Formulário Património
  const [patNome, setPatNome] = useState('');
  const [patCategoria, setPatCategoria] = useState<CategoriaPatrimonio>('Mobiliário Escolar (Carteiras/Secretárias)');
  const [patSala, setPatSala] = useState('');
  const [patQuantidade, setPatQuantidade] = useState<number>(1);
  const [patEstado, setPatEstado] = useState<'Novo' | 'Bom' | 'Regular' | 'Danificado' | 'Para Abate'>('Bom');
  const [patValor, setPatValor] = useState<number>(150000);
  const [patResponsavel, setPatResponsavel] = useState(currentUser.nomeCompleto);

  // Estados de Revisão de Património (Continuidade Plurianual)
  const [itemParaRevisar, setItemParaRevisar] = useState<ItemPatrimonio | null>(null);
  const [revEstado, setRevEstado] = useState<'Novo' | 'Bom' | 'Regular' | 'Danificado' | 'Para Abate'>('Bom');
  const [revStatus, setRevStatus] = useState<'Confirmado' | 'Danificado' | 'Inexistente' | 'Para_Abate'>('Confirmado');
  const [revObs, setRevObs] = useState('');

  const handleSalvarRevisaoPatrimonio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemParaRevisar) return;
    dbService.revisarItemPatrimonio(
      itemParaRevisar.id,
      revEstado,
      revStatus,
      currentUser.nomeCompleto,
      revObs
    );
    setPatrimonio(dbService.getPatrimonio(escola.id));
    setItemParaRevisar(null);
    setRevObs('');
    notificar(`Revisão de inventário para "${itemParaRevisar.nomeItem}" registada com sucesso.`);
  };

  // Filtros de busca com sanitização e proteção anti-ReDoS
  const [buscaPagamento, setBuscaPagamento] = useState('');
  const [buscaDespesa, setBuscaDespesa] = useState('');
  const [buscaPatrimonio, setBuscaPatrimonio] = useState('');
  const [filtroTurmaDevedor, setFiltroTurmaDevedor] = useState('TODAS');

  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  const [modalPagFiltroClasse, setModalPagFiltroClasse] = useState('TODAS');
  const [modalPagBuscaAluno, setModalPagBuscaAluno] = useState('');

  const alunosParaPagamento = useMemo(() => {
    let list = alunos.filter(a => a.escolaId === escola.id);
    if (modalPagFiltroClasse !== 'TODAS') {
      list = list.filter(a => {
        const t = turmas.find(tm => tm.id === a.turmaId);
        const cl = t ? normalizarClasse(t.classe) : normalizarClasse(a.classeId);
        return cl === normalizarClasse(modalPagFiltroClasse);
      });
    }
    if (modalPagBuscaAluno.trim()) {
      list = list.filter(a => 
        safeSearchMatch(a.nomeCompleto, modalPagBuscaAluno) ||
        safeSearchMatch(a.codigoMatricula, modalPagBuscaAluno) ||
        safeSearchMatch(a.numeroProcesso, modalPagBuscaAluno) ||
        safeSearchMatch(a.numeroBI, modalPagBuscaAluno)
      );
    }
    return list;
  }, [alunos, escola.id, modalPagFiltroClasse, modalPagBuscaAluno, turmas]);

  // Cálculos Financeiros
  const totalReceitas = useMemo(() => {
    return transacoes
      .filter(t => t.status === 'Confirmado')
      .reduce((acc, curr) => acc + curr.valorTotalKz, 0);
  }, [transacoes]);

  const totalDespesas = useMemo(() => {
    return despesas.reduce((acc, curr) => acc + curr.valorKz, 0);
  }, [despesas]);

  const saldoEmCaixa = totalReceitas - totalDespesas;

  const totalPatrimonioValor = useMemo(() => {
    return patrimonio.reduce((acc, curr) => acc + (curr.valorEstimadoKz || 0), 0);
  }, [patrimonio]);

  // Alunos Devedores / Inadimplência
  const devedores = useMemo(() => {
    const alunosDaEscola = alunos.filter(a => a.escolaId === escola.id);
    return alunosDaEscola.filter(aluno => {
      // Verifica se o aluno tem pagamento no mês atual
      const pagouMes = transacoes.some(
        t => t.alunoId === aluno.id && t.mesReferencia?.toLowerCase().includes('fevereiro')
      );
      // Se não pagou propina ou está marcado como pendente
      const ehDevedor = (!pagouMes && aluno.propinaStatus !== 'Isento') || aluno.propinaStatus === 'Pendente';
      if (filtroTurmaDevedor !== 'TODAS' && aluno.turmaId !== filtroTurmaDevedor) return false;
      return ehDevedor;
    });
  }, [alunos, escola.id, transacoes, filtroTurmaDevedor]);

  const totalEmDividaEstimado = useMemo(() => {
    return devedores.length * 12000;
  }, [devedores]);

  // Submissão de Novo Pagamento
  const handleRegistrarPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    const aluno = alunos.find(a => a.id === pagAlunoId);
    if (!aluno) {
      alert('Por favor, selecione o aluno.');
      return;
    }

    if (minhaDelegacao?.valorMaximoPorCobrancaKz && pagValor > minhaDelegacao.valorMaximoPorCobrancaKz) {
      alert(`Valor de ${pagValor.toLocaleString('pt-AO')} Kz excede o limite máximo autorizado pelo Diretor Geral (${minhaDelegacao.valorMaximoPorCobrancaKz.toLocaleString('pt-AO')} Kz).`);
      return;
    }

    const turma = turmas.find(t => t.id === aluno.turmaId);
    const classeAluno = aluno.classeId || turma?.classe || '';
    
    // Validação estrita das classes abrangidas pelo emolumento
    const emolConfig = emolumentosCustomizados.find(e => e.nome === pagTipo);
    if (emolConfig && emolConfig.classesAbrangidas && emolConfig.classesAbrangidas.length > 0) {
      const abrangeTodas = emolConfig.classesAbrangidas.includes('Todas');
      const abrangeEsta = emolConfig.classesAbrangidas.some(c => c.toLowerCase() === classeAluno.toLowerCase());
      if (!abrangeTodas && !abrangeEsta) {
        alert(`Cobrança Inválida! O emolumento "${pagTipo}" não é aplicável à classe do aluno (${classeAluno}).\nClasses autorizadas pela Direção: ${emolConfig.classesAbrangidas.join(', ')}.`);
        return;
      }
    }

    const numeroRecibo = `REC-${new Date().getFullYear()}-${String(transacoes.length + 1).padStart(4, '0')}`;
    const obsFinal = minhaDelegacao
      ? `${pagObservacao ? pagObservacao + ' · ' : ''}Cobrança efetuada sob delegação executiva da Direção (${minhaDelegacao.delegadoPorNome})`
      : pagObservacao;

    const novaTransacao: TransacaoFinanceira = {
      id: `trans-${Date.now()}`,
      escolaId: escola.id,
      alunoId: aluno.id,
      alunoNome: aluno.nomeCompleto,
      codigoMatricula: aluno.codigoMatricula,
      turmaNome: turma?.nome || aluno.classeId,
      classe: aluno.classeId,
      tipo: pagTipo,
      mesReferencia: pagTipo === 'Propina Mensal' ? pagMes : undefined,
      anoLectivo: escola.anoLectivoActivo,
      valorKz: pagValor,
      multaKz: 0,
      valorTotalKz: pagValor,
      metodoPagamento: pagMetodo,
      numeroComprovativo: pagComprovativo || undefined,
      numeroRecibo,
      dataHora: new Date().toLocaleString('pt-AO'),
      operadorId: currentUser.id,
      operadorNome: currentUser.nomeCompleto,
      status: 'Confirmado',
      observacao: obsFinal || undefined,
      observacoes: obsFinal || undefined
    };

    dbService.salvarTransacaoFinanceira(novaTransacao);
    setTransacoes(dbService.getTransacoesFinanceiras(escola.id));

    // Auditoria de Cobrança por Operador Delegado
    try {
      const poderes = dbService.verificarPoderesDelegados(currentUser.id, escola.id);
      if (poderes.podeCobrarEmolumentos) {
        dbService.registarAcaoDelegada({
          escolaId: escola.id,
          funcionarioId: currentUser.id,
          funcionarioNome: currentUser.nomeCompleto,
          tipo: 'CobrancaEmolumentos',
          acao: 'Cobranca',
          alunoNome: aluno?.nomeCompleto || 'Discente',
          alunoId: aluno?.id,
          valorCobrado: pagValor,
          numeroRecibo: numeroRecibo,
          formaPagamento: pagMetodo,
          detalhes: `Recebimento de emolumento (${pagTipo}) de ${pagValor.toLocaleString('pt-AO')} Kz (Recibo nº ${numeroRecibo}) averbado por operador delegado.`
        });
      }
    } catch {}

    setShowNovoPagamentoModal(false);
    setReciboParaImprimir(novaTransacao);
    notificar(`Pagamento registado com sucesso! Recibo nº ${numeroRecibo} emitido.`);
  };

  // Gestão de Novos Tipos de Emolumentos Criados pelo Diretor
  const handleSalvarNovoEmolumento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emolNome.trim()) {
      alert('Por favor, informe o nome do emolumento.');
      return;
    }
    if (emolValorKz <= 0) {
      alert('O valor padrão do emolumento deve ser maior que zero.');
      return;
    }
    if (emolClasses.length === 0) {
      alert('Selecione ao menos uma classe abrangida ou marque "Todas".');
      return;
    }

    const item: ItemEmolumentoConfig = {
      id: emolIdEdit || `emol-${Date.now()}`,
      escolaId: escola.id,
      nome: emolNome.trim(),
      valorPadraoKz: emolValorKz,
      periodicidade: emolPeriodicidade,
      classesAbrangidas: emolClasses,
      obrigatorio: emolObrigatorio,
      diaVencimento: emolDiaVencimento,
      multaAtrasoPercentual: emolMultaPct,
      descricao: emolDescricao.trim(),
      ativo: true,
      criadoPorNome: currentUser.nomeCompleto,
      dataCriacao: new Date().toISOString().split('T')[0]
    };

    dbService.salvarEmolumentoPersonalizado(item);
    setEmolumentosCustomizados(dbService.getEmolumentosPersonalizados(escola.id));
    setShowNovoEmolumentoModal(false);
    setEmolIdEdit(null);
    setEmolNome('');
    setEmolValorKz(5000);
    setEmolClasses(['Todas']);
    setEmolDescricao('');
    notificar(`Emolumento "${item.nome}" configurado e validado com sucesso!`);
  };

  const handleExcluirEmolumento = (id: string) => {
    if (!window.confirm('Tem a certeza que deseja remover este emolumento do sistema?')) return;
    dbService.removerEmolumentoPersonalizado(escola.id, id);
    setEmolumentosCustomizados(dbService.getEmolumentosPersonalizados(escola.id));
    notificar('Emolumento removido com sucesso.');
  };

  // Gestão de Delegações Financeiras da Escola
  const handleSalvarNovaDelegacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delFuncionarioId || delEmolumentos.length === 0) {
      notificar('Selecione o colaborador e ao menos um emolumento para delegar.');
      return;
    }
    const funcs = dbService.getFuncionarios();
    const func = funcs.find(f => f.id === delFuncionarioId);
    if (!func) return;

    const novaDelegacao: DelegacaoCobrancaFinanceira = {
      id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      funcionarioId: func.id,
      funcionarioNome: func.nomeCompleto,
      cargo: func.cargo || func.role,
      role: func.role,
      ativo: true,
      emolumentosPermitidos: delEmolumentos,
      valorMaximoPorCobrancaKz: delLimiteKz && delLimiteKz > 0 ? delLimiteKz : undefined,
      permitirAnulacao: delPermitirAnulacao,
      dataDelegacao: new Date().toISOString(),
      delegadoPorNome: escola.diretorGeralNome || currentUser.nomeCompleto,
      observacoes: delObservacoes || undefined
    };

    dbService.salvarDelegacaoCobranca(escola.id, novaDelegacao);
    setDelegacoesLista(dbService.getDelegacoesCobranca(escola.id));
    setShowNovaDelegacaoModal(false);
    setDelFuncionarioId('');
    setDelObservacoes('');
    notificar(`Cobranças financeiras delegadas com sucesso ao colaborador "${func.nomeCompleto}" (${novaDelegacao.cargo})!`);
  };

  const handleRevogarDelegacao = (delId: string) => {
    dbService.removerDelegacaoCobranca(escola.id, delId);
    setDelegacoesLista(dbService.getDelegacoesCobranca(escola.id));
    notificar('Delegação financeira revogada pelo Diretor Geral.');
  };

  // Submissão de Nova Despesa
  const handleRegistrarDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!despDescricao || despValor <= 0) {
      alert('Preencha a descrição e valor da despesa.');
      return;
    }

    const novaDespesa: DespesaEscolar = {
      id: `desp-${Date.now()}`,
      escolaId: escola.id,
      descricao: despDescricao,
      categoria: despCategoria,
      valorKz: despValor,
      dataHora: new Date().toLocaleString('pt-AO'),
      beneficiario: despBeneficiario || 'Fornecedor Credenciado',
      metodoPagamento: despMetodo,
      numeroComprovativo: despComprovativo || undefined,
      registadoPorNome: currentUser.nomeCompleto,
      aprovadoPorNome: escola.diretorGeralNome || 'Diretor Geral',
      observacao: despObservacao || undefined
    };

    dbService.salvarDespesaEscolar(novaDespesa);
    setDespesas(dbService.getDespesasEscolares(escola.id));
    setShowNovaDespesaModal(false);
    setDespDescricao('');
    notificar(`Despesa de ${despValor.toLocaleString()} Kz debitada com sucesso.`);
  };

  // Submissão de Tombamento de Património
  const handleRegistrarPatrimonio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patNome.trim()) return;

    const codigoTombamento = `PAT-${escola.sigla || 'ESC'}-${new Date().getFullYear()}-${String(patrimonio.length + 1).padStart(3, '0')}`;

    const novoItem: ItemPatrimonio = {
      id: `pat-${Date.now()}`,
      escolaId: escola.id,
      codigoTombamento,
      nomeItem: patNome,
      categoria: patCategoria,
      salaLocalizacao: patSala || 'Geral / Almoxarifado',
      quantidade: patQuantidade,
      estadoConservacao: patEstado,
      dataAquisicao: new Date().toISOString().split('T')[0],
      valorEstimadoKz: patValor,
      responsavelNome: patResponsavel
    };

    dbService.salvarItemPatrimonio(novoItem);
    setPatrimonio(dbService.getPatrimonio(escola.id));
    setShowNovoPatrimonioModal(false);
    setPatNome('');
    notificar(`Item patrimonial tombado com o código ${codigoTombamento}.`);
  };

  const handleEliminarPatrimonio = (id: string, nome: string) => {
    if (confirm(`Confirmar abate / remoção de património: "${nome}"?`)) {
      dbService.eliminarItemPatrimonio(id);
      setPatrimonio(dbService.getPatrimonio(escola.id));
      notificar(`Item removido do inventário patrimonial.`);
    }
  };

  // Salvar Configurações Financeiras
  const handleSalvarConfigFinanceira = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.salvarConfiguracaoFinanceira(configFinanceira);
    notificar('Tabela de propinas, taxas e parâmetros bancários atualizados com sucesso.');
  };

  // Dados para gráficos (Recharts)
  const dadosGraficoMensal = [
    { mes: 'Nov', Receitas: totalReceitas * 0.75, Despesas: totalDespesas * 0.6 },
    { mes: 'Dez', Receitas: totalReceitas * 0.85, Despesas: totalDespesas * 0.75 },
    { mes: 'Jan', Receitas: totalReceitas * 0.9, Despesas: totalDespesas * 0.8 },
    { mes: 'Fev', Receitas: totalReceitas, Despesas: totalDespesas }
  ];

  const dadosGraficoCategorias = [
    { name: 'Propinas Mensais', value: 75, color: '#2563eb' },
    { name: 'Confirmações & Matrículas', value: 15, color: '#10b981' },
    { name: 'Declarações & Certificados', value: 7, color: '#f59e0b' },
    { name: 'Cartões & Outros', value: 3, color: '#8b5cf6' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Institucional do Subdirector Administrativo */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Subdirecção Administrativa & Financeira • {escola.nomeOficial}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Gestão Financeira, Controlo de Propinas & Património
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Módulo oficial de arrecadação de receitas, emissão de recibos, controlo de despesas correntes, gestão de alunos devedores e inventário patrimonial tombado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowNovoPagamentoModal(true)}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Registar Pagamento / Recibo</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNovaDespesaModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <TrendingDown className="h-4 w-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Banner de Delegação Financeira Estrita */}
      {isUsuarioDelegado && minhaDelegacao && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-sm border border-blue-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-200 rounded-xl border border-blue-400/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-300 block">
                Módulo Financeiro sob Delegação Executiva da Direção Geral
              </span>
              <p className="text-xs text-white">
                Autorizado a efetuar cobranças estritas de: <strong>{minhaDelegacao.emolumentosPermitidos.join(', ')}</strong>
                {minhaDelegacao.valorMaximoPorCobrancaKz ? ` · Limite: ${minhaDelegacao.valorMaximoPorCobrancaKz.toLocaleString('pt-AO')} Kz por recibo` : ''}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/30 border border-blue-300/40 text-blue-100 self-start sm:self-auto">
            Delegado por: {minhaDelegacao.delegadoPorNome || 'Diretor Geral'}
          </span>
        </div>
      )}

      {/* Navegação de Sub-Abas */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 bg-gray-50/80 p-1.5 rounded-xl">
        {!isUsuarioDelegado && (
          <button
            onClick={() => setActiveSubTab('visao_geral')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'visao_geral' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Painel Financeiro</span>
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('pagamentos')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'pagamentos' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Pagamentos & Recibos ({transacoes.length})</span>
          {isUsuarioDelegado && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 ml-1">
              Delegado
            </span>
          )}
        </button>

        {!isUsuarioDelegado && (
          <>
            <button
              onClick={() => setActiveSubTab('despesas')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                activeSubTab === 'despesas' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>Despesas & Caixa ({despesas.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('devedores')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                activeSubTab === 'devedores' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Alunos Devedores ({devedores.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('patrimonio')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                activeSubTab === 'patrimonio' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Património & Inventário ({patrimonio.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('configuracao')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                activeSubTab === 'configuracao' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Tabela de Propinas & Taxas</span>
            </button>

            {isDirecao && (
              <button
                onClick={() => setActiveSubTab('emolumentos')}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                  activeSubTab === 'emolumentos' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Emolumentos & Serviços ({todosEmolumentosDisponiveis.length})</span>
              </button>
            )}

            {isDirecao && (
              <button
                onClick={() => setActiveSubTab('delegacoes')}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                  activeSubTab === 'delegacoes' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Delegações de Cobrança ({delegacoesLista.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('relatorios')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
                activeSubTab === 'relatorios' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Balanço & Estatísticas</span>
            </button>
          </>
        )}
      </div>

      {/* ========================================== */}
      {/* ABA 1: VISÃO GERAL & PAINEL FINANCEIRO     */}
      {/* ========================================== */}
      {activeSubTab === 'visao_geral' && (
        <div className="space-y-6">
          {/* 4 Cards de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Receitas Arrecadadas</span>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                {totalReceitas.toLocaleString('pt-AO')} <span className="text-xs text-gray-500 font-bold">Kz</span>
              </p>
              <div className="flex items-center space-x-1 text-[11px] text-emerald-700 font-medium mt-1">
                <span>Total de pagamentos confirmados</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Despesas Correntes</span>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-700 mt-2">
                {totalDespesas.toLocaleString('pt-AO')} <span className="text-xs text-gray-500 font-bold">Kz</span>
              </p>
              <div className="flex items-center space-x-1 text-[11px] text-rose-700 font-medium mt-1">
                <span>Combustível, material e manutenção</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saldo em Caixa / Banco</span>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className={`text-2xl font-black mt-2 ${saldoEmCaixa >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                {saldoEmCaixa.toLocaleString('pt-AO')} <span className="text-xs text-gray-500 font-bold">Kz</span>
              </p>
              <div className="flex items-center space-x-1 text-[11px] text-blue-700 font-medium mt-1">
                <span>Disponibilidade líquida atual</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total em Dívida</span>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-800 mt-2">
                {totalEmDividaEstimado.toLocaleString('pt-AO')} <span className="text-xs text-gray-500 font-bold">Kz</span>
              </p>
              <div className="flex items-center space-x-1 text-[11px] text-amber-700 font-medium mt-1">
                <span>{devedores.length} estudantes com propina pendente</span>
              </div>
            </div>
          </div>

          {/* Gráficos Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Evolução Mensal: Receitas vs Despesas</h3>
                  <p className="text-xs text-gray-500">Fluxo comparativo de caixa no ano lectivo activo</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                  Em Kwanzas (Kz)
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoMensal}>
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip 
                      formatter={(v: any) => [`${Number(v).toLocaleString()} Kz`, '']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                    <Bar dataKey="Receitas" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900">Distribuição das Receitas</h3>
                  <PieIcon className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mb-4">Origem dos fundos arrecadados</p>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGraficoCategorias}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {dadosGraficoCategorias.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v}%`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-100 text-xs">
                {dadosGraficoCategorias.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resumo Rápido de Património */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-indigo-300" />
              </div>
              <div>
                <h4 className="text-base font-bold">Património Físico da Instituição</h4>
                <p className="text-xs text-slate-300">
                  Total de {patrimonio.length} lotes de bens tombados • Valor inventariado: <strong>{totalPatrimonioValor.toLocaleString('pt-AO')} Kz</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('patrimonio')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Consultar Inventário
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 2: PAGAMENTOS & EMISSÃO DE RECIBOS     */}
      {/* ========================================== */}
      {activeSubTab === 'pagamentos' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Histórico de Pagamentos & Recibos Emitidos</h3>
              <p className="text-xs text-gray-500">Registo contínuo de entradas financeiras da escola</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaPagamento}
                  onChange={(e) => setBuscaPagamento(sanitizeSearchInput(e.target.value, 80))}
                  maxLength={80}
                  placeholder="Buscar recibo, aluno ou matrícula..."
                  className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 w-64"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNovoPagamentoModal(true)}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Pagamento</span>
              </button>
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Recibo N.º</th>
                  <th className="py-3 px-3">Aluno / Processo</th>
                  <th className="py-3 px-3">Turma / Classe</th>
                  <th className="py-3 px-3">Tipo / Referência</th>
                  <th className="py-3 px-3">Valor (Kz)</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Data / Operador</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transacoes
                  .filter(t => 
                    t.alunoNome.toLowerCase().includes(buscaPagamento.toLowerCase()) ||
                    t.numeroRecibo.toLowerCase().includes(buscaPagamento.toLowerCase()) ||
                    t.codigoMatricula.toLowerCase().includes(buscaPagamento.toLowerCase())
                  )
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {t.numeroRecibo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{t.alunoNome}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{t.codigoMatricula}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-700">
                        {t.turmaNome || t.classe}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800">{t.tipo}</span>
                        {t.mesReferencia && (
                          <span className="block text-[10px] text-gray-500">{t.mesReferencia}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {t.valorTotalKz.toLocaleString()} Kz
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {t.metodoPagamento}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-gray-900 font-medium">{t.dataHora}</div>
                        <div className="text-[10px] text-gray-500">{t.operadorNome}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setReciboParaImprimir(t)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Ver Recibo</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: DESPESAS ESCOLARES                  */}
      {/* ========================================== */}
      {activeSubTab === 'despesas' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Registo e Justificação de Despesas</h3>
              <p className="text-xs text-gray-500">Saídas de caixa, combustível do gerador, manutenção e material de expediente</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaDespesa}
                  onChange={(e) => setBuscaDespesa(e.target.value)}
                  placeholder="Buscar despesa ou fornecedor..."
                  className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-600 w-64"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNovaDespesaModal(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Despesa</span>
              </button>
            </div>
          </div>

          {/* Tabela de Despesas */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Descrição da Despesa</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Beneficiário / Fornecedor</th>
                  <th className="py-3 px-3">Valor (Kz)</th>
                  <th className="py-3 px-3">Método / Comprovativo</th>
                  <th className="py-3 px-3">Data / Autorização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {despesas
                  .filter(d => 
                    d.descricao.toLowerCase().includes(buscaDespesa.toLowerCase()) ||
                    d.beneficiario.toLowerCase().includes(buscaDespesa.toLowerCase())
                  )
                  .map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{d.descricao}</div>
                        {d.observacao && <div className="text-[10px] text-gray-500 italic">{d.observacao}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {d.categoria}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-700">
                        {d.beneficiario}
                      </td>
                      <td className="py-2.5 px-3 font-black text-rose-700">
                        -{d.valorKz.toLocaleString()} Kz
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        <div>{d.metodoPagamento}</div>
                        {d.numeroComprovativo && (
                          <div className="text-[10px] text-gray-500 font-mono">Doc: {d.numeroComprovativo}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-gray-900">{d.dataHora}</div>
                        <div className="text-[10px] text-gray-500">Aprovado: {d.aprovadoPorNome}</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: ALUNOS DEVEDORES                    */}
      {/* ========================================== */}
      {activeSubTab === 'devedores' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Controlo de Inadimplência & Propinas Pendentes
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Alunos com mensalidades em aberto e aplicação de coima legal por atraso (10% MED).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-gray-600">Filtrar por Turma:</label>
              <select
                value={filtroTurmaDevedor}
                onChange={(e) => setFiltroTurmaDevedor(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-amber-500"
              >
                <option value="TODAS">Todas as Turmas</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.classe})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/70 text-amber-950 font-bold border-b border-amber-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Estudante</th>
                  <th className="py-3 px-3">Nº Matrícula</th>
                  <th className="py-3 px-3">Turma / Classe</th>
                  <th className="py-3 px-3">Mês Pendente</th>
                  <th className="py-3 px-3">Encarregado / Contacto</th>
                  <th className="py-3 px-3">Valor Estimado</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devedores.map((aluno) => {
                  const turma = turmas.find(t => t.id === aluno.turmaId);
                  return (
                    <tr key={aluno.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{aluno.nomeCompleto}</div>
                        <div className="text-[10px] text-gray-500">BI: {aluno.numeroBI || aluno.numeroDocumento}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-700">
                        {aluno.codigoMatricula}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {turma?.nome || aluno.classeId}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Fevereiro 2025 (Pendente)
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-800">{aluno.nomeEncarregado || 'Encarregado de Educação'}</div>
                        <div className="text-[10px] text-gray-500">{aluno.telefoneEncarregado || '+244 923 000 000'}</div>
                      </td>
                      <td className="py-2.5 px-3 font-black text-rose-700">
                        12.000 Kz <span className="text-[10px] text-gray-400 font-normal">(+10% multa)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setPagAlunoId(aluno.id);
                            setPagTipo('Propina Mensal');
                            setPagValor(13200); // 12000 + 10%
                            setShowNovoPagamentoModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Liquidar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 5: PATRIMÓNIO & INVENTÁRIO             */}
      {/* ========================================== */}
      {activeSubTab === 'patrimonio' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          {/* Banner de Continuidade de Património Multi-Ano */}
          <div className="p-4 bg-indigo-50 border-2 border-indigo-400 rounded-2xl flex items-start space-x-3 shadow-xs">
            <Info className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-indigo-950">
                Património Permanente & Revisão Plurianual
              </h4>
              <p className="text-xs text-indigo-900 mt-0.5 leading-relaxed">
                Ao contrário dos dados escolares transitórios (alunos e turmas que se renovam a cada ano letivo), o <strong>património físico da instituição continua permanentemente</strong>. Utilize o botão de revisão (<ClipboardCheck className="inline h-3.5 w-3.5 text-indigo-700 mx-0.5" />) para auditar cada item, atualizar o estado de conservação ou sinalizar bens danificados e extraviados/inexistentes (abate de inventário).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Inventário Físico & Tombamento Patrimonial</h3>
              <p className="text-xs text-gray-500">Mobiliário, carteiras escolares, geradores, computadores e equipamentos da escola</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaPatrimonio}
                  onChange={(e) => setBuscaPatrimonio(e.target.value)}
                  placeholder="Buscar bem tombado ou sala..."
                  className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 w-64"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNovoPatrimonioModal(true)}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Tombar Novo Item</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Código Tombamento</th>
                  <th className="py-3 px-3">Descrição do Bem</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Localização / Sala</th>
                  <th className="py-3 px-3">Qtd</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Valor Estimado</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patrimonio
                  .filter(p => {
                    const nome = p.designacao || p.nomeItem || '';
                    const cod = p.codigoTombo || p.codigoTombamento || '';
                    const sala = p.localizacao || p.salaLocalizacao || '';
                    return nome.toLowerCase().includes(buscaPatrimonio.toLowerCase()) ||
                           cod.toLowerCase().includes(buscaPatrimonio.toLowerCase()) ||
                           sala.toLowerCase().includes(buscaPatrimonio.toLowerCase());
                  })
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                        {p.codigoTombo || p.codigoTombamento}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{p.designacao || p.nomeItem}</div>
                        <div className="text-[10px] text-gray-500">Adquirido em: {p.dataAquisicao}</div>
                        {p.revisadoEm && (
                          <div className="text-[9px] text-indigo-600 font-medium mt-0.5">
                            Revisado em {p.revisadoEm} {p.revisadoPor ? `(${p.revisadoPor})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 font-medium">
                        {p.categoria}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {p.localizacao || p.salaLocalizacao}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {p.quantidade} un.
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.estadoConservacao === 'Novo' ? 'bg-emerald-100 text-emerald-800' :
                          p.estadoConservacao === 'Bom' ? 'bg-blue-100 text-blue-800' :
                          p.estadoConservacao === 'Regular' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.estadoConservacao}
                        </span>
                        {p.statusInventario && p.statusInventario !== 'Confirmado' && (
                          <span className="block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                            {p.statusInventario === 'Inexistente' ? '❌ Inexistente' : p.statusInventario === 'Danificado' ? '⚠️ Danificado' : '🗑️ Para Abate'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {(p.valorEstimadoKz || 0).toLocaleString()} Kz
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setItemParaRevisar(p);
                            setRevEstado(p.estadoConservacao as any || 'Bom');
                            setRevStatus((p.statusInventario as any) || 'Confirmado');
                            setRevObs(p.observacoes || '');
                          }}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors mr-1"
                          title="Revisar Estado do Bem (Danificado / Inexistente / Bom)"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarPatrimonio(p.id, p.designacao || p.nomeItem || 'Item')}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Remover / Abate de Património"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Modal de Revisão Anual de Património */}
          {itemParaRevisar && (
            <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                    <span>Revisão Anual de Património</span>
                  </h3>
                  <button onClick={() => setItemParaRevisar(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl mb-4 text-xs space-y-1">
                  <div><strong>Item:</strong> {itemParaRevisar.nomeItem}</div>
                  <div><strong>Tombamento:</strong> <span className="font-mono text-indigo-700">{itemParaRevisar.codigoTombamento}</span></div>
                  <div><strong>Localização:</strong> {itemParaRevisar.salaLocalizacao}</div>
                </div>

                <form onSubmit={handleSalvarRevisaoPatrimonio} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Status de Existência / Inventário *</label>
                    <select
                      value={revStatus}
                      onChange={(e) => setRevStatus(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <option value="Confirmado">✅ Confirmado (Existe e Localizado)</option>
                      <option value="Danificado">⚠️ Danificado / Necessita Reparação</option>
                      <option value="Inexistente">❌ Já Não Existe (Extraviado / Inexistente)</option>
                      <option value="Para_Abate">🗑️ Para Abate Oficial de Património</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Estado de Conservação Físico *</label>
                    <select
                      value={revEstado}
                      onChange={(e) => setRevEstado(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs cursor-pointer"
                    >
                      <option value="Novo">Novo</option>
                      <option value="Bom">Bom</option>
                      <option value="Regular">Regular</option>
                      <option value="Danificado">Mau / Danificado</option>
                      <option value="Para Abate">Para Abate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Observações da Vistoria</label>
                    <textarea
                      rows={3}
                      value={revObs}
                      onChange={(e) => setRevObs(e.target.value)}
                      placeholder="Ex: Vistoriado no início do ano letivo; tampo quebrado, transferido para manutenção ou desaparecido..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setItemParaRevisar(null)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer shadow-xs"
                    >
                      Salvar Revisão
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 6: CONFIGURAÇÃO FINANCEIRA             */}
      {/* ========================================== */}
      {activeSubTab === 'configuracao' && (
        <form onSubmit={handleSalvarConfigFinanceira} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">Parâmetros Financeiros, Propinas & Taxas da Instituição</h3>
            <p className="text-xs text-gray-500">Definição dos valores padrão para o ano lectivo em curso</p>
          </div>

          {/* Tabela de Propinas por Classe */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Tabela de Propinas Mensais por Classe (Kz)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(configFinanceira.propinasPorClasse).map(([classe, valor]) => (
                <div key={classe} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <label className="block text-xs font-bold text-slate-700">{classe} Classe</label>
                  <input
                    type="number"
                    value={valor}
                    onChange={(e) => {
                      const novo = Number(e.target.value);
                      setConfigFinanceira(prev => ({
                        ...prev,
                        propinasPorClasse: {
                          ...prev.propinasPorClasse,
                          [classe]: novo
                        }
                      }));
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Taxas Administrativas & Serviços */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Emolumentos & Taxas de Secretaria (Kz)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Taxa de Matrícula</label>
                <input
                  type="number"
                  value={configFinanceira.taxaMatricula}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, taxaMatricula: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Taxa de Confirmação</label>
                <input
                  type="number"
                  value={configFinanceira.taxaConfirmacao}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, taxaConfirmacao: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Declaração com Notas</label>
                <input
                  type="number"
                  value={configFinanceira.taxaDeclaracaoComNotas}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, taxaDeclaracaoComNotas: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Declaração sem Notas</label>
                <input
                  type="number"
                  value={configFinanceira.taxaDeclaracaoSemNotas}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, taxaDeclaracaoSemNotas: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Certificado de Habilitações</label>
                <input
                  type="number"
                  value={configFinanceira.taxaCertificado}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, taxaCertificado: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cartão de Estudante (Passe)</label>
                <input
                  type="number"
                  value={configFinanceira.taxaCartaoEstudante}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, taxaCartaoEstudante: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Dados Bancários & Cobrança */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Coordenadas Bancárias & Regras de Cobrança
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Banco Oficial da Escola</label>
                <input
                  type="text"
                  value={configFinanceira.bancoNome}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, bancoNome: e.target.value })}
                  placeholder="Ex: Banco BAI / BFA"
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">IBAN Institucional</label>
                <input
                  type="text"
                  value={configFinanceira.ibanEscola}
                  onChange={(e) => setConfigFinanceira({ ...configFinanceira, ibanEscola: e.target.value })}
                  placeholder="AO06.0040.0000.xxxx.xxxx.xxxx.x"
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dia Limite de Pagamento</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Até ao dia</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={configFinanceira.diaLimitePagamento}
                    onChange={(e) => setConfigFinanceira({ ...configFinanceira, diaLimitePagamento: Number(e.target.value) })}
                    className="w-20 p-2 border border-gray-300 rounded-lg text-xs font-bold"
                  />
                  <span className="text-xs text-gray-500">de cada mês</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              Salvar Alterações de Configuração
            </button>
          </div>
        </form>
      )}

      {/* =================================================== */}
      {/* ABA: GESTÃO DE EMOLUMENTOS & TAXAS PELO DIRETOR GERAL */}
      {/* =================================================== */}
      {activeSubTab === 'emolumentos' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-1">
                <Coins className="h-3.5 w-3.5 text-emerald-600" />
                <span>Gestão Oficial de Emolumentos · Prerrogativa do Gabinete da Direção</span>
              </div>
              <h3 className="text-base font-black text-gray-900">
                Catálogo de Emolumentos, Serviços & Classes Abrangidas
              </h3>
              <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
                Crie e configure novos tipos de emolumentos a cobrar, especifique as classes abrangidas, periodicidade, vencimentos, multas e restrições. O sistema valida automaticamente se cada aluno pertence às classes autorizadas no momento do recebimento.
              </p>
            </div>

            {isDirecao && (
              <button
                type="button"
                onClick={() => {
                  setEmolIdEdit(null);
                  setEmolNome('');
                  setEmolValorKz(5000);
                  setEmolPeriodicidade('Por_Solicitacao');
                  setEmolClasses(['Todas']);
                  setEmolObrigatorio(false);
                  setEmolDiaVencimento(10);
                  setEmolMultaPct(10);
                  setEmolDescricao('');
                  setShowNovoEmolumentoModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Novo Emolumento</span>
              </button>
            )}
          </div>

          {/* Lista de Emolumentos Configurados */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Emolumento / Serviço</th>
                    <th className="p-3">Valor Padrão (Kz)</th>
                    <th className="p-3">Periodicidade</th>
                    <th className="p-3">Classes Abrangidas</th>
                    <th className="p-3">Vencimento & Multa</th>
                    <th className="p-3">Regras & Sanções</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Itens Padrão do Sistema */}
                  {[
                    { nome: 'Propina Mensal', desc: 'Mensalidade de frequência lectiva', valor: configFinanceira.propinasPorClasse['10ª'] || 12000, per: 'Mensal', classes: ['Todas'], obr: true, docBloq: true },
                    { nome: 'Matrícula', desc: 'Taxa de nova inscrição escolar', valor: configFinanceira.taxaMatricula || 5000, per: 'Unico', classes: ['Todas'], obr: true, docBloq: true },
                    { nome: 'Confirmação', desc: 'Confirmação de matrícula para o ano seguinte', valor: configFinanceira.taxaConfirmacao || 4000, per: 'Anual', classes: ['Todas'], obr: true, docBloq: true },
                    { nome: 'Declaração com Notas', desc: 'Emissão de certificado de notas', valor: configFinanceira.taxaDeclaracaoComNotas || 3500, per: 'Por_Solicitacao', classes: ['Todas'], obr: false, docBloq: false },
                    { nome: 'Declaração sem Notas', desc: 'Declaração de frequência simples', valor: configFinanceira.taxaDeclaracaoSemNotas || 2500, per: 'Por_Solicitacao', classes: ['Todas'], obr: false, docBloq: false },
                    { nome: 'Certificado de Conclusão', desc: 'Certificado de habilitações do ciclo', valor: configFinanceira.taxaCertificado || 6000, per: 'Por_Solicitacao', classes: ['6ª', '9ª', '12ª', '13ª'], obr: false, docBloq: false },
                    { nome: 'Cartão de Estudante', desc: 'Passe / identificador de estudante', valor: configFinanceira.taxaCartaoEstudante || 2000, per: 'Anual', classes: ['Todas'], obr: true, docBloq: false },
                    { nome: 'Exame de Recurso', desc: 'Taxa de exame de 2ª época', valor: configFinanceira.taxaExameRecurso || 3000, per: 'Por_Solicitacao', classes: ['Todas'], obr: false, docBloq: false }
                  ].map((padrao, idx) => (
                    <tr key={`emol-padrao-${idx}`} className="bg-gray-50/50 hover:bg-gray-100/60">
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{padrao.nome}</div>
                        <div className="text-[10px] text-gray-500">{padrao.desc}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-900">
                        {padrao.valor.toLocaleString('pt-AO')} Kz
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {padrao.per}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-800">
                          {padrao.classes.join(', ')}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-gray-600">
                        Dia {configFinanceira.diaLimitePagamento || 10} • Multa: {configFinanceira.multaAtrasoPercentual || 10}%
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] text-gray-600">
                          {padrao.obr ? '• Obrigatório ' : '• Opcional '}
                          {padrao.docBloq ? '• Bloqueia docs' : ''}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Padrão Sistema
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[10px] text-gray-400 italic">Oficial MED</span>
                      </td>
                    </tr>
                  ))}

                  {/* Emolumentos Customizados criados pela Direção */}
                  {emolumentosCustomizados.map((emol) => (
                    <tr key={emol.id} className="hover:bg-blue-50/30">
                      <td className="p-3 font-medium">
                        <div className="font-black text-gray-950 flex items-center space-x-1.5">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{emol.nome}</span>
                        </div>
                        {emol.descricao && (
                          <div className="text-[10px] text-gray-500 max-w-xs">{emol.descricao}</div>
                        )}
                        <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                          Criado por {emol.criadoPorNome || 'Diretor'} em {emol.dataCriacao}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-800">
                        {emol.valorPadraoKz.toLocaleString('pt-AO')} Kz
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {emol.periodicidade}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {emol.classesAbrangidas?.includes('Todas') ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Todas as Classes
                            </span>
                          ) : (
                            emol.classesAbrangidas?.map(c => (
                              <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-300 text-gray-800">
                                {c}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-[11px] text-gray-700">
                        Dia {emol.diaVencimento || 10} • Multa: {emol.multaAtrasoPercentual || 10}%
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 text-[10px]">
                          {emol.obrigatorio && (
                            <span className="block text-amber-800 font-bold">⚠️ Obrigatório</span>
                          )}
                          {emol.bloqueiaDocumentosSePendente && (
                            <span className="block text-rose-700 font-semibold">🔒 Bloqueia documentos</span>
                          )}
                          {!emol.obrigatorio && !emol.bloqueiaDocumentosSePendente && (
                            <span className="text-gray-500">Cobrança facultativa</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emol.ativo !== false 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                          {emol.ativo !== false ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEmolIdEdit(emol.id);
                            setEmolNome(emol.nome);
                            setEmolValorKz(emol.valorPadraoKz);
                            setEmolPeriodicidade(emol.periodicidade);
                            setEmolClasses(emol.classesAbrangidas || ['Todas']);
                            setEmolObrigatorio(!!emol.obrigatorio);
                            setEmolDiaVencimento(emol.diaVencimento || 10);
                            setEmolMultaPct(emol.multaAtrasoPercentual || 10);
                            setEmolDescricao(emol.descricao || '');
                            setShowNovoEmolumentoModal(true);
                          }}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Editar Emolumento"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirEmolumento(emol.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Eliminar Emolumento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* ABA 8: DELEGAÇÕES DE COBRANÇA FINANCEIRA DA ESCOLA */}
      {/* =================================================== */}
      {activeSubTab === 'delegacoes' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Norma Financeira MED · Prerrogativa do Gabinete da Direção</span>
              </div>
              <h3 className="text-base font-black text-gray-900">
                Delegações de Cobrança Financeira (Subdiretor, Secretário ou Professor)
              </h3>
              <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
                O Diretor Geral pode delegar a cobrança de propinas e emolumentos específicos quando necessário. O colaborador delegado verá unicamente o menu de cobrança com os emolumentos autorizados e as restrições impostas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNovaDelegacaoModal(true)}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Delegação de Cobrança</span>
            </button>
          </div>

          {/* Cards Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900">Delegações Ativas</span>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {delegacoesLista.filter(d => d.ativo).length}
              </div>
              <p className="text-[11px] text-indigo-700 mt-0.5">Colaboradores credenciados</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900">Emolumentos Arrecadáveis</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {todosEmolumentosDisponiveis.length}
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">Tipos parametrizados</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700">Responsabilidade Jurídica</span>
              <div className="text-xs font-black text-gray-900 mt-1">
                {escola.diretorGeralNome || 'Diretor Geral'}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Titular da delegação executiva</p>
            </div>
          </div>

          {/* Tabela de Delegações */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
              Registo de Colaboradores com Cobrança Delegada
            </h4>

            {delegacoesLista.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-2">
                <UserCheck className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold text-gray-800">Nenhuma delegação financeira cadastrada</p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Clique em "Nova Delegação de Cobrança" para autorizar o Subdiretor Pedagógico, Secretário ou Professor a efetuar cobranças no sistema.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="p-3">Colaborador / Cargo</th>
                      <th className="p-3">Emolumentos Autorizados</th>
                      <th className="p-3">Limite por Recibo</th>
                      <th className="p-3">Anulação</th>
                      <th className="p-3">Data & Outorga</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {delegacoesLista.map(del => (
                      <tr key={del.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3">
                          <strong className="text-gray-900 block">{del.funcionarioNome}</strong>
                          <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                            {del.cargo || del.role}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {del.emolumentosPermitidos.map(em => (
                              <span key={em} className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-semibold border border-blue-100">
                                {em}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-gray-800">
                          {del.valorMaximoPorCobrancaKz 
                            ? `${del.valorMaximoPorCobrancaKz.toLocaleString('pt-AO')} Kz` 
                            : 'Sem Limite'}
                        </td>
                        <td className="p-3">
                          {del.permitirAnulacao ? (
                            <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                              Permitido
                            </span>
                          ) : (
                            <span className="text-red-700 font-bold text-[10px] bg-red-50 px-1.5 py-0.5 rounded">
                              Bloqueado
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          <span className="block">{new Date(del.dataDelegacao).toLocaleDateString('pt-AO')}</span>
                          <span className="text-[10px] text-gray-400">Por {del.delegadoPorNome}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevogarDelegacao(del.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Revogar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 7: BALANÇO & ESTATÍSTICAS              */}
      {/* ========================================== */}
      {activeSubTab === 'relatorios' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Balanço Financeiro & Contabilístico Oficial</h3>
              <p className="text-xs text-gray-500">Relatório consolidado de prestação de contas do estabelecimento de ensino</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Balanço</span>
            </button>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="flex justify-center mb-2">
                {configSistema.insigniaNacionalUrl && configSistema.insigniaNacionalUrl.trim() !== '' ? (
                  <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-14 w-14 object-contain mx-auto" />
                ) : (
                  <InsigniaAngola size={56} />
                )}
              </div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-amber-600">República de Angola</p>
              <p className="text-[11px] font-semibold uppercase text-slate-500">Ministério da Educação</p>
              <h4 className="text-sm font-black text-slate-900">{escola.nomeOficial}</h4>
              <p className="text-xs text-slate-600">Subdirecção Administrativa • Balanço do Ano Lectivo {escola.anoLectivoActivo}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Arrecadado</span>
                <span className="text-xl font-black text-emerald-700">{totalReceitas.toLocaleString('pt-AO')} Kz</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Despendido</span>
                <span className="text-xl font-black text-rose-700">{totalDespesas.toLocaleString('pt-AO')} Kz</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Superávite / Saldo</span>
                <span className="text-xl font-black text-blue-900">{saldoEmCaixa.toLocaleString('pt-AO')} Kz</span>
              </div>
            </div>

            <div className="pt-4 text-xs text-slate-600 space-y-2">
              <p><strong>Observações Contabilísticas:</strong> Todas as receitas foram arrecadadas mediante a emissão de recibos numerados sequencialmente em conformidade com as regras do MED. As despesas de gerador e material possuem comprovativos anexos em arquivo físico na secretaria da instituição.</p>
              <div className="pt-8 flex justify-between text-center">
                <div>
                  <div className="w-48 border-t border-slate-400 mx-auto" />
                  <p className="pt-1 font-bold">{currentUser.nomeCompleto}</p>
                  <p className="text-[10px] text-slate-500">O Subdirector Administrativo</p>
                </div>
                <div>
                  <div className="w-48 border-t border-slate-400 mx-auto" />
                  <p className="pt-1 font-bold">{escola.diretorGeralNome || 'Diretor Geral'}</p>
                  <p className="text-[10px] text-slate-500">O Director Geral da Instituição</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: REGISTAR NOVO PAGAMENTO             */}
      {/* ========================================== */}
      {showNovoPagamentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-700">
                <Receipt className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">Lançar Pagamento & Emitir Recibo</h3>
              </div>
              <button onClick={() => setShowNovoPagamentoModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPagamento} className="space-y-4 text-xs">
              {/* Seleção do Aluno */}
              {/* Seleção do Aluno com Hierarquia de Classe e Pesquisa */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-700">Selecionar Estudante *</label>
                  <span className="text-[10px] text-gray-500 font-semibold">
                    {alunosParaPagamento.length} encontrados
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={modalPagFiltroClasse}
                    onChange={(e) => setModalPagFiltroClasse(e.target.value)}
                    className="p-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="TODAS">Todas as Classes</option>
                    {todasClasses.map(c => (
                      <option key={`modal-pag-c-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={modalPagBuscaAluno}
                    onChange={(e) => setModalPagBuscaAluno(sanitizeSearchInput(e.target.value, 60))}
                    maxLength={60}
                    placeholder="Filtrar por nome ou proc..."
                    className="p-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <select
                  required
                  value={pagAlunoId}
                  onChange={(e) => setPagAlunoId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Selecione o Aluno ({alunosParaPagamento.length} disponíveis) --</option>
                  {alunosParaPagamento.map(a => {
                    const t = turmas.find(tm => tm.id === a.turmaId);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.nomeCompleto} ({a.codigoMatricula} - {a.classeId} • {t?.nome || 'Turma'} • {t?.sala || 'Sala'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tipo de Pagamento e Mês */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Tipo de Pagamento *
                    {isUsuarioDelegado && (
                      <span className="text-[10px] text-amber-700 font-normal ml-1">
                        (Restrito à sua delegação)
                      </span>
                    )}
                  </label>
                  <select
                    value={pagTipo}
                    onChange={(e) => setPagTipo(e.target.value as TipoPagamentoEscolar)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    {emolumentosPermitidosFormulario.map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                  {isUsuarioDelegado && minhaDelegacao?.valorMaximoPorCobrancaKz && (
                    <span className="text-[10px] text-amber-700 font-semibold block mt-1">
                      Limite máx. autorizado: {minhaDelegacao.valorMaximoPorCobrancaKz.toLocaleString('pt-AO')} Kz
                    </span>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mês de Referência</label>
                  <select
                    value={pagMes}
                    onChange={(e) => setPagMes(e.target.value)}
                    disabled={pagTipo !== 'Propina Mensal'}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold disabled:bg-gray-100"
                  >
                    <option value="Janeiro 2025">Janeiro 2025</option>
                    <option value="Fevereiro 2025">Fevereiro 2025</option>
                    <option value="Março 2025">Março 2025</option>
                    <option value="Abril 2025">Abril 2025</option>
                    <option value="Maio 2025">Maio 2025</option>
                    <option value="Junho 2025">Junho 2025</option>
                    <option value="Julho 2025">Julho 2025</option>
                  </select>
                </div>
              </div>

              {/* Valor e Método */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor a Cobrar (Kz) *</label>
                  <input
                    type="number"
                    required
                    value={pagValor}
                    onChange={(e) => setPagValor(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg font-black text-emerald-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Método de Pagamento *</label>
                  <select
                    value={pagMetodo}
                    onChange={(e) => setPagMetodo(e.target.value as MetodoPagamentoEscolar)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="Multicaixa / TPA">Multicaixa / TPA</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro Físico</option>
                    <option value="Depósito Direto">Depósito Direto</option>
                  </select>
                </div>
              </div>

              {/* Comprovativo e Observações */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">N.º do Comprovativo / Talão TPA</label>
                <input
                  type="text"
                  value={pagComprovativo}
                  onChange={(e) => setPagComprovativo(e.target.value)}
                  placeholder="Ex: TPA-99214 ou BAI-TRF-0012"
                  className="w-full p-2 border border-gray-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={pagObservacao}
                  onChange={(e) => setPagObservacao(e.target.value)}
                  placeholder="Ex: Pagamento regularizado"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovoPagamentoModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Emitir Recibo Oficial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: LANÇAR NOVA DESPESA                 */}
      {/* ========================================== */}
      {showNovaDespesaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-700">
                <TrendingDown className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">Registar Saída de Caixa / Despesa</h3>
              </div>
              <button onClick={() => setShowNovaDespesaModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarDespesa} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição Detalhada da Despesa *</label>
                <input
                  type="text"
                  required
                  value={despDescricao}
                  onChange={(e) => setDespDescricao(e.target.value)}
                  placeholder="Ex: Combustível Gasóleo para o Gerador 45kVA"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoria da Despesa *</label>
                  <select
                    value={despCategoria}
                    onChange={(e) => setDespCategoria(e.target.value as CategoriaDespesaEscolar)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="Combustível / Gerador">Combustível / Gerador</option>
                    <option value="Material de Escritório & Didáctico">Material de Escritório & Didáctico</option>
                    <option value="Manutenção de Infraestruturas">Manutenção de Infraestruturas</option>
                    <option value="Limpeza & Higiene">Limpeza & Higiene</option>
                    <option value="Água / Eletricidade">Água / Eletricidade</option>
                    <option value="Serviços Técnicos / Informática">Serviços Técnicos / Informática</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor Total (Kz) *</label>
                  <input
                    type="number"
                    required
                    value={despValor}
                    onChange={(e) => setDespValor(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg font-black text-rose-700 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Beneficiário / Fornecedor *</label>
                  <input
                    type="text"
                    required
                    value={despBeneficiario}
                    onChange={(e) => setDespBeneficiario(e.target.value)}
                    placeholder="Ex: Posto Sonangol / Papelaria"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={despMetodo}
                    onChange={(e) => setDespMetodo(e.target.value as MetodoPagamentoEscolar)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="Multicaixa / TPA">Multicaixa / TPA</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro Físico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">N.º da Factura / Recibo Fornecedor</label>
                <input
                  type="text"
                  value={despComprovativo}
                  onChange={(e) => setDespComprovativo(e.target.value)}
                  placeholder="Ex: FT-2025/089"
                  className="w-full p-2 border border-gray-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovaDespesaModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold shadow-md"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: TOMBAR PATRIMÓNIO                   */}
      {/* ========================================== */}
      {showNovoPatrimonioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Package className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">Tombar Novo Bem Patrimonial</h3>
              </div>
              <button onClick={() => setShowNovoPatrimonioModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPatrimonio} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome / Descrição do Bem *</label>
                <input
                  type="text"
                  required
                  value={patNome}
                  onChange={(e) => setPatNome(e.target.value)}
                  placeholder="Ex: Carteiras Escolares Duplas com Banco (Lote de 30)"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoria *</label>
                  <select
                    value={patCategoria}
                    onChange={(e) => setPatCategoria(e.target.value as CategoriaPatrimonio)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="Mobiliário Escolar (Carteiras/Secretárias)">Mobiliário Escolar (Carteiras/Secretárias)</option>
                    <option value="Informática & Equipamentos TIC">Informática & Equipamentos TIC</option>
                    <option value="Climatização & Energia (ACs/Geradores)">Climatização & Energia (ACs/Geradores)</option>
                    <option value="Laboratório de Ciências">Laboratório de Ciências</option>
                    <option value="Biblioteca & Acervo">Biblioteca & Acervo</option>
                    <option value="Material Desportivo">Material Desportivo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Localização Física / Sala</label>
                  <input
                    type="text"
                    required
                    value={patSala}
                    onChange={(e) => setPatSala(e.target.value)}
                    placeholder="Ex: Sala 04 / Laboratório"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={patQuantidade}
                    onChange={(e) => setPatQuantidade(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Estado de Conservação</label>
                  <select
                    value={patEstado}
                    onChange={(e) => setPatEstado(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Bom">Bom</option>
                    <option value="Regular">Regular</option>
                    <option value="Danificado">Danificado</option>
                    <option value="Para Abate">Para Abate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor Estimado (Kz)</label>
                  <input
                    type="number"
                    value={patValor}
                    onChange={(e) => setPatValor(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovoPatrimonioModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold shadow-md"
                >
                  Confirmar Tombamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: VISUALIZAÇÃO / IMPRESSÃO DE RECIBO  */}
      {/* ========================================== */}
      {reciboParaImprimir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Recibo Oficial de Pagamento</span>
              </span>
              <button onClick={() => setReciboParaImprimir(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Layout do Recibo com Insígnia da República de Angola */}
            <div id="recibo-imprimir-modal" className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-3 text-xs">
              <div className="text-center space-y-0.5">
                <div className="flex justify-center mb-1">
                  {configSistema.insigniaNacionalUrl && configSistema.insigniaNacionalUrl.trim() !== '' ? (
                    <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-12 w-12 object-contain mx-auto" />
                  ) : (
                    <InsigniaAngola size={48} />
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">República de Angola</p>
                <p className="text-[9px] font-bold uppercase text-slate-500">Ministério da Educação</p>
                <p className="text-xs font-bold text-slate-900">{escola.nomeOficial}</p>
                <p className="text-[10px] font-mono text-blue-800 font-bold">N.º {reciboParaImprimir.numeroRecibo}</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estudante:</span>
                  <span className="font-bold text-slate-900">{reciboParaImprimir.alunoNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nº Matrícula:</span>
                  <span className="font-mono font-bold text-slate-900">{reciboParaImprimir.codigoMatricula}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turma / Classe:</span>
                  <span className="font-medium text-slate-900">{reciboParaImprimir.turmaNome || reciboParaImprimir.classe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Descrição:</span>
                  <span className="font-bold text-slate-900">
                    {reciboParaImprimir.tipo} {reciboParaImprimir.mesReferencia ? `(${reciboParaImprimir.mesReferencia})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Forma de Pagamento:</span>
                  <span className="font-medium text-slate-900">{reciboParaImprimir.metodoPagamento}</span>
                </div>
                {reciboParaImprimir.numeroComprovativo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Comprovativo TPA/TRF:</span>
                    <span className="font-mono font-bold text-slate-900">{reciboParaImprimir.numeroComprovativo}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-slate-700">VALOR TOTAL PAGO:</span>
                <span className="text-base font-black text-emerald-700">
                  {reciboParaImprimir.valorTotalKz.toLocaleString()} Kz
                </span>
              </div>

              <div className="pt-2 text-[9px] text-slate-400 text-center border-t border-slate-200">
                <p>Emitido em {reciboParaImprimir.dataHora} • Operador: {reciboParaImprimir.operadorNome}</p>
                <p>O presente recibo serve de comprovativo oficial perante a administração escolar.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReciboParaImprimir(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await downloadElementAsPdf('recibo-imprimir-modal', `Recibo_${reciboParaImprimir.numeroRecibo || 'Pagamento'}`);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Baixar em PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA DELEGAÇÃO DE COBRANÇA FINANCEIRA */}
      {showNovaDelegacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">Outorgar Delegação de Cobrança</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowNovaDelegacaoModal(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaDelegacao} className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] space-y-1">
                <p>
                  <strong>Prerrogativa da Direção:</strong> O colaborador delegado receberá permissão para efetuar cobranças e emitir recibos estritamente dos emolumentos selecionados abaixo.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Colaborador Autorizado (Subdiretor, Secretário ou Professor) *
                </label>
                <select
                  required
                  value={delFuncionarioId}
                  onChange={(e) => setDelFuncionarioId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Selecione o Colaborador --</option>
                  {dbService.getFuncionarios()
                    .filter(f => f.role !== 'AdminGeral' && f.role !== 'DiretorGeral')
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.nomeCompleto} ({f.cargo || f.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Emolumentos Autorizados para Cobrança * (Selecione ao menos um)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  {todosEmolumentosDisponiveis.map(em => {
                    const checked = delEmolumentos.includes(em);
                    return (
                      <label 
                        key={em} 
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          checked ? 'bg-indigo-100/70 font-bold text-indigo-950 border border-indigo-300' : 'hover:bg-white text-gray-700 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDelEmolumentos([...delEmolumentos, em]);
                            } else {
                              setDelEmolumentos(delEmolumentos.filter(item => item !== em));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] leading-tight">{em}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Limite Máximo por Recibo (Kz)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="Ex: 50000 (Opcional)"
                    value={delLimiteKz || ''}
                    onChange={(e) => setDelLimiteKz(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Vazio = sem limite de teto</span>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delPermitirAnulacao}
                      onChange={(e) => setDelPermitirAnulacao(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Permitir Anular Recibos</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Despacho / Observações da Direção Geral
                </label>
                <textarea
                  rows={2}
                  value={delObservacoes}
                  onChange={(e) => setDelObservacoes(e.target.value)}
                  placeholder="Ex: Delegação autorizada para campanha de confirmações e matrículas no período matutino."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNovaDelegacaoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm cursor-pointer"
                >
                  Outorgar Delegação Financeira
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR / EDITAR NOVO EMOLUMENTO OFICIAL PELO DIRETOR */}
      {/* ========================================================= */}
      {showNovoEmolumentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-emerald-700">
                <Coins className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">
                  {emolIdEdit ? 'Editar Emolumento Oficial' : 'Criar Novo Emolumento a Cobrar'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowNovoEmolumentoModal(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoEmolumento} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Designação do Emolumento / Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={emolNome}
                  onChange={(e) => setEmolNome(e.target.value)}
                  placeholder="Ex: Uniforme Escolar Oficial, Transporte Rota Norte, Taxa de Laboratório"
                  className="w-full p-2.5 border border-gray-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Valor Padrão (Kwanzas - Kz) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    step="500"
                    value={emolValorKz}
                    onChange={(e) => setEmolValorKz(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 border border-gray-300 rounded-lg font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Periodicidade da Cobrança *
                  </label>
                  <select
                    value={emolPeriodicidade}
                    onChange={(e) => setEmolPeriodicidade(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="Por_Solicitacao">Por Solicitação (Avulso / Pontual)</option>
                    <option value="Mensal">Mensal (Concomitante à propina)</option>
                    <option value="Anual">Anual (Uma vez por ano lectivo)</option>
                    <option value="Unico">Único (Taxa de inscrição/matrícula)</option>
                  </select>
                </div>
              </div>

              {/* Classes Abrangidas com Seleção Fácil */}
              <div className="space-y-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-800">
                    Classes Abrangidas por esta Cobrança *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (emolClasses.includes('Todas')) setEmolClasses([]);
                      else setEmolClasses(['Todas']);
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    {emolClasses.includes('Todas') ? 'Personalizar Classes' : 'Marcar Todas'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  O sistema validará estritamente se o estudante pertence às classes marcadas antes de aceitar o pagamento.
                </p>

                {emolClasses.includes('Todas') ? (
                  <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg text-emerald-900 font-bold text-center">
                    ✓ Abrange todas as classes da instituição (Iniciação à 13ª Classe)
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {todasClasses.map(cls => {
                      const checked = emolClasses.includes(cls);
                      return (
                        <label 
                          key={`emol-cls-${cls}`}
                          className={`p-1.5 rounded-lg border text-center font-bold text-[11px] cursor-pointer transition-all ${
                            checked ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setEmolClasses([...emolClasses, cls]);
                              else setEmolClasses(emolClasses.filter(c => c !== cls));
                            }}
                            className="sr-only"
                          />
                          <span>{cls}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dia de Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={emolDiaVencimento}
                    onChange={(e) => setEmolDiaVencimento(parseInt(e.target.value) || 10)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Multa por Atraso (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={emolMultaPct}
                    onChange={(e) => setEmolMultaPct(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={emolObrigatorio}
                    onChange={(e) => setEmolObrigatorio(e.target.checked)}
                    className="rounded text-emerald-600 h-4 w-4"
                  />
                  <span>Cobrança de cumprimento obrigatório para todos os estudantes abrangidos</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={emolClasses.length > 0}
                    onChange={(e) => {}}
                    className="rounded text-emerald-600 h-4 w-4"
                  />
                  <span>Validar rigorosamente a classe do aluno no ato do pagamento</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição / Fundamentação Administrativa</label>
                <textarea
                  rows={2}
                  value={emolDescricao}
                  onChange={(e) => setEmolDescricao(e.target.value)}
                  placeholder="Justificativa do emolumento e detalhes da taxa..."
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNovoEmolumentoModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar & Ativar Emolumento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
