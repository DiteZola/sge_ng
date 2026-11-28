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
  TODAS_CLASSES_OFICIAIS_MED,
  getSalaDaTurma,
  getCursoDaTurma,
  filtrarDisciplinasDaClasse,
  ordenarDisciplinas,
  getDisciplinasMatrizOficial,
  resolverNomesDisciplinasPorClasseECurso,
  isProfessorCoordenadorTurma,
  getDisciplinasPermitidasProfessor,
  getNivelEnsinoPorClasse
} from '../services/academicHierarchyService';
import { ordenarClassesMED } from '../utils/enrollmentProgression';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { Escola, Aluno, Turma, Disciplina, NotaTrimestralConsolidada, NotaEstudante, AvaliacaoCriada, ComissaoJuri, Funcionario, ConfiguracaoPassesEscola, RegraCalculoMAC } from '../types';
import {
  formatarTextoPorGenero,
  validarElegibilidadeCertificado,
  converterComportamentoParaConceito,
  isClasseFinal,
  obterInformacaoEscala,
  calcularMACEstudante,
  calcularNotaTrimestralDinamica,
  calcularMediaFinal3Trimestre,
  obterObservacaoDisciplina,
  obterObservacaoPautaGeral
} from '../services/macEngine';
import { converterNotaParaExtensoMED, numeroParaExtenso, converterNotaParaCertificadoExtenso } from '../utils/numberToWords';
import { formatarDataAngolana, formatarDataHoraAngolana, hojeAngolano } from '../utils/dateFormat';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument, downloadExcelFile } from '../utils/curriculoAngola';
import {
  exportarBoletimAlunoExcel,
  exportarPautaGeralExcel,
  exportarPautaDisciplinaAnualExcel,
  exportarPautaTrimestralComFormulasExcel
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
import { SchoolPassCard } from './SchoolPassCard';
import {
  interpolarTextoDocumento,
  mesclarCamposDocumento,
  DocumentTemplateContext
} from '../utils/documentTemplateResolver';
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
  obterVogaisJuri,
  obterTituloPresidenteJuri,
  obterTituloPrimeiroVogalJuri,
  obterTituloSegundoVogalJuri,
  obterTituloFuncionario,
  obterTituloEncarregado,
  obterSituacaoTextoPorGenero
} from '../utils/directorHelper';
import { StudentClassListPdfDocument } from './StudentClassListPdfDocument';
import { FeeReceiptsA4Grid, ReciboEmolumentoA4Item } from './FeeReceiptsA4Sheet';

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
  notasAvaliacoes?: NotaEstudante[];
  avaliacoes?: AvaliacaoCriada[];
  initialDocType?: DocumentType;
  currentUser?: Funcionario;
  atribuicoes?: any[];
}

