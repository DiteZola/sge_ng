import { Escola, Funcionario, Turma, AtribuicaoDocente, ComissaoJuri } from '../types';
import { dbService } from '../services/storage';

/**
 * Utilitário Oficial para Resolução Rigorosa dos Responsáveis e Cargos Oficiais MED
 * Garante que em TODOS os documentos oficiais (Pautas, Boletins, Declarações, Certificados, Termos, Livros de Ponto):
 * 1. O Director(a) Geral seja exibido com exatidão e com flexão gramatical oficial ("O Director Geral" / "A Directora Geral").
 * 2. O Subdirector(a) Pedagógico(a) seja localizado e exibido sem termos genéricos ("A designar" ou "Não atribuído").
 * 3. O Chefe de Secretaria seja localizado e exibido com seu nome real.
 * 4. O Coordenador(a) de Turma seja identificado a partir dos dados da turma ou das atribuições docentes.
 * 5. O Coordenador(a) / Docente da Disciplina seja identificado a partir das atribuições docentes reais da turma/disciplina.
 * 6. Membros de Júri (Presidente, Secretário, Vogais) sejam resolvidos com base nos membros nomeados ou docentes.
 */

export const isPlaceholderInvalido = (valor?: string | null): boolean => {
  if (!valor) return true;
  const limpo = valor.trim().toLowerCase();
  const invalidos = [
    'não atribuído',
    'nao atribuido',
    'pendente de nomeação',
    'pendente de nomeacao',
    'pendente',
    'a designar',
    'direção geral',
    'direcção geral',
    'diretor geral',
    'director geral',
    'diretor',
    'director',
    'subdireção pedagógica',
    'subdirecao pedagogica',
    'subdiretor pedagógico',
    'subdirector pedagógico',
    'subdiretor',
    'subdirector',
    'chefe de secretaria',
    'chefe da secretaria',
    'secretaria',
    'secretaria geral',
    'docente responsável',
    'docente responsavel',
    'corpo docente',
    'corpo docente designado',
    ''
  ];
  return invalidos.includes(limpo);
};

const NOMES_FEMININOS_COMUNS = [
  'maria', 'ana', 'isabel', 'teresa', 'helena', 'fatima', 'fátima', 'esperança', 'esperanca',
  'joana', 'madalena', 'rosa', 'marta', 'claudia', 'cláudia', 'carla', 'lucia', 'lúcia',
  'antonia', 'antónia', 'albertina', 'beatriz', 'catarina', 'dulce', 'eugenia', 'eugénia',
  'filomena', 'graca', 'graça', 'inacia', 'inácia', 'juliana', 'laura', 'luisa', 'luísa',
  'manuela', 'nadia', 'nádia', 'olivia', 'olívio', 'paula', 'regina', 'sara', 'tatiana',
  'vanessa', 'zita', 'cecilia', 'cecília', 'cristina', 'dianira', 'domingas', 'elda',
  'elena', 'elisa', 'elsa', 'esmeralda', 'estrela', 'eva', 'fernanda', 'flora',
  'francisca', 'gloria', 'glória', 'graciete', 'ines', 'inês', 'irene', 'jacinta',
  'jessica', 'jéssica', 'joaquina', 'josefa', 'judite', 'julia', 'júlia', 'laurinda',
  'leonor', 'lidia', 'lídia', 'lilian', 'liliana', 'luciana', 'luzia', 'margarida',
  'marcela', 'marcia', 'márcia', 'marlene', 'matilde', 'miriam', 'monica', 'mónica',
  'natalia', 'natália', 'neusa', 'nilza', 'noemia', 'noémia', 'odete', 'olga',
  'patricia', 'patrícia', 'paulino', 'rachel', 'raquel', 'rita', 'rosalina', 'rosario',
  'rosário', 'ruth', 'salome', 'salomé', 'sandra', 'silvia', 'sílvia', 'sofia',
  'sonia', 'sónia', 'susana', 'suzana', 'telma', 'veronica', 'verónica', 'vitória', 'vitoria'
];

export const flexionarGenero = (
  genero: 'M' | 'F' | string | undefined | null,
  masculino: string,
  feminino: string
): string => {
  return String(genero || '').toUpperCase() === 'F' ? feminino : masculino;
};

