import {
  Aluno,
  AvaliacaoCriada,
  Disciplina,
  Escola,
  Funcionario,
  NotaEstudante,
  NotaTrimestralConsolidada,
  RegraCalculoMAC,
  Turma,
  Trimestre,
} from '../types';
import {
  calcularConceitoIniciacao,
  calcularMACEstudante,
  isClasseFinal,
  obterEscalaMaximaPorNivel,
} from './macEngine';
import { dbService } from './storage';
import { formatarDataHoraAngolana } from '../utils/dateFormat';

export type TipoComponenteNotaAdministrativa =
  | 'AVALIACAO'
  | 'PROVA_TRIMESTRAL'
  | 'NPP'
  | 'EXAME';

export interface PreviewNotaAdministrativaItem {
  alunoId: string;
  alunoNome: string;
  codigoMatricula: string;
  mediaOutrasDisciplinas: number;
  disciplinasBaseCount: number;
  ratioDesempenho: number;
  notaAtual: number | null;
  notaProposta: number;
  aplicar: boolean;
  motivoBase: string;
}

export interface ResultadoPreviewNotasAdministrativas {
  itens: PreviewNotaAdministrativaItem[];
  escalaMaxima: 10 | 20;
  ehPrimario: boolean;
  minimoPermitido: 4 | 8;
  maximoPermitido: 10 | 20;
  totalAplicaveis: number;
  mediaTurmaOutrasDisciplinas: number;
}

/**
 * Calcula notas administrativas proporcionais para uma turma e disciplina:
 * - Ensino Primário (Iniciação à 6ª Classe): estritamente entre 4.0 e 10.0 valores
 * - I e II Ciclos / Ensino Técnico (7ª à 13ª Classe): estritamente entre 8.0 e 20.0 valores
 * Alunos com melhores notas noutras disciplinas recebem notas proporcionais mais altas.
 */
