import React, { useState } from 'react';
import { 
  ShieldAlert, 
  FileText, 
  Users, 
  Award, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  Lock, 
  Unlock, 
  Building2, 
  Megaphone, 
  TrendingUp, 
  ChevronRight, 
  X, 
  Edit3, 
  FileCheck2, 
  Gavel, 
  BookOpen, 
  DollarSign
} from 'lucide-react';
import { Escola, Funcionario, Turma, Aluno } from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument } from '../utils/curriculoAngola';
import { DelegationsManagementView } from './DelegationsManagementView';

export interface DespachoDirecao {
  id: string;
  escolaId: string;
  numeroDespacho: string; // Ex: "Despacho n.º 014/DG/2025"
  ano: string;
  assunto: string;
  categoria: 'Docente' | 'Discente' | 'Administrativo' | 'Pedagógico' | 'Financeiro' | 'Exames';
  fundamentacaoLegal: string;
  conteudo: string;
  dataEmissao: string;
  assinadoPor: string;
  cargoSignatario: string;
  publicoAlvo: 'Geral' | 'Professores' | 'Alunos' | 'Encarregados' | 'Secretaria';
  status: 'Em Vigor' | 'Revogado' | 'Rascunho';
}

export interface ReuniaoDirecao {
  id: string;
  escolaId: string;
  numeroAta: string; // Ex: "Ata n.º 06/CD/2025"
  tipo: 'Ordinária' | 'Extraordinária' | 'Emergencial';
  data: string;
  hora: string;
  local: string;
  ordemDoDia: string[];
  membrosPresentes: string[];
  deliberacoes: string[];
  estado: 'Concluída' | 'Agendada';
}

interface ExecutiveDirectionViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
  turmas: Turma[];
  alunos: Aluno[];
  onSalvarEscola?: (escola: Escola) => void;
  onNavigate?: (tab: any) => void;
}

