import React, { useMemo, useState } from 'react';
import {
  Users,
  GraduationCap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Activity,
  FileText,
  UserCheck,
  Calendar,
  Bell,
  ShieldCheck,
  CreditCard,
  BookOpen,
  Database,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PlusCircle,
  Boxes,
  Library,
  LifeBuoy,
  Server,
  UserCog,
  FileCheck2,
  ClipboardList,
  Send
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Escola,
  Aluno,
  Funcionario,
  Turma,
  NotaTrimestralConsolidada,
  MensagemInterna,
  ReciboPagamento,
  AtribuicaoDocente,
  ConfiguracaoSistema,
  SessaoAtivaUsuario
} from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { StudentRankingSection } from './StudentRankingSection';
import { obterInformacaoEscala } from '../services/macEngine';

export interface DesempenhoDisciplinaDash {
  disciplinaId: string;
  disciplina: string;
  nomeCompleto: string;
  media: number;
  positivas: number;
  negativas: number;
  totalNotas: number;
  escala: number;
  limiar: number;
  taxaAprovacao: number;
}

export interface ResumoAssiduidadeDash {
  totalRegistos: number;
  presentesTotal: number;
  justificadasTotal: number;
  injustificadasTotal: number;
  presentesHoje: number;
  faltasHoje: number;
  registosHoje: number;
  taxaPresencaGeral: number;
  pctJustificadasGeral: number;
  pctInjustificadasGeral: number;
  turmasComChamadaHoje: number;
}

export interface DadoAssiduidadeTurmaDash {
  turma: string;
  nomeCompleto: string;
  Presenças: number;
  Justificadas: number;
  Injustificadas: number;
  totalPresentes: number;
  totalFaltas: number;
}

export interface SharedRoleDashboardProps {
  escola: Escola;
  currentUser: Funcionario;
  alunos: Aluno[];
  funcionarios: Funcionario[];
  turmas: Turma[];
  notasConsolidadas: NotaTrimestralConsolidada[];
  atribuicoes: AtribuicaoDocente[];
  mensagens: MensagemInterna[];
  recibos: ReciboPagamento[];
  configSistema: ConfiguracaoSistema;
  professoresEscola: Funcionario[];
  alunosComNotaCount: number;
  taxaAprovacaoEscola: number;
  dadosDesempenhoDisciplinas: DesempenhoDisciplinaDash[];
  melhoresDisciplinas: DesempenhoDisciplinaDash[];
  pioresDisciplinas: DesempenhoDisciplinaDash[];
  dadosAssiduidade: DadoAssiduidadeTurmaDash[];
  resumoAssiduidadeAlunos: ResumoAssiduidadeDash;
  alunosEmRiscoCount: number;
  usuariosOnline: SessaoAtivaUsuario[];
  usuarios24Horas: SessaoAtivaUsuario[];
  statusBanco: {
    tamanhoFormatado: string;
    totalRegistos: number;
  };
  onNavigate: (tab: any) => void;
  onOpenUsuariosModal: () => void;
  onEnviarLembreteNotas: () => void;
}

const isClassePrimaria = (classeStr?: string): boolean => {
  const norm = (classeStr || '').trim().toLowerCase();
  return (
    norm.includes('inicia') ||
    ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '1a', '2a', '3a', '4a', '5a', '6a', '1', '2', '3', '4', '5', '6'].includes(norm)
  );
};

const getDiaSemanaAtualPt = (): string => {
  const mapa = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return mapa[new Date().getDay()] || 'Segunda-feira';
};

