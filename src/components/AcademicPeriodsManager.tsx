import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Lock,
  Unlock,
  Scale,
  Sparkles,
  Save,
  RotateCcw,
  BookOpen,
  Layers,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import {
  Escola,
  Turma,
  Disciplina,
  Aluno,
  NotaTrimestralConsolidada,
  ComissaoJuri,
  PeriodoLetivoConfig,
  RegimePeriodosLetivos
} from '../types';
import { dbService } from '../services/storage';
import {
  calcularMediaGeralDaClasse,
  calcularMediasSegmentadasAnoLetivo
} from '../services/macEngine';
import { normalizarClasse, TODAS_CLASSES_OFICIAIS_MED } from '../services/academicHierarchyService';
import { ordenarClassesMED } from '../utils/enrollmentProgression';

interface AcademicPeriodsManagerProps {
  escola: Escola;
  turmas: Turma[];
  disciplinas: Disciplina[];
  juris?: ComissaoJuri[];
  onSalvarEscola?: (escola: Escola) => void;
  onAnoLectivoAlterado?: (ano: string) => void;
}

export const AcademicPeriodsManager: React.FC<AcademicPeriodsManagerProps> = ({
  escola,
  turmas,
  disciplinas,
  juris = [],
  onSalvarEscola,
}) => {
  const anosDisponiveis = useMemo(() => {
    const lista = dbService.getAnosLectivos(escola.id);
    if (escola.anoLectivoActivo && !lista.includes(escola.anoLectivoActivo)) {
      return [escola.anoLectivoActivo, ...lista];
    }
    return lista;
  }, [escola.id, escola.anoLectivoActivo]);

  const [anoSelecionado, setAnoSelecionado] = useState<string>(
    escola.anoLectivoActivo || anosDisponiveis[0] || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
  );

  useEffect(() => {
    if (escola.anoLectivoActivo) {
      setAnoSelecionado(escola.anoLectivoActivo);
    }
  }, [escola.id, escola.anoLectivoActivo]);

  const carregarConfigDoAno = (ano: string) => {
    const regimeAtual = dbService.getRegimePeriodosAtivo(escola.id, ano);
    const periodosAtual = dbService.getPeriodosLetivos(escola.id, ano);
    const cfgs = dbService.getAnosLectivosConfigs(escola.id);
    const cfgAno = cfgs.find((c) => (c.rotulo || c.ano || '').trim() === ano.trim());
    return {
      regimeAtual,
      periodosAtual,
      segmentadoAtual: cfgAno?.calculoSegmentadoAtivo !== false
    };
  };

  const [regime, setRegime] = useState<RegimePeriodosLetivos>(() => carregarConfigDoAno(anoSelecionado).regimeAtual);
  const [periodos, setPeriodos] = useState<PeriodoLetivoConfig[]>(() => carregarConfigDoAno(anoSelecionado).periodosAtual);
  const [calculoSegmentado, setCalculoSegmentado] = useState<boolean>(() => carregarConfigDoAno(anoSelecionado).segmentadoAtual);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const loaded = carregarConfigDoAno(anoSelecionado);
    setRegime(loaded.regimeAtual);
    setPeriodos(loaded.periodosAtual);
    setCalculoSegmentado(loaded.segmentadoAtual);
  }, [escola.id, anoSelecionado, refreshTick]);

  const handleAlterarRegime = (novoRegime: RegimePeriodosLetivos) => {
    setRegime(novoRegime);
    const cfgs = dbService.getAnosLectivosConfigs(escola.id);
    const cfgAno = cfgs.find((c) => (c.rotulo || c.ano || '').trim() === anoSelecionado.trim());
    const basePadrao = dbService.gerarPeriodosLetivosPadrao(
      novoRegime,
      anoSelecionado,
      cfgAno?.dataInicio,
      cfgAno?.dataFim
    );
    setPeriodos(basePadrao);
  };

  const handleEquilibrarPesos = () => {
    const qtd = periodos.length || (regime === 'Semestral' ? 2 : 3);
    if (qtd === 2) {
      setPeriodos((prev) => prev.map((p) => ({ ...p, pesoPercentual: 50 })));
    } else {
      setPeriodos((prev) =>
        prev.map((p, idx) => ({ ...p, pesoPercentual: idx === 2 ? 33.4 : 33.3 }))
      );
    }
  };

  const handleRestaurarDatasPadrao = () => {
    const cfgs = dbService.getAnosLectivosConfigs(escola.id);
    const cfgAno = cfgs.find((c) => (c.rotulo || c.ano || '').trim() === anoSelecionado.trim());
    setPeriodos(dbService.gerarPeriodosLetivosPadrao(regime, anoSelecionado, cfgAno?.dataInicio, cfgAno?.dataFim));
  };

  const handleAtualizarCampoPeriodo = (
    idx: number,
    campo: keyof PeriodoLetivoConfig,
    valor: string | number | boolean
  ) => {
    setPeriodos((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p))
    );
  };

  const somaPesos = useMemo(
    () => Number(periodos.reduce((acc, p) => acc + (Number(p.pesoPercentual) || 0), 0).toFixed(1)),
    [periodos]
  );

  const handleGuardar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    for (const p of periodos) {
      if (!p.nome.trim()) {
        setFeedback({ tipo: 'erro', texto: 'Todos os períodos devem possuir um nome válido.' });
        return;
      }
      if (p.dataInicio && p.dataFim && p.dataInicio > p.dataFim) {
        setFeedback({ tipo: 'erro', texto: `Em "${p.nome}", a data de início não pode ser posterior à data de término.` });
        return;
      }
    }

    dbService.salvarPeriodosLetivos(
      escola.id,
      anoSelecionado,
      regime,
      periodos,
      calculoSegmentado
    );

    const escolaAtualizada = dbService.getEscolaPorId(escola.id) || dbService.getEscolaAtiva();
    if (onSalvarEscola && escolaAtualizada) {
      onSalvarEscola(escolaAtualizada);
    }
    setRefreshTick((t) => t + 1);
    setFeedback({
      tipo: 'sucesso',
      texto: `Períodos letivos (${regime}) do ano ${anoSelecionado} guardados e aplicados no cálculo segmentado das médias!`
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleAtivarPeriodo = (numero: 1 | 2 | 3) => {
    // Garante que o regime e os períodos atuais estejam salvos antes de ativar
    dbService.salvarPeriodosLetivos(escola.id, anoSelecionado, regime, periodos, calculoSegmentado);
    dbService.definirPeriodoLetivoAtivo(escola.id, numero);
    const escolaAtualizada = dbService.getEscolaPorId(escola.id) || dbService.getEscolaAtiva();
    if (onSalvarEscola && escolaAtualizada) {
      onSalvarEscola(escolaAtualizada);
    }
    setRefreshTick((t) => t + 1);
    setFeedback({
      tipo: 'sucesso',
      texto: `${numero}º ${regime === 'Semestral' ? 'Semestre' : 'Trimestre'} definido como período letivo ativo!`
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Dados reais do ano selecionado para demonstrar cálculos segmentados imediatos
  const alunosDoAno = useMemo<Aluno[]>(() => {
    return dbService.getAlunos(escola.id).filter((a) => {
      const anoAl = (a.anoLectivo || a.anoMatricula || '').trim();
      return !anoSelecionado || !anoAl || anoAl === anoSelecionado;
    });
  }, [escola.id, anoSelecionado, refreshTick]);

  const turmasDoAno = useMemo<Turma[]>(() => {
    return (turmas.length > 0 ? turmas : dbService.getTurmas()).filter((t) => {
      if (t.escolaId && t.escolaId !== escola.id) return false;
      const anoT = (t.anoLectivo || '').trim();
      return !anoSelecionado || !anoT || anoT === anoSelecionado;
    });
  }, [turmas, escola.id, anoSelecionado]);

  const disciplinasDoAno = useMemo<Disciplina[]>(() => {
    const base = disciplinas.length > 0 ? disciplinas : dbService.getDisciplinas(escola.id, anoSelecionado);
    return base.filter((d) => (!d.escolaId || d.escolaId === escola.id) && (!d.anoLectivo || !anoSelecionado || d.anoLectivo === anoSelecionado));
  }, [disciplinas, escola.id, anoSelecionado]);

  const notasDoAno = useMemo<NotaTrimestralConsolidada[]>(() => {
    const idsAl = new Set(alunosDoAno.map((a) => a.id));
    return dbService.getNotasConsolidadas().filter((n) => {
      if (n.escolaId && n.escolaId !== escola.id) return false;
      if (anoSelecionado && n.anoLectivo && n.anoLectivo !== anoSelecionado) return false;
      return idsAl.has(n.alunoId) || !n.alunoId;
    });
  }, [escola.id, anoSelecionado, alunosDoAno, refreshTick]);

  const regrasMAC = useMemo(() => dbService.obterRegrasMAC(), []);
  const nppAtivo = escola.nppAtivo !== false;

  const resultadoSegmentadoGeral = useMemo(() => {
    return calcularMediasSegmentadasAnoLetivo({
      regime,
      periodosConfig: periodos,
      alunos: alunosDoAno,
      turmas: turmasDoAno,
      disciplinas: disciplinasDoAno,
      notasConsolidadas: notasDoAno,
      regrasMAC,
      juris,
      anoLectivo: anoSelecionado,
      nppAtivo,
      escolaId: escola.id
    });
  }, [regime, periodos, alunosDoAno, turmasDoAno, disciplinasDoAno, notasDoAno, regrasMAC, juris, anoSelecionado, nppAtivo, escola.id]);

  // Cálculo segmentado e Média Geral por Classe (considerando todas as disciplinas obrigatórias de cada classe)
  const resumoPorClasseSegmentado = useMemo(() => {
    const classesSet = new Set<string>();
    turmasDoAno.forEach((t) => {
      const norm = normalizarClasse(t.classe);
      if (norm) classesSet.add(norm);
    });
    alunosDoAno.forEach((a) => {
      const norm = normalizarClasse(a.classeId);
      if (norm) classesSet.add(norm);
    });
    const listaOrdenada = ordenarClassesMED(Array.from(classesSet).filter((c) => TODAS_CLASSES_OFICIAIS_MED.includes(c) || c));

    const periodosNums: Array<1 | 2 | 3> = regime === 'Semestral' ? [1, 2] : [1, 2, 3];

    return listaOrdenada.map((cls) => {
      const turmasCls = turmasDoAno.filter((t) => normalizarClasse(t.classe) === cls);
      const turmaIds = new Set(turmasCls.map((t) => t.id));
      const alunosCls = alunosDoAno.filter((a) => normalizarClasse(a.classeId) === cls || turmaIds.has(a.turmaId));

      const porPeriodo = periodosNums.map((num) =>
        calcularMediaGeralDaClasse({
          classe: cls,
          turmasDaClasse: turmasCls,
          alunosDaClasse: alunosCls,
          disciplinas: disciplinasDoAno,
          notasConsolidadas: notasDoAno,
          regrasMAC,
          juris,
          trimestreFiltro: String(num) as '1' | '2' | '3',
          anoLectivo: anoSelecionado,
          nppAtivo,
          regimePeriodos: regime,
          periodosConfig: periodos,
          escolaId: escola.id
        })
      );

      const anual = calcularMediaGeralDaClasse({
        classe: cls,
        turmasDaClasse: turmasCls,
        alunosDaClasse: alunosCls,
        disciplinas: disciplinasDoAno,
        notasConsolidadas: notasDoAno,
        regrasMAC,
        juris,
        trimestreFiltro: 'anual',
        anoLectivo: anoSelecionado,
        nppAtivo,
        regimePeriodos: regime,
        periodosConfig: periodos,
        escolaId: escola.id
      });

      return {
        classe: cls,
        alunosCount: alunosCls.length,
        porPeriodo,
        anual
      };
    });
  }, [turmasDoAno, alunosDoAno, disciplinasDoAno, notasDoAno, regrasMAC, juris, anoSelecionado, nppAtivo, regime, periodos, escola.id]);

  const periodoAtivoNum = Number(String(escola.trimestreActivo || '1').replace(/[^0-9]/g, '')) || 1;
  const ehAnoAtivo = !escola.anoLectivoActivo || anoSelecionado === escola.anoLectivoActivo;

  return (
    <div className="space-y-6">
      {/* Cabeçalho Explicativo */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-blue-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 shrink-0 mt-0.5">
              <CalendarClock className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Gestão de Períodos Letivos (Trimestres / Semestres)
              </h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed max-w-2xl">
                Configure a divisão do ano letivo em <strong>Trimestres (3 períodos)</strong> ou <strong>Semestres (2 períodos)</strong>, defina os pesos percentuais e datas oficiais. O sistema utiliza esta estrutura para calcular médias segmentadas por período e agregar todas as disciplinas obrigatórias na média geral de cada classe.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-blue-400/40 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-sky-400"
              aria-label="Selecionar Ano Letivo"
            >
              {anosDisponiveis.map((a) => (
                <option key={a} value={a} className="bg-slate-900 text-white">
                  Ano {a} {a === escola.anoLectivoActivo ? '(Ativo)' : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleGuardar()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Períodos</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.texto}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="font-bold hover:underline ml-3 cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      {/* Controlo de Regime & Opções de Segmentação */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
              Estrutura do Ano Letivo ({anoSelecionado})
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleAlterarRegime('Trimestral')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  regime === 'Trimestral'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                Regime Trimestral (3 Trimestres)
              </button>
              <button
                type="button"
                onClick={() => handleAlterarRegime('Semestral')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  regime === 'Semestral'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                Regime Semestral (2 Semestres)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={calculoSegmentado}
                onChange={(e) => setCalculoSegmentado(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Cálculo Segmentado Ponderado Ativo</span>
            </label>

            <button
              type="button"
              onClick={handleEquilibrarPesos}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Equilibrar Pesos ({somaPesos}%)</span>
            </button>

            <button
              type="button"
              onClick={handleRestaurarDatasPadrao}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Datas MED</span>
            </button>
          </div>
        </div>

        {/* Cartões Configuráveis de Cada Período */}
        <div className={`grid grid-cols-1 ${periodos.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
          {periodos.map((p, idx) => {
            const isAtivo = ehAnoAtivo && periodoAtivoNum === p.numero;
            const segPeriodo = resultadoSegmentadoGeral.periodos.find((sp) => sp.numero === p.numero);

            return (
              <div
                key={p.id || `per-${p.numero}`}
                className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${
                  isAtivo
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : p.estado === 'Fechado'
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-white">
                        {p.numero}º {p.tipo}
                      </span>
                      {isAtivo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                          Em Vigor
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={p.nome}
                      onChange={(e) => handleAtualizarCampoPeriodo(idx, 'nome', e.target.value)}
                      className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleAtualizarCampoPeriodo(idx, 'estado', p.estado === 'Aberto' ? 'Fechado' : 'Aberto')
                    }
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 cursor-pointer ${
                      p.estado === 'Aberto'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {p.estado === 'Aberto' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{p.estado}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Início
                    </label>
                    <input
                      type="date"
                      value={p.dataInicio || ''}
                      onChange={(e) => handleAtualizarCampoPeriodo(idx, 'dataInicio', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Término
                    </label>
                    <input
                      type="date"
                      value={p.dataFim || ''}
                      onChange={(e) => handleAtualizarCampoPeriodo(idx, 'dataFim', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Peso na Média Anual (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={p.pesoPercentual ?? (regime === 'Semestral' ? 50 : 33.3)}
                      onChange={(e) => handleAtualizarCampoPeriodo(idx, 'pesoPercentual', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-xs font-mono font-bold text-gray-900"
                    />
                  </div>

                  {ehAnoAtivo && (
                    <div className="pt-4">
                      <button
                        type="button"
                        disabled={isAtivo}
                        onClick={() => handleAtivarPeriodo(p.numero)}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isAtivo
                            ? 'bg-blue-100 text-blue-800 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        }`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>{isAtivo ? 'Ativo' : 'Ativar'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Indicador de cálculo segmentado do período */}
                <div className="pt-2.5 border-t border-gray-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-gray-600 font-medium">Média Segmentada:</span>
                  <div className="flex items-center space-x-2">
                    <strong className="font-mono text-blue-900">
                      {segPeriodo?.mediaGeral !== null && segPeriodo?.mediaGeral !== undefined
                        ? `${segPeriodo.mediaGeral.toFixed(1)} val.`
                        : '—'}
                    </strong>
                    {segPeriodo && segPeriodo.totalAlunosAvaliados > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {segPeriodo.taxaAprovacao}% aprov.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel de Cálculo Segmentado das Médias por Classe (Tendo em conta todas as disciplinas obrigatórias) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-start space-x-2.5">
            <Layers className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-gray-900">
                Médias Segmentadas por Classe & Disciplinas Obrigatórias ({anoSelecionado})
              </h4>
              <p className="text-xs text-gray-500">
                Cada classe agrega primeiro a média de todas as disciplinas necessárias configuradas e calcula a média geral segmentada ao longo dos períodos ({regime}).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shrink-0">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-bold text-blue-950">
              Média Anual Segmentada: {' '}
              <strong className="font-mono">
                {resultadoSegmentadoGeral.mediaAnualSegmentada !== null
                  ? `${resultadoSegmentadoGeral.mediaAnualSegmentada.toFixed(1)} val.`
                  : '—'}
              </strong>
            </span>
          </div>
        </div>

        {resumoPorClasseSegmentado.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl space-y-1.5">
            <BookOpen className="w-7 h-7 text-gray-400 mx-auto" />
            <p className="text-xs font-bold text-gray-700">
              Sem turmas ou alunos registados no ano letivo {anoSelecionado}.
            </p>
            <p className="text-[11px] text-gray-500">
              Assim que existirem turmas e notas lançadas, as médias segmentadas de cada período e a média geral por classe serão exibidas aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                  <th className="p-3 font-bold">Classe</th>
                  <th className="p-3 font-bold text-center">Alunos</th>
                  <th className="p-3 font-bold text-center">Disciplinas (Lançadas / Obrigatórias)</th>
                  {periodos.map((per) => (
                    <th key={`th-per-${per.numero}`} className="p-3 font-bold text-center">
                      {per.nome}
                    </th>
                  ))}
                  <th className="p-3 font-black text-center bg-blue-50 text-blue-950 border-l border-blue-200">
                    Média Geral da Classe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resumoPorClasseSegmentado.map((row) => (
                  <tr key={row.classe} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-gray-900">{row.classe} Classe</td>
                    <td className="p-3 text-center font-mono font-semibold text-gray-700">{row.alunosCount}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                          row.anual.totalDisciplinasNecessarias > 0 &&
                          row.anual.disciplinasComNotas === row.anual.totalDisciplinasNecessarias
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : row.anual.disciplinasComNotas > 0
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {row.anual.disciplinasComNotas} / {row.anual.totalDisciplinasNecessarias} ({row.anual.coberturaPct}%)
                      </span>
                    </td>
                    {row.porPeriodo.map((resP, i) => (
                      <td key={`${row.classe}-p-${i}`} className="p-3 text-center font-mono font-bold text-slate-800">
                        {resP.mediaGeral !== null ? `${resP.mediaGeral.toFixed(1)}` : '—'}
                      </td>
                    ))}
                    <td className="p-3 text-center font-mono font-black text-blue-900 bg-blue-50/60 border-l border-blue-200">
                      {row.anual.mediaGeral !== null ? `${row.anual.mediaGeral.toFixed(1)} val.` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