export const ExecutiveDirectionView: React.FC<ExecutiveDirectionViewProps> = ({
  escola,
  currentUser,
  funcionarios,
  turmas,
  alunos,
  onSalvarEscola,
  onNavigate
}) => {
  const [subAba, setSubAba] = useState<'painel' | 'despachos' | 'reunioes' | 'comissoes' | 'delegacoes'>('painel');
  const [feedback, setFeedback] = useState<string | null>(null);

  const notificar = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Estado Local de Despachos da Direção
  const [despachos, setDespachos] = useState<DespachoDirecao[]>(() => {
    const salvos = localStorage.getItem(`sge_despachos_${escola.id}`);
    if (salvos) {
      try { return JSON.parse(salvos); } catch {}
    }
    return [];
  });

  // Estado Local de Reuniões do Conselho de Direção
  const [reunioes, setReunioes] = useState<ReuniaoDirecao[]>(() => {
    const salvos = localStorage.getItem(`sge_reunioes_direcao_${escola.id}`);
    if (salvos) {
      try { return JSON.parse(salvos); } catch {}
    }
    return [];
  });

  // Modal Novo Despacho
  const [showNovoDespachoModal, setShowNovoDespachoModal] = useState(false);
  const [novoDespachoNum, setNovoDespachoNum] = useState(`Despacho n.º 0${despachos.length + 1}/DG/${new Date().getFullYear()}`);
  const [novoDespachoAssunto, setNovoDespachoAssunto] = useState('');
  const [novoDespachoCategoria, setNovoDespachoCategoria] = useState<DespachoDirecao['categoria']>('Pedagógico');
  const [novoDespachoPublico, setNovoDespachoPublico] = useState<DespachoDirecao['publicoAlvo']>('Professores');
  const [novoDespachoLegal, setNovoDespachoLegal] = useState('Nos termos da Lei n.º 32/20 (Lei de Bases do Sistema de Educação e Ensino de Angola).');
  const [novoDespachoConteudo, setNovoDespachoConteudo] = useState('');

  // Modal Nova Reunião
  const [showNovaReuniaoModal, setShowNovaReuniaoModal] = useState(false);
  const [novaReuniaoNum, setNovaReuniaoNum] = useState(`Ata n.º 0${reunioes.length + 1}/CD/${new Date().getFullYear()}`);
  const [novaReuniaoTipo, setNovaReuniaoTipo] = useState<ReuniaoDirecao['tipo']>('Ordinária');
  const [novaReuniaoData, setNovaReuniaoData] = useState(new Date().toISOString().split('T')[0]);
  const [novaReuniaoHora, setNovaReuniaoHora] = useState('10:00');
  const [novaReuniaoLocal, setNovaReuniaoLocal] = useState('Sala de Reuniões da Direção');
  const [novaReuniaoOrdem, setNovaReuniaoOrdem] = useState('1. Avaliação do rendimento escolar trimestral\n2. Disciplina e conduta discente\n3. Previsão orçamental');
  const [novaReuniaoDelib, setNovaReuniaoDelib] = useState('1. Aprovação das diretrizes pedagógicas para o trimestre seguinte.\n2. Fixação de calendário de atendimento aos encarregados.');

  // Modal Visualizar / Imprimir Despacho
  const [despachoVisualizado, setDespachoVisualizado] = useState<DespachoDirecao | null>(null);
  const [reuniaoVisualizada, setReuniaoVisualizada] = useState<ReuniaoDirecao | null>(null);

  // Filtros
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');

  // Ações de Decisão Executiva Rápida (Diretor Geral)
  const handleToggleMatriculas = () => {
    const novoEstado = escola.matriculasAbertas === false;
    const atualizada = { ...escola, matriculasAbertas: novoEstado };
    dbService.salvarEscola(atualizada);
    if (onSalvarEscola) onSalvarEscola(atualizada);
    dbService.registarLog(
      'Direção Geral',
      `O Diretor Geral ${currentUser.nomeCompleto} ${novoEstado ? 'ABRIU' : 'ENCERROU'} as matrículas e confirmações.`
    );
    notificar(`Período de Matrículas e Confirmações ${novoEstado ? 'ABERTO' : 'ENCERRADO'} com sucesso.`);
  };

  const handleToggleLancamentoNotas = () => {
    const novoEstado = escola.lancamentoNotasAberto === false;
    const atualizada = { ...escola, lancamentoNotasAberto: novoEstado };
    dbService.salvarEscola(atualizada);
    if (onSalvarEscola) onSalvarEscola(atualizada);
    dbService.registarLog(
      'Direção Geral',
      `O Diretor Geral ${currentUser.nomeCompleto} ${novoEstado ? 'DESBLOQUEOU' : 'BLOQUEOU'} o lançamento de notas pelos professores.`
    );
    notificar(`Janela de Lançamento de Notas dos Professores ${novoEstado ? 'DESBLOQUEADA' : 'BLOQUEADA'}.`);
  };

  const handleToggleEmissaoPasses = () => {
    const novoEstado = escola.emissaoPassesAtiva === false;
    const atualizada = { ...escola, emissaoPassesAtiva: novoEstado };
    dbService.salvarEscola(atualizada);
    if (onSalvarEscola) onSalvarEscola(atualizada);
    dbService.registarLog(
      'Direção Geral',
      `Emissão de passes escolares ${novoEstado ? 'ATIVADA' : 'DESATIVADA'} pela Direção Geral.`
    );
    notificar(`Emissão de Passes Escolares com QR Code ${novoEstado ? 'ATIVADA' : 'DESATIVADA'}.`);
  };

  const handleToggleBoletimPortal = () => {
    const novoEstado = escola.permitirBoletimNoPortalEncarregado !== true;
    const atualizada = { ...escola, permitirBoletimNoPortalEncarregado: novoEstado };
    dbService.salvarEscola(atualizada);
    if (onSalvarEscola) onSalvarEscola(atualizada);
    dbService.registarLog(
      'Direção Geral',
      `Visualização de boletins no Portal do Encarregado ${novoEstado ? 'PERMITIDA' : 'BLOQUEADA'} pelo Diretor Geral.`
    );
    notificar(`Boletim de notas no Portal do Encarregado ${novoEstado ? 'PERMITIDO' : 'BLOQUEADO'} com sucesso.`);
  };

  const handleSelectTrimestreBoletimPortal = (trim: '1' | '2' | '3' | 'todos') => {
    const atualizada = { ...escola, trimestreBoletimPortal: trim };
    dbService.salvarEscola(atualizada);
    if (onSalvarEscola) onSalvarEscola(atualizada);
    dbService.registarLog(
      'Direção Geral',
      `Trimestre de visualização no Portal do Encarregado configurado para: ${trim === 'todos' ? 'Todos os Trimestres' : trim + 'º Trimestre'}.`
    );
    notificar(`Boletim do Encarregado: visualização definida para ${trim === 'todos' ? 'Todos os Trimestres' : trim + 'º Trimestre'}.`);
  };

  const handleSalvarDespacho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoDespachoAssunto.trim() || !novoDespachoConteudo.trim()) {
      alert('Preencha o assunto e o conteúdo normativo do despacho.');
      return;
    }

    const novo: DespachoDirecao = {
      id: `desp-${Date.now()}`,
      escolaId: escola.id,
      numeroDespacho: novoDespachoNum.trim(),
      ano: escola.anoLectivoActivo,
      assunto: novoDespachoAssunto.trim(),
      categoria: novoDespachoCategoria,
      fundamentacaoLegal: novoDespachoLegal.trim(),
      conteudo: novoDespachoConteudo.trim(),
      dataEmissao: new Date().toISOString().split('T')[0],
      assinadoPor: escola.diretorGeralNome || currentUser.nomeCompleto,
      cargoSignatario: 'Diretor Geral da Instituição',
      publicoAlvo: novoDespachoPublico,
      status: 'Em Vigor'
    };

    const atualizados = [novo, ...despachos];
    setDespachos(atualizados);
    localStorage.setItem(`sge_despachos_${escola.id}`, JSON.stringify(atualizados));
    dbService.registarLog('Direção Geral', `Novo despacho executivo emitido: "${novo.numeroDespacho} - ${novo.assunto}".`);
    setShowNovoDespachoModal(false);
    setNovoDespachoAssunto('');
    setNovoDespachoConteudo('');
    notificar(`Despacho executivo "${novo.numeroDespacho}" promulgado e averbado.`);
  };

  const handleSalvarReuniao = (e: React.FormEvent) => {
    e.preventDefault();
    const ordemArray = novaReuniaoOrdem.split('\n').filter(s => s.trim().length > 0);
    const delibArray = novaReuniaoDelib.split('\n').filter(s => s.trim().length > 0);

    const nova: ReuniaoDirecao = {
      id: `reun-${Date.now()}`,
      escolaId: escola.id,
      numeroAta: novaReuniaoNum.trim(),
      tipo: novaReuniaoTipo,
      data: novaReuniaoData,
      hora: novaReuniaoHora,
      local: novaReuniaoLocal.trim(),
      ordemDoDia: ordemArray.length > 0 ? ordemArray : ['Apreciação de assuntos gerais da escola'],
      membrosPresentes: [
        escola.diretorGeralNome || 'Diretor Geral',
        escola.subdiretorPedagogicoNome || 'Subdiretor Pedagógico',
        'Subdirector Administrativo',
        'Chefe de Secretaria'
      ],
      deliberacoes: delibArray.length > 0 ? delibArray : ['Deliberações homologadas no conselho'],
      estado: 'Concluída'
    };

    const atualizadas = [nova, ...reunioes];
    setReunioes(atualizadas);
    localStorage.setItem(`sge_reunioes_direcao_${escola.id}`, JSON.stringify(atualizadas));
    dbService.registarLog('Direção Geral', `Ata do Conselho de Direção registada: "${nova.numeroAta}".`);
    setShowNovaReuniaoModal(false);
    notificar(`Ata do Conselho de Direção "${nova.numeroAta}" averbada com sucesso.`);
  };

  const handleImprimirDespachoOficial = (desp: DespachoDirecao) => {
    const html = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>${desp.numeroDespacho} - ${escola.nomeOficial}</title>
        <style>
          @page { size: A4; margin: 20mm 20mm 25mm 20mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.5; font-size: 13pt; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 25px; }
          .insignia { width: 70px; height: 70px; margin: 0 auto 8px; }
          .gov { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 2px 0; letter-spacing: 0.5px; }
          .inst { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 5px 0 15px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .title-box { text-align: center; margin: 25px 0 20px; }
          .desp-num { font-size: 14pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-bottom: 6px; }
          .assunto { font-size: 11pt; font-style: italic; margin-bottom: 15px; }
          .legal { font-size: 11pt; text-align: justify; margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #333; }
          .conteudo { text-align: justify; margin: 20px 0; white-space: pre-line; line-height: 1.6; }
          .data-box { text-align: right; margin: 40px 0 30px; font-size: 12pt; }
          .sign-box { margin-top: 50px; text-align: center; }
          .sign-line { width: 320px; border-top: 1px solid #000; margin: 0 auto 5px; }
          .sign-nome { font-weight: bold; font-size: 12pt; text-transform: uppercase; }
          .sign-cargo { font-size: 10.5pt; color: #444; }
          .footer { margin-top: 40px; font-size: 9pt; text-align: center; color: #666; border-top: 1px dashed #999; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="insignia">
            ${InsigniaAngola}
          </div>
          <div class="gov">REPÚBLICA DE ANGOLA</div>
          <div class="gov">GOVERNO PROVINCIAL • MINISTÉRIO DA EDUCAÇÃO</div>
          <div class="inst">${escola.nomeOficial}</div>
        </div>

        <div class="title-box">
          <div class="desp-num">${desp.numeroDespacho}</div>
          <div class="assunto">Assunto: <strong>${desp.assunto}</strong></div>
        </div>

        <div class="legal">
          <strong>Fundamentação de Direito:</strong><br/>
          ${desp.fundamentacaoLegal}
        </div>

        <div class="conteudo">
          ${desp.conteudo}
        </div>

        <div class="data-box">
          Gabinete do Diretor Geral em ${escola.municipio || 'Luanda'}, aos ${new Date(desp.dataEmissao).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}.
        </div>

        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-nome">${desp.assinadoPor}</div>
          <div class="sign-cargo">${desp.cargoSignatario}</div>
        </div>

        <div class="footer">
          Documento expedido oficialmente pela plataforma SGE-NG sob autorização e chancela do Diretor Geral da Instituição.
        </div>
      </body>
      </html>
    `;
    downloadHtmlDocument(`${desp.numeroDespacho.replace(/[\/\s]/g, '_')}.html`, desp.numeroDespacho, html);
    notificar('Despacho oficial descarregado para visualização e impressão.');
  };

  const handleImprimirAtaReuniao = (reun: ReuniaoDirecao) => {
    const html = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>${reun.numeroAta} - Conselho de Direção</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.5; font-size: 12pt; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .insignia { width: 65px; height: 65px; margin: 0 auto 6px; }
          .gov { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 1px 0; }
          .inst { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 5px 0 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
          .title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 20px 0; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; text-transform: uppercase; font-size: 11pt; margin-bottom: 6px; }
          ul, ol { margin: 5px 0; padding-left: 25px; }
          li { margin-bottom: 4px; }
          .sign-grid { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; text-align: center; }
          .sign-box { border-top: 1px solid #000; padding-top: 5px; font-size: 10.5pt; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="insignia">${InsigniaAngola}</div>
          <div class="gov">REPÚBLICA DE ANGOLA</div>
          <div class="gov">MINISTÉRIO DA EDUCAÇÃO</div>
          <div class="inst">${escola.nomeOficial}</div>
        </div>

        <div class="title">${reun.numeroAta} • CONSELHO DE DIREÇÃO</div>

        <div class="section">
          Aos ${new Date(reun.data).toLocaleDateString('pt-AO')}, pelas ${reun.hora}, reuniu-se em sessão ${reun.tipo} o Conselho de Direção da instituição, no(a) ${reun.local}, sob a presidência do Diretor Geral <strong>${escola.diretorGeralNome || currentUser.nomeCompleto}</strong>.
        </div>

        <div class="section">
          <div class="section-title">1. Membros Presentes</div>
          <ul>
            ${reun.membrosPresentes.map(m => `<li>${m}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">2. Ordem de Trabalhos (Pauta da Reunião)</div>
          <ol>
            ${reun.ordemDoDia.map(o => `<li>${o}</li>`).join('')}
          </ol>
        </div>

        <div class="section">
          <div class="section-title">3. Deliberações e Decisões Homologadas</div>
          <ol>
            ${reun.deliberacoes.map(d => `<li>${d}</li>`).join('')}
          </ol>
        </div>

        <div class="section">
          Nada mais havendo a tratar, foi encerrada a sessão da qual se lavrou a presente ata que, após lida e achada conforme, vai ser assinada por todos os membros do Conselho de Direção.
        </div>

        <div class="sign-grid">
          <div class="sign-box">
            ${escola.diretorGeralNome || 'Diretor Geral'}<br/>
            <span style="font-size: 9pt; font-weight: normal;">Diretor Geral / Presidente</span>
          </div>
          <div class="sign-box">
            ${escola.subdiretorPedagogicoNome || 'Subdiretor Pedagógico'}<br/>
            <span style="font-size: 9pt; font-weight: normal;">Subdiretor Pedagógico</span>
          </div>
        </div>
      </body>
      </html>
    `;
    downloadHtmlDocument(`${reun.numeroAta.replace(/[\/\s]/g, '_')}.html`, reun.numeroAta, html);
    notificar('Ata do Conselho de Direção gerada e descarregada com sucesso.');
  };

  const despachosFiltrados = despachos.filter(d => {
    const matchBusca = d.assunto.toLowerCase().includes(termoBusca.toLowerCase()) ||
      d.numeroDespacho.toLowerCase().includes(termoBusca.toLowerCase()) ||
      d.conteudo.toLowerCase().includes(termoBusca.toLowerCase());
    const matchCat = filtroCategoria === 'TODAS' || d.categoria === filtroCategoria;
    return matchBusca && matchCat;
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

      {/* Header Institucional da Direção */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Gabinete Executivo • Presidência & Direção Geral</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {escola.nomeOficial}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Conselho de Direção Executiva: Emissão de Despachos Oficiais, Ordens de Serviço, Atas do Conselho de Direção e Gestão de Governação Escolar.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
              <span>Diretor Geral: <strong className="text-white">{escola.diretorGeralNome || currentUser.nomeCompleto}</strong></span>
              <span>•</span>
              <span>Subdiretora Pedagógica: <strong className="text-white">{escola.subdiretorPedagogicoNome || 'Em exercício'}</strong></span>
              <span>•</span>
              <span>Ano Letivo: <strong className="text-amber-400">{escola.anoLectivoActivo}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowNovoDespachoModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Emitir Novo Despacho</span>
            </button>
            <button
              onClick={() => setShowNovaReuniaoModal(true)}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Averbar Reunião de Direção</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navegação entre Sub-abas */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white p-2 rounded-2xl shadow-xs">
        <button
          onClick={() => setSubAba('painel')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
            subAba === 'painel'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Painel de Governação & Decisão</span>
        </button>

        <button
          onClick={() => setSubAba('despachos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
            subAba === 'despachos'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Despachos & Ordens de Serviço ({despachos.length})</span>
        </button>

        <button
          onClick={() => setSubAba('reunioes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
            subAba === 'reunioes'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Gavel className="h-4 w-4" />
          <span>Conselho de Direção & Atas ({reunioes.length})</span>
        </button>

        <button
          onClick={() => setSubAba('comissoes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
            subAba === 'comissoes'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Comissões Institucionais</span>
        </button>

        <button
          onClick={() => setSubAba('delegacoes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
            subAba === 'delegacoes'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Delegação de Poderes (Matrículas & Cobrança)</span>
        </button>
      </div>

      {/* 1. ABA: PAINEL DE GOVERNAÇÃO & DECISÃO RÁPIDA */}
      {subAba === 'painel' && (
        <div className="space-y-6">
          {/* Indicadores Chave da Direção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Corpo Discente</span>
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{alunos.length} Estudantes</p>
              <span className="text-[11px] text-emerald-700 font-bold block">
                {alunos.filter(a => a.estado === 'Ativo').length} com matrícula ativa
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Corpo Docente & Staff</span>
                <Award className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{funcionarios.length} Colaboradores</p>
              <span className="text-[11px] text-indigo-700 font-bold block">
                {funcionarios.filter(f => f.ehProfessor).length} Professores em exercício
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Turmas Formadas</span>
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{turmas.length} Turmas Ativas</p>
              <span className="text-[11px] text-amber-700 font-bold block">
                Turnos Manhã, Tarde e Noite
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Trimestre Vigente</span>
                <Calendar className="h-5 w-5 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{escola.trimestreActivo}º Trimestre</p>
              <span className="text-[11px] text-rose-700 font-bold block">
                Ano Letivo {escola.anoLectivoActivo}
              </span>
            </div>
          </div>

          {/* Interruptores de Decisão Executiva Imediata */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Ações de Comando & Decisão Executiva Imediata
                  </h3>
                  <p className="text-xs text-gray-500">
                    Controlo centralizado de janelas operacionais escolares sob alçada do Diretor Geral.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                Autonomia Executiva MED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Matrículas */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">Matrículas & Confirmações</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    escola.matriculasAbertas !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {escola.matriculasAbertas !== false ? 'Aberto' : 'Encerrado'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Permite ou veda a inscrição de novos discentes e confirmação no balcão da Secretaria.
                </p>
                <button
                  type="button"
                  onClick={handleToggleMatriculas}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    escola.matriculasAbertas !== false
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {escola.matriculasAbertas !== false ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{escola.matriculasAbertas !== false ? 'Encerrar Matrículas' : 'Abrir Matrículas'}</span>
                </button>
              </div>

              {/* 2. Lançamento de Notas */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">Lançamento de Notas (Professores)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    escola.lancamentoNotasAberto !== false ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {escola.lancamentoNotasAberto !== false ? 'Desbloqueado' : 'Bloqueado'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Quando bloqueado, docentes não podem retificar notas do trimestre sem autorização.
                </p>
                <button
                  type="button"
                  onClick={handleToggleLancamentoNotas}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    escola.lancamentoNotasAberto !== false
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {escola.lancamentoNotasAberto !== false ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{escola.lancamentoNotasAberto !== false ? 'Bloquear Pautas MAC' : 'Desbloquear Lançamento'}</span>
                </button>
              </div>

              {/* 3. Emissão de Passes */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">Emissão de Passes com QR Code</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    escola.emissaoPassesAtiva !== false ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {escola.emissaoPassesAtiva !== false ? 'Ativa' : 'Desativada'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Autorização para geração do lote de 8 cartões A4 com chancela e fotografia do estudante.
                </p>
                <button
                  type="button"
                  onClick={handleToggleEmissaoPasses}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    escola.emissaoPassesAtiva !== false
                      ? 'bg-gray-700 hover:bg-gray-800 text-white shadow-xs'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {escola.emissaoPassesAtiva !== false ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{escola.emissaoPassesAtiva !== false ? 'Suspender Passes' : 'Ativar Emissão de Passes'}</span>
                </button>
              </div>

              {/* 4. Portal dos Encarregados (Boletim de Notas) */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">Boletim no Portal Encarregado</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    escola.permitirBoletimNoPortalEncarregado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {escola.permitirBoletimNoPortalEncarregado ? 'Autorizado' : 'Restrito'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Autoriza a consulta do boletim pelo encarregado e define os trimestres liberados.
                </p>
                <button
                  type="button"
                  onClick={handleToggleBoletimPortal}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    escola.permitirBoletimNoPortalEncarregado
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {escola.permitirBoletimNoPortalEncarregado ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{escola.permitirBoletimNoPortalEncarregado ? 'Suspender Boletim' : 'Liberar no Portal'}</span>
                </button>
                {escola.permitirBoletimNoPortalEncarregado && (
                  <div className="pt-1 border-t border-gray-200">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                      Trimestre Liberado:
                    </label>
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      {(['1', '2', '3', 'todos'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleSelectTrimestreBoletimPortal(t)}
                          className={`py-1 rounded font-bold transition-colors cursor-pointer text-center ${
                            (escola.trimestreBoletimPortal || 'todos') === t
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {t === 'todos' ? 'Todos' : `${t}º Trim`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos para Outros Módulos da Direção */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => onNavigate && onNavigate('comissao_juri')}
              className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-500">Deliberações Finais</span>
                <p className="text-sm font-black text-gray-900">Comissões de Júri de Exame</p>
                <p className="text-[11px] text-gray-500">Acompanhar atas e deliberações oficiais de aprovação</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>

            <div 
              onClick={() => onNavigate && onNavigate('pautas')}
              className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-500">Documentação Oficial</span>
                <p className="text-sm font-black text-gray-900">Pautas Trimestrais Homologadas</p>
                <p className="text-[11px] text-gray-500">Visualizar e homologar pautas gerais por turma</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>

            <div 
              onClick={() => onNavigate && onNavigate('pagamentos')}
              className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-500">Gestão Administrativa</span>
                <p className="text-sm font-black text-gray-900">Balanço Financeiro & Caixa</p>
                <p className="text-[11px] text-gray-500">Consultar arrecadação e despesas institucionais</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* 2. ABA: DESPACHOS & ORDENS DE SERVIÇO */}
      {subAba === 'despachos' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por número, assunto ou texto do despacho..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
              >
                <option value="TODAS">Todas as Categorias</option>
                <option value="Docente">Docente</option>
                <option value="Discente">Discente</option>
                <option value="Pedagógico">Pedagógico</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Exames">Exames</option>
                <option value="Financeiro">Financeiro</option>
              </select>
            </div>

            <button
              onClick={() => setShowNovoDespachoModal(true)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Despacho</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {despachosFiltrados.map((desp) => (
              <div
                key={desp.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 hover:shadow-md transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900">
                        {desp.numeroDespacho}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        {desp.categoria}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {desp.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 pt-1">
                      {desp.assunto}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setDespachoVisualizado(desp)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Ler Detalhes
                    </button>
                    <button
                      onClick={() => handleImprimirDespachoOficial(desp)}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Imprimir A4</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                  {desp.conteudo}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-gray-500 border-t border-gray-50">
                  <span>Signatário: <strong>{desp.assinadoPor}</strong> ({desp.cargoSignatario})</span>
                  <span>Data: <strong>{new Date(desp.dataEmissao).toLocaleDateString('pt-AO')}</strong> • Destinatários: <strong>{desp.publicoAlvo}</strong></span>
                </div>
              </div>
            ))}

            {despachosFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-2">
                <FileText className="h-8 w-8 mx-auto text-gray-400" />
                <p className="font-bold text-sm">Nenhum despacho localizado para os critérios selecionados.</p>
                <p className="text-xs">Utilize o botão "Emitir Novo Despacho" para publicar uma nova ordem executiva.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ABA: REUNIÕES DO CONSELHO DE DIREÇÃO & ATAS */}
      {subAba === 'reunioes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-black text-gray-900">Atas Registadas do Conselho de Direção</h3>
              <p className="text-xs text-gray-500">Histórico de deliberações e atas das sessões ordinárias e extraordinárias.</p>
            </div>
            <button
              onClick={() => setShowNovaReuniaoModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Registar Nova Ata</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {reunioes.map((reun) => (
              <div
                key={reun.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900">
                        {reun.numeroAta}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        Sessão {reun.tipo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {reun.estado}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Data: <strong>{new Date(reun.data).toLocaleDateString('pt-AO')}</strong> às <strong>{reun.hora}</strong> • Local: <strong>{reun.local}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setReuniaoVisualizada(reun)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Ver Ata Completa
                    </button>
                    <button
                      onClick={() => handleImprimirAtaReuniao(reun)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Descarregar Ata A4</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <p className="font-bold text-gray-900 uppercase text-[11px]">Pauta / Ordem de Trabalhos:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                      {reun.ordemDoDia.map((o, idx) => (
                        <li key={idx}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                    <p className="font-bold text-emerald-950 uppercase text-[11px]">Principais Deliberações:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-emerald-900">
                      {reun.deliberacoes.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 pt-1">
                  Membros presentes: {reun.membrosPresentes.join(', ')}
                </div>
              </div>
            ))}

            {reunioes.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-2">
                <Gavel className="h-8 w-8 mx-auto text-gray-400" />
                <p className="font-bold text-sm">Nenhuma ata do conselho de direção registada até o momento.</p>
                <p className="text-xs">Utilize o botão "Registar Nova Ata" para lavrar uma nova deliberação executiva.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ABA: COMISSÕES INSTITUCIONAIS DE TRABALHO */}
      {subAba === 'comissoes' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-3">
            <h3 className="text-base font-black text-gray-900">
              Comissões Internas e Órgãos Consultivos da Instituição
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
              Equipas de trabalho nomeadas pelo Diretor Geral para suporte à governação, disciplina discente, garantia da qualidade pedagógica e segurança escolar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
                <h4 className="text-sm font-black text-gray-900">Comissão de Disciplina e Ética Escolar</h4>
              </div>
              <p className="text-xs text-gray-600">
                Apreciação de infrações disciplinares discentes, termos de ocorrência graves e mediação de conflitos escolares.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <p className="font-bold text-gray-800">Composição:</p>
                <p className="text-gray-600">• Presidente: Subdiretor Pedagógico</p>
                <p className="text-gray-600">• Vogais: 2 Professores Coordenadores de Turno + 1 Representante da Associação de Pais</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-blue-700">
                <Gavel className="h-5 w-5" />
                <h4 className="text-sm font-black text-gray-900">Comissão de Exames e Avaliação Institucional</h4>
              </div>
              <p className="text-xs text-gray-600">
                Supervisão de provas trimestrais, exames de ciclo, termos de exame e auditoria de pautas oficiais.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <p className="font-bold text-gray-800">Composição:</p>
                <p className="text-gray-600">• Presidente: Diretor Geral da Instituição</p>
                <p className="text-gray-600">• Secretário: Chefe de Secretaria Escolar</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-700">
                <DollarSign className="h-5 w-5" />
                <h4 className="text-sm font-black text-gray-900">Comissão de Gestão Patrimonial e Financeira</h4>
              </div>
              <p className="text-xs text-gray-600">
                Inventariação de bens, aprovação de orçamentos de manutenção, fiscalização do livro de caixa e património escolar.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <p className="font-bold text-gray-800">Composição:</p>
                <p className="text-gray-600">• Coordenador: Subdirector Administrativo</p>
                <p className="text-gray-600">• Técnico de Património e Tesoureiro Escolar</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Users className="h-5 w-5" />
                <h4 className="text-sm font-black text-gray-900">Comissão de Saúde, Higiene e Segurança Escolar</h4>
              </div>
              <p className="text-xs text-gray-600">
                Plano de prevenção de riscos, controlo de higienização dos sanitários, primeiros socorros e merenda escolar.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <p className="font-bold text-gray-800">Composição:</p>
                <p className="text-gray-600">• Responsável de Higiene + 2 Professores de Biologia/Educação Física</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA: DELEGAÇÃO DE PODERES (MATRÍCULAS & COBRANÇA DE EMOLUMENTOS) */}
      {subAba === 'delegacoes' && (
        <DelegationsManagementView
          escola={escola}
          currentUser={currentUser}
          funcionarios={funcionarios}
          alunos={alunos}
        />
      )}

      {/* MODAL: NOVO DESPACHO */}
      {showNovoDespachoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Emitir Despacho da Direção Geral</h3>
                  <p className="text-xs text-gray-500">Documento normativo e executivo com força regulamentar interna</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNovoDespachoModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarDespacho} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Número do Despacho *</label>
                  <input
                    type="text"
                    required
                    value={novoDespachoNum}
                    onChange={(e) => setNovoDespachoNum(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoria / Matéria *</label>
                  <select
                    value={novoDespachoCategoria}
                    onChange={(e) => setNovoDespachoCategoria(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Docente">Corpo Docente</option>
                    <option value="Discente">Estudantes & Matrículas</option>
                    <option value="Pedagógico">Pedagógico & Avaliações</option>
                    <option value="Administrativo">Administrativo & Funcionários</option>
                    <option value="Exames">Exames e Júri</option>
                    <option value="Financeiro">Financeiro & Propinas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assunto / Ementa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Homologação das escalas de vigilância para as provas do 2º trimestre"
                  value={novoDespachoAssunto}
                  onChange={(e) => setNovoDespachoAssunto(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Destinatários / Público-Alvo</label>
                  <select
                    value={novoDespachoPublico}
                    onChange={(e) => setNovoDespachoPublico(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Professores">Professores / Corpo Docente</option>
                    <option value="Alunos">Alunos</option>
                    <option value="Encarregados">Encarregados de Educação</option>
                    <option value="Secretaria">Secretaria Escolar</option>
                    <option value="Geral">Toda a Comunidade Escolar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Signatário</label>
                  <input
                    type="text"
                    disabled
                    value={escola.diretorGeralNome || currentUser.nomeCompleto}
                    className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fundamentação Jurídica</label>
                <input
                  type="text"
                  value={novoDespachoLegal}
                  onChange={(e) => setNovoDespachoLegal(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Texto Normativo do Despacho *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="1. Determina-se que...\n2. Fica expressamente vedado...\n3. O presente despacho entra em vigor na data da sua publicação."
                  value={novoDespachoConteudo}
                  onChange={(e) => setNovoDespachoConteudo(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNovoDespachoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>Promulgar Despacho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REUNIÃO / ATA */}
      {showNovaReuniaoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Gavel className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Averbar Reunião do Conselho de Direção</h3>
                  <p className="text-xs text-gray-500">Registo de deliberações e ata oficial executiva</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNovaReuniaoModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarReuniao} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Número da Ata *</label>
                  <input
                    type="text"
                    required
                    value={novaReuniaoNum}
                    onChange={(e) => setNovaReuniaoNum(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo de Sessão *</label>
                  <select
                    value={novaReuniaoTipo}
                    onChange={(e) => setNovaReuniaoTipo(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Ordinária">Ordinária</option>
                    <option value="Extraordinária">Extraordinária</option>
                    <option value="Emergencial">Emergencial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data da Sessão *</label>
                  <input
                    type="date"
                    required
                    value={novaReuniaoData}
                    onChange={(e) => setNovaReuniaoData(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hora de Início</label>
                  <input
                    type="time"
                    value={novaReuniaoHora}
                    onChange={(e) => setNovaReuniaoHora(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Local da Sessão</label>
                  <input
                    type="text"
                    value={novaReuniaoLocal}
                    onChange={(e) => setNovaReuniaoLocal(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Pauta / Ordem de Trabalhos (uma por linha)</label>
                <textarea
                  rows={3}
                  value={novaReuniaoOrdem}
                  onChange={(e) => setNovaReuniaoOrdem(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deliberações Aprovadas (uma por linha)</label>
                <textarea
                  rows={3}
                  value={novaReuniaoDelib}
                  onChange={(e) => setNovaReuniaoDelib(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNovaReuniaoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>Averbar Ata</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO DESPACHO */}
      {despachoVisualizado && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-black text-blue-700">{despachoVisualizado.numeroDespacho}</span>
                <h3 className="text-base font-bold text-gray-900">{despachoVisualizado.assunto}</h3>
              </div>
              <button onClick={() => setDespachoVisualizado(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="font-bold text-blue-950 block">Fundamentação:</span>
                <span className="text-blue-900">{despachoVisualizado.fundamentacaoLegal}</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {despachoVisualizado.conteudo}
              </div>

              <div className="flex justify-between text-gray-500 text-[11px] pt-2 border-t border-gray-100">
                <span>Signatário: <strong>{despachoVisualizado.assinadoPor}</strong></span>
                <span>Data: <strong>{new Date(despachoVisualizado.dataEmissao).toLocaleDateString('pt-AO')}</strong></span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setDespachoVisualizado(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => handleImprimirDespachoOficial(despachoVisualizado)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center space-x-1.5 text-xs shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir A4 Oficial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DA ATA */}
      {reuniaoVisualizada && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-black text-emerald-700">{reuniaoVisualizada.numeroAta}</span>
                <h3 className="text-base font-bold text-gray-900">Conselho de Direção • Sessão {reuniaoVisualizada.tipo}</h3>
              </div>
              <button onClick={() => setReuniaoVisualizada(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-900 block mb-1">Ordem de Trabalhos:</span>
                <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                  {reuniaoVisualizada.ordemDoDia.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-950 block mb-1">Deliberações Aprovadas:</span>
                <ol className="list-decimal pl-5 space-y-1 text-emerald-900">
                  {reuniaoVisualizada.deliberacoes.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ol>
              </div>

              <div className="text-[11px] text-gray-500 pt-1">
                Data: {new Date(reuniaoVisualizada.data).toLocaleDateString('pt-AO')} às {reuniaoVisualizada.hora} • Local: {reuniaoVisualizada.local}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setReuniaoVisualizada(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => handleImprimirAtaReuniao(reuniaoVisualizada)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 text-xs shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Ata Oficial</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
