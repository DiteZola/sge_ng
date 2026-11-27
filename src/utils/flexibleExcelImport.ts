import { NivelEnsino, UserRole } from '../types';

export type TipoFolhaExcelImport =
  | 'Alunos'
  | 'Turmas'
  | 'Disciplinas'
  | 'Funcionarios'
  | 'Notas'
  | 'AnoLectivo'
  | 'Desconhecido';

export interface MetadadosFolhaDetectados {
  escolaDetectada?: string;
  anoLectivoDetectado?: string;
  turmaDetectada?: string;
  classeDetectada?: string;
}

export interface FolhaExcelAnalisada {
  sheetName: string;
  tipoDetectado: TipoFolhaExcelImport;
  headerRowIndex: number;
  headers: string[];
  rows: Record<string, any>[];
  metadados: MetadadosFolhaDetectados;
}

export function normalizarTextoComparacao(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizarChaveCompacta(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function converterValorDataExcel(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number' && Number.isFinite(val) && val > 15000 && val < 90000) {
    // Serial date Excel (base 1899-12-30)
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase() === 'n/a') return '';
  // ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }
  return str;
}

export function converterNumeroNotaExcel(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return undefined;
    return Math.min(20, Math.max(0, Math.round(val * 10) / 10));
  }
  const s = String(val).trim().replace(',', '.');
  if (!s || s === '—' || s === '-' || s.toLowerCase() === 'n/a') return undefined;
  const num = Number(s);
  if (!Number.isFinite(num)) return undefined;
  return Math.min(20, Math.max(0, Math.round(num * 10) / 10));
}

export function normalizarClasseImportacao(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s || s === '—') return '';
  const norm = normalizarTextoComparacao(s);
  if (norm.includes('iniciacao') || norm === '0' || norm === 'pre') return 'Iniciação';
  const m = norm.match(/\b(1[0-3]|[1-9])\b/);
  if (m) return `${m[1]}ª`;
  return s;
}

export function inferirNivelEnsinoPorClasse(classe: string): NivelEnsino {
  const norm = normalizarTextoComparacao(classe);
  if (norm.includes('iniciacao')) return 'Iniciacao';
  const num = parseInt(norm.match(/\d+/)?.[0] || '1', 10);
  if (num <= 6) return 'Primario';
  if (num <= 9) return 'ICiclo';
  if (num === 13) return 'EnsinoTecnico';
  return 'IICiclo';
}

export function normalizarTurnoImportacao(raw: unknown): 'Manhã' | 'Tarde' | 'Noite' {
  const norm = normalizarTextoComparacao(raw);
  if (norm.includes('tarde') || norm === 't' || norm.includes('vespert')) return 'Tarde';
  if (norm.includes('noite') || norm.includes('noturn') || norm === 'n') return 'Noite';
  return 'Manhã';
}

export function normalizarGeneroImportacao(raw: unknown): 'M' | 'F' {
  const norm = normalizarTextoComparacao(raw);
  if (norm.startsWith('f') || norm.includes('fem') || norm.includes('mulher')) return 'F';
  return 'M';
}

export function normalizarAnoLectivoImportacao(raw: unknown, fallbackAno?: string): string {
  const str = String(raw ?? '').trim();
  if (!str || str === '—') return fallbackAno || '';
  const m = str.match(/(20\d{2})\s*[-/]\s*(20\d{2})/);
  if (m) return `${m[1]}/${m[2]}`;
  const singleYear = str.match(/^(20\d{2})$/);
  if (singleYear) {
    const y = parseInt(singleYear[1], 10);
    return `${y}/${y + 1}`;
  }
  return str;
}

