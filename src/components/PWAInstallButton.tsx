import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Se já estiver a rodar como PWA instalado (standalone), oculta
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  return (
    <>
      {/* Chromium / Android / Desktop */}
      {isInstallable && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-all border border-blue-500 cursor-pointer shrink-0"
          title="Instalar o SGE-NG no dispositivo para acesso offline permanente sem navegador"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline whitespace-nowrap">Instalar App</span>
        </button>
      )}

      {/* iOS Safari */}
      {isIOS && !isInstallable && (
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shrink-0"
          title="Instalar no iPhone / iPad"
        >
          <Smartphone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="hidden xl:inline whitespace-nowrap">Instalar iOS</span>
        </button>
      )}

      {/* Modal Guia para iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-blue-700 dark:text-blue-300">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instalar no iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Aceda offline sem barra do navegador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start space-x-2.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">1</span>
                <p>Toque no botão <strong>Partilhar</strong> (ícone do quadrado com a seta para cima) na barra inferior do Safari.</p>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">2</span>
                <p>Role para baixo e selecione a opção <strong>"Adicionar ao Ecrã Principal"</strong>.</p>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">3</span>
                <p>Confirme clicando em <strong>Adicionar</strong> no canto superior direito.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition shadow-sm cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Confirmação de Instalação Concluída */}
      {installSuccess && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 bg-green-700 text-white text-xs font-bold rounded-xl shadow-lg animate-in slide-in-from-bottom">
          <CheckCircle className="h-4 w-4" />
          <span>SGE-NG instalado com sucesso no dispositivo!</span>
        </div>
      )}
    </>
  );
};
