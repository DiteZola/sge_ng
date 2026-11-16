import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Download,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  UserCheck,
  QrCode,
  CalendarDays,
  CheckCheck,
  RotateCcw,
  Save,
  Briefcase
} from 'lucide-react';
import {
  Escola,
  Turma,
  Aluno,
  Disciplina,
  Funcionario,
  PresencaAlunoItem,
  AtribuicaoDocente,
  PresencaFuncionario,
  RegistoAssiduidade
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import {
  getTurmasPorClasse,
  normalizarClasse,
  isSegundoCiclo,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  getSalaDaTurma,
  getCursoDaTurma,
  getDisciplinasDaTurma
} from '../services/academicHierarchyService';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { ModalJustificarFaltaAluno } from './ModalJustificarFaltaAluno';
import { ModalJustificarFaltaFuncionario } from './ModalJustificarFaltaFuncionario';
import { QrScannerModal } from './QrScannerModal';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { AngolaDateInput } from './AngolaDateInput';

interface StudentAttendanceReportViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  funcionarios: Funcionario[];
  atribuicoes?: AtribuicaoDocente[];
  assiduidadeFuncionarios?: RegistoAssiduidade[];
  onSalvarRegistoAssiduidade?: (registo: RegistoAssiduidade) => void;
  onAtualizarAssiduidade?: () => void;
}

const ROLES_GESTAO_PONTO_DOCENTES = new Set([
  'AdminGeral',
  'DiretorGeral',
  'SubdiretorPedagogico',
  'SubdiretorAdministrativo',
  'SubdirectorAdministrativo',
  'CoordenadorPedagogico',
  'CoordenadorTurno',
  'ChefeSecretaria'
]);

const ROLES_CHAMADA_ALUNOS = new Set([
  'AdminGeral',
  'DiretorGeral',
  'SubdiretorPedagogico',
  'SubdiretorAdministrativo',
  'SubdirectorAdministrativo',
  'CoordenadorPedagogico',
  'CoordenadorTurno',
  'CoordenadorDisciplina',
  'Professor',
  'Secretaria',
  'ChefeSecretaria',
  'Secretario',
  'SecretarioEscolar'
]);

