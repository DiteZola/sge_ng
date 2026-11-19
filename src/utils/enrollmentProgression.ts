import {
  Aluno,
  Turma,
  NotaTrimestralConsolidada,
  ComissaoJuri,
  HistoricoEscolarCompleto
} from '../types';
import { normalizarClasse } from '../services/academicHierarchyService';
import { obterInformacaoEscala } from '../services/macEngine';

export const CLASSES_ORDEM_MED: string[] = [
  'Iniciação',
  '1ª',
  '2ª',
  '3ª',
  '4ª',
  '5ª',
  '6ª',
  '7ª',
  '8ª',
  '9ª',
  '10ª',
  '11ª',
  '12ª',
  '13ª'
];

export type SituacaoProgressaoAnoPassado =
  | 'Aprovado'
  | 'Reprovado'
  | 'Desistente'
  | 'SemRegisto';

export interface AvaliacaoProgressaoAluno {
  situacao: SituacaoProgressaoAnoPassado;
  classeAnterior: string;
  anoAnterior: string;
  classeSugerida: string;
  deveAvancar: boolean;
  mediaCalculada: number | null;
  escalaMaxima: 10 | 20;
  notaMinimaAprovacao: 5 | 10;
  motivo: string;
}

/**
 * Ordena uma lista de nomes de classes conforme a hierarquia oficial do MED Angola.
 */
export function ordenarClassesMED(classes: string[]): string[] {
  const unicas = Array.from(new Set(classes.map(c => normalizarClasse(c)).filter(Boolean)));
  return unicas.sort((a, b) => {
    const idxA = CLASSES_ORDEM_MED.indexOf(a);
    const idxB = CLASSES_ORDEM_MED.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'pt-AO');
  });
}

/**
 * Determina a classe imediatamente superior na hierarquia escolar angolana.
 */
export function obterProximaClasseMED(
  classeAtual: string,
  curso?: string,
  classesDisponiveisAnoDestino: string[] = []
): string {
  const norm = normalizarClasse(classeAtual);
  const idx = CLASSES_ORDEM_MED.indexOf(norm);
  if (idx === -1) return norm || '1ª';
  if (idx >= CLASSES_ORDEM_MED.length - 1) return norm; // 13ª é terminal

  const proxima = CLASSES_ORDEM_MED[idx + 1];

  // Na 12ª classe, só avança para a 13ª se for curso técnico/magistério ou se a 13ª existir na escola
  if (norm === '12ª') {
    const tem13NaEscola = classesDisponiveisAnoDestino.some(c => normalizarClasse(c) === '13ª');
    const cLower = (curso || '').toLowerCase();
    const ehTecnico =
      cLower.includes('técnico') ||
      cLower.includes('tecnico') ||
      cLower.includes('magistério') ||
      cLower.includes('magisterio') ||
      cLower.includes('enfermagem') ||
      cLower.includes('informática') ||
      cLower.includes('gestão') ||
      cLower.includes('contabilidade');
    if (!tem13NaEscola && !ehTecnico) {
      return '12ª';
    }
  }

  return proxima;
}

/**
 * Avalia automaticamente o desempenho e situação do aluno no ano letivo anterior
 * para determinar a classe correta na confirmação de matrícula:
 * - Aprovou -> avança para a classe superior
 * - Reprovou ou Desistiu -> continua na classe anterior
 */