export const inferirGeneroPorNomeOuParentesco = (
  nome?: string | null,
  parentesco?: string | null,
  generoExplicito?: 'M' | 'F' | string | null,
  funcionariosLista?: Funcionario[]
): 'M' | 'F' => {
  const genExp = String(generoExplicito || '').trim().toUpperCase();
  if (genExp === 'F' || genExp === 'M') return genExp;

  const par = (parentesco || '').trim().toLowerCase();
  if (par) {
    if (
      par.includes('mãe') ||
      par.includes('mae') ||
      par.includes('tia') ||
      par.includes('avó') ||
      par.includes('avoa') ||
      par.includes('irmã') ||
      par.includes('irma') ||
      par.includes('madrasta') ||
      par.includes('encarregada') ||
      par.includes('tutora') ||
      par.includes('esposa')
    ) {
      return 'F';
    }
    if (
      par === 'pai' ||
      par.includes('tio') ||
      par.includes('avô') ||
      par.includes('irmão') ||
      par.includes('irmao') ||
      par.includes('padrasto') ||
      par.includes('encarregado') ||
      par.includes('tutor')
    ) {
      return 'M';
    }
  }

  const nomeLimpo = (nome || '').trim();
  if (nomeLimpo && funcionariosLista && funcionariosLista.length > 0) {
    const matchFunc = funcionariosLista.find(
      f => (f.nomeCompleto || '').trim().toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (matchFunc?.genero === 'F' || matchFunc?.genero === 'M') {
      return matchFunc.genero;
    }
  }

  const partes = nomeLimpo.toLowerCase().split(/\s+/).filter(Boolean);
  // Ignorar títulos como Dra., Sra., Prof., Sr., Dr.
  const primeira = partes.find(p => !['dr.', 'dr', 'dra.', 'dra', 'prof.', 'prof', 'profa.', 'sr.', 'sr', 'sra.', 'sra', 'eng.', 'eng'].includes(p)) || partes[0] || '';
  if (!primeira) return 'M';
  if (partes[0] === 'dra.' || partes[0] === 'dra' || partes[0] === 'sra.' || partes[0] === 'sra' || partes[0] === 'profa.') {
    return 'F';
  }
  const excecoesMasculinasEmA = ['garcia', 'sousa', 'silva', 'costa', 'batista', 'mota', 'luca', 'joshua', 'issa', 'mustafa'];
  if (
    NOMES_FEMININOS_COMUNS.some(n => primeira === n || primeira.startsWith(n)) ||
    (primeira.endsWith('a') && !excecoesMasculinasEmA.includes(primeira))
  ) {
    return 'F';
  }
  return 'M';
};

// =========================================================================
// 1. DIRETOR(A) GERAL DA INSTITUIÇÃO
// =========================================================================

export const obterNomeDiretorGeral = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  if (!escola) return 'Director Geral';

  // 1. Verificar escola.diretorGeralNome
  if (escola.diretorGeralNome && !isPlaceholderInvalido(escola.diretorGeralNome)) {
    return escola.diretorGeralNome.trim();
  }

  // 2. Verificar (escola as any).diretorNome
  if ((escola as any).diretorNome && !isPlaceholderInvalido((escola as any).diretorNome)) {
    return (escola as any).diretorNome.trim();
  }

  // 3. Buscar nos funcionários registados nesta escola
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const diretorFunc = funcs.find(f => 
    (f.escolaId === escola.id || escola.id === 'todas') &&
    (f.role === 'DiretorGeral' || 
     (f.cargo && (
       f.cargo.toLowerCase().includes('diretor geral') || 
       f.cargo.toLowerCase().includes('director geral') ||
       f.cargo.toLowerCase().includes('diretor da escola') ||
       f.cargo.toLowerCase().includes('director da escola')
     )))
  );

  if (diretorFunc && diretorFunc.nomeCompleto && !isPlaceholderInvalido(diretorFunc.nomeCompleto)) {
    return diretorFunc.nomeCompleto.trim();
  }

  // 4. Se o utilizador autenticado atual pertence a esta escola e é Diretor Geral
  try {
    const user = dbService.getCurrentUser();
    if (user && (user.escolaId === escola.id || user.role === 'AdminGeral') && 
        (user.role === 'DiretorGeral' || user.cargo?.toLowerCase().includes('diretor')) && 
        user.nomeCompleto && !isPlaceholderInvalido(user.nomeCompleto)) {
      return user.nomeCompleto.trim();
    }
  } catch (e) {
    // Ignorar se storage não disponível
  }

  return (escola.diretorGeralNome && !isPlaceholderInvalido(escola.diretorGeralNome) && escola.diretorGeralNome.trim()) || 'Director Geral da Instituição';
};

export const obterGeneroDiretorGeral = (escola?: Escola | null, funcionariosLista?: Funcionario[]): 'M' | 'F' => {
  if (!escola) return 'M';
  if (escola.diretorGeralGenero === 'F' || escola.diretorGeralGenero === 'M') {
    return escola.diretorGeralGenero;
  }

  const nome = obterNomeDiretorGeral(escola, funcionariosLista).toLowerCase();
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const dirFunc = funcs.find(f => f.nomeCompleto.toLowerCase() === nome || f.role === 'DiretorGeral');
  if (dirFunc?.genero) return dirFunc.genero;

  const primeiroNome = nome.split(' ')[0] || '';
  const nomesFemininos = ['maria', 'ana', 'isabel', 'teresa', 'helena', 'fatima', 'esperança', 'esperanca', 'joana', 'madalena', 'rosa', 'marta', 'claudia', 'carla', 'lucia', 'antonia', 'albertina', 'beatriz', 'catarina', 'dulce', 'eugenia', 'filomena', 'graca', 'graça', 'inacia', 'juliana', 'laura', 'luisa', 'manuela', 'nadia', 'olivia', 'paula', 'regina', 'sara', 'tatiana', 'vanessa', 'zita'];
  if (nomesFemininos.some(n => primeiroNome === n || primeiroNome.startsWith(n)) || (primeiroNome.endsWith('a') && !['garcia', 'sousa', 'silva', 'costa', 'batista', 'mota'].includes(primeiroNome))) {
    return 'F';
  }

  return 'M';
};

