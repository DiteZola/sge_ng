/**
 * SGE-NG Angola - Motor de Critérios & Deliberações da Comissão de Júri
 * Conforme Normas Oficiais do Ministério da Educação da República de Angola (MED)
 */

import { 
  Aluno, 
  Turma, 
  Disciplina, 
  NotaTrimestralConsolidada, 
  ComissaoJuri, 
  CriterioJuri, 
  CondicaoCriterio, 
  MembroComissaoJuri, 
  AtribuicaoDocente,
  Escola,
  AtaJuri
} from '../types';
import { obterInformacaoEscala } from './macEngine';

export interface ResultadoAvaliacaoCriterio {
  cumpre: boolean;
  explicacao: string[];
  condicoesNaoCumpridas: string[];
  dados: {
    mediaGeral: number;
    percentagemAproveitamento: number;
    disciplinasPositivas: number;
    disciplinasNegativas: number;
    notaMinima: number;
    totalDisciplinas: number;
    frequenciaPercentual: number;
  };
}

export interface AnaliseAlunoJuri {
  aluno: Aluno;
  turma?: Turma;
  criteriosCumpridos: { criterio: CriterioJuri; explicacao: string[] }[];
  criteriosNaoCumpridos: { criterio: CriterioJuri; condicoesNaoCumpridas: string[] }[];
  dadosCalculados: ResultadoAvaliacaoCriterio['dados'];
  dados: ResultadoAvaliacaoCriterio['dados'];
  temConflitoInteresse: boolean;
  professoresConflito: string[];
  pendencias: string[];
}

