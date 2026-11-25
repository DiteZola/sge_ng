import { offlineStorage } from './offlineStorage';
import { dbService } from './storage';

export interface PeriodicBackupConfig {
  ativado: boolean;
  intervaloSnapshotMinutos: number;
  autoDownloadAtivado: boolean;
  intervaloAutoDownloadHoras: number;
  maxSnapshotsRetidos: number;
  ultimoSnapshotEm: string | null;
  ultimoAutoDownloadEm: string | null;
  ultimoAutoDownloadNome?: string | null;
}

export interface PeriodicSnapshotResumo {
  alunos: number;
  funcionarios: number;
  turmas: number;
  notas: number;
  recibos: number;
  documentos: number;
}

export interface PeriodicSnapshotRecord {
  id: string;
  escolaId: string;
  escolaNome: string;
  criadoEm: string;
  origem: 'automatico' | 'manual' | 'pre_atualizacao' | 'auto_download';
  motivo: string;
  versaoApp: string;
  tamanhoBytes: number;
  contentSignature: string;
  resumo: PeriodicSnapshotResumo;
  dadosJson: string;
}

export type PeriodicSnapshotMetadata = Omit<PeriodicSnapshotRecord, 'dadosJson'> & {
  temDadosJson: boolean;
};

const CONFIG_KEY = 'sge_periodic_backup_config_v1';

const DEFAULT_CONFIG: PeriodicBackupConfig = {
  ativado: true,
  intervaloSnapshotMinutos: 30,
  autoDownloadAtivado: false,
  intervaloAutoDownloadHoras: 24,
  maxSnapshotsRetidos: 20,
  ultimoSnapshotEm: null,
  ultimoAutoDownloadEm: null,
  ultimoAutoDownloadNome: null
};

