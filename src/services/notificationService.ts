import { registerSW } from 'virtual:pwa-register';
import {
  Escola,
  Funcionario,
  MensagemInterna,
  NotificacaoSistemaCategoria,
  NotificacaoSistemaItem,
  PreferenciasNotificacaoSW,
  SolicitacaoAlteracaoNota
} from '../types';
import { dbService } from './storage';

const STORAGE_NOTIF_LIST = 'sge_notificacoes_sistema_v1';
const STORAGE_NOTIF_PREFS = 'sge_notificacoes_sw_prefs_v1';
const STORAGE_SEEN_KEYS = 'sge_notificacoes_vistos_v1';

const DEFAULT_PREFS: PreferenciasNotificacaoSW = {
  somAtivo: true,
  notificarSolicitacoesNota: true,
  notificarBibliotecaUrgente: true,
  notificarMudancaTempo: true,
  notificarTerminoTempo: true,
  avisoPrevio5Min: true
};

const STAFF_REVISAO_NOTAS_ROLES = new Set([
  'DiretorGeral',
  'SubdiretorPedagogico',
  'SubdiretorAdministrativo',
  'SubdirectorAdministrativo',
  'CoordenadorPedagogico',
  'CoordenadorTurno',
  'CoordenadorDisciplina',
  'ChefeSecretaria',
  'Secretario',
  'SecretarioEscolar',
  'Secretaria'
]);

const STAFF_GERAL_ROLES = new Set([
  'DiretorGeral',
  'SubdiretorPedagogico',
  'SubdiretorAdministrativo',
  'SubdirectorAdministrativo',
  'CoordenadorPedagogico',
  'CoordenadorTurno',
  'CoordenadorDisciplina',
  'ChefeSecretaria',
  'Secretario',
  'SecretarioEscolar',
  'Secretaria',
  'Professor',
  'Bibliotecario',
  'Tesoureiro',
  'TecnicoTI',
  'Estagiario'
]);

export interface DispararNotificacaoParams {
  escolaId: string;
  destinatarioUserId?: string;
  categoria: NotificacaoSistemaCategoria;
  titulo: string;
  mensagem: string;
  detalhes?: string;
  urgente?: boolean;
  tagSW?: string;
  icon?: string;
  navegacao?: {
    tab: string;
    subTab?: string;
    entityId?: string;
  };
  dedupeKey?: string;
  tocarSom?: boolean;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private swInicializado = false;
  private seenKeys: Set<string>;
  private baselineInicializado = false;
  private listenersNavigate: Set<(nav: { tab: string; subTab?: string; entityId?: string }) => void> = new Set();

  constructor() {
    this.seenKeys = this.carregarSeenKeys();
  }