const normalizarNomeDisciplina = (nome?: string): string => {
  if (!nome) return '';
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.\-_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizarTrimestreNumero = (tri?: string | number | null): '1' | '2' | '3' | '' => {
  if (tri === undefined || tri === null) return '';
  const s = String(tri).toUpperCase().trim();
  if (!s) return '';
  if (s.includes('3') || s.includes('III')) return '3';
  if (s.includes('2') || s.includes('II')) return '2';
  if (s.includes('1') || s.includes('I')) return '1';
  return '';
};

export const PrintingDocumentsView: React.FC<PrintingDocumentsViewProps> = ({
  escola,
  alunos,
  turmas,
  disciplinas,
  notasConsolidadas,
  notasAvaliacoes,
  avaliacoes,
  initialDocType,
  currentUser,
  atribuicoes
}) => {
  const isProfessor = currentUser?.role === 'Professor';
  const visibilidadeUsuario = useMemo(
    () => dbService.getVisibilidadeEfetivaUsuario(currentUser, escola),
    [currentUser, escola]
  );

  const horariosTodos = useMemo(() => dbService.obterHorarios(escola.id, escola.anoLectivoActivo), [escola.id, escola.anoLectivoActivo]);
  const regrasMAC = useMemo(() => dbService.obterRegrasMAC(), [escola.id]);

  const obterRegraParaClasse = (
    classeAlvo?: string,
    trimestreAlvo?: number | string,
    nivelEnsino?: string
  ): RegraCalculoMAC | undefined => {
    const clNorm = normalizarClasse(classeAlvo || '');
    const triNum = trimestreAlvo ? normalizarTrimestreNumero(trimestreAlvo) : '';
    const triStr = triNum ? `${triNum}º Trimestre` : '';
    return (
      regrasMAC.find(r => normalizarClasse(r.classe) === clNorm && (!triStr || r.trimestre === triStr)) ||
      regrasMAC.find(r => normalizarClasse(r.classe) === clNorm) ||
      (nivelEnsino ? regrasMAC.find(r => r.nivelEnsino === nivelEnsino) : undefined) ||
      regrasMAC[0]
    );
  };

  // Atribuições do professor para filtragem estrita (atribuições + horários + turmas coordenadas)
  const atribuicoesDocente = useMemo(() => {
    if (!currentUser || !isProfessor) return [];
    const list = atribuicoes || (dbService.getAtribuicoes ? dbService.getAtribuicoes() : []);
    return list.filter((a: any) => a.professorId === currentUser.id);
  }, [currentUser, isProfessor, atribuicoes]);

  const turmasBaseProfessor = useMemo(() => {
    if (!isProfessor) return turmas;
    const idsAtrib = new Set(atribuicoesDocente.map((a: any) => a.turmaId).filter(Boolean));
    const idsHorario = new Set(
      horariosTodos.filter(h => h.professorId === currentUser?.id).map(h => h.turmaId).filter(Boolean)
    );
    return turmas.filter(
      t => idsAtrib.has(t.id) || idsHorario.has(t.id) || isProfessorCoordenadorTurma(t, currentUser?.id)
    );
  }, [turmas, isProfessor, atribuicoesDocente, horariosTodos, currentUser?.id]);

  const turmasCoordenadasDocente = useMemo(() => {
    if (!isProfessor) return turmas;
    return turmasBaseProfessor.filter(t => isProfessorCoordenadorTurma(t, currentUser?.id));
  }, [isProfessor, turmas, turmasBaseProfessor, currentUser?.id]);

  // Tipos de documentos permitidos por perfil (Boletins apenas para professores que são coordenadores de turma)
  const tiposDocsPermitidos: DocumentType[] = useMemo(() => {
    if (isProfessor) {
      return turmasCoordenadasDocente.length > 0
        ? ['pautas', 'boletim_oficial', 'ficha_presencas', 'lista_nominal']
        : ['pautas', 'ficha_presencas', 'lista_nominal'];
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
  }, [isProfessor, currentUser?.role, turmasCoordenadasDocente.length]);

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
    } else if (!tiposDocsPermitidos.includes(docType)) {
      setDocType(isProfessor ? 'pautas' : (tiposDocsPermitidos[0] || 'boletim_oficial'));
    }
  }, [initialDocType, tiposDocsPermitidos, isProfessor, docType]);

  // Turmas permitidas: nos Boletins, professor vê SOMENTE as classes/turmas onde é coordenador
  const turmasPermitidas = useMemo(() => {
    if (!isProfessor) return turmas;
    if (docType === 'boletim_oficial') return turmasCoordenadasDocente;
    return turmasBaseProfessor;
  }, [isProfessor, turmas, docType, turmasCoordenadasDocente, turmasBaseProfessor]);

  // Alunos permitidos: para Professor, apenas discentes das suas turmas permitidas
  const alunosPermitidos = useMemo(() => {
    if (!isProfessor) return alunos;
    const ids = new Set(turmasPermitidas.map(t => t.id));
    return alunos.filter(a => ids.has(a.turmaId));
  }, [alunos, isProfessor, turmasPermitidas]);

  const avaliacoesLocal = useMemo(() => {
    return (avaliacoes && avaliacoes.length > 0) ? avaliacoes : dbService.obterAvaliacoes();
  }, [avaliacoes]);

  const notasAvaliacoesLocal = useMemo(() => {
    return (notasAvaliacoes && notasAvaliacoes.length > 0) ? notasAvaliacoes : dbService.obterNotas();
  }, [notasAvaliacoes]);

  const anosLectivosConfigs = useMemo(() => dbService.getAnosLectivosConfigs(escola.id), [escola.id]);
  const anosLectivosDisponiveis = useMemo(() => {
    const list = new Set<string>();
    if (escola.anoLectivoActivo) list.add(escola.anoLectivoActivo);
    anosLectivosConfigs.forEach((c: any) => { if (c?.rotulo || c?.ano) list.add(c.rotulo || c.ano); });
    turmasPermitidas.forEach(t => { if (t.anoLectivo) list.add(t.anoLectivo); });
    alunosPermitidos.forEach(a => { 
      if (a.anoLectivo) list.add(a.anoLectivo); 
      if (a.anoMatricula) list.add(a.anoMatricula);
      a.historicoAnterior?.forEach(h => { if (h.anoLectivo) list.add(h.anoLectivo); });
    });
    notasConsolidadas.forEach(n => { if (n.anoLectivo) list.add(n.anoLectivo); });
    avaliacoesLocal.forEach(av => { if (av.anoLectivo) list.add(av.anoLectivo); });
    return Array.from(list).sort().reverse();
  }, [escola.anoLectivoActivo, anosLectivosConfigs, turmasPermitidas, alunosPermitidos, notasConsolidadas, avaliacoesLocal]);

  const [selectedAnoLectivo, setSelectedAnoLectivo] = useState<string>(
    escola.anoLectivoActivo || ''
  );
  useEffect(() => {
    setSelectedAnoLectivo(escola.anoLectivoActivo || dbService.getAnosLectivos(escola.id)[0] || '');
  }, [escola.id, escola.anoLectivoActivo]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>(alunosPermitidos[0]?.id || '');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmasPermitidas[0]?.id || '');
  const [selectedClasse, setSelectedClasse] = useState<string>(() => {
    return turmasPermitidas[0]?.classe ? normalizarClasse(turmasPermitidas[0].classe) : '9ª';
  });
  const [selectedCurso, setSelectedCurso] = useState<string>('TODOS');
  const [buscaAlunoDocumento, setBuscaAlunoDocumento] = useState<string>('');

  const CLASSES_FINAIS_CERTIFICADO = useMemo(() => new Set(['6ª', '9ª', '12ª', '13ª']), []);
  const isClasseFinalCertificado = (cl?: string): boolean => {
    const norm = normalizarClasse(cl || '');
    return CLASSES_FINAIS_CERTIFICADO.has(norm);
  };

  const todasClasses = useMemo(() => {
    const fromCfg = dbService.getClassesConfigs(escola.id, selectedAnoLectivo || escola.anoLectivoActivo).filter(c => c.ativa !== false).map(c => c.nome);
    const fromTurmas = turmasPermitidas.map(t => normalizarClasse(t.classe)).filter(Boolean);
    const lista = ordenarClassesMED([
      ...TODAS_CLASSES_OFICIAIS_MED,
      ...fromCfg,
      ...fromTurmas
    ]);
    if (isProfessor) {
      const classesSet = new Set(fromTurmas);
      const filtradas = lista.filter(c => classesSet.has(normalizarClasse(c)));
      return filtradas.length > 0 ? filtradas : Array.from(classesSet);
    }
    return lista;
  }, [escola.id, escola.anoLectivoActivo, selectedAnoLectivo, isProfessor, turmasPermitidas]);

  const todasClassesDocumento = useMemo(() => {
    if (docType === 'certificado_ciclo') {
      const finais = todasClasses.filter(c => isClasseFinalCertificado(c));
      return finais.length > 0 ? finais : ['6ª', '9ª', '12ª', '13ª'];
    }
    return todasClasses;
  }, [todasClasses, docType]);

  // Turmas filtradas estritamente pelo ano lectivo selecionado
  const turmasDoAnoDocumento = useMemo(() => {
    return turmasPermitidas.filter(t => !t.anoLectivo || !selectedAnoLectivo || t.anoLectivo === selectedAnoLectivo);
  }, [turmasPermitidas, selectedAnoLectivo]);

  // Garantir que a classe inicial existe nas turmas da escola e respeita classes finais nos certificados
  useEffect(() => {
    if (docType === 'certificado_ciclo') {
      const turmasFinais = turmasDoAnoDocumento.filter(t => isClasseFinalCertificado(t.classe));
      if (!isClasseFinalCertificado(selectedClasse)) {
        const primeiraFinal = turmasFinais[0]?.classe
          ? normalizarClasse(turmasFinais[0].classe)
          : (todasClassesDocumento[0] || '9ª');
        setSelectedClasse(primeiraFinal);
        return;
      }
      if (turmasFinais.length > 0 && getTurmasPorClasse(turmasFinais, selectedClasse).length === 0) {
        const primeiraFinal = normalizarClasse(turmasFinais[0].classe);
        if (primeiraFinal) setSelectedClasse(primeiraFinal);
      }
      return;
    }

    if (turmasDoAnoDocumento.length > 0) {
      if (docType !== 'lista_nominal' && selectedClasse === 'TODAS') {
        const primeiraClasse = normalizarClasse(turmasDoAnoDocumento[0].classe);
        if (primeiraClasse) setSelectedClasse(primeiraClasse);
      } else if (selectedClasse !== 'TODAS') {
        const temNaClasse = getTurmasPorClasse(turmasDoAnoDocumento, selectedClasse).length > 0;
        if (!temNaClasse) {
          const primeiraClasse = normalizarClasse(turmasDoAnoDocumento[0].classe);
          if (primeiraClasse) setSelectedClasse(primeiraClasse);
        }
      }
    }
  }, [turmasDoAnoDocumento, selectedClasse, docType, todasClassesDocumento]);

  const mostrarFiltroCursoDoc = useMemo(() => {
    if (selectedClasse !== 'TODAS') return isSegundoCiclo(selectedClasse);
    return turmasDoAnoDocumento.some(t => isSegundoCiclo(t.classe));
  }, [selectedClasse, turmasDoAnoDocumento]);

  useEffect(() => {
    if (!mostrarFiltroCursoDoc && selectedCurso !== 'TODOS') {
      setSelectedCurso('TODOS');
    }
  }, [mostrarFiltroCursoDoc, selectedCurso]);

  // Cursos disponíveis exclusivamente para o IIº Ciclo (10ª–13ª)
  const cursosDisponiveisDocumento = useMemo(() => {
    if (!mostrarFiltroCursoDoc) return [];
    const set = new Set<string>();
    dbService.getCursos(escola.id).filter(c => c.ativo !== false).forEach(c => {
      if (c.nome && c.nome.trim()) set.add(c.nome.trim());
    });
    turmasDoAnoDocumento.forEach(t => {
      if (!isSegundoCiclo(t.classe)) return;
      if (selectedClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(selectedClasse)) return;
      if (t.curso && t.curso.trim()) set.add(t.curso.trim());
    });
    CURSOS_SEGUNDO_CICLO.forEach(c => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [escola.id, turmasDoAnoDocumento, selectedClasse, mostrarFiltroCursoDoc]);

  // Turmas da classe e curso selecionados
  const turmasDaClasseSelecionada = useMemo(() => {
    const base = (!selectedClasse || selectedClasse === 'TODAS')
      ? turmasDoAnoDocumento
      : getTurmasPorClasse(turmasDoAnoDocumento, selectedClasse);
    if (!mostrarFiltroCursoDoc || !selectedCurso || selectedCurso === 'TODOS') return base;
    return base.filter(t => (t.curso || '').trim().toLowerCase() === selectedCurso.trim().toLowerCase());
  }, [turmasDoAnoDocumento, selectedClasse, selectedCurso, mostrarFiltroCursoDoc]);

  // Resolver contexto académico real de cada aluno dentro de um ano letivo específico (suporta histórico/promoções)
  const resolverContextoAlunoNoAno = (
    aluno: Aluno | undefined,
    anoAlvo: string
  ): {
    turma?: Turma;
    classe: string;
    curso: string;
    anoLectivo: string;
  } | null => {
    if (!aluno) return null;
    const turmaAtual = turmas.find(tm => tm.id === aluno.turmaId);
    const anoAtual = aluno.anoLectivo || aluno.anoMatricula || turmaAtual?.anoLectivo || escola.anoLectivoActivo || '';

    if (!anoAlvo || anoAtual === anoAlvo) {
      return {
        turma: turmaAtual,
        classe: normalizarClasse(turmaAtual?.classe || aluno.classeId || ''),
        curso: (turmaAtual?.curso || aluno.curso || '').trim(),
        anoLectivo: anoAtual || anoAlvo
      };
    }

    // Procurar registo de notas ou avaliações do aluno nesse ano lectivo
    const notaDoAno = notasConsolidadas.find(n => n.alunoId === aluno.id && n.anoLectivo === anoAlvo);
    let turmaHist = notaDoAno?.turmaId ? turmas.find(tm => tm.id === notaDoAno.turmaId) : undefined;
    if (!turmaHist) {
      const avIdsAluno = new Set(notasAvaliacoesLocal.filter(na => na.alunoId === aluno.id).map(na => na.avaliacaoId));
      const avDoAno = avaliacoesLocal.find(av => avIdsAluno.has(av.id) && av.anoLectivo === anoAlvo);
      if (avDoAno?.turmaId) {
        turmaHist = turmas.find(tm => tm.id === avDoAno.turmaId);
      }
    }

    const histAnt = aluno.historicoAnterior?.find(h => h.anoLectivo === anoAlvo);
    const histEscolar = dbService.getHistoricoEscolarCompleto(aluno.id);
    const histCls = histEscolar?.classes?.find(c => c.anoLectivo === anoAlvo);

    if (turmaHist || histAnt || histCls || notaDoAno) {
      const classeResolvida = normalizarClasse(
        turmaHist?.classe || histCls?.classe || histAnt?.classe || (notaDoAno as any)?.classeId || ''
      );
      if (classeResolvida || turmaHist) {
        return {
          turma: turmaHist,
          classe: classeResolvida,
          curso: (turmaHist?.curso || (histCls as any)?.curso || aluno.curso || '').trim(),
          anoLectivo: anoAlvo
        };
      }
    }

    return null;
  };

  const alunosFiltradosIndividual = useMemo(() => {
    const comContexto = alunosPermitidos
      .map(a => ({ aluno: a, ctx: resolverContextoAlunoNoAno(a, selectedAnoLectivo) }))
      .filter((item): item is { aluno: Aluno; ctx: NonNullable<ReturnType<typeof resolverContextoAlunoNoAno>> } => item.ctx !== null);

    let list = comContexto;

    if (docType === 'certificado_ciclo') {
      list = list.filter(({ ctx }) => isClasseFinalCertificado(ctx.classe));
    }

    if (selectedClasse && selectedClasse !== 'TODAS') {
      const alvoCl = normalizarClasse(selectedClasse);
      list = list.filter(({ ctx }) => ctx.classe === alvoCl);
    }

    if (mostrarFiltroCursoDoc && selectedCurso && selectedCurso !== 'TODOS') {
      const alvoCur = selectedCurso.trim().toLowerCase();
      list = list.filter(({ ctx }) => (ctx.curso || '').trim().toLowerCase() === alvoCur);
    }

    if (selectedTurmaId && selectedTurmaId !== 'TODAS') {
      list = list.filter(({ aluno, ctx }) => (ctx.turma?.id || aluno.turmaId) === selectedTurmaId);
    }

    let alunosMatch = list.map(item => item.aluno);

    if (buscaAlunoDocumento.trim()) {
      alunosMatch = alunosMatch.filter(a => 
        safeSearchMatch(a.nomeCompleto, buscaAlunoDocumento) ||
        safeSearchMatch(a.codigoMatricula, buscaAlunoDocumento) ||
        safeSearchMatch(a.numeroProcesso, buscaAlunoDocumento) ||
        safeSearchMatch(a.numeroBI, buscaAlunoDocumento)
      );
    }
    return alunosMatch;
  }, [alunosPermitidos, selectedClasse, selectedCurso, selectedTurmaId, buscaAlunoDocumento, turmas, selectedAnoLectivo, escola.anoLectivoActivo, docType, mostrarFiltroCursoDoc, notasConsolidadas, avaliacoesLocal, notasAvaliacoesLocal]);

  const [larguraTermica, setLarguraTermica] = useState<'58mm' | '80mm'>('58mm');
  const [modoRecibo, setModoRecibo] = useState<'a4_8' | 'pos'>('a4_8');
  const [buscaReciboA4, setBuscaReciboA4] = useState('');
  const [selectedRecibosA4Ids, setSelectedRecibosA4Ids] = useState<string[]>([]);
  const [modoEmissao, setModoEmissao] = useState<'individual' | 'turma' | 'classe'>('individual');
  const [layoutBoletim, setLayoutBoletim] = useState<'4_por_folha' | '2_por_folha' | '1_por_folha'>(
    (escola.layoutBoletinsPadrao as any) || '4_por_folha'
  );
  const [passConfig, setPassConfig] = useState<ConfiguracaoPassesEscola>(() =>
    dbService.obterConfiguracaoPasses(escola.id)
  );
  const [passVisualizacao, setPassVisualizacao] = useState<'frente' | 'verso' | 'ambos'>('frente');

  useEffect(() => {
    setPassConfig(dbService.obterConfiguracaoPasses(escola.id));
  }, [escola.id, escola.configuracaoPasses, escola.corPrimaria, escola.corSecundaria, escola.corFundoPasses]);

  useEffect(() => {
    const syncPasses = () => setPassConfig(dbService.obterConfiguracaoPasses(escola.id));
    window.addEventListener('sge_dados_atualizados_remoto', syncPasses);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', syncPasses);
  }, [escola.id]);

  const atualizarPassConfig = (parcial: Partial<ConfiguracaoPassesEscola>) => {
    const atualizado: ConfiguracaoPassesEscola = {
      ...passConfig,
      ...parcial
    };
    setPassConfig(atualizado);
    dbService.salvarConfiguracaoPasses(escola.id, atualizado);
  };
  // Tipo de Certificado para Classes Finais (Primário 6ª, Iº Ciclo 9ª, IIº Ciclo Geral 12ª, Técnico 12ª/13ª)
  const [tipoCertificadoSelecionado, setTipoCertificadoSelecionado] = useState<
    'auto' | 'primario_6' | 'iciclo_9' | 'iiciclo_12' | 'tecnico_12_13'
  >('auto');

  // Gestão de Pautas Oficiais (Geral/Final, Trimestral, Por Disciplina) & Modos de Apresentação
  const [pautaSubTipo, setPautaSubTipo] = useState<'geral_final' | 'trimestral' | 'disciplina'>('geral_final');
  const [pautaTrimestre, setPautaTrimestre] = useState<'1' | '2' | '3'>(() => normalizarTrimestreNumero(escola.trimestreActivo) || '1');
  const [pautaDisciplinaPeriodo, setPautaDisciplinaPeriodo] = useState<'1' | '2' | '3' | 'anual'>(() => normalizarTrimestreNumero(escola.trimestreActivo) || '1');
  const [boletimTrimestre, setBoletimTrimestre] = useState<'1' | '2' | '3' | 'anual'>(() => normalizarTrimestreNumero(escola.trimestreActivo) || '1');
  useEffect(() => {
    const tri = normalizarTrimestreNumero(escola.trimestreActivo);
    if (tri) {
      setBoletimTrimestre(tri);
      setPautaTrimestre(tri);
      setPautaDisciplinaPeriodo(tri);
    }
  }, [escola.id, escola.trimestreActivo]);
  const [pautaDisciplinaId, setPautaDisciplinaId] = useState<string>('');
  const [pautaModoExibicao, setPautaModoExibicao] = useState<'sintetica' | 'analitica'>('sintetica');
  const provaProfessorAtiva = escola.nppAtivo !== false;

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

  // Selecionar aluno ativo estritamente dentro do ano, turma e classe selecionados (sem fallback enganoso para outro aluno)
  const alunoSelecionado =
    alunosFiltradosIndividual.find(a => a.id === selectedAlunoId) || alunosFiltradosIndividual[0];
  const contextoAlunoSelecionado = resolverContextoAlunoNoAno(alunoSelecionado, selectedAnoLectivo);
  const turmaDoAluno = contextoAlunoSelecionado?.turma || turmas.find(t => t.id === alunoSelecionado?.turmaId);

  // Sincronizar turma selecionada sempre que o filtro de classe/curso mudar
  useEffect(() => {
    if (turmasDaClasseSelecionada.length > 0) {
      if (docType !== 'lista_nominal' && selectedTurmaId === 'TODAS') {
        setSelectedTurmaId(turmasDaClasseSelecionada[0].id);
      } else if (selectedTurmaId !== 'TODAS' && !turmasDaClasseSelecionada.some(t => t.id === selectedTurmaId)) {
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
      curso: isSegundoCiclo(selectedClasse) ? 'Ensino Geral' : '',
      capacidade: 45,
      escolaId: escola.id,
      anoLectivo: selectedAnoLectivo || escola.anoLectivoActivo
    } as Turma);
  }, [turmasDaClasseSelecionada, selectedTurmaId, selectedClasse, escola.id, escola.anoLectivoActivo, selectedAnoLectivo]);

  // Identificação oficial de classe final de ciclo (6ª, 9ª, 12ª, 13ª) para a turma selecionada
  const ehClasseFinalTurma = useMemo(() => {
    return isClasseFinal(turmaSelecionada?.classe);
  }, [turmaSelecionada?.classe]);

  // Alunos exclusivos e estritos da turma e classe selecionada no ano letivo selecionado
  const alunosDaTurma = useMemo(() => {
    if (!turmaSelecionada.id) return [];
    return alunosPermitidos.filter(a => {
      const ctx = resolverContextoAlunoNoAno(a, selectedAnoLectivo);
      if (!ctx) return false;
      const turmaAlId = ctx.turma?.id || a.turmaId;
      if (turmaAlId !== turmaSelecionada.id) return false;
      if (turmaSelecionada.classe && ctx.classe) {
        if (normalizarClasse(ctx.classe) !== normalizarClasse(turmaSelecionada.classe)) {
          return false;
        }
      }
      return true;
    });
  }, [alunosPermitidos, turmaSelecionada, selectedAnoLectivo, turmas, escola.anoLectivoActivo, notasConsolidadas, avaliacoesLocal, notasAvaliacoesLocal]);

  // Alunos para a Lista Nominal (suporta turma específica OU todas as turmas da classe/curso)
  const alunosListaNominal = useMemo(() => {
    return alunosPermitidos.filter(a => {
      const ctx = resolverContextoAlunoNoAno(a, selectedAnoLectivo);
      if (!ctx) return false;
      if (selectedTurmaId && selectedTurmaId !== 'TODAS') {
        return (ctx.turma?.id || a.turmaId) === selectedTurmaId;
      }
      if (selectedClasse && selectedClasse !== 'TODAS' && ctx.classe !== normalizarClasse(selectedClasse)) {
        return false;
      }
      if (mostrarFiltroCursoDoc && selectedCurso && selectedCurso !== 'TODOS') {
        if ((ctx.curso || '').trim().toLowerCase() !== selectedCurso.trim().toLowerCase()) return false;
      }
      return true;
    });
  }, [alunosPermitidos, turmas, selectedAnoLectivo, escola.anoLectivoActivo, selectedTurmaId, selectedClasse, selectedCurso, mostrarFiltroCursoDoc, notasConsolidadas, avaliacoesLocal, notasAvaliacoesLocal]);

  const alunosDaClasse = useMemo(() => {
    if (!selectedClasse || selectedClasse === 'TODAS') return [];
    const clAlvo = normalizarClasse(selectedClasse);
    return alunosPermitidos.filter(a => {
      const ctx = resolverContextoAlunoNoAno(a, selectedAnoLectivo);
      return Boolean(ctx && ctx.classe === clAlvo);
    });
  }, [alunosPermitidos, selectedClasse, selectedAnoLectivo, turmas, escola.anoLectivoActivo, notasConsolidadas, avaliacoesLocal, notasAvaliacoesLocal]);

  // Sincronizar o discente selecionado automaticamente quando o filtro ou classe muda
  useEffect(() => {
    if (alunosFiltradosIndividual.length > 0 && !alunosFiltradosIndividual.some(a => a.id === selectedAlunoId)) {
      setSelectedAlunoId(alunosFiltradosIndividual[0].id);
    } else if (alunosFiltradosIndividual.length === 0 && selectedAlunoId) {
      setSelectedAlunoId('');
    }
  }, [alunosFiltradosIndividual, selectedAlunoId]);

  // Alunos no escopo de impressão
  const alunosParaImprimir: Aluno[] = useMemo(() => {
    if (modoEmissao === 'turma') return alunosDaTurma;
    if (modoEmissao === 'classe') return alunosDaClasse;
    return alunoSelecionado ? [alunoSelecionado] : [];
  }, [modoEmissao, alunosDaTurma, alunosDaClasse, alunoSelecionado]);

  const [modalConfigDocOpen, setModalConfigDocOpen] = useState(false);

  // Contexto académico real do aluno selecionado no ano lectivo selecionado (Boletim, Declaração e Certificado)
  const classeAlunoDoc =
    contextoAlunoSelecionado?.classe ||
    turmaDoAluno?.classe ||
    alunoSelecionado?.classeId ||
    (selectedClasse !== 'TODAS' ? selectedClasse : '') ||
    '';
  const cursoAlunoDoc = (
    contextoAlunoSelecionado?.curso ||
    turmaDoAluno?.curso ||
    alunoSelecionado?.curso ||
    ''
  ).trim();
  const anoAlunoDoc =
    contextoAlunoSelecionado?.anoLectivo ||
    selectedAnoLectivo ||
    alunoSelecionado?.anoLectivo ||
    alunoSelecionado?.anoMatricula ||
    turmaDoAluno?.anoLectivo ||
    escola.anoLectivoActivo ||
    '';
  const ehSegundoCicloAlunoDoc = isSegundoCiclo(classeAlunoDoc);
  const escalaAlunoDoc = useMemo(
    () => obterInformacaoEscala(classeAlunoDoc, turmaDoAluno?.nivelEnsino),
    [classeAlunoDoc, turmaDoAluno?.nivelEnsino]
  );

  // Objeto do aluno alinhado com o ano lectivo/classe/curso selecionado para interpolação fiel de textos e cabeçalhos
  const alunoDocAlinhado = useMemo(() => {
    if (!alunoSelecionado) return undefined;
    return {
      ...alunoSelecionado,
      classeId: classeAlunoDoc || alunoSelecionado.classeId,
      curso: ehSegundoCicloAlunoDoc ? (cursoAlunoDoc || alunoSelecionado.curso) : '',
      turmaId: turmaDoAluno?.id || alunoSelecionado.turmaId,
      anoLectivo: anoAlunoDoc || alunoSelecionado.anoLectivo,
      anoMatricula: anoAlunoDoc || alunoSelecionado.anoMatricula
    } as Aluno;
  }, [alunoSelecionado, classeAlunoDoc, ehSegundoCicloAlunoDoc, cursoAlunoDoc, turmaDoAluno?.id, anoAlunoDoc]);

  const disciplinasDoAnoDocumento = useMemo(() => {
    if (!selectedAnoLectivo) return disciplinas;
    const doAno = disciplinas.filter(d => !d.anoLectivo || d.anoLectivo === selectedAnoLectivo);
    return doAno.length > 0 ? doAno : disciplinas;
  }, [disciplinas, selectedAnoLectivo]);

  const disciplinasCatalogoGlobal = useMemo(() => {
    const map = new Map<string, Disciplina>();
    dbService.obterDisciplinas().forEach(d => {
      if (d?.id) map.set(d.id, d);
    });
    disciplinas.forEach(d => {
      if (d?.id) map.set(d.id, d);
    });
    return Array.from(map.values());
  }, [disciplinas]);

  const resolverNomeDisciplinaNota = (n: any): string => {
    if (n?.disciplinaNome && String(n.disciplinaNome).trim()) return String(n.disciplinaNome).trim();
    const byId = disciplinasCatalogoGlobal.find(d => d.id === n?.disciplinaId);
    if (byId?.nome) return byId.nome;
    if (n?.avaliacaoId) {
      const av = avaliacoesLocal.find(a => a.id === n.avaliacaoId);
      if (av?.disciplinaNome) return av.disciplinaNome;
      if (av?.disciplinaId) {
        const avDisc = disciplinasCatalogoGlobal.find(d => d.id === av.disciplinaId);
        if (avDisc?.nome) return avDisc.nome;
      }
    }
    return '';
  };

  const notaCorrespondeDisciplina = (n: any, disc: { id?: string; nome: string }): boolean => {
    if (!n) return false;
    if (disc.id && n.disciplinaId && n.disciplinaId === disc.id) return true;
    const alvoNorm = normalizarNomeDisciplina(disc.nome);
    if (!alvoNorm) return false;
    const notaDiscNome = normalizarNomeDisciplina(resolverNomeDisciplinaNota(n));
    if (!notaDiscNome) return false;
    if (notaDiscNome === alvoNorm) return true;
    if (notaDiscNome.length >= 6 && alvoNorm.length >= 6) {
      return notaDiscNome.includes(alvoNorm) || alvoNorm.includes(notaDiscNome);
    }
    return false;
  };

  const obterDisciplinasParaAlunoEClasse = (
    aluno: Aluno | undefined,
    classeOverride?: string,
    cursoOverride?: string
  ): Disciplina[] => {
    const ctxAl = resolverContextoAlunoNoAno(aluno, selectedAnoLectivo);
    const turmaAl = ctxAl?.turma || turmas.find(t => t.id === aluno?.turmaId);
    const cl = classeOverride || ctxAl?.classe || turmaAl?.classe || aluno?.classeId || (selectedClasse !== 'TODAS' ? selectedClasse : '') || '';
    const ehII = isSegundoCiclo(cl);
    const cur = ehII ? (cursoOverride || ctxAl?.curso || turmaAl?.curso || aluno?.curso || '') : undefined;

    const filtradas = filtrarDisciplinasDaClasse(disciplinasDoAnoDocumento, cl, cur);
    const base: Disciplina[] =
      filtradas.length > 0
        ? [...filtradas]
        : getDisciplinasMatrizOficial(cl, cur).map((nome, idx) => ({
            id: `matriz-al-${normalizarClasse(cl)}-${idx}`,
            nome,
            sigla: nome.substring(0, 4).toUpperCase(),
            escolaId: escola.id
          } as Disciplina));

    if (!aluno) return base;

    const existentesNorm = new Set(base.map(d => normalizarNomeDisciplina(d.nome)));
    const adicionarSeFalta = (nome?: string, discId?: string) => {
      const limpo = (nome || '').trim();
      const norm = normalizarNomeDisciplina(limpo);
      if (!limpo || !norm || existentesNorm.has(norm)) return;
      existentesNorm.add(norm);
      const fromCatalog = disciplinasCatalogoGlobal.find(d => d.id === discId || normalizarNomeDisciplina(d.nome) === norm);
      base.push(
        fromCatalog || ({
          id: discId || `extra-${norm.replace(/\s+/g, '-')}`,
          nome: limpo,
          sigla: limpo.substring(0, 4).toUpperCase(),
          escolaId: escola.id
        } as Disciplina)
      );
    };

    const alvoNorm = normalizarClasse(cl);
    const anoAl = ctxAl?.anoLectivo || selectedAnoLectivo || aluno.anoLectivo || aluno.anoMatricula || turmaAl?.anoLectivo;
    const isClasseAtualAl = alvoNorm === normalizarClasse(ctxAl?.classe || turmaAl?.classe || aluno.classeId || '');

    // 1) Disciplinas presentes nas notas consolidadas deste aluno para esta classe/ano
    notasConsolidadas.forEach(n => {
      if (n.alunoId !== aluno.id) return;
      const tNota = turmas.find(t => t.id === n.turmaId);
      const classeNotaNorm = normalizarClasse(tNota?.classe || (n as any).classeId || (n as any).classe || '');
      const mesmaClasse = classeNotaNorm
        ? classeNotaNorm === alvoNorm && (!isClasseAtualAl || !n.anoLectivo || !anoAl || n.anoLectivo === anoAl)
        : (isClasseAtualAl && (!n.anoLectivo || !anoAl || n.anoLectivo === anoAl));
      if (!mesmaClasse) return;
      adicionarSeFalta(resolverNomeDisciplinaNota(n), n.disciplinaId);
    });

    // 2) Disciplinas presentes em avaliações brutas lançadas para o aluno nesta classe/turma
    notasAvaliacoesLocal.forEach(na => {
      if (na.alunoId !== aluno.id) return;
      const av = avaliacoesLocal.find(a => a.id === na.avaliacaoId);
      if (!av) return;
      const tAv = turmas.find(t => t.id === av.turmaId);
      const classeAvNorm = normalizarClasse(tAv?.classe || (av as any).classe || '');
      if (classeAvNorm && alvoNorm && classeAvNorm !== alvoNorm) return;
      if (isClasseAtualAl && av.anoLectivo && anoAl && av.anoLectivo !== anoAl) return;
      if (!classeAvNorm && (!isClasseAtualAl || (av.anoLectivo && anoAl && av.anoLectivo !== anoAl))) return;
      const nomeAvDisc = av.disciplinaNome || disciplinasCatalogoGlobal.find(d => d.id === av.disciplinaId)?.nome;
      adicionarSeFalta(nomeAvDisc, av.disciplinaId);
    });

    // 3) Disciplinas gravadas no Histórico Escolar Completo para esta classe
    const histAl = dbService.getHistoricoEscolarCompleto(aluno.id);
    const histCls = histAl?.classes?.find(c => normalizarClasse(c.classe) === alvoNorm && (!isClasseAtualAl || !anoAl || !c.anoLectivo || c.anoLectivo === anoAl))
      || histAl?.classes?.find(c => normalizarClasse(c.classe) === alvoNorm);
    histCls?.notasDisciplinas?.forEach(nd => adicionarSeFalta(nd.disciplinaNome));

    return ordenarDisciplinas(base, cl, cur);
  };

  // Verifica se o professor atual é coordenador da turma selecionada na Pauta
  const isCoordenadorTurmaSelecionada = useMemo(() => {
    if (!isProfessor) return true;
    return isProfessorCoordenadorTurma(turmaSelecionada, currentUser?.id);
  }, [isProfessor, turmaSelecionada, currentUser?.id]);

  // Caso professor não seja coordenador da turma atual, restringir Pauta para Pauta da Disciplina
  useEffect(() => {
    if (isProfessor && !isCoordenadorTurmaSelecionada && pautaSubTipo !== 'disciplina') {
      setPautaSubTipo('disciplina');
    }
  }, [isProfessor, isCoordenadorTurmaSelecionada, pautaSubTipo]);

  const regraVigenteDocumento = useMemo(() => {
    const regraTriDoc = docType === 'pautas' && pautaSubTipo === 'trimestral'
      ? pautaTrimestre
      : docType === 'pautas' && pautaSubTipo === 'disciplina' && pautaDisciplinaPeriodo !== 'anual'
      ? pautaDisciplinaPeriodo
      : docType === 'boletim_oficial' && boletimTrimestre !== 'anual'
      ? boletimTrimestre
      : undefined;
    return obterRegraParaClasse(turmaSelecionada?.classe || selectedClasse, regraTriDoc, turmaSelecionada?.nivelEnsino);
  }, [regrasMAC, turmaSelecionada?.classe, turmaSelecionada?.nivelEnsino, selectedClasse, docType, pautaSubTipo, pautaTrimestre, pautaDisciplinaPeriodo, boletimTrimestre]);

  // Disciplinas estritas da classe/curso selecionado para documentos de turma (Pautas / Termos)
  const classeEfetivaDocumento = turmaSelecionada?.classe || classeAlunoDoc || selectedClasse;
  const cursoEfetivoDocumento = isSegundoCiclo(classeEfetivaDocumento)
    ? (turmaSelecionada?.curso || cursoAlunoDoc)
    : undefined;

  const disciplinasDaClasseDocumento = useMemo(() => {
    const filtradas = filtrarDisciplinasDaClasse(disciplinasDoAnoDocumento, classeEfetivaDocumento, cursoEfetivoDocumento);
    const base: Disciplina[] =
      filtradas.length > 0
        ? [...filtradas]
        : getDisciplinasMatrizOficial(classeEfetivaDocumento, cursoEfetivoDocumento).map((nome, idx) => ({
            id: `matriz-doc-${normalizarClasse(classeEfetivaDocumento)}-${idx}`,
            nome,
            sigla: nome.substring(0, 4).toUpperCase(),
            escolaId: escola.id
          } as Disciplina));

    const existentesNorm = new Set(base.map(d => normalizarNomeDisciplina(d.nome)));
    const alunosIdsTurma = new Set(alunosDaTurma.map(a => a.id));
    notasConsolidadas.forEach(n => {
      if (n.turmaId !== turmaSelecionada?.id && !alunosIdsTurma.has(n.alunoId)) return;
      if (turmaSelecionada?.anoLectivo && n.anoLectivo && n.anoLectivo !== turmaSelecionada.anoLectivo) return;
      const nome = resolverNomeDisciplinaNota(n);
      const norm = normalizarNomeDisciplina(nome);
      if (nome && norm && !existentesNorm.has(norm)) {
        existentesNorm.add(norm);
        const cat = disciplinasCatalogoGlobal.find(d => d.id === n.disciplinaId || normalizarNomeDisciplina(d.nome) === norm);
        base.push(
          cat || ({
            id: n.disciplinaId || `doc-extra-${norm}`,
            nome,
            sigla: nome.substring(0, 4).toUpperCase(),
            escolaId: escola.id
          } as Disciplina)
        );
      }
    });

    avaliacoesLocal.forEach(av => {
      if (turmaSelecionada?.id && av.turmaId !== turmaSelecionada.id) return;
      if (turmaSelecionada?.anoLectivo && av.anoLectivo && av.anoLectivo !== turmaSelecionada.anoLectivo) return;
      const nome = av.disciplinaNome || disciplinasCatalogoGlobal.find(d => d.id === av.disciplinaId)?.nome || '';
      const norm = normalizarNomeDisciplina(nome);
      if (nome && norm && !existentesNorm.has(norm)) {
        existentesNorm.add(norm);
        const cat = disciplinasCatalogoGlobal.find(d => d.id === av.disciplinaId || normalizarNomeDisciplina(d.nome) === norm);
        base.push(
          cat || ({
            id: av.disciplinaId || `doc-av-${norm}`,
            nome,
            sigla: nome.substring(0, 4).toUpperCase(),
            escolaId: escola.id
          } as Disciplina)
        );
      }
    });

    const ordenadoBase = ordenarDisciplinas(base, classeEfetivaDocumento, cursoEfetivoDocumento);

    if (isProfessor && !isCoordenadorTurmaSelecionada) {
      const permitidas = getDisciplinasPermitidasProfessor(
        ordenadoBase,
        turmaSelecionada,
        atribuicoesDocente,
        currentUser?.id,
        horariosTodos
      );
      return ordenarDisciplinas(permitidas, classeEfetivaDocumento, cursoEfetivoDocumento);
    }
    return ordenadoBase;
  }, [
    disciplinasDoAnoDocumento,
    classeEfetivaDocumento,
    cursoEfetivoDocumento,
    escola.id,
    alunosDaTurma,
    turmaSelecionada,
    notasConsolidadas,
    avaliacoesLocal,
    disciplinasCatalogoGlobal,
    isProfessor,
    isCoordenadorTurmaSelecionada,
    atribuicoesDocente,
    currentUser?.id,
    horariosTodos
  ]);

  // Disciplinas estritas da classe real do aluno selecionado (Declaração, Boletim, Certificado)
  const disciplinasDaClasseAluno = useMemo(() => {
    return obterDisciplinasParaAlunoEClasse(
      alunoSelecionado,
      classeAlunoDoc,
      ehSegundoCicloAlunoDoc ? cursoAlunoDoc : undefined
    );
  }, [alunoSelecionado, classeAlunoDoc, ehSegundoCicloAlunoDoc, cursoAlunoDoc, disciplinasDoAnoDocumento, notasConsolidadas, notasAvaliacoesLocal, avaliacoesLocal, turmas, selectedAnoLectivo, escola.id]);

  // Sincronizar disciplina selecionada na Pauta por Disciplina quando a lista muda
  useEffect(() => {
    if (disciplinasDaClasseDocumento.length > 0) {
      if (!pautaDisciplinaId || !disciplinasDaClasseDocumento.some(d => d.id === pautaDisciplinaId)) {
        setPautaDisciplinaId(disciplinasDaClasseDocumento[0].id);
      }
    } else if (pautaDisciplinaId) {
      setPautaDisciplinaId('');
    }
  }, [disciplinasDaClasseDocumento, pautaDisciplinaId]);

  // Histórico escolar completo do aluno (inclui 1ª a 13ª classe gravadas no histórico)
  const historicoCompletoAluno = useMemo(() => {
    if (!alunoSelecionado?.id) return null;
    return dbService.getHistoricoEscolarCompleto(alunoSelecionado.id);
  }, [alunoSelecionado?.id, alunoSelecionado?.historicoAnterior]);

  // Notas consolidadas do aluno selecionado filtradas pelo ano letivo e turma/classe do ano selecionado
  const notasDoAluno = useMemo(() => {
    if (!alunoSelecionado) return [];
    const clsAlvoNorm = normalizarClasse(classeAlunoDoc);
    return notasConsolidadas.filter(n => {
      if (n.alunoId !== alunoSelecionado.id) return false;
      if (anoAlunoDoc && n.anoLectivo && n.anoLectivo !== anoAlunoDoc) return false;
      if (clsAlvoNorm) {
        const tN = turmas.find(t => t.id === n.turmaId);
        const clN = normalizarClasse(tN?.classe || (n as any).classeId || (n as any).classe || '');
        if (clN && clN !== clsAlvoNorm) return false;
      }
      return true;
    });
  }, [notasConsolidadas, alunoSelecionado, anoAlunoDoc, classeAlunoDoc, turmas]);

  // Determinar dinamicamente o nível e modelo do certificado estritamente para classes finais (6ª, 9ª, 12ª, 13ª)
  const tipoCertificadoEfetivo = useMemo(() => {
    if (tipoCertificadoSelecionado !== 'auto') return tipoCertificadoSelecionado;
    const clNorm = normalizarClasse(classeAlunoDoc || turmaDoAluno?.classe || turmaSelecionada?.classe || '');
    const curso = (cursoAlunoDoc || turmaDoAluno?.curso || turmaSelecionada?.curso || '').toLowerCase();
    if (clNorm === '6ª') return 'primario_6';
    if (clNorm === '9ª') return 'iciclo_9';
    if (clNorm === '13ª' || (clNorm === '12ª' && (curso.includes('técnico') || curso.includes('tecnico') || curso.includes('magistério') || curso.includes('magisterio')))) return 'tecnico_12_13';
    if (clNorm === '12ª') return 'iiciclo_12';
    return 'iiciclo_12';
  }, [tipoCertificadoSelecionado, classeAlunoDoc, cursoAlunoDoc, turmaDoAluno, turmaSelecionada]);

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

  // Helper unificado multi-aluno e multi-trimestre para resolver notas reais (consolidadas, homologadas, avaliações brutas e histórico)
  const resolverNotaRealParaAluno = (
    aluno: Aluno | undefined,
    disc: Pick<Disciplina, 'id' | 'nome'>,
    classeAlvo?: string,
    trimestreAlvo?: '1' | '2' | '3'
  ): {
    mac: number | null;
    npp: number | null;
    npt: number | null;
    mt1: number | null;
    mt2: number | null;
    mt3: number | null;
    notaExame: number | null;
    valorFinal: number | null;
    faltas: number;
    comportamentoConceito?: string;
    assiduidadeConceito?: string;
  } => {
    const empty = {
      mac: null,
      npp: null,
      npt: null,
      mt1: null,
      mt2: null,
      mt3: null,
      notaExame: null,
      valorFinal: null,
      faltas: 0
    };
    if (!aluno) return empty;

    const ctxAl = resolverContextoAlunoNoAno(aluno, selectedAnoLectivo);
    const turmaAl = ctxAl?.turma || turmas.find(t => t.id === aluno.turmaId);
    const classeAtualAlNorm = normalizarClasse(ctxAl?.classe || turmaAl?.classe || aluno.classeId || (selectedClasse !== 'TODAS' ? selectedClasse : '') || '');
    const alvoNorm = normalizarClasse(classeAlvo || classeAtualAlNorm);
    const isClasseAtualDoAluno = !classeAlvo || alvoNorm === classeAtualAlNorm;
    const anoAluno = ctxAl?.anoLectivo || selectedAnoLectivo || aluno.anoLectivo || aluno.anoMatricula || turmaAl?.anoLectivo;

    // 1) Filtrar notas consolidadas do aluno que pertencem à disciplina E à classe/ano alvo
    const todasDoAlunoDisc = notasConsolidadas.filter(n => {
      if (n.alunoId !== aluno.id) return false;
      if (!notaCorrespondeDisciplina(n, disc)) return false;
      const tNota = turmas.find(t => t.id === n.turmaId);
      const classeNotaNorm = normalizarClasse(tNota?.classe || (n as any).classeId || (n as any).classe || '');
      if (classeAlvo && classeNotaNorm) {
        if (classeNotaNorm !== alvoNorm) return false;
        return !isClasseAtualDoAluno || !n.anoLectivo || !anoAluno || n.anoLectivo === anoAluno;
      }
      if (!isClasseAtualDoAluno) return false;
      return !n.anoLectivo || !anoAluno || n.anoLectivo === anoAluno;
    });

    const homologadasAl = dbService.obterNotasHomologadasAluno(aluno.id);
    const notasOficiaisDisc = homologadasAl.filter((n: any) => {
      if (!notaCorrespondeDisciplina(n, disc)) return false;
      const tNota = turmas.find(t => t.id === n.turmaId);
      const classeNotaNorm = normalizarClasse(tNota?.classe || n.classeId || n.classe || '');
      if (classeAlvo && classeNotaNorm) {
        if (classeNotaNorm !== alvoNorm) return false;
        return !isClasseAtualDoAluno || !n.anoLectivo || !anoAluno || n.anoLectivo === anoAluno;
      }
      if (!isClasseAtualDoAluno) return false;
      return !n.anoLectivo || !anoAluno || n.anoLectivo === anoAluno;
    });

    const extrairNptSeguro = (rec: any): number | null => {
      if (!rec) return null;
      if (typeof rec.npt === 'number' && !isNaN(rec.npt)) return Number(rec.npt);
      if ('npt' in rec && rec.npt === undefined && rec.provaTrimestral === 0) return null;
      if (typeof rec.provaTrimestral === 'number' && !isNaN(rec.provaTrimestral)) return Number(rec.provaTrimestral);
      return null;
    };

    const obterMacAoVivoTrimestre = (triTarget: '1' | '2' | '3'): { mac: number | null; totalAvaliacoes: number } => {
      const correspondeAvDisc = (av: AvaliacaoCriada) => {
        const avDiscNome = av.disciplinaNome || disciplinasCatalogoGlobal.find(d => d.id === av.disciplinaId)?.nome || '';
        const alvoNormDisc = normalizarNomeDisciplina(disc.nome);
        const avNormDisc = normalizarNomeDisciplina(avDiscNome);
        return (
          (av.disciplinaId && disc.id && av.disciplinaId === disc.id) ||
          (alvoNormDisc !== '' && avNormDisc !== '' && (
            avNormDisc === alvoNormDisc ||
            (avNormDisc.length >= 6 && alvoNormDisc.length >= 6 && (avNormDisc.includes(alvoNormDisc) || alvoNormDisc.includes(avNormDisc)))
          ))
        );
      };

      const turmaContextoId = isClasseAtualDoAluno ? (ctxAl?.turma?.id || aluno.turmaId) : undefined;
      const avsEstritas = avaliacoesLocal.filter(av => {
        if (!correspondeAvDisc(av)) return false;
        if (normalizarTrimestreNumero(av.trimestre) !== triTarget) return false;
        const tAv = turmas.find(t => t.id === av.turmaId);
        if (isClasseAtualDoAluno && turmaContextoId && av.turmaId) {
          return av.turmaId === turmaContextoId && (!av.anoLectivo || !anoAluno || av.anoLectivo === anoAluno);
        }
        if (classeAlvo) {
          if (tAv?.classe) return normalizarClasse(tAv.classe) === alvoNorm && (!isClasseAtualDoAluno || !av.anoLectivo || !anoAluno || av.anoLectivo === anoAluno);
          return false;
        }
        if (av.anoLectivo && anoAluno && av.anoLectivo !== anoAluno) return false;
        return true;
      });

      const classeEfetivaCalc = alvoNorm || classeAtualAlNorm || '7ª';
      const nivelCalc = turmaAl?.nivelEnsino || getNivelEnsinoPorClasse(classeEfetivaCalc);
      const regraCalc = obterRegraParaClasse(classeEfetivaCalc, Number(triTarget), nivelCalc);

      if (avsEstritas.length > 0) {
        const resEstrito = calcularMACEstudante(
          aluno.id,
          avsEstritas,
          notasAvaliacoesLocal,
          regraCalc as RegraCalculoMAC,
          nivelCalc,
          classeEfetivaCalc
        );
        if (resEstrito.totalAvaliacoesUtilizadas > 0) {
          return { mac: resEstrito.macCalculada, totalAvaliacoes: resEstrito.totalAvaliacoesUtilizadas };
        }
      }

      // Fallback para alunos transferidos de turma dentro da mesma classe e ano lectivo
      const notasIdsAl = new Set(notasAvaliacoesLocal.filter(na => na.alunoId === aluno.id).map(na => na.avaliacaoId));
      const avsMesmaClasse = avaliacoesLocal.filter(av => {
        if (!notasIdsAl.has(av.id)) return false;
        if (!correspondeAvDisc(av)) return false;
        if (normalizarTrimestreNumero(av.trimestre) !== triTarget) return false;
        const tAv = turmas.find(t => t.id === av.turmaId);
        if (tAv?.classe && normalizarClasse(tAv.classe) !== classeEfetivaCalc) return false;
        if (av.anoLectivo && anoAluno && av.anoLectivo !== anoAluno) return false;
        return true;
      });
      if (avsMesmaClasse.length > 0) {
        const resClasse = calcularMACEstudante(
          aluno.id,
          avsMesmaClasse,
          notasAvaliacoesLocal,
          regraCalc as RegraCalculoMAC,
          nivelCalc,
          classeEfetivaCalc
        );
        if (resClasse.totalAvaliacoesUtilizadas > 0) {
          return { mac: resClasse.macCalculada, totalAvaliacoes: resClasse.totalAvaliacoesUtilizadas };
        }
      }

      return { mac: null, totalAvaliacoes: 0 };
    };

    const resolverTrimestreAoVivo = (triNum: 1 | 2 | 3) => {
      const triStr = String(triNum) as '1' | '2' | '3';
      const noTri = notasOficiaisDisc.find((n: any) => normalizarTrimestreNumero(n.trimestre) === triStr);
      const ncTri = todasDoAlunoDisc.find(n => normalizarTrimestreNumero(n.trimestre) === triStr);
      const fonte = noTri || ncTri;
      const liveMac = obterMacAoVivoTrimestre(triStr);

      const macNum =
        noTri && typeof noTri.mac === 'number'
          ? noTri.mac
          : liveMac.totalAvaliacoes > 0
          ? liveMac.mac
          : typeof fonte?.mac === 'number'
          ? fonte.mac
          : null;
      const nppNum = provaProfessorAtiva && typeof fonte?.npp === 'number' ? fonte.npp : null;
      const nptNum = extrairNptSeguro(fonte);

      const hasInputs =
        liveMac.totalAvaliacoes > 0 ||
        macNum !== null ||
        nppNum !== null ||
        nptNum !== null;

      let mtNum: number | null = null;
      if (noTri && typeof noTri.notaFinal === 'number' && (provaProfessorAtiva || !hasInputs)) {
        mtNum = noTri.notaFinal;
      } else if (hasInputs) {
        const regraTri = obterRegraParaClasse(alvoNorm || classeAtualAlNorm, triNum, turmaAl?.nivelEnsino);
        mtNum = calcularNotaTrimestralDinamica(
          macNum ?? undefined,
          nppNum ?? undefined,
          nptNum ?? undefined,
          regraTri,
          triNum,
          alvoNorm || classeAtualAlNorm,
          provaProfessorAtiva
        ).mediaTrimestral;
      } else if (fonte) {
        const cand = (fonte as any).mediaTrimestral ?? (fonte as any).notaFinal;
        if (cand !== undefined && cand !== null && !isNaN(Number(cand))) mtNum = Number(cand);
      }

      return {
        fonte,
        noTri,
        ncTri,
        macNum,
        nppNum,
        nptNum,
        mtNum,
        temDados: Boolean(fonte || liveMac.totalAvaliacoes > 0)
      };
    };

    // Caso 1A: Foi pedido um trimestre específico ('1' | '2' | '3')
    if (trimestreAlvo) {
      const resT = resolverTrimestreAoVivo(Number(trimestreAlvo) as 1 | 2 | 3);
      if (resT.temDados) {
        const exameNum = typeof resT.fonte?.notaExame === 'number' ? resT.fonte.notaExame : null;
        return {
          mac: resT.macNum,
          npp: resT.nppNum,
          npt: resT.nptNum,
          mt1: trimestreAlvo === '1' ? resT.mtNum : null,
          mt2: trimestreAlvo === '2' ? resT.mtNum : null,
          mt3: trimestreAlvo === '3' ? resT.mtNum : null,
          notaExame: exameNum,
          valorFinal: resT.noTri && typeof resT.noTri.notaFinal === 'number' && (provaProfessorAtiva || resT.mtNum === null) ? resT.noTri.notaFinal : resT.mtNum,
          faltas: Number(resT.fonte?.faltas || 0),
          comportamentoConceito: resT.fonte?.comportamentoConceito,
          assiduidadeConceito: resT.fonte?.assiduidadeConceito
        };
      }
      return empty;
    }

    // Caso 1B: Visão Anual / Final (Declarações, Certificados, Boletim Anual, Pauta Final)
    const t1Res = resolverTrimestreAoVivo(1);
    const t2Res = resolverTrimestreAoVivo(2);
    const t3Res = resolverTrimestreAoVivo(3);
    const r1 = t1Res.ncTri || t1Res.fonte;
    const r2 = t2Res.ncTri || t2Res.fonte;
    const r3 = t3Res.ncTri || t3Res.fonte;
    const noFinal =
      notasOficiaisDisc.find((n: any) => typeof n.notaFinal === 'number' && normalizarTrimestreNumero(n.trimestre) === '3') ||
      notasOficiaisDisc.find((n: any) => typeof n.notaFinal === 'number') ||
      undefined;

    const mt1 = t1Res.mtNum;
    const mt2 = t2Res.mtNum;
    const mt3 = t3Res.mtNum;
    const mtsValidos = [mt1, mt2, mt3].filter((v): v is number => v !== null && !isNaN(v));

    const ult = r3 || r2 || r1 || noFinal || todasDoAlunoDisc[todasDoAlunoDisc.length - 1];
    const faltasTotal = todasDoAlunoDisc.reduce((acc, item) => acc + Number(item.faltas || 0), 0);
    const notaExame =
      typeof r3?.notaExame === 'number' ? r3.notaExame :
      typeof noFinal?.notaExame === 'number' ? noFinal.notaExame :
      typeof ult?.notaExame === 'number' ? ult.notaExame : null;

    if (mtsValidos.length > 0 || noFinal) {
      const regraAnual = obterRegraParaClasse(alvoNorm || classeAtualAlNorm, 3, turmaAl?.nivelEnsino);
      const ehFinalCalc = isClasseFinal(alvoNorm || classeAtualAlNorm, regraAnual);
      const notaRecurso =
        typeof (r3 as any)?.notaRecurso === 'number' ? (r3 as any).notaRecurso :
        typeof (noFinal as any)?.notaRecurso === 'number' ? (noFinal as any).notaRecurso :
        typeof (ult as any)?.notaRecurso === 'number' ? (ult as any).notaRecurso : undefined;

      let valorFinal: number | null = null;
      if (typeof noFinal?.notaFinal === 'number' && (provaProfessorAtiva || mtsValidos.length === 0)) {
        valorFinal = noFinal.notaFinal;
      } else if (mtsValidos.length > 0) {
        valorFinal = calcularMediaFinal3Trimestre(
          mt1,
          mt2,
          mt3,
          ehFinalCalc && notaExame !== null ? notaExame : undefined,
          regraAnual,
          alvoNorm || classeAtualAlNorm,
          notaRecurso
        ).mediaFinal;
      } else if (typeof ult?.notaFinal === 'number') {
        valorFinal = ult.notaFinal;
      } else if (typeof ult?.mediaTrimestral === 'number') {
        valorFinal = ult.mediaTrimestral;
      }

      const macList = [t1Res.macNum, t2Res.macNum, t3Res.macNum].filter((v): v is number => typeof v === 'number');
      const nppList = [t1Res.nppNum, t2Res.nppNum, t3Res.nppNum].filter((v): v is number => typeof v === 'number');
      const nptList = [t1Res.nptNum, t2Res.nptNum, t3Res.nptNum].filter((v): v is number => typeof v === 'number');

      return {
        mac: macList.length > 0 ? Math.round((macList.reduce((a, b) => a + b, 0) / macList.length) * 10) / 10 : null,
        npp: nppList.length > 0 ? Math.round((nppList.reduce((a, b) => a + b, 0) / nppList.length) * 10) / 10 : null,
        npt: nptList.length > 0 ? Math.round((nptList.reduce((a, b) => a + b, 0) / nptList.length) * 10) / 10 : null,
        mt1,
        mt2,
        mt3,
        notaExame,
        valorFinal,
        faltas: faltasTotal,
        comportamentoConceito: ult?.comportamentoConceito,
        assiduidadeConceito: ult?.assiduidadeConceito
      };
    }

    // 2) Consultar Histórico Escolar Completo (inclui 1ª à 6ª, 7ª–9ª, 10ª–13ª)
    const nomeNorm = normalizarNomeDisciplina(disc.nome);
    const histAl = dbService.getHistoricoEscolarCompleto(aluno.id);
    const histClasse =
      histAl?.classes?.find(c => normalizarClasse(c.classe) === alvoNorm && (!isClasseAtualDoAluno || !anoAluno || !c.anoLectivo || c.anoLectivo === anoAluno)) ||
      histAl?.classes?.find(c => normalizarClasse(c.classe) === alvoNorm);
    if (histClasse?.notasDisciplinas?.length) {
      const nd = histClasse.notasDisciplinas.find(n => {
        const hn = normalizarNomeDisciplina(n.disciplinaNome || '');
        return hn === nomeNorm || (hn.length >= 6 && (hn.includes(nomeNorm) || nomeNorm.includes(hn)));
      });
      if (nd && typeof nd.notaFinal === 'number') {
        return { ...empty, valorFinal: nd.notaFinal };
      }
    }

    // 3) Consultar matriz tabular do Histórico Completo (disciplinas.notasPorClasse)
    const discTab = histAl?.disciplinas?.find(d => {
      const dn = normalizarNomeDisciplina(d.disciplinaNome || '');
      return dn === nomeNorm || (dn.length >= 6 && (dn.includes(nomeNorm) || nomeNorm.includes(dn)));
    });
    if (discTab?.notasPorClasse) {
      const keyMatch = Object.keys(discTab.notasPorClasse).find(k => normalizarClasse(k) === alvoNorm);
      const valTab = keyMatch ? Number(discTab.notasPorClasse[keyMatch]) : NaN;
      if (!isNaN(valTab)) {
        return { ...empty, valorFinal: valTab };
      }
    }

    // 4) Consultar historicoMultiAno
    const multi = aluno.historicoMultiAno?.find(m => {
      const mn = normalizarNomeDisciplina(m.disciplinaNome || '');
      return mn === nomeNorm || (mn.length >= 6 && (mn.includes(nomeNorm) || nomeNorm.includes(mn)));
    });
    if (multi) {
      let multiVal: number | undefined;
      if (alvoNorm === '10ª' && typeof multi.nota10 === 'number') multiVal = multi.nota10;
      else if (alvoNorm === '11ª' && typeof multi.nota11 === 'number') multiVal = multi.nota11;
      else if (alvoNorm === '12ª' && typeof multi.nota12 === 'number') multiVal = multi.nota12;
      else if (!classeAlvo && typeof multi.mediaFinal === 'number') multiVal = multi.mediaFinal;
      if (typeof multiVal === 'number') {
        return { ...empty, valorFinal: multiVal };
      }
    }

    return empty;
  };

  // Wrapper para o aluno selecionado actualmente nos documentos individuais
  const resolverNotaRealAluno = (
    disc: Pick<Disciplina, 'id' | 'nome'>,
    classeAlvo?: string
  ) => resolverNotaRealParaAluno(alunoSelecionado, disc, classeAlvo);

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

  // Todos os recibos de emolumentos da escola para emissão em Folha A4 (8 por folha)
  const todosRecibosA4Escola = useMemo<ReciboEmolumentoA4Item[]>(() => {
    const lista: ReciboEmolumentoA4Item[] = [];
    const alunosMap = new Map(alunosPermitidos.map(a => [a.id, a]));
    const turmasMap = new Map(turmasPermitidas.map(t => [t.id, t]));

    const transacoes = dbService
      .getTransacoesFinanceiras(escola.id, selectedAnoLectivo)
      .filter(t => t.status !== 'Anulado');

    transacoes.forEach(t => {
      const al = alunosMap.get(t.alunoId);
      const tm = al ? turmasMap.get(al.turmaId) : undefined;
      const clTurma = tm ? `${tm.classe} • ${tm.nome}` : al?.classeId || '';
      lista.push({
        id: `tx-${t.id}`,
        numeroRecibo: t.numeroRecibo,
        alunoId: t.alunoId,
        alunoNome: t.alunoNome || al?.nomeCompleto || 'Estudante',
        codigoMatricula: al?.codigoMatricula || al?.numeroProcesso || '',
        classeTurma: clTurma,
        descricao: `${t.tipo}${t.mesReferencia ? ` (${t.mesReferencia})` : ''}`,
        valorKz: t.valorKz,
        multaKz: t.multaKz,
        valorTotalKz: t.valorTotalKz,
        metodoPagamento: t.metodoPagamento,
        numeroComprovativo: t.numeroComprovativo,
        dataHora: t.dataHora,
        operadorNome: t.operadorNome
      });
    });

    dbService
      .getRecibos()
      .filter(r => r.escolaId === escola.id)
      .forEach(r => {
        if (!lista.some(item => item.numeroRecibo === r.numeroRecibo)) {
          const al = alunosMap.get(r.alunoId);
          const tm = al ? turmasMap.get(al.turmaId) : undefined;
          const clTurma = tm ? `${tm.classe} • ${tm.nome}` : al?.classeId || '';
          lista.push({
            id: `rec-${r.id}`,
            numeroRecibo: r.numeroRecibo,
            alunoId: r.alunoId,
            alunoNome: r.alunoNome || al?.nomeCompleto || 'Estudante',
            codigoMatricula: al?.codigoMatricula || al?.numeroProcesso || '',
            classeTurma: clTurma,
            descricao: `Propina / Emolumento${r.mesReferencia ? ` (${r.mesReferencia})` : ''}`,
            valorKz: r.valorPagoKz,
            valorTotalKz: r.valorPagoKz,
            metodoPagamento: r.metodoPagamento,
            dataHora: r.dataHora,
            operadorNome: r.operadorNome
          });
        }
      });

    return lista;
  }, [escola.id, selectedAnoLectivo, alunosPermitidos, turmasPermitidas]);

  const recibosA4Filtrados = useMemo(() => {
    if (!buscaReciboA4.trim()) return todosRecibosA4Escola;
    return todosRecibosA4Escola.filter(r =>
      safeSearchMatch(r.alunoNome, buscaReciboA4) ||
      safeSearchMatch(r.numeroRecibo, buscaReciboA4) ||
      safeSearchMatch(r.descricao, buscaReciboA4) ||
      safeSearchMatch(r.codigoMatricula, buscaReciboA4)
    );
  }, [todosRecibosA4Escola, buscaReciboA4]);

  const recibosA4ParaEmitir = useMemo(() => {
    if (selectedRecibosA4Ids.length > 0) {
      return todosRecibosA4Escola.filter(r => selectedRecibosA4Ids.includes(r.id));
    }
    return recibosA4Filtrados.slice(0, 8);
  }, [todosRecibosA4Escola, selectedRecibosA4Ids, recibosA4Filtrados]);

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

  const camposDoc = useMemo(() => mesclarCamposDocumento(configAtual), [configAtual]);

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
      .replace(/Minist[eé]rio da Educa[çc][aã]o(?:\s+(?:de|da\s+Rep[uú]blica\s+de)\s+Angola)?/gi, '')
      .replace(/Normas Oficiais MED Angola/gi, '')
      .replace(/Documento Oficial de Tesouraria Escolar/gi, '')
      .replace(/OBRIGADO PELA PREFER[EÊ]NCIA/gi, '')
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
  const exibirAssinSecretariaDoc = dispConfig?.exibirAssinaturaSecretaria !== false;
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
      case 'passes':
        return passConfig.disposicaoGrade === 'individual'
          ? 'Passes Escolares (Individual)'
          : passConfig.disposicaoGrade === '4_por_folha'
          ? 'Passes Escolares (4 por Folha)'
          : 'Passes Escolares (8 por Folha)';
      case 'ficha_individual_aluno': return 'Ficha do Aluno';
      case 'ficha_individual_funcionario': return 'Ficha do Funcionário';
      case 'ficha_presencas': return 'Folha de Presenças';
      case 'recibos': return modoRecibo === 'a4_8' ? 'Recibos de Emolumentos (8 por Folha A4)' : 'Recibo Térmico POS';
      case 'termos_exame': return 'Termo de Exame';
      default: return 'Documento Oficial';
    }
  }, [docType, modoRecibo, passConfig.disposicaoGrade]);

  const handleBaixarPDF = async () => {
    if (docType === 'certificado_ciclo' && (!alunoSelecionado || !isClasseFinalCertificado(classeAlunoDoc))) {
      setPdfSuccessToast('Certificados só podem ser emitidos para alunos de classes finais (6ª, 9ª, 12ª ou 13ª Classe).');
      setTimeout(() => setPdfSuccessToast(null), 5000);
      return;
    }
    const el =
      document.getElementById('documento-para-impressao') ||
      document.getElementById('documento-lista-nominal-alunos');
    if (!el) {
      setPdfSuccessToast('Não foi possível localizar o documento visualizado para gerar o PDF.');
      setTimeout(() => setPdfSuccessToast(null), 4000);
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
        docType === 'passes' || (docType === 'recibos' && modoRecibo === 'a4_8')
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
    if (docType === 'certificado_ciclo' && (!alunoSelecionado || !isClasseFinalCertificado(classeAlunoDoc))) {
      setPdfSuccessToast('Certificados só podem ser emitidos para alunos de classes finais (6ª, 9ª, 12ª ou 13ª Classe).');
      setTimeout(() => setPdfSuccessToast(null), 5000);
      return;
    }
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
    if (docType === 'certificado_ciclo' && (!alunoSelecionado || !isClasseFinalCertificado(classeAlunoDoc))) {
      setPdfSuccessToast('Certificados só podem ser emitidos para alunos de classes finais (6ª, 9ª, 12ª ou 13ª Classe).');
      setTimeout(() => setPdfSuccessToast(null), 5000);
      return;
    }
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
      const triAlvo = boletimTrimestre === 'anual' ? undefined : boletimTrimestre;
      const discsBoletim = obterDisciplinasParaAlunoEClasse(alunoSelecionado, classeAlunoDoc, cursoAlunoDoc);
      exportarBoletimAlunoExcel({
        escola,
        aluno: alunoSelecionado,
        turma: turmaDoAluno || turmaSelecionada,
        trimestreLabel: boletimTrimestre === 'anual' ? 'Anual Completo' : `${boletimTrimestre}º Trimestre`,
        linhas: discsBoletim.map((disc) => {
          const r = resolverNotaRealParaAluno(alunoSelecionado, disc, classeAlunoDoc, triAlvo);
          return {
            disciplinaNome: disc.nome,
            mac: r.mac ?? undefined,
            npp: r.npp ?? undefined,
            npt: r.npt ?? undefined,
            mediaTrimestral: r.valorFinal ?? undefined
          };
        })
      });
      setPdfSuccessToast('Boletim em Excel (.xlsx) com fórmulas de média e aprovação gerado com sucesso!');
      setTimeout(() => setPdfSuccessToast(null), 5000);
    } else if (docType === 'pautas') {
      if (!turmaSelecionada) return;
      const anoDoc = turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo || '';
      if (pautaSubTipo === 'disciplina') {
        const discAtual = disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0];
        if (pautaDisciplinaPeriodo !== 'anual') {
          const triNum = Number(pautaDisciplinaPeriodo) as 1 | 2 | 3;
          const alvoNormDisc = normalizarNomeDisciplina(discAtual?.nome || '');
          const avsDisc = avaliacoesLocal.filter(av => {
            if (av.turmaId !== turmaSelecionada.id) return false;
            if (normalizarTrimestreNumero(av.trimestre) !== pautaDisciplinaPeriodo) return false;
            const avDiscNome = av.disciplinaNome || disciplinasCatalogoGlobal.find(d => d.id === av.disciplinaId)?.nome || '';
            const avNorm = normalizarNomeDisciplina(avDiscNome);
            return (
              (discAtual?.id && av.disciplinaId === discAtual.id) ||
              (alvoNormDisc !== '' && avNorm !== '' && (avNorm === alvoNormDisc || (avNorm.length >= 6 && alvoNormDisc.length >= 6 && (avNorm.includes(alvoNormDisc) || alvoNormDisc.includes(avNorm)))))
            );
          });
          exportarPautaTrimestralComFormulasExcel({
            escola,
            turma: turmaSelecionada,
            disciplina: discAtual,
            alunos: alunosDaTurma,
            avaliacoesDaTurma: avsDisc,
            notasAvaliacoes: notasAvaliacoesLocal,
            notasConsolidadas,
            trimestre: triNum,
            regraVigente: regraVigenteDocumento,
            provaProfessorAtiva,
            anoLectivo: anoDoc
          });
        } else {
          exportarPautaDisciplinaAnualExcel({
            escola,
            turma: turmaSelecionada,
            disciplina: discAtual,
            alunos: alunosDaTurma,
            notasConsolidadas,
            avaliacoes: avaliacoesLocal,
            notasAvaliacoes: notasAvaliacoesLocal,
            anoLectivo: anoDoc,
            provaProfessorAtiva,
            regraVigente: regraVigenteDocumento
          });
        }
      } else {
        exportarPautaGeralExcel({
          escola,
          turma: turmaSelecionada,
          alunos: alunosDaTurma,
          disciplinas: disciplinasDaClasseDocumento,
          notasConsolidadas,
          avaliacoes: avaliacoesLocal,
          notasAvaliacoes: notasAvaliacoesLocal,
          pautaSubTipo: pautaSubTipo === 'trimestral' ? 'trimestral' : 'geral_final',
          pautaTrimestre,
          anoLectivo: anoDoc,
          regraVigente: regraVigenteDocumento,
          provaProfessorAtiva
        });
      }
      setPdfSuccessToast('Pauta Oficial em Excel (.xlsx) com fórmulas de médias, percentagens e observações gerada com sucesso!');
      setTimeout(() => setPdfSuccessToast(null), 5000);
    } else if (docType === 'ficha_individual_funcionario') {
      const func = funcionarioSelecionado;
      if (!func) return;
      const podeVerSensiveis = visibilidadeUsuario.dadosSensiveis.verDadosSensiveisFuncionarios || func.id === currentUser?.id;
      const linhas = [{
        'Nome Completo': func.nomeCompleto,
        'Número BI': podeVerSensiveis ? func.numeroBI : '•••• (Restrito)',
        'Cargo': func.cargo,
        'Perfil Role': func.role,
        'Grau Académico': func.grauAcademico || func.habilitacoes,
        'Categoria Profissional': func.categoriaProfissional || 'Professor do IIº Ciclo',
        'Telefone': podeVerSensiveis ? func.telefone : '•••• (Restrito)',
        'Email': podeVerSensiveis ? func.email : '•••• (Restrito)',
        'IBAN': podeVerSensiveis ? (func.iban || '—') : '•••• (Restrito)',
        'Banco': podeVerSensiveis ? (func.banco || '—') : '•••• (Restrito)',
        'INSS': podeVerSensiveis ? (func.numeroSegurancaSocial || '—') : '•••• (Restrito)'
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

  // Cálculo da média geral real (sempre arredondada a inteiro) baseada estritamente nas disciplinas, classe e ano do aluno
  const mediaGeralCalculada = useMemo(() => {
    if (!alunoSelecionado) return '—';
    const valores = disciplinasDaClasseAluno
      .map(d => resolverNotaRealAluno(d, classeAlunoDoc).valorFinal)
      .filter((v): v is number => v !== null && !isNaN(v));
    if (valores.length > 0) {
      return String(Math.round(valores.reduce((acc, v) => acc + v, 0) / valores.length));
    }
    const alvoClsNorm = normalizarClasse(classeAlunoDoc);
    const notasOficiaisDaClasse = notasOficiaisAluno.filter((n: any) => {
      if (anoAlunoDoc && n.anoLectivo && n.anoLectivo !== anoAlunoDoc) return false;
      const tN = turmas.find(t => t.id === n.turmaId);
      const clN = normalizarClasse(tN?.classe || n.classeId || n.classe || '');
      if (clN && alvoClsNorm) return clN === alvoClsNorm;
      return !turmaDoAluno?.id || !n.turmaId || n.turmaId === turmaDoAluno.id;
    });
    if (notasOficiaisDaClasse.length > 0) {
      return String(Math.round(notasOficiaisDaClasse.reduce((acc: number, curr: any) => acc + (curr.notaFinal ?? curr.mediaTrimestral ?? 0), 0) / notasOficiaisDaClasse.length));
    }
    const notasDoAlunoDaClasse = notasDoAluno.filter((n: any) => {
      if (anoAlunoDoc && n.anoLectivo && n.anoLectivo !== anoAlunoDoc) return false;
      const tN = turmas.find(t => t.id === n.turmaId);
      const clN = normalizarClasse(tN?.classe || n.classeId || n.classe || '');
      if (clN && alvoClsNorm) return clN === alvoClsNorm;
      return !turmaDoAluno?.id || !n.turmaId || n.turmaId === turmaDoAluno.id;
    });
    if (notasDoAlunoDaClasse.length > 0) {
      return String(Math.round(notasDoAlunoDaClasse.reduce((acc: number, curr: any) => acc + (curr.mediaTrimestral || 0), 0) / notasDoAlunoDaClasse.length));
    }
    return '—';
  }, [alunoSelecionado, disciplinasDaClasseAluno, notasOficiaisAluno, notasDoAluno, historicoCompletoAluno, classeAlunoDoc, anoAlunoDoc, turmaDoAluno?.id, turmas]);

  const buildTemplateCtx = (extra?: Partial<DocumentTemplateContext>): DocumentTemplateContext => {
    const alAlvo = extra?.aluno !== undefined ? extra.aluno : (alunoDocAlinhado || alunoSelecionado);
    const turAlvo = extra?.turma !== undefined ? extra.turma : (turmaDoAluno || turmaSelecionada);
    const funcAlvo = extra?.funcionario !== undefined ? extra.funcionario : funcionarioSelecionado;
    return {
      escola,
      aluno: alAlvo,
      turma: turAlvo,
      funcionario: funcAlvo,
      diretor: funcionariosEscola.find(f => f.role === 'DiretorGeral') || ({ nomeCompleto: nomeDiretorGeral } as Funcionario),
      subdiretor: funcionariosEscola.find(f => f.role === 'SubdiretorPedagogico') || ({ nomeCompleto: subdirectorPedagogicoNome } as Funcionario),
      anoLectivo: extra?.anoLectivo || anoAlunoDoc || selectedAnoLectivo || escola.anoLectivoActivo,
      trimestre: extra?.trimestre || (boletimTrimestre === 'anual' ? 'Anual' : `${boletimTrimestre}º Trimestre`),
      livro: alAlvo?.livroRegisto,
      folha: alAlvo?.folhaRegisto,
      numeroRegisto: alAlvo?.numeroProcesso || alAlvo?.codigoMatricula,
      mediaGeral: extra?.mediaGeral ?? mediaGeralCalculada,
      situacaoFinal: extra?.situacaoFinal,
      camposDados: camposDoc
    };
  };

  const resolverTextoDiretor = (texto?: string, extra?: Partial<DocumentTemplateContext>): string => {
    const limpo = limparTextoSistema(texto);
    if (!limpo) return '';
    return interpolarTextoDocumento(limpo, buildTemplateCtx(extra));
  };

  const resolverCabecalhoPersonalizado = (extra?: Partial<DocumentTemplateContext>): string[] | null => {
    if (!cabecalhoLinhasDoc) return null;
    const ctx = buildTemplateCtx(extra);
    return cabecalhoLinhasDoc.map(l => interpolarTextoDocumento(l, ctx)).filter(Boolean);
  };

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
                <option value="padrao">Padrão (8 mm)</option>
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
              title="Gerar e descarregar ficheiro .PDF oficial de alta definição"
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

          {/* Opção de Disposição e Trimestre dos Boletins */}
          {docType === 'boletim_oficial' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700">Período:</span>
                <select
                  value={boletimTrimestre}
                  onChange={(e) => setBoletimTrimestre(e.target.value as any)}
                  className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs text-blue-900"
                >
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                  <option value="anual">Boletim Anual (1º, 2º, 3º T &amp; MFD)</option>
                </select>
              </div>
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

          {/* Opções de Formato, Disposição e Cores dos Passes Escolares (Personalização Institucional) */}
          {docType === 'passes' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-700">Modelo:</span>
                <select
                  value={passConfig.formatoLayout || 'classico_horizontal'}
                  onChange={(e) => {
                    const fmt = e.target.value as ConfiguracaoPassesEscola['formatoLayout'];
                    atualizarPassConfig({
                      formatoLayout: fmt,
                      orientacao: fmt === 'vertical_cracha' ? 'vertical' : 'horizontal'
                    });
                  }}
                  className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs text-slate-800"
                >
                  <option value="classico_horizontal">Clássico Institucional</option>
                  <option value="moderno_faixa">Moderno c/ Faixa Lateral</option>
                  <option value="bicolor_institucional">Topo Bicolor Escola</option>
                  <option value="vertical_cracha">Crachá Vertical</option>
                  <option value="minimalista_med">Minimalista Oficial</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-700">Folha:</span>
                <select
                  value={passConfig.disposicaoGrade || '8_por_folha'}
                  onChange={(e) => atualizarPassConfig({ disposicaoGrade: e.target.value as any })}
                  className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs text-slate-800"
                >
                  <option value="8_por_folha">8 Passes / Folha</option>
                  <option value="4_por_folha">4 Passes / Folha</option>
                  <option value="individual">1 Passe / Página</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-700">Faces:</span>
                <select
                  value={passVisualizacao}
                  onChange={(e) => setPassVisualizacao(e.target.value as any)}
                  className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs text-slate-800"
                >
                  <option value="frente">Apenas Frente</option>
                  <option value="verso">Apenas Verso</option>
                  <option value="ambos">Frente &amp; Verso</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-700">Cores:</span>
                {[
                  { id: 'azul', label: 'Azul', p: '#1e3a8a', s: '#d97706', f: '#ffffff' },
                  { id: 'verde', label: 'Verde', p: '#065f46', s: '#f59e0b', f: '#ffffff' },
                  { id: 'bordo', label: 'Bordô', p: '#881337', s: '#fbbf24', f: '#fff1f2' },
                  { id: 'ouro', label: 'Ouro', p: '#92400e', s: '#1e293b', f: '#fffbeb' },
                  { id: 'chumbo', label: 'Chumbo', p: '#1e293b', s: '#3b82f6', f: '#f8fafc' }
                ].map(pal => {
                  const ativo = passConfig.corPrimaria?.toLowerCase() === pal.p;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => atualizarPassConfig({ corPrimaria: pal.p, corSecundaria: pal.s, corBorda: pal.p, corFundoFrente: pal.f })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold text-white transition-transform cursor-pointer ${
                        ativo ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: pal.p }}
                    >
                      {pal.label}
                    </button>
                  );
                })}
                <input
                  type="color"
                  value={passConfig.corPrimaria || '#1e3a8a'}
                  onChange={(e) => atualizarPassConfig({ corPrimaria: e.target.value, corBorda: e.target.value })}
                  title="Cor Primária Personalizada da Escola"
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer bg-white"
                />
                <input
                  type="color"
                  value={passConfig.corSecundaria || '#d97706'}
                  onChange={(e) => atualizarPassConfig({ corSecundaria: e.target.value })}
                  title="Cor Secundária / Destaque"
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer bg-white"
                />
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
                Ano Lectivo: {anoAlunoDoc || selectedAnoLectivo}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                Classe: {classeAlunoDoc || turmaSelecionada?.classe || selectedClasse}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Sala: {getSalaDaTurma(turmaDoAluno || turmaSelecionada)}
              </span>
              {isSegundoCiclo(classeAlunoDoc || turmaSelecionada?.classe || selectedClasse) && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Curso: {cursoAlunoDoc || getCursoDaTurma(turmaDoAluno || turmaSelecionada)}
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
                  const turmasDoNovoAno = turmasPermitidas.filter(t => !t.anoLectivo || t.anoLectivo === novoAno);
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
                {todasClassesDocumento.map(cls => (
                  <option key={`doc-cl-${cls}`} value={cls}>{cls} {cls !== 'Iniciação' ? 'Classe' : ''}</option>
                ))}
              </select>
              {docType === 'certificado_ciclo' && (
                <p className="text-[10px] text-amber-800 font-semibold mt-1">
                  Emissão restrita às classes finais: 6ª, 9ª, 12ª e 13ª Classe.
                </p>
              )}
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

            {/* 4. Seletor específico por tipo de documento: Pautas / Lista Nominal (Curso só IIº Ciclo) / Aluno */}
            {docType === 'lista_nominal' ? (
              <div className={`sm:col-span-2 grid grid-cols-1 ${mostrarFiltroCursoDoc ? 'sm:grid-cols-2' : ''} gap-2`}>
                {mostrarFiltroCursoDoc && (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      4. Curso / Especialidade (IIº Ciclo)
                    </label>
                    <select
                      value={selectedCurso}
                      onChange={(e) => setSelectedCurso(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold text-purple-900 bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    >
                      <option value="TODOS">Todos os Cursos</option>
                      {cursosDisponiveisDocumento.map(cur => (
                        <option key={`doc-cur-${cur}`} value={cur}>{cur}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-end">
                  <div className="p-2 bg-blue-100/70 border border-blue-200 rounded-lg text-blue-900 w-full font-bold text-[11px]">
                    Lista Nominal: <strong>{alunosListaNominal.length} estudantes</strong> selecionados
                  </div>
                </div>
              </div>
            ) : docType === 'pautas' ? (
              <div className="sm:col-span-2 space-y-2 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200">
                <div className={`grid grid-cols-1 ${mostrarFiltroCursoDoc ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
                  {mostrarFiltroCursoDoc && (
                    <div>
                      <label className="font-bold text-gray-800 block mb-1 text-[11px]">Curso (IIº Ciclo)</label>
                      <select
                        value={selectedCurso}
                        onChange={(e) => setSelectedCurso(e.target.value)}
                        className="w-full p-1.5 border border-purple-300 bg-white font-bold rounded-lg text-xs text-purple-900 focus:outline-none"
                      >
                        <option value="TODOS">Todos os Cursos</option>
                        {cursosDisponiveisDocumento.map(cur => (
                          <option key={`pauta-cur-${cur}`} value={cur}>{cur}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-gray-800 block mb-1 text-[11px]">Tipo de Pauta Oficial</label>
                    <select
                      value={isProfessor && !isCoordenadorTurmaSelecionada ? 'disciplina' : pautaSubTipo}
                      onChange={(e) => setPautaSubTipo(e.target.value as any)}
                      disabled={isProfessor && !isCoordenadorTurmaSelecionada}
                      className="w-full p-1.5 border border-blue-400 bg-white font-bold rounded-lg text-xs text-blue-900 focus:outline-none disabled:opacity-80"
                    >
                      {(!isProfessor || isCoordenadorTurmaSelecionada) && (
                        <>
                          <option value="geral_final">Pauta Geral / Final Homologada</option>
                          <option value="trimestral">Pauta Trimestral Oficial</option>
                        </>
                      )}
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
                  {pautaSubTipo === 'trimestral' && (!isProfessor || isCoordenadorTurmaSelecionada) && (
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

                  {(pautaSubTipo === 'disciplina' || (isProfessor && !isCoordenadorTurmaSelecionada)) && (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold text-blue-900 shrink-0">Período:</span>
                        <div className="flex gap-1">
                          {(['1', '2', '3', 'anual'] as const).map(per => (
                            <button
                              key={`pauta-disc-per-${per}`}
                              type="button"
                              onClick={() => setPautaDisciplinaPeriodo(per)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                pautaDisciplinaPeriodo === per
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {per === 'anual' ? 'Anual' : `${per}º Tri`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[180px] flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold text-blue-900 shrink-0">Disciplina:</span>
                        <select
                          value={pautaDisciplinaId || disciplinasDaClasseDocumento[0]?.id || ''}
                          onChange={(e) => setPautaDisciplinaId(e.target.value)}
                          className="w-full p-1 border border-emerald-400 bg-white font-bold rounded text-xs text-emerald-950 focus:outline-none"
                        >
                          {disciplinasDaClasseDocumento.length === 0 ? (
                            <option value="">Sem disciplina atribuída nesta turma</option>
                          ) : (
                            disciplinasDaClasseDocumento.map(d => (
                              <option key={d.id} value={d.id}>{d.nome}</option>
                            ))
                          )}
                        </select>
                      </div>
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
                    const novoId = e.target.value;
                    setSelectedAlunoId(novoId);
                    const al = alunosFiltradosIndividual.find(a => a.id === novoId) || alunos.find(a => a.id === novoId);
                    const ctxNovo = resolverContextoAlunoNoAno(al, selectedAnoLectivo);
                    const turmaAlId = ctxNovo?.turma?.id || al?.turmaId;
                    if (turmaAlId && turmasDaClasseSelecionada.some(t => t.id === turmaAlId)) {
                      setSelectedTurmaId(turmaAlId);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {alunosFiltradosIndividual.map(a => {
                    const ctxOp = resolverContextoAlunoNoAno(a, selectedAnoLectivo);
                    const clOp = ctxOp?.classe || a.classeId;
                    const turOp = ctxOp?.turma?.nome ? ` • ${ctxOp.turma.nome}` : '';
                    return (
                      <option key={a.id} value={a.id}>
                        {a.nomeCompleto} — Proc. {a.numeroProcesso || a.codigoMatricula} ({clOp}{turOp})
                      </option>
                    );
                  })}
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

          {/* Seletor de Formato A4 (8/Folha) ou POS para Recibos */}
          {docType === 'recibos' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-gray-800">Formato de Emissão de Recibos de Emolumentos</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModoRecibo('a4_8')}
                    className={`px-3 py-1 font-bold rounded-lg border cursor-pointer ${
                      modoRecibo === 'a4_8' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    Folha A4 (8 por Folha)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoRecibo('pos')}
                    className={`px-3 py-1 font-bold rounded-lg border cursor-pointer ${
                      modoRecibo === 'pos' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    Térmico POS
                  </button>
                </div>
              </div>

              {modoRecibo === 'a4_8' ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={buscaReciboA4}
                      onChange={(e) => setBuscaReciboA4(sanitizeSearchInput(e.target.value, 60))}
                      placeholder="Filtrar recibos por estudante, nº recibo ou descrição..."
                      className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedRecibosA4Ids(recibosA4Filtrados.slice(0, 8).map(r => r.id))}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-emerald-50 rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Selecionar 8 Recibos
                    </button>
                    {selectedRecibosA4Ids.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedRecibosA4Ids([])}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-rose-50 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Limpar ({selectedRecibosA4Ids.length})
                      </button>
                    )}
                  </div>
                  {recibosA4Filtrados.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {recibosA4Filtrados.map(r => {
                        const checked = selectedRecibosA4Ids.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() =>
                              setSelectedRecibosA4Ids(prev =>
                                prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                              )
                            }
                            className={`text-left p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                              checked
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex justify-between gap-1 font-mono text-[10px]">
                              <span>{r.numeroRecibo}</span>
                              <span className="text-emerald-800">{r.valorTotalKz.toLocaleString('pt-AO')} Kz</span>
                            </div>
                            <div className="truncate font-semibold">{r.alunoNome}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div>
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
      {/* 1. BOLETIM DE NOTAS TRIMESTRAL / ANUAL (1, 2 OU 4 POR FOLHA A4 + LOTE)    */}
      {/* ========================================================================= */}
      {docType === 'boletim_oficial' && (() => {
        const listaBoletim = alunosParaImprimir;
        if (listaBoletim.length === 0) {
          return (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">Nenhum Estudante Selecionado para o Boletim</h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecione um estudante, ou mude para o modo Individual/Turma/Classe com discentes matriculados.
              </p>
            </div>
          );
        }

        const perPage = layoutBoletim === '4_por_folha' ? 4 : layoutBoletim === '2_por_folha' ? 2 : 1;
        const paginasBoletim: Aluno[][] = [];
        for (let i = 0; i < listaBoletim.length; i += perPage) {
          paginasBoletim.push(listaBoletim.slice(i, i + perPage));
        }

        const isCompact4 = layoutBoletim === '4_por_folha';
        const isHalf2 = layoutBoletim === '2_por_folha';
        const tituloBaseConfig = limparTextoSistema(configAtual?.tituloOficial);
        const tituloBoletimOficial =
          tituloBaseConfig && tituloBaseConfig !== 'BOLETIM OFICIAL' ? tituloBaseConfig : 'BOLETIM DE NOTAS';

        const renderBoletimCard = (alunoAlvo: Aluno) => {
          const turmaAl = turmas.find(t => t.id === alunoAlvo.turmaId);
          const classeAl = turmaAl?.classe || alunoAlvo.classeId || selectedClasse || '';
          const ehIIAl = isSegundoCiclo(classeAl);
          const cursoAl = ehIIAl ? (turmaAl?.curso || alunoAlvo.curso || '').trim() : '';
          const anoAl = alunoAlvo.anoLectivo || alunoAlvo.anoMatricula || turmaAl?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo || '—';
          const escalaAl = obterInformacaoEscala(classeAl, turmaAl?.nivelEnsino);
          const disciplinasAl = obterDisciplinasParaAlunoEClasse(alunoAlvo, classeAl, cursoAl);
          const triAlvo = boletimTrimestre === 'anual' ? undefined : boletimTrimestre;
          const regraAlvo = obterRegraParaClasse(classeAl, boletimTrimestre === 'anual' ? 3 : boletimTrimestre, turmaAl?.nivelEnsino);

          const linhasNotas = disciplinasAl.map(disc => {
            const res = resolverNotaRealParaAluno(alunoAlvo, disc, classeAl, triAlvo);
            return { disc, ...res };
          });

          const valoresMedia = linhasNotas
            .map(l => l.valorFinal)
            .filter((v): v is number => v !== null && !isNaN(v));
          const mediaGeralNum =
            valoresMedia.length > 0
              ? Math.round(valoresMedia.reduce((a, b) => a + b, 0) / valoresMedia.length)
              : null;
          const mediaGeralStr = mediaGeralNum !== null ? String(mediaGeralNum) : '—';

          // Cálculo rigoroso do Comportamento (Geral) em classificação quantitativa e qualitativa: ex. "14 (Bom)"
          const notasConsolidadasAluno = notasConsolidadas.filter(n => {
            if (n.alunoId !== alunoAlvo.id) return false;
            if (triAlvo && normalizarTrimestreNumero(n.trimestre) !== triAlvo) return false;
            if (anoAl && anoAl !== '—' && n.anoLectivo && n.anoLectivo !== anoAl) return false;
            return true;
          });
          const compNotasNum = notasConsolidadasAluno
            .map(n => n.comportamentoNota)
            .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
          const conceitoMapParaNota = (conceito?: string): number | null => {
            if (!conceito) return null;
            const c = conceito.toLowerCase().trim();
            const fator = escalaAl.escalaMaxima === 10 ? 0.5 : 1;
            if (c.includes('excelente') || c.includes('muito bom')) return Math.round(18 * fator);
            if (c.includes('bom')) return Math.round(14 * fator);
            if (c.includes('suficiente') || c.includes('regular')) return Math.round(11 * fator);
            if (c.includes('insuficiente') || c.includes('mau')) return Math.round(7 * fator);
            return null;
          };
          const compQuantRaw =
            compNotasNum.length > 0
              ? Math.round(compNotasNum.reduce((a, b) => a + b, 0) / compNotasNum.length)
              : conceitoMapParaNota(alunoAlvo.comportamentoConceito || linhasNotas.find(l => l.comportamentoConceito)?.comportamentoConceito);
          const compQualitativo =
            compQuantRaw !== null
              ? converterComportamentoParaConceito(compQuantRaw, escalaAl.escalaMaxima)
              : (alunoAlvo.comportamentoConceito || linhasNotas.find(l => l.comportamentoConceito)?.comportamentoConceito || '');
          const comportamentoGeralTexto =
            compQuantRaw !== null
              ? `${compQuantRaw} (${compQualitativo})`
              : (compQualitativo || '—');

          const obsGeralBoletim = obterObservacaoPautaGeral(
            linhasNotas.map(l => l.valorFinal),
            classeAl,
            alunoAlvo.estado,
            regraAlvo
          );

          const coordNome = obterNomeCoordenadorTurma(turmaAl, funcionariosEscola);
          const coordTitulo = obterTituloCoordenadorTurma(turmaAl, funcionariosEscola);

          return (
            <div
              key={alunoAlvo.id}
              className={`bg-white border-2 border-gray-900 text-black flex flex-col justify-between box-border ${
                isCompact4
                  ? 'p-2 rounded-lg text-[8.5px] leading-tight min-h-[420px]'
                  : isHalf2
                  ? 'p-2.5 rounded-lg text-[9.5px] leading-snug min-h-[430px]'
                  : 'p-5 sm:p-6 rounded-xl text-[11px] leading-normal'
              }`}
            >
              <div>
                {/* Cabeçalho Estruturado em 3 Zonas (Zero Sobreposição) */}
                <div
                  data-pdf-fixed-header="true"
                  className={`grid grid-cols-[auto_1fr_auto] items-start gap-2 border-b-2 border-black ${
                    isCompact4 ? 'pb-1.5 mb-1.5' : isHalf2 ? 'pb-1.5 mb-1.5' : 'pb-3 mb-2.5'
                  }`}
                >
                  {/* VISTO DO DIRECTOR GERAL (100% Centralizado no Retângulo) */}
                  {exibirAssinDiretorDoc ? (
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        data-boletim-visto="true"
                        className={`border border-black rounded bg-white text-center flex flex-col items-center justify-center ${
                          isCompact4 ? 'w-[104px] px-1.5 py-1.5' : isHalf2 ? 'w-[128px] px-2 py-1.5' : 'w-[150px] px-2.5 py-2'
                        }`}
                      >
                        <div className="w-full text-center font-black uppercase text-[7.5px] tracking-wide leading-[1.25]">
                          VISTO
                        </div>
                        <p className="w-full text-center text-[6.5px] font-bold text-gray-800 whitespace-normal break-words leading-[1.25] mt-0.5">
                          {tituloDiretorGeral}
                        </p>
                        <div className={`w-full ${isCompact4 ? 'h-4' : 'h-5'} my-1 flex items-center justify-center border-b border-gray-600`}>
                          {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                            <img
                              src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl}
                              alt="Assinatura Director"
                              className={`${isCompact4 ? 'max-h-3.5' : 'max-h-4'} mx-auto object-contain`}
                            />
                          ) : (
                            <span className="text-[6px] text-gray-400 italic font-mono">[Assinatura]</span>
                          )}
                        </div>
                        <p className="w-full text-center text-[6.5px] font-bold text-gray-950 whitespace-normal break-words leading-[1.25]">
                          {nomeDiretorGeral}
                        </p>
                      </div>
                      {!isCompact4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssinaturaPreview(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl || '');
                            setShowAssinaturaModal(true);
                          }}
                          className="no-print mt-0.5 text-[7.5px] text-blue-700 font-bold hover:underline cursor-pointer"
                        >
                          Alterar assinatura
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-4" />
                  )}

                  {/* Centro: Insígnia + Dizeres Oficiais + Escola */}
                  <div data-pdf-center-insignia="true" className="text-center min-w-0 px-1">
                    {exibirInsigniaDoc && (
                      <div className="flex justify-center mb-0.5">
                        {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                          <img
                            src={configSistema.insigniaNacionalUrl}
                            alt="Insígnia da República de Angola"
                            className={`${isCompact4 ? 'h-7 w-7' : isHalf2 ? 'h-9 w-9' : 'h-12 w-12'} object-contain mx-auto`}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <InsigniaAngola size={isCompact4 ? 26 : isHalf2 ? 34 : 46} />
                        )}
                      </div>
                    )}
                    {(() => {
                      const cabLinhas = resolverCabecalhoPersonalizado({ aluno: alunoAlvo, turma: turmaAl, anoLectivo: anoAl, mediaGeral: mediaGeralStr });
                      if (cabLinhas) {
                        return cabLinhas.map((linha, idx) => (
                          <p
                            key={idx}
                            className={`${
                              isCompact4 ? 'text-[7.5px]' : isHalf2 ? 'text-[8.5px]' : 'text-[10px]'
                            } ${idx === 0 ? 'font-black' : 'font-bold'} uppercase leading-tight`}
                          >
                            {linha}
                          </p>
                        ));
                      }
                      return (
                        <>
                          <p className={`${isCompact4 ? 'text-[7.5px]' : 'text-[10px]'} font-black uppercase leading-tight`}>
                            REPÚBLICA DE ANGOLA
                          </p>
                          {camposDoc.mostrarGovernoGabinete && !isCompact4 && (
                            <p className="text-[8.5px] font-bold uppercase leading-tight">
                              {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${(escola.provincia || 'LUANDA').toUpperCase()}`}
                            </p>
                          )}
                          {camposDoc.mostrarGovernoGabinete && (
                            <p className={`${isCompact4 ? 'text-[7px]' : 'text-[9px]'} font-bold uppercase leading-tight`}>
                              {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    <h2
                      className={`${isCompact4 ? 'text-[9px]' : isHalf2 ? 'text-[11px]' : 'text-sm'} font-black uppercase mt-0.5 leading-tight`}
                      style={{ color: corDestaqueDoc }}
                    >
                      {escola.nomeOficial}
                    </h2>
                    {camposDoc.mostrarProvinciaMunicipio && !isCompact4 && (escola.municipio || escola.provincia) && (
                      <p className="text-[8px] text-gray-600 font-semibold">
                        {[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <div className={isCompact4 ? 'mt-1' : 'mt-1.5'}>
                      <span
                        className={`inline-flex items-center justify-center font-black uppercase border border-black bg-gray-50 leading-[1.3] ${
                          isCompact4 ? 'text-[7.5px] px-2 py-0.5' : isHalf2 ? 'text-[9px] px-2.5 py-1' : 'text-xs px-3 py-1'
                        }`}
                      >
                        {resolverTextoDiretor(tituloBoletimOficial, { aluno: alunoAlvo, turma: turmaAl, anoLectivo: anoAl })} — {boletimTrimestre === 'anual' ? 'ANUAL' : `${boletimTrimestre}º TRIMESTRE`} • {anoAl}
                      </span>
                    </div>
                  </div>

                  {/* Direita: Logotipo da Escola */}
                  {exibirLogoEscolaDoc ? (
                    <div className="shrink-0">
                      <img
                        src={escola.logotipoUrl || escola.logotipo}
                        alt={`Logotipo ${escola.nomeOficial}`}
                        className={`${isCompact4 ? 'h-9 w-9' : isHalf2 ? 'h-11 w-11' : 'h-14 w-14'} object-contain rounded border border-gray-200 print:border-none`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-4" />
                  )}
                </div>

                {/* Identificação Estruturada do Estudante (Apenas campos selecionados pela Direcção) */}
                <div
                  data-pdf-fixed-student="true"
                  data-pdf-student-row="true"
                  className={`flex items-center gap-2 border-b border-black ${isCompact4 ? 'pb-1.5' : 'pb-2'}`}
                >
                  {camposDoc.mostrarFoto && alunoAlvo.fotoUrl && !isCompact4 && (
                    <img
                      src={alunoAlvo.fotoUrl}
                      alt={alunoAlvo.nomeCompleto}
                      className="h-11 w-9 object-cover rounded border border-gray-400 shrink-0"
                    />
                  )}
                  <div
                    data-pdf-student-grid={isCompact4 ? '3' : '4'}
                    className={`flex-1 min-w-0 grid ${
                      isCompact4 ? 'grid-cols-3 gap-x-2 gap-y-1 text-[8px]' : 'grid-cols-4 gap-x-3 gap-y-1.5 text-[10px]'
                    }`}
                  >
                    <div className="col-span-2 min-w-0 pr-2">
                      <span className="text-gray-600">{alunoAlvo.genero === 'F' ? 'Aluna: ' : 'Aluno: '}</span>
                      <strong className="uppercase">{alunoAlvo.nomeCompleto}</strong>
                    </div>
                    {camposDoc.mostrarNumeroOrdem && !isCompact4 && (
                      <div className="text-center whitespace-nowrap">
                        <span className="text-gray-600">N.º Ordem: </span>
                        <strong className="font-mono">{alunoAlvo.numeroOrdem || '—'}</strong>
                      </div>
                    )}
                    {camposDoc.mostrarNumeroProcessoMatricula && (
                      <div
                        className={`${
                          !isCompact4 && !camposDoc.mostrarNumeroOrdem ? 'col-span-2 ' : ''
                        }text-right justify-self-end whitespace-nowrap`}
                      >
                        <span className="text-gray-600">Matrícula: </span>
                        <strong className="font-mono">{alunoAlvo.codigoMatricula || alunoAlvo.numeroProcesso || '—'}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Classe: </span>
                      <strong>{classeAl || '—'}</strong>
                    </div>
                    {camposDoc.mostrarTurmaSalaTurno && (
                      <>
                        <div>
                          <span className="text-gray-600">Turma: </span>
                          <strong>{turmaAl?.nome || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-gray-600">Turno: </span>
                          <strong>{turmaAl?.turno || alunoAlvo.periodo || '—'}</strong>
                        </div>
                        {!isCompact4 && (
                          <div>
                            <span className="text-gray-600">Sala: </span>
                            <strong>{turmaAl?.sala || '—'}</strong>
                          </div>
                        )}
                      </>
                    )}
                    {camposDoc.mostrarCurso && ehIIAl && cursoAl && (
                      <div className={isCompact4 ? 'col-span-3' : 'col-span-4'}>
                        <span className="text-gray-600">Curso: </span>
                        <strong>{cursoAl}</strong>
                      </div>
                    )}
                    {camposDoc.mostrarEncarregado && !isCompact4 && (alunoAlvo.encarregadoNome || alunoAlvo.nomeEncarregado) && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Encarregado: </span>
                        <strong>{alunoAlvo.encarregadoNome || alunoAlvo.nomeEncarregado}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabela de Disciplinas e Notas Sem Cortes, Sem Sobreposição de Linhas e Células Centralizadas */}
                <div className={`${isCompact4 ? 'pt-1.5' : 'pt-2'} w-full`}>
                  {(() => {
                    const totalColunasTabela =
                      boletimTrimestre === 'anual'
                        ? 1 + 4 + (camposDoc.mostrarFaltas ? 1 : 0) + (camposDoc.mostrarSituacaoFinal ? 1 : 0)
                        : 1 +
                          (camposDoc.mostrarMacNppNptDetalhado ? (provaProfessorAtiva ? 3 : 2) : 0) +
                          1 +
                          (camposDoc.mostrarFaltas ? 1 : 0) +
                          (camposDoc.mostrarComportamento && !isCompact4 ? 1 : 0);
                    const headPadDisc = isCompact4 ? 'px-1.5 py-1' : isHalf2 ? 'px-2 py-1.5' : 'px-2.5 py-2';
                    const headPadNum = isCompact4 ? 'px-1 py-1' : isHalf2 ? 'px-1.5 py-1.5' : 'px-2 py-2';
                    const cellPadDisc = isCompact4 ? 'px-1.5 py-1' : isHalf2 ? 'px-2 py-1.5' : 'px-2.5 py-1.5';
                    const cellPadNum = isCompact4 ? 'px-1 py-1' : isHalf2 ? 'px-1.5 py-1.5' : 'px-2 py-1.5';

                    return (
                      <table
                        className={`w-full table-auto border border-black border-collapse ${
                          isCompact4 ? 'text-[8px]' : isHalf2 ? 'text-[9.5px]' : 'text-[10.5px]'
                        }`}
                      >
                        <thead className="bg-gray-100 font-bold text-center">
                          {boletimTrimestre === 'anual' ? (
                            <tr>
                              <th className={`${headPadDisc} ${isCompact4 ? 'min-w-[88px]' : 'min-w-[130px]'} border border-black text-left align-middle whitespace-normal break-words leading-[1.3]`}>DISCIPLINA</th>
                              <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>1ºT</th>
                              <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>2ºT</th>
                              <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>3ºT</th>
                              <th className={`${headPadNum} border border-black bg-gray-200 text-center align-middle whitespace-nowrap leading-[1.3]`}>MFD</th>
                              {camposDoc.mostrarFaltas && (
                                <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>Faltas</th>
                              )}
                              {camposDoc.mostrarSituacaoFinal && (
                                <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>Sit.</th>
                              )}
                            </tr>
                          ) : (
                            <tr>
                              <th className={`${headPadDisc} ${isCompact4 ? 'min-w-[88px]' : 'min-w-[130px]'} border border-black text-left align-middle whitespace-normal break-words leading-[1.3]`}>DISCIPLINA</th>
                              {camposDoc.mostrarMacNppNptDetalhado && (
                                <>
                                  <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>MAC{boletimTrimestre}</th>
                                  {provaProfessorAtiva && (
                                    <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>NPP{boletimTrimestre}</th>
                                  )}
                                  <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>NPT{boletimTrimestre}</th>
                                </>
                              )}
                              <th className={`${headPadNum} border border-black bg-gray-200 text-center align-middle whitespace-nowrap leading-[1.3]`}>MT{boletimTrimestre}</th>
                              {camposDoc.mostrarFaltas && (
                                <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>N.º F</th>
                              )}
                              {camposDoc.mostrarComportamento && !isCompact4 && (
                                <th className={`${headPadNum} border border-black text-center align-middle whitespace-nowrap leading-[1.3]`}>Comport.</th>
                              )}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {linhasNotas.length > 0 ? (
                            <>
                              {linhasNotas.map(({ disc, mac, npp, npt, mt1, mt2, mt3, valorFinal, faltas, comportamentoConceito }) => {
                                if (boletimTrimestre === 'anual') {
                                  const obsDisc = obterObservacaoDisciplina(valorFinal, classeAl, alunoAlvo.estado, regraAlvo);
                                  return (
                                    <tr key={disc.id}>
                                      <td className={`${cellPadDisc} border border-black text-left align-middle font-semibold whitespace-normal break-words leading-[1.35]`}>
                                        {disc.nome}
                                      </td>
                                      <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                        {mt1 !== null ? mt1.toFixed(1) : '—'}
                                      </td>
                                      <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                        {mt2 !== null ? mt2.toFixed(1) : '—'}
                                      </td>
                                      <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                        {mt3 !== null ? mt3.toFixed(1) : '—'}
                                      </td>
                                      <td className={`${cellPadNum} border border-black text-center align-middle font-mono font-black tabular-nums bg-gray-50 leading-[1.35]`}>
                                        {valorFinal !== null ? Math.round(valorFinal) : '—'}
                                      </td>
                                      {camposDoc.mostrarFaltas && (
                                        <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                          {faltas}
                                        </td>
                                      )}
                                      {camposDoc.mostrarSituacaoFinal && (
                                        <td className={`${cellPadNum} border border-black text-center align-middle font-bold whitespace-normal break-words leading-[1.35]`}>
                                          {obsDisc.categoria === 'Pendente' ? '—' : obterSituacaoTextoPorGenero(obsDisc.texto, alunoAlvo.genero)}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={disc.id}>
                                    <td className={`${cellPadDisc} border border-black text-left align-middle font-semibold whitespace-normal break-words leading-[1.35]`}>
                                      {disc.nome}
                                    </td>
                                    {camposDoc.mostrarMacNppNptDetalhado && (
                                      <>
                                        <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                          {mac !== null ? mac.toFixed(1) : '—'}
                                        </td>
                                        {provaProfessorAtiva && (
                                          <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                            {npp !== null ? npp.toFixed(1) : '—'}
                                          </td>
                                        )}
                                        <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                          {npt !== null ? npt.toFixed(1) : '—'}
                                        </td>
                                      </>
                                    )}
                                    <td className={`${cellPadNum} border border-black text-center align-middle font-mono font-black tabular-nums bg-gray-50 leading-[1.35]`}>
                                      {valorFinal !== null ? valorFinal.toFixed(1) : '—'}
                                    </td>
                                    {camposDoc.mostrarFaltas && (
                                      <td className={`${cellPadNum} border border-black text-center align-middle font-mono tabular-nums leading-[1.35]`}>
                                        {faltas}
                                      </td>
                                    )}
                                    {camposDoc.mostrarComportamento && !isCompact4 && (
                                      <td className={`${cellPadNum} border border-black text-center align-middle whitespace-normal break-words leading-[1.35]`}>
                                        {comportamentoConceito || alunoAlvo.comportamentoConceito || '—'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                              {/* Comportamento (Geral) imediatamente após todas as disciplinas */}
                              <tr className="bg-emerald-50/70 font-bold">
                                <td className={`${cellPadDisc} border border-black text-left align-middle uppercase leading-[1.35]`}>
                                  Comportamento (Geral)
                                </td>
                                <td
                                  colSpan={Math.max(1, totalColunasTabela - 1)}
                                  className={`${cellPadNum} border border-black text-center align-middle font-black text-emerald-950 leading-[1.35]`}
                                >
                                  {comportamentoGeralTexto}
                                </td>
                              </tr>
                            </>
                          ) : (
                            <tr>
                              <td colSpan={totalColunasTabela} className="p-3 border border-black text-center align-middle text-gray-500">
                                Nenhuma disciplina configurada para esta classe.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>

              {/* Sumário, Data Angolana, QR e Assinaturas (Título -> Linha -> Nome) */}
              <div className={isCompact4 ? 'pt-1.5 mt-1.5 border-t border-black' : 'pt-3 mt-3 border-t border-black'}>
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    {camposDoc.mostrarMediaGeral && (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-bold">
                          {boletimTrimestre === 'anual' ? 'Média Geral Anual:' : `Média Geral (${boletimTrimestre}º Tri):`}
                        </span>
                        <span
                          className={`inline-flex items-center justify-center font-mono font-black text-blue-900 bg-blue-50 border border-blue-400 rounded leading-[1.3] ${
                            isCompact4 ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-sm'
                          }`}
                        >
                          {mediaGeralStr !== '—' ? `${mediaGeralStr} / ${escalaAl.escalaMaxima} Val.` : '—'}
                        </span>
                      </div>
                    )}
                    {camposDoc.mostrarSituacaoFinal && (
                      <p className="text-gray-800">
                        <strong>Observação:</strong>{' '}
                        {obsGeralBoletim.categoria === 'Pendente'
                          ? 'Sem notas lançadas'
                          : obsGeralBoletim.categoria === 'Desistente' || obsGeralBoletim.categoria === 'Transferido'
                          ? obterSituacaoTextoPorGenero(obsGeralBoletim.texto, alunoAlvo.genero)
                          : obsGeralBoletim.categoria === 'Aprovado'
                          ? `Aproveitamento Positivo (${alunoAlvo.genero === 'F' ? 'Aprovada' : 'Aprovado'})`
                          : `${obterSituacaoTextoPorGenero(obsGeralBoletim.texto, alunoAlvo.genero)} (${obsGeralBoletim.totalNegativas} neg.)`}
                      </p>
                    )}
                    {camposDoc.mostrarDataLocalExtenso && (
                      <p className="text-gray-600" style={{ fontSize: isCompact4 ? '7.5px' : '9px' }}>
                        {escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.
                      </p>
                    )}
                    {resolverTextoDiretor(configAtual?.textoRodape, { aluno: alunoAlvo, turma: turmaAl, anoLectivo: anoAl, mediaGeral: mediaGeralStr }) && !isCompact4 && (
                      <p className="text-gray-600 text-[9px] italic">
                        {resolverTextoDiretor(configAtual?.textoRodape, { aluno: alunoAlvo, turma: turmaAl, anoLectivo: anoAl, mediaGeral: mediaGeralStr })}
                      </p>
                    )}
                  </div>

                  {exibirCodigoQrDoc && (
                    <div className="shrink-0">
                      <OfficialQrCode
                        value={gerarPayloadQrDocumento({
                          docType: 'BOLETIM_OFICIAL',
                          escolaId: escola.id,
                          docRef: `${alunoAlvo.codigoMatricula}-${boletimTrimestre === 'anual' ? 'ANUAL' : `${boletimTrimestre}T`}`,
                          alunoId: alunoAlvo.id,
                          alunoNome: alunoAlvo.nomeCompleto,
                          turmaId: turmaAl?.id,
                          anoLectivo: anoAl
                        })}
                        size={isCompact4 ? 38 : isHalf2 ? 46 : 58}
                      />
                    </div>
                  )}
                </div>

                {/* Assinaturas Oficiais: Título -> Traço -> Nome */}
                <div
                  data-pdf-fixed-signatures="true"
                  className={`grid grid-cols-2 gap-3 text-center ${
                    isCompact4 ? 'pt-2 mt-1.5 text-[7.5px]' : isHalf2 ? 'pt-2.5 mt-1.5 text-[8.5px]' : 'pt-6 mt-4 text-[11px]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-950 uppercase whitespace-normal break-words">{coordTitulo}</p>
                    <div className={isCompact4 ? 'h-3' : isHalf2 ? 'h-4' : 'h-6'} />
                    <div className={`${isCompact4 ? 'w-28' : isHalf2 ? 'w-36' : 'w-48'} border-b border-black mx-auto my-1`} />
                    <p className="font-bold text-gray-900 uppercase whitespace-normal break-words leading-tight">{coordNome}</p>
                  </div>
                  {exibirAssinSubdiretorDoc && (
                    <div className="min-w-0">
                      <p className="font-bold text-gray-950 uppercase whitespace-normal break-words">{getTituloSubPedagogico(escola)}</p>
                      <div className={isCompact4 ? 'h-3' : isHalf2 ? 'h-4' : 'h-6'} />
                      <div className={`${isCompact4 ? 'w-28' : isHalf2 ? 'w-36' : 'w-48'} border-b border-black mx-auto my-1`} />
                      <p className="font-bold text-gray-900 uppercase whitespace-normal break-words leading-tight">{subdirectorPedagogicoNome}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        };

        return (
          <div id="documento-para-impressao" data-doc-root="true" className={`space-y-4 ${fontScaleClassDoc}`}>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 no-print flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto">
              <div>
                <strong>Boletins de Notas ({boletimTrimestre === 'anual' ? 'Anual' : `${boletimTrimestre}º Trimestre`}):</strong>{' '}
                {listaBoletim.length} estudante(s) em {paginasBoletim.length} folha(s) {formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'} ({layoutBoletim.replace(/_/g, ' ')}).
              </div>
              {modoEmissao === 'individual' && (
                <span className="text-[11px] font-semibold text-blue-700">
                  Dica: Mude para &quot;Em Lote (Turma Completa)&quot; acima para gerar todos os boletins da turma de uma só vez.
                </span>
              )}
            </div>

            {paginasBoletim.map((grupo, pIdx) => (
              <div
                key={`boletim-page-${pIdx}`}
                data-pdf-page="true"
                className={`documento-oficial-print bg-white mx-auto ${
                  layoutBoletim === '1_por_folha' ? 'max-w-[794px]' : 'max-w-[820px] p-2 sm:p-3 border border-dashed border-gray-300 rounded-xl print:border-none print:p-0'
                }`}
              >
                {layoutBoletim === '4_por_folha' ? (
                  <div className="boletins-grid-4 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-2.5 print:gap-2">
                    {grupo.map(al => renderBoletimCard(al))}
                  </div>
                ) : layoutBoletim === '2_por_folha' ? (
                  <div className="space-y-3">
                    {grupo.map((al, i) => (
                      <React.Fragment key={al.id}>
                        {i > 0 && (
                          <div className="flex items-center gap-2 text-[9px] text-gray-400">
                            <div className="flex-1 border-t border-dashed border-gray-400" />
                            <span>✂ CORTE</span>
                            <div className="flex-1 border-t border-dashed border-gray-400" />
                          </div>
                        )}
                        {renderBoletimCard(al)}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  grupo.map(al => renderBoletimCard(al))
                )}
              </div>
            ))}
          </div>
        );
      })()}

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
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 border-b-2 border-black pb-3 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
            {(() => {
              const cabPauta = resolverCabecalhoPersonalizado({ turma: turmaSelecionada });
              if (cabPauta) {
                return cabPauta.map((linha, idx) => (
                  <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                    {linha}
                  </p>
                ));
              }
              return (
                <>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                  {camposDoc.mostrarGovernoGabinete && (
                    <>
                      <p className="text-[11px] font-bold uppercase text-gray-800">
                        {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}
                      </p>
                      <p className="text-[11px] font-bold uppercase text-gray-800">
                        {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                      </p>
                    </>
                  )}
                </>
              );
            })()}
            <h2 className="text-base sm:text-lg font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
              {escola.nomeOficial}
            </h2>
            {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
              <p className="text-[10px] text-gray-600 font-semibold">
                {[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}
              </p>
            )}

            {/* Distinção Rigorosa: Pauta Geral/Final vs Trimestral vs Por Disciplina */}
            <div className="pt-2">
              <div className="space-y-1">
                <span className="text-sm sm:text-base font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-blue-50 text-blue-950 tracking-wider">
                  {pautaSubTipo === 'disciplina' ? (
                    `PAUTA DA DISCIPLINA DE ${(disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0])?.nome?.toUpperCase() || 'DISCIPLINA'} — ${pautaDisciplinaPeriodo === 'anual' ? 'ANUAL' : `${pautaDisciplinaPeriodo}º TRIMESTRE`} — ANO LECTIVO ${turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}`
                  ) : pautaSubTipo === 'trimestral' ? (
                    `PAUTA OFICIAL DO ${pautaTrimestre}º TRIMESTRE — ANO LECTIVO ${turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}`
                  ) : juriTurmaSelecionada ? (
                    `PAUTA FINAL HOMOLOGADA — ANO LECTIVO ${turmaSelecionada.anoLectivo || escola.anoLectivoActivo}`
                  ) : (
                    resolverTextoDiretor(configAtual?.tituloOficial, { turma: turmaSelecionada }) || `PAUTA GERAL FINAL — ANO LECTIVO ${turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}`
                  )}
                </span>

                {resolverTextoDiretor(configAtual?.textoCorpoAbertura, { turma: turmaSelecionada }) && (
                  <p className="text-[11px] text-gray-700 italic">
                    {resolverTextoDiretor(configAtual?.textoCorpoAbertura, { turma: turmaSelecionada })}
                  </p>
                )}

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
            {camposDoc.mostrarTurmaSalaTurno && (
              <>
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
              </>
            )}
            {camposDoc.mostrarCurso && isSegundoCiclo(turmaSelecionada.classe) && (
              <div>
                <span className="text-gray-600 block text-[10px]">Curso:</span>
                <strong className="whitespace-normal break-words block">{turmaSelecionada.curso || '—'}</strong>
              </div>
            )}
          </div>

          {/* TABELA DA PAUTA: 1. CASO PAUTA POR DISCIPLINA */}
          {pautaSubTipo === 'disciplina' ? (() => {
            const discAtual = disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0];
            const triParaDisc = pautaDisciplinaPeriodo === 'anual' ? undefined : pautaDisciplinaPeriodo;
            const ehAnualDisc = !triParaDisc;
            const ehTerceiroTriDisc = triParaDisc === '3';
            const escalaAprovacao = regraVigenteDocumento?.notaMinimaAprovacao ?? obterInformacaoEscala(turmaSelecionada.classe, turmaSelecionada.nivelEnsino).notaAprovacao;
            const fmtNotaPauta = (v: number | null | undefined) => {
              if (v === null || v === undefined || isNaN(Number(v))) return '—';
              const n = Math.round(Number(v) * 10) / 10;
              return Number.isInteger(n) ? String(n) : n.toFixed(1);
            };

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border border-black text-center table-auto">
                  <thead className="bg-gray-100 font-bold border-b border-black text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black w-8">N.º</th>
                      {camposDoc.mostrarNumeroProcessoMatricula && (
                        <th className="p-1.5 border-r border-black w-24">Proc. n.º</th>
                      )}
                      <th className="p-1.5 border-r border-black text-left min-w-[200px]">Nome Completo do Estudante</th>
                      <th className="p-1.5 border-r border-black w-14" title="Média de Avaliação Contínua">MAC</th>
                      {provaProfessorAtiva && (
                        <th className="p-1.5 border-r border-black w-14" title="Prova do Professor">NPP</th>
                      )}
                      <th className="p-1.5 border-r border-black w-14" title="Nota da Prova Trimestral">NPT</th>
                      {ehAnualDisc ? (
                        <>
                          <th className="p-1.5 border-r border-black w-14" title="1º Trimestre">MT1</th>
                          <th className="p-1.5 border-r border-black w-14" title="2º Trimestre">MT2</th>
                          <th className="p-1.5 border-r border-black w-14" title="3º Trimestre">MT3</th>
                          {ehClasseFinalTurma && (
                            <th className="p-1.5 border-r border-black w-14 bg-amber-50" title="Exame Terminal do Ciclo">Exame</th>
                          )}
                          <th className="p-1.5 border-r border-black w-16 bg-gray-200" title="Média Final da Disciplina">MFD</th>
                        </>
                      ) : (
                        <>
                          <th className="p-1.5 border-r border-black w-16 bg-gray-200" title="Média Trimestral">MT ({triParaDisc}º Tri)</th>
                          {ehTerceiroTriDisc && ehClasseFinalTurma && (
                            <th className="p-1.5 border-r border-black w-14 bg-amber-50" title="Exame Terminal do Ciclo">Exame</th>
                          )}
                        </>
                      )}
                      {camposDoc.mostrarComportamento && (
                        <th className="p-1.5 border-r border-black w-24 bg-green-50">Comportamento</th>
                      )}
                      {camposDoc.mostrarSituacaoFinal && (
                        <th className="p-1.5 min-w-[120px]">Observação / Resultado</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {alunosDaTurma.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-gray-500 italic">
                          Nenhum estudante matriculado nesta turma para o ano lectivo selecionado.
                        </td>
                      </tr>
                    ) : (
                      alunosDaTurma.map((aluno, idx) => {
                        const realDisc = discAtual ? resolverNotaRealParaAluno(aluno, discAtual, turmaSelecionada.classe, triParaDisc) : null;
                        const mac = fmtNotaPauta(realDisc?.mac);
                        const npp = fmtNotaPauta(realDisc?.npp);
                        const npt = fmtNotaPauta(realDisc?.npt);
                        const mt1 = fmtNotaPauta(realDisc?.mt1);
                        const mt2 = fmtNotaPauta(realDisc?.mt2);
                        const mt3 = fmtNotaPauta(realDisc?.mt3);
                        const exame = ehClasseFinalTurma ? fmtNotaPauta(realDisc?.notaExame) : undefined;
                        const notaPrincipalNum = realDisc?.valorFinal !== undefined && realDisc?.valorFinal !== null && !isNaN(Number(realDisc.valorFinal))
                          ? (ehAnualDisc ? Math.round(Number(realDisc.valorFinal)) : Math.round(Number(realDisc.valorFinal) * 10) / 10)
                          : null;
                        const obsDisc = obterObservacaoDisciplina(notaPrincipalNum, turmaSelecionada.classe, aluno.estado, regraVigenteDocumento);

                        return (
                          <tr key={aluno.id} className="hover:bg-gray-50">
                            <td className="p-1.5 border-r border-black font-mono font-bold">{idx + 1}</td>
                            {camposDoc.mostrarNumeroProcessoMatricula && (
                              <td className="p-1.5 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                            )}
                            <td className="p-1.5 border-r border-black text-left font-bold text-gray-900 whitespace-normal break-words min-w-[180px]">{aluno.nomeCompleto}</td>
                            <td className="p-1.5 border-r border-black font-mono">{mac}</td>
                            {provaProfessorAtiva && (
                              <td className="p-1.5 border-r border-black font-mono">{npp}</td>
                            )}
                            <td className="p-1.5 border-r border-black font-mono">{npt}</td>
                            {ehAnualDisc ? (
                              <>
                                <td className="p-1.5 border-r border-black font-mono">{mt1}</td>
                                <td className="p-1.5 border-r border-black font-mono">{mt2}</td>
                                <td className="p-1.5 border-r border-black font-mono">{mt3}</td>
                                {ehClasseFinalTurma && (
                                  <td className="p-1.5 border-r border-black font-mono font-bold bg-amber-50/50">{exame}</td>
                                )}
                                <td className="p-1.5 border-r border-black font-mono font-bold bg-gray-50">
                                  {notaPrincipalNum !== null ? (
                                    <span className={notaPrincipalNum >= escalaAprovacao ? 'text-emerald-800' : 'text-rose-700'}>
                                      {fmtNotaPauta(notaPrincipalNum)}
                                    </span>
                                  ) : '—'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-1.5 border-r border-black font-mono font-bold bg-gray-50">
                                  {notaPrincipalNum !== null ? (
                                    <span className={notaPrincipalNum >= escalaAprovacao ? 'text-emerald-800' : 'text-rose-700'}>
                                      {fmtNotaPauta(notaPrincipalNum)}
                                    </span>
                                  ) : '—'}
                                </td>
                                {ehTerceiroTriDisc && ehClasseFinalTurma && (
                                  <td className="p-1.5 border-r border-black font-mono font-bold bg-amber-50/50">{exame}</td>
                                )}
                              </>
                            )}
                            {camposDoc.mostrarComportamento && (
                              <td className="p-1.5 border-r border-black text-[9px] bg-green-50/30">
                                {realDisc?.comportamentoConceito || aluno.comportamentoConceito || <span className="text-gray-400 font-normal">—</span>}
                              </td>
                            )}
                            {camposDoc.mostrarSituacaoFinal && (
                              <td className="p-1.5 text-center font-bold">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                                  obsDisc.categoria === 'Aprovado'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : obsDisc.categoria === 'Recurso'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : obsDisc.categoria === 'Reprovado'
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                    : obsDisc.categoria === 'Desistente' || obsDisc.categoria === 'Transferido'
                                    ? 'bg-slate-200 text-slate-800 border border-slate-400'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>
                                  {obsDisc.categoria === 'Pendente' ? 'Sem Notas' : obsDisc.texto}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })() : (() => {
            /* TABELA DA PAUTA GERAL OU TRIMESTRAL */
            const modoAnalitico = pautaModoExibicao === 'analitica';
            const subColsPerDisc = modoAnalitico
              ? (pautaSubTipo === 'trimestral' ? (provaProfessorAtiva ? ['MAC', 'NPP', 'NPT', 'MT'] : ['MAC', 'NPT', 'MT']) : ['MAC', 'NPT', 'MFD'])
              : [];
            const fmtCellVal = (v: number | null | undefined) => {
              if (v === null || v === undefined || isNaN(Number(v))) return '-';
              const r = Math.round(Number(v) * 10) / 10;
              return Number.isInteger(r) ? String(r) : r.toFixed(1);
            };

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border border-black text-center table-auto">
                  <thead className="bg-gray-100 font-bold border-b border-black text-[10px]">
                    <tr>
                      <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 border-r border-black whitespace-nowrap">N.º</th>
                      {camposDoc.mostrarNumeroProcessoMatricula && (
                        <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 border-r border-black whitespace-nowrap">Proc. n.º</th>
                      )}
                      <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 border-r border-black text-left min-w-[160px] whitespace-normal break-words">Nome Completo do Estudante</th>
                      {disciplinasDaClasseDocumento.map(d => (
                        <th
                          key={d.id}
                          colSpan={modoAnalitico ? subColsPerDisc.length : 1}
                          className="p-1 border-r border-black whitespace-normal break-words leading-tight text-[9px] min-w-[78px]"
                          title={d.nome}
                        >
                          {d.nome}
                        </th>
                      ))}
                      <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 border-r border-black text-red-800 whitespace-nowrap" title="Disciplinas Negativas">Neg.</th>
                      {camposDoc.mostrarMediaGeral && (
                        <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 border-r border-black bg-gray-200 whitespace-nowrap">Média</th>
                      )}
                      {camposDoc.mostrarComportamento && (
                        <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 border-r border-black bg-green-50 whitespace-nowrap" title="Comportamento Geral">Comportamento</th>
                      )}
                      {camposDoc.mostrarSituacaoFinal && (
                        <th rowSpan={modoAnalitico ? 2 : 1} className="p-1 min-w-[100px] whitespace-nowrap">Resultado Final</th>
                      )}
                    </tr>
                    {modoAnalitico && (
                      <tr className="bg-gray-50 border-t border-black text-[8px]">
                        {disciplinasDaClasseDocumento.map(d =>
                          subColsPerDisc.map((lbl, sIdx) => (
                            <th
                              key={`${d.id}-sub-${lbl}-${sIdx}`}
                              className={`p-0.5 border-r border-black whitespace-nowrap ${
                                lbl === 'MT' || lbl === 'MFD' ? 'bg-gray-200 font-black' : 'text-gray-700'
                              }`}
                            >
                              {lbl}
                            </th>
                          ))
                        )}
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-black">
                    {alunosDaTurma.length === 0 ? (
                      <tr>
                        <td colSpan={disciplinasDaClasseDocumento.length * Math.max(1, subColsPerDisc.length) + 7} className="p-6 text-center text-gray-500 italic">
                          Nenhum estudante matriculado nesta turma para o ano letivo selecionado.
                        </td>
                      </tr>
                    ) : (
                      alunosDaTurma.map((aluno, idx) => {
                        const deliberacao = juriTurmaSelecionada?.deliberacoes?.[aluno.id];
                        const escalaInfoPauta = obterInformacaoEscala(turmaSelecionada.classe, turmaSelecionada.nivelEnsino);
                        const escalaAprovacao = regraVigenteDocumento?.notaMinimaAprovacao ?? escalaInfoPauta.notaAprovacao;

                        const notasLinha = disciplinasDaClasseDocumento.map(d => {
                          const notaAlterada = deliberacao?.notasAlteradas?.find(na => na.disciplinaId === d.id);
                          const triAlvo = pautaSubTipo === 'trimestral' ? pautaTrimestre : undefined;
                          const realDetalhe = resolverNotaRealParaAluno(aluno, d, turmaSelecionada.classe, triAlvo);
                          const notaValor = notaAlterada && typeof notaAlterada.novaNota === 'number'
                            ? notaAlterada.novaNota
                            : realDetalhe.valorFinal;
                          return { d, notaAlterada, notaValor, realDetalhe };
                        });

                        const valoresValidos = notasLinha
                          .map(item => item.notaValor)
                          .filter((v): v is number => v !== undefined && v !== null && !isNaN(Number(v)));
                        const somaNotas = valoresValidos.reduce((acc, v) => acc + v, 0);
                        const disciplinasComNota = valoresValidos.length;
                        const obsGeral = obterObservacaoPautaGeral(
                          notasLinha.map(n => n.notaValor),
                          turmaSelecionada.classe,
                          aluno.estado,
                          regraVigenteDocumento
                        );

                        return (
                          <tr key={aluno.id} className="hover:bg-gray-50">
                            <td className="p-1 border-r border-black font-mono font-bold">{idx + 1}</td>
                            {camposDoc.mostrarNumeroProcessoMatricula && (
                              <td className="p-1 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                            )}
                            <td className="p-1 border-r border-black text-left font-bold text-gray-900 whitespace-normal break-words min-w-[170px]">{aluno.nomeCompleto}</td>
                            
                            {notasLinha.map(({ d, notaAlterada, notaValor, realDetalhe }) => {
                              const nFmt = notaValor !== undefined && notaValor !== null && !isNaN(Number(notaValor))
                                ? (pautaSubTipo === 'geral_final' ? Math.round(Number(notaValor)) : Math.round(Number(notaValor) * 10) / 10)
                                : null;
                              if (modoAnalitico) {
                                return (
                                  <React.Fragment key={d.id}>
                                    <td className="p-1 border-r border-black font-mono text-[10px] text-gray-700">{fmtCellVal(realDetalhe.mac)}</td>
                                    {pautaSubTipo === 'trimestral' && provaProfessorAtiva && (
                                      <td className="p-1 border-r border-black font-mono text-[10px] text-gray-700">{fmtCellVal(realDetalhe.npp)}</td>
                                    )}
                                    <td className="p-1 border-r border-black font-mono text-[10px] text-gray-700">{fmtCellVal(realDetalhe.npt)}</td>
                                    <td className="p-1 border-r border-black font-mono text-center font-bold bg-gray-50">
                                      {nFmt !== null ? (
                                        <span className={`inline-flex items-center space-x-0.5 ${nFmt >= escalaAprovacao ? 'text-emerald-800' : 'text-red-700'}`}>
                                          <span>{pautaSubTipo === 'geral_final' || Number.isInteger(nFmt) ? Math.round(nFmt) : nFmt.toFixed(1)}</span>
                                          {notaAlterada && (
                                            <span className="text-[9px] text-purple-700 font-black" title={`Ajustada pelo Júri de ${notaAlterada.notaAnterior} para ${notaAlterada.novaNota}.`}>*</span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                  </React.Fragment>
                                );
                              }
                              return (
                                <td key={d.id} className="p-1 border-r border-black font-mono text-center font-bold">
                                  {nFmt !== null ? (
                                    <span className={`inline-flex items-center space-x-0.5 ${nFmt >= escalaAprovacao ? 'text-emerald-800' : 'text-red-700'}`}>
                                      <span>{pautaSubTipo === 'geral_final' || Number.isInteger(nFmt) ? Math.round(nFmt) : nFmt.toFixed(1)}</span>
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

                            <td className="p-1 border-r border-black font-bold text-red-700">{obsGeral.totalNegativas}</td>
                            {camposDoc.mostrarMediaGeral && (
                              <td className="p-1 border-r border-black font-bold bg-gray-50">
                                {disciplinasComNota > 0 ? Math.round(somaNotas / disciplinasComNota) : '-'}
                              </td>
                            )}
                            {camposDoc.mostrarComportamento && (
                              <td className="p-1 border-r border-black font-bold text-[9px] bg-green-50/30">
                                {(() => {
                                  const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id && (n.turmaId === turmaSelecionada.id || !n.turmaId));
                                  const notasComp = notasAluno.map(n => n.comportamentoNota).filter((n): n is number => typeof n === 'number' && n > 0);
                                  if (notasComp.length === 0) return <span className="text-gray-400 font-normal">{aluno.comportamentoConceito || '—'}</span>;
                                  const mediaComp = notasComp.reduce((a, b) => a + b, 0) / notasComp.length;
                                  const conceito = converterComportamentoParaConceito(mediaComp, escalaInfoPauta.escalaMaxima);
                                  return (
                                    <span className="px-1.5 py-0.5 rounded font-black text-slate-800">
                                      {Math.round(mediaComp)} ({conceito})
                                    </span>
                                  );
                                })()}
                              </td>
                            )}
                            {camposDoc.mostrarSituacaoFinal && (
                              <td className="p-1 text-center font-bold">
                                {aluno.estado === 'Desistente' || aluno.estado === 'Transferido' ? (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-slate-200 text-slate-800 border border-slate-400">
                                    {obterSituacaoTextoPorGenero(aluno.estado, aluno.genero)}
                                  </span>
                                ) : juriTurmaSelecionada && deliberacao ? (
                                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                                    deliberacao.decisao === 'Aprovar' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                    deliberacao.decisao === 'Recurso' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                    'bg-red-100 text-red-900 border border-red-300'
                                  }`}>
                                    {deliberacao.decisao === 'Aprovar'
                                      ? (aluno.genero === 'F' ? 'Aprovada' : 'Aprovado')
                                      : deliberacao.decisao === 'Recurso'
                                      ? 'Recurso'
                                      : (aluno.genero === 'F' ? 'Reprovada' : 'Reprovado')}
                                  </span>
                                ) : (
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                    obsGeral.categoria === 'Aprovado'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : obsGeral.categoria === 'Recurso'
                                      ? 'bg-amber-100 text-amber-800'
                                      : obsGeral.categoria === 'Reprovado'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {obsGeral.categoria === 'Pendente' ? 'Sem Notas' : obterSituacaoTextoPorGenero(obsGeral.texto, aluno.genero)}
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Sumário Estatístico e Percentagens Oficiais da Turma (100% Coerente com a Tabela) */}
          {(() => {
            const totalMatriculados = alunosDaTurma.length;
            const discAlvoResumo = pautaSubTipo === 'disciplina'
              ? (disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0])
              : undefined;

            const resultadosResumo = alunosDaTurma.map(al => {
              if (pautaSubTipo === 'disciplina' && discAlvoResumo) {
                const triParaDiscResumo = pautaDisciplinaPeriodo === 'anual' ? undefined : pautaDisciplinaPeriodo;
                const real = resolverNotaRealParaAluno(al, discAlvoResumo, turmaSelecionada.classe, triParaDiscResumo);
                const obs = obterObservacaoDisciplina(real.valorFinal, turmaSelecionada.classe, al.estado, regraVigenteDocumento);
                return { al, categoria: obs.categoria };
              }
              const triAlvo = pautaSubTipo === 'trimestral' ? pautaTrimestre : undefined;
              const medias = disciplinasDaClasseDocumento.map(
                d => resolverNotaRealParaAluno(al, d, turmaSelecionada.classe, triAlvo).valorFinal
              );
              const obs = obterObservacaoPautaGeral(medias, turmaSelecionada.classe, al.estado, regraVigenteDocumento);
              return { al, categoria: obs.categoria };
            });

            const avaliadosList = resultadosResumo.filter(
              r => r.categoria !== 'Desistente' && r.categoria !== 'Transferido' && r.categoria !== 'Pendente'
            );
            const totalAvaliados = avaliadosList.length;
            const alunosAprovados = avaliadosList.filter(r => r.categoria === 'Aprovado').map(r => r.al);
            const alunosRecurso = avaliadosList.filter(r => r.categoria === 'Recurso').map(r => r.al);
            const alunosReprovados = avaliadosList.filter(r => r.categoria === 'Reprovado').map(r => r.al);
            const desistentesOuTransf = resultadosResumo.filter(
              r => r.categoria === 'Desistente' || r.categoria === 'Transferido'
            ).length;
            const semNotas = resultadosResumo.filter(r => r.categoria === 'Pendente').length;

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
                  <span className="text-amber-700 block text-[10px] uppercase font-bold">Recurso / Reprovados</span>
                  <strong className="text-sm font-mono text-amber-800">{alunosRecurso.length + alunosReprovados.length} ({percInsucesso}%)</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Pendentes / Desist.</span>
                  <strong className="text-sm font-mono text-gray-700">{semNotas + desistentesOuTransf}</strong>
                </div>
              </div>
            );
          })()}

          {/* Data Oficial da Pauta Conforme Normas do Ministério da Educação */}
          {camposDoc.mostrarDataLocalExtenso && (
            <div className="flex justify-end my-4 pr-3">
              <p className="text-right text-xs font-serif italic text-gray-800">
                {escola.municipio ? `${escola.municipio}` : (escola.provincia || 'Luanda')}, aos {hojeAngolano('extenso')}.
              </p>
            </div>
          )}

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
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-gray-950 uppercase text-[11px] whitespace-normal break-words">{obterTituloPresidenteJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                    {obterPresidenteJuri(juriTurmaSelecionada, funcionariosEscola)}
                  </p>
                </div>

                {/* 2. 1º Vogal do Júri */}
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-gray-950 uppercase text-[11px] whitespace-normal break-words">{obterTituloPrimeiroVogalJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                    {(() => {
                      const v = obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola);
                      return v.primeiroVogal;
                    })()}
                  </p>
                </div>

                {/* 3. 2º Vogal do Júri */}
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-gray-950 uppercase text-[11px] whitespace-normal break-words">{obterTituloSegundoVogalJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                    {(() => {
                      const v = obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola);
                      return v.segundoVogal;
                    })()}
                  </p>
                </div>

                {/* 4. Director Geral com Assinatura Digitalizada */}
                {exibirAssinDiretorDoc && (
                  <div className="space-y-1 flex flex-col items-center justify-end min-w-0">
                    <p className="font-black text-gray-950 uppercase text-[11px] whitespace-normal break-words">{getTituloDiretor(escola)}</p>
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
                    <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                    <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                      {nomeDiretorGeral}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center text-xs">
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-gray-950 uppercase text-[11px] whitespace-normal break-words">{obterTituloCoordenadorTurma(turmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                    {obterNomeCoordenadorTurma(turmaSelecionada, funcionariosEscola)}
                  </p>
                </div>
                <div className="space-y-1 min-w-0">
                  {(() => {
                    const discAtual = disciplinasDaClasseDocumento.find(d => d.id === pautaDisciplinaId) || disciplinasDaClasseDocumento[0];
                    const nomeCoord = obterNomeCoordenadorDisciplina(discAtual?.id, turmaSelecionada?.id, dbService.getAtribuicoes(), funcionariosEscola, discAtual?.nome);
                    const tituloCoord = obterTituloCoordenadorDisciplina(discAtual?.id, turmaSelecionada?.id, dbService.getAtribuicoes(), funcionariosEscola, discAtual?.nome);
                    return (
                      <>
                        <p className="font-bold text-gray-950 uppercase text-[11px] whitespace-normal break-words">{tituloCoord}</p>
                        <div className="h-6" />
                        <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                        <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">{nomeCoord}</p>
                      </>
                    );
                  })()}
                </div>
                {exibirAssinSubdiretorDoc && (
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold text-gray-950 uppercase text-[11px] whitespace-normal break-words">{getTituloSubPedagogico(escola)}</p>
                    <div className="h-6" />
                    <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                    <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                      {subdirectorPedagogicoNome}
                    </p>
                  </div>
                )}
                {exibirAssinDiretorDoc && (
                  <div className="space-y-1 flex flex-col items-center justify-end min-w-0">
                    <p className="font-bold text-gray-950 uppercase text-[11px] whitespace-normal break-words">{getTituloDiretor(escola)}</p>
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
                    <div className="w-full max-w-[160px] border-b border-black mx-auto my-1.5" />
                    <p className="font-bold text-gray-800 text-[11px] whitespace-normal break-words">
                      {nomeDiretorGeral}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(exibirCodigoQrDoc || resolverTextoDiretor(configAtual?.textoRodape, { turma: turmaSelecionada })) && (
              <div className="mt-5 pt-3 border-t border-gray-300 flex items-center justify-between gap-4 text-[9px] text-gray-600">
                <div className="text-left">
                  {resolverTextoDiretor(configAtual?.textoRodape, { turma: turmaSelecionada }) && (
                    <p>{resolverTextoDiretor(configAtual?.textoRodape, { turma: turmaSelecionada })}</p>
                  )}
                </div>
                {exibirCodigoQrDoc && (
                  <OfficialQrCode
                    value={gerarPayloadQrDocumento({
                      docType: 'PAUTA_OFICIAL',
                      escolaId: escola.id,
                      docRef: `${turmaSelecionada?.id || 'turma'}-${pautaDisciplinaId || disciplinasDaClasseDocumento[0]?.id || 'geral'}`,
                      turmaId: turmaSelecionada?.id,
                      anoLectivo: turmaSelecionada?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                    })}
                    size={54}
                  />
                )}
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
        ) : (() => {
          const ctxDecl = buildTemplateCtx({ aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const cabDecl = resolverCabecalhoPersonalizado({ aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const tituloDecl = resolverTextoDiretor(configAtual?.tituloOficial, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc }) || 'DECLARAÇÃO DE HABILITAÇÕES (COM NOTAS)';
          const subtituloDecl = resolverTextoDiretor(configAtual?.subtitulo, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const aberturaDecl = resolverTextoDiretor(configAtual?.textoCorpoAbertura, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const fechamentoDecl = resolverTextoDiretor(configAtual?.textoFechamento, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const rodapeDecl = resolverTextoDiretor(configAtual?.textoRodape, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const podeVerDocAluno = visibilidadeUsuario.dadosSensiveis.verDocumentosIdentificacaoAlunos;
          const podeVerContactoAluno = visibilidadeUsuario.dadosSensiveis.verContactosAlunosEncarregados;
          const biExibidoDecl = podeVerDocAluno ? (alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—') : '*** Protegido ***';
          const telEncExibidoDecl = podeVerContactoAluno ? (alunoSelecionado.telefoneEncarregado || alunoSelecionado.telefone || '—') : '*** Protegido ***';
          const colsAssinDecl = [exibirAssinSubdiretorDoc, exibirAssinDiretorDoc].filter(Boolean).length || 1;

          return (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-6 sm:p-8 md:p-10 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-6 ${fontScaleClassDoc}`}>
          {/* Cabeçalho Oficial com Insígnia Centralizada Fixa */}
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
            {cabDecl ? (
              cabDecl.map((linha, idx) => (
                <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                  {linha}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                {camposDoc.mostrarGovernoGabinete && (
                  <>
                    <p className="text-[11px] font-bold uppercase text-gray-800">
                      {escola.governoProvincial || (escola.provincia ? `GOVERNO PROVINCIAL DE ${escola.provincia.toUpperCase()}` : 'GOVERNO PROVINCIAL')}
                    </p>
                    <p className="text-[11px] font-bold uppercase text-gray-800">
                      {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                    </p>
                  </>
                )}
              </>
            )}
            <h2 className="text-sm sm:text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
              {escola.nomeOficial}
            </h2>
            {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
              <p className="text-[10px] font-bold uppercase text-gray-600">
                {[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>

          {/* Título da Declaração */}
          <div className="text-center py-2">
            <h3 className="text-base sm:text-lg font-serif font-black uppercase tracking-wide border-b-2 border-black inline-block px-4 pb-1" style={{ color: corDestaqueDoc, borderColor: corDestaqueDoc }}>
              {tituloDecl}
            </h3>
            {subtituloDecl && subtituloDecl !== 'Ministério da Educação de Angola' && (
              <p className="text-xs font-semibold text-gray-700 mt-1">{subtituloDecl}</p>
            )}
          </div>

          {/* Texto Legal e Identificação Completa do Aluno */}
          <div data-pdf-fixed-student="true" className="flex flex-col sm:flex-row gap-4 items-start">
            {camposDoc.mostrarFoto && alunoSelecionado.fotoUrl && (
              <img
                src={alunoSelecionado.fotoUrl}
                alt={alunoSelecionado.nomeCompleto}
                className="h-24 w-20 rounded-md object-cover border border-black shrink-0"
              />
            )}
            <div className="flex-1 text-xs sm:text-[13px] leading-relaxed text-justify space-y-3">
              <p>
                <strong>{nomeDiretorGeral}</strong>, {tituloDiretorGeral} da instituição de ensino <strong>{escola.nomeOficial}</strong>
                {camposDoc.mostrarDecreto ? (
                  <>
                    , criada sob o <strong>{limparTextoSistema(escola.decretoCriacao || configAtual?.artigoLegalDecreto) || 'Decreto de Criação da Instituição'}</strong>, ao abrigo da <strong>{limparTextoSistema(escola.artigoLegal || configAtual?.artigoLegalDecreto) || 'Lei n.º 32/20 de 12 de Agosto (Lei de Bases do Sistema de Educação e Ensino)'}</strong>
                  </>
                ) : null}
                {aberturaDecl ? `: ${aberturaDecl}` : ':'}
              </p>

              <p>
                Declara que <strong>{alunoSelecionado.nomeCompleto.toUpperCase()}</strong>
                {camposDoc.mostrarFiliacao && (
                  <>, {alunoSelecionado.genero === 'F' ? 'filha' : 'filho'} de <strong>{alunoSelecionado.nomePai || '—'}</strong> e de <strong>{alunoSelecionado.nomeMae || '—'}</strong></>
                )}
                {camposDoc.mostrarDataNascimento && (
                  <>, {alunoSelecionado.genero === 'F' ? 'nascida' : 'nascido'} aos <strong>{formatarDataAngolana(alunoSelecionado.dataNascimento, 'extenso')}</strong></>
                )}
                {camposDoc.mostrarNaturalidadeProvincia && (
                  <>, natural de <strong>{alunoSelecionado.naturalidade || '—'}</strong>, Município de <strong>{alunoSelecionado.municipioNascimento || '—'}</strong>, Província de <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong></>
                )}
                {camposDoc.mostrarBI && (
                  <>
                    , {alunoSelecionado.genero === 'F' ? 'portadora' : 'portador'} do {alunoSelecionado.tipoDocumento || 'Bilhete de Identidade'} n.º <strong>{biExibidoDecl}</strong>
                    {camposDoc.mostrarDataEmissaoBI && (
                      <>, emitido aos <strong>{formatarDataAngolana(alunoSelecionado.dataEmissaoBI, 'extenso')}</strong>, pelo <strong>{alunoSelecionado.arquivoIdentificacao || '—'}</strong></>
                    )}
                  </>
                )}
                {camposDoc.mostrarResidencia && (alunoSelecionado.endereco || (alunoSelecionado as any).residencia) && (
                  <>, residente em <strong>{alunoSelecionado.endereco || (alunoSelecionado as any).residencia}</strong></>
                )}
                {camposDoc.mostrarEncarregado && (alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome) && (
                  <>
                    , sob encargo de <strong>{alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome}</strong>
                    {camposDoc.mostrarContactoEncarregado && <> (Tel.: <strong>{telEncExibidoDecl}</strong>)</>}
                  </>
                )}
                .
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
                  const anoReal = anoAlunoDoc || '—';
                  return (
                    <>
                      {situacaoTexto} <strong>{classeAlunoDoc ? `${classeAlunoDoc} Classe` : '—'}</strong>, no Ano Lectivo de <strong>{anoReal}</strong>
                      {camposDoc.mostrarCurso && ehSegundoCicloAlunoDoc && cursoAlunoDoc ? (
                        <>, no Curso de <strong>{cursoAlunoDoc}</strong></>
                      ) : null}
                      {camposDoc.mostrarTurmaSalaTurno && (turmaDoAluno?.nome || turnoReal) ? (
                        <>
                          {turmaDoAluno?.nome ? <>, Turma <strong>{turmaDoAluno.nome}</strong></> : null}
                          {turnoReal ? <>, no Período <strong>{turnoReal}</strong></> : null}
                        </>
                      ) : null}
                      , com a seguinte classificação curricular:
                    </>
                  );
                })()}
              </p>
            </div>
          </div>

          {/* Tabela de Disciplinas & Classificação Real da Classe do Aluno */}
          <div className="pt-2 overflow-x-auto">
            <table className="w-full text-xs border border-black border-collapse table-auto">
              <thead className="bg-gray-100 font-bold border-b border-black text-left">
                <tr>
                  <th className="p-2 border-r border-black whitespace-normal break-words">DISCIPLINAS ({classeAlunoDoc || '—'})</th>
                  <th className="p-2 text-center w-[42%] whitespace-normal break-words">CLASSIFICAÇÃO CURRICULAR</th>
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
                            <td className="p-1.5 border-r border-black pl-3 font-medium whitespace-normal break-words">{disc.nome}</td>
                            <td className="p-1.5 text-center font-semibold whitespace-normal break-words">
                              {notaArredondada !== null
                                ? (camposDoc.mostrarEscalaExtenso
                                    ? `${notaArredondada} (${converterNotaParaExtensoMED(notaArredondada)})`
                                    : `${notaArredondada}`)
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
                                <td className="p-1.5 border-r border-black pl-3 font-medium whitespace-normal break-words">{disc.nome}</td>
                                <td className="p-1.5 text-center font-semibold whitespace-normal break-words">
                                  {notaArredondada !== null
                                    ? (camposDoc.mostrarEscalaExtenso
                                        ? `${notaArredondada} (${converterNotaParaExtensoMED(notaArredondada)})`
                                        : `${notaArredondada}`)
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
                {camposDoc.mostrarMediaGeral && (
                  <tr className="bg-gray-100 font-bold border-t-2 border-black">
                    <td className="p-2 border-r border-black uppercase">MÉDIA GLOBAL OBTIDA</td>
                    <td className="p-2 text-center text-sm font-black">
                      {mediaGeralCalculada !== '—' && !isNaN(Number(mediaGeralCalculada))
                        ? (camposDoc.mostrarEscalaExtenso
                            ? `${Math.round(Number(mediaGeralCalculada))} (${converterNotaParaExtensoMED(Math.round(Number(mediaGeralCalculada)))}) Valores`
                            : `${Math.round(Number(mediaGeralCalculada))} Valores`)
                        : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Parágrafo de Livro de Registo */}
          <div className="text-xs leading-relaxed text-justify space-y-2 pt-2">
            {(camposDoc.mostrarLivroFolhaRegisto || camposDoc.mostrarNumeroProcessoMatricula) && (
              <p>
                Consta
                {camposDoc.mostrarLivroFolhaRegisto && (
                  <> no livro de registo n.º <strong>{alunoSelecionado.livroRegisto || '—'}</strong>, à folha <strong>{alunoSelecionado.folhaRegisto || '—'}</strong></>
                )}
                {camposDoc.mostrarNumeroProcessoMatricula && (
                  <>{camposDoc.mostrarLivroFolhaRegisto ? ', com o' : ' com o'} processo n.º <strong>{alunoSelecionado.numeroProcesso || alunoSelecionado.codigoMatricula || '—'}</strong></>
                )}
                .
              </p>
            )}
            <p>
              {fechamentoDecl ||
                'Por ser verdade e ter sido solicitada pela parte interessada, mandou-se passar a presente declaração que vai por mim assinada e autenticada com o carimbo a óleo e selo branco em uso neste estabelecimento de ensino.'}
            </p>
            {camposDoc.mostrarDataLocalExtenso && (
              <p className="text-right pt-2 font-medium">
                {[escola.municipio, escola.provincia].filter(Boolean).join(', ') || 'República de Angola'}, aos {hojeAngolano('extenso')}.
              </p>
            )}
          </div>

          {/* Assinaturas Oficiais: Título (topo) -> Traço (+ assinatura) -> Nome (baixo) */}
          {(exibirAssinSubdiretorDoc || exibirAssinDiretorDoc) && (
            <div className={`grid ${colsAssinDecl === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-8 pt-8 text-xs text-center border-t border-gray-300`}>
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
          )}

          {/* Rodapé + Código QR */}
          {(exibirCodigoQrDoc || rodapeDecl) && (
            <div className="pt-3 flex items-center justify-between gap-4 text-[10px] text-gray-600">
              <div className="text-left">
                {rodapeDecl && <p>{rodapeDecl}</p>}
              </div>
              {exibirCodigoQrDoc && (
                <OfficialQrCode
                  value={gerarPayloadQrDocumento({
                    docType: 'DECLARACAO_NOTAS',
                    escolaId: escola.id,
                    docRef: `DECL-${alunoSelecionado.codigoMatricula}`,
                    alunoId: alunoSelecionado.id,
                    alunoNome: alunoSelecionado.nomeCompleto,
                    turmaId: turmaDoAluno?.id,
                    anoLectivo: ctxDecl.anoLectivo
                  })}
                  size={56}
                />
              )}
            </div>
          )}
        </div>
          );
        })()
      )}

      {/* ========================================================================= */}
      {/* 3. CERTIFICADO OFICIAL (RESTRITO A CLASSES FINAIS: 6ª, 9ª, 12ª e 13ª) */}
      {/* ========================================================================= */}
      {docType === 'certificado_ciclo' && (
        !alunoSelecionado ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Nenhum Estudante de Classe Final Selecionado</h3>
            <p className="text-sm text-gray-500 mt-1">
              A emissão de Certificados Oficiais é permitida apenas para estudantes matriculados nas classes finais: <strong>6ª, 9ª, 12ª e 13ª Classe</strong>.
            </p>
          </div>
        ) : !isClasseFinalCertificado(classeAlunoDoc) ? (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-10 text-center text-amber-950 max-w-xl mx-auto my-8 space-y-2">
            <Award className="h-12 w-12 text-amber-600 mx-auto" />
            <h3 className="text-base font-black">Emissão de Certificado Não Permitida para {classeAlunoDoc || 'Esta Classe'}</h3>
            <p className="text-xs text-amber-900">
              O estudante <strong>{alunoSelecionado.nomeCompleto}</strong> pertence à <strong>{classeAlunoDoc || 'classe não final'}</strong>. Os Certificados Oficiais só podem ser emitidos para alunos das classes finais: <strong>6ª, 9ª, 12ª e 13ª Classe</strong>. Para as restantes classes, utilize a <strong>Declaração com Notas</strong>.
            </p>
          </div>
        ) : (() => {
          const ctxCert = buildTemplateCtx({ aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const cabCert = resolverCabecalhoPersonalizado({ aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const tituloCertRaw = resolverTextoDiretor(configAtual?.tituloOficial, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const aberturaCert = resolverTextoDiretor(configAtual?.textoCorpoAbertura, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const fechamentoCert = resolverTextoDiretor(configAtual?.textoFechamento, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const rodapeCert = resolverTextoDiretor(configAtual?.textoRodape, { aluno: alunoDocAlinhado || alunoSelecionado, turma: turmaDoAluno, anoLectivo: anoAlunoDoc });
          const podeVerDocAlunoCert = visibilidadeUsuario.dadosSensiveis.verDocumentosIdentificacaoAlunos;
          const biExibidoCert = podeVerDocAlunoCert ? (alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—') : '*** Protegido ***';

          const obterDisciplinasCertificado = (alvoCls: string, cursoAlvo?: string): Disciplina[] => {
            const lista = obterDisciplinasParaAlunoEClasse(alunoSelecionado, alvoCls, cursoAlvo);
            if (lista.length > 0) return lista;
            const nomesMatriz = resolverNomesDisciplinasPorClasseECurso(disciplinasDoAnoDocumento, alvoCls, cursoAlvo);
            return nomesMatriz.map((nome, i) => ({
              id: `cert-${normalizarClasse(alvoCls)}-${i}`,
              nome,
              sigla: nome.substring(0, 4).toUpperCase(),
              escolaId: escola.id
            } as Disciplina));
          };

          return (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-4 border-double border-gray-900 p-6 sm:p-8 md:p-10 rounded-xl shadow-lg max-w-5xl mx-auto text-black print:shadow-none print:p-6 print:border-4 print:border-double print:border-gray-900 space-y-6 ${fontScaleClassDoc}`}>
          {/* Cabeçalho Oficial com Insígnia Centralizada Fixa */}
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
            {cabCert ? (
              cabCert.map((linha, idx) => (
                <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                  {linha}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                {camposDoc.mostrarGovernoGabinete && (
                  <>
                    <p className="text-[11px] font-bold uppercase text-gray-800">
                      {escola.governoProvincial || (escola.provincia ? `GOVERNO PROVINCIAL DE ${escola.provincia.toUpperCase()}` : 'GOVERNO PROVINCIAL')}
                    </p>
                    <p className="text-[11px] font-bold uppercase text-gray-800">
                      {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                    </p>
                  </>
                )}
              </>
            )}
            <h2 className="text-sm sm:text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>
              {escola.nomeOficial}
            </h2>
            {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
              <p className="text-[10px] font-bold uppercase text-gray-600">
                {[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>

          {/* Título do Certificado Oficial Dinâmico por Nível de Ensino */}
          <div className="text-center py-2">
            <h3 className="text-base sm:text-lg font-serif font-black uppercase tracking-wider border-b-2 border-black inline-block px-6 pb-1" style={{ color: corDestaqueDoc, borderColor: corDestaqueDoc }}>
              {tituloCertRaw && configAtual?.tituloOficial !== 'CERTIFICADO DE HABILITAÇÕES'
                ? tituloCertRaw
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
          <div data-pdf-fixed-student="true" className="flex flex-col sm:flex-row gap-4 items-start">
            {camposDoc.mostrarFoto && alunoSelecionado.fotoUrl && (
              <img
                src={alunoSelecionado.fotoUrl}
                alt={alunoSelecionado.nomeCompleto}
                className="h-24 w-20 rounded-md object-cover border border-black shrink-0"
              />
            )}
            <div className="flex-1 text-xs sm:text-[13px] leading-relaxed text-justify space-y-3">
              <p>
                <strong>{nomeDiretorGeral}</strong>, {tituloDiretorGeral} da instituição de ensino <strong>{escola.nomeOficial}</strong>
                {camposDoc.mostrarDecreto ? (
                  <>
                    , criada sob o <strong>{limparTextoSistema(escola.decretoCriacao || configAtual?.artigoLegalDecreto) || 'Decreto de Criação da Instituição'}</strong>, ao abrigo da alínea e) do artigo 109º da Lei n.º 32/20 de 12 de Agosto (Lei de Bases do Sistema de Educação e Ensino)
                  </>
                ) : null}
                {aberturaCert ? `: ${aberturaCert}` : ':'}
              </p>

              <p>
                Certifica que <strong>{(alunoSelecionado.nomeCompleto || '[NOME DO ESTUDANTE]').toUpperCase()}</strong>
                {camposDoc.mostrarFiliacao && (
                  <>, {alunoSelecionado.genero === 'F' ? 'filha' : 'filho'} de <strong>{alunoSelecionado.nomePai || '—'}</strong> e de <strong>{alunoSelecionado.nomeMae || '—'}</strong></>
                )}
                {camposDoc.mostrarDataNascimento && (
                  <>, {alunoSelecionado.genero === 'F' ? 'nascida' : 'nascido'} aos <strong>{formatarDataAngolana(alunoSelecionado.dataNascimento, 'extenso')}</strong></>
                )}
                {camposDoc.mostrarNaturalidadeProvincia && (
                  <>, natural de <strong>{alunoSelecionado.naturalidade || '—'}</strong>, Município de <strong>{alunoSelecionado.municipioNascimento || '—'}</strong>, Província de <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong></>
                )}
                {camposDoc.mostrarBI && (
                  <>
                    , {alunoSelecionado.genero === 'F' ? 'portadora' : 'portador'} do {alunoSelecionado.tipoDocumento || 'Bilhete de Identidade'} n.º <strong>{biExibidoCert}</strong>
                    {camposDoc.mostrarDataEmissaoBI && (
                      <>, emitido aos <strong>{formatarDataAngolana(alunoSelecionado.dataEmissaoBI, 'extenso')}</strong>, pelo <strong>{alunoSelecionado.arquivoIdentificacao || '—'}</strong></>
                    )}
                  </>
                )}
                {camposDoc.mostrarResidencia && (alunoSelecionado.endereco || (alunoSelecionado as any).residencia) && (
                  <>, residente em <strong>{alunoSelecionado.endereco || (alunoSelecionado as any).residencia}</strong></>
                )}
                .
              </p>

              <p>
                {(() => {
                  const anoReal = anoAlunoDoc || '—';
                  const turnoSpan = camposDoc.mostrarTurmaSalaTurno && (turmaDoAluno?.nome || turmaDoAluno?.turno)
                    ? <>{turmaDoAluno?.nome ? <>, na Turma <strong>{turmaDoAluno.nome}</strong></> : null}{turmaDoAluno?.turno ? <>, Período <strong>{turmaDoAluno.turno}</strong></> : null}</>
                    : null;
                  if (tipoCertificadoEfetivo === 'primario_6') {
                    return <>Concluiu a <strong>6.ª Classe do Ensino Primário</strong>, no Ano Lectivo de <strong>{anoReal}</strong>{turnoSpan}, nos termos da matriz curricular nacional do Ensino Primário, tendo obtido as seguintes classificações:</>;
                  }
                  if (tipoCertificadoEfetivo === 'iciclo_9') {
                    return <>Concluiu a <strong>9.ª Classe do Iº Ciclo do Ensino Secundário Geral</strong>, no Ano Lectivo de <strong>{anoReal}</strong>{turnoSpan}, tendo obtido aproveitamento no Exame de Saída e as seguintes classificações:</>;
                  }
                  if (tipoCertificadoEfetivo === 'tecnico_12_13') {
                    return <>Concluiu a Formação Técnico-Profissional (<strong>{classeAlunoDoc || alunoSelecionado.classeId || '12.ª / 13.ª Classe'}</strong>), no Ano Lectivo de <strong>{anoReal}</strong>{camposDoc.mostrarCurso && cursoAlunoDoc ? <>, no Curso de Técnico Médio de <strong>{cursoAlunoDoc}</strong></> : null}{turnoSpan}, tendo obtido as seguintes classificações:</>;
                  }
                  return <>Concluiu a <strong>12.ª Classe do IIº Ciclo do Ensino Secundário Geral</strong>, no Ano Lectivo de <strong>{anoReal}</strong>{camposDoc.mostrarCurso && cursoAlunoDoc ? <>, na Área de <strong>{cursoAlunoDoc}</strong></> : null}{turnoSpan}, tendo obtido as seguintes classificações:</>;
                })()}
              </p>
            </div>
          </div>

          {/* TABELA 1: ENSINO PRIMÁRIO (6ª CLASSE) */}
          {tipoCertificadoEfetivo === 'primario_6' && (() => {
            const discs = obterDisciplinasCertificado('6ª', undefined);
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
                <table className="w-full text-xs border border-black border-collapse text-left table-auto">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left whitespace-normal break-words">DISCIPLINAS CURRICULARES (6.ª CLASSE)</th>
                      <th className="p-1.5 border-r border-black whitespace-normal break-words">Avaliação Contínua (MAC)</th>
                      <th className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} bg-gray-200 whitespace-normal break-words`}>Classificação Final</th>
                      {camposDoc.mostrarEscalaExtenso && (
                        <th className="p-1.5 w-[30%] whitespace-normal break-words">Classificação por Extenso</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium whitespace-normal break-words">{row.disc}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.mac !== null ? row.mac : '—'}</td>
                        <td className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center font-mono font-bold bg-gray-50 whitespace-nowrap`}>{row.cf !== null ? row.cf : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-1.5 text-center font-medium whitespace-normal break-words">{row.cf !== null ? converterNotaParaCertificadoExtenso(row.cf) : '—'}</td>
                        )}
                      </tr>
                    ))}
                    {camposDoc.mostrarMediaGeral && (
                      <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                        <td className="p-2 border-r border-black uppercase">MÉDIA GERAL DO ENSINO PRIMÁRIO</td>
                        <td className="p-2 border-r border-black text-center">Conclusão do Ensino Primário</td>
                        <td className={`p-2 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center text-sm font-black`}>{mediaFinalCalc !== null ? mediaFinalCalc : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-2 text-center text-xs font-black uppercase whitespace-normal break-words">{mediaFinalCalc !== null ? converterNotaParaCertificadoExtenso(mediaFinalCalc) : 'Sem notas lançadas'}</td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* TABELA 2: Iº CICLO DO ENSINO SECUNDÁRIO (7ª, 8ª e 9ª CLASSES) */}
          {tipoCertificadoEfetivo === 'iciclo_9' && (() => {
            const discs = obterDisciplinasCertificado('9ª', undefined);
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
                <table className="w-full text-xs border border-black border-collapse text-left table-auto">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left whitespace-normal break-words">DISCIPLINAS DO Iº CICLO</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">7.ª Classe</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">8.ª Classe</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">9.ª Classe</th>
                      <th className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} bg-gray-200 whitespace-nowrap`}>M. Final</th>
                      {camposDoc.mostrarEscalaExtenso && (
                        <th className="p-1.5 w-[28%] whitespace-normal break-words">Média por Extenso</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium whitespace-normal break-words">{row.disc}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.n7}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.n8}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono font-bold whitespace-nowrap">{row.n9}</td>
                        <td className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center font-mono font-bold bg-gray-50 whitespace-nowrap`}>{row.mf !== null ? row.mf : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-1.5 text-center font-medium whitespace-normal break-words">{row.mf !== null ? converterNotaParaCertificadoExtenso(row.mf) : '—'}</td>
                        )}
                      </tr>
                    ))}
                    {camposDoc.mostrarMediaGeral && (
                      <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                        <td className="p-2 border-r border-black uppercase">MÉDIA GERAL DO Iº CICLO</td>
                        <td colSpan={3} className="p-2 border-r border-black text-center">Conclusão do Iº Ciclo Geral</td>
                        <td className={`p-2 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center text-sm font-black`}>{mediaFinalCalc !== null ? mediaFinalCalc : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-2 text-center text-xs font-black uppercase whitespace-normal break-words">{mediaFinalCalc !== null ? converterNotaParaCertificadoExtenso(mediaFinalCalc) : 'Sem notas lançadas'}</td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* TABELA 3: IIº CICLO GERAL (10ª, 11ª e 12ª CLASSES) */}
          {tipoCertificadoEfetivo === 'iiciclo_12' && (() => {
            const discs = obterDisciplinasCertificado('12ª', cursoAlunoDoc);
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
                <table className="w-full text-xs border border-black border-collapse text-left table-auto">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left whitespace-normal break-words">DISCIPLINAS</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">10.ª Classe</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">11.ª Classe</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">12.ª Classe</th>
                      <th className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} bg-gray-200 whitespace-nowrap`}>M. Final</th>
                      {camposDoc.mostrarEscalaExtenso && (
                        <th className="p-1.5 w-[28%] whitespace-normal break-words">Média por Extenso</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium whitespace-normal break-words">{item.disciplinaNome}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{item.nota10}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{item.nota11}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{item.nota12}</td>
                        <td className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center font-mono font-bold bg-gray-50 whitespace-nowrap`}>{item.mediaFinal !== null ? item.mediaFinal : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-1.5 text-center font-medium whitespace-normal break-words">
                            {item.mediaFinal !== null ? converterNotaParaCertificadoExtenso(item.mediaFinal) : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                    {camposDoc.mostrarMediaGeral && (
                      <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                        <td className="p-2 border-r border-black uppercase">MÉDIA DO CICLO</td>
                        <td colSpan={3} className="p-2 border-r border-black text-center">Conclusão do Ensino Secundário Geral</td>
                        <td className={`p-2 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center text-sm font-black`}>{mediaFinalCiclo !== null ? mediaFinalCiclo : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-2 text-center text-xs font-black uppercase whitespace-normal break-words">{mediaFinalCiclo !== null ? converterNotaParaCertificadoExtenso(mediaFinalCiclo) : 'Sem notas lançadas'}</td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* TABELA 4: ENSINO TÉCNICO-PROFISSIONAL / MAGISTÉRIO (10ª A 13ª CLASSES) */}
          {tipoCertificadoEfetivo === 'tecnico_12_13' && (() => {
            const discs = obterDisciplinasCertificado(classeAlunoDoc || '12ª', cursoAlunoDoc);
            const notaPapGlobal = (() => {
              const discPap = discs.find(d => {
                const nm = normalizarNomeDisciplina(d.nome);
                return nm.includes('pap') || nm.includes('aptidao profissional') || nm.includes('estagio');
              });
              if (!discPap) return null;
              return resolverNotaRealAluno(discPap, classeAlunoDoc || '13ª').valorFinal;
            })();
            const linhas = discs.map(disc => {
              const r10 = resolverNotaRealAluno(disc, '10ª').valorFinal;
              const r11 = resolverNotaRealAluno(disc, '11ª').valorFinal;
              const r12 = resolverNotaRealAluno(disc, '12ª').valorFinal;
              const r13 = resolverNotaRealAluno(disc, '13ª').valorFinal;
              const nums = [r10, r11, r12, r13].filter((v): v is number => v !== null);
              const mf = nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
              const ehDiscPap = (() => {
                const nm = normalizarNomeDisciplina(disc.nome);
                return nm.includes('pap') || nm.includes('aptidao profissional') || nm.includes('estagio');
              })();
              const papVal = ehDiscPap ? (mf !== null ? mf : notaPapGlobal !== null ? Math.round(notaPapGlobal) : '—') : '—';
              return {
                disc: disc.nome,
                n10: r10 !== null ? Math.round(r10) : '—',
                n11: r11 !== null ? Math.round(r11) : '—',
                n12: r12 !== null ? Math.round(r12) : '—',
                n13: r13 !== null ? Math.round(r13) : '—',
                pap: papVal,
                mf
              };
            });
            const validas = linhas.filter(l => l.mf !== null);
            const mediaFinalTecnico = validas.length > 0 ? Math.round(validas.reduce((a, b) => a + (b.mf || 0), 0) / validas.length) : null;

            return (
              <div className="pt-2 overflow-x-auto">
                <table className="w-full text-xs border border-black border-collapse text-left table-auto">
                  <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                    <tr>
                      <th className="p-1.5 border-r border-black text-left whitespace-normal break-words">COMPONENTES DE FORMAÇÃO TÉCNICA</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">10.ª</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">11.ª</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">12.ª</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">13.ª</th>
                      <th className="p-1.5 border-r border-black whitespace-nowrap">PAP/Estágio</th>
                      <th className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} bg-gray-200 whitespace-nowrap`}>M. Final</th>
                      {camposDoc.mostrarEscalaExtenso && (
                        <th className="p-1.5 w-[24%] whitespace-normal break-words">Por Extenso</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[11px]">
                    {linhas.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-medium whitespace-normal break-words">{row.disc}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.n10}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.n11}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.n12}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.n13}</td>
                        <td className="p-1.5 border-r border-black text-center font-mono whitespace-nowrap">{row.pap}</td>
                        <td className={`p-1.5 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center font-mono font-bold bg-gray-50 whitespace-nowrap`}>{row.mf !== null ? row.mf : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-1.5 text-center font-medium whitespace-normal break-words">{row.mf !== null ? converterNotaParaCertificadoExtenso(row.mf) : '—'}</td>
                        )}
                      </tr>
                    ))}
                    {camposDoc.mostrarMediaGeral && (
                      <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                        <td className="p-2 border-r border-black uppercase">MÉDIA FINAL DO CURSO TÉCNICO</td>
                        <td colSpan={5} className="p-2 border-r border-black text-center">Habilitação de Técnico Médio</td>
                        <td className={`p-2 ${camposDoc.mostrarEscalaExtenso ? 'border-r border-black' : ''} text-center text-sm font-black`}>{mediaFinalTecnico !== null ? mediaFinalTecnico : '—'}</td>
                        {camposDoc.mostrarEscalaExtenso && (
                          <td className="p-2 text-center text-xs font-black uppercase whitespace-normal break-words">{mediaFinalTecnico !== null ? converterNotaParaCertificadoExtenso(mediaFinalTecnico) : 'Sem notas lançadas'}</td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Dados de Registo no Livro e Folha */}
          <div className="text-xs leading-relaxed text-justify space-y-2 pt-2">
            {(camposDoc.mostrarLivroFolhaRegisto || camposDoc.mostrarNumeroProcessoMatricula) && (
              <p>
                Registado
                {camposDoc.mostrarLivroFolhaRegisto && <> no Livro de Matrícula sob o n.º <strong>{alunoSelecionado.livroRegisto || '—'}</strong></>}
                {camposDoc.mostrarNumeroProcessoMatricula && <>, Processo n.º <strong>{alunoSelecionado.numeroProcesso || alunoSelecionado.codigoMatricula || '—'}</strong></>}
                {camposDoc.mostrarLivroFolhaRegisto && <>, Folha n.º <strong>{alunoSelecionado.folhaRegisto || '—'}</strong></>}
                .
              </p>
            )}
            <p>
              {fechamentoCert ||
                'Por ser verdade e ter sido requerido, mandou-se passar o presente Certificado que vai assinado e autenticado com o carimbo a óleo e selo branco em uso nesta Instituição de Ensino.'}
            </p>
            {camposDoc.mostrarDataLocalExtenso && (
              <p className="text-right pt-2 font-medium">
                {[escola.municipio, escola.provincia].filter(Boolean).join(', ') || 'República de Angola'}, aos {hojeAngolano('extenso')}.
              </p>
            )}
          </div>

          {/* Conferência + QR Code + Assinatura do Director */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs items-end border-t border-gray-300">
            <div className="flex flex-col items-start justify-end pb-2">
              <p className="font-bold text-gray-900 whitespace-nowrap">
                Conferido por: <span className="inline-block w-32 border-b border-black align-bottom ml-1" />
              </p>
              {rodapeCert && <p className="text-[9px] text-gray-600 mt-1">{rodapeCert}</p>}
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
                    anoLectivo: ctxCert.anoLectivo
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
          );
        })()
      )}

      {/* ========================================================================= */}
      {/* 4. PASSES ESCOLARES PERSONALIZADOS POR ESCOLA                             */}
      {/* ========================================================================= */}
      {docType === 'passes' && (() => {
        const tituloDiretorPass = obterTituloDiretorGeral(escola, funcionariosEscola);
        const alunosOrdenadosAlf = [...alunosDaTurma].sort((a, b) =>
          (a.nomeCompleto || '').trim().localeCompare((b.nomeCompleto || '').trim(), 'pt', { sensitivity: 'base' })
        );
        const disposicaoGrade = passConfig.disposicaoGrade || '8_por_folha';
        const porFolha = disposicaoGrade === 'individual' ? 1 : disposicaoGrade === '4_por_folha' ? 4 : 8;
        const paginasPassesDoc: Aluno[][] = [];
        for (let i = 0; i < alunosOrdenadosAlf.length; i += porFolha) {
          paginasPassesDoc.push(alunosOrdenadosAlf.slice(i, i + porFolha));
        }
        const anoBasePass = selectedAnoLectivo || escola.anoLectivoActivo || '';
        const anoFimPass = (anoBasePass.split('/')[1] || anoBasePass || String(new Date().getFullYear())).trim();
        const dataEmissaoPass = hojeAngolano('curto');
        const dataValidadePass = `31/07/${anoFimPass}`;
        const podeVerDocPass = visibilidadeUsuario.dadosSensiveis.verDocumentosIdentificacaoAlunos;
        const podeVerTelPass = visibilidadeUsuario.dadosSensiveis.verContactosAlunosEncarregados;

        return (
          <div 
            id="documento-para-impressao" 
            data-doc-root="true" 
            data-passes-grid="true"
            className="documento-oficial-print space-y-4 max-w-5xl mx-auto"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200 no-print flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Passes Escolares Personalizados:</strong> Estilo <strong>{passConfig.formatoLayout || 'classico_horizontal'}</strong>, cores institucionais da escola e impressão {formatoPaginaPdf === 'letter' ? 'Carta (Letter)' : 'A4'}.
              </div>
              <span className="font-bold bg-blue-200 dark:bg-blue-900 text-blue-950 dark:text-blue-100 px-2 py-0.5 rounded text-[11px]">
                {porFolha === 1 ? '1 passe por folha (Individual)' : `${porFolha} passes por folha ${formatoPaginaPdf === 'letter' ? 'Carta' : 'A4'}`}
              </span>
            </div>

            {paginasPassesDoc.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto my-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">Nenhum Estudante Selecionado para Emissão</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Selecione uma turma com estudantes matriculados para gerar os passes escolares personalizados.
                </p>
              </div>
            ) : (
              paginasPassesDoc.map((grupoPagina, pageIndex) => (
                <div
                  key={`doc-passes-page-${pageIndex}`}
                  data-passes-page="true"
                  className="passes-sheet-page pb-5 mb-4 print:pb-4 print:mb-0"
                >
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold mb-2 px-1 no-print">
                    <span>Folha {pageIndex + 1} de {paginasPassesDoc.length} ({porFolha} {porFolha === 1 ? 'passe' : 'passes'} por folha)</span>
                    <span>Passes {pageIndex * porFolha + 1} a {pageIndex * porFolha + grupoPagina.length}</span>
                  </div>
                  <div
                    className={
                      porFolha === 1
                        ? 'flex flex-col items-center gap-4'
                        : porFolha === 4
                        ? 'passes-sheet-grid grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3'
                        : 'passes-sheet-grid grid grid-cols-1 md:grid-cols-2 gap-2.5 print:grid-cols-2 print:gap-2'
                    }
                  >
                    {grupoPagina.map((aluno, idxInPage) => {
                      const turma = turmas.find(t => t.id === aluno.turmaId) || turmaSelecionada;
                      const numeroSequencial = pageIndex * porFolha + idxInPage + 1;
                      const alunoPassSeguro: Aluno = {
                        ...aluno,
                        numeroDocumento: podeVerDocPass ? aluno.numeroDocumento : '***',
                        numeroBI: podeVerDocPass ? aluno.numeroBI : '***',
                        telefone: podeVerTelPass ? aluno.telefone : '***',
                        telefoneEncarregado: podeVerTelPass ? aluno.telefoneEncarregado : '***',
                        encarregadoTelefone: podeVerTelPass ? aluno.encarregadoTelefone : '***'
                      };

                      return (
                        <div key={aluno.id} className="print:break-inside-avoid">
                          <SchoolPassCard
                            aluno={alunoPassSeguro}
                            turma={turma}
                            escola={escola}
                            passConfig={{
                              ...passConfig,
                              assinaturaDiretorUrl: passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl
                            }}
                            configSistema={configSistema}
                            visualizacao={passVisualizacao}
                            numeroSequencial={numeroSequencial}
                            dataEmissao={dataEmissaoPass}
                            dataValidade={dataValidadePass}
                            nomeDiretorCompleto={nomeDiretorGeral}
                            tituloDiretorOficial={tituloDiretorPass}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
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
        ) : (() => {
          const cabFichaAl = resolverCabecalhoPersonalizado({ aluno: alunoSelecionado, turma: turmaDoAluno });
          const tituloFichaAlPadrao = alunoSelecionado.genero === 'F' ? 'FICHA INDIVIDUAL DA ALUNA' : 'FICHA INDIVIDUAL DO ALUNO';
          const tituloFichaAlRaw = resolverTextoDiretor(configAtual?.tituloOficial, { aluno: alunoSelecionado, turma: turmaDoAluno });
          const tituloFichaAl = tituloFichaAlRaw && tituloFichaAlRaw.trim().toUpperCase() !== 'FICHA INDIVIDUAL DO ALUNO'
            ? tituloFichaAlRaw
            : tituloFichaAlPadrao;
          const aberturaFichaAl = resolverTextoDiretor(configAtual?.textoCorpoAbertura, { aluno: alunoSelecionado, turma: turmaDoAluno });
          const fechamentoFichaAl = resolverTextoDiretor(configAtual?.textoFechamento, { aluno: alunoSelecionado, turma: turmaDoAluno });
          const rodapeFichaAl = resolverTextoDiretor(configAtual?.textoRodape, { aluno: alunoSelecionado, turma: turmaDoAluno });
          const podeVerDocFichaAl = visibilidadeUsuario.dadosSensiveis.verDocumentosIdentificacaoAlunos;
          const podeVerTelFichaAl = visibilidadeUsuario.dadosSensiveis.verContactosAlunosEncarregados;
          const biFichaAl = podeVerDocFichaAl ? (alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—') : '*** Protegido ***';
          const telFichaAl = podeVerTelFichaAl ? (alunoSelecionado.telefoneEncarregado || alunoSelecionado.telefone || '—') : '*** Protegido ***';
          const anoFichaAl = alunoSelecionado.anoLectivo || alunoSelecionado.anoMatricula || turmaDoAluno?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo;
          const colsAssinFichaAl = 1 + (exibirAssinSecretariaDoc ? 1 : 0) + (exibirAssinDiretorDoc ? 1 : 0);

          return (
        <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-6 md:p-10 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-6 ${fontScaleClassDoc}`}>
          <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 border-b-2 border-black pb-3 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
                  <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
                ) : (
                  <InsigniaAngola size={56} />
                )}
              </div>
            )}
            {cabFichaAl ? (
              cabFichaAl.map((linha, idx) => (
                <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                  {linha}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                {camposDoc.mostrarGovernoGabinete && (
                  <>
                    <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
                    <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
                  </>
                )}
              </>
            )}
            <h2 className="text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>{escola.nomeOficial}</h2>
            {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
              <p className="text-[10px] font-bold uppercase text-gray-600">{[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}</p>
            )}
            <div className="pt-2">
              <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-blue-50" style={{ borderColor: corDestaqueDoc, color: corDestaqueDoc }}>
                {tituloFichaAl} — ANO LECTIVO {anoFichaAl}
              </span>
            </div>
          </div>

          {aberturaFichaAl && (
            <p className="text-xs text-justify text-gray-800 leading-relaxed">{aberturaFichaAl}</p>
          )}

          {/* Destaque Matrícula e Processo Fixo */}
          {camposDoc.mostrarNumeroProcessoMatricula && (
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
          )}

          {/* Foto e Dados Pessoais Fixos */}
          <div data-pdf-fixed-student="true" data-pdf-student-row="true" className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
            {camposDoc.mostrarFoto && (
              alunoSelecionado.fotoUrl && alunoSelecionado.fotoUrl.trim() !== '' ? (
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
              )
            )}
            <div data-pdf-student-grid="2" className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
              <div className="min-w-0 break-words"><span className="text-gray-600">Nome Completo:</span> <strong className="uppercase">{alunoSelecionado.nomeCompleto}</strong></div>
              <div className="min-w-0 break-words"><span className="text-gray-600">Gênero:</span> <strong>{alunoSelecionado.genero === 'F' ? 'Feminino' : 'Masculino'}</strong></div>
              {camposDoc.mostrarBI && (
                <div className="min-w-0 break-words"><span className="text-gray-600">Documento de Identificação:</span> <strong className="font-mono">{alunoSelecionado.tipoDocumento || 'BI'} nº {biFichaAl}</strong></div>
              )}
              {camposDoc.mostrarDataNascimento && (
                <div className="min-w-0 break-words"><span className="text-gray-600">Data de Nascimento:</span> <strong>{formatarDataAngolana(alunoSelecionado.dataNascimento, 'curto')}</strong></div>
              )}
              {camposDoc.mostrarNaturalidadeProvincia && (
                <>
                  <div className="min-w-0 break-words"><span className="text-gray-600">Naturalidade:</span> <strong>{alunoSelecionado.naturalidade || '—'}</strong></div>
                  <div className="min-w-0 break-words"><span className="text-gray-600">Província de Origem:</span> <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong></div>
                </>
              )}
              {camposDoc.mostrarResidencia && (
                <div className="sm:col-span-2 min-w-0 break-words"><span className="text-gray-600">Residência / Bairro:</span> <strong>{alunoSelecionado.endereco || '—'}</strong></div>
              )}
            </div>
          </div>

          {/* Filiação & Encarregado */}
          {(camposDoc.mostrarFiliacao || camposDoc.mostrarEncarregado || camposDoc.mostrarContactoEncarregado) && (
            <div data-pdf-fixed-student="true" className="border-b border-black pb-4 text-xs space-y-1">
              <h4 className="font-black uppercase text-[11px] text-gray-800">Filiação & Encarregado de Educação</h4>
              <div data-pdf-student-grid="2" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {camposDoc.mostrarFiliacao && (
                  <>
                    <div><span className="text-gray-600">Nome do Pai:</span> <strong>{alunoSelecionado.nomePai || '—'}</strong></div>
                    <div><span className="text-gray-600">Nome da Mãe:</span> <strong>{alunoSelecionado.nomeMae || '—'}</strong></div>
                  </>
                )}
                {camposDoc.mostrarEncarregado && (
                  <div><span className="text-gray-600">Encarregado de Educação:</span> <strong>{alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome || '—'}</strong></div>
                )}
                {camposDoc.mostrarContactoEncarregado && (
                  <div><span className="text-gray-600">Contacto do Encarregado:</span> <strong className="font-mono">{telFichaAl}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Dados Académicos */}
          {(camposDoc.mostrarTurmaSalaTurno || (camposDoc.mostrarCurso && ehSegundoCicloAlunoDoc && cursoAlunoDoc)) && (
            <div data-pdf-fixed-student="true" className="border-b border-black pb-4 text-xs space-y-1">
              <h4 className="font-black uppercase text-[11px] text-gray-800">Enquadramento Pedagógico</h4>
              <div data-pdf-student-grid="4" className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded">
                {camposDoc.mostrarTurmaSalaTurno && (
                  <>
                    <div><span className="text-gray-600 block">Classe:</span><strong>{classeAlunoDoc || '—'}</strong></div>
                    <div><span className="text-gray-600 block">Turma:</span><strong>{turmaDoAluno?.nome || '—'}</strong></div>
                    <div><span className="text-gray-600 block">Turno:</span><strong>{turmaDoAluno?.turno || '—'}</strong></div>
                    <div><span className="text-gray-600 block">Sala:</span><strong>{turmaDoAluno?.sala || '—'}</strong></div>
                  </>
                )}
                {camposDoc.mostrarCurso && ehSegundoCicloAlunoDoc && cursoAlunoDoc && (
                  <div className="col-span-2 sm:col-span-4 pt-1"><span className="text-gray-600">Curso:</span> <strong>{cursoAlunoDoc}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Registo Oficial de Ocorrências Aprovadas (Coordenador + Subdiretor Pedagógico) */}
          {(() => {
            const ocorrenciasAprovadasFicha = dbService.obterOcorrenciasAprovadasDossie(alunoSelecionado.ocorrencias);
            if (!camposDoc.mostrarHistoricoOcorrencias || ocorrenciasAprovadasFicha.length === 0) return null;
            return (
              <div className="border-b border-black pb-4 text-xs space-y-2">
                <h4 className="font-black uppercase text-[11px] text-gray-800">
                  {alunoSelecionado.genero === 'F' ? 'Registo Oficial de Ocorrências no Dossiê da Aluna' : 'Registo Oficial de Ocorrências no Dossiê do Aluno'}
                </h4>
                <div className="space-y-1.5">
                  {ocorrenciasAprovadasFicha.map((ocorr, oIdx) => (
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
            );
          })()}

          {fechamentoFichaAl && (
            <p className="text-xs text-justify text-gray-800 leading-relaxed">{fechamentoFichaAl}</p>
          )}
          {camposDoc.mostrarDataLocalExtenso && (
            <p className="text-right text-xs font-medium">{escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.</p>
          )}

          {/* Assinaturas Limpas e Oficiais */}
          <div className={`pt-6 grid grid-cols-1 ${colsAssinFichaAl === 3 ? 'sm:grid-cols-3' : colsAssinFichaAl === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-4 text-center text-xs`}>
            <div className="space-y-6 min-w-0">
              <p className="text-gray-700 font-bold whitespace-normal break-words">
                {obterTituloEncarregado((alunoSelecionado as any).encarregadoParentesco, alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome)}
              </p>
              <div className="border-b border-black w-full max-w-[160px] mx-auto" />
              <p className="font-semibold text-gray-800 text-[11px] whitespace-normal break-words">{alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome || 'Encarregado de Educação'}</p>
            </div>
            {exibirAssinSecretariaDoc && (
              <div className="space-y-6 min-w-0">
                <p className="text-gray-700 font-bold whitespace-normal break-words">{getTituloChefeSecretaria(escola)}</p>
                <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                <p className="font-semibold text-gray-800 text-[11px] whitespace-normal break-words">{chefeSecretariaNome}</p>
              </div>
            )}
            {exibirAssinDiretorDoc && (
              <div className="space-y-6 min-w-0">
                <p className="text-gray-700 font-bold whitespace-normal break-words">{getTituloDiretor(escola)}</p>
                <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                <p className="font-semibold text-gray-800 text-[11px] whitespace-normal break-words">{nomeDiretorGeral}</p>
              </div>
            )}
          </div>

          {(exibirCodigoQrDoc || rodapeFichaAl) && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 text-[9px] text-gray-600">
              <div>{rodapeFichaAl && <p>{rodapeFichaAl}</p>}</div>
              {exibirCodigoQrDoc && (
                <OfficialQrCode
                  value={gerarPayloadQrEstudante(alunoSelecionado, escola, turmaDoAluno)}
                  size={52}
                />
              )}
            </div>
          )}
        </div>
          );
        })()
      )}

      {/* ========================================================================= */}
      {/* 5. FICHA INDIVIDUAL DO FUNCIONÁRIO (CADASTRO BIOGRÁFICO & LABORAL COMPLETO) */}
      {/* ========================================================================= */}
      {docType === 'ficha_individual_funcionario' && (
        <div className="space-y-4">
          {/* Seletor de Funcionário no modo ecrã */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between no-print text-xs">
            <div>
              <span className="font-bold text-indigo-950 dark:text-indigo-100 block">Selecionar Funcionário para Emissão de Ficha:</span>
              <span className="text-indigo-700 dark:text-indigo-300">Visualize e imprima o dossier profissional completo com os campos configurados pela direção.</span>
            </div>
            <select
              value={selectedFuncionarioId}
              onChange={(e) => setSelectedFuncionarioId(e.target.value)}
              className="p-2 border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 font-bold text-xs"
            >
              {funcionariosLista.map(f => (
                <option key={f.id} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
              ))}
            </select>
          </div>

          {funcionarioSelecionado ? (() => {
            const cabFunc = resolverCabecalhoPersonalizado({ funcionario: funcionarioSelecionado });
            const tituloFuncPadrao = funcionarioSelecionado.genero === 'F'
              ? 'FICHA INDIVIDUAL DE CADASTRO DA FUNCIONÁRIA E DOCENTE'
              : 'FICHA INDIVIDUAL DE CADASTRO DO FUNCIONÁRIO E DOCENTE';
            const tituloFuncRaw = resolverTextoDiretor(configAtual?.tituloOficial, { funcionario: funcionarioSelecionado });
            const tituloFunc = tituloFuncRaw && tituloFuncRaw.trim().toUpperCase() !== 'FICHA INDIVIDUAL DO FUNCIONÁRIO'
              ? tituloFuncRaw
              : tituloFuncPadrao;
            const aberturaFunc = resolverTextoDiretor(configAtual?.textoCorpoAbertura, { funcionario: funcionarioSelecionado });
            const fechamentoFunc = resolverTextoDiretor(configAtual?.textoFechamento, { funcionario: funcionarioSelecionado });
            const rodapeFunc = resolverTextoDiretor(configAtual?.textoRodape, { funcionario: funcionarioSelecionado });
            const podeVerSensiveisFunc = visibilidadeUsuario.dadosSensiveis.verDadosSensiveisFuncionarios || funcionarioSelecionado.id === currentUser?.id;
            const atribuicoesFunc = dbService.getAtribuicoes().filter(a => a.professorId === funcionarioSelecionado.id);
            const colsAssinFunc = 1 + (exibirAssinSecretariaDoc ? 1 : 0) + (exibirAssinDiretorDoc ? 1 : 0);

            return (
            <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-6 md:p-10 rounded-xl shadow-md max-w-4xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-5 ${fontScaleClassDoc}`}>
              <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 border-b-2 border-black pb-3 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
                      <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
                    ) : (
                      <InsigniaAngola size={56} />
                    )}
                  </div>
                )}
                {cabFunc ? (
                  cabFunc.map((linha, idx) => (
                    <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                      {linha}
                    </p>
                  ))
                ) : (
                  <>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                    {camposDoc.mostrarGovernoGabinete && (
                      <>
                        <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
                        <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
                      </>
                    )}
                  </>
                )}
                <h2 className="text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>{escola.nomeOficial}</h2>
                {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
                  <p className="text-[10px] font-bold uppercase text-gray-600">{[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}</p>
                )}
                <div className="pt-2">
                  <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-indigo-50" style={{ borderColor: corDestaqueDoc, color: corDestaqueDoc }}>
                    {tituloFunc}
                  </span>
                </div>
              </div>

              {aberturaFunc && (
                <p className="text-xs text-justify text-gray-800 leading-relaxed">{aberturaFunc}</p>
              )}

              {/* Foto e Identificação Fixa */}
              <div data-pdf-fixed-student="true" data-pdf-student-row="true" className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
                {camposDoc.mostrarFuncionarioFoto && (
                  funcionarioSelecionado.fotoUrl && funcionarioSelecionado.fotoUrl.trim() !== '' ? (
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
                  )
                )}
                <div data-pdf-student-grid="2" className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
                  <div className="min-w-0 break-words"><span className="text-gray-600">Nome Completo:</span> <strong className="uppercase">{funcionarioSelecionado.nomeCompleto}</strong></div>
                  {camposDoc.mostrarFuncionarioBI && (
                    <div className="min-w-0 break-words"><span className="text-gray-600">N.º do Bilhete de Identidade:</span> <strong className="font-mono">{podeVerSensiveisFunc ? (funcionarioSelecionado.numeroBI || '—') : '*** Protegido ***'}</strong></div>
                  )}
                  {camposDoc.mostrarFuncionarioNif && (
                    <div className="min-w-0 break-words"><span className="text-gray-600">NIF:</span> <strong className="font-mono">{podeVerSensiveisFunc ? ((funcionarioSelecionado as any).nif || '—') : '*** Protegido ***'}</strong></div>
                  )}
                  <div className="min-w-0 break-words"><span className="text-gray-600">Gênero:</span> <strong>{funcionarioSelecionado.genero === 'M' ? 'Masculino' : 'Feminino'}</strong></div>
                  <div className="min-w-0 break-words"><span className="text-gray-600">Estado Civil:</span> <strong>{funcionarioSelecionado.estadoCivil || '—'}</strong></div>
                  <div className="min-w-0 break-words"><span className="text-gray-600">Nacionalidade:</span> <strong>{funcionarioSelecionado.nacionalidade || 'Angolana'}</strong></div>
                  <div className="min-w-0 break-words"><span className="text-gray-600">Naturalidade:</span> <strong>{funcionarioSelecionado.naturalidadeMunicipio || (funcionarioSelecionado as any).naturalidade || '—'}</strong></div>
                  {camposDoc.mostrarFuncionarioContatos && (
                    <>
                      <div className="min-w-0 break-words"><span className="text-gray-600">Telefone Principal:</span> <strong className="font-mono">{podeVerSensiveisFunc ? (funcionarioSelecionado.telefone || '—') : '*** Protegido ***'}</strong></div>
                      <div className="min-w-0 break-words"><span className="text-gray-600">Correio Electrónico:</span> <strong className="break-all">{podeVerSensiveisFunc ? (funcionarioSelecionado.email || '—') : '*** Protegido ***'}</strong></div>
                    </>
                  )}
                </div>
              </div>

              {/* Dados Académicos e Carreira */}
              {(camposDoc.mostrarFuncionarioGrauEspecialidade || camposDoc.mostrarFuncionarioCategoriaContrato || camposDoc.mostrarFuncionarioNumeroAgente || camposDoc.mostrarFuncionarioCargaHoraria) && (
                <div className="border-b border-black pb-4 text-xs space-y-1.5">
                  <h4 className="font-black uppercase text-[11px] text-gray-800">Habilitações Literárias & Carreira Profissional</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
                    {camposDoc.mostrarFuncionarioGrauEspecialidade && (
                      <>
                        <div><span className="text-gray-600">Grau Académico:</span> <strong>{funcionarioSelecionado.grauAcademico || '—'}</strong></div>
                        <div><span className="text-gray-600">Especialidade / Curso:</span> <strong>{funcionarioSelecionado.especialidade || funcionarioSelecionado.habilitacoes || '—'}</strong></div>
                      </>
                    )}
                    {camposDoc.mostrarFuncionarioCategoriaContrato && (
                      <>
                        <div><span className="text-gray-600">Categoria Profissional:</span> <strong>{funcionarioSelecionado.categoriaProfissional || '—'}</strong></div>
                        <div><span className="text-gray-600">Cargo / Função Atual:</span> <strong>{funcionarioSelecionado.cargo || '—'}</strong></div>
                        <div><span className="text-gray-600">Perfil / Categoria Funcional:</span> <strong className="text-blue-900">{funcionarioSelecionado.role}</strong></div>
                        <div><span className="text-gray-600">Tipo de Contrato:</span> <strong>{funcionarioSelecionado.tipoContrato || '—'}</strong></div>
                        <div><span className="text-gray-600">Situação Funcional:</span> <strong className="text-emerald-800">{funcionarioSelecionado.situacaoFuncional || 'Ativo no Efetivo'}</strong></div>
                        <div><span className="text-gray-600">Data de Admissão:</span> <strong>{formatarDataAngolana(funcionarioSelecionado.dataAdmissao, 'curto')}</strong></div>
                      </>
                    )}
                    {camposDoc.mostrarFuncionarioNumeroAgente && (
                      <div><span className="text-gray-600">N.º Mecanográfico / Agente:</span> <strong className="font-mono">{funcionarioSelecionado.numeroAgente || (funcionarioSelecionado as any).numeroMecanografico || '—'}</strong></div>
                    )}
                    {camposDoc.mostrarFuncionarioCargaHoraria && (
                      <>
                        <div><span className="text-gray-600">Carga Horária Semanal:</span> <strong>{funcionarioSelecionado.cargaHorariaSemanal ? `${funcionarioSelecionado.cargaHorariaSemanal} horas/semana` : '—'}</strong></div>
                        {atribuicoesFunc.length > 0 && (
                          <div className="sm:col-span-2">
                            <span className="text-gray-600 block mb-0.5">Turmas & Disciplinas Lecionadas:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {atribuicoesFunc.map(at => {
                                const tNome = turmas.find(t => t.id === at.turmaId)?.nome || at.turmaId;
                                const dNome = disciplinas.find(d => d.id === at.disciplinaId)?.nome || at.disciplinaId;
                                return (
                                  <span key={at.id} className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-800">
                                    {tNome} • {dNome}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Dados Bancários e Segurança Social */}
              {camposDoc.mostrarFuncionarioDadosBancariosIbanInss && (
                <div className="border-b border-black pb-4 text-xs space-y-1.5">
                  <h4 className="font-black uppercase text-[11px] text-gray-800">Dados Bancários & Segurança Social (INSS)</h4>
                  {podeVerSensiveisFunc ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div><span className="text-gray-600 block">Instituição Bancária:</span><strong>{funcionarioSelecionado.banco || '—'}</strong></div>
                      <div className="sm:col-span-2"><span className="text-gray-600 block">IBAN Bancário:</span><strong className="font-mono">{funcionarioSelecionado.iban || '—'}</strong></div>
                      <div><span className="text-gray-600 block">N.º de Segurança Social (INSS):</span><strong className="font-mono">{funcionarioSelecionado.numeroSegurancaSocial || '—'}</strong></div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic">Dados bancários e INSS protegidos pelas políticas de privacidade da direcção.</p>
                  )}
                </div>
              )}

              {fechamentoFunc && (
                <p className="text-xs text-justify text-gray-800 leading-relaxed">{fechamentoFunc}</p>
              )}
              {camposDoc.mostrarDataLocalExtenso && (
                <p className="text-right text-xs font-medium">{escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.</p>
              )}

              {/* Assinaturas Oficiais: Título -> Traço -> Nome */}
              <div className={`pt-6 grid grid-cols-1 ${colsAssinFunc === 3 ? 'sm:grid-cols-3' : colsAssinFunc === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-4 text-center text-xs items-end`}>
                <div className="space-y-1 min-w-0">
                  <p className="text-gray-900 font-bold uppercase text-[11px] whitespace-normal break-words">{obterTituloFuncionario(funcionarioSelecionado, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                  <p className="font-semibold text-gray-800 text-[11px] uppercase whitespace-normal break-words">{funcionarioSelecionado.nomeCompleto}</p>
                </div>
                {exibirAssinSecretariaDoc && (
                  <div className="space-y-1 min-w-0">
                    <p className="text-gray-900 font-bold uppercase text-[11px] whitespace-normal break-words">{getTituloChefeSecretaria(escola)}</p>
                    <div className="h-6" />
                    <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                    <p className="font-semibold text-gray-800 text-[11px] uppercase whitespace-normal break-words">{chefeSecretariaNome}</p>
                  </div>
                )}
                {exibirAssinDiretorDoc && (
                  <div className="space-y-1 flex flex-col items-center justify-end min-w-0">
                    <p className="text-gray-900 font-bold uppercase text-[11px] whitespace-normal break-words">{getTituloDiretor(escola)}</p>
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
                    <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                    <p className="font-semibold text-gray-800 text-[11px] uppercase whitespace-normal break-words">{nomeDiretorGeral}</p>
                  </div>
                )}
              </div>

              {(exibirCodigoQrDoc || rodapeFunc) && (
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 text-[9px] text-gray-600">
                  <div>{rodapeFunc && <p>{rodapeFunc}</p>}</div>
                  {exibirCodigoQrDoc && (
                    <OfficialQrCode
                      value={gerarPayloadQrDocumento({
                        docType: 'FICHA_FUNCIONARIO',
                        escolaId: escola.id,
                        docRef: podeVerSensiveisFunc ? (funcionarioSelecionado.numeroBI || funcionarioSelecionado.id) : funcionarioSelecionado.id,
                        anoLectivo: escola.anoLectivoActivo
                      })}
                      size={50}
                    />
                  )}
                </div>
              )}
            </div>
            );
          })() : (
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
      {docType === 'ficha_presencas' && (() => {
        const cabPres = resolverCabecalhoPersonalizado({ turma: turmaSelecionada });
        const tituloPres = resolverTextoDiretor(configAtual?.tituloOficial, { turma: turmaSelecionada }) || 'FOLHA OFICIAL DE PRESENÇAS E ASSIDUIDADE';
        const aberturaPres = resolverTextoDiretor(configAtual?.textoCorpoAbertura, { turma: turmaSelecionada });
        const rodapePres = resolverTextoDiretor(configAtual?.textoRodape, { turma: turmaSelecionada });
        const colsAssinPres = 1 + (exibirAssinSubdiretorDoc ? 1 : 0) + (exibirAssinDiretorDoc ? 1 : 0);

        return (
        <div className="space-y-4">
          {/* Seletor de Período e Turma no ecrã */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-3 no-print text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-emerald-950 dark:text-emerald-100 block">Seleção do Período de Presenças:</span>
                <span className="text-emerald-800 dark:text-emerald-300">Escolha a data de início e a data de fim para emissão da folha de ponto.</span>
              </div>
              <div className="flex items-center space-x-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 block">Data de Início</label>
                  <input
                    type="date"
                    value={dataInicioPresencas}
                    onChange={(e) => setDataInicioPresencas(e.target.value)}
                    className="p-1.5 border border-emerald-400 dark:border-emerald-700 rounded bg-white dark:bg-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 block">Data de Fim</label>
                  <input
                    type="date"
                    value={dataFimPresencas}
                    onChange={(e) => setDataFimPresencas(e.target.value)}
                    className="p-1.5 border border-emerald-400 dark:border-emerald-700 rounded bg-white dark:bg-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div id="documento-para-impressao" data-doc-root="true" className={`documento-oficial-print bg-white border-2 border-gray-900 p-6 md:p-10 rounded-xl shadow-md max-w-5xl mx-auto text-black print:shadow-none print:p-6 print:border-2 print:border-gray-900 space-y-5 ${fontScaleClassDoc}`}>
            <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 border-b-2 border-black pb-3 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
                    <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
                  ) : (
                    <InsigniaAngola size={56} />
                  )}
                </div>
              )}
              {cabPres ? (
                cabPres.map((linha, idx) => (
                  <p key={idx} className={idx === 0 ? 'text-xs font-black uppercase tracking-widest text-gray-900' : 'text-[11px] font-bold uppercase text-gray-800'}>
                    {linha}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                  {camposDoc.mostrarGovernoGabinete && (
                    <>
                      <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
                      <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
                    </>
                  )}
                </>
              )}
              <h2 className="text-base font-black uppercase pt-1" style={{ color: corDestaqueDoc }}>{escola.nomeOficial}</h2>
              {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
                <p className="text-[10px] font-bold uppercase text-gray-600">{[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}</p>
              )}
              <div className="pt-2">
                <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-emerald-50" style={{ borderColor: corDestaqueDoc, color: corDestaqueDoc }}>
                  {tituloPres} — PERÍODO DE {formatarDataAngolana(dataInicioPresencas, 'curto')} A {formatarDataAngolana(dataFimPresencas, 'curto')}
                </span>
              </div>
            </div>

            {aberturaPres && (
              <p className="text-xs text-justify text-gray-800 leading-relaxed">{aberturaPres}</p>
            )}

            {camposDoc.mostrarTurmaSalaTurno && (
              <div data-pdf-fixed-student="true" className="flex justify-between items-center text-xs font-bold bg-gray-50 p-2.5 rounded border border-gray-300">
                <div>Turma: <span className="text-blue-900 font-extrabold">{turmaSelecionada?.nome || '—'}</span> ({turmaSelecionada?.classe || '—'})</div>
                <div>Turno: <span>{turmaSelecionada?.turno || '—'}</span> • Sala: <span>{turmaSelecionada?.sala || '—'}</span></div>
                <div>Ano Lectivo: <span>{turmaSelecionada?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo}</span></div>
              </div>
            )}

            {/* Tabela de Presenças Reais */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border border-black table-auto">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="p-1 border-r border-black w-8 text-center">Nº</th>
                    {camposDoc.mostrarNumeroProcessoMatricula && (
                      <th className="p-1 border-r border-black w-24 text-center">Matrícula</th>
                    )}
                    <th className="p-1 border-r border-black text-left">Nome Completo do Estudante</th>
                    <th className="p-1 border-r border-black w-14 text-center">Presenças</th>
                    {camposDoc.mostrarFaltas && (
                      <>
                        <th className="p-1 border-r border-black w-14 text-center">F. Just.</th>
                        <th className="p-1 border-r border-black w-14 text-center">F. Injust.</th>
                        <th className="p-1 border-r border-black w-16 text-center">% Assid.</th>
                      </>
                    )}
                    <th className="p-1 text-center">Rubrica</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosDaTurma.length === 0 ? (
                    <tr>
                      <td colSpan={4 + (camposDoc.mostrarNumeroProcessoMatricula ? 1 : 0) + (camposDoc.mostrarFaltas ? 3 : 0)} className="p-6 text-center text-gray-500 italic">
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
                          {camposDoc.mostrarNumeroProcessoMatricula && (
                            <td className="p-1 border-r border-gray-300 font-mono text-center">{aluno.codigoMatricula}</td>
                          )}
                          <td className="p-1 border-r border-gray-300 font-bold uppercase">{aluno.nomeCompleto}</td>
                          <td className="p-1 border-r border-gray-300 text-center font-bold text-emerald-800">{totalRegs > 0 ? qtdP : '—'}</td>
                          {camposDoc.mostrarFaltas && (
                            <>
                              <td className="p-1 border-r border-gray-300 text-center">{totalRegs > 0 ? qtdFJ : '—'}</td>
                              <td className="p-1 border-r border-gray-300 text-center text-red-700">{totalRegs > 0 ? qtdFI : '—'}</td>
                              <td className="p-1 border-r border-gray-300 text-center font-bold">{perc}</td>
                            </>
                          )}
                          <td className="p-1 text-center font-serif italic text-gray-400">Visto</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {camposDoc.mostrarDataLocalExtenso && (
              <p className="text-right text-xs font-medium">{escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.</p>
            )}

            {/* Assinaturas Oficiais com Coordenador, Subdirector e Director Geral */}
            <div className={`pt-6 grid grid-cols-1 ${colsAssinPres === 3 ? 'sm:grid-cols-3' : colsAssinPres === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-6 text-center text-xs items-end`}>
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-gray-900 whitespace-normal break-words">{obterTituloCoordenadorTurma(turmaSelecionada, funcionariosEscola)}</p>
                <div className="h-6" />
                <div className="border-b border-black w-full max-w-[176px] mx-auto" />
                <p className="font-semibold text-gray-800 text-[11px] whitespace-normal break-words">{obterNomeCoordenadorTurma(turmaSelecionada, funcionariosEscola)}</p>
              </div>
              {exibirAssinSubdiretorDoc && (
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-gray-900 whitespace-normal break-words">{getTituloSubPedagogico(escola)}</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-full max-w-[176px] mx-auto" />
                  <p className="font-semibold text-gray-800 text-[11px] whitespace-normal break-words">{subdirectorPedagogicoNome}</p>
                </div>
              )}
              {exibirAssinDiretorDoc && (
                <div className="space-y-1 flex flex-col items-center justify-end min-w-0">
                  <p className="font-bold text-gray-900 whitespace-normal break-words">{getTituloDiretor(escola)}</p>
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
                  <div className="border-b border-black w-full max-w-[176px] mx-auto" />
                  <p className="font-semibold text-gray-800 text-[11px] whitespace-normal break-words">{nomeDiretorGeral}</p>
                </div>
              )}
            </div>

            {(exibirCodigoQrDoc || rodapePres) && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-4 text-[9px] text-gray-600">
                <div className="text-left">
                  <p>Período: {formatarDataAngolana(dataInicioPresencas, 'curto')} a {formatarDataAngolana(dataFimPresencas, 'curto')} • {turmaSelecionada?.nome || 'Turma'}.</p>
                  {rodapePres && <p className="mt-0.5">{rodapePres}</p>}
                </div>
                {exibirCodigoQrDoc && (
                  <OfficialQrCode
                    value={gerarPayloadQrDocumento({
                      docType: 'FICHA_PRESENCAS',
                      escolaId: escola.id,
                      docRef: `${turmaSelecionada?.id || 'turma'}-${dataInicioPresencas}-${dataFimPresencas}`,
                      turmaId: turmaSelecionada?.id,
                      anoLectivo: turmaSelecionada?.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                    })}
                    size={50}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 7. RECIBOS DE EMOLUMENTOS (8 POR FOLHA A4 OU TÉRMICO POS)                 */}
      {/* ========================================================================= */}
      {docType === 'recibos' && (
        modoRecibo === 'a4_8' ? (
          <div className="max-w-5xl mx-auto">
            <FeeReceiptsA4Grid
              escola={escola}
              recibos={recibosA4ParaEmitir}
              nomeAtendentePadrao={currentUser?.nomeCompleto || nomeDiretorGeral}
              gridId="documento-para-impressao"
            />
          </div>
        ) : (
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
                  ? `${alunoSelecionado.genero === 'F' ? 'A estudante' : 'O estudante'} ${alunoSelecionado.nomeCompleto} não possui recibos ou transações financeiras lançadas na tesouraria.`
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
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">Data:</span>
                  <span className="text-right">{formatarDataHoraAngolana(reciboAtivoAluno.dataHora)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">Recibo Nº:</span>
                  <span className="font-bold text-right break-all">{reciboAtivoAluno.numeroRecibo}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="shrink-0">{alunoSelecionado.genero === 'F' ? 'Aluna:' : 'Aluno:'}</span>
                  <span className="font-bold text-right break-words min-w-0">{alunoSelecionado.nomeCompleto}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">Matrícula:</span>
                  <span className="text-right font-mono">{alunoSelecionado.codigoMatricula}</span>
                </div>
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

              <div className="text-center pt-2 border-t border-dashed border-gray-400 space-y-2 text-[9px]">
                <div className="space-y-1">
                  <p className="font-bold uppercase text-[9px] text-gray-900">A Direcção da Escola</p>
                  <div className="border-b border-black w-40 mx-auto pt-4" />
                  <p className="font-bold text-[9px] text-gray-950 whitespace-normal break-words">
                    {reciboAtivoAluno.operadorNome || currentUser?.nomeCompleto || nomeDiretorGeral}
                  </p>
                </div>
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
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )
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
        ) : (() => {
          const cabTermo = resolverCabecalhoPersonalizado({ turma: turmaSelecionada });
          const tituloTermo = resolverTextoDiretor(configAtual?.tituloOficial, { turma: turmaSelecionada }) || 'TERMO DE EXAME & DELIBERAÇÃO FINAL DO JÚRI';
          const aberturaTermo = resolverTextoDiretor(configAtual?.textoCorpoAbertura, { turma: turmaSelecionada });
          const fechamentoTermo = resolverTextoDiretor(configAtual?.textoFechamento, { turma: turmaSelecionada });
          const rodapeTermo = resolverTextoDiretor(configAtual?.textoRodape, { turma: turmaSelecionada });
          const colsAssinTermo = 3 + (exibirAssinDiretorDoc ? 1 : 0);

          return (
        <div className="flex justify-center">
          <div 
            id="documento-para-impressao"
            data-doc-root="true"
            className={`documento-oficial-print bg-white border border-gray-400 p-8 shadow-lg max-w-[950px] w-full text-black space-y-5 print:border-none print:shadow-none print:p-0 print:max-w-none ${fontScaleClassDoc}`}
          >
            {/* Topo Oficial com Brasão Oficial da República de Angola Fixo */}
            <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className={`relative text-center space-y-1 ${exibirLogoEscolaDoc ? 'px-16 sm:px-20' : ''}`}>
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
              {cabTermo ? (
                cabTermo.map((linha, idx) => (
                  <p key={idx} className={idx === 0 ? 'font-serif font-black text-xs uppercase tracking-widest text-gray-800' : 'font-serif font-bold text-xs uppercase text-gray-700'}>
                    {linha}
                  </p>
                ))
              ) : (
                <>
                  <p className="font-serif font-black text-xs uppercase tracking-widest text-gray-800">
                    REPÚBLICA DE ANGOLA
                  </p>
                  {camposDoc.mostrarGovernoGabinete && (
                    <p className="font-serif font-bold text-xs uppercase text-gray-700">
                      {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${(escola.provincia || 'LUANDA').toUpperCase()}`} • {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                    </p>
                  )}
                </>
              )}
              <h3 className="font-serif font-black text-base uppercase mt-1 print:text-black" style={{ color: corDestaqueDoc }}>
                {escola.nomeOficial}
              </h3>
              {camposDoc.mostrarProvinciaMunicipio && (escola.municipio || escola.provincia) && (
                <p className="text-[10px] font-serif text-gray-600 uppercase">
                  {[escola.municipio, escola.provincia].filter(Boolean).join(' • ')}
                </p>
              )}
              <div className="pt-2">
                <span className="font-bold text-sm tracking-wider uppercase bg-gray-100 px-4 py-1 rounded border border-gray-300 inline-block" style={{ borderColor: corDestaqueDoc, color: corDestaqueDoc }}>
                  {tituloTermo}
                </span>
              </div>
            </div>

            {aberturaTermo && (
              <p className="text-xs font-serif text-justify leading-relaxed text-gray-800">{aberturaTermo}</p>
            )}

            {/* Metadados Oficiais Fixos */}
            {camposDoc.mostrarTurmaSalaTurno && (
              <div data-pdf-fixed-student="true" data-pdf-student-grid="4" className="bg-gray-50 border border-black p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 font-medium">
                <div>
                  <span className="text-gray-600 block text-[10px]">
                    {camposDoc.mostrarCurso && isSegundoCiclo(turmaSelecionada.classe) ? 'Classe / Curso:' : 'Classe:'}
                  </span>
                  <strong className="text-gray-900">
                    {turmaSelecionada.classe}
                    {camposDoc.mostrarCurso && isSegundoCiclo(turmaSelecionada.classe) && turmaSelecionada.curso ? ` • ${turmaSelecionada.curso}` : ''}
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
            )}

            {/* Tabela de Discentes */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-black">
                <thead className="bg-gray-100 font-bold border-b border-black text-center">
                  <tr>
                    <th className="p-1.5 border-r border-black w-8">Nº</th>
                    {camposDoc.mostrarNumeroProcessoMatricula && (
                      <th className="p-1.5 border-r border-black w-24">Processo</th>
                    )}
                    <th className="p-1.5 border-r border-black text-left">Nome Completo do Discente</th>
                    {camposDoc.mostrarMediaGeral && (
                      <th className="p-1.5 border-r border-black w-14">MFD</th>
                    )}
                    <th className="p-1.5 border-r border-black w-14">Exame</th>
                    <th className="p-1.5 border-r border-black w-14">Recurso</th>
                    {camposDoc.mostrarMediaGeral && (
                      <th className="p-1.5 border-r border-black w-14 bg-gray-200">M. Final</th>
                    )}
                    {camposDoc.mostrarSituacaoFinal && (
                      <th className="p-1.5 border-r border-black w-24">Resultado</th>
                    )}
                    <th className="p-1.5 w-20">Rubrica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-center">
                  {(() => {
                    const regraTermo = obterRegraParaClasse(turmaSelecionada.classe, 3, turmaSelecionada.nivelEnsino);
                    return alunosDaTurma.map((aluno, idx) => {
                      const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id && (n.turmaId === turmaSelecionada.id || !n.turmaId));
                      const medias = disciplinasDaClasseDocumento
                        .map(d => resolverNotaRealParaAluno(aluno, d, turmaSelecionada.classe).valorFinal)
                        .filter((v): v is number => v !== null && !isNaN(v));
                      const mfd = medias.length > 0 ? Math.round(medias.reduce((a, b) => a + b, 0) / medias.length) : null;
                      const notaExame = notasAluno.find(n => typeof n.notaExame === 'number' && n.notaExame > 0)?.notaExame ?? null;
                      const notaRecurso = (notasAluno.find(n => (n as any).notaRecurso && (n as any).notaRecurso > 0) as any)?.notaRecurso || null;
                      const notaFinal = notaRecurso !== null
                        ? Math.round(Math.max(notaRecurso, mfd || 0))
                        : mfd !== null
                        ? calcularMediaFinal3Trimestre(mfd, mfd, mfd, notaExame ?? undefined, regraTermo, turmaSelecionada.classe).mediaFinal
                        : null;
                      const obsTermo = obterObservacaoDisciplina(notaFinal, turmaSelecionada.classe, aluno.estado, regraTermo);

                      return (
                        <tr key={aluno.id} className="hover:bg-gray-50">
                          <td className="p-1.5 border-r border-black font-bold">{idx + 1}</td>
                          {camposDoc.mostrarNumeroProcessoMatricula && (
                            <td className="p-1.5 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                          )}
                          <td className="p-1.5 border-r border-black text-left font-bold uppercase whitespace-normal break-words min-w-[180px]">{aluno.nomeCompleto}</td>
                          {camposDoc.mostrarMediaGeral && (
                            <td className="p-1.5 border-r border-black font-mono">{mfd !== null ? Math.round(mfd) : '—'}</td>
                          )}
                          <td className="p-1.5 border-r border-black font-mono">{notaExame !== null ? notaExame.toFixed(1) : '—'}</td>
                          <td className="p-1.5 border-r border-black font-mono">{notaRecurso !== null ? notaRecurso.toFixed(1) : '—'}</td>
                          {camposDoc.mostrarMediaGeral && (
                            <td className="p-1.5 border-r border-black font-mono font-black bg-gray-50">{notaFinal !== null ? Math.round(notaFinal) : '—'}</td>
                          )}
                          {camposDoc.mostrarSituacaoFinal && (
                            <td className="p-1.5 border-r border-black font-bold text-[10px]">
                              {obsTermo.categoria !== 'Pendente' ? (
                                <span className={
                                  obsTermo.categoria === 'Aprovado'
                                    ? 'text-emerald-800'
                                    : obsTermo.categoria === 'Recurso'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                                }>
                                  {obterSituacaoTextoPorGenero(obsTermo.texto, aluno.genero)}
                                </span>
                              ) : '—'}
                            </td>
                          )}
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
                {fechamentoTermo ||
                  `Em ${hojeAngolano('extenso')}, reuniu-se a Comissão de Júri devidamente credenciada para deliberação final das provas de exame e recurso dos discentes acima identificados. Nada mais havendo a constar, lavrou-se o presente Termo oficial que vai assinado pela comissão e homologado pela Direcção da Escola.`}
              </p>
              {camposDoc.mostrarDataLocalExtenso && (
                <p className="text-right font-sans text-xs font-medium">{escola.municipio || escola.provincia || 'Angola'}, aos {hojeAngolano('extenso')}.</p>
              )}

              <div className={`grid grid-cols-2 ${colsAssinTermo === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 text-center pt-4 items-end`}>
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold whitespace-normal break-words">{obterTituloPresidenteJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px] whitespace-normal break-words">{obterPresidenteJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold whitespace-normal break-words">{obterTituloPrimeiroVogalJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px] whitespace-normal break-words">{obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola).primeiroVogal}</p>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] text-gray-900 font-sans uppercase font-bold whitespace-normal break-words">{obterTituloSegundoVogalJuri(juriTurmaSelecionada, funcionariosEscola)}</p>
                  <div className="h-6" />
                  <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                  <p className="font-bold text-gray-800 font-sans text-[11px] whitespace-normal break-words">{obterVogaisJuri(juriTurmaSelecionada, funcionariosEscola).segundoVogal}</p>
                </div>
                {exibirAssinDiretorDoc && (
                  <div className="space-y-1 flex flex-col items-center justify-end min-w-0">
                    <p className="text-[11px] text-gray-900 font-sans uppercase font-bold whitespace-normal break-words">{tituloDiretorGeral} (Homologação)</p>
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
                    <div className="border-b border-black w-full max-w-[160px] mx-auto" />
                    <p className="font-bold text-gray-800 font-sans text-[11px] whitespace-normal break-words">{nomeDiretorGeral}</p>
                  </div>
                )}
              </div>

              {(exibirCodigoQrDoc || rodapeTermo) && (
                <div className="mt-4 pt-3 border-t border-gray-300 flex items-center justify-between gap-4 font-sans text-[9px] text-gray-600">
                  <div>{rodapeTermo && <p>{rodapeTermo}</p>}</div>
                  {exibirCodigoQrDoc && (
                    <OfficialQrCode
                      value={gerarPayloadQrDocumento({
                        docType: 'TERMO_EXAME',
                        escolaId: escola.id,
                        docRef: `TERMO-${turmaSelecionada.id}`,
                        turmaId: turmaSelecionada.id,
                        anoLectivo: turmaSelecionada.anoLectivo || selectedAnoLectivo || escola.anoLectivoActivo
                      })}
                      size={54}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
          );
        })()
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
            <p className="text-[9px] text-slate-400 truncate">Documento Oficial Escolar</p>
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
            setPassConfig(dbService.obterConfiguracaoPasses(escola.id));
          }}
        />
      )}
    </div>
  );
};