export function normalizarRoleImportacao(rawRole: unknown, rawCargo?: unknown): UserRole {
  const normRole = normalizarTextoComparacao(rawRole);
  const normCargo = normalizarTextoComparacao(rawCargo);
  const combined = `${normRole} ${normCargo}`;

  if (combined.includes('auxiliar') || combined.includes('limpeza') || combined.includes('servente') || combined.includes('faxina')) {
    return 'AuxiliarLimpeza';
  }
  if (combined.includes('diretor geral') || combined.includes('director geral') || normRole === 'diretorgeral') {
    return 'DiretorGeral';
  }
  if (combined.includes('pedagogic') && combined.includes('sub')) return 'SubdiretorPedagogico';
  if (combined.includes('administrativ') && combined.includes('sub')) return 'SubdiretorAdministrativo';
  if (combined.includes('coordenador') && combined.includes('pedagog')) return 'CoordenadorPedagogico';
  if (combined.includes('coordenador') && combined.includes('turno')) return 'CoordenadorTurno';
  if (combined.includes('coordenador') && combined.includes('disciplina')) return 'CoordenadorDisciplina';
  if (combined.includes('chefe') && combined.includes('secret')) return 'ChefeSecretaria';
  if (combined.includes('secretario escolar')) return 'SecretarioEscolar';
  if (combined.includes('secretari')) return 'Secretaria';
  if (combined.includes('tesour')) return 'Tesoureiro';
  if (combined.includes('bibliotec')) return 'Bibliotecario';
  if (combined.includes('estagiari')) return 'Estagiario';
  if (combined.includes('informatica') || normRole === 'tecnicoti' || combined.includes('tecnico de ti')) return 'TecnicoTI';
  if (combined.includes('encarregad') || combined.includes('tutor')) return 'Encarregado';
  if (combined.includes('prof') || combined.includes('docent')) return 'Professor';
  return 'Professor';
}

const PALAVRAS_CABECALHO_CONHECIDAS = new Set([
  'nome', 'nomecompleto', 'estudante', 'aluno', 'aluna', 'funcionario', 'professor', 'docente',
  'bi', 'bilhete', 'bilheteidentidade', 'ndebi', 'ndebicédula', 'numerobi', 'documento',
  'matricula', 'codigomatricula', 'nprocesso', 'numeroprocesso', 'processo',
  'turma', 'classe', 'curso', 'turno', 'periodo', 'sala', 'anolectivo', 'anoletivo',
  'disciplina', 'nota', 'mac', 'npp', 'npt', 'pt', 'mt', 'mt1', 'mt2', 'mt3', 'mdf', 'mf', 'ne',
  'cargo', 'funcao', 'role', 'papel', 'agente', 'nagente', 'numeroagente', 'telefone', 'email',
  'genero', 'sexo', 'datanascimento', 'nascimento', 'idade', 'encarregado', 'escola', 'instituicao'
]);

export function obterCampoFlexivel(row: Record<string, any>, aliases: string[]): string {
  if (!row || typeof row !== 'object') return '';
  const entries = Object.entries(row);

  // 1. Exact key match (case-sensitive, then case-insensitive)
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '' && String(row[alias]).trim() !== '—') {
      return String(row[alias]).trim();
    }
  }

  // 2. Normalized compact key match (ignores accents, spaces, symbols)
  const entryMap = new Map<string, string>();
  for (const [k, v] of entries) {
    if (v === null || v === undefined) continue;
    const str = String(v).trim();
    if (!str || str === '—') continue;
    const comp = normalizarChaveCompacta(k);
    if (comp && !entryMap.has(comp)) {
      entryMap.set(comp, str);
    }
  }

  for (const alias of aliases) {
    const compAlias = normalizarChaveCompacta(alias);
    if (compAlias && entryMap.has(compAlias)) {
      return entryMap.get(compAlias)!;
    }
  }

  // 3. Partial containment match for longer descriptive aliases (len >= 5)
  for (const alias of aliases) {
    const compAlias = normalizarChaveCompacta(alias);
    if (compAlias.length < 5) continue;
    for (const [compKey, val] of entryMap.entries()) {
      if (compKey.includes(compAlias) || compAlias.includes(compKey)) {
        return val;
      }
    }
  }

  return '';
}

export function obterCampoBrutoFlexivel(row: Record<string, any>, aliases: string[]): unknown {
  if (!row || typeof row !== 'object') return undefined;
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '' && String(row[alias]).trim() !== '—') {
      return row[alias];
    }
  }
  const normalizedAliases = aliases.map(normalizarChaveCompacta).filter(Boolean);
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null || String(v).trim() === '' || String(v).trim() === '—') continue;
    const ck = normalizarChaveCompacta(k);
    if (normalizedAliases.includes(ck)) return v;
  }
  return undefined;
}

