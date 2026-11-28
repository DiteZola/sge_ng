import React, { StrictMode, Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { enforceHttpsTransport } from './utils/securityTransport';

const LegalPoliciesModal = lazy(() =>
  import('./components/LegalPoliciesModal').then((m) => ({ default: m.LegalPoliciesModal }))
);
const CookieConsentBanner = lazy(() =>
  import('./components/CookieConsentBanner').then((m) => ({ default: m.CookieConsentBanner }))
);
const AppUpdateBanner = lazy(() =>
  import('./components/AppUpdateBanner').then((m) => ({ default: m.AppUpdateBanner }))
);

try {
  const rawCfg = typeof localStorage !== 'undefined' ? localStorage.getItem('sge_configuracao_sistema') : null;
  const parsedCfg = rawCfg ? JSON.parse(rawCfg) : null;
  enforceHttpsTransport(parsedCfg?.forcarHTTPS !== false);
} catch {
  enforceHttpsTransport(true);
}

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
                  this.setState({ hasError: false, error: null });
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Continuar Sem Reiniciar
              </button>
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    this.setState({ hasError: false, error: null });
                    return;
                  }
                  window.location.reload();
                }}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                Recarregar Página (Apenas Online)
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
      <Suspense fallback={null}>
        <AppUpdateBanner />
        <LegalPoliciesModal />
        <CookieConsentBanner />
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>,
);

// Inicializar serviços de atualização, notificações SW, hidratação IDB e agendador após a primeira pintura
if (typeof window !== 'undefined') {
  const startBackgroundServices = () => {
    import('./services/appUpdateService').then((m) => m.appUpdateService.inicializar()).catch(() => {});
    import('./services/notificationService').then((m) => m.notificationService.inicializarServiceWorker()).catch(() => {});
    import('./services/offlineStorage').then((m) => m.offlineStorage.hidratarArmazenamentoDoIndexedDB()).catch(() => {});
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => setTimeout(startBackgroundServices, 60));
  } else {
    setTimeout(startBackgroundServices, 80);
  }

  setTimeout(() => {
    import('./services/periodicBackupService').then((m) => m.periodicBackupService.iniciarAgendador()).catch(() => {});
  }, 4500);
}
