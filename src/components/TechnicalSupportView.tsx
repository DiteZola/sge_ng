import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Send, 
  AlertTriangle, 
  Lock, 
  Eye, 
  ShieldCheck,
  LogOut,
  X
} from 'lucide-react';
import { Escola, Funcionario, SolicitacaoApoioTecnico } from '../types';
import { dbService } from '../services/storage';
import { antiSpamService } from '../services/antiSpamService';

interface TechnicalSupportViewProps {
  currentUser: Funcionario;
  escola: Escola;
  escolas?: Escola[];
  onSelecionarEscolaParaApoio?: (escolaId: string) => void;
  onEscolaInspecionada?: (escolaId: string) => void;
  onIniciarApoioTecnico?: (escolaId: string, solicitacaoId: string) => void;
  onEncerrarApoioTecnico?: (escolaId?: string) => void;
}

const isStatusPendente = (sol: SolicitacaoApoioTecnico) => {
  const s = String(sol.status || sol.estado || 'Pendente').toLowerCase();
  return s === 'pendente' || s === 'aberto';
};

const isStatusEmAtendimento = (sol: SolicitacaoApoioTecnico) => {
  const s = String(sol.status || sol.estado || '').toLowerCase();
  return s === 'em_atendimento' || s === 'em atendimento';
};

const isStatusConcluido = (sol: SolicitacaoApoioTecnico) => {
  const s = String(sol.status || sol.estado || '').toLowerCase();
  return s === 'concluido' || s === 'concluído' || s === 'resolvido' || s === 'encerrado';
};

const isStatusRecusado = (sol: SolicitacaoApoioTecnico) => {
  const s = String(sol.status || sol.estado || '').toLowerCase();
  return s === 'recusado';
};

