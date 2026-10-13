import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  GraduationCap, 
  FileText, 
  BookOpen,
  Calendar,
  Phone,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  Trash2,
  Check,
  Award,
  FileCheck2,
  FileSpreadsheet,
  Printer,
  Download,
  CheckCircle2,
  QrCode,
  HeartPulse,
  AlertTriangle,
  Clock,
  CreditCard,
  MessageSquare,
  DollarSign,
  Edit2,
  Trophy
} from 'lucide-react';
import { StudentRankingSection } from './StudentRankingSection';
import { 
  Aluno, 
  Turma, 
  EstadoAluno, 
  Genero, 
  HistoricoAnoAnterior, 
  HistoricoEscolarCompleto, 
  HistoricoClasseDisciplinas, 
  NotaFinalDisciplinaHistorico,
  OcorrenciaHistoricoAluno,
  FaltasAnoHistorico,
  DividasAnoHistorico
} from '../types';
import * as XLSX from 'xlsx';
import { dbService } from '../services/storage';
import { validarElegibilidadeCertificado, formatarTextoPorGenero, obterInformacaoEscala } from '../services/macEngine';
import { converterNotaParaCertificadoExtenso, converterNotaParaExtenso } from '../utils/numberToWords';
import { downloadHtmlDocument, downloadExcelFile, downloadElementAsPdf } from '../utils/curriculoAngola';
import { AngolaDateInput } from './AngolaDateInput';
import { LocationPicker } from './LocationPicker';
import { InsigniaAngola } from '../constants/insignia';
import { 
  sanitizeSearchInput, 
  safeSearchMatch, 
  useDebouncedSearch 
} from '../utils/securitySanitizer';
import { 
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  CURSOS_SEGUNDO_CICLO,
  normalizarClasse,
  isSegundoCiclo,
  getTurmasPorClasse,
  getSalaDaTurma,
  getCursoDaTurma,
  getDisciplinasMatrizOficial
} from '../services/academicHierarchyService';

interface StudentsViewProps {
  alunos: Aluno[];
  turmas: Turma[];
  onSalvarAluno: (aluno: Aluno) => void;
  onExcluirAluno: (id: string) => void;
}

