import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileBarChart, 
  Download, 
  Printer, 
  Calendar, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Award, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Building2, 
  ChevronRight,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Escola, 
  Turma, 
  Aluno, 
  Disciplina, 
  NotaTrimestralConsolidada, 
  Funcionario, 
  AnoLectivoConfig,
  AtribuicaoDocente
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { 
  filtrarDisciplinasDaClasse, 
  normalizarClasse, 
  formatarCicloPorClasse,
  ordenarDisciplinas,
  isClasseFinal 
} from '../services/academicHierarchyService';
import { obterInformacaoEscala } from '../services/macEngine';

interface ReportsViewProps {
  escola: Escola;
  escolas?: Escola[];
  currentUser?: Funcionario;
  turmas: Turma[];
  alunos: Aluno[];
  disciplinas: Disciplina[];
  notasConsolidadas?: NotaTrimestralConsolidada[];
  funcionarios?: Funcionario[];
  anoLectivoConfigs?: AnoLectivoConfig[];
  atribuicoes?: AtribuicaoDocente[];
  onMudarEscola?: (escolaId: string) => void;
}

type SubAbaRelatorio = 
  | 'mapa_rendimento' 
  | 'rendimento_disciplina' 
  | 'assiduidade_faltas' 
  | 'carga_horaria' 
  | 'balanco_pedagogico';

