import React from 'react';

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
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Lado Esquerdo: Copyright e Entidade Oficial */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
          <span className="font-semibold text-slate-900 dark:text-slate-200">
            &copy; {anoAtual} Sistema de Gestão Escolar (SGE-NG)
          </span>
          <span className="hidden sm:inline text-slate-400">&bull;</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            Governo da República de Angola &bull; Ministério da Educação (MED)
          </span>
          <span className="hidden md:inline text-slate-400">&bull;</span>
          <span className="hidden md:inline text-[11px] text-slate-400">
            Todos os direitos reservados
          </span>
        </div>

        {/* Lado Direito: Desenvolvedor e Ano Atual */}
        <div className="flex items-center space-x-2 text-center sm:text-right">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Desenvolvido por{' '}
            <strong className="font-bold text-blue-700 dark:text-blue-400 tracking-tight">
              Dite Zola NG
            </strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
            {anoAtual}
          </span>
        </div>
      </div>
    </footer>
  );
};