export const StudentAttendanceReportView: React.FC<StudentAttendanceReportViewProps> = ({
  escola,
  currentUser,
  turmas,
  alunos,
  disciplinas,
  funcionarios,
  atribuicoes = [],
  assiduidadeFuncionarios,
  onSalvarRegistoAssiduidade,
  onAtualizarAssiduidade
}) => {
  const hojeIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [abaAtiva, setAbaAtiva] = useState<'chamada_diaria' | 'mapa_periodo' | 'ponto_professores'>('chamada_diaria');
  const [alunoParaJustificar, setAlunoParaJustificar] = useState<Aluno | null>(null);
  const [funcionarioParaJustificar, setFuncionarioParaJustificar] = useState<Funcionario | null>(null);

  const isProfessor = currentUser.role === 'Professor';

  // Turmas e disciplinas atribuídas ao professor (se aplicável)
  const atribuicoesProfessor = useMemo(() => {
    if (!isProfessor) return [];
    return atribuicoes.filter(a => a.professorId === currentUser.id);
  }, [atribuicoes, currentUser.id, isProfessor]);

  const turmasProfessorIds = useMemo(() => {
    if (!isProfessor) return new Set<string>();
    const ids = new Set<string>();
    atribuicoesProfessor.forEach(a => ids.add(a.turmaId));
    turmas
      .filter(t => t.coordenadorId === currentUser.id)
      .forEach(t => ids.add(t.id));
    return ids;
  }, [atribuicoesProfessor, turmas, currentUser.id, isProfessor]);

  const turmasDisponiveis = useMemo(() => {
    if (!isProfessor) return turmas;
    return turmas.filter(t => turmasProfessorIds.has(t.id));
  }, [turmas, isProfessor, turmasProfessorIds]);

  const todasClasses = useMemo(() => {
    const listaBase = [
      'Iniciação',
      ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
      ...CLASSES_PRIMEIRO_CICLO,
      ...CLASSES_SEGUNDO_CICLO
    ];
    if (!isProfessor) return listaBase;
    const classesProf = new Set(turmasDisponiveis.map(t => normalizarClasse(t.classe)));
    const filtradas = listaBase.filter(c => classesProf.has(normalizarClasse(c)));
    return filtradas.length > 0 ? filtradas : Array.from(classesProf);
  }, [isProfessor, turmasDisponiveis]);

  const turmaInicial = useMemo(() => {
    return turmasDisponiveis[0];
  }, [turmasDisponiveis]);

  const [selectedClasse, setSelectedClasse] = useState<string>(() => {
    return turmaInicial?.classe ? normalizarClasse(turmaInicial.classe) : '10ª';
  });

  const turmasDaClasse = useMemo(() => {
    const list = getTurmasPorClasse(turmasDisponiveis, selectedClasse);
    return list.length > 0 ? list : turmasDisponiveis;
  }, [turmasDisponiveis, selectedClasse]);

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmaInicial?.id || '');

  useEffect(() => {
    if (turmasDaClasse.length > 0 && !turmasDaClasse.some(t => t.id === selectedTurmaId)) {
      setSelectedTurmaId(turmasDaClasse[0].id);
    } else if (turmasDaClasse.length === 0 && selectedTurmaId !== '') {
      setSelectedTurmaId('');
    }
  }, [selectedClasse, turmasDaClasse, selectedTurmaId]);

  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<string>('todas');
  const [dataChamadaManual, setDataChamadaManual] = useState<string>(hojeIso);
  const [feedbackChamada, setFeedbackChamada] = useState<string | null>(null);

  const [tipoPeriodo, setTipoPeriodo] = useState<'intervalo' | 'mes'>('intervalo');
  const dataHoje = new Date();
  const currentMonthStr = `${dataHoje.getFullYear()}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}`;
  const firstDayStr = `${currentMonthStr}-01`;
  const lastDayNum = new Date(dataHoje.getFullYear(), dataHoje.getMonth() + 1, 0).getDate();
  const lastDayStr = `${currentMonthStr}-${String(lastDayNum).padStart(2, '0')}`;

  const [selectedMes, setSelectedMes] = useState<string>(currentMonthStr);
  const [dataInicio, setDataInicio] = useState<string>(firstDayStr);
  const [dataFim, setDataFim] = useState<string>(lastDayStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [qrScanData, setQrScanData] = useState<string>(hojeIso);
  const [qrFeedback, setQrFeedback] = useState<{ nome: string; turmaNome: string; hora: string; data: string } | null>(null);
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());

  // Estado para Ponto Manual de Professores & Pessoal
  const [dataPontoDocentes, setDataPontoDocentes] = useState<string>(hojeIso);
  const [filtroTipoDocente, setFiltroTipoDocente] = useState<'todos' | 'docentes' | 'administrativos'>('todos');
  const [searchDocente, setSearchDocente] = useState<string>('');
  const [presencasDocentesLocal, setPresencasDocentesLocal] = useState<PresencaFuncionario[]>(
    () => assiduidadeFuncionarios || dbService.getPresencas()
  );
  const [feedbackPontoDocente, setFeedbackPontoDocente] = useState<string | null>(null);

  useEffect(() => {
    if (assiduidadeFuncionarios) {
      setPresencasDocentesLocal(assiduidadeFuncionarios);
    }
  }, [assiduidadeFuncionarios]);

  const podeLancarAlunos = ROLES_CHAMADA_ALUNOS.has(currentUser.role);
  const podeGerirPontoDocentes = ROLES_GESTAO_PONTO_DOCENTES.has(currentUser.role);

  const emitirFeedbackChamada = (msg: string) => {
    setFeedbackChamada(msg);
    setTimeout(() => setFeedbackChamada(null), 4000);
  };

  const emitirFeedbackDocentes = (msg: string) => {
    setFeedbackPontoDocente(msg);
    setTimeout(() => setFeedbackPontoDocente(null), 4000);
  };

  // Turma selecionada (respeitando escopo do professor)
  const turmaSelecionada = turmasDisponiveis.find(t => t.id === selectedTurmaId) || turmasDaClasse[0] || turmasDisponiveis[0];

  // Disciplinas filtradas estritamente para a classe/curso da turma selecionada e atribuições do Professor
  const disciplinasDaClasse = useMemo(() => {
    const base = getDisciplinasDaTurma(disciplinas, turmaSelecionada);
    if (!isProfessor) return base;
    if (!turmaSelecionada) return [];
    const atribsNaTurma = atribuicoesProfessor.filter(a => a.turmaId === turmaSelecionada.id);
    if (atribsNaTurma.length === 0) return [];
    const idsAtribuidos = new Set(atribsNaTurma.map(a => a.disciplinaId).filter(Boolean));
    const nomesAtribuidos = new Set(
      atribsNaTurma.map(a => String((a as any).disciplinaNome || '').trim().toLowerCase()).filter(Boolean)
    );
    return base.filter(
      d => idsAtribuidos.has(d.id) || nomesAtribuidos.has((d.nome || '').trim().toLowerCase())
    );
  }, [disciplinas, turmaSelecionada, isProfessor, atribuicoesProfessor]);

  // Manter a disciplina selecionada coerente com as atribuições do professor
  useEffect(() => {
    if (!isProfessor) return;
    if (disciplinasDaClasse.length > 0) {
      if (
        (selectedDisciplinaId === 'todas' && disciplinasDaClasse.length === 1) ||
        (selectedDisciplinaId !== 'todas' && !disciplinasDaClasse.some(d => d.id === selectedDisciplinaId))
      ) {
        setSelectedDisciplinaId(disciplinasDaClasse[0].id);
      }
    } else if (selectedDisciplinaId !== 'todas') {
      setSelectedDisciplinaId('todas');
    }
  }, [isProfessor, disciplinasDaClasse, selectedDisciplinaId]);

  // Alunos desta turma
  const alunosDaTurma = useMemo(() => {
    return alunos
      .filter(a => a.turmaId === selectedTurmaId)
      .sort((a, b) => (a.numeroOrdem || 0) - (b.numeroOrdem || 0) || a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-AO'));
  }, [alunos, selectedTurmaId]);

  // Alunos filtrados por busca com proteção anti-ReDoS
  const alunosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return alunosDaTurma;
    return alunosDaTurma.filter(
      a =>
        safeSearchMatch(a.nomeCompleto, searchTerm) ||
        safeSearchMatch(a.numeroProcesso || a.codigoMatricula, searchTerm) ||
        safeSearchMatch(a.numeroBI, searchTerm)
    );
  }, [alunosDaTurma, searchTerm]);

  // Presenças salvas dos alunos + escuta em tempo real
  const [presencas, setPresencas] = useState<PresencaAlunoItem[]>(() => dbService.obterPresencasAlunos(selectedTurmaId));

  useEffect(() => {
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
  }, [selectedTurmaId]);

  useEffect(() => {
    const atualizarRemoto = () => {
      setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
      setPresencasDocentesLocal(dbService.getPresencas());
      setConfigSistema(dbService.getConfiguracaoSistema());
    };
    window.addEventListener('sge_dados_atualizados_remoto', atualizarRemoto);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', atualizarRemoto);
  }, [selectedTurmaId]);

  const encontrarPresencaAluno = (alunoId: string, dataStr: string) => {
    if (selectedDisciplinaId !== 'todas') {
      return (
        presencas.find(
          p =>
            p.alunoId === alunoId &&
            p.data === dataStr &&
            p.turmaId === selectedTurmaId &&
            p.disciplinaId === selectedDisciplinaId
        ) ||
        presencas.find(
          p => p.alunoId === alunoId && p.data === dataStr && p.turmaId === selectedTurmaId && !p.disciplinaId
        )
      );
    }
    return presencas.find(p => p.alunoId === alunoId && p.data === dataStr && p.turmaId === selectedTurmaId);
  };

  // Marcar presença/falta manual para um aluno numa data (default: dia atual)
  const marcarPresencaManualAluno = (
    alunoId: string,
    dataStr: string,
    estado: 'Presente' | 'Falta_Injustificada' | 'Falta_Justificada',
    justificativa?: string
  ) => {
    if (!podeLancarAlunos) return;

    const presencaAtual = encontrarPresencaAluno(alunoId, dataStr);
    const sufixoDisc = selectedDisciplinaId !== 'todas' ? `-${selectedDisciplinaId}` : '';
    const item: PresencaAlunoItem = {
      id: presencaAtual?.id || `pres-${alunoId}-${dataStr}${sufixoDisc}`,
      escolaId: escola.id,
      turmaId: selectedTurmaId,
      alunoId,
      disciplinaId: selectedDisciplinaId !== 'todas' ? selectedDisciplinaId : undefined,
      data: dataStr,
      estado,
      justificativa: justificativa ?? presencaAtual?.justificativa,
      registadoPorId: currentUser.id,
      registadoPorNome: `${currentUser.nomeCompleto} (Manual)`
    };

    dbService.salvarPresencaAluno(item);
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
  };

  const limparPresencaAlunoDia = (alunoId: string, dataStr: string) => {
    if (!podeLancarAlunos) return;
    dbService.removerPresencaAluno(alunoId, dataStr, selectedTurmaId);
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
  };

  const handleMarcarTodosAlunos = (estado: 'Presente' | 'Falta_Injustificada', apenasNaoMarcados = false) => {
    if (!podeLancarAlunos || alunosFiltrados.length === 0) return;

    const sufixoDisc = selectedDisciplinaId !== 'todas' ? `-${selectedDisciplinaId}` : '';
    const itensLote: PresencaAlunoItem[] = [];

    for (const aluno of alunosFiltrados) {
      const atual = encontrarPresencaAluno(aluno.id, dataChamadaManual);
      if (apenasNaoMarcados && atual) continue;

      itensLote.push({
        id: atual?.id || `pres-${aluno.id}-${dataChamadaManual}${sufixoDisc}`,
        escolaId: escola.id,
        turmaId: selectedTurmaId,
        alunoId: aluno.id,
        disciplinaId: selectedDisciplinaId !== 'todas' ? selectedDisciplinaId : undefined,
        data: dataChamadaManual,
        estado,
        registadoPorId: currentUser.id,
        registadoPorNome: `${currentUser.nomeCompleto} (Manual em Lote)`
      });
    }

    if (itensLote.length === 0) {
      emitirFeedbackChamada('Todos os alunos visíveis já possuem marcação registada para esta data.');
      return;
    }

    dbService.salvarPresencasAlunosLote(itensLote);
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
    emitirFeedbackChamada(
      `${itensLote.length} aluno(s) marcados como "${estado === 'Presente' ? 'Presente' : 'Falta'}" em ${dataChamadaManual.split('-').reverse().join('/')} e sincronizados.`
    );
  };

  const handleGuardarChamadaDia = () => {
    if (!podeLancarAlunos) return;
    const registosDia = presencas.filter(p => p.data === dataChamadaManual && p.turmaId === selectedTurmaId);
    if (registosDia.length > 0) {
      dbService.salvarPresencasAlunosLote(registosDia);
    }
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
    emitirFeedbackChamada(
      `Chamada da turma ${turmaSelecionada?.nome || ''} (${dataChamadaManual.split('-').reverse().join('/')}) guardada no dispositivo e enviada ao Firebase.`
    );
  };

  // Resumo da chamada diária dos alunos
  const resumoChamadaDia = useMemo(() => {
    let presentes = 0;
    let faltasInjust = 0;
    let faltasJust = 0;
    let porMarcar = 0;

    for (const aluno of alunosFiltrados) {
      const reg = encontrarPresencaAluno(aluno.id, dataChamadaManual);
      if (!reg) porMarcar++;
      else if (reg.estado === 'Presente') presentes++;
      else if (reg.estado === 'Falta_Injustificada') faltasInjust++;
      else if (reg.estado === 'Falta_Justificada') faltasJust++;
    }

    return { total: alunosFiltrados.length, presentes, faltasInjust, faltasJust, porMarcar };
  }, [alunosFiltrados, presencas, dataChamadaManual, selectedDisciplinaId, selectedTurmaId]);

  // Professores & funcionários da escola para o módulo de ponto manual
  const equipeDaEscola = useMemo(() => {
    const base = funcionarios.filter(f => (currentUser.role === 'AdminGeral' || f.escolaId === escola.id) && f.role !== 'AdminGeral');
    const porTipo = base.filter(f => {
      if (filtroTipoDocente === 'docentes') {
        return f.role === 'Professor' || f.ehProfessor || f.ehAdministrativoQueLeciona;
      }
      if (filtroTipoDocente === 'administrativos') {
        return f.role !== 'Professor' && !f.ehProfessor;
      }
      return true;
    });
    if (!searchDocente.trim()) return porTipo;
    return porTipo.filter(
      f =>
        safeSearchMatch(f.nomeCompleto, searchDocente) ||
        safeSearchMatch(f.cargo, searchDocente) ||
        safeSearchMatch(f.numeroBI, searchDocente)
    );
  }, [funcionarios, escola.id, currentUser.role, filtroTipoDocente, searchDocente]);

  const resumoPontoDocentes = useMemo(() => {
    let presentes = 0;
    let faltasInjust = 0;
    let faltasJust = 0;
    let porMarcar = 0;

    for (const func of equipeDaEscola) {
      const reg = presencasDocentesLocal.find(a => a.funcionarioId === func.id && a.data === dataPontoDocentes);
      if (!reg) porMarcar++;
      else if (reg.estado === 'Presente') presentes++;
      else if (reg.estado === 'Falta_Injustificada') faltasInjust++;
      else if (reg.estado === 'Falta_Justificada') faltasJust++;
    }

    return { total: equipeDaEscola.length, presentes, faltasInjust, faltasJust, porMarcar };
  }, [equipeDaEscola, presencasDocentesLocal, dataPontoDocentes]);

  const marcarPresencaManualDocente = (
    func: Funcionario,
    estado: 'Presente' | 'Falta_Injustificada' | 'Falta_Justificada',
    motivo = ''
  ) => {
    if (!podeGerirPontoDocentes) return;
    const existente = presencasDocentesLocal.find(a => a.funcionarioId === func.id && a.data === dataPontoDocentes);
    const registo: RegistoAssiduidade = {
      id: existente?.id || `assid-${func.id}-${dataPontoDocentes}`,
      funcionarioId: func.id,
      funcionarioNome: func.nomeCompleto,
      cargo: func.cargo || func.role,
      escolaId: escola.id,
      data: dataPontoDocentes,
      estado,
      observacao: motivo,
      justificativa: motivo,
      registadoPor: `${currentUser.nomeCompleto} (Manual)`
    };

    if (onSalvarRegistoAssiduidade) {
      onSalvarRegistoAssiduidade(registo);
    } else {
      dbService.salvarPresenca(registo);
    }
    setPresencasDocentesLocal(dbService.getPresencas());
    onAtualizarAssiduidade?.();
  };

  const handleMarcarTodosDocentesPresentes = () => {
    if (!podeGerirPontoDocentes || equipeDaEscola.length === 0) return;
    const itens: RegistoAssiduidade[] = equipeDaEscola.map(func => {
      const existente = presencasDocentesLocal.find(a => a.funcionarioId === func.id && a.data === dataPontoDocentes);
      return {
        id: existente?.id || `assid-${func.id}-${dataPontoDocentes}`,
        funcionarioId: func.id,
        funcionarioNome: func.nomeCompleto,
        cargo: func.cargo || func.role,
        escolaId: escola.id,
        data: dataPontoDocentes,
        estado: 'Presente',
        observacao: '',
        justificativa: '',
        registadoPor: `${currentUser.nomeCompleto} (Manual em Lote)`
      };
    });
    dbService.salvarPresencasLote(itens);
    setPresencasDocentesLocal(dbService.getPresencas());
    onAtualizarAssiduidade?.();
    emitirFeedbackDocentes(
      `${itens.length} professores/funcionários marcados como Presentes em ${dataPontoDocentes.split('-').reverse().join('/')} e sincronizados com o Firebase.`
    );
  };

  const limparPontoDocenteDia = (funcId: string) => {
    if (!podeGerirPontoDocentes) return;
    dbService.removerPresenca(funcId, dataPontoDocentes);
    setPresencasDocentesLocal(dbService.getPresencas());
    onAtualizarAssiduidade?.();
  };

  // Dias letivos calculados conforme o período selecionado (Início e Fim ou Mês)
  const diasLetivos = useMemo(() => {
    const nomesSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dias: { dia: number; dataStr: string; diaSemanaCurto: string }[] = [];

    if (tipoPeriodo === 'intervalo' && dataInicio && dataFim) {
      const dtInicio = new Date(`${dataInicio}T00:00:00`);
      const dtFim = new Date(`${dataFim}T00:00:00`);

      if (dtInicio <= dtFim) {
        const curr = new Date(dtInicio);
        while (curr <= dtFim) {
          const diaSemana = curr.getDay();
          if (diaSemana >= 1 && diaSemana <= 5) {
            const ano = curr.getFullYear();
            const mes = String(curr.getMonth() + 1).padStart(2, '0');
            const diaNum = String(curr.getDate()).padStart(2, '0');
            dias.push({
              dia: curr.getDate(),
              dataStr: `${ano}-${mes}-${diaNum}`,
              diaSemanaCurto: nomesSemana[diaSemana]
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
        return dias;
      }
    }

    const [anoStr, mesStr] = selectedMes.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);
    const totalDias = new Date(ano, mes, 0).getDate();

    for (let d = 1; d <= totalDias; d++) {
      const dt = new Date(ano, mes - 1, d);
      const diaSemana = dt.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        const dStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dias.push({
          dia: d,
          dataStr: dStr,
          diaSemanaCurto: nomesSemana[diaSemana]
        });
      }
    }
    return dias;
  }, [tipoPeriodo, dataInicio, dataFim, selectedMes]);

  // Alternar presença do aluno num dia específico na matriz mensal
  const togglePresenca = (alunoId: string, dataStr: string) => {
    if (!podeLancarAlunos) return;

    const presencaAtual = encontrarPresencaAluno(alunoId, dataStr);
    let novoEstado: 'Presente' | 'Falta_Justificada' | 'Falta_Injustificada' = 'Presente';

    if (presencaAtual) {
      if (presencaAtual.estado === 'Presente') novoEstado = 'Falta_Injustificada';
      else if (presencaAtual.estado === 'Falta_Injustificada') novoEstado = 'Falta_Justificada';
      else novoEstado = 'Presente';
    }

    const sufixoDisc = selectedDisciplinaId !== 'todas' ? `-${selectedDisciplinaId}` : '';
    const item: PresencaAlunoItem = {
      id: presencaAtual?.id || `pres-${alunoId}-${dataStr}${sufixoDisc}`,
      escolaId: escola.id,
      turmaId: selectedTurmaId,
      alunoId,
      disciplinaId: selectedDisciplinaId !== 'todas' ? selectedDisciplinaId : undefined,
      data: dataStr,
      estado: novoEstado,
      registadoPorId: currentUser.id,
      registadoPorNome: currentUser.nomeCompleto
    };

    dbService.salvarPresencaAluno(item);
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
  };

  const handleRegistrarPresencaPorQr = (aluno: Aluno) => {
    const dataTarget = qrScanData || hojeIso;
    const turmaAluno = turmas.find(t => t.id === aluno.turmaId);
    const turmaAlvoId = turmaAluno?.id || selectedTurmaId;

    const existing = dbService
      .obterPresencasAlunos(turmaAlvoId)
      .find(p => p.alunoId === aluno.id && p.data === dataTarget && p.turmaId === turmaAlvoId);

    const item: PresencaAlunoItem = {
      id: existing?.id || `pres-${aluno.id}-${dataTarget}`,
      escolaId: escola.id,
      turmaId: turmaAlvoId,
      alunoId: aluno.id,
      disciplinaId: selectedDisciplinaId !== 'todas' ? selectedDisciplinaId : undefined,
      data: dataTarget,
      estado: 'Presente',
      registadoPorId: currentUser.id,
      registadoPorNome: `${currentUser.nomeCompleto} (Scanner QR)`
    };

    dbService.salvarPresencaAluno(item);

    if (turmaAluno) {
      setSelectedClasse(normalizarClasse(turmaAluno.classe));
      setSelectedTurmaId(turmaAluno.id);
    }

    if (tipoPeriodo === 'intervalo') {
      if (dataTarget < dataInicio) setDataInicio(dataTarget);
      if (dataTarget > dataFim) setDataFim(dataTarget);
    } else {
      const mesTarget = dataTarget.slice(0, 7);
      if (mesTarget !== selectedMes) setSelectedMes(mesTarget);
    }

    setPresencas(dbService.obterPresencasAlunos(turmaAlvoId));
    setQrFeedback({
      nome: aluno.nomeCompleto,
      turmaNome: turmaAluno ? `${turmaAluno.classe} • ${turmaAluno.nome}` : 'Turma Ativa',
      data: dataTarget,
      hora: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  };

  // Exportar Ficha de Presença para Excel (.xlsx) sob demanda
  const handleExportarXLSX = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const periodoTexto =
      tipoPeriodo === 'intervalo'
        ? `Período de ${dataInicio} até ${dataFim}`
        : `Mês de Referência: ${selectedMes}`;

    const dadosCabecalho = [
      ['REPÚBLICA DE ANGOLA - MINISTÉRIO DA EDUCAÇÃO'],
      [escola.nomeOficial],
      [`FICHA OFICIAL DE PRESENÇAS E ASSIDUIDADE DOS ALUNOS - ${periodoTexto.toUpperCase()}`],
      [`Turma: ${turmaSelecionada?.nome || ''} (${turmaSelecionada?.classe || ''})`, `Turno: ${turmaSelecionada?.turno || ''}`, `Sala: ${turmaSelecionada?.sala || ''}`],
      []
    ];

    const titulosDias = diasLetivos.map(d => `${d.dia} (${d.diaSemanaCurto})`);
    const cabecalhoColunas = ['Nº', 'Processo', 'Nome Completo do Aluno', ...titulosDias, 'Presenças (P)', 'Faltas Injust. (FI)', 'Faltas Just. (FJ)', '% Assiduidade'];

    const linhasAlunos = alunosFiltrados.map((aluno, idx) => {
      let totalP = 0;
      let totalFI = 0;
      let totalFJ = 0;

      const diasValores = diasLetivos.map(d => {
        const reg = encontrarPresencaAluno(aluno.id, d.dataStr);
        if (reg?.estado === 'Presente') {
          totalP++;
          return 'P';
        }
        if (reg?.estado === 'Falta_Injustificada') {
          totalFI++;
          return 'FI';
        }
        if (reg?.estado === 'Falta_Justificada') {
          totalFJ++;
          return 'FJ';
        }
        return '—';
      });

      const totalRegistados = totalP + totalFI + totalFJ;
      const pct = totalRegistados > 0 ? `${Math.round((totalP / totalRegistados) * 100)}%` : '—';

      return [idx + 1, aluno.numeroProcesso || aluno.codigoMatricula, aluno.nomeCompleto, ...diasValores, totalP, totalFI, totalFJ, pct];
    });

    const wsData = [...dadosCabecalho, cabecalhoColunas, ...linhasAlunos];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Presencas');
    XLSX.writeFile(
      wb,
      `Ficha_Presencas_${turmaSelecionada?.nome || 'Turma'}_${tipoPeriodo === 'intervalo' ? `${dataInicio}_a_${dataFim}` : selectedMes}.xlsx`
    );
  };

  const handleBaixarHTML = () => {
    const el = document.getElementById('mapa-presencas-print');
    if (!el) return;
    const printContent = el.innerHTML;
    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Mapa de Presenças - ${turmaSelecionada?.nome || 'Turma'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; padding: 20px; color: #000; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; }
  </style>
</head>
<body class="p-6">
  ${printContent}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mapa_Presencas_${turmaSelecionada?.nome || 'Turma'}_${tipoPeriodo === 'intervalo' ? `${dataInicio}_a_${dataFim}` : selectedMes}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [gerandoPdf, setGerandoPdf] = useState(false);

  const handleBaixarPdf = async () => {
    const el = document.getElementById('mapa-presencas-print');
    if (!el) return;
    setGerandoPdf(true);
    try {
      const nome = `Ficha_Presencas_${turmaSelecionada?.nome || 'Turma'}_${tipoPeriodo === 'intervalo' ? `${dataInicio}_a_${dataFim}` : selectedMes}`;
      await downloadElementAsPdf(el, nome, { orientation: 'landscape' });
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Alternador Principal de Abas: Chamada Manual / Mapa Mensal / Ponto de Professores */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Registo Manual + QR Code • Assiduidade Oficial
              </span>
              <span className="text-xs text-gray-500">Documento Normativo MED</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center space-x-2">
              <ClipboardList className="h-6 w-6 text-emerald-600" />
              <span>Controlo de Presenças & Faltas (Alunos e Professores)</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Registe presenças manualmente na lista completa da turma para o dia atual, ou utilize o leitor QR e emita o mapa oficial em PDF/Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrScannerModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Opcional: Escanear QR Code do passe de estudante para marcar presença"
            >
              <QrCode className="h-4 w-4" />
              <span>Ler QR Code (Opcional)</span>
            </button>

            {abaAtiva === 'mapa_periodo' && (
              <>
                <button
                  type="button"
                  onClick={handleExportarXLSX}
                  className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                  <span>Baixar Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleBaixarHTML}
                  className="px-3.5 py-2 text-xs font-bold text-blue-950 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="h-4 w-4 text-blue-700" />
                  <span>Baixar HTML</span>
                </button>

                <button
                  type="button"
                  onClick={handleBaixarPdf}
                  disabled={gerandoPdf}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  <span>{gerandoPdf ? 'A Gerar PDF Oficial...' : 'Baixar em PDF (.pdf)'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub-Abas */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAbaAtiva('chamada_diaria')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
              abaAtiva === 'chamada_diaria'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Chamada Diária Manual (Alunos)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('mapa_periodo')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
              abaAtiva === 'mapa_periodo'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Mapa Mensal / Período (PDF & Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('ponto_professores')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
              abaAtiva === 'ponto_professores'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Presenças de Professores & Pessoal</span>
          </button>
        </div>

        {qrFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Presença registada por QR Code para <strong>{qrFeedback.nome}</strong> ({qrFeedback.turmaNome}) em{' '}
                <strong>{qrFeedback.data.split('-').reverse().join('/')}</strong> às <strong>{qrFeedback.hora}</strong> e sincronizada na nuvem.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQrFeedback(null)}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {feedbackChamada && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{feedbackChamada}</span>
            </div>
            <button type="button" onClick={() => setFeedbackChamada(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* ABA 1: CHAMADA DIÁRIA MANUAL DE ALUNOS (CLASSE + TURMA + DIA ATUAL)   */}
      {/* ===================================================================== */}
      {abaAtiva === 'chamada_diaria' && (
        <div className="space-y-4">
          {/* Seleção de Classe, Turma, Disciplina e Data (Dia Atual) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-800">Turma Ativa para Chamada:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {turmaSelecionada?.classe || selectedClasse} Classe
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Turma: {turmaSelecionada?.nome || '—'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Sala: {getSalaDaTurma(turmaSelecionada)}
                </span>
                {isSegundoCiclo(selectedClasse) && (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                    Curso: {getCursoDaTurma(turmaSelecionada)}
                  </span>
                )}
              </div>

              {dataChamadaManual === hojeIso && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white">
                  Dia Atual (Hoje: {hojeIso.split('-').reverse().join('/')})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">1. Classe Curricular</label>
                <select
                  value={selectedClasse}
                  onChange={(e) => {
                    const novaC = e.target.value;
                    setSelectedClasse(novaC);
                    const validas = getTurmasPorClasse(turmasDisponiveis, novaC);
                    if (validas.length > 0) {
                      setSelectedTurmaId(validas[0].id);
                      setPresencas(dbService.obterPresencasAlunos(validas[0].id));
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {todasClasses.length === 0 ? (
                    <option value="">Sem turmas atribuídas</option>
                  ) : (
                    todasClasses.map(c => (
                      <option key={`manual-cl-${c}`} value={c}>
                        {c} {c !== 'Iniciação' ? 'Classe' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  2. Turma ({turmasDaClasse.length} disponível)
                </label>
                <select
                  value={selectedTurmaId}
                  onChange={(e) => {
                    setSelectedTurmaId(e.target.value);
                    setPresencas(dbService.obterPresencasAlunos(e.target.value));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {turmasDaClasse.length === 0 ? (
                    <option value="">Nenhuma turma atribuída</option>
                  ) : (
                    turmasDaClasse.map(t => (
                      <option key={t.id} value={t.id}>
                        {turmasProfessorIds.has(t.id) ? '★ ' : ''}
                        {t.nome} • {t.turno} • {t.sala || 'Sala'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  3. {isProfessor ? 'Minha Disciplina Atribuída' : 'Disciplina (Opcional)'}
                </label>
                <select
                  value={selectedDisciplinaId}
                  onChange={(e) => setSelectedDisciplinaId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {(!isProfessor || disciplinasDaClasse.length === 0) && (
                    <option value="todas">
                      {isProfessor ? 'Coordenação Geral da Turma' : 'Chamada Geral do Dia'}
                    </option>
                  )}
                  {isProfessor && disciplinasDaClasse.length > 1 && (
                    <option value="todas">Todas as Minhas Disciplinas</option>
                  )}
                  {disciplinasDaClasse.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nome} ({d.sigla})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">4. Data da Chamada</label>
                  {dataChamadaManual !== hojeIso && (
                    <button
                      type="button"
                      onClick={() => setDataChamadaManual(hojeIso)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Voltar para Hoje
                    </button>
                  )}
                </div>
                <AngolaDateInput
                  value={dataChamadaManual}
                  onChange={(val) => {
                    if (val) setDataChamadaManual(val);
                  }}
                />
              </div>
            </div>

            {/* Pesquisa e Botões em Lote */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizeSearchInput(e.target.value, 80))}
                  maxLength={80}
                  placeholder={`Filtrar aluno nesta turma (${alunosFiltrados.length} na lista)...`}
                  className="w-full p-2 pl-9 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {podeLancarAlunos && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarcarTodosAlunos('Presente', false)}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>Marcar Todos Presentes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarcarTodosAlunos('Falta_Injustificada', true)}
                    className="px-3.5 py-2 text-xs font-bold text-red-900 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors"
                    title="Marca como Falta apenas os alunos que ainda não foram marcados hoje"
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Marcar Restantes como Falta</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGuardarChamadaDia}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Guardar & Sincronizar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* KPIs do Dia Selecionado */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total na Turma</span>
              <span className="text-xl font-black text-gray-900">{resumoChamadaDia.total}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">Presentes (P)</span>
              <span className="text-xl font-black text-emerald-800">{resumoChamadaDia.presentes}</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-red-700 uppercase block">Faltas Injust. (FI)</span>
              <span className="text-xl font-black text-red-800">{resumoChamadaDia.faltasInjust}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase block">Faltas Just. (FJ)</span>
              <span className="text-xl font-black text-amber-800">{resumoChamadaDia.faltasJust}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase block">Por Marcar</span>
              <span className="text-xl font-black text-slate-800">{resumoChamadaDia.porMarcar}</span>
            </div>
          </div>

          {/* Lista Completa da Turma para Marcação Manual */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-3 w-12 text-center">Nº</th>
                    <th className="p-3 w-32">Processo / Matrícula</th>
                    <th className="p-3">Nome Completo do(a) Aluno(a)</th>
                    <th className="p-3 w-40">Estado em {dataChamadaManual.split('-').reverse().join('/')}</th>
                    <th className="p-3 text-right">Marcar Presença / Falta Manualmente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alunosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                        Nenhum estudante encontrado nesta turma. Selecione outra classe ou turma acima.
                      </td>
                    </tr>
                  ) : (
                    alunosFiltrados.map((aluno, idx) => {
                      const reg = encontrarPresencaAluno(aluno.id, dataChamadaManual);
                      const isP = reg?.estado === 'Presente';
                      const isFI = reg?.estado === 'Falta_Injustificada';
                      const isFJ = reg?.estado === 'Falta_Justificada';

                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 text-center font-mono font-bold text-gray-700">{idx + 1}</td>
                          <td className="p-3 font-mono font-semibold text-gray-700">
                            {aluno.numeroProcesso || aluno.codigoMatricula || '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              {aluno.fotoUrl && aluno.fotoUrl.trim() !== '' ? (
                                <img
                                  src={aluno.fotoUrl}
                                  alt={aluno.nomeCompleto}
                                  className="h-8 w-8 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] border border-blue-200 shrink-0">
                                  {aluno.nomeCompleto
                                    ? aluno.nomeCompleto
                                        .split(' ')
                                        .map(n => n[0])
                                        .slice(0, 2)
                                        .join('')
                                    : 'AL'}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 uppercase">{aluno.nomeCompleto}</p>
                                <p className="text-[10px] text-gray-500">
                                  Matrícula: {aluno.codigoMatricula}
                                  {reg?.registadoPorNome ? ` • Por: ${reg.registadoPorNome}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {isP ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Presente</span>
                              </span>
                            ) : isFI ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                                <span>Falta Injustificada</span>
                              </span>
                            ) : isFJ ? (
                              <span
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                title={reg?.justificativa || 'Falta Justificada'}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                                <span>Falta Justificada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span>Por Marcar</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                            {podeLancarAlunos ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => marcarPresencaManualAluno(aluno.id, dataChamadaManual, 'Presente')}
                                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isP
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-400 hover:bg-emerald-100'
                                  }`}
                                >
                                  Presente
                                </button>

                                <button
                                  type="button"
                                  onClick={() => marcarPresencaManualAluno(aluno.id, dataChamadaManual, 'Falta_Injustificada')}
                                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isFI
                                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                      : 'bg-red-50 text-red-800 border-red-400 hover:bg-red-100'
                                  }`}
                                >
                                  Falta
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setAlunoParaJustificar(aluno)}
                                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isFJ
                                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                      : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
                                  }`}
                                  title="Justificar falta formalmente com documento/motivo"
                                >
                                  Justificar
                                </button>

                                {reg && (
                                  <button
                                    type="button"
                                    onClick={() => limparPresencaAlunoDia(aluno.id, dataChamadaManual)}
                                    className="px-2 py-1.5 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg cursor-pointer"
                                    title="Limpar marcação do dia"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 inline" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Apenas Leitura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: MAPA MENSAL / PERÍODO PARA IMPRESSÃO, PDF E EXCEL              */}
      {/* ===================================================================== */}
      {abaAtiva === 'mapa_periodo' && (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4 no-print">
            {/* Alternador de Modo de Período: Intervalo vs Mês */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-700">Modo de Seleção do Período:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipoPeriodo('intervalo')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      tipoPeriodo === 'intervalo'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Período Específico (Data Início e Fim)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPeriodo('mes')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      tipoPeriodo === 'mes'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Mês Completo
                  </button>
                </div>
              </div>

              {alunosFiltrados.length > 0 && podeLancarAlunos && (
                <button
                  type="button"
                  onClick={() => setAlunoParaJustificar(alunosFiltrados[0])}
                  className="px-3.5 py-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                  <span>Justificar Falta</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">1. Classe Curricular</label>
                <select
                  value={selectedClasse}
                  onChange={(e) => {
                    const novaC = e.target.value;
                    setSelectedClasse(novaC);
                    const validas = getTurmasPorClasse(turmasDisponiveis, novaC);
                    if (validas.length > 0) {
                      setSelectedTurmaId(validas[0].id);
                      setPresencas(dbService.obterPresencasAlunos(validas[0].id));
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {todasClasses.map(c => (
                    <option key={`att-cl-${c}`} value={c}>
                      {c} {c !== 'Iniciação' ? 'Classe' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  2. Turma ({turmasDaClasse.length} na {selectedClasse})
                </label>
                <select
                  value={selectedTurmaId}
                  onChange={(e) => {
                    setSelectedTurmaId(e.target.value);
                    setPresencas(dbService.obterPresencasAlunos(e.target.value));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {turmasDaClasse.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">3. {isProfessor ? 'Minha Disciplina Atribuída' : 'Disciplina Oficial'}</label>
                <select
                  value={selectedDisciplinaId}
                  onChange={(e) => setSelectedDisciplinaId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {(!isProfessor || disciplinasDaClasse.length === 0) && (
                    <option value="todas">
                      {isProfessor ? 'Coordenação Geral da Turma' : 'Todas as Disciplinas da Classe'}
                    </option>
                  )}
                  {isProfessor && disciplinasDaClasse.length > 1 && (
                    <option value="todas">Todas as Minhas Disciplinas</option>
                  )}
                  {disciplinasDaClasse.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nome} ({d.sigla})
                    </option>
                  ))}
                </select>
              </div>

              {tipoPeriodo === 'intervalo' ? (
                <>
                  <div>
                    <AngolaDateInput label="Data de Início" value={dataInicio} onChange={(v) => { if (v) setDataInicio(v); }} />
                  </div>
                  <div>
                    <AngolaDateInput label="Data Término" value={dataFim} onChange={(v) => { if (v) setDataFim(v); }} />
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Mês de Referência</label>
                  <input
                    type="month"
                    value={selectedMes}
                    onChange={(e) => setSelectedMes(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <span>Legenda rápida:</span>
                <span className="flex items-center space-x-1 font-bold text-emerald-700">
                  <span className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">P</span>
                  <span>Presente</span>
                </span>
                <span className="flex items-center space-x-1 font-bold text-red-700">
                  <span className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center text-[10px]">FI</span>
                  <span>Falta Injustificada</span>
                </span>
                <span className="flex items-center space-x-1 font-bold text-amber-700">
                  <span className="h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center text-[10px]">FJ</span>
                  <span>Falta Justificada</span>
                </span>
              </div>
              <span className="italic text-[11px] text-gray-500">
                Dica: Clique em qualquer célula para alternar o estado de presença do dia.
              </span>
            </div>
          </div>

          {/* DOCUMENTO OFICIAL PARA VISUALIZAÇÃO E IMPRESSÃO (A4 PAISAGEM) */}
          <div id="mapa-presencas-print" className="bg-white border-2 border-black rounded-xl p-6 shadow-md text-black print:border-none print:p-0">
            <div className="text-center border-b-2 border-black pb-3 mb-4">
              <div className="flex justify-center mb-1">
                {configSistema.insigniaNacionalUrl && configSistema.insigniaNacionalUrl.trim() !== '' ? (
                  <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-12 w-12 object-contain mx-auto" />
                ) : (
                  <InsigniaAngola size={44} />
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</p>
              <p className="text-[9.5px] font-bold uppercase">
                {escola.governoProvincial || 'GOVERNO PROVINCIAL'} • {escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}
              </p>
              <h2 className="text-sm sm:text-base font-black uppercase text-gray-950 mt-0.5">{escola.nomeOficial}</h2>
              <div className="inline-block bg-gray-100 border border-black px-4 py-1 mt-1 rounded text-xs font-black uppercase tracking-wide">
                {tipoPeriodo === 'intervalo'
                  ? `MAPA DE CONTROLO DE ASSIDUIDADE — PERÍODO DE ${dataInicio.split('-').reverse().join('/')} ATÉ ${dataFim.split('-').reverse().join('/')}`
                  : `MAPA DE CONTROLO DE ASSIDUIDADE E PRESENÇAS — MÊS DE ${selectedMes.toUpperCase()}`}
              </div>
              <div className="flex justify-center space-x-6 text-[10px] sm:text-[11px] font-bold text-gray-800 pt-2">
                <span>
                  Turma: <strong>{turmaSelecionada?.nome} ({turmaSelecionada?.classe})</strong>
                </span>
                <span>
                  Turno: <strong>{turmaSelecionada?.turno}</strong>
                </span>
                <span>
                  Sala: <strong>{turmaSelecionada?.sala}</strong>
                </span>
                <span>
                  Ano Letivo: <strong>{escola.anoLectivoActivo || '—'}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-[10px] text-center">
                <thead>
                  <tr className="bg-gray-100 font-extrabold border-b-2 border-black">
                    <th className="p-1 border-r border-black w-7">Nº</th>
                    <th className="p-1 border-r border-black w-20">PROCESSO</th>
                    <th className="p-1 border-r border-black text-left w-48">NOME COMPLETO DO(A) ALUNO(A)</th>

                    {diasLetivos.map(d => (
                      <th key={d.dataStr} className="p-0.5 border-r border-black w-6 text-[9px] font-mono">
                        <div>{d.dia}</div>
                        <div className="text-[7.5px] text-gray-600 font-normal">{d.diaSemanaCurto}</div>
                      </th>
                    ))}

                    <th className="p-1 border-r border-black w-10 bg-emerald-50 text-emerald-900 font-bold" title="Total de Presenças">
                      P
                    </th>
                    <th className="p-1 border-r border-black w-10 bg-red-50 text-red-900 font-bold" title="Faltas Injustificadas">
                      FI
                    </th>
                    <th className="p-1 border-r border-black w-10 bg-amber-50 text-amber-900 font-bold" title="Faltas Justificadas">
                      FJ
                    </th>
                    <th className="p-1 w-12 bg-gray-100 font-bold">% Assid.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {alunosFiltrados.map((aluno, idx) => {
                    let totalP = 0;
                    let totalFI = 0;
                    let totalFJ = 0;

                    return (
                      <tr key={aluno.id} className="hover:bg-gray-50/80">
                        <td className="p-1 border-r border-black font-mono font-bold">{idx + 1}</td>
                        <td className="p-1 border-r border-black font-mono font-medium">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                        <td className="p-1 border-r border-black text-left font-bold truncate max-w-[200px] uppercase">
                          <div className="flex items-center justify-between space-x-1">
                            <span className="truncate">{aluno.nomeCompleto}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAlunoParaJustificar(aluno);
                              }}
                              className="p-0.5 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-100 no-print cursor-pointer shrink-0"
                              title={`Justificar falta formal de ${aluno.nomeCompleto}`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {diasLetivos.map(d => {
                          const reg = encontrarPresencaAluno(aluno.id, d.dataStr);
                          let sigla = '—';
                          let estilo = 'text-gray-300 font-normal';

                          if (reg?.estado === 'Presente') {
                            sigla = 'P';
                            estilo = 'text-emerald-700 font-bold bg-emerald-50/50';
                            totalP++;
                          } else if (reg?.estado === 'Falta_Injustificada') {
                            sigla = 'FI';
                            estilo = 'text-red-700 font-black bg-red-100/60';
                            totalFI++;
                          } else if (reg?.estado === 'Falta_Justificada') {
                            sigla = 'FJ';
                            estilo = 'text-amber-700 font-black bg-amber-100/60';
                            totalFJ++;
                          }

                          return (
                            <td
                              key={d.dataStr}
                              onClick={() => togglePresenca(aluno.id, d.dataStr)}
                              className={`p-0.5 border-r border-black cursor-pointer hover:bg-blue-100 select-none ${estilo}`}
                              title={`Clique para alterar (${aluno.nomeCompleto} em ${d.dataStr})`}
                            >
                              {sigla}
                            </td>
                          );
                        })}

                        <td className="p-1 border-r border-black font-mono font-bold text-emerald-800 bg-emerald-50/40">{totalP}</td>
                        <td className="p-1 border-r border-black font-mono font-black text-red-700 bg-red-50/40">{totalFI}</td>
                        <td className="p-1 border-r border-black font-mono font-bold text-amber-700 bg-amber-50/40">{totalFJ}</td>
                        <td className="p-1 font-mono font-black bg-gray-50">
                          {totalP + totalFI + totalFJ > 0 ? `${Math.round((totalP / (totalP + totalFI + totalFJ)) * 100)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-4 gap-4 items-end pt-8 text-center text-xs mt-6 border-t border-black">
              <div>
                <div className="w-40 border-b border-black mx-auto" />
                <p className="font-bold text-gray-900 mt-1">O(A) Director(a) de Turma</p>
                <p className="text-gray-700 font-semibold text-[11px]">{turmaSelecionada?.coordenadorNome || 'Director de Turma'}</p>
                <p className="text-gray-500 text-[10px]">Data e Assinatura</p>
              </div>
              <div>
                <div className="w-40 border-b border-black mx-auto" />
                <p className="font-bold text-gray-900 mt-1">O Subdirector Pedagógico</p>
                <p className="text-gray-700 font-semibold text-[11px]">{escola.subdiretorPedagogicoNome || 'Subdirecção Pedagógica'}</p>
                <p className="text-gray-500 text-[10px]">Visto em Conformidade</p>
              </div>
              <div>
                <div className="w-40 border-b border-black mx-auto" />
                <p className="font-bold text-gray-900 mt-1">
                  {escola.diretorGeralGenero === 'F' ? 'A Directora Geral' : 'O Director Geral'}
                </p>
                <p className="text-gray-700 font-semibold text-[11px]">{escola.diretorGeralNome || 'Direcção da Instituição'}</p>
                <p className="text-gray-500 text-[10px]">Homologado</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'FICHA_PRESENCAS',
                    escolaId: escola.id,
                    docRef: `${selectedTurmaId}-${tipoPeriodo === 'intervalo' ? `${dataInicio}_${dataFim}` : selectedMes}`,
                    turmaId: selectedTurmaId,
                    anoLectivo: escola.anoLectivoActivo
                  })}
                  size={52}
                  label="Autenticidade QR"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: REGISTO MANUAL DE PRESENÇAS DE PROFESSORES E PESSOAL           */}
      {/* ===================================================================== */}
      {abaAtiva === 'ponto_professores' && (
        <div className="space-y-4">
          {!podeGerirPontoDocentes && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                Modo de consulta: o registo oficial de presenças do corpo docente é efetuado pela Direção, Subdireção Pedagógica, Coordenação ou Chefia de Secretaria.
              </span>
            </div>
          )}

          {feedbackPontoDocente && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{feedbackPontoDocente}</span>
              </div>
              <button type="button" onClick={() => setFeedbackPontoDocente(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
                Fechar
              </button>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-end">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">Data do Livro de Ponto</label>
                  {dataPontoDocentes !== hojeIso && (
                    <button
                      type="button"
                      onClick={() => setDataPontoDocentes(hojeIso)}
                      className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Voltar para Hoje
                    </button>
                  )}
                </div>
                <AngolaDateInput
                  value={dataPontoDocentes}
                  onChange={(v) => {
                    if (v) setDataPontoDocentes(v);
                  }}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Categoria de Pessoal</label>
                <select
                  value={filtroTipoDocente}
                  onChange={(e) => setFiltroTipoDocente(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="todos">Todos os Professores & Funcionários</option>
                  <option value="docentes">Apenas Professores / Docentes</option>
                  <option value="administrativos">Direção & Pessoal Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Pesquisar Docente / Funcionário</label>
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchDocente}
                    onChange={(e) => setSearchDocente(sanitizeSearchInput(e.target.value, 80))}
                    placeholder="Nome, cargo ou nº BI..."
                    className="w-full p-2 pl-9 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {podeGerirPontoDocentes && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-600 font-medium">
                  Registo manual diário ({dataPontoDocentes === hojeIso ? 'Dia Atual' : dataPontoDocentes.split('-').reverse().join('/')})
                </span>
                <button
                  type="button"
                  onClick={handleMarcarTodosDocentesPresentes}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Marcar Todos Presentes ({equipeDaEscola.length})</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Quadro</span>
              <span className="text-xl font-black text-gray-900">{resumoPontoDocentes.total}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">Presentes</span>
              <span className="text-xl font-black text-emerald-800">{resumoPontoDocentes.presentes}</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-red-700 uppercase block">Faltas Injust.</span>
              <span className="text-xl font-black text-red-800">{resumoPontoDocentes.faltasInjust}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase block">Faltas Just.</span>
              <span className="text-xl font-black text-amber-800">{resumoPontoDocentes.faltasJust}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase block">Por Marcar</span>
              <span className="text-xl font-black text-slate-800">{resumoPontoDocentes.porMarcar}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-3 w-12 text-center">Nº</th>
                    <th className="p-3">Professor / Funcionário</th>
                    <th className="p-3">Cargo / Função</th>
                    <th className="p-3 w-44">Estado em {dataPontoDocentes.split('-').reverse().join('/')}</th>
                    <th className="p-3 text-right">Marcação Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {equipeDaEscola.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                        Nenhum professor ou funcionário encontrado.
                      </td>
                    </tr>
                  ) : (
                    equipeDaEscola.map((func, idx) => {
                      const reg = presencasDocentesLocal.find(a => a.funcionarioId === func.id && a.data === dataPontoDocentes);
                      const isP = reg?.estado === 'Presente';
                      const isFI = reg?.estado === 'Falta_Injustificada';
                      const isFJ = reg?.estado === 'Falta_Justificada';

                      return (
                        <tr key={func.id} className="hover:bg-gray-50/80">
                          <td className="p-3 text-center font-mono font-bold text-gray-700">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              {func.fotoUrl && func.fotoUrl.trim() !== '' ? (
                                <img src={func.fotoUrl} alt={func.nomeCompleto} className="h-8 w-8 rounded-full object-cover border shrink-0" />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-indigo-200">
                                  {func.nomeCompleto
                                    ? func.nomeCompleto
                                        .split(' ')
                                        .map(n => n[0])
                                        .slice(0, 2)
                                        .join('')
                                    : 'PR'}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900">{func.nomeCompleto}</p>
                                <p className="text-[10px] text-gray-500 font-mono">
                                  BI: {func.numeroBI || '—'} {func.telefone ? `• ${func.telefone}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-medium text-gray-800">
                            {func.cargo || func.role}
                            {(func.role === 'Professor' || func.ehProfessor || func.ehAdministrativoQueLeciona) && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                Docente
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isP ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Presente</span>
                              </span>
                            ) : isFI ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                                <span>Falta Injustificada</span>
                              </span>
                            ) : isFJ ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                                <span>Falta Justificada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span>Por Marcar</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                            {podeGerirPontoDocentes ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => marcarPresencaManualDocente(func, 'Presente')}
                                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isP
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-400 hover:bg-emerald-100'
                                  }`}
                                >
                                  Presente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => marcarPresencaManualDocente(func, 'Falta_Injustificada', 'Falta injustificada')}
                                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isFI
                                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                      : 'bg-red-50 text-red-800 border-red-400 hover:bg-red-100'
                                  }`}
                                >
                                  Falta
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFuncionarioParaJustificar(func)}
                                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isFJ
                                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                      : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
                                  }`}
                                >
                                  Justificar
                                </button>
                                {reg && (
                                  <button
                                    type="button"
                                    onClick={() => limparPontoDocenteDia(func.id)}
                                    className="px-2 py-1.5 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg cursor-pointer"
                                    title="Limpar marcação do dia"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 inline" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Leitura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <QrScannerModal
        isOpen={showQrScannerModal}
        onClose={() => setShowQrScannerModal(false)}
        titulo="Leitor QR de Presença Escolar"
        subtitulo="Leia o QR Code do passe de qualquer aluno para registar presença imediata no mapa."
        acaoRotulo="Confirmar Presença"
        alunos={alunos}
        turmas={turmas}
        onStudentMatched={handleRegistrarPresencaPorQr}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-gray-700">Data de marcação da presença:</span>
          <AngolaDateInput
            value={qrScanData}
            onChange={(v) => {
              if (v) setQrScanData(v);
            }}
          />
        </div>
      </QrScannerModal>

      {alunoParaJustificar && (
        <ModalJustificarFaltaAluno
          isOpen={!!alunoParaJustificar}
          onClose={() => setAlunoParaJustificar(null)}
          aluno={alunoParaJustificar}
          turma={turmaSelecionada}
          currentUser={currentUser}
          escolaId={escola.id}
          onSalvo={() => {
            setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
          }}
        />
      )}

      {funcionarioParaJustificar && (
        <ModalJustificarFaltaFuncionario
          isOpen={!!funcionarioParaJustificar}
          onClose={() => setFuncionarioParaJustificar(null)}
          funcionario={funcionarioParaJustificar}
          dataFaltaInicial={dataPontoDocentes}
          currentUser={currentUser}
          escolaId={escola.id}
          onSalvar={(registo) => {
            if (onSalvarRegistoAssiduidade) {
              onSalvarRegistoAssiduidade(registo);
            } else {
              dbService.salvarPresenca(registo);
            }
            setPresencasDocentesLocal(dbService.getPresencas());
            onAtualizarAssiduidade?.();
          }}
        />
      )}
    </div>
  );
};
