import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  CreditCard, 
  FileText, 
  Award, 
  Receipt, 
  Check, 
  AlertTriangle,
  QrCode,
  Building2,
  Scissors,
  FileCheck2,
  Calendar,
  Layers,
  User,
  School,
  Table,
  ShieldCheck,
  Gavel,
  Scale,
  Download,
  FileSpreadsheet,
  PenTool,
  Upload,
  Search,
  Settings,
  GraduationCap,
  Users,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  FileDown,
  Smartphone,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import {
  getTurmasPorClasse,
  normalizarClasse,
  isSegundoCiclo,
  isPrimeiroCiclo,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  CURSOS_SEGUNDO_CICLO,
  getSalaDaTurma,
  getCursoDaTurma,
  filtrarDisciplinasDaClasse,
  getDisciplinasMatrizOficial
} from '../services/academicHierarchyService';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { Escola, Aluno, Turma, Disciplina, NotaTrimestralConsolidada, ComissaoJuri, Funcionario } from '../types';
import { formatarTextoPorGenero, validarElegibilidadeCertificado, converterComportamentoParaConceito, isClasseFinal, obterInformacaoEscala } from '../services/macEngine';
import { converterNotaParaExtensoMED, numeroParaExtenso, converterNotaParaCertificadoExtenso } from '../utils/numberToWords';
import { formatarDataAngolana, formatarDataHoraAngolana, hojeAngolano } from '../utils/dateFormat';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument, downloadExcelFile } from '../utils/curriculoAngola';
import {
  exportarBoletimAlunoExcel,
  exportarPautaGeralExcel,
  exportarPautaDisciplinaAnualExcel
} from '../utils/pautaExcelExporter';
import {
  downloadElementAsPdf,
  imprimirElementoDiretamente,
  PdfMarginsMm,
  resolvePdfPageGeometry
} from '../utils/pdfGenerator';
import { OfficialQrCode, gerarPayloadQrDocumento, gerarPayloadQrEstudante } from '../utils/qrCodeUtils';
import { processarFotoUpload } from '../utils/imageCompressor';
import { DocumentTemplateConfigModal } from './DocumentTemplateConfigModal';
import { 
  obterNomeDiretorGeral, 
  obterTituloDiretorGeral, 
  obterTituloDiretorSimples, 
  obterGeneroDiretorGeral,
  obterNomeSubdiretorPedagogico,
  obterTituloSubdiretorPedagogico,
  obterNomeChefeSecretaria,
  obterTituloChefeSecretaria,
  obterNomeCoordenadorTurma,
  obterTituloCoordenadorTurma,
  obterNomeCoordenadorDisciplina,
  obterTituloCoordenadorDisciplina,
  obterPresidenteJuri,
  obterSecretarioJuri,
  obterVogaisJuri
} from '../utils/directorHelper';
import { StudentClassListPdfDocument } from './StudentClassListPdfDocument';

export type DocumentType = 
  | 'boletim_oficial' 
  | 'pautas' 
  | 'declaracao_notas' 
  | 'certificado_ciclo' 
  | 'passes' 
  | 'ficha_individual_aluno'
  | 'ficha_individual_funcionario'
  | 'ficha_presencas'
  | 'recibos' 
  | 'termos_exame'
  | 'lista_nominal';

interface PrintingDocumentsViewProps {
  escola: Escola;
  alunos: Aluno[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  initialDocType?: DocumentType;
  currentUser?: Funcionario;
  atribuicoes?: any[];
}

export const PrintingDocumentsView: React.FC<PrintingDocumentsViewProps> = ({
  escola,
  alunos,
  turmas,
  disciplinas,
  notasConsolidadas,
  initialDocType,
  currentUser,
  atribuicoes
}) => {
  const isProfessor = currentUser?.role === 'Professor';

  // Tipos de documentos permitidos por perfil (Professor só pode emitir Pautas, Presenças, Boletins e Lista Nominal das suas turmas)
  const tiposDocsPermitidos: DocumentType[] = useMemo(() => {
    if (isProfessor) {
      return ['pautas', 'boletim_oficial', 'ficha_presencas', 'lista_nominal'];
    }
    if (currentUser?.role === 'Encarregado') {
      return ['boletim_oficial'];
    }
    return [
      'boletim_oficial',
      'pautas',
      'lista_nominal',
      'declaracao_notas',
      'certificado_ciclo',
      'passes',
      'ficha_individual_aluno',
      'ficha_individual_funcionario',
      'ficha_presencas',
      'recibos',
      'termos_exame'
    ];
  }, [isProfessor, currentUser?.role]);

  const [docType, setDocType] = useState<DocumentType>(() => {
    if (initialDocType && tiposDocsPermitidos.includes(initialDocType)) {
      return initialDocType;
    }
    return isProfessor ? 'pautas' : (initialDocType || 'boletim_oficial');
  });

  useEffect(() => {
    if (initialDocType) {
      if (tiposDocsPermitidos.includes(initialDocType)) {
        setDocType(initialDocType);
      } else if (isProfessor) {
        setDocType('pautas');
      }
    }
  }, [initialDocType, tiposDocsPermitidos, isProfessor]);

  // Atribuições do professor para filtragem estrita
  const atribuicoesDocente = useMemo(() => {
    if (!currentUser || !isProfessor) return [];
    const list = atribuicoes || (dbService.getAtribuicoes ? dbService.getAtribuicoes() : []);
    return list.filter((a: any) => a.professorId === currentUser.id);
  }, [currentUser, isProfessor, atribuicoes]);

  // Turmas permitidas: para Professor, apenas turmas atribuídas
  const turmasPermitidas = useMemo(() => {
    if (!isProfessor) return turmas;
    const ids = new Set(atribuicoesDocente.map((a: any) => a.turmaId));
    const filtradas = turmas.filter(t => ids.has(t.id));
    return filtradas;
  }, [turmas, isProfessor, atribuicoesDocente]);

  // Alunos permitidos: para Professor, apenas discentes das suas turmas atribuídas
  const alunosPermitidos = useMemo(() => {
    if (!isProfessor) return alunos;
    const ids = new Set(turmasPermitidas.map(t => t.id));
    return alunos.filter(a => ids.has(a.turmaId));
  }, [alunos, isProfessor, turmasPermitidas]);

  const anosLectivosConfigs = useMemo(() => dbService.getAnosLectivosConfigs(escola.id), [escola.id]);
  const anosLectivosDisponiveis = useMemo(() => {
    const list = new Set<string>();
    if (escola.anoLectivoActivo) list.add(escola.anoLectivoActivo);
    anosLectivosConfigs.forEach((c: any) => { if (c?.rotulo || c?.ano) list.add(c.rotulo || c.ano); });
    turmasPermitidas.forEach(t => { if (t.anoLectivo) list.add(t.anoLectivo); });
    alunosPermitidos.forEach(a => { 
      if (a.anoLectivo) list.add(a.anoLectivo); 
      if (a.anoMatricula) list.add(a.anoMatricula);
    });
    return Array.from(list).sort().reverse();
  }, [escola.anoLectivoActivo, anosLectivosConfigs, turmasPermitidas, alunosPermitidos]);

  const [selectedAnoLectivo, setSelectedAnoLectivo] = useState<string>(
    escola.anoLectivoActivo || ''
  );
  useEffect(() => {
    setSelectedAnoLectivo(escola.anoLectivoActivo || anosLectivosDisponiveis[0] || '');
  }, [escola.id, escola.anoLectivoActivo, anosLectivosDisponiveis]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>(alunosPermitidos[0]?.id || '');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmasPermitidas[0]?.id || '');
  const [selectedClasse, setSelectedClasse] = useState<string>(() => {
    return turmasPermitidas[0]?.classe ? normalizarClasse(turmasPermitidas[0].classe) : '9ª';
  });
  const [selectedCurso, setSelectedCurso] = useState<string>('TODOS');
  const [buscaAlunoDocumento, setBuscaAlunoDocumento] = useState<string>('');

  const todasClasses = useMemo(() => {
    if (isProfessor) {
      const classesSet = new Set(turmasPermitidas.map(t => normalizarClasse(t.classe)));
      const lista = [
        'Iniciação',
        ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
        ...CLASSES_PRIMEIRO_CICLO,
        ...CLASSES_SEGUNDO_CICLO
      ];
      const filtradas = lista.filter(c => classesSet.has(normalizarClasse(c)));
      return filtradas.length > 0 ? filtradas : Array.from(classesSet);
    }
    return [
      'Iniciação',
      ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
      ...CLASSES_PRIMEIRO_CICLO,
      ...CLASSES_SEGUNDO_CICLO
    ];
  }, [isProfessor, turmasPermitidas]);

  // Turmas filtradas estritamente pelo ano lectivo selecionado
  const turmasDoAnoDocumento = useMemo(() => {
    return turmasPermitidas.filter(t => !t.anoLectivo || !selectedAnoLectivo || t.anoLectivo === selectedAnoLectivo);
  }, [turmasPermitidas, selectedAnoLectivo]);

  // Garantir que a classe inicial existe nas turmas da escola quando aplicável
  useEffect(() => {
    if (turmasDoAnoDocumento.length > 0 && selectedClasse !== 'TODAS') {
      const temNaClasse = getTurmasPorClasse(turmasDoAnoDocumento, selectedClasse).length > 0;
      if (!temNaClasse) {
        const primeiraClasse = normalizarClasse(turmasDoAnoDocumento[0].classe);
        if (primeiraClasse) setSelectedClasse(primeiraClasse);
      }
    }
  }, [turmasDoAnoDocumento, selectedClasse]);

  // Cursos disponíveis para a classe/ano selecionados
  const cursosDisponiveisDocumento = useMemo(() => {
    const set = new Set<string>();
    turmasDoAnoDocumento.forEach(t => {
      if (selectedClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(selectedClasse)) return;
      if (t.curso && t.curso.trim()) set.add(t.curso.trim());
    });
    if (selectedClasse === 'TODAS' || isSegundoCiclo(selectedClasse)) {
      CURSOS_SEGUNDO_CICLO.forEach(c => set.add(c));
    }
    return Array.from(set).sort();
  }, [turmasDoAnoDocumento, selectedClasse]);

  // Turmas da classe e curso selecionados
  const turmasDaClasseSelecionada = useMemo(() => {
    const base = (!selectedClasse || selectedClasse === 'TODAS')
      ? turmasDoAnoDocumento
      : getTurmasPorClasse(turmasDoAnoDocumento, selectedClasse);
    if (!selectedCurso || selectedCurso === 'TODOS') return base;
    return base.filter(t => (t.curso || '').trim().toLowerCase() === selectedCurso.trim().toLowerCase());
  }, [turmasDoAnoDocumento, selectedClasse, selectedCurso]);

  const alunosFiltradosIndividual = useMemo(() => {
    let list = alunosPermitidos.filter(a => {
      const t = turmasPermitidas.find(tm => tm.id === a.turmaId);
      const anoDoAluno = a.anoLectivo || a.anoMatricula || t?.anoLectivo || escola.anoLectivoActivo || '';
      return !selectedAnoLectivo || anoDoAluno === selectedAnoLectivo;
    });

    if (selectedClasse && selectedClasse !== 'TODAS') {
      list = list.filter(a => {
        const t = turmas.find(tm => tm.id === a.turmaId);
        const cl = t ? normalizarClasse(t.classe) : normalizarClasse(a.classeId);
        return cl === normalizarClasse(selectedClasse);
      });
    }
    if (selectedTurmaId && selectedTurmaId !== 'TODAS') {
      list = list.filter(a => a.turmaId === selectedTurmaId);
    }
    if (buscaAlunoDocumento.trim()) {
      list = list.filter(a => 
        safeSearchMatch(a.nomeCompleto, buscaAlunoDocumento) ||
        safeSearchMatch(a.codigoMatricula, buscaAlunoDocumento) ||
        safeSearchMatch(a.numeroProcesso, buscaAlunoDocumento) ||
        safeSearchMatch(a.numeroBI, buscaAlunoDocumento)
      );
    }
    return list;
  }, [alunos, selectedClasse, selectedTurmaId, buscaAlunoDocumento, turmas, selectedAnoLectivo, escola.anoLectivoActivo]);

  const [larguraTermica, setLarguraTermica] = useState<'58mm' | '80mm'>('58mm');
  const [modoEmissao, setModoEmissao] = useState<'individual' | 'turma' | 'classe'>('individual');
  const [layoutBoletim, setLayoutBoletim] = useState<'4_por_folha' | '2_por_folha' | '1_por_folha'>(
    (escola.layoutBoletinsPadrao as any) || '4_por_folha'
  );
  const [layoutPasses, setLayoutPasses] = useState<'8_por_folha' | 'individual'>(
    (escola.layoutPassesPadrao as any) || '8_por_folha'
  );
  const [corTemaPasses, setCorTemaPasses] = useState<string>(
    escola.corTemaPasses || 'azul'
  );
  // Tipo de Certificado para Classes Finais (Primário 6ª, Iº Ciclo 9ª, IIº Ciclo Geral 12ª, Técnico 12ª/13ª)
  const [tipoCertificadoSelecionado, setTipoCertificadoSelecionado] = useState<
    'auto' | 'primario_6' | 'iciclo_9' | 'iiciclo_12' | 'tecnico_12_13'
  >('auto');

  // Gestão de Pautas Oficiais (Geral/Final, Trimestral, Por Disciplina) & Modos de Apresentação
  const [pautaSubTipo, setPautaSubTipo] = useState<'geral_final' | 'trimestral' | 'disciplina'>('geral_final');
  const [pautaTrimestre, setPautaTrimestre] = useState<'1' | '2' | '3'>('1');
  const [pautaDisciplinaId, setPautaDisciplinaId] = useState<string>('');
  const [pautaModoExibicao, setPautaModoExibicao] = useState<'sintetica' | 'analitica'>('sintetica');
  const provaProfessorAtiva = Boolean(escola.nppAtivo);

  // Resolução Unificada dos Responsáveis e Assinaturas Oficiais com Diferenciação Rigorosa de Género
  const funcionariosEscola = useMemo(() => dbService.getFuncionarios(escola.id), [escola.id]);
  const nomeDiretorGeral = useMemo(() => obterNomeDiretorGeral(escola, funcionariosEscola), [escola, funcionariosEscola]);
  const tituloDiretorGeral = useMemo(() => obterTituloDiretorSimples(escola, funcionariosEscola), [escola, funcionariosEscola]);
  
  const subdirectorPedagogicoNome = useMemo(() => {
    return obterNomeSubdiretorPedagogico(escola, funcionariosEscola);
  }, [escola, funcionariosEscola]);

  const chefeSecretariaNome = useMemo(() => {
    return obterNomeChefeSecretaria(escola, funcionariosEscola);
  }, [escola, funcionariosEscola]);

  const getTituloDiretor = (_esc: Escola): string => tituloDiretorGeral;

  const getTituloSubPedagogico = (_esc: Escola): string => {
    return obterTituloSubdiretorPedagogico(escola, funcionariosEscola);
  };

  const getTituloChefeSecretaria = (_esc: Escola): string => {
    return obterTituloChefeSecretaria(escola, funcionariosEscola);
  };

  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());
  useEffect(() => {
    const syncConfig = () => setConfigSistema(dbService.getConfiguracaoSistema());
    window.addEventListener('sge_dados_atualizados_remoto', syncConfig);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', syncConfig);
  }, []);
  const [showAssinaturaModal, setShowAssinaturaModal] = useState(false);
  const [assinaturaPreview, setAssinaturaPreview] = useState(
    escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl || ''
  );

  const handleSalvarAssinatura = () => {
    const escolaAtualizada: Escola = {
      ...escola,
      assinaturaDiretorUrl: assinaturaPreview,
      configuracaoPasses: {
        ...(escola.configuracaoPasses || {}),
        assinaturaDiretorUrl: assinaturaPreview
      } as any
    };
    dbService.salvarEscola(escolaAtualizada);
    setShowAssinaturaModal(false);
  };
  const funcionariosLista: Funcionario[] = useMemo(
    () =>
      dbService
        .obterFuncionarios()
        .filter(f => f.role !== 'AdminGeral' && (escola.id === 'todas' || f.escolaId === escola.id)),
    [escola.id]
  );
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState<string>(funcionariosLista[0]?.id || '');
  const funcionarioSelecionado = funcionariosLista.find(f => f.id === selectedFuncionarioId) || funcionariosLista[0];
  const [dataInicioPresencas, setDataInicioPresencas] = useState<string>(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dataFimPresencas, setDataFimPresencas] = useState<string>(() => {
    const hoje = new Date();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  });
  const [selectedReciboId, setSelectedReciboId] = useState<string>('');

  // Selecionar aluno ativo estritamente dentro da turma e classe selecionadas
  const alunoSelecionado = alunosFiltradosIndividual.find(a => a.id === selectedAlunoId) || alunosFiltradosIndividual[0] || alunos[0];
  const turmaDoAluno = turmas.find(t => t.id === alunoSelecionado?.turmaId);

  // Sincronizar turma selecionada sempre que o filtro de classe/curso mudar
  useEffect(() => {
    if (turmasDaClasseSelecionada.length > 0) {
      if (selectedTurmaId !== 'TODAS' && !turmasDaClasseSelecionada.some(t => t.id === selectedTurmaId)) {
        setSelectedTurmaId(docType === 'lista_nominal' ? 'TODAS' : turmasDaClasseSelecionada[0].id);
      }
    } else {
      setSelectedTurmaId(docType === 'lista_nominal' ? 'TODAS' : '');
    }
  }, [turmasDaClasseSelecionada, selectedTurmaId, docType]);

  // Turma selecionada estritamente dentro da classe do documento
  const turmaSelecionada: Turma = useMemo(() => {
    if (selectedTurmaId && selectedTurmaId !== 'TODAS') {
      const encontrada = turmasDaClasseSelecionada.find(t => t.id === selectedTurmaId);
      if (encontrada) return encontrada;
    }
    return turmasDaClasseSelecionada[0] || ({
      id: '',
      nome: 'Sem Turma Registada',
      classe: selectedClasse !== 'TODAS' ? selectedClasse : '7ª',
      turno: 'Manhã',
      sala: 'Sala 01',
      curso: 'Ensino Geral',
      capacidade: 45,
      escolaId: escola.id,
      anoLectivo: selectedAnoLectivo || escola.anoLectivoActivo
    } as Turma);
  }, [turmasDaClasseSelecionada, selectedTurmaId, selectedClasse, escola.id, escola.anoLectivoActivo, selectedAnoLectivo]);

  // Identificação oficial de classe final de ciclo (6ª, 9ª, 12ª, 13ª) para a turma selecionada
  const ehClasseFinalTurma = useMemo(() => {
    return isClasseFinal(turmaSelecionada?.classe);
  }, [turmaSelecionada?.classe]);

  // Alunos exclusivos e estritos da turma e classe selecionada
  const alunosDaTurma = useMemo(() => {
    if (!turmaSelecionada.id) return [];
    return alunos.filter(a => {
      if (a.turmaId !== turmaSelecionada.id) return false;

      // Se a turma tiver classe definida, o aluno deve pertencer a essa classe
      if (turmaSelecionada.classe && a.classeId) {
        if (normalizarClasse(a.classeId) !== normalizarClasse(turmaSelecionada.classe)) {
          return false;
        }
      }

      const t = turmas.find(tm => tm.id === a.turmaId);
      const ano = a.anoLectivo || a.anoMatricula || t?.anoLectivo || escola.anoLectivoActivo;
      return !selectedAnoLectivo || ano === selectedAnoLectivo;
    });
  }, [alunos, turmaSelecionada, selectedAnoLectivo, turmas, escola.anoLectivoActivo]);

  // Alunos para a Lista Nominal (suporta turma específica OU todas as turmas da classe/curso)
  const alunosListaNominal = useMemo(() => {
    return alunosPermitidos.filter(a => {
      const t = turmas.find(tm => tm.id === a.turmaId);
      const ano = a.anoLectivo || a.anoMatricula || t?.anoLectivo || escola.anoLectivoActivo;
      if (selectedAnoLectivo && ano && ano !== selectedAnoLectivo) return false;
      if (selectedTurmaId && selectedTurmaId !== 'TODAS') {
        return a.turmaId === selectedTurmaId;
      }
      const cl = t ? normalizarClasse(t.classe) : normalizarClasse(a.classeId);
      if (selectedClasse && selectedClasse !== 'TODAS' && cl !== normalizarClasse(selectedClasse)) {
        return false;
      }
      if (selectedCurso && selectedCurso !== 'TODOS') {
        const cur = (t?.curso || a.curso || '').trim().toLowerCase();
        if (cur !== selectedCurso.trim().toLowerCase()) return false;
      }
      return true;
    });
  }, [alunosPermitidos, turmas, selectedAnoLectivo, escola.anoLectivoActivo, selectedTurmaId, selectedClasse, selectedCurso]);

  const alunosDaClasse = useMemo(() => {
    if (!selectedClasse || selectedClasse === 'TODAS') return [];
    return alunos.filter(a => {
      const t = turmas.find(tm => tm.id === a.turmaId);
      const cl = t ? normalizarClasse(t.classe) : normalizarClasse(a.classeId);
      const ano = a.anoLectivo || a.anoMatricula || t?.anoLectivo || escola.anoLectivoActivo;
      return cl === normalizarClasse(selectedClasse) && (!selectedAnoLectivo || ano === selectedAnoLectivo);
    });
  }, [alunos, selectedClasse, selectedAnoLectivo, turmas, escola.anoLectivoActivo]);

  // Sincronizar o discente selecionado automaticamente quando o filtro ou classe muda
  useEffect(() => {
    if (alunosFiltradosIndividual.length > 0 && !alunosFiltradosIndividual.some(a => a.id === selectedAlunoId)) {
      setSelectedAlunoId(alunosFiltradosIndividual[0].id);
    }
  }, [alunosFiltradosIndividual, selectedAlunoId]);

  // Alunos no escopo de impressão
  const alunosParaImprimir = modoEmissao === 'turma' 
    ? alunosDaTurma 
    : modoEmissao === 'classe' 
      ? alunosDaClasse 
      : [alunoSelecionado].filter(Boolean);

  const [modalConfigDocOpen, setModalConfigDocOpen] = useState(false);

  // Contexto académico real do aluno selecionado (para Boletim, Declaração e Certificado)
  const classeAlunoDoc = turmaDoAluno?.classe || alunoSelecionado?.classeId || selectedClasse || '';
  const cursoAlunoDoc = (turmaDoAluno?.curso || alunoSelecionado?.curso || '').trim();
  const ehSegundoCicloAlunoDoc = isSegundoCiclo(classeAlunoDoc);
  const escalaAlunoDoc = useMemo(
    () => obterInformacaoEscala(classeAlunoDoc, turmaDoAluno?.nivelEnsino),
    [classeAlunoDoc, turmaDoAluno?.nivelEnsino]
  );

  // Disciplinas estritas da classe/curso selecionado para documentos de turma (Pautas / Termos)
  const classeEfetivaDocumento = turmaSelecionada?.classe || alunoSelecionado?.classeId || selectedClasse;
  const cursoEfetivoDocumento = isSegundoCiclo(classeEfetivaDocumento)
    ? (turmaSelecionada?.curso || alunoSelecionado?.curso)
    : undefined;

  const disciplinasDaClasseDocumento = useMemo(() => {
    const filtradas = filtrarDisciplinasDaClasse(disciplinas, classeEfetivaDocumento, cursoEfetivoDocumento);
    if (filtradas.length > 0) return filtradas;
    const nomesMatriz = getDisciplinasMatrizOficial(classeEfetivaDocumento, cursoEfetivoDocumento);
    return nomesMatriz.map((nome, idx) => ({
      id: `matriz-doc-${normalizarClasse(classeEfetivaDocumento)}-${idx}`,
      nome,
      sigla: nome.substring(0, 4).toUpperCase(),
      escolaId: escola.id
    } as Disciplina));
  }, [disciplinas, classeEfetivaDocumento, cursoEfetivoDocumento, escola.id]);

