/**
 * SGE-NG - Gestão de Consentimento de Cookies, Políticas de Confidencialidade,
 * Privacidade e Termos e Condições de Uso.
 */

import { dbService } from './storage';

export type LegalPolicyTab = 'confidencialidade' | 'privacidade' | 'termos' | 'cookies';

export interface CookieConsentState {
  versaoPolitica: string;
  essenciais: true;
  preferencias: boolean;
  desempenho: boolean;
  decisaoTomada: boolean;
  atualizadoEm: string;
}

const COOKIE_CONSENT_KEY = 'sge_cookie_consent_v1';

export function getCookieConsent(): CookieConsentState {
  const cfg = dbService.getConfiguracaoSistema();
  const versaoAtual = cfg.politicaVersao || '1.0 (2026)';
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CookieConsentState;
      if (parsed && parsed.decisaoTomada) {
        return parsed;
      }
    }
  } catch {}
  return {
    versaoPolitica: versaoAtual,
    essenciais: true,
    preferencias: false,
    desempenho: false,
    decisaoTomada: false,
    atualizadoEm: ''
  };
}

export function saveCookieConsent(preferencias: boolean, desempenho: boolean): CookieConsentState {
  const cfg = dbService.getConfiguracaoSistema();
  const state: CookieConsentState = {
    versaoPolitica: cfg.politicaVersao || '1.0 (2026)',
    essenciais: true,
    preferencias,
    desempenho,
    decisaoTomada: true,
    atualizadoEm: new Date().toISOString()
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('sge_cookie_consent_updated', { detail: state }));
  } catch {}
  return state;
}

export function resetCookieConsentBanner() {
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.dispatchEvent(new CustomEvent('sge_open_cookie_banner'));
  } catch {}
}

export function openLegalPolicyModal(tab: LegalPolicyTab) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sge_open_legal_modal', { detail: { tab } }));
  }
}