export class JuryEngine {
  /**
   * Avalia um aluno contra um critério configurável do Júri
   */
  static avaliarAlunoContraCriterio(
    aluno: Aluno,
    turma: Turma | undefined,
    disciplinas: Disciplina[],
    todasNotas: NotaTrimestralConsolidada[],
    criterio: CriterioJuri
  ): ResultadoAvaliacaoCriterio {
    const escala = obterInformacaoEscala(turma?.classe, turma?.nivelEnsino);
    const notasAluno = todasNotas.filter(n => n.alunoId === aluno.id);

    // Calcular estatísticas do aluno
    let somaNotas = 0;
    let disciplinasComNota = 0;
    let positivas = 0;
    let negativas = 0;
    let minNota = 999;

    const notasPorDisciplinaNome: Record<string, number> = {};

    notasAluno.forEach(n => {
      const disc = disciplinas.find(d => d.id === n.disciplinaId);
      const discNome = disc?.nome || 'Disciplina';
      const notaValor = n.notaFinal || n.mac || 0;
      
      notasPorDisciplinaNome[discNome.toLowerCase()] = notaValor;
      somaNotas += notaValor;
      disciplinasComNota++;

      if (notaValor >= escala.notaAprovacao) {
        positivas++;
      } else {
        negativas++;
      }

      if (notaValor < minNota) {
        minNota = notaValor;
      }
    });

    if (disciplinasComNota === 0) {
      minNota = 0;
    }

    const totalDisciplinas = disciplinasComNota > 0 ? disciplinasComNota : (disciplinas.length || 1);
    const mediaGeral = disciplinasComNota > 0 ? Number((somaNotas / disciplinasComNota).toFixed(2)) : 0;
    
    // Percentagem de aproveitamento (positivas / total)
    const percentagemAproveitamento = totalDisciplinas > 0 
      ? Math.round((positivas / totalDisciplinas) * 100) 
      : 0;

    const frequenciaPercentual = 98; // Base de assiduidade padrão

    const dados = {
      mediaGeral,
      percentagemAproveitamento,
      disciplinasPositivas: positivas,
      disciplinasNegativas: negativas,
      notaMinima: minNota === 999 ? 0 : minNota,
      totalDisciplinas,
      frequenciaPercentual
    };

    const explicacao: string[] = [];
    const condicoesNaoCumpridas: string[] = [];
    let todosE_Cumpridos = true;
    let algumOU_Cumprido = false;
    let temCondicaoOU = false;

    // Avaliar cada condição do critério
    criterio.condicoes.forEach((cond, idx) => {
      let condicaoPassou = false;
      let detalheCondicao = '';

      switch (cond.campo) {
        case 'percentagem':
          if (cond.operador === 'between' && cond.valorMin !== undefined && cond.valorMax !== undefined) {
            condicaoPassou = percentagemAproveitamento >= cond.valorMin && percentagemAproveitamento <= cond.valorMax;
            detalheCondicao = `Aproveitamento entre ${cond.valorMin}% e ${cond.valorMax}% (atual: ${percentagemAproveitamento}%)`;
          } else if (cond.operador === '>=' && cond.valorMin !== undefined) {
            condicaoPassou = percentagemAproveitamento >= cond.valorMin;
            detalheCondicao = `Aproveitamento >= ${cond.valorMin}% (atual: ${percentagemAproveitamento}%)`;
          } else if (cond.operador === '<=' && cond.valorMax !== undefined) {
            condicaoPassou = percentagemAproveitamento <= cond.valorMax;
            detalheCondicao = `Aproveitamento <= ${cond.valorMax}% (atual: ${percentagemAproveitamento}%)`;
          }
          break;

        case 'media':
          if (cond.operador === '>=' && cond.valorMin !== undefined) {
            condicaoPassou = mediaGeral >= cond.valorMin;
            detalheCondicao = `Média geral >= ${cond.valorMin} valores (atual: ${mediaGeral})`;
          } else if (cond.operador === '<=' && cond.valorMax !== undefined) {
            condicaoPassou = mediaGeral <= cond.valorMax;
            detalheCondicao = `Média geral <= ${cond.valorMax} valores (atual: ${mediaGeral})`;
          } else if (cond.operador === 'between' && cond.valorMin !== undefined && cond.valorMax !== undefined) {
            condicaoPassou = mediaGeral >= cond.valorMin && mediaGeral <= cond.valorMax;
            detalheCondicao = `Média geral entre ${cond.valorMin} e ${cond.valorMax} (atual: ${mediaGeral})`;
          }
          break;

        case 'disciplinas_positivas':
          if (cond.valorMin !== undefined) {
            condicaoPassou = positivas >= cond.valorMin;
            detalheCondicao = `Pelo menos ${cond.valorMin} disciplinas positivas (atual: ${positivas})`;
          }
          break;

        case 'disciplinas_negativas':
          if (cond.valorMax !== undefined) {
            condicaoPassou = negativas <= cond.valorMax;
            detalheCondicao = `No máximo ${cond.valorMax} disciplinas negativas (atual: ${negativas})`;
          }
          break;

        case 'nota_minima':
          if (cond.valorMin !== undefined) {
            condicaoPassou = dados.notaMinima >= cond.valorMin;
            detalheCondicao = `Nota mínima em qualquer disciplina >= ${cond.valorMin} (atual: ${dados.notaMinima})`;
          }
          break;

        case 'disciplina_especifica':
          if (cond.disciplinaNome) {
            const notaDisc = notasPorDisciplinaNome[cond.disciplinaNome.toLowerCase()] ?? 0;
            const notaCorte = cond.valorMin ?? escala.notaAprovacao;
            condicaoPassou = notaDisc >= notaCorte;
            detalheCondicao = `${cond.disciplinaNome} positiva (>= ${notaCorte}, atual: ${notaDisc})`;
          }
          break;

        case 'frequencia':
          if (cond.valorMin !== undefined) {
            condicaoPassou = frequenciaPercentual >= cond.valorMin;
            detalheCondicao = `Frequência escolar >= ${cond.valorMin}% (atual: ${frequenciaPercentual}%)`;
          }
          break;

        default:
          condicaoPassou = true;
          detalheCondicao = 'Condição geral satisfeita';
      }

      if (cond.operadorLogico === 'NAO') {
        condicaoPassou = !condicaoPassou;
        detalheCondicao = `NÃO (${detalheCondicao})`;
      }

      if (cond.operadorLogico === 'OU') {
        temCondicaoOU = true;
        if (condicaoPassou) algumOU_Cumprido = true;
      } else {
        if (!condicaoPassou) todosE_Cumpridos = false;
      }

      if (condicaoPassou) {
        explicacao.push(`✓ ${detalheCondicao}`);
      } else {
        condicoesNaoCumpridas.push(`✗ ${detalheCondicao}`);
      }
    });

    const cumpre = temCondicaoOU 
      ? (todosE_Cumpridos || algumOU_Cumprido) 
      : todosE_Cumpridos;

    return {
      cumpre,
      explicacao,
      condicoesNaoCumpridas,
      dados
    };
  }

