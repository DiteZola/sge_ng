import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  CreditCard, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  Filter, 
  QrCode, 
  FileSpreadsheet, 
  Calendar, 
  Layers, 
  User, 
  Eye, 
  ShieldCheck, 
  Award,
  Sparkles,
  RefreshCw,
  Settings,
  Palette,
  Sliders,
  Check,
  MoveVertical,
  Scissors,
  Upload
} from 'lucide-react';
import { downloadHtmlDocument } from '../utils/curriculoAngola';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { processarFotoUpload } from '../utils/imageCompressor';
import { OfficialQrCode, gerarPayloadQrEstudante } from '../utils/qrCodeUtils';
import { obterNomeDiretorGeral, obterTituloDiretorGeral } from '../utils/directorHelper';
import {
  getTurmasPorClasse,
  normalizarClasse,
  isSegundoCiclo,
  isPrimeiroCiclo,
  isEnsinoPrimario,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  CURSOS_SEGUNDO_CICLO,
  TODAS_CLASSES_OFICIAIS_MED,
  getSalaDaTurma,
  getCursoDaTurma
} from '../services/academicHierarchyService';
import { ordenarClassesMED } from '../utils/enrollmentProgression';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { 
  Escola, 
  Aluno, 
  Turma, 
  Funcionario, 
  ConfiguracaoPassesEscola, 
  ElementoPasseConfig 
} from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { dbService, DEFAULT_CONFIGURACAO_PASSES } from '../services/storage';
import { SchoolPassCard } from './SchoolPassCard';

interface StudentPassesViewProps {
  escola: Escola;
  alunos: Aluno[];
  turmas: Turma[];
  currentUser: Funcionario;
  onSalvarEscola?: (escola: Escola) => void;
}

