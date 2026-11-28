import { 
  NivelEnsino, 
  ConceitoQualitativoIniciacao, 
  RegraCalculoMAC, 
  AvaliacaoCriada, 
  NotaEstudante, 
  NotaTrimestralConsolidada,
  ComissaoJuri,
  Turma,
  Aluno,
  Disciplina,
  PeriodoLetivoConfig,
  RegimePeriodosLetivos
} from '../types';

/**
 * Motor de Cálculo Dinâmico de Avaliações e MAC (Média de Avaliação Contínua)
 * Compatível com os regulamentos do Ministério da Educação de Angola (MED)
 */

export interface ResultadoCalculoMAC {
  macCalculada: number;
  escalaMaxima: 10 | 20;
  statusAprovacao: 'Aprovado' | 'Reprovado' | 'Recurso' | 'Avaliação Qualitativa';
  conceitoIniciacao?: ConceitoQualitativoIniciacao;
  totalAvaliacoesUtilizadas: number;
  cumpriuMinimoExigido: boolean;
  minimoExigido: number;
  detalheCalculo: string;
}

/**
 * Converte valor numérico de comportamento em conceito qualitativo oficial (de Medíocre a Excelente)
 * - Ensino Primário: Avaliado de 0 a 10 valores
 * - I e II Ciclos do Secundário: Avaliado de 0 a 20 valores
 */
export function converterComportamentoParaConceito(nota: number, escalaMaxima: 10 | 20 = 20): string {
  if (escalaMaxima === 10) {
    if (nota >= 9.5) return 'Excelente';
    if (nota >= 8.5) return 'Muito Bom';
    if (nota >= 7) return 'Bom';
    if (nota >= 5) return 'Suficiente';
    if (nota >= 3.5) return 'Mau';
    return 'Medíocre';
  }

  // Escala de 0 a 20 valores (Ensino Secundário)
  if (nota >= 18.5) return 'Excelente';
  if (nota >= 16) return 'Muito Bom';
  if (nota >= 14) return 'Bom';
  if (nota >= 10) return 'Suficiente';
  if (nota >= 7) return 'Mau';
  return 'Medíocre';
}

/**
 * Ajusta concordância de gênero nos textos oficiais do Ministério da Educação de Angola
 */
export function formatarTextoPorGenero(genero: 'M' | 'F') {
  const isM = genero === 'M';
  return {
    alunoOuAluna: isM ? 'O Aluno' : 'A Aluna',
    alunoMinusculo: isM ? 'o aluno' : 'a aluna',
    artigo: isM ? 'O' : 'A',
    artigoDefinido: isM ? 'O' : 'A',
    aprovadoOuAprovada: isM ? 'Aprovado' : 'Aprovada',
    reprovadoOuReprovada: isM ? 'Reprovado' : 'Reprovada',
    matriculadoOuMatriculada: isM ? 'Matriculado' : 'Matriculada',
    transferidoOuTransferida: isM ? 'Transferido' : 'Transferida',
    filhoOuFilha: isM ? 'filho de' : 'filha de',
    portadorOuPortadora: isM ? 'portador' : 'portadora',
    candidatoOuCandidata: isM ? 'Candidato' : 'Candidata',
    consideradoOuConsiderada: isM ? 'considerado' : 'considerada',
  };
}

export interface EscalaNotaInfo {
  escalaMaxima: 10 | 20;
  notaAprovacao: 5 | 10;
  rotuloEscala: string;
  ehPrimario: boolean;
}

/**
 * Determina escala máxima pelo nível de ensino ou classe
 * Ensino Primário (Iniciação à 6ª classe): 0 a 10 valores (aprovação >= 5)
 * Iº e IIº Ciclos (7ª à 13ª classe): 0 a 20 valores (aprovação >= 10)
 */
export function obterEscalaMaximaPorNivel(nivel?: NivelEnsino, classe?: string): 10 | 20 {
  const cl = (classe || '').trim().toLowerCase();
  if (nivel === 'Primario' || nivel === 'Iniciacao') return 10;
  if (
    cl.includes('inicia') || 
    cl.includes('1ª') || 
    cl.includes('2ª') || 
    cl.includes('3ª') || 
    cl.includes('4ª') || 
    cl.includes('5ª') || 
    cl.includes('6ª')
  ) {
    return 10;
  }
  return 20;
}

/**
 * Fornece metadados completos da escala de avaliação (0-10 vs 0-20)
 */
export function obterInformacaoEscala(classe?: string, nivel?: NivelEnsino): EscalaNotaInfo {
  const escala = obterEscalaMaximaPorNivel(nivel, classe);
  if (escala === 10) {
    return {
      escalaMaxima: 10,
      notaAprovacao: 5,
      rotuloEscala: '0 a 10 Valores (Ensino Primário)',
      ehPrimario: true
    };
  }
  return {
    escalaMaxima: 20,
    notaAprovacao: 10,
    rotuloEscala: '0 a 20 Valores (Iº e IIº Ciclos)',
    ehPrimario: false
  };
}

/**
 * Converte valor em conceito qualitativo para Iniciação (escala 0-10)
 */
export function calcularConceitoIniciacao(valor: number): ConceitoQualitativoIniciacao {
  if (valor >= 8) return 'Muito Bom';
  if (valor >= 6) return 'Bom';
  if (valor >= 5) return 'Suficiente';
  return 'Insuficiente';
}

/**
 * Avalia a Média de Avaliação Contínua (MAC) segundo regras da Direção e avaliações do professor
 */
export function calcularMACEstudante(
  alunoId: string,
  avaliacoes: AvaliacaoCriada[],
  notas: NotaEstudante[],
  regra: RegraCalculoMAC,
  nivel: NivelEnsino,
  classe: string
): ResultadoCalculoMAC {
  const escala = obterEscalaMaximaPorNivel(nivel, classe);
  const minExigido = regra?.minAvaliacoesExigidas || 2;

  // Filtrar avaliações daquela disciplina/turma que possuem notas deste aluno
  const avaliacoesComNota: { avaliacao: AvaliacaoCriada; nota: number }[] = [];

  for (const av of avaliacoes) {
    const notaAluno = notas.find(n => n.avaliacaoId === av.id && n.alunoId === alunoId);
    if (notaAluno !== undefined && typeof notaAluno.valorNota === 'number') {
      avaliacoesComNota.push({
        avaliacao: av,
        nota: Math.min(escala, Math.max(0, notaAluno.valorNota))
      });
    }
  }

  const totalNotas = avaliacoesComNota.length;
  const cumpriuMinimo = totalNotas >= minExigido;

  if (totalNotas === 0) {
    return {
      macCalculada: 0,
      escalaMaxima: escala,
      statusAprovacao: 'Reprovado',
      conceitoIniciacao: classe === 'Iniciação' ? 'Insuficiente' : undefined,
      totalAvaliacoesUtilizadas: 0,
      cumpriuMinimoExigido: false,
      minimoExigido: minExigido,
      detalheCalculo: 'Nenhuma avaliação lançada pelo professor para este aluno.'
    };
  }

  let notasParaCalculo = [...avaliacoesComNota];

  // Caso esteja configurado para descartar a menor nota (e tenha mais que o mínimo)
  if (regra?.descartarMenorNota && totalNotas > minExigido) {
    let menorIdx = 0;
    for (let i = 1; i < notasParaCalculo.length; i++) {
      if (notasParaCalculo[i].nota < notasParaCalculo[menorIdx].nota) {
        menorIdx = i;
      }
    }
    notasParaCalculo.splice(menorIdx, 1);
  }

  let macFinal = 0;
  let detalhe = '';

  // 1. PONDERADA POR TIPO DE AVALIAÇÃO
  if (regra?.formulaTipo === 'PONDERADA_POR_TIPO' && regra.pesosPorTipo) {
    let somaPesos = 0;
    let somaPonderada = 0;

    // Agrupa por tipo de avaliação
    const gruposPorTipo: Record<string, number[]> = {};
    for (const item of notasParaCalculo) {
      const tipo = item.avaliacao.tipoId || item.avaliacao.tipoNome;
      if (!gruposPorTipo[tipo]) gruposPorTipo[tipo] = [];
      gruposPorTipo[tipo].push(item.nota);
    }

    for (const tipo in gruposPorTipo) {
      const notasDoTipo = gruposPorTipo[tipo];
      const mediaDoTipo = notasDoTipo.reduce((acc, curr) => acc + curr, 0) / notasDoTipo.length;
      const peso = regra.pesosPorTipo[tipo] || 1;
      somaPonderada += mediaDoTipo * peso;
      somaPesos += peso;
    }

    macFinal = somaPesos > 0 ? somaPonderada / somaPesos : 0;
    detalhe = `Média ponderada por ${Object.keys(gruposPorTipo).length} tipos configurados com soma de pesos ${somaPesos}.`;
  } 
  // 2. FÓRMULA CUSTOMIZADA OU ARITMÉTICA SIMPLES (DEFAULT)
  else {
    const soma = notasParaCalculo.reduce((acc, curr) => acc + curr.nota, 0);
    macFinal = soma / notasParaCalculo.length;
    detalhe = `Média aritmética simples de ${notasParaCalculo.length} avaliações: (${notasParaCalculo.map(n => n.nota).join(' + ')}) / ${notasParaCalculo.length}.`;
  }

  // Arredonda a 1 casa decimal conforme prática escolar angolana
  macFinal = Math.round(macFinal * 10) / 10;

  // Determinar aprovação
  let status: 'Aprovado' | 'Reprovado' | 'Recurso' | 'Avaliação Qualitativa' = 'Aprovado';
  let conceito: ConceitoQualitativoIniciacao | undefined = undefined;

  if (classe === 'Iniciação') {
    status = 'Avaliação Qualitativa';
    conceito = calcularConceitoIniciacao(macFinal);
  } else if (escala === 10) {
    // Primário: Aprovação é >= 5
    status = macFinal >= 5 ? 'Aprovado' : 'Reprovado';
  } else {
    // Ciclos: Aprovação é >= 10 (ou recurso se entre 7 e 9 no exame)
    if (macFinal >= 10) status = 'Aprovado';
    else if (macFinal >= 7) status = 'Recurso';
    else status = 'Reprovado';
  }

  return {
    macCalculada: macFinal,
    escalaMaxima: escala,
    statusAprovacao: status,
    conceitoIniciacao: conceito,
    totalAvaliacoesUtilizadas: notasParaCalculo.length,
    cumpriuMinimoExigido: cumpriuMinimo,
    minimoExigido: minExigido,
    detalheCalculo: detalhe
  };
}

