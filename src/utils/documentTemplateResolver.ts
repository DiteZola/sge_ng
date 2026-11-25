import {
  Aluno,
  ConfiguracaoCamposDocumento,
  ConfiguracaoDocumentoCustomizado,
  Escola,
  Funcionario,
  Turma
} from '../types';
import { DEFAULT_CAMPOS_DADOS_DOCUMENTO } from '../services/storage';

export interface DocumentTemplateContext {
  escola?: Escola | null;
  aluno?: Aluno | null;
  turma?: Turma | null;
  funcionario?: Funcionario | null;
  diretor?: Funcionario | null;
  subdiretor?: Funcionario | null;
  anoLectivo?: string;
  trimestre?: string;
  livro?: string;
  folha?: string;
  numeroRegisto?: string;
  mediaGeral?: string | number;
  situacaoFinal?: string;
  camposDados?: Partial<ConfiguracaoCamposDocumento>;
}

export interface PlaceholderChip {
  token: string;
  rotulo: string;
  grupo: 'Escola' | 'Estudante' | 'Académico' | 'Funcionário';
}

export const DOCUMENT_PLACEHOLDER_CHIPS: PlaceholderChip[] = [
  // Escola
  { token: '{{ESCOLA_NOME}}', rotulo: 'Nome da Escola', grupo: 'Escola' },
  { token: '{{ESCOLA_CODIGO}}', rotulo: 'Código MED', grupo: 'Escola' },
  { token: '{{ESCOLA_PROVINCIA}}', rotulo: 'Província', grupo: 'Escola' },
  { token: '{{ESCOLA_MUNICIPIO}}', rotulo: 'Município', grupo: 'Escola' },
  { token: '{{ESCOLA_BAIRRO_ENDERECO}}', rotulo: 'Endereço/Bairro', grupo: 'Escola' },
  { token: '{{ESCOLA_NIF}}', rotulo: 'NIF da Escola', grupo: 'Escola' },
  { token: '{{ESCOLA_DECRETO}}', rotulo: 'Decreto de Criação', grupo: 'Escola' },
  { token: '{{ESCOLA_TELEFONE}}', rotulo: 'Telefone da Escola', grupo: 'Escola' },
  { token: '{{ESCOLA_EMAIL}}', rotulo: 'E-mail Institucional', grupo: 'Escola' },
  { token: '{{DIRETOR_NOME}}', rotulo: 'Nome do Director', grupo: 'Escola' },
  { token: '{{SUBDIRETOR_NOME}}', rotulo: 'Nome do Subdirector', grupo: 'Escola' },
  { token: '{{ANO_LECTIVO}}', rotulo: 'Ano Lectivo', grupo: 'Escola' },
  { token: '{{DATA_EXTENSO}}', rotulo: 'Data por Extenso', grupo: 'Escola' },
  // Estudante
  { token: '{{ALUNO_NOME}}', rotulo: 'Nome do Estudante', grupo: 'Estudante' },
  { token: '{{ALUNO_ARTIGO}}', rotulo: 'O Aluno / A Aluna', grupo: 'Estudante' },
  { token: '{{ALUNO_FILIACAO_LABEL}}', rotulo: 'filho / filha', grupo: 'Estudante' },
  { token: '{{ALUNO_PORTADOR_LABEL}}', rotulo: 'portador / portadora', grupo: 'Estudante' },
  { token: '{{ALUNO_PROCESSO}}', rotulo: 'Nº Processo', grupo: 'Estudante' },
  { token: '{{ALUNO_BI}}', rotulo: 'Nº B.I.', grupo: 'Estudante' },
  { token: '{{ALUNO_NASCIMENTO}}', rotulo: 'Data Nascimento', grupo: 'Estudante' },
  { token: '{{ALUNO_PAI}}', rotulo: 'Nome do Pai', grupo: 'Estudante' },
  { token: '{{ALUNO_MAE}}', rotulo: 'Nome da Mãe', grupo: 'Estudante' },
  { token: '{{ALUNO_NATURALIDADE}}', rotulo: 'Naturalidade', grupo: 'Estudante' },
  { token: '{{ALUNO_RESIDENCIA}}', rotulo: 'Residência', grupo: 'Estudante' },
  { token: '{{ALUNO_ENCARREGADO}}', rotulo: 'Encarregado', grupo: 'Estudante' },
  { token: '{{ALUNO_CONTACTO}}', rotulo: 'Tel. Encarregado', grupo: 'Estudante' },
  // Académico
  { token: '{{TURMA_NOME}}', rotulo: 'Turma', grupo: 'Académico' },
  { token: '{{CLASSE}}', rotulo: 'Classe', grupo: 'Académico' },
  { token: '{{CURSO}}', rotulo: 'Curso/Área', grupo: 'Académico' },
  { token: '{{TURNO}}', rotulo: 'Turno', grupo: 'Académico' },
  { token: '{{SALA}}', rotulo: 'Sala', grupo: 'Académico' },
  { token: '{{TRIMESTRE}}', rotulo: 'Trimestre', grupo: 'Académico' },
  { token: '{{MEDIA_GERAL}}', rotulo: 'Média Geral', grupo: 'Académico' },
  { token: '{{SITUACAO_FINAL}}', rotulo: 'Situação Final', grupo: 'Académico' },
  // Funcionário
  { token: '{{FUNC_NOME}}', rotulo: 'Nome do Funcionário', grupo: 'Funcionário' },
  { token: '{{FUNC_CARGO}}', rotulo: 'Cargo/Função', grupo: 'Funcionário' },
  { token: '{{FUNC_AGENTE}}', rotulo: 'Nº Agente', grupo: 'Funcionário' },
  { token: '{{FUNC_BI}}', rotulo: 'B.I. Funcionário', grupo: 'Funcionário' },
  { token: '{{FUNC_CATEGORIA}}', rotulo: 'Categoria Salarial', grupo: 'Funcionário' },
  { token: '{{FUNC_GRAU}}', rotulo: 'Grau Académico', grupo: 'Funcionário' },
  { token: '{{FUNC_TELEFONE}}', rotulo: 'Tel. Funcionário', grupo: 'Funcionário' }
];

