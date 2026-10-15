import React, { useState } from 'react';
import { 
  LifeBuoy, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Send, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Eye, 
  RotateCcw,
  UserCheck,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { Escola, Funcionario, SolicitacaoApoioTecnico } from '../types';
import { dbService } from '../services/storage';

interface TechnicalSupportViewProps {
  currentUser: Funcionario;
  escola: Escola;
  escolas?: Escola[];
  onSelecionarEscolaParaApoio?: (escolaId: string) => void;
  onEscolaInspecionada?: (escolaId: string) => void;
  onIniciarApoioTecnico?: (escolaId: string, solicitacaoId: string) => void;
}

export const TechnicalSupportView: React.FC<TechnicalSupportViewProps> = ({
  currentUser,
  escola,
  escolas = [],
  onSelecionarEscolaParaApoio,
  onEscolaInspecionada,
  onIniciarApoioTecnico
}) => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoApoioTecnico[]>(() => 
    dbService.getSolicitacoesApoioTecnico()
  );
  
  // Modal de nova solicitação (Diretor Geral)
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [urgencia, setUrgencia] = useState<'Baixa' | 'Media' | 'Alta' | 'Critica'>('Alta');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const isAdminGeral = currentUser.role === 'AdminGeral';

  // Atualizar lista
  const recarregar = () => {
    setSolicitacoes(dbService.getSolicitacoesApoioTecnico());
  };

  const handleCriarSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    setSucessoMsg(null);
    setErroMsg(null);

    if (!motivo.trim() || !descricao.trim()) {
      setErroMsg('Por favor, preencha o motivo e a descrição detalhada do problema técnico.');
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

      setSucessoMsg(`Solicitação #${nova.id.slice(-6)} enviada com sucesso ao Administrador Geral (DTI/MED). A autorização de acesso técnico foi concedida.`);
      setMotivo('');
      setDescricao('');
      recarregar();
    } catch (err: any) {
      setErroMsg('Erro ao enviar solicitação: ' + err.message);
    }
  };

  const handleResponder = (id: string, status: 'Em_Atendimento' | 'Concluido' | 'Recusado') => {
    const notas = prompt('Observações técnicas do atendimento:');
    dbService.responderSolicitacaoApoioTecnico(id, status, currentUser.nomeCompleto, notas || undefined);
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

      {/* Alertas */}
      {sucessoMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {erroMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{erroMsg}</span>
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
                <p className="text-[11px] text-gray-500">Ao submeter, você autoriza o Administrador Geral a inspecionar temporariamente os dados da sua escola para resolução.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
              Controle Estrito de Acesso
            </span>
          </div>

          <form onSubmit={handleCriarSolicitacao} className="space-y-4">
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
            {solicitacoesFiltradas.map((sol) => (
              <div 
                key={sol.id}
                className={`p-4 rounded-xl border transition-all ${
                  sol.status === 'Pendente' 
                    ? 'border-amber-200 bg-amber-50/40' 
                    : sol.status === 'Em_Atendimento'
                      ? 'border-indigo-200 bg-indigo-50/40'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      sol.urgencia === 'Critica' 
                        ? 'bg-red-600 text-white' 
                        : sol.urgencia === 'Alta'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      Urgência: {sol.urgencia}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{sol.motivo}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      sol.status === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                      sol.status === 'Em_Atendimento' ? 'bg-indigo-100 text-indigo-800' :
                      sol.status === 'Concluido' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(sol.status || sol.estado || 'Pendente').replace('_', ' ')}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">{new Date(sol.dataSolicitacao).toLocaleString('pt-AO')}</span>
                  </div>
                </div>

                <div className="py-2.5 text-xs text-gray-700 leading-relaxed">
                  <p>{sol.descricaoProblema}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 gap-2">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span><strong>{sol.nomeEscola}</strong> (Solicitado por: {sol.solicitadoPorNome})</span>
                  </div>

                  {/* Ações para o Admin Geral */}
                  {isAdminGeral && (
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

                      {sol.autorizacaoAcessoValida && onSelecionarEscolaParaApoio && (
                        <button
                          type="button"
                          onClick={() => onSelecionarEscolaParaApoio(sol.escolaId)}
                          className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Inspecionar dados desta instituição sob autorização formal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspecionar Escola</span>
                        </button>
                      )}

                      {sol.status === 'Pendente' && (
                        <button
                          type="button"
                          onClick={() => handleResponder(sol.id, 'Em_Atendimento')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Iniciar Atendimento
                        </button>
                      )}

                      {sol.status === 'Em_Atendimento' && (
                        <button
                          type="button"
                          onClick={() => handleResponder(sol.id, 'Concluido')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Concluir Chamado
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