export const obterTituloDiretorGeral = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  const gen = obterGeneroDiretorGeral(escola, funcionariosLista);
  return gen === 'F' ? 'A Directora Geral da Escola' : 'O Director Geral da Escola';
};

export const obterTituloDiretorSimples = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  const gen = obterGeneroDiretorGeral(escola, funcionariosLista);
  return gen === 'F' ? 'A Directora Geral' : 'O Director Geral';
};

// =========================================================================
// 2. SUBDIRETOR(A) PEDAGÓGICO(A)
// =========================================================================

export const obterNomeSubdiretorPedagogico = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  if (!escola) return 'Subdirecção Pedagógica';

  // 1. Verificar escola.subdiretorPedagogicoNome
  if (escola.subdiretorPedagogicoNome && !isPlaceholderInvalido(escola.subdiretorPedagogicoNome)) {
    return escola.subdiretorPedagogicoNome.trim();
  }

  // 2. Buscar nos funcionários registados nesta escola por role ou cargo pedagógico
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const subFunc = funcs.find(f => 
    (f.escolaId === escola.id || escola.id === 'todas') &&
    (f.role === 'SubdiretorPedagogico' ||
     f.role === 'CoordenadorPedagogico' ||
     (f.cargo && (
       f.cargo.toLowerCase().includes('pedagóg') ||
       f.cargo.toLowerCase().includes('pedagogic') ||
       f.cargo.toLowerCase().includes('subdiretor') ||
       f.cargo.toLowerCase().includes('subdirector')
     )))
  );

  if (subFunc && subFunc.nomeCompleto && !isPlaceholderInvalido(subFunc.nomeCompleto)) {
    return subFunc.nomeCompleto.trim();
  }

  // 3. Se o utilizador autenticado atual pertence a esta escola e é Subdiretor Pedagógico
  try {
    const user = dbService.getCurrentUser();
    if (user && (user.escolaId === escola.id || user.role === 'AdminGeral') && 
        (user.role === 'SubdiretorPedagogico' || user.cargo?.toLowerCase().includes('pedagóg')) && 
        user.nomeCompleto && !isPlaceholderInvalido(user.nomeCompleto)) {
      return user.nomeCompleto.trim();
    }
  } catch (e) {
    // Ignorar
  }

  // 4. Se houver algum professor desta escola registado
  const primeiroProf = funcs.find(f => (f.escolaId === escola.id || escola.id === 'todas') && f.ehProfessor && f.nomeCompleto && !isPlaceholderInvalido(f.nomeCompleto));
  if (primeiroProf) {
    return primeiroProf.nomeCompleto.trim();
  }

  return (escola.subdiretorPedagogicoNome && !isPlaceholderInvalido(escola.subdiretorPedagogicoNome) && escola.subdiretorPedagogicoNome.trim()) || 'Responsável Pedagógico';
};

export const obterGeneroSubdiretorPedagogico = (escola?: Escola | null, funcionariosLista?: Funcionario[]): 'M' | 'F' => {
  if (!escola) return 'M';
  if ((escola as any).subdiretorPedagogicoGenero === 'F' || (escola as any).subdiretorPedagogicoGenero === 'M') {
    return (escola as any).subdiretorPedagogicoGenero;
  }

  const nome = obterNomeSubdiretorPedagogico(escola, funcionariosLista).toLowerCase();
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const func = funcs.find(f => f.nomeCompleto.toLowerCase() === nome || f.role === 'SubdiretorPedagogico');
  if (func?.genero) return func.genero;

  const primeiroNome = nome.split(' ')[0] || '';
  const nomesFemininos = ['maria', 'ana', 'isabel', 'teresa', 'helena', 'fatima', 'esperança', 'esperanca', 'joana', 'madalena', 'rosa', 'marta', 'claudia', 'carla', 'lucia', 'antonia', 'albertina', 'beatriz', 'catarina', 'dulce', 'eugenia', 'filomena', 'graca', 'graça', 'inacia', 'juliana', 'laura', 'luisa', 'manuela', 'nadia', 'olivia', 'paula', 'regina', 'sara', 'tatiana', 'vanessa', 'zita'];
  if (nomesFemininos.some(n => primeiroNome === n || primeiroNome.startsWith(n)) || (primeiroNome.endsWith('a') && !['garcia', 'sousa', 'silva', 'costa'].includes(primeiroNome))) {
    return 'F';
  }

  return 'M';
};

export const obterTituloSubdiretorPedagogico = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  const gen = obterGeneroSubdiretorPedagogico(escola, funcionariosLista);
  return gen === 'F' ? 'A Subdirectora Pedagógica' : 'O Subdirector Pedagógico';
};

// =========================================================================
// 3. CHEFE DE SECRETARIA
// =========================================================================

