import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallNotification: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dispensado, setDispensado] = useState<boolean>(() => {
    const salvo = sessionStorage.getItem('sge_pwa_install_dismissed');
    return salvo === 'true';
  });

  if (isInstalled || dispensado) {
    return null;
  }

  const dispensarTemporariamente = () => {
    sessionStorage.setItem('sge_pwa_install_dismissed', 'true');
    setDispensado(true);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (isInstallable) {
      const instalado = await install();
      if (instalado) {
        setDispensado(true);
      }
    } else {
      // Fallback para navegadores que não disparam beforeinstallprompt imediatamente
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Barra de Notificação de Instalação do Aplicativo */}
      <div 
        className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white px-4 py-3 shadow-xl border-b border-blue-500/30 sticky top-0 z-40 transition-all animate-fade-in"
        role="alert"
        aria-live="polite"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="h-10 w-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="h-5 w-5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 justify-center sm:justify-start">
                <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
                  Instalar SGE Angola no seu Dispositivo
                </span>
                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  App PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                Aceda diretamente pelo ecrã inicial com inicialização instantânea e suporte offline integral.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar Aplicativo</span>
            </button>
            <button
              type="button"
              onClick={dispensarTemporariamente}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Dispensar por agora"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guia de Instalação (iOS Safari / Instruções Manuais) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2.5 text-blue-900">
                <Smartphone className="h-6 w-6 text-blue-700" />
                <h3 className="font-black text-sm text-slate-900">Como Instalar no seu Dispositivo</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pode instalar o <strong>SGE-NG Angola</strong> no seu telemóvel, tablet ou computador para usá-lo como uma aplicação nativa rápida:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg shrink-0">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">1. No iPhone ou iPad (Safari):</strong>
                  <span className="text-slate-600">
                    Toque no botão <strong>Partilhar</strong> (ícone de um quadrado com uma seta a apontar para cima) na barra inferior do Safari.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg shrink-0">
                  <PlusSquare className="h-4 w-4" />
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">2. Adicionar ao Ecrã Principal:</strong>
                  <span className="text-slate-600">
                    Role a lista para baixo e toque na opção <strong>"Adicionar ao Ecrã Principal"</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">3. No Android ou Chrome:</strong>
                  <span className="text-slate-600">
                    Toque nos três pontinhos no canto superior e clique em <strong>"Instalar aplicação"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Compreendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
