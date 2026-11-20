import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Layers, 
  BookOpen, 
  UserCheck, 
  Plus, 
  AlertCircle, 
  Check, 
  Award,
  Sparkles,
  Gavel,
  Clock,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  Boxes,
  Users,
  Building2,
  CheckSquare,
  FileSpreadsheet,
  Sliders,
  Calculator,
  Filter,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  AtribuicaoDocente, 
  Funcionario, 
  ComissaoJuri, 
  MembroComissaoJuri, 
  EstadoAno, 
  Trimestre, 
  NivelEnsino,
  AnoLectivoConfig,
  TurnoConfig,
  ClasseConfig,
  CursoConfig,
  AreaFormacaoConfig,
  SalaAulaConfig,
  TipoAvaliacaoConfig,
  RegraCalculoMAC
} from '../types';
import { dbService } from '../services/storage';
import { 
  CLASSES_SEGUNDO_CICLO,
  CURSOS_SEGUNDO_CICLO,
  SALAS_PADRAO_ESCOLA,
  TODAS_CLASSES_OFICIAIS_MED,
  AREAS_FORMACAO_SUGERIDAS_MED,
  isSegundoCiclo,
  isPrimeiroCiclo,
  isEnsinoPrimario,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  getNivelEnsinoPorClasse,
  normalizarClasse,
  getDisciplinasDaTurma,
  getDisciplinasPorClasseECiclo,
  formatarCicloPorClasse,
  getSalaDaTurma,
  getCursoDaTurma,
  validarCriacaoTurma
} from '../services/academicHierarchyService';
import { sanitizeSearchInput } from '../utils/securitySanitizer';
import { ExcelSchoolDataImportModal } from './ExcelSchoolDataImportModal';

export type AcademicSubTab = 
  | 'anos' 
  | 'classes' 
  | 'cursos' 
  | 'disciplinas' 
  | 'turmas' 
  | 'turnos' 
  | 'atribuicoes' 
  | 'juris'
  | 'configuracoes_avaliacoes';

interface AcademicManagementViewProps {
  escola: Escola;
  turmas: Turma[];
  disciplinas: Disciplina[];
  atribuicoes: AtribuicaoDocente[];
  funcionarios: Funcionario[];
  juris: ComissaoJuri[];
  onSalvarEscola: (escola: Escola) => void;
  onSalvarTurma: (turma: Turma) => void;
  onEliminarTurma?: (id: string) => void;
  onSalvarDisciplina?: (disc: Disciplina) => void;
  onEliminarDisciplina?: (id: string) => void;
  onLimparDisciplinas?: () => void;
  onSalvarAtribuicao: (atrib: AtribuicaoDocente) => void;
  onRemoverAtribuicao: (id: string) => void;
  onSalvarJuri: (juri: ComissaoJuri) => void;
  onNavigateToJury?: () => void;
  initialSubTab?: AcademicSubTab;
  onAnoLectivoAlterado?: (novoAno: string) => void;
}

