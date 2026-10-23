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
  Settings
} from 'lucide-react';
import {
  getTurmasPorClasse,
  normalizarClasse,
  isSegundoCiclo,
  isPrimeiroCiclo,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  getSalaDaTurma,
  getCursoDaTurma,
  filtrarDisciplinasDaClasse
} from '../services/academicHierarchyService';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { Escola, Aluno, Turma, Disciplina, NotaTrimestralConsolidada, ComissaoJuri, Funcionario } from '../types';
import { formatarTextoPorGenero, validarElegibilidadeCertificado, converterComportamentoParaConceito } from '../services/macEngine';
import { converterNotaParaExtensoMED, numeroParaExtenso } from '../utils/numberToWords';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument, downloadExcelFile } from '../utils/curriculoAngola';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { DocumentTemplateConfigModal } from './DocumentTemplateConfigModal';

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
  | 'termos_exame';

interface PrintingDocumentsViewProps {
  escola: Escola;
  alunos: Aluno[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  initialDocType?: DocumentType;
}

export const PrintingDocumentsView: React.FC<PrintingDocumentsViewProps> = ({
  escola,
  alunos,
  turmas,
  disciplinas,
  notasConsolidadas,
  initialDocType
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialDocType || 'boletim_oficial');

  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
  }, [initialDocType]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>(alunos[0]?.id || 'aluno-ndilu');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmas[0]?.id || '');
  const [selectedClasse, setSelectedClasse] = useState<string>('9ª');
  const [buscaAlunoDocumento, setBuscaAlunoDocumento] = useState<string>('');

  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  const turmasDaClasseSelecionada = useMemo(() => {
    const list = getTurmasPorClasse(turmas, selectedClasse);
    return list.length > 0 ? list : turmas;
  }, [turmas, selectedClasse]);

  const alunosFiltradosIndividual = useMemo(() => {
    let list = alunos;
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
  }, [alunos, selectedClasse, selectedTurmaId, buscaAlunoDocumento, turmas]);

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

  const configSistema = dbService.getConfiguracaoSistema();
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
  const funcionariosLista: Funcionario[] = useMemo(() => dbService.obterFuncionarios(), [escola.id]);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState<string>(funcionariosLista[0]?.id || '');
  const funcionarioSelecionado = funcionariosLista.find(f => f.id === selectedFuncionarioId) || funcionariosLista[0];
  const [dataInicioPresencas, setDataInicioPresencas] = useState<string>('2026-03-01');
  const [dataFimPresencas, setDataFimPresencas] = useState<string>('2026-03-31');

  // Selecionar aluno ativo
  const alunoSelecionado = alunos.find(a => a.id === selectedAlunoId) || alunos[0];
  const turmaDoAluno = turmas.find(t => t.id === alunoSelecionado?.turmaId) || turmas[0];

  // Filtro de alunos da turma para passes ou emissão em lote
  const turmaSelecionada = turmas.find(t => t.id === selectedTurmaId) || turmaDoAluno;
  const alunosDaTurma = alunos.filter(a => a.turmaId === turmaSelecionada?.id || a.turmaId === selectedTurmaId);
  const alunosDaClasse = alunos.filter(a => a.classeId === selectedClasse);

  // Alunos no escopo de impressão
  const alunosParaImprimir = modoEmissao === 'turma' 
    ? alunosDaTurma 
    : modoEmissao === 'classe' 
      ? alunosDaClasse 
      : [alunoSelecionado].filter(Boolean);

  const [modalConfigDocOpen, setModalConfigDocOpen] = useState(false);

  // Disciplinas estritas da classe/curso selecionado para documentos oficiais
  const classeEfetivaDocumento = turmaSelecionada?.classe || alunoSelecionado?.classeId || selectedClasse;
  const cursoEfetivoDocumento = turmaSelecionada?.curso || alunoSelecionado?.curso;

  const disciplinasDaClasseDocumento = useMemo(() => {
    return filtrarDisciplinasDaClasse(disciplinas, classeEfetivaDocumento, cursoEfetivoDocumento);
  }, [disciplinas, classeEfetivaDocumento, cursoEfetivoDocumento]);

  // Notas consolidadas do aluno filtradas estritamente pelas disciplinas daquela classe
  const notasDoAluno = useMemo(() => {
    const raw = notasConsolidadas.filter(n => n.alunoId === alunoSelecionado?.id);
    return raw.filter(n => disciplinasDaClasseDocumento.some(d => d.id === n.disciplinaId));
  }, [notasConsolidadas, alunoSelecionado?.id, disciplinasDaClasseDocumento]);

  // Determinar dinamicamente o nível e modelo do certificado para classes terminais
  const tipoCertificadoEfetivo = useMemo(() => {
    if (tipoCertificadoSelecionado !== 'auto') return tipoCertificadoSelecionado;
    const classe = (alunoSelecionado?.classeId || turmaSelecionada?.classe || '').toLowerCase();
    const curso = (alunoSelecionado?.curso || turmaSelecionada?.curso || '').toLowerCase();
    if (classe.includes('6') || classe.includes('primário') || classe.includes('primario')) return 'primario_6';
    if (classe.includes('7') || classe.includes('8') || classe.includes('9') || classe.includes('i ciclo') || classe.includes('iº')) return 'iciclo_9';
    if (classe.includes('13') || curso.includes('técnico') || curso.includes('tecnico') || curso.includes('magistério') || curso.includes('magisterio')) return 'tecnico_12_13';
    return 'iiciclo_12';
  }, [tipoCertificadoSelecionado, alunoSelecionado, turmaSelecionada]);

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

  // Configurações personalizadas de dizeres, carimbos, insígnia e assinaturas salvas pelo Diretor
  const [configuracoesDoc, setConfiguracoesDoc] = useState(() => dbService.getConfiguracoesDocumentos(escola.id));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  const recarregarConfiguracoes = () => {
    setConfiguracoesDoc(dbService.getConfiguracoesDocumentos(escola.id));
  };

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

  const handleBaixarPDF = async () => {
    const el = document.getElementById('documento-para-impressao');
    if (!el) {
      alert('Não foi possível localizar o documento visualizado para gerar o PDF.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const orientacao = (configAtual?.disposicao?.orientacao || (docType === 'pautas' || docType === 'termos_exame' || docType === 'ficha_presencas' ? 'landscape' : 'portrait')) as 'portrait' | 'landscape';
      const alunoNomeLimpo = alunoSelecionado?.nomeCompleto?.replace(/[^a-zA-Z0-9]/g, '_') || 'Oficial';
      const turmaNomeLimpo = turmaSelecionada?.nome?.replace(/[^a-zA-Z0-9]/g, '_') || 'Turma';
      const anoLimpo = (escola.anoLectivoActivo || '2025_2026').replace(/[\/\\]/g, '_');
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
      } else {
        docNomeLimpo = `${docType.toUpperCase()}_${alunoNomeLimpo}_${siglaLimpa}`;
      }

      const nomeBase = docNomeLimpo;

      const ok = await downloadElementAsPdf(el, nomeBase, {
        orientation: orientacao,
        scale: 2
      });
      if (ok) {
        setPdfSuccessToast(`Ficheiro PDF "${nomeBase}.pdf" gerado e descarregado com sucesso!`);
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
    const el = document.getElementById('documento-para-impressao');
    if (el) {
      imprimirElementoDiretamente(el, `${docType.toUpperCase()} - ${escola.nomeOficial}`);
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
      const linhas = (notasOficiaisAluno.length > 0 ? notasOficiaisAluno : notasDoAluno).map((n: any) => ({
        'Disciplina': n.disciplinaNome,
        'MAC': n.mac || '—',
        'NPP': n.npp || '—',
        'NPT': n.npt || '—',
        'Média Trimestral': n.notaFinal || n.mediaTrimestral || '—',
        'Classificação': (n.notaFinal || n.mediaTrimestral || 0) >= 10 ? 'Aprovado' : 'Não Transita'
      }));
      downloadExcelFile('Boletim_Notas', linhas, `Boletim_${alunoSelecionado?.codigoMatricula?.replace(/[\/\\]/g, '_') || 'Aluno'}.xlsx`);
    } else if (docType === 'pautas') {
      const linhas = alunosDaTurma.map((al, idx) => ({
        'Nº': al.numeroOrdem || idx + 1,
        'Nº Matrícula': al.codigoMatricula,
        'Nome do Aluno': al.nomeCompleto,
        'Gênero': al.genero === 'M' ? 'Masculino' : 'Feminino',
        'Turma': turmaSelecionada?.nome || '',
        'Classe': turmaSelecionada?.classe || '',
        'Resultado': 'Aprovado'
      }));
      downloadExcelFile('Pauta_Oficial', linhas, `Pauta_${turmaSelecionada?.nome || 'Turma'}.xlsx`);
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

  // Cálculo da média geral
  const mediaGeralCalculada = notasOficiaisAluno.length > 0
    ? (notasOficiaisAluno.reduce((acc: number, curr: any) => acc + (curr.notaFinal || curr.mediaTrimestral || 0), 0) / notasOficiaisAluno.length).toFixed(1)
    : notasDoAluno.length > 0
      ? (notasDoAluno.reduce((acc: number, curr: any) => acc + (curr.mediaTrimestral || 0), 0) / notasDoAluno.length).toFixed(1)
      : '13.1';

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
            <button
              onClick={handleBaixarExcel}
              className="px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar dados do documento em formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Baixar Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleBaixarHTML}
              className="px-3.5 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar arquivo HTML formatado para abrir e imprimir off-line"
            >
              <Download className="h-4 w-4 text-blue-700" />
              <span>Baixar Documento (HTML)</span>
            </button>

            <button
              onClick={() => {
                setAssinaturaPreview(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl || '');
                setShowAssinaturaModal(true);
              }}
              className="px-3 py-2 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Carregar ou atualizar a assinatura digitalizada do Diretor Geral para boletins e passes"
            >
              <PenTool className="h-4 w-4 text-indigo-700" />
              <span>Assinatura Director</span>
            </button>

            <button
              type="button"
              onClick={() => setModalConfigDocOpen(true)}
              className="px-3 py-2 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Configurar dizeres oficiais, cabeçalhos e disposição visual dos documentos com pré-visualização ao vivo"
            >
              <Settings className="h-4 w-4 text-amber-700" />
              <span>Dizeres & Disposição A4</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors inline-flex items-center space-x-2 shadow-xs cursor-pointer"
              title="Gerar e descarregar ficheiro .PDF de alta definição"
            >
              <Download className="h-4 w-4" />
              <span>{isGeneratingPdf ? 'A processar PDF...' : 'Baixar PDF Oficial'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Documento</span>
            </button>
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

        {/* Navigation Tabs - 6 Document Types */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
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

          <button
            onClick={() => setDocType('ficha_presencas')}
            className={`p-2.5 rounded-lg border-2 text-xs font-bold transition-colors flex items-center space-x-2 ${
              docType === 'ficha_presencas' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-600 shadow-2xs' 
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Table className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">Ficha de Presenças</span>
          </button>

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

        {/* Filter Selection Controls com Hierarquia Classe -> Turma -> Sala -> Curso */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
          {/* Informação contextual de associação */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800">
              Coerência Académica de Emissão:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Seleção de Classe */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">1. Classe Curricular</label>
              <select
                value={selectedClasse}
                onChange={(e) => {
                  const novaCl = e.target.value;
                  setSelectedClasse(novaCl);
                  const validas = getTurmasPorClasse(turmas, novaCl);
                  if (validas.length > 0) {
                    setSelectedTurmaId(validas[0].id);
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {todasClasses.map(cls => (
                  <option key={`doc-cl-${cls}`} value={cls}>{cls} {cls !== 'Iniciação' ? 'Classe' : ''}</option>
                ))}
              </select>
            </div>

            {/* 2. Seleção de Turma */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                2. Turma ({turmasDaClasseSelecionada.length} na {selectedClasse})
              </label>
              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {turmasDaClasseSelecionada.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Seletor de Aluno ou Informação de Emissão */}
            {modoEmissao === 'individual' ? (
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">3. Selecionar Aluno</label>
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

          {/* Pesquisa rápida de aluno sanitizada no modo individual */}
          {modoEmissao === 'individual' && (
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
      {/* 1. BOLETIM DE NOTAS TRIMESTRAL (MODELO OFICIAL MED - SCREENSHOT 1) */}
      {/* ========================================================================= */}
      {docType === 'boletim_oficial' && (
        <div id="documento-para-impressao" className="bg-white border-2 border-gray-800 p-6 md:p-8 rounded-xl shadow-md max-w-4xl mx-auto text-black print:border-none print:shadow-none print:p-0">
          {/* Cabeçalho Oficial MED Angola */}
          <div className="relative border-b-2 border-black pb-3">
            {/* VISTO DO DIRECTOR GERAL na parte superior esquerda */}
            <div className="absolute left-0 top-0 text-left border border-black p-1.5 rounded bg-white w-36 print:w-32 z-10 block print:block shadow-2xs">
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
              <p className="text-[7.5px] font-bold text-gray-700 leading-tight">O Director Geral</p>
              <div className="h-8 my-0.5 flex items-center justify-center border-b border-gray-400">
                {(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl) ? (
                  <img 
                    src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                    alt="Assinatura Diretor" 
                    className="max-h-7 object-contain" 
                  />
                ) : (
                  <span className="text-[7px] text-gray-400 italic font-mono">[Chancela / Assinatura]</span>
                )}
              </div>
              <p className="text-[7px] text-gray-800 truncate font-bold">{escola.diretorGeralNome || 'Direcção Geral'}</p>
              <p className="text-[6.5px] text-gray-500 font-mono">Data: ___/___/20___</p>
            </div>

            {/* Logotipo da Escola na parte superior direita */}
            {(escola.logotipoUrl || escola.logotipo) && (
              <div className="absolute right-0 top-0 block print:block">
                <img 
                  src={escola.logotipoUrl || escola.logotipo} 
                  alt={`Logotipo ${escola.nomeOficial}`} 
                  className="h-14 w-14 object-contain rounded-md border border-gray-200 print:border-none" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Insígnia Nacional da República de Angola Centralizada antes de REPÚBLICA DE ANGOLA */}
            <div className="text-center space-y-0.5">
              <div className="flex justify-center mb-1">
                {configSistema.insigniaNacionalUrl ? (
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
              <p className="text-[11px] font-black uppercase tracking-wider">REPÚBLICA DE ANGOLA</p>
              <p className="text-[10px] font-bold uppercase tracking-wide">
                {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase()}`}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide">
                {escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}
              </p>
              <h1 className="text-sm sm:text-base font-black uppercase text-gray-950 pt-1">
                {escola.nomeOficial}
              </h1>
              <div className="pt-2">
                <span className="text-xs sm:text-sm font-black uppercase border border-black px-4 py-1 inline-block bg-gray-50">
                  BOLETIM DE NOTAS — {escola.trimestreActivo || 'II'}º TRIMESTRE
                </span>
              </div>
            </div>
          </div>

          {/* Dados Pessoais e Académicos do Aluno */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-[11px] py-3 border-b border-black">
            <div>
              <span className="text-gray-600 block">N.º de Ordem:</span>
              <strong className="font-mono text-sm">{alunoSelecionado.numeroOrdem || '1'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">N.º de Matrícula:</span>
              <strong className="font-mono">{alunoSelecionado.codigoMatricula || alunoSelecionado.numeroInterno}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-600 block">Nome do(a) Aluno(a):</span>
              <strong className="text-xs uppercase">{alunoSelecionado.nomeCompleto}</strong>
            </div>

            <div>
              <span className="text-gray-600 block">Classe:</span>
              <strong>{alunoSelecionado.classeId || turmaDoAluno.classe}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Turma:</span>
              <strong>{turmaDoAluno.nome}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Turno:</span>
              <strong>{turmaDoAluno.turno || 'Manhã'}</strong>
            </div>
            <div>
              <span className="text-gray-600 block">Sala:</span>
              <strong>{turmaDoAluno.sala || 'Sala 01'}</strong>
            </div>

            <div className="sm:col-span-2">
              <span className="text-gray-600 block">Curso:</span>
              <strong>{alunoSelecionado.curso || turmaDoAluno.curso || 'Ensino Secundário Geral'}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-600 block">Opção:</span>
              <strong>{alunoSelecionado.opcaoCurso || 'Formação Geral'}</strong>
            </div>
          </div>

          {/* Tabela de Notas Trimestrais com MAC, NPP, NPT, MT, Faltas, Comportamento, Assiduidade */}
          <div className="pt-3">
            <table className="w-full text-[10px] sm:text-[11px] border border-black text-left">
              <thead className="bg-gray-100 font-bold border-b border-black text-center text-[9px] sm:text-[10px]">
                <tr>
                  <th className="p-1.5 border-r border-black text-left">DISCIPLINA</th>
                  <th className="p-1 border-r border-black w-12" title="Média de Avaliação Contínua">MAC{escola.trimestreActivo}</th>
                  <th className="p-1 border-r border-black w-12" title="Nota da Prova do Professor">NPP{escola.trimestreActivo}</th>
                  <th className="p-1 border-r border-black w-12" title="Nota da Prova Trimestral">NPT{escola.trimestreActivo}</th>
                  <th className="p-1 border-r border-black w-14 bg-gray-200" title="Média Trimestral">MT{escola.trimestreActivo}</th>
                  <th className="p-1 border-r border-black w-12">N.º F</th>
                  <th className="p-1 border-r border-black w-24">Comport.</th>
                  <th className="p-1 w-24">Assiduidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {notasDoAluno.length > 0 ? (
                  notasDoAluno.map((nota) => {
                    const disc = disciplinas.find(d => d.id === nota.disciplinaId);
                    return (
                      <tr key={nota.id} className="hover:bg-gray-50">
                        <td className="p-1.5 border-r border-black font-semibold uppercase">{disc?.nome || nota.disciplinaId}</td>
                        <td className="p-1 border-r border-black text-center font-mono">{nota.mac?.toFixed(1) || '—'}</td>
                        <td className="p-1 border-r border-black text-center font-mono">{nota.npp?.toFixed(1) || '—'}</td>
                        <td className="p-1 border-r border-black text-center font-mono">{nota.npt?.toFixed(1) || nota.provaTrimestral?.toFixed(1) || '—'}</td>
                        <td className="p-1 border-r border-black text-center font-mono font-black bg-gray-50">
                          {nota.mediaTrimestral?.toFixed(1) || '—'}
                        </td>
                        <td className="p-1 border-r border-black text-center font-mono">{nota.faltas || 0}</td>
                        <td className="p-1 border-r border-black text-center text-[9px] font-semibold">{nota.comportamentoConceito || 'Excelente'}</td>
                        <td className="p-1 text-center text-[9px] font-semibold">{nota.assiduidadeConceito || 'Excelente'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      Nenhuma nota consolidada encontrada para este estudante no trimestre selecionado.
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
                  {mediaGeralCalculada} Valores
                </span>
              </div>
              <p className="text-gray-700">
                <strong>Observação Pedagógica:</strong> {Number(mediaGeralCalculada) >= 10 ? 'Aproveitamento Positivo (Apto)' : 'Necessita de Apoio Pedagógico'}
              </p>
              <p className="text-gray-500 text-[9px] pt-1">
                Emitido aos {new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })} via SGE-NG Angola.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <div className="text-center">
                <div className="h-16 w-16 bg-white border border-gray-400 p-1 flex items-center justify-center mx-auto">
                  <QrCode className="h-14 w-14" />
                </div>
                <span className="text-[8px] text-gray-500 block mt-0.5">Autenticidade MED</span>
              </div>
            </div>
          </div>

          {/* Assinaturas Oficiais */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-[10px] sm:text-[11px] text-center mt-6">
            <div>
              <div className="w-52 border-b border-black mx-auto" />
              <p className="font-bold text-gray-900 mt-1">O(A) Director(a) de Turma</p>
              <p className="text-gray-600 text-[10px]">{turmaDoAluno.coordenadorId ? 'Docente Coordenador' : 'Prof. Responsável'}</p>
            </div>
            <div>
              <div className="w-52 border-b border-black mx-auto" />
              <p className="font-bold text-gray-900 mt-1">O Subdirector Pedagógico</p>
              <p className="text-gray-600 text-[10px]">{escola.subdiretorPedagogicoNome || 'Não Atribuído'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PAUTA GERAL / FINAL HOMOLOGADA (MODELO OFICIAL MED ANGOLA)             */}
      {/* ========================================================================= */}
      {docType === 'pautas' && (
        <div id="documento-para-impressao" className="bg-white border-2 border-gray-900 p-6 md:p-8 rounded-xl shadow-md max-w-6xl mx-auto text-black print:border-none print:shadow-none print:p-0 space-y-6">
          {/* Cabeçalho Oficial com Insígnia Centralizada */}
          <div className="text-center space-y-1 border-b-2 border-black pb-3">
            <div className="flex justify-center mb-1">
              {configSistema.insigniaNacionalUrl ? (
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
            <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
            <p className="text-[11px] font-bold uppercase text-gray-800">
              {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}
            </p>
            <p className="text-[11px] font-bold uppercase text-gray-800">
              {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
            </p>
            <h2 className="text-base sm:text-lg font-black uppercase text-gray-950 pt-1">
              {escola.nomeOficial}
            </h2>

            {/* Distinção Rigorosa: Pauta Final Homologada vs Pauta Geral Provisória */}
            <div className="pt-2">
              {juriTurmaSelecionada ? (
                <div className="space-y-1">
                  <span className="text-sm sm:text-base font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-emerald-50 text-emerald-950 tracking-wider">
                    PAUTA FINAL HOMOLOGADA — ANO LECTIVO {turmaSelecionada.anoLectivo || escola.anoLectivoActivo}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                    <span className="px-3 py-0.5 bg-emerald-100 text-emerald-900 font-black rounded-full border border-emerald-300 inline-flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Homologada pelo Júri de Exames</span>
                    </span>
                    <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300">
                      Sessão: {juriTurmaSelecionada.numeroSessao || 'Sessão Oficial'} • Ata n.º {juriTurmaSelecionada.ata?.numeroAta || '001/2026'}
                    </span>
                    <span className="text-gray-500 font-semibold text-[11px]">
                      Homologada em: {new Date(juriTurmaSelecionada.pautaHomologadaEm || Date.now()).toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-sm sm:text-base font-black uppercase border-2 border-dashed border-amber-600 px-6 py-1.5 inline-block bg-amber-50 text-amber-950 tracking-wider">
                    PAUTA GERAL (PROVISÓRIA) — ANO LECTIVO {turmaSelecionada.anoLectivo || escola.anoLectivoActivo}
                  </span>
                  <div className="pt-1">
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 text-center font-bold">
                      ⚠️ AGUARDANDO DELIBERAÇÃO DA COMISSÃO DE JÚRI • As notas desta pauta geral refletem o aproveitamento contínuo preliminar. Conforme normas do MED, a emissão definitiva de Certificados e Declarações requer a Pauta Final Homologada pela Comissão de Júri.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dados da Turma & Classe */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs py-2 border-b border-black">
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
            <div>
              <span className="text-gray-600 block text-[10px]">Curso:</span>
              <strong className="truncate block">{turmaSelecionada.curso || 'Ensino Secundário Geral'}</strong>
            </div>
          </div>

          {/* Tabela Oficial da Pauta (Todos os Alunos da Turma x Disciplinas) */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border border-black text-center">
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
                  <th className="p-1 border-r border-black w-10 text-emerald-800" title="Disciplinas Positivas">Pos.</th>
                  <th className="p-1 border-r border-black w-10 text-red-800" title="Disciplinas Negativas">Neg.</th>
                  <th className="p-1 border-r border-black w-12 bg-gray-200">Média</th>
                  <th className="p-1 border-r border-black w-24 bg-green-50" title="Somatório / Média das Avaliações Comportamentais dos Professores">Comportamento Geral</th>
                  <th className="p-1 min-w-[110px]">Resultado Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {alunosDaTurma.length === 0 ? (
                  <tr>
                    <td colSpan={disciplinasDaClasseDocumento.length + 7} className="p-6 text-center text-gray-500 italic">
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

                    const escalaAprovacao = 10;

                    return (
                      <tr key={aluno.id} className="hover:bg-gray-50">
                        <td className="p-1 border-r border-black font-mono font-bold">{idx + 1}</td>
                        <td className="p-1 border-r border-black font-mono text-[10px]">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                        <td className="p-1 border-r border-black text-left font-bold text-gray-900 truncate max-w-[200px]">{aluno.nomeCompleto}</td>
                        
                        {disciplinasDaClasseDocumento.map(d => {
                          const nConsol = notasHomologadas.find(nh => nh.disciplinaId === d.id) || notasConsolidadas.find(nc => nc.alunoId === aluno.id && nc.disciplinaId === d.id);
                          const notaValor = nConsol?.notaFinal || nConsol?.mediaTrimestral;
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
                                  <span>{Math.round(notaValor)}</span>
                                  {notaAlterada && (
                                    <span className="text-[9px] text-purple-700 font-black" title={`Ajustada pelo Júri de ${notaAlterada.notaAnterior} para ${notaAlterada.novaNota}. Motivo: ${notaAlterada.motivo}`}>*</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-1 border-r border-black font-bold text-emerald-800">{totalPositivas}</td>
                        <td className="p-1 border-r border-black font-bold text-red-700">{totalNegativas}</td>
                        <td className="p-1 border-r border-black font-bold bg-gray-50">
                          {disciplinasComNota > 0 ? (somaNotas / disciplinasComNota).toFixed(1) : '-'}
                        </td>
                        <td className="p-1 border-r border-black font-bold text-[9px] bg-green-50/30">
                          {(() => {
                            const notasAluno = notasConsolidadas.filter(n => n.alunoId === aluno.id && (n.turmaId === turmaSelecionada.id || !n.turmaId));
                            const notasComp = notasAluno.filter(n => typeof n.comportamentoNota === 'number' && n.comportamentoNota > 0).map(n => n.comportamentoNota);
                            const mediaComp = notasComp.length > 0 ? (notasComp.reduce((a, b) => a + b, 0) / notasComp.length) : 16;
                            const conceito = converterComportamentoParaConceito(mediaComp);
                            return (
                              <span className={`inline-block px-1.5 py-0.5 rounded font-black ${
                                conceito === 'Excelente' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                conceito === 'Bom' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                conceito === 'Suficiente' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                conceito === 'Insuficiente' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {conceito} ({mediaComp.toFixed(0)}v)
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
                            <span className="text-[9px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Aguardando Júri
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Legenda de Notas Alteradas pelo Júri */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-600 pt-1 border-t border-gray-200">
            <div>
              <span>* Indica nota alterada deliberativamente pela Comissão de Júri de Exame em conformidade com o regulamento do MED.</span>
            </div>
            <div className="font-semibold text-gray-800">
              Total de Estudantes Avaliados: {alunosDaTurma.length}
            </div>
          </div>

          {/* Assinaturas Oficiais com Traço Rigoroso Entre Título e Nome */}
          <div className="pt-6 border-t-2 border-black">
            <div className="text-center font-bold text-[10px] uppercase tracking-wider mb-6 text-gray-800">
              {juriTurmaSelecionada 
                ? 'Termos Oficiais de Homologação da Comissão de Júri de Exame' 
                : 'Corpo Técnico Pedagógico da Turma'}
            </div>

            {juriTurmaSelecionada ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                {/* Presidente do Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">O Presidente da Comissão de Júri</p>
                  <div className="w-48 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {juriTurmaSelecionada.membros?.find(m => m.funcao === 'Presidente')?.nome || 'Não Atribuído'}
                  </p>
                </div>

                {/* Secretário do Júri */}
                <div className="space-y-1">
                  <p className="font-black text-gray-950 uppercase text-[11px]">O Secretário da Comissão de Júri</p>
                  <div className="w-48 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {juriTurmaSelecionada.membros?.find(m => m.funcao === 'Secretario')?.nome || 'Não Atribuído'}
                  </p>
                </div>

                {/* Director Geral com Assinatura Digitalizada */}
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="font-black text-gray-950 uppercase text-[11px]">O Director Geral da Instituição</p>
                  {(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl) ? (
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
                  <div className="w-48 border-b border-black mx-auto my-1.5" />
                  <p className="font-bold text-gray-800 text-[11px]">
                    {escola.diretorGeralNome || 'Não Atribuído'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">O Director de Turma</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-medium text-gray-700 text-[10px]">
                    {turmaSelecionada.coordenadorId ? 'Prof. Coordenador da Turma' : 'Docente Responsável'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">O Coordenador de Disciplina</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-medium text-gray-700 text-[10px]">Corpo Docente</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">O Subdirector Pedagógico</p>
                  <div className="h-6" />
                  <div className="w-40 border-b border-black mx-auto my-1.5" />
                  <p className="font-medium text-gray-700 text-[10px]">
                    {escola.subdiretorPedagogicoNome || 'Não Atribuído'}
                  </p>
                </div>
                <div className="space-y-1 flex flex-col items-center justify-end">
                  <p className="font-bold text-gray-950 uppercase text-[11px]">Visto do Director Geral</p>
                  {(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl) ? (
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
                  <p className="font-bold text-gray-800 text-[10px]">
                    {escola.diretorGeralNome || 'Não Atribuído'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DECLARAÇÃO DE HABILITAÇÕES COM NOTAS                                   */}
      {/* ========================================================================= */}
      {docType === 'declaracao_notas' && (
        <div id="documento-para-impressao" className="bg-white border-2 border-gray-900 p-8 md:p-12 rounded-xl shadow-md max-w-4xl mx-auto text-black print:border-none print:shadow-none print:p-0 space-y-6">
          {/* Cabeçalho Oficial com Insígnia Centralizada */}
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-1">
              {configSistema.insigniaNacionalUrl ? (
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
            <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
            <p className="text-[11px] font-bold uppercase text-gray-800">
              {escola.governoProvincial || `GOVERNO PROVINCIAL DO ${escola.provincia?.toUpperCase()}`}
            </p>
            <p className="text-[11px] font-bold uppercase text-gray-800">
              {escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}
            </p>
            <h2 className="text-sm sm:text-base font-black uppercase text-gray-950 pt-1">
              {escola.nomeOficial}
            </h2>
          </div>

          {/* Título da Declaração */}
          <div className="text-center py-2">
            <h3 className="text-base sm:text-lg font-serif font-black uppercase tracking-wide border-b-2 border-black inline-block px-4 pb-1">
              DECLARAÇÃO DE HABILITAÇÕES (COM NOTAS)
            </h3>
          </div>

          {/* Texto Legal e Identificação Completa do Aluno */}
          <div className="text-xs sm:text-[13px] leading-relaxed text-justify space-y-3">
            <p>
              {escola.diretorGeralNome || 'Director(a) Geral'}, Director do <strong>{escola.nomeOficial}</strong>, criado sob o <strong>{escola.decretoCriacao || 'Decreto Executivo n.º 250/18 de 06 de Outubro'}</strong>, ao abrigo da <strong>{escola.artigoLegal || 'alínea e) do artigo 109º da Lei n.º 32/20 de 12 de Agosto (Bases do Sistema de Educação e Ensino)'}</strong>:
            </p>

            <p>
              Declara que <strong>{alunoSelecionado.nomeCompleto.toUpperCase()}</strong>, filho de <strong>{alunoSelecionado.nomePai || '—'}</strong> e de <strong>{alunoSelecionado.nomeMae || '—'}</strong>, nascido aos <strong>{alunoSelecionado.dataNascimento ? new Date(alunoSelecionado.dataNascimento).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</strong>, natural de <strong>{alunoSelecionado.naturalidade || '—'}</strong>, Município de <strong>{alunoSelecionado.municipioNascimento || '—'}</strong>, Província de <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong>, portador do Bilhete de Identidade n.º <strong>{alunoSelecionado.numeroBI || '—'}</strong>, emitido aos <strong>{alunoSelecionado.dataEmissaoBI || '—'}</strong>, pelo <strong>{alunoSelecionado.arquivoIdentificacao || '—'}</strong>.
            </p>

            <p>
              Concluiu com aproveitamento a <strong>{alunoSelecionado.classeId || 'Décima (10ª) Classe'}</strong>, no Ano Lectivo de <strong>{escola.anoLectivoActivo || '2021/2022'}</strong>, no Curso de <strong>{alunoSelecionado.curso || 'Ciências Humanas'}</strong>, no Período <strong>{alunoSelecionado.periodo || 'Matinal'}</strong>, com a seguinte classificação curricular:
            </p>
          </div>

          {/* Certificação de Homologação pelo Júri */}
          <div className="pt-1">
            {juriAlunoSelecionado ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] text-emerald-950 font-bold flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Classificações Oficiais extraídas da Pauta Final Homologada pela Comissão de Júri de Exames (Sessão: {juriAlunoSelecionado.numeroSessao || 'Sessão Ordinária'} • Ata n.º {juriAlunoSelecionado.ata?.numeroAta || '001/2026'})</span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-950 font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Classificações Provisórias da Pauta Geral. Aguarda deliberação e homologação definitiva pela Comissão de Júri de Exame.</span>
              </div>
            )}
          </div>

          {/* Tabela de Disciplinas & Classificação por Extenso */}
          <div className="pt-2">
            <table className="w-full text-xs border border-black">
              <thead className="bg-gray-100 font-bold border-b border-black text-left">
                <tr>
                  <th className="p-2 border-r border-black">DISCIPLINAS</th>
                  <th className="p-2 text-center w-48">CLASSIFICAÇÃO CURRICULAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {/* Formação Geral */}
                <tr className="bg-gray-50 font-bold text-[11px]">
                  <td colSpan={2} className="p-1.5 uppercase text-gray-800">I. Componente de Formação Geral</td>
                </tr>
                {disciplinasDaClasseDocumento.filter(d => (d as any).componente !== 'Específica').map(disc => {
                  const n = notasOficiaisAluno.find((no: any) => no.disciplinaId === disc.id) || notasDoAluno.find((nd: any) => nd.disciplinaId === disc.id);
                  const notaArredondada = Math.round(n?.notaFinal || n?.mediaTrimestral || 12);
                  return (
                    <tr key={disc.id}>
                      <td className="p-1.5 border-r border-black pl-4 font-medium">{disc.nome}</td>
                      <td className="p-1.5 text-center font-semibold">
                        {notaArredondada} ({converterNotaParaExtensoMED(notaArredondada)})
                      </td>
                    </tr>
                  );
                })}

                {/* Formação Específica */}
                {disciplinasDaClasseDocumento.some(d => (d as any).componente === 'Específica') && (
                  <>
                    <tr className="bg-gray-50 font-bold text-[11px]">
                      <td colSpan={2} className="p-1.5 uppercase text-gray-800">II. Componente de Formação Específica</td>
                    </tr>
                    {disciplinasDaClasseDocumento.filter(d => (d as any).componente === 'Específica').map(disc => {
                      const n = notasOficiaisAluno.find((no: any) => no.disciplinaId === disc.id) || notasDoAluno.find((nd: any) => nd.disciplinaId === disc.id);
                      const notaArredondada = Math.round(n?.notaFinal || n?.mediaTrimestral || 11);
                      return (
                        <tr key={disc.id}>
                          <td className="p-1.5 border-r border-black pl-4 font-medium">{disc.nome}</td>
                          <td className="p-1.5 text-center font-semibold">
                            {notaArredondada} ({converterNotaParaExtensoMED(notaArredondada)})
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}

                {/* Linha Média Global */}
                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                  <td className="p-2 border-r border-black uppercase">MÉDIA GLOBAL OBTIDA</td>
                  <td className="p-2 text-center text-sm font-black">
                    {Math.round(Number(mediaGeralCalculada))} ({converterNotaParaExtensoMED(Math.round(Number(mediaGeralCalculada)))}) Valores
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Parágrafo de Livro de Registo */}
          <div className="text-xs leading-relaxed text-justify space-y-2 pt-2">
            <p>
              Consta no livro de registo n.º <strong>{alunoSelecionado.livroRegisto || '02'}</strong>, à folha <strong>{alunoSelecionado.folhaRegisto || '64'}</strong>, com o processo n.º <strong>{alunoSelecionado.numeroProcesso || '159/2021'}</strong>.
            </p>
            <p>
              Por ser verdade e ter sido solicitada pela parte interessada, mandou-se passar a presente declaração que vai por mim assinada e autenticada com o carimbo a óleo e selo branco em uso neste estabelecimento de ensino.
            </p>
            <p className="text-right pt-2 font-medium">
              {escola.municipio || 'Mbanza Kongo'}, aos {new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}.
            </p>
          </div>

          {/* Assinaturas Oficiais com Sub-Directora e Director */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center border-t border-gray-300">
            <div>
              <div className="w-56 border-b border-black mx-auto" />
              <p className="font-bold text-gray-900 mt-1">A Sub-Directora</p>
              <p className="text-gray-700 font-semibold text-[11px]">{escola.subdiretorPedagogicoNome || 'Não Atribuído'}</p>
            </div>
            <div>
              <div className="w-56 border-b border-black mx-auto" />
              <p className="font-bold text-gray-900 mt-1">O Director</p>
              <p className="text-gray-700 font-semibold text-[11px]">{escola.diretorGeralNome || 'Não Atribuído'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CERTIFICADO MULTI-CLASSE 10ª, 11ª, 12ª (SCREENSHOT 4 - COMPLEXO 151) */}
      {/* ========================================================================= */}
      {docType === 'certificado_ciclo' && (
        <div id="documento-para-impressao" className="bg-white border-4 border-double border-gray-900 p-8 md:p-12 rounded-xl shadow-lg max-w-5xl mx-auto text-black print:border-none print:shadow-none print:p-0 space-y-6">
          {/* Cabeçalho Oficial com Insígnia Centralizada */}
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-1">
              {configSistema.insigniaNacionalUrl ? (
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
            <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
            <p className="text-[11px] font-bold uppercase text-gray-800">
              {escola.governoProvincial || `GOVERNO PROVINCIAL DO ${escola.provincia?.toUpperCase()}`}
            </p>
            <p className="text-[11px] font-bold uppercase text-gray-800">
              {escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}
            </p>
            <h2 className="text-sm sm:text-base font-black uppercase text-gray-950 pt-1">
              {escola.nomeOficial}
            </h2>
          </div>

          {/* Título do Certificado Oficial Dinâmico por Nível de Ensino */}
          <div className="text-center py-2">
            <h3 className="text-base sm:text-lg font-serif font-black uppercase tracking-wider border-b-2 border-black inline-block px-6 pb-1">
              {tipoCertificadoEfetivo === 'primario_6' 
                ? 'CERTIFICADO DE CONCLUSÃO DO ENSINO PRIMÁRIO (6.ª CLASSE)' 
                : tipoCertificadoEfetivo === 'iciclo_9'
                  ? 'CERTIFICADO DE CONCLUSÃO DO Iº CICLO DO ENSINO SECUNDÁRIO GERAL (9.ª CLASSE)'
                  : tipoCertificadoEfetivo === 'tecnico_12_13'
                    ? 'CERTIFICADO DE HABILITAÇÕES TÉCNICO-PROFISSIONAIS (TÉCNICO MÉDIO)'
                    : 'CERTIFICADO DO IIº CICLO DO ENSINO SECUNDÁRIO GERAL (12.ª CLASSE)'}
            </h3>
          </div>

          {/* Texto de Certificação */}
          <div className="text-xs sm:text-[13px] leading-relaxed text-justify space-y-3">
            <p>
              {escola.diretorGeralNome || 'Director(a) Geral'}, Director do <strong>{escola.nomeOficial}</strong>, criado sob o <strong>{escola.decretoCriacao || 'Decreto Executivo n.º 250/18 de 06 de Outubro'}</strong>, ao abrigo da alínea e) do artigo 109º da Lei n.º 32/20 de 12 de Agosto (Lei de Bases do Sistema de Educação e Ensino):
            </p>

            <p>
              Certifica que <strong>{(alunoSelecionado.nomeCompleto || '[NOME DO ESTUDANTE]').toUpperCase()}</strong>, filho(a) de <strong>{alunoSelecionado.nomePai || '—'}</strong> e de <strong>{alunoSelecionado.nomeMae || '—'}</strong>, nascido(a) aos <strong>{alunoSelecionado.dataNascimento ? new Date(alunoSelecionado.dataNascimento).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</strong>, natural de <strong>{alunoSelecionado.naturalidade || '—'}</strong>, Município de <strong>{alunoSelecionado.municipioNascimento || '—'}</strong>, Província de <strong>{alunoSelecionado.provinciaOrigem || '—'}</strong>, portador(a) do Bilhete de Identidade n.º <strong>{alunoSelecionado.numeroBI || '—'}</strong>, emitido aos <strong>{alunoSelecionado.dataEmissaoBI || '—'}</strong>, pelo <strong>{alunoSelecionado.arquivoIdentificacao || '—'}</strong>.
            </p>

            <p>
              {tipoCertificadoEfetivo === 'primario_6' && (
                <>Concluiu a <strong>6.ª Classe do Ensino Primário</strong>, no Ano Lectivo de <strong>{escola.anoLectivoActivo || '2024/2025'}</strong>, nos termos da matriz curricular nacional do Ensino Primário, tendo obtido as seguintes classificações:</>
              )}
              {tipoCertificadoEfetivo === 'iciclo_9' && (
                <>Concluiu a <strong>9.ª Classe do Iº Ciclo do Ensino Secundário Geral</strong>, no Ano Lectivo de <strong>{escola.anoLectivoActivo || '2024/2025'}</strong>, tendo obtido aproveitamento no Exame de Saída e as seguintes classificações:</>
              )}
              {tipoCertificadoEfetivo === 'iiciclo_12' && (
                <>Concluiu a <strong>12.ª Classe do IIº Ciclo do Ensino Secundário Geral</strong>, no Ano Lectivo de <strong>{escola.anoLectivoActivo || '2024/2025'}</strong>, na Área de <strong>{alunoSelecionado.curso || 'Ciências Económicas e Jurídicas'}</strong>, tendo obtido as seguintes classificações:</>
              )}
              {tipoCertificadoEfetivo === 'tecnico_12_13' && (
                <>Concluiu a Formação Técnico-Profissional (<strong>{alunoSelecionado.classeId || '12.ª / 13.ª classe'}</strong>), no Ano Lectivo de <strong>{escola.anoLectivoActivo || '2024/2025'}</strong>, no Curso de Técnico Médio de <strong>{alunoSelecionado.curso || 'Técnico de Informática'}</strong>, tendo obtido as seguintes classificações:</>
              )}
            </p>
          </div>

          {/* TABELA 1: ENSINO PRIMÁRIO (6ª CLASSE) */}
          {tipoCertificadoEfetivo === 'primario_6' && (
            <div className="pt-2">
              <table className="w-full text-xs border border-black text-left">
                <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                  <tr>
                    <th className="p-1.5 border-r border-black text-left">DISCIPLINAS CURRICULARES (6.ª CLASSE)</th>
                    <th className="p-1.5 border-r border-black w-24">Avaliação Contínua (MAC)</th>
                    <th className="p-1.5 border-r border-black w-24">Prova de Exame</th>
                    <th className="p-1.5 border-r border-black w-20 bg-gray-200">Classificação Final</th>
                    <th className="p-1.5 w-44">Classificação por Extenso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-[11px]">
                  {[
                    { disc: 'Língua Portuguesa', mac: 14, pe: 13, cf: 14 },
                    { disc: 'Matemática', mac: 13, pe: 14, cf: 14 },
                    { disc: 'Ciências da Natureza', mac: 15, pe: 15, cf: 15 },
                    { disc: 'História', mac: 14, pe: 14, cf: 14 },
                    { disc: 'Geografia', mac: 13, pe: 13, cf: 13 },
                    { disc: 'Educação Moral e Cívica', mac: 16, pe: 16, cf: 16 },
                    { disc: 'Educação Visual e Plástica', mac: 15, pe: 15, cf: 15 },
                    { disc: 'Educação Musical', mac: 15, pe: 15, cf: 15 },
                    { disc: 'Educação Física', mac: 16, pe: 16, cf: 16 }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-1.5 border-r border-black font-medium">{row.disc}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.mac}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.pe}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{row.cf}</td>
                      <td className="p-1.5 text-center font-medium">{converterNotaParaExtensoMED(row.cf)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                    <td className="p-2 border-r border-black uppercase">MÉDIA GERAL DO ENSINO PRIMÁRIO</td>
                    <td colSpan={2} className="p-2 border-r border-black text-center">Conclusão do Ensino Primário</td>
                    <td className="p-2 border-r border-black text-center text-sm font-black">15</td>
                    <td className="p-2 text-center text-xs font-black uppercase">Quinze Valores</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 2: Iº CICLO DO ENSINO SECUNDÁRIO (7ª, 8ª e 9ª CLASSES) */}
          {tipoCertificadoEfetivo === 'iciclo_9' && (
            <div className="pt-2">
              <table className="w-full text-xs border border-black text-left">
                <thead className="bg-gray-100 font-bold border-b border-black text-center text-[10px]">
                  <tr>
                    <th className="p-1.5 border-r border-black text-left">DISCIPLINAS DO Iº CICLO</th>
                    <th className="p-1.5 border-r border-black w-14">7.ª Classe</th>
                    <th className="p-1.5 border-r border-black w-14">8.ª Classe</th>
                    <th className="p-1.5 border-r border-black w-14">9.ª Classe</th>
                    <th className="p-1.5 border-r border-black w-14">Exame</th>
                    <th className="p-1.5 border-r border-black w-16 bg-gray-200">M. Final</th>
                    <th className="p-1.5 w-40">Média por Extenso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-[11px]">
                  {[
                    { disc: 'Língua Portuguesa', n7: 12, n8: 13, n9: 13, ex: 12, mf: 13 },
                    { disc: 'Língua Inglesa', n7: 11, n8: 12, n9: 12, ex: 13, mf: 12 },
                    { disc: 'Língua Francesa', n7: 10, n8: 11, n9: 12, ex: 11, mf: 11 },
                    { disc: 'Matemática', n7: 13, n8: 14, n9: 14, ex: 13, mf: 14 },
                    { disc: 'Biologia', n7: 12, n8: 13, n9: 14, ex: 14, mf: 13 },
                    { disc: 'Física', n7: 11, n8: 12, n9: 13, ex: 12, mf: 12 },
                    { disc: 'Química', n7: 10, n8: 12, n9: 12, ex: 11, mf: 11 },
                    { disc: 'História', n7: 14, n8: 13, n9: 14, ex: 13, mf: 14 },
                    { disc: 'Geografia', n7: 12, n8: 13, n9: 13, ex: 13, mf: 13 },
                    { disc: 'Educação Visual e Plástica', n7: 14, n8: 15, n9: 15, ex: '-', mf: 15 },
                    { disc: 'Educação Moral e Cívica', n7: 15, n8: 15, n9: 16, ex: '-', mf: 15 },
                    { disc: 'Educação Física', n7: 16, n8: 16, n9: 16, ex: '-', mf: 16 }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-1.5 border-r border-black font-medium">{row.disc}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n7}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n8}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n9}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.ex}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{row.mf}</td>
                      <td className="p-1.5 text-center font-medium">{converterNotaParaExtensoMED(row.mf)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                    <td className="p-2 border-r border-black uppercase">MÉDIA GERAL DO Iº CICLO</td>
                    <td colSpan={4} className="p-2 border-r border-black text-center">Conclusão do Iº Ciclo Geral</td>
                    <td className="p-2 border-r border-black text-center text-sm font-black">13</td>
                    <td className="p-2 text-center text-xs font-black uppercase">Treze Valores</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 3: IIº CICLO GERAL (10ª, 11ª e 12ª CLASSES) */}
          {tipoCertificadoEfetivo === 'iiciclo_12' && (
            <div className="pt-2">
              <table className="w-full text-xs border border-black text-left">
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
                  {(alunoSelecionado.historicoMultiAno || [
                    { disciplinaNome: 'Língua Portuguesa', categoria: 'Formação Geral', nota10: 12, nota11: 11, nota12: 11, mediaFinal: 11 },
                    { disciplinaNome: 'Francês', categoria: 'Formação Geral', nota10: 11, nota11: 10, nota12: 12, mediaFinal: 11 },
                    { disciplinaNome: 'Matemática', categoria: 'Formação Geral', nota10: 13, nota11: 16, nota12: '-', mediaFinal: 15 },
                    { disciplinaNome: 'Informática', categoria: 'Formação Geral', nota10: 11, nota11: '-', nota12: '-', mediaFinal: 11 },
                    { disciplinaNome: 'Educação Física', categoria: 'Formação Geral', nota10: 11, nota11: 13, nota12: 14, mediaFinal: 13 },
                    { disciplinaNome: 'Filosofia', categoria: 'Formação Geral', nota10: '-', nota11: 10, nota12: 10, mediaFinal: 10 },
                    { disciplinaNome: 'Empreendedorismo', categoria: 'Formação Geral', nota10: 10, nota11: 11, nota12: 11, mediaFinal: 11 },
                    { disciplinaNome: 'Introdução ao Direito', categoria: 'Formação Específica', nota10: 10, nota11: 10, nota12: 10, mediaFinal: 10 },
                    { disciplinaNome: 'Introdução à Economia', categoria: 'Formação Específica', nota10: 10, nota11: 10, nota12: 13, mediaFinal: 11 },
                    { disciplinaNome: 'História', categoria: 'Formação Específica', nota10: 13, nota11: 12, nota12: 14, mediaFinal: 13 },
                    { disciplinaNome: 'Geografia', categoria: 'Formação Específica', nota10: 10, nota11: 13, nota12: 10, mediaFinal: 11 },
                    { disciplinaNome: 'Desenvolvimento Económico e Social', categoria: 'Formação Específica', nota10: '-', nota11: '-', nota12: 11, mediaFinal: 11 },
                    { disciplinaNome: 'Psicologia', categoria: 'Disciplina Opcional', nota10: '-', nota11: 14, nota12: 13, mediaFinal: 14 }
                  ]).map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-1.5 border-r border-black font-medium">{item.disciplinaNome}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{item.nota10}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{item.nota11}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{item.nota12}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{item.mediaFinal}</td>
                      <td className="p-1.5 text-center font-medium">
                        {typeof item.mediaFinal === 'number' ? converterNotaParaExtensoMED(item.mediaFinal) : item.mediaFinal}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                    <td className="p-2 border-r border-black uppercase">MÉDIA DO CICLO</td>
                    <td colSpan={3} className="p-2 border-r border-black text-center">Conclusão do Ensino Secundário Geral</td>
                    <td className="p-2 border-r border-black text-center text-sm font-black">12</td>
                    <td className="p-2 text-center text-xs font-black uppercase">Doze Valores</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TABELA 4: ENSINO TÉCNICO-PROFISSIONAL / MAGISTÉRIO (10ª A 13ª CLASSES) */}
          {tipoCertificadoEfetivo === 'tecnico_12_13' && (
            <div className="pt-2">
              <table className="w-full text-xs border border-black text-left">
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
                  {[
                    { disc: 'Língua Portuguesa', n10: 12, n11: 12, n12: 13, n13: 13, pap: '-', mf: 13 },
                    { disc: 'Língua Inglesa Técnica', n10: 13, n11: 14, n12: 14, n13: 15, pap: '-', mf: 14 },
                    { disc: 'Matemática Aplicada', n10: 14, n11: 14, n12: 15, n13: 15, pap: '-', mf: 15 },
                    { disc: 'Física Aplicada', n10: 12, n11: 13, n12: 13, n13: 14, pap: '-', mf: 13 },
                    { disc: 'Tecnologias de Informação e Comunicação', n10: 14, n11: 15, n12: 16, n13: 16, pap: '-', mf: 15 },
                    { disc: 'Sistemas Operativos e Redes', n10: 13, n11: 14, n12: 15, n13: 16, pap: '-', mf: 15 },
                    { disc: 'Técnicas e Linguagens de Programação', n10: 14, n11: 15, n12: 16, n13: 17, pap: '-', mf: 16 },
                    { disc: 'Empreendedorismo e Gestão', n10: 12, n11: 13, n12: 13, n13: 14, pap: '-', mf: 13 },
                    { disc: 'Organização e Gestão Industrial', n10: '-', n11: 12, n12: 13, n13: 14, pap: '-', mf: 13 },
                    { disc: 'Prova de Aptidão Profissional (PAP)', n10: '-', n11: '-', n12: '-', n13: 17, pap: 17, mf: 17 },
                    { disc: 'Estágio Curricular Supervisionado', n10: '-', n11: '-', n12: '-', n13: 18, pap: 18, mf: 18 }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-1.5 border-r border-black font-medium">{row.disc}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n10}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n11}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n12}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.n13}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{row.pap}</td>
                      <td className="p-1.5 border-r border-black text-center font-mono font-bold bg-gray-50">{row.mf}</td>
                      <td className="p-1.5 text-center font-medium">{converterNotaParaExtensoMED(row.mf)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                    <td className="p-2 border-r border-black uppercase">MÉDIA FINAL DO CURSO TÉCNICO</td>
                    <td colSpan={5} className="p-2 border-r border-black text-center">Habilitação de Técnico Médio</td>
                    <td className="p-2 border-r border-black text-center text-sm font-black">15</td>
                    <td className="p-2 text-center text-xs font-black uppercase">Quinze Valores</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Dados de Registo no Livro e Folha */}
          <div className="text-xs leading-relaxed text-justify space-y-2 pt-2">
            <p>
              Registado no Livro de Matrícula sob o n.º <strong>{alunoSelecionado.livroRegisto || '220518MA2003'}</strong>, Processo n.º <strong>{alunoSelecionado.numeroProcesso || '220518E1396'}</strong>, Folha n.º <strong>{alunoSelecionado.folhaRegisto || 'EJ-2024/2025'}</strong>.
            </p>
            <p>
              Por ser verdade e ter sido requerido, mandou-se passar o presente Certificado que vai assinado pelas entidades competentes e autenticado com o carimbo a óleo em uso nesta Instituição de Ensino.
            </p>
            <p className="text-right pt-2 font-medium">
              {escola.municipio || 'Mbanza Kongo'}, aos {new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}.
            </p>
          </div>

          {/* Assinaturas Oficiais com QR Code de Autenticidade e Assinatura do Director */}
          <div className="grid grid-cols-3 gap-4 pt-6 text-xs text-center border-t border-gray-300">
            <div className="space-y-1">
              <div className="h-10 flex items-center justify-center -mb-1">
                <span className="text-[10px] text-gray-400 italic">Visto da Secretaria</span>
              </div>
              <div className="w-40 border-b border-black mx-auto" />
              <p className="font-bold text-gray-900 mt-1">Conferido por</p>
              <p className="text-gray-500 text-[10px]">A Secretaria Escolar</p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="h-16 w-16 bg-white border border-gray-400 p-1 flex items-center justify-center">
                <QrCode className="h-14 w-14" />
              </div>
              <span className="text-[8px] text-gray-500 mt-0.5">Certificação MED</span>
            </div>

            <div className="space-y-1">
              {(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl) ? (
                <div className="h-10 flex items-center justify-center -mb-1">
                  <img 
                    src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                    alt="Assinatura do Director" 
                    className="max-h-9 max-w-[140px] object-contain mix-blend-multiply" 
                  />
                </div>
              ) : (
                <div className="h-10" />
              )}
              <div className="w-40 border-b border-black mx-auto" />
              <p className="font-bold text-gray-900 mt-1">O Director Geral</p>
              <p className="text-gray-700 font-semibold text-[11px]">{escola.diretorGeralNome || 'Não Atribuído'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PASSES ESCOLARES (GRADE DE 8 PASSES POR FOLHA A4) */}
      {/* ========================================================================= */}
      {docType === 'passes' && (
        <div id="documento-para-impressao" className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 no-print flex items-center justify-between">
            <div>
              <strong>Passes Escolares Oficiais:</strong> Otimizados para impressão em papel cartão A4 (grade de 8 passes por página com marcações de corte).
            </div>
            <span className="font-bold bg-blue-200 px-2 py-0.5 rounded text-[11px]">8 passes por folha A4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-2 print:gap-2">
            {alunosDaTurma.slice(0, 8).map((aluno) => {
              const turma = turmas.find(t => t.id === aluno.turmaId) || turmaSelecionada;
              return (
                <div 
                  key={aluno.id}
                  className="bg-white border-2 border-blue-700 rounded-xl p-3 shadow-2xs relative flex flex-col justify-between min-h-[235px] print:min-h-[235px] print:border-black"
                >
                  {/* Cabeçalho do Cartão com Logotipo da Escola */}
                  <div>
                    <div className="text-center border-b pb-1 border-blue-200 print:border-gray-400">
                      <div className="flex items-center justify-between px-1">
                        {(escola.logotipoUrl || escola.logotipo) ? (
                          <img 
                            src={escola.logotipoUrl || escola.logotipo} 
                            alt="Logo Escola" 
                            className="h-6 w-6 object-contain rounded shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-5 w-5 flex items-center justify-center">
                            <InsigniaAngola size={18} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 px-1 text-center">
                          <p className="text-[7.5px] font-bold uppercase text-gray-600 truncate">República de Angola</p>
                          <p className="text-[8.5px] font-black uppercase text-blue-900 truncate print:text-black">
                            {escola.nomeOficial}
                          </p>
                        </div>
                        <div className="h-5 w-5 flex items-center justify-center shrink-0">
                          {configSistema.insigniaNacionalUrl ? (
                            <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-5 w-5 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <InsigniaAngola size={16} />
                          )}
                        </div>
                      </div>
                      <span className="text-[7px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full inline-block mt-0.5">
                        Cartão de Estudante • {escola.anoLectivoActivo}
                      </span>
                    </div>

                    {/* Foto & Dados do Aluno */}
                    <div className="flex items-center space-x-2.5 mt-2">
                      <img 
                        src={aluno.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                        alt={aluno.nomeCompleto} 
                        className="h-20 w-16 rounded object-cover border-2 border-blue-900 print:border-black shrink-0 shadow-2xs"
                      />
                      <div className="min-w-0 text-[10px] leading-tight space-y-0.5">
                        <h4 className="font-extrabold text-gray-900 truncate">{aluno.nomeCompleto}</h4>
                        <p className="text-gray-600">Classe: <strong>{turma?.classe}</strong></p>
                        <p className="text-gray-600">Turma: <strong>{turma?.nome}</strong></p>
                        <p className="text-gray-600 truncate">Turno: <strong>{turma?.turno || 'Manhã'}</strong></p>
                        <p className="text-gray-600 truncate">Curso: <strong>{aluno.curso || 'Geral'}</strong></p>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Cartão com Matrícula, Assinatura do Diretor e QR Code */}
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px]">
                    <div>
                      <span className="text-[8px] text-gray-500 block">Nº Matrícula:</span>
                      <strong className="font-mono text-gray-900">{aluno.codigoMatricula}</strong>
                    </div>

                    <div className="flex flex-col items-center justify-end text-center min-w-[50px]">
                      {(escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl) ? (
                        <img 
                          src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                          alt="Assinatura Diretor" 
                          className="h-5 w-auto max-w-[55px] object-contain mb-0.5" 
                        />
                      ) : (
                        <div className="border-b border-gray-400 w-10 mb-0.5" />
                      )}
                      <span className="font-serif italic text-gray-700 text-[6.5px]">
                        A Direcção
                      </span>
                    </div>

                    <div className="h-7 w-7 bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-800 rounded">
                      <QrCode className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FICHA INDIVIDUAL DO ALUNO (REGISTO BIOGRÁFICO & MATRÍCULA)              */}
      {/* ========================================================================= */}
      {docType === 'ficha_individual_aluno' && alunoSelecionado && (
        <div id="documento-para-impressao" className="bg-white border-2 border-gray-800 p-6 md:p-8 rounded-xl shadow-md max-w-4xl mx-auto text-black print:border-none print:shadow-none print:p-0 space-y-6">
          <div className="text-center space-y-1 border-b-2 border-black pb-3">
            <div className="flex justify-center mb-1">
              {configSistema.insigniaNacionalUrl ? (
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
                FICHA INDIVIDUAL DO ALUNO — ANO LECTIVO {escola.anoLectivoActivo}
              </span>
            </div>
          </div>

          {/* Destaque Matrícula e Processo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono">
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

          {/* Foto e Dados Pessoais */}
          <div className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
            <img 
              src={alunoSelecionado.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
              alt={alunoSelecionado.nomeCompleto} 
              className="h-28 w-24 rounded-lg object-cover border-2 border-black shrink-0 mx-auto sm:mx-0"
            />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
              <div><span className="text-gray-600">Nome Completo:</span> <strong className="uppercase">{alunoSelecionado.nomeCompleto}</strong></div>
              <div><span className="text-gray-600">Gênero:</span> <strong>{alunoSelecionado.genero === 'M' ? 'Masculino' : 'Feminino'}</strong></div>
              <div><span className="text-gray-600">Documento de Identificação:</span> <strong className="font-mono">{alunoSelecionado.tipoDocumento || 'BI'} nº {alunoSelecionado.numeroDocumento || alunoSelecionado.numeroBI || '—'}</strong></div>
              <div><span className="text-gray-600">Data de Nascimento:</span> <strong>{alunoSelecionado.dataNascimento}</strong></div>
              <div><span className="text-gray-600">Naturalidade:</span> <strong>{alunoSelecionado.naturalidade}</strong></div>
              <div><span className="text-gray-600">Província de Origem:</span> <strong>{alunoSelecionado.provinciaOrigem}</strong></div>
              <div className="sm:col-span-2"><span className="text-gray-600">Residência / Bairro:</span> <strong>{alunoSelecionado.endereco || '—'}</strong></div>
            </div>
          </div>

          {/* Filiação & Encarregado */}
          <div className="border-b border-black pb-4 text-xs space-y-1">
            <h4 className="font-black uppercase text-[11px] text-gray-800">Filiação & Encarregado de Educação</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><span className="text-gray-600">Nome do Pai:</span> <strong>{alunoSelecionado.nomePai || '—'}</strong></div>
              <div><span className="text-gray-600">Nome da Mãe:</span> <strong>{alunoSelecionado.nomeMae || '—'}</strong></div>
              <div><span className="text-gray-600">Encarregado de Educação:</span> <strong>{alunoSelecionado.nomeEncarregado || alunoSelecionado.encarregadoNome || '—'}</strong></div>
              <div><span className="text-gray-600">Contacto do Encarregado:</span> <strong className="font-mono">{alunoSelecionado.telefoneEncarregado || alunoSelecionado.telefone || '—'}</strong></div>
            </div>
          </div>

          {/* Dados Académicos */}
          <div className="border-b border-black pb-4 text-xs space-y-1">
            <h4 className="font-black uppercase text-[11px] text-gray-800">Enquadramento Pedagógico</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded">
              <div><span className="text-gray-600 block">Classe:</span><strong>{alunoSelecionado.classeId || turmaDoAluno.classe}</strong></div>
              <div><span className="text-gray-600 block">Turma:</span><strong>{turmaDoAluno.nome}</strong></div>
              <div><span className="text-gray-600 block">Turno:</span><strong>{turmaDoAluno.turno || 'Manhã'}</strong></div>
              <div><span className="text-gray-600 block">Sala:</span><strong>{turmaDoAluno.sala || '01'}</strong></div>
              {alunoSelecionado.curso && (
                <div className="col-span-2 sm:col-span-4 pt-1"><span className="text-gray-600">Curso:</span> <strong>{alunoSelecionado.curso}</strong></div>
              )}
            </div>
          </div>

          {/* Assinaturas */}
          <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-6">
              <p className="text-gray-700">O(A) Encarregado(a)</p>
              <div className="border-b border-black w-40 mx-auto" />
            </div>
            <div className="space-y-6">
              <p className="text-gray-700">O Chefe de Secretaria</p>
              <div className="border-b border-black w-40 mx-auto" />
            </div>
            <div className="space-y-6">
              <p className="text-gray-700">O Director Geral</p>
              <div className="border-b border-black w-40 mx-auto" />
            </div>
          </div>
        </div>
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

          {funcionarioSelecionado && (
            <div id="documento-para-impressao" className="bg-white border-2 border-gray-800 p-6 md:p-8 rounded-xl shadow-md max-w-4xl mx-auto text-black print:border-none print:shadow-none print:p-0 space-y-5">
              <div className="text-center space-y-1 border-b-2 border-black pb-3">
                <div className="flex justify-center mb-1">
                  {configSistema.insigniaNacionalUrl ? (
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

              {/* Foto e Identificação */}
              <div className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
                <img 
                  src={funcionarioSelecionado.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'} 
                  alt={funcionarioSelecionado.nomeCompleto} 
                  className="h-28 w-24 rounded-lg object-cover border-2 border-black shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
                  <div><span className="text-gray-600">Nome Completo:</span> <strong className="uppercase">{funcionarioSelecionado.nomeCompleto}</strong></div>
                  <div><span className="text-gray-600">N.º do Bilhete de Identidade:</span> <strong className="font-mono">{funcionarioSelecionado.numeroBI}</strong></div>
                  <div><span className="text-gray-600">Gênero:</span> <strong>{funcionarioSelecionado.genero === 'M' ? 'Masculino' : 'Feminino'}</strong></div>
                  <div><span className="text-gray-600">Estado Civil:</span> <strong>{funcionarioSelecionado.estadoCivil || 'Casado(a)'}</strong></div>
                  <div><span className="text-gray-600">Nacionalidade:</span> <strong>{funcionarioSelecionado.nacionalidade || 'Angolana'}</strong></div>
                  <div><span className="text-gray-600">Naturalidade:</span> <strong>{funcionarioSelecionado.naturalidadeMunicipio || (funcionarioSelecionado as any).naturalidade || 'Luanda'}</strong></div>
                  <div><span className="text-gray-600">Telefone Principal:</span> <strong className="font-mono">{funcionarioSelecionado.telefone}</strong></div>
                  <div><span className="text-gray-600">Correio Electrónico:</span> <strong>{funcionarioSelecionado.email}</strong></div>
                </div>
              </div>

              {/* Dados Académicos e Carreira */}
              <div className="border-b border-black pb-4 text-xs space-y-1.5">
                <h4 className="font-black uppercase text-[11px] text-gray-800">Habilitações & Carreira Ministerial (MED)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
                  <div><span className="text-gray-600">Grau Académico:</span> <strong>{funcionarioSelecionado.grauAcademico || 'Licenciado'}</strong></div>
                  <div><span className="text-gray-600">Especialidade / Curso:</span> <strong>{funcionarioSelecionado.especialidade || funcionarioSelecionado.habilitacoes}</strong></div>
                  <div><span className="text-gray-600">Categoria Profissional:</span> <strong>{funcionarioSelecionado.categoriaProfissional || 'Professor do IIº Ciclo do Ensino Secundário - 6º Grau'}</strong></div>
                  <div><span className="text-gray-600">Cargo / Função Atual:</span> <strong>{funcionarioSelecionado.cargo}</strong></div>
                  <div><span className="text-gray-600">Perfil de Acesso no Sistema:</span> <strong className="text-blue-900">{funcionarioSelecionado.role}</strong></div>
                  <div><span className="text-gray-600">N.º Mecanográfico / Agente:</span> <strong className="font-mono">{funcionarioSelecionado.numeroAgente || (funcionarioSelecionado as any).numeroMecanografico || 'AG-89412'}</strong></div>
                  <div><span className="text-gray-600">Tipo de Contrato:</span> <strong>{funcionarioSelecionado.tipoContrato || 'Efetivo (Quadro Definitivo)'}</strong></div>
                  <div><span className="text-gray-600">Situação Funcional:</span> <strong className="text-emerald-800">{funcionarioSelecionado.situacaoFuncional || 'Ativo no Efetivo'}</strong></div>
                  <div><span className="text-gray-600">Data de Admissão:</span> <strong>{funcionarioSelecionado.dataAdmissao || '2020-02-01'}</strong></div>
                  <div><span className="text-gray-600">Carga Horária Semanal:</span> <strong>{funcionarioSelecionado.cargaHorariaSemanal || 24} horas/semana</strong></div>
                </div>
              </div>

              {/* Dados Bancários e Segurança Social */}
              <div className="border-b border-black pb-4 text-xs space-y-1.5">
                <h4 className="font-black uppercase text-[11px] text-gray-800">Dados Bancários & Segurança Social (INSS)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div><span className="text-gray-600 block">Instituição Bancária:</span><strong>{funcionarioSelecionado.banco || 'BFA - Banco de Fomento Angola'}</strong></div>
                  <div className="sm:col-span-2"><span className="text-gray-600 block">IBAN Bancário:</span><strong className="font-mono">{funcionarioSelecionado.iban || 'AO06.0006.0000.1234.5678.9012.3'}</strong></div>
                  <div><span className="text-gray-600 block">N.º de Segurança Social (INSS):</span><strong className="font-mono">{funcionarioSelecionado.numeroSegurancaSocial || 'INSS-481920'}</strong></div>
                </div>
              </div>

              {/* Assinaturas Oficiais */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-6">
                  <p className="text-gray-700">O(A) Funcionário(a)</p>
                  <div className="border-b border-black w-40 mx-auto" />
                </div>
                <div className="space-y-6">
                  <p className="text-gray-700">O Chefe de Secretaria</p>
                  <div className="border-b border-black w-40 mx-auto" />
                </div>
                <div className="space-y-6">
                  <p className="text-gray-700">O Director Geral</p>
                  <div className="border-b border-black w-40 mx-auto" />
                </div>
              </div>
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

          <div id="documento-para-impressao" className="bg-white border-2 border-gray-800 p-6 md:p-8 rounded-xl shadow-md max-w-5xl mx-auto text-black print:border-none print:shadow-none print:p-0 space-y-5">
            <div className="text-center space-y-1 border-b-2 border-black pb-3">
              <div className="flex justify-center mb-1">
                {configSistema.insigniaNacionalUrl ? (
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
                  FOLHA OFICIAL DE PRESENÇAS E ASSIDUIDADE — PERÍODO DE {dataInicioPresencas} A {dataFimPresencas}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold bg-gray-50 p-2.5 rounded border border-gray-300">
              <div>Turma: <span className="text-blue-900 font-extrabold">{turmaSelecionada?.nome}</span> ({turmaSelecionada?.classe})</div>
              <div>Turno: <span>{turmaSelecionada?.turno || 'Manhã'}</span> • Sala: <span>{turmaSelecionada?.sala || '01'}</span></div>
              <div>Ano Lectivo: <span>{turmaSelecionada?.anoLectivo || escola.anoLectivoActivo}</span></div>
            </div>

            {/* Tabela de Presenças */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border border-black">
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
                  {alunosDaTurma.map((aluno, idx) => (
                    <tr key={aluno.id} className="border-b border-gray-300">
                      <td className="p-1 border-r border-gray-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-1 border-r border-gray-300 font-mono text-center">{aluno.codigoMatricula}</td>
                      <td className="p-1 border-r border-gray-300 font-bold uppercase">{aluno.nomeCompleto}</td>
                      <td className="p-1 border-r border-gray-300 text-center font-bold text-emerald-800">18</td>
                      <td className="p-1 border-r border-gray-300 text-center">0</td>
                      <td className="p-1 border-r border-gray-300 text-center text-red-700">1</td>
                      <td className="p-1 border-r border-gray-300 text-center font-bold">95%</td>
                      <td className="p-1 text-center font-serif italic text-gray-400">Visto</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Assinaturas */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-6">
                <p className="text-gray-700">O(A) Director(a) de Turma / Professor</p>
                <div className="border-b border-black w-48 mx-auto" />
              </div>
              <div className="space-y-6">
                <p className="text-gray-700">O Subdirector Pedagógico</p>
                <div className="border-b border-black w-48 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RECIBOS TÉRMICOS (POS 58MM / 80MM) */}
      {/* ========================================================================= */}
      {docType === 'recibos' && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-700 max-w-md w-full no-print">
            <strong>Impressão Térmica POS:</strong> Compatível com mini impressoras térmicas Bluetooth portáteis de 58mm ou 80mm para recibos imediatos de propinas e confirmação de matrícula.
          </div>

          <div 
            className={`bg-white border border-gray-400 p-4 shadow-md font-mono text-[11px] leading-tight text-gray-950 space-y-3 ${
              larguraTermica === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
          >
            <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2">
              <p className="font-bold uppercase text-[10px]">{escola.nomeOficial}</p>
              <p className="text-[9px] text-gray-600">NIF: {escola.nif}</p>
              <p className="text-[9px] text-gray-600">{escola.municipio}, {escola.provincia} - Angola</p>
              <p className="font-bold text-[10px] mt-1">COMPROVATIVO DE PAGAMENTO</p>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Data:</span>
                <span>{new Date().toLocaleDateString('pt-AO')} {new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Recibo Nº:</span>
                <span className="font-bold">REC-2025/{Math.floor(1000 + Math.random() * 9000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Aluno:</span>
                <span className="font-bold truncate max-w-[160px]">{alunoSelecionado.nomeCompleto}</span>
              </div>
              <div className="flex justify-between">
                <span>Matrícula:</span>
                <span>{alunoSelecionado.codigoMatricula}</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-gray-400 py-1 space-y-1 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>DESCRIÇÃO</span>
                <span>VALOR</span>
              </div>
              <div className="flex justify-between">
                <span>Propina Mês Corrente</span>
                <span>12.500,00 Kz</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[9px]">
                <span>Emissão de Cartão</span>
                <span>1.500,00 Kz</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] pt-1">
              <div className="flex justify-between font-extrabold text-sm">
                <span>TOTAL PAGO:</span>
                <span>14.000,00 Kz</span>
              </div>
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>Forma de Pagamento:</span>
                <span>TPA / Multicaixa</span>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-dashed border-gray-400 space-y-1 text-[9px]">
              <p className="font-bold">OBRIGADO PELA SUA PREFERÊNCIA</p>
              <p className="text-[8px] text-gray-500">Processado pelo SGE-NG Angola</p>
              <p className="text-[8px] font-mono">HASH: 9A8F-4B2C-1E7D-8901</p>
              <p className="pt-2">--------------------------------</p>
              <p className="text-[8px] text-gray-400">[CORTE DO TALÃO AQUI]</p>
            </div>
          </div>
        </div>
      )}

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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setAssinaturaPreview(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
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
                  {assinaturaPreview ? (
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
                  {escola.diretorGeralNome || 'Director Geral'}
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
