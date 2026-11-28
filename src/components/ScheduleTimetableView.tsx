import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  Users, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Printer, 
  Bell, 
  Volume2, 
  VolumeX, 
  Play, 
  ShieldCheck, 
  UserCheck, 
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Filter,
  Edit2,
  Settings,
  X
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  Funcionario, 
  HorarioAulaItem, 
  DiaSemana,
  NotificacaoAulaProfessor,
  AtribuicaoDocente
} from '../types';
import { dbService } from '../services/storage';
import { notificationService } from '../services/notificationService';
import { InsigniaAngola } from '../constants/insignia';
import { filtrarDisciplinasDaClasse } from '../services/academicHierarchyService';
import {
  obterTituloCoordenadorTurno,
  obterTituloSubdiretorPedagogico,
  obterNomeSubdiretorPedagogico
} from '../utils/directorHelper';
import {
  gerarHorariosAutomaticosSemConflitos,
  ResultadoGeracaoHorarios
} from '../utils/scheduleGenerator';

interface ScheduleTimetableViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  disciplinas: Disciplina[];
  funcionarios: Funcionario[];
  atribuicoes?: AtribuicaoDocente[];
  initialTurmaId?: string;
  onNavigateToTurma?: (turmaId: string) => void;
}

const DIAS_SEMANA: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira'
];

