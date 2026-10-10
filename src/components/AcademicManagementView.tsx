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
  Filter
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  AtribuicaoDocente, 
  Funcionario, 
  ComissaoJuri, 
  EstadoAno, 
  Trimestre, 
  NivelEnsino,
  AnoLectivoConfig,
  TurnoConfig,
  ClasseConfig,
  CursoConfig,
  TipoAvaliacaoConfig,
  RegraCalculoMAC
} from '../types';
import { dbService } from '../services/storage';
import { 
  CLASSES_SEGUNDO_CICLO,
  CURSOS_SEGUNDO_CICLO,
  SALAS_PADRAO_ESCOLA,
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

  // Lista de anos letivos configurados
  const [anosConfigs, setAnosConfigs] = useState<AnoLectivoConfig[]>(() => dbService.getAnosLectivosConfigs());
  const [turnosConfigs, setTurnosConfigs] = useState<TurnoConfig[]>(() => dbService.getTurnosConfigs());
  const [classesConfigs, setClassesConfigs] = useState<ClasseConfig[]>(() => dbService.getClassesConfigs());

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
  const [novaClasseNome, setNovaClasseNome] = useState('');
  const [novaClasseNivel, setNovaClasseNivel] = useState<NivelEnsino>('Primario');
  const [novaClasseCiclo, setNovaClasseCiclo] = useState('Ensino Primário');
  const [novaClasseRegime, setNovaClasseRegime] = useState('Avaliação Contínua e Provas Trimestrais');
  const [novaClasseDescricao, setNovaClasseDescricao] = useState('');

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
  const [novaTurmaTurno, setNovaTurmaTurno] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const [novaTurmaSala, setNovaTurmaSala] = useState('Sala 01');
  const [novaTurmaCapacidade, setNovaTurmaCapacidade] = useState(45);
  const [novaTurmaCurso, setNovaTurmaCurso] = useState('Ciências Físicas e Biológicas (PUNIV)');

  const [showEditarTurmaModal, setShowEditarTurmaModal] = useState(false);
  const [turmaSendoEditada, setTurmaSendoEditada] = useState<Turma | null>(null);
  const [editTurmaNome, setEditTurmaNome] = useState('');
  const [editTurmaClasse, setEditTurmaClasse] = useState('');
  const [editTurmaNivel, setEditTurmaNivel] = useState<NivelEnsino>('Primario');
  const [editTurmaTurno, setEditTurmaTurno] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const [editTurmaSala, setEditTurmaSala] = useState('');
  const [editTurmaCapacidade, setEditTurmaCapacidade] = useState(45);
  const [editTurmaCoordenadorId, setEditTurmaCoordenadorId] = useState('');
  const [editTurmaCurso, setEditTurmaCurso] = useState('Ciências Físicas e Biológicas (PUNIV)');

  // Modal Nova Disciplina & Editar Disciplina
  const [showNovaDisciplinaModal, setShowNovaDisciplinaModal] = useState(false);
  const [novaDiscNome, setNovaDiscNome] = useState('');
  const [novaDiscCodigo, setNovaDiscCodigo] = useState('');
  const [novaDiscCarga, setNovaDiscCarga] = useState(4);
  const [novaDiscComponente, setNovaDiscComponente] = useState<'Geral' | 'Específica' | 'Opção'>('Geral');
  const [novaDiscClasses, setNovaDiscClasses] = useState<string[]>(['7ª']);
  const [novaDiscCiclo, setNovaDiscCiclo] = useState<string>('Iº Ciclo');
  const [filtroCicloDisciplinas, setFiltroCicloDisciplinas] = useState<string>('TODOS');
  const [filtroClasseDisciplinas, setFiltroClasseDisciplinas] = useState<string>('TODAS');

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

  // Modal Novo Curso & Editar Curso
  const [showNovoCursoModal, setShowNovoCursoModal] = useState(false);
  const [novoCursoNome, setNovoCursoNome] = useState('');
  const [novoCursoArea, setNovoCursoArea] = useState('Ciências Físicas e Biológicas');
  const [showEditarCursoModal, setShowEditarCursoModal] = useState(false);
  const [cursoSendoEditado, setCursoSendoEditado] = useState<{ id: string; nome: string; area: string; duracao: string } | null>(null);
  const [editCursoNome, setEditCursoNome] = useState('');
  const [editCursoArea, setEditCursoArea] = useState('');
  const [editCursoDuracao, setEditCursoDuracao] = useState('3 Anos');
  const [cursosList, setCursosList] = useState<{ id: string; nome: string; area: string; duracao: string }[]>([
    { id: 'c-1', nome: 'Ensino Primário Geral', area: 'Educação Básica', duracao: '6 Anos' },
    { id: 'c-2', nome: 'Iº Ciclo do Ensino Secundário Geral', area: 'Educação Básica', duracao: '3 Anos' },
    { id: 'c-3', nome: 'Ciências Físicas e Biológicas (PUNIV)', area: 'Ciências Exatas', duracao: '3 Anos' },
    { id: 'c-4', nome: 'Ciências Económicas e Jurídicas (PUNIV)', area: 'Ciências Sociais', duracao: '3 Anos' },
    { id: 'c-5', nome: 'Informática e Gestão de Redes', area: 'Técnico-Profissional', duracao: '4 Anos' },
    { id: 'c-6', nome: 'Técnico de Enfermagem Geral', area: 'Saúde', duracao: '4 Anos' }
  ]);

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

  const professoresDisponiveis = funcionarios.filter(f => f.ehProfessor || f.ehAdministrativoQueLeciona);

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

      setAnosConfigs(dbService.getAnosLectivosConfigs());
      setShowNovoAnoModal(false);
      setNovoAnoNome('');
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Ano letivo ${criado.ano} criado com sucesso! Como estipulado, a nova instância foi gerada virgem e isolada, mantendo o património escolar disponível para revisão.`
      });
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao criar ano letivo.' });
    }
  };

  const handleAtivarAno = (ano: string) => {
    dbService.setAnoLectivoActivo(ano);
    onSalvarEscola({ ...escola, anoLectivoActivo: ano });
    if (onAnoLectivoAlterado) onAnoLectivoAlterado(ano);
    setAnosConfigs(dbService.getAnosLectivosConfigs());
    setFeedbackMsg({ tipo: 'sucesso', texto: `Ano letivo ${ano} definido como ativo no sistema.` });
  };

  const handleAlterarEstadoAno = (ano: string, novoEstado: EstadoAno) => {
    dbService.definirEstadoAnoLectivo(ano, novoEstado);
    setAnosConfigs(dbService.getAnosLectivosConfigs());
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
      rotulo: editAnoRotulo.trim(),
      ano: editAnoRotulo.trim(),
      estado: editAnoEstado,
      dataInicio: editAnoDataInicio,
      dataFim: editAnoDataFim,
      descricao: editAnoDescricao.trim()
    };

    dbService.salvarAnoLectivoConfig(anoAtualizado);
    setAnosConfigs(dbService.getAnosLectivosConfigs());
    if (escola.anoLectivoActivo === anoSendoEditado.rotulo) {
      onSalvarEscola({ ...escola, anoLectivoActivo: anoAtualizado.rotulo, estadoAno: anoAtualizado.estado });
    }
    setShowEditarAnoModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Ano letivo ${anoAtualizado.rotulo} atualizado com êxito.` });
  };

  const handleEliminarAno = (idOuRotulo: string) => {
    if (!confirm(`Tem certeza de que deseja eliminar o ano letivo ${idOuRotulo}? Esta operação não pode ser desfeita.`)) {
      return;
    }

    const sucesso = dbService.eliminarAnoLectivoConfig(idOuRotulo);
    if (sucesso) {
      setAnosConfigs(dbService.getAnosLectivosConfigs());
      setFeedbackMsg({ tipo: 'sucesso', texto: `Ano letivo ${idOuRotulo} eliminado com sucesso.` });
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: 'Não foi possível eliminar o único ano letivo configurado no sistema.' });
    }
  };

  // HANDLERS DE CLASSES
  const handleCriarClasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaClasseNome.trim()) return;

    const nova: ClasseConfig = {
      id: `cls-${Date.now()}`,
      nome: novaClasseNome.trim(),
      nivelEnsino: novaClasseNivel,
      ciclo: novaClasseCiclo,
      regimeAvaliacao: novaClasseRegime,
      descricao: novaClasseDescricao.trim() || `Classe lecionada no âmbito do ${novaClasseCiclo}`,
      ordem: classesConfigs.length,
      ativa: true
    };

    dbService.salvarClasseConfig(nova);
    setClassesConfigs(dbService.getClassesConfigs());
    setShowNovaClasseModal(false);
    setNovaClasseNome('');
    setNovaClasseDescricao('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Classe "${nova.nome}" cadastrada com sucesso.` });
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
      nome: editClasseNome.trim(),
      nivelEnsino: editClasseNivel,
      ciclo: editClasseCiclo.trim(),
      regimeAvaliacao: editClasseRegime.trim(),
      descricao: editClasseDescricao.trim(),
      ativa: editClasseAtiva
    };

    dbService.salvarClasseConfig(atualizada);
    setClassesConfigs(dbService.getClassesConfigs());
    setShowEditarClasseModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Classe "${atualizada.nome}" atualizada com sucesso.` });
  };

  const handleEliminarClasse = (id: string, nome: string) => {
    if (!confirm(`Tem certeza de que deseja eliminar a classe "${nome}"?`)) return;

    const ok = dbService.eliminarClasseConfig(id);
    if (ok) {
      setClassesConfigs(dbService.getClassesConfigs());
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
    setEditTurmaCurso(t.curso || (isSegundoCiclo(t.classe) ? 'Ciências Físicas e Biológicas (PUNIV)' : 'Ensino Primário Geral'));
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
      alert(validacao.erro);
      return;
    }

    const atualizada: Turma = {
      ...turmaSendoEditada,
      nome: editTurmaNome.trim(),
      classe: editTurmaClasse,
      nivelEnsino: getNivelEnsinoPorClasse(editTurmaClasse),
      turno: editTurmaTurno,
      sala: validacao.salaAjustada,
      curso: validacao.cursoAjustado,
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

  // HANDLERS DE DISCIPLINAS
  const handleAbrirEditarDisciplina = (disc: Disciplina) => {
    setDisciplinaSendoEditada(disc);
    setEditDiscNome(disc.nome);
    setEditDiscCodigo(disc.codigo || disc.sigla || '');
    setEditDiscCarga(disc.cargaHorariaSemanal || 4);
    setEditDiscComponente((disc.componente as any) || 'Geral');
    setEditDiscNivel(disc.nivelEnsino || 'ICiclo');
    setShowEditarDisciplinaModal(true);
  };

  const handleSalvarEditarDisciplina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplinaSendoEditada || !editDiscNome.trim()) return;

    const atualizada: Disciplina = {
      ...disciplinaSendoEditada,
      nome: editDiscNome.trim(),
      sigla: editDiscCodigo.trim().substring(0, 4).toUpperCase(),
      codigo: editDiscCodigo.trim(),
      cargaHorariaSemanal: editDiscCarga,
      componente: editDiscComponente,
      nivelEnsino: editDiscNivel
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
      alert(validacao.erro);
      return;
    }

    const nova: Turma = {
      id: `turma-${Date.now()}`,
      escolaId: escola.id,
      nome: novaTurmaNome.trim(),
      classe: novaTurmaClasse,
      nivelEnsino: getNivelEnsinoPorClasse(novaTurmaClasse),
      turno: novaTurmaTurno,
      sala: validacao.salaAjustada,
      curso: validacao.cursoAjustado,
      capacidade: novaTurmaCapacidade,
      anoLectivo: escola.anoLectivoActivo
    };
    onSalvarTurma(nova);
    setShowNovaTurmaModal(false);
    setNovaTurmaNome('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Turma "${nova.nome}" criada e vinculada a ${nova.sala} com sucesso.` });
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
      fase: '1ª Época'
    };
    onSalvarJuri(novo);
    setShowJuriModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Comissão de Júri "${novo.nomeJuri}" registada com sucesso.` });
  };

  // 5. TURNOS
  const handleAtualizarTurno = (turno: TurnoConfig) => {
    dbService.salvarTurnoConfig(turno);
    setTurnosConfigs(dbService.getTurnosConfigs());
    setFeedbackMsg({ tipo: 'sucesso', texto: `Horário do turno ${turno.nome} atualizado.` });
  };

  // 6. CLASSES
  const handleToggleClasse = (classe: ClasseConfig) => {
    const atualizada = { ...classe, ativa: !classe.ativa };
    dbService.salvarClasseConfig(atualizada);
    setClassesConfigs(dbService.getClassesConfigs());
  };

  // 7. CURSOS
  const handleCreateCurso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCursoNome.trim()) return;
    const novo = {
      id: `curso-${Date.now()}`,
      nome: novoCursoNome.trim(),
      area: novoCursoArea,
      duracao: '3 Anos'
    };
    setCursosList(prev => [...prev, novo]);
    setShowNovoCursoModal(false);
    setNovoCursoNome('');
    setFeedbackMsg({ tipo: 'sucesso', texto: `Curso "${novo.nome}" cadastrado com sucesso.` });
  };

  const handleAbrirEditarCurso = (curso: { id: string; nome: string; area: string; duracao: string }) => {
    setCursoSendoEditado(curso);
    setEditCursoNome(curso.nome);
    setEditCursoArea(curso.area);
    setEditCursoDuracao(curso.duracao || '3 Anos');
    setShowEditarCursoModal(true);
  };

  const handleSalvarEditarCurso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSendoEditado || !editCursoNome.trim()) return;
    setCursosList(prev => prev.map(c => c.id === cursoSendoEditado.id ? {
      ...c,
      nome: editCursoNome.trim(),
      area: editCursoArea,
      duracao: editCursoDuracao
    } : c));
    setShowEditarCursoModal(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: `Curso "${editCursoNome}" atualizado com sucesso.` });
  };

  const handleEliminarCurso = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover o curso "${nome}"?`)) {
      setCursosList(prev => prev.filter(c => c.id !== id));
      setFeedbackMsg({ tipo: 'sucesso', texto: `Curso "${nome}" eliminado.` });
    }
  };

  // 8. DISCIPLINAS (COM SUPORTE A CRIAÇÃO PARA MÚLTIPLAS CLASSES AO MESMO TEMPO E VINCULAÇÃO A CLASSE E CICLO)
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

    const nova: Disciplina = {
      id: `disc-${Date.now()}`,
      nome: novaDiscNome.trim(),
      sigla: novaDiscCodigo ? novaDiscCodigo.toUpperCase() : novaDiscNome.substring(0, 3).toUpperCase(),
      codigo: novaDiscCodigo || `DISC-${Math.floor(100 + Math.random() * 900)}`,
      cargaHorariaSemanal: novaDiscCarga,
      componente: novaDiscComponente,
      nivelEnsino: nivel as any,
      classe: primeiraClasse,
      classes: classesAssociadas,
      ciclo: novaDiscCiclo || formatarCicloPorClasse(primeiraClasse)
    };

    dbService.salvarDisciplina(nova);
    if (onSalvarDisciplina) onSalvarDisciplina(nova);
    setShowNovaDisciplinaModal(false);
    setNovaDiscNome('');
    setNovaDiscCodigo('');
    setNovaDiscClasses(['7ª']);
    setFeedbackMsg({ 
      tipo: 'sucesso', 
      texto: `Disciplina "${nova.nome}" registada e associada com sucesso a ${classesAssociadas.length} classe(s) (${classesAssociadas.join(', ')}) no ciclo ${nova.ciclo}.` 
    });
  };

  // Filtragem de Disciplinas por Classe e Ciclo
  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  const disciplinasFiltradas = useMemo(() => {
    return getDisciplinasPorClasseECiclo(
      disciplinas,
      filtroClasseDisciplinas !== 'TODAS' ? filtroClasseDisciplinas : undefined,
      filtroCicloDisciplinas !== 'TODOS' ? filtroCicloDisciplinas : undefined
    );
  }, [disciplinas, filtroClasseDisciplinas, filtroCicloDisciplinas]);

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
                <p className="text-xs text-gray-500">Ano letivo ativo: <strong>{escola.anoLectivoActivo}</strong> • Trimestre: <strong>{escola.trimestreActivo}º Trimestre</strong></p>
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
                <div className="text-lg font-black text-gray-900">{escola.anoLectivoActivo}</div>
                <span className="text-[10px] text-gray-500 block">Determina o contexto de matrículas e pautas</span>
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
                      onClick={() => handleAlterarEstadoAno(escola.anoLectivoActivo, est)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anosConfigs.map((anoCfg, idx) => {
                const anoNome = anoCfg.ano || anoCfg.rotulo;
                const isAtivo = anoNome === escola.anoLectivoActivo;
                const anoKey = anoCfg.id || anoNome || `ano-${idx}`;
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
                        <strong className="text-gray-900">{isAtivo ? dbService.getAlunos().length : 0}</strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Turmas Cadastradas:</span>
                        <strong className="text-gray-900">{isAtivo ? turmas.length : 0}</strong>
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
          </div>
        </div>
      )}

      {/* 3. ABA CURSOS */}
      {activeSubTab === 'cursos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Cursos e Planos Curriculares Ofertados</h3>
                <p className="text-xs text-gray-500">Formações do ensino geral e técnico-profissional conforme matriz curricular do MED</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoCursoModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Curso</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursosList.map((curso, idx) => (
                <div key={`curso-item-${curso.id || idx}-${idx}`} className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-gray-900">{curso.nome}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                      {curso.duracao}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Área de Formação: <strong>{curso.area}</strong></p>
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
                  Cada disciplina está associada à sua classe e ciclo oficial. Quando seleciona uma classe ou ciclo, visualiza estritamente as disciplinas correspondentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaDisciplinaModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Disciplina</span>
              </button>
            </div>

            {/* BARRA DE FILTRO POR CLASSE E CICLO (REQUISITO EXPLÍCITO DO PROMPT) */}
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

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-700">Filtrar por Classe:</span>
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
                    <option key={c} value={c}>{c} Classe</option>
                  ))}
                </select>
              </div>
            </div>

            {/* LISTAGEM DE DISCIPLINAS FILTRADAS */}
            {disciplinasFiltradas.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
                <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">Nenhuma disciplina cadastrada para o filtro selecionado.</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Selecione outra classe/ciclo ou utilize o botão "Cadastrar Disciplina" para associar disciplinas a esta classe.
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
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span>Carga: <strong>{disc.cargaHorariaSemanal}h/semana</strong></span>
                      <span className="text-blue-700 font-medium">{disc.componente}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ABA TURMAS */}
      {activeSubTab === 'turmas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Turmas do Ano Lectivo {escola.anoLectivoActivo} ({turmas.length})</h3>
              <p className="text-xs text-gray-500">Criação, gestão de salas, turnos e capacidade máxima</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNovaTurmaModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Turma</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmas.map((t, idx) => {
              const coordenador = funcionarios.find(f => f.id === t.coordenadorId);
              const ehIniciacao = t.classe === 'Iniciação';
              const ehFinal = ['6ª', '9ª', '12ª', '13ª'].includes(t.classe);

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
          </div>
        </div>
      )}

      {/* 6. ABA TURNOS */}
      {activeSubTab === 'turnos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Turnos de Funcionamento da Instituição</h3>
              <p className="text-xs text-gray-500">Horários oficiais de entrada, saída, tolerância e dias de funcionamento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {turnosConfigs.map((turno, idx) => (
                <div key={`turno-item-${turno.id || turno.nome || idx}-${idx}`} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-gray-900">{turno.nome}</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      Tolerância: {turno.toleranciaMinutos || 15}m
                    </span>
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
          </div>
        </div>
      )}

      {/* 7. ABA ATRIBUIÇÃO DOCENTE */}
      {activeSubTab === 'atribuicoes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Atribuições Docentes & Coordenações ({atribuicoes.length})</h3>
              <p className="text-xs text-gray-500">Vinculação de professores, disciplinas e turmas para o ano {escola.anoLectivoActivo}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAtribuicaoModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Atribuição</span>
            </button>
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
                  {atribuicoes.map((atrib, idx) => {
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
          setAnosConfigs(dbService.getAnosLectivosConfigs());
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
              <h3 className="text-base font-bold text-gray-900">Cadastrar Nova Turma ({escola.anoLectivoActivo})</h3>
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
                    {classesConfigs.filter(c => c.ativa !== false).map((c, idx) => (
                      <option key={`opt-cls-${c.id || c.nome}-${idx}`} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Turno</label>
                  <select
                    value={novaTurmaTurno}
                    onChange={(e) => setNovaTurmaTurno(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              {/* Curso Obrigatório se for 2º Ciclo */}
              {isSegundoCiclo(novaTurmaClasse) && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Curso Curricular Obrigatório (2º Ciclo) *
                  </label>
                  <select
                    value={novaTurmaCurso}
                    onChange={(e) => setNovaTurmaCurso(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg bg-white font-bold text-purple-900"
                  >
                    {CURSOS_SEGUNDO_CICLO.map(c => (
                      <option key={`nt-c-${c}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sala Obrigatória *</label>
                  <input
                    type="text"
                    list="salas-sugestoes"
                    value={novaTurmaSala}
                    onChange={(e) => setNovaTurmaSala(e.target.value)}
                    placeholder="Ex: Sala 04"
                    required
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                  />
                  <datalist id="salas-sugestoes">
                    {SALAS_PADRAO_ESCOLA.map(s => (
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
                    max={80}
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
                  {turmas.map((t, idx) => (
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

      {/* MODAL NOVO CURSO */}
      {showNovoCursoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Adicionar Curso Curricular</h3>
              <button onClick={() => setShowNovoCursoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateCurso} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Curso</label>
                <input
                  type="text"
                  value={novoCursoNome}
                  onChange={(e) => setNovoCursoNome(e.target.value)}
                  placeholder="Ex: Ciências Humanas"
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Área de Formação</label>
                <select
                  value={novoCursoArea}
                  onChange={(e) => setNovoCursoArea(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="Educação Básica">Educação Básica</option>
                  <option value="Ciências Exatas">Ciências Exatas</option>
                  <option value="Ciências Sociais">Ciências Sociais</option>
                  <option value="Ciências Físicas e Biológicas">Ciências Físicas e Biológicas</option>
                  <option value="Técnico-Profissional">Técnico-Profissional</option>
                  <option value="Saúde">Saúde</option>
                </select>
              </div>
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Curso Curricular</h3>
              <button onClick={() => setShowEditarCursoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSalvarEditarCurso} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Curso</label>
                <input
                  type="text"
                  value={editCursoNome}
                  onChange={(e) => setEditCursoNome(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Área de Formação</label>
                <select
                  value={editCursoArea}
                  onChange={(e) => setEditCursoArea(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Educação Básica">Educação Básica</option>
                  <option value="Ciências Exatas">Ciências Exatas</option>
                  <option value="Ciências Sociais">Ciências Sociais</option>
                  <option value="Ciências Físicas e Biológicas">Ciências Físicas e Biológicas</option>
                  <option value="Técnico-Profissional">Técnico-Profissional</option>
                  <option value="Saúde">Saúde</option>
                </select>
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

      {/* MODAL NOVA CLASSE */}
      {showNovaClasseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Adicionar Nova Classe Escolar</h3>
              <button onClick={() => setShowNovaClasseModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCriarClasse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Classe *</label>
                <input
                  type="text"
                  required
                  value={novaClasseNome}
                  onChange={(e) => setNovaClasseNome(e.target.value)}
                  placeholder="Ex: 1ª Classe, Iniciação, 13ª Classe"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
              </div>

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
                  placeholder="Ex: Avaliação Contínua e Provas Trimestrais"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                />
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
                  Registar Classe
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Classe *</label>
                <input
                  type="text"
                  required
                  value={editClasseNome}
                  onChange={(e) => setEditClasseNome(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg font-bold"
                />
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
                    {classesConfigs.map((c, idx) => (
                      <option key={`edit-opt-cls-${c.id || c.nome}-${idx}`} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Turno</label>
                  <select
                    value={editTurmaTurno}
                    onChange={(e) => setEditTurmaTurno(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              {/* Curso Obrigatório se for 2º Ciclo */}
              {isSegundoCiclo(editTurmaClasse) && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Curso Curricular Oficial (2º Ciclo) *
                  </label>
                  <select
                    value={editTurmaCurso}
                    onChange={(e) => setEditTurmaCurso(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg bg-white font-bold text-purple-900"
                  >
                    {CURSOS_SEGUNDO_CICLO.map(c => (
                      <option key={`edit-c-${c}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

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
                    {SALAS_PADRAO_ESCOLA.map(s => (
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
    </div>
  );
};