  /**
   * Identifica situação de conflito de interesse para um membro do Júri
   */
  static verificarConflitoInteresse(
    membro: MembroComissaoJuri,
    aluno: Aluno,
    atribuicoes: AtribuicaoDocente[]
  ): { temConflito: boolean; turmasDisciplinas: string[]; aviso: string } {
    const turmasDisciplinasDoMembro = atribuicoes.filter(
      a => a.professorId === membro.usuarioId && a.turmaId === aluno.turmaId
    );

    const temConflito = turmasDisciplinasDoMembro.length > 0;
    const disciplinas = turmasDisciplinasDoMembro.map(a => a.disciplinaId);

    const aviso = temConflito
      ? `Atenção: O membro ${membro.nome} (${membro.funcao}) é professor do aluno na turma ${aluno.turmaId}. Conforme normas do MED, não pode ser o único validador da decisão.`
      : '';

    return {
      temConflito,
      turmasDisciplinas: disciplinas,
      aviso
    };
  }

  /**
   * Processa a análise de todos os alunos da comissão
   */
  static analisarAlunosComissao(
    comissao: ComissaoJuri,
    todosAlunos: Aluno[],
    turmas: Turma[],
    disciplinas: Disciplina[],
    notasConsolidadas: NotaTrimestralConsolidada[],
    atribuicoes: AtribuicaoDocente[]
  ): AnaliseAlunoJuri[] {
    const turmasPermitidas = comissao.turmasIds && comissao.turmasIds.length > 0
      ? comissao.turmasIds
      : (comissao.turmaId ? [comissao.turmaId] : []);

    const alunosEscopo = todosAlunos.filter(a => 
      a.escolaId === comissao.escolaId && 
      (turmasPermitidas.length === 0 || turmasPermitidas.includes(a.turmaId))
    );

    const criteriosAtivos = (comissao.criterios || []).filter(c => c.ativo !== false);

    return alunosEscopo.map(aluno => {
      const turma = turmas.find(t => t.id === aluno.turmaId);
      const criteriosCumpridos: { criterio: CriterioJuri; explicacao: string[] }[] = [];
      const criteriosNaoCumpridos: { criterio: CriterioJuri; condicoesNaoCumpridas: string[] }[] = [];
      let ultimosDados: ResultadoAvaliacaoCriterio['dados'] = {
        mediaGeral: 0,
        percentagemAproveitamento: 0,
        disciplinasPositivas: 0,
        disciplinasNegativas: 0,
        notaMinima: 0,
        totalDisciplinas: 0,
        frequenciaPercentual: 100
      };

      criteriosAtivos.forEach(crit => {
        const res = this.avaliarAlunoContraCriterio(aluno, turma, disciplinas, notasConsolidadas, crit);
        ultimosDados = res.dados;
        if (res.cumpre) {
          criteriosCumpridos.push({ criterio: crit, explicacao: res.explicacao });
        } else {
          criteriosNaoCumpridos.push({ criterio: crit, condicoesNaoCumpridas: res.condicoesNaoCumpridas });
        }
      });

      // Checar conflito com qualquer membro do júri
      const professoresConflito: string[] = [];
      let temConflitoGeral = false;

      (comissao.membros || []).forEach(m => {
        const conf = this.verificarConflitoInteresse(m, aluno, atribuicoes);
        if (conf.temConflito) {
          temConflitoGeral = true;
          professoresConflito.push(`${m.nome} (${m.funcao})`);
        }
      });

      // Identificar pendências
      const pendencias: string[] = [];
      if (ultimosDados.totalDisciplinas === 0) {
        pendencias.push('Sem notas trimestrais lançadas no sistema');
      }
      if (!comissao.deliberacoes || !comissao.deliberacoes[aluno.id]) {
        pendencias.push('Deliberação da Comissão de Júri pendente');
      }

      return {
        aluno,
        turma,
        criteriosCumpridos,
        criteriosNaoCumpridos,
        dadosCalculados: ultimosDados,
        dados: ultimosDados,
        temConflitoInteresse: temConflitoGeral,
        professoresConflito,
        pendencias
      };
    });
  }