export function extrairLinhasComCabecalhoAutomatico(XLSX: any, ws: any): {
  headerRowIndex: number;
  headers: string[];
  rows: Record<string, any>[];
  metadados: MetadadosFolhaDetectados;
} {
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) || [];
  if (!Array.isArray(aoa) || aoa.length === 0) {
    return { headerRowIndex: 0, headers: [], rows: [], metadados: {} };
  }

  let bestRowIdx = 0;
  let bestScore = -1;
  const maxScan = Math.min(15, aoa.length);

  for (let r = 0; r < maxScan; r++) {
    const rowCells = Array.isArray(aoa[r]) ? aoa[r] : [];
    const nonEmpty = rowCells.map(c => String(c ?? '').trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    let knownMatches = 0;
    let stringCells = 0;
    for (const cell of nonEmpty) {
      if (isNaN(Number(cell))) stringCells++;
      const comp = normalizarChaveCompacta(cell);
      if (PALAVRAS_CABECALHO_CONHECIDAS.has(comp)) {
        knownMatches += 3;
      } else {
        for (const kw of PALAVRAS_CABECALHO_CONHECIDAS) {
          if (kw.length >= 4 && comp.includes(kw)) {
            knownMatches += 1.5;
            break;
          }
        }
      }
    }

    const score = knownMatches * 4 + nonEmpty.length + (stringCells === nonEmpty.length ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestRowIdx = r;
    }
  }

  const metadados: MetadadosFolhaDetectados = {};
  for (let r = 0; r < bestRowIdx; r++) {
    const lineText = (aoa[r] || []).map(c => String(c ?? '').trim()).filter(Boolean).join(' | ');
    if (!lineText) continue;
    const anoMatch = lineText.match(/(20\d{2})\s*[-/]\s*(20\d{2})/);
    if (anoMatch && !metadados.anoLectivoDetectado) {
      metadados.anoLectivoDetectado = `${anoMatch[1]}/${anoMatch[2]}`;
    }
    const norm = normalizarTextoComparacao(lineText);
    if ((norm.includes('escola') || norm.includes('complexo') || norm.includes('liceu') || norm.includes('colegio') || norm.includes('instituto')) && !metadados.escolaDetectada) {
      metadados.escolaDetectada = lineText.replace(/^.*?(escola|instituicao)\s*:\s*/i, '').trim();
    }
    const turmaMatch = lineText.match(/turma\s*:\s*([^|•]+)/i);
    if (turmaMatch && !metadados.turmaDetectada) {
      metadados.turmaDetectada = turmaMatch[1].trim();
    }
    const classeMatch = lineText.match(/classe\s*:\s*([^|•]+)/i);
    if (classeMatch && !metadados.classeDetectada) {
      metadados.classeDetectada = normalizarClasseImportacao(classeMatch[1]);
    }
  }

  const rawHeaderRow = Array.isArray(aoa[bestRowIdx]) ? aoa[bestRowIdx] : [];
  const headers: string[] = [];
  const seenCount = new Map<string, number>();

  for (let c = 0; c < rawHeaderRow.length; c++) {
    let h = String(rawHeaderRow[c] ?? '').trim();
    if (!h) h = `Coluna_${c + 1}`;
    const prev = seenCount.get(h) || 0;
    seenCount.set(h, prev + 1);
    if (prev > 0) h = `${h}_${prev + 1}`;
    headers.push(h);
  }

  const rows: Record<string, any>[] = [];
  for (let r = bestRowIdx + 1; r < aoa.length; r++) {
    const line = Array.isArray(aoa[r]) ? aoa[r] : [];
    const hasAnyValue = line.some(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (!hasAnyValue) continue;
    const obj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < line.length ? line[c] : '';
    }
    rows.push(obj);
  }

  // Também tentar extrair ano/escola da primeira linha de dados se estiver explícito
  if (rows.length > 0) {
    if (!metadados.escolaDetectada) {
      const esc = obterCampoFlexivel(rows[0], ['Instituição Escolar', 'Escola', 'Nome Escola', 'Instituicao', 'escolaOrigem']);
      if (esc) metadados.escolaDetectada = esc;
    }
    if (!metadados.anoLectivoDetectado) {
      const ano = obterCampoFlexivel(rows[0], ['Ano Lectivo', 'Ano Letivo', 'AnoLectivo', 'Ano']);
      if (ano) metadados.anoLectivoDetectado = normalizarAnoLectivoImportacao(ano);
    }
  }

  return { headerRowIndex: bestRowIdx, headers, rows, metadados };
}