export const obterNomeChefeSecretaria = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  if (!escola) return 'Chefe da Secretaria';

  // 1. Verificar escola.chefeSecretariaNome
  if (escola.chefeSecretariaNome && !isPlaceholderInvalido(escola.chefeSecretariaNome)) {
    return escola.chefeSecretariaNome.trim();
  }

  // 2. Buscar nos funcionários da escola por role ou cargo de secretaria
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const secFunc = funcs.find(f => 
    (f.escolaId === escola.id || escola.id === 'todas') &&
    (f.role === 'ChefeSecretaria' ||
     f.role === 'Secretario' ||
     f.role === 'SecretarioEscolar' ||
     f.role === 'Secretaria' ||
     (f.cargo && (
       f.cargo.toLowerCase().includes('chefe de secret') ||
       f.cargo.toLowerCase().includes('chefe da secret') ||
       f.cargo.toLowerCase().includes('secretári') ||
       f.cargo.toLowerCase().includes('secretari')
     )))
  );

  if (secFunc && secFunc.nomeCompleto && !isPlaceholderInvalido(secFunc.nomeCompleto)) {
    return secFunc.nomeCompleto.trim();
  }

  // 3. Se o utilizador atual pertence a esta escola e é Chefe de Secretaria
  try {
    const user = dbService.getCurrentUser();
    if (user && (user.escolaId === escola.id || user.role === 'AdminGeral') &&
        (user.role === 'ChefeSecretaria' || user.role === 'Secretario' || user.role === 'SecretarioEscolar') &&
        user.nomeCompleto && !isPlaceholderInvalido(user.nomeCompleto)) {
      return user.nomeCompleto.trim();
    }
  } catch (e) {
    // Ignorar
  }

  return (escola.chefeSecretariaNome && !isPlaceholderInvalido(escola.chefeSecretariaNome) && escola.chefeSecretariaNome.trim()) || 'Chefe da Secretaria Geral';
};

export const obterGeneroChefeSecretaria = (escola?: Escola | null, funcionariosLista?: Funcionario[]): 'M' | 'F' => {
  if (!escola) return 'M';
  if ((escola as any).chefeSecretariaGenero === 'F' || (escola as any).chefeSecretariaGenero === 'M') {
    return (escola as any).chefeSecretariaGenero;
  }

  const nome = obterNomeChefeSecretaria(escola, funcionariosLista).toLowerCase();
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const func = funcs.find(f => f.nomeCompleto.toLowerCase() === nome || f.role === 'ChefeSecretaria');
  if (func?.genero) return func.genero;

  const primeiroNome = nome.split(' ')[0] || '';
  const nomesFemininos = ['maria', 'ana', 'isabel', 'teresa', 'helena', 'fatima', 'esperança', 'esperanca', 'joana', 'madalena', 'rosa', 'marta', 'claudia', 'carla', 'lucia', 'antonia', 'albertina', 'beatriz', 'catarina', 'dulce', 'eugenia', 'filomena', 'graca', 'graça', 'inacia', 'juliana', 'laura', 'luisa', 'manuela', 'nadia', 'olivia', 'paula', 'regina', 'sara', 'tatiana', 'vanessa', 'zita'];
  if (nomesFemininos.some(n => primeiroNome === n || primeiroNome.startsWith(n)) || (primeiroNome.endsWith('a') && !['garcia', 'sousa', 'silva', 'costa'].includes(primeiroNome))) {
    return 'F';
  }

  return 'M';
};

export const obterTituloChefeSecretaria = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  const gen = obterGeneroChefeSecretaria(escola, funcionariosLista);
  return gen === 'F' ? 'A Chefe da Secretaria' : 'O Chefe da Secretaria';
};

// =========================================================================
// 4. COORDENADOR(A) DE TURMA
// =========================================================================

