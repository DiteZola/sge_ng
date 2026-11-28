import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Calendar, BookOpen } from 'lucide-react';
import {
  Escola,
  Aluno,
  Turma,
  Disciplina,
  NotaTrimestralConsolidada,
  AvaliacaoCriada,
  NotaEstudante
} from '../types';
import { dbService } from '../services/storage';
import { obterInformacaoEscala } from '../services/macEngine';

interface SchoolTrimesterProgressionChartProps {
  escola: Escola;
  alunos: Aluno[];
  turmas: Turma[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  disciplinas?: Disciplina[];
  avaliacoes?: AvaliacaoCriada[];
  notasEstudantes?: NotaEstudante[];
  onNavigatePautas?: () => void;
}

type FiltroEscalaCiclo = 'geral' | 'primario' | 'secundario';

interface DadoTrimestreProgressao {
  trimestreNum: 1 | 2 | 3;
  trimestreLabel: string;
  trimestreCurto: string;
  mediaGeral: number | null;
  mediaPrimario: number | null;
  mediaSecundario: number | null;
  taxaPositivas: number | null;
  totalNotas: number;
  totalAlunos: number;
}

function extrairAnoLectivoRegistro(item: any): string {
  return String(item?.anoLectivo || item?.anoMatricula || '').trim();
}

function normalizarTrimestreNumero(raw: unknown): 1 | 2 | 3 | null {
  if (raw === 1 || raw === '1') return 1;
  if (raw === 2 || raw === '2') return 2;
  if (raw === 3 || raw === '3') return 3;
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('1') || s.includes('primeiro') || s === 'i') return 1;
  if (s.startsWith('2') || s.includes('segundo') || s === 'ii') return 2;
  if (s.startsWith('3') || s.includes('terceiro') || s === 'iii') return 3;
  return null;
}