/**
 * Avaliador seguro de expressões matemáticas para fórmulas criadas pela Direção
 * Suporta variáveis como MAC, NPP, NPT, MT1, MT2, MT3, MDF, NE, EXAME
 */
export function avaliarExpressaoNota(formula: string, variaveis: Record<string, number>): number | null {
  if (!formula || !formula.trim()) return null;
  try {
    let expressao = formula.trim().toUpperCase();

    // Substituir variáveis pelas chaves fornecidas
    // Ordenar chaves por comprimento decrescente para evitar substituições parciais
    const keys = Object.keys(variaveis).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const val = variaveis[k] ?? 0;
      const regex = new RegExp(`\\b${k.toUpperCase()}\\b`, 'g');
      expressao = expressao.replace(regex, `(${val})`);
    }

    // Permitir apenas caracteres matemáticos seguros: números, decimais, parênteses, +, -, *, /, espaços
    if (!/^[0-9+\-*/().\s]+$/.test(expressao)) {
      return null;
    }

    // Avaliação segura através de Function controlada
    const resultado = new Function(`"use strict"; return (${expressao});`)();
    if (typeof resultado === 'number' && !isNaN(resultado) && isFinite(resultado)) {
      return resultado;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Verifica se uma classe é classe final de ciclo com exame terminal (6ª, 9ª, 12ª, 13ª)
 * Classes de transição (Iniciação, 1ª à 5ª, 7ª, 8ª, 10ª e 11ª) não realizam exame
 */
export function isClasseFinal(classe?: string, regra?: RegraCalculoMAC): boolean {
  if (!classe) return false;
  const classesFinaisPadrao = ['6ª', '9ª', '12ª', '13ª'];
  const classesFinais = regra?.classesFinaisConfiguradas || classesFinaisPadrao;
  const cl = classe.trim().toLowerCase();
  return classesFinais.some(cf => cl.includes(cf.toLowerCase()));
}

/**
 * Calcula a Média Trimestral (MT) aplicando a fórmula configurada para a classe e trimestre
 * Normas MED Angola ou Fórmulas Criadas pelo Director Geral / Administrador
 */
export function calcularNotaTrimestralDinamica(
  mac: number | null | undefined,
  npp: number | undefined,
  npt: number | undefined,
  regra?: RegraCalculoMAC,
  trimestre: number = 1,
  classe: string = '7ª',
  nppAtivo: boolean = true
): { mediaTrimestral: number; formulaAplicada: string } {
  const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
  const temMac = typeof mac === 'number' && !isNaN(mac) && mac >= 0;
  const temNpp = nppAtivo && typeof npp === 'number' && !isNaN(npp) && npp >= 0;
  const temNpt = typeof npt === 'number' && !isNaN(npt) && npt >= 0;

  if (!temMac && !temNpp && !temNpt) {
    return {
      mediaTrimestral: 0,
      formulaAplicada: 'Sem componentes lançadas no trimestre'
    };
  }

  const macVal = temMac ? mac! : (temNpp ? npp! : npt!);
  const nppVal = temNpp ? npp! : macVal;
  const nptVal = temNpt ? npt! : (temNpp ? nppVal : macVal);

  const parsePeso = (val: unknown, fallback: number): number => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = Number(val);
    return !isNaN(num) && num >= 0 ? num : fallback;
  };

  // 1. Verificar se há fórmula personalizada expressa para o trimestre em questão
  const formulaTrimestreEspecifica =
    trimestre === 3
      ? (regra?.formula3Trimestre || regra?.formulaTerceiroTrimestre)
      : (trimestre === 1
          ? (regra?.formula1Trimestre || regra?.formulaPrimeirosTrimestres)
          : (regra?.formula2Trimestre || regra?.formulaPrimeirosTrimestres));

  const formulaTexto = formulaTrimestreEspecifica || regra?.formulaTrimestral || regra?.formulaCustom;

  if (formulaTexto && (!formulaTexto.toUpperCase().includes('NPP') || nppAtivo)) {
    const res = avaliarExpressaoNota(formulaTexto, {
      MAC: macVal,
      NPP: nppVal,
      NPT: nptVal,
      PT: nptVal,
      PA: macVal
    });
    if (res !== null) {
      const finalVal = Math.min(escala, Math.max(0, Math.round(res * 10) / 10));
      return {
        mediaTrimestral: finalVal,
        formulaAplicada: `Fórmula Direção (${trimestre}º Trim.): ${formulaTexto}`
      };
    }
  }

  // 2. Verificar pesos diferenciados do 3º Trimestre vs 1º/2º Trimestres ou padrão
  const pesosAplicaveis =
    trimestre === 3
      ? (regra?.pesosTerceiroTrimestre || regra?.pesosTrimestre)
      : (regra?.pesosPrimeirosTrimestres || regra?.pesosTrimestre);

  if (pesosAplicaveis && regra?.formulaTipo !== 'ARITMETICA_SIMPLES') {
    const wMac = temMac ? parsePeso(pesosAplicaveis.mac, 1) : 0;
    const wNpp = temNpp ? parsePeso(pesosAplicaveis.npp, 1) : 0;
    const wNpt = temNpt ? parsePeso(pesosAplicaveis.npt, 1) : 0;
    const totalPesos = wMac + wNpp + wNpt;
    if (totalPesos > 0) {
      const mtPond = (((mac ?? 0) * wMac) + ((npp ?? 0) * wNpp) + ((npt ?? 0) * wNpt)) / totalPesos;
      const finalVal = Math.min(escala, Math.max(0, Math.round(mtPond * 10) / 10));
      return {
        mediaTrimestral: finalVal,
        formulaAplicada: `Ponderação Direção (${trimestre}º Trim.): MAC(${wMac})${nppAtivo ? ` + NPP(${wNpp})` : ''} + PT(${wNpt})`
      };
    }
  }

  // 3. Se a Prova do Professor (NPP) estiver desativada nas configurações escolares:
  // Apenas MAC e Prova Trimestral (PT / NPT) efetivamente lançadas são consideradas
  if (!nppAtivo) {
    const compsSemNpp = [temMac ? mac! : null, temNpt ? npt! : null].filter((v): v is number => v !== null);
    const mt = compsSemNpp.reduce((a, b) => a + b, 0) / compsSemNpp.length;
    return {
      mediaTrimestral: Math.min(escala, Math.max(0, Math.round(mt * 10) / 10)),
      formulaAplicada: compsSemNpp.length === 2
        ? 'Padrão MED (NPP Desativado): (MAC + PT) / 2'
        : 'Padrão MED (NPP Desativado — Lançamento Parcial)'
    };
  }

  // 4. Média aritmética rigorosa apenas das componentes efetivamente lançadas (MAC, NPP, PT)
  const componentesLancados: Array<{ rotulo: string; valor: number }> = [];
  if (temMac) componentesLancados.push({ rotulo: 'MAC', valor: mac! });
  if (temNpp) componentesLancados.push({ rotulo: 'NPP', valor: npp! });
  if (temNpt) componentesLancados.push({ rotulo: 'PT', valor: npt! });

  const mt = componentesLancados.reduce((acc, c) => acc + c.valor, 0) / componentesLancados.length;
  const formulaRotulo = componentesLancados.length > 1
    ? `Padrão MED: (${componentesLancados.map(c => c.rotulo).join(' + ')}) / ${componentesLancados.length}`
    : `Padrão MED (${componentesLancados[0].rotulo} Parcial)`;

  return {
    mediaTrimestral: Math.min(escala, Math.max(0, Math.round(mt * 10) / 10)),
    formulaAplicada: formulaRotulo
  };
}

/**
 * Calcula a Média Final (MF) e Média de Frequência (MDF) com suporte a:
 * - Trimestres parciais ou completos (MT1, MT2, MT3) com pesos reais re-normalizados
 * - Classes finais com Exame / Prova Global (MDF + Exame)
 * - Exame de Recurso quando aplicável
 */
export function calcularMediaFinal3Trimestre(
  mt1: number | null | undefined,
  mt2: number | null | undefined,
  mt3: number | null | undefined,
  exameFinal?: number,
  regra?: RegraCalculoMAC,
  classe: string = '7ª',
  notaRecurso?: number
): { mediaFinal: number; mdf: number; status: 'Aprovado' | 'Recurso' | 'Reprovado'; formulaDetalhe: string } {
  const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
  const notaAprovacao = regra?.notaMinimaAprovacao || (escala === 10 ? 5 : 10);
  const notaMinRecurso = regra?.notaMinimaExameRecurso || (escala === 10 ? 4 : 7);

  const v1 = typeof mt1 === 'number' && !isNaN(mt1) ? mt1 : null;
  const v2 = typeof mt2 === 'number' && !isNaN(mt2) ? mt2 : null;
  const v3 = typeof mt3 === 'number' && !isNaN(mt3) ? mt3 : null;
  const trimestresPresentes = [
    v1 !== null ? { idx: 1, val: v1 } : null,
    v2 !== null ? { idx: 2, val: v2 } : null,
    v3 !== null ? { idx: 3, val: v3 } : null
  ].filter((x): x is { idx: number; val: number } => x !== null);

  if (trimestresPresentes.length === 0) {
    const recVal = typeof notaRecurso === 'number' && !isNaN(notaRecurso) ? Math.min(escala, Math.max(0, Math.round(notaRecurso))) : 0;
    const exVal = typeof exameFinal === 'number' && !isNaN(exameFinal) ? Math.min(escala, Math.max(0, Math.round(exameFinal))) : 0;
    const base = Math.max(recVal, exVal);
    return {
      mediaFinal: base,
      mdf: 0,
      status: classe === 'Iniciação' ? 'Aprovado' : (base >= notaAprovacao ? 'Aprovado' : base >= notaMinRecurso ? 'Recurso' : 'Reprovado'),
      formulaDetalhe: 'Sem médias trimestrais lançadas'
    };
  }

  const parsePesoT = (val: unknown, fallback: number): number => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = Number(val);
    return !isNaN(num) && num >= 0 ? num : fallback;
  };

  // Média de Frequência Anual (MDF) calculada estritamente sobre os trimestres disponíveis
  let mtGeral = trimestresPresentes.reduce((a, b) => a + b.val, 0) / trimestresPresentes.length;
  let detalhe = trimestresPresentes.length === 3
    ? 'Média das Médias Trimestrais: (MT1 + MT2 + MT3) / 3'
    : `Média de Frequência Parcial (${trimestresPresentes.length} Trimestre${trimestresPresentes.length > 1 ? 's' : ''})`;

  if (regra?.pesosTrimestresMF && regra?.formulaTipo !== 'ARITMETICA_SIMPLES') {
    const w1 = v1 !== null ? parsePesoT(regra.pesosTrimestresMF.t1, 1) : 0;
    const w2 = v2 !== null ? parsePesoT(regra.pesosTrimestresMF.t2, 1) : 0;
    const w3 = v3 !== null ? parsePesoT(regra.pesosTrimestresMF.t3, 1) : 0;
    const totalW = w1 + w2 + w3;
    if (totalW > 0) {
      mtGeral = ((v1 ?? 0) * w1 + (v2 ?? 0) * w2 + (v3 ?? 0) * w3) / totalW;
      detalhe = `Ponderação Trimestral: T1(${w1}) + T2(${w2}) + T3(${w3})`;
    }
  }

  let mf = mtGeral;

  // Identificar se a classe é uma classe de exame final (ex: 6ª, 9ª, 12ª, 13ª ou configurada na regra)
  const classesFinaisPadrao = ['6ª', '9ª', '12ª', '13ª'];
  const classesFinais = regra?.classesFinaisConfiguradas || classesFinaisPadrao;
  const ehClasseFinal = classesFinais.some(cf => classe.toLowerCase().includes(cf.toLowerCase()));

  // 1. Se for classe final e houver exame ou cálculo de exame configurado
  if ((ehClasseFinal || regra?.tipoCalculo3Trimestre === 'PONDERADO_EXAME') && exameFinal !== undefined && !isNaN(exameFinal) && exameFinal >= 0) {
    if (regra?.formulaClassesFinaisExame) {
      const res = avaliarExpressaoNota(regra.formulaClassesFinaisExame, {
        MDF: mtGeral,
        MT1: v1 ?? mtGeral,
        MT2: v2 ?? mtGeral,
        MT3: v3 ?? mtGeral,
        NE: exameFinal,
        EXAME: exameFinal
      });
      if (res !== null) {
        mf = res;
        detalhe = `Classe Final com Exame (Fórmula): ${regra.formulaClassesFinaisExame}`;
      }
    } else {
      const pesoNE = parsePesoT(
        regra?.pesoNEClassesFinais ?? (regra?.pesoExameFinal !== undefined ? (regra.pesoExameFinal > 1 ? regra.pesoExameFinal : regra.pesoExameFinal * 100) : undefined),
        60
      );
      const pesoMDF = parsePesoT(
        regra?.pesoMDFClassesFinais ?? (regra?.pesoMediasTrimestrais !== undefined ? (regra.pesoMediasTrimestrais > 1 ? regra.pesoMediasTrimestrais : regra.pesoMediasTrimestrais * 100) : undefined),
        40
      );
      const somaPesosExame = pesoNE + pesoMDF;
      if (somaPesosExame > 0) {
        const fracNE = pesoNE / somaPesosExame;
        const fracMDF = pesoMDF / somaPesosExame;
        mf = (mtGeral * fracMDF) + (exameFinal * fracNE);
        detalhe = `Classe Final: ${Math.round(fracMDF * 100)}% Frequência (MDF) + ${Math.round(fracNE * 100)}% Exame (NE)`;
      }
    }
  } else if (regra?.formulaMediaGeralClasse && trimestresPresentes.length === 3) {
    // 2. Classes Não Finais: Fórmula da Média Geral personalizada
    const res = avaliarExpressaoNota(regra.formulaMediaGeralClasse, {
      MDF: mtGeral,
      MT1: v1!,
      MT2: v2!,
      MT3: v3!
    });
    if (res !== null) {
      mf = res;
      detalhe = `Classes Não Finais (Fórmula): ${regra.formulaMediaGeralClasse}`;
    }
  } else if (regra?.pesosTrimestresMF && regra?.formulaTipo !== 'ARITMETICA_SIMPLES') {
    const w1 = v1 !== null ? parsePesoT(regra.pesosTrimestresMF.t1, 1) : 0;
    const w2 = v2 !== null ? parsePesoT(regra.pesosTrimestresMF.t2, 1) : 0;
    const w3 = v3 !== null ? parsePesoT(regra.pesosTrimestresMF.t3, 1) : 0;
    const totalW = w1 + w2 + w3;
    if (totalW > 0) {
      mf = ((v1 ?? 0) * w1 + (v2 ?? 0) * w2 + (v3 ?? 0) * w3) / totalW;
      detalhe = `Classes Não Finais: Ponderação T1(${w1}) + T2(${w2}) + T3(${w3})`;
    }
  }

  if (typeof notaRecurso === 'number' && !isNaN(notaRecurso) && notaRecurso >= 0) {
    if (notaRecurso > mf) {
      mf = notaRecurso;
      detalhe = `${detalhe} • Atualizada por Exame de Recurso (${notaRecurso}v)`;
    }
  }

  mf = Math.min(escala, Math.max(0, Math.round(mf)));
  const mdfArred = Math.min(escala, Math.max(0, Math.round(mtGeral * 10) / 10));

  let status: 'Aprovado' | 'Recurso' | 'Reprovado' = 'Aprovado';
  if (classe === 'Iniciação') {
    status = 'Aprovado';
  } else if (mf >= notaAprovacao) {
    status = 'Aprovado';
  } else if (mf >= notaMinRecurso) {
    status = 'Recurso';
  } else {
    status = 'Reprovado';
  }

  return { mediaFinal: mf, mdf: mdfArred, status, formulaDetalhe: detalhe };
}


