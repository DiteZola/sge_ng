import React, { useState, useMemo } from 'react';
import { 
  Gavel, 
  Scale, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Printer, 
  Search, 
  Plus, 
  Filter, 
  Award, 
  Sliders, 
  Lock, 
  Unlock, 
  Calendar, 
  Clock, 
  X, 
  Check, 
  HelpCircle,
  FileCheck2,
  Trash2,
  Edit2,
  Sparkles,
  Building2,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Eye,
  ShieldCheck,
  Send,
  FileSpreadsheet
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  Aluno, 
  Funcionario, 
  NotaTrimestralConsolidada, 
  ComissaoJuri, 
  CriterioJuri, 
  CondicaoCriterio, 
  MembroComissaoJuri, 
  DeliberacaoAlunoJuri, 
  DecisaoDeliberacaoJuri,
  NotaAlteradaJuri,
  AtaJuri,
  EstadoSessaoJuri,
  AtribuicaoDocente
} from '../types';
import { dbService } from '../services/storage';
import { JuryEngine, AnaliseAlunoJuri } from '../services/juryEngine';
import { InsigniaAngola } from '../constants/insignia';
import { obterInformacaoEscala } from '../services/macEngine';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface JuryCommissionViewProps {
  escola: Escola;
  currentUser: Funcionario;
  comissoes: ComissaoJuri[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  alunos: Aluno[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  atribuicoes: AtribuicaoDocente[];
  funcionarios: Funcionario[];
  onSalvarComissao: (comissao: ComissaoJuri) => void;
  onEliminarComissao?: (comissaoId: string) => void;
  onVoltarParaPainel?: () => void;
}

export type JurySubTab = 
  | 'painel' 
  | 'pauta_geral'
  | 'criterios' 
  | 'analise' 
  | 'deliberacao' 
  | 'validacao' 
  | 'ata' 
  | 'gestao_comissao' 
  | 'auditoria';

export const TODAS_CLASSES_ANGOLA = [
  'Iniciação',
  '1ª', '2ª', '3ª', '4ª', '5ª', '6ª',
  '7ª', '8ª', '9ª',
  '10ª', '11ª', '12ª', '13ª'
];

export const JuryCommissionView: React.FC<JuryCommissionViewProps> = ({
  escola,
  currentUser,
  comissoes,
  turmas,
  disciplinas,
  alunos,
  notasConsolidadas,
  atribuicoes,
  funcionarios,
  onSalvarComissao,
  onEliminarComissao,
  onVoltarParaPainel
}) => {
  // Lista de todas as classes disponíveis (padrão MED + existentes nas turmas)
  const classesDisponiveis = useMemo(() => {
    const setCls = new Set<string>(TODAS_CLASSES_ANGOLA);
    turmas.forEach(t => {
      if (t.classe) setCls.add(t.classe);
    });
    return Array.from(setCls);
  }, [turmas]);

  // Filtro Estrito MED: Direção Geral e Subdireção visualizam todas as comissões da escola.
  // Professores visualizam apenas e exclusivamente as comissões onde estão nomeados (membro, presidente ou secretário).
  const comissoesVisiveis = useMemo(() => {
    const daEscola = comissoes.filter(c => c.escolaId === escola.id);
    const ehDirecao = ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(currentUser.role);
    if (ehDirecao) return daEscola;
    return daEscola.filter(c => 
      c.presidenteId === currentUser.id ||
      c.secretarioId === currentUser.id ||
      c.membros?.some(m => m.usuarioId === currentUser.id || (currentUser.nomeCompleto && m.nome?.toLowerCase().trim() === currentUser.nomeCompleto.toLowerCase().trim()))
    );
  }, [comissoes, escola.id, currentUser]);

  // Comissão ativa selecionada
  const [comissaoIdAtiva, setComissaoIdAtiva] = useState<string>(() => {
    const ondeSouMembro = comissoesVisiveis.find(c => c.membros?.some(m => m.usuarioId === currentUser.id));
    return ondeSouMembro?.id || comissoesVisiveis[0]?.id || '';
  });

  const comissaoAtiva = useMemo(() => {
    return comissoesVisiveis.find(c => c.id === comissaoIdAtiva) || comissoesVisiveis[0];
  }, [comissoesVisiveis, comissaoIdAtiva]);

  const configSistema = dbService.getConfiguracaoSistema();

  // Subaba ativa
  const [subAba, setSubAba] = useState<JurySubTab>('painel');

  // Papel temporário do usuário atual nesta comissão
  const membroAtualInfo = useMemo(() => {
    if (!comissaoAtiva) return null;
    const m = comissaoAtiva.membros?.find(mem => mem.usuarioId === currentUser.id);
    if (m) return m;
    // Se for Diretor Geral ou Admin Geral tem prerrogativas de Presidente / Supervisão
    if (currentUser.role === 'AdminGeral' || currentUser.role === 'DiretorGeral') {
      return {
        usuarioId: currentUser.id,
        nome: currentUser.nomeCompleto,
        email: currentUser.email,
        funcao: 'Presidente' as const,
        cargoOriginal: currentUser.cargo
      };
    }
    return null;
  }, [comissaoAtiva, currentUser]);

  const funcaoNaComissao = membroAtualInfo?.funcao || 'Membro';
  const ehPresidente = funcaoNaComissao === 'Presidente';
  const ehSecretario = funcaoNaComissao === 'Secretario';

  // Filtros do Painel
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [filtroCriterio, setFiltroCriterio] = useState<string>('todos');
  const [filtroDecisao, setFiltroDecisao] = useState<string>('todas');
  const [buscaAluno, setBuscaAluno] = useState<string>('');
  const [filtroPautaStatus, setFiltroPautaStatus] = useState<'todos' | 'aprovados' | 'deliberados' | 'recurso' | 'reprovados'>('todos');

  // Aluno selecionado para ficha detalhada e deliberação
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string | null>(null);

  // Modal para Criar/Editar Critério
  const [modalCriterioAberto, setModalCriterioAberto] = useState(false);
  const [critCodigo, setCritCodigo] = useState('Critério 04');
  const [critNome, setCritNome] = useState('');
  const [critDescricao, setCritDescricao] = useState('');
  const [critFinalidade, setCritFinalidade] = useState<CriterioJuri['finalidade']>('Recurso');
  const [critCondCampo, setCritCondCampo] = useState<CondicaoCriterio['campo']>('percentagem');
  const [critCondOperador, setCritCondOperador] = useState<CondicaoCriterio['operador']>('between');
  const [critCondMin, setCritCondMin] = useState<number>(40);
  const [critCondMax, setCritCondMax] = useState<number>(49);
  const [critCondDisc, setCritCondDisc] = useState<string>('Matemática');
  const [critCondLogico, setCritCondLogico] = useState<'E' | 'OU' | 'NAO'>('E');

  // Modal para Criar Nova Comissão
  const [modalNovaComissao, setModalNovaComissao] = useState(false);
  const [novaComNome, setNovaComNome] = useState('');
  const [novaComSessao, setNovaComSessao] = useState('Sessão nº 004/2026');
  const [novaComClasse, setNovaComClasse] = useState('9ª');
  const [novaComCurso, setNovaComCurso] = useState('Ensino Secundário Geral');
  const [novaComPeriodo, setNovaComPeriodo] = useState('IIIº Trimestre / Exames');
  const [novaComDataInicio, setNovaComDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [novaComDataFim, setNovaComDataFim] = useState('');
  const [novaComPresidenteId, setNovaComPresidenteId] = useState('');
  const [novaComSecretarioId, setNovaComSecretarioId] = useState('');
  const [novaComMembrosIds, setNovaComMembrosIds] = useState<string[]>([]);
  const [novaComTurmasIds, setNovaComTurmasIds] = useState<string[]>([]);
  const [novaComFinalidade, setNovaComFinalidade] = useState('Homologação de notas finais, recurso e exame');

  // Modal para Editar Comissão
  const [modalEditarComissao, setModalEditarComissao] = useState(false);
  const [comissaoSendoEditada, setComissaoSendoEditada] = useState<ComissaoJuri | null>(null);
  const [editComNome, setEditComNome] = useState('');
  const [editComSessao, setEditComSessao] = useState('');
  const [editComClasse, setEditComClasse] = useState('9ª');
  const [editComCurso, setEditComCurso] = useState('Ensino Secundário Geral');
  const [editComPeriodo, setEditComPeriodo] = useState('IIIº Trimestre / Exames');
  const [editComDataInicio, setEditComDataInicio] = useState('');
  const [editComDataFim, setEditComDataFim] = useState('');
  const [editComPresidenteId, setEditComPresidenteId] = useState('');
  const [editComSecretarioId, setEditComSecretarioId] = useState('');
  const [editComMembrosIds, setEditComMembrosIds] = useState<string[]>([]);
  const [editComTurmasIds, setEditComTurmasIds] = useState<string[]>([]);
  const [editComFinalidade, setEditComFinalidade] = useState('');

  // Modal para Alteração de Nota na Pauta pelo Júri
  const [modalAlterarNotaJuri, setModalAlterarNotaJuri] = useState(false);
  const [alunoParaAlterarNota, setAlunoParaAlterarNota] = useState<Aluno | null>(null);
  const [discParaAlterarNotaId, setDiscParaAlterarNotaId] = useState<string>('');
  const [novaNotaJuri, setNovaNotaJuri] = useState<number>(10);
  const [justificativaAlteracaoNota, setJustificativaAlteracaoNota] = useState<string>('');
  const [decisaoAcompanhante, setDecisaoAcompanhante] = useState<'Aprovar' | 'Recurso' | 'Nao_Aprovar' | 'Manter'>('Aprovar');

  // Deliberação do Aluno Selecionado
  const [delibDecisao, setDelibDecisao] = useState<DecisaoDeliberacaoJuri>('Aprovar');
  const [delibJustificativa, setDelibJustificativa] = useState('');
  const [delibObservacoes, setDelibObservacoes] = useState('');
  const [meuParecerTexto, setMeuParecerTexto] = useState('');

  // Notificação / Feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const notificar = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 4500);
  };

  // Motor Automático de Análise dos Alunos da Comissão
  const analisesAlunos = useMemo(() => {
    if (!comissaoAtiva) return [];
    return JuryEngine.analisarAlunosComissao(
      comissaoAtiva,
      alunos,
      turmas,
      disciplinas,
      notasConsolidadas,
      atribuicoes
    );
  }, [comissaoAtiva, alunos, turmas, disciplinas, notasConsolidadas, atribuicoes]);

  // Alunos Filtrados
  const analisesFiltradas = useMemo(() => {
    return analisesAlunos.filter(item => {
      // Filtro Turma
      if (filtroTurma !== 'todas' && item.aluno.turmaId !== filtroTurma) return false;
      // Filtro Critério
      if (filtroCriterio !== 'todos') {
        const atendeCriterio = item.criteriosCumpridos.some(c => c.criterio.id === filtroCriterio);
        if (!atendeCriterio) return false;
      }
      // Filtro Decisão
      if (filtroDecisao !== 'todas') {
        const delib = comissaoAtiva?.deliberacoes?.[item.aluno.id]?.decisao;
        if (filtroDecisao === 'sem_deliberacao' && delib) return false;
        if (filtroDecisao !== 'sem_deliberacao' && delib !== filtroDecisao) return false;
      }
      // Filtro Busca
      if (buscaAluno.trim()) {
        const q = buscaAluno.toLowerCase();
        const nome = item.aluno.nomeCompleto.toLowerCase();
        const num = (item.aluno.numeroProcesso || item.aluno.codigoMatricula || '').toLowerCase();
        if (!nome.includes(q) && !num.includes(q)) return false;
      }
      return true;
    });
  }, [analisesAlunos, filtroTurma, filtroCriterio, filtroDecisao, buscaAluno, comissaoAtiva]);

  // Checklist de Validação Rigorosa
  const checklistValidacao = useMemo(() => {
    if (!comissaoAtiva) return { podeValidar: false, totalPendencias: 0, checklist: [], pendencias: [] };
    return JuryEngine.validarChecklistSessao(comissaoAtiva, analisesAlunos);
  }, [comissaoAtiva, analisesAlunos]);

  // Estatísticas do Painel
  const estatisticas = useMemo(() => {
    const total = analisesAlunos.length;
    let analisados = 0;
    let aprovados = 0;
    let reprovados = 0;
    let recurso = 0;
    let comConflito = 0;
    let pendenciasTotal = 0;

    analisesAlunos.forEach(a => {
      const delib = comissaoAtiva?.deliberacoes?.[a.aluno.id];
      if (delib) {
        analisados++;
        if (delib.decisao === 'Aprovar') aprovados++;
        else if (delib.decisao === 'Nao_Aprovar') reprovados++;
        else if (delib.decisao === 'Recurso' || delib.decisao === 'Reavaliar') recurso++;
      }
      if (a.temConflitoInteresse) comConflito++;
      if (a.pendencias.length > 0) pendenciasTotal += a.pendencias.length;
    });

    return {
      total,
      analisados,
      aprovados,
      reprovados,
      recurso,
      pendentes: total - analisados,
      comConflito,
      pendenciasTotal
    };
  }, [analisesAlunos, comissaoAtiva]);

  // Estudantes Aprovados Directamente Antes da Deliberação da Comissão (Conforme Requisito MED Oficial)
  const alunosAprovadosAntesDeliberacao = useMemo(() => {
    return analisesAlunos.filter(item => {
      const escala = obterInformacaoEscala(item.turma?.classe, item.turma?.nivelEnsino);
      const semNegativas = item.dados.disciplinasNegativas === 0;
      const mediaPositiva = item.dados.mediaGeral >= escala.notaAprovacao;
      const temNotas = item.dados.totalDisciplinas > 0;
      return semNegativas && mediaPositiva && temNotas;
    });
  }, [analisesAlunos]);

  // Nomes das turmas abrangidas pela comissão
  const turmasCorrespondentesNomes = useMemo(() => {
    if (!comissaoAtiva) return 'Todas as turmas';
    const ids = comissaoAtiva.turmasIds || (comissaoAtiva.turmaId ? [comissaoAtiva.turmaId] : []);
    if (ids.length === 0) return `Todas as turmas da ${comissaoAtiva.classe || 'instituição'}`;
    const encontradas = turmas.filter(t => ids.includes(t.id)).map(t => t.nome);
    return encontradas.length > 0 ? encontradas.join(', ') : 'Turmas da Comissão';
  }, [comissaoAtiva, turmas]);

  // Exportar Pauta Geral de Todos os Alunos em Excel
  const handleExportarPautaGeralExcel = () => {
    const linhas = analisesAlunos.map((item, idx) => {
      const escala = obterInformacaoEscala(item.turma?.classe, item.turma?.nivelEnsino);
      const delib = comissaoAtiva?.deliberacoes?.[item.aluno.id];
      const ehAprovadoAntes = item.dados.disciplinasNegativas === 0 && item.dados.mediaGeral >= escala.notaAprovacao && item.dados.totalDisciplinas > 0;
      return {
        'Nº': idx + 1,
        'Nº Processo': item.aluno.numeroProcesso || item.aluno.codigoMatricula,
        'Nome Completo': item.aluno.nomeCompleto,
        'Gênero': item.aluno.genero,
        'Classe': item.turma?.classe || comissaoAtiva?.classe || '',
        'Turma': item.turma?.nome || '',
        'Curso': item.turma?.curso || comissaoAtiva?.curso || 'Geral',
        'Média Geral': item.dados.mediaGeral,
        'Disciplinas Positivas': item.dados.disciplinasPositivas,
        'Disciplinas Negativas': item.dados.disciplinasNegativas,
        'Situação Preliminar': ehAprovadoAntes ? 'Aprovado Directo' : (item.dados.disciplinasNegativas <= 2 ? 'Elegível a Deliberação / Recurso' : 'Não Aprovado'),
        'Deliberação Final do Júri': delib?.decisao || (ehAprovadoAntes ? 'Aprovado (Homologado)' : 'Pendente')
      };
    });
    downloadExcelFile('Pauta_Geral_Juri', linhas, `Pauta_Geral_Juri_${comissaoAtiva?.classe || 'Escola'}_${escola.sigla || 'MED'}.xlsx`);
    notificar('Pauta geral completa de todos os alunos descarregada em formato Excel (.xlsx)!');
  };

  // Aluno Selecionado Atual
  const analiseSelecionada = useMemo(() => {
    if (!alunoSelecionadoId) return analisesAlunos[0] || null;
    return analisesAlunos.find(a => a.aluno.id === alunoSelecionadoId) || analisesAlunos[0] || null;
  }, [alunoSelecionadoId, analisesAlunos]);

  // Salvar Deliberação
  const handleSalvarDeliberacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comissaoAtiva || !analiseSelecionada) return;

    // Conflito de interesse: verificar se o usuário é professor do aluno
    const conf = JuryEngine.verificarConflitoInteresse(
      membroAtualInfo || { usuarioId: currentUser.id, nome: currentUser.nomeCompleto, email: currentUser.email, funcao: 'Membro' },
      analiseSelecionada.aluno,
      atribuicoes
    );

    const pareceresExistentes = comissaoAtiva.deliberacoes?.[analiseSelecionada.aluno.id]?.pareceres || [];
    const novoParecer = meuParecerTexto.trim() ? {
      membroId: currentUser.id,
      membroNome: currentUser.nomeCompleto,
      funcao: funcaoNaComissao,
      parecer: meuParecerTexto.trim(),
      dataHora: new Date().toISOString()
    } : null;

    const pareceresAtualizados = novoParecer 
      ? [...pareceresExistentes.filter(p => p.membroId !== currentUser.id), novoParecer]
      : pareceresExistentes;

    const novaDeliberacao: DeliberacaoAlunoJuri = {
      alunoId: analiseSelecionada.aluno.id,
      alunoNome: analiseSelecionada.aluno.nomeCompleto,
      decisao: delibDecisao,
      justificativa: delibJustificativa.trim() || `Deliberado pelo Júri em conformidade com critérios homologados.`,
      observacoes: delibObservacoes.trim(),
      pareceres: pareceresAtualizados,
      deliberadoPor: `${currentUser.nomeCompleto} (${funcaoNaComissao})`,
      dataHora: new Date().toISOString(),
      conflitoInteresseDetectado: conf.temConflito,
      professoresResponsaveisConflito: analiseSelecionada.professoresConflito,
      criteriosCumpridosIds: analiseSelecionada.criteriosCumpridos.map(c => c.criterio.id),
      explicacaoResultado: analiseSelecionada.criteriosCumpridos.flatMap(c => c.explicacao)
    };

    const comissaoAtualizada: ComissaoJuri = {
      ...comissaoAtiva,
      deliberacoes: {
        ...(comissaoAtiva.deliberacoes || {}),
        [analiseSelecionada.aluno.id]: novaDeliberacao
      }
    };

    onSalvarComissao(comissaoAtualizada);
    dbService.salvarDeliberacaoJuri(comissaoAtiva.id, novaDeliberacao);
    setMeuParecerTexto('');
    notificar(`Deliberação gravada com sucesso para o aluno ${analiseSelecionada.aluno.nomeCompleto}!`);
  };

  // Salvar Novo Critério
  const handleCriarCriterio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comissaoAtiva || !critNome.trim()) return;

    const condicao: CondicaoCriterio = {
      id: `cnd-${Date.now()}`,
      campo: critCondCampo,
      operador: critCondOperador,
      valorMin: critCondMin,
      valorMax: critCondMax,
      disciplinaNome: critCondCampo === 'disciplina_especifica' ? critCondDisc : undefined,
      operadorLogico: critCondLogico
    };

    const novoCriterio: CriterioJuri = {
      id: `crit-${Date.now()}`,
      codigo: critCodigo.trim(),
      nome: critNome.trim(),
      descricao: critDescricao.trim(),
      finalidade: critFinalidade,
      condicoes: [condicao],
      ativo: true
    };

    const criteriosAtuais = comissaoAtiva.criterios || [];
    const comissaoAtualizada: ComissaoJuri = {
      ...comissaoAtiva,
      criterios: [...criteriosAtuais, novoCriterio]
    };

    onSalvarComissao(comissaoAtualizada);
    dbService.salvarJuri(comissaoAtualizada);
    setModalCriterioAberto(false);
    setCritNome('');
    setCritDescricao('');
    notificar(`Critério "${novoCriterio.nome}" homologado com sucesso!`);
  };

  // Remover Critério
  const handleRemoverCriterio = (criterioId: string) => {
    if (!comissaoAtiva || !ehPresidente) return;
    if (!confirm('Tem certeza de que deseja remover este critério da Comissão?')) return;

    const comissaoAtualizada: ComissaoJuri = {
      ...comissaoAtiva,
      criterios: (comissaoAtiva.criterios || []).filter(c => c.id !== criterioId)
    };

    onSalvarComissao(comissaoAtualizada);
    dbService.salvarJuri(comissaoAtualizada);
    notificar('Critério removido com sucesso.');
  };

  // Adicionar Critérios Predefinidos (Ex: menos de 3 negativas, positiva em português, etc.)
  const handleAdicionarCriterioPreset = (tipo: 'menos_3_negativas' | 'lingua_portuguesa_positiva' | 'matematica_positiva' | 'media_geral_9_5') => {
    if (!comissaoAtiva || !ehPresidente) return;

    let novo: CriterioJuri;
    const count = (comissaoAtiva.criterios || []).length + 1;

    if (tipo === 'menos_3_negativas') {
      novo = {
        id: `crit-preset-${Date.now()}`,
        codigo: `Critério 0${count}`,
        nome: 'Alunos com Menos de 3 Disciplinas Negativas',
        descricao: 'Alunos com até 2 negativas admitem transição condicionada ou exame de recurso.',
        finalidade: 'Recurso',
        condicoes: [
          { id: `c-${Date.now()}-1`, campo: 'disciplinas_negativas', operador: '<=', valorMax: 2, operadorLogico: 'E' }
        ],
        ativo: true
      };
    } else if (tipo === 'lingua_portuguesa_positiva') {
      novo = {
        id: `crit-preset-${Date.now()}`,
        codigo: `Critério 0${count}`,
        nome: 'Alunos com Positiva na Língua Portuguesa',
        descricao: 'Condição de mérito: nota na disciplina de Língua Portuguesa maior ou igual a 10 valores.',
        finalidade: 'Aprovacao',
        condicoes: [
          { id: `c-${Date.now()}-2`, campo: 'disciplina_especifica', operador: '>=', valorMin: 10, disciplinaNome: 'Língua Portuguesa', operadorLogico: 'E' }
        ],
        ativo: true
      };
    } else if (tipo === 'matematica_positiva') {
      novo = {
        id: `crit-preset-${Date.now()}`,
        codigo: `Critério 0${count}`,
        nome: 'Alunos com Positiva na Matemática',
        descricao: 'Condição técnica: nota na disciplina de Matemática maior ou igual a 10 valores.',
        finalidade: 'Aprovacao',
        condicoes: [
          { id: `c-${Date.now()}-3`, campo: 'disciplina_especifica', operador: '>=', valorMin: 10, disciplinaNome: 'Matemática', operadorLogico: 'E' }
        ],
        ativo: true
      };
    } else {
      novo = {
        id: `crit-preset-${Date.now()}`,
        codigo: `Critério 0${count}`,
        nome: 'Média Geral Superior ou Igual a 9.5 Valores',
        descricao: 'Aproveitamento geral elegível para deliberação colegial de aprovação por compensação.',
        finalidade: 'Aprovacao',
        condicoes: [
          { id: `c-${Date.now()}-4`, campo: 'media', operador: '>=', valorMin: 9.5, operadorLogico: 'E' }
        ],
        ativo: true
      };
    }

    const comissaoAtualizada: ComissaoJuri = {
      ...comissaoAtiva,
      criterios: [...(comissaoAtiva.criterios || []), novo]
    };
    onSalvarComissao(comissaoAtualizada);
    dbService.salvarJuri(comissaoAtualizada);
    notificar(`Regra deliberativa "${novo.nome}" adicionada com sucesso!`);
  };

  // Abrir Modal de Edição de Comissão
  const handleAbrirEditarComissao = (c: ComissaoJuri) => {
    setComissaoSendoEditada(c);
    setEditComNome(c.nomeJuri);
    setEditComSessao(c.numeroSessao || '');
    setEditComClasse(c.classe);
    setEditComCurso(c.curso || 'Geral');
    setEditComPeriodo(c.periodo || 'IIIº Trimestre / Exames');
    setEditComDataInicio(c.dataInicio || new Date().toISOString().split('T')[0]);
    setEditComDataFim(c.dataEncerramento || c.dataFim || '');
    setEditComPresidenteId(c.presidenteId || c.membros?.find(m => m.funcao === 'Presidente')?.usuarioId || '');
    setEditComSecretarioId(c.secretarioId || c.membros?.find(m => m.funcao === 'Secretario')?.usuarioId || '');
    setEditComMembrosIds(c.membros?.filter(m => m.funcao === 'Membro').map(m => m.usuarioId) || []);
    setEditComTurmasIds(c.turmasIds || []);
    setEditComFinalidade(c.finalidade || 'Homologação de notas finais, recurso e exame');
    setModalEditarComissao(true);
  };

  // Salvar Edição de Comissão
  const handleSalvarEdicaoComissao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comissaoSendoEditada || !editComNome.trim()) return;

    const membros: MembroComissaoJuri[] = [];
    const pres = funcionarios.find(f => f.id === editComPresidenteId);
    if (pres) {
      membros.push({
        usuarioId: pres.id,
        nome: pres.nomeCompleto,
        email: pres.email,
        funcao: 'Presidente',
        cargoOriginal: pres.cargo
      });
    }
    const sec = funcionarios.find(f => f.id === editComSecretarioId);
    if (sec) {
      membros.push({
        usuarioId: sec.id,
        nome: sec.nomeCompleto,
        email: sec.email,
        funcao: 'Secretario',
        cargoOriginal: sec.cargo
      });
    }
    editComMembrosIds.forEach(mId => {
      const f = funcionarios.find(func => func.id === mId);
      if (f && f.id !== editComPresidenteId && f.id !== editComSecretarioId) {
        membros.push({
          usuarioId: f.id,
          nome: f.nomeCompleto,
          email: f.email,
          funcao: 'Membro',
          cargoOriginal: f.cargo,
          ehProfessor: f.ehProfessor
        });
      }
    });

    const atualizada: ComissaoJuri = {
      ...comissaoSendoEditada,
      nomeJuri: editComNome.trim(),
      numeroSessao: editComSessao.trim(),
      classe: editComClasse,
      curso: editComCurso,
      turmasIds: editComTurmasIds.length > 0 ? editComTurmasIds : turmas.map(t => t.id),
      periodo: editComPeriodo,
      dataInicio: editComDataInicio,
      dataEncerramento: editComDataFim,
      finalidade: editComFinalidade,
      presidenteId: editComPresidenteId,
      secretarioId: editComSecretarioId,
      membros
    };

    onSalvarComissao(atualizada);
    dbService.salvarJuri(atualizada);
    setModalEditarComissao(false);
    notificar(`Comissão de Júri "${atualizada.nomeJuri}" atualizada com sucesso!`);
  };

  // Eliminar Comissão
  const handleEliminarComissaoLocal = (comissaoId: string, nome: string) => {
    if (!confirm(`ATENÇÃO: Deseja realmente eliminar a comissão de júri "${nome}"? Esta operação excluirá permanentemente a comissão do sistema.`)) {
      return;
    }
    if (onEliminarComissao) {
      onEliminarComissao(comissaoId);
    } else {
      dbService.excluirJuri(comissaoId);
    }
    if (comissaoIdAtiva === comissaoId) {
      const restantes = comissoes.filter(c => c.id !== comissaoId);
      setComissaoIdAtiva(restantes[0]?.id || '');
    }
    notificar(`Comissão "${nome}" eliminada com sucesso.`);
  };

  // Abrir Modal de Alteração de Nota na Pauta
  const handleAbrirAlterarNota = (aluno: Aluno, discId?: string) => {
    setAlunoParaAlterarNota(aluno);
    const disc = discId ? disciplinas.find(d => d.id === discId) : disciplinas[0];
    setDiscParaAlterarNotaId(disc?.id || disciplinas[0]?.id || '');
    const notaAtual = notasConsolidadas.find(n => n.alunoId === aluno.id && n.disciplinaId === (disc?.id || disciplinas[0]?.id));
    setNovaNotaJuri(notaAtual?.notaFinal || notaAtual?.mediaTrimestral || 10);
    setJustificativaAlteracaoNota('');
    setDecisaoAcompanhante('Aprovar');
    setModalAlterarNotaJuri(true);
  };

  // Salvar Alteração de Nota na Pauta pelo Júri
  const handleSalvarAlteracaoNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comissaoAtiva || !alunoParaAlterarNota) return;

    const disc = disciplinas.find(d => d.id === discParaAlterarNotaId);
    if (!disc) return;

    const notaConsol = notasConsolidadas.find(n => n.alunoId === alunoParaAlterarNota.id && n.disciplinaId === disc.id);
    const notaAnterior = notaConsol?.notaFinal || notaConsol?.mediaTrimestral || 0;

    const alteracao: NotaAlteradaJuri = {
      disciplinaId: disc.id,
      disciplinaNome: disc.nome,
      notaAnterior,
      novaNota: Number(novaNotaJuri),
      motivo: justificativaAlteracaoNota.trim() || 'Ajuste deliberativo pelo Júri de Exames (MED Angola)',
      alteradoPor: `${currentUser.nomeCompleto} (${funcaoNaComissao})`,
      dataHora: new Date().toISOString()
    };

    dbService.salvarNotaAlteradaJuri(comissaoAtiva.id, alunoParaAlterarNota.id, alteracao);

    // Se houver decisão acompanhante (ex: Aprovar ou Recurso), atualiza deliberação
    if (decisaoAcompanhante) {
      const delibAtual = comissaoAtiva.deliberacoes?.[alunoParaAlterarNota.id];
      const novaDelib: DeliberacaoAlunoJuri = {
        alunoId: alunoParaAlterarNota.id,
        alunoNome: alunoParaAlterarNota.nomeCompleto,
        decisao: decisaoAcompanhante === 'Manter' ? (delibAtual?.decisao || 'Aprovar') : decisaoAcompanhante,
        justificativa: justificativaAlteracaoNota.trim() || `Nota na disciplina ${disc.nome} alterada de ${notaAnterior} para ${novaNotaJuri} valores pelo Júri.`,
        observacoes: delibAtual?.observacoes || '',
        pareceres: delibAtual?.pareceres || [],
        deliberadoPor: `${currentUser.nomeCompleto} (${funcaoNaComissao})`,
        dataHora: new Date().toISOString(),
        conflitoInteresseDetectado: false,
        professoresResponsaveisConflito: [],
        criteriosCumpridosIds: delibAtual?.criteriosCumpridosIds || [],
        explicacaoResultado: delibAtual?.explicacaoResultado || [],
        notasAlteradas: [...(delibAtual?.notasAlteradas?.filter(n => n.disciplinaId !== disc.id) || []), alteracao]
      };
      dbService.salvarDeliberacaoJuri(comissaoAtiva.id, novaDelib);
    }

    const jurisAtualizados = dbService.getJuris();
    const juriAtual = jurisAtualizados.find(j => j.id === comissaoAtiva.id);
    if (juriAtual) {
      onSalvarComissao(juriAtual);
    }

    setModalAlterarNotaJuri(false);
    notificar(`Nota na disciplina ${disc.nome} alterada para ${novaNotaJuri} valores com sucesso! Pauta atualizada.`);
  };

  // Validar e Encerrar Sessão (Apenas Presidente e com 0 Pendências)
  const handleValidarResultados = () => {
    if (!comissaoAtiva) return;
    if (!ehPresidente) {
      alert('Apenas o Presidente da Comissão de Júri possui autorização para validar os resultados finais.');
      return;
    }

    if (!checklistValidacao.podeValidar) {
      alert(`Não é possível validar: Existem ${checklistValidacao.totalPendencias} pendências não resolvidas que impedem o encerramento.`);
      return;
    }

    if (!confirm('ATENÇÃO: A validação dos resultados homologa a Pauta Final de cada classe e turma, gera a Ata Oficial definitiva e bloqueia alterações comuns de notas no SGE. Deseja prosseguir?')) {
      return;
    }

    // Gerar Ata Oficial
    const ata = JuryEngine.gerarAtaOficial(comissaoAtiva, escola, analisesAlunos);

    const comissaoValidada: ComissaoJuri = {
      ...comissaoAtiva,
      estado: 'Validada',
      validadaPor: `${currentUser.nomeCompleto} (${funcaoNaComissao})`,
      validadaEm: new Date().toISOString(),
      encerradaEm: new Date().toISOString(),
      bloqueada: true,
      pautaHomologada: true,
      pautaHomologadaEm: new Date().toISOString(),
      pautaHomologadaPor: `${currentUser.nomeCompleto} (${funcaoNaComissao})`,
      ata
    };

    onSalvarComissao(comissaoValidada);
    dbService.validarEEncerrarSessaoJuri(comissaoAtiva.id, currentUser.nomeCompleto, ata);
    setSubAba('ata');
    notificar('Pauta Final Homologada com sucesso! A Ata Oficial foi lavrada e as notas homologadas passam a ser a referência oficial.');
  };

  // Criar Nova Comissão de Júri (Diretor / Admin)
  const handleCriarNovaComissao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaComNome.trim()) return;

    const membros: MembroComissaoJuri[] = [];

    // Presidente
    const pres = funcionarios.find(f => f.id === novaComPresidenteId);
    if (pres) {
      membros.push({
        usuarioId: pres.id,
        nome: pres.nomeCompleto,
        email: pres.email,
        funcao: 'Presidente',
        cargoOriginal: pres.cargo
      });
    }

    // Secretário
    const sec = funcionarios.find(f => f.id === novaComSecretarioId);
    if (sec) {
      membros.push({
        usuarioId: sec.id,
        nome: sec.nomeCompleto,
        email: sec.email,
        funcao: 'Secretario',
        cargoOriginal: sec.cargo
      });
    }

    // Outros Membros
    novaComMembrosIds.forEach(mId => {
      const f = funcionarios.find(func => func.id === mId);
      if (f && f.id !== novaComPresidenteId && f.id !== novaComSecretarioId) {
        membros.push({
          usuarioId: f.id,
          nome: f.nomeCompleto,
          email: f.email,
          funcao: 'Membro',
          cargoOriginal: f.cargo,
          ehProfessor: f.ehProfessor
        });
      }
    });

    const nova: ComissaoJuri = {
      id: `juri-${Date.now()}`,
      escolaId: escola.id,
      nomeJuri: novaComNome.trim(),
      numeroSessao: novaComSessao.trim(),
      classe: novaComClasse,
      curso: novaComCurso,
      turmasIds: novaComTurmasIds.length > 0 ? novaComTurmasIds : turmas.map(t => t.id),
      anoLectivo: escola.anoLectivoActivo,
      periodo: novaComPeriodo,
      dataInicio: novaComDataInicio,
      dataEncerramento: novaComDataFim || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      finalidade: novaComFinalidade,
      estado: 'Aberta',
      presidenteId: novaComPresidenteId,
      secretarioId: novaComSecretarioId,
      membros,
      criterios: [
        {
          id: 'crit-padrao-01',
          codigo: 'Critério 01',
          nome: 'Admissão a Recurso (40% a 49% ou 3 Positivas)',
          descricao: 'Aproveitamento geral entre 40% e 49% para exame de recurso',
          finalidade: 'Recurso',
          condicoes: [
            { id: 'c1', campo: 'percentagem', operador: 'between', valorMin: 40, valorMax: 49, operadorLogico: 'E' },
            { id: 'c2', campo: 'disciplinas_positivas', operador: '>=', valorMin: 3, operadorLogico: 'OU' }
          ],
          ativo: true
        }
      ],
      deliberacoes: {},
      ativa: true,
      criadaEm: new Date().toISOString(),
      criadaPor: currentUser.nomeCompleto
    };

    onSalvarComissao(nova);
    dbService.salvarJuri(nova);
    setComissaoIdAtiva(nova.id);
    setModalNovaComissao(false);
    notificar(`Comissão de Júri "${nova.nomeJuri}" criada com êxito!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA COMISSÃO DE JÚRI & IDENTIFICAÇÃO DE SESSÃO TEMPORÁRIA     */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border-2 border-indigo-500/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10 pointer-events-none">
          <Gavel className="w-80 h-80 text-white" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-black tracking-wide uppercase flex items-center space-x-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>Módulo de Comissão de Júri • MED Angola</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                comissaoAtiva?.estado === 'Validada' || comissaoAtiva?.estado === 'Encerrada'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-400/40'
              }`}>
                {comissaoAtiva?.estado || 'Aberta'}
              </span>
              {comissaoAtiva?.numeroSessao && (
                <span className="text-xs font-mono font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                  {comissaoAtiva.numeroSessao}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-3">
              <span>{comissaoAtiva?.nomeJuri || 'Comissão de Júri de Exame'}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>{escola.nomeOficial}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Ano Letivo: {comissaoAtiva?.anoLectivo || escola.anoLectivoActivo}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Período: {comissaoAtiva?.periodo || 'III Trimestre'}</span>
              </span>
            </div>
          </div>

          {/* Cartão de Sessão Temporária do Utilizador */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Sessão Temporária Ativa:
              </span>
              <div className="font-extrabold text-white text-sm">
                {currentUser.nomeCompleto}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  ehPresidente 
                    ? 'bg-amber-400 text-slate-950 font-black' 
                    : ehSecretario 
                      ? 'bg-blue-400 text-slate-950' 
                      : 'bg-slate-300 text-slate-900'
                }`}>
                  Função: {funcaoNaComissao}
                </span>
                <span className="text-[11px] text-slate-400">Conta: {currentUser.cargo || currentUser.role}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              {onVoltarParaPainel && (
                <button
                  type="button"
                  onClick={onVoltarParaPainel}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  title="Voltar ao Painel Geral sem encerrar a sessão da comissão"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Voltar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alerta de Notificação Flutuante */}
        {mensagemSucesso && (
          <div className="mt-4 p-3 bg-emerald-500/90 text-white rounded-xl text-xs font-bold flex items-center space-x-2 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SUBABAS DE TRABALHO DA COMISSÃO                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'painel' as JurySubTab, label: 'Painel Principal & Casos', icon: Scale, badge: `${analisesAlunos.length}` },
            { id: 'pauta_geral' as JurySubTab, label: 'Pauta Geral & Aprovados', icon: Award, badge: `${alunosAprovadosAntesDeliberacao.length} Aprovados` },
            { id: 'criterios' as JurySubTab, label: 'Critérios Configuráveis', icon: Sliders, badge: `${comissaoAtiva?.criterios?.length || 0}` },
            { id: 'analise' as JurySubTab, label: 'Ficha de Análise do Aluno', icon: BookOpen },
            { id: 'deliberacao' as JurySubTab, label: 'Deliberação & Votos', icon: Gavel, badge: `${estatisticas.analisados}/${estatisticas.total}` },
            { id: 'validacao' as JurySubTab, label: 'Checklist & Validação Rigorosa', icon: ShieldCheck, badge: checklistValidacao.podeValidar ? 'Pronto' : `${checklistValidacao.totalPendencias} Pendências` },
            { id: 'ata' as JurySubTab, label: 'Ata Automática Oficial', icon: FileCheck2 },
            { id: 'gestao_comissao' as JurySubTab, label: 'Gestão de Comissões', icon: Users, badge: `${comissoesVisiveis.length}` },
            { id: 'auditoria' as JurySubTab, label: 'Auditoria & Histórico', icon: Lock }
          ].map(tab => {
            const Icon = tab.icon;
            const ativa = subAba === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubAba(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ativa
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${ativa ? 'text-amber-400' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    ativa ? 'bg-amber-400 text-slate-950' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: PAINEL PRINCIPAL & MOTOR AUTOMÁTICO DE CASOS                      */}
      {/* ========================================================================= */}
      {subAba === 'painel' && (
        <div className="space-y-6">
          {/* Métricas do Painel */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Alunos</span>
              <span className="text-2xl font-black text-gray-900">{estatisticas.total}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Abrangidos no escopo</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase block">Deliberados</span>
              <span className="text-2xl font-black text-blue-700">{estatisticas.analisados}</span>
              <span className="text-[10px] text-blue-600 block mt-0.5">
                {Math.round((estatisticas.analisados / (estatisticas.total || 1)) * 100)}% concluídos
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase block">Aprovados</span>
              <span className="text-2xl font-black text-emerald-700">{estatisticas.aprovados}</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Resultado positivo</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase block">Recurso</span>
              <span className="text-2xl font-black text-amber-700">{estatisticas.recurso}</span>
              <span className="text-[10px] text-amber-600 block mt-0.5">Exame de recurso</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-red-600 uppercase block">Não Aprovados</span>
              <span className="text-2xl font-black text-red-700">{estatisticas.reprovados}</span>
              <span className="text-[10px] text-red-600 block mt-0.5">Sem transição</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-600 uppercase block">Conflitos de Interesse</span>
              <span className="text-2xl font-black text-purple-700">{estatisticas.comConflito}</span>
              <span className="text-[10px] text-purple-600 block mt-0.5">Exigem parecer conjunto</span>
            </div>
          </div>

          {/* Motor Automático: Alunos Agrupados por Critério (conforme especificação) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Motor Automático de Cruzamento de Critérios</h3>
                  <p className="text-xs text-gray-500">
                    O SGE cruza Aluno + Turma + Disciplinas + Notas + Frequência + Critérios em tempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubAba('criterios')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
              >
                Gerir Critérios →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(comissaoAtiva?.criterios || []).map(crit => {
                const alunosQueCumprem = analisesAlunos.filter(a => 
                  a.criteriosCumpridos.some(c => c.criterio.id === crit.id)
                );

                return (
                  <div 
                    key={crit.id} 
                    onClick={() => {
                      setFiltroCriterio(crit.id);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      filtroCriterio === crit.id 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' 
                        : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-extrabold text-xs text-gray-900">{crit.codigo}: {crit.nome}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {crit.finalidade}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Alunos identificados:</span>
                      <span className="font-black text-indigo-700 text-sm">{alunosQueCumprem.length} alunos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barra de Filtros Rápidos */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar aluno por nome ou processo..."
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white font-medium"
              >
                <option value="todas">Todas as Turmas do Júri</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.classe})</option>
                ))}
              </select>

              <select
                value={filtroCriterio}
                onChange={(e) => setFiltroCriterio(e.target.value)}
                className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white font-medium"
              >
                <option value="todos">Todos os Critérios</option>
                {comissaoAtiva?.criterios?.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} ({c.finalidade})</option>
                ))}
              </select>

              <select
                value={filtroDecisao}
                onChange={(e) => setFiltroDecisao(e.target.value)}
                className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white font-medium"
              >
                <option value="todas">Todas as Situações</option>
                <option value="sem_deliberacao">Aguardando Deliberação</option>
                <option value="Aprovar">Aprovados</option>
                <option value="Recurso">Recurso / Recuperação</option>
                <option value="Nao_Aprovar">Não Aprovados</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 font-bold">
              Exibindo <strong>{analisesFiltradas.length}</strong> de {analisesAlunos.length} estudantes
            </div>
          </div>

          {/* Tabela Oficial de Alunos do Júri */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="p-3">N.º / Aluno</th>
                    <th className="p-3">Turma & Classe</th>
                    <th className="p-3 text-center">Média Geral</th>
                    <th className="p-3 text-center">Aprov. (%)</th>
                    <th className="p-3">Critérios Satisfeitos</th>
                    <th className="p-3 text-center">Conflito de Interesse</th>
                    <th className="p-3 text-center">Deliberação do Júri</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analisesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        Nenhum aluno encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    analisesFiltradas.map((item, idx) => {
                      const delib = comissaoAtiva?.deliberacoes?.[item.aluno.id];
                      const escala = obterInformacaoEscala(item.turma?.classe);
                      const aprovado = item.dadosCalculados.mediaGeral >= escala.notaAprovacao;

                      return (
                        <tr key={item.aluno.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              <span className="font-mono text-gray-400 font-bold text-[11px]">
                                {(idx + 1).toString().padStart(2, '0')}
                              </span>
                              <div>
                                <span className="font-bold text-gray-900 block">{item.aluno.nomeCompleto}</span>
                                <span className="text-[10px] font-mono text-gray-500">
                                  Proc. {item.aluno.numeroProcesso || item.aluno.codigoMatricula}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-semibold text-gray-800 block">{item.turma?.nome || 'N/A'}</span>
                            <span className="text-[10px] text-gray-500">{item.turma?.classe} Classe</span>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`font-black text-xs px-2 py-0.5 rounded ${
                              aprovado ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                            }`}>
                              {item.dadosCalculados.mediaGeral} / {escala.escalaMaxima}
                            </span>
                          </td>

                          <td className="p-3 text-center font-bold text-gray-700">
                            {item.dadosCalculados.percentagemAproveitamento}%
                          </td>

                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {item.criteriosCumpridos.length === 0 ? (
                                <span className="text-[10px] text-gray-400 italic">Sem critério específico</span>
                              ) : (
                                item.criteriosCumpridos.map(c => (
                                  <span key={c.criterio.id} className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[10px] font-bold" title={c.explicacao.join('\n')}>
                                    {c.criterio.codigo}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {item.temConflitoInteresse ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200" title={item.professoresConflito.join(', ')}>
                                ⚠️ Conflito
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-medium">Neutro</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {delib ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                delib.decisao === 'Aprovar' ? 'bg-emerald-100 text-emerald-800' :
                                delib.decisao === 'Recurso' ? 'bg-amber-100 text-amber-800' :
                                delib.decisao === 'Nao_Aprovar' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {delib.decisao}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Por Deliberar
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAlunoSelecionadoId(item.aluno.id);
                                setSubAba('analise');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Analisar →
                            </button>
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

      {/* ========================================================================= */}
      {/* ABA: PAUTA GERAL DE TODOS OS ALUNOS & ALUNOS JÁ APROVADOS (REQUISITO PROMPT) */}
      {/* ========================================================================= */}
      {subAba === 'pauta_geral' && (
        <div className="space-y-6">
          {/* Header & Resumo Oficial */}
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Award className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-base font-black text-gray-900">
                    Pauta Geral Oficial da Comissão de Júri
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Homologação Preliminar & Final
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Visualização universal de todos os estudantes sob jurisdição do júri, com identificação destacada dos <strong>alunos já aprovados antes da deliberação</strong> e dos casos sob análise.
                </p>
                <div className="text-[11px] text-indigo-900 mt-1.5 flex flex-wrap gap-2">
                  <span>Classe: <strong>{comissaoAtiva?.classe || 'Geral'}</strong></span>
                  <span>•</span>
                  <span>Turmas: <strong>{turmasCorrespondentesNomes}</strong></span>
                  <span>•</span>
                  <span>Curso: <strong>{comissaoAtiva?.curso || 'Ensino Geral'}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportarPautaGeralExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  title="Descarregar lista completa de todos os alunos e notas em Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Baixar Pauta Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Pauta</span>
                </button>
              </div>
            </div>

            {/* Painel com Métricas de Aproveitamento da Pauta Geral */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total de Alunos</span>
                <span className="text-xl font-black text-slate-900">{analisesAlunos.length}</span>
                <span className="text-[10px] text-slate-500 block">Inscritos na pauta</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Aprovados Directos</span>
                <span className="text-xl font-black text-emerald-800">{alunosAprovadosAntesDeliberacao.length}</span>
                <span className="text-[10px] text-emerald-600 block">Antes da deliberação</span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-blue-700 block">Casos Deliberados</span>
                <span className="text-xl font-black text-blue-800">{estatisticas.analisados}</span>
                <span className="text-[10px] text-blue-600 block">Analisados em sessão</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-amber-700 block">Exame de Recurso</span>
                <span className="text-xl font-black text-amber-800">{estatisticas.recurso}</span>
                <span className="text-[10px] text-amber-600 block">Encaminhados</span>
              </div>
            </div>

            {/* BARRA DE FILTROS DA PAUTA GERAL */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'todos', label: `Todos (${analisesAlunos.length})` },
                  { id: 'aprovados', label: `Aprovados Directos (${alunosAprovadosAntesDeliberacao.length})` },
                  { id: 'deliberados', label: `Deliberados (${estatisticas.analisados})` },
                  { id: 'recurso', label: `Recurso (${estatisticas.recurso})` },
                  { id: 'reprovados', label: `Não Aprovados (${estatisticas.reprovados})` }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setFiltroPautaStatus(b.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filtroPautaStatus === b.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                >
                  <option value="todas">Todas as Turmas</option>
                  {turmas.filter(t => !comissaoAtiva?.turmasIds || comissaoAtiva.turmasIds.length === 0 || comissaoAtiva.turmasIds.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    placeholder="Pesquisar aluno..."
                    className="pl-8 pr-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* TABELA COMPLETA DA PAUTA GERAL */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Nº</th>
                    <th className="p-2.5">Nome Completo do Aluno</th>
                    <th className="p-2.5">Turma</th>
                    <th className="p-2.5 text-center">Disciplinas</th>
                    <th className="p-2.5 text-center">Positivas</th>
                    <th className="p-2.5 text-center">Negativas</th>
                    <th className="p-2.5 text-center">Média Geral</th>
                    <th className="p-2.5 text-center">Situação Prévia à Deliberação</th>
                    <th className="p-2.5 text-center">Deliberação do Júri</th>
                    <th className="p-2.5 text-right w-24">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {analisesAlunos
                    .filter(item => {
                      if (filtroTurma !== 'todas' && item.aluno.turmaId !== filtroTurma) return false;
                      if (buscaAluno.trim()) {
                        const q = buscaAluno.toLowerCase();
                        if (!item.aluno.nomeCompleto.toLowerCase().includes(q) && !(item.aluno.codigoMatricula || '').toLowerCase().includes(q)) return false;
                      }
                      const escala = obterInformacaoEscala(item.turma?.classe, item.turma?.nivelEnsino);
                      const ehAprovadoAntes = item.dados.disciplinasNegativas === 0 && item.dados.mediaGeral >= escala.notaAprovacao && item.dados.totalDisciplinas > 0;
                      const delib = comissaoAtiva?.deliberacoes?.[item.aluno.id];

                      if (filtroPautaStatus === 'aprovados' && !ehAprovadoAntes) return false;
                      if (filtroPautaStatus === 'deliberados' && !delib) return false;
                      if (filtroPautaStatus === 'recurso' && delib?.decisao !== 'Recurso' && delib?.decisao !== 'Reavaliar') return false;
                      if (filtroPautaStatus === 'reprovados' && delib?.decisao !== 'Nao_Aprovar' && (ehAprovadoAntes || item.dados.disciplinasNegativas <= 2)) return false;
                      return true;
                    })
                    .map((item, idx) => {
                      const escala = obterInformacaoEscala(item.turma?.classe, item.turma?.nivelEnsino);
                      const ehAprovadoAntes = item.dados.disciplinasNegativas === 0 && item.dados.mediaGeral >= escala.notaAprovacao && item.dados.totalDisciplinas > 0;
                      const delib = comissaoAtiva?.deliberacoes?.[item.aluno.id];

                      return (
                        <tr key={item.aluno.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 text-center text-gray-400 font-mono font-bold">{idx + 1}</td>
                          <td className="p-2.5">
                            <span className="font-bold text-gray-900 block text-xs">{item.aluno.nomeCompleto}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{item.aluno.codigoMatricula}</span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-700">{item.turma?.nome || 'Turma'}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-600">{item.dados.totalDisciplinas}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{item.dados.disciplinasPositivas}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-red-700">{item.dados.disciplinasNegativas}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded font-black text-xs ${
                              item.dados.mediaGeral >= escala.notaAprovacao ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.dados.mediaGeral}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {ehAprovadoAntes ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Aprovado Directo</span>
                              </span>
                            ) : item.dados.disciplinasNegativas <= 2 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-1">
                                <span>Em Deliberação / Recurso</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-900 border border-red-300">
                                Não Aprovado
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {delib ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                delib.decisao === 'Aprovar' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                delib.decisao === 'Recurso' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                delib.decisao === 'Nao_Aprovar' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {delib.decisao === 'Aprovar' ? 'Homologado Aprovado' : delib.decisao}
                              </span>
                            ) : ehAprovadoAntes ? (
                              <span className="text-[10px] font-bold text-emerald-700">Homologado</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Pendente</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAlunoSelecionadoId(item.aluno.id);
                                setSubAba('analise');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Ver Ficha →
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

      {/* ========================================================================= */}
      {/* ABA 2: CRITÉRIOS CONFIGURÁVEIS DO JÚRI                                    */}
      {/* ========================================================================= */}
      {subAba === 'criterios' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Critérios de Avaliação e Deliberação do Júri</span>
              </h3>
              <p className="text-xs text-gray-500">
                Os critérios NÃO são fixos no código: defina condições flexíveis combinando percentagens, médias, disciplinas e assiduidade.
              </p>
            </div>
            {ehPresidente && (
              <button
                type="button"
                onClick={() => {
                  setCritCodigo(`Critério 0${(comissaoAtiva?.criterios?.length || 0) + 1}`);
                  setModalCriterioAberto(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Critério Personalizado</span>
              </button>
            )}
          </div>

          {/* Atalhos Rápidos para Regras Frequentes do Júri (Requisito MED) */}
          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 p-4 rounded-2xl border border-indigo-200/80 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-700" />
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                Regras e Critérios Deliberativos Rápidos do Júri (Clique para Ativar)
              </h4>
            </div>
            <p className="text-[11px] text-indigo-900/80">
              Parametrize em 1 clique regras padronizadas de deliberação para filtrar alunos e aplicar sugestões de aprovação ou recurso em lote:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAdicionarCriterioPreset('menos_3_negativas')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-900 border border-indigo-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <span>📉 Menos de 3 Negativas</span>
                <span className="text-[10px] opacity-75 font-normal">(Recurso)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarCriterioPreset('lingua_portuguesa_positiva')}
                className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <span>📖 Positiva em Língua Portuguesa</span>
                <span className="text-[10px] opacity-75 font-normal">(Aprovação)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarCriterioPreset('matematica_positiva')}
                className="px-3 py-1.5 bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <span>📐 Positiva em Matemática</span>
                <span className="text-[10px] opacity-75 font-normal">(Aprovação)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarCriterioPreset('media_geral_9_5')}
                className="px-3 py-1.5 bg-white hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <span>⭐ Média Geral ≥ 9.5</span>
                <span className="text-[10px] opacity-75 font-normal">(Compensação)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(comissaoAtiva?.criterios || []).map((crit) => {
              const alunosQueCumprem = analisesAlunos.filter(a => 
                a.criteriosCumpridos.some(c => c.criterio.id === crit.id)
              );

              return (
                <div key={crit.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{crit.codigo}</span>
                        <h4 className="font-extrabold text-sm text-gray-900">{crit.nome}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border">
                        {crit.finalidade}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">{crit.descricao || 'Critério deliberativo homologado pelo Júri.'}</p>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                      <span className="font-bold text-[10px] uppercase text-gray-500 block">Condições de Disparo:</span>
                      {crit.condicoes.map((cond, cIdx) => (
                        <div key={cIdx} className="font-mono text-[11px] text-slate-800">
                          • {cond.campo} {cond.operador} {cond.valorMin !== undefined ? cond.valorMin : ''} {cond.valorMax !== undefined ? `a ${cond.valorMax}` : ''}
                          {cond.disciplinaNome ? ` (${cond.disciplinaNome})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-700">{alunosQueCumprem.length} alunos atendem</span>
                    {ehPresidente && (
                      <button
                        type="button"
                        onClick={() => handleRemoverCriterio(crit.id)}
                        className="text-red-600 hover:text-red-800 p-1 text-xs font-semibold cursor-pointer"
                        title="Eliminar este critério"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: FICHA DE ANÁLISE DO ALUNO (DETALHES, EXPLICAÇÃO & NOTAS)          */}
      {/* ========================================================================= */}
      {subAba === 'analise' && analiseSelecionada && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            {/* Header da Ficha do Aluno */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
              <div className="flex items-center space-x-4">
                {analiseSelecionada.aluno.fotoUrl ? (
                  <img
                    src={analiseSelecionada.aluno.fotoUrl}
                    alt={analiseSelecionada.aluno.nomeCompleto}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-600 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xl shrink-0">
                    {analiseSelecionada.aluno.nomeCompleto.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-gray-900">{analiseSelecionada.aluno.nomeCompleto}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-0.5">
                    <span>Proc. n.º <strong>{analiseSelecionada.aluno.numeroProcesso || analiseSelecionada.aluno.codigoMatricula}</strong></span>
                    <span>•</span>
                    <span>Turma: <strong>{analiseSelecionada.turma?.nome}</strong> ({analiseSelecionada.turma?.classe})</span>
                    <span>•</span>
                    <span>Curso: <strong>{analiseSelecionada.turma?.curso || 'Geral'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Botão de Atalho para Deliberar */}
              <button
                type="button"
                onClick={() => setSubAba('deliberacao')}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Gavel className="w-4 h-4" />
                <span>Registar Deliberação</span>
              </button>
            </div>

            {/* Alerta de Conflito de Interesse */}
            {analiseSelecionada.temConflitoInteresse && (
              <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-xl text-xs text-purple-900 flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-black text-purple-950">Situação de Conflito de Interesse Identificada:</h4>
                  <p>
                    O aluno é lecionado por membro(s) deste Júri: <strong>{analiseSelecionada.professoresConflito.join(', ')}</strong>.
                  </p>
                  <p className="text-[11px] text-purple-700">
                    Conforme os regulamentos do MED, as decisões sobre este aluno exigem parecer colegial e não podem ser validadas individualmente pelo docente responsável pelo lançamento.
                  </p>
                </div>
              </div>
            )}

            {/* Explicação Detalhada do Resultado (Requisito 8) */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Explicação Automática de Resultados pelo SGE</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <span className="font-bold text-emerald-800 block text-[11px] uppercase">Condições Cumpridas:</span>
                  {analiseSelecionada.criteriosCumpridos.length === 0 ? (
                    <p className="text-gray-500 italic text-[11px]">Nenhum critério positivo satisfeito completamente.</p>
                  ) : (
                    analiseSelecionada.criteriosCumpridos.map((c, i) => (
                      <div key={i} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                        <span className="font-bold block">{c.criterio.codigo}: {c.criterio.nome}</span>
                        {c.explicacao.map((exp, eIdx) => (
                          <div key={eIdx} className="text-[11px]">{exp}</div>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-red-800 block text-[11px] uppercase">Condições Não Cumpridas:</span>
                  {analiseSelecionada.criteriosNaoCumpridos.length === 0 ? (
                    <p className="text-emerald-700 font-semibold text-[11px]">Todas as condições exigidas foram satisfeitas.</p>
                  ) : (
                    analiseSelecionada.criteriosNaoCumpridos.map((c, i) => (
                      <div key={i} className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 space-y-1">
                        <span className="font-bold block">{c.criterio.codigo}: {c.criterio.nome}</span>
                        {c.condicoesNaoCumpridas.map((nExp, nIdx) => (
                          <div key={nIdx} className="text-[11px]">{nExp}</div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Pauta Detalhada de Disciplinas do Aluno */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Quadro de Avaliações, MAC e Resultados por Disciplina
              </h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-700 text-[10px] font-black uppercase border-b">
                    <tr>
                      <th className="p-2.5">Disciplina</th>
                      <th className="p-2.5 text-center">MAC</th>
                      <th className="p-2.5 text-center">Prova</th>
                      <th className="p-2.5 text-center">Nota Final</th>
                      <th className="p-2.5 text-center">Situação</th>
                      <th className="p-2.5 text-right">Deliberação / Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {disciplinas.map(disc => {
                      const nota = notasConsolidadas.find(n => n.alunoId === analiseSelecionada.aluno.id && n.disciplinaId === disc.id);
                      const valorFinal = nota?.notaFinal || nota?.mac || 0;
                      const escala = obterInformacaoEscala(analiseSelecionada.turma?.classe);
                      const positiva = valorFinal >= escala.notaAprovacao;
                      const alteracaoJuri = comissaoAtiva?.deliberacoes?.[analiseSelecionada.aluno.id]?.notasAlteradas?.find(na => na.disciplinaId === disc.id);

                      return (
                        <tr key={disc.id} className="hover:bg-gray-50">
                          <td className="p-2.5 font-bold text-gray-900">
                            <div className="flex items-center space-x-1.5">
                              <span>{disc.nome}</span>
                              {alteracaoJuri && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200" title={`Ajustada de ${alteracaoJuri.notaAnterior} para ${alteracaoJuri.novaNota} por ${alteracaoJuri.alteradoPor}. Motivo: ${alteracaoJuri.motivo}`}>
                                  Ajustada pelo Júri
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-mono">{nota?.mac ?? '-'}</td>
                          <td className="p-2.5 text-center font-mono">{nota?.provaTrimestral ?? '-'}</td>
                          <td className="p-2.5 text-center font-mono font-black text-sm">
                            <span className={positiva ? 'text-emerald-700' : 'text-red-700'}>
                              {valorFinal}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              positiva ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {positiva ? 'Positiva' : 'Negativa'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleAbrirAlterarNota(analiseSelecionada.aluno, disc.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors"
                              title="Alterar nota na pauta para positiva ou recurso com justificativa colegial"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Alterar Nota</span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: DELIBERAÇÃO & PARECERES COLETIVOS DO JÚRI                          */}
      {/* ========================================================================= */}
      {subAba === 'deliberacao' && analiseSelecionada && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                  <Gavel className="w-5 h-5 text-indigo-600" />
                  <span>Deliberação Colegial sobre o Estudante</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Aluno: <strong>{analiseSelecionada.aluno.nomeCompleto}</strong> • Turma: {analiseSelecionada.turma?.nome}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                Seu Parecer como: <strong>{funcaoNaComissao}</strong>
              </span>
            </div>

            {/* Pareceres já registrados por outros membros */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Pareceres Registados pelos Membros da Comissão
              </h4>

              {comissaoAtiva?.deliberacoes?.[analiseSelecionada.aluno.id]?.pareceres?.length ? (
                <div className="space-y-2">
                  {comissaoAtiva.deliberacoes[analiseSelecionada.aluno.id].pareceres?.map((p, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{p.membroNome} ({p.funcao})</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(p.dataHora).toLocaleString('pt-AO')}
                        </span>
                      </div>
                      <p className="text-slate-600">{p.parecer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Nenhum parecer formal registado ainda para este aluno.</p>
              )}
            </div>

            {/* Formulário de Registro de Deliberação */}
            <form onSubmit={handleSalvarDeliberacao} className="space-y-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Decisão Deliberada *</label>
                  <select
                    value={delibDecisao}
                    onChange={(e) => setDelibDecisao(e.target.value as any)}
                    className="w-full p-2.5 text-xs border border-gray-300 rounded-lg font-bold bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Aprovar">Aprovar (Transição / Conclusão Plena)</option>
                    <option value="Recurso">Admitir a Exame de Recurso</option>
                    <option value="Reavaliar">Reavaliar / Exame Extraordinário</option>
                    <option value="Nao_Aprovar">Não Aprovar (Retenção Escolar)</option>
                    <option value="Aguardar_Informacao">Aguardar Documentação / Correção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Adicionar o Seu Parecer Técnico</label>
                  <input
                    type="text"
                    value={meuParecerTexto}
                    onChange={(e) => setMeuParecerTexto(e.target.value)}
                    placeholder="Ex: Favorável à transição face ao cumprimento do Critério 01."
                    className="w-full p-2.5 text-xs border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Justificativa Oficial da Deliberação *</label>
                <textarea
                  rows={3}
                  required
                  value={delibJustificativa}
                  onChange={(e) => setDelibJustificativa(e.target.value)}
                  placeholder="Fundamentação regulamentar e pedagógica da decisão adotada..."
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Gravar Deliberação da Comissão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: CHECKLIST & VALIDAÇÃO RIGOROSA COM BLOQUEIO                        */}
      {/* ========================================================================= */}
      {subAba === 'validacao' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Protocolo de Validação Rigorosa da Sessão</span>
                </h3>
                <p className="text-xs text-gray-500">
                  O botão de validação só é habilitado quando 100% das pendências estiverem sanadas.
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  checklistValidacao.podeValidar
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {checklistValidacao.podeValidar ? '✓ Apto para Validação' : `✗ ${checklistValidacao.totalPendencias} Pendências`}
                </span>
              </div>
            </div>

            {/* Checklist Visual de Itens Obrigatórios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklistValidacao.checklist.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex items-start space-x-3 ${
                    item.ok 
                      ? 'border-emerald-200 bg-emerald-50/50' 
                      : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  {item.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900">{item.item}</h4>
                    <p className={`text-[11px] mt-0.5 ${item.ok ? 'text-emerald-700' : 'text-red-700 font-semibold'}`}>
                      {item.detalhe}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Lista Explícita de Pendências a Resolver */}
            {checklistValidacao.pendencias.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <span className="font-bold uppercase text-[11px] block text-amber-950">
                  Pendências Obrigatórias antes da Homologação Definitiva:
                </span>
                <ul className="list-disc list-inside space-y-1">
                  {checklistValidacao.pendencias.map((pend, pIdx) => (
                    <li key={pIdx} className="font-medium">{pend}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ação de Validação e Bloqueio */}
            <div className="p-5 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Encerramento Definitivo & Bloqueio Imutável</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Ao validar, a ata é gerada automaticamente e qualquer alteração posterior de nota exigirá autorização do Diretor e registo forense.
                </p>
              </div>

              <button
                type="button"
                disabled={!checklistValidacao.podeValidar || !ehPresidente}
                onClick={handleValidarResultados}
                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shrink-0 ${
                  checklistValidacao.podeValidar && ehPresidente
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer shadow-lg'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Validar Resultados & Lavrar Ata</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: ATA AUTOMÁTICA OFICIAL (CONFORME ESPECIFICAÇÃO MED ANGOLA)          */}
      {/* ========================================================================= */}
      {subAba === 'ata' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Ata Oficial da Comissão de Júri</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Documento gerado automaticamente com rigor protocolar e traço de assinatura entre título e nome
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const el = document.getElementById('ata-juri-documento-oficial');
                  if (el) {
                    const numAta = comissaoAtiva?.ata?.numeroAta || comissaoAtiva?.numeroSessao || 'Oficial';
                    await downloadElementAsPdf(
                      el,
                      `Ata_Deliberacao_Juri_${numAta.replace(/[\/\s]/g, '_')}`,
                      { orientation: 'portrait' }
                    );
                  }
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                title="Transferir documento oficial em formato PDF (.pdf)"
              >
                <Printer className="w-4 h-4" />
                <span>Baixar em PDF (.pdf)</span>
              </button>
            </div>

            {/* Documento Impresso Oficial da Ata */}
            <div id="ata-juri-documento-oficial" className="p-8 border-2 border-slate-900 rounded-xl space-y-6 bg-white font-serif text-slate-900 leading-relaxed text-justify text-xs">
              {/* Cabeçalho Oficial */}
              <div className="text-center space-y-1">
                <div className="flex justify-center mb-2">
                  {configSistema.insigniaNacionalUrl ? (
                    <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-14 w-14 object-contain mx-auto" />
                  ) : (
                    <InsigniaAngola size={56} />
                  )}
                </div>
                <p className="font-extrabold uppercase tracking-widest text-[11px]">República de Angola</p>
                <p className="font-bold uppercase text-[10px]">Ministério da Educação</p>
                <h2 className="text-base font-black uppercase text-slate-950 mt-1">{escola.nomeOficial}</h2>
                <p className="text-[11px] font-bold text-slate-700">
                  Gabinete da Comissão de Júri de Homologação de Resultados Escolares
                </p>
              </div>

              {/* Título da Ata */}
              <div className="text-center pt-2 border-t border-b border-black py-2">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {comissaoAtiva?.ata?.numeroAta || `ATA DA COMISSÃO DE JÚRI • ${comissaoAtiva?.numeroSessao || 'SESSÃO ORDINÁRIA'}`}
                </h3>
                <div className="text-[11px] font-bold text-slate-800 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mt-1">
                  <span>Ano Lectivo: <strong>{comissaoAtiva?.anoLectivo || escola.anoLectivoActivo}</strong></span>
                  <span>•</span>
                  <span>Período: <strong>{comissaoAtiva?.periodo || 'III Trimestre'}</strong></span>
                  <span>•</span>
                  <span>Classe: <strong className="text-indigo-900">{comissaoAtiva?.classe || 'Geral'}</strong></span>
                  <span>•</span>
                  <span>Turma(s): <strong className="text-indigo-900">{turmasCorrespondentesNomes}</strong></span>
                  <span>•</span>
                  <span>Curso: <strong className="text-indigo-900">{comissaoAtiva?.curso || 'Ensino Geral'}</strong></span>
                </div>
              </div>

              {/* Corpo do Texto da Ata */}
              <div className="space-y-4 text-xs">
                <p>
                  Aos {new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}, reuniu-se nas instalações do <strong>{escola.nomeOficial}</strong>, a Comissão de Júri de Exame e Homologação de Resultados Escolares, sob a jurisdição da <strong>{comissaoAtiva?.classe || 'Geral'} Classe</strong>, Turma(s) <strong>{turmasCorrespondentesNomes}</strong> do curso de <strong>{comissaoAtiva?.curso || 'Ensino Geral'}</strong>, constituída ao abrigo do despacho oficial da Direcção da Escola e em conformidade com as normas regulamentares vigentes no Ministério da Educação da República de Angola.
                </p>

                <p>
                  <strong>1. COMPOSIÇÃO FORMAL DO JÚRI:</strong>
                  <br />
                  • <strong>Presidente:</strong> {comissaoAtiva?.membros?.find(m => m.funcao === 'Presidente')?.nome || comissaoAtiva?.presidenteId || 'Não Atribuído'}
                  <br />
                  • <strong>Secretário:</strong> {comissaoAtiva?.membros?.find(m => m.funcao === 'Secretario')?.nome || 'Não Atribuído'}
                  <br />
                  • <strong>Membros / Vogais:</strong> {comissaoAtiva?.membros?.filter(m => m.funcao === 'Membro').map(m => m.nome).join(', ') || 'Corpo Docente'}
                </p>

                <p>
                  <strong>2. OBJECTIVOS E CRITÉRIOS APLICADOS:</strong>
                  <br />
                  A Comissão procedeu à análise exaustiva e cruzamento computorizado dos registos de aproveitamento na pauta geral de todos os alunos, aplicando os seguintes critérios homologados:
                  {(comissaoAtiva?.criterios || []).map((c, i) => (
                    <span key={i} className="block pl-4">• <strong>{c.codigo}:</strong> {c.nome} ({c.finalidade})</span>
                  ))}
                </p>

                <p>
                  <strong>3. RESULTADOS ESTATÍSTICOS CONSOLIDADOS DA PAUTA GERAL:</strong>
                  <br />
                  Total de Estudantes Avaliados na Pauta Geral: <strong>{analisesAlunos.length}</strong>
                  <br />
                  • <strong>Alunos Aprovados Directos (Antes da Deliberação):</strong> {alunosAprovadosAntesDeliberacao.length}
                  <br />
                  • Casos Analisados e Deliberados pelo Júri: {estatisticas.analisados}
                  <br />
                  • Estudantes Encaminhados para Exame de Recurso: {estatisticas.recurso}
                  <br />
                  • Estudantes Retidos / Não Aprovados: {estatisticas.reprovados}
                  <br />
                  • Conflitos de Interesse Resolvidos: {estatisticas.comConflito}
                </p>

                {/* 4. LISTA DOS ALUNOS APROVADOS ANTES DA DELIBERAÇÃO DA COMISSÃO (REQUISITO EXPLÍCITO DO PROMPT) */}
                <div className="pt-2">
                  <p className="font-bold uppercase tracking-wide text-slate-950 mb-1">
                    4. ALUNOS APROVADOS ANTES DA DELIBERAÇÃO DA COMISSÃO (TRANSIÇÃO DIRECTA):
                  </p>
                  <p className="mb-2 text-justify">
                    A Comissão verificou preliminarmente a pauta geral e homologou a aprovação direta dos seguintes <strong>{alunosAprovadosAntesDeliberacao.length}</strong> estudantes que obtiveram aproveitamento escolar positivo em todas as componentes curriculares sem necessidade de deliberação especial ou recurso:
                  </p>

                  {alunosAprovadosAntesDeliberacao.length === 0 ? (
                    <p className="italic text-slate-500 pl-4 py-1">Nenhum aluno com aprovação preliminar automática registado.</p>
                  ) : (
                    <div className="border border-slate-400 rounded-sm overflow-hidden my-2">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-400 font-bold uppercase text-slate-800">
                          <tr>
                            <th className="p-1.5 w-8 text-center border-r border-slate-300">Nº</th>
                            <th className="p-1.5 w-24 border-r border-slate-300">Nº Processo</th>
                            <th className="p-1.5 border-r border-slate-300">Nome Completo do Aluno</th>
                            <th className="p-1.5 w-24 border-r border-slate-300 text-center">Turma</th>
                            <th className="p-1.5 w-20 border-r border-slate-300 text-center">Média Final</th>
                            <th className="p-1.5 w-32 text-center">Situação Prévia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {alunosAprovadosAntesDeliberacao.map((item, idx) => {
                            const escala = obterInformacaoEscala(item.turma?.classe, item.turma?.nivelEnsino);
                            return (
                              <tr key={item.aluno.id} className="hover:bg-slate-50">
                                <td className="p-1 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                                <td className="p-1 font-mono font-bold border-r border-slate-300">{item.aluno.numeroProcesso || item.aluno.codigoMatricula}</td>
                                <td className="p-1 font-medium border-r border-slate-300">{item.aluno.nomeCompleto}</td>
                                <td className="p-1 text-center border-r border-slate-300">{item.turma?.nome || 'Turma A'}</td>
                                <td className="p-1 text-center font-bold border-r border-slate-300">{item.dados.mediaGeral.toFixed(1)} / {escala.escalaMaxima}</td>
                                <td className="p-1 text-center font-bold text-emerald-800">Aprovado Directo</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. DELIBERAÇÕES EFETIVADAS PELO JÚRI */}
                <div className="pt-2">
                  <p className="font-bold uppercase tracking-wide text-slate-950 mb-1">
                    5. DELIBERAÇÕES COLEGIAIS E CASOS ANALISADOS EM SESSÃO:
                  </p>
                  <p className="mb-2 text-justify">
                    Para os casos que suscitaram análise por notas limiares ou situações de arredondamento e recurso, a Comissão deliberou conforme segue:
                  </p>

                  {Object.keys(comissaoAtiva?.deliberacoes || {}).length === 0 ? (
                    <p className="italic text-slate-500 pl-4 py-1">Nenhuma deliberação extraordinária registada nesta sessão.</p>
                  ) : (
                    <div className="border border-slate-400 rounded-sm overflow-hidden my-2">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-400 font-bold uppercase text-slate-800">
                          <tr>
                            <th className="p-1.5 w-8 text-center border-r border-slate-300">Nº</th>
                            <th className="p-1.5 border-r border-slate-300">Estudante</th>
                            <th className="p-1.5 w-32 border-r border-slate-300 text-center">Decisão Homologada</th>
                            <th className="p-1.5 border-r border-slate-300">Fundamentação / Critério</th>
                            <th className="p-1.5 w-24 text-center">Consenso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {Object.entries(comissaoAtiva?.deliberacoes || {}).map(([alunoId, delib], dIdx) => {
                            const aluno = analisesAlunos.find(a => a.aluno.id === alunoId)?.aluno;
                            return (
                              <tr key={alunoId} className="hover:bg-slate-50">
                                <td className="p-1 text-center font-mono border-r border-slate-300">{dIdx + 1}</td>
                                <td className="p-1 font-bold border-r border-slate-300">{aluno?.nomeCompleto || alunoId}</td>
                                <td className="p-1 text-center font-bold border-r border-slate-300">{delib.decisao}</td>
                                <td className="p-1 text-slate-700 border-r border-slate-300">{delib.justificativa || 'Critério regulamentar colegial'}</td>
                                <td className="p-1 text-center font-mono">{delib.consensoPercentual}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <p>
                  A Comissão atesta que todas as deliberações foram tomadas de forma colegial, com resolução integral de situações de conflito de interesses, ficando os resultados homologados para efeitos de publicação de pautas gerais e emissão de termos e certificados.
                </p>

                <p className="text-right pt-2">
                  {escola.municipio || 'Luanda'}, aos {new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}.
                </p>
              </div>

              {/* Assinaturas com o Traço Rigorosamente entre o Título e o Nome (Requisito Explícito do Prompt) */}
              <div className="pt-8 border-t border-black space-y-8">
                <div className="text-center font-bold text-[11px] uppercase tracking-wider mb-4">
                  Termos de Homologação e Assinaturas da Comissão
                </div>

                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  {/* Presidente: Título -> Traço -> Nome */}
                  <div className="space-y-1">
                    <p className="font-black text-slate-900 uppercase">O Presidente da Comissão de Júri</p>
                    <div className="w-56 border-b-2 border-black mx-auto my-2" />
                    <p className="font-bold text-slate-800">
                      {comissaoAtiva?.membros?.find(m => m.funcao === 'Presidente')?.nome || 'Não Atribuído'}
                    </p>
                  </div>

                  {/* Secretário: Título -> Traço -> Nome */}
                  <div className="space-y-1">
                    <p className="font-black text-slate-900 uppercase">O Secretário da Comissão de Júri</p>
                    <div className="w-56 border-b-2 border-black mx-auto my-2" />
                    <p className="font-bold text-slate-800">
                      {comissaoAtiva?.membros?.find(m => m.funcao === 'Secretario')?.nome || 'Não Atribuído'}
                    </p>
                  </div>
                </div>

                {/* Vogais / Membros */}
                <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4">
                  <div className="space-y-1">
                    <p className="font-black text-slate-900 uppercase">O 1º Vogal / Membro</p>
                    <div className="w-56 border-b-2 border-black mx-auto my-2" />
                    <p className="font-bold text-slate-800">
                      {comissaoAtiva?.membros?.filter(m => m.funcao === 'Membro')[0]?.nome || 'Não Atribuído'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-black text-slate-900 uppercase">O Director Geral da Instituição</p>
                    <div className="w-56 border-b-2 border-black mx-auto my-2" />
                    <p className="font-bold text-slate-800">
                      {escola.diretorGeralNome || 'Não Atribuído'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 7: GESTÃO DE COMISSÕES (CRIAÇÃO PELO DIRETOR/ADMIN)                   */}
      {/* ========================================================================= */}
      {subAba === 'gestao_comissao' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Comissões de Júri Registadas na Instituição</span>
              </h3>
              <p className="text-xs text-gray-500">
                Criação, constituição e delegação de funções sem duplicação de contas de utilizador.
              </p>
            </div>
            {((['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(currentUser.role))) && (
              <button
                type="button"
                onClick={() => setModalNovaComissao(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Nova Comissão</span>
              </button>
            )}
          </div>

          {comissoesVisiveis.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <Gavel className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-800">Nenhuma comissão de júri atribuída</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {currentUser.role === 'Professor' 
                  ? 'Apenas a Direção Geral ou Subdireções podem nomear professores para as comissões. Assim que for nomeado como membro, secretário ou presidente, a sua sessão aparecerá aqui.'
                  : 'Nenhuma comissão de júri ativa nesta instituição. Utilize o botão acima para criar a comissão oficial.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comissoesVisiveis.map(c => {
                const ehAtiva = c.id === comissaoAtiva?.id;
                const podeEditar = (['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(currentUser.role)) || c.presidenteId === currentUser.id;
                return (
                  <div 
                    key={c.id} 
                    className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
                      ehAtiva ? 'border-indigo-600 bg-indigo-50/20 shadow-md' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-gray-900">{c.nomeJuri}</span>
                          {ehAtiva && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                              Em Operação
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 block mt-0.5">
                          {c.numeroSessao || 'Sessão n.º 01'} • Classe: <strong>{c.classe}</strong> • Ano: {c.anoLectivo}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.estado === 'Validada' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {c.estado || 'Aberta'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Membros Designados: <strong>{c.membros?.length || 3} colaboradores</strong></p>
                      <p>Presidente: <strong>{c.membros?.find(m => m.funcao === 'Presidente')?.nome || 'N/A'}</strong></p>
                      <p>Secretário: <strong>{c.membros?.find(m => m.funcao === 'Secretario')?.nome || 'N/A'}</strong></p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setComissaoIdAtiva(c.id);
                          setSubAba('painel');
                          notificar(`Sessão da comissão "${c.nomeJuri}" ativada no painel!`);
                        }}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Entrar Nesta Comissão →
                      </button>
                      {podeEditar && (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleAbrirEditarComissao(c)}
                            className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Editar Comissão de Júri"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {(currentUser.role === 'AdminGeral' || currentUser.role === 'DiretorGeral') && (
                            <button
                              type="button"
                              onClick={() => handleEliminarComissaoLocal(c.id, c.nomeJuri)}
                              className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Eliminar Comissão de Júri"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 8: AUDITORIA FORENSE & HISTÓRICO PERMANENTE                            */}
      {/* ========================================================================= */}
      {subAba === 'auditoria' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <span>Trilha de Auditoria Forense da Comissão de Júri</span>
              </h3>
              <p className="text-xs text-gray-500">
                Registo imutável de todas as ações de abertura, deliberação, validação e auto-recuperação.
              </p>
            </div>

            <div className="space-y-2">
              {dbService.getAuditoria().filter(l => l.acao.includes('Júri') || l.acao.includes('Deliberação') || l.acao.includes('Validação')).slice(0, 15).map((log, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span className="text-indigo-700">{log.acao}</span>
                    <span className="text-gray-400 font-mono text-[10px]">{new Date(log.dataHora).toLocaleString('pt-AO')}</span>
                  </div>
                  <p className="text-gray-600">{log.detalhes}</p>
                  <span className="text-[10px] text-gray-500 block">Operador: {log.utilizadorNome || log.usuarioNome}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO CRITÉRIO CONFIGURÁVEL                                         */}
      {/* ========================================================================= */}
      {modalCriterioAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-gray-900">Configurar Novo Critério pelo Júri</h3>
              <button onClick={() => setModalCriterioAberto(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCriarCriterio} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Código do Critério</label>
                  <input
                    type="text"
                    required
                    value={critCodigo}
                    onChange={(e) => setCritCodigo(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Finalidade da Análise</label>
                  <select
                    value={critFinalidade}
                    onChange={(e) => setCritFinalidade(e.target.value as any)}
                    className="w-full p-2 border rounded-lg font-bold bg-white"
                  >
                    <option value="Recurso">Admissão a Recurso</option>
                    <option value="Aprovacao">Aprovação Direta</option>
                    <option value="Reprovacao">Não Aprovação / Retenção</option>
                    <option value="Recuperacao">Recuperação Pedagógica</option>
                    <option value="Situacao_Especial">Situação Especial</option>
                    <option value="Aguardar_Documentacao">Aguardar Documentação</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Critério *</label>
                <input
                  type="text"
                  required
                  value={critNome}
                  onChange={(e) => setCritNome(e.target.value)}
                  placeholder="Ex: Admissão a Recurso com 40% a 49% e Matemática Positiva"
                  className="w-full p-2 border rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={critDescricao}
                  onChange={(e) => setCritDescricao(e.target.value)}
                  placeholder="Explicação do propósito pedagógico do critério..."
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Condição Inicial */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                <span className="font-bold text-indigo-950 uppercase text-[10px] block">Condição de Disparo:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Parâmetro de Análise</label>
                    <select
                      value={critCondCampo}
                      onChange={(e) => setCritCondCampo(e.target.value as any)}
                      className="w-full p-1.5 border rounded bg-white text-xs font-semibold"
                    >
                      <option value="percentagem">Percentagem de Aproveitamento (%)</option>
                      <option value="media">Média Geral (Valores)</option>
                      <option value="disciplinas_positivas">N.º de Disciplinas Positivas</option>
                      <option value="disciplinas_negativas">N.º de Disciplinas Negativas</option>
                      <option value="disciplina_especifica">Disciplina Específica Positiva</option>
                      <option value="frequencia">Assiduidade (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Operador</label>
                    <select
                      value={critCondOperador}
                      onChange={(e) => setCritCondOperador(e.target.value as any)}
                      className="w-full p-1.5 border rounded bg-white text-xs font-semibold"
                    >
                      <option value="between">Entre (Min e Max)</option>
                      <option value=">=">Maior ou Igual (&gt;=)</option>
                      <option value="<=">Menor ou Igual (&lt;=)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Valor Mínimo</label>
                    <input
                      type="number"
                      value={critCondMin}
                      onChange={(e) => setCritCondMin(Number(e.target.value))}
                      className="w-full p-1.5 border rounded bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Valor Máximo</label>
                    <input
                      type="number"
                      value={critCondMax}
                      onChange={(e) => setCritCondMax(Number(e.target.value))}
                      className="w-full p-1.5 border rounded bg-white text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalCriterioAberto(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Homologar Critério
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR NOVA COMISSÃO (DIRETOR / ADMIN)                             */}
      {/* ========================================================================= */}
      {modalNovaComissao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-gray-900">Constituir Nova Comissão de Júri</h3>
              <button onClick={() => setModalNovaComissao(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCriarNovaComissao} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome da Comissão *</label>
                <input
                  type="text"
                  required
                  value={novaComNome}
                  onChange={(e) => setNovaComNome(e.target.value)}
                  placeholder="Ex: Comissão de Júri de Exames Finais - 12ª Classe"
                  className="w-full p-2 border rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Número da Sessão</label>
                  <input
                    type="text"
                    value={novaComSessao}
                    onChange={(e) => setNovaComSessao(e.target.value)}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Classe Abrangida (Todos os Níveis do MED) *</label>
                  <select
                    value={novaComClasse}
                    onChange={(e) => setNovaComClasse(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold bg-white text-gray-900"
                  >
                    {classesDisponiveis.map(cls => (
                      <option key={`nova-cls-${cls}`} value={cls}>
                        {cls} {cls === 'Iniciação' ? '(Pré-Escolar)' : ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'].includes(cls) ? '(Ensino Primário)' : ['7ª', '8ª', '9ª'].includes(cls) ? '(Iº Ciclo)' : ['10ª', '11ª', '12ª'].includes(cls) ? '(IIº Ciclo Geral)' : '(Ensino Técnico/Magistério)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Presidente do Júri *</label>
                  <select
                    required
                    value={novaComPresidenteId}
                    onChange={(e) => setNovaComPresidenteId(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold bg-white"
                  >
                    <option value="">Selecione o Presidente...</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Secretário do Júri *</label>
                  <select
                    required
                    value={novaComSecretarioId}
                    onChange={(e) => setNovaComSecretarioId(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold bg-white"
                  >
                    <option value="">Selecione o Secretário...</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalNovaComissao(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Constituir Comissão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR COMISSÃO DE JÚRI                                            */}
      {/* ========================================================================= */}
      {modalEditarComissao && comissaoSendoEditada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Edit2 className="w-5 h-5" />
                <h3 className="text-base font-black text-gray-900">Editar Comissão de Júri</h3>
              </div>
              <button onClick={() => setModalEditarComissao(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSalvarEdicaoComissao} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome da Comissão *</label>
                <input
                  type="text"
                  required
                  value={editComNome}
                  onChange={(e) => setEditComNome(e.target.value)}
                  className="w-full p-2 border rounded-lg font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Número da Sessão</label>
                  <input
                    type="text"
                    value={editComSessao}
                    onChange={(e) => setEditComSessao(e.target.value)}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Classe Abrangida *</label>
                  <select
                    value={editComClasse}
                    onChange={(e) => setEditComClasse(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold bg-white text-gray-900"
                  >
                    {classesDisponiveis.map(cls => (
                      <option key={`edit-cls-${cls}`} value={cls}>
                        {cls} {cls === 'Iniciação' ? '(Pré-Escolar)' : ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'].includes(cls) ? '(Ensino Primário)' : ['7ª', '8ª', '9ª'].includes(cls) ? '(Iº Ciclo)' : ['10ª', '11ª', '12ª'].includes(cls) ? '(IIº Ciclo Geral)' : '(Ensino Técnico/Magistério)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Presidente do Júri *</label>
                  <select
                    required
                    value={editComPresidenteId}
                    onChange={(e) => setEditComPresidenteId(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold bg-white"
                  >
                    <option value="">Selecione o Presidente...</option>
                    {funcionarios.map(f => (
                      <option key={`edit-pres-${f.id}`} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Secretário do Júri *</label>
                  <select
                    required
                    value={editComSecretarioId}
                    onChange={(e) => setEditComSecretarioId(e.target.value)}
                    className="w-full p-2 border rounded-lg font-bold bg-white"
                  >
                    <option value="">Selecione o Secretário...</option>
                    {funcionarios.map(f => (
                      <option key={`edit-sec-${f.id}`} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Período Letivo</label>
                  <input
                    type="text"
                    value={editComPeriodo}
                    onChange={(e) => setEditComPeriodo(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Curso Curricular</label>
                  <input
                    type="text"
                    value={editComCurso}
                    onChange={(e) => setEditComCurso(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Finalidade Oficial da Comissão</label>
                <textarea
                  rows={2}
                  value={editComFinalidade}
                  onChange={(e) => setEditComFinalidade(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalEditarComissao(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Gravar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALTERAR NOTA NA PAUTA PELO JÚRI (DELIBERAÇÃO DE NOTAS)              */}
      {/* ========================================================================= */}
      {modalAlterarNotaJuri && alunoParaAlterarNota && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Gavel className="w-5 h-5" />
                <h3 className="text-base font-black text-gray-900">Alterar Nota na Pauta pelo Júri</h3>
              </div>
              <button onClick={() => setModalAlterarNotaJuri(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <Scale className="w-4 h-4 text-amber-700" />
                <span>Poder Deliberativo Colegial do Júri (MED Angola)</span>
              </p>
              <p>
                A alteração de nota na pauta pelo Júri modifica a nota final do aluno para positiva ou encaminhamento a recurso, ficando formalmente registada na auditoria e refletida na Pauta Final Homologada.
              </p>
            </div>

            <form onSubmit={handleSalvarAlteracaoNota} className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 border border-gray-200">
                <div className="font-bold text-gray-900">{alunoParaAlterarNota.nomeCompleto}</div>
                <div className="text-gray-500 text-[11px]">
                  Proc. {alunoParaAlterarNota.numeroProcesso || alunoParaAlterarNota.codigoMatricula} • Turma: {turmas.find(t => t.id === alunoParaAlterarNota.turmaId)?.nome}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Disciplina *</label>
                <select
                  value={discParaAlterarNotaId}
                  onChange={(e) => {
                    setDiscParaAlterarNotaId(e.target.value);
                    const n = notasConsolidadas.find(nc => nc.alunoId === alunoParaAlterarNota.id && nc.disciplinaId === e.target.value);
                    if (n) {
                      setNovaNotaJuri(n.notaFinal || n.mediaTrimestral || 10);
                    }
                  }}
                  className="w-full p-2 border rounded-lg font-bold bg-white text-gray-900"
                >
                  {disciplinas.map(d => (
                    <option key={`opt-alter-disc-${d.id}`} value={d.id}>{d.nome} ({d.sigla})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nova Nota Deliberada *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={20}
                    step={0.1}
                    value={novaNotaJuri}
                    onChange={(e) => setNovaNotaJuri(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg font-black text-indigo-700 text-sm"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Ex: 10 valores para positiva</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Decisão Colegial do Aluno</label>
                  <select
                    value={decisaoAcompanhante}
                    onChange={(e) => setDecisaoAcompanhante(e.target.value as any)}
                    className="w-full p-2 border rounded-lg font-bold bg-white"
                  >
                    <option value="Aprovar">Aprovar (Transição)</option>
                    <option value="Recurso">Admitir a Recurso</option>
                    <option value="Nao_Aprovar">Não Aprovar (Retenção)</option>
                    <option value="Manter">Manter Deliberação Existente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Justificativa da Alteração na Pauta *</label>
                <textarea
                  required
                  rows={2}
                  value={justificativaAlteracaoNota}
                  onChange={(e) => setJustificativaAlteracaoNota(e.target.value)}
                  placeholder="Ex: Aluno contemplado por aprovação por compensação e mérito de frequência..."
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalAlterarNotaJuri(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Homologar Nota na Pauta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
