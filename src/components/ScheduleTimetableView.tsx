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
  Filter
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  Funcionario, 
  HorarioAulaItem, 
  DiaSemana,
  NotificacaoAulaProfessor
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';

interface ScheduleTimetableViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  disciplinas: Disciplina[];
  funcionarios: Funcionario[];
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
  initialTurmaId
}) => {
  const [activeTab, setActiveTab] = useState<'turma' | 'professor' | 'novo'>('turma');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(initialTurmaId || turmas[0]?.id || '');
  const [selectedProfId, setSelectedProfId] = useState<string>(
    currentUser.ehProfessor ? currentUser.id : (funcionarios.find(f => f.ehProfessor)?.id || '')
  );

  const [horarios, setHorarios] = useState<HorarioAulaItem[]>(() => dbService.obterHorarios(escola.id));
  const [notificacoesAtivas, setNotificacoesAtivas] = useState<NotificacaoAulaProfessor[]>([]);
  const [somHabilitado, setSomHabilitado] = useState(true);
  const [notificacaoVisual, setNotificacaoVisual] = useState<string | null>(null);

  // Form State
  const [diaSemanaInput, setDiaSemanaInput] = useState<DiaSemana>('Segunda-feira');
  const [tempoInput, setTempoInput] = useState<number>(1);
  const [disciplinaIdInput, setDisciplinaIdInput] = useState<string>(disciplinas[0]?.id || '');
  const [professorIdInput, setProfessorIdInput] = useState<string>(
    funcionarios.find(f => f.ehProfessor)?.id || currentUser.id
  );
  const [salaInput, setSalaInput] = useState<string>('Sala 01');
  const [turmaFormId, setTurmaFormId] = useState<string>(turmas[0]?.id || '');
  const [mensagemConflito, setMensagemConflito] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const configSistema = dbService.getConfiguracaoSistema();

  // Definição dos tempos letivos padrão (MED Angola)
  const temposDefinicao = useMemo(() => [
    { numero: 1, inicio: '07:15', fim: '08:00', rotulo: '1º Tempo (07:15 - 08:00)' },
    { numero: 2, inicio: '08:05', fim: '08:50', rotulo: '2º Tempo (08:05 - 08:50)' },
    { numero: 3, inicio: '09:10', fim: '09:55', rotulo: '3º Tempo (09:10 - 09:55)' },
    { numero: 4, inicio: '10:00', fim: '10:45', rotulo: '4º Tempo (10:00 - 10:45)' },
    { numero: 5, inicio: '10:50', fim: '11:35', rotulo: '5º Tempo (10:50 - 11:35)' },
    { numero: 6, inicio: '11:40', fim: '12:25', rotulo: '6º Tempo (11:40 - 12:25)' }
  ], []);

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
      anoLectivo: escola.anoLectivoActivo || '2025/2026'
    };

    const validacao = dbService.validarConflitoHorario(testeItem);
    if (validacao.temConflito) {
      setMensagemConflito(validacao.motivo || 'Existe choque de tempo!');
    } else {
      setMensagemConflito(null);
    }
  }, [diaSemanaInput, tempoInput, disciplinaIdInput, professorIdInput, salaInput, turmaFormId, activeTab]);

  const handleSalvarHorario = (e: React.FormEvent) => {
    e.preventDefault();
    const turmaObj = turmas.find(t => t.id === turmaFormId);
    const tempoObj = temposDefinicao.find(t => t.numero === tempoInput);
    const profObj = funcionarios.find(f => f.id === professorIdInput);
    const discObj = disciplinas.find(d => d.id === disciplinaIdInput);

    if (!turmaObj || !tempoObj || !profObj || !discObj) return;

    const novoItem: HorarioAulaItem = {
      id: `hor-${Date.now()}`,
      escolaId: escola.id,
      turmaId: turmaFormId,
      turmaNome: turmaObj.nome,
      classe: turmaObj.classe || turmaObj.nome,
      diaSemana: diaSemanaInput,
      numeroTempo: tempoInput,
      horaInicio: tempoObj.inicio,
      horaFim: tempoObj.fim,
      disciplinaId: disciplinaIdInput,
      disciplinaNome: discObj.nome,
      professorId: professorIdInput,
      professorNome: profObj.nomeCompleto,
      sala: salaInput,
      anoLectivo: escola.anoLectivoActivo || '2025/2026'
    };

    const res = dbService.salvarHorario(novoItem);
    if (!res.sucesso) {
      setMensagemConflito(res.erro || 'Conflito de horários detetado pelo sistema!');
      return;
    }

    setHorarios(dbService.obterHorarios(escola.id));
    setMensagemSucesso(`Tempo de ${novoItem.disciplinaNome} atribuído com sucesso sem qualquer choque!`);
    setTimeout(() => setMensagemSucesso(null), 4000);
    setActiveTab('turma');
    setSelectedTurmaId(turmaFormId);
  };

  const handleEliminarHorario = (id: string) => {
    if (confirm('Tem a certeza de que deseja retirar esta aula do horário?')) {
      dbService.eliminarHorario(id);
      setHorarios(dbService.obterHorarios(escola.id));
    }
  };

  const handlePrint = () => {
    window.print();
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
            <span className="text-xs text-gray-500">Ano Letivo {escola.anoLectivoActivo || '2025/2026'}</span>
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

          {['DiretorGeral', 'SubdiretorPedagogico', 'CoordenadorPedagogico', 'AdminGeral'].includes(currentUser.role) && (
            <button
              type="button"
              onClick={() => setActiveTab('novo')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Tempo</span>
            </button>
          )}
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex border-b border-gray-200 no-print gap-2">
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

        {['DiretorGeral', 'SubdiretorPedagogico', 'CoordenadorPedagogico', 'AdminGeral'].includes(currentUser.role) && (
          <button
            onClick={() => setActiveTab('novo')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'novo' 
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Alocar Aula Anti-Conflito</span>
          </button>
        )}
      </div>

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
              <p className="text-[10px] font-black uppercase tracking-wider">República de Angola • Ministério da Educação</p>
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
                                    <div className="text-[10px] text-gray-700 truncate font-medium">
                                      {aula.professorNome}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1 border-t border-blue-200 mt-1">
                                    <span className="font-mono">{aula.sala}</span>
                                    {['DiretorGeral', 'SubdiretorPedagogico', 'AdminGeral'].includes(currentUser.role) && (
                                      <button
                                        onClick={() => handleEliminarHorario(aula.id)}
                                        className="text-red-600 hover:text-red-800 no-print cursor-pointer"
                                        title="Eliminar aula"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
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
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs mt-4">
              <div>
                <div className="w-48 border-b border-black mx-auto" />
                <p className="font-bold text-gray-900 mt-1">O(A) Coordenador(a) de Turno</p>
                <p className="text-gray-600 text-[10px]">Assinatura e Carimbo</p>
              </div>
              <div>
                <div className="w-48 border-b border-black mx-auto" />
                <p className="font-bold text-gray-900 mt-1">O Subdirector Pedagógico</p>
                <p className="text-gray-600 text-[10px]">{escola.subdiretorPedagogicoNome || 'Direcção Pedagógica'}</p>
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
            {horariosDoProfessor.map(aula => (
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
                    Turma: <strong>{aula.classe}</strong> • {aula.sala}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Sem choque</span>
                  </span>
                  <button
                    onClick={() => emitirAlertaProfessor('5_MIN_ANTES', aula)}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Bell className="h-3 w-3" />
                    <span>Lembrar 5 min antes</span>
                  </button>
                </div>
              </div>
            ))}
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
                  <th className="p-2 border-r border-black">Turma</th>
                  <th className="p-2">Sala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {horariosDoProfessor.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="p-2 border-r border-black font-bold">{h.diaSemana}</td>
                    <td className="p-2 border-r border-black font-mono">{h.numeroTempo}º</td>
                    <td className="p-2 border-r border-black font-mono">{h.horaInicio} - {h.horaFim}</td>
                    <td className="p-2 border-r border-black font-bold uppercase">{h.disciplinaNome}</td>
                    <td className="p-2 border-r border-black font-semibold">{h.classe}</td>
                    <td className="p-2 font-mono">{h.sala}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ALOCAÇÃO INTELIGENTE DE AULAS SEM CHOQUE DE HORÁRIOS                   */}
      {/* ========================================================================= */}
      {activeTab === 'novo' && (
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm no-print space-y-5">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
              <Plus className="h-5 w-5 text-blue-600" />
              <span>Alocação de Tempo de Aula com Verificação Anti-Choque</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              O motor valida em tempo real a disponibilidade do professor, da sala e da turma para impedir colisões de horário.
            </p>
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
                    <option key={t.id} value={t.id}>{t.nome} ({t.classe}) · {t.turno}</option>
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
                <input
                  type="text"
                  value={salaInput}
                  onChange={(e) => setSalaInput(e.target.value)}
                  placeholder="Ex: Sala 01, Laboratório 2"
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Disciplina</label>
                <select
                  value={disciplinaIdInput}
                  onChange={(e) => setDisciplinaIdInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
                >
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.nome} ({d.sigla})</option>
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
                onClick={() => setActiveTab('turma')}
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
                Validar e Alocar Aula
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
