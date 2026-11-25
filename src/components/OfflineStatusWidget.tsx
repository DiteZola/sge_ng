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
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { offlineStorage, StorageHealthInfo, OfflineJournalEntry, PendingSyncItem } from '../services/offlineStorage';
import { firebaseSyncEngine, SyncStatus } from '../services/firebaseSyncEngine';
import { dbService } from '../services/storage';
import { periodicBackupService, PeriodicSnapshotMetadata } from '../services/periodicBackupService';
import { appUpdateService, AppUpdateState } from '../services/appUpdateService';

export const OfflineStatusWidget: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showModal, setShowModal] = useState(false);
  const [health, setHealth] = useState<StorageHealthInfo | null>(null);
  const [journal, setJournal] = useState<OfflineJournalEntry[]>([]);
  const [pendencias, setPendencias] = useState<PendingSyncItem[]>([]);
  const [totalPendentes, setTotalPendentes] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [snapshotsIDB, setSnapshotsIDB] = useState<PeriodicSnapshotMetadata[]>([]);
  const [updateState, setUpdateState] = useState<AppUpdateState>(() => appUpdateService.getState());
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isRequestingPersist, setIsRequestingPersist] = useState(false);

  const carregarDados = async () => {
    const isAdminGeral = dbService.getCurrentUser()?.role === 'AdminGeral';
    const [diag, snaps] = await Promise.all([
      offlineStorage.obterDiagnostico(),
      periodicBackupService.listarSnapshots().catch(() => [] as PeriodicSnapshotMetadata[])
    ]);
    setHealth(diag);
    setSnapshotsIDB(snaps);
    setJournal(offlineStorage.obterDiarioVisivel(isAdminGeral).slice(0, 15));
    const pends = offlineStorage.obterPendenciasVisiveis(isAdminGeral);
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
      const isAdminGeral = dbService.getCurrentUser()?.role === 'AdminGeral';
      const pends = offlineStorage.obterPendenciasVisiveis(isAdminGeral);
      setPendencias(pends);
      setTotalPendentes(pends.length);
    };

    const handlePeriodicChanged = () => {
      periodicBackupService.listarSnapshots().then(setSnapshotsIDB).catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sge_pending_sync_changed', handlePendingChanged);
    window.addEventListener('sge_dados_atualizados_remoto', handlePendingChanged);
    window.addEventListener('sge_periodic_backup_updated', handlePeriodicChanged);

    // Carregar na inicialização
    carregarDados();

    // Subscrição ao status do motor Firebase e de atualizações da app
    const unsubSync = firebaseSyncEngine.subscreverStatus((status) => {
      setSyncStatus(status);
    });
    const unsubUpdate = appUpdateService.subscrever((st) => {
      setUpdateState(st);
    });

    // Subscrição ao diário de mutações filtrado pelo perfil atual
    const unsubscribeJournal = offlineStorage.subscreverDiario(() => {
      const isAdminGeral = dbService.getCurrentUser()?.role === 'AdminGeral';
      setJournal(offlineStorage.obterDiarioVisivel(isAdminGeral).slice(0, 15));
    });

    const interval = setInterval(carregarDados, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sge_pending_sync_changed', handlePendingChanged);
      window.removeEventListener('sge_dados_atualizados_remoto', handlePendingChanged);
      window.removeEventListener('sge_periodic_backup_updated', handlePeriodicChanged);
      clearInterval(interval);
      unsubscribeJournal();
      unsubSync();
      unsubUpdate();
    };
  }, []);

  const handleCriarSnapshot = async () => {
    setIsRefreshing(true);
    try {
      offlineStorage.criarSnapshotEmergencia('Ponto de restauro manual pelo utilizador');
      const snap = await periodicBackupService.criarSnapshotAgora(
        'manual',
        'Snapshot manual em IndexedDB via Painel Offline'
      );
      if (snap) {
        setMsgSucesso('Snapshot completo gravado com sucesso no IndexedDB!');
      } else {
        setMsgSucesso('Ponto de restauro gravado com sucesso no IndexedDB e LocalStorage!');
      }
      await carregarDados();
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setMsgSucesso(null), 4000);
    }
  };

  const handleDescarregarBackup = () => {
    offlineStorage.descarregarBackupOfflineEmergencia();
    setMsgSucesso('Ficheiro de segurança JSON transferido para o seu computador!');
    setTimeout(() => setMsgSucesso(null), 4000);
  };

  const handleGarantirPersistencia = async () => {
    setIsRequestingPersist(true);
    try {
      const ok = await offlineStorage.solicitarPersistenciaNativa();
      await carregarDados();
      setMsgSucesso(
        ok
          ? 'Armazenamento persistente ativado! O navegador não removerá os seus dados offline.'
          : 'O navegador manteve o modo padrão; os snapshots em IndexedDB e ficheiros JSON garantem proteção total.'
      );
      setTimeout(() => setMsgSucesso(null), 5000);
    } finally {
      setIsRequestingPersist(false);
    }
  };

  const handleVerificarAtualizacao = async () => {
    setIsCheckingUpdate(true);
    try {
      const { hasUpdate, state } = await appUpdateService.verificarAtualizacaoAgora();
      setUpdateState(state);
      setMsgSucesso(
        hasUpdate
          ? `Nova versão disponível (${state.latestVersion || 'Atualização PWA'})! Clique em "Sincronizar e Atualizar" para aplicar.`
          : 'A aplicação já se encontra sincronizada na versão mais recente.'
      );
      setTimeout(() => setMsgSucesso(null), 5000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSincronizarPendenciasAgora = async () => {
    setIsSyncingNow(true);
    try {
      await firebaseSyncEngine.processarPendenciasOffline();
      await firebaseSyncEngine.sincronizarTudoImediato();
      const isAdminGeral = dbService.getCurrentUser()?.role === 'AdminGeral';
      const pendsRestantes = offlineStorage.obterPendenciasVisiveis(isAdminGeral);
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
      {/* Botão Indicador no Cabeçalho (compacto em dispositivos menores) */}
      <button
        type="button"
        onClick={() => {
          carregarDados();
          setShowModal(true);
        }}
        className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
          emSincronizacao
            ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 border-blue-400 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/70 shadow-xs'
            : totalPendentes > 0
            ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-400 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/70 animate-pulse shadow-xs'
            : isOnline
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title="Clique para ver o Estado de Sincronização, Fila de Pendências e Diagnóstico do Sistema"
      >
        {emSincronizacao ? (
          <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
        ) : totalPendentes > 0 ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : isOnline ? (
          <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <CloudOff className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
        )}

        <span className="hidden xl:inline whitespace-nowrap">
          {emSincronizacao
            ? `A sincronizar (${syncStatus?.progressoPercentual || 0}%)`
            : totalPendentes > 0
            ? `${totalPendentes} pendente${totalPendentes > 1 ? 's' : ''}`
            : isOnline
            ? 'Sincronizado'
            : 'Offline'}
        </span>

        {totalPendentes > 0 ? (
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        ) : (
          <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        )}
      </button>

      {/* Modal Diagnóstico & Proteção Anti-Perda de Dados & Sincronização */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  emSincronizacao
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : totalPendentes > 0
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : isOnline 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {emSincronizacao ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                  ) : isOnline ? (
                    <Cloud className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CloudOff className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>Sincronização &amp; Proteção de Dados</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      emSincronizacao
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                        : isOnline 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}>
                      {emSincronizacao ? 'Sincronização Ativa' : isOnline ? 'Rede Online' : 'Desconectado'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Garante funcionamento local ultrarrápido sem travar a inicialização e sincroniza automaticamente com o Firebase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notificação Temporária de Sucesso */}
            {msgSucesso && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center space-x-2 animate-in fade-in">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{msgSucesso}</span>
              </div>
            )}

            {/* Painel de Estado da Fila de Sincronização */}
            <div className={`mt-5 p-4 rounded-xl border ${
              totalPendentes > 0 
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    {totalPendentes > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {totalPendentes > 0 
                        ? `${totalPendentes} alteração(ões) pendente(s) para sincronizar` 
                        : 'Todos os dados locais estão sincronizados com a nuvem'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {totalPendentes > 0
                      ? 'Os registos estão salvos com 100% de segurança no dispositivo e serão enviados à nuvem assim que houver ligação.'
                      : `Última sincronização registada: ${syncStatus?.ultimaSincronizacao || 'Hoje'}.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSincronizarPendenciasAgora}
                  disabled={emSincronizacao || !isOnline}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 dark:disabled:bg-slate-700 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer shrink-0"
                >
                  <UploadCloud className={`h-4 w-4 ${emSincronizacao ? 'animate-bounce' : ''}`} />
                  <span>{emSincronizacao ? 'A Enviar Dados...' : 'Sincronizar Agora'}</span>
                </button>
              </div>

              {/* Lista compacta de pendências se existirem */}
              {pendencias.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-200/80 dark:border-amber-800/70">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block mb-1.5 uppercase tracking-wider">
                    Fila de Pendências Locais:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {pendencias.map((item) => {
                      const acao = (item.acao || 'ATUALIZAR').toUpperCase();
                      const badgeCls =
                        acao === 'ELIMINAR'
                          ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                          : acao === 'CRIAR'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-2 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0 ${badgeCls}`}>
                              {acao}
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-white capitalize block truncate">
                                {item.entidade}
                                {item.descricao ? ` · ${item.descricao}` : ''}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString('pt-AO')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Painel de Saúde do Armazenamento */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Espaço Utilizado</span>
                  <HardDrive className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {health ? `${(health.usedBytes / 1024).toFixed(1)} KB` : '...'}
                </div>
                <div className="mt-1 flex items-center space-x-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Amplo espaço disponível</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Motores de Persistência</span>
                  <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  IndexedDB + LS
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
                  {health?.isStoragePersisted ? (
                    <span className="text-emerald-700 dark:text-emerald-400">Persistência nativa ativa</span>
                  ) : (
                    <>
                      <span className="text-blue-700 dark:text-blue-400">Modo padrão</span>
                      <button
                        type="button"
                        onClick={handleGarantirPersistencia}
                        disabled={isRequestingPersist}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                      >
                        {isRequestingPersist ? 'A ativar...' : 'Blindar'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Snapshots IndexedDB</span>
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {snapshotsIDB.length} guardado{snapshotsIDB.length === 1 ? '' : 's'}
                </div>
                <div className="mt-1 text-[11px] text-purple-700 dark:text-purple-400 font-semibold truncate">
                  {snapshotsIDB[0]
                    ? `Último: ${new Date(snapshotsIDB[0].criadoEm).toLocaleTimeString('pt-AO')}`
                    : `${journal.length} mutações no diário`}
                </div>
              </div>
            </div>

            {/* Bloco de Ações Rápidas de Proteção */}
            <div className="mt-5 p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">Salvar Ponto de Restauro &amp; Exportar</h4>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                  Crie um snapshot completo em IndexedDB ou descarregue um ficheiro JSON para outro computador.
                </p>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCriarSnapshot}
                  disabled={isRefreshing}
                  className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Criar Snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={handleDescarregarBackup}
                  className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold text-blue-800 dark:text-blue-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Backup JSON</span>
                </button>
              </div>
            </div>

            {/* Bloco de Atualização da Aplicação Cross-Browser */}
            <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <Sparkles className={`h-4 w-4 shrink-0 ${updateState.updateAvailable ? 'text-amber-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {updateState.updateAvailable
                      ? `Nova versão disponível (${updateState.latestVersion || 'Atualização'})`
                      : `Versão instalada: ${updateState.currentVersion}`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sincronização automática compatível com Chrome, Edge, Firefox e Safari.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {updateState.updateAvailable ? (
                  <button
                    type="button"
                    onClick={() => appUpdateService.aplicarAtualizacaoESincronizar()}
                    disabled={updateState.updatingNow}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${updateState.updatingNow ? 'animate-spin' : ''}`} />
                    <span>{updateState.updatingNow ? 'A atualizar...' : 'Sincronizar e Atualizar'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerificarAtualizacao}
                    disabled={isCheckingUpdate || !isOnline}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'A verificar...' : 'Verificar Atualização'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabela do Diário de Mutações Offline (Journal) */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span>Diário de Alterações Salvas Localmente (Journal Offline)</span>
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Últimas 15 operações</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto bg-white dark:bg-slate-950 max-h-52 overflow-y-auto">
                {journal.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Nenhuma mutação recente registada no diário de bordo.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Hora</th>
                        <th className="py-2 px-3">Entidade</th>
                        <th className="py-2 px-3">Ação</th>
                        <th className="py-2 px-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {journal.map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="py-2 px-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                            {new Date(j.timestamp).toLocaleTimeString('pt-AO')}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {j.entidade}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {j.operacao}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[220px]">
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
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Inicialização rápida ativa · Cache PWA instantânea</span>
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
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
