import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  X,
  Clock,
  BookOpen,
  FileEdit,
  CheckCheck,
  Trash2,
  Settings2,
  Radio,
  ArrowRight
} from 'lucide-react';
import {
  DiaSemana,
  Escola,
  Funcionario,
  NotificacaoSistemaItem,
  PreferenciasNotificacaoSW
} from '../types';
import { dbService } from '../services/storage';
import { notificationService } from '../services/notificationService';

interface PeriodNotificationBellProps {
  escola: Escola;
  currentUser: Funcionario;
  onNavigate?: (tab: string, subTab?: string) => void;
}

interface SlotTempoCalculado {
  id: string;
  turnoNome: string;
  numeroTempo: number;
  inicioMin: number;
  fimMin: number;
  inicioStr: string;
  fimStr: string;
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
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const PeriodNotificationBell: React.FC<PeriodNotificationBellProps> = ({
  escola,
  currentUser,
  onNavigate
}) => {
  const [painelAberto, setPainelAberto] = useState(false);
  const [abaPainel, setAbaPainel] = useState<'alertas' | 'config'>('alertas');
  const [toastAtivo, setToastAtivo] = useState<NotificacaoSistemaItem | null>(null);
  const [notificacoes, setNotificacoes] = useState<NotificacaoSistemaItem[]>(() =>
    notificationService.getNotificacoes(escola.id, currentUser.id)
  );
  const [prefs, setPrefs] = useState<PreferenciasNotificacaoSW>(() =>
    notificationService.getPreferencias()
  );
  const [permissaoNavegador, setPermissaoNavegador] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationService.obterEstadoPermissao()
  );
  const [swAtivo, setSwAtivo] = useState<boolean>(() => notificationService.isServiceWorkerAtivo());

  const painelRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimosAlertasTempos = useRef<Set<string>>(new Set());