export const obterNomeCoordenadorTurma = (
  turma?: Turma | null, 
  funcionariosLista?: Funcionario[],
  atribuicoes?: AtribuicaoDocente[]
): string => {
  if (!turma) return 'Coordenador de Turma';

  // 1. Verificar se a turma já possui coordenadorNome explícito e válido
  if (turma.coordenadorNome && !isPlaceholderInvalido(turma.coordenadorNome)) {
    return turma.coordenadorNome.trim();
  }
  if (turma.directorTurmaNome && !isPlaceholderInvalido(turma.directorTurmaNome)) {
    return turma.directorTurmaNome.trim();
  }

  const funcs = funcionariosLista || dbService.getFuncionarios(turma.escolaId) || [];

  // 2. Se possuir coordenadorId associado
  if (turma.coordenadorId) {
    const f = funcs.find(fn => fn.id === turma.coordenadorId);
    if (f && f.nomeCompleto && !isPlaceholderInvalido(f.nomeCompleto)) {
      return f.nomeCompleto.trim();
    }
  }

  // 3. Buscar em AtribuicoesDocentes da turma onde ehCoordenadorTurma === true
  const atribs = atribuicoes || dbService.getAtribuicoes(turma.escolaId, turma.anoLectivo) || [];
  const atribCoord = atribs.find(a => a.turmaId === turma.id && a.ehCoordenadorTurma);
  if (atribCoord) {
    const prof = funcs.find(fn => fn.id === atribCoord.professorId);
    if (prof && prof.nomeCompleto && !isPlaceholderInvalido(prof.nomeCompleto)) {
      return prof.nomeCompleto.trim();
    }
  }

  // 4. Buscar primeiro professor atribuído a esta turma
  const atribPrimeiroProf = atribs.find(a => a.turmaId === turma.id);
  if (atribPrimeiroProf) {
    const prof = funcs.find(fn => fn.id === atribPrimeiroProf.professorId);
    if (prof && prof.nomeCompleto && !isPlaceholderInvalido(prof.nomeCompleto)) {
      return prof.nomeCompleto.trim();
    }
  }

  // 5. Se houver algum funcionário com cargo de coordenador de turno ou turma
  const coordFunc = funcs.find(f => 
    f.role === 'CoordenadorTurno' || 
    (f.cargo && f.cargo.toLowerCase().includes('coordenador'))
  );
  if (coordFunc && coordFunc.nomeCompleto && !isPlaceholderInvalido(coordFunc.nomeCompleto)) {
    return coordFunc.nomeCompleto.trim();
  }

  // 6. Se houver qualquer professor na escola
  const primeiroDocente = funcs.find(f => f.ehProfessor && f.nomeCompleto && !isPlaceholderInvalido(f.nomeCompleto));
  if (primeiroDocente) {
    return primeiroDocente.nomeCompleto.trim();
  }

  return 'Coordenador de Turma';
};

export const obterGeneroCoordenadorTurma = (
  turma?: Turma | null,
  funcionariosLista?: Funcionario[],
  atribuicoes?: AtribuicaoDocente[]
): 'M' | 'F' => {
  const funcs = funcionariosLista || (turma ? dbService.getFuncionarios(turma.escolaId) : dbService.getFuncionarios()) || [];
  if (turma?.coordenadorId) {
    const f = funcs.find(fn => fn.id === turma.coordenadorId);
    if (f?.genero === 'F' || f?.genero === 'M') return f.genero;
  }
  const nome = obterNomeCoordenadorTurma(turma, funcs, atribuicoes);
  return inferirGeneroPorNomeOuParentesco(nome, undefined, undefined, funcs);
};

export const obterTituloCoordenadorTurma = (
  turma?: Turma | null,
  funcionariosLista?: Funcionario[],
  atribuicoes?: AtribuicaoDocente[]
): string => {
  const gen = obterGeneroCoordenadorTurma(turma, funcionariosLista, atribuicoes);
  return gen === 'F' ? 'A Coordenadora de Turma' : 'O Coordenador de Turma';
};

export const obterTituloDirectorTurma = (
  turma?: Turma | null,
  funcionariosLista?: Funcionario[],
  atribuicoes?: AtribuicaoDocente[]
): string => {
  const gen = obterGeneroCoordenadorTurma(turma, funcionariosLista, atribuicoes);
  return gen === 'F' ? 'A Directora de Turma' : 'O Director de Turma';
};

// =========================================================================
// 5. COORDENADOR(A) / DOCENTE DA DISCIPLINA
// =========================================================================

export const obterNomeCoordenadorDisciplina = (
  disciplinaId?: string,
  turmaId?: string,
  atribuicoes?: AtribuicaoDocente[],
  funcionariosLista?: Funcionario[],
  disciplinaNome?: string
): string => {
  const funcs = funcionariosLista || dbService.getFuncionarios() || [];
  const atribs = atribuicoes || dbService.getAtribuicoes() || [];

  // 1. Procurar nas atribuições docentes específicas para esta turma e disciplina
  if (disciplinaId && turmaId) {
    const atrib = atribs.find(a => a.turmaId === turmaId && a.disciplinaId === disciplinaId);
    if (atrib) {
      const prof = funcs.find(fn => fn.id === atrib.professorId);
      if (prof && prof.nomeCompleto && !isPlaceholderInvalido(prof.nomeCompleto)) {
        return prof.nomeCompleto.trim();
      }
    }
  }

  // 2. Procurar em qualquer atribuição desta disciplina
  if (disciplinaId) {
    const atribQualquer = atribs.find(a => a.disciplinaId === disciplinaId);
    if (atribQualquer) {
      const prof = funcs.find(fn => fn.id === atribQualquer.professorId);
      if (prof && prof.nomeCompleto && !isPlaceholderInvalido(prof.nomeCompleto)) {
        return prof.nomeCompleto.trim();
      }
    }
  }

  // 3. Procurar docente por especialidade correspondente ao nome da disciplina
  if (disciplinaNome) {
    const discNomeLimpo = disciplinaNome.toLowerCase().trim();
    const profEspecialista = funcs.find(f => 
      f.ehProfessor && f.especialidade && f.especialidade.toLowerCase().includes(discNomeLimpo)
    );
    if (profEspecialista && profEspecialista.nomeCompleto && !isPlaceholderInvalido(profEspecialista.nomeCompleto)) {
      return profEspecialista.nomeCompleto.trim();
    }
  }

  // 4. Procurar coordenador de disciplina nos funcionários
  const coordDiscFunc = funcs.find(f => 
    f.role === 'CoordenadorDisciplina' || 
    (f.cargo && f.cargo.toLowerCase().includes('disciplina'))
  );
  if (coordDiscFunc && coordDiscFunc.nomeCompleto && !isPlaceholderInvalido(coordDiscFunc.nomeCompleto)) {
    return coordDiscFunc.nomeCompleto.trim();
  }

  // 5. Se houver turmaId, buscar coordenador de turma como docente responsável
  if (turmaId) {
    const turma = dbService.getTurmas().find(t => t.id === turmaId);
    if (turma) {
      const nomeCoordTurma = obterNomeCoordenadorTurma(turma, funcs, atribs);
      if (!isPlaceholderInvalido(nomeCoordTurma)) {
        return nomeCoordTurma;
      }
    }
  }

  // 6. Buscar o primeiro professor cadastrado
  const primeiroProf = funcs.find(f => f.ehProfessor && f.nomeCompleto && !isPlaceholderInvalido(f.nomeCompleto));
  if (primeiroProf) {
    return primeiroProf.nomeCompleto.trim();
  }

  return 'Docente da Disciplina';
};

