import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  ClipboardList, 
  Calendar, 
  Download, 
  Printer, 
  Users, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Check, 
  Search,
  Filter,
  UserCheck
} from 'lucide-react';
import { 
  Escola, 
  Turma, 
  Aluno, 
  Disciplina, 
  Funcionario, 
  PresencaAlunoItem 
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
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

interface StudentAttendanceReportViewProps {
  escola: Escola;
  currentUser: Funcionario;
  turmas: Turma[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  funcionarios: Funcionario[];
}

export const StudentAttendanceReportView: React.FC<StudentAttendanceReportViewProps> = ({
  escola,
  currentUser,
  turmas,
  alunos,
  disciplinas,
  funcionarios
}) => {
  const todasClasses = useMemo(() => [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ], []);

  const [selectedClasse, setSelectedClasse] = useState<string>(() => {
    return turmas[0]?.classe ? normalizarClasse(turmas[0].classe) : '10ª';
  });

  const turmasDaClasse = useMemo(() => {
    const list = getTurmasPorClasse(turmas, selectedClasse);
    return list.length > 0 ? list : turmas;
  }, [turmas, selectedClasse]);

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmas[0]?.id || '');

  useEffect(() => {
    if (turmasDaClasse.length > 0 && !turmasDaClasse.some(t => t.id === selectedTurmaId)) {
      setSelectedTurmaId(turmasDaClasse[0].id);
    }
  }, [selectedClasse, turmasDaClasse, selectedTurmaId]);

  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<string>('todas');
  const [tipoPeriodo, setTipoPeriodo] = useState<'intervalo' | 'mes'>('intervalo');
  const [selectedMes, setSelectedMes] = useState<string>('2026-03');
  const [dataInicio, setDataInicio] = useState<string>('2026-03-01');
  const [dataFim, setDataFim] = useState<string>('2026-03-31');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const configSistema = dbService.getConfiguracaoSistema();

  // Turma selecionada
  const turmaSelecionada = turmas.find(t => t.id === selectedTurmaId) || turmasDaClasse[0] || turmas[0];

  // Disciplinas filtradas estritamente para a classe/curso da turma selecionada
  const disciplinasDaClasse = useMemo(() => {
    return getDisciplinasDaTurma(disciplinas, turmaSelecionada);
  }, [disciplinas, turmaSelecionada]);

  // Alunos desta turma
  const alunosDaTurma = useMemo(() => {
    return alunos
      .filter(a => a.turmaId === selectedTurmaId)
      .sort((a, b) => (a.numeroOrdem || 0) - (b.numeroOrdem || 0));
  }, [alunos, selectedTurmaId]);

  // Alunos filtrados por busca com proteção anti-ReDoS
  const alunosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return alunosDaTurma;
    return alunosDaTurma.filter(a => 
      safeSearchMatch(a.nomeCompleto, searchTerm) ||
      safeSearchMatch(a.numeroProcesso || a.codigoMatricula, searchTerm) ||
      safeSearchMatch(a.numeroBI, searchTerm)
    );
  }, [alunosDaTurma, searchTerm]);

  // Presenças salvas
  const [presencas, setPresencas] = useState<PresencaAlunoItem[]>(() => dbService.obterPresencasAlunos(selectedTurmaId));

  // Dias letivos calculados conforme o período selecionado (Início e Fim ou Mês)
  const diasLetivos = useMemo(() => {
    const nomesSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dias: { dia: number; dataStr: string; diaSemanaCurto: string }[] = [];

    if (tipoPeriodo === 'intervalo' && dataInicio && dataFim) {
      const dtInicio = new Date(`${dataInicio}T00:00:00`);
      const dtFim = new Date(`${dataFim}T00:00:00`);
      
      if (dtInicio <= dtFim) {
        const curr = new Date(dtInicio);
        while (curr <= dtFim) {
          const diaSemana = curr.getDay();
          // Segunda a Sexta (dias letivos)
          if (diaSemana >= 1 && diaSemana <= 5) {
            const ano = curr.getFullYear();
            const mes = String(curr.getMonth() + 1).padStart(2, '0');
            const diaNum = String(curr.getDate()).padStart(2, '0');
            dias.push({
              dia: curr.getDate(),
              dataStr: `${ano}-${mes}-${diaNum}`,
              diaSemanaCurto: nomesSemana[diaSemana]
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
        return dias;
      }
    }

    // Fallback para mês
    const [anoStr, mesStr] = selectedMes.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);
    const totalDias = new Date(ano, mes, 0).getDate();

    for (let d = 1; d <= totalDias; d++) {
      const dt = new Date(ano, mes - 1, d);
      const diaSemana = dt.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        const dStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dias.push({
          dia: d,
          dataStr: dStr,
          diaSemanaCurto: nomesSemana[diaSemana]
        });
      }
    }
    return dias;
  }, [tipoPeriodo, dataInicio, dataFim, selectedMes]);

  // Alternar presença do aluno num dia específico
  const togglePresenca = (alunoId: string, dataStr: string) => {
    // Permissão: Professor, Diretor, Subdiretor, Coordenador
    const rolesPermitidas = ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'Professor', 'Secretaria'];
    if (!rolesPermitidas.includes(currentUser.role)) return;

    const presencaAtual = presencas.find(p => p.alunoId === alunoId && p.data === dataStr && p.turmaId === selectedTurmaId);
    let novoEstado: 'Presente' | 'Falta_Justificada' | 'Falta_Injustificada' = 'Presente';
    
    if (presencaAtual) {
      if (presencaAtual.estado === 'Presente') novoEstado = 'Falta_Injustificada';
      else if (presencaAtual.estado === 'Falta_Injustificada') novoEstado = 'Falta_Justificada';
      else novoEstado = 'Presente';
    }

    const item: PresencaAlunoItem = {
      id: presencaAtual?.id || `pres-${alunoId}-${dataStr}`,
      escolaId: escola.id,
      turmaId: selectedTurmaId,
      alunoId,
      disciplinaId: selectedDisciplinaId !== 'todas' ? selectedDisciplinaId : undefined,
      data: dataStr,
      estado: novoEstado,
      registadoPorId: currentUser.id,
      registadoPorNome: currentUser.nomeCompleto
    };

    dbService.salvarPresencaAluno(item);
    setPresencas(dbService.obterPresencasAlunos(selectedTurmaId));
  };

  // Exportar Ficha de Presença para Excel (.xlsx)
  const handleExportarXLSX = () => {
    const wb = XLSX.utils.book_new();
    const periodoTexto = tipoPeriodo === 'intervalo' 
      ? `Período de ${dataInicio} até ${dataFim}` 
      : `Mês de Referência: ${selectedMes}`;

    const dadosCabecalho = [
      ['REPÚBLICA DE ANGOLA - MINISTÉRIO DA EDUCAÇÃO'],
      [escola.nomeOficial],
      [`FICHA OFICIAL DE PRESENÇAS E ASSIDUIDADE DOS ALUNOS - ${periodoTexto.toUpperCase()}`],
      [`Turma: ${turmaSelecionada?.nome || ''} (${turmaSelecionada?.classe || ''})`, `Turno: ${turmaSelecionada?.turno || ''}`, `Sala: ${turmaSelecionada?.sala || ''}`],
      []
    ];

    const titulosDias = diasLetivos.map(d => `${d.dia} (${d.diaSemanaCurto})`);
    const cabecalhoColunas = ['Nº', 'Processo', 'Nome Completo do Aluno', ...titulosDias, 'Presenças (P)', 'Faltas Injust. (FI)', 'Faltas Just. (FJ)', '% Assiduidade'];

    const linhasAlunos = alunosFiltrados.map((aluno, idx) => {
      let totalP = 0;
      let totalFI = 0;
      let totalFJ = 0;

      const diasValores = diasLetivos.map(d => {
        const reg = presencas.find(p => p.alunoId === aluno.id && p.data === d.dataStr);
        if (reg?.estado === 'Falta_Injustificada') {
          totalFI++;
          return 'FI';
        }
        if (reg?.estado === 'Falta_Justificada') {
          totalFJ++;
          return 'FJ';
        }
        totalP++;
        return 'P';
      });

      const totalAulas = diasLetivos.length;
      const pct = totalAulas > 0 ? Math.round((totalP / totalAulas) * 100) : 100;

      return [
        idx + 1,
        aluno.numeroProcesso || aluno.codigoMatricula,
        aluno.nomeCompleto,
        ...diasValores,
        totalP,
        totalFI,
        totalFJ,
        `${pct}%`
      ];
    });

    const wsData = [...dadosCabecalho, cabecalhoColunas, ...linhasAlunos];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Presencas');
    XLSX.writeFile(wb, `Ficha_Presencas_${turmaSelecionada?.nome || 'Turma'}_${tipoPeriodo === 'intervalo' ? `${dataInicio}_a_${dataFim}` : selectedMes}.xlsx`);
  };

  const handleBaixarHTML = () => {
    const el = document.getElementById('mapa-presencas-print');
    if (!el) return;
    const printContent = el.innerHTML;
    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Mapa de Presenças - ${turmaSelecionada?.nome || 'Turma'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; padding: 20px; color: #000; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; }
  </style>
</head>
<body class="p-6">
  ${printContent}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mapa_Presencas_${turmaSelecionada?.nome || 'Turma'}_${tipoPeriodo === 'intervalo' ? `${dataInicio}_a_${dataFim}` : selectedMes}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [gerandoPdf, setGerandoPdf] = useState(false);

  const handleBaixarPdf = async () => {
    const el = document.getElementById('mapa-presencas-print');
    if (!el) return;
    setGerandoPdf(true);
    try {
      const nome = `Ficha_Presencas_${turmaSelecionada?.nome || 'Turma'}_${tipoPeriodo === 'intervalo' ? `${dataInicio}_a_${dataFim}` : selectedMes}`;
      await downloadElementAsPdf(el, nome, { orientation: 'landscape' });
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles de Filtros e Seleção do Período */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Livro de Ponto & Assiduidade Oficial
              </span>
              <span className="text-xs text-gray-500">Documento Normativo MED</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center space-x-2">
              <ClipboardList className="h-6 w-6 text-emerald-600" />
              <span>Fichas de Presenças dos Alunos por Período</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Selecione o período de início e fim desejado para acompanhamento e emissão das folhas de chamada oficiais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportarXLSX}
              className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Baixar Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleBaixarHTML}
              className="px-3.5 py-2 text-xs font-bold text-blue-950 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="h-4 w-4 text-blue-700" />
              <span>Baixar HTML</span>
            </button>

            <button
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
              title="Gerar e transferir o documento oficial em ficheiro PDF (.pdf)"
            >
              <Download className="h-4 w-4" />
              <span>{gerandoPdf ? 'A Gerar PDF Oficial...' : 'Baixar em PDF (.pdf)'}</span>
            </button>
          </div>
        </div>

        {/* Alternador de Modo de Período: Intervalo vs Mês */}
        <div className="flex items-center space-x-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-700">Modo de Seleção do Período:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setTipoPeriodo('intervalo')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                tipoPeriodo === 'intervalo' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Período Específico (Data Início e Fim)
            </button>
            <button
              type="button"
              onClick={() => setTipoPeriodo('mes')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                tipoPeriodo === 'mes' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Mês Completo
            </button>
          </div>
        </div>

        {/* Barra de Filtros com Hierarquia Classe -> Turma -> Sala -> Curso e Disciplinas */}
        <div className="space-y-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-800">Associação da Ficha de Presenças:</span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                {turmaSelecionada?.classe} Classe
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Sala: {getSalaDaTurma(turmaSelecionada)}
              </span>
              {isSegundoCiclo(selectedClasse) && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Curso: {getCursoDaTurma(turmaSelecionada)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">1. Classe Curricular</label>
              <select
                value={selectedClasse}
                onChange={(e) => {
                  const novaC = e.target.value;
                  setSelectedClasse(novaC);
                  const validas = getTurmasPorClasse(turmas, novaC);
                  if (validas.length > 0) {
                    setSelectedTurmaId(validas[0].id);
                    setPresencas(dbService.obterPresencasAlunos(validas[0].id));
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {todasClasses.map(c => (
                  <option key={`att-cl-${c}`} value={c}>{c} {c !== 'Iniciação' ? 'Classe' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                2. Turma ({turmasDaClasse.length} na {selectedClasse})
              </label>
              <select
                value={selectedTurmaId}
                onChange={(e) => {
                  setSelectedTurmaId(e.target.value);
                  setPresencas(dbService.obterPresencasAlunos(e.target.value));
                }}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {turmasDaClasse.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} • {t.sala || 'Sala'} {isSegundoCiclo(t.classe) && t.curso ? `• ${t.curso}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">3. Disciplina Oficial</label>
              <select
                value={selectedDisciplinaId}
                onChange={(e) => setSelectedDisciplinaId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="todas">Todas as Disciplinas da Classe</option>
                {disciplinasDaClasse.map(d => (
                  <option key={d.id} value={d.id}>{d.nome} ({d.sigla})</option>
                ))}
              </select>
            </div>

            {tipoPeriodo === 'intervalo' ? (
              <>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data Término</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="lg:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Mês de Referência</label>
                <input
                  type="month"
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearchInput(e.target.value, 80))}
                maxLength={80}
                placeholder={`Pesquisar estudante por nome ou processo nesta turma (${alunosFiltrados.length} listados)...`}
                className="w-full p-2 pl-8 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <span>Legenda rápida:</span>
            <span className="flex items-center space-x-1 font-bold text-emerald-700">
              <span className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">P</span>
              <span>Presente</span>
            </span>
            <span className="flex items-center space-x-1 font-bold text-red-700">
              <span className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center text-[10px]">FI</span>
              <span>Falta Injustificada</span>
            </span>
            <span className="flex items-center space-x-1 font-bold text-amber-700">
              <span className="h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center text-[10px]">FJ</span>
              <span>Falta Justificada</span>
            </span>
          </div>
          <span className="italic text-[11px] text-gray-500">
            Dica: Clique em qualquer célula para alternar o estado de presença do dia.
          </span>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL PARA VISUALIZAÇÃO E IMPRESSÃO (A4 PAISAGEM) */}
      <div id="mapa-presencas-print" className="bg-white border-2 border-black rounded-xl p-6 shadow-md text-black print:border-none print:p-0">
        {/* Cabeçalho Oficial do Ministério da Educação */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <div className="flex justify-center mb-1">
            {configSistema.insigniaNacionalUrl ? (
              <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-12 w-12 object-contain mx-auto" />
            ) : (
              <InsigniaAngola size={44} />
            )}
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</p>
          <p className="text-[9.5px] font-bold uppercase">{escola.governoProvincial || 'GOVERNO PROVINCIAL'} • {escola.gabineteEducacao || 'GABINETE DA EDUCAÇÃO'}</p>
          <h2 className="text-sm sm:text-base font-black uppercase text-gray-950 mt-0.5">{escola.nomeOficial}</h2>
          <div className="inline-block bg-gray-100 border border-black px-4 py-1 mt-1 rounded text-xs font-black uppercase tracking-wide">
            {tipoPeriodo === 'intervalo'
              ? `MAPA DE CONTROLO DE ASSIDUIDADE — PERÍODO DE ${dataInicio.split('-').reverse().join('/')} ATÉ ${dataFim.split('-').reverse().join('/')}`
              : `MAPA DE CONTROLO DE ASSIDUIDADE E PRESENÇAS — MÊS DE ${selectedMes.toUpperCase()}`}
          </div>
          <div className="flex justify-center space-x-6 text-[10px] sm:text-[11px] font-bold text-gray-800 pt-2">
            <span>Turma: <strong>{turmaSelecionada?.nome} ({turmaSelecionada?.classe})</strong></span>
            <span>Turno: <strong>{turmaSelecionada?.turno}</strong></span>
            <span>Sala: <strong>{turmaSelecionada?.sala}</strong></span>
            <span>Ano Letivo: <strong>{escola.anoLectivoActivo || '2025/2026'}</strong></span>
          </div>
        </div>

        {/* Tabela de Presenças Diárias */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[10px] text-center">
            <thead>
              <tr className="bg-gray-100 font-extrabold border-b-2 border-black">
                <th className="p-1 border-r border-black w-7">Nº</th>
                <th className="p-1 border-r border-black w-20">PROCESSO</th>
                <th className="p-1 border-r border-black text-left w-48">NOME COMPLETO DO(A) ALUNO(A)</th>
                
                {/* Colunas dos Dias Úteis */}
                {diasLetivos.map(d => (
                  <th key={d.dia} className="p-0.5 border-r border-black w-6 text-[9px] font-mono">
                    <div>{d.dia}</div>
                    <div className="text-[7.5px] text-gray-600 font-normal">{d.diaSemanaCurto}</div>
                  </th>
                ))}

                {/* Colunas de Resumo de Faltas */}
                <th className="p-1 border-r border-black w-10 bg-emerald-50 text-emerald-900 font-bold" title="Total de Presenças">P</th>
                <th className="p-1 border-r border-black w-10 bg-red-50 text-red-900 font-bold" title="Faltas Injustificadas">FI</th>
                <th className="p-1 border-r border-black w-10 bg-amber-50 text-amber-900 font-bold" title="Faltas Justificadas">FJ</th>
                <th className="p-1 w-12 bg-gray-100 font-bold">% Assid.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {alunosFiltrados.map((aluno, idx) => {
                let totalP = 0;
                let totalFI = 0;
                let totalFJ = 0;

                return (
                  <tr key={aluno.id} className="hover:bg-gray-50/80">
                    <td className="p-1 border-r border-black font-mono font-bold">{idx + 1}</td>
                    <td className="p-1 border-r border-black font-mono font-medium">{aluno.numeroProcesso || aluno.codigoMatricula}</td>
                    <td className="p-1 border-r border-black text-left font-bold truncate max-w-[200px] uppercase">
                      {aluno.nomeCompleto}
                    </td>

                    {/* Células de cada dia útil */}
                    {diasLetivos.map(d => {
                      const reg = presencas.find(p => p.alunoId === aluno.id && p.data === d.dataStr);
                      let sigla = '•';
                      let estilo = 'text-gray-400 font-bold';

                      if (reg?.estado === 'Falta_Injustificada') {
                        sigla = 'FI';
                        estilo = 'text-red-700 font-black bg-red-100/60';
                        totalFI++;
                      } else if (reg?.estado === 'Falta_Justificada') {
                        sigla = 'FJ';
                        estilo = 'text-amber-700 font-black bg-amber-100/60';
                        totalFJ++;
                      } else {
                        sigla = 'P';
                        estilo = 'text-emerald-700 font-bold';
                        totalP++;
                      }

                      return (
                        <td 
                          key={d.dia} 
                          onClick={() => togglePresenca(aluno.id, d.dataStr)}
                          className={`p-0.5 border-r border-black cursor-pointer hover:bg-blue-100 select-none ${estilo}`}
                          title={`Clique para alterar (${aluno.nomeCompleto} em ${d.dataStr})`}
                        >
                          {sigla}
                        </td>
                      );
                    })}

                    {/* Resumos */}
                    <td className="p-1 border-r border-black font-mono font-bold text-emerald-800 bg-emerald-50/40">
                      {totalP}
                    </td>
                    <td className="p-1 border-r border-black font-mono font-black text-red-700 bg-red-50/40">
                      {totalFI}
                    </td>
                    <td className="p-1 border-r border-black font-mono font-bold text-amber-700 bg-amber-50/40">
                      {totalFJ}
                    </td>
                    <td className="p-1 font-mono font-black bg-gray-50">
                      {diasLetivos.length > 0 ? Math.round((totalP / diasLetivos.length) * 100) : 100}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Assinaturas Oficiais Regulamentares do MED */}
        <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs mt-6 border-t border-black">
          <div>
            <div className="w-44 border-b border-black mx-auto" />
            <p className="font-bold text-gray-900 mt-1">O(A) Professor(a) / Director de Turma</p>
            <p className="text-gray-600 text-[10px]">Data e Assinatura</p>
          </div>
          <div>
            <div className="w-44 border-b border-black mx-auto" />
            <p className="font-bold text-gray-900 mt-1">A Coordenação Pedagógica</p>
            <p className="text-gray-600 text-[10px]">Visto em Conformidade</p>
          </div>
          <div>
            <div className="w-44 border-b border-black mx-auto" />
            <p className="font-bold text-gray-900 mt-1">O Subdirector Pedagógico</p>
            <p className="text-gray-600 text-[10px]">{escola.subdiretorPedagogicoNome || 'Direcção da Escola'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
