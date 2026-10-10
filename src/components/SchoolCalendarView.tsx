import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  Award, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Flag, 
  BookOpen, 
  Users, 
  ChevronRight, 
  X, 
  Sparkles,
  Layers,
  MapPin
} from 'lucide-react';
import { Escola, Funcionario } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument } from '../utils/curriculoAngola';
import { dbService } from '../services/storage';

export interface EventoCalendarioEscolar {
  id: string;
  titulo: string;
  tipo: 'Avaliação' | 'Feriado' | 'Pausa Pedagógica' | 'Conselho' | 'Matrícula' | 'Institucional';
  trimestre: '1' | '2' | '3' | 'Geral';
  dataInicio: string;
  dataFim?: string;
  descricao: string;
  obrigatorioMED: boolean;
  publicoAlvo: 'Geral' | 'Professores' | 'Alunos' | 'Encarregados';
}

interface SchoolCalendarViewProps {
  escola: Escola;
  currentUser: Funcionario;
}

export const SchoolCalendarView: React.FC<SchoolCalendarViewProps> = ({
  escola,
  currentUser
}) => {
  const [trimestreSelecionado, setTrimestreSelecionado] = useState<'TODOS' | '1' | '2' | '3'>('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [termoBusca, setTermoBusca] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const notificar = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const [eventos, setEventos] = useState<EventoCalendarioEscolar[]>(() => {
    const salvos = localStorage.getItem(`sge_calendario_${escola.id}`);
    if (salvos) {
      try { return JSON.parse(salvos); } catch {}
    }
    const ano = escola.anoLectivoActivo.split('/')[0] || '2025';
    const anoSeguinte = escola.anoLectivoActivo.split('/')[1] || '2026';

    return [
      // 1º Trimestre
      {
        id: 'cal-01',
        titulo: 'Abertura Oficial do Ano Letivo & Início das Aulas',
        tipo: 'Institucional',
        trimestre: '1',
        dataInicio: `${ano}-09-02`,
        dataFim: `${ano}-09-02`,
        descricao: 'Acolhimento solene aos estudantes, conferência inaugural e início das atividades letivas em todos os turnos.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-02',
        titulo: 'Dia do Fundador da Nação e dos Heróis Nacionais (Feriado)',
        tipo: 'Feriado',
        trimestre: '1',
        dataInicio: `${ano}-09-17`,
        dataFim: `${ano}-09-17`,
        descricao: 'Comemoração oficial do aniversário do Dr. António Agostinho Neto (Tolerância de Ponto / Feriado Nacional).',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-03',
        titulo: 'Semana de Realização das Provas do Professor (NPP1)',
        tipo: 'Avaliação',
        trimestre: '1',
        dataInicio: `${ano}-10-21`,
        dataFim: `${ano}-10-25`,
        descricao: 'Aplicação das primeiras avaliações somativas com calendário afixado por disciplina.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-04',
        titulo: 'Dia de Todos os Santos e Finados (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '1',
        dataInicio: `${ano}-11-02`,
        dataFim: `${ano}-11-02`,
        descricao: 'Celebração cívica e religiosa nacional.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-05',
        titulo: 'Dia da Independência Nacional de Angola (50 Anos)',
        tipo: 'Feriado',
        trimestre: '1',
        dataInicio: `${ano}-11-11`,
        dataFim: `${ano}-11-11`,
        descricao: 'Jubileu dos 50 anos da Proclamação da Independência da República de Angola.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-06',
        titulo: 'Provas Trimestrais do Iº Trimestre (NPT1)',
        tipo: 'Avaliação',
        trimestre: '1',
        dataInicio: `${ano}-12-02`,
        dataFim: `${ano}-12-09`,
        descricao: 'Provas oficiais unificadas de fim de trimestre para cálculo da Média Trimestral (MT1).',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-07',
        titulo: 'Conselho de Notas & Pausa Pedagógica do Iº Trimestre',
        tipo: 'Pausa Pedagógica',
        trimestre: '1',
        dataInicio: `${ano}-12-16`,
        dataFim: `${anoSeguinte}-01-03`,
        descricao: 'Reunião de professores de turma, lançamento de notas e pausa natalícia/ano novo.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      // 2º Trimestre
      {
        id: 'cal-08',
        titulo: 'Reinício das Aulas do IIº Trimestre',
        tipo: 'Institucional',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-01-05`,
        dataFim: `${anoSeguinte}-01-05`,
        descricao: 'Arranque regular do 2º trimestre letivo com entrega de boletins do 1º trimestre.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-09',
        titulo: 'Dia do Início da Luta Armada de Libertação Nacional (Feriado)',
        tipo: 'Feriado',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-02-04`,
        dataFim: `${anoSeguinte}-02-04`,
        descricao: 'Comemoração dos heróis do 4 de Fevereiro.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-10',
        titulo: 'Provas do Professor do IIº Trimestre (NPP2)',
        tipo: 'Avaliação',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-02-16`,
        dataFim: `${anoSeguinte}-02-20`,
        descricao: 'Avaliações contínuas intermediárias do 2º trimestre.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-11',
        titulo: 'Dia Internacional da Mulher (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-03-08`,
        dataFim: `${anoSeguinte}-03-08`,
        descricao: 'Celebração e reflexão sobre o papel da mulher angolana.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-12',
        titulo: 'Provas Trimestrais do IIº Trimestre (NPT2)',
        tipo: 'Avaliação',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-03-23`,
        dataFim: `${anoSeguinte}-03-28`,
        descricao: 'Provas trimestrais oficiais e cálculo das médias MT2.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-13',
        titulo: 'Dia da Paz e da Reconciliação Nacional (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '2',
        dataInicio: `${anoSeguinte}-04-04`,
        dataFim: `${anoSeguinte}-04-04`,
        descricao: 'Comemoração histórica dos acordos de paz em Angola.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      // 3º Trimestre
      {
        id: 'cal-14',
        titulo: 'Início das Aulas do IIIº Trimestre',
        tipo: 'Institucional',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-04-07`,
        dataFim: `${anoSeguinte}-04-07`,
        descricao: 'Última etapa curricular decisiva do ano letivo.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-15',
        titulo: 'Dia Internacional do Trabalhador (Feriado Nacional)',
        tipo: 'Feriado',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-05-01`,
        dataFim: `${anoSeguinte}-05-01`,
        descricao: 'Feriado comemorativo dos direitos do trabalhador.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-16',
        titulo: 'Provas Trimestrais do IIIº Trimestre (NPT3)',
        tipo: 'Avaliação',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-06-08`,
        dataFim: `${anoSeguinte}-06-15`,
        descricao: 'Realização das provas trimestrais finais e apuramento dos alunos aprovados antes do exame/júri.',
        obrigatorioMED: true,
        publicoAlvo: 'Alunos'
      },
      {
        id: 'cal-17',
        titulo: 'Provas de Exames Nacionais & Sessões das Comissões de Júri',
        tipo: 'Avaliação',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-06-22`,
        dataFim: `${anoSeguinte}-07-04`,
        descricao: 'Realização dos exames de ciclo (6ª, 9ª, 12ª, 13ª Classes) e deliberações oficiais com atas de júri.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-18',
        titulo: 'Publicação Oficial das Pautas Gerais de Fim de Ano & Encerramento',
        tipo: 'Conselho',
        trimestre: '3',
        dataInicio: `${anoSeguinte}-07-10`,
        dataFim: `${anoSeguinte}-07-10`,
        descricao: 'Afixação solene das pautas homologadas e emissão de certificados de conclusão de ciclo.',
        obrigatorioMED: true,
        publicoAlvo: 'Geral'
      },
      {
        id: 'cal-19',
        titulo: 'Período Oficial de Matrículas e Confirmações para o Próximo Ano',
        tipo: 'Matrícula',
        trimestre: 'Geral',
        dataInicio: `${anoSeguinte}-07-20`,
        dataFim: `${anoSeguinte}-08-10`,
        descricao: 'Inscrição de novos discentes e confirmação presencial/online na Secretaria Escolar.',
        obrigatorioMED: true,
        publicoAlvo: 'Encarregados'
      }
    ];
  });

  // Modal Novo Evento
  const [showNovoEventoModal, setShowNovoEventoModal] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTipo, setNovoTipo] = useState<EventoCalendarioEscolar['tipo']>('Avaliação');
  const [novoTrimestre, setNovoTrimestre] = useState<EventoCalendarioEscolar['trimestre']>('1');
  const [novaDataInicio, setNovaDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [novaDataFim, setNovaDataFim] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoPublico, setNovoPublico] = useState<EventoCalendarioEscolar['publicoAlvo']>('Geral');

  const handleSalvarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !novaDataInicio) {
      alert('Preencha o título e a data de início do evento.');
      return;
    }

    const novo: EventoCalendarioEscolar = {
      id: `cal-evt-${Date.now()}`,
      titulo: novoTitulo.trim(),
      tipo: novoTipo,
      trimestre: novoTrimestre,
      dataInicio: novaDataInicio,
      dataFim: novaDataFim || undefined,
      descricao: novaDescricao.trim() || 'Evento agendado no calendário institucional da escola.',
      obrigatorioMED: false,
      publicoAlvo: novoPublico
    };

    const atualizados = [...eventos, novo].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
    setEventos(atualizados);
    localStorage.setItem(`sge_calendario_${escola.id}`, JSON.stringify(atualizados));
    dbService.registarLog('Calendário Escolar', `Novo evento agendado: "${novo.titulo}" para ${novo.dataInicio}.`);
    setShowNovoEventoModal(false);
    setNovoTitulo('');
    setNovaDescricao('');
    notificar(`Evento "${novo.titulo}" averbado no calendário oficial.`);
  };

  const handleImprimirCalendarioA4 = () => {
    const html = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>Calendário Escolar Oficial - ${escola.nomeOficial}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; line-height: 1.4; font-size: 10pt; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
          .insignia { width: 55px; height: 55px; margin: 0 auto 5px; }
          .gov { font-size: 9pt; font-weight: bold; text-transform: uppercase; margin: 1px 0; color: #333; }
          .inst { font-size: 12pt; font-weight: 900; text-transform: uppercase; margin: 4px 0; color: #1e3a8a; }
          .sub { font-size: 10pt; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8.5pt; }
          th { background-color: #1e3a8a; color: #fff; padding: 6px 8px; text-align: left; text-transform: uppercase; font-size: 8pt; border: 1px solid #1e3a8a; }
          td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; }
          .badge-av { background-color: #dbeafe; color: #1e40af; }
          .badge-fer { background-color: #fee2e2; color: #991b1b; }
          .badge-pausa { background-color: #fef3c7; color: #92400e; }
          .badge-inst { background-color: #e0e7ff; color: #3730a3; }
          .badge-mat { background-color: #d1fae5; color: #065f46; }
          .footer { margin-top: 25px; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
          .sign-grid { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
          .sign-box { border-top: 1px solid #000; padding-top: 4px; font-size: 9pt; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="insignia">${InsigniaAngola}</div>
          <div class="gov">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</div>
          <div class="gov">GOVERNO PROVINCIAL • GABINETE DA EDUCAÇÃO</div>
          <div class="inst">${escola.nomeOficial}</div>
          <div class="sub">CALENDÁRIO ESCOLAR OFICIAL • ANO LECTIVO ${escola.anoLectivoActivo}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Período / Data</th>
              <th style="width: 12%;">Trimestre</th>
              <th style="width: 15%;">Tipo</th>
              <th style="width: 33%;">Atividade / Marco Normativo</th>
              <th style="width: 25%;">Descrição Operacional</th>
            </tr>
          </thead>
          <tbody>
            ${eventos.map(e => `
              <tr>
                <td><strong>${new Date(e.dataInicio).toLocaleDateString('pt-AO')}</strong>${e.dataFim ? ` a ${new Date(e.dataFim).toLocaleDateString('pt-AO')}` : ''}</td>
                <td>${e.trimestre === 'Geral' ? 'Ano Todo' : `${e.trimestre}º Trimestre`}</td>
                <td>
                  <span class="badge ${
                    e.tipo === 'Avaliação' ? 'badge-av' :
                    e.tipo === 'Feriado' ? 'badge-fer' :
                    e.tipo === 'Pausa Pedagógica' ? 'badge-pausa' :
                    e.tipo === 'Matrícula' ? 'badge-mat' : 'badge-inst'
                  }">
                    ${e.tipo}
                  </span>
                </td>
                <td><strong>${e.titulo}</strong></td>
                <td>${e.descricao}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="sign-grid">
          <div class="sign-box">
            ${escola.diretorGeralNome || 'Diretor Geral'}<br/>
            <span style="font-size: 8pt; font-weight: normal;">Diretor Geral da Instituição</span>
          </div>
          <div class="sign-box">
            ${escola.subdiretorPedagogicoNome || 'Subdiretor Pedagógico'}<br/>
            <span style="font-size: 8pt; font-weight: normal;">Subdiretor Pedagógico</span>
          </div>
        </div>

        <div class="footer">
          Documento oficial homologado pela Direção Geral da Instituição conforme o Despacho do Ministério da Educação (MED).
        </div>
      </body>
      </html>
    `;
    downloadHtmlDocument(
      `Calendario_Escolar_${escola.anoLectivoActivo.replace(/[\/\s]/g, '_')}.html`,
      `Calendário Escolar Oficial - ${escola.nomeOficial}`,
      html
    );
    notificar('Calendário Escolar Oficial A4 descarregado com sucesso.');
  };

  const eventosFiltrados = eventos.filter(e => {
    const matchTrim = trimestreSelecionado === 'TODOS' || e.trimestre === trimestreSelecionado;
    const matchTipo = tipoFiltro === 'TODOS' || e.tipo === tipoFiltro;
    const matchBusca = e.titulo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      e.descricao.toLowerCase().includes(termoBusca.toLowerCase());
    return matchTrim && matchTipo && matchBusca;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Banner Oficial do Calendário MED */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Cronograma Oficial • Ministério da Educação (MED)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Calendário Escolar Oficial {escola.anoLectivoActivo}
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
              Estrutura curricular unificada dos Iº, IIº e IIIº Trimestres: Provas do Professor, Provas Trimestrais, Exames de Ciclo, Conselhos de Turma e Feriados Nacionais de Angola.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-blue-200">
              <span>Trimestre Ativo: <strong className="text-amber-400">{escola.trimestreActivo}º Trimestre</strong></span>
              <span>•</span>
              <span>Instituição: <strong className="text-white">{escola.nomeOficial}</strong></span>
              <span>•</span>
              <span>Total de Marcos Registados: <strong className="text-white">{eventos.length}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowNovoEventoModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Marco Escolar</span>
            </button>
            <button
              onClick={handleImprimirCalendarioA4}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Calendário A4</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cartões dos 3 Trimestres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Iº Trimestre */}
        <div className={`p-5 rounded-2xl border transition-all ${
          escola.trimestreActivo === '1'
            ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-2 ring-blue-500/20'
            : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-blue-900 tracking-wider">Iº Trimestre Letivo</span>
            {escola.trimestreActivo === '1' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-700 text-white">
                Em Curso
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">Setembro a Dezembro</p>
          <ul className="text-xs text-gray-600 space-y-1 mt-3">
            <li>• Provas do Professor (NPP1): Outubro</li>
            <li>• Provas Trimestrais (NPT1): Dezembro</li>
            <li>• Feriados: 17 Setembro & 11 Novembro</li>
          </ul>
        </div>

        {/* IIº Trimestre */}
        <div className={`p-5 rounded-2xl border transition-all ${
          escola.trimestreActivo === '2'
            ? 'bg-indigo-50/70 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
            : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-indigo-900 tracking-wider">IIº Trimestre Letivo</span>
            {escola.trimestreActivo === '2' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-700 text-white">
                Em Curso
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">Janeiro a Março</p>
          <ul className="text-xs text-gray-600 space-y-1 mt-3">
            <li>• Provas do Professor (NPP2): Fevereiro</li>
            <li>• Provas Trimestrais (NPT2): Março</li>
            <li>• Feriados: 4 Fevereiro & 8 Março</li>
          </ul>
        </div>

        {/* IIIº Trimestre */}
        <div className={`p-5 rounded-2xl border transition-all ${
          escola.trimestreActivo === '3'
            ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-2 ring-amber-500/20'
            : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-amber-900 tracking-wider">IIIº Trimestre Letivo</span>
            {escola.trimestreActivo === '3' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-700 text-white">
                Em Curso
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">Abril a Julho</p>
          <ul className="text-xs text-gray-600 space-y-1 mt-3">
            <li>• Provas Trimestrais (NPT3): Junho</li>
            <li>• Exames de Ciclo & Júri: Junho/Julho</li>
            <li>• Feriados: 4 Abril & 1 Maio</li>
          </ul>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar evento, feriado ou avaliação..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
            {(['TODOS', '1', '2', '3'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTrimestreSelecionado(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  trimestreSelecionado === t
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t === 'TODOS' ? 'Todos Trimestres' : `${t}º Trim.`}
              </button>
            ))}
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="Avaliação">Avaliações & Provas</option>
            <option value="Feriado">Feriados Nacionais</option>
            <option value="Pausa Pedagógica">Pausas Pedagógicas</option>
            <option value="Conselho">Conselhos de Notas</option>
            <option value="Matrícula">Matrículas</option>
            <option value="Institucional">Institucional</option>
          </select>
        </div>
      </div>

      {/* Lista / Timeline de Marcos do Calendário */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
          <span>Cronograma Oficial • {eventosFiltrados.length} Registos Listados</span>
          <span>Ano Letivo: {escola.anoLectivoActivo}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {eventosFiltrados.map((evt) => (
            <div
              key={evt.id}
              className="p-5 hover:bg-blue-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-2xl shrink-0 ${
                  evt.tipo === 'Avaliação' ? 'bg-blue-100 text-blue-800' :
                  evt.tipo === 'Feriado' ? 'bg-red-100 text-red-800' :
                  evt.tipo === 'Pausa Pedagógica' ? 'bg-amber-100 text-amber-800' :
                  evt.tipo === 'Matrícula' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {evt.tipo === 'Avaliação' ? <Award className="h-5 w-5" /> :
                   evt.tipo === 'Feriado' ? <Flag className="h-5 w-5" /> :
                   evt.tipo === 'Matrícula' ? <Users className="h-5 w-5" /> : <CalendarIcon className="h-5 w-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-gray-900">{evt.titulo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      evt.tipo === 'Avaliação' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      evt.tipo === 'Feriado' ? 'bg-red-50 text-red-700 border border-red-200' :
                      evt.tipo === 'Pausa Pedagógica' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      evt.tipo === 'Matrícula' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {evt.tipo}
                    </span>
                    {evt.obrigatorioMED && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        Obrigatório MED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                    {evt.descricao}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500">
                    <span>Trimestre: <strong>{evt.trimestre === 'Geral' ? 'Anual' : `${evt.trimestre}º Trimestre`}</strong></span>
                    <span>•</span>
                    <span>Destinatários: <strong>{evt.publicoAlvo}</strong></span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right shrink-0 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <span className="text-xs font-black text-gray-900 block">
                  {new Date(evt.dataInicio).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                {evt.dataFim && (
                  <span className="text-[11px] text-gray-500 block">
                    até {new Date(evt.dataFim).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))}

          {eventosFiltrados.length === 0 && (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <CalendarDays className="h-8 w-8 mx-auto text-gray-400" />
              <p className="font-bold text-sm">Nenhum evento localizado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NOVO EVENTO */}
      {showNovoEventoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Novo Marco no Calendário Escolar</h3>
                  <p className="text-xs text-gray-500">Agendar evento letivo, feriado ou semana de provas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNovoEventoModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEvento} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Título do Evento / Atividade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Feira de Ciências e Projetos Tecnológicos"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo de Evento *</label>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Avaliação">Avaliação / Provas</option>
                    <option value="Feriado">Feriado / Tolerância</option>
                    <option value="Pausa Pedagógica">Pausa Pedagógica</option>
                    <option value="Conselho">Conselho de Turma</option>
                    <option value="Matrícula">Matrícula</option>
                    <option value="Institucional">Institucional</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Trimestre Letivo *</label>
                  <select
                    value={novoTrimestre}
                    onChange={(e) => setNovoTrimestre(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="1">1º Trimestre</option>
                    <option value="2">2º Trimestre</option>
                    <option value="3">3º Trimestre</option>
                    <option value="Geral">Ano Inteiro (Geral)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={novaDataInicio}
                    onChange={(e) => setNovaDataInicio(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data de Término (Opcional)</label>
                  <input
                    type="date"
                    value={novaDataFim}
                    onChange={(e) => setNovaDataFim(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Destinatários</label>
                <select
                  value={novoPublico}
                  onChange={(e) => setNovoPublico(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="Geral">Toda a Comunidade Escolar</option>
                  <option value="Professores">Professores</option>
                  <option value="Alunos">Alunos</option>
                  <option value="Encarregados">Encarregados de Educação</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição Operacional</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a realização da atividade..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNovoEventoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Averbar no Calendário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