function computeFastHash(text: string): string {
  // Remove volatile timestamp fields before hashing to avoid storing redundant idle snapshots
  const normalized = text.replace(/"dataExportacao"\s*:\s*"[^"]*"/g, '');
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16)}-${(h1 >>> 0).toString(16)}-${normalized.length}`;
}

function getAppVersion(): string {
  try {
    return typeof __SGE_APP_VERSION__ !== 'undefined' ? __SGE_APP_VERSION__ : 'SGE-NG 2.6';
  } catch {
    return 'SGE-NG 2.6';
  }
}

class PeriodicBackupService {
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private schedulerStarted = false;
  private snapshotInProgress = false;

  public obterConfig(): PeriodicBackupConfig {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_CONFIG, ...parsed };
          }
        }
      }
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  public salvarConfig(partial: Partial<PeriodicBackupConfig>): PeriodicBackupConfig {
    const atual = this.obterConfig();
    const atualizado: PeriodicBackupConfig = {
      ...atual,
      ...partial,
      intervaloSnapshotMinutos: Math.max(5, Number(partial.intervaloSnapshotMinutos ?? atual.intervaloSnapshotMinutos) || 30),
      intervaloAutoDownloadHoras: Math.max(1, Number(partial.intervaloAutoDownloadHoras ?? atual.intervaloAutoDownloadHoras) || 24),
      maxSnapshotsRetidos: Math.min(100, Math.max(5, Number(partial.maxSnapshotsRetidos ?? atual.maxSnapshotsRetidos) || 20))
    };

    const serialized = JSON.stringify(atualizado);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CONFIG_KEY, serialized);
      }
    } catch {}
    offlineStorage.gravarChaveNoIndexedDB(CONFIG_KEY, serialized);
    this.emitUpdated();
    return atualizado;
  }

  private emitUpdated() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sge_periodic_backup_updated'));
    }
  }

  private resolveEscopoAtual(escolaIdOverride?: string): { escolaId: string; escolaNome: string } {
    try {
      const user = dbService.getCurrentUser();
      const isAdmin = user?.role === 'AdminGeral';
      const escolaAtiva = dbService.getEscolaAtiva();
      if (escolaIdOverride) {
        if (escolaIdOverride === 'todas' && isAdmin) {
          return { escolaId: 'todas', escolaNome: 'Rede Nacional (Todas as Escolas)' };
        }
        const esc = dbService.getEscolaPorId(escolaIdOverride) || escolaAtiva;
        return { escolaId: esc.id, escolaNome: esc.nomeOficial };
      }
      if (isAdmin) {
        return { escolaId: 'todas', escolaNome: 'Rede Nacional (Sistema Completo)' };
      }
      return { escolaId: escolaAtiva.id, escolaNome: escolaAtiva.nomeOficial };
    } catch {
      return { escolaId: 'todas', escolaNome: 'Instituição SGE-NG' };
    }
  }

  public async listarSnapshots(escolaIdFilter?: string): Promise<PeriodicSnapshotMetadata[]> {
    const all = await offlineStorage.listarSnapshotsPeriodicosDoIDB<PeriodicSnapshotRecord>();
    const user = dbService.getCurrentUser();
    const isAdmin = user?.role === 'AdminGeral';
    const escolaAtivaId = escolaIdFilter || dbService.getEscolaAtiva()?.id;

    return all
      .filter((r) => {
        if (!r || !r.id) return false;
        if (isAdmin) {
          if (escolaIdFilter && escolaIdFilter !== 'todas') {
            return r.escolaId === escolaIdFilter || r.escolaId === 'todas';
          }
          return true;
        }
        return r.escolaId === escolaAtivaId;
      })
      .map((r) => ({
        id: r.id,
        escolaId: r.escolaId,
        escolaNome: r.escolaNome,
        criadoEm: r.criadoEm,
        origem: r.origem,
        motivo: r.motivo,
        versaoApp: r.versaoApp,
        tamanhoBytes: r.tamanhoBytes,
        contentSignature: r.contentSignature,
        resumo: r.resumo,
        temDadosJson: Boolean(r.dadosJson && r.dadosJson.length > 20)
      }));
  }

  public async criarSnapshotAgora(
    origem: PeriodicSnapshotRecord['origem'] = 'manual',
    motivo: string = 'Snapshot manual em IndexedDB',
    escolaIdOverride?: string
  ): Promise<PeriodicSnapshotRecord | null> {
    if (this.snapshotInProgress && origem === 'automatico') return null;
    this.snapshotInProgress = true;
    try {
      const { escolaId, escolaNome } = this.resolveEscopoAtual(escolaIdOverride);
      const dadosJson = dbService.criarBackupJSON(escolaId);
      const signature = computeFastHash(dadosJson);

      if (origem === 'automatico') {
        const existentes = await offlineStorage.listarSnapshotsPeriodicosDoIDB<PeriodicSnapshotRecord>();
        const maisRecente = existentes.find((s) => s.escolaId === escolaId);
        if (maisRecente && maisRecente.contentSignature === signature) {
          this.salvarConfig({ ultimoSnapshotEm: new Date().toISOString() });
          return maisRecente;
        }
      }

      let resumo: PeriodicSnapshotResumo = {
        alunos: 0,
        funcionarios: 0,
        turmas: 0,
        notas: 0,
        recibos: 0,
        documentos: 0
      };
      try {
        const parsed = JSON.parse(dadosJson);
        resumo = {
          alunos: Array.isArray(parsed.alunos) ? parsed.alunos.length : 0,
          funcionarios: Array.isArray(parsed.funcionarios) ? parsed.funcionarios.length : 0,
          turmas: Array.isArray(parsed.turmas) ? parsed.turmas.length : 0,
          notas: (Array.isArray(parsed.notas) ? parsed.notas.length : 0) + (Array.isArray(parsed.notasConsolidadas) ? parsed.notasConsolidadas.length : 0),
          recibos: Array.isArray(parsed.recibos) ? parsed.recibos.length : 0,
          documentos: Array.isArray(parsed.biblioteca) ? parsed.biblioteca.length : 0
        };
      } catch {}

      const agoraIso = new Date().toISOString();
      const record: PeriodicSnapshotRecord = {
        id: `idb-snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        escolaId,
        escolaNome,
        criadoEm: agoraIso,
        origem,
        motivo,
        versaoApp: getAppVersion(),
        tamanhoBytes: new Blob([dadosJson]).size,
        contentSignature: signature,
        resumo,
        dadosJson
      };

      const saved = await offlineStorage.gravarSnapshotPeriodicoNoIDB(record);
      if (!saved) return null;

      try {
        localStorage.setItem('sge_last_snapshot_time', agoraIso);
      } catch {}
      const cfg = this.salvarConfig({ ultimoSnapshotEm: agoraIso });
      await this.aplicarRetencao(cfg.maxSnapshotsRetidos, escolaId);

      if (origem === 'manual' || origem === 'pre_atualizacao') {
        offlineStorage.registarMutacao(
          'Backup IndexedDB',
          'IMPORTAR',
          `${motivo} (${(record.tamanhoBytes / 1024).toFixed(1)} KB, ${resumo.alunos} alunos).`
        );
      }

      this.emitUpdated();
      return record;
    } catch (err) {
      console.warn('[PeriodicBackup] Falha ao criar snapshot no IndexedDB:', err);
      return null;
    } finally {
      this.snapshotInProgress = false;
    }
  }

  private async aplicarRetencao(maxRetidos: number, escolaId: string): Promise<void> {
    try {
      const todos = await offlineStorage.listarSnapshotsPeriodicosDoIDB<PeriodicSnapshotRecord>();
      const doEscopo = todos.filter((s) => s.escolaId === escolaId);
      if (doEscopo.length <= maxRetidos) return;
      const excedentes = doEscopo.slice(maxRetidos);
      for (const item of excedentes) {
        await offlineStorage.eliminarSnapshotPeriodicoDoIDB(item.id);
      }
    } catch {}
  }

  private triggerFileDownload(dadosJson: string, fileName: string): boolean {
    if (typeof document === 'undefined') return false;
    try {
      const blob = new Blob([dadosJson], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch {
      return false;
    }
  }

  public async exportarSnapshotJson(id: string): Promise<boolean> {
    const rec = await offlineStorage.obterSnapshotPeriodicoDoIDB<PeriodicSnapshotRecord>(id);
    if (!rec || !rec.dadosJson) return false;
    const dataStr = rec.criadoEm.slice(0, 16).replace(/[:T]/g, '-');
    const escSlug = (rec.escolaNome || rec.escolaId || 'SGE')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 28);
    const fileName = `SGE_NG_Snapshot_${escSlug}_${dataStr}.json`;
    return this.triggerFileDownload(rec.dadosJson, fileName);
  }

  public async dispararDownloadAutomaticoAgendado(motivo: string = 'Download automático agendado'): Promise<boolean> {
    const rec = await this.criarSnapshotAgora('auto_download', motivo);
    if (!rec || !rec.dadosJson) return false;
    const dataStr = rec.criadoEm.slice(0, 16).replace(/[:T]/g, '-');
    const escSlug = (rec.escolaNome || rec.escolaId || 'SGE')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 28);
    const fileName = `SGE_NG_BackupAuto_${escSlug}_${dataStr}.json`;
    const ok = this.triggerFileDownload(rec.dadosJson, fileName);
    if (ok) {
      const agoraIso = new Date().toISOString();
      this.salvarConfig({
        ultimoAutoDownloadEm: agoraIso,
        ultimoAutoDownloadNome: fileName
      });
      offlineStorage.registarMutacao('Backup Automático', 'IMPORTAR', `Transferência automática concluída: ${fileName}.`);
      this.emitUpdated();
    }
    return ok;
  }

  public async restaurarSnapshot(id: string): Promise<boolean> {
    const rec = await offlineStorage.obterSnapshotPeriodicoDoIDB<PeriodicSnapshotRecord>(id);
    if (!rec || !rec.dadosJson) return false;
    // Criar ponto de segurança antes de sobrescrever
    await this.criarSnapshotAgora('pre_atualizacao', 'Salvaguarda automática pré-restauro de snapshot');
    const ok = dbService.restaurarBackupJSON(rec.dadosJson);
    if (ok) {
      offlineStorage.registarMutacao(
        'Backup IndexedDB',
        'RESTAURO',
        `Snapshot "${rec.motivo}" (${new Date(rec.criadoEm).toLocaleString('pt-AO')}) restaurado com sucesso.`
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
      }
      this.emitUpdated();
    }
    return ok;
  }

  public async eliminarSnapshot(id: string): Promise<boolean> {
    const ok = await offlineStorage.eliminarSnapshotPeriodicoDoIDB(id);
    if (ok) this.emitUpdated();
    return ok;
  }

  private async verificarCicloAgendado(): Promise<void> {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') !== 'true') {
      return;
    }
    const cfg = this.obterConfig();
    const agoraMs = Date.now();

    if (cfg.ativado) {
      const lastSnapMs = cfg.ultimoSnapshotEm ? Date.parse(cfg.ultimoSnapshotEm) || 0 : 0;
      const intervaloMs = Math.max(5, cfg.intervaloSnapshotMinutos) * 60 * 1000;
      if (!lastSnapMs || agoraMs - lastSnapMs >= intervaloMs) {
        await this.criarSnapshotAgora(
          'automatico',
          `Snapshot periódico automático (${cfg.intervaloSnapshotMinutos} min)`
        );
      }
    }

    if (cfg.autoDownloadAtivado) {
      const lastDlMs = cfg.ultimoAutoDownloadEm ? Date.parse(cfg.ultimoAutoDownloadEm) || 0 : 0;
      const dlIntervaloMs = Math.max(1, cfg.intervaloAutoDownloadHoras) * 60 * 60 * 1000;
      if (!lastDlMs || agoraMs - lastDlMs >= dlIntervaloMs) {
        await this.dispararDownloadAutomaticoAgendado(
          `Download automático agendado (${cfg.intervaloAutoDownloadHoras}h)`
        );
      }
    }
  }

  public iniciarAgendador(): void {
    if (this.schedulerStarted || typeof window === 'undefined') return;
    this.schedulerStarted = true;

    // Hidratar eventual config gravada em IndexedDB se localStorage foi limpo
    offlineStorage.lerChaveNoIndexedDB(CONFIG_KEY).then((raw) => {
      if (raw && typeof localStorage !== 'undefined' && !localStorage.getItem(CONFIG_KEY)) {
        try {
          localStorage.setItem(CONFIG_KEY, raw);
          this.emitUpdated();
        } catch {}
      }
    }).catch(() => {});

    // Primeira verificação após hidratação inicial
    setTimeout(() => {
      this.verificarCicloAgendado().catch(() => {});
    }, 9000);

    // Verificar a cada 60 segundos
    this.schedulerInterval = setInterval(() => {
      this.verificarCicloAgendado().catch(() => {});
    }, 60 * 1000);
  }

  public pararAgendador(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.schedulerStarted = false;
  }
}

export const periodicBackupService = new PeriodicBackupService();
