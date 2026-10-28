import React, { useState, useMemo } from 'react';
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
import {
  getTurmasPorClasse,
  normalizarClasse,
  isSegundoCiclo,
  isPrimeiroCiclo,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  getSalaDaTurma,
  getCursoDaTurma
} from '../services/academicHierarchyService';
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [visualizacao, setVisualizacao] = useState<'frente' | 'verso' | 'ambos'>('ambos');
  const [dataValidade, setDataValidade] = useState<string>('2026-07-31');
  const [dataEmissao, setDataEmissao] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Painel de Configurações do Passe
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [passConfig, setPassConfig] = useState<ConfiguracaoPassesEscola>(() => {
    return escola.configuracaoPasses || dbService.obterConfiguracaoPasses(escola.id);
  });
  const [fotoPosicao, setFotoPosicao] = useState<'esquerda' | 'direita'>('esquerda');
  const [configSalvaSucesso, setConfigSalvaSucesso] = useState(false);

  const configSistema = dbService.getConfiguracaoSistema();

  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  const turmasDoFiltro = useMemo(() => {
    return selectedClasseFilter === 'TODAS'
      ? turmas
      : getTurmasPorClasse(turmas, selectedClasseFilter);
  }, [turmas, selectedClasseFilter]);

  // Filtragem dos Alunos para Geração dos Passes com Hierarquia e Proteção Anti-ReDoS
  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      const turma = turmas.find(t => t.id === aluno.turmaId);
      const classeNorm = turma ? normalizarClasse(turma.classe) : normalizarClasse(aluno.classeId);

      if (selectedClasseFilter !== 'TODAS' && classeNorm !== normalizarClasse(selectedClasseFilter)) {
        return false;
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
  }, [alunos, selectedTurmaId, selectedTurnoFilter, selectedClasseFilter, searchTerm, turmas]);

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
        'Nº': i + 1,
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

  const handlePrint = () => {
    window.print();
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
              onClick={handleBaixarHTML}
              className="px-3.5 py-2 text-xs font-bold text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Baixar arquivo dos passes em formato web offline"
            >
              <Download className="h-4 w-4 text-blue-700" />
              <span>Baixar Passes (.html)</span>
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

        {/* Linha de Filtros Hierárquicos: Classe -> Turma -> Sala -> Curso, Turno, Pesquisa, Visualização */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-xs border-t border-gray-100">
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
            <label className="block font-bold text-gray-700 mb-1">
              2. Filtrar por Turma {selectedClasseFilter !== 'TODAS' ? `(${selectedClasseFilter})` : ''}
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
            <label className="block font-bold text-gray-700 mb-1">3. Turno</label>
            <select
              value={selectedTurnoFilter}
              onChange={(e) => setSelectedTurnoFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white"
            >
              <option value="TODOS">Todos os Turnos</option>
              <option value="Manhã">Manhã (Matinal)</option>
              <option value="Tarde">Tarde (Vespertino)</option>
              <option value="Noite">Noite (Noturno)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">4. Face do Cartão</label>
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

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              5. Pesquisa ({alunosFiltrados.length} passes)
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearchInput(e.target.value, 80))}
                maxLength={80}
                placeholder="Nome, BI, Processo, Sala..."
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
      {/* GRADE DE 8 PASSES POR FOLHA A4 (LAYOUT EXATO DE IMPRESSÃO)               */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {alunosFiltrados.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
            Nenhum aluno encontrado para os critérios selecionados.
          </div>
        ) : (
          <div id="passes-print-grid" className="passes-sheet-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-2 print:gap-2">
            {alunosFiltrados.map((aluno) => {
              const turma = turmas.find(t => t.id === aluno.turmaId) || turmaExemplo;
              const anoLectivoNome = escola.anoLectivoActivo || '2025/2026';
              const numProcesso = aluno.numeroProcesso || aluno.codigoMatricula || '000/2025';

              return (
                <div 
                  key={aluno.id}
                  className="bg-white border-2 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between print:shadow-none print:break-inside-avoid print:border-black h-[225px] select-none text-black"
                  style={{ borderColor: passConfig.corPrimaria || '#1e3a8a' }}
                >
                  {/* FRENTE DO PASSE */}
                  {(visualizacao === 'frente' || visualizacao === 'ambos') && (
                    <div className="p-2.5 bg-white relative flex flex-col justify-between h-full">
                      {/* Topo Oficial com Brasão e Título */}
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
                          <p className="text-[6.5px] font-black uppercase text-gray-600 tracking-wider">
                            República de Angola • MED
                          </p>
                          <h4 
                            className="text-[8px] font-black uppercase truncate leading-tight"
                            style={{ color: passConfig.corPrimaria || '#1e3a8a' }}
                          >
                            {escola.nomeOficial}
                          </h4>
                          <span className="text-[6px] font-bold text-gray-500 block truncate">
                            {escola.governoProvincial || 'Governo Provincial'} • {escola.municipio || 'Angola'}
                          </span>
                        </div>

                        {isAtivo('logotipo') && (
                          <div className="h-6 w-6 flex items-center justify-center shrink-0">
                            {Boolean((escola.logotipoUrl || escola.logotipo)?.trim()) ? (
                              <img src={escola.logotipoUrl || escola.logotipo} alt="Logo" className="h-6 w-6 object-contain rounded" />
                            ) : (
                              <Award className="h-5 w-5" style={{ color: passConfig.corPrimaria }} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tarja Oficial com Cor Escolhida pela Escola */}
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

                      {/* Corpo do Cartão: Foto & Dados */}
                      <div className={`flex items-start gap-2 my-auto ${fotoPosicao === 'direita' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Foto do Aluno em formato 3x4 ampliado */}
                        {isAtivo('foto') && (
                          <div className="shrink-0 flex flex-col items-center">
                            {aluno.fotoUrl && aluno.fotoUrl.trim() !== '' ? (
                              <img 
                                src={aluno.fotoUrl} 
                                alt={aluno.nomeCompleto} 
                                className="h-20 w-16 rounded object-cover border-2 border-slate-700 shadow-2xs print:border-black"
                              />
                            ) : (
                              <div className="h-20 w-16 rounded border-2 border-slate-400 bg-slate-100 flex flex-col items-center justify-center text-[7.5px] text-gray-400 font-bold shadow-2xs print:border-black">
                                <User className="h-6 w-6 text-gray-300 mb-0.5" />
                                <span>FOTO 3x4</span>
                              </div>
                            )}
                            <span className="text-[6.5px] font-bold text-gray-500 mt-0.5 font-mono">
                              Nº {aluno.numeroOrdem || 1}
                            </span>
                          </div>
                        )}

                        {/* Dados Académicos e Pessoais do Aluno */}
                        <div className="flex-1 min-w-0 text-[8px] leading-tight space-y-0.5">
                          {isAtivo('nome') && (
                            <div className="font-black uppercase truncate text-gray-900 text-[8.5px]">
                              {aluno.nomeCompleto}
                            </div>
                          )}

                          {isAtivo('numeroProcesso') && (
                            <div className="text-gray-700 font-mono">
                              Proc. Nº: <strong className="text-gray-950">{numProcesso}</strong>
                            </div>
                          )}

                          {isAtivo('numeroBI') && (
                            <div className="text-gray-700 font-mono">
                              B.I. Nº: <strong className="text-gray-950">{aluno.numeroBI || '000000000LA000'}</strong>
                            </div>
                          )}

                          {isAtivo('classeTurma') && (
                            <div className="text-gray-700">
                              Classe/Turma: <strong>{aluno.classeId || turma?.classe} • {turma?.nome}</strong>
                            </div>
                          )}

                          {isAtivo('turno') && (
                            <div className="text-gray-700 truncate">
                              Turno: <strong>{turma?.turno || 'Manhã'}</strong> • Sala: {turma?.sala || '01'}
                            </div>
                          )}

                          {isAtivo('curso') && (aluno.curso || turma?.curso) && (
                            <div className="text-gray-600 truncate text-[7.5px]">
                              Curso: <strong>{aluno.curso || turma?.curso}</strong>
                            </div>
                          )}

                          {isAtivo('encarregado') && aluno.encarregadoNome && (
                            <div className="text-gray-600 truncate text-[7px]">
                              Enc.: {aluno.encarregadoNome}
                            </div>
                          )}
                        </div>

                        {/* QR Code de Validação Digital Oficial */}
                        {isAtivo('qrCode') && (
                          <div className="shrink-0 flex flex-col items-center">
                            <div className="h-10 w-10 bg-white border border-gray-300 p-0.5 flex items-center justify-center rounded">
                              <QrCode className="h-9 w-9 text-gray-900" />
                            </div>
                            <span className="text-[6px] font-bold text-gray-500 mt-0.5">MED Válido</span>
                          </div>
                        )}
                      </div>

                      {/* Rodapé Oficial: Validade, Código e Assinatura */}
                      <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[7px] text-gray-600">
                        {isAtivo('validade') && (
                          <div>
                            <span>Val: <strong>{dataValidade}</strong></span>
                          </div>
                        )}

                        {isAtivo('assinaturaDiretor') && (
                          <div className="flex flex-col items-center justify-end text-center min-w-[55px]">
                            {Boolean((passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl)?.trim()) ? (
                              <img
                                src={passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl}
                                alt="Assinatura"
                                className="h-5 w-auto max-w-[55px] object-contain mb-0.5"
                              />
                            ) : (
                              <div className="border-b border-gray-600 w-12 mb-0.5"></div>
                            )}
                            <span className="font-serif italic text-gray-800 text-[6.5px]">
                              {escola.diretorGeralNome ? `Dr. ${escola.diretorGeralNome.split(' ')[0]}` : 'A Direcção'}
                            </span>
                          </div>
                        )}

                        <div className="font-mono text-[6.5px] text-gray-400">
                          SGE-NG • AO
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VERSO DO PASSE (REGRAS E AVISOS) */}
                  {visualizacao === 'verso' && (
                    <div className="p-3 bg-gray-50 relative flex flex-col justify-between h-full text-[7.5px] leading-tight text-gray-700">
                      <div>
                        <div className="text-center font-black uppercase text-[8px] border-b pb-1 text-gray-900">
                          Regulamento de Uso do Cartão
                        </div>
                        <ul className="list-disc pl-3 pt-1.5 space-y-1">
                          {passConfig.regrasVerso.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[7px]">
                        <div>
                          <span>Emissão: <strong>{dataEmissao}</strong></span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">Direcção Municipal de Educação</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Paletas Oficiais MED Angola:</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { nome: 'Azul Real MED', prim: '#1e3a8a', sec: '#d97706' },
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
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (re) => {
                                const url = re.target?.result as string;
                                setPassConfig(prev => ({ ...prev, assinaturaDiretorUrl: url }));
                              };
                              reader.readAsDataURL(file);
                            }
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
                    className="w-[320px] h-[210px] bg-white border-2 rounded-xl p-2.5 shadow-md flex flex-col justify-between select-none"
                    style={{ borderColor: passConfig.corPrimaria || '#1e3a8a' }}
                  >
                    {/* Topo Oficial */}
                    <div className="border-b pb-1 flex items-center justify-between" style={{ borderColor: `${passConfig.corPrimaria}40` }}>
                      {isAtivo('insignia') && (
                        <div className="h-5 w-5 flex items-center justify-center shrink-0">
                          {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                            <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-5 w-5 object-contain" />
                          ) : (
                            <InsigniaAngola size={18} />
                          )}
                        </div>
                      )}

                      <div className="flex-1 text-center min-w-0 px-1">
                        <p className="text-[6.5px] font-black uppercase text-gray-600 tracking-wider">República de Angola • MED</p>
                        <h4 className="text-[8px] font-black uppercase truncate" style={{ color: passConfig.corPrimaria }}>
                          {escola.nomeOficial}
                        </h4>
                      </div>

                      {isAtivo('logotipo') && (
                        <div className="h-5 w-5 flex items-center justify-center shrink-0">
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
                        Cartão de Estudante • 2025/2026
                      </span>
                    </div>

                    {/* Corpo */}
                    <div className={`flex items-start gap-2 my-auto ${fotoPosicao === 'direita' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {isAtivo('foto') && (
                        alunoExemplo.fotoUrl && alunoExemplo.fotoUrl.trim() !== '' ? (
                          <img 
                            src={alunoExemplo.fotoUrl} 
                            alt="Foto" 
                            className="h-20 w-16 rounded object-cover border-2 border-slate-700 shadow-2xs"
                          />
                        ) : (
                          <div className="h-20 w-16 rounded border-2 border-slate-400 bg-slate-100 flex flex-col items-center justify-center text-[7.5px] text-gray-400 font-bold shadow-2xs">
                            <User className="h-6 w-6 text-gray-300 mb-0.5" />
                            <span>FOTO 3x4</span>
                          </div>
                        )
                      )}

                      <div className="flex-1 min-w-0 text-[8px] leading-tight space-y-0.5">
                        {isAtivo('nome') && <div className="font-black uppercase truncate text-gray-900">{alunoExemplo.nomeCompleto}</div>}
                        {isAtivo('numeroProcesso') && <div className="text-gray-700 font-mono">Proc: <strong>{alunoExemplo.numeroProcesso}</strong></div>}
                        {isAtivo('numeroBI') && <div className="text-gray-700 font-mono">BI: <strong>{alunoExemplo.numeroBI}</strong></div>}
                        {isAtivo('classeTurma') && <div className="text-gray-700">Classe/Turma: <strong>10ª • Turma A</strong></div>}
                        {isAtivo('turno') && <div className="text-gray-700">Turno: <strong>Manhã</strong> • Sala: 01</div>}
                        {isAtivo('encarregado') && <div className="text-gray-600 truncate text-[7px]">Enc: {alunoExemplo.encarregadoNome}</div>}
                      </div>

                      {isAtivo('qrCode') && (
                        <div className="shrink-0 flex flex-col items-center">
                          <QrCode className="h-8 w-8 text-gray-900" />
                          <span className="text-[5.5px] font-bold text-gray-500">Validação</span>
                        </div>
                      )}
                    </div>

                    {/* Rodapé */}
                    <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[7px] text-gray-600">
                      {isAtivo('validade') && <span>Val: <strong>{dataValidade}</strong></span>}
                      {isAtivo('assinaturaDiretor') && (
                        <div className="flex flex-col items-center">
                          {Boolean((passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl)?.trim()) ? (
                            <img
                              src={passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl}
                              alt="Assinatura"
                              className="h-4 w-auto max-w-[50px] object-contain"
                            />
                          ) : (
                            <span className="font-serif italic text-gray-800">A Direcção</span>
                          )}
                        </div>
                      )}
                      <span className="font-mono text-[6px]">SGE-NG • AO</span>
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