export function classificarFolhaExcel(sheetName: string, headers: string[]): TipoFolhaExcelImport {
  const sNorm = normalizarTextoComparacao(sheetName);
  const hSet = new Set(headers.map(normalizarChaveCompacta));
  const hJoined = headers.map(normalizarTextoComparacao).join(' ');

  if (sNorm.includes('instituicao') || sNorm.includes('resumo') || sNorm.includes('caixa') || sNorm.includes('patrimonio') || sNorm.includes('plano de ativ')) {
    // Folhas puramente informativas/financeiras que podem ser ignoradas por padrão na importação escolar, exceto se tiverem ano letivo
    if (hJoined.includes('ano lectivo') && !hJoined.includes('nome completo')) return 'Desconhecido';
  }

  if (sNorm.includes('pauta') || sNorm.includes('nota') || sNorm.includes('aproveitamento') || sNorm.includes('avaliac')) {
    return 'Notas';
  }
  if (sNorm.includes('func') || sNorm.includes('docent') || sNorm.includes('rh') || sNorm.includes('pessoal') || sNorm.includes('colaborador') || sNorm.includes('professor')) {
    return 'Funcionarios';
  }
  if (sNorm.includes('turma')) return 'Turmas';
  if (sNorm.includes('disciplin') || sNorm.includes('curricul')) return 'Disciplinas';
  if (sNorm.includes('ano') && sNorm.includes('lect')) return 'AnoLectivo';
  if (sNorm.includes('alun') || sNorm.includes('estudant') || sNorm.includes('matricul')) return 'Alunos';

  // Classificação pelos cabeçalhos quando o nome da aba é genérico (ex: Folha1, Sheet1, Dados)
  const temNotaCols =
    (hSet.has('mac') || hSet.has('npt') || hSet.has('npp') || hSet.has('mt1') || hSet.has('mf') || hJoined.includes('media trimestral') || hJoined.includes('media final')) &&
    (hJoined.includes('disciplina') || hJoined.includes('estudante') || hJoined.includes('aluno'));
  if (temNotaCols && hJoined.includes('disciplina') && !hJoined.includes('data de nascimento')) {
    return 'Notas';
  }

  const temColsFuncionario =
    hJoined.includes('cargo') || hJoined.includes('numero de agente') || hJoined.includes('n de agente') || hJoined.includes('categoria profissional') || hJoined.includes('papel no sistema') || hJoined.includes('iban');
  if (temColsFuncionario && (hJoined.includes('nome') || hJoined.includes('funcionario'))) {
    return 'Funcionarios';
  }

  const temColsAluno =
    hJoined.includes('encarregado') || hJoined.includes('matricula') || hJoined.includes('processo') || hJoined.includes('data de nascimento') || hJoined.includes('filiacao') || (hJoined.includes('nome') && (hJoined.includes('turma') || hJoined.includes('classe')));
  if (temColsAluno) {
    return 'Alunos';
  }

  if ((hSet.has('nome') || hSet.has('nomedaturma') || hSet.has('turma')) && hSet.has('classe') && !hJoined.includes('aluno') && !hJoined.includes('estudante')) {
    return 'Turmas';
  }

  if ((hSet.has('disciplina') || hSet.has('nome')) && (hSet.has('cargahoraria') || hSet.has('codigo')) && !hJoined.includes('aluno')) {
    return 'Disciplinas';
  }

  if (hSet.has('rotulo') || hJoined.includes('data inicio')) {
    return 'AnoLectivo';
  }

  return 'Desconhecido';
}

