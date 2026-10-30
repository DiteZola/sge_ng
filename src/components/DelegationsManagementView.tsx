import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Download, 
  FileText, 
  CreditCard,
  UserCheck,
  Building2,
  Lock,
  Unlock,
  Receipt
} from 'lucide-react';
import { 
  Escola, 
  Funcionario, 
  DelegacaoPoderes, 
  TipoDelegacao, 
  AcaoDelegadaLog, 
  Aluno 
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';

interface DelegationsManagementViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
  alunos: Aluno[];
}

export const DelegationsManagementView: React.FC<DelegationsManagementViewProps> = ({
  escola,
  currentUser,
  funcionarios,
  alunos
}) => {
  const [activeTab, setActiveTab] = useState<'matriculas' | 'cobranca' | 'auditoria'>('matriculas');
  const [showModalNova, setShowModalNova] = useState(false);
  const [tipoModal, setTipoModal] = useState<TipoDelegacao>('Matriculas');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Form State
  const [selFuncionarioId, setSelFuncionarioId] = useState('');
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

  const recarregarDados = () => {
    setDelegacoes(dbService.getDelegacoesPoderes(escola.id));
    setLogs(dbService.getLogsAcoesDelegadas(escola.id));
  };

  const notificar = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4000);
  };

  const ehDiretorOuSub = currentUser.role === 'DiretorGeral' || 
    currentUser.role === 'SubdiretorAdministrativo' || 
    currentUser.role === 'SubdirectorAdministrativo' ||
    currentUser.role === 'ChefeSecretaria' ||
    currentUser.role === 'AdminGeral';

  // Filtragens
  const delegacoesMatriculas = useMemo(() => {
    return delegacoes.filter(d => d.tipo === 'Matriculas');
  }, [delegacoes]);

  const delegacoesCobranca = useMemo(() => {
    return delegacoes.filter(d => d.tipo === 'CobrancaEmolumentos');
  }, [delegacoes]);

  // Estatísticas de Matrículas Delegadas
  const statsMatriculas = useMemo(() => {
    const logsMatricula = logs.filter(l => l.tipo === 'Matriculas');
    const totalMatriculas = logsMatricula.filter(l => l.acao === 'Matricula').length;
    const totalConfirmacoes = logsMatricula.filter(l => l.acao === 'Confirmacao').length;
    const delegadosAtivos = delegacoesMatriculas.filter(d => d.ativo).length;
    return { totalMatriculas, totalConfirmacoes, delegadosAtivos, totalAcoes: logsMatricula.length };
  }, [logs, delegacoesMatriculas]);

  // Estatísticas de Cobrança Delegada
  const statsCobranca = useMemo(() => {
    const logsCobranca = logs.filter(l => l.tipo === 'CobrancaEmolumentos');
    const totalArrecadado = logsCobranca.reduce((acc, curr) => acc + (curr.valorCobrado || 0), 0);
    const totalTransacoes = logsCobranca.length;
    const caixasAtivos = delegacoesCobranca.filter(d => d.ativo).length;
    return { totalArrecadado, totalTransacoes, caixasAtivos };
  }, [logs, delegacoesCobranca]);

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

    const cargoDelegador = (currentUser.role === 'SubdiretorAdministrativo' || currentUser.role === 'SubdirectorAdministrativo') 
      ? 'SubdiretorAdministrativo' 
      : currentUser.role === 'ChefeSecretaria'
        ? 'ChefeSecretaria'
        : currentUser.role === 'AdminGeral'
          ? 'AdminGeral'
          : 'DiretorGeral';

    const nova: DelegacaoPoderes = {
      id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      escolaId: escola.id,
      delegadoPorId: currentUser.id,
      delegadoPorNome: currentUser.nomeCompleto,
      delegadoPorCargo: cargoDelegador,
      funcionarioId: func.id,
      funcionarioNome: func.nomeCompleto,
      funcionarioCargo: func.cargo || func.role,
      tipo: tipoModal,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      dataFim: dataFim || undefined,
      ativo: true,
      motivo: motivo.trim() || 'Delegação formal por necessidade de serviço escolar.',
      criadoEm: new Date().toISOString()
    };

    dbService.salvarDelegacaoPoderes(nova);
    recarregarDados();
    setShowModalNova(false);
    setSelFuncionarioId('');
    setMotivo('');
    setDataFim('');
    notificar('sucesso', `Poderes de ${tipoModal === 'Matriculas' ? 'Matrículas' : 'Cobrança de Emolumentos'} delegados com sucesso a ${func.nomeCompleto}!`);
  };

  // Revogar Delegação
  const handleRevogar = (id: string, nomeFuncionario: string) => {
    if (window.confirm(`Tem a certeza que deseja revogar os poderes delegados a "${nomeFuncionario}"? O utilizador perderá o acesso a estes menus imediatamente.`)) {
      dbService.revogarDelegacaoPoderes(id, currentUser.nomeCompleto);
      recarregarDados();
      notificar('sucesso', `Delegação de competências revogada.`);
    }
  };

  // Imprimir Relatório Oficial
  const handleImprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          feedback.tipo === 'sucesso' 
            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300' 
            : 'bg-rose-50 text-rose-800 border-2 border-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
            <span>{feedback.texto}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Header Institucional de Delegações */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Gabinete da Direção Geral & Subdireção Administrativa
              </span>
              <span className="text-xs text-blue-300/80 font-semibold">• {escola.nomeOficial}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Delegação de Poderes & Auditoria Administrativa
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O Diretor Geral e o Subdiretor Administrativo têm a competência legal de delegar funções específicas de <strong>Matrículas & Confirmações</strong> e <strong>Cobrança de Emolumentos</strong> a colaboradores e professores, acompanhando o desempenho e a auditoria em tempo real.
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
            {ehDiretorOuSub && (
              <button
                type="button"
                onClick={() => {
                  setTipoModal(activeTab === 'cobranca' ? 'CobrancaEmolumentos' : 'Matriculas');
                  setShowModalNova(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Delegação</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
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
            <span>1. Matrículas & Confirmações ({delegacoesMatriculas.length})</span>
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
            <span>2. Cobrança de Emolumentos & Caixa ({delegacoesCobranca.length})</span>
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
            <span>3. Livro de Auditoria de Ações ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DELEGAÇÃO DE MATRÍCULAS & CONFIRMAÇÕES                            */}
      {/* ========================================================================= */}
      {activeTab === 'matriculas' && (
        <div className="space-y-6">
          {/* Cartões de Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Delegados Ativos</span>
              <div className="text-2xl font-black text-gray-900">{statsMatriculas.delegadosAtivos}</div>
              <span className="text-[11px] text-emerald-600 font-bold">Com autorização ativa</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Novas Matrículas</span>
              <div className="text-2xl font-black text-blue-900">{statsMatriculas.totalMatriculas}</div>
              <span className="text-[11px] text-blue-600 font-bold">Processadas por delegados</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Confirmações</span>
              <div className="text-2xl font-black text-indigo-900">{statsMatriculas.totalConfirmacoes}</div>
              <span className="text-[11px] text-indigo-600 font-bold">Reconfirmações de vagas</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total de Operações</span>
              <div className="text-2xl font-black text-slate-900">{statsMatriculas.totalAcoes}</div>
              <span className="text-[11px] text-gray-500">Registos no ano letivo</span>
            </div>
          </div>

          {/* Tabela de Delegações Ativas e Histórico */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900">Quadro de Delegações de Matrículas</h3>
                <p className="text-xs text-gray-500">Professores e funcionários credenciados com acesso ao menu de estudantes.</p>
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
                <p className="text-xs font-bold text-gray-500">Nenhum funcionário ou professor com delegação de matrículas registada.</p>
                {ehDiretorOuSub && (
                  <button
                    type="button"
                    onClick={() => { setTipoModal('Matriculas'); setShowModalNova(true); }}
                    className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
                  >
                    Atribuir Primeira Delegação
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-700 font-black border-b border-gray-200">
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
                  <tbody className="divide-y divide-gray-100">
                    {delegacoesMatriculas.map((del) => (
                      <tr key={del.id} className="hover:bg-gray-50/80">
                        <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 text-xs">
                            {del.funcionarioNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{del.funcionarioNome}</div>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {del.funcionarioId.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">{del.funcionarioCargo}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800">{del.delegadoPorNome}</span>
                          <span className="text-[10px] text-gray-500 block">
                            {del.delegadoPorCargo === 'DiretorGeral' ? 'Diretor Geral' : 'Subdiretor Administrativo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700">
                          {del.dataInicio} até {del.dataFim || 'Indeterminado'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {del.ativo ? 'Em Vigor' : 'Revogado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate" title={del.motivo}>
                          {del.motivo || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {del.ativo && ehDiretorOuSub && (
                            <button
                              type="button"
                              onClick={() => handleRevogar(del.id, del.funcionarioNome)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                            >
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Relatório de Desempenho por Delegado de Matrícula */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900">Relatório Executivo de Matrículas por Delegado</h3>
                <p className="text-xs text-gray-500">Discriminação detalhada de matrículas e confirmações processadas por cada usuário delegado.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {delegacoesMatriculas.map((del) => {
                const logsDeste = logs.filter(l => l.funcionarioId === del.funcionarioId && l.tipo === 'Matriculas');
                const matriculas = logsDeste.filter(l => l.acao === 'Matricula').length;
                const confirmacoes = logsDeste.filter(l => l.acao === 'Confirmacao').length;

                return (
                  <div key={del.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-gray-900 text-xs sm:text-sm">{del.funcionarioNome}</h4>
                        <span className="text-[11px] text-gray-500">{del.funcionarioCargo}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {del.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-200">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-gray-500 font-bold block">Matrículas</span>
                        <strong className="text-base text-blue-900 font-black">{matriculas}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-gray-500 font-bold block">Confirmações</span>
                        <strong className="text-base text-indigo-900 font-black">{confirmacoes}</strong>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 text-[11px] text-gray-600">
                      <div className="flex justify-between">
                        <span>Total de Procedimentos:</span>
                        <strong className="text-gray-900">{logsDeste.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Última Atividade:</span>
                        <strong className="text-gray-900 font-mono">
                          {logsDeste[0] ? new Date(logsDeste[0].dataHora).toLocaleDateString('pt-AO') : 'Sem registos'}
                        </strong>
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
      {/* ABA 2: DELEGAÇÃO DE COBRANÇA DE EMOLUMENTOS (CAIXA / TESOURARIA)          */}
      {/* ========================================================================= */}
      {activeTab === 'cobranca' && (
        <div className="space-y-6">
          {/* Cartões de Indicadores Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Arrecadado sob Delegação</span>
              <div className="text-2xl font-black text-emerald-700">
                {statsCobranca.totalArrecadado.toLocaleString('pt-AO')} <span className="text-xs">Kz</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">Valores conferidos em caixa</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Recibos Emitidos</span>
              <div className="text-2xl font-black text-blue-900">{statsCobranca.totalTransacoes}</div>
              <span className="text-[11px] text-blue-600 font-bold">Operações de cobrança validadas</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Caixas Delegados Ativos</span>
              <div className="text-2xl font-black text-indigo-900">{statsCobranca.caixasAtivos}</div>
              <span className="text-[11px] text-gray-500">Operadores de balcão autorizados</span>
            </div>
          </div>

          {/* Tabela de Caixas Delegados */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900">Quadro de Delegações para Cobrança de Emolumentos</h3>
                <p className="text-xs text-gray-500">Colaboradores autorizados a receber propinas, multas, cartões e emitir recibos.</p>
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
                <p className="text-xs font-bold text-gray-500">Nenhum colaborador com delegação de cobrança ativa no momento.</p>
                {ehDiretorOuSub && (
                  <button
                    type="button"
                    onClick={() => { setTipoModal('CobrancaEmolumentos'); setShowModalNova(true); }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
                  >
                    Atribuir Delegação de Caixa
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-700 font-black border-b border-gray-200">
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
                  <tbody className="divide-y divide-gray-100">
                    {delegacoesCobranca.map((del) => (
                      <tr key={del.id} className="hover:bg-gray-50/80">
                        <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                            {del.funcionarioNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{del.funcionarioNome}</div>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {del.funcionarioId.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">{del.funcionarioCargo}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800">{del.delegadoPorNome}</span>
                          <span className="text-[10px] text-gray-500 block">
                            {del.delegadoPorCargo === 'DiretorGeral' ? 'Diretor Geral' : 'Subdiretor Administrativo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700">
                          {del.dataInicio} até {del.dataFim || 'Indeterminado'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {del.ativo ? 'Ativo' : 'Revogado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate" title={del.motivo}>
                          {del.motivo || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {del.ativo && ehDiretorOuSub && (
                            <button
                              type="button"
                              onClick={() => handleRevogar(del.id, del.funcionarioNome)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                            >
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Relatório Financeiro Individual por Caixa Delegado */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900">Relatório Financeiro de Fecho de Caixa por Delegado</h3>
                <p className="text-xs text-gray-500">Valores totais cobrados em Kwanzas e discriminação de formas de pagamento por operador.</p>
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
                  <div key={del.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 text-sm">{del.funcionarioNome}</h4>
                          <span className="text-[11px] text-gray-500">{del.funcionarioCargo}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        del.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {del.ativo ? 'Caixa Ativo' : 'Encerrado'}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Arrecadado</span>
                      <strong className="text-xl font-black text-emerald-700">
                        {totalKz.toLocaleString('pt-AO')} <span className="text-xs">Kz</span>
                      </strong>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-[9px] text-gray-500 block">Numerário</span>
                        <strong className="font-black text-gray-800">{numerario.toLocaleString('pt-AO')} Kz</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-[9px] text-gray-500 block">TPA / Multicaixa</span>
                        <strong className="font-black text-blue-900">{tpa.toLocaleString('pt-AO')} Kz</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-[9px] text-gray-500 block">Transferência</span>
                        <strong className="font-black text-indigo-900">{transf.toLocaleString('pt-AO')} Kz</strong>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-600 border-t border-slate-200 pt-2">
                      <div className="flex justify-between">
                        <span>Recibos Emitidos:</span>
                        <strong className="text-gray-900">{logsDeste.length} recibos</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Prestação de Contas:</span>
                        <span className="font-bold text-emerald-700">Conforme Regulamento MED</span>
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
      {/* ABA 3: LIVRO DE AUDITORIA DE AÇÕES DELEGADAS                              */}
      {/* ========================================================================= */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-900">Livro de Auditoria de Ações Executadas por Delegados</h3>
              <p className="text-xs text-gray-500">Histórico cronológico imutável com carimbo de tempo, discente, tipo de ato e valor cobrado.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 self-start sm:self-auto">
              {logs.length} atos registados
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-500">Nenhuma ação executada sob poder delegado registada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-black border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Data & Hora</th>
                    <th className="py-3 px-3">Colaborador / Operador</th>
                    <th className="py-3 px-3">Competência</th>
                    <th className="py-3 px-3">Ação</th>
                    <th className="py-3 px-3">Discente / Processo</th>
                    <th className="py-3 px-3">Valor / Recibo</th>
                    <th className="py-3 px-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                        {new Date(log.dataHora).toLocaleString('pt-AO')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                        {log.funcionarioNome}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.tipo === 'Matriculas' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.tipo === 'Matriculas' ? 'Matrículas' : 'Cobrança'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800">
                        {log.acao}
                      </td>
                      <td className="py-2.5 px-3 text-gray-900 font-medium">
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
                      <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate" title={log.detalhes}>
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
      {/* MODAL: NOVA DELEGAÇÃO DE PODERES                                          */}
      {/* ========================================================================= */}
      {showModalNova && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center space-x-2 text-blue-900">
                <ShieldCheck className="h-6 w-6 text-blue-700" />
                <div>
                  <h3 className="font-black text-sm text-gray-900">
                    Despacho de Delegação de Competências
                  </h3>
                  <p className="text-[11px] text-gray-500">Autoridade estatutária da Direção Geral / Subdireção Administrativa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalNova(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarDelegacao} className="space-y-4 text-xs">
              {/* Tipo de Delegação */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">Tipo de Delegação de Poderes:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoModal('Matriculas')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                      tipoModal === 'Matriculas'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <ClipboardCheck className={`h-4 w-4 shrink-0 mt-0.5 ${tipoModal === 'Matriculas' ? 'text-blue-700' : 'text-gray-400'}`} />
                    <div>
                      <strong className="block text-gray-900 font-bold">Matrículas & Confirmações</strong>
                      <span className="text-[10px] text-gray-500 leading-tight block">Inscrição e confirmação de estudantes</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoModal('CobrancaEmolumentos')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                      tipoModal === 'CobrancaEmolumentos'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className={`h-4 w-4 shrink-0 mt-0.5 ${tipoModal === 'CobrancaEmolumentos' ? 'text-emerald-700' : 'text-gray-400'}`} />
                    <div>
                      <strong className="block text-gray-900 font-bold">Cobrança de Emolumentos</strong>
                      <span className="text-[10px] text-gray-500 leading-tight block">Recepção de propinas e emissão de recibos</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Seleção do Colaborador / Professor */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Selecione o Colaborador ou Professor a Delegar: <span className="text-red-500">*</span>
                </label>
                <select
                  value={selFuncionarioId}
                  onChange={(e) => setSelFuncionarioId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 text-xs"
                  required
                >
                  <option value="">-- Selecione o colaborador da instituição --</option>
                  {funcionarios
                    .filter(f => f.ativo !== false && f.id !== currentUser.id)
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
                  <label className="block font-bold text-gray-800 mb-1">Data de Início:</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Data de Término (Opcional):</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    placeholder="Em branco = até revogação"
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-xs"
                  />
                </div>
              </div>

              {/* Motivo Administrativo */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">Motivo / Fundamentação do Despacho:</label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Necessidade imperiosa de reforço no atendimento ao público durante a fase intensiva de matrículas do ano letivo..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-xs focus:bg-white"
                />
              </div>

              {/* Aviso Legal de Responsabilidade */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <strong className="block font-bold">Aviso de Auditoria e Vinculação:</strong>
                <span>
                  O colaborador delegado responderá disciplinar e administrativamente pelos atos praticados no sistema. Todas as operações efetuadas serão carimbadas no Livro de Auditoria com a sua identidade oficial.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModalNova(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
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
    </div>
  );
};
