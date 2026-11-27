import {
  Aluno,
  DiaSemana,
  Escola,
  Funcionario,
  MensagemInterna,
  NotificacaoSistemaCategoria,
  NotificacaoSistemaItem,
  OcorrenciaHistoricoAluno,
  PreferenciasNotificacaoSW,
  RegistroAlteracaoNotaDirecao,
  SolicitacaoAlteracaoNota
} from '../types';
import { dbService } from './storage';
import { appUpdateService } from './appUpdateService';
import { normalizarClasse } from './academicHierarchyService';

const STORAGE_NOTIF_LIST = 'sge_notificacoes_sistema_v1';
const STORAGE_NOTIF_PREFS = 'sge_notificacoes_sw_prefs_v1';
const STORAGE_SEEN_KEYS = 'sge_notificacoes_vistos_v1';

const REMINDER_DB_NAME = 'SGE_NG_SW_REMINDERS_DB';
const REMINDER_DB_VERSION = 1;
const REMINDER_STORE = 'state';

const DEFAULT_PREFS: PreferenciasNotificacaoSW = {
  somAtivo: true,
  notificarSolicitacoesNota: true,
  notificarAlteracoesNotaDirecao: true,
  notificarOcorrencias: true,
  notificarBibliotecaUrgente: true,
  notificarComunicacoes: true,
  notificarMudancaTempo: true,
  notificarTerminoTempo: true,
  avisoPrevio5Min: true,
  executarEmSegundoPlanoSW: true
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
  'Estagiario',
  'AuxiliarLimpeza'
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

export interface BackgroundCapabilityInfo {
  swAtivo: boolean;
  permissao: NotificationPermission | 'unsupported';
  suportaTriggersNativos: boolean;
  suportaPeriodicSync: boolean;
  isIosSafariSemPwaInstalada: boolean;
  agendamentosAtivosHoje: number;
}

function parseMinutos(hhmm: string): number | null {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatMinutos(totalMin: number): string {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getLocalDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private swInicializado = false;
  private seenKeys: Set<string>;
  private baselineInicializado = false;
  private listenersNavigate: Set<(nav: { tab: string; subTab?: string; entityId?: string }) => void> = new Set();
  private lastScheduledCount = 0;

  constructor() {
    this.seenKeys = this.carregarSeenKeys();
  }

  private openReminderDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(REMINDER_DB_NAME, REMINDER_DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(REMINDER_STORE)) {
            db.createObjectStore(REMINDER_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async readReminderRecord<T = any>(id: string): Promise<T | null> {
    const db = await this.openReminderDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(REMINDER_STORE, 'readonly');
        const req = tx.objectStore(REMINDER_STORE).get(id);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async writeReminderRecord(record: any): Promise<boolean> {
    const db = await this.openReminderDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(REMINDER_STORE, 'readwrite');
        tx.objectStore(REMINDER_STORE).put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  private carregarSeenKeys(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_SEEN_KEYS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return new Set(arr.slice(-500));
        }
      }
    } catch {}
    return new Set();
  }

  private salvarSeenKey(key: string) {
    if (!key) return;
    this.seenKeys.add(key);
    try {
      const arr = Array.from(this.seenKeys).slice(-500);
      this.seenKeys = new Set(arr);
      localStorage.setItem(STORAGE_SEEN_KEYS, JSON.stringify(arr));
    } catch {}
    // Espelhar na BD partilhada com o Service Worker para evitar duplicação após fechar separador
    this.registarChaveDisparadaNoSW(key).catch(() => {});
  }

  private async registarChaveDisparadaNoSW(key: string): Promise<void> {
    if (!key) return;
    const rec = (await this.readReminderRecord<{ id: string; entries: Record<string, number> }>('fired_keys')) || {
      id: 'fired_keys',
      entries: {}
    };
    const entries = rec.entries && typeof rec.entries === 'object' ? { ...rec.entries } : {};
    if (entries[key]) return;
    entries[key] = Date.now();
    const cutoff = Date.now() - 36 * 60 * 60 * 1000;
    Object.keys(entries).forEach((k) => {
      if (!entries[k] || entries[k] < cutoff) delete entries[k];
    });
    await this.writeReminderRecord({ id: 'fired_keys', entries });
  }

  public async verificarChaveJaDisparada(key: string): Promise<boolean> {
    if (!key) return false;
    if (this.seenKeys.has(key)) return true;
    try {
      const rec = await this.readReminderRecord<{ id: string; entries: Record<string, number> }>('fired_keys');
      if (rec?.entries && rec.entries[key]) {
        this.seenKeys.add(key);
        return true;
      }
    } catch {}
    return false;
  }

  public inicializarServiceWorker(): void {
    if (this.swInicializado || typeof window === 'undefined') return;
    this.swInicializado = true;

    if (!('serviceWorker' in navigator)) return;

    const existingReg = appUpdateService.getServiceWorkerRegistration();
    if (existingReg) {
      this.swRegistration = existingReg;
    }

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) this.swRegistration = reg;
      })
      .catch(() => {});

    navigator.serviceWorker.ready
      .then((reg) => {
        this.swRegistration = reg;
        this.registarSincronizacaoPeriodicaSW(reg).catch(() => {});
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

  private async registarSincronizacaoPeriodicaSW(reg: ServiceWorkerRegistration): Promise<void> {
    try {
      const anyReg = reg as ServiceWorkerRegistration & {
        periodicSync?: { register: (tag: string, opts?: { minInterval?: number }) => Promise<void> };
        sync?: { register: (tag: string) => Promise<void> };
      };
      if (anyReg.periodicSync && typeof anyReg.periodicSync.register === 'function') {
        await anyReg.periodicSync.register('sge-check-reminders', {
          minInterval: 60 * 1000
        }).catch(() => {});
      }
      if (anyReg.sync && typeof anyReg.sync.register === 'function') {
        await anyReg.sync.register('sge-check-reminders').catch(() => {});
      }
    } catch {}
  }

  public async sincronizarAgendaComServiceWorker(escola: Escola, currentUser: Funcionario): Promise<number> {
    if (typeof window === 'undefined' || !escola || !currentUser) return 0;

    const prefs = this.getPreferencias();
    const horarios = dbService.obterHorarios(escola.id);
    const temposHorarios = dbService.getTemposHorarios(escola.id);
    const turnos = dbService.getTurnosConfigs(escola.id).filter((t) => t.ativo !== false);
    const icon = this.resolveAppAsset(escola.logotipoUrl || escola.logotipo || './pwa-192x192.png');

    const statePayload = {
      id: 'schedule_state',
      escolaId: escola.id,
      escolaNome: escola.nomeOficial,
      escolaIcon: icon,
      userId: currentUser.id,
      userRole: currentUser.role,
      userNome: currentUser.nomeCompleto,
      prefs,
      horarios: horarios.map((h) => ({
        id: h.id,
        diaSemana: h.diaSemana,
        numeroTempo: h.numeroTempo,
        horaInicio: h.horaInicio,
        horaFim: h.horaFim,
        disciplinaNome: h.disciplinaNome,
        turmaNome: h.turmaNome,
        classe: h.classe,
        sala: h.sala,
        professorId: h.professorId,
        professorNome: h.professorNome
      })),
      temposHorarios,
      turnos: turnos.map((t) => ({
        id: t.id,
        nome: t.nome,
        horaInicio: t.horaInicio,
        horaFim: t.horaFim,
        temposLectivos: t.temposLectivos,
        intervaloMinutos: t.intervaloMinutos
      })),
      updatedAt: new Date().toISOString()
    };

    await this.writeReminderRecord(statePayload);

    try {
      if ('serviceWorker' in navigator) {
        const reg =
          this.swRegistration ||
          appUpdateService.getServiceWorkerRegistration() ||
          (await navigator.serviceWorker.getRegistration().catch(() => null));
        if (reg) {
          this.swRegistration = reg;
          if (prefs.executarEmSegundoPlanoSW) {
            await this.registarSincronizacaoPeriodicaSW(reg);
          }
          if (reg.active) {
            reg.active.postMessage({
              type: 'SGE_SYNC_REMINDER_STATE',
              state: statePayload
            });
          }
          const count = await this.agendarTriggersNativosNoSistema(reg, statePayload);
          this.lastScheduledCount = count;
          return count;
        }
      }
    } catch {}
    return 0;
  }

  private async agendarTriggersNativosNoSistema(
    reg: ServiceWorkerRegistration,
    state: {
      escolaIcon: string;
      escolaNome: string;
      userId: string;
      userRole: string;
      userNome: string;
      prefs: PreferenciasNotificacaoSW;
      horarios: any[];
      temposHorarios: any[];
      turnos: any[];
    }
  ): Promise<number> {
    const prefs = state.prefs;
    const agora = new Date();
    const mapaDias: Record<number, DiaSemana> = {
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira',
      6: 'Sábado'
    };
    const diaHoje = mapaDias[agora.getDay()];
    if (!diaHoje || (!prefs.notificarMudancaTempo && !prefs.notificarTerminoTempo)) {
      return 0;
    }

    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const dataHoje = getLocalDateIso(agora);
    const temposCobertos = new Set<string>();
    const triggers: Array<{
      targetMin: number;
      title: string;
      body: string;
      tag: string;
      categoria: NotificacaoSistemaCategoria;
      entityId?: string;
    }> = [];

    const horariosHoje = state.horarios.filter((h) => {
      if (!h || h.diaSemana !== diaHoje) return false;
      if (state.userRole === 'Professor') {
        return (
          h.professorId === state.userId ||
          (h.professorNome &&
            state.userNome &&
            String(h.professorNome).toLowerCase() === String(state.userNome).toLowerCase())
        );
      }
      return true;
    });

    horariosHoje.forEach((h) => {
      const minIni = parseMinutos(h.horaInicio);
      const minFim = parseMinutos(h.horaFim);
      if (minIni === null || minFim === null) return;
      const turmaRotulo = h.turmaNome ? `${h.classe} - ${h.turmaNome}` : h.classe || 'Turma';

      if (prefs.notificarMudancaTempo && prefs.avisoPrevio5Min && minIni - 5 > minutosAgora) {
        temposCobertos.add(`START5_${h.numeroTempo}`);
        triggers.push({
          targetMin: minIni - 5,
          title: `⏰ Faltam 5 min para o ${h.numeroTempo}º Tempo`,
          body: `Mudança de tempo às ${h.horaInicio}: ${h.disciplinaNome} (${turmaRotulo}). Sala ${h.sala || '—'}.`,
          tag: `sge-trig-pre-${h.id}-${dataHoje}`,
          categoria: 'MUDANCA_TEMPO',
          entityId: h.id
        });
      }
      if (prefs.notificarMudancaTempo && minIni > minutosAgora) {
        temposCobertos.add(`START_${h.numeroTempo}`);
        triggers.push({
          targetMin: minIni,
          title: `🔔 Mudança de Tempo: Início do ${h.numeroTempo}º Tempo`,
          body: `${h.disciplinaNome} iniciou agora (${h.horaInicio} - ${h.horaFim}) em ${turmaRotulo}.`,
          tag: `sge-trig-ini-${h.id}-${dataHoje}`,
          categoria: 'MUDANCA_TEMPO',
          entityId: h.id
        });
      }
      if (prefs.notificarTerminoTempo && prefs.avisoPrevio5Min && minFim - 5 > minutosAgora) {
        temposCobertos.add(`END5_${h.numeroTempo}`);
        triggers.push({
          targetMin: minFim - 5,
          title: `⏱️ Faltam 5 min para Término do ${h.numeroTempo}º Tempo`,
          body: `A aula de ${h.disciplinaNome} (${turmaRotulo}) termina às ${h.horaFim}.`,
          tag: `sge-trig-prefim-${h.id}-${dataHoje}`,
          categoria: 'TERMINO_TEMPO',
          entityId: h.id
        });
      }
      if (prefs.notificarTerminoTempo && minFim > minutosAgora) {
        temposCobertos.add(`END_${h.numeroTempo}`);
        triggers.push({
          targetMin: minFim,
          title: `⏹️ Término do ${h.numeroTempo}º Tempo Letivo`,
          body: `O tempo de ${h.disciplinaNome} (${turmaRotulo}) terminou às ${h.horaFim}.`,
          tag: `sge-trig-fim-${h.id}-${dataHoje}`,
          categoria: 'TERMINO_TEMPO',
          entityId: h.id
        });
      }
    });

    const slotsGerais: Array<{
      id: string;
      rotuloTurno: string;
      numeroTempo: number;
      inicioMin: number;
      fimMin: number;
      inicioStr: string;
      fimStr: string;
    }> = [];

    state.temposHorarios.forEach((t) => {
      const ini = parseMinutos(t.inicio);
      const fim = parseMinutos(t.fim);
      if (ini === null || fim === null) return;
      slotsGerais.push({
        id: `TEMPO_${t.numero}`,
        rotuloTurno: 'Horário Oficial',
        numeroTempo: t.numero,
        inicioMin: ini,
        fimMin: fim,
        inicioStr: t.inicio,
        fimStr: t.fim
      });
    });

    if (slotsGerais.length === 0) {
      state.turnos.forEach((turno) => {
        const minIniTurno = parseMinutos(turno.horaInicio);
        const minFimTurno = parseMinutos(turno.horaFim);
        if (minIniTurno === null || minFimTurno === null || minFimTurno <= minIniTurno) return;
        const numTempos = Math.max(1, turno.temposLectivos || 5);
        const intervalo = Math.max(0, turno.intervaloMinutos ?? 15);
        const duracaoAula = 45;
        const metadeTempos = Math.ceil(numTempos / 2);
        let cursor = minIniTurno;
        for (let n = 1; n <= numTempos; n++) {
          const ini = cursor;
          const fim = Math.min(minFimTurno, ini + duracaoAula);
          if (ini >= minFimTurno) break;
          slotsGerais.push({
            id: `${turno.id}_T${n}`,
            rotuloTurno: `Turno ${turno.nome}`,
            numeroTempo: n,
            inicioMin: ini,
            fimMin: fim,
            inicioStr: formatMinutos(ini),
            fimStr: formatMinutos(fim)
          });
          cursor = fim + (n === metadeTempos ? intervalo : 5);
        }
      });
    }

    slotsGerais.forEach((slot) => {
      if (prefs.notificarMudancaTempo && prefs.avisoPrevio5Min && !temposCobertos.has(`START5_${slot.numeroTempo}`) && slot.inicioMin - 5 > minutosAgora) {
        triggers.push({
          targetMin: slot.inicioMin - 5,
          title: `⏰ Faltam 5 min — ${slot.numeroTempo}º Tempo (${slot.rotuloTurno})`,
          body: `Mudança de tempo letivo às ${slot.inicioStr}. ${state.escolaNome}.`,
          tag: `sge-trig-g-pre-${slot.id}-${dataHoje}`,
          categoria: 'MUDANCA_TEMPO'
        });
      }
      if (prefs.notificarMudancaTempo && !temposCobertos.has(`START_${slot.numeroTempo}`) && slot.inicioMin > minutosAgora) {
        triggers.push({
          targetMin: slot.inicioMin,
          title: `🔔 Mudança de Tempo — ${slot.numeroTempo}º Tempo (${slot.rotuloTurno})`,
          body: `Início oficial do ${slot.numeroTempo}º tempo letivo (${slot.inicioStr} - ${slot.fimStr}).`,
          tag: `sge-trig-g-ini-${slot.id}-${dataHoje}`,
          categoria: 'MUDANCA_TEMPO'
        });
      }
      if (prefs.notificarTerminoTempo && prefs.avisoPrevio5Min && !temposCobertos.has(`END5_${slot.numeroTempo}`) && slot.fimMin - 5 > minutosAgora) {
        triggers.push({
          targetMin: slot.fimMin - 5,
          title: `⏱️ Faltam 5 min para Término — ${slot.numeroTempo}º Tempo`,
          body: `O ${slot.numeroTempo}º tempo (${slot.rotuloTurno}) termina às ${slot.fimStr}.`,
          tag: `sge-trig-g-prefim-${slot.id}-${dataHoje}`,
          categoria: 'TERMINO_TEMPO'
        });
      }
      if (prefs.notificarTerminoTempo && !temposCobertos.has(`END_${slot.numeroTempo}`) && slot.fimMin > minutosAgora) {
        triggers.push({
          targetMin: slot.fimMin,
          title: `⏹️ Término de Tempo — ${slot.numeroTempo}º Tempo (${slot.rotuloTurno})`,
          body: `Encerramento do ${slot.numeroTempo}º tempo letivo às ${slot.fimStr}.`,
          tag: `sge-trig-g-fim-${slot.id}-${dataHoje}`,
          categoria: 'TERMINO_TEMPO'
        });
      }
    });

    // Se Notification Triggers API estiver disponível (Chrome/Edge/Android com flag/PWA), registar no SO
    const TimestampTriggerCtor = (typeof window !== 'undefined' && (window as any).TimestampTrigger) || null;
    const suportaTrigger =
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      'showTrigger' in Notification.prototype &&
      typeof TimestampTriggerCtor === 'function' &&
      prefs.executarEmSegundoPlanoSW;

    if (suportaTrigger && typeof reg.showNotification === 'function') {
      try {
        const existing = await (reg as any).getNotifications({ includeTriggered: true });
        if (Array.isArray(existing)) {
          existing.forEach((n: Notification) => {
            if (n.tag && n.tag.startsWith('sge-trig-')) n.close();
          });
        }
      } catch {}

      const defaultIcon = this.resolveAppAsset('./pwa-192x192.png');
      const baseDay = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0).getTime();

      for (const trig of triggers) {
        const fireAt = baseDay + trig.targetMin * 60 * 1000;
        if (fireAt <= Date.now() + 5000) continue;
        try {
          await reg.showNotification(trig.title, {
            body: trig.body,
            icon: state.escolaIcon || defaultIcon,
            badge: defaultIcon,
            tag: trig.tag,
            silent: !prefs.somAtivo,
            data: {
              url: this.resolveAppAsset('./'),
              tab: 'horarios',
              entityId: trig.entityId || '',
              categoria: trig.categoria
            },
            showTrigger: new TimestampTriggerCtor(fireAt)
          } as NotificationOptions & { showTrigger?: unknown });
        } catch {}
      }
    }

    return triggers.length;
  }

  public obterCapacidadesSegundoPlano(): BackgroundCapabilityInfo {
    const isWin = typeof window !== 'undefined';
    const isNav = typeof navigator !== 'undefined';
    const ua = isNav ? navigator.userAgent || '' : '';
    const isIos = /iPad|iPhone|iPod/i.test(ua);
    const isStandalone =
      isWin &&
      (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

    return {
      swAtivo: this.isServiceWorkerAtivo(),
      permissao: this.obterEstadoPermissao(),
      suportaTriggersNativos:
        typeof Notification !== 'undefined' && 'showTrigger' in Notification.prototype,
      suportaPeriodicSync:
        Boolean(this.swRegistration && 'periodicSync' in this.swRegistration),
      isIosSafariSemPwaInstalada: isIos && !isStandalone,
      agendamentosAtivosHoje: this.lastScheduledCount
    };
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

  public warmOfflineCache(urls?: string[]): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const origin = window.location.origin;
      const collected = new Set<string>(Array.isArray(urls) ? urls : []);
      if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        for (const e of entries) {
          if (!e?.name || !e.name.startsWith(origin)) continue;
          const pathPart = e.name.slice(origin.length);
          if (
            pathPart.startsWith('/api/') ||
            pathPart.startsWith('/src/') ||
            pathPart.startsWith('/@') ||
            pathPart.startsWith('/node_modules/') ||
            e.name.includes('.hot-update.') ||
            e.name.includes('version.json') ||
            e.name.includes('?v=') ||
            e.name.includes('?t=')
          ) {
            continue;
          }
          collected.add(e.name);
        }
      }
      if (collected.size === 0) return;
      const payload = { type: 'SGE_WARM_CACHE', urls: Array.from(collected) };
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(payload);
      } else if (this.swRegistration?.active) {
        this.swRegistration.active.postMessage(payload);
      }
    } catch {}
  }

  public obterEstadoPermissao(): NotificationPermission | 'unsupported' {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  }

  public async solicitarPermissao(escola?: Escola, currentUser?: Funcionario): Promise<NotificationPermission | 'unsupported'> {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted' && escola && currentUser) {
        await this.sincronizarAgendaComServiceWorker(escola, currentUser);
      }
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
      case 'ALTERACAO_NOTA_DIRECAO':
        return prefs.notificarAlteracoesNotaDirecao !== false;
      case 'OCORRENCIA_ESCOLAR':
        return prefs.notificarOcorrencias !== false;
      case 'MENSAGEM_BIBLIOTECA':
        return prefs.notificarBibliotecaUrgente;
      case 'COMUNICACAO':
        return prefs.notificarComunicacoes;
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

      if (categoria === 'MENSAGEM_BIBLIOTECA' || categoria === 'SOLICITACAO_NOTA' || categoria === 'OCORRENCIA_ESCOLAR') {
        tocarNota(880, 0, 0.35, 'triangle', 0.32);
        tocarNota(1174.66, 180, 0.55, 'triangle', 0.36);
        tocarNota(1318.51, 380, 0.7, 'sine', 0.3);
      } else if (categoria === 'COMUNICACAO') {
        tocarNota(659.25, 0, 0.28, 'sine', 0.25);
        tocarNota(880.0, 160, 0.45, 'sine', 0.28);
      } else if (categoria === 'TERMINO_TEMPO') {
        tocarNota(1174.66, 0, 1.1, 'sine', 0.35);
        tocarNota(880.0, 260, 1.2, 'sine', 0.35);
        tocarNota(587.33, 540, 1.8, 'sine', 0.38);
      } else {
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
      if (await this.verificarChaveJaDisparada(params.dedupeKey)) {
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_toast_notificacao', { detail: item }));
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    }

    await this.exibirViaServiceWorker(item, params.icon);

    return item;
  }

  private resolveAppAsset(relPath: string): string {
    if (typeof document !== 'undefined') {
      try {
        return new URL(relPath, document.baseURI).href;
      } catch {}
    }
    return relPath;
  }

  private async exibirViaServiceWorker(item: NotificacaoSistemaItem, customIcon?: string): Promise<void> {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const bodyTexto = item.detalhes ? `${item.mensagem}\n${item.detalhes}` : item.mensagem;
    const defaultIcon = this.resolveAppAsset('./pwa-192x192.png');
    const iconUrl = customIcon || defaultIcon;
    const notifOptions: NotificationOptions & {
      renotify?: boolean;
      vibrate?: number[];
      actions?: Array<{ action: string; title: string }>;
    } = {
      body: bodyTexto,
      icon: iconUrl,
      badge: defaultIcon,
      tag: item.tagSW || item.id,
      renotify: true,
      requireInteraction: Boolean(item.urgente),
      vibrate: item.urgente ? [220, 100, 220, 100, 220] : [140, 70, 140],
      silent: !this.getPreferencias().somAtivo,
      data: {
        url: this.resolveAppAsset('./'),
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
        const reg =
          this.swRegistration ||
          appUpdateService.getServiceWorkerRegistration() ||
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.ready.catch(() => null));
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

      const alunos = dbService.obterAlunos().filter((a) => !escolaId || escolaId === 'todas' || a.escolaId === escolaId);
      alunos.forEach((al) => {
        (al.ocorrencias || []).forEach((oc) => {
          if (oc?.id) {
            this.salvarSeenKey(`ocorr_${al.id}_${oc.id}`);
          }
        });
      });

      const alteracoesLidas = dbService.getRegistosAlteracoesNotas(undefined, escolaId);
      alteracoesLidas.forEach((r) => {
        if (r?.id && r.lidoPeloProfessor === true) {
          this.salvarSeenKey(`alt_nota_${r.id}`);
        }
      });
    } catch {}
  }

  public resetarBaseline() {
    this.baselineInicializado = false;
  }

  public resolverDestinatariosOcorrencia(
    escolaId: string,
    aluno: Aluno,
    ocorrencia: OcorrenciaHistoricoAluno
  ): Array<{ funcionario: Funcionario; papeis: string[] }> {
    const destinatarios = new Map<string, { funcionario: Funcionario; papeis: Set<string> }>();
    const escolaObj = dbService.getEscolaPorId(escolaId);
    const anoRef = ocorrencia.anoLectivo || aluno.anoLectivo || escolaObj?.anoLectivoActivo || '';
    const turmas = dbService.getTurmas().filter((t) => !escolaId || escolaId === 'todas' || t.escolaId === escolaId);
    const turmaIdRef = ocorrencia.turmaId || aluno.turmaId;
    const turmaObj = turmas.find((t) => t.id === turmaIdRef);

    const norm = (v?: string) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const classeRef = normalizarClasse(ocorrencia.classe || turmaObj?.classe || aluno.classeId || '');
    const classeNorm = norm(classeRef);
    const turnoNorm = norm(turmaObj?.turno);
    const turmaNomeNorm = norm(ocorrencia.turmaNome || turmaObj?.nome);

    const funcionarios = dbService.getFuncionarios().filter((f) => f.ativo !== false && (!escolaId || escolaId === 'todas' || f.escolaId === escolaId));
    const porId = new Map<string, Funcionario>();
    funcionarios.forEach((f) => porId.set(f.id, f));

    const adicionar = (funcId: string | undefined, papel: string) => {
      if (!funcId) return;
      const f = porId.get(funcId);
      if (!f) return;
      const entry = destinatarios.get(f.id) || { funcionario: f, papeis: new Set<string>() };
      entry.papeis.add(papel);
      destinatarios.set(f.id, entry);
    };

    const coordenacoes = dbService
      .getCoordenacoes(escolaId, anoRef || 'todos')
      .filter((c) => c.ativo !== false);

    // 1. Subdiretor Pedagógico (sempre notificado)
    funcionarios
      .filter((f) => f.role === 'SubdiretorPedagogico')
      .forEach((f) => adicionar(f.id, 'Subdiretor Pedagógico'));

    // 2. Coordenador de Turma (Turma.coordenadorId, AtribuicaoDocente.ehCoordenadorTurma, ou CoordenacaoEscolar)
    if (turmaObj?.coordenadorId) {
      adicionar(turmaObj.coordenadorId, 'Coordenador de Turma');
    }
    const atribuicoes = dbService.getAtribuicoes(escolaId, anoRef || 'todos');
    atribuicoes
      .filter((a) => a.ehCoordenadorTurma && a.turmaId === turmaIdRef)
      .forEach((a) => adicionar(a.professorId, 'Coordenador de Turma'));

    const coordsTurnoEspecificos = new Map<string, Set<string>>();
    coordenacoes.forEach((c) => {
      const respId = c.funcionarioId || c.professorId;
      const tipoNorm = norm(c.tipoCoordenacao);
      const coordClasseNorm = norm(normalizarClasse(c.classe || ''));
      const coordTurmaNomeNorm = norm(c.turmaNome);
      const coordTurnoNorm = norm(c.turno);

      if (tipoNorm.includes('turno') && respId && coordTurnoNorm) {
        const setTurnos = coordsTurnoEspecificos.get(respId) || new Set<string>();
        setTurnos.add(coordTurnoNorm);
        coordsTurnoEspecificos.set(respId, setTurnos);
      }

      // Coordenador de Classe (e Iniciação quando aplicável)
      if (
        (tipoNorm.includes('classe') && coordClasseNorm && classeNorm && coordClasseNorm === classeNorm) ||
        (tipoNorm.includes('iniciacao') && classeNorm.includes('iniciacao'))
      ) {
        adicionar(respId, 'Coordenador de Classe');
      }

      // Coordenador de Turma
      if (
        tipoNorm.includes('turma') &&
        ((c.turmaId && turmaIdRef && c.turmaId === turmaIdRef) ||
          (coordTurmaNomeNorm && turmaNomeNorm && coordTurmaNomeNorm === turmaNomeNorm && (!coordClasseNorm || coordClasseNorm === classeNorm)))
      ) {
        adicionar(respId, 'Coordenador de Turma');
      }

      // Coordenador de Turno
      if (tipoNorm.includes('turno') && (!coordTurnoNorm || !turnoNorm || coordTurnoNorm === turnoNorm)) {
        adicionar(respId, 'Coordenador de Turno');
      }
    });

    // Também incluir funcionários com cargo/role CoordenadorTurno (se não estiverem restringidos apenas a outro turno)
    funcionarios
      .filter((f) => f.role === 'CoordenadorTurno')
      .forEach((f) => {
        const turnosDoCoord = coordsTurnoEspecificos.get(f.id);
        if (!turnosDoCoord || !turnoNorm || turnosDoCoord.has(turnoNorm)) {
          adicionar(f.id, 'Coordenador de Turno');
        }
      });

    return Array.from(destinatarios.values()).map((d) => ({
      funcionario: d.funcionario,
      papeis: Array.from(d.papeis)
    }));
  }

  /**
   * Notifica imediatamente (no sino/caixa local dos perfis-alvo neste dispositivo e marca visto no autor)
   * quando um Professor regista uma ocorrência disciplinar/pedagógica de aluno.
   */
  public notificarNovaOcorrenciaRegistrada(
    aluno: Aluno,
    ocorrencia: OcorrenciaHistoricoAluno,
    remetente?: Funcionario | null
  ): number {
    if (!aluno || !ocorrencia?.id) return 0;

    const ehOrigemProfessor =
      remetente?.role === 'Professor' ||
      Boolean(remetente?.ehProfessor) ||
      ocorrencia.criadoPorRole === 'Professor' ||
      String(ocorrencia.cargo || '').toLowerCase().includes('professor');

    if (!ehOrigemProfessor) return 0;

    const escolaId = aluno.escolaId || remetente?.escolaId || dbService.getEscolaAtiva()?.id || '';
    if (!escolaId) return 0;

    // Evitar auto-eco no dispositivo do professor que acabou de registar
    this.salvarSeenKey(`ocorr_${aluno.id}_${ocorrencia.id}`);

    const prefs = this.getPreferencias();
    if (!this.categoriaPermitida('OCORRENCIA_ESCOLAR', prefs)) return 0;

    const destinatarios = this.resolverDestinatariosOcorrencia(escolaId, aluno, ocorrencia);
    const turmas = dbService.getTurmas().filter((t) => !escolaId || escolaId === 'todas' || t.escolaId === escolaId);
    const turmaObj = turmas.find((t) => t.id === (ocorrencia.turmaId || aluno.turmaId));
    const turmaLabel = [
      ocorrencia.classe || turmaObj?.classe || aluno.classeId,
      ocorrencia.turmaNome || turmaObj?.nome,
      turmaObj?.turno ? `Turno ${turmaObj.turno}` : ''
    ]
      .filter(Boolean)
      .join(' · ');

    let enviados = 0;
    destinatarios.forEach(({ funcionario, papeis }) => {
      if (remetente?.id && funcionario.id === remetente.id) return;

      const item: NotificacaoSistemaItem = {
        id: `notif-ocorr-${ocorrencia.id}-${funcionario.id}`,
        escolaId,
        destinatarioUserId: funcionario.id,
        categoria: 'OCORRENCIA_ESCOLAR',
        titulo: `⚠️ Nova Ocorrência (${ocorrencia.tipo} • ${ocorrencia.gravidade})`,
        mensagem: `Prof. ${ocorrencia.registadoPor} registou ocorrência para ${aluno.nomeCompleto} (${turmaLabel || 'Turma'}).`,
        detalhes: `${papeis.join(' / ')} — ${ocorrencia.descricao}`,
        urgente: ocorrencia.gravidade === 'Grave',
        lida: false,
        criadaEm: ocorrencia.criadoEm || new Date().toISOString(),
        tagSW: `sge-ocorr-${ocorrencia.id}-${funcionario.id}`,
        navegacao: {
          tab: 'alunos',
          subTab: 'ocorrencias',
          entityId: aluno.id
        }
      };

      this.gravarNotificacaoNaLista(item);
      enviados++;
    });

    if (enviados > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_notificacoes_atualizadas'));
    }

    return enviados;
  }

  public processarOcorrenciaAluno(
    aluno: Aluno,
    ocorrencia: OcorrenciaHistoricoAluno,
    currentUser: Funcionario,
    isRemoto = false
  ) {
    if (!aluno || !ocorrencia?.id || !currentUser?.id) return;
    const key = `ocorr_${aluno.id}_${ocorrencia.id}`;
    if (this.seenKeys.has(key)) return;

    const ehOrigemProfessor =
      ocorrencia.criadoPorRole === 'Professor' ||
      String(ocorrencia.cargo || '').toLowerCase().includes('professor') ||
      ocorrencia.statusAprovacao === 'Pendente_Coordenador';

    if (!ehOrigemProfessor) {
      if (isRemoto) this.salvarSeenKey(key);
      return;
    }

    if (ocorrencia.criadoPorId && ocorrencia.criadoPorId === currentUser.id) {
      this.salvarSeenKey(key);
      return;
    }

    const escolaId = aluno.escolaId || currentUser.escolaId;
    const destinatarios = this.resolverDestinatariosOcorrencia(escolaId, aluno, ocorrencia);
    const match = destinatarios.find((d) => d.funcionario.id === currentUser.id);

    if (!match) {
      if (isRemoto) this.salvarSeenKey(key);
      return;
    }

    const escolaObj = dbService.getEscolaPorId(escolaId);
    const turmas = dbService.getTurmas().filter((t) => !escolaId || escolaId === 'todas' || t.escolaId === escolaId);
    const turmaObj = turmas.find((t) => t.id === (ocorrencia.turmaId || aluno.turmaId));
    const turmaLabel = [
      ocorrencia.classe || turmaObj?.classe || aluno.classeId,
      ocorrencia.turmaNome || turmaObj?.nome,
      turmaObj?.turno ? `Turno ${turmaObj.turno}` : ''
    ]
      .filter(Boolean)
      .join(' · ');

    this.dispararNotificacaoSW({
      escolaId,
      destinatarioUserId: currentUser.id,
      categoria: 'OCORRENCIA_ESCOLAR',
      titulo: `⚠️ Nova Ocorrência (${ocorrencia.tipo} • ${ocorrencia.gravidade})`,
      mensagem: `Prof. ${ocorrencia.registadoPor} registou ocorrência para ${aluno.nomeCompleto} (${turmaLabel || 'Turma'}).`,
      detalhes: `${match.papeis.join(' / ')} — ${ocorrencia.descricao}`,
      urgente: ocorrencia.gravidade === 'Grave',
      tagSW: `sge-ocorr-${ocorrencia.id}-${currentUser.id}`,
      icon: escolaObj?.logotipoUrl || escolaObj?.logotipo || './pwa-192x192.png',
      navegacao: {
        tab: 'alunos',
        subTab: 'ocorrencias',
        entityId: aluno.id
      },
      dedupeKey: key
    });
  }

  public processarSolicitacaoNota(sol: SolicitacaoAlteracaoNota, currentUser: Funcionario, isRemoto = false) {
    if (!sol || !sol.id) return;
    const key = `sol_${sol.id}_${sol.estado}`;
    if (this.seenKeys.has(key)) return;

    const ehStaffRevisor = STAFF_REVISAO_NOTAS_ROLES.has(currentUser.role);
    const ehProfessorSolicitante = sol.professorId === currentUser.id;
    const escolaObj = dbService.getEscolaPorId(sol.escolaId);

    if (sol.estado === 'Pendente') {
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
          icon: escolaObj?.logotipoUrl || escolaObj?.logotipo || './pwa-192x192.png',
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
          icon: escolaObj?.logotipoUrl || escolaObj?.logotipo || './pwa-192x192.png',
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
   * Avalia todas as comunicações, avisos e mensagens diretas (urgentes e regulares, online e offline).
   */
  public processarMensagem(msg: MensagemInterna, currentUser: Funcionario, isRemoto = false) {
    if (!msg || !msg.id) return;
    const key = `msg_${msg.id}`;
    if (this.seenKeys.has(key)) return;

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

    // Não duplicar para quem acabou de enviar no próprio dispositivo (exceto auto-mensagem)
    if (!isRemoto && msg.remetenteId === currentUser.id && msg.destinatarioId !== currentUser.id) {
      this.salvarSeenKey(key);
      return;
    }

    const destOk =
      msg.destinatarioId === currentUser.id ||
      msg.destinatarioTipo === 'Todos' ||
      msg.destinatarioTipo === 'Funcionarios' ||
      (msg.destinatarioTipo === 'Docentes' &&
        (currentUser.ehProfessor ||
          currentUser.role === 'Professor' ||
          currentUser.role === 'CoordenadorPedagogico' ||
          currentUser.role === 'CoordenadorTurno' ||
          currentUser.role === 'CoordenadorDisciplina')) ||
      (msg.destinatarioTipo === 'Secretaria' &&
        [
          'DiretorGeral',
          'SubdiretorPedagogico',
          'SubdiretorAdministrativo',
          'SubdirectorAdministrativo',
          'ChefeSecretaria',
          'Secretario',
          'SecretarioEscolar',
          'Secretaria',
          'Bibliotecario'
        ].includes(currentUser.role)) ||
      (msg.destinatarioTipo === 'Encarregados' && currentUser.role === 'Encarregado') ||
      (msg.destinatarioTipo === 'Area' && Boolean(msg.areaDestino)) ||
      (!msg.destinatarioId && !msg.destinatarioTipo && STAFF_GERAL_ROLES.has(currentUser.role));

    if (!destOk && currentUser.role !== 'AdminGeral') {
      return;
    }

    const prefs = this.getPreferencias();
    const categoria: NotificacaoSistemaCategoria = ehUrgente ? 'MENSAGEM_BIBLIOTECA' : 'COMUNICACAO';
    if (!this.categoriaPermitida(categoria, prefs)) {
      return;
    }

    const ehBiblioteca = msg.origemModulo === 'Biblioteca';
    const escolaObj = dbService.getEscolaPorId(msg.escolaId);
    const tituloAssunto = msg.assunto || msg.titulo || 'Nova Comunicação';
    const ehComunicadoGeral = msg.tipo === 'GERAL' || msg.tipo === 'GRUPO';
    const tituloFinal = ehBiblioteca
      ? `📚 URGENTE — Biblioteca: ${tituloAssunto}`
      : ehUrgente
      ? `🚨 Comunicado Urgente: ${tituloAssunto}`
      : ehComunicadoGeral
      ? `📢 Comunicado: ${tituloAssunto}`
      : `💬 Mensagem: ${tituloAssunto}`;

    const iconFinal = escolaObj?.logotipoUrl || escolaObj?.logotipo || './pwa-192x192.png';

    this.dispararNotificacaoSW({
      escolaId: msg.escolaId,
      destinatarioUserId: msg.destinatarioId || currentUser.id,
      categoria,
      titulo: tituloFinal,
      mensagem: msg.conteudo,
      detalhes: `Enviado por ${msg.remetenteNome} (${msg.remetenteCargo || msg.remetentePapel})`,
      urgente: ehUrgente,
      tagSW: `${ehUrgente ? 'sge-msg-urg' : 'sge-comm'}-${msg.id}`,
      icon: iconFinal,
      navegacao: {
        tab: ehBiblioteca ? 'biblioteca' : 'comunicacao',
        subTab: ehComunicadoGeral ? 'comunicados' : 'mensagens_diretas',
        entityId: msg.id
      },
      dedupeKey: key
    });
  }

  public processarAlteracaoNotaDirecao(
    reg: RegistroAlteracaoNotaDirecao,
    currentUser: Funcionario,
    forcarAlerta = false
  ) {
    if (!reg || !reg.id || !currentUser?.id) return;
    if (reg.alteradoPorRole === 'AdminGeral') return;
    if (reg.professorId !== currentUser.id) return;
    if (reg.lidoPeloProfessor === true) return;
    if (reg.alteradoPorId === currentUser.id) return;

    const key = `alt_nota_${reg.id}`;
    if (forcarAlerta && this.seenKeys.has(key)) return;

    const escolaObj = dbService.getEscolaPorId(reg.escolaId);
    const iconFinal = escolaObj?.logotipoUrl || escolaObj?.logotipo || './pwa-192x192.png';
    const notaAntTexto = reg.notaAnteriorEmFalta ? 'Em falta' : `${reg.notaAnterior}`;
    const cargoAutor =
      reg.alteradoPorRole === 'DiretorGeral' ? 'Diretor Geral' : 'Subdiretor Pedagógico';

    this.dispararNotificacaoSW({
      escolaId: reg.escolaId,
      destinatarioUserId: reg.professorId,
      categoria: 'ALTERACAO_NOTA_DIRECAO',
      titulo: `✏️ Nota Alterada pela Direção (${reg.disciplinaNome})`,
      mensagem: `${reg.alunoNome} (${reg.classe} • ${reg.turmaNome}): ${reg.tipoNota} de ${notaAntTexto} para ${reg.novaNota} val. (${reg.trimestre}º Tri).`,
      detalhes: `Alterado por ${reg.alteradoPorNome} (${cargoAutor}) • Motivo: ${reg.motivoJustificativa}`,
      urgente: true,
      tagSW: `sge-alt-nota-${reg.id}`,
      icon: iconFinal,
      navegacao: {
        tab: 'avaliacoes',
        subTab: 'auditoria_direcao',
        entityId: reg.id
      },
      dedupeKey: key
    });
  }

  public verificarNovidadesRemotas(escolaId: string, currentUser: Funcionario) {
    if (!currentUser || !currentUser.id) return;

    if (!this.baselineInicializado) {
      this.inicializarBaselineRemoto(escolaId);
      // Verificar alterações de notas não lidas pela direção logo após inicializar baseline
      try {
        const altPendentes = dbService.getRegistosAlteracoesNotas(currentUser.id, escolaId);
        altPendentes.forEach((r) => {
          this.processarAlteracaoNotaDirecao(r, currentUser, true);
        });
      } catch {}
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

      const alunos = dbService.obterAlunos().filter((a) => !escolaId || escolaId === 'todas' || a.escolaId === escolaId);
      alunos.forEach((al) => {
        (al.ocorrencias || []).forEach((oc) => {
          this.processarOcorrenciaAluno(al, oc, currentUser, true);
        });
      });

      const alteracoesNotas = dbService.getRegistosAlteracoesNotas(currentUser.id, escolaId);
      alteracoesNotas.forEach((r) => {
        this.processarAlteracaoNotaDirecao(r, currentUser, true);
      });
    } catch {}
  }

  public async simularAlerta(
    tipo: 'SOLICITACAO_NOTA' | 'OCORRENCIA_ESCOLAR' | 'MENSAGEM_BIBLIOTECA' | 'COMUNICACAO' | 'MUDANCA_TEMPO' | 'TERMINO_TEMPO',
    escola: Escola,
    currentUser: Funcionario
  ) {
    const icon = escola.logotipoUrl || escola.logotipo || './pwa-192x192.png';
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
    } else if (tipo === 'OCORRENCIA_ESCOLAR') {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'OCORRENCIA_ESCOLAR',
        titulo: '⚠️ Nova Ocorrência (Disciplinar • Média)',
        mensagem: 'Professor registou uma ocorrência escolar para acompanhamento da coordenação e subdireção pedagógica.',
        detalhes: `Notificação enviada ao Coordenador de Classe, Turma, Turno e Subdiretor Pedagógico`,
        urgente: true,
        tagSW: `sge-teste-ocorr-${uid}`,
        icon,
        navegacao: { tab: 'alunos', subTab: 'ocorrencias' }
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
    } else if (tipo === 'COMUNICACAO') {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'COMUNICACAO',
        titulo: '📢 Comunicado Oficial da Direção',
        mensagem: 'Reunião pedagógica extraordinária agendada para amanhã às 08h00 na sala de professores.',
        detalhes: `${escola.nomeOficial} • Disponível online e offline`,
        urgente: false,
        tagSW: `sge-teste-comm-${uid}`,
        icon,
        navegacao: { tab: 'comunicacao' }
      });
    } else if (tipo === 'MUDANCA_TEMPO') {
      await this.dispararNotificacaoSW({
        escolaId: escola.id,
        destinatarioUserId: currentUser.id,
        categoria: 'MUDANCA_TEMPO',
        titulo: '🔔 Mudança de Tempo Letivo (2º Tempo)',
        mensagem: 'Início do 2º Tempo Letivo — Transição de aula nas turmas.',
        detalhes: `Horário: 08:05 - 08:50 • Lembrete 5 min antes + hora exata ativo`,
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
