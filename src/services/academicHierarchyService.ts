/**
 * =========================================================================
 * SGE-NG Angola - Serviço de Hierarquia e Coerência Acadêmica Oficial (MED)
 * =========================================================================
 * Garante a associação obrigatória e estrita de:
 * 1. Ensino Primário & 1º Ciclo: Classe -> Turma -> Sala -> Disciplinas da Matriz
 * 2. 2º Ciclo (Secundário Geral e Técnico): Classe -> Turma -> Sala -> Curso -> Disciplinas Específicas
 * 
 * Previne inconsistências, erros de cadastro e estudantes órfãos de sala/curso.
 */

import { Turma, Disciplina, Aluno, NivelEnsino, ClasseEscolar } from '../types';
export { isClasseFinal } from './macEngine';

export const CLASSES_ENSINO_PRIMARIO = ['Iniciação', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª'];
export const CLASSES_PRIMEIRO_CICLO = ['7ª', '8ª', '9ª'];
export const CLASSES_SEGUNDO_CICLO = ['10ª', '11ª', '12ª', '13ª'];

export const CURSOS_SEGUNDO_CICLO = [
  'Ciências Físicas e Biológicas (PUNIV)',
  'Ciências Económicas e Jurídicas (PUNIV)',
  'Ciências Humanas',
  'Informática e Gestão de Redes',
  'Formação de Professores do Ensino Primário (Magistério)',
  'Técnico de Enfermagem / Saúde',
  'Contabilidade e Gestão'
];

export const SALAS_PADRAO_ESCOLA = [
  'Sala 01', 'Sala 02', 'Sala 03', 'Sala 04', 'Sala 05',
  'Sala 06', 'Sala 07', 'Sala 08', 'Sala 09', 'Sala 10',
  'Laboratório 1', 'Laboratório 2', 'Laboratório de Informática', 'Pavilhão Multiuso'
];

/**
 * Normaliza o rótulo de classe para comparação consistente
 */
export function normalizarClasse(classe: string | undefined | null): string {
  if (!classe) return '';
  const limpa = classe.trim();
  if (/inicia[cç][aã]o/i.test(limpa)) return 'Iniciação';
  
  const num = limpa.match(/\d+/);
  if (num) {
    return `${num[0]}ª`;
  }
  return limpa;
}

/**
 * Verifica se a classe pertence ao 2º Ciclo do Ensino Secundário (10ª a 13ª classe)
 */
export function isSegundoCiclo(classe: string | undefined | null): boolean {
  if (!classe) return false;
  const norm = normalizarClasse(classe);
  return CLASSES_SEGUNDO_CICLO.includes(norm);
}

/**
 * Verifica se a classe pertence ao Ensino Primário (Iniciação a 6ª classe)
 */
export function isEnsinoPrimario(classe: string | undefined | null): boolean {
  if (!classe) return false;
  const norm = normalizarClasse(classe);
  return CLASSES_ENSINO_PRIMARIO.includes(norm);
}

/**
 * Verifica se a classe pertence ao 1º Ciclo do Ensino Secundário (7ª a 9ª classe)
 */
export function isPrimeiroCiclo(classe: string | undefined | null): boolean {
  if (!classe) return false;
  const norm = normalizarClasse(classe);
  return CLASSES_PRIMEIRO_CICLO.includes(norm);
}

/**
 * Determina o Nível de Ensino oficial MED correspondente à classe
 */
export function getNivelEnsinoPorClasse(classe: string | undefined | null): NivelEnsino {
  if (!classe) return 'Primario';
  const norm = normalizarClasse(classe);
  if (norm === 'Iniciação') return 'Iniciacao';
  if (CLASSES_ENSINO_PRIMARIO.includes(norm)) return 'Primario';
  if (CLASSES_PRIMEIRO_CICLO.includes(norm)) return 'ICiclo';
  if (norm === '13ª') return 'EnsinoTecnico';
  return 'IICiclo';
}

/**
 * Matriz Curricular Oficial por Classe e Curso (MED Angola)
 */
export function getDisciplinasMatrizOficial(classe: string, curso?: string): string[] {
  const norm = normalizarClasse(classe);

  if (norm === 'Iniciação') {
    return [
      'Comunicação e Linguagem',
      'Matemática e Descoberta',
      'Estudo do Meio',
      'Expressão Motora',
      'Expressão Plástica e Musical'
    ];
  }

  if (['1ª', '2ª', '3ª', '4ª'].includes(norm)) {
    return [
      'Língua Portuguesa',
      'Matemática',
      'Estudo do Meio',
      'Educação Moral e Cívica',
      'Educação Visual e Plástica',
      'Educação Musical',
      'Educação Física'
    ];
  }

  if (['5ª', '6ª'].includes(norm)) {
    return [
      'Língua Portuguesa',
      'Matemática',
      'Ciências da Natureza',
      'História',
      'Geografia',
      'Educação Moral e Cívica',
      'Educação Visual e Plástica',
      'Educação Musical',
      'Educação Física'
    ];
  }

  if (['7ª', '8ª', '9ª'].includes(norm)) {
    return [
      'Língua Portuguesa',
      'Matemática',
      'Física',
      'Química',
      'Biologia',
      'Geografia',
      'História',
      'Língua Francesa',
      'Língua Inglesa',
      'Educação Visual e Plástica',
      'Educação Física',
      'Educação Moral e Cívica'
    ];
  }

  // 2º Ciclo: OBRIGATORIAMENTE associado à Classe + Curso!
  const cursoStr = (curso || '').toLowerCase();

  if (cursoStr.includes('física') || cursoStr.includes('biológica') || cursoStr.includes('cfb') || cursoStr.includes('exata')) {
    return [
      'Língua Portuguesa',
      'Literatura em Língua Portuguesa',
      'Matemática',
      'Física',
      'Química',
      'Biologia',
      'Geologia',
      'Filosofia',
      'Língua Inglesa',
      'Informática / TIC',
      'Educação Física'
    ];
  }

  if (cursoStr.includes('económica') || cursoStr.includes('jurídica') || cursoStr.includes('cej') || cursoStr.includes('direito') || cursoStr.includes('economia')) {
    return [
      'Língua Portuguesa',
      'Literatura em Língua Portuguesa',
      'Matemática',
      'Introdução à Economia',
      'Introdução ao Direito',
      'Desenvolvimento Económico e Social',
      'Geografia',
      'História',
      'Filosofia',
      'Língua Inglesa',
      'Educação Física'
    ];
  }

  if (cursoStr.includes('magistério') || cursoStr.includes('professor') || cursoStr.includes('pedagóg')) {
    return [
      'Língua Portuguesa',
      'Matemática',
      'Psicologia Geral e do Desenvolvimento',
      'Pedagogia Geral',
      'Didática da Língua Portuguesa',
      'Didática da Matemática',
      'Higiene e Saúde Escolar',
      'Ética e Deontologia Profissional',
      'Prática e Estágio Pedagógico',
      'Língua Inglesa',
      'Educação Física'
    ];
  }

  if (cursoStr.includes('informática') || cursoStr.includes('rede') || cursoStr.includes('téc')) {
    return [
      'Língua Portuguesa',
      'Matemática',
      'Física',
      'Técnicas e Linguagens de Programação (TLP)',
      'Sistemas de Informação e Redes',
      'Tecnologias de Informação e Comunicação (TIC)',
      'Empreendedorismo',
      'Organização e Gestão Empresarial (OGE)',
      'Língua Inglesa',
      'Educação Física'
    ];
  }

  // Padrão Geral para 2º Ciclo (Ciências Humanas / Geral)
  return [
    'Língua Portuguesa',
    'Literatura em Língua Portuguesa',
    'Matemática',
    'História',
    'Geografia',
    'Filosofia',
    'Psicologia',
    'Sociologia',
    'Língua Francesa',
    'Língua Inglesa',
    'Informática / TIC',
    'Educação Física'
  ];
}

/**
 * Filtra turmas que pertencem estritamente a uma classe específica
 */
export function getTurmasPorClasse(turmas: Turma[], classeSelecionada: string): Turma[] {
  if (!classeSelecionada || classeSelecionada === 'TODAS') return turmas;
  const norm = normalizarClasse(classeSelecionada);
  return turmas.filter(t => normalizarClasse(t.classe) === norm);
}

/**
 * Obtém a sala associada a uma turma com fallback seguro
 */
export function getSalaDaTurma(turma?: Turma | null): string {
  if (!turma) return 'Sem Sala Definida';
  if (turma.sala && turma.sala.trim()) return turma.sala.trim();
  return 'Sala Provisória';
}

/**
 * Obtém o curso associado a uma turma com validação de ciclo
 */
export function getCursoDaTurma(turma?: Turma | null): string {
  if (!turma) return 'Geral';
  if (isSegundoCiclo(turma.classe)) {
    return turma.curso && turma.curso.trim() ? turma.curso.trim() : 'Ciências Físicas e Biológicas (PUNIV)';
  }
  if (isPrimeiroCiclo(turma.classe)) {
    return 'Iº Ciclo do Ensino Secundário Geral';
  }
  return 'Ensino Primário Geral';
}

/**
 * Ordena disciplinas rigorosamente de acordo com a ordem estabelecida na gestão de disciplinas
 * (ordem ascendente e alfabética como desempate natural)
 */
export function ordenarDisciplinas(disciplinas: Disciplina[]): Disciplina[] {
  return [...disciplinas].sort((a, b) => {
    const ordemA = typeof a.ordem === 'number' && !isNaN(a.ordem) ? a.ordem : 999;
    const ordemB = typeof b.ordem === 'number' && !isNaN(b.ordem) ? b.ordem : 999;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.nome.localeCompare(b.nome, 'pt-AO', { sensitivity: 'base' });
  });
}

/**
 * Filtra disciplinas disponíveis para uma turma baseada estritamente na sua Classe e Curso,
 * retornando-as na ordem curricular exata definida na gestão de disciplinas.
 */
export function getDisciplinasDaTurma(disciplinas: Disciplina[], turma?: Turma | null): Disciplina[] {
  if (!turma) return ordenarDisciplinas(disciplinas);
  return filtrarDisciplinasDaClasse(disciplinas, turma.classe, turma.curso);
}

/**
 * Validação rigorosa na criação/atualização de uma Turma:
 * Exige sala para todas as turmas e exige curso para o 2º Ciclo.
 */
export function validarCriacaoTurma(dados: {
  nome: string;
  classe: string;
  sala: string;
  curso?: string;
}): { valida: boolean; erro?: string; cursoAjustado: string; salaAjustada: string } {
  if (!dados.nome || !dados.nome.trim()) {
    return { valida: false, erro: 'O nome da turma é obrigatório (ex: "10ª A - Manhã").', cursoAjustado: '', salaAjustada: '' };
  }

  if (!dados.classe || !dados.classe.trim()) {
    return { valida: false, erro: 'A seleção da classe é obrigatória.', cursoAjustado: '', salaAjustada: '' };
  }

  // 1. Cada turma deve estar associada a uma sala para dados coerentes
  const salaAjustada = dados.sala && dados.sala.trim() ? dados.sala.trim() : 'Sala 01';

  // 2. Para o 2º Ciclo: associar sempre Classe, Turma, Sala e Curso!
  if (isSegundoCiclo(dados.classe)) {
    if (!dados.curso || !dados.curso.trim() || dados.curso === 'Geral') {
      return {
        valida: false,
        erro: `Para turmas do 2º Ciclo (${dados.classe}), é obrigatório associar um Curso oficial (ex: Ciências Físicas e Biológicas, Ciências Económicas e Jurídicas, Informática, etc.).`,
        cursoAjustado: 'Ciências Físicas e Biológicas (PUNIV)',
        salaAjustada
      };
    }
  }

  const cursoAjustado = isSegundoCiclo(dados.classe)
    ? (dados.curso || 'Ciências Físicas e Biológicas (PUNIV)')
    : isPrimeiroCiclo(dados.classe)
      ? 'Iº Ciclo do Ensino Secundário Geral'
      : 'Ensino Primário Geral';

  return { valida: true, cursoAjustado, salaAjustada };
}

/**
 * Obtém a denominação do ciclo escolar a partir da classe
 */
export function formatarCicloPorClasse(classe: string): string {
  if (isEnsinoPrimario(classe)) return 'Ensino Primário';
  if (isPrimeiroCiclo(classe)) return 'Iº Ciclo do Ensino Secundário';
  if (isSegundoCiclo(classe)) return 'IIº Ciclo do Ensino Secundário';
  return 'Geral';
}

/**
 * Filtra disciplinas associadas a uma classe ou ciclo com suporte a múltiplas classes
 * Conforme requisito: "quando se seleciona uma classe ou ciclo, só pode se ver aquelas disciplinas e isso é aplicado nos documentos, pautas, etc."
 */
export function getDisciplinasPorClasseECiclo(
  disciplinas: Disciplina[],
  classeSelecionada?: string,
  cicloSelecionado?: string
): Disciplina[] {
  if (!classeSelecionada && !cicloSelecionado) return ordenarDisciplinas(disciplinas);
  const cSel = classeSelecionada && classeSelecionada !== 'TODAS' && classeSelecionada !== 'todas' ? classeSelecionada : null;
  const ciSel = cicloSelecionado && cicloSelecionado !== 'TODOS' && cicloSelecionado !== 'todos' ? cicloSelecionado : null;

  if (!cSel && !ciSel) return ordenarDisciplinas(disciplinas);

  if (cSel) {
    return filtrarDisciplinasDaClasse(disciplinas, cSel);
  }

  // Filtro puramente por ciclo
  if (!ciSel) return ordenarDisciplinas(disciplinas);
  const cicloLower = ciSel.toLowerCase();
  const filtradasCiclo = disciplinas.filter(d => {
    if (d.ciclo && d.ciclo.toLowerCase().includes(cicloLower)) return true;
    if (ciSel.includes('Primário')) {
      if (d.nivelEnsino === 'Primario' || d.nivelEnsino === 'Iniciacao') return true;
      if (d.classe && isEnsinoPrimario(d.classe)) return true;
      if (d.classes && d.classes.some(c => isEnsinoPrimario(c))) return true;
    }
    if (ciSel.includes('Iº Ciclo')) {
      if (d.nivelEnsino === 'ICiclo') return true;
      if (d.classe && isPrimeiroCiclo(d.classe)) return true;
      if (d.classes && d.classes.some(c => isPrimeiroCiclo(c))) return true;
    }
    if (ciSel.includes('IIº Ciclo') || ciSel.includes('Secundário')) {
      if (d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico') return true;
      if (d.classe && isSegundoCiclo(d.classe)) return true;
      if (d.classes && d.classes.some(c => isSegundoCiclo(c))) return true;
    }
    return false;
  });

  return ordenarDisciplinas(filtradasCiclo);
}

/**
 * Filtro estrito e infalível de disciplinas por classe e curso para Documentos, Pautas, Boletins, Histórico Escolar e Termos.
 * Garante que cada classe exibe exclusivamente as disciplinas a ela vinculadas, preservando rigorosamente
 * a ordem curricular definida na funcionalidade Disciplinas.
 */
export function filtrarDisciplinasDaClasse(
  disciplinas: Disciplina[],
  classe: string | undefined | null,
  curso?: string | null
): Disciplina[] {
  if (!classe || classe === 'TODAS' || classe === 'todas') return ordenarDisciplinas(disciplinas);
  const normClasse = normalizarClasse(classe);

  // 1. Prioridade Absoluta: Disciplinas cadastradas especificamente para esta classe
  const disciplinasEspecificasClasse = disciplinas.filter(d => {
    if (d.classes && Array.isArray(d.classes) && d.classes.length > 0) {
      return d.classes.some(c => normalizarClasse(c) === normClasse);
    }
    if (d.classe && d.classe.trim()) {
      return normalizarClasse(d.classe) === normClasse;
    }
    return false;
  });

  if (disciplinasEspecificasClasse.length > 0) {
    return ordenarDisciplinas(disciplinasEspecificasClasse);
  }

  // 2. Se nenhuma disciplina tiver classe explicitamente atribuída no cadastro,
  // consultar a Matriz Curricular Oficial MED de Angola e o Ciclo correspondente:
  const matrizOficial = getDisciplinasMatrizOficial(classe, curso || undefined);
  const filtradas = disciplinas.filter(d => {
    const nomeNorm = d.nome.toLowerCase().trim();
    const naMatriz = matrizOficial.some(m => {
      const mNorm = m.toLowerCase().trim();
      return mNorm === nomeNorm || nomeNorm.includes(mNorm) || mNorm.includes(nomeNorm);
    });
    if (naMatriz) return true;

    if (isEnsinoPrimario(normClasse)) {
      return (d.nivelEnsino === 'Primario' || d.nivelEnsino === 'Iniciacao') && !d.ehTecnica;
    }
    if (isPrimeiroCiclo(normClasse)) {
      return (d.nivelEnsino === 'ICiclo' || (d.nivelEnsino as string) === 'I_Ciclo') && !d.ehTecnica;
    }
    if (isSegundoCiclo(normClasse)) {
      if (d.nivelEnsino === 'IICiclo' || (d.nivelEnsino as string) === 'II_Ciclo' || d.nivelEnsino === 'EnsinoTecnico') {
        if (d.ehTecnica && curso) {
          const cNorm = curso.toLowerCase();
          return cNorm.includes('informática') || cNorm.includes('saúde') || cNorm.includes('técnic');
        }
        return true;
      }
    }

    return false;
  });

  const resultadoFinal = filtradas.length > 0 ? filtradas : disciplinas.filter(d => {
    const nomeNorm = d.nome.toLowerCase().trim();
    return matrizOficial.some(m => m.toLowerCase().trim() === nomeNorm);
  });

  return ordenarDisciplinas(resultadoFinal);
}