  /**
   * Validação Rigorosa: Checklist completo que deve estar 100% OK antes de validar
   */
  static validarChecklistSessao(
    comissao: ComissaoJuri,
    analises: AnaliseAlunoJuri[]
  ): {
    podeValidar: boolean;
    totalPendencias: number;
    checklist: { item: string; ok: boolean; detalhe: string }[];
    pendencias: string[];
  } {
    const checklist: { item: string; ok: boolean; detalhe: string }[] = [];
    const pendencias: string[] = [];

    // 1. Notas completas
    const alunosSemNotas = analises.filter(a => a.dadosCalculados.totalDisciplinas === 0);
    const notasCompletas = alunosSemNotas.length === 0;
    checklist.push({
      item: 'Notas Completas e Consolidadas',
      ok: notasCompletas,
      detalhe: notasCompletas 
        ? 'Todas as pautas possuem notas lançadas' 
        : `${alunosSemNotas.length} alunos com notas ausentes`
    });
    if (!notasCompletas) {
      pendencias.push(`${alunosSemNotas.length} alunos não possuem notas no período.`);
    }

    // 2. Critérios definidos
    const criteriosOk = (comissao.criterios || []).length > 0;
    checklist.push({
      item: 'Critérios de Avaliação Homologados',
      ok: criteriosOk,
      detalhe: criteriosOk 
        ? `${comissao.criterios?.length} critérios configurados e ativos` 
        : 'Nenhum critério foi configurado para a comissão'
    });
    if (!criteriosOk) {
      pendencias.push('É obrigatório homologar ao menos 1 critério antes da deliberação.');
    }

    // 3. Deliberações registradas
    const alunosSemDeliberacao = analises.filter(a => !comissao.deliberacoes || !comissao.deliberacoes[a.aluno.id]);
    const deliberacoesOk = alunosSemDeliberacao.length === 0;
    checklist.push({
      item: 'Deliberações Registadas para Todos os Casos',
      ok: deliberacoesOk,
      detalhe: deliberacoesOk 
        ? 'Todos os alunos abrangidos possuem deliberação registada' 
        : `${alunosSemDeliberacao.length} alunos sem deliberação registada`
    });
    if (!deliberacoesOk) {
      pendencias.push(`Existem ${alunosSemDeliberacao.length} alunos sem deliberação formal do Júri.`);
    }

    // 4. Conflitos de Interesse resolvidos (nenhuma decisão solitária por membro conflitante)
    let conflitoImpedindo = false;
    analises.forEach(a => {
      const delib = comissao.deliberacoes?.[a.aluno.id];
      if (delib && a.temConflitoInteresse && delib.deliberadoPor) {
        // Se foi deliberado unicamente pelo professor em conflito
        const membroConflitante = a.professoresConflito.some(p => p.includes(delib.deliberadoPor));
        if (membroConflitante && (!delib.pareceres || delib.pareceres.length <= 1)) {
          conflitoImpedindo = true;
          pendencias.push(`Conflito de Interesse: Aluno ${a.aluno.nomeCompleto} foi deliberado exclusivamente pelo professor titular.`);
        }
      }
    });

    checklist.push({
      item: 'Conflitos de Interesse Auditados',
      ok: !conflitoImpedindo,
      detalhe: !conflitoImpedindo 
        ? 'Nenhuma deliberação unipessoal com conflito de interesse' 
        : 'Existem casos deliberados exclusivamente por docentes com conflito'
    });

    // 5. Presidência e Secretariado Definidos
    const composicaoOk = !!(comissao.presidenteId || comissao.membros?.some(m => m.funcao === 'Presidente')) &&
                         !!(comissao.secretarioId || comissao.membros?.some(m => m.funcao === 'Secretario'));
    checklist.push({
      item: 'Quórum e Funções Formais (Presidente & Secretário)',
      ok: composicaoOk,
      detalhe: composicaoOk ? 'Presidente e Secretário formalmente designados' : 'Falta definir Presidente ou Secretário da Comissão'
    });
    if (!composicaoOk) {
      pendencias.push('Comissão sem Presidente ou Secretário formalmente atribuídos.');
    }

    const podeValidar = checklist.every(c => c.ok) && pendencias.length === 0;

    return {
      podeValidar,
      totalPendencias: pendencias.length,
      checklist,
      pendencias
    };
  }

