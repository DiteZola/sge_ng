import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CheckCircle2, 
  RefreshCw, 
  X,
  Sparkles
} from 'lucide-react';
import { firebaseSyncEngine, SyncStatus } from '../services/firebaseSyncEngine';

interface SyncProgressBarAndNotificationProps {
  onSyncComplete?: () => void;
}

export const SyncProgressBarAndNotification: React.FC<SyncProgressBarAndNotificationProps> = ({
  onSyncComplete
}) => {
  const [status, setStatus] = useState<SyncStatus>(() => firebaseSyncEngine.getStatus());
  const [notificacaoVisivel, setNotificacaoVisivel] = useState(false);
  const [mensagemNotificacao, setMensagemNotificacao] = useState('');
  const [horaNotificacao, setHoraNotificacao] = useState('');
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

  useEffect(() => {
    // 1. Escuta de status do motor de sincronização
    const unsub = firebaseSyncEngine.subscreverStatus((novoStatus) => {
      setStatus(novoStatus);
    });

    // 2. Escuta do evento de progresso detalhado
    const handleProgresso = (e: any) => {
      if (e.detail) {
        setStatus(prev => ({
          ...prev,
          progressoPercentual: e.detail.percentual ?? prev.progressoPercentual,
          etapaAtual: e.detail.etapa || prev.etapaAtual,
          emSincronizacao: e.detail.emSincronizacao ?? prev.emSincronizacao
        }));
      }
    };

    // 3. Escuta do evento de sincronização concluída com notificação garantida
    const handleNotificacao = (e: any) => {
      const msg = e.detail?.mensagem || 'Dados sincronizados com sucesso entre o dispositivo e o Firebase!';
      const hora = e.detail?.hora || new Date().toLocaleTimeString('pt-AO');
      setMensagemNotificacao(msg);
      setHoraNotificacao(hora);
      setNotificacaoVisivel(true);

      if (onSyncComplete) {
        onSyncComplete();
      }

      // Auto-ocultar após 7 segundos mantendo o badge acessível
      const timer = setTimeout(() => {
        setNotificacaoVisivel(false);
      }, 7000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('sge_sync_progresso', handleProgresso);
    window.addEventListener('sge_sync_notificacao', handleNotificacao);

    return () => {
      unsub();
      window.removeEventListener('sge_sync_progresso', handleProgresso);
      window.removeEventListener('sge_sync_notificacao', handleNotificacao);
    };
  }, [onSyncComplete]);

  // Verifica se o dispositivo já foi inicializado ou se o utilizador já usa o sistema
  const isDispositivoInicializado = () => {
    try {
      if (typeof localStorage === 'undefined') return true;
      const jaInicializado = localStorage.getItem('sge_dispositivo_inicializado') === 'true';
      const jaSincronizou = localStorage.getItem('sge_primeira_sincronizacao_concluida') === 'true';
      const temFuncionarios = !!localStorage.getItem('sge_funcionarios');
      const temEscolas = !!localStorage.getItem('sge_escolas');
      const isAuth = localStorage.getItem('sge_authenticated') === 'true';
      return jaInicializado || jaSincronizou || isAuth || (temFuncionarios && temEscolas);
    } catch {
      return true;
    }
  };

  const [dispositivoJaConfigurado, setDispositivoJaConfigurado] = useState<boolean>(() => isDispositivoInicializado());
  const [overlayMinimizado, setOverlayMinimizado] = useState(false);

  useEffect(() => {
    if (status.progressoPercentual === 100 || (!status.emSincronizacao && status.ultimaSincronizacao)) {
      try {
        localStorage.setItem('sge_dispositivo_inicializado', 'true');
        localStorage.setItem('sge_primeira_sincronizacao_concluida', 'true');
      } catch {}
      setDispositivoJaConfigurado(true);
    }
  }, [status.progressoPercentual, status.emSincronizacao, status.ultimaSincronizacao]);

  const handleForcarSincronizacao = async () => {
    try {
      await firebaseSyncEngine.sincronizarTudoImediato();
    } catch (err) {
      console.warn('Erro ao disparar sincronização manual:', err);
    }
  };

  // Indicador compacto e NÃO-BLOQUEANTE durante a sincronização inicial num novo dispositivo
  const deveExibirCardProgresso = !dispositivoJaConfigurado && !overlayMinimizado && status.emSincronizacao && status.progressoPercentual > 0 && status.progressoPercentual < 100;

  return (
    <>
      {/* 1. CARTÃO FLUTUANTE NÃO-BLOQUEANTE DE PROGRESSO INICIAL (permite usar o sistema imediatamente) */}
      {deveExibirCardProgresso && (
        <aside
          aria-label="Progresso de sincronização inicial"
          className="fixed bottom-5 right-5 z-40 bg-slate-900 border border-blue-500/40 rounded-2xl p-4 max-w-sm w-[calc(100vw-2rem)] shadow-2xl text-white animate-fadeIn"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Cloud className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white flex items-center space-x-1.5">
                  <span>A Sincronizar Dispositivo</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </h3>
                <p className="text-[10px] text-slate-400">Firebase Firestore ↔ Dispositivo</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {status.progressoPercentual}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setOverlayMinimizado(true);
                  setDispositivoJaConfigurado(true);
                  try {
                    localStorage.setItem('sge_dispositivo_inicializado', 'true');
                  } catch {}
                }}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ocultar progresso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-blue-200 truncate">
              {status.etapaAtual || 'A descarregar dados em segundo plano...'}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 p-0.5 border border-slate-700/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${Math.max(status.progressoPercentual, 8)}%` }}
              />
            </div>
          </div>
        </aside>
      )}

      {/* 2. NOTIFICAÇÃO FLUTUANTE DE SINCRONIZAÇÃO CONCLUÍDA */}
      {notificacaoVisivel && (
        <aside 
          aria-label="Notificações de sincronização"
          className="fixed bottom-5 right-5 z-40 max-w-md w-full bg-white dark:bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-slideUp text-gray-900 dark:text-white"
        >
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center space-x-1">
                  <span>Dispositivo Sincronizado</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block ml-1" />
                </h4>
                <button
                  type="button"
                  onClick={() => setNotificacaoVisivel(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                  title="Fechar Notificação"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-snug">
                {mensagemNotificacao}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400 dark:text-slate-400">
                <span>Horário: <strong>{horaNotificacao || status.ultimaSincronizacao}</strong></span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Firebase Firestore</span>
              </div>
            </div>
          </div>
        </aside>
      )}



      {/* 4. MODAL DE DETALHES DE SINCRONIZAÇÃO */}
      {modalDetalhesAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-gray-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Estado de Sincronização</h3>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">Firebase Firestore ↔ Armazenamento Local</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setModalDetalhesAberto(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <span className="text-gray-600 dark:text-slate-300">Conexão à Internet:</span>
                <span className={`font-bold flex items-center space-x-1 ${status.isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                  {status.isOnline ? 'Online (Ativa)' : 'Offline (Modo Local)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <span className="text-gray-600 dark:text-slate-300">Servidor Firebase Firestore:</span>
                <span className="font-bold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Conectado & Autorizado
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <span className="text-gray-600 dark:text-slate-300">Última Sincronização:</span>
                <strong className="font-mono text-gray-900 dark:text-white">{status.ultimaSincronizacao}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <span className="text-gray-600 dark:text-slate-300">Utilizadores no Dispositivo:</span>
                <strong className="font-mono text-blue-600 dark:text-blue-400">{status.totalUsuariosSincronizados} registados</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setModalDetalhesAberto(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={status.emSincronizacao}
                onClick={async () => {
                  await handleForcarSincronizacao();
                  setModalDetalhesAberto(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status.emSincronizacao ? 'animate-spin' : ''}`} />
                <span>Sincronizar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