export const obterTituloCoordenadorDisciplina = (
  disciplinaId?: string,
  turmaId?: string,
  atribuicoes?: AtribuicaoDocente[],
  funcionariosLista?: Funcionario[],
  disciplinaNome?: string
): string => {
  const funcs = funcionariosLista || dbService.getFuncionarios() || [];
  const nome = obterNomeCoordenadorDisciplina(disciplinaId, turmaId, atribuicoes, funcs, disciplinaNome);
  const gen = inferirGeneroPorNomeOuParentesco(nome, undefined, undefined, funcs);
  return gen === 'F' ? 'A Coordenadora de Disciplina' : 'O Coordenador de Disciplina';
};

// =========================================================================
// 6. MEMBROS DA COMISSÃO DE JÚRI
// =========================================================================

export const obterPresidenteJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  if (!comissao) return 'Presidente do Júri';

  const funcs = funcionariosLista || dbService.getFuncionarios(comissao.escolaId) || [];

  // 1. Procurar membro com função Presidente
  const membroPres = comissao.membros?.find(m => m.funcao === 'Presidente');
  if (membroPres && membroPres.nome && !isPlaceholderInvalido(membroPres.nome)) {
    return membroPres.nome.trim();
  }

  // 2. Se tiver presidenteId ou presidenteJuriId
  const presId = comissao.presidenteId || comissao.presidenteJuriId;
  if (presId) {
    const f = funcs.find(fn => fn.id === presId);
    if (f && f.nomeCompleto && !isPlaceholderInvalido(f.nomeCompleto)) {
      return f.nomeCompleto.trim();
    }
  }

  // 3. Fallback para Subdirector Pedagógico ou primeiro docente
  const escola = dbService.getEscolaPorId(comissao.escolaId);
  return obterNomeSubdiretorPedagogico(escola, funcs);
};

export const obterSecretarioJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  if (!comissao) return 'Secretário do Júri';

  const funcs = funcionariosLista || dbService.getFuncionarios(comissao.escolaId) || [];

  // 1. Procurar membro com função Secretário
  const membroSec = comissao.membros?.find(m => (m.funcao as string) === 'Secretario' || (m.funcao as string) === 'Secretário');
  if (membroSec && membroSec.nome && !isPlaceholderInvalido(membroSec.nome)) {
    return membroSec.nome.trim();
  }

  // 2. Se tiver secretarioId
  if (comissao.secretarioId) {
    const f = funcs.find(fn => fn.id === comissao.secretarioId);
    if (f && f.nomeCompleto && !isPlaceholderInvalido(f.nomeCompleto)) {
      return f.nomeCompleto.trim();
    }
  }

  // 3. Fallback para Chefe de Secretaria ou docente
  const escola = dbService.getEscolaPorId(comissao.escolaId);
  return obterNomeChefeSecretaria(escola, funcs);
};