export const AcademicManagementView: React.FC<AcademicManagementViewProps> = ({
  escola,
  turmas,
  disciplinas,
  atribuicoes,
  funcionarios,
  juris,
  onSalvarEscola,
  onSalvarTurma,
  onEliminarTurma,
  onSalvarDisciplina,
  onEliminarDisciplina,
  onLimparDisciplinas,
  onSalvarAtribuicao,
  onRemoverAtribuicao,
  onSalvarJuri,
  onNavigateToJury,
  initialSubTab = 'anos',
  onAnoLectivoAlterado
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AcademicSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const currentUser = dbService.getCurrentUser();
  const isAdminGeral = currentUser?.role === 'AdminGeral';

  // Lista de anos letivos, turnos e classes configurados estritamente para esta escola
  const [anosConfigs, setAnosConfigs] = useState<AnoLectivoConfig[]>(() => dbService.getAnosLectivosConfigs(escola.id));
  const [turnosConfigs, setTurnosConfigs] = useState<TurnoConfig[]>(() => dbService.getTurnosConfigs(escola.id));
  const [classesConfigs, setClassesConfigs] = useState<ClasseConfig[]>(() => dbService.getClassesConfigs(escola.id));

  // Mensagens de feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modal Novo Ano Letivo
  const [showNovoAnoModal, setShowNovoAnoModal] = useState(false);
  const [novoAnoNome, setNovoAnoNome] = useState('');
  const [novoAnoEstado, setNovoAnoEstado] = useState<EstadoAno>('Planeamento');
  const [novoAnoDataInicio, setNovoAnoDataInicio] = useState('');
  const [novoAnoDataFim, setNovoAnoDataFim] = useState('');

  // Modal Editar Ano Letivo
  const [showEditarAnoModal, setShowEditarAnoModal] = useState(false);
  const [anoSendoEditado, setAnoSendoEditado] = useState<AnoLectivoConfig | null>(null);
  const [editAnoRotulo, setEditAnoRotulo] = useState('');
  const [editAnoEstado, setEditAnoEstado] = useState<EstadoAno>('Aberto');
  const [editAnoDataInicio, setEditAnoDataInicio] = useState('');
  const [editAnoDataFim, setEditAnoDataFim] = useState('');
  const [editAnoDescricao, setEditAnoDescricao] = useState('');

  // Modal Nova Classe & Editar Classe
  const [showNovaClasseModal, setShowNovaClasseModal] = useState(false);
  const [novaClasseNome, setNovaClasseNome] = useState('1ª');
  const [novaClassePersonalizada, setNovaClassePersonalizada] = useState(false);
  const [novaClasseNivel, setNovaClasseNivel] = useState<NivelEnsino>('Primario');
  const [novaClasseCiclo, setNovaClasseCiclo] = useState('Ensino Primário');
  const [novaClasseRegime, setNovaClasseRegime] = useState('Avaliação Contínua e Provas Trimestrais (0–10)');
  const [novaClasseDescricao, setNovaClasseDescricao] = useState('');
  const [novaClasseMultiplas, setNovaClasseMultiplas] = useState<string[]>([]);

  const [showEditarClasseModal, setShowEditarClasseModal] = useState(false);
  const [classeSendoEditada, setClasseSendoEditada] = useState<ClasseConfig | null>(null);
  const [editClasseNome, setEditClasseNome] = useState('');
  const [editClasseNivel, setEditClasseNivel] = useState<NivelEnsino>('Primario');
  const [editClasseCiclo, setEditClasseCiclo] = useState('');
  const [editClasseRegime, setEditClasseRegime] = useState('');
  const [editClasseDescricao, setEditClasseDescricao] = useState('');
  const [editClasseAtiva, setEditClasseAtiva] = useState(true);

  // Modal Nova Turma & Editar Turma
  const [showNovaTurmaModal, setShowNovaTurmaModal] = useState(false);
  const [novaTurmaNome, setNovaTurmaNome] = useState('');
  const [novaTurmaClasse, setNovaTurmaClasse] = useState('1ª');
  const [novaTurmaNivel, setNovaTurmaNivel] = useState<NivelEnsino>('Primario');
  const [novaTurmaTurno, setNovaTurmaTurno] = useState<string>('Manhã');
  const [novaTurmaSala, setNovaTurmaSala] = useState('Sala 01');
  const [novaTurmaCapacidade, setNovaTurmaCapacidade] = useState(45);
  const [novaTurmaCurso, setNovaTurmaCurso] = useState('');

  const [showEditarTurmaModal, setShowEditarTurmaModal] = useState(false);
  const [turmaSendoEditada, setTurmaSendoEditada] = useState<Turma | null>(null);
  const [editTurmaNome, setEditTurmaNome] = useState('');
  const [editTurmaClasse, setEditTurmaClasse] = useState('');
  const [editTurmaNivel, setEditTurmaNivel] = useState<NivelEnsino>('Primario');
  const [editTurmaTurno, setEditTurmaTurno] = useState<string>('Manhã');
  const [editTurmaSala, setEditTurmaSala] = useState('');
  const [editTurmaCapacidade, setEditTurmaCapacidade] = useState(45);
  const [editTurmaCoordenadorId, setEditTurmaCoordenadorId] = useState('');
  const [editTurmaCurso, setEditTurmaCurso] = useState('');

  // Modal Nova Disciplina & Editar Disciplina
  const [showNovaDisciplinaModal, setShowNovaDisciplinaModal] = useState(false);
  const [novaDiscNome, setNovaDiscNome] = useState('');
  const [novaDiscCodigo, setNovaDiscCodigo] = useState('');
  const [novaDiscCarga, setNovaDiscCarga] = useState(4);
  const [novaDiscComponente, setNovaDiscComponente] = useState<'Geral' | 'Específica' | 'Opção'>('Geral');
  const [novaDiscClasses, setNovaDiscClasses] = useState<string[]>(['7ª']);
  const [novaDiscCiclo, setNovaDiscCiclo] = useState<string>('Iº Ciclo');
  const [novaDiscCursos, setNovaDiscCursos] = useState<string[]>([]);
  const [filtroCicloDisciplinas, setFiltroCicloDisciplinas] = useState<string>('TODOS');
  const [filtroClasseDisciplinas, setFiltroClasseDisciplinas] = useState<string>('TODAS');
  const [filtroCursoDisciplinas, setFiltroCursoDisciplinas] = useState<string>('TODOS');

  // Modal Excel Import
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);

  // Configurações de Avaliação & Fórmulas pelo Diretor / Admin Geral
  const [tiposAvaliacaoList, setTiposAvaliacaoList] = useState<TipoAvaliacaoConfig[]>(() => dbService.getTiposAvaliacao());
  const [regrasMACList, setRegrasMACList] = useState<RegraCalculoMAC[]>(() => dbService.obterRegrasMAC());
  const [showNovoTipoModal, setShowNovoTipoModal] = useState(false);
  const [novoTipoNome, setNovoTipoNome] = useState('');
  const [novoTipoCodigo, setNovoTipoCodigo] = useState('');
  const [novoTipoEscala, setNovoTipoEscala] = useState<10 | 20>(20);
  const [novoTipoObrigatorio, setNovoTipoObrigatorio] = useState(true);
  const [novoTipoPeso, setNovoTipoPeso] = useState(1);
  const [novoTipoClasses, setNovoTipoClasses] = useState<string[]>(['7ª', '8ª', '9ª']);
  const [novoTipoCiclos, setNovoTipoCiclos] = useState<string[]>(['Iº Ciclo']);

  // Parâmetros de Cálculo da Classe e Trimestre
  const [regraClasseSel, setRegraClasseSel] = useState<string>('7ª');
  const [regraTrimestreSel, setRegraTrimestreSel] = useState<Trimestre | 'Todos'>('3º Trimestre');
  const [regraFormulaTipo, setRegraFormulaTipo] = useState<'ARITMETICA_SIMPLES' | 'PONDERADA_POR_TIPO' | 'FORMULA_CUSTOMIZADA'>('ARITMETICA_SIMPLES');
  const [regra3TrimestreTipo, setRegra3TrimestreTipo] = useState<'MED_ANGOLA_PADRAO' | 'PONDERADO_EXAME' | 'CUSTOMIZADO'>('PONDERADO_EXAME');
  const [regraPesoExame, setRegraPesoExame] = useState<number>(60);
  const [regraPesoMT, setRegraPesoMT] = useState<number>(40);
  const [regraFormulaCustom, setRegraFormulaCustom] = useState<string>('MF = (MT_Geral * 0.4) + (Exame * 0.6)');

  const [showEditarDisciplinaModal, setShowEditarDisciplinaModal] = useState(false);
  const [disciplinaSendoEditada, setDisciplinaSendoEditada] = useState<Disciplina | null>(null);
  const [editDiscNome, setEditDiscNome] = useState('');
  const [editDiscCodigo, setEditDiscCodigo] = useState('');
  const [editDiscCarga, setEditDiscCarga] = useState(4);
  const [editDiscComponente, setEditDiscComponente] = useState<'Geral' | 'Específica' | 'Opção'>('Geral');
  const [editDiscNivel, setEditDiscNivel] = useState<NivelEnsino>('ICiclo');
  const [editDiscClasses, setEditDiscClasses] = useState<string[]>([]);
  const [editDiscCiclo, setEditDiscCiclo] = useState<string>('Ensino Primário');
  const [editDiscCursos, setEditDiscCursos] = useState<string[]>([]);

  // Gestão de Áreas de Formação (criação livre pela Direção)
  const [areasFormacaoList, setAreasFormacaoList] = useState<AreaFormacaoConfig[]>(() => dbService.getAreasFormacao(escola.id));
  const [showNovaAreaModal, setShowNovaAreaModal] = useState(false);
  const [novaAreaNome, setNovaAreaNome] = useState('');
  const [novaAreaCodigo, setNovaAreaCodigo] = useState('');
  const [novaAreaCiclo, setNovaAreaCiclo] = useState('IIº Ciclo do Ensino Secundário');
  const [novaAreaDescricao, setNovaAreaDescricao] = useState('');
  const [showEditarAreaModal, setShowEditarAreaModal] = useState(false);
  const [areaSendoEditada, setAreaSendoEditada] = useState<AreaFormacaoConfig | null>(null);
  const [editAreaNome, setEditAreaNome] = useState('');
  const [editAreaCodigo, setEditAreaCodigo] = useState('');
  const [editAreaCiclo, setEditAreaCiclo] = useState('');
  const [editAreaDescricao, setEditAreaDescricao] = useState('');

  // Modal Novo Curso & Editar Curso
  const [showNovoCursoModal, setShowNovoCursoModal] = useState(false);
  const [novoCursoNome, setNovoCursoNome] = useState('');
  const [novoCursoCodigo, setNovoCursoCodigo] = useState('');
  const [novoCursoArea, setNovoCursoArea] = useState('Ciências Físicas e Biológicas');
  const [novoCursoAreaCustom, setNovoCursoAreaCustom] = useState('');
  const [novoCursoDuracao, setNovoCursoDuracao] = useState('3 Anos');
  const [novoCursoCiclo, setNovoCursoCiclo] = useState('IIº Ciclo');
  const [showEditarCursoModal, setShowEditarCursoModal] = useState(false);
  const [cursoSendoEditado, setCursoSendoEditado] = useState<CursoConfig | null>(null);
  const [editCursoNome, setEditCursoNome] = useState('');
  const [editCursoCodigo, setEditCursoCodigo] = useState('');
  const [editCursoArea, setEditCursoArea] = useState('');
  const [editCursoAreaCustom, setEditCursoAreaCustom] = useState('');
  const [editCursoDuracao, setEditCursoDuracao] = useState('3 Anos');
  const [editCursoCiclo, setEditCursoCiclo] = useState('IIº Ciclo');
  const [cursosList, setCursosList] = useState<CursoConfig[]>(() => {
    return dbService.getCursos(escola.id);
  });

  // Gestão de Salas de Aulas (relacionadas a Turmas, Horários, Passes e Documentos)
  const [salasList, setSalasList] = useState<SalaAulaConfig[]>(() => dbService.getSalasAulas(escola.id));
  const [showNovaSalaModal, setShowNovaSalaModal] = useState(false);
  const [novaSalaNome, setNovaSalaNome] = useState('');
  const [novaSalaTipo, setNovaSalaTipo] = useState('Sala de Aula');
  const [novaSalaCapacidade, setNovaSalaCapacidade] = useState(45);
  const [novaSalaBloco, setNovaSalaBloco] = useState('');
  const [showEditarSalaModal, setShowEditarSalaModal] = useState(false);
  const [salaSendoEditada, setSalaSendoEditada] = useState<SalaAulaConfig | null>(null);
  const [editSalaNome, setEditSalaNome] = useState('');
  const [editSalaTipo, setEditSalaTipo] = useState('Sala de Aula');
  const [editSalaCapacidade, setEditSalaCapacidade] = useState(45);
  const [editSalaBloco, setEditSalaBloco] = useState('');

  // Modal Novo Turno
  const [showNovoTurnoModal, setShowNovoTurnoModal] = useState(false);
  const [novoTurnoNome, setNovoTurnoNome] = useState<'Manhã' | 'Tarde' | 'Noite' | string>('Manhã');
  const [novoTurnoInicio, setNovoTurnoInicio] = useState('07:30');
  const [novoTurnoFim, setNovoTurnoFim] = useState('12:30');
  const [novoTurnoTolerancia, setNovoTurnoTolerancia] = useState(15);

  useEffect(() => {
    setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
    setTurnosConfigs(dbService.getTurnosConfigs(escola.id));
    setClassesConfigs(dbService.getClassesConfigs(escola.id));
    setCursosList(dbService.getCursos(escola.id));
    setAreasFormacaoList(dbService.getAreasFormacao(escola.id));
    setSalasList(dbService.getSalasAulas(escola.id));
  }, [escola.id]);

  // Listas relacionais unificadas (criações da Direção + padrões MED)
  const areasDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    areasFormacaoList.filter(a => a.ativo !== false).forEach(a => {
      if (a.nome?.trim()) map.set(a.nome.trim().toLowerCase(), a.nome.trim());
    });
    cursosList.forEach(c => {
      if (c.area?.trim()) map.set(c.area.trim().toLowerCase(), c.area.trim());
    });
    AREAS_FORMACAO_SUGERIDAS_MED.forEach(a => {
      if (!map.has(a.toLowerCase())) map.set(a.toLowerCase(), a);
    });
    return Array.from(map.values());
  }, [areasFormacaoList, cursosList]);

  const cursosDisponiveisEscola = useMemo(() => {
    const map = new Map<string, string>();
    cursosList.filter(c => c.ativo !== false).forEach(c => {
      if (c.nome?.trim()) map.set(c.nome.trim().toLowerCase(), c.nome.trim());
    });
    CURSOS_SEGUNDO_CICLO.forEach(c => {
      if (!map.has(c.toLowerCase())) map.set(c.toLowerCase(), c);
    });
    return Array.from(map.values());
  }, [cursosList]);

  const turnosDisponiveisEscola = useMemo(() => {
    const map = new Map<string, string>();
    turnosConfigs.filter(t => t.ativo !== false).forEach(t => {
      if (t.nome?.trim()) map.set(t.nome.trim().toLowerCase(), t.nome.trim());
    });
    ['Manhã', 'Tarde', 'Noite'].forEach(t => {
      if (!map.has(t.toLowerCase())) map.set(t.toLowerCase(), t);
    });
    return Array.from(map.values());
  }, [turnosConfigs]);

  const salasDisponiveisEscola = useMemo(() => {
    const map = new Map<string, string>();
    salasList.filter(s => s.ativo !== false).forEach(s => {
      if (s.nome?.trim()) map.set(s.nome.trim().toLowerCase(), s.nome.trim());
    });
    turmas.forEach(t => {
      if (t.sala?.trim()) map.set(t.sala.trim().toLowerCase(), t.sala.trim());
    });
    SALAS_PADRAO_ESCOLA.forEach(s => {
      if (!map.has(s.toLowerCase())) map.set(s.toLowerCase(), s);
    });
    return Array.from(map.values());
  }, [salasList, turmas]);

  // Modal Atribuição Docente
  const [showAtribuicaoModal, setShowAtribuicaoModal] = useState(false);
  const [atribProfId, setAtribProfId] = useState('');
  const [atribTurmaId, setAtribTurmaId] = useState('');
  const [atribDiscId, setAtribDiscId] = useState('');
  const [atribEhCoordenador, setAtribEhCoordenador] = useState(false);

  // Modal Comissão de Júri
  const [showJuriModal, setShowJuriModal] = useState(false);
  const [juriNome, setJuriNome] = useState('');
  const [juriTurmaId, setJuriTurmaId] = useState('');
  const [juriPresidenteId, setJuriPresidenteId] = useState('');
  const [juriVogal1Id, setJuriVogal1Id] = useState('');
  const [juriVogal2Id, setJuriVogal2Id] = useState('');

  const professoresDisponiveis = funcionarios.filter(
    f => (!escola.id || escola.id === 'todas' || f.escolaId === escola.id) && (f.ehProfessor || f.ehAdministrativoQueLeciona)
  );

  // Turmas e Atribuições Estritamente Isoladas pelo Ano Letivo Ativo da escola
  // Novos anos letivos e novas escolas iniciam em estado virgem sem vazar turmas de anos anteriores
  const turmasDoAnoActivo = useMemo(() => {
    const ano = escola.anoLectivoActivo;
    if (!ano) return turmas;
    return turmas.filter(t => t.anoLectivo === ano);
  }, [turmas, escola.anoLectivoActivo]);

  const atribuicoesDoAnoActivo = useMemo(() => {
    const ano = escola.anoLectivoActivo;
    if (!ano) return atribuicoes;
    return atribuicoes.filter(at => at.anoLectivo === ano);
  }, [atribuicoes, escola.anoLectivoActivo]);

  // 1. GESTÃO DE ANOS LETIVOS
  const handleCriarNovoAno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAnoNome.trim()) return;

    try {
      const criado = dbService.criarNovoAnoLetivo(
        novoAnoNome.trim(), 
        novoAnoEstado, 
        escola.id,
        novoAnoDataInicio || undefined,
        novoAnoDataFim || undefined
      );

      setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
      if (!escola.anoLectivoActivo && novoAnoEstado === 'Aberto') {
        onSalvarEscola({ ...escola, anoLectivoActivo: criado.rotulo, estadoAno: 'Aberto' });
        if (onAnoLectivoAlterado) onAnoLectivoAlterado(criado.rotulo);
      }
      setShowNovoAnoModal(false);
      setNovoAnoNome('');
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Ano letivo ${criado.ano} criado com sucesso para esta escola! A nova instância foi gerada virgem e isolada.`
      });
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao criar ano letivo.' });
    }
  };

  const handleAtivarAno = (ano: string) => {
    dbService.setAnoLectivoActivo(ano, escola.id);
    onSalvarEscola({ ...escola, anoLectivoActivo: ano, estadoAno: 'Aberto' });
    if (onAnoLectivoAlterado) onAnoLectivoAlterado(ano);
    setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
    setFeedbackMsg({ tipo: 'sucesso', texto: `Ano letivo ${ano} definido como ativo no sistema.` });
  };

  const handleAlterarEstadoAno = (ano: string, novoEstado: EstadoAno) => {
    if (!ano) return;
    dbService.definirEstadoAnoLectivo(ano, novoEstado, escola.id);
    setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
    if (escola.anoLectivoActivo === ano) {
      onSalvarEscola({ ...escola, estadoAno: novoEstado });
    }
    setFeedbackMsg({ tipo: 'sucesso', texto: `Estado do ano letivo ${ano} alterado para "${novoEstado}".` });
  };

  const handleTrimestreChange = (novoTrimestre: Trimestre) => {
    onSalvarEscola({ ...escola, trimestreActivo: novoTrimestre });
    setFeedbackMsg({ tipo: 'sucesso', texto: `Trimestre vigente atualizado para ${novoTrimestre}º Trimestre.` });
  };

  const handleAbrirEditarAno = (anoCfg: AnoLectivoConfig) => {
    setAnoSendoEditado(anoCfg);
    setEditAnoRotulo(anoCfg.rotulo || anoCfg.ano || '');
    setEditAnoEstado(anoCfg.estado || 'Aberto');
    setEditAnoDataInicio(anoCfg.dataInicio || '');
    setEditAnoDataFim(anoCfg.dataFim || '');
    setEditAnoDescricao(anoCfg.descricao || '');
    setShowEditarAnoModal(true);
  };

  const handleSalvarEditarAno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anoSendoEditado || !editAnoRotulo.trim()) return;

    const anoAtualizado: AnoLectivoConfig = {
      ...anoSendoEditado,
      escolaId: anoSendoEditado.escolaId || escola.id,
      rotulo: editAnoRotulo.trim(),
      ano: editAnoRotulo.trim(),
      estado: editAnoEstado,
      dataInicio: editAnoDataInicio,
      dataFim: editAnoDataFim,
      descricao: editAnoDescricao.trim()
    };

    dbService.salvarAnoLectivoConfig(anoAtualizado);
    setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
    if (escola.anoLectivoActivo === anoSendoEditado.rotulo) {
      onSalvarEscola({ ...escola, anoLectivoActivo: anoAtualizado.rotulo, estadoAno: anoAtualizado.estado });
    }
    setShowEditarAnoModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Ano letivo ${anoAtualizado.rotulo} atualizado com êxito.` });
  };

  // Estados para Eliminação Segura de Ano Letivo
  const [anoParaEliminarSeguro, setAnoParaEliminarSeguro] = useState<AnoLectivoConfig | null>(null);
  const [confirmacaoTextoEliminarAno, setConfirmacaoTextoEliminarAno] = useState('');

  const handleConfirmarEliminarAnoSeguro = () => {
    if (!anoParaEliminarSeguro) return;
    const anoNome = anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo;
    if (anoNome === escola.anoLectivoActivo) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: `Não é permitido eliminar o ano letivo ativo (${anoNome}). Primeiro defina outro ano letivo como ativo antes de excluir este.`
      });
      setAnoParaEliminarSeguro(null);
      return;
    }

    if (confirmacaoTextoEliminarAno.trim() !== anoNome.trim()) {
      alert(`O texto digitado não coincide com o nome do ano letivo (${anoNome}).`);
      return;
    }

    const sucesso = dbService.eliminarAnoLectivoConfig(anoParaEliminarSeguro.id || anoNome, escola.id);
    if (sucesso) {
      setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
      setFeedbackMsg({ tipo: 'sucesso', texto: `Ano letivo ${anoNome} eliminado com segurança!` });
      setAnoParaEliminarSeguro(null);
      setConfirmacaoTextoEliminarAno('');
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: 'Não foi possível eliminar o único ano letivo ativo da escola.' });
    }
  };

  const handleReplicarAtribuicoesAnoAnterior = () => {
    if (!escola.anoLectivoActivo) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Defina ou crie primeiro um ano letivo ativo para esta instituição.' });
      return;
    }
    if (!confirm(`Deseja replicar as classes, turmas, disciplinas, atribuições docentes e coordenações do ano lectivo anterior para o ano letivo ativo (${escola.anoLectivoActivo})?\n\nAs turmas e os professores manterão a mesma estrutura organizada do ano anterior.`)) {
      return;
    }

    const resultado = dbService.replicarAtribuicoesAnoAnterior(escola.id, escola.anoLectivoActivo);
    if (resultado.sucesso) {
      if (resultado.novasTurmas && resultado.novasTurmas.length > 0) {
        resultado.novasTurmas.forEach(t => onSalvarTurma(t));
      }
      resultado.novasAtribuicoes.forEach(nova => {
        onSalvarAtribuicao(nova);
      });
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `${resultado.mensagem}. Estrutura retribuída com sucesso para o ano letivo ativo!`
      });
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: resultado.mensagem
      });
    }
  };

  const handleLimparTodasDisciplinas = () => {
    if (!confirm('Tem a certeza de que deseja limpar todas as disciplinas existentes desta instituição para cadastrar novas disciplinas? Esta ação não pode ser revertida.')) {
      return;
    }
    dbService.limparTodasDisciplinas(escola.id);
    if (onLimparDisciplinas) {
      onLimparDisciplinas();
    } else if (onEliminarDisciplina) {
      disciplinas.forEach(d => onEliminarDisciplina(d.id));
    }
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: 'Todas as disciplinas desta instituição foram limpas com sucesso. A Direção tem agora a grelha livre para cadastrar as disciplinas classe a classe.'
    });
  };

  const handleEliminarAno = (idOuRotulo: string) => {
    const anoObj = anosConfigs.find(a => a.id === idOuRotulo || (a.ano || a.rotulo) === idOuRotulo);
    if (anoObj) {
      setAnoParaEliminarSeguro(anoObj);
      setConfirmacaoTextoEliminarAno('');
    }
  };

  // HANDLERS DE CLASSES
  const aplicarAutoClassDefaults = (classeSelecionada: string) => {
    setNovaClasseNome(classeSelecionada);
    const nivel = getNivelEnsinoPorClasse(classeSelecionada);
    const ciclo = formatarCicloPorClasse(classeSelecionada);
    setNovaClasseNivel(nivel);
    setNovaClasseCiclo(ciclo);
    setNovaClasseRegime(
      isEnsinoPrimario(classeSelecionada)
        ? 'Avaliação Contínua e Provas Trimestrais (Escala 0–10)'
        : ['6ª', '9ª', '12ª', '13ª'].includes(normalizarClasse(classeSelecionada))
          ? 'Avaliação Contínua, Provas e Exame Nacional (Escala 0–20)'
          : 'Avaliação Contínua e Provas Trimestrais (Escala 0–20)'
    );
  };

  const handleCriarClasse = (e: React.FormEvent) => {
    e.preventDefault();
    const listaCriar = !novaClassePersonalizada && novaClasseMultiplas.length > 0
      ? novaClasseMultiplas
      : [novaClasseNome.trim()].filter(Boolean);

    if (listaCriar.length === 0) return;

    const existentesNorm = new Set(classesConfigs.map(c => normalizarClasse(c.nome)));
    let criadas = 0;

    listaCriar.forEach((clsNome, idx) => {
      const norm = normalizarClasse(clsNome);
      if (listaCriar.length > 1 && existentesNorm.has(norm)) return;
      const nivel = listaCriar.length > 1 ? getNivelEnsinoPorClasse(clsNome) : novaClasseNivel;
      const ciclo = listaCriar.length > 1 ? formatarCicloPorClasse(clsNome) : (novaClasseCiclo.trim() || formatarCicloPorClasse(clsNome));
      const ordemMED = TODAS_CLASSES_OFICIAIS_MED.indexOf(norm);
      const nova: ClasseConfig = {
        id: `cls-${escola.id}-${Date.now()}-${idx}`,
        escolaId: escola.id,
        nome: clsNome === 'Iniciação' || clsNome.toLowerCase().includes('classe') ? clsNome : `${clsNome} Classe`,
        nivelEnsino: nivel,
        ciclo,
        regimeAvaliacao: listaCriar.length > 1
          ? (isEnsinoPrimario(clsNome) ? 'Escala 0–10 • Avaliação Trimestral' : 'Escala 0–20 • Avaliação Trimestral')
          : novaClasseRegime,
        descricao: novaClasseDescricao.trim() || `Classe lecionada no âmbito do ${ciclo}`,
        ordem: ordemMED >= 0 ? ordemMED : classesConfigs.length + idx,
        ativa: true
      };
      dbService.salvarClasseConfig(nova);
      criadas++;
    });

    setClassesConfigs(dbService.getClassesConfigs(escola.id));
    setShowNovaClasseModal(false);
    setNovaClasseNome('1ª');
    setNovaClasseMultiplas([]);
    setNovaClassePersonalizada(false);
    setNovaClasseDescricao('');
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: criadas > 1
        ? `${criadas} classes cadastradas e integradas com sucesso (Iniciação à 13ª)!`
        : criadas === 1
          ? `Classe "${listaCriar[0]}" cadastrada com sucesso.`
          : 'As classes selecionadas já se encontram registadas nesta escola.'
    });
  };

  const handleAbrirEditarClasse = (cls: ClasseConfig) => {
    setClasseSendoEditada(cls);
    setEditClasseNome(cls.nome);
    setEditClasseNivel(cls.nivelEnsino || 'Primario');
    setEditClasseCiclo(cls.ciclo || '');
    setEditClasseRegime(cls.regimeAvaliacao || '');
    setEditClasseDescricao(cls.descricao || '');
    setEditClasseAtiva(cls.ativa ?? true);
    setShowEditarClasseModal(true);
  };

  const handleSalvarEditarClasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classeSendoEditada || !editClasseNome.trim()) return;

    const atualizada: ClasseConfig = {
      ...classeSendoEditada,
      escolaId: classeSendoEditada.escolaId || escola.id,
      nome: editClasseNome.trim(),
      nivelEnsino: editClasseNivel,
      ciclo: editClasseCiclo.trim(),
      regimeAvaliacao: editClasseRegime.trim(),
      descricao: editClasseDescricao.trim(),
      ativa: editClasseAtiva
    };

    dbService.salvarClasseConfig(atualizada);
    setClassesConfigs(dbService.getClassesConfigs(escola.id));
    setShowEditarClasseModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Classe "${atualizada.nome}" atualizada com sucesso.` });
  };

  const handleEliminarClasse = (id: string, nome: string) => {
    if (!confirm(`Tem certeza de que deseja eliminar a classe "${nome}"?`)) return;

    const ok = dbService.eliminarClasseConfig(id);
    if (ok) {
      setClassesConfigs(dbService.getClassesConfigs(escola.id));
      setFeedbackMsg({ tipo: 'sucesso', texto: `Classe "${nome}" eliminada com sucesso.` });
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: 'Erro ao eliminar a classe.' });
    }
  };

  // HANDLERS DE TURMAS
  const handleAbrirEditarTurma = (t: Turma) => {
    setTurmaSendoEditada(t);
    setEditTurmaNome(t.nome);
    setEditTurmaClasse(t.classe);
    setEditTurmaNivel(t.nivelEnsino || getNivelEnsinoPorClasse(t.classe));
    setEditTurmaTurno(t.turno || 'Manhã');
    setEditTurmaSala(t.sala || 'Sala 01');
    setEditTurmaCapacidade(t.capacidade || 45);
    setEditTurmaCoordenadorId(t.coordenadorId || '');
    setEditTurmaCurso(t.curso || (isSegundoCiclo(t.classe) ? (cursosDisponiveisEscola[0] || 'Ciências Físicas e Biológicas (PUNIV)') : ''));
    setShowEditarTurmaModal(true);
  };

  const handleSalvarEditarTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSendoEditada || !editTurmaNome.trim()) return;

    const validacao = validarCriacaoTurma({
      nome: editTurmaNome,
      classe: editTurmaClasse,
      sala: editTurmaSala,
      curso: editTurmaCurso
    });

    if (!validacao.valida) {
      setFeedbackMsg({ tipo: 'erro', texto: validacao.erro || 'Dados inválidos para a turma.' });
      return;
    }

    const cursoObj = cursosList.find(c => c.nome.toLowerCase() === validacao.cursoAjustado.toLowerCase());
    const salaObj = salasList.find(s => s.nome.toLowerCase() === validacao.salaAjustada.toLowerCase());

    const atualizada: Turma = {
      ...turmaSendoEditada,
      nome: editTurmaNome.trim(),
      classe: editTurmaClasse,
      nivelEnsino: getNivelEnsinoPorClasse(editTurmaClasse),
      turno: editTurmaTurno,
      sala: validacao.salaAjustada,
      salaId: salaObj?.id,
      curso: validacao.cursoAjustado,
      cursoId: cursoObj?.id,
      areaFormacao: cursoObj?.area,
      capacidade: editTurmaCapacidade,
      coordenadorId: editTurmaCoordenadorId || undefined
    };

    onSalvarTurma(atualizada);
    setShowEditarTurmaModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Turma "${atualizada.nome}" atualizada com coerência acadêmica.` });
  };

  const handleEliminarTurmaLocal = (id: string, nome: string) => {
    if (!confirm(`Tem certeza de que deseja eliminar a turma "${nome}"? Esta ação removerá a turma do ano letivo atual.`)) return;

    if (onEliminarTurma) {
      onEliminarTurma(id);
    } else {
      dbService.eliminarTurma(id);
    }
    setFeedbackMsg({ tipo: 'sucesso', texto: `Turma "${nome}" eliminada do sistema.` });
  };

  const handleAbrirEditarDisciplina = (disc: Disciplina) => {
    setDisciplinaSendoEditada(disc);
    setEditDiscNome(disc.nome);
    setEditDiscCodigo(disc.codigo || disc.sigla || '');
    setEditDiscCarga(disc.cargaHorariaSemanal || 4);
    setEditDiscComponente((disc.componente as any) || 'Geral');
    setEditDiscNivel(disc.nivelEnsino || 'ICiclo');
    setEditDiscClasses(disc.classes || (disc.classe ? [disc.classe] : ['7ª']));
    setEditDiscCiclo(disc.ciclo || 'Ensino Primário');
    setEditDiscCursos(
      disc.cursos && disc.cursos.length > 0
        ? disc.cursos
        : (disc.curso ? [disc.curso] : [])
    );
    setShowEditarDisciplinaModal(true);
  };

  const handleSalvarEditarDisciplina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplinaSendoEditada || !editDiscNome.trim()) return;

    const classesAssoc = editDiscClasses.length > 0 ? editDiscClasses : (disciplinaSendoEditada.classes || ['7ª']);
    const primeiraCls = classesAssoc[0];
    const nivel = isEnsinoPrimario(primeiraCls) 
      ? 'Primario' 
      : isPrimeiroCiclo(primeiraCls) 
        ? 'ICiclo' 
        : 'IICiclo';

    const cursosAssoc = editDiscCursos.filter(Boolean);
    const atualizada: Disciplina = {
      ...disciplinaSendoEditada,
      escolaId: disciplinaSendoEditada.escolaId || escola.id,
      nome: editDiscNome.trim(),
      sigla: editDiscCodigo.trim().substring(0, 4).toUpperCase() || editDiscNome.trim().substring(0, 3).toUpperCase(),
      codigo: editDiscCodigo.trim() || `DISC-${Math.floor(100 + Math.random() * 900)}`,
      cargaHorariaSemanal: editDiscCarga,
      componente: editDiscComponente,
      nivelEnsino: nivel as any,
      classes: classesAssoc,
      classe: primeiraCls,
      ciclo: editDiscCiclo || formatarCicloPorClasse(primeiraCls),
      cursos: cursosAssoc.length > 0 ? cursosAssoc : undefined,
      curso: cursosAssoc.length === 1 ? cursosAssoc[0] : undefined
    };

    if (onSalvarDisciplina) {
      onSalvarDisciplina(atualizada);
    } else {
      dbService.salvarDisciplina(atualizada);
    }
    setShowEditarDisciplinaModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Disciplina "${atualizada.nome}" atualizada com sucesso.` });
  };

  const handleEliminarDisciplinaLocal = (id: string, nome: string) => {
    if (!confirm(`Tem certeza de que deseja eliminar a disciplina "${nome}"?`)) return;

    if (onEliminarDisciplina) {
      onEliminarDisciplina(id);
    } else {
      dbService.eliminarDisciplina(id);
    }
    setFeedbackMsg({ tipo: 'sucesso', texto: `Disciplina "${nome}" eliminada da matriz curricular.` });
  };

  // 2. CRIAÇÃO DE TURMAS COM ASSOCIAÇÃO COERENTE
  const handleCreateTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTurmaNome.trim()) return;

    const validacao = validarCriacaoTurma({
      nome: novaTurmaNome,
      classe: novaTurmaClasse,
      sala: novaTurmaSala,
      curso: novaTurmaCurso
    });

    if (!validacao.valida) {
      setFeedbackMsg({ tipo: 'erro', texto: validacao.erro || 'Preencha os campos obrigatórios da turma.' });
      return;
    }

    const cursoObj = cursosList.find(c => c.nome.toLowerCase() === validacao.cursoAjustado.toLowerCase());
    const salaObj = salasList.find(s => s.nome.toLowerCase() === validacao.salaAjustada.toLowerCase());

    const nova: Turma = {
      id: `turma-${Date.now()}`,
      escolaId: escola.id,
      nome: novaTurmaNome.trim(),
      classe: novaTurmaClasse,
      nivelEnsino: getNivelEnsinoPorClasse(novaTurmaClasse),
      turno: novaTurmaTurno,
      sala: validacao.salaAjustada,
      salaId: salaObj?.id,
      curso: validacao.cursoAjustado,
      cursoId: cursoObj?.id,
      areaFormacao: cursoObj?.area,
      capacidade: novaTurmaCapacidade,
      anoLectivo: escola.anoLectivoActivo
    };
    onSalvarTurma(nova);
    setShowNovaTurmaModal(false);
    setNovaTurmaNome('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Turma "${nova.nome}" criada e vinculada a ${nova.sala} (${nova.curso}) com sucesso.` });
  };

  // 3. ATRIBUIÇÃO DOCENTE
  const handleCreateAtribuicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atribProfId || !atribTurmaId || !atribDiscId) return;
    const nova: AtribuicaoDocente = {
      id: `atrib-${Date.now()}`,
      escolaId: escola.id,
      professorId: atribProfId,
      turmaId: atribTurmaId,
      disciplinaId: atribDiscId,
      ehCoordenadorTurma: atribEhCoordenador,
      anoLectivo: escola.anoLectivoActivo
    };
    onSalvarAtribuicao(nova);
    setShowAtribuicaoModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: 'Atribuição docente registada com sucesso.' });
  };

  // 4. JÚRI DE EXAME
  const handleCreateJuri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!juriNome || !juriTurmaId || !juriPresidenteId) return;
    const turma = turmas.find(t => t.id === juriTurmaId);

    const membros: MembroComissaoJuri[] = [];
    const pres = funcionarios.find(f => f.id === juriPresidenteId);
    if (pres) {
      membros.push({
        usuarioId: pres.id,
        nome: pres.nomeCompleto,
        email: pres.email,
        funcao: 'Presidente',
        cargoOriginal: pres.cargo
      });
    }
    const v1 = funcionarios.find(f => f.id === juriVogal1Id);
    if (v1) {
      membros.push({
        usuarioId: v1.id,
        nome: v1.nomeCompleto,
        email: v1.email,
        funcao: '1º Vogal',
        cargoOriginal: v1.cargo,
        ehProfessor: v1.ehProfessor
      });
    }
    const v2 = funcionarios.find(f => f.id === juriVogal2Id);
    if (v2) {
      membros.push({
        usuarioId: v2.id,
        nome: v2.nomeCompleto,
        email: v2.email,
        funcao: '2º Vogal',
        cargoOriginal: v2.cargo,
        ehProfessor: v2.ehProfessor
      });
    }

    const novo: ComissaoJuri = {
      id: `juri-${Date.now()}`,
      escolaId: escola.id,
      turmaId: juriTurmaId,
      nomeJuri: juriNome,
      classe: turma?.classe || '9ª',
      presidenteId: juriPresidenteId,
      vogal1Id: juriVogal1Id || undefined,
      vogal2Id: juriVogal2Id || undefined,
      anoLectivo: escola.anoLectivoActivo,
      fase: '1ª Época',
      membros
    };
    onSalvarJuri(novo);
    setShowJuriModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Comissão de Júri "${novo.nomeJuri}" registada com sucesso.` });
  };

  // 5. TURNOS
  const handleAtualizarTurno = (turno: TurnoConfig) => {
    dbService.salvarTurnoConfig({ ...turno, escolaId: turno.escolaId || escola.id });
    setTurnosConfigs(dbService.getTurnosConfigs(escola.id));
    setFeedbackMsg({ tipo: 'sucesso', texto: `Horário do turno ${turno.nome} atualizado.` });
  };

  const handleCreateTurno = (e: React.FormEvent) => {
    e.preventDefault();
    const novoTurno: TurnoConfig = {
      id: `turno-${escola.id}-${Date.now()}`,
      escolaId: escola.id,
      nome: novoTurnoNome,
      horaInicio: novoTurnoInicio,
      horaFim: novoTurnoFim,
      toleranciaMinutos: novoTurnoTolerancia,
      temposLectivos: 5,
      intervaloMinutos: 15,
      diasSemana: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
      ativo: true
    };
    dbService.salvarTurnoConfig(novoTurno);
    setTurnosConfigs(dbService.getTurnosConfigs(escola.id));
    setShowNovoTurnoModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Turno ${novoTurno.nome} cadastrado com sucesso.` });
  };

  const handleEliminarTurno = (id: string, nome: string) => {
    if (!confirm(`Deseja eliminar o turno "${nome}"?`)) return;
    if (dbService.eliminarTurnoConfig(id)) {
      setTurnosConfigs(dbService.getTurnosConfigs(escola.id));
      setFeedbackMsg({ tipo: 'sucesso', texto: `Turno "${nome}" eliminado com sucesso.` });
    }
  };

  // 6. CLASSES
  const handleToggleClasse = (classe: ClasseConfig) => {
    const atualizada = { ...classe, escolaId: classe.escolaId || escola.id, ativa: !classe.ativa };
    dbService.salvarClasseConfig(atualizada);
    setClassesConfigs(dbService.getClassesConfigs(escola.id));
  };

  // 7. ÁREAS DE FORMAÇÃO E CURSOS
  const handleCreateAreaFormacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAreaNome.trim()) return;
    const nova: AreaFormacaoConfig = {
      id: `area-${escola.id}-${Date.now()}`,
      escolaId: escola.id,
      nome: novaAreaNome.trim(),
      codigo: novaAreaCodigo.trim().toUpperCase() || undefined,
      ciclo: novaAreaCiclo.trim() || undefined,
      descricao: novaAreaDescricao.trim() || undefined,
      ativo: true
    };
    dbService.salvarAreaFormacao(nova);
    setAreasFormacaoList(dbService.getAreasFormacao(escola.id));
    setShowNovaAreaModal(false);
    setNovaAreaNome('');
    setNovaAreaCodigo('');
    setNovaAreaDescricao('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Área de Formação "${nova.nome}" criada com sucesso.` });
  };

  const handleAbrirEditarArea = (area: AreaFormacaoConfig) => {
    setAreaSendoEditada(area);
    setEditAreaNome(area.nome);
    setEditAreaCodigo(area.codigo || '');
    setEditAreaCiclo(area.ciclo || '');
    setEditAreaDescricao(area.descricao || '');
    setShowEditarAreaModal(true);
  };

  const handleSalvarEditarArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaSendoEditada || !editAreaNome.trim()) return;
    const atualizada: AreaFormacaoConfig = {
      ...areaSendoEditada,
      escolaId: areaSendoEditada.escolaId || escola.id,
      nome: editAreaNome.trim(),
      codigo: editAreaCodigo.trim().toUpperCase() || undefined,
      ciclo: editAreaCiclo.trim() || undefined,
      descricao: editAreaDescricao.trim() || undefined
    };
    dbService.salvarAreaFormacao(atualizada);
    setAreasFormacaoList(dbService.getAreasFormacao(escola.id));
    setShowEditarAreaModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Área de Formação "${atualizada.nome}" atualizada.` });
  };

  const handleEliminarAreaFormacao = (id: string, nome: string) => {
    if (!confirm(`Deseja eliminar a Área de Formação "${nome}"?`)) return;
    dbService.eliminarAreaFormacao(id);
    setAreasFormacaoList(dbService.getAreasFormacao(escola.id));
    setFeedbackMsg({ tipo: 'sucesso', texto: `Área de Formação "${nome}" eliminada.` });
  };

  const handleCreateCurso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCursoNome.trim()) return;
    let areaFinal = novoCursoArea === '__NOVA__' ? novoCursoAreaCustom.trim() : novoCursoArea.trim();
    if (!areaFinal) areaFinal = 'Formação Geral';

    let areaObj = areasFormacaoList.find(a => a.nome.toLowerCase() === areaFinal.toLowerCase());
    if (!areaObj && areaFinal) {
      areaObj = {
        id: `area-${escola.id}-${Date.now()}`,
        escolaId: escola.id,
        nome: areaFinal,
        ciclo: novoCursoCiclo,
        ativo: true
      };
      dbService.salvarAreaFormacao(areaObj);
      setAreasFormacaoList(dbService.getAreasFormacao(escola.id));
    }

    const novo: CursoConfig = {
      id: `curso-${escola.id}-${Date.now()}`,
      escolaId: escola.id,
      nome: novoCursoNome.trim(),
      codigo: novoCursoCodigo.trim().toUpperCase() || undefined,
      area: areaFinal,
      areaFormacaoId: areaObj?.id,
      duracao: novoCursoDuracao.trim() || '3 Anos',
      ciclo: novoCursoCiclo,
      ativo: true
    };
    dbService.salvarCurso(novo);
    setCursosList(dbService.getCursos(escola.id));
    setShowNovoCursoModal(false);
    setNovoCursoNome('');
    setNovoCursoCodigo('');
    setNovoCursoAreaCustom('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Curso "${novo.nome}" (${novo.area}) cadastrado com sucesso.` });
  };

  const handleAbrirEditarCurso = (curso: CursoConfig) => {
    setCursoSendoEditado(curso);
    setEditCursoNome(curso.nome);
    setEditCursoCodigo(curso.codigo || '');
    setEditCursoArea(curso.area);
    setEditCursoAreaCustom('');
    setEditCursoDuracao(curso.duracao || '3 Anos');
    setEditCursoCiclo(curso.ciclo || 'IIº Ciclo');
    setShowEditarCursoModal(true);
  };

  const handleSalvarEditarCurso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSendoEditado || !editCursoNome.trim()) return;
    let areaFinal = editCursoArea === '__NOVA__' ? editCursoAreaCustom.trim() : editCursoArea.trim();
    if (!areaFinal) areaFinal = 'Formação Geral';

    let areaObj = areasFormacaoList.find(a => a.nome.toLowerCase() === areaFinal.toLowerCase());
    if (!areaObj && areaFinal) {
      areaObj = {
        id: `area-${escola.id}-${Date.now()}`,
        escolaId: escola.id,
        nome: areaFinal,
        ciclo: editCursoCiclo,
        ativo: true
      };
      dbService.salvarAreaFormacao(areaObj);
      setAreasFormacaoList(dbService.getAreasFormacao(escola.id));
    }

    const atualizado: CursoConfig = {
      ...cursoSendoEditado,
      escolaId: cursoSendoEditado.escolaId || escola.id,
      nome: editCursoNome.trim(),
      codigo: editCursoCodigo.trim().toUpperCase() || undefined,
      area: areaFinal,
      areaFormacaoId: areaObj?.id,
      duracao: editCursoDuracao.trim() || '3 Anos',
      ciclo: editCursoCiclo
    };
    dbService.salvarCurso(atualizado);
    setCursosList(dbService.getCursos(escola.id));
    setShowEditarCursoModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Curso "${editCursoNome}" atualizado com sucesso.` });
  };

  const handleEliminarCurso = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover o curso "${nome}"?`)) {
      dbService.eliminarCurso(id);
      setCursosList(dbService.getCursos(escola.id));
      setFeedbackMsg({ tipo: 'sucesso', texto: `Curso "${nome}" eliminado.` });
    }
  };

  // HANDLERS DE SALAS DE AULAS
  const handleCreateSalaAula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSalaNome.trim()) return;
    const nova: SalaAulaConfig = {
      id: `sala-${escola.id}-${Date.now()}`,
      escolaId: escola.id,
      nome: novaSalaNome.trim(),
      tipo: novaSalaTipo,
      capacidade: novaSalaCapacidade || 45,
      bloco: novaSalaBloco.trim() || undefined,
      ativo: true
    };
    dbService.salvarSalaAula(nova);
    setSalasList(dbService.getSalasAulas(escola.id));
    setShowNovaSalaModal(false);
    setNovaSalaNome('');
    setNovaSalaBloco('');
    setNovaTurmaSala(nova.nome);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Sala "${nova.nome}" registada com sucesso (${nova.capacidade} lugares).` });
  };

  const handleAbrirEditarSala = (sala: SalaAulaConfig) => {
    setSalaSendoEditada(sala);
    setEditSalaNome(sala.nome);
    setEditSalaTipo(sala.tipo || 'Sala de Aula');
    setEditSalaCapacidade(sala.capacidade || 45);
    setEditSalaBloco(sala.bloco || '');
    setShowEditarSalaModal(true);
  };

  const handleSalvarEditarSala = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaSendoEditada || !editSalaNome.trim()) return;
    const atualizada: SalaAulaConfig = {
      ...salaSendoEditada,
      escolaId: salaSendoEditada.escolaId || escola.id,
      nome: editSalaNome.trim(),
      tipo: editSalaTipo,
      capacidade: editSalaCapacidade || 45,
      bloco: editSalaBloco.trim() || undefined
    };
    dbService.salvarSalaAula(atualizada);
    setSalasList(dbService.getSalasAulas(escola.id));
    setShowEditarSalaModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Sala "${atualizada.nome}" atualizada.` });
  };

  const handleEliminarSalaAula = (id: string, nome: string) => {
    if (!confirm(`Deseja eliminar a sala "${nome}"?`)) return;
    dbService.eliminarSalaAula(id);
    setSalasList(dbService.getSalasAulas(escola.id));
    setFeedbackMsg({ tipo: 'sucesso', texto: `Sala "${nome}" eliminada.` });
  };

  // 8. DISCIPLINAS (COM SUPORTE A CRIAÇÃO PARA MÚLTIPLAS CLASSES AO MESMO TEMPO E VINCULAÇÃO A CLASSE, CICLO E CURSOS)
  const handleCreateDisciplina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDiscNome.trim()) return;

    const classesAssociadas = novaDiscClasses.length > 0 ? novaDiscClasses : ['7ª'];
    const primeiraClasse = classesAssociadas[0];
    const nivel = isEnsinoPrimario(primeiraClasse) 
      ? 'Primario' 
      : isPrimeiroCiclo(primeiraClasse) 
        ? 'ICiclo' 
        : 'IICiclo';

    const cursosAssoc = novaDiscCursos.filter(Boolean);
    const nova: Disciplina = {
      id: `disc-${Date.now()}`,
      escolaId: escola.id,
      nome: novaDiscNome.trim(),
      sigla: novaDiscCodigo ? novaDiscCodigo.toUpperCase() : novaDiscNome.substring(0, 3).toUpperCase(),
      codigo: novaDiscCodigo || `DISC-${Math.floor(100 + Math.random() * 900)}`,
      cargaHorariaSemanal: novaDiscCarga,
      componente: novaDiscComponente,
      nivelEnsino: nivel as any,
      classe: primeiraClasse,
      classes: classesAssociadas,
      ciclo: novaDiscCiclo || formatarCicloPorClasse(primeiraClasse),
      cursos: cursosAssoc.length > 0 ? cursosAssoc : undefined,
      curso: cursosAssoc.length === 1 ? cursosAssoc[0] : undefined
    };

    if (onSalvarDisciplina) onSalvarDisciplina(nova);
    else dbService.salvarDisciplina(nova);
    setShowNovaDisciplinaModal(false);
    setNovaDiscNome('');
    setNovaDiscCodigo('');
    setNovaDiscClasses(['7ª']);
    setNovaDiscCursos([]);
    setFeedbackMsg({ 
      tipo: 'sucesso', 
      texto: `Disciplina "${nova.nome}" registada e associada a ${classesAssociadas.length} classe(s) (${classesAssociadas.join(', ')}) no ciclo ${nova.ciclo}${cursosAssoc.length > 0 ? ` • Curso(s): ${cursosAssoc.join(', ')}` : ' • Tronco Comum'}.` 
    });
  };

  // Filtragem de Disciplinas por Classe, Ciclo e Curso
  const todasClasses = useMemo(() => [...TODAS_CLASSES_OFICIAIS_MED], []);

  const disciplinasFiltradas = useMemo(() => {
    return getDisciplinasPorClasseECiclo(
      disciplinas,
      filtroClasseDisciplinas !== 'TODAS' ? filtroClasseDisciplinas : undefined,
      filtroCicloDisciplinas !== 'TODOS' ? filtroCicloDisciplinas : undefined,
      filtroCursoDisciplinas !== 'TODOS' ? filtroCursoDisciplinas : undefined
    );
  }, [disciplinas, filtroClasseDisciplinas, filtroCicloDisciplinas, filtroCursoDisciplinas]);

  const handleMoverOrdemDisciplina = (disc: Disciplina, direcao: 'cima' | 'baixo') => {
    const list = [...disciplinasFiltradas];
    const idx = list.findIndex(d => d.id === disc.id);
    if (idx < 0) return;
    const targetIdx = direcao === 'cima' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const outro = list[targetIdx];
    const ordemDisc = disc.ordem || idx + 1;
    const ordemOutro = outro.ordem || targetIdx + 1;

    const discAtualizada = { ...disc, ordem: ordemOutro };
    const outroAtualizada = { ...outro, ordem: ordemDisc };

    dbService.salvarDisciplina(discAtualizada);
    dbService.salvarDisciplina(outroAtualizada);
    if (onSalvarDisciplina) {
      onSalvarDisciplina(discAtualizada);
      onSalvarDisciplina(outroAtualizada);
    }
  };

  // Ações de Configuração de Avaliação (Diretor & Administrador Geral)
  const handleSalvarNovoTipoAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipoNome.trim()) return;

    const novoTipo: TipoAvaliacaoConfig = {
      id: `tipo-${Date.now()}`,
      escolaId: escola.id,
      nome: novoTipoNome.trim(),
      codigo: novoTipoCodigo.trim() || novoTipoNome.substring(0, 3).toUpperCase(),
      escalaMax: novoTipoEscala,
      obrigatorio: novoTipoObrigatorio,
      pesoPadrao: novoTipoPeso,
      niveisPermitidos: novoTipoCiclos.map(c => c.includes('Primário') ? 'Primario' : c.includes('Iº Ciclo') ? 'ICiclo' : 'IICiclo' as any),
      classesPermitidas: novoTipoClasses,
      ciclosPermitidos: novoTipoCiclos,
      trimestresPermitidos: ['1º Trimestre', '2º Trimestre', '3º Trimestre']
    };

    const atualizados = [...tiposAvaliacaoList, novoTipo];
    setTiposAvaliacaoList(atualizados);
    dbService.salvarTiposAvaliacao(atualizados);
    setShowNovoTipoModal(false);
    setNovoTipoNome('');
    setNovoTipoCodigo('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Tipo de avaliação "${novoTipo.nome}" configurado com sucesso para as classes selecionadas.` });
  };

  const handleSalvarRegraCalculo = () => {
    const nivel = isEnsinoPrimario(regraClasseSel) ? 'Primario' : isPrimeiroCiclo(regraClasseSel) ? 'ICiclo' : 'IICiclo';
    const ciclo = formatarCicloPorClasse(regraClasseSel);

    const novaRegra: RegraCalculoMAC = {
      id: `regra-${regraClasseSel}-${Date.now()}`,
      escolaId: escola.id,
      classe: regraClasseSel,
      nivelEnsino: nivel as any,
      ciclo,
      trimestre: regraTrimestreSel,
      formulaTipo: regraFormulaTipo,
      tipoCalculo3Trimestre: regra3TrimestreTipo,
      pesoExameFinal: regraPesoExame,
      pesoMediasTrimestrais: regraPesoMT,
      formula3Trimestre: regraFormulaCustom,
      minAvaliacoesExigidas: 2,
      maxAvaliacoesPermitidas: 8,
      descartarMenorNota: false,
      versao: Date.now(),
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: 'Diretor Geral'
    };

    const lista = [...regrasMACList];
    const idx = lista.findIndex(r => r.classe === regraClasseSel && (r.trimestre === regraTrimestreSel || !r.trimestre));
    if (idx >= 0) lista[idx] = novaRegra;
    else lista.push(novaRegra);

    setRegrasMACList(lista);
    dbService.salvarRegrasMAC(lista);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Fórmula de cálculo para a ${regraClasseSel} Classe (${regraTrimestreSel}) guardada com sucesso! Aplicada imediatamente nas pautas.`
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Botão de Destaque da Direção: Importação & Homologação Escolar via Excel com Múltiplas Folhas */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border-2 border-blue-500/30">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xs">
            <FileSpreadsheet className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-white">Importação e Reconhecimento de Dados Escolares via Excel</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full uppercase">
                Direção Geral
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              Adicione dados de ano letivo, turmas, alunos e disciplinas de um ou múltiplos livros com pré-visualização e validação de tipos de dados.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowExcelImportModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-950" />
          <span>Importar Livro Excel (.xlsx)</span>
        </button>
      </div>

      {/* Subnavegação Académica Alinhada aos Menus do Usuário */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'anos' as AcademicSubTab, label: 'Ano Letivo', icon: Calendar, badge: `${anosConfigs.length}` },
            { id: 'classes' as AcademicSubTab, label: 'Classes', icon: Layers, badge: `${classesConfigs.length}` },
            { id: 'cursos' as AcademicSubTab, label: 'Cursos', icon: GraduationCap },
            { id: 'disciplinas' as AcademicSubTab, label: 'Disciplinas', icon: BookOpen, badge: `${disciplinas.length}` },
            { id: 'turmas' as AcademicSubTab, label: 'Turmas', icon: Users, badge: `${turmas.length}` },
            { id: 'turnos' as AcademicSubTab, label: 'Turnos', icon: Clock },
            { id: 'atribuicoes' as AcademicSubTab, label: 'Atribuição Docente', icon: UserCheck },
            { id: 'juris' as AcademicSubTab, label: 'Comissão de Júri', icon: Gavel, badge: `${juris.length}` },
            { id: 'configuracoes_avaliacoes' as AcademicSubTab, label: 'Avaliações & Fórmulas', icon: Sliders, badge: 'MED' }
          ].filter(tab => !(tab.id === 'juris' && isAdminGeral)).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'juris' && onNavigateToJury) {
                    onNavigateToJury();
                  } else {
                    setActiveSubTab(tab.id);
                  }
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alertas */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs ${
          feedbackMsg.tipo === 'sucesso' 
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
            : 'bg-red-50 border border-red-300 text-red-900'
        }`}>
          <div className="flex items-center space-x-2">
            {feedbackMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold hover:underline ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. ABA ANO LETIVO */}
      {activeSubTab === 'anos' && (
        <div className="space-y-6">
          {/* Card explicativo oficial MED */}
          <div className="bg-blue-50 border-2 border-blue-600 rounded-2xl p-5 shadow-xs">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-blue-950">
                  Gestão & Ciclo de Vida de Anos Letivos (MED Angola)
                </h3>
                <p className="text-xs text-blue-900 mt-1 leading-relaxed">
                  Cada ano letivo possui dados estritamente isolados. Ao criar um novo ano letivo, o sistema cria uma base virgem: sem alunos, notas, turmas ou professores atribuídos, e a área financeira inicia zerada para o novo exercício fiscal. Todo o inventário do património escolar permanece disponível para revisão anual de estado.
                </p>
              </div>
            </div>
          </div>

          {/* Controlo do Ano Ativo e Trimestre Vigente */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Configuração do Período Letivo em Vigor</h3>
                <p className="text-xs text-gray-500">Ano letivo ativo: <strong>{escola.anoLectivoActivo || 'Nenhum ano letivo ativo'}</strong> • Trimestre: <strong>{escola.trimestreActivo || '1'}º Trimestre</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoAnoModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Ano Letivo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 block uppercase">Ano Letivo Ativo</span>
                <div className="text-lg font-black text-gray-900">{escola.anoLectivoActivo || 'Sem Ano Ativo'}</div>
                <span className="text-[10px] text-gray-500 block">
                  {escola.anoLectivoActivo ? 'Determina o contexto de matrículas e pautas' : 'Crie o primeiro ano letivo desta instituição para iniciar'}
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 block uppercase">Trimestre Ativo</span>
                <div className="flex items-center space-x-2">
                  {(['1', '2', '3'] as Trimestre[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTrimestreChange(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        escola.trimestreActivo === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {t}º Trimestre
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 block">Fase corrente para lançamento do MAC</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 block uppercase">Estado do Ano Letivo</span>
                <div className="flex items-center space-x-1.5">
                  {(['Aberto', 'Fechado', 'Congelado'] as EstadoAno[]).map((est) => (
                    <button
                      key={est}
                      type="button"
                      disabled={!escola.anoLectivoActivo}
                      onClick={() => handleAlterarEstadoAno(escola.anoLectivoActivo, est)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        escola.estadoAno === est
                          ? est === 'Aberto' 
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : est === 'Fechado'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 block">Congelado impede qualquer edição</span>
              </div>
            </div>
          </div>

          {/* Tabela de Todos os Anos Letivos Criados */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-700" />
                <h3 className="text-sm font-bold text-gray-900">Anos Letivos Registados ({anosConfigs.length})</h3>
              </div>
              <span className="text-xs text-gray-500">Histórico e instâncias independentes</span>
            </div>

            {anosConfigs.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-2">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold text-gray-700">Nenhum ano letivo registado nesta instituição.</p>
                <p className="text-[11px] text-gray-500">Clique em "Criar Novo Ano Letivo" acima para cadastrar o primeiro período letivo desta escola.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anosConfigs.map((anoCfg, idx) => {
                const anoNome = anoCfg.ano || anoCfg.rotulo;
                const isAtivo = Boolean(escola.anoLectivoActivo && anoNome === escola.anoLectivoActivo);
                const anoKey = anoCfg.id || anoNome || `ano-${idx}`;
                const alunosDoAnoCount = dbService.getAlunos(escola.id).filter(
                  a => (a.anoLectivo || a.anoMatricula || '') === anoNome
                ).length;
                const turmasDoAnoCount = turmas.filter(
                  t => t.escolaId === escola.id && t.anoLectivo === anoNome
                ).length;
                return (
                  <div 
                    key={anoKey}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isAtivo ? 'border-blue-600 bg-blue-50/30' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-black text-gray-900">{anoNome}</h4>
                          {isAtivo && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                              Ativo
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">Criado em: {new Date(anoCfg.criadoEm || Date.now()).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        anoCfg.estado === 'Aberto' ? 'bg-emerald-100 text-emerald-800' :
                        anoCfg.estado === 'Planeamento' ? 'bg-indigo-100 text-indigo-800' :
                        anoCfg.estado === 'Fechado' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {anoCfg.estado}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Alunos Matriculados:</span>
                        <strong className="text-gray-900">{alunosDoAnoCount}</strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Turmas Cadastradas:</span>
                        <strong className="text-gray-900">{turmasDoAnoCount}</strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Base de Dados:</span>
                        <span className="text-emerald-700 font-bold">Instância Independente</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex-1 min-w-[140px]">
                        {!isAtivo ? (
                          <button
                            type="button"
                            onClick={() => handleAtivarAno(anoNome)}
                            className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Definir como Ativo
                          </button>
                        ) : (
                          <div className="flex items-center space-x-1 w-full">
                            {(['Aberto', 'Fechado', 'Congelado'] as EstadoAno[]).map(est => (
                              <button
                                key={`ano-status-${anoKey}-${est}`}
                                type="button"
                                onClick={() => handleAlterarEstadoAno(anoNome, est)}
                                className={`flex-1 py-1 text-[10px] font-bold rounded border ${
                                  anoCfg.estado === est ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {est}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditarAno(anoCfg)}
                          className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Editar Ano Letivo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarAno(anoCfg.id || anoNome)}
                          className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Eliminar Ano Letivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ABA CLASSES */}
      {activeSubTab === 'classes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Classes Lecionadas na Instituição</h3>
                <p className="text-xs text-gray-500">Mapeamento da Iniciação ao IIº Ciclo do Ensino Secundário Geral e Técnico</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovaClasseModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Classe</span>
                </button>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {classesConfigs.filter(c => c.ativa).length} Classes Ativas
                </span>
              </div>
            </div>

            {classesConfigs.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-2">
                <Layers className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold text-gray-700">Nenhuma classe configurada para esta instituição.</p>
                <p className="text-[11px] text-gray-500">Utilize o botão "Nova Classe" para cadastrar as classes lecionadas nesta escola.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {classesConfigs.map((cls, idx) => (
                <div 
                  key={`cls-config-item-${cls.id || cls.nome || idx}-${idx}`} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    cls.ativa ? 'border-gray-300 bg-white shadow-2xs' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-gray-900">{cls.nome}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleClasse(cls)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                        cls.ativa 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-gray-200 text-gray-700 border-gray-300'
                      }`}
                    >
                      {cls.ativa ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 space-y-0.5">
                    <p>Ciclo: <strong>{cls.ciclo || 'Geral'}</strong></p>
                    <p>Avaliação: <span className="font-semibold text-blue-700">{cls.regimeAvaliacao || 'Normal'}</span></p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAbrirEditarClasse(cls)}
                      className="inline-flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminarClasse(cls.id, cls.nome)}
                      className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ABA CURSOS & ÁREAS DE FORMAÇÃO */}
      {activeSubTab === 'cursos' && (
        <div className="space-y-6">
          {/* Painel de Áreas de Formação (Criação Livre pela Direção) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Áreas de Formação da Instituição ({areasFormacaoList.length})</h3>
                <p className="text-xs text-gray-500">Crie e personalize áreas de formação para organizar os cursos gerais, técnicos e pedagógicos da escola</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaAreaModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Área de Formação</span>
              </button>
            </div>

            {areasFormacaoList.length === 0 ? (
              <div className="p-5 text-center bg-indigo-50/40 border border-dashed border-indigo-200 rounded-xl space-y-1.5">
                <p className="text-xs font-bold text-indigo-950">Nenhuma Área de Formação personalizada criada ainda.</p>
                <p className="text-[11px] text-indigo-700">As áreas sugeridas do MED continuam disponíveis ao cadastrar um curso, ou pode criar áreas próprias clicando em "Nova Área de Formação".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {areasFormacaoList.map((area, idx) => (
                  <div key={`area-item-${area.id || idx}`} className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-900">{area.nome}</h4>
                      {area.codigo && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                          {area.codigo}
                        </span>
                      )}
                    </div>
                    {area.ciclo && <p className="text-[11px] text-gray-600">Ciclo: <strong>{area.ciclo}</strong></p>}
                    {area.descricao && <p className="text-[10px] text-gray-500 line-clamp-2">{area.descricao}</p>}
                    <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAbrirEditarArea(area)}
                        className="inline-flex items-center space-x-1 text-[11px] text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarAreaFormacao(area.id, area.nome)}
                        className="inline-flex items-center space-x-1 text-[11px] text-red-600 hover:text-red-800 font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Painel de Cursos da Instituição */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Cursos e Especialidades Ofertados ({cursosList.length})</h3>
                <p className="text-xs text-gray-500">Crie cursos próprios ou associados às áreas de formação da escola; integrados em Turmas, Matrículas, Notas, Documentos e Estatísticas</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNovoCursoArea(areasDisponiveis[0] || 'Ciências Físicas e Biológicas');
                  setShowNovoCursoModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Curso</span>
              </button>
            </div>

            {cursosList.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-2">
                <GraduationCap className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold text-gray-700">Nenhum curso registado nesta instituição.</p>
                <p className="text-[11px] text-gray-500">Clique em "Adicionar Curso" para criar livremente os cursos, opções e especialidades técnicas desta escola.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursosList.map((curso, idx) => (
                <div key={`curso-item-${curso.id || idx}-${idx}`} className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{curso.nome}</h4>
                      {curso.codigo && <span className="text-[10px] font-mono text-gray-500">Cód: {curso.codigo}</span>}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 shrink-0">
                      {curso.duracao}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 space-y-0.5">
                    <p>Área de Formação: <strong className="text-gray-800">{curso.area}</strong></p>
                    {curso.ciclo && <p>Ciclo: <strong className="text-blue-700">{curso.ciclo}</strong></p>}
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAbrirEditarCurso(curso)}
                      className="inline-flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminarCurso(curso.id, curso.nome)}
                      className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ABA DISCIPLINAS */}
      {activeSubTab === 'disciplinas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Disciplinas Cadastradas ({disciplinasFiltradas.length} de {disciplinas.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Cada disciplina está associada às suas classes, ciclo e cursos. O sistema aplica automaticamente estas associações nas notas, documentos e estatísticas.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLimparTodasDisciplinas}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  title="Remove disciplinas legadas/padrão do sistema para que a direção configure apenas as disciplinas do currículo atual"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Disciplinas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNovaDisciplinaModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Disciplina</span>
                </button>
              </div>
            </div>

            {/* BARRA DE FILTRO POR CLASSE, CICLO E CURSO */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-slate-800 flex items-center space-x-1 mr-2">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Filtrar Ciclo:</span>
                </span>
                {['TODOS', 'Ensino Primário', 'Iº Ciclo', 'IIº Ciclo'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setFiltroCicloDisciplinas(c);
                      setFiltroClasseDisciplinas('TODAS');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filtroCicloDisciplinas === c
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-700">Classe:</span>
                  <select
                    value={filtroClasseDisciplinas}
                    onChange={(e) => {
                      setFiltroClasseDisciplinas(e.target.value);
                      if (e.target.value !== 'TODAS') setFiltroCicloDisciplinas('TODOS');
                    }}
                    className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODAS">Todas as Classes</option>
                    {todasClasses.map((c: string) => (
                      <option key={c} value={c}>{c === 'Iniciação' ? c : `${c} Classe`}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-700">Curso:</span>
                  <select
                    value={filtroCursoDisciplinas}
                    onChange={(e) => setFiltroCursoDisciplinas(e.target.value)}
                    className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                  >
                    <option value="TODOS">Todos os Cursos</option>
                    {cursosDisponiveisEscola.map((c: string) => (
                      <option key={`filt-cur-${c}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* LISTAGEM DE DISCIPLINAS FILTRADAS */}
            {disciplinasFiltradas.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
                <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">Nenhuma disciplina cadastrada para o filtro selecionado.</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Selecione outra classe/ciclo/curso ou utilize o botão "Cadastrar Disciplina" para associar disciplinas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {disciplinasFiltradas.map((disc: Disciplina, idx: number) => (
                  <div key={`disc-item-${disc.id || disc.codigo || idx}-${idx}`} className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{disc.nome}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded">
                        {disc.codigo}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold">
                        {disc.ciclo || formatarCicloPorClasse(disc.classe || '7ª')}
                      </span>
                      {disc.classes && disc.classes.length > 0 ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-bold">
                          {disc.classes.join(', ')}
                        </span>
                      ) : disc.classe ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-bold">
                          {disc.classe}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">
                          Currículo Base
                        </span>
                      )}
                      {disc.cursos && disc.cursos.length > 0 ? (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded font-semibold">
                          {disc.cursos.join(', ')}
                        </span>
                      ) : disc.curso ? (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded font-semibold">
                          {disc.curso}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span>Carga: <strong>{disc.cargaHorariaSemanal}h/semana</strong></span>
                      <span className="text-blue-700 font-medium">{disc.componente}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoverOrdemDisciplina(disc, 'cima')}
                          className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                          title="Subir posição nos documentos oficiais"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoverOrdemDisciplina(disc, 'baixo')}
                          className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                          title="Descer posição nos documentos oficiais"
                        >
                          ▼
                        </button>
                        <span className="text-[10px] text-gray-400 font-mono ml-1">Ord. {disc.ordem || idx + 1}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditarDisciplina(disc)}
                          className="inline-flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarDisciplinaLocal(disc.id, disc.nome)}
                          className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ABA TURMAS & SALAS DE AULAS */}
      {activeSubTab === 'turmas' && (
        <div className="space-y-6">
          {/* Painel de Gestão de Salas de Aulas */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900">Salas de Aulas da Instituição ({salasList.length})</h3>
                  <p className="text-[11px] text-gray-500">Cadastre salas físicas, laboratórios ou oficinas para vincular às turmas e horários</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaSalaModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Sala de Aula</span>
              </button>
            </div>

            {salasList.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                Nenhuma sala personalizada registada ainda — as salas padrão ({SALAS_PADRAO_ESCOLA.slice(0, 4).join(', ')}...) continuam disponíveis ou pode criar salas próprias acima.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {salasList.map((s) => (
                  <div key={s.id} className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="font-bold text-slate-900">{s.nome}</span>
                    <span className="text-[10px] text-slate-500">({s.tipo || 'Sala'} • {s.capacidade || 45} lug.{s.bloco ? ` • ${s.bloco}` : ''})</span>
                    <button type="button" onClick={() => handleAbrirEditarSala(s)} className="text-blue-600 hover:text-blue-800 cursor-pointer" title="Editar Sala">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => handleEliminarSalaAula(s.id, s.nome)} className="text-red-500 hover:text-red-700 cursor-pointer" title="Eliminar Sala">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Turmas do Ano Lectivo {escola.anoLectivoActivo || 'Atual'} ({turmasDoAnoActivo.length})</h3>
              <p className="text-xs text-gray-500">Criação, associação de classe, curso, sala, turno e capacidade máxima</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const defaultCls = classesConfigs[0]?.nome || '1ª';
                setNovaTurmaClasse(defaultCls);
                if (!novaTurmaCurso && cursosDisponiveisEscola.length > 0) {
                  setNovaTurmaCurso(cursosDisponiveisEscola[0]);
                }
                if (turnosDisponiveisEscola.length > 0) {
                  setNovaTurmaTurno(turnosDisponiveisEscola[0]);
                }
                setShowNovaTurmaModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Turma</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmasDoAnoActivo.map((t, idx) => {
              const coordenador = funcionarios.find(f => f.id === t.coordenadorId);
              const ehIniciacao = normalizarClasse(t.classe) === 'Iniciação';
              const ehFinal = ['6ª', '9ª', '12ª', '13ª'].includes(normalizarClasse(t.classe));

              return (
                <div 
                  key={`turma-item-${t.id || idx}-${idx}`} 
                  className={`p-4 bg-white rounded-xl border-2 transition-shadow shadow-2xs ${
                    ehIniciacao ? 'border-green-600' : ehFinal ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">{t.nome}</h4>
                      <span className="text-xs text-gray-500 font-medium">Classe: {t.classe} • {t.turno}</span>
                    </div>
                    {ehIniciacao && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-800 rounded-full border border-green-300">
                        Iniciação
                      </span>
                    )}
                    {ehFinal && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-300">
                        Classe Final
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Nível de Ensino:</span>
                      <strong className="text-gray-900">{t.nivelEnsino}</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Curso / Área:</span>
                      <strong className="text-purple-800 truncate max-w-[170px]">{getCursoDaTurma(t)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Sala / Lotação:</span>
                      <strong className="text-gray-900">{t.sala} ({t.capacidade || 45} vagas)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Coordenador de Turma:</span>
                      <strong className="text-blue-700 truncate max-w-[140px]">
                        {coordenador ? coordenador.nomeCompleto : 'Não atribuído'}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAbrirEditarTurma(t)}
                      className="inline-flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminarTurmaLocal(t.id, t.nome)}
                      className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {turmasDoAnoActivo.length === 0 && (
              <div className="col-span-full p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-500 space-y-2">
                <Boxes className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="font-bold text-sm text-gray-700">Nenhuma turma criada para o ano letivo ativo.</p>
                <p className="text-xs text-gray-400">Clique em "Criar Nova Turma" para cadastrar a primeira turma da instituição.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. ABA TURNOS */}
      {activeSubTab === 'turnos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Turnos de Funcionamento da Instituição</h3>
                <p className="text-xs text-gray-500">Horários oficiais de entrada, saída, tolerância e dias de funcionamento</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoTurnoModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Turno</span>
              </button>
            </div>

            {turnosConfigs.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-2">
                <Clock className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-bold text-gray-700">Nenhum turno configurado para esta instituição.</p>
                <p className="text-[11px] text-gray-500">Clique em "Adicionar Turno" para definir os turnos de funcionamento (Manhã, Tarde ou Noite).</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {turnosConfigs.map((turno, idx) => (
                <div key={`turno-item-${turno.id || turno.nome || idx}-${idx}`} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-gray-900">{turno.nome}</h4>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        Tolerância: {turno.toleranciaMinutos || 15}m
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarTurno(turno.id, turno.nome)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Eliminar Turno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Horário de Início:</span>
                      <input 
                        type="time" 
                        value={turno.horaInicio}
                        onChange={(e) => handleAtualizarTurno({ ...turno, horaInicio: e.target.value })}
                        className="font-bold text-xs bg-white border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Horário de Término:</span>
                      <input 
                        type="time" 
                        value={turno.horaFim}
                        onChange={(e) => handleAtualizarTurno({ ...turno, horaFim: e.target.value })}
                        className="font-bold text-xs bg-white border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Dias Úteis:</span>
                      <span className="font-semibold text-gray-800">{(turno.diasSemana || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']).join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* 7. ABA ATRIBUIÇÃO DOCENTE */}
      {activeSubTab === 'atribuicoes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Atribuições Docentes & Coordenações ({atribuicoesDoAnoActivo.length})</h3>
              <p className="text-xs text-gray-500">Vinculação de professores, disciplinas e turmas para o ano {escola.anoLectivoActivo || 'Atual'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleReplicarAtribuicoesAnoAnterior}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors"
                title="Clona as atribuições e coordenações dos professores do ano passado para as turmas homólogas do ano atual"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reatribuir do Ano Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAtribuicaoModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Atribuição</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Docente</th>
                    <th className="p-3">Turma</th>
                    <th className="p-3">Disciplina</th>
                    <th className="p-3">Cargo na Turma</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {atribuicoesDoAnoActivo.map((atrib, idx) => {
                    const prof = funcionarios.find(f => f.id === atrib.professorId);
                    const turma = turmas.find(t => t.id === atrib.turmaId);
                    const disc = disciplinas.find(d => d.id === atrib.disciplinaId);

                    return (
                      <tr key={`atrib-item-${atrib.id || idx}-${idx}`} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{prof?.nomeCompleto || 'Desconhecido'}</td>
                        <td className="p-3 font-semibold text-blue-700">{turma?.nome || 'N/A'}</td>
                        <td className="p-3 font-medium text-gray-700">{disc?.nome || 'N/A'}</td>
                        <td className="p-3">
                          {atrib.ehCoordenadorTurma ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                              Coordenador de Turma
                            </span>
                          ) : (
                            <span className="text-gray-500">Docente</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => onRemoverAtribuicao(atrib.id)}
                            className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                            title="Remover atribuição"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {atribuicoesDoAnoActivo.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="font-bold text-sm text-gray-700">Nenhuma atribuição docente registada para este ano letivo.</p>
                        <p className="text-xs text-gray-400 mt-1">Os professores aparecem cadastrados sem atribuições de anos anteriores. Utilize o formulário acima para vincular docentes a turmas deste ano letivo.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. ABA JÚRIS DE EXAME -> UNIFICADO NO MENU COMISSÃO DE JÚRI */}
      {activeSubTab === 'juris' && !isAdminGeral && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border-2 border-indigo-500/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-black uppercase tracking-wide inline-flex items-center space-x-1.5">
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Central Oficial de Comissão de Júri</span>
                </span>
                <h3 className="text-xl font-black text-white">Módulo Centralizado de Comissão de Júri</h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Conforme determinado pelas diretrizes do MED, todas as funcionalidades relativas à Comissão de Júri (criação e edição de comissões para todas as classes e níveis, parametrização de regras de deliberação, alteração de notas na pauta, pareceres colegiais, emissão de atas e homologação definitiva de pautas) estão centralizadas num único menu dedicado: <strong>Comissão de Júri</strong>.
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToJury) {
                      onNavigateToJury();
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Abrir Menu Comissão de Júri →</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="text-indigo-600 font-bold text-xs uppercase">Comissões Criadas</div>
              <div className="text-3xl font-black text-gray-900">{juris.length}</div>
              <p className="text-xs text-gray-500">Para todas as classes e ciclos de ensino</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="text-emerald-600 font-bold text-xs uppercase">Pautas Homologadas</div>
              <div className="text-3xl font-black text-emerald-700">{juris.filter(j => j.pautaHomologada || j.estado === 'Validada').length}</div>
              <p className="text-xs text-gray-500">Pautas Finais homologadas para certificados</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="text-amber-600 font-bold text-xs uppercase">Em Deliberação</div>
              <div className="text-3xl font-black text-amber-700">{juris.filter(j => !j.pautaHomologada && j.estado !== 'Validada').length}</div>
              <p className="text-xs text-gray-500">Sessões em aberto com regras ativas</p>
            </div>
          </div>
        </div>
      )}

      {/* 9. ABA CONFIGURAÇÕES DE AVALIAÇÃO & FÓRMULAS DE CÁLCULO (DIRETOR & ADMIN GERAL) */}
      {activeSubTab === 'configuracoes_avaliacoes' && (
        <div className="space-y-6">
          {/* BANNER PRINCIPAL */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border-2 border-blue-500/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/40 text-blue-300 rounded-full text-xs font-black uppercase tracking-wide inline-flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Regulamento de Avaliação • Normas MED Angola</span>
                </span>
                <h3 className="text-xl font-black text-white">Configurações de Avaliação & Fórmulas de Cálculo</h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Defina os tipos de avaliações a aplicar em cada classe ou ciclo, e configure os cálculos matemáticos para cada trimestre, especialmente o <strong>3º Trimestre</strong> (com ou sem Exame Final), aplicando as regras em tempo real nas pautas.
                </p>
              </div>

              <div className="shrink-0 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowNovoTipoModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Tipo de Avaliação</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECÇÃO 1: TIPOS DE AVALIAÇÕES CONFIGURADOS */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Tipos de Avaliação Registados ({tiposAvaliacaoList.length})
                </h4>
                <p className="text-xs text-gray-500">
                  Tipos de provas e atividades autorizadas para os professores lançarem notas
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {tiposAvaliacaoList.filter(t => t.obrigatorio).length} Obrigatórios
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tiposAvaliacaoList.map((t, idx) => (
                <div key={t.id || idx} className="p-4 rounded-xl border border-gray-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900">{t.nome}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {t.codigo}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Escala Máxima:</span>
                      <strong className="text-gray-900">0 a {t.escalaMax} Valores</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Peso Padrão:</span>
                      <strong className="text-gray-900">{t.pesoPadrao}x</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Obrigatório:</span>
                      <span className={`font-bold ${t.obrigatorio ? 'text-amber-700' : 'text-gray-500'}`}>
                        {t.obrigatorio ? 'Sim' : 'Facultativo'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                    <span>Classes: </span>
                    <strong className="text-slate-800">
                      {t.classesPermitidas && t.classesPermitidas.length > 0 ? t.classesPermitidas.join(', ') : 'Todas'}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECÇÃO 2: FORMULÁRIO DE CÁLCULO POR CLASSE E TRIMESTRE (ESPECIALMENTE 3º TRIMESTRE) */}
          <div className="bg-white rounded-2xl border-2 border-blue-600 p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-base font-black text-gray-900">
                    Parametrização de Fórmulas e Médias por Classe e Trimestre
                  </h4>
                  <p className="text-xs text-gray-500">
                    Configuração avançada de pesos das provas, MAC e fórmulas do 3º Trimestre com cálculo de Média Final (MF)
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                Aplicação Automática nas Pautas
              </span>
            </div>

            {/* SELETORES: CLASSE E TRIMESTRE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Classe a Configurar</label>
                <select
                  value={regraClasseSel}
                  onChange={(e) => setRegraClasseSel(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white font-bold text-gray-900"
                >
                  {todasClasses.map((c: string) => (
                    <option key={c} value={c}>{c} Classe ({formatarCicloPorClasse(c)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Trimestre Aplicável</label>
                <select
                  value={regraTrimestreSel}
                  onChange={(e) => setRegraTrimestreSel(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white font-bold text-gray-900"
                >
                  <option value="1º Trimestre">1º Trimestre (MT1)</option>
                  <option value="2º Trimestre">2º Trimestre (MT2)</option>
                  <option value="3º Trimestre">3º Trimestre (MT3 & Média Final)</option>
                  <option value="Todos">Todos os Trimestres</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Cálculo Trimestral</label>
                <select
                  value={regraFormulaTipo}
                  onChange={(e) => setRegraFormulaTipo(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white text-xs font-semibold"
                >
                  <option value="ARITMETICA_SIMPLES">Média Aritmética Oficial MED: (MAC + NPP + NPT) / 3</option>
                  <option value="PONDERADA_POR_TIPO">Ponderada por Pesos de Tipos de Avaliação</option>
                  <option value="FORMULA_CUSTOMIZADA">Fórmula Customizada da Direção</option>
                </select>
              </div>
            </div>

            {/* DESTAQUE DO PROMPT: REGRAS DO 3º TRIMESTRE & MÉDIA FINAL (MF) */}
            <div className="p-5 bg-gradient-to-r from-amber-50/80 via-blue-50/60 to-indigo-50/80 border-2 border-amber-300 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h5 className="text-sm font-black text-amber-950">
                    Cálculo Oficial do 3º Trimestre & Média Final da Disciplina (MF)
                  </h5>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950">
                  Transição & Aprovação
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Método de Homologação no 3º Trimestre
                  </label>
                  <select
                    value={regra3TrimestreTipo}
                    onChange={(e) => setRegra3TrimestreTipo(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-amber-300 rounded-xl bg-white font-bold text-gray-900"
                  >
                    <option value="PONDERADO_EXAME">Com Exame Final: Ponderação (MT Geral + Exame)</option>
                    <option value="MED_ANGOLA_PADRAO">Padrão Sem Exame: Média Direta (MT1 + MT2 + MT3) / 3</option>
                    <option value="CUSTOMIZADO">Fórmula Customizada Especial da Instituição</option>
                  </select>
                </div>

                {regra3TrimestreTipo === 'PONDERADO_EXAME' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Peso do Exame Final (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={regraPesoExame}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRegraPesoExame(val);
                          setRegraPesoMT(100 - val);
                        }}
                        className="w-full text-xs p-2.5 border border-amber-300 rounded-xl bg-white font-black text-amber-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Peso das Médias Trimestrais (MT Geral) (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={regraPesoMT}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRegraPesoMT(val);
                          setRegraPesoExame(100 - val);
                        }}
                        className="w-full text-xs p-2.5 border border-amber-300 rounded-xl bg-white font-black text-blue-900"
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Expressão da Fórmula de Cálculo
                    </label>
                    <input
                      type="text"
                      value={regraFormulaCustom}
                      onChange={(e) => setRegraFormulaCustom(e.target.value)}
                      placeholder="Ex: MF = (MT1 + MT2 + MT3) / 3"
                      className="w-full text-xs p-2.5 border border-amber-300 rounded-xl bg-white font-mono text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* CARD DE PRÉ-VISUALIZAÇÃO DA FÓRMULA MATEMÁTICA */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-gray-700">
                  <strong>Fórmula em Vigor para a {regraClasseSel} Classe: </strong>
                  <code className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded ml-1">
                    {regra3TrimestreTipo === 'PONDERADO_EXAME'
                      ? `MF = (MT_Geral × ${regraPesoMT}%) + (Exame_Final × ${regraPesoExame}%)`
                      : regra3TrimestreTipo === 'MED_ANGOLA_PADRAO'
                        ? 'MF = (MT1 + MT2 + MT3) / 3'
                        : regraFormulaCustom}
                  </code>
                </span>
                <span className="text-[11px] text-gray-500">
                  Escala de notas: {isEnsinoPrimario(regraClasseSel) ? '0 a 10 valores' : '0 a 20 valores'}
                </span>
              </div>
            </div>

            {/* BOTÃO PARA SALVAR REGRA */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSalvarRegraCalculo}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar e Aplicar Fórmulas nas Pautas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR NOVO TIPO DE AVALIAÇÃO */}
      {showNovoTipoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Novo Tipo de Avaliação</h3>
              <button onClick={() => setShowNovoTipoModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSalvarNovoTipoAvaliacao} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Tipo de Avaliação</label>
                <input
                  type="text"
                  required
                  value={novoTipoNome}
                  onChange={(e) => setNovoTipoNome(e.target.value)}
                  placeholder="Ex: Trabalho Prático, Seminário, Prova do Professor..."
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={novoTipoCodigo}
                    onChange={(e) => setNovoTipoCodigo(e.target.value)}
                    placeholder="Ex: TP, SEM, PP"
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Escala Máxima</label>
                  <select
                    value={novoTipoEscala}
                    onChange={(e) => setNovoTipoEscala(Number(e.target.value) as any)}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value={20}>0 a 20 Valores (Ciclos)</option>
                    <option value={10}>0 a 10 Valores (Primário)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Peso no Cálculo</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={novoTipoPeso}
                    onChange={(e) => setNovoTipoPeso(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novoTipoObrigatorio}
                      onChange={(e) => setNovoTipoObrigatorio(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="font-bold text-gray-800">Obrigatório</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovoTipoModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Registar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO EXCEL DA DIREÇÃO */}
      <ExcelSchoolDataImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        escola={escola}
        onImportacaoConcluida={(msg) => {
          setFeedbackMsg({ tipo: 'sucesso', texto: msg });
          setAnosConfigs(dbService.getAnosLectivosConfigs(escola.id));
        }}
      />

      {/* MODAL NOVO ANO LETIVO */}
      {showNovoAnoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600">
                <Calendar className="w-5 h-5" />
                <h3 className="text-base font-bold text-gray-900">Criar Novo Ano Letivo (Instância Virgem)</h3>
              </div>
              <button 
                onClick={() => setShowNovoAnoModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Princípio de Isolamento Rigoroso de Dados (MED)</span>
              </p>
              <p className="leading-relaxed">
                O novo ano letivo será criado totalmente virgem: <strong>sem alunos, sem notas, sem turmas e sem atribuições docentes anteriores</strong>. A tesouraria iniciará com saldo zero, e o património físico continua registado para revisão de inventário.
              </p>
            </div>

            <form onSubmit={handleCriarNovoAno} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Designação do Ano Letivo (ex: 2026/2027) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={novoAnoNome}
                  onChange={(e) => setNovoAnoNome(e.target.value)}
                  placeholder="2026/2027"
                  required
                  className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Estado Inicial
                </label>
                <select
                  value={novoAnoEstado}
                  onChange={(e) => setNovoAnoEstado(e.target.value as EstadoAno)}
                  className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="Planeamento">Planeamento (Preparação de turmas e matrículas)</option>
                  <option value="Aberto">Aberto (Em curso imediato)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Início (Previsão)</label>
                  <input
                    type="date"
                    value={novoAnoDataInicio}
                    onChange={(e) => setNovoAnoDataInicio(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Término (Previsão)</label>
                  <input
                    type="date"
                    value={novoAnoDataFim}
                    onChange={(e) => setNovoAnoDataFim(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovoAnoModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  Confirmar e Criar Ano Letivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA TURMA */}
      {showNovaTurmaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Cadastrar Nova Turma ({escola.anoLectivoActivo || 'Atual'})</h3>
              <button onClick={() => setShowNovaTurmaModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateTurma} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Turma</label>
                <input
                  type="text"
                  value={novaTurmaNome}
                  onChange={(e) => setNovaTurmaNome(e.target.value)}
                  placeholder="Ex: 10ª A - Manhã"
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Classe</label>
                  <select
                    value={novaTurmaClasse}
                    onChange={(e) => setNovaTurmaClasse(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {(classesConfigs.filter(c => c.ativa !== false).length > 0
                      ? classesConfigs.filter(c => c.ativa !== false).map((c, idx) => (
                          <option key={`opt-cls-${c.id || c.nome}-${idx}`} value={c.nome}>{c.nome}</option>
                        ))
                      : todasClasses.map((c) => (
                          <option key={`opt-cls-std-${c}`} value={c}>{c === 'Iniciação' ? c : `${c} Classe`}</option>
                        ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Turno</label>
                  <select
                    value={novaTurmaTurno}
                    onChange={(e) => setNovaTurmaTurno(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {turnosDisponiveisEscola.map(tNome => (
                      <option key={`nt-turno-${tNome}`} value={tNome}>{tNome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Curso / Especialidade (Obrigatório no 2º Ciclo, opcional nos demais ciclos) */}
              <div className={isSegundoCiclo(novaTurmaClasse) ? 'bg-purple-50 p-3 rounded-lg border border-purple-200' : 'bg-gray-50 p-3 rounded-lg border border-gray-200'}>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-xs font-bold ${isSegundoCiclo(novaTurmaClasse) ? 'text-purple-900' : 'text-gray-700'}`}>
                    {isSegundoCiclo(novaTurmaClasse) ? 'Curso Curricular Obrigatório (2º Ciclo) *' : 'Curso / Plano Curricular (Opcional)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNovaTurmaModal(false);
                      setActiveSubTab('cursos');
                      setShowNovoCursoModal(true);
                    }}
                    className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    + Criar Curso
                  </button>
                </div>
                <select
                  value={novaTurmaCurso}
                  onChange={(e) => setNovaTurmaCurso(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg bg-white font-bold text-gray-900"
                >
                  {!isSegundoCiclo(novaTurmaClasse) && <option value="">Padrão do Ciclo ({formatarCicloPorClasse(novaTurmaClasse)})</option>}
                  {cursosDisponiveisEscola.map(c => (
                    <option key={`nt-c-${c}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">Sala de Aula *</label>
                    <button
                      type="button"
                      onClick={() => setShowNovaSalaModal(true)}
                      className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      + Sala
                    </button>
                  </div>
                  <input
                    type="text"
                    list="salas-sugestoes"
                    value={novaTurmaSala}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNovaTurmaSala(val);
                      const foundSala = salasList.find(s => s.nome.toLowerCase() === val.toLowerCase());
                      if (foundSala?.capacidade) setNovaTurmaCapacidade(foundSala.capacidade);
                    }}
                    placeholder="Ex: Sala 04"
                    required
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                  />
                  <datalist id="salas-sugestoes">
                    {salasDisponiveisEscola.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Capacidade</label>
                  <input
                    type="number"
                    value={novaTurmaCapacidade}
                    onChange={(e) => setNovaTurmaCapacidade(Number(e.target.value))}
                    min={1}
                    max={120}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovaTurmaModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Criar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA ATRIBUIÇÃO */}
      {showAtribuicaoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Atribuir Docente / Coordenador</h3>
              <button onClick={() => setShowAtribuicaoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateAtribuicao} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Professor</label>
                <select
                  value={atribProfId}
                  onChange={(e) => setAtribProfId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Selecione o Professor...</option>
                  {professoresDisponiveis.map((p, idx) => (
                    <option key={`opt-prof-${p.id || idx}-${idx}`} value={p.id}>{p.nomeCompleto} ({p.cargo})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Turma de Destino *</label>
                <select
                  value={atribTurmaId}
                  onChange={(e) => setAtribTurmaId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                >
                  <option value="">Selecione a Turma...</option>
                  {turmasDoAnoActivo.map((t, idx) => (
                    <option key={`opt-turma-${t.id || idx}-${idx}`} value={t.id}>
                      {t.nome} ({t.classe}) - {t.sala || 'Sala 01'}
                    </option>
                  ))}
                </select>

                {/* Resumo da Associação Coerente da Turma */}
                {atribTurmaId && (() => {
                  const tSel = turmas.find(t => t.id === atribTurmaId);
                  if (!tSel) return null;
                  return (
                    <div className="mt-1.5 p-2 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-900 flex justify-between items-center">
                      <span><strong>Classe:</strong> {tSel.classe}</span>
                      <span><strong>Sala:</strong> {getSalaDaTurma(tSel)}</span>
                      {isSegundoCiclo(tSel.classe) && (
                        <span><strong>Curso:</strong> {tSel.curso || 'Ciências Físicas e Biológicas (PUNIV)'}</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Disciplina da Matriz Curricular *</label>
                  {atribTurmaId && (
                    <span className="text-[10px] text-blue-700 font-semibold">
                      Matriz da {turmas.find(t => t.id === atribTurmaId)?.classe}
                    </span>
                  )}
                </div>
                <select
                  value={atribDiscId}
                  onChange={(e) => setAtribDiscId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Selecione a Disciplina...</option>
                  {(() => {
                    const tSel = turmas.find(t => t.id === atribTurmaId);
                    const discsDaTurma = getDisciplinasDaTurma(disciplinas, tSel);
                    return discsDaTurma.map((d, idx) => (
                      <option key={`opt-disc-${d.id || idx}-${idx}`} value={d.id}>{d.nome} ({d.codigo || d.sigla})</option>
                    ));
                  })()}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="coordenador"
                  checked={atribEhCoordenador}
                  onChange={(e) => setAtribEhCoordenador(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="coordenador" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Nomear como Coordenador Pedagógico desta Turma
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAtribuicaoModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Confirmar Atribuição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA ÁREA DE FORMAÇÃO */}
      {showNovaAreaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Criar Área de Formação</h3>
              <button onClick={() => setShowNovaAreaModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateAreaFormacao} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Área de Formação *</label>
                <input
                  type="text"
                  value={novaAreaNome}
                  onChange={(e) => setNovaAreaNome(e.target.value)}
                  placeholder="Ex: Engenharias e Tecnologias, Saúde, Ciências Humanas..."
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={novaAreaCodigo}
                    onChange={(e) => setNovaAreaCodigo(e.target.value)}
                    placeholder="Ex: AF-TEC"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo Principal</label>
                  <select
                    value={novaAreaCiclo}
                    onChange={(e) => setNovaAreaCiclo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Educação Básica / Primário">Educação Básica / Primário</option>
                    <option value="Iº Ciclo do Ensino Secundário">Iº Ciclo do Ensino Secundário</option>
                    <option value="IIº Ciclo do Ensino Secundário">IIº Ciclo do Ensino Secundário</option>
                    <option value="Ensino Técnico-Profissional">Ensino Técnico-Profissional</option>
                    <option value="Formação de Professores">Formação de Professores</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={novaAreaDescricao}
                  onChange={(e) => setNovaAreaDescricao(e.target.value)}
                  placeholder="Descrição ou perfil profissional da área..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowNovaAreaModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  Gravar Área
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ÁREA DE FORMAÇÃO */}
      {showEditarAreaModal && areaSendoEditada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Área de Formação</h3>
              <button onClick={() => setShowEditarAreaModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSalvarEditarArea} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Área de Formação *</label>
                <input type="text" value={editAreaNome} onChange={(e) => setEditAreaNome(e.target.value)} required className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input type="text" value={editAreaCodigo} onChange={(e) => setEditAreaCodigo(e.target.value)} className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo Principal</label>
                  <input type="text" value={editAreaCiclo} onChange={(e) => setEditAreaCiclo(e.target.value)} className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                <input type="text" value={editAreaDescricao} onChange={(e) => setEditAreaDescricao(e.target.value)} className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowEditarAreaModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CURSO (LIVRE + ÁREA DE FORMAÇÃO PERSONALIZADA) */}
      {showNovoCursoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Criar Curso / Especialidade</h3>
                <p className="text-[11px] text-gray-500">Crie cursos livres ou associe a qualquer Área de Formação da escola</p>
              </div>
              <button onClick={() => setShowNovoCursoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateCurso} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Curso *</label>
                <input
                  type="text"
                  value={novoCursoNome}
                  onChange={(e) => setNovoCursoNome(e.target.value)}
                  placeholder="Ex: Construção Civil, Contabilidade e Gestão, Ciências Humanas..."
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {CURSOS_SEGUNDO_CICLO.slice(0, 4).map(sug => (
                    <button
                      key={`sug-${sug}`}
                      type="button"
                      onClick={() => setNovoCursoNome(sug)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded font-medium cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={novoCursoCodigo}
                    onChange={(e) => setNovoCursoCodigo(e.target.value)}
                    placeholder="Ex: CFB, CEJ, INF..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Duração</label>
                  <input
                    type="text"
                    value={novoCursoDuracao}
                    onChange={(e) => setNovoCursoDuracao(e.target.value)}
                    placeholder="Ex: 3 Anos, 4 Anos"
                    required
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo / Nível Associado</label>
                  <select
                    value={novoCursoCiclo}
                    onChange={(e) => setNovoCursoCiclo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="IIº Ciclo">IIº Ciclo (10ª à 12ª/13ª)</option>
                    <option value="Ensino Técnico">Ensino Técnico-Profissional (10ª à 13ª)</option>
                    <option value="Iº Ciclo">Iº Ciclo (7ª à 9ª)</option>
                    <option value="Ensino Primário">Ensino Primário (Iniciação à 6ª)</option>
                    <option value="Todos os Ciclos">Todos os Ciclos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Área de Formação *</label>
                  <select
                    value={novoCursoArea}
                    onChange={(e) => setNovoCursoArea(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-semibold"
                  >
                    {areasDisponiveis.map(a => (
                      <option key={`nc-area-${a}`} value={a}>{a}</option>
                    ))}
                    <option value="__NOVA__">+ Criar Nova Área de Formação...</option>
                  </select>
                </div>
              </div>

              {novoCursoArea === '__NOVA__' && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">Nome da Nova Área de Formação *</label>
                  <input
                    type="text"
                    value={novoCursoAreaCustom}
                    onChange={(e) => setNovoCursoAreaCustom(e.target.value)}
                    placeholder="Digite o nome da nova Área de Formação..."
                    required
                    className="w-full text-xs px-3 py-2 border border-indigo-300 rounded-lg bg-white font-bold"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovoCursoModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Gravar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CURSO */}
      {showEditarCursoModal && cursoSendoEditado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Curso Curricular</h3>
              <button onClick={() => setShowEditarCursoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSalvarEditarCurso} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Curso *</label>
                <input
                  type="text"
                  value={editCursoNome}
                  onChange={(e) => setEditCursoNome(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={editCursoCodigo}
                    onChange={(e) => setEditCursoCodigo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Duração do Ciclo</label>
                  <input
                    type="text"
                    value={editCursoDuracao}
                    onChange={(e) => setEditCursoDuracao(e.target.value)}
                    placeholder="Ex: 3 Anos, 4 Anos"
                    required
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo / Nível Associado</label>
                  <select
                    value={editCursoCiclo}
                    onChange={(e) => setEditCursoCiclo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="IIº Ciclo">IIº Ciclo (10ª à 12ª/13ª)</option>
                    <option value="Ensino Técnico">Ensino Técnico-Profissional (10ª à 13ª)</option>
                    <option value="Iº Ciclo">Iº Ciclo (7ª à 9ª)</option>
                    <option value="Ensino Primário">Ensino Primário (Iniciação à 6ª)</option>
                    <option value="Todos os Ciclos">Todos os Ciclos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Área de Formação</label>
                  <select
                    value={editCursoArea}
                    onChange={(e) => setEditCursoArea(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {Array.from(new Set([...areasDisponiveis, editCursoArea].filter(Boolean))).map(a => (
                      <option key={`ec-area-${a}`} value={a}>{a}</option>
                    ))}
                    <option value="__NOVA__">+ Criar Nova Área de Formação...</option>
                  </select>
                </div>
              </div>
              {editCursoArea === '__NOVA__' && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  <label className="block text-xs font-bold text-indigo-900 mb-1">Nome da Nova Área de Formação *</label>
                  <input
                    type="text"
                    value={editCursoAreaCustom}
                    onChange={(e) => setEditCursoAreaCustom(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-indigo-300 rounded-lg bg-white font-bold"
                  />
                </div>
              )}
              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditarCursoModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA DISCIPLINA COM SUPORTE A CRIAÇÃO PARA MÚLTIPLAS CLASSES AO MESMO TEMPO E VINCULAÇÃO A CLASSE E CICLO */}
      {showNovaDisciplinaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Cadastrar Nova Disciplina Curricular</h3>
                <p className="text-xs text-gray-500">Pode associar a uma ou várias classes em simultâneo e definir o ciclo oficial</p>
              </div>
              <button onClick={() => setShowNovaDisciplinaModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateDisciplina} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Disciplina</label>
                <input
                  type="text"
                  value={novaDiscNome}
                  onChange={(e) => setNovaDiscNome(e.target.value)}
                  placeholder="Ex: Língua Portuguesa, Matemática, Física..."
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={novaDiscCodigo}
                    onChange={(e) => setNovaDiscCodigo(e.target.value)}
                    placeholder="Ex: LP-07"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carga Horária (h/sem)</label>
                  <input
                    type="number"
                    value={novaDiscCarga}
                    onChange={(e) => setNovaDiscCarga(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo Curricular</label>
                  <select
                    value={novaDiscCiclo}
                    onChange={(e) => setNovaDiscCiclo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    <option value="Ensino Primário">Ensino Primário (Iniciação à 6ª)</option>
                    <option value="Iº Ciclo">Iº Ciclo do Ensino Secundário (7ª à 9ª)</option>
                    <option value="IIº Ciclo">IIº Ciclo do Ensino Secundário (10ª à 13ª)</option>
                    <option value="Ensino Geral">Ensino Geral / Multiciclo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Componente Curricular</label>
                  <select
                    value={novaDiscComponente}
                    onChange={(e) => setNovaDiscComponente(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Geral">Formação Geral</option>
                    <option value="Específica">Formação Específica</option>
                    <option value="Opção">Opção</option>
                  </select>
                </div>
              </div>

              {/* SELEÇÃO DE MÚLTIPLAS CLASSES AO MESMO TEMPO (REQUISITO EXPLÍCITO DO PROMPT) */}
              <div className="border border-blue-200 bg-blue-50/40 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-blue-950 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Classes Associadas ({novaDiscClasses.length} selecionadas) *</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold">Criação simultânea</span>
                </div>

                {/* BOTÕES RÁPIDOS DE CICLO */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => setNovaDiscClasses(['Iniciação', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª'])}
                    className="text-[10px] px-2 py-0.5 bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-bold"
                  >
                    + Primário (1ª à 6ª)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaDiscClasses(['7ª', '8ª', '9ª'])}
                    className="text-[10px] px-2 py-0.5 bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-bold"
                  >
                    + Iº Ciclo (7ª à 9ª)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaDiscClasses(['10ª', '11ª', '12ª', '13ª'])}
                    className="text-[10px] px-2 py-0.5 bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-bold"
                  >
                    + IIº Ciclo (10ª à 13ª)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaDiscClasses(todasClasses)}
                    className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded font-bold"
                  >
                    Todas
                  </button>
                </div>

                {/* CHECKBOXES DE TODAS AS CLASSES */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                  {todasClasses.map((c: string) => {
                    const sel = novaDiscClasses.includes(c);
                    return (
                      <label
                        key={c}
                        className={`flex items-center justify-center p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          sel ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNovaDiscClasses(prev => [...prev, c]);
                            } else {
                              setNovaDiscClasses(prev => prev.filter(x => x !== c));
                            }
                          }}
                          className="hidden"
                        />
                        <span>{c}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SELEÇÃO DE CURSOS ASSOCIADOS À DISCIPLINA */}
              <div className="border border-purple-200 bg-purple-50/40 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-950">
                    Cursos Associados ({novaDiscCursos.length === 0 ? 'Tronco Comum / Todos' : `${novaDiscCursos.length} selecionado(s)`})
                  </label>
                  {novaDiscCursos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setNovaDiscCursos([])}
                      className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Aplicar a Todos (Tronco Comum)
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {cursosDisponiveisEscola.map(c => {
                    const sel = novaDiscCursos.includes(c);
                    return (
                      <button
                        key={`nd-c-${c}`}
                        type="button"
                        onClick={() => setNovaDiscCursos(prev => sel ? prev.filter(x => x !== c) : [...prev, c])}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-bold cursor-pointer transition-colors ${
                          sel ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovaDisciplinaModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={novaDiscClasses.length === 0}
                  className={`px-5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    novaDiscClasses.length === 0 ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  Registar Disciplina ({novaDiscClasses.length} Classes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ANO LETIVO */}
      {showEditarAnoModal && anoSendoEditado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600">
                <Calendar className="w-5 h-5" />
                <h3 className="text-base font-bold text-gray-900">Editar Ano Letivo</h3>
              </div>
              <button 
                onClick={() => setShowEditarAnoModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEditarAno} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Rótulo do Ano Letivo *</label>
                <input
                  type="text"
                  required
                  value={editAnoRotulo}
                  onChange={(e) => setEditAnoRotulo(e.target.value)}
                  placeholder="Ex: 2026/2027"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Estado de Abertura / Fecho</label>
                <select
                  value={editAnoEstado}
                  onChange={(e) => setEditAnoEstado(e.target.value as EstadoAno)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium"
                >
                  <option value="Planeamento">Planeamento (Em estruturação)</option>
                  <option value="Aberto">Aberto (Vigente para lançamentos e matrículas)</option>
                  <option value="Fechado">Fechado (Apenas consulta e pautas consolidadas)</option>
                  <option value="Congelado">Congelado (Bloqueio total para auditoria)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={editAnoDataInicio}
                    onChange={(e) => setEditAnoDataInicio(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Término</label>
                  <input
                    type="date"
                    value={editAnoDataFim}
                    onChange={(e) => setEditAnoDataFim(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição / Notas Oficiais</label>
                <textarea
                  rows={2}
                  value={editAnoDescricao}
                  onChange={(e) => setEditAnoDescricao(e.target.value)}
                  placeholder="Observações administrativas..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditarAnoModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  Gravar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA CLASSE (SELEÇÃO DA INICIAÇÃO À 13ª CLASSE + MULTI-SELEÇÃO) */}
      {showNovaClasseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Cadastrar Classe Escolar (Iniciação à 13ª)</h3>
                <p className="text-[11px] text-gray-500">Escolha uma classe individual, múltiplas classes em lote ou personalize o nome</p>
              </div>
              <button onClick={() => setShowNovaClasseModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCriarClasse} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">Seleção Oficial (Iniciação à 13ª Classe) *</label>
                <button
                  type="button"
                  onClick={() => {
                    setNovaClassePersonalizada(!novaClassePersonalizada);
                    if (!novaClassePersonalizada) setNovaClasseMultiplas([]);
                  }}
                  className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  {novaClassePersonalizada ? 'Voltar à Lista Iniciação–13ª' : 'Digitar Nome Personalizado'}
                </button>
              </div>

              {novaClassePersonalizada ? (
                <input
                  type="text"
                  required
                  value={novaClasseNome}
                  onChange={(e) => setNovaClasseNome(e.target.value)}
                  placeholder="Ex: 1ª Classe, Iniciação, 13ª Classe"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
              ) : (
                <div className="space-y-2.5">
                  <select
                    value={novaClasseNome}
                    onChange={(e) => {
                      setNovaClasseMultiplas([]);
                      aplicarAutoClassDefaults(e.target.value);
                    }}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                  >
                    {TODAS_CLASSES_OFICIAIS_MED.map(c => (
                      <option key={`cls-pick-${c}`} value={c}>
                        {c === 'Iniciação' ? 'Iniciação (Pré-Escolar)' : `${c} Classe (${formatarCicloPorClasse(c)})`}
                      </option>
                    ))}
                  </select>

                  <div className="border border-blue-200 bg-blue-50/40 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-950">Ou selecione várias classes de uma vez:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setNovaClasseMultiplas(CLASSES_ENSINO_PRIMARIO)}
                          className="text-[10px] px-2 py-0.5 bg-white border border-blue-200 rounded font-bold text-blue-800 cursor-pointer"
                        >
                          Primário
                        </button>
                        <button
                          type="button"
                          onClick={() => setNovaClasseMultiplas(CLASSES_PRIMEIRO_CICLO)}
                          className="text-[10px] px-2 py-0.5 bg-white border border-blue-200 rounded font-bold text-blue-800 cursor-pointer"
                        >
                          Iº Ciclo
                        </button>
                        <button
                          type="button"
                          onClick={() => setNovaClasseMultiplas(CLASSES_SEGUNDO_CICLO)}
                          className="text-[10px] px-2 py-0.5 bg-white border border-blue-200 rounded font-bold text-blue-800 cursor-pointer"
                        >
                          IIº Ciclo
                        </button>
                        <button
                          type="button"
                          onClick={() => setNovaClasseMultiplas(TODAS_CLASSES_OFICIAIS_MED)}
                          className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded font-bold cursor-pointer"
                        >
                          Iniciação–13ª
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
                      {TODAS_CLASSES_OFICIAIS_MED.map(c => {
                        const sel = novaClasseMultiplas.includes(c);
                        return (
                          <button
                            key={`mc-${c}`}
                            type="button"
                            onClick={() => setNovaClasseMultiplas(prev => sel ? prev.filter(x => x !== c) : [...prev, c])}
                            className={`py-1.5 px-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                              sel ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nível de Ensino</label>
                <select
                  value={novaClasseNivel}
                  onChange={(e) => setNovaClasseNivel(e.target.value as NivelEnsino)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="Iniciacao">Educação Pré-Escolar / Iniciação</option>
                  <option value="Primario">Ensino Primário</option>
                  <option value="ICiclo">Iº Ciclo do Ensino Secundário</option>
                  <option value="IICiclo">IIº Ciclo do Ensino Secundário Geral</option>
                  <option value="EnsinoTecnico">Ensino Técnico-Profissional / Magistério</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo Curricular</label>
                  <input
                    type="text"
                    value={novaClasseCiclo}
                    onChange={(e) => setNovaClasseCiclo(e.target.value)}
                    placeholder="Ex: Ensino Primário, Iº Ciclo, IIº Ciclo"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Regime de Avaliação</label>
                  <input
                    type="text"
                    value={novaClasseRegime}
                    onChange={(e) => setNovaClasseRegime(e.target.value)}
                    placeholder="Ex: Escala 0–10 ou 0–20"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={novaClasseDescricao}
                  onChange={(e) => setNovaClasseDescricao(e.target.value)}
                  placeholder="Finalidade curricular..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovaClasseModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {novaClasseMultiplas.length > 1 ? `Registar ${novaClasseMultiplas.length} Classes` : 'Registar Classe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLASSE */}
      {showEditarClasseModal && classeSendoEditada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Classe Escolar</h3>
              <button onClick={() => setShowEditarClasseModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSalvarEditarClasse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Classe (Iniciação à 13ª) *</label>
                <input
                  type="text"
                  list="classes-oficiais-med-list"
                  required
                  value={editClasseNome}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditClasseNome(v);
                    setEditClasseNivel(getNivelEnsinoPorClasse(v));
                    setEditClasseCiclo(formatarCicloPorClasse(v));
                  }}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
                <datalist id="classes-oficiais-med-list">
                  {TODAS_CLASSES_OFICIAIS_MED.map(c => (
                    <option key={`dl-cls-${c}`} value={c === 'Iniciação' ? c : `${c} Classe`} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nível de Ensino</label>
                <select
                  value={editClasseNivel}
                  onChange={(e) => setEditClasseNivel(e.target.value as NivelEnsino)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="Iniciacao">Educação Pré-Escolar / Iniciação</option>
                  <option value="Primario">Ensino Primário</option>
                  <option value="ICiclo">Iº Ciclo do Ensino Secundário</option>
                  <option value="IICiclo">IIº Ciclo do Ensino Secundário Geral</option>
                  <option value="EnsinoTecnico">Ensino Técnico-Profissional / Magistério</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo Curricular</label>
                <input
                  type="text"
                  value={editClasseCiclo}
                  onChange={(e) => setEditClasseCiclo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Regime de Avaliação</label>
                <input
                  type="text"
                  value={editClasseRegime}
                  onChange={(e) => setEditClasseRegime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editClasseDescricao}
                  onChange={(e) => setEditClasseDescricao(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="classeAtiva"
                  checked={editClasseAtiva}
                  onChange={(e) => setEditClasseAtiva(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="classeAtiva" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Classe Ativa no Ano Letivo
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditarClasseModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Gravar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TURMA */}
      {showEditarTurmaModal && turmaSendoEditada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Turma</h3>
              <button onClick={() => setShowEditarTurmaModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSalvarEditarTurma} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Turma *</label>
                <input
                  type="text"
                  required
                  value={editTurmaNome}
                  onChange={(e) => setEditTurmaNome(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Classe</label>
                  <select
                    value={editTurmaClasse}
                    onChange={(e) => setEditTurmaClasse(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {(classesConfigs.length > 0
                      ? classesConfigs.map((c, idx) => (
                          <option key={`edit-opt-cls-${c.id || c.nome}-${idx}`} value={c.nome}>{c.nome}</option>
                        ))
                      : todasClasses.map((c) => (
                          <option key={`edit-opt-cls-std-${c}`} value={c}>{c}</option>
                        ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Turno</label>
                  <select
                    value={editTurmaTurno}
                    onChange={(e) => setEditTurmaTurno(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {Array.from(new Set([...turnosDisponiveisEscola, editTurmaTurno].filter(Boolean))).map(tNome => (
                      <option key={`edit-t-${tNome}`} value={tNome}>{tNome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Curso / Especialidade (Obrigatório no 2º Ciclo, opcional nos demais) */}
              <div className={isSegundoCiclo(editTurmaClasse) ? 'bg-purple-50 p-3 rounded-lg border border-purple-200' : 'bg-gray-50 p-3 rounded-lg border border-gray-200'}>
                <label className={`block text-xs font-bold mb-1 ${isSegundoCiclo(editTurmaClasse) ? 'text-purple-900' : 'text-gray-700'}`}>
                  {isSegundoCiclo(editTurmaClasse) ? 'Curso Curricular (2º Ciclo) *' : 'Curso / Plano Curricular (Opcional)'}
                </label>
                <select
                  value={editTurmaCurso}
                  onChange={(e) => setEditTurmaCurso(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg bg-white font-bold text-gray-900"
                >
                  {!isSegundoCiclo(editTurmaClasse) && <option value="">Padrão do Ciclo ({formatarCicloPorClasse(editTurmaClasse)})</option>}
                  {Array.from(new Set([...cursosDisponiveisEscola, editTurmaCurso].filter(Boolean))).map(c => (
                    <option key={`edit-c-${c}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sala Obrigatória *</label>
                  <input
                    type="text"
                    list="salas-sugestoes-edit"
                    value={editTurmaSala}
                    onChange={(e) => setEditTurmaSala(e.target.value)}
                    placeholder="Ex: Sala 04"
                    required
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                  />
                  <datalist id="salas-sugestoes-edit">
                    {salasDisponiveisEscola.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Capacidade (vagas)</label>
                  <input
                    type="number"
                    value={editTurmaCapacidade}
                    onChange={(e) => setEditTurmaCapacidade(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Coordenador / Diretor de Turma</label>
                <select
                  value={editTurmaCoordenadorId}
                  onChange={(e) => setEditTurmaCoordenadorId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Nenhum atribuído</option>
                  {professoresDisponiveis.map(p => (
                    <option key={`edit-coor-${p.id}`} value={p.id}>{p.nomeCompleto} ({p.cargo})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditarTurmaModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Gravar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR DISCIPLINA */}
      {showEditarDisciplinaModal && disciplinaSendoEditada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Disciplina Curricular</h3>
              <button onClick={() => setShowEditarDisciplinaModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSalvarEditarDisciplina} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Disciplina *</label>
                <input
                  type="text"
                  required
                  value={editDiscNome}
                  onChange={(e) => setEditDiscNome(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={editDiscCodigo}
                    onChange={(e) => setEditDiscCodigo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carga Horária (h/sem)</label>
                  <input
                    type="number"
                    value={editDiscCarga}
                    onChange={(e) => setEditDiscCarga(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciclo Curricular</label>
                  <select
                    value={editDiscCiclo}
                    onChange={(e) => setEditDiscCiclo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold"
                  >
                    <option value="Ensino Primário">Ensino Primário (Iniciação à 6ª)</option>
                    <option value="Iº Ciclo">Iº Ciclo do Ensino Secundário (7ª à 9ª)</option>
                    <option value="IIº Ciclo">IIº Ciclo do Ensino Secundário (10ª à 13ª)</option>
                    <option value="Ensino Geral">Ensino Geral / Multiciclo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Componente Curricular</label>
                  <select
                    value={editDiscComponente}
                    onChange={(e) => setEditDiscComponente(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Geral">Formação Geral</option>
                    <option value="Específica">Formação Específica</option>
                    <option value="Opção">Opção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Classes Associadas ({editDiscClasses.length} selecionadas)
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                  {todasClasses.map(classe => {
                    const checked = editDiscClasses.includes(classe);
                    return (
                      <label 
                        key={classe}
                        className={`flex items-center space-x-1.5 text-xs p-1.5 rounded cursor-pointer transition-colors ${
                          checked ? 'bg-blue-100 text-blue-900 font-bold' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditDiscClasses(prev => [...prev, classe]);
                            } else {
                              setEditDiscClasses(prev => prev.filter(c => c !== classe));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span>{classe}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border border-purple-200 bg-purple-50/40 p-2.5 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-950">
                    Cursos Associados ({editDiscCursos.length === 0 ? 'Tronco Comum' : `${editDiscCursos.length}`})
                  </label>
                  {editDiscCursos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditDiscCursos([])}
                      className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Limpar (Todos os Cursos)
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {Array.from(new Set([...cursosDisponiveisEscola, ...editDiscCursos])).map(c => {
                    const sel = editDiscCursos.includes(c);
                    return (
                      <button
                        key={`ed-c-${c}`}
                        type="button"
                        onClick={() => setEditDiscCursos(prev => sel ? prev.filter(x => x !== c) : [...prev, c])}
                        className={`text-[10px] px-2 py-0.5 rounded border font-bold cursor-pointer ${
                          sel ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditarDisciplinaModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Gravar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA SALA DE AULA */}
      {showNovaSalaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Cadastrar Sala de Aula</h3>
              <button onClick={() => setShowNovaSalaModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateSalaAula} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome / Identificação da Sala *</label>
                <input
                  type="text"
                  value={novaSalaNome}
                  onChange={(e) => setNovaSalaNome(e.target.value)}
                  placeholder="Ex: Sala 12, Laboratório de Química..."
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={novaSalaTipo}
                    onChange={(e) => setNovaSalaTipo(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Sala de Aula">Sala de Aula</option>
                    <option value="Laboratório">Laboratório</option>
                    <option value="Oficina">Oficina Técnica</option>
                    <option value="Auditório">Auditório / Multiuso</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Lotação Máxima</label>
                  <input
                    type="number"
                    min={5}
                    max={150}
                    value={novaSalaCapacidade}
                    onChange={(e) => setNovaSalaCapacidade(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Bloco / Pavilhão (Opcional)</label>
                <input
                  type="text"
                  value={novaSalaBloco}
                  onChange={(e) => setNovaSalaBloco(e.target.value)}
                  placeholder="Ex: Bloco B - 1º Andar"
                  className="w-full p-2.5 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowNovaSalaModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
                  Registar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR SALA DE AULA */}
      {showEditarSalaModal && salaSendoEditada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Sala de Aula</h3>
              <button onClick={() => setShowEditarSalaModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleSalvarEditarSala} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome da Sala *</label>
                <input type="text" value={editSalaNome} onChange={(e) => setEditSalaNome(e.target.value)} required className="w-full p-2.5 border border-gray-300 rounded-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo</label>
                  <select value={editSalaTipo} onChange={(e) => setEditSalaTipo(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                    <option value="Sala de Aula">Sala de Aula</option>
                    <option value="Laboratório">Laboratório</option>
                    <option value="Oficina">Oficina Técnica</option>
                    <option value="Auditório">Auditório / Multiuso</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Lotação Máxima</label>
                  <input type="number" min={5} max={150} value={editSalaCapacidade} onChange={(e) => setEditSalaCapacidade(Number(e.target.value))} className="w-full p-2.5 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Bloco / Pavilhão</label>
                <input type="text" value={editSalaBloco} onChange={(e) => setEditSalaBloco(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg" />
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowEditarSalaModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer">
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAÇÃO SEGURA DE ANO LETIVO */}
      {anoParaEliminarSeguro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-gray-100 pb-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-950">Eliminação Segura de Ano Letivo</h3>
                <p className="text-xs text-gray-500">Ano: {anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo}</p>
              </div>
            </div>

            {(anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo) === escola.anoLectivoActivo ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                  <strong>Ação Bloqueada por Segurança:</strong> O ano letivo <strong>{anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo}</strong> é o ano letivo que está atualmente ATIVO na escola. Para proteger o funcionamento dos alunos e turmas em curso, defina outro ano letivo como ativo antes de tentar eliminar este.
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnoParaEliminarSeguro(null);
                      setConfirmacaoTextoEliminarAno('');
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold"
                  >
                    Entendido / Fechar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs leading-relaxed space-y-1.5">
                  <p className="font-bold">Aviso Crítico de Segurança:</p>
                  <p>
                    A eliminação do ano letivo <strong>{anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo}</strong> removerá este período do histórico da instituição. Esta ação não poderá ser desfeita.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Digite exatamente <span className="font-mono text-rose-600 font-extrabold select-all">{anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo}</span> para confirmar a eliminação:
                  </label>
                  <input
                    type="text"
                    value={confirmacaoTextoEliminarAno}
                    onChange={(e) => setConfirmacaoTextoEliminarAno(e.target.value)}
                    placeholder={anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo}
                    className="w-full text-xs px-3 py-2.5 border-2 border-gray-300 focus:border-rose-500 rounded-xl font-bold font-mono text-gray-900 outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnoParaEliminarSeguro(null);
                      setConfirmacaoTextoEliminarAno('');
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={confirmacaoTextoEliminarAno.trim() !== (anoParaEliminarSeguro.ano || anoParaEliminarSeguro.rotulo).trim()}
                    onClick={handleConfirmarEliminarAnoSeguro}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black cursor-pointer shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Definitivamente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL NOVO TURNO */}
      {showNovoTurnoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Adicionar Novo Turno</h3>
              <button onClick={() => setShowNovoTurnoModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTurno} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Turno</label>
                <select
                  value={novoTurnoNome}
                  onChange={(e) => setNovoTurnoNome(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-white font-bold"
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Horário de Início</label>
                  <input
                    type="time"
                    value={novoTurnoInicio}
                    onChange={(e) => setNovoTurnoInicio(e.target.value)}
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Horário de Término</label>
                  <input
                    type="time"
                    value={novoTurnoFim}
                    onChange={(e) => setNovoTurnoFim(e.target.value)}
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tolerância de Entrada (minutos)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={novoTurnoTolerancia}
                  onChange={(e) => setNovoTurnoTolerancia(Number(e.target.value))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNovoTurnoModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Registar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