const RoleHeaderCard: React.FC<{
  badge: string;
  badgeClass: string;
  title: string;
  subtitle: string;
  configSistema: ConfiguracaoSistema;
  escola: Escola;
  actions: React.ReactNode;
}> = ({ badge, badgeClass, title, subtitle, configSistema, escola, actions }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center">
        <InsigniaAngola
          size={44}
          customUrl={configSistema.insigniaNacionalUrl}
          className="object-contain"
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${badgeClass}`}>
            {badge}
          </span>
          <span className="text-xs text-slate-500 font-semibold truncate">
            {escola.nomeOficial} · {escola.anoLectivoActivo || 'Sem Ano'}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight mt-1 truncate">
          {title}
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
  </div>
);

const RecentNoticesCard: React.FC<{
  mensagens: MensagemInterna[];
  onNavigateComunicacao: () => void;
  titulo?: string;
}> = ({ mensagens, onNavigateComunicacao, titulo = 'Comunicados & Avisos Recentes' }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
        <Bell className="h-4 w-4 text-blue-600 shrink-0" />
        <span>{titulo}</span>
      </h3>
      <button
        type="button"
        onClick={onNavigateComunicacao}
        className="text-xs font-bold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
      >
        Ver todos →
      </button>
    </div>
    {mensagens.length === 0 ? (
      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
        Nenhum comunicado registado recentemente.
      </div>
    ) : (
      <div className="space-y-2 text-xs">
        {mensagens.slice(0, 3).map((m) => (
          <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 truncate">{m.titulo || m.assunto || 'Aviso Institucional'}</span>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">{(m.dataHora || m.criadaEm || '').slice(0, 16)}</span>
            </div>
            <p className="text-slate-600 mt-1 line-clamp-2">{m.conteudo}</p>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">
              {m.remetenteNome} ({m.remetentePapel})
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* =========================================================================
   1. SUBDIRETOR PEDAGÓGICO / COORDENADOR PEDAGÓGICO (SEM BLOCO FINANCEIRO)
   ========================================================================= */
export const SubdiretorPedagogicoDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  currentUser,
  alunos,
  turmas,
  notasConsolidadas,
  atribuicoes,
  mensagens,
  configSistema,
  professoresEscola,
  alunosComNotaCount,
  taxaAprovacaoEscola,
  dadosDesempenhoDisciplinas,
  melhoresDisciplinas,
  pioresDisciplinas,
  dadosAssiduidade,
  resumoAssiduidadeAlunos,
  alunosEmRiscoCount,
  onNavigate,
  onEnviarLembreteNotas
}) => {
  const solicitacoesPendentes = useMemo(
    () => dbService.getSolicitacoesNota().filter(s => s.escolaId === escola.id && s.estado === 'Pendente'),
    [escola.id]
  );

  const anoActivo = escola.anoLectivoActivo || '';
  const alunosAno = anoActivo
    ? alunos.filter(a => (a.anoLectivo || a.anoMatricula || '') === anoActivo)
    : alunos;

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge={currentUser.cargo || 'Subdireção Pedagógica'}
        badgeClass="bg-indigo-50 text-indigo-800 border-indigo-200"
        title={`Coordenação Pedagógica · ${escola.nomeOficial}`}
        subtitle={`Supervisão curricular, lançamento MAC, fecho de pautas (${escola.trimestreActivo}º Trimestre) e rendimento discente.`}
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('coordenacao')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Award className="h-4 w-4 shrink-0" />
              <span>Coordenação MAC</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pautas')}
              className="px-3.5 py-2 text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>Pautas Trimestrais</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('presencas')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardList className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Presenças</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('horarios')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Clock className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Horários</span>
            </button>
          </>
        }
      />

      {/* PRIORIDADE 1: Solicitações Pendentes de Alteração de Notas */}
      {solicitacoesPendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                {solicitacoesPendentes.length} Pedido(s) de Alteração de Nota Pendente(s)
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Último pedido: {solicitacoesPendentes[0].professorNome} solicitou ajuste em {solicitacoesPendentes[0].disciplinaNome} ({solicitacoesPendentes[0].turmaNome}) para {solicitacoesPendentes[0].alunoNome}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('coordenacao')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Deliberar Pedidos →
          </button>
        </div>
      )}

      {/* PRIORIDADE 2: 4 KPIs Pedagógicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Efetivo Discente</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-950 tabular-nums">{alunosAno.length}</span>
            <span className="text-xs font-semibold text-slate-500">{turmas.length} turmas</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {alunosAno.filter(a => a.estado === 'Ativo').length} ativos · {alunosAno.filter(a => a.estado === 'Desistente').length} desistentes
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Taxa de Aproveitamento</span>
            <Award className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">
              {alunosComNotaCount > 0 ? `${taxaAprovacaoEscola}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 font-semibold">positivos</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {alunosComNotaCount} aluno(s) com notas avaliadas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Assiduidade Discente</span>
            <Calendar className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-teal-700 tabular-nums">
              {resumoAssiduidadeAlunos.totalRegistos > 0 ? `${resumoAssiduidadeAlunos.taxaPresencaGeral}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {resumoAssiduidadeAlunos.turmasComChamadaHoje} turma(s) hoje
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              {resumoAssiduidadeAlunos.injustificadasTotal + resumoAssiduidadeAlunos.justificadasTotal} faltas registadas
            </span>
            <button type="button" onClick={() => onNavigate('presencas')} className="text-teal-700 font-bold hover:underline cursor-pointer">
              Mapa →
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Corpo Docente & Risco</span>
            <UserCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-950 tabular-nums">{professoresEscola.length}</span>
            <span className="text-xs font-bold text-rose-600 tabular-nums">{alunosEmRiscoCount} em alerta</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{solicitacoesPendentes.length} pedido(s) nota</span>
            <button type="button" onClick={() => onNavigate('professores')} className="text-blue-700 font-bold hover:underline cursor-pointer">
              Docentes →
            </button>
          </div>
        </div>
      </div>

      {/* PRIORIDADE 3: Estado de Cumprimento do Lançamento de Notas por Professor */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <span>Cumprimento de Lançamento de Notas (Trimestre {escola.trimestreActivo})</span>
            </h3>
            <p className="text-xs text-slate-500">Acompanhamento do fecho das pautas antes da homologação.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEnviarLembreteNotas}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Cobrar Pautas</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('avaliacoes')}
              className="text-xs font-bold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
            >
              Abrir MAC →
            </button>
          </div>
        </div>

        {professoresEscola.length === 0 ? (
          <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
            Nenhum professor registado nesta escola até ao momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {professoresEscola.map((prof, idx) => {
              const turmasDoProf = atribuicoes.filter(a => a.professorId === prof.id && a.escolaId === escola.id);
              const discProfIds = new Set(turmasDoProf.map(t => t.disciplinaId));
              const turmaProfIds = new Set(turmasDoProf.map(t => t.turmaId));
              const notasLancadasProf = notasConsolidadas.filter(
                n => turmaProfIds.has(n.turmaId) && discProfIds.has(n.disciplinaId)
              );
              const alunosEsperados = turmasDoProf.reduce((acc, at) => acc + alunos.filter(al => al.turmaId === at.turmaId).length, 0);
              const pctLancado = alunosEsperados > 0
                ? Math.min(100, Math.round((notasLancadasProf.length / alunosEsperados) * 100))
                : (notasLancadasProf.length > 0 ? 100 : 0);
              const status = turmasDoProf.length === 0
                ? 'Sem Atribuições'
                : pctLancado >= 100
                  ? 'Concluído'
                  : pctLancado > 0
                    ? 'Em Andamento'
                    : 'Pendente';

              return (
                <div key={`${prof.id}-${idx}`} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{prof.nomeCompleto}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{prof.cargo || 'Professor'}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border shrink-0 ${
                      status === 'Concluído'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : status === 'Em Andamento'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                    <span>{turmasDoProf.length} atribuição(ões)</span>
                    <span className="font-bold text-slate-900">{pctLancado}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${status === 'Concluído' ? 'bg-emerald-600' : pctLancado > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                      style={{ width: `${pctLancado}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRIORIDADE 4: Disciplinas em Destaque vs Menor Rendimento + Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span>Disciplinas em Destaque</span>
            </h4>
            <span className="text-xs font-bold text-emerald-700 tabular-nums">{melhoresDisciplinas.length}</span>
          </div>
          {melhoresDisciplinas.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Sem disciplinas com notas consolidadas positivas.
            </div>
          ) : (
            <div className="space-y-2">
              {melhoresDisciplinas.map((disc, idx) => (
                <div key={disc.nomeCompleto} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
                  <span className="font-bold text-slate-900 truncate">{idx + 1}. {disc.nomeCompleto}</span>
                  <span className="font-black text-emerald-700 tabular-nums shrink-0 ml-2">{disc.media.toFixed(1)} val. ({disc.taxaAprovacao}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <span>Disciplinas que Requerem Intervenção</span>
            </h4>
            <span className="text-xs font-bold text-rose-700 tabular-nums">{pioresDisciplinas.length}</span>
          </div>
          {pioresDisciplinas.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Nenhuma disciplina com rendimento negativo identificada.
            </div>
          ) : (
            <div className="space-y-2">
              {pioresDisciplinas.map((disc, idx) => (
                <div key={disc.nomeCompleto} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 text-xs">
                  <span className="font-bold text-slate-900 truncate">{idx + 1}. {disc.nomeCompleto}</span>
                  <span className="font-black text-rose-700 tabular-nums shrink-0 ml-2">{disc.media.toFixed(1)} val. ({disc.negativas} neg.)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PRIORIDADE 5: Performance & Assiduidade Gráficos + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <span>Médias por Disciplina</span>
          </h4>
          {dadosDesempenhoDisciplinas.length === 0 ? (
            <div className="h-56 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
              Aguardando lançamento de notas.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosDesempenhoDisciplinas.slice(0, 8)}>
                  <XAxis dataKey="disciplina" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 20]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="media" name="Média" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-teal-600" />
            <span>Assiduidade por Turma (%)</span>
          </h4>
          {dadosAssiduidade.length === 0 ? (
            <div className="h-56 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
              Sem chamadas registadas.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosAssiduidade}>
                  <XAxis dataKey="turma" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="Presenças" fill="#10b981" stackId="a" />
                  <Bar dataKey="Justificadas" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="Injustificadas" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <StudentRankingSection
        escola={escola}
        alunos={alunos}
        turmas={turmas}
        currentUser={currentUser}
        isDiretorPanel={true}
      />

      <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
    </div>
  );
};

/* =========================================================================
   2. SUBDIRETOR ADMINISTRATIVO (FINANCEIRO & PATRIMÓNIO NO TOPO)
   ========================================================================= */
export const SubdiretorAdministrativoDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  currentUser,
  alunos,
  turmas,
  funcionarios,
  mensagens,
  recibos,
  configSistema,
  resumoAssiduidadeAlunos,
  onNavigate
}) => {
  const transacoes = useMemo(
    () => dbService.getTransacoesFinanceiras(escola.id, escola.anoLectivoActivo),
    [escola.id, escola.anoLectivoActivo]
  );
  const despesas = useMemo(
    () => dbService.getDespesasEscolares(escola.id, escola.anoLectivoActivo),
    [escola.id, escola.anoLectivoActivo]
  );
  const patrimonio = useMemo(
    () => dbService.getPatrimonio(escola.id),
    [escola.id]
  );
  const presencasFuncs = useMemo(
    () => dbService.getPresencas().filter(p => p.escolaId === escola.id),
    [escola.id]
  );

  const totalReceitas = transacoes.reduce((acc, t) => acc + (t.valorTotalKz || t.valorKz || 0), 0);
  const totalDespesas = despesas.reduce((acc, d) => acc + (d.valorKz || 0), 0);
  const saldoCaixa = totalReceitas - totalDespesas;
  const alunosDevedores = alunos.filter(a => a.propinaStatus === 'Pendente');
  const taxaAdimplencia = alunos.length > 0 ? Math.round(((alunos.length - alunosDevedores.length) / alunos.length) * 100) : 100;

  const bensDanificados = patrimonio.filter(p =>
    ['Danificado', 'Em Reparação', 'Inoperante', 'Para Abate'].includes(p.estadoConservacao)
  ).length;
  const valorPatrimonio = patrimonio.reduce((acc, p) => acc + ((p.valorEstimadoKz || 0) * (p.quantidade || 1)), 0);

  const dadosTurnos = [
    { name: 'Manhã', value: alunos.filter(a => (turmas.find(t => t.id === a.turmaId)?.turno === 'Manhã') || a.periodo === 'Matinal').length, color: '#2563eb' },
    { name: 'Tarde', value: alunos.filter(a => (turmas.find(t => t.id === a.turmaId)?.turno === 'Tarde') || a.periodo === 'Vespertino').length, color: '#10b981' },
    { name: 'Noite', value: alunos.filter(a => (turmas.find(t => t.id === a.turmaId)?.turno === 'Noite') || a.periodo === 'Noturno').length, color: '#f59e0b' }
  ];

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach(d => {
      const cat = d.categoria || 'Outras Despesas';
      map[cat] = (map[cat] || 0) + (d.valorKz || 0);
    });
    return Object.entries(map)
      .map(([categoria, valor]) => ({
        categoria: categoria.length > 16 ? categoria.slice(0, 14) + '..' : categoria,
        valor
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [despesas]);

  const hojeIso = new Date().toISOString().split('T')[0];
  const funcsPresentesHoje = presencasFuncs.filter(p => p.data === hojeIso && p.estado === 'Presente').length;

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge={currentUser.cargo || 'Subdireção Administrativa'}
        badgeClass="bg-blue-50 text-blue-800 border-blue-200"
        title={`Gestão Administrativa, Caixa & Património · ${escola.nomeOficial}`}
        subtitle="Controlo financeiro de propinas e emolumentos, despesas operacionais, inventário patrimonial e assiduidade institucional."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('pagamentos')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>Pagamentos & Caixa</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('relatorios_financeiros')}
              className="px-3.5 py-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Relatórios Financeiros</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('patrimonio')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Boxes className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Património</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('declaracoes')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Declarações</span>
            </button>
          </>
        }
      />

      {/* PRIORIDADE 1: 4 Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Total Arrecadado</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700 font-mono tabular-nums">
            {totalReceitas.toLocaleString('pt-AO')} Kz
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{transacoes.length} transações confirmadas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Despesas Executadas</span>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-700 font-mono tabular-nums">
            {totalDespesas.toLocaleString('pt-AO')} Kz
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{despesas.length} lançamentos de despesa</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Saldo Líquido em Caixa</span>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <div className={`mt-2 text-xl font-black font-mono tabular-nums ${saldoCaixa >= 0 ? 'text-slate-950' : 'text-rose-700'}`}>
            {saldoCaixa.toLocaleString('pt-AO')} Kz
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Ano Letivo {escola.anoLectivoActivo}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Adimplência de Propinas</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-700 tabular-nums">{taxaAdimplencia}%</span>
            <span className="text-xs font-semibold text-rose-700 tabular-nums">{alunosDevedores.length} pendentes</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{alunos.length} estudantes no total</div>
        </div>
      </div>

      {/* PRIORIDADE 2: Últimos Movimentos & Despesas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Últimas Cobranças & Recibos</span>
            </h3>
            <button type="button" onClick={() => onNavigate('pagamentos')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Abrir Caixa →
            </button>
          </div>
          {transacoes.length === 0 && recibos.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Nenhum pagamento registado até ao momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[11px] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Estudante</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(transacoes.length > 0 ? transacoes.slice(0, 5) : recibos.slice(0, 5)).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[180px]">{item.alunoNome}</div>
                        <div className="text-[10px] text-slate-500">{item.numeroRecibo || 'Recibo'} · {item.turmaNome || ''}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{item.tipo || item.mesReferencia || 'Propina'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {Number(item.valorTotalKz || item.valorKz || item.valorPagoKz || 0).toLocaleString('pt-AO')} Kz
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-rose-600" />
              <span>Despesas por Categoria</span>
            </h3>
            <button type="button" onClick={() => onNavigate('relatorios_financeiros')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Balanço →
            </button>
          </div>
          {despesasPorCategoria.length === 0 ? (
            <div className="h-52 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
              Nenhuma despesa operacional lançada.
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={despesasPorCategoria}>
                  <XAxis dataKey="categoria" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('pt-AO')} Kz`, 'Despesa']} contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="valor" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* PRIORIDADE 3: Património, Turnos & Assiduidade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Boxes className="h-4 w-4 text-amber-600" />
              <span>Património Escolar</span>
            </h3>
            <button type="button" onClick={() => onNavigate('patrimonio')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Inventário →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Itens Inventariados</span>
              <strong className="text-lg font-black text-slate-950 tabular-nums">{patrimonio.length}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Requerem Reparação</span>
              <strong className={`text-lg font-black tabular-nums ${bensDanificados > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {bensDanificados}
              </strong>
            </div>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs flex items-center justify-between">
            <span className="font-semibold text-amber-950">Valor Estimado:</span>
            <span className="font-mono font-black text-amber-900 tabular-nums">{valorPatrimonio.toLocaleString('pt-AO')} Kz</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-teal-600" />
              <span>Assiduidade & Turnos</span>
            </h3>
            <button type="button" onClick={() => onNavigate('presencas')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Presenças →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Pessoal Registado</span>
              <strong className="text-lg font-black text-slate-950 tabular-nums">{funcionarios.length}</strong>
              <span className="text-[10px] text-emerald-700 block">{funcsPresentesHoje} pres. hoje</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Freq. Alunos</span>
              <strong className="text-lg font-black text-teal-700 tabular-nums">
                {resumoAssiduidadeAlunos.totalRegistos > 0 ? `${resumoAssiduidadeAlunos.taxaPresencaGeral}%` : '—'}
              </strong>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
            {dadosTurnos.map(t => (
              <div key={t.name} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block">{t.name}</span>
                <span className="font-black text-slate-950 tabular-nums">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
      </div>
    </div>
  );
};

/* =========================================================================
   3. PROFESSOR (FOCO DOCENTE: HORÁRIO, TURMAS ATRIBUÍDAS, MAC E ASSIDUIDADE REAL)
   ========================================================================= */
export const ProfessorDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  currentUser,
  alunos,
  turmas,
  notasConsolidadas,
  atribuicoes,
  mensagens,
  configSistema,
  onNavigate
}) => {
  const minhasAtribuicoes = useMemo(
    () => atribuicoes.filter(a => a.professorId === currentUser.id && (!a.escolaId || a.escolaId === escola.id)),
    [atribuicoes, currentUser.id, escola.id]
  );

  const minhasTurmasIds = useMemo(
    () => new Set(minhasAtribuicoes.map(a => a.turmaId)),
    [minhasAtribuicoes]
  );

  const turmasExibidas = useMemo(() => {
    if (minhasTurmasIds.size > 0) {
      return turmas.filter(t => minhasTurmasIds.has(t.id));
    }
    return [];
  }, [turmas, minhasTurmasIds]);

  const disciplinas = useMemo(() => dbService.getDisciplinas(escola.id), [escola.id]);
  const meuHorario = useMemo(() => dbService.obterHorarioDoProfessor(currentUser.id).filter(h => h.escolaId === escola.id), [currentUser.id, escola.id]);
  const diaHoje = getDiaSemanaAtualPt();
  const aulasHoje = useMemo(
    () => meuHorario.filter(h => h.diaSemana === diaHoje).sort((a, b) => a.numeroTempo - b.numeroTempo),
    [meuHorario, diaHoje]
  );

  const presencasAlunos = useMemo(() => dbService.obterPresencasAlunos(), []);
  const minhaAssiduidadeRegistos = useMemo(
    () => dbService.getPresencas().filter(p => p.funcionarioId === currentUser.id && p.escolaId === escola.id),
    [currentUser.id, escola.id]
  );
  const minhasAlteracoesDirecao = useMemo(
    () => dbService.getRegistosAlteracoesNotas(currentUser.id, escola.id).filter(r => !r.lidoPeloProfessor),
    [currentUser.id, escola.id]
  );

  const totalAlunosLecionados = useMemo(() => {
    const ids = new Set<string>();
    turmasExibidas.forEach(t => {
      alunos.filter(a => a.turmaId === t.id).forEach(a => ids.add(a.id));
    });
    return ids.size;
  }, [turmasExibidas, alunos]);

  const minhaTaxaPresenca = useMemo(() => {
    if (minhaAssiduidadeRegistos.length === 0) return null;
    const ok = minhaAssiduidadeRegistos.filter(r => r.estado === 'Presente').length;
    return Math.round((ok / minhaAssiduidadeRegistos.length) * 100);
  }, [minhaAssiduidadeRegistos]);

  const dadosReaisTurmas = useMemo(() => {
    return turmasExibidas.map(t => {
      const discIdsProfTurma = new Set(minhasAtribuicoes.filter(a => a.turmaId === t.id).map(a => a.disciplinaId));
      const notasT = notasConsolidadas.filter(
        n => n.turmaId === t.id && (discIdsProfTurma.size === 0 || discIdsProfTurma.has(n.disciplinaId))
      );
      const validas = notasT.map(n => n.mediaTrimestral || n.notaFinal || n.mac || 0).filter(v => v > 0);
      const mediaReal = validas.length > 0 ? Number((validas.reduce((a, b) => a + b, 0) / validas.length).toFixed(1)) : 0;

      const presT = presencasAlunos.filter(p => p.turmaId === t.id);
      const taxaAssid = presT.length > 0
        ? Math.round((presT.filter(p => p.estado === 'Presente').length / presT.length) * 100)
        : 0;

      return {
        turma: t.nome,
        MediaNotas: mediaReal,
        Assiduidade: taxaAssid,
        temNotas: validas.length > 0,
        temAssid: presT.length > 0
      };
    });
  }, [turmasExibidas, minhasAtribuicoes, notasConsolidadas, presencasAlunos]);

  const temDadosGrafico = dadosReaisTurmas.some(d => d.temNotas || d.temAssid);

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Corpo Docente"
        badgeClass="bg-emerald-50 text-emerald-800 border-emerald-200"
        title={`Olá, Prof. ${currentUser.nomeCompleto}`}
        subtitle={`Agenda de aulas, chamadas diárias, lançamento MAC (${escola.trimestreActivo}º Trimestre) e acompanhamento das suas turmas.`}
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('avaliacoes')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Lançar Notas (MAC)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('presencas')}
              className="px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>Fichas de Presenças</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('horarios')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Clock className="h-4 w-4 text-blue-600 shrink-0" />
              <span>O Meu Horário</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pautas')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Pautas</span>
            </button>
          </>
        }
      />

      {minhasAlteracoesDirecao.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950 block">
                {minhasAlteracoesDirecao.length} alteração(ões) executiva(s) de nota registada(s) pela Direção
              </strong>
              <span className="text-amber-800">
                Consulte o módulo de Avaliação MAC para conferir as justificações averbadas.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('avaliacoes')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            Conferir Notas →
          </button>
        </div>
      )}

      {/* PRIORIDADE 1: 4 KPIs Reais do Professor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Turmas Atribuídas</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{turmasExibidas.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{minhasAtribuicoes.length} disciplina(s)/turma</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Estudantes Lecionados</span>
          <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">{totalAlunosLecionados}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Nas turmas sob sua docência</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Aulas Hoje ({diaHoje})</span>
          <div className="text-2xl font-black text-blue-700 mt-1 tabular-nums">{aulasHoje.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{meuHorario.length} tempos semanais no total</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Minha Assiduidade</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">
            {minhaTaxaPresenca !== null ? `${minhaTaxaPresenca}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {minhaAssiduidadeRegistos.length > 0
              ? `${minhaAssiduidadeRegistos.length} registo(s) de ponto`
              : 'Sem faltas ou apontamentos registados'}
          </div>
        </div>
      </div>

      {/* PRIORIDADE 2: Horário de Hoje + Minhas Turmas & Disciplinas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Aulas de Hoje ({diaHoje})</span>
            </h3>
            <button type="button" onClick={() => onNavigate('horarios')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Semana →
            </button>
          </div>
          {aulasHoje.length === 0 ? (
            <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              {meuHorario.length === 0
                ? 'O seu horário semanal ainda não foi atribuído pela Coordenação.'
                : `Sem tempos letivos agendados para ${diaHoje}.`}
            </div>
          ) : (
            <div className="space-y-2">
              {aulasHoje.map(aula => (
                <div key={aula.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{aula.disciplinaNome}</div>
                    <div className="text-[11px] text-slate-500">
                      {aula.turmaNome || aula.classe} · Sala {aula.sala || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2 font-mono">
                    <div className="font-bold text-blue-700">{aula.horaInicio}–{aula.horaFim}</div>
                    <div className="text-[10px] text-slate-500">{aula.numeroTempo}º Tempo</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <span>Minhas Turmas & Disciplinas Atribuídas</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {minhasAtribuicoes.length} atribuição(ões)
            </span>
          </div>

          {minhasAtribuicoes.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">Ainda sem turmas/disciplinas atribuídas ao seu perfil</p>
              <p className="text-[11px] text-slate-500">
                Solicite à Subdireção Pedagógica a vinculação das suas disciplinas e turmas para iniciar o lançamento de MAC e presenças.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {minhasAtribuicoes.map((at) => {
                const t = turmas.find(tm => tm.id === at.turmaId);
                const d = disciplinas.find(dc => dc.id === at.disciplinaId);
                const alunosTurma = alunos.filter(a => a.turmaId === at.turmaId);
                const notasLanc = notasConsolidadas.filter(
                  n => n.turmaId === at.turmaId && n.disciplinaId === at.disciplinaId
                );
                const pct = alunosTurma.length > 0 ? Math.min(100, Math.round((notasLanc.length / alunosTurma.length) * 100)) : 0;

                return (
                  <div key={at.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-emerald-700 truncate">
                          {d?.nome || 'Disciplina'} {at.ehCoordenadorTurma ? '· Dir. Turma' : ''}
                        </div>
                        <h4 className="text-sm font-black text-slate-950 truncate mt-0.5">
                          {t?.nome || 'Turma'} ({t?.classe || '—'})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {t?.turno || '—'} · Sala {t?.sala || '—'} · {alunosTurma.length} alunos
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-800 tabular-nums shrink-0">{pct}% MAC</span>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => onNavigate('avaliacoes')}
                        className="font-bold text-emerald-700 hover:underline inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Lançar Notas</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('presencas')}
                        className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Fazer Chamada
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PRIORIDADE 3: Rendimento Real das Minhas Turmas & Avisos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span>Rendimento & Assiduidade Real das Minhas Turmas</span>
            </h3>
          </div>
          {!temDadosGrafico ? (
            <div className="h-56 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center p-4 text-xs text-slate-500">
              Os indicadores aparecerão automaticamente assim que lançar notas ou registar chamadas nas suas turmas.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosReaisTurmas}>
                  <XAxis dataKey="turma" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="left" domain={[0, 20]} stroke="#059669" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#4f46e5" fontSize={10} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="MediaNotas" name="Média Real" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="Assiduidade" name="Assiduidade (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} titulo="Avisos da Direção Escolar" />
      </div>
    </div>
  );
};

/* =========================================================================
   4. SECRETARIA ESCOLAR (Secretaria / ChefeSecretaria / Secretario / SecretarioEscolar)
   ========================================================================= */
export const SecretariaDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  currentUser,
  alunos,
  turmas,
  mensagens,
  recibos,
  configSistema,
  onNavigate
}) => {
  const podeRelatoriosFinanceiros = currentUser.role === 'ChefeSecretaria' || currentUser.role === 'SecretarioEscolar';
  const transacoes = useMemo(() => dbService.getTransacoesFinanceiras(escola.id, escola.anoLectivoActivo), [escola.id, escola.anoLectivoActivo]);
  const anoActivo = escola.anoLectivoActivo || '';
  const alunosAno = anoActivo ? alunos.filter(a => (a.anoLectivo || a.anoMatricula || '') === anoActivo) : alunos;
  const novosIngressos = alunosAno.filter(a => {
    const c = (a.classeId || '').toLowerCase();
    return c.includes('inicia') || c.startsWith('1ª') || c === '1';
  }).length;
  const transferidos = alunos.filter(a => a.estado === 'Transferido').length;
  const propinasOk = alunos.filter(a => a.propinaStatus === 'Regularizada' || a.propinaStatus === 'Isento').length;
  const pctPropinasOk = alunos.length > 0 ? Math.round((propinasOk / alunos.length) * 100) : 0;

  // Distribuição real por ciclo/classe
  const resumoPorClasse = useMemo(() => {
    const mapa: Record<string, { classe: string; total: number; ativos: number }> = {};
    alunosAno.forEach(a => {
      const cls = a.classeId || turmas.find(t => t.id === a.turmaId)?.classe || 'Sem Classe';
      if (!mapa[cls]) mapa[cls] = { classe: cls, total: 0, ativos: 0 };
      mapa[cls].total++;
      if (a.estado === 'Ativo') mapa[cls].ativos++;
    });
    return Object.values(mapa).sort((a, b) => a.classe.localeCompare(b.classe, undefined, { numeric: true }));
  }, [alunosAno, turmas]);

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge={currentUser.cargo || 'Secretaria Escolar'}
        badgeClass="bg-indigo-50 text-indigo-800 border-indigo-200"
        title="Balcão de Atendimento & Serviços Administrativos"
        subtitle="Matrículas e confirmações, emissão de declarações, certificados, passes escolares e registo de emolumentos."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('alunos')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Matrículas & Alunos</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('declaracoes')}
              className="px-3.5 py-2 text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>Emitir Declaração</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('passes_escolares')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Passes Escolares</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pagamentos')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Pagamentos & Recibos</span>
            </button>
            {podeRelatoriosFinanceiros && (
              <button
                type="button"
                onClick={() => onNavigate('relatorios_financeiros')}
                className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <TrendingUp className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Balanço Financeiro</span>
              </button>
            )}
          </>
        }
      />

      {/* PRIORIDADE 1: 4 Indicadores de Balcão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Matriculados ({anoActivo || 'Total'})</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{alunosAno.length}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {alunosAno.filter(a => a.estado === 'Ativo').length} ativos · {turmas.length} turmas
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Novos Ingressos (Inic./1ª)</span>
          <div className="text-2xl font-black text-indigo-700 mt-1 tabular-nums">{novosIngressos}</div>
          <div className="text-[11px] text-slate-500 mt-1">Primeira matrícula no ano letivo</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Recibos & Movimentos</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{Math.max(recibos.length, transacoes.length)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{transferidos} transferência(s) registada(s)</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Propinas Regularizadas</span>
          <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">{pctPropinasOk}%</div>
          <div className="text-[11px] text-slate-500 mt-1">{propinasOk} de {alunos.length} estudantes</div>
        </div>
      </div>

      {/* PRIORIDADE 2: Balcão Rápido de Emissão Documental */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
          <FileText className="h-4 w-4 text-indigo-600" />
          <span>Balcão Rápido de Emissão de Documentos</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { tab: 'declaracoes', title: 'Declarações (c/ ou s/ Notas)', desc: 'Matrícula, frequência ou transferência', icon: FileText },
            { tab: 'certificados', title: 'Certificados de Habilitações', desc: 'Conclusão de ciclo e histórico oficial', icon: FileCheck2 },
            { tab: 'passes_escolares', title: 'Passes Escolares (8 por A4)', desc: 'Impressão com QR Code e foto', icon: CreditCard },
            { tab: 'boletins', title: 'Boletins de Notas (4 por A4)', desc: 'Resumo trimestral por estudante', icon: BookOpen },
            { tab: 'pautas', title: 'Pautas & Listas Nominais', desc: 'Mapas por turma, classe e curso', icon: ClipboardList },
            { tab: 'termos_exame', title: 'Termos de Exame', desc: 'Registos de exame e júri', icon: Award }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="p-3.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-colors cursor-pointer flex items-start space-x-3"
              >
                <Icon className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PRIORIDADE 3: Distribuição Real por Classe + Matrículas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <span>Efetivo Matriculado por Classe (Dados Reais)</span>
            </h3>
            <button type="button" onClick={() => onNavigate('alunos')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Ver Alunos →
            </button>
          </div>
          {resumoPorClasse.length === 0 ? (
            <div className="h-52 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
              Nenhuma matrícula registada no ano letivo selecionado.
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resumoPorClasse}>
                  <XAxis dataKey="classe" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="total" name="Matriculados" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ativos" name="Ativos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
      </div>
    </div>
  );
};

/* =========================================================================
   5. COORDENADOR DE TURNO
   ========================================================================= */
export const CoordenadorTurnoDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  alunos,
  turmas,
  mensagens,
  configSistema,
  dadosAssiduidade,
  resumoAssiduidadeAlunos,
  onNavigate
}) => {
  const turnos = useMemo(() => {
    const mapa: Record<string, { turno: string; turmas: number; alunos: number }> = {
      'Manhã': { turno: 'Manhã', turmas: 0, alunos: 0 },
      'Tarde': { turno: 'Tarde', turmas: 0, alunos: 0 },
      'Noite': { turno: 'Noite', turmas: 0, alunos: 0 }
    };
    turmas.forEach(t => {
      const k = t.turno || 'Manhã';
      if (!mapa[k]) mapa[k] = { turno: k, turmas: 0, alunos: 0 };
      mapa[k].turmas++;
      mapa[k].alunos += alunos.filter(a => a.turmaId === t.id).length;
    });
    return Object.values(mapa);
  }, [turmas, alunos]);

  const horariosHoje = useMemo(() => {
    const dia = getDiaSemanaAtualPt();
    return dbService.obterHorarios(escola.id).filter(h => h.diaSemana === dia);
  }, [escola.id]);

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Coordenação de Turno"
        badgeClass="bg-teal-50 text-teal-800 border-teal-200"
        title={`Supervisão de Turnos & Assiduidade · ${escola.nomeOficial}`}
        subtitle="Controlo diário de chamadas, pontualidade das turmas, horários por turno e ocorrências."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('presencas')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>Fichas de Presenças</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('horarios')}
              className="px-3.5 py-2 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>Horários</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('turnos')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Users className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Turnos & Turmas</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('relatorios')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Relatórios</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Assiduidade Média</span>
          <div className="text-2xl font-black text-teal-700 mt-1 tabular-nums">
            {resumoAssiduidadeAlunos.totalRegistos > 0 ? `${resumoAssiduidadeAlunos.taxaPresencaGeral}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{resumoAssiduidadeAlunos.totalRegistos} chamadas registadas</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Turmas c/ Chamada Hoje</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">
            {resumoAssiduidadeAlunos.turmasComChamadaHoje} / {turmas.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{resumoAssiduidadeAlunos.presentesHoje} presentes hoje</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Faltas Registadas Hoje</span>
          <div className="text-2xl font-black text-rose-700 mt-1 tabular-nums">{resumoAssiduidadeAlunos.faltasHoje}</div>
          <div className="text-[11px] text-slate-500 mt-1">{resumoAssiduidadeAlunos.injustificadasTotal} injustificadas no total</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Tempos Agendados Hoje</span>
          <div className="text-2xl font-black text-blue-700 mt-1 tabular-nums">{horariosHoje.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{getDiaSemanaAtualPt()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            <span>Frequência por Turma (%)</span>
          </h3>
          {dadosAssiduidade.length === 0 ? (
            <div className="h-56 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
              Sem registos de presenças lançados até ao momento.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosAssiduidade}>
                  <XAxis dataKey="turma" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="Presenças" fill="#0d9488" stackId="a" />
                  <Bar dataKey="Justificadas" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="Injustificadas" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">Distribuição por Turno</h3>
            {turnos.map(t => (
              <div key={t.turno} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{t.turno}</div>
                  <div className="text-[11px] text-slate-500">{t.turmas} turma(s)</div>
                </div>
                <span className="font-black text-slate-950 tabular-nums">{t.alunos} alunos</span>
              </div>
            ))}
          </div>
          <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   6. COORDENADOR DE DISCIPLINA
   ========================================================================= */
export const CoordenadorDisciplinaDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  currentUser,
  alunos,
  turmas,
  mensagens,
  configSistema,
  dadosDesempenhoDisciplinas,
  melhoresDisciplinas,
  pioresDisciplinas,
  taxaAprovacaoEscola,
  onNavigate
}) => {
  const mediaGlobalDisciplinas = useMemo(() => {
    if (dadosDesempenhoDisciplinas.length === 0) return null;
    const sum20 = dadosDesempenhoDisciplinas.reduce((acc, d) => acc + (d.escala === 10 ? d.media * 2 : d.media), 0);
    return (sum20 / dadosDesempenhoDisciplinas.length).toFixed(1);
  }, [dadosDesempenhoDisciplinas]);

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Coordenação de Disciplina"
        badgeClass="bg-purple-50 text-purple-800 border-purple-200"
        title={`Coordenação Curricular & Rendimento · ${escola.nomeOficial}`}
        subtitle="Análise de rendimento por disciplina, acompanhamento das pautas e recuperação pedagógica."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('pautas')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>Pautas Trimestrais</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('estatisticas')}
              className="px-3.5 py-2 text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Estatísticas</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('historico_escolar')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Histórico Escolar</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('presencas')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardList className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Presenças</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Disciplinas com Notas</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{dadosDesempenhoDisciplinas.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Monitorizadas no trimestre</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Média Curricular (/20)</span>
          <div className="text-2xl font-black text-purple-700 mt-1 tabular-nums">{mediaGlobalDisciplinas ?? '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1">Normalizada por ciclo</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Aprovação Global</span>
          <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
            {dadosDesempenhoDisciplinas.length > 0 ? `${taxaAprovacaoEscola}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Positivas no ano ativo</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Disciplinas em Atenção</span>
          <div className="text-2xl font-black text-rose-700 mt-1 tabular-nums">{pioresDisciplinas.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Prioridade de acompanhamento</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>Disciplinas com Melhor Aproveitamento</span>
          </h3>
          {melhoresDisciplinas.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Sem notas lançadas até ao momento.
            </div>
          ) : (
            <div className="space-y-2">
              {melhoresDisciplinas.map((d, idx) => (
                <div key={d.nomeCompleto} className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 truncate">{idx + 1}. {d.nomeCompleto}</span>
                  <span className="font-black text-emerald-700 tabular-nums shrink-0">{d.media.toFixed(1)} val. ({d.taxaAprovacao}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-rose-600" />
            <span>Disciplinas que Requerem Recuperação</span>
          </h3>
          {pioresDisciplinas.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Nenhuma disciplina abaixo da meta curricular.
            </div>
          ) : (
            <div className="space-y-2">
              {pioresDisciplinas.map((d, idx) => (
                <div key={d.nomeCompleto} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 truncate">{idx + 1}. {d.nomeCompleto}</span>
                  <span className="font-black text-rose-700 tabular-nums shrink-0">{d.media.toFixed(1)} val. ({d.negativas} neg.)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StudentRankingSection escola={escola} alunos={alunos} turmas={turmas} currentUser={currentUser} />
      <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
    </div>
  );
};

/* =========================================================================
   7. TESOUREIRO
   ========================================================================= */
export const TesoureiroDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  alunos,
  mensagens,
  recibos,
  configSistema,
  onNavigate
}) => {
  const transacoes = useMemo(() => dbService.getTransacoesFinanceiras(escola.id, escola.anoLectivoActivo), [escola.id, escola.anoLectivoActivo]);
  const despesas = useMemo(() => dbService.getDespesasEscolares(escola.id, escola.anoLectivoActivo), [escola.id, escola.anoLectivoActivo]);

  const totalReceitas = transacoes.reduce((acc, t) => acc + (t.valorTotalKz || t.valorKz || 0), 0);
  const totalDespesas = despesas.reduce((acc, d) => acc + (d.valorKz || 0), 0);
  const saldo = totalReceitas - totalDespesas;
  const devedores = alunos.filter(a => a.propinaStatus === 'Pendente');

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Tesouraria Escolar"
        badgeClass="bg-emerald-50 text-emerald-800 border-emerald-200"
        title={`Controlo de Caixa & Emolumentos · ${escola.nomeOficial}`}
        subtitle="Recebimento de propinas, emissão de recibos oficiais, despesas autorizadas e acompanhamento de dívidas."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('pagamentos')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>Registar Pagamento</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('relatorios_financeiros')}
              className="px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Relatórios Financeiros</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('patrimonio')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Boxes className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Património</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Total Arrecadado</span>
          <div className="text-xl font-black text-emerald-700 mt-1 font-mono tabular-nums">{totalReceitas.toLocaleString('pt-AO')} Kz</div>
          <div className="text-[11px] text-slate-500 mt-1">{transacoes.length} cobranças</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Despesas Registadas</span>
          <div className="text-xl font-black text-rose-700 mt-1 font-mono tabular-nums">{totalDespesas.toLocaleString('pt-AO')} Kz</div>
          <div className="text-[11px] text-slate-500 mt-1">{despesas.length} lançamentos</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Saldo em Caixa</span>
          <div className="text-xl font-black text-slate-950 mt-1 font-mono tabular-nums">{saldo.toLocaleString('pt-AO')} Kz</div>
          <div className="text-[11px] text-slate-500 mt-1">Balanço corrente</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Propinas Pendentes</span>
          <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{devedores.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Estudantes por regularizar</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Últimos Recibos & Cobranças</h3>
            <button type="button" onClick={() => onNavigate('pagamentos')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Ver Caixa →
            </button>
          </div>
          {transacoes.length === 0 && recibos.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Sem recibos emitidos neste ano letivo.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {(transacoes.length > 0 ? transacoes.slice(0, 6) : recibos.slice(0, 6)).map((item: any) => (
                <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{item.alunoNome}</div>
                    <div className="text-[10px] text-slate-500">{item.numeroRecibo} · {item.tipo || item.mesReferencia || 'Propina'}</div>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 tabular-nums shrink-0 ml-2">
                    {Number(item.valorTotalKz || item.valorKz || item.valorPagoKz || 0).toLocaleString('pt-AO')} Kz
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
      </div>
    </div>
  );
};

/* =========================================================================
   8. BIBLIOTECÁRIO
   ========================================================================= */
export const BibliotecarioDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  mensagens,
  configSistema,
  onNavigate
}) => {
  const livros = useMemo(() => dbService.getBiblioteca().filter(b => b.escolaId === escola.id), [escola.id]);
  const acessos = useMemo(() => dbService.getAcessosBiblioteca(escola.id), [escola.id]);
  const categoriasCount = new Set(livros.map(l => l.categoria).filter(Boolean)).size;
  const emprestimos = acessos.filter(a => a.tipoAcesso === 'Emprestimo_Livro').length;

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Biblioteca Escolar"
        badgeClass="bg-amber-50 text-amber-800 border-amber-200"
        title={`Acervo & Leitura · ${escola.nomeOficial}`}
        subtitle="Gestão de livros e materiais pedagógicos digitais, registo de empréstimos e consultas dos estudantes."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('biblioteca')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Library className="h-4 w-4 shrink-0" />
              <span>Abrir Biblioteca</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('horarios')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Clock className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Horários</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('comunicacao')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Bell className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Comunicados</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Obras no Acervo</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{livros.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{categoriasCount} área(s) temáticas</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Acessos & Consultas</span>
          <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{acessos.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{emprestimos} empréstimo(s) registado(s)</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Comunicados Recentes</span>
          <div className="text-2xl font-black text-blue-700 mt-1 tabular-nums">{mensagens.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Avisos escolares recebidos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Documentos & Livros Recentes</h3>
            <button type="button" onClick={() => onNavigate('biblioteca')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Gerir Acervo →
            </button>
          </div>
          {livros.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Nenhum livro ou documento carregado na biblioteca escolar.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {livros.slice(0, 5).map(l => (
                <div key={l.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{l.titulo}</div>
                    <div className="text-[10px] text-slate-500">{l.autor} · {l.categoria}</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">{l.classe || 'Geral'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
      </div>
    </div>
  );
};

/* =========================================================================
   9. ESTAGIÁRIO
   ========================================================================= */
export const EstagiarioDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  currentUser,
  mensagens,
  configSistema,
  resumoAssiduidadeAlunos,
  onNavigate
}) => {
  const horarios = useMemo(() => dbService.obterHorarios(escola.id), [escola.id]);
  const diaHoje = getDiaSemanaAtualPt();
  const aulasHoje = horarios.filter(h => h.diaSemana === diaHoje);

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Estágio Pedagógico / Administrativo"
        badgeClass="bg-sky-50 text-sky-800 border-sky-200"
        title={`Bem-vindo(a), ${currentUser.nomeCompleto}`}
        subtitle="Acompanhamento de horários escolares, apoio às chamadas diárias, calendário e comunicados."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('horarios')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>Horários</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('presencas')}
              className="px-3.5 py-2 text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>Fichas de Presenças</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('calendario_escolar')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Calendário Escolar</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Aulas Hoje ({diaHoje})</span>
          <div className="text-2xl font-black text-sky-700 mt-1 tabular-nums">{aulasHoje.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{horarios.length} tempos semanais na escola</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Chamadas Registadas Hoje</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{resumoAssiduidadeAlunos.turmasComChamadaHoje}</div>
          <div className="text-[11px] text-slate-500 mt-1">{resumoAssiduidadeAlunos.presentesHoje} presenças registadas</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Avisos Recebidos</span>
          <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{mensagens.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Comunicação institucional</div>
        </div>
      </div>

      <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
    </div>
  );
};

/* =========================================================================
   10. TÉCNICO DE TI
   ========================================================================= */
export const TecnicoTIDashboard: React.FC<SharedRoleDashboardProps> = ({
  escola,
  funcionarios,
  mensagens,
  configSistema,
  usuariosOnline,
  usuarios24Horas,
  statusBanco,
  onNavigate,
  onOpenUsuariosModal
}) => {
  const contasSuspensas = funcionarios.filter(f => f.statusConta === 'Suspensa' || !f.ativo).length;
  const solicitacoesApoio = useMemo(
    () => dbService.getSolicitacoesApoioTecnico(escola.id),
    [escola.id]
  );
  const apoioAberto = solicitacoesApoio.filter(s => {
    const st = String(s.status || s.estado || '').toLowerCase();
    return st === 'aberto' || st === 'pendente' || st === 'em_atendimento';
  }).length;
  const logsRecentes = useMemo(
    () => dbService.getAuditoria().filter(l => l.escolaId === escola.id).slice(0, 6),
    [escola.id]
  );

  return (
    <div className="space-y-6">
      <RoleHeaderCard
        badge="Tecnologias de Informação (DTI)"
        badgeClass="bg-slate-100 text-slate-800 border-slate-300"
        title={`Infraestrutura, Contas & Segurança · ${escola.nomeOficial}`}
        subtitle="Gestão de credenciais RBAC, cópias de segurança, sincronização offline-first e auditoria criptográfica."
        configSistema={configSistema}
        escola={escola}
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('usuarios_perfis')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <UserCog className="h-4 w-4 shrink-0" />
              <span>Usuários & Perfis</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('apoio_tecnico')}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LifeBuoy className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Apoio Técnico DTI</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('backup_restauro')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Database className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Backup & Restauro</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('auditoria_logs')}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Auditoria AES-256</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Sessões Online / 24h</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-950 tabular-nums">{usuariosOnline.length}</span>
            <span className="text-xs text-slate-500 tabular-nums">/ {usuarios24Horas.length} em 24h</span>
          </div>
          <button type="button" onClick={onOpenUsuariosModal} className="text-[11px] font-bold text-blue-700 hover:underline mt-1 cursor-pointer">
            Auditar sessões →
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Contas de Utilizador</span>
          <div className="text-2xl font-black text-slate-950 mt-2 tabular-nums">{funcionarios.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{contasSuspensas} suspensa(s) / inativa(s)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Armazenamento Local</span>
          <div className="text-2xl font-black text-indigo-700 mt-2 font-mono tabular-nums">{statusBanco.tamanhoFormatado}</div>
          <div className="text-[11px] text-slate-500 mt-1">{statusBanco.totalRegistos} registos em cache offline</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600">Chamados Apoio DTI</span>
          <div className={`text-2xl font-black mt-2 tabular-nums ${apoioAberto > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {apoioAberto}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{solicitacoesApoio.length} total registado</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Server className="h-4 w-4 text-indigo-600" />
              <span>Registos Recentes de Auditoria</span>
            </h3>
            <button type="button" onClick={() => onNavigate('auditoria_logs')} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Ver Logs →
            </button>
          </div>
          {logsRecentes.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Sem registos de auditoria nesta escola.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {logsRecentes.map(l => (
                <div key={l.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{l.acao}</div>
                    <div className="text-[10px] text-slate-500 truncate">{l.utilizadorNome || l.usuarioNome} · {l.detalhe || l.detalhes}</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{(l.dataHora || '').slice(0, 16)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <RecentNoticesCard mensagens={mensagens} onNavigateComunicacao={() => onNavigate('comunicacao')} />
      </div>
    </div>
  );
};
