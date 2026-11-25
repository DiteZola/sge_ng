import React, { useState, useEffect, useMemo } from 'react';
import { Download, Printer, Users, X, User, Filter } from 'lucide-react';
import { Escola, Turma, Aluno } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import {
  isSegundoCiclo,
  normalizarClasse,
  CURSOS_SEGUNDO_CICLO,
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO
} from '../services/academicHierarchyService';
import { downloadElementAsPdf, imprimirElementoDiretamente, PdfMarginsMm } from '../utils/pdfGenerator';
import { formatarParaDataAngola } from './AngolaDateInput';
import { dbService } from '../services/storage';
import { hojeAngolano } from '../utils/dateFormat';
import {
  obterTituloDirectorTurma,
  obterTituloSubdiretorPedagogico,
  obterTituloDiretorSimples,
  obterNomeSubdiretorPedagogico,
  obterNomeDiretorGeral
} from '../utils/directorHelper';

interface StudentClassListPdfDocumentProps {
  escola: Escola;
  turma?: Turma;
  alunos: Aluno[];
  turmasDisponiveis?: Turma[];
  todosAlunos?: Aluno[];
  selectedAnoLectivo?: string;
  initialClasse?: string;
  initialCurso?: string;
  initialTurmaId?: string;
  onFilterChange?: (filters: { classe: string; curso: string; turmaId: string }) => void;
  onClose?: () => void;
  pdfFormat?: 'a4' | 'letter';
  pdfOrientation?: 'portrait' | 'landscape';
  pdfMargins?: Partial<PdfMarginsMm>;
}

const ORDEM_CLASSES = [
  'Iniciação',
  ...CLASSES_ENSINO_PRIMARIO.filter((c) => c !== 'Iniciação'),
  ...CLASSES_PRIMEIRO_CICLO,
  ...CLASSES_SEGUNDO_CICLO
];

export function calcularIdadeAluno(dataNascIsoOuStr?: string): string {
  if (!dataNascIsoOuStr) return '—';
  let ano = 0, mes = 0, dia = 0;
  if (dataNascIsoOuStr.includes('-')) {
    const p = dataNascIsoOuStr.split('-');
    if (p[0].length === 4) {
      ano = parseInt(p[0], 10);
      mes = parseInt(p[1], 10);
      dia = parseInt(p[2], 10);
    }
  } else if (dataNascIsoOuStr.includes('/')) {
    const p = dataNascIsoOuStr.split('/');
    if (p[2]?.length === 4) {
      ano = parseInt(p[2], 10);
      mes = parseInt(p[1], 10);
      dia = parseInt(p[0], 10);
    }
  }
  if (!ano || isNaN(ano)) return '—';
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() + 1 - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }
  return `${Math.max(0, idade)} anos`;
}

