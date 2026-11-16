import * as XLSX from 'xlsx';
import {
  Aluno,
  AvaliacaoCriada,
  Disciplina,
  Escola,
  NotaEstudante,
  NotaTrimestralConsolidada,
  RegraCalculoMAC,
  Turma
} from '../types';
import {
  calcularMACEstudante,
  calcularMediaFinal3Trimestre,
  calcularNotaTrimestralDinamica,
  converterComportamentoParaConceito,
  isClasseFinal,
  obterInformacaoEscala
} from '../services/macEngine';

function colLetter(colIdx0: number): string {
  let n = colIdx0;
  let letter = '';
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function setCell(
  ws: XLSX.WorkSheet,
  r0: number,
  c0: number,
  cell: XLSX.CellObject
) {
  const addr = XLSX.utils.encode_cell({ r: r0, c: c0 });
  ws[addr] = cell;
}

function strCell(val: string): XLSX.CellObject {
  return { t: 's', v: val ?? '' };
}

function numCell(val: number, z?: string): XLSX.CellObject {
  const obj: XLSX.CellObject = { t: 'n', v: Number.isFinite(val) ? val : 0 };
  if (z) obj.z = z;
  return obj;
}

function formulaNumCell(formula: string, fallback: number, z: string = '0.0'): XLSX.CellObject {
  return {
    t: 'n',
    v: Number.isFinite(fallback) ? fallback : 0,
    f: formula.replace(/^=/, ''),
    z
  };
}

function percentFormulaCell(formula: string, fallbackRatio: number): XLSX.CellObject {
  return {
    t: 'n',
    v: Number.isFinite(fallbackRatio) ? fallbackRatio : 0,
    f: formula.replace(/^=/, ''),
    z: '0.0%'
  };
}

function formulaStrCell(formula: string, fallback: string): XLSX.CellObject {
  return {
    t: 's',
    v: fallback,
    f: formula.replace(/^=/, '')
  };
}

function finalizeSheetRange(
  ws: XLSX.WorkSheet,
  totalRows: number,
  totalCols: number,
  colWidths: number[],
  merges: XLSX.Range[]
) {
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, totalRows - 1), c: Math.max(0, totalCols - 1) }
  });
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
}

function buildInstitutionalBanner(
  ws: XLSX.WorkSheet,
  escola: Escola,
  tituloDocumento: string,
  subtituloLinha: string,
  totalCols: number
): { nextRow0: number; merges: XLSX.Range[] } {
  const lastCol = Math.max(0, totalCols - 1);
  const merges: XLSX.Range[] = [];

  const linhas = [
    'REPÚBLICA DE ANGOLA',
    escola.governoProvincial || `GOVERNO PROVINCIAL DE ${(escola.provincia || 'ANGOLA').toUpperCase()}`,
    escola.gabineteEducacao || 'GABINETE PROVINCIAL / DIRECÇÃO MUNICIPAL DA EDUCAÇÃO',
    (escola.nomeOficial || escola.nome || 'INSTITUIÇÃO DE ENSINO').toUpperCase(),
    tituloDocumento.toUpperCase(),
    subtituloLinha
  ];

  linhas.forEach((texto, idx) => {
    setCell(ws, idx, 0, strCell(texto));
    if (lastCol > 0) {
      merges.push({ s: { r: idx, c: 0 }, e: { r: idx, c: lastCol } });
    }
  });

  // Linha 6 em branco antes do cabeçalho da tabela
  return { nextRow0: linhas.length + 1, merges };
}