export interface CampoDocumentoToggleDef {
  chave: keyof ConfiguracaoCamposDocumento;
  rotulo: string;
  descricao?: string;
}

export interface SecaoCamposDocumento {
  id: 'escola' | 'aluno' | 'academico' | 'funcionario';
  titulo: string;
  campos: CampoDocumentoToggleDef[];
}

export function mesclarCamposDocumento(
  config?: ConfiguracaoDocumentoCustomizado | null
): ConfiguracaoCamposDocumento {
  return {
    ...DEFAULT_CAMPOS_DADOS_DOCUMENTO,
    ...(config?.camposDados || {})
  };
}

export function formatarDataExtensoAngola(data: Date = new Date()): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
}

export function interpolarTextoDocumento(
  texto: string | undefined,
  ctx: DocumentTemplateContext
): string {
  if (!texto) return '';
  const campos: ConfiguracaoCamposDocumento = {
    ...DEFAULT_CAMPOS_DADOS_DOCUMENTO,
    ...(ctx.camposDados || {})
  };

  const esc = ctx.escola;
  const alu = ctx.aluno;
  const tur = ctx.turma;
  const func = ctx.funcionario;

  const mapaTokens: Record<string, string> = {
    '{{ESCOLA_NOME}}': esc?.nomeOficial || '',
    '{{ESCOLA_CODIGO}}': esc?.codigoEscola || esc?.codigoSIGE || esc?.codigoMEC || '',
    '{{ESCOLA_PROVINCIA}}': campos.mostrarProvinciaMunicipio ? (esc?.provincia || '') : '',
    '{{ESCOLA_MUNICIPIO}}': campos.mostrarProvinciaMunicipio ? (esc?.municipio || '') : '',
    '{{ESCOLA_BAIRRO_ENDERECO}}': esc?.endereco || esc?.bairro || esc?.comunaDistrito || '',
    '{{ESCOLA_NIF}}': campos.mostrarNif ? (esc?.nif || '') : '',
    '{{ESCOLA_DECRETO}}': campos.mostrarDecreto ? (esc?.decretoCriacao || '') : '',
    '{{ESCOLA_TELEFONE}}': campos.mostrarContatosEmail ? (esc?.telefone || '') : '',
    '{{ESCOLA_EMAIL}}': campos.mostrarContatosEmail ? (esc?.email || '') : '',
    '{{DIRETOR_NOME}}': ctx.diretor?.nomeCompleto || esc?.diretorGeralNome || '',
    '{{SUBDIRETOR_NOME}}': ctx.subdiretor?.nomeCompleto || '',
    '{{ANO_LECTIVO}}': ctx.anoLectivo || esc?.anoLectivoActivo || '',
    '{{DATA_EXTENSO}}': campos.mostrarDataLocalExtenso ? formatarDataExtensoAngola() : '',

    '{{ALUNO_NOME}}': alu?.nomeCompleto || '',
    '{{ALUNO_ARTIGO}}': alu?.genero === 'F' ? 'a aluna' : 'o aluno',
    '{{ALUNO_FILIACAO_LABEL}}': alu?.genero === 'F' ? 'filha' : 'filho',
    '{{ALUNO_PORTADOR_LABEL}}': alu?.genero === 'F' ? 'portadora' : 'portador',
    '{{ALUNO_PROCESSO}}': campos.mostrarNumeroProcessoMatricula ? (alu?.numeroProcesso || '') : '',
    '{{ALUNO_BI}}': campos.mostrarBI ? (alu?.numeroBI || '') : '',
    '{{ALUNO_NASCIMENTO}}': campos.mostrarDataNascimento ? (alu?.dataNascimento || '') : '',
    '{{ALUNO_PAI}}': campos.mostrarFiliacao ? (alu?.nomePai || '') : '',
    '{{ALUNO_MAE}}': campos.mostrarFiliacao ? (alu?.nomeMae || '') : '',
    '{{ALUNO_NATURALIDADE}}': campos.mostrarNaturalidadeProvincia ? (alu?.naturalidade || alu?.provinciaOrigem || '') : '',
    '{{ALUNO_RESIDENCIA}}': campos.mostrarResidencia ? (alu?.residencia || alu?.bairro || alu?.endereco || '') : '',
    '{{ALUNO_ENCARREGADO}}': campos.mostrarEncarregado ? (alu?.nomeEncarregado || alu?.encarregadoNome || '') : '',
    '{{ALUNO_CONTACTO}}': campos.mostrarContactoEncarregado ? (alu?.telefoneEncarregado || alu?.encarregadoTelefone || alu?.telefone || '') : '',

    '{{TURMA_NOME}}': campos.mostrarTurmaSalaTurno ? (tur?.nome || '') : '',
    '{{CLASSE}}': tur?.classe || alu?.classeId || '',
    '{{CURSO}}': campos.mostrarCurso ? (tur?.curso || alu?.curso || '') : '',
    '{{TURNO}}': campos.mostrarTurmaSalaTurno ? (tur?.turno || alu?.turno || '') : '',
    '{{SALA}}': campos.mostrarTurmaSalaTurno ? (tur?.sala || '') : '',
    '{{TRIMESTRE}}': ctx.trimestre || '',
    '{{MEDIA_GERAL}}': campos.mostrarMediaGeral && ctx.mediaGeral !== undefined ? String(ctx.mediaGeral) : '',
    '{{SITUACAO_FINAL}}': campos.mostrarSituacaoFinal ? (ctx.situacaoFinal || '') : '',
    '{{LIVRO}}': campos.mostrarLivroFolhaRegisto ? (ctx.livro || '') : '',
    '{{FOLHA}}': campos.mostrarLivroFolhaRegisto ? (ctx.folha || '') : '',
    '{{REGISTO}}': campos.mostrarLivroFolhaRegisto ? (ctx.numeroRegisto || '') : '',

    '{{FUNC_NOME}}': func?.nomeCompleto || '',
    '{{FUNC_CARGO}}': func?.cargo || '',
    '{{FUNC_AGENTE}}': campos.mostrarFuncionarioNumeroAgente ? (func?.numeroAgente || '') : '',
    '{{FUNC_BI}}': campos.mostrarFuncionarioBI ? (func?.numeroBI || '') : '',
    '{{FUNC_NIF}}': campos.mostrarFuncionarioNif ? (func?.nif || '') : '',
    '{{FUNC_CATEGORIA}}': campos.mostrarFuncionarioCategoriaContrato ? (func?.categoriaProfissional || func?.tipoContrato || '') : '',
    '{{FUNC_GRAU}}': campos.mostrarFuncionarioGrauEspecialidade ? (func?.grauAcademico || '') : '',
    '{{FUNC_TELEFONE}}': campos.mostrarFuncionarioContatos ? (func?.telefone || '') : ''
  };

  let resultado = texto;
  Object.entries(mapaTokens).forEach(([token, valor]) => {
    if (resultado.includes(token)) {
      resultado = resultado.split(token).join(valor || '—');
    }
  });
  return resultado;
}