export const TechnicalSupportView: React.FC<TechnicalSupportViewProps> = ({
  currentUser,
  escola,
  escolas = [],
  onSelecionarEscolaParaApoio,
  onEscolaInspecionada,
  onIniciarApoioTecnico,
  onEncerrarApoioTecnico
}) => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoApoioTecnico[]>(() => 
    dbService.getSolicitacoesApoioTecnico()
  );
  const [escolasLocais, setEscolasLocais] = useState<Escola[]>(() =>
    escolas.length > 0 ? escolas : dbService.getEscolas()
  );
  
  // Modal/Formulário de nova solicitação (Diretor Geral)
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [urgencia, setUrgencia] = useState<'Baixa' | 'Media' | 'Alta' | 'Critica'>('Alta');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [hpTicketTrap, setHpTicketTrap] = useState('');

  // Painel inline de notas técnicas (sem window.prompt)
  const [respostaAlvo, setRespostaAlvo] = useState<{
    id: string;
    status: 'Em_Atendimento' | 'Concluido' | 'Recusado';
    titulo: string;
  } | null>(null);
  const [notasTecnicas, setNotasTecnicas] = useState('');

  const isAdminGeral = currentUser.role === 'AdminGeral';

  const recarregar = () => {
    setSolicitacoes(dbService.getSolicitacoesApoioTecnico());
    setEscolasLocais(dbService.getEscolas());
  };

  useEffect(() => {
    recarregar();
  }, [escola?.id, escolas]);

  useEffect(() => {
    const handleSync = () => recarregar();
    window.addEventListener('sge_dados_atualizados_remoto', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('sge_dados_atualizados_remoto', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const escolasComSessaoAtiva = isAdminGeral
    ? escolasLocais.filter(e => Boolean(e.sessaoApoioTecnicoAtiva && e.sessaoApoioTecnicoAtiva.dataInicio))
    : [];

  const handleCriarSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    setSucessoMsg(null);
    setErroMsg(null);

    if (!motivo.trim() || !descricao.trim()) {
      setErroMsg('Por favor, preencha o motivo e a descrição detalhada do problema técnico.');
      return;
    }

    const validacao = antiSpamService.validarSubmissao({
      acao: 'apoio_tecnico',
      honeypotValor: hpTicketTrap,
      conteudoPrincipal: `${motivo} ${descricao}`,
      identificadorAutor: currentUser.id
    });
    if (!validacao.permitido) {
      setErroMsg(validacao.motivo || 'Submissão bloqueada pela proteção anti-spam.');
      return;
    }

    try {
      const nova = dbService.criarSolicitacaoApoioTecnico({
        escolaId: escola.id,
        nomeEscola: escola.nomeOficial,
        solicitadoPorId: currentUser.id,
        solicitadoPorNome: currentUser.nomeCompleto,
        motivo: motivo.trim(),
        descricaoProblema: descricao.trim(),
        urgencia
      });

      setSucessoMsg(`Solicitação #${nova.id.slice(-6)} enviada com sucesso à Equipa Técnica DTI / MED. O protocolo de suporte técnico foi registado.`);
      setMotivo('');
      setDescricao('');
      recarregar();
    } catch (err: any) {
      setErroMsg('Erro ao enviar solicitação: ' + err.message);
    }
  };

  const abrirPainelResposta = (sol: SolicitacaoApoioTecnico, status: 'Em_Atendimento' | 'Concluido' | 'Recusado') => {
    setRespostaAlvo({
      id: sol.id,
      status,
      titulo: sol.motivo || sol.assunto || 'Chamado de Apoio Técnico'
    });
    setNotasTecnicas(
      status === 'Concluido'
        ? 'Intervenção técnica concluída com sucesso em ambiente seguro.'
        : status === 'Em_Atendimento'
          ? 'Atendimento técnico iniciado pela Equipa DTI / MED.'
          : ''
    );
  };

  const confirmarResposta = () => {
    if (!respostaAlvo) return;
    dbService.responderSolicitacaoApoioTecnico(
      respostaAlvo.id,
      respostaAlvo.status,
      currentUser.nomeCompleto,
      notasTecnicas.trim() || undefined
    );
    if (respostaAlvo.status !== 'Em_Atendimento' && onEncerrarApoioTecnico) {
      const solObj = solicitacoes.find(s => s.id === respostaAlvo.id);
      if (solObj && escolasComSessaoAtiva.some(e => e.id === solObj.escolaId)) {
        onEncerrarApoioTecnico(solObj.escolaId);
      }
    }
    setSucessoMsg(`Chamado atualizado para "${respostaAlvo.status.replace('_', ' ')}" com sucesso.`);
    setRespostaAlvo(null);
    setNotasTecnicas('');
    recarregar();
  };

  const handleEncerrarSessaoDaEscola = (escolaId: string) => {
    if (onEncerrarApoioTecnico) {
      onEncerrarApoioTecnico(escolaId);
    } else {
      dbService.encerrarSessaoApoioTecnico(escolaId, currentUser);
    }
    setSucessoMsg('Sessão de apoio técnico encerrada com sucesso e acesso devolvido à escola.');
    recarregar();
  };

  const solicitacoesFiltradas = isAdminGeral 
    ? solicitacoes 
    : solicitacoes.filter(s => s.escolaId === escola.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {isAdminGeral ? 'Gestão Central de Apoio Técnico às Escolas' : 'Solicitação de Apoio Técnico Ministerial'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAdminGeral 
                ? 'Conforme o protocolo do MED, o Administrador Geral apenas inspeciona escolas mediante pedido formal do Diretor.'
                : 'Abra um chamado de apoio técnico junto da Direção de Tecnologias de Informação (DTI/MED).'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold rounded-full">
            {isAdminGeral ? 'DTI / Central' : `Instituição: ${escola.nomeOficial}`}
          </span>
        </div>
      </div>

      {/* Painel de Sessões Ativas (caso exista alguma sessão aberta em qualquer escola) */}
      {isAdminGeral && escolasComSessaoAtiva.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900">
              <LifeBuoy className="w-5 h-5 text-amber-700" />
              <h2 className="text-xs font-black uppercase tracking-wider">
                Sessão(ões) de Apoio Técnico em Curso ({escolasComSessaoAtiva.length})
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {escolasComSessaoAtiva.map(esc => (
              <div key={esc.id} className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{esc.nomeOficial}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    Iniciada em: {esc.sessaoApoioTecnicoAtiva?.dataInicio ? new Date(esc.sessaoApoioTecnicoAtiva.dataInicio).toLocaleString('pt-AO') : 'Agora'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEncerrarSessaoDaEscola(esc.id)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Encerrar Sessão</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {sucessoMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sucessoMsg}</span>
          </div>
          <button type="button" onClick={() => setSucessoMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {erroMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{erroMsg}</span>
          </div>
          <button type="button" onClick={() => setErroMsg(null)} className="text-red-700 hover:text-red-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Painel inline de parecer/conclusão técnica */}
      {isAdminGeral && respostaAlvo && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-indigo-950">
                {respostaAlvo.status === 'Em_Atendimento' ? 'Iniciar Atendimento Técnico' : respostaAlvo.status === 'Concluido' ? 'Concluir Chamado de Apoio' : 'Recusar Solicitação'}
              </h3>
              <p className="text-xs text-indigo-700 mt-0.5">Chamado: <strong>{respostaAlvo.titulo}</strong></p>
            </div>
            <button type="button" onClick={() => setRespostaAlvo(null)} className="p-1 text-indigo-600 hover:text-indigo-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-900 mb-1">Observações técnicas do atendimento:</label>
            <textarea
              value={notasTecnicas}
              onChange={(e) => setNotasTecnicas(e.target.value)}
              rows={2}
              placeholder="Descreva as ações executadas ou orientações à Direção..."
              className="w-full text-xs px-3 py-2 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setRespostaAlvo(null)}
              className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarResposta}
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
            >
              Confirmar Registo
            </button>
          </div>
        </div>
      )}

      {/* Se for Diretor Geral / Subdiretor, mostrar formulário de solicitação */}
      {!isAdminGeral && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-gray-900">Solicitar Apoio Técnico & Autorizar Acesso Provisório</h2>
                <p className="text-[11px] text-gray-500">Ao submeter, autoriza a Equipa Técnica DTI / MED a prestar assistência provisória à sua escola para resolução do incidente.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
              Controle Estrito de Acesso
            </span>
          </div>

          <form onSubmit={handleCriarSolicitacao} className="space-y-4">
            <div className="sr-only" aria-hidden="true">
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hpTicketTrap}
                onChange={(e) => setHpTicketTrap(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Motivo do Pedido de Apoio Técnico <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Inconsistência no encerramento de pauta do 1º Trimestre / Falha de sincronização"
                  required
                  className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nível de Urgência
                </label>
                <select
                  value={urgencia}
                  onChange={(e) => setUrgencia(e.target.value as any)}
                  className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Baixa">Baixa (Dúvida operacional)</option>
                  <option value="Media">Média (Ajuste de configuração)</option>
                  <option value="Alta">Alta (Bloqueio de lançamento ou matrículas)</option>
                  <option value="Critica">Crítica (Interrupção total / Erro de auditoria)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Descrição Detalhada do Problema Técnico <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Descreva exatamente o que ocorre, turmas ou disciplinas afetadas e mensagens de erro visíveis..."
                required
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-gray-500 italic">
                Nota: O acesso técnico é registado em auditoria ministerial com carimbo de tempo.
              </p>
              <button
                type="submit"
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Solicitação de Apoio</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Chamados */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-700" />
            <h2 className="text-sm font-bold text-gray-900">
              {isAdminGeral ? 'Solicitações Recebidas das Escolas' : 'Histórico de Apoio Técnico Solicitado'}
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Total: <strong>{solicitacoesFiltradas.length}</strong> registo(s)
          </span>
        </div>

        {solicitacoesFiltradas.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-gray-800">Nenhum chamado de apoio pendente</h3>
            <p className="text-[11px] text-gray-500 mt-1">Todas as escolas estão em pleno funcionamento regular sem incidentes registados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitacoesFiltradas.map((sol) => {
              const pendente = isStatusPendente(sol);
              const emAtendimento = isStatusEmAtendimento(sol);
              const concluido = isStatusConcluido(sol);
              const recusado = isStatusRecusado(sol);
              const sessaoAtivaEscola = escolasLocais.find(e => e.id === sol.escolaId && Boolean(e.sessaoApoioTecnicoAtiva?.dataInicio));
              const urg = sol.urgencia || sol.prioridade || 'Media';

              return (
                <div 
                  key={sol.id}
                  className={`p-4 rounded-xl border transition-all ${
                    pendente
                      ? 'border-amber-200 bg-amber-50/40' 
                      : emAtendimento
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        urg === 'Critica' 
                          ? 'bg-red-600 text-white' 
                          : urg === 'Alta'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        Urgência: {urg}
                      </span>
                      <span className="text-xs font-bold text-gray-900">{sol.motivo || sol.assunto}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        pendente ? 'bg-amber-100 text-amber-800' :
                        emAtendimento ? 'bg-indigo-100 text-indigo-800' :
                        concluido ? 'bg-emerald-100 text-emerald-800' :
                        recusado ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {concluido ? 'Concluído' : emAtendimento ? 'Em Atendimento' : recusado ? 'Recusado' : 'Pendente'}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500">{sol.dataSolicitacao}</span>
                    </div>
                  </div>

                  <div className="py-2.5 text-xs text-gray-700 leading-relaxed space-y-1">
                    <p>{sol.descricaoProblema || sol.descricao}</p>
                    {sol.respostaTecnica && (
                      <p className="text-[11px] text-indigo-800 bg-indigo-50/70 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                        <strong>Parecer DTI:</strong> {sol.respostaTecnica}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 gap-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span><strong>{sol.nomeEscola || sol.escolaNome}</strong> (Solicitado por: {sol.solicitadoPorNome || sol.diretorNome})</span>
                    </div>

                    {/* Ações para o Admin Geral */}
                    {isAdminGeral && !concluido && !recusado && (
                      <div className="flex flex-wrap items-center gap-2">
                        {onIniciarApoioTecnico && (
                          <button
                            type="button"
                            onClick={() => onIniciarApoioTecnico(sol.escolaId, sol.id)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="Aceder diretamente a todos os menus e funcionalidades do Diretor desta escola sem outras credenciais"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Aceder aos Menus do Diretor (Modo Suporte)</span>
                          </button>
                        )}

                        {sessaoAtivaEscola && (
                          <button
                            type="button"
                            onClick={() => handleEncerrarSessaoDaEscola(sol.escolaId)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Encerrar Sessão Ativa</span>
                          </button>
                        )}

                        {sol.autorizacaoAcessoValida && !onIniciarApoioTecnico && (onSelecionarEscolaParaApoio || onEscolaInspecionada) && (
                          <button
                            type="button"
                            onClick={() => (onSelecionarEscolaParaApoio || onEscolaInspecionada)?.(sol.escolaId)}
                            className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Inspecionar dados desta instituição sob autorização formal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspecionar Escola</span>
                          </button>
                        )}

                        {pendente && (
                          <button
                            type="button"
                            onClick={() => abrirPainelResposta(sol, 'Em_Atendimento')}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Iniciar Atendimento
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => abrirPainelResposta(sol, 'Concluido')}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Concluir Chamado
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

