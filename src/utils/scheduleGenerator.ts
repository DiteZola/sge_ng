import {
  AtribuicaoDocente,
  DiaSemana,
  Disciplina,
  Funcionario,
  HorarioAulaItem,
  Turma,
  TurnoConfig
} from '../types';

export const DIAS_SEMANA_LETIVOS: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira'
];

export interface TempoHorarioDefinicao {
  numero: number;
  inicio: string;
  fim: string;
  rotulo?: string;
}

export interface DiaPedagogicoProfessorInfo {
  professorId: string;
  professorNome: string;
  diaPedagogico: DiaSemana | null;
  cargaTotalSemanal: number;
  concedido: boolean;
  motivo?: string;
}

export interface AulaNaoAlocadaInfo {
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  motivo: string;
}

export interface GeracaoHorarioParams {
  escolaId: string;
  anoLectivo: string;
  turmasAlvo: Turma[];
  todasTurmas: Turma[];
  disciplinas: Disciplina[];
  atribuicoes: AtribuicaoDocente[];
  funcionarios: Funcionario[];
  turnosConfigs?: TurnoConfig[];
  temposDefinicao: TempoHorarioDefinicao[];
  horariosExistentes: HorarioAulaItem[];
  disciplinasPrioritariasIds: string[];
  evitarSextoTempoParaPrioritarias: boolean;
  priorizarPrimeirosTempos: boolean;
  concederDiaPedagogico: boolean;
  isolarConflitoPorTurno: boolean;
  usarTitularPrimarioSemAtribuicao?: boolean;
  modo: 'preencher_vazios' | 'regenerar_tudo';
  cargaSemanalPadrao?: number;
  cargasPorDisciplinaId?: Record<string, number>;
}

export interface ResultadoGeracaoHorarios {
  gerados: HorarioAulaItem[];
  idsSubstituidos: string[];
  horariosFinaisCompletos: HorarioAulaItem[];
  diasPedagogicos: DiaPedagogicoProfessorInfo[];
  aulasNaoAlocadas: AulaNaoAlocadaInfo[];
  totalDemandas: number;
  totalAlocadas: number;
  totalConflitos: number;
  prioritariasForaSextoTempo: number;
  prioritariasNosPrimeirosTempos: number;
  totalPrioritariasAlocadas: number;
}