export const SchoolTrimesterProgressionChart: React.FC<SchoolTrimesterProgressionChartProps> = ({
  escola,
  alunos,
  turmas,
  notasConsolidadas,
  disciplinas: propsDisciplinas,
  avaliacoes: propsAvaliacoes,
  notasEstudantes: propsNotasEstudantes,
  onNavigatePautas
}) => {
  const anoLectivoAtivo = (escola.anoLectivoActivo || '').trim();
  const [filtroCiclo, setFiltroCiclo] = useState<FiltroEscalaCiclo>('geral');

  const {
    dadosTrimestres,
    temPrimario,
    temSecundario,
    temDados,
    variacaoPercentual,
    melhorTrimestre,
    mediaAnualEscola,
    escalaAtiva,
    limiarAprovacao,
    regimePeriodos
  } = useMemo(() => {
    const todasDisciplinas = propsDisciplinas || dbService.getDisciplinas(escola.id, anoLectivoAtivo);
    const todasAvaliacoes = propsAvaliacoes || dbService.getAvaliacoes();
    const todasNotas = propsNotasEstudantes || dbService.getNotas();
    const regimeAtual = dbService.getRegimePeriodosAtivo(escola.id, anoLectivoAtivo);
    const periodosCfg = dbService.getPeriodosLetivos(escola.id, anoLectivoAtivo);

    const turmasEscola = turmas.filter(t => {
      if (t.escolaId && t.escolaId !== escola.id) return false;
      const anoT = extrairAnoLectivoRegistro(t);
      if (anoLectivoAtivo && anoT && anoT !== anoLectivoAtivo) return false;
      return true;
    });
    const turmasById = new Map<string, Turma>(turmasEscola.map(t => [t.id, t]));
    const turmasTodasById = new Map<string, Turma>(turmas.map(t => [t.id, t]));

    const alunosEscola = alunos.filter(a => {
      if (a.escolaId && a.escolaId !== escola.id) return false;
      const anoA = extrairAnoLectivoRegistro(a) || extrairAnoLectivoRegistro(turmasTodasById.get(a.turmaId));
      if (anoLectivoAtivo && anoA && anoA !== anoLectivoAtivo) return false;
      return true;
    });
    const alunosById = new Map<string, Aluno>(alunosEscola.map(a => [a.id, a]));
    const alunosTodosById = new Map<string, Aluno>(alunos.map(a => [a.id, a]));

    const discById = new Map<string, Disciplina>(todasDisciplinas.map(d => [d.id, d]));

    const buckets: Record<1 | 2 | 3, {
      somaNormalizada20: number;
      qtdTotal: number;
      positivas: number;
      somaPrimario: number;
      qtdPrimario: number;
      somaSecundario: number;
      qtdSecundario: number;
      alunosSet: Set<string>;
      paresRegistrados: Set<string>;
    }> = {
      1: { somaNormalizada20: 0, qtdTotal: 0, positivas: 0, somaPrimario: 0, qtdPrimario: 0, somaSecundario: 0, qtdSecundario: 0, alunosSet: new Set(), paresRegistrados: new Set() },
      2: { somaNormalizada20: 0, qtdTotal: 0, positivas: 0, somaPrimario: 0, qtdPrimario: 0, somaSecundario: 0, qtdSecundario: 0, alunosSet: new Set(), paresRegistrados: new Set() },
      3: { somaNormalizada20: 0, qtdTotal: 0, positivas: 0, somaPrimario: 0, qtdPrimario: 0, somaSecundario: 0, qtdSecundario: 0, alunosSet: new Set(), paresRegistrados: new Set() }
    };

    const ehDoAnoAtivo = (reg: any, alunoId?: string, turmaId?: string): boolean => {
      const regEscolaId = reg?.escolaId;
      const alunoObj = alunoId ? alunosTodosById.get(alunoId) : undefined;
      const turmaObj = turmaId ? turmasTodasById.get(turmaId) : (alunoObj?.turmaId ? turmasTodasById.get(alunoObj.turmaId) : undefined);

      if (regEscolaId && regEscolaId !== escola.id) return false;
      if (!regEscolaId && !alunosById.has(alunoId || '') && !turmasById.has(turmaId || '')) {
        if (alunoObj?.escolaId && alunoObj.escolaId !== escola.id) return false;
        if (turmaObj?.escolaId && turmaObj.escolaId !== escola.id) return false;
        if (!alunoObj && !turmaObj) return false;
      }

      if (!anoLectivoAtivo) return true;
      const anoReg = extrairAnoLectivoRegistro(reg);
      if (anoReg) return anoReg === anoLectivoAtivo;

      const anoAluno = extrairAnoLectivoRegistro(alunoObj);
      if (anoAluno) return anoAluno === anoLectivoAtivo;

      const anoTurma = extrairAnoLectivoRegistro(turmaObj);
      if (anoTurma) return anoTurma === anoLectivoAtivo;

      return false;
    };

    const registarNota = (
      triNum: 1 | 2 | 3,
      valor: number,
      alunoId: string,
      disciplinaId: string,
      turmaId?: string
    ) => {
      if (typeof valor !== 'number' || Number.isNaN(valor) || valor < 0) return;
      const alunoObj = alunosTodosById.get(alunoId);
      const turmaObj = (turmaId ? turmasTodasById.get(turmaId) : undefined) || (alunoObj?.turmaId ? turmasTodasById.get(alunoObj.turmaId) : undefined);
      const discObj = discById.get(disciplinaId);
      const escalaInfo = obterInformacaoEscala(turmaObj?.classe || alunoObj?.classeId, discObj?.nivelEnsino);
      const ehPrim = escalaInfo.ehPrimario;
      const notaClamped = Math.min(escalaInfo.escalaMaxima, Math.max(0, valor));

      const bucket = buckets[triNum];
      const chavePar = `${alunoId || 'a'}__${disciplinaId || 'd'}`;
      bucket.paresRegistrados.add(chavePar);
      if (alunoId) bucket.alunosSet.add(alunoId);

      bucket.qtdTotal += 1;
      bucket.somaNormalizada20 += ehPrim ? notaClamped * 2 : notaClamped;
      if (notaClamped >= escalaInfo.notaAprovacao) {
        bucket.positivas += 1;
      }

      if (ehPrim) {
        bucket.qtdPrimario += 1;
        bucket.somaPrimario += notaClamped;
      } else {
        bucket.qtdSecundario += 1;
        bucket.somaSecundario += notaClamped;
      }
    };

    // 1. Notas Trimestrais Consolidadas (fonte oficial primária)
    notasConsolidadas.forEach(n => {
      if (!ehDoAnoAtivo(n, n.alunoId, n.turmaId)) return;
      const tri = normalizarTrimestreNumero(n.trimestre);
      if (tri !== 1 && tri !== 2 && tri !== 3) return;
      const valorBruto =
        typeof n.mediaTrimestral === 'number' && n.mediaTrimestral > 0
          ? n.mediaTrimestral
          : typeof n.notaFinal === 'number' && n.notaFinal > 0
          ? n.notaFinal
          : typeof n.mac === 'number' && n.mac > 0
          ? n.mac
          : null;
      if (valorBruto === null) return;
      registarNota(tri, valorBruto, n.alunoId, n.disciplinaId, n.turmaId);
    });

    // 2. Fallback para avaliações contínuas lançadas no ano ativo (quando pauta ainda não foi consolidada)
    const avaliacoesAno = todasAvaliacoes.filter(av => ehDoAnoAtivo(av, undefined, av.turmaId));
    if (avaliacoesAno.length > 0) {
      const avById = new Map(avaliacoesAno.map(av => [av.id, av]));
      const acumuladoresFallback = new Map<string, {
        tri: 1 | 2 | 3;
        alunoId: string;
        disciplinaId: string;
        turmaId: string;
        soma: number;
        qtd: number;
      }>();

      todasNotas.forEach(nota => {
        const av = avById.get(nota.avaliacaoId);
        if (!av) return;
        const anoNota = extrairAnoLectivoRegistro(nota);
        if (anoLectivoAtivo && anoNota && anoNota !== anoLectivoAtivo) return;
        const tri = normalizarTrimestreNumero(av.trimestre);
        if (tri !== 1 && tri !== 2 && tri !== 3) return;
        const chavePar = `${nota.alunoId}__${av.disciplinaId}`;
        if (buckets[tri].paresRegistrados.has(chavePar)) return;

        const val = typeof nota.valorNota === 'number' ? nota.valorNota : Number((nota as any).valor ?? NaN);
        if (Number.isNaN(val) || val < 0) return;

        const key = `${tri}__${chavePar}`;
        const cur = acumuladoresFallback.get(key) || {
          tri,
          alunoId: nota.alunoId,
          disciplinaId: av.disciplinaId,
          turmaId: av.turmaId,
          soma: 0,
          qtd: 0
        };
        cur.soma += val;
        cur.qtd += 1;
        acumuladoresFallback.set(key, cur);
      });

      acumuladoresFallback.forEach(item => {
        if (item.qtd > 0) {
          registarNota(item.tri, item.soma / item.qtd, item.alunoId, item.disciplinaId, item.turmaId);
        }
      });
    }

    const totalPrimario = buckets[1].qtdPrimario + buckets[2].qtdPrimario + buckets[3].qtdPrimario;
    const totalSecundario = buckets[1].qtdSecundario + buckets[2].qtdSecundario + buckets[3].qtdSecundario;
    const hasPrim = totalPrimario > 0;
    const hasSec = totalSecundario > 0;

    // Se a escola só leciona Ensino Primário, a escala natural da escola é 0–10
    const usarEscalaPrimariaNatural =
      filtroCiclo === 'primario' || (filtroCiclo === 'geral' && hasPrim && !hasSec);
    const escalaAtual = usarEscalaPrimariaNatural ? 10 : 20;
    const limiarAtual = usarEscalaPrimariaNatural ? 5 : 10;

    const numerosPeriodosAtivos: Array<1 | 2 | 3> = regimeAtual === 'Semestral' ? [1, 2] : [1, 2, 3];
    if (regimeAtual === 'Semestral') {
      // No regime semestral, notas registradas como 3º período integram o 2º Semestre
      buckets[2].somaNormalizada20 += buckets[3].somaNormalizada20;
      buckets[2].qtdTotal += buckets[3].qtdTotal;
      buckets[2].positivas += buckets[3].positivas;
      buckets[2].somaPrimario += buckets[3].somaPrimario;
      buckets[2].qtdPrimario += buckets[3].qtdPrimario;
      buckets[2].somaSecundario += buckets[3].somaSecundario;
      buckets[2].qtdSecundario += buckets[3].qtdSecundario;
      buckets[3].alunosSet.forEach(a => buckets[2].alunosSet.add(a));
    }

    const listaTrimestres: DadoTrimestreProgressao[] = numerosPeriodosAtivos.map(triNum => {
      const b = buckets[triNum];
      const cfg = periodosCfg.find(p => Number(p.numero) === triNum);
      const labelPadrao = regimeAtual === 'Semestral' ? `${triNum}º Semestre` : `${triNum}º Trimestre`;
      const curtoPadrao = regimeAtual === 'Semestral' ? `${triNum}º Sem.` : `${triNum}º Trim.`;
      const mediaPrim = b.qtdPrimario > 0 ? Number((b.somaPrimario / b.qtdPrimario).toFixed(2)) : null;
      const mediaSec = b.qtdSecundario > 0 ? Number((b.somaSecundario / b.qtdSecundario).toFixed(2)) : null;
      const mediaGeralRaw = b.qtdTotal > 0
        ? (usarEscalaPrimariaNatural && hasPrim && !hasSec
            ? b.somaPrimario / b.qtdPrimario
            : b.somaNormalizada20 / b.qtdTotal)
        : null;
      const mediaGeral = mediaGeralRaw !== null ? Number(mediaGeralRaw.toFixed(2)) : null;
      const taxaPos = b.qtdTotal > 0 ? Math.round((b.positivas / b.qtdTotal) * 100) : null;

      return {
        trimestreNum: triNum,
        trimestreLabel: cfg?.nome || labelPadrao,
        trimestreCurto: curtoPadrao,
        mediaGeral,
        mediaPrimario: mediaPrim,
        mediaSecundario: mediaSec,
        taxaPositivas: taxaPos,
        totalNotas: b.qtdTotal,
        totalAlunos: b.alunosSet.size
      };
    });

    const seriePrincipal = listaTrimestres
      .map(d => {
        const valor =
          filtroCiclo === 'primario'
            ? d.mediaPrimario
            : filtroCiclo === 'secundario'
            ? d.mediaSecundario
            : d.mediaGeral;
        return { ...d, valor };
      })
      .filter((d): d is DadoTrimestreProgressao & { valor: number } => d.valor !== null);

    const hasData = seriePrincipal.length > 0;
    let variacao: number | null = null;
    if (seriePrincipal.length >= 2) {
      const primeiro = seriePrincipal[0].valor;
      const ultimo = seriePrincipal[seriePrincipal.length - 1].valor;
      variacao = Number((ultimo - primeiro).toFixed(2));
    }

    const best = seriePrincipal.length > 0
      ? seriePrincipal.reduce((acc, cur) => (cur.valor > acc.valor ? cur : acc), seriePrincipal[0])
      : null;

    const mediaAnual = seriePrincipal.length > 0
      ? Number((seriePrincipal.reduce((acc, cur) => acc + cur.valor, 0) / seriePrincipal.length).toFixed(2))
      : null;

    return {
      dadosTrimestres: listaTrimestres,
      temPrimario: hasPrim,
      temSecundario: hasSec,
      temDados: hasData,
      variacaoPercentual: variacao,
      melhorTrimestre: best,
      mediaAnualEscola: mediaAnual,
      escalaAtiva: escalaAtual,
      limiarAprovacao: limiarAtual,
      regimePeriodos: regimeAtual
    };
  }, [escola.id, anoLectivoAtivo, alunos, turmas, notasConsolidadas, propsDisciplinas, propsAvaliacoes, propsNotasEstudantes, filtroCiclo]);

  const dataKeyPrincipal =
    filtroCiclo === 'primario'
      ? 'mediaPrimario'
      : filtroCiclo === 'secundario'
      ? 'mediaSecundario'
      : 'mediaGeral';

  const rotuloSeriePrincipal =
    filtroCiclo === 'primario'
      ? 'Média Primário (0–10)'
      : filtroCiclo === 'secundario'
      ? 'Média Secundário (0–20)'
      : temPrimario && temSecundario
      ? 'Média Global Normalizada (0–20)'
      : `Média da Escola (0–${escalaAtiva})`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-2xs min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Progressão das Médias da Escola por {regimePeriodos === 'Semestral' ? 'Semestre' : 'Trimestre'}</span>
            </h4>
            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-md tabular-nums shrink-0">
              <Calendar className="h-3 w-3" />
              <span>Ano Letivo {anoLectivoAtivo || 'Ativo'}</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Evolução da média escolar entre os períodos letivos ({regimePeriodos === 'Semestral' ? '1º e 2º semestres' : '1º, 2º e 3º trimestres'}) no ano letivo {anoLectivoAtivo || 'corrente'} (escala 0–{escalaAtiva} valores)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {temPrimario && temSecundario && (
            <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFiltroCiclo('geral')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filtroCiclo === 'geral'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Geral (/20)
              </button>
              <button
                type="button"
                onClick={() => setFiltroCiclo('primario')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filtroCiclo === 'primario'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Primário (/10)
              </button>
              <button
                type="button"
                onClick={() => setFiltroCiclo('secundario')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filtroCiclo === 'secundario'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Secundário (/20)
              </button>
            </div>
          )}

          {onNavigatePautas && (
            <button
              type="button"
              onClick={onNavigatePautas}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ver Pautas →
            </button>
          )}
        </div>
      </div>

      {!temDados ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
            Sem notas lançadas para o ano letivo {anoLectivoAtivo || 'ativo'}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 max-w-md">
            A curva de progressão por trimestre será traçada automaticamente à medida que as notas do 1º, 2º e 3º trimestres forem consolidadas ou avaliadas neste ano letivo.
          </p>
        </div>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosTrimestres} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="sgeMediaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                <XAxis
                  dataKey="trimestreLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={[0, escalaAtiva]}
                  tickCount={escalaAtiva === 10 ? 6 : 5}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={10}
                  domain={[0, 100]}
                  unit="%"
                  hide={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    fontSize: '11px'
                  }}
                  formatter={(value: any, name: any) => {
                    if (value === null || value === undefined) return ['Sem dados', name];
                    if (String(name).includes('Positivas')) return [`${value}%`, name];
                    return [`${Number(value).toFixed(2)} val.`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={limiarAprovacao}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Mín. Aprovação (${limiarAprovacao})`,
                    position: 'insideTopRight',
                    fill: '#d97706',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="taxaPositivas"
                  name="% Notas Positivas"
                  fill="#10b981"
                  fillOpacity={0.35}
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={dataKeyPrincipal}
                  name={rotuloSeriePrincipal}
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#sgeMediaGrad)"
                  connectNulls
                  dot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                {filtroCiclo === 'geral' && temPrimario && temSecundario && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="mediaSecundario"
                    name="Secundário (0–20)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    connectNulls
                    dot={{ r: 3.5, fill: '#6366f1' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Cartões compactos de resumo por trimestre + variação do ano ativo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 mt-2 border-t border-gray-100 dark:border-slate-800 text-xs">
            {dadosTrimestres.map(tri => {
              const valorExibido =
                filtroCiclo === 'primario'
                  ? tri.mediaPrimario
                  : filtroCiclo === 'secundario'
                  ? tri.mediaSecundario
                  : tri.mediaGeral;
              const positivo = valorExibido !== null && valorExibido >= limiarAprovacao;
              return (
                <div
                  key={tri.trimestreNum}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{tri.trimestreLabel}</span>
                    {tri.taxaPositivas !== null && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {tri.taxaPositivas}% pos.
                      </span>
                    )}
                  </div>
                  <div className={`text-base font-black mt-0.5 tabular-nums ${
                    valorExibido === null
                      ? 'text-slate-400 dark:text-slate-500'
                      : positivo
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {valorExibido !== null ? `${valorExibido.toFixed(1)} val.` : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {tri.totalNotas > 0 ? `${tri.totalAlunos} aluno(s) · ${tri.totalNotas} notas` : 'Sem notas lançadas'}
                  </div>
                </div>
              );
            })}

            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">
                Balanço {anoLectivoAtivo || 'Anual'}
              </span>
              <div className="text-base font-black text-slate-950 dark:text-white mt-0.5 tabular-nums">
                {mediaAnualEscola !== null ? `${mediaAnualEscola.toFixed(1)} / ${escalaAtiva}` : '—'}
              </div>
              <div className="text-[10px] font-semibold mt-0.5 tabular-nums text-slate-600 dark:text-slate-300">
                {variacaoPercentual !== null ? (
                  <span className={variacaoPercentual >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {variacaoPercentual >= 0 ? `+${variacaoPercentual.toFixed(1)}` : variacaoPercentual.toFixed(1)} val. vs 1ºT
                  </span>
                ) : melhorTrimestre ? (
                  <span>Melhor: {melhorTrimestre.trimestreCurto}</span>
                ) : (
                  <span>Ano letivo ativo</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