export function calcularNotasAdministrativasProporcionais(params: {
  turma: Turma;
  disciplinaId: string;
  trimestre: Trimestre | '1' | '2' | '3';
  anoLectivo: string;
  alunosDaTurma: Aluno[];
  avaliacoes: AvaliacaoCriada[];
  notasAvaliacoes: NotaEstudante[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  regraVigente: RegraCalculoMAC;
  alvoTipo: TipoComponenteNotaAdministrativa;
  apenasEmFalta?: boolean;
  notasExameActuaisPorAluno?: Record<string, number | undefined>;
}): ResultadoPreviewNotasAdministrativas {
  const {
    turma,
    disciplinaId,
    trimestre,
    anoLectivo,
    alunosDaTurma,
    avaliacoes,
    notasAvaliacoes,
    notasConsolidadas,
    regraVigente,
    alvoTipo,
    apenasEmFalta = true,
    notasExameActuaisPorAluno,
  } = params;

  const escalaMaxima = obterEscalaMaximaPorNivel(turma.nivelEnsino, turma.classe);
  const ehPrimario = escalaMaxima === 10;
  const minimoPermitido: 4 | 8 = ehPrimario ? 4 : 8;
  const maximoPermitido: 10 | 20 = ehPrimario ? 10 : 20;
  const baselineSemHistorico = ehPrimario ? 5 : 10;

  const trimStr = String(trimestre) as Trimestre;
  const avsPorId = new Map<string, AvaliacaoCriada>();
  for (const av of avaliacoes) {
    avsPorId.set(av.id, av);
  }

  const avsTargetDisciplina = avaliacoes.filter(
    (av) =>
      av.turmaId === turma.id &&
      av.disciplinaId === disciplinaId &&
      String(av.trimestre) === trimStr
  );

  // Calcular média noutras disciplinas para cada aluno
  const calcularBaselineOutrasDisciplinas = (
    alunoId: string
  ): { media: number; ratio: number; disciplinasCount: number; motivo: string } => {
    const porDisciplinaSameTrim = new Map<string, number[]>();
    const porDisciplinaOutrosTrim = new Map<string, number[]>();

    // 1. Ler notas consolidadas de OUTRAS disciplinas do aluno
    for (const nc of notasConsolidadas) {
      if (nc.alunoId !== alunoId || nc.disciplinaId === disciplinaId) continue;
      if (anoLectivo && nc.anoLectivo && nc.anoLectivo !== anoLectivo) continue;

      const componentes: number[] = [];
      if (typeof nc.notaFinal === 'number' && nc.notaFinal > 0) {
        componentes.push(nc.notaFinal);
      } else if (typeof nc.mediaTrimestral === 'number' && nc.mediaTrimestral > 0) {
        componentes.push(nc.mediaTrimestral);
      } else {
        const sub: number[] = [];
        if (typeof nc.mac === 'number' && nc.mac > 0) sub.push(nc.mac);
        if (typeof nc.npp === 'number' && nc.npp > 0) sub.push(nc.npp);
        const pt = nc.provaTrimestral || nc.npt;
        if (typeof pt === 'number' && pt > 0) sub.push(pt);
        if (sub.length > 0) {
          componentes.push(sub.reduce((a, b) => a + b, 0) / sub.length);
        }
      }

      if (componentes.length === 0) continue;
      const val = Math.min(escalaMaxima, Math.max(0, componentes[0]));

      if (String(nc.trimestre) === trimStr) {
        const arr = porDisciplinaSameTrim.get(nc.disciplinaId) || [];
        arr.push(val);
        porDisciplinaSameTrim.set(nc.disciplinaId, arr);
      } else {
        const arr = porDisciplinaOutrosTrim.get(nc.disciplinaId) || [];
        arr.push(val);
        porDisciplinaOutrosTrim.set(nc.disciplinaId, arr);
      }
    }

    // 2. Complementar com avaliações individuais (NotaEstudante) de OUTRAS disciplinas sem nota consolidada
    for (const n of notasAvaliacoes) {
      if (n.alunoId !== alunoId || typeof n.valorNota !== 'number') continue;
      const av = avsPorId.get(n.avaliacaoId);
      if (!av || av.disciplinaId === disciplinaId) continue;
      if (anoLectivo && av.anoLectivo && av.anoLectivo !== anoLectivo) continue;

      const scaleAv = av.pontuacaoMaxima > 0 ? av.pontuacaoMaxima : escalaMaxima;
      const valNorm = Math.min(
        escalaMaxima,
        Math.max(0, (n.valorNota / scaleAv) * escalaMaxima)
      );

      if (String(av.trimestre) === trimStr) {
        if (!porDisciplinaSameTrim.has(av.disciplinaId)) {
          const arr = porDisciplinaSameTrim.get(av.disciplinaId) || [];
          arr.push(valNorm);
          porDisciplinaSameTrim.set(av.disciplinaId, arr);
        }
      } else if (!porDisciplinaOutrosTrim.has(av.disciplinaId)) {
        const arr = porDisciplinaOutrosTrim.get(av.disciplinaId) || [];
        arr.push(valNorm);
        porDisciplinaOutrosTrim.set(av.disciplinaId, arr);
      }
    }

    const fonteMap =
      porDisciplinaSameTrim.size > 0 ? porDisciplinaSameTrim : porDisciplinaOutrosTrim;
    const fonteLabel =
      porDisciplinaSameTrim.size > 0
        ? `${porDisciplinaSameTrim.size} disciplina(s) no ${trimStr}º Trimestre`
        : porDisciplinaOutrosTrim.size > 0
        ? `${porDisciplinaOutrosTrim.size} disciplina(s) noutros trimestres`
        : 'Sem histórico noutras disciplinas (base regulamentar)';

    if (fonteMap.size === 0) {
      const ratioDefault =
        (baselineSemHistorico - minimoPermitido) / (maximoPermitido - minimoPermitido);
      return {
        media: 0,
        ratio: Math.min(1, Math.max(0, ratioDefault)),
        disciplinasCount: 0,
        motivo: fonteLabel,
      };
    }

    const mediasPorDisciplina: number[] = [];
    fonteMap.forEach((vals) => {
      if (vals.length > 0) {
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        mediasPorDisciplina.push(m);
      }
    });

    const mediaGeralOutras =
      mediasPorDisciplina.reduce((a, b) => a + b, 0) / mediasPorDisciplina.length;
    const ratio = Math.min(1, Math.max(0, mediaGeralOutras / escalaMaxima));

    return {
      media: Math.round(mediaGeralOutras * 10) / 10,
      ratio,
      disciplinasCount: mediasPorDisciplina.length,
      motivo: fonteLabel,
    };
  };

  // Calcular nota atual do aluno no componente alvo
  const obterNotaAtualNoAlvo = (alunoId: string): number | null => {
    if (alvoTipo === 'EXAME' && notasExameActuaisPorAluno) {
      const v = notasExameActuaisPorAluno[alunoId];
      return typeof v === 'number' && v > 0 ? v : null;
    }

    const nc = notasConsolidadas.find(
      (c) =>
        c.alunoId === alunoId &&
        c.disciplinaId === disciplinaId &&
        String(c.trimestre) === trimStr
    );

    if (alvoTipo === 'AVALIACAO') {
      const resMac = calcularMACEstudante(
        alunoId,
        avsTargetDisciplina,
        notasAvaliacoes,
        regraVigente,
        turma.nivelEnsino,
        turma.classe
      );
      if (resMac.totalAvaliacoesUtilizadas > 0) return resMac.macCalculada;
      if (nc && typeof nc.mac === 'number' && nc.mac > 0) return nc.mac;
      return null;
    }

    if (alvoTipo === 'PROVA_TRIMESTRAL') {
      const pt = nc?.provaTrimestral ?? nc?.npt;
      return typeof pt === 'number' && pt > 0 ? pt : null;
    }

    if (alvoTipo === 'NPP') {
      return typeof nc?.npp === 'number' && nc.npp > 0 ? nc.npp : null;
    }

    if (alvoTipo === 'EXAME') {
      return typeof nc?.notaExame === 'number' && nc.notaExame > 0 ? nc.notaExame : null;
    }

    return null;
  };

  const ordenados = [...alunosDaTurma].sort((a, b) =>
    (a.nomeCompleto || '').localeCompare(b.nomeCompleto || '', 'pt', { sensitivity: 'base' })
  );

  let somaMediasOutras = 0;
  let contComOutras = 0;

  const itens: PreviewNotaAdministrativaItem[] = ordenados.map((al) => {
    const base = calcularBaselineOutrasDisciplinas(al.id);
    if (base.disciplinasCount > 0) {
      somaMediasOutras += base.media;
      contComOutras++;
    }

    const rawProposta =
      base.disciplinasCount === 0
        ? baselineSemHistorico
        : minimoPermitido + base.ratio * (maximoPermitido - minimoPermitido);

    const notaProposta = Math.min(
      maximoPermitido,
      Math.max(minimoPermitido, Math.round(rawProposta * 10) / 10)
    );

    const notaAtual = obterNotaAtualNoAlvo(al.id);
    const aplicar = apenasEmFalta ? notaAtual === null : true;

    return {
      alunoId: al.id,
      alunoNome: al.nomeCompleto,
      codigoMatricula: al.codigoMatricula || al.numeroProcesso || '',
      mediaOutrasDisciplinas: base.media,
      disciplinasBaseCount: base.disciplinasCount,
      ratioDesempenho: base.ratio,
      notaAtual,
      notaProposta,
      aplicar,
      motivoBase: base.motivo,
    };
  });

  return {
    itens,
    escalaMaxima,
    ehPrimario,
    minimoPermitido,
    maximoPermitido,
    totalAplicaveis: itens.filter((i) => i.aplicar).length,
    mediaTurmaOutrasDisciplinas:
      contComOutras > 0 ? Math.round((somaMediasOutras / contComOutras) * 10) / 10 : 0,
  };
}

/**
 * Aplica em lote as notas administrativas calculadas no banco offline + fila Firebase,
 * recalculando MAC, MT, MF e conceito de Iniciação automaticamente.
 */
export function aplicarNotasAdministrativas(params: {
  escola: Escola;
  turma: Turma;
  disciplina?: Disciplina;
  disciplinaId: string;
  trimestre: Trimestre | '1' | '2' | '3';
  currentUser: Funcionario;
  regraVigente: RegraCalculoMAC;
  alvoTipo: TipoComponenteNotaAdministrativa;
  itensPreview: PreviewNotaAdministrativaItem[];
  justificativa: string;
}): {
  aplicadasCount: number;
  avaliacaoCriadaOuUsada?: AvaliacaoCriada;
} {
  const {
    escola,
    turma,
    disciplina,
    disciplinaId,
    trimestre,
    currentUser,
    regraVigente,
    alvoTipo,
    itensPreview,
    justificativa,
  } = params;

  const itensAplicar = itensPreview.filter((i) => i.aplicar);
  if (itensAplicar.length === 0) {
    return { aplicadasCount: 0 };
  }

  const trimStr = String(trimestre) as Trimestre;
  const anoLectivo = turma.anoLectivo || escola.anoLectivoActivo || '';
  const escalaMaxima = obterEscalaMaximaPorNivel(turma.nivelEnsino, turma.classe);
  const provaProfessorAtiva = Boolean(escola.nppAtivo);
  const ehClasseFinal = isClasseFinal(turma.classe, regraVigente);
  const agoraIso = new Date().toISOString();
  const dataHoje = agoraIso.split('T')[0];
  const dataHoraFmt = formatarDataHoraAngolana(new Date());

  const avsAtuais = dbService.getAvaliacoes();
  let notasAvAtuais = [...dbService.getNotas()];
  let avTarget: AvaliacaoCriada | undefined;

  if (alvoTipo === 'AVALIACAO') {
    const existentesTurmaDisc = avsAtuais.filter(
      (av) =>
        av.turmaId === turma.id &&
        av.disciplinaId === disciplinaId &&
        String(av.trimestre) === trimStr
    );
    avTarget =
      existentesTurmaDisc.find((av) =>
        (av.titulo || '').toLowerCase().includes('administrativa')
      ) || existentesTurmaDisc[0];

    if (!avTarget) {
      avTarget = {
        id: `av-adm-${turma.id}-${disciplinaId}-T${trimStr}-${Date.now()}`,
        escolaId: escola.id,
        turmaId: turma.id,
        disciplinaId,
        disciplinaNome: disciplina?.nome || '',
        professorId: currentUser.id,
        trimestre: trimStr,
        anoLectivo,
        tipoId: 'tipo-02',
        tipoNome: 'Avaliação Administrativa (Direção)',
        titulo: `Avaliação Administrativa — ${disciplina?.sigla || disciplina?.nome || 'Disciplina'} (${trimStr}º T)`,
        dataAplicacao: dataHoje,
        pontuacaoMaxima: escalaMaxima,
        peso: 1,
        bloqueada: false,
        atualizadoEm: agoraIso,
      };
      dbService.salvarAvaliacao(avTarget);
    }

    for (const item of itensAplicar) {
      const metaAdm = {
        atribuidaPorNome: currentUser.nomeCompleto,
        atribuidaPorRole: currentUser.role,
        dataHora: dataHoraFmt,
        mediaOutrasDisciplinas: item.mediaOutrasDisciplinas,
        disciplinasBaseCount: item.disciplinasBaseCount,
        observacao: justificativa,
      };
      const novaNota: NotaEstudante = {
        id: `nota-${avTarget.id}-${item.alunoId}`,
        avaliacaoId: avTarget.id,
        alunoId: item.alunoId,
        valorNota: item.notaProposta,
        conceitoIniciacao:
          turma.classe === 'Iniciação'
            ? calcularConceitoIniciacao(item.notaProposta)
            : undefined,
        dataLancamento: dataHoje,
        origemNota: 'Administrativa',
        notaAdministrativaInfo: metaAdm,
        atualizadoEm: agoraIso,
      };

      const idxNota = notasAvAtuais.findIndex(
        (n) => n.avaliacaoId === avTarget!.id && n.alunoId === item.alunoId
      );
      if (idxNota >= 0) {
        notasAvAtuais[idxNota] = novaNota;
      } else {
        notasAvAtuais.push(novaNota);
      }
    }

    dbService.salvarNotas(notasAvAtuais);
  }

  // Atualizar notas consolidadas para que pautas, boletins, rankings e estatísticas passem a considerar imediatamente
  const avsAtualizadas = dbService.getAvaliacoes().filter(
    (av) =>
      av.turmaId === turma.id &&
      av.disciplinaId === disciplinaId &&
      String(av.trimestre) === trimStr
  );
  const consolidadas = [...dbService.getNotasConsolidadas()];

  for (const item of itensAplicar) {
    const idxC = consolidadas.findIndex(
      (c) =>
        c.alunoId === item.alunoId &&
        c.disciplinaId === disciplinaId &&
        String(c.trimestre) === trimStr
    );
    const existente = idxC >= 0 ? consolidadas[idxC] : null;

    const resMac = calcularMACEstudante(
      item.alunoId,
      avsAtualizadas,
      notasAvAtuais,
      regraVigente,
      turma.nivelEnsino,
      turma.classe
    );

    const macVal =
      alvoTipo === 'AVALIACAO'
        ? resMac.totalAvaliacoesUtilizadas > 0
          ? resMac.macCalculada
          : item.notaProposta
        : existente?.mac ?? resMac.macCalculada;

    const nppVal = alvoTipo === 'NPP' ? item.notaProposta : existente?.npp;
    const existentePt = existente
      ? (typeof existente.npt === 'number'
          ? existente.npt
          : (!('npt' in existente) || (typeof existente.provaTrimestral === 'number' && existente.provaTrimestral > 0)
              ? existente.provaTrimestral
              : undefined))
      : undefined;
    const ptVal =
      alvoTipo === 'PROVA_TRIMESTRAL'
        ? item.notaProposta
        : existentePt;
    const exameVal = ehClasseFinal
      ? alvoTipo === 'EXAME'
        ? item.notaProposta
        : existente?.notaExame
      : undefined;

    const temNpp = typeof nppVal === 'number' && !isNaN(nppVal);
    const temPt = typeof ptVal === 'number' && !isNaN(ptVal);

    let mediaTri = macVal;
    if (provaProfessorAtiva) {
      if (temNpp && temPt) {
        mediaTri = Math.round(((macVal + nppVal! + ptVal!) / 3) * 10) / 10;
      } else if (temPt) {
        mediaTri = Math.round(((macVal + ptVal!) / 2) * 10) / 10;
      } else if (temNpp) {
        mediaTri = Math.round(((macVal + nppVal!) / 2) * 10) / 10;
      }
    } else if (temPt) {
      mediaTri = Math.round(((macVal + ptVal!) / 2) * 10) / 10;
    }

    let notaFinal = mediaTri;
    if (ehClasseFinal && typeof exameVal === 'number' && !isNaN(exameVal)) {
      notaFinal = Math.round((mediaTri * 0.4 + exameVal * 0.6) * 10) / 10;
    }

    const metaAdm = {
      atribuidaPorNome: currentUser.nomeCompleto,
      atribuidaPorRole: currentUser.role,
      dataHora: dataHoraFmt,
      mediaOutrasDisciplinas: item.mediaOutrasDisciplinas,
      disciplinasBaseCount: item.disciplinasBaseCount,
      observacao: justificativa,
    };

    const atualizado: NotaTrimestralConsolidada = {
      id:
        existente?.id ||
        `nc-${item.alunoId}-${disciplinaId}-${trimStr}-${anoLectivo || 'padrao'}`,
      escolaId: existente?.escolaId || escola.id,
      alunoId: item.alunoId,
      turmaId: turma.id,
      disciplinaId,
      disciplinaNome: existente?.disciplinaNome || disciplina?.nome || '',
      trimestre: trimStr,
      anoLectivo: existente?.anoLectivo || anoLectivo,
      mac: macVal,
      npp: nppVal,
      provaTrimestral: ptVal,
      npt: ptVal,
      mediaTrimestral: mediaTri,
      notaFinal,
      notaExame: exameVal,
      comportamentoNota: existente?.comportamentoNota,
      comportamentoConceito: existente?.comportamentoConceito,
      assiduidadeConceito: existente?.assiduidadeConceito,
      faltas: existente?.faltas || 0,
      validadaPelaDirecao: true,
      origemNota: 'Administrativa',
      notaAdministrativaInfo: metaAdm,
      atualizadoEm: agoraIso,
    };

    if (idxC >= 0) {
      consolidadas[idxC] = atualizado;
    } else {
      consolidadas.push(atualizado);
    }
  }

  dbService.salvarNotasConsolidadas(consolidadas);

  const labelComp =
    alvoTipo === 'AVALIACAO'
      ? 'Avaliação Contínua (MAC)'
      : alvoTipo === 'PROVA_TRIMESTRAL'
      ? 'Prova Trimestral (PT)'
      : alvoTipo === 'NPP'
      ? 'Prova do Professor (NPP)'
      : 'Exame';

  dbService.registarLog(
    'Atribuição Administrativa de Notas',
    `${currentUser.nomeCompleto} (${currentUser.cargo || currentUser.role}) atribuiu ${itensAplicar.length} nota(s) administrativa(s) proporcional(is) em ${labelComp} para ${disciplina?.nome || disciplinaId} na turma ${turma.nome} (${turma.classe}, ${trimStr}º Trimestre). Intervalo regulamentar: ${escalaMaxima === 10 ? '4 a 10' : '8 a 20'} valores. Motivo: ${justificativa}.`
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));
  }

  return {
    aplicadasCount: itensAplicar.length,
    avaliacaoCriadaOuUsada: avTarget,
  };
}
