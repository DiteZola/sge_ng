/**
 * SGE-NG - Serviço de Proteção Anti-Spam & Mitigação de Bots
 *
 * Camadas incluídas:
 * 1. Campo Armadilha (Honeypot) invisível para travar bots automatizados
 * 2. Verificação de Tempo Mínimo de Preenchimento Humano
 * 3. Limitador de Taxa (Sliding Window Rate Limiter) por ação e utilizador
 * 4. Detetor de Conteúdo Repetitivo, Rajadas Duplicadas e Excesso de Links (URL Flood)
 * 5. Desafio Matemático Humano opcional em cenários de rajada
 */

import { dbService } from './storage';
import { securityEngine } from './securityEngine';

export type AntiSpamActionType =
  | 'login'
  | 'consulta_encarregado'
  | 'envio_mensagem'
  | 'apoio_tecnico'
  | 'formulario_geral';

export interface AntiSpamValidationParams {
  acao: AntiSpamActionType;
  honeypotValor?: string;
  formularioAbertoEmMs?: number;
  conteudoPrincipal?: string;
  identificadorAutor?: string;
  tempoMinimoMs?: number;
}

export interface AntiSpamValidationResult {
  permitido: boolean;
  motivo?: string;
  codigo?: 'HONEYPOT' | 'TOO_FAST' | 'RATE_LIMIT' | 'DUPLICATE_FLOOD' | 'SPAM_CONTENT';
  exigirDesafio?: boolean;
  segundosRestantes?: number;
}

export interface AntiSpamStats {
  ativo: boolean;
  totalVerificacoes: number;
  totalBloqueios: number;
  ultimoBloqueioEm?: string;
  ultimoMotivo?: string;
}

const RATE_LIMIT_KEY = 'sge_antispam_windows_v1';
const STATS_KEY = 'sge_antispam_stats_v1';

const DEFAULT_LIMITS_PER_MIN: Record<AntiSpamActionType, number> = {
  login: 12,
  consulta_encarregado: 15,
  envio_mensagem: 8,
  apoio_tecnico: 4,
  formulario_geral: 20
};

const SPAM_PATTERNS = [
  /(https?:\/\/[^\s]+){3,}/i, // 3 ou mais URLs numa única submissão
  /(.)\1{14,}/, // Repetição anómala do mesmo caractere 15+ vezes
  /\b(viagra|casino|crypto\s*giveaway|free\s*money|click\s*here\s*now|seo\s*backlink)\b/i
];

class AntiSpamService {
  private lastSubmissionHashes: Map<string, { hash: string; ts: number }> = new Map();

  private obterStats(): AntiSpamStats {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { ativo: true, totalVerificacoes: 0, totalBloqueios: 0 };
  }