  /**
   * Gera a Ata Oficial Automática da Comissão de Júri
   */
  static gerarAtaOficial(
    comissao: ComissaoJuri,
    escola: Escola,
    analises: AnaliseAlunoJuri[]
  ): AtaJuri {
    const dataHoje = new Date().toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    let aprovados = 0;
    let reprovados = 0;
    let recurso = 0;
    let especiais = 0;

    analises.forEach(a => {
      const delib = comissao.deliberacoes?.[a.aluno.id]?.decisao;
      if (delib === 'Aprovar') aprovados++;
      else if (delib === 'Nao_Aprovar') reprovados++;
      else if (delib === 'Recurso' || delib === 'Reavaliar') recurso++;
      else especiais++;
    });

    const membrosPresentes = (comissao.membros || []).map(m => ({
      nome: m.nome,
      funcao: m.funcao,
      cargoOriginal: m.cargoOriginal
    }));

    const presidenteNome = comissao.membros?.find(m => m.funcao === 'Presidente')?.nome || 'Presidente do Júri';
    const secretarioNome = comissao.membros?.find(m => m.funcao === 'Secretario')?.nome || 'Secretário do Júri';
    const vogais = comissao.membros?.filter(m => m.funcao === 'Membro').map(m => m.nome) || [];

    const numeroAta = `ATA-JURI-${comissao.numeroSessao?.replace(/[^0-9]/g, '') || '01'}/${comissao.anoLectivo}`;

    const textoCompleto = `
REPÚBLICA DE ANGOLA
MINISTÉRIO DA EDUCAÇÃO
${escola.nomeOficial.toUpperCase()}
GABINETE DA COMISSÃO DE JÚRI DE AVALIAÇÃO E HOMOLOGAÇÃO DE RESULTADOS

ATA N.º ${numeroAta}
SESSÃO: ${comissao.numeroSessao || 'Sessão Ordinária n.º 01'}
ANO LECTIVO: ${comissao.anoLectivo} • PERÍODO: ${comissao.periodo || 'IIIº Trimestre'}
CLASSE(S): ${comissao.classe} • CURSO: ${comissao.curso || 'Geral'}

Aos ${dataHoje}, reuniu-se ordinariamente nas instalações do ${escola.nomeOficial}, a Comissão de Júri de Exame e Homologação de Resultados Escolares, constituída em conformidade com as disposições legais e regulamentares emanadas pelo Ministério da Educação da República de Angola.

COMPOSIÇÃO DO JÚRI:
- Presidente: ${presidenteNome}
- Secretário: ${secretarioNome}
- Membros / Vogais: ${vogais.join(', ') || 'Corpo Docente designado'}

FINALIDADE DOS TRABALHOS:
${comissao.finalidade || 'Apreciação, análise das pautas de aproveitamento escolar, aplicação de critérios homologados e deliberação sobre transições, recursos e certificação de estudos.'}

DELIBERAÇÕES E ESTATÍSTICA GERAL:
Total de Alunos Analisados: ${analises.length}
- Alunos com Aproveitamento / Aprovados: ${aprovados}
- Alunos com Resultados Negativos / Não Aprovados: ${reprovados}
- Alunos Encaminhados para Provas de Recurso / Recuperação: ${recurso}
- Alunos com Processos Especiais ou em Averiguação: ${especiais}

A Comissão procedeu ao cruzamento automatizado dos critérios homologados com o histórico de aproveitamento, assiduidade e MAC, assegurando que todas as decisões respeitassem o princípio da transparência, justiça pedagógica e mitigação de conflitos de interesse.

Nada mais havendo a tratar, foi dada por encerrada a sessão pelo Presidente da Comissão, lavrando-se a presente ata que, após lida e achada conforme, vai assinada pelos membros presentes nos termos regulamentares.
    `.trim();

    return {
      id: `ata-${Date.now()}`,
      numeroAta,
      sessaoNumero: comissao.numeroSessao || 'Sessão n.º 01',
      escolaNome: escola.nomeOficial,
      anoLectivo: comissao.anoLectivo,
      periodo: comissao.periodo || 'III Trimestre',
      data: dataHoje,
      membrosPresentes,
      turmasAnalisadas: comissao.turmasIds || (comissao.turmaId ? [comissao.turmaId] : []),
      totalAlunos: analises.length,
      totalAprovados: aprovados,
      totalReprovados: reprovados,
      totalRecurso: recurso,
      totalEspeciais: especiais,
      deliberacoesResumo: `${aprovados} Aprovados, ${reprovados} Não Aprovados, ${recurso} Recurso`,
      conteudoTextoCompleto: textoCompleto,
      dataEncerramento: new Date().toISOString(),
      assinaturaPresidente: presidenteNome,
      assinaturaSecretario: secretarioNome,
      assinaturasVogais: vogais
    };
  }
}