/**
 * Verifica elegibilidade de emissão de Certificado Oficial do MED Angola
 * Para classes finais: 6ª Classe (Primário), 9ª Classe (Iº Ciclo), 12ª / 13ª Classes (IIº Ciclo / Técnico)
 */
export function verificarElegibilidadeCertificado(aluno: Aluno, classe: string): {
  elegivel: boolean;
  mensagem: string;
  classesPendentes: string[];
} {
  const classesFinais: Record<string, string[]> = {
    '6ª': ['1ª', '2ª', '3ª', '4ª', '5ª'],
    '9ª': ['7ª', '8ª'],
    '12ª': ['10ª', '11ª'],
    '13ª': ['10ª', '11ª', '12ª']
  };

  const anterioresExigidas = classesFinais[classe];
  if (!anterioresExigidas) {
    return {
      elegivel: false,
      mensagem: `A ${classe} Classe não é uma classe de conclusão de ciclo oficial com exigência de certificado terminal.`,
      classesPendentes: []
    };
  }

  const historicoRegistado = aluno.historicoAnterior || [];
  const classesRegistadas = historicoRegistado.map(h => h.classe);
  const pendentes = anterioresExigidas.filter(c => !classesRegistadas.includes(c));

  if (pendentes.length > 0) {
    return {
      elegivel: false,
      mensagem: `Histórico incompleto: Falta o registo de aproveitamento das classes (${pendentes.join(', ')}). Insira os dados no Histórico Inteligente antes de emitir o certificado.`,
      classesPendentes: pendentes
    };
  }

  return {
    elegivel: true,
    mensagem: `Aproveitamento histórico de todas as classes (${anterioresExigidas.join(', ')}) validado com sucesso conforme normas do MED Angola.`,
    classesPendentes: []
  };
}