  private guardarStats(stats: AntiSpamStats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}
  }

  private registarResultado(bloqueado: boolean, motivo?: string) {
    const stats = this.obterStats();
    stats.totalVerificacoes += 1;
    if (bloqueado) {
      stats.totalBloqueios += 1;
      stats.ultimoBloqueioEm = new Date().toLocaleTimeString('pt-AO');
      stats.ultimoMotivo = motivo;
    }
    this.guardarStats(stats);
  }

  private obterJanelas(): Record<string, number[]> {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }

  private guardarJanelas(janelas: Record<string, number[]>) {
    try {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(janelas));
    } catch {}
  }

  public isProtecaoAtiva(): boolean {
    try {
      const cfg = dbService.getConfiguracaoSistema();
      return cfg.protecaoAntiSpamAtiva !== false;
    } catch {
      return true;
    }
  }

  public validarSubmissao(params: AntiSpamValidationParams): AntiSpamValidationResult {
    if (!this.isProtecaoAtiva()) {
      return { permitido: true };
    }

    const {
      acao,
      honeypotValor = '',
      formularioAbertoEmMs,
      conteudoPrincipal = '',
      identificadorAutor = 'anonimo',
      tempoMinimoMs = 450
    } = params;

    // 1. Verificação Honeypot (campo armadilha invisível preenchido por bots)
    if (honeypotValor && honeypotValor.trim().length > 0) {
      const motivo = 'Submissão automática bloqueada pela armadilha anti-bot (honeypot).';
      this.registarResultado(true, motivo);
      securityEngine.registarEvento({
        categoria: 'INTRUSAO',
        severidade: 'AVISO',
        titulo: 'Bot Anti-Spam Travado (Honeypot)',
        detalhes: `Tentativa automatizada detetada na ação "${acao}" para "${identificadorAutor}".`
      });
      return { permitido: false, codigo: 'HONEYPOT', motivo };
    }

    // 2. Verificação de Tempo Mínimo Humano
    if (formularioAbertoEmMs && Date.now() - formularioAbertoEmMs < tempoMinimoMs) {
      const motivo = 'Submissão demasiado rápida. Aguarde um instante e confirme novamente.';
      this.registarResultado(true, motivo);
      return { permitido: false, codigo: 'TOO_FAST', motivo, exigirDesafio: true };
    }

    // 3. Verificação de Padrões de Spam Textual e URL Flood
    const textoLimpo = conteudoPrincipal.trim();
    if (textoLimpo.length > 0) {
      for (const regex of SPAM_PATTERNS) {
        if (regex.test(textoLimpo)) {
          const motivo = 'Conteúdo bloqueado pelo filtro anti-spam (excesso de hiperligações ou padrão repetitivo).';
          this.registarResultado(true, motivo);
          securityEngine.registarEvento({
            categoria: 'SISTEMA',
            severidade: 'AVISO',
            titulo: 'Conteúdo Bloqueado pelo Filtro Anti-Spam',
            detalhes: `Padrão suspeito detetado na ação "${acao}" por "${identificadorAutor}".`
          });
          return { permitido: false, codigo: 'SPAM_CONTENT', motivo };
        }
      }

      // 4. Detetor de duplicação imediata (< 15s mesmo conteúdo)
      if (acao === 'envio_mensagem' || acao === 'apoio_tecnico') {
        const keyDup = `${acao}:${identificadorAutor}`;
        const prev = this.lastSubmissionHashes.get(keyDup);
        const now = Date.now();
        if (prev && prev.hash === textoLimpo.toLowerCase() && now - prev.ts < 15000) {
          const motivo = 'Proteção Anti-Spam: envio duplicado consecutivo detetado. Aguarde alguns segundos antes de reenviar.';
          this.registarResultado(true, motivo);
          return { permitido: false, codigo: 'DUPLICATE_FLOOD', motivo, segundosRestantes: Math.ceil((15000 - (now - prev.ts)) / 1000) };
        }
        this.lastSubmissionHashes.set(keyDup, { hash: textoLimpo.toLowerCase(), ts: now });
      }
    }

    // 5. Rate Limiting (janela deslizante de 60 segundos)
    const agora = Date.now();
    const janelaMs = 60 * 1000;
    const cfg = dbService.getConfiguracaoSistema();
    const limiteCustom = cfg.limiteSubmissoesPorMinuto && cfg.limiteSubmissoesPorMinuto > 0
      ? cfg.limiteSubmissoesPorMinuto
      : undefined;
    const limite = acao === 'login'
      ? Math.max(5, limiteCustom || DEFAULT_LIMITS_PER_MIN.login)
      : (limiteCustom || DEFAULT_LIMITS_PER_MIN[acao] || 15);

    const chaveJanela = `${acao}:${identificadorAutor}`;
    const janelas = this.obterJanelas();
    const timestampsAtuais = (janelas[chaveJanela] || []).filter(t => agora - t < janelaMs);

    if (timestampsAtuais.length >= limite) {
      const maisAntigo = timestampsAtuais[0] || agora;
      const segundosRestantes = Math.max(1, Math.ceil((janelaMs - (agora - maisAntigo)) / 1000));
      const motivo = `Proteção Anti-Spam ativa: limite de ${limite} ações/minuto atingido. Aguarde ${segundosRestantes}s ou resolva a verificação humana.`;
      this.registarResultado(true, motivo);
      return {
        permitido: false,
        codigo: 'RATE_LIMIT',
        motivo,
        exigirDesafio: true,
        segundosRestantes
      };
    }

    timestampsAtuais.push(agora);
    janelas[chaveJanela] = timestampsAtuais;
    this.guardarJanelas(janelas);
    this.registarResultado(false);

    return { permitido: true };
  }

  public gerarDesafioHumano(): { pergunta: string; respostaEsperada: number } {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 7) + 1;
    return {
      pergunta: `Verificação Anti-Spam: Quanto é ${a} + ${b}?`,
      respostaEsperada: a + b
    };
  }

  public obterEstatisticasAntiSpam(): AntiSpamStats {
    const stats = this.obterStats();
    return {
      ...stats,
      ativo: this.isProtecaoAtiva()
    };
  }
}

export const antiSpamService = new AntiSpamService();
