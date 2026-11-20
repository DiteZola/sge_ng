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
  const [passConfig, setPassConfig] = useState<ConfiguracaoPassesEscola>(() => {
    return escola.configuracaoPasses || dbService.obterConfiguracaoPasses(escola.id);
  });
  const [fotoPosicao, setFotoPosicao] = useState<'esquerda' | 'direita'>('esquerda');
  const [configSalvaSucesso, setConfigSalvaSucesso] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());

  useEffect(() => {
    const syncListener = () => {
      setConfigSistema(dbService.getConfiguracaoSistema());
      setPassConfig(escola.configuracaoPasses || dbService.obterConfiguracaoPasses(escola.id));
    };
    window.addEventListener('sge_dados_atualizados_remoto', syncListener);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', syncListener);
  }, [escola.id, escola.configuracaoPasses]);

  const todasClasses = useMemo(() => {
    const fromCfg = dbService.getClassesConfigs(escola.id).filter(c => c.ativa !== false).map(c => c.nome);
    const fromTurmas = turmas.map(t => normalizarClasse(t.classe)).filter(Boolean);
    const fromAlunos = alunos.map(a => normalizarClasse(a.classeId)).filter(Boolean);
    return ordenarClassesMED([
      ...TODAS_CLASSES_OFICIAIS_MED,
      ...fromCfg,
      ...fromTurmas,
      ...fromAlunos
    ]);
  }, [escola.id, turmas, alunos]);

  const todosCursos = useMemo(() => {
    const fromCfg = dbService.getCursos(escola.id).filter(c => c.ativo !== false).map(c => c.nome).filter(Boolean);
    const fromTurmas = turmas.map(t => t.curso).filter((c): c is string => Boolean(c && c.trim()));
    const fromAlunos = alunos.map(a => a.curso).filter((c): c is string => Boolean(c && c.trim()));
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
    const fromCfg = dbService.getTurnosConfigs(escola.id).filter(t => t.ativo !== false).map(t => t.nome).filter(Boolean);
    const fromTurmas = turmas.map(t => t.turno).filter(Boolean);
    return Array.from(new Set(['Manhã', 'Tarde', 'Noite', ...fromCfg, ...fromTurmas]));
  }, [escola.id, turmas]);

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
        const matchBi = safeSearchMatch(aluno.numeroBI, searchTerm);
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
  }, [alunos, selectedTurmaId, selectedTurnoFilter, selectedClasseFilter, selectedCursoFilter, selectedSalaFilter, searchTerm, turmasMap]);

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

  // Agrupar passes em folhas A4 de 8 passes cada (2 colunas × 4 linhas)
  const paginasPasses = useMemo(() => {
    const paginas: Aluno[][] = [];
    for (let i = 0; i < alunosFiltrados.length; i += 8) {
      paginas.push(alunosFiltrados.slice(i, i + 8));
    }
    return paginas;
  }, [alunosFiltrados]);

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
        'Nº do BI': aluno.numeroBI,
        'Validade do BI': aluno.dataValidadeBI || '—',
        'Encarregado': aluno.encarregadoNome || aluno.nomeEncarregado || '',
        'Contacto Encarregado': aluno.encarregadoTelefone || aluno.telefoneEncarregado || '',
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
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span 
                className="px-2.5 py-0.5 text-xs font-bold rounded-full text-white"
                style={{ backgroundColor: passConfig.corPrimaria || '#1e3a8a' }}
              >
                Identificação Estudantil Oficial
              </span>
              <span className="text-xs text-gray-500">Padrão A4: 8 Passes por Folha</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center space-x-2">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <span>Passes Escolares Oficiais & Configuração Visual</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Personalize cores da instituição, altere tamanho de foto, carregue assinatura do diretor e imprima 8 passes em folha A4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'AdminGeral'].includes(currentUser.role) && (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="px-4 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Sliders className="h-4 w-4 text-blue-700" />
                <span>Configurar Elementos & Cores</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportarXLSX}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
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
              className="px-3.5 py-2 text-xs font-bold text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar arquivo dos passes em formato web offline"
            >
              <Download className="h-4 w-4 text-blue-700" />
              <span>Baixar HTML</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir 8 Passes (Folha A4)</span>
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
              }}
              className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
            >
              <option value="TODAS">Todas as Classes</option>
              {todasClasses.map(c => (
                <option key={`pass-c-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">2. Curso / Área de Formação</label>
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
                  {t.nome} • {t.sala || 'Sala'} {t.curso ? `• ${t.curso}` : ''}
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
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-gray-100 gap-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-gray-700">Data de Emissão:</span>
              <input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="p-1 border border-gray-300 rounded font-bold"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-gray-700">Validade do Passe:</span>
              <input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="p-1 border border-gray-300 rounded font-bold"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-gray-600 font-bold">
            <span>Passes listados: <strong>{alunosFiltrados.length}</strong></span>
            <span>•</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
              <Scissors className="h-3 w-3" />
              <span>Grade de 8 passes por folha A4 com guias de corte</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRADE DE 8 PASSES POR FOLHA A4 (2 COLUNAS × 4 LINHAS COM MARGEM INFERIOR) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {alunosFiltrados.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
            Nenhum aluno encontrado para os critérios selecionados.
          </div>
        ) : (
          <div id="passes-print-grid" data-passes-grid="true" className="space-y-6 print:space-y-0">
            {paginasPasses.map((grupoPagina, pageIndex) => (
              <div
                key={`passes-page-${pageIndex}`}
                data-passes-page="true"
                className="passes-sheet-page bg-white/60 print:bg-white pb-5 mb-4 print:pb-4 print:mb-0"
              >
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold mb-2 px-1 no-print">
                  <span>
                    Folha {pageIndex + 1} de {paginasPasses.length} (A4 • 8 passes por página)
                  </span>
                  <span>
                    Passes {pageIndex * 8 + 1} a {pageIndex * 8 + grupoPagina.length}
                  </span>
                </div>
                <div className="passes-sheet-grid grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2.5">
                  {grupoPagina.map((aluno, idxInPage) => {
                    const turma = turmas.find(t => t.id === aluno.turmaId) || turmaExemplo;
                    const anoLectivoNome = aluno.anoLectivo || aluno.anoMatricula || turma?.anoLectivo || escola.anoLectivoActivo || '—';
                    const numProcesso = aluno.numeroProcesso || aluno.codigoMatricula || '—';
                    const classeExibida = turma?.classe || aluno.classeId || '—';
                    const numeroSequencial = mapaNumeroSequencial.get(aluno.id) ?? (pageIndex * 8 + idxInPage + 1);
                    const docInfo = formatarDocumentoIdentificacao(aluno);
                    const clNorm = normalizarClasse(classeExibida);
                    const ehSegundoCicloPass = isSegundoCiclo(clNorm);

                    return (
                      <div
                        key={aluno.id}
                        className="bg-white border-2 rounded-xl shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between print:shadow-none print:break-inside-avoid print:border-black min-h-[246px] h-auto select-none text-black"
                        style={{ borderColor: passConfig.corPrimaria || '#1e3a8a' }}
                      >
                        {/* FRENTE DO PASSE */}
                        {(visualizacao === 'frente' || visualizacao === 'ambos') && (
                          <div className="p-2 bg-white relative flex flex-col justify-between flex-1">
                            {/* Topo Oficial: Província e Município PRIMEIRO, Nome da Escola DEPOIS */}
                            <div className="border-b pb-1 flex items-center justify-between gap-1.5" style={{ borderColor: `${passConfig.corPrimaria}40` }}>
                              {isAtivo('insignia') && (
                                <div className="h-7 w-7 flex items-center justify-center shrink-0">
                                  {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                                    <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-7 w-7 object-contain" />
                                  ) : (
                                    <InsigniaAngola size={24} />
                                  )}
                                </div>
                              )}

                              <div className="flex-1 text-center min-w-0 px-1">
                                <p className="text-[7px] font-black uppercase text-gray-700 tracking-wider leading-[1.15]">
                                  República de Angola
                                </p>
                                <p className="text-[7px] font-bold uppercase text-gray-600 whitespace-normal break-words leading-[1.15]">
                                  Província: {escola.provincia || 'Luanda'} • Município: {escola.municipio || 'Luanda'}
                                </p>
                                <h4
                                  className="text-[8px] font-black uppercase whitespace-normal break-words leading-[1.15] mt-0.5"
                                  style={{ color: passConfig.corPrimaria || '#1e3a8a' }}
                                >
                                  {escola.nomeOficial}
                                </h4>
                              </div>

                              {isAtivo('logotipo') && (
                                <div className="h-7 w-7 flex items-center justify-center shrink-0">
                                  {Boolean((escola.logotipoUrl || escola.logotipo)?.trim()) ? (
                                    <img src={escola.logotipoUrl || escola.logotipo} alt="Logo" className="h-7 w-7 object-contain rounded" />
                                  ) : (
                                    <Award className="h-5 w-5" style={{ color: passConfig.corPrimaria }} />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Tarja Oficial */}
                            <div
                              className="text-white text-center py-0.5 my-1 rounded-xs shadow-2xs"
                              style={{
                                backgroundColor: passConfig.corPrimaria || '#1e3a8a',
                                color: passConfig.corTexto || '#ffffff'
                              }}
                            >
                              <span className="text-[7.5px] font-black uppercase tracking-widest block">
                                Cartão de Estudante • {anoLectivoNome}
                              </span>
                            </div>

                            {/* Corpo do Cartão: Foto Ampliada (sem Nº 1 por baixo) & Dados Completos + QR Code limpo */}
                            <div className={`flex items-center gap-2 my-auto ${fotoPosicao === 'direita' ? 'flex-row-reverse' : 'flex-row'}`}>
                              {isAtivo('foto') && (
                                <div className="shrink-0 flex flex-col items-center">
                                  {aluno.fotoUrl && aluno.fotoUrl.trim() !== '' ? (
                                    <img
                                      src={aluno.fotoUrl}
                                      alt={aluno.nomeCompleto}
                                      className="h-[104px] w-[82px] rounded-md object-cover border-2 border-slate-700 shadow-2xs print:border-black"
                                    />
                                  ) : (
                                    <div className="h-[104px] w-[82px] rounded-md border-2 border-slate-400 bg-slate-100 flex flex-col items-center justify-center text-[8px] text-gray-400 font-bold shadow-2xs print:border-black">
                                      <User className="h-8 w-8 text-gray-300 mb-0.5" />
                                      <span>FOTO 3x4</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Dados Académicos e Pessoais do Aluno */}
                              <div className="flex-1 min-w-0 text-[8.5px] leading-[1.2] space-y-0.5">
                                {isAtivo('nome') && (
                                  <div className="font-black uppercase whitespace-normal break-words text-gray-950 text-[9px] leading-[1.15]">
                                    {aluno.nomeCompleto}
                                  </div>
                                )}

                                {isAtivo('classeTurma') && (
                                  <>
                                    <div className="text-gray-800 whitespace-normal break-words">
                                      Classe: <strong className="text-gray-950">{classeExibida}</strong> • <strong className="font-mono text-gray-950">Nº {numeroSequencial}</strong>
                                    </div>
                                    <div className="text-gray-800 whitespace-normal break-words">
                                      Turma: <strong className="text-gray-950">{turma?.nome || '—'}</strong>
                                      {isAtivo('turno') && (
                                        <> • Turno: <strong className="text-gray-950">{turma?.turno || 'Manhã'}</strong></>
                                      )}
                                    </div>
                                  </>
                                )}

                                {ehSegundoCicloPass && isAtivo('curso') && (
                                  <div className="text-gray-700 whitespace-normal break-words text-[8px]">
                                    Curso: <strong className="text-gray-950">{aluno.curso || turma?.curso || 'Geral'}</strong>
                                  </div>
                                )}

                                {isAtivo('numeroBI') && (
                                  <div className="text-gray-800 font-mono whitespace-normal break-words text-[8px]">
                                    {docInfo.rotulo} <strong className="text-gray-950">{docInfo.numero}</strong>
                                  </div>
                                )}

                                {isAtivo('numeroProcesso') && (
                                  <div className="text-gray-700 font-mono whitespace-normal break-words text-[8px]">
                                    Proc. Nº: <strong className="text-gray-950">{numProcesso}</strong>
                                  </div>
                                )}

                                {isAtivo('encarregado') && aluno.encarregadoNome && (
                                  <div className="text-gray-600 whitespace-normal break-words text-[7.5px]">
                                    Enc.: {aluno.encarregadoNome}
                                  </div>
                                )}
                              </div>

                              {/* Apenas QR Code (sem texto/palavra ao lado ou por baixo) */}
                              {isAtivo('qrCode') && (
                                <div className="shrink-0 flex items-center justify-center">
                                  <OfficialQrCode
                                    value={gerarPayloadQrEstudante(aluno, escola, turma)}
                                    size={44}
                                    className="border-gray-300"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Rodapé Oficial: Validade, Título e Nome Completo do Director da Escola */}
                            <div className="pt-1 mt-1 border-t border-gray-200 flex items-end justify-between gap-1.5 text-[7.5px] text-gray-700">
                              {isAtivo('validade') && (
                                <div className="shrink-0">
                                  <span>Val: <strong className="text-gray-950">{dataValidade || '—'}</strong></span>
                                </div>
                              )}

                              {isAtivo('assinaturaDiretor') && (
                                <div className="flex-1 flex flex-col items-center justify-end text-center min-w-0">
                                  <span className="text-[6.5px] font-bold uppercase text-gray-800 leading-[1.1] mb-0.5 whitespace-normal break-words max-w-full">
                                    {tituloDiretorOficial}
                                  </span>
                                  {Boolean((passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl)?.trim()) ? (
                                    <img
                                      src={passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl}
                                      alt="Assinatura do Director"
                                      className="h-3.5 w-auto max-w-[75px] object-contain my-0.5"
                                    />
                                  ) : (
                                    <div className="border-b border-gray-500 w-24 my-1"></div>
                                  )}
                                  <span className="font-bold text-gray-950 text-[7px] leading-[1.1] whitespace-normal break-words max-w-full">
                                    {nomeDiretorCompleto}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* VERSO DO PASSE (REGRAS E AVISOS) */}
                        {(visualizacao === 'verso' || visualizacao === 'ambos') && (
                          <div className={`p-2.5 bg-gray-50 relative flex flex-col justify-between flex-1 text-[8px] leading-tight text-gray-700 ${visualizacao === 'ambos' ? 'border-t border-dashed border-gray-400' : ''}`}>
                            <div>
                              <div className="text-center font-black uppercase text-[8.5px] border-b pb-1 text-gray-900">
                                Regulamento de Uso do Cartão
                              </div>
                              <ul className="list-disc pl-3 pt-2 space-y-1.5">
                                {passConfig.regrasVerso.map((r, idx) => (
                                  <li key={idx}>{r}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[7.5px]">
                              <div>
                                <span>Emissão: <strong>{dataEmissao}</strong></span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold">{escola.nomeOficial}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL CONFIGURADOR DE ELEMENTOS & CORES DO PASSE (DIREÇÃO)                */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 border border-gray-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-blue-600" />
                  <span>Configurador Oficial de Passes Escolares & Cores da Instituição</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Defina as cores institucionais, ative/desative campos e posicione elementos com pré-visualização em tempo real.
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {configSalvaSucesso && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Configuração de cores e elementos validada e gravada com sucesso!</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Opções de Cores e Seleção de Elementos */}
              <div className="space-y-5 text-xs">
                {/* 1. Escolha de Cores da Escola */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <h4 className="font-black text-gray-900 flex items-center space-x-1.5">
                    <Palette className="h-4 w-4 text-blue-600" />
                    <span>Cores do Sistema e do Cartão de Estudante</span>
                  </h4>
                  
                  {/* Paleta Rápida Angola */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Paletas de Cores:</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { nome: 'Azul Real', prim: '#1e3a8a', sec: '#d97706' },
                        { nome: 'Verde Esperança', prim: '#065f46', sec: '#f59e0b' },
                        { nome: 'Bordô Académico', prim: '#881337', sec: '#d97706' },
                        { nome: 'Dourado Imperial', prim: '#78350f', sec: '#fbbf24' },
                        { nome: 'Grafite Executivo', prim: '#1e293b', sec: '#38bdf8' }
                      ].map(paleta => (
                        <button
                          key={paleta.nome}
                          type="button"
                          onClick={() => setPassConfig(prev => ({
                            ...prev,
                            corPrimaria: paleta.prim,
                            corSecundaria: paleta.sec
                          }))}
                          className="px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center space-x-1.5 hover:shadow-2xs transition-all cursor-pointer bg-white"
                        >
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: paleta.prim }} />
                          <span>{paleta.nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Cor Primária (Hexadecimal)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={passConfig.corPrimaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corPrimaria: e.target.value }))}
                          className="h-8 w-10 border border-gray-300 rounded cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={passConfig.corPrimaria}
                          onChange={(e) => setPassConfig(prev => ({ ...prev, corPrimaria: e.target.value }))}
                          className="flex-1 p-1.5 border border-gray-300 rounded font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Posição da Fotografia</label>
                      <select
                        value={fotoPosicao}
                        onChange={(e) => setFotoPosicao(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 rounded-lg font-bold bg-white"
                      >
                        <option value="esquerda">Foto à Esquerda (Padrão)</option>
                        <option value="direita">Foto à Direita</option>
                      </select>
                    </div>
                  </div>

                  {/* Upload da Assinatura do Diretor Geral */}
                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      Assinatura Digitalizada do Diretor Geral (Para passes e visto do boletim)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors">
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
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      A assinatura carregada será usada na chancela dos passes escolares e no visto superior esquerdo dos boletins de notas.
                    </span>
                  </div>
                </div>

                {/* 2. Seleção de Informações a Incluir */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <h4 className="font-black text-gray-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Informações a Incluir no Passe Escolar</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Marque os elementos que deseja imprimir no cartão de estudante da instituição:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto custom-scrollbar">
                    {passConfig.elementos.map(elem => (
                      <label
                        key={elem.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          elem.ativo ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-bold' : 'bg-white border-gray-200 text-gray-500'
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

              {/* Coluna 2: Pré-visualização em Tempo Real (Live Preview) */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-slate-100 flex flex-col items-center justify-center">
                  <div className="text-center mb-3">
                    <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
                      Pré-Visualização em Tempo Real do Cartão
                    </span>
                    <p className="text-[10px] text-gray-500">Dimensões reais de impressão (85.6mm x 54mm)</p>
                  </div>

                  {/* Cartão Preview FRENTE */}
                  <div 
                    className="w-[340px] min-h-[245px] h-auto bg-white border-2 rounded-xl p-2.5 shadow-md flex flex-col justify-between select-none"
                    style={{ borderColor: passConfig.corPrimaria || '#1e3a8a' }}
                  >
                    {/* Topo Oficial: Província e Município antes do Nome da Escola */}
                    <div className="border-b pb-1 flex items-center justify-between" style={{ borderColor: `${passConfig.corPrimaria}40` }}>
                      {isAtivo('insignia') && (
                        <div className="h-6 w-6 flex items-center justify-center shrink-0">
                          {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                            <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-6 w-6 object-contain" />
                          ) : (
                            <InsigniaAngola size={20} />
                          )}
                        </div>
                      )}

                      <div className="flex-1 text-center min-w-0 px-1">
                        <p className="text-[6.5px] font-black uppercase text-gray-600 tracking-wider leading-tight">República de Angola</p>
                        <p className="text-[6.5px] font-bold uppercase text-gray-500 whitespace-normal break-words leading-tight">
                          Província: {escola.provincia || 'Luanda'} • Município: {escola.municipio || 'Luanda'}
                        </p>
                        <h4 className="text-[8px] font-black uppercase whitespace-normal break-words leading-tight" style={{ color: passConfig.corPrimaria }}>
                          {escola.nomeOficial}
                        </h4>
                      </div>

                      {isAtivo('logotipo') && (
                        <div className="h-6 w-6 flex items-center justify-center shrink-0">
                          <Award className="h-4 w-4" style={{ color: passConfig.corPrimaria }} />
                        </div>
                      )}
                    </div>

                    {/* Tarja */}
                    <div 
                      className="text-white text-center py-0.5 my-1 rounded-xs"
                      style={{ backgroundColor: passConfig.corPrimaria || '#1e3a8a' }}
                    >
                      <span className="text-[7.5px] font-black uppercase tracking-widest block">
                        Cartão de Estudante • {escola.anoLectivoActivo || '—'}
                      </span>
                    </div>

                    {/* Corpo */}
                    <div className={`flex items-center gap-2 my-auto ${fotoPosicao === 'direita' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {isAtivo('foto') && (
                        alunoExemplo.fotoUrl && alunoExemplo.fotoUrl.trim() !== '' ? (
                          <img 
                            src={alunoExemplo.fotoUrl} 
                            alt="Foto" 
                            className="h-24 w-20 rounded object-cover border-2 border-slate-700 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="h-24 w-20 rounded border-2 border-slate-400 bg-slate-100 flex flex-col items-center justify-center text-[7.5px] text-gray-400 font-bold shadow-2xs shrink-0">
                            <User className="h-7 w-7 text-gray-300 mb-0.5" />
                            <span>FOTO 3x4</span>
                          </div>
                        )
                      )}

                      <div className="flex-1 min-w-0 text-[8px] leading-tight space-y-0.5">
                        {isAtivo('nome') && <div className="font-black uppercase whitespace-normal break-words text-gray-900">{alunoExemplo.nomeCompleto}</div>}
                        {isAtivo('classeTurma') && (
                          <>
                            <div className="text-gray-700 whitespace-normal break-words">
                              Classe: <strong>{turmaExemplo?.classe || alunoExemplo.classeId || '10ª'}</strong> • <strong className="font-mono">Nº {mapaNumeroSequencial.get(alunoExemplo.id) || 1}</strong>
                            </div>
                            <div className="text-gray-700 whitespace-normal break-words">
                              Turma: <strong>{turmaExemplo?.nome || 'Turma A'}</strong>
                              {isAtivo('turno') && <> • Turno: <strong>{turmaExemplo?.turno || 'Manhã'}</strong></>}
                            </div>
                          </>
                        )}
                        {isSegundoCiclo(normalizarClasse(turmaExemplo?.classe || alunoExemplo.classeId || '')) && isAtivo('curso') && (
                          <div className="text-gray-700 whitespace-normal break-words">Curso: <strong>{alunoExemplo.curso || turmaExemplo?.curso || 'Geral'}</strong></div>
                        )}
                        {isAtivo('numeroBI') && (
                          <div className="text-gray-700 font-mono whitespace-normal break-words">
                            {formatarDocumentoIdentificacao(alunoExemplo).rotulo} <strong>{formatarDocumentoIdentificacao(alunoExemplo).numero}</strong>
                          </div>
                        )}
                        {isAtivo('numeroProcesso') && <div className="text-gray-700 font-mono whitespace-normal break-words">Proc: <strong>{alunoExemplo.numeroProcesso}</strong></div>}
                        {isAtivo('encarregado') && <div className="text-gray-600 whitespace-normal break-words text-[7px]">Enc: {alunoExemplo.encarregadoNome}</div>}
                      </div>

                      {isAtivo('qrCode') && (
                        <div className="shrink-0 flex items-center justify-center">
                          <OfficialQrCode
                            value={gerarPayloadQrEstudante(alunoExemplo, escola, turmaExemplo)}
                            size={38}
                          />
                        </div>
                      )}
                    </div>

                    {/* Rodapé */}
                    <div className="pt-1 border-t border-gray-200 flex items-end justify-between gap-2 text-[7px] text-gray-600">
                      {isAtivo('validade') && <span>Val: <strong>{dataValidade || '—'}</strong></span>}
                      {isAtivo('assinaturaDiretor') && (
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          <span className="text-[6px] font-bold uppercase text-gray-700 whitespace-normal break-words text-center max-w-full">{tituloDiretorOficial}</span>
                          {Boolean((passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl)?.trim()) ? (
                            <img
                              src={passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl}
                              alt="Assinatura"
                              className="h-4 w-auto max-w-[60px] object-contain"
                            />
                          ) : (
                            <div className="border-b border-gray-400 w-16 my-0.5" />
                          )}
                          <span className="font-bold text-gray-900 text-[6.5px] whitespace-normal break-words text-center max-w-full">{nomeDiretorCompleto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <strong>Validação Institucional:</strong> Ao clicar em salvar, todos os cartões escolares gerados na escola e as impressões em folha A4 obedecerão a este padrão de diagramação.
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
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
