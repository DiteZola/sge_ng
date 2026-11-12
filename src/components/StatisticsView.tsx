import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Award, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Download, 
  Printer, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Target, 
  BarChart2, 
  ArrowUpRight, 
  Building2,
  ShieldCheck,
  UserCheck,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Escola, 
  Turma, 
  Aluno, 
  Disciplina, 
  NotaTrimestralConsolidada, 
  AnoLectivoConfig,
  Funcionario,
  AtribuicaoDocente
} from '../types';
import { dbService } from '../services/storage';
import { 
  filtrarDisciplinasDaClasse, 
  normalizarClasse, 
  formatarCicloPorClasse,
  ordenarDisciplinas 
} from '../services/academicHierarchyService';
import { obterInformacaoEscala } from '../services/macEngine';

interface StatisticsViewProps {
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

export const StatisticsView: React.FC<StatisticsViewProps> = ({
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
  const notas = useMemo(() => propNotas || dbService.getNotasConsolidadas(), [propNotas]);
  const funcionarios = useMemo(() => propFuncionarios || dbService.getFuncionarios(), [propFuncionarios]);
  const anosConfigs = useMemo(() => anoLectivoConfigs.length > 0 ? anoLectivoConfigs : dbService.getAnosLectivosConfigs(), [anoLectivoConfigs]);
  const atribuicoesTodas = useMemo(() => propAtribuicoes || dbService.getAtribuicoes(), [propAtribuicoes]);

  // Identificação do Perfil
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

  // Filtros Centrais
  const [filtroAno, setFiltroAno] = useState<string>(escola.anoLectivoActivo || '2024/2025');
  const [filtroTrimestre, setFiltroTrimestre] = useState<string>(String(escola.trimestreActivo || '1'));
  const [filtroCiclo, setFiltroCiclo] = useState<string>('TODOS');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');
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

  // Atribuições do Docente Alvo
  const atribuicoesDoDocenteAlvo = useMemo(() => {
    if (!docenteAlvo) return [];
    return atribuicoesTodas.filter(a => a.professorId === docenteAlvo.id);
  }, [docenteAlvo, atribuicoesTodas]);

  const turmasDocenteIds = useMemo(() => {
    if (!docenteAlvo) return new Set<string>();
    const ids = new Set<string>(atribuicoesDoDocenteAlvo.map(a => a.turmaId));
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

  // Turmas permitidas conforme o perfil ou filtro
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

  // Disciplinas permitidas
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

  // Cursos e Classes disponíveis
  const cursosDisponiveis = useMemo(() => {
    const setCursos = new Set<string>();
    turmasPermitidas.forEach(t => {
      if (t.curso && t.curso.trim()) setCursos.add(t.curso.trim());
    });
    return Array.from(setCursos).sort();
  }, [turmasPermitidas]);

  const classesDisponiveis = useMemo(() => {
    const setClasses = new Set<string>();
    turmasPermitidas.forEach(t => {
      if (t.classe) setClasses.add(t.classe);
    });
    return Array.from(setClasses).sort();
  }, [turmasPermitidas]);

  // Turmas filtradas
  const turmasFiltradas = useMemo(() => {
    return turmasPermitidas.filter(t => {
      if (filtroTurno !== 'TODOS' && t.turno && !t.turno.toLowerCase().includes(filtroTurno.toLowerCase())) return false;
      if (filtroCiclo !== 'TODOS') {
        const cicloTurma = formatarCicloPorClasse(t.classe);
        if (!cicloTurma.toLowerCase().includes(filtroCiclo.toLowerCase())) return false;
      }
      if (filtroCurso !== 'TODOS' && t.curso !== filtroCurso) return false;
      if (filtroClasse !== 'TODAS' && normalizarClasse(t.classe) !== normalizarClasse(filtroClasse)) return false;
      if (filtroTurmaId !== 'TODAS' && t.id !== filtroTurmaId) return false;
      return true;
    });
  }, [turmasPermitidas, filtroTurno, filtroCiclo, filtroCurso, filtroClasse, filtroTurmaId]);

  // Alunos das turmas filtradas
  const alunosFiltrados = useMemo(() => {
    const idsTurmas = new Set(turmasFiltradas.map(t => t.id));
    return alunos.filter(a => idsTurmas.has(a.turmaId));
  }, [alunos, turmasFiltradas]);

  // Notas aplicáveis aos filtros
  const notasFiltradas = useMemo(() => {
    const idsAlunos = new Set(alunosFiltrados.map(a => a.id));
    return notas.filter(n => {
      if (!idsAlunos.has(n.alunoId)) return false;
      if (n.anoLectivo && n.anoLectivo !== filtroAno) return false;
      if (filtroTrimestre !== 'anual' && n.trimestre && String(n.trimestre) !== filtroTrimestre) return false;
      if (filtroDisciplinaId !== 'TODAS' && n.disciplinaId !== filtroDisciplinaId) return false;
      if (docenteAlvo && disciplinasDocenteIds.size > 0) {
        return disciplinasDocenteIds.has(n.disciplinaId);
      }
      return true;
    });
  }, [notas, alunosFiltrados, filtroAno, filtroTrimestre, filtroDisciplinaId, docenteAlvo, disciplinasDocenteIds]);

  // Indicadores Centrais (KPIs)
  const metricasGlobais = useMemo(() => {
    const totalMatriculados = alunosFiltrados.length;
    const matriculadosM = alunosFiltrados.filter(a => a.genero === 'M').length;
    const matriculadosF = alunosFiltrados.filter(a => a.genero === 'F').length;

    const desistentes = alunosFiltrados.filter(a => a.estado === 'Desistente' || a.estado === 'Transferido').length;
    const taxaAbandono = totalMatriculados > 0 ? ((desistentes / totalMatriculados) * 100).toFixed(1) : '0.0';

    // Alunos avaliados e suas médias
    const mediasAlunos: { alunoId: string; media: number; aprovado: boolean }[] = [];
    let somaMediasGerais = 0;

    alunosFiltrados.forEach(aluno => {
      if (aluno.estado === 'Desistente') return;
      const turma = turmas.find(t => t.id === aluno.turmaId);
      const escala = obterInformacaoEscala(turma?.classe || aluno.classeId);
      const notasAluno = notasFiltradas.filter(n => n.alunoId === aluno.id);

      if (notasAluno.length > 0) {
        const soma = notasAluno.reduce((acc, n) => {
          const val = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
          return acc + val;
        }, 0);
        const media = soma / notasAluno.length;
        mediasAlunos.push({
          alunoId: aluno.id,
          media,
          aprovado: media >= escala.notaAprovacao
        });
        somaMediasGerais += media;
      }
    });

    const totalAvaliados = mediasAlunos.length;
    const totalAprovados = mediasAlunos.filter(m => m.aprovado).length;
    const totalReprovados = totalAvaliados - totalAprovados;
    const taxaAprovacao = totalAvaliados > 0 ? ((totalAprovados / totalAvaliados) * 100).toFixed(1) : '0.0';
    const mediaGeralEscola = totalAvaliados > 0 ? (somaMediasGerais / totalAvaliados).toFixed(1) : '—';

    // Distribuição de notas em 4 níveis ministeriais:
    let excelente = 0;
    let bom = 0;
    let suficiente = 0;
    let insuficiente = 0;

    mediasAlunos.forEach(m => {
      if (m.media >= 17.5) excelente++;
      else if (m.media >= 13.5) bom++;
      else if (m.media >= 9.5) suficiente++;
      else insuficiente++;
    });

    return {
      totalMatriculados,
      matriculadosM,
      matriculadosF,
      desistentes,
      taxaAbandono,
      totalAvaliados,
      totalAprovados,
      totalReprovados,
      taxaAprovacao,
      mediaGeralEscola,
      distribuicaoNiveis: {
        excelente: { count: excelente, pct: totalAvaliados > 0 ? ((excelente / totalAvaliados) * 100).toFixed(1) : '0' },
        bom: { count: bom, pct: totalAvaliados > 0 ? ((bom / totalAvaliados) * 100).toFixed(1) : '0' },
        suficiente: { count: suficiente, pct: totalAvaliados > 0 ? ((suficiente / totalAvaliados) * 100).toFixed(1) : '0' },
        insuficiente: { count: insuficiente, pct: totalAvaliados > 0 ? ((insuficiente / totalAvaliados) * 100).toFixed(1) : '0' }
      }
    };
  }, [alunosFiltrados, turmas, notasFiltradas]);

  // Rendimento Comparativo por Classe
  const rendimentoPorClasse = useMemo(() => {
    const mapaClasses: Record<string, { classe: string; matriculados: number; avaliados: number; aprovados: number; somaMedias: number }> = {};

    turmasFiltradas.forEach(t => {
      const cls = t.classe || 'Outra';
      if (!mapaClasses[cls]) {
        mapaClasses[cls] = { classe: cls, matriculados: 0, avaliados: 0, aprovados: 0, somaMedias: 0 };
      }
      const alunosTurma = alunos.filter(a => a.turmaId === t.id);
      mapaClasses[cls].matriculados += alunosTurma.length;

      const escala = obterInformacaoEscala(cls);

      alunosTurma.forEach(a => {
        if (a.estado === 'Desistente') return;
        const notasAluno = notasFiltradas.filter(n => n.alunoId === a.id);
        if (notasAluno.length > 0) {
          const soma = notasAluno.reduce((acc, n) => acc + (n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0), 0);
          const media = soma / notasAluno.length;
          mapaClasses[cls].avaliados++;
          mapaClasses[cls].somaMedias += media;
          if (media >= escala.notaAprovacao) {
            mapaClasses[cls].aprovados++;
          }
        }
      });
    });

    return Object.values(mapaClasses).map(c => {
      const taxa = c.avaliados > 0 ? ((c.aprovados / c.avaliados) * 100).toFixed(1) : '0.0';
      const media = c.avaliados > 0 ? (c.somaMedias / c.avaliados).toFixed(1) : '—';
      return {
        ...c,
        taxaAprovacao: parseFloat(taxa),
        mediaGeral: media
      };
    }).sort((a, b) => a.classe.localeCompare(b.classe, 'pt-AO', { numeric: true }));
  }, [turmasFiltradas, alunos, notasFiltradas]);

  // Ranking de Turmas
  const rankingTurmas = useMemo(() => {
    const lista = turmasFiltradas.map(t => {
      const alunosTurma = alunos.filter(a => a.turmaId === t.id && a.estado !== 'Desistente');
      const escala = obterInformacaoEscala(t.classe);
      let aprovados = 0;
      let avaliados = 0;
      let soma = 0;

      alunosTurma.forEach(a => {
        const notasAluno = notasFiltradas.filter(n => n.alunoId === a.id);
        if (notasAluno.length > 0) {
          const mediaAluno = notasAluno.reduce((acc, n) => acc + (n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0), 0) / notasAluno.length;
          avaliados++;
          soma += mediaAluno;
          if (mediaAluno >= escala.notaAprovacao) aprovados++;
        }
      });

      const taxa = avaliados > 0 ? (aprovados / avaliados) * 100 : 0;
      const media = avaliados > 0 ? soma / avaliados : 0;

      return {
        turma: t,
        avaliados,
        aprovados,
        taxaAprovacao: parseFloat(taxa.toFixed(1)),
        mediaTurma: parseFloat(media.toFixed(1))
      };
    }).filter(t => t.avaliados > 0);

    const ordenadasPorTaxa = [...lista].sort((a, b) => b.taxaAprovacao - a.taxaAprovacao || b.mediaTurma - a.mediaTurma);
    const topTurmas = ordenadasPorTaxa.slice(0, 5);
    const atencaoTurmas = [...ordenadasPorTaxa].reverse().slice(0, 5);

    return { topTurmas, atencaoTurmas };
  }, [turmasFiltradas, alunos, notasFiltradas]);

  // Aproveitamento por Disciplina na Ordem Oficial Cadastrada
  const aproveitamentoDisciplinas = useMemo(() => {
    const discsOrdenadas = ordenarDisciplinas(disciplinasPermitidas);

    return discsOrdenadas.map(disc => {
      let avaliados = 0;
      let positivas = 0;
      let soma = 0;

      notasFiltradas.forEach(n => {
        if (n.disciplinaId === disc.id) {
          const val = n.mediaTrimestral ?? n.notaFinal ?? n.mac ?? 0;
          avaliados++;
          soma += val;
          if (val >= 10) positivas++;
        }
      });

      const taxa = avaliados > 0 ? ((positivas / avaliados) * 100).toFixed(1) : '0.0';
      const media = avaliados > 0 ? (soma / avaliados).toFixed(1) : '—';

      return {
        disciplina: disc,
        avaliados,
        positivas,
        taxa: parseFloat(taxa),
        media
      };
    }).filter(d => d.avaliados > 0);
  }, [disciplinasPermitidas, notasFiltradas]);

  // Ações
  const handleImprimir = () => {
    window.print();
  };

  const handleExportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Indicadores Centrais
      const dadosKpi = [
        { Indicador: 'Escola', Valor: escola.nomeOficial || escola.nome },
        { Indicador: 'Perfil Analisado', Valor: isProfessor ? `Docente (${currentUser?.nomeCompleto})` : 'Institucional / Geral' },
        { Indicador: 'Total de Estudantes Registados', Valor: metricasGlobais.totalMatriculados },
        { Indicador: 'Estudantes do Género Masculino (M)', Valor: metricasGlobais.matriculadosM },
        { Indicador: 'Estudantes do Género Feminino (F)', Valor: metricasGlobais.matriculadosF },
        { Indicador: 'Alunos Avaliados no Período', Valor: metricasGlobais.totalAvaliados },
        { Indicador: 'Alunos Aprovados (Positivos)', Valor: metricasGlobais.totalAprovados },
        { Indicador: 'Alunos Reprovados (Negativos)', Valor: metricasGlobais.totalReprovados },
        { Indicador: 'Taxa de Aprovação Global (%)', Valor: `${metricasGlobais.taxaAprovacao}%` },
        { Indicador: 'Média Geral', Valor: metricasGlobais.mediaGeralEscola },
        { Indicador: 'Taxa de Retenção e Abandono (%)', Valor: `${metricasGlobais.taxaAbandono}%` }
      ];
      const wsKpi = XLSX.utils.json_to_sheet(dadosKpi);
      XLSX.utils.book_append_sheet(wb, wsKpi, 'Indicadores_Gerais');

      // Rendimento por Classe
      const dadosClasses = rendimentoPorClasse.map(c => ({
        'Classe': c.classe,
        'Matriculados': c.matriculados,
        'Avaliados': c.avaliados,
        'Aprovados': c.aprovados,
        'Taxa de Sucesso (%)': `${c.taxaAprovacao}%`,
        'Média Geral': c.mediaGeral
      }));
      const wsClasses = XLSX.utils.json_to_sheet(dadosClasses);
      XLSX.utils.book_append_sheet(wb, wsClasses, 'Rendimento_Por_Classe');

      // Rendimento por Disciplina
      const dadosDisciplinas = aproveitamentoDisciplinas.map(d => ({
        'Ordem': d.disciplina.ordem ?? '—',
        'Disciplina': d.disciplina.nome,
        'Código': d.disciplina.codigo || '—',
        'Total Avaliados': d.avaliados,
        'Notas Positivas': d.positivas,
        'Taxa de Aproveitamento (%)': `${d.taxa}%`,
        'Média da Disciplina': d.media
      }));
      const wsDisciplinas = XLSX.utils.json_to_sheet(dadosDisciplinas);
      XLSX.utils.book_append_sheet(wb, wsDisciplinas, 'Rendimento_Por_Disciplina');

      const prefixo = docenteAlvo 
        ? `ESTATISTICAS_DOCENTE_${docenteAlvo.nomeCompleto.replace(/\s+/g, '_').toUpperCase()}` 
        : `ESTATISTICAS_ESCOLA_${escola.sigla || 'MED'}`;
      const fileName = `${prefixo}_${filtroAno.replace('/', '-')}_T${filtroTrimestre}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error('Erro na exportação de estatísticas:', e);
      alert('Erro ao exportar estatísticas para Excel.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* SELETOR DE ESCOLA PARA ADMIN GERAL */}
      {isAdminGeral && escolas.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                  Rede Nacional • Alternar Escola para Análise Estatística
                </span>
                <p className="text-xs text-purple-700">
                  Visualização de métricas e KPIs da instituição selecionada:
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

      {/* BANNER CONTEXTUAL POR PAPEL DO USUÁRIO */}
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
                    {isProfessor ? 'Estatísticas do Docente:' : 'Estatísticas de Coordenação:'} {currentUser?.nomeCompleto}
                  </h3>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                    {currentUser?.cargo || currentUser?.categoriaProfissional || 'Docente'}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Instituição: <strong>{escola.nomeOficial || escola.nome}</strong> • {modoVisao === 'minhas_atribuicoes' ? (
                    <span>Indicadores calculados com base nas suas <strong>{turmasPermitidas.length} turmas</strong> e <strong>{disciplinasPermitidas.length} disciplinas</strong>.</span>
                  ) : (
                    <span>Modo de visualização ampliado: Análise estatística de <strong>toda a escola ({turmas.length} turmas)</strong>.</span>
                  )}
                </p>
              </div>
            </div>

            {/* SELETOR DE ESCOPO PARA PROFESSOR / COORDENADOR */}
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
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-indigo-950 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-indigo-950">
                    Estatísticas Gerais: {escola.nomeOficial || escola.nome}
                  </h3>
                  <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-black text-[10px] uppercase">
                    Direcção da Escola
                  </span>
                </div>
                <p className="text-xs text-indigo-700 mt-0.5">
                  {docenteAlvo ? (
                    <span>A visualizar estatísticas detalhadas do(a) docente <strong>{docenteAlvo.nomeCompleto}</strong> ({turmasPermitidas.length} turmas • {disciplinasPermitidas.length} disciplinas).</span>
                  ) : (
                    <span>Painel de Rendimento e Desempenho Global da Instituição ({turmas.length} turmas • {alunos.length} estudantes).</span>
                  )}
                </p>
              </div>
            </div>

            {/* SELETOR DE PROFESSOR PARA A DIREÇÃO */}
            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-indigo-200 shadow-xs">
              <Users className="w-4 h-4 text-indigo-600" />
              <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Auditar Docente:</label>
              <select
                value={filtroDocenteId}
                onChange={e => {
                  setFiltroDocenteId(e.target.value);
                  setFiltroTurmaId('TODAS');
                  setFiltroDisciplinaId('TODAS');
                }}
                className="bg-indigo-50/50 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 max-w-xs"
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
                  title="Voltar às Estatísticas Gerais da Escola"
                >
                  ✕ Geral
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CABEÇALHO DO MÓDULO E FILTROS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  {docenteAlvo ? `Estatísticas: ${docenteAlvo.nomeCompleto}` : 'Estatísticas & Rendimento Escolar'}
                </h1>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {escola.sigla || 'MED'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {docenteAlvo
                  ? 'Diagnóstico analítico do rendimento dos estudantes nas turmas e disciplinas sob a sua lecionação.'
                  : 'Painel executivo com métricas de transição, distribuição de notas, aproveitamento por disciplina e ranking de turmas.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportarExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Dados (.xlsx)</span>
            </button>
            <button
              onClick={handleImprimir}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Painel</span>
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS INTERATIVOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ano Letivo</span>
            </label>
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
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

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Trimestre</span>
            </label>
            <select
              value={filtroTrimestre}
              onChange={e => setFiltroTrimestre(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1">Iº Trimestre</option>
              <option value="2">IIº Trimestre</option>
              <option value="3">IIIº Trimestre</option>
              <option value="anual">Consolidado Anual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ciclo</span>
            </label>
            <select
              value={filtroCiclo}
              onChange={e => setFiltroCiclo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Ciclos</option>
              <option value="Primário">Ensino Primário</option>
              <option value="Iº Ciclo">Iº Ciclo Secundário</option>
              <option value="IIº Ciclo">IIº Ciclo / Médio Técnico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Turno</span>
            </label>
            <select
              value={filtroTurno}
              onChange={e => setFiltroTurno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Turnos</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite / Pós-laboral</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Curso</span>
            </label>
            <select
              value={filtroCurso}
              onChange={e => setFiltroCurso(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Cursos ({cursosDisponiveis.length})</option>
              {cursosDisponiveis.map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Classe</span>
            </label>
            <select
              value={filtroClasse}
              onChange={e => {
                setFiltroClasse(e.target.value);
                setFiltroTurmaId('TODAS');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">Todas as Classes ({classesDisponiveis.length})</option>
              {classesDisponiveis.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Turma</span>
            </label>
            <select
              value={filtroTurmaId}
              onChange={e => setFiltroTurmaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">
                {docenteAlvo ? `Turmas do Docente (${turmasFiltradas.length})` : `Todas as Turmas (${turmasFiltradas.length})`}
              </option>
              {turmasFiltradas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.classe})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Disciplina</span>
            </label>
            <select
              value={filtroDisciplinaId}
              onChange={e => setFiltroDisciplinaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">Todas as Disciplinas ({disciplinasPermitidas.length})</option>
              {disciplinasPermitidas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PAINEL DE INDICADORES PRINCIPAIS (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Taxa de Transição */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {docenteAlvo ? 'Aproveitamento das Turmas do Docente' : 'Taxa de Aproveitamento Geral'}
            </span>
            <div className={`p-2 rounded-xl ${parseFloat(metricasGlobais.taxaAprovacao) >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-800">{metricasGlobais.taxaAprovacao}%</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Positivo</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metricasGlobais.totalAprovados} de {metricasGlobais.totalAvaliados} avaliados
          </p>
        </div>

        {/* KPI 2: Média */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {docenteAlvo ? 'Média das Disciplinas do Docente' : 'Média Geral Institucional'}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-blue-900">{metricasGlobais.mediaGeralEscola}</span>
            <span className="text-xs font-bold text-slate-500">Valores (0-20)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {Number(metricasGlobais.mediaGeralEscola) >= 14 ? 'Excelente Desempenho' : Number(metricasGlobais.mediaGeralEscola) >= 10 ? 'Rendimento Estável' : 'Requer Reforço'}
          </p>
        </div>

        {/* KPI 3: Cobertura de Avaliação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              {docenteAlvo ? 'Alunos Sob Sua Docência' : 'Estudantes Matriculados'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-800">{metricasGlobais.totalMatriculados}</span>
            <span className="text-xs font-bold text-indigo-600">
              {metricasGlobais.totalAvaliados} com notas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            M: {metricasGlobais.matriculadosM} • F: {metricasGlobais.matriculadosF}
          </p>
        </div>

        {/* KPI 4: Retenção e Abandono */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Taxa de Abandono</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-900">{metricasGlobais.taxaAbandono}%</span>
            <span className="text-xs font-bold text-slate-500">{metricasGlobais.desistentes} desistentes</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {docenteAlvo ? 'Desistências nas turmas do docente' : 'Estudantes em evasão escolar'}
          </p>
        </div>
      </div>

      {/* DISTRIBUIÇÃO QUALITATIVA DE NOTAS (MED ANGOLA) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-indigo-600" />
          <span>
            {docenteAlvo 
              ? `Distribuição Qualitativa nas Disciplinas do Docente (${docenteAlvo.nomeCompleto})` 
              : 'Distribuição de Rendimento por Escala Qualitativa Oficial'}
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Enquadramento normativo do Ministério da Educação da República de Angola para avaliação das aprendizagens.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          {/* Excelente */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-800">Excelente (18 a 20)</span>
              <span className="text-xs font-bold text-emerald-600">{metricasGlobais.distribuicaoNiveis.excelente.pct}%</span>
            </div>
            <p className="text-2xl font-black text-emerald-900">{metricasGlobais.distribuicaoNiveis.excelente.count}</p>
            <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.excelente.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold block">Quadro de Honra / Destaque</span>
          </div>

          {/* Bom */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-800">Bom (14 a 17)</span>
              <span className="text-xs font-bold text-blue-600">{metricasGlobais.distribuicaoNiveis.bom.pct}%</span>
            </div>
            <p className="text-2xl font-black text-blue-900">{metricasGlobais.distribuicaoNiveis.bom.count}</p>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.bom.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-blue-700 font-semibold block">Aproveitamento Satisfatório Forte</span>
          </div>

          {/* Suficiente */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-800">Suficiente (10 a 13)</span>
              <span className="text-xs font-bold text-amber-600">{metricasGlobais.distribuicaoNiveis.suficiente.pct}%</span>
            </div>
            <p className="text-2xl font-black text-amber-900">{metricasGlobais.distribuicaoNiveis.suficiente.count}</p>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.suficiente.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-amber-700 font-semibold block">Transição / Limiar de Aprovação</span>
          </div>

          {/* Insuficiente */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-800">Insuficiente (0 a 9)</span>
              <span className="text-xs font-bold text-rose-600">{metricasGlobais.distribuicaoNiveis.insuficiente.pct}%</span>
            </div>
            <p className="text-2xl font-black text-rose-900">{metricasGlobais.distribuicaoNiveis.insuficiente.count}</p>
            <div className="w-full bg-rose-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-rose-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metricasGlobais.distribuicaoNiveis.insuficiente.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-rose-700 font-semibold block">Não Transita / Recuperação</span>
          </div>
        </div>
      </div>

      {/* RENDIMENTO COMPARATIVO POR CLASSE E RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimento por Classe */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>
              {docenteAlvo 
                ? 'Aproveitamento nas Classes sob Docência' 
                : 'Aproveitamento Comparativo por Classe'}
            </span>
          </h2>
          
          <div className="space-y-3 pt-2">
            {rendimentoPorClasse.length > 0 ? (
              rendimentoPorClasse.map(c => (
                <div key={c.classe} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">{c.classe}</span>
                    <span className="text-slate-600">
                      {c.taxaAprovacao}% de sucesso • Média: {c.mediaGeral} ({c.avaliados} alunos)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        c.taxaAprovacao >= 75 ? 'bg-emerald-600' :
                        c.taxaAprovacao >= 50 ? 'bg-blue-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, c.taxaAprovacao))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Sem dados para as classes selecionadas.</p>
            )}
          </div>
        </div>

        {/* RANKING DE TURMAS: DESTAQUE VS ATENÇÃO */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span>
              {docenteAlvo 
                ? 'Desempenho Comparativo Entre as Turmas do Docente' 
                : 'Ranking de Turmas & Diagnóstico Pedagógico'}
            </span>
          </h2>

          <div className="space-y-4 pt-1">
            <div>
              <span className="text-xs font-black uppercase text-emerald-800 flex items-center space-x-1 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Turmas de Maior Rendimento</span>
              </span>
              <div className="space-y-1.5">
                {rankingTurmas.topTurmas.map((item, idx) => (
                  <div key={item.turma.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{item.turma.nome}</span>
                      <span className="text-slate-500 text-[10px]">({item.turma.classe})</span>
                    </div>
                    <span className="font-mono font-black text-emerald-800">
                      {item.taxaAprovacao}% • Média: {item.mediaTurma}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-black uppercase text-rose-800 flex items-center space-x-1 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Turmas com Necessidade de Reforço Pedagógico</span>
              </span>
              <div className="space-y-1.5">
                {rankingTurmas.atencaoTurmas.map((item, idx) => (
                  <div key={item.turma.id} className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-xs font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{item.turma.nome}</span>
                      <span className="text-slate-500 text-[10px]">({item.turma.classe})</span>
                    </div>
                    <span className="font-mono font-black text-rose-800">
                      {item.taxaAprovacao}% • Média: {item.mediaTurma}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* APROVEITAMENTO POR DISCIPLINA (ORDEM CADASTRADA) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>
                {docenteAlvo 
                  ? 'Aproveitamento das Disciplinas sob Lecionação' 
                  : 'Aproveitamento Curricular por Disciplina'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Disciplinas dispostas na sequência estrita definida na grelha curricular do sistema.
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            {aproveitamentoDisciplinas.length} Disciplinas
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 font-bold text-slate-700 text-center text-[11px]">
              <tr>
                <th className="p-3 border-r border-slate-200 w-12">ORD.</th>
                <th className="p-3 border-r border-slate-200 text-left">DISCIPLINA</th>
                <th className="p-3 border-r border-slate-200 w-24">CÓDIGO</th>
                <th className="p-3 border-r border-slate-200 w-28">AVALIADOS</th>
                <th className="p-3 border-r border-slate-200 w-28 text-emerald-700">POSITIVAS (≥10)</th>
                <th className="p-3 border-r border-slate-200 w-32">% SUCESSO</th>
                <th className="p-3 border-r border-slate-200 w-24">MÉDIA</th>
                <th className="p-3 w-40 text-left">DIAGNÓSTICO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-center">
              {aproveitamentoDisciplinas.length > 0 ? (
                aproveitamentoDisciplinas.map((item, idx) => (
                  <tr key={item.disciplina.id} className="hover:bg-slate-50">
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-600">
                      {item.disciplina.ordem ?? idx + 1}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-left font-sans font-bold uppercase text-slate-800">
                      {item.disciplina.nome}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-500 font-sans">
                      {item.disciplina.codigo || '—'}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-700">
                      {item.avaliados}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-emerald-700">
                      {item.positivas}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-black text-indigo-900">
                      {item.taxa}%
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-black bg-slate-50">
                      {item.media}
                    </td>
                    <td className="p-2.5 text-left font-sans text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.taxa >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        item.taxa >= 60 ? 'bg-blue-100 text-blue-800' :
                        item.taxa >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.taxa >= 80 ? 'Alto Aproveitamento' :
                         item.taxa >= 60 ? 'Rendimento Estável' :
                         item.taxa >= 50 ? 'Atenção / Regular' : 'Apoio Prioritário'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center font-sans text-slate-500 italic">
                    Nenhuma nota registada para o conjunto de filtros atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