  const atualizarEstado = useCallback(() => {
    setNotificacoes(notificationService.getNotificacoes(escola.id, currentUser.id));
    setPrefs(notificationService.getPreferencias());
    setPermissaoNavegador(notificationService.obterEstadoPermissao());
    setSwAtivo(notificationService.isServiceWorkerAtivo());
  }, [escola.id, currentUser.id]);

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        setPainelAberto(false);
      }
    };
    if (painelAberto) {
      document.addEventListener('mousedown', handleClickFora);
    }
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [painelAberto]);

  // Subscrever eventos de notificação e toast do notificationService
  useEffect(() => {
    atualizarEstado();

    const handleToast = (e: Event) => {
      const item = (e as CustomEvent<NotificacaoSistemaItem>).detail;
      if (!item) return;
      if (item.escolaId !== 'global' && item.escolaId !== escola.id && escola.id !== 'todas') return;
      if (item.destinatarioUserId && item.destinatarioUserId !== currentUser.id) return;

      setToastAtivo(item);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastAtivo(null);
      }, item.urgente ? 9000 : 6000);
    };

    window.addEventListener('sge_notificacoes_atualizadas', atualizarEstado);
    window.addEventListener('sge_toast_notificacao', handleToast);

    return () => {
      window.removeEventListener('sge_notificacoes_atualizadas', atualizarEstado);
      window.removeEventListener('sge_toast_notificacao', handleToast);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [escola.id, currentUser.id, atualizarEstado]);

  // Monitor contínuo de Mudança de Tempo Letivo e Término de Tempo (Horários + Turnos)
  useEffect(() => {
    const mapaDias: Record<number, DiaSemana> = {
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira',
      6: 'Sábado'
    };

    const verificarTempos = () => {
      const prefsAtuais = notificationService.getPreferencias();
      if (!prefsAtuais.notificarMudancaTempo && !prefsAtuais.notificarTerminoTempo) return;

      const agora = new Date();
      const diaHoje = mapaDias[agora.getDay()];
      if (!diaHoje) return;

      const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
      const horaAtualStr = formatMinutos(minutosAgora);
      const dataHoje = agora.toISOString().slice(0, 10);
      const iconEscola = escola.logotipoUrl || escola.logotipo || '/pwa-192x192.png';

      // 1. Verificar grelha horária detalhada da escola
      const horarios = dbService.obterHorarios(escola.id);
      const horariosHoje = horarios.filter((h) => {
        if (h.diaSemana !== diaHoje) return false;
        if (currentUser.role === 'Professor') {
          return (
            h.professorId === currentUser.id ||
            (h.professorNome && h.professorNome.toLowerCase() === currentUser.nomeCompleto.toLowerCase())
          );
        }
        return true;
      });

      const minutosComHorarioEspecifico = new Set<string>();

      horariosHoje.forEach((h) => {
        const minIni = parseMinutos(h.horaInicio);
        const minFim = parseMinutos(h.horaFim);
        if (minIni === null || minFim === null) return;

        const turmaRotulo = h.turmaNome ? `${h.classe} - ${h.turmaNome}` : h.classe;

        // A. Aviso 5 minutos antes do início / mudança de tempo
        if (prefsAtuais.notificarMudancaTempo && prefsAtuais.avisoPrevio5Min && minIni - minutosAgora === 5) {
          const chave = `${dataHoje}_${h.id}_AVISO5_${horaAtualStr}`;
          minutosComHorarioEspecifico.add(`START5_${h.numeroTempo}`);
          if (!ultimosAlertasTempos.current.has(chave)) {
            ultimosAlertasTempos.current.add(chave);
            notificationService.dispararNotificacaoSW({
              escolaId: escola.id,
              destinatarioUserId: currentUser.id,
              categoria: 'MUDANCA_TEMPO',
              titulo: `⏰ Preparação: 5 min para o ${h.numeroTempo}º Tempo`,
              mensagem: `Mudança de tempo às ${h.horaInicio}: ${h.disciplinaNome} (${turmaRotulo}).`,
              detalhes: `Sala ${h.sala} • Docente: ${h.professorNome}`,
              tagSW: `sge-tempo-pre-${h.id}-${dataHoje}`,
              icon: iconEscola,
              navegacao: { tab: 'horarios', entityId: h.id },
              dedupeKey: chave
            });
          }
        }

        // B. Mudança de tempo / Início exato
        if (prefsAtuais.notificarMudancaTempo && minutosAgora === minIni) {
          const chave = `${dataHoje}_${h.id}_INICIO_${horaAtualStr}`;
          minutosComHorarioEspecifico.add(`START_${h.numeroTempo}`);
          if (!ultimosAlertasTempos.current.has(chave)) {
            ultimosAlertasTempos.current.add(chave);
            notificationService.dispararNotificacaoSW({
              escolaId: escola.id,
              destinatarioUserId: currentUser.id,
              categoria: 'MUDANCA_TEMPO',
              titulo: `🔔 Mudança de Tempo: Início do ${h.numeroTempo}º Tempo`,
              mensagem: `${h.disciplinaNome} iniciou agora (${h.horaInicio} - ${h.horaFim}) em ${turmaRotulo}.`,
              detalhes: `Sala ${h.sala} • Docente: ${h.professorNome}`,
              tagSW: `sge-tempo-ini-${h.id}-${dataHoje}`,
              icon: iconEscola,
              navegacao: { tab: 'horarios', entityId: h.id },
              dedupeKey: chave
            });
          }
        }

        // C. Aviso 5 minutos antes do término do tempo
        if (prefsAtuais.notificarTerminoTempo && prefsAtuais.avisoPrevio5Min && minFim - minutosAgora === 5) {
          const chave = `${dataHoje}_${h.id}_FIM5_${horaAtualStr}`;
          minutosComHorarioEspecifico.add(`END5_${h.numeroTempo}`);
          if (!ultimosAlertasTempos.current.has(chave)) {
            ultimosAlertasTempos.current.add(chave);
            notificationService.dispararNotificacaoSW({
              escolaId: escola.id,
              destinatarioUserId: currentUser.id,
              categoria: 'TERMINO_TEMPO',
              titulo: `⏱️ Faltam 5 min para Término do ${h.numeroTempo}º Tempo`,
              mensagem: `A aula de ${h.disciplinaNome} (${turmaRotulo}) termina às ${h.horaFim}.`,
              detalhes: `Sala ${h.sala} • Prepare a síntese e registo do sumário.`,
              tagSW: `sge-tempo-prefim-${h.id}-${dataHoje}`,
              icon: iconEscola,
              navegacao: { tab: 'horarios', entityId: h.id },
              dedupeKey: chave
            });
          }
        }

        // D. Término exato do tempo letivo
        if (prefsAtuais.notificarTerminoTempo && minutosAgora === minFim) {
          const chave = `${dataHoje}_${h.id}_FIM_${horaAtualStr}`;
          minutosComHorarioEspecifico.add(`END_${h.numeroTempo}`);
          if (!ultimosAlertasTempos.current.has(chave)) {
            ultimosAlertasTempos.current.add(chave);
            notificationService.dispararNotificacaoSW({
              escolaId: escola.id,
              destinatarioUserId: currentUser.id,
              categoria: 'TERMINO_TEMPO',
              titulo: `⏹️ Término do ${h.numeroTempo}º Tempo Letivo`,
              mensagem: `O tempo de ${h.disciplinaNome} (${turmaRotulo}) terminou às ${h.horaFim}.`,
              detalhes: `Sala ${h.sala} • Transição de tempo / intervalo.`,
              tagSW: `sge-tempo-fim-${h.id}-${dataHoje}`,
              icon: iconEscola,
              navegacao: { tab: 'horarios', entityId: h.id },
              dedupeKey: chave
            });
          }
        }
      });

      // 2. Toques Gerais da Escola baseados nos Turnos configurados (caso não haja grelha individual no horário exato)
      const turnosAtivos = dbService.getTurnosConfigs().filter((t) => t.ativo !== false);
      const slotsGerais: SlotTempoCalculado[] = [];

      turnosAtivos.forEach((turno) => {
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
            turnoNome: turno.nome,
            numeroTempo: n,
            inicioMin: ini,
            fimMin: fim,
            inicioStr: formatMinutos(ini),
            fimStr: formatMinutos(fim)
          });

          cursor = fim + (n === metadeTempos ? intervalo : 5);
        }
      });

      slotsGerais.forEach((slot) => {
        if (prefsAtuais.notificarMudancaTempo && minutosAgora === slot.inicioMin && !minutosComHorarioEspecifico.has(`START_${slot.numeroTempo}`)) {
          const chave = `${dataHoje}_GERAL_${slot.id}_INICIO_${horaAtualStr}`;
          if (!ultimosAlertasTempos.current.has(chave)) {
            ultimosAlertasTempos.current.add(chave);
            notificationService.dispararNotificacaoSW({
              escolaId: escola.id,
              destinatarioUserId: currentUser.id,
              categoria: 'MUDANCA_TEMPO',
              titulo: `🔔 Mudança de Tempo — Turno ${slot.turnoNome} (${slot.numeroTempo}º Tempo)`,
              mensagem: `Início oficial do ${slot.numeroTempo}º tempo letivo (${slot.inicioStr} - ${slot.fimStr}).`,
              detalhes: `${escola.nomeOficial} • Sino Escolar Geral`,
              tagSW: `sge-geral-ini-${slot.id}-${dataHoje}`,
              icon: iconEscola,
              navegacao: { tab: 'horarios' },
              dedupeKey: chave
            });
          }
        }

        if (prefsAtuais.notificarTerminoTempo && minutosAgora === slot.fimMin && !minutosComHorarioEspecifico.has(`END_${slot.numeroTempo}`)) {
          const chave = `${dataHoje}_GERAL_${slot.id}_FIM_${horaAtualStr}`;
          if (!ultimosAlertasTempos.current.has(chave)) {
            ultimosAlertasTempos.current.add(chave);
            notificationService.dispararNotificacaoSW({
              escolaId: escola.id,
              destinatarioUserId: currentUser.id,
              categoria: 'TERMINO_TEMPO',
              titulo: `⏹️ Término de Tempo — Turno ${slot.turnoNome} (${slot.numeroTempo}º Tempo)`,
              mensagem: `Encerramento do ${slot.numeroTempo}º tempo letivo às ${slot.fimStr}.`,
              detalhes: `${escola.nomeOficial} • Momento de transição / intervalo`,
              tagSW: `sge-geral-fim-${slot.id}-${dataHoje}`,
              icon: iconEscola,
              navegacao: { tab: 'horarios' },
              dedupeKey: chave
            });
          }
        }
      });
    };

    const interval = setInterval(verificarTempos, 15000);
    verificarTempos();

    return () => clearInterval(interval);
  }, [escola.id, escola.logotipo, escola.logotipoUrl, escola.nomeOficial, currentUser]);

  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  const handleTogglePref = (campo: keyof PreferenciasNotificacaoSW) => {
    const atualizado = notificationService.salvarPreferencias({ [campo]: !prefs[campo] });
    setPrefs(atualizado);
  };

  const handleSolicitarPermissao = async () => {
    const res = await notificationService.solicitarPermissao();
    setPermissaoNavegador(res);
  };

  const handleAbrirNotificacao = (item: NotificacaoSistemaItem) => {
    notificationService.marcarLida(item.id);
    setPainelAberto(false);
    setToastAtivo(null);
    if (item.navegacao?.tab) {
      if (onNavigate) {
        onNavigate(item.navegacao.tab, item.navegacao.subTab);
      } else {
        notificationService.notificarNavegacao(item.navegacao);
      }
    }
  };

  const renderIconeCategoria = (cat: NotificacaoSistemaItem['categoria']) => {
    switch (cat) {
      case 'SOLICITACAO_NOTA':
        return <FileEdit className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'MENSAGEM_BIBLIOTECA':
        return <BookOpen className="w-4 h-4 text-red-600 shrink-0" />;
      case 'TERMINO_TEMPO':
        return <Clock className="w-4 h-4 text-emerald-700 shrink-0" />;
      case 'MUDANCA_TEMPO':
        return <Bell className="w-4 h-4 text-blue-600 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  return (
    <>
      {/* Botão do Centro de Notificações no Cabeçalho */}
      <div className="relative" ref={painelRef}>
        <button
          type="button"
          onClick={() => setPainelAberto((v) => !v)}
          className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
            painelAberto
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 border-gray-200'
          }`}
          title="Centro de Notificações Service Worker (Alterações de Notas, Biblioteca Urgente e Tempos Letivos)"
        >
          <Bell className={`w-4 h-4 ${naoLidasCount > 0 ? 'text-blue-700' : 'text-gray-700'}`} />
          {naoLidasCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs">
              {naoLidasCount > 9 ? '9+' : naoLidasCount}
            </span>
          )}
          {swAtivo && permissaoNavegador === 'granted' && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"
              title="Service Worker Push Ativo"
            />
          )}
        </button>

        {/* Popover Centro de Notificações */}
        {painelAberto && (
          <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-11 w-[calc(100vw-1rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* Cabeçalho do Painel */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Radio className={`w-3.5 h-3.5 ${swAtivo ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <h3 className="text-xs font-black tracking-wide uppercase">
                    Alertas Push & Service Worker
                  </h3>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  {permissaoNavegador === 'granted'
                    ? 'Notificações nativas ativas mesmo em segundo plano'
                    : 'Ative a permissão para receber alertas nativos no dispositivo'}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleTogglePref('somAtivo')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title={prefs.somAtivo ? 'Som ativo' : 'Som silenciado'}
                >
                  {prefs.somAtivo ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setAbaPainel(abaPainel === 'alertas' ? 'config' : 'alertas')}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    abaPainel === 'config' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                  title="Configurar preferências e testar alertas"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Banner de permissão do navegador */}
            {permissaoNavegador !== 'granted' && permissaoNavegador !== 'unsupported' && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-amber-900 leading-tight">
                  {permissaoNavegador === 'denied'
                    ? 'Notificações bloqueadas nas definições do navegador.'
                    : 'Ative as notificações push locais para avisos em tempo real.'}
                </span>
                {permissaoNavegador === 'default' && (
                  <button
                    type="button"
                    onClick={handleSolicitarPermissao}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black rounded-lg shrink-0 cursor-pointer"
                  >
                    Ativar Push
                  </button>
                )}
              </div>
            )}

            {abaPainel === 'config' ? (
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto text-xs">
                <div className="space-y-2">
                  <h4 className="font-black text-gray-900 uppercase text-[10px] tracking-wider">
                    Categorias de Alertas Ativos
                  </h4>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                    <span className="font-semibold text-gray-800">Solicitações de Alteração de Nota</span>
                    <input
                      type="checkbox"
                      checked={prefs.notificarSolicitacoesNota}
                      onChange={() => handleTogglePref('notificarSolicitacoesNota')}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                    <span className="font-semibold text-gray-800">Mensagens Urgentes da Biblioteca</span>
                    <input
                      type="checkbox"
                      checked={prefs.notificarBibliotecaUrgente}
                      onChange={() => handleTogglePref('notificarBibliotecaUrgente')}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                    <span className="font-semibold text-gray-800">Mudança / Início de Tempo Letivo</span>
                    <input
                      type="checkbox"
                      checked={prefs.notificarMudancaTempo}
                      onChange={() => handleTogglePref('notificarMudancaTempo')}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                    <span className="font-semibold text-gray-800">Término de Tempo Letivo</span>
                    <input
                      type="checkbox"
                      checked={prefs.notificarTerminoTempo}
                      onChange={() => handleTogglePref('notificarTerminoTempo')}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                    <span className="font-semibold text-gray-800">Aviso Prévio (5 minutos antes)</span>
                    <input
                      type="checkbox"
                      checked={prefs.avisoPrevio5Min}
                      onChange={() => handleTogglePref('avisoPrevio5Min')}
                      className="rounded text-blue-600"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <h4 className="font-black text-gray-900 uppercase text-[10px] tracking-wider">
                    Testar Alertas via Service Worker
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => notificationService.simularAlerta('SOLICITACAO_NOTA', escola, currentUser)}
                      className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] text-left cursor-pointer"
                    >
                      Alteração de Nota
                    </button>
                    <button
                      type="button"
                      onClick={() => notificationService.simularAlerta('MENSAGEM_BIBLIOTECA', escola, currentUser)}
                      className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-lg font-bold text-[11px] text-left cursor-pointer"
                    >
                      Biblioteca Urgente
                    </button>
                    <button
                      type="button"
                      onClick={() => notificationService.simularAlerta('MUDANCA_TEMPO', escola, currentUser)}
                      className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg font-bold text-[11px] text-left cursor-pointer"
                    >
                      Mudança de Tempo
                    </button>
                    <button
                      type="button"
                      onClick={() => notificationService.simularAlerta('TERMINO_TEMPO', escola, currentUser)}
                      className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[11px] text-left cursor-pointer"
                    >
                      Término de Tempo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Barra de ações do feed */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-700">
                    {naoLidasCount} não lida(s) • {notificacoes.length} total
                  </span>
                  <div className="flex items-center space-x-3">
                    {naoLidasCount > 0 && (
                      <button
                        type="button"
                        onClick={() => notificationService.marcarTodasLidas(escola.id, currentUser.id)}
                        className="text-blue-700 hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Ler todas</span>
                      </button>
                    )}
                    {notificacoes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => notificationService.limparNotificacoes(escola.id)}
                        className="text-gray-500 hover:text-red-600 font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de alertas */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notificacoes.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <Bell className="w-7 h-7 text-gray-300 mx-auto" />
                      <p className="text-xs font-semibold text-gray-600">
                        Nenhuma notificação registada neste dispositivo.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAbaPainel('config')}
                        className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        Configurar ou testar alertas SW
                      </button>
                    </div>
                  ) : (
                    notificacoes.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAbrirNotificacao(item)}
                        className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50 flex items-start space-x-3 ${
                          !item.lida
                            ? item.urgente
                              ? 'bg-red-50/60 border-l-4 border-red-600'
                              : 'bg-blue-50/50 border-l-4 border-blue-600'
                            : 'bg-white'
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                          {renderIconeCategoria(item.categoria)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-bold truncate ${!item.lida ? 'text-gray-950' : 'text-gray-700'}`}>
                              {item.titulo}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono shrink-0">
                              {new Date(item.criadaEm).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-700 mt-0.5 leading-snug">{item.mensagem}</p>
                          {item.detalhes && (
                            <p className="text-[10px] text-gray-500 mt-1 truncate">{item.detalhes}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOAST FLUTUANTE DE ALERTA IMEDIATO */}
      {toastAtivo && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-sm w-[calc(100vw-2rem)] bg-slate-900 text-white rounded-2xl shadow-2xl border-2 overflow-hidden animate-in slide-in-from-top-4 duration-300 ${
            toastAtivo.urgente ? 'border-red-500' : 'border-indigo-500'
          }`}
        >
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-2.5">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    toastAtivo.urgente ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-amber-300'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4
                    className={`text-xs font-black uppercase tracking-wide ${
                      toastAtivo.urgente ? 'text-red-300' : 'text-indigo-300'
                    }`}
                  >
                    {toastAtivo.titulo}
                  </h4>
                  <p className="text-xs text-gray-100 font-medium mt-0.5 leading-snug">
                    {toastAtivo.mensagem}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToastAtivo(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {toastAtivo.detalhes && (
              <div className="bg-slate-800/90 rounded-xl px-3 py-2 text-[11px] text-gray-300 border border-slate-700">
                {toastAtivo.detalhes}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-400">
                Service Worker • {new Date(toastAtivo.criadaEm).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {toastAtivo.navegacao?.tab && (
                <button
                  type="button"
                  onClick={() => handleAbrirNotificacao(toastAtivo)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
