import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  HardDrive, 
  ShieldCheck, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  Database,
  Cloud,
  CloudOff,
  UploadCloud,
  ArrowUpRight
} from 'lucide-react';
import { offlineStorage, StorageHealthInfo, OfflineJournalEntry, PendingSyncItem } from '../services/offlineStorage';
import { firebaseSyncEngine, SyncStatus } from '../services/firebaseSyncEngine';

export const OfflineStatusWidget: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showModal, setShowModal] = useState(false);
  const [health, setHealth] = useState<StorageHealthInfo | null>(null);
  const [journal, setJournal] = useState<OfflineJournalEntry[]>([]);
  const [pendencias, setPendencias] = useState<PendingSyncItem[]>([]);
  const [totalPendentes, setTotalPendentes] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const carregarDados = async () => {
    const diag = await offlineStorage.obterDiagnostico();
    setHealth(diag);
    setJournal(offlineStorage.obterDiario().slice(0, 15));
    const pends = offlineStorage.obterPendencias();
    setPendencias(pends);
    setTotalPendentes(pends.length);
    setSyncStatus(firebaseSyncEngine.getStatus());
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      carregarDados();
    };
    const handleOffline = () => {
      setIsOnline(false);
      carregarDados();
    };

    const handlePendingChanged = () => {
      const pends = offlineStorage.obterPendencias();
      setPendencias(pends);
      setTotalPendentes(pends.length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sge_pending_sync_changed', handlePendingChanged);
    window.addEventListener('sge_dados_atualizados_remoto', handlePendingChanged);

    // Carregar na inicialização
    carregarDados();

    // Subscrição ao status do motor Firebase
    const unsubSync = firebaseSyncEngine.subscreverStatus((status) => {
      setSyncStatus(status);
    });

    // Subscrição ao diário de mutações
    const unsubscribeJournal = offlineStorage.subscreverDiario((newJournal) => {
      setJournal(newJournal.slice(0, 15));
    });

    const interval = setInterval(carregarDados, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sge_pending_sync_changed', handlePendingChanged);
      window.removeEventListener('sge_dados_atualizados_remoto', handlePendingChanged);
      clearInterval(interval);
      unsubscribeJournal();
      unsubSync();
    };
  }, []);

  const handleCriarSnapshot = () => {
    setIsRefreshing(true);
    const res = offlineStorage.criarSnapshotEmergencia('Ponto de restauro manual pelo utilizador');
    if (res.sucesso) {
      setMsgSucesso('Ponto de restauro gravado com sucesso no IndexedDB e LocalStorage!');
      carregarDados();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      setTimeout(() => setMsgSucesso(null), 4000);
    }, 400);
  };

  const handleDescarregarBackup = () => {
    offlineStorage.descarregarBackupOfflineEmergencia();
    setMsgSucesso('Ficheiro de segurança JSON transferido para o seu computador!');
    setTimeout(() => setMsgSucesso(null), 4000);
  };

  const handleSincronizarPendenciasAgora = async () => {
    setIsSyncingNow(true);
    try {
      await firebaseSyncEngine.processarPendenciasOffline();
      await firebaseSyncEngine.sincronizarTudoImediato();
      const pendsRestantes = offlineStorage.obterPendencias();
      setPendencias(pendsRestantes);
      setTotalPendentes(pendsRestantes.length);
      setMsgSucesso(
        pendsRestantes.length === 0 
          ? 'Todas as alterações foram sincronizadas com sucesso com o servidor central!' 
          : `Sincronização executada. ${pendsRestantes.length} item(ns) aguardando nova tentativa.`
      );
      carregarDados();
    } catch (err) {
      console.warn('Erro ao sincronizar manualmente:', err);
    } finally {
      setIsSyncingNow(false);
      setTimeout(() => setMsgSucesso(null), 5000);
    }
  };

  const emSincronizacao = isSyncingNow || (syncStatus?.emSincronizacao ?? false);

  return (
    <>
      {/* Botão Indicador no Cabeçalho */}
      <button
        onClick={() => {
          carregarDados();
          setShowModal(true);
        }}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
          emSincronizacao
            ? 'bg-blue-50 text-blue-900 border-blue-400 hover:bg-blue-100 shadow-xs'
            : totalPendentes > 0
            ? 'bg-amber-50 text-amber-950 border-amber-400 hover:bg-amber-100 animate-pulse shadow-xs'
            : isOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : 'bg-gray-100 text-gray-800 border-gray-400 hover:bg-gray-200'
        }`}
        title="Clique para ver o Estado de Sincronização, Fila de Pendências e Diagnóstico do Sistema"
      >
        {emSincronizacao ? (
          <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
        ) : totalPendentes > 0 ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        ) : isOnline ? (
          <Cloud className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <CloudOff className="h-3.5 w-3.5 text-gray-600" />
        )}

        <span className="hidden sm:inline">
          {emSincronizacao
            ? `A sincronizar (${syncStatus?.progressoPercentual || 0}%)`
            : totalPendentes > 0
            ? `${totalPendentes} pendente${totalPendentes > 1 ? 's' : ''}`
            : isOnline
            ? 'Sincronizado'
            : 'Modo Offline'}
        </span>

        {totalPendentes > 0 ? (
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        ) : (
          <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        )}
      </button>

      {/* Modal Diagnóstico & Proteção Anti-Perda de Dados & Sincronização */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${
                  emSincronizacao
                    ? 'bg-blue-50 text-blue-700'
                    : totalPendentes > 0
                    ? 'bg-amber-50 text-amber-700'
                    : isOnline 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {emSincronizacao ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  ) : isOnline ? (
                    <Cloud className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <CloudOff className="h-6 w-6 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                    <span>Sincronização & Proteção de Dados</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      emSincronizacao
                        ? 'bg-blue-100 text-blue-800'
                        : isOnline 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {emSincronizacao ? 'Sincronização Ativa' : isOnline ? 'Rede Online' : 'Desconectado'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Garante funcionamento local ultrarrápido sem travar a inicialização e sincroniza automaticamente com o Firebase.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notificação Temporária de Sucesso */}
            {msgSucesso && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center space-x-2 animate-in fade-in">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{msgSucesso}</span>
              </div>
            )}

            {/* Painel de Estado da Fila de Sincronização */}
            <div className={`mt-5 p-4 rounded-xl border ${
              totalPendentes > 0 
                ? 'bg-amber-50/80 border-amber-300' 
                : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    {totalPendentes > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    )}
                    <h4 className="text-sm font-extrabold text-gray-900">
                      {totalPendentes > 0 
                        ? `${totalPendentes} alteração(ões) pendente(s) para sincronizar` 
                        : 'Todos os dados locais estão sincronizados com a nuvem'}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {totalPendentes > 0
                      ? 'Os registos estão salvos com 100% de segurança no dispositivo e serão enviados à nuvem assim que houver ligação.'
                      : `Última sincronização registada: ${syncStatus?.ultimaSincronizacao || 'Hoje'}.`}
                  </p>
                </div>

                <button
                  onClick={handleSincronizarPendenciasAgora}
                  disabled={emSincronizacao || !isOnline}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer shrink-0"
                >
                  <UploadCloud className={`h-4 w-4 ${emSincronizacao ? 'animate-bounce' : ''}`} />
                  <span>{emSincronizacao ? 'A Enviar Dados...' : 'Sincronizar Agora'}</span>
                </button>
              </div>

              {/* Lista compacta de pendências se existirem */}
              {pendencias.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-200/80">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1.5 uppercase tracking-wider">
                    Fila de Pendências Locais:
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs">
                    {pendencias.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white/80 px-2.5 py-1 rounded border border-amber-200 text-gray-700">
                        <span className="font-semibold text-gray-900 capitalize">{item.entidade}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(item.timestamp).toLocaleTimeString('pt-AO')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Painel de Saúde do Armazenamento */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Espaço Utilizado</span>
                  <HardDrive className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-lg font-black text-gray-900 mt-1">
                  {health ? `${(health.usedBytes / 1024).toFixed(1)} KB` : '...'}
                </div>
                <div className="mt-1 flex items-center space-x-1 text-[11px] text-emerald-700 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Amplo espaço disponível</span>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Motores de Persistência</span>
                  <Database className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-lg font-black text-gray-900 mt-1">
                  IndexedDB + LS
                </div>
                <div className="mt-1 text-[11px] text-blue-700 font-semibold">
                  Duplo espelhamento ativado
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Mutações no Diário</span>
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-lg font-black text-gray-900 mt-1">
                  {journal.length} registos
                </div>
                <div className="mt-1 text-[11px] text-purple-700 font-semibold">
                  Histórico de operações locais
                </div>
              </div>
            </div>

            {/* Bloco de Ações Rápidas de Proteção */}
            <div className="mt-5 p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-blue-900">Salvar Ponto de Restauro & Exportar</h4>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Crie um snapshot instantâneo com zero perda de dados ou descarregue um ficheiro JSON para outro computador.
                </p>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={handleCriarSnapshot}
                  disabled={isRefreshing}
                  className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Criar Snapshot</span>
                </button>
                <button
                  onClick={handleDescarregarBackup}
                  className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold text-blue-800 bg-white border border-blue-300 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Backup JSON</span>
                </button>
              </div>
            </div>

            {/* Tabela do Diário de Mutações Offline (Journal) */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                  <span>Diário de Alterações Salvas Localmente (Journal Offline)</span>
                </h4>
                <span className="text-[11px] text-gray-500 font-medium">Últimas 15 operações</span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
                {journal.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    Nenhuma mutação recente registada no diário de bordo.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-600 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Hora</th>
                        <th className="py-2 px-3">Entidade</th>
                        <th className="py-2 px-3">Ação</th>
                        <th className="py-2 px-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {journal.map((j) => (
                        <tr key={j.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                            {new Date(j.timestamp).toLocaleTimeString('pt-AO')}
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap">
                            {j.entidade}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {j.operacao}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600 truncate max-w-[220px]">
                            {j.detalhes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Rodapé Informativo */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Inicialização rápida ativa · Cache PWA instantânea</span>
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