  // Disciplinas estritas da classe real do aluno selecionado (Declaração, Boletim, Certificado)
  const disciplinasDaClasseAluno = useMemo(() => {
    const filtradas = filtrarDisciplinasDaClasse(
      disciplinas,
      classeAlunoDoc,
      ehSegundoCicloAlunoDoc ? cursoAlunoDoc : undefined
    );
    if (filtradas.length > 0) return filtradas;
    const nomesMatriz = getDisciplinasMatrizOficial(
      classeAlunoDoc,
      ehSegundoCicloAlunoDoc ? cursoAlunoDoc : undefined
    );
    return nomesMatriz.map((nome, idx) => ({
      id: `matriz-al-${normalizarClasse(classeAlunoDoc)}-${idx}`,
      nome,
      sigla: nome.substring(0, 4).toUpperCase(),
      escolaId: escola.id
    } as Disciplina));
  }, [disciplinas, classeAlunoDoc, ehSegundoCicloAlunoDoc, cursoAlunoDoc, escola.id]);

  // Histórico escolar completo do aluno (inclui 1ª a 13ª classe gravadas no histórico)
  const historicoCompletoAluno = useMemo(() => {
    if (!alunoSelecionado?.id) return null;
    return dbService.getHistoricoEscolarCompleto(alunoSelecionado.id);
  }, [alunoSelecionado?.id, alunoSelecionado?.historicoAnterior]);

  // Notas consolidadas do aluno filtradas estritamente pelas disciplinas da classe real do aluno e ano lectivo
  const notasDoAluno = useMemo(() => {
    if (!alunoSelecionado) return [];
    const anoAluno = alunoSelecionado.anoLectivo || alunoSelecionado.anoMatricula || turmaDoAluno?.anoLectivo || selectedAnoLectivo;
    const raw = notasConsolidadas.filter(n =>
      n.alunoId === alunoSelecionado.id &&
      (!n.anoLectivo || !anoAluno || n.anoLectivo === anoAluno)
    );
    return raw.filter(n =>
      disciplinasDaClasseAluno.some(d =>
        d.id === n.disciplinaId ||
        ((n as any).disciplinaNome && (n as any).disciplinaNome.trim().toLowerCase() === d.nome.trim().toLowerCase())
      )
    );
  }, [notasConsolidadas, alunoSelecionado, turmaDoAluno?.anoLectivo, disciplinasDaClasseAluno, selectedAnoLectivo]);