export const StudentClassListPdfDocument: React.FC<StudentClassListPdfDocumentProps> = ({
  escola,
  turma,
  alunos,
  turmasDisponiveis,
  todosAlunos,
  selectedAnoLectivo,
  initialClasse,
  initialCurso,
  initialTurmaId,
  onFilterChange,
  onClose,
  pdfFormat = 'a4',
  pdfOrientation = 'portrait',
  pdfMargins
}) => {
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());

  const temModoInterativo = Array.isArray(turmasDisponiveis) && Array.isArray(todosAlunos);

  const [filtroClasse, setFiltroClasse] = useState<string>(() => {
    if (initialClasse) return initialClasse;
    if (turma?.classe) return normalizarClasse(turma.classe);
    return 'TODAS';
  });

  const [filtroCurso, setFiltroCurso] = useState<string>(() => {
    if (initialCurso) return initialCurso;
    if (turma?.curso && isSegundoCiclo(turma.classe)) return turma.curso;
    return 'TODOS';
  });

  const [filtroTurmaId, setFiltroTurmaId] = useState<string>(() => {
    if (initialTurmaId) return initialTurmaId;
    if (turma?.id && turma.id !== 'turma-padrao') return turma.id;
    return 'TODAS';
  });

  useEffect(() => {
    if (initialClasse !== undefined) setFiltroClasse(initialClasse);
  }, [initialClasse]);

  useEffect(() => {
    if (initialCurso !== undefined) setFiltroCurso(initialCurso);
  }, [initialCurso]);

  useEffect(() => {
    if (initialTurmaId !== undefined) setFiltroTurmaId(initialTurmaId);
  }, [initialTurmaId]);

  useEffect(() => {
    const atualizar = () => setConfigSistema(dbService.getConfiguracaoSistema());
    window.addEventListener('sge_dados_atualizados_remoto', atualizar);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', atualizar);
  }, []);

  const anoBase = selectedAnoLectivo || turma?.anoLectivo || escola.anoLectivoActivo || '';

  const turmasBase = useMemo(() => {
    if (!turmasDisponiveis) return turma ? [turma] : [];
    return turmasDisponiveis.filter((t) => !anoBase || !t.anoLectivo || t.anoLectivo === anoBase);
  }, [turmasDisponiveis, turma, anoBase]);

  // Classes disponíveis na escola / alunos
  const classesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    dbService.getClassesConfigs(escola.id, anoBase).filter(c => c.ativa !== false).forEach((c) => {
      if (c.nome) set.add(normalizarClasse(c.nome));
    });
    turmasBase.forEach((t) => {
      if (t.classe) set.add(normalizarClasse(t.classe));
    });
    (todosAlunos || alunos).forEach((a) => {
      if (a.classeId) set.add(normalizarClasse(a.classeId));
    });
    return Array.from(set).sort((a, b) => {
      const iA = ORDEM_CLASSES.indexOf(a);
      const iB = ORDEM_CLASSES.indexOf(b);
      if (iA === -1 && iB === -1) return a.localeCompare(b);
      if (iA === -1) return 1;
      if (iB === -1) return -1;
      return iA - iB;
    });
  }, [escola.id, anoBase, turmasBase, todosAlunos, alunos]);

  const temSegundoCicloDisponivel = useMemo(() => {
    if (filtroClasse !== 'TODAS') return isSegundoCiclo(filtroClasse);
    return turmasBase.some((t) => isSegundoCiclo(t.classe));
  }, [filtroClasse, turmasBase]);

  // Cursos disponíveis exclusivamente para o IIº Ciclo (10ª–13ª)
  const cursosDisponiveis = useMemo(() => {
    if (!temSegundoCicloDisponivel) return [];
    const set = new Set<string>();
    dbService.getCursos(escola.id).filter(c => c.ativo !== false).forEach((c) => {
      if (c.nome && c.nome.trim()) set.add(c.nome.trim());
    });
    turmasBase.forEach((t) => {
      if (!isSegundoCiclo(t.classe)) return;
      if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return;
      if (t.curso && t.curso.trim()) set.add(t.curso.trim());
    });
    (todosAlunos || alunos).forEach((a) => {
      const clAl = a.classeId || '';
      if (clAl && !isSegundoCiclo(clAl)) return;
      if (filtroClasse !== 'TODAS' && normalizarClasse(clAl) !== normalizarClasse(filtroClasse)) return;
      if (a.curso && a.curso.trim()) set.add(a.curso.trim());
    });
    CURSOS_SEGUNDO_CICLO.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [escola.id, turmasBase, todosAlunos, alunos, filtroClasse, temSegundoCicloDisponivel]);

  // Turmas filtradas por Classe e Curso
  const turmasFiltradas = useMemo(() => {
    return turmasBase.filter((t) => {
      if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) {
        return false;
      }
      if (filtroCurso !== 'TODOS') {
        const cursoTurma = (t.curso || '').trim().toLowerCase();
        if (cursoTurma !== filtroCurso.trim().toLowerCase()) return false;
      }
      return true;
    });
  }, [turmasBase, filtroClasse, filtroCurso]);

  // Garantir que filtroTurmaId permaneça válido ao trocar Classe/Curso
  useEffect(() => {
    if (!temModoInterativo) return;
    if (filtroTurmaId !== 'TODAS' && !turmasFiltradas.some((t) => t.id === filtroTurmaId)) {
      const nextTurma = turmasFiltradas.length === 1 ? turmasFiltradas[0].id : 'TODAS';
      setFiltroTurmaId(nextTurma);
      onFilterChange?.({ classe: filtroClasse, curso: filtroCurso, turmaId: nextTurma });
    }
  }, [turmasFiltradas, filtroTurmaId, temModoInterativo]);

  const turmaSelecionadaObj = useMemo(() => {
    if (temModoInterativo) {
      if (filtroTurmaId !== 'TODAS') {
        return turmasFiltradas.find((t) => t.id === filtroTurmaId) || turmasBase.find((t) => t.id === filtroTurmaId);
      }
      return undefined;
    }
    return turma;
  }, [temModoInterativo, filtroTurmaId, turmasFiltradas, turmasBase, turma]);

  // Alunos finais exibidos na lista
  const alunosExibidos = useMemo(() => {
    if (!temModoInterativo || !todosAlunos) {
      return alunos;
    }
    return todosAlunos.filter((a) => {
      const turmaDoAluno = turmasBase.find((t) => t.id === a.turmaId) || turmasDisponiveis?.find((t) => t.id === a.turmaId);
      const anoDoAluno = a.anoLectivo || a.anoMatricula || turmaDoAluno?.anoLectivo || anoBase;
      if (anoBase && anoDoAluno && anoDoAluno !== anoBase) return false;

      if (filtroTurmaId !== 'TODAS') {
        return a.turmaId === filtroTurmaId;
      }

      const classeAluno = turmaDoAluno ? normalizarClasse(turmaDoAluno.classe) : normalizarClasse(a.classeId);
      if (filtroClasse !== 'TODAS' && classeAluno !== normalizarClasse(filtroClasse)) {
        return false;
      }

      if (filtroCurso !== 'TODOS') {
        const cursoAluno = (turmaDoAluno?.curso || a.curso || '').trim().toLowerCase();
        if (cursoAluno !== filtroCurso.trim().toLowerCase()) return false;
      }

      return true;
    });
  }, [temModoInterativo, todosAlunos, alunos, turmasBase, turmasDisponiveis, anoBase, filtroTurmaId, filtroClasse, filtroCurso]);

  // Ordenar alunos por número de chamada ou nome
  const alunosOrdenados = useMemo(() => {
    return [...alunosExibidos].sort((a, b) => {
      if (a.numeroOrdem && b.numeroOrdem) return a.numeroOrdem - b.numeroOrdem;
      return a.nomeCompleto.localeCompare(b.nomeCompleto);
    });
  }, [alunosExibidos]);

  const totalAlunos = alunosOrdenados.length;
  const totalM = alunosOrdenados.filter((a) => a.genero === 'M').length;
  const totalF = alunosOrdenados.filter((a) => a.genero === 'F').length;

  const classeCabecalho =
    turmaSelecionadaObj?.classe ||
    (filtroClasse !== 'TODAS' ? filtroClasse : turma?.classe || 'Todas as Classes');
  const turmaCabecalho =
    turmaSelecionadaObj
      ? `${turmaSelecionadaObj.nome}${turmaSelecionadaObj.turno ? ` (${turmaSelecionadaObj.turno})` : ''}`
      : 'Todas as Turmas';
  const salaCabecalho = turmaSelecionadaObj?.sala || 'Diversas';
  const ehCabecalhoSegundoCiclo =
    classeCabecalho !== 'Todas as Classes'
      ? isSegundoCiclo(classeCabecalho)
      : temSegundoCicloDisponivel && filtroCurso !== 'TODOS';
  const temCurso =
    ehCabecalhoSegundoCiclo &&
    (filtroCurso !== 'TODOS' || Boolean(turmaSelecionadaObj?.curso && turmaSelecionadaObj.curso.trim()));
  const cursoExibicao =
    ehCabecalhoSegundoCiclo
      ? (filtroCurso !== 'TODOS' ? filtroCurso : (turmaSelecionadaObj?.curso || 'Todos os Cursos'))
      : '';

  const mostrarColunaTurma = !turmaSelecionadaObj;

  const handleClasseChange = (novaClasse: string) => {
    setFiltroClasse(novaClasse);
    const nextCurso = novaClasse !== 'TODAS' && !isSegundoCiclo(novaClasse) ? 'TODOS' : filtroCurso;
    if (nextCurso !== filtroCurso) setFiltroCurso(nextCurso);
    const turmasCompat = turmasBase.filter((t) => {
      if (novaClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(novaClasse)) return false;
      if (nextCurso !== 'TODOS' && (t.curso || '').trim().toLowerCase() !== nextCurso.trim().toLowerCase()) return false;
      return true;
    });
    const nextTurma = turmasCompat.length === 1 ? turmasCompat[0].id : 'TODAS';
    setFiltroTurmaId(nextTurma);
    onFilterChange?.({ classe: novaClasse, curso: nextCurso, turmaId: nextTurma });
  };

  const handleCursoChange = (novoCurso: string) => {
    setFiltroCurso(novoCurso);
    const turmasCompat = turmasBase.filter((t) => {
      if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
      if (novoCurso !== 'TODOS' && (t.curso || '').trim().toLowerCase() !== novoCurso.trim().toLowerCase()) return false;
      return true;
    });
    const nextTurma = turmasCompat.length === 1 ? turmasCompat[0].id : 'TODAS';
    setFiltroTurmaId(nextTurma);
    onFilterChange?.({ classe: filtroClasse, curso: novoCurso, turmaId: nextTurma });
  };

  const handleTurmaChange = (novaTurmaId: string) => {
    setFiltroTurmaId(novaTurmaId);
    onFilterChange?.({ classe: filtroClasse, curso: filtroCurso, turmaId: novaTurmaId });
  };

  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    try {
      const classeLimpa = String(classeCabecalho).replace(/[^a-zA-Z0-9ªº]/g, '_');
      const turmaLimpa = (turmaSelecionadaObj?.nome || 'Todas_Turmas').replace(/\s+/g, '_');
      const anoLimpo = (anoBase || 'MED').replace(/[\/\\]/g, '-');
      const nomeLimpo = `lista_nominal_${classeLimpa}_${turmaLimpa}_${anoLimpo}.pdf`;
      await downloadElementAsPdf('documento-lista-nominal-alunos', nomeLimpo, {
        orientation: pdfOrientation,
        format: pdfFormat,
        margins: pdfMargins,
        marginMm: 8
      });
    } catch (e) {
      console.error('Falha ao gerar PDF da lista nominal:', e);
      window.print();
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleImprimir = () => {
    const el = document.getElementById('documento-lista-nominal-alunos');
    if (el) {
      imprimirElementoDiretamente(el, `Lista Nominal - ${classeCabecalho} ${turmaCabecalho}`, {
        format: pdfFormat,
        orientation: pdfOrientation,
        margins: pdfMargins,
        marginMm: 8
      });
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superior e Filtros de Classe, Curso e Turma */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Lista Nominal Oficial de Estudantes (com Fotos, Sexo e Idade)</h3>
              <p className="text-xs text-slate-300">
                {classeCabecalho} • {turmaCabecalho} {temCurso && cursoExibicao ? `• Curso: ${cursoExibicao}` : ''} • {totalAlunos} Alunos ({totalM} M, {totalF} F)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{gerandoPdf ? 'A Gerar PDF...' : 'Baixar Lista em PDF (.pdf)'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar visualização"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Seletores interativos de Classe, Curso (somente IIº Ciclo) e Turma */}
        {temModoInterativo && (
          <div className={`pt-3 border-t border-slate-700/80 grid grid-cols-1 ${temSegundoCicloDisponivel ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2.5 text-xs`}>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1 flex items-center space-x-1">
                <Filter className="w-3 h-3 text-blue-400" />
                <span>Classe</span>
              </label>
              <select
                value={filtroClasse}
                onChange={(e) => handleClasseChange(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="TODAS">Todas as Classes ({classesDisponiveis.length})</option>
                {classesDisponiveis.map((cl) => (
                  <option key={`ln-cl-${cl}`} value={cl}>
                    {cl} {cl !== 'Iniciação' ? 'Classe' : ''}
                  </option>
                ))}
              </select>
            </div>

            {temSegundoCicloDisponivel && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                  Curso / Especialidade (IIº Ciclo)
                </label>
                <select
                  value={filtroCurso}
                  onChange={(e) => handleCursoChange(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="TODOS">Todos os Cursos</option>
                  {cursosDisponiveis.map((c) => (
                    <option key={`ln-cur-${c}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                Turma ({turmasFiltradas.length})
              </label>
              <select
                value={filtroTurmaId}
                onChange={(e) => handleTurmaChange(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="TODAS">Todas as Turmas ({turmasFiltradas.length})</option>
                {turmasFiltradas.map((t) => (
                  <option key={`ln-tur-${t.id}`} value={t.id}>
                    Turma {t.nome} ({t.classe}) • {t.turno}{isSegundoCiclo(t.classe) && t.curso ? ` • ${t.curso}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Folha Oficial para Impressão e PDF */}
      <div
        id="documento-lista-nominal-alunos"
        data-doc-root="true"
        className="documento-oficial-print bg-white p-6 sm:p-8 border border-gray-300 rounded-xl shadow-lg max-w-[210mm] mx-auto text-black print:border-none print:shadow-none print:p-0 print:m-0"
        style={{ minHeight: pdfFormat === 'letter' ? '279.4mm' : '297mm', fontFamily: 'Arial, sans-serif' }}
      >
        {/* Cabeçalho Oficial do Ministério da Educação da República de Angola */}
        <div data-pdf-fixed-header="true" data-pdf-center-insignia="true" className="text-center space-y-1 mb-5">
          <div className="flex justify-center mb-1">
            <InsigniaAngola size={50} customUrl={configSistema.insigniaNacionalUrl} />
          </div>
          <h1 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            República de Angola
          </h1>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            Governo Provincial de {escola.provincia || 'Luanda'}
          </h2>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            {escola.municipio ? `Administração Municipal de ${escola.municipio}` : (escola.gabineteEducacao || 'Administração Municipal')}
          </h3>
          <h4 className="text-sm font-black uppercase text-blue-950 pt-0.5">
            {escola.nomeOficial}
          </h4>
          <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-400 rounded text-xs font-black uppercase tracking-wider mt-1">
            Lista Nominal dos Alunos Matriculados
          </div>
        </div>

        {/* Metadados da Turma em Grid Limpo */}
        <div data-pdf-fixed-student="true" data-pdf-student-grid="4" className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-gray-50 border border-gray-300 rounded text-[11px] mb-4">
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Ano Lectivo</span>
            <span className="font-black text-gray-900">{anoBase || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Classe</span>
            <span className="font-black text-gray-900">{classeCabecalho}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Turma / Turno</span>
            <span className="font-black text-gray-900">{turmaCabecalho}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Sala</span>
            <span className="font-black text-gray-900">{salaCabecalho}</span>
          </div>

          {/* Regra Oficial: Apenas no 2º Ciclo exibe o curso. No Primário e 1º Ciclo NÃO há curso */}
          {temCurso && cursoExibicao && (
            <div className="col-span-2 sm:col-span-4 border-t border-gray-200 pt-1 mt-1">
              <span className="text-gray-500 text-[9px] uppercase font-bold inline-block mr-1">Curso / Especialidade:</span>
              <span className="font-black text-blue-900 text-[11px]">{cursoExibicao}</span>
            </div>
          )}
        </div>

        {/* Tabela Nominal com Numeração, Fotografia, Nome Completo, Sexo e Idade */}
        <div className="mb-4 overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-black text-[9.5px] text-left">
            <thead>
              <tr className="bg-gray-200 text-black uppercase font-black text-[8.5px] border-b-2 border-black">
                <th className="p-1 border border-black text-center min-w-[28px]">Nº</th>
                <th className="p-1 border border-black text-center min-w-[44px]">Foto</th>
                <th className="p-1 border border-black text-center min-w-[74px]">Nº Proc.</th>
                <th className="p-1.5 border border-black min-w-[160px]">Nome Completo do Estudante</th>
                {mostrarColunaTurma && (
                  <th className="p-1 border border-black text-center min-w-[74px]">Classe/Turma</th>
                )}
                <th className="p-1 border border-black text-center min-w-[34px]">Sexo</th>
                <th className="p-1 border border-black text-center min-w-[44px]">Idade</th>
                <th className="p-1 border border-black text-center min-w-[68px]">Data Nasc.</th>
                <th className="p-1 border border-black text-center min-w-[72px]">Estado / Rub.</th>
              </tr>
            </thead>
            <tbody>
              {alunosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={mostrarColunaTurma ? 9 : 8} className="p-6 text-center text-gray-600 font-semibold border border-black">
                    Nenhum estudante matriculado encontrado para os filtros selecionados ({classeCabecalho} • {turmaCabecalho}).
                  </td>
                </tr>
              ) : (
                alunosOrdenados.map((aluno, idx) => {
                  const idade = calcularIdadeAluno(aluno.dataNascimento);
                  const dataFormatada = formatarParaDataAngola(aluno.dataNascimento);
                  const tAluno = (turmasDisponiveis || []).find((t) => t.id === aluno.turmaId);

                  return (
                    <tr key={aluno.id} className="border-b border-black hover:bg-gray-50">
                      <td className="p-1 border border-black text-center font-bold font-mono">
                        {idx + 1}
                      </td>

                      {/* Fotografia 3x4 em miniatura de alta definição */}
                      <td className="p-1 border border-black text-center">
                        <div className="w-8 h-10 mx-auto bg-gray-100 border border-gray-400 rounded overflow-hidden flex items-center justify-center">
                          {aluno.fotoUrl ? (
                            <img
                              src={aluno.fotoUrl}
                              alt={aluno.nomeCompleto}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                              <User className="w-4 h-4 text-gray-300" />
                              <span className="text-[6px] text-gray-400 font-bold uppercase">Foto</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-1 border border-black text-center font-mono font-medium text-[8.5px] break-words">
                        {aluno.numeroProcesso || aluno.codigoMatricula}
                      </td>

                      <td className="p-1.5 border border-black font-bold uppercase text-[10px] leading-snug break-words whitespace-normal">
                        {aluno.nomeCompleto}
                      </td>

                      {mostrarColunaTurma && (
                        <td className="p-1 border border-black text-center font-semibold text-[8.5px] break-words">
                          {tAluno ? `${tAluno.classe} ${tAluno.nome}` : (aluno.classeId || '—')}
                        </td>
                      )}

                      <td className="p-1 border border-black text-center font-bold">
                        {aluno.genero === 'M' ? 'M' : 'F'}
                      </td>

                      <td className="p-1 border border-black text-center font-medium">
                        {idade}
                      </td>

                      <td className="p-1 border border-black text-center font-mono text-[8.5px]">
                        {dataFormatada || '—'}
                      </td>

                      <td className="p-1 border border-black text-center text-gray-500 text-[8px] break-words">
                        {aluno.estado || 'Activo'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo Estatístico da Turma */}
        <div className="flex flex-wrap justify-between items-center gap-2 p-2 bg-gray-100 border border-black rounded text-[10px] font-bold mb-6">
          <span>Total de Alunos Matriculados: <strong className="font-black text-black">{totalAlunos}</strong></span>
          <span>Masculino: <strong className="font-black text-black">{totalM}</strong></span>
          <span>Feminino: <strong className="font-black text-black">{totalF}</strong></span>
          <span>Data de Emissão: <strong className="font-black text-black">{hojeAngolano('curto')}</strong></span>
        </div>

        {/* Assinaturas Oficiais com Traço Centrado e Género Correto */}
        {(() => {
          const funcionariosLista = dbService.getFuncionarios(escola.id);
          return (
            <div data-pdf-fixed-signatures="true" className="grid grid-cols-3 gap-4 pt-4 text-center text-[10px]">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 mb-7">
                  {turmaSelecionadaObj ? obterTituloDirectorTurma(turmaSelecionadaObj, funcionariosLista) : 'Direcção de Turma'}
                </p>
                <div className="w-full max-w-[160px] border-b border-black mx-auto mb-1" />
                <p className="font-bold text-gray-900 break-words">{turmaSelecionadaObj?.coordenadorNome || 'Coordenação de Turma'}</p>
                <p className="text-gray-500 text-[9px]">Docente Responsável</p>
              </div>

              <div className="min-w-0">
                <p className="font-bold text-gray-900 mb-7">
                  {obterTituloSubdiretorPedagogico(escola, funcionariosLista)}
                </p>
                <div className="w-full max-w-[160px] border-b border-black mx-auto mb-1" />
                <p className="font-bold text-gray-900 break-words">{obterNomeSubdiretorPedagogico(escola, funcionariosLista)}</p>
                <p className="text-gray-500 text-[9px]">Área Pedagógica</p>
              </div>

              <div className="min-w-0">
                <p className="font-bold text-gray-900 mb-7">
                  {obterTituloDiretorSimples(escola, funcionariosLista)}
                </p>
                <div className="w-full max-w-[160px] border-b border-black mx-auto mb-1" />
                <p className="font-bold text-gray-900 break-words">{obterNomeDiretorGeral(escola, funcionariosLista)}</p>
                <p className="text-gray-500 text-[9px]">Visto & Homologado</p>
              </div>
            </div>
          );
        })()}

        <div className="mt-5 pt-3 border-t border-gray-300 flex items-center justify-between text-[9px] text-gray-600">
          <div>
            <p className="font-bold text-gray-800">{escola.nomeOficial}</p>
            <p>{turmaCabecalho} ({classeCabecalho}) • {totalAlunos} estudantes listados</p>
          </div>
          <OfficialQrCode
            value={gerarPayloadQrDocumento({
              docType: 'LISTA_NOMINAL',
              escolaId: escola.id,
              docRef: `${turmaSelecionadaObj?.id || classeCabecalho}-${anoBase}`,
              turmaId: turmaSelecionadaObj?.id,
              anoLectivo: anoBase
            })}
            size={48}
          />
        </div>
      </div>
    </div>
  );
};
