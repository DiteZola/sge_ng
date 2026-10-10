import React, { useState, useEffect, useRef } from 'react';
import { Bell, Volume2, VolumeX, X, Clock, MapPin, BookOpen, AlertCircle } from 'lucide-react';
import { Escola, Funcionario, HorarioAulaItem, DiaSemana } from '../types';
import { dbService } from '../services/storage';

interface PeriodNotificationBellProps {
  escola: Escola;
  currentUser: Funcionario;
}

interface AlertaTempoAtivo {
  id: string;
  titulo: string;
  mensagem: string;
  disciplina: string;
  turma: string;
  sala: string;
  professor: string;
  tempo: number;
  horario: string;
  tipo: 'INICIO' | 'AVISO_5MIN' | 'FIM';
}

export const PeriodNotificationBell: React.FC<PeriodNotificationBellProps> = ({
  escola,
  currentUser
}) => {
  const [alerta, setAlerta] = useState<AlertaTempoAtivo | null>(null);
  const [somHabilitado, setSomHabilitado] = useState<boolean>(true);
  const [permissaoNavegador, setPermissaoNavegador] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });
  const timeoutRef = useRef<any>(null);
  const ultimosAlertasEmitidos = useRef<Set<string>>(new Set());

  // Sintetizador Web Audio API: Toque de sino escolar harmónico tubular
  const tocarSinoHarmonico = () => {
    if (!somHabilitado) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Sequência harmónica clássica de sino escolar de colégio
      const tocarNota = (frequencia: number, delayMs: number, duracao: number) => {
        setTimeout(() => {
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequencia, ctx.currentTime);

          // Envelope de ataque rápido e decaimento suave típico de sino
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duracao);
        }, delayMs);
      };

      // Carrilhão de 4 toques harmoniosos (D5, F#5, A5, D6)
      tocarNota(587.33, 0, 1.8);
      tocarNota(739.99, 300, 1.8);
      tocarNota(880.00, 600, 1.8);
      tocarNota(1174.66, 900, 2.4);
    } catch {
      // Ignora restrições do navegador se áudio estiver desabilitado
    }
  };

  // Solicitar permissão para notificações de sistema
  const solicitarPermissaoNotificacao = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setPermissaoNavegador(perm);
      } catch {
        // Fallback
      }
    }
  };

  // Exibir popup por exatamente 5 segundos e emitir som + notificação do sistema
  const dispararAlerta = (novoAlerta: AlertaTempoAtivo) => {
    // 1. Toca som harmónico
    tocarSinoHarmonico();

    // 2. Dispara pop-up visual na tela
    setAlerta(novoAlerta);

    // 3. Dispara Notificação de Sistema mesmo com tela fechada/minimizada/offline
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notif = new Notification(`🔔 ${novoAlerta.titulo}`, {
          body: `${novoAlerta.mensagem}\n${novoAlerta.disciplina} • ${novoAlerta.turma} (Sala ${novoAlerta.sala})`,
          icon: escola.logotipoUrl || escola.logotipo || '/favicon.ico',
          tag: `sge_tempo_${novoAlerta.id}`,
          silent: false
        });
        setTimeout(() => notif.close(), 5000);
      } catch {
        // Fallback silencioso
      }
    }

    // 4. Timer estrito de 5 segundos para fechar o pop-up
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setAlerta(null);
    }, 5000);
  };

  // Relógio contínuo para verificar tempos lectivos
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
      const agora = new Date();
      const diaSemanaIndex = agora.getDay();
      const diaHoje = mapaDias[diaSemanaIndex];
      if (!diaHoje) return;

      const horaAtual = agora.getHours().toString().padStart(2, '0');
      const minAtual = agora.getMinutes().toString().padStart(2, '0');
      const tempoString = `${horaAtual}:${minAtual}`;

      // Carregar horários da escola
      const horarios = dbService.obterHorarios(escola.id);

      horarios.forEach(h => {
        if (h.diaSemana !== diaHoje) return;

        // Se for professor, notificar seus tempos; se for Direção/Admin, notificar tempos gerais
        const ehMeuTempo = currentUser.role === 'Professor' 
          ? (h.professorId === currentUser.id || h.professorNome?.toLowerCase() === currentUser.nomeCompleto.toLowerCase())
          : true;

        if (!ehMeuTempo) return;

        // Calcular minutos até o início
        const [hIni, mIni] = h.horaInicio.split(':').map(Number);
        const [hFim, mFim] = h.horaFim.split(':').map(Number);
        const minutosAgora = parseInt(horaAtual, 10) * 60 + parseInt(minAtual, 10);
        const minutosInicio = hIni * 60 + mIni;
        const minutosFim = hFim * 60 + mFim;

        // 1. Toque Exato de Início
        if (minutosAgora === minutosInicio) {
          const chave = `${h.id}_INICIO_${tempoString}`;
          if (!ultimosAlertasEmitidos.current.has(chave)) {
            ultimosAlertasEmitidos.current.add(chave);
            dispararAlerta({
              id: chave,
              titulo: `Toque Oficial: Início do ${h.numeroTempo}º Tempo`,
              mensagem: `Tempo lectivo iniciado agora! Boa aula.`,
              disciplina: h.disciplinaNome,
              turma: h.turmaNome ? `${h.classe} - ${h.turmaNome}` : h.classe,
              sala: h.sala,
              professor: h.professorNome,
              tempo: h.numeroTempo,
              horario: `${h.horaInicio} - ${h.horaFim}`,
              tipo: 'INICIO'
            });
          }
        }

        // 2. Aviso prévio de 5 minutos antes
        if (minutosInicio - minutosAgora === 5) {
          const chave = `${h.id}_AVISO5_${tempoString}`;
          if (!ultimosAlertasEmitidos.current.has(chave)) {
            ultimosAlertasEmitidos.current.add(chave);
            dispararAlerta({
              id: chave,
              titulo: `Toque de Preparação: Faltam 5 Minutos`,
              mensagem: `O ${h.numeroTempo}º tempo terá início dentro de 5 minutos.`,
              disciplina: h.disciplinaNome,
              turma: h.turmaNome ? `${h.classe} - ${h.turmaNome}` : h.classe,
              sala: h.sala,
              professor: h.professorNome,
              tempo: h.numeroTempo,
              horario: `${h.horaInicio} - ${h.horaFim}`,
              tipo: 'AVISO_5MIN'
            });
          }
        }
      });
    };

    const interval = setInterval(verificarTempos, 10000); // Verifica a cada 10s
    verificarTempos();

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [escola.id, currentUser, somHabilitado]);

  return (
    <>
      {/* Botão de Controlo Rápido de Som e Notificações (Fixo Discreto no Rodapé ou Topo) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center space-x-2 no-print">
        {permissaoNavegador !== 'granted' && (
          <button
            type="button"
            onClick={solicitarPermissaoNotificacao}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-[10px] font-bold shadow-md flex items-center space-x-1 cursor-pointer animate-pulse"
            title="Ativar notificações nativas para receber avisos mesmo com sistema em segundo plano"
          >
            <Bell className="w-3 h-3" />
            <span>Ativar Avisos Sonoros</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSomHabilitado(!somHabilitado)}
          className={`p-2 rounded-full shadow-lg border transition-all cursor-pointer ${
            somHabilitado 
              ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300'
          }`}
          title={somHabilitado ? 'Sino escolar ativado com som (Clique para silenciar)' : 'Sino escolar silenciado'}
        >
          {somHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* POP-UP MODAL VISÍVEL POR EXATAMENTE 5 SEGUNDOS COM BARRA DE CONTAGEM */}
      {alerta && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border-2 border-indigo-500 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-amber-300 animate-bounce">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wide">
                    {alerta.titulo}
                  </h4>
                  <p className="text-[11px] text-gray-200 font-medium">
                    {alerta.mensagem}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlerta(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/90 rounded-xl p-2.5 space-y-1 text-xs border border-slate-700 font-sans">
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-sm truncate">{alerta.disciplina}</span>
                <span className="font-mono text-amber-400 font-bold text-[11px]">{alerta.horario}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-300">
                <span className="flex items-center space-x-1">
                  <BookOpen className="w-3 h-3 text-indigo-400" />
                  <span>{alerta.turma}</span>
                </span>
                <span className="flex items-center space-x-1 font-semibold text-emerald-400">
                  <MapPin className="w-3 h-3" />
                  <span>Sala {alerta.sala}</span>
                </span>
              </div>
              {alerta.professor && (
                <div className="text-[10px] text-gray-400 truncate pt-0.5 border-t border-slate-700/60">
                  Docente: <strong>{alerta.professor}</strong>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>SGE-NG • Notificação Oficial</span>
              <span className="italic">Auto-fecho em 5s</span>
            </div>
          </div>

          {/* Barra de Progresso de 5 segundos */}
          <div className="h-1.5 w-full bg-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400"
              style={{
                animation: 'shrinkWidth 5s linear forwards'
              }}
            />
          </div>
          <style>{`
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      )}
    </>
  );
};