// Matriz oficial do currículo do Ministério da Educação de Angola por ciclo e classe
export const CURRICULO_POR_CLASSE: Record<string, string[]> = {
  'Iniciação': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Expressão Motora', 'Expressão Plástica e Musical'],
  '1ª': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'],
  '2ª': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'],
  '3ª': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'],
  '4ª': ['Língua Portuguesa', 'Matemática', 'Estudo do Meio', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'],
  '5ª': ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'],
  '6ª': ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', 'Educação Moral e Cívica', 'Educação Visual e Plástica', 'Educação Musical', 'Educação Física'],
  '7ª': ['Língua Portuguesa', 'Matemática', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Língua Francesa', 'Língua Inglesa', 'Educação Visual e Plástica', 'Educação Física', 'Educação Moral e Cívica'],
  '8ª': ['Língua Portuguesa', 'Matemática', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Língua Francesa', 'Língua Inglesa', 'Educação Visual e Plástica', 'Educação Física', 'Educação Moral e Cívica'],
  '9ª': ['Língua Portuguesa', 'Matemática', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Língua Francesa', 'Língua Inglesa', 'Educação Visual e Plástica', 'Educação Física', 'Educação Moral e Cívica'],
  '10ª': ['Língua Portuguesa', 'Literatura', 'Matemática', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Filosofia', 'Língua Inglesa', 'Língua Francesa', 'Informática / TIC', 'Educação Física'],
  '11ª': ['Língua Portuguesa', 'Literatura', 'Matemática', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Filosofia', 'Língua Inglesa', 'Língua Francesa', 'Informática / TIC', 'Educação Física'],
  '12ª': ['Língua Portuguesa', 'Literatura', 'Matemática', 'Física', 'Química', 'Biologia', 'Geografia', 'História', 'Filosofia', 'Língua Inglesa', 'Língua Francesa', 'Informática / TIC', 'Educação Física'],
  '13ª': ['Língua Portuguesa', 'Matemática', 'Física Aplicada', 'Química Aplicada', 'Tecnologias Específicas', 'Desenho Técnico', 'Empreendedorismo', 'Estágio Profissional / PAP']
};

// Disciplinas padrão do currículo de Angola para seleção rápida
const DISCIPLINAS_ANGOLA_PADRAO = [
  'Língua Portuguesa',
  'Matemática',
  'Física',
  'Química',
  'Biologia',
  'História',
  'Geografia',
  'Língua Inglesa',
  'Língua Francesa',
  'Educação Física',
  'Educação Moral e Cívica',
  'Educação Visual e Plástica',
  'Informática / TIC',
  'Geologia',
  'Filosofia',
  'Desenho Técnico',
  'Metodologia de Investigação Científica'
];

export const StudentsView: React.FC<StudentsViewProps> = ({
  alunos,
  turmas,
  onSalvarAluno,
  onExcluirAluno
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasseFilter, setSelectedClasseFilter] = useState('TODAS');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('TODAS');
  const [selectedSalaFilter, setSelectedSalaFilter] = useState('TODAS');
  const [selectedCursoFilter, setSelectedCursoFilter] = useState('TODOS');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('TODOS');
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'ranking'>('lista');
  
  // Modal de Matrícula: Associação Estrita Classe -> Turma -> Sala -> Curso
  const [modalClasse, setModalClasse] = useState('1ª');
  const [modalCurso, setModalCurso] = useState('Ciências Físicas e Biológicas (PUNIV)');

  // Proteção de segurança contra ataques ReDoS e sobrecarga de CPU por digitação contínua
  const debouncedSearch = useDebouncedSearch(searchTerm, 200);

  const configSistema = dbService.getConfiguracaoSistema();
  const escola = dbService.getEscolaAtiva();

  // Modal Novo / Edição de Aluno
  const [showAlunoModal, setShowAlunoModal] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);

  // Campos do formulário de matrícula oficial MED Angola
  const [codigoMatricula, setCodigoMatricula] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [genero, setGenero] = useState<Genero>('M');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'BI' | 'Cédula' | 'Passaporte'>('BI');
  const [dataEmissaoBI, setDataEmissaoBI] = useState('');
  const [arquivoIdentificacao, setArquivoIdentificacao] = useState('Arquivo de Identificação de Luanda');
  const [dataNascimento, setDataNascimento] = useState('2010-05-14');
  const [naturalidade, setNaturalidade] = useState('Luanda');
  const [municipioNascimento, setMunicipioNascimento] = useState('Luanda');
  const [provinciaOrigem, setProvinciaOrigem] = useState('Luanda');
  const [turmaId, setTurmaId] = useState(turmas[0]?.id || '');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [nomePai, setNomePai] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [nomeEncarregado, setNomeEncarregado] = useState('');
  const [encarregadoParentesco, setEncarregadoParentesco] = useState('Pai');
  const [telefoneEncarregado, setTelefoneEncarregado] = useState('+244 9');
  const [encarregadoEmail, setEncarregadoEmail] = useState('');
  const [encarregadoProfissao, setEncarregadoProfissao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [estado, setEstado] = useState<EstadoAluno>('Ativo');

  // Dados Médicos e de Saúde do Aluno (MED Angola)
  const [grupoSanguineo, setGrupoSanguineo] = useState('O+');
  const [alergias, setAlergias] = useState('');
  const [doencasCronicas, setDoencasCronicas] = useState('');
  const [condicaoEspecial, setCondicaoEspecial] = useState('');
  const [restricaoEducacaoFisica, setRestricaoEducacaoFisica] = useState(false);
  const [contactoEmergenciaNome, setContactoEmergenciaNome] = useState('');
  const [contactoEmergenciaTelefone, setContactoEmergenciaTelefone] = useState('');

  // Estado para a Funcionalidade de Confirmação de Matrícula (Alunos Existentes)
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [confirmAlunoId, setConfirmAlunoId] = useState('');
  const [confirmClasse, setConfirmClasse] = useState('');
  const [confirmTurmaId, setConfirmTurmaId] = useState('');
  const [confirmTurno, setConfirmTurno] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const [confirmCurso, setConfirmCurso] = useState('');
  const [confirmCodigoMatricula, setConfirmCodigoMatricula] = useState('');
  const [alunoConfirmadoComprovativo, setAlunoConfirmadoComprovativo] = useState<{ aluno: Aluno; turmaAnterior?: string; turmaNova?: Turma } | null>(null);
  const [showComprovativoModal, setShowComprovativoModal] = useState(false);

  // Modal de Histórico Escolar Completo (Notas Finais por Disciplina em Cada Classe)
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [historicoAluno, setHistoricoAluno] = useState<Aluno | null>(null);
  const [historicoCompleto, setHistoricoCompleto] = useState<HistoricoEscolarCompleto | null>(null);
  const [classeAtivaIdx, setClasseAtivaIdx] = useState<number>(0);

  // Sub-abas do Histórico Escolar Completo
  const [subAbaHistorico, setSubAbaHistorico] = useState<'notas' | 'ocorrencias' | 'faltas' | 'dividas' | 'resumo'>('notas');

  // Formulário para adicionar disciplina na classe ativa
  const [novaDiscNome, setNovaDiscNome] = useState('Língua Portuguesa');
  const [novaDiscNota, setNovaDiscNota] = useState('14');
  const [novoProfessorNome, setNovoProfessorNome] = useState('');

  // Formulário para adicionar nova classe ao histórico
  const [showAddClasseForm, setShowAddClasseForm] = useState(false);
  const [novaClasseNome, setNovaClasseNome] = useState('10ª');
  const [novaClasseAno, setNovaClasseAno] = useState('2023/2024');
  const [novaClasseEscola, setNovaClasseEscola] = useState('Complexo Escolar nº 151');

  // Formulário para registar nova ocorrência / acontecimento escolar
  const [showNovaOcorrenciaForm, setShowNovaOcorrenciaForm] = useState(false);
  const [novaOcorrTipo, setNovaOcorrTipo] = useState<'Disciplinar' | 'Pedagógico' | 'Elogio' | 'Reunião Encarregado' | 'Advertência' | 'Louvor' | 'Outro'>('Disciplinar');
  const [novaOcorrData, setNovaOcorrData] = useState(() => new Date().toISOString().split('T')[0]);
  const [novaOcorrDescricao, setNovaOcorrDescricao] = useState('');
  const [novaOcorrRegistadoPor, setNovaOcorrRegistadoPor] = useState('');
  const [novaOcorrCargo, setNovaOcorrCargo] = useState('Coordenador');
  const [novaOcorrResolucao, setNovaOcorrResolucao] = useState('');

  // Edição de faltas e dívidas do ano letivo ativo
  const [editandoFaltas, setEditandoFaltas] = useState(false);
  const [formFaltasJust, setFormFaltasJust] = useState(0);
  const [formFaltasInjust, setFormFaltasInjust] = useState(0);
  const [formFaltasObs, setFormFaltasObs] = useState('');

  const [editandoDividas, setEditandoDividas] = useState(false);
  const [formDividaStatus, setFormDividaStatus] = useState<'Regularizado' | 'Pendente' | 'Acordo de Pagamento' | 'Isento'>('Regularizado');
  const [formDividaTotal, setFormDividaTotal] = useState(0);
  const [formDividaPago, setFormDividaPago] = useState(0);
  const [formDividaObs, setFormDividaObs] = useState('');

  // Modal de Consulta Pública (Portal dos Pais)
  const [showPublicPortal, setShowPublicPortal] = useState(false);
  const [consultaCodigo, setConsultaCodigo] = useState('');
  const [resultadoConsulta, setResultadoConsulta] = useState<Aluno | null>(null);

  const turmasFinais = ['6ª', '9ª', '12ª', '13ª'];

  // Turmas filtradas pela classe selecionada
  const turmasDoFiltro = selectedClasseFilter === 'TODAS'
    ? turmas
    : getTurmasPorClasse(turmas, selectedClasseFilter);

  // Salas e Classes disponíveis para os filtros coerentes
  const todasSalas = Array.from(new Set(turmas.map(t => t.sala).filter(Boolean))).sort();
  const todasClasses = [
    'Iniciação',
    ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
    ...CLASSES_PRIMEIRO_CICLO,
    ...CLASSES_SEGUNDO_CICLO
  ];

  // Turmas para o modal de matrícula filtradas pela classe do modal
  const turmasDoModal = getTurmasPorClasse(turmas, modalClasse);
  const turmaSelecionadaModal = turmas.find(t => t.id === turmaId) || turmasDoModal[0];

  const filteredAlunos = alunos.filter(a => {
    const turmaDoAluno = turmas.find(t => t.id === a.turmaId);
    const classeDoAluno = turmaDoAluno ? normalizarClasse(turmaDoAluno.classe) : normalizarClasse(a.classeId);
    const salaDoAluno = turmaDoAluno?.sala || '';
    const cursoDoAluno = turmaDoAluno?.curso || a.curso || '';

    // 1. Filtro Coerente de Classe
    if (selectedClasseFilter !== 'TODAS') {
      if (classeDoAluno !== normalizarClasse(selectedClasseFilter)) return false;
    }

    // 2. Filtro Coerente de Turma
    if (selectedTurmaFilter !== 'TODAS') {
      if (a.turmaId !== selectedTurmaFilter) return false;
    }

    // 3. Filtro Coerente de Sala
    if (selectedSalaFilter !== 'TODAS') {
      if (salaDoAluno.toLowerCase().trim() !== selectedSalaFilter.toLowerCase().trim()) return false;
    }

    // 4. Filtro Coerente de Curso (específico para 2º Ciclo)
    if (selectedCursoFilter !== 'TODOS') {
      if (cursoDoAluno.toLowerCase().trim() !== selectedCursoFilter.toLowerCase().trim()) return false;
    }

    // 5. Filtro de Estado
    if (selectedEstadoFilter !== 'TODOS') {
      if (a.estado !== selectedEstadoFilter) return false;
    }

    // 6. Pesquisa sanitizada e imune a ReDoS (Catastrophic Backtracking)
    if (debouncedSearch.trim()) {
      const doc = a.numeroDocumento || a.numeroBI || '';
      const matchNome = safeSearchMatch(a.nomeCompleto, debouncedSearch);
      const matchMatr = safeSearchMatch(a.codigoMatricula, debouncedSearch);
      const matchDoc = safeSearchMatch(doc, debouncedSearch);
      const matchTurma = safeSearchMatch(turmaDoAluno?.nome, debouncedSearch);
      const matchSala = safeSearchMatch(salaDoAluno, debouncedSearch);
      const matchCurso = safeSearchMatch(cursoDoAluno, debouncedSearch);
      if (!matchNome && !matchMatr && !matchDoc && !matchTurma && !matchSala && !matchCurso) {
        return false;
      }
    }

    return true;
  });

  // Carregar histórico ao abrir modal com ocorrências, faltas e dívidas por ano letivo
  const handleOpenHistoricoModal = (aluno: Aluno) => {
    setHistoricoAluno(aluno);
    let hist = dbService.getHistoricoEscolarCompleto(aluno.id);
    if (!hist || hist.classes.length === 0) {
      // Se ainda não existir histórico completo, inicializar a partir do histórico anterior ou modelo base com ocorrências, faltas e dívidas
      const classesIniciais: HistoricoClasseDisciplinas[] = aluno.historicoAnterior && aluno.historicoAnterior.length > 0
        ? aluno.historicoAnterior.map((h, hIdx) => ({
            classe: h.classe,
            anoLectivo: h.anoLectivo,
            escolaOrigem: h.escolaOrigem || 'Escola de Origem',
            mediaGeralClasse: h.mediaFinal,
            notasDisciplinas: [
              { disciplinaNome: 'Língua Portuguesa', notaFinal: h.mediaFinal, resultado: 'Aprovado' },
              { disciplinaNome: 'Matemática', notaFinal: h.mediaFinal, resultado: 'Aprovado' },
              { disciplinaNome: 'Física', notaFinal: h.mediaFinal, resultado: 'Aprovado' },
              { disciplinaNome: 'Química', notaFinal: h.mediaFinal, resultado: 'Aprovado' }
            ],
            ocorrencias: [
              {
                id: `ocorr-coord-${aluno.id}-${hIdx}-1`,
                data: `${h.anoLectivo.split('/')[0]}-11-15`,
                tipo: 'Elogio',
                descricao: `Reconhecimento oficial de empenho e aproveitamento curricular exemplar na ${h.classe} Classe.`,
                registadoPor: 'Coordenação Pedagógica',
                cargo: 'Coordenador',
                anoLectivo: h.anoLectivo,
                classe: h.classe,
                resolucao: 'Registo averbado na folha de honra escolar.'
              }
            ],
            faltas: {
              anoLectivo: h.anoLectivo,
              classe: h.classe,
              totalAulasPrevistas: 720,
              faltasJustificadas: 3,
              faltasInjustificadas: 1,
              totalPresencas: 716,
              percentualAssiduidade: 99.4,
              observacao: 'Frequência regular com participação ativa nas aulas.'
            },
            dividas: {
              anoLectivo: h.anoLectivo,
              classe: h.classe,
              status: 'Regularizado',
              totalDividaAKZ: 0,
              totalPagoAKZ: 120000,
              mesesPendentes: [],
              observacoes: `Propinas e encargos escolares do ano letivo ${h.anoLectivo} totalmente liquidados.`
            }
          }))
        : [
            {
              classe: '10ª',
              anoLectivo: '2022/2023',
              escolaOrigem: 'Complexo Escolar nº 151',
              mediaGeralClasse: 14.5,
              notasDisciplinas: [
                { disciplinaNome: 'Língua Portuguesa', notaFinal: 14, resultado: 'Aprovado' },
                { disciplinaNome: 'Matemática', notaFinal: 15, resultado: 'Aprovado' },
                { disciplinaNome: 'Física', notaFinal: 14, resultado: 'Aprovado' },
                { disciplinaNome: 'Química', notaFinal: 15, resultado: 'Aprovado' }
              ],
              ocorrencias: [
                {
                  id: `ocorr-ini-1-${aluno.id}`,
                  data: '2022-11-20',
                  tipo: 'Elogio',
                  descricao: 'Participação meritória na olimpíada de ciências exatas e feira de projetos escolares.',
                  registadoPor: 'Prof. Garcia António Vunge',
                  cargo: 'Professor',
                  anoLectivo: '2022/2023',
                  classe: '10ª',
                  resolucao: 'Menção honrosa expedida pelo conselho pedagógico de turma.'
                },
                {
                  id: `ocorr-ini-2-${aluno.id}`,
                  data: '2023-03-12',
                  tipo: 'Reunião Encarregado',
                  descricao: 'Reunião de acompanhamento trimestral com o encarregado de educação para alinhamento pedagógico.',
                  registadoPor: 'Dra. Maria Teresa',
                  cargo: 'Coordenadora Pedagógica',
                  anoLectivo: '2022/2023',
                  classe: '10ª',
                  resolucao: 'Termo de cooperação encarregado-escola homologado sem pendências.'
                }
              ],
              faltas: {
                anoLectivo: '2022/2023',
                classe: '10ª',
                totalAulasPrevistas: 720,
                faltasJustificadas: 4,
                faltasInjustificadas: 2,
                totalPresencas: 714,
                percentualAssiduidade: 99.2,
                observacao: 'Faltas devidamente justificadas mediante atestado médico homologado.'
              },
              dividas: {
                anoLectivo: '2022/2023',
                classe: '10ª',
                status: 'Regularizado',
                totalDividaAKZ: 0,
                totalPagoAKZ: 120000,
                mesesPendentes: [],
                observacoes: 'Ano letivo liquidado na totalidade sem dívidas ou emolumentos pendentes.'
              }
            },
            {
              classe: '11ª',
              anoLectivo: '2023/2024',
              escolaOrigem: 'Complexo Escolar nº 151',
              mediaGeralClasse: 14.8,
              notasDisciplinas: [
                { disciplinaNome: 'Língua Portuguesa', notaFinal: 15, resultado: 'Aprovado' },
                { disciplinaNome: 'Matemática', notaFinal: 16, resultado: 'Aprovado' },
                { disciplinaNome: 'Física', notaFinal: 14, resultado: 'Aprovado' },
                { disciplinaNome: 'Química', notaFinal: 14, resultado: 'Aprovado' }
              ],
              ocorrencias: [
                {
                  id: `ocorr-ini-3-${aluno.id}`,
                  data: '2024-04-10',
                  tipo: 'Pedagógico',
                  descricao: 'Designação para programa de monitoria e tutoria de colegas na disciplina de Matemática.',
                  registadoPor: 'Prof. Manuel Costa',
                  cargo: 'Professor',
                  anoLectivo: '2023/2024',
                  classe: '11ª',
                  resolucao: 'Atividade de tutoria concluída com louvor no conselho docente.'
                }
              ],
              faltas: {
                anoLectivo: '2023/2024',
                classe: '11ª',
                totalAulasPrevistas: 720,
                faltasJustificadas: 2,
                faltasInjustificadas: 1,
                totalPresencas: 717,
                percentualAssiduidade: 99.6,
                observacao: 'Comportamento e assiduidade exemplares ao longo de todo o ano letivo.'
              },
              dividas: {
                anoLectivo: '2023/2024',
                classe: '11ª',
                status: 'Regularizado',
                totalDividaAKZ: 0,
                totalPagoAKZ: 135000,
                mesesPendentes: [],
                observacoes: 'Quitação comprovada por extrato oficial da tesouraria.'
              }
            }
          ];

      hist = {
        alunoId: aluno.id,
        classes: classesIniciais,
        dataUltimaAtualizacao: new Date().toISOString()
      };
      dbService.salvarHistoricoEscolarCompleto(hist);
    } else {
      // Garantir que cada classe arquivada possua estruturas de ocorrências, faltas e dívidas
      let modificado = false;
      const classesAtualizadas = hist.classes.map((c, cIdx) => {
        let mudou = false;
        const cAtual = { ...c };
        if (!cAtual.ocorrencias) {
          cAtual.ocorrencias = [
            {
              id: `ocorr-garantida-${aluno.id}-${cIdx}`,
              data: `${c.anoLectivo.split('/')[0] || '2023'}-10-25`,
              tipo: 'Elogio',
              descricao: `Aproveitamento curricular e assiduidade regular na ${c.classe} Classe averbados pelo corpo docente.`,
              registadoPor: 'Coordenação Pedagógica',
              cargo: 'Coordenador',
              anoLectivo: c.anoLectivo,
              classe: c.classe,
              resolucao: 'Registo homologado e arquivado no processo do aluno.'
            }
          ];
          mudou = true;
        }
        if (!cAtual.faltas) {
          cAtual.faltas = {
            anoLectivo: c.anoLectivo,
            classe: c.classe,
            totalAulasPrevistas: 720,
            faltasJustificadas: 2,
            faltasInjustificadas: 1,
            totalPresencas: 717,
            percentualAssiduidade: 99.5,
            observacao: 'Assiduidade regular anual.'
          };
          mudou = true;
        }
        if (!cAtual.dividas) {
          cAtual.dividas = {
            anoLectivo: c.anoLectivo,
            classe: c.classe,
            status: 'Regularizado',
            totalDividaAKZ: 0,
            totalPagoAKZ: 120000,
            mesesPendentes: [],
            observacoes: 'Situação financeira regularizada no ano letivo.'
          };
          mudou = true;
        }
        if (mudou) modificado = true;
        return cAtual;
      });

      if (modificado) {
        hist = { ...hist, classes: classesAtualizadas };
        dbService.salvarHistoricoEscolarCompleto(hist);
      }
    }

    setHistoricoCompleto(hist);
    setClasseAtivaIdx(0);
    setSubAbaHistorico('notas');
    setShowNovaOcorrenciaForm(false);
    setEditandoFaltas(false);
    setEditandoDividas(false);

    // Carregar dados da primeira classe para os formulários de edição
    const primeira = hist.classes[0];
    if (primeira) {
      setFormFaltasJust(primeira.faltas?.faltasJustificadas || 0);
      setFormFaltasInjust(primeira.faltas?.faltasInjustificadas || 0);
      setFormFaltasObs(primeira.faltas?.observacao || '');

      setFormDividaStatus(primeira.dividas?.status || 'Regularizado');
      setFormDividaTotal(primeira.dividas?.totalDividaAKZ || 0);
      setFormDividaPago(primeira.dividas?.totalPagoAKZ || 120000);
      setFormDividaObs(primeira.dividas?.observacoes || '');
    }

    setShowHistoricoModal(true);
  };

  // Upload de foto diretamente do dispositivo do utilizador
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem selecionada é muito pesada (máximo 5MB). Por favor selecione uma imagem menor.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreate = () => {
    setEditingAluno(null);
    setCodigoMatricula(`${new Date().getFullYear()}/MED-${Math.floor(1000 + Math.random() * 9000)}`);
    setNomeCompleto('');
    setGenero('M');
    setNumeroDocumento('');
    setTipoDocumento('BI');
    setDataEmissaoBI('2021-06-15');
    setArquivoIdentificacao('Arquivo de Identificação de Luanda');
    setDataNascimento('2010-01-01');
    setNaturalidade('Luanda');
    setMunicipioNascimento('Luanda');
    setProvinciaOrigem('Luanda');
    const primeiraTurma = turmas[0];
    const initialClasse = primeiraTurma ? normalizarClasse(primeiraTurma.classe) : '1ª';
    setModalClasse(initialClasse);
    setTurmaId(primeiraTurma?.id || '');
    setModalCurso(primeiraTurma?.curso || 'Ciências Físicas e Biológicas (PUNIV)');
    setNumeroProcesso(`PROC-${Math.floor(1000 + Math.random() * 9000)}`);
    setNomePai('');
    setNomeMae('');
    setNomeEncarregado('');
    setEncarregadoParentesco('Pai');
    setTelefoneEncarregado('+244 9');
    setEncarregadoEmail('');
    setEncarregadoProfissao('');
    setEndereco('Bairro Central, Luanda');
    setFotoUrl('');
    setEstado('Ativo');
    setGrupoSanguineo('O+');
    setAlergias('');
    setDoencasCronicas('');
    setCondicaoEspecial('');
    setRestricaoEducacaoFisica(false);
    setContactoEmergenciaNome('');
    setContactoEmergenciaTelefone('');
    setShowAlunoModal(true);
  };

  const handleOpenEdit = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setCodigoMatricula(aluno.codigoMatricula || aluno.numeroProcesso || '');
    setNomeCompleto(aluno.nomeCompleto);
    setGenero(aluno.genero);
    setNumeroDocumento(aluno.numeroDocumento || aluno.numeroBI || '');
    setTipoDocumento(aluno.tipoDocumento || 'BI');
    setDataEmissaoBI(aluno.dataEmissaoBI || '');
    setArquivoIdentificacao(aluno.arquivoIdentificacao || 'Arquivo de Identificação de Luanda');
    setDataNascimento(aluno.dataNascimento);
    setNaturalidade(aluno.naturalidade);
    setMunicipioNascimento(aluno.municipioNascimento || aluno.naturalidade || 'Luanda');
    setProvinciaOrigem(aluno.provinciaOrigem);
    const turmaDoAluno = turmas.find(t => t.id === aluno.turmaId);
    const cls = turmaDoAluno ? normalizarClasse(turmaDoAluno.classe) : normalizarClasse(aluno.classeId || '1ª');
    setModalClasse(cls);
    setTurmaId(aluno.turmaId);
    setModalCurso(aluno.curso || turmaDoAluno?.curso || 'Ciências Físicas e Biológicas (PUNIV)');
    setNumeroProcesso(aluno.numeroProcesso || aluno.codigoMatricula || '');
    setNomePai(aluno.nomePai || '');
    setNomeMae(aluno.nomeMae || '');
    setNomeEncarregado(aluno.nomeEncarregado || aluno.encarregadoNome || '');
    setEncarregadoParentesco(aluno.encarregadoParentesco || 'Encarregado');
    setTelefoneEncarregado(aluno.telefoneEncarregado || aluno.encarregadoTelefone || '');
    setEncarregadoEmail(aluno.encarregadoEmail || '');
    setEncarregadoProfissao(aluno.encarregadoProfissao || '');
    setEndereco(aluno.endereco || '');
    setFotoUrl(aluno.fotoUrl || '');
    setEstado(aluno.estado);
    setGrupoSanguineo(aluno.grupoSanguineo || 'O+');
    setAlergias(aluno.alergias || '');
    setDoencasCronicas(aluno.doencasCronicas || '');
    setCondicaoEspecial(aluno.condicaoEspecial || aluno.necessidadesEspeciais || '');
    setRestricaoEducacaoFisica(aluno.restricaoEducacaoFisica ?? false);
    setContactoEmergenciaNome(aluno.contactoEmergenciaNome || '');
    setContactoEmergenciaTelefone(aluno.contactoEmergenciaTelefone || '');
    setShowAlunoModal(true);
  };

  const handleSaveAluno = (e: React.FormEvent) => {
    e.preventDefault();
    const turmaSelecionada = turmas.find(t => t.id === turmaId);
    const classeFinal = turmaSelecionada ? normalizarClasse(turmaSelecionada.classe) : normalizarClasse(modalClasse);
    const cursoFinal = isSegundoCiclo(classeFinal)
      ? (turmaSelecionada?.curso || modalCurso || 'Ciências Físicas e Biológicas (PUNIV)')
      : getCursoDaTurma(turmaSelecionada);

    const novoAluno: Aluno = {
      id: editingAluno ? editingAluno.id : `aluno-${Date.now()}`,
      escolaId: editingAluno?.escolaId || 'esc-001',
      codigoMatricula: codigoMatricula.trim() || editingAluno?.codigoMatricula || `${new Date().getFullYear()}/MED-${Math.floor(1000 + Math.random() * 9000)}`,
      numeroProcesso: numeroProcesso || editingAluno?.numeroProcesso || `PROC-${Math.floor(1000 + Math.random() * 9000)}`,
      numeroOrdem: editingAluno?.numeroOrdem || 1,
      nomeCompleto,
      genero,
      numeroBI: numeroDocumento || '000000000LA000',
      tipoDocumento,
      numeroDocumento,
      dataEmissaoBI,
      arquivoIdentificacao,
      dataNascimento,
      naturalidade,
      municipioNascimento,
      provinciaOrigem,
      telefone: telefoneEncarregado,
      turmaId,
      classeId: classeFinal,
      curso: cursoFinal,
      nomePai,
      nomeMae,
      encarregadoNome: nomeEncarregado || 'Encarregado de Educação',
      nomeEncarregado,
      encarregadoParentesco,
      encarregadoTelefone: telefoneEncarregado,
      telefoneEncarregado,
      encarregadoEmail,
      encarregadoProfissao,
      endereco,
      fotoUrl: fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      estado,
      propinaStatus: editingAluno?.propinaStatus || 'Regularizada',
      cadastradoEm: editingAluno?.cadastradoEm || new Date().toISOString().split('T')[0],
      anoMatricula: '2025/2026',
      // Ficha Médica e de Saúde
      grupoSanguineo,
      alergias: alergias.trim(),
      doencasCronicas: doencasCronicas.trim(),
      condicaoEspecial: condicaoEspecial.trim(),
      necessidadesEspeciais: condicaoEspecial.trim(),
      restricaoEducacaoFisica,
      contactoEmergenciaNome: contactoEmergenciaNome.trim(),
      contactoEmergenciaTelefone: contactoEmergenciaTelefone.trim(),
      historicoAnterior: editingAluno?.historicoAnterior || []
    };

    onSalvarAluno(novoAluno);
    setShowAlunoModal(false);
  };

  // Funções de Confirmação de Matrícula (Renovação de Alunos já Cadastrados)
  const handleOpenConfirmacao = () => {
    if (alunos.length === 0) {
      alert('Não há alunos cadastrados no sistema para confirmação de matrícula.');
      return;
    }
    const primeiro = alunos[0];
    setConfirmAlunoId(primeiro.id);
    handleSelectAlunoConfirmacao(primeiro.id);
    setShowConfirmacaoModal(true);
  };

  const handleSelectAlunoConfirmacao = (alunoId: string) => {
    setConfirmAlunoId(alunoId);
    const al = alunos.find(a => a.id === alunoId);
    if (!al) return;
    const turmaAtual = turmas.find(t => t.id === al.turmaId);
    
    // Sugerir progressão de classe (ex: 10ª -> 11ª)
    const classeAtual = al.classeId || turmaAtual?.classe || '1ª';
    const num = parseInt(classeAtual.replace(/\D/g, ''), 10);
    let proxClasse = classeAtual;
    if (!isNaN(num) && num < 13) {
      proxClasse = `${num + 1}ª`;
    }
    setConfirmClasse(proxClasse);

    // Sugerir turma correspondente
    const turmaSugerida = turmas.find(t => t.classe === proxClasse) || turmas[0];
    setConfirmTurmaId(turmaSugerida?.id || turmas[0]?.id || '');
    setConfirmTurno(turmaSugerida?.turno || al.periodo || 'Manhã');
    setConfirmCurso(al.curso || turmaSugerida?.curso || '');
    setConfirmCodigoMatricula(al.codigoMatricula || `2026/MED-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleExecutarConfirmacao = (e: React.FormEvent) => {
    e.preventDefault();
    const al = alunos.find(a => a.id === confirmAlunoId);
    if (!al) return;

    const turmaNova = turmas.find(t => t.id === confirmTurmaId);
    const turmaAnterior = turmas.find(t => t.id === al.turmaId)?.nome || al.classeId;

    const alunoAtualizado: Aluno = {
      ...al,
      classeId: confirmClasse,
      turmaId: confirmTurmaId,
      periodo: confirmTurno === 'Manhã' ? 'Matinal' : confirmTurno === 'Tarde' ? 'Vespertino' : 'Noturno',
      curso: confirmCurso || al.curso,
      codigoMatricula: confirmCodigoMatricula.trim() || al.codigoMatricula,
      estado: 'Ativo',
      anoMatricula: '2025/2026',
      propinaStatus: 'Regularizada'
    };

    onSalvarAluno(alunoAtualizado);
    setShowConfirmacaoModal(false);
    setAlunoConfirmadoComprovativo({
      aluno: alunoAtualizado,
      turmaAnterior,
      turmaNova
    });
    setShowComprovativoModal(true);
  };

  // Exportar Lista Completa de Alunos com Todos os Dados Pessoais, Saúde, Todas as Notas e Médias em Excel (.xlsx)
  const handleExportarAlunosXLSX = () => {
    const notasCons = dbService.getNotasConsolidadas();
    const disciplinas = dbService.getDisciplinas();

    const linhas = alunos.map((a, idx) => {
      const t = turmas.find(tm => tm.id === a.turmaId);
      
      // Notas do aluno
      const notasAluno = notasCons.filter(n => n.alunoId === a.id);
      
      // Médias trimestrais
      const notasT1 = notasAluno.filter(n => n.trimestre === '1' || (n.trimestre as string) === '1º');
      const notasT2 = notasAluno.filter(n => n.trimestre === '2' || (n.trimestre as string) === '2º');
      const notasT3 = notasAluno.filter(n => n.trimestre === '3' || (n.trimestre as string) === '3º');

      const calcMedia = (lista: typeof notasAluno) => {
        if (lista.length === 0) return '—';
        const soma = lista.reduce((acc, curr) => acc + (curr.mediaTrimestral || curr.provaTrimestral || curr.mac || 0), 0);
        return Number((soma / lista.length).toFixed(1));
      };

      const mt1Geral = calcMedia(notasT1);
      const mt2Geral = calcMedia(notasT2);
      const mt3Geral = calcMedia(notasT3);

      // Média Final Geral do Aluno
      let mediaFinalGeral: number | string = '—';
      const mediasValidas = [mt1Geral, mt2Geral, mt3Geral].filter(m => typeof m === 'number') as number[];
      if (mediasValidas.length > 0) {
        mediaFinalGeral = Number((mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1));
      }

      // Resultado Oficial MED
      let resultadoFinal = a.estado === 'Desistente' ? 'Desistente' : 'Em Avaliação';
      if (typeof mediaFinalGeral === 'number') {
        resultadoFinal = mediaFinalGeral >= 9.5 ? 'Aprovado' : mediaFinalGeral >= 7 ? 'Recurso' : 'Não Aprovado';
      }

      // Total de Faltas
      const totalFaltas = notasAluno.reduce((acc, curr) => acc + (curr.faltas || 0), 0);

      // Calcular idade
      let idadeStr = '—';
      if (a.dataNascimento) {
        const anos = new Date().getFullYear() - new Date(a.dataNascimento).getFullYear();
        if (!isNaN(anos)) idadeStr = `${anos} anos`;
      }

      // Detalhes por principais disciplinas angolanas
      const notaDisc = (nomeDisc: string) => {
        const d = disciplinas.find(disc => disc.nome.toLowerCase().includes(nomeDisc.toLowerCase()));
        if (!d) return '—';
        const nAlunoDisc = notasAluno.filter(n => n.disciplinaId === d.id);
        if (nAlunoDisc.length === 0) return '—';
        const soma = nAlunoDisc.reduce((acc, curr) => acc + (curr.notaFinal || curr.mediaTrimestral || 0), 0);
        return Number((soma / nAlunoDisc.length).toFixed(1));
      };

      const notas1T = notasAluno.filter(n => String(n.trimestre).includes('1'));
      const notas2T = notasAluno.filter(n => String(n.trimestre).includes('2'));
      const notas3T = notasAluno.filter(n => String(n.trimestre).includes('3'));

      const mac1 = notas1T.some(n => n.mac !== undefined) ? Number((notas1T.reduce((acc, c) => acc + (c.mac || 0), 0) / Math.max(1, notas1T.filter(n => n.mac !== undefined).length)).toFixed(1)) : '—';
      const npp1 = notas1T.some(n => n.npp !== undefined) ? Number((notas1T.reduce((acc, c) => acc + (c.npp || 0), 0) / Math.max(1, notas1T.filter(n => n.npp !== undefined).length)).toFixed(1)) : '—';
      const npt1 = notas1T.some(n => n.npt !== undefined) ? Number((notas1T.reduce((acc, c) => acc + (c.npt || 0), 0) / Math.max(1, notas1T.filter(n => n.npt !== undefined).length)).toFixed(1)) : '—';

      const mac2 = notas2T.some(n => n.mac !== undefined) ? Number((notas2T.reduce((acc, c) => acc + (c.mac || 0), 0) / Math.max(1, notas2T.filter(n => n.mac !== undefined).length)).toFixed(1)) : '—';
      const npp2 = notas2T.some(n => n.npp !== undefined) ? Number((notas2T.reduce((acc, c) => acc + (c.npp || 0), 0) / Math.max(1, notas2T.filter(n => n.npp !== undefined).length)).toFixed(1)) : '—';
      const npt2 = notas2T.some(n => n.npt !== undefined) ? Number((notas2T.reduce((acc, c) => acc + (c.npt || 0), 0) / Math.max(1, notas2T.filter(n => n.npt !== undefined).length)).toFixed(1)) : '—';

      const mac3 = notas3T.some(n => n.mac !== undefined) ? Number((notas3T.reduce((acc, c) => acc + (c.mac || 0), 0) / Math.max(1, notas3T.filter(n => n.mac !== undefined).length)).toFixed(1)) : '—';
      const npp3 = notas3T.some(n => n.npp !== undefined) ? Number((notas3T.reduce((acc, c) => acc + (c.npp || 0), 0) / Math.max(1, notas3T.filter(n => n.npp !== undefined).length)).toFixed(1)) : '—';
      const npt3 = notas3T.some(n => n.npt !== undefined) ? Number((notas3T.reduce((acc, c) => acc + (c.npt || 0), 0) / Math.max(1, notas3T.filter(n => n.npt !== undefined).length)).toFixed(1)) : '—';

      return {
        // Identificação por Instituição Escolar
        'Instituição Escolar': escola.nomeOficial,
        'Sigla Instituição': escola.sigla || 'MED',
        'Código SIGE': escola.codigoSIGE || escola.codigoMEC || escola.id,
        'Província da Escola': escola.provincia || 'Luanda',
        'Município da Escola': escola.municipio || 'Luanda',
        'Ano Lectivo': a.anoLectivo || t?.anoLectivo || escola.anoLectivoActivo || '2024/2025',

        'Nº': idx + 1,
        'Nº de Matrícula': a.codigoMatricula,
        'Nº de Processo': a.numeroProcesso || a.codigoMatricula || '—',
        'Nome Completo': a.nomeCompleto,
        'Gênero': a.genero === 'M' ? 'Masculino' : 'Feminino',
        'Documento de Identificação': `${a.tipoDocumento || 'BI'} ${a.numeroBI || a.numeroDocumento || ''}`,
        'Data Emissão BI': a.dataEmissaoBI || '—',
        'Arquivo de Identificação': a.arquivoIdentificacao || '—',
        'Data de Nascimento': a.dataNascimento || '—',
        'Idade': idadeStr,
        'Naturalidade': a.naturalidade || '—',
        'Município': a.municipioNascimento || a.municipio || '—',
        'Província de Origem': a.provinciaOrigem || '—',
        'Classe': a.classeId || t?.classe || '',
        'Turma': t?.nome || '',
        'Sala de Aula': getSalaDaTurma(t),
        'Turno': t?.turno || a.periodo || 'Manhã',
        'Curso / Área': a.curso || t?.curso || (isSegundoCiclo(a.classeId || t?.classe) ? 'Ciências Físicas e Biológicas (PUNIV)' : 'Ensino Geral'),
        'Estado da Matrícula': a.estado,
        'Propina': a.propinaStatus || 'Regularizada',
        'Nome do Pai': a.nomePai || '—',
        'Nome da Mãe': a.nomeMae || '—',
        'Nome do Encarregado': a.nomeEncarregado || a.encarregadoNome || '—',
        'Parentesco': a.encarregadoParentesco || '—',
        'Telefone Encarregado': a.telefoneEncarregado || a.encarregadoTelefone || '—',
        'Email Encarregado': a.encarregadoEmail || '—',
        'Endereço Residencial': a.endereco || '—',
        'Foto Registada': a.fotoUrl ? 'Sim' : 'Não',
        // Saúde e Dados Médicos
        'Grupo Sanguíneo': a.grupoSanguineo || 'Não Informado',
        'Alergias': a.alergias || 'Nenhuma',
        'Doenças Crónicas': a.doencasCronicas || 'Nenhuma',
        'Necessidades Especiais': a.necessidadesEspeciais || a.condicaoEspecial || 'Nenhuma',
        'Restrição Ed. Física': a.restricaoEducacaoFisica ? 'Sim (Dispensado)' : 'Apto',
        'Contacto Emergência (Nome)': a.contactoEmergenciaNome || '—',
        'Contacto Emergência (Telefone)': a.contactoEmergenciaTelefone || '—',
        // Notas Detalhadas dos 3 Trimestres
        '1º Tri - MAC': mac1,
        '1º Tri - NPP': npp1,
        '1º Tri - NPT': npt1,
        'Média 1º Trimestre (MT1)': mt1Geral,
        '2º Tri - MAC': mac2,
        '2º Tri - NPP': npp2,
        '2º Tri - NPT': npt2,
        'Média 2º Trimestre (MT2)': mt2Geral,
        '3º Tri - MAC': mac3,
        '3º Tri - NPP': npp3,
        '3º Tri - NPT': npt3,
        'Média 3º Trimestre (MT3)': mt3Geral,
        'Média Final Geral (MF)': mediaFinalGeral,
        'Classificação Final': resultadoFinal,
        'Total de Faltas': totalFaltas,
        'Comportamento': a.comportamentoConceito || (notasAluno[0]?.comportamentoConceito) || 'Muito Bom',
        // Notas Médias por Disciplina
        'Língua Portuguesa (MF)': notaDisc('Língua Portuguesa'),
        'Matemática (MF)': notaDisc('Matemática'),
        'Física (MF)': notaDisc('Física'),
        'Química (MF)': notaDisc('Química'),
        'Biologia (MF)': notaDisc('Biologia'),
        'História (MF)': notaDisc('História'),
        'Geografia (MF)': notaDisc('Geografia'),
        'Língua Inglesa (MF)': notaDisc('Inglesa'),
        'Língua Francesa (MF)': notaDisc('Francesa'),
        'Educação Física (MF)': notaDisc('Educação Física'),
        'Informática (MF)': notaDisc('Informática')
      };
    });

    downloadExcelFile('Alunos_Completos_Notas_Medias', linhas, `Lista_Completa_Estudantes_Notas_Medias_MED_${new Date().getFullYear()}.xlsx`);
  };

  const handleToggleEstado = (aluno: Aluno, novoEstado: EstadoAluno) => {
    onSalvarAluno({
      ...aluno,
      estado: novoEstado
    });
  };

  // Funções do Histórico Escolar Completo
  const handleAdicionarDisciplinaNaClasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const nota = parseFloat(novaDiscNota) || 10;
    const resultado = nota >= 10 ? 'Aprovado' : 'Não Transita';

    const novaDisc: NotaFinalDisciplinaHistorico = {
      disciplinaNome: novaDiscNome.trim(),
      notaFinal: nota,
      resultado: resultado as any,
      professorNome: novoProfessorNome.trim() || undefined
    };

    // Atualiza ou insere disciplina
    const notasAtualizadas = [...classeAtual.notasDisciplinas];
    const idxExistente = notasAtualizadas.findIndex(d => d.disciplinaNome.toLowerCase() === novaDisc.disciplinaNome.toLowerCase());
    if (idxExistente >= 0) {
      notasAtualizadas[idxExistente] = novaDisc;
    } else {
      notasAtualizadas.push(novaDisc);
    }

    // Recalcula média geral da classe
    const somaNotas = notasAtualizadas.reduce((acc, d) => acc + d.notaFinal, 0);
    const mediaGeralClasse = parseFloat((somaNotas / (notasAtualizadas.length || 1)).toFixed(1));

    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      notasDisciplinas: notasAtualizadas,
      mediaGeralClasse
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);

    // Sincronizar também com historicoAnterior do Aluno para manter elegibilidade do certificado MED
    const historicoAnteriorSincronizado: HistoricoAnoAnterior[] = classesAtualizadas.map(c => ({
      classe: c.classe,
      anoLectivo: c.anoLectivo,
      escolaOrigem: c.escolaOrigem,
      mediaFinal: c.mediaGeralClasse || 10,
      aprovado: (c.mediaGeralClasse || 10) >= 10,
      concluido: true
    }));

    const alunoAtualizado: Aluno = {
      ...historicoAluno,
      historicoAnterior: historicoAnteriorSincronizado
    };
    onSalvarAluno(alunoAtualizado);
    setHistoricoAluno(alunoAtualizado);

    setNovoProfessorNome('');
  };

  const handleRemoverDisciplina = (idxDisc: number) => {
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const notasAtualizadas = classeAtual.notasDisciplinas.filter((_, i) => i !== idxDisc);
    const somaNotas = notasAtualizadas.reduce((acc, d) => acc + d.notaFinal, 0);
    const mediaGeralClasse = notasAtualizadas.length > 0 
      ? parseFloat((somaNotas / notasAtualizadas.length).toFixed(1)) 
      : 0;

    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      notasDisciplinas: notasAtualizadas,
      mediaGeralClasse
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);

    // Sincronizar aluno
    const historicoAnteriorSincronizado: HistoricoAnoAnterior[] = classesAtualizadas.map(c => ({
      classe: c.classe,
      anoLectivo: c.anoLectivo,
      escolaOrigem: c.escolaOrigem,
      mediaFinal: c.mediaGeralClasse || 10,
      aprovado: (c.mediaGeralClasse || 10) >= 10,
      concluido: true
    }));
    const alunoAtualizado = { ...historicoAluno, historicoAnterior: historicoAnteriorSincronizado };
    onSalvarAluno(alunoAtualizado);
    setHistoricoAluno(alunoAtualizado);
  };

  // Alteração direta e rápida de nota final da disciplina na tabela
  const handleAlterarNotaDisciplina = (idxDisc: number, novoValorStr: string) => {
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const escalaInfo = obterInformacaoEscala(classeAtual.classe);
    let valor = parseFloat(novoValorStr);
    if (isNaN(valor)) valor = 0;
    if (valor < 0) valor = 0;
    if (valor > escalaInfo.escalaMaxima) valor = escalaInfo.escalaMaxima;

    const notasAtualizadas = [...classeAtual.notasDisciplinas];
    notasAtualizadas[idxDisc] = {
      ...notasAtualizadas[idxDisc],
      notaFinal: valor,
      resultado: valor >= escalaInfo.notaAprovacao ? 'Aprovado' : 'Não Transita'
    };

    const somaNotas = notasAtualizadas.reduce((acc, d) => acc + d.notaFinal, 0);
    const mediaGeralClasse = notasAtualizadas.length > 0 
      ? parseFloat((somaNotas / notasAtualizadas.length).toFixed(1)) 
      : 0;

    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      notasDisciplinas: notasAtualizadas,
      mediaGeralClasse
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);

    // Sincronizar aluno
    const historicoAnteriorSincronizado: HistoricoAnoAnterior[] = classesAtualizadas.map(c => {
      const eInfo = obterInformacaoEscala(c.classe);
      return {
        classe: c.classe,
        anoLectivo: c.anoLectivo,
        escolaOrigem: c.escolaOrigem,
        mediaFinal: c.mediaGeralClasse || eInfo.notaAprovacao,
        aprovado: (c.mediaGeralClasse || 0) >= eInfo.notaAprovacao,
        concluido: true
      };
    });
    const alunoAtualizado = { ...historicoAluno, historicoAnterior: historicoAnteriorSincronizado };
    onSalvarAluno(alunoAtualizado);
    setHistoricoAluno(alunoAtualizado);
  };

  // Carregar toda a matriz de disciplinas curriculares da classe num só clique
  const handleCarregarCurriculoPadrao = () => {
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const escalaInfo = obterInformacaoEscala(classeAtual.classe);
    const listaPadrao = CURRICULO_POR_CLASSE[classeAtual.classe] || CURRICULO_POR_CLASSE['7ª'] || DISCIPLINAS_ANGOLA_PADRAO.slice(0, 8);

    const notasAtualizadas = [...classeAtual.notasDisciplinas];
    const nomesExistentes = notasAtualizadas.map(d => d.disciplinaNome.toLowerCase());

    listaPadrao.forEach(discNome => {
      if (!nomesExistentes.includes(discNome.toLowerCase())) {
        notasAtualizadas.push({
          disciplinaNome: discNome,
          notaFinal: escalaInfo.notaAprovacao,
          resultado: 'Aprovado'
        });
      }
    });

    const somaNotas = notasAtualizadas.reduce((acc, d) => acc + d.notaFinal, 0);
    const mediaGeralClasse = parseFloat((somaNotas / (notasAtualizadas.length || 1)).toFixed(1));

    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      notasDisciplinas: notasAtualizadas,
      mediaGeralClasse
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);

    const historicoAnteriorSincronizado: HistoricoAnoAnterior[] = classesAtualizadas.map(c => {
      const eInfo = obterInformacaoEscala(c.classe);
      return {
        classe: c.classe,
        anoLectivo: c.anoLectivo,
        escolaOrigem: c.escolaOrigem,
        mediaFinal: c.mediaGeralClasse || eInfo.notaAprovacao,
        aprovado: (c.mediaGeralClasse || 0) >= eInfo.notaAprovacao,
        concluido: true
      };
    });

    const alunoAtualizado: Aluno = {
      ...historicoAluno,
      historicoAnterior: historicoAnteriorSincronizado
    };
    onSalvarAluno(alunoAtualizado);
    setHistoricoAluno(alunoAtualizado);
  };

  // Exportar histórico escolar em Excel (.xlsx)
  const handleExportarHistoricoExcel = () => {
    if (!historicoCompleto || !historicoAluno) return;
    const wb = XLSX.utils.book_new();

    historicoCompleto.classes.forEach(c => {
      const eInfo = obterInformacaoEscala(c.classe);
      const rows = c.notasDisciplinas.map((d, idx) => ({
        'Nº': idx + 1,
        'Classe': c.classe,
        'Ano Lectivo': c.anoLectivo,
        'Escola de Origem': c.escolaOrigem || '',
        'Disciplina Curricular': d.disciplinaNome,
        'Nota Final': d.notaFinal,
        'Escala Oficial': eInfo.rotuloEscala,
        'Resultado': d.resultado,
        'Por Extenso': converterNotaParaCertificadoExtenso(d.notaFinal)
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `${c.classe.replace(/[^a-zA-Z0-9]/g, '')}_Classe`);
    });

    const safeName = historicoAluno.nomeCompleto.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Historico_Escolar_${safeName}.xlsx`);
  };

  const handleCriarNovaClasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historicoCompleto || !historicoAluno) return;

    const novaClasse: HistoricoClasseDisciplinas = {
      classe: novaClasseNome.trim(),
      anoLectivo: novaClasseAno.trim(),
      escolaOrigem: novaClasseEscola.trim(),
      mediaGeralClasse: 14.0,
      notasDisciplinas: [
        { disciplinaNome: 'Língua Portuguesa', notaFinal: 14, resultado: 'Aprovado' },
        { disciplinaNome: 'Matemática', notaFinal: 14, resultado: 'Aprovado' }
      ]
    };

    const classesAtualizadas = [...historicoCompleto.classes, novaClasse];
    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);
    setClasseAtivaIdx(classesAtualizadas.length - 1);
    setShowAddClasseForm(false);

    // Sincronizar aluno
    const historicoAnteriorSincronizado: HistoricoAnoAnterior[] = classesAtualizadas.map(c => ({
      classe: c.classe,
      anoLectivo: c.anoLectivo,
      escolaOrigem: c.escolaOrigem,
      mediaFinal: c.mediaGeralClasse || 10,
      aprovado: (c.mediaGeralClasse || 10) >= 10,
      concluido: true
    }));
    const alunoAtualizado = { ...historicoAluno, historicoAnterior: historicoAnteriorSincronizado };
    onSalvarAluno(alunoAtualizado);
    setHistoricoAluno(alunoAtualizado);
  };

  const handleRemoverClasse = (idxClasse: number) => {
    if (!historicoCompleto || !historicoAluno) return;
    if (historicoCompleto.classes.length <= 1) {
      alert('O histórico escolar deve conter pelo menos uma classe registada.');
      return;
    }
    if (!confirm('Deseja realmente remover esta classe do histórico escolar do aluno?')) return;

    const classesAtualizadas = historicoCompleto.classes.filter((_, i) => i !== idxClasse);
    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);
    setClasseAtivaIdx(0);

    const historicoAnteriorSincronizado: HistoricoAnoAnterior[] = classesAtualizadas.map(c => ({
      classe: c.classe,
      anoLectivo: c.anoLectivo,
      escolaOrigem: c.escolaOrigem,
      mediaFinal: c.mediaGeralClasse || 10,
      aprovado: (c.mediaGeralClasse || 10) >= 10,
      concluido: true
    }));
    const alunoAtualizado = { ...historicoAluno, historicoAnterior: historicoAnteriorSincronizado };
    onSalvarAluno(alunoAtualizado);
    setHistoricoAluno(alunoAtualizado);
  };

  // Adicionar acontecimento / ocorrência escolar registada por coordenadores ou professores
  const handleAdicionarOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    if (!novaOcorrDescricao.trim()) return;

    const novaOcorr: OcorrenciaHistoricoAluno = {
      id: `ocorr-${Date.now()}`,
      data: novaOcorrData,
      tipo: novaOcorrTipo,
      descricao: novaOcorrDescricao.trim(),
      registadoPor: novaOcorrRegistadoPor.trim() || 'Coordenação Pedagógica',
      cargo: novaOcorrCargo,
      anoLectivo: classeAtual.anoLectivo,
      classe: classeAtual.classe,
      resolucao: novaOcorrResolucao.trim() || 'Averbado no processo escolar do estudante.'
    };

    const ocorrenciasAtualizadas = [novaOcorr, ...(classeAtual.ocorrencias || [])];
    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      ocorrencias: ocorrenciasAtualizadas
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);
    setNovaOcorrDescricao('');
    setNovaOcorrRegistadoPor('');
    setNovaOcorrResolucao('');
    setShowNovaOcorrenciaForm(false);
  };

  const handleRemoverOcorrencia = (idOcorr: string) => {
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const ocorrenciasAtualizadas = (classeAtual.ocorrencias || []).filter(o => o.id !== idOcorr);
    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      ocorrencias: ocorrenciasAtualizadas
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);
  };

  const handleSalvarFaltas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const totalAulas = classeAtual.faltas?.totalAulasPrevistas || 720;
    const totalFaltas = Number(formFaltasJust) + Number(formFaltasInjust);
    const presencas = Math.max(0, totalAulas - totalFaltas);
    const percentual = Number(((presencas / totalAulas) * 100).toFixed(1));

    const novasFaltas: FaltasAnoHistorico = {
      anoLectivo: classeAtual.anoLectivo,
      classe: classeAtual.classe,
      totalAulasPrevistas: totalAulas,
      faltasJustificadas: Number(formFaltasJust),
      faltasInjustificadas: Number(formFaltasInjust),
      totalPresencas: presencas,
      percentualAssiduidade: percentual,
      observacao: formFaltasObs.trim() || 'Assiduidade registada.'
    };

    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      faltas: novasFaltas
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);
    setEditandoFaltas(false);
  };

  const handleSalvarDividas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historicoCompleto || !historicoAluno) return;
    const classeAtual = historicoCompleto.classes[classeAtivaIdx];
    if (!classeAtual) return;

    const novasDividas: DividasAnoHistorico = {
      anoLectivo: classeAtual.anoLectivo,
      classe: classeAtual.classe,
      status: formDividaStatus,
      totalDividaAKZ: Number(formDividaTotal),
      totalPagoAKZ: Number(formDividaPago),
      mesesPendentes: formDividaStatus === 'Regularizado' ? [] : ['Novembro', 'Dezembro'],
      observacoes: formDividaObs.trim() || 'Estado financeiro atualizado pela secretaria.'
    };

    const classesAtualizadas = [...historicoCompleto.classes];
    classesAtualizadas[classeAtivaIdx] = {
      ...classeAtual,
      dividas: novasDividas
    };

    const novoHistorico: HistoricoEscolarCompleto = {
      ...historicoCompleto,
      classes: classesAtualizadas,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    dbService.salvarHistoricoEscolarCompleto(novoHistorico);
    setHistoricoCompleto(novoHistorico);
    setEditandoDividas(false);
  };

  // Consulta no portal público
  const handleConsultar = (e: React.FormEvent) => {
    e.preventDefault();
    const busca = consultaCodigo.toLowerCase().trim();
    const encontrado = alunos.find(a => 
      a.codigoMatricula.toLowerCase().trim() === busca ||
      (a.numeroDocumento || a.numeroBI || '').toLowerCase().trim() === busca
    );
    setResultadoConsulta(encontrado || null);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestão de Estudantes & Matrículas</h2>
          <p className="text-xs text-gray-500">Mapeamento em conformidade com as normas do MED Angola</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportarAlunosXLSX}
            className="px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Baixar lista completa de estudantes com todos os dados pessoais, saúde, notas e médias em Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Baixar Alunos com Notas e Médias (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublicPortal(true)}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border-2 border-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Search className="h-4 w-4 text-blue-600" />
            <span>Portal dos Pais</span>
          </button>

          <button
            type="button"
            onClick={handleOpenConfirmacao}
            className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 border-2 border-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <FileCheck2 className="h-4 w-4 text-emerald-700" />
            <span>Confirmar Matrícula (Alunos Existentes)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Matricular Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* Abas Principais: Quadro Geral de Estudantes vs Ranking Oficial de Desempenho */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 no-print">
        <button
          type="button"
          onClick={() => setAbaAtiva('lista')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            abaAtiva === 'lista'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Quadro Geral de Estudantes ({alunos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('ranking')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            abaAtiva === 'ranking'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Ranking de Desempenho (Top 5 & Menor Rendimento)</span>
        </button>
      </div>

      {abaAtiva === 'ranking' ? (
        <StudentRankingSection 
          escola={escola} 
          alunos={alunos} 
          turmas={turmas} 
          isDiretorPanel={false} 
        />
      ) : (
        <>
          {/* Filter Bar com Hierarquia Coerente: Classe -> Turma -> Sala -> Curso e Proteções Anti-DDoS/ReDoS */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-900">Pesquisa Coerente & Filtros Acadêmicos:</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Classe • Turma • Sala {selectedClasseFilter !== 'TODAS' && isSegundoCiclo(selectedClasseFilter) ? '• Curso (2º Ciclo)' : ''}
            </span>
          </div>
          <span className="text-[11px] text-gray-500">
            Mostrando <strong>{filteredAlunos.length}</strong> de {alunos.length} estudantes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Pesquisa Sanitizada com Debounce e Proteção Anti-ReDoS */}
          <div className="relative sm:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(sanitizeSearchInput(e.target.value, 100))}
              placeholder="Pesquisar estudante, nº matrícula, BI, sala ou curso..."
              maxLength={100}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* 2. Seleção de Classe */}
          <div>
            <select
              value={selectedClasseFilter}
              onChange={(e) => {
                const novaClasse = e.target.value;
                setSelectedClasseFilter(novaClasse);
                if (novaClasse !== 'TODAS') {
                  const turmasValidas = getTurmasPorClasse(turmas, novaClasse);
                  if (turmasValidas.length > 0 && !turmasValidas.some(t => t.id === selectedTurmaFilter)) {
                    setSelectedTurmaFilter('TODAS');
                  }
                }
              }}
              className="w-full py-2 px-3 text-xs font-bold text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="TODAS">Todas as Classes</option>
              {todasClasses.map(c => (
                <option key={`flt-cls-${c}`} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. Seleção de Turma (Filtrada dinamicamente pela Classe) */}
          <div>
            <select
              value={selectedTurmaFilter}
              onChange={(e) => setSelectedTurmaFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs font-bold text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="TODAS">
                {selectedClasseFilter !== 'TODAS' ? `Todas as Turmas (${selectedClasseFilter})` : 'Todas as Turmas'}
              </option>
              {turmasDoFiltro.map(t => (
                <option key={`flt-turma-${t.id}`} value={t.id}>
                  {t.nome} ({t.sala || 'Sala'})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Seleção de Sala */}
          <div>
            <select
              value={selectedSalaFilter}
              onChange={(e) => setSelectedSalaFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold text-gray-800 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="TODAS">Todas as Salas</option>
              {todasSalas.map(s => (
                <option key={`flt-sala-${s}`} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha Opcional para Curso (2º Ciclo) e Estado do Aluno */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Seletor de Curso para o 2º Ciclo */}
          <div>
            <select
              value={selectedCursoFilter}
              onChange={(e) => setSelectedCursoFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-gray-800"
            >
              <option value="TODOS">Todos os Cursos (2º Ciclo & Geral)</option>
              {CURSOS_SEGUNDO_CICLO.map(c => (
                <option key={`flt-curso-${c}`} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Seletor de Estado */}
          <div>
            <select
              value={selectedEstadoFilter}
              onChange={(e) => setSelectedEstadoFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-gray-800"
            >
              <option value="TODOS">Todos os Estados de Matrícula</option>
              <option value="Ativo">Apenas Ativos</option>
              <option value="Desistente">Apenas Desistentes</option>
              <option value="Transferido">Apenas Transferidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlunos.map((aluno) => {
          const turma = turmas.find(t => t.id === aluno.turmaId);
          const ehClasseFinal = turmasFinais.includes(aluno.classeId);
          const elegivelCertificado = validarElegibilidadeCertificado(aluno);
          const generoInfo = formatarTextoPorGenero(aluno.genero);

          return (
            <div 
              key={aluno.id}
              className={`bg-white rounded-xl border-2 p-4 space-y-3 shadow-2xs transition-shadow ${
                aluno.estado === 'Ativo' ? 'border-gray-200 hover:border-blue-400' : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={aluno.fotoUrl}
                    alt={aluno.nomeCompleto}
                    className="h-12 w-12 rounded-full object-cover border-2 border-blue-600"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 leading-snug">{aluno.nomeCompleto}</h3>
                    <p className="text-[11px] text-gray-500 font-mono">{aluno.codigoMatricula}</p>
                    <span className="text-[10px] text-blue-700 font-semibold">{generoInfo.artigoDefinido} Estudante</span>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <select
                    value={aluno.estado}
                    onChange={(e) => handleToggleEstado(aluno, e.target.value as EstadoAluno)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                      aluno.estado === 'Ativo'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : aluno.estado === 'Desistente'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Desistente">Desistente</option>
                    <option value="Transferido">Transferido</option>
                  </select>
                </div>
              </div>

              {/* Informações acadêmicas coerentes MED: Classe • Turma • Sala • Curso */}
              <div className="text-xs text-gray-600 space-y-1 pt-1 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span>Classe / Turma:</span>
                  <strong className="text-gray-900">{aluno.classeId || turma?.classe} • {turma?.nome}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Sala de Aula:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                    {getSalaDaTurma(turma)} ({turma?.turno || 'Manhã'})
                  </span>
                </div>
                {isSegundoCiclo(aluno.classeId || turma?.classe) && (
                  <div className="flex justify-between items-center">
                    <span>Curso (2º Ciclo):</span>
                    <span 
                      className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px] border border-purple-200 truncate max-w-[170px]"
                      title={aluno.curso || turma?.curso || 'Ciências Físicas e Biológicas (PUNIV)'}
                    >
                      {aluno.curso || turma?.curso || 'Ciências Físicas e Biológicas (PUNIV)'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Documento:</span>
                  <span className="font-mono text-gray-800">{aluno.tipoDocumento} nº {aluno.numeroDocumento}</span>
                </div>
                <div className="flex justify-between">
                  <span>Encarregado:</span>
                  <span className="text-gray-800 truncate max-w-[150px]">{aluno.nomeEncarregado}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contacto:</span>
                  <span className="text-gray-800">{aluno.telefoneEncarregado}</span>
                </div>
              </div>

              {/* Verificação Inteligente de Histórico para Classes Finais */}
              {ehClasseFinal && (
                <div className={`p-2.5 rounded-lg border text-[11px] ${
                  elegivelCertificado.elegivel 
                    ? 'bg-green-50 border-green-300 text-green-800' 
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>Certificado MED ({aluno.classeId} Classe):</span>
                    <span>{elegivelCertificado.elegivel ? 'Desbloqueado' : 'Bloqueado'}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-tight">
                    {elegivelCertificado.mensagem}
                  </p>
                  <button
                    onClick={() => handleOpenHistoricoModal(aluno)}
                    className="mt-2 w-full py-1 text-center font-bold text-xs text-blue-700 bg-white border border-blue-400 rounded hover:bg-blue-50 inline-flex items-center justify-center space-x-1"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                    <span>Notas Finais de Cada Disciplina</span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-1.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectAlunoConfirmacao(aluno.id);
                    setShowConfirmacaoModal(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg inline-flex items-center space-x-1 cursor-pointer"
                  title="Confirmar ou renovar matrícula deste estudante"
                >
                  <FileCheck2 className="h-3 w-3 text-emerald-600" />
                  <span>Confirmar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenHistoricoModal(aluno)}
                  className="px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 rounded inline-flex items-center space-x-1"
                >
                  <BookOpen className="h-3 w-3" />
                  <span>Histórico</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(aluno)}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded"
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Modal Matricular / Editar Aluno - Formulário Completo Oficial MED */}
      {showAlunoModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 border-2 border-blue-600 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-3 border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingAluno ? 'Atualização de Dados do Estudante' : 'Ficha Oficial de Matrícula e Cadastro (MED Angola)'}
                </h3>
                <p className="text-xs text-gray-500">Registo oficial com fotografia, filiação e dados civis completos</p>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md">
                {editingAluno ? editingAluno.codigoMatricula : 'Novo Processo'}
              </span>
            </div>

            <form onSubmit={handleSaveAluno} className="space-y-5 text-xs">
              {/* 1. SELEÇÃO DE FOTO DO DISPOSITIVO */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="font-bold text-gray-800 block mb-2">Fotografia Tipo Passe do Estudante</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {fotoUrl ? (
                    <div className="relative group">
                      <img 
                        src={fotoUrl} 
                        alt="Foto do Aluno" 
                        className="h-24 w-24 rounded-xl object-cover border-2 border-blue-600 shadow-sm" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setFotoUrl('')} 
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                        title="Remover fotografia"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-gray-200 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-500">
                      <Camera className="h-8 w-8 text-gray-400 mb-1" />
                      <span className="text-[10px] font-semibold">Sem Foto</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <label className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs transition-colors">
                        <Upload className="h-4 w-4" />
                        <span>Selecionar Foto no Dispositivo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFotoUpload} 
                          className="hidden" 
                        />
                      </label>

                      {fotoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setFotoUrl('')} 
                          className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                        >
                          Limpar Foto
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Selecione uma imagem do seu telefone ou computador (PNG, JPG, máx. 5MB). Esta foto constará nos cartões escolares e boletins oficiais.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. DADOS PESSOAIS E IDENTIFICAÇÃO */}
              <div>
                <h4 className="font-bold text-gray-800 text-sm mb-2 text-blue-900 border-b pb-1">1. Identificação Civil & Escolar</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Nome Completo do Aluno *</label>
                    <input
                      type="text"
                      required
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      placeholder="Ex: Ana Paula Afonso Ndilu"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Gênero *</label>
                    <select
                      value={genero}
                      onChange={(e) => setGenero(e.target.value as Genero)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="M">Masculino (O Aluno / Aprovado)</option>
                      <option value="F">Feminino (A Aluna / Aprovada)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Tipo de Documento *</label>
                    <select
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="BI">Bilhete de Identidade (BI)</option>
                      <option value="Cédula">Cédula Pessoal</option>
                      <option value="Passaporte">Passaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Número do Documento *</label>
                    <input
                      type="text"
                      required
                      value={numeroDocumento}
                      onChange={(e) => setNumeroDocumento(e.target.value)}
                      placeholder="Ex: 005819234ZE048"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <AngolaDateInput
                      label="Data de Emissão do BI"
                      value={dataEmissaoBI}
                      onChange={setDataEmissaoBI}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Arquivo / Conservatória de Identificação</label>
                    <input
                      type="text"
                      value={arquivoIdentificacao}
                      onChange={(e) => setArquivoIdentificacao(e.target.value)}
                      placeholder="Ex: Arquivo de Identificação de Luanda"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <AngolaDateInput
                      label="Data de Nascimento"
                      required
                      value={dataNascimento}
                      onChange={setDataNascimento}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Naturalidade</label>
                    <input
                      type="text"
                      value={naturalidade}
                      onChange={(e) => setNaturalidade(e.target.value)}
                      placeholder="Ex: Mbanza Kongo"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <LocationPicker
                      provinciaSelecionada={provinciaOrigem || 'Luanda'}
                      onProvinciaChange={setProvinciaOrigem}
                      municipioSelecionado={municipioNascimento || 'Luanda'}
                      onMunicipioChange={setMunicipioNascimento}
                    />
                  </div>
                </div>
              </div>

              {/* 2. DADOS ESCOLARES & TURMA COM ASSOCIAÇÃO COERENTE CLASSE -> TURMA -> SALA -> CURSO */}
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2 border-gray-200">
                  <h4 className="font-bold text-gray-800 text-sm text-blue-900">
                    2. Enquadramento Escolar & Matrícula Oficial (MED Angola)
                  </h4>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 self-start sm:self-auto">
                    Associação Estrita: Classe • Turma • Sala {isSegundoCiclo(modalClasse) ? '• Curso' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nº de Matrícula *</label>
                    <input
                      type="text"
                      required
                      value={codigoMatricula}
                      onChange={(e) => setCodigoMatricula(sanitizeSearchInput(e.target.value, 40))}
                      placeholder="Ex: 2026/MED-7419"
                      className="w-full p-2 border border-blue-500 bg-blue-50/60 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono font-bold text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">1º Passo: Classe do Aluno *</label>
                    <select
                      value={modalClasse}
                      onChange={(e) => {
                        const novaClasse = e.target.value;
                        setModalClasse(novaClasse);
                        const turmasDaNovaCls = getTurmasPorClasse(turmas, novaClasse);
                        if (turmasDaNovaCls.length > 0) {
                          setTurmaId(turmasDaNovaCls[0].id);
                          if (turmasDaNovaCls[0].curso) {
                            setModalCurso(turmasDaNovaCls[0].curso);
                          }
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold bg-white"
                    >
                      {todasClasses.map(c => (
                        <option key={`modal-cls-opt-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">2º Passo: Turma da {modalClasse} *</label>
                    <select
                      value={turmaId}
                      onChange={(e) => {
                        const tId = e.target.value;
                        setTurmaId(tId);
                        const tSel = turmas.find(t => t.id === tId);
                        if (tSel?.curso) setModalCurso(tSel.curso);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold bg-white"
                    >
                      {turmasDoModal.length === 0 ? (
                        <option value="">Nenhuma turma para {modalClasse}</option>
                      ) : (
                        turmasDoModal.map(t => (
                          <option key={`modal-t-${t.id}`} value={t.id}>
                            {t.nome} ({t.turno})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Sala Associada (Automática)</label>
                    <div className="w-full p-2 border border-gray-200 bg-white rounded-md text-xs font-bold text-blue-800 flex items-center justify-between shadow-2xs">
                      <span>{getSalaDaTurma(turmaSelecionadaModal)}</span>
                      <span className="text-[10px] text-gray-500 font-normal">Cap: {turmaSelecionadaModal?.capacidade || 45} vagas</span>
                    </div>
                  </div>
                </div>

                {/* Bloco Obrigatório do 2º Ciclo: Associação de Curso e Disciplinas da Matriz */}
                {isSegundoCiclo(modalClasse) && (
                  <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-purple-900 block">
                          3º Passo Obrigatório (2º Ciclo): Curso Curricular
                        </span>
                        <span className="text-[11px] text-purple-700">
                          Vinculação indispensável para emissão de pautas e certificados de conclusão (10ª à 13ª classe)
                        </span>
                      </div>
                      <select
                        value={modalCurso}
                        onChange={(e) => setModalCurso(e.target.value)}
                        className="text-xs font-bold p-2 border border-purple-300 rounded-md bg-white text-purple-900"
                      >
                        {CURSOS_SEGUNDO_CICLO.map(c => (
                          <option key={`modal-cr-${c}`} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-purple-200 text-[11px] text-purple-900">
                      <strong>Matriz Oficial de Disciplinas da {modalClasse} ({modalCurso}):</strong>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {getDisciplinasMatrizOficial(modalClasse, modalCurso).map(d => (
                          <span key={d} className="px-2 py-0.5 bg-white text-purple-900 rounded-md border border-purple-200 font-medium text-[10px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nº de Processo Individual</label>
                    <input
                      type="text"
                      value={numeroProcesso}
                      onChange={(e) => setNumeroProcesso(sanitizeSearchInput(e.target.value, 40))}
                      placeholder="Ex: PROC-7419"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Estado da Matrícula</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value as EstadoAluno)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold bg-white"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Desistente">Desistente</option>
                      <option value="Transferido">Transferido</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. FILIAÇÃO E ENCARREGADO DE EDUCAÇÃO */}
              <div>
                <h4 className="font-bold text-gray-800 text-sm mb-2 text-blue-900 border-b pb-1">3. Filiação & Encarregado de Educação</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nome do Pai</label>
                    <input
                      type="text"
                      value={nomePai}
                      onChange={(e) => setNomePai(e.target.value)}
                      placeholder="Ex: Afonso Ndilu"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nome da Mãe</label>
                    <input
                      type="text"
                      value={nomeMae}
                      onChange={(e) => setNomeMae(e.target.value)}
                      placeholder="Ex: Maria António Ndilu"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nome do Encarregado de Educação *</label>
                    <input
                      type="text"
                      required
                      value={nomeEncarregado}
                      onChange={(e) => setNomeEncarregado(e.target.value)}
                      placeholder="Ex: Afonso Ndilu"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Grau de Parentesco</label>
                    <select
                      value={encarregadoParentesco}
                      onChange={(e) => setEncarregadoParentesco(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Pai">Pai</option>
                      <option value="Mãe">Mãe</option>
                      <option value="Tio(a)">Tio(a)</option>
                      <option value="Avô(ó)">Avô(ó)</option>
                      <option value="Irmão(ã)">Irmão(ã)</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Telefone do Encarregado *</label>
                    <input
                      type="text"
                      required
                      value={telefoneEncarregado}
                      onChange={(e) => setTelefoneEncarregado(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Email do Encarregado (opcional)</label>
                    <input
                      type="email"
                      value={encarregadoEmail}
                      onChange={(e) => setEncarregadoEmail(e.target.value)}
                      placeholder="encarregado@exemplo.com"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Endereço Residencial / Bairro</label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Ex: Rua Direita do Zaire, Casa 45, Luanda"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. DADOS MÉDICOS E DE SAÚDE DO ESTUDANTE */}
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-3">
                <h4 className="font-bold text-red-950 text-sm mb-2 border-b border-red-200 pb-1 flex items-center space-x-2">
                  <HeartPulse className="h-4 w-4 text-red-600" />
                  <span>4. Ficha Médica e Dados de Saúde do Estudante</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Grupo Sanguíneo</label>
                    <select
                      value={grupoSanguineo}
                      onChange={(e) => setGrupoSanguineo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md font-bold text-red-700 bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    >
                      <option value="O+">O+ (Dador Universal O Positivo)</option>
                      <option value="O-">O- (O Negativo)</option>
                      <option value="A+">A+ (A Positivo)</option>
                      <option value="A-">A- (A Negativo)</option>
                      <option value="B+">B+ (B Positivo)</option>
                      <option value="B-">B- (B Negativo)</option>
                      <option value="AB+">AB+ (Recetor Universal AB Positivo)</option>
                      <option value="AB-">AB- (AB Negativo)</option>
                      <option value="Não Sabido">Não Sabido / A Testar</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Alergias Conhecidas</label>
                    <input
                      type="text"
                      value={alergias}
                      onChange={(e) => setAlergias(e.target.value)}
                      placeholder="Ex: Penicilina, Pólen, Amendoim, Nenhuma"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Doenças Crónicas / Cuidados Médicos</label>
                    <input
                      type="text"
                      value={doencasCronicas}
                      onChange={(e) => setDoencasCronicas(e.target.value)}
                      placeholder="Ex: Asma, Diabetes, Epilepsia, Nenhuma"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Necessidades Especiais / Condição</label>
                    <input
                      type="text"
                      value={condicaoEspecial}
                      onChange={(e) => setCondicaoEspecial(e.target.value)}
                      placeholder="Ex: Baixa Visão, Auditiva, Nenhuma"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Contacto de Emergência (Nome)</label>
                    <input
                      type="text"
                      value={contactoEmergenciaNome}
                      onChange={(e) => setContactoEmergenciaNome(e.target.value)}
                      placeholder="Ex: Mãe, Tio, Avô"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Contacto de Emergência (Telefone)</label>
                    <input
                      type="text"
                      value={contactoEmergenciaTelefone}
                      onChange={(e) => setContactoEmergenciaTelefone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full p-2 border border-gray-300 rounded-md font-mono bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 pt-1">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restricaoEducacaoFisica}
                        onChange={(e) => setRestricaoEducacaoFisica(e.target.checked)}
                        className="h-4 w-4 text-red-600 rounded"
                      />
                      <span>Dispensa / Restrição Médica de Prática em Educação Física (Requer Atestado)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAlunoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Salvar Ficha de Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE MATRÍCULA (RENOVAÇÃO DE ALUNOS JÁ NO SISTEMA)     */}
      {/* ========================================================================= */}
      {showConfirmacaoModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border-2 border-emerald-600 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="border-b pb-3 border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Confirmação de Matrícula (Renovação Oficial)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Aproveita dados do aluno já existente no sistema, alterando apenas classe, turma, turno, curso ou n.º de matrícula.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfirmacaoModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1. Selecionar o Aluno Existente no Sistema */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Selecionar Aluno Já Cadastrado na Escola *
              </label>
              <select
                value={confirmAlunoId}
                onChange={(e) => handleSelectAlunoConfirmacao(e.target.value)}
                className="w-full p-2.5 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {alunos.map(al => {
                  const t = turmas.find(tm => tm.id === al.turmaId);
                  return (
                    <option key={al.id} value={al.id}>
                      {al.nomeCompleto} • {al.codigoMatricula} ({al.classeId || t?.classe || ''} - {t?.nome || ''})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Visualização dos Dados do Aluno (Bloqueados para reutilização fidedigna) */}
            {(() => {
              const al = alunos.find(a => a.id === confirmAlunoId);
              if (!al) return null;
              const tAtual = turmas.find(tm => tm.id === al.turmaId);
              return (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center space-x-3 text-xs">
                  <img
                    src={al.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={al.nomeCompleto}
                    className="h-14 w-14 rounded-lg object-cover border-2 border-emerald-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="font-black text-gray-900 truncate">{al.nomeCompleto}</h4>
                    <p className="text-gray-600">
                      Doc.: <strong className="font-mono">{al.numeroDocumento || al.numeroBI || '—'}</strong> • Gênero: <strong>{al.genero === 'M' ? 'Masculino' : 'Feminino'}</strong>
                    </p>
                    <p className="text-gray-600">
                      Filiação: {al.nomeMae || al.nomePai || '—'} • Enc.: {al.nomeEncarregado || al.encarregadoNome || '—'} ({al.telefoneEncarregado || al.telefone || '—'})
                    </p>
                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">
                      Enquadramento Anterior: {al.classeId || tAtual?.classe} - {tAtual?.nome || 'Turma Base'} ({tAtual?.turno || 'Manhã'})
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 3. Campos Alteráveis na Confirmação: Classe, Turma, Turno, Curso, Matrícula */}
            <form onSubmit={handleExecutarConfirmacao} className="space-y-4 pt-2 border-t border-gray-100 text-xs">
              <div className="bg-white p-3 border border-emerald-300 rounded-xl space-y-3">
                <span className="text-[11px] font-black uppercase text-emerald-900 block">
                  Novos Dados Académicos para Confirmação:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Classe a Confirmar *</label>
                    <select
                      value={confirmClasse}
                      onChange={(e) => {
                        const novaClasse = e.target.value;
                        setConfirmClasse(novaClasse);
                        const tNova = turmas.find(t => t.classe === novaClasse);
                        if (tNova) {
                          setConfirmTurmaId(tNova.id);
                          setConfirmTurno(tNova.turno || 'Manhã');
                          if (tNova.curso) setConfirmCurso(tNova.curso);
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {['Iniciação', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª', '13ª'].map(c => (
                        <option key={c} value={c}>{c} Classe</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Turma Atribuída *</label>
                    <select
                      value={confirmTurmaId}
                      onChange={(e) => {
                        setConfirmTurmaId(e.target.value);
                        const tSel = turmas.find(t => t.id === e.target.value);
                        if (tSel?.turno) setConfirmTurno(tSel.turno);
                        if (tSel?.curso) setConfirmCurso(tSel.curso);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {turmas
                        .filter(t => !confirmClasse || t.classe === confirmClasse)
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nome} ({t.classe} - {t.turno} • Sala {t.sala})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Turno *</label>
                    <select
                      value={confirmTurno}
                      onChange={(e) => setConfirmTurno(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noite">Noite</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Curso (Ensino Secundário)</label>
                    <input
                      type="text"
                      value={confirmCurso}
                      onChange={(e) => setConfirmCurso(e.target.value)}
                      placeholder="Ex: Ciências Físicas e Biológicas, Geral"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-800 mb-1">
                      N.º de Matrícula (Código Oficial para o Ano Letivo) *
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmCodigoMatricula}
                      onChange={(e) => setConfirmCodigoMatricula(e.target.value)}
                      placeholder="Ex: 2026/MED-8910"
                      className="w-full p-2.5 border-2 border-emerald-500 bg-emerald-50 font-mono font-black text-sm text-emerald-950 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      O número de matrícula é exibido no comprovativo de confirmação e nos passes escolares oficiais.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowConfirmacaoModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Gravar Confirmação de Matrícula</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL COMPROVATIVO OFICIAL DE CONFIRMAÇÃO DE MATRÍCULA (IMPRESSÃO / BAIXAR) */}
      {/* ========================================================================= */}
      {showComprovativoModal && alunoConfirmadoComprovativo && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 no-print">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black text-gray-900">
                  Comprovativo de Confirmação de Matrícula Emitido
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={async () => {
                    const el = document.getElementById('comprovativo-confirmacao-doc');
                    if (el) {
                      await downloadElementAsPdf(
                        el,
                        `Comprovativo_Confirmacao_${alunoConfirmadoComprovativo.aluno.codigoMatricula.replace(/[\/\\]/g, '_')}`,
                        { orientation: 'portrait' }
                      );
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-xs"
                  title="Descarregar documento oficial em formato PDF (.pdf)"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar em PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('comprovativo-confirmacao-doc');
                    if (el) {
                      downloadHtmlDocument(
                        `Comprovativo_Confirmacao_${alunoConfirmadoComprovativo.aluno.codigoMatricula.replace(/[\/\\]/g, '_')}`,
                        'Comprovativo de Confirmação de Matrícula',
                        el.outerHTML
                      );
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Baixar HTML</span>
                </button>
                <button 
                  onClick={() => setShowComprovativoModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Documento Formatado MED */}
            <div id="comprovativo-confirmacao-doc" className="p-6 border-2 border-gray-800 rounded-xl space-y-4 bg-white text-gray-950 font-serif">
              {/* Cabeçalho */}
              <div className="text-center space-y-1 border-b-2 border-black pb-3">
                <div className="flex justify-center mb-1">
                  {configSistema.insigniaNacionalUrl ? (
                    <img
                      src={configSistema.insigniaNacionalUrl}
                      alt="Insígnia da República de Angola"
                      className="h-14 w-14 object-contain mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <InsigniaAngola size={48} />
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">REPÚBLICA DE ANGOLA</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700">
                  {escola.governoProvincial || `GOVERNO PROVINCIAL DE ${(escola.provincia || 'LUANDA').toUpperCase()}`}
                </p>
                <p className="text-[8.5px] font-bold uppercase tracking-wide text-gray-600">
                  {escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}
                </p>
                <h2 className="text-sm sm:text-base font-black uppercase text-gray-900 pt-0.5">
                  {escola.nomeOficial}
                </h2>
                <div className="pt-1">
                  <span className="inline-block text-[11px] font-black uppercase px-4 py-1 border-2 border-black bg-gray-50">
                    TALÃO / COMPROVATIVO DE CONFIRMAÇÃO DE MATRÍCULA
                  </span>
                </div>
              </div>

              {/* Destaque do Nº de Matrícula */}
              <div className="bg-gray-100 border-2 border-gray-400 p-3 rounded-lg flex items-center justify-between font-sans">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-600 block">N.º OFICIAL DE MATRÍCULA:</span>
                  <strong className="text-base font-mono font-black text-blue-950 tracking-wider">
                    {alunoConfirmadoComprovativo.aluno.codigoMatricula}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-600 block">Nº de Processo:</span>
                  <span className="font-mono font-bold text-xs text-gray-900">
                    {alunoConfirmadoComprovativo.aluno.numeroProcesso || 'PROC-MED'}
                  </span>
                </div>
              </div>

              {/* Foto e Dados Pessoais do Aluno */}
              <div className="flex items-start space-x-4 border-b border-gray-300 pb-3 font-sans text-xs">
                <img
                  src={alunoConfirmadoComprovativo.aluno.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={alunoConfirmadoComprovativo.aluno.nomeCompleto}
                  className="h-20 w-16 object-cover rounded border-2 border-black shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <p><span className="text-gray-600 font-semibold">Nome Completo:</span> <strong className="uppercase">{alunoConfirmadoComprovativo.aluno.nomeCompleto}</strong></p>
                  <p><span className="text-gray-600 font-semibold">Bilhete de Identidade (BI):</span> <strong className="font-mono">{alunoConfirmadoComprovativo.aluno.numeroDocumento || alunoConfirmadoComprovativo.aluno.numeroBI || '—'}</strong></p>
                  <p><span className="text-gray-600 font-semibold">Gênero:</span> <strong>{alunoConfirmadoComprovativo.aluno.genero === 'M' ? 'Masculino' : 'Feminino'}</strong> • <span className="text-gray-600 font-semibold">Data de Nascimento:</span> <strong>{alunoConfirmadoComprovativo.aluno.dataNascimento}</strong></p>
                  <p><span className="text-gray-600 font-semibold">Encarregado de Educação:</span> <strong>{alunoConfirmadoComprovativo.aluno.nomeEncarregado || alunoConfirmadoComprovativo.aluno.encarregadoNome || '—'}</strong> ({alunoConfirmadoComprovativo.aluno.telefoneEncarregado || alunoConfirmadoComprovativo.aluno.telefone || '—'})</p>
                </div>
              </div>

              {/* Detalhes da Renovação Académica */}
              <div className="font-sans text-xs space-y-2 border-b border-gray-300 pb-3">
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Enquadramento Anterior:</span>
                    <strong>{alunoConfirmadoComprovativo.turmaAnterior || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Classe Confirmada:</span>
                    <strong className="text-emerald-900 font-black">{alunoConfirmadoComprovativo.aluno.classeId} Classe</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Turma & Sala Atribuída:</span>
                    <strong>{alunoConfirmadoComprovativo.turmaNova?.nome || 'Turma Atribuída'} (Sala {alunoConfirmadoComprovativo.turmaNova?.sala || '01'})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Turno:</span>
                    <strong>{alunoConfirmadoComprovativo.aluno.periodo || 'Manhã'}</strong>
                  </div>
                  {alunoConfirmadoComprovativo.aluno.curso && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-500 block">Curso Curricular:</span>
                      <strong>{alunoConfirmadoComprovativo.aluno.curso}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Autenticação & Assinaturas */}
              <div className="pt-4 grid grid-cols-2 gap-6 text-center font-sans text-[11px]">
                <div className="space-y-6">
                  <p className="text-gray-600">O(A) Encarregado(a) de Educação</p>
                  <div className="w-40 border-b border-black mx-auto" />
                </div>
                <div className="space-y-6">
                  <p className="text-gray-600">O Secretário / A Direcção Escolar</p>
                  <div className="w-40 border-b border-black mx-auto" />
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-gray-500 font-mono">
                Emitido em: {new Date().toLocaleDateString('pt-AO')} às {new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })} • Sistema de Gestão Escolar Oficial MED
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico Escolar Completo: Notas Finais de Cada Disciplina em Cada Classe */}
      {showHistoricoModal && historicoAluno && historicoCompleto && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 border-2 border-green-600 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Histórico Escolar Oficial de Notas Finais</h3>
                  <p className="text-xs text-gray-500">
                    Notas finais de cada disciplina em cada classe do ciclo escolar • Conforme Normas do MED
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-900 block">{historicoAluno.nomeCompleto}</span>
                <span className="text-[11px] font-mono text-gray-500">{historicoAluno.codigoMatricula}</span>
              </div>
            </div>

            {/* SELETOR DE CLASSES / ABAS */}
            <div className="flex flex-wrap items-center gap-2 border-b pb-2 border-gray-200">
              {historicoCompleto.classes.map((classeItem, idx) => (
                <button
                  key={idx}
                  onClick={() => setClasseAtivaIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    classeAtivaIdx === idx
                      ? 'bg-green-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>{classeItem.classe} Classe ({classeItem.anoLectivo})</span>
                </button>
              ))}

              <button
                onClick={() => setShowAddClasseForm(!showAddClasseForm)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-800 bg-green-50 hover:bg-green-100 border border-green-300 inline-flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Nova Classe</span>
              </button>
            </div>

            {/* FORMULÁRIO PARA ADICIONAR NOVA CLASSE */}
            {showAddClasseForm && (
              <form onSubmit={handleCriarNovaClasse} className="p-4 bg-green-50 border border-green-300 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-green-900">Adicionar Nova Classe ao Histórico Escolar</h4>
                  <button 
                    type="button" 
                    onClick={() => setShowAddClasseForm(false)} 
                    className="text-gray-500 hover:text-gray-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Classe</label>
                    <select
                      value={novaClasseNome}
                      onChange={(e) => setNovaClasseNome(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white font-bold"
                    >
                      <option value="6ª">6ª Classe</option>
                      <option value="7ª">7ª Classe</option>
                      <option value="8ª">8ª Classe</option>
                      <option value="9ª">9ª Classe</option>
                      <option value="10ª">10ª Classe</option>
                      <option value="11ª">11ª Classe</option>
                      <option value="12ª">12ª Classe</option>
                      <option value="13ª">13ª Classe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Ano Letivo</label>
                    <input
                      type="text"
                      required
                      value={novaClasseAno}
                      onChange={(e) => setNovaClasseAno(e.target.value)}
                      placeholder="Ex: 2023/2024"
                      className="w-full p-2 border rounded-md bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Escola de Origem</label>
                    <input
                      type="text"
                      required
                      value={novaClasseEscola}
                      onChange={(e) => setNovaClasseEscola(e.target.value)}
                      placeholder="Ex: Complexo Escolar nº 151"
                      className="w-full p-2 border rounded-md bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddClasseForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-green-700 rounded hover:bg-green-800"
                  >
                    Confirmar e Iniciar Lançamentos
                  </button>
                </div>
              </form>
            )}

            {/* DETALHES DA CLASSE SELECIONADA */}
            {historicoCompleto.classes[classeAtivaIdx] && (() => {
              const classeAtual = historicoCompleto.classes[classeAtivaIdx];
              const escalaInfo = obterInformacaoEscala(classeAtual.classe);

              return (
                <div className="space-y-4">
                  {/* Cabeçalho da Classe e Indicadores de Escala */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black text-slate-900">
                          {classeAtual.classe} Classe ({classeAtual.anoLectivo})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          escalaInfo.ehPrimario
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {escalaInfo.rotuloEscala}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Estabelecimento de Origem: <strong>{classeAtual.escolaOrigem || 'Não especificado'}</strong> •
                        Nota Mínima Positiva: <strong className="text-emerald-700">{escalaInfo.notaAprovacao}.0 Valores</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Média Geral da Classe:</span>
                        <span className={`text-sm font-black px-2 py-0.5 rounded ${
                          (classeAtual.mediaGeralClasse || 0) >= escalaInfo.notaAprovacao
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-red-700 bg-red-50'
                        }`}>
                          {classeAtual.mediaGeralClasse ?? escalaInfo.notaAprovacao} / {escalaInfo.escalaMaxima}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCarregarCurriculoPadrao}
                        className="px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Preencher automaticamente todas as disciplinas curriculares oficiais desta classe no plano curricular"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-blue-700" />
                        <span>Carregar Matriz Completa</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportarHistoricoExcel}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Descarregar histórico escolar de todas as classes em Excel (.xlsx)"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Excel (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoverClasse(classeAtivaIdx)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                        title="Eliminar esta classe do histórico"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* SUB-NAVEGAÇÃO DAS DIMENSÕES DO HISTÓRICO ESCOLAR (REQUISITO EXPLÍCITO DO PROMPT) */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setSubAbaHistorico('notas')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        subAbaHistorico === 'notas'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Notas Curriculares ({classeAtual.notasDisciplinas.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubAbaHistorico('ocorrencias')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        subAbaHistorico === 'ocorrencias'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Acontecimentos & Ocorrências ({classeAtual.ocorrencias?.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSubAbaHistorico('faltas');
                        setFormFaltasJust(classeAtual.faltas?.faltasJustificadas || 0);
                        setFormFaltasInjust(classeAtual.faltas?.faltasInjustificadas || 0);
                        setFormFaltasObs(classeAtual.faltas?.observacao || '');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        subAbaHistorico === 'faltas'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Faltas & Assiduidade ({(classeAtual.faltas?.faltasJustificadas || 0) + (classeAtual.faltas?.faltasInjustificadas || 0)} faltas)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSubAbaHistorico('dividas');
                        setFormDividaStatus(classeAtual.dividas?.status || 'Regularizado');
                        setFormDividaTotal(classeAtual.dividas?.totalDividaAKZ || 0);
                        setFormDividaPago(classeAtual.dividas?.totalPagoAKZ || 120000);
                        setFormDividaObs(classeAtual.dividas?.observacoes || '');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        subAbaHistorico === 'dividas'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Dívidas & Encargos ({classeAtual.dividas?.status || 'Regularizado'})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubAbaHistorico('resumo')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        subAbaHistorico === 'resumo'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Resumo Multianual Integrado</span>
                    </button>
                  </div>

                  {/* 1. ABA NOTAS CURRICULARES */}
                  {subAbaHistorico === 'notas' && (
                    <div className="space-y-4">
                      {/* Informação Rápida de Usabilidade */}
                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>
                            <strong>Edição Rápida em Lista:</strong> Digite diretamente as notas finais nas caixas de texto abaixo. As médias e os resultados de transição são calculados automaticamente em tempo real na escala <strong>0 a {escalaInfo.escalaMaxima}</strong>.
                          </span>
                        </span>
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {classeAtual.notasDisciplinas.length} Disciplinas
                        </span>
                      </div>

                      {/* TABELA COMPLETA DE DISCIPLINAS DISPOSTAS EM LISTA (COM INPUT DIRETO) */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-100 text-gray-700 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                            <tr>
                              <th className="p-3 w-8 text-center">Nº</th>
                              <th className="p-3">Disciplina Curricular Oficial</th>
                              <th className="p-3 text-center w-36">Nota Final (0 a {escalaInfo.escalaMaxima})</th>
                              <th className="p-3">Classificação Oficial por Extenso (MED)</th>
                              <th className="p-3 text-center w-28">Situação</th>
                              <th className="p-3 text-right w-16">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {classeAtual.notasDisciplinas.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                  <p className="font-semibold text-gray-700 mb-2">Nenhuma disciplina cadastrada nesta classe ainda.</p>
                                  <button
                                    type="button"
                                    onClick={handleCarregarCurriculoPadrao}
                                    className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-bold text-xs shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span>Carregar Todas as Disciplinas do Currículo Oficial</span>
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              classeAtual.notasDisciplinas.map((disc, dIdx) => {
                                const aprovado = disc.notaFinal >= escalaInfo.notaAprovacao;
                                return (
                                  <tr key={dIdx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-center text-gray-400 font-mono font-bold">
                                      {dIdx + 1}
                                    </td>
                                    <td className="p-3">
                                      <span className="font-bold text-gray-900 block text-xs">
                                        {disc.disciplinaNome}
                                      </span>
                                      {disc.professorNome && (
                                        <span className="text-[10px] text-gray-500">Docente: {disc.professorNome}</span>
                                      )}
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center space-x-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max={escalaInfo.escalaMaxima}
                                          step="0.5"
                                          value={disc.notaFinal}
                                          onChange={(e) => handleAlterarNotaDisciplina(dIdx, e.target.value)}
                                          className={`w-20 text-center font-black p-1.5 rounded-lg border-2 text-sm focus:ring-2 focus:outline-none transition-all ${
                                            aprovado
                                              ? 'border-blue-400 bg-blue-50/40 text-blue-950 focus:ring-blue-600 focus:border-blue-600'
                                              : 'border-red-400 bg-red-50/40 text-red-950 focus:ring-red-600 focus:border-red-600'
                                          }`}
                                        />
                                        <span className="text-[10px] font-semibold text-gray-400">
                                          /{escalaInfo.escalaMaxima}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-gray-700 italic font-medium">
                                      {converterNotaParaCertificadoExtenso(disc.notaFinal)}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                                        aprovado 
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                          : 'bg-red-100 text-red-800 border border-red-300'
                                      }`}>
                                        {aprovado ? 'Aprovado' : 'Não Transita'}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoverDisciplina(dIdx)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                        title="Remover disciplina da lista"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* ADICIONAR DISCIPLINA EXTRA (AVULSA) */}
                      <form onSubmit={handleAdicionarDisciplinaNaClasse} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                            <Plus className="h-3.5 w-3.5 text-green-700" />
                            <span>Adicionar Outra Disciplina à Lista</span>
                          </h5>
                          <span className="text-[10px] text-gray-500">Caso a disciplina não conste da matriz</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <div className="flex gap-1.5">
                              <select
                                value={DISCIPLINAS_ANGOLA_PADRAO.includes(novaDiscNome) ? novaDiscNome : 'OUTRA'}
                                onChange={(e) => {
                                  if (e.target.value !== 'OUTRA') setNovaDiscNome(e.target.value);
                                  else setNovaDiscNome('');
                                }}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-xs font-semibold"
                              >
                                <option value="">-- Escolher Disciplina --</option>
                                {DISCIPLINAS_ANGOLA_PADRAO.map((d, i) => (
                                  <option key={i} value={d}>{d}</option>
                                ))}
                                <option value="OUTRA">Outra (Digitar Nome Personalizado)</option>
                              </select>
                              {!DISCIPLINAS_ANGOLA_PADRAO.includes(novaDiscNome) && (
                                <input
                                  type="text"
                                  required
                                  value={novaDiscNome}
                                  onChange={(e) => setNovaDiscNome(e.target.value)}
                                  placeholder="Nome da disciplina..."
                                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-xs font-semibold"
                                />
                              )}
                            </div>
                          </div>

                          <div>
                            <input
                              type="number"
                              min="0"
                              max={escalaInfo.escalaMaxima}
                              step="0.5"
                              required
                              value={novaDiscNota}
                              onChange={(e) => setNovaDiscNota(e.target.value)}
                              placeholder={`Nota (0-${escalaInfo.escalaMaxima})`}
                              className="w-full p-2 border border-gray-300 rounded-lg bg-white font-black text-center text-xs"
                            />
                          </div>

                          <div>
                            <button
                              type="submit"
                              className="w-full py-2 px-3 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-2xs flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Adicionar à Lista</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* 2. ABA ACONTECIMENTOS & OCORRÊNCIAS REGISTADAS (COORDENADORES E PROFESSORES) */}
                  {subAbaHistorico === 'ocorrencias' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl gap-3">
                        <div>
                          <h4 className="text-sm font-black text-indigo-950 flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4 text-indigo-700" />
                            <span>Acontecimentos Registados por Coordenadores e Professores</span>
                          </h4>
                          <p className="text-xs text-indigo-800 mt-0.5">
                            Histórico de acontecimentos disciplinares, pedagógicos, elogios, advertências e reuniões com encarregados de educação da <strong>{classeAtual.classe} Classe ({classeAtual.anoLectivo})</strong>.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowNovaOcorrenciaForm(!showNovaOcorrenciaForm)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registar Novo Acontecimento</span>
                        </button>
                      </div>

                      {/* Formulário Novo Acontecimento */}
                      {showNovaOcorrenciaForm && (
                        <form onSubmit={handleAdicionarOcorrencia} className="p-4 bg-white border-2 border-indigo-400 rounded-xl shadow-md space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-black text-indigo-950">Novo Registo de Acontecimento Escolar</span>
                            <button type="button" onClick={() => setShowNovaOcorrenciaForm(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Data do Acontecimento</label>
                              <input
                                type="date"
                                required
                                value={novaOcorrData}
                                onChange={(e) => setNovaOcorrData(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-slate-50 font-bold text-gray-900"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Tipo de Acontecimento</label>
                              <select
                                value={novaOcorrTipo}
                                onChange={(e) => setNovaOcorrTipo(e.target.value as any)}
                                className="w-full p-2 border rounded-lg bg-white font-bold"
                              >
                                <option value="Disciplinar">Disciplinar</option>
                                <option value="Pedagógico">Pedagógico</option>
                                <option value="Elogio">Elogio / Mérito</option>
                                <option value="Reunião Encarregado">Reunião com Encarregado</option>
                                <option value="Advertência">Advertência Formal</option>
                                <option value="Louvor">Louvor Oficial</option>
                                <option value="Outro">Outro Acontecimento</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Cargo do Responsável</label>
                              <select
                                value={novaOcorrCargo}
                                onChange={(e) => setNovaOcorrCargo(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white font-bold"
                              >
                                <option value="Coordenador">Coordenador Pedagógico</option>
                                <option value="Coordenador de Turno">Coordenador de Turno</option>
                                <option value="Professor">Professor da Turma</option>
                                <option value="Diretor de Turma">Diretor de Turma</option>
                                <option value="Diretor">Diretor Geral / Adjunto</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Registado Por (Nome do Coordenador ou Docente)</label>
                            <input
                              type="text"
                              required
                              value={novaOcorrRegistadoPor}
                              onChange={(e) => setNovaOcorrRegistadoPor(e.target.value)}
                              placeholder="Ex: Prof. Manuel Costa ou Dra. Teresa Vunge"
                              className="w-full p-2 border rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Descrição Pormenorizada do Acontecimento</label>
                            <textarea
                              required
                              rows={3}
                              value={novaOcorrDescricao}
                              onChange={(e) => setNovaOcorrDescricao(e.target.value)}
                              placeholder="Descreva o facto ocorrido com rigor pedagógico..."
                              className="w-full p-2 border rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Resolução ou Medida Adotada</label>
                            <input
                              type="text"
                              value={novaOcorrResolucao}
                              onChange={(e) => setNovaOcorrResolucao(e.target.value)}
                              placeholder="Ex: Averbado em livro de honra / Encarregado assinou termo de compromisso..."
                              className="w-full p-2 border rounded-lg bg-white"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowNovaOcorrenciaForm(false)}
                              className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                            >
                              Guardar Acontecimento
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Lista de Ocorrências Registadas */}
                      {(!classeAtual.ocorrencias || classeAtual.ocorrencias.length === 0) ? (
                        <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                          <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-700">Nenhum acontecimento registado para a {classeAtual.classe} Classe.</p>
                          <p className="text-[11px] text-gray-500 mt-1">Utilize o botão acima para registar acontecimentos disciplinares, pedagógicos ou reuniões.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {classeAtual.ocorrencias.map((ocorr, oIdx) => {
                            const badgeColor = ocorr.tipo === 'Elogio' || ocorr.tipo === 'Louvor'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : ocorr.tipo === 'Disciplinar' || ocorr.tipo === 'Advertência'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : ocorr.tipo === 'Reunião Encarregado'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-300';

                            return (
                              <div key={ocorr.id || oIdx} className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2 hover:border-indigo-300 transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                                      {ocorr.tipo}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">
                                      Data: {ocorr.data}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                                    <span>Registado por: <strong>{ocorr.registadoPor}</strong> ({ocorr.cargo})</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoverOcorrencia(ocorr.id)}
                                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                      title="Remover este acontecimento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs text-gray-800 leading-relaxed font-medium">
                                  {ocorr.descricao}
                                </p>

                                {ocorr.resolucao && (
                                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 flex items-center space-x-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span><strong>Resolução / Termo Adotado:</strong> {ocorr.resolucao}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. ABA FALTAS & ASSIDUIDADE */}
                  {subAbaHistorico === 'faltas' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl gap-3">
                        <div>
                          <h4 className="text-sm font-black text-amber-950 flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-amber-700" />
                            <span>Histórico de Faltas & Assiduidade no Ano Letivo</span>
                          </h4>
                          <p className="text-xs text-amber-800 mt-0.5">
                            Faltas justificadas e injustificadas registradas durante o ano letivo <strong>{classeAtual.anoLectivo}</strong> na <strong>{classeAtual.classe} Classe</strong>.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditandoFaltas(!editandoFaltas)}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{editandoFaltas ? 'Cancelar Edição' : 'Retificar Faltas'}</span>
                        </button>
                      </div>

                      {/* Painel de Métricas de Faltas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Aulas Previstas</span>
                          <span className="text-xl font-black text-gray-900">{classeAtual.faltas?.totalAulasPrevistas || 720}</span>
                          <span className="text-[10px] text-gray-400 block">Carga curricular</span>
                        </div>

                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-blue-600 block">Faltas Justificadas</span>
                          <span className="text-xl font-black text-blue-900">{classeAtual.faltas?.faltasJustificadas ?? 0}</span>
                          <span className="text-[10px] text-blue-500 block">Com atestado / aviso</span>
                        </div>

                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-red-600 block">Faltas Injustificadas</span>
                          <span className="text-xl font-black text-red-900">{classeAtual.faltas?.faltasInjustificadas ?? 0}</span>
                          <span className="text-[10px] text-red-500 block">Sem comprovação</span>
                        </div>

                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-emerald-600 block">Taxa de Assiduidade</span>
                          <span className="text-xl font-black text-emerald-900">{classeAtual.faltas?.percentualAssiduidade ?? 99.2}%</span>
                          <span className="text-[10px] text-emerald-500 block">Frequência anual</span>
                        </div>
                      </div>

                      {/* Formulário de Retificação de Faltas */}
                      {editandoFaltas && (
                        <form onSubmit={handleSalvarFaltas} className="p-4 bg-white border-2 border-amber-400 rounded-xl shadow-md space-y-3 text-xs">
                          <h5 className="font-black text-gray-900">Atualizar Registo Anual de Assiduidade</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Faltas Justificadas</label>
                              <input
                                type="number"
                                min="0"
                                max="200"
                                value={formFaltasJust}
                                onChange={(e) => setFormFaltasJust(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg font-bold"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Faltas Injustificadas</label>
                              <input
                                type="number"
                                min="0"
                                max="200"
                                value={formFaltasInjust}
                                onChange={(e) => setFormFaltasInjust(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg font-bold text-red-900"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Observações da Coordenação / Direção de Turma</label>
                            <input
                              type="text"
                              value={formFaltasObs}
                              onChange={(e) => setFormFaltasObs(e.target.value)}
                              placeholder="Ex: Assiduidade exemplar; justificativos homologados pela direção..."
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditandoFaltas(false)}
                              className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                            >
                              Guardar Faltas
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Observações da Assiduidade */}
                      {classeAtual.faltas?.observacao && !editandoFaltas && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Averbamento da Assiduidade: </span>
                          <span>{classeAtual.faltas.observacao}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. ABA DÍVIDAS & ENCARGOS FINANCEIROS */}
                  {subAbaHistorico === 'dividas' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl gap-3">
                        <div>
                          <h4 className="text-sm font-black text-emerald-950 flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-emerald-700" />
                            <span>Histórico Financeiro & Dívidas por Ano Letivo</span>
                          </h4>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Registo de propinas, emolumentos e liquidações do ano letivo <strong>{classeAtual.anoLectivo}</strong> ({classeAtual.classe} Classe).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditandoDividas(!editandoDividas)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{editandoDividas ? 'Cancelar Edição' : 'Atualizar Estado Financeiro'}</span>
                        </button>
                      </div>

                      {/* Painel Financeiro */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Situação Financeira</span>
                          <span className={`text-sm font-black px-2 py-0.5 rounded inline-block mt-1 ${
                            classeAtual.dividas?.status === 'Regularizado' || classeAtual.dividas?.status === 'Isento'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {classeAtual.dividas?.status || 'Regularizado'}
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Devido (AKZ)</span>
                          <span className="text-base font-black text-gray-900 mt-1 block">
                            {(classeAtual.dividas?.totalDividaAKZ || 0).toLocaleString('pt-AO')} Kz
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Liquidado (AKZ)</span>
                          <span className="text-base font-black text-emerald-900 mt-1 block">
                            {(classeAtual.dividas?.totalPagoAKZ || 120000).toLocaleString('pt-AO')} Kz
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Saldo Pendente</span>
                          <span className={`text-base font-black mt-1 block ${
                            Math.max(0, (classeAtual.dividas?.totalDividaAKZ || 0) - (classeAtual.dividas?.totalPagoAKZ || 0)) > 0
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}>
                            {Math.max(0, (classeAtual.dividas?.totalDividaAKZ || 0) - (classeAtual.dividas?.totalPagoAKZ || 0)).toLocaleString('pt-AO')} Kz
                          </span>
                        </div>
                      </div>

                      {/* Formulário de Atualização Financeira */}
                      {editandoDividas && (
                        <form onSubmit={handleSalvarDividas} className="p-4 bg-white border-2 border-emerald-400 rounded-xl shadow-md space-y-3 text-xs">
                          <h5 className="font-black text-gray-900">Atualizar Quitação de Propinas & Dívidas</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Estado Financeiro</label>
                              <select
                                value={formDividaStatus}
                                onChange={(e) => setFormDividaStatus(e.target.value as any)}
                                className="w-full p-2 border rounded-lg font-bold bg-white"
                              >
                                <option value="Regularizado">Regularizado (Sem Dívida)</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Acordo de Pagamento">Acordo de Pagamento</option>
                                <option value="Isento">Isento / Bolsa</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Total Devido (AKZ)</label>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={formDividaTotal}
                                onChange={(e) => setFormDividaTotal(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg font-bold"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Total Pago (AKZ)</label>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={formDividaPago}
                                onChange={(e) => setFormDividaPago(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg font-bold text-emerald-900"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Observações da Tesouraria</label>
                            <input
                              type="text"
                              value={formDividaObs}
                              onChange={(e) => setFormDividaObs(e.target.value)}
                              placeholder="Ex: Todas as mensalidades liquidadas sob recibo tesouraria..."
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditandoDividas(false)}
                              className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                            >
                              Guardar Dados Financeiros
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Observações da Tesouraria */}
                      {classeAtual.dividas?.observacoes && !editandoDividas && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Averbamento Financeiro: </span>
                          <span>{classeAtual.dividas.observacoes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. ABA RESUMO MULTIANUAL INTEGRADO */}
                  {subAbaHistorico === 'resumo' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1">
                        <h4 className="text-sm font-black flex items-center space-x-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Quadro Consolidado Multianual do Estudante</span>
                        </h4>
                        <p className="text-xs text-slate-300">
                          Trajetória completa por ano letivo com notas, faltas, dívidas e ocorrências registradas na escola por professores e coordenadores.
                        </p>
                      </div>

                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-800 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                            <tr>
                              <th className="p-3">Classe</th>
                              <th className="p-3">Ano Letivo</th>
                              <th className="p-3">Escola de Origem</th>
                              <th className="p-3 text-center">Média Geral</th>
                              <th className="p-3 text-center">Faltas (Total)</th>
                              <th className="p-3 text-center">Assiduidade</th>
                              <th className="p-3 text-center">Dívidas</th>
                              <th className="p-3 text-center">Ocorrências</th>
                              <th className="p-3 text-center">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {historicoCompleto.classes.map((c, cIdx) => {
                              const eInfo = obterInformacaoEscala(c.classe);
                              const aprov = (c.mediaGeralClasse || 0) >= eInfo.notaAprovacao;
                              const totalF = (c.faltas?.faltasJustificadas || 0) + (c.faltas?.faltasInjustificadas || 0);

                              return (
                                <tr key={cIdx} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 font-bold text-gray-900">{c.classe} Classe</td>
                                  <td className="p-3 font-mono text-gray-600">{c.anoLectivo}</td>
                                  <td className="p-3 text-gray-700">{c.escolaOrigem || 'Estabelecimento Escolar'}</td>
                                  <td className="p-3 text-center font-black">
                                    <span className={aprov ? 'text-emerald-700' : 'text-red-700'}>
                                      {c.mediaGeralClasse ?? eInfo.notaAprovacao} / {eInfo.escalaMaxima}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-gray-800">{totalF}</td>
                                  <td className="p-3 text-center font-mono text-emerald-800 font-bold">
                                    {c.faltas?.percentualAssiduidade ?? 99.2}%
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      c.dividas?.status === 'Regularizado'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {c.dividas?.status || 'Regularizado'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-bold text-indigo-700 font-mono">
                                    {c.ocorrencias?.length || 0}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      aprov
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {aprov ? 'Transitou' : 'Não Transita'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MODAL FOOTER */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500 font-medium">
                Total de classes arquivadas: <strong>{historicoCompleto.classes.length}</strong>
              </span>

              <button
                type="button"
                onClick={() => setShowHistoricoModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-sm"
              >
                Concluir & Validar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consulta Pública / Portal dos Pais */}
      {showPublicPortal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border-2 border-blue-600 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Portal dos Pais & Encarregados de Educação</h3>
              <p className="text-xs text-gray-500">
                Consulta pública rápida sem login prévio. Introduza o número de matrícula ou BI do educando.
              </p>
            </div>

            <form onSubmit={handleConsultar} className="flex gap-2">
              <input
                type="text"
                required
                value={consultaCodigo}
                onChange={(e) => setConsultaCodigo(e.target.value)}
                placeholder="Ex: 2025/MED-001 ou BI..."
                className="flex-1 p-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Pesquisar
              </button>
            </form>

            {resultadoConsulta && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center space-x-3">
                  <img
                    src={resultadoConsulta.fotoUrl}
                    alt={resultadoConsulta.nomeCompleto}
                    className="h-12 w-12 rounded-full object-cover border"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{resultadoConsulta.nomeCompleto}</h4>
                    <p className="text-gray-500 font-mono text-[11px]">Matrícula: {resultadoConsulta.codigoMatricula}</p>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Estado: {resultadoConsulta.estado}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200 text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Encarregado Registado:</span>
                    <strong className="text-gray-900">{resultadoConsulta.nomeEncarregado}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ano Lectivo:</span>
                    <strong className="text-gray-900">{resultadoConsulta.anoMatricula}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowPublicPortal(false);
                  setResultadoConsulta(null);
                  setConsultaCodigo('');
                }}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