export const ALIASES_ALUNO = {
  id: ['ID', 'id', 'AlunoID', 'ID Aluno'],
  codigoMatricula: ['CodigoMatricula', 'codigoMatricula', 'Código Matrícula', 'Nº de Processo / Matrícula', 'Nº Processo', 'Numero Processo', 'Processo', 'Matricula', 'Matrícula', 'N.º Processo'],
  numeroOrdem: ['NumeroOrdem', 'numeroOrdem', 'Nº de Ordem', 'Nº Ordem', 'Ordem', 'Nº'],
  nomeCompleto: ['NomeCompleto', 'nomeCompleto', 'Nome Completo', 'Nome do Estudante', 'Nome do Aluno', 'Estudante', 'Aluno', 'Aluna', 'Nome'],
  genero: ['Genero', 'genero', 'Gênero', 'Sexo', 'M/F'],
  dataNascimento: ['DataNascimento', 'dataNascimento', 'Data de Nascimento', 'Data Nascimento', 'Nascimento', 'DN'],
  naturalidade: ['Naturalidade', 'naturalidade'],
  provinciaOrigem: ['ProvinciaOrigem', 'provinciaOrigem', 'Província de Origem', 'Província', 'Provincia'],
  municipioNascimento: ['Municipio', 'municipio', 'Município de Residência', 'MunicipioNascimento'],
  residencia: ['Endereco', 'endereco', 'Endereço Residencial', 'Endereço / Residência', 'Residencia', 'Residência', 'Bairro', 'Morada'],
  numeroBI: ['NumeroBI', 'numeroBI', 'BI', 'Bilhete de Identidade / Cédula', 'BI / Cédula', 'Bilhete de Identidade', 'Documento', 'Cédula', 'Cedula'],
  telefone: ['Telefone', 'telefone', 'Contacto', 'Telemóvel', 'Celular'],
  nomePai: ['NomePai', 'nomePai', 'Filiação - Pai', 'Pai', 'Nome do Pai'],
  nomeMae: ['NomeMae', 'nomeMae', 'Filiação - Mãe', 'Mãe', 'Nome da Mãe'],
  encarregadoNome: ['EncarregadoNome', 'encarregadoNome', 'Encarregado de Educação', 'Encarregado', 'Nome Encarregado', 'Tutor'],
  encarregadoTelefone: ['EncarregadoTelefone', 'encarregadoTelefone', 'Telefone Encarregado', 'Telefone Aluno/Encarregado', 'Contacto Encarregado'],
  encarregadoEmail: ['EncarregadoEmail', 'encarregadoEmail', 'Email Encarregado'],
  turmaNome: ['Turma', 'turma', 'TurmaNome', 'TurmaID', 'turmaId', 'Designação Turma'],
  classe: ['Classe', 'classe', 'ClasseID', 'classeId', 'Ano Escolar'],
  curso: ['Curso / Área', 'Curso', 'curso', 'Especialidade', 'Área de Formação'],
  turno: ['Turno / Período', 'Turno', 'turno', 'Período', 'Periodo'],
  sala: ['Sala de Aula', 'Sala', 'sala'],
  anoLectivo: ['Ano Lectivo', 'Ano Letivo', 'AnoLectivo', 'anoLectivo', 'Ano'],
  estado: ['Estado da Matrícula', 'Estado', 'estado', 'Situação'],
  escolaOrigem: ['Instituição Escolar', 'Escola de Origem', 'Escola', 'escolaOrigem', 'Instituicao']
};