  private carregarSeenKeys(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_SEEN_KEYS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return new Set(arr.slice(-400));
        }
      }
    } catch {}
    return new Set();
  }

  private salvarSeenKey(key: string) {
    if (!key) return;
    this.seenKeys.add(key);
    try {
      const arr = Array.from(this.seenKeys).slice(-400);
      this.seenKeys = new Set(arr);
      localStorage.setItem(STORAGE_SEEN_KEYS, JSON.stringify(arr));
    } catch {}
  }

  public inicializarServiceWorker(): void {
    if (this.swInicializado || typeof window === 'undefined') return;
    this.swInicializado = true;

    if (!('serviceWorker' in navigator)) return;

    try {
      registerSW({
        immediate: true,
        onRegisteredSW: (_swUrl, reg) => {
          if (reg) {
            this.swRegistration = reg;
          }
        },
        onRegisterError: () => {
          // Fallback silencioso em ambientes sem suporte a SW
        }
      });
    } catch {}

    navigator.serviceWorker.ready
      .then((reg) => {
        this.swRegistration = reg;
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener('message', (event) => {
      const payload = event.data;
      if (payload && payload.type === 'SGE_NOTIFICATION_CLICK' && payload.data) {
        const { tab, subTab, entityId } = payload.data;
        if (tab) {
          this.notificarNavegacao({ tab, subTab, entityId });
        }
      }
    });
  }

  public subscreverNavegacao(cb: (nav: { tab: string; subTab?: string; entityId?: string }) => void): () => void {
    this.listenersNavigate.add(cb);
    return () => {
      this.listenersNavigate.delete(cb);
    };
  }

  public notificarNavegacao(nav: { tab: string; subTab?: string; entityId?: string }) {
    this.listenersNavigate.forEach((cb) => {
      try {
        cb(nav);
      } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_notification_navigate', { detail: nav }));
    }
  }

  public isServiceWorkerAtivo(): boolean {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
    return Boolean(this.swRegistration?.active || navigator.serviceWorker.controller);
  }

  public obterEstadoPermissao(): NotificationPermission | 'unsupported' {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  }

  public async solicitarPermissao(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      const perm = await Notification.requestPermission();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
      }
      return perm;
    } catch {
      return Notification.permission;
    }
  }

  public getPreferencias(): PreferenciasNotificacaoSW {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIF_PREFS);
      if (raw) {
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...DEFAULT_PREFS };
  }

  public salvarPreferencias(prefs: Partial<PreferenciasNotificacaoSW>): PreferenciasNotificacaoSW {
    const atual = this.getPreferencias();
    const atualizado = { ...atual, ...prefs };
    try {
      localStorage.setItem(STORAGE_NOTIF_PREFS, JSON.stringify(atualizado));
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    }
    return atualizado;
  }

  private categoriaPermitida(categoria: NotificacaoSistemaCategoria, prefs: PreferenciasNotificacaoSW): boolean {
    switch (categoria) {
      case 'SOLICITACAO_NOTA':
        return prefs.notificarSolicitacoesNota;
      case 'MENSAGEM_BIBLIOTECA':
        return prefs.notificarBibliotecaUrgente;
      case 'MUDANCA_TEMPO':
        return prefs.notificarMudancaTempo;
      case 'TERMINO_TEMPO':
        return prefs.notificarTerminoTempo;
      default:
        return true;
    }
  }

  public getNotificacoes(escolaId?: string, userId?: string): NotificacaoSistemaItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIF_LIST);
      const lista: NotificacaoSistemaItem[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(lista)) return [];
      return lista.filter((n) => {
        if (!n) return false;
        const escOk = !escolaId || escolaId === 'todas' || n.escolaId === escolaId || n.escolaId === 'global';
        const userOk = !n.destinatarioUserId || !userId || n.destinatarioUserId === userId;
        return escOk && userOk;
      });
    } catch {
      return [];
    }
  }

  private gravarNotificacaoNaLista(item: NotificacaoSistemaItem) {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIF_LIST);
      const lista: NotificacaoSistemaItem[] = raw ? JSON.parse(raw) : [];
      const filtrada = Array.isArray(lista) ? lista.filter((x) => x && x.id !== item.id) : [];
      filtrada.unshift(item);
      if (filtrada.length > 60) {
        filtrada.length = 60;
      }
      localStorage.setItem(STORAGE_NOTIF_LIST, JSON.stringify(filtrada));
    } catch {}
  }

  public marcarLida(id: string) {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIF_LIST);
      const lista: NotificacaoSistemaItem[] = raw ? JSON.parse(raw) : [];
      const atualizada = lista.map((n) => (n.id === id ? { ...n, lida: true } : n));
      localStorage.setItem(STORAGE_NOTIF_LIST, JSON.stringify(atualizada));
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    } catch {}
  }

  public marcarTodasLidas(escolaId?: string, userId?: string) {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIF_LIST);
      const lista: NotificacaoSistemaItem[] = raw ? JSON.parse(raw) : [];
      const atualizada = lista.map((n) => {
        const escOk = !escolaId || escolaId === 'todas' || n.escolaId === escolaId || n.escolaId === 'global';
        const userOk = !n.destinatarioUserId || !userId || n.destinatarioUserId === userId;
        return escOk && userOk ? { ...n, lida: true } : n;
      });
      localStorage.setItem(STORAGE_NOTIF_LIST, JSON.stringify(atualizada));
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    } catch {}
  }

  public limparNotificacoes(escolaId?: string) {
    try {
      if (!escolaId || escolaId === 'todas') {
        localStorage.removeItem(STORAGE_NOTIF_LIST);
      } else {
        const raw = localStorage.getItem(STORAGE_NOTIF_LIST);
        const lista: NotificacaoSistemaItem[] = raw ? JSON.parse(raw) : [];
        const restantes = lista.filter((n) => n.escolaId !== escolaId);
        localStorage.setItem(STORAGE_NOTIF_LIST, JSON.stringify(restantes));
      }
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    } catch {}
  }

  public tocarSomAlerta(categoria: NotificacaoSistemaCategoria) {
    const prefs = this.getPreferencias();
    if (!prefs.somAtivo || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const tocarNota = (freq: number, delayMs: number, duracao: number, tipo: OscillatorType = 'sine', vol = 0.35) => {
        setTimeout(() => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = tipo;
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duracao);
        }, delayMs);
      };

      if (categoria === 'MENSAGEM_BIBLIOTECA' || categoria === 'SOLICITACAO_NOTA') {
        // Sinal duplo executivo / urgente nítido
        tocarNota(880, 0, 0.35, 'triangle', 0.32);
        tocarNota(1174.66, 180, 0.55, 'triangle', 0.36);
        tocarNota(1318.51, 380, 0.7, 'sine', 0.3);
      } else if (categoria === 'TERMINO_TEMPO') {
        // Sino descendente de término de tempo letivo
        tocarNota(1174.66, 0, 1.1, 'sine', 0.35);
        tocarNota(880.0, 260, 1.2, 'sine', 0.35);
        tocarNota(587.33, 540, 1.8, 'sine', 0.38);
      } else {
        // Carrilhão escolar ascendente de início / mudança de tempo
        tocarNota(587.33, 0, 1.4, 'sine', 0.35);
        tocarNota(739.99, 260, 1.4, 'sine', 0.35);
        tocarNota(880.0, 520, 1.4, 'sine', 0.35);
        tocarNota(1174.66, 780, 2.0, 'sine', 0.38);
      }
    } catch {}
  }

  public async dispararNotificacaoSW(params: DispararNotificacaoParams): Promise<NotificacaoSistemaItem | null> {
    const prefs = this.getPreferencias();
    if (!this.categoriaPermitida(params.categoria, prefs)) {
      return null;
    }

    if (params.dedupeKey) {
      if (this.seenKeys.has(params.dedupeKey)) {
        return null;
      }
      this.salvarSeenKey(params.dedupeKey);
    }

    const item: NotificacaoSistemaItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      escolaId: params.escolaId,
      destinatarioUserId: params.destinatarioUserId,
      categoria: params.categoria,
      titulo: params.titulo,
      mensagem: params.mensagem,
      detalhes: params.detalhes,
      urgente: Boolean(params.urgente),
      lida: false,
      criadaEm: new Date().toISOString(),
      tagSW: params.tagSW || `sge-${params.categoria.toLowerCase()}-${Date.now()}`,
      navegacao: params.navegacao
    };

    this.gravarNotificacaoNaLista(item);

    if (params.tocarSom !== false) {
      this.tocarSomAlerta(params.categoria);
    }

    // Disparar evento de Toast visual imediato na interface
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_toast_notificacao', { detail: item }));
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    }

    // Disparar notificação nativa via Service Worker (Push/Local Notification API)
    await this.exibirViaServiceWorker(item, params.icon);

    return item;
  }

  private async exibirViaServiceWorker(item: NotificacaoSistemaItem, customIcon?: string): Promise<void> {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const bodyTexto = item.detalhes ? `${item.mensagem}\n${item.detalhes}` : item.mensagem;
    const iconUrl = customIcon || '/pwa-192x192.png';
    const notifOptions: NotificationOptions & {
      renotify?: boolean;
      vibrate?: number[];
      actions?: Array<{ action: string; title: string }>;
    } = {
      body: bodyTexto,
      icon: iconUrl,
      badge: '/pwa-192x192.png',
      tag: item.tagSW || item.id,
      renotify: true,
      requireInteraction: Boolean(item.urgente),
      vibrate: item.urgente ? [220, 100, 220, 100, 220] : [140, 70, 140],
      silent: !this.getPreferencias().somAtivo,
      data: {
        url: '/',
        tab: item.navegacao?.tab || 'dashboard',
        subTab: item.navegacao?.subTab || '',
        entityId: item.navegacao?.entityId || item.id,
        categoria: item.categoria
      },
      actions: [
        { action: 'abrir', title: 'Abrir no Sistema' },
        { action: 'dispensar', title: 'Dispensar' }
      ]
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = this.swRegistration || (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready.catch(() => null));
        if (reg) {
          this.swRegistration = reg;
          if (reg.active) {
            reg.active.postMessage({
              type: 'SGE_SHOW_NOTIFICATION',
              notification: {
                title: item.titulo,
                ...notifOptions,
                urgente: item.urgente
              }
            });
            return;
          }
          if (typeof reg.showNotification === 'function') {
            await reg.showNotification(item.titulo, notifOptions);
            return;
          }
        }
      }
    } catch {}

    // Fallback direto se o Service Worker ainda não assumiu controlo
    try {
      const notif = new Notification(item.titulo, {
        body: bodyTexto,
        icon: iconUrl,
        tag: item.tagSW || item.id
      });
      notif.onclick = () => {
        window.focus();
        if (item.navegacao?.tab) {
          this.notificarNavegacao(item.navegacao);
        }
        notif.close();
      };
      setTimeout(() => notif.close(), item.urgente ? 10000 : 6000);
    } catch {}
  }

  /**
   * Inicializa a linha de base ao autenticar para evitar enxurrada de avisos antigos.
   */
  public inicializarBaselineRemoto(escolaId: string) {
    if (this.baselineInicializado) return;
    this.baselineInicializado = true;

    try {
      const sols = dbService.obterSolicitacoes().filter((s) => !escolaId || s.escolaId === escolaId);
      sols.forEach((s) => {
        this.salvarSeenKey(`sol_${s.id}_${s.estado}`);
      });

      const msgs = dbService.obterMensagens().filter((m) => !escolaId || m.escolaId === escolaId);
      msgs.forEach((m) => {
        this.salvarSeenKey(`msg_${m.id}`);
      });
    } catch {}
  }

  public resetarBaseline() {
    this.baselineInicializado = false;
  }

  /**
   * Avalia localmente uma Solicitação de Alteração de Nota recém-criada ou respondida.
   */
  public processarSolicitacaoNota(sol: SolicitacaoAlteracaoNota, currentUser: Funcionario, isRemoto = false) {
    if (!sol || !sol.id) return;
    const key = `sol_${sol.id}_${sol.estado}`;
    if (this.seenKeys.has(key)) return;

    const ehStaffRevisor = STAFF_REVISAO_NOTAS_ROLES.has(currentUser.role);
    const ehProfessorSolicitante = sol.professorId === currentUser.id;
    const escolaObj = dbService.getEscolaPorId(sol.escolaId);

    if (sol.estado === 'Pendente') {
      // Se foi criada pelo próprio utilizador localmente, registamos como visto para ele não se auto-notificar em duplicado caso não seja revisor
      if (!isRemoto && ehProfessorSolicitante && !ehStaffRevisor) {
        this.salvarSeenKey(key);
        return;
      }

      if (ehStaffRevisor || currentUser.role === 'AdminGeral') {
        this.dispararNotificacaoSW({
          escolaId: sol.escolaId,
          destinatarioUserId: currentUser.id,
          categoria: 'SOLICITACAO_NOTA',
          titulo: `📝 Solicitação de Alteração de Nota`,
          mensagem: `Prof. ${sol.professorNome} pediu alteração de ${sol.notaAnterior} → ${sol.notaProposta} val. para ${sol.alunoNome}.`,
          detalhes: `${sol.disciplinaNome} (${sol.turmaNome}) • Motivo: ${sol.motivo}`,
          urgente: true,
          tagSW: `sge-sol-nota-${sol.id}`,
          icon: escolaObj?.logotipoUrl || escolaObj?.logotipo || '/pwa-192x192.png',
          navegacao: {
            tab: 'coordenacao',
            subTab: 'solicitacoes',
            entityId: sol.id
          },
          dedupeKey: key
        });
      }
    } else if (sol.estado === 'Aprovado' || sol.estado === 'Rejeitado') {
      if (!isRemoto && ehStaffRevisor && !ehProfessorSolicitante) {
        this.salvarSeenKey(key);
        return;
      }

      if (ehProfessorSolicitante || ehStaffRevisor) {
        this.dispararNotificacaoSW({
          escolaId: sol.escolaId,
          destinatarioUserId: sol.professorId,
          categoria: 'SOLICITACAO_NOTA',
          titulo:
            sol.estado === 'Aprovado'
              ? `✅ Alteração de Nota Aprovada`
              : `❌ Solicitação de Alteração Rejeitada`,
          mensagem: `O pedido para ${sol.alunoNome} (${sol.notaAnterior} → ${sol.notaProposta} val.) foi ${sol.estado.toLowerCase()}.`,
          detalhes: `${sol.disciplinaNome} • ${sol.respostaDirecao || 'Despacho da Direção Pedagógica'}`,
          urgente: sol.estado === 'Rejeitado',
          tagSW: `sge-sol-resp-${sol.id}`,
          icon: escolaObj?.logotipoUrl || escolaObj?.logotipo || '/pwa-192x192.png',
          navegacao: {
            tab: 'coordenacao',
            subTab: 'solicitacoes',
            entityId: sol.id
          },
          dedupeKey: key
        });
      }
    }
  }

  /**
   * Avalia mensagens urgentes (especialmente na Biblioteca ou Comunicação Direta para Staff).
   */
  public processarMensagem(msg: MensagemInterna, currentUser: Funcionario, isRemoto = false) {
    if (!msg || !msg.id) return;
    const key = `msg_${msg.id}`;
    if (this.seenKeys.has(key)) return;

    // Respeitar estrito isolamento AdminGeral
    if (
      currentUser.role !== 'AdminGeral' &&
      (msg.remetentePapel === 'AdminGeral' || msg.destinatarioId === 'admin-geral')
    ) {
      return;
    }

    const ehUrgente =
      Boolean(msg.urgente) ||
      msg.prioridade === 'Urgente' ||
      msg.prioridade === 'Critica' ||
      msg.origemModulo === 'Biblioteca';

    if (!ehUrgente) {
      this.salvarSeenKey(key);
      return;
    }

    // Não duplicar para quem acabou de enviar no próprio dispositivo (a menos que seja destino individual para si)
    if (!isRemoto && msg.remetenteId === currentUser.id && msg.destinatarioId !== currentUser.id) {
      this.salvarSeenKey(key);
      return;
    }

    // Verificar se a mensagem se destina ao utilizador atual
    const destOk =
      msg.destinatarioId === currentUser.id ||
      msg.destinatarioTipo === 'Todos' ||
      (msg.destinatarioTipo === 'Docentes' && (currentUser.ehProfessor || currentUser.role === 'Professor' || currentUser.role === 'CoordenadorPedagogico')) ||
      (msg.destinatarioTipo === 'Secretaria' && ['DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'ChefeSecretaria', 'Secretario', 'SecretarioEscolar', 'Secretaria', 'Bibliotecario'].includes(currentUser.role)) ||
      (!msg.destinatarioId && !msg.destinatarioTipo && STAFF_GERAL_ROLES.has(currentUser.role));

    if (!destOk && currentUser.role !== 'AdminGeral') {
      return;
    }

    const ehBiblioteca = msg.origemModulo === 'Biblioteca';
    const escolaObj = dbService.getEscolaPorId(msg.escolaId);

    this.dispararNotificacaoSW({
      escolaId: msg.escolaId,
      destinatarioUserId: msg.destinatarioId || currentUser.id,
      categoria: 'MENSAGEM_BIBLIOTECA',
      titulo: ehBiblioteca
        ? `📚 URGENTE — Biblioteca: ${msg.assunto || msg.titulo}`
        : `🚨 Mensagem Urgente: ${msg.assunto || msg.titulo}`,
      mensagem: msg.conteudo,
      detalhes: `Enviado por ${msg.remetenteNome} (${msg.remetenteCargo || msg.remetentePapel})`,
      urgente: true,
      tagSW: `sge-msg-urg-${msg.id}`,
      icon: escolaObj?.logotipoUrl || escolaObj?.logotipo || '/pwa-192x192.png',
      navegacao: {
        tab: ehBiblioteca ? 'biblioteca' : 'comunicacao',
        entityId: msg.id
      },
      dedupeKey: key
    });
  }

  /**
   * Chamado sempre que o Firestore entrega novas alterações remotas em tempo real.
   */
  public verificarNovidadesRemotas(escolaId: string, currentUser: Funcionario) {
    if (!currentUser || !currentUser.id) return;

    if (!this.baselineInicializado) {
      this.inicializarBaselineRemoto(escolaId);
      return;
    }

    try {
      const sols = dbService.obterSolicitacoes().filter((s) => !escolaId || s.escolaId === escolaId);
      sols.forEach((s) => {
        this.processarSolicitacaoNota(s, currentUser, true);
      });

      const msgs = dbService.obterMensagens().filter((m) => !escolaId || m.escolaId === escolaId);
      msgs.forEach((m) => {
        this.processarMensagem(m, currentUser, true);
      });
    } catch {}
  }

  /**
   * Utilitário de teste rápido para validação pelo staff/direção.
   */
  public async simularAlerta(
    tipo: 'SOLICITACAO_NOTA' | 'MENSAGEM_BIBLIOTECA' | 'MUDANCA_TEMPO' | 'TERMINO_TEMPO',
    escola: Escola,
    currentUser: Funcionario
  ) {
    const icon = escola.logotipoUrl || escola.logotipo || '/pwa-192x192.png';
    const uid = Date.now();

    if (tipo === 'SOLICITACAO_NOTA') {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'SOLICITACAO_NOTA',
        titulo: '📝 Nova Solicitação de Alteração de Nota',
        mensagem: 'Prof. solicitou retificação de nota (12 → 15 val.) na disciplina de Matemática.',
        detalhes: `Turma 7ª A • Aguarda despacho da Direção Pedagógica`,
        urgente: true,
        tagSW: `sge-teste-sol-${uid}`,
        icon,
        navegacao: { tab: 'coordenacao', subTab: 'solicitacoes' }
      });
    } else if (tipo === 'MENSAGEM_BIBLIOTECA') {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'MENSAGEM_BIBLIOTECA',
        titulo: '📚 URGENTE — Biblioteca Escolar',
        mensagem: 'Aviso urgente da Biblioteca: recolha imediata de manuais emprestados para inventário.',
        detalhes: `Solicitado por Bibliotecário / Direção`,
        urgente: true,
        tagSW: `sge-teste-bib-${uid}`,
        icon,
        navegacao: { tab: 'biblioteca' }
      });
    } else if (tipo === 'MUDANCA_TEMPO') {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'MUDANCA_TEMPO',
        titulo: '🔔 Mudança de Tempo Letivo (2º Tempo)',
        mensagem: 'Início do 2º Tempo Letivo — Transição de aula nas turmas.',
        detalhes: `Horário: 08:05 - 08:50 • Direção de Turma & Professores`,
        urgente: false,
        tagSW: `sge-teste-mudanca-${uid}`,
        icon,
        navegacao: { tab: 'horarios' }
      });
    } else {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'TERMINO_TEMPO',
        titulo: '⏹️ Término de Tempo Letivo (2º Tempo)',
        mensagem: 'O 2º Tempo Letivo terminou! Registe o sumário e libere a turma para transição.',
        detalhes: `Encerramento às 08:50 • Intervalo regulamentar`,
        urgente: false,
        tagSW: `sge-teste-termino-${uid}`,
        icon,
        navegacao: { tab: 'horarios' }
      });
    }
  }
}

export const notificationService = new NotificationService();