export const StudentPassesView: React.FC<StudentPassesViewProps> = ({
  escola,
  alunos,
  turmas,
  currentUser,
  onSalvarEscola
}) => {
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('TODAS');
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState<string>('TODOS');
  const [selectedClasseFilter, setSelectedClasseFilter] = useState<string>('TODAS');
  const [selectedCursoFilter, setSelectedCursoFilter] = useState<string>('TODOS');
  const [selectedSalaFilter, setSelectedSalaFilter] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [visualizacao, setVisualizacao] = useState<'frente' | 'verso' | 'ambos'>('ambos');

  const dataFimAnoAtivo = useMemo(() => {
    const anos = dbService.getAnosLectivosConfigs(escola.id);
    const anoAtivo = anos.find(a => a.rotulo === escola.anoLectivoActivo || a.ano === escola.anoLectivoActivo || a.estado === 'Aberto');
    return anoAtivo?.dataFim || '';
  }, [escola.id, escola.anoLectivoActivo]);

  const [dataValidade, setDataValidade] = useState<string>(() => {
    const anos = dbService.getAnosLectivosConfigs(escola.id);
    const anoAtivo = anos.find(a => a.rotulo === escola.anoLectivoActivo || a.ano === escola.anoLectivoActivo || a.estado === 'Aberto');
    return anoAtivo?.dataFim || '';
  });

  useEffect(() => {
    if (dataFimAnoAtivo) {
      setDataValidade(dataFimAnoAtivo);
    }
  }, [dataFimAnoAtivo]);

  const [dataEmissao, setDataEmissao] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Painel de Configurações do Passe
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [passConfig, setPassConfig] = useState<ConfiguracaoPassesEscola>(() =>
    dbService.obterConfiguracaoPasses(escola.id)
  );
  const [fotoPosicao, setFotoPosicao] = useState<'esquerda' | 'direita'>(() => {
    const cfg = dbService.obterConfiguracaoPasses(escola.id);
    const elFoto = cfg.elementos.find(e => e.chave === 'foto');
    return elFoto?.posicao === 'direita' ? 'direita' : 'esquerda';
  });
  const [previewFaceModal, setPreviewFaceModal] = useState<'frente' | 'verso' | 'ambos'>('frente');
  const [novaRegraVerso, setNovaRegraVerso] = useState('');
  const [configSalvaSucesso, setConfigSalvaSucesso] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());

  const visibilidadeUsuario = useMemo(
    () => dbService.getVisibilidadeEfetivaUsuario(currentUser, escola),
    [currentUser, escola]
  );
  const podeVerDocAluno = visibilidadeUsuario.dadosSensiveis.verDocumentosIdentificacaoAlunos;
  const podeVerContactoAluno = visibilidadeUsuario.dadosSensiveis.verContactosAlunosEncarregados;

  useEffect(() => {
    const syncListener = () => {
      setConfigSistema(dbService.getConfiguracaoSistema());
      setPassConfig(dbService.obterConfiguracaoPasses(escola.id));
    };
    window.addEventListener('sge_dados_atualizados_remoto', syncListener);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', syncListener);
  }, [escola.id, escola.configuracaoPasses]);

  const todasClasses = useMemo(() => {
    const fromCfg = dbService.getClassesConfigs(escola.id, escola.anoLectivoActivo).filter(c => c.ativa !== false).map(c => c.nome);
    const fromTurmas = turmas.map(t => normalizarClasse(t.classe)).filter(Boolean);
    const fromAlunos = alunos.map(a => normalizarClasse(a.classeId)).filter(Boolean);
    return ordenarClassesMED([
      ...TODAS_CLASSES_OFICIAIS_MED,
      ...fromCfg,
      ...fromTurmas,
      ...fromAlunos
    ]);
  }, [escola.id, escola.anoLectivoActivo, turmas, alunos]);

  const todosCursos = useMemo(() => {
    const fromCfg = dbService.getCursos(escola.id).filter(c => c.ativo !== false).map(c => c.nome).filter(Boolean);
    const fromTurmas = turmas
      .filter(t => isSegundoCiclo(t.classe))
      .map(t => t.curso)
      .filter((c): c is string => Boolean(c && c.trim()));
    const fromAlunos = alunos
      .filter(a => {
        const t = turmas.find(tr => tr.id === a.turmaId);
        return isSegundoCiclo(t?.classe || a.classeId);
      })
      .map(a => a.curso)
      .filter((c): c is string => Boolean(c && c.trim()));
    return Array.from(new Set([...fromCfg, ...fromTurmas, ...fromAlunos, ...CURSOS_SEGUNDO_CICLO])).sort((a, b) =>
      a.localeCompare(b, 'pt', { sensitivity: 'base' })
    );
  }, [escola.id, turmas, alunos]);

  const todasSalas = useMemo(() => {
    const fromCfg = dbService.getSalasAulas(escola.id).filter(s => s.ativo !== false).map(s => s.nome);
    const fromTurmas = turmas.map(t => t.sala).filter((s): s is string => Boolean(s && s.trim()));
    return Array.from(new Set([...fromCfg, ...fromTurmas])).sort((a, b) =>
      a.localeCompare(b, 'pt', { sensitivity: 'base' })
    );
  }, [escola.id, turmas]);

  const todosTurnos = useMemo(() => {
    const fromCfg = dbService.getTurnosConfigs(escola.id, escola.anoLectivoActivo).filter(t => t.ativo !== false).map(t => t.nome).filter(Boolean);
    const fromTurmas = turmas.map(t => t.turno).filter(Boolean);
    return Array.from(new Set(['Manhã', 'Tarde', 'Noite', ...fromCfg, ...fromTurmas]));
  }, [escola.id, escola.anoLectivoActivo, turmas]);

  const turmasDoFiltro = useMemo(() => {
    const porClasse = selectedClasseFilter === 'TODAS'
      ? turmas
      : getTurmasPorClasse(turmas, selectedClasseFilter);
    return porClasse.filter(t => {
      if (selectedCursoFilter !== 'TODOS' && (t.curso || '').trim().toLowerCase() !== selectedCursoFilter.trim().toLowerCase()) {
        return false;
      }
      if (selectedSalaFilter !== 'TODAS' && (t.sala || '').trim().toLowerCase() !== selectedSalaFilter.trim().toLowerCase()) {
        return false;
      }
      if (selectedTurnoFilter !== 'TODOS' && (t.turno || '').trim().toLowerCase() !== selectedTurnoFilter.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [turmas, selectedClasseFilter, selectedCursoFilter, selectedSalaFilter, selectedTurnoFilter]);

  const turmasMap = useMemo(() => new Map(turmas.map(t => [t.id, t])), [turmas]);

  const compararNomesPt = (a: Aluno, b: Aluno) =>
    (a.nomeCompleto || '').trim().localeCompare((b.nomeCompleto || '').trim(), 'pt', { sensitivity: 'base' });

  // Filtragem dos Alunos ordenada alfabeticamente dentro de cada turma
  const alunosFiltrados = useMemo(() => {
    const filtrados = alunos.filter((aluno) => {
      const turma = turmasMap.get(aluno.turmaId);
      const classeNorm = turma ? normalizarClasse(turma.classe) : normalizarClasse(aluno.classeId);

      if (selectedClasseFilter !== 'TODAS' && classeNorm !== normalizarClasse(selectedClasseFilter)) {
        return false;
      }
      if (selectedCursoFilter !== 'TODOS') {
        const cursoAl = (turma?.curso || aluno.curso || '').trim().toLowerCase();
        if (cursoAl !== selectedCursoFilter.trim().toLowerCase()) return false;
      }
      if (selectedSalaFilter !== 'TODAS') {
        const salaAl = (turma?.sala || '').trim().toLowerCase();
        if (salaAl !== selectedSalaFilter.trim().toLowerCase()) return false;
      }
      if (selectedTurmaId !== 'TODAS' && aluno.turmaId !== selectedTurmaId) {
        return false;
      }
      if (selectedTurnoFilter !== 'TODOS' && turma && turma.turno !== selectedTurnoFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const matchNome = safeSearchMatch(aluno.nomeCompleto, searchTerm);
        const matchProc = safeSearchMatch(aluno.numeroProcesso || aluno.codigoMatricula, searchTerm);
        const matchBi = podeVerDocAluno && safeSearchMatch(aluno.numeroBI, searchTerm);
        const matchTurma = safeSearchMatch(turma?.nome, searchTerm);
        const matchSala = safeSearchMatch(turma?.sala, searchTerm);
        const matchCurso = safeSearchMatch(turma?.curso || aluno.curso, searchTerm);
        if (!matchNome && !matchProc && !matchBi && !matchTurma && !matchSala && !matchCurso) {
          return false;
        }
      }
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const tA = turmasMap.get(a.turmaId)?.nome || '';
      const tB = turmasMap.get(b.turmaId)?.nome || '';
      const cmpTurma = tA.localeCompare(tB, 'pt', { sensitivity: 'base' });
      if (cmpTurma !== 0) return cmpTurma;
      return compararNomesPt(a, b);
    });
  }, [alunos, selectedTurmaId, selectedTurnoFilter, selectedClasseFilter, selectedCursoFilter, selectedSalaFilter, searchTerm, turmasMap, podeVerDocAluno]);

  // Funcionários, Título e Nome Completo do Director Geral (como em todos os documentos oficiais)
  const funcionariosEscola = useMemo(() => dbService.getFuncionarios(escola.id), [escola.id]);
  const nomeDiretorCompleto = useMemo(
    () => obterNomeDiretorGeral(escola, funcionariosEscola),
    [escola, funcionariosEscola]
  );
  const tituloDiretorOficial = useMemo(
    () => obterTituloDiretorGeral(escola, funcionariosEscola),
    [escola, funcionariosEscola]
  );

  // Numeração sequencial rigorosamente por ordem alfabética dentro de cada turma
  const mapaNumeroSequencial = useMemo(() => {
    const mapa = new Map<string, number>();
    const porTurma = new Map<string, Aluno[]>();
    alunos.forEach(a => {
      const chave = a.turmaId || '__sem_turma__';
      const arr = porTurma.get(chave) || [];
      arr.push(a);
      porTurma.set(chave, arr);
    });
    porTurma.forEach(lista => {
      const ordenada = [...lista].sort(compararNomesPt);
      ordenada.forEach((a, idx) => {
        mapa.set(a.id, idx + 1);
      });
    });
    return mapa;
  }, [alunos]);

  // Agrupar passes em folhas A4 de acordo com a disposição escolhida (8, 4 ou 1 por folha)
  const passesPorPagina = passConfig.disposicaoGrade === 'individual' ? 1 : passConfig.disposicaoGrade === '4_por_folha' ? 4 : 8;
  const paginasPasses = useMemo(() => {
    const paginas: Aluno[][] = [];
    for (let i = 0; i < alunosFiltrados.length; i += passesPorPagina) {
      paginas.push(alunosFiltrados.slice(i, i + passesPorPagina));
    }
    return paginas;
  }, [alunosFiltrados, passesPorPagina]);

  const formatarDocumentoIdentificacao = (al: Aluno): { rotulo: string; numero: string } => {
    const tipo = al.tipoDocumento || 'BI';
    const numeroLimpo = (
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
    return {
      rotulo,
      numero: numeroLimpo || 'Não Registado'
    };
  };

  // Aluno de exemplo para pré-visualização em tempo real (utiliza o primeiro aluno real ou campos de modelo)
  const alunoExemplo: Aluno = alunosFiltrados[0] || {
    id: 'placeholder-preview',
    codigoMatricula: '[Nº Matrícula]',
    numeroProcesso: '[Nº Processo]',
    numeroOrdem: 1,
    nomeCompleto: '[Nome Completo do Estudante]',
    genero: 'M',
    dataNascimento: '',
    naturalidade: '',
    provinciaOrigem: '',
    numeroBI: '[Nº de B.I.]',
    dataEmissaoBI: '',
    dataValidadeBI: '',
    telefone: '',
    fotoUrl: '',
    encarregadoNome: '[Nome do Encarregado]',
    encarregadoTelefone: '',
    estado: 'Ativo',
    turmaId: turmas[0]?.id || '',
    classeId: '',
    escolaId: escola.id,
    curso: '',
    periodo: '',
    propinaStatus: 'Regularizada',
    historicoAnterior: [],
    cadastradoEm: ''
  };

  const turmaExemplo = turmas.find(t => t.id === alunoExemplo.turmaId) || turmas[0];

  // Alternar ativação de um elemento do passe
  const toggleElemento = (chave: ElementoPasseConfig['chave']) => {
    setPassConfig(prev => {
      const novosElementos = prev.elementos.map(el => {
        if (el.chave === chave) {
          return { ...el, ativo: !el.ativo };
        }
        return el;
      });
      return { ...prev, elementos: novosElementos };
    });
  };

  // Salvar e Validar Configuração dos Passes
  const handleSalvarConfiguracao = () => {
    const configAtualizada: ConfiguracaoPassesEscola = {
      ...passConfig,
      elementos: passConfig.elementos.map(el => {
        if (el.chave === 'foto') {
          return { ...el, posicao: fotoPosicao };
        }
        return el;
      })
    };

    dbService.salvarConfiguracaoPasses(escola.id, configAtualizada);
    const escolaAtualizada: Escola = {
      ...escola,
      corPrimaria: configAtualizada.corPrimaria,
      corSecundaria: configAtualizada.corSecundaria,
      corFundoPasses: configAtualizada.corFundoFrente,
      configuracaoPasses: configAtualizada,
      assinaturaDiretorUrl: configAtualizada.assinaturaDiretorUrl || escola.assinaturaDiretorUrl
    };
    if (onSalvarEscola) {
      onSalvarEscola(escolaAtualizada);
    }
    dbService.salvarEscola(escolaAtualizada);

    setPassConfig(configAtualizada);
    setConfigSalvaSucesso(true);
    setTimeout(() => {
      setConfigSalvaSucesso(false);
      setShowConfigModal(false);
    }, 1500);
  };

  // Exportar Lista de Passes para Excel (.xlsx)
  const handleExportarXLSX = () => {
    const wb = XLSX.utils.book_new();
    const dados = alunosFiltrados.map((aluno, i) => {
      const turma = turmas.find(t => t.id === aluno.turmaId);
      return {
        'Nº': mapaNumeroSequencial.get(aluno.id) ?? i + 1,
        'Nº de Processo': aluno.numeroProcesso || aluno.codigoMatricula,
        'Nome Completo': aluno.nomeCompleto,
        'Gênero': aluno.genero === 'M' ? 'Masculino' : 'Feminino',
        'Classe': aluno.classeId || turma?.classe || '',
        'Turma': turma?.nome || '',
        'Turno': turma?.turno || aluno.periodo || 'Manhã',
        'Nº do BI': podeVerDocAluno ? aluno.numeroBI : 'Restrito pela Direção',
        'Validade do BI': podeVerDocAluno ? (aluno.dataValidadeBI || '—') : 'Restrito',
        'Encarregado': aluno.encarregadoNome || aluno.nomeEncarregado || '',
        'Contacto Encarregado': podeVerContactoAluno ? (aluno.encarregadoTelefone || aluno.telefoneEncarregado || '') : 'Restrito pela Direção',
        'Emissão': dataEmissao,
        'Validade Passe': dataValidade
      };
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Passes_Emitidos');
    XLSX.writeFile(wb, `Passes_Escolares_${escola.sigla || 'MED'}.xlsx`);
  };

  const handleBaixarHTML = () => {
    const el = document.getElementById('passes-print-grid');
    if (!el) {
      window.print();
      return;
    }
    downloadHtmlDocument(
      `Passes_Escolares_${escola.sigla || 'MED'}_8porA4`,
      `Passes Escolares Oficiais - ${escola.nomeOficial}`,
      el.outerHTML
    );
  };

  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    try {
      await downloadElementAsPdf(
        'passes-print-grid',
        `Passes_Escolares_${escola.sigla || 'MED'}_8porA4.pdf`,
        {
          orientation: 'portrait',
          format: 'a4',
          margins: { top: 8, right: 8, bottom: 14, left: 8 }
        }
      );
    } catch (e) {
      console.error('Erro ao exportar passes PDF:', e);
    } finally {
      setGerandoPdf(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('passes-print-grid');
    if (el) {
      imprimirElementoDiretamente(el, `Passes Escolares - ${escola.nomeOficial}`, {
        format: 'a4',
        orientation: 'portrait',
        margins: { top: 8, right: 8, bottom: 14, left: 8 }
      });
    } else {
      window.print();
    }
  };

  // Helper para verificar se elemento está ativo
  const isAtivo = (chave: ElementoPasseConfig['chave']) => {
    const el = passConfig.elementos.find(e => e.chave === chave);
    return el ? el.ativo : true;
  };

  return (
    <div className="space-y-6">
      {/* Topo Oficial com Ações e Configuração */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span 
                className="px-2.5 py-0.5 text-xs font-bold rounded-full text-white"
                style={{ backgroundColor: passConfig.corPrimaria || '#1e3a8a' }}
              >
                Identificação Estudantil Oficial
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Padrão A4: {passesPorPagina === 1 ? '1 Passe Individual' : `${passesPorPagina} Passes por Folha`} • {passConfig.orientacao === 'vertical' ? 'Vertical' : 'Horizontal'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 flex items-center space-x-2">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span>Passes Escolares Oficiais & Configuração Visual</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-0.5">
              Personalize formato, cores autênticas da instituição, disposição em folha A4 e assinatura do director.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'AdminGeral'].includes(currentUser.role) && (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="px-4 py-2 text-xs font-bold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 border border-blue-300 dark:border-blue-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Sliders className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                <span>Personalizar Formato & Cores</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportarXLSX}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              title="Descarregar passes com formatação exata em PDF (.pdf)"
            >
              <Download className="h-4 w-4" />
              <span>{gerandoPdf ? 'A Gerar PDF...' : 'Baixar Passes (.pdf)'}</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarHTML}
              className="px-3.5 py-2 text-xs font-bold text-blue-950 dark:text-blue-200 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar arquivo dos passes em formato web offline"
            >
              <Download className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              <span>Baixar HTML</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir ({passesPorPagina === 1 ? 'Individual' : `${passesPorPagina}/Folha A4`})</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros Hierárquicos: Classe -> Curso -> Sala -> Turma -> Turno -> Pesquisa -> Visualização */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs border-t border-gray-100">
          <div>
            <label className="block font-bold text-gray-700 mb-1">1. Filtrar por Classe</label>
            <select
              value={selectedClasseFilter}
              onChange={(e) => {
                const novaC = e.target.value;
                setSelectedClasseFilter(novaC);
                setSelectedTurmaId('TODAS');
                if (novaC !== 'TODAS' && !isSegundoCiclo(novaC)) {
                  setSelectedCursoFilter('TODOS');
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
            >
              <option value="TODAS">Todas as Classes</option>
              {todasClasses.map(c => (
                <option key={`pass-c-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
              ))}
            </select>
          </div>

          {(selectedClasseFilter === 'TODAS' || isSegundoCiclo(selectedClasseFilter)) && (
            <div>
              <label className="block font-bold text-gray-700 mb-1">2. Curso (IIº Ciclo)</label>
              <select
                value={selectedCursoFilter}
                onChange={(e) => {
                  setSelectedCursoFilter(e.target.value);
                  setSelectedTurmaId('TODAS');
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-purple-900 bg-white"
              >
                <option value="TODOS">Todos os Cursos</option>
                {todosCursos.map(cur => (
                  <option key={`pass-cur-${cur}`} value={cur}>{cur}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">3. Sala de Aula</label>
            <select
              value={selectedSalaFilter}
              onChange={(e) => {
                setSelectedSalaFilter(e.target.value);
                setSelectedTurmaId('TODAS');
              }}
              className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
            >
              <option value="TODAS">Todas as Salas</option>
              {todasSalas.map(s => (
                <option key={`pass-sala-${s}`} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              4. Filtrar por Turma {selectedClasseFilter !== 'TODAS' ? `(${selectedClasseFilter})` : ''}
            </label>
            <select
              value={selectedTurmaId}
              onChange={(e) => setSelectedTurmaId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
            >
              <option value="TODAS">
                {selectedClasseFilter !== 'TODAS' ? `Todas as Turmas da ${selectedClasseFilter}` : 'Todas as Turmas'}
              </option>
              {turmasDoFiltro.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">5. Turno</label>
            <select
              value={selectedTurnoFilter}
              onChange={(e) => setSelectedTurnoFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
            >
              <option value="TODOS">Todos os Turnos</option>
              {todosTurnos.map(tr => (
                <option key={`pass-trn-${tr}`} value={tr}>{tr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">6. Face do Cartão</label>
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-300 gap-1">
              <button
                type="button"
                onClick={() => setVisualizacao('frente')}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  visualizacao === 'frente' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600'
                }`}
              >
                Frente
              </button>
              <button
                type="button"
                onClick={() => setVisualizacao('verso')}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  visualizacao === 'verso' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600'
                }`}
              >
                Verso
              </button>
              <button
                type="button"
                onClick={() => setVisualizacao('ambos')}
                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                  visualizacao === 'ambos' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600'
                }`}
              >
                Ambos
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">
              7. Pesquisa ({alunosFiltrados.length} passes)
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearchInput(e.target.value, 80))}
                maxLength={80}
                placeholder="Nome, BI, Processo, Curso ou Sala..."
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Parâmetros de Datas e Informações */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-slate-800 gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-gray-700 dark:text-slate-300">Data de Emissão:</span>
              <input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="p-1 border border-gray-300 dark:border-slate-700 rounded font-bold bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-gray-700 dark:text-slate-300">Validade do Passe:</span>
              <input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="p-1 border border-gray-300 dark:border-slate-700 rounded font-bold bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 font-bold">
            <span>Passes listados: <strong>{alunosFiltrados.length}</strong></span>
            <span>•</span>
            <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
              <Scissors className="h-3 w-3" />
              <span>
                {passesPorPagina === 1 ? '1 passe individual por folha' : `Grade de ${passesPorPagina} passes por folha A4`}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRADE DE PASSES POR FOLHA A4                                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {alunosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center text-gray-500 dark:text-slate-400">
            Nenhum aluno encontrado para os critérios selecionados.
          </div>
        ) : (
          <div id="passes-print-grid" data-passes-grid="true" className="space-y-6 print:space-y-0">
            {paginasPasses.map((grupoPagina, pageIndex) => (
              <div
                key={`passes-page-${pageIndex}`}
                data-passes-page="true"
                className="passes-sheet-page bg-white/80 dark:bg-slate-900/50 print:bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 print:border-0 pb-5 mb-4 print:pb-4 print:mb-0"
              >
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 font-semibold mb-2 px-1 no-print">
                  <span>
                    Folha {pageIndex + 1} de {paginasPasses.length} (A4 • {passesPorPagina === 1 ? 'Passe Individual' : `${passesPorPagina} passes por página`})
                  </span>
                  <span>
                    Passes {pageIndex * passesPorPagina + 1} a {pageIndex * passesPorPagina + grupoPagina.length}
                  </span>
                </div>
                <div
                  className={`passes-sheet-grid grid gap-3 print:gap-2.5 ${
                    passesPorPagina === 1
                      ? 'grid-cols-1 max-w-md mx-auto'
                      : 'grid-cols-1 md:grid-cols-2 print:grid-cols-2'
                  }`}
                >
                  {grupoPagina.map((aluno, idxInPage) => {
                    const turma = turmas.find(t => t.id === aluno.turmaId) || turmaExemplo;
                    const numeroSequencial = mapaNumeroSequencial.get(aluno.id) ?? (pageIndex * passesPorPagina + idxInPage + 1);
                    const alunoPasseSeguro: Aluno = {
                      ...aluno,
                      ...(podeVerDocAluno
                        ? {}
                        : { numeroDocumento: 'Restrito', numeroBI: 'Restrito' }),
                      ...(podeVerContactoAluno
                        ? {}
                        : {
                            encarregadoTelefone: '',
                            telefoneEncarregado: '',
                            telefone: ''
                          })
                    };
                    return (
                      <SchoolPassCard
                        key={aluno.id}
                        aluno={alunoPasseSeguro}
                        turma={turma}
                        escola={escola}
                        passConfig={passConfig}
                        configSistema={configSistema}
                        visualizacao={visualizacao}
                        numeroSequencial={numeroSequencial}
                        dataEmissao={dataEmissao}
                        dataValidade={dataValidade}
                        nomeDiretorCompleto={nomeDiretorCompleto}
                        tituloDiretorOficial={tituloDiretorOficial}
                        fotoPosicao={fotoPosicao}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL CONFIGURADOR DE FORMATO, CORES & ELEMENTOS DO PASSE (DIREÇÃO)       */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-gray-900/70 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 border border-gray-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Personalização de Formato & Cores dos Passes Escolares</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Configure o modelo autêntico da sua instituição, cores institucionais, fundo, disposição na folha e elementos visíveis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-lg cursor-pointer px-2"
              >
                ✕
              </button>
            </div>

            {configSalvaSucesso && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Configuração de formato, cores e elementos validada e gravada com sucesso!</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Formato, Cores e Seleção de Elementos */}
              <div className="space-y-4 text-xs">
                {/* 1. Formato e Disposição */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl space-y-3">
                  <h4 className="font-black text-gray-900 dark:text-white flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Formato, Estilo & Disposição em A4</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Modelo de Layout</label>
                      <select
                        value={passConfig.formatoLayout || 'classico_horizontal'}
                        onChange={(e) => {
                          const fmt = e.target.value as ConfiguracaoPassesEscola['formatoLayout'];
                          setPassConfig(prev => ({
                            ...prev,
                            formatoLayout: fmt,
                            orientacao: fmt === 'vertical_cracha' ? 'vertical' : prev.orientacao
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      >
                        <option value="classico_horizontal">Clássico Oficial MED</option>
                        <option value="moderno_faixa">Moderno com Faixa Lateral</option>
                        <option value="bicolor_institucional">Bicolor Cabeçalho Sólido</option>
                        <option value="vertical_cracha">Crachá Vertical</option>
                        <option value="minimalista_med">Minimalista Limpo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Orientação do Cartão</label>
                      <select
                        value={passConfig.orientacao}
                        onChange={(e) => setPassConfig(prev => ({ ...prev, orientacao: e.target.value as any }))}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      >
                        <option value="horizontal">Horizontal (Cartão Padrão)</option>
                        <option value="vertical">Vertical (Crachá Alto)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Passes por Folha A4</label>
                      <select
                        value={passConfig.disposicaoGrade}
                        onChange={(e) => setPassConfig(prev => ({ ...prev, disposicaoGrade: e.target.value as any }))}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      >
                        <option value="8_por_folha">8 Passes por Folha A4</option>
                        <option value="4_por_folha">4 Passes por Folha A4</option>
                        <option value="individual">Individual (1 por Folha)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Estilo da Tarja</label>
                      <select
                        value={passConfig.estiloTarja}
                        onChange={(e) => setPassConfig(prev => ({ ...prev, estiloTarja: e.target.value as any }))}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      >
                        <option value="elegante_dourado">Elegante c/ Friso Secundário</option>
                        <option value="gradiente">Gradiente Institucional</option>
                        <option value="solido">Sólido Clássico</option>
                        <option value="minimalista">Minimalista Suave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Fundo do Cartão</label>
                      <select
                        value={passConfig.tipoFundo || 'solido'}
                        onChange={(e) => setPassConfig(prev => ({ ...prev, tipoFundo: e.target.value as any }))}
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      >
                        <option value="solido">Fundo Liso Uniforme</option>
                        <option value="gradiente_suave">Gradiente Suave da Escola</option>
                        <option value="marca_dagua">Com Marca d'Água do Logótipo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Tamanho & Posição da Foto</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={passConfig.tamanhoFoto || 'padrao'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, tamanhoFoto: e.target.value as any }))}
                          className="p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        >
                          <option value="padrao">Foto Padrão</option>
                          <option value="grande">Foto Grande</option>
                          <option value="maximo">Foto Máxima</option>
                        </select>
                        <select
                          value={fotoPosicao}
                          onChange={(e) => setFotoPosicao(e.target.value as any)}
                          className="p-2 border border-gray-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        >
                          <option value="esquerda">À Esquerda</option>
                          <option value="direita">À Direita</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Cores Autênticas da Escola */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl space-y-3">
                  <h4 className="font-black text-gray-900 dark:text-white flex items-center space-x-1.5">
                    <Palette className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Cores Autênticas da Instituição</span>
                  </h4>

                  {/* Paletas Rápidas */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1.5">Paletas Institucionais:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { nome: 'Azul Real', prim: '#1e3a8a', sec: '#d97706', fundo: '#ffffff', txt: '#ffffff', txtCorpo: '#111827' },
                        { nome: 'Verde Esperança', prim: '#065f46', sec: '#f59e0b', fundo: '#ffffff', txt: '#ffffff', txtCorpo: '#064e3b' },
                        { nome: 'Bordô Académico', prim: '#881337', sec: '#d97706', fundo: '#fffafb', txt: '#ffffff', txtCorpo: '#1f2937' },
                        { nome: 'Dourado Imperial', prim: '#78350f', sec: '#f59e0b', fundo: '#fffdf7', txt: '#ffffff', txtCorpo: '#292524' },
                        { nome: 'Grafite Executivo', prim: '#0f172a', sec: '#0284c7', fundo: '#f8fafc', txt: '#ffffff', txtCorpo: '#0f172a' },
                        { nome: 'Angola Rubro-Ouro', prim: '#991b1b', sec: '#eab308', fundo: '#ffffff', txt: '#ffffff', txtCorpo: '#111827' }
                      ].map(paleta => (
                        <button
                          key={paleta.nome}
                          type="button"
                          onClick={() => setPassConfig(prev => ({
                            ...prev,
                            corPrimaria: paleta.prim,
                            corSecundaria: paleta.sec,
                            corFundoFrente: paleta.fundo,
                            corTexto: paleta.txt,
                            corTextoSecundario: paleta.txtCorpo,
                            corBorda: paleta.prim
                          }))}
                          className="px-2 py-1 rounded-lg border border-gray-300 dark:border-slate-700 text-[11px] font-bold flex items-center space-x-1.5 hover:shadow-2xs transition-all cursor-pointer bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                        >
                          <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: paleta.prim }} />
                          <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: paleta.sec }} />
                          <span>{paleta.nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">Cor Primária</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="color"
                          value={passConfig.corPrimaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corPrimaria: e.target.value, corBorda: e.target.value }))}
                          className="h-7 w-9 border border-gray-300 dark:border-slate-700 rounded cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={passConfig.corPrimaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corPrimaria: e.target.value }))}
                          className="w-full p-1 border border-gray-300 dark:border-slate-700 rounded font-mono text-[11px] bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">Cor Secundária</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="color"
                          value={passConfig.corSecundaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corSecundaria: e.target.value }))}
                          className="h-7 w-9 border border-gray-300 dark:border-slate-700 rounded cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={passConfig.corSecundaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corSecundaria: e.target.value }))}
                          className="w-full p-1 border border-gray-300 dark:border-slate-700 rounded font-mono text-[11px] bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">Fundo da Frente</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="color"
                          value={passConfig.corFundoFrente || '#ffffff'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corFundoFrente: e.target.value }))}
                          className="h-7 w-9 border border-gray-300 dark:border-slate-700 rounded cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={passConfig.corFundoFrente || '#ffffff'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corFundoFrente: e.target.value }))}
                          className="w-full p-1 border border-gray-300 dark:border-slate-700 rounded font-mono text-[11px] bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">Texto da Tarja</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="color"
                          value={passConfig.corTexto || '#ffffff'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corTexto: e.target.value }))}
                          className="h-7 w-9 border border-gray-300 dark:border-slate-700 rounded cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={passConfig.corTexto || '#ffffff'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corTexto: e.target.value }))}
                          className="w-full p-1 border border-gray-300 dark:border-slate-700 rounded font-mono text-[11px] bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">Texto do Cartão</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="color"
                          value={passConfig.corTextoSecundario || '#111827'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corTextoSecundario: e.target.value }))}
                          className="h-7 w-9 border border-gray-300 dark:border-slate-700 rounded cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={passConfig.corTextoSecundario || '#111827'}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corTextoSecundario: e.target.value }))}
                          className="w-full p-1 border border-gray-300 dark:border-slate-700 rounded font-mono text-[11px] bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 mb-1">Cor da Borda</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="color"
                          value={passConfig.corBorda || passConfig.corPrimaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corBorda: e.target.value }))}
                          className="h-7 w-9 border border-gray-300 dark:border-slate-700 rounded cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={passConfig.corBorda || passConfig.corPrimaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corBorda: e.target.value }))}
                          className="w-full p-1 border border-gray-300 dark:border-slate-700 rounded font-mono text-[11px] bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload da Assinatura do Diretor Geral */}
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-gray-800 dark:text-slate-200">
                        Assinatura Digitalizada do Director Geral
                      </label>
                      <label className="flex items-center space-x-1.5 text-[11px] text-gray-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={passConfig.chancelaDigitalAtiva !== false}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, chancelaDigitalAtiva: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>Chancela activa</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Carregar Imagem de Assinatura</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const res = await processarFotoUpload(file, 360, 0.82);
                              if (res.sucesso && res.dataUrl) {
                                setPassConfig(prev => ({ ...prev, assinaturaDiretorUrl: res.dataUrl }));
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {Boolean((passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl)?.trim()) && (
                        <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border border-gray-300">
                          <img
                            src={passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl}
                            alt="Assinatura Diretor"
                            className="h-7 w-auto max-w-[80px] object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setPassConfig(prev => ({ ...prev, assinaturaDiretorUrl: undefined }))}
                            className="text-[10px] text-red-600 hover:underline font-bold"
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Seleção de Informações a Incluir */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2.5">
                  <h4 className="font-black text-gray-900 dark:text-white flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Informações a Incluir no Passe Escolar</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {passConfig.elementos.map(elem => (
                      <label
                        key={elem.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          elem.ativo
                            ? 'bg-blue-50/70 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={elem.ativo}
                          onChange={() => toggleElemento(elem.chave)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="text-[11px] truncate">{elem.rotulo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna 2: Pré-visualização em Tempo Real + Normas do Verso */}
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center space-y-3">
                  <div className="w-full flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase text-gray-700 dark:text-slate-200 tracking-wider">
                        Pré-Visualização em Tempo Real
                      </span>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        Modelo: {passConfig.formatoLayout || 'classico_horizontal'} • Cores exactas na impressão
                      </p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-gray-300 dark:border-slate-700 text-[10px] font-bold">
                      {(['frente', 'verso', 'ambos'] as const).map(face => (
                        <button
                          key={face}
                          type="button"
                          onClick={() => setPreviewFaceModal(face)}
                          className={`px-2 py-1 rounded-md capitalize cursor-pointer ${
                            previewFaceModal === face
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 dark:text-slate-300'
                          }`}
                        >
                          {face}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={passConfig.orientacao === 'vertical' || passConfig.formatoLayout === 'vertical_cracha' ? 'w-[260px]' : 'w-[340px]'}>
                    <SchoolPassCard
                      aluno={alunoExemplo}
                      turma={turmaExemplo}
                      escola={escola}
                      passConfig={passConfig}
                      configSistema={configSistema}
                      visualizacao={previewFaceModal}
                      numeroSequencial={mapaNumeroSequencial.get(alunoExemplo.id) || 1}
                      dataEmissao={dataEmissao}
                      dataValidade={dataValidade}
                      nomeDiretorCompleto={nomeDiretorCompleto}
                      tituloDiretorOficial={tituloDiretorOficial}
                      fotoPosicao={fotoPosicao}
                    />
                  </div>
                </div>

                {/* Normas do Verso */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-gray-900 dark:text-white">Normas do Verso do Cartão</h4>
                    <label className="flex items-center space-x-1.5 text-[11px] font-bold text-gray-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passConfig.mostrarVerso !== false}
                        onChange={(e) => setPassConfig(prev => ({ ...prev, mostrarVerso: e.target.checked }))}
                        className="rounded text-blue-600"
                      />
                      <span>Incluir Verso</span>
                    </label>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {(passConfig.regrasVerso || []).map((regra, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={regra}
                          onChange={(e) => {
                            const copia = [...(passConfig.regrasVerso || [])];
                            copia[idx] = e.target.value;
                            setPassConfig(prev => ({ ...prev, regrasVerso: copia }));
                          }}
                          className="flex-1 p-1.5 text-[11px] border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copia = (passConfig.regrasVerso || []).filter((_, i) => i !== idx);
                            setPassConfig(prev => ({ ...prev, regrasVerso: copia }));
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={novaRegraVerso}
                      onChange={(e) => setNovaRegraVerso(e.target.value)}
                      placeholder="Adicionar norma para o verso do passe..."
                      className="flex-1 p-1.5 text-[11px] border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!novaRegraVerso.trim()) return;
                        setPassConfig(prev => ({
                          ...prev,
                          regrasVerso: [...(prev.regrasVerso || []), novaRegraVerso.trim()]
                        }));
                        setNovaRegraVerso('');
                      }}
                      className="px-3 py-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                  <strong>Validação Institucional:</strong> Ao salvar, todas as cores, o modelo visual e a disposição escolhidos aplicam-se automaticamente aos passes desta escola e à central de impressão.
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 font-bold text-xs hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarConfiguracao}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Validar e Salvar Configuração Oficial</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
