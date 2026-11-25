import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X, ShieldCheck } from 'lucide-react';
import { appUpdateService, AppUpdateState } from '../services/appUpdateService';

export const AppUpdateBanner: React.FC = () => {
  const [updateState, setUpdateState] = useState<AppUpdateState>(() => appUpdateService.getState());
  const [dismissed, setDismissed] = useState<boolean>(() => appUpdateService.isUpdateDismissed());

  useEffect(() => {
    const unsub = appUpdateService.subscrever((s) => {
      setUpdateState(s);
      setDismissed(appUpdateService.isUpdateDismissed());
    });
    return unsub;
  }, []);

  if (!updateState.updateAvailable || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Atualização de versão disponível"
      className="fixed bottom-5 left-5 z-[96] max-w-md w-[calc(100vw-2.5rem)] bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-2xl border-2 border-blue-500/70 p-4 animate-in slide-in-from-bottom-4 duration-300 no-print"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/25 border border-blue-400/50 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
            {updateState.updatingNow ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black tracking-wide uppercase text-blue-300">
              Nova Atualização Disponível
            </h4>
            <p className="text-xs text-slate-200 leading-snug">
              Uma nova versão do SGE-NG foi publicada. Sincronize agora para aplicar melhorias mantendo 100% dos seus dados locais protegidos.
            </p>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Snapshot automático pré-atualização em IndexedDB</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            appUpdateService.dispensarBannerTemporariamente();
            setDismissed(true);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
          title="Lembrar mais tarde"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
        <button
          type="button"
          onClick={() => {
            appUpdateService.dispensarBannerTemporariamente();
            setDismissed(true);
          }}
          className="px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          Mais tarde
        </button>
        <button
          type="button"
          disabled={updateState.updatingNow}
          onClick={() => appUpdateService.aplicarAtualizacaoESincronizar()}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updateState.updatingNow ? 'animate-spin' : ''}`} />
          <span>{updateState.updatingNow ? 'A Sincronizar...' : 'Sincronizar e Atualizar Agora'}</span>
        </button>
      </div>
    </aside>
  );
};