  // Determinar dinamicamente o nível e modelo do certificado para classes terminais
  const tipoCertificadoEfetivo = useMemo(() => {
    if (tipoCertificadoSelecionado !== 'auto') return tipoCertificadoSelecionado;
    const clNorm = normalizarClasse(alunoSelecionado?.classeId || turmaDoAluno?.classe || turmaSelecionada?.classe || '');
    const curso = (alunoSelecionado?.curso || turmaDoAluno?.curso || turmaSelecionada?.curso || '').toLowerCase();
    if (['iniciação', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª'].includes(clNorm.toLowerCase()) || clNorm.includes('6')) return 'primario_6';
    if (['7ª', '8ª', '9ª'].includes(clNorm.toLowerCase()) || clNorm.includes('9')) return 'iciclo_9';
    if (clNorm.includes('13') || curso.includes('técnico') || curso.includes('tecnico') || curso.includes('magistério') || curso.includes('magisterio')) return 'tecnico_12_13';
    return 'iiciclo_12';
  }, [tipoCertificadoSelecionado, alunoSelecionado, turmaDoAluno, turmaSelecionada]);

  // Verificação de Pauta Homologada pelo Júri para a turma/aluno
  const juris = dbService.getJuris();
  const juriTurmaSelecionada = juris.find(j => 
    (j.classe === turmaSelecionada?.classe || j.turmasIds?.includes(turmaSelecionada?.id)) &&
    (j.pautaHomologada || j.estado === 'Validada')
  );
  const juriAlunoSelecionado = juris.find(j => 
    (j.classe === alunoSelecionado?.classeId || j.turmasIds?.includes(alunoSelecionado?.turmaId)) &&
    (j.pautaHomologada || j.estado === 'Validada')
  );

  // Notas oficiais do aluno selecionado (extraídas da Pauta Final Homologada ou gerais)
  const notasOficiaisAluno = useMemo(() => {
    if (!alunoSelecionado) return [];
    return dbService.obterNotasHomologadasAluno(alunoSelecionado.id);
  }, [alunoSelecionado, notasConsolidadas]);

  // Helper unificado para resolver a nota real do aluno numa disciplina & classe específica
  const resolverNotaRealAluno = (
    disc: Pick<Disciplina, 'id' | 'nome'>,
    classeAlvo?: string
  ): { mac: number | null; npp: number | null; npt: number | null; valorFinal: number | null } => {
    if (!alunoSelecionado) return { mac: null, npp: null, npt: null, valorFinal: null };
    const alvoNorm = normalizarClasse(classeAlvo || classeAlunoDoc);
    const nomeNorm = disc.nome.trim().toLowerCase();
    const isClasseAtualDoAluno = !classeAlvo || alvoNorm === normalizarClasse(classeAlunoDoc);

    // 1) Se for a classe actual do aluno, consultar notas homologadas e consolidadas
    if (isClasseAtualDoAluno) {
      const no = notasOficiaisAluno.find((n: any) =>
        n.disciplinaId === disc.id ||
        (n.disciplinaNome && n.disciplinaNome.trim().toLowerCase() === nomeNorm)
      );
      const notasDisc = notasDoAluno.filter((n: any) =>
        n.disciplinaId === disc.id ||
        (n.disciplinaNome && n.disciplinaNome.trim().toLowerCase() === nomeNorm)
      );
      const nLast = notasDisc[notasDisc.length - 1];
      const macVal = no?.mac ?? nLast?.mac;
      const nppVal = no?.npp ?? nLast?.npp;
      const nptVal = (no as any)?.npt ?? no?.provaTrimestral ?? (nLast as any)?.npt ?? nLast?.provaTrimestral;
      const val = no?.notaFinal ?? no?.mediaTrimestral ?? nLast?.notaFinal ?? nLast?.mediaTrimestral;
      if (val !== undefined && val !== null && !isNaN(Number(val))) {
        return {
          mac: typeof macVal === 'number' ? macVal : null,
          npp: typeof nppVal === 'number' ? nppVal : null,
          npt: typeof nptVal === 'number' ? nptVal : null,
          valorFinal: Number(val)
        };
      }
    }

    // 2) Consultar Histórico Escolar Completo (inclui 1ª à 6ª, 7ª–9ª, 10ª–13ª)
    const histClasse = historicoCompletoAluno?.classes?.find(
      c => normalizarClasse(c.classe) === alvoNorm
    );
    if (histClasse?.notasDisciplinas?.length) {
      const nd = histClasse.notasDisciplinas.find(n => {
        const hn = (n.disciplinaNome || '').trim().toLowerCase();
        return hn === nomeNorm || hn.includes(nomeNorm) || nomeNorm.includes(hn);
      });
      if (nd && typeof nd.notaFinal === 'number') {
        return { mac: null, npp: null, npt: null, valorFinal: nd.notaFinal };
      }
    }

    // 3) Consultar matriz tabular do Histórico Completo (disciplinas.notasPorClasse)
    const discTab = historicoCompletoAluno?.disciplinas?.find(d => {
      const dn = (d.disciplinaNome || '').trim().toLowerCase();
      return dn === nomeNorm || dn.includes(nomeNorm) || nomeNorm.includes(dn);
    });
    if (discTab?.notasPorClasse) {
      const keyMatch = Object.keys(discTab.notasPorClasse).find(k => normalizarClasse(k) === alvoNorm);
      const valTab = keyMatch ? Number(discTab.notasPorClasse[keyMatch]) : NaN;
      if (!isNaN(valTab)) {
        return { mac: null, npp: null, npt: null, valorFinal: valTab };
      }
    }

    // 4) Consultar historicoMultiAno
    const multi = alunoSelecionado.historicoMultiAno?.find(m => {
      const mn = (m.disciplinaNome || '').trim().toLowerCase();
      return mn === nomeNorm || mn.includes(nomeNorm) || nomeNorm.includes(mn);
    });
    if (multi) {
      let multiVal: number | undefined;
      if (alvoNorm === '10ª' && typeof multi.nota10 === 'number') multiVal = multi.nota10;
      else if (alvoNorm === '11ª' && typeof multi.nota11 === 'number') multiVal = multi.nota11;
      else if (alvoNorm === '12ª' && typeof multi.nota12 === 'number') multiVal = multi.nota12;
      else if (!classeAlvo && typeof multi.mediaFinal === 'number') multiVal = multi.mediaFinal;
      if (typeof multiVal === 'number') {
        return { mac: null, npp: null, npt: null, valorFinal: multiVal };
      }
    }

    return { mac: null, npp: null, npt: null, valorFinal: null };
  };

  // Presenças reais da turma no período seleccionado (para Ficha de Presenças)
  const presencasTurmaPeriodo = useMemo(() => {
    if (!turmaSelecionada?.id) return [];
    const todas = dbService.obterPresencasAlunos(turmaSelecionada.id);
    return todas.filter(p => {
      if (dataInicioPresencas && p.data < dataInicioPresencas) return false;
      if (dataFimPresencas && p.data > dataFimPresencas) return false;
      return true;
    });
  }, [turmaSelecionada?.id, dataInicioPresencas, dataFimPresencas]);

  // Recibos e transações reais do estudante selecionado (para Recibos POS)
  const recibosReaisDoAluno = useMemo(() => {
    if (!alunoSelecionado) return [];
    const lista: Array<{
      id: string;
      numeroRecibo: string;
      dataHora: string;
      descricao: string;
      valorKz: number;
      multaKz?: number;
      valorTotalKz: number;
      metodoPagamento: string;
      operadorNome?: string;
      numeroComprovativo?: string;
    }> = [];

    const transacoes = dbService
      .getTransacoesFinanceiras(escola.id)
      .filter(t => t.alunoId === alunoSelecionado.id && t.status !== 'Anulado');

    transacoes.forEach(t => {
      lista.push({
        id: `tx-${t.id}`,
        numeroRecibo: t.numeroRecibo,
        dataHora: t.dataHora,
        descricao: `${t.tipo}${t.mesReferencia ? ` (${t.mesReferencia})` : ''}`,
        valorKz: t.valorKz,
        multaKz: t.multaKz,
        valorTotalKz: t.valorTotalKz,
        metodoPagamento: t.metodoPagamento,
        operadorNome: t.operadorNome,
        numeroComprovativo: t.numeroComprovativo
      });
    });

    const recibos = dbService
      .getRecibos()
      .filter(r => r.escolaId === escola.id && r.alunoId === alunoSelecionado.id);

    recibos.forEach(r => {
      if (!lista.some(item => item.numeroRecibo === r.numeroRecibo)) {
        lista.push({
          id: `rec-${r.id}`,
          numeroRecibo: r.numeroRecibo,
          dataHora: r.dataHora,
          descricao: `Propina / Emolumento${r.mesReferencia ? ` (${r.mesReferencia})` : ''}`,
          valorKz: r.valorPagoKz,
          valorTotalKz: r.valorPagoKz,
          metodoPagamento: r.metodoPagamento,
          operadorNome: r.operadorNome
        });
      }
    });

    return lista;
  }, [escola.id, alunoSelecionado]);

  const reciboAtivoAluno = useMemo(() => {
    if (recibosReaisDoAluno.length === 0) return null;
    return recibosReaisDoAluno.find(r => r.id === selectedReciboId) || recibosReaisDoAluno[0];
  }, [recibosReaisDoAluno, selectedReciboId]);

  // Configurações personalizadas de dizeres, carimbos, insígnia e assinaturas salvas pelo Diretor
  const [configuracoesDoc, setConfiguracoesDoc] = useState(() => dbService.getConfiguracoesDocumentos(escola.id));
  useEffect(() => {
    setConfiguracoesDoc(dbService.getConfiguracoesDocumentos(escola.id));
  }, [escola.id]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  // Estados de Exportação PDF, Formato (A4/Carta), Margens & Responsividade Móvel
  const [orientacaoPdfOverride, setOrientacaoPdfOverride] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [qualidadePdf, setQualidadePdf] = useState<'alta' | 'ultra'>('ultra');
  const [modoVisualizacao, setModoVisualizacao] = useState<'ajustar' | 'real'>('ajustar');
  const [zoomNivel, setZoomNivel] = useState<number>(100);

  const [formatoPaginaPdf, setFormatoPaginaPdf] = useState<'a4' | 'letter'>(() => {
    try {
      const saved = localStorage.getItem('sge_pdf_page_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formato === 'letter' || parsed?.formato === 'a4') return parsed.formato;
      }
    } catch {}
    return 'a4';
  });

  const [margemPdfPreset, setMargemPdfPreset] = useState<'estreita' | 'padrao' | 'larga' | 'personalizada'>(() => {
    try {
      const saved = localStorage.getItem('sge_pdf_page_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (['estreita', 'padrao', 'larga', 'personalizada'].includes(parsed?.preset)) {
          return parsed.preset;
        }
      }
    } catch {}
    return 'padrao';
  });

  const [margensPdfMm, setMargensPdfMm] = useState<PdfMarginsMm>(() => {
    try {
      const saved = localStorage.getItem('sge_pdf_page_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.margens && typeof parsed.margens.top === 'number') {
          return {
            top: Math.max(2, Math.min(35, Number(parsed.margens.top) || 8)),
            right: Math.max(2, Math.min(35, Number(parsed.margens.right) || 8)),
            bottom: Math.max(2, Math.min(35, Number(parsed.margens.bottom) || 8)),
            left: Math.max(2, Math.min(35, Number(parsed.margens.left) || 8))
          };
        }
      }
    } catch {}
    return { top: 8, right: 8, bottom: 8, left: 8 };
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'sge_pdf_page_config',
        JSON.stringify({
          formato: formatoPaginaPdf,
          preset: margemPdfPreset,
          margens: margensPdfMm
        })
      );
    } catch {}
  }, [formatoPaginaPdf, margemPdfPreset, margensPdfMm]);

  const handleAlterarPresetMargem = (preset: 'estreita' | 'padrao' | 'larga' | 'personalizada') => {
    setMargemPdfPreset(preset);
    if (preset === 'estreita') {
      setMargensPdfMm({ top: 5, right: 5, bottom: 5, left: 5 });
    } else if (preset === 'padrao') {
      setMargensPdfMm({ top: 8, right: 8, bottom: 8, left: 8 });
    } else if (preset === 'larga') {
      setMargensPdfMm({ top: 15, right: 15, bottom: 15, left: 15 });
    }
  };

  const handleAtualizarMargemLado = (lado: keyof PdfMarginsMm, valorRaw: string) => {
    const num = Number(valorRaw);
    const clamped = Number.isNaN(num) ? 8 : Math.max(2, Math.min(35, Math.round(num * 10) / 10));
    setMargemPdfPreset('personalizada');
    setMargensPdfMm(prev => ({ ...prev, [lado]: clamped }));
  };

  const recarregarConfiguracoes = () => {
    setConfiguracoesDoc(dbService.getConfiguracoesDocumentos(escola.id));
  };

  useEffect(() => {
    const onRemotoSync = () => setConfiguracoesDoc(dbService.getConfiguracoesDocumentos(escola.id));
    window.addEventListener('sge_dados_atualizados_remoto', onRemotoSync);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', onRemotoSync);
  }, [escola.id]);

  const configAtual = useMemo(() => {
    const chaveTipo = 
      docType === 'boletim_oficial' ? 'boletim_oficial' :
      docType === 'pautas' ? 'pauta_trimestral' :
      docType === 'certificado_ciclo' ? 'certificado' :
      docType === 'declaracao_notas' ? 'declaracao_notas' :
      docType === 'passes' ? 'cartao_estudante' :
      docType === 'termos_exame' ? 'termo_exame' :
      docType === 'recibos' ? 'recibo_pagamento' :
      docType;
    return configuracoesDoc[chaveTipo];
  }, [configuracoesDoc, docType]);

  // Orientação recomendada oficial conforme norma do MED Angola
  const orientacaoRecomendada = useMemo<'portrait' | 'landscape'>(() => {
    if (orientacaoPdfOverride !== 'auto') return orientacaoPdfOverride;
    const ori = configAtual?.disposicao?.orientacao as string | undefined;
    if (ori === 'paisagem' || ori === 'landscape') return 'landscape';
    if (ori === 'retrato' || ori === 'portrait') return 'portrait';
    if (docType === 'pautas' || docType === 'termos_exame' || docType === 'ficha_presencas') {
      return 'landscape';
    }
    return 'portrait';
  }, [orientacaoPdfOverride, configAtual, docType]);

  const limparTextoSistema = (texto?: string): string => {
    if (!texto) return '';
    return texto
      .replace(/Sistema de Gest[aã]o Escolar\s*\(?SGE-NG(?:\s*Angola)?\)?/gi, '')
      .replace(/\bSGE-NG(?:\s*Angola)?\b/gi, '')
      .replace(/\[QR-CODE[^\]]*\]/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const dispConfig = configAtual?.disposicao;
  const exibirInsigniaDoc = dispConfig?.exibirInsigniaRepublica !== false;
  const exibirLogoEscolaDoc =
    dispConfig?.exibirLogoEscola !== false && Boolean((escola.logotipoUrl || escola.logotipo)?.trim());
  const exibirCarimboBrancoDoc = dispConfig?.exibirCarimboBranco !== false;
  const exibirCodigoQrDoc = dispConfig?.exibirCodigoQR !== false;
  const exibirAssinDiretorDoc = dispConfig?.exibirAssinaturaDiretor !== false;
  const exibirAssinSubdiretorDoc = dispConfig?.exibirAssinaturaSubdiretor !== false;
  const corDestaqueDoc = dispConfig?.corDestaque || '#1e3a8a';
  const fontScaleClassDoc =
    dispConfig?.tamanhoFonte === 'compacto'
      ? 'text-[11px]'
      : dispConfig?.tamanhoFonte === 'grande'
      ? 'text-[13.5px]'
      : '';
  const cabecalhoLinhasDoc = useMemo(() => {
    const raw = (configAtual?.textoCabecalho || '')
      .split('\n')
      .map(l => limparTextoSistema(l))
      .filter(Boolean);
    return raw.length > 0 ? raw : null;
  }, [configAtual?.textoCabecalho]);

  const geometriaPdfAtual = useMemo(
    () =>
      resolvePdfPageGeometry({
        format: formatoPaginaPdf,
        orientation: orientacaoRecomendada,
        margins: margensPdfMm
      }),
    [formatoPaginaPdf, orientacaoRecomendada, margensPdfMm]
  );

  const nomeDocumentoCurto = useMemo(() => {
    switch (docType) {
      case 'boletim_oficial': return 'Boletim Trimestral';
      case 'pautas': return 'Pauta Geral / Final';
      case 'declaracao_notas': return 'Declaração com Notas';
      case 'certificado_ciclo': return 'Certificado de Conclusão';
      case 'passes': return 'Passes Escolares (8 por Folha)';
      case 'ficha_individual_aluno': return 'Ficha do Aluno';
      case 'ficha_individual_funcionario': return 'Ficha do Funcionário';
      case 'ficha_presencas': return 'Folha de Presenças';
      case 'recibos': return 'Recibo Térmico POS';
      case 'termos_exame': return 'Termo de Exame';
      default: return 'Documento Oficial';
    }
  }, [docType]);

  const handleBaixarPDF = async () => {
    const el =
      document.getElementById('documento-para-impressao') ||
      document.getElementById('documento-lista-nominal-alunos');
    if (!el) {
      alert('Não foi possível localizar o documento visualizado para gerar o PDF.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const orientacao = orientacaoRecomendada;
      const alunoNomeLimpo = alunoSelecionado?.nomeCompleto?.replace(/[^a-zA-Z0-9]/g, '_') || 'Oficial';
      const turmaNomeLimpo = turmaSelecionada?.nome?.replace(/[^a-zA-Z0-9]/g, '_') || 'Turma';
      const anoLimpo = (selectedAnoLectivo || escola.anoLectivoActivo || '2025_2026').replace(/[\/\\]/g, '_');
      const siglaLimpa = (escola.sigla || 'MED').replace(/[^a-zA-Z0-9]/g, '_');

      let docNomeLimpo = '';
      if (docType === 'boletim_oficial') {
        docNomeLimpo = `Boletim_Notas_${alunoNomeLimpo}_${turmaNomeLimpo}_Trimestre_${escola.trimestreActivo}_${anoLimpo}`;
      } else if (docType === 'pautas') {
        docNomeLimpo = `Pauta_Oficial_Trimestral_${turmaNomeLimpo}_${escola.trimestreActivo}T_${anoLimpo}`;
      } else if (docType === 'declaracao_notas') {
        docNomeLimpo = `Declaracao_Com_Notas_${alunoNomeLimpo}_${siglaLimpa}_${anoLimpo}`;
      } else if (docType === 'certificado_ciclo') {
        docNomeLimpo = `Certificado_Habilitacoes_${alunoNomeLimpo}_${siglaLimpa}`;
      } else if (docType === 'passes') {
        docNomeLimpo = `Passes_Escolares_${turmaNomeLimpo}_${siglaLimpa}_8_por_folha`;
      } else if (docType === 'termos_exame') {
        docNomeLimpo = `Termo_Exame_${turmaNomeLimpo}_${siglaLimpa}_${anoLimpo}`;
      } else if (docType === 'ficha_individual_aluno') {
        docNomeLimpo = `Ficha_Individual_Aluno_${alunoNomeLimpo}_${siglaLimpa}`;
      } else if (docType === 'ficha_presencas') {
        docNomeLimpo = `Ficha_Presencas_${turmaNomeLimpo}_${anoLimpo}`;
      } else if (docType === 'recibos') {
        docNomeLimpo = `Recibo_Pagamento_${alunoNomeLimpo}_${siglaLimpa}_${anoLimpo}`;
      } else {
        docNomeLimpo = `${docType.toUpperCase()}_${alunoNomeLimpo}_${siglaLimpa}`;
      }

      const nomeBase = docNomeLimpo;
      const margensEfetivas =
        docType === 'passes'
          ? { ...margensPdfMm, bottom: Math.max(margensPdfMm.bottom, 12) }
          : margensPdfMm;

      const ok = await downloadElementAsPdf(el, nomeBase, {
        orientation: orientacao,
        format: formatoPaginaPdf,
        margins: margensEfetivas,
        scale: qualidadePdf === 'ultra' ? 2.8 : 2.0
      });
      if (ok) {
        const rotuloFmt = formatoPaginaPdf === 'letter' ? 'Carta' : 'A4';
        setPdfSuccessToast(
          `Ficheiro PDF (${rotuloFmt} • Margens ${margensEfetivas.top}/${margensEfetivas.right}/${margensEfetivas.bottom}/${margensEfetivas.left}mm) "${nomeBase}.pdf" gerado com sucesso!`
        );
        setTimeout(() => setPdfSuccessToast(null), 5000);
      }
    } catch (err: any) {
      console.error('Falha ao descarregar PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const el =
      document.getElementById('documento-para-impressao') ||
      document.getElementById('documento-lista-nominal-alunos');
    if (el) {
      const margensEfetivas =
        docType === 'passes'
          ? { ...margensPdfMm, bottom: Math.max(margensPdfMm.bottom, 12) }
          : margensPdfMm;
      imprimirElementoDiretamente(el, `${docType.toUpperCase()} - ${escola.nomeOficial}`, {
        format: formatoPaginaPdf,
        orientation: orientacaoRecomendada,
        margins: margensEfetivas
      });
    } else {
      handleBaixarPDF();
    }
  };

  const handleBaixarHTML = () => {
    const el = document.getElementById('documento-para-impressao');
    if (!el) {
      handleBaixarPDF();
      return;
    }
    const nomeBase = `${docType.toUpperCase()}_${escola.sigla || 'MED'}_${alunoSelecionado?.codigoMatricula?.replace(/[\/\\]/g, '_') || 'Oficial'}`;
    downloadHtmlDocument(nomeBase, `${docType.toUpperCase()} - ${escola.nomeOficial}`, el.outerHTML);
  };

  const handleBaixarExcel = () => {
    if (docType === 'boletim_oficial') {
      if (!alunoSelecionado) return;
      const listaNotas = notasOficiaisAluno.length > 0 ? notasOficiaisAluno : notasDoAluno;
      exportarBoletimAlunoExcel({
        escola,
        aluno: alunoSelecionado,
        turma: turmaDoAluno || turmaSelecionada,
        trimestreLabel: `${escola.trimestreActivo || '1'}º Trimestre`,
        linhas: listaNotas.map((n: any) => ({
          disciplinaNome: n.disciplinaNome || 'Disciplina',
          mac: typeof n.mac === 'number' ? n.mac : undefined,
          npp: typeof n.npp === 'number' ? n.npp : undefined,
          npt: typeof (n.npt ?? n.provaTrimestral) === 'number' ? Number(n.npt ?? n.provaTrimestral) : undefined,
          mediaTrimestral: typeof (n.notaFinal ?? n.mediaTrimestral) === 'number' ? Number(n.notaFinal ?? n.mediaTrimestral) : undefined
        }))
      });
      setPdfSuccessToast('Boletim em Excel (.xlsx) com fórmulas de média e aprovação gerado com sucesso!');
      setTimeout(() => setPdfSuccessToast(null), 5000);
    } else if (docType === 'pautas') {
      if (!turmaSelecionada) return;
      const anoDoc = turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo || '';
      if (pautaSubTipo === 'disciplina') {
        const discAtual = disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0];
        exportarPautaDisciplinaAnualExcel({
          escola,
          turma: turmaSelecionada,
          disciplina: discAtual,
          alunos: alunosDaTurma,
          notasConsolidadas,
          anoLectivo: anoDoc,
          provaProfessorAtiva
        });
      } else {
        exportarPautaGeralExcel({
          escola,
          turma: turmaSelecionada,
          alunos: alunosDaTurma,
          disciplinas: disciplinasDaClasseDocumento,
          notasConsolidadas,
          pautaSubTipo: pautaSubTipo === 'trimestral' ? 'trimestral' : 'geral_final',
          pautaTrimestre,
          anoLectivo: anoDoc
        });
      }
      setPdfSuccessToast('Pauta Oficial em Excel (.xlsx) com fórmulas de médias, percentagens e observações gerada com sucesso!');
      setTimeout(() => setPdfSuccessToast(null), 5000);
    } else if (docType === 'ficha_individual_funcionario') {
      const func = funcionarioSelecionado;
      if (!func) return;
      const linhas = [{
        'Nome Completo': func.nomeCompleto,
        'Número BI': func.numeroBI,
        'Cargo': func.cargo,
        'Perfil Role': func.role,
        'Grau Académico': func.grauAcademico || func.habilitacoes,
        'Categoria Profissional': func.categoriaProfissional || 'Professor do IIº Ciclo',
        'Telefone': func.telefone,
        'Email': func.email,
        'IBAN': func.iban || '—',
        'Banco': func.banco || '—',
        'INSS': func.numeroSegurancaSocial || '—'
      }];
      downloadExcelFile('Ficha_Funcionario', linhas, `Ficha_${func.nomeCompleto.replace(/\s+/g, '_')}.xlsx`);
    } else {
      const linhas = alunosDaTurma.map((al, idx) => ({
        'Nº': idx + 1,
        'Matrícula': al.codigoMatricula,
        'Nome Completo': al.nomeCompleto,
        'Classe': turmaSelecionada?.classe || '',
        'Turma': turmaSelecionada?.nome || ''
      }));
      downloadExcelFile('Documento_Dados', linhas, `Dados_${docType}_${turmaSelecionada?.nome || 'Turma'}.xlsx`);
    }
  };

  // Cálculo da média geral real baseada nas disciplinas da classe real do aluno
  const mediaGeralCalculada = useMemo(() => {
    if (!alunoSelecionado) return '—';
    const valores = disciplinasDaClasseAluno
      .map(d => resolverNotaRealAluno(d).valorFinal)
      .filter((v): v is number => v !== null && !isNaN(v));
    if (valores.length > 0) {
      return (valores.reduce((acc, v) => acc + v, 0) / valores.length).toFixed(1);
    }
    if (notasOficiaisAluno.length > 0) {
      return (notasOficiaisAluno.reduce((acc: number, curr: any) => acc + (curr.notaFinal || curr.mediaTrimestral || 0), 0) / notasOficiaisAluno.length).toFixed(1);
    }
    if (notasDoAluno.length > 0) {
      return (notasDoAluno.reduce((acc: number, curr: any) => acc + (curr.mediaTrimestral || 0), 0) / notasDoAluno.length).toFixed(1);
    }
    return '—';
  }, [alunoSelecionado, disciplinasDaClasseAluno, notasOficiaisAluno, notasDoAluno, historicoCompletoAluno]);

  return (
    <div className="space-y-6">
      {/* Selector & Print Header (Hidden during actual print) */}
      <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                Modelos Oficiais MED Angola
              </span>
              <span className="text-xs text-gray-500">• Zaire, Luanda e Território Nacional</span>
            </div>
            <h2 className="text-xl font-black text-gray-900 mt-1">Emissão de Documentos & Impressão Formatada</h2>
            <p className="text-xs text-gray-600">
              Boletins Trimestrais, Declarações com Notas, Certificados, Fichas de Aluno e Funcionário, Presenças e Passes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Formato de Página (A4 / Carta) */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Página:</span>
              <select
                value={formatoPaginaPdf}
                onChange={(e) => setFormatoPaginaPdf(e.target.value as 'a4' | 'letter')}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                title="Formato de página para geração e impressão PDF"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Carta / Letter (215,9 × 279,4 mm)</option>
              </select>
            </div>

            {/* Seletor de Margens PDF */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Margens:</span>
              <select
                value={margemPdfPreset}
                onChange={(e) => handleAlterarPresetMargem(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                title="Margens da folha PDF em milímetros"
              >
                <option value="estreita">Estreita (5 mm)</option>
                <option value="padrao">Padrão MED (8 mm)</option>
                <option value="larga">Larga (15 mm)</option>
                <option value="personalizada">Personalizada ({margensPdfMm.top}/{margensPdfMm.right}/{margensPdfMm.bottom}/{margensPdfMm.left} mm)</option>
              </select>
            </div>

            {/* Seletor de Orientação da Folha */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Orientação:</span>
              <select
                value={orientacaoPdfOverride}
                onChange={(e) => setOrientacaoPdfOverride(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                title="Orientação da folha para PDF"
              >
                <option value="auto">Auto ({orientacaoRecomendada === 'landscape' ? 'Paisagem' : 'Retrato'})</option>
                <option value="portrait">Retrato ({formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'} Vertical)</option>
                <option value="landscape">Paisagem ({formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'} Horizontal)</option>
              </select>
            </div>

            {/* Seletor de Qualidade */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Qualidade:</span>
              <select
                value={qualidadePdf}
                onChange={(e) => setQualidadePdf(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                title="Resolução de Renderização"
              >
                <option value="ultra">Ultra HD (300 DPI)</option>
                <option value="alta">Padrão Alta Definição</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleBaixarPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 transition-all rounded-xl inline-flex items-center space-x-2 shadow-md cursor-pointer border border-emerald-500/40"
              title="Gerar e descarregar ficheiro .PDF oficial de alta definição formatado nas normas oficiais do MED Angola"
            >
              <FileDown className="h-4 w-4" />
              <span>{isGeneratingPdf ? 'A processar PDF...' : 'Baixar PDF Oficial'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Imprimir documento diretamente"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarExcel}
              className="px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar dados do documento em formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarHTML}
              className="px-3 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar arquivo HTML formatado para abrir e imprimir off-line"
            >
              <Download className="h-4 w-4 text-blue-700" />
              <span>HTML</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAssinaturaPreview(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl || '');
                setShowAssinaturaModal(true);
              }}
              className="px-3 py-2 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Carregar ou atualizar a assinatura digitalizada do Diretor Geral para boletins e passes"
            >
              <PenTool className="h-4 w-4 text-indigo-700" />
              <span>Assinatura Director</span>
            </button>

            <button
              type="button"
              onClick={() => setModalConfigDocOpen(true)}
              className="px-3 py-2 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Configurar dizeres oficiais, cabeçalhos e disposição visual dos documentos com pré-visualização ao vivo"
            >
              <Settings className="h-4 w-4 text-amber-700" />
              <span>Dizeres & Disposição {formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Ajuste Fino de Margens (mm) & Área Útil com Cabeçalho Fixo */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">Margens da Folha (mm):</span>
            <label className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-300">
              <span className="text-slate-500 font-semibold">Sup:</span>
              <input
                type="number"
                min={2}
                max={35}
                step={1}
                value={margensPdfMm.top}
                onChange={(e) => handleAtualizarMargemLado('top', e.target.value)}
                className="w-11 text-center font-mono font-bold text-slate-900 focus:outline-none"
              />
            </label>
            <label className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-300">
              <span className="text-slate-500 font-semibold">Dir:</span>
              <input
                type="number"
                min={2}
                max={35}
                step={1}
                value={margensPdfMm.right}
                onChange={(e) => handleAtualizarMargemLado('right', e.target.value)}
                className="w-11 text-center font-mono font-bold text-slate-900 focus:outline-none"
              />
            </label>
            <label className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-300">
              <span className="text-slate-500 font-semibold">Inf:</span>
              <input
                type="number"
                min={2}
                max={35}
                step={1}
                value={margensPdfMm.bottom}
                onChange={(e) => handleAtualizarMargemLado('bottom', e.target.value)}
                className="w-11 text-center font-mono font-bold text-slate-900 focus:outline-none"
              />
            </label>
            <label className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-300">
              <span className="text-slate-500 font-semibold">Esq:</span>
              <input
                type="number"
                min={2}
                max={35}
                step={1}
                value={margensPdfMm.left}
                onChange={(e) => handleAtualizarMargemLado('left', e.target.value)}
                className="w-11 text-center font-mono font-bold text-slate-900 focus:outline-none"
              />
            </label>
            {margemPdfPreset !== 'padrao' && (
              <button
                type="button"
                onClick={() => handleAlterarPresetMargem('padrao')}
                className="text-[10px] font-bold text-blue-700 hover:underline px-1.5 cursor-pointer"
              >
                Repor Padrão (8mm)
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-600">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold">
              Área Útil: {geometriaPdfAtual.printableWidthMm.toFixed(0)} × {geometriaPdfAtual.printableHeightMm.toFixed(0)} mm
            </span>
            <span className="hidden md:inline text-emerald-700 font-bold">
              ✓ Insígnia e Dados do Aluno Fixos
            </span>
          </div>
        </div>

        {pdfSuccessToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pdfSuccessToast}</span>
            </div>
            <button onClick={() => setPdfSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
          </div>
        )}

        {/* Navigation Tabs - Document Types Filtrados Rigorosamente por Perfil */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
          {tiposDocsPermitidos.includes('boletim_oficial') && (
            <button
              onClick={() => setDocType('boletim_oficial')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'boletim_oficial' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">Boletim Trimestral</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('pautas') && (
            <button
              onClick={() => setDocType('pautas')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'pautas' 
                  ? 'bg-purple-50 text-purple-700 border-purple-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Table className="h-4 w-4 shrink-0 text-purple-600" />
              <span className="truncate">Pauta Geral / Final</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('lista_nominal') && (
            <button
              onClick={() => setDocType('lista_nominal')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'lista_nominal' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">Lista Nominal (PDF)</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('ficha_presencas') && (
            <button
              onClick={() => setDocType('ficha_presencas')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'ficha_presencas' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate">Ficha de Presenças</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('declaracao_notas') && (
            <button
              onClick={() => setDocType('declaracao_notas')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'declaracao_notas' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate">Declaração com Notas</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('certificado_ciclo') && (
            <button
              onClick={() => setDocType('certificado_ciclo')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'certificado_ciclo' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Award className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="truncate">Certificados (Classes Finais)</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('termos_exame') && (
            <button
              onClick={() => setDocType('termos_exame')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'termos_exame' 
                  ? 'bg-amber-50 text-amber-800 border-amber-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="truncate">Termos de Exame</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('passes') && (
            <button
              onClick={() => setDocType('passes')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'passes' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0 text-indigo-600" />
              <span className="truncate">Passes (8 por A4)</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('ficha_individual_aluno') && (
            <button
              onClick={() => setDocType('ficha_individual_aluno')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'ficha_individual_aluno' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">Ficha do Aluno</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('ficha_individual_funcionario') && (
            <button
              onClick={() => setDocType('ficha_individual_funcionario')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'ficha_individual_funcionario' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
              <span className="truncate">Ficha de Funcionário</span>
            </button>
          )}

          {tiposDocsPermitidos.includes('recibos') && (
            <button
              onClick={() => setDocType('recibos')}
              className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
                docType === 'recibos' 
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Receipt className="h-4 w-4 shrink-0 text-teal-600" />
              <span className="truncate">Recibo POS 58/80</span>
            </button>
          )}
        </div>

        {/* Controlo de Modo de Emissão: Individual vs Em Lote (Classe / Turma) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Modo de Emissão:</span>
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setModoEmissao('individual')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  modoEmissao === 'individual' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setModoEmissao('turma')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  modoEmissao === 'turma' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Em Lote (Turma Completa)
              </button>
              <button
                type="button"
                onClick={() => setModoEmissao('classe')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  modoEmissao === 'classe' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Em Lote (Classe Inteira)
              </button>
            </div>
          </div>

          {/* Opção de Disposição de Boletins (4 por folha A4 conforme pedido) */}
          {docType === 'boletim_oficial' && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Disposição do Boletim:</span>
              <select
                value={layoutBoletim}
                onChange={(e) => setLayoutBoletim(e.target.value as any)}
                className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs"
              >
                <option value="4_por_folha">4 Boletins por Folha A4 (Grade 2x2 c/ corte)</option>
                <option value="2_por_folha">2 Boletins por Folha A4 (Meia página)</option>
                <option value="1_por_folha">1 Boletim Grande (Página inteira A4)</option>
              </select>
            </div>
          )}
          {/* Opção de Nível / Classe Final para Certificados */}
          {docType === 'certificado_ciclo' && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Nível do Certificado:</span>
              <select
                value={tipoCertificadoSelecionado}
                onChange={(e) => setTipoCertificadoSelecionado(e.target.value as any)}
                className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs text-blue-900"
              >
                <option value="auto">Automático (Detectar pela Classe do Aluno)</option>
                <option value="primario_6">Ensino Primário (6.ª Classe)</option>
                <option value="iciclo_9">Iº Ciclo do Ensino Secundário (9.ª Classe)</option>
                <option value="iiciclo_12">IIº Ciclo do Ensino Secundário Geral (12.ª Classe)</option>
                <option value="tecnico_12_13">Ensino Técnico-Profissional / Magistério (12.ª / 13.ª)</option>
              </select>
            </div>
          )}

          {/* Opção de Cores nos Passes Escolares (conforme pedido) */}
          {docType === 'passes' && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Cor do Cartão de Estudante:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'azul', label: 'Azul', bg: 'bg-blue-600' },
                  { id: 'verde', label: 'Verde', bg: 'bg-emerald-600' },
                  { id: 'bordo', label: 'Bordô', bg: 'bg-rose-900' },
                  { id: 'ouro', label: 'Ouro', bg: 'bg-amber-600' },
                  { id: 'cinza_escuro', label: 'Chumbo', bg: 'bg-slate-800' }
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCorTemaPasses(c.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold text-white transition-transform ${c.bg} ${
                      corTemaPasses === c.id ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter Selection Controls com Hierarquia Ano Lectivo -> Classe -> Turma -> Sala -> Curso */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
          {/* Informação contextual de associação */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800">
              Coerência Académica de Emissão:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                Ano Lectivo: {selectedAnoLectivo}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                Classe: {alunoSelecionado?.classeId || turmaSelecionada?.classe || selectedClasse}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Sala: {getSalaDaTurma(turmaSelecionada || turmaDoAluno)}
              </span>
              {isSegundoCiclo(alunoSelecionado?.classeId || turmaSelecionada?.classe || selectedClasse) && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Curso: {getCursoDaTurma(turmaSelecionada || turmaDoAluno)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Seleção de Ano Lectivo */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">1. Ano Lectivo *</label>
              <select
                value={selectedAnoLectivo}
                onChange={(e) => {
                  const novoAno = e.target.value;
                  setSelectedAnoLectivo(novoAno);
                  const turmasDoNovoAno = turmas.filter(t => !t.anoLectivo || t.anoLectivo === novoAno);
                  const validas = getTurmasPorClasse(turmasDoNovoAno, selectedClasse);
                  if (validas.length > 0) {
                    setSelectedTurmaId(validas[0].id);
                  } else if (turmasDoNovoAno.length > 0) {
                    setSelectedTurmaId(turmasDoNovoAno[0].id);
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {anosLectivosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>
                    {ano} {ano === escola.anoLectivoActivo ? '(Activo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Seleção de Classe */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">2. Classe Curricular</label>
              <select
                value={selectedClasse}
                onChange={(e) => {
                  const novaCl = e.target.value;
                  setSelectedClasse(novaCl);
                  if (novaCl !== 'TODAS' && !isSegundoCiclo(novaCl)) {
                    setSelectedCurso('TODOS');
                  }
                  const validas = novaCl === 'TODAS'
                    ? turmasDoAnoDocumento
                    : getTurmasPorClasse(turmasDoAnoDocumento, novaCl);
                  if (validas.length > 0) {
                    setSelectedTurmaId(docType === 'lista_nominal' ? 'TODAS' : validas[0].id);
                  } else if (docType === 'lista_nominal') {
                    setSelectedTurmaId('TODAS');
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {docType === 'lista_nominal' && (
                  <option value="TODAS">Todas as Classes</option>
                )}
                {todasClasses.map(cls => (
                  <option key={`doc-cl-${cls}`} value={cls}>{cls} {cls !== 'Iniciação' ? 'Classe' : ''}</option>
                ))}
              </select>
            </div>

            {/* 3. Seleção de Turma */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                3. Turma ({turmasDaClasseSelecionada.length})
              </label>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {docType === 'lista_nominal' && (
                  <option value="TODAS">Todas as Turmas ({turmasDaClasseSelecionada.length})</option>
                )}
                {turmasDaClasseSelecionada.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Seletor específico por tipo de documento: Pautas / Lista Nominal (Curso) / Aluno */}
            {docType === 'lista_nominal' ? (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    4. Curso / Especialidade {selectedClasse !== 'TODAS' && !isSegundoCiclo(selectedClasse) ? '(2º Ciclo)' : ''}
                  </label>
                  <select
                    value={selectedCurso}
                    onChange={(e) => setSelectedCurso(e.target.value)}
                    disabled={selectedClasse !== 'TODAS' && !isSegundoCiclo(selectedClasse) && cursosDisponiveisDocumento.length === 0}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold text-purple-900 bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none disabled:opacity-50"
                  >
                    <option value="TODOS">
                      {selectedClasse !== 'TODAS' && !isSegundoCiclo(selectedClasse)
                        ? 'Ensino Geral (Sem Curso)'
                        : 'Todos os Cursos'}
                    </option>
                    {cursosDisponiveisDocumento.map(cur => (
                      <option key={`doc-cur-${cur}`} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="p-2 bg-blue-100/70 border border-blue-200 rounded-lg text-blue-900 w-full font-bold text-[11px]">
                    Lista Nominal: <strong>{alunosListaNominal.length} estudantes</strong> selecionados
                  </div>
                </div>
              </div>
            ) : docType === 'pautas' ? (
              <div className="sm:col-span-2 space-y-2 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-800 block mb-1 text-[11px]">Tipo de Pauta Oficial</label>
                    <select
                      value={pautaSubTipo}
                      onChange={(e) => setPautaSubTipo(e.target.value as any)}
                      className="w-full p-1.5 border border-blue-400 bg-white font-bold rounded-lg text-xs text-blue-900 focus:outline-none"
                    >
                      <option value="geral_final">Pauta Geral / Final Homologada</option>
                      <option value="trimestral">Pauta Trimestral Oficial</option>
                      <option value="disciplina">Pauta por Disciplina Curricular</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-800 block mb-1 text-[11px]">Modo de Exibição das Notas</label>
                    <select
                      value={pautaModoExibicao}
                      onChange={(e) => setPautaModoExibicao(e.target.value as any)}
                      className="w-full p-1.5 border border-slate-300 bg-white font-bold rounded-lg text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="sintetica">Modo Sintético (Apenas Médias)</option>
                      <option value="analitica">Modo Analítico (MAC, PPT, MT, MFD, % & Obs)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-200/60">
                  {pautaSubTipo === 'trimestral' && (
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-bold text-blue-900">Trimestre:</span>
                      <div className="flex gap-1">
                        {(['1', '2', '3'] as const).map(tri => (
                          <button
                            key={`pauta-tri-${tri}`}
                            type="button"
                            onClick={() => setPautaTrimestre(tri)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                              pautaTrimestre === tri 
                                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {tri}º Tri
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {pautaSubTipo === 'disciplina' && (
                    <div className="flex-1 flex items-center space-x-1.5">
                      <span className="text-[11px] font-bold text-blue-900 shrink-0">Disciplina:</span>
                      <select
                        value={pautaDisciplinaId || disciplinasDaClasseDocumento[0]?.id || ''}
                        onChange={(e) => setPautaDisciplinaId(e.target.value)}
                        className="w-full p-1 border border-emerald-400 bg-white font-bold rounded text-xs text-emerald-950 focus:outline-none"
                      >
                        {disciplinasDaClasseDocumento.map(d => (
                          <option key={d.id} value={d.id}>{d.nome} {d.sigla ? `(${d.sigla})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ) : modoEmissao === 'individual' ? (
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">4. Selecionar Aluno</label>
                  <span className="text-[10px] text-gray-500 font-semibold">
                    {alunosFiltradosIndividual.length} estudantes correspondentes
                  </span>
                </div>
                <select
                  value={selectedAlunoId}
                  onChange={(e) => {
                    setSelectedAlunoId(e.target.value);
                    const al = alunos.find(a => a.id === e.target.value);
                    if (al?.turmaId) setSelectedTurmaId(al.turmaId);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {alunosFiltradosIndividual.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nomeCompleto} — Proc. {a.numeroProcesso || a.codigoMatricula} ({a.classeId})
                    </option>
                  ))}
                </select>
              </div>
            ) : modoEmissao === 'turma' ? (
              <div className="sm:col-span-2 flex items-center">
                <div className="p-2.5 bg-blue-100/70 border border-blue-200 rounded-lg text-blue-900 w-full font-bold">
                  Emissão em Lote para toda a turma selecionada: <strong>{alunosDaTurma.length} estudantes</strong>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2 flex items-center">
                <div className="p-2.5 bg-purple-100/70 border border-purple-200 rounded-lg text-purple-900 w-full font-bold">
                  Emissão em Lote para toda a {selectedClasse} Classe: <strong>{alunosDaClasse.length} estudantes</strong>
                </div>
              </div>
            )}
          </div>

          {/* Pesquisa rápida de aluno sanitizada no modo individual (exceto em pautas e lista nominal) */}
          {docType !== 'pautas' && docType !== 'lista_nominal' && modoEmissao === 'individual' && (
            <div className="relative pt-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={buscaAlunoDocumento}
                onChange={(e) => setBuscaAlunoDocumento(sanitizeSearchInput(e.target.value, 80))}
                maxLength={80}
                placeholder="Pesquisar por nome do aluno, nº de processo, BI, matrícula..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}
        </div>

          {/* Seletor de Largura Térmica para Recibos POS */}
          {docType === 'recibos' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <label className="font-bold text-gray-700 block mb-1">Largura da Bobina POS</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLarguraTermica('58mm')}
                  className={`flex-1 py-1.5 font-bold rounded-lg border ${larguraTermica === '58mm' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  POS 58mm
                </button>
                <button
                  type="button"
                  onClick={() => setLarguraTermica('80mm')}
                  className={`flex-1 py-1.5 font-bold rounded-lg border ${larguraTermica === '80mm' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  POS 80mm
                </button>
              </div>
            </div>
          )}
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE PRÉ-VISUALIZAÇÃO RESPONSIVA & CONTROLOS DE ZOOM / AJUSTE MÓVEL   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-md border border-slate-800 space-y-2 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold flex items-center space-x-1.5 text-blue-400">
              <Eye className="w-4 h-4" />
              <span>Modo de Exibição no Ecrã:</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setModoVisualizacao('ajustar');
                  setZoomNivel(100);
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  modoVisualizacao === 'ajustar' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Ajusta o documento à largura total do ecrã para evitar cortes"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Ajustar ao Ecrã (Sem Cortes)</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('real')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  modoVisualizacao === 'real' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em tamanho real de impressão com rolagem horizontal livre"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>100% Tamanho Real ({formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'})</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Controles de Zoom */}
            <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setZoomNivel(prev => Math.max(50, prev - 10))}
                className="w-5 h-5 flex items-center justify-center font-bold text-slate-300 hover:text-white rounded hover:bg-slate-700 cursor-pointer"
                title="Diminuir Zoom"
              >
                -
              </button>
              <span className="font-mono text-[11px] font-bold px-1.5 text-blue-300 min-w-[42px] text-center">
                {zoomNivel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomNivel(prev => Math.min(160, prev + 10))}
                className="w-5 h-5 flex items-center justify-center font-bold text-slate-300 hover:text-white rounded hover:bg-slate-700 cursor-pointer"
                title="Aumentar Zoom"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomNivel(100)}
                className="text-[10px] text-slate-400 hover:text-white ml-1 border-l border-slate-700 pl-1.5 cursor-pointer"
                title="Repor 100%"
              >
                100%
              </button>
            </div>

            {/* Badge de Página & Margem Selecionada */}
            <span className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 border border-slate-700">
              <span>Folha:</span>
              <strong className="text-amber-400">
                {formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'} {orientacaoRecomendada === 'landscape' ? 'Paisagem' : 'Retrato'} · {margensPdfMm.top}/{margensPdfMm.right}/{margensPdfMm.bottom}/{margensPdfMm.left}mm
              </strong>
            </span>

            {/* Botão de Download Rápido Direto no Documento */}
            <button
              type="button"
              onClick={handleBaixarPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-lg text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'A Gerar...' : 'Baixar PDF'}</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
          <span>
            📋 <strong>{nomeDocumentoCurto}</strong> · Formatado conforme o Decreto Executivo n.º 250/18 ({geometriaPdfAtual.pageWidthMm}×{geometriaPdfAtual.pageHeightMm} mm).
          </span>
          <span className="hidden sm:inline text-emerald-400 font-semibold">
            ✓ Insígnia, carimbos e dados do aluno com posicionamento fixo
          </span>
        </div>
      </div>

      {/* Container Responsivo de Pré-visualização com simulação real de folha (A4/Carta) e margens externas */}
      <div className="w-full overflow-x-auto pb-6 transition-all duration-300">
        <div
          data-pdf-paper-preview="true"
          style={{
            zoom: modoVisualizacao === 'real' ? `${zoomNivel}%` : undefined,
            width: modoVisualizacao === 'real' && docType !== 'recibos' ? `${geometriaPdfAtual.pageWidthMm}mm` : undefined,
            padding: docType !== 'recibos'
              ? `${margensPdfMm.top}mm ${margensPdfMm.right}mm ${margensPdfMm.bottom}mm ${margensPdfMm.left}mm`
              : undefined,
          }}
          className={`transition-all duration-200 ${
            docType !== 'recibos' ? 'bg-slate-100/90 border border-dashed border-slate-300 rounded-2xl mx-auto shadow-inner ' : ''
          }${
            modoVisualizacao === 'ajustar'
              ? 'w-full max-w-full overflow-x-auto'
              : 'inline-block min-w-full'
          }`}
        >
      {/* ========================================================================= */}
      {/* 1. BOLETIM DE NOTAS TRIMESTRAL (MODELO OFICIAL MED - SCREENSHOT 1) */}
      {/* ========================================================================= */}
      {docType === 'boletim_oficial' && (
        !alunoSelecionado ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhum Estudante Registado ou Selecionado</h3>
            <p className="text-sm text-gray-500 mt-1">
              Para visualizar e imprimir o Boletim Oficial, selecione ou registe um estudante na turma.
            </p>
          </div>
        ) : (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-6 sm:p-8 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-4 print:border-2 print:border-gray-900 ${fontScaleClassDoc}`}>
          {/* Cabeçalho Oficial MED Angola com Posicionamento Fixo da Insígnia */}
          <div data-pdf-fixed-header="true" className="relative border-b-2 border-black pb-3 min-h-[128px]">
            {/* VISTO DO DIRECTOR GERAL na parte superior esquerda */}
            {exibirAssinDiretorDoc && (
              <div data-pdf-corner-left="true" className="absolute left-0 top-0 text-left border border-black p-1.5 rounded bg-white w-36 print:w-32 z-10 block print:block shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="font-black uppercase tracking-wider text-[8px] text-gray-900">VISTO</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssinaturaPreview(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl || '');
                      setShowAssinaturaModal(true);
                    }}
                    className="no-print text-[7.5px] text-blue-700 font-bold hover:underline cursor-pointer"
                    title="Alterar chancela/assinatura digital do Director"
                  >
                    Alterar
                  </button>
                </div>
                <p className="text-[7.5px] font-bold text-gray-700 leading-tight">{tituloDiretorGeral}</p>
                <div className="h-8 my-0.5 flex items-center justify-center border-b border-gray-400">
                  {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                    <img 
                      src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                      alt="Assinatura Diretor" 
                      className="max-h-7 object-contain" 
                    />
                  ) : (
                    <span className="text-[7px] text-gray-400 italic font-mono">[Assinatura]</span>
                  )}
                </div>
                <p className="text-[7px] text-gray-800 truncate font-bold">{nomeDiretorGeral}</p>
                <p className="text-[6.5px] text-gray-500 font-mono">Data: ___/___/_____</p>
              </div>
            )}

            {/* Logotipo da Escola na parte superior direita */}
            {exibirLogoEscolaDoc && (
              <div data-pdf-corner-right="true" className="absolute right-0 top-0 block print:block z-10">
                <img 
                  src={escola.logotipoUrl || escola.logotipo} 
                  alt={`Logotipo ${escola.nomeOficial}`} 
                  className="h-14 w-14 object-contain rounded-md border border-gray-200 print:border-none" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Insígnia Nacional da República de Angola Centralizada */}
            <div data-pdf-center-insignia="true" className="text-center space-y-0.5 px-36 sm:px-40">
              {exibirInsigniaDoc && (
                <div className="flex justify-center mb-1">
                  {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                    <img 
                      src={configSistema.insigniaNacionalUrl} 
                      alt="Insígnia da República de Angola" 
                      className="h-14 w-14 object-contain mx-auto" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <InsigniaAngola size={52} />
                  )}
                </div>
              )}
              {cabecalhoLinhasDoc ? (
                cabecalhoLinhasDoc.map((linha, idx) => (
                  <p key={idx} className={idx === 0 ? 'text-[11px] font-black uppercase tracking-wider' : 'text-[10px] font-bold uppercase tracking-wide'}>
                    {linha}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-[11px] font-black uppercase tracking-wider">REPÚBLICA DE ANGOLA</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide">
                    {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wide">
                    {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                  </p>
                </>
              )}
              <h1 className="text-sm sm:text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
                {escola.nomeOficial}
              </h1>
              <div className="pt-2">
                <span className="text-xs sm:text-sm font-black uppercase border border-black px-4 py-1 inline-block bg-gray-50">
                  {(limparTextoSistema(configAtual?.tituloOficial) && configAtual?.tituloOficial !== 'BOLETIM OFICIAL')
                    ? limparTextoSistema(configAtual?.tituloOficial)
                    : 'BOLETIM DE NOTAS'} — {escola.trimestreActivo || 'II'}º TRIMESTRE • ANO LECTIVO {alunoSelecionado.anoLectivo || alunoSelecionado.anoMatricula || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}
                </span>
              </div>
            </div>
          </div>

          {/* Dados Pessoais e Académicos do Aluno (Posicionamento Fixo 4 Colunas) */}
          <div data-pdf-fixed-student="true" data-pdf-student-grid="4" className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-[11px] py-3 border-b border-black">
            <div>
              <span className="text-gray-600 block">Ano Lectivo:</span>
              <strong className="font-bold" style={{ color: corDestaqueDoc }}>{alunoSelecionado.anoLectivo || alunoSelecionado.anoMatricula || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">N.º de Ordem:</span>
              <strong className="font-mono text-sm">{alunoSelecionado.numeroOrdem || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">N.º de Matrícula:</span>
              <strong className="font-mono">{alunoSelecionado.codigoMatricula || alunoSelecionado.numeroInterno || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Nome do(a) Aluno(a):</span>
              <strong className="text-xs uppercase truncate block">{alunoSelecionado.nomeCompleto}</strong>
            </div>

            <div>
              <span className="text-gray-600 block">Classe:</span>
              <strong>{classeAlunoDoc || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Turma:</span>
              <strong>{turmaDoAluno?.nome || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Turno:</span>
              <strong>{turmaDoAluno?.turno || alunoSelecionado.periodo || '—'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Sala:</span>
              <strong>{turmaDoAluno?.sala || '—'}</strong>
            </div>

            {ehSegundoCicloAlunoDoc && cursoAlunoDoc && (
              <>
                <div className="sm:col-span-2">
                  <span className="text-gray-600 block">Curso:</span>
                  <strong>{cursoAlunoDoc}</strong>
                </div>
                {alunoSelecionado.opcaoCurso && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-600 block">Opção:</span>
                    <strong>{alunoSelecionado.opcaoCurso}</strong>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tabela de Notas Trimestrais */}
          <div className="pt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[10px] sm:text-[11px] border border-black text-left">
              <thead className="bg-gray-100 font-bold border-b border-black text-center text-[9px] sm:text-[10px]">
                <tr>
                  <th className="p-1.5 border-r border-black text-left">DISCIPLINA</th>
                  <th className="p-1 border-r border-black w-12" title="Média de Avaliação Contínua">MAC{escola.trimestreActivo}</th>
                  {provaProfessorAtiva && (
                    <th className="p-1 border-r border-black w-12" title="Nota da Prova do Professor">NPP{escola.trimestreActivo}</th>
                  )}
                  <th className="p-1 border-r border-black w-12" title="Nota da Prova Trimestral">NPT{escola.trimestreActivo}</th>
                  <th className="p-1 border-r border-black w-14 bg-gray-200" title="Média Trimestral">MT{escola.trimestreActivo}</th>
                  <th className="p-1 border-r border-black w-12">N.º F</th>
                  <th className="p-1 border-r border-black w-24">Comport.</th>
                  <th className="p-1 w-24">Assiduidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {disciplinasDaClasseAluno.length > 0 ? (
                  disciplinasDaClasseAluno.map((disc) => {
                    const real = resolverNotaRealAluno(disc, classeAlunoDoc);
                    const nomeNorm = disc.nome.trim().toLowerCase();
                    const nota = notasDoAluno.find(
                      n => n.disciplinaId === disc.id || (n as any).disciplinaNome?.trim().toLowerCase() === nomeNorm
                    );
                    const macNum = typeof nota?.mac === 'number' ? nota.mac : real.mac;
                    const nppNum = typeof nota?.npp === 'number' ? nota.npp : real.npp;
                    const nptNum =
                      typeof (nota as any)?.npt === 'number'
                        ? (nota as any).npt
                        : typeof nota?.provaTrimestral === 'number'
                        ? nota.provaTrimestral
                        : real.npt;
                    const mtNum = typeof nota?.mediaTrimestral === 'number' ? nota.mediaTrimestral : real.valorFinal;
                    return (
                      <tr key={disc.id} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-semibold uppercase">{disc.nome}</td>
                        <td className="p-1 border-r border-black text-center font-mono">
                          {macNum !== null && typeof macNum === 'number' ? macNum.toFixed(1) : '—'}
                        </td>
                        {provaProfessorAtiva && (
                          <td className="p-1 border-r border-black text-center font-mono">
                            {nppNum !== null && typeof nppNum === 'number' ? nppNum.toFixed(1) : '—'}
                          </td>
                        )}
                        <td className="p-1 border-r border-black text-center font-mono">
                          {nptNum !== null && typeof nptNum === 'number' ? nptNum.toFixed(1) : '—'}
                        </td>
                        <td className="p-1 border-r border-black text-center font-mono font-black bg-gray-50">
                          {mtNum !== null && typeof mtNum === 'number' ? mtNum.toFixed(1) : '—'}
                        </td>
                        <td className="p-1 border-r border-black text-center font-mono">{nota?.faltas || 0}</td>
                        <td className="p-1 border-r border-black text-center text-[9px] font-semibold">{nota?.comportamentoConceito || '—'}</td>
                        <td className="p-1 text-center text-[9px] font-semibold">{nota?.assiduidadeConceito || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={provaProfessorAtiva ? 8 : 7} className="p-4 text-center text-gray-500">
                      Nenhuma disciplina configurada para esta classe no plano curricular.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sumário de Resultados, Média Geral & Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black mt-4 text-[10px] sm:text-[11px]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold">Média Geral do {escola.trimestreActivo}º Trimestre:</span>
                <span className="text-base font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 border border-blue-400 rounded">
                  {mediaGeralCalculada !== '—' ? `${mediaGeralCalculada} / ${escalaAlunoDoc.escalaMaxima} Valores` : '—'}
                </span>
              </div>
              <p className="text-gray-700">
                <strong>Observação Pedagógica:</strong>{' '}
                {mediaGeralCalculada === '—'
                  ? 'Sem notas lançadas'
                  : Number(mediaGeralCalculada) >= escalaAlunoDoc.notaAprovacao
                  ? 'Aproveitamento Positivo (Apto)'
                  : 'Necessita de Apoio Pedagógico'}
              </p>
              <p className="text-gray-500 text-[9px] pt-1">
                Data de emissão: {hojeAngolano('extenso')}.
              </p>
              {limparTextoSistema(configAtual?.textoRodape) && (
                <p className="text-gray-600 text-[9px] italic">{limparTextoSistema(configAtual?.textoRodape)}</p>
              )}
            </div>

            {exibirCodigoQrDoc && (
              <div className="flex items-center justify-end space-x-4">
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'BOLETIM_OFICIAL',
                    escolaId: escola.id,
                    docRef: `${alunoSelecionado.codigoMatricula}-${escola.trimestreActivo || 'II'}T`,
                    alunoId: alunoSelecionado.id,
                    alunoNome: alunoSelecionado.nomeCompleto,
                    turmaId: turmaDoAluno?.id,
                    anoLectivo: alunoSelecionado.anoLectivo || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                  })}
                  size={60}
                  label="Autenticação"
                />
              </div>
            )}
          </div>

          {/* Assinaturas Oficiais: Título -> Traço -> Nome */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-[10px] sm:text-[11px] text-center mt-6">
            <div className="space-y-1">
              <p className="font-bold text-gray-950 uppercase text-xs">{obterTituloCoordenadorTurma(turmaDoAluno, funcionariosEscola)}</p>
              <div className="h-6" />
              <div className="w-56 border-b border-black mx-auto my-1.5" />
              <p className="font-bold text-gray-900 text-xs uppercase">
                {obterNomeCoordenadorTurma(turmaDoAluno, funcionariosEscola)}
              </p>
            </div>
            {exibirAssinSubdiretorDoc && (
              <div className="space-y-1">
                <p className="font-bold text-gray-950 uppercase text-xs">{getTituloSubPedagogico(escola)}</p>
                <div className="h-6" />
                <div className="w-56 border-b border-black mx-auto my-1.5" />
                <p className="font-bold text-gray-900 text-xs uppercase">
                  {subdirectorPedagogicoNome}
                </p>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 2. PAUTA GERAL / FINAL HOMOLOGADA (MODELO OFICIAL MED ANGOLA)             */}
      {/* ========================================================================= */}
      {docType === 'pautas' && (
        !turmaSelecionada ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhuma Turma Registada ou Selecionada</h3>
            <p className="text-sm text-gray-500 mt-1">
              Para visualizar a Pauta Oficial, crie pelo menos uma turma na Gestão Académica.
            </p>
          </div>
        ) : (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-5 sm:p-8 rounded-xl shadow-md max-w-6xl mx-auto text-black print:shadow-none print:p-4 print:border-2 print:border-gray-900 space-y-6 ${fontScaleClassDoc}`}>
          {/* Cabeçalho Oficial com Insígnia Centralizada Fixa */}
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="relative text-center space-y-1 border-b-2 border-black pb-3">
            {exibirLogoEscolaDoc && (
              <div data-pdf-corner-right="true" className="absolute right-0 top-0 z-10">
                <img
                  src={escola.logotipoUrl || escola.logotipo}
                  alt={`Logotipo ${escola.nomeOficial}`}
                  className="h-14 w-14 object-contain rounded-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {exibirInsigniaDoc && (
              <div className="flex justify-center mb-1">
                {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                  <img 
                    src={configSistema.insigniaNacionalUrl} 
                    alt="Insígnia da República de Angola" 
                    className="h-16 w-16 object-contain mx-auto" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <InsigniaAngola size={56} />
                )}
              </div>
            )}
            {cabecalhoLinhasDoc ? (
              cabecalhoLinhasDoc.map((linha, idx) => (
                <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                  {linha}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                <p className="text-[11px] font-bold uppercase text-gray-800">
                  {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}
                </p>
                <p className="text-[11px] font-bold uppercase text-gray-800">
                  {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                </p>
              </>
            )}
            <h2 className="text-base sm:text-lg font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
              {escola.nomeOficial}
            </h2>

            {/* Distinção Rigorosa: Pauta Geral/Final vs Trimestral vs Por Disciplina */}
            <div className="pt-2">
              <div className="space-y-1">
                <span className="text-sm sm:text-base font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-blue-50 text-blue-950 tracking-wider">
                  {pautaSubTipo === 'disciplina' ? (
                    `PAUTA DA DISCIPLINA DE ${disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId)?.nome?.toUpperCase() || 'DISCIPLINA'} — ANO LECTIVO ${turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}`
                  ) : pautaSubTipo === 'trimestral' ? (
                    `PAUTA OFICIAL DO ${pautaTrimestre}º TRIMESTRE — ANO LECTIVO ${turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}`
                  ) : juriTurmaSelecionada ? (
                    `PAUTA FINAL HOMOLOGADA — ANO LECTIVO ${turmaSelecionada.anoLectivo || escola.anoLectivoActivo}`
                  ) : (
                    `PAUTA GERAL FINAL — ANO LECTIVO ${turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}`
                  )}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                  <span className="px-3 py-0.5 bg-slate-100 text-slate-800 font-bold rounded-full border border-slate-300">
                    Modo: {pautaModoExibicao === 'sintetica' ? '📊 Sintético (Médias Finais)' : '📑 Analítico Completo (MAC, PPT, MT, MFD & %)'}
                  </span>
                  {juriTurmaSelecionada && (
                    <span className="px-3 py-0.5 bg-emerald-100 text-emerald-900 font-black rounded-full border border-emerald-300 inline-flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Homologada pelo Júri (Sessão {juriTurmaSelecionada.numeroSessao || 'Oficial'})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Turma & Classe Fixos */}
          <div data-pdf-fixed-student="true" data-pdf-student-grid={isSegundoCiclo(turmaSelecionada.classe) ? '6' : '5'} className={`grid grid-cols-2 ${isSegundoCiclo(turmaSelecionada.classe) ? 'sm:grid-cols-6' : 'sm:grid-cols-5'} gap-2 text-xs py-2 border-b border-black`}>
            <div>
              <span className="text-gray-600 block text-[10px]">Ano Lectivo:</span>
              <strong className="text-sm" style={{ color: corDestaqueDoc }}>{turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}</strong>
            </div>
            <div>
              <span className="text-gray-600 block text-[10px]">Classe:</span>
              <strong className="text-sm">{turmaSelecionada.classe}</strong>
            </div>
            <div>
              <span className="text-gray-600 block text-[10px]">Turma:</span>
              <strong className="text-sm">{turmaSelecionada.nome}</strong>
            </div>
            <div>
              <span className="text-gray-600 block text-[10px]">Turno:</span>
              <strong>{turmaSelecionada.turno}</strong>
            </div>
            <div>
              <span className="text-gray-600 block text-[10px]">Sala:</span>
              <strong>{turmaSelecionada.sala}</strong>
            </div>
            {isSegundoCiclo(turmaSelecionada.classe) && (
              <div>
                <span className="text-gray-600 block text-[10px]">Curso:</span>
                <strong className="truncate block">{turmaSelecionada.curso || '—'}</strong>
              </div>
            )}
          </div>

          {/* TABELA DA PAUTA: 1. CASO PAUTA POR DISCIPLINA */}
          {pautaSubTipo === 'disciplina' ? (() => {
            const discAtual = disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0];
            const escalaAprovacao = obterInformacaoEscala(turmaSelecionada.classe, turmaSelecionada.nivelEnsino).notaAprovacao;
            const limiarRecurso = escalaAprovacao <= 5 ? Math.max(3, escalaAprovacao - 2) : 7;
            let totalPos = 0;
            let totalNeg = 0;

            return (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-[11px] border border-black text-center min-w-[850px]">
                  <thead className="bg-gray-100 font-bold border-b border-black text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black w-8">N.º</th>
                      <th className="p-1.5 border-r border-black w-24">Proc. n.º</th>
                      <th className="p-1.5 border-r border-black text-left min-w-[200px]">Nome Completo do Estudante</th>
                      <th className="p-1.5 border-r border-black w-14" title="Avaliação Contínua">MAC</th>
                      {provaProfessorAtiva && (
                        <th className="p-1.5 border-r border-black w-14" title="Prova do Professor">NPP</th>
                      )}
                      <th className="p-1.5 border-r border-black w-14" title="1º Trimestre">MT1</th>
                      <th className="p-1.5 border-r border-black w-14" title="2º Trimestre">MT2</th>
                      <th className="p-1.5 border-r border-black w-14" title="3º Trimestre">MT3</th>
                      {ehClasseFinalTurma && (
                        <th className="p-1.5 border-r border-black w-14 bg-amber-50" title="Exame Terminal do Ciclo">Exame</th>
                      )}
                      <th className="p-1.5 border-r border-black w-16 bg-gray-200" title="Média Final da Disciplina">MFD</th>
                      <th className="p-1.5 border-r border-black w-24 bg-green-50">Comportamento</th>
                      <th className="p-1.5 min-w-[120px]">Observação / Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {alunosDaTurma.length === 0 ? (
                      <tr>
                        <td colSpan={9 + (provaProfessorAtiva ? 1 : 0) + (ehClasseFinalTurma ? 1 : 0)} className="p-6 text-center text-gray-500 italic">
                          Nenhum estudante matriculado nesta turma para o ano lectivo selecionado.
                        </td>
                      </tr>
                    ) : (
                      alunosDaTurma.map((aluno, idx) => {
                        const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id && (!discAtual || n.disciplinaId === discAtual.id));
                        const n1 = notasAluno.find(n => String(n.trimestre).includes('1'));
                        const n2 = notasAluno.find(n => String(n.trimestre).includes('2'));
                        const n3 = notasAluno.find(n => String(n.trimestre).includes('3'));
                        
                        const mac = n1?.mac ?? n2?.mac ?? n3?.mac ?? '—';
                        const npp = n1?.npp ?? n2?.npp ?? n3?.npp ?? '—';
                        const mt1 = n1?.mediaTrimestral ?? n1?.notaFinal ?? '—';
                        const mt2 = n2?.mediaTrimestral ?? n2?.notaFinal ?? '—';
                        const mt3 = n3?.mediaTrimestral ?? n3?.notaFinal ?? '—';
                        const exame = ehClasseFinalTurma ? (n3?.notaExame ?? n2?.notaExame ?? n1?.notaExame ?? '—') : undefined;

                        const mfdRaw = n3?.notaFinal ?? n3?.mediaTrimestral ?? n2?.notaFinal ?? n1?.notaFinal;
                        const mfd = mfdRaw !== undefined && mfdRaw !== null ? Math.round(Number(mfdRaw)) : null;

                        if (mfd !== null) {
                          if (mfd >= escalaAprovacao) totalPos++;
                          else totalNeg++;
                        }

                        return (
                          <tr key={aluno.id} className="hover:bg-gray-50">
                            <td className="p-1.5 border-r border-black font-mono font-bold">{idx + 1}</td>
                            <td className="p-1.5 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                            <td className="p-1.5 border-r border-black text-left font-bold text-gray-900 truncate max-w-[220px]">{aluno.nomeCompleto}</td>
                            <td className="p-1.5 border-r border-black font-mono">{mac}</td>
                            {provaProfessorAtiva && (
                              <td className="p-1.5 border-r border-black font-mono">{npp}</td>
                            )}
                            <td className="p-1.5 border-r border-black font-mono">{mt1}</td>
                            <td className="p-1.5 border-r border-black font-mono">{mt2}</td>
                            <td className="p-1.5 border-r border-black font-mono">{mt3}</td>
                            {ehClasseFinalTurma && (
                              <td className="p-1.5 border-r border-black font-mono font-bold bg-amber-50/50">{exame}</td>
                            )}
                            <td className="p-1.5 border-r border-black font-mono font-bold bg-gray-50">
                              {mfd !== null ? (
                                <span className={mfd >= escalaAprovacao ? 'text-emerald-800' : 'text-rose-700'}>
                                  {mfd}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-1.5 border-r border-black text-[9px] bg-green-50/30">
                              {aluno.comportamentoConceito || <span className="text-gray-400 font-normal">—</span>}
                            </td>
                            <td className="p-1.5 text-center font-bold">
                              {mfd !== null ? (
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                                  mfd >= escalaAprovacao 
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                    : mfd >= limiarRecurso ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}>
                                  {mfd >= escalaAprovacao ? 'Aprovado' : mfd >= limiarRecurso ? 'Recurso' : 'Não Transita'}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[10px]">Sem Notas</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })() : (
            /* TABELA DA PAUTA GERAL OU TRIMESTRAL */
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-[11px] border border-black text-center min-w-[980px]">
                <thead className="bg-gray-100 font-bold border-b border-black text-[10px]">
                  <tr>
                    <th className="p-1 border-r border-black w-8">N.º</th>
                    <th className="p-1 border-r border-black w-24">Proc. n.º</th>
                    <th className="p-1 border-r border-black text-left min-w-[180px]">Nome Completo do Estudante</th>
                    {disciplinasDaClasseDocumento.map(d => (
                      <th key={d.id} className="p-1 border-r border-black w-12" title={d.nome}>
                        {d.sigla || d.nome.substring(0, 4)}
                      </th>
                    ))}
                    <th className="p-1 border-r border-black w-10 text-red-800" title="Disciplinas Negativas">Neg.</th>
                    <th className="p-1 border-r border-black w-12 bg-gray-200">Média</th>
                    <th className="p-1 border-r border-black w-24 bg-green-50" title="Comportamento Geral">Comportamento</th>
                    <th className="p-1 min-w-[110px]">Resultado Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {alunosDaTurma.length === 0 ? (
                    <tr>
                      <td colSpan={disciplinasDaClasseDocumento.length + 6} className="p-6 text-center text-gray-500 italic">
                        Nenhum estudante matriculado nesta turma para o ano letivo selecionado.
                      </td>
                    </tr>
                  ) : (
                    alunosDaTurma.map((aluno, idx) => {
                      const notasHomologadas = dbService.obterNotasHomologadasAluno(aluno.id);
                      const deliberacao = juriTurmaSelecionada?.deliberacoes?.[aluno.id];
                      let totalPositivas = 0;
                      let totalNegativas = 0;
                      let somaNotas = 0;
                      let disciplinasComNota = 0;
                      const escalaAprovacao = obterInformacaoEscala(turmaSelecionada.classe, turmaSelecionada.nivelEnsino).notaAprovacao;

                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50">
                          <td className="p-1 border-r border-black font-mono font-bold">{idx + 1}</td>
                          <td className="p-1 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                          <td className="p-1 border-r border-black text-left font-bold text-gray-900 truncate max-w-[200px]">{aluno.nomeCompleto}</td>
                          
                          {disciplinasDaClasseDocumento.map(d => {
                            const nConsol = notasHomologadas.find(nh => nh.disciplinaId === d.id) || 
                              notasConsolidadas.find(nc => nc.alunoId === aluno.id && nc.disciplinaId === d.id && (pautaSubTipo !== 'trimestral' || String(nc.trimestre).includes(pautaTrimestre)));
                            
                            const notaValor = pautaSubTipo === 'trimestral'
                              ? (nConsol?.mediaTrimestral ?? nConsol?.notaFinal)
                              : (nConsol?.notaFinal ?? nConsol?.mediaTrimestral);
                            
                            const notaAlterada = deliberacao?.notasAlteradas?.find(na => na.disciplinaId === d.id);

                            if (notaValor !== undefined && notaValor !== null) {
                              somaNotas += Number(notaValor);
                              disciplinasComNota++;
                              if (notaValor >= escalaAprovacao) totalPositivas++;
                              else totalNegativas++;
                            }

                            return (
                              <td key={d.id} className="p-1 border-r border-black font-mono text-center font-bold">
                                {notaValor !== undefined && notaValor !== null ? (
                                  <span className={`inline-flex items-center space-x-0.5 ${notaValor >= escalaAprovacao ? 'text-emerald-800' : 'text-red-700'}`}>
                                    <span>{Math.round(Number(notaValor))}</span>
                                    {notaAlterada && (
                                      <span className="text-[9px] text-purple-700 font-black" title={`Ajustada pelo Júri de ${notaAlterada.notaAnterior} para ${notaAlterada.novaNota}.`}>*</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-1 border-r border-black font-bold text-red-700">{totalNegativas}</td>
                          <td className="p-1 border-r border-black font-bold bg-gray-50">
                            {disciplinasComNota > 0 ? (somaNotas / disciplinasComNota).toFixed(1) : '-'}
                          </td>
                          <td className="p-1 border-r border-black font-bold text-[9px] bg-green-50/30">
                            {(() => {
                              const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id && (n.turmaId === turmaSelecionada.id || !n.turmaId));
                              const notasComp = notasAluno.map(n => n.comportamentoNota).filter((n): n is number => typeof n === 'number' && n > 0);
                              if (notasComp.length === 0) return <span className="text-gray-400 font-normal">—</span>;
                              const mediaComp = notasComp.reduce((a, b) => a + b, 0) / notasComp.length;
                              const conceito = converterComportamentoParaConceito(mediaComp);
                              return (
                                <span className="px-1.5 py-0.5 rounded font-black text-slate-800">
                                  {conceito}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-1 text-center font-bold">
                            {juriTurmaSelecionada ? (
                              deliberacao ? (
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                                  deliberacao.decisao === 'Aprovar' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                  deliberacao.decisao === 'Recurso' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                  'bg-red-100 text-red-900 border border-red-300'
                                }`}>
                                  {deliberacao.decisao === 'Aprovar' ? 'Aprovado' : deliberacao.decisao === 'Recurso' ? 'Recurso' : 'Não Aprovado'}
                                </span>
                              ) : totalNegativas <= 2 ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800">Transita</span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-800">Não Transita</span>
                              )
                            ) : (
                              totalNegativas === 0 && disciplinasComNota > 0 ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800">Aprovado</span>
                              ) : totalNegativas <= 2 ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800">Apto Recurso</span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-rose-100 text-rose-800">Não Transita</span>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sumário Estatístico e Percentagens Oficiais da Turma */}
          {(() => {
            const escalaAprovPauta = obterInformacaoEscala(turmaSelecionada.classe, turmaSelecionada.nivelEnsino).notaAprovacao;
            const totalMatriculados = alunosDaTurma.length;
            const alunosAvaliados = alunosDaTurma.filter(a => a.estado !== 'Desistente' && notasConsolidadas.some(nc => nc.alunoId === a.id));
            const totalAvaliados = alunosAvaliados.length;
            const alunosAprovados = alunosAvaliados.filter(a => {
              const n = notasConsolidadas.filter(nc => nc.alunoId === a.id);
              if (n.length === 0) return false;
              const neg = n.filter(x => (x.notaFinal ?? x.mediaTrimestral ?? 0) < escalaAprovPauta).length;
              return neg <= 2;
            });
            const alunosRecurso = alunosAvaliados.filter(a => {
              const n = notasConsolidadas.filter(nc => nc.alunoId === a.id);
              if (n.length === 0) return false;
              const neg = n.filter(x => (x.notaFinal ?? x.mediaTrimestral ?? 0) < escalaAprovPauta).length;
              return neg === 3;
            });
            const alunosReprovados = alunosAvaliados.filter(a => {
              const n = notasConsolidadas.filter(nc => nc.alunoId === a.id);
              if (n.length === 0) return false;
              const neg = n.filter(x => (x.notaFinal ?? x.mediaTrimestral ?? 0) < escalaAprovPauta).length;
              return neg > 3;
            });
            const semNotas = totalMatriculados - totalAvaliados;
            const percAprovados = totalAvaliados > 0 ? Math.round((alunosAprovados.length / totalAvaliados) * 100) : 0;
            const percInsucesso = totalAvaliados > 0 ? Math.round(((alunosRecurso.length + alunosReprovados.length) / totalAvaliados) * 100) : 0;

            const mascMatriculados = alunosDaTurma.filter(a => a.genero === 'M').length;
            const femMatriculados = alunosDaTurma.filter(a => a.genero === 'F').length;
            const mascAprovados = alunosAprovados.filter(a => a.genero === 'M').length;
            const femAprovados = alunosAprovados.filter(a => a.genero === 'F').length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-gray-50 border border-black rounded text-xs text-center">
                <div>
                  <span className="text-gray-600 block text-[10px] uppercase font-bold">Matriculados (MF)</span>
                  <strong className="text-sm font-mono text-gray-900">{totalMatriculados} <span className="text-[10px] font-normal text-gray-600">(M:{mascMatriculados} F:{femMatriculados})</span></strong>
                </div>
                <div>
                  <span className="text-indigo-700 block text-[10px] uppercase font-bold">Avaliados Efectivos</span>
                  <strong className="text-sm font-mono text-indigo-900">{totalAvaliados}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Aprovados ({percAprovados}%)</span>
                  <strong className="text-sm font-mono text-emerald-800">{alunosAprovados.length} <span className="text-[10px] font-normal text-emerald-700">(M:{mascAprovados} F:{femAprovados})</span></strong>
                </div>
                <div>
                  <span className="text-amber-700 block text-[10px] uppercase font-bold">Insucesso / Recurso</span>
                  <strong className="text-sm font-mono text-amber-800">{alunosRecurso.length + alunosReprovados.length} ({percInsucesso}%)</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Sem Notas Lançadas</span>
                  <strong className="text-sm font-mono text-gray-700">{semNotas}</strong>
                </div>
              </div>
            );
          })()}

          {/* Data Oficial da Pauta Conforme Normas do Ministério da Educação */}
          <div className="flex justify-end my-4 pr-3">
            <p className="text-right text-xs font-serif italic text-gray-800">
              {escola.municipio ? `${escola.municipio}` : (escola.provincia || 'Luanda')}, aos {hojeAngolano('extenso')}.
            </p>
          </div>

          {/* Assinaturas Oficiais com Traço Rigoroso Entre Título e Nome & Gênero */}
          <div className="pt-6 border-t-2 border-black">
            <div className="text-center font-bold text-[10px] uppercase tracking-wider mb-6 text-gray-800">
              {juriTurmaSelecionada 
                ? 'Termos Oficiais de Homologação da Comissão de Júri de Exame' 
                : 'Corpo Técnico Pedagógico da Turma'}
            </div>

            {juriTurmaSelecionada ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                {/* 1. Presidente do Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">O Presidente da Comissão de Júri</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {obterPresidenteJuri(juriTurmaSelecionada, funcionariosEscola)}
                  </p>
                </div>

                {/* 2. 1º Vogal do Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">O 1º Vogal do Júri</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {(() => {
                      const v = obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola);
                      return v.primeiroVogal;
                    })()}
                  </p>
                </div>

                {/* 3. 2º Vogal do Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">O 2º Vogal do Júri</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {(() => {
                      const v = obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola);
                      return v.segundoVogal;
                    })()}
                  </p>
                </div>

                {/* 4. Director Geral com Assinatura Digitalizada & Homologação */}
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="font-black text-gray-950 uppercase text-[11px]">{getTituloDiretor(escola)} (Homologação)</p>
                  {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                    <div className="h-10 flex items-center justify-center -mb-1">
                      <img 
                        src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                        alt="Assinatura do Director" 
                        className="max-h-9 max-w-[140px] object-contain mix-blend-multiply" 
                      />
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {nomeDiretorGeral}
                  </p>
                  <span className="text-[9px] text-gray-400 block">[Carimbo / Selo Branco]</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">{obterTituloCoordenadorTurma(turmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {obterNomeCoordenadorTurma(turmaSelecionada, funcionariosEscola)}
                  </p>
                </div>
                <div className="space-y-1">
                  {(() => {
                    const discAtual = disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0];
                    const nomeCoord = obterNomeCoordenadorDisciplina(discAtual?.id, turmaSelecionada?.id, dbService.getAtribuicoes(), funcionariosEscola, discAtual?.nome);
                    const tituloCoord = obterTituloCoordenadorDisciplina(discAtual?.id, turmaSelecionada?.id, dbService.getAtribuicoes(), funcionariosEscola, discAtual?.nome);
                    return (
                      <>
                        <p className="font-bold text-gray-950 uppercase text-[11px]">{tituloCoord}</p>
                        <div className="h-6" />
                        <div className="w-40 border-b border-black mx-auto my-1.5" />
                        <p className="font-bold text-gray-800 text-[11px]">{nomeCoord}</p>
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">{getTituloSubPedagogico(escola)}</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {subdirectorPedagogicoNome}
                  </p>
                </div>
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">{getTituloDiretor(escola)}</p>
                  {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                    <div className="h-10 flex items-center justify-center -mb-1">
                      <img 
                        src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                        alt="Assinatura do Director" 
                        className="max-h-9 max-w-[140px] object-contain mix-blend-multiply" 
                      />
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {nomeDiretorGeral}
                  </p>
                </div>
              </div>
            )}

            {exibirCodigoQrDoc && (
              <div className="mt-5 pt-3 border-t border-gray-300 flex items-center justify-between gap-4 text-[9px] text-gray-600">
                <div className="text-left">
                  <p className="font-bold uppercase text-gray-800">Autenticidade da Pauta Oficial</p>
                  {limparTextoSistema(configAtual?.textoRodape) && (
                    <p>{limparTextoSistema(configAtual?.textoRodape)}</p>
                  )}
                </div>
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'PAUTA_OFICIAL',
                    escolaId: escola.id,
                    docRef: `${turmaSelecionada?.id || 'turma'}-${pautaDisciplinaId}`,
                    turmaId: turmaSelecionada?.id,
                    anoLectivo: turmaSelecionada?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                  })}
                  size={54}
                  label="Validar Pauta"
                />
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 3. DECLARAÇÃO DE HABILITAÇÕES COM NOTAS                                   */}
      {/* ========================================================================= */}
      {docType === 'declaracao_notas' && (
        !alunoSelecionado ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhum Estudante Registado ou Selecionado</h3>
            <p className="text-sm text-gray-500 mt-1">
              Para emitir a Declaração com Notas, selecione ou registe um estudante.
            </p>
          </div>
        ) : (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-6 sm:p-8 md:p-10 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-6 ${fontScaleClassDoc}`}>
          {/* Cabeçalho Oficial com Insígnia Centralizada Fixa */}
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="relative text-center space-y-1">
            {exibirLogoEscolaDoc && (
              <div data-pdf-corner-right="true" className="absolute right-0 top-0 z-10">
                <img
                  src={escola.logotipoUrl || escola.logotipo}
                  alt={`Logotipo ${escola.nomeOficial}`}
                  className="h-14 w-14 object-contain rounded-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {exibirInsigniaDoc && (
              <div className="flex justify-center mb-1">
                {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                  <img 
                    src={configSistema.insigniaNacionalUrl} 
                    alt="Insígnia da República de Angola" 
                    className="h-16 w-16 object-contain mx-auto" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <InsigniaAngola size={56} />
                )}
              </div>
            )}
            {cabecalhoLinhasDoc ? (
              cabecalhoLinhasDoc.map((linha, idx) => (
                <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                  {linha}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                <p className="text-[11px] font-bold uppercase text-gray-800">
                  {escola.governoProvincial || `GOVERNO PROVINCIAL DO ${(escola.provincia || 'LUANDA').toUpperCase()}`}
                </p>
                <p className="text-[11px] font-bold uppercase text-gray-800">
                  {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                </p>
              </>
            )}
            <h2 className="text-sm sm:text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
              {escola.nomeOficial}
            </h2>
          </div>

          {/* Título da Declaração */}
          <div className="text-center py-2">
            <h3 className="text-base sm:text-lg font-serif font-black uppercase tracking-wide border-b-2 border-black inline-block px-4 pb-1" style={{ color: corDestaqueDoc, borderColor: corDestaqueDoc }}>
              {limparTextoSistema(configAtual?.tituloOficial) || 'DECLARAÇÃO DE HABILITAÇÕES (COM NOTAS)'}
            </h3>
            {limparTextoSistema(configAtual?.subtitulo) && configAtual?.subtitulo !== 'Ministério da Educação de Angola' && (
              <p className="text-xs font-semibold text-gray-700 mt-1">{limparTextoSistema(configAtual?.subtitulo)}</p>
            )}
          </div>

          {/* Texto Legal e Identificação Completa do Aluno */}
          <div data-pdf-fixed-student="true" className="text-xs sm:text-[13px] leading-relaxed text-justify space-y-3">
            <p>
              <strong>{nomeDiretorGeral}</strong>, {tituloDiretorGeral} do(a) <strong>{escola.nomeOficial}</strong>, criado(a) sob o <strong>{limparTextoSistema(escola.decretoCriacao || configAtual?.artigoLegalDecreto) || 'Decreto de Criação da Instituição'}</strong>, ao abrigo da <strong>{limparTextoSistema(escola.artigoLegal || configAtual?.artigoLegalDecreto) || 'Lei n.º 32/20 de 12 de Agosto (Lei de Bases do Sistema de Educação e Ensino)'}</strong>
              {limparTextoSistema(configAtual?.textoCorpoAbertura) ? `: ${limparTextoSistema(configAtual?.textoCorpoAbertura)}` : ':'}
            </p>

            <p>
              Declara que <strong>{alunoSelecionado.nomeCompleto.toUpperCase()}</strong>, {alunoSelecionado.genero === 'F' ? 'filha' : 'filho'} de <strong>{alunoSelecionado.nomePai || '—'}</strong> e de <strong>{alunoSelecionado.nomeMae || '—'}</strong>, {alunoSelecionado.genero === 'F' ? 'nascida' : 'nascido'} aos <strong>{formatarDataAngolana(alunoSelecionado.dataNascimento, 'extenso')}</strong>, natural de <strong>{alunoSelecionado.naturalidade || '—'}</strong>, Município de <strong>{alunoSelecionado.municipioNascimento || '—'}</strong>, Província de <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong>, {alunoSelecionado.genero === 'F' ? 'portadora' : 'portador'} do {alunoSelecionado.tipoDocumento || 'Bilhete de Identidade'} n.º <strong>{alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—'}</strong>, emitido aos <strong>{formatarDataAngolana(alunoSelecionado.dataEmissaoBI, 'extenso')}</strong>, pelo <strong>{alunoSelecionado.arquivoIdentificacao || '—'}</strong>.
            </p>

            <p>
              {(() => {
                const mediaNum = mediaGeralCalculada !== '—' && !isNaN(Number(mediaGeralCalculada)) ? Number(mediaGeralCalculada) : null;
                const situacaoTexto =
                  mediaNum === null
                    ? `Frequentou a`
                    : mediaNum >= escalaAlunoDoc.notaAprovacao
                    ? `Concluiu com aproveitamento a`
                    : `Frequentou com aproveitamento insuficiente a`;
                const turnoReal = turmaDoAluno?.turno || alunoSelecionado.periodo;
                const anoReal =
                  alunoSelecionado.anoLectivo ||
                  alunoSelecionado.anoMatricula ||
                  turmaDoAluno?.anoLectivo ||
                  selectedAnoLectivo ||
                  escola.anoLectivoActivo ||
                  '—';
                return (
                  <>
                    {situacaoTexto} <strong>{classeAlunoDoc ? `${classeAlunoDoc} Classe` : '—'}</strong>, no Ano Lectivo de <strong>{anoReal}</strong>
                    {ehSegundoCicloAlunoDoc && cursoAlunoDoc ? (
                      <>, no Curso de <strong>{cursoAlunoDoc}</strong></>
                    ) : null}
                    {turnoReal ? (
                      <>, no Período <strong>{turnoReal}</strong></>
                    ) : null}
                    , com a seguinte classificação curricular:
                  </>
                );
              })()}
            </p>
          </div>

          {/* Tabela de Disciplinas & Classificação Real da Classe do Aluno */}
          <div className="pt-2 overflow-x-auto">
            <table className="w-full min-w-[580px] text-xs border border-black">
              <thead className="bg-gray-100 font-bold border-b border-black text-left">
                <tr>
                  <th className="p-2 border-r border-black">DISCIPLINAS ({classeAlunoDoc || '—'})</th>
                  <th className="p-2 text-center w-56">CLASSIFICAÇÃO CURRICULAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {disciplinasDaClasseAluno.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500 italic">
                      Nenhuma disciplina curricular registada para a {classeAlunoDoc || 'classe selecionada'}.
                    </td>
                  </tr>
                ) : (
                  <>
                    {disciplinasDaClasseAluno.some(d => (d as any).componente === 'Específica') && (
                      <tr className="bg-gray-50 font-bold text-[11px]">
                        <td colSpan={2} className="p-1.5 uppercase text-gray-800">I. Componente de Formação Geral</td>
                      </tr>
                    )}
                    {disciplinasDaClasseAluno
                      .filter(d => (d as any).componente !== 'Específica')
                      .map(disc => {
                        const { valorFinal } = resolverNotaRealAluno(disc, classeAlunoDoc);
                        const notaArredondada = valorFinal !== null ? Math.round(valorFinal) : null;
                        return (
                          <tr key={disc.id}>
                            <td className="p-1.5 border-r border-black pl-4 font-medium">{disc.nome}</td>
                            <td className="p-1.5 text-center font-semibold">
                              {notaArredondada !== null
                                ? `${notaArredondada} (${converterNotaParaExtensoMED(notaArredondada)})`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}

                    {disciplinasDaClasseAluno.some(d => (d as any).componente === 'Específica') && (
                      <>
                        <tr className="bg-gray-50 font-bold text-[11px]">
                          <td colSpan={2} className="p-1.5 uppercase text-gray-800">II. Componente de Formação Específica</td>
                        </tr>
                        {disciplinasDaClasseAluno
                          .filter(d => (d as any).componente === 'Específica')
                          .map(disc => {
                            const { valorFinal } = resolverNotaRealAluno(disc, classeAlunoDoc);
                            const notaArredondada = valorFinal !== null ? Math.round(valorFinal) : null;
                            return (
                              <tr key={disc.id}>
                                <td className="p-1.5 border-r border-black pl-4 font-medium">{disc.nome}</td>
                                <td className="p-1.5 text-center font-semibold">
                                  {notaArredondada !== null
                                    ? `${notaArredondada} (${converterNotaParaExtensoMED(notaArredondada)})`
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                      </>
                    )}
                  </>
                )}

                {/* Linha Média Global */}
                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                  <td className="p-2 border-r border-black uppercase">MÉDIA GLOBAL OBTIDA</td>
                  <td className="p-2 text-center text-sm font-black">
                    {mediaGeralCalculada !== '—' && !isNaN(Number(mediaGeralCalculada))
                      ? `${Math.round(Number(mediaGeralCalculada))} (${converterNotaParaExtensoMED(Math.round(Number(mediaGeralCalculada)))}) Valores`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Parágrafo de Livro de Registo */}
          <div className="text-xs leading-relaxed text-justify space-y-2 pt-2">
            <p>
              Consta no livro de registo n.º <strong>{alunoSelecionado.livroRegisto || '—'}</strong>, à folha <strong>{alunoSelecionado.folhaRegisto || '—'}</strong>, com o processo n.º <strong>{alunoSelecionado.numeroProcesso || alunoSelecionado.codigoMatricula || '—'}</strong>.
            </p>
            <p>
              {limparTextoSistema(configAtual?.textoFechamento) ||
                'Por ser verdade e ter sido solicitada pela parte interessada, mandou-se passar a presente declaração que vai por mim assinada e autenticada com o carimbo a óleo e selo branco em uso neste estabelecimento de ensino.'}
            </p>
            <p className="text-right pt-2 font-medium">
              {escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.
            </p>
          </div>

          {/* Assinaturas Oficiais: Título (topo) -> Traço (+ assinatura) -> Nome (baixo) */}
          <div className={`grid ${exibirAssinSubdiretorDoc && exibirAssinDiretorDoc ? 'grid-cols-2' : 'grid-cols-1'} gap-8 pt-8 text-xs text-center border-t border-gray-300`}>
            {exibirAssinSubdiretorDoc && (
              <div className="space-y-1 flex flex-col items-center justify-end">
                <p className="font-bold text-gray-950 uppercase text-xs">{getTituloSubPedagogico(escola)}</p>
                <div className="h-8" />
                <div className="w-56 border-b border-black mx-auto my-1.5" />
                <p className="font-bold text-gray-900 text-xs uppercase">{subdirectorPedagogicoNome}</p>
              </div>
            )}
            {exibirAssinDiretorDoc && (
              <div className="space-y-1 flex flex-col items-center justify-end">
                <p className="font-bold text-gray-950 uppercase text-xs">{getTituloDiretor(escola)}</p>
                {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                  <div className="h-10 flex items-center justify-center -mb-1">
                    <img 
                      src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                      alt="Assinatura do Director" 
                      className="max-h-9 max-w-[140px] object-contain mix-blend-multiply" 
                    />
                  </div>
                ) : (
                  <div className="h-8" />
                )}
                <div className="w-56 border-b border-black mx-auto my-1.5" />
                <p className="font-bold text-gray-900 text-xs uppercase">{nomeDiretorGeral}</p>
              </div>
            )}
          </div>

          {/* Após as assinaturas: deixar APENAS o Código QR, sem dizeres adicionais */}
          {exibirCodigoQrDoc && (
            <div className="pt-3 flex items-center justify-end">
              <OfficialQrCode
                value={gerarPayloadQrDocumento({
                  docType: 'DECLARACAO_NOTAS',
                  escolaId: escola.id,
                  docRef: `DECL-${alunoSelecionado.codigoMatricula}`,
                  alunoId: alunoSelecionado.id,
                  alunoNome: alunoSelecionado.nomeCompleto,
                  turmaId: turmaDoAluno?.id,
                  anoLectivo: alunoSelecionado.anoLectivo || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                })}
                size={56}
              />
            </div>
          )}
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 3. CERTIFICADO MULTI-CLASSE 10ª, 11ª, 12ª (SCREENSHOT 4 - COMPLEXO 151) */}
      {/* ========================================================================= */}
      {docType === 'certificado_ciclo' && (
        !alunoSelecionado ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhum Estudante Registado ou Selecionado</h3>
            <p className="text-sm text-gray-500 mt-1">
              Para emitir o Certificado Oficial de Habilitações, selecione ou registe um estudante concluinte.
            </p>
          </div>
        ) : (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-4 border-double border-gray-900 p-6 sm:p-8 md:p-10 rounded-xl shadow-lg max-w-5xl mx-auto text-black print:shadow-none print:p-6 print:border-4 print:border-double print:border-gray-900 space-y-6 ${fontScaleClassDoc}`}>
          {/* Cabeçalho Oficial com Insígnia Centralizada Fixa */}
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="relative text-center space-y-1">
            {exibirLogoEscolaDoc && (
              <div data-pdf-corner-right="true" className="absolute right-0 top-0 z-10">
                <img
                  src={escola.logotipoUrl || escola.logotipo}
                  alt={`Logotipo ${escola.nomeOficial}`}
                  className="h-14 w-14 object-contain rounded-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {exibirInsigniaDoc && (
              <div className="flex justify-center mb-1">
                {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                  <img 
                    src={configSistema.insigniaNacionalUrl} 
                    alt="Insígnia da República de Angola" 
                    className="h-16 w-16 object-contain mx-auto" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <InsigniaAngola size={56} />
                )}
              </div>
            )}
            {cabecalhoLinhasDoc ? (
              cabecalhoLinhasDoc.map((linha, idx) => (
                <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                  {linha}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                <p className="text-[11px] font-bold uppercase text-gray-800">
                  {escola.governoProvincial || `GOVERNO PROVINCIAL DO ${(escola.provincia || 'LUANDA').toUpperCase()}`}
                </p>
                <p className="text-[11px] font-bold uppercase text-gray-800">
                  {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                </p>
              </>
            )}
            <h2 className="text-sm sm:text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
              {escola.nomeOficial}
            </h2>
          </div>

          {/* Título do Certificado Oficial Dinâmico por Nível de Ensino */}
          <div className="text-center py-2">
            <h3 className="text-base sm:text-lg font-serif font-black uppercase tracking-wider border-b-2 border-black inline-block px-6 pb-1" style={{ color: corDestaqueDoc, borderColor: corDestaqueDoc }}>
              {limparTextoSistema(configAtual?.tituloOficial) && configAtual?.tituloOficial !== 'CERTIFICADO DE HABILITAÇÕES'
                ? limparTextoSistema(configAtual?.tituloOficial)
                : tipoCertificadoEfetivo === 'primario_6' 
                ? 'CERTIFICADO DE CONCLUSÃO DO ENSINO PRIMÁRIO (6.ª CLASSE)' 
                : tipoCertificadoEfetivo === 'iciclo_9'
                  ? 'CERTIFICADO DE CONCLUSÃO DO Iº CICLO DO ENSINO SECUNDÁRIO GERAL (9.ª CLASSE)'
                  : tipoCertificadoEfetivo === 'tecnico_12_13'
                    ? 'CERTIFICADO DE HABILITAÇÕES TÉCNICO-PROFISSIONAIS (TÉCNICO MÉDIO)'
                    : 'CERTIFICADO DO IIº CICLO DO ENSINO SECUNDÁRIO GERAL (12.ª CLASSE)'}
            </h3>
          </div>

          {/* Texto de Certificação */}
          <div data-pdf-fixed-student="true" className="text-xs sm:text-[13px] leading-relaxed text-justify space-y-3">
            <p>
              <strong>{nomeDiretorGeral}</strong>, {tituloDiretorGeral} do(a) <strong>{escola.nomeOficial}</strong>, criado(a) sob o <strong>{limparTextoSistema(escola.decretoCriacao || configAtual?.artigoLegalDecreto) || 'Decreto de Criação da Instituição'}</strong>, ao abrigo da alínea e) do artigo 109º da Lei n.º 32/20 de 12 de Agosto (Lei de Bases do Sistema de Educação e Ensino)
              {limparTextoSistema(configAtual?.textoCorpoAbertura) ? `: ${limparTextoSistema(configAtual?.textoCorpoAbertura)}` : ':'}
            </p>

            <p>
              Certifica que <strong>{(alunoSelecionado.nomeCompleto || '[NOME DO ESTUDANTE]').toUpperCase()}</strong>, {alunoSelecionado.genero === 'F' ? 'filha' : 'filho'} de <strong>{alunoSelecionado.nomePai || '—'}</strong> e de <strong>{alunoSelecionado.nomeMae || '—'}</strong>, {alunoSelecionado.genero === 'F' ? 'nascida' : 'nascido'} aos <strong>{formatarDataAngolana(alunoSelecionado.dataNascimento, 'extenso')}</strong>, natural de <strong>{alunoSelecionado.naturalidade || '—'}</strong>, Município de <strong>{alunoSelecionado.municipioNascimento || '—'}</strong>, Província de <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong>, {alunoSelecionado.genero === 'F' ? 'portadora' : 'portador'} do {alunoSelecionado.tipoDocumento || 'Bilhete de Identidade'} n.º <strong>{alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—'}</strong>, emitido aos <strong>{formatarDataAngolana(alunoSelecionado.dataEmissaoBI, 'extenso')}</strong>, pelo <strong>{alunoSelecionado.arquivoIdentificacao || '—'}</strong>.
            </p>

            <p>
              {(() => {
                const anoReal =
                  alunoSelecionado.anoLectivo ||
                  alunoSelecionado.anoMatricula ||
                  turmaDoAluno?.anoLectivo ||
                  selectedAnoLectivo ||
                  escola.anoLectivoActivo ||
                  '—';
                if (tipoCertificadoEfetivo === 'primario_6') {
                  return <>Concluiu a <strong>6.ª Classe do Ensino Primário</strong>, no Ano Lectivo de <strong>{anoReal}</strong>, nos termos da matriz curricular nacional do Ensino Primário, tendo obtido as seguintes classificações:</>;
                }
                if (tipoCertificadoEfetivo === 'iciclo_9') {
                  return <>Concluiu a <strong>9.ª Classe do Iº Ciclo do Ensino Secundário Geral</strong>, no Ano Lectivo de <strong>{anoReal}</strong>, tendo obtido aproveitamento no Exame de Saída e as seguintes classificações:</>;
                }
                if (tipoCertificadoEfetivo === 'tecnico_12_13') {
                  return <>Concluiu a Formação Técnico-Profissional (<strong>{classeAlunoDoc || alunoSelecionado.classeId || '12.ª / 13.ª Classe'}</strong>), no Ano Lectivo de <strong>{anoReal}</strong>{cursoAlunoDoc ? <>, no Curso de Técnico Médio de <strong>{cursoAlunoDoc}</strong></> : null}, tendo obtido as seguintes classificações:</>;
                }
                return <>Concluiu a <strong>12.ª Classe do IIº Ciclo do Ensino Secundário Geral</strong>, no Ano Lectivo de <strong>{anoReal}</strong>{cursoAlunoDoc ? <>, na Área de <strong>{cursoAlunoDoc}</strong></> : null}, tendo obtido as seguintes classificações:</>;
              })()}
            </p>
          </div>

          {/* TABELA 1: ENSINO PRIMÁRIO (6ª CLASSE) */}
          {tipoCertificadoEfetivo === 'primario_6' && (() => {
            const discsMatriz = getDisciplinasMatrizOficial('6ª');
            const discs =
              discsMatriz.length > 0
                ? discsMatriz.map((nome, i) => ({ id: `cert-prim-${i}`, nome }))
                : disciplinasDaClasseAluno;
            const linhas = discs.map(disc => {
              const real = resolverNotaRealAluno(disc, '6ª');
              const mac = real.mac !== null ? Math.round(real.mac) : null;
              const cf = real.valorFinal !== null ? Math.round(real.valorFinal) : null;
              return { disc: disc.nome, mac, cf };
            });
            const comNota = linhas.filter(l => l.cf !== null);
            const mediaFinalCalc = comNota.length > 0 ? Math.round(comNota.reduce((a, b) => a + (b.cf || 0), 0) / comNota.length) : null;

            return (
              <div className="pt-2 overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs border border-black text-left">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left">DISCIPLINAS CURRICULARES (6.ª CLASSE)</th>
                      <th className="p-1.5 border-r border-black w-28">Avaliação Contínua (MAC)</th>
                      <th className="p-1.5 border-r border-black w-28 bg-gray-200">Classificação Final</th>
                      <th className="p-1.5 w-44">Classificação por Extenso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium">{row.disc}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.mac !== null ? row.mac : '—'}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{row.cf !== null ? row.cf : '—'}</td>
                        <td className="p-1.5 text-center font-medium">{row.cf !== null ? converterNotaParaCertificadoExtenso(row.cf) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                      <td className="p-2 border-r border-black uppercase">MÉDIA GERAL DO ENSINO PRIMÁRIO</td>
                      <td className="p-2 border-r border-black text-center">Conclusão do Ensino Primário</td>
                      <td className="p-2 border-r border-black text-center text-sm font-black">{mediaFinalCalc !== null ? mediaFinalCalc : '—'}</td>
                      <td className="p-2 text-center text-xs font-black uppercase">{mediaFinalCalc !== null ? converterNotaParaCertificadoExtenso(mediaFinalCalc) : 'Sem notas lançadas'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* TABELA 2: Iº CICLO DO ENSINO SECUNDÁRIO (7ª, 8ª e 9ª CLASSES) */}
          {tipoCertificadoEfetivo === 'iciclo_9' && (() => {
            const discsMatriz = getDisciplinasMatrizOficial('9ª');
            const discs =
              discsMatriz.length > 0
                ? discsMatriz.map((nome, i) => ({ id: `cert-ic-${i}`, nome }))
                : disciplinasDaClasseAluno;
            const linhas = discs.map(disc => {
              const r7 = resolverNotaRealAluno(disc, '7ª').valorFinal;
              const r8 = resolverNotaRealAluno(disc, '8ª').valorFinal;
              const r9 = resolverNotaRealAluno(disc, '9ª').valorFinal;
              const nums = [r7, r8, r9].filter((v): v is number => v !== null);
              const mf = nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
              return {
                disc: disc.nome,
                n7: r7 !== null ? Math.round(r7) : '—',
                n8: r8 !== null ? Math.round(r8) : '—',
                n9: r9 !== null ? Math.round(r9) : '—',
                mf
              };
            });
            const comNota = linhas.filter(l => l.mf !== null);
            const mediaFinalCalc = comNota.length > 0 ? Math.round(comNota.reduce((a, b) => a + (b.mf || 0), 0) / comNota.length) : null;

            return (
              <div className="pt-2 overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs border border-black text-left">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left">DISCIPLINAS DO Iº CICLO</th>
                      <th className="p-1.5 border-r border-black w-16">7.ª Classe</th>
                      <th className="p-1.5 border-r border-black w-16">8.ª Classe</th>
                      <th className="p-1.5 border-r border-black w-20">9.ª Classe</th>
                      <th className="p-1.5 border-r border-black w-16 bg-gray-200">M. Final</th>
                      <th className="p-1.5 w-40">Média por Extenso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium">{row.disc}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.n7}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.n8}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono font-bold">{row.n9}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{row.mf !== null ? row.mf : '—'}</td>
                        <td className="p-1.5 text-center font-medium">{row.mf !== null ? converterNotaParaCertificadoExtenso(row.mf) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                      <td className="p-2 border-r border-black uppercase">MÉDIA GERAL DO Iº CICLO</td>
                      <td colSpan={3} className="p-2 border-r border-black text-center">Conclusão do Iº Ciclo Geral</td>
                      <td className="p-2 border-r border-black text-center text-sm font-black">{mediaFinalCalc !== null ? mediaFinalCalc : '—'}</td>
                      <td className="p-2 text-center text-xs font-black uppercase">{mediaFinalCalc !== null ? converterNotaParaCertificadoExtenso(mediaFinalCalc) : 'Sem notas lançadas'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* TABELA 3: IIº CICLO GERAL (10ª, 11ª e 12ª CLASSES) */}
          {tipoCertificadoEfetivo === 'iiciclo_12' && (() => {
            const discsMatriz = getDisciplinasMatrizOficial('12ª', cursoAlunoDoc);
            const discs =
              discsMatriz.length > 0
                ? discsMatriz.map((nome, i) => ({ id: `cert-ii-${i}`, nome }))
                : disciplinasDaClasseAluno;
            const linhas = discs.map(disc => {
              const r10 = resolverNotaRealAluno(disc, '10ª').valorFinal;
              const r11 = resolverNotaRealAluno(disc, '11ª').valorFinal;
              const r12 = resolverNotaRealAluno(disc, '12ª').valorFinal;
              const nums = [r10, r11, r12].filter((v): v is number => v !== null);
              const mf = nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
              return {
                disciplinaNome: disc.nome,
                nota10: r10 !== null ? Math.round(r10) : '—',
                nota11: r11 !== null ? Math.round(r11) : '—',
                nota12: r12 !== null ? Math.round(r12) : '—',
                mediaFinal: mf
              };
            });
            const validas = linhas.filter(i => i.mediaFinal !== null);
            const mediaFinalCiclo = validas.length > 0 ? Math.round(validas.reduce((a, b) => a + (b.mediaFinal || 0), 0) / validas.length) : null;

            return (
              <div className="pt-2 overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs border border-black text-left">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left">DISCIPLINAS</th>
                      <th className="p-1.5 border-r border-black w-14">10.ª Classe</th>
                      <th className="p-1.5 border-r border-black w-14">11.ª Classe</th>
                      <th className="p-1.5 border-r border-black w-14">12.ª Classe</th>
                      <th className="p-1.5 border-r border-black w-14 bg-gray-200">M. Final</th>
                      <th className="p-1.5 w-44">Média por Extenso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium">{item.disciplinaNome}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{item.nota10}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{item.nota11}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{item.nota12}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{item.mediaFinal !== null ? item.mediaFinal : '—'}</td>
                        <td className="p-1.5 text-center font-medium">
                          {item.mediaFinal !== null ? converterNotaParaCertificadoExtenso(item.mediaFinal) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                      <td className="p-2 border-r border-black uppercase">MÉDIA DO CICLO</td>
                      <td colSpan={3} className="p-2 border-r border-black text-center">Conclusão do Ensino Secundário Geral</td>
                      <td className="p-2 border-r border-black text-center text-sm font-black">{mediaFinalCiclo !== null ? mediaFinalCiclo : '—'}</td>
                      <td className="p-2 text-center text-xs font-black uppercase">{mediaFinalCiclo !== null ? converterNotaParaCertificadoExtenso(mediaFinalCiclo) : 'Sem notas lançadas'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* TABELA 4: ENSINO TÉCNICO-PROFISSIONAL / MAGISTÉRIO (10ª A 13ª CLASSES) */}
          {tipoCertificadoEfetivo === 'tecnico_12_13' && (() => {
            const discsMatriz = getDisciplinasMatrizOficial(classeAlunoDoc || '12ª', cursoAlunoDoc);
            const discs =
              discsMatriz.length > 0
                ? discsMatriz.map((nome, i) => ({ id: `cert-tec-${i}`, nome }))
                : disciplinasDaClasseAluno;
            const linhas = discs.map(disc => {
              const r10 = resolverNotaRealAluno(disc, '10ª').valorFinal;
              const r11 = resolverNotaRealAluno(disc, '11ª').valorFinal;
              const r12 = resolverNotaRealAluno(disc, '12ª').valorFinal;
              const r13 = resolverNotaRealAluno(disc, '13ª').valorFinal;
              const nums = [r10, r11, r12, r13].filter((v): v is number => v !== null);
              const mf = nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
              return {
                disc: disc.nome,
                n10: r10 !== null ? Math.round(r10) : '—',
                n11: r11 !== null ? Math.round(r11) : '—',
                n12: r12 !== null ? Math.round(r12) : '—',
                n13: r13 !== null ? Math.round(r13) : '—',
                pap: '—',
                mf
              };
            });
            const validas = linhas.filter(l => l.mf !== null);
            const mediaFinalTecnico = validas.length > 0 ? Math.round(validas.reduce((a, b) => a + (b.mf || 0), 0) / validas.length) : null;

            return (
              <div className="pt-2 overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs border border-black text-left">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left">COMPONENTES DE FORMAÇÃO TÉCNICA</th>
                      <th className="p-1.5 border-r border-black w-12">10.ª</th>
                      <th className="p-1.5 border-r border-black w-12">11.ª</th>
                      <th className="p-1.5 border-r border-black w-12">12.ª</th>
                      <th className="p-1.5 border-r border-black w-12">13.ª</th>
                      <th className="p-1.5 border-r border-black w-16">PAP/Estágio</th>
                      <th className="p-1.5 border-r border-black w-14 bg-gray-200">M. Final</th>
                      <th className="p-1.5 w-36">Por Extenso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium">{row.disc}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.n10}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.n11}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.n12}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.n13}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono">{row.pap}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{row.mf !== null ? row.mf : '—'}</td>
                        <td className="p-1.5 text-center font-medium">{row.mf !== null ? converterNotaParaCertificadoExtenso(row.mf) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                      <td className="p-2 border-r border-black uppercase">MÉDIA FINAL DO CURSO TÉCNICO</td>
                      <td colSpan={5} className="p-2 border-r border-black text-center">Habilitação de Técnico Médio</td>
                      <td className="p-2 border-r border-black text-center text-sm font-black">{mediaFinalTecnico !== null ? mediaFinalTecnico : '—'}</td>
                      <td className="p-2 text-center text-xs font-black uppercase">{mediaFinalTecnico !== null ? converterNotaParaCertificadoExtenso(mediaFinalTecnico) : 'Sem notas lançadas'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Dados de Registo no Livro e Folha */}
          <div className="text-xs leading-relaxed text-justify space-y-2 pt-2">
            <p>
              Registado no Livro de Matrícula sob o n.º <strong>{alunoSelecionado.livroRegisto || '—'}</strong>, Processo n.º <strong>{alunoSelecionado.numeroProcesso || alunoSelecionado.codigoMatricula || '—'}</strong>, Folha n.º <strong>{alunoSelecionado.folhaRegisto || '—'}</strong>.
            </p>
            <p>
              {limparTextoSistema(configAtual?.textoFechamento) ||
                'Por ser verdade e ter sido requerido, mandou-se passar o presente Certificado que vai assinado e autenticado com o carimbo a óleo e selo branco em uso nesta Instituição de Ensino.'}
            </p>
            <p className="text-right pt-2 font-medium">
              {escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.
            </p>
          </div>

          {/* Conferência + QR Code + Apenas Assinatura do Director da Escola (Sem Secretário Geral) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs items-end border-t border-gray-300">
            <div className="flex flex-col items-start justify-end pb-2">
              <p className="font-bold text-gray-900">
                Conferido por: ___________________________
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              {exibirCodigoQrDoc && (
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'CERTIFICADO_CICLO',
                    escolaId: escola.id,
                    docRef: `CERT-${alunoSelecionado.codigoMatricula}`,
                    alunoId: alunoSelecionado.id,
                    alunoNome: alunoSelecionado.nomeCompleto,
                    turmaId: turmaDoAluno?.id,
                    anoLectivo: alunoSelecionado.anoLectivo || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                  })}
                  size={62}
                />
              )}
            </div>

            {exibirAssinDiretorDoc && (
              <div className="space-y-1 flex flex-col items-center justify-end text-center">
                <p className="font-bold text-gray-950 uppercase text-xs">{getTituloDiretor(escola)}</p>
                {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                  <div className="h-10 flex items-center justify-center -mb-1">
                    <img 
                      src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                      alt="Assinatura do Director" 
                      className="max-h-9 max-w-[140px] object-contain mix-blend-multiply" 
                    />
                  </div>
                ) : (
                  <div className="h-8" />
                )}
                <div className="w-48 border-b border-black mx-auto my-1.5" />
                <p className="font-bold text-gray-900 text-xs uppercase">{nomeDiretorGeral}</p>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 4. PASSES ESCOLARES (GRADE DE 8 PASSES POR FOLHA A4) */}
      {/* ========================================================================= */}
      {docType === 'passes' && (() => {
        const tituloDiretorPass = obterTituloDiretorGeral(escola, funcionariosEscola);
        const paginasPassesDoc: Aluno[][] = [];
        for (let i = 0; i < alunosDaTurma.length; i += 8) {
          paginasPassesDoc.push(alunosDaTurma.slice(i, i + 8));
        }
        const ordensUnicas =
          alunosDaTurma.every(a => Number(a.numeroOrdem) > 0) &&
          new Set(alunosDaTurma.map(a => Number(a.numeroOrdem))).size === alunosDaTurma.length;

        const formatarDocAluno = (al: Aluno) => {
          const tipo = al.tipoDocumento || 'BI';
          const num = (
            al.numeroDocumento ||
            (al.numeroBI && al.numeroBI !== '000000000LA000' ? al.numeroBI : '') ||
            ''
          ).trim();
          const rotulo =
            tipo === 'Cédula'
              ? 'Cédula Nº:'
              : tipo === 'Passaporte'
              ? 'Passaporte Nº:'
              : tipo === 'Cartão de Residente'
              ? 'Cartão Resid. Nº:'
              : tipo === 'Outro'
              ? 'Doc. Ident. Nº:'
              : 'B.I. Nº:';
          return { rotulo, numero: num || 'Não Registado' };
        };

        return (
          <div 
            id="documento-para-impressao" 
            data-doc-root="true" 
            data-passes-grid="true"
            className="documento-oficial-print space-y-4 max-w-5xl mx-auto"
          >
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 no-print flex items-center justify-between">
              <div>
                <strong>Passes Escolares Oficiais:</strong> Otimizados para impressão em papel cartão {formatoPaginaPdf === 'letter' ? 'Carta (Letter)' : 'A4'} (grade de 8 passes por página com margem inferior de segurança).
              </div>
              <span className="font-bold bg-blue-200 px-2 py-0.5 rounded text-[11px]">8 passes por folha {formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'}</span>
            </div>

            {paginasPassesDoc.map((grupoPagina, pageIndex) => (
              <div
                key={`doc-passes-page-${pageIndex}`}
                data-passes-page="true"
                className="passes-sheet-page pb-5 mb-4 print:pb-4 print:mb-0"
              >
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold mb-2 px-1 no-print">
                  <span>Folha {pageIndex + 1} de {paginasPassesDoc.length} (8 passes por folha)</span>
                  <span>Passes {pageIndex * 8 + 1} a {pageIndex * 8 + grupoPagina.length}</span>
                </div>
                <div className="passes-sheet-grid grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2.5">
                  {grupoPagina.map((aluno, idxInPage) => {
                    const turma = turmas.find(t => t.id === aluno.turmaId) || turmaSelecionada;
                    const classeExibida = turma?.classe || aluno.classeId || '—';
                    const numeroSequencial = ordensUnicas
                      ? Number(aluno.numeroOrdem)
                      : pageIndex * 8 + idxInPage + 1;
                    const docInfo = formatarDocAluno(aluno);
                    const clNorm = normalizarClasse(classeExibida);

                    return (
                      <div 
                        key={aluno.id}
                        className="bg-white border-2 border-blue-700 rounded-xl p-2.5 shadow-2xs relative flex flex-col justify-between h-[260px] min-h-[260px] print:h-[260px] print:min-h-[260px] print:break-inside-avoid print:border-black"
                      >
                        {/* Cabeçalho do Cartão: Província & Município PRIMEIRO, Nome da Escola DEPOIS */}
                        <div>
                          <div data-pdf-fixed-header="true" className="text-center border-b pb-1 border-blue-200 print:border-gray-400">
                            <div className="flex items-center justify-between px-1 gap-1.5">
                              <div className="h-7 w-7 flex items-center justify-center shrink-0">
                                {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                                  <img src={configSistema.insigniaNacionalUrl} alt="Insígnia da República de Angola" className="h-7 w-7 object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <InsigniaAngola size={24} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 px-1 text-center">
                                <p className="text-[7px] font-bold uppercase text-gray-600 truncate leading-tight">República de Angola • MED</p>
                                <p className="text-[7px] font-bold uppercase text-gray-600 truncate leading-tight">
                                  Província: {escola.provincia || 'Luanda'} • Município: {escola.municipio || 'Luanda'}
                                </p>
                                <p className="text-[8.5px] font-black uppercase text-blue-900 truncate print:text-black leading-tight mt-0.5">
                                  {escola.nomeOficial}
                                </p>
                              </div>
                              <div className="h-7 w-7 flex items-center justify-center shrink-0">
                                {(escola.logotipoUrl || escola.logotipo) ? (
                                  <img
                                    src={escola.logotipoUrl || escola.logotipo}
                                    alt="Logo Escola"
                                    className="h-7 w-7 object-contain rounded"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="w-6" />
                                )}
                              </div>
                            </div>
                            <span className="text-[7px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full inline-block mt-0.5">
                              Cartão de Estudante • {aluno.anoLectivo || aluno.anoMatricula || turma?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}
                            </span>
                          </div>

                          {/* Foto Ampliada (sem Nº 1 por baixo) & Dados Completos + QR Code limpo */}
                          <div data-pdf-fixed-student="true" className="flex items-center gap-2.5 mt-2">
                            {aluno.fotoUrl && aluno.fotoUrl.trim() !== '' ? (
                              <img 
                                src={aluno.fotoUrl} 
                                alt={aluno.nomeCompleto} 
                                className="h-[112px] w-[88px] rounded object-cover border-2 border-blue-900 print:border-black shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="h-[112px] w-[88px] rounded bg-gray-100 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-400 shrink-0">
                                <User className="w-8 h-8 mb-0.5" />
                                <span className="text-[8px] font-bold">FOTO 3x4</span>
                              </div>
                            )}

                            <div className="flex-1 min-w-0 text-[9px] leading-snug space-y-0.5">
                              <h4 className="font-black uppercase text-gray-950 truncate text-[9.5px]">{aluno.nomeCompleto}</h4>
                              <p className="text-gray-700">
                                Classe: <strong className="text-gray-950">{classeExibida}</strong> • <strong className="font-mono text-gray-950">Nº {numeroSequencial}</strong>
                              </p>
                              <p className="text-gray-700 truncate">
                                Turma: <strong className="text-gray-950">{turma?.nome || '—'}</strong> • Turno: <strong className="text-gray-950">{turma?.turno || 'Manhã'}</strong>
                              </p>
                              {isSegundoCiclo(clNorm) && (
                                <p className="text-gray-700 truncate text-[8.5px]">
                                  Curso: <strong className="text-gray-950">{aluno.curso || turma?.curso || 'Geral'}</strong>
                                </p>
                              )}
                              <p className="text-gray-800 font-mono truncate text-[8.5px]">
                                {docInfo.rotulo} <strong className="text-gray-950">{docInfo.numero}</strong>
                              </p>
                              <p className="text-gray-600 text-[8px] font-semibold">
                                Validade: 31/07/{(aluno.anoLectivo || aluno.anoMatricula || turma?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo || '').split('/')[1] || '—'}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center justify-center">
                              <OfficialQrCode
                                value={gerarPayloadQrEstudante(aluno, escola, turma)}
                                size={44}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rodapé do Cartão com Matrícula e Título + Nome Completo do Director Geral */}
                        <div className="pt-1 border-t border-gray-200 flex items-end justify-between gap-2 text-[8px]">
                          <div className="shrink-0">
                            <span className="text-[7px] text-gray-500 block">Nº Processo/Matr.:</span>
                            <strong className="font-mono text-gray-900">{aluno.numeroProcesso || aluno.codigoMatricula}</strong>
                          </div>

                          <div className="flex-1 flex flex-col items-center justify-end text-center min-w-0">
                            <span className="text-[6.5px] font-bold uppercase text-gray-800 leading-none mb-0.5 truncate max-w-full">
                              {tituloDiretorPass}
                            </span>
                            {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                              <img 
                                src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                                alt="Assinatura do Director" 
                                className="h-4 w-auto max-w-[75px] object-contain -mb-0.5" 
                              />
                            ) : (
                              <div className="h-2.5" />
                            )}
                            <div className="border-b border-gray-500 w-24 my-0.5" />
                            <span className="font-bold text-gray-950 text-[7px] leading-tight truncate max-w-full">
                              {nomeDiretorGeral}
                            </span>
                          </div>

                          <div className="font-mono text-[6.5px] text-gray-500 font-bold uppercase shrink-0">
                            MED ANGOLA
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. FICHA INDIVIDUAL DO ALUNO (REGISTO BIOGRÁFICO & MATRÍCULA)              */}
      {/* ========================================================================= */}
      {docType === 'ficha_individual_aluno' && (
        !alunoSelecionado ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhum Estudante Registado ou Selecionado</h3>
            <p className="text-sm text-gray-500 mt-1">
              Para visualizar a Ficha Individual, selecione ou registe um estudante.
            </p>
          </div>
        ) : (
        <div id="documento-para-impressao" data-doc-root="true" className="documento-oficial-print bg-white border-2 border-gray-900 p-6 md:p-10 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-6">
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="text-center space-y-1 border-b-2 border-black pb-3">
            <div className="flex justify-center mb-1">
              {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
              ) : (
                <InsigniaAngola size={56} />
              )}
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
            <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
            <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
            <h2 className="text-base font-black uppercase text-gray-950 pt-1">{escola.nomeOficial}</h2>
            <div className="pt-2">
              <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-blue-50">
                FICHA INDIVIDUAL DO ALUNO — ANO LECTIVO {alunoSelecionado.anoLectivo || alunoSelecionado.anoMatricula || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}
              </span>
            </div>
          </div>

          {/* Destaque Matrícula e Processo Fixo */}
          <div data-pdf-fixed-student="true" data-pdf-student-grid="3" className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono">
            <div>
              <span className="text-gray-500 block text-[10px] font-sans">N.º DE MATRÍCULA:</span>
              <strong className="text-sm font-black text-blue-900">{alunoSelecionado.codigoMatricula}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] font-sans">N.º DE PROCESSO:</span>
              <strong className="text-sm font-bold text-gray-900">{alunoSelecionado.numeroProcesso || alunoSelecionado.codigoMatricula}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] font-sans">ESTADO DE MATRÍCULA:</span>
              <strong className="text-sm font-bold text-emerald-800">{alunoSelecionado.estado}</strong>
            </div>
          </div>

          {/* Foto e Dados Pessoais Fixos */}
          <div data-pdf-fixed-student="true" data-pdf-student-row="true" className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
            {alunoSelecionado.fotoUrl && alunoSelecionado.fotoUrl.trim() !== '' ? (
              <img 
                src={alunoSelecionado.fotoUrl} 
                alt={alunoSelecionado.nomeCompleto} 
                className="h-28 w-24 rounded-lg object-cover border-2 border-black shrink-0 mx-auto sm:mx-0"
              />
            ) : (
              <div className="h-28 w-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-400 shrink-0 mx-auto sm:mx-0">
                <User className="w-8 h-8 mb-1" />
                <span className="text-[8px] font-bold">FOTO 3x4</span>
              </div>
            )}
            <div data-pdf-student-grid="2" className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
              <div><span className="text-gray-600">Nome Completo:</span> <strong className="uppercase">{alunoSelecionado.nomeCompleto}</strong></div>
              <div><span className="text-gray-600">Gênero:</span> <strong>{alunoSelecionado.genero === 'M' ? 'Masculino' : 'Feminino'}</strong></div>
              <div><span className="text-gray-600">Documento de Identificação:</span> <strong className="font-mono">{alunoSelecionado.tipoDocumento || 'BI'} nº {alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—'}</strong></div>
              <div><span className="text-gray-600">Data de Nascimento:</span> <strong>{formatarDataAngolana(alunoSelecionado.dataNascimento, 'curto')}</strong></div>
              <div><span className="text-gray-600">Naturalidade:</span> <strong>{alunoSelecionado.naturalidade || '—'}</strong></div>
              <div><span className="text-gray-600">Província de Origem:</span> <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong></div>
              <div className="sm:col-span-2"><span className="text-gray-600">Residência / Bairro:</span> <strong>{alunoSelecionado.endereco || '—'}</strong></div>
            </div>
          </div>

          {/* Filiação & Encarregado */}
          <div data-pdf-fixed-student="true" className="border-b border-black pb-4 text-xs space-y-1">
            <h4 className="font-black uppercase text-[11px] text-gray-800">Filiação & Encarregado de Educação</h4>
            <div data-pdf-student-grid="2" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><span className="text-gray-600">Nome do Pai:</span> <strong>{alunoSelecionado.nomePai || '—'}</strong></div>
              <div><span className="text-gray-600">Nome da Mãe:</span> <strong>{alunoSelecionado.nomeMae || '—'}</strong></div>
              <div><span className="text-gray-600">Encarregado de Educação:</span> <strong>{alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome || '—'}</strong></div>
              <div><span className="text-gray-600">Contacto do Encarregado:</span> <strong className="font-mono">{alunoSelecionado.telefoneEncarregado || alunoSelecionado.telefone || '—'}</strong></div>
            </div>
          </div>

          {/* Dados Académicos */}
          <div data-pdf-fixed-student="true" className="border-b border-black pb-4 text-xs space-y-1">
            <h4 className="font-black uppercase text-[11px] text-gray-800">Enquadramento Pedagógico</h4>
            <div data-pdf-student-grid="4" className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded">
              <div><span className="text-gray-600 block">Classe:</span><strong>{classeAlunoDoc || '—'}</strong></div>
              <div><span className="text-gray-600 block">Turma:</span><strong>{turmaDoAluno?.nome || '—'}</strong></div>
              <div><span className="text-gray-600 block">Turno:</span><strong>{turmaDoAluno?.turno || '—'}</strong></div>
              <div><span className="text-gray-600 block">Sala:</span><strong>{turmaDoAluno?.sala || '—'}</strong></div>
              {ehSegundoCicloAlunoDoc && cursoAlunoDoc && (
                <div className="col-span-2 sm:col-span-4 pt-1"><span className="text-gray-600">Curso:</span> <strong>{cursoAlunoDoc}</strong></div>
              )}
            </div>
          </div>

          {/* Registo de Ocorrências e Acontecimentos no Dossiê Escolar */}
          {alunoSelecionado.ocorrencias && alunoSelecionado.ocorrencias.length > 0 && (
            <div className="border-b border-black pb-4 text-xs space-y-2">
              <h4 className="font-black uppercase text-[11px] text-gray-800">Registo Oficial de Ocorrências no Dossiê do Aluno</h4>
              <div className="space-y-1.5">
                {alunoSelecionado.ocorrencias.map((ocorr, oIdx) => (
                  <div key={ocorr.id || oIdx} className="bg-gray-50 border border-gray-300 p-2.5 rounded text-[11px] space-y-0.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-900">[{formatarDataAngolana(ocorr.data, 'curto')}] {ocorr.tipo} {ocorr.gravidade ? `(Gravidade: ${ocorr.gravidade})` : ''}</span>
                      <span className="text-gray-600 font-normal">Averbado por: {ocorr.registadoPor} ({ocorr.cargo})</span>
                    </div>
                    <p className="text-gray-800">{ocorr.descricao}</p>
                    {ocorr.resolucao && (
                      <p className="text-gray-600 italic"><strong>Resolução / Medida Adotada:</strong> {ocorr.resolucao}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinaturas Limpas e Oficiais */}
          <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-6">
              <p className="text-gray-700 font-bold">O(A) Encarregado(a) de Educação</p>
              <div className="border-b border-black w-40 mx-auto" />
              <p className="font-semibold text-gray-800 text-[11px]">{alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome || 'Encarregado de Educação'}</p>
            </div>
            <div className="space-y-6">
              <p className="text-gray-700 font-bold">{getTituloChefeSecretaria(escola)}</p>
              <div className="border-b border-black w-40 mx-auto" />
              <p className="font-semibold text-gray-800 text-[11px]">{chefeSecretariaNome}</p>
            </div>
            <div className="space-y-6">
              <p className="text-gray-700 font-bold">{getTituloDiretor(escola)}</p>
              <div className="border-b border-black w-40 mx-auto" />
              <p className="font-semibold text-gray-800 text-[11px]">{nomeDiretorGeral}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 text-[9px] text-gray-600">
            <div className="text-left">
              <p className="font-bold uppercase text-gray-800">Identificação Digital do Estudante</p>
              <p>Código QR oficial para validação de matrícula e assiduidade.</p>
            </div>
            <OfficialQrCode
              value={gerarPayloadQrEstudante(alunoSelecionado, escola, turmaDoAluno)}
              size={52}
              label="Validar Ficha"
            />
          </div>
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 5. FICHA INDIVIDUAL DO FUNCIONÁRIO (CADASTRO BIOGRÁFICO & LABORAL COMPLETO) */}
      {/* ========================================================================= */}
      {docType === 'ficha_individual_funcionario' && (
        <div className="space-y-4">
          {/* Seletor de Funcionário no modo ecrã */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between no-print text-xs">
            <div>
              <span className="font-bold text-indigo-950 block">Selecionar Funcionário para Emissão de Ficha:</span>
              <span className="text-indigo-700">Visualize e imprima o dossier profissional completo com todos os dados civis e laborais.</span>
            </div>
            <select
              value={selectedFuncionarioId}
              onChange={(e) => setSelectedFuncionarioId(e.target.value)}
              className="p-2 border border-indigo-300 rounded-lg bg-white font-bold text-xs"
            >
              {funcionariosLista.map(f => (
                <option key={f.id} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
              ))}
            </select>
          </div>

          {funcionarioSelecionado ? (
            <div id="documento-para-impressao" data-doc-root="true" className="documento-oficial-print bg-white border-2 border-gray-900 p-6 md:p-10 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-5">
              <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="text-center space-y-1 border-b-2 border-black pb-3">
                <div className="flex justify-center mb-1">
                  {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                    <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
                  ) : (
                    <InsigniaAngola size={56} />
                  )}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
                <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
                <h2 className="text-base font-black uppercase text-gray-950 pt-1">{escola.nomeOficial}</h2>
                <div className="pt-2">
                  <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-indigo-50">
                    FICHA INDIVIDUAL DE CADASTRO DO FUNCIONÁRIO E DOCENTE
                  </span>
                </div>
              </div>

              {/* Foto e Identificação Fixa */}
              <div data-pdf-fixed-student="true" data-pdf-student-row="true" className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
                {funcionarioSelecionado.fotoUrl && funcionarioSelecionado.fotoUrl.trim() !== '' ? (
                  <img 
                    src={funcionarioSelecionado.fotoUrl} 
                    alt={funcionarioSelecionado.nomeCompleto} 
                    className="h-28 w-24 rounded-lg object-cover border-2 border-black shrink-0 mx-auto sm:mx-0"
                  />
                ) : (
                  <div className="h-28 w-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-400 shrink-0 mx-auto sm:mx-0">
                    <User className="w-8 h-8 mb-1" />
                    <span className="text-[8px] font-bold">FOTO 3x4</span>
                  </div>
                )}
                <div data-pdf-student-grid="2" className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
                  <div><span className="text-gray-600">Nome Completo:</span> <strong className="uppercase">{funcionarioSelecionado.nomeCompleto}</strong></div>
                  <div><span className="text-gray-600">N.º do Bilhete de Identidade:</span> <strong className="font-mono">{funcionarioSelecionado.numeroBI || '—'}</strong></div>
                  <div><span className="text-gray-600">Gênero:</span> <strong>{funcionarioSelecionado.genero === 'M' ? 'Masculino' : 'Feminino'}</strong></div>
                  <div><span className="text-gray-600">Estado Civil:</span> <strong>{funcionarioSelecionado.estadoCivil || '—'}</strong></div>
                  <div><span className="text-gray-600">Nacionalidade:</span> <strong>{funcionarioSelecionado.nacionalidade || 'Angolana'}</strong></div>
                  <div><span className="text-gray-600">Naturalidade:</span> <strong>{funcionarioSelecionado.naturalidadeMunicipio || (funcionarioSelecionado as any).naturalidade || '—'}</strong></div>
                  <div><span className="text-gray-600">Telefone Principal:</span> <strong className="font-mono">{funcionarioSelecionado.telefone || '—'}</strong></div>
                  <div><span className="text-gray-600">Correio Electrónico:</span> <strong>{funcionarioSelecionado.email || '—'}</strong></div>
                </div>
              </div>

              {/* Dados Académicos e Carreira */}
              <div className="border-b border-black pb-4 text-xs space-y-1.5">
                <h4 className="font-black uppercase text-[11px] text-gray-800">Habilitações & Carreira Ministerial (MED)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
                  <div><span className="text-gray-600">Grau Académico:</span> <strong>{funcionarioSelecionado.grauAcademico || '—'}</strong></div>
                  <div><span className="text-gray-600">Especialidade / Curso:</span> <strong>{funcionarioSelecionado.especialidade || funcionarioSelecionado.habilitacoes || '—'}</strong></div>
                  <div><span className="text-gray-600">Categoria Profissional:</span> <strong>{funcionarioSelecionado.categoriaProfissional || '—'}</strong></div>
                  <div><span className="text-gray-600">Cargo / Função Atual:</span> <strong>{funcionarioSelecionado.cargo || '—'}</strong></div>
                  <div><span className="text-gray-600">Perfil / Categoria Funcional:</span> <strong className="text-blue-900">{funcionarioSelecionado.role}</strong></div>
                  <div><span className="text-gray-600">N.º Mecanográfico / Agente:</span> <strong className="font-mono">{funcionarioSelecionado.numeroAgente || (funcionarioSelecionado as any).numeroMecanografico || '—'}</strong></div>
                  <div><span className="text-gray-600">Tipo de Contrato:</span> <strong>{funcionarioSelecionado.tipoContrato || '—'}</strong></div>
                  <div><span className="text-gray-600">Situação Funcional:</span> <strong className="text-emerald-800">{funcionarioSelecionado.situacaoFuncional || 'Ativo no Efetivo'}</strong></div>
                  <div><span className="text-gray-600">Data de Admissão:</span> <strong>{formatarDataAngolana(funcionarioSelecionado.dataAdmissao, 'curto')}</strong></div>
                  <div><span className="text-gray-600">Carga Horária Semanal:</span> <strong>{funcionarioSelecionado.cargaHorariaSemanal ? `${funcionarioSelecionado.cargaHorariaSemanal} horas/semana` : '—'}</strong></div>
                </div>
              </div>

              {/* Dados Bancários e Segurança Social */}
              <div className="border-b border-black pb-4 text-xs space-y-1.5">
                <h4 className="font-black uppercase text-[11px] text-gray-800">Dados Bancários & Segurança Social (INSS)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div><span className="text-gray-600 block">Instituição Bancária:</span><strong>{funcionarioSelecionado.banco || '—'}</strong></div>
                  <div className="sm:col-span-2"><span className="text-gray-600 block">IBAN Bancário:</span><strong className="font-mono">{funcionarioSelecionado.iban || '—'}</strong></div>
                  <div><span className="text-gray-600 block">N.º de Segurança Social (INSS):</span><strong className="font-mono">{funcionarioSelecionado.numeroSegurancaSocial || '—'}</strong></div>
                </div>
              </div>

              {/* Assinaturas Oficiais: Título -> Traço -> Nome */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs items-end">
                <div className="space-y-1">
                  <p className="text-gray-900 font-bold uppercase text-[11px]">O(A) Funcionário(a)</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-semibold text-gray-800 text-[11px] uppercase">{funcionarioSelecionado.nomeCompleto}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-900 font-bold uppercase text-[11px]">{getTituloChefeSecretaria(escola)}</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-semibold text-gray-800 text-[11px] uppercase">{chefeSecretariaNome}</p>
                </div>
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="text-gray-900 font-bold uppercase text-[11px]">{getTituloDiretor(escola)}</p>
                  {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                    <div className="h-9 flex items-center justify-center -mb-1">
                      <img
                        src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl}
                        alt="Assinatura do Director"
                        className="max-h-8 max-w-[120px] object-contain mix-blend-multiply"
                      />
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-semibold text-gray-800 text-[11px] uppercase">{nomeDiretorGeral}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 text-[9px] text-gray-600">
                <div className="text-left">
                  <p className="font-bold uppercase text-gray-800">Autenticação de Registo Profissional</p>
                  <p>Ficha individual oficial emitida pelos Serviços Administrativos e Recursos Humanos.</p>
                </div>
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'FICHA_FUNCIONARIO',
                    escolaId: escola.id,
                    docRef: funcionarioSelecionado.numeroBI || funcionarioSelecionado.id,
                    anoLectivo: escola.anoLectivoActivo
                  })}
                  size={50}
                  label="Validar Ficha"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">Nenhum Funcionário Registado ou Selecionado</h3>
              <p className="text-sm text-gray-500 mt-1">
                Para visualizar a Ficha Profissional, registe professores ou membros da equipa no módulo de Recursos Humanos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. FICHA DE PRESENÇAS POR PERÍODO (INÍCIO E FIM)                           */}
      {/* ========================================================================= */}
      {docType === 'ficha_presencas' && (
        <div className="space-y-4">
          {/* Seletor de Período e Turma no ecrã */}
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3 no-print text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-emerald-950 block">Seleção do Período de Presenças:</span>
                <span className="text-emerald-800">Escolha a data de início e a data de fim para emissão da folha de ponto.</span>
              </div>
              <div className="flex items-center space-x-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block">Data de Início</label>
                  <input
                    type="date"
                    value={dataInicioPresencas}
                    onChange={(e) => setDataInicioPresencas(e.target.value)}
                    className="p-1.5 border border-emerald-400 rounded bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block">Data de Fim</label>
                  <input
                    type="date"
                    value={dataFimPresencas}
                    onChange={(e) => setDataFimPresencas(e.target.value)}
                    className="p-1.5 border border-emerald-400 rounded bg-white font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div id="documento-para-impressao" data-doc-root="true" className="documento-oficial-print bg-white border-2 border-gray-900 p-6 md:p-10 rounded-xl shadow-md max-w-5xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-5">
            <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="text-center space-y-1 border-b-2 border-black pb-3">
              <div className="flex justify-center mb-1">
                {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                  <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
                ) : (
                  <InsigniaAngola size={56} />
                )}
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
              <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
              <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
              <h2 className="text-base font-black uppercase text-gray-950 pt-1">{escola.nomeOficial}</h2>
              <div className="pt-2">
                <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-emerald-50">
                  FOLHA OFICIAL DE PRESENÇAS E ASSIDUIDADE — PERÍODO DE {formatarDataAngolana(dataInicioPresencas, 'curto')} A {formatarDataAngolana(dataFimPresencas, 'curto')}
                </span>
              </div>
            </div>

            <div data-pdf-fixed-student="true" className="flex justify-between items-center text-xs font-bold bg-gray-50 p-2.5 rounded border border-gray-300">
              <div>Turma: <span className="text-blue-900 font-extrabold">{turmaSelecionada?.nome || '—'}</span> ({turmaSelecionada?.classe || '—'})</div>
              <div>Turno: <span>{turmaSelecionada?.turno || '—'}</span> • Sala: <span>{turmaSelecionada?.sala || '—'}</span></div>
              <div>Ano Lectivo: <span>{turmaSelecionada?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}</span></div>
            </div>

            {/* Tabela de Presenças Reais */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-[10px] border border-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="p-1 border-r border-black w-8 text-center">Nº</th>
                    <th className="p-1 border-r border-black w-24 text-center">Matrícula</th>
                    <th className="p-1 border-r border-black text-left">Nome Completo do Aluno</th>
                    <th className="p-1 border-r border-black w-14 text-center">Presenças</th>
                    <th className="p-1 border-r border-black w-14 text-center">F. Just.</th>
                    <th className="p-1 border-r border-black w-14 text-center">F. Injust.</th>
                    <th className="p-1 border-r border-black w-16 text-center">% Assid.</th>
                    <th className="p-1 text-center">Rubrica</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosDaTurma.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                        Nenhum estudante matriculado nesta turma.
                      </td>
                    </tr>
                  ) : (
                    alunosDaTurma.map((aluno, idx) => {
                      const regsAluno = presencasTurmaPeriodo.filter(p => p.alunoId === aluno.id);
                      const qtdP = regsAluno.filter(p => p.estado === 'Presente').length;
                      const qtdFJ = regsAluno.filter(p => p.estado === 'Falta_Justificada').length;
                      const qtdFI = regsAluno.filter(p => p.estado === 'Falta_Injustificada').length;
                      const totalRegs = qtdP + qtdFJ + qtdFI;
                      const perc = totalRegs > 0 ? `${Math.round((qtdP / totalRegs) * 100)}%` : '—';
                      return (
                        <tr key={aluno.id} className="border-b border-gray-300">
                          <td className="p-1 border-r border-gray-300 text-center font-bold">{idx + 1}</td>
                          <td className="p-1 border-r border-gray-300 font-mono text-center">{aluno.codigoMatricula}</td>
                          <td className="p-1 border-r border-gray-300 font-bold uppercase">{aluno.nomeCompleto}</td>
                          <td className="p-1 border-r border-gray-300 text-center font-bold text-emerald-800">{totalRegs > 0 ? qtdP : '—'}</td>
                          <td className="p-1 border-r border-gray-300 text-center">{totalRegs > 0 ? qtdFJ : '—'}</td>
                          <td className="p-1 border-r border-gray-300 text-center text-red-700">{totalRegs > 0 ? qtdFI : '—'}</td>
                          <td className="p-1 border-r border-gray-300 text-center font-bold">{perc}</td>
                          <td className="p-1 text-center font-serif italic text-gray-400">Visto</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Assinaturas Oficiais com Coordenador, Subdirector e Director Geral */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs items-end">
              <div className="space-y-1">
                <p className="font-bold text-gray-900">{obterTituloCoordenadorTurma(turmaSelecionada, funcionariosEscola)}</p>
                <div className="h-6" />
                <div className="border-b border-black w-44 mx-auto" />
                <p className="font-semibold text-gray-800 text-[11px]">{obterNomeCoordenadorTurma(turmaSelecionada, funcionariosEscola)}</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-gray-900">{getTituloSubPedagogico(escola)}</p>
                <div className="h-6" />
                <div className="border-b border-black w-44 mx-auto" />
                <p className="font-semibold text-gray-800 text-[11px]">{subdirectorPedagogicoNome}</p>
              </div>
              <div className="space-y-1 flex flex-col items-center justify-end">
                <p className="font-bold text-gray-900">{getTituloDiretor(escola)}</p>
                {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                  <div className="h-9 flex items-center justify-center -mb-1">
                    <img
                      src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl}
                      alt="Assinatura do Director"
                      className="max-h-8 max-w-[120px] object-contain mix-blend-multiply"
                    />
                  </div>
                ) : (
                  <div className="h-6" />
                )}
                <div className="border-b border-black w-44 mx-auto" />
                <p className="font-semibold text-gray-800 text-[11px]">{nomeDiretorGeral}</p>
              </div>
            </div>

            {exibirCodigoQrDoc && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 text-[9px] text-gray-600">
                <div className="text-left">
                  <p className="font-bold uppercase text-gray-800">Autenticação da Folha de Presenças</p>
                  <p>Período: {formatarDataAngolana(dataInicioPresencas, 'curto')} a {formatarDataAngolana(dataFimPresencas, 'curto')} • {turmaSelecionada?.nome || 'Turma'}.</p>
                </div>
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'FICHA_PRESENCAS',
                    escolaId: escola.id,
                    docRef: `${turmaSelecionada?.id || 'turma'}-${dataInicioPresencas}-${dataFimPresencas}`,
                    turmaId: turmaSelecionada?.id,
                    anoLectivo: turmaSelecionada?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                  })}
                  size={50}
                  label="Validar Folha"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RECIBOS TÉRMICOS (POS 58MM / 80MM)                                     */}
      {/* ========================================================================= */}
      {docType === 'recibos' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-700 max-w-md w-full no-print space-y-2">
            <div>
              <strong>Impressão Térmica POS:</strong> Compatível com impressoras térmicas portáteis de 58mm ou 80mm para recibos reais de propinas e emolumentos.
            </div>
            {recibosReaisDoAluno.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600 block mb-1">
                  Recibo Registado do Estudante ({recibosReaisDoAluno.length}):
                </label>
                <select
                  value={reciboAtivoAluno?.id || ''}
                  onChange={(e) => setSelectedReciboId(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded bg-white text-xs font-bold text-gray-900"
                >
                  {recibosReaisDoAluno.map(rec => (
                    <option key={rec.id} value={rec.id}>
                      {rec.numeroRecibo} • {rec.descricao} • {rec.valorTotalKz.toLocaleString('pt-AO')} Kz ({formatarDataAngolana(rec.dataHora, 'curto')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!alunoSelecionado || !reciboAtivoAluno ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500 max-w-md w-full">
              <Receipt className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">Nenhum Pagamento Registado</h3>
              <p className="text-xs text-gray-500 mt-1">
                {alunoSelecionado
                  ? `O estudante ${alunoSelecionado.nomeCompleto} não possui recibos ou transações financeiras lançadas na tesouraria.`
                  : 'Selecione um estudante com pagamento registado para emitir o recibo.'}
              </p>
            </div>
          ) : (
            <div 
              id="documento-para-impressao"
              data-doc-root="true"
              className={`documento-oficial-print bg-white border border-gray-400 p-4 shadow-md font-mono text-[11px] leading-tight text-gray-950 space-y-3 ${
                larguraTermica === '58mm' ? 'w-[280px]' : 'w-[360px]'
              }`}
            >
              <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                {exibirInsigniaDoc && (
                  <div className="flex justify-center mb-1">
                    {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                      <img 
                        src={configSistema.insigniaNacionalUrl} 
                        alt="Insígnia" 
                        className="h-8 w-8 object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <InsigniaAngola size={28} />
                    )}
                  </div>
                )}
                <p className="font-bold uppercase text-[10px]">{escola.nomeOficial}</p>
                <p className="text-[9px] text-gray-600">NIF: {escola.nif || '—'}</p>
                <p className="text-[9px] text-gray-600">{escola.municipio}, {escola.provincia} - Angola</p>
                <p className="font-bold text-[10px] mt-1">{limparTextoSistema(configAtual?.tituloOficial) || 'COMPROVATIVO DE PAGAMENTO'}</p>
              </div>

              <div data-pdf-fixed-student="true" className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Data:</span>
                  <span>{formatarDataHoraAngolana(reciboAtivoAluno.dataHora)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recibo Nº:</span>
                  <span className="font-bold">{reciboAtivoAluno.numeroRecibo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aluno:</span>
                  <span className="font-bold truncate max-w-[160px]">{alunoSelecionado.nomeCompleto}</span>
                </div>
                <div className="flex justify-between">
                  <span>Matrícula:</span>
                  <span>{alunoSelecionado.codigoMatricula}</span>
                </div>
                {reciboAtivoAluno.operadorNome && (
                  <div className="flex justify-between">
                    <span>Operador:</span>
                    <span className="truncate max-w-[160px]">{reciboAtivoAluno.operadorNome}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-1 space-y-1 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>DESCRIÇÃO</span>
                  <span>VALOR</span>
                </div>
                <div className="flex justify-between">
                  <span className="pr-2">{reciboAtivoAluno.descricao}</span>
                  <span className="shrink-0">{reciboAtivoAluno.valorKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
                </div>
                {Boolean(reciboAtivoAluno.multaKz && reciboAtivoAluno.multaKz > 0) && (
                  <div className="flex justify-between text-gray-600 text-[9px]">
                    <span>Acréscimo / Multa</span>
                    <span>{reciboAtivoAluno.multaKz!.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between font-extrabold text-sm">
                  <span>TOTAL PAGO:</span>
                  <span>{reciboAtivoAluno.valorTotalKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>Forma de Pagamento:</span>
                  <span>{reciboAtivoAluno.metodoPagamento}</span>
                </div>
                {reciboAtivoAluno.numeroComprovativo && (
                  <div className="flex justify-between text-[9px] text-gray-600">
                    <span>Ref. Comprovativo:</span>
                    <span>{reciboAtivoAluno.numeroComprovativo}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 border-t border-dashed border-gray-400 space-y-1.5 text-[9px]">
                <p className="font-bold">OBRIGADO PELA PREFERÊNCIA</p>
                <p className="text-[8px] text-gray-500">Documento Oficial de Tesouraria Escolar</p>
                {exibirCodigoQrDoc && (
                  <div className="flex justify-center pt-1">
                    <OfficialQrCode
                      value={gerarPayloadQrDocumento({
                        docType: 'RECIBO_TESOURARIA',
                        escolaId: escola.id,
                        docRef: reciboAtivoAluno.numeroRecibo,
                        alunoId: alunoSelecionado.id,
                        alunoNome: alunoSelecionado.nomeCompleto,
                        turmaId: turmaDoAluno?.id,
                        anoLectivo: escola.anoLectivoActivo
                      })}
                      size={52}
                      label="Validar Recibo"
                    />
                  </div>
                )}
                <p className="pt-1">--------------------------------</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TERMOS DE EXAME & DELIBERAÇÃO OFICIAL DO JÚRI                          */}
      {/* ========================================================================= */}
      {docType === 'termos_exame' && (
        !turmaSelecionada ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhuma Turma Selecionada</h3>
            <p className="text-sm text-gray-500 mt-1">
              Selecione uma turma para visualizar o Termo de Exame e Deliberação do Júri.
            </p>
          </div>
        ) : (
        <div className="flex justify-center">
          <div 
            id="documento-para-impressao"
            data-doc-root="true"
            className={`documento-oficial-print bg-white border border-gray-400 p-8 shadow-lg max-w-[950px] w-full text-black space-y-5 print:border-none print:shadow-none print:p-0 print:max-w-none ${fontScaleClassDoc}`}
          >
            {/* Topo Oficial com Brasão Oficial da República de Angola Fixo */}
            <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="relative text-center space-y-1">
              {exibirLogoEscolaDoc && (
                <div data-pdf-corner-right="true" className="absolute right-0 top-0 z-10">
                  <img
                    src={escola.logotipoUrl || escola.logotipo}
                    alt={`Logotipo ${escola.nomeOficial}`}
                    className="h-14 w-14 object-contain rounded-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              {exibirInsigniaDoc && (
                <div className="flex justify-center mb-1">
                  {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                    <img 
                      src={configSistema.insigniaNacionalUrl} 
                      alt="Insígnia" 
                      className="h-16 w-16 object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <InsigniaAngola size={56} />
                  )}
                </div>
              )}
              {cabecalhoLinhasDoc ? (
                cabecalhoLinhasDoc.map((linha, idx) => (
                  <p key={idx} className={idx === 0 ? 'font-serif font-black text-xs uppercase tracking-widest text-gray-800' : 'font-serif font-bold text-xs uppercase text-gray-700'}>
                    {linha}
                  </p>
                ))
              ) : (
                <>
                  <p className="font-serif font-black text-xs uppercase tracking-widest text-gray-800">
                    REPÚBLICA DE ANGOLA
                  </p>
                  <p className="font-serif font-bold text-xs uppercase text-gray-700">
                    {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${(escola.provincia || 'LUANDA').toUpperCase()}`} • {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                  </p>
                </>
              )}
              <h3 className="font-serif font-black text-base uppercase mt-1 print:text-black" style={{ color: corDestaqueDoc }}>
                {escola.nomeOficial}
              </h3>
              <p className="text-[11px] text-gray-600 font-serif italic">
                Ensino Primário, Iº e IIº Ciclos do Ensino Secundário
              </p>
              <div className="pt-2">
                <span className="font-bold text-sm tracking-wider uppercase bg-gray-100 px-4 py-1 rounded border border-gray-300 inline-block">
                  {limparTextoSistema(configAtual?.tituloOficial) || 'TERMO DE EXAME & DELIBERAÇÃO FINAL DO JÚRI'}
                </span>
              </div>
            </div>

            {/* Metadados Oficiais Fixos */}
            <div data-pdf-fixed-student="true" data-pdf-student-grid="4" className="bg-gray-50 border border-black p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 font-medium">
              <div>
                <span className="text-gray-600 block text-[10px]">
                  {isSegundoCiclo(turmaSelecionada.classe) ? 'Classe / Curso:' : 'Classe:'}
                </span>
                <strong className="text-gray-900">
                  {turmaSelecionada.classe}
                  {isSegundoCiclo(turmaSelecionada.classe) && turmaSelecionada.curso ? ` • ${turmaSelecionada.curso}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-gray-600 block text-[10px]">Turma / Turno:</span>
                <strong className="text-gray-900">{turmaSelecionada.nome} • {turmaSelecionada.turno}</strong>
              </div>
              <div>
                <span className="text-gray-600 block text-[10px]">Ano Lectivo:</span>
                <strong className="text-gray-900">{turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}</strong>
              </div>
              <div>
                <span className="text-gray-600 block text-[10px]">Data do Termo:</span>
                <strong className="text-gray-900">{hojeAngolano('curto')}</strong>
              </div>
            </div>

            {/* Tabela de Discentes */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-black">
                <thead className="bg-gray-100 font-bold border-b border-black text-center">
                  <tr>
                    <th className="p-1.5 border-r border-black w-8">Nº</th>
                    <th className="p-1.5 border-r border-black w-24">Processo</th>
                    <th className="p-1.5 border-r border-black text-left">Nome Completo do Discente</th>
                    <th className="p-1.5 border-r border-black w-14">MFD</th>
                    <th className="p-1.5 border-r border-black w-14">Exame</th>
                    <th className="p-1.5 border-r border-black w-14">Recurso</th>
                    <th className="p-1.5 border-r border-black w-14 bg-gray-200">M. Final</th>
                    <th className="p-1.5 border-r border-black w-24">Resultado</th>
                    <th className="p-1.5 w-20">Rubrica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-center">
                  {(() => {
                    const escalaAprovTermo = obterInformacaoEscala(turmaSelecionada.classe, turmaSelecionada.nivelEnsino).notaAprovacao;
                    return alunosDaTurma.map((aluno, idx) => {
                      const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id && (n.turmaId === turmaSelecionada.id || !n.turmaId));
                      const medias = notasAluno.map(n => n.mediaTrimestral || n.notaFinal || 0).filter(v => v > 0);
                      const mfd = medias.length > 0 ? (medias.reduce((a, b) => a + b, 0) / medias.length) : null;
                      const notaExame = notasAluno.find(n => n.provaTrimestral && n.provaTrimestral > 0)?.provaTrimestral || null;
                      const notaRecurso = (notasAluno.find(n => (n as any).notaRecurso && (n as any).notaRecurso > 0) as any)?.notaRecurso || null;
                      const notaFinal = notaRecurso !== null ? Math.max(notaRecurso, mfd || 0) : notaExame !== null && mfd !== null ? Math.round((mfd * 0.4 + notaExame * 0.6) * 10) / 10 : (mfd !== null ? Math.round(mfd * 10) / 10 : null);
                      const aprovado = notaFinal !== null && notaFinal >= escalaAprovTermo;

                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50">
                          <td className="p-1.5 border-r border-black font-bold">{idx + 1}</td>
                          <td className="p-1.5 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                          <td className="p-1.5 border-r border-black text-left font-bold uppercase truncate max-w-[220px]">{aluno.nomeCompleto}</td>
                          <td className="p-1.5 border-r border-black font-mono">{mfd !== null ? mfd.toFixed(1) : '—'}</td>
                          <td className="p-1.5 border-r border-black font-mono">{notaExame !== null ? notaExame.toFixed(1) : '—'}</td>
                          <td className="p-1.5 border-r border-black font-mono">{notaRecurso !== null ? notaRecurso.toFixed(1) : '—'}</td>
                          <td className="p-1.5 border-r border-black font-mono font-black bg-gray-50">{notaFinal !== null ? notaFinal.toFixed(1) : '—'}</td>
                          <td className="p-1.5 border-r border-black font-bold text-[10px]">
                            {notaFinal !== null ? (
                              <span className={aprovado ? 'text-emerald-800' : 'text-red-700'}>
                                {aprovado ? 'Aprovado' : 'Não Aprovado'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-1.5 font-serif italic text-gray-400 text-[10px]">Rubrica</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Termo e Assinaturas: Título -> Traço -> Nome */}
            <div className="pt-4 space-y-4 text-xs font-serif">
              <p className="leading-relaxed text-justify">
                Em {hojeAngolano('extenso')}, reuniu-se a Comissão de Júri devidamente credenciada para deliberação final das provas de exame e recurso dos discentes acima identificados. Nada mais havendo a constar, lavrou-se o presente Termo oficial que vai assinado pela comissão e homologado pela Direcção da Escola.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 items-end">
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold">O Presidente do Júri</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px]">{obterPresidenteJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold">O 1º Vogal do Júri</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px]">{obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola).primeiroVogal}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold">O 2º Vogal do Júri</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px]">{obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola).segundoVogal}</p>
                </div>
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold">{tituloDiretorGeral} (Homologação)</p>
                  {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                    <div className="h-9 flex items-center justify-center -mb-1">
                      <img
                        src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl}
                        alt="Assinatura do Director"
                        className="max-h-8 max-w-[120px] object-contain mix-blend-multiply"
                      />
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                  <div className="border-b border-black w-40 mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px]">{nomeDiretorGeral}</p>
                </div>
              </div>

              {exibirCodigoQrDoc && (
                <div className="mt-4 pt-3 border-t border-gray-300 flex items-center justify-between gap-4 text-[9px] text-gray-600 font-sans">
                  <div className="text-left">
                    <p className="font-bold uppercase text-gray-800">Autenticação Oficial do Termo de Exame</p>
                    <p>Verifique a validade deste documento oficial digitalizando o código QR.</p>
                  </div>
                  <OfficialQrCode
                    value={gerarPayloadQrDocumento({
                      docType: 'TERMO_EXAME',
                      escolaId: escola.id,
                      docRef: `TERMO-${turmaSelecionada.id}`,
                      turmaId: turmaSelecionada.id,
                      anoLectivo: turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                    })}
                    size={54}
                    label="Validar Termo"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        )
      )}

      {docType === 'lista_nominal' && (
        <StudentClassListPdfDocument
          escola={escola}
          turma={selectedTurmaId !== 'TODAS' ? turmaSelecionada : undefined}
          alunos={alunosListaNominal}
          turmasDisponiveis={turmasDoAnoDocumento}
          todosAlunos={alunosPermitidos}
          selectedAnoLectivo={selectedAnoLectivo}
          initialClasse={selectedClasse}
          initialCurso={selectedCurso}
          initialTurmaId={selectedTurmaId || 'TODAS'}
          onFilterChange={({ classe, curso, turmaId }) => {
            setSelectedClasse(classe);
            setSelectedCurso(curso);
            setSelectedTurmaId(turmaId);
          }}
          pdfFormat={formatoPaginaPdf}
          pdfOrientation={orientacaoRecomendada}
          pdfMargins={margensPdfMm}
        />
      )}
        </div>
      </div>

      {/* Barra Flutuante de Ação Rápida para Telemóveis e Ecrãs Pequenos */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 bg-slate-950/95 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between no-print">
        <div className="flex items-center space-x-2 min-w-0">
          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <p className="text-[11px] font-black truncate">{nomeDocumentoCurto}</p>
            <p className="text-[9px] text-slate-400 truncate">Normas Oficiais MED Angola</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 cursor-pointer"
            title="Imprimir"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleBaixarPDF}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:bg-emerald-800"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
          </button>
        </div>
      </div>

      {/* MODAL: CARREGAR / EDITAR ASSINATURA DO DIRECTOR GERAL */}
      {showAssinaturaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <PenTool className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-gray-900">
                  Assinatura / Chancela do Director Geral
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssinaturaModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Esta assinatura digitalizada será exibida no <strong>VISTO dos Boletins Trimestrais</strong>, nos <strong>Passes de Estudante</strong>, e nas <strong>Declarações e Certificados</strong> oficiais emitidos pela escola.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Carregar Ficheiro de Assinatura (PNG transparente recomendado)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="h-6 w-6 text-gray-400 mb-1" />
                  <span className="text-xs text-blue-600 font-bold">Clique para escolher imagem</span>
                  <span className="text-[10px] text-gray-400">PNG, JPG ou SVG (fundo transparente)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const res = await processarFotoUpload(file, 360, 0.82);
                          if (res.dataUrl) {
                            setAssinaturaPreview(res.dataUrl);
                          }
                        } catch {
                          // fallback handled inside processarFotoUpload
                        }
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ou inserir URL directa da Imagem
                </label>
                <input
                  type="text"
                  value={assinaturaPreview}
                  onChange={(e) => setAssinaturaPreview(e.target.value)}
                  placeholder="https://exemplo.com/assinatura-diretor.png"
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Pré-visualização da Assinatura */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                  Pré-visualização Oficial
                </span>
                <div className="h-16 flex items-center justify-center bg-white border border-gray-200 rounded-lg p-2">
                  {Boolean(assinaturaPreview?.trim()) ? (
                    <img
                      src={assinaturaPreview}
                      alt="Assinatura Diretor"
                      className="max-h-14 object-contain mx-auto"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      Nenhuma assinatura carregada ainda
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-700 mt-1">
                  {nomeDiretorGeral}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAssinaturaModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarAssinatura}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Guardar Assinatura</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Dizeres e Disposição Oficial de Documentos */}
      {modalConfigDocOpen && (
        <DocumentTemplateConfigModal
          escola={escola}
          isOpen={modalConfigDocOpen}
          onClose={() => setModalConfigDocOpen(false)}
          initialDocType={docType === 'pautas' ? 'pauta_trimestral' : docType === 'certificado_ciclo' ? 'certificado' : docType === 'passes' ? 'cartao_estudante' : docType}
          onSaved={() => {
            recarregarConfiguracoes();
          }}
        />
      )}
    </div>
  );
};