export function obterSecoesCamposPorDocumento(tipoDocumento: string): SecaoCamposDocumento[] {
  const secaoEscola: SecaoCamposDocumento = {
    id: 'escola',
    titulo: 'Dados da Instituição (Escola)',
    campos: [
      { chave: 'mostrarGovernoGabinete', rotulo: 'Governo Provincial / Gabinete da Educação' },
      { chave: 'mostrarProvinciaMunicipio', rotulo: 'Província, Município e Endereço' },
      { chave: 'mostrarNif', rotulo: 'NIF e Código MED da Escola' },
      { chave: 'mostrarDecreto', rotulo: 'Decreto Executivo de Criação da Escola' },
      { chave: 'mostrarContatosEmail', rotulo: 'Telefone e E-mail Institucional' },
      { chave: 'mostrarDataLocalExtenso', rotulo: 'Local e Data por Extenso no Rodapé' }
    ]
  };

  const secaoAlunoCompleta: SecaoCamposDocumento = {
    id: 'aluno',
    titulo: 'Dados do Estudante (Buscados da Ficha)',
    campos: [
      { chave: 'mostrarFoto', rotulo: 'Fotografia Tipo Passe do Estudante' },
      { chave: 'mostrarNumeroProcessoMatricula', rotulo: 'Nº de Processo / Matrícula' },
      { chave: 'mostrarNumeroOrdem', rotulo: 'Nº de Ordem na Turma' },
      { chave: 'mostrarBI', rotulo: 'Bilhete de Identidade (Nº B.I.)' },
      { chave: 'mostrarDataEmissaoBI', rotulo: 'Data / Arquivo de Emissão do B.I.' },
      { chave: 'mostrarFiliacao', rotulo: 'Filiação (Nome do Pai e da Mãe)' },
      { chave: 'mostrarDataNascimento', rotulo: 'Data de Nascimento' },
      { chave: 'mostrarNaturalidadeProvincia', rotulo: 'Naturalidade e Província de Origem' },
      { chave: 'mostrarResidencia', rotulo: 'Morada / Residência' },
      { chave: 'mostrarEncarregado', rotulo: 'Nome do Encarregado de Educação' },
      { chave: 'mostrarContactoEncarregado', rotulo: 'Contacto Telefónico do Encarregado' },
      { chave: 'mostrarTurmaSalaTurno', rotulo: 'Turma, Sala e Turno' },
      { chave: 'mostrarCurso', rotulo: 'Curso / Área de Formação' },
      { chave: 'mostrarLivroFolhaRegisto', rotulo: 'Livro, Folha e Nº de Registo' }
    ]
  };

  const secaoAcademico: SecaoCamposDocumento = {
    id: 'academico',
    titulo: 'Dados Académicos, Notas & Comportamento',
    campos: [
      { chave: 'mostrarMacNppNptDetalhado', rotulo: 'Notas Detalhadas (MAC, NPP, NPT)' },
      { chave: 'mostrarFaltas', rotulo: 'Total de Faltas / Assiduidade' },
      { chave: 'mostrarComportamento', rotulo: 'Avaliação Comportamental' },
      { chave: 'mostrarMediaGeral', rotulo: 'Média Geral Calculada' },
      { chave: 'mostrarSituacaoFinal', rotulo: 'Situação Final / Classificação (Apto / Transita)' },
      { chave: 'mostrarEscalaExtenso', rotulo: 'Nota por Extenso e Escala MED' },
      { chave: 'mostrarHistoricoOcorrencias', rotulo: 'Histórico Disciplinar e Ocorrências' }
    ]
  };

  const secaoFuncionario: SecaoCamposDocumento = {
    id: 'funcionario',
    titulo: 'Dados do Funcionário / Docente (RH)',
    campos: [
      { chave: 'mostrarFuncionarioFoto', rotulo: 'Fotografia do Funcionário' },
      { chave: 'mostrarFuncionarioNumeroAgente', rotulo: 'Nº de Agente MED' },
      { chave: 'mostrarFuncionarioBI', rotulo: 'Nº do Bilhete de Identidade (B.I.)' },
      { chave: 'mostrarFuncionarioNif', rotulo: 'NIF Individual' },
      { chave: 'mostrarFuncionarioContatos', rotulo: 'Telefone, E-mail e Morada' },
      { chave: 'mostrarFuncionarioGrauEspecialidade', rotulo: 'Grau Académico e Especialidade' },
      { chave: 'mostrarFuncionarioCategoriaContrato', rotulo: 'Categoria Salarial e Regime de Contrato' },
      { chave: 'mostrarFuncionarioDadosBancariosIbanInss', rotulo: 'IBAN, Banco e Nº INSS' },
      { chave: 'mostrarFuncionarioCargaHoraria', rotulo: 'Turmas e Disciplinas Lecionadas' }
    ]
  };

  if (tipoDocumento === 'ficha_individual_funcionario') {
    return [secaoEscola, secaoFuncionario];
  }

  if (tipoDocumento === 'ficha_presencas' || tipoDocumento === 'pauta_trimestral' || tipoDocumento === 'termo_exame') {
    return [
      secaoEscola,
      {
        ...secaoAlunoCompleta,
        campos: secaoAlunoCompleta.campos.filter(c =>
          ['mostrarNumeroProcessoMatricula', 'mostrarNumeroOrdem', 'mostrarBI', 'mostrarTurmaSalaTurno', 'mostrarCurso'].includes(c.chave)
        )
      },
      {
        ...secaoAcademico,
        campos: secaoAcademico.campos.filter(c =>
          ['mostrarMacNppNptDetalhado', 'mostrarFaltas', 'mostrarComportamento', 'mostrarMediaGeral', 'mostrarSituacaoFinal'].includes(c.chave)
        )
      }
    ];
  }

  if (tipoDocumento === 'boletim_oficial') {
    return [
      secaoEscola,
      {
        ...secaoAlunoCompleta,
        campos: secaoAlunoCompleta.campos.filter(c =>
          ['mostrarFoto', 'mostrarNumeroProcessoMatricula', 'mostrarNumeroOrdem', 'mostrarTurmaSalaTurno', 'mostrarCurso', 'mostrarEncarregado'].includes(c.chave)
        )
      },
      {
        ...secaoAcademico,
        campos: secaoAcademico.campos.filter(c =>
          ['mostrarMacNppNptDetalhado', 'mostrarFaltas', 'mostrarComportamento', 'mostrarMediaGeral', 'mostrarSituacaoFinal'].includes(c.chave)
        )
      }
    ];
  }

  if (tipoDocumento === 'declaracao_notas' || tipoDocumento === 'declaracao_matricula' || tipoDocumento === 'certificado' || tipoDocumento === 'guia_transferencia') {
    return [
      secaoEscola,
      secaoAlunoCompleta,
      secaoAcademico
    ];
  }

  if (tipoDocumento === 'ficha_individual_aluno') {
    return [
      secaoEscola,
      secaoAlunoCompleta,
      {
        ...secaoAcademico,
        campos: secaoAcademico.campos.filter(c =>
          ['mostrarMediaGeral', 'mostrarSituacaoFinal', 'mostrarHistoricoOcorrencias', 'mostrarFaltas', 'mostrarComportamento'].includes(c.chave)
        )
      }
    ];
  }

  return [secaoEscola, secaoAlunoCompleta, secaoAcademico];
}
