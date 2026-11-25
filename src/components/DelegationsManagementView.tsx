import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  ClipboardCheck, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  FileText, 
  UserCheck,
  Receipt,
  Crown,
  X
} from 'lucide-react';
import { 
  Escola, 
  Funcionario, 
  DelegacaoPoderes, 
  TipoDelegacao, 
  AcaoDelegadaLog, 
  Aluno,
  RelatorioFinalInterinidade,
  UserRole
} from '../types';
import { dbService } from '../services/storage';
import { isProfessorCoordenadorTurma } from '../services/academicHierarchyService';
import { InsigniaAngola } from '../constants/insignia';

interface DelegationsManagementViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
  alunos: Aluno[];
}

const ROLE_TITLES: Record<string, string> = {
  DiretorGeral: 'Diretor(a) Geral',
  SubdiretorPedagogico: 'Subdiretor(a) Pedagógico(a)',
  SubdiretorAdministrativo: 'Subdiretor(a) Administrativo(a)',
  SubdirectorAdministrativo: 'Subdiretor(a) Administrativo(a)',
  ChefeSecretaria: 'Chefe de Secretaria',
  Secretaria: 'Secretaria Escolar',
  Secretario: 'Secretário(a) Escolar',
  SecretarioEscolar: 'Secretário(a) Escolar',
  CoordenadorPedagogico: 'Coordenador(a) Pedagógico(a)',
  CoordenadorTurno: 'Coordenador(a) de Turno',
  Professor: 'Coordenador(a) de Classe / Turma',
  AdminGeral: 'Administrador Geral'
};

