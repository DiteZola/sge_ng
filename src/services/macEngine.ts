import { 
  NivelEnsino, 
  ConceitoQualitativoIniciacao, 
  RegraCalculoMAC, 
  AvaliacaoCriada, 
  NotaEstudante, 
  Aluno 
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
 * Converte valor numérico de comportamento (0-20) em conceito qualitativo oficial (de Medíocre a Excelente)
 */
export function converterComportamentoParaConceito(nota: number): string {
  if (nota >= 17) return 'Excelente';
  if (nota >= 14) return 'Bom';
  if (nota >= 10) return 'Suficiente';
  if (nota >= 7) return 'Insuficiente';
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
 * Calcula a Média Trimestral (MT) aplicando a fórmula configurada para a classe e trimestre
 * Normas MED Angola ou Fórmulas Criadas pelo Director Geral / Administrador
 */
export function calcularNotaTrimestralDinamica(
  mac: number,
  npp: number,
  npt: number | undefined,
  regra?: RegraCalculoMAC,
  trimestre: number = 1,
  classe: string = '7ª'
): { mediaTrimestral: number; formulaAplicada: string } {
  const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
  const nptVal = npt !== undefined && npt > 0 ? npt : npp;

  // 1. Verificar se há fórmula personalizada expressa para o trimestre em questão
  const formulaTrimestreEspecifica = 
    trimestre === 3 
      ? (regra?.formula3Trimestre || regra?.formulaTerceiroTrimestre)
      : (trimestre === 1 
          ? (regra?.formula1Trimestre || regra?.formulaPrimeirosTrimestres) 
          : (regra?.formula2Trimestre || regra?.formulaPrimeirosTrimestres));

  const formulaTexto = formulaTrimestreEspecifica || regra?.formulaTrimestral || regra?.formulaCustom;

  if (formulaTexto) {
    const res = avaliarExpressaoNota(formulaTexto, {
      MAC: mac,
      NPP: npp,
      NPT: nptVal,
      PA: mac
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

  if (pesosAplicaveis) {
    const wMac = Number(pesosAplicaveis.mac) || 1;
    const wNpp = Number(pesosAplicaveis.npp) || 1;
    const wNpt = npt !== undefined ? (Number(pesosAplicaveis.npt) || 1) : 0;
    const totalPesos = wMac + wNpp + wNpt;
    if (totalPesos > 0) {
      const mtPond = ((mac * wMac) + (npp * wNpp) + ((npt || 0) * wNpt)) / totalPesos;
      const finalVal = Math.min(escala, Math.max(0, Math.round(mtPond * 10) / 10));
      return {
        mediaTrimestral: finalVal,
        formulaAplicada: `Ponderação Direção (${trimestre}º Trim.): MAC(${wMac}) + NPP(${wNpp}) + NPT(${wNpt})`
      };
    }
  }

  // 3. Se possui Prova Trimestral (NPT) - Padrão Oficial do Ministério da Educação (MED)
  if (npt !== undefined && npt > 0) {
    const mt = (mac + npp + npt) / 3;
    return {
      mediaTrimestral: Math.min(escala, Math.max(0, Math.round(mt * 10) / 10)),
      formulaAplicada: 'Padrão MED: (MAC + NPP + NPT) / 3'
    };
  }

  // 4. Padrão contínuo com MAC e Avaliação de Período
  const mt = (mac + npp) / 2;
  return {
    mediaTrimestral: Math.min(escala, Math.max(0, Math.round(mt * 10) / 10)),
    formulaAplicada: 'Padrão MED: (MAC + NPP) / 2'
  };
}

/**
 * Calcula a Média Final (MF) e Média Geral com suporte a:
 * - Fórmulas de classes normais/não-finais (MT1, MT2, MT3) com pesos ou expressões
 * - Classes finais com Exame / Prova Global (MDF + Exame)
 * - Ponderações configuradas pelo Diretor / Administrador Geral
 */
export function calcularMediaFinal3Trimestre(
  mt1: number,
  mt2: number,
  mt3: number,
  exameFinal?: number,
  regra?: RegraCalculoMAC,
  classe: string = '7ª'
): { mediaFinal: number; status: 'Aprovado' | 'Recurso' | 'Reprovado'; formulaDetalhe: string } {
  const escala = obterEscalaMaximaPorNivel(regra?.nivelEnsino, classe);
  const notaAprovacao = regra?.notaMinimaAprovacao || (escala === 10 ? 5 : 10);
  const notaMinRecurso = regra?.notaMinimaExameRecurso || (escala === 10 ? 4 : 7);

  // Média de Frequência Anual (MDF)
  let mtGeral = (mt1 + mt2 + mt3) / 3;
  if (regra?.pesosTrimestresMF) {
    const w1 = Number(regra.pesosTrimestresMF.t1) || 1;
    const w2 = Number(regra.pesosTrimestresMF.t2) || 1;
    const w3 = Number(regra.pesosTrimestresMF.t3) || 1;
    const totalW = w1 + w2 + w3;
    if (totalW > 0) {
      mtGeral = (mt1 * w1 + mt2 * w2 + mt3 * w3) / totalW;
    }
  }

  let mf = mtGeral;
  let detalhe = 'Média das Médias Trimestrais: (MT1 + MT2 + MT3) / 3';

  // Identificar se a classe é uma classe de exame final (ex: 6ª, 9ª, 12ª, 13ª ou configurada na regra)
  const classesFinaisPadrao = ['6ª', '9ª', '12ª', '13ª'];
  const classesFinais = regra?.classesFinaisConfiguradas || classesFinaisPadrao;
  const ehClasseFinal = classesFinais.some(cf => classe.toLowerCase().includes(cf.toLowerCase()));

  // 1. Se for classe final e houver exame ou cálculo de exame configurado
  if ((ehClasseFinal || regra?.tipoCalculo3Trimestre === 'PONDERADO_EXAME') && exameFinal !== undefined && exameFinal >= 0) {
    if (regra?.formulaClassesFinaisExame) {
      const res = avaliarExpressaoNota(regra.formulaClassesFinaisExame, {
        MDF: mtGeral,
        MT1: mt1,
        MT2: mt2,
        MT3: mt3,
        NE: exameFinal,
        EXAME: exameFinal
      });
      if (res !== null) {
        mf = res;
        detalhe = `Classe Final com Exame (Fórmula): ${regra.formulaClassesFinaisExame}`;
      }
    } else {
      const pesoNE = regra?.pesoNEClassesFinais || (regra?.pesoExameFinal ? (regra.pesoExameFinal > 1 ? regra.pesoExameFinal : regra.pesoExameFinal * 100) : 60);
      const pesoMDF = regra?.pesoMDFClassesFinais || (regra?.pesoMediasTrimestrais ? (regra.pesoMediasTrimestrais > 1 ? regra.pesoMediasTrimestrais : regra.pesoMediasTrimestrais * 100) : 40);
      const fracNE = pesoNE / (pesoNE + pesoMDF);
      const fracMDF = pesoMDF / (pesoNE + pesoMDF);
      mf = (mtGeral * fracMDF) + (exameFinal * fracNE);
      detalhe = `Classe Final: ${Math.round(fracMDF * 100)}% Frequência (MDF) + ${Math.round(fracNE * 100)}% Exame (NE)`;
    }
  } else if (regra?.formulaMediaGeralClasse) {
    // 2. Classes Não Finais: Fórmula da Média Geral personalizada
    const res = avaliarExpressaoNota(regra.formulaMediaGeralClasse, {
      MT1: mt1,
      MT2: mt2,
      MT3: mt3
    });
    if (res !== null) {
      mf = res;
      detalhe = `Classes Não Finais (Fórmula): ${regra.formulaMediaGeralClasse}`;
    }
  } else if (regra?.pesosTrimestresMF) {
    const w1 = Number(regra.pesosTrimestresMF.t1) || 1;
    const w2 = Number(regra.pesosTrimestresMF.t2) || 1;
    const w3 = Number(regra.pesosTrimestresMF.t3) || 1;
    mf = (mt1 * w1 + mt2 * w2 + mt3 * w3) / (w1 + w2 + w3);
    detalhe = `Classes Não Finais: Ponderação T1(${w1}) + T2(${w2}) + T3(${w3})`;
  }

  mf = Math.min(escala, Math.max(0, Math.round(mf * 10) / 10));

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

  return { mediaFinal: mf, status, formulaDetalhe: detalhe };
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