export function validarElegibilidadeCertificado(aluno: Aluno, classe?: string): {
  elegivel: boolean;
  mensagem: string;
  classesPendentes: string[];
} {
  return verificarElegibilidadeCertificado(aluno, classe || aluno.classeId);
}

/**
 * Observação oficial MED para uma disciplina isolada (Mini-Pauta / Lançamento de Notas),
 * respeitando estado do estudante (Desistente, Transferido), escala da classe e regras da escola.
 */
export function obterObservacaoDisciplina(
  notaFinal: number | undefined | null,
  classe: string = '7ª',
  estadoAluno?: string,
  regra?: RegraCalculoMAC
): {
  texto: string;
  categoria: 'Aprovado' | 'Recurso' | 'Reprovado' | 'Desistente' | 'Transferido' | 'Pendente';
} {
  if (estadoAluno === 'Desistente') {
    return { texto: 'Desistente', categoria: 'Desistente' };
  }
  if (estadoAluno === 'Transferido') {
    return { texto: 'Transferido', categoria: 'Transferido' };
  }
  if (notaFinal === undefined || notaFinal === null || isNaN(notaFinal)) {
    return { texto: 'Pendente', categoria: 'Pendente' };
  }
  const clLower = (classe || '').toLowerCase();
  if (clLower.includes('inicia')) {
    return { texto: 'Aprovado', categoria: 'Aprovado' };
  }

  const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
  const notaAprov = regra?.notaMinimaAprovacao ?? (escala === 10 ? 4.5 : 9.5);
  const notaRec = regra?.notaMinimaExameRecurso ?? (escala === 10 ? 4 : 7);

  if (notaFinal >= notaAprov) {
    return { texto: 'Aprovado', categoria: 'Aprovado' };
  }
  if (notaFinal >= notaRec) {
    return { texto: 'Recurso', categoria: 'Recurso' };
  }
  return { texto: 'Reprovado', categoria: 'Reprovado' };
}

/**
 * Observação oficial MED para a Pauta Geral (conjunto de disciplinas),
 * mantendo 100% de coerência entre cada linha da pauta e o resumo estatístico final.
 */
export function obterObservacaoPautaGeral(
  mediasDisciplinas: Array<number | null | undefined>,
  classe: string = '7ª',
  estadoAluno?: string,
  regra?: RegraCalculoMAC
): {
  texto: string;
  totalNegativas: number;
  categoria: 'Aprovado' | 'Recurso' | 'Reprovado' | 'Desistente' | 'Transferido' | 'Pendente';
} {
  if (estadoAluno === 'Desistente') {
    return { texto: 'Desistente', totalNegativas: 0, categoria: 'Desistente' };
  }
  if (estadoAluno === 'Transferido') {
    return { texto: 'Transferido', totalNegativas: 0, categoria: 'Transferido' };
  }

  const validas = mediasDisciplinas.filter((n): n is number => typeof n === 'number' && !isNaN(n));
  if (validas.length === 0) {
    return { texto: 'Pendente', totalNegativas: 0, categoria: 'Pendente' };
  }

  const clLower = (classe || '').toLowerCase();
  if (clLower.includes('inicia')) {
    return { texto: 'Aprovado', totalNegativas: 0, categoria: 'Aprovado' };
  }

  const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
  const notaAprov = regra?.notaMinimaAprovacao ?? (escala === 10 ? 4.5 : 9.5);
  const totalNegativas = validas.filter(n => n < notaAprov).length;

  if (totalNegativas === 0) {
    return { texto: 'Aprovado', totalNegativas, categoria: 'Aprovado' };
  }
  if (totalNegativas <= 2) {
    return { texto: 'Apto Recurso', totalNegativas, categoria: 'Recurso' };
  }
  return { texto: 'Reprovado', totalNegativas, categoria: 'Reprovado' };
}

export interface ResumoAproveitamentoPautaGeral {
  totalMatriculados: number;
  totalAvaliados: number;
  aprovados: number;
  recurso: number;
  reprovados: number;
  desistentesOuTransferidos: number;
  semNotas: number;
  taxaAprovacao: number;
  taxaInsucesso: number;
  mediaNotas: number;
}

/**
 * Motor Canónico de Taxa de Aproveitamento alinhado 100% com as Pautas Gerais:
 * - Consolida as notas por disciplina e trimestre/ano de cada estudante;
 * - Respeita se a Prova do Professor (NPP) está ativa ou desativada;
 * - Aplica deliberações homologadas da Comissão de Júri quando existentes;
 * - Classifica cada estudante pela regra oficial `obterObservacaoPautaGeral`;
 * - Calcula `% Aprovação = Aprovados / Avaliados Efectivos * 100` (coerente com as Pautas Gerais).
 */