export const obterVogaisJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): { primeiroVogal: string; segundoVogal: string } => {
  const funcs = funcionariosLista || (comissao ? dbService.getFuncionarios(comissao.escolaId) : dbService.getFuncionarios()) || [];
  
  if (comissao) {
    let pVogal = '';
    let sVogal = '';

    // 1. Verificar IDs diretos vogal1Id e vogal2Id
    if (comissao.vogal1Id) {
      const f1 = funcs.find(f => f.id === comissao.vogal1Id);
      if (f1?.nomeCompleto && !isPlaceholderInvalido(f1.nomeCompleto)) {
        pVogal = f1.nomeCompleto.trim();
      }
    }
    if (comissao.vogal2Id) {
      const f2 = funcs.find(f => f.id === comissao.vogal2Id);
      if (f2?.nomeCompleto && !isPlaceholderInvalido(f2.nomeCompleto)) {
        sVogal = f2.nomeCompleto.trim();
      }
    }

    // 2. Verificar membros da comissão estruturados
    if (comissao.membros && comissao.membros.length > 0) {
      const v1 = comissao.membros.find(m => ((m.funcao as string) === '1º Vogal' || (m.funcao as string) === '1° Vogal') && m.nome && !isPlaceholderInvalido(m.nome));
      const v2 = comissao.membros.find(m => ((m.funcao as string) === '2º Vogal' || (m.funcao as string) === '2° Vogal') && m.nome && !isPlaceholderInvalido(m.nome));
      if (v1 && !pVogal) pVogal = v1.nome.trim();
      if (v2 && !sVogal) sVogal = v2.nome.trim();

      // Membros genéricos marcados como Vogal ou Membro
      const outrosVogais = comissao.membros.filter(m => 
        ((m.funcao as string) === 'Vogal' || (m.funcao as string) === 'Membro') && 
        m.nome && 
        !isPlaceholderInvalido(m.nome) &&
        m.nome.trim() !== pVogal &&
        m.nome.trim() !== sVogal
      );

      if (!pVogal && outrosVogais.length > 0) pVogal = outrosVogais[0].nome.trim();
      if (!sVogal && outrosVogais.length > 1) sVogal = outrosVogais[1].nome.trim();
    }

    if (pVogal && sVogal) {
      return { primeiroVogal: pVogal, segundoVogal: sVogal };
    }
    if (pVogal && !sVogal) {
      const suplente = funcs.find(f => f.ehProfessor && f.nomeCompleto?.trim() !== pVogal && !isPlaceholderInvalido(f.nomeCompleto));
      return { primeiroVogal: pVogal, segundoVogal: suplente?.nomeCompleto?.trim() || '2º Vogal do Júri' };
    }
  }

  // Fallback para docentes da escola
  const profs = funcs.filter(f => f.ehProfessor && !isPlaceholderInvalido(f.nomeCompleto));
  return {
    primeiroVogal: profs[0]?.nomeCompleto?.trim() || '1º Vogal do Júri',
    segundoVogal: profs[1]?.nomeCompleto?.trim() || '2º Vogal do Júri'
  };
};

export const obterPrimeiroVogalJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  return obterVogaisJuri(comissao, funcionariosLista).primeiroVogal;
};

export const obterSegundoVogalJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  return obterVogaisJuri(comissao, funcionariosLista).segundoVogal;
};

export const obterTituloPresidenteJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  const funcs = funcionariosLista || (comissao ? dbService.getFuncionarios(comissao.escolaId) : dbService.getFuncionarios()) || [];
  const presId = comissao?.presidenteId || comissao?.presidenteJuriId || comissao?.membros?.find(m => m.funcao === 'Presidente')?.usuarioId;
  const func = presId ? funcs.find(f => f.id === presId) : undefined;
  const nome = obterPresidenteJuri(comissao, funcs);
  const gen = inferirGeneroPorNomeOuParentesco(nome, undefined, func?.genero, funcs);
  return gen === 'F' ? 'A Presidente do Júri' : 'O Presidente do Júri';
};

export const obterTituloSecretarioJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  const funcs = funcionariosLista || (comissao ? dbService.getFuncionarios(comissao.escolaId) : dbService.getFuncionarios()) || [];
  const secId = comissao?.secretarioId || comissao?.membros?.find(m => (m.funcao as string) === 'Secretario' || (m.funcao as string) === 'Secretário')?.usuarioId;
  const func = secId ? funcs.find(f => f.id === secId) : undefined;
  const nome = obterSecretarioJuri(comissao, funcs);
  const gen = inferirGeneroPorNomeOuParentesco(nome, undefined, func?.genero, funcs);
  return gen === 'F' ? 'A Secretária do Júri' : 'O Secretário do Júri';
};

export const obterTituloPrimeiroVogalJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  const funcs = funcionariosLista || (comissao ? dbService.getFuncionarios(comissao.escolaId) : dbService.getFuncionarios()) || [];
  const v1Id = comissao?.vogal1Id || comissao?.membros?.find(m => (m.funcao as string) === '1º Vogal' || (m.funcao as string) === '1° Vogal')?.usuarioId;
  const func = v1Id ? funcs.find(f => f.id === v1Id) : undefined;
  const nome = obterPrimeiroVogalJuri(comissao, funcs);
  const gen = inferirGeneroPorNomeOuParentesco(nome, undefined, func?.genero, funcs);
  return gen === 'F' ? 'A 1ª Vogal do Júri' : 'O 1º Vogal do Júri';
};

export const obterTituloSegundoVogalJuri = (comissao?: ComissaoJuri | null, funcionariosLista?: Funcionario[]): string => {
  const funcs = funcionariosLista || (comissao ? dbService.getFuncionarios(comissao.escolaId) : dbService.getFuncionarios()) || [];
  const v2Id = comissao?.vogal2Id || comissao?.membros?.find(m => (m.funcao as string) === '2º Vogal' || (m.funcao as string) === '2° Vogal')?.usuarioId;
  const func = v2Id ? funcs.find(f => f.id === v2Id) : undefined;
  const nome = obterSegundoVogalJuri(comissao, funcs);
  const gen = inferirGeneroPorNomeOuParentesco(nome, undefined, func?.genero, funcs);
  return gen === 'F' ? 'A 2ª Vogal do Júri' : 'O 2º Vogal do Júri';
};

