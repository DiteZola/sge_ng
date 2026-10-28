import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  ClipboardList, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Calendar, 
  Clock, 
  Users, 
  Building2, 
  ShieldCheck, 
  FileText, 
  Edit2, 
  Trash2, 
  Check, 
  Search,
  Filter,
  Award,
  Calculator,
  Save,
  ToggleLeft,
  ToggleRight,
  Settings,
  Info
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  Funcionario, 
  Aluno, 
  TermoExame, 
  EpocaExame, 
  AlunoNotaTermoExame,
  RegraMediaFinalClasse
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument, downloadExcelFile, downloadElementAsPdf } from '../utils/curriculoAngola';
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
  getDisciplinasDaTurma
} from '../services/academicHierarchyService';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';

interface ExamTermsViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  disciplinas: Disciplina[];
  alunos: Aluno[];
  funcionarios: Funcionario[];
}

export const ExamTermsView: React.FC<ExamTermsViewProps> = ({
  escola,
  currentUser,
  turmas,
  disciplinas,
  alunos,
  funcionarios
}) => {
  const configSistema = dbService.getConfiguracaoSistema();
  const [termos, setTermos] = useState<TermoExame[]>(() => dbService.getTermosExame(escola.id));

  // Subabas: 'termos' (lista de documentos emitidos), 'novo' (gerar/editar termo), 'configuracoes' (regras de exame)
  const [subAba, setSubAba] = useState<'termos' | 'novo' | 'configuracoes'>('termos');
  const [termoVisualizacao, setTermoVisualizacao] = useState<TermoExame | null>(() => termos[0] || null);

  // Filtros
  const [filtroEpoca, setFiltroEpoca] = useState<string>('todas');
  const [filtroClasse, setFiltroClasse] = useState<string>('todas');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  // Notificações
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Estados do Formulário de Novo/Edição de Termo de Exame com Hierarquia Acadêmica
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEpoca, setFormEpoca] = useState<EpocaExame>('Ordinaria');
  const [formClasse, setFormClasse] = useState<string>(() => {
    return turmas[0]?.classe ? normalizarClasse(turmas[0].classe) : '9ª';
  });
  const [formTurmaId, setFormTurmaId] = useState<string>(turmas[0]?.id || '');
  const [formDisciplinaId, setFormDisciplinaId] = useState<string>(disciplinas[0]?.id || '');
  const [formDataExame, setFormDataExame] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formHoraInicio, setFormHoraInicio] = useState<string>('08:00');
  const [formSalaExame, setFormSalaExame] = useState<string>(() => getSalaDaTurma(turmas[0]));
  const [formPresidenteId, setFormPresidenteId] = useState<string>('');
  const [formSecretarioId, setFormSecretarioId] = useState<string>('');
  const [formVigilantes, setFormVigilantes] = useState<string>('');
  const [formPesoMF, setFormPesoMF] = useState<number>(0.6); // 60% MF
  const [formPesoExame, setFormPesoExame] = useState<number>(0.4); // 40% Prova Escrita
  const [formObservacoes, setFormObservacoes] = useState<string>('');

  // Tabela temporária de notas do exame para o formulário
  const [notasAlunosForm, setNotasAlunosForm] = useState<AlunoNotaTermoExame[]>([]);

  // Configurações Oficiais de Avaliação, NPP e Exames MED (Diretor Geral / Admin Geral)
  const [configNppAtivo, setConfigNppAtivo] = useState<boolean>(() => escola.nppAtivo ?? true);
  const [configFormulaTrimestralSemNpp, setConfigFormulaTrimestralSemNpp] = useState<'SIMPLES' | 'PONDERADA_NPT_MAIOR'>('SIMPLES');

  // Normas para Classes de Transição (Iniciação à 5ª, 7ª, 8ª, 10ª, 11ª)
  const [configNotaMinAprovacaoTransicao, setConfigNotaMinAprovacaoTransicao] = useState<number>(10);
  const [configMaxNegativasRecurso, setConfigMaxNegativasRecurso] = useState<number>(2);

  // Normas para Classes Finais de Nível com Exame (6ª, 9ª, 12ª e 13ª Classes)
  const [configNotaMinAdmissao, setConfigNotaMinAdmissao] = useState<number>(() => {
    const regFinal = escola.regrasMediaFinal?.find(r => r.classe === 'Final' || r.classe === '12ª' || r.classe === '9ª');
    return regFinal?.notaMinimaExame ?? 7;
  });
  const [configNotaDispensa, setConfigNotaDispensa] = useState<number>(() => {
    const regFinal = escola.regrasMediaFinal?.find(r => r.classe === 'Final' || r.classe === '12ª' || r.classe === '9ª');
    return regFinal?.notaDispensarExame ?? 14;
  });
  const [configPesoPadraoMF, setConfigPesoPadraoMF] = useState<number>(() => {
    const regFinal = escola.regrasMediaFinal?.find(r => r.classe === 'Final' || r.classe === '12ª' || r.classe === '9ª');
    return regFinal?.pesoMF ?? 0.6;
  });
  const [configPesoPadraoPE, setConfigPesoPadraoPE] = useState<number>(() => {
    const regFinal = escola.regrasMediaFinal?.find(r => r.classe === 'Final' || r.classe === '12ª' || r.classe === '9ª');
    return regFinal?.pesoExame ?? 0.4;
  });
  const [configArredondamento, setConfigArredondamento] = useState<'PADRAO_MED' | 'DECIMAL'>('PADRAO_MED');
  const [salvandoConfig, setSalvandoConfig] = useState<boolean>(false);

  // Estados do Simulador de Fórmulas Interativo
  const [simuladorModo, setSimuladorModo] = useState<'transicao' | 'final_exame'>('final_exame');
  const [simMac1, setSimMac1] = useState<number>(12);
  const [simNpp1, setSimNpp1] = useState<number>(11);
  const [simNpt1, setSimNpt1] = useState<number>(13);
  const [simMac2, setSimMac2] = useState<number>(10);
  const [simNpp2, setSimNpp2] = useState<number>(12);
  const [simNpt2, setSimNpt2] = useState<number>(11);
  const [simMac3, setSimMac3] = useState<number>(14);
  const [simNpp3, setSimNpp3] = useState<number>(13);
  const [simNpt3, setSimNpt3] = useState<number>(15);
  const [simNotaExame, setSimNotaExame] = useState<number>(12);
  const [notasInvalidasExame, setNotasInvalidasExame] = useState<Record<string, string>>({});

  const podeConfigurar = ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(currentUser.role);

  const handleSalvarConfiguracoes = () => {
    if (!podeConfigurar) {
      alert('Apenas o Administrador Geral ou a Direção da Escola têm permissão para alterar as normas de cálculo de exame.');
      return;
    }

    setSalvandoConfig(true);
    const regrasMediaFinalAtualizadas: RegraMediaFinalClasse[] = [
      {
        classe: 'Transição',
        tipoCalculo: 'ARITMETICA_SIMPLES',
        notaMinimaExame: configNotaMinAprovacaoTransicao,
        arredondamento: configArredondamento
      },
      {
        classe: 'Final',
        tipoCalculo: 'COM_EXAME_MED',
        pesoMF: configPesoPadraoMF,
        pesoExame: configPesoPadraoPE,
        notaMinimaExame: configNotaMinAdmissao,
        notaDispensarExame: configNotaDispensa,
        arredondamento: configArredondamento
      }
    ];

    const escolaAtualizada: Escola = {
      ...escola,
      nppAtivo: configNppAtivo,
      regrasMediaFinal: regrasMediaFinalAtualizadas
    };

    dbService.salvarEscola(escolaAtualizada);
    setTimeout(() => {
      setSalvandoConfig(false);
      setSucessoMsg('Normas oficiais de cálculo de médias e configuração da NPP salvas no sistema com sucesso!');
      setTimeout(() => setSucessoMsg(null), 4500);
    }, 400);
  };

  const turmasDoForm = useMemo(() => {
    const list = getTurmasPorClasse(turmas, formClasse);
    return list.length > 0 ? list : turmas;
  }, [turmas, formClasse]);

  const turmaSelecionada = useMemo(() => {
    return turmas.find(t => t.id === formTurmaId) || turmasDoForm[0] || turmas[0];
  }, [turmas, turmasDoForm, formTurmaId]);

  const disciplinasDoForm = useMemo(() => {
    return getDisciplinasDaTurma(disciplinas, turmaSelecionada);
  }, [disciplinas, turmaSelecionada]);

  const disciplinaSelecionada = useMemo(() => {
    return disciplinasDoForm.find(d => d.id === formDisciplinaId) || disciplinasDoForm[0] || disciplinas[0];
  }, [disciplinasDoForm, formDisciplinaId, disciplinas]);

  // Carregar alunos da turma selecionada quando mudar a turma no formulário
  const inicializarAlunosParaExame = (turmaId: string, discId: string, pesoMF: number, pesoExame: number) => {
    const alunosDaTurma = alunos.filter(a => a.turmaId === turmaId && a.estado === 'Ativo');
    const notasCons = dbService.getNotasConsolidadas();

    const listaInicial: AlunoNotaTermoExame[] = alunosDaTurma.map(al => {
      // Calcular média de frequência (MF) do aluno nesta disciplina
      const notasAluno = notasCons.filter(n => n.alunoId === al.id && n.disciplinaId === discId);
      let mf = 0;
      if (notasAluno.length > 0) {
        const soma = notasAluno.reduce((acc, curr) => acc + (curr.notaFinal || curr.mediaTrimestral || 0), 0);
        mf = Number((soma / notasAluno.length).toFixed(1));
      }

      const notaPE = 0;
      const mediaFinal = mf > 0 || notaPE > 0 ? Math.round((mf * pesoMF) + (notaPE * pesoExame)) : 0;
      const res: 'Aprovado' | 'Não Aprovado' | 'Recurso' = mediaFinal >= 10 ? 'Aprovado' : mediaFinal >= 7 ? 'Recurso' : 'Não Aprovado';

      return {
        alunoId: al.id,
        nomeCompleto: al.nomeCompleto,
        numeroProcesso: al.numeroProcesso || al.codigoMatricula,
        mediaFrequencia: mf,
        notaExameEscrito: notaPE,
        mediaFinal,
        resultado: res
      };
    });

    setNotasAlunosForm(listaInicial);
  };

  const handleTurmaOuDiscChange = (novaTurmaId: string, novaDiscId: string) => {
    setFormTurmaId(novaTurmaId);
    setFormDisciplinaId(novaDiscId);
    inicializarAlunosParaExame(novaTurmaId, novaDiscId, formPesoMF, formPesoExame);
  };

  const handleNotaPEChange = (alunoId: string, novaNotaPE: number) => {
    const turmaDoForm = turmas.find(t => t.id === formTurmaId);
    const ehPrimario = turmaDoForm ? (turmaDoForm.nivelEnsino === 'Primario' || ['Iniciação', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª'].some(c => turmaDoForm.classe.includes(c))) : false;
    const maxEscala = ehPrimario ? 10 : 20;

    if (isNaN(novaNotaPE) || novaNotaPE < 0 || novaNotaPE > maxEscala) {
      setNotasInvalidasExame(prev => ({
        ...prev,
        [alunoId]: `Nota inválida (${novaNotaPE})! Escala máxima permitida: 0 a ${maxEscala}.`
      }));
    } else {
      setNotasInvalidasExame(prev => {
        const copy = { ...prev };
        delete copy[alunoId];
        return copy;
      });
    }

    setNotasAlunosForm(prev => prev.map(item => {
      if (item.alunoId !== alunoId) return item;
      const pe = novaNotaPE;
      const mf = item.mediaFrequencia;
      const finalCalc = (mf * formPesoMF) + (pe * formPesoExame);
      const mediaFinal = configArredondamento === 'PADRAO_MED' ? Math.round(finalCalc) : Number(finalCalc.toFixed(1));
      const notaAprovacao = ehPrimario ? 5 : 10;
      const notaRecurso = ehPrimario ? 4 : 7;
      const res: 'Aprovado' | 'Não Aprovado' | 'Recurso' = mediaFinal >= notaAprovacao ? 'Aprovado' : mediaFinal >= notaRecurso ? 'Recurso' : 'Não Aprovado';

      return {
        ...item,
        notaExameEscrito: pe,
        mediaFinal,
        resultado: res
      };
    }));
  };

  const handleSalvarTermo = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(notasInvalidasExame).length > 0) {
      alert(`Não é possível guardar o Termo de Exame! Existem ${Object.keys(notasInvalidasExame).length} nota(s) com valor fora do intervalo oficial. Corrija os campos assinalados a vermelho escuro.`);
      return;
    }
    const pres = funcionarios.find(f => f.id === formPresidenteId);
    const sec = funcionarios.find(f => f.id === formSecretarioId);

    const novoTermo: TermoExame = {
      id: editandoId || `termo_${Date.now()}`,
      escolaId: escola.id,
      anoLectivo: escola.anoLectivoActivo || '2025/2026',
      epoca: formEpoca,
      classe: turmaSelecionada?.classe || '9ª',
      turmaId: formTurmaId,
      disciplinaId: formDisciplinaId,
      disciplinaNome: disciplinaSelecionada?.nome || 'Disciplina',
      dataExame: formDataExame,
      horaInicio: formHoraInicio,
      salaExame: formSalaExame,
      presidenteJuriNome: pres?.nomeCompleto || escola.diretorGeralNome || 'Presidente do Júri',
      secretarioJuriNome: sec?.nomeCompleto || 'Secretário do Júri',
      vigilantesNomes: formVigilantes.split(',').map(s => s.trim()).filter(Boolean),
      pesoMF: formPesoMF,
      pesoExame: formPesoExame,
      alunosNotas: notasAlunosForm,
      homologado: true,
      homologadoPor: `${currentUser.nomeCompleto} (${currentUser.role})`,
      homologadoEm: new Date().toISOString(),
      observacoes: formObservacoes
    };

    dbService.salvarTermoExame(novoTermo);
    const atualizados = dbService.getTermosExame(escola.id);
    setTermos(atualizados);
    setTermoVisualizacao(novoTermo);
    setSubAba('termos');
    setEditandoId(null);
    setSucessoMsg(`Termo de Exame da disciplina "${novoTermo.disciplinaNome}" homologado com sucesso!`);
    setTimeout(() => setSucessoMsg(null), 4000);
  };

  const handleAbrirEditar = (t: TermoExame) => {
    setEditandoId(t.id);
    setFormEpoca(t.epoca);
    setFormClasse(normalizarClasse(t.classe));
    setFormTurmaId(t.turmaId);
    setFormDisciplinaId(t.disciplinaId);
    setFormDataExame(t.dataExame);
    setFormHoraInicio(t.horaInicio || '08:00');
    setFormSalaExame(t.salaExame || 'Sala 01');
    setFormPesoMF(t.pesoMF || 0.6);
    setFormPesoExame(t.pesoExame || 0.4);
    setFormVigilantes((t.vigilantesNomes || []).join(', '));
    setFormObservacoes(t.observacoes || '');
    setNotasAlunosForm(t.alunosNotas);
    setSubAba('novo');
  };

  const handleEliminarTermo = (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este Termo Oficial de Exame?')) return;
    dbService.excluirTermoExame(id);
    const atualizados = dbService.getTermosExame(escola.id);
    setTermos(atualizados);
    if (termoVisualizacao?.id === id) {
      setTermoVisualizacao(atualizados[0] || null);
    }
    setSucessoMsg('Termo de Exame removido.');
    setTimeout(() => setSucessoMsg(null), 3000);
  };

  // Exportar Termo de Exame em Excel
  const handleExportarExcel = (t: TermoExame) => {
    const dados = t.alunosNotas.map((item, idx) => ({
      'Nº Ordem': idx + 1,
      'Nº Processo': item.numeroProcesso,
      'Nome Completo do Estudante': item.nomeCompleto,
      'Média de Frequência (MF)': item.mediaFrequencia,
      'Ponderação MF': `${Math.round(t.pesoMF * 100)}%`,
      'Nota Prova Escrita (PE)': item.notaExameEscrito,
      'Ponderação Exame': `${Math.round(t.pesoExame * 100)}%`,
      'Média Final do Exame': item.mediaFinal,
      'Resultado': item.resultado
    }));

    downloadExcelFile(
      `Termo_Exame_${t.disciplinaNome.replace(/\s+/g, '_')}`,
      dados,
      `Termo_Exame_${t.classe}_${t.disciplinaNome}_${t.epoca}.xlsx`
    );
  };

  // Exportar HTML do Termo
  const handleExportarHTML = (t: TermoExame) => {
    const el = document.getElementById('termo-exame-imprimir');
    if (!el) return;
    const nomeBase = `TERMO_EXAME_${t.classe}_${t.disciplinaNome.replace(/\s+/g, '_')}_${t.epoca}`;
    downloadHtmlDocument(nomeBase, `Termo de Exame - ${t.disciplinaNome}`, el.outerHTML);
  };

  // Filtragem dos termos com hierarquia acadêmica e sanitização
  const termosFiltrados = useMemo(() => {
    return termos.filter(t => {
      if (filtroEpoca !== 'todas' && t.epoca !== filtroEpoca) return false;
      if (filtroClasse !== 'todas' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroTurma !== 'todas' && t.turmaId !== filtroTurma) return false;
      if (buscaTexto.trim()) {
        const matchDisc = safeSearchMatch(t.disciplinaNome, buscaTexto);
        const matchClasse = safeSearchMatch(t.classe, buscaTexto);
        const matchSala = safeSearchMatch(t.salaExame, buscaTexto);
        if (!matchDisc && !matchClasse && !matchSala) return false;
      }
      return true;
    });
  }, [termos, filtroEpoca, filtroClasse, filtroTurma, buscaTexto]);

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {sucessoMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* Cabeçalho Principal do Módulo de Termos de Exame */}
      <div className="bg-white border-2 border-indigo-700 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-full">
              Normas Regulamentares MED Angola
            </span>
            <span className="text-xs text-gray-500">• Épocas Ordinárias, Recurso e Especiais</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-indigo-700" />
            <span>Gestão Oficial de Termos de Exame</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Homologação das pautas de prova de exame, atas de júri examinador, cálculo ponderado de médias finais e impressões oficiais.
          </p>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditandoId(null);
              inicializarAlunosParaExame(formTurmaId, formDisciplinaId, formPesoMF, formPesoExame);
              setSubAba('novo');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Termo de Exame</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba('configuracoes')}
            className={`px-3.5 py-2 border rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
              subAba === 'configuracoes'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Configurações do Exame</span>
          </button>
        </div>
      </div>

      {/* Navegador de Subabas */}
      <div className="flex border-b border-gray-200 space-x-6 text-xs font-bold no-print">
        <button
          type="button"
          onClick={() => setSubAba('termos')}
          className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors cursor-pointer ${
            subAba === 'termos'
              ? 'border-indigo-600 text-indigo-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Termos Homologados ({termos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!editandoId) {
              inicializarAlunosParaExame(formTurmaId, formDisciplinaId, formPesoMF, formPesoExame);
            }
            setSubAba('novo');
          }}
          className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors cursor-pointer ${
            subAba === 'novo'
              ? 'border-indigo-600 text-indigo-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{editandoId ? 'Editar Termo de Exame' : 'Gerar Termo de Exame'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubAba('configuracoes')}
          className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors cursor-pointer ${
            subAba === 'configuracoes'
              ? 'border-indigo-600 text-indigo-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configurações & Ponderações MED</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBABA: LISTA E VISUALIZADOR DE TERMOS DE EXAME                         */}
      {/* ========================================================================= */}
      {subAba === 'termos' && (
        <div className="space-y-6">
          {/* Barra de Filtros e Pesquisa com Hierarquia Classe -> Turma */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(sanitizeSearchInput(e.target.value, 80))}
                  maxLength={80}
                  placeholder="Pesquisar termo, disciplina, sala ou classe..."
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={filtroEpoca}
                  onChange={(e) => setFiltroEpoca(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="todas">Todas as Épocas</option>
                  <option value="Ordinaria">Época Ordinária (1ª Época)</option>
                  <option value="Recurso">Época de Recurso (2ª Época)</option>
                  <option value="Especial">Época Especial</option>
                  <option value="Equivalencia">Exame de Equivalência</option>
                </select>
              </div>

              <div>
                <select
                  value={filtroClasse}
                  onChange={(e) => {
                    setFiltroClasse(e.target.value);
                    setFiltroTurma('todas');
                  }}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="todas">Todas as Classes</option>
                  {todasClasses.map(c => (
                    <option key={`flt-ex-c-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="todas">
                    {filtroClasse !== 'todas' ? `Todas as Turmas da ${filtroClasse}` : 'Todas as Turmas'}
                  </option>
                  {(filtroClasse === 'todas' ? turmas : getTurmasPorClasse(turmas, filtroClasse)).map(t => (
                    <option key={t.id} value={t.id}>{t.nome} ({t.sala || 'Sala'})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seletor Rápido de Termo */}
          <div className="flex flex-wrap gap-2 no-print">
            {termosFiltrados.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTermoVisualizacao(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  termoVisualizacao?.id === t.id
                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-2xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span>{t.disciplinaNome}</span>
                <span className="text-[10px] opacity-75 font-mono">({t.classe} • {t.epoca})</span>
              </button>
            ))}
          </div>

          {/* Visualizador do Termo Selecionado */}
          {termoVisualizacao ? (
            <div className="space-y-4">
              {/* Barra de Ações do Documento (no-print) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl no-print">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-gray-800">
                    Termo: <strong>{termoVisualizacao.disciplinaNome}</strong> ({termoVisualizacao.classe} - {termoVisualizacao.epoca})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Homologado
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAbrirEditar(termoVisualizacao)}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Editar Termo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportarExcel(termoVisualizacao)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Baixar Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportarHTML(termoVisualizacao)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-700" />
                    <span>Baixar HTML</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const el = document.getElementById('termo-exame-imprimir');
                      if (el) {
                        await downloadElementAsPdf(
                          el,
                          `Termo_Exame_${termoVisualizacao.classe}_${termoVisualizacao.disciplinaNome.replace(/\s+/g, '_')}_${termoVisualizacao.epoca}`,
                          { orientation: 'landscape' }
                        );
                      }
                    }}
                    className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    title="Transferir documento oficial em formato PDF (.pdf)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar em PDF (.pdf)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEliminarTermo(termoVisualizacao.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg cursor-pointer"
                    title="Eliminar este termo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DOCUMENTO OFICIAL PARA IMPRESSÃO FORMATADA */}
              <div 
                id="termo-exame-imprimir"
                className="bg-white border-2 border-black rounded-xl p-8 shadow-md text-black print:border-none print:p-0 space-y-6"
              >
                {/* Cabeçalho Oficial MED Angola */}
                <div className="text-center space-y-1 border-b-2 border-black pb-3">
                  <div className="flex justify-center mb-1">
                    {configSistema.insigniaNacionalUrl && configSistema.insigniaNacionalUrl.trim() !== '' ? (
                      <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-16 w-16 object-contain mx-auto" />
                    ) : (
                      <InsigniaAngola size={56} />
                    )}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                  <p className="text-[11px] font-bold uppercase text-gray-800">{escola.governoProvincial || 'GOVERNO PROVINCIAL'}</p>
                  <p className="text-[11px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
                  <h2 className="text-base font-black uppercase text-gray-950 pt-1">{escola.nomeOficial}</h2>
                  <div className="pt-2">
                    <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-indigo-50">
                      TERMO OFICIAL DE EXAME — ÉPOCA {termoVisualizacao.epoca.toUpperCase()} • ANO LECTIVO {termoVisualizacao.anoLectivo}
                    </span>
                  </div>
                </div>

                {/* Dados da Sessão de Exame */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 border border-black rounded text-xs">
                  <div>
                    <span className="text-gray-600 block">Disciplina:</span>
                    <strong className="text-sm uppercase">{termoVisualizacao.disciplinaNome}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Classe / Ano:</span>
                    <strong>{termoVisualizacao.classe}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Data e Hora:</span>
                    <strong>{termoVisualizacao.dataExame.split('-').reverse().join('/')} às {termoVisualizacao.horaInicio}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Sala de Exame:</span>
                    <strong>{termoVisualizacao.salaExame}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-600 block">Fórmula de Ponderação Oficial:</span>
                    <strong>
                      MDF = ({Math.round(termoVisualizacao.pesoMF * 100)}% × MF) + ({Math.round(termoVisualizacao.pesoExame * 100)}% × PE)
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-600 block">Presidente do Júri:</span>
                    <strong>{termoVisualizacao.presidenteJuriNome}</strong>
                  </div>
                </div>

                {/* Pauta do Exame com Notas e Resultados */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-black text-left">
                    <thead className="bg-gray-100 font-bold border-b-2 border-black text-center text-[10px]">
                      <tr>
                        <th className="p-1.5 border-r border-black w-10">Nº</th>
                        <th className="p-1.5 border-r border-black w-24">Nº Proc.</th>
                        <th className="p-1.5 border-r border-black text-left">Nome Completo do Estudante</th>
                        <th className="p-1.5 border-r border-black w-16" title="Média de Frequência">MF ({Math.round(termoVisualizacao.pesoMF * 100)}%)</th>
                        <th className="p-1.5 border-r border-black w-16" title="Nota da Prova de Exame Escrita">PE ({Math.round(termoVisualizacao.pesoExame * 100)}%)</th>
                        <th className="p-1.5 border-r border-black w-16 bg-gray-200" title="Média Final do Exame">M. Final</th>
                        <th className="p-1.5 w-28">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {termoVisualizacao.alunosNotas.map((item, idx) => (
                        <tr key={item.alunoId} className="hover:bg-gray-50">
                          <td className="p-1.5 border-r border-black text-center font-mono">{idx + 1}</td>
                          <td className="p-1.5 border-r border-black text-center font-mono">{item.numeroProcesso}</td>
                          <td className="p-1.5 border-r border-black font-bold uppercase">{item.nomeCompleto}</td>
                          <td className="p-1.5 border-r border-black text-center font-mono">{item.mediaFrequencia}</td>
                          <td className="p-1.5 border-r border-black text-center font-mono font-bold">{item.notaExameEscrito}</td>
                          <td className="p-1.5 border-r border-black text-center font-mono font-black bg-gray-50">{item.mediaFinal}</td>
                          <td className="p-1.5 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              item.resultado === 'Aprovado' 
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                : item.resultado === 'Recurso' 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                  : 'bg-red-100 text-red-900 border border-red-300'
                            }`}>
                              {item.resultado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumo Estatístico do Exame */}
                <div className="flex flex-wrap items-center justify-between text-xs p-3 bg-gray-50 border border-black rounded">
                  <div>
                    <span>Total de Estudantes Avaliados: <strong>{termoVisualizacao.alunosNotas.length}</strong></span>
                  </div>
                  <div className="space-x-4">
                    <span className="text-emerald-800">
                      Aprovados: <strong>{termoVisualizacao.alunosNotas.filter(a => a.resultado === 'Aprovado').length}</strong>
                    </span>
                    <span className="text-amber-800">
                      Recurso: <strong>{termoVisualizacao.alunosNotas.filter(a => a.resultado === 'Recurso').length}</strong>
                    </span>
                    <span className="text-red-700">
                      Não Aprovados: <strong>{termoVisualizacao.alunosNotas.filter(a => a.resultado === 'Não Aprovado').length}</strong>
                    </span>
                  </div>
                </div>

                {/* Assinaturas Oficiais com Chancela do Director Geral */}
                <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs border-t-2 border-black">
                  {/* Secretário do Júri */}
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 uppercase text-[11px]">O Secretário do Júri</p>
                    <div className="w-44 border-b border-black mx-auto my-2" />
                    <p className="font-semibold text-gray-800">{termoVisualizacao.secretarioJuriNome}</p>
                  </div>

                  {/* Presidente do Júri */}
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 uppercase text-[11px]">O Presidente do Júri</p>
                    <div className="w-44 border-b border-black mx-auto my-2" />
                    <p className="font-semibold text-gray-800">{termoVisualizacao.presidenteJuriNome}</p>
                  </div>

                  {/* Director Geral da Instituição */}
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 uppercase text-[11px]">O Director Geral</p>
                    <div className="h-10 flex items-center justify-center">
                      {Boolean((escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl)?.trim()) ? (
                        <img 
                          src={escola.assinaturaDiretorUrl || escola.configuracaoPasses?.assinaturaDiretorUrl} 
                          alt="Assinatura Director" 
                          className="max-h-9 object-contain mx-auto" 
                        />
                      ) : (
                        <span className="text-[9px] text-gray-400 italic">[Chancela da Direcção]</span>
                      )}
                    </div>
                    <div className="w-44 border-b border-black mx-auto my-1" />
                    <p className="font-semibold text-gray-800">{escola.diretorGeralNome || 'Não Atribuído'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-500 space-y-3">
              <ClipboardList className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-sm font-semibold">Nenhum termo de exame homologado encontrado com os filtros atuais.</p>
              <button
                type="button"
                onClick={() => setSubAba('novo')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Gerar Novo Termo de Exame
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUBABA: FORMULÁRIO DE GERAÇÃO / EDIÇÃO DE TERMO DE EXAME               */}
      {/* ========================================================================= */}
      {subAba === 'novo' && (
        <form onSubmit={handleSalvarTermo} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900">
                {editandoId ? 'Edição de Termo Oficial de Exame' : 'Geração de Novo Termo Oficial de Exame'}
              </h3>
              <p className="text-xs text-gray-500">
                Atribuição de júri examinador, sala e lançamento das notas dos estudantes.
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg font-bold">
              Ano {escola.anoLectivoActivo}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="font-bold text-gray-700 block mb-1">1. Época do Exame *</label>
              <select
                value={formEpoca}
                onChange={(e) => setFormEpoca(e.target.value as EpocaExame)}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                <option value="Ordinaria">Época Ordinária (1ª Época)</option>
                <option value="Recurso">Época de Recurso (2ª Época)</option>
                <option value="Especial">Época Especial</option>
                <option value="Equivalencia">Exame de Equivalência</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">2. Classe Curricular *</label>
              <select
                value={formClasse}
                onChange={(e) => {
                  const novaCl = e.target.value;
                  setFormClasse(novaCl);
                  const validas = getTurmasPorClasse(turmas, novaCl);
                  if (validas.length > 0) {
                    const novaT = validas[0];
                    setFormTurmaId(novaT.id);
                    setFormSalaExame(getSalaDaTurma(novaT));
                    const discs = getDisciplinasDaTurma(disciplinas, novaT);
                    const novaD = discs[0]?.id || disciplinas[0]?.id || '';
                    setFormDisciplinaId(novaD);
                    inicializarAlunosParaExame(novaT.id, novaD, formPesoMF, formPesoExame);
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {todasClasses.map(c => (
                  <option key={`form-ex-c-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">
                3. Turma Abrangida * ({turmasDoForm.length} na {formClasse})
              </label>
              <select
                value={formTurmaId}
                onChange={(e) => {
                  const tId = e.target.value;
                  const t = turmas.find(tm => tm.id === tId);
                  if (t) {
                    setFormSalaExame(getSalaDaTurma(t));
                  }
                  handleTurmaOuDiscChange(tId, formDisciplinaId);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {turmasDoForm.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-gray-700">4. Disciplina do Exame *</label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                  {disciplinasDoForm.length} da {turmaSelecionada?.classe}
                </span>
              </div>
              <select
                value={formDisciplinaId}
                onChange={(e) => handleTurmaOuDiscChange(formTurmaId, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {disciplinasDoForm.map(d => (
                  <option key={d.id} value={d.id}>{d.nome} ({d.sigla})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Data da Prova *</label>
              <input
                type="date"
                required
                value={formDataExame}
                onChange={(e) => setFormDataExame(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Hora de Início</label>
              <input
                type="time"
                value={formHoraInicio}
                onChange={(e) => setFormHoraInicio(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Sala de Exame</label>
              <input
                type="text"
                value={formSalaExame}
                onChange={(e) => setFormSalaExame(e.target.value)}
                placeholder="Ex: Sala 04 ou Anfiteatro"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Presidente do Júri *</label>
              <select
                value={formPresidenteId}
                onChange={(e) => setFormPresidenteId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                <option value="">{escola.diretorGeralNome || 'Director Geral'}</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Secretário do Júri *</label>
              <select
                value={formSecretarioId}
                onChange={(e) => setFormSecretarioId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                <option value="">{escola.subdiretorPedagogicoNome || 'Subdirector Pedagógico'}</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ponderação das Notas */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-indigo-950 block mb-1">Ponderação Média Frequência (MF)</label>
              <select
                value={formPesoMF}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setFormPesoMF(p);
                  setFormPesoExame(Number((1 - p).toFixed(2)));
                }}
                className="w-full p-2 bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900"
              >
                <option value={0.6}>60% Média de Frequência (Padrão MED)</option>
                <option value={0.5}>50% Média de Frequência</option>
                <option value={0.7}>70% Média de Frequência</option>
                <option value={0.4}>40% Média de Frequência</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-indigo-950 block mb-1">Ponderação Prova de Exame (PE)</label>
              <div className="p-2 bg-white border border-indigo-300 rounded-lg font-bold text-indigo-900 font-mono">
                {Math.round(formPesoExame * 100)}% Prova Escrita
              </div>
            </div>

            <div>
              <label className="font-bold text-indigo-950 block mb-1">Vigilantes / Corretores</label>
              <input
                type="text"
                value={formVigilantes}
                onChange={(e) => setFormVigilantes(e.target.value)}
                placeholder="Nomes separados por vírgula"
                className="w-full p-2 bg-white border border-indigo-300 rounded-lg"
              />
            </div>
          </div>

          {/* Tabela de Lançamento de Notas dos Alunos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-gray-900 uppercase text-xs">
                Pauta de Alunos e Notas do Exame ({notasAlunosForm.length} Alunos)
              </h4>
              <span className="text-[11px] text-gray-500">
                Insira a nota da prova escrita (PE) de 0 a 20 valores
              </span>
            </div>

            <div className="border border-gray-300 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 font-bold border-b border-gray-300 text-center sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-10">Nº</th>
                    <th className="p-2 w-28">Nº Processo</th>
                    <th className="p-2 text-left">Nome Completo do Estudante</th>
                    <th className="p-2 w-20">MF ({Math.round(formPesoMF * 100)}%)</th>
                    <th className="p-2 w-28">Nota PE (0 a 20)</th>
                    <th className="p-2 w-20 bg-gray-200">Média Final</th>
                    <th className="p-2 w-28">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {notasAlunosForm.map((item, idx) => (
                    <tr key={item.alunoId} className="hover:bg-gray-50">
                      <td className="p-2 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 text-center font-mono">{item.numeroProcesso}</td>
                      <td className="p-2 font-bold text-gray-900">{item.nomeCompleto}</td>
                      <td className="p-2 text-center font-mono font-semibold">{item.mediaFrequencia}</td>
                      <td className="p-2 text-center">
                        {(() => {
                          const isInvalid = !!notasInvalidasExame[item.alunoId];
                          return (
                            <div>
                              <input
                                type="number"
                                step={0.5}
                                value={item.notaExameEscrito}
                                onChange={(e) => handleNotaPEChange(item.alunoId, Number(e.target.value))}
                                className={`w-20 p-1 rounded text-center font-mono font-black focus:outline-none transition-all ${
                                  isInvalid
                                    ? 'border-2 border-red-700 bg-red-900/20 text-red-950 font-black ring-2 ring-red-600 focus:ring-red-800'
                                    : 'border border-indigo-400 focus:ring-2 focus:ring-indigo-600'
                                }`}
                                title={isInvalid ? notasInvalidasExame[item.alunoId] : undefined}
                              />
                              {isInvalid && (
                                <div className="text-[9px] font-black text-red-900 bg-red-100 border border-red-400 rounded px-1 py-0.5 mt-0.5 whitespace-nowrap">
                                  ⚠️ Inválida
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-2 text-center font-mono font-black bg-gray-50 text-indigo-950">
                        {item.mediaFinal}
                      </td>
                      <td className="p-2 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.resultado === 'Aprovado' 
                            ? 'bg-emerald-100 text-emerald-900' 
                            : item.resultado === 'Recurso' 
                              ? 'bg-amber-100 text-amber-900' 
                              : 'bg-red-100 text-red-900'
                        }`}>
                          {item.resultado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setSubAba('termos')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer font-bold"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Homologar e Salvar Termo de Exame</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBABA: CONFIGURAÇÕES GERAIS DE EXAMES MED & REGULAÇÃO DE MÉDIAS       */}
      {/* ========================================================================= */}
      {subAba === 'configuracoes' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
          {/* Cabeçalho com Botão Oficial de Salvar */}
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Normas de Cálculo de Médias & Regulação de Exames (MED Angola)</span>
              </h3>
              <p className="text-xs text-gray-500">
                Parametrização das fórmulas oficiais de cálculo, ativação/desativação da NPP, critérios de admissão, dispensa e arredondamento escolar.
              </p>
            </div>

            {podeConfigurar ? (
              <button
                type="button"
                onClick={handleSalvarConfiguracoes}
                disabled={salvandoConfig}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-sm flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{salvandoConfig ? 'A Gravar...' : 'Gravar Normas no Sistema'}</span>
              </button>
            ) : (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px]">
                Modo Consulta (Apenas Direção/Admin pode alterar)
              </span>
            )}
          </div>

          {/* 1. CONFIGURAÇÃO OFICIAL DA NPP (NOTA DA PROVA DO PROFESSOR) */}
          <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wide">
                    NPP - Nota da Prova do Professor
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${configNppAtivo ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}>
                    {configNppAtivo ? 'Ativada no Sistema' : 'Desativada'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900">
                  Defina se os professores devem obrigatoriamente lançar a NPP em cada trimestre ou se a Média Trimestral (MT) será calculada apenas com a MAC e NPT.
                </p>
              </div>

              {podeConfigurar && (
                <button
                  type="button"
                  onClick={() => setConfigNppAtivo(!configNppAtivo)}
                  className={`px-4 py-2 rounded-xl font-black text-xs flex items-center space-x-2 cursor-pointer transition-all shadow-sm ${configNppAtivo ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  {configNppAtivo ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-300" />
                      <span>NPP Ativada</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-gray-500" />
                      <span>NPP Desativada</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2">
                <h5 className="font-bold text-gray-900 text-xs">Fórmula da Média Trimestral (MT)</h5>
                {configNppAtivo ? (
                  <div className="space-y-1.5">
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg font-mono font-bold text-indigo-900 text-center text-sm">
                      MT = (MAC + NPP + NPT) ÷ 3
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      <strong>Regulamento Geral do MED:</strong> Cada trimestre compõe-se pela Média de Avaliação Contínua (MAC), Nota da Prova do Professor (NPP) e Nota da Prova Trimestral (NPT), todas com peso igual (1 valor cada).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold text-amber-900 text-center text-sm">
                      {configFormulaTrimestralSemNpp === 'SIMPLES' 
                        ? 'MT = (MAC + NPT) ÷ 2' 
                        : 'MT = (MAC × 0.4) + (NPT × 0.6)'}
                    </div>
                    <div className="space-y-1 pt-1">
                      <label className="font-semibold text-gray-700 block text-[11px]">Variante sem NPP:</label>
                      <select
                        value={configFormulaTrimestralSemNpp}
                        onChange={(e) => setConfigFormulaTrimestralSemNpp(e.target.value as any)}
                        disabled={!podeConfigurar}
                        className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 bg-white"
                      >
                        <option value="SIMPLES">Média Simples: MT = (MAC + NPT) / 2</option>
                        <option value="PONDERADA_NPT_MAIOR">Ponderada Oficial: 40% MAC + 60% NPT</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2">
                <h5 className="font-bold text-gray-900 text-xs">Impacto nas Pautas e Cadernetas</h5>
                <ul className="space-y-1.5 text-[11px] text-gray-700">
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Na caderneta do docente, a coluna NPP {configNppAtivo ? 'fica visível e obrigatória para fechar o trimestre.' : 'fica oculta ou desabilitada automaticamente.'}</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Nos boletins de notas e pautas oficiais, o cabeçalho adapta-se em tempo real para exibir apenas os instrumentos normativos ativos.</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Todas as deliberações de conselho de notas respeitam a fórmula selecionada pela direção.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2. CLASSES DE TRANSIÇÃO VS CLASSES FINAIS DE NÍVEL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco A: Classes de Transição */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-4">
              <div className="border-b border-gray-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <h4 className="text-xs font-black text-gray-900 uppercase">
                    Normas para Classes de Transição
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Iniciação, 1ª à 5ª (Primário), 7ª e 8ª (Iº Ciclo), 10ª e 11ª (IIº Ciclo)
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-blue-900 uppercase">Fórmula Oficial de Transição</span>
                <p className="font-mono font-black text-gray-800 text-sm">MF = (MT1 + MT2 + MT3) ÷ 3</p>
                <p className="text-[10px] text-gray-500">Média aritmética simples das médias dos três trimestres lectivos.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <label className="font-bold text-gray-700 block text-[11px]">Nota Mínima de Transição</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={8}
                      max={12}
                      value={configNotaMinAprovacaoTransicao}
                      onChange={(e) => setConfigNotaMinAprovacaoTransicao(Number(e.target.value))}
                      disabled={!podeConfigurar}
                      className="w-20 p-2 border border-gray-300 rounded-lg font-mono font-bold text-center bg-gray-50"
                    />
                    <span className="text-[11px] font-semibold text-gray-600">Valores (Padrão: 10)</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <label className="font-bold text-gray-700 block text-[11px]">Máximo de Negativas p/ Recurso</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={configMaxNegativasRecurso}
                      onChange={(e) => setConfigMaxNegativasRecurso(Number(e.target.value))}
                      disabled={!podeConfigurar}
                      className="w-20 p-2 border border-gray-300 rounded-lg font-mono font-bold text-center bg-gray-50"
                    />
                    <span className="text-[11px] font-semibold text-gray-600">Disciplinas (Padrão: 2)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                <span className="font-bold block">Regime de Progressão por Nível:</span>
                <p>• <strong>Ensino Primário (1ª à 5ª):</strong> Progressão por ciclos de aprendizagem com reforço pedagógico nas disciplinas não dominadas.</p>
                <p>• <strong>Iº e IIº Ciclo:</strong> O estudante transita com até 2 disciplinas com classificação inferior a 10 valores, ficando em regime de recurso ou dependência.</p>
              </div>
            </div>

            {/* Bloco B: Classes Finais de Nível com Exame */}
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-4">
              <div className="border-b border-amber-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                  <h4 className="text-xs font-black text-amber-950 uppercase">
                    Normas para Classes Finais com Exame Nacional
                  </h4>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  6ª Classe (Primário), 9ª Classe (Iº Ciclo), 12ª Classe (Geral), 12ª/13ª (Técnico e Pedagógico)
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase">Fórmula Oficial de Classificação Final (CF)</span>
                <p className="font-mono font-black text-gray-900 text-sm">
                  CF = (MF × {configPesoPadraoMF}) + (Exame × {configPesoPadraoPE})
                </p>
                <p className="text-[10px] text-gray-500">
                  {Math.round(configPesoPadraoMF * 100)}% Média de Frequência + {Math.round(configPesoPadraoPE * 100)}% Prova Escrita de Exame.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <label className="font-bold text-gray-700 block text-[11px]">Nota Mínima de Admissão a Exame</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={configNotaMinAdmissao}
                      onChange={(e) => setConfigNotaMinAdmissao(Number(e.target.value))}
                      disabled={!podeConfigurar}
                      className="w-20 p-2 border border-gray-300 rounded-lg font-mono font-bold text-center bg-gray-50"
                    />
                    <span className="text-[11px] font-semibold text-gray-600">Valores (Padrão: 7)</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <label className="font-bold text-gray-700 block text-[11px]">Nota para Dispensa de Exame</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={10}
                      max={20}
                      value={configNotaDispensa}
                      onChange={(e) => setConfigNotaDispensa(Number(e.target.value))}
                      disabled={!podeConfigurar}
                      className="w-20 p-2 border border-gray-300 rounded-lg font-mono font-bold text-center bg-gray-50"
                    />
                    <span className="text-[11px] font-semibold text-gray-600">Valores (Padrão: 14)</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <label className="font-bold text-gray-700 block text-[11px]">Ponderação MF vs Exame</label>
                  <select
                    value={`${configPesoPadraoMF}-${configPesoPadraoPE}`}
                    onChange={(e) => {
                      const [mf, pe] = e.target.value.split('-').map(Number);
                      setConfigPesoPadraoMF(mf);
                      setConfigPesoPadraoPE(pe);
                    }}
                    disabled={!podeConfigurar}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 bg-white text-xs"
                  >
                    <option value="0.6-0.4">60% Frequência / 40% Exame (Padrão MED)</option>
                    <option value="0.5-0.5">50% Frequência / 50% Exame (Paritário)</option>
                    <option value="0.7-0.3">70% Frequência / 30% Exame (Maior Frequência)</option>
                  </select>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <label className="font-bold text-gray-700 block text-[11px]">Regra de Arredondamento</label>
                  <select
                    value={configArredondamento}
                    onChange={(e) => setConfigArredondamento(e.target.value as any)}
                    disabled={!podeConfigurar}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 bg-white text-xs"
                  >
                    <option value="PADRAO_MED">Inteiro mais Próximo (Padrão MED)</option>
                    <option value="DECIMAL">Com Uma Casa Decimal (Ex: 11.5)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SIMULADOR INTERATIVO DE FÓRMULAS E MÉDIAS OFICIAIS */}
          <div className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-emerald-700" />
                <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  Simulador Interativo de Cálculo de Médias
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSimuladorModo('transicao')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${simuladorModo === 'transicao' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200'}`}
                >
                  Classe de Transição
                </button>
                <button
                  type="button"
                  onClick={() => setSimuladorModo('final_exame')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${simuladorModo === 'final_exame' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-gray-700 border border-gray-200'}`}
                >
                  Classe Final com Exame
                </button>
              </div>
            </div>

            {/* Inputs do Simulador */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              {/* T1 */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-900 block text-xs">1º Trimestre</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">MAC:</span>
                    <input type="number" min={0} max={20} value={simMac1} onChange={(e) => setSimMac1(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono" />
                  </div>
                  {configNppAtivo && (
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-600 font-semibold">NPP:</span>
                      <input type="number" min={0} max={20} value={simNpp1} onChange={(e) => setSimNpp1(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono text-indigo-700 bg-indigo-50" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">NPT:</span>
                    <input type="number" min={0} max={20} value={simNpt1} onChange={(e) => setSimNpt1(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono" />
                  </div>
                  {(() => {
                    const mt1 = configNppAtivo ? (simMac1 + simNpp1 + simNpt1) / 3 : (simMac1 + simNpt1) / 2;
                    return (
                      <div className="pt-1 border-t text-xs font-black text-gray-900">
                        MT1: <span className="font-mono text-indigo-700">{mt1.toFixed(1)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* T2 */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-900 block text-xs">2º Trimestre</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">MAC:</span>
                    <input type="number" min={0} max={20} value={simMac2} onChange={(e) => setSimMac2(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono" />
                  </div>
                  {configNppAtivo && (
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-600 font-semibold">NPP:</span>
                      <input type="number" min={0} max={20} value={simNpp2} onChange={(e) => setSimNpp2(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono text-indigo-700 bg-indigo-50" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">NPT:</span>
                    <input type="number" min={0} max={20} value={simNpt2} onChange={(e) => setSimNpt2(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono" />
                  </div>
                  {(() => {
                    const mt2 = configNppAtivo ? (simMac2 + simNpp2 + simNpt2) / 3 : (simMac2 + simNpt2) / 2;
                    return (
                      <div className="pt-1 border-t text-xs font-black text-gray-900">
                        MT2: <span className="font-mono text-indigo-700">{mt2.toFixed(1)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* T3 */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-900 block text-xs">3º Trimestre</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">MAC:</span>
                    <input type="number" min={0} max={20} value={simMac3} onChange={(e) => setSimMac3(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono" />
                  </div>
                  {configNppAtivo && (
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-600 font-semibold">NPP:</span>
                      <input type="number" min={0} max={20} value={simNpp3} onChange={(e) => setSimNpp3(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono text-indigo-700 bg-indigo-50" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">NPT:</span>
                    <input type="number" min={0} max={20} value={simNpt3} onChange={(e) => setSimNpt3(Number(e.target.value))} className="w-16 p-1 border rounded text-center font-bold font-mono" />
                  </div>
                  {(() => {
                    const mt3 = configNppAtivo ? (simMac3 + simNpp3 + simNpt3) / 3 : (simMac3 + simNpt3) / 2;
                    return (
                      <div className="pt-1 border-t text-xs font-black text-gray-900">
                        MT3: <span className="font-mono text-indigo-700">{mt3.toFixed(1)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Exame Escrito (se classe final) */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-900 block text-xs">Exame Escrito</span>
                {simuladorModo === 'final_exame' ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-amber-800 font-bold">Nota da Prova:</span>
                      <input type="number" min={0} max={20} value={simNotaExame} onChange={(e) => setSimNotaExame(Number(e.target.value))} className="w-16 p-1.5 border border-amber-300 rounded text-center font-bold font-mono text-amber-900 bg-amber-50" />
                    </div>
                    <p className="text-[10px] text-gray-500">Ponderação: {Math.round(configPesoPadraoPE * 100)}%</p>
                  </div>
                ) : (
                  <div className="p-4 text-[11px] text-gray-400 italic">
                    Não aplicável a classes de transição (transita por frequência direta).
                  </div>
                )}
              </div>
            </div>

            {/* Resultado da Simulação */}
            {(() => {
              const mt1 = configNppAtivo ? (simMac1 + simNpp1 + simNpt1) / 3 : (simMac1 + simNpt1) / 2;
              const mt2 = configNppAtivo ? (simMac2 + simNpp2 + simNpt2) / 3 : (simMac2 + simNpt2) / 2;
              const mt3 = configNppAtivo ? (simMac3 + simNpp3 + simNpt3) / 3 : (simMac3 + simNpt3) / 2;
              const mf = (mt1 + mt2 + mt3) / 3;

              let classificacaoFinal: number;
              let resultadoTexto: string;
              let corBadge: string;
              let detalheNorma: string;

              if (simuladorModo === 'transicao') {
                classificacaoFinal = configArredondamento === 'PADRAO_MED' ? Math.round(mf) : Number(mf.toFixed(1));
                if (classificacaoFinal >= configNotaMinAprovacaoTransicao) {
                  resultadoTexto = 'Aprovado / Transita';
                  corBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  detalheNorma = `Média de ${classificacaoFinal} valores atinge a nota mínima de transição (${configNotaMinAprovacaoTransicao} valores).`;
                } else {
                  resultadoTexto = 'Recurso / Não Transita';
                  corBadge = 'bg-red-100 text-red-800 border-red-300';
                  detalheNorma = `Média de ${classificacaoFinal} valores inferior à nota mínima regulamentar (${configNotaMinAprovacaoTransicao} valores).`;
                }
              } else {
                // Classe Final com Exame
                if (mf >= configNotaDispensa) {
                  classificacaoFinal = configArredondamento === 'PADRAO_MED' ? Math.round(mf) : Number(mf.toFixed(1));
                  resultadoTexto = 'Dispensado de Exame (Aprovado)';
                  corBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  detalheNorma = `Frequência de ${mf.toFixed(1)} valores >= ${configNotaDispensa} valores. Isento de prova de exame ordinário.`;
                } else if (mf < configNotaMinAdmissao) {
                  classificacaoFinal = configArredondamento === 'PADRAO_MED' ? Math.round(mf) : Number(mf.toFixed(1));
                  resultadoTexto = 'Não Admitido a Exame (Reprovado)';
                  corBadge = 'bg-red-100 text-red-800 border-red-300';
                  detalheNorma = `Frequência de ${mf.toFixed(1)} valores inferior à nota mínima regulamentar (${configNotaMinAdmissao} valores) para prestar exame.`;
                } else {
                  const finalCalculada = (mf * configPesoPadraoMF) + (simNotaExame * configPesoPadraoPE);
                  classificacaoFinal = configArredondamento === 'PADRAO_MED' ? Math.round(finalCalculada) : Number(finalCalculada.toFixed(1));
                  if (classificacaoFinal >= 10 && simNotaExame >= 10) {
                    resultadoTexto = 'Aprovado no Exame';
                    corBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    detalheNorma = `Cálculo: (${mf.toFixed(1)} × ${configPesoPadraoMF}) + (${simNotaExame} × ${configPesoPadraoPE}) = ${finalCalculada.toFixed(2)} → ${classificacaoFinal} valores.`;
                  } else if (classificacaoFinal >= 7) {
                    resultadoTexto = 'Recurso (2ª Época)';
                    corBadge = 'bg-amber-100 text-amber-800 border-amber-300';
                    detalheNorma = `Classificação final de ${classificacaoFinal} valores permite admissão à Época de Recurso.`;
                  } else {
                    resultadoTexto = 'Não Aprovado';
                    corBadge = 'bg-red-100 text-red-800 border-red-300';
                    detalheNorma = `Classificação final insuficiente (${classificacaoFinal} valores).`;
                  }
                }
              }

              return (
                <div className="p-4 bg-white rounded-xl border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resultado da Simulação Oficial</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-black font-mono text-gray-950">
                        {classificacaoFinal} valores
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${corBadge}`}>
                        {resultadoTexto}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">{detalheNorma}</p>
                  </div>

                  <div className="text-right sm:border-l sm:pl-4 border-gray-200 space-y-1">
                    <div className="text-[11px] text-gray-500">Média de Frequência (MF): <strong className="text-gray-900 font-mono">{mf.toFixed(1)}</strong></div>
                    <div className="text-[11px] text-gray-500">NPP Ativa: <strong className={configNppAtivo ? 'text-emerald-700' : 'text-gray-600'}>{configNppAtivo ? 'Sim' : 'Não'}</strong></div>
                    <div className="text-[11px] text-gray-500">Regra de Arredondamento: <strong className="text-gray-900">{configArredondamento === 'PADRAO_MED' ? 'Inteiro MED' : 'Decimal'}</strong></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 4. CALENDÁRIO DAS ÉPOCAS DE EXAME */}
          <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2">
            <h4 className="font-bold text-amber-950 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Instrução Ministerial Oficial e Validação de Júris</span>
            </h4>
            <p className="text-amber-900 text-[11px] leading-relaxed">
              Em conformidade com a regulamentação do Ministério da Educação da República de Angola, as provas de exame final são aplicadas nas classes terminais de nível (6ª, 9ª, 12ª e 13ª Classes). As pautas oficiais homologadas pelo Presidente do Júri, Secretário e Director Geral da Instituição são os únicos documentos que conferem valor jurídico às classificações finais para emissão de Certificados de Habilitações.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