export const ReportsView: React.FC<ReportsViewProps> = ({
  escola,
  escolas = [],
  currentUser,
  turmas,
  alunos,
  disciplinas,
  notasConsolidadas: propNotas,
  funcionarios: propFuncionarios,
  anoLectivoConfigs = [],
  atribuicoes: propAtribuicoes,
  onMudarEscola
}) => {
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    const syncConfig = () => setConfigSistema(dbService.getConfiguracaoSistema());
    window.addEventListener('sge_dados_atualizados_remoto', syncConfig);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', syncConfig);
  }, []);

  // Carregar dados atualizados do banco caso não fornecidos, estritamente isolados à escola ativa
  const notas = useMemo(() => propNotas || dbService.getNotasConsolidadas(), [propNotas]);
  const funcionarios = useMemo(() => {
    const base = propFuncionarios || dbService.getFuncionarios();
    return base.filter(f => f.escolaId === escola.id && f.role !== 'AdminGeral');
  }, [propFuncionarios, escola.id]);
  const anosConfigs = useMemo(() => anoLectivoConfigs.length > 0 ? anoLectivoConfigs : dbService.getAnosLectivosConfigs(), [anoLectivoConfigs]);
  const atribuicoesTodas = useMemo(() => propAtribuicoes || dbService.getAtribuicoes(), [propAtribuicoes]);

  // Identificação do Perfil do Utilizador
  const isAdminGeral = currentUser?.role === 'AdminGeral';
  const isProfessor = currentUser?.role === 'Professor';
  const isCoordenadorDisciplina = currentUser?.role === 'CoordenadorDisciplina';
  const isCoordenadorTurno = currentUser?.role === 'CoordenadorTurno';
  const isCoordenadorPedagogico = currentUser?.role === 'CoordenadorPedagogico';
  const isDocenteOuCoordenador = isProfessor || isCoordenadorDisciplina || isCoordenadorTurno || isCoordenadorPedagogico;
  const isDirecao = 
    currentUser?.role === 'DiretorGeral' || 
    currentUser?.role === 'SubdiretorPedagogico' || 
    currentUser?.role === 'SubdiretorAdministrativo' || 
    currentUser?.role === 'SubdirectorAdministrativo' || 
    currentUser?.role === 'ChefeSecretaria' || 
    currentUser?.role === 'Secretaria' ||
    currentUser?.role === 'SecretarioEscolar' ||
    currentUser?.role === 'Secretario' ||
    currentUser?.role === 'TecnicoTI';

  // Modo de visualização: Professores e Coordenadores iniciam com 'minhas_atribuicoes', mas podem alternar livremente para 'toda_escola'
  const [modoVisao, setModoVisao] = useState<'minhas_atribuicoes' | 'toda_escola'>(
    isDocenteOuCoordenador ? 'minhas_atribuicoes' : 'toda_escola'
  );

  // Filtro de Docente para Direção / AdminGeral: permite auditar individualmente qualquer professor da escola
  const [filtroDocenteId, setFiltroDocenteId] = useState<string>('TODOS');

  // Estados de Filtros Centrais (incluindo Curso e Disciplina)
  const [subAbaAtiva, setSubAbaAtiva] = useState<SubAbaRelatorio>('mapa_rendimento');
  const [filtroAno, setFiltroAno] = useState<string>(escola.anoLectivoActivo || '2024/2025');
  const [filtroTrimestre, setFiltroTrimestre] = useState<string>(String(escola.trimestreActivo || '1'));
  const [filtroCiclo, setFiltroCiclo] = useState<string>('TODOS');
  const [filtroCurso, setFiltroCurso] = useState<string>('TODOS');
  const [filtroClasse, setFiltroClasse] = useState<string>('TODAS');
  const [filtroTurmaId, setFiltroTurmaId] = useState<string>('TODAS');
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState<string>('TODAS');

  // Lista de docentes e coordenadores cadastrados na escola
  const listaDocentes = useMemo(() => {
    return funcionarios.filter(f => 
      f.categoriaProfissional?.toLowerCase().includes('prof') || 
      f.categoriaProfissional?.toLowerCase().includes('doc') ||
      f.role === 'Professor' ||
      f.role === 'CoordenadorDisciplina' ||
      f.role === 'CoordenadorTurno' ||
      f.role === 'CoordenadorPedagogico' ||
      Boolean(f.especialidade)
    );
  }, [funcionarios]);

  // Identificação do Docente Alvo da Análise
  const docenteAlvo = useMemo(() => {
    if (isDocenteOuCoordenador && modoVisao === 'minhas_atribuicoes') {
      return currentUser || null;
    }
    if ((isDirecao || isAdminGeral) && filtroDocenteId !== 'TODOS') {
      return funcionarios.find(f => f.id === filtroDocenteId) || null;
    }
    return null;
  }, [isDocenteOuCoordenador, modoVisao, currentUser, isDirecao, isAdminGeral, filtroDocenteId, funcionarios]);

  // Atribuições do Docente Alvo (se ativo)
  const atribuicoesDoDocenteAlvo = useMemo(() => {
    if (!docenteAlvo) return [];
    return atribuicoesTodas.filter(a => a.professorId === docenteAlvo.id);
  }, [docenteAlvo, atribuicoesTodas]);

  const turmasDocenteIds = useMemo(() => {
    if (!docenteAlvo) return new Set<string>();
    const ids = new Set<string>(atribuicoesDoDocenteAlvo.map(a => a.turmaId));
    // Fallback: se o docente for coordenador de turma ou diretor de turma
    turmas.forEach(t => {
      if (t.coordenadorId === docenteAlvo.id || 
          (t.coordenadorNome && t.coordenadorNome.toLowerCase() === docenteAlvo.nomeCompleto.toLowerCase()) ||
          (t.directorTurmaNome && t.directorTurmaNome.toLowerCase() === docenteAlvo.nomeCompleto.toLowerCase())) {
        ids.add(t.id);
      }
    });
    return ids;
  }, [docenteAlvo, atribuicoesDoDocenteAlvo, turmas]);

  const disciplinasDocenteIds = useMemo(() => {
    if (!docenteAlvo) return new Set<string>();
    const ids = new Set<string>(atribuicoesDoDocenteAlvo.map(a => a.disciplinaId));
    if (docenteAlvo.especialidade) {
      disciplinas.forEach(d => {
        if (d.nome.toLowerCase().includes(docenteAlvo.especialidade!.toLowerCase()) || 
            docenteAlvo.especialidade!.toLowerCase().includes(d.nome.toLowerCase())) {
          ids.add(d.id);
        }
      });
    }
    return ids;
  }, [docenteAlvo, atribuicoesDoDocenteAlvo, disciplinas]);

  // Turmas permitidas conforme o filtro ou perfil
  const turmasPermitidas = useMemo(() => {
    if (docenteAlvo && turmasDocenteIds.size > 0) {
      return turmas.filter(t => turmasDocenteIds.has(t.id));
    }
    if (isCoordenadorTurno && modoVisao === 'minhas_atribuicoes' && currentUser?.cargo) {
      const cargo = currentUser.cargo.toLowerCase();
      if (cargo.includes('manhã')) return turmas.filter(t => t.turno === 'Manhã');
      if (cargo.includes('tarde')) return turmas.filter(t => t.turno === 'Tarde');
      if (cargo.includes('noite')) return turmas.filter(t => t.turno === 'Noite');
    }
    return turmas;
  }, [turmas, docenteAlvo, turmasDocenteIds, isCoordenadorTurno, modoVisao, currentUser]);

  // Disciplinas permitidas conforme o filtro ou perfil
  const disciplinasPermitidas = useMemo(() => {
    if (docenteAlvo && disciplinasDocenteIds.size > 0) {
      const filtradas = disciplinas.filter(d => disciplinasDocenteIds.has(d.id));
      return filtradas.length > 0 ? ordenarDisciplinas(filtradas) : ordenarDisciplinas(disciplinas);
    }
    if (isCoordenadorDisciplina && modoVisao === 'minhas_atribuicoes' && currentUser?.especialidade) {
      const filtradas = disciplinas.filter(d => 
        d.nome.toLowerCase().includes(currentUser.especialidade!.toLowerCase()) ||
        currentUser.especialidade!.toLowerCase().includes(d.nome.toLowerCase())
      );
      if (filtradas.length > 0) return ordenarDisciplinas(filtradas);
    }
    return ordenarDisciplinas(disciplinas);
  }, [disciplinas, docenteAlvo, disciplinasDocenteIds, isCoordenadorDisciplina, modoVisao, currentUser]);

  // Cursos disponíveis a partir das turmas permitidas
  const cursosDisponiveis = useMemo(() => {
    const setCursos = new Set<string>();
    turmasPermitidas.forEach(t => {
      if (t.curso && t.curso.trim()) setCursos.add(t.curso.trim());
    });
    return Array.from(setCursos).sort();
  }, [turmasPermitidas]);

  // Textos para o Parecer / Balanço Pedagógico
  const [parecerDificuldades, setParecerDificuldades] = useState<string>(
    isProfessor
      ? `Nas turmas lecionadas pelo(a) Prof(a). ${currentUser?.nomeCompleto || 'Docente'}, registou-se evolução no domínio curricular, com atenção especial a conceitos fundamentais de cálculo e compreensão textual.`
      : 'Verificou-se ligeira irregularidade na assiduidade discente nos dias chuvosos e necessidade de consolidação de conceitos elementares em turmas de transição.'
  );
  const [parecerMedidas, setParecerMedidas] = useState<string>(
    isProfessor
      ? 'Intensificação de fichas de exercícios práticos, apoio pedagógico nos tempos complementares e acompanhamento contínuo dos estudantes com dificuldades.'
      : 'Implementação de aulas de apoio pedagógico aos sábados, reforço na planificação conjunta por disciplina e reuniões de alinhamento com encarregados de educação.'
  );
  const [parecerConclusao, setParecerConclusao] = useState<string>(
    isProfessor
      ? `Relatório do(a) docente ${currentUser?.nomeCompleto || 'Professor'} submetido para homologação da Subdirecção Pedagógica, em conformidade com o cumprimento integral da carga horária e planos de aula.`
      : 'O trimestre decorreu dentro da normalidade curricular com 94% de cumprimento do calendário escolar ministerial. Recomenda-se a homologação dos resultados provisórios.'
  );

  // Lista de classes disponíveis baseada nas turmas permitidas para o usuário
  const classesDisponiveis = useMemo(() => {
    const setClasses = new Set<string>();
    turmasPermitidas.forEach(t => {
      if (t.classe) setClasses.add(t.classe);
    });
    return Array.from(setClasses).sort();
  }, [turmasPermitidas]);

  // Turmas filtradas pelo ciclo, curso e classe
  const turmasFiltradas = useMemo(() => {
    return turmasPermitidas.filter(t => {
      if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroCiclo !== 'TODOS') {
        const cicloTurma = formatarCicloPorClasse(t.classe);
        if (!cicloTurma.toLowerCase().includes(filtroCiclo.toLowerCase())) return false;
      }
      if (filtroCurso !== 'TODOS' && t.curso !== filtroCurso) return false;
      return true;
    });
  }, [turmasPermitidas, filtroClasse, filtroCiclo, filtroCurso]);

  // Turmas ativas no relatório
  const turmasAlvo = useMemo(() => {
    if (filtroTurmaId !== 'TODAS') {
      return turmasFiltradas.filter(t => t.id === filtroTurmaId);
    }
    return turmasFiltradas;
  }, [turmasFiltradas, filtroTurmaId]);

  // Cálculos consolidados para o Mapa de Rendimento Escolar por Turma
  const mapaRendimentoTurmas = useMemo(() => {
    return turmasAlvo.map(t => {
      const alunosDaTurma = alunos.filter(a => a.turmaId === t.id);
      const matriculadosM = alunosDaTurma.filter(a => a.genero === 'M').length;
      const matriculadosF = alunosDaTurma.filter(a => a.genero === 'F').length;
      const matriculadosTotal = alunosDaTurma.length;

      const desistentes = alunosDaTurma.filter(a => a.estado === 'Desistente' || a.estado === 'Transferido');
      const desistentesTotal = desistentes.length;

      const ativos = alunosDaTurma.filter(a => a.estado !== 'Desistente' && a.estado !== 'Transferido');
      const avaliadosTotal = ativos.length;
      const avaliadosM = ativos.filter(a => a.genero === 'M').length;
      const avaliadosF = ativos.filter(a => a.genero === 'F').length;

      // Calcular médias e transição de cada aluno na turma
      const escala = obterInformacaoEscala(t.classe);
      const notaCorte = escala.notaAprovacao; // 10 valores (ou 3 na escala 0-5)

      let aprovadosTotal = 0;
      let aprovadosM = 0;
      let aprovadosF = 0;
      let reprovadosTotal = 0;
      let somaMedias = 0;
      let alunosComNotasContador = 0;

      ativos.forEach(aluno => {
        // Se houver docente alvo ou disciplina específica, avalia com base nesses critérios
        const notasDoAluno = notas.filter(n => {
          if (n.alunoId !== aluno.id) return false;
          if (n.anoLectivo && n.anoLectivo !== filtroAno) return false;
          if (filtroTrimestre !== 'anual' && n.trimestre && String(n.trimestre) !== filtroTrimestre) return false;
          if (filtroDisciplinaId !== 'TODAS' && n.disciplinaId !== filtroDisciplinaId) return false;
          if (docenteAlvo && disciplinasDocenteIds.size > 0) {
            return disciplinasDocenteIds.has(n.disciplinaId);
          }
          return true;
        });

        if (notasDoAluno.length > 0) {
          const somaNotas = notasDoAluno.reduce((acc, n) => {
            const val = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
            return acc + val;
          }, 0);
          const mediaAluno = somaNotas / notasDoAluno.length;
          somaMedias += mediaAluno;
          alunosComNotasContador++;

          if (mediaAluno >= notaCorte) {
            aprovadosTotal++;
            if (aluno.genero === 'M') aprovadosM++;
            else aprovadosF++;
          } else {
            reprovadosTotal++;
          }
        }
      });

      const percAprovados = avaliadosTotal > 0 ? ((aprovadosTotal / avaliadosTotal) * 100).toFixed(1) : '0.0';
      const percReprovados = avaliadosTotal > 0 ? ((reprovadosTotal / avaliadosTotal) * 100).toFixed(1) : '0.0';
      const mediaTurma = alunosComNotasContador > 0 ? (somaMedias / alunosComNotasContador).toFixed(1) : '—';

      return {
        turma: t,
        matriculadosTotal,
        matriculadosM,
        matriculadosF,
        desistentesTotal,
        avaliadosTotal,
        avaliadosM,
        avaliadosF,
        aprovadosTotal,
        aprovadosM,
        aprovadosF,
        percAprovados,
        reprovadosTotal,
        percReprovados,
        mediaTurma,
        ehTerminal: isClasseFinal(t.classe)
      };
    });
  }, [turmasAlvo, alunos, notas, filtroAno, filtroTrimestre, filtroDisciplinaId, docenteAlvo, disciplinasDocenteIds]);

  // Rendimento por Disciplina (estritamente na ordem configurada na gestão de disciplinas)
  const rendimentoPorDisciplina = useMemo(() => {
    const refClasse = filtroClasse !== 'TODAS' ? filtroClasse : (turmasAlvo[0]?.classe || '10ª');
    const refCurso = filtroCurso !== 'TODOS' ? filtroCurso : turmasAlvo[0]?.curso;
    const disciplinasDaGrelha = filtrarDisciplinasDaClasse(disciplinasPermitidas, refClasse, refCurso);
    const disciplinasFinais = filtroDisciplinaId !== 'TODAS'
      ? disciplinasDaGrelha.filter(d => d.id === filtroDisciplinaId)
      : disciplinasDaGrelha;

    return disciplinasFinais.map(disc => {
      let totalAvaliados = 0;
      let totalPositivas = 0;
      let totalNegativas = 0;
      let somaNotas = 0;

      turmasAlvo.forEach(t => {
        const alunosTurma = alunos.filter(a => a.turmaId === t.id && a.estado !== 'Desistente');
        const escala = obterInformacaoEscala(t.classe);

        alunosTurma.forEach(aluno => {
          const n = notas.find(item => 
            item.alunoId === aluno.id && 
            item.disciplinaId === disc.id &&
            (!item.anoLectivo || item.anoLectivo === filtroAno) &&
            (filtroTrimestre === 'anual' || !item.trimestre || String(item.trimestre) === filtroTrimestre)
          );

          if (n) {
            const notaVal = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
            totalAvaliados++;
            somaNotas += notaVal;
            if (notaVal >= escala.notaAprovacao) {
              totalPositivas++;
            } else {
              totalNegativas++;
            }
          }
        });
      });

      const taxaAproveitamento = totalAvaliados > 0 ? ((totalPositivas / totalAvaliados) * 100).toFixed(1) : '0.0';
      const mediaDisciplina = totalAvaliados > 0 ? (somaNotas / totalAvaliados).toFixed(1) : '—';
      
      let statusQualitativo = 'Sem Avaliações';
      if (totalAvaliados > 0) {
        const pct = parseFloat(taxaAproveitamento);
        if (pct >= 85) statusQualitativo = 'Excelente';
        else if (pct >= 65) statusQualitativo = 'Bom';
        else if (pct >= 50) statusQualitativo = 'Regular';
        else statusQualitativo = 'Crítico / Atenção';
      }

      return {
        disciplina: disc,
        ordem: disc.ordem ?? 999,
        totalAvaliados,
        totalPositivas,
        totalNegativas,
        taxaAproveitamento,
        mediaDisciplina,
        statusQualitativo
      };
    });
  }, [disciplinasPermitidas, filtroClasse, filtroCurso, filtroDisciplinaId, turmasAlvo, alunos, notas, filtroAno, filtroTrimestre]);

  // Relatório de Assiduidade e Faltas
  const dadosAssiduidade = useMemo(() => {
    return turmasAlvo.map(t => {
      const alunosTurma = alunos.filter(a => a.turmaId === t.id && a.estado !== 'Desistente');
      let totalFaltasTurma = 0;
      let alunosEmRiscoFaltas = 0; // Mais de 20 faltas no trimestre

      alunosTurma.forEach(aluno => {
        const notasAluno = notas.filter(n => {
          if (n.alunoId !== aluno.id) return false;
          if (n.anoLectivo && n.anoLectivo !== filtroAno) return false;
          if (filtroTrimestre !== 'anual' && n.trimestre && String(n.trimestre) !== filtroTrimestre) return false;
          if (filtroDisciplinaId !== 'TODAS' && n.disciplinaId !== filtroDisciplinaId) return false;
          if (docenteAlvo && disciplinasDocenteIds.size > 0) {
            return disciplinasDocenteIds.has(n.disciplinaId);
          }
          return true;
        });
        const faltasAluno = notasAluno.reduce((acc, n) => acc + (n.faltas || 0), 0);
        totalFaltasTurma += faltasAluno;
        if (faltasAluno >= 20) alunosEmRiscoFaltas++;
      });

      const mediaFaltasPorAluno = alunosTurma.length > 0 ? (totalFaltasTurma / alunosTurma.length).toFixed(1) : '0';
      const taxaAssiduidadeEstimada = Math.max(0, 100 - (parseFloat(mediaFaltasPorAluno) * 1.5)).toFixed(1);

      return {
        turma: t,
        totalAlunos: alunosTurma.length,
        totalFaltasTurma,
        mediaFaltasPorAluno,
        alunosEmRiscoFaltas,
        taxaAssiduidadeEstimada
      };
    });
  }, [turmasAlvo, alunos, notas, filtroAno, filtroTrimestre, filtroDisciplinaId, docenteAlvo, disciplinasDocenteIds]);

  // Distribuição de Carga Horária Docente
  const distribuicaoCargaDocente = useMemo(() => {
    const listaProfessores = docenteAlvo
      ? [docenteAlvo]
      : listaDocentes.length > 0
        ? listaDocentes
        : funcionarios.filter(f => 
            f.categoriaProfissional?.toLowerCase().includes('prof') || 
            f.categoriaProfissional?.toLowerCase().includes('doc') ||
            Boolean(f.especialidade)
          );

    return listaProfessores.map(doc => {
      const turmasDoProf = turmas.filter(t => 
        t.coordenadorId === doc.id ||
        (t.coordenadorNome && t.coordenadorNome.toLowerCase() === doc.nomeCompleto.toLowerCase()) ||
        (t.directorTurmaNome && t.directorTurmaNome.toLowerCase() === doc.nomeCompleto.toLowerCase()) ||
        atribuicoesTodas.some(a => a.professorId === doc.id && a.turmaId === t.id)
      );
      const turmasNomes = turmasDoProf.length > 0 
        ? turmasDoProf.map(t => t.nome).join(', ') 
        : 'Docência em Turmas Curriculares';
      
      const discAtribs = atribuicoesTodas
        .filter(a => a.professorId === doc.id)
        .map(a => disciplinas.find(d => d.id === a.disciplinaId)?.nome)
        .filter(Boolean);

      const discNomes = discAtribs.length > 0 
        ? Array.from(new Set(discAtribs)).join(', ') 
        : (doc.especialidade || 'Docência Curricular (MED)');
      
      const temposSemanais = Math.max(doc.cargaHorariaSemanal || (turmasDoProf.length * 4), turmasDoProf.length * 2, 4);

      return {
        docente: doc,
        disciplinas: discNomes,
        turmasContagem: Math.max(turmasDoProf.length, 1),
        turmasNomes,
        temposSemanais,
        regime: doc.tipoContrato || 'Quadro Efetivo (MED)'
      };
    });
  }, [funcionarios, turmas, isProfessor, currentUser, atribuicoesTodas, disciplinas]);

  // Totais Gerais do Mapa
  const totaisGeraisMapa = useMemo(() => {
    let matriculados = 0;
    let avaliados = 0;
    let aprovados = 0;
    let reprovados = 0;

    mapaRendimentoTurmas.forEach(m => {
      matriculados += m.matriculadosTotal;
      avaliados += m.avaliadosTotal;
      aprovados += m.aprovadosTotal;
      reprovados += m.reprovadosTotal;
    });

    const taxaGeral = avaliados > 0 ? ((aprovados / avaliados) * 100).toFixed(1) : '0.0';

    return { matriculados, avaliados, aprovados, reprovados, taxaGeral };
  }, [mapaRendimentoTurmas]);

  // Ação de Imprimir Relatório
  const handleImprimir = () => {
    window.print();
  };

  // Exportação em Excel Oficial (.xlsx)
  const handleExportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Folha 1: Mapa Estatístico Geral MED
      const dadosMapa = mapaRendimentoTurmas.map((m, idx) => ({
        'Nº': idx + 1,
        'Turma': m.turma.nome,
        'Classe': m.turma.classe,
        'Curso': m.turma.curso || 'Geral',
        'Turno': m.turma.turno || 'Manhã',
        'Matrícula Total': m.matriculadosTotal,
        'Matrícula M': m.matriculadosM,
        'Matrícula F': m.matriculadosF,
        'Desistentes': m.desistentesTotal,
        'Avaliados Total': m.avaliadosTotal,
        'Avaliados M': m.avaliadosM,
        'Avaliados F': m.avaliadosF,
        'Aprovados Total': m.aprovadosTotal,
        'Aprovados M': m.aprovadosM,
        'Aprovados F': m.aprovadosF,
        '% Aprovados': `${m.percAprovados}%`,
        'Reprovados Total': m.reprovadosTotal,
        '% Reprovados': `${m.percReprovados}%`,
        'Média da Turma': m.mediaTurma,
        'Classe Final': m.ehTerminal ? 'SIM (Exame Nacional)' : 'NÃO'
      }));
      const wsMapa = XLSX.utils.json_to_sheet(dadosMapa);
      XLSX.utils.book_append_sheet(wb, wsMapa, isProfessor ? 'Rendimento_Turmas_Docente' : 'Mapa_Rendimento_MED');

      // Folha 2: Rendimento por Disciplina
      const dadosDisc = rendimentoPorDisciplina.map(r => ({
        'Ordem': r.ordem,
        'Disciplina': r.disciplina.nome,
        'Código': r.disciplina.codigo || '—',
        'Total Avaliados': r.totalAvaliados,
        'Notas Positivas': r.totalPositivas,
        'Notas Negativas': r.totalNegativas,
        'Taxa de Sucesso (%)': `${r.taxaAproveitamento}%`,
        'Média Geral': r.mediaDisciplina,
        'Classificação Qualitativa': r.statusQualitativo
      }));
      const wsDisc = XLSX.utils.json_to_sheet(dadosDisc);
      XLSX.utils.book_append_sheet(wb, wsDisc, isProfessor ? 'Rendimento_Disciplinas_Docente' : 'Rendimento_Disciplinas');

      // Folha 3: Assiduidade
      const dadosAssid = dadosAssiduidade.map(a => ({
        'Turma': a.turma.nome,
        'Classe': a.turma.classe,
        'Total Alunos': a.totalAlunos,
        'Total Faltas Registadas': a.totalFaltasTurma,
        'Média de Faltas/Aluno': a.mediaFaltasPorAluno,
        'Alunos em Risco (>20 Faltas)': a.alunosEmRiscoFaltas,
        'Taxa de Assiduidade (%)': `${a.taxaAssiduidadeEstimada}%`
      }));
      const wsAssid = XLSX.utils.json_to_sheet(dadosAssid);
      XLSX.utils.book_append_sheet(wb, wsAssid, 'Mapa_Assiduidade');

      // Folha 4: Carga Horária Docente
      const dadosDoc = distribuicaoCargaDocente.map(d => ({
        'Docente': d.docente.nomeCompleto,
        'Cargo': d.docente.categoriaProfissional || 'Professor (MED)',
        'Disciplinas': d.disciplinas,
        'Nº de Turmas': d.turmasContagem,
        'Turmas': d.turmasNomes,
        'Tempos Semanais': d.temposSemanais,
        'Regime Contratual': d.regime
      }));
      const wsDoc = XLSX.utils.json_to_sheet(dadosDoc);
      XLSX.utils.book_append_sheet(wb, wsDoc, 'Carga_Horaria_Docente');

      const prefixo = docenteAlvo 
        ? `RELATORIO_DOCENTE_${docenteAlvo.nomeCompleto.replace(/\s+/g, '_').toUpperCase()}` 
        : `RELATORIO_MED_${escola.sigla || 'ESCOLA'}`;
      const fileName = `${prefixo}_${filtroAno.replace('/', '-')}_T${filtroTrimestre}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao gerar ficheiro Excel:', err);
      alert('Erro ao exportar o relatório para Excel. Por favor tente novamente.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* SELETOR DE ESCOLA PARA ADMIN GERAL (MINISTERIAL / REDE NACIONAL) */}
      {isAdminGeral && escolas.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                  Supervisão Ministerial da Rede Nacional de Angola
                </span>
                <p className="text-xs text-purple-700">
                  Selecione a instituição escolar para emitir os balanços estatísticos oficiais:
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-purple-900 whitespace-nowrap">Escola:</span>
              <select
                value={escola.id}
                onChange={e => onMudarEscola && onMudarEscola(e.target.value)}
                className="bg-white border-2 border-purple-300 rounded-xl px-3 py-1.5 text-xs font-black text-purple-950 focus:ring-2 focus:ring-purple-600 shadow-sm"
              >
                {escolas.map(esc => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nomeOficial || esc.nome} ({esc.municipio || 'Angola'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* BANNER CONTEXTUAL ESPECÍFICO DE ESCOLA & PAPEL DO USUÁRIO */}
      <div className="print:hidden space-y-3">
        {isDocenteOuCoordenador ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-950 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-emerald-900">
                    {isProfessor ? 'Relatório Individual do Professor:' : 'Relatório de Coordenação:'} {currentUser?.nomeCompleto}
                  </h3>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                    {currentUser?.cargo || currentUser?.categoriaProfissional || 'Docente'}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Instituição: <strong>{escola.nomeOficial || escola.nome}</strong> • {modoVisao === 'minhas_atribuicoes' ? (
                    <span>A visualizar dados exclusivos das suas <strong>{turmasPermitidas.length} turmas</strong> e <strong>{disciplinasPermitidas.length} disciplinas</strong> atribuídas.</span>
                  ) : (
                    <span>Modo de visualização ampliado: Consulta global de <strong>todas as {turmas.length} turmas</strong> da escola.</span>
                  )}
                </p>
              </div>
            </div>

            {/* SELETOR DE MODO DE VISÃO PARA PROFESSORES E COORDENADORES */}
            <div className="flex items-center space-x-1 bg-white/80 p-1 rounded-xl border border-emerald-300 shadow-xs self-start md:self-center">
              <button
                type="button"
                onClick={() => {
                  setModoVisao('minhas_atribuicoes');
                  setFiltroTurmaId('TODAS');
                  setFiltroDisciplinaId('TODAS');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVisao === 'minhas_atribuicoes'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                Minhas Atribuições
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoVisao('toda_escola');
                  setFiltroTurmaId('TODAS');
                  setFiltroDisciplinaId('TODAS');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVisao === 'toda_escola'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                Toda a Escola (Geral)
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-900 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-slate-900">
                    Direcção da Escola: {escola.nomeOficial || escola.nome}
                  </h3>
                  <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                    Acesso Pleno da Liderança
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {docenteAlvo ? (
                    <span>A auditar relatório detalhado do(a) docente <strong>{docenteAlvo.nomeCompleto}</strong> ({turmasPermitidas.length} turmas • {disciplinasPermitidas.length} disciplinas).</span>
                  ) : (
                    <span>Relatório Institucional Integral do Estabelecimento de Ensino ({turmas.length} turmas • {alunos.length} alunos matriculados • {escola.municipio || 'Angola'}).</span>
                  )}
                </p>
              </div>
            </div>

            {/* SELETOR DE PROFESSOR PARA A DIREÇÃO AUDITAR QUALQUER DOCENTE OU VER A ESCOLA TODA */}
            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-slate-300 shadow-xs">
              <Users className="w-4 h-4 text-slate-500" />
              <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Auditar Docente:</label>
              <select
                value={filtroDocenteId}
                onChange={e => {
                  setFiltroDocenteId(e.target.value);
                  setFiltroTurmaId('TODAS');
                  setFiltroDisciplinaId('TODAS');
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 max-w-xs"
              >
                <option value="TODOS">Todos os Professores (Escola Completa)</option>
                {listaDocentes.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nomeCompleto} — {d.especialidade || d.categoriaProfissional || 'Professor'}
                  </option>
                ))}
              </select>
              {filtroDocenteId !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroDocenteId('TODOS');
                    setFiltroTurmaId('TODAS');
                    setFiltroDisciplinaId('TODAS');
                  }}
                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-bold transition-all"
                  title="Voltar ao Relatório Geral da Escola"
                >
                  ✕ Geral
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CABEÇALHO DO MÓDULO DE RELATÓRIOS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  {docenteAlvo ? `Relatório Pedagógico: ${docenteAlvo.nomeCompleto}` : 'Relatórios Oficiais & Balanços MED'}
                </h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  {escola.sigla || 'MED'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {docenteAlvo
                  ? 'Balanço detalhado de aproveitamento das turmas e disciplinas sob lecionação do docente, pronto para emissão e download.'
                  : 'Emissão oficial de mapas estatísticos de rendimento, aproveitamento por disciplina, assiduidade e pareceres pedagógicos ministeriais da escola.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportarExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
              title="Baixar Dossier Estatístico Completo em Formato Excel"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={async () => {
                setIsDownloadingPdf(true);
                try {
                  await downloadElementAsPdf(
                    'relatorio-pedagogico-oficial-doc',
                    `Relatorio_Oficial_${(escola.sigla || escola.nome || 'MED').replace(/\s+/g, '_')}_${filtroAno.replace('/', '-')}`,
                    { orientation: 'portrait', format: 'a4' }
                  );
                } finally {
                  setIsDownloadingPdf(false);
                }
              }}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
              title="Baixar Relatório Oficial em formato PDF com formatação exata"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'Gerando PDF...' : 'Baixar PDF (.pdf)'}</span>
            </button>
            <button
              onClick={handleImprimir}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
              title="Imprimir Relatório Formatado para A4"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório (A4)</span>
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS ADAPTADOS: ANO, TRIMESTRE, CICLO, CURSO, CLASSE, TURMA, DISCIPLINA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mt-6 pt-5 border-t border-slate-100">
          {/* Ano Lectivo */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Ano Letivo</span>
            </label>
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {anosConfigs.length > 0 ? (
                anosConfigs.map(a => (
                  <option key={a.id} value={a.rotulo || a.ano}>{a.rotulo || a.ano}</option>
                ))
              ) : (
                <option value={escola.anoLectivoActivo || '2024/2025'}>{escola.anoLectivoActivo || '2024/2025'}</option>
              )}
            </select>
          </div>

          {/* Trimestre */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Trimestre</span>
            </label>
            <select
              value={filtroTrimestre}
              onChange={e => setFiltroTrimestre(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Iº Trimestre</option>
              <option value="2">IIº Trimestre</option>
              <option value="3">IIIº Trimestre</option>
              <option value="anual">Consolidado Anual Geral</option>
            </select>
          </div>

          {/* Ciclo de Ensino */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Ciclo</span>
            </label>
            <select
              value={filtroCiclo}
              onChange={e => {
                setFiltroCiclo(e.target.value);
                setFiltroClasse('TODAS');
                setFiltroTurmaId('TODAS');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos os Ciclos</option>
              <option value="Primário">Ensino Primário</option>
              <option value="Iº Ciclo">Iº Ciclo Secundário</option>
              <option value="IIº Ciclo">IIº Ciclo / Técnico</option>
            </select>
          </div>

          {/* Curso */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Curso</span>
            </label>
            <select
              value={filtroCurso}
              onChange={e => {
                setFiltroCurso(e.target.value);
                setFiltroTurmaId('TODAS');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos os Cursos ({cursosDisponiveis.length})</option>
              {cursosDisponiveis.map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>

          {/* Classe */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Classe</span>
            </label>
            <select
              value={filtroClasse}
              onChange={e => {
                setFiltroClasse(e.target.value);
                setFiltroTurmaId('TODAS');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas as Classes ({classesDisponiveis.length})</option>
              {classesDisponiveis.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Turma */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Turma</span>
            </label>
            <select
              value={filtroTurmaId}
              onChange={e => setFiltroTurmaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">
                {docenteAlvo ? `Todas as Turmas do Docente (${turmasFiltradas.length})` : `Todas as Turmas (${turmasFiltradas.length})`}
              </option>
              {turmasFiltradas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.classe})</option>
              ))}
            </select>
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Disciplina</span>
            </label>
            <select
              value={filtroDisciplinaId}
              onChange={e => setFiltroDisciplinaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas as Disciplinas ({disciplinasPermitidas.length})</option>
              {disciplinasPermitidas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE SUB-RELATÓRIOS */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setSubAbaAtiva('mapa_rendimento')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
              subAbaAtiva === 'mapa_rendimento'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'Rendimento das Minhas Turmas' : 'Mapa Geral de Rendimento MED'}</span>
          </button>

          <button
            onClick={() => setSubAbaAtiva('rendimento_disciplina')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
              subAbaAtiva === 'rendimento_disciplina'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'Rendimento das Minhas Disciplinas' : 'Rendimento Curricular por Disciplina'}</span>
          </button>

          <button
            onClick={() => setSubAbaAtiva('assiduidade_faltas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
              subAbaAtiva === 'assiduidade_faltas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mapa de Assiduidade & Faltas</span>
          </button>

          <button
            onClick={() => setSubAbaAtiva('carga_horaria')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
              subAbaAtiva === 'carga_horaria'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'A Minha Carga Horária Docente' : 'Carga Horária & Quadro Docente'}</span>
          </button>

          <button
            onClick={() => setSubAbaAtiva('balanco_pedagogico')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
              subAbaAtiva === 'balanco_pedagogico'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isProfessor ? 'Balanço Individual do Docente' : 'Balanço Narrativo & Parecer da Direção'}</span>
          </button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL A4 PARA VISUALIZAÇÃO E IMPRESSÃO */}
      <div id="relatorio-pedagogico-oficial-doc" className="bg-white rounded-2xl border border-slate-300 shadow-lg p-6 sm:p-10 print:p-0 print:border-none print:shadow-none">
        {/* CABEÇALHO OFICIAL DO MINISTÉRIO DA EDUCAÇÃO DE ANGOLA */}
        <div className="text-center space-y-1 mb-8 border-b-2 border-slate-800 pb-5">
          <div className="flex justify-center mb-2">
            <InsigniaAngola customUrl={configSistema.insigniaNacionalUrl} className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-900">
            República de Angola
          </h2>
          <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-800">
            Governo da Província de {escola.provincia || 'Luanda'}
          </h3>
          <h4 className="text-xs sm:text-sm font-bold uppercase text-slate-700">
            Gabinete Provincial de Educação / Direcção Municipal de {escola.municipio || 'Cazenga'}
          </h4>
          <h1 className="text-base sm:text-lg font-black uppercase text-blue-950 mt-1">
            {escola.nomeOficial || escola.nome}
          </h1>
          <p className="text-[11px] font-semibold text-slate-600">
            Código da Escola: {escola.codigoEscola || 'MED-ANG'} • NIF: {escola.nif || '5000000000'}
          </p>

          <div className="mt-3 inline-block bg-slate-100 px-4 py-1 rounded border border-slate-300">
            <span className="text-xs font-black uppercase text-slate-900">
              {isProfessor ? (
                `RELATÓRIO INDIVIDUAL DO PROFESSOR: ${currentUser?.nomeCompleto?.toUpperCase()} — ${filtroTrimestre === 'anual' ? 'GLOBAL ANUAL' : `${filtroTrimestre}º TRIMESTRE`}`
              ) : (
                subAbaAtiva === 'mapa_rendimento' ? `MAPA ESTATÍSTICO DE RENDIMENTO ESCOLAR — ${filtroTrimestre === 'anual' ? 'GLOBAL ANUAL' : `${filtroTrimestre}º TRIMESTRE`}` :
                subAbaAtiva === 'rendimento_disciplina' ? `MAPA DE RENDIMENTO CURRICULAR POR DISCIPLINA — ${filtroTrimestre === 'anual' ? 'GLOBAL ANUAL' : `${filtroTrimestre}º TRIMESTRE`}` :
                subAbaAtiva === 'assiduidade_faltas' ? `MAPA OFICIAL DE ASSIDUIDADE E FREQUÊNCIA — ${filtroTrimestre === 'anual' ? 'GLOBAL ANUAL' : `${filtroTrimestre}º TRIMESTRE`}` :
                subAbaAtiva === 'carga_horaria' ? `QUADRO OFICIAL DE CARGA HORÁRIA E CORPO DOCENTE` :
                `BALANÇO PEDAGÓGICO E PARECER OFICIAL DA SUBDIRECÇÃO PEDAGÓGICA`
              )}
              {' — '}ANO LECTIVO {filtroAno}
            </span>
          </div>
        </div>

        {/* SUB-ABA 1: MAPA GERAL DE RENDIMENTO MED */}
        {subAbaAtiva === 'mapa_rendimento' && (
          <div className="space-y-6">
            {/* Cards de Resumo Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {isProfessor ? 'Matrícula das Suas Turmas' : 'Matrícula Total'}
                </span>
                <p className="text-2xl font-black text-slate-800">{totaisGeraisMapa.matriculados}</p>
                <span className="text-[10px] text-slate-400">Estudantes</span>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-xs font-bold text-blue-600 uppercase">Avaliados</span>
                <p className="text-2xl font-black text-blue-900">{totaisGeraisMapa.avaliados}</p>
                <span className="text-[10px] text-blue-600">Alunos com Notas</span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs font-bold text-emerald-600 uppercase">Aprovados / Apto</span>
                <p className="text-2xl font-black text-emerald-900">{totaisGeraisMapa.aprovados}</p>
                <span className="text-[10px] text-emerald-600 font-bold">{totaisGeraisMapa.taxaGeral}% de Sucesso</span>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-xs font-bold text-rose-600 uppercase">Não Transitam</span>
                <p className="text-2xl font-black text-rose-900">{totaisGeraisMapa.reprovados}</p>
                <span className="text-[10px] text-rose-600">Necessitam de Apoio</span>
              </div>
            </div>

            {/* TABELA OFICIAL MINISTERIAL MED */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
                <thead className="bg-slate-100 font-bold text-center text-[10px]">
                  <tr>
                    <th rowSpan={2} className="p-2 border-r border-black w-8">Nº</th>
                    <th rowSpan={2} className="p-2 border-r border-black text-left">TURMA / CLASSE</th>
                    <th rowSpan={2} className="p-2 border-r border-black text-left">CURSO</th>
                    <th colSpan={3} className="p-1 border-r border-black bg-slate-200">MATRÍCULA INICIAL</th>
                    <th rowSpan={2} className="p-2 border-r border-black w-14">DESIST.</th>
                    <th colSpan={3} className="p-1 border-r border-black bg-blue-50">AVALIADOS</th>
                    <th colSpan={3} className="p-1 border-r border-black bg-emerald-50">APROVADOS (APTO)</th>
                    <th colSpan={2} className="p-1 border-r border-black bg-rose-50">NÃO TRANSITAM</th>
                    <th rowSpan={2} className="p-2 border-r border-black w-14">MÉDIA</th>
                    <th rowSpan={2} className="p-2 w-16">EXAME</th>
                  </tr>
                  <tr className="bg-slate-50 text-[9px]">
                    <th className="p-1 border-r border-black w-8">MF</th>
                    <th className="p-1 border-r border-black w-8">M</th>
                    <th className="p-1 border-r border-black w-8">F</th>
                    <th className="p-1 border-r border-black w-8 bg-blue-50">MF</th>
                    <th className="p-1 border-r border-black w-8 bg-blue-50">M</th>
                    <th className="p-1 border-r border-black w-8 bg-blue-50">F</th>
                    <th className="p-1 border-r border-black w-8 bg-emerald-50">MF</th>
                    <th className="p-1 border-r border-black w-8 bg-emerald-50">%</th>
                    <th className="p-1 border-r border-black w-8 bg-emerald-50">F</th>
                    <th className="p-1 border-r border-black w-8 bg-rose-50">MF</th>
                    <th className="p-1 border-r border-black w-8 bg-rose-50">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {mapaRendimentoTurmas.length > 0 ? (
                    mapaRendimentoTurmas.map((item, idx) => (
                      <tr key={item.turma.id} className="hover:bg-slate-50 text-center">
                        <td className="p-1.5 border-r border-black">{idx + 1}</td>
                        <td className="p-1.5 border-r border-black text-left font-sans font-bold uppercase">{item.turma.nome}</td>
                        <td className="p-1.5 border-r border-black text-left font-sans text-[10px] truncate max-w-[120px]">{item.turma.curso || 'Ensino Geral'}</td>
                        <td className="p-1 border-r border-black font-bold">{item.matriculadosTotal}</td>
                        <td className="p-1 border-r border-black text-slate-600">{item.matriculadosM}</td>
                        <td className="p-1 border-r border-black text-slate-600">{item.matriculadosF}</td>
                        <td className="p-1 border-r border-black text-rose-700">{item.desistentesTotal}</td>
                        <td className="p-1 border-r border-black font-bold bg-blue-50/50">{item.avaliadosTotal}</td>
                        <td className="p-1 border-r border-black bg-blue-50/50 text-slate-600">{item.avaliadosM}</td>
                        <td className="p-1 border-r border-black bg-blue-50/50 text-slate-600">{item.avaliadosF}</td>
                        <td className="p-1 border-r border-black font-bold text-emerald-800 bg-emerald-50/50">{item.aprovadosTotal}</td>
                        <td className="p-1 border-r border-black font-bold text-emerald-800 bg-emerald-50/50">{item.percAprovados}%</td>
                        <td className="p-1 border-r border-black bg-emerald-50/50 text-slate-600">{item.aprovadosF}</td>
                        <td className="p-1 border-r border-black font-bold text-rose-800 bg-rose-50/50">{item.reprovadosTotal}</td>
                        <td className="p-1 border-r border-black bg-rose-50/50 text-rose-800">{item.percReprovados}%</td>
                        <td className="p-1 border-r border-black font-black bg-slate-100">{item.mediaTurma}</td>
                        <td className="p-1 font-sans text-[9px] font-bold">
                          {item.ehTerminal ? (
                            <span className="text-amber-800 font-black">EXAME</span>
                          ) : (
                            <span className="text-slate-400">Transição</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={17} className="p-6 text-center font-sans text-slate-500 italic">
                        {isProfessor 
                          ? 'Nenhuma turma atribuída localizada para o professor.' 
                          : 'Nenhuma turma localizada para os critérios de filtro selecionados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-200 font-bold text-center border-t-2 border-black font-mono">
                  <tr>
                    <td colSpan={3} className="p-2 border-r border-black text-right font-sans uppercase">
                      {isProfessor ? 'TOTAIS DO DOCENTE:' : 'TOTAIS DA INSTITUIÇÃO:'}
                    </td>
                    <td className="p-1 border-r border-black">{totaisGeraisMapa.matriculados}</td>
                    <td colSpan={2} className="p-1 border-r border-black text-[10px] font-sans">—</td>
                    <td className="p-1 border-r border-black text-rose-800">
                      {mapaRendimentoTurmas.reduce((acc, i) => acc + i.desistentesTotal, 0)}
                    </td>
                    <td className="p-1 border-r border-black font-black text-blue-900">{totaisGeraisMapa.avaliados}</td>
                    <td colSpan={2} className="p-1 border-r border-black text-[10px] font-sans">—</td>
                    <td className="p-1 border-r border-black font-black text-emerald-900">{totaisGeraisMapa.aprovados}</td>
                    <td className="p-1 border-r border-black font-black text-emerald-900">{totaisGeraisMapa.taxaGeral}%</td>
                    <td colSpan={2} className="p-1 border-r border-black text-[10px] font-sans">—</td>
                    <td className="p-1 border-r border-black font-black text-rose-900">{totaisGeraisMapa.reprovados}</td>
                    <td colSpan={2} className="p-1 font-sans text-[10px] text-slate-700">Conforme MED</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="text-[10px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p><strong>Nota Informativa MED:</strong> Conforme o regulamento das Escolas do Ensino Geral de Angola, o aproveitamento escolar positivo exige nota igual ou superior a 10 valores na escala de 0 a 20 (ou 3 valores no Ensino Primário escala 0-5). Para as classes terminais (6ª, 9ª e 12ª/13ª), os resultados finais estão condicionados à realização do Exame Nacional / Prova de Escola.</p>
            </div>
          </div>
        )}

        {/* SUB-ABA 2: RENDIMENTO POR DISCIPLINA */}
        {subAbaAtiva === 'rendimento_disciplina' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900">
              <p className="font-bold flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-700" />
                <span>
                  {isProfessor 
                    ? `Aproveitamento das Disciplinas do(a) Prof(a). ${currentUser?.nomeCompleto || ''}` 
                    : 'Grelha Curricular Padronizada MED na Ordem Oficial'}
                </span>
              </p>
              <p className="mt-1 text-slate-600">
                {isProfessor 
                  ? 'Exibição detalhada das disciplinas sob a responsabilidade do docente nas suas turmas atribuídas.' 
                  : 'As disciplinas abaixo respeitam rigorosamente a ordem curricular estabelecida na funcionalidade Disciplinas, permitindo ao Subdirector Pedagógico e à Comissão de Coordenação avaliar o rendimento por área do saber.'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
                <thead className="bg-slate-100 font-bold text-center text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-black w-10">ORD.</th>
                    <th className="p-2 border-r border-black text-left">DISCIPLINA</th>
                    <th className="p-2 border-r border-black w-24">CÓDIGO</th>
                    <th className="p-2 border-r border-black w-24 bg-blue-50">AVALIADOS</th>
                    <th className="p-2 border-r border-black w-24 bg-emerald-50">POSITIVAS (≥10)</th>
                    <th className="p-2 border-r border-black w-24 bg-rose-50">NEGATIVAS (&lt;10)</th>
                    <th className="p-2 border-r border-black w-24 bg-emerald-100">% APROVEIT.</th>
                    <th className="p-2 border-r border-black w-20">MÉDIA</th>
                    <th className="p-2 w-32">CLASSIFICAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {rendimentoPorDisciplina.length > 0 ? (
                    rendimentoPorDisciplina.map((item, idx) => (
                      <tr key={item.disciplina.id} className="hover:bg-slate-50 text-center">
                        <td className="p-2 border-r border-black font-bold">{item.ordem !== 999 ? item.ordem : idx + 1}</td>
                        <td className="p-2 border-r border-black text-left font-sans font-bold uppercase">{item.disciplina.nome}</td>
                        <td className="p-2 border-r border-black text-slate-600">{item.disciplina.codigo || '—'}</td>
                        <td className="p-2 border-r border-black font-bold bg-blue-50/50">{item.totalAvaliados}</td>
                        <td className="p-2 border-r border-black font-bold text-emerald-800 bg-emerald-50/50">{item.totalPositivas}</td>
                        <td className="p-2 border-r border-black font-bold text-rose-800 bg-rose-50/50">{item.totalNegativas}</td>
                        <td className="p-2 border-r border-black font-black text-emerald-900 bg-emerald-100/50">{item.taxaAproveitamento}%</td>
                        <td className="p-2 border-r border-black font-black bg-slate-100">{item.mediaDisciplina}</td>
                        <td className="p-2 font-sans text-[10px] font-bold">
                          <span className={`px-2 py-0.5 rounded ${
                            item.statusQualitativo === 'Excelente' ? 'bg-emerald-100 text-emerald-800' :
                            item.statusQualitativo === 'Bom' ? 'bg-blue-100 text-blue-800' :
                            item.statusQualitativo === 'Regular' ? 'bg-amber-100 text-amber-800' :
                            item.statusQualitativo === 'Crítico / Atenção' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {item.statusQualitativo}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-6 text-center font-sans text-slate-500 italic">
                        {isProfessor 
                          ? 'Nenhuma disciplina curricular atribuída a este professor para a turma/classe selecionada.' 
                          : 'Nenhuma disciplina curricular associada à classe selecionada.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-ABA 3: ASSIDUIDADE E FALTAS */}
        {subAbaAtiva === 'assiduidade_faltas' && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
                <thead className="bg-slate-100 font-bold text-center text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-black w-10">Nº</th>
                    <th className="p-2 border-r border-black text-left">TURMA</th>
                    <th className="p-2 border-r border-black text-left">CLASSE</th>
                    <th className="p-2 border-r border-black w-24">ESTUDANTES</th>
                    <th className="p-2 border-r border-black w-28">TOTAL DE FALTAS</th>
                    <th className="p-2 border-r border-black w-28">MÉDIA FALTAS/ALUNO</th>
                    <th className="p-2 border-r border-black w-36 bg-rose-50">EM RISCO (&gt;20 FALTAS)</th>
                    <th className="p-2 w-32 bg-emerald-50">TAXA DE FREQUÊNCIA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono text-center">
                  {dadosAssiduidade.length > 0 ? (
                    dadosAssiduidade.map((item, idx) => (
                      <tr key={item.turma.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-black">{idx + 1}</td>
                        <td className="p-2 border-r border-black text-left font-sans font-bold uppercase">{item.turma.nome}</td>
                        <td className="p-2 border-r border-black text-left font-sans">{item.turma.classe}</td>
                        <td className="p-2 border-r border-black font-bold">{item.totalAlunos}</td>
                        <td className="p-2 border-r border-black font-bold text-slate-700">{item.totalFaltasTurma}</td>
                        <td className="p-2 border-r border-black text-slate-700">{item.mediaFaltasPorAluno}</td>
                        <td className="p-2 border-r border-black font-bold text-rose-800 bg-rose-50/50">
                          {item.alunosEmRiscoFaltas > 0 ? `${item.alunosEmRiscoFaltas} Aluno(s)` : 'Nenhum'}
                        </td>
                        <td className="p-2 font-black text-emerald-800 bg-emerald-50/50">{item.taxaAssiduidadeEstimada}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center font-sans text-slate-500 italic">
                        Sem registos de presenças para o período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-ABA 4: DISTRIBUIÇÃO DE CARGA HORÁRIA E QUADRO DOCENTE */}
        {subAbaAtiva === 'carga_horaria' && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-black divide-y divide-black">
                <thead className="bg-slate-100 font-bold text-center text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-black w-10">Nº</th>
                    <th className="p-2 border-r border-black text-left">NOME DO PROFESSOR</th>
                    <th className="p-2 border-r border-black text-left">DISCIPLINA(S) LECCIONADA(S)</th>
                    <th className="p-2 border-r border-black w-24">Nº TURMAS</th>
                    <th className="p-2 border-r border-black text-left">TURMAS ATRIBUÍDAS</th>
                    <th className="p-2 border-r border-black w-28">CARGA SEMANAL</th>
                    <th className="p-2 w-32">VÍNCULO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-sans text-center">
                  {distribuicaoCargaDocente.length > 0 ? (
                    distribuicaoCargaDocente.map((item, idx) => (
                      <tr key={item.docente.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-black font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-black text-left font-bold uppercase">{item.docente.nomeCompleto}</td>
                        <td className="p-2 border-r border-black text-left text-slate-800">{item.disciplinas}</td>
                        <td className="p-2 border-r border-black font-mono font-bold">{item.turmasContagem}</td>
                        <td className="p-2 border-r border-black text-left text-[10px] text-slate-600">{item.turmasNomes}</td>
                        <td className="p-2 border-r border-black font-mono font-bold text-blue-900">{item.temposSemanais} Tempos</td>
                        <td className="p-2 text-[10px] font-semibold text-slate-700">{item.regime}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                        Nenhum funcionário docente cadastrado no quadro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-ABA 5: BALANÇO NARRATIVO & PARECER DA DIRECÇÃO */}
        {subAbaAtiva === 'balanco_pedagogico' && (
          <div className="space-y-6 text-slate-800 text-xs sm:text-sm leading-relaxed">
            <div className="space-y-3">
              <h3 className="font-black text-sm uppercase text-slate-900 border-b border-slate-300 pb-1">
                1. Introdução e Enquadramento Curricular
              </h3>
              <p className="text-justify">
                O presente documento formaliza o Balanço do Rendimento Escolar do <strong>{filtroTrimestre === 'anual' ? 'Consolidado Anual' : `${filtroTrimestre}º Trimestre`}</strong> referente ao <strong>Ano Lectivo {filtroAno}</strong>, na instituição <strong>{escola.nomeOficial || escola.nome}</strong>. {isProfessor ? (
                  `Este relatório expressa o aproveitamento pedagógico individual nas turmas lecionadas pelo(a) Prof(a). ${currentUser?.nomeCompleto || 'Docente'}.`
                ) : (
                  `A instituição operou com um corpo discente de ${totaisGeraisMapa.matriculados} estudantes sob regime pedagógico oficial MED.`
                )}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-black text-sm uppercase text-slate-900 border-b border-slate-300 pb-1">
                2. Síntese do Aproveitamento
              </h3>
              <p className="text-justify">
                Foram submetidos a avaliação contínua e sumativa um total de <strong>{totaisGeraisMapa.avaliados} alunos</strong>, registando-se uma taxa de aproveitamento positivo de <strong>{totaisGeraisMapa.taxaGeral}%</strong> ({totaisGeraisMapa.aprovados} alunos com aproveitamento satisfatório) e {totaisGeraisMapa.reprovados} alunos em regime de recuperação pedagógica.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-sm uppercase text-slate-900 border-b border-slate-300 pb-1">
                3. Dificuldades e Constrangimentos Registados
              </h3>
              <textarea
                value={parecerDificuldades}
                onChange={e => setParecerDificuldades(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-800 focus:ring-2 focus:ring-blue-500 print:bg-transparent print:border-none print:p-0"
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-sm uppercase text-slate-900 border-b border-slate-300 pb-1">
                4. Medidas de Intervenção e Reforço Curricular
              </h3>
              <textarea
                value={parecerMedidas}
                onChange={e => setParecerMedidas(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-800 focus:ring-2 focus:ring-blue-500 print:bg-transparent print:border-none print:p-0"
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-sm uppercase text-slate-900 border-b border-slate-300 pb-1">
                5. {isProfessor ? 'Parecer Conclusivo do Docente' : 'Parecer Conclusivo da Subdirecção Pedagógica'}
              </h3>
              <textarea
                value={parecerConclusao}
                onChange={e => setParecerConclusao(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-800 focus:ring-2 focus:ring-blue-500 print:bg-transparent print:border-none print:p-0"
              />
            </div>
          </div>
        )}

        {/* ASSINATURAS MINISTERIAIS NO FINAL DO DOCUMENTO */}
        <div className="mt-12 pt-8 border-t-2 border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="font-bold uppercase text-slate-900">
              {docenteAlvo ? 'O(A) Professor(a) / Docente Responsável' : 'O Subdirector Pedagógico'}
            </p>
            <div className="w-56 h-12 mx-auto border-b border-black mt-6"></div>
            <p className="text-[11px] font-semibold text-slate-700 mt-1">
              {docenteAlvo ? docenteAlvo.nomeCompleto : 'Assinatura & Rubrica'}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">
              {docenteAlvo ? 'Visto da Direcção / Subdirecção Pedagógica' : 'O Director Geral da Instituição'}
            </p>
            <div className="w-56 h-12 mx-auto border-b border-black mt-6"></div>
            <p className="text-[11px] font-semibold text-slate-700 mt-1">
              {escola.diretorGeralNome || 'Homologação e Carimbo Oficial'}
            </p>
          </div>
        </div>

        {/* RODAPÉ DO DOCUMENTO COM QR DE AUTENTICAÇÃO */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono">
          <div className="text-center sm:text-left">
            <p>Documento gerado pelo Sistema Integrado de Gestão Escolar (SGE Angola) em {new Date().toLocaleDateString('pt-AO')} às {new Date().toLocaleTimeString('pt-AO')}</p>
            <p className="font-bold text-slate-700 mt-0.5">{escola.nomeOficial || escola.nome}</p>
          </div>
          <OfficialQrCode
            value={gerarPayloadQrDocumento({
              docType: 'RELATORIO_OFICIAL',
              escolaId: escola.id,
              docRef: `${subAbaAtiva}-${filtroAno}-${filtroTrimestre}`,
              turmaId: filtroTurmaId !== 'TODAS' ? filtroTurmaId : undefined,
              anoLectivo: filtroAno
            })}
            size={54}
            label="Validar Relatório"
          />
        </div>
      </div>
    </div>
  );
};