// =========================================================================
// 7. SUBDIRETOR ADMINISTRATIVO, PROFESSORES, FUNCIONÁRIOS, ENCARREGADOS & ALUNOS
// =========================================================================

export const obterNomeSubdiretorAdministrativo = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  if (!escola) return 'Subdirecção Administrativa';
  if ((escola as any).subdiretorAdministrativoNome && !isPlaceholderInvalido((escola as any).subdiretorAdministrativoNome)) {
    return (escola as any).subdiretorAdministrativoNome.trim();
  }
  const funcs = funcionariosLista || dbService.getFuncionarios(escola.id) || [];
  const subAdmin = funcs.find(f =>
    (f.escolaId === escola.id || escola.id === 'todas') &&
    (f.role === 'SubdiretorAdministrativo' ||
      f.role === 'SubdirectorAdministrativo' ||
      (f.cargo && (f.cargo.toLowerCase().includes('administrativ') && (f.cargo.toLowerCase().includes('subdire') || f.cargo.toLowerCase().includes('coord')))))
  );
  if (subAdmin?.nomeCompleto && !isPlaceholderInvalido(subAdmin.nomeCompleto)) {
    return subAdmin.nomeCompleto.trim();
  }
  return 'Responsável Administrativo';
};

export const obterTituloSubdiretorAdministrativo = (escola?: Escola | null, funcionariosLista?: Funcionario[]): string => {
  const funcs = funcionariosLista || (escola ? dbService.getFuncionarios(escola.id) : dbService.getFuncionarios()) || [];
  const subAdmin = funcs.find(f =>
    (!escola || f.escolaId === escola.id || escola.id === 'todas') &&
    (f.role === 'SubdiretorAdministrativo' || f.role === 'SubdirectorAdministrativo')
  );
  const nome = obterNomeSubdiretorAdministrativo(escola, funcs);
  const gen = inferirGeneroPorNomeOuParentesco(nome, undefined, subAdmin?.genero, funcs);
  return gen === 'F' ? 'A Subdirectora Administrativa' : 'O Subdirector Administrativo';
};

export const obterTituloCoordenadorTurno = (
  turno?: string,
  funcionariosLista?: Funcionario[],
  escola?: Escola | null
): string => {
  const funcs = funcionariosLista || (escola ? dbService.getFuncionarios(escola.id) : dbService.getFuncionarios()) || [];
  const coordTurno = funcs.find(f =>
    f.role === 'CoordenadorTurno' &&
    (!turno || (f.cargo || '').toLowerCase().includes(turno.toLowerCase()))
  ) || funcs.find(f => f.role === 'CoordenadorTurno');
  const gen = coordTurno
    ? inferirGeneroPorNomeOuParentesco(coordTurno.nomeCompleto, undefined, coordTurno.genero, funcs)
    : 'M';
  return gen === 'F' ? 'A Coordenadora de Turno' : 'O Coordenador de Turno';
};

export const obterTituloFuncionario = (func?: Partial<Funcionario> | null, funcionariosLista?: Funcionario[]): string => {
  const gen = inferirGeneroPorNomeOuParentesco(func?.nomeCompleto, undefined, func?.genero, funcionariosLista);
  return gen === 'F' ? 'A Funcionária' : 'O Funcionário';
};

export const obterTituloProfessor = (func?: Partial<Funcionario> | null, nomeFallback?: string, funcionariosLista?: Funcionario[]): string => {
  const gen = inferirGeneroPorNomeOuParentesco(func?.nomeCompleto || nomeFallback, undefined, func?.genero, funcionariosLista);
  return gen === 'F' ? 'A Professora' : 'O Professor';
};

export const obterTituloEncarregado = (parentesco?: string | null, nomeEncarregado?: string | null): string => {
  const gen = inferirGeneroPorNomeOuParentesco(nomeEncarregado, parentesco);
  return gen === 'F' ? 'A Encarregada de Educação' : 'O Encarregado de Educação';
};

export const obterSituacaoTextoPorGenero = (
  textoBase: string,
  genero?: 'M' | 'F' | string | null
): string => {
  const ehFem = String(genero || '').toUpperCase() === 'F';
  if (!ehFem || !textoBase) return textoBase;
  return textoBase
    .replace(/\bAprovado Directo\b/g, 'Aprovada Directa')
    .replace(/\bAprovado Direto\b/g, 'Aprovada Direta')
    .replace(/\bNão Aprovado\b/g, 'Não Aprovada')
    .replace(/\bAprovado\b/g, 'Aprovada')
    .replace(/\bReprovado\b/g, 'Reprovada')
    .replace(/\bApto a Recurso\b/g, 'Apta a Recurso')
    .replace(/\bTransferido\b/g, 'Transferida')
    .replace(/\bMatriculado\b/g, 'Matriculada');
};