function sanitizeFilenamePart(val: string): string {
  return (val || 'Documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Documento';
}

export interface PautaGeralExcelParams {
  escola: Escola;
  turma: Turma;
  alunos: Aluno[];
  disciplinas: Disciplina[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  pautaSubTipo: 'geral_final' | 'trimestral';
  pautaTrimestre?: string;
  anoLectivo: string;
}

/**
 * Exporta a Pauta Geral Final ou Trimestral em Excel (.xlsx) com fórmulas reais para
 * Disciplinas Positivas/Negativas, Média Individual, Observação (Aprovado/Recurso/Reprovado)
 * e Sumário Estatístico da Turma (Aprovados, % Aprovação, Insucesso, Média da Turma).
 */
export function exportarPautaGeralExcel(params: PautaGeralExcelParams): void {
  const {
    escola,
    turma,
    alunos,
    disciplinas,
    notasConsolidadas,
    pautaSubTipo,
    pautaTrimestre = '1',
    anoLectivo
  } = params;

  const escalaInfo = obterInformacaoEscala(turma?.classe, turma?.nivelEnsino);
  const notaAprov = escalaInfo.notaAprovacao;
  const ehIniciacao = (turma?.classe || '').toLowerCase().includes('inicia');

  const discs = disciplinas.length > 0 ? disciplinas : [{ id: 'geral', nome: 'Média Geral', sigla: 'GER' } as Disciplina];
  const fixedLeftHeaders = ['Nº', 'Proc. Nº', 'Nome Completo do Estudante', 'Gênero'];
  const discHeaders = discs.map((d) => d.sigla || d.nome.substring(0, 8).toUpperCase());
  const rightHeaders = ['Pos.', 'Neg.', 'Média', 'Comportamento', 'Observação / Resultado'];
  const headers = [...fixedLeftHeaders, ...discHeaders, ...rightHeaders];

  const totalCols = headers.length;
  const firstDiscCol0 = fixedLeftHeaders.length;
  const lastDiscCol0 = firstDiscCol0 + discs.length - 1;
  const posCol0 = lastDiscCol0 + 1;
  const negCol0 = lastDiscCol0 + 2;
  const medCol0 = lastDiscCol0 + 3;
  const compCol0 = lastDiscCol0 + 4;
  const obsCol0 = lastDiscCol0 + 5;

  const firstDiscL = colLetter(firstDiscCol0);
  const lastDiscL = colLetter(lastDiscCol0);
  const genL = colLetter(3);
  const posL = colLetter(posCol0);
  const negL = colLetter(negCol0);
  const medL = colLetter(medCol0);
  const obsL = colLetter(obsCol0);

  const ws: XLSX.WorkSheet = {};
  const titulo =
    pautaSubTipo === 'trimestral'
      ? `PAUTA OFICIAL DO ${pautaTrimestre}º TRIMESTRE — ${turma.classe} (${turma.nome})`
      : `PAUTA GERAL FINAL — ${turma.classe} (${turma.nome})`;
  const subtitulo = `Ano Lectivo: ${anoLectivo} | Turma: ${turma.nome} | Turno: ${turma.turno || '—'} | Sala: ${turma.sala || '—'} | Escala: 0–${escalaInfo.escalaMaxima} (Aprovação >= ${notaAprov})`;

  const { nextRow0: headerRow0, merges } = buildInstitutionalBanner(ws, escola, titulo, subtitulo, totalCols);
  headers.forEach((h, c0) => setCell(ws, headerRow0, c0, strCell(h)));

  const dataStartRow0 = headerRow0 + 1;
  const firstExcelR = dataStartRow0 + 1;

  let curRow0 = dataStartRow0;
  let totalAvaliadosFallback = 0;
  let aprovadosFallback = 0;
  let recursoFallback = 0;
  let reprovadosFallback = 0;
  let somaMediasTurma = 0;

  alunos.forEach((aluno, idx) => {
    const excelR = curRow0 + 1;
    setCell(ws, curRow0, 0, numCell(aluno.numeroOrdem || idx + 1, '0'));
    setCell(ws, curRow0, 1, strCell(aluno.numeroProcesso || aluno.codigoMatricula || '—'));
    setCell(ws, curRow0, 2, strCell(aluno.nomeCompleto));
    setCell(ws, curRow0, 3, strCell(aluno.genero === 'F' ? 'F' : 'M'));

    let somaAluno = 0;
    let countAluno = 0;
    let posAluno = 0;
    let negAluno = 0;

    discs.forEach((d, dIdx) => {
      const c0 = firstDiscCol0 + dIdx;
      const nConsol = notasConsolidadas.find(
        (nc) =>
          nc.alunoId === aluno.id &&
          nc.disciplinaId === d.id &&
          (pautaSubTipo !== 'trimestral' || String(nc.trimestre).includes(String(pautaTrimestre)))
      );
      const valorRaw =
        pautaSubTipo === 'trimestral'
          ? (nConsol?.mediaTrimestral ?? nConsol?.notaFinal)
          : (nConsol?.notaFinal ?? nConsol?.mediaTrimestral);

      if (valorRaw !== undefined && valorRaw !== null && !Number.isNaN(Number(valorRaw))) {
        const notaArred = Math.round(Number(valorRaw) * 10) / 10;
        setCell(ws, curRow0, c0, numCell(notaArred, '0.0'));
        somaAluno += notaArred;
        countAluno++;
        if (notaArred >= notaAprov) posAluno++;
        else negAluno++;
      }
    });

    const mediaAluno = countAluno > 0 ? Math.round((somaAluno / countAluno) * 10) / 10 : 0;
    if (countAluno > 0) {
      totalAvaliadosFallback++;
      somaMediasTurma += mediaAluno;
    }

    // Fórmula Excel Positivas & Negativas
    setCell(
      ws,
      curRow0,
      posCol0,
      formulaNumCell(`COUNTIF(${firstDiscL}${excelR}:${lastDiscL}${excelR},">="&${notaAprov})`, posAluno, '0')
    );
    setCell(
      ws,
      curRow0,
      negCol0,
      formulaNumCell(`COUNTIF(${firstDiscL}${excelR}:${lastDiscL}${excelR},"<"&${notaAprov})`, negAluno, '0')
    );

    // Fórmula Excel Média do Aluno
    setCell(
      ws,
      curRow0,
      medCol0,
      formulaNumCell(
        `IF(COUNT(${firstDiscL}${excelR}:${lastDiscL}${excelR})>0,ROUND(AVERAGE(${firstDiscL}${excelR}:${lastDiscL}${excelR}),1),0)`,
        mediaAluno,
        '0.0'
      )
    );

    // Comportamento
    const notasComp = notasConsolidadas
      .filter((n) => n.alunoId === aluno.id && typeof n.comportamentoNota === 'number' && n.comportamentoNota > 0)
      .map((n) => n.comportamentoNota as number);
    const compTexto =
      notasComp.length > 0
        ? converterComportamentoParaConceito(
            notasComp.reduce((a, b) => a + b, 0) / notasComp.length,
            escalaInfo.escalaMaxima
          )
        : (aluno.comportamentoConceito || '—');
    setCell(ws, curRow0, compCol0, strCell(compTexto));

    // Observação com fórmula real
    let obsFallback = 'Sem Notas';
    if (countAluno > 0) {
      if (ehIniciacao) {
        obsFallback = 'Avaliação Qualitativa';
      } else if (negAluno === 0) {
        obsFallback = aluno.genero === 'F' ? 'Aprovada' : 'Aprovado';
        aprovadosFallback++;
      } else if (negAluno <= 2) {
        obsFallback = 'Apto Recurso';
        recursoFallback++;
      } else {
        obsFallback = aluno.genero === 'F' ? 'Reprovada' : 'Reprovado';
        reprovadosFallback++;
      }
    }

    const obsFormula = ehIniciacao
      ? `IF(COUNT(${firstDiscL}${excelR}:${lastDiscL}${excelR})=0,"Sem Notas","Avaliação Qualitativa")`
      : `IF(COUNT(${firstDiscL}${excelR}:${lastDiscL}${excelR})=0,"Sem Notas",IF(${negL}${excelR}=0,IF(${genL}${excelR}="F","Aprovada","Aprovado"),IF(${negL}${excelR}<=2,"Apto Recurso",IF(${genL}${excelR}="F","Reprovada","Reprovado"))))`;

    setCell(ws, curRow0, obsCol0, formulaStrCell(obsFormula, obsFallback));
    curRow0++;
  });

  const lastExcelR = Math.max(firstExcelR, curRow0);

  // Linha de Médias por Disciplina
  if (alunos.length > 0) {
    const mediaRow0 = curRow0;
    const mediaExcelR = mediaRow0 + 1;
    setCell(ws, mediaRow0, 2, strCell('MÉDIA GERAL POR DISCIPLINA / TURMA'));
    discs.forEach((d, dIdx) => {
      const c0 = firstDiscCol0 + dIdx;
      const colL = colLetter(c0);
      const vals = alunos
        .map((a) => {
          const nc = notasConsolidadas.find(
            (x) =>
              x.alunoId === a.id &&
              x.disciplinaId === d.id &&
              (pautaSubTipo !== 'trimestral' || String(x.trimestre).includes(String(pautaTrimestre)))
          );
          return pautaSubTipo === 'trimestral'
            ? (nc?.mediaTrimestral ?? nc?.notaFinal)
            : (nc?.notaFinal ?? nc?.mediaTrimestral);
        })
        .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
      const mediaDiscFallback = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
      setCell(
        ws,
        mediaRow0,
        c0,
        formulaNumCell(`IFERROR(ROUND(AVERAGE(${colL}${firstExcelR}:${colL}${lastExcelR}),1),0)`, mediaDiscFallback, '0.0')
      );
    });

    const mediaGeralTurma = totalAvaliadosFallback > 0 ? Math.round((somaMediasTurma / totalAvaliadosFallback) * 10) / 10 : 0;
    setCell(
      ws,
      mediaRow0,
      medCol0,
      formulaNumCell(`IFERROR(ROUND(AVERAGE(${medL}${firstExcelR}:${medL}${lastExcelR}),1),0)`, mediaGeralTurma, '0.0')
    );
    setCell(ws, mediaRow0, posCol0, formulaNumCell(`SUM(${posL}${firstExcelR}:${posL}${lastExcelR})`, 0, '0'));
    setCell(ws, mediaRow0, negCol0, formulaNumCell(`SUM(${negL}${firstExcelR}:${negL}${lastExcelR})`, 0, '0'));
    setCell(ws, mediaRow0, obsCol0, strCell(`Média Turma (Excel Row ${mediaExcelR})`));
    curRow0++;
  }

  // Bloco Resumo Estatístico da Turma (Fórmulas Reais)
  curRow0++; // linha vazia
  const summaryHeaderRow0 = curRow0;
  setCell(ws, summaryHeaderRow0, 0, strCell('RESUMO ESTATÍSTICO DA PAUTA (CÁLCULOS AUTOMÁTICOS)'));
  if (totalCols > 1) {
    merges.push({ s: { r: summaryHeaderRow0, c: 0 }, e: { r: summaryHeaderRow0, c: 3 } });
  }
  curRow0++;

  const rowMatriculados0 = curRow0++;
  const rowAvaliados0 = curRow0++;
  const rowAprovados0 = curRow0++;
  const rowPercAprov0 = curRow0++;
  const rowRecurso0 = curRow0++;
  const rowReprovados0 = curRow0++;
  const rowPercReprov0 = curRow0++;
  const rowMediaGeral0 = curRow0++;

  const rMat = rowMatriculados0 + 1;
  const rAval = rowAvaliados0 + 1;
  const rApr = rowAprovados0 + 1;
  const rRec = rowRecurso0 + 1;
  const rRep = rowReprovados0 + 1;

  const valCol = 2; // coluna C
  const valL = colLetter(valCol);

  setCell(ws, rowMatriculados0, 0, strCell('Total de Estudantes Matriculados'));
  merges.push({ s: { r: rowMatriculados0, c: 0 }, e: { r: rowMatriculados0, c: 1 } });
  setCell(ws, rowMatriculados0, valCol, formulaNumCell(`COUNTA(C${firstExcelR}:C${lastExcelR})`, alunos.length, '0'));

  setCell(ws, rowAvaliados0, 0, strCell('Estudantes Avaliados Efectivos'));
  merges.push({ s: { r: rowAvaliados0, c: 0 }, e: { r: rowAvaliados0, c: 1 } });
  setCell(ws, rowAvaliados0, valCol, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"<>Sem Notas")`, totalAvaliadosFallback, '0'));

  setCell(ws, rowAprovados0, 0, strCell('Aprovados (Transitam)'));
  merges.push({ s: { r: rowAprovados0, c: 0 }, e: { r: rowAprovados0, c: 1 } });
  setCell(ws, rowAprovados0, valCol, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Aprovad*")`, aprovadosFallback, '0'));

  setCell(ws, rowPercAprov0, 0, strCell('Percentagem de Aprovação (%)'));
  merges.push({ s: { r: rowPercAprov0, c: 0 }, e: { r: rowPercAprov0, c: 1 } });
  const percAprovRatio = totalAvaliadosFallback > 0 ? aprovadosFallback / totalAvaliadosFallback : 0;
  setCell(ws, rowPercAprov0, valCol, percentFormulaCell(`IF(${valL}${rAval}>0,${valL}${rApr}/${valL}${rAval},0)`, percAprovRatio));

  setCell(ws, rowRecurso0, 0, strCell('Aptos para Exame de Recurso'));
  merges.push({ s: { r: rowRecurso0, c: 0 }, e: { r: rowRecurso0, c: 1 } });
  setCell(ws, rowRecurso0, valCol, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"*Recurso*")`, recursoFallback, '0'));

  setCell(ws, rowReprovados0, 0, strCell('Não Transitam / Reprovados'));
  merges.push({ s: { r: rowReprovados0, c: 0 }, e: { r: rowReprovados0, c: 1 } });
  setCell(ws, rowReprovados0, valCol, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Reprovad*")`, reprovadosFallback, '0'));

  setCell(ws, rowPercReprov0, 0, strCell('Percentagem de Insucesso / Reprovação (%)'));
  merges.push({ s: { r: rowPercReprov0, c: 0 }, e: { r: rowPercReprov0, c: 1 } });
  const percReprovRatio = totalAvaliadosFallback > 0 ? (recursoFallback + reprovadosFallback) / totalAvaliadosFallback : 0;
  setCell(ws, rowPercReprov0, valCol, percentFormulaCell(`IF(${valL}${rAval}>0,(${valL}${rRec}+${valL}${rRep})/${valL}${rAval},0)`, percReprovRatio));

  setCell(ws, rowMediaGeral0, 0, strCell('Média Geral da Turma'));
  merges.push({ s: { r: rowMediaGeral0, c: 0 }, e: { r: rowMediaGeral0, c: 1 } });
  const mediaGeralTurma = totalAvaliadosFallback > 0 ? Math.round((somaMediasTurma / totalAvaliadosFallback) * 10) / 10 : 0;
  setCell(ws, rowMediaGeral0, valCol, formulaNumCell(`IFERROR(ROUND(AVERAGE(${medL}${firstExcelR}:${medL}${lastExcelR}),1),0)`, mediaGeralTurma, '0.0'));

  const colWidths = [
    6, // Nº
    16, // Proc
    34, // Nome
    9, // Gênero
    ...discs.map(() => 10),
    8, // Pos
    8, // Neg
    10, // Média
    16, // Comportamento
    20 // Observação
  ];

  finalizeSheetRange(ws, curRow0, totalCols, colWidths, merges);

  const wb = XLSX.utils.book_new();
  const sheetName = pautaSubTipo === 'trimestral' ? `Pauta_${pautaTrimestre}T` : 'Pauta_Geral';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fname = `Pauta_${pautaSubTipo === 'trimestral' ? `${pautaTrimestre}Trim_` : 'Geral_'}${sanitizeFilenamePart(turma.classe)}_${sanitizeFilenamePart(turma.nome)}_${sanitizeFilenamePart(anoLectivo)}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export interface PautaDisciplinaExcelParams {
  escola: Escola;
  turma: Turma;
  disciplina?: Disciplina;
  alunos: Aluno[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  anoLectivo: string;
  provaProfessorAtiva: boolean;
  regraVigente?: RegraCalculoMAC;
}

/**
 * Exporta a Pauta Anual da Disciplina (MT1, MT2, MT3, Exame, MFD e Observação) em Excel (.xlsx)
 * com fórmulas dinâmicas de Média Final, Observação por Género e Sumário de Percentagens.
 */
export function exportarPautaDisciplinaAnualExcel(params: PautaDisciplinaExcelParams): void {
  const {
    escola,
    turma,
    disciplina,
    alunos,
    notasConsolidadas,
    anoLectivo,
    provaProfessorAtiva,
    regraVigente
  } = params;

  const escalaInfo = obterInformacaoEscala(turma?.classe, turma?.nivelEnsino);
  const notaAprov = escalaInfo.notaAprovacao;
  const ehFinal = isClasseFinal(turma?.classe, regraVigente);
  const ehIniciacao = (turma?.classe || '').toLowerCase().includes('inicia');

  const headers: string[] = [
    'Nº',
    'Proc. Nº',
    'Nome Completo do Estudante',
    'Gênero',
    'MAC',
    ...(provaProfessorAtiva ? ['NPP'] : []),
    'MT1',
    'MT2',
    'MT3',
    ...(ehFinal ? ['Exame'] : []),
    'MFD',
    'Comportamento',
    'Observação / Resultado'
  ];

  const totalCols = headers.length;
  const genCol0 = 3;
  const mt1Col0 = provaProfessorAtiva ? 6 : 5;
  const mt2Col0 = mt1Col0 + 1;
  const mt3Col0 = mt1Col0 + 2;
  const exCol0 = ehFinal ? mt3Col0 + 1 : -1;
  const mfdCol0 = ehFinal ? mt3Col0 + 2 : mt3Col0 + 1;
  const compCol0 = mfdCol0 + 1;
  const obsCol0 = mfdCol0 + 2;

  const genL = colLetter(genCol0);
  const mt1L = colLetter(mt1Col0);
  const mt3L = colLetter(mt3Col0);
  const exL = exCol0 >= 0 ? colLetter(exCol0) : '';
  const mfdL = colLetter(mfdCol0);
  const obsL = colLetter(obsCol0);

  const ws: XLSX.WorkSheet = {};
  const titulo = `PAUTA DA DISCIPLINA DE ${(disciplina?.nome || 'DISCIPLINA').toUpperCase()} — ${turma.classe} (${turma.nome})`;
  const subtitulo = `Ano Lectivo: ${anoLectivo} | Turno: ${turma.turno || '—'} | Sala: ${turma.sala || '—'} | Escala: 0–${escalaInfo.escalaMaxima} (Aprovação >= ${notaAprov})`;

  const { nextRow0: headerRow0, merges } = buildInstitutionalBanner(ws, escola, titulo, subtitulo, totalCols);
  headers.forEach((h, c0) => setCell(ws, headerRow0, c0, strCell(h)));

  const firstDataRow0 = headerRow0 + 1;
  const firstExcelR = firstDataRow0 + 1;
  let curRow0 = firstDataRow0;

  let totalAvaliados = 0;
  let aprovados = 0;
  let recurso = 0;
  let reprovados = 0;
  let somaMfd = 0;

  const pesoNE = regraVigente?.pesoNEClassesFinais || (regraVigente?.pesoExameFinal ? (regraVigente.pesoExameFinal > 1 ? regraVigente.pesoExameFinal : regraVigente.pesoExameFinal * 100) : 60);
  const pesoMDF = regraVigente?.pesoMDFClassesFinais || (regraVigente?.pesoMediasTrimestrais ? (regraVigente.pesoMediasTrimestrais > 1 ? regraVigente.pesoMediasTrimestrais : regraVigente.pesoMediasTrimestrais * 100) : 40);
  const totalPesos = pesoNE + pesoMDF || 100;

  alunos.forEach((aluno, idx) => {
    const excelR = curRow0 + 1;
    const notasAl = notasConsolidadas.filter(
      (n) => n.alunoId === aluno.id && (!disciplina || n.disciplinaId === disciplina.id)
    );
    const n1 = notasAl.find((n) => String(n.trimestre).includes('1'));
    const n2 = notasAl.find((n) => String(n.trimestre).includes('2'));
    const n3 = notasAl.find((n) => String(n.trimestre).includes('3'));

    const mac = n3?.mac ?? n2?.mac ?? n1?.mac;
    const npp = n3?.npp ?? n2?.npp ?? n1?.npp;
    const mt1 = n1?.mediaTrimestral ?? n1?.notaFinal;
    const mt2 = n2?.mediaTrimestral ?? n2?.notaFinal;
    const mt3 = n3?.mediaTrimestral ?? n3?.notaFinal;
    const exame = ehFinal ? (n3?.notaExame ?? n2?.notaExame ?? n1?.notaExame) : undefined;

    setCell(ws, curRow0, 0, numCell(aluno.numeroOrdem || idx + 1, '0'));
    setCell(ws, curRow0, 1, strCell(aluno.numeroProcesso || aluno.codigoMatricula || '—'));
    setCell(ws, curRow0, 2, strCell(aluno.nomeCompleto));
    setCell(ws, curRow0, genCol0, strCell(aluno.genero === 'F' ? 'F' : 'M'));
    if (typeof mac === 'number') setCell(ws, curRow0, 4, numCell(mac, '0.0'));
    if (provaProfessorAtiva && typeof npp === 'number') {
      setCell(ws, curRow0, 5, numCell(npp, '0.0'));
    }
    if (typeof mt1 === 'number') setCell(ws, curRow0, mt1Col0, numCell(mt1, '0.0'));
    if (typeof mt2 === 'number') setCell(ws, curRow0, mt2Col0, numCell(mt2, '0.0'));
    if (typeof mt3 === 'number') setCell(ws, curRow0, mt3Col0, numCell(mt3, '0.0'));
    if (ehFinal && typeof exame === 'number') {
      setCell(ws, curRow0, exCol0, numCell(exame, '0.0'));
    }

    const mtsValidos = [mt1, mt2, mt3].filter((x): x is number => typeof x === 'number' && !Number.isNaN(x));
    let mfdFallback = 0;
    if (mtsValidos.length > 0) {
      const avgMt = mtsValidos.reduce((a, b) => a + b, 0) / mtsValidos.length;
      if (ehFinal && typeof exame === 'number' && !Number.isNaN(exame)) {
        mfdFallback = Math.round(((avgMt * pesoMDF + exame * pesoNE) / totalPesos) * 10) / 10;
      } else {
        mfdFallback = Math.round(avgMt * 10) / 10;
      }
      totalAvaliados++;
      somaMfd += mfdFallback;
    }

    const mfdFormula = ehFinal
      ? `IF(COUNT(${mt1L}${excelR}:${mt3L}${excelR})=0,0,IF(ISNUMBER(${exL}${excelR}),ROUND(((AVERAGE(${mt1L}${excelR}:${mt3L}${excelR})*${pesoMDF})+(${exL}${excelR}*${pesoNE}))/${totalPesos},1),ROUND(AVERAGE(${mt1L}${excelR}:${mt3L}${excelR}),1)))`
      : `IF(COUNT(${mt1L}${excelR}:${mt3L}${excelR})=0,0,ROUND(AVERAGE(${mt1L}${excelR}:${mt3L}${excelR}),1))`;

    setCell(ws, curRow0, mfdCol0, formulaNumCell(mfdFormula, mfdFallback, '0.0'));
    setCell(ws, curRow0, compCol0, strCell(aluno.comportamentoConceito || '—'));

    let obsFallback = 'Sem Notas';
    if (mtsValidos.length > 0) {
      if (ehIniciacao) {
        obsFallback = 'Avaliação Qualitativa';
      } else if (mfdFallback >= notaAprov) {
        obsFallback = aluno.genero === 'F' ? 'Aprovada' : 'Aprovado';
        aprovados++;
      } else if (!escalaInfo.ehPrimario && mfdFallback >= 7) {
        obsFallback = 'Recurso';
        recurso++;
      } else {
        obsFallback = aluno.genero === 'F' ? 'Reprovada' : 'Reprovado';
        reprovados++;
      }
    }

    const obsFormula = ehIniciacao
      ? `IF(COUNT(${mt1L}${excelR}:${mt3L}${excelR})=0,"Sem Notas","Avaliação Qualitativa")`
      : escalaInfo.ehPrimario
        ? `IF(COUNT(${mt1L}${excelR}:${mt3L}${excelR})=0,"Sem Notas",IF(${mfdL}${excelR}>=${notaAprov},IF(${genL}${excelR}="F","Aprovada","Aprovado"),IF(${genL}${excelR}="F","Reprovada","Reprovado")))`
        : `IF(COUNT(${mt1L}${excelR}:${mt3L}${excelR})=0,"Sem Notas",IF(${mfdL}${excelR}>=${notaAprov},IF(${genL}${excelR}="F","Aprovada","Aprovado"),IF(${mfdL}${excelR}>=7,"Recurso",IF(${genL}${excelR}="F","Reprovada","Reprovado"))))`;

    setCell(ws, curRow0, obsCol0, formulaStrCell(obsFormula, obsFallback));
    curRow0++;
  });

  const lastExcelR = Math.max(firstExcelR, curRow0);
  curRow0++; // linha em branco

  const sumHeaderRow0 = curRow0++;
  setCell(ws, sumHeaderRow0, 0, strCell('ESTATÍSTICA DA DISCIPLINA (FÓRMULAS EXCEL)'));
  merges.push({ s: { r: sumHeaderRow0, c: 0 }, e: { r: sumHeaderRow0, c: 3 } });

  const rMat0 = curRow0++;
  const rAval0 = curRow0++;
  const rApr0 = curRow0++;
  const rPercApr0 = curRow0++;
  const rRep0 = curRow0++;
  const rPercRep0 = curRow0++;
  const rMed0 = curRow0++;

  const valC0 = 2;
  const valL = colLetter(valC0);
  const rAvalE = rAval0 + 1;
  const rAprE = rApr0 + 1;
  const rRepE = rRep0 + 1;

  setCell(ws, rMat0, 0, strCell('Total Matriculados'));
  merges.push({ s: { r: rMat0, c: 0 }, e: { r: rMat0, c: 1 } });
  setCell(ws, rMat0, valC0, formulaNumCell(`COUNTA(C${firstExcelR}:C${lastExcelR})`, alunos.length, '0'));

  setCell(ws, rAval0, 0, strCell('Avaliados'));
  merges.push({ s: { r: rAval0, c: 0 }, e: { r: rAval0, c: 1 } });
  setCell(ws, rAval0, valC0, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"<>Sem Notas")`, totalAvaliados, '0'));

  setCell(ws, rApr0, 0, strCell('Aprovados'));
  merges.push({ s: { r: rApr0, c: 0 }, e: { r: rApr0, c: 1 } });
  setCell(ws, rApr0, valC0, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Aprovad*")`, aprovados, '0'));

  setCell(ws, rPercApr0, 0, strCell('% Aprovação'));
  merges.push({ s: { r: rPercApr0, c: 0 }, e: { r: rPercApr0, c: 1 } });
  setCell(ws, rPercApr0, valC0, percentFormulaCell(`IF(${valL}${rAvalE}>0,${valL}${rAprE}/${valL}${rAvalE},0)`, totalAvaliados > 0 ? aprovados / totalAvaliados : 0));

  setCell(ws, rRep0, 0, strCell('Reprovados / Recurso'));
  merges.push({ s: { r: rRep0, c: 0 }, e: { r: rRep0, c: 1 } });
  setCell(ws, rRep0, valC0, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Reprovad*")+COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Recurso")`, reprovados + recurso, '0'));

  setCell(ws, rPercRep0, 0, strCell('% Insucesso'));
  merges.push({ s: { r: rPercRep0, c: 0 }, e: { r: rPercRep0, c: 1 } });
  setCell(ws, rPercRep0, valC0, percentFormulaCell(`IF(${valL}${rAvalE}>0,${valL}${rRepE}/${valL}${rAvalE},0)`, totalAvaliados > 0 ? (reprovados + recurso) / totalAvaliados : 0));

  setCell(ws, rMed0, 0, strCell('Média da Turma na Disciplina'));
  merges.push({ s: { r: rMed0, c: 0 }, e: { r: rMed0, c: 1 } });
  const medDisciplina = totalAvaliados > 0 ? Math.round((somaMfd / totalAvaliados) * 10) / 10 : 0;
  setCell(ws, rMed0, valC0, formulaNumCell(`IFERROR(ROUND(AVERAGE(${mfdL}${firstExcelR}:${mfdL}${lastExcelR}),1),0)`, medDisciplina, '0.0'));

  const colWidths = [
    6, 16, 34, 8, 9,
    ...(provaProfessorAtiva ? [9] : []),
    9, 9, 9,
    ...(ehFinal ? [9] : []),
    10, 15, 18
  ];

  finalizeSheetRange(ws, curRow0, totalCols, colWidths, merges);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pauta_Disciplina');
  const fname = `Pauta_Disciplina_${sanitizeFilenamePart(disciplina?.sigla || disciplina?.nome || 'Disc')}_${sanitizeFilenamePart(turma.nome)}_${sanitizeFilenamePart(anoLectivo)}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export interface PautaTrimestralAvaliacaoExcelParams {
  escola: Escola;
  turma: Turma;
  disciplina?: Disciplina;
  alunos: Aluno[];
  avaliacoesDaTurma: AvaliacaoCriada[];
  notasAvaliacoes: NotaEstudante[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  trimestre: 1 | 2 | 3;
  regraVigente?: RegraCalculoMAC;
  provaProfessorAtiva: boolean;
  anoLectivo: string;
}

/**
 * Exporta a Pauta Trimestral / Folha de Lançamento de MAC + NPP + PT + MT (+ Exame + MF)
 * em Excel (.xlsx) com fórmulas reais para cada avaliação, MAC, Média Trimestral, Média Final e Observação.
 */
export function exportarPautaTrimestralComFormulasExcel(params: PautaTrimestralAvaliacaoExcelParams): void {
  const {
    escola,
    turma,
    disciplina,
    alunos,
    avaliacoesDaTurma,
    notasAvaliacoes,
    notasConsolidadas,
    trimestre,
    regraVigente,
    provaProfessorAtiva,
    anoLectivo
  } = params;

  const escalaInfo = obterInformacaoEscala(turma?.classe, turma?.nivelEnsino);
  const notaAprov = escalaInfo.notaAprovacao;
  const ehFinal = isClasseFinal(turma?.classe, regraVigente);
  const ehTrim3 = Number(trimestre) === 3;
  const ehIniciacao = (turma?.classe || '').toLowerCase().includes('inicia');

  const avTitles = avaliacoesDaTurma.map((a, idx) => a.titulo || `Av${idx + 1}`);
  const headers: string[] = [
    'Nº',
    'Nº Matrícula',
    'Nome Completo do Estudante',
    'Gênero',
    ...avTitles,
    'MAC',
    ...(provaProfessorAtiva ? ['NPP'] : []),
    'PT',
    ehTrim3 ? 'MT3' : `MT${trimestre}`,
    ...(ehTrim3 && ehFinal ? ['Exame'] : []),
    ...(ehTrim3 ? ['MF'] : []),
    'Comportamento',
    'Observação / Resultado'
  ];

  const totalCols = headers.length;
  const genCol0 = 3;
  const firstAvCol0 = 4;
  const lastAvCol0 = firstAvCol0 + avTitles.length - 1;
  const macCol0 = firstAvCol0 + avTitles.length;
  const nppCol0 = provaProfessorAtiva ? macCol0 + 1 : -1;
  const ptCol0 = provaProfessorAtiva ? macCol0 + 2 : macCol0 + 1;
  const mtCol0 = ptCol0 + 1;
  const exameCol0 = ehTrim3 && ehFinal ? mtCol0 + 1 : -1;
  const mfCol0 = ehTrim3 ? (exameCol0 >= 0 ? exameCol0 + 1 : mtCol0 + 1) : -1;
  const finalGradeCol0 = ehTrim3 ? mfCol0 : mtCol0;
  const compCol0 = finalGradeCol0 + 1;
  const obsCol0 = finalGradeCol0 + 2;

  const genL = colLetter(genCol0);
  const macL = colLetter(macCol0);
  const nppL = nppCol0 >= 0 ? colLetter(nppCol0) : '';
  const ptL = colLetter(ptCol0);
  const mtL = colLetter(mtCol0);
  const exL = exameCol0 >= 0 ? colLetter(exameCol0) : '';
  const finalL = colLetter(finalGradeCol0);
  const obsL = colLetter(obsCol0);

  const pesosTrim =
    trimestre === 3
      ? (regraVigente?.pesosTerceiroTrimestre || regraVigente?.pesosTrimestre)
      : (regraVigente?.pesosPrimeirosTrimestres || regraVigente?.pesosTrimestre);
  const pesoNE = regraVigente?.pesoNEClassesFinais || (regraVigente?.pesoExameFinal ? (regraVigente.pesoExameFinal > 1 ? regraVigente.pesoExameFinal : regraVigente.pesoExameFinal * 100) : 60);
  const pesoMDF = regraVigente?.pesoMDFClassesFinais || (regraVigente?.pesoMediasTrimestrais ? (regraVigente.pesoMediasTrimestrais > 1 ? regraVigente.pesoMediasTrimestrais : regraVigente.pesoMediasTrimestrais * 100) : 40);
  const totalPesosExame = pesoNE + pesoMDF || 100;

  const ws: XLSX.WorkSheet = {};
  const titulo = `PAUTA DE APROVEITAMENTO — ${trimestre}º TRIMESTRE • ${(disciplina?.nome || 'DISCIPLINA').toUpperCase()}`;
  const subtitulo = `Ano Lectivo: ${anoLectivo} | Classe: ${turma.classe} | Turma: ${turma.nome} | Turno: ${turma.turno || '—'} | Escala: 0–${escalaInfo.escalaMaxima} (Mínimo Aprovação: ${notaAprov})`;

  const { nextRow0: headerRow0, merges } = buildInstitutionalBanner(ws, escola, titulo, subtitulo, totalCols);
  headers.forEach((h, c0) => setCell(ws, headerRow0, c0, strCell(h)));

  const firstDataRow0 = headerRow0 + 1;
  const firstExcelR = firstDataRow0 + 1;
  let curRow0 = firstDataRow0;

  let aprovados = 0;
  let reprovados = 0;
  let somaFinais = 0;
  let countAvaliados = 0;

  alunos.forEach((aluno, idx) => {
    const excelR = curRow0 + 1;
    const resMAC = calcularMACEstudante(
      aluno.id,
      avaliacoesDaTurma,
      notasAvaliacoes,
      regraVigente as RegraCalculoMAC,
      turma.nivelEnsino || 'ICiclo',
      turma.classe || '7ª'
    );
    const notaCons = notasConsolidadas.find(
      (c) => c.alunoId === aluno.id && (!disciplina || c.disciplinaId === disciplina.id) && String(c.trimestre) === String(trimestre)
    );

    const macVal = notaCons?.mac ?? resMAC.macCalculada;
    const nppVal = notaCons?.npp;
    const ptVal = notaCons?.provaTrimestral ?? notaCons?.npt;
    const exameVal = ehFinal ? notaCons?.notaExame : undefined;

    const calcTrim = calcularNotaTrimestralDinamica(
      macVal,
      nppVal,
      ptVal,
      regraVigente,
      Number(trimestre),
      turma.classe,
      provaProfessorAtiva
    );
    const mediaTrim = notaCons?.mediaTrimestral ?? calcTrim.mediaTrimestral;
    const calcMF = ehTrim3
      ? calcularMediaFinal3Trimestre(
          mediaTrim,
          mediaTrim,
          mediaTrim,
          ehFinal ? (exameVal ?? (regraVigente?.tipoCalculo3Trimestre === 'PONDERADO_EXAME' ? mediaTrim : undefined)) : undefined,
          regraVigente,
          turma.classe
        )
      : { mediaFinal: mediaTrim };

    const finalNum = ehTrim3 ? calcMF.mediaFinal : mediaTrim;

    setCell(ws, curRow0, 0, numCell(aluno.numeroOrdem || idx + 1, '0'));
    setCell(ws, curRow0, 1, strCell(aluno.numeroProcesso || aluno.codigoMatricula || '—'));
    setCell(ws, curRow0, 2, strCell(aluno.nomeCompleto));
    setCell(ws, curRow0, genCol0, strCell(aluno.genero === 'F' ? 'F' : 'M'));

    let temAlgumaNota = typeof nppVal === 'number' || typeof ptVal === 'number';
    avaliacoesDaTurma.forEach((av, avIdx) => {
      const nObj = notasAvaliacoes.find((n) => n.avaliacaoId === av.id && n.alunoId === aluno.id);
      if (nObj && typeof nObj.valorNota === 'number') {
        setCell(ws, curRow0, firstAvCol0 + avIdx, numCell(nObj.valorNota, '0.0'));
        temAlgumaNota = true;
      }
    });

    // MAC: se há colunas de avaliação e regra aritmética simples, usa fórmula =AVERAGE(...)
    if (avTitles.length > 0 && regraVigente?.formulaTipo !== 'PONDERADA_POR_TIPO' && !regraVigente?.descartarMenorNota) {
      const fAvL = colLetter(firstAvCol0);
      const lAvL = colLetter(lastAvCol0);
      setCell(
        ws,
        curRow0,
        macCol0,
        formulaNumCell(`IF(COUNT(${fAvL}${excelR}:${lAvL}${excelR})>0,ROUND(AVERAGE(${fAvL}${excelR}:${lAvL}${excelR}),1),0)`, macVal, '0.0')
      );
    } else {
      setCell(ws, curRow0, macCol0, numCell(macVal, '0.0'));
    }

    if (provaProfessorAtiva && nppCol0 >= 0 && typeof nppVal === 'number') {
      setCell(ws, curRow0, nppCol0, numCell(nppVal, '0.0'));
    }
    if (typeof ptVal === 'number') {
      setCell(ws, curRow0, ptCol0, numCell(ptVal, '0.0'));
    }

    // Fórmula da Média Trimestral (MT)
    let mtFormula: string;
    if (!provaProfessorAtiva) {
      mtFormula = `IF(ISNUMBER(${ptL}${excelR}),ROUND((${macL}${excelR}+${ptL}${excelR})/2,1),${macL}${excelR})`;
    } else if (pesosTrim) {
      const wM = Number(pesosTrim.mac) || 1;
      const wN = Number(pesosTrim.npp) || 1;
      const wP = Number(pesosTrim.npt) || 1;
      mtFormula = `IF(AND(ISNUMBER(${nppL}${excelR}),ISNUMBER(${ptL}${excelR})),ROUND((${macL}${excelR}*${wM}+${nppL}${excelR}*${wN}+${ptL}${excelR}*${wP})/${wM + wN + wP},1),IF(ISNUMBER(${nppL}${excelR}),ROUND((${macL}${excelR}*${wM}+${nppL}${excelR}*${wN})/${wM + wN},1),IF(ISNUMBER(${ptL}${excelR}),ROUND((${macL}${excelR}*${wM}+${ptL}${excelR}*${wP})/${wM + wP},1),${macL}${excelR})))`;
    } else {
      mtFormula = `IF(AND(ISNUMBER(${nppL}${excelR}),ISNUMBER(${ptL}${excelR})),ROUND((${macL}${excelR}+${nppL}${excelR}+${ptL}${excelR})/3,1),IF(ISNUMBER(${nppL}${excelR}),ROUND((${macL}${excelR}+${nppL}${excelR})/2,1),IF(ISNUMBER(${ptL}${excelR}),ROUND((${macL}${excelR}+${ptL}${excelR})/2,1),${macL}${excelR})))`;
    }
    setCell(ws, curRow0, mtCol0, formulaNumCell(mtFormula, mediaTrim, '0.0'));

    if (ehTrim3 && ehFinal && exameCol0 >= 0) {
      setCell(ws, curRow0, exameCol0, typeof exameVal === 'number' ? numCell(exameVal, '0.0') : strCell(''));
    }

    if (ehTrim3 && mfCol0 >= 0) {
      const mfFormula =
        ehFinal && exL
          ? `IF(ISNUMBER(${exL}${excelR}),ROUND((${mtL}${excelR}*${pesoMDF}+${exL}${excelR}*${pesoNE})/${totalPesosExame},1),${mtL}${excelR})`
          : `${mtL}${excelR}`;
      setCell(ws, curRow0, mfCol0, formulaNumCell(mfFormula, finalNum, '0.0'));
    }

    const compStr =
      notaCons?.comportamentoConceito ||
      (notaCons?.comportamentoNota
        ? converterComportamentoParaConceito(notaCons.comportamentoNota, escalaInfo.escalaMaxima)
        : '—');
    setCell(ws, curRow0, compCol0, strCell(compStr));

    if (temAlgumaNota || macVal > 0) {
      countAvaliados++;
      somaFinais += finalNum;
      if (finalNum >= notaAprov || ehIniciacao) aprovados++;
      else reprovados++;
    }

    const obsFallback = ehIniciacao
      ? resMAC.conceitoIniciacao || 'Avaliação Qualitativa'
      : finalNum >= notaAprov
        ? (aluno.genero === 'F' ? 'Aprovada' : 'Aprovado')
        : (aluno.genero === 'F' ? 'Reprovada' : 'Reprovado');

    const obsFormula = ehIniciacao
      ? `IF(${finalL}${excelR}>=8,"Muito Bom",IF(${finalL}${excelR}>=6,"Bom",IF(${finalL}${excelR}>=5,"Suficiente","Insuficiente")))`
      : `IF(${finalL}${excelR}>=${notaAprov},IF(${genL}${excelR}="F","Aprovada","Aprovado"),IF(${genL}${excelR}="F","Reprovada","Reprovado"))`;

    setCell(ws, curRow0, obsCol0, formulaStrCell(obsFormula, obsFallback));
    curRow0++;
  });

  const lastExcelR = Math.max(firstExcelR, curRow0);
  curRow0++; // linha vazia

  // Resumo Estatístico da Turma
  const sumHRow0 = curRow0++;
  setCell(ws, sumHRow0, 0, strCell('RESUMO ESTATÍSTICO (FÓRMULAS EXCEL)'));
  merges.push({ s: { r: sumHRow0, c: 0 }, e: { r: sumHRow0, c: 3 } });

  const rTot0 = curRow0++;
  const rApr0 = curRow0++;
  const rPercApr0 = curRow0++;
  const rRep0 = curRow0++;
  const rPercRep0 = curRow0++;
  const rMed0 = curRow0++;

  const valC0 = 2;
  const valL = colLetter(valC0);
  const rTotE = rTot0 + 1;
  const rAprE = rApr0 + 1;
  const rRepE = rRep0 + 1;

  setCell(ws, rTot0, 0, strCell('Total de Estudantes'));
  merges.push({ s: { r: rTot0, c: 0 }, e: { r: rTot0, c: 1 } });
  setCell(ws, rTot0, valC0, formulaNumCell(`COUNTA(C${firstExcelR}:C${lastExcelR})`, alunos.length, '0'));

  setCell(ws, rApr0, 0, strCell('Aprovados'));
  merges.push({ s: { r: rApr0, c: 0 }, e: { r: rApr0, c: 1 } });
  setCell(ws, rApr0, valC0, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Aprovad*")`, aprovados, '0'));

  setCell(ws, rPercApr0, 0, strCell('% Aprovação'));
  merges.push({ s: { r: rPercApr0, c: 0 }, e: { r: rPercApr0, c: 1 } });
  setCell(ws, rPercApr0, valC0, percentFormulaCell(`IF(${valL}${rTotE}>0,${valL}${rAprE}/${valL}${rTotE},0)`, alunos.length > 0 ? aprovados / alunos.length : 0));

  setCell(ws, rRep0, 0, strCell('Reprovados'));
  merges.push({ s: { r: rRep0, c: 0 }, e: { r: rRep0, c: 1 } });
  setCell(ws, rRep0, valC0, formulaNumCell(`COUNTIF(${obsL}${firstExcelR}:${obsL}${lastExcelR},"Reprovad*")`, reprovados, '0'));

  setCell(ws, rPercRep0, 0, strCell('% Reprovação'));
  merges.push({ s: { r: rPercRep0, c: 0 }, e: { r: rPercRep0, c: 1 } });
  setCell(ws, rPercRep0, valC0, percentFormulaCell(`IF(${valL}${rTotE}>0,${valL}${rRepE}/${valL}${rTotE},0)`, alunos.length > 0 ? reprovados / alunos.length : 0));

  setCell(ws, rMed0, 0, strCell('Média Geral da Turma'));
  merges.push({ s: { r: rMed0, c: 0 }, e: { r: rMed0, c: 1 } });
  const medTurma = countAvaliados > 0 ? Math.round((somaFinais / countAvaliados) * 10) / 10 : 0;
  setCell(ws, rMed0, valC0, formulaNumCell(`IFERROR(ROUND(AVERAGE(${finalL}${firstExcelR}:${finalL}${lastExcelR}),1),0)`, medTurma, '0.0'));

  const colWidths = [
    6,
    16,
    34,
    8,
    ...avTitles.map(() => 10),
    9,
    ...(provaProfessorAtiva ? [9] : []),
    9,
    10,
    ...(ehTrim3 && ehFinal ? [9] : []),
    ...(ehTrim3 ? [10] : []),
    15,
    18
  ];

  finalizeSheetRange(ws, curRow0, totalCols, colWidths, merges);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Pauta_${trimestre}T`);
  const fname = `Pauta_Oficial_${sanitizeFilenamePart(turma.nome)}_${sanitizeFilenamePart(disciplina?.sigla || disciplina?.nome || 'Disc')}_${trimestre}T_${sanitizeFilenamePart(anoLectivo)}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export interface PautaJuriExcelItem {
  aluno: Aluno;
  turma?: Turma;
  mediaGeral: number;
  disciplinasPositivas: number;
  disciplinasNegativas: number;
  totalDisciplinas: number;
  decisaoFinal: string;
}

/**
 * Exporta a Pauta Geral do Conselho / Comissão de Júri com fórmulas Excel para Situação Preliminar,
 * Totalizadores de Aprovados/Recurso/Reprovados e Percentagens.
 */
export function exportarPautaJuriExcel(params: {
  escola: Escola;
  classe?: string;
  anoLectivo?: string;
  itens: PautaJuriExcelItem[];
}): void {
  const { escola, classe = 'Geral', anoLectivo = '', itens } = params;
  const escalaInfo = obterInformacaoEscala(classe);
  const notaAprov = escalaInfo.notaAprovacao;

  const headers = [
    'Nº',
    'Nº Processo',
    'Nome Completo',
    'Gênero',
    'Classe',
    'Turma',
    'Curso',
    'Disc. Positivas',
    'Disc. Negativas',
    'Média Geral',
    'Situação Preliminar',
    'Deliberação Final do Júri'
  ];

  const totalCols = headers.length;
  const ws: XLSX.WorkSheet = {};
  const titulo = `PAUTA GERAL DE HOMOLOGAÇÃO DA COMISSÃO DE JÚRI — ${classe}`;
  const subtitulo = `Ano Lectivo: ${anoLectivo || escola.anoLectivoActivo || '—'} | Escala: 0–${escalaInfo.escalaMaxima} (Nota Mínima de Aprovação: ${notaAprov})`;

  const { nextRow0: headerRow0, merges } = buildInstitutionalBanner(ws, escola, titulo, subtitulo, totalCols);
  headers.forEach((h, c0) => setCell(ws, headerRow0, c0, strCell(h)));

  const firstDataRow0 = headerRow0 + 1;
  const firstExcelR = firstDataRow0 + 1;
  let curRow0 = firstDataRow0;

  let aprovDiretos = 0;
  let recursos = 0;
  let reprovados = 0;
  let somaMed = 0;

  itens.forEach((it, idx) => {
    const excelR = curRow0 + 1;
    const escAluno = obterInformacaoEscala(it.turma?.classe || classe, it.turma?.nivelEnsino);
    const ehAprovDireto = it.disciplinasNegativas === 0 && it.mediaGeral >= escAluno.notaAprovacao && it.totalDisciplinas > 0;
    const sitFallback = it.totalDisciplinas === 0
      ? 'Sem Notas'
      : ehAprovDireto
        ? 'Aprovado Directo'
        : it.disciplinasNegativas <= 2
          ? 'Apto Recurso / Deliberação'
          : 'Não Aprovado';

    if (it.totalDisciplinas > 0) {
      somaMed += it.mediaGeral;
      if (ehAprovDireto) aprovDiretos++;
      else if (it.disciplinasNegativas <= 2) recursos++;
      else reprovados++;
    }

    setCell(ws, curRow0, 0, numCell(idx + 1, '0'));
    setCell(ws, curRow0, 1, strCell(it.aluno.numeroProcesso || it.aluno.codigoMatricula || '—'));
    setCell(ws, curRow0, 2, strCell(it.aluno.nomeCompleto));
    setCell(ws, curRow0, 3, strCell(it.aluno.genero === 'F' ? 'F' : 'M'));
    setCell(ws, curRow0, 4, strCell(it.turma?.classe || classe));
    setCell(ws, curRow0, 5, strCell(it.turma?.nome || '—'));
    setCell(ws, curRow0, 6, strCell(it.turma?.curso || 'Geral'));
    setCell(ws, curRow0, 7, numCell(it.disciplinasPositivas, '0'));
    setCell(ws, curRow0, 8, numCell(it.disciplinasNegativas, '0'));
    setCell(ws, curRow0, 9, numCell(Math.round(it.mediaGeral * 10) / 10, '0.0'));
    setCell(
      ws,
      curRow0,
      10,
      formulaStrCell(
        `IF(H${excelR}+I${excelR}=0,"Sem Notas",IF(AND(I${excelR}=0,J${excelR}>=${escAluno.notaAprovacao}),"Aprovado Directo",IF(I${excelR}<=2,"Apto Recurso / Deliberação","Não Aprovado")))`,
        sitFallback
      )
    );
    setCell(ws, curRow0, 11, strCell(it.decisaoFinal));
    curRow0++;
  });

  const lastExcelR = Math.max(firstExcelR, curRow0);
  curRow0++;

  const sumH0 = curRow0++;
  setCell(ws, sumH0, 0, strCell('RESUMO DA SESSÃO DE JÚRI'));
  merges.push({ s: { r: sumH0, c: 0 }, e: { r: sumH0, c: 3 } });

  const rTot0 = curRow0++;
  const rApr0 = curRow0++;
  const rPercApr0 = curRow0++;
  const rRec0 = curRow0++;
  const rRep0 = curRow0++;
  const rMed0 = curRow0++;

  const rTotE = rTot0 + 1;
  const rAprE = rApr0 + 1;

  setCell(ws, rTot0, 0, strCell('Total de Alunos Analisados'));
  merges.push({ s: { r: rTot0, c: 0 }, e: { r: rTot0, c: 1 } });
  setCell(ws, rTot0, 2, formulaNumCell(`COUNTA(C${firstExcelR}:C${lastExcelR})`, itens.length, '0'));

  setCell(ws, rApr0, 0, strCell('Aprovados Directos'));
  merges.push({ s: { r: rApr0, c: 0 }, e: { r: rApr0, c: 1 } });
  setCell(ws, rApr0, 2, formulaNumCell(`COUNTIF(K${firstExcelR}:K${lastExcelR},"Aprovado Directo")`, aprovDiretos, '0'));

  setCell(ws, rPercApr0, 0, strCell('% Aprovação Directa'));
  merges.push({ s: { r: rPercApr0, c: 0 }, e: { r: rPercApr0, c: 1 } });
  setCell(ws, rPercApr0, 2, percentFormulaCell(`IF(C${rTotE}>0,C${rAprE}/C${rTotE},0)`, itens.length > 0 ? aprovDiretos / itens.length : 0));

  setCell(ws, rRec0, 0, strCell('Elegíveis a Recurso / Deliberação'));
  merges.push({ s: { r: rRec0, c: 0 }, e: { r: rRec0, c: 1 } });
  setCell(ws, rRec0, 2, formulaNumCell(`COUNTIF(K${firstExcelR}:K${lastExcelR},"*Recurso*")`, recursos, '0'));

  setCell(ws, rRep0, 0, strCell('Não Aprovados'));
  merges.push({ s: { r: rRep0, c: 0 }, e: { r: rRep0, c: 1 } });
  setCell(ws, rRep0, 2, formulaNumCell(`COUNTIF(K${firstExcelR}:K${lastExcelR},"Não Aprovado")`, reprovados, '0'));

  setCell(ws, rMed0, 0, strCell('Média Geral da Pauta'));
  merges.push({ s: { r: rMed0, c: 0 }, e: { r: rMed0, c: 1 } });
  const medTurma = itens.length > 0 ? Math.round((somaMed / itens.length) * 10) / 10 : 0;
  setCell(ws, rMed0, 2, formulaNumCell(`IFERROR(ROUND(AVERAGE(J${firstExcelR}:J${lastExcelR}),1),0)`, medTurma, '0.0'));

  finalizeSheetRange(ws, curRow0, totalCols, [6, 16, 32, 8, 10, 12, 18, 14, 14, 12, 26, 24], merges);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pauta_Geral_Juri');
  XLSX.writeFile(wb, `Pauta_Geral_Juri_${sanitizeFilenamePart(classe)}_${sanitizeFilenamePart(escola.sigla || 'Escola')}.xlsx`);
}

/**
 * Exporta o Boletim Oficial de Aproveitamento Individual com fórmulas Excel para
 * Média Trimestral, Classificação por Disciplina e Média Geral.
 */
export function exportarBoletimAlunoExcel(params: {
  escola: Escola;
  aluno: Aluno;
  turma?: Turma;
  linhas: Array<{
    disciplinaNome: string;
    mac?: number;
    npp?: number;
    npt?: number;
    mediaTrimestral?: number;
  }>;
  trimestreLabel?: string;
}): void {
  const { escola, aluno, turma, linhas, trimestreLabel = 'Trimestre' } = params;
  const escalaInfo = obterInformacaoEscala(turma?.classe || aluno.classeId);
  const notaAprov = escalaInfo.notaAprovacao;

  const headers = ['Nº', 'Disciplina', 'MAC', 'NPP', 'NPT', 'Média Trimestral', 'Classificação / Observação'];
  const ws: XLSX.WorkSheet = {};
  const titulo = `BOLETIM DE APROVEITAMENTO INDIVIDUAL — ${trimestreLabel.toUpperCase()}`;
  const subtitulo = `Estudante: ${aluno.nomeCompleto} | Proc./Matrícula: ${aluno.codigoMatricula} | Classe: ${turma?.classe || aluno.classeId} | Turma: ${turma?.nome || '—'}`;

  const { nextRow0: headerRow0, merges } = buildInstitutionalBanner(ws, escola, titulo, subtitulo, headers.length);
  headers.forEach((h, c0) => setCell(ws, headerRow0, c0, strCell(h)));

  const firstDataRow0 = headerRow0 + 1;
  const firstExcelR = firstDataRow0 + 1;
  let curRow0 = firstDataRow0;

  let somaMts = 0;
  let countMts = 0;
  let pos = 0;

  linhas.forEach((item, idx) => {
    const excelR = curRow0 + 1;
    setCell(ws, curRow0, 0, numCell(idx + 1, '0'));
    setCell(ws, curRow0, 1, strCell(item.disciplinaNome));
    setCell(ws, curRow0, 2, typeof item.mac === 'number' ? numCell(item.mac, '0.0') : strCell(''));
    setCell(ws, curRow0, 3, typeof item.npp === 'number' ? numCell(item.npp, '0.0') : strCell(''));
    setCell(ws, curRow0, 4, typeof item.npt === 'number' ? numCell(item.npt, '0.0') : strCell(''));

    const mtVal = typeof item.mediaTrimestral === 'number' ? Math.round(item.mediaTrimestral * 10) / 10 : 0;
    const comps = [item.mac, item.npp, item.npt].filter((x): x is number => typeof x === 'number');
    const calcFallback = comps.length > 0 ? Math.round((comps.reduce((a, b) => a + b, 0) / comps.length) * 10) / 10 : mtVal;

    if (comps.length > 0 || mtVal > 0) {
      countMts++;
      somaMts += mtVal || calcFallback;
      if ((mtVal || calcFallback) >= notaAprov) pos++;
    }

    setCell(
      ws,
      curRow0,
      5,
      formulaNumCell(
        `IF(COUNT(C${excelR}:E${excelR})>0,ROUND(AVERAGE(C${excelR}:E${excelR}),1),0)`,
        mtVal || calcFallback,
        '0.0'
      )
    );

    const obsFallback = comps.length === 0 && mtVal === 0 ? 'Sem Notas' : (mtVal || calcFallback) >= notaAprov ? (aluno.genero === 'F' ? 'Aprovada' : 'Aprovado') : 'Não Transita';
    setCell(
      ws,
      curRow0,
      6,
      formulaStrCell(
        `IF(F${excelR}=0,"Sem Notas",IF(F${excelR}>=${notaAprov},"${aluno.genero === 'F' ? 'Aprovada' : 'Aprovado'}","Não Transita"))`,
        obsFallback
      )
    );
    curRow0++;
  });

  const lastExcelR = Math.max(firstExcelR, curRow0);
  curRow0++;

  const rMed0 = curRow0++;
  const rPos0 = curRow0++;
  const rPerc0 = curRow0++;

  setCell(ws, rMed0, 1, strCell('Média Geral do Estudante'));
  setCell(ws, rMed0, 5, formulaNumCell(`IFERROR(ROUND(AVERAGE(F${firstExcelR}:F${lastExcelR}),1),0)`, countMts > 0 ? Math.round((somaMts / countMts) * 10) / 10 : 0, '0.0'));

  setCell(ws, rPos0, 1, strCell('Disciplinas Positivas'));
  setCell(ws, rPos0, 5, formulaNumCell(`COUNTIF(F${firstExcelR}:F${lastExcelR},">="&${notaAprov})`, pos, '0'));

  setCell(ws, rPerc0, 1, strCell('Taxa de Aproveitamento (%)'));
  setCell(ws, rPerc0, 5, percentFormulaCell(`IF(COUNTA(B${firstExcelR}:B${lastExcelR})>0,F${rPos0 + 1}/COUNTA(B${firstExcelR}:B${lastExcelR}),0)`, linhas.length > 0 ? pos / linhas.length : 0));

  finalizeSheetRange(ws, curRow0, headers.length, [6, 30, 10, 10, 10, 16, 22], merges);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Boletim_Notas');
  XLSX.writeFile(wb, `Boletim_${sanitizeFilenamePart(aluno.codigoMatricula || aluno.nomeCompleto)}.xlsx`);
}