export const ALIASES_FUNCIONARIO = {
  id: ['ID Funcionário', 'ID', 'id'],
  nomeCompleto: ['Nome Completo', 'NomeCompleto', 'nomeCompleto', 'Funcionário', 'Professor', 'Nome'],
  genero: ['Gênero', 'Genero', 'genero', 'Sexo'],
  dataNascimento: ['Data de Nascimento', 'Data Nascimento', 'DataNascimento', 'dataNascimento'],
  numeroBI: ['Nº Bilhete de Identidade (BI)', 'BI', 'NumeroBI', 'numeroBI', 'Bilhete de Identidade'],
  numeroAgente: ['Nº de Agente do Estado', 'Nº de Agente', 'NumeroAgente', 'numeroAgente', 'Nº Agente', 'Agente', 'Mecanográfico', 'Número Mecanográfico'],
  nif: ['NIF', 'nif'],
  cargo: ['Cargo / Função', 'Cargo', 'cargo', 'Função', 'Funcao'],
  role: ['Papel no Sistema (Role)', 'Papel no Sistema', 'Role', 'role', 'Perfil'],
  departamento: ['Departamento / Setor', 'Departamento', 'departamento', 'Setor'],
  categoriaProfissional: ['Categoria Profissional MED', 'Categoria Profissional', 'categoriaProfissional'],
  tipoContrato: ['Tipo de Contrato', 'tipoContrato', 'Contrato'],
  situacaoFuncional: ['Situação Funcional', 'situacaoFuncional', 'Estado'],
  dataAdmissao: ['Data de Admissão', 'dataAdmissao', 'Admissão'],
  habilitacoes: ['Formação Académica Principal', 'Formação Académica', 'Habilitacoes', 'habilitacoes', 'Grau Académico'],
  especialidade: ['Especialidade / Curso', 'Especialidade', 'especialidade'],
  telefone: ['Telefone Principal', 'Telefone', 'telefone', 'Contacto'],
  email: ['Email Institucional', 'Email', 'email', 'E-mail'],
  iban: ['IBAN / Conta Bancária', 'IBAN', 'iban'],
  banco: ['Banco', 'banco'],
  ehProfessor: ['É Professor', 'Professor', 'ehProfessor', 'Leciona'],
  escolaOrigem: ['Instituição Escolar', 'Escola', 'escolaOrigem']
};

export const ALIASES_NOTA = {
  alunoId: ['AlunoID', 'alunoId', 'ID Aluno'],
  codigoMatricula: ['Nº Processo', 'Nº de Processo / Matrícula', 'CodigoMatricula', 'codigoMatricula', 'Processo', 'Matricula'],
  alunoNome: ['Nome do Estudante', 'Nome Completo', 'Estudante', 'Aluno', 'Nome', 'alunoNome'],
  numeroBI: ['BI / Cédula', 'BI', 'NumeroBI', 'numeroBI'],
  turmaNome: ['Turma', 'turma', 'TurmaNome'],
  classe: ['Classe', 'classe', 'ClasseID'],
  disciplinaNome: ['Disciplina', 'disciplina', 'DisciplinaNome', 'Cadeira', 'Matéria'],
  anoLectivo: ['Ano Lectivo', 'Ano Letivo', 'AnoLectivo', 'anoLectivo'],
  trimestre: ['Trimestre', 'trimestre', 'Período'],
  mac: ['MAC', 'mac'],
  npp: ['NPP', 'npp', 'Prova Professor'],
  npt: ['NPT', 'PT', 'npt', 'Prova Trimestral'],
  mt: ['MT', 'mt', 'MediaTrimestral', 'mediaTrimestral', 'Média Trimestral'],
  mt1: ['1T - MT', 'MT1', '1º Tri - Média Trimestral (MT1)', 'Media 1T'],
  mac1: ['1T - MAC', 'MAC1', '1º Tri - MAC'],
  npp1: ['1T - NPP', 'NPP1', '1º Tri - Prova Professor (NPP)'],
  npt1: ['1T - PT', 'NPT1', 'PT1', '1º Tri - Prova Trimestral (NPT)'],
  mt2: ['2T - MT', 'MT2', '2º Tri - Média Trimestral (MT2)', 'Media 2T'],
  mac2: ['2T - MAC', 'MAC2', '2º Tri - MAC'],
  npp2: ['2T - NPP', 'NPP2', '2º Tri - Prova Professor (NPP)'],
  npt2: ['2T - PT', 'NPT2', 'PT2', '2º Tri - Prova Trimestral (NPT)'],
  mt3: ['3T - MT', 'MT3', '3º Tri - Média Trimestral (MT3)', 'Media 3T'],
  mac3: ['3T - MAC', 'MAC3', '3º Tri - MAC'],
  npp3: ['3T - NPP', 'NPP3', '3º Tri - Prova Professor (NPP)'],
  npt3: ['3T - PT', 'NPT3', 'PT3', '3º Tri - Prova Trimestral (NPT)'],
  ne: ['NE (Exame)', 'NE', 'Nota de Exame', 'Nota de Exame Nacional (NE)', 'Exame'],
  mf: ['MF (Final)', 'MF', 'Média Final', 'MÉDIA FINAL DEFINITIVA (MF)', 'Nota Final']
};
