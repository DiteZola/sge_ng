/**
 * SGE-NG - Transporte Seguro HTTPS & Diagnóstico de Velocidade de Carregamento
 */

export interface TransportSecurityInfo {
  protocolo: string;
  isHttps: boolean;
  isLocalhost: boolean;
  httpsForcadoAtivo: boolean;
  origemSegura: boolean;
  host: string;
}

export interface LoadingPerformanceMetrics {
  ttfbMs: number;
  domInteractiveMs: number;
  domContentLoadedMs: number;
  loadTotalMs: number;
  fcpMs: number | null;
  recursosCarregados: number;
  tamanhoTransferidoKB: number;
  classificacao: 'Excelente' | 'Bom' | 'Moderado' | 'Lento';
  serviceWorkerAtivo: boolean;
  memoriaUsadaMB: number | null;
  verificadoEm: string;
}

export function isLocalDevelopmentHost(hostname?: string): boolean {
  if (typeof window === 'undefined') return true;
  const host = (hostname || window.location.hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '0.0.0.0' ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    host.endsWith('.local')
  );
}

/**
 * Força redirecionamento HTTPS em ambientes públicos (sem interromper localhost/LAN).
 */
export function enforceHttpsTransport(forceEnabled: boolean = true): boolean {
  if (typeof window === 'undefined') return false;
  if (!forceEnabled) return false;

  const isLocal = isLocalDevelopmentHost();
  if (!isLocal && window.location.protocol === 'http:') {
    const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(httpsUrl);
    return true;
  }

  if (!isLocal && typeof document !== 'undefined') {
    const hasCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"][content*="upgrade-insecure-requests"]');
    if (!hasCsp && document.head) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = 'upgrade-insecure-requests';
      document.head.appendChild(meta);
    }
  }
  return false;
}

export function getTransportSecurityInfo(forceSetting: boolean = true): TransportSecurityInfo {
  if (typeof window === 'undefined') {
    return {
      protocolo: 'https:',
      isHttps: true,
      isLocalhost: true,
      httpsForcadoAtivo: forceSetting,
      origemSegura: true,
      host: 'localhost'
    };
  }
  const protocolo = window.location.protocol || 'http:';
  const isLocal = isLocalDevelopmentHost();
  const isHttps = protocolo === 'https:';
  return {
    protocolo,
    isHttps,
    isLocalhost: isLocal,
    httpsForcadoAtivo: forceSetting,
    origemSegura: Boolean(window.isSecureContext || isHttps || isLocal),
    host: window.location.host || 'localhost'
  };
}

/**
 * Mede a velocidade real de carregamento usando a Performance Navigation Timing API e Paint Timing API.
 */
export function measureLoadingPerformance(): LoadingPerformanceMetrics {
  const agoraStr = new Date().toLocaleTimeString('pt-AO');
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return {
      ttfbMs: 0,
      domInteractiveMs: 0,
      domContentLoadedMs: 0,
      loadTotalMs: 0,
      fcpMs: null,
      recursosCarregados: 0,
      tamanhoTransferidoKB: 0,
      classificacao: 'Excelente',
      serviceWorkerAtivo: false,
      memoriaUsadaMB: null,
      verificadoEm: agoraStr
    };
  }

  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const nav = navEntries && navEntries[0];

  const ttfbMs = nav ? Math.max(0, Math.round(nav.responseStart - nav.requestStart)) : 0;
  const domInteractiveMs = nav ? Math.max(0, Math.round(nav.domInteractive - nav.startTime)) : 0;
  const domContentLoadedMs = nav ? Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime)) : 0;
  const rawLoad = nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0;
  const loadTotalMs = rawLoad > 0 ? rawLoad : Math.max(domContentLoadedMs, Math.round(performance.now()));

  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
  const fcpMs = fcpEntry ? Math.round(fcpEntry.startTime) : null;

  const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const recursosCarregados = resourceEntries.length;
  const totalBytes = resourceEntries.reduce((acc, r) => acc + (r.transferSize || 0), 0);
  const tamanhoTransferidoKB = Math.round((totalBytes / 1024) * 10) / 10;

  let classificacao: LoadingPerformanceMetrics['classificacao'] = 'Excelente';
  if (loadTotalMs > 3500) classificacao = 'Lento';
  else if (loadTotalMs > 2000) classificacao = 'Moderado';
  else if (loadTotalMs > 1000) classificacao = 'Bom';

  const serviceWorkerAtivo = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);
  const perfMem = (performance as any).memory;
  const memoriaUsadaMB = perfMem && typeof perfMem.usedJSHeapSize === 'number'
    ? Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10
    : null;

  return {
    ttfbMs,
    domInteractiveMs,
    domContentLoadedMs,
    loadTotalMs,
    fcpMs,
    recursosCarregados,
    tamanhoTransferidoKB,
    classificacao,
    serviceWorkerAtivo,
    memoriaUsadaMB,
    verificadoEm: agoraStr
  };
}