export function calcularAproveitamentoPautaGeralAlunos(params: {
  alunos: Aluno[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  turmas?: Turma[];
  regrasMAC?: RegraCalculoMAC[];
  juris?: ComissaoJuri[];
  trimestreFiltro?: '1' | '2' | '3' | 'anual';
  anoLectivo?: string;
  nppAtivo?: boolean;
  escolaId?: string;
}): ResumoAproveitamentoPautaGeral {
  const {
    alunos,
    notasConsolidadas,
    turmas = [],
    regrasMAC = [],
    juris = [],
    trimestreFiltro = 'anual',
    anoLectivo,
    nppAtivo = true,
    escolaId,
  } = params;

  const turmasById = new Map<string, Turma>();
  for (const t of turmas) {
    if (t?.id) turmasById.set(t.id, t);
  }

  const notasDoEscopo = notasConsolidadas.filter((n) => {
    if (escolaId && escolaId !== 'todas' && n.escolaId && n.escolaId !== escolaId) return false;
    if (anoLectivo && anoLectivo !== 'todos' && n.anoLectivo && n.anoLectivo !== anoLectivo) return false;
    if (trimestreFiltro !== 'anual' && String(n.trimestre) !== String(trimestreFiltro)) return false;
    return true;
  });

  const notasPorAluno = new Map<string, NotaTrimestralConsolidada[]>();
  for (const n of notasDoEscopo) {
    if (!n.alunoId) continue;
    const arr = notasPorAluno.get(n.alunoId);
    if (arr) arr.push(n);
    else notasPorAluno.set(n.alunoId, [n]);
  }

  const obterRegraAluno = (classe?: string, nivel?: NivelEnsino): RegraCalculoMAC | undefined => {
    const clLower = (classe || '').trim().toLowerCase();
    return (
      regrasMAC.find((r) => (!escolaId || r.escolaId === escolaId) && clLower && (r.classe || '').trim().toLowerCase() === clLower) ||
      regrasMAC.find((r) => (!escolaId || r.escolaId === escolaId) && nivel && r.nivelEnsino === nivel) ||
      regrasMAC[0]
    );
  };

  let aprovados = 0;
  let recurso = 0;
  let reprovados = 0;
  let desistentesOuTransferidos = 0;
  let semNotas = 0;
  let somaMediasAlunos = 0;
  let countMediasAlunos = 0;

  for (const al of alunos) {
    const turmaAl = turmasById.get(al.turmaId);
    const classeAl = turmaAl?.classe || al.classeId || '7ª';
    const nivelAl = turmaAl?.nivelEnsino;
    const regra = obterRegraAluno(classeAl, nivelAl);

    if (al.estado === 'Desistente' || al.estado === 'Transferido') {
      desistentesOuTransferidos++;
      continue;
    }

    const notasAl = notasPorAluno.get(al.id) || [];
    const porDisciplina = new Map<string, NotaTrimestralConsolidada[]>();
    for (const n of notasAl) {
      const key = (n.disciplinaId || n.disciplinaNome || '').trim();
      if (!key) continue;
      const list = porDisciplina.get(key);
      if (list) list.push(n);
      else porDisciplina.set(key, [n]);
    }

    const mediasPorDisc = new Map<string, number>();

    porDisciplina.forEach((recs, discKey) => {
      if (trimestreFiltro !== 'anual') {
        const rec = recs[0];
        if (!rec) return;
        const pt = typeof rec.npt === 'number' ? rec.npt : (typeof rec.provaTrimestral === 'number' ? rec.provaTrimestral : undefined);
        const temInputs = typeof rec.mac === 'number' || typeof pt === 'number' || (nppAtivo && typeof rec.npp === 'number');
        if (typeof rec.mediaTrimestral === 'number' && !isNaN(rec.mediaTrimestral) && nppAtivo) {
          mediasPorDisc.set(discKey, rec.mediaTrimestral);
        } else if (temInputs) {
          const calc = calcularNotaTrimestralDinamica(
            typeof rec.mac === 'number' ? rec.mac : undefined,
            nppAtivo && typeof rec.npp === 'number' ? rec.npp : undefined,
            pt,
            regra,
            Number(rec.trimestre) || Number(trimestreFiltro) || 1,
            classeAl,
            nppAtivo
          );
          mediasPorDisc.set(discKey, calc.mediaTrimestral);
        } else if (typeof rec.notaFinal === 'number' && !isNaN(rec.notaFinal)) {
          mediasPorDisc.set(discKey, rec.notaFinal);
        }
      } else {
        const resolveTri = (tri: string): number | null => {
          const rec = recs.find((r) => String(r.trimestre) === tri);
          if (!rec) return null;
          const pt = typeof rec.npt === 'number' ? rec.npt : (typeof rec.provaTrimestral === 'number' ? rec.provaTrimestral : undefined);
          const temInputs = typeof rec.mac === 'number' || typeof pt === 'number' || (nppAtivo && typeof rec.npp === 'number');
          if (temInputs) {
            return calcularNotaTrimestralDinamica(
              typeof rec.mac === 'number' ? rec.mac : undefined,
              nppAtivo && typeof rec.npp === 'number' ? rec.npp : undefined,
              pt,
              regra,
              Number(tri),
              classeAl,
              nppAtivo
            ).mediaTrimestral;
          }
          const cand = rec.mediaTrimestral ?? rec.notaFinal;
          return typeof cand === 'number' && !isNaN(cand) ? cand : null;
        };

        const mt1 = resolveTri('1');
        const mt2 = resolveTri('2');
        const mt3 = resolveTri('3');
        const mts = [mt1, mt2, mt3].filter((v): v is number => v !== null && !isNaN(v));
        const recFinal = recs.find((r) => String(r.trimestre) === '3') || recs[recs.length - 1];
        const exame = typeof recFinal?.notaExame === 'number' ? recFinal.notaExame : undefined;
        const recursoNota = typeof (recFinal as any)?.notaRecurso === 'number' ? (recFinal as any).notaRecurso : undefined;

        if (mts.length > 0) {
          mediasPorDisc.set(
            discKey,
            calcularMediaFinal3Trimestre(
              mt1,
              mt2,
              mt3,
              (isClasseFinal(classeAl, regra) || typeof exame === 'number') ? exame : undefined,
              regra,
              classeAl,
              recursoNota
            ).mediaFinal
          );
        } else if (typeof recFinal?.notaFinal === 'number' && !isNaN(recFinal.notaFinal)) {
          mediasPorDisc.set(discKey, recFinal.notaFinal);
        }
      }
    });

    const juriAl = juris.find(
      (j) =>
        (j.pautaHomologada || j.estado === 'Validada') &&
        (!anoLectivo || !j.anoLectivo || j.anoLectivo === anoLectivo) &&
        (j.turmasIds?.includes(al.turmaId) || (classeAl && j.classe === classeAl))
    );
    const deliberacao = juriAl?.deliberacoes?.[al.id];

    if (deliberacao?.notasAlteradas && deliberacao.notasAlteradas.length > 0) {
      deliberacao.notasAlteradas.forEach((alt) => {
        if (typeof alt.novaNota === 'number' && !isNaN(alt.novaNota)) {
          const altKey = (alt.disciplinaId || alt.disciplinaNome || '').trim();
          if (altKey) mediasPorDisc.set(altKey, alt.novaNota);
        }
      });
    }

    const mediasDisciplinas = Array.from(mediasPorDisc.values());

    const obs = obterObservacaoPautaGeral(mediasDisciplinas, classeAl, al.estado, regra);
    let categoriaFinal = obs.categoria;

    if (deliberacao?.decisao === 'Aprovar') {
      categoriaFinal = 'Aprovado';
    } else if (deliberacao?.decisao === 'Recurso') {
      categoriaFinal = 'Recurso';
    } else if (deliberacao?.decisao === 'Nao_Aprovar') {
      categoriaFinal = 'Reprovado';
    }

    if (categoriaFinal === 'Pendente') {
      semNotas++;
    } else {
      if (categoriaFinal === 'Aprovado') aprovados++;
      else if (categoriaFinal === 'Recurso') recurso++;
      else if (categoriaFinal === 'Reprovado') reprovados++;

      if (mediasDisciplinas.length > 0) {
        const mediaAl = mediasDisciplinas.reduce((a, b) => a + b, 0) / mediasDisciplinas.length;
        somaMediasAlunos += mediaAl;
        countMediasAlunos++;
      }
    }
  }

  const totalAvaliados = aprovados + recurso + reprovados;
  const taxaAprovacao = totalAvaliados > 0 ? Math.round((aprovados / totalAvaliados) * 100) : 0;
  const taxaInsucesso = totalAvaliados > 0 ? Math.round(((recurso + reprovados) / totalAvaliados) * 100) : 0;
  const mediaNotas = countMediasAlunos > 0 ? Math.round((somaMediasAlunos / countMediasAlunos) * 10) / 10 : 0;

  return {
    totalMatriculados: alunos.length,
    totalAvaliados,
    aprovados,
    recurso,
    reprovados,
    desistentesOuTransferidos,
    semNotas,
    taxaAprovacao,
    taxaInsucesso,
    mediaNotas,
  };
}

export interface MediaDisciplinaClasse {
  disciplinaId: string;
  disciplinaNome: string;
  media: number | null;
  alunosAvaliados: number;
}

export interface ResultadoMediaGeralClasse {
  classe: string;
  mediaGeral: number | null;
  totalDisciplinasNecessarias: number;
  disciplinasComNotas: number;
  disciplinasPendentes: number;
  coberturaPct: number;
  totalAlunosAvaliados: number;
  mediasPorDisciplina: MediaDisciplinaClasse[];
}

function normalizarClasseSimples(cls?: string): string {
  const s = String(cls || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('inicia')) return 'iniciação';
  const m = s.match(/(\d{1,2})/);
  return m ? `${m[1]}ª` : s;
}

function normalizarNomeDisc(nome?: string): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterDisciplinasDaClasseComCurso(
  disciplinas: Disciplina[],
  classe: string,
  turmasDaClasse: Turma[]
): Disciplina[] {
  const clsNorm = normalizarClasseSimples(classe);
  if (!clsNorm) return [];

  const cursosTurmas = Array.from(
    new Set(
      turmasDaClasse
        .map((t) => normalizarNomeDisc(t.curso))
        .filter(Boolean)
    )
  );
  const ehSegundoCiclo = ['10ª', '11ª', '12ª', '13ª'].includes(clsNorm);
  const ehPrimeiroCiclo = ['7ª', '8ª', '9ª'].includes(clsNorm);

  const mapPorId = new Map<string, Disciplina>();
  for (const d of disciplinas) {
    if (!d) continue;
    const classesDisc = Array.isArray(d.classes) && d.classes.length > 0
      ? d.classes.map(normalizarClasseSimples)
      : d.classe
        ? [normalizarClasseSimples(d.classe)]
        : [];

    let pertenceClasse = classesDisc.includes(clsNorm);
    if (!pertenceClasse && classesDisc.length === 0 && d.nivelEnsino) {
      if (d.nivelEnsino === 'Iniciacao' && clsNorm === 'iniciação') pertenceClasse = true;
      else if (d.nivelEnsino === 'Primario' && ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'].includes(clsNorm)) pertenceClasse = true;
      else if (d.nivelEnsino === 'ICiclo' && ehPrimeiroCiclo) pertenceClasse = true;
      else if ((d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico') && ehSegundoCiclo) pertenceClasse = true;
    }

    if (!pertenceClasse) continue;

    if (
      ehSegundoCiclo &&
      cursosTurmas.length > 0 &&
      d.componente !== 'Geral' &&
      Array.isArray(d.cursos) &&
      d.cursos.length > 0 &&
      !d.cursos.includes('TODOS')
    ) {
      const cursosDisc = d.cursos.map(normalizarNomeDisc);
      const casaCurso = cursosTurmas.some((cT) => cursosDisc.some((cD) => cD === cT || cD.includes(cT) || cT.includes(cD)));
      if (!casaCurso) continue;
    }

    const chave = d.id || normalizarNomeDisc(d.nome);
    if (chave && !mapPorId.has(chave)) {
      mapPorId.set(chave, d);
    }
  }
  return Array.from(mapPorId.values());
}

function extrairNumeroPeriodo(raw: unknown): 1 | 2 | 3 | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s === '1' || s.startsWith('1')) return 1;
  if (s === '2' || s.startsWith('2')) return 2;
  if (s === '3' || s.startsWith('3')) return 3;
  return null;
}

function calcularValorDisciplinaPeriodo(
  recs: NotaTrimestralConsolidada[],
  trimestreFiltro: '1' | '2' | '3' | 'anual',
  classe: string,
  regra: RegraCalculoMAC | undefined,
  nppAtivo: boolean,
  regimePeriodos: RegimePeriodosLetivos = 'Trimestral',
  periodosConfig: PeriodoLetivoConfig[] = []
): number | null {
  const resolvePeriodo = (periodoNum: 1 | 2 | 3): number | null => {
    const rec = recs.find((r) => extrairNumeroPeriodo(r.trimestre) === periodoNum);
    if (!rec) return null;
    const pt = typeof rec.npt === 'number' ? rec.npt : (typeof rec.provaTrimestral === 'number' ? rec.provaTrimestral : undefined);
    const temInputs = typeof rec.mac === 'number' || typeof pt === 'number' || (nppAtivo && typeof rec.npp === 'number');
    if (temInputs) {
      return calcularNotaTrimestralDinamica(
        typeof rec.mac === 'number' ? rec.mac : undefined,
        nppAtivo && typeof rec.npp === 'number' ? rec.npp : undefined,
        pt,
        regra,
        periodoNum,
        classe,
        nppAtivo
      ).mediaTrimestral;
    }
    const cand = typeof rec.mediaTrimestral === 'number' ? rec.mediaTrimestral : rec.notaFinal;
    return typeof cand === 'number' && !isNaN(cand) ? cand : null;
  };

  if (trimestreFiltro !== 'anual') {
    const num = Number(trimestreFiltro) as 1 | 2 | 3;
    if (regimePeriodos === 'Semestral' && num === 2) {
      // No regime semestral, notas lançadas no 2º período ou herdadas como 2º/3º trimestre integram o 2º Semestre
      const v2 = resolvePeriodo(2);
      if (v2 !== null) return v2;
      return resolvePeriodo(3);
    }
    return resolvePeriodo(num);
  }

  // Cálculo anual segmentado pelos períodos letivos configurados
  const periodosNumeros: Array<1 | 2 | 3> = regimePeriodos === 'Semestral' ? [1, 2] : [1, 2, 3];
  const valoresPorPeriodo = periodosNumeros.map((num) => {
    let val = resolvePeriodo(num);
    if (val === null && regimePeriodos === 'Semestral' && num === 2) {
      val = resolvePeriodo(3);
    }
    const cfg = periodosConfig.find((p) => Number(p.numero) === num || extrairNumeroPeriodo(p.trimestre) === num);
    const peso = typeof cfg?.pesoPercentual === 'number' && cfg.pesoPercentual > 0 ? cfg.pesoPercentual : 1;
    return { num, val, peso };
  });

  const presentes = valoresPorPeriodo.filter((x) => x.val !== null);
  if (presentes.length === 0) {
    const recFinal = recs.find((r) => extrairNumeroPeriodo(r.trimestre) === 3) || recs[recs.length - 1];
    return typeof recFinal?.notaFinal === 'number' && !isNaN(recFinal.notaFinal) ? recFinal.notaFinal : null;
  }

  // Verificar se há regra ponderada / exame ou pesos segmentados definidos nos períodos letivos
  const temPesosPersonalizados = periodosConfig.some((p) => typeof p.pesoPercentual === 'number' && p.pesoPercentual > 0);
  const recFinal = recs.find((r) => extrairNumeroPeriodo(r.trimestre) === (regimePeriodos === 'Semestral' ? 2 : 3)) || recs[recs.length - 1];
  const exame = typeof recFinal?.notaExame === 'number' ? recFinal.notaExame : undefined;
  const recursoNota = typeof (recFinal as any)?.notaRecurso === 'number' ? (recFinal as any).notaRecurso : undefined;

  if (regimePeriodos === 'Semestral') {
    let somaPonderada = 0;
    let somaPesos = 0;
    presentes.forEach((p) => {
      somaPonderada += (p.val as number) * p.peso;
      somaPesos += p.peso;
    });
    const mdfSem = somaPesos > 0 ? somaPonderada / somaPesos : 0;
    const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
    if ((isClasseFinal(classe, regra) || typeof exame === 'number') && typeof exame === 'number' && !isNaN(exame)) {
      const pesoNE = regra?.pesoNEClassesFinais ?? 60;
      const pesoMDF = regra?.pesoMDFClassesFinais ?? 40;
      const tot = pesoNE + pesoMDF;
      const mf = tot > 0 ? (mdfSem * pesoMDF + exame * pesoNE) / tot : mdfSem;
      const finalComRecurso = typeof recursoNota === 'number' && recursoNota > mf ? recursoNota : mf;
      return Math.min(escala, Math.max(0, Math.round(finalComRecurso * 10) / 10));
    }
    const finalComRecurso = typeof recursoNota === 'number' && recursoNota > mdfSem ? recursoNota : mdfSem;
    return Math.min(escala, Math.max(0, Math.round(finalComRecurso * 10) / 10));
  }

  // Regime Trimestral
  if (temPesosPersonalizados && (!regra || regra.formulaTipo === 'ARITMETICA_SIMPLES') && typeof exame !== 'number') {
    let somaPonderada = 0;
    let somaPesos = 0;
    presentes.forEach((p) => {
      somaPonderada += (p.val as number) * p.peso;
      somaPesos += p.peso;
    });
    if (somaPesos > 0) {
      const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
      const val = somaPonderada / somaPesos;
      return Math.min(escala, Math.max(0, Math.round(val * 10) / 10));
    }
  }

  return calcularMediaFinal3Trimestre(
    valoresPorPeriodo[0]?.val ?? null,
    valoresPorPeriodo[1]?.val ?? null,
    valoresPorPeriodo[2]?.val ?? null,
    (isClasseFinal(classe, regra) || typeof exame === 'number') ? exame : undefined,
    regra,
    classe,
    recursoNota
  ).mediaFinal;
}

/**
 * Calcula a Média Geral de uma Classe tendo em conta TODAS as disciplinas necessárias da classe:
 * 1) Identifica todas as disciplinas curriculares obrigatórias/necessárias da classe (mais quaisquer disciplinas avaliadas).
 * 2) Calcula a média de cada disciplina entre os estudantes avaliados da classe.
 * 3) Calcula a Média Geral da Classe a partir das médias de todas as disciplinas com notas lançadas,
 *    informando também quantas disciplinas obrigatórias já possuem notas vs pendentes.
 */
export function calcularMediaGeralDaClasse(params: {
  classe: string;
  turmasDaClasse: Turma[];
  alunosDaClasse: Aluno[];
  disciplinas: Disciplina[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  regrasMAC?: RegraCalculoMAC[];
  juris?: ComissaoJuri[];
  trimestreFiltro?: '1' | '2' | '3' | 'anual';
  anoLectivo?: string;
  nppAtivo?: boolean;
  regimePeriodos?: RegimePeriodosLetivos;
  periodosConfig?: PeriodoLetivoConfig[];
  escolaId?: string;
}): ResultadoMediaGeralClasse {
  const {
    classe,
    turmasDaClasse,
    alunosDaClasse,
    disciplinas,
    notasConsolidadas,
    regrasMAC = [],
    juris = [],
    trimestreFiltro = 'anual',
    anoLectivo,
    nppAtivo = true,
    regimePeriodos = 'Trimestral',
    periodosConfig = [],
    escolaId,
  } = params;

  const alunosAtivos = alunosDaClasse.filter((a) => a.estado !== 'Desistente' && a.estado !== 'Transferido');
  const alunosIds = new Set(alunosAtivos.map((a) => a.id));

  const regra =
    regrasMAC.find((r) => (!escolaId || r.escolaId === escolaId) && normalizarClasseSimples(r.classe) === normalizarClasseSimples(classe)) ||
    regrasMAC[0];

  const notasDoEscopo = notasConsolidadas.filter((n) => {
    if (!alunosIds.has(n.alunoId)) return false;
    if (escolaId && escolaId !== 'todas' && n.escolaId && n.escolaId !== escolaId) return false;
    if (anoLectivo && anoLectivo !== 'todos' && n.anoLectivo && n.anoLectivo !== anoLectivo) return false;
    return true;
  });

  // 1. Disciplinas obrigatórias configuradas para esta classe/cursos
  const discsConfiguradas = obterDisciplinasDaClasseComCurso(disciplinas, classe, turmasDaClasse);
  const discMap = new Map<string, { id: string; nome: string; nomesNorm: Set<string> }>();

  for (const d of discsConfiguradas) {
    const nomeNorm = normalizarNomeDisc(d.nome);
    const key = d.id || nomeNorm;
    if (!key) continue;
    discMap.set(key, { id: d.id, nome: d.nome, nomesNorm: new Set([nomeNorm]) });
  }

  // Incluir também disciplinas presentes nas notas desta classe caso ainda não estejam na matriz filtrada
  const nomeParaChave = new Map<string, string>();
  discMap.forEach((v, k) => {
    v.nomesNorm.forEach((nn) => nomeParaChave.set(nn, k));
  });

  for (const n of notasDoEscopo) {
    const idDisc = (n.disciplinaId || '').trim();
    const nomeDisc = (n.disciplinaNome || '').trim();
    const nn = normalizarNomeDisc(nomeDisc);
    if (idDisc && discMap.has(idDisc)) continue;
    if (nn && nomeParaChave.has(nn)) continue;
    const discGlobal = disciplinas.find((d) => d.id === idDisc || (nn && normalizarNomeDisc(d.nome) === nn));
    const chave = discGlobal?.id || idDisc || nn;
    if (!chave) continue;
    discMap.set(chave, {
      id: discGlobal?.id || idDisc || chave,
      nome: discGlobal?.nome || nomeDisc || chave,
      nomesNorm: new Set([normalizarNomeDisc(discGlobal?.nome || nomeDisc || chave)])
    });
    if (nn) nomeParaChave.set(nn, chave);
  }

  // Agrupar notas por (alunoId -> disciplinaKey -> NotaTrimestralConsolidada[])
  const notasPorAlunoDisc = new Map<string, Map<string, NotaTrimestralConsolidada[]>>();
  for (const n of notasDoEscopo) {
    const idDisc = (n.disciplinaId || '').trim();
    const nn = normalizarNomeDisc(n.disciplinaNome);
    const chave = (idDisc && discMap.has(idDisc) ? idDisc : nomeParaChave.get(nn)) || idDisc || nn;
    if (!chave) continue;

    let mapaAl = notasPorAlunoDisc.get(n.alunoId);
    if (!mapaAl) {
      mapaAl = new Map();
      notasPorAlunoDisc.set(n.alunoId, mapaAl);
    }
    const lista = mapaAl.get(chave);
    if (lista) lista.push(n);
    else mapaAl.set(chave, [n]);
  }

  // 2. Calcular média por disciplina necessária
  const alunosAvaliadosGeral = new Set<string>();
  const mediasPorDisciplina: MediaDisciplinaClasse[] = [];

  discMap.forEach((discInfo, discKey) => {
    let somaDisc = 0;
    let qtdDisc = 0;

    for (const al of alunosAtivos) {
      const mapaAl = notasPorAlunoDisc.get(al.id);
      const recs = mapaAl?.get(discKey) || [];
      let valor = recs.length > 0
        ? calcularValorDisciplinaPeriodo(recs, trimestreFiltro, classe, regra, nppAtivo, regimePeriodos, periodosConfig)
        : null;

      // Considerar deliberações homologadas da Comissão de Júri no cálculo anual
      if (trimestreFiltro === 'anual') {
        const juriAl = juris.find(
          (j) =>
            (j.pautaHomologada || j.estado === 'Validada') &&
            (!anoLectivo || anoLectivo === 'todos' || !j.anoLectivo || j.anoLectivo === anoLectivo) &&
            (j.turmasIds?.includes(al.turmaId) || normalizarClasseSimples(j.classe) === normalizarClasseSimples(classe))
        );
        const alt = juriAl?.deliberacoes?.[al.id]?.notasAlteradas?.find(
          (x) => x.disciplinaId === discInfo.id || discInfo.nomesNorm.has(normalizarNomeDisc(x.disciplinaNome))
        );
        if (alt && typeof alt.novaNota === 'number' && !isNaN(alt.novaNota)) {
          valor = alt.novaNota;
        }
      }

      if (valor !== null && !isNaN(valor)) {
        somaDisc += valor;
        qtdDisc += 1;
        alunosAvaliadosGeral.add(al.id);
      }
    }

    mediasPorDisciplina.push({
      disciplinaId: discInfo.id,
      disciplinaNome: discInfo.nome,
      media: qtdDisc > 0 ? Math.round((somaDisc / qtdDisc) * 10) / 10 : null,
      alunosAvaliados: qtdDisc,
    });
  });

  // 3. Média Geral da Classe calculada a partir das médias das suas disciplinas
  const mediasDisciplinasValidas = mediasPorDisciplina
    .map((m) => m.media)
    .filter((v): v is number => v !== null && !isNaN(v));

  const totalDisciplinasNecessarias = mediasPorDisciplina.length;
  const disciplinasComNotas = mediasDisciplinasValidas.length;
  const disciplinasPendentes = Math.max(0, totalDisciplinasNecessarias - disciplinasComNotas);
  const coberturaPct = totalDisciplinasNecessarias > 0
    ? Math.round((disciplinasComNotas / totalDisciplinasNecessarias) * 100)
    : 0;

  const mediaGeral = disciplinasComNotas > 0
    ? Math.round((mediasDisciplinasValidas.reduce((acc, v) => acc + v, 0) / disciplinasComNotas) * 10) / 10
    : null;

  return {
    classe,
    mediaGeral,
    totalDisciplinasNecessarias,
    disciplinasComNotas,
    disciplinasPendentes,
    coberturaPct,
    totalAlunosAvaliados: alunosAvaliadosGeral.size,
    mediasPorDisciplina,
  };
}

export interface ResultadoPeriodoSegmentado {
  numero: 1 | 2 | 3;
  nome: string;
  estado: 'Aberto' | 'Fechado';
  pesoPercentual: number;
  mediaGeral: number | null;
  totalAlunosAvaliados: number;
  taxaAprovacao: number;
  disciplinasComNotas: number;
}

export interface ResultadoSegmentadoAnoLetivo {
  regime: RegimePeriodosLetivos;
  periodos: ResultadoPeriodoSegmentado[];
  mediaAnualSegmentada: number | null;
}

/**
 * Calcula médias segmentadas ao longo do ano letivo (por Trimestres ou Semestres configurados),
 * respeitando os pesos percentuais e permitindo análise contínua por período e anual.
 */
export function calcularMediasSegmentadasAnoLetivo(params: {
  regime: RegimePeriodosLetivos;
  periodosConfig: PeriodoLetivoConfig[];
  alunos: Aluno[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  regrasMAC?: RegraCalculoMAC[];
  juris?: ComissaoJuri[];
  anoLectivo?: string;
  nppAtivo?: boolean;
  escolaId?: string;
  classeFiltro?: string;
}): ResultadoSegmentadoAnoLetivo {
  const {
    regime,
    periodosConfig,
    alunos,
    turmas,
    disciplinas,
    notasConsolidadas,
    regrasMAC = [],
    juris = [],
    anoLectivo,
    nppAtivo = true,
    escolaId,
    classeFiltro,
  } = params;

  const numeros: Array<1 | 2 | 3> = regime === 'Semestral' ? [1, 2] : [1, 2, 3];
  const turmasFiltradas = classeFiltro
    ? turmas.filter((t) => normalizarClasseSimples(t.classe) === normalizarClasseSimples(classeFiltro))
    : turmas;
  const turmaIds = new Set(turmasFiltradas.map((t) => t.id));
  const alunosFiltrados = classeFiltro
    ? alunos.filter((a) => normalizarClasseSimples(a.classeId) === normalizarClasseSimples(classeFiltro) || turmaIds.has(a.turmaId))
    : alunos;

  const resultadosPeriodos: ResultadoPeriodoSegmentado[] = numeros.map((num) => {
    const cfg = periodosConfig.find((p) => Number(p.numero) === num || extrairNumeroPeriodo(p.trimestre) === num);
    const triStr = String(num) as '1' | '2' | '3';
    const peso = typeof cfg?.pesoPercentual === 'number' && cfg.pesoPercentual > 0
      ? cfg.pesoPercentual
      : (regime === 'Semestral' ? 50 : (num === 3 ? 33.4 : 33.3));

    const classesMap = new Map<string, Turma[]>();
    turmasFiltradas.forEach((t) => {
      const c = t.classe || 'Outra';
      const arr = classesMap.get(c);
      if (arr) arr.push(t);
      else classesMap.set(c, [t]);
    });

    let somaMediasNorm = 0;
    let qtdClassesComMedia = 0;
    let totalDiscComNotas = 0;

    if (classeFiltro) {
      const resCls = calcularMediaGeralDaClasse({
        classe: classeFiltro,
        turmasDaClasse: turmasFiltradas,
        alunosDaClasse: alunosFiltrados,
        disciplinas,
        notasConsolidadas,
        regrasMAC,
        juris,
        trimestreFiltro: triStr,
        anoLectivo,
        nppAtivo,
        regimePeriodos: regime,
        periodosConfig,
        escolaId,
      });
      if (resCls.mediaGeral !== null) {
        somaMediasNorm = resCls.mediaGeral;
        qtdClassesComMedia = 1;
      }
      totalDiscComNotas = resCls.disciplinasComNotas;
    } else {
      classesMap.forEach((tCls, clsNome) => {
        const tClsIds = new Set(tCls.map((t) => t.id));
        const alCls = alunosFiltrados.filter((a) => tClsIds.has(a.turmaId) || normalizarClasseSimples(a.classeId) === normalizarClasseSimples(clsNome));
        const resCls = calcularMediaGeralDaClasse({
          classe: clsNome,
          turmasDaClasse: tCls,
          alunosDaClasse: alCls,
          disciplinas,
          notasConsolidadas,
          regrasMAC,
          juris,
          trimestreFiltro: triStr,
          anoLectivo,
          nppAtivo,
          regimePeriodos: regime,
          periodosConfig,
          escolaId,
        });
        if (resCls.mediaGeral !== null) {
          const escala = obterEscalaMaximaPorNivel(tCls[0]?.nivelEnsino, clsNome);
          somaMediasNorm += escala === 10 ? resCls.mediaGeral * 2 : resCls.mediaGeral;
          qtdClassesComMedia += 1;
        }
        totalDiscComNotas += resCls.disciplinasComNotas;
      });
    }

    const aprovResumo = calcularAproveitamentoPautaGeralAlunos({
      alunos: alunosFiltrados,
      notasConsolidadas,
      turmas: turmasFiltradas,
      regrasMAC,
      juris,
      trimestreFiltro: triStr,
      anoLectivo,
      nppAtivo,
      escolaId,
    });

    let mediaPeriodo: number | null = null;
    if (qtdClassesComMedia > 0) {
      const raw = somaMediasNorm / qtdClassesComMedia;
      const ehTodasPrimario = !classeFiltro && turmasFiltradas.length > 0 && turmasFiltradas.every((t) => obterEscalaMaximaPorNivel(t.nivelEnsino, t.classe) === 10);
      mediaPeriodo = Math.round((ehTodasPrimario ? raw / 2 : raw) * 10) / 10;
    }

    return {
      numero: num,
      nome: cfg?.nome || `${num}º ${regime === 'Semestral' ? 'Semestre' : 'Trimestre'}`,
      estado: cfg?.estado || 'Aberto',
      pesoPercentual: peso,
      mediaGeral: mediaPeriodo,
      totalAlunosAvaliados: aprovResumo.totalAvaliados,
      taxaAprovacao: aprovResumo.taxaAprovacao,
      disciplinasComNotas: totalDiscComNotas,
    };
  });

  const periodosComMedia = resultadosPeriodos.filter((p) => p.mediaGeral !== null);
  let mediaAnualSegmentada: number | null = null;
  if (periodosComMedia.length > 0) {
    let somaPond = 0;
    let somaPesos = 0;
    periodosComMedia.forEach((p) => {
      const w = p.pesoPercentual > 0 ? p.pesoPercentual : 1;
      somaPond += (p.mediaGeral as number) * w;
      somaPesos += w;
    });
    mediaAnualSegmentada = somaPesos > 0 ? Math.round((somaPond / somaPesos) * 10) / 10 : null;
  }

  return {
    regime,
    periodos: resultadosPeriodos,
    mediaAnualSegmentada,
  };
}