function normalizarTurnoChave(turno?: string): string {
  const s = String(turno || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (!s) return '';
  if (s.includes('manh')) return 'manha';
  if (s.includes('tard')) return 'tarde';
  if (s.includes('noit') || s.includes('pos')) return 'noite';
  return s;
}

function horaParaMinutos(hora?: string): number | null {
  if (!hora) return null;
  const m = String(hora).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Verifica se dois turnos colidem no mesmo tempo letivo.
 * Quando as turmas pertencem a turnos claramente distintos cujas janelas horárias não se sobrepõem
 * (ex: Manhã 07:30-12:30 vs Tarde 13:00-18:00), o 1º tempo da Manhã e o 1º tempo da Tarde NÃO conflitam.
 */
export function turnosHorariosConflitam(
  turnoA?: string,
  turnoB?: string,
  turnosConfigs?: TurnoConfig[],
  isolarPorTurno: boolean = true
): boolean {
  if (!isolarPorTurno) return true;
  const keyA = normalizarTurnoChave(turnoA);
  const keyB = normalizarTurnoChave(turnoB);
  if (!keyA || !keyB) return true;
  if (keyA === keyB) return true;

  // Procurar janelas horárias nas configurações de turno se existirem
  if (turnosConfigs && turnosConfigs.length > 0) {
    const cfgA = turnosConfigs.find(t => normalizarTurnoChave(t.nome) === keyA);
    const cfgB = turnosConfigs.find(t => normalizarTurnoChave(t.nome) === keyB);
    if (cfgA && cfgB) {
      const iniA = horaParaMinutos(cfgA.horaInicio);
      const fimA = horaParaMinutos(cfgA.horaFim);
      const iniB = horaParaMinutos(cfgB.horaInicio);
      const fimB = horaParaMinutos(cfgB.horaFim);
      if (iniA !== null && fimA !== null && iniB !== null && fimB !== null) {
        return iniA < fimB && iniB < fimA;
      }
    }
  }

  // Turnos padrão distintos (manha vs tarde vs noite) não se sobrepõem
  const padroesDistintos = new Set(['manha', 'tarde', 'noite']);
  if (padroesDistintos.has(keyA) && padroesDistintos.has(keyB)) {
    return false;
  }
  return false;
}

function obterCicloPrioridadeDisciplina(disciplinaNome: string, carga?: number): number {
  if (typeof carga === 'number' && carga > 0) return Math.min(10, Math.max(1, Math.round(carga)));
  const n = disciplinaNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (n.includes('lingua portuguesa') || n === 'portugues' || n.includes('matematica')) return 4;
  if (
    n.includes('fisica') ||
    n.includes('quimica') ||
    n.includes('biologia') ||
    n.includes('ingles') ||
    n.includes('frances') ||
    n.includes('contabilidade') ||
    n.includes('programacao')
  ) {
    return 3;
  }
  return 2;
}

function normalizarClasseComparacao(c?: string): string {
  return String(c || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/classe/gi, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function disciplinaPertenceTurma(disc: Disciplina, turma: Turma): boolean {
  const cTurma = normalizarClasseComparacao(turma.classe);
  const temClasses = Array.isArray(disc.classes) && disc.classes.length > 0;
  if (temClasses && cTurma) {
    const matchClasse = disc.classes!.some(c => normalizarClasseComparacao(c) === cTurma);
    if (!matchClasse) return false;
  }
  if (turma.curso && disc.curso && turma.curso.trim() && disc.curso.trim()) {
    const ct = turma.curso.trim().toLowerCase();
    const cd = disc.curso.trim().toLowerCase();
    if (ct !== cd && !ct.includes(cd) && !cd.includes(ct)) return false;
  }
  return true;
}

interface DemandaAula {
  turma: Turma;
  disciplinaId: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  sala: string;
  turno: string;
  ehPrioritaria: boolean;
  seq: number;
  totalDiscNaTurma: number;
}

/**
 * Motor de Geração Automática de Horários Anti-Conflitos:
 * - Considera atribuições de disciplinas em todas as turmas selecionadas (Primário, Iº Ciclo, IIº Ciclo)
 * - Bloqueia disciplinas prioritárias do 6º tempo (ou último tempo >= 6) e prioriza os primeiros tempos (1º–3º)
 * - Atribui Dia Pedagógico por professor sempre que a carga horária e turmas permitirem
 * - Garante 0 conflitos de professor, sala e turma (respeitando turnos sem sobreposição)
 */
export function gerarHorariosAutomaticosSemConflitos(params: GeracaoHorarioParams): ResultadoGeracaoHorarios {
  const {
    escolaId,
    anoLectivo,
    turmasAlvo,
    todasTurmas,
    disciplinas,
    atribuicoes,
    funcionarios,
    turnosConfigs = [],
    temposDefinicao,
    horariosExistentes,
    disciplinasPrioritariasIds,
    evitarSextoTempoParaPrioritarias,
    priorizarPrimeirosTempos,
    concederDiaPedagogico,
    isolarConflitoPorTurno,
    usarTitularPrimarioSemAtribuicao = true,
    modo,
    cargaSemanalPadrao = 3,
    cargasPorDisciplinaId = {}
  } = params;

  const temposOrdenados = [...temposDefinicao].sort((a, b) => a.numero - b.numero);
  const maxNumeroTempo = temposOrdenados.reduce((m, t) => Math.max(m, t.numero), 0);
  const prioSet = new Set(disciplinasPrioritariasIds);
  const turmasAlvoMap = new Map(turmasAlvo.map(t => [t.id, t]));
  const todasTurmasMap = new Map(todasTurmas.map(t => [t.id, t]));
  const funcsMap = new Map(funcionarios.map(f => [f.id, f]));
  const discsMap = new Map(disciplinas.map(d => [d.id, d]));

  const turnoDaTurma = (turmaId: string): string => {
    return todasTurmasMap.get(turmaId)?.turno || '';
  };

  // 1. Determinar horários preservados (de outras turmas ou da própria turma no modo preencher_vazios)
  const idsSubstituidos: string[] = [];
  const horariosPreservados: HorarioAulaItem[] = [];

  for (const h of horariosExistentes) {
    if (h.escolaId !== escolaId) continue;
    if (anoLectivo && h.anoLectivo && h.anoLectivo !== anoLectivo) continue;
    if (modo === 'regenerar_tudo' && turmasAlvoMap.has(h.turmaId)) {
      idsSubstituidos.push(h.id);
    } else {
      horariosPreservados.push(h);
    }
  }

  // 2. Construir lista de demandas semanais por turma a partir das Atribuições Docentes
  const demandasBrutas: DemandaAula[] = [];
  let seqCounter = 0;

  for (const turma of turmasAlvo) {
    const atribsDaTurma = atribuicoes.filter(
      a => a.turmaId === turma.id && (!anoLectivo || !a.anoLectivo || a.anoLectivo === anoLectivo)
    );

    // Deduplicar por disciplinaId (pegar atribuição mais recente se houver duplicada)
    const mapaDiscProf = new Map<string, { disciplinaId: string; disciplinaNome: string; professorId: string; professorNome: string; carga?: number }>();

    for (const atr of atribsDaTurma) {
      const discObj = discsMap.get(atr.disciplinaId);
      const profObj = funcsMap.get(atr.professorId);
      if (!discObj || !profObj || profObj.ativo === false) continue;
      mapaDiscProf.set(atr.disciplinaId, {
        disciplinaId: discObj.id,
        disciplinaNome: discObj.nome,
        professorId: profObj.id,
        professorNome: profObj.nomeCompleto,
        carga: cargasPorDisciplinaId[discObj.id] ?? discObj.cargaHorariaSemanal
      });
    }

    // Fallback para Ensino Primário / Iniciação quando ainda não há atribuições por disciplina e existe coordenadorId
    if (
      mapaDiscProf.size === 0 &&
      usarTitularPrimarioSemAtribuicao &&
      turma.coordenadorId &&
      (turma.nivelEnsino === 'Primario' || turma.nivelEnsino === 'Iniciacao')
    ) {
      const profTit = funcsMap.get(turma.coordenadorId);
      if (profTit && profTit.ativo !== false) {
        const discsCompat = disciplinas.filter(d => d.escolaId === escolaId && disciplinaPertenceTurma(d, turma));
        for (const d of discsCompat) {
          mapaDiscProf.set(d.id, {
            disciplinaId: d.id,
            disciplinaNome: d.nome,
            professorId: profTit.id,
            professorNome: profTit.nomeCompleto,
            carga: cargasPorDisciplinaId[d.id] ?? d.cargaHorariaSemanal
          });
        }
      }
    }

    // Quantas aulas já existem para esta turma + disciplina se estiver em preencher_vazios
    const existentesTurma = horariosPreservados.filter(h => h.turmaId === turma.id);
    const totalCapacidadeTurma = DIAS_SEMANA_LETIVOS.length * temposOrdenados.length;
    const jaOcupadosTurma = existentesTurma.length;
    const livresTurma = Math.max(0, totalCapacidadeTurma - jaOcupadosTurma);

    const pares = Array.from(mapaDiscProf.values());
    if (pares.length === 0) continue;

    // Ajustar carga semanal proporcional caso a soma de cargas exceda os tempos semanais da turma
    const cargasAlvo = new Map<string, number>();
    let somaFaltantes = 0;
    for (const par of pares) {
      const jaTem = existentesTurma.filter(h => h.disciplinaId === par.disciplinaId).length;
      const desejada = par.carga && par.carga > 0
        ? Math.min(temposOrdenados.length * 2, Math.max(1, Math.round(par.carga)))
        : Math.min(cargaSemanalPadrao, obterCicloPrioridadeDisciplina(par.disciplinaNome, par.carga));
      const falta = Math.max(0, desejada - jaTem);
      cargasAlvo.set(par.disciplinaId, falta);
      somaFaltantes += falta;
    }

    // Se exceder capacidade da turma, escalonar proporcionalmente mantendo pelo menos 1 aula quando possível
    if (somaFaltantes > livresTurma && livresTurma > 0) {
      let excesso = somaFaltantes - livresTurma;
      const ordemReducao = [...pares].sort((a, b) => {
        const aPrio = prioSet.has(a.disciplinaId) ? 1 : 0;
        const bPrio = prioSet.has(b.disciplinaId) ? 1 : 0;
        if (aPrio !== bPrio) return aPrio - bPrio; // Reduz não-prioritárias primeiro
        return (cargasAlvo.get(b.disciplinaId) || 0) - (cargasAlvo.get(a.disciplinaId) || 0);
      });
      while (excesso > 0) {
        let reduziu = false;
        for (const p of ordemReducao) {
          if (excesso <= 0) break;
          const cur = cargasAlvo.get(p.disciplinaId) || 0;
          if (cur > 1) {
            cargasAlvo.set(p.disciplinaId, cur - 1);
            excesso--;
            reduziu = true;
          }
        }
        if (!reduziu) break;
      }
    }

    for (const par of pares) {
      const qtd = cargasAlvo.get(par.disciplinaId) || 0;
      const ehPrio = prioSet.has(par.disciplinaId);
      for (let i = 0; i < qtd; i++) {
        demandasBrutas.push({
          turma,
          disciplinaId: par.disciplinaId,
          disciplinaNome: par.disciplinaNome,
          professorId: par.professorId,
          professorNome: par.professorNome,
          sala: (turma.sala || 'Sala 01').trim(),
          turno: turma.turno || 'Manhã',
          ehPrioritaria: ehPrio,
          seq: seqCounter++,
          totalDiscNaTurma: qtd
        });
      }
    }
  }

  // 3. Calcular e distribuir Dia Pedagógico por Professor sempre que possível
  const demandasPorProf = new Map<string, DemandaAula[]>();
  for (const d of demandasBrutas) {
    const arr = demandasPorProf.get(d.professorId) || [];
    arr.push(d);
    demandasPorProf.set(d.professorId, arr);
  }

  const diaPedagogicoPorProf = new Map<string, DiaSemana | null>();
  const cargaTotalPorProf = new Map<string, number>();
  const motivoSemDiaPedagogico = new Map<string, string>();
  const contagemDiaPedagogicoPorDia = new Map<DiaSemana, number>(
    DIAS_SEMANA_LETIVOS.map(d => [d, 0])
  );

  // Ordenar professores do mais carregado ao menos carregado para atribuir primeiro quem tem mais restrições
  const profIdsOrdenados = Array.from(demandasPorProf.keys()).sort(
    (a, b) => (demandasPorProf.get(b)?.length || 0) - (demandasPorProf.get(a)?.length || 0)
  );

  for (const profId of profIdsOrdenados) {
    const novasAulasProf = demandasPorProf.get(profId) || [];
    const preservadasProf = horariosPreservados.filter(h => h.professorId === profId);
    const totalSemanalProf = novasAulasProf.length + preservadasProf.length;
    cargaTotalPorProf.set(profId, totalSemanalProf);

    if (!concederDiaPedagogico) {
      diaPedagogicoPorProf.set(profId, null);
      continue;
    }

    // Descobrir quantos turnos distintos o professor leciona (ex: Manhã + Tarde dobra capacidade diária)
    const turnosDoProf = new Set<string>();
    for (const d of novasAulasProf) turnosDoProf.add(normalizarTurnoChave(d.turno) || 'padrao');
    for (const h of preservadasProf) turnosDoProf.add(normalizarTurnoChave(turnoDaTurma(h.turmaId)) || 'padrao');
    const numTurnosDistintos = Math.max(1, turnosDoProf.size);

    // Capacidade semanal máxima com 4 dias úteis (1 dia livre = Dia Pedagógico)
    const capacidadePorDia = temposOrdenados.length * numTurnosDistintos;
    const capacidade4Dias = capacidadePorDia * 4;

    if (totalSemanalProf > capacidade4Dias) {
      diaPedagogicoPorProf.set(profId, null);
      motivoSemDiaPedagogico.set(
        profId,
        `Carga total (${totalSemanalProf} tempos) excede a capacidade de 4 dias úteis (${capacidade4Dias} tempos).`
      );
      continue;
    }

    // Verificar também quantos tempos diferentes já estão bloqueados por dia nas turmas alvo
    // Dias que já possuem aulas preservadas desse professor não podem ser dia pedagógico dele
    const diasComAulasPreservadas = new Set(preservadasProf.map(h => h.diaSemana));
    const diasCandidatos = DIAS_SEMANA_LETIVOS.filter(dia => !diasComAulasPreservadas.has(dia));

    if (diasCandidatos.length === 0) {
      diaPedagogicoPorProf.set(profId, null);
      motivoSemDiaPedagogico.set(
        profId,
        'Já possui aulas fixas em todos os 5 dias úteis no horário preservado.'
      );
      continue;
    }

    // Escolher o dia candidato com menor número de professores já com dia pedagógico,
    // evitando ainda dias em que suas turmas têm menos espaço livre
    const turmasProfIds = Array.from(new Set(novasAulasProf.map(a => a.turma.id)));
    diasCandidatos.sort((d1, d2) => {
      const c1 = contagemDiaPedagogicoPorDia.get(d1) || 0;
      const c2 = contagemDiaPedagogicoPorDia.get(d2) || 0;
      if (c1 !== c2) return c1 - c2;
      // Desempate: prefere dia onde as turmas do professor têm menos vagas bloqueadas
      const ocup1 = horariosPreservados.filter(h => h.diaSemana === d1 && turmasProfIds.includes(h.turmaId)).length;
      const ocup2 = horariosPreservados.filter(h => h.diaSemana === d2 && turmasProfIds.includes(h.turmaId)).length;
      return ocup2 - ocup1;
    });

    const escolhido = diasCandidatos[0];
    diaPedagogicoPorProf.set(profId, escolhido);
    contagemDiaPedagogicoPorDia.set(escolhido, (contagemDiaPedagogicoPorDia.get(escolhido) || 0) + 1);
  }

  // 4. Ordenação das demandas por dificuldade (MRV: Prioritárias primeiro, depois profs com maior carga)
  const demandasOrdenadas = [...demandasBrutas].sort((a, b) => {
    if (a.ehPrioritaria !== b.ehPrioritaria) return a.ehPrioritaria ? -1 : 1;
    const cargaA = cargaTotalPorProf.get(a.professorId) || 0;
    const cargaB = cargaTotalPorProf.get(b.professorId) || 0;
    if (cargaA !== cargaB) return cargaB - cargaA;
    if (a.totalDiscNaTurma !== b.totalDiscNaTurma) return b.totalDiscNaTurma - a.totalDiscNaTurma;
    return a.seq - b.seq;
  });

  // Estado mutável durante o algoritmo
  const aulasGeradas: HorarioAulaItem[] = [];
  const aulasNaoAlocadas: AulaNaoAlocadaInfo[] = [];

  const todosAtivos = (): HorarioAulaItem[] => [...horariosPreservados, ...aulasGeradas];

  const ehSlotProibidoParaPrioritaria = (numeroTempo: number, ehPrioritaria: boolean): boolean => {
    if (!ehPrioritaria || !evitarSextoTempoParaPrioritarias) return false;
    // Regra explícita: não entra no 6º tempo (ou tempos >= 6, nem último tempo se escola tiver >= 6 tempos)
    if (numeroTempo === 6 || numeroTempo >= 6) return true;
    if (temposOrdenados.length >= 6 && numeroTempo === maxNumeroTempo) return true;
    return false;
  };

  const verificarSlotDisponivel = (
    demanda: {
      turma: Turma;
      disciplinaId: string;
      professorId: string;
      sala: string;
      turno: string;
      ehPrioritaria: boolean;
    },
    dia: DiaSemana,
    numeroTempo: number,
    respeitarDiaPedagogico: boolean,
    ignorarGeradaId?: string
  ): boolean => {
    if (ehSlotProibidoParaPrioritaria(numeroTempo, demanda.ehPrioritaria)) {
      return false;
    }

    if (respeitarDiaPedagogico) {
      const dp = diaPedagogicoPorProf.get(demanda.professorId);
      if (dp && dp === dia) return false;
    }

    const salaNorm = demanda.sala.toLowerCase();
    const turnoDemanda = demanda.turno;

    for (const h of todosAtivos()) {
      if (ignorarGeradaId && h.id === ignorarGeradaId) continue;
      if (h.diaSemana !== dia || h.numeroTempo !== numeroTempo) continue;

      // Mesmo horário na mesma turma: nunca permitido
      if (h.turmaId === demanda.turma.id) return false;

      const turnoH = turnoDaTurma(h.turmaId);
      const colideTurno = turnosHorariosConflitam(turnoDemanda, turnoH, turnosConfigs, isolarConflitoPorTurno);
      if (!colideTurno) continue;

      // Conflito de professor
      if (h.professorId === demanda.professorId) return false;

      // Conflito de sala
      if (salaNorm && h.sala.trim().toLowerCase() === salaNorm) return false;
    }

    return true;
  };

  const pontuarSlot = (
    demanda: {
      turma: Turma;
      disciplinaId: string;
      professorId: string;
      ehPrioritaria: boolean;
    },
    dia: DiaSemana,
    tempoIdx: number,
    numeroTempo: number
  ): number => {
    let score = 0;
    const ativos = todosAtivos();
    const aulasDiaTurma = ativos.filter(h => h.turmaId === demanda.turma.id && h.diaSemana === dia);
    const mesmaDiscNoDia = aulasDiaTurma.filter(h => h.disciplinaId === demanda.disciplinaId).length;

    // Penalizar fortemente repetição excessiva da mesma disciplina no mesmo dia (ideal 1/dia, máximo 2)
    if (mesmaDiscNoDia === 1) score -= 40;
    else if (mesmaDiscNoDia >= 2) score -= 180;

    // Equilíbrio de carga da turma ao longo dos 5 dias
    score -= aulasDiaTurma.length * 6;

    // Preferência de horários para disciplinas prioritárias (1º, 2º, 3º tempos)
    if (demanda.ehPrioritaria && priorizarPrimeirosTempos) {
      score += Math.max(0, 5 - tempoIdx) * 18;
      if (numeroTempo <= 3) score += 30;
    } else if (!demanda.ehPrioritaria && priorizarPrimeirosTempos) {
      // Disciplinas não prioritárias deixam ligeiramente mais espaço nos primeiros tempos quando possível
      score += tempoIdx * 2;
    }

    // Evitar janelas grandes no horário do professor no mesmo dia
    const aulasProfDia = ativos.filter(h => h.professorId === demanda.professorId && h.diaSemana === dia);
    if (aulasProfDia.length > 0) {
      const adjacente = aulasProfDia.some(a => Math.abs(a.numeroTempo - numeroTempo) === 1);
      if (adjacente) score += 12;
    }

    return score;
  };

  const listarMelhoresSlots = (
    demanda: {
      turma: Turma;
      disciplinaId: string;
      professorId: string;
      sala: string;
      turno: string;
      ehPrioritaria: boolean;
    },
    respeitarDiaPedagogico: boolean,
    ignorarGeradaId?: string
  ): Array<{ dia: DiaSemana; tempo: TempoHorarioDefinicao; score: number }> => {
    const opcoes: Array<{ dia: DiaSemana; tempo: TempoHorarioDefinicao; score: number }> = [];
    for (const dia of DIAS_SEMANA_LETIVOS) {
      for (let tIdx = 0; tIdx < temposOrdenados.length; tIdx++) {
        const tempo = temposOrdenados[tIdx];
        if (!verificarSlotDisponivel(demanda, dia, tempo.numero, respeitarDiaPedagogico, ignorarGeradaId)) continue;
        opcoes.push({
          dia,
          tempo,
          score: pontuarSlot(demanda, dia, tIdx, tempo.numero)
        });
      }
    }
    opcoes.sort((a, b) => b.score - a.score);
    return opcoes;
  };

  const criarRegistroAula = (demanda: DemandaAula, dia: DiaSemana, tempo: TempoHorarioDefinicao, idxUnico: number): HorarioAulaItem => ({
    id: `hor-auto-${Date.now()}-${idxUnico}-${Math.random().toString(36).slice(2, 6)}`,
    escolaId,
    turmaId: demanda.turma.id,
    turmaNome: demanda.turma.nome,
    classe: demanda.turma.nome || demanda.turma.classe,
    diaSemana: dia,
    numeroTempo: tempo.numero,
    horaInicio: tempo.inicio,
    horaFim: tempo.fim,
    disciplinaId: demanda.disciplinaId,
    disciplinaNome: demanda.disciplinaNome,
    professorId: demanda.professorId,
    professorNome: demanda.professorNome,
    sala: demanda.sala,
    anoLectivo,
    atualizadoEm: new Date().toISOString()
  });

  // Tenta realocar uma aula já gerada para abrir espaço ao slot desejado (1-step repair)
  const tentarRealocarAulaGerada = (
    aulaBloqueadora: HorarioAulaItem,
    respeitarDiaPedagogico: boolean
  ): boolean => {
    const turmaBloq = todasTurmasMap.get(aulaBloqueadora.turmaId);
    if (!turmaBloq) return false;
    const ehPrioBloq = prioSet.has(aulaBloqueadora.disciplinaId);
    const pseudoDemanda = {
      turma: turmaBloq,
      disciplinaId: aulaBloqueadora.disciplinaId,
      professorId: aulaBloqueadora.professorId,
      sala: aulaBloqueadora.sala,
      turno: turmaBloq.turno || 'Manhã',
      ehPrioritaria: ehPrioBloq
    };
    const alternativas = listarMelhoresSlots(pseudoDemanda, respeitarDiaPedagogico, aulaBloqueadora.id);
    const outra = alternativas.find(
      op => !(op.dia === aulaBloqueadora.diaSemana && op.tempo.numero === aulaBloqueadora.numeroTempo)
    );
    if (!outra) return false;

    aulaBloqueadora.diaSemana = outra.dia;
    aulaBloqueadora.numeroTempo = outra.tempo.numero;
    aulaBloqueadora.horaInicio = outra.tempo.inicio;
    aulaBloqueadora.horaFim = outra.tempo.fim;
    return true;
  };

  const profsComDiaPedagogicoQuebrado = new Set<string>();

  // 5. Loop principal de alocação + reparo por troca
  demandasOrdenadas.forEach((demanda, idx) => {
    // Passagem A: respeitando Dia Pedagógico
    const opcoesA = listarMelhoresSlots(demanda, true);
    if (opcoesA.length > 0) {
      aulasGeradas.push(criarRegistroAula(demanda, opcoesA[0].dia, opcoesA[0].tempo, idx));
      return;
    }

    // Passagem B: tentar troca 1-step movendo alguma aula já gerada na turma ou do professor (ainda respeitando Dia Pedagógico)
    let alocadoPorTroca = false;
    for (const dia of DIAS_SEMANA_LETIVOS) {
      if (alocadoPorTroca) break;
      const dp = diaPedagogicoPorProf.get(demanda.professorId);
      if (dp && dp === dia) continue;

      for (const tempo of temposOrdenados) {
        if (ehSlotProibidoParaPrioritaria(tempo.numero, demanda.ehPrioritaria)) continue;

        // Encontrar aulas GERADAS (mutáveis) que estão a bloquear exatamente este (dia, tempo)
        const bloqueiosGerados = aulasGeradas.filter(g => {
          if (g.diaSemana !== dia || g.numeroTempo !== tempo.numero) return false;
          if (g.turmaId === demanda.turma.id) return true;
          const colideTurno = turnosHorariosConflitam(demanda.turno, turnoDaTurma(g.turmaId), turnosConfigs, isolarConflitoPorTurno);
          if (!colideTurno) return false;
          return g.professorId === demanda.professorId || g.sala.trim().toLowerCase() === demanda.sala.toLowerCase();
        });

        // Só tenta mover se houver exatamente 1 bloqueio mutável (evita efeito dominó infinito)
        if (bloqueiosGerados.length === 1) {
          const bloq = bloqueiosGerados[0];
          const backup = { ...bloq };
          if (tentarRealocarAulaGerada(bloq, true)) {
            if (verificarSlotDisponivel(demanda, dia, tempo.numero, true)) {
              aulasGeradas.push(criarRegistroAula(demanda, dia, tempo, idx));
              alocadoPorTroca = true;
              break;
            } else {
              // Reverter se ainda houver outro bloqueio fixo
              Object.assign(bloq, backup);
            }
          }
        }
      }
    }

    if (alocadoPorTroca) return;

    // Passagem C: se o Dia Pedagógico impediu a alocação por falta de janelas livres nas turmas,
    // relaxa APENAS o Dia Pedagógico desse professor (nunca viola conflitos nem regra do 6º tempo!)
    if (concederDiaPedagogico && diaPedagogicoPorProf.get(demanda.professorId)) {
      const opcoesSemDP = listarMelhoresSlots(demanda, false);
      if (opcoesSemDP.length > 0) {
        profsComDiaPedagogicoQuebrado.add(demanda.professorId);
        aulasGeradas.push(criarRegistroAula(demanda, opcoesSemDP[0].dia, opcoesSemDP[0].tempo, idx));
        return;
      }
    }

    // Não foi possível alocar sem conflito
    aulasNaoAlocadas.push({
      turmaId: demanda.turma.id,
      turmaNome: demanda.turma.nome,
      disciplinaId: demanda.disciplinaId,
      disciplinaNome: demanda.disciplinaNome,
      professorId: demanda.professorId,
      professorNome: demanda.professorNome,
      motivo: demanda.ehPrioritaria && evitarSextoTempoParaPrioritarias
        ? 'Sem tempo compatível (1º ao 5º tempo) livre simultaneamente para turma, professor e sala.'
        : 'Sem tempo semanal livre compatível simultaneamente para a turma, professor e sala.'
    });
  });

  // 6. Consolidar relatório final de Dias Pedagógicos
  const diasPedagogicos: DiaPedagogicoProfessorInfo[] = profIdsOrdenados.map(profId => {
    const profObj = funcsMap.get(profId);
    const nome = profObj?.nomeCompleto || 'Docente';
    const carga = cargaTotalPorProf.get(profId) || 0;
    const aulasFinProf = todosAtivos().filter(h => h.professorId === profId);
    const diasComAula = new Set(aulasFinProf.map(h => h.diaSemana));

    let diaLivreReal = diaPedagogicoPorProf.get(profId) || null;
    if (diaLivreReal && (profsComDiaPedagogicoQuebrado.has(profId) || diasComAula.has(diaLivreReal))) {
      // Ainda verificar se outro dia útil ficou completamente livre
      const outroDiaLivre = DIAS_SEMANA_LETIVOS.find(d => !diasComAula.has(d)) || null;
      diaLivreReal = concederDiaPedagogico ? outroDiaLivre : null;
    } else if (concederDiaPedagogico && !diaLivreReal) {
      const algumLivre = DIAS_SEMANA_LETIVOS.find(d => !diasComAula.has(d)) || null;
      diaLivreReal = algumLivre;
    }

    const concedido = Boolean(concederDiaPedagogico && diaLivreReal);
    let motivo: string | undefined;
    if (concederDiaPedagogico && !concedido) {
      motivo =
        motivoSemDiaPedagogico.get(profId) ||
        'A combinação de horários livres das turmas exigiu aulas nos 5 dias úteis.';
    }

    return {
      professorId: profId,
      professorNome: nome,
      diaPedagogico: diaLivreReal,
      cargaTotalSemanal: aulasFinProf.length || carga,
      concedido,
      motivo
    };
  });

  // 7. Auditoria final de conflitos e estatísticas de prioridade
  const horariosFinaisCompletos = [...horariosPreservados, ...aulasGeradas];
  let totalConflitos = 0;

  for (let i = 0; i < horariosFinaisCompletos.length; i++) {
    for (let j = i + 1; j < horariosFinaisCompletos.length; j++) {
      const a = horariosFinaisCompletos[i];
      const b = horariosFinaisCompletos[j];
      if (a.diaSemana !== b.diaSemana || a.numeroTempo !== b.numeroTempo) continue;
      if (a.turmaId === b.turmaId) {
        totalConflitos++;
        continue;
      }
      const colide = turnosHorariosConflitam(
        turnoDaTurma(a.turmaId),
        turnoDaTurma(b.turmaId),
        turnosConfigs,
        isolarConflitoPorTurno
      );
      if (!colide) continue;
      if (a.professorId === b.professorId) totalConflitos++;
      else if (a.sala && b.sala && a.sala.trim().toLowerCase() === b.sala.trim().toLowerCase()) totalConflitos++;
    }
  }

  let totalPrioritariasAlocadas = 0;
  let prioritariasForaSextoTempo = 0;
  let prioritariasNosPrimeirosTempos = 0;
  for (const h of aulasGeradas) {
    if (!prioSet.has(h.disciplinaId)) continue;
    totalPrioritariasAlocadas++;
    if (h.numeroTempo < 6) prioritariasForaSextoTempo++;
    if (h.numeroTempo <= 3) prioritariasNosPrimeirosTempos++;
  }

  return {
    gerados: aulasGeradas,
    idsSubstituidos,
    horariosFinaisCompletos,
    diasPedagogicos,
    aulasNaoAlocadas,
    totalDemandas: demandasBrutas.length,
    totalAlocadas: aulasGeradas.length,
    totalConflitos,
    prioritariasForaSextoTempo,
    prioritariasNosPrimeirosTempos,
    totalPrioritariasAlocadas
  };
}