export const DelegationsManagementView: React.FC<DelegationsManagementViewProps> = ({
  escola,
  currentUser,
  funcionarios
}) => {
  const turmasEscola = useMemo(() => dbService.getTurmas().filter(t => t.escolaId === escola.id), [escola.id]);
  const ehProfCoordenador = useMemo(
    () => currentUser.role === 'Professor' && turmasEscola.some(t => isProfessorCoordenadorTurma(t, currentUser.id)),
    [currentUser.id, currentUser.role, turmasEscola]
  );

  const ehDiretorOuSub = [
    'DiretorGeral',
    'SubdiretorAdministrativo',
    'SubdirectorAdministrativo',
    'SubdiretorPedagogico',
    'ChefeSecretaria',
    'Secretaria',
    'Secretario',
    'SecretarioEscolar',
    'AdminGeral'
  ].includes(currentUser.role);

  const podeDelegarInterinidade = ehDiretorOuSub || [
    'CoordenadorPedagogico',
    'CoordenadorTurno'
  ].includes(currentUser.role) || ehProfCoordenador;

  const [activeTab, setActiveTab] = useState<'interinidade' | 'matriculas' | 'cobranca' | 'auditoria'>('interinidade');
  const [showModalNova, setShowModalNova] = useState(false);
  const [tipoModal, setTipoModal] = useState<TipoDelegacao>('Interinidade');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [confirmarRevogacaoId, setConfirmarRevogacaoId] = useState<string | null>(null);
  const [relatorioModal, setRelatorioModal] = useState<RelatorioFinalInterinidade | null>(null);

  // Form State
  const [selFuncionarioId, setSelFuncionarioId] = useState('');
  const [cargoInterinoRole, setCargoInterinoRole] = useState<UserRole>(currentUser.role);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');

  // Carregar dados
  const [delegacoes, setDelegacoes] = useState<DelegacaoPoderes[]>(() => {
    return dbService.getDelegacoesPoderes(escola.id);
  });

  const [logs, setLogs] = useState<AcaoDelegadaLog[]>(() => {
    return dbService.getLogsAcoesDelegadas(escola.id);
  });

  React.useEffect(() => {
    setDelegacoes(dbService.getDelegacoesPoderes(escola.id));
    setLogs(dbService.getLogsAcoesDelegadas(escola.id));
  }, [escola.id]);

  const recarregarDados = () => {
    setDelegacoes(dbService.getDelegacoesPoderes(escola.id));
    setLogs(dbService.getLogsAcoesDelegadas(escola.id));
    window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
  };

  const notificar = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Filtragens
  const delegacoesInterinidade = useMemo(() => {
    return delegacoes.filter(d => d.tipo === 'Interinidade');
  }, [delegacoes]);

  const delegacoesMatriculas = useMemo(() => {
    return delegacoes.filter(d => d.tipo === 'Matriculas');
  }, [delegacoes]);

  const delegacoesCobranca = useMemo(() => {
    return delegacoes.filter(d => d.tipo === 'CobrancaEmolumentos');
  }, [delegacoes]);

  // Estatísticas
  const statsInterinidade = useMemo(() => {
    const ativas = delegacoesInterinidade.filter(d => d.ativo && !d.revogadoEm).length;
    const revogadas = delegacoesInterinidade.filter(d => !d.ativo || !!d.revogadoEm).length;
    const logsInt = logs.filter(l => l.tipo === 'Interinidade').length;
    return { ativas, revogadas, logsInt };
  }, [delegacoesInterinidade, logs]);

  const statsMatriculas = useMemo(() => {
    const logsMatricula = logs.filter(l => l.tipo === 'Matriculas');
    const totalMatriculas = logsMatricula.filter(l => l.acao === 'Matricula').length;
    const totalConfirmacoes = logsMatricula.filter(l => l.acao === 'Confirmacao').length;
    const delegadosAtivos = delegacoesMatriculas.filter(d => d.ativo).length;
    return { totalMatriculas, totalConfirmacoes, delegadosAtivos, totalAcoes: logsMatricula.length };
  }, [logs, delegacoesMatriculas]);

  const statsCobranca = useMemo(() => {
    const logsCobranca = logs.filter(l => l.tipo === 'CobrancaEmolumentos');
    const totalArrecadado = logsCobranca.reduce((acc, curr) => acc + (curr.valorCobrado || 0), 0);
    const totalTransacoes = logsCobranca.length;
    const caixasAtivos = delegacoesCobranca.filter(d => d.ativo).length;
    return { totalArrecadado, totalTransacoes, caixasAtivos };
  }, [logs, delegacoesCobranca]);

  // Opções de cargos delegáveis para interinidade conforme perfil do titular
  const opcoesCargoInterinidade = useMemo<{ role: UserRole; label: string }[]>(() => {
    if (currentUser.role === 'DiretorGeral' || currentUser.role === 'AdminGeral') {
      return [
        { role: 'DiretorGeral', label: 'Diretor Geral (Interino)' },
        { role: 'SubdiretorPedagogico', label: 'Subdiretor Pedagógico (Interino)' },
        { role: 'SubdiretorAdministrativo', label: 'Subdiretor Administrativo (Interino)' },
        { role: 'SecretarioEscolar', label: 'Secretário Escolar (Interino)' },
        { role: 'CoordenadorPedagogico', label: 'Coordenador Pedagógico (Interino)' }
      ];
    }
    return [
      {
        role: currentUser.role,
        label: `${ROLE_TITLES[currentUser.role] || currentUser.cargo || currentUser.role} (Interino)`
      }
    ];
  }, [currentUser.role, currentUser.cargo]);

  // Salvar Nova Delegação
  const handleCriarDelegacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selFuncionarioId) {
      notificar('erro', 'Selecione o colaborador a delegar competências.');
      return;
    }

    const func = funcionarios.find(f => f.id === selFuncionarioId);
    if (!func) {
      notificar('erro', 'Colaborador selecionado não encontrado.');
      return;
    }

    if (tipoModal === 'Interinidade') {
      const jaTemAtiva = delegacoesInterinidade.some(d => d.funcionarioId === func.id && d.ativo && !d.revogadoEm);
      if (jaTemAtiva) {
        notificar('erro', `${func.nomeCompleto} já se encontra em exercício de interinidade ativa.`);
        return;
      }
    }

    const roleFinalInterino: UserRole =
      currentUser.role === 'DiretorGeral' || currentUser.role === 'AdminGeral'
        ? cargoInterinoRole
        : currentUser.role;

    const tituloCargoDelegado =
      ROLE_TITLES[roleFinalInterino] || currentUser.cargo || roleFinalInterino;

    const nova: DelegacaoPoderes = {
      id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      escolaId: escola.id,
      delegadoPorId: currentUser.id,
      delegadoPorNome: currentUser.nomeCompleto,
      delegadoPorCargo: currentUser.cargo || ROLE_TITLES[currentUser.role] || currentUser.role,
      delegadoPorRole: currentUser.role,
      cargoDelegadoRole: tipoModal === 'Interinidade' ? roleFinalInterino : undefined,
      cargoDelegadoTitulo: tipoModal === 'Interinidade' ? tituloCargoDelegado : undefined,
      funcionarioId: func.id,
      funcionarioNome: func.nomeCompleto,
      funcionarioCargo: func.cargo || ROLE_TITLES[func.role] || func.role,
      tipo: tipoModal,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      dataFim: tipoModal === 'Interinidade' ? undefined : (dataFim || undefined),
      ativo: true,
      motivo: motivo.trim() || (tipoModal === 'Interinidade'
        ? `Designação formal para exercício em regime de interinidade como ${tituloCargoDelegado}, válida até revogação expressa do titular.`
        : 'Delegação formal por necessidade de serviço escolar.'),
      criadoEm: new Date().toISOString()
    };

    dbService.salvarDelegacaoPoderes(nova);
    recarregarDados();
    setShowModalNova(false);
    setSelFuncionarioId('');
    setMotivo('');
    setDataFim('');
    notificar(
      'sucesso',
      tipoModal === 'Interinidade'
        ? `Poderes plenos de interinidade delegados a ${func.nomeCompleto} até revogação formal do titular!`
        : `Poderes de ${tipoModal === 'Matriculas' ? 'Matrículas' : 'Cobrança de Emolumentos'} delegados com sucesso a ${func.nomeCompleto}!`
    );
  };

  // Revogar Delegação (com relatório automático na Interinidade)
  const handleConfirmarRevogacao = (del: DelegacaoPoderes) => {
    const res = dbService.revogarDelegacaoPoderes(del.id, currentUser.nomeCompleto, currentUser.id);
    setConfirmarRevogacaoId(null);
    recarregarDados();
    if (res.relatorio) {
      setRelatorioModal(res.relatorio);
      notificar('sucesso', `Interinidade de "${del.funcionarioNome}" revogada com relatório completo de auditoria gerado.`);
    } else {
      notificar('sucesso', `Delegação de competências de "${del.funcionarioNome}" revogada.`);
    }
  };

  // Imprimir Relatório Oficial
  const handleImprimirRelatorio = () => {
    window.print();
  };

  // Verificar se o usuário atual pode revogar uma delegação (Interinidade: titular que delegou ou AdminGeral)
  const podeRevogarDelegacao = (del: DelegacaoPoderes): boolean => {
    if (!del.ativo || del.revogadoEm) return false;
    if (del.tipo === 'Interinidade') {
      return del.delegadoPorId === currentUser.id || currentUser.role === 'AdminGeral';
    }
    return ehDiretorOuSub;
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          feedback.tipo === 'sucesso' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-300 dark:border-emerald-700' 
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-2 border-rose-300 dark:border-rose-700'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
            <span>{feedback.texto}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Institucional de Delegações */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Delegação de Competências &amp; Interinidade
              </span>
              <span className="text-xs text-blue-300/80 font-semibold">• {escola.nomeOficial}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Delegação de Poderes, Interinidade &amp; Auditoria
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O Diretor Geral, Subdiretores, Secretário Escolar e Coordenadores podem delegar competências ou designar um funcionário em <strong>Regime de Interinidade Total</strong>. O interino assume todos os menus do titular e apenas cessa funções mediante <strong>revogação expressa do titular</strong>, gerando relatório automático completo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleImprimirRelatorio}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-2 border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Relatório</span>
            </button>
            {podeDelegarInterinidade && (
              <button
                type="button"
                onClick={() => {
                  const defaultTipo: TipoDelegacao =
                    activeTab === 'cobranca' && ehDiretorOuSub
                      ? 'CobrancaEmolumentos'
                      : activeTab === 'matriculas' && ehDiretorOuSub
                        ? 'Matriculas'
                        : 'Interinidade';
                  setTipoModal(defaultTipo);
                  setCargoInterinoRole(currentUser.role);
                  setShowModalNova(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Delegação / Interinidade</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('interinidade')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'interinidade'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>1. Interinidade de Cargo ({delegacoesInterinidade.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matriculas')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'matriculas'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>2. Matrículas ({delegacoesMatriculas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cobranca')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cobranca'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>3. Cobrança &amp; Caixa ({delegacoesCobranca.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'auditoria'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>4. Livro de Auditoria ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: INTERINIDADE TOTAL (ATÉ REVOGAÇÃO EXPRESSA DO TITULAR)            */}
      {/* ========================================================================= */}
      {activeTab === 'interinidade' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Interinidades Ativas</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{statsInterinidade.ativas}</div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Em pleno exercício de funções</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Mandatos Encerrados</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{statsInterinidade.revogadas}</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Com relatório final de auditoria</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Registos em Interinidade</span>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-300">{statsInterinidade.logsInt}</div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Auditados automaticamente</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Despachos de Interinidade (Substituição Plena de Titular)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  O funcionário designado interino vê todos os menus e funcionalidades do titular e só sai quando o titular revogar os poderes.
                </p>
              </div>
              {podeDelegarInterinidade && (
                <button
                  type="button"
                  onClick={() => {
                    setTipoModal('Interinidade');
                    setCargoInterinoRole(currentUser.role);
                    setShowModalNova(true);
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Designar Interino</span>
                </button>
              )}
            </div>

            {delegacoesInterinidade.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Crown className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Nenhuma designação de interinidade registada nesta escola.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Funcionário Interino</th>
                      <th className="py-3 px-4">Cargo Assumido em Interinidade</th>
                      <th className="py-3 px-4">Titular que Delegou</th>
                      <th className="py-3 px-4">Início / Estado</th>
                      <th className="py-3 px-4">Motivo</th>
                      <th className="py-3 px-4 text-right">Revogação &amp; Relatório</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {delegacoesInterinidade.map((del) => {
                      const podeRevogar = podeRevogarDelegacao(del);
                      const emConfirmacao = confirmarRevogacaoId === del.id;
                      return (
                        <tr key={del.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{del.funcionarioNome}</div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Cargo original: {del.funcionarioCargo}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{del.cargoDelegadoTitulo || del.delegadoPorCargo}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{del.delegadoPorNome}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{del.delegadoPorCargo}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">Desde {del.dataInicio}</div>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              del.ativo && !del.revogadoEm
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                            }`}>
                              {del.ativo && !del.revogadoEm
                                ? 'Ativo (até revogação do titular)'
                                : `Revogado em ${del.revogadoEm ? new Date(del.revogadoEm).toLocaleDateString('pt-AO') : '—'}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                            <p className="line-clamp-2" title={del.motivo}>{del.motivo || '—'}</p>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {del.ativo && !del.revogadoEm ? (
                              podeRevogar ? (
                                emConfirmacao ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmarRevogacao(del)}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black cursor-pointer"
                                    >
                                      Confirmar Revogação
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmarRevogacaoId(null)}
                                      className="px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmarRevogacaoId(del.id)}
                                    className="px-3 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-700 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Revogar &amp; Gerar Relatório
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                  Só o titular revoga
                                </span>
                              )
                            ) : del.relatorioRevogacao ? (
                              <button
                                type="button"
                                onClick={() => setRelatorioModal(del.relatorioRevogacao || null)}
                                className="px-3 py-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-300 dark:border-blue-700 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Ver Relatório Final</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Encerrada</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: DELEGAÇÃO DE MATRÍCULAS & CONFIRMAÇÕES                            */}
      {/* ========================================================================= */}
      {activeTab === 'matriculas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Delegados Ativos</span>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{statsMatriculas.delegadosAtivos}</div>
              <span className="text-[11px] text-emerald-600 font-bold">Com autorização ativa</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Novas Matrículas</span>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-300">{statsMatriculas.totalMatriculas}</div>
              <span className="text-[11px] text-blue-600 font-bold">Processadas por delegados</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Confirmações</span>
              <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300">{statsMatriculas.totalConfirmacoes}</div>
              <span className="text-[11px] text-indigo-600 font-bold">Reconfirmações de vagas</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Total de Operações</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{statsMatriculas.totalAcoes}</div>
              <span className="text-[11px] text-gray-500 dark:text-slate-400">Registos no ano letivo</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Quadro de Delegações de Matrículas</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Professores e funcionários credenciados com acesso ao menu de estudantes.</p>
              </div>
              {ehDiretorOuSub && (
                <button
                  type="button"
                  onClick={() => { setTipoModal('Matriculas'); setShowModalNova(true); }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Delegar a Colaborador</span>
                </button>
              )}
            </div>

            {delegacoesMatriculas.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Users className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Nenhum funcionário ou professor com delegação de matrículas registada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-black border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Colaborador / Delegado</th>
                      <th className="py-3 px-4">Cargo / Função</th>
                      <th className="py-3 px-4">Autorizado Por</th>
                      <th className="py-3 px-4">Período de Validade</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Motivo Administrativo</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {delegacoesMatriculas.map((del) => (
                      <tr key={del.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 text-xs">
                            {del.funcionarioNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{del.funcionarioNome}</div>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {del.funcionarioId.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 dark:text-slate-300">{del.funcionarioCargo}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800 dark:text-slate-200">{del.delegadoPorNome}</span>
                          <span className="text-[10px] text-gray-500 block">{del.delegadoPorCargo}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700 dark:text-slate-300">
                          {del.dataInicio} até {del.dataFim || 'Indeterminado'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {del.ativo ? 'Em Vigor' : 'Revogado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-slate-400 max-w-xs truncate" title={del.motivo}>
                          {del.motivo || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {del.ativo && ehDiretorOuSub && (
                            confirmarRevogacaoId === del.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarRevogacao(del)}
                                  className="px-2 py-1 text-[11px] font-black bg-rose-600 text-white rounded-lg cursor-pointer"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarRevogacaoId(null)}
                                  className="px-2 py-1 text-[11px] font-bold border border-gray-300 rounded-lg cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmarRevogacaoId(del.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                              >
                                Revogar
                              </button>
                            )
                          )}
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

      {/* ========================================================================= */}
      {/* ABA 3: DELEGAÇÃO DE COBRANÇA DE EMOLUMENTOS (CAIXA / TESOURARIA)          */}
      {/* ========================================================================= */}
      {activeTab === 'cobranca' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Total Arrecadado sob Delegação</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {statsCobranca.totalArrecadado.toLocaleString('pt-AO')} <span className="text-xs">Kz</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">Valores conferidos em caixa</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Recibos Emitidos</span>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-300">{statsCobranca.totalTransacoes}</div>
              <span className="text-[11px] text-blue-600 font-bold">Operações de cobrança validadas</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Caixas Delegados Ativos</span>
              <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300">{statsCobranca.caixasAtivos}</div>
              <span className="text-[11px] text-gray-500 dark:text-slate-400">Operadores de balcão autorizados</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Quadro de Delegações para Cobrança de Emolumentos</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Colaboradores autorizados a receber propinas, multas, cartões e emitir recibos.</p>
              </div>
              {ehDiretorOuSub && (
                <button
                  type="button"
                  onClick={() => { setTipoModal('CobrancaEmolumentos'); setShowModalNova(true); }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Delegar Cobrança</span>
                </button>
              )}
            </div>

            {delegacoesCobranca.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <DollarSign className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Nenhum colaborador com delegação de cobrança ativa no momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-black border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Operador Delegado</th>
                      <th className="py-3 px-4">Cargo</th>
                      <th className="py-3 px-4">Delegado Por</th>
                      <th className="py-3 px-4">Período de Validade</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Finalidade</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {delegacoesCobranca.map((del) => (
                      <tr key={del.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                            {del.funcionarioNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{del.funcionarioNome}</div>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {del.funcionarioId.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 dark:text-slate-300">{del.funcionarioCargo}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800 dark:text-slate-200">{del.delegadoPorNome}</span>
                          <span className="text-[10px] text-gray-500 block">{del.delegadoPorCargo}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700 dark:text-slate-300">
                          {del.dataInicio} até {del.dataFim || 'Indeterminado'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {del.ativo ? 'Ativo' : 'Revogado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-slate-400 max-w-xs truncate" title={del.motivo}>
                          {del.motivo || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {del.ativo && ehDiretorOuSub && (
                            confirmarRevogacaoId === del.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarRevogacao(del)}
                                  className="px-2 py-1 text-[11px] font-black bg-rose-600 text-white rounded-lg cursor-pointer"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarRevogacaoId(null)}
                                  className="px-2 py-1 text-[11px] font-bold border border-gray-300 rounded-lg cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmarRevogacaoId(del.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                              >
                                Revogar
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Relatório Financeiro de Fecho de Caixa por Delegado</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Valores totais cobrados em Kwanzas e discriminação de formas de pagamento por operador.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {delegacoesCobranca.map((del) => {
                const logsDeste = logs.filter(l => l.funcionarioId === del.funcionarioId && l.tipo === 'CobrancaEmolumentos');
                const totalKz = logsDeste.reduce((acc, curr) => acc + (curr.valorCobrado || 0), 0);
                const numerario = logsDeste.filter(l => l.formaPagamento === 'Numerário' || !l.formaPagamento).reduce((a, c) => a + (c.valorCobrado || 0), 0);
                const tpa = logsDeste.filter(l => l.formaPagamento === 'TPA' || l.formaPagamento === 'Multicaixa').reduce((a, c) => a + (c.valorCobrado || 0), 0);
                const transf = logsDeste.filter(l => l.formaPagamento === 'Transferência').reduce((a, c) => a + (c.valorCobrado || 0), 0);

                return (
                  <div key={del.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 dark:text-white text-sm">{del.funcionarioNome}</h4>
                          <span className="text-[11px] text-gray-500 dark:text-slate-400">{del.funcionarioCargo}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {del.ativo ? 'Caixa Ativo' : 'Encerrado'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Arrecadado</span>
                      <strong className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                        {totalKz.toLocaleString('pt-AO')} <span className="text-xs">Kz</span>
                      </strong>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] text-gray-500 block">Numerário</span>
                        <strong className="font-black text-gray-800 dark:text-slate-200">{numerario.toLocaleString('pt-AO')} Kz</strong>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] text-gray-500 block">TPA / Multicaixa</span>
                        <strong className="font-black text-blue-900 dark:text-blue-300">{tpa.toLocaleString('pt-AO')} Kz</strong>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] text-gray-500 block">Transferência</span>
                        <strong className="font-black text-indigo-900 dark:text-indigo-300">{transf.toLocaleString('pt-AO')} Kz</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: LIVRO DE AUDITORIA DE AÇÕES DELEGADAS                              */}
      {/* ========================================================================= */}
      {activeTab === 'auditoria' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Livro de Auditoria de Ações Executadas por Delegados &amp; Interinos</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Histórico cronológico imutável com carimbo de tempo, operador e resumo de atos.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 self-start sm:self-auto">
              {logs.length} atos registados
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Nenhuma ação executada sob poder delegado registada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-black border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">Data &amp; Hora</th>
                    <th className="py-3 px-3">Colaborador / Operador</th>
                    <th className="py-3 px-3">Competência</th>
                    <th className="py-3 px-3">Ação</th>
                    <th className="py-3 px-3">Discente / Processo</th>
                    <th className="py-3 px-3">Valor / Recibo</th>
                    <th className="py-3 px-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.dataHora).toLocaleString('pt-AO')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {log.funcionarioNome}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.tipo === 'Interinidade'
                            ? 'bg-amber-100 text-amber-800'
                            : log.tipo === 'Matriculas'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.tipo === 'Interinidade' ? 'Interinidade' : log.tipo === 'Matriculas' ? 'Matrículas' : 'Cobrança'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-slate-200">
                        {log.acao}
                      </td>
                      <td className="py-2.5 px-3 text-gray-900 dark:text-slate-200 font-medium">
                        {log.alunoNome || '—'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {log.valorCobrado ? (
                          <div>
                            <span className="font-black text-emerald-700">{log.valorCobrado.toLocaleString('pt-AO')} Kz</span>
                            {log.numeroRecibo && <span className="text-[10px] text-gray-500 block font-mono">Recibo: {log.numeroRecibo}</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 max-w-xs truncate" title={log.detalhes}>
                        {log.detalhes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA DELEGAÇÃO DE PODERES / INTERINIDADE                           */}
      {/* ========================================================================= */}
      {showModalNova && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-300">
                <ShieldCheck className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white">
                    Despacho de Delegação de Competências
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Autoridade do Titular: {ROLE_TITLES[currentUser.role] || currentUser.cargo || currentUser.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalNova(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarDelegacao} className="space-y-4 text-xs">
              {/* Tipo de Delegação */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-slate-200 mb-1">Tipo de Delegação de Poderes:</label>
                <div className={`grid ${ehDiretorOuSub ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'} gap-2`}>
                  <button
                    type="button"
                    onClick={() => setTipoModal('Interinidade')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                      tipoModal === 'Interinidade'
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/30'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Crown className={`h-4 w-4 shrink-0 mt-0.5 ${tipoModal === 'Interinidade' ? 'text-amber-600' : 'text-gray-400'}`} />
                    <div>
                      <strong className="block text-gray-900 dark:text-white font-bold">Interinidade Total</strong>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight block">Todos os menus e funções até o titular revogar</span>
                    </div>
                  </button>

                  {ehDiretorOuSub && (
                    <>
                      <button
                        type="button"
                        onClick={() => setTipoModal('Matriculas')}
                        className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                          tipoModal === 'Matriculas'
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ClipboardCheck className={`h-4 w-4 shrink-0 mt-0.5 ${tipoModal === 'Matriculas' ? 'text-blue-700' : 'text-gray-400'}`} />
                        <div>
                          <strong className="block text-gray-900 dark:text-white font-bold">Matrículas</strong>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight block">Inscrição e confirmação</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoModal('CobrancaEmolumentos')}
                        className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                          tipoModal === 'CobrancaEmolumentos'
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-600/20'
                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <DollarSign className={`h-4 w-4 shrink-0 mt-0.5 ${tipoModal === 'CobrancaEmolumentos' ? 'text-emerald-700' : 'text-gray-400'}`} />
                        <div>
                          <strong className="block text-gray-900 dark:text-white font-bold">Cobrança</strong>
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight block">Propinas e recibos</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Cargo assumido em Interinidade */}
              {tipoModal === 'Interinidade' && (
                <div>
                  <label className="block font-bold text-gray-800 dark:text-slate-200 mb-1">
                    Cargo / Poderes a Exercer em Interinidade:
                  </label>
                  <select
                    value={cargoInterinoRole}
                    onChange={(e) => setCargoInterinoRole(e.target.value as UserRole)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-semibold text-xs"
                  >
                    {opcoesCargoInterinidade.map(opt => (
                      <option key={opt.role} value={opt.role}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seleção do Colaborador / Professor */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-slate-200 mb-1">
                  Selecione o Funcionário da Escola: <span className="text-red-500">*</span>
                </label>
                <select
                  value={selFuncionarioId}
                  onChange={(e) => setSelFuncionarioId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-600 text-xs"
                  required
                >
                  <option value="">-- Selecione o funcionário da instituição --</option>
                  {funcionarios
                    .filter(f =>
                      f.ativo !== false &&
                      f.id !== currentUser.id &&
                      f.role !== 'AdminGeral' &&
                      (currentUser.role === 'AdminGeral' || f.escolaId === escola.id)
                    )
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.nomeCompleto} — {f.cargo || f.role} (BI: {f.numeroBI})
                      </option>
                    ))}
                </select>
              </div>

              {/* Período de Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-slate-200 mb-1">Data de Início:</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs"
                    required
                  />
                </div>
                {tipoModal !== 'Interinidade' ? (
                  <div>
                    <label className="block font-bold text-gray-800 dark:text-slate-200 mb-1">Data de Término (Opcional):</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs"
                    />
                  </div>
                ) : (
                  <div className="flex items-end">
                    <div className="w-full p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      Vigência: Exclusiva até revogação expressa do titular
                    </div>
                  </div>
                )}
              </div>

              {/* Motivo Administrativo */}
              <div>
                <label className="block font-bold text-gray-800 dark:text-slate-200 mb-1">Motivo / Fundamentação do Despacho:</label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Ausência em missão de serviço, licença ou reforço administrativo escolar..."
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <strong className="block font-bold">Aviso de Auditoria e Vinculação:</strong>
                <span>
                  {tipoModal === 'Interinidade'
                    ? 'O interino herdará todos os menus e competências do titular selecionado, permanecendo ativo até que o titular proceda à revogação. Ao revogar, será gerado automaticamente o Relatório Final de Auditoria da Interinidade.'
                    : 'Todas as operações efetuadas serão carimbadas no Livro de Auditoria com a identidade oficial do delegado.'}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalNova(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Confirmar Delegação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RELATÓRIO FINAL AUTOMÁTICO DA INTERINIDADE (REVOGAÇÃO)             */}
      {/* ========================================================================= */}
      {relatorioModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <span className="font-black text-sm">Relatório Final Automático de Interinidade</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRelatorioModal(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
                <div className="flex justify-center mb-1">
                  <InsigniaAngola className="h-12 w-12" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider">República de Angola • Ministério da Educação</p>
                <h2 className="text-base font-black uppercase">{escola.nomeOficial}</h2>
                <h3 className="text-sm font-black text-blue-900 uppercase pt-1">
                  RELATÓRIO FINAL DE EXERCÍCIO DE INTERINIDADE &amp; AUDITORIA DE GESTÃO
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Titular Outorgante / Revogador</span>
                  <strong className="text-slate-900">{relatorioModal.titularNome}</strong>
                  <span className="block text-slate-600">{relatorioModal.titularCargo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Funcionário Interino</span>
                  <strong className="text-slate-900">{relatorioModal.interinoNome}</strong>
                  <span className="block text-slate-600">Cargo original: {relatorioModal.interinoCargoOriginal}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Cargo Exercido em Interinidade</span>
                  <strong className="text-amber-800">{relatorioModal.cargoExercidoTitulo}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Período de Mandato</span>
                  <strong className="font-mono text-slate-900">
                    {relatorioModal.dataInicio} → {new Date(relatorioModal.dataFimRevogacao).toLocaleString('pt-AO')}
                  </strong>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs leading-relaxed text-slate-800">
                <strong className="block text-blue-900 mb-1 uppercase text-[11px]">Síntese Executiva Automática:</strong>
                {relatorioModal.resumoExecutivo}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-800 border-b pb-1">
                  Resumo Quantitativo por Tipo de Operação ({relatorioModal.totalAcoesAuditadas} atos)
                </h4>
                {relatorioModal.acoesPorModulo.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sem operações registadas durante este período de interinidade.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {relatorioModal.acoesPorModulo.map((m, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate pr-2">{m.acao}</span>
                        <span className="font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded">{m.quantidade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-800 border-b pb-1">
                  Registo Cronológico de Auditoria (Atos Praticados em Interinidade)
                </h4>
                {relatorioModal.ultimosRegistos.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum ato registado no período.</p>
                ) : (
                  <table className="w-full text-left text-[11px] border border-slate-200">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 border-b border-slate-200">Data / Hora</th>
                        <th className="p-2 border-b border-slate-200">Ação / Módulo</th>
                        <th className="p-2 border-b border-slate-200">Descrição Detalhada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {relatorioModal.ultimosRegistos.map(r => (
                        <tr key={r.id}>
                          <td className="p-2 font-mono whitespace-nowrap text-slate-600">{r.dataHora}</td>
                          <td className="p-2 font-bold text-slate-800">{r.acao}</td>
                          <td className="p-2 text-slate-700">{r.detalhe}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                {(() => {
                  const interinoFunc = funcionarios.find(f => f.id === relatorioModal.interinoId || f.nomeCompleto === relatorioModal.interinoNome);
                  const revoganteFunc = funcionarios.find(f => f.id === relatorioModal.revogadoPorId || f.nomeCompleto === relatorioModal.revogadoPorNome);
                  return (
                    <>
                      <div>
                        <div className="border-t border-slate-700 pt-1.5 font-bold">{relatorioModal.interinoNome}</div>
                        <span className="text-[10px] text-slate-500">
                          {interinoFunc?.genero === 'F' ? 'A Interina Cessante' : 'O Interino Cessante'}
                        </span>
                      </div>
                      <div>
                        <div className="border-t border-slate-700 pt-1.5 font-bold">{relatorioModal.revogadoPorNome}</div>
                        <span className="text-[10px] text-slate-500">
                          {revoganteFunc?.genero === 'F' ? 'A Titular Revogante' : 'O Titular Revogante'} ({relatorioModal.titularCargo})
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