export function avaliarProgressaoAluno(params: {
  aluno: Aluno;
  turmas: Turma[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  juris?: ComissaoJuri[];
  historicoCompleto?: HistoricoEscolarCompleto | null;
  anoDestino?: string;
  classesDisponiveisAnoDestino?: string[];
}): AvaliacaoProgressaoAluno {
  const {
    aluno,
    turmas,
    notasConsolidadas,
    juris = [],
    historicoCompleto,
    anoDestino = '',
    classesDisponiveisAnoDestino = []
  } = params;

  const turmaAtual = turmas.find(t => t.id === aluno.turmaId);
  const classeAnterior = normalizarClasse(aluno.classeId || turmaAtual?.classe || '1ª');
  const anoAnterior = aluno.anoLectivo || aluno.anoMatricula || turmaAtual?.anoLectivo || '';
  const escala = obterInformacaoEscala(classeAnterior);
  const proximaClasse = obterProximaClasseMED(
    classeAnterior,
    aluno.curso || turmaAtual?.curso,
    classesDisponiveisAnoDestino
  );

  // 1. Verificar desistência explícita no estado do aluno
  if (aluno.estado === 'Desistente') {
    return {
      situacao: 'Desistente',
      classeAnterior,
      anoAnterior,
      classeSugerida: classeAnterior,
      deveAvancar: false,
      mediaCalculada: null,
      escalaMaxima: escala.escalaMaxima,
      notaMinimaAprovacao: escala.notaAprovacao,
      motivo: `Desistiu no ano letivo anterior${anoAnterior ? ` (${anoAnterior})` : ''} — mantém a ${classeAnterior} Classe.`
    };
  }

  // 2. Verificar notas consolidadas do aluno referentes ao ano/classe anterior
  const notasAluno = notasConsolidadas.filter(n => {
    if (n.alunoId !== aluno.id) return false;
    // Se já estamos a confirmar para outro ano, ignorar notas lançadas exclusivamente no ano destino
    if (anoDestino && anoAnterior && anoDestino !== anoAnterior && n.anoLectivo === anoDestino) {
      return false;
    }
    if (anoAnterior && n.anoLectivo && n.anoLectivo !== anoAnterior) {
      return false;
    }
    return true;
  });

  if (notasAluno.length > 0) {
    // Agrupar por disciplina para calcular média anual real por disciplina (se houver vários trimestres)
    const porDisciplina = new Map<string, number[]>();
    notasAluno.forEach(n => {
      const val = n.notaFinal ?? n.mediaTrimestral ?? n.mac;
      if (typeof val === 'number' && !isNaN(val)) {
        const chaveDisc = n.disciplinaId || (n as any).disciplinaNome || 'geral';
        const lista = porDisciplina.get(chaveDisc) || [];
        lista.push(val);
        porDisciplina.set(chaveDisc, lista);
      }
    });

    const mediasDisciplinas: number[] = [];
    porDisciplina.forEach(vals => {
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      mediasDisciplinas.push(m);
    });

    if (mediasDisciplinas.length > 0) {
      const mediaGeral = Number(
        (mediasDisciplinas.reduce((a, b) => a + b, 0) / mediasDisciplinas.length).toFixed(1)
      );
      const aprovou = mediaGeral >= escala.notaAprovacao;

      // Verificar se o histórico anterior explícito marca reprovação para este mesmo ano/classe
      const histAntMatch = aluno.historicoAnterior?.find(
        h =>
          normalizarClasse(h.classe) === classeAnterior &&
          (!anoAnterior || !h.anoLectivo || h.anoLectivo === anoAnterior)
      );

      if (histAntMatch && histAntMatch.aprovado === false) {
        return {
          situacao: 'Reprovado',
          classeAnterior,
          anoAnterior,
          classeSugerida: classeAnterior,
          deveAvancar: false,
          mediaCalculada: histAntMatch.mediaFinal ?? mediaGeral,
          escalaMaxima: escala.escalaMaxima,
          notaMinimaAprovacao: escala.notaAprovacao,
          motivo: `Reprovado na ${classeAnterior} Classe (Média ${(histAntMatch.mediaFinal ?? mediaGeral).toFixed(1)}/${escala.escalaMaxima}) — continua na ${classeAnterior} Classe.`
        };
      }

      if (aprovou) {
        return {
          situacao: 'Aprovado',
          classeAnterior,
          anoAnterior,
          classeSugerida: proximaClasse,
          deveAvancar: proximaClasse !== classeAnterior,
          mediaCalculada: mediaGeral,
          escalaMaxima: escala.escalaMaxima,
          notaMinimaAprovacao: escala.notaAprovacao,
          motivo:
            proximaClasse !== classeAnterior
              ? `Aprovado no ano passado (Média ${mediaGeral.toFixed(1)}/${escala.escalaMaxima}) — será reconfirmado na ${proximaClasse} Classe.`
              : `Aprovado na ${classeAnterior} Classe (Média ${mediaGeral.toFixed(1)}/${escala.escalaMaxima}).`
        };
      }

      return {
        situacao: 'Reprovado',
        classeAnterior,
        anoAnterior,
        classeSugerida: classeAnterior,
        deveAvancar: false,
        mediaCalculada: mediaGeral,
        escalaMaxima: escala.escalaMaxima,
        notaMinimaAprovacao: escala.notaAprovacao,
        motivo: `Reprovado no ano passado (Média ${mediaGeral.toFixed(1)}/${escala.escalaMaxima}, mínimo ${escala.notaAprovacao}) — continua na ${classeAnterior} Classe.`
      };
    }
  }

  // 3. Verificar histórico escolar completo para a classe anterior
  const histClasse = historicoCompleto?.classes?.find(
    c =>
      normalizarClasse(c.classe) === classeAnterior &&
      (!anoAnterior || !c.anoLectivo || c.anoLectivo === anoAnterior)
  );
  if (histClasse && (histClasse.notasDisciplinas?.length > 0 || typeof histClasse.mediaGeralClasse === 'number')) {
    const notasValidas = (histClasse.notasDisciplinas || [])
      .map(d => Number(d.notaFinal))
      .filter(v => !isNaN(v) && v > 0);
    const mediaHist =
      typeof histClasse.mediaGeralClasse === 'number' && histClasse.mediaGeralClasse > 0
        ? histClasse.mediaGeralClasse
        : notasValidas.length > 0
        ? Number((notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1))
        : null;

    if (mediaHist !== null) {
      const aprovou = mediaHist >= escala.notaAprovacao;
      return {
        situacao: aprovou ? 'Aprovado' : 'Reprovado',
        classeAnterior,
        anoAnterior,
        classeSugerida: aprovou ? proximaClasse : classeAnterior,
        deveAvancar: aprovou && proximaClasse !== classeAnterior,
        mediaCalculada: mediaHist,
        escalaMaxima: escala.escalaMaxima,
        notaMinimaAprovacao: escala.notaAprovacao,
        motivo: aprovou
          ? `Aprovado segundo o histórico da ${classeAnterior} Classe (Média ${mediaHist.toFixed(1)}/${escala.escalaMaxima}) — transita para a ${proximaClasse} Classe.`
          : `Reprovado segundo o histórico da ${classeAnterior} Classe (Média ${mediaHist.toFixed(1)}/${escala.escalaMaxima}) — continua na ${classeAnterior} Classe.`
      };
    }
  }

  // 4. Verificar historicoAnterior registado diretamente no objeto Aluno
  const histAnt = aluno.historicoAnterior?.find(
    h =>
      normalizarClasse(h.classe) === classeAnterior &&
      (!anoAnterior || !h.anoLectivo || h.anoLectivo === anoAnterior)
  );
  if (histAnt) {
    if (histAnt.aprovado) {
      return {
        situacao: 'Aprovado',
        classeAnterior,
        anoAnterior,
        classeSugerida: proximaClasse,
        deveAvancar: proximaClasse !== classeAnterior,
        mediaCalculada: typeof histAnt.mediaFinal === 'number' ? histAnt.mediaFinal : null,
        escalaMaxima: escala.escalaMaxima,
        notaMinimaAprovacao: escala.notaAprovacao,
        motivo: `Aprovado no ano letivo anterior (${classeAnterior} Classe) — será reconfirmado na ${proximaClasse} Classe.`
      };
    }
    return {
      situacao: 'Reprovado',
      classeAnterior,
      anoAnterior,
      classeSugerida: classeAnterior,
      deveAvancar: false,
      mediaCalculada: typeof histAnt.mediaFinal === 'number' ? histAnt.mediaFinal : null,
      escalaMaxima: escala.escalaMaxima,
      notaMinimaAprovacao: escala.notaAprovacao,
      motivo: `Reprovado no ano letivo anterior (${classeAnterior} Classe) — continua na ${classeAnterior} Classe.`
    };
  }

  // 5. Verificar deliberação de Comissão de Júri se existir para a turma/classe
  const juriMatch = juris.find(
    j =>
      normalizarClasse(j.classe) === classeAnterior &&
      (!anoAnterior || !j.anoLectivo || j.anoLectivo === anoAnterior) &&
      (j.pautaHomologada || j.estado === 'Validada')
  );
  if (juriMatch && (juriMatch as any).alunosReprovadosIds?.includes(aluno.id)) {
    return {
      situacao: 'Reprovado',
      classeAnterior,
      anoAnterior,
      classeSugerida: classeAnterior,
      deveAvancar: false,
      mediaCalculada: null,
      escalaMaxima: escala.escalaMaxima,
      notaMinimaAprovacao: escala.notaAprovacao,
      motivo: `Não aprovado em pauta homologada pelo Júri (${classeAnterior} Classe) — continua na ${classeAnterior} Classe.`
    };
  }

  // 6. Sem notas lançadas nem registo de reprovação/desistência
  return {
    situacao: 'SemRegisto',
    classeAnterior,
    anoAnterior,
    classeSugerida: proximaClasse,
    deveAvancar: proximaClasse !== classeAnterior,
    mediaCalculada: null,
    escalaMaxima: escala.escalaMaxima,
    notaMinimaAprovacao: escala.notaAprovacao,
    motivo:
      proximaClasse !== classeAnterior
        ? `Sem pauta final lançada no ano anterior — sugerida progressão para a ${proximaClasse} Classe (verifique ou ajuste manualmente se repetente).`
        : `Aluno encontra-se na ${classeAnterior} Classe.`
  };
}
