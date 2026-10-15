import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SGE ErrorBoundary] Falha capturada na renderização:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-black text-xl">
              !
            </div>
            <h1 className="text-lg font-bold">Recuperação de Inicialização do SGE-NG</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              O sistema encontrou uma oscilação na renderização inicial. Os seus dados no dispositivo estão protegidos.
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Recarregar Sistema
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('sge_authenticated');
                  localStorage.removeItem('sge_current_user');
                  window.location.reload();
                }}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                Reiniciar Sessão Segura
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

