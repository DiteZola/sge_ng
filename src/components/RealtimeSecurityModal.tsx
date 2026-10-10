import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Lock, 
  KeyRound, 
  RefreshCw, 
  Activity, 
  Terminal, 
  CloudCheck, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Play, 
  Sparkles,
  ArrowRight,
  Wifi,
  WifiOff,
  UserCheck,
  Unlock,
  Users
} from 'lucide-react';
import { securityEngine, RealtimeSecurityMetrics, SecurityEvent, SecurityAnomaly } from '../services/securityEngine';
import { cryptoService } from '../services/cryptoService';
import { dbService } from '../services/storage';

interface RealtimeSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirSetupInicial?: () => void;
}

export const RealtimeSecurityModal: React.FC<RealtimeSecurityModalProps> = ({
  isOpen,
  onClose,
  onAbrirSetupInicial
}) => {
  const [metrics, setMetrics] = useState<RealtimeSecurityMetrics>(() => securityEngine.obterMetricas());
  const [activeTab, setActiveTab] = useState<'monitor' | 'desbloqueio' | 'teste_aes' | 'forense' | 'sync_firebase'>('monitor');
  const [contasBloqueadas, setContasBloqueadas] = useState(() => securityEngine.obterTodasContasBloqueadas());
  const [identificadorManual, setIdentificadorManual] = useState('');
  const [feedbackDesbloqueio, setFeedbackDesbloqueio] = useState<string | null>(null);

  // Estado do Testador AES-256 ao Vivo
  const [textoParaCifrar, setTextoParaCifrar] = useState('001928374LA049 | SenhaMestraSegura#2025');
  const [resultadoCifragem, setResultadoCifragem] = useState<string>('');
  const [resultadoDecifragem, setResultadoDecifragem] = useState<string>('');
  const [checksumTeste, setChecksumTeste] = useState<string>('');
  const [latenciaMs, setLatenciaMs] = useState<number | null>(null);
  const [testando, setTestando] = useState(false);

  // Estado da Varredura Forense
  const [resultadoForense, setResultadoForense] = useState<any>(null);
  const [varrendo, setVarrendo] = useState(false);

  // Estado do Teste de Sincronização Firebase
  const [payloadExemplo, setPayloadExemplo] = useState<any>({
    alunoNome: 'Mário Domingos Kwanza',
    numeroBI: '003819283ZE045',
    password: 'Aluno@Segura#2025',
    valorKz: 18500,
    ibanEscola: 'AO06.0040.0000.1234.5678.9012.3'
  });
  const [payloadCifrado, setPayloadCifrado] = useState<any>(null);
  const [sincronizandoSimulacao, setSincronizandoSimulacao] = useState(false);

  const atualizarContas = () => {
    setContasBloqueadas(securityEngine.obterTodasContasBloqueadas());
  };

  // Subscrever ao motor de segurança em tempo real e aos eventos de anomalia
  useEffect(() => {
    if (!isOpen) return;
    const desinscrever = securityEngine.subscrever((novasMetricas) => {
      setMetrics(novasMetricas);
      atualizarContas();
    });

    const handleAnomaly = (e: any) => {
      setMetrics(securityEngine.obterMetricas());
      atualizarContas();
    };

    window.addEventListener('sge_security_anomaly_detected', handleAnomaly);
    window.addEventListener('sge_security_alert', handleAnomaly);
    window.addEventListener('sge_security_alert_cleared', handleAnomaly);

    return () => {
      desinscrever();
      window.removeEventListener('sge_security_anomaly_detected', handleAnomaly);
      window.removeEventListener('sge_security_alert', handleAnomaly);
      window.removeEventListener('sge_security_alert_cleared', handleAnomaly);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetarBloqueio = (identificador: string) => {
    const res = securityEngine.resetarBloqueioCredenciais(identificador, 'Administrador Geral');
    setFeedbackDesbloqueio(res.mensagem);
    atualizarContas();
    setMetrics(securityEngine.obterMetricas());
    setTimeout(() => setFeedbackDesbloqueio(null), 4000);
  };

  const handleResetarManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificadorManual.trim()) return;
    handleResetarBloqueio(identificadorManual.trim());
    setIdentificadorManual('');
  };

  // Testar Criptografia AES-256
  const handleExecutarTesteAES = async () => {
    setTestando(true);
    const inicio = performance.now();
    try {
      const cifrado = await cryptoService.encriptarTexto(textoParaCifrar);
      const decifrado = await cryptoService.decriptarTexto(cifrado);
      const hash = await cryptoService.calcularSHA256(textoParaCifrar);
      const fim = performance.now();

      setResultadoCifragem(cifrado);
      setResultadoDecifragem(decifrado);
      setChecksumTeste(hash);
      setLatenciaMs(Math.round((fim - inicio) * 100) / 100);

      securityEngine.registarEvento({
        categoria: 'AES256',
        severidade: 'SUCESSO',
        titulo: 'Benchmark AES-256 Manual Executado',
        detalhes: `Cifragem e decifragem NIST SP 800-38D concluídas em ${Math.round((fim - inicio) * 100) / 100}ms.`
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setTestando(false);
    }
  };

  // Executar Varredura Forense
  const handleExecutarVarreduraForense = async () => {
    setVarrendo(true);
    try {
      const res = await securityEngine.executarVarreduraIntegridade();
      setResultadoForense(res);
    } finally {
      setVarrendo(false);
    }
  };

  // Simular Sincronização Firebase com Proteção AES-256
  const handleSimularSyncFirebase = async () => {
    setSincronizandoSimulacao(true);
    try {
      const cifrado = await dbService.prepararDadosParaSincronizacao('TransacoesFinanceiras', payloadExemplo);
      setPayloadCifrado(cifrado);
    } finally {
      setSincronizandoSimulacao(false);
    }
  };

  // Testar Verificação de Admin Geral Online
  const handleVerificarAdminOnline = async () => {
    const res = await dbService.verificarAdminGeralOnline();
    if (!res.existe && onAbrirSetupInicial) {
      onClose();
      onAbrirSetupInicial();
    }
  };

  // Resetar Admin Geral para testar Onboarding
  const handleRedefinirAdmin = () => {
    if (confirm('Atenção: Deseja redefinir o Administrador Geral para testar a Página de Configuração Inicial do Sistema?')) {
      dbService.redefinirAdminGeralParaTestes();
      onClose();
      if (onAbrirSetupInicial) {
        onAbrirSetupInicial();
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Header do Motor de Segurança */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-wide text-white">
                  Motor de Segurança & Criptografia AES-256
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  TEMPO REAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Web Crypto API Nativa • Galois/Counter Mode (AES-GCM 256 bits) • NIST FIPS 197
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Anomalia ou Tentativas Repetidas Detetadas */}
        {metrics.anomaliaAtiva && (
          <div className="bg-red-950/90 border-b border-red-500/50 p-4 text-xs text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <div className="font-bold text-red-100 flex items-center space-x-2">
                  <span>{metrics.anomaliaAtiva.titulo}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[10px]">
                    {metrics.anomaliaAtiva.severidade}
                  </span>
                </div>
                <div className="text-[11px] text-red-300 mt-0.5 max-w-2xl">
                  {metrics.anomaliaAtiva.detalhes}
                </div>
              </div>
            </div>
            {metrics.anomaliaAtiva.identificadorVisado && (
              <button
                onClick={() => handleResetarBloqueio(metrics.anomaliaAtiva!.identificadorVisado!)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Resetar Bloqueio Imediatamente</span>
              </button>
            )}
          </div>
        )}

        {/* Feedback de Ação */}
        {feedbackDesbloqueio && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-3 text-xs text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{feedbackDesbloqueio}</span>
          </div>
        )}

        {/* Telemetria Cards em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Criptografia</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400">{metrics.statusCriptografia}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              FP: {metrics.keyFingerprint}
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Banco de Dados (Listener 5s)</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className={`text-xs font-bold ${metrics.statusBancoDados?.localArmazenamentoOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.statusBancoDados?.localArmazenamentoOk ? 'Saudável (100%)' : 'Inconsistência'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {metrics.statusBancoDados?.totalColecoes || 12} coleções · {( (metrics.statusBancoDados?.tamanhoBytes || 14000) / 1024 ).toFixed(1)} KB
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Bloqueios de Credenciais</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className={`text-xs font-bold ${contasBloqueadas.filter(c => c.bloqueado).length > 0 ? 'text-red-400 font-black' : 'text-slate-300'}`}>
                {contasBloqueadas.filter(c => c.bloqueado).length} usuário(s) bloqueado(s)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Master Lock: {metrics.masterLockAtivo ? 'Travado (Seguro)' : 'Inativo'}
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Rede & Firebase</span>
            <span className="text-xs font-bold text-indigo-300 mt-0.5 block truncate">
              {metrics.modoConexao}
            </span>
            <span className={`text-[10px] block mt-1 font-bold ${metrics.taxaAmeaca === 'Crítica' ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              Ameaças: {metrics.taxaAmeaca}
            </span>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 gap-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'monitor'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Feed ao Vivo & Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('desbloqueio')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'desbloqueio'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>Desbloqueio de Credenciais</span>
            {contasBloqueadas.filter(c => c.bloqueado).length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-mono">
                {contasBloqueadas.filter(c => c.bloqueado).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('teste_aes')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'teste_aes'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Testador AES-256</span>
          </button>

          <button
            onClick={() => setActiveTab('sync_firebase')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'sync_firebase'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudCheck className="w-4 h-4" />
            <span>Sincronização Firebase</span>
          </button>

          <button
            onClick={() => setActiveTab('forense')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'forense'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoria Forense</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* ========================================================= */}
          {/* ABA 1: FEED AO VIVO & TERMINAL DE AUDITORIA               */}
          {/* ========================================================= */}
          {activeTab === 'monitor' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Terminal de Eventos Criptográficos e Integridade:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleVerificarAdminOnline}
                    className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 rounded-lg text-[11px] font-bold text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Verificar Admin Online</span>
                  </button>
                  <button
                    onClick={handleRedefinirAdmin}
                    className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-400/30 rounded-lg text-[11px] font-bold text-amber-300 flex items-center space-x-1 cursor-pointer"
                    title="Limpa o Admin Geral para exibir a página de configuração inicial"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Testar Setup Inicial</span>
                  </button>
                </div>
              </div>

              {/* Console Feed */}
              <div className="bg-black/90 rounded-xl border border-slate-800 p-3 h-80 overflow-y-auto font-mono text-[11px] space-y-2">
                {metrics.eventosRecentes.map((ev) => (
                  <div key={ev.id} className="p-2 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          ev.severidade === 'SUCESSO' ? 'bg-emerald-500/20 text-emerald-400' :
                          ev.severidade === 'AVISO' ? 'bg-amber-500/20 text-amber-400' :
                          ev.severidade === 'CRITICO' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {ev.categoria}
                        </span>
                        <span className="font-bold text-slate-200">{ev.titulo}</span>
                      </div>
                      <span className="text-slate-500">{ev.timestamp}</span>
                    </div>
                    <p className="text-slate-400 text-[10.5px] mt-1 pl-1">
                      {ev.detalhes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: CONTROLE DE BLOQUEIOS & DESBLOQUEIO DE CREDENCIAIS   */}
          {/* ========================================================= */}
          {activeTab === 'desbloqueio' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm mb-1">
                  <Unlock className="w-5 h-5 text-amber-400" />
                  <span>Controle Central de Bloqueios por Tentativas de Senha</span>
                </div>
                <p className="text-xs text-slate-400">
                  Sempre que um utilizador excede 3 tentativas erradas de palavra-passe, o sistema bloqueia o acesso por 15 minutos para prevenir ataques de força bruta.
                  Como <strong>Administrador Geral</strong>, pode resetar o bloqueio de qualquer utilizador para permitir-lhe tentar entrar novamente de imediato.
                </p>

                {/* Formulário de Desbloqueio Rápido por Identificador */}
                <form onSubmit={handleResetarManual} className="mt-4 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={identificadorManual}
                    onChange={(e) => setIdentificadorManual(e.target.value)}
                    placeholder="Digite o e-mail ou BI do utilizador a desbloquear..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-white placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Desbloquear Utilizador</span>
                  </button>
                </form>
              </div>

              {/* Lista de Utilizadores com Tentativas ou Bloqueio Ativo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Contas Monitoradas / Bloqueadas ({contasBloqueadas.length})</span>
                  </h4>
                  <button
                    onClick={atualizarContas}
                    className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Atualizar Lista</span>
                  </button>
                </div>

                {contasBloqueadas.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-300">Nenhum Utilizador Bloqueado</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Todas as contas do sistema estão ativas e sem bloqueios preventivos no momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contasBloqueadas.map((conta) => (
                      <div 
                        key={conta.identificador} 
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          conta.bloqueado 
                            ? 'bg-red-950/40 border-red-500/40' 
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-white">
                              {conta.identificador}
                            </span>
                            {conta.bloqueado ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center space-x-1">
                                <Lock className="w-3 h-3" />
                                <span>Bloqueado (3+ Falhas)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                {conta.tentativas}/3 Falhas
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Origem IP: <strong className="font-mono text-slate-300">{conta.ip}</strong></span>
                            {conta.segundosRestantes > 0 && (
                              <span className="text-amber-300">
                                Desbloqueio automático em: <strong>{Math.ceil(conta.segundosRestantes / 60)} min</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleResetarBloqueio(conta.identificador)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
                        >
                          <Unlock className="w-4 h-4" />
                          <span>Resetar Bloqueio & Permitir Acesso</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: TESTADOR MANUAL DE CRIPTOGRAFIA AES-256            */}
          {/* ========================================================= */}
          {activeTab === 'teste_aes' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Texto Plano para Cifragem com Web Crypto API (SubtleCrypto):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textoParaCifrar}
                    onChange={e => setTextoParaCifrar(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="Introduza dados sensíveis (ex: senhas, números de BI, valores)..."
                  />
                  <button
                    onClick={handleExecutarTesteAES}
                    disabled={testando || !textoParaCifrar}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
                  >
                    {testando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Executar AES-256</span>
                  </button>
                </div>
              </div>

              {resultadoCifragem && (
                <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-800 pb-2">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Resultado da Cifragem em Tempo Real:</span>
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">
                      Latência: {latenciaMs} ms
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Payload Cifrado (IV + Ciphertext):</span>
                    <div className="p-2 bg-slate-900 rounded-lg text-emerald-400 break-all select-all mt-1">
                      {resultadoCifragem}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Decifragem Verificada com Sucesso:</span>
                    <div className="p-2 bg-slate-900 rounded-lg text-white break-all mt-1">
                      {resultadoDecifragem}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Checksum SHA-256 da Origem:</span>
                    <div className="p-2 bg-slate-900 rounded-lg text-indigo-300 break-all text-[11px] mt-1">
                      {checksumTeste}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: SINCRONIZAÇÃO SEGURA FIREBASE                     */}
          {/* ========================================================= */}
          {activeTab === 'sync_firebase' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Camada Intermédia de Proteção Pré-Firebase</h4>
                    <p className="text-[11px] text-slate-400">
                      Antes de qualquer mutação ser enviada ao Firestore, os campos sensíveis passam por proteção AES-256 no cliente.
                    </p>
                  </div>
                  <button
                    onClick={handleSimularSyncFirebase}
                    disabled={sincronizandoSimulacao}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    {sincronizandoSimulacao ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudCheck className="w-4 h-4" />}
                    <span>Blindar & Criptografar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">Payload Local Original (Texto Claro):</span>
                    <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto">
                      {JSON.stringify(payloadExemplo, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="text-emerald-400 font-bold block mb-1">Payload que Viaja para o Firebase (AES-256):</span>
                    <pre className="p-3 bg-slate-900 rounded-xl border border-emerald-500/30 text-emerald-300 overflow-x-auto">
                      {payloadCifrado ? JSON.stringify(payloadCifrado, null, 2) : '// Clique em "Blindar & Criptografar" para ver o payload seguro'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 4: AUDITORIA FORENSE & CHECKSUM                      */}
          {/* ========================================================= */}
          {activeTab === 'forense' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Varredura Forense de Integridade de Dados</h4>
                    <p className="text-[11px] text-slate-400">
                      Audita tabelas do IndexedDB e LocalStorage gerando assinaturas criptográficas SHA-256 para prevenir adulteração.
                    </p>
                  </div>
                  <button
                    onClick={handleExecutarVarreduraForense}
                    disabled={varrendo}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    {varrendo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Executar Varredura Forense</span>
                  </button>
                </div>

                {resultadoForense && (
                  <div className="p-4 bg-slate-900 rounded-xl border border-indigo-500/30 space-y-2 text-xs font-mono">
                    <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{resultadoForense.detalhes}</span>
                    </div>
                    <div className="text-slate-300">
                      Tabelas Auditadas: <strong>{resultadoForense.itensVerificados}</strong>
                    </div>
                    <div className="text-indigo-300 break-all">
                      Assinatura SHA-256 Global: <strong>{resultadoForense.checksumGeral}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Enclave Criptográfico Seguro SGE-NG Angola</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
