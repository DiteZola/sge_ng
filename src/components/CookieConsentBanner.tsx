import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, SlidersHorizontal, Check, X } from 'lucide-react';
import { dbService } from '../services/storage';
import {
  getCookieConsent,
  saveCookieConsent,
  openLegalPolicyModal
} from '../services/legalPoliciesService';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const cfg = dbService.getConfiguracaoSistema();
      if (cfg.bannerCookiesAtivo === false) return false;
      return !getCookieConsent().decisaoTomada;
    } catch {
      return false;
    }
  });
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferencias, setPreferencias] = useState(true);
  const [desempenho, setDesempenho] = useState(true);

  useEffect(() => {
    const handleReopen = () => {
      const atual = getCookieConsent();
      setPreferencias(atual.decisaoTomada ? atual.preferencias : true);
      setDesempenho(atual.decisaoTomada ? atual.desempenho : true);
      setShowCustomize(true);
      setVisible(true);
    };

    const handleConfigChange = () => {
      const cfg = dbService.getConfiguracaoSistema();
      if (cfg.bannerCookiesAtivo === false) {
        setVisible(false);
      } else if (!getCookieConsent().decisaoTomada) {
        setVisible(true);
      }
    };

    window.addEventListener('sge_open_cookie_banner', handleReopen);
    window.addEventListener('sge_configuracao_sistema_atualizada', handleConfigChange);
    return () => {
      window.removeEventListener('sge_open_cookie_banner', handleReopen);
      window.removeEventListener('sge_configuracao_sistema_atualizada', handleConfigChange);
    };
  }, []);

  if (!visible) return null;

  const aceitarTodos = () => {
    saveCookieConsent(true, true);
    setVisible(false);
  };

  const apenasEssenciais = () => {
    saveCookieConsent(false, false);
    setVisible(false);
  };

  const guardarPersonalizado = () => {
    saveCookieConsent(preferencias, desempenho);
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-3 left-3 right-3 sm:left-5 sm:right-5 max-w-5xl mx-auto z-[80] no-print"
      role="region"
      aria-label="Consentimento de Cookies e Privacidade"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 shrink-0 mt-0.5">
              <Cookie className="h-5 w-5 text-amber-300" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-white text-xs sm:text-sm">
                  Consentimento de Cookies &amp; Armazenamento Offline
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Sem Publicidade
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed max-w-3xl">
                Utilizamos cookies técnicos e armazenamento local (IndexedDB) essenciais para sessão segura, proteção anti-spam e funcionamento offline das escolas. Pode personalizar preferências ou consultar a{' '}
                <button
                  type="button"
                  onClick={() => openLegalPolicyModal('confidencialidade')}
                  className="text-blue-300 hover:text-blue-200 underline font-semibold cursor-pointer"
                >
                  Política de Confidencialidade
                </button>
                ,{' '}
                <button
                  type="button"
                  onClick={() => openLegalPolicyModal('privacidade')}
                  className="text-blue-300 hover:text-blue-200 underline font-semibold cursor-pointer"
                >
                  Privacidade
                </button>{' '}
                e os{' '}
                <button
                  type="button"
                  onClick={() => openLegalPolicyModal('termos')}
                  className="text-blue-300 hover:text-blue-200 underline font-semibold cursor-pointer"
                >
                  Termos de Uso
                </button>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCustomize(!showCustomize)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Personalizar</span>
            </button>
            <button
              type="button"
              onClick={apenasEssenciais}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Apenas Essenciais
            </button>
            <button
              type="button"
              onClick={aceitarTodos}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Aceitar Todos</span>
            </button>
          </div>
        </div>

        {showCustomize && (
          <div className="pt-3 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-white">1. Essenciais (Obrigatório)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Autenticação, segurança HTTPS, anti-spam e base de dados offline.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                Ativo
              </span>
            </div>

            <label className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-2 cursor-pointer">
              <div>
                <p className="font-bold text-white">2. Preferências de Interface</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Memoriza escola selecionada, filtros académicos e layout de impressão.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencias}
                onChange={(e) => setPreferencias(e.target.checked)}
                className="mt-1 h-4 w-4 accent-blue-500 cursor-pointer"
              />
            </label>

            <label className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-2 cursor-pointer">
              <div>
                <p className="font-bold text-white">3. Desempenho &amp; Diagnóstico</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Medição local da velocidade de carregamento e estado do cache PWA.
                </p>
              </div>
              <input
                type="checkbox"
                checked={desempenho}
                onChange={(e) => setDesempenho(e.target.checked)}
                className="mt-1 h-4 w-4 accent-blue-500 cursor-pointer"
              />
            </label>

            <div className="sm:col-span-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomize(false)}
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Ocultar opções</span>
              </button>
              <button
                type="button"
                onClick={guardarPersonalizado}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Guardar Preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
