import React from 'react';
import { openLegalPolicyModal, resetCookieConsentBanner } from '../services/legalPoliciesService';

interface FooterProps {
  className?: string;
  variant?: 'light' | 'dark' | 'transparent';
}

export const Footer: React.FC<FooterProps> = ({ 
  className = '',
  variant = 'light'
}) => {
  const anoAtual = new Date().getFullYear();
  const isDark = variant === 'dark';

  return (
    <footer 
      className={`py-3.5 px-4 sm:px-6 transition-colors no-print shrink-0 ${
        isDark 
          ? 'bg-slate-950/95 border-t border-slate-800 text-slate-400' 
          : 'bg-white border-t border-slate-200 text-slate-600 shadow-2xs'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Lado Esquerdo: Copyright e Sistema */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            &copy; {anoAtual} Sistema de Gestão Escolar (SGE-NG)
          </span>
          <span className="hidden sm:inline text-slate-400">&bull;</span>
          <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Todos os direitos reservados
          </span>
        </div>

        {/* Centro: Políticas de Confidencialidade, Privacidade, Termos e Cookies */}
        <nav aria-label="Conformidade e Políticas Legais" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
          <button
            type="button"
            onClick={() => openLegalPolicyModal('confidencialidade')}
            className={`hover:underline font-semibold cursor-pointer ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-700'}`}
          >
            Confidencialidade
          </button>
          <span className="text-slate-500">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicyModal('privacidade')}
            className={`hover:underline font-semibold cursor-pointer ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-700'}`}
          >
            Privacidade
          </button>
          <span className="text-slate-500">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicyModal('termos')}
            className={`hover:underline font-semibold cursor-pointer ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-700'}`}
          >
            Termos de Uso
          </button>
          <span className="text-slate-500">&bull;</span>
          <button
            type="button"
            onClick={() => resetCookieConsentBanner()}
            className={`hover:underline font-semibold cursor-pointer ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-700'}`}
          >
            Cookies
          </button>
        </nav>

        {/* Lado Direito: Desenvolvedor e Ano Atual */}
        <div className="flex items-center space-x-2 text-center sm:text-right">
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Desenvolvido por{' '}
            <strong className={`font-bold tracking-tight ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              Dite Zola NG
            </strong>
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
            isDark
              ? 'bg-blue-950/80 text-blue-300 border-blue-800/80'
              : 'bg-blue-50 text-blue-700 border-blue-200/80'
          }`}>
            {anoAtual}
          </span>
        </div>
      </div>
    </footer>
  );
};