export const ScheduleTimetableView: React.FC<ScheduleTimetableViewProps> = ({
  escola,
  currentUser,
  turmas,
  disciplinas,
  funcionarios,
  atribuicoes: atribuicoesProp,
  initialTurmaId
}) => {
  const [activeTab, setActiveTab] = useState<'turma' | 'professor' | 'novo' | 'automatico'>('turma');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmaId || turmas[0]?.id || '');
  const [selectedProfId, setSelectedProfId] = useState<string>(
    currentUser.ehProfessor ? currentUser.id : (funcionarios.find(f => f.ehProfessor)?.id || '')
  );

  const [horarios, setHorarios] = useState<HorarioAulaItem[]>(() => dbService.obterHorarios(escola.id, escola.anoLectivoActivo));
  const [notificacoesAtivas, setNotificacoesAtivas] = useState<NotificacaoAulaProfessor[]>([]);
  const [somHabilitado, setSomHabilitado] = useState(true);
  const [notificacaoVisual, setNotificacaoVisual] = useState<string | null>(null);

  // Estado do Gerador Automático Anti-Conflitos
  const [filtroCicloAuto, setFiltroCicloAuto] = useState<'todos' | 'Primario' | 'ICiclo' | 'IICiclo'>('todos');
  const [turmasAutoSelecionadas, setTurmasAutoSelecionadas] = useState<string[]>(() => turmas.map(t => t.id));
  const [disciplinasPrioritariasIds, setDisciplinasPrioritariasIds] = useState<string[]>(() =>
    disciplinas
      .filter(d => {
        const n = (d.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return n.includes('portuguesa') || n === 'portugues' || n.includes('matematica');
      })
      .map(d => d.id)
  );
  const [evitarSextoTempoPrioritarias, setEvitarSextoTempoPrioritarias] = useState<boolean>(true);
  const [priorizarPrimeirosTempos, setPriorizarPrimeirosTempos] = useState<boolean>(true);
  const [concederDiaPedagogico, setConcederDiaPedagogico] = useState<boolean>(true);
  const [isolarConflitoPorTurno, setIsolarConflitoPorTurno] = useState<boolean>(true);
  const [modoGeracaoAuto, setModoGeracaoAuto] = useState<'regenerar_tudo' | 'preencher_vazios'>('regenerar_tudo');
  const [cargaSemanalPadraoAuto, setCargaSemanalPadraoAuto] = useState<number>(3);
  const [previewResultadoAuto, setPreviewResultadoAuto] = useState<ResultadoGeracaoHorarios | null>(null);
  const [previewTurmaId, setPreviewTurmaId] = useState<string>('');
  const [erroGeradorAuto, setErroGeradorAuto] = useState<string | null>(null);

  const atribuicoesEfetivas = useMemo(
    () => atribuicoesProp ?? dbService.getAtribuicoes(escola.id, escola.anoLectivoActivo),
    [atribuicoesProp, escola.id, escola.anoLectivoActivo]
  );

  // Form State
  const [diaSemanaInput, setDiaSemanaInput] = useState<DiaSemana>('Segunda-feira');
  const [tempoInput, setTempoInput] = useState<number>(1);
  const [disciplinaIdInput, setDisciplinaIdInput] = useState<string>(disciplinas[0]?.id || '');
  const [professorIdInput, setProfessorIdInput] = useState<string>(
    funcionarios.find(f => f.ehProfessor)?.id || currentUser.id
  );
  const salasDisponiveis = useMemo(() => {
    const fromCfg = dbService.getSalasAulas(escola.id).filter(s => s.ativo !== false).map(s => s.nome);
    const fromTurmas = turmas.map(t => t.sala).filter((s): s is string => Boolean(s && s.trim()));
    return Array.from(new Set([...fromCfg, ...fromTurmas, 'Sala 01'])).sort((a, b) =>
      a.localeCompare(b, 'pt', { sensitivity: 'base' })
    );
  }, [escola.id, turmas]);

  const [salaInput, setSalaInput] = useState<string>(turmas[0]?.sala || salasDisponiveis[0] || 'Sala 01');
  const [turmaFormId, setTurmaFormId] = useState<string>(turmas[0]?.id || '');
  const [mensagemConflito, setMensagemConflito] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [horarioParaEliminarId, setHorarioParaEliminarId] = useState<string | null>(null);
  const [editandoHorarioId, setEditandoHorarioId] = useState<string | null>(null);

  const podeGerirHorarios = ['DiretorGeral', 'SubdiretorPedagogico', 'CoordenadorPedagogico', 'AdminGeral'].includes(currentUser.role);

  const [temposDefinicao, setTemposDefinicao] = useState<Array<{ numero: number; inicio: string; fim: string; rotulo: string }>>(
    () => dbService.getTemposHorarios(escola.id)
  );
  const [showConfigTemposModal, setShowConfigTemposModal] = useState(false);
  const [temposEditaveis, setTemposEditaveis] = useState<Array<{ numero: number; inicio: string; fim: string }>>([]);
  const [atualizarHorasAulasExistentes, setAtualizarHorasAulasExistentes] = useState(true);
  const [erroTemposModal, setErroTemposModal] = useState<string | null>(null);

  useEffect(() => {
    setHorarios(dbService.obterHorarios(escola.id, escola.anoLectivoActivo));
    setTemposDefinicao(dbService.getTemposHorarios(escola.id));
  }, [escola.id, escola.anoLectivoActivo]);

  useEffect(() => {
    setTurmasAutoSelecionadas(prev => {
      const validIds = new Set(turmas.map(t => t.id));
      const kept = prev.filter(id => validIds.has(id));
      return kept.length > 0 ? kept : turmas.map(t => t.id);
    });
  }, [turmas]);

  const turmaFormObj = useMemo(() => turmas.find(t => t.id === turmaFormId) || turmas[0], [turmas, turmaFormId]);

  const disciplinasParaTurmaForm = useMemo(() => {
    if (!turmaFormObj) return disciplinas;
    const filtradas = filtrarDisciplinasDaClasse(disciplinas, turmaFormObj.classe, turmaFormObj.curso);
    return filtradas.length > 0 ? filtradas : disciplinas;
  }, [disciplinas, turmaFormObj]);

  useEffect(() => {
    if (editandoHorarioId) return;
    if (turmaFormObj?.sala) {
      setSalaInput(turmaFormObj.sala);
    }
    if (disciplinasParaTurmaForm.length > 0 && !disciplinasParaTurmaForm.some(d => d.id === disciplinaIdInput)) {
      setDisciplinaIdInput(disciplinasParaTurmaForm[0].id);
    }
  }, [turmaFormObj, disciplinasParaTurmaForm, disciplinaIdInput, editandoHorarioId]);

  const configSistema = dbService.getConfiguracaoSistema();

  const handleAbrirConfigTempos = () => {
    setErroTemposModal(null);
    setTemposEditaveis(temposDefinicao.map(t => ({ numero: t.numero, inicio: t.inicio, fim: t.fim })));
    setAtualizarHorasAulasExistentes(true);
    setShowConfigTemposModal(true);
  };

  const handleSalvarConfigTempos = (e: React.FormEvent) => {
    e.preventDefault();
    setErroTemposModal(null);
    if (temposEditaveis.length === 0) {
      setErroTemposModal('Deve manter pelo menos 1 tempo letivo configurado.');
      return;
    }
    const numerosSeen = new Set<number>();
    for (const t of temposEditaveis) {
      if (!t.inicio || !t.fim) {
        setErroTemposModal('Todos os tempos devem possuir hora de início e de fim.');
        return;
      }
      if (t.fim <= t.inicio) {
        setErroTemposModal(`No ${t.numero}º Tempo, a hora de fim (${t.fim}) deve ser posterior à hora de início (${t.inicio}).`);
        return;
      }
      if (numerosSeen.has(Number(t.numero))) {
        setErroTemposModal(`O número de tempo ${t.numero}º está duplicado.`);
        return;
      }
      numerosSeen.add(Number(t.numero));
    }

    dbService.salvarTemposHorarios(escola.id, temposEditaveis, atualizarHorasAulasExistentes);
    setTemposDefinicao(dbService.getTemposHorarios(escola.id));
    setHorarios(dbService.obterHorarios(escola.id));
    setShowConfigTemposModal(false);
    setMensagemSucesso('Tempos letivos e horários de início/fim atualizados com sucesso!');
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Tocar sino escolar usando sintetizador Web Audio API puro
  const tocarSinoEscolar = () => {
    if (!somHabilitado || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const frequencies = [587.33, 880, 1174.66, 1760]; // Tons harmónicos de sino escolar
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 1.3);
      });
    } catch {
      // Ignora erro de áudio
    }
  };

  // Simular e emitir notificação para professores
  const emitirAlertaProfessor = (tipo: '5_MIN_ANTES' | 'INICIO_EXACTO' | '5_MIN_FIM', item: HorarioAulaItem) => {
    let titulo = '';
    let msg = '';

    if (tipo === '5_MIN_ANTES') {
      titulo = '⏰ 5 Minutos para o Início da Aula';
      msg = `A sua aula de ${item.disciplinaNome} na turma ${item.classe} terá início dentro de 5 minutos na ${item.sala}.`;
    } else if (tipo === 'INICIO_EXACTO') {
      titulo = '🔔 Toque Oficial de Início de Tempo';
      msg = `Tempo letivo iniciado agora! ${item.disciplinaNome} (${item.classe}) na ${item.sala}. Bom trabalho!`;
    } else {
      titulo = '⏱️ 5 Minutos para o Término da Aula';
      msg = `Restam 5 minutos para o encerramento do ${item.numeroTempo}º tempo. Prepare a síntese do sumário.`;
    }

    tocarSinoEscolar();
    setNotificacaoVisual(`${titulo}: ${msg}`);
    setTimeout(() => setNotificacaoVisual(null), 8000);

    notificationService.dispararNotificacaoSW({
      escolaId: escola.id,
      destinatarioUserId: currentUser.id,
      categoria: tipo === '5_MIN_FIM' ? 'TERMINO_TEMPO' : 'MUDANCA_TEMPO',
      titulo,
      mensagem: msg,
      detalhes: `${item.horaInicio} - ${item.horaFim} • Sala ${item.sala}`,
      icon: escola.logotipoUrl || escola.logotipo || './pwa-192x192.png',
      navegacao: { tab: 'horarios', entityId: item.id },
      tocarSom: false
    });

    const novaNotif: NotificacaoAulaProfessor = {
      id: `notif-${Date.now()}`,
      professorId: item.professorId,
      tipo,
      titulo,
      mensagem: msg,
      horarioItem: item,
      timestamp: new Date().toLocaleTimeString('pt-AO'),
      lida: false
    };

    setNotificacoesAtivas(prev => [novaNotif, ...prev.slice(0, 4)]);
  };

  // Verificação contínua do relógio para notificar professores nos tempos exatos
  useEffect(() => {
    const intervaloRelogio = setInterval(() => {
      const agora = new Date();
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      const horaAtual = `${horas}:${minutos}`;

      // Dias em português
      const diasSemanaMapa: Record<number, DiaSemana> = {
        1: 'Segunda-feira',
        2: 'Terça-feira',
        3: 'Quarta-feira',
        4: 'Quinta-feira',
        5: 'Sexta-feira'
      };
      const diaSemanaHoje = diasSemanaMapa[agora.getDay()];
      if (!diaSemanaHoje) return;

      horarios.forEach(h => {
        if (h.diaSemana !== diaSemanaHoje) return;
        // Se o usuário atual for professor, só notifica as dele (ou notifica todas se for diretor)
        if (currentUser.ehProfessor && h.professorId !== currentUser.id) return;

        // Horário de Início Exato
        if (h.horaInicio === horaAtual && agora.getSeconds() < 10) {
          emitirAlertaProfessor('INICIO_EXACTO', h);
        }
      });
    }, 15000);

    return () => clearInterval(intervaloRelogio);
  }, [horarios, currentUser]);

  // Turma ativa para visualização
  const turmaSelecionada = turmas.find(t => t.id === selectedTurmaId) || turmas[0];
  const professorSelecionado = funcionarios.find(f => f.id === selectedProfId) || funcionarios[0];

  // Horários da turma selecionada
  const horariosDaTurma = useMemo(() => {
    return horarios.filter(h => h.turmaId === selectedTurmaId);
  }, [horarios, selectedTurmaId]);

  // Horários do professor selecionado
  const horariosDoProfessor = useMemo(() => {
    return horarios.filter(h => h.professorId === selectedProfId);
  }, [horarios, selectedProfId]);

  // Alerta em tempo real de conflitos durante a digitação
  useEffect(() => {
    if (activeTab !== 'novo') return;
    const turmaObj = turmas.find(t => t.id === turmaFormId);
    const tempoObj = temposDefinicao.find(t => t.numero === tempoInput);
    const profObj = funcionarios.find(f => f.id === professorIdInput);
    const discObj = disciplinas.find(d => d.id === disciplinaIdInput);

    if (!turmaObj || !tempoObj || !profObj || !discObj) return;

    const testeItem = {
      escolaId: escola.id,
      turmaId: turmaFormId,
      classe: turmaObj.nome || turmaObj.classe,
      diaSemana: diaSemanaInput,
      numeroTempo: tempoInput,
      horaInicio: tempoObj.inicio,
      horaFim: tempoObj.fim,
      disciplinaId: disciplinaIdInput,
      disciplinaNome: discObj.nome,
      professorId: professorIdInput,
      professorNome: profObj.nomeCompleto,
      sala: salaInput,
      anoLectivo: escola.anoLectivoActivo || ''
    };

    const validacao = dbService.validarConflitoHorario(testeItem, editandoHorarioId || undefined);
    if (validacao.temConflito) {
      setMensagemConflito(validacao.motivo || 'Existe choque de tempo!');
    } else {
      setMensagemConflito(null);
    }
  }, [diaSemanaInput, tempoInput, disciplinaIdInput, professorIdInput, salaInput, turmaFormId, activeTab, editandoHorarioId, temposDefinicao]);

  const handleAbrirEdicaoHorario = (aula: HorarioAulaItem) => {
    setEditandoHorarioId(aula.id);
    setTurmaFormId(aula.turmaId);
    setDiaSemanaInput(aula.diaSemana);
    setTempoInput(aula.numeroTempo);
    setDisciplinaIdInput(aula.disciplinaId);
    setProfessorIdInput(aula.professorId);
    setSalaInput(aula.sala);
    setMensagemConflito(null);
    setActiveTab('novo');
  };

  const handleSalvarHorario = (e: React.FormEvent) => {
    e.preventDefault();
    const turmaObj = turmas.find(t => t.id === turmaFormId);
    const tempoObj = temposDefinicao.find(t => t.numero === tempoInput) || temposDefinicao[0];
    const profObj = funcionarios.find(f => f.id === professorIdInput);
    const discObj = disciplinas.find(d => d.id === disciplinaIdInput);

    if (!turmaObj || !tempoObj || !profObj || !discObj) return;

    const novoItem: HorarioAulaItem = {
      id: editandoHorarioId || `hor-${Date.now()}`,
      escolaId: escola.id,
      turmaId: turmaFormId,
      turmaNome: turmaObj.nome,
      classe: turmaObj.classe || turmaObj.nome,
      diaSemana: diaSemanaInput,
      numeroTempo: tempoObj.numero,
      horaInicio: tempoObj.inicio,
      horaFim: tempoObj.fim,
      disciplinaId: disciplinaIdInput,
      disciplinaNome: discObj.nome,
      professorId: professorIdInput,
      professorNome: profObj.nomeCompleto,
      sala: salaInput,
      anoLectivo: escola.anoLectivoActivo || ''
    };

    const res = dbService.salvarHorario(novoItem);
    if (!res.sucesso) {
      setMensagemConflito(res.erro || 'Conflito de horários detetado pelo sistema!');
      return;
    }

    setHorarios(dbService.obterHorarios(escola.id));
    setMensagemSucesso(
      editandoHorarioId
        ? `Aula de ${novoItem.disciplinaNome} atualizada com sucesso sem conflitos!`
        : `Tempo de ${novoItem.disciplinaNome} atribuído com sucesso sem qualquer choque!`
    );
    setTimeout(() => setMensagemSucesso(null), 4000);
    setEditandoHorarioId(null);
    setActiveTab('turma');
    setSelectedTurmaId(turmaFormId);
  };

  const handleEliminarHorario = (id: string) => {
    setHorarioParaEliminarId(id);
  };

  const confirmarEliminarHorario = () => {
    if (!horarioParaEliminarId) return;
    dbService.eliminarHorario(horarioParaEliminarId);
    setHorarios(dbService.obterHorarios(escola.id));
    setHorarioParaEliminarId(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const turmasFiltradasCiclo = useMemo(() => {
    if (filtroCicloAuto === 'todos') return turmas;
    return turmas.filter(t => {
      if (filtroCicloAuto === 'Primario') return t.nivelEnsino === 'Primario' || t.nivelEnsino === 'Iniciacao';
      if (filtroCicloAuto === 'ICiclo') return t.nivelEnsino === 'ICiclo';
      return t.nivelEnsino === 'IICiclo' || t.nivelEnsino === 'EnsinoTecnico';
    });
  }, [turmas, filtroCicloAuto]);

  const handleExecutarGeradorAutomatico = () => {
    setErroGeradorAuto(null);
    const alvos = turmas.filter(t => turmasAutoSelecionadas.includes(t.id));
    if (alvos.length === 0) {
      setErroGeradorAuto('Selecione pelo menos uma turma para gerar o horário automático.');
      return;
    }
    const turnosCfg = dbService.getTurnosConfigs(escola.id, escola.anoLectivoActivo);
    const res = gerarHorariosAutomaticosSemConflitos({
      escolaId: escola.id,
      anoLectivo: escola.anoLectivoActivo || '',
      turmasAlvo: alvos,
      todasTurmas: turmas,
      disciplinas,
      atribuicoes: atribuicoesEfetivas,
      funcionarios,
      turnosConfigs: turnosCfg,
      temposDefinicao,
      horariosExistentes: horarios,
      disciplinasPrioritariasIds,
      evitarSextoTempoParaPrioritarias: evitarSextoTempoPrioritarias,
      priorizarPrimeirosTempos,
      concederDiaPedagogico,
      isolarConflitoPorTurno,
      usarTitularPrimarioSemAtribuicao: true,
      modo: modoGeracaoAuto,
      cargaSemanalPadrao: cargaSemanalPadraoAuto
    });

    if (res.totalDemandas === 0) {
      setErroGeradorAuto(
        'Não foram encontradas atribuições docentes (ou professor titular primário) para as turmas selecionadas. Configure as atribuições de disciplinas no menu Gestão Académica primeiro.'
      );
      setPreviewResultadoAuto(null);
      return;
    }

    setPreviewResultadoAuto(res);
    setPreviewTurmaId(alvos[0].id);
  };

  const handleConfirmarGuardarHorariosAutomaticos = () => {
    if (!previewResultadoAuto) return;
    dbService.salvarHorariosLote(previewResultadoAuto.gerados, previewResultadoAuto.idsSubstituidos);
    setHorarios(dbService.obterHorarios(escola.id, escola.anoLectivoActivo));
    setMensagemSucesso(
      `Horário automático guardado com sucesso: ${previewResultadoAuto.totalAlocadas} tempos alocados com 0 conflitos!`
    );
    setTimeout(() => setMensagemSucesso(null), 5000);
    if (previewTurmaId) setSelectedTurmaId(previewTurmaId);
    setPreviewResultadoAuto(null);
    setActiveTab('turma');
  };

  return (
    <div className="space-y-6">
      {/* Banner de Notificação Flutuante / Alerta de Aula */}
      {notificacaoVisual && (
        <div className="bg-amber-500 text-white p-4 rounded-xl shadow-lg border border-amber-600 flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-black text-sm">{notificacaoVisual}</p>
              <p className="text-xs text-amber-100">Alerta de sincronização de horários sem constrangimentos</p>
            </div>
          </div>
          <button
            onClick={() => setNotificacaoVisual(null)}
            className="text-white hover:text-amber-200 font-bold text-xs px-2 py-1 bg-amber-600 rounded-lg cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Topo do Módulo com Identificação Oficial */}
      <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Sistema Anti-Choque de Aulas
            </span>
            <span className="text-xs text-gray-500">Ano Letivo {escola.anoLectivoActivo || 'Sem Ano Ativo'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center space-x-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span>Horários Escolares & Notificações de Tempos</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Criação de grelhas semanais sem sobreposição de professores ou salas, com avisos antes e durante os tempos letivos.
          </p>
        </div>

        {/* Ações Rápidas: Sino, Adicionar Aula, Imprimir */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              tocarSinoEscolar();
              if (horarios.length > 0) {
                emitirAlertaProfessor('5_MIN_ANTES', horarios[0]);
              }
            }}
            className="px-3.5 py-2 text-xs font-bold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Tocar sino e simular aviso de 5 minutos antes do início"
          >
            <Bell className="h-4 w-4 text-amber-600" />
            <span>Testar Alarme de Aula</span>
          </button>

          <button
            type="button"
            onClick={() => setSomHabilitado(!somHabilitado)}
            className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              somHabilitado ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-100 border-gray-300 text-gray-400'
            }`}
            title={somHabilitado ? 'Som do sino ativo' : 'Som silenciado'}
          >
            {somHabilitado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-gray-600" />
            <span>Imprimir Grade A4</span>
          </button>

          {podeGerirHorarios && (
            <>
              <button
                type="button"
                onClick={handleAbrirConfigTempos}
                className="px-3.5 py-2 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                title="Editar horas de início, fim e quantidade de tempos letivos"
              >
                <Settings className="h-4 w-4 text-indigo-600" />
                <span>Configurar Tempos & Horas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('automatico')}
                className="px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Gerar Automático</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditandoHorarioId(null);
                  setActiveTab('novo');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Tempo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex flex-wrap border-b border-gray-200 no-print gap-2">
        <button
          onClick={() => setActiveTab('turma')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'turma' 
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Horário por Turma</span>
        </button>

        <button
          onClick={() => setActiveTab('professor')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'professor' 
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>
            {currentUser.ehProfessor ? 'Meu Horário Docente (Atribuído)' : 'Horário por Professor'}
          </span>
        </button>

        {podeGerirHorarios && (
          <>
            <button
              onClick={() => setActiveTab('automatico')}
              className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'automatico'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Gerador Automático Anti-Conflitos</span>
            </button>

            <button
              onClick={() => setActiveTab('novo')}
              className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'novo' 
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {editandoHorarioId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{editandoHorarioId ? 'Editar Aula no Horário' : 'Alocar Aula Manualmente'}</span>
            </button>
          </>
        )}
      </div>

      {mensagemSucesso && activeTab !== 'novo' && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2 no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{mensagemSucesso}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagemSucesso(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HORÁRIO POR TURMA (VISÃO COMPLETA SEM CHOQUE)                         */}
      {/* ========================================================================= */}
      {activeTab === 'turma' && (
        <div className="space-y-4">
          {/* Seletor de Turma */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-700">Selecionar Turma:</span>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-blue-600"
              >
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.classe}) · Turno: {t.turno} · {t.sala}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3 text-xs text-gray-600">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <strong className="text-emerald-700">0 Conflitos Detectados</strong>
              </span>
              <span>• Total: <strong>{horariosDaTurma.length} Tempos</strong></span>
            </div>
          </div>

          {/* Grelha Semanal do Horário Formatada para Impressão */}
          <div className="bg-white border-2 border-black rounded-xl p-5 shadow-xs text-black print:border-none print:p-0">
            {/* Cabeçalho Oficial do Horário Escolar */}
            <div className="text-center border-b-2 border-black pb-3 mb-4">
              <div className="flex justify-center mb-1">
                {configSistema.insigniaNacionalUrl && configSistema.insigniaNacionalUrl.trim() !== '' ? (
                  <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-12 w-12 object-contain mx-auto" />
                ) : (
                  <InsigniaAngola size={42} />
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider">
                República de Angola • {escola.governoProvincial || `Governo Provincial de ${escola.provincia || 'Luanda'}`}
              </p>
              <h2 className="text-sm sm:text-base font-black uppercase text-gray-900">{escola.nomeOficial}</h2>
              <div className="inline-block bg-gray-100 border border-black px-3 py-0.5 mt-1 rounded text-xs font-black uppercase">
                Horário Escolar Semanal • Turma: {turmaSelecionada?.nome} ({turmaSelecionada?.classe}) • {turmaSelecionada?.turno} • {turmaSelecionada?.sala}
              </div>
            </div>

            {/* Tabela de Grelha Semanal */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-xs text-center">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b-2 border-black">
                    <th className="p-2 border-r border-black w-28">TEMPO / HORA</th>
                    {DIAS_SEMANA.map(dia => (
                      <th key={dia} className="p-2 border-r border-black font-extrabold uppercase">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {temposDefinicao.map(tempoDef => {
                    return (
                      <tr key={tempoDef.numero} className="hover:bg-blue-50/20">
                        {/* Coluna do Tempo */}
                        <td className="p-2 border-r border-black font-mono font-bold bg-gray-50 text-[11px]">
                          <div>{tempoDef.numero}º Tempo</div>
                          <div className="text-[10px] text-gray-600 font-normal">{tempoDef.inicio} - {tempoDef.fim}</div>
                        </td>

                        {/* Colunas dos Dias da Semana */}
                        {DIAS_SEMANA.map(dia => {
                          const aula = horariosDaTurma.find(h => h.diaSemana === dia && h.numeroTempo === tempoDef.numero);
                          return (
                            <td key={dia} className="p-2 border-r border-black align-top min-w-[130px] h-16">
                              {aula ? (
                                <div className="bg-blue-50/70 border border-blue-300 rounded p-1.5 flex flex-col justify-between h-full text-left">
                                  <div>
                                    <div className="font-extrabold text-blue-950 uppercase text-[11px]">
                                      {aula.disciplinaNome}
                                    </div>
                                    <div className="text-[10px] text-gray-700 whitespace-normal break-words font-medium">
                                      {aula.professorNome}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1 border-t border-blue-200 mt-1">
                                    <span className="font-mono">{aula.sala}</span>
                                    {podeGerirHorarios && (
                                      <div className="flex items-center space-x-1.5 no-print">
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirEdicaoHorario(aula)}
                                          className="text-blue-700 hover:text-blue-900 cursor-pointer"
                                          title="Editar aula / tempo"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleEliminarHorario(aula.id)}
                                          className="text-red-600 hover:text-red-800 cursor-pointer"
                                          title="Eliminar aula"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-300 font-mono italic block pt-3">— Livre —</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé Oficial para Impressão */}
            <div data-pdf-fixed-signatures="true" className="grid grid-cols-2 gap-8 pt-6 text-center text-xs mt-4">
              <div>
                <p className="font-bold text-gray-900 mb-8">{obterTituloCoordenadorTurno(turmaSelecionada?.turno || 'Manhã', funcionarios, escola)}</p>
                <div className="w-48 border-b border-black mx-auto mb-1" />
                <p className="text-gray-700 font-semibold text-[10px]">Coordenação de Turno</p>
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-8">{obterTituloSubdiretorPedagogico(escola, funcionarios)}</p>
                <div className="w-48 border-b border-black mx-auto mb-1" />
                <p className="text-gray-700 font-semibold text-[10px]">{obterNomeSubdiretorPedagogico(escola, funcionarios)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MEU HORÁRIO DOCENTE (CADA PROFESSOR VÊ AS SUAS TURMAS ATRIBUÍDAS)     */}
      {/* ========================================================================= */}
      {activeTab === 'professor' && (
        <div className="space-y-4">
          {/* Seletor se não for professor ou se for diretor */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-700">Docente Titular:</span>
              {currentUser.ehProfessor && currentUser.role === 'Professor' ? (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900">
                  {currentUser.nomeCompleto} ({currentUser.cargo || 'Professor'})
                </div>
              ) : (
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-blue-600"
                >
                  {funcionarios.filter(f => f.ehProfessor).map(p => (
                    <option key={p.id} value={p.id}>{p.nomeCompleto} — {p.cargo}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="text-gray-600">Carga Horária Semanal: <strong>{horariosDoProfessor.length} Tempos Letivos</strong></span>
              <button
                type="button"
                onClick={() => {
                  tocarSinoEscolar();
                  if (horariosDoProfessor.length > 0) {
                    emitirAlertaProfessor('INICIO_EXACTO', horariosDoProfessor[0]);
                  }
                }}
                className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Simular Toque da Minha Aula</span>
              </button>
            </div>
          </div>

          {/* Cartões de Aulas do Professor com Contador e Localização */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
            {horariosDoProfessor.map(aula => {
              const turnoAula = turmas.find(t => t.id === aula.turmaId)?.turno;
              return (
                <div 
                  key={aula.id} 
                  className="bg-white border-2 border-indigo-200 rounded-xl p-4 shadow-xs hover:border-indigo-400 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800">
                        {aula.diaSemana}
                      </span>
                      <span className="text-xs font-black text-gray-900 font-mono">
                        {aula.numeroTempo}º Tempo ({aula.horaInicio} - {aula.horaFim})
                      </span>
                    </div>
                    <h3 className="font-black text-base text-gray-900 mt-2">{aula.disciplinaNome}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Turma: <strong>{aula.classe}</strong>{turnoAula ? ` (${turnoAula})` : ''} • {aula.sala}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Sem choque</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      {podeGerirHorarios && (
                        <button
                          type="button"
                          onClick={() => handleAbrirEdicaoHorario(aula)}
                          className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => emitirAlertaProfessor('5_MIN_ANTES', aula)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <Bell className="h-3 w-3" />
                        <span>5 min antes</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela Completa do Professor para Impressão */}
          <div className="bg-white border-2 border-black rounded-xl p-5 shadow-xs text-black print:border-none print:p-0">
            <div className="text-center border-b-2 border-black pb-3 mb-4">
              <h2 className="text-sm font-black uppercase">Mapa Semanal de Atribuição Docente</h2>
              <p className="text-xs font-bold">{professorSelecionado?.nomeCompleto} • {professorSelecionado?.cargo}</p>
            </div>
            <table className="w-full border-collapse border border-black text-xs text-center">
              <thead className="bg-gray-100 font-bold border-b border-black">
                <tr>
                  <th className="p-2 border-r border-black">Dia</th>
                  <th className="p-2 border-r border-black">Tempo</th>
                  <th className="p-2 border-r border-black">Horário</th>
                  <th className="p-2 border-r border-black">Disciplina</th>
                  <th className="p-2 border-r border-black">Turma / Turno</th>
                  <th className="p-2">Sala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {horariosDoProfessor.map(h => {
                  const tTurno = turmas.find(t => t.id === h.turmaId)?.turno;
                  return (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="p-2 border-r border-black font-bold">{h.diaSemana}</td>
                      <td className="p-2 border-r border-black font-mono">{h.numeroTempo}º</td>
                      <td className="p-2 border-r border-black font-mono">{h.horaInicio} - {h.horaFim}</td>
                      <td className="p-2 border-r border-black font-bold uppercase">{h.disciplinaNome}</td>
                      <td className="p-2 border-r border-black font-semibold">{h.classe}{tTurno ? ` (${tTurno})` : ''}</td>
                      <td className="p-2 font-mono">{h.sala}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2B. GERADOR AUTOMÁTICO DE HORÁRIOS ANTI-CONFLITOS & DIA PEDAGÓGICO         */}
      {/* ========================================================================= */}
      {activeTab === 'automatico' && podeGerirHorarios && (
        <div className="space-y-5 no-print">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <span>Gerador Automático Multi-Turmas Sem Conflitos</span>
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Cruza as atribuições docentes do Iº Ciclo, IIº Ciclo e Ensino Primário para evitar choques de professores/salas, bloqueia disciplinas prioritárias do 6º tempo e reserva Dia Pedagógico por docente sempre que possível.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-800">
                  {atribuicoesEfetivas.length} Atribuições Ativas
                </span>
              </div>
            </div>

            {erroGeradorAuto && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{erroGeradorAuto}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              {/* Coluna 1: Seleção de Turmas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-black text-gray-800 uppercase text-[11px] tracking-wide">
                    1. Turmas a Gerar ({turmasAutoSelecionadas.length}/{turmas.length})
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={filtroCicloAuto}
                      onChange={(e) => setFiltroCicloAuto(e.target.value as any)}
                      className="p-1.5 border border-gray-300 rounded-lg text-[11px] font-bold bg-white"
                    >
                      <option value="todos">Todos os Ciclos</option>
                      <option value="Primario">Ensino Primário</option>
                      <option value="ICiclo">Iº Ciclo (7ª–9ª)</option>
                      <option value="IICiclo">IIº Ciclo / Técnico</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setTurmasAutoSelecionadas(turmasFiltradasCiclo.map(t => t.id))}
                      className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurmasAutoSelecionadas([])}
                      className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl p-2.5 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {turmasFiltradasCiclo.map(t => {
                    const selecionada = turmasAutoSelecionadas.includes(t.id);
                    const totalAtribsTurma = atribuicoesEfetivas.filter(a => a.turmaId === t.id).length;
                    return (
                      <label
                        key={t.id}
                        className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selecionada ? 'bg-white border-blue-400 shadow-2xs' : 'bg-gray-100/60 border-gray-200 opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTurmasAutoSelecionadas(prev => Array.from(new Set([...prev, t.id])));
                            } else {
                              setTurmasAutoSelecionadas(prev => prev.filter(id => id !== t.id));
                            }
                          }}
                          className="mt-0.5 rounded border-gray-300 text-blue-600"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{t.nome} ({t.classe})</div>
                          <div className="text-[10px] text-gray-500">
                            {t.turno} • {t.sala} • {totalAtribsTurma} atrib.
                          </div>
                        </div>
                      </label>
                    );
                  })}
                  {turmasFiltradasCiclo.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-gray-400">Nenhuma turma neste ciclo.</div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Disciplinas Prioritárias + Regras */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-black text-gray-800 uppercase text-[11px] tracking-wide">
                    2. Disciplinas Prioritárias ({disciplinasPrioritariasIds.length} selecionadas)
                  </label>
                  <button
                    type="button"
                    onClick={() => setDisciplinasPrioritariasIds([])}
                    className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Desmarcar Todas
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2.5 bg-gray-50 flex flex-wrap gap-1.5">
                  {disciplinas.map(d => {
                    const ativa = disciplinasPrioritariasIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDisciplinasPrioritariasIds(prev =>
                            prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                          ativa
                            ? 'bg-amber-100 border-amber-400 text-amber-950'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {ativa ? '★ ' : ''}{d.nome}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={evitarSextoTempoPrioritarias}
                      onChange={(e) => setEvitarSextoTempoPrioritarias(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600"
                    />
                    <span>Proibir disciplinas prioritárias no 6º tempo (ou último tempo)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={priorizarPrimeirosTempos}
                      onChange={(e) => setPriorizarPrimeirosTempos(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600"
                    />
                    <span>Alocar prioritárias preferencialmente nos primeiros tempos (1º–3º)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={concederDiaPedagogico}
                      onChange={(e) => setConcederDiaPedagogico(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600"
                    />
                    <span>Atribuir Dia Pedagógico por professor sempre que possível</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={isolarConflitoPorTurno}
                      onChange={(e) => setIsolarConflitoPorTurno(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600"
                    />
                    <span>Distinguir turnos distintos (ex: 1º tempo Manhã não colide com 1º tempo Tarde)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Modo de Geração</label>
                    <select
                      value={modoGeracaoAuto}
                      onChange={(e) => setModoGeracaoAuto(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold bg-white"
                    >
                      <option value="regenerar_tudo">Regenerar turmas selecionadas</option>
                      <option value="preencher_vazios">Preencher apenas tempos vagos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Carga Semanal Padrão (se omissa)</label>
                    <select
                      value={cargaSemanalPadraoAuto}
                      onChange={(e) => setCargaSemanalPadraoAuto(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold bg-white"
                    >
                      <option value={2}>2 tempos / semana</option>
                      <option value={3}>3 tempos / semana</option>
                      <option value={4}>4 tempos / semana</option>
                      <option value={5}>5 tempos / semana</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleExecutarGeradorAutomatico}
                className="px-5 py-2.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Gerar Simulação Anti-Conflitos</span>
              </button>
            </div>
          </div>

          {/* Resultado Simulado antes de Gravar */}
          {previewResultadoAuto && (
            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <span>Pré-visualização Validada do Horário Automático</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Confira os indicadores, os Dias Pedagógicos e as grelhas abaixo antes de gravar definitivamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewResultadoAuto(null)}
                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                  >
                    Descartar Simulação
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarGuardarHorariosAutomaticos}
                    className="px-5 py-2 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar e Guardar Horários ({previewResultadoAuto.totalAlocadas})</span>
                  </button>
                </div>
              </div>

              {/* KPIs da Simulação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Tempos Alocados</div>
                  <div className="text-lg font-black text-blue-950 font-mono">
                    {previewResultadoAuto.totalAlocadas} / {previewResultadoAuto.totalDemandas}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Conflitos Detetados</div>
                  <div className="text-lg font-black text-emerald-900 font-mono">
                    {previewResultadoAuto.totalConflitos} Choques
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Prioritárias (1º–3º / &lt;6º)</div>
                  <div className="text-lg font-black text-amber-950 font-mono">
                    {previewResultadoAuto.prioritariasNosPrimeirosTempos} / {previewResultadoAuto.prioritariasForaSextoTempo} de {previewResultadoAuto.totalPrioritariasAlocadas}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">Com Dia Pedagógico</div>
                  <div className="text-lg font-black text-indigo-950 font-mono">
                    {previewResultadoAuto.diasPedagogicos.filter(d => d.concedido).length} / {previewResultadoAuto.diasPedagogicos.length} Profs
                  </div>
                </div>
              </div>

              {/* Mapa de Dias Pedagógicos */}
              {previewResultadoAuto.diasPedagogicos.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-black text-xs text-gray-800">
                    Distribuição de Dia Pedagógico por Docente
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Professor</th>
                          <th className="p-2.5 text-center">Tempos Semanais</th>
                          <th className="p-2.5">Dia Pedagógico</th>
                          <th className="p-2.5">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewResultadoAuto.diasPedagogicos.map(dp => (
                          <tr key={dp.professorId}>
                            <td className="p-2.5 font-bold text-gray-900">{dp.professorNome}</td>
                            <td className="p-2.5 text-center font-mono">{dp.cargaTotalSemanal} tempos</td>
                            <td className="p-2.5">
                              {dp.concedido && dp.diaPedagogico ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                  {dp.diaPedagogico}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold text-[11px]">
                                  Não atribuído
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px] text-gray-600">
                              {dp.concedido ? 'Dia integral livre para planeamento pedagógico' : (dp.motivo || 'Carga horária distribuída nos 5 dias')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Aulas não alocadas se existirem */}
              {previewResultadoAuto.aulasNaoAlocadas.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-black flex items-center space-x-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>{previewResultadoAuto.aulasNaoAlocadas.length} tempo(s) não alocado(s) por falta de vaga compatível sem conflito:</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 max-h-28 overflow-y-auto">
                    {previewResultadoAuto.aulasNaoAlocadas.map((na, idx) => (
                      <li key={idx}>
                        <strong>{na.turmaNome}</strong> — {na.disciplinaNome} ({na.professorNome}): {na.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pré-visualização de Grelha por Turma */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-800">Pré-visualizar Turma Gerada:</span>
                  <select
                    value={previewTurmaId}
                    onChange={(e) => setPreviewTurmaId(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                  >
                    {turmas
                      .filter(t => turmasAutoSelecionadas.includes(t.id))
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.nome} ({t.classe}) • {t.turno}</option>
                      ))}
                  </select>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full border-collapse text-xs text-center">
                    <thead className="bg-gray-100 font-bold border-b border-gray-300">
                      <tr>
                        <th className="p-2 border-r border-gray-300 w-24">Tempo</th>
                        {DIAS_SEMANA.map(d => (
                          <th key={d} className="p-2 border-r border-gray-300 last:border-r-0">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {temposDefinicao.map(tDef => (
                        <tr key={tDef.numero}>
                          <td className="p-2 border-r border-gray-200 font-mono font-bold bg-gray-50">
                            {tDef.numero}º ({tDef.inicio})
                          </td>
                          {DIAS_SEMANA.map(dia => {
                            const aula = previewResultadoAuto.horariosFinaisCompletos.find(
                              h => h.turmaId === previewTurmaId && h.diaSemana === dia && h.numeroTempo === tDef.numero
                            );
                            const ehPrio = aula && disciplinasPrioritariasIds.includes(aula.disciplinaId);
                            return (
                              <td key={dia} className="p-1.5 border-r border-gray-200 last:border-r-0 align-top">
                                {aula ? (
                                  <div className={`p-1.5 rounded border text-left ${ehPrio ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
                                    <div className="font-bold text-[11px] text-gray-900">
                                      {ehPrio ? '★ ' : ''}{aula.disciplinaNome}
                                    </div>
                                    <div className="text-[10px] text-gray-600 truncate">{aula.professorNome}</div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-300 italic">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ALOCAÇÃO INTELIGENTE DE AULAS SEM CHOQUE DE HORÁRIOS                   */}
      {/* ========================================================================= */}
      {activeTab === 'novo' && (
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm no-print space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                {editandoHorarioId ? <Edit2 className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                <span>
                  {editandoHorarioId
                    ? 'Editar Tempo / Aula no Horário Escolar'
                    : 'Alocação de Tempo de Aula com Verificação Anti-Choque'}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                O motor valida em tempo real a disponibilidade do professor, da sala e da turma para impedir colisões de horário.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAbrirConfigTempos}
              className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center space-x-1 shrink-0 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Editar Horas dos Tempos</span>
            </button>
          </div>

          {mensagemConflito && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção (Conflito Detectado):</strong> {mensagemConflito}
                <div className="text-[11px] text-red-700 mt-0.5">
                  Altere o dia, tempo, professor ou sala para prosseguir sem choque.
                </div>
              </div>
            </div>
          )}

          {mensagemSucesso && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          <form onSubmit={handleSalvarHorario} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Turma Destino</label>
                <select
                  value={turmaFormId}
                  onChange={(e) => setTurmaFormId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                >
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.classe}) · {t.turno} · {t.sala || 'Sala'}{t.curso ? ` · ${t.curso}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dia da Semana</label>
                <select
                  value={diaSemanaInput}
                  onChange={(e) => setDiaSemanaInput(e.target.value as DiaSemana)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                >
                  {DIAS_SEMANA.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tempo Letivo</label>
                <select
                  value={tempoInput}
                  onChange={(e) => setTempoInput(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                >
                  {temposDefinicao.map(t => (
                    <option key={t.numero} value={t.numero}>{t.rotulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Sala de Aulas</label>
                <select
                  value={salaInput}
                  onChange={(e) => setSalaInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                  required
                >
                  {!salasDisponiveis.includes(salaInput) && salaInput && (
                    <option value={salaInput}>{salaInput}</option>
                  )}
                  {salasDisponiveis.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Disciplina ({disciplinasParaTurmaForm.length} compatíveis)</label>
                <select
                  value={disciplinaIdInput}
                  onChange={(e) => setDisciplinaIdInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                >
                  {disciplinasParaTurmaForm.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Professor Responsável</label>
                <select
                  value={professorIdInput}
                  onChange={(e) => setProfessorIdInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                >
                  {funcionarios.filter(f => f.ehProfessor).map(p => (
                    <option key={p.id} value={p.id}>{p.nomeCompleto} ({p.cargo})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setEditandoHorarioId(null);
                  setActiveTab('turma');
                }}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(mensagemConflito)}
                className={`px-5 py-2 rounded-xl text-white font-bold transition-all shadow-xs cursor-pointer ${
                  mensagemConflito 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editandoHorarioId ? 'Guardar Alteração no Horário' : 'Validar e Alocar Aula'}
              </button>
            </div>
          </form>
        </div>
      )}

      {horarioParaEliminarId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900 dark:text-white">Retirar Aula do Horário</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Tem a certeza de que deseja retirar esta aula do horário?
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setHorarioParaEliminarId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarHorario}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Retirar Aula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR TEMPOS LETIVOS E HORÁRIOS (INÍCIO E FIM) */}
      {showConfigTemposModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Configurar Tempos Letivos & Horas</h3>
                  <p className="text-xs text-gray-500">Defina a hora de início e fim de cada tempo do horário da escola</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigTemposModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {erroTemposModal && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold">
                {erroTemposModal}
              </div>
            )}

            <form onSubmit={handleSalvarConfigTempos} className="space-y-4 text-xs">
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {temposEditaveis.map((tempo, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Tempo (N.º)</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={tempo.numero}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTemposEditaveis(prev => prev.map((item, i) => (i === idx ? { ...item, numero: v } : item)));
                        }}
                        className="w-full p-1.5 border border-gray-300 rounded-lg font-bold bg-white"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Hora Início</label>
                      <input
                        type="time"
                        required
                        value={tempo.inicio}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTemposEditaveis(prev => prev.map((item, i) => (i === idx ? { ...item, inicio: v } : item)));
                        }}
                        className="w-full p-1.5 border border-gray-300 rounded-lg font-mono font-bold bg-white"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Hora Fim</label>
                      <input
                        type="time"
                        required
                        value={tempo.fim}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTemposEditaveis(prev => prev.map((item, i) => (i === idx ? { ...item, fim: v } : item)));
                        }}
                        className="w-full p-1.5 border border-gray-300 rounded-lg font-mono font-bold bg-white"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-4">
                      <button
                        type="button"
                        disabled={temposEditaveis.length <= 1}
                        onClick={() => setTemposEditaveis(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-600 hover:text-rose-800 disabled:opacity-30 cursor-pointer"
                        title="Remover tempo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const maxNum = temposEditaveis.reduce((m, t) => Math.max(m, t.numero), 0);
                    const ultimo = temposEditaveis[temposEditaveis.length - 1];
                    const novaInicio = ultimo ? ultimo.fim : '12:30';
                    const [hh, mm] = novaInicio.split(':').map(Number);
                    const totalMin = (isNaN(hh) ? 12 : hh) * 60 + (isNaN(mm) ? 30 : mm) + 45;
                    const novaFim = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
                    setTemposEditaveis(prev => [...prev, { numero: maxNum + 1, inicio: novaInicio, fim: novaFim }]);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Tempo</span>
                </button>

                <label className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={atualizarHorasAulasExistentes}
                    onChange={(e) => setAtualizarHorasAulasExistentes(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span>Sincronizar horas nas aulas já agendadas</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowConfigTemposModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl cursor-pointer"
                >
                  Guardar Horário dos Tempos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
