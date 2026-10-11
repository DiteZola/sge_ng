import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

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
      className={`py-4 px-4 sm:px-6 transition-colors no-print ${
        isDark 
          ? 'bg-slate-950/90 border-t border-slate-800/80 text-slate-400' 
          : 'bg-white/95 border-t border-slate-200/80 text-slate-500 shadow-xs'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Lado Esquerdo: Copyright e Entidade Oficial */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
          <span className="font-medium">
            &copy; {anoAtual} Governo da República de Angola
          </span>
          <span className="hidden sm:inline text-slate-400">&bull;</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Ministério da Educação (MED)
          </span>
          <span className="hidden md:inline text-slate-400">&bull;</span>
          <span className="hidden md:inline text-[11px] text-slate-400">
            Todos os direitos reservados.
          </span>
        </div>

        {/* Lado Direito: Desenvolvedor e Ano */}
        <div className="flex items-center space-x-2 text-center sm:text-right">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Desenvolvido por{' '}
            <strong className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors">
              Dite Zola NG
            </strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            {anoAtual}
          </span>
        </div>
      </div>
    </footer>
  );
};
